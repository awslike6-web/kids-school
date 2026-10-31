# 🧹 800줄 대청소 6차: 부모 대시보드 `parent_dashboard.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 6차분. 앞선 JS 분리: `docs/notion_reward_split_spec.md`, `docs/daily_diary_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 최상위 경계 근거, 최상위 실행문 목록, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/parent-dashboard-split`, 브랜치 `codex/parent-dashboard-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/js/parent_dashboard.js`(1120줄)는 부모 대시보드 `parent_dashboard.html` 한 곳에서만 쓰인다. **동작을 하나도 바꾸지 않고** 연속된 두 구간으로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
| 파일 (`kids/js/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `parent_dashboard.js` (**이름 유지**) | 1–546 | 546 | 설정 상수·상태, 날짜 헬퍼, 배경, 로그인·화면 전환, 소원 티켓, 통계 계산(`localDateStr`, `calcStreak` 등), 레이더 차트 |
| `parent_dashboard_render.js` | 547–1120 | 574 | `loadDashboardData`, 스크린타임·하루 코칭·안전 알림 위젯, 맨 끝 `DOMContentLoaded`·`visibilitychange`·`focus` 등록 |

- 547줄은 `// 노션에서 실시간 통합 인벤토리 ...` 주석, 548줄이 최상위 `async function loadDashboardData()`. 계획 단계에서 함수·블록·템플릿 문자열 밖인지 확인해 보고한다.
- 첫 파일 이름을 유지하면 `scripts/verify_kst_dates.js`(이 파일에서 `localDateStr`·`calcStreak`를 떼어 시험)를 고칠 필요가 없다. 계획 단계에서 두 함수가 첫 파일에 남는지 확인한다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 각 파일 맨 위에 한 줄 주석 `// kids/js/{파일} - parent_dashboard.js 분리 {n}/2: {내용} (순서대로 로드)`만 추가한다(첫 파일도 원래 1줄 앞에).
2. **클래식 스크립트 그대로**: IIFE·`type="module"`·`defer` 금지. HTML `onclick`이 전역 함수를 부른다. 최상위 `const`/`let`은 원래 구간에.
3. **로드 순서**: `parent_dashboard.js` → `parent_dashboard_render.js`. 첫 파일을 읽는 즉시 둘째 파일 함수를 부르는 코드가 없어야 한다(계획 단계에서 최상위 실행문을 모두 나열해 확인).
4. **참조**: `parent_dashboard.html`의 `<script src="kids/js/parent_dashboard.js?v=20261025-1">` 바로 뒤에 둘째 파일 태그를 넣고, **두 태그 모두** 버전을 `?v=20261031-dash-split`로 바꾼다(옛 통짜 파일이 캐시에 남은 채 새 둘째 파일이 실리면 `const` 중복 선언 오류). 계획 단계에서 저장소 전체를 다시 검색해 다른 로드가 있으면 보고한다.

## 4. 범위 밖
- 다른 800줄 초과 파일(`gallery.css`, `math.html`, `angles_concept.html`, `lobby_controller.js` 등)과 `parent_dashboard.html`·`parent_dashboard.css`의 다른 부분.
- 대시보드 기능·노션 쓰기 방식 변경.

## 5. T (시험)
1. 신규 `tests/parent-dashboard-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/parent-dashboard-split/parent_dashboard.js`로 그대로 복사해 커밋한다.
   - 두 파일이 있고, 머리 주석 1줄을 뺀 내용을 순서대로 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`와 같게).
   - 각 파일 600줄 이하.
   - `parent_dashboard.html`이 두 파일을 같은 버전으로 연달아 한 번씩 싣고, 옛 버전 `?v=20261025-1` 참조가 남지 않았다.
   - `vm` 컨텍스트(가짜 `window`·`document`·`localStorage`, `addEventListener` 기록)에서 첫 파일만 실행해도 오류가 없고, 두 파일을 순서대로 실행한 결과가 원래 파일 하나를 실행했을 때와 전역 함수 이름 목록·등록된 이벤트 종류 목록이 같다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"` (특히 `scripts/verify_kst_dates.js`).
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고). fixture는 검사기가 줄 수 검사에서 뺀다.

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트)에서 분리 전(main)·후(브랜치) `parent_dashboard.html?role=parent`를 열어 스크립트 로드 목록, 화면 HTML·계산된 스타일, 레이더 차트·위젯 표시, 콘솔 오류를 비교한다. 2026-10-31 main은 콘솔 오류 0건, 동적 로드 없음.

## 7. 문서
- `CORE_CATALOG.md` 1137줄 근처 등 파일 구성을 설명하는 곳만 새 구성으로 고친다. 지난 분리 명세서는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
