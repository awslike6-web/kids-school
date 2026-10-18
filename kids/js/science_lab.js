// kids/js/science_lab.js
// 🧪 [3단계] 가상 실험실 (Virtual Lab) & 교재 DB 실시간 연동 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도, IIFE 캡슐화, 하위 호환성 100% 보존

(function() {
    'use strict';

    let cachedScienceCurriculum = null;
    let scienceCurriculumPromise = null;

    // =========================================================================
    // 🔬 노션 [공부방 교재·사료 마스터 DB] 과학 데이터 실시간 하이브리드 연동 엔진
    // =========================================================================
    async function fetchScienceCurriculumFromNotion() {
        if (cachedScienceCurriculum) return cachedScienceCurriculum;
        if (scienceCurriculumPromise) return scienceCurriculumPromise;

        const PROXY = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
        const DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CURRICULUM_DB_ID) ? APP_CONFIG.CURRICULUM_DB_ID : "3e8a27115b68806d94bfc81e9b3435fa";

        scienceCurriculumPromise = (async () => {
            try {
                const url = `${PROXY}/v1/databases/${DB_ID}/query`;
                let results = [];
                let hasMore = true;
                let cursor = null;

                while (hasMore) {
                    const payload = {
                        page_size: 100,
                        filter: { property: "과목", select: { equals: "과학" } }
                    };
                    if (cursor) payload.start_cursor = cursor;

                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error(`Notion Query Failed: HTTP ${res.status}`);
                    const data = await res.json();
                    results = results.concat(data.results || []);
                    hasMore = data.has_more || false;
                    cursor = data.next_cursor || null;
                }

                cachedScienceCurriculum = results.map(page => {
                    const p = page.properties || {};
                    const title = (p["제목"]?.title || []).map(x => x.plain_text).join('').trim() || '무제';
                    const grade = p["학년"]?.select?.name || '5-2';
                    const unit = (p["단원"]?.rich_text || []).map(x => x.plain_text).join('').trim() || '';
                    const zone = p["구역"]?.select?.name || '실험실';
                    const mediaUrl = p["미디어 URL"]?.url || '';
                    const interactiveUrl = p["인터랙티브 URL"]?.url || '';
                    const desc = (p["핵심 쓰임새/설명"]?.rich_text || []).map(x => x.plain_text).join('').trim();
                    const quiz = (p["퀴즈 질문"]?.rich_text || []).map(x => x.plain_text).join('').trim();
                    const choicesText = (p["보기 1~4"]?.rich_text || []).map(x => x.plain_text).join('').trim();
                    const choices = choicesText ? choicesText.split('\n').map(s => s.trim()).filter(Boolean) : [];
                    const ans = p["정답"]?.number ?? null;
                    const correctIdx = ans !== null ? Math.max(0, ans - 1) : null;
                    const explanation = (p["해설"]?.rich_text || []).map(x => x.plain_text).join('').trim();

                    return {
                        id: page.id,
                        title,
                        grade,
                        unit,
                        zone,
                        mediaUrl,
                        interactiveUrl,
                        desc,
                        quiz,
                        choices,
                        ans,
                        correctIdx,
                        explanation,
                        _fromNotion: true
                    };
                });

                console.log(`📡 노션 교재 DB에서 과학 데이터 총 ${cachedScienceCurriculum.length}건 실시간 로드 완료!`);
                applyNotionDataToScienceGlobals(cachedScienceCurriculum);
                return cachedScienceCurriculum;
            } catch (err) {
                console.warn("⚠️ 노션 교재 DB 쿼리 실패, 로컬 정적 데이터셋으로 안전 폴백합니다:", err);
                return null;
            }
        })();

        return scienceCurriculumPromise;
    }

    function applyNotionDataToScienceGlobals(items) {
        if (!items || !items.length) return;

        // 1) 안전 라이선스 (zone === '안전수칙')
        const safeItems = items.filter(x => x.zone === '안전수칙');
        if (safeItems.length > 0 && window.SCIENCE_SAFETY_LICENSE_DATA) {
            window.SCIENCE_SAFETY_LICENSE_DATA.questions = safeItems.map((it, idx) => {
                const catMatch = it.title.match(/\]\s*(.+)$/);
                const category = catMatch ? catMatch[1] : `안전 수칙 ${idx + 1}`;
                return {
                    id: idx + 1,
                    category,
                    question: it.quiz || it.title,
                    options: it.choices.length > 0 ? it.choices : ["보안경, 실험복 착용", "슬리퍼 착용"],
                    answer: it.correctIdx !== null ? it.correctIdx : 0,
                    explanation: it.explanation || it.desc,
                    img: it.mediaUrl || ""
                };
            });
        }

        // 2) 1~6단원 탐구보고서 요약노트 동적 병합 (그래프·실험실 링크·안전수칙 등 확장 속성 보존)
        const unitKeywords = { 1: ['1.', '1단원', '혼합물'], 2: ['2.', '2단원', '날씨'], 3: ['3.', '3단원', '열과'], 4: ['4.', '4단원'], 5: ['5.', '5단원'], 6: ['6.', '6단원'] };
        for (let u = 1; u <= 6; u++) {
            const globalKey = u === 1 ? 'SCIENCE_LAB_REPORT_DATA' : `SCIENCE_LAB_REPORT_${u}_DATA`;
            const targetData = window[globalKey];
            if (!targetData) continue;
            const kws = unitKeywords[u] || [`${u}.`, `${u}단원`];
            const repDocs = items.filter(x => x.zone === '탐구보고서' && kws.some(k => x.unit.includes(k)));
            if (repDocs.length > 0) {
                const baseDocs = targetData.summaryDoc || [];
                targetData.summaryDoc = repDocs.map((it, idx) => {
                    const base = baseDocs[idx] || {};
                    const pg = (it.desc || '').match(/\[『실험관찰』[^\]]+\]/)?.[0] || base.page || '『실험관찰』';
                    const proc = (it.desc || '').match(/\[탐구 과정\]\s*([\s\S]*?)(?=\[관찰 결과\]|$)/)?.[1]?.trim() || base.process || it.desc;
                    const res = (it.desc || '').match(/\[관찰 결과\]\s*([\s\S]*?)(?=\[결론\]|$)/)?.[1]?.trim() || base.result || '';
                    const conc = (it.desc || '').match(/\[결론\]\s*([\s\S]*?)(?=\[생각해 볼까요\?\]|$)/)?.[1]?.trim() || base.conclusion || '';
                    const thk = (it.desc || '').match(/\[생각해 볼까요\?\]\s*([\s\S]*?)$/)?.[1]?.trim() || base.think || '';
                    return Object.assign({}, base, {
                        title: base.title || it.title.replace(/^📝\s*\[[^\]]+\]\s*/, ''),
                        page: pg,
                        process: base.process || proc,
                        result: base.result || res,
                        conclusion: base.conclusion || conc,
                        think: base.think || thk
                    });
                });
            }
        }
    }

    // 🧪 실험 퀴즈 UI 렌더링
    function renderExperimentUI(container, currentItem, activeQuizIdx, totalCount, passageHtml) {
        const screenWrapper = document.createElement("div");
        screenWrapper.className = "quiz-card";
        
        const chartMediaHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)" title="확대">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)" title="축소">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="rotateCardImage()" title="시계방향 90도 회전">🔄 90° 회전</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()" title="원래대로">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')" title="새 창으로 띄워서 문제와 나란히 보기">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="과학 교과서 탐구 자료" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
                <div class="chart-zoom-guide">💡 마우스 드래그 이동 / 휠로 확대 / 더블클릭 토글 / 🔄 90° 회전 / 🪟 새창 열기</div>
            </div>
        ` : `
            <div style="text-align:center; margin-bottom:12px;">
                <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(78, 205, 196, 0.12); border:1.5px dashed var(--primary); border-radius:14px; padding:8px 18px; font-family:'Jua', sans-serif; color:#0d9488; font-size:1.05rem;">
                    <span>🧪 교과서 핵심 탐구 실험 분석</span>
                </div>
            </div>
        `;

        const choices = currentItem.choices || ["선택지 1", "선택지 2", "선택지 3", "선택지 4"];
        const correctIdx = currentItem.correctIdx !== undefined ? currentItem.correctIdx : 0;
        const quizQuestion = currentItem.quiz || `${currentItem.title}에서 알 수 있는 사실은 무엇일까요?`;

        screenWrapper.innerHTML = `
            ${passageHtml || ''}
            <div style="font-size: 0.95rem; opacity:0.7;">탐구 실험 ${activeQuizIdx + 1} / ${totalCount}</div>
            <h3 style="font-size: 1.35rem; margin-bottom: 8px;">${currentItem.title || "가상 실험실"}</h3>
            ${chartMediaHtml}
            <div class="quiz-descr" style="line-height:1.6; font-size:1.05rem;">${currentItem.desc || ""}</div>
            <p style="font-weight: bold; font-size:1.15rem; text-align: left; margin-top:14px;">❓ ${quizQuestion}</p>
            <div class="quiz-choices-container">
                ${choices.map((choice, i) => `
                     <button class="quiz-choice-btn" onclick="ScienceLab.verifyChoice(${i}, ${correctIdx})">${i+1}. ${choice}</button>
                `).join('')}
            </div>
            <div style="margin-top: 14px; display:flex; justify-content:center;">
                <button class="quiz-button" style="background:var(--accent);" onclick="skipToNextScienceQuiz()">건너뛰기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);

        if (currentItem.img && typeof initCardZoomListeners === 'function') {
            initCardZoomListeners();
        }

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS((currentItem.desc || "") + ". 퀴즈!" + quizQuestion);
        }
    }

    // 🌿 자연탐험 / 발명가 카드 렌더링
    function renderNatureInventorUI(container, currentItem, activeQuizIdx, totalCount, passageHtml) {
        const screenWrapper = document.createElement("div");
        screenWrapper.className = "quiz-card";
        const mediaHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="${currentItem.title || '탐구 자료'}" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
            </div>
        ` : '';

        screenWrapper.innerHTML = `
            ${passageHtml || ''}
            <div style="font-size: 0.95rem; opacity:0.7;">탐구 ${activeQuizIdx + 1} / ${totalCount}</div>
            <h3 style="font-size: 1.35rem; margin-bottom: 8px;">${currentItem.title || "과학 탐구"}</h3>
            ${mediaHtml}
            <div class="quiz-descr" style="line-height:1.6; font-size:1.05rem; margin-bottom:14px;">${currentItem.desc || ""}</div>
            <div style="display:flex; justify-content:center; gap:10px; margin-top:14px;">
                <button class="quiz-button" onclick="skipToNextScienceQuiz()">다음 탐구 보기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);

        if (currentItem.img && typeof initCardZoomListeners === 'function') {
            initCardZoomListeners();
        }

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS(currentItem.desc || currentItem.title);
        }
    }

    // 🎯 실험 객관식 정답 판정
    async function verifyExperimentChoice(choiceIdx, correctIdx) {
        const activeQuizIdx = window.activeQuizIdx || 0;
        const activeSectionData = window.activeSectionData || [];

        if (choiceIdx === correctIdx) {
            if (typeof playSoundEffect === 'function') playSoundEffect('correct');
            if (typeof speakFairyTTS === 'function') speakFairyTTS("정답이야! 아주 잘했어!");
            alert("🎉 정답입니다!");
            if (typeof rewardQuizCorrect === 'function') {
                await rewardQuizCorrect(activeQuizIdx);
            }
            if (typeof window.skipToNextScienceQuiz === 'function') {
                window.skipToNextScienceQuiz();
            }
        } else {
            if (typeof playSoundEffect === 'function') playSoundEffect('wrong');
            const currentItem = activeSectionData[activeQuizIdx] || {};
            if (!window.wrongNotes) window.wrongNotes = [];
            window.wrongNotes.push({ word: currentItem.title || '탐구 실험', wrongInput: `선택 ${choiceIdx + 1}` });
            if (typeof speakFairyTTS === 'function') speakFairyTTS("다시 한번 관찰해 봐!");
            alert("앗, 다시 한 번 생각해 볼까요? 교과서 사진을 확대해서 살펴보세요!");
        }
    }

    // 🌟 네임스페이스 공개
    window.ScienceLab = {
        fetchCurriculum: fetchScienceCurriculumFromNotion,
        applyNotionData: applyNotionDataToScienceGlobals,
        renderExperimentUI,
        renderNatureInventorUI,
        verifyChoice: verifyExperimentChoice
    };

    // 🌐 하위 호환성 전역 브리지
    window.fetchScienceCurriculumFromNotion = fetchScienceCurriculumFromNotion;
    window.applyNotionDataToScienceGlobals = applyNotionDataToScienceGlobals;
    window.verifyExperimentChoice = verifyExperimentChoice;

})();
