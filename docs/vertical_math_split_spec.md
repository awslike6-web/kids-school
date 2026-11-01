# 🧹 800줄 대청소 16차: 수학 세로셈 `vertical_math_logic.js` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 작업 지시 (구현 전)
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
`kids/subjects/math/vertical_math.html` 한 곳에서만 싣는 `kids/js/vertical_math_logic.js`(878줄)를 **동작·모습을 하나도 바꾸지 않고** 연속 구간 두 개로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-11-01 main 기준 제안)

| 파일 | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/js/vertical_math_logic.js` (**이름 유지**) | 1–434 | 434 | 전역 상태, `DOMContentLoaded` 초기화, 계산 메모장, 숫자패드 접기, 나가기, 화면 전환·입력, 난이도 모달, 문제 만들기(`generateQuestions`), `startGame` |
| `kids/js/vertical_math_grid.js` | 435–878 | 444 (+머리 주석 1) | 나눗셈 시뮬레이터(`simulateDivision`), 세로셈 격자 그리기(`renderDynamicGrid`), `nextQuestion`, 채점(`submitAnswer`), 결과(`showResult`), 학습지 인쇄(`printWorksheet`) |

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
