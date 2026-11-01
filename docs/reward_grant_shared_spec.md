# 💎 보상 지급 공용 모듈 `reward-grant.js` 명세서 (오프라인 보상 보존 전 화면 확대)

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01, Claude 검증 완료)
> **근거**: 앞선 작업 `docs/quest_reward_retry_spec.md`(퀘스트 화면만 보상 대기열 적용, 병합 `c057674a`), GEMINI §8-1(중복 복붙 금지 — 공통 코어는 한 벌), §6(보상 함수 시그니처 보존), §0(카탈로그 실시간 갱신).
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`(보상·학습일지 항목)를 먼저 읽는다. 앞선 명세서와 그 시험 `tests/quest-reward-retry.test.mjs`를 꼭 읽는다.

---

## 0. 진행 방식
- **먼저 계획(새 모듈의 공개 API, 두 파일에서 지울 줄과 남길 껍데기, 두 사본의 차이를 어떻게 합칠지 표, 자동 로드 방식, 시험 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/reward-grant-shared`, 브랜치 `codex/reward-grant-shared`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **노션에 실제로 쓰지 않는다.** 시험은 가짜 `fetch`로만 한다.
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. 배경
`grantRewardAndShowUI`가 두 벌 있다.
- `kids/core/notion-reward.js`: `quest_runner.html`만 싣는다. 2026-11-01 보상 대기열(`MINMIN_REWARD_QUEUE_V1`)이 들어갔다.
- `kids/core/notion-study-logger.js`: `notion-helper.js`가 싣는 모든 화면(국어방·영어방·하루방·용어사전·놀이터·수학 개념 화면 등)이 쓴다. 대기열이 없어 오프라인에서 보상이 사라진다.

두 사본은 이미 갈라졌다(주석·들여쓰기를 뺀 비교, 2026-11-01).

| 동작 | `notion-reward.js` | `notion-study-logger.js` |
| :--- | :--- | :--- |
| 보상 대기열·재지급·두 탭 잠금·부수 효과 PATCH 뒤 1회 | 있음 | 없음 |
| `학습설정` 동기화 | `syncQuizFlowFromCloud`만 | `syncQuizFlowFromCloud` + `SettingsManager.syncFromCloud` |
| 스크린타임 적립 | `ScreenTimeTracker.recordDailyRewardEarned`만 | 그것 → `window.recordDailyRewardEarned` → localStorage `MINMIN_DAILY_REWARD_SUM_*` 직접 기록 순서의 대체 경로 |
| 상한 도달·레벨업 모달의 로비 버튼 | 절대 경로 식(`/kids-school/lobby.html` 또는 `/lobby.html`) | `getRelativeLobbyUrl()`, 없으면 `./lobby.html` |
| 저장 실패 시(조용하지 않은 호출) | "노션 칼럼 확인" 실패 모달/alert | 없음 |
| 콘솔 로그 | PATCH 시도·본문·에러 응답 기록 | 없음 |

## 2. A (목표)
보상 지급 본체를 **한 벌**(`kids/core/reward-grant.js`)로 모으고, 두 파일의 `grantRewardAndShowUI`는 그 모듈로 넘기는 얇은 껍데기로 만든다. 그 결과 모든 화면의 보상이 오프라인에서도 보존된다.

## 3. 요구 사항
1. **새 모듈** `kids/core/reward-grant.js`(클래식 스크립트, IIFE, 전역 하나 `window.MinminRewardGrant`). 본체는 지금 `notion-reward.js`의 대기열 구현(앞선 명세서의 모든 규칙: 넣는 조건, 항목 학생으로 지급, 부수 효과 PATCH 성공 뒤 1회, `load`·성공 직후 flush, 최대 10건, Web Locks·없으면 잠금 없이, 관리자·상한 0개·인벤토리 없음·과목 없음은 넣지 않음, 상한 0개 대기 항목은 보존·부분 지급은 삭제)을 그대로 옮긴다. 600줄 이하.
2. **두 사본의 차이는 합집합으로**: §1 표에서 한쪽에만 있던 동작을 모두 남긴다. `학습설정`은 두 동기화를 모두 부른다(없으면 건너뜀). 스크린타임은 `notion-study-logger.js`의 대체 경로 순서를 쓴다. 로비 버튼은 `getRelativeLobbyUrl`이 있으면 그것, 없으면 지금 `notion-reward.js`의 절대 경로 식. 콘솔 로그는 남긴다.
3. **실패 모달**: 네트워크 오류·실패 응답으로 **대기열에 넣은 경우**에는 "노션 칼럼 확인" 모달을 띄우지 않고, 조용하지 않은 호출이면 짧은 안내("인터넷이 연결되면 보상이 자동으로 들어가요")만 띄운다(`showRewardModal`/`updateRewardModal`이 있으면 그 모달, 없으면 아무것도 안 띄움 — alert 금지). 대기열에 넣지 않는 실패(인벤토리 없음 등)는 지금 `notion-reward.js`의 실패 모달 규칙을 따른다.
4. **껍데기**: `notion-reward.js`의 전역 `grantRewardAndShowUI`와 `notion-study-logger.js`의 `NotionStudyLogger.grantRewardAndShowUI`·`window.grantRewardAndShowUI`는 이름·인자(`earned, isSilent, customExpType`)·반환 의미를 유지하고 `MinminRewardGrant`로 넘긴다. 모듈이 아직 없으면 두 파일이 `study-log-store.js`를 불러오는 방식과 같게 스스로 불러오고 기다린다. `calculateLevelInfo` 등 다른 공개 함수는 그대로 둔다.
5. **이름 충돌 금지**: `notion-helper.js` 화면은 `mission-reward-engine.js`·`quiz-feedback-overlay.js`를 싣는다. 새 모듈은 최상위 `const`/`let`/`function` 이름을 만들지 않는다(IIFE 안에만). 두 껍데기 파일이 같은 화면에 함께 실리지 않는다는 기존 계약(`tests/notion-reward-split.test.mjs`)은 유지한다.
6. **캐시 버전**: 바뀐 파일을 싣는 태그·로더의 버전 문자열을 올린다(`quest_runner.html`의 보상 세 태그, `notion-helper.js` 로더 목록의 `notion-study-logger.js`). `notion-helper.js` 자체를 고쳐야 하면 계획에서 보고한다.
7. 줄 수: 세 파일 모두 600줄 이하(현재 `notion-reward.js` 498, `notion-study-logger.js` 425).

## 4. 범위 밖
- 보상 계산식·일일 상한·시간표 부스트·레벨 규칙 변경, 학습일지·숙련도 경로, `mission-reward-engine.js`.

## 5. T (시험)
1. `tests/quest-reward-retry.test.mjs`의 22개 경우를 새 모듈 기준으로 옮기거나 그대로 통과시키고, 같은 경우를 **`notion-study-logger.js` 경로로도** 한 번씩 돌린다(대기열 저장·재지급·부수 효과 1회·학생 지정).
2. 합집합 동작 시험: `SettingsManager.syncFromCloud`가 있으면 불린다, 스크린타임 대체 경로 세 단계, 로비 버튼 주소 두 경우, 대기열에 넣은 실패에서 칼럼 실패 모달이 안 뜨고 안내만 뜬다(조용한 호출은 아무것도 안 뜬다).
3. 두 껍데기의 성공 경로 PATCH 본문·로컬 값이 이번 변경 전과 같다(각 파일의 분리 전 fixture 또는 변경 전 원문과 비교 — 기존 엄격한 비교를 느슨하게 만들지 않는다. 비교를 고쳐야 하면 `tests/lobby-split.test.mjs`의 `applyConfigEdits`처럼 승인된 변경으로 등록).
4. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
5. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
같은 주소에서 오프라인 재현 서버 → 쓰기 차단 서버 순서로, `quest_runner.html`과 `notion-helper.js` 화면 하나(예: `kids/subjects/korean/korean.html`)에서 보상 적립 → 재지급 1회, 콘솔 이름 충돌 오류 없음을 본다.

## 7. 문서
- `CORE_CATALOG.md`: 새 모듈 항목(공개 API·자동 로드·대기열 규칙 요약) 추가, 두 파일 항목에서 보상 본체 설명을 "껍데기 → reward-grant.js"로 고친다.
- `docs/quest_reward_retry_spec.md`는 고치지 않는다. 이 문서 상태를 "구현 완료"로 바꾸고 결과를 적는다.

## 8. 구현 결과 (2026-11-01)

- `kids/core/reward-grant.js`(410줄)에 기존 퀘스트 지급 본체·대기열·UI를 모았다. 클래식 스크립트 IIFE이며 새 전역은 `window.MinminRewardGrant` 하나다. API는 `grant(earned, isSilent=false, customExpType=null, context=null)`와 `flushQueue()`다.
- `notion-reward.js`(170줄)와 `notion-study-logger.js`(194줄)는 호출 당시 학생·테마·과목·시각을 먼저 확보하고 공용 모듈을 기다려 위임한다. 공개 함수 이름·세 인자·반환 의미·logger 네임스페이스는 유지했다. 학습일지·숙련도·계측·미션 보상 코드는 바꾸지 않았다.
- 두 껍데기는 자기 스크립트 기준 같은 폴더에서 `reward-grant.js?v=20261101-reward-grant-shared`를 중복 없이 자동 로드한다. 선행 로드·지연 로드·기존 태그 대기·로드 실패 후 재시도를 검사했다. 공용 모듈이 페이지 load 뒤 도착해도 초기 flush한다.
- 기존 대기열 키·항목 형식·FIFO 10건·동일 flush Promise·탭 직렬화·Web Locks 미지원 시 자동 flush를 유지했다. 항목에 담긴 학생으로 지급하고, 최신 인벤토리와 지급 시점 부스트·상한을 쓴다. 전날 실패분도 지급한 날 몫이다. 상한 0개 항목은 남기고 부분 지급 성공 항목은 삭제한다.
- 날짜·소원권 누적·스크린타임은 PATCH 성공 뒤 한 번만 반영한다. 스크린타임은 tracker → 전역 함수 → 두 기존 날짜 형식의 로컬 키 순서로 대체한다. 두 학습설정 동기화는 현재 학생과 지급 학생이 같을 때만 호출한다. PATCH 뒤 로컬/UI 오류는 재등록하지 않는다.
- 로비 주소는 기존 상대 경로 헬퍼 우선, 없으면 명세서의 기존 절대 경로 식이다. 대기열 저장 성공 시 일반 호출은 모달로 자동 지급 안내만 표시하고, 모달이 없거나 조용한 호출이면 표시하지 않는다. 그 외 실패는 기존 실패 안내를 유지한다. 시도·본문·오류 응답 로그도 유지했다.
- `quest_runner.html` 보상 세 태그, helper의 logger 로더, helper 자체의 버전이 고정된 화면 6곳을 갱신했다. science·voca 원문 보존 시험에는 이 버전 변경만 명시적으로 등록해 기존 바이트 비교·고정 해시를 유지했다.
- 기존 `tests/fixtures/*` 파일은 수정하지 않았다. 이번 변경 직전 reward·logger 원문을 `tests/fixtures/reward-grant-shared/`에 새로 보존했다. fixture는 계약 검사 줄 수 대상에서 제외한다. `tests/reward-grant-approved-edits.mjs`는 고정 원문에 승인 변경을 정확히 한 번씩 적용하며 운영 소스로 기대값을 만들지 않는다.
- 기존 보상 재시도 22개를 두 경로에서 각각 실행한다. 합집합·자동 로드·별칭·이름 충돌·변경 전 성공 결과 비교와 기존 분리 시험까지 아래 대상 시험 122개가 통과했다.

실행 명령(종료 코드 0):

```powershell
node --test --test-reporter=tap tests/quest-reward-retry.test.mjs tests/notion-reward-split.test.mjs tests/reward-grant-shared.test.mjs tests/science-css-split.test.mjs tests/voca-common-split.test.mjs
```

마지막 10줄 원문:

```text
  ...
1..122
# tests 122
# suites 0
# pass 122
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 328.5788
```

전체 회귀 명령(종료 코드 1, 기본 reporter 실행 뒤 같은 묶음을 TAP으로 재검증):

```powershell
node --test --test-reporter=tap "tests/**/*.test.mjs"
```

마지막 10줄 원문:

```text
  ...
1..442
# tests 442
# suites 0
# pass 438
# fail 2
# cancelled 0
# skipped 1
# todo 1
# duration_ms 27037.103
```

- 실패 2건은 기존 `gallery-character-runner.test.mjs`·`gallery-multi-character.test.mjs`의 Python 빌더 실행으로, `spawnSync` 종료 상태가 `null`이다. 보상 변경 관련 실패는 없다. 기존 skip·두 기기 동시 저장 TODO는 유지했다.
- 기존 한계는 유지된다. PATCH 응답 유실·성공 뒤 큐 삭제 전 종료·Web Locks 없는 두 탭·localStorage 저장 실패에서는 정확히 한 번 지급이나 보존을 보장하지 않는다.

## Claude 검증 (2026-11-01)
- Codex 환경의 전체 시험 실패 2건은 그 샌드박스에서 Python이 실행되지 않아 생긴 것이다. 같은 작업 폴더에서 Claude가 돌린 `node --test "tests/**/*.test.mjs"`는 442개 중 440 통과·실패 0·기존 TODO 1이다. 바뀐 파일 20개 모두 계약 검사 `[ALL PASS]`.
- 같은 주소(127.0.0.1:8798)에서 ① Worker 요청을 모두 실패시키는 재현 서버로 국어방(`korean.html`, notion-helper → notion-study-logger 껍데기 → reward-grant.js 경로)에서 민수로 조용한 지급(3)과 조용하지 않은 지급(2) → 둘 다 `false`, 대기열 2건, 이 화면엔 보상 모달이 없어 아무 창도 뜨지 않음(alert 없음), 이름 충돌 오류 없음. ② 로그인을 민서로 바꾸고 같은 주소를 쓰기 차단 서버로 열어 **퀘스트 화면**을 열자 `load` 때 대기열 2건이 모두 민수 인벤토리 페이지로 PATCH되고(2건) 대기열이 비었으며 민서 값은 그대로였다. 화면 간 대기열 공유 확인.
