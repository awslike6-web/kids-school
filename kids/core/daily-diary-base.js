// kids/core/daily-diary-base.js - daily-diary.js 분리 1/4: KST 날짜·로컬 저장·음성 입력·모달·탭 (순서대로 로드)
// kids/core/daily-diary.js
// 📖 민민이네 하루 마음 일기장 (민서 1학년 감정놀이 / 민수 5학년 일상로그 / 하루 다회 타임라인 누적 엔진)
// 🕒 한국 시간(KST) 기준 YYYY-MM-DD (toISOString 슬라이싱은 오전 9시 전에 전날 날짜가 됨)
function getKstTodayYMD(date = new Date()) {
    const kst = new Date(date.getTime() + 9 * 3600000);
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}


// 1. 일기장 저장 및 조회 헬퍼
function getStoredDiaries() {
    try {
        const data = localStorage.getItem('mimi_daily_diaries');
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];

        // 🛡️ 로컬 오염 방어: '특별한 날', '작품', '상장' 등 일기가 아닌 항목 자동 정화(Self-healing)
        const cleaned = parsed.filter(item => {
            if (!item) return false;
            if (item.category === '특별한 날' || item.category === '작품' || item.category === '상장') return false;
            if (item.id && (String(item.id).startsWith('evt_') || String(item.id).startsWith('art_'))) return false;
            if (item.content && (item.content.includes('[특별한 날]') || item.content.includes('[작품]'))) return false;
            if (item.title && (item.title.includes('[특별한 날]') || item.title.includes('[작품]'))) return false;
            return true;
        });

        // 정화된 항목이 있으면 로컬스토리지 자동 최신화
        if (cleaned.length !== parsed.length) {
            console.log(`🧹 [일기장 정화] 일기가 아닌 항목 ${parsed.length - cleaned.length}건을 로컬 스토리지에서 자동 제거했습니다.`);
            localStorage.setItem('mimi_daily_diaries', JSON.stringify(cleaned));
        }

        return cleaned;
    } catch (e) {
        return [];
    }
}

function saveDiaryEntry(entry) {
    const list = getStoredDiaries();
    // 고유 ID 및 시간대 필드 보장
    if (!entry.id) {
        entry.id = 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    }
    if (!entry.timeStr) {
        entry.timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    // 타임라인 최신순으로 맨 앞에 누적 추가 (하루 다회 작성 지원)
    list.unshift(entry);
    localStorage.setItem('mimi_daily_diaries', JSON.stringify(list));

    // 로비 화면 버튼 문구 실시간 갱신
    updateLobbyDiaryButton(entry.childName);
}

// 1-1. 현재 대상 학생 및 부모 모드 판별 헬퍼
function getCurrentDiaryTarget() {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const currentProfile = localStorage.getItem('currentUser') || 'son';
    const savedName = localStorage.getItem('currentUserName') || '';

    let isMinsu = true;
    if (userParam === 'daughter' || userParam === 'minseo') {
        isMinsu = false;
    } else if (userParam === 'son' || userParam === 'minsu') {
        isMinsu = true;
    } else if (currentProfile === 'daughter') {
        isMinsu = false;
    } else if (savedName === '민서') {
        isMinsu = false;
    }
    const childName = isMinsu ? '민수' : '민서';
    const isParentMode = (savedName === '아빠' || savedName === '엄마' || savedName === '어른' || savedName === 'admin' || currentProfile === 'admin');

    return { childName, isMinsu, isParentMode, savedName };
}

// 1-2. 삭제된 일기 ID 영구 추적 (재동기화 시 부활 방지)
function getDeletedDiaryIds() {
    try {
        const d = localStorage.getItem('mimi_deleted_diary_ids');
        return d ? JSON.parse(d) : [];
    } catch (e) {
        return [];
    }
}

function markDiaryAsDeleted(id) {
    if (!id) return;
    const deleted = getDeletedDiaryIds();
    if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('mimi_deleted_diary_ids', JSON.stringify(deleted.slice(-100)));
    }
}

function bindNotionPageIdToEntry(localId, notionPageId) {
    const list = getStoredDiaries();
    const target = list.find(item => item.id === localId);
    if (target) {
        target.notionPageId = notionPageId;
        target.isNotionSynced = true;
        localStorage.setItem('mimi_daily_diaries', JSON.stringify(list));
    }
}

async function archiveNotionPageDirect(pageId) {
    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    try {
        const resp = await fetch(`${proxyUrl}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({ archived: true })
        });
        if (resp.ok) {
            console.log(`🗑️ [노션 원격 삭제] 페이지 ${pageId} 아카이브 완료`);
            return true;
        }
    } catch (e) {
        console.warn("노션 페이지 아카이브 통신 오류:", e);
    }
    return false;
}

async function deleteDiaryEntry(id) {
    if (!confirm("이 일기를 정말 삭제할까요? 🗑️\n(노션 클라우드에서도 함께 삭제됩니다)")) return;
    
    const list = getStoredDiaries();
    const target = list.find(item => item.id === id || item.notionPageId === id);

    // 삭제된 ID 블랙리스트 등록 (재동기화 시 부활 방지)
    markDiaryAsDeleted(id);
    if (target && target.notionPageId) {
        markDiaryAsDeleted(target.notionPageId);
    }

    // 로컬 스토리지 삭제
    const updated = list.filter(item => item.id !== id && item.notionPageId !== id);
    localStorage.setItem('mimi_daily_diaries', JSON.stringify(updated));

    const { childName, isMinsu } = getCurrentDiaryTarget();

    // 지난 일기 히스토리 뷰 실시간 새로고침
    const histSec = document.getElementById('diaryHistorySection');
    if (histSec) {
        histSec.innerHTML = renderDiaryHistoryList(childName, isMinsu);
    }

    // 로비 화면 버튼 문구 실시간 갱신
    updateLobbyDiaryButton(childName);

    // 노션 원격 아카이브 (삭제) 실행
    const notionId = target?.notionPageId || (id && id.length > 20 ? id : null);
    if (notionId) {
        archiveNotionPageDirect(notionId);
    }
}

function getTodayDiaryCount(childName) {
    const todayStr = getKstTodayYMD();
    const list = getStoredDiaries();
    return list.filter(item => item.date === todayStr && item.childName === childName).length;
}

function updateLobbyDiaryButton(childName) {
    const diaryBtn = document.getElementById('lobbyDiaryBtn');
    if (!diaryBtn) return;
    const { isParentMode, childName: targetChild } = getCurrentDiaryTarget();
    const finalChild = childName || targetChild;
    const count = getTodayDiaryCount(finalChild);
    
    if (isParentMode) {
        if (count > 0) {
            diaryBtn.innerHTML = `📝 [부모검수] ${finalChild} 일기 (오늘 ${count}편 기록됨)`;
        } else {
            diaryBtn.innerHTML = `📝 [부모검수] ${finalChild} 마음 일기 쓰기 (기록용)`;
        }
    } else {
        const rewardBadge = finalChild === '민서' ? ' (+5🍬)' : ' (+5💎)';
        if (count > 0) {
            diaryBtn.innerHTML = `📝 ${finalChild}의 새 일기 쓰기 (오늘 ${count}편 기록됨 🌟)`;
        } else {
            diaryBtn.innerHTML = `📝 ${finalChild}의 오늘 마음 일기 쓰기${rewardBadge}`;
        }
    }
}

// 2. 음성 인식 (STT) 헬퍼
let diarySpeechRecog = null;
let diaryCurrentActiveBtn = null;

function startDiaryVoiceInput(targetInputId, btnElement) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("이 브라우저는 음성 입력을 지원하지 않아요. 크롬(Chrome) 브라우저를 이용하거나 직접 글을 써주세요! ✏️");
        return;
    }

    // 이미 녹음 중인 상태에서 버튼을 다시 눌렀다면 중지 (토글 기능)
    if (diarySpeechRecog && diarySpeechRecog._isListening) {
        diarySpeechRecog.stop();
        return;
    }

    // 이전 세션 정리
    if (diarySpeechRecog) {
        try { diarySpeechRecog.abort(); } catch (e) {}
        diarySpeechRecog = null;
    }

    const targetInput = document.getElementById(targetInputId);
    if (!targetInput) return;

    // 녹음 시작 전 기존 텍스트 및 시작점 보존
    const initialText = targetInput.value ? targetInput.value.trim() : '';
    const prefix = initialText ? initialText + ' ' : '';

    try {
        diarySpeechRecog = new SpeechRecognition();
        diarySpeechRecog.lang = 'ko-KR';
        diarySpeechRecog.interimResults = true; // 실시간 변환 지원
        diarySpeechRecog.continuous = false;   // 문장이 끝나면 자동 완료
        diarySpeechRecog.maxAlternatives = 1;
        diarySpeechRecog._isListening = false;

        diaryCurrentActiveBtn = btnElement;
        if (btnElement) {
            btnElement.innerHTML = '🔴 듣는 중... (한 번 더 누르면 멈춤)';
            btnElement.style.background = '#ef4444';
            btnElement.style.color = '#ffffff';
            btnElement.style.borderColor = '#dc2626';
        }

        diarySpeechRecog.onstart = () => {
            if (diarySpeechRecog) diarySpeechRecog._isListening = true;
        };

        let finalTranscriptAccum = '';

        diarySpeechRecog.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscriptAccum += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            const currentVoiceResult = (finalTranscriptAccum + ' ' + interimTranscript).trim();
            if (currentVoiceResult) {
                targetInput.value = prefix + currentVoiceResult;
            }
        };

        diarySpeechRecog.onerror = (e) => {
            console.warn('음성 인식 오류:', e);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                alert('🎙️ 마이크 권한이 차단되어 있어 음성을 들을 수 없어요!\n\n브라우저 주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 눌러 "마이크 허용"으로 변경해주세요.');
            } else if (e.error === 'network') {
                alert('음성 인식 네트워크 연결 상태를 확인해주세요.');
            }
            resetVoiceBtn(btnElement);
        };

        diarySpeechRecog.onend = () => {
            if (diarySpeechRecog) diarySpeechRecog._isListening = false;
            resetVoiceBtn(btnElement);
            diarySpeechRecog = null;
            diaryCurrentActiveBtn = null;
        };

        diarySpeechRecog.start();
    } catch (startErr) {
        console.error("음성 인식 시작 실패:", startErr);
        alert('음성 입력을 시작하지 못했습니다. 마이크 연결 또는 브라우저 권한을 확인해주세요.');
        resetVoiceBtn(btnElement);
        diarySpeechRecog = null;
    }
}

function resetVoiceBtn(btnElement) {
    const el = btnElement || diaryCurrentActiveBtn;
    if (!el) return;
    el.innerHTML = '🎙️ 말로 하기';
    el.style.background = '';
    el.style.color = '';
    el.style.borderColor = '';
}

function insertQuickTag(targetInputId, text) {
    const target = document.getElementById(targetInputId);
    if (!target) return;
    target.value = text;
    target.focus();
}

// 3. 일기장 모달 열기
function openDailyDiaryModal(initialTab = 'write') {
    const { childName, isMinsu, isParentMode } = getCurrentDiaryTarget();

    // 기존 모달 제거
    const existing = document.getElementById('dailyDiaryModalWrapper');
    if (existing) existing.remove();

    const today = new Date();
    const dateFormatted = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const todayYMD = getKstTodayYMD(today);
    const todayCount = getTodayDiaryCount(childName);

    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'dailyDiaryModalWrapper';
    modalWrapper.style.cssText = `
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
        display: flex; justify-content: center; align-items: center; padding: 14px;
        animation: diaryFadeIn 0.3s ease;
    `;

    modalWrapper.innerHTML = `
        <style>
            @keyframes diaryFadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @keyframes stampDrop { 0% { opacity: 0; transform: scale(3) rotate(-25deg); } 60% { opacity: 1; transform: scale(0.9) rotate(8deg); } 100% { transform: scale(1) rotate(-8deg); } }
            
            .diary-box {
                background: ${isMinsu ? '#1e1b4b' : '#fff5f7'};
                color: ${isMinsu ? '#f8fafc' : '#4a384f'};
                border: 3px solid ${isMinsu ? '#6366f1' : '#ff6b9d'};
                border-radius: 28px; width: 100%; max-width: 680px; max-height: 90vh;
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 25px 60px rgba(0,0,0,0.6);
            }
            .diary-header {
                padding: 16px 20px; background: ${isMinsu ? 'linear-gradient(135deg, #312e81, #1e1b4b)' : 'linear-gradient(135deg, #ffe4e6, #fff1f2)'};
                border-bottom: 2px solid ${isMinsu ? '#4338ca' : '#fecdd3'};
                display: flex; justify-content: space-between; align-items: center;
            }
            .diary-tabs {
                display: flex; gap: 8px;
            }
            .diary-tab-btn {
                padding: 6px 14px; border-radius: 12px; border: 1.5px solid; font-family: 'Jua', sans-serif;
                font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
            }
            .diary-tab-btn.active {
                background: ${isMinsu ? '#6366f1' : '#ff6b9d'}; color: #fff; border-color: ${isMinsu ? '#818cf8' : '#ff85a2'};
            }
            .diary-tab-btn:not(.active) {
                background: transparent; color: ${isMinsu ? '#94a3b8' : '#8d6e63'}; border-color: ${isMinsu ? '#475569' : '#e2e8f0'};
            }
            .diary-body {
                padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px;
            }
            .diary-sec-title {
                font-family: 'Jua', sans-serif; font-size: 1.15rem; margin-bottom: 8px;
                color: ${isMinsu ? '#818cf8' : '#e11d48'}; display: flex; align-items: center; gap: 6px;
            }
            .weather-grid, .energy-grid {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px;
            }
            .choice-card {
                padding: 10px 8px; border-radius: 16px; border: 2px solid ${isMinsu ? '#4338ca' : '#ffd1dc'};
                background: ${isMinsu ? '#2e2a72' : '#ffffff'}; cursor: pointer; text-align: center;
                transition: all 0.2s; font-family: 'Nanum Gothic', sans-serif;
            }
            .choice-card:hover { transform: translateY(-2px); }
            .choice-card.selected {
                border-color: ${isMinsu ? '#38bdf8' : '#ff4081'};
                background: ${isMinsu ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #ffe4e6, #fecdd3)'};
                box-shadow: 0 4px 12px ${isMinsu ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 64, 129, 0.3)'};
            }
            .balloon-tags {
                display: flex; flex-wrap: wrap; gap: 8px;
            }
            .balloon-tag {
                padding: 6px 14px; border-radius: 20px; border: 1.5px solid ${isMinsu ? '#4f46e5' : '#ffccd5'};
                background: ${isMinsu ? '#2e2a72' : '#ffffff'}; cursor: pointer; font-family: 'Jua', sans-serif;
                font-size: 0.95rem; transition: all 0.2s;
            }
            .balloon-tag.selected {
                background: ${isMinsu ? '#6366f1' : '#ff4081'}; color: #fff;
                border-color: ${isMinsu ? '#818cf8' : '#ff4081'};
            }
            .diary-input {
                width: 100%; padding: 12px 14px; border-radius: 16px; border: 2px solid ${isMinsu ? '#4338ca' : '#ffd1dc'};
                background: ${isMinsu ? '#1e1b4b' : '#ffffff'}; color: inherit; font-size: 1rem;
                font-family: 'Nanum Gothic', sans-serif; outline: none; transition: border-color 0.2s;
            }
            .diary-input:focus { border-color: ${isMinsu ? '#818cf8' : '#ff6b9d'}; }
            .btn-voice {
                display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 12px;
                border: none; font-family: 'Jua', sans-serif; font-size: 0.88rem; cursor: pointer;
                background: #e0e7ff; color: #4338ca; transition: all 0.2s;
            }
            .quick-tag-btn {
                padding: 4px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);
                background: rgba(99,102,241,0.25); color: #cbd5e1; font-size: 0.82rem; cursor: pointer;
                transition: all 0.2s;
            }
            .quick-tag-btn:hover { background: #6366f1; color: #fff; }
            .btn-submit-diary {
                width: 100%; padding: 14px; border-radius: 20px; border: none; font-family: 'Jua', sans-serif;
                font-size: 1.25rem; color: #fff; cursor: pointer; transition: all 0.25s;
                background: ${isMinsu ? 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' : 'linear-gradient(135deg, #ff6b9d 0%, #e11d48 100%)'};
                box-shadow: 0 6px 20px ${isMinsu ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 107, 157, 0.4)'};
                display: flex; justify-content: center; align-items: center; gap: 8px;
            }
            .btn-submit-diary:hover { transform: translateY(-2px); }
            
            /* 스탬프 애니메이션 박스 */
            .stamp-badge {
                display: inline-block; padding: 8px 16px; border-radius: 12px; border: 3px dashed #e11d48;
                color: #e11d48; font-family: 'Jua', sans-serif; font-size: 1.4rem; font-weight: bold;
                animation: stampDrop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                box-shadow: 0 4px 15px rgba(225, 29, 72, 0.2);
            }
        </style>

        <div class="diary-box">
            <div class="diary-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.6rem;">${isMinsu ? '🎮' : '🐰'}</span>
                    <div>
                        <h3 style="font-family: 'Jua', sans-serif; font-size: 1.2rem; color:${isMinsu ? '#818cf8' : '#e11d48'};">
                            ${isParentMode ? '<span style="font-size:0.8rem; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid #f87171; padding:2px 8px; border-radius:8px; margin-right:4px;">🛠️ 부모검수</span>' : ''}
                            ${isMinsu ? '민수의 하루 일상 & 마음 로그' : '민서의 마음 날씨 일기장'}
                        </h3>
                        <span style="font-size: 0.85rem; opacity: 0.8;">📅 ${dateFormatted} ${todayCount > 0 ? `(오늘 ${todayCount}편 작성됨)` : ''}</span>
                    </div>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="diary-tabs">
                        <button id="tabDiaryWrite" class="diary-tab-btn ${initialTab === 'write' ? 'active' : ''}" onclick="switchDiaryTab('write')">✏️ 일기 쓰기</button>
                        <button id="tabDiaryHistory" class="diary-tab-btn ${initialTab === 'history' ? 'active' : ''}" onclick="switchDiaryTab('history')">📚 지난 일기</button>
                    </div>
                    <button onclick="closeDailyDiaryModal()" style="background:transparent; border:none; color:inherit; font-size:1.4rem; cursor:pointer; padding:4px 8px;">✕</button>
                </div>
            </div>

            <!-- 1. 일기 작성 폼 -->
            <div class="diary-body" id="diaryWriteSection" style="display: ${initialTab === 'write' ? 'flex' : 'none'};">
                ${isMinsu ? renderMinsuDiaryForm(todayYMD) : renderMinseoDiaryForm(todayYMD)}
            </div>

            <!-- 2. 지난 일기 히스토리 뷰 -->
            <div class="diary-body" id="diaryHistorySection" style="display: ${initialTab === 'history' ? 'flex' : 'none'};">
                ${renderDiaryHistoryList(childName, isMinsu)}
            </div>
        </div>
    `;

    document.body.appendChild(modalWrapper);

    // 백그라운드 노션 클라우드 실시간 동기화 트리거
    syncDiariesFromNotion(childName);
}

function closeDailyDiaryModal() {
    const modal = document.getElementById('dailyDiaryModalWrapper');
    if (modal) modal.remove();
}

function switchDiaryTab(tab) {
    const writeSec = document.getElementById('diaryWriteSection');
    const histSec = document.getElementById('diaryHistorySection');
    const tabWrite = document.getElementById('tabDiaryWrite');
    const tabHist = document.getElementById('tabDiaryHistory');

    if (tab === 'write') {
        writeSec.style.display = 'flex';
        histSec.style.display = 'none';
        tabWrite.classList.add('active');
        tabHist.classList.remove('active');
    } else {
        const { childName, isMinsu } = getCurrentDiaryTarget();
        histSec.innerHTML = renderDiaryHistoryList(childName, isMinsu);
        writeSec.style.display = 'none';
        histSec.style.display = 'flex';
        tabWrite.classList.remove('active');
        tabHist.classList.add('active');
        // 지난 일기 탭 진입 시 실시간 노션 동기화
        syncDiariesFromNotion(childName);
    }
}

