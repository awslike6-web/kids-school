// kids/js/korean_storybook.js
// 📚 [1단계] 국어 단원별 스토리북 도서관 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 단일 책임 완성형 모듈
// - 5학년 2학기 민수 생각마루 서가 + 1학년 2학기 민서 꿈자람 서가 렌더링 총괄

(function() {
    'use strict';

    const KOREAN_STORYBOOK_LIBRARY = [
        {
            id: "5_2_1_1",
            student: "minsu",
            studentName: "민수",
            grade: "5학년 2학기",
            gradeCode: "5-2",
            targetBadge: "초등 5-2",
            unit: "1단원",
            bookNum: "1권",
            title: "민수의 따뜻한 말 한마디",
            subtitle: "공감의 힘 · 친구의 마음을 알아주는 마법",
            desc: "체육 시간 달리기에서 넘어진 슬찬이에게 민수는 어떤 말을 건넸을까요? 상대방의 처지를 생각하며 마음을 전하는 공감의 대화법을 배워봐요.",
            icon: "💬",
            color: "#10b981",
            bgGrad: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#10b981",
            link: "korean_5_2_1_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/korean/minsu/5-2/1/korean_story_cover.png"
        },
        {
            id: "1_2_1_1",
            student: "minseo",
            studentName: "민서",
            grade: "1학년 2학기",
            gradeCode: "1-2",
            targetBadge: "초등 1-2",
            unit: "1단원",
            bookNum: "1권",
            title: "마음 똑똑! 감정 라디오 교실",
            subtitle: "감정의 날씨와 화해 이야기",
            desc: "마음속에 찾아오는 날씨와 다양한 감정들! 실수로 그림이 찢어졌을 때 민서와 서율이는 어떻게 화해했을까요?",
            icon: "📻",
            color: "#ec4899",
            bgGrad: "linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#ec4899",
            link: "korean_1_2_1_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/korean/minseo/1-2/1/book1/korean_story_p1.png"
        },
        {
            id: "1_2_1_2",
            student: "minseo",
            studentName: "민서",
            grade: "1학년 2학기",
            gradeCode: "1-2",
            targetBadge: "초등 1-2",
            unit: "1단원",
            bookNum: "2권",
            title: "소곤소곤 나-전달법",
            subtitle: "우유 쏟은 민수 오빠와 마법 주문",
            desc: "상황-감정-바라는 점 3단계 마법 주문! 화내지 않고 소곤소곤 예쁘게 내 마음을 전하는 법을 배워요.",
            icon: "💬",
            color: "#3b82f6",
            bgGrad: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#3b82f6",
            link: "korean_1_2_1_storybook_2.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/korean/minseo/1-2/1/book2/korean_story_p1.png"
        },
        {
            id: "1_2_1_3",
            student: "minseo",
            studentName: "민서",
            grade: "1학년 2학기",
            gradeCode: "1-2",
            targetBadge: "초등 1-2",
            unit: "1단원",
            bookNum: "3권",
            title: "슬찬이의 필통 소동",
            subtitle: "교실에서 실천한 나-전달법 마법 주문",
            desc: "와장창 쏟아진 필통과 그림에 그어진 까만 선! 화내지 않고 나-전달법으로 슬기롭게 해결해요.",
            icon: "✏️",
            color: "#10b981",
            bgGrad: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#10b981",
            link: "korean_1_2_1_storybook_3.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/korean/minseo/1-2/1/book3/korean_story_p1.png"
        },
        {
            id: "1_2_1_4",
            student: "minseo",
            studentName: "민서",
            grade: "1학년 2학기",
            gradeCode: "1-2",
            targetBadge: "초등 1-2",
            unit: "1단원",
            bookNum: "4권",
            title: "가슴이 얼음처럼 꽁꽁 긴장돼요!",
            subtitle: "발표 불안을 녹이는 솔직한 고백과 친구들의 응원",
            desc: "친구들 앞 발표에 가슴이 쿵쾅쿵쾅! 솔직하게 내 마음을 털어놓고 친구들의 따뜻한 응원으로 용기를 얻어요.",
            icon: "🧊",
            color: "#8b5cf6",
            bgGrad: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#8b5cf6",
            link: "korean_1_2_1_storybook_4.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/korean/minseo/1-2/1/book4/korean_story_p1.png"
        }
    ];

    let currentStorybookTab = 'auto'; // 'auto', 'minsu', 'minseo', 'all'

    function renderBookCard(book) {
        return `
            <div style="background: ${book.bgGrad}; border: 2px solid ${book.border}; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 25px rgba(0,0,0,0.4); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="background: ${book.color}; color: white; padding: 4px 12px; border-radius: 12px; font-family: 'Jua', sans-serif; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 5px;">
                            <span>${book.targetBadge || `[${book.gradeCode}]`}</span>
                            <span>${book.unit} ${book.bookNum}</span>
                        </span>
                        <span style="font-size: 1.3rem;">${book.icon}</span>
                    </div>
                    
                    <img src="${book.coverImg}?v=20260909_3" alt="${book.title}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    
                    <h4 style="font-family: 'Jua', sans-serif; font-size: 1.15rem; color: #f8fafc; margin-bottom: 4px;">
                        ${book.title}
                    </h4>
                    <p style="font-size: 0.88rem; color: ${book.color}; font-weight: bold; margin-bottom: 8px;">
                        ${book.subtitle}
                    </p>
                    <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 14px;">
                        ${book.desc}
                    </p>
                </div>

                <a href="${book.link}" style="display: block; width: 100%; padding: 10px 0; background: ${book.color}; color: white; text-align: center; border-radius: 12px; font-family: 'Jua', sans-serif; font-size: 1rem; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    📖 동화책 읽기 (구연동화)
                </a>
            </div>
        `;
    }

    function renderStorybookLibrary(innerBody) {
        if (!innerBody) return;
        const profile = localStorage.getItem('currentUser') || 'son';
        const userName = localStorage.getItem('currentUserName') || '민수';
        const isMinsuProfile = (profile === 'son' || userName === '민수');
        
        let activeTab = currentStorybookTab;
        if (activeTab === 'auto') {
            activeTab = isMinsuProfile ? 'minsu' : 'minseo';
        }

        const minsuBooks = KOREAN_STORYBOOK_LIBRARY.filter(b => b.student === 'minsu' || b.gradeCode === '5-2');
        const minseoBooks = KOREAN_STORYBOOK_LIBRARY.filter(b => b.student === 'minseo' || b.gradeCode === '1-2');

        const getTabBtnStyle = (tabKey, activeGradient) => {
            const isActive = (activeTab === tabKey);
            if (isActive) {
                return `background: ${activeGradient}; color: white; border: 2px solid transparent; box-shadow: 0 4px 15px rgba(0,0,0,0.25); transform: translateY(-2px); font-weight: bold;`;
            }
            return `background: rgba(255,255,255,0.85); color: #475569; border: 2px solid #cbd5e1;`;
        };

        let contentHtml = '';

        if (activeTab === 'minsu') {
            contentHtml = `
                <div style="margin-bottom: 20px; padding: 14px 18px; background: rgba(16, 185, 129, 0.12); border-left: 5px solid #10b981; border-radius: 14px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <h4 style="font-family: 'Jua', sans-serif; color: #065f46; font-size: 1.2rem; margin-bottom: 4px;">
                                🟩 초등 5학년 2학기 · 민수의 생각마루 서가
                            </h4>
                            <p style="font-size: 0.88rem; color: #334155; margin: 0;">
                                마인크래프트 테마로 배우는 공감 대화법과 2대 황금 문장 공식, 중학 생존 지시어 연계 동화예요!
                            </p>
                        </div>
                        <span style="background: #10b981; color: white; font-family:'Jua', sans-serif; padding: 4px 10px; border-radius: 12px; font-size: 0.82rem;">
                            총 ${minsuBooks.length}권
                        </span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    ${minsuBooks.map(renderBookCard).join('')}
                </div>
            `;
        } else if (activeTab === 'minseo') {
            contentHtml = `
                <div style="margin-bottom: 20px; padding: 14px 18px; background: rgba(236, 72, 153, 0.12); border-left: 5px solid #ec4899; border-radius: 14px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <h4 style="font-family: 'Jua', sans-serif; color: #9d174d; font-size: 1.2rem; margin-bottom: 4px;">
                                🎀 초등 1학년 2학기 · 민서의 꿈자람 서가
                            </h4>
                            <p style="font-size: 0.88rem; color: #334155; margin: 0;">
                                슬라임 테마와 함께 마음의 날씨를 배우고 소곤소곤 나-전달법을 익히는 귀여운 단원 동화예요!
                            </p>
                        </div>
                        <span style="background: #ec4899; color: white; font-family:'Jua', sans-serif; padding: 4px 10px; border-radius: 12px; font-size: 0.82rem;">
                            총 ${minseoBooks.length}권
                        </span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    ${minseoBooks.map(renderBookCard).join('')}
                </div>
            `;
        } else {
            contentHtml = `
                <div style="margin-bottom: 36px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2.5px solid #10b981;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.5rem;">🟩</span>
                            <h4 style="font-family: 'Jua', sans-serif; color: #065f46; font-size: 1.25rem; margin: 0;">
                                초등 5학년 2학기 · 민수 서가
                            </h4>
                        </div>
                        <span style="background: #10b981; color: white; padding: 3px 10px; border-radius: 12px; font-family: 'Jua', sans-serif; font-size: 0.82rem;">
                            ${minsuBooks.length}권 등록됨
                        </span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                        ${minsuBooks.map(renderBookCard).join('')}
                    </div>
                </div>
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2.5px solid #ec4899;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.5rem;">🎀</span>
                            <h4 style="font-family: 'Jua', sans-serif; color: #9d174d; font-size: 1.25rem; margin: 0;">
                                초등 1학년 2학기 · 민서 서가
                            </h4>
                        </div>
                        <span style="background: #ec4899; color: white; padding: 3px 10px; border-radius: 12px; font-family: 'Jua', sans-serif; font-size: 0.82rem;">
                            ${minseoBooks.length}권 등록됨
                        </span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                        ${minseoBooks.map(renderBookCard).join('')}
                    </div>
                </div>
            `;
        }

        innerBody.innerHTML = `
            <div style="max-width: 860px; margin: 0 auto; padding: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="font-family: 'Jua', sans-serif; font-size: 1.5rem; color: var(--dark); margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>📚</span><span>국어 단원 동화 도서관</span>
                    </h3>
                    <p style="font-size: 0.95rem; color: #64748b;">
                        원하는 학년과 아이의 서가를 선택해 재미있는 단원 동화와 구연동화 음성을 만나보세요!
                    </p>
                </div>

                <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;">
                    <button onclick="window.setStorybookTab('minsu')" style="${getTabBtnStyle('minsu', 'linear-gradient(135deg, #10b981 0%, #059669 100%)')} padding: 9px 18px; border-radius: 24px; font-family: 'Jua', sans-serif; font-size: 0.98rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        <span>🟩 5학년 민수 서가</span>
                        <span style="background: rgba(0,0,0,0.15); padding: 2px 7px; border-radius: 10px; font-size: 0.8rem;">${minsuBooks.length}권</span>
                    </button>
                    <button onclick="window.setStorybookTab('minseo')" style="${getTabBtnStyle('minseo', 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)')} padding: 9px 18px; border-radius: 24px; font-family: 'Jua', sans-serif; font-size: 0.98rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        <span>🎀 1학년 민서 서가</span>
                        <span style="background: rgba(0,0,0,0.15); padding: 2px 7px; border-radius: 10px; font-size: 0.8rem;">${minseoBooks.length}권</span>
                    </button>
                    <button onclick="window.setStorybookTab('all')" style="${getTabBtnStyle('all', 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)')} padding: 9px 18px; border-radius: 24px; font-family: 'Jua', sans-serif; font-size: 0.98rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        <span>✨ 전체 보기</span>
                        <span style="background: rgba(0,0,0,0.15); padding: 2px 7px; border-radius: 10px; font-size: 0.8rem;">${KOREAN_STORYBOOK_LIBRARY.length}권</span>
                    </button>
                </div>

                ${contentHtml}
            </div>
        `;
    }

    window.setStorybookTab = function(tabKey) {
        currentStorybookTab = tabKey;
        const innerBody = document.getElementById('overlayInnerBody');
        if (innerBody) {
            renderStorybookLibrary(innerBody);
        }
    };

    window.KoreanStorybook = {
        catalog: KOREAN_STORYBOOK_LIBRARY,
        renderLibrary: renderStorybookLibrary,
        renderCard: renderBookCard,
        setTab: window.setStorybookTab
    };

    // 전역 하위 호환성 유지
    window.renderStorybookLibrary = renderStorybookLibrary;
    window.KOREAN_STORYBOOK_LIBRARY = KOREAN_STORYBOOK_LIBRARY;
})();
