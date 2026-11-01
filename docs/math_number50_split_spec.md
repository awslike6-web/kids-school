# 🧹 800줄 대청소 14차: 수학 50까지 수 `math_number50.js`·`math_number50.css` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01, Claude 검증 완료)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록. 같은 방식의 앞선 작업: JS `docs/parent_dashboard_split_spec.md`, CSS `docs/gallery_css_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(두 파일의 자를 줄과 최상위 경계 근거, JS 첫 파일의 최상위 실행문 목록, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/number50-split`, 브랜치 `codex/number50-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/subjects/math/number50.html` 한 곳에서만 쓰는 `kids/js/math_number50.js`(919줄)와 `kids/css/math_number50.css`(911줄)를 **동작·모습을 하나도 바꾸지 않고** 각각 연속 구간 두 개로 잘라 모든 파일을 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-11-01 main 기준 제안)
JS·CSS 모두 전체가 4칸 들여쓰기돼 있다(인라인에서 옮겨 온 흔적). "최상위"는 줄 첫 글자가 아니라 블록·중괄호 깊이 0으로 판단한다.

| 파일 | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/js/math_number50.js` (**이름 유지**) | 1–424 | 424 | 1 사운드·별 보상, 2 폭죽, 3 탭 전환, 4 STAGE 1(10 만들기), 5 STAGE 2(그리드) |
| `kids/js/math_number50_stages.js` | 425–919 | 495 | 6 STAGE 3(선 잇기), 7 STAGE 4(기차·크기 비교), 나가기, `pagehide`·`DOMContentLoaded` |
| `kids/css/math_number50.css` (**이름 유지**) | 1–524 | 524 | 공통·레이아웃·STAGE 1 |
| `kids/css/math_number50_stages.css` | 525–911 | 387 | STAGE 2·3·4, 끝의 `@keyframes` |

- JS 425줄은 `/* ===… 6. STAGE 3 */` 절 주석, CSS 525줄은 `/* === STAGE 2: 그리드 빈칸 채우기 === */` 주석. 계획 단계에서 함수·블록·템플릿 문자열·중괄호 밖인지 확인해 보고한다.
- JS 첫 파일의 즉시 실행문(`AudioContext` 생성, 폭죽 캔버스 `getContext`, `resize` 등록, `resizeConfetti()`·`updateConfetti()` 호출)은 모두 같은 첫 파일 안의 함수만 부른다. 계획 단계에서 전체 목록으로 확인한다.
- CSS `@keyframes`가 둘째 파일로 가도 같은 페이지의 첫 파일 규칙에서 그대로 쓰인다(같은 문서의 스타일시트끼리 공유).

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·선택자·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 각 새 파일(둘째 파일 두 개) 맨 위에만 한 줄 주석을 추가한다: JS `// kids/js/math_number50_stages.js - math_number50.js 분리 2/2: STAGE 3·4·나가기·초기화 (math_number50.js 다음에 로드)`, CSS `/* kids/css/math_number50_stages.css - math_number50.css 분리 2/2: STAGE 2·3·4·애니메이션 (math_number50.css 다음에 로드) */`. 첫 파일들은 원문만.
2. **클래식 스크립트 그대로**: IIFE·`type="module"`·`defer` 금지. HTML `onclick`이 전역 함수를 부른다.
3. **참조**: `number50.html`의 `<link rel="stylesheet" href="../../css/math_number50.css">`와 `<script src="../../js/math_number50.js"></script>`(둘 다 버전 없음) 바로 다음에 각각 둘째 파일을 넣고, **네 태그 모두** `?v=20261101-number50-split`을 붙인다(옛 통짜 JS가 캐시에 남은 채 새 JS가 실리면 `let`/`const` 중복 선언 오류). 계획 단계에서 저장소 전체를 다시 검색해 다른 로드가 있으면 보고한다.

## 4. 범위 밖
- 다른 800줄 초과 파일(`voca_common.js`, `vertical_math_logic.js`), 화면 기능·보상 변경.

## 5. T (시험)
1. 신규 `tests/number50-split.test.mjs`:
   - 구현 때 원래 두 파일을 `tests/fixtures/number50-split/`에 그대로 복사해 커밋한다.
   - JS·CSS 각각 첫 파일 + (둘째 파일에서 머리 주석 1줄 뺀 것)을 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`).
   - 네 파일 600줄 이하, CSS 두 파일은 주석을 뺀 뒤 `{`·`}` 개수가 같다.
   - `number50.html`이 CSS 두 개·JS 두 개를 같은 버전·지정 순서로 한 번씩 싣고 버전 없는 옛 참조가 없다.
   - `vm`(가짜 `window`·`document`(캔버스 `getContext` 포함)·`AudioContext`·`localStorage`, 이벤트 등록 기록)에서 JS 첫 파일만 실행해도 오류가 없고, 두 파일을 순서대로 실행한 결과가 원래 파일 하나를 실행했을 때와 전역 함수 이름 목록·등록 이벤트 목록이 같다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트, 한 탭씩)에서 분리 전·후 `number50.html`을 열어 CSS 규칙 해시, 계산된 스타일, 콘솔 오류를 비교하고 STAGE 1~4를 하나씩 조작해 본다.

## 7. 문서
- `CORE_CATALOG.md`나 `docs/math_spec.md`에 이 화면 파일 구성이 적혀 있으면 새 구성으로 고친다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-11-01)

- 승인한 원본 JS 1–424 / 425–919줄, CSS 1–524 / 525–911줄 경계를 그대로 적용했다. 둘째 파일 두 개에만 §3의 지정 머리 주석 한 줄을 추가했으며, 그 주석을 제외하고 재결합하면 fixture와 줄바꿈·공백을 포함한 바이트가 같다. fixture와 Git HEAD 원본도 CRLF 정규화 후 같다.
- JS는 `prevExplainStep()`이 423줄에서 닫히고 424줄은 빈 줄이다. 앞·뒤 구간은 각각 독립 구문 분석에 성공한다. 첫 구간의 최상위 실행문 21개는 둘째 파일 함수를 즉시 호출하지 않으며, 함수 선언 28개와 첫 `resize` 등록·폭죽 초기화가 유지된다. 전체 로드의 전역 함수 44개와 `resize` 두 번 → `pagehide` → `DOMContentLoaded` 이벤트 등록 순서가 원본과 같다.
- CSS는 523줄의 `.preset-btn:hover` 규칙 다음 빈 줄에서 자른다. 주석을 뺀 앞 구간 중괄호 67쌍·뒤 구간 72쌍이 각각 닫히며 최저 깊이와 최종 깊이는 모두 0이다. 끝의 여섯 `@keyframes`는 둘째 파일에서 같은 문서에 적용된다.
- `number50.html`은 기존 자산 위치에서 CSS 두 개·JS 두 개를 각각 연속 로드하며 네 태그 모두 `?v=20261101-number50-split`을 쓴다. 네 자산 태그 외 HTML 원문은 HEAD와 같다. 클래식 스크립트와 기존 전역 함수·공통 오디오·노션 연결을 보존했다.
- 계획 단계 `math_number50` 참조 검색은 2개 파일·9줄이었다(실제 로드 HTML 2줄, 이번 명세 설명 7줄). 다른 운영 로더는 없었다. 사용자 승인에 따라 카탈로그의 수학 대문·각도 항목 바로 뒤에 네 파일의 역할·로드 순서·전역 API·시험을 짧게 신규 등록했다. `docs/math_spec.md`와 지난 분리 명세서는 변경하지 않았다.
- 신규 `tests/number50-split.test.mjs`는 고정 fixture 재결합·정확한 절단 경계·머리 주석·600줄 상한·CSS 경계·HTML 상대 경로/버전/순서/중복·옛 무버전 참조 제거·첫 JS 단독 실행·원본 대비 전역 함수/상태/이벤트/캔버스 처리를 검사한다. AudioContext와 webkitAudioContext, 빈 상태와 기존 상태를 확인하며 운영 DB에는 접속하지 않는다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/js/math_number50.js` | 424 |
| `kids/js/math_number50_stages.js` | 496 |
| `kids/css/math_number50.css` | 524 |
| `kids/css/math_number50_stages.css` | 388 |
| `kids/subjects/math/number50.html` | 247 |
| `tests/number50-split.test.mjs` | 199 |
| `tests/fixtures/number50-split/math_number50.js` | 919 |
| `tests/fixtures/number50-split/math_number50.css` | 911 |
| `kids/core/CORE_CATALOG.md` | 1279 |

위 표는 물리 줄 수 기준이다. 마지막 개행을 별도 항목으로 세는 시험에서는 운영 파일이 한 줄 크게 집계되어도 모두 600줄 이하이다. fixture 두 개는 사용자 확인대로 계약 검사기의 `tests/fixtures/` 줄 수 제외 대상이며 원본 크기를 유지했다.

- `node --test tests/number50-split.test.mjs`: 종료 코드 0, 15개 통과·실패 0개.
- `node --test "tests/**/*.test.mjs"`: 종료 코드 1, 322개 중 통과 318·실패 2·건너뜀 1·기존 TODO 1. 실패는 기존 `tests/gallery-character-runner.test.mjs:477`과 `tests/gallery-multi-character.test.mjs:72`의 Python 빌더 하위 프로세스 `status=null` 두 건이다. 해당 시험은 spawn 오류 코드를 출력하지 않으므로 구체적인 실행 실패 원인은 확인하지 못했다. 해당 시험·빌더는 수정하지 않았다.
- `git diff --check`: 종료 코드 1, `kids/css/math_number50.css:524: new blank line at EOF.` 및 `kids/js/math_number50.js:424: new blank line at EOF.`. 원본 절단점의 빈 줄을 보존한 결과이므로 §3에 따라 제거하지 않았다.

### Claude 검증 (2026-11-01)
- Codex 환경의 전체 시험 실패 2건은 그 샌드박스에서 Python이 실행되지 않아 생긴 것이다. 같은 작업 폴더에서 Claude가 돌린 `node --test "tests/**/*.test.mjs"`는 322개 중 320 통과·실패 0·기존 TODO 1이다.
- 바뀐 파일 8개 모두 `verify_contracts.py --mode file` → `[ALL PASS]`. 첫 파일 + (둘째 파일 머리 주석 뺀 것)이 main 작업 파일과 바이트까지 같다(JS·CSS 모두).
- 쓰기 차단 서버 두 개(분리 전 8781, 분리 후 8782)에서 같은 화면을 열어 비교했다: `math_number50` CSS 규칙 120개 해시 동일, 전역 함수 283개 동일, STAGE 1~4를 차례로 열며 모은 태그·id·클래스별 계산 스타일 서명 133개 동일(무작위로 바뀌는 기차 빈칸 id `train-in-N`만 정규화), 콘솔 오류 없음. 분리 후 화면에서 STAGE 1 큐브 추가·예시 버튼, STAGE 2 새 문제·설명 모달 3단계, STAGE 3 자동 풀기·새 배치, STAGE 4 새 기차·크기 비교 선택을 실행해 오류 없이 동작했다.
