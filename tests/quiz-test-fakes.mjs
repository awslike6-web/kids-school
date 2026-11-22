// 객관식·문항기록 화면 시험이 같이 쓰는 가짜 DOM·난수·문항기록 도우미 (tests/quiz-choices.test.mjs에서 옮김)

export function makeSeedRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeFakeElement(tag = 'div') {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    closest() { return null; },
  };
}

// 문항기록(LearningLog) 연결 확인용 가짜: 키 모양과 문항 도우미 호출(wrong·hint·done)만 기록한다.
// 실제 키 정규화·합치기·전송은 tests/learning-log.test.mjs가 본다 (docs/learning_record_spec.md §5 2차).
export function fakeLearningLog() {
  // 실제 LearningLog의 question·itemTracker와 같은 규칙(같은 목록·번호면 같은 도우미, 바뀐 목록이면 새로)을 아주 작게 흉내 낸다
  const records = [];
  const sets = new WeakMap();
  const ll = {
    records,
    keyFor: (prefix, id, part) => (id ? `${prefix}:${id}${part === undefined ? '' : ':' + part}` : null),
    question(base) {
      const st = { wrong: false, hinted: false, picks: [], done: false };
      const t = {
        wrong: (pick) => { if (st.done) return; st.wrong = true; if (pick !== undefined) st.picks.push(pick); },
        hint: () => { if (!st.done) st.hinted = true; },
        done: () => {
          if (st.done) return false;
          st.done = true;
          records.push({ subject: base.subject, key: base.key, firstTry: !st.wrong, hinted: st.hinted, picks: st.picks.slice() });
          return true;
        },
        skip: () => (st.wrong && !st.done ? t.done() : false),
        isDone: () => st.done,
      };
      return t;
    },
    itemTracker({ prefix = 'v', subject, list, idx, key, session }) {
      const item = list && list[idx];
      if (item === undefined || item === null) return null;
      const pid = item.pageId || (/^[0-9a-f]{32}$/i.test(String(item.id || '').replace(/-/g, '')) ? item.id : null);
      const k = key || (pid ? ll.keyFor(prefix, pid) : null);
      if (!k) return null;
      const owner = session || list;
      if (!sets.has(owner)) sets.set(owner, {});
      const set = sets.get(owner), slot = set[idx];
      if (slot && slot.key === k) return slot.t;
      const t = ll.question({ subject, key: k });
      set[idx] = { key: k, t };
      return t;
    },
    itemSkip(owner, idx) { const slot = owner && sets.get(owner)?.[idx]; return slot ? slot.t.skip() : false; },
  };
  return ll;
}

export const plainLog = (ll) => JSON.parse(JSON.stringify(ll.records));

export function makeMiniEl(tag = 'div', attrs = {}) {
  const classes = new Set();
  const attrMap = Object.assign({}, attrs);
  return {
    tagName: tag.toUpperCase(),
    attributes: attrMap,
    hidden: false,
    style: {},
    innerHTML: '',
    textContent: '',
    children: [],
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    setAttribute(k, v) { attrMap[k] = String(v); },
    getAttribute(k) { return Object.hasOwn(attrMap, k) ? attrMap[k] : null; },
    appendChild(child) { this.children.push(child); return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    closest() { return null; },
  };
}
