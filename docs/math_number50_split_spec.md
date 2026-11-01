# 🧹 800줄 대청소 14차: 수학 50까지 수 `math_number50.js`·`math_number50.css` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 작업 지시 (구현 전)
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
