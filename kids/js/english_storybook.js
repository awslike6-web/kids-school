// kids/js/english_storybook.js
// 📚 [1단계] 영어 단원 동화 도서관 서가 모듈 (EnglishStorybook)
// - 단원별 스토리북 도서관 도감 렌더링, 서가 탭 전환, e-Book/웹툰 뷰어 연동
// - 네임스페이스: window.EnglishStorybook

(function() {
    'use strict';

    const STORY_BOOKS = [
                {
            id: "l9",
            badge: "🏠 9단원 일러스트 동화",
            title: "Welcome to My Dream House!",
            koreanTitle: "어서 와, 나의 꿈의 집으로!",
            desc: "초등 영어 5-2 9단원 (집과 방의 물건 소개하기)",
            keyExpr: "This is the bedroom. / There is a bed in the bedroom.",
            url: "english_l9_storybook.html",
            color: "#2563eb",
            themeTagSon: "🏠 꿈의 집 투어",
            themeTagDaughter: "✨ 예쁜 우리 집"
        },
{
            id: "l8",
            badge: "🔍 8단원 일러스트 동화",
            title: "The Great Festival Mission",
            koreanTitle: "위대한 축제 미션 (친구를 찾아라!)",
            desc: "초등 영어 5-2 8단원 (외모와 옷차림 묻고 답하기)",
            keyExpr: "What does he look like? / What is she wearing?",
            url: "english_l8_storybook.html",
            color: "#f59e0b",
            themeTagSon: "🔎 탐정 친구 찾기",
            themeTagDaughter: "✨ 친구 찾기"
        },
        {
            id: "l7",
            badge: "⛺ 7단원 그림 동화",
            title: "Minsu and Junwoo's Weekend",
            koreanTitle: "민수와 준우의 즐거운 주말",
            desc: "초등 영어 5-2 7단원 (지난 일 묻고 답하기)",
            keyExpr: "What did you do last weekend? / I went camping.",
            url: "english_l7_storybook.html",
            color: "#3b82f6",
            themeTagSon: "🏕️ 캠핑과 별빛 밤",
            themeTagDaughter: "✨ 주말 나들이"
        },
        {
            id: "l11",
            badge: "🧭 11단원 예습 동화",
            title: "Minsu Explores the Village",
            koreanTitle: "민수의 신나는 마을 탐험",
            desc: "초등 영어 5-2 11단원 (위치 묻고 길 안내하기)",
            keyExpr: "Where is the library? / Go straight and turn right.",
            url: "english_l11_storybook.html",
            color: "#10b981",
            themeTagSon: "🟩 마인크래프트 마을",
            themeTagDaughter: "🟢 길 찾기 탐험"
        }
    ];

    function openModal() {
        const overlay = document.getElementById('missionOverlay');
        const headerTitle = document.getElementById('overlayHeaderTitle');
        const headerIcon = document.getElementById('overlayHeaderIcon');
        const innerBody = document.getElementById('overlayInnerBody');
        if (!overlay || !innerBody) return;

        overlay.style.display = "flex";
        if (typeof window.currentMissionType !== 'undefined') {
            window.currentMissionType = "library_modal";
        }
        if (typeof window.stopFairyTTS === 'function') {
            window.stopFairyTTS();
        }

        if (headerTitle) headerTitle.textContent = "📚 단원 동화 도서관 서가";
        if (headerIcon) headerIcon.textContent = "📚";

        const currentProfile = localStorage.getItem('currentUser') || 'son';
        const isMinecraft = (currentProfile === 'son');

        innerBody.innerHTML = `
            <div style="text-align:center; padding:10px 0 20px;">
                <h3 style="color:var(--primary); margin-bottom:8px; font-family:'Jua', sans-serif; font-size:1.35rem;">
                    📖 읽고 싶은 단원 동화를 선택하세요!
                </h3>
                <p style="font-size:0.95rem; color:#666; margin-bottom:20px;">
                    0.85배속의 편안한 원어민 음성과 쉬운 우리말 해설로 재미있게 읽어요.
                </p>
                <div style="display:grid; grid-template-columns:1fr; gap:16px; max-width:540px; margin:0 auto;">
                    ${STORY_BOOKS.map(b => `
                        <div onclick="location.href='${b.url}'" style="background:#fff; border:2.5px solid ${b.color}; border-radius:16px; padding:18px 20px; cursor:pointer; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.06); transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="background:${b.color}; color:#fff; font-size:0.82rem; font-weight:bold; padding:4px 10px; border-radius:12px;">${b.badge}</span>
                                <span style="font-size:0.82rem; color:#888; font-weight:bold;">${isMinecraft ? b.themeTagSon : b.themeTagDaughter}</span>
                            </div>
                            <div style="font-size:1.2rem; font-weight:bold; color:#1e293b; margin-bottom:4px; font-family:'Jua', sans-serif;">
                                ${b.title}
                            </div>
                            <div style="font-size:0.95rem; color:#475569; margin-bottom:10px;">
                                "${b.koreanTitle}" · <span style="color:#64748b; font-size:0.88rem;">${b.desc}</span>
                            </div>
                            <div style="background:#f8fafc; border-left:3px solid ${b.color}; padding:6px 12px; font-size:0.85rem; color:#334155; border-radius:0 8px 8px 0;">
                                🎯 <b>핵심 표현:</b> ${b.keyExpr}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const EnglishStorybook = {
        books: STORY_BOOKS,
        openModal
    };

    window.EnglishStorybook = EnglishStorybook;
    window.openEnglishLibraryModal = openModal; // 하위 호환 글로벌 브리지

})();
