// 로비 Tailwind 설정 파일: 실행하면 설정 객체를 만들고, CDN 바로 다음에 한 번만 실리는지 검사한다.
// 2026-11-14: 얼린 인라인 원본(tests/fixtures/lobby-tailwind)과의 원문·설정 통째 대조, 색 개수 고정은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, assetTags } from './split-rules.mjs';

const source = read('kids/js/lobby_tailwind_config.js');
const html = read('lobby.html');

test('로비 Tailwind: 머리 주석이 있고 실행하면 다크 모드·CSS 변수 색 설정을 만든다', () => {
  assert.match(source.split(/\r?\n/)[0], /^\/\/ kids\/js\/lobby_tailwind_config\.js - /);
  const context = { tailwind: {} };
  vm.runInNewContext(source, context);
  const config = JSON.parse(JSON.stringify(context.tailwind.config));
  assert.equal(config.darkMode, 'class');
  const colors = Object.entries(config.theme.extend.colors);
  assert.ok(colors.length > 0, '색 설정 없음');
  assert.equal(config.theme.extend.colors.primary, 'rgb(var(--c-primary) / <alpha-value>)');
  for (const [name, value] of colors) assert.match(value, /^rgb\(var\(--c-[\w-]+\) \/ <alpha-value>\)$/, name);
});

test('로비 Tailwind: CDN 바로 다음에 버전 붙여 한 번만 싣고 인라인 설정은 남지 않는다', () => {
  const tags = assetTags(html, 'script');
  const at = tags.findIndex(tag => tag.url === './kids/js/lobby_tailwind_config.js');
  assert.ok(at > 0, '설정 스크립트 태그가 없음');
  assert.ok(tags[at].version, '?v= 캐시 버전 없음');
  assert.match(tags[at - 1].url, /^https:\/\/cdn\.tailwindcss\.com/);
  assert.equal(html.slice(tags[at - 1].end, tags[at].start).trim(), '', 'CDN과 설정 사이에 다른 것이 있음');
  assert.equal(html.split('lobby_tailwind_config.js').length - 1, 1);
  assert.doesNotMatch(html, /tailwind\.config\s*=/);
  assert.doesNotMatch(html, /id="tailwind-config"/);
});
