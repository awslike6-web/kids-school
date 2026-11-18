// 🧩 가족 출제 퀴즈 출제실 — 전역 window.FamilyQuizAuthor (명세: docs/family_quiz_spec.md §5-1)
// 민수가 동생 문제를 쓰고, 들어 보고, 민서처럼 풀어 보고, 출시하고, 신고를 받아 고친다(버전 1 → 2 → 3).
// 아이가 쓴 글은 textContent·value로만 넣는다. 지우기 대신 「내리기」(상태=숨김).
(function () {
  'use strict';
  if (window.FamilyQuizAuthor) return;

  const AUTHOR = '민수';
  const SOLVER = '민서';
  const FIELDS = [
    { key: 'question', label: '문제', placeholder: '예) 사과는 무슨 색일까요?', multiline: true },
    { key: 'answer', label: '정답', placeholder: '예) 빨간색' },
    { key: 'wrong1', label: '오답 1', placeholder: '틀린 보기' },
    { key: 'wrong2', label: '오답 2', placeholder: '틀린 보기' },
    { key: 'wrong3', label: '오답 3', placeholder: '틀린 보기' },
    { key: 'hint', label: '힌트 (선택)', placeholder: '틀렸을 때 읽어 줄 말', multiline: true }
  ];
  const STATUS_CHIPS = {
    '한번에': '✅ 한 번에 맞혔어요',
    '두번째에': '🟡 두 번째에 맞혔어요',
    '도움받음': '💡 도움받고 맞혔어요'
  };

  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function button(className, text, onClick) {
    const el = h('button', className, text);
    el.type = 'button';
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }

  function mount(root, { lobbyHref }) {
    const FQ = window.FamilyQuiz;
    const Play = window.FamilyQuizPlay;
    const LIMIT = { question: FQ.LIMITS.question, hint: FQ.LIMITS.hint };
    let editing = null; // 고치는 중인 문제 (없으면 새 문제)
    let quizzes = [];
    let busy = false;

    root.replaceChildren();
    const header = h('header', 'fq-header');
    const back = h('a', 'fq-back', '← 로비');
    back.href = lobbyHref;
    header.append(back, h('h1', 'fq-title', '🧩 동생 문제 만들기'));
    root.appendChild(header);

    // ---------- 쓰기 칸 ----------
    const form = h('section', 'fq-panel fq-form');
    const formTitle = h('h2', 'fq-panel__title', '✏️ 새 문제');
    form.appendChild(formTitle);
    form.appendChild(h('p', 'fq-tip', '보기 순서는 민서 화면에서 자동으로 섞여요. 정답을 맨 위에 써도 괜찮아요.'));
    const inputs = {};
    const counters = {};
    const notes = {};
    FIELDS.forEach(field => {
      const wrap = h('label', 'fq-field');
      const head = h('span', 'fq-field__head');
      const max = LIMIT[field.key] || FQ.LIMITS.choice;
      counters[field.key] = h('span', 'fq-field__count', `0/${max}`);
      head.append(h('span', 'fq-field__label', field.label), counters[field.key]);
      const input = document.createElement(field.multiline ? 'textarea' : 'input');
      input.className = 'fq-input';
      input.placeholder = field.placeholder;
      if (field.multiline) input.rows = 2;
      input.addEventListener('input', () => { refresh(); saveDraft(); });
      inputs[field.key] = input;
      notes[field.key] = h('span', 'fq-field__note');
      wrap.append(head, input, notes[field.key]);
      form.appendChild(wrap);
    });
    const tools = h('div', 'fq-tools');
    const listenBtn = button('fq-btn', '🔊 들어보기', () => listen());
    const tryBtn = button('fq-btn', '👀 민서처럼 풀어 보기', () => tryOut());
    tools.append(listenBtn, tryBtn);
    const actions = h('div', 'fq-actions');
    const publishBtn = button('fq-btn fq-btn--main', '🚀 출시', () => publish());
    const cancelBtn = button('fq-btn fq-btn--ghost', '고치기 그만', () => startNew());
    cancelBtn.hidden = true;
    actions.append(publishBtn, cancelBtn);
    const status = h('p', 'fq-status');
    form.append(tools, actions, status);
    root.appendChild(form);

    // ---------- 내 문제 목록 ----------
    const listPanel = h('section', 'fq-panel');
    listPanel.appendChild(h('h2', 'fq-panel__title', '📚 내가 낸 문제'));
    const list = h('div', 'fq-list');
    listPanel.appendChild(list);
    root.appendChild(listPanel);

    // ---------- 미리 풀어 보기 덮개 ----------
    const overlay = h('div', 'fq-overlay');
    overlay.hidden = true;
    const overlayStage = h('div', 'fq-overlay__stage');
    overlay.append(button('fq-overlay__close', '✖ 닫기', () => closeOverlay()), overlayStage);
    root.appendChild(overlay);

    function readDraft() {
      return {
        question: inputs.question.value,
        answer: inputs.answer.value,
        wrongs: [inputs.wrong1.value, inputs.wrong2.value, inputs.wrong3.value],
        hint: inputs.hint.value
      };
    }

    function fill(d) {
      const wrongs = (d && d.wrongs) || [];
      inputs.question.value = (d && d.question) || '';
      inputs.answer.value = (d && d.answer) || '';
      inputs.wrong1.value = wrongs[0] || '';
      inputs.wrong2.value = wrongs[1] || '';
      inputs.wrong3.value = wrongs[2] || '';
      inputs.hint.value = (d && d.hint) || '';
      refresh();
    }

    function saveDraft() { if (!editing) FQ.draft.save(readDraft()); }

    function refresh() {
      const check = FQ.validate(readDraft());
      FIELDS.forEach(field => {
        const max = LIMIT[field.key] || FQ.LIMITS.choice;
        const n = FQ.countChars(inputs[field.key].value.trim());
        counters[field.key].textContent = `${n}/${max}`;
        counters[field.key].classList.toggle('is-over', n > max);
        notes[field.key].textContent = '';
        notes[field.key].className = 'fq-field__note';
      });
      // 빈 칸 안내는 칸을 건드린 뒤에만 보인다(처음부터 빨간 글씨가 가득하지 않게).
      check.errors.forEach(err => {
        const input = inputs[err.field];
        if (!input || (!input.value.trim() && !input.dataset.touched)) return;
        notes[err.field].textContent = err.message;
        notes[err.field].classList.add('is-error');
      });
      check.warnings.forEach(w => {
        if (notes[w.field].textContent) return;
        notes[w.field].textContent = `💡 ${w.message}`;
        notes[w.field].classList.add('is-warn');
      });
      publishBtn.disabled = busy || !check.ok;
      tryBtn.disabled = !check.ok;
      listenBtn.disabled = !check.draft.question;
      return check;
    }
    Object.values(inputs).forEach(input => input.addEventListener('blur', () => { input.dataset.touched = '1'; refresh(); }));

    function listen() {
      const d = FQ.normalizeDraft(readDraft());
      const choices = [d.answer, ...d.wrongs].filter(Boolean);
      Play.speakThen([d.question, ...choices].join('. '));
    }

    function tryOut() {
      const check = refresh();
      if (!check.ok) return;
      const preview = Object.assign({ id: 'preview', version: 1 }, check.draft);
      overlay.hidden = false;
      Play.playRound(overlayStage, [preview], {
        record: false,
        onDone: () => {
          overlayStage.replaceChildren(h('p', 'fq-end__title', '민서는 이렇게 보게 돼요 👍'), button('fq-btn fq-btn--main', '닫기', () => closeOverlay()));
        }
      });
    }

    function closeOverlay() {
      if (typeof window.stopFairyTTS === 'function') { try { window.stopFairyTTS(); } catch (e) { /* 무시 */ } }
      overlay.hidden = true;
      overlayStage.replaceChildren();
    }

    function setStatus(text, kind) {
      status.textContent = text || '';
      status.className = 'fq-status' + (kind ? ` is-${kind}` : '');
    }

    function startNew() {
      editing = null;
      formTitle.textContent = '✏️ 새 문제';
      publishBtn.textContent = '🚀 출시';
      cancelBtn.hidden = true;
      Object.values(inputs).forEach(input => { delete input.dataset.touched; });
      fill(FQ.draft.load());
    }

    function startEdit(quiz) {
      editing = quiz;
      formTitle.textContent = `🛠️ 고치는 중 (지금 버전 ${quiz.version})`;
      publishBtn.textContent = '🛠️ 고쳐서 다시 내기';
      cancelBtn.hidden = false;
      fill(quiz);
      setStatus(quiz.report ? `🚩 민서가 「${quiz.report}」라고 했어요` : '', quiz.report ? 'warn' : '');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function publish() {
      const check = refresh();
      if (!check.ok || busy) return;
      busy = true;
      publishBtn.disabled = true;
      setStatus('저장하는 중…');
      const fixing = editing;
      try {
        if (fixing) {
          const saved = await FQ.revise(fixing, check.draft);
          quizzes = quizzes.filter(q => q.id !== fixing.id);
          quizzes.unshift(Object.assign({}, fixing, check.draft, { version: saved.version || fixing.version + 1, solvedVersion: null, result: '', report: '' }));
          setStatus(fixing.report ? `버전 ${saved.version || fixing.version + 1} 출시! 🐞 버그 하나 잡았어요` : `버전 ${saved.version || fixing.version + 1} 출시!`, 'ok');
        } else {
          const saved = await FQ.create(check.draft, AUTHOR, SOLVER);
          quizzes.unshift(saved);
          FQ.draft.clear();
          setStatus('🚀 출시 완료! 민서 로비에 문제가 떠요', 'ok');
        }
        if (typeof window.fairyPraise === 'function') { try { window.fairyPraise(); } catch (e) { /* 무시 */ } }
        FQ.notify('minsu', 'minseo', '🧩 오빠가 새 문제를 냈어! 공부방에서 풀어 봐');
        busy = false;
        const msg = status.textContent;
        startNew();
        setStatus(msg, 'ok');
        renderList();
      } catch (e) {
        busy = false;
        setStatus('저장 못 했어요. 다시 눌러 주세요', 'error');
        refresh();
      }
    }

    async function takeDown(quiz) {
      if (!window.confirm(`「${quiz.question}」 문제를 내릴까요? 민서 화면에서 사라져요.`)) return;
      try {
        await FQ.hide(quiz);
        quizzes = quizzes.filter(q => q.id !== quiz.id);
        if (editing && editing.id === quiz.id) startNew();
        renderList();
      } catch (e) {
        setStatus('내리지 못했어요. 다시 해 주세요', 'error');
      }
    }

    function chipOf(quiz) {
      if (quiz.report) return { text: `🚩 이상해요: ${quiz.report}`, kind: 'report' };
      if (FQ.isNew(quiz)) return { text: '🆕 아직 안 풀었어요', kind: 'new' };
      return { text: STATUS_CHIPS[quiz.result] || '✅ 민서가 풀었어요', kind: 'done' };
    }

    function renderList() {
      list.replaceChildren();
      if (!quizzes.length) {
        list.appendChild(h('p', 'fq-empty', '아직 낸 문제가 없어요. 첫 문제를 내 볼까요?'));
        return;
      }
      const sorted = quizzes.slice().sort((a, b) => (b.report ? 1 : 0) - (a.report ? 1 : 0));
      sorted.forEach(quiz => {
        const item = h('article', 'fq-item');
        const chip = chipOf(quiz);
        const top = h('div', 'fq-item__top');
        top.append(h('span', `fq-chip fq-chip--${chip.kind}`, chip.text), h('span', 'fq-item__ver', `v${quiz.version}`));
        const q = h('p', 'fq-item__question', quiz.question);
        const ans = h('p', 'fq-item__answer', `정답: ${quiz.answer}`);
        const row = h('div', 'fq-item__buttons');
        row.append(button('fq-btn fq-btn--small', '🛠️ 고치기', () => startEdit(quiz)), button('fq-btn fq-btn--small fq-btn--ghost', '내리기', () => takeDown(quiz)));
        item.append(top, q, ans, row);
        list.appendChild(item);
      });
    }

    async function loadList() {
      list.replaceChildren(h('p', 'fq-loading', '내 문제를 불러오는 중…'));
      try {
        quizzes = await FQ.listByAuthor(AUTHOR);
        renderList();
      } catch (e) {
        list.replaceChildren(h('p', 'fq-empty', '목록을 못 불러왔어요.'), button('fq-btn fq-btn--small', '🔄 다시', () => loadList()));
      }
    }

    startNew();
    loadList();
  }

  window.FamilyQuizAuthor = Object.freeze({ mount });
})();
