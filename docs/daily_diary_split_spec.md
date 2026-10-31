# 🧹 800줄 대청소 3차: 마음일기 `daily-diary.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 3차분. 앞선 분리: `docs/math_pages_split_spec.md`(JS 분리 규칙), `docs/haru_css_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 일기장 동기화 규칙은 `docs/timetable_diary_spec.md`.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 최상위 함수 경계인 근거, 새 파일 이름과 예상 줄 수, 고칠 참조 목록 전체, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/daily-diary-split`, 브랜치 `codex/daily-diary-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/core/daily-diary.js`(1631줄)는 민서·민수 마음일기 모달, 노션 전송·동기화, 일기장 목록을 한 파일에 담고 있다. **동작을 하나도 바꾸지 않고** 연속된 구간 4개로 잘라 모든 파일을 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
각 절단 줄은 함수 앞 절 주석(또는 함수 선언) 줄이다. 계획 단계에서 각 줄이 최상위(어떤 함수·블록·템플릿 문자열 안도 아님)인지 확인해 보고한다.

| 새 파일 (`kids/core/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `daily-diary-base.js` | 1–487 | 487 | KST 날짜, 로컬 저장·삭제, 로비 버튼, 음성 입력, 모달 열기·닫기·탭 |
| `daily-diary-forms.js` | 488–942 | 455 | 민서·민수 일기 폼, 선택 카드·풍선 태그, AI 일상 로그, 노션 전송, 보상 |
| `daily-diary-sync.js` | 943–1326 | 384 | 노션 일기 해석·조회, 캐시 정리·병합, `syncDiariesFromNotion` |
| `daily-diary-submit.js` | 1327–1631 | 305 | 민서·민수·부모 제출, 성공 모달, 일기장 목록, 맨 끝 `window.*` 내보내기 |

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 이름 변경·정리·버그 수정 금지(발견하면 보고만). 각 새 파일 맨 위에 한 줄 주석 `// kids/core/{파일} - daily-diary.js 분리 {n}/4: {내용} (순서대로 로드)`만 추가한다.
2. **클래식 스크립트 그대로**: IIFE·`type="module"`·`defer`를 쓰지 않는다. HTML `onclick`과 다른 파일이 전역 함수·`window.*`를 부른다. 최상위 `let`/`const`(`diarySpeechRecog`, `AI_LOG_DB_ID`, `DIARY_PRUNE_GRACE_MS`, `isDiarySyncing` 등)는 원래 구간에 그대로 둔다.
3. **로드 순서**: 반드시 base → forms → sync → submit. 파일을 읽는 즉시 실행되는 코드(맨 끝 `window.*` 대입)는 마지막 파일에만 있다.
4. **참조 4곳을 모두 바꾼다** (하나라도 빠지면 같은 파일이 두 번 실려 `let` 중복 선언 오류가 난다. `kids/config.js`의 `loadCoreScripts`는 파일 이름으로 이미 실린 스크립트를 건너뛴다):
   - `kids/core/core.js`의 `requiredCores`: `"daily-diary.js"` 자리에 4개를 순서대로.
   - `kids/js/lobby_controller.js`의 `lobbyCores`: 같은 방식.
   - `kids/subjects/haru/haru.html`, `kids/subjects/korean/korean.html`의 `<script src="../../core/daily-diary.js?v=20261025-3">`: 그 자리에 4개 태그를 순서대로, 버전 `?v=20261031-diary-split`.
   - 계획 단계에서 `kids/`, `scripts/`, `tests/`, `docs/` 전체를 다시 검색해 다른 참조가 있으면 보고한다.
5. 원래 `kids/core/daily-diary.js`는 지운다.

## 4. 검증 스크립트 갱신
- `scripts/verify_diary_sync.js`: 지금은 파일 1개를 `vm`으로 읽는다. 4개를 순서대로 읽게 바꾼다. 파일 목록은 한 곳(상수 하나)에만 둔다. `--file <경로>` 옵션은 `--core-dir <폴더>`(그 폴더의 같은 4개 파일을 읽음)로 바꾸고 머리 설명과 `CORE_CATALOG.md` 안내도 고친다. 시험 내용·판정은 바꾸지 않는다.
- `scripts/verify_kst_dates.js`: `kids/core/daily-diary.js`에서 함수를 뽑는 곳을 그 함수가 옮겨 간 파일로 바꾼다. 시험 내용은 그대로.
- 두 스크립트는 `tests/regression.test.mjs`에서 돌아간다.

## 5. 범위 밖
- 다른 800줄 초과 파일(`notion-reward.js`, `my-room.html`, `gallery.css` 등)과 공통 코어의 다른 파일.
- 일기 기능 수정, 노션 스키마 변경.

## 6. T (시험)
1. 신규 `tests/daily-diary-split.test.mjs`:
   - 구현 때 원래 `daily-diary.js`를 `tests/fixtures/daily-diary-split/daily-diary.js`로 그대로 복사해 커밋한다(시험 때 git·main을 읽지 않음).
   - 4개 파일이 있고, 머리 주석 1줄을 뺀 내용을 순서대로 이어 붙인 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`와 같게).
   - 각 파일 600줄 이하.
   - 참조 4곳(`requiredCores`, `lobbyCores`, 두 HTML)이 모두 4개를 같은 순서로 갖고, `daily-diary.js` 단독 참조가 남지 않았으며 원래 파일이 없다.
   - `vm` 컨텍스트(가짜 `window`·`document`·`localStorage`)에서 4개를 순서대로 실행하면 오류가 없고, 원래 파일을 실행했을 때와 `window`에 생긴 함수 이름 목록이 같다(17개 이상).
   - 앞 파일들만 실행해도(1개, 1~2개, 1~3개) 오류가 나지 않는다(읽는 즉시 뒤 파일 함수를 부르지 않음).
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 7. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버에서 로비·하루방·국어방의 마음일기 모달을 분리 전·후로 열어 민서·민수 폼, 일기장 목록 탭, 콘솔 오류, 스크립트 중복 로드 여부를 비교한다. 제출은 쓰기 차단 상태에서 눌러 본다.

## 8. 문서
- `CORE_CATALOG.md`, `docs/timetable_diary_spec.md`의 `daily-diary.js` 언급을 새 파일 구성으로 고친다. `docs/gallery_archive_spec.md`의 언급도 맞춘다. 지난 분리 명세서(`math_pages_split_spec.md`, `haru_css_split_spec.md`)는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
