// kids/core/daily-diary.js
// 📖 민민이네 하루 마음 일기장 (민서 1학년 감정놀이 / 민수 5학년 일상로그 / 하루 다회 타임라인 누적 엔진)

// 1. 일기장 저장 및 조회 헬퍼
function getStoredDiaries() {
    try {
        const data = localStorage.getItem('mimi_daily_diaries');
        return data ? JSON.parse(data) : [];
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

function deleteDiaryEntry(id) {
    if (!confirm("이 일기를 정말 삭제할까요? 🗑️")) return;
    
    const list = getStoredDiaries().filter(item => item.id !== id);
    localStorage.setItem('mimi_daily_diaries', JSON.stringify(list));

    const currentProfile = localStorage.getItem('currentUser') || 'son';
    const childName = currentProfile === 'son' ? '민수' : '민서';
    const isMinsu = (currentProfile === 'son');

    // 지난 일기 히스토리 뷰 실시간 새로고침
    const histSec = document.getElementById('diaryHistorySection');
    if (histSec) {
        histSec.innerHTML = renderDiaryHistoryList(childName, isMinsu);
    }

    // 로비 화면 버튼 문구 실시간 갱신
    updateLobbyDiaryButton(childName);
}

function getTodayDiaryCount(childName) {
    const todayStr = new Date().toISOString().split('T')[0];
    const list = getStoredDiaries();
    return list.filter(item => item.date === todayStr && item.childName === childName).length;
}

function updateLobbyDiaryButton(childName) {
    const diaryBtn = document.getElementById('lobbyDiaryBtn');
    if (!diaryBtn) return;
    const count = getTodayDiaryCount(childName);
    if (count > 0) {
        diaryBtn.innerHTML = `📝 ${childName}의 새 일기 쓰기 (오늘 ${count}편 기록됨 🌟)`;
    } else {
        diaryBtn.innerHTML = `📝 ${childName}의 오늘 마음 일기 쓰기 (+5💎)`;
    }
}

// 2. 음성 인식 (STT) 헬퍼
let diarySpeechRecog = null;
function startDiaryVoiceInput(targetInputId, btnElement) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("이 브라우저는 음성 입력을 지원하지 않아요. 직접 글을 써주세요! ✏️");
        return;
    }

    if (diarySpeechRecog) {
        diarySpeechRecog.abort();
        diarySpeechRecog = null;
    }

    diarySpeechRecog = new SpeechRecognition();
    diarySpeechRecog.lang = 'ko-KR';
    diarySpeechRecog.interimResults = false;
    diarySpeechRecog.maxAlternatives = 1;

    btnElement.innerHTML = '🔴 듣고 있어요... (말씀하세요!)';
    btnElement.style.background = '#ef4444';
    btnElement.style.color = '#ffffff';

    diarySpeechRecog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const targetInput = document.getElementById(targetInputId);
        if (targetInput) {
            targetInput.value = targetInput.value ? (targetInput.value + ' ' + transcript) : transcript;
        }
    };

    diarySpeechRecog.onerror = (e) => {
        console.warn('음성 인식 오류:', e);
        resetVoiceBtn(btnElement);
    };

    diarySpeechRecog.onend = () => {
        resetVoiceBtn(btnElement);
    };

    diarySpeechRecog.start();
}

function resetVoiceBtn(btnElement) {
    btnElement.innerHTML = '🎙️ 말로 하기 (음성 입력)';
    btnElement.style.background = '#e0e7ff';
    btnElement.style.color = '#4338ca';
}

function insertQuickTag(targetInputId, text) {
    const target = document.getElementById(targetInputId);
    if (!target) return;
    target.value = text;
    target.focus();
}

// 3. 일기장 모달 열기
function openDailyDiaryModal(initialTab = 'write') {
    const currentProfile = localStorage.getItem('currentUser') || 'son';
    const childName = currentProfile === 'son' ? '민수' : '민서';
    const isMinsu = (currentProfile === 'son');

    // 기존 모달 제거
    const existing = document.getElementById('dailyDiaryModalWrapper');
    if (existing) existing.remove();

    const today = new Date();
    const dateFormatted = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const todayYMD = today.toISOString().split('T')[0];
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
        const currentProfile = localStorage.getItem('currentUser') || 'son';
        const childName = currentProfile === 'son' ? '민수' : '민서';
        const isMinsu = (currentProfile === 'son');
        histSec.innerHTML = renderDiaryHistoryList(childName, isMinsu);
        writeSec.style.display = 'none';
        histSec.style.display = 'flex';
        tabWrite.classList.remove('active');
        tabHist.classList.add('active');
    }
}

// 🐰 민서 (1학년) 일기 폼 렌더러
function renderMinseoDiaryForm(todayYMD) {
    return `
        <!-- 1. 마음 날씨 -->
        <div>
            <div class="diary-sec-title">
                <span>🌤️ 1. 지금 나의 마음 날씨는 어떤가요?</span>
            </div>
            <div class="weather-grid" id="minseoWeatherGrid">
                <div class="choice-card selected" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="☀️ 맑음">
                    <div style="font-size: 1.6rem;">☀️</div>
                    <div style="font-weight:bold; font-size:0.9rem;">맑고 따뜻</div>
                    <div style="font-size:0.75rem; opacity:0.8;">기분 좋아요</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="💎 보석 반짝">
                    <div style="font-size: 1.6rem;">💎</div>
                    <div style="font-weight:bold; font-size:0.9rem;">보석 반짝</div>
                    <div style="font-size:0.75rem; opacity:0.8;">뿌듯·자랑</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="⚡ 번개 찌지직">
                    <div style="font-size: 1.6rem;">⚡</div>
                    <div style="font-weight:bold; font-size:0.9rem;">번개 찌지직</div>
                    <div style="font-size:0.75rem; opacity:0.8;">깜짝 놀람</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="🥶 얼음 꽁꽁">
                    <div style="font-size: 1.6rem;">🥶</div>
                    <div style="font-weight:bold; font-size:0.9rem;">얼음 꽁꽁</div>
                    <div style="font-size:0.75rem; opacity:0.8;">긴장·무서움</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="🌋 화산 우르릉">
                    <div style="font-size: 1.6rem;">🌋</div>
                    <div style="font-weight:bold; font-size:0.9rem;">화산 우르릉</div>
                    <div style="font-size:0.75rem; opacity:0.8;">화나고 속상</div>
                </div>
            </div>
        </div>

        <!-- 2. 기분 풍선 -->
        <div>
            <div class="diary-sec-title">
                <span>🎈 2. 내 마음속 기분 풍선을 골라보세요! (여러 개 가능)</span>
            </div>
            <div class="balloon-tags" id="minseoBalloonGrid">
                <span class="balloon-tag selected" onclick="toggleBalloonTag(this)">🎈 신나요</span>
                <span class="balloon-tag selected" onclick="toggleBalloonTag(this)">🎈 뿌듯해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 행복해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 사랑해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 고마워요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 설레어요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 속상해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 답답해요</span>
            </div>
        </div>

        <!-- 3. 오늘 있었던 일 -->
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div class="diary-sec-title" style="margin-bottom:0;">
                    <span>📝 3. 어떤 일이 있었나요?</span>
                </div>
                <button type="button" class="btn-voice" onclick="startDiaryVoiceInput('minseoEventInput', this)">
                    🎙️ 말로 하기 (음성 입력)
                </button>
            </div>
            <textarea id="minseoEventInput" class="diary-input" rows="2" placeholder="예: 친구랑 블록 놀이를 재미있게 했어요!"></textarea>
        </div>

        <!-- 4. 나-전달법 마법 주문 한 줄 -->
        <div>
            <div class="diary-sec-title">
                <span>🪄 4. 소곤소곤 '나-전달법' 마법 한 문장</span>
            </div>
            <div style="background:rgba(255,255,255,0.8); border:1.5px dashed #ff85a2; padding:12px; border-radius:16px; display:flex; flex-direction:column; gap:8px; font-size:0.95rem;">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span>👉 내가</span>
                    <input type="text" id="minseoIMessageSit" class="diary-input" style="flex:1; min-width:140px; padding:6px 10px;" placeholder="상황 (예: 발표를 잘 끝냈)">
                    <span>을 때,</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span>👉 내 기분은</span>
                    <input type="text" id="minseoIMessageFeel" class="diary-input" style="flex:1; min-width:140px; padding:6px 10px;" placeholder="감정 (예: 보석처럼 반짝반짝 뿌듯)">
                    <span>했어.</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span>👉 앞으로는</span>
                    <input type="text" id="minseoIMessageWish" class="diary-input" style="flex:1; min-width:140px; padding:6px 10px;" placeholder="바라는 점 (예: 계속 씩씩하게 도전할 거야)">
                </div>
            </div>
        </div>

        <button class="btn-submit-diary" onclick="submitMinseoDiary('${todayYMD}')">
            <span>🌟 일기 완성하고 별 도장 받기! (+5💎)</span>
        </button>
    `;
}

// 🎮 민수 (5학년) 가볍고 편안한 일상 & 마음 로그 폼 렌더러
function renderMinsuDiaryForm(todayYMD) {
    return `
        <!-- 1. 오늘의 바이브 / 기분 -->
        <div>
            <div class="diary-sec-title">
                <span>😎 1. 지금 나의 기분 & 바이브는?</span>
            </div>
            <div class="energy-grid" id="minsuEnergyGrid">
                <div class="choice-card selected" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="😎 꿀잼·대만족">
                    <div style="font-size: 1.6rem;">😎</div>
                    <div style="font-weight:bold; font-size:0.9rem;">꿀잼·대만족</div>
                    <div style="font-size:0.75rem; opacity:0.8;">기분 최고!</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="🎮 신남·재밌음">
                    <div style="font-size: 1.6rem;">🎮</div>
                    <div style="font-weight:bold; font-size:0.9rem;">신남·재밌음</div>
                    <div style="font-size:0.75rem; opacity:0.8;">취미/친구랑 놂</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="🌿 무난·평화">
                    <div style="font-size: 1.6rem;">🌿</div>
                    <div style="font-weight:bold; font-size:0.9rem;">무난·평화</div>
                    <div style="font-size:0.75rem; opacity:0.8;">편안했던 하루</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="🥱 피곤·휴식">
                    <div style="font-size: 1.6rem;">🥱</div>
                    <div style="font-weight:bold; font-size:0.9rem;">피곤·휴식</div>
                    <div style="font-size:0.75rem; opacity:0.8;">뒹굴거리고 싶음</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="😤 조금 킹받음">
                    <div style="font-size: 1.6rem;">😤</div>
                    <div style="font-weight:bold; font-size:0.9rem;">조금 킹받음</div>
                    <div style="font-size:0.75rem; opacity:0.8;">맘대로 안 됨</div>
                </div>
            </div>
        </div>

        <!-- 2. 오늘 가장 기억에 남거나 재밌었던 일 -->
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div class="diary-sec-title" style="margin-bottom:0;">
                    <span>🍕 2. 기억에 남거나 재밌었던 일 (일상/친구/놀이)</span>
                </div>
                <button type="button" class="btn-voice" onclick="startDiaryVoiceInput('minsuAccomplishInput', this)">
                    🎙️ 말로 하기
                </button>
            </div>
            <textarea id="minsuAccomplishInput" class="diary-input" rows="3" placeholder="예: 친구들이랑 축구하다가 웃긴 일이 있었음 / 맛있는 떡볶이를 먹음 / 숙제 빨리 끝내고 게임 편하게 함"></textarea>
        </div>

        <!-- 3. 오늘 나에게 던지는 가벼운 한 줄 톡 -->
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div class="diary-sec-title" style="margin-bottom:0;">
                    <span>💬 3. 나에게 던지는 가벼운 한 줄 톡!</span>
                </div>
                <button type="button" class="btn-voice" onclick="startDiaryVoiceInput('minsuGoalInput', this)">
                    🎙️ 말로 하기
                </button>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '오늘 하루도 수고 많았다! 푹 쉬자!')">💬 오늘 하루 수고 많았다!</button>
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '오늘 꽤 알차게 보낸 것 같아 뿌듯함.')">💬 꽤 알차게 보냈음!</button>
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '내일은 더 재밌게 놀고 공부도 끝내야지~')">💬 내일 더 재밌게 놀아야지~</button>
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '맛있는 거 먹고 푹 자면 기분 풀릴 듯!')">💬 푹 자고 충전하자!</button>
            </div>
            <textarea id="minsuGoalInput" class="diary-input" rows="2" placeholder="직접 적거나 위의 버튼을 눌러보세요! (예: 오늘도 잘 놀고 공부도 잘 버텼다!)"></textarea>
        </div>

        <button class="btn-submit-diary" onclick="submitMinsuDiary('${todayYMD}')">
            <span>🚀 오늘 기록 남기기! (+5💎)</span>
        </button>
    `;
}

// 4. 인터랙티브 컴포넌트 헬퍼
function selectChoiceCard(card, groupName) {
    const parent = card.parentElement;
    parent.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
}

function toggleBalloonTag(tag) {
    tag.classList.toggle('selected');
}

// 4-1. 노션 학습일지 DB 직통 일기 저장 헬퍼
async function sendDiaryLogToNotionDirect(entry) {
    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const dbId = typeof STUDY_LOG_DB_ID !== 'undefined' ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";

    const subjectText = entry.childName === '민서' 
        ? `마음일기 (${entry.weather || '☀️ 맑음'}) [${entry.timeStr}]`
        : `일상로그 (${entry.energy || '😎 꿀잼'}) [${entry.timeStr}]`;

    let reportText = "";
    if (entry.childName === '민서') {
        reportText = `[감정: ${(entry.moods || []).join(', ')}] ${entry.content || ''} ${entry.iMessage ? ' / 나-전달법: ' + entry.iMessage : ''}`;
    } else {
        reportText = `[이야기: ${entry.accomplish || ''}] [나에게 한마디: ${entry.goal || ''}]`;
    }

    const payload = {
        parent: { database_id: dbId },
        properties: {
            "ID": {
                title: [{ text: { content: `${entry.childName}_${entry.date} (${entry.childName === '민서' ? '마음일기' : '일상로그'})` } }]
            },
            "학생": {
                select: { name: entry.childName }
            },
            "과목": {
                rich_text: [{ text: { content: subjectText } }]
            },
            "입장": {
                date: { start: entry.createdAt }
            },
            "퇴장": {
                date: { start: new Date().toISOString() }
            },
            "소요시간": {
                number: 5
            },
            "오답리포트": {
                rich_text: [{ text: { content: reportText.trim() || "기록 완료" } }]
            },
            "단어요정": {
                number: 1
            }
        }
    };

    try {
        const resp = await fetch(`${proxyUrl}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            const data = await resp.json();
            console.log(`🎉 [노션 직통] ${entry.childName} 일기 학습일지 등록 성공! Page ID: ${data.id}`);
            return true;
        } else {
            const errText = await resp.text();
            console.warn("노션 학습일지 직통 전송 실패:", errText);
        }
    } catch (e) {
        console.warn("노션 학습일지 통신 오류:", e);
    }
    return false;
}

// 4-2. 노션 인벤토리 DB 직통 보상 지급 헬퍼
async function dispenseDiaryRewardDirect(childName, amount = 5) {
    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const invDbId = typeof INVENTORY_DB_ID !== 'undefined' ? INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";

    try {
        // 1. 해당 학생 페이지 쿼리
        const qResp = await fetch(`${proxyUrl}/v1/databases/${invDbId}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({ filter: { property: "이름", title: { equals: childName } } })
        });
        if (!qResp.ok) return false;
        const qData = await qResp.json();
        if (!qData.results || qData.results.length === 0) return false;

        const page = qData.results[0];
        const pageId = page.id;
        const props = page.properties;

        const patchProps = {};
        if (childName === '민서') {
            const curHaribo = props["하리보 젤리 개수"]?.number || 0;
            const curDia = props["다이아몬드 개수"]?.number || 0;
            patchProps["하리보 젤리 개수"] = { number: curHaribo + amount };
            patchProps["다이아몬드 개수"] = { number: curDia + amount };
        } else {
            const curDia = props["다이아몬드 개수"]?.number || 0;
            patchProps["다이아몬드 개수"] = { number: curDia + amount };
        }

        // 2. 패치 전송
        const pResp = await fetch(`${proxyUrl}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({ properties: patchProps })
        });

        if (pResp.ok) {
            console.log(`💎 [노션 인벤토리] ${childName}에게 +${amount} 크레딧 보상 지급 성공!`);
            // 화면에 인벤토리 컴포넌트가 있다면 새로고침
            if (typeof fetchInventory === 'function') {
                fetchInventory();
            }
            return true;
        }
    } catch (e) {
        console.warn("노션 인벤토리 보상 직통 지급 오류:", e);
    }
    return false;
}

// 5. 민서 일기 제출
async function submitMinseoDiary(dateYMD) {
    if (!confirm("민서의 오늘 마음 일기를 이대로 완성하고 저장할까요? 🌟")) {
        return;
    }

    try {
        const weatherCard = document.querySelector('#minseoWeatherGrid .choice-card.selected');
        const weather = weatherCard ? weatherCard.dataset.val : '☀️ 맑음';

        const selectedBalloons = Array.from(document.querySelectorAll('#minseoBalloonGrid .balloon-tag.selected')).map(t => t.innerText);
        const eventText = document.getElementById('minseoEventInput')?.value.trim() || '즐겁고 보람차게 시간을 보냈어요!';

        const sit = document.getElementById('minseoIMessageSit')?.value.trim();
        const feel = document.getElementById('minseoIMessageFeel')?.value.trim();
        const wish = document.getElementById('minseoIMessageWish')?.value.trim();
        const iMessage = (sit || feel || wish) ? `내가 ${sit || '하루를 보냈'}을 때, 내 기분은 ${feel || '뿌듯'}했어. 앞으로는 ${wish || '더 씩씩하게 할 거야'}.` : '';

        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        const entry = {
            id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            childName: '민서',
            date: dateYMD,
            timeStr: timeStr,
            weather: weather,
            moods: selectedBalloons,
            content: eventText,
            iMessage: iMessage,
            createdAt: new Date().toISOString()
        };

        // 1) 로컬스토리지 저장
        saveDiaryEntry(entry);

        // 2) 노션 인벤토리 DB에 보상 직접 지급 (+5)
        dispenseDiaryRewardDirect('민서', 5);

        // 3) 노션 학습일지 DB에 일기 내용 직접 기록
        sendDiaryLogToNotionDirect(entry);

        const todayCount = getTodayDiaryCount('민서');
        // 4) 성공 화면 렌더링
        showDiarySuccessModal('민서', weather, `참 잘했어요! 오늘 ${todayCount}번째 별 도장 획득! 🌟`);
    } catch (globalErr) {
        console.error("민서 일기 저장 중 오류 발생:", globalErr);
        showDiarySuccessModal('민서', '☀️ 맑음', '일기가 저장되었어요! 🌟');
    }
}

// 6. 민수 일기 제출
async function submitMinsuDiary(dateYMD) {
    if (!confirm("민수의 오늘 일기를 이대로 완성하고 저장할까요? 🚀")) {
        return;
    }

    try {
        const energyCard = document.querySelector('#minsuEnergyGrid .choice-card.selected');
        const energy = energyCard ? energyCard.dataset.val : '😎 꿀잼·대만족';

        const accomplish = document.getElementById('minsuAccomplishInput')?.value.trim() || '재미있게 시간을 잘 보냈다.';
        const goal = document.getElementById('minsuGoalInput')?.value.trim() || '오늘 하루도 수고 많았다! 푹 쉬자!';

        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        const entry = {
            id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            childName: '민수',
            date: dateYMD,
            timeStr: timeStr,
            energy: energy,
            accomplish: accomplish,
            goal: goal,
            createdAt: new Date().toISOString()
        };

        // 1) 로컬스토리지 저장
        saveDiaryEntry(entry);

        // 2) 노션 인벤토리 DB에 보상 직접 지급 (+5)
        dispenseDiaryRewardDirect('민수', 5);

        // 3) 노션 학습일지 DB에 일기 내용 직접 기록
        sendDiaryLogToNotionDirect(entry);

        const todayCount = getTodayDiaryCount('민수');
        // 4) 성공 화면 렌더링
        showDiarySuccessModal('민수', energy, `오늘 ${todayCount}번째 일상 기록 완료! 🎮`);
    } catch (globalErr) {
        console.error("민수 일기 저장 중 오류 발생:", globalErr);
        showDiarySuccessModal('민수', '😎 꿀잼', '일기가 저장되었어요! 🎮');
    }
}

// 7. 완료 팝업 & 도장 연출
function showDiarySuccessModal(childName, badgeIcon, stampMsg) {
    // 칭찬 성우 음성 재생
    if (typeof speakFairyTTS === 'function') {
        speakFairyTTS("참 잘했어요!");
    }

    const writeSec = document.getElementById('diaryWriteSection');
    if (!writeSec) return;

    writeSec.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div style="font-size: 3.5rem;">🎉</div>
            <h2 style="font-family: 'Jua', sans-serif; font-size: 1.6rem; color: #10b981;">
                ${childName}의 기록이 멋지게 저장되었어요!
            </h2>
            <p style="font-size: 1rem; opacity: 0.85;">
                소중한 하루를 기록한 ${childName}에게 <b>+5 크레딧 보상</b>이 지급되었습니다! 💎
            </p>

            <div style="margin: 20px 0;">
                <div class="stamp-badge">
                    ${stampMsg}
                </div>
            </div>

            <div style="display:flex; gap:12px; margin-top:10px; flex-wrap:wrap; justify-content:center;">
                <button class="diary-tab-btn" style="padding:10px 20px; font-size:1rem;" onclick="openDailyDiaryModal('write')">
                    ✏️ 새 일기 또 쓰기
                </button>
                <button class="diary-tab-btn active" style="padding:10px 20px; font-size:1rem;" onclick="switchDiaryTab('history')">
                    📚 지난 일기 모아보기
                </button>
                <button class="diary-tab-btn" style="padding:10px 20px; font-size:1rem;" onclick="closeDailyDiaryModal()">
                    🚪 닫기
                </button>
            </div>
        </div>
    `;
}

// 8. 지난 일기 히스토리 뷰 렌더러 (타임라인 시간대 렌더링)
function renderDiaryHistoryList(childName, isMinsu) {
    const list = getStoredDiaries().filter(item => item.childName === childName);

    if (list.length === 0) {
        return `
            <div style="text-align:center; padding:50px 10px; opacity:0.7;">
                <div style="font-size:3rem; margin-bottom:12px;">📝</div>
                <p style="font-family:'Jua', sans-serif; font-size:1.2rem;">아직 작성된 일기가 없어요.</p>
                <p style="font-size:0.9rem;">오늘의 첫 일기를 가볍게 끄적여 볼까요?</p>
            </div>
        `;
    }

    return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="font-size: 0.95rem; opacity: 0.8; font-weight: bold; display:flex; justify-content:space-between; align-items:center;">
                <span>총 ${list.length}편의 기록이 타임라인으로 보관되어 있어요 📚</span>
                <button class="diary-tab-btn" style="padding:4px 10px; font-size:0.85rem;" onclick="openDailyDiaryModal('write')">➕ 새 일기 쓰기</button>
            </div>
            ${list.map(entry => `
                <div style="background:${isMinsu ? '#2e2a72' : '#ffffff'}; border:2px solid ${isMinsu ? '#4f46e5' : '#ffd1dc'}; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed ${isMinsu ? '#4338ca' : '#fecdd3'}; padding-bottom:8px; flex-wrap:wrap; gap:6px;">
                        <span style="font-family:'Jua', sans-serif; font-size:1.05rem; color:${isMinsu ? '#818cf8' : '#e11d48'};">
                            📅 ${entry.date} <span style="font-size:0.85rem; opacity:0.8; font-weight:normal;">(${entry.timeStr || '기록'})</span>
                        </span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.95rem; font-weight:bold; background:${isMinsu ? 'rgba(99,102,241,0.2)' : '#ffe4e6'}; padding:4px 10px; border-radius:12px;">
                                ${entry.weather || entry.energy || '✨ 맑음'}
                            </span>
                            <button type="button" onclick="deleteDiaryEntry('${entry.id}')" style="background:transparent; border:1px solid ${isMinsu ? '#f87171' : '#fda4af'}; color:${isMinsu ? '#f87171' : '#e11d48'}; font-family:'Jua', sans-serif; font-size:0.8rem; cursor:pointer; padding:3px 8px; border-radius:8px; transition:all 0.2s;" title="이 일기 삭제하기">🗑️ 삭제</button>
                        </div>
                    </div>

                    ${entry.moods && entry.moods.length > 0 ? `
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${entry.moods.map(m => `<span style="font-size:0.82rem; background:${isMinsu ? '#4338ca' : '#fff1f2'}; border:1px solid ${isMinsu ? '#6366f1' : '#fecdd3'}; padding:2px 8px; border-radius:10px;">${m}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div style="font-size:0.95rem; line-height:1.6; margin-top:4px;">
                        ${entry.content ? `<b>📝 이야기:</b> ${entry.content}` : ''}
                        ${entry.accomplish ? `<b>🍕 이야기:</b> ${entry.accomplish}` : ''}
                    </div>

                    ${entry.iMessage ? `
                        <div style="background:${isMinsu ? 'rgba(99,102,241,0.15)' : '#fff5f7'}; border-left:3px solid ${isMinsu ? '#818cf8' : '#ff4081'}; padding:8px 12px; border-radius:0 10px 10px 0; font-size:0.9rem; font-style:italic;">
                            🪄 <b>나-전달법:</b> ${entry.iMessage}
                        </div>
                    ` : ''}

                    ${entry.goal ? `
                        <div style="background:rgba(99,102,241,0.15); border-left:3px solid #818cf8; padding:8px 12px; border-radius:0 10px 10px 0; font-size:0.9rem;">
                            💬 <b>나에게 한마디:</b> ${entry.goal}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// 전역 바인딩
window.openDailyDiaryModal = openDailyDiaryModal;
window.closeDailyDiaryModal = closeDailyDiaryModal;
window.switchDiaryTab = switchDiaryTab;
window.selectChoiceCard = selectChoiceCard;
window.toggleBalloonTag = toggleBalloonTag;
window.insertQuickTag = insertQuickTag;
window.submitMinseoDiary = submitMinseoDiary;
window.submitMinsuDiary = submitMinsuDiary;
window.deleteDiaryEntry = deleteDiaryEntry;
window.startDiaryVoiceInput = startDiaryVoiceInput;
window.getTodayDiaryCount = getTodayDiaryCount;
window.updateLobbyDiaryButton = updateLobbyDiaryButton;
