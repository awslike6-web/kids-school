# 학습설정 저장 나눔 작업 지시서 (안티그래비티 주도 · Claude Opus 교차 검토)

> 작성 2026-11-23 · 작성 Claude Code · 실행 안티그래비티 · 위험도 **L2** (`kids/core/` 포함, 공부방 `GEMINI.md` §9)
> 근거: 실사용 리포트(`docs/study_usage_report_spec.md`) 첫 실행에서 민서 학습설정이 1,368자/2,000자, 이틀 새 +73자로 확인됨.

## 1. 왜 고치나
노션 글 칸(rich_text)은 **글 조각 하나에 2,000자까지만** 받는다. 지금 학습설정을 쓰는 곳 4곳이 모두 JSON 전체를 조각 하나에 넣는다.
2,000자를 넘는 날부터는 저장이 400 오류로 **조용히 실패**한다. 화면은 로컬 캐시로 계속 돌아가지만 노션에는 반영되지 않고, 다른 기기에서는 옛 설정이 보인다.
늘어나는 원인은 `questSettings` 안의 단원 목록이다. 학기가 바뀌어 단원이 쌓이면 넘는다.

## 2. 지금 상태 (2026-11-23 Claude 조사, 착수 전 다시 확인)
**쓰는 곳 (모두 `rich_text: [{ text: { content: 전체JSON } }]` 한 조각)**

| 파일:줄 | 무엇을 저장 | 화면 |
| :--- | :--- | :--- |
| `kids/core/fairy-settings-engine.js:123` | `appSettings` (설정 모달) | 로비 `index.html`, 영어 카드 등 |
| `kids/core/quiz-flow-controller.js:269` | `quizFlow` (keepalive) | `core.js`가 싣는 모든 화면 |
| `kids/subjects/haru/js/haru-checkin-engine.js:97` | `piggyBank` 저금통 | 하루방 `haru.html` |
| `kids/subjects/quest/parent_progress_controller.js:556` | `questSettings` 퀘스트 진도 | 부모 진도 화면 |

**읽는 곳 (모두 이미 조각을 이어 붙임 → 고칠 필요 없음, 회귀만 확인)**
`quiz-flow-controller.js:130` · `fairy-settings-engine.js:143` · `screentime-tracker.js:186` · `parent_dashboard.js:323` · `parent_dashboard_render.js:87` · `haru-checkin-engine.js:76` · 관제탑 `js/dashboard.js:124`. `reward-grant.js:148`·`lobby_subject_hud.js:406`은 속성을 그대로 넘긴다.
Worker는 학습설정을 쓰지 않는다. `.local-tools/review-parent-change.mjs`의 시험 자료는 `rich_text[0]`만 읽는다(로컬 도구라 범위 밖. 손대면 함께 고친다).

## 3. 할 일
1. **나눔 함수 하나**: 글을 받아 `[{ text: { content } }, …]` 배열을 돌려준다.
   - 조각마다 **1,900자 이하** (`study-log-store.js`의 `reportParts`와 같은 여유).
   - **자르지 않는다.** 설정 JSON은 앞을 버리면 깨진다. 노션 한도(조각 100개)를 넘으면 저장하지 말고 경고만 남긴다.
   - 이모지 같은 **두 칸짜리 글자(서로게이트 쌍)를 조각 경계에서 쪼개지 않는다.**
   - 이어 붙이면 원문과 한 글자도 다르지 않아야 한다.
2. **쓰는 곳 4곳 모두** 이 함수를 쓴다. 나눔 반복문을 4군데에 복사하지 않는다(헌법 §8-1).
3. **함수를 둘 곳은 설계 단계에서 정하고 Opus 검토를 받는다.** 조건:
   - 쓰는 곳이 도는 화면 어디에서도 함수가 없을 수 없어야 한다. 화면별로 어떤 파일이 먼저 실리는지 **표로 증명**한다(`core.js` 목록, `lobby_controller.js`, `haru.html`, 부모 진도 화면, `family_quiz.html`, `classcard.html`, `video-unit.js` 동적 로드).
   - 50~100줄짜리 새 파일로 쪼개지 말 것(골디락스). 이미 널리 실리는 공통 파일에 넣는 쪽을 먼저 검토한다.
   - `CORE_CATALOG.md`에 함수 이름·위치·쓰는 곳을 적는다.
4. 시험(`tests/`, 노션 미접속):
   - 함수: 1,900자 경계, 정확히 1,900·1,901자, 4,000자 이상, 경계에 걸친 이모지, 빈 글, 이어 붙이면 원문.
   - 지키기 시험: `kids/` 안에서 `"학습설정"`을 쓰는 코드가 한 조각 고정 배열을 다시 쓰면 실패하게 한다.
5. 명세 갱신: `docs/notion_schemas_school.md` 학습설정 행에 「여러 조각, 읽을 때 이어 붙임」 한 줄.

## 4. 하지 않을 것
- 다른 아이 몫이 같이 저장되는 중복(`questSettings`에 두 아이 몫, `screenTime.minseo`)은 **이번에 줄이지 않는다.** 옮기기(migration)가 필요해 따로 다룬다. → 2026-11-28 리팩토링 묶음 G에서 정리함(`docs/refactor_batches.md` G).
- 「캐시를 읽고 → 통째로 덮어쓰기」 구조(동시 저장 시 덮어쓸 위험)는 바꾸지 않는다. 눈에 띄면 보고만 한다.
- 노션 스키마·Worker는 건드리지 않는다.

## 5. 진행 순서와 Opus 교차 검토
안티그래비티가 짜고 Claude Opus가 검토한다(§9 「안티그래비티가 주도하면 `claude_call.ps1 -Role opus`」). 아이 이름 등 개인정보는 검토 요청문에 넣지 않는다(파일은 Opus가 직접 읽는다).

1. **설계 검토 (코드 쓰기 전)**: 함수 위치·화면별 로드 표·시험 목록을 `G:\master-tower\scratch\agy-work\settings_chunk_design.md`에 쓰고 부른다.
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File G:\master-tower\scripts\claude_call.ps1 -Role opus -Mode read -WorkDir G:\master-tower\kids-school-main -PromptFile G:\master-tower\scratch\agy-work\settings_chunk_design.md -OutFile G:\master-tower\scratch\agy-work\settings_chunk_design_review.md
   ```
   요청문 끝에 「이 설계에서 저장이 실패하거나 함수가 없는 화면이 생길 수 있는 곳을 찾아 달라. 고칠 점만 번호로.」를 붙인다.
2. 구현 → `node --test "tests/**/*.test.mjs"` → `python -X utf8 scripts/ci_local.py` 통과.
3. **변경 검토 (커밋 전)**: `git diff > G:\master-tower\scratch\agy-work\settings_chunk.diff`로 변경을 떠서 요청문에 경로를 적고 같은 방식으로 부른다(`-OutFile ...\settings_chunk_diff_review.md`). 지적을 하나씩 확인해 반영하거나, 반영하지 않는 이유를 적는다.
4. **점수 기록**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File G:\master-tower\scripts\claude_call.ps1 -Role opus -Score -Target "학습설정 나눔 diff" -Points 지적수 -Real 실제수
   ```
5. 화면 확인 (§6) → 커밋 → 푸시.

## 6. 화면 확인 (운영 DB 보호)
- 반드시 노션 쓰기 차단 서버 `python scripts/guarded_preview_server.py`(포트 8767)로 연다. 화면마다 `fetch`를 손으로 가로채지 않는다(2026-10-28 민수 학습설정 덮어쓰기 사고).
- 로컬 캐시 `MINMIN_CLOUD_SETTINGS_{아이}`를 2,500자 이상으로 부풀린 뒤, 설정 모달 저장과 하루방 저금통 저장을 눌러 **막힌 PATCH 요청 본문**에서 `학습설정.rich_text`가 2개 이상의 조각이고 각 1,900자 이하인지 확인한다. 끝나면 캐시를 원래대로 되돌린다.
- 화면 모양이 바뀌지 않으므로 폰 크기 사진은 필요 없다(L1-리팩터 성격). 대신 요청 본문 확인 결과를 보고에 붙인다.
- **운영 노션에 실제로 쓰는 시험은 하지 않는다.** 필요하면 사용자 승인 후 1건만, 원래 값으로 되돌리고 다시 읽어 확인한다.

## 7. 커밋과 보고
- 다른 작업자의 미커밋 파일(현재 영어 클래스카드 작업: `kids/js/english_classcard*.js`, `english.html`, `listen_place.html`, `docs/english_spec.md`, `CORE_CATALOG.md`의 클래스카드 덩어리, `scripts/data/system_map_generated.js` 등)은 **커밋에 섞지 않는다.** 자기 파일만 `git add`하고, `CORE_CATALOG.md`처럼 섞인 파일은 자기 덩어리만 올린다(`git add -p`가 안 되면 사용자에게 묻는다).
- 커밋 메시지 끝 두 줄(모델명은 실제 쓴 것, `agent_commit_rules.json`과 글자까지 같게):
  ```
  검토: opus
  Agent: antigravity (gemini-4-argon)
  ```
- 커밋 전 `python -X utf8 scripts/verify_contracts.py --mode git-diff` → `[ALL PASS]`. 푸시는 pre-push 훅이 `ci_local.py`를 돌린다. `--no-verify` 금지.
- 보고에 넣을 것: 바뀐 파일, 함수 위치와 로드 표, 시험 결과, Opus 지적 수/반영 수, 요청 본문 확인 결과, 남은 위험.

## 8. Claude가 마지막에 볼 것 (받아들이는 기준)
1. 쓰는 곳 4곳이 모두 나눔 함수를 쓰고, 한 조각 고정 배열이 `kids/`에 남지 않았다(`grep`).
2. 함수 시험 6종과 지키기 시험이 있고, 옛 코드로 되돌리면 지키기 시험이 실패한다.
3. 화면별 로드 표에 빠진 화면이 없다.
4. 커밋에 `검토: opus`와 맞는 `Agent:` 줄이 있고, `review_scores.tsv`에 점수 줄이 생겼다.
5. 다른 작업자 파일이 커밋에 섞이지 않았다.
6. 원격 CI 초록.
