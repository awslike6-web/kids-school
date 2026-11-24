// 🎯 받침 빙고: 민서(초1) 받아쓰기 정제 어휘로 하는 3×3 빙고 (docs/korean_spec.md §5-4-1)
// 순수 함수(eligibleWords·soundTrap·makeBoard·callText·speakText)는 DOM 없이 시험한다.
// 화면은 수학 공용 MathBingo.render를 그대로 부르고, 함정 칩(decoys)·안내 읽기·문항기록만 옵션으로 넘긴다.
(function (global) {
  'use strict';

  var HANGUL_BASE = 0xAC00;
  var MAX_LEN = 4;          // 375px 칸에 한 줄로 들어가는 글자 수
  var BOARD = 9;
  var TRAP_COUNT = 2;
  var BLANK = '(　　　)'; // 전각 빈칸이라 HTML에서도 빈칸 너비가 남는다
  var LISTEN = '🔊 잘 듣고 찾아요';
  var HINT_TRAP = '소리는 같아도 글자가 달라요. 받침을 떠올려 봐요';
  var HINT_OTHER = '다시 잘 들어 봐요';
  // 받침의 대표 소리 묶음 (종성 번호 → 묶음): ㄱ{ㄱㄲㅋㄳㄺ} ㄴ{ㄴㄵㄶ} ㄷ{ㄷㅅㅆㅈㅊㅌㅎ} ㄹ{ㄹㄼㄽㄾㅀ} ㅁ{ㅁㄻ} ㅂ{ㅂㅍㅄㄿ} ㅇ
  var REP = {
    1: 'k', 2: 'k', 3: 'k', 9: 'k', 24: 'k',
    4: 'n', 5: 'n', 6: 'n',
    7: 't', 19: 't', 20: 't', 22: 't', 23: 't', 25: 't', 27: 't',
    8: 'l', 11: 'l', 12: 'l', 13: 'l', 15: 'l',
    16: 'm', 10: 'm',
    17: 'p', 26: 'p', 18: 'p', 14: 'p',
    21: 'ng'
  };

  var PLAIN_JONG = [1, 4, 7, 8, 16, 17, 21, 19];

  function noop() {}

  function pickRng(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function shuffle(list, rng) {
    var r = pickRng(rng);
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(r() * (i + 1));
      if (j < 0) j = 0;
      if (j > i) j = i;
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  // 한글 음절 → { cho, jung, jong }, 한글이 아니면 null
  function parts(ch) {
    var c = ch.charCodeAt(0) - HANGUL_BASE;
    if (c < 0 || c >= 11172) return null;
    return { cho: Math.floor(c / 588), jung: Math.floor((c % 588) / 28), jong: c % 28 };
  }

  function syllables(word) {
    var out = [];
    var chars = Array.from(String(word || ''));
    for (var i = 0; i < chars.length; i += 1) {
      var p = parts(chars[i]);
      if (!p) return null;
      out.push(p);
    }
    return out;
  }

  function cleanWord(w) {
    return String(w || '').trim();
  }

  // 쓸 수 있는 낱말: 한글 한 낱말, 1~4글자, 받침 있는 글자 하나 이상, 어휘유형이 단어(또는 비어 있음), 표제어 하나만
  function eligibleWords(records) {
    var seen = {};
    var out = [];
    (records || []).forEach(function (r) {
      if (!r) return;
      var word = cleanWord(r.word);
      var type = cleanWord(r.type || r.wordType);
      if (type && type !== '단어') return;
      var syl = syllables(word);
      if (!syl || syl.length < 1 || syl.length > MAX_LEN) return;
      if (!syl.some(function (s) { return s.jong > 0; })) return;
      var hasMark = String(r.detail || r.detailContext || '').indexOf('[') !== -1;
      if (seen[word]) {
        // 같은 표제어가 여러 행이면 [활용형] 예문이 있는 행을 남긴다
        if (hasMark && seen[word].detail.indexOf('[') === -1) {
          seen[word].detail = String(r.detail || r.detailContext || '');
          seen[word].pageId = r.pageId || r.id || seen[word].pageId;
        }
        return;
      }
      var item = {
        word: word,
        detail: String(r.detail || r.detailContext || ''),
        pageId: r.pageId || r.id || '',
        unit: r.unit || r.level || ''
      };
      seen[word] = item;
      out.push(item);
    });
    return out;
  }

  // 함정 후보의 순위: 0 두 글자에 걸친 소리 나는 대로 쓰기, 1 받침을 대표 소리로, 2 그 밖의 받침 바꾸기, -1 쓰지 않음(모음·첫소리가 바뀜)
  // 함정으로는 0·1만 쓴다 — 2는 소리가 달라져(읽다[익따]→일다) 「소리는 같아도」 안내가 거짓이 된다
  function trapRank(word, cand) {
    var a = syllables(word);
    var b = syllables(cand);
    if (!a || !b || a.length !== b.length || cand === word) return -1;
    var diff = [];
    for (var i = 0; i < a.length; i += 1) {
      if (a[i].jung !== b[i].jung) return -1;
      if (a[i].cho !== b[i].cho || a[i].jong !== b[i].jong) diff.push(i);
    }
    if (!diff.length) return -1;
    // 받침과 상관없는 바꾸기는 뺀다: 첫소리가 바뀐 글자는 바로 앞 글자의 받침도 바뀌어야 함(연음·거센소리)
    for (var d = 0; d < diff.length; d += 1) {
      var at = diff[d];
      if (a[at].cho !== b[at].cho && (at === 0 || a[at - 1].jong === b[at - 1].jong)) return -1;
    }
    if (!diff.some(function (x) { return a[x].jong !== b[x].jong; })) return -1;
    if (diff.length >= 2) return 0;
    var k = diff[0];
    if (a[k].cho !== b[k].cho) return -1;
    // 밟다[밥따]는 ㄼ이 ㅂ 소리로 나는 예외
    var from = a[k].jong === 11 && a[k].cho === 7 && a[k].jung === 0 ? 'p' : REP[a[k].jong];
    // 같은 소리 묶음이면서 그 소리의 대표 받침(ㄱㄴㄷㄹㅁㅂㅇ)이나 아이들이 흔히 쓰는 ㅅ으로 바꾼 것 (숫자→숟자, 끝→끗; 숬자는 2순위)
    if (from && REP[b[k].jong] === from && PLAIN_JONG.indexOf(b[k].jong) !== -1) return 1;
    return 2;
  }

  // 두 낱말이 소리가 같은가 (한쪽이 다른 쪽을 소리 나는 대로 쓴 글자): 읽다·익다는 한 판에 같이 내지 않는다
  function soundsAlike(w1, w2) {
    var QM = global.QuestMastery;
    if (!QM || typeof QM.misspellingsOf !== 'function' || w1 === w2) return false;
    function hit(a, b) {
      return QM.misspellingsOf(a).some(function (c) { return c === b && trapRank(a, c) >= 0 && trapRank(a, c) <= 1; });
    }
    return hit(w1, w2) || hit(w2, w1);
  }

  // 소리 나는 대로 쓴 함정 글자 하나 (없으면 null). allWords: 표제어 목록(배열·객체) — 표제어와 같은 글자는 함정으로 쓰지 않는다
  function soundTrap(word, allWords) {
    var QM = global.QuestMastery;
    if (!QM || typeof QM.misspellingsOf !== 'function') return null;
    var known = {};
    if (Array.isArray(allWords)) allWords.forEach(function (w) { known[cleanWord(w)] = true; });
    else if (allWords && typeof allWords === 'object') known = allWords;
    var best = null;
    var bestRank = 9;
    QM.misspellingsOf(word).forEach(function (cand) {
      if (known[cand]) return;
      var rank = trapRank(word, cand);
      if (rank < 0 || rank > 1 || rank >= bestRank) return;
      best = cand;
      bestRank = rank;
    });
    return best;
  }

  // 화면에 보이는 글: 예문의 [활용형]을 빈칸으로 (정답 글자는 보이지 않게)
  function callText(item) {
    var detail = String((item && item.detail) || '');
    var word = (item && item.word) || '';
    if (detail.indexOf('[') === -1) return LISTEN;
    var text = detail.replace(/\[[^\]]*\]/, BLANK).replace(/[\[\]]/g, '');
    if (word && text.indexOf(word) !== -1) return LISTEN;
    return text;
  }

  // 읽어 주는 말: 낱말. 예문([ ]만 뗌)
  function speakText(item) {
    var word = (item && item.word) || '';
    var sentence = String((item && item.detail) || '').replace(/[\[\]]/g, '').trim();
    return sentence ? word + '. ' + sentence : word;
  }

  function toProblem(item, trap) {
    return {
      kind: 'word',
      word: item.word,
      answerText: item.word,
      call: callText(item),
      speak: speakText(item),
      pageId: item.pageId || '',
      trap: trap || null
    };
  }

  // 판 하나: 첫 판 낱말 9개, traps면 함정 있는 낱말 2개 + 나머지 → 7개 + 함정 2칸 (함정이 모자라면 줄임)
  // 돌려주는 값 { problems, decoys: [{ text, of }] } 또는 낱말이 9개 미만이면 null
  function makeBoard(words, opts) {
    var o = opts || {};
    var rng = pickRng(o.rng);
    var list = (words || []).filter(function (w) { return w && w.word; });
    if (list.length < BOARD) return null;
    var known = {};
    (o.allWords || []).forEach(function (w) { known[cleanWord(w)] = true; });
    list.forEach(function (w) { known[w.word] = true; });

    var picked = [];
    var decoys = [];
    var used = {};
    function clash(word) {
      return picked.some(function (p) { return soundsAlike(p.word, word); });
    }
    if (o.traps) {
      var mixed = shuffle(list, rng);
      for (var i = 0; i < mixed.length && decoys.length < TRAP_COUNT; i += 1) {
        var t = soundTrap(mixed[i].word, known);
        if (!t || used[t] || clash(mixed[i].word)) continue;
        used[t] = true;
        decoys.push({ text: t, of: mixed[i].word });
        picked.push(toProblem(mixed[i], t));
      }
    }
    var rest = shuffle(list.filter(function (w) {
      return !picked.some(function (p) { return p.word === w.word; });
    }), rng);
    var skipped = [];
    for (var k = 0; k < rest.length && picked.length + decoys.length < BOARD; k += 1) {
      if (clash(rest[k].word)) skipped.push(rest[k]);
      else picked.push(toProblem(rest[k], null));
    }
    // 낱말이 모자라면 소리가 같은 낱말도 넣는다 (예문을 함께 읽어 뜻으로 가릴 수 있음)
    for (var m = 0; m < skipped.length && picked.length + decoys.length < BOARD; m += 1) {
      picked.push(toProblem(skipped[m], null));
    }
    return { problems: shuffle(picked, rng), decoys: decoys };
  }

  // 오답 안내: 지금 부른 낱말의 함정 칸이면 받침 안내, 아니면 다시 듣기
  function wrongHint(problem, pickedText) {
    if (problem && problem.trap && pickedText === problem.trap) return HINT_TRAP;
    return HINT_OTHER;
  }

  // ---------- 화면 ----------
  function childKey() {
    return global.currentChild === 'minsu' ? 'minsu' : 'minseo';
  }

  function studentName() {
    return childKey() === 'minsu' ? '민수' : '민서';
  }

  function unitKey(r) {
    return String(r.grade || '') + '::' + String(r.level !== undefined ? r.level : (r.stage || ''));
  }

  function unitLabel(r) {
    var level = String(r.level !== undefined ? r.level : (r.stage || ''));
    return r.grade ? r.grade + ' · ' + level : level;
  }

  function loadPicked() {
    try {
      var raw = global.localStorage.getItem('kbingo_units_' + childKey());
      var arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr : null;
    } catch (e) {
      return null;
    }
  }

  function savePicked(keys) {
    try {
      global.localStorage.setItem('kbingo_units_' + childKey(), JSON.stringify(keys));
    } catch (e) {}
  }

  // 단원별로 묶기: [{ key, label, records, count(쓸 수 있는 낱말 수) }], 단원 원문 순서(숫자 인식 정렬)
  function groupUnits(records) {
    var map = {};
    var order = [];
    records.forEach(function (r) {
      var key = unitKey(r);
      if (!map[key]) {
        map[key] = { key: key, label: unitLabel(r), records: [] };
        order.push(key);
      }
      map[key].records.push(r);
    });
    var units = order.map(function (k) {
      var u = map[k];
      u.count = eligibleWords(u.records).length;
      return u;
    }).filter(function (u) { return u.count > 0; });
    units.sort(function (a, b) { return a.label.localeCompare(b.label, 'ko', { numeric: true }); });
    return units;
  }

  function makeTracker(p) {
    var log = global.LearningLog;
    if (!log || typeof log.question !== 'function' || typeof log.keyFor !== 'function') return null;
    var key = p && p.pageId ? log.keyFor('v', p.pageId) : log.keyFor('g', 'kbingo-word');
    return key ? log.question({ subject: '국어', key: key }) : null;
  }

  function mount(root) {
    if (!root || !global.MathBingo || !global.MathExplorer) return;
    var ctx = global.MathBingo.makeCtx({ keyPrefix: 'kbingo_first', expType: 'korean' });
    var ui = ctx.ui;
    var pickerBox = ui.el('section', 'kb-picker');
    var playBox = ui.el('section', 'kb-play');
    playBox.hidden = true;
    root.replaceChildren(pickerBox, playBox);

    var units = [];
    var allWords = [];

    function selectedWords(keys) {
      var recs = [];
      units.forEach(function (u) {
        if (keys.indexOf(u.key) !== -1) recs = recs.concat(u.records);
      });
      return eligibleWords(recs);
    }

    function startBingo(keys) {
      var words = selectedWords(keys);
      pickerBox.hidden = true;
      playBox.hidden = false;
      playBox.replaceChildren();
      var bar = ui.el('div', 'kb-play-bar');
      bar.appendChild(ui.button('📚 단원 바꾸기', 'mx-btn kb-change', function () {
        if (typeof global.stopFairyTTS === 'function') global.stopFairyTTS();
        playBox.hidden = true;
        pickerBox.hidden = false;
        showPicker(false);
      }));
      playBox.appendChild(bar);
      var area = ui.el('div', 'mx-bingo-area');
      playBox.appendChild(area);
      global.MathBingo.render(area, ctx, {
        makeBingo: function (info) {
          return makeBoard(words, { traps: Boolean(info && info.extra), rng: Math.random, allWords: allWords });
        },
        prefix: 'kbingo',
        counterKey: 'kbingo',
        perReward: 6,
        expType: 'korean',
        title: '🎯 받침 빙고',
        labels: { place: '낱말을 골라 내 판에 놓아요', pickFirst: '먼저 아래 낱말을 골라요' },
        wrongHint: wrongHint,
        track: makeTracker
      });
      ctx.say('낱말을 골라 내 판에 놓아요');
    }

    function showPicker(speak) {
      pickerBox.replaceChildren();
      var card = ui.card('📚 어느 단원 낱말로 할까요?');
      pickerBox.appendChild(card);
      var saved = loadPicked();
      var keys = (saved || []).filter(function (k) {
        return units.some(function (u) { return u.key === k; });
      });
      if (!keys.length) {
        for (var i = units.length - 1; i >= 0; i -= 1) {
          if (units[i].count >= BOARD) { keys = [units[i].key]; break; }
        }
      }
      // 9개가 넘는 단원이 없으면 마지막 단원부터 거꾸로 9개가 될 때까지 함께 고른다
      for (var j = units.length - 1; j >= 0 && selectedWords(keys).length < BOARD; j -= 1) {
        if (keys.indexOf(units[j].key) === -1) keys.push(units[j].key);
      }
      card.appendChild(ui.guide('단원을 눌러 켜고 꺼요. 여러 단원도 돼요.'));
      var list = ui.el('div', 'kb-unit-list');
      var hintEl = ui.el('div', 'mx-hint');
      hintEl.hidden = true;
      var startBtn = ui.button('▶ 빙고 시작', 'mx-btn primary kb-start', function () {
        if (startBtn.disabled) return;
        savePicked(keys);
        startBingo(keys);
      });
      function refresh() {
        var n = selectedWords(keys).length;
        startBtn.disabled = n < BOARD;
        startBtn.textContent = '▶ 빙고 시작 (낱말 ' + n + '개)';
        ui.hint(hintEl, n < BOARD ? '낱말이 9개보다 적어요. 단원을 더 골라요' : '');
      }
      units.forEach(function (u) {
        var btn = ui.button(u.label + ' · 낱말 ' + u.count + '개', 'mx-btn kb-unit', function () {
          var at = keys.indexOf(u.key);
          if (at === -1) keys.push(u.key);
          else keys.splice(at, 1);
          var on = keys.indexOf(u.key) !== -1;
          btn.classList.toggle('is-on', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          refresh();
        });
        var on = keys.indexOf(u.key) !== -1;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        list.appendChild(btn);
      });
      // 시작 버튼은 단원 목록 위에 (단원이 많아도 화면 첫머리에서 보임)
      card.appendChild(startBtn);
      card.appendChild(hintEl);
      card.appendChild(list);
      refresh();
      if (speak) ctx.say('어느 단원 낱말로 빙고를 할까요?');
    }

    function showLoadError() {
      pickerBox.replaceChildren();
      var card = ui.card('📚 낱말을 불러오지 못했어요');
      card.appendChild(ui.guide('인터넷을 확인하고 다시 불러와요.'));
      card.appendChild(ui.button('🔁 다시 불러오기', 'mx-btn primary', function () { load(); }));
      pickerBox.appendChild(card);
    }

    function load() {
      pickerBox.replaceChildren(ui.guide('낱말을 불러오는 중이에요…'));
      var fetchFn = global.fetchVocaFromNotion;
      if (typeof fetchFn !== 'function') { showLoadError(); return; }
      Promise.resolve(fetchFn({ subject: '국어', studentName: studentName() })).then(function (records) {
        var recs = (records || []).filter(function (r) {
          var type = cleanWord(r && (r.type || r.wordType));
          return r && r.word && (!type || type === '단어');
        }).map(function (r) {
          return { word: r.word, detailContext: r.detailContext, detail: r.detail, pageId: r.pageId || r.id, level: r.level, stage: r.stage, grade: r.grade === '공통' ? '' : r.grade, type: r.type };
        });
        allWords = (records || []).map(function (r) { return cleanWord(r && r.word); }).filter(Boolean);
        units = groupUnits(recs);
        if (!units.length) { showLoadError(); return; }
        showPicker(true);
      }, showLoadError);
    }

    load();
  }

  var api = {
    MAX_LEN: MAX_LEN,
    HINT_TRAP: HINT_TRAP,
    HINT_OTHER: HINT_OTHER,
    eligibleWords: eligibleWords,
    trapRank: trapRank,
    soundsAlike: soundsAlike,
    soundTrap: soundTrap,
    callText: callText,
    speakText: speakText,
    makeBoard: makeBoard,
    wrongHint: wrongHint,
    groupUnits: groupUnits,
    mount: mount
  };
  global.BatchimBingo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function () {
      global.currentSubject = '국어';
      var root = document.getElementById('kbRoot');
      if (root) mount(root);
      if (global.MathSquishy && typeof global.MathSquishy.attach === 'function') {
        try { global.MathSquishy.attach(); } catch (e) { noop(e); }
      }
      var head = document.getElementById('kbSquishy');
      if (head && global.MathSquishy && typeof global.MathSquishy.chooserButton === 'function') {
        head.appendChild(global.MathSquishy.chooserButton());
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
