// 가족 우체통 화면(kids/common_space/family-mail-page.js) 시험 — 모의 브라우저·모의 서버, 실제 네트워크 없음
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser, deviceStorage, fakeServer, read, settle } from './family-mail-browser.mjs';

const PAGE_URL = 'https://awslike6-web.github.io/kids-school/kids/common_space/family_mail.html';

function open({ storage = deviceStorage(), search = '', server = fakeServer(), confirm } = {}) {
  const b = createBrowser({ url: PAGE_URL + search, html: read('kids/common_space/family_mail.html'), storage, fetch: server.fetch, watch: 'quiet', confirm });
  b.load('kids/core/family-mail.js');
  b.load('kids/common_space/family-mail-page.js');
  const $ = selector => b.document.querySelector(selector);
  const $$ = selector => b.document.querySelectorAll(selector);
  const byText = (selector, text) => $$(selector).find(node => node.textContent.includes(text));
  return { b, server, $, $$, byText };
}

test('등록 전: 처음 설정 화면, 로비에서 고른 아이를 미리 선택, 코드가 비면 등록 버튼 꺼짐', async () => {
  const { b, $, $$, byText } = open({ storage: { currentChild: 'minseo' } });
  await settle();
  assert.equal(b.document.body.dataset.theme, 'parent');
  const members = $$('.fm-member');
  assert.equal(members.length, 4);
  assert.ok(members.find(n => n.textContent.includes('민서')).classList.contains('is-selected'));
  const submit = byText('.fm-btn-primary', '등록하기');
  assert.equal(submit.disabled, true);
  const code = $('.fm-input');
  code.value = 'nope';
  code.dispatch('input');
  assert.equal(submit.disabled, false);
  submit.click();
  await settle();
  assert.equal($('.fm-msg.is-error').textContent, '가족 코드가 맞지 않아요 (남은 기회 4번)');

  code.value = 'family-code';
  submit.click();
  await settle();
  assert.equal(b.document.body.dataset.theme, 'minseo');
  assert.ok(byText('.fm-btn-primary', '알림 받기'));
  assert.match($('.fm-hint').textContent, /홈 화면에 추가/);
  byText('.fm-btn', '우체통으로 가기').click();
  await settle();
  assert.equal($('.fm-me-name').textContent, '민서');
});

test('받은 메시지: 안 읽은 항목을 누르면 펼치고 읽음 처리, 글은 글자 그대로', async () => {
  const server = fakeServer();
  server.add('mom', 'minseo', '<b>숙제</b> 했니?');
  server.add('dad', 'minseo', '읽은 것', { read: true });
  const { b, $$, byText } = open({ server });
  await settle();
  assert.equal(b.document.body.dataset.theme, 'minseo');
  const items = $$('.fm-item');
  assert.equal(items.length, 2);
  const unread = items.find(n => n.classList.contains('is-unread'));
  assert.equal(unread.querySelector('.fm-text').textContent, '<b>숙제</b> 했니?');
  assert.equal(byText('.fm-tab', '받은 메시지').querySelector('.fm-tab-count').textContent, '1');
  unread.click();
  await settle();
  assert.ok(unread.classList.contains('is-open'));
  assert.equal(unread.classList.contains('is-unread'), false);
  assert.deepEqual(server.calls.find(c => c.path === '/read').body, { ids: ['m1'] });
});

test('보낸 메시지: 읽음 여부와 읽은 시각', async () => {
  const server = fakeServer();
  server.add('minseo', 'mom', '엄마 사랑해', { read: true, readAt: '2026-11-16T19:41:00+09:00' });
  server.add('minseo', 'dad', '아빠 언제 와?');
  const { $$, byText } = open({ server });
  await settle();
  byText('.fm-tab', '보낸 메시지').click();
  await settle();
  const statuses = $$('.fm-status').map(n => n.textContent);
  assert.equal(statuses.length, 2);
  assert.ok(statuses.includes('아직 안 읽었어요'));
  assert.ok(statuses.some(text => text.startsWith('✓ 읽었어요 (')));
});

test('쓰기: 받는 사람에 나는 없고, 이모지는 커서 자리에, 실패하면 글을 지키고 같은 clientId로 다시 보낸다', async () => {
  const server = fakeServer();
  server.state.failSend = 1;
  const { b, $, $$, byText } = open({ server, search: '?compose=minseo' });
  await settle();
  const recipients = $$('.fm-recipient').map(n => n.textContent);
  assert.deepEqual(recipients, ['👦민수', '👩엄마', '👨아빠'], '나(민서)를 빼고, 나에게 쓰기는 무시');
  assert.equal($$('.fm-recipient.is-selected').length, 0);
  const send = byText('.fm-btn-primary', '보내기');
  assert.equal(send.disabled, true);

  byText('.fm-recipient', '엄마').click();
  const textarea = $('.fm-textarea');
  textarea.value = '엄마 나 숙제 다 했어';
  textarea.selectionStart = textarea.selectionEnd = 2;
  textarea.dispatch('input');
  $('.fm-emoji-toggle').click();
  assert.equal($('.fm-emoji-grid').hidden, false);
  byText('.fm-emoji', '🎉').click();
  assert.equal(textarea.value, '엄마🎉 나 숙제 다 했어');
  assert.equal($('.fm-counter').textContent, '13/500');

  send.click();
  await settle();
  assert.equal($$('.fm-msg.is-error').find(n => !n.hidden).textContent, '잠시 뒤에 다시 해 주세요');
  assert.equal(textarea.value, '엄마🎉 나 숙제 다 했어', '실패해도 글은 그대로');
  send.click();
  await settle();
  const sends = server.calls.filter(c => c.path === '/send');
  assert.equal(sends.length, 2);
  assert.equal(sends[0].body.clientId, sends[1].body.clientId, '다시 보낼 때 같은 clientId');
  assert.deepEqual({ to: sends[1].body.to, text: sends[1].body.text }, { to: 'mom', text: '엄마🎉 나 숙제 다 했어' });
  assert.equal($('.fm-sheet'), null, '보내면 창이 닫힌다');
  assert.equal(byText('.fm-tab', '보낸 메시지').classList.contains('is-active'), true);
  assert.equal(b.localData.get('familyMailDraft'), undefined, '임시 글 지움');
});

test('쓰다 만 글은 임시 저장되고 다시 열면 이어 쓴다', async () => {
  const { b, $, byText } = open();
  await settle();
  byText('.fm-fab', '메시지 쓰기').click();
  byText('.fm-recipient', '아빠').click();
  $('.fm-textarea').value = '아빠 오늘';
  $('.fm-textarea').dispatch('input');
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.deepEqual(JSON.parse(b.localData.get('familyMailDraft')), { to: 'dad', text: '아빠 오늘' });
  $('.fm-close').click();
  byText('.fm-fab', '메시지 쓰기').click();
  assert.equal($('.fm-textarea').value, '아빠 오늘');
  assert.ok(byText('.fm-recipient', '아빠').classList.contains('is-selected'));
});

test('설정: 등록 해제는 확인 창을 거치고, 해제하면 처음 설정 화면', async () => {
  let asked = 0;
  const { b, $, $$, byText } = open({ confirm: () => { asked += 1; return true; } });
  await settle();
  $('.fm-icon-btn').click();
  await settle();
  assert.match($('.fm-settings').textContent, /이 폰👧 민서/);
  byText('.fm-danger', '등록 해제').click();
  await settle();
  assert.equal(asked, 1);
  assert.equal(b.localData.get('familyMailDevice'), undefined);
  assert.equal($$('.fm-member').length, 4);
});

test('recipientsFor·insertAtCursor 공개 도우미', () => {
  const { b } = open();
  const page = b.window.FamilyMailPage;
  assert.equal(page.recipientsFor('mom').map(m => m.key).join(','), 'minsu,minseo,dad');
  const area = page.el('textarea');
  area.value = 'ab';
  area.selectionStart = area.selectionEnd = 1;
  page.insertAtCursor(area, '❤️');
  assert.equal(area.value, 'a❤️b');
  assert.equal(area.selectionStart, 1 + '❤️'.length);
});
