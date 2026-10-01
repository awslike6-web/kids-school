// ==========================================
// 🎓 민민이네 공부방 4대 교과 공통 미션 및 UI 엔진 (subject_engine.js)
// ==========================================
// 국어, 과학, 사회, 영어 4대 교과방의 3단계 학습 사다리,
// 미션 전체화면 오버레이, 노션 데이터 스피너, 한글 초성 분해를 단일 표준으로 제공합니다.

const SubjectEngine = {
    /**
     * ⏳ 노션 데이터 로딩 스피너 렌더러
     */
    showLoadingSpinner(container, customMessage) {
        if (!container) return;
        const msg = customMessage || "Fairy_🧚‍♀️ 코코 요정이 노션 등대에서 자료를 가방에 챙겨오고 있어요...";
        container.innerHTML = `
          <div class="spinner-wrapper" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; gap:16px;">
            <div class="spinner" style="width:48px; height:48px; border:4px solid rgba(139,92,246,0.2); border-top-color:#8b5cf6; border-radius:50%; animation:ds-spin 0.8s linear infinite;"></div>
            <p style="font-family:'Jua', 'Gaegu', cursive; font-size:1.25rem; font-weight:bold; color:inherit; text-align:center; opacity:0.95; line-height:1.5;">
                ${msg}
            </p>
          </div>
        `;
    },

    /**
     * 🪟 미션 전체화면 오버레이 열기
     */
    openMissionView(options = {}) {
        const {
            overlayId = 'missionOverlay',
            titleId = 'overlayHeaderTitle',
            iconId = 'overlayHeaderIcon',
            bodyId = 'overlayInnerBody',
            title = '학습 미션',
            icon = '🎯',
            onOpen = null
        } = options;

        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.style.display = "flex";
        }

        const headerTitle = document.getElementById(titleId);
        if (headerTitle) headerTitle.textContent = title;

        const headerIcon = document.getElementById(iconId);
        if (headerIcon) headerIcon.textContent = icon;

        // TTS 오디오 안전 정지
        if (typeof stopFairyTTS === 'function') {
            stopFairyTTS();
        }

        // 보상 세션 초기화
        if (typeof initQuizRewardSession === 'function') {
            initQuizRewardSession(options.type || 'voca');
        }

        if (typeof onOpen === 'function') {
            const body = document.getElementById(bodyId);
            onOpen(body);
        }
    },

    /**
     * 🚪 미션 오버레이 닫기 및 가드 해제
     */
    closeMissionView(options = {}) {
        const {
            overlayId = 'missionOverlay',
            force = false,
            onClose = null
        } = options;

        if (!force && typeof confirmLeaveActiveSession === 'function' && !confirmLeaveActiveSession()) {
            return false;
        }

        if (typeof disarmQuizLeaveGuard === 'function') {
            disarmQuizLeaveGuard();
        }

        if (typeof finalizeQuizRewardSession === 'function') {
            finalizeQuizRewardSession();
        }

        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.style.display = "none";
        }

        if (typeof stopFairyTTS === 'function') {
            stopFairyTTS();
        }

        if (typeof onClose === 'function') {
            onClose();
        }
        return true;
    },

    /**
     * 🔤 한글 자모 초성 분해 엔진 (단일 SSOT)
     */
    getChosung(str) {
        if (!str || typeof str !== 'string') return "";
        const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
        let result = "";
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code >= 0 && code < 11172) {
                result += cho[Math.floor(code / 588)];
            } else {
                result += str.charAt(i);
            }
        }
        return result;
    }
};

// ==========================================
// 🧩 전역 네임스페이스 바인딩 (하위 호환성 100% 보장)
// ==========================================
window.SubjectEngine = SubjectEngine;
window.showLoadingSpinner = SubjectEngine.showLoadingSpinner;
window.getChosung = SubjectEngine.getChosung;
