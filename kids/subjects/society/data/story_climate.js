// ========================================================
// 📖 민수와 친구들의 지구 지키기: 기후 수업 대모험 데이터 모듈 (society_climate.js)
// ========================================================
window.STORY_BOOK = {
  id: "society_climate",
  title: "민수와 친구들의 지구 지키기: 기후 수업 대모험",
  icon: "🌍",
  themeColor: "#10b981",
  themeColorDark: "#059669",
  backUrl: "society.html",
  backLabel: "🔙 사회 탐구실",
  imgBase: "images/storybook/climate/",
  version: "20260902_climate",
  pages: [
        {
            page: 1,
            tag: "🌟 표지 : 민수와 친구들의 지구 지키기",
            spreadImg: "climate_story_p1.png",
            illImg: "climate_ill_p1.png",
            textHtml: null,
            audio: "../../assets/audio/storybook/climate/climate_story_p1.mp3"
        },
        {
            page: 2,
            tag: "🌤️ 1장 : 날씨와 기후의 차이점 (61쪽)",
            spreadImg: "climate_story_p2.png",
            illImg: "climate_ill_p2.png",
            textHtml: `
                <div class="webtoon-passage">
                    햇살이 따스한 교실, <b>민수</b>가 손을 번쩍 들고 물었어요. 
                    "선생님, 오늘 날씨가 좋다는 말과 기후가 좋다는 말은 같은 건가요?" 
                    선생님은 미소를 지으며 <b>기온, 강수량, 바람</b>이 그려진 기후 자료를 보여주셨어요. 
                    날씨는 짧은 시간의 기분 같은 것이고, 기후는 오랜 시간 동안 나타나는 그 지역의 성격 같은 것이라고 설명해 주셨죠.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 기후와 날씨의 정의 및 차이 (61쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p2.mp3"
        },
        {
            page: 3,
            tag: "🌬️ 2장 : 계절마다 부는 바람의 성질 (63쪽)",
            spreadImg: "climate_story_p3.png",
            illImg: "climate_ill_p3.png",
            textHtml: `
                <div class="webtoon-passage">
                    "그럼 우리나라 바람은 왜 계절마다 다를까요?" 이번에는 <b>동원이</b>가 궁금해했어요. 
                    선생님은 바람의 방향이 표시된 지도를 가리키며 말씀하셨어요. 
                    <b>여름에는 바다(남동쪽 ↖)에서 덥고 습한 바람</b>이 오고, <b>겨울에는 육지(북서쪽 ↘)에서 차갑고 건조한 바람</b>이 불어와 우리 삶에 큰 영향을 준다는 사실을요.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 계절별 바람의 특징과 성질 (63쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p3.mp3"
        },
        {
            page: 4,
            tag: "🌡️ 3장 : 남북의 기온 차이와 위도 (64~65쪽)",
            spreadImg: "climate_story_p4.png",
            illImg: "climate_ill_p4.png",
            textHtml: `
                <div class="webtoon-passage">
                    <b>승아</b>는 북쪽 끝 <b>중강진</b>과 남쪽 끝 <b>서귀포</b>의 기온이 왜 그렇게 다른지 물었어요. 
                    선생님은 남북으로 길게 뻗은 우리나라의 지형을 보여주셨죠. 
                    <b>위도</b>에 따라 태양 에너지를 받는 양이 달라 남쪽으로 갈수록 따뜻하고 북쪽으로 갈수록 추워진다는 원리를 함께 탐구했답니다.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 우리나라의 남북 기온 차이와 위도 (64~65쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p4.mp3"
        },
        {
            page: 5,
            tag: "🌧️ 4장 : 강수량 특징과 지역별 차이 (66~67쪽)",
            spreadImg: "climate_story_p5.png",
            illImg: "climate_ill_p5.png",
            textHtml: `
                <div class="webtoon-passage">
                    비와 눈에 관심이 많은 <b>민준이</b>는 지역별 강수량 지도를 유심히 살폈어요. 
                    우리나라는 여름철에 비가 집중되고, 지형의 영향으로 <b>강릉이나 제주도</b>처럼 비가 유독 많이 오는 다우지가 있다는 것을 알게 되었죠. 
                    민준이는 복잡한 막대 그래프 속에서 우리나라 강수량의 비밀을 찾아냈어요.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 강수량 특징과 지역별 차이 (66~67쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p5.mp3"
        },
        {
            page: 6,
            tag: "⚡ 5장 : 계절별 자연재해의 이해 (68~69쪽)",
            spreadImg: "climate_story_p6.png",
            illImg: "climate_ill_p6.png",
            textHtml: `
                <div class="webtoon-passage">
                    <b>래호</b>는 계절마다 찾아오는 <b>황사, 폭염, 태풍, 폭설</b> 사진을 보고 조금 겁이 났어요. 
                    선생님은 래호의 어깨를 토닥이며, 이런 자연재해가 왜 발생하는지 이해하면 피해를 줄일 수 있다고 용기를 주셨어요. 
                    자연의 힘은 무섭지만, 우리가 잘 대비한다면 이겨낼 수 있는 문제니까요.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 계절별 발생하는 자연재해의 종류 (68~69쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p6.mp3"
        },
        {
            page: 7,
            tag: "🛡️ 6장 : 재난 안전 행동 요령 (70쪽)",
            spreadImg: "climate_story_p7.png",
            illImg: "climate_ill_p7.png",
            textHtml: `
                <div class="webtoon-passage">
                    "우리가 재해로부터 안전해지려면 어떻게 해야 할까요?" <b>민수</b>가 다시 씩씩하게 질문했어요. 
                    선생님은 <b>국민재난안전포털</b>에 접속해 상황별 행동 요령을 미리 익히는 것이 얼마나 중요한지 강조하셨어요. 
                    기상 특보에 귀를 기울이고 미리 준비하는 마음가짐이 우리를 안전하게 지켜준답니다.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 재난 안전 국민 행동 요령 (70쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p7.mp3"
        },
        {
            page: 8,
            tag: "🌍 7장 : 지구 온난화의 심각성 (73쪽)",
            spreadImg: "climate_story_p8.png",
            illImg: "climate_ill_p8.png",
            textHtml: `
                <div class="webtoon-passage">
                    <b>세윤이</b>는 점점 뜨거워지는 <b>지구 온난화 기온 상승 그래프</b>를 보고 깜짝 놀랐어요. 
                    예전보다 여름은 길어지고 겨울은 짧아지는 기후 변화가 우리 주변에서 실제로 일어나고 있었거든요. 
                    선생님은 이 모든 변화가 지구가 우리에게 보내는 간절한 구조 신호라고 말씀해 주셨어요.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 기후 변화와 지구 온난화의 심각성 (73쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p8.mp3"
        },
        {
            page: 9,
            tag: "⚠️ 8장 : 심해지는 이상 기후와 피해 (74~75쪽)",
            spreadImg: "climate_story_p9.png",
            illImg: "climate_ill_p9.png",
            textHtml: `
                <div class="webtoon-passage">
                    <b>민준이</b>는 뉴스 기사를 통해 기후 변화가 가져온 무서운 피해 현장을 확인했어요. 
                    기록적인 <b>폭염으로 농작물이 마르고, 갑작스러운 호우로 도로가 침수</b>되는 이상 기후 사례들이 많았죠. 
                    선생님은 기후 변화가 우리 일상을 어떻게 위협하는지 차근차근 설명하며 경각심을 일깨워 주셨어요.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 심해지는 이상 기후와 피해 사례 (74~75쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p9.mp3"
        },
        {
            page: 10,
            tag: "🌱 9장 : 우리가 실천할 기후 행동 (78쪽)",
            spreadImg: "climate_story_p10.png",
            illImg: "climate_ill_p10.png",
            textHtml: `
                <div class="webtoon-passage">
                    마지막으로 <b>민수</b>는 학교와 집에서 실천할 수 있는 <b>기후 행동 리스트</b>를 작성했어요. 
                    채식 급식을 맛있게 먹고, 빈 교실의 전등을 끄는 작은 행동이 지구를 살리는 큰 힘이 된다는 것을 깨달았죠. 
                    나중에 기상을 정확히 읽어내는 <b>예보 분석관</b>이 되어 지구를 지키고 싶다는 민수의 꿈을 선생님은 환한 미소로 응원해 주셨답니다.
                </div>
                <div class="webtoon-ref-badge">📖 교과서 연계 : 기후 행동 실천과 관련 직업 (78쪽)</div>
            `,
            audio: "../../assets/audio/storybook/climate/climate_story_p10.mp3"
        }
    ]
};
