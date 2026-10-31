# 🧹 800줄 대청소 4차: 보상 모듈 `notion-reward.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 4차분. 앞선 JS 분리: `docs/daily_diary_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 퀘스트 쪽 계약은 `docs/quest_lesson_spec.md`.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 최상위 경계인 근거, 새 파일 이름과 예상 줄 수, 고칠 참조 목록 전체, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/notion-reward-split`, 브랜치 `codex/notion-reward-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/core/notion-reward.js`(1338줄)는 학습일지·보상 UI, 음성 입력, 퀴즈·미션 보상, 토론 보상, 이탈 확인을 한 파일에 담고 있다. **동작을 하나도 바꾸지 않고** 연속된 구간 3개로 잘라 모든 파일을 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
계획 단계에서 각 절단 줄이 최상위(어떤 함수·블록·템플릿 문자열 안도 아님)인지 확인해 보고한다.

| 파일 (`kids/core/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `notion-reward.js` (**이름 유지**) | 1–442 | 442 | 공용 모듈 자동 로드 IIFE, 설정값, `sendStudyLogToNotion`, 레벨 계산, `grantRewardAndShowUI`, `window.__sttSession` |
| `notion-reward-quiz.js` | 443–891 | 449 | `setupDebouncedSTT`, 접속사 채점 가드레일, 미션 보상, 퀴즈 보상 세션 |
| `notion-reward-discussion.js` | 892–1338 | 447 | 이탈 시 세션 플러시(`pagehide`), 토론 보상, 대화 기억, 오답 선택 안내, 이탈 확인, 용어 정독 보상 |

**첫 파일 이름을 바꾸지 않는 이유**: 맨 앞 IIFE가 `document.currentScript`가 없을 때 `src`에 `notion-reward.js`가 들어간 스크립트를 찾아 공용 모듈 경로를 정한다. 이름을 유지하면 이 코드와 기존 문서·참조가 그대로 맞는다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 이름 변경·정리·버그 수정 금지(발견하면 보고만). 각 파일 맨 위에 한 줄 주석 `// kids/core/{파일} - notion-reward.js 분리 {n}/3: {내용} (순서대로 로드)`만 추가한다(첫 파일도 원래 1줄 앞에 이 한 줄).
2. **클래식 스크립트 그대로**: IIFE로 새로 감싸지 않고 `type="module"`·`defer`도 쓰지 않는다. 최상위 `var`/`const`, `window.*` 대입, `addEventListener` 등록은 원래 구간에 그대로 둔다.
3. **로드 순서**: `notion-reward.js` → `notion-reward-quiz.js` → `notion-reward-discussion.js`. 파일을 읽는 즉시 뒤 파일의 함수를 부르는 코드가 없어야 한다(계획 단계에서 최상위 실행문을 모두 나열해 확인).
4. **참조 바꾸기**: 계획 단계에서 `kids/`, 저장소 루트 HTML, `scripts/`, `tests/`를 다시 검색해 보고한다. 2026-10-31 확인된 직접 로드는 두 곳이다.
   - `quest_runner.html`의 `<script src="./kids/core/notion-reward.js?v=20261024-1">`
   - `kids/common_space/voca.html`의 `<script src="../core/notion-reward.js?v=20261024-1">`
   - 원래 태그 바로 뒤에 새 태그 2개를 순서대로 넣고, **세 태그 모두** 버전을 `?v=20261031-reward-split`로 바꾼다(옛 통짜 `notion-reward.js`가 캐시에 남은 채 새 파일이 실리면 `const` 중복 선언 오류가 나기 때문).
   - 동적 로더 목록(`requiredCores`, `lobbyCores` 등)에 `notion-reward`가 있으면 같은 순서로 넣는다.

## 4. 검증 스크립트 갱신
- `scripts/verify_study_log_store.js`의 `['study-log-store.js', 'notion-reward.js']`는 세 파일을 모두 순서대로 읽게 바꾼다. 시험 내용·판정은 그대로.

## 5. 범위 밖
- 다른 800줄 초과 파일(`my-room.html`, `gallery.css` 등)과 `quest_runner.html`의 다른 부분.
- 보상 규칙·노션 스키마 변경.

## 6. T (시험)
1. 신규 `tests/notion-reward-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/notion-reward-split/notion-reward.js`로 그대로 복사해 커밋한다.
   - 세 파일이 있고, 머리 주석 1줄을 뺀 내용을 순서대로 이어 붙인 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`와 같게).
   - 각 파일 600줄 이하.
   - 두 HTML이 세 파일을 같은 순서·같은 버전으로 연달아 로드하고, 옛 버전 `?v=20261024-1` 참조가 남지 않았다.
   - `vm` 컨텍스트(가짜 `window`·`document`·`localStorage`, `addEventListener` 기록)에서 세 파일을 순서대로 실행하면 오류가 없고, 원래 파일을 실행했을 때와 비교해 전역 함수 이름 목록, `window`에 생긴 이름 목록, 등록된 이벤트 종류 목록이 같다.
   - 앞 파일만(1개, 1~2개) 실행해도 오류가 나지 않는다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 7. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버에서 `quest_runner.html`과 `voca.html`을 분리 전·후로 열어 스크립트 로드 목록·중복, 전역 함수, 콘솔 오류를 비교하고, 퀘스트 한 문제를 풀어 정답·오답 보상 흐름이 같은지 본다.

## 8. 문서
- `CORE_CATALOG.md`, `docs/quest_lesson_spec.md`, `docs/homeschool_spec.md`에서 파일 구성·줄 수를 설명하는 곳만 새 구성으로 고친다(함수가 "notion-reward 경로"라는 설명은 그대로 둬도 된다). 지난 분리 명세서는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
