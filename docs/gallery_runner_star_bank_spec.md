# ⭐ 미니 런 「별 저금통 & 꾸미기」 기능 명세서 (Runner Star Bank Spec)

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **상위 규칙**: `kids-school-main/GEMINI.md`(§5 이미지, §6 오디오, §8 클린 코드·계약), `g:/master-tower/GEMINI.md`
> **연계 문서**: [`docs/gallery_character_runner_spec.md`](gallery_character_runner_spec.md), [`docs/gallery_multi_character_spec.md`](gallery_multi_character_spec.md), `kids/core/CORE_CATALOG.md`의 `gallery-mini-runner.js`·`monster_roster.js` 절, [`docs/notion_schemas_school.md`](notion_schemas_school.md)의 INVENTORY_DB
> **작업자 참고**: 코드를 쓰기 전에 `AGENTS.md` 순서대로 `GEMINI.md`, `CORE_CATALOG.md`, 위 연계 문서를 읽는다.

---

## 0. 실행 계획부터 보고하고 승인 대기

- 코드를 쓰기 전에 **바꿀 파일, 줄 수 예상, 시험 계획**을 먼저 보고하고 승인을 기다린다.
- 작업은 worktree(`G:/master-tower/scratch/worktrees/runner-star-bank`, 브랜치 `codex/runner-star-bank`)에서 한다. `main` 병합·푸시는 하지 않는다.
- **운영 노션에 쓰지 않는다.** 노션 요청은 시험에서 모의(fetch mock)로만 확인한다. 노션 DB 속성 추가도 하지 않는다(§4-3, 사용자가 한다).
- worktree의 변경 파일은 관제탑 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>`로 하나씩 검사한다.
- `walkthrough.md`, 시험용 임시 데이터는 커밋하지 않는다.

---

## 1. A (Action · 목표)

민수가 "별 먹으면 뭐가 있어?"라고 물었다. 지금 별은 **기기에 저장되는 최고 기록**에만 쓰인다.
이번 작업으로 별에 쓸모를 준다.

1. **별 저금통**: 달릴 때마다 모은 별이 계속 쌓인다(최고 기록과 별개).
2. **꾸미기 선물**: 쌓인 별이 정해진 개수에 닿으면 **스테이지 배경·달리기 꼬리·모자·별 모양**이 하나씩 열린다.
3. **공부하면 런너가 좋아진다**: 그날 5분 퀘스트를 마치면, 그날 달리기에 **🧲 별 자석**이 켜진다.

### 정한 원칙 (사용자 결정 2026-10-31)
- **별은 런너 안에서만 쓴다.** 보석💎·사탕🍬·경험치·소원권·가디언 시간으로 바꾸지 않는다. 보석 경제는 공부 전용이다.
- 아이 그림(캐릭터 스프라이트)은 그대로 둔다. 선물은 모두 **코드로 그리는 것**이다(새 이미지 파일 없음, §5 이미지 규칙과 충돌 없음).

---

## 2. 도입 전 구조 (2026-10-31 확인한 사실)

- `kids/common_space/gallery-mini-runner.js` (433줄): 60초 런. `step()`이 별을 먹으면 `world.score++`, 장애물에 부딪히면 `score - 1`. `finish()`가 `MonsterRoster.setRunnerBest(child, score)`로 최고 기록만 남긴다(부모는 기록하지 않음).
  - 배경은 단색 + 장식(민서 구름, 민수 네온 격자). `draw()` 240~257행.
  - 완주 화면: `showMessage(session, '완주! ⭐ N개', [['다시 달리기'], ['닫기']])`.
- `kids/subjects/quest/monster_roster.js`: `galleryRunnerBest_son|daughter` 로컬 저장(`getRunnerBest`/`setRunnerBest`). 노션 동기화 없음. `gallery.html`과 `quest_runner.html` 양쪽에서 로드된다.
- `kids/subjects/quest/quest-runner.js` 약 600행: 퀘스트 완주 처리(`fairyReward`, `grantRewardAndShowUI(3, true)`).
- 노션 INVENTORY_DB: 아이별 1행(제목 「이름」 = `민수`/`민서`). 페이지 ID 캐시는 `localStorage('MINMIN_INVENTORY_PAGE_ID_{민수|민서}')`, 조회 방법은 `kids/core/fairy-settings-engine.js` `saveToCloud`(75~93행)와 같다.
  - ⚠️ 「학습설정」 속성은 여러 화면이 같이 쓰는 JSON이고, 2026-10-28 덮어쓰기 사고가 있었다. **이번 작업은 「학습설정」을 읽지도 쓰지도 않는다.**
- Worker GET은 엣지 캐시가 있다. 최신 값을 읽을 때는 주소 끝에 `?force=true`를 붙인다(Worker v4.6이 지우고 넘김, 2026-10-28 확인).
- 별 개수 감각: 60초 동안 별은 민수 약 63개, 민서 약 92개 나온다. 실제로는 민수 30~50개, 민서 50~80개쯤 먹는다.

---

## 3. S (Scope · 범위)

| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| 신규 `kids/common_space/gallery-runner-rewards.js` | 선물 목록, 저금통 저장·노션 동기화, 해금 계산, 배경·꼬리·모자·별 그리기 함수, 꾸미기 패널. IIFE, 전역 `GalleryRunnerRewards` 하나. 로딩 시 DOM 접근 없음 | 300~550줄 (800 미만) |
| `kids/common_space/gallery-mini-runner.js` | 연결만: 배경·꼬리·모자·별 그리기를 위 모듈에 위임, 완주 화면 확장, 별 자석 | 추가 80줄 이내 (전체 520줄 이하) |
| `kids/subjects/quest/quest-runner.js` | 퀘스트 완주 시 `GalleryRunnerRewards.markQuestBoost(child)` 한 줄 호출 (§4-5) | 추가 3줄 이내 |
| `kids/common_space/gallery.html` | `gallery-runner-rewards.js` 로드 (런너 앞) | 추가 1줄 |
| `quest_runner.html` (저장소 루트, 606줄) | `gallery-runner-rewards.js` 로드 (`quest-runner.js` 앞) | 추가 1줄 |
| 신규 `tests/gallery-runner-rewards.test.mjs` | §8 시험 | 제한 없음 |
| `kids/core/CORE_CATALOG.md`, `docs/notion_schemas_school.md`, `docs/gallery_character_runner_spec.md`, 이 문서 | §9 | |

### 손대지 않는 것
- 보석·사탕·경험치·하트·학습일지·가디언 시간, `notion-study-logger.js`, `grantReward*`
- 노션 「학습설정」 속성과 `fairy-settings-engine.js`
- `gallery.css`(상한 초과), `gallery-spot-diff.js`, `gallery-modal-manager.js`, Worker, `kids-archive`
- 마이룸 상점(`my-room.html`)과 그 아이템

---

## 4. D (Data · 데이터 계약)

### 4-1. 선물 목록 (모듈 안 상수, 아이별 사다리)

해금 여부는 **누적 별(total)에서 계산**한다. 해금 목록을 따로 저장하지 않는다(어긋날 일이 없게).
각 분류의 `기본`(0개)은 처음부터 열려 있다.

| 분류 `kind` | 민수 기본 | 민서 기본 |
| :--- | :--- | :--- |
| `stage` (배경) | `neon_grid` 🟩 네온 격자 (지금 그림) | `cloud_field` ☁️ 구름 들판 (지금 그림) |
| `trail` (꼬리) | `none` 없음 | `none` 없음 |
| `hat` (모자) | `none` 없음 | `none` 없음 |
| `star` (별 모양) | `bolt` ⚡ 지금 별 (네온색) | `star` ⭐ 지금 별 (노란색) |

**민수 사다리 (누적 ⭐)**

| 누적 | id | kind | 이름 |
| ---: | :--- | :--- | :--- |
| 40 | `neon_trail` | trail | ⚡ 네온 잔상 |
| 120 | `night_city` | stage | 🌃 밤하늘 도시 |
| 250 | `crown` | hat | 👑 왕관 |
| 450 | `diamond` | star | 💎 다이아 조각 |
| 700 | `space_station` | stage | 🌌 우주 정거장 |
| 1000 | `fire_trail` | trail | 🔥 불꽃 |
| 1400 | `headset` | hat | 🎧 헤드셋 |
| 1900 | `lava_cave` | stage | 🌋 용암 동굴 |
| 2500 | `rainbow_trail` | trail | 🌈 무지개 |

**민서 사다리 (누적 ⭐)**

| 누적 | id | kind | 이름 |
| ---: | :--- | :--- | :--- |
| 60 | `sparkle_trail` | trail | ✨ 반짝 별가루 |
| 180 | `flower_field` | stage | 🌷 꽃밭 |
| 360 | `ribbon` | hat | 🎀 리본 |
| 650 | `heart` | star | 💗 하트 |
| 1000 | `seaside` | stage | 🏖️ 바닷가 |
| 1450 | `rainbow_trail` | trail | 🌈 무지개 |
| 2000 | `crown` | hat | 👑 왕관 |
| 2700 | `starry_night` | stage | 🌙 별빛 밤하늘 |
| 3500 | `bubble_trail` | trail | 🫧 비눗방울 |

- 사다리는 데이터 배열 한 곳에만 둔다. 나중에 줄을 더하면 새 선물이 생기게 한다.
- 마지막 선물까지 연 뒤에는 "별 저금통 ⭐ N개"만 보이고 "다음 선물" 줄은 숨긴다.

### 4-2. 로컬 저장 (기기)

키 `galleryRunnerBank_son` / `galleryRunnerBank_daughter`, 값 JSON:

```json
{ "v": 1, "total": 312, "pending": 52,
  "loadout": { "stage": "night_city", "trail": "neon_trail", "hat": "none", "star": "bolt" },
  "boostDate": "2026-10-31", "updatedAt": 1793433600000 }
```

- `total`: 화면에 보이는 누적 별 = 마지막으로 노션과 맞춘 값 + `pending`.
- `pending`: 노션에 아직 반영하지 못한 별. 노션 저장에 성공하면 0이 된다.
- `boostDate`: 5분 퀘스트를 마친 마지막 날(로컬 `YYYY-MM-DD`, §4-5). 없으면 `""`.
- `loadout`: 고른 꾸미기. **해금되지 않은 id나 모르는 id는 그 분류의 기본값으로 읽는다**(데이터가 이상해도 깨지지 않게).
- 읽기 실패·파싱 실패·`localStorage` 접근 실패는 `{v:1,total:0,pending:0,loadout:기본}`으로 돌려준다. 저장 실패는 `false`를 돌려주고 게임은 계속된다.
- 기존 `galleryRunnerBest_*`(최고 기록)은 그대로 둔다.

### 4-3. 노션 저장 (기기 간 공유)

- INVENTORY_DB에 **rich_text 속성 「런너기록」**을 새로 쓴다. 속성은 **사용자가 노션에서 직접 만든다**(작업자는 만들지 않는다).
- 값은 JSON 문자열: `{"v":1,"total":312,"loadout":{...},"boostDate":"2026-10-31","updatedAt":1793433600000}` (`pending`은 넣지 않는다).
- **「런너기록」을 읽고 쓰는 코드는 `gallery-runner-rewards.js` 한 곳뿐이다.** 런너와 퀘스트 화면 모두 이 모듈 함수를 부른다.
- **PATCH 본문에는 「런너기록」 속성 하나만 넣는다.** 다른 속성(특히 「학습설정」)은 절대 넣지 않는다. 시험으로 확인한다(§8).
- 주소와 DB ID는 `fairy-settings-engine.js`처럼 `APP_CONFIG.WORKER_PROXY_URL`, `APP_CONFIG.INVENTORY_DB_ID`를 쓰고, 없으면 같은 기본값을 쓴다. 페이지 ID는 `MINMIN_INVENTORY_PAGE_ID_{민수|민서}` 캐시를 먼저 쓰고 없으면 같은 방법으로 조회해 캐시한다.

### 4-4. 동기화 규칙

| 언제 | 무엇 |
| :--- | :--- |
| 런 시작(`start`) | `pull(child)`: 노션 GET(`?force=true`) → 클라우드 `total`을 C라 하면 로컬 `total = C + pending`. `loadout`은 클라우드 `updatedAt`이 더 최근이면 클라우드 값을 쓴다. 게임 시작을 기다리게 하지 않는다(뒤에서 실행). |
| 완주(`finish`) | `addStars(child, score)`: 로컬 `total += score`, `pending += score` 저장 → `flush(child)` |
| 꾸미기 변경 | 로컬 `loadout`, `updatedAt` 저장 → `flush(child)` (1초 디바운스) |

**불변식: 노션에는 "이 기기에서 새로 번 별(`pending`)"만 더한다. 로컬 `total`로 노션 값을 덮어쓰지 않는다.**
`Math.max(로컬, 노션)`도 쓰지 않는다. 두 기기가 각각 아직 올리지 못한 별을 갖고 있으면 한쪽 별이 사라지기 때문이다(§8-1 시험 7).

`flush(child)`:
1. 노션 GET(`?force=true`)으로 클라우드 C를 다시 읽는다.
2. `newTotal = C.total + pending`, `loadout`은 4-4 첫 줄 규칙으로 고른 값, `boostDate`는 C와 로컬 중 늦은 날짜(문자열 비교).
3. PATCH 「런너기록」 = `{v:1,total:newTotal,loadout,boostDate,updatedAt}`.
4. 성공하면 로컬 `total = newTotal`, `pending = 0`. 실패(네트워크, 4xx·5xx, 속성 없음)는 `console.warn`만 하고 `pending`을 그대로 둔다. 다음 `flush`나 `pull` 때 다시 시도한다.

- 같은 기기에서 `flush`가 겹치지 않게 한다(진행 중이면 끝난 뒤 한 번 더).
- **GET 응답에 「런너기록」 속성이 아예 없으면** 노션 속성이 아직 없는 것이다. PATCH하지 않고 로컬만 쓴다(오류 알림 없음).
- 두 기기가 같은 순간에 저장하는 경합은 받아들인다(아이 한 명이 두 기기로 동시에 달리지 않음). 문서에 한 줄 적는다.
- **부모 보기(`viewer === 'parent'`)는 저금통을 읽지도 쓰지도 않는다.** 부모 화면은 모든 선물이 열린 미리보기이고, 고른 꾸미기는 저장하지 않는다.

### 4-5. 별 자석 (공부 → 런너)

공부는 태블릿에서, 달리기는 폰에서 해도 자석이 켜지도록 노션 「런너기록」의 `boostDate`로 기기 간에 나눈다.

- `GalleryRunnerRewards.markQuestBoost(child)`:
  1. 로컬 저금통 `boostDate`를 오늘(로컬 `YYYY-MM-DD`)로 저장한다.
  2. `flush(child)`를 부른다(§4-4 규칙 그대로. `boostDate`가 함께 올라가고 별 합산은 바뀌지 않음).
  - 부모 모드(`localStorage('currentUserName')`가 `아빠`/`엄마`)면 아무것도 하지 않는다. `child`가 `son`/`daughter`가 아니면 `false`.
- `hasBoostToday(child)`: 로컬 `boostDate`가 오늘이면 `true`. 노션 값은 `pull`이 로컬에 늦은 날짜로 합쳐 둔다.
- 날짜는 로컬 날짜로 만든다. `.toISOString().slice(0,10)`·`.split('T')[0]` 금지(GEMINI §8-5).
- `quest-runner.js` 퀘스트 완주 처리(`fairyReward` 근처)에서 `global.GalleryRunnerRewards?.markQuestBoost(isMinseo ? 'daughter' : 'son')` 한 번. 결과를 기다리지 않는다(퀘스트 완주 화면을 늦추지 않음). 실패해도 퀘스트 보상·학습일지에는 영향이 없다.
- 런너 `start()`는 그림 불러오기와 함께 `pull(child)`을 기다리되 **최대 1.5초**까지만 기다린다. 그다음 `restart()`가 아이 보기일 때만 `hasBoostToday(child)`를 읽어 `magnet`을 넘긴다. 부모 보기는 늘 `false`. 노션이 늦게 와도 다음 판부터는 켜진다.
- 노션 「런너기록」 속성이 아직 없으면 자석은 퀘스트를 푼 기기에서만 켜진다(로컬로 동작).
- 런너: `createWorld(seed, { ..., magnet: true })`이면 별을 먹는 판정 상자를 플레이어 판정 상자보다 **사방 `.05`(높이 단위) 넓게** 쓴다. 장애물 판정은 바꾸지 않는다. `magnet` 기본값은 `false`(기존 시험 그대로 통과).
- 자석이 켜지면 HUD에 `🧲`를 붙이고, 플레이어 둘레에 옅은 원을 그린다. 시작 안내 TTS에 "오늘 공부를 마쳐서 별 자석이 켜졌어요!"를 덧붙인다.

---

## 5. 화면 (UI)

### 5-1. 완주 화면
```
완주! ⭐ 52개 · 새 기록!
별 저금통 ⭐ 312개
[■■■■■■□□□□] 다음 선물 🌌 우주 정거장까지 ⭐ 138개
🎁 새 선물: 👑 왕관!          ← 이번 런으로 새로 열린 것이 있을 때만
[다시 달리기] [🎨 꾸미기] [닫기]
```
- 진행 바는 `<progress>` 또는 `role="progressbar"`(`aria-valuenow` 등)로 만든다.
- 새 선물이 열리면 완주 TTS 문장 끝에 "새 선물! 왕관을 받았어요!"를 덧붙인다(`say()`는 한 번만 호출).
- 부모 보기에는 저금통 줄과 진행 바를 보이지 않는다.

### 5-2. 꾸미기 패널
- 완주 화면과 "잠깐 쉬기" 화면의 `🎨 꾸미기` 버튼으로 연다. `.gmr-message` 영역 안에 그린다(새 모달 없음).
- 분류 4줄: 스테이지 / 꼬리 / 모자 / 별 모양. 각 줄에 그 아이의 선물 버튼(이모지 + 이름).
  - 열린 것: 누르면 바로 고름. 고른 것은 `aria-pressed="true"`와 테두리 강조.
  - 잠긴 것: `🔒 ⭐ 138개 더` 표시, `disabled` 대신 누르면 "별을 138개 더 모으면 열려요!" 안내(에러리스, 경고음 없음).
- `[돌아가기]` 버튼. 버튼은 44px 이상, Esc·포커스 순환은 기존 `start()`의 처리 그대로 따른다.

### 5-3. 그리기 규칙
- 배경(`stage`)은 기존 `draw()`의 배경 단계(240~257행)만 바꾼다. **땅·장애물·별·캐릭터는 배경 위에 그대로 그리고, 장애물과 별이 배경과 확실히 구분돼야 한다**(배경은 채도·밝기를 낮춤).
- 배경은 진행 거리(`w.distance`)에 따라 느리게 흐르게 한다(기존 구름·격자처럼 패럴랙스).
- 꼬리(`trail`): 플레이어 뒤쪽에 최근 위치 8~12개를 점점 옅게. 기록은 세션에 두고 `world`(물리)에는 넣지 않는다.
- 모자(`hat`): 스프라이트 위쪽 가운데에 이모지 `fillText`. 크기는 플레이어 높이의 35% 안팎. 점프 기울기·흔들림을 따라간다.
- 별 모양(`star`): 기존 별 그리기(266~277행)를 모양 함수로 바꾼다. 판정 상자(`.045`)는 바꾸지 않는다.
- 그리기 함수는 순수하게 `(ctx, world, opts)`만 받는다. `requestAnimationFrame` 절전·`close()` 해제 규칙은 그대로다.
- `prefers-reduced-motion`이면 꼬리를 그리지 않는다.

---

## 6. 모듈 API (`window.GalleryRunnerRewards`)

| 이름 | 설명 |
| :--- | :--- |
| `LADDERS` | 아이별 사다리 상수 (읽기 전용으로 내보냄) |
| `unlockedOf(child, total)` | 열린 선물 id 배열 (기본 포함) |
| `nextGoal(child, total)` | `{item, remaining}` 또는 마지막이면 `null` |
| `newlyUnlocked(child, before, after)` | 이번에 새로 열린 선물 배열 |
| `readBank(child)` / `addStars(child, n)` / `setLoadout(child, kind, id)` | 4-2 로컬 저장 |
| `pull(child)` / `flush(child)` | 4-4 노션 동기화 (Promise, 실패해도 reject하지 않음) |
| `markQuestBoost(child)` / `hasBoostToday(child)` | 4-5 별 자석 |
| `drawStage(ctx, world, id)`, `drawTrail(ctx, points, id)`, `drawHat(ctx, player, id)`, `drawStar(ctx, star, x, id)` | 5-3 |
| `openWardrobe(session, {child, viewer, onBack})` | 5-2 |

- `n`은 0 이상 안전 정수만 받는다. 아니면 무시하고 `false`.
- `child`는 `son`/`daughter`만. 아니면 빈 결과.

---

## 7. 줄 수·성능

- 새 모듈 550줄 이하, 런너 520줄 이하. 넘을 것 같으면 보고하고 멈춘다.
- 배경 그리기는 프레임당 도형 수십 개 안쪽. 갤럭시 S22급에서 60fps 유지.

---

## 8. T (Test · 시험)

### 8-1. `tests/gallery-runner-rewards.test.mjs` (노션 미접속, `localStorage`·`fetch` 모의)
1. 사다리: `unlockedOf('son', 0)`은 기본 4개만, `unlockedOf('son', 250)`은 `neon_trail`·`night_city`·`crown` 포함, 경계값(39/40) 확인. 민서도 같은 방식.
2. `nextGoal`: 남은 개수가 맞고, 마지막 선물 이후 `null`.
3. `newlyUnlocked('son', 230, 260)` → `[crown]`. 한 번에 두 개 넘는 경우도.
4. `readBank`: 깨진 JSON, 모르는 id, 잠긴 id → 기본값으로 읽음.
5. `addStars`: `total`·`pending`이 함께 늘고, 음수·소수·문자열은 거부.
6. `flush` 성공: 클라우드 total 300 + pending 52 → PATCH total 352, 로컬 pending 0. **PATCH 본문의 `properties` 키가 정확히 `["런너기록"]` 하나**인지 확인.
7. **두 기기 시험** (모의 노션 하나를 두 기기의 로컬 저장소가 같이 씀):
   - 처음 노션 300. 태블릿이 50개 벌고 저장 → 노션 350. 폰(로컬 300, 아직 pull 안 함)이 15개 벌고 저장 → 노션 **365**.
   - 둘 다 저장 실패 상태로 태블릿 40개, 폰 15개를 들고 있다가 차례로 저장 → 노션 300 + 40 + 15 = **355** (`Math.max`라면 340이 되어 실패하는 경우).
   - 저장 뒤 각 기기에서 `pull` → 두 기기 모두 노션과 같은 `total`.
8. `flush` 실패(500, 네트워크 오류): pending 유지, 예외 없음. 다음 `flush` 성공 때 한 번만 더해짐.
9. GET에 「런너기록」 속성이 없으면 PATCH 요청 0건.
10. 겹친 `flush` 두 번 → 겹쳐 보내지 않고 최종 total이 중복 없이 맞음.
11. 부모 보기: `fetch` 0건, 로컬 저금통 변화 0.
12. GET 주소에 `force=true`가 붙음.
13. 별 자석: 태블릿에서 `markQuestBoost` → 노션 `boostDate` 오늘, total 그대로. 폰에서 `pull` 뒤 `hasBoostToday` true. 어제 날짜면 false. 부모 모드면 `fetch` 0건. 날짜는 로컬 기준(시간대 모의로 자정 직전·직후 확인).
14. `flush`가 노션의 더 늦은 `boostDate`를 지우지 않음.

### 8-2. 런너 시험 (`tests/gallery-character-runner.test.mjs`에 추가)
1. `magnet: false`(기본)일 때 기존 결과와 같음(기존 시험 모두 통과).
2. `magnet: true`면 플레이어 판정 상자에서 `.04` 떨어진 별을 먹고, `.06` 떨어진 별은 먹지 않음.
3. 장애물 판정은 `magnet`과 무관.
4. 줄 수: 런너 520줄 이하, 새 모듈 550줄 이하(파일 읽어 확인).

### 8-3. 전체
- `node --test "tests/**/*.test.mjs"` 모두 통과.

### 8-4. 화면 확인 (노션 쓰기 차단 서버)
- `python scripts/guarded_preview_server.py`(포트 8767)로 갤러리를 열어 확인한다. `python -m http.server`는 쓰지 않는다.
- 아이별로 모든 스테이지·꼬리·모자·별 모양을 한 번씩 켜고 **세로 폰(390×844)과 가로 태블릿** 스크린샷을 남긴다. 장애물과 별이 배경에서 잘 보이는지 눈으로 확인한다.
- 완주 화면(새 선물 있음/없음/마지막 선물 이후), 꾸미기 패널(잠김 안내), 부모 보기 미리보기를 확인한다.
- 숨은 미리보기 창은 rAF가 느려지므로 60초 실제 플레이 검증은 사용자 폰 시험으로 넘긴다고 보고한다.

---

## 9. 문서 갱신

- `kids/core/CORE_CATALOG.md`: 런너 절 124행 "보석·사탕·학습·노션에는 연결하지 않습니다"를 "보석·사탕·학습에는 연결하지 않는다. 별 저금통만 노션 INVENTORY_DB 「런너기록」에 쓴다"로 고치고, 새 모듈 절(API·저장 키·동기화 불변식·별 자석·줄 수)을 더한다. 5분 퀘스트 절에 `markQuestBoost` 호출 한 줄을 적는다.
- `docs/notion_schemas_school.md` INVENTORY_DB 표에 `런너기록 | rich_text | 미니 런 별 저금통 JSON (gallery-runner-rewards.js 전용)` 줄.
- `docs/gallery_character_runner_spec.md` 머리말에 이 문서 링크 한 줄.
- 이 문서 상태를 "구현 완료"로 바꾸고 실제 줄 수를 적는다.

---

## 10. 완료 보고에 넣을 것

- 바꾼 파일과 줄 수, 커밋 해시
- §8 시험 결과(통과 수), 계약 검사 결과
- 화면 확인 스크린샷 경로와 눈으로 본 결과(배경 대비 문제 여부)
- 하지 않은 것: 노션 속성 생성, 운영 노션 쓰기, 폰 실제 플레이, `main` 병합

## 11. 이번에 하지 않는 것 (다음 후보)

- 캐릭터별 친밀도(같은 캐릭터로 많이 달리면 5분 퀘스트 새 대사·포즈)
- 아이 그림으로 만든 새 장애물·스테이지
