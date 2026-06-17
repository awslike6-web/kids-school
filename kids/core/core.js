// ========================================================
// 🏰 민민이네 공부방 공통 핵심 코어 엔진 (core.js)
// ========================================================

const requiredCores = [
    "notion-helper.js",
    "fairy-config.js",
    "fairy-engine.js"
];

// 글로벌 헬퍼 상태 정의 (공통 사용)
window.currentProfile = localStorage.getItem('currentUser') || 'son';
window.currentUserName = localStorage.getItem('currentUserName') || '민수';
window.currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';
window.savedName = localStorage.getItem('currentUserName');
window.isAdmin = (window.savedName === '아빠' || window.savedName === '엄마');

// 🏰 코어 및 테마 준비
document.addEventListener("DOMContentLoaded", () => {
    // 상대 경로: html 파일 기준](../../core/ 로드 경로
    const corePath = "../../core/";
    
    if (typeof loadCoreScripts === 'function') {
        loadCoreScripts(corePath, requiredCores, () => {
            console.log("🧚 [학습방 공통 코어 결합 완료] 코코 요정 탑재!");
            if (typeof initializeSocietyRoom === 'function') {
                initializeSocietyRoom();
            } else if (typeof initializeRoom === 'function') {
                initializeRoom();
            }
        });
    } else {
        console.warn("⚠️ loadCoreScripts 로드 실패, 비동기 폴백 직접 실행");
        if (typeof initializeSocietyRoom === 'function') {
            initializeSocietyRoom();
        } else if (typeof initializeRoom === 'function') {
            initializeRoom();
        }
    }
});

/**
 * 🔊 요정 음성(TTS) ON/OFF 제어 로직
 */
function toggleFairyTtsSetting() {
    const isCurrentlyEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const nextState = !isCurrentlyEnabled;
    localStorage.setItem('fairy_tts_enabled', nextState ? 'true' : 'false');
    
    updateTtsToggleUi();
    
    if (!nextState) {
        if (typeof stopFairyTTS === 'function') stopFairyTTS();
    } else {
        setTimeout(() => {
            if (typeof speakFairyTTS === 'function') {
                speakFairyTTS("요정 코코의 나긋나긋한 낭독 서비스가 다시 켜졌습니다! 같이 떠나봐요! 🧚‍♀️");
            }
        }, 150);
    }
}

function updateTtsToggleUi() {
    const btn = document.getElementById('ttsToggleBtn');
    if (!btn) return;
    
    const isEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const currentProfileLocal = localStorage.getItem('currentUser') || 'son';
    
    if (isEnabled) {
        btn.innerHTML = "🔊 요정 음성 ON";
        if (currentProfileLocal === 'son') {
            btn.style.borderColor = "#00f2fe";
            btn.style.color = "#00f2fe";
            btn.style.background = "rgba(14, 10, 31, 0.6)";
        } else {
            btn.style.borderColor = "#ff6b9d";
            btn.style.color = "#ff6b9d";
            btn.style.background = "#ffffff";
        }
    } else {
        btn.innerHTML = "🔇 요정 음성 OFF";
        btn.style.borderColor = "#8b949e";
        btn.style.color = "#8b949e";
        if (currentProfileLocal === 'son') {
            btn.style.background = "rgba(30,30,40,0.5)";
        } else {
            btn.style.background = "#fafafa";
        }
    }
}

/**
 * ⏳ 로딩 스피너 전송 헬퍼 함수
 */
function showLoadingSpinner(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>
        <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center; opacity: 0.95;">
           🧚‍♀️ 코코 요정이 노션 등대에서 자료를 가방에 챙겨오고 있어요...
        </p>
      </div>
    `;
}

/**
 * 한글 초성을 자동으로 자르는 초강력 헬퍼함수
 */
function getChosung(str) {
    if (!str) return "";
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for(let i=0; i<str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if(code > -1 && code < 11172) {
            result += cho[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
}

/**
 * 보상 지급 연동 브릿지 공용 헬퍼
 */
async function triggerAwardDispense(amount) {
    const isAdminUser = window.isAdmin || (localStorage.getItem('currentUserName') === '아빠' || localStorage.getItem('currentUserName') === '엄마');
    if (isAdminUser) {
        console.log("🛠️ 아버님/어머님 검수 중이므로 노션 실제 크레딧 지급을 프리패스합니다.");
        return true;
    }

    try {
        if (typeof grantRewardAndShowUI === 'function') {
            await grantRewardAndShowUI(amount, true); // 조용한 노티 전송 및 데이터 업데이트
        }
    } catch(err) {
        console.warn("보상 지급 중 로컬 백엔드 연동 모듈 우회:", err);
    }
}

/**
 * 퇴장 시 일지 작성 자동 안전 배선 (동적 과목명 적용)
 */
window.addEventListener("beforeunload", () => {
    const isAdminUser = window.isAdmin || (localStorage.getItem('currentUserName') === '아빠' || localStorage.getItem('currentUserName') === '엄마');
    if (!isAdminUser && typeof sendStudyLogToNotion === 'function') {
        const profile = localStorage.getItem('currentUser') || 'son';
        const userName = profile === 'son' ? '민수' : '민서';
        const subjectName = window.currentSubject || "사회"; // 동적 과목명 참조
        sendStudyLogToNotion({
            childName: userName,
            subject: subjectName,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationMinutes: 5,
            errorReport: `${subjectName} 섭렵 돋보기 완료`
        });
    }
});
