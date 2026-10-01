// kids/js/science_storybook.js
// 📚 [1단계] 과학 단원 동화 도서관 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도, IIFE 캡슐화, 하위 호환성 100% 보존

(function() {
    'use strict';

    const SCIENCE_STORYBOOK_LIBRARY = [
        {
            id: "5_1_0_1",
            grade: "5-1",
            unit: "0단원",
            bookNum: "1권",
            title: "과학 교과서 탐험대: 완벽 공부법",
            subtitle: "교과서 7단계 순서 정복과 완벽 공부 비법",
            desc: "민우, 서연, 지훈이와 함께 떠나는 과학 교과서 탐험! '단원 열기'부터 '체험 더하기'까지 7단계로 과학 왕이 되어보자!",
            icon: "🔍",
            color: "#0284c7",
            bgGrad: "linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#0284c7",
            link: "science_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-1/0/study/science_story_p1.png"
        },
        {
            id: "5_1_0_2",
            grade: "5-1",
            unit: "0단원",
            bookNum: "2권",
            title: "안전을 지키는 꼬마 과학자 탐험대",
            subtitle: "실험실 & 야외 탐구 안전 수칙 완벽 마스터",
            desc: "유진, 수현, 지아와 함께 배우는 필수 안전 수칙! 실험 복장부터 비상 대피, 야외 탐구 안전까지 완벽 대비해요.",
            icon: "🛡️",
            color: "#059669",
            bgGrad: "linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#059669",
            link: "science_safety_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-1/0/safety/science_safety_story_p1.png"
        },
        {
            id: "5_1_1_1",
            grade: "5-2",
            unit: "1단원",
            bookNum: "3권",
            title: "섞여 있어도 괜찮아! 혼합물 분리 대모험",
            subtitle: "1단원 혼합물의 분리 원리와 생활 속 분리배출",
            desc: "민재, 하은, 수아와 함께하는 신나는 과학 탐구! 콩·팥 분리, 거름, 증발, AI 선별 로봇부터 새활용 필통까지!",
            icon: "🧪",
            color: "#2563eb",
            bgGrad: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#2563eb",
            link: "science_mix_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-1/1/science_mix_story_p1.png"
        },
        {
            id: "5_2_2_1",
            grade: "5-2",
            unit: "2단원",
            bookNum: "4권",
            title: "하늘을 나는 날씨 연구소: 민수와 코코의 대모험",
            subtitle: "2단원 날씨와 우리 생활 (습도·구름·바람·기단 완벽 정복)",
            desc: "호기심 많은 소년 민수와 날씨 요정 코코가 비행선을 타고 구름과 바람의 비밀을 찾아 떠나는 과학 탐험 이야기!",
            icon: "☁️",
            color: "#0284c7",
            bgGrad: "linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#38bdf8",
            link: "science_weather_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/2/science_weather_story_p1.jpg"
        },
        {
            id: "5_2_3_1",
            grade: "5-2",
            unit: "3단원",
            bookNum: "5권",
            title: "온도 탐험대 민수와 열의 이동 비밀",
            subtitle: "3단원 온도와 열 (온도계·전도·대류·복사·단열 완벽 정복)",
            desc: "호기심 많은 소년 민수와 과학 요정 모리가 함께 떠나는 신나는 열의 이동 과학 탐험 이야기!",
            icon: "🔥",
            color: "#ea580c",
            bgGrad: "linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
            border: "#ea580c",
            link: "science_temp_storybook.html",
            coverImg: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/science_temp_story_p1.png"
        }
    ];

    function renderScienceStorybookLibrary(innerBody) {
        if (!innerBody) return;
        innerBody.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h3 style="font-family: 'Jua', sans-serif; font-size: 1.4rem; color: #38bdf8; margin-bottom: 6px;">
                        📚 과학 단원 동화 도서관
                    </h3>
                    <p style="font-size: 0.95rem; color: #94a3b8;">
                        교과서 내용이 쏙쏙 이해되는 재미있는 동화와 성우 구연동화 음성을 만나보세요!
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
                    ${SCIENCE_STORYBOOK_LIBRARY.map(book => `
                        <div style="
                            background: ${book.bgGrad};
                            border: 2px solid ${book.border};
                            border-radius: 16px;
                            padding: 16px;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            gap: 12px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            transition: transform 0.2s, box-shadow 0.2s;
                        ">
                            <div style="display: flex; gap: 14px; align-items: flex-start;">
                                <img src="${book.coverImg}?v=20260902_1" alt="${book.title}" style="
                                    width: 90px;
                                    height: 120px;
                                    object-fit: cover;
                                    border-radius: 8px;
                                    border: 1px solid rgba(255,255,255,0.2);
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                                    flex-shrink: 0;
                                ">
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                                    <div style="display: flex; gap: 6px; align-items: center;">
                                        <span style="
                                            background: ${book.color};
                                            color: white;
                                            padding: 2px 8px;
                                            border-radius: 6px;
                                            font-size: 0.75rem;
                                            font-family: 'Jua', sans-serif;
                                        ">${book.bookNum}</span>
                                        <span style="font-size: 0.8rem; color: #94a3b8;">${book.grade}</span>
                                    </div>
                                    <h4 style="font-family: 'Jua', sans-serif; font-size: 1.15rem; color: white; margin: 2px 0;">
                                        ${book.title}
                                    </h4>
                                    <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.4; margin: 0;">
                                        ${book.subtitle}
                                    </p>
                                </div>
                            </div>

                            <p style="font-size: 0.83rem; color: #94a3b8; line-height: 1.45; margin: 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
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

    // 🌟 네임스페이스 공개
    window.ScienceStorybook = {
        library: SCIENCE_STORYBOOK_LIBRARY,
        renderLibrary: renderScienceStorybookLibrary
    };

    // 🌐 하위 호환성 전역 브리지
    window.SCIENCE_STORYBOOK_LIBRARY = SCIENCE_STORYBOOK_LIBRARY;
    window.renderScienceStorybookLibrary = renderScienceStorybookLibrary;

})();
