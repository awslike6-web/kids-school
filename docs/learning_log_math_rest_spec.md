# 남은 수학 화면 4곳 문항기록 연결 작업 지시서 (안티그래비티 네온 주도 · Claude Opus 교차 검토)

> 작성 2026-11-23 · 작성 Claude Code · 실행 안티그래비티 **Gemini 4 Neon (High)**
> 위험도: `kids/subjects/math/` 화면 JS만 바꾸고 보이는 모양은 그대로라 **L1-리팩터**(자동 관문만 필수). 다만 이번에는 **모델 비교 시험**이라 지난 학습설정 작업(아르곤 하이, 커밋 `24d8636`)과 같은 절차로 Opus 검토 두 번을 받는다.
> 근거: `docs/learning_record_spec.md` §5 「알려진 한계」의 마지막 줄 — 도형·100까지 수·CPA 연산·시계 화면은 아직 연결 안 함.

## 1. 왜 하나
문항기록(`LearningLog`, 노션 STUDY_LOG_DB `문항기록` 칸)은 1~3차에서 퀘스트·독해·과목방·세로셈·구구단·탐험관까지 붙었다. 민서가 많이 쓰는 1학년 수학 화면 4곳만 비어 있어서, 실사용 리포트(`scripts/study_usage_report.mjs`)에서 민서 수학 오답이 거의 안 보인다.

## 2. 지금 상태 (2026-11-23 Claude 조사, 착수 전 다시 확인)
- 네 화면 모두 `notion-helper.js`를 실어서 `window.LearningLog`가 이미 있다(새로 싣는 파일 없음).
- 네 화면 모두 **틀려도 다시 고를 수 있는 방식**이다(에러리스). 그래서 「틀림 → 다시 골라 맞힘」은 첫 시도 실패 1건, 끝난 문항 1건으로 기록된다.
- 한 번에 한 문제씩 그때그때 만드는 화면은 `LearningLog.question({ subject: '수학', key })`를 문제를 낼 때마다 새로 만든다. 고정 목록을 도는 화면은 `itemTracker`를 쓴다.
- 쓰는 법은 이미 붙은 예를 따른다: 구구단 `kids/subjects/math/gugudan.html`의 `guguTrack`(itemTracker + `g:` 키), 세로셈 `kids/js/vertical_math_grid.js`의 `verticalMathTrack`. 도우미 설명은 `kids/core/learning-log.js`의 `question`·`itemTracker`·`keyFor` 주석.

| 화면 | 파일 | 채점 지점 | 문제 만드는 곳 |
| :--- | :--- | :--- | :--- |
| CPA 덧셈·뺄셈 개념 | `addition_concept.html`·`subtraction_concept.html` → `js/arithmetic_cpa.js` | `initQuiz` 안의 보기 버튼 콜백 (`v === correct`) | `initQuiz`의 `render()` (그때그때 난수) |
| 시계와 규칙 | `clock_rules.html` → `js/clock_rules_logic.js` | 시계 퀴즈 버튼 콜백, `patternRound` 보기 콜백, `numberRound` 100칸 버튼 콜백 | 각 함수 안 (난수) |
| 100까지의 수 | `number100.html` (인라인 스크립트, **2026-11-24 탐험관 틀로 옮김** — 4관이 같은 키 `g:n100-compare-*`를 `MathDrill.track('n100', …)`로 잇는다, `docs/math_1_bridge_spec.md`) | `chooseCompare(sign)` | `nextCompareQ()` |
| 입체도형 | `shapes.html` → `js/shapes_logic.js` | `checkShapeAns`, `chooseWorkshopPart` | 고정 목록 `SHAPE_QUIZ`(10개, `sqIdx`가 계속 늘며 나머지로 돎), `WS_CONFIG[테마].steps` |

## 3. 할 일 — 문항키 규칙
키는 `LearningLog.keyFor(접두어, 몸통[, 부분])`로 만든다. 생성형은 **유형**을 키로 하고(`g:`), 유한한 사실은 사실 하나하나를 키로 한다(구구단과 같은 원칙). 고정 자료는 `s:<자료id>:<번호>`.

| 화면·활동 | 키 | 기준 |
| :--- | :--- | :--- |
| CPA `a + □ = 10` | `g:cpa-make10` | 덧셈 화면 type 0 |
| CPA `a + b` | `g:cpa-add-1x1` · 합이 10 이상이면 `g:cpa-add-1x1-carry` | 덧셈 화면 type 1 |
| CPA `10 − b` | `g:cpa-sub-10` | 뺄셈 화면 type 0 |
| CPA `1□ − b` | `g:cpa-sub-teen` · 시작 수의 일의 자리 < b면 `g:cpa-sub-teen-borrow` | 뺄셈 화면 type 1 (b=1이면 받아내림 없음 — 식으로 판정할 것) |
| 시계 읽기 | `g:clock-<시>-<00\|30>` (24개) | 시계 퀴즈 |
| 반복 무늬 다음 것 | `g:pattern-<ab\|abc\|abb>` | `unit` 모양으로 판정 |
| 뛰어 세기 다음 수 | `g:skipcount-<step>` | `numberRound`의 `numberStep` |
| 두 수 크기 비교 | `g:n100-compare-<diff-tens\|same-tens\|equal>` | 십의 자리가 다름 / 같고 일의 자리 다름 / 두 수 같음 |
| 생활 물건 모양 퀴즈 | `s:shape-quiz:<번호>` (번호 = `sqIdx % SHAPE_QUIZ.length`) | 고정 목록 |
| 모양 조립 공방 | `s:shape-ws-<테마>:<단계>` | `WS_CONFIG[wsTheme].steps[wsStep]` |

**동작 규칙**
1. 틀린 고름은 `wrong(고른 글자)`, 맞히면 `done()`. 고른 글자는 보기에 보이는 그대로(`'4시 30분'`, `'<'`, `'둥근기둥 모양'`).
2. 「다음 문제」·새 문제로 넘어갈 때 지금 문항에 `skip()`을 부른다(틀린 적 있으면 「틀린 채 끝남」, 안 건드렸으면 기록 없음). 구구단의 `nextQ` 처리와 같다.
3. **힌트**: 100까지 수의 「① 십의 자리 보기」「② 일의 자리 보기」를 **답하기 전에 아이가 직접 누르면** `hint()`. 틀린 뒤 화면이 저절로 단계를 보여 주는 것(`chooseCompare`의 `showCompareStep(1)`)은 힌트로 세지 않는다 — 버튼 경로와 자동 경로를 나눌 것. 시계 퀴즈에서 틀린 뒤 저절로 열리는 `hour-zone`도 힌트가 아니다.
4. **도형 퀴즈 회차**: `SHAPE_QUIZ`는 끝없이 돌기 때문에, 같은 목록 객체로 `itemTracker`를 쓰면 두 바퀴째는 이미 끝난 도우미가 돌아와 기록이 안 된다. 한 바퀴(번호가 0으로 돌아올 때)마다 새 `session` 객체를 넘긴다.
5. 모든 연결은 `window.LearningLog`가 없어도 화면이 그대로 돌게 한다(`L && L.question ? … : null`). 보상·소리·문구는 바꾸지 않는다.
6. 기록 대상에서 **빼는 것**(조작·탐색 활동이라 맞고 틀림이 문항이 아님): CPA 10칸 구슬판·기차·짝꿍(`initTen`·`initTrain`·`initPartner`), 시계 탐색 모드·구슬 팔찌(`bead-analyze`), 100까지 수 묶음·100칸·짝수/홀수 바구니·기억 카드 짝 맞추기, 도형 뷰어·물리·도장. 기억 카드는 두 장을 한꺼번에 뒤집어 「어느 문항을 틀렸나」가 정해지지 않아 뺀다.

## 4. 시험 (`tests/`, 노션 미접속)
- 새 파일 `tests/learning-log-math.test.mjs` (800줄 미만). 가짜 부품은 `tests/quiz-test-fakes.mjs`의 `fakeLearningLog` 등을 재사용한다.
- 화면마다 최소 한 경우: 「틀림 → 맞힘」이 첫 시도 실패로 1건, 「바로 맞힘」이 첫 시도 성공으로 1건, 키가 위 표와 글자까지 같음.
- CPA: type 0/1, 받아올림·받아내림 꼬리표, **b=1인 뺄셈**(받아내림 없음).
- 100까지 수: 버튼으로 본 단계는 `hinted: true`, 틀린 뒤 자동 단계는 `hinted: false`.
- 도형: 열한 번째 문제(두 바퀴째 첫 문제)도 기록된다.
- 넘기기: 틀린 뒤 「다음 문제」 → 틀린 채 끝남 1건, 안 건드리고 넘기면 0건.
- `LearningLog`가 없을 때 화면 함수가 예외 없이 돈다.
- **옛 코드로 되돌리면 실패하는지** 확인한다(새 시험이 아무것도 안 막는 시험이면 안 됨).

## 5. 명세 갱신
- `docs/learning_record_spec.md` §5 표에 **4차** 행(화면·키·날짜)을 넣고, 「알려진 한계」의 「도형·수 감각·CPA·시계 … 아직 연결 안 함」 문장을 고친다. 빼기로 한 활동(§3-6)도 한 줄로 적는다.
- 새 공용 함수를 만들지 않았다면 `CORE_CATALOG.md`는 회귀 시험 묶음 절에 시험 파일 한 줄만 더한다.

## 6. 진행 순서와 Opus 교차 검토 (비교를 위해 지난번과 같은 절차)
Opus도 **노력 high**로 부르고 점수에도 같은 값을 준다(2026-11-23부터 기록에 노력 칸이 있다). 아이 이름 등 개인정보는 요청문에 넣지 않는다.

1. **설계 검토 (코드 쓰기 전)**: 화면별 채점·넘기기·힌트 지점, 키 판정식, 시험 목록을 `G:\master-tower\scratch\agy-work\math_rest_design.md`에 쓰고 부른다.
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File G:\master-tower\scripts\claude_call.ps1 -Role opus -Effort high -Mode read -WorkDir G:\master-tower\kids-school-main -PromptFile G:\master-tower\scratch\agy-work\math_rest_design.md -OutFile G:\master-tower\scratch\agy-work\math_rest_design_review.md
   ```
   요청문 끝에 「기록이 빠지거나 두 번 남거나 잘못된 키가 붙는 곳을 찾아 달라. 고칠 점만 번호로.」를 붙인다. 결과를 사용자에게 먼저 보이고 확인을 받은 뒤 구현한다.
2. 구현 → `node --test --test-concurrency=1 tests/learning-log-math.test.mjs` → `python -X utf8 scripts/ci_local.py` 통과.
3. **변경 검토 (커밋 전)**: `git diff > G:\master-tower\scratch\agy-work\math_rest.diff` (새 시험 파일은 `git add -N` 후 diff에 포함), 같은 방식으로 부른다(`-OutFile ...\math_rest_diff_review.md`). 지적마다 반영하거나 반영하지 않는 이유를 적는다.
4. **점수 기록** (설계·변경 각각):
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File G:\master-tower\scripts\claude_call.ps1 -Role opus -Effort high -Score -Target "수학 4곳 문항기록 설계" -Points 지적수 -Real 실제수
   ```
   `-Real`은 확인해 보니 실제로 고칠 점이던 것만 센다(문서 표현·추측성 지적은 빼고). 지난번 15/15는 조금 후했다.

## 7. 화면 확인 (운영 DB 보호)
- 노션 쓰기 차단 서버 `python scripts/guarded_preview_server.py`(포트 8767)에서만 연다. 화면마다 `fetch`를 손으로 가로채지 않는다.
- 아이 선택은 `localStorage.currentUser`(`son`/`daughter`). 각 화면에서 한 문제는 일부러 틀린 뒤 맞히고, 한 문제는 바로 맞힌다.
- 확인 방법: 브라우저 콘솔에서 `JSON.parse(localStorage.getItem('MINMIN_LEARNING_LOG_V1') || '{}')`(`learning-log.js`의 `STORAGE_KEY`)로 **대기열에 쌓인 키와 [시도, 틀림, 힌트, 오답]**을 읽어 보고에 붙인다. 노션으로 보내는 요청은 차단 서버가 막는다.
- 화면 모양이 바뀌지 않으므로 폰 사진은 필요 없다. 끝나면 대기열·`currentUser`를 원래대로 되돌린다.
- 지난번에 브라우저 도구를 4~5번 갈아 끼우며 헤맸다. 이번에는 **처음부터 쓸 도구를 정하고**, 실패하면 무엇이 안 됐는지 한 줄씩 적어 둔다(비교 자료).

## 8. 커밋과 보고
- 자기 파일만 커밋한다. 다른 작업자의 미커밋 파일이 있으면 섞지 않는다(섞인 파일은 자기 덩어리만, 어려우면 사용자에게 묻는다).
- 제목은 `기능: 문항 단위 학습 기록 4차 — …` 형식(지난 1~3차와 같게). 끝 줄:
  ```
  검토: opus
  Agent: antigravity (gemini-4-neon)
  ```
- 커밋 전 `python -X utf8 G:\master-tower\scripts\verify_contracts.py --mode git-diff` → `[ALL PASS]`. 푸시는 pre-push 훅이 `ci_local.py`를 돌린다. `--no-verify` 금지.
- **보고에 넣을 것** (모델 비교 자료):
  1. 바뀐 파일과 줄 수, 화면별 연결 지점과 키
  2. 시험 결과(옛 코드에서 실패한 시험 수 포함)
  3. Opus 지적 수 / 실제 수 / 반영 수 (설계·변경 각각)
  4. 대기열 확인 결과
  5. 시작·끝 시각, 브라우저 확인 시행착오 횟수, 다시 고친 횟수
  6. 남은 위험

## 9. Claude가 마지막에 볼 것 (받아들이는 기준)
1. §3 표의 활동 10개가 모두 연결됐고 키가 글자까지 같다. 뺀 활동은 연결하지 않았다.
2. 넘기기·힌트 규칙(§3-2·3)과 도형 두 바퀴째(§3-4)가 시험으로 막혀 있다.
3. 옛 코드에서 새 시험이 실패한다.
4. `learning_record_spec.md`에 4차와 뺀 활동이 적혔다.
5. 커밋에 `검토: opus`·`Agent: antigravity (gemini-4-neon)`, `review_scores.tsv`에 `opus (high)` 점수 줄 두 개.
6. 원격 CI 초록.

## 10. 비교 메모 (사용자 기록용)
- 지난번: 아르곤 하이, 아르곤 별도 할당량 주간의 약 25%, Opus 설계 10·변경 5 지적, 브라우저 도구 4~5번 교체.
- 이번: 네온 하이(agy 일반 할당량). 작업 전후 할당량 %를 사용자가 적어 두면 같은 표로 비교한다.
