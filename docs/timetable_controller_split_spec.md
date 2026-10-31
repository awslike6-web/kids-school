# 🧹 800줄 대청소 11차: 시간표 `timetable_controller.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
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

## 8. 구현 기록 (2026-10-31)

- 승인한 원본 1–503 / 504–926 / 927–1206줄 경계를 그대로 적용했습니다. 각 파일 맨 위에 지정 머리 주석 한 줄만 추가했으며, 머리 주석을 제외하고 순서대로 이은 본문은 원본 fixture와 바이트 단위로 같습니다. fixture는 작업 전 원본 그대로입니다.
- `timetable.html`에서 기존 config → notion-timetable 다음에 controller → grid → notices를 같은 버전 `?v=20261031-timetable-split`으로 연달아 한 번씩 로드합니다. 스크립트 태그 외 마크업·DOM·기능·통신 방식은 변경하지 않았습니다.
- 실제 줄 수(머리 주석 포함, 마지막 개행 뒤 빈 문자열은 줄로 세지 않음):

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/js/timetable_controller.js` | 504 |
| `kids/js/timetable_grid.js` | 424 |
| `kids/js/timetable_notices.js` | 281 |
| `tests/fixtures/timetable-split/timetable_controller.js` | 1206 |

- 신규 `tests/timetable-split.test.mjs`: 원문 정규화 재결합·본문 바이트 보존·600줄 제한·머리 주석·상대 경로·태그 순서/버전/중복·옛 무버전 참조 제거를 검사합니다. APP_CONFIG 유무별 앞 1개·앞 2개 부분 로드 안전성과 전체 로드 후 원본 대비 전역 함수 49개·공유 상태·시계 표시·이벤트·타이머 등록을 비교합니다. 콜백은 기록만 하며 `fetch`는 호출되면 실패하므로 운영 노션에 접속하지 않습니다.
- 카탈로그와 시간표 도메인 명세서의 파일 구성·역할·핵심 API·로드 순서를 갱신했습니다. 명세와 다른 구현은 없습니다.
- `node --test tests/timetable-split.test.mjs`: 9개 통과, 실패 0개(종료 코드 0).
- `node --test "tests/**/*.test.mjs"`: 286개 중 통과 282개·실패 2개·건너뜀 1개·기존 TODO 1개(종료 코드 1). 실패는 이번에 수정하지 않은 `tests/gallery-character-runner.test.mjs:546`과 `tests/gallery-multi-character.test.mjs:92`의 Python 빌더 하위 프로세스 종료 상태 `null !== 0`입니다. Python 명령을 찾지 못하는 환경이며 우회 실행이나 반복 시도는 하지 않았습니다.
- 계약 검사는 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/timetable-split/kids/js/timetable_controller.js`를 시도했으나 `python` 명령을 찾지 못해 실행하지 못했습니다. §0에 따라 재시도하지 않았으며 나머지 변경 파일의 계약 검사도 미실행입니다. fixture는 사용자 확인대로 검사기의 `tests/fixtures/` 줄 수 예외에 해당하며 검사기를 수정하지 않았습니다.
- 추가 읽기 전용 대조: fixture와 작업 전 HEAD의 JS는 체크아웃 줄바꿈 형식만 빼고 같고, HTML 변경은 지정한 스크립트 태그 교체뿐입니다. `git diff --check`는 첫 파일 끝의 새 빈 줄(`kids/js/timetable_controller.js:504: new blank line at EOF.`)을 경고했습니다. 이는 승인한 원본 503줄의 빈 줄이며 원문 보존 규칙에 따라 삭제하지 않았습니다.
- 필수 검사 미완료로 커밋 못 함(커밋 미시도). §6의 분리 전후 화면 비교는 Claude 담당으로 미수행이며 운영 노션 쓰기·main 병합·푸시도 하지 않았습니다.

### Claude 확인 (2026-10-31)

- `main:kids/js/timetable_controller.js`와 세 파일(머리 주석 제외)을 순서대로 이은 내용이 줄바꿈 형식만 빼고 같다. fixture도 같다.
- `node --test "tests/**/*.test.mjs"`: 286개 중 통과 284개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일 8개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8783·8784)로 `timetable.html` 분리 전후 비교: 노션 284행을 받은 상태에서 전체보기·민수·민서 필터와 알림장 안내 모달 네 상태의 요소 수·화면 글자(시각 제외)·class 목록·계산된 스타일이 모두 같다. 스크립트 오류(Uncaught) 없음, 쓰기 요청 0건.
- 참고: 두 탭을 동시에 열면 노션 Worker가 429(요청 과다)를 돌려주고 화면이 기본 시간표(58행)로 대체된다. 분리 전후가 같은 `notion-timetable.js`를 쓰는 기존 동작이며, 대체 시간표로 백지화되지 않는 방어가 정상 동작함을 확인했다. 비교는 30초 쉰 뒤 한 탭씩 다시 했다.
