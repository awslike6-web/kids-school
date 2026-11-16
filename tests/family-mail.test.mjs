// 가족 우체통 공통 모듈(kids/core/family-mail.js)·서비스 워커·화면 연결 시험 (명세: docs/family_mail_spec.md §8-2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser, deviceStorage, fakeServer, read, settle } from './family-mail-browser.mjs';

const CORE = 'kids/core/family-mail.js';
const PROD = 'https://family-mail.awslike6.workers.dev';

function lobby({ storage = deviceStorage(), url, watch = 'popup', server = fakeServer() } = {}) {
  const b = createBrowser({ url, html: read('lobby.html'), storage, fetch: server.fetch, watch });
  b.load(CORE);
  return { b, server, FM: b.window.FamilyMail };
}

test('서버 주소: 운영 주소에서는 ?mailServer를 무시하고, localhost에서는 http 로컬 주소만 받는다', () => {
  const prod = lobby({ url: 'https://awslike6-web.github.io/kids-school/lobby.html?mailServer=http://localhost:9999', watch: '' });
  assert.equal(prod.FM._internal.serverURL(), PROD);
  const local = lobby({ url: 'http://localhost:8767/lobby.html?mailServer=http://127.0.0.1:8790', watch: '' });
  assert.equal(local.FM._internal.serverURL(), 'http://127.0.0.1:8790');
  assert.equal(local.b.localData.get('familyMailServer'), undefined, 'localStorage에 남기지 않는다');
  const evil = lobby({ url: 'http://localhost:8767/lobby.html?mailServer=https://evil.example', watch: '' });
  assert.equal(evil.FM._internal.serverURL(), PROD);
});

test('주소는 파일 위치 기준 상대 경로로 만든다 (GitHub Pages /kids-school/ 아래)', () => {
  const { FM } = lobby({ watch: '' });
  assert.equal(FM._internal.BASE, 'https://awslike6-web.github.io/kids-school/');
  assert.equal(FM._internal.SW_URL, 'https://awslike6-web.github.io/kids-school/sw.js');
  assert.equal(FM.mailboxURL({ compose: 'mom' }), 'https://awslike6-web.github.io/kids-school/kids/common_space/family_mail.html?compose=mom');
});

test('등록: 토큰은 저장하되 밖으로 내주지 않고, 다시 등록하면 예전 토큰을 함께 보낸다', async () => {
  const { b, server, FM } = lobby({ storage: {}, watch: '' });
  const events = [];
  b.window.addEventListener('familymail:device', e => events.push(e.detail));
  await assert.rejects(FM.register({ familyCode: 'nope', member: 'mom' }), e => e.code === 'wrong_code' && e.remaining === 4 && e.status === 403);
  const device = await FM.register({ familyCode: 'family-code', member: 'mom', label: '엄마 폰' });
  assert.deepEqual({ ...device }, { member: 'mom', label: '엄마 폰' });
  assert.deepEqual({ ...FM.getDevice() }, { member: 'mom', label: '엄마 폰' });
  const stored = JSON.parse(b.localData.get('familyMailDevice'));
  assert.match(stored.token, /^token_/);
  await FM.register({ familyCode: 'family-code', member: 'mom', label: '' });
  assert.equal(server.calls.at(-1).body.previousToken, stored.token);
  assert.equal(events.length, 2);
});

test('401이면 이 기기 등록을 지우고 familymail:device(null)를 알린다', async () => {
  const { b, FM } = lobby({ storage: deviceStorage('mom', 'revoked'), watch: '' });
  const events = [];
  b.window.addEventListener('familymail:device', e => events.push(e.detail));
  assert.equal(await FM.refreshUnread(), null);
  assert.equal(FM.getDevice(), null);
  assert.deepEqual(events, [null]);
});

test('팝업: 글은 글자 그대로, 바깥을 눌러도 안 닫히고, 「확인했어요」로 읽음 처리', async () => {
  const server = fakeServer();
  server.add('mom', 'minseo', '<img src=x onerror=alert(1)> 숙제했니?');
  server.add('dad', 'minseo', '사랑해');
  const { b } = lobby({ server });
  await settle();
  const popup = b.document.getElementById('familyMailPopup');
  assert.ok(popup, '팝업이 떴다');
  assert.equal(popup.querySelector('.fmp-text').textContent, '<img src=x onerror=alert(1)> 숙제했니?');
  assert.match(popup.querySelector('.fmp-from').textContent, /엄마/);
  assert.match(popup.querySelector('.fmp-more').textContent, /외 1개 더/);
  assert.equal(popup.listeners.click, undefined, '덮개를 눌러도 닫히지 않는다');

  popup.querySelector('.fmp-ok').click();
  await settle();
  assert.deepEqual(server.calls.find(c => c.path === '/read').body, { ids: ['m1'] });
  const next = b.document.getElementById('familyMailPopup');
  assert.ok(next, '다음 안 읽은 메시지가 이어서 뜬다');
  assert.equal(next.querySelector('.fmp-text').textContent, '사랑해');
});

test('읽음 처리가 실패해도 같은 팝업이 되풀이되지 않는다', async () => {
  const server = fakeServer();
  server.add('mom', 'minseo', '밥 먹자');
  server.state.failRead = true;
  const { b, FM } = lobby({ server });
  await settle();
  b.document.getElementById('familyMailPopup').querySelector('.fmp-ok').click();
  await settle();
  await FM.refreshUnread();
  await settle();
  assert.equal(b.document.getElementById('familyMailPopup'), null);
  assert.deepEqual(JSON.parse(b.sessionData.get('familyMailSeen')), ['m1']);
});

test('답장: 읽음 처리 뒤 우체통 쓰기 화면으로 간다', async () => {
  const server = fakeServer();
  server.add('dad', 'minseo', '뭐 해?');
  const { b } = lobby({ server });
  await settle();
  b.document.getElementById('familyMailPopup').querySelectorAll('.fmp-btn')[1].click();
  await settle();
  assert.equal(b.navigations.at(-1), 'https://awslike6-web.github.io/kids-school/kids/common_space/family_mail.html?compose=dad');
});

test('quiet 모드(우체통 화면)와 등록 안 된 기기에서는 팝업을 띄우지 않는다', async () => {
  const server = fakeServer();
  server.add('mom', 'minseo', '안녕');
  const quiet = lobby({ server, watch: 'quiet' });
  await settle();
  assert.equal(quiet.b.document.getElementById('familyMailPopup'), null);
  const fresh = lobby({ storage: {}, server });
  await settle();
  assert.equal(fresh.b.document.getElementById('familyMailPopup'), null);
  assert.equal(server.calls.filter(c => c.path === '/unread').length, 1, '등록 안 된 기기는 서버에 묻지 않는다');
});

test('📮 배지: 로비 두 헤더에 숫자, 0이면 숨김, 누르면 우체통', async () => {
  const server = fakeServer();
  server.add('mom', 'minseo', '하나');
  server.add('dad', 'minseo', '둘');
  const { b } = lobby({ server });
  await settle();
  const counts = b.document.querySelectorAll('[data-family-mail-count]');
  assert.equal(counts.length, 2, '민서·민수 헤더 둘 다');
  counts.forEach(node => { assert.equal(node.textContent, '2'); assert.equal(node.hidden, false); });
  b.document.querySelectorAll('[data-family-mail-chip]')[0].click();
  assert.equal(b.navigations.at(-1), 'https://awslike6-web.github.io/kids-school/kids/common_space/family_mail.html');
  server.messages.forEach(m => { m.read = true; });
  await b.window.FamilyMail.refreshUnread();
  counts.forEach(node => assert.equal(node.hidden, true));
});

test('안 읽음 확인은 화면이 보일 때만 90초마다', async () => {
  const { b, server } = lobby();
  await settle();
  const before = server.calls.filter(c => c.path === '/unread').length;
  assert.equal(b.intervals.length, 1);
  b.document.visibilityState = 'hidden';
  b.intervals[0]();
  await settle();
  assert.equal(server.calls.filter(c => c.path === '/unread').length, before);
  b.document.visibilityState = 'visible';
  b.intervals[0]();
  await settle();
  assert.equal(server.calls.filter(c => c.path === '/unread').length, before + 1);
});

test('formatTime(KST)·countChars·newClientId', () => {
  const { FM } = lobby({ watch: '' });
  const now = Date.UTC(2026, 10, 16, 12, 0, 0); // KST 21:00
  assert.equal(FM.formatTime('2026-11-16T19:05:00+09:00', now), '오후 7:05');
  assert.equal(FM.formatTime('2026-11-16T00:30:00+09:00', now), '오전 12:30');
  assert.equal(FM.formatTime('2026-11-15T23:59:00+09:00', now), '11/15');
  assert.equal(FM.formatTime('2025-12-31T10:00:00+09:00', now), '2025/12/31');
  assert.equal(FM.formatTime('엉터리', now), '');
  assert.equal(FM.countChars('🎉엄마'), 3);
  assert.match(FM.newClientId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('규칙: innerHTML·speechSynthesis 직접 호출·toISOString 날짜 자르기 없음, 서비스 워커에 fetch 처리기 없음', () => {
  for (const file of [CORE, 'kids/common_space/family-mail-page.js', 'sw.js']) {
    const code = read(file).replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /innerHTML|insertAdjacentHTML/, `${file} innerHTML`);
    assert.doesNotMatch(code, /speechSynthesis/, `${file} speechSynthesis`);
    assert.doesNotMatch(code, /toISOString\(\)/, `${file} toISOString`);
  }
  const sw = read('sw.js').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(sw, /addEventListener\(\s*['"]fetch['"]/);
  assert.doesNotMatch(sw, /caches\./);
  assert.match(sw, /event\.waitUntil/);
  assert.match(sw, /renotify: true/);
  assert.match(sw, /new URL\('kids\/common_space\/family_mail\.html', SCOPE\)/);
});

test('연결: 로비·첫 화면·우체통 화면이 상대 경로로 싣고, manifest에 바로가기가 있다', () => {
  const tag = (watch, prefix) => new RegExp(`<script src="${prefix}kids/core/family-mail\\.js\\?v=[\\w-]+" data-watch="${watch}"></script>`);
  assert.match(read('lobby.html'), tag('popup', '\\./'));
  assert.match(read('index.html'), tag('popup', '\\./'));
  const page = read('kids/common_space/family_mail.html');
  const order = ['../config.js', '../core/fairy-config.js', '../core/fairy-tts.js', '../core/family-mail.js', './family-mail-page.js'];
  const positions = order.map(src => page.indexOf(`src="${src}`));
  positions.forEach((pos, i) => assert.ok(pos > 0, `${order[i]} 로드`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, '로드 순서');
  assert.match(page, /data-watch="quiet"/);
  assert.doesNotMatch(page, /(src|href)="\//, '루트 절대 경로 없음');
  const manifest = JSON.parse(read('manifest.json'));
  const shortcut = manifest.shortcuts.find(s => s.url === './kids/common_space/family_mail.html');
  assert.ok(shortcut, 'manifest 바로가기');
  assert.equal(read('kids/assets/images/family-mail-badge.png').length > 0, true);
});
