#!/usr/bin/env node
/**
 * 🏷️ stamp_versions.mjs — 캐시 버전 표시(?v=) 자동 찍기 (2026-11-24)
 *
 * 화면·모듈이 다른 파일을 가리키는 자리(HTML <script>/<link>, notion-helper.js 자동 로더 목록,
 * 동화 엔진 자가 삽입, 보상 엔진 로더 등)의 `?v=` 값을 **그 파일 내용의 짧은 해시**로 맞춘다.
 * - 손으로 올리다 빠뜨려 옛 파일이 캐시로 도는 일, 같은 파일을 서로 다른 버전 글자로 가리키는 일을 없앤다.
 * - 해시는 BOM·줄바꿈(CRLF/LF) 차이만 빼고 **안에 적힌 ?v= 값까지 포함**해 계산한다 → 하위 모듈이 바뀌면
 *   그것을 싣는 로더의 버전도, 그 로더를 싣는 화면의 버전도 줄줄이 바뀐다(값이 더 안 바뀔 때까지 반복).
 *   서로를 가리키는 고리가 있으면 끝나지 않으므로 실패로 알린다.
 * - 이미 `?v=`가 붙은 자리만 맞춘다(버전 없는 자리는 그대로). 모양:
 *     `경로/파일명.js?v=값`  ·  로더 배열의 `'파일명.js', '?v=값'`(notion-reward.js)
 * - 가리키는 파일 찾기: 적힌 경로(대소문자까지 정확히) → 경로 없이 이름만이면 같은 폴더 → 저장소에 하나뿐인 이름.
 *   경로가 적혀 있는데 그 파일이 없으면 「못 찾음」(이름만 보고 다른 파일로 넘어가지 않음). http·// 주소는 건드리지 않는다.
 *
 * 사용:
 *   node scripts/stamp_versions.mjs           # 낡은 버전 표시를 고쳐 쓴다
 *   node scripts/stamp_versions.mjs --check   # 고치지 않고 알림(낡은 곳·못 찾은 곳이 있으면 종료 코드 1)
 * 조감도 자료(scripts/build_system_map.py)를 다시 만들었다면 그 뒤에 돌린다.
 * 시험: tests/version-stamps.test.mjs (로컬 CI·원격 시험의 node 단계가 늘 검사)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STAMP_LENGTH = 8;
const MAX_PASSES = 20;
const SKIP_DIRS = new Set(['node_modules', 'deprecated_backup', '.git', 'archive']);
// `경로/파일명.js|css?v=값` — 경로 조각(주소 판별은 따로)
const REF_RE = /([A-Za-z0-9_.\/-]*?)([A-Za-z0-9_.-]+\.(?:js|css))\?v=([A-Za-z0-9_.-]+)/g;
// 로더 배열 `'파일명.js', '?v=값'`
const SPLIT_RE = /(['"])([A-Za-z0-9_.-]+\.(?:js|css))\1(\s*,\s*)(['"])\?v=([A-Za-z0-9_.-]+)\4/g;

/** BOM·줄바꿈 차이만 빼고 내용 해시 8자리 (안에 적힌 ?v= 값은 포함 — 하위 모듈이 바뀌면 로더도 바뀌게) */
export function contentStamp(text) {
  const body = String(text).replace(/^﻿/, '').replace(/\r\n/g, '\n');
  return crypto.createHash('sha1').update(body, 'utf8').digest('hex').slice(0, STAMP_LENGTH);
}

function walkFiles(dir, test, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, test, out);
    else if (test(entry.name)) out.push(full);
  }
  return out;
}

/** 검사 대상: 저장소 맨 위 *.html·*.js, kids/ 아래 *.html·*.js (백업·node_modules 제외) */
export function listSourceFiles(root = ROOT) {
  const top = fs.readdirSync(root).filter(f => /\.(?:html|js)$/.test(f)).map(f => path.join(root, f));
  return [...top, ...walkFiles(path.join(root, 'kids'), n => /\.(?:html|js)$/.test(n))];
}

/** 대소문자까지 정확히 있는 파일인가 (Windows는 대소문자를 무시하지만 GitHub Pages·원격 시험은 구분) */
export function existsExact(file) {
  if (!fs.existsSync(file)) return false;
  const parts = path.relative(path.parse(file).root, file).split(path.sep);
  let cur = path.parse(file).root;
  for (const part of parts) {
    if (!fs.readdirSync(cur).includes(part)) return false;
    cur = path.join(cur, part);
  }
  return fs.statSync(file).isFile();
}

function indexByName(root) {
  const byName = new Map();
  const add = full => byName.set(path.basename(full), [...(byName.get(path.basename(full)) || []), full]);
  walkFiles(path.join(root, 'kids'), n => /\.(?:js|css)$/.test(n)).forEach(add);
  fs.readdirSync(root).filter(f => /\.(?:js|css)$/.test(f)).forEach(f => add(path.join(root, f)));
  return byName;
}

const inside = (root, file) => file === root || file.startsWith(root + path.sep);

/** 가리키는 파일 찾기 (못 찾으면 null) */
export function resolveTarget(fromFile, prefix, name, byName, root = ROOT) {
  if (prefix) {
    if (prefix.startsWith('/')) return null;
    const local = path.resolve(path.dirname(fromFile), prefix + name);
    return inside(root, local) && existsExact(local) ? local : null;
  }
  const same = path.join(path.dirname(fromFile), name);
  if (existsExact(same)) return same;
  const candidates = byName.get(name) || [];
  return candidates.length === 1 ? candidates[0] : null;
}

/** 이 자리가 http·// 주소의 일부인가 — 앞쪽으로 따옴표·공백·괄호·=까지 거슬러 올라가 본다 */
function isUrlToken(text, offset, whole) {
  let start = offset;
  while (start > 0 && !/["'`\s(=,<>]/.test(text[start - 1])) start--;
  const token = text.slice(start, offset) + whole;
  return /^(?:[a-z]+:)?\/\//i.test(token) || token.includes('://');
}

/** 한 파일 글에서 버전 자리를 지금 해시로 바꾼 글 + 기록 */
function restamp(file, text, stampOf, byName, root, found) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const pick = (prefix, name, whole) => {
    const target = resolveTarget(file, prefix, name, byName, root);
    if (!target) { found.unresolved.push({ file: rel, ref: whole }); return null; }
    return stampOf(target);
  };
  let next = text.replace(REF_RE, (whole, prefix, name, version, offset) => {
    if (isUrlToken(text, offset, whole)) return whole;
    const want = pick(prefix, name, whole);
    if (!want || version === want) return whole;
    found.stale.push({ file: rel, ref: whole, want });
    return `${prefix}${name}?v=${want}`;
  });
  next = next.replace(SPLIT_RE, (whole, q1, name, sep, q2, version) => {
    const want = pick('', name, whole);
    if (!want || version === want) return whole;
    found.stale.push({ file: rel, ref: whole, want });
    return `${q1}${name}${q1}${sep}${q2}?v=${want}${q2}`;
  });
  return next;
}

/**
 * 고정점까지 반복해 맞춘 결과 → { stale: [{file, ref, want}], unresolved: [{file, ref}], files: Map(file → 고친 글), passes, cyclic }
 * stale은 디스크 기준으로 바뀌는 자리(마지막 값 기준), files는 바뀌는 파일의 최종 글.
 */
export function scan(root = ROOT) {
  const byName = indexByName(root);
  const sources = listSourceFiles(root);
  const contents = new Map();
  const read = file => {
    if (!contents.has(file)) contents.set(file, fs.readFileSync(file, 'utf8'));
    return contents.get(file);
  };
  const stampOf = file => contentStamp(read(file));
  let passes = 0, changedAny = true;
  while (changedAny && passes < MAX_PASSES) {
    changedAny = false;
    passes++;
    for (const file of sources) {
      const found = { stale: [], unresolved: [] };
      const next = restamp(file, read(file), stampOf, byName, root, found);
      if (next !== read(file)) { contents.set(file, next); changedAny = true; }
    }
  }
  // 최종 결과를 디스크와 비교해 기록
  const result = { stale: [], unresolved: [], files: new Map(), passes, cyclic: changedAny };
  for (const file of sources) {
    const disk = fs.readFileSync(file, 'utf8');
    const found = { stale: [], unresolved: [] };
    restamp(file, disk, stampOf, byName, root, found); // 디스크 글 기준으로 어느 자리가 바뀌는지
    result.unresolved.push(...found.unresolved);
    if (contents.get(file) !== disk) {
      result.files.set(file, contents.get(file));
      result.stale.push(...found.stale);
    }
  }
  return result;
}

/** 저장소 안 파일 하나의 지금 버전 값 (시험·승인 변경 목록에서 기대값을 만들 때) */
export function stampOfFile(relPath, root = ROOT) {
  return contentStamp(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function main(argv) {
  const check = argv.includes('--check');
  const { stale, unresolved, files, cyclic } = scan();
  if (cyclic) { console.log(`❌ 서로를 가리키는 파일이 있어 버전이 정해지지 않습니다(${MAX_PASSES}번 반복).`); return 1; }
  if (unresolved.length) {
    console.log(`❌ 가리키는 파일을 못 찾은 자리 ${unresolved.length}곳 (경로·대소문자 확인):`);
    for (const u of unresolved.slice(0, 20)) console.log(`   ${u.file}: ${u.ref}`);
  }
  if (check) {
    if (!stale.length && !unresolved.length) { console.log('✅ 버전 표시가 모두 파일 내용과 맞습니다.'); return 0; }
    if (stale.length) {
      console.log(`❌ 낡은 버전 표시 ${stale.length}곳(파일 ${files.size}개) — node scripts/stamp_versions.mjs 로 고치세요.`);
      for (const s of stale.slice(0, 40)) console.log(`   ${s.file}: ${s.ref} → ?v=${s.want}`);
    }
    return 1;
  }
  for (const [file, text] of files) fs.writeFileSync(file, text, 'utf8');
  console.log(`🏷️ 버전 표시를 고친 파일 ${files.size}개.`);
  return unresolved.length ? 1 : 0;
}

// 직접 실행할 때만 (Windows 드라이브 글자 대소문자 차이 무시)
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self.toLowerCase()) process.exit(main(process.argv.slice(2)));
