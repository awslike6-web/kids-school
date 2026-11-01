# ⚫ 가족 보드게임: 오목 (한 기기에서 마주 앉아 두기) 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01, Claude 검증 완료). 여러 기기 연결은 2026-11-02 추가, 그 모드에 한해 판을 서버로 보낸다(`docs/family_room_spec.md` §11·§15). 이 문서의 한 기기 규칙은 그대로다.
> **근거**: 노션 현황판 카드 「가족 보드게임 추가: 오목·윷놀이 커스텀 맵·장기·바둑」, 앞선 작업 `docs/family_yacht_spec.md`. 2026-11-01 가족 반응: 아이들이 야추를 재미있게 하지만 폰 한 대를 돌려 쓰는 것이 병목이다. 오목은 2인이고 판을 사이에 두고 함께 보므로 이 병목이 작다. 여러 기기 연결은 이번 범위가 아니다.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 야추 네 파일(`kids/playground/family/yacht*`)과 `tests/yacht-engine.test.mjs`를 읽는다.

---

## 0. 진행 방식
- **먼저 계획(파일별 내용·예상 줄 수, 야추에서 공용으로 뺄 함수 목록, 엔진 API, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/family-omok`, 브랜치 `codex/family-omok`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 게임 기록을 노션·Worker·서버에 저장하거나 보내지 않는다. 보석·사탕·경험치와 연결하지 않는다. 갤러리 CDN 그림과 공통 TTS의 평소 호출은 허용한다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
거실에서 두 사람이 태블릿·폰 하나를 사이에 두고 두는 **오목**. 아이 그림 캐릭터를 말로 쓰고, 나이에 따라 도움을 다르게 준다. 로비 🎡 놀이터 메뉴에서 바로 들어갈 수 있어야 한다.

## 2. 규칙
- 판은 **9·13·15줄** 중에서 고른다. 기본 13줄.
- 흑이 먼저 둔다. 번갈아 빈 교차점에 돌을 하나 둔다.
- 가로·세로·대각선으로 **다섯 개 이상** 이으면 이긴다(여섯 개 이상도 승리, 금수 없음).
- 판이 가득 차면 무승부.
- **무르기**: 사람마다 한 판에 2번, 자기가 막 둔 수만(상대가 두기 전에) 물릴 수 있다. 승부가 난 뒤에는 불가.
- 다시 하기를 누르면 같은 두 사람이 흑·백을 바꿔서 새 판을 시작한다.

## 3. S (범위·파일)
| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| 신규 `kids/playground/family/omok-engine.js` | 순수 규칙 엔진. DOM·저장소 접근 없음. 전역 `OmokEngine` 하나(IIFE) | 300줄 이하 |
| 신규 `kids/playground/family/omok-ui.js` | 화면·입력·소리·이어하기. 전역 `OmokUI` 하나(IIFE) | 600줄 이하 |
| 신규 `kids/playground/family/omok.html` | 얇은 래퍼 | 150줄 이하 |
| 신규 `kids/playground/family/omok.css` | 판·오목 전용 스타일 | 400줄 이하 |
| 신규 `kids/playground/family/family-players.js` | 야추·오목 공용 말 고르기(아래) | 300줄 이하 |
| `kids/playground/family/yacht-ui.js`, `yacht.html` | 공용 파일을 쓰도록 변경. 동작·문구·모습은 그대로 | |
| `kids/playground/index.html` | 「⚫ 가족 보드게임 · 오목」 카드 1개 (`family/omok.html`, 기존 `pg-card` 모양) | 추가 15줄 이내 |
| `kids/js/lobby_config.js` | `PLAYGROUND_ITEMS`의 민수·민서 목록 끝에 오목 카드를 하나씩 추가(`href: 'kids/playground/family/omok.html'`, icon `⚫`, badge `가족`). `tests/lobby-split.test.mjs`의 승인 변경(`applyConfigEdits`)에 함께 등록한다 | |
| 신규 `tests/omok-engine.test.mjs`, `tests/family-players.test.mjs` | §7 | |
| `kids/core/CORE_CATALOG.md`, 이 문서 | §8 | |

- 모든 경로는 상대 경로. 외부 프레임워크 없이 바닐라 JS/CSS. 클래식 스크립트.
- **복붙 금지(GEMINI §8-1)**: `yacht-ui.js`의 `avatarKey`·`collectAvatars`·`showAvatar`·그림 실패 기록·`fallbackFor`와 시작 화면의 이름·말·도움 단계 고르기를 `family-players.js`(전역 `FamilyPlayers` 하나, IIFE)로 옮겨 두 게임이 함께 쓴다. 인원 수·도움 단계 이름은 인자로 받는다. 시작 화면 스타일도 복사하지 말고 재사용 방법(공용 CSS로 분리 또는 `yacht.css` 함께 로드)을 계획에서 제안한다. 야추의 말 저장 형식과 이어하기 키는 바꾸지 않는다.
- 소리는 공통 엔진만: `fairy-config.js`·`fairy-tts.js`·`fairy-settings-catalog.js`·`fairy-engine.js`를 야추와 같은 순서로 로드하고 `speakFairyTTS(text, {skipPreset:true})`, `fairyReward()`를 쓴다. `window.speechSynthesis` 직접 호출 금지. 수마다 말하면 시끄러우므로 **게임 시작과 승부가 날 때만** 말한다. 안내 음성 버튼은 야추와 같게 둔다.

## 4. D (데이터)

### 4-1. 게임 상태 (나중에 서버 중계에서 그대로 쓸 모양)
```json
{ "v": 1, "gameType": "omok", "stateVersion": 0, "turnPlayer": 0,
  "players": [ { "id": "p1", "name": "민서", "avatar": { "type": "emoji", "value": "🐰" }, "assist": "helper", "stone": "black" } ],
  "publicBoard": { "size": 13, "moves": [ { "x": 6, "y": 6, "by": "p1" } ], "undoLeft": { "p1": 2, "p2": 2 } },
  "result": null,
  "lastAction": { "type": "PLACE", "by": "p1", "x": 6, "y": 6 } }
```
- `result`: `null`, `{ "type": "win", "winner": "p1", "line": [[x,y], …] }`, `{ "type": "draw" }`.
- 돌 배치는 `moves`가 원본이다. 상태를 바꾸는 함수는 새 상태를 돌려주고 `stateVersion`을 1 올린다(원본 불변). 무효 행동은 같은 상태를 돌려준다. 초기 `lastAction`은 `null`.

### 4-2. 엔진 API (`OmokEngine`)
| 이름 | 설명 |
| :--- | :--- |
| `SIZES` | `[9, 13, 15]` |
| `createGame(players, size)` | 정확히 2명, 이름 1~8자, 첫 번째 사람이 흑. 잘못되면 예외 |
| `boardOf(state)` | `size×size` 2차원 배열(`null`/`'black'`/`'white'`) |
| `place(state, x, y)` | 빈 칸·범위 안·승부 전에만. 승리·무승부 판정, 차례 넘김 |
| `undo(state)` | 마지막 수를 둔 사람이 `undoLeft`가 남아 있고 승부 전일 때만 |
| `hints(state, mode)` | §5-2 |
| `rematch(state)` | 같은 사람·같은 판 크기, 흑·백 교대, 새 판 |
| `isValidSaved(state)` | 이어하기 검사. `moves`를 처음부터 다시 두어 판·차례·결과가 맞는지 확인 |

### 4-3. 이어하기
진행 중인 게임을 `localStorage('familyOmokGame')`에 저장한다. 다시 열면 「이어서 하기 / 새 게임」. 읽기 실패·형식 오류는 새 게임으로, 끝난 게임은 지운다. 저장소 접근이 막혀도 게임은 계속된다.

## 5. 화면

### 5-1. 시작
두 사람의 이름(빠른 선택: 민수·민서·아빠·엄마·이모 + 직접 입력), 말, 도움 단계, 판 크기(9·13·15줄). 1번 사람이 흑으로 먼저 둔다는 안내를 보여 준다. 도움 단계 기본값은 야추와 같다(민서 → 도우미, 민수 → 전술, 그 밖 → 클래식).

### 5-2. 도움 단계 (그 사람 차례에만)
| 단계 | 화면 |
| :--- | :--- |
| `helper` 도우미 (초1) | `win`(두면 바로 이기는 칸)과 `block`(상대가 다음에 이기는 칸)을 판에 표시하고, 한 줄 설명을 보여 준다. 예: 「여기를 막아요!」 |
| `tactic` 전술 (초5) | `block`만 표시 |
| `classic` 클래식 (어른) | 표시 없음 |

`hints` 반환: `{ win: [[x,y]…], block: [[x,y]…] }`, 클래식·승부 뒤는 `{}`. 경고음 없음(에러리스).

### 5-3. 게임 화면
- 위: 차례 배너 「⚫ 민서 차례!」 + 말 그림, 양쪽 사람의 돌 색·무르기 남은 횟수.
- 판: 교차점마다 `<button>`(또는 같은 수준의 접근성), `aria-label`은 「가로 7 세로 7, 빈 칸」 형식. 줄 격자와 돌은 CSS로 그리고, 그림 파일을 쓰지 않는다. 마지막 수에 표시를 한다.
- **잘못 누르기 방지(2단계 두기)**: 빈 칸을 처음 누르면 반투명 돌로 미리 보여 주고, 같은 칸을 다시 누르거나 「여기에 두기」 버튼을 누르면 둔다. 다른 칸을 누르면 미리보기가 옮겨 간다.
- 승부가 나면 이긴 다섯 줄을 강조하고 축하 화면(이긴 사람 말 크게), `fairyReward()`, 「이겼어요!」 음성, [다시 하기](흑·백 교대) / [처음으로]. 무승부 문구도 둔다. 진 사람을 깎아내리는 문구는 쓰지 않는다.
- **세로 화면(폰)**: 판이 화면 폭에 꽉 차고(좌우 16px 여백) 가로 스크롤이 없다. 320px에서 15줄까지 동작한다.
- **가로 화면(태블릿·TV 미러링)**: 왼쪽 판, 오른쪽 차례·버튼. 판이 화면 높이를 넘지 않는다. 글자는 18px 이상, 차례 배너 32px 이상.
- 야추처럼 왼쪽 위 「← 놀이터」(`../index.html`).

## 6. 범위 밖
컴퓨터 상대, 렌주 금수(3·3 등), 여러 기기 연결(현황판 「가족 보드게임 2단계」), 윷놀이·장기·바둑, 노션·보상 연결.

## 7. T (시험)
1. 신규 `tests/omok-engine.test.mjs`(`node:vm`, DOM·저장소 접근은 실패 처리):
   - 가로·세로·양 대각선 다섯 줄 승리와 `line`, 판 가장자리 다섯 줄, 넷은 승리 아님, 여섯 이상도 승리.
   - 흑·백 번갈아 두기, 둔 칸·범위 밖·승부 뒤 무효(같은 상태 반환), 원본 불변, `stateVersion` 증가.
   - 무르기: 자기 마지막 수만, 사람당 2번, 상대가 둔 뒤·승부 뒤 불가, 차례 복원.
   - 9줄 판을 끝까지 채운 무승부.
   - `hints`: helper의 `win`·`block`, tactic은 `block`만, classic·승부 뒤는 `{}`.
   - `rematch`: 흑·백 교대, 새 판.
   - `isValidSaved`: 정상 통과, 겹친 수·잘못된 차례·조작된 결과·잘못된 크기 거부.
2. 신규 `tests/family-players.test.mjs`: `avatarKey`, 갤러리 데이터에서 말 목록 만들기(중복 제거), 그림 실패 때 이모지 대체. 전역은 `FamilyPlayers` 하나.
3. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`(`yacht-engine`, `lobby-split` 포함).
4. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 8. 화면 확인·문서
- **화면 확인은 Claude가 한다**: 쓰기 차단 서버에서 로비 → 놀이터 → 오목 진입, 실제 클릭으로 한 판 승부, 무르기, 이어하기, 320·375·768px와 가로 화면, 야추 시작 화면이 전후로 같은지.
- `CORE_CATALOG.md`의 가족 보드게임 절에 오목(파일·API·상태 모양·이어하기 키)과 `family-players.js`를 적는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 실제 줄 수를 적는다.

## 9. 구현 계약·검증 인계 (2026-11-01)
- 승인 범위대로 오목과 참가자 공용화를 구현했습니다. 게임별 UI/엔진은 독립이며 `yacht.css`를 시작 화면·말 선택 스타일에 재사용합니다. 야추의 문구·말 저장 형식·이어하기 키는 유지합니다.
- 엔진은 API §4-2를 유지합니다. `place`는 승부 수를 포함해 차례를 넘기고, `undo`는 `lastAction.type === 'PLACE'`인 직전 착수자만 복원합니다. UNDO 뒤 상대의 이전 돌을 연속으로 지울 수 없습니다. UI는 사람별 버튼에서 착수자 일치를 검사합니다.
- `rematch`는 참가자 순서를 뒤집어 흑백을 바꾸고 `stateVersion + 1`, `lastAction:{type:'REMATCH'}`를 남깁니다. 새 판 수순·결과·무르기 횟수는 초기화합니다.
- `isValidSaved`는 수순 재생·차례·승리선·결과, 참가자·크기·버전 하한·무르기 0~2회·마지막 PLACE/UNDO/REMATCH를 검사합니다. 삭제한 수의 전체 이력은 저장하지 않으므로 과거 무르기 전체나 재대결 누적 버전을 인증하는 기능은 아닙니다.
- `FamilyPlayers` 공개 API는 `avatarKey`, `collectAvatars`, `showAvatar`, `fallbackFor`, `playerAvatar`, `defaultMode`, `createSetup({host,count,min,max,modes})`; 설정 인스턴스는 `setCount`, `render`, `getPlayers`를 제공합니다. 갤러리 말 키는 작품+캐릭터, 실패/2.5초 지연은 서로 다른 이모지로 표시하며 이전 그림 타이머는 새 표시를 덮어쓰지 않습니다.
- 오목은 미리보기 후 같은 칸 재클릭/확인 버튼으로만 확정하고, 도움은 현재 차례에만 표시합니다. 종료 후에도 판의 승리선을 유지합니다. 음성은 시작·승부 때만, 음소거는 이 화면 세션에만 적용합니다.
- 실행: `node --test tests/omok-engine.test.mjs tests/family-players.test.mjs tests/yacht-engine.test.mjs tests/lobby-split.test.mjs` → 61개 통과. 모의 DOM 클릭으로 두기·무르기·승부·저장 삭제·이어하기·저장 차단·음소거·도움 차례·야추 2~5명 설정/첫 굴림을 확인했습니다. 3가지 크기 × 160단계의 결정적 혼합 행동에서 저장 JSON 왕복 검증도 통과했습니다.
- 전체 회귀: `node --test "tests/**/*.test.mjs"` 최종 466개 중 462개 통과·2개 실패·skip 1개·기존 todo 1개(종료 코드 1)입니다. Python 빌더 하위 프로세스가 시작되지 않은 갤러리 시험 2건은 오목 변경으로 통과 처리하거나 건너뛰지 않았습니다.
- 실제 브라우저의 320·375·768px/가로 배치·로비 진입·야추 시작 화면 전후 비교, 실제 CDN/TTS와 물리 기기 검수는 Claude 확인 대기입니다. 모의 DOM 시험을 실제 화면 검수로 보지 않습니다.

### 실제 줄 수 (최종 공백 제외, fixture 제외)
- `kids/playground/family/omok-engine.js`: 143줄
- `kids/playground/family/omok-ui.js`: 198줄
- `kids/playground/family/omok.html`: 74줄
- `kids/playground/family/omok.css`: 61줄
- `kids/playground/family/family-players.js`: 159줄
- `kids/playground/family/yacht-ui.js`: 281줄
- `kids/playground/family/yacht.html`: 82줄
- `kids/playground/index.html`: 197줄
- `kids/js/lobby_config.js`: 110줄
- `tests/omok-engine.test.mjs`: 196줄
- `tests/family-players.test.mjs`: 172줄
- `tests/yacht-engine.test.mjs`: 212줄
- `tests/lobby-split.test.mjs`: 493줄
- `kids/core/CORE_CATALOG.md`: 1313줄
- `docs/family_yacht_spec.md`: 145줄
- `docs/family_omok_spec.md`: 149줄

## Claude 검증·수정 (2026-11-01)
- Codex 환경의 전체 시험 실패 2건은 그 샌드박스에서 Python이 실행되지 않아 생긴 것이다. Claude가 돌린 `node --test "tests/**/*.test.mjs"`는 466개 중 464 통과·실패 0·기존 TODO 1이다. 바뀐 파일 모두 계약 검사 `[ALL PASS]`.
- 쓰기 차단 서버에서 확인: 로비 놀이터 카드로 진입, 빈 칸 첫 터치는 미리보기·두 번째 터치에 착수, 무르기 횟수 차감과 상대 버튼 비활성, 도우미 `win`·전술 `block` 표시와 안내문, 새로고침 뒤 이어하기, 다섯 줄 강조·승리 화면, 다시 하기 흑백 교대, 15줄 320px(칸 19px, 가로 넘침 없음), 1024×768 가로 배치(판이 화면 높이 안), 콘솔 오류 없음. 판 칸 입력은 스크립트 클릭으로 시험했고, 실기기 터치와 TTS 재생은 확인하지 않았다.
- 야추 회귀: main과 이 브랜치의 시작 화면(2인·3인)과 게임 화면이 요소별 계산 스타일·글자까지 같다.
- Claude가 고친 점: 승부 뒤 차례·무르기·두기 칸을 숨기고 진 사람 말을 배너에 남기지 않음(`omok-ui.js`, `omok.html`의 `turnHeading`), 도움 표시를 칸 84% 크기로 키움, 좁은 폰에서 차례 글자 24px·줄바꿈 방지와 무르기 버튼 글자 줄바꿈 방지(`omok.css`).
