# 🔀 전 과목 객관식 보기 화면 섞기 공통화 (Antigravity 작업 지시)

> 목적: 노션·자료에 적힌 보기 순서와 상관없이, **아이 화면에서는 문제를 열 때마다 보기 순서가 새로 섞여** 나오게 한다. 정답 위치를 외워서 맞히는 것을 막고 보기 내용을 읽게 한다.
> 범위: 공부방 전 과목 객관식 화면 + 앞으로 만들 단원(공통 부품·규칙·시험으로 강제)
> 작업: Antigravity `gemini-4-hydrogen` / 검수: Claude Code
> 기준 문서: `GEMINI.md` §0·§4·§8, `kids/core/CORE_CATALOG.md`
> 작성: 2026-11-14 (Claude Code가 전 화면 조사 후 작성)

> **진행 (2026-11-14 완료)**: 1단계 `8cd7ba7` · 2단계 `6b2f011`+보완 `329a191` (agy Hydrogen 작성, Claude 검수) · 3·4단계 (agy Hydrogen 초안 → Claude 검토·반영). 2단계 보완에서 민서 미니 독해 문제 읽기를 조각 mp3로 바꿨고(§1-2 B2), 원래 오답을 기록하지 않던 화면에는 오답노트를 넣지 않기로 했다. 4단계 지킴이 시험이 조사에서 빠졌던 `clock_rules_logic.js`(이미 `MathQuizEngine.shuffleArray`로 섞음)를 찾아 허용 목록에 넣었다. 노션 기존 해설 점검(교재·사료 452행, 독해 48행): 보기 번호를 쓴 해설 없음(걸린 6곳은 그림 위치·교과서 문제 번호·출처 표시).

---

## 0. 배경과 원칙

- 2026-11-13 사회 3단원 22문항 중 17문항의 정답이 1번이었다. 사회방 「자료분석」은 노션 순서 그대로 보여 주므로, 아이가 「1번이 정답」을 배울 수 있었다(자료를 손으로 섞어 임시 해결).
- 5분 퀘스트는 이미 `quest_engine.js` `withShuffledOptions`로 매번 섞는다(2026-10-15). 과목방 화면은 제각각이다.
- **원칙**
  1. **노션·자료는 적힌 순서 그대로 둔다.** 부모가 폰에서 고치기 쉽고, `정답` 번호도 그대로다. 섞기는 **화면에 그릴 때만** 한다.
  2. **채점은 원래 보기 번호(또는 보기 글자)로 한다.** 섞은 뒤 화면 번호로 채점하지 않는다.
  3. **같은 문제를 다시 고를 때(틀려서 재시도)는 순서를 유지**하고, 그 문제를 새로 열 때 다시 섞는다.
  4. **화면에 붙는 번호와 읽어 주는 번호는 섞인 순서를 따른다.** 「1번, …」을 읽는 TTS·번호 배지는 보이는 순서와 같아야 한다.
  5. **해설·안내 글에 보기 번호를 쓰지 않는다**(「1번은 안창호…」 금지). 내용으로 말한다(「안창호는 미국에서 흥사단을…」).
  6. 순서가 뜻을 가지는 보기는 섞지 않는다(§2 「고정 순서」).

---

## 1. 화면 전수 조사 결과 (2026-11-14, `main` 기준)

### 1-1. 이미 섞는 화면 (손대지 않음, 단 §4-3 참고)
| 파일 | 방식 |
| :--- | :--- |
| `kids/subjects/quest/quest_engine.js` → `quest-ui-renderer.js` | `withShuffledOptions` (사회·과학 사료 문제 포함) |
| `kids/subjects/quest/quest-mastery.js` | 자체 `shuffle(list, rng)` |
| `kids/js/english_voca.js`, `english_phonics.js`, `korean_voca.js`, `society_voca.js` | 오답을 무작위로 뽑아 보기 생성 |
| `kids/subjects/math/js/congruence_symmetry-quiz.js` | `ui.shuffle` |
| `kids/subjects/math/gugudan.html`, `division_concept.html`, `fractions_decimals.html`, `js/length_time.js` | `sort(() => Math.random() - 0.5)` (치우친 섞기 — §4-3) |

### 1-2. 고칠 화면 (보기를 적힌 순서 그대로 보여 줌)
| # | 파일 (줄) | 자료 출처 | 채점 방식 | 비고 |
| :-: | :--- | :--- | :--- | :--- |
| A1 | `kids/js/society_chart.js` (62~63, 채점 `handleChoiceClick`→`verifyChoice`) | 노션 CURRICULUM_DB | `data-choice-index` 원래 번호 | 재시도 시 화면 유지(onRetry 없음) |
| A2 | `kids/js/science_lab.js` (185~187) | 노션 CURRICULUM_DB | `verifyChoice(i, correctIdx)` 번호 | |
| B1 | `kids/core/reading_engine.js` (398~401, 채점 518~) | 노션 LIBRARY_DB `문제데이터` | `chooseAnswer(cIdx)` 번호 / 글자 | 번호 배지 `choice-num-badge` |
| B2 | `kids/js/korean_mini_reading.js` (305, TTS 102, 정답 189~190) | 노션 LIBRARY_DB (민서) | `data-i` 번호 | **TTS가 「1번, …」을 읽음 → 섞인 순서로 읽어야 함** |
| B3 | `kids/js/science_report.js` (378~381 객관식) | 단원 보고서 자료 | 번호 | 354~의 빈칸 낱말 카드(`q.options`)는 B3-선택 |
| B4 | `kids/js/science_safety.js` (48~) | 안전 라이선스 자료 | 번호 | |
| B5 | `kids/subjects/science/js/science_season_airmass_lab.js` (342~347) | 실험실 내장 문제 | `checkQuiz(idx)` 번호 | `${idx + 1}.` 번호 표시 |
| C1 | `kids/subjects/math/planar_shapes.html` (371~) | 내장 문제 | `checkAnswer(c, q.ans)` **글자** | 순서만 섞으면 됨 |
| C2 | `kids/subjects/math/shape_movement.html` (432~) | 내장 문제 | 글자 | |
| C3 | `kids/subjects/math/js/shapes_logic.js` (324~) | 내장 문제 | 글자 | |

> 줄 번호는 작성 시점 기준이다. 작업 전에 다시 찾는다.

---

## 2. 공통 부품 계약: `window.QuizChoices`

**위치**: `kids/core/quiz-flow-controller.js` 안에 별도 블록(IIFE)으로 추가한다. 이 파일은 `core.js`가 자동으로 싣는 공통 퀴즈 모듈이라 과목방 어디서나 쓸 수 있다. 새 50~100줄 파일을 따로 만들지 않는다(GEMINI.md §8-0 나노 파편화 금지). 추가 후 파일이 800줄을 넘으면 안 된다(현재 589줄).

**순수 함수**(DOM·localStorage를 건드리지 않음). 노드 시험에서 DOM 없이 불러 쓸 수 있게 블록을 파일 맨 앞쪽에 두거나 DOM 초기화와 분리한다.

```js
window.QuizChoices = {
  // 보기 배열 → 화면에 그릴 순서. 각 칸은 { text, index } (index = 원래 번호, 0부터).
  // opts.fixed === true 이거나 isFixedOrder(choices)이면 원래 순서 그대로 돌려준다.
  // opts.rng: 시험용 난수 함수(기본 Math.random).
  arrange(choices, opts) { ... },

  // Fisher–Yates 섞기. 원본 배열은 바꾸지 않고 새 배열을 돌려준다.
  shuffle(list, rng) { ... },

  // 순서가 뜻을 가지는 보기인지 (true면 섞지 않음)
  isFixedOrder(choices) { ... }
};
```

**고정 순서(`isFixedOrder`) 규칙** — 하나라도 맞으면 섞지 않는다
1. 보기가 2개이고 둘 다 `O`/`X`, `○`/`×`, `예`/`아니요`, `맞다`/`틀리다` 짝이다.
2. 어떤 보기가 다른 보기를 가리킨다: `모두`, `모두 맞`, `모두 옳`, `없다`, `정답 없음`, `위의`, `①`~`⑤`, `ㄱ, ㄴ`, `가와 나` 같은 조합형.
3. 호출하는 쪽이 `opts.fixed: true`를 넘겼다(예: 순서 자체를 묻는 화면에서 개발자가 판단).
- 규칙에 맞는 낱말은 부품 안 상수 한 곳에만 둔다. 노션 사람용 글(제목·상세설명)을 파싱하는 것이 아니라 **보기 글자 자체**만 본다.

**쓰는 법 (화면 쪽)**
```js
const order = window.QuizChoices ? window.QuizChoices.arrange(choices) : choices.map((text, index) => ({ text, index }));
// 문제를 새로 열 때 한 번만 만들고, 재시도로 다시 그릴 때는 같은 order를 쓴다.
order.map((c, pos) => `<button data-choice-index="${c.index}">${pos + 1}. ${c.text}</button>`)
```
- `window.QuizChoices`가 아직 실리지 않았으면 원래 순서로 그린다(화면이 깨지지 않게).
- 번호 표시·TTS는 `pos`(보이는 순서), 채점·오답노트·학습일지는 `c.index`(원래 번호) 또는 `c.text`.

---

## 3. 작업 단계 (단계마다 커밋, **1단계 후 멈추고 보고**)

### 1단계 — 공통 부품 + 노션 문항 화면 2곳 (A1·A2)
1. `QuizChoices` 추가 (§2).
2. 시험 `tests/quiz-choices.test.mjs`
   - `arrange`가 모든 보기를 정확히 한 번씩 돌려주고 `index`가 원래 번호와 맞다.
   - 고정 순서 규칙 1·2·3 각각 원래 순서 유지.
   - 섞기 고름: 4지선다를 고정 난수(시드)로 4,000번 섞어 정답(0번 보기)이 각 위치에 18~32% 들어간다.
   - `rng`를 넘기면 결과가 재현된다. 원본 배열을 바꾸지 않는다.
3. A1 `society_chart.js`, A2 `science_lab.js`에 적용. 재시도 시 순서 유지 확인.
4. 확인
   - `node --test --test-concurrency=1 "tests/**/*.test.mjs"` → `fail 0` (이 PC는 동시 실행 시 메모리 부족)
   - `python -X utf8 ../scripts/verify_contracts.py --mode git-diff` → `[ALL PASS]`
   - 쓰기 차단 서버 `python scripts/guarded_preview_server.py`(8767)로 사회방 5-2 3-1 「자료분석」을 2번 열어 보기 순서가 달라지는지, 정답·오답 판정이 맞는지, 틀린 뒤 다시 고를 때 순서가 그대로인지 화면으로 확인
5. **여기서 멈추고 보고한다.** Claude Code가 검수한 뒤 2단계로 간다.

### 2단계 — 독해·과학 화면 (B1~B5)
- B1 `reading_engine.js`: 번호 배지를 보이는 순서로. 정답이 글자(`q.answer` 문자열)로 와도 원래 번호로 찾은 뒤 비교.
- B2 `korean_mini_reading.js`: **문제 읽어 주기(102줄 부근)를 섞인 순서로** 바꾼다. 「🔊 문제 다시 듣기」도 같은 순서.
- B3 `science_report.js` 객관식(378~). 빈칸 낱말 카드(354~)는 섞어도 되는지 화면을 보고 판단해 보고(섞으면 채운 빈칸 되돌리기 동작 확인).
- B4 `science_safety.js`, B5 `science_season_airmass_lab.js`.
- 화면마다 시험 1개 이상: 그린 HTML의 `data-*` 원래 번호와 정답 판정이 섞은 뒤에도 맞는지(기존 시험 파일이 있으면 거기에 더한다).

### 3단계 — 수학 내장 문제 화면 (C1~C3) + 치우친 섞기 정리
- C1~C3: 글자로 채점하므로 `QuizChoices.shuffle`로 순서만 섞는다.
- §1-1의 `sort(() => Math.random() - 0.5)` 보기 섞기 4곳을 `QuizChoices.shuffle`로 바꾼다(이 방식은 위치가 고르게 섞이지 않는다). **문제 순서를 섞는 곳**(예: `gugudan.html` 574줄 문제 10개 뽑기)도 같은 함수로 바꿔도 된다. 동작이 바뀌면 안 되는 곳은 그대로 두고 보고.

### 4단계 — 앞으로 만들 단원에도 강제되게
1. **지킴이 시험** `tests/quiz-choices-guard.test.mjs`: `kids/` 아래 `.js`·`.html`에서 보기를 그리는 코드(`choices.map(`, `options.map(`, `choices.forEach(`, `options.forEach(` 등)가 있는 파일은 `QuizChoices`를 쓰거나, 시험 안 **허용 목록**에 사유와 함께 있어야 통과한다.
   - 허용 목록 예: `quest-ui-renderer.js`(엔진이 이미 섞음), `*_voca.js`(무작위 오답 생성), `deprecated_backup/`, `legacy_backup/`, `kids/data/`.
   - 새 단원 화면을 만들면서 섞기를 빠뜨리면 이 시험이 실패한다.
2. **등록 도구 경고**: `scripts/register_curriculum.py` `validate_seed`/`check_schema` 단계에서 해설·쓰임새에 보기 번호(`[1-5]번`, `①~⑤`, `보기 [1-5]`)가 있으면 **경고**한다(멈추지는 않음). `scripts/test_register_curriculum.py`에 시험 1건 추가.
3. **노션 기존 문항 점검(읽기만)**: CURRICULUM_DB 전 과목, LIBRARY_DB `문제데이터`에서 해설에 보기 번호가 쓰인 행을 찾아 **목록만 보고**한다(쓰지 않음). 고칠지는 사용자 결정.
4. **규칙·문서**
   - `GEMINI.md` §4에 한 항목 추가 (아래 문안 그대로):
     > **5. 객관식 보기 화면 섞기 (`QuizChoices`)**: 모든 객관식 화면은 문제를 열 때마다 `window.QuizChoices.arrange`로 보기 순서를 섞어 그리고, 채점은 원래 보기 번호로 한다. 노션·자료의 보기 순서와 정답 위치는 신경 쓰지 않아도 된다. 해설에 보기 번호(「1번은…」)를 쓰지 않는다. 순서가 뜻을 가지는 보기는 부품이 알아서 고정한다. 새 화면은 `tests/quiz-choices-guard.test.mjs`를 통과해야 한다.
   - `kids/core/CORE_CATALOG.md`: `QuizChoices` 절(계약·쓰는 법·시험), 「회귀 시험 묶음」에 새 시험 2개.
   - `docs/society_spec.md`, `docs/science_spec.md`, `docs/korean_spec.md`, `docs/math_spec.md`: 객관식 화면 줄에 한 줄씩.
   - 스킬 `science-unit-builder`, `quest-engine-spec`: 새 화면을 만들 때 `QuizChoices` 사용 한 줄. 원본은 `.agent/skills/`에서 고치고 `python scripts/sync_agent_skills.py` → `--check` 통과.
   - `docs/society_5-2_unit3_spec.md` §0 표 아래에 「보기 순서는 화면이 섞는다(2026-11-14~)」 한 줄.

---

## 4. 주의

1. **채점이 흔들리면 안 된다.** 섞은 뒤 `pos`로 채점하는 실수가 가장 위험하다. 화면마다 정답 1번·오답 1번을 직접 눌러 본다.
2. **오답노트·학습일지**(`window.wrongNotes`, `rewardQuizCorrect` 등)에 들어가는 값은 원래 번호나 보기 글자다. 보이는 번호를 저장하지 않는다.
3. **치우친 섞기**: `sort(() => Math.random() - 0.5)`는 고르게 섞지 못한다. 새 코드에서 쓰지 않는다.
4. 노션 쓰기 금지(4단계-3은 읽기만). 화면 확인은 쓰기 차단 서버로만.
5. 파일 줄 수 800 미만 유지, 상대 경로, 일회성 스크립트를 `scripts/`에 두지 않기.
6. 커밋 끝줄 `Agent: antigravity (gemini-4-hydrogen)`. 단계별로 나눠 커밋한다.

---

## 5. 보고 형식 (단계마다)

| 항목 | 내용 |
| :--- | :--- |
| 바꾼 화면 | 파일·줄, 채점 방식(번호/글자), 재시도 시 순서 유지 여부 |
| 고정 순서로 남은 문항 | 어느 화면의 어떤 보기가 규칙에 걸려 안 섞였는지 |
| 시험 | 명령과 결과 숫자(`pass`/`fail`), 새 시험 이름 |
| 화면 확인 | 확인한 주소와 무엇을 눌러 봤는지 (스크린샷 경로) |
| 못 한 것·판단 보류 | 솔직하게 |
