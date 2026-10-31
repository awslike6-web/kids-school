# 🧹 800줄 대청소 6차: 부모 대시보드 `parent_dashboard.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
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

## 8. 구현 기록 (2026-10-31)

- 승인한 원본 1–546 / 547–1120줄 경계를 그대로 적용했다. 각 파일 맨 위에 지정 머리 주석 한 줄만 추가했으며 본문 바이트·주석·들여쓰기는 보존했다. 머리 주석을 제외하고 두 파일을 이으면 fixture와 바이트 단위로 같다. fixture는 작업 전 원본 그대로이며 HEAD와는 줄바꿈 형식만 다르다.
- 실제 줄 수(머리 주석 포함):

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/js/parent_dashboard.js` | 547 |
| `kids/js/parent_dashboard_render.js` | 575 |
| `tests/fixtures/parent-dashboard-split/parent_dashboard.js` | 1120 |

- HTML에서 두 클래식 스크립트를 `?v=20261031-dash-split`로 연달아 한 번씩 로드한다. 태그 변경 외 마크업 변경은 없다. `localDateStr`·`calcStreak`는 첫 파일에 남아 기존 날짜 시험은 수정하지 않았다. 카탈로그의 위젯 소속과 파일 구성을 갱신했다.
- 신규 `tests/parent-dashboard-split.test.mjs`: 원본 재결합·600줄 상한·머리 주석·상대 경로·태그 순서/버전/중복·옛 버전 제거, APP_CONFIG 유무에 따른 단독/전체 로드·전역 함수/상태/이벤트 비교를 검사한다. 운영 노션에 접속하지 않는다.
- `node --test tests/parent-dashboard-split.test.mjs`: 7건 통과, 실패 0건.
- `node scripts/verify_kst_dates.js`: 9건 통과, 실패 0건.
- `node --test "tests/**/*.test.mjs"`는 실패로 종료했다. 실패 상세와 요약을 확인하기 위해 `node --test --test-reporter=tap "tests/**/*.test.mjs"`로 재실행한 결과 233건 중 통과 229·실패 2·건너뜀 1·기존 TODO 1이었다. 실패는 기존 `gallery-character-runner.test.mjs`와 `gallery-multi-character.test.mjs`의 Python 빌더 하위 프로세스 종료 상태가 null인 두 건이다. 이번 작업에서 해당 시험·빌더는 수정하지 않았다.
- 계약 검사는 첫 변경 JS에 지정한 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>`를 실행했으나 python 명령을 찾지 못해 실행하지 못했다. §0에 따라 재시도하지 않았고 나머지 변경 파일의 계약 검사도 미실행이다. fixture는 사용자 지시대로 검사기의 `tests/fixtures/` 줄 수 예외에 해당하며 검사기를 수정하지 않았다.
- 필수 검사 미완료로 커밋 못 함. §6의 분리 전후 화면 비교는 Claude가 수행할 항목으로 남겼다. 운영 노션 쓰기·main 병합·푸시는 하지 않았다. 명세와 다른 구현은 없다.

### Claude 확인 (2026-10-31)

- `main:kids/js/parent_dashboard.js`와 두 파일(머리 주석 제외)을 순서대로 이은 내용이 줄바꿈 형식만 빼고 같다. fixture도 같다.
- `node --test "tests/**/*.test.mjs"`: 233개 중 통과 231개, 실패 0개(건너뜀 1·todo 1). Codex 환경의 갤러리 빌더 실패 2개는 Python이 막혀서였고 이 PC에서는 통과. 바뀐 파일 7개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8773·8774)로 `parent_dashboard.html?role=parent` 분리 전후 비교: 화면 글자(숫자 제외) 해시, 요소 486개, 레이더 차트 2개, 쓰기 요청 0건이 같고 콘솔 오류 없음. 계산된 스타일 차이는 무작위 위치인 배경 장식 15개와, 같은 목표 너비(2%·14%·29%·15%)로 채워지는 중이던 진행 막대 4개뿐.
