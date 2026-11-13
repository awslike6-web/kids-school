# 🧹 800줄 대청소 16차: 수학 세로셈 `vertical_math_logic.js` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01, Claude 검증 완료)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록. 같은 방식의 앞선 작업: `docs/voca_common_split_spec.md`, `docs/math_number50_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄과 최상위 경계 근거, 첫 파일의 최상위 실행문 전체 목록과 각각이 둘째 파일 함수·변수를 즉시 쓰지 않는 근거, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 시험 파일 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/vertical-split`, 브랜치 `codex/vertical-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/subjects/math/vertical_math.html` 한 곳에서만 싣는 `kids/js/vertical_math_logic.js`(879줄; 개행 문자 878개, 마지막 개행 없음)를 **동작·모습을 하나도 바꾸지 않고** 연속 구간 두 개로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-11-01 main 기준 제안)

| 파일 | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/js/vertical_math_logic.js` (**이름 유지**) | 1–434 | 434 | 전역 상태, `DOMContentLoaded` 초기화, 계산 메모장, 숫자패드 접기, 나가기, 화면 전환·입력, 난이도 모달, 문제 만들기(`generateQuestions`), `startGame` |
| `kids/js/vertical_math_grid.js` | 435–879 | 445 (+머리 주석 1) | 나눗셈 시뮬레이터(`simulateDivision`), 세로셈 격자 그리기(`renderDynamicGrid`), `nextQuestion`, 채점(`submitAnswer`), 결과(`showResult`), 학습지 인쇄(`printWorksheet`) |

- 433줄에서 `startGame`이 닫히고 434줄은 빈 줄, 435줄은 `// ➗ 나눗셈 롱 디비전(Long Division) 시뮬레이터` 주석이다. 계획 단계에서 함수·블록·템플릿 문자열·중괄호 밖인지 확인해 보고한다.
- 첫 파일의 즉시 실행문(전역 `let`·`const`, `window.wrongNotes`·`window.currentSubject` 대입, `DOMContentLoaded` 등록, `window.*` 함수 대입, `DIFFICULTY_LEVELS`)은 둘째 파일의 함수·변수를 즉시 쓰지 않아야 한다. `DOMContentLoaded` 콜백·버튼 콜백 안에서 둘째 파일 함수(예: `startGame` → `nextQuestion`)를 부르는 것은 두 스크립트가 모두 실린 뒤라 괜찮다. 계획 단계에서 전체 목록으로 확인한다.
- `submitAnswer`·`showResult`의 보상 오디오(`fairyPraise`·`fairyEncourage`·`fairyReward`) 호출은 둘째 파일로 그대로 옮겨진다(GEMINI §6 3단계 실전단 — 호출이 사라지면 안 된다).

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 둘째 파일 맨 위에만 한 줄 주석을 추가한다: `// kids/js/vertical_math_grid.js - vertical_math_logic.js 분리 2/2: 나눗셈 시뮬레이터·격자 그리기·채점·결과·인쇄 (vertical_math_logic.js 다음에 로드)`. 첫 파일은 원문만.
2. **클래식 스크립트 그대로**: IIFE·`type="module"`·`defer` 금지. HTML `onclick`이 전역 함수를 부르고, 두 파일이 최상위 `let`을 함께 쓴다.
3. **참조**: `vertical_math.html`의 `<script src="../../js/vertical_math_logic.js"></script>`(버전 없음)에 `?v=20261101-vertical-split`을 붙이고, 바로 다음 줄에 `<script src="../../js/vertical_math_grid.js?v=20261101-vertical-split"></script>`를 넣는다(옛 통짜 JS가 캐시에 남은 채 새 JS가 실리면 `let` 중복 선언 오류). 계획 단계에서 저장소 전체를 다시 검색해 다른 로드(로더의 파일 이름 목록 포함)가 있으면 보고한다.

## 4. 범위 밖
- 화면 기능·보상·노션 동작 변경, `vertical_math.html`의 다른 태그, `math_style.css`.

## 5. T (시험)
1. 신규 `tests/vertical-math-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/vertical-math-split/vertical_math_logic.js`에 그대로 복사해 커밋한다.
   - 첫 파일 + (둘째 파일에서 머리 주석 1줄 뺀 것)을 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`).
   - 두 파일 600줄 이하, 둘째 파일 첫 줄이 지정 머리 주석.
   - `vertical_math.html`이 두 파일을 같은 버전·지정 순서로 한 번씩 싣고 버전 없는 옛 참조가 없다.
   - 둘째 파일에 `fairyPraise`·`fairyEncourage`·`fairyReward` 호출이 원본과 같은 개수로 남아 있다.
   - `vm`(가짜 `window`·`document`·`localStorage`, 이벤트·타이머 등록 기록, 네트워크 호출은 실패 처리)에서 첫 파일만 실행해도 오류가 없고, 두 파일을 순서대로 실행한 결과가 원래 파일 하나를 실행했을 때와 전역 함수 이름 목록·`window.*` 함수 목록·등록 이벤트 목록이 같다. 콜백은 실행하지 않는다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버 두 개(분리 전·후, 한 탭씩)에서 `vertical_math.html`을 열어 콘솔 오류, 전역 함수 목록, 계산된 스타일을 비교하고, 연산 종류별로 문제를 시작해 격자 그리기·숫자패드 입력·채점·결과 화면을 확인한다.

## 7. 문서
- `CORE_CATALOG.md`나 `docs/math_spec.md`에 이 화면 파일 구성이 적혀 있으면 새 구성으로 고치고, 없으면 `CORE_CATALOG.md` 수학 절에 두 파일의 역할·로드 순서·시험을 짧게 등록한다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-11-01)

- 사용자 승인에 따라 원본 1–434 / 435–879줄 경계를 적용했습니다. 원본은 개행 문자 878개와 마지막 개행 없는 끝줄을 합쳐 879줄입니다. 둘째 파일은 지정 머리 주석 포함 446줄이며 마지막 개행 없음도 보존했습니다.
- 첫 파일과 둘째 파일의 머리 주석을 뺀 내용을 재결합하면 고정 fixture와 바이트까지 같습니다. 첫 파일의 끝 빈 줄도 원문이므로 보존했습니다. 두 파일은 각각 독립 구문 분석에 성공합니다.
- 민수 기본값·민서 기존 오답 두 조건에서 첫 파일 단독 실행이 성공합니다. 원본과 순차 로드의 전역 함수 25개·초기 상태·저장소 읽기 2회·DOMContentLoaded 등록 1회·예약 타이머 0개가 같습니다. 콜백은 실행하지 않고 예상 밖 DOM·저장소 쓰기·네트워크 접근은 실패 처리합니다.
- vertical_math.html은 원래 위치에서 두 JS를 같은 ?v=20261101-vertical-split로 연속 로드합니다. 배선 외 HTML 원문 해시가 일치하며, fairyPraise·fairyEncourage·fairyReward 호출은 둘째 파일에 각각 1회씩 보존했습니다.
- 계획 단계 참조 검색은 5개 파일·10개 줄이며 실제 로드는 vertical_math.html:142 한 곳입니다. 다른 운영 로더는 없습니다. CORE_CATALOG.md 수학 절에 역할·전역 API·로드 순서·시험을 등록했습니다. 지난 분리 명세서와 math_spec.md는 수정하지 않았습니다.
- 신규 시험은 정확한 경계·머리 주석·원문·600줄 제한·HTML 배선과 나머지 원문·운영 소스 참조·오디오 호출·VM 부분 실행과 순차 실행을 검사합니다. fixture는 승인대로 tests/fixtures/ 계약 검사 줄 수 제외 대상입니다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| kids/js/vertical_math_logic.js | 434 |
| kids/js/vertical_math_grid.js | 446 |
| kids/subjects/math/vertical_math.html | 146 |
| tests/vertical-math-split.test.mjs | 184 |
| tests/fixtures/vertical-math-split/vertical_math_logic.js | 879 |
| kids/core/CORE_CATALOG.md | 1292 |
| docs/vertical_math_split_spec.md | 114 |

위 표는 마지막 개행을 별도 줄로 세지 않는 물리 줄 수입니다.

### 실행 결과

- `node --test tests/vertical-math-split.test.mjs`: 종료 코드 0, 11개 통과·실패 0개. 출력 마지막 10줄 원문:

```text
✔ 민서·기존 오답: 첫 파일만 실행해도 뒤 파일·DOM·네트워크 접근이 없다 (0.9617ms)
✔ 민서·기존 오답: 순차 실행의 전역 함수·초기 상태·이벤트·타이머가 원본과 같다 (1.593ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 559.0202
```

- `node --test "tests/**/*.test.mjs"`: 종료 코드 1, 343개 중 통과 339·실패 2·건너뜀 1·기존 TODO 1. 실패는 기존 tests/gallery-character-runner.test.mjs:477 및 tests/gallery-multi-character.test.mjs:72의 Python 빌더 하위 프로세스 status=null 두 건입니다. 앞선 voca 분리 기록과 같은 실패 위치이며 관련 시험·빌더는 수정하지 않았습니다. 이 환경에서 python 명령이 없다는 사실은 별도로 확인했으나, 빌더 시험은 spawn 오류 코드를 출력하지 않아 하위 프로세스의 구체적인 실행 오류 코드는 확인하지 못했습니다. 출력 마지막 10줄은 기존 TODO 진단의 끝부분입니다:

```text
        at async Test.run (node:internal/test_runner/test:1409:7)
        at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
      generatedMessage: false,
      code: 'ERR_ASSERTION',
      actual: 2,
      expected: 1,
      operator: 'deepStrictEqual',
      diff: 'simple'
    }
  }
```

- `git diff --check`: 종료 코드 2, `kids/js/vertical_math_logic.js:434: new blank line at EOF.` 원문 절단점의 빈 줄을 보존한 결과이므로 제거하지 않았습니다.

### Claude 검증 (2026-11-01)
- Codex 환경의 전체 시험 실패 2건은 그 샌드박스에서 Python이 실행되지 않아 생긴 것이다. 같은 작업 폴더에서 Claude가 돌린 `node --test "tests/**/*.test.mjs"`는 343개 중 341 통과·실패 0·기존 TODO 1이다.
- 바뀐 파일 6개 모두 `verify_contracts.py --mode file` → `[ALL PASS]`. 첫 파일 + (둘째 파일 머리 주석 뺀 것)이 main 작업 파일과 바이트까지 같다.
- 쓰기 차단 서버 두 개(분리 전 8785, 분리 후 8786)에서 `Math.random`을 같은 씨앗으로 고정해 비교했다: 전역 함수 261개 이름 해시, 시작 화면, 덧셈·뺄셈·곱셈·나눗셈 문제와 격자 HTML(스크립트 태그 제외)·계산 스타일, 빈 답 제출 뒤 화면 글자, 결과 화면 글자가 모두 같다. 첫 비교의 덧셈 스타일 차이는 웹 글꼴(Jua) 로딩 시점 차이로, 글꼴이 실린 뒤 다시 재면 같다(114개 요소 해시 동일). 분리 후 화면에서 나눗셈 격자 모습, 정답 제출 → `fairyPraise`·다음 문제, 오답 → `fairyEncourage`를 확인했다. 콘솔 오류는 Claude의 강제 페이지 이동에 대한 브라우저 `beforeunload` 안내뿐이다.

## 후속 (2026-11-14): 고정 원본 대조 시험 정리
위 절차에서 만든 `tests/fixtures/` 원본 사본과 원문·마크업·실행 결과 통째 대조 시험은 분리가 끝난 뒤에도 정상 수정마다 fixture를 같이 고쳐야 해서 지웠습니다. 지금 이 분리 시험은 `tests/split-rules.mjs` 규칙(파일 실존·상대 경로·줄 상한·인라인 금지·같은 `?v=`로 지정 순서 로드·HTML 호출 함수 선언·공개 API 유지·부분 로드 안전성)만 봅니다. 현재 기준은 `kids/core/CORE_CATALOG.md` 「회귀 시험 묶음」 절을 따릅니다.
