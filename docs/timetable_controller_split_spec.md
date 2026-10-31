# 🧹 800줄 대청소 11차: 시간표 `timetable_controller.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록. 같은 방식의 앞선 작업: `docs/parent_dashboard_split_spec.md`, `docs/daily_diary_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 시간표 규칙은 `docs/timetable_diary_spec.md`.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 최상위 경계 근거, 각 파일의 최상위 실행문 목록, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/timetable-split`, 브랜치 `codex/timetable-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/js/timetable_controller.js`(1206줄, IIFE 없는 클래식 스크립트, `timetable.html`에서만 로드)를 **동작을 하나도 바꾸지 않고** 연속 구간 3개로 잘라 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
| 파일 (`kids/js/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `timetable_controller.js` (**이름 유지**) | 1–503 | 503 | 요일·교시·과목 색 상수, `DEFAULT_BASE_TIMETABLE`, 상태 변수, 보기 설정, 날짜·시계·필터·공지 판정 헬퍼, `buildGridMap`, `renderLessonCell` |
| `timetable_grid.js` | 504–926 | 423 | `renderWeeklyGrid`, 모바일 열 너비·스크롤, 상단 공지 배너, 덧칠 항목·공지 안내 모달, `toggleOverlayItemComplete` |
| `timetable_notices.js` | 927–1206 | 280 | 공지 정렬·아이콘·렌더링, `renderAll`, 자녀 필터, 툴팁, `loadTimetableData`, 맨 끝 `updateClock()`·`setInterval`·`DOMContentLoaded` |

- 504줄은 `renderWeeklyGrid` 앞 `/**` 주석, 927줄은 최상위 `function getTodayWeekday()`. 계획 단계에서 함수·블록·템플릿 문자열 밖인지 확인해 보고한다.
- 첫 파일 이름을 유지하면 `docs/timetable_diary_spec.md`의 `DEFAULT_BASE_TIMETABLE` 설명과 `kids/core/timetable-boost.js` 주석이 그대로 맞는다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 새 두 파일과 첫 파일 맨 위에 한 줄 주석 `// kids/js/{파일} - timetable_controller.js 분리 {n}/3: {내용} (순서대로 로드)`만 추가한다.
2. **클래식 스크립트 그대로**: IIFE·`type="module"`·`defer` 금지. HTML `onclick`이 전역 함수를 부른다. 최상위 `const`/`let`은 원래 구간에.
3. **로드 순서**: `timetable_controller.js` → `timetable_grid.js` → `timetable_notices.js`. 앞 파일을 읽는 즉시 뒤 파일 함수를 부르는 코드가 없어야 한다(계획 단계에서 파일별 최상위 실행문을 모두 나열해 확인). 맨 끝 `updateClock()` 즉시 호출은 첫 파일에 정의된 함수를 부르므로 셋째 파일에 있어도 된다.
4. **참조**: `timetable.html`의 `<script src="kids/js/timetable_controller.js">`(버전 없음) 자리를 세 태그로 바꾸고 **모두** `?v=20261031-timetable-split`을 붙인다(옛 통짜 파일이 캐시에 남은 채 새 파일이 실리면 `const` 중복 선언 오류). 앞의 `kids/config.js`, `kids/core/notion-timetable.js` 순서는 그대로. 계획 단계에서 저장소 전체를 다시 검색해 다른 로드가 있으면 보고한다.

## 4. 범위 밖
- 시간표 기능·노션 쓰기 방식 변경, `kids/css/timetable.css`(별도 차수), 공통 코어.

## 5. T (시험)
1. 신규 `tests/timetable-split.test.mjs` (`tests/parent-dashboard-split.test.mjs` 방식):
   - 구현 때 원래 파일을 `tests/fixtures/timetable-split/timetable_controller.js`로 그대로 복사해 커밋한다.
   - 세 파일이 있고, 머리 주석 1줄씩 뺀 내용을 순서대로 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`).
   - 각 파일 600줄 이하. `timetable.html`이 세 파일을 같은 버전·지정 순서로 한 번씩 싣고 버전 없는 옛 참조가 없다.
   - `vm`(가짜 `window`·`document`·`localStorage`, 타이머·이벤트 등록 기록, `fetch`는 호출되면 실패)에서 앞 파일만(1개, 1~2개) 실행해도 오류가 없고, 세 파일을 순서대로 실행한 결과가 원래 파일 하나를 실행했을 때와 전역 함수 이름 목록·등록 이벤트·타이머 등록 목록이 같다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고). fixture는 검사기가 줄 수 검사에서 뺀다.

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트)에서 분리 전(main)·후(브랜치) `timetable.html`을 열어 화면 글자·class 목록·계산된 스타일·콘솔 오류를 비교하고, 자녀 필터 전환·공지 안내 모달·툴팁을 눌러 본다(완료 표시 등 쓰기는 하지 않는다).

## 7. 문서
- `CORE_CATALOG.md` 1025줄 근처와 `docs/timetable_diary_spec.md` 44줄의 파일 구성 설명에 새 두 파일을 더한다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
