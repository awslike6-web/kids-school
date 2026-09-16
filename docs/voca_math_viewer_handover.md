# 📑 [업무 인계서] 용어사전방(voca.html) 수학 뷰어 고도화 및 데이터 동기화 작업

> **발신**: 수학 전담 대화방 (Math Room)  
> **수신**: 용어사전 전담 대화방 (Vocabulary Room)  
> **일자**: 2026-09-16  
> **목적**: 수학 문장제 지시어 번역소(`math_voca.html`)와 용어사전방(`voca.html`)의 Two-Track 시너지를 위한 **[수학 백과 데이터 동기화 + 용어사전방 자체 수학 전용 뷰어/딥링크 구축]** 인계

---

## 1. 인계 배경 및 필요성

1. **수학방 현황**:
   - 수학방에서는 초등 5-2 2단원 "분수의 곱셈" 및 초등 1~6학년 전 과정을 아우르는 **5단계 계통형 88제 「수학 문장제 지시어 번역소(`math_voca.html`)」** 구축을 완료했습니다.
   - 지시어 번역소는 **'실전 3지선다 카드 배틀'** 훈련형 UI로, 아이들이 지문을 보고 연산 기호(`+`, `-`, `×`, `÷`)를 떠올리는 반사 신경을 기르는 데 특화되어 있습니다.
2. **용어사전방(`voca.html`)과의 연계 필요성**:
   - 퀴즈를 풀다가 틀리거나 헷갈릴 때, **차분하게 교과서 공식과 정의를 복습하고, AI 요정 코코에게 자유롭게 질문을 던질 수 있는 백과사전(Reference)형 창구**가 필요합니다.
   - 하지만 현재 용어사전방(`kids/common_space/voca.html`, `voca_common.js`)은 주로 국어/사회/과학의 텍스트·한자 풀이 중심이어서, **수학 특유의 세로 분수(Vertical Fraction), 공식 하이라이트 박스, 수식 기호**를 보여주는 수학 전용 뷰어가 마련되어 있지 않습니다.
3. **분업 결정**:
   - 도메인 경계 가드 원칙에 따라, **용어사전방 자체의 UI/UX 뷰어 개선 및 노션 용어 데이터베이스 동기화**는 **[용어사전 전담 대화방]**에서 주도하여 완성도 높게 진행하기로 합의하였습니다.

---

## 2. 준비된 데이터 자산 및 리소스 현황

### ① 노션 VOCA DB (`375a27115b688038b686d3994ee12919`) 현황
- **현재 등록된 수학 카드**: **33건** (다각형 넓이 공식, 원주율, 약수/배수, 기본 평면/입체도형 등).
- **신규 보강 대기 중인 초등 핵심 수학 개념 18선 (총 51선 마스터 체계 완성)**:
  1. `이상과 이하 (●)` : 경계값 포함하는 범위 ($x \ge a$, $x \le b$) [5-2 1단원]
  2. `초과와 미만 (○)` : 경계값 미포함 범위 ($x > a$, $x < b$) [5-2 1단원]
  3. `올림과 버림` : 자리올림(+1) 및 버림(0 처리) 어림셈 [5-2 1단원]
  4. `반올림` : 0~4 버림, 5~9 올림 어림셈 [5-2 1단원]
  5. `분수의 곱셈 공식` : 분자끼리/분모끼리 곱, 대각선 미리 약분 [5-2 2단원 ⭐ 현재 단원]
  6. `전체의 몇 분의 몇` : 전체 양 × 분수 [5-2 2단원]
  7. `도형의 합동 (≡)` : 모양과 크기가 완전히 같아 포개었을 때 겹침 [5-2 3단원]
  8. `선대칭도형과 대칭축` : 한 직선을 접었을 때 완전히 겹침 [5-2 3단원]
  9. `점대칭도형과 대칭의 중심` : 180도 돌렸을 때 완전히 겹침 [5-2 3단원]
  10. `직육면체의 겨냥도` : 실선(보임 9개)과 점선(숨김 3개) [5-2 5단원]
  11. `직육면체의 전개도` : 모서리를 잘라 펼친 도면 (마주보는 면 평행/합동) [5-2 5단원]
  12. `각기둥` : 밑면 2개 평행·합동, 옆면 직사각형 [6-1 2단원]
  13. `각뿔` : 밑면 1개, 옆면 삼각형, 꼭짓점 모임 [6-1 2단원]
  14. `비와 기준량 (A : B)` : ':' 뒤의 기준량과 앞의 비교하는 양 [6-1 4단원]
  15. `평균 (Mean)` : 총합 ÷ 개수, 고른 대푯값 [5-2 6단원]
  16. `들이의 단위 (L와 mL)` : $1\text{L} = 1000\text{mL} = 1000\text{cm}^3$ [3-2 3단원]
  17. `무게의 단위 (g, kg, t)` : $1\text{kg} = 1000\text{g}$, $1\text{t} = 1000\text{kg}$ [3-2 3단원]
  18. `사칙혼합 계산의 순서` : ( ) 괄호 ➔ 곱셈/나눗셈 ➔ 덧셈/뺄셈 [5-1 1단원]

### ② 준비된 파이썬 동기화 스크립트
- **파일 경로**: `G:\master-tower\scripts\sync_math_voca_notion.py`
- **역할**: 위 18개 신규 수학 용어를 노션 VOCA DB에 중복 검사 후 안전하게 생성(POST).
- **실행 방법**: `python scripts/sync_math_voca_notion.py` (용어방 대화방에서 확인 후 실행).

---

## 3. 용어사전 대화방(수신자) 주요 작업 과제 (Tasks)

### Task 1. 노션 데이터베이스 최신화 실행
- `scripts/sync_math_voca_notion.py`를 실행하여 18개 수학 카드를 노션 DB에 등록 완료.
- 결과 검증: [지식 도서관(`voca.html`)](https://awslike6-web.github.io/kids-school/kids/common_space/voca.html)에서 **[수학]** 필터를 눌렀을 때 총 51개의 풍부한 수학 개념 카드가 표시되는지 확인.

---

### Task 2. 딥링크 URL 쿼리 파라미터 수신 기능 장착 (`voca_common.js`)
수학방 지시어 번역소나 로비 등 외부에서 특정 수학 단어를 지정하여 들어왔을 때, 즉시 해당 단어를 찾아 보여주도록 지원합니다.

* **수정 파일**: `kids-school-main/kids/common_space/voca_common.js`
* **호출 URL 규격**:
  - `kids/common_space/voca.html?subject=수학&search=사다리꼴`
  - 또는 `kids/common_space/voca.html?word=직육면체의 겨냥도`
* **구현 로직 제안**:
  ```javascript
  // fetchLibraryData() 완료 후 실행 (약 lines 80-85 부근)
  const urlParams = new URLSearchParams(window.location.search);
  const targetSubj = urlParams.get('subject');
  const targetSearch = urlParams.get('search') || urlParams.get('word');

  if (targetSubj) {
    selectedSubjects = [targetSubj];
    // 과목 버튼 active 클래스 갱신
  }
  if (targetSearch) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = targetSearch;
  }
  updateStatusAndFilter();

  // 만약 정확히 일치하는 단어가 있다면 모달 자동 오픈 (선택사항)
  if (targetSearch) {
    const matched = allDictionaryWords.find(w => w.word === targetSearch || w.word.includes(targetSearch));
    if (matched) {
      setTimeout(() => openModal(matched), 150);
    }
  }
  ```

---

### Task 3. 수학 전용 뷰어 (Math Viewer) UI/UX 고도화 (⭐ 핵심)

사회나 국어와 달리 수학 용어는 **수식과 분수의 가독성**이 생명입니다. `voca.html` 모달 팝업 내부를 다음과 같이 보강해 주시면 최고입니다:

1. **세로 분수(Vertical Fraction) 렌더링 지원**:
   - 슬래시(`3/4`, `1/2`) 표기를 금지하고 정품 세로 분수를 지원합니다.
   - 수학방 표준 CSS 규격:
     ```css
     .inline-frac {
       display: inline-flex;
       flex-direction: column;
       vertical-align: middle;
       text-align: center;
       padding: 0 4px;
       font-size: 1.05em;
       line-height: 1.1;
       font-weight: 700;
     }
     .inline-frac .num { display: block; padding-bottom: 2px; }
     .inline-frac .bar {
       display: block;
       border-top: 2px solid currentColor;
       height: 0;
       width: 100%;
       min-width: 16px;
       margin: 2px 0;
     }
     .inline-frac .den { display: block; padding-top: 2px; }
     ```
   - 모달 뜻풀이나 상세설명 렌더링 시, `renderFrac()` 헬퍼나 정규식을 통해 `(\d+)/(\d+)` 형태를 자동으로 `<span class="inline-frac">...</span>` 컴포넌트로 변환하거나 HTML 허용.

2. **공식 및 수식 하이라이트 블록 (`modalDetailContext`)**:
   - `detailContext`에 등호(`=`)나 화살표(`➔`, `•`)가 포함된 문장은 일반 줄글과 구분되도록 **수식 전용 미니 칠판/카드 박스(배경색, 둥근 모서리, 산뜻한 테두리)**로 감싸서 가독성을 극대화.

3. **기존 인터랙티브 시뮬레이터 연동 상태 점검**:
   - 이미 `interactives/` 폴더에 구비된 사다리꼴(`trapezoid_area.html`), 평행사변형(`parallelogram_area.html`), 삼각형(`triangle_area.html`), 마름모(`rhombus_area.html`) 시뮬레이터가 수학 카드 모달 내 `modalInteractiveFrame`에 정확히 임베드되는지 점검.

---

### Task 4. AI 코코 질의응답 시스템 프롬프트의 수학 최적화
- `voca_common.js`의 AI 요정 코코 시스템 프롬프트에:
  > *"학생이 수학 과목 카드를 보고 질문할 때는, 기계적인 정의 대신 초등 5학년 민수(인지/어휘 발달 배려)의 눈높이에 맞추어 사탕이나 피자, 케이크 같은 실생활 비유를 들어서 친절하고 쉽게 설명해줘."*
  라는 컨텍스트 가이드를 주입.

---

## 4. 수학방(발신자)의 후속 조치 약속

용어사전 대화방에서 위의 딥링크(`?subject=수학&search=...`) 장착을 완료해 주시면, 수학방에서는:
1. **`kids/subjects/math/math_voca.html` (문장제 지시어 번역소)**의 피드백 해설 카드에:
   ```html
   <a href="../../common_space/voca.html?subject=수학&search=${encodeURIComponent(conceptTitle)}" target="_blank" class="btn-goto-voca">
     📖 용어사전에서 공식/개념 깊이 보기 ↗
   </a>
   ```
   버튼을 장착하여 매끄럽게 연결을 마무리하겠습니다.

---

**인계서 작성자**: Master Tower 수학 전담 개발 에이전트  
**문의/참조 파일**:
- `G:\master-tower\kids-school-main\docs\math_spec.md`
- `G:\master-tower\scripts\sync_math_voca_notion.py`
- `G:\master-tower\kids-school-main\kids\subjects\math\math_voca.html`
