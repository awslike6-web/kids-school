// ==========================================
// 🗺️ 사회 교과 데이터 스켈레톤 (society-data.js)
// ==========================================
// 💡 [클린 아키텍처 Headless CMS 원칙]
// 전체 사회 교과 콘텐츠는 노션 CURRICULUM_DB / VOCA_DB에서 실시간 동적 송출됩니다.
// 본 파일은 네트워크 오프라인 시 UI 깨짐을 방어하기 위한 최소 스켈레톤 및 목업 데이터입니다.

const SOCIETY_CURRICULUM_DATA = {
  "5학년 1학기": {
    "1-1. 우리나라의 지형": {
      "unitTitle": "1-1. 우리나라의 지형",
      "summaryPassage": "우리나라는 동쪽이 높고 서쪽이 낮은 동고서저 지형을 이루고 있습니다. 아름다운 산과 강, 평야가 조화를 이루며 독도와 소중한 영토를 함께 배웁니다.",
      "voca": [
        {
          "word": "지형",
          "hint": "ㅈㅎ",
          "desc": "산, 평야, 하천, 해안 등 땅의 생김새를 통틀어 지형이라고 합니다.",
          "meaning": "땅의 높낮이나 겉모양의 특징"
        },
        {
          "word": "동고서저",
          "hint": "ㄷㄱㅅㅈ",
          "desc": "우리나라 지형의 가장 큰 특징으로, 동쪽은 높고 서쪽은 낮음을 의미합니다.",
          "meaning": "동쪽은 높은 산지, 서쪽은 낮은 평야가 많은 지형"
        }
      ],
      "chart": [],
      "map": [],
      "history": []
    }
  }
};

const SOCIETY_MOCK_DATA = {
  voca: [
    { word: "중심지", hint: "ㅈㅅㅈ", desc: "사람들이 활동을 하거나 여러 가지 필요를 해결하기 위해 자주 모이는 핵심적이고 중심이 되는 장소입니다. 도청, 시청, 큰 시장 등이 발달한 곳이랍니다!", meaning: "사람들이 많이 모이는 곳", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500&auto=format&fit=crop" },
    { word: "공공기관", hint: "ㄱㄱㄱㄱ", desc: "개인의 이익이 아니라 우리 동네 전체의 생활 편의와 복지를 위해 설립된 공공 보증 기관입니다. 예: 경찰서, 소방서, 동주민센터 등이 속해요.", meaning: "모두를 위한 기관" },
    { word: "공해", hint: "ㄱㅎ", desc: "공장이나 자동차 등에서 나오는 매연, 먼지, 폐수 등으로 인해 우리 자연환경이 오염되거나 주민들의 건강을 훼손시키는 심각한 환경 피해를 말합니다.", meaning: "환경 오염 피해" }
  ],
  chart: [
    { 
      title: "지역별 인구 변화 도표",
      img: "https://raw.githubusercontent.com/awslike6/images/main/chart1.png",
      desc: "이 막대 그래프형 인구 도표를 보면 2010년에 비해 현재 우리 시의 어린이 비율은 줄고, 어르신 인구 비율이 가파르게 증가했음을 볼 수 있어요.",
      quiz: "도표에 따르면, 2010년과 비교할 때 가장 전형적으로 늘어난 주 연령층은 무엇일까요?",
      choices: ["어린이 연령층", "청장년 경제인구", "65세 이상 노인 어르신", "신생아 출생 비율"],
      correctIdx: 2
    },
    { 
      title: "중심지 교통량 도표",
      img: "https://raw.githubusercontent.com/awslike6/images/main/chart2.png",
      desc: "이 도표는 중심지별 하루 유입 수단 비중을 수치화한 것입니다. 대중교통(지하철, 버스)을 타고 유입되는 비중이 도보 유입의 4배가 넘습니다.",
      quiz: "위 자료를 바탕으로 분석한 생각 중 맞지 않는 의견은 무엇일까요?",
      choices: ["이 지역은 교통이 편리하게 잘 구축되어 있다.", "대중교통을 타는 손님 비중이 높은 편이다.", "지하철과 버스역 근처가 특히 발달할 것이다.", "모든 사람이 차를 끌고 다니므로 교통 정체가 없을 것이다."],
      correctIdx: 3
    }
  ],
  map: [
    { name: "백두산 천지", img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=700&auto=format&fit=crop", desc: "한반도에서 가장 높고 장엄한 산인 백두산 정상에 위치한 화산호 천지입니다. 하늘의 연못이라 불릴 만큼 푸르고 웅장하며 하늘 빛깔을 가득 담고 있답니다." },
    { name: "독도", img: "https://images.unsplash.com/photo-1610992015762-466afb70fd45?w=700&auto=format&fit=crop", desc: "대한민국 동쪽 가장 끝자락에서 홀로 우리 동해 영토를 지키고 있는 화산 섬입니다. 맑은 날 울릉도에서 맨눈으로 볼 수 있는 아름다운 우리 국토의 심장입니다." },
    { name: "제주도 성산일출봉", img: "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=700&auto=format&fit=crop", desc: "제주도 동쪽에 우뚝 솟아 있는 거대한 성 모양의 화산 봉우리입니다. 바닷속에서 화산이 분출하며 만들어진 세계 자연 유산으로, 해돋이 전경이 매우 찬란합니다." }
  ],
  history: [
    { name: "경주 첨성대", img: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=500&auto=format&fit=crop", desc: "신라 선덕여왕 때 축조된 동양에서 가장 오래된 유서 깊은 천문 관측소입니다. 별자리의 움직임을 관찰해 농사기와 기후를 미리 파악했던 조상들의 지혜가 깃든 유적입니다." },
    { name: "무령왕릉 석수", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop", desc: "백제 무령왕릉 수호신 역할을 하기 위해 무덤 앞을 듬직하게 지키고 선 돌짐승 조각상입니다. 국보이며, 무덤 속을 악귀로부터 지키려는 마음이 담겨있답니다." },
    { name: "빗살무늬 토기", img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop", desc: "신석기 시대 조상들이 곡식을 담아 보관했던 지혜로운 그릇입니다. 모래땅이나 흙속에 깊게 꽂을 수 있게 뾰족한 팽이 형태로 밑바닥을 과학적으로 디자인했답니다." }
  ]
};

if (typeof window !== 'undefined') {
  window.SOCIETY_CURRICULUM_DATA = SOCIETY_CURRICULUM_DATA;
  window.SOCIETY_MOCK_DATA = SOCIETY_MOCK_DATA;
}
