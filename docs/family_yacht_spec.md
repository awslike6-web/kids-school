# 🎲 가족 보드게임 1단계: 야추 다이스 (한 기기 돌려가며 하기) 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현 완료. Claude가 2026-10-31 실제 네트워크에서 갤러리 캐릭터 그림 5개 표시·가로 배치·도우미 미리보기를 확인함. TTS 재생·실기기·TV 미러링은 미확인
> **배경**: 가족 보드게임 라운지 기획(서버 중계·TV/폰 듀얼 뷰)은 크다. 먼저 **서버 없이 태블릿 한 대를 돌려가며** 하는 야추로 가족이 실제로 자주 하는지 확인한다. 거실 TV는 화면 미러링으로 본다.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(바꿀 파일·예상 줄 수·이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/family-yacht`, 브랜치 `codex/family-yacht`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 게임 기록을 노션·Worker·서버에 저장하거나 보내지 않는다. 갤러리 CDN 그림과 공통 TTS의 평소 호출은 허용한다(2026-10-31 Claude 정정: 처음 문장 "네트워크를 쓰지 않는다"가 모호했음). CSP 메타 태그를 추가하지 않는다.
- 커밋 끝에 `Agent: codex (모델명)`. `walkthrough.md`·스크린샷은 커밋하지 않는다.
- **완료 보고 규칙**: 시험·계약 검사는 실행한 명령과 출력 마지막 10줄을 원문 그대로 붙인다. 화면 문구는 코드에서 그대로 복사한다. 커밋 해시와 `git diff --stat main...HEAD`를 붙인다.

---

## 1. A (목표)
거실에서 가족 2~5명이 태블릿 하나를 돌려가며 하는 **야추(Yacht, 전통 주사위 게임)**. 아이 그림 캐릭터를 말(아바타)로 쓰고, 나이에 따라 도움을 다르게 준다.

- 보석·사탕·경험치·노션과 연결하지 않는다.
- 특정 상품 게임의 이름·그림·디자인을 쓰지 않는다. 이름은 「야추 다이스」.

## 2. 규칙 (12칸, 12라운드)
- 차례마다 주사위 5개를 최대 3번 굴린다. 굴린 뒤 원하는 주사위를 눌러 **고정**할 수 있다. 첫 굴림 전에는 고정할 수 없다.
- 차례마다 빈 칸 하나에 점수를 **반드시** 적는다(0점도 가능). 12라운드 뒤 끝난다.

| 칸 | 점수 |
| :--- | :--- |
| 1~6 (에이스~식스) | 그 눈의 합 |
| 보너스 | 1~6 합이 63 이상이면 +35 (자동, 칸 아님) |
| 초이스 | 다섯 눈의 합 |
| 포카드 | 같은 눈 4개 이상이면 다섯 눈의 합, 아니면 0 |
| 풀하우스 | 3개+2개면 다섯 눈의 합, 아니면 0 (5개가 같으면 풀하우스로 인정) |
| 스몰 스트레이트 | 연속 4개면 15 |
| 라지 스트레이트 | 연속 5개면 30 |
| 야추 | 5개가 모두 같으면 50 |

## 3. S (범위·파일)
| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| 신규 `kids/playground/family/yacht-engine.js` | 순수 규칙 엔진. DOM·저장소 접근 없음. 전역 `YachtEngine` 하나(IIFE) | 300줄 이하 |
| 신규 `kids/playground/family/yacht-ui.js` | 화면·입력·소리·이어하기 저장. 전역 `YachtUI` 하나(IIFE) | 600줄 이하 |
| 신규 `kids/playground/family/yacht.html` | 얇은 래퍼(스크립트·스타일 로드, 뼈대) | 150줄 이하 |
| 신규 `kids/playground/family/yacht.css` | 화면 스타일 | 500줄 이하 |
| `kids/playground/index.html` | 「👨‍👩‍👧‍👦 가족 보드게임」 카드 1개(`family/yacht.html`) | 추가 15줄 이내 |
| 신규 `tests/yacht-engine.test.mjs` | §7 시험 | |
| `kids/core/CORE_CATALOG.md`, 이 문서 | §8 | |

- 모든 경로는 상대 경로(GEMINI §5-6). 외부 프레임워크 없이 바닐라 JS/CSS.
- 소리는 공통 엔진을 쓴다: `kids/core/fairy-config.js`·`fairy-tts.js`·`fairy-engine.js`를 로드하고 `speakFairyTTS(text)`(차례 안내), `fairyReward()`(게임 끝)만 쓴다. `window.speechSynthesis` 직접 호출 금지(GEMINI §6). 화면 위 🔇 버튼으로 안내 음성을 끌 수 있다.

## 4. D (데이터)

### 4-1. 게임 상태 (나중에 서버 중계에서 그대로 쓸 모양)
```json
{ "v": 1, "gameType": "yacht", "stateVersion": 0, "round": 1, "turnPlayer": 0,
  "players": [ { "id": "p1", "name": "민서", "avatar": { "type": "emoji", "value": "🐰" }, "assist": "helper" } ],
  "publicBoard": { "dice": [1,1,1,1,1], "kept": [false,false,false,false,false], "rollCount": 0,
                   "scores": { "p1": { "ones": null, "twos": null } } },
  "lastAction": { "type": "ROLL", "by": "p1" } }
```
- 칸 이름: `ones twos threes fours fives sixes choice fourKind fullHouse smallStraight largeStraight yacht`.
- 상태를 바꾸는 함수는 새 상태를 돌려주고 `stateVersion`을 1 올린다(원본 불변).

### 4-2. 엔진 API (`YachtEngine`)
| 이름 | 설명 |
| :--- | :--- |
| `CATEGORIES` | 칸 목록(id·한글 이름·설명) |
| `createGame(players, rng)` | 2~5명, 이름 1~8자. 잘못되면 예외 |
| `roll(state, rng)` | 고정 안 된 주사위만 굴림. 3번 넘으면 그대로 반환 |
| `toggleKeep(state, index)` | 굴린 뒤에만 |
| `scoreFor(dice, category)` / `scoreOptions(dice)` | §2 점수 |
| `choose(state, category)` | 빈 칸에만 기록, 다음 사람·라운드로 넘김. 굴리기 전에는 불가 |
| `totals(scoresOfPlayer)` | `{upper, bonus, lower, total}` |
| `isOver(state)` / `ranking(state)` | 끝 판정, 동점은 같은 등수 |
| `hints(state, mode)` | §5-2 도움 정보 |
- `rng`는 `() => [0,1)` 함수를 주입받는다(시험에서 고정). 기본은 `crypto.getRandomValues`.

### 4-3. 이어하기
- 진행 중인 게임을 `localStorage('familyYachtGame')`에 저장. 다시 열면 「이어서 하기 / 새 게임」. 읽기 실패·형식 오류는 새 게임으로. 끝난 게임은 지운다.

## 5. 화면

### 5-1. 시작
- 인원 2~5명. 사람마다 이름(빠른 선택 버튼: 민수·민서·아빠·엄마·이모 + 직접 입력), 말(아바타), 도움 단계.
- **말**: 갤러리 캐릭터 그림을 쓴다. `kids/data/gallery-data.js`를 로드하고 `MonsterRoster.charactersOf(item)`(`kids/subjects/quest/monster_roster.js`)로 캐릭터 목록을 만든다. 그림을 못 불러오면 이모지 말(🐰🐻🦊🐯🐸)로 대신한다. 같은 말을 두 사람이 고를 수 없다.
- 도움 단계 기본값: 민서 → 도우미, 민수 → 전술, 그 밖 → 클래식. 바꿀 수 있다.

### 5-2. 도움 단계 (그 사람 차례에만 적용)
| 단계 | 화면 |
| :--- | :--- |
| `helper` 도우미 (초1) | 굴린 뒤 모든 빈 칸에 받을 점수를 미리 보여 준다. 0점이 아닌 칸은 밝게, 0점 칸은 흐리게(누를 수는 있음). 주사위에 점과 숫자를 함께. 굴리기 버튼 아래 "주사위를 눌러 고정해요" 안내 |
| `tactic` 전술 (초5) | 굴린 뒤 받을 점수 미리보기 + **점수가 가장 높은 빈 칸 2개**에 「⚡ 추천」. 같은 점수면 아래쪽(어려운) 칸 우선 |
| `classic` 클래식 (어른) | 미리보기·추천 없음 |
- 어떤 단계든 실수로 0점 칸을 누르면 "정말 0점을 적을까요?" 확인을 한 번 묻는다(에러리스). 경고음 없음.

### 5-3. 게임 화면
- 위: 차례 배너 「🎲 민서 차례! (굴리기 1/3)」 + 그 사람 말 그림.
- 주사위 5개(큰 터치 영역 64px 이상, 고정하면 테두리·「고정」 표시), [굴리기] 버튼, 굴릴 때 짧은 흔들림(`prefers-reduced-motion`이면 생략).
- 점수표: 사람별 열, 칸별 행, 1~6 소계·보너스(63까지 남은 점수 표시)·합계.
- **가로 화면(TV 미러링·태블릿)**: 왼쪽 점수표, 오른쪽 주사위. 글자는 TV에서 보이도록 크게(기본 18px 이상, 차례 배너 32px 이상).
- **세로 화면(폰)**: 위 주사위, 아래 점수표(가로 스크롤 없이 인원에 맞게 줄임). 16px 여백, 가로 스크롤 없음.
- 차례가 바뀌면 TTS로 「민서 차례예요!」, 야추(50점)를 적으면 「야추! 대단해요!」.
- 끝나면 순위 화면(1등 말 크게, 합계표), `fairyReward()`, [다시 하기](같은 사람들) / [처음으로].

## 6. 놀이터 카드
`kids/playground/index.html`에 「👨‍👩‍👧‍👦 가족 보드게임 · 야추 다이스」 카드 하나. 기존 `pg-card` 모양을 그대로 쓴다.

## 7. T (시험) — `tests/yacht-engine.test.mjs`
1. 칸별 점수: 각 칸마다 맞는 예·틀린 예(풀하우스 5개 같은 눈 포함, 스몰 스트레이트 1-2-3-4-6, 라지 2-3-4-5-6).
2. 보너스: 상단 62 → 0, 63 → 35.
3. 굴리기: 3번 제한, 고정한 주사위는 그대로, 첫 굴림 전 고정 불가.
4. `choose`: 빈 칸만, 굴리기 전 불가, 다음 사람·라운드 진행, 12라운드 뒤 `isOver`.
5. 원본 불변·`stateVersion` 증가.
6. `ranking` 동점 처리.
7. `hints`: helper는 모든 빈 칸 미리보기, tactic은 상위 2칸(동점 규칙), classic은 빈 결과.
8. 고정 rng로 2인 한 판 끝까지 진행하는 흐름 시험.
9. 기존 시험 전부: `node --test "tests/**/*.test.mjs"` 통과.
10. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]`.

## 8. 문서
- `CORE_CATALOG.md`에 「🎲 가족 보드게임 · 야추」 절(파일·API·상태 모양·이어하기 키).
- 이 문서 상태를 "구현 완료"로 바꾸고 실제 줄 수를 적는다.

## 9. 구현 계약·로컬 검증 (2026-10-31)

- 공개 API와 상태 필드는 §4를 유지한다. 초기 `lastAction`은 `null`, 유효 행동만 원본 불변·`stateVersion + 1`, 무효 행동은 같은 상태를 반환한다. `CHOOSE`의 `lastAction`에는 `category`도 남긴다.
- 모든 참가자의 점수 12칸을 `null`로 초기화한다. 마지막 차례 뒤 `round:12`를 유지하고 전체 점수 칸으로 종료를 판정한다. 동점 순위는 1·1·3등이다.
- 도움 반환: `{previews:{칸ID:점수},recommendations:[칸ID]}`. 클래식·첫 굴림 전·완료 뒤는 `{}`이다.
- 말 저장: `{type:'gallery',value:{artId,charKey,name,spriteUrl}}` 또는 `{type:'emoji',value:'🐰'}`. 작품 ID+캐릭터 키가 선택 단위다. 그림 오류·2.5초 지연은 이모지로 표시하고, 여러 그림이 실패해도 참가자별 말이 겹치지 않는다. 화면의 대체 표시로 게임 상태 버전을 바꾸지 않는다.
- 이어하기는 형식·점수 가능값·참가자별 기록 개수·라운드/차례·마지막 행동을 검사한다. 오류 시 새 게임으로, 종료 시 저장 삭제, 게임 키 접근 실패 시 안내 후 플레이는 계속한다.
- 오디오는 `fairy-settings-catalog.js`를 TTS와 엔진 사이에 추가한다. `speakFairyTTS`의 `skipPreset:true`로 차례·야추 문장을 그대로 읽고 종료는 `fairyReward()`를 사용한다. 게임 기록 전송·보상 지급·공통 설정 변경은 없다.
- 회귀 시험은 `node:vm`에서 브라우저 IIFE를 직접 실행한다. DOM·저장소 접근은 실패하도록 하고 Node `webcrypto`를 제공한다.
- 브라우저 검증: 설치된 Chrome + guarded preview 서버. 외부 요청은 시험에서만 중단하고 오디오는 호출을 모의한다. 320/360/375/390/768px의 5인 세로 화면(가로 넘침 0, 주사위 64px 이상), 1280px 가로 배치, 도움 단계·0점 취소·고정·음소거·동작 감소·이어하기·2인 24차례 완주·공동 순위·다시 하기를 확인했다.
- 실제 갤러리 캐릭터 5개를 저장해 재개한 뒤 서로 다른 이모지 대체를 확인했다. 실제 CDN 그림·TTS 재생 성공, 물리 태블릿·TV 미러링은 확인하지 않았다. 전체 localStorage 접근 차단 시 공통 오디오 초기화의 기존 예외는 이번 범위에서 수정하지 않았다(게임 키 차단 시 게임 진행은 검증).
- 전체 회귀 시험은 기본 Python 경로의 실행 권한 오류로 빌더 2개가 처음 실패했다. 실행 가능한 번들 Python을 `GALLERY_TEST_PYTHON`으로 지정한 뒤 통과했다. 기존 skip 1개(로컬 아카이브 없음)·todo 1개(노션 두 기기 동시 저장 한계)는 유지한다.
- 실제 줄 수: `yacht-engine.js` 149줄, `yacht-ui.js` 407줄, `yacht.html` 81줄, `yacht.css` 109줄, `tests/yacht-engine.test.mjs` 212줄, `kids/playground/index.html` 187줄(11줄 추가), `CORE_CATALOG.md` 1201줄, 이 문서 140줄.
- 검증 자료와 명령 결과는 로컬 `uploads/ex/family-yacht/walkthrough.md`에만 남기며 화면 시험 스크립트·로그·스크린샷과 함께 커밋하지 않는다.
