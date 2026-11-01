# 🧹 800줄 대청소 15차: 용어사전 `voca_common.js` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01, Claude 검증 완료)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록. 같은 방식의 앞선 작업: `docs/math_number50_split_spec.md`, `docs/parent_dashboard_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄과 최상위 경계 근거, 첫 파일의 최상위 실행문 전체 목록과 각각이 둘째 파일 함수·변수를 즉시 쓰지 않는 근거, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 시험 파일 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/voca-split`, 브랜치 `codex/voca-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/common_space/voca.html` 한 곳에서만 싣는 `kids/common_space/voca_common.js`(906줄)를 **동작·모습을 하나도 바꾸지 않고** 연속 구간 두 개로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-11-01 main 기준 제안)

| 파일 | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/common_space/voca_common.js` (**이름 유지**) | 1–459 | 459 | 전역 상태, `load`·`beforeunload` 등록, 노션 데이터 받기, 필터·단원 선택·검색, 카드 목록 그리기, 수식·상세 서식, 딥링크(`handleDeepLinkParams`) |
| `kids/common_space/voca_modal.js` | 460–906 | 447 (+머리 주석 1) | `currentActiveWord`, 단어 모달 열기·닫기, 단어 TTS, 요정 음성 토글·읽기, 음성 입력, 요정 코코 질문(`askFairyTeacher`·`askCocoFairy`), 끝의 엔터키 `setTimeout` |

- 459줄은 `handleDeepLinkParams()`가 458줄에서 닫힌 뒤의 빈 줄, 460줄은 `let currentActiveWord = null;`. 계획 단계에서 함수·블록·템플릿 문자열·중괄호 밖인지 확인해 보고한다.
- 첫 파일의 즉시 실행문(전역 `const`/`let`, `window.currentSubject` 대입, `load`·`beforeunload` 등록, `window.manualSyncVocaData` 대입)은 둘째 파일의 함수·`let`을 즉시 쓰지 않아야 한다. `load` 콜백 안에서 둘째 파일 함수(예: 딥링크 → `openModal`)를 부르는 것은 두 스크립트가 모두 실린 뒤라 괜찮다. 계획 단계에서 전체 목록으로 확인한다.
- 둘째 파일의 `let currentActiveWord`를 첫 파일 함수가 쓰더라도 호출 시점(사용자 조작·`load` 이후)이면 괜찮다. 첫 파일 로드 중에 즉시 읽히는 곳이 있으면 보고한다(일시적 사각지대 `ReferenceError`).

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 둘째 파일 맨 위에만 한 줄 주석을 추가한다: `// kids/common_space/voca_modal.js - voca_common.js 분리 2/2: 단어 모달·TTS·음성 입력·요정 코코 (voca_common.js 다음에 로드)`. 첫 파일은 원문만.
2. **클래식 스크립트 그대로**: IIFE·`type="module"`·`defer` 금지. HTML `onclick`이 전역 함수를 부르고, 두 파일이 최상위 `let`을 함께 쓴다.
3. **참조**: `voca.html`의 `<script src="./voca_common.js?v=20260916_1400"></script>` 줄의 버전을 `?v=20261101-voca-split`로 바꾸고(뒤 주석은 그대로), 바로 다음 줄에 `<script src="./voca_modal.js?v=20261101-voca-split"></script>`를 넣는다(옛 통짜 JS가 캐시에 남은 채 새 JS가 실리면 `let` 중복 선언 오류). 계획 단계에서 저장소 전체를 다시 검색해 다른 로드(로더의 파일 이름 목록 포함)가 있으면 보고한다.

## 4. 범위 밖
- 다른 800줄 초과 파일(`vertical_math_logic.js`), 화면 기능·보상·노션 동작 변경, `voca.html`의 다른 태그.

## 5. T (시험)
1. 신규 `tests/voca-common-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/voca-common-split/voca_common.js`에 그대로 복사해 커밋한다.
   - 첫 파일 + (둘째 파일에서 머리 주석 1줄 뺀 것)을 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`).
   - 두 파일 600줄 이하, 둘째 파일 첫 줄이 지정 머리 주석.
   - `voca.html`이 두 파일을 같은 버전·지정 순서로 한 번씩 싣고 옛 버전 참조가 없다.
   - `vm`(가짜 `window`·`document`·`localStorage`·`setTimeout`, 이벤트·타이머 등록 기록, 네트워크 호출은 실패 처리)에서 첫 파일만 실행해도 오류가 없고, 두 파일을 순서대로 실행한 결과가 원래 파일 하나를 실행했을 때와 전역 함수 이름 목록·등록 이벤트 목록·예약 타이머 수가 같다. 콜백은 실행하지 않는다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버 두 개(분리 전·후, 한 탭씩)에서 `voca.html`을 열어 콘솔 오류, 전역 함수 목록, 카드 목록·필터, 단어 모달 열기·닫기, 딥링크를 비교한다.

## 7. 문서
- `CORE_CATALOG.md`나 과목 명세서에 이 화면 파일 구성이 적혀 있으면 새 구성으로 고치고, 없으면 `CORE_CATALOG.md`에 두 파일의 역할·로드 순서·시험을 짧게 등록한다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-11-01)

- 승인한 원본 1–459 / 460–906줄 경계를 그대로 적용했습니다. 둘째 파일에만 §3의 지정 머리 주석 한 줄을 추가했으며, 그 주석을 제외한 재결합은 fixture와 줄바꿈·공백을 포함해 바이트까지 같습니다. fixture는 구현 직전 원본을 그대로 보존합니다.
- 458줄에서 함수가 닫히고 459줄은 빈 줄입니다. 두 구간은 각각 독립 구문 분석에 성공합니다. 첫 파일의 최상위 실행문 17개는 둘째 파일 함수·변수를 즉시 사용하지 않으며, 첫 파일은 전역 함수 17개와 load·beforeunload 이벤트 2개만 등록합니다.
- 민수 기본값·민서 기존 전역 설정의 두 조건에서 원본과 순차 로드의 전역 함수 27개·초기 상태·이벤트 순서·500ms 예약 타이머 1개가 같습니다. 콜백은 실행하지 않고 DOM·저장소·네트워크의 예상하지 않은 접근은 실패 처리합니다.
- voca.html의 기존 태그 뒤 주석을 보존하고 두 파일을 같은 ?v=20261101-voca-split로 연속 로드합니다. 해당 배선 외 HTML은 구현 전 원문 해시와 같습니다. 클래식 스크립트와 기존 전역 상태·HTML 이벤트 함수를 유지했습니다.
- 계획 단계 voca_common 참조는 5개 파일·13줄이며 실제 로드는 voca.html:289 한 곳입니다. 다른 운영 로더는 없습니다. 승인에 따라 CORE_CATALOG.md §2-1 교과 공통·인터랙션 코어 앞부분에 역할·전역 API·로드 순서·시험을 짧게 등록했습니다. docs/voca_math_viewer_handover.md와 지난 분리 명세서는 수정하지 않았습니다.
- 신규 tests/voca-common-split.test.mjs는 정확한 절단 경계·머리 주석·원문 보존·600줄 상한·독립 구문·HTML 배선/나머지 원문·다른 운영 소스의 버전 참조·첫 파일 단독 실행·원본 대비 순차 실행을 검사합니다. fixture는 사용자 확인대로 tests/fixtures/ 줄 수 검사 제외 대상입니다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/common_space/voca_common.js` | 459 |
| `kids/common_space/voca_modal.js` | 448 |
| `kids/common_space/voca.html` | 293 |
| `tests/voca-common-split.test.mjs` | 152 |
| `tests/fixtures/voca-common-split/voca_common.js` | 906 |
| `kids/core/CORE_CATALOG.md` | 1285 |
| `docs/voca_common_split_spec.md` | 83 |

위 표는 마지막 개행을 별도 줄로 세지 않는 물리 줄 수입니다. 시험의 split 방식으로 한 줄 크게 세어도 운영 JS 두 파일은 600줄 이하입니다.

- node --test tests/voca-common-split.test.mjs: 종료 코드 0, 10개 통과·실패 0개.
- node --test "tests/**/*.test.mjs": 종료 코드 1, 332개 중 통과 328·실패 2·건너뜀 1·기존 TODO 1. 실패는 기존 tests/gallery-character-runner.test.mjs:477 및 tests/gallery-multi-character.test.mjs:72의 Python 빌더 하위 프로세스 status=null 두 건입니다. 해당 시험은 spawn 오류 코드를 출력하지 않으므로 구체적인 실행 실패 원인은 확인하지 못했습니다. 관련 시험·빌더는 수정하지 않았습니다.
- git diff --check: 종료 코드 1, kids/common_space/voca_common.js:459: new blank line at EOF. 원본 절단점의 빈 줄을 그대로 보존한 결과이므로 §3에 따라 제거하지 않았습니다.

### Claude 검증 (2026-11-01)
- Codex 환경의 전체 시험 실패 2건은 그 샌드박스에서 Python이 실행되지 않아 생긴 것이다. 같은 작업 폴더에서 Claude가 돌린 `node --test "tests/**/*.test.mjs"`는 332개 중 330 통과·실패 0·기존 TODO 1이다.
- 바뀐 파일 6개 모두 `verify_contracts.py --mode file` → `[ALL PASS]`. 첫 파일 + (둘째 파일 머리 주석 뺀 것)이 main 작업 파일과 바이트까지 같다.
- 쓰기 차단 서버 두 개(분리 전 8783, 분리 후 8784)에서 `voca.html`을 비교했다: 노션 단어 1742개, 전역 함수 258개 이름 해시, 화면 글자 해시, 태그·클래스별 계산 스타일 서명 63개, 첫 단어 모달 열기 후 모달 부분별 글자 해시와 닫기 결과가 모두 같고 콘솔 오류 없음. 분리 후 화면에서 딥링크 `?word=물박달나무`(검색어 채움·카드 1개·모달 자동 열림)와 카드 클릭 모달 열기도 동작했다.
