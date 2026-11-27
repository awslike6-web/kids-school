// 캐시 버전 표시(?v=)가 모두 가리키는 파일 내용 해시와 맞는지 (scripts/stamp_versions.mjs, 2026-11-24)
// 실패하면: node scripts/stamp_versions.mjs  (낡은 자리를 고쳐 씀) 후 다시 커밋
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { contentStamp, scan, resolveTarget, STAMP_LENGTH } from '../scripts/stamp_versions.mjs';

test('저장소의 모든 ?v= 버전 표시가 파일 내용 해시와 맞고, 가리키는 파일을 모두 찾는다', () => {
  const { stale, unresolved } = scan();
  assert.deepEqual(stale.slice(0, 10).map(s => `${s.file}: ${s.ref} → ${s.want}`), [],
    `낡은 버전 표시 ${stale.length}곳 — node scripts/stamp_versions.mjs 로 고치세요`);
  assert.deepEqual(unresolved.map(u => `${u.file}: ${u.ref}`), []);
});

test('해시: 줄바꿈 차이는 무시, 내용이나 안에 적힌 ?v= 값이 바뀌면 달라짐(하위 모듈 → 로더로 전파), 8자리 16진수', () => {
  const a = contentStamp("load('x.js?v=111');\nconst a = 1;\n");
  assert.match(a, new RegExp(`^[0-9a-f]{${STAMP_LENGTH}}$`));
  assert.equal(contentStamp("load('x.js?v=111');\r\nconst a = 1;\r\n"), a);
  assert.notEqual(contentStamp("load('x.js?v=222');\nconst a = 1;\n"), a);
  assert.notEqual(contentStamp("load('x.js?v=111');\nconst a = 2;\n"), a);
});

test('도구: 경로 기준·같은 폴더·이름 하나뿐인 경우로 파일을 찾고, 주소(http)는 건드리지 않으며, 고쳐 쓴 뒤엔 낡은 곳이 없다', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  w('kids/core/a.js', 'const A = 1;\n');
  w('kids/core/loader.js', "const list = ['a.js?v=old'];\n");
  w('kids/js/b.js', 'const B = 2;\n');
  w('kids/css/s.css', 'body{}\n');
  w('page.html', '<script src="./kids/core/a.js?v=old"></script>\n<script src="https://cdn.example.com/x.js?v=3"></script>\n<link href="kids/css/s.css?v=1">\n<script src="kids/core/loader.js?v=1"></script>\n');
  w('kids/subjects/p.html', '<script src="../js/b.js?v=zz"></script>\n');
  const first = scan(root);
  assert.equal(first.stale.length, 5);
  assert.deepEqual(first.unresolved, []);
  for (const [file, text] of first.files) fs.writeFileSync(file, text);
  const again = scan(root);
  assert.equal(again.stale.length, 0);
  const page = fs.readFileSync(path.join(root, 'page.html'), 'utf8');
  assert.ok(page.includes(`./kids/core/a.js?v=${contentStamp('const A = 1;\n')}`));
  assert.ok(page.includes('https://cdn.example.com/x.js?v=3'));     // 주소는 그대로
  assert.ok(fs.readFileSync(path.join(root, 'kids/core/loader.js'), 'utf8').includes(`'a.js?v=${contentStamp('const A = 1;\n')}'`));
  // 찾는 순서
  const byName = new Map([['b.js', [path.join(root, 'kids/js/b.js')]]]);
  assert.equal(resolveTarget(path.join(root, 'kids/core/loader.js'), '', 'b.js', byName, root), path.join(root, 'kids/js/b.js'));
  assert.equal(resolveTarget(path.join(root, 'page.html'), 'https://cdn.example.com/', 'x.js', byName, root), null);
  fs.rmSync(root, { recursive: true, force: true });
});

test('도구(검토 반영): 하위 모듈이 바뀌면 로더·화면 버전이 줄줄이 바뀜, 로더 배열 모양, 주소·틀린 경로·대소문자, BOM, 고리', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp2-'));
  const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  w('kids/core/leaf.js', 'const LEAF = 1;\n');
  w('kids/core/loader.js', "const list = ['leaf.js?v=0'];\n[['Leaf', 'leaf.js', '?v=0']];\n");
  w('page.html', '<script src="kids/core/loader.js?v=0"></script>\n<script src="https://cdn.jsdelivr.net/npm/pkg@1.2.3/leaf.js?v=9"></script>\n<script src="https://example.com:8443/a/leaf.js?v=9"></script>\n');
  const apply = () => { const r = scan(root); for (const [f, t] of r.files) fs.writeFileSync(f, t); return r; };
  const first = apply();
  assert.equal(first.cyclic, false);
  const loader1 = fs.readFileSync(path.join(root, 'kids/core/loader.js'), 'utf8');
  const leafStamp = contentStamp('const LEAF = 1;\n');
  assert.ok(loader1.includes(`'leaf.js?v=${leafStamp}'`) && loader1.includes(`'leaf.js', '?v=${leafStamp}'`));
  const page1 = fs.readFileSync(path.join(root, 'page.html'), 'utf8');
  assert.ok(page1.includes(`kids/core/loader.js?v=${contentStamp(loader1)}`));
  assert.ok(page1.includes('pkg@1.2.3/leaf.js?v=9') && page1.includes(':8443/a/leaf.js?v=9'));   // 주소는 그대로
  // 하위 모듈만 바꿔도 화면의 로더 버전이 바뀐다
  w('kids/core/leaf.js', 'const LEAF = 2;\n');
  apply();
  const page2 = fs.readFileSync(path.join(root, 'page.html'), 'utf8');
  assert.notEqual(page2, page1);
  assert.equal(scan(root).stale.length, 0);
  // BOM 유무는 같은 해시
  assert.equal(contentStamp('﻿const A = 1;\r\n'), contentStamp('const A = 1;\n'));
  // 경로가 적혔는데 없으면 이름만 보고 넘어가지 않음 / 대소문자 틀림도 못 찾음
  w('bad.html', '<script src="kids/wrong/leaf.js?v=1"></script>\n<script src="kids/Core/leaf.js?v=1"></script>\n');
  const bad = scan(root);
  assert.deepEqual(bad.unresolved.map(u => u.ref).sort(), ['kids/Core/leaf.js?v=1', 'kids/wrong/leaf.js?v=1']);
  fs.rmSync(path.join(root, 'bad.html'));
  // 서로를 가리키는 고리는 끝나지 않음 → cyclic
  w('kids/core/a.js', "load('b.js?v=0');\n");
  w('kids/core/b.js', "load('a.js?v=0');\n");
  assert.equal(scan(root).cyclic, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('도구 --only(등록 도구용): 적은 데이터 파일을 가리키는 자리만 고치고, 다른 낡은 자리·못 찾는 자리는 건드리지 않음', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-only-'));
  const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  w('kids/data/gallery-data.js', 'const G = [1, 2];\n');
  w('kids/js/other.js', 'const O = 1;\n');
  w('kids/common_space/gallery.html', '<script src="../data/gallery-data.js?v=20261101-0000"></script>\n<script src="../js/other.js?v=old"></script>\n<script src="../js/none.js?v=1"></script>\n');
  w('parent_dashboard.html', '<script src="kids/data/gallery-data.js?v=abc"></script>\n');
  const r = scan(root, { only: [path.join(root, 'kids/data/gallery-data.js')] });
  assert.deepEqual([...r.files.keys()].map(f => path.relative(root, f).split(path.sep).join('/')).sort(), ['kids/common_space/gallery.html', 'parent_dashboard.html']);
  assert.deepEqual(r.unresolved, []);
  const html = r.files.get(path.join(root, 'kids/common_space/gallery.html'));
  assert.ok(html.includes(`gallery-data.js?v=${contentStamp('const G = [1, 2];\n')}`));
  assert.ok(html.includes('other.js?v=old') && html.includes('none.js?v=1'));
  // 상대 경로로 줘도 root 기준으로 찾는다
  assert.equal(scan(root, { only: ['kids/data/gallery-data.js'] }).files.size, 2);
  // 연쇄: 데이터 → 로더 → 화면이면 로더를 가리키는 화면도 맞춘다 (카본 검토 2026-11-27)
  w('kids/js/loader.js', "load('../data/gallery-data.js?v=0');\n");
  w('chain.html', '<script src="kids/js/loader.js?v=0"></script>\n');
  const chain = scan(root, { only: ['kids/data/gallery-data.js'] });
  const loader = chain.files.get(path.join(root, 'kids/js/loader.js'));
  assert.ok(loader && chain.files.get(path.join(root, 'chain.html')).includes(`loader.js?v=${contentStamp(loader)}`));
  fs.rmSync(root, { recursive: true, force: true });
});

test('도구 --only 명령: 고친 파일을 「고침:」으로 알리고, --check와 같이 쓰면 낡은 곳이 있을 때 종료 코드 1', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-only-cli-'));
  const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  w('scripts/stamp_versions.mjs', fs.readFileSync(new URL('../scripts/stamp_versions.mjs', import.meta.url), 'utf8'));
  w('kids/data/d.js', 'const D = 1;\n');
  w('page.html', '<script src="kids/data/d.js?v=old"></script>\n');
  const run = (...args) => spawnSync(process.execPath, ['scripts/stamp_versions.mjs', ...args], { cwd: root, encoding: 'utf8' });
  const check = run('--only', 'kids/data/d.js', '--check');
  assert.equal(check.status, 1);
  assert.match(check.stdout, /   고침: page\.html/);
  assert.ok(fs.readFileSync(path.join(root, 'page.html'), 'utf8').includes('?v=old'));  // --check는 쓰지 않음
  const fix = run('--only=kids/data/d.js');
  assert.equal(fix.status, 0);
  assert.equal(run('--only', 'kids/data/d.js', '--check').status, 0);
  assert.equal(run('--only', 'kids/data/none.js').status, 2);  // 없는 파일
  fs.rmSync(root, { recursive: true, force: true });
});
