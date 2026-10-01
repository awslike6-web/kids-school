// ==========================================
// ⚙️ 민민이네 공부방 설정 코어 엔진 (fairy-settings-engine.js)
// 3대 도감(Catalog)을 기반으로 동적 UI 렌더링, 오디오 미리듣기, 설정 저장을 총괄합니다.
// ==========================================

const SETTINGS_STORAGE_KEY = "MINMIN_APP_SETTINGS";

// 🎙️ 미리듣기 전용 오디오 인스턴스
let previewAudioInstance = null;

const SettingsManager = {
    // 1. 기본 설정값
    defaults: {
        voice_persona: "default",
        sfx_enabled: true,
        bgm_track: "off",
        korean_speech_rate: 1.0,
        theme_skin: "default"
    },

    // 1-1. 학생별 로컬스토리지 키 생성
    getStorageKey: function() {
        const student = this.getCurrentStudent(); // 'son' | 'daughter'
        return `${SETTINGS_STORAGE_KEY}_${student}`;
    },

    // 2. 전체 설정값 로드 (학생별 우선 로드, 없으면 기본값)
    getAll: function() {
        try {
            const studentKey = this.getStorageKey();
            const raw = localStorage.getItem(studentKey) || localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (!raw) return { ...this.defaults };
            return { ...this.defaults, ...JSON.parse(raw) };
        } catch (e) {
            console.error("설정 로드 실패, 기본값 사용:", e);
            return { ...this.defaults };
        }
    },

    // 3. 단일 설정값 조회
    get: function(key) {
        const all = this.getAll();
        return all[key] !== undefined ? all[key] : this.defaults[key];
    },

    // 4. 단일 설정값 저장 (학생별 스토리지 + 노션 인벤토리 비동기 저장)
    set: function(key, value) {
        const all = this.getAll();
        all[key] = value;
        try {
            const studentKey = this.getStorageKey();
            localStorage.setItem(studentKey, JSON.stringify(all));
            // 레거시 호환용 저장
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(all));
            this.onSettingChanged(key, value);
            // 🌐 노션 인벤토리 DB 백그라운드 클라우드 동기화
            this.saveToCloud();
        } catch (e) {
            console.error("설정 저장 실패:", e);
        }
    },

    // 🌐 4-1. 노션 인벤토리 DB 비동기 클라우드 저장
    saveToCloud: async function() {
        const student = this.getCurrentStudent();
        const childName = (student === 'daughter') ? '민서' : '민수';
        
        // 관리자 모드(아빠/엄마 테스트 중)일 때는 오염 방지
        const savedName = localStorage.getItem('currentUserName');
        if (savedName === '아빠' || savedName === '엄마') {
            console.log(`🛠️ [설정 저장 프리패스] ${savedName} 모드이므로 로컬만 반영합니다.`);
            return;
        }

        const proxyUrl = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
        const invDbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";
        
        try {
            let pageId = localStorage.getItem(`MINMIN_INVENTORY_PAGE_ID_${childName}`);
            if (!pageId) {
                const qRes = await fetch(`${proxyUrl}/v1/databases/${invDbId}/query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filter: { property: "이름", title: { equals: childName } } })
                });
                if (qRes.ok) {
                    const qData = await qRes.json();
                    if (qData.results && qData.results.length > 0) {
                        pageId = qData.results[0].id;
                        localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${childName}`, pageId);
                    }
                }
            }

            if (!pageId) {
                console.warn(`[설정 클라우드 저장 실패] ${childName} 인벤토리 페이지 ID를 찾을 수 없습니다.`);
                return;
            }

            // 기존 노션 캐시된 설정 객체 가져오기 (screenTime, quizFlow 등 보존)
            let currentCloud = {};
            try {
                const cachedRaw = localStorage.getItem(`MINMIN_CLOUD_SETTINGS_${childName}`) || "{}";
                currentCloud = JSON.parse(cachedRaw);
                if (typeof currentCloud !== 'object' || currentCloud === null) currentCloud = {};
            } catch(e) {
                currentCloud = {};
            }

            // appSettings 업데이트
            currentCloud.appSettings = this.getAll();
            currentCloud.updatedAt = new Date().toISOString();

            const jsonStr = JSON.stringify(currentCloud);
            localStorage.setItem(`MINMIN_CLOUD_SETTINGS_${childName}`, jsonStr);

            // 노션 PATCH 요청
            const patchRes = await fetch(`${proxyUrl}/v1/pages/${pageId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    properties: {
                        "학습설정": {
                            rich_text: [{ text: { content: jsonStr } }]
                        }
                    }
                })
            });

            if (patchRes.ok) {
                console.log(`☁️ [노션 인벤토리 설정 저장 성공] ${childName}:`, currentCloud.appSettings);
            } else {
                console.warn(`⚠️ [노션 인벤토리 설정 저장 실패] HTTP ${patchRes.status}`);
            }
        } catch (err) {
            console.warn("⚠️ [노션 인벤토리 설정 통신 에러]:", err);
        }
    },

    // 🌐 4-2. 노션 클라우드로부터 받은 학습설정 JSON 병합 (SWR)
    syncFromCloud: function(cloudSettingsRaw) {
        if (!cloudSettingsRaw) return;
        try {
            let parsed = cloudSettingsRaw;
            if (typeof cloudSettingsRaw === 'string') {
                parsed = JSON.parse(cloudSettingsRaw);
            } else if (cloudSettingsRaw.rich_text && Array.isArray(cloudSettingsRaw.rich_text)) {
                const text = cloudSettingsRaw.rich_text.map(t => t.plain_text || t.text?.content || '').join('');
                if (text) parsed = JSON.parse(text);
            }
            
            // appSettings 필드가 있으면 병합
            const appSettings = (parsed && parsed.appSettings) || (parsed && parsed.voice_persona ? parsed : null);
            if (appSettings && typeof appSettings === 'object') {
                const current = this.getAll();
                const merged = { ...current, ...appSettings };
                const studentKey = this.getStorageKey();
                localStorage.setItem(studentKey, JSON.stringify(merged));
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
                
                // 테마 등 UI 즉시 동기화
                if (merged.theme_skin) {
                    this.applyTheme(merged.theme_skin);
                }
                console.log("☁️ [설정 클라우드 동기화 완료]", merged);
            }
        } catch (e) {
            console.warn("⚠️ [설정 클라우드 파싱 실패]:", e);
        }
    },

    // 5. 설정 변경 시 자동 후속 작업
    onSettingChanged: function(key, value) {
        console.log(`⚙️ [설정 변경] ${key} ➔`, value);
        if (key === "theme_skin") {
            this.applyTheme(value);
        }
    },

    // 6. 현재 학생 프로필 확인 ('son' | 'daughter' | 'admin')
    getCurrentStudent: function() {
        if (typeof window !== 'undefined' && window.location) {
            const params = new URLSearchParams(window.location.search);
            const userParam = params.get('user');
            if (userParam === 'daughter' || userParam === 'minseo' || userParam === '민서') return 'daughter';
            if (userParam === 'son' || userParam === 'minsu' || userParam === '민수') return 'son';
        }
        const curUser = localStorage.getItem('currentUser');
        const curChild = localStorage.getItem('currentChild');
        const curName = localStorage.getItem('currentUserName');
        if (curUser === 'daughter' || curChild === 'minseo' || curName === '민서') {
            return 'daughter';
        }
        return 'son'; // 기본값 민수
    },

    // 7. 테마 스킨 적용
    applyTheme: function(themeId) {
        if (typeof document === 'undefined') return;
        const theme = (typeof THEME_CATALOG !== 'undefined')
            ? THEME_CATALOG.find(t => t.id === themeId)
            : null;
        
        // 기존 테마 클래스 제거
        document.body.classList.remove('theme-default', 'theme-minecraft', 'theme-pokemon', 'theme-pastel', 'theme-dark');
        if (theme && theme.bodyClass) {
            document.body.classList.add(theme.bodyClass);
        }
    },

    // 8. 오디오 미리듣기
    playPreview: function(voiceId, btnElement) {
        if (typeof VOICE_CATALOG === 'undefined') return;
        const voice = VOICE_CATALOG.find(v => v.id === voiceId);
        if (!voice || !voice.previewFile) {
            alert("이 목소리는 음성 준비 중입니다! 곧 추가될 예정이에요. 🎵");
            return;
        }

        // 기존 재생 중이면 중단
        if (previewAudioInstance) {
            previewAudioInstance.pause();
            previewAudioInstance.currentTime = 0;
        }

        // 상대 경로 해결 (루트 or kids 서브폴더 어디서나 kids/ 에셋 폴더 정확히 타겟팅)
        let basePath = "";
        if (typeof document !== 'undefined') {
            const scripts = document.getElementsByTagName('script');
            for (let s of scripts) {
                if (s.src && (s.src.includes('fairy-settings-engine.js') || s.src.includes('fairy-engine.js'))) {
                    const coreUrl = s.src.substring(0, s.src.lastIndexOf('/')); // .../kids/core
                    basePath = coreUrl.substring(0, coreUrl.lastIndexOf('/') + 1); // .../kids/
                    break;
                }
            }
        }
        if (!basePath) {
            const path = window.location.pathname;
            basePath = path.includes('/kids/') ? "" : "kids/";
        }

        const audioUrl = basePath + voice.previewFile;
        previewAudioInstance = new Audio(audioUrl);

        if (btnElement) {
            btnElement.classList.add('playing');
            btnElement.textContent = "🔊 재생 중...";
        }

        previewAudioInstance.play().catch(e => {
            console.warn("미리듣기 재생 실패:", e);
            if (btnElement) {
                btnElement.classList.remove('playing');
                btnElement.textContent = "▶ 미리듣기";
            }
        });

        previewAudioInstance.onended = () => {
            if (btnElement) {
                btnElement.classList.remove('playing');
                btnElement.textContent = "▶ 미리듣기";
            }
        };
    },

    // 9. 모달 열기
    openModal: function() {
        let modal = document.getElementById('fairySettingsModal');
        if (!modal) {
            this.createModalDom();
            modal = document.getElementById('fairySettingsModal');
        }
        this.renderModalContent();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // 10. 모달 닫기
    closeModal: function() {
        const modal = document.getElementById('fairySettingsModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (previewAudioInstance) {
            previewAudioInstance.pause();
            previewAudioInstance.currentTime = 0;
        }
    },

    // 11. 모달 껍데기 DOM 생성
    createModalDom: function() {
        if (document.getElementById('fairySettingsModal')) return;
        const modalHtml = `
        <div id="fairySettingsModal" class="fairy-settings-overlay" onclick="if(event.target === this) SettingsManager.closeModal();">
            <div class="fairy-settings-card">
                <div class="fairy-settings-header">
                    <div class="fairy-settings-title">
                        <span class="settings-icon">⚙️</span>
                        <span>공부방 맞춤 설정</span>
                    </div>
                    <button type="button" class="fairy-settings-close-btn" onclick="SettingsManager.closeModal();" aria-label="닫기">✕</button>
                </div>
                <div class="fairy-settings-body" id="fairySettingsBody">
                    <!-- 동적 콘텐츠 렌더링 -->
                </div>
                <div class="fairy-settings-footer">
                    <button type="button" class="fairy-settings-save-btn" onclick="SettingsManager.closeModal();">설정 완료 ✨</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // 12. 모달 내부 렌더링 (도감 기반 동적 조립)
    renderModalContent: function() {
        const bodyEl = document.getElementById('fairySettingsBody');
        if (!bodyEl) return;

        const currentStudent = this.getCurrentStudent();
        const settings = this.getAll();

        // 1) 목소리 도감 필터링
        const filteredVoices = (typeof VOICE_CATALOG !== 'undefined')
            ? VOICE_CATALOG.filter(v => v.target === 'all' || v.target === currentStudent)
            : [];

        let voiceCardsHtml = filteredVoices.map(v => {
            const isChecked = settings.voice_persona === v.id ? "checked" : "";
            const isSelectedClass = settings.voice_persona === v.id ? "selected" : "";
            const badgeHtml = v.badge ? `<span class="voice-badge badge-${v.badge}">${v.badge}</span>` : "";
            const previewBtnHtml = v.previewFile
                ? `<button type="button" class="voice-preview-btn" onclick="event.stopPropagation(); SettingsManager.playPreview('${v.id}', this)">▶ 미리듣기</button>`
                : `<span class="voice-preview-disabled">준비중</span>`;

            return `
            <label class="voice-card ${isSelectedClass}" onclick="SettingsManager.set('voice_persona', '${v.id}'); SettingsManager.renderModalContent();">
                <div class="voice-card-radio">
                    <input type="radio" name="voice_persona" value="${v.id}" ${isChecked}>
                </div>
                <div class="voice-card-info">
                    <div class="voice-card-top">
                        <span class="voice-card-name">${v.name}</span>
                        ${badgeHtml}
                    </div>
                    <div class="voice-card-desc">${v.desc}</div>
                </div>
                <div class="voice-card-action">
                    ${previewBtnHtml}
                </div>
            </label>
            `;
        }).join('');

        // 2) 효과음 스위치
        const sfxChecked = settings.sfx_enabled ? "checked" : "";

        // 3) BGM 목록 옵션
        const bgmOptions = (typeof BGM_CATALOG !== 'undefined')
            ? BGM_CATALOG.map(b => `<option value="${b.id}" ${settings.bgm_track === b.id ? 'selected' : ''}>${b.name}</option>`).join('')
            : `<option value="off">🔇 배경음악 끄기</option>`;

        // 4) 테마 스킨 칩
        const themeChips = (typeof THEME_CATALOG !== 'undefined')
            ? THEME_CATALOG.map(t => {
                const isActive = settings.theme_skin === t.id ? "active" : "";
                return `
                <button type="button" class="theme-chip ${isActive}" onclick="SettingsManager.set('theme_skin', '${t.id}'); SettingsManager.renderModalContent();">
                    <span class="theme-chip-icon">${t.icon}</span>
                    <span class="theme-chip-name">${t.name}</span>
                </button>
                `;
            }).join('')
            : "";

        const studentBadge = currentStudent === 'daughter' ? '👧 민서 맞춤' : '👦 민수 맞춤';

        bodyEl.innerHTML = `
            <!-- 섹션 1: 목소리 페르소나 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>🎙️ 학습 파트너 목소리</span>
                    <span class="student-tag">${studentBadge}</span>
                </div>
                <div class="voice-card-list">
                    ${voiceCardsHtml}
                </div>
            </div>

            <!-- 섹션 2: 효과음 & 오디오 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>🔊 효과음 및 오디오</span>
                </div>
                <div class="setting-row">
                    <div class="setting-label-group">
                        <div class="setting-label">퀴즈 효과음 (딩동댕 / 폭죽)</div>
                        <div class="setting-subtext">외출 중이거나 조용한 곳에서는 끌 수 있어요.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" ${sfxChecked} onchange="SettingsManager.set('sfx_enabled', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <div class="setting-label-group">
                        <div class="setting-label">배경음악 (BGM)</div>
                        <div class="setting-subtext">공부할 때 잔잔하게 흘러나오는 음악을 골라보세요.</div>
                    </div>
                    <select class="settings-select" onchange="SettingsManager.set('bgm_track', this.value)">
                        ${bgmOptions}
                    </select>
                </div>
            </div>

            <!-- 섹션 3: 공부방 테마 스킨 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>🎨 공부방 테마 스킨</span>
                </div>
                <div class="theme-chip-grid">
                    ${themeChips}
                </div>
            </div>

            <!-- 섹션 4: 노션 클라우드 데이터 동기화 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>☁️ 노션 클라우드 최신 동기화</span>
                </div>
                <div class="setting-row" style="flex-direction:column; align-items:flex-start; gap:10px;">
                    <div class="setting-subtext" style="line-height:1.5; color:#64748b; font-size:0.85rem;">
                        부모님이 스마트폰 노션 앱에서 추가/수정한 어휘, 독해 지문, 퀴즈 데이터를 전체 과목에 즉시 반영합니다.
                    </div>
                    <button type="button" class="fairy-settings-save-btn" id="btnSyncNotionInSettings" style="width:100%; padding:11px 16px; font-size:0.95rem; background:linear-gradient(135deg, #0284c7 0%, #2563eb 100%); box-shadow:0 4px 12px rgba(37,99,235,0.3); border:none; border-radius:14px; cursor:pointer; color:#fff; font-family:'Jua',sans-serif;" onclick="SettingsManager.triggerNotionSync(this)">
                        🔄 노션 전체 데이터 지금 최신화하기
                    </button>
                </div>
            </div>
        `;
    },

    // 12-1. 노션 전체 동기화 실행
    triggerNotionSync: async function(btnEl) {
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.textContent = "⏳ 노션에서 최신 데이터 가져오는 중...";
        }
        if (typeof window.syncAllNotionData === 'function') {
            await window.syncAllNotionData();
        }
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = "✅ 동기화 완료! (언제든 다시 누를 수 있어요)";
        }
    },

    // 13. 전역 초기화 (페이지 로드 시 자동 실행)
    init: function() {
        // 저장된 테마 스킨 즉시 적용
        const savedTheme = this.get('theme_skin');
        this.applyTheme(savedTheme);
    }
};

// 🌟 브라우저 환경에서 자동 초기화
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SettingsManager.init());
    } else {
        SettingsManager.init();
    }
}
