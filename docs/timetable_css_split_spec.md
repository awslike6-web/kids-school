# 🧹 800줄 대청소 13차: 시간표 `timetable.css` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
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
