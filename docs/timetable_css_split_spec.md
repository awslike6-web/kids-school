# 🧹 800줄 대청소 13차: 시간표 `timetable.css` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록. 같은 방식의 앞선 작업: `docs/gallery_css_split_spec.md`, `docs/haru_css_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 중괄호 깊이 0인 근거, 새 파일 이름과 예상 줄 수, `timetable.css` 참조 검색 결과, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/timetable-css-split`, 브랜치 `codex/timetable-css-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/css/timetable.css`(1010줄)는 `timetable.html` 한 곳에서만 쓰인다. **보이는 모습을 하나도 바꾸지 않고** 연속 구간 두 개로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
| 파일 (`kids/css/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `timetable.css` (**이름 유지**) | 1–458 | 458 | 변수·기본, 로비 모니터 화면, 주간 격자, 공지판 |
| `timetable-overlay.css` | 459–1010 | 552 | 이벤트 띠배너·요일 뱃지·과목 인디케이터, 오버레이 모달, 메모·공지 툴팁, 모바일·가로모드(`@media (max-width: 900px), (max-height: 500px)`), 데스크톱 퀵탭 숨김 |

- 459줄은 `/* 🌟 [이벤트 오버레이] ① 상단 공지 띠배너 스타일 */` 주석. 파일이 들여쓰기돼 있으므로 "최상위"는 중괄호 깊이 0으로 판단해 계획 단계에서 보고한다.
- 뒤쪽 모바일 `@media`가 앞쪽 격자 규칙을 덮어쓰므로 **반드시 앞 파일 → 뒤 파일 순서**로 싣는다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 선택자·속성·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 정리·중복 제거·버그 수정 금지(발견하면 보고만).
2. 새 파일 `timetable-overlay.css` 맨 위에만 한 줄 주석 `/* kids/css/timetable-overlay.css - timetable.css 분리 2/2: 이벤트 오버레이·모달·툴팁·모바일 (timetable.css 다음에 로드) */`를 추가한다. `timetable.css`는 1–458줄 원문만.
3. **순서 보존**: `timetable.html`의 `<link rel="stylesheet" href="kids/css/timetable.css">` 자리를 `kids/css/timetable.css?v=20261031-timetable-css-split`로 바꾸고 **바로 다음 줄**에 `<link rel="stylesheet" href="kids/css/timetable-overlay.css?v=20261031-timetable-css-split">`를 넣는다. 다른 `<link>`·`<script>` 순서는 그대로.
4. `@import`는 쓰지 않는다.

## 4. 범위 밖
- 다른 800줄 초과 파일, 시간표 JS·HTML 마크업.

## 5. T (시험)
1. 신규 `tests/timetable-css-split.test.mjs` (`tests/gallery-css-split.test.mjs` 방식):
   - 구현 때 원래 파일을 `tests/fixtures/timetable-css-split/timetable.css`로 그대로 복사해 커밋한다.
   - `timetable.css` + (`timetable-overlay.css`에서 머리 주석 1줄 뺀 것)을 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`).
   - 두 파일 600줄 이하, 주석을 뺀 뒤 `{`·`}` 개수가 같다.
   - `timetable.html`이 두 파일을 같은 버전으로 연달아 싣고, 버전 없는 옛 링크가 남지 않았다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트, 한 탭씩 — 노션 429 주의)에서 분리 전(main)·후(브랜치) `timetable.html`을 열어 CSS 규칙 해시, 요소 전체 계산된 스타일, 콘솔 오류를 비교하고 폰 폭(375px)도 본다.

## 7. 문서
- `docs/timetable_diary_spec.md` 47줄과 `CORE_CATALOG.md`의 시간표 파일 구성 설명에 `timetable-overlay.css`를 더한다. 지난 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-10-31)

승인한 원본 범위 1–458 / 459–1010을 그대로 사용했습니다. 457줄의 `body.mode-personal .viewer-badge` 규칙이 같은 줄에서 닫히고, 458줄은 빈 줄, 459줄은 이벤트 오버레이 머리 주석입니다. 절단점의 중괄호·소괄호 깊이는 0이며 열린 주석·문자열이 없습니다. 주석을 뺀 앞 구간은 중괄호 107쌍, 뒤 구간은 79쌍이고 중간에 음수 깊이가 없습니다. 명세서와 다른 구현은 없습니다.

| 파일 | 실제 줄 수 | 역할 |
| :--- | ---: | :--- |
| `kids/css/timetable.css` | 458 | 원본 1–458줄 그대로 유지 |
| `kids/css/timetable-overlay.css` | 553 | 지정 머리 주석 1줄 + 원본 459–1010줄 |
| `timetable.html` | 88 | 기존 CSS 링크 자리에서 두 파일 순차 로드 |
| `tests/timetable-css-split.test.mjs` | 90 | 신규 회귀 시험 6개 |
| `tests/fixtures/timetable-css-split/timetable.css` | 1010 | 분리 전 원본 바이트 보존, 계약 검사 줄 수 대상 제외 |
| `kids/core/CORE_CATALOG.md` | 1273 | 두 CSS의 역할·로드 순서·시험 등록 |
| `docs/timetable_diary_spec.md` | 206 | 두 CSS의 파일 구성·로드 계약 기록 |
| `docs/timetable_css_split_spec.md` | 83 | 구현 결과·검증 한계 기록 |

물리 줄 수 기준입니다. 마지막 개행을 별도 항목으로 세는 시험의 `split(/\r?\n/).length`에서는 CSS가 각각 459·554로 집계되며 모두 600줄 이하입니다. fixture는 계약 검사기의 `tests/fixtures/` 제외 대상이므로 1010줄을 그대로 보존합니다.

- 선택자·속성·주석·들여쓰기·CRLF를 그대로 옮겼고 새 CSS 맨 위의 지정 주석 1줄만 추가했습니다. HTML은 기존 Google Fonts 링크 다음에서 두 CSS를 `?v=20261031-timetable-css-split`로 바로 다음 줄에 연속 로드합니다.
- Node 읽기 전용 대조로 CSS 재결합과 fixture의 바이트 완전 일치, fixture와 Git HEAD 원본의 CRLF 정규화 후 일치, HTML의 링크 외 원문 동일, 지난 명세서 미변경을 확인했습니다.
- 계획 단계 참조 검색 결과는 4개 파일·11줄이며 실제 화면 로드는 `timetable.html:8` 한 곳입니다. 나머지는 이번 명세서 8줄·시간표 일기 명세서 1줄·지난 시간표 JS 분리 명세서 1줄입니다.

### 실행한 검증과 남은 확인

- `node --test tests/timetable-css-split.test.mjs`: 종료 코드 0, 6개 통과·실패 0개. 고정 fixture 재결합·600줄 상한·독립 블록 경계·상대 경로·동일 버전·로드 위치/순서·옛 링크 제거를 검사합니다. 시험 실행 시 git·main·운영 노션을 읽지 않습니다.
- `node --test "tests/**/*.test.mjs"`: 종료 코드 1, 총 307개 중 통과 303개·실패 2개·건너뜀 1개·기존 todo 1개, 소요 시간 27261.3093ms. 실패는 기존 `tests/gallery-character-runner.test.mjs`와 `tests/gallery-multi-character.test.mjs`의 Python 빌더 시험입니다. 두 하위 프로세스의 `status=null`이 기대값 0과 달랐으며 기존 시험이 spawn 오류 코드를 출력하지 않아 구체적인 원인은 확인하지 못했습니다. todo의 두 기기 동시 upsert 한계는 실패 2개에 포함되지 않습니다.
- `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/timetable-css-split/kids/css/timetable.css`: PowerShell이 `python` 명령을 찾지 못해 종료 코드 1로 실행되지 않았습니다. §0에 따라 재시도하지 않았으며 나머지 변경 파일의 계약 검사도 미실행입니다.
- `git diff --check`: 종료 코드 1, `kids/css/timetable.css:458: new blank line at EOF.` 원본 458줄의 빈 줄을 보존한 결과이므로 §3에 따라 제거하지 않았습니다.
- 커밋 못 함: 전체 회귀 시험과 필수 계약 검사가 통과하지 않아 커밋하지 않았습니다. main 병합·푸시·노션 기록은 하지 않았습니다.
- 화면 비교는 수행하지 않았습니다. §6의 Claude 후속 확인: Python 사용이 가능한 환경에서 전체 회귀·변경 파일별 계약 검사, 노션 쓰기 차단 서버의 CSS 규칙 해시·전체 요소 계산 스타일·콘솔·375px 화면 비교 후 검증·커밋.

### Claude 확인 (2026-10-31)

- `main:kids/css/timetable.css`와 `timetable.css` + `timetable-overlay.css`(머리 주석 제외)를 이은 내용이 줄바꿈 형식만 빼고 같다. fixture도 같다. `git diff --check`의 「458줄 빈 줄」은 원본 458줄 빈 줄을 보존한 것.
- `node --test "tests/**/*.test.mjs"`: 307개 중 통과 305개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일 7개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8787·8788) 분리 전후 비교: 시간표 CSS 규칙 147개와 그 내용 해시가 같다(같은 순서). 폰 폭(375px)에서 같은 데이터 상태일 때 요소 212개의 계산된 스타일이 모두 같다. PC 폭은 노션 429로 main이 기본 시간표(58행), 브랜치가 284행을 받아 데이터가 달라 비교하지 않았다(규칙·순서가 같으므로 같은 데이터면 같은 모습). 스크립트 오류 없음.
