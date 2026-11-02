# 🎯 가족 보드게임: 윷놀이 화면 명세서 (한 기기·가족 방)

> **문서 버전**: v1.1 (2026-11-03)
> **상태**: 한 기기 구현 완료. 가족 방 연결 구현, 시험·화면 검증은 검토자 인계(미실행).
> **현재 작업 계약**: 아래 §0~§7은 최초 한 기기 제작 기록이다. 가족 방 연결은 §8을 따른다. 작업 브랜치는 `codex/yut-family-room`이며 구현 담당은 커밋·브랜치 변경·시험 실행을 하지 않는다.
> **근거**: 노션 현황판 카드 「가족 보드게임 추가: 오목·윷놀이 커스텀 맵·장기·바둑」, 엔진 `docs/family_yut_engine_spec.md`, 선례 `docs/family_omok_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. `kids/playground/family/`의 `yut-engine.js`, `family-players.js`, `omok.html`, `omok.css`, `omok-ui.js`와 `tests/family-browser.mjs`, `tests/family-omok.test.mjs`를 읽는다.

---

## 0. 진행 방식 (꼭 지킨다)
- **먼저 계획(파일별 내용·예상 줄 수, 선택 상태를 어떻게 둘지, 이 문서에서 모호하거나 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더 `G:/master-tower/scratch/worktrees/yut-ui-flash`, 브랜치 `antigravity/yut-ui-flash`. 그 폴더 밖을 고치지 않는다. 그 브랜치까지만 푸시하고 **`main`에 병합·푸시하지 않는다.**
- 일회성 스크립트와 `walkthrough.md`, 스크린샷을 커밋하지 않는다. 노션·Worker에 쓰지 않는다.
- 커밋 끝에 `Agent: antigravity (모델명)`을 쓴다.
- **완료 보고 규칙**: 실행한 명령과 출력의 **실제 마지막 10줄**을 원문 그대로 붙인다. 요약 줄이 중간에 있으면 그 줄도 따로 붙인다. 바뀐 파일마다 계약 검사 결과를 붙인다. 커밋 해시, `git diff --stat main...HEAD`, 파일별 줄 수를 붙인다. 하지 않은 일은 "하지 않음"으로 적는다. 실제 브라우저로 확인하지 않았으면 그렇게 적는다.
- 결과는 Claude가 별도 시험과 실제 브라우저로 검증한다. 실패 목록을 돌려받으면 그 항목만 고친다.

---

## 1. A (목표)
거실에서 2~4명이 태블릿·폰 하나를 돌려가며 하는 **윷놀이 화면**을 만든다. 규칙은 `YutEngine`이 전부 맡는다. 여러 기기 연결은 이번 범위가 아니다.

## 2. S (범위·파일)
| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| 신규 `kids/playground/family/yut.html` | 얇은 래퍼 | 150줄 이하 |
| 신규 `kids/playground/family/yut-ui.js` | 화면·입력·소리·이어하기. IIFE, 전역은 `window.YutUI = Object.freeze({ boot })` 하나 | 500줄 이하 |
| 신규 `kids/playground/family/yut.css` | 판·윷놀이 전용 스타일 | 300줄 이하 |
| 신규 `tests/family-yut.test.mjs` | §7 | 800줄 미만 |
| `tests/family-browser.mjs` | `game === 'yut'` 분기만 추가. 야추·오목 동작은 그대로 | |
| `kids/js/lobby_config.js`, `tests/lobby-split.test.mjs` | §6 | |
| `kids/playground/index.html` | §6 | |
| `kids/core/CORE_CATALOG.md`, 이 문서 | 가족 윷놀이 절에 화면 파일·이어하기 키 추가, 이 문서 상태를 "구현 완료"로 | |

- **고치지 않는다**: `yut-engine.js`, `family-players.js`, 야추·오목 파일, `family-room*`. 엔진이나 공용 부품이 문제라고 판단되면 고치지 말고 보고한다.
- 모든 경로는 상대 경로. 외부 프레임워크 없이 바닐라 JS/CSS. 클래식 스크립트. `innerHTML`을 쓰지 않는다(이름은 사용자 입력).
- `yut.html`은 `omok.html`처럼 `../../css/design-system.css`, `yacht.css`, `yut.css`를 로드한다. 스크립트 순서: `../../core/fairy-config.js`, `../../core/fairy-tts.js`, `../../core/fairy-settings-catalog.js`, `../../core/fairy-engine.js`, `../../data/gallery-data.js`, `../../subjects/quest/monster_roster.js`, `family-players.js`, `yut-engine.js`, `yut-ui.js`. `family-room*`은 로드하지 않는다. CSP 메타 태그를 넣지 않는다.
- 문서를 다 읽은 뒤 스크립트 끝에서 `omok-ui.js`처럼 부팅한다(`readyState`가 `loading`이면 `DOMContentLoaded`, 아니면 바로 `boot()`). `boot`는 두 번 불러도 한 번만 동작한다.

**범위 밖**: 여러 기기, 커스텀 맵, 모서리 지름길 선택, 무르기, 컴퓨터 상대, 팀전, 2등 이하 순위, 보상·노션 연결.

## 3. D (화면 계약)
시험이 이 이름들을 쓴다. **id·클래스·문구를 그대로 쓴다.**

### 3-1. id
| 구역 | id |
| :--- | :--- |
| 공통 | `soundToggle`, `saveStatus` |
| 시작 `setupView` | `playerCount`(select, 값 2·3·4, 기본 2), `pieceCount`(select, 값 2·3·4, 기본 4, 둘 다 `<option>`을 `yut.html`에 직접 적는다), `playerSetup`, `setupError`, `startGame` |
| 이어하기 `resumeView` | `resumeSummary`, `resumeGame`, `newGame` |
| 게임 `gameView` | `board`, `finishCell`, `waitingTray`, `turnHeading`, `turnAvatar`, `turnBanner`, `assistLabel`, `playersStatus`, `sticks`, `throwResult`, `throwButton`, `pendingList`, `helpText`, `moveText`, `confirmMove`, `actionMessage` |
| 끝 `endView` (`gameView` 안) | `endTitle`, `winners`, `playAgain`, `backToSetup` |

보이는 구역 하나만 `hidden`이 아니다(`setupView`, `resumeView`, `gameView`). `endView`는 승부가 난 뒤에만 보인다.

### 3-2. 판
- `board` 안에 `button.yut-cell` 29개. 각각 `dataset.pos`가 `'1'`~`'29'`이고, `style.setProperty('--x', x)`, `style.setProperty('--y', y)`로 아래 위치(숫자, 단위 없음)를 넣는다. CSS는 `left: calc(var(--x) * 1%)`, `top: calc(var(--y) * 1%)`처럼 쓴다.
- 판의 선은 `yut.html` 안의 정적 `<svg viewBox="0 0 100 100">`로 그린다(바깥 사각형 + 대각선 2개). 그림 파일을 쓰지 않는다.

| 칸 | x, y | 칸 | x, y | 칸 | x, y |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 100, 80 | 11 | 0, 20 | 21 | 83.3, 16.7 |
| 2 | 100, 60 | 12 | 0, 40 | 22 | 66.7, 33.3 |
| 3 | 100, 40 | 13 | 0, 60 | 23 | 50, 50 |
| 4 | 100, 20 | 14 | 0, 80 | 24 | 33.3, 66.7 |
| 5 | 100, 0 | 15 | 0, 100 | 25 | 16.7, 83.3 |
| 6 | 80, 0 | 16 | 20, 100 | 26 | 16.7, 16.7 |
| 7 | 60, 0 | 17 | 40, 100 | 27 | 33.3, 33.3 |
| 8 | 40, 0 | 18 | 60, 100 | 28 | 66.7, 66.7 |
| 9 | 20, 0 | 19 | 80, 100 | 29 | 83.3, 83.3 |
| 10 | 0, 0 | 20 | 100, 100 | | |

- 칸의 `aria-label`: `{번호}번 칸`으로 시작하고, `20`은 `20번 칸(참먹이)`, `23`은 `23번 칸(방)`. 이어서 `, 빈 칸` 또는 `, {이름} 말 {개수}개`.
- 칸에 말이 있으면 칸 안에 `span.token` 하나: `dataset.owner`는 사람 id, `dataset.count`는 그 칸의 말 수(문자열). 말 그림은 `FamilyPlayers.playerAvatar`로 넣고, 2개 이상이면 개수를 함께 보인다. 사람마다 테두리 색을 다르게 한다(클래스 `token-0`~`token-3`, `players` 순서).
- `finishCell`은 `dataset.pos = '30'`인 버튼(문구 `🏁 완주`). 도착이 완주일 때만 누를 수 있다.
- `waitingTray`: 지금 사람의 대기 말이 있으면 `button.waiting-token` 하나(`dataset.pos = '-1'`, 문구 `대기 말 {개수}개`), 없으면 비운다.
- `playersStatus`: 사람마다 `.player-status` 하나, 지금 사람은 `.current` 추가. 글자에 이름과 `대기 {n} · 판 {n} · 완주 {n}`이 들어간다.
- `assistLabel`: `{도움 단계 이름} · 말 {개수}개`. 도움 단계 이름은 `도우미`/`전술`/`클래식`.
- `turnBanner`: `{이름} 차례!`.

### 3-3. 윷가락과 결과
- `throwButton`(문구 `🎲 윷 던지기`)은 `phase === 'throw'`이고 승부 전일 때만 켠다.
- 누르면 **`YutEngine.rollSticks()`를 인자 없이** 부르고 그 결과를 곧바로 `applyThrow`에 넘긴다. 결과는 클릭 처리 안에서 바로 상태에 반영한다(타이머로 늦추지 않는다). 흔들림은 CSS만 쓰고 `prefers-reduced-motion`이면 생략한다. `yut-ui.js`에서 `Math.random`을 부르지 않는다.
- `sticks` 안에 `.stick` 4개를 `rollSticks`의 `sticks` 순서로 그린다. `true`인 가락에 `flat` 클래스, 첫 가락에 `mark` 클래스(빽도 표시). 첫 던지기 전이나 이어하기 직후에는 비어 있다.
- `throwResult`: `{이름}! {칸}`. 이름은 `빽도`, `도`, `개`, `걸`, `윷`, `모`. 칸은 `뒤로 1칸`, `1칸`, `2칸`, `3칸`, `4칸`, `5칸`. 다음 던지기까지 그대로 둔다.

### 3-4. 쌓인 결과와 이동 고르기
- `pendingList`: `pending` 하나당 `button.throw-chip` 하나(문구는 결과 이름, `dataset.index`는 번호 문자열, 고른 칩은 `aria-pressed="true"`, 나머지는 `"false"`). 비어 있으면 비운다.
- 칩은 `move` 단계이고 그 결과로 움직일 수 있는 말이 있을 때만 켠다. **`throw` 단계에서 남은 결과(잡은 뒤)는 보이되 꺼 둔다.**
- `move` 단계에 들어가거나 이동으로 `pending`이 바뀌면, 고른 칩은 움직일 수 있는 첫 번호로, 고른 말은 없음으로 되돌린다.
- 칩을 누르면 그 번호를 고르고 고른 말을 지운다.
- 칸·`waiting-token`은 `move` 단계에서만 켠다. `throw` 단계와 승부 뒤에는 `disabled`.
- 칸이나 `waiting-token`을 누르면 **아래 순서**로 처리한다.
  1. 고른 말이 있고 누른 칸이 그 말의 도착 칸이면 이동을 확정한다(자기 말이 있는 칸으로 합류할 때도 다시 고르기가 아니라 확정이다).
  2. 고른 칩의 `legalMoves` 항목 중 `from`이 누른 칸인 것이 있으면 그 항목을 고른다.
  3. 없으면 고른 것을 그대로 두고 `moveText`에 `이 말은 지금 움직일 수 없어요.`를 쓴다.
- `confirmMove`(문구 `여기로 옮기기`)는 고른 말이 있을 때만 켜고, 누르면 확정한다. `finishCell`을 눌러도 도착이 완주일 때 확정한다.
- 확정은 고른 항목의 `pieceIds[0]`와 `throwIndex`로 `applyMove`를 부른다.
- `moveText`: `throw` 단계 `윷을 던져요!`, `move` 단계에서 안 골랐으면 `옮길 말을 골라요.`, 골랐으면 `도착 칸을 다시 누르거나 「여기로 옮기기」를 눌러요.`

### 3-5. 알림 (`actionMessage`, 다음 행동까지 유지)
| 때 | 문구에 들어갈 말 |
| :--- | :--- |
| 윷·모 | `한 번 더 던져요!` |
| 판 위 말 없이 빽도뿐이라 넘어감 | `움직일 말이 없어 넘어가요.` |
| 잡음 | `잡았어요! 한 번 더 던져요!` |
| 합류 | `업었어요!` |
| 완주(승부 전) | `완주했어요!` |
| 그 밖 | 비움 |

넘어감은 `applyThrow` 뒤 `pending`이 비었고 `turnPlayer`가 바뀐 경우다. 잡음·합류는 확정한 `legalMoves` 항목의 `captures`, `joins`로 판단한다.

### 3-6. 도움 단계 (지금 차례인 사람의 `assist`로만)
| 단계 | 표시 |
| :--- | :--- |
| `helper` 도우미 | 고르기 전에도 움직일 수 있는 칸·`waiting-token`에 `can-move`. 고른 뒤 도착 칸(또는 `finishCell`)에 `target`, 잡을 수 있으면 그 칸에 `capture`. `helpText`는 고른 항목이 잡을 수 있으면 `잡을 수 있어요!`, 그 밖에는 `빛나는 말을 골라요.` |
| `tactic` 전술 | `can-move` 없음. 고른 뒤 `target`, 잡을 수 있으면 `capture`. `helpText`는 잡을 수 있을 때만 `잡을 수 있어요!`, 그 밖에는 빈 문자열 |
| `classic` 클래식 | 고른 뒤 `target`만. `capture` 없음. `helpText`는 빈 문자열 |

`throw` 단계에는 `can-move`·`target`·`capture`가 없다. `target`이 없으면 잘못 누르기 쉬우므로 세 단계 모두 도착 칸은 보여 준다.

### 3-7. 시작·끝·이어하기
- 설정은 `FamilyPlayers.createSetup({ host: playerSetup, count: 2, min: 2, max: 4, modes })`. `playerCount`를 바꾸면 `setCount(Number(value))`.
- `startGame`: `createGame(setup.getPlayers(), Number(pieceCount.value))`. 예외면 `setupError`에 `e.message`를 쓰고 시작 화면에 머문다.
- 소리는 `omok-ui.js`의 `say` 방식 그대로: `speakFairyTTS(text, finish, { skipPreset: true })`. `window.speechSynthesis` 직접 호출 금지. **시작과 승부 때만** 말한다. 시작 `{첫 사람 이름}부터 던져요!`, 승부 `{이름}, 이겼어요!`, 말이 끝나면 `fairyReward()`. 음소거(`soundToggle`, 오목과 같은 동작)면 말도 보상 소리도 내지 않는다. 화면을 가리거나(`visibilitychange`) 떠날 때(`pagehide`) `stopFairyTTS`.
- 승부: `endView`를 보이고 `turnHeading`, `assistLabel`, `playersStatus`, `helpText`, `moveText`, `throwButton`, `confirmMove`를 숨긴다. 판은 남긴다. `endTitle`은 `🏆 {이름}, 이겼어요!`, `winners`에 이긴 사람 말. `playAgain`은 `rematch` 후 저장·시작 음성, `backToSetup`은 시작 화면으로.
- 저장: `localStorage('familyYutGame')`. 시작과 모든 행동 뒤에 저장하고, 승부가 나면 지운다. 저장이 막히면 게임은 계속하고 `saveStatus`에 `이 기기에 저장하지 못했어요. 창을 닫으면 이어서 할 수 없어요.`를 쓴다(성공하면 비움).
- 열 때 저장값을 읽어 `isValidSaved`가 참이고 승부 전이면 `resumeView`, 그 밖에는 지우고 시작 화면. `resumeSummary`: `{이름들을 ' · '로 연결} · 말 {개수}개`. `resumeGame`은 음성 없이 이어 간다. `newGame`은 저장값을 지우고 시작 화면.
- 포커스: 판이 바뀌면 `omok-ui.js`처럼 `turnBanner`, 승부면 `endTitle`.

## 4. 화면 모양
- 왼쪽 위 `← 놀이터`(`../index.html`), 제목 `🎯 가족 윷놀이`, `soundToggle`. 시작 화면에 `details.rules`로 규칙 요약(업기, 잡으면 한 번 더, 윷·모 한 번 더, 빽도, 참먹이 지나 완주).
- 판은 정사각형. 칸은 원형, 모서리 `5·10·15·20`과 방 `23`은 조금 크게, 참먹이에 `출발·도착` 표시. `.can-move`, `.target`, `.capture`는 색만이 아니라 테두리 모양으로도 구별한다.
- **세로 화면**: 판이 폭에 꽉 차고(좌우 16px 여백) 가로 스크롤 없음. 320px에서 동작한다. 칸끼리 겹치지 않게 칸 지름을 판의 약 11%로 한다. 세로 화면 순서는 판 → 대기 말·완주 → 차례 → 윷가락·결과·던지기 → 칩 → 알림·옮기기 → 도움 단계·사람별 현황이며, 375×812 첫 화면 안에 던지기 버튼이 들어오게 윷가락 영역을 줄인다.
- **가로 화면**(태블릿·TV 미러링): 왼쪽 판, 오른쪽 차례·버튼. 판이 화면 높이를 넘지 않는다. 글자 18px 이상, 차례 배너 32px 이상(좁은 폰은 오목처럼 24px).
- 진 사람을 깎아내리는 문구, 경고음은 쓰지 않는다.

## 5. 이어서 다룰 일 (이번에 하지 않음)
여러 기기 연결(`family_room_spec.md`), 말 이동 애니메이션, 윷 던지는 소리.

## 6. 입구
- `kids/js/lobby_config.js`의 `PLAYGROUND_ITEMS` 민수·민서 목록에서 오목 줄 다음에 아래 한 줄씩 추가:
  `{ icon: '🎯', title: '가족 보드게임 · 윷놀이', desc: '내 캐릭터 말로 윷판을 한 바퀴! 한 기기로 돌아가며 2~4명이 함께해요', href: 'kids/playground/family/yut.html', badge: '가족' }`
- `tests/lobby-split.test.mjs`의 승인 변경(`applyConfigEdits`)에 같은 줄을 `yutItem`으로 등록한다.
- `kids/playground/index.html`의 오목 카드 다음에 같은 모양의 카드: `<a href="family/yut.html" class="pg-card">`, 배지 `2~4명 함께 🎯`, 아이콘 `🎯`, 제목 `가족 보드게임 · 윷놀이`, 설명 `내가 고른 캐릭터로 윷판을 한 바퀴 돌아요. 한 기기로 돌아가며 업고 잡아요.`, 버튼 `함께 던지기 🎯`.

## 7. T (시험)
1. 신규 `tests/family-yut.test.mjs`(모의 브라우저 `tests/family-browser.mjs`). `Math.random`을 정해진 값으로 바꿔 던지기 결과를 고정한다. **아래 항목을 각각 시험한다.**
   - 시작: 인원 변경, 말 개수, 잘못된 이름의 `setupError`, 칸 29개와 위치, 시작 음성.
   - 던지기: 가락 클래스, `throwResult`, 윷·모면 계속 던지기, 던진 뒤 버튼 상태.
   - 이동: 대기 말 내보내기, 칸 눌러 확정과 `confirmMove`로 확정, 쌓인 결과 고르기, 쓴 뒤 고른 칩 되돌림.
   - 쓸 수 없는 칩: `['yut','backdo']`에서 판 위 말이 없으면 빽도 칩이 꺼지고, 윷으로 올린 뒤 켜진다.
   - 빽도뿐일 때 넘어감과 알림.
   - 잡기: 알림, 차례 유지, 남은 결과 칩이 꺼진 채 보임, 칸이 꺼짐, 새로 던지면 함께 쓸 수 있음.
   - 합류: 알림, `token`의 `count`, 합류 칸을 누르면 확정, 묶음 함께 이동.
   - 움직일 수 없는 칸을 누를 때 문구와 고른 것 유지.
   - 도움 단계 세 가지의 클래스와 `helpText`, 차례가 바뀌면 그 사람 단계로 바뀜.
   - 완주: `finishCell`, 완주 수 표시. 승부: 끝 화면, 음성 뒤 보상, 저장 삭제, 다시 하기 순서 회전, 처음으로.
   - 음소거. 이어하기(정상·조작된 값·끝난 판·새 게임). 저장 차단.
   - 리소스: 스크립트 순서, 상대 경로, 파일 줄 수 한도, `innerHTML`·`speechSynthesis`·`Math.random` 없음, 로비 2곳과 놀이터 카드.
   - 2·3·4인 무작위 한 판을 **클릭으로** 끝까지: 매 단계 저장값이 `isValidSaved`를 통과.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`. `fail 0`과 종료 코드를 보고한다(`todo`의 실패 출력은 기존 항목이다).
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]`.
4. **실제 브라우저 확인은 Claude가 한다**(쓰기 차단 서버, 320·375·768px, 가로 화면, 말 그림, 실제 한 판). 하지 못했으면 "하지 않음"으로 적으면 된다.

## 8. 가족 방 연결 (2026-11-03)

- 야추·오목과 같은 `FamilyRoomUI.mount`를 사용한다. `gameType:'yut'`, `maxSeats:4`, `title:'가족 윷놀이'`, `createGame`, `hostOptions`, `validate`와 기존 콜백으로 연결한다. 공용 방 코드·Worker·규칙 엔진·기존 CSS는 수정하지 않는다. `yut-ui.js` 한도는 오목과 같은 600줄로 바꾼다.
- `yut.html`에 `singleDevice`·`multipleDevices`·`resumeMultipleDevices`, `roomStatus`·`roomView`·`roomActions`를 추가한다. 한 기기의 기존 요소·문구·배치는 유지한다. `family-room.css`를 추가하고 `family-players` → `yut-engine` → `family-room` → `family-room-ui` → `yut-ui` 순서로 로드한다.
- 방장은 대기실 `hostOptions`에서 말 개수 2·3·4개(기본 4)를 고른다. 시작은 확정 자리로 `YutEngine.createGame(seats,roomPieceCount)`를 호출한다. 참가 인원은 2~4명이며 한 기기에 여러 자리와 구경 기기를 허용한다.
- 던지기는 자기 차례 기기에서만 `rollSticks()`를 한 번 호출하고 `applyThrow`로 다음 상태를 만든다. 방의 상태에는 엔진 상태와 함께 최상위 `lastSticks:null|boolean[4]`를 보낸다. 시작·다시 하기는 null, 이동은 직전 가락 배열을 유지한다. 결과뿐 아니라 가락 순서·빽도 표시도 모든 화면과 재접속에서 같다.
- 받는 쪽은 가락으로 다시 추첨하지 않는다. `lastSticks`를 뺀 상태를 엔진 `isValidSaved`로 수순 재생하고, 가장 최근 THROW의 결과와 가락 배열이 일치하는지 `rollSticks`에 결정적인 RNG를 주입해 검사한다. 판의 참가자 ID 집합은 자리 ID 집합과 같아야 하며 갤러리 말도 공용 허용 범위로 검사한다. 다시 하기는 참가자 순서를 회전하므로 자리 순서와 달라도 된다.
- `YutUI`는 기존 `boot`와 순수 API `validSnapshot`·`inputFor`·`effectsFor`를 제공한다. 입력·전송 잠금·차례 권한은 클릭 처리에서도 확인한다. 방에서는 확정 스냅샷 전까지 판·결과·로컬 저장을 바꾸지 않는다. 선택한 칩·말·도착 미리보기는 전송하지 않고, 판 변경·소유권 상실·전송 잠금 때 정리한다. 같은 판의 접속 알림에는 선택과 포커스를 보존한다.
- 다른 기기의 차례와 구경 화면은 던지기·칩·말·완주·확정을 비활성화하고 개인 도움을 숨긴다. 대기 배너를 표시한다. 확정 스냅샷의 마지막 행동으로 잡기·업기·완주·추가 던지기 안내를 복원한다.
- 차례 음성은 차례가 넘어온 기기만, 시작·다시 하기 안내는 첫 자리의 기기만, 승부 음성은 방장만 낸다. 보상 효과음은 자리가 있는 기기만 한 번 낸다. 첫 입장·재접속·같은 판 재수신에서는 지난 음성·보상을 재생하지 않는다. 한 기기는 전처럼 시작·승부 때만 말한다.
- 다시 하기는 `rematch`를 적용한 상태를 현재 방 rev의 `act`로 보낸다. 구경 기기는 누를 수 없다. 방장은 대기실로, 나머지는 방 나가기로 이동한다. 연결 단절·4409·이탈 자리 넘겨받기·되찾기·방장 승계는 공용 방 동작을 그대로 쓴다.
- `familyYutGame`은 방에서 쓰거나 지우지 않는다. 공용 `familyRoomClientId`·`familyRoomSession`만 사용한다. 30초 단절·만료 뒤 명시적 한 기기 전환에서는 마지막 확정 상태의 `lastSticks`만 제거해 기존 로컬 저장 계약으로 넘긴다. 한 기기 이어하기와 같이 가락 표시·미리보기는 비운다.
- 시험: 기존 `tests/family-yut.test.mjs`는 방 로드 순서와 600줄 한도로 계약을 갱신한다. 공용 `tests/family-browser.mjs`는 윷놀이에서도 방 모듈을 로드한다. 신규 `tests/family-yut-room.test.mjs`는 가락·결과 왕복, 응답 전 불변, 입력 권한, 거절, 복구, 자리 넘겨받기, 다시 하기, 소리, 로컬 저장 분리, 조작 거부와 3·4인을 다룬다. 규칙 엔진 시험·로비 해시는 수정하지 않는다.
- 검토자 실행: `node --test tests/yut-engine.test.mjs tests/family-yut.test.mjs tests/family-yut-room.test.mjs tests/family-room.test.mjs tests/family-room-ui.test.mjs tests/family-yacht.test.mjs tests/family-omok.test.mjs`, 이후 `node --test "tests/**/*.test.mjs"`. 계약 검사는 이 PC의 상위 폴더에 있는 도구로, 저장소 루트에서 `python -X utf8 ../scripts/verify_contracts.py --mode git-diff --repo kids-school-main`을 실행한다. 도구 파일은 수정하지 않는다.
- 구현 담당은 시험·Python·실제 네트워크·브라우저를 실행하지 않았다. 검토자는 쓰기 차단 서버에서 320·375·768px와 가로 화면, 서로 다른 출처의 두 기기로 한 판·폰 잠금 복귀·동시 입력·대신 하기·다시 하기·가락 모양 일치를 확인한다. 실제 소리·갤러리 CDN도 별도 확인한다. 커밋·배포·노션 기록은 하지 않았다.
