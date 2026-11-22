// 문항 단위 학습 기록 (docs/learning_record_spec.md). 문항 결과를 기기 대기열에 모았다가
// 그날 학습일지 행(StudyLogStore와 같은 행·같은 잠금)의 '문항기록' 칸 하나만 PATCH한다.
// 초안: 안티그래비티 Hydrogen, 검토·수정: Claude
(function (window) {
  'use strict';

  var STORAGE_KEY = 'MINMIN_LEARNING_LOG_V1';
  var CHILDREN = ['민수', '민서'];
  var ADULTS = ['아빠', '엄마', '어른']; // notion-study-logger.js·notion-voca.js 관리자 판정과 같음
  var KEY_RE = /^[a-z]:[^\s]{1,62}$/;
  var MAX_ITEMS = 300;
  var CHUNK_SIZE = 1900;
  var MAX_FAILS = 5;
  var BATCH_EVERY = 20;

  var hasColumn = null;
  var skippedKeys = new Set();
  var attemptCount = 0;
  var inflightFlush = null;

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // 현재 시각을 KST(+09:00) ISO 문자열로 생성
  function kstIsoNow() {
    var k = new Date(Date.now() + 9 * 3600000);
    return (
      k.getUTCFullYear() + '-' + pad2(k.getUTCMonth() + 1) + '-' + pad2(k.getUTCDate()) +
      'T' + pad2(k.getUTCHours()) + ':' + pad2(k.getUTCMinutes()) + ':' + pad2(k.getUTCSeconds()) + '+09:00'
    );
  }

  function loadQueue() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveQueue(q) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
    } catch (e) {
      // 저장소 접근 실패 시 예외를 던지지 않음
    }
  }

  function randomBatchId() {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var out = '';
    for (var i = 0; i < 8; i += 1) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  function sanitizePick(s) {
    return String(s).replace(/\|/g, '/').slice(0, 20);
  }

  function decode(text) {
    if (text == null || (typeof text === 'string' && text.trim() === '')) {
      return { v: 1, i: {}, b: [] };
    }
    if (typeof text !== 'string') return null;
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return null;
    }
    if (
      !parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      parsed.v !== 1 || !parsed.i || typeof parsed.i !== 'object' || Array.isArray(parsed.i)
    ) {
      return null;
    }
    return { v: 1, i: parsed.i, b: Array.isArray(parsed.b) ? parsed.b : [] };
  }

  // 노션 조각 한도(2,000)는 UTF-16 단위다. 코드 포인트를 이어 붙이되 UTF-16 길이 1,900을 넘기 전에 자른다
  // → 이모지(서로게이트 쌍)가 경계에서 반으로 갈리지 않고, 이모지가 많아도 한도를 넘지 않는다.
  function encode(obj) {
    var out = [];
    var buf = '';
    Array.from(JSON.stringify(obj)).forEach(function (ch) {
      if (buf.length + ch.length > CHUNK_SIZE) { out.push({ text: { content: buf } }); buf = ''; }
      buf += ch;
    });
    if (buf) out.push({ text: { content: buf } });
    return out.length ? out : [{ text: { content: '' } }];
  }

  function merge(stored, items, batchId) {
    var baseB = Array.isArray(stored && stored.b) ? stored.b.slice() : [];
    if (batchId && baseB.indexOf(batchId) !== -1) return stored;
    var nextI = {};
    var srcI = (stored && stored.i) || {};
    var keys = Object.keys(srcI);
    for (var k = 0; k < keys.length; k += 1) {
      var key = keys[k];
      nextI[key] = srcI[key].slice();
    }
    var count = keys.length;
    var deltaKeys = Object.keys(items || {});
    for (var j = 0; j < deltaKeys.length; j += 1) {
      var dk = deltaKeys[j];
      var d = items[dk];
      var addPicks = Array.isArray(d[3]) ? d[3].map(sanitizePick) : [];
      if (Object.prototype.hasOwnProperty.call(nextI, dk)) {
        var cur = nextI[dk];
        var prevPicks = typeof cur[3] === 'string' && cur[3] ? cur[3].split('|') : [];
        nextI[dk] = [
          (cur[0] || 0) + (d[0] || 0),
          (cur[1] || 0) + (d[1] || 0),
          (cur[2] || 0) + (d[2] || 0),
          prevPicks.concat(addPicks).slice(-3).join('|')
        ];
      } else if (count < MAX_ITEMS) {
        nextI[dk] = [d[0] || 0, d[1] || 0, d[2] || 0, addPicks.slice(-3).join('|')];
        count += 1;
      } else {
        console.warn('[LearningLog] 문항 상한(300개) 초과로 새 문항 무시:', dk);
      }
    }
    if (batchId) baseB.push(batchId);
    return { v: 1, i: nextI, b: baseB.slice(-10) };
  }

  function attempt(opts) {
    if (!opts || typeof opts !== 'object') return false;
    var child = opts.child;
    var subject = opts.subject;
    var key = opts.key;
    if (CHILDREN.indexOf(child) === -1) return false;
    // 부모 시뮬레이터(학습일지·숙련도와 같은 규칙)는 기록하지 않는다
    try {
      if (ADULTS.indexOf(window.localStorage.getItem('currentUserName')) !== -1) return false;
    } catch (e) { /* 저장소 접근 실패는 기록 여부에 영향 없음 */ }
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 40) return false;
    if (typeof key !== 'string' || !KEY_RE.test(key)) {
      console.warn('[LearningLog] 잘못된 문항키 무시:', key);
      return false;
    }
    var store = window.StudyLogStore;
    if (!store) return false;
    var logKey = store.buildLogKey(child, subject, store.getKstDateString());
    var q = loadQueue();
    if (!q[logKey]) {
      q[logKey] = { child: child, subject: subject, first: kstIsoNow(), pending: {}, inflight: null };
    }
    var entry = q[logKey];
    if (!entry.pending) entry.pending = {};
    var item = entry.pending[key] || [0, 0, 0, []];
    item[0] += 1;
    if (!opts.firstTry) item[1] += 1;
    if (opts.hinted) item[2] += 1;
    var picks = Array.isArray(opts.picks) ? opts.picks : [];
    if (picks.length) {
      var prev = Array.isArray(item[3]) ? item[3] : [];
      item[3] = prev.concat(picks.map(sanitizePick)).slice(-3);
    }
    entry.pending[key] = item;
    saveQueue(q);
    attemptCount += 1;
    if (attemptCount % BATCH_EVERY === 0) {
      api.flush().catch(function () {});
    }
    return true;
  }

  function pending() {
    var q = loadQueue();
    var keys = Object.keys(q);
    var items = 0;
    for (var i = 0; i < keys.length; i += 1) {
      var e = q[keys[i]];
      if (e && e.pending) items += Object.keys(e.pending).length;
      if (e && e.inflight && e.inflight.items) items += Object.keys(e.inflight.items).length;
    }
    return { keys: keys.length, items: items };
  }

  async function checkColumn(cfg) {
    if (hasColumn !== null) return hasColumn;
    try {
      // ?force=true: Worker 엣지 캐시를 우회해 칸 추가를 바로 알아챈다 (Worker v4.6이 지우고 전달)
      var res = await window.fetch(cfg.proxyUrl + '/v1/databases/' + cfg.dbId + '?force=true', { method: 'GET' });
      if (!res || !res.ok) return null;
      var data = await res.json();
      hasColumn = Boolean(data && data.properties && Object.prototype.hasOwnProperty.call(data.properties, '문항기록'));
      return hasColumn;
    } catch (e) {
      return null;
    }
  }

  function extractRichText(page) {
    var prop = page && page.properties && page.properties['문항기록'];
    var rt = prop && prop.rich_text;
    if (!Array.isArray(rt)) return '';
    return rt.map(function (r) {
      return (r && (r.plain_text || (r.text && r.text.content))) || '';
    }).join('');
  }

  async function patchPage(cfg, pageId, richText) {
    var res = await window.fetch(cfg.proxyUrl + '/v1/pages/' + pageId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { '문항기록': { rich_text: richText } } })
    });
    return Boolean(res && res.ok);
  }

  function markFail(key) {
    var q = loadQueue();
    if (q[key] && q[key].inflight) {
      q[key].inflight.fails = (q[key].inflight.fails || 0) + 1;
      if (q[key].inflight.fails >= MAX_FAILS) skippedKeys.add(key);
      saveQueue(q);
    }
  }

  async function flushKey(store, cfg, key) {
    var q1 = loadQueue();
    var entry = q1[key];
    if (!entry) return 'none';
    if (!entry.inflight) {
      if (!entry.pending || Object.keys(entry.pending).length === 0) return 'none';
      entry.inflight = { batch: randomBatchId(), items: entry.pending, fails: 0 };
      entry.pending = {};
      saveQueue(q1);
    }
    if (entry.inflight.fails >= MAX_FAILS) {
      skippedKeys.add(key);
      return 'skipped';
    }
    try {
      var loc = await store.locateDailyPage(key);
      if (loc && loc.failed) {
        markFail(key);
        return 'failed';
      }
      var page = loc ? loc.page : null;
      if (!page) {
        page = await store.createDailyPage({
          childName: entry.child,
          subject: entry.subject,
          startTime: entry.first,
          endTime: entry.first,
          durationMinutes: 0,
          errorReport: '오답 없음',
          wordFairyCount: 0
        }, key);
      }
      if (!page || !page.id) {
        // 행은 만들어졌는데 응답을 못 읽었거나 ID가 없을 수 있다(쓰기 차단 미리보기의 가짜 응답 등). 바로 다시 만들면 노션 색인 전이라 같은 ID 행이
        // 두 개 생길 수 있으므로, 이 열람에서는 이 키를 쉬고 다음 로드 때 ID 조회로 찾게 한다.
        markFail(key);
        skippedKeys.add(key);
        return 'failed';
      }
      var stored = decode(extractRichText(page));
      if (stored === null) {
        console.warn('[LearningLog] 기존 문항기록 해석 실패로 전송 중단:', key);
        skippedKeys.add(key); // 이 열람 동안 같은 행을 반복해 읽지 않는다 (대기열은 보존)
        return 'skipped';
      }
      var merged = merge(stored, entry.inflight.items, entry.inflight.batch);
      var ok = await patchPage(cfg, page.id, encode(merged));
      if (!ok) {
        markFail(key);
        return 'failed';
      }
      var q2 = loadQueue();
      if (q2[key]) {
        q2[key].inflight = null;
        if (!q2[key].pending || Object.keys(q2[key].pending).length === 0) delete q2[key];
        saveQueue(q2);
      }
      return 'sent';
    } catch (e) {
      markFail(key);
      return 'failed';
    }
  }

  async function runFlush() {
    var store = window.StudyLogStore;
    if (!store) return { sent: 0, failed: 0, skipped: 0 };
    var cfg = store.notionConfig();
    var col = await checkColumn(cfg);
    if (col === false) return { sent: 0, failed: 0, skipped: 'no-column' };
    if (col === null) return { sent: 0, failed: 1, skipped: 'check-failed' };
    var keys = Object.keys(loadQueue());
    var sent = 0;
    var failed = 0;
    var skipped = 0;
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (skippedKeys.has(key)) {
        skipped += 1;
        continue;
      }
      var res = await store.serialize(key, function () {
        return flushKey(store, cfg, key);
      });
      if (res === 'sent') sent += 1;
      else if (res === 'failed') failed += 1;
      else if (res === 'skipped') skipped += 1;
    }
    return { sent: sent, failed: failed, skipped: skipped };
  }

  // 보내는 중에 다시 부르면(레슨 끝 등) 지금 회차가 끝난 뒤 한 번 더 돌아, 그사이 들어온 시도도 보낸다.
  var flushAgain = false;
  function flush() {
    if (inflightFlush) {
      flushAgain = true;
      return inflightFlush;
    }
    inflightFlush = runFlush().then(function (result) {
      if (!flushAgain) return result;
      flushAgain = false;
      return runFlush();
    }).finally(function () {
      inflightFlush = null;
    });
    return inflightFlush;
  }

  // ---------- 화면용 도우미 (명세 §4-1, 2차) ----------
  // 문항키 만들기: 노션 page_id(하이픈 포함·제외 32자리 16진)는 하이픈을 뺀 소문자, 그 밖의 ID는
  // 영문·숫자·_.- 만 남긴다. part(문항 번호 등)가 있으면 ':'로 잇는다. 형식에 안 맞으면 null.
  function keyFor(prefix, id, part) {
    if (typeof prefix !== 'string' || !/^[a-z]$/.test(prefix) || id === undefined || id === null || id === '') return null;
    var clean = function (v) { return String(v).trim().replace(/[^A-Za-z0-9_.-]/g, '_'); };
    var hex = String(id).trim().replace(/-/g, '').toLowerCase();
    var body = /^[0-9a-f]{32}$/.test(hex) ? hex : clean(id);
    if (part !== undefined && part !== null && part !== '') body += ':' + clean(part);
    var key = prefix + ':' + body;
    return KEY_RE.test(key) ? key : null;
  }

  // 지금 공부하는 아이. 부모 시뮬레이터·알 수 없으면 null (기록하지 않음)
  function currentChild() {
    try {
      var name = window.localStorage.getItem('currentUserName');
      if (CHILDREN.indexOf(name) !== -1) return name;
      if (ADULTS.indexOf(name) !== -1) return null;
      var who = window.localStorage.getItem('currentUser');
      return who === 'daughter' ? '민서' : (who === 'son' ? '민수' : null);
    } catch (e) {
      return null;
    }
  }

  // 문항 하나 따라가기: 틀릴 때 wrong(고른 글자), 힌트를 보면 hint(), 맞혀서 끝나면 done() 한 번.
  // 첫 시도 여부·힌트·고른 오답을 모아 attempt 한 번으로 남긴다. done()은 두 번 불러도 한 번만 기록.
  function question(base) {
    var st = { wrong: false, hinted: false, picks: [], done: false };
    return {
      wrong: function (pick) {
        st.wrong = true;
        if (pick !== undefined && pick !== null && String(pick).trim() !== '') st.picks.push(String(pick));
      },
      hint: function () { st.hinted = true; },
      done: function () {
        if (st.done || !base || !base.key) return false;
        st.done = true;
        return attempt({ child: base.child || currentChild(), subject: base.subject, key: base.key,
          firstTry: !st.wrong, hinted: st.hinted, picks: st.picks });
      }
    };
  }

  function __resetForTest() {
    hasColumn = null;
    skippedKeys.clear();
    attemptCount = 0;
    inflightFlush = null;
    flushAgain = false;
  }

  var api = {
    attempt: attempt,
    flush: flush,
    pending: pending,
    merge: merge,
    encode: encode,
    decode: decode,
    keyFor: keyFor,
    currentChild: currentChild,
    question: question,
    __resetForTest: __resetForTest
  };

  window.LearningLog = api;

  // 로드 직후 지난 대기열 보내기. 숨김·닫힘 때는 보내지 않는다(연쇄 요청이 끊김, 명세 §4-2).
  // 페이지가 이미 다 실린 뒤 동적으로 실리면(loadCoreScripts) load 이벤트가 다시 오지 않으므로 바로 예약한다.
  if (window && typeof window.addEventListener === 'function') {
    if (window.document && window.document.readyState === 'complete') {
      setTimeout(function () { api.flush().catch(function () {}); }, 0);
    } else {
      window.addEventListener('load', function () {
        api.flush().catch(function () {});
      });
    }
  }
})(typeof window !== 'undefined' ? window : this);
