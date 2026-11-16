// 📮 가족 우체통 서비스 워커 (명세: docs/family_mail_spec.md §6-3)
// 알림 띄우기·알림 누르기만 처리한다. fetch 처리기와 캐시는 일부러 두지 않는다(배포 뒤 옛 화면이 남는 사고 방지).
// 모든 주소는 등록 범위(scope) 기준 상대 경로로 만든다(GitHub Pages /kids-school/ 아래에서도 동작).
const SCOPE = self.registration.scope;
const MAILBOX = new URL('kids/common_space/family_mail.html', SCOPE).href;
const ICON = new URL('icon-192.png', SCOPE).href;
const BADGE = new URL('kids/assets/images/family-mail-badge.png', SCOPE).href;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function readPayload(event) {
  try {
    const data = event.data ? event.data.json() : null;
    if (data && data.type === 'family-mail') return data;
  } catch { /* 아래 기본 알림 */ }
  return { type: 'family-mail', title: '📮 가족 우체통', body: '새 메시지가 왔어요' };
}

self.addEventListener('push', event => {
  const data = readPayload(event);
  const id = typeof data.id === 'string' ? data.id : null;
  const url = id ? `${MAILBOX}?open=${encodeURIComponent(id)}` : MAILBOX;
  event.waitUntil((async () => {
    // 같은 사람의 알림은 하나로 묶되(tag), 새 메시지마다 다시 울린다(renotify)
    await self.registration.showNotification(String(data.title || '📮 가족 우체통'), {
      body: String(data.body || '새 메시지가 왔어요'),
      icon: ICON,
      badge: BADGE,
      tag: `family-mail-${data.from || 'all'}`,
      renotify: true,
      data: { url, id }
    });
    // 열려 있는 공부방 창에는 바로 알려 팝업·배지를 갱신하게 한다
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) client.postMessage({ type: 'family-mail', id });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const { url, id } = event.notification.data || {};
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // 우체통이 이미 열려 있으면 화면을 옮기지 않고(쓰던 글 보존) 그 메시지만 열게 한다
    const mailbox = windows.find(client => client.url.startsWith(MAILBOX));
    if (mailbox) {
      await mailbox.focus();
      mailbox.postMessage({ type: 'family-mail-open', id: id || null });
      return;
    }
    // 다른 화면(문제 풀이 중일 수 있음)은 건드리지 않고 우체통을 새로 연다
    await self.clients.openWindow(url || MAILBOX);
  })());
});
