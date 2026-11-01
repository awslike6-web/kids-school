# 🛟 5분 퀘스트 오프라인 보상 보존 명세서 (보상 재시도 대기열)

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 작업 지시 (구현 전)
> **근거**: 노션 현황판 카드 「5분 퀘스트 오프라인·빈 캐시 폴백 보완」, `quest-engine-spec` 스킬 §4 「빈 캐시와 오프라인」, GEMINI §6(보상 오디오·`grantRewardAndShowUI` 시그니처 보존), §8-0(무결성 우선·800줄 상한).
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`(§2-2 퀘스트, 보상·학습일지 항목)를 먼저 읽는다. `.agent/skills/quest-engine-spec/SKILL.md`도 읽는다.

---

## 0. 진행 방식
- **먼저 계획(바꿀 함수와 줄 범위, 대기열 저장 형식, 대기열에 넣는 조건과 넣지 않는 조건, 로컬 부수 효과를 한 번만 적용하는 방법, 비우기(flush) 시점과 동시 실행 방지, 시험 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/quest-reward-retry`, 브랜치 `codex/quest-reward-retry`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **노션에 실제로 쓰지 않는다.** 시험은 가짜 `fetch`로만 한다.
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. 현재 상태 (Claude 재현, 2026-11-01)
Worker(`workers.dev`)로 가는 모든 요청을 네트워크 오류로 실패시키고 localStorage를 비운 채 `quest_runner.html`을 열었다.

| 항목 | 결과 |
| :--- | :--- |
| 문제 공급 | **정상**. 민수 영어·국어·사회·과학·수학, 민서 영어·국어·수학 모두 1/5 문제가 뜬다. 3·3·3은 `empty_unit_items`로 기존 4+1로 넘어가고, `quest_engine.js`의 `getStaticFallbackQuestions`가 5문제를 채운다. 어제 받은 VOCA 캐시가 있으면 `getNotionCachedVocaList`가 날짜와 상관없이 쓴다. |
| 숙련도(3·3·3 진도) | **보존**. `QuestMastery.pushChanges` 실패분은 localStorage 대기열에 남아 다음 판에 재전송된다. |
| 학습일지 | **보존**. `study-log-store.js`가 `MINMIN_STUDY_LOG_QUEUE_V1`에 넣고 다음 호출·`load` 때 보낸다. |
| **완주 보상(+3 💎/🍬, 경험치)** | **유실**. `notion-reward.js`의 `grantRewardAndShowUI`가 인벤토리 조회 실패로 `false`를 돌려주고 아무것도 남기지 않는다. 오프라인에서 끝낸 판은 보상을 영영 못 받는다. |

그래서 이번 작업은 **보상 유실 하나만** 고친다. 문제 공급·숙련도·학습일지 경로는 이미 동작하므로 바꾸지 않는다.

## 2. A (목표)
`quest_runner.html`에서 노션에 닿지 못해 지급하지 못한 보상을 기기에 보관했다가, 다음에 연결되면 **정확히 한 번** 지급한다.

## 3. 범위
- 고칠 곳: `kids/core/notion-reward.js`의 `grantRewardAndShowUI`(퀘스트 화면만 이 파일을 싣는다), 필요하면 `quest_runner.html`의 캐시 버전 문자열.
- 공개 함수 `grantRewardAndShowUI(earned, isSilent, customExpType)`의 이름·인자·반환값 의미(`true` 지급됨/관리자 통과, `false` 지급 안 됨)는 그대로 둔다. `quest-runner.js`·`quest-lesson-ui.js`의 호출부는 바꾸지 않는다.
- 범위 밖: `notion-study-logger.js`의 같은 이름 함수(다른 화면용 사본, 이번에는 손대지 않음 — 완료 보고에 "후속 후보"로 적는다), 학습일지·숙련도 경로, 일일 상한 규칙 자체, 화면 문구.

## 4. 요구 사항
1. **대기열**: localStorage 키 `MINMIN_REWARD_QUEUE_V1`. 항목에는 지급에 필요한 맥락을 **넣는 시점 값으로** 담는다: 학생 이름(`민수`/`민서`), 테마(`currentTheme`), 과목(`window.currentSubject`), `earned`, `customExpType`, 고유 id, 만든 시각. 비울 때는 현재 로그인 사용자가 아니라 **항목의 학생으로** 지급한다(태블릿을 두 아이가 같이 쓴다).
2. **넣는 조건**: 노션 인벤토리가 바뀌지 않았다고 확실한 실패만 넣는다.
   - 인벤토리 조회가 네트워크 오류이거나 응답이 실패(`!ok`)인 경우.
   - PATCH가 실패 응답(`!ok`)을 돌려준 경우, 또는 PATCH 요청 자체가 네트워크 오류로 거부된 경우.
   - **넣지 않는 경우**: 관리자 모드(`아빠`/`엄마`/`어른`), 일일 상한 도달로 0개, 학생 인벤토리가 없음(`results` 0건), 과목명이 없는 경우.
3. **로컬 부수 효과는 지급마다 정확히 한 번**: 지금은 PATCH 전에 `last_play_date_*` 날짜 갱신, `ScreenTimeTracker.recordDailyRewardEarned`, `MINMIN_CUMULATIVE_WEALTH_*`(소원권 누적)가 실행된다. PATCH가 실패해 대기열로 갔다가 나중에 다시 지급될 때 이것들이 두 번 적용되면 안 된다. 방법(PATCH 성공 뒤로 옮기기 또는 적용 여부를 항목에 기록하기)은 계획에서 제안한다. 옮기는 경우 성공 경로의 결과값(노션에 쓰는 값·로컬 캐시·모달 문구)은 지금과 같아야 한다.
4. **비우기(flush)**: `study-log-store.js`의 `flushQueue` 방식을 따른다(한 번에 하나씩 순서대로, 진행 중이면 같은 약속 재사용, 성공한 항목만 지움, 실패분은 다음까지 보존). 시점: 페이지 `load` 때, 그리고 보상 지급이 한 번 성공한 직후. 비울 때는 항상 조용히(`isSilent` = true) 지급하고, 비우는 도중 실패해도 같은 항목을 다시 넣지 않는다(중복 항목 금지). 한 번에 최대 10건.
5. **일일 상한·부스트**: 비울 때 그 시점의 노션 `오늘 획득_*`·시간표 부스트로 계산한다(지금 함수의 규칙 그대로). 어제 오프라인으로 끝낸 판이 오늘 들어가면 오늘 몫으로 센다 — 문서에 한 줄 남긴다.
6. **두 탭 동시 비우기**: 같은 기기에서 퀘스트 탭 두 개가 동시에 비우면 중복 지급될 수 있다. 계획에서 막는 방법(예: localStorage 잠금 + 만료 시각)을 제안한다.
7. 클래식 스크립트·전역 이름 유지. `notion-reward.js`는 600줄 이하로 유지한다(지금 443줄).

## 5. T (시험)
1. 신규 `tests/quest-reward-retry.test.mjs`(`vm`, 가짜 `fetch`·`localStorage`, 실제 노션 접속 없음):
   - 조회 네트워크 오류 → `false`, 대기열 1건, 로컬 부수 효과(날짜 키·누적 자산·스크린타임 기록) 변화 없음.
   - 다음 호출에서 조회·PATCH 성공 → 대기열 항목이 지급되고(PATCH 본문 값 확인) 대기열이 빈다. 부수 효과는 지급 한 번만큼만 바뀐다.
   - PATCH 실패 응답 → 대기열에 남고, 다시 비울 때 성공하면 부수 효과가 두 번 적용되지 않는다.
   - 관리자 모드·일일 상한 0개·인벤토리 없음 → 대기열에 넣지 않는다.
   - 항목의 학생으로 지급한다: 민수 항목을 민서 로그인 상태에서 비워도 민수 인벤토리로 PATCH한다.
   - 비우는 중 실패해도 항목이 늘지 않고, 10건 상한을 지킨다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`. `tests/notion-reward-split.test.mjs`는 `notion-reward.js`를 분리 전 fixture와 비교하므로, 이번 변경을 그 시험의 승인된 변경으로 등록하는 방식으로 고친다(fixture 파일 자체는 그대로 두고, 원본 쪽에도 같은 변경을 적용해 비교를 엄격하게 유지 — `tests/lobby-split.test.mjs`의 `applyConfigEdits` 방식 참고). 다른 비교는 느슨하게 만들지 않는다.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
Worker 요청을 네트워크 오류로 만드는 재현 서버에서 한 판을 끝내 대기열 1건을 확인하고, 같은 기기 상태로 쓰기 차단 서버(조회는 통과, 쓰기는 가짜 성공)에서 다시 열어 대기열이 비고 PATCH가 한 번만 나가는지, 퀘스트 완주 흐름(보상 음성·완주 모달·학습일지)이 그대로인지 본다.

## 7. 문서
- `CORE_CATALOG.md`의 `notion-reward.js` 항목에 보상 대기열(키·넣는 조건·비우는 시점)을 짧게 적는다.
- `.agent/skills/quest-engine-spec/SKILL.md` §4 「빈 캐시와 오프라인」 문단을 현재 상태(문제 공급·숙련도·학습일지·보상 모두 보존)로 고치고 `python scripts/sync_agent_skills.py`로 사본을 맞춘다(Python이 막히면 원본만 고치고 보고).
- 이 문서 상태를 "구현 완료"로 바꾸고 결과를 적는다.
