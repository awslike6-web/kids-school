# 🎧 영어 「듣고 끌어다 놓기」(Listen & Place) 제작 명세서

> **작업자**: 안티그래비티 · **검증·병합**: Claude Code
> **작업 브랜치**: `antigravity/english-listen-place` (main에 직접 커밋하지 않는다)
> **먼저 읽을 것**: `GEMINI.md`, `kids/core/CORE_CATALOG.md` §2-4(영어 엔진군, 특히 `english_unit_bar.js`), `docs/english_spec.md` §2-2

---

## 1. 목표

영어 문장을 듣고, 그 문장대로 물건을 알맞은 곳에 끌어다 놓는 특별 활동이다. 첫 판은 **5-2 8단원(외모·옷차림)** 「친구 옷 입혀 주기」다.

- 민수 담임 선생님의 **클래스 카드 문장**(노션 VOCA_DB `5-2 · L8` 문장)을 그대로 듣고 연습한다.
- 엔진 하나로 단원을 넓힌다: 8단원 옷 입히기 → 9단원 방에 가구 놓기("There is a sofa in the living room.") → 11단원 지도에서 길 찾기. **이번 작업은 8단원 장면(dressup)만 만든다.** 다만 장면을 갈아 끼울 수 있게 엔진과 장면을 나눈다(§4).
- 원래 백로그의 「Catch the Impostor」는 따로 만들지 않고, 이 엔진의 **마지막 판**(§5-4)으로 합친다.

## 2. 영어방에 붙는 방법 (이미 만들어져 있음)

영어방 대기실에서 학기·단원 칩으로 `5-2 · 8단원`을 고르면 「⭐ 이번 단원 특별 활동」 칸이 생긴다. 칸의 카드는 등록표 한 줄로 만든다.

```js
// kids/subjects/english/data/english_unit_activities.js 에 이 한 줄만 추가
{ grade: '5-2', unit: 'L8', icon: '👕', title: '친구 옷 입혀 주기', desc: '문장을 듣고 옷과 머리를 끌어다 입혀요', href: 'listen_place.html', scene: 'data/listen_place_5-2_L8.js' }
```

카드를 누르면 `listen_place.html?grade=5-2&unit=L8`이 열린다. 화면은 등록표에서 같은 `grade`·`unit` 줄을 찾아 `scene` 파일을 불러온다. 주소 값을 그대로 파일 이름으로 만들지 않는다. 등록표에 없는 값이면 "준비 중인 단원이에요" 안내와 영어방 돌아가기 단추를 보여 준다.

## 3. 만들 파일과 건드려도 되는 범위

| 파일 | 내용 | 줄 수 |
| :--- | :--- | :--- |
| `kids/subjects/english/listen_place.html` (새 파일) | 얇은 래퍼. 공통 스크립트 로드, 주소의 grade·unit 읽기, 등록표에서 scene 찾기, 엔진 시작 | 100줄 안팎 |
| `kids/js/english_listen_place.js` (새 파일) | 엔진: 문제 순서, 듣기, 끌어다 놓기·누르기 입력, 채점, 보상·일지 (`window.EnglishListenPlace`) | 300~600 |
| `kids/js/english_listen_place_dressup.js` (새 파일) | 8단원 장면: 인물 SVG 그리기, 부위(slot)별 놓는 자리, 물건 목록 (`EnglishListenPlace.registerScene('dressup', …)`) | 300~600 |
| `kids/subjects/english/data/listen_place_5-2_L8.js` (새 파일) | 8단원 문제 데이터 (§6) | 짧게 |
| `kids/css/english_listen_place.css` (새 파일) | 화면 스타일 | 300줄 이하 |
| `tests/english-listen-place.test.mjs` (새 파일) | 회귀 시험 (§8) | |
| `kids/subjects/english/data/english_unit_activities.js` | **위 한 줄 추가만** | |
| `kids/core/CORE_CATALOG.md` §2-4, `docs/english_spec.md` §2-2 | 새 모듈 등록, "제작 예정" → 실제 사용법 | |

**건드리지 않는다**: `english.html`, `kids/js/english_common.js`(이미 792줄, 상한 800줄), `kids/js/english_unit_bar.js`, 다른 과목 파일. 고쳐야 할 것 같으면 고치지 말고 보고서에 적는다.

## 4. 엔진과 장면 나누기

```
EnglishListenPlace (엔진)                     장면 (dressup / 나중에 room·map)
- 문제 데이터 읽기, VOCA 문장 붙이기            - stage 그리기(인물 SVG)
- 문장 듣기(speakEnglish), 뜻 보기 단추          - 놓는 자리(slot) 목록과 위치
- 물건 받침대(tray) 만들기, 끌기·누르기 입력       - 물건(item) 모양 그리기
- 맞는지 확인, 에러리스 안내, 보상·일지            - 놓인 물건 그리기(applyItem)
```

장면은 `registerScene(name, { renderStage(container, who), slots, renderItem(item), applyItem(stageEl, slot, item), reset(stageEl) })` 같은 꼴로 엔진에 등록한다. 엔진은 장면 이름만 알고 그림 내용은 모른다.

## 5. 화면 흐름 (8단원)

1. **시작 카드**: 제목, "문장을 잘 듣고 친구를 꾸며 주세요", 시작 단추. 말하기 속도는 영어방과 같은 값(`getEnglishSpeechRate()`).
2. **한 문제**:
   - 기본 인물(남자/여자, 데이터의 `who`)이 무대에 서 있다.
   - 문장이 자동으로 한 번 나온다(`speakEnglish(text)`). 🔊 다시 듣기, 💬 뜻 보기(한국어 뜻은 누를 때만) 단추.
   - 아래 받침대에 물건 4개(정답 + 같은 부위의 다른 물건 3개). 부위가 둘인 문장("He has short curly hair and green eyes.")은 정답 2개 + 오답 2개.
   - 물건을 인물 쪽으로 끌어다 놓는다. **누르기만으로도 된다**: 물건을 누르면 그 부위 자리에 바로 입혀진다(폰·저학년용).
3. **맞으면**: 인물에 물건이 입혀지고 `fairyPraise()`, 문장 아래에 영어 문장 전체를 보여 준다. 정답 부위를 다 채우면 다음 문제 단추.
4. **틀리면 (에러리스, 퀘스트와 같은 규칙)**: 하트·감점 없음. 물건은 제자리로 돌아가고, 정답 물건에 노란 테두리 안내, `fairyEncourage()`. 문장을 한 번 더 들려준다.
5. **마지막 판 「친구를 찾아라!」(Catch the Impostor 흡수)**: 앞에서 꾸민 인물 중 3명을 나란히 세우고, 두 부위가 들어간 문장("She has long straight hair and blue eyes.")을 들려준 뒤 맞는 친구를 고른다. 문제 데이터에 `finale: true`인 문장을 쓴다. 이 판도 에러리스.
6. **완주**: `fairyReward()`, 결과 카드(맞힌 문장 목록 + 다시 듣기), 영어방 돌아가기.

한 판은 6문제 + 마지막 판 1문제. 문제는 매번 섞는다.

## 6. 문제 데이터 계약 (하드코딩 금지 규칙 지키기)

문장 글자와 뜻은 **노션 VOCA_DB에서 실시간으로 읽는다.** 데이터 파일에는 VOCA 행의 `page_id`와 "무엇을 어디에 입히는지"만 적는다. 문장을 정규식으로 쪼개서 부위를 알아내지 않는다(헌법 §8-5).

```js
// kids/subjects/english/data/listen_place_5-2_L8.js
window.LISTEN_PLACE_SCENE = {
  scene: 'dressup',
  grade: '5-2',
  unit: 'L8',
  items: [   // 받침대에 나올 물건 전체 목록 (부위별 오답도 여기서 뽑는다)
    { id: 'hair-long-straight', slot: 'hair', label: 'long straight hair' },
    { id: 'hair-long-curly',    slot: 'hair', label: 'long curly hair' },
    { id: 'eyes-blue',          slot: 'eyes', label: 'blue eyes', color: '#3b82f6' },
    { id: 'cap-red',            slot: 'head', label: 'red cap', color: '#ef4444' },
    // ...
  ],
  questions: [
    { pageId: '<VOCA page_id>', who: 'she', answer: ['hair-long-straight'] },
    { pageId: '<VOCA page_id>', who: 'he',  answer: ['hair-short-curly', 'eyes-green'] },
    { pageId: '<VOCA page_id>', who: 'she', answer: ['hair-long-straight', 'eyes-blue'], finale: true },
    // ...
  ]
};
```

- **page_id 찾기**: 쓰기 차단 미리보기 서버(`python scripts/guarded_preview_server.py`)로 `english.html`을 열고 콘솔에서 아래를 실행해 `5-2 · L8` 문장 행의 `pageId`를 복사한다.
  ```js
  (await fetchVocaFromNotion({ subject: '영어', filterByStudent: false }))
    .filter(r => (r.grades||[]).includes('5-2') && r.level === 'L8' && r.wordType === '문장')
    .map(r => `${r.pageId} | ${r.word}`).join('\n')
  ```
- **넣을 문장**: 입히기로 보여 줄 수 있는 문장만 넣는다. 지금 노션에 있는 8단원 문장 중 해당하는 것: wearing(black skirt, blue pants, yellow T-shirt, red cap, glasses, red skirt), has … eyes(green·blue·brown), has … hair(long/short × straight/curly), 두 부위 문장 2개. "What does she look like?"·"Find your friend!"·"I don't know her." 같은 문장은 넣지 않는다.
- **노션에서 행이 사라졌거나 page_id가 안 맞으면** 그 문제는 건너뛰고 콘솔에 경고만 남긴다. 남은 문제가 3개보다 적으면 "문장을 불러오지 못했어요" 안내를 보여 준다.

## 7. 그림 규칙

- 인물과 옷·머리·눈·모자·안경은 **코드로 그리는 SVG**로 만든다(색은 데이터의 `color`). 외부 그림 파일을 새로 만들지 않아도 되게 하는 것이 목적이다.
- 교과서 사진을 잘라 쓰지 않는다. 억지로 채울 그림이 필요하면 비워 두고 보고한다(헌법 §5-1).
- 민수(마인크래프트 어두운 테마)·민서(슬라임 밝은 테마) 둘 다에서 잘 보이게 한다. 폰 폭 375px에서 가로 스크롤이 생기지 않아야 한다.

## 8. 공통 규칙 체크

- 소리: `speakEnglish`·`fairyPraise`·`fairyEncourage`·`fairyReward`만 쓴다. `speechSynthesis` 직접 호출 금지. 로드 순서는 `CORE_CATALOG.md` §1(fairy-config → fairy-tts → fairy-engine).
- 보상·일지: 영어방 2~4단계와 같은 함수(`initQuizRewardSession`·`rewardQuizCorrect`·`finalizeQuizRewardSession`, 학습일지는 `english_common.js`의 `finalizeEnglishMissionImmediately` 흐름 참고)를 쓴다. 새 보상 방식을 만들지 않는다. 일지 과목 이름은 `영어(L8)`.
- 경로: 모든 `<script>`·`<link>`·`<a>`는 상대 경로. 루트 절대 경로(`/kids-school/...`) 금지.
- 날짜가 필요하면 로컬 날짜 헬퍼를 쓴다(`toISOString().slice(0,10)` 금지).
- 전역 변수는 `window.EnglishListenPlace` 하나만 만든다(IIFE).

## 9. 검증과 완료 기준

1. `node --test "tests/**/*.test.mjs"` 전부 통과. 새 시험 `tests/english-listen-place.test.mjs`에는 최소한 아래를 넣는다:
   - 등록표에 없는 grade·unit이면 장면을 불러오지 않는다
   - page_id가 VOCA에 없는 문제는 건너뛴다
   - 받침대 물건은 정답을 포함해 4개, 오답은 정답과 같은 부위에서 뽑는다
   - 틀린 물건을 놓아도 하트·점수가 줄지 않고 정답 안내가 켜진다
   - 두 부위 문장은 두 개를 다 놓아야 다음으로 넘어간다
2. `python -X utf8 scripts/verify_contracts.py --mode git-diff` → `[ALL PASS]`.
3. 쓰기 차단 미리보기 서버에서 민수·민서 각각 영어방 → 5-2 → 8단원 → 특별 활동 카드 → 한 판 끝까지. 폰 폭(375px)에서도 한 판. 끌어다 놓기와 누르기 둘 다.
4. 화면 사진(데스크톱 1장, 폰 폭 1장)과 확인 내용을 `docs/walkthrough.md`에 적는다.
5. 커밋 메시지 끝에 `Agent: antigravity (gemini-3.8-flash)` 또는 `Agent: antigravity (gemini-4-argon)` (관제탑 `scripts/agent_commit_rules.json` 목록 그대로). 브랜치를 푸시하고 **main 병합은 하지 않는다.** Claude Code가 검증한 뒤 `--no-ff`로 병합하고 병합 커밋에 `교정:` 줄을 남긴다 (관제탑 `docs/AGENT_COMMIT_PROTOCOL.md` §4).

## 10. 보고 형식

- 만든 파일과 줄 수
- 넣은 문장 수와 뺀 문장(이유)
- 위 9번 항목별 결과 (실제로 해 본 것만 "확인"이라고 쓴다)
- 못 한 것, 건드리지 말라는 파일을 고쳐야 할 것 같은 곳
