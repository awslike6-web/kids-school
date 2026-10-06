// ========================================================
// 📚 [1단계] 사회 단원 동화 도서관 모듈 (society_storybook.js)
// ========================================================
// 5-1 기후 대모험, 5-2 역사 시간 여행 등 스토리북 도서관 UI 및 뷰어 연동 전담 모듈

(() => {
    'use strict';

    const SOCIETY_STORYBOOK_LIBRARY = [
        {
            id: "5_1_2",
            grade: "5학년 1학기",
            unit: "2단원 : 우리 국토의 기후",
            bookNum: "5-1 기후",
            title: "민수와 친구들의 지구 지키기 : 기후 수업 대모험",
            subtitle: "날씨와 기후의 차이, 기온·강수량·바람과 지구온난화",
            desc: "햇살 따스한 교실에서 시작되는 기후 탐험! 날씨와 기후의 정의부터 바람, 태풍, 지구를 지키는 온실가스 줄이기 실천까지!",
            icon: "🌍",
            color: "#10b981",
            bgGrad: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#10b981",
            link: "climate_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/society/minsu/5-1/1/climate_story_p1.png"
        },
        {
            id: "5_2_1",
            grade: "5학년 2학기",
            unit: "1단원 : 옛사람들의 삶과 문화",
            bookNum: "5-2 역사",
            title: "민수와 친구들의 사회교과서 시간 여행",
            subtitle: "구석기 주먹도끼부터 고조선 8조법까지 교과서 완전 정복",
            desc: "역사 박물관 유물함의 푸른 빛을 따라 시작된 시간 여행! 한탄강 주먹도끼, 암사동 빗살무늬 토기, 거대 고인돌과 고조선 성문 앞 8조법 탐구!",
            icon: "⏳",
            color: "#d97706",
            bgGrad: "linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#d97706",
            link: "history_time_travel_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/society/minsu/5-2/1/history_story_p1.png"
        },
        {
            id: "5_2_2",
            grade: "5학년 2학기",
            unit: "1단원 : 옛사람들의 삶과 문화",
            bookNum: "5-2 삼국·남북국",
            title: "민수와 친구들의 사회교과서 시간 여행 2편",
            subtitle: "삼국의 영웅들과 찬란한 황금빛 나라 (삼국·가야·통일신라·발해)",
            desc: "황금빛 포털을 타고 삼국 시대로 도약! 만주 벌판 광개토대왕릉비, 살수대첩 을지문덕, 백제 금동대향로, 신라 황금 금관, 가야 철갑옷과 석굴암 본존불까지!",
            icon: "⚔️",
            color: "#b45309",
            bgGrad: "linear-gradient(135deg, rgba(180, 83, 9, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#f59e0b",
            link: "three_kingdoms_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/society/minsu/5-2/2/three_kingdoms_story_p1.png"
        },
        {
            id: "5_2_3",
            grade: "5학년 2학기",
            unit: "1단원 : 옛사람들의 삶과 문화",
            bookNum: "5-2 고려",
            title: "민수와 친구들의 사회교과서 시간 여행 3편",
            subtitle: "푸른 비취빛 고려와 바다 너머 코리아",
            desc: "교과서의 푸른빛을 따라 고려의 개경으로! 후삼국을 통일한 태조 왕건, 서희의 외교 담판, 귀주대첩 강감찬, 팔만대장경, 고려청자와 벽란도의 아라비아 상인들까지!",
            icon: "🏺",
            color: "#0d9488",
            bgGrad: "linear-gradient(135deg, rgba(13, 148, 136, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "#14b8a6",
            link: "goryeo_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/society/minsu/5-2/3/goryeo_story_p1.png"
        },
        {
            id: "5_2_4",
            grade: "5학년 2학기",
            unit: "2단원 : 사회의 새로운 변화와 오늘날의 우리",
            bookNum: "5-2 조선",
            title: "민수와 친구들: 조선을 지킨 용기의 불꽃",
            subtitle: "임진왜란과 병자호란, 외침에 맞서 나라를 지킨 조선의 영웅과 백성들",
            desc: "임진왜란의 바다에서 거북선과 학익진으로 승리를 이끈 이순신 장군과 수군, 나라를 위해 일어선 붉은 옷의 의병들, 남한산성에서 매서운 추위를 버텨낸 백성들의 가슴 뜨거운 시간 여행!",
            icon: "🛡️",
            color: "#dc2626",
            bgGrad: "linear-gradient(135deg, rgba(220, 38, 38, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "#dc2626",
            link: "joseon_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/society/minsu/5-2/4/joseon_story_p1.png"
        }
    ];

    /**
     * 사회 단원 동화 도서관 렌더링
     */
    function render(innerBody) {
        if (!innerBody) innerBody = document.getElementById('overlayInnerBody');
        if (!innerBody) return;

        innerBody.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h3 style="font-family: 'Jua', sans-serif; font-size: 1.45rem; color: #f59e0b; margin-bottom: 6px;">
                        📚 사회 단원 동화 도서관
                    </h3>
                    <p style="font-size: 0.95rem; color: #94a3b8;">
                        교과서 내용이 쏙쏙 이해되는 재미있는 동화와 성우 구연동화 음성을 학기별로 만나보세요!
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px;">
                    ${SOCIETY_STORYBOOK_LIBRARY.map(book => `
                        <div style="
                            background: ${book.bgGrad};
                            border: 2px solid ${book.border};
                            border-radius: 16px;
                            padding: 16px;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            gap: 12px;
                            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
                            transition: transform 0.2s, box-shadow 0.2s;
                        ">
                            <div style="display: flex; gap: 14px; align-items: flex-start;">
                                <img src="${book.coverImg}?v=20260906" alt="${book.title}" style="
                                    width: 90px;
                                    height: 120px;
                                    object-fit: cover;
                                    border-radius: 8px;
                                    border: 1px solid rgba(255,255,255,0.2);
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                                    flex-shrink: 0;
                                ">
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                                        <span style="
                                            background: ${book.color};
                                            color: white;
                                            padding: 2px 8px;
                                            border-radius: 6px;
                                            font-size: 0.78rem;
                                            font-family: 'Jua', sans-serif;
                                        ">${book.bookNum}</span>
                                        <span style="font-size: 0.82rem; color: #cbd5e1; font-weight: bold;">${book.grade}</span>
                                    </div>
                                    <h4 style="font-family: 'Jua', sans-serif; font-size: 1.15rem; color: white; margin: 2px 0; line-height: 1.3;">
                                        ${book.title}
                                    </h4>
                                    <p style="font-size: 0.83rem; color: #94a3b8; line-height: 1.35; margin: 0;">
                                        ${book.subtitle}
                                    </p>
                                </div>
                            </div>

                            <p style="font-size: 0.83rem; color: #cbd5e1; line-height: 1.45; margin: 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                                ${book.desc}
                            </p>

                            <a href="${book.link}" style="
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 6px;
                                background: ${book.color};
                                color: white;
                                text-decoration: none;
                                padding: 10px;
                                border-radius: 10px;
                                font-family: 'Jua', sans-serif;
                                font-size: 1rem;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                transition: filter 0.2s;
                            ">
                                📖 동화책 읽기 (구연동화)
                            </a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 네임스페이스 및 하위 호환 바인딩
    window.SocietyStorybook = {
        render,
        getList: () => SOCIETY_STORYBOOK_LIBRARY
    };

    window.renderSocietyStorybookLibrary = render;
    window.SOCIETY_STORYBOOK_LIBRARY = SOCIETY_STORYBOOK_LIBRARY;
})();
