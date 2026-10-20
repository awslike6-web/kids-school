// kids/js/korean_mini_reading.js
// 🌱 [4단계] 민서(초1) 미니 독해 전담 엔진 (window.KoreanMiniReading)
// - 3~4문장 초단편 지문 + 성우 TTS 자동 읽기 → 고정 3단계 꼬리문제
//   (1 낱말·겹받침 → 2 인물의 생각 → 3 글쓴이의 중심 생각)
// - 데이터: 노션 LIBRARY_DB `트랙 = 🌱 민서 미니 독해` (지문전문 + 문제데이터 JSON의 step·speaker)
//   등록: scripts/register_minseo_korean.py (시드 scripts/data/minseo_korean_*.json)
// - 에러리스: 오답 경고음·감점 없이 정답 보기를 노랗게 비추고 해설 + fairyEncourage
// - 민수용 정밀 독해(kids/core/reading_engine.js)와 데이터·화면을 공유하지 않는 병렬 모듈

(function() {
    'use strict';

    const MINI_TRACK = '🌱 민서 미니 독해';
    const STEP_INFO = {
        1: { icon: '🔤', label: '낱말 살피기' },
        2: { icon: '💭', label: '인물의 생각' },
        3: { icon: '🌟', label: '글쓴이의 생각' }
    };

    let containerEl = null;
    let passages = [];
    let passage = null;
    let qIdx = 0;
    let answered = false;     // 지금 문제를 끝냈는지 (다음 버튼 대기)
    let missed = [];          // 첫 시도에 틀린 문제 (학습일지 오답 보고)
    let triedWrong = false;   // 지금 문제에서 한 번이라도 틀렸는지
    let finished = false;

    const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const speak = text => { if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text); };
    const stop = () => { if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS(); };

    // 화면을 바꿀 때마다 오버레이 스크롤을 맨 위로 (다음 카드의 단계 배지·말풍선이 가려지지 않게)
    function paint(html) {
        containerEl.innerHTML = html;
        containerEl.scrollTop = 0;
    }

    function isMiniPassage(p) {
        const qs = p && Array.isArray(p.questions) ? p.questions : [];
        return !!p.fullText && qs.length > 0 && qs.every(q => Array.isArray(q.options) && q.options.length >= 2);
    }

    function answerIndex(q) {
        if (typeof q.answer === 'number') return q.answer;
        const i = q.options.findIndex(o => String(o).trim() === String(q.answer ?? '').trim());
        return i >= 0 ? i : 0;
    }

    // ---------- 1. 서가 (단원별 지문 카드) ----------
    async function renderLobby(container) {
        containerEl = container || containerEl;
        if (!containerEl) return;
        stop();
        passage = null;
        finished = false;
        paint(`<div class="spinner-wrapper"><div class="spinner-circle"></div>
            <p class="mr-loading">🧚‍♀️ 코코 요정이 짧은 이야기를 챙겨 오고 있어요...</p></div>`);

        let list = [];
        if (typeof window.fetchReadingPassagesFromNotion === 'function') {
            try {
                list = await window.fetchReadingPassagesFromNotion({ subject: '국어', track: MINI_TRACK, student: '민서', pageSize: 100 });
            } catch (e) {
                console.warn('[KoreanMiniReading] 지문 조회 실패:', e);
            }
        }
        passages = (list || []).filter(isMiniPassage)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title), 'ko'));

        if (passages.length === 0) {
            paint(`<div class="mr-empty">
                <div style="font-size:2.6rem;">📭</div>
                <p>아직 준비된 이야기가 없어요.</p>
                <small>부모님: 노션 독해 DB에 트랙 '${esc(MINI_TRACK)}' 지문을 등록하면 바로 나타나요.</small></div>`);
            return;
        }

        const groups = new Map();
        passages.forEach(p => {
            const key = (p.unit || '이야기 모음').trim();
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(p);
        });
        paint(`<div class="mr-wrap">
            <p class="mr-intro">짧은 이야기를 듣고, 문제 3개를 풀어 봐요! 🌱</p>
            ${[...groups].map(([unit, items]) => `
                <section class="mr-unit">
                    <h3 class="mr-unit-title">📒 ${esc(unit)}</h3>
                    ${items.map(p => `
                        <button type="button" class="mr-card" data-id="${esc(p.id)}">
                            <span class="mr-card-title">📖 ${esc(p.title)}</span>
                            <span class="mr-card-sub">${esc(p.summary || '')}</span>
                        </button>`).join('')}
                </section>`).join('')}
        </div>`);
        containerEl.querySelectorAll('.mr-card').forEach(btn => {
            btn.onclick = () => start(btn.getAttribute('data-id'));
        });
    }

    // ---------- 2. 지문 읽기 (진입 시 TTS 자동 읽기, 문장 터치 시 그 문장만 다시 듣기) ----------
    function start(id) {
        passage = passages.find(p => String(p.id) === String(id));
        if (!passage) return;
        qIdx = 0;
        missed = [];
        finished = false;
        renderReader();
    }

    function renderReader() {
        const lines = passage.fullText.split(/\n+/).map(s => s.trim()).filter(Boolean);
        paint(`<div class="mr-wrap">
            <div class="mr-reader">
                <h3 class="mr-title">📖 ${esc(passage.title)}</h3>
                ${lines.map((line, i) => `<p class="mr-line" data-i="${i}">${esc(line)}</p>`).join('')}
                <p class="mr-tip">👆 문장을 누르면 그 문장만 다시 읽어 줘요</p>
            </div>
            <div class="mr-actions">
                <button type="button" class="mr-btn mr-btn-sub" id="mrListen">🔊 처음부터 듣기</button>
                <button type="button" class="mr-btn mr-btn-main" id="mrGo">다 읽었어요! 문제 풀기 ➔</button>
            </div>
            <button type="button" class="mr-link" id="mrBack">← 다른 이야기 고르기</button>
        </div>`);
        containerEl.querySelectorAll('.mr-line').forEach(el => {
            el.onclick = () => speak(lines[Number(el.getAttribute('data-i'))]);
        });
        containerEl.querySelector('#mrListen').onclick = () => speak(lines.join(' '));
        containerEl.querySelector('#mrGo').onclick = () => { stop(); renderQuestion(); };
        containerEl.querySelector('#mrBack').onclick = () => renderLobby();
        speak(`${passage.title}. ${lines.join(' ')}`);
    }

    // ---------- 3. 3단계 꼬리문제 카드 ----------
    function renderQuestion() {
        const qs = passage.questions;
        if (qIdx >= qs.length) return renderDone();
        const q = qs[qIdx];
        const step = STEP_INFO[q.step] || STEP_INFO[Math.min(qIdx + 1, 3)];
        answered = false;
        triedWrong = false;

        const speaker = q.speaker && q.speaker.line ? `
            <div class="mr-speaker">
                <span class="mr-speaker-icon">${esc(q.speaker.icon || '🙂')}</span>
                <div class="mr-bubble"><b>${esc(q.speaker.name || '')}</b><span>“${esc(q.speaker.line)}”</span></div>
            </div>` : '';

        paint(`<div class="mr-wrap">
            <div class="mr-progress">${qs.map((_, i) => `<span class="mr-dot ${i < qIdx ? 'done' : i === qIdx ? 'now' : ''}"></span>`).join('')}</div>
            <div class="mr-qcard">
                <span class="mr-step">${step.icon} ${qIdx + 1}단계 · ${step.label}</span>
                ${speaker}
                <p class="mr-question">${esc(q.question)}</p>
                <button type="button" class="mr-link" id="mrSayQ">🔊 문제 다시 듣기</button>
                <div class="mr-options">
                    ${q.options.map((o, i) => `<button type="button" class="mr-opt" data-i="${i}">${esc(o)}</button>`).join('')}
                </div>
                <div class="mr-explain" id="mrExplain" hidden></div>
            </div>
            <div class="mr-actions">
                <button type="button" class="mr-btn mr-btn-sub" id="mrReread">📖 이야기 다시 보기</button>
                <button type="button" class="mr-btn mr-btn-main" id="mrNext" hidden>다음 ➔</button>
            </div>
        </div>`);

        const sayQuestion = () => speak(`${q.speaker && q.speaker.line ? `${q.speaker.name || ''}의 말. ${q.speaker.line}. ` : ''}${q.question} ${q.options.map((o, i) => `${i + 1}번, ${o}.`).join(' ')}`);
        containerEl.querySelector('#mrSayQ').onclick = sayQuestion;
        containerEl.querySelector('#mrReread').onclick = () => { stop(); renderPeek(); };
        containerEl.querySelector('#mrNext').onclick = () => { stop(); qIdx++; renderQuestion(); };
        containerEl.querySelectorAll('.mr-opt').forEach(btn => {
            btn.onclick = () => choose(Number(btn.getAttribute('data-i')));
        });
        sayQuestion();
    }

    function choose(i) {
        if (answered) return;
        const q = passage.questions[qIdx];
        const correct = answerIndex(q);
        const btns = containerEl.querySelectorAll('.mr-opt');
        const explain = containerEl.querySelector('#mrExplain');
        stop();

        if (i === correct) {
            answered = true;
            btns[i].classList.add('correct');
            btns.forEach((b, k) => { if (k !== i) b.classList.add('dim'); });
            explain.innerHTML = `🎉 정답이에요! ${esc(q.explanation || '')}`;
            explain.hidden = false;
            containerEl.querySelector('#mrNext').hidden = false;
            containerEl.querySelector('#mrNext').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (!triedWrong && typeof window.triggerAwardDispense === 'function') window.triggerAwardDispense(1, 'mini_reading');
            if (typeof window.fairyPraise === 'function') window.fairyPraise();
            return;
        }

        // 에러리스: 고른 보기는 흐리게, 정답은 노랗게 비추고 해설 (경고음·감점 없음)
        if (!triedWrong) missed.push(q.question);
        triedWrong = true;
        btns[i].classList.add('dim');
        btns[correct].classList.add('guide');
        explain.innerHTML = `💡 ${esc(q.explanation || '노랗게 빛나는 답을 눌러 볼까요?')}`;
        explain.hidden = false;
        explain.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (typeof window.fairyEncourage === 'function') window.fairyEncourage();
    }

    // 문제 풀다가 이야기 다시 보기 (진도 유지)
    function renderPeek() {
        const lines = passage.fullText.split(/\n+/).map(s => s.trim()).filter(Boolean);
        paint(`<div class="mr-wrap">
            <div class="mr-reader">
                <h3 class="mr-title">📖 ${esc(passage.title)}</h3>
                ${lines.map((line, i) => `<p class="mr-line" data-i="${i}">${esc(line)}</p>`).join('')}
            </div>
            <div class="mr-actions"><button type="button" class="mr-btn mr-btn-main" id="mrBackQ">문제로 돌아가기 ➔</button></div>
        </div>`);
        containerEl.querySelectorAll('.mr-line').forEach(el => {
            el.onclick = () => speak(lines[Number(el.getAttribute('data-i'))]);
        });
        containerEl.querySelector('#mrBackQ').onclick = () => { stop(); renderQuestion(); };
    }

    // ---------- 4. 완주 (보상 + 학습일지) ----------
    async function renderDone() {
        finished = true;
        const total = passage.questions.length;
        const stars = '⭐'.repeat(total - missed.length) + '☆'.repeat(missed.length);
        paint(`<div class="mr-wrap mr-done">
            <div style="font-size:3.2rem;">🎉</div>
            <h3>「${esc(passage.title)}」 다 풀었어요!</h3>
            <p class="mr-stars">${stars}</p>
            <p>이야기를 듣고 끝까지 생각했어요. 정말 멋져요!</p>
            <div class="mr-actions">
                <button type="button" class="mr-btn mr-btn-main" id="mrMore">🌱 다른 이야기 읽기</button>
            </div>
        </div>`);
        containerEl.querySelector('#mrMore').onclick = () => renderLobby();
        if (typeof window.fairyReward === 'function') window.fairyReward();
        if (typeof window.triggerAwardDispense === 'function') window.triggerAwardDispense(3, 'mini_reading_clear');
        if (typeof window.sendStudyLogToNotion === 'function') {
            try {
                await window.sendStudyLogToNotion({
                    childName: '민서',
                    subject: `국어(미니독해_${passage.title})`,
                    errorReport: missed.length ? missed.join(' / ') : '오답 없음'
                });
            } catch (e) {
                console.warn('[KoreanMiniReading] 학습일지 전송 실패:', e);
            }
        }
    }

    // 문제를 1개 이상 풀었고 아직 완주 전이면 '진행 중' (국어방 이탈 방지 가드용)
    function isMissionInProgress() {
        return !!passage && !finished && qIdx > 0;
    }

    window.KoreanMiniReading = {
        MINI_TRACK,
        renderLobby,
        start,
        isMissionInProgress,
        stop
    };
})();
