# 🧹 800줄 대청소 9차: 로비 `lobby_controller.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-0 IIFE 캡슐화, §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 마지막(9차)분. 앞선 JS 분리: `docs/notion_reward_split_spec.md`, `docs/parent_dashboard_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식 (이번에는 설계 승인이 특히 중요)
- 이 파일은 거의 전체가 하나의 IIFE이고 함수들이 클로저 변수(`activeUserKey`, `isAdminSession`, `modalState`, `runtimeDailyEarned`)를 함께 쓴다. **앞선 분리처럼 잘라 옮기기만으로는 안 되고 작은 코드 변경이 필요하다.**
- **먼저 설계 계획만 보고하고 멈춘다.** 계획에는 다음을 모두 넣는다.
  1. 새 파일 이름·줄 수·담당 함수 목록
  2. 원문 그대로 옮기는 부분과 **바뀌는 줄의 전후 원문 전체 목록**(예: `activeUserKey` → `ctx.getActiveUserKey()`)
  3. 클로저 상태를 넘기는 방식과, 그 방식에서 값이 언제 읽히는지(호출 시점에 최신 값을 읽어야 함)
  4. 로드 순서와 `lobby.html` 태그 변경
  5. 동작이 같다는 것을 보일 시험 설계
  6. 이 문서와 다르게 하려는 점
- 작업 폴더: `G:/master-tower/scratch/worktrees/lobby-split`, 브랜치 `codex/lobby-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/js/lobby_controller.js`(1102줄, `lobby.html`에서만 로드)를 **동작을 하나도 바꾸지 않고** 2~3개 파일로 나눠 모두 600줄 이하로 만든다.

## 2. 구조 (2026-10-31 main 기준 조사)
- 1–106줄: IIFE 밖 최상위 상수(`MINSU_AVATAR_SRC`, `SUBJECT_META`, `PLAYGROUND_ITEMS`, `USER_CONFIGS`)와 `window.USER_CONFIGS` 대입.
- 108–1102줄: IIFE. 안에 `lobbyCores`, 클로저 상태 4개, 함수 약 40개, `window.*` 핸들러 약 20개, 맨 끝 초기화(1046줄~).
- 클로저 상태를 쓰지 않거나 적게 쓰는 묶음:
  - **과목 상태 묶음 335–596줄**: `getSubjectBoost`, `getSubjectEarnedToday`(runtimeDailyEarned), `getSubjectCapState`(activeUserKey), `renderSubjectCapStates`(activeUserKey), `renderMinseoSubjectStates`, `renderMinsuSubjectStates`, `findRecommendedSubject`(activeUserKey).
  - **HUD·인벤토리 묶음 849–1024줄**: `updateGuardianHud`, `renderHudInventoryValues`(isAdminSession), `fetchInventoryForUser`(isAdminSession, runtimeDailyEarned; `getTodayKstString`, `renderSubjectCapStates` 호출).

## 3. 제안 설계 (Codex가 검토해 확정)
| 파일 (`kids/js/`) | 내용 | 방식 |
| :--- | :--- | :--- |
| `lobby_config.js` | 1–106줄 최상위 상수와 `window.USER_CONFIGS` | **원문 그대로 이동**(최상위 `const`는 다른 클래식 스크립트에서도 그대로 보인다) |
| `lobby_subject_hud.js` | 과목 상태 묶음 + HUD·인벤토리 묶음 | IIFE 하나가 `window.LobbySubjectHud = { create(ctx) }` 같은 공장 함수를 등록. 함수 본문은 원문 그대로 두고 클로저 변수 읽기·쓰기만 `ctx`를 거치게 바꾼다 |
| `lobby_controller.js` (이름 유지) | `lobbyCores`, 클로저 상태, 나머지 함수, `window.*` 핸들러, 초기화 | IIFE 안에서 `ctx`(상태 읽기/쓰기 함수와 필요한 공용 함수)를 만들어 공장 함수에 넘기고, 돌려받은 함수를 같은 이름의 지역 변수로 받아 기존 호출 코드를 그대로 쓴다 |

- `ctx`는 값을 복사하지 말고 **호출할 때마다 최신 상태를 읽는** 함수(`getActiveUserKey()` 등)나 상태 객체 참조로 넘긴다. `runtimeDailyEarned`처럼 객체를 고쳐 쓰는 것은 같은 객체를 공유한다.
- 새 전역 이름은 `LobbySubjectHud` 하나만 둔다(4차 교훈: 다른 모듈과 최상위 이름이 겹치면 파일 전체가 실행되지 않는다). 계획 단계에서 `kids/`·루트 HTML 전체에서 이 이름과 `lobby_config.js`의 상수 이름이 다른 곳에 최상위로 선언돼 있지 않은지 검색해 보고한다.
- `lobbyCores` 배열은 `lobby_controller.js`에 그대로 둔다(`tests/daily-diary-split.test.mjs`, `tests/fairy-tts.test.mjs`가 이 파일에서 읽는다).
- 더 나은 경계(묶음 추가·제외)가 있으면 계획에서 근거와 함께 제안한다. 단 바뀌는 줄은 최소로.

## 4. 참조
- `lobby.html` 794줄 `<script src="./kids/js/lobby_controller.js?v=20261028-1">` 바로 앞에 `lobby_config.js`, `lobby_subject_hud.js` 태그를 순서대로 넣고 **세 태그 모두** `?v=20261031-lobby-split`(옛 통짜 파일이 캐시에 남은 채 `lobby_config.js`가 실리면 `const` 중복 선언 오류).
- 계획 단계에서 저장소 전체를 검색해 다른 로드·참조를 보고한다.

## 5. 범위 밖
- 로비 기능·화면·노션 쓰기 방식 변경, `lobby.html` 마크업, 공통 코어.

## 6. T (시험)
1. 신규 `tests/lobby-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/lobby-split/lobby_controller.js`로 그대로 복사해 커밋한다.
   - 세 파일 600줄 이하, `lobby.html`이 세 파일을 같은 버전·지정 순서로 한 번씩 싣고 옛 버전 참조가 없다.
   - `lobby_config.js` = 원본 1–106줄(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`).
   - 원문 그대로 옮긴 부분은 원본과 같고, 바뀐 줄은 계획에서 승인한 목록과 정확히 같다(원본과 분리본의 줄 단위 비교로 검사).
   - `vm`에서 가짜 DOM(요소 조회 기록, `localStorage`, 이벤트 등록 기록)으로 원본 하나와 분리본 셋을 각각 실행해, 기존 `window` 이름·형과 등록 이벤트 목록이 같다. 사용자 승인에 따라 분리본에는 `LobbySubjectHud` 하나만 추가로 허용한다.
   - 같은 가짜 환경에서 대표 시나리오(민수·민서 각각 `getSubjectCapState`/과목 상태 렌더 결과, `openDailyCapModal`→추천 과목, `switchLobbyUser` 후 상태 반영)를 원본과 분리본에 똑같이 돌려 결과(DOM 변경 기록·반환값)가 같다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 7. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트)에서 분리 전(main)·후(브랜치) `lobby.html`을 민수·민서·관리자로 열어 화면 HTML·계산된 스타일·콘솔 오류를 비교하고, 과목 카드 누르기(한도 모달·추천), 놀이터 모달, 아이 전환을 눌러 본다.

## 8. 문서
- `CORE_CATALOG.md`의 `lobby_controller.js` 설명에 세 파일 구성과 `LobbySubjectHud` 공장 함수를 등록한다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수와 바뀐 줄 목록을 적는다.

## 9. 구현 기록 (2026-10-31)

- 사용자가 설계를 승인한 뒤 지정한 경계대로 분리했다. 원본 1–106줄은 설정 파일로, 332–596줄과 846–1021줄은 과목·HUD 파일로 이동했다. 컨트롤러는 원본 107–331줄·597–845줄·1022–1102줄을 유지하고 상태 선언 뒤 연결 코드 11줄만 추가했다.
- 원본 fixture는 분리 직전 파일의 바이트를 그대로 복사했다. `git show HEAD:kids/js/lobby_controller.js`와 줄바꿈만 맞춰 비교해 일치함을 확인했다. 사용자 지시에 따라 fixture는 계약 검사 줄 수 대상에서 제외하며 검사기는 수정하지 않았다.
- 실제 줄 수는 마지막 개행을 별도 빈 줄로 세지 않는 물리적 줄 수이다. 세 운영 JS는 시험의 `split(/\r?\n/).length` 방식으로도 각각 107·460·567줄로 600줄 이하이다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/js/lobby_config.js` | 106 |
| `kids/js/lobby_subject_hud.js` | 459 |
| `kids/js/lobby_controller.js` | 566 |
| `lobby.html` | 799 |
| `tests/lobby-split.test.mjs` | 481 |
| `tests/fixtures/lobby-split/lobby_controller.js` | 1102 |

- 새 전역은 `window.LobbySubjectHud` 하나이다. `create(ctx)`는 컨트롤러 초기화 전에 한 번 호출하고, 반환한 함수 6개를 기존 이름의 지역 변수로 받는다. `lobbyCores`·기존 핸들러·DOM·초기화 호출 순서는 유지했다.
- `activeUserKey`와 `isAdminSession`은 접근 함수를 호출하는 줄에서 최신 값을 읽는다. `runtimeDailyEarned`·`getRealChildName`·`getTodayKstString`은 `ctx`에서 같은 참조를 지역 이름으로 받는다. 공유 상위 객체는 유지하고 학생별 하위 객체 교체도 기존 코드대로 수행한다. 비동기 응답의 기존 처리 방식은 바꾸지 않았다.
- 함수 본문의 변경은 아래 5줄이 전부이다. 줄 번호는 고정 fixture 기준이며, 나머지 이동 본문·주석·들여쓰기는 보존했다. 공장 껍데기와 컨트롤러 연결 코드도 승인안과 정확히 같은지 시험한다.

```diff
@@ 원본 367줄
-    const uKey = userKey || activeUserKey;
+    const uKey = userKey || ctx.getActiveUserKey();
@@ 원본 383줄
-    const uKey = userKey || activeUserKey;
+    const uKey = userKey || ctx.getActiveUserKey();
@@ 원본 577줄
-    const uKey = userKey || activeUserKey;
+    const uKey = userKey || ctx.getActiveUserKey();
@@ 원본 918줄
-      minsuTitleLevel.textContent = isAdminSession
+      minsuTitleLevel.textContent = ctx.getIsAdminSession()
@@ 원본 928줄
-    if (isAdminSession) {
+    if (ctx.getIsAdminSession()) {
```

- `lobby.html`은 config → subject_hud → controller 순서로 세 클래식 스크립트를 `?v=20261031-lobby-split`로 한 번씩 로드한다. 태그 변경 외 마크업은 수정하지 않았다. 카탈로그의 세 파일 구성과 공장 함수 API를 승인한 원문대로 등록했다.
- 신규 시험은 원문 구간·5줄 치환·껍데기·연결 코드, 상대 경로·버전·순서·중복, 부분 로드 무부작용, 전역 이름·형·이벤트·DOM·저장소·코어 로더의 원본 일치를 확인한다. 민수·민서 한도 경계·override·하루 체크인·추천·모달 이동, 학생/관리자 전환, 캐시·날짜·공유 객체 갱신, 지연/역순 응답, 실패/빈 응답, 코어 콜백·HUD·놀이터도 비교한다. 비공개 함수 관찰 코드는 VM 문자열에만 삽입하며 디스크 fixture·운영 코드에는 추가하지 않는다. 네트워크는 모의 fetch만 사용한다.
- `node --test --test-reporter=tap tests/lobby-split.test.mjs`: 21건 통과, 실패 0건.
- `node --test --test-reporter=tap "tests/**/*.test.mjs"`: 270건 중 통과 266·실패 2·건너뜀 1·기존 TODO 1. 실패는 기존 `gallery-character-runner.test.mjs`와 `gallery-multi-character.test.mjs`의 Python 빌더 하위 프로세스 종료 상태가 `null`인 두 건이다. 앞선 보상·대시보드 분리에서도 보고된 환경 문제이며 이번에 해당 시험·빌더는 수정하지 않았다.
- `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/lobby-split/kids/js/lobby_controller.js`: `python` 명령을 찾지 못해 계약 검사 실행 불가. §0에 따라 재시도·우회 실행하지 않았고 나머지 변경 파일의 계약 검사도 미실행이다.
- `git diff --check` 통과. 필수 검사 미완료로 커밋 못 함. 화면 비교는 §7대로 Claude가 수행할 미완료 항목이다. 운영 노션 쓰기·노션 기록·main 병합·푸시는 하지 않았다.
- 사용자 승인한 설계와 다른 구현은 없다. 일반 규칙과 달리 전역 이름 비교에서 `LobbySubjectHud` 하나를 허용하는 점과 fixture 줄 수 검사 제외는 명시적으로 승인받았다.

### Claude 확인 (2026-10-31)

- `main:kids/js/lobby_controller.js`에서 승인한 설계대로(원본 구간 + 5줄 치환 + 공장 껍데기 + 연결 코드 11줄) 세 파일을 다시 만들어 비교했더니, 세 파일 모두 줄바꿈 형식만 빼고 정확히 같다.
- `node --test "tests/**/*.test.mjs"`: 270개 중 통과 268개, 실패 0개(건너뜀 1·todo 1). Codex 환경의 갤러리 빌더 실패 2개는 Python이 막혀서였고 이 PC에서는 통과. 바뀐 파일 8개 계약 검사 모두 `[ALL PASS]`(`lobby_controller.js` 566줄로 허용 목록 없이 통과).
- 노션 쓰기 차단 서버(새 포트 8779·8780)로 `lobby.html` 분리 전후 비교: 민수·민서·관리자(아빠) 각각 화면 글자, 요소 627~628개의 class 목록(과목 한도·부스트 상태), 애니메이션 중인 요소 15개를 뺀 계산된 스타일, 한도 모달(추천 과목)·놀이터 모달 글자가 같다. 관리자 HUD 제목 「관리자 시뮬레이터 [LVL-99]」 동일. 관리자 화면에서 민수→민서→민수 전환 후 세 상태도 모두 같다. 콘솔 오류·쓰기 요청 0건.
