// 로비 Tailwind 설정 이전: 인라인 원본과 같은 설정을 만들고, CDN 바로 다음에 한 번만 실리는지 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('kids/js/lobby_tailwind_config.js');
const fixture = read('tests/fixtures/lobby-tailwind/inline-config.js');
const html = read('lobby.html');
const tag = '<script src="./kids/js/lobby_tailwind_config.js?v=20261101-lobby-tw"></script>';

function runConfig(code) {
  const context = { tailwind: {} };
  vm.runInNewContext(code, context);
  return JSON.parse(JSON.stringify(context.tailwind.config));
}

test('로비 Tailwind: 새 파일이 인라인 원본과 같은 설정을 만든다', () => {
  const config = runConfig(source);
  assert.deepEqual(config, runConfig(fixture));
  assert.equal(config.darkMode, 'class');
  assert.equal(Object.keys(config.theme.extend.colors).length, 47);
  assert.equal(config.theme.extend.colors.primary, 'rgb(var(--c-primary) / <alpha-value>)');
});

test('로비 Tailwind: 머리 주석 뒤 본문은 원본을 4칸 내어쓰기한 것과 같다', () => {
  const lines = source.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  assert.match(lines[0], /^\/\/ kids\/js\/lobby_tailwind_config\.js - /);
  const expected = fixture.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n').map(line => line.replace(/^ {4}/, ''));
  assert.deepEqual(lines.slice(1), expected);
});

test('로비 Tailwind: CDN 바로 다음에 한 번만 싣고 인라인 설정은 남지 않는다', () => {
  const lines = html.replace(/\r\n/g, '\n').split('\n').map(line => line.trim());
  const at = lines.indexOf(tag);
  assert.ok(at > 0, '설정 스크립트 태그가 없음');
  assert.match(lines[at - 1], /^<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>$/);
  assert.equal(html.split('lobby_tailwind_config.js').length - 1, 1);
  assert.doesNotMatch(html, /tailwind\.config\s*=/);
  assert.doesNotMatch(html, /id="tailwind-config"/);
});
