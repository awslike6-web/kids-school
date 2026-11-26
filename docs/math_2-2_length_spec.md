# 📏 2-2 길이 재기(m·cm) 탐험관 설계 명세 (math_2-2_length_spec.md)

> 상태: **구현 완료 (2026-11-26)** · 카본(medium)·네온(medium) 설계 검토 28건 중 27건 반영(§9). 초안: 계산 부품·감싸개·퀴즈 자료 = 하이드로젠 medium, 그리기·화면·CSS = 네온 medium(초안 뒤 고친 곳: 명세 물건 표 범위 1·빙고 칸 줄바꿈 CSS 1·퀴즈 말투 1, 모델 실수 0). 시험 7개 통과, 360·375px에서 7개 관 끝까지 확인. 퀴즈 12제 노션 등록 끝(2026-11-26, 사용자 승인). 남은 것: 실제 폰 소리 확인.
> 앞선 작업: [`math_2-2_four_digit_spec.md`](math_2-2_four_digit_spec.md)(같은 틀·같은 민서 맞춤) · 공용 틀: [`CORE_CATALOG.md`](../kids/core/CORE_CATALOG.md) 「수학 단원 탐험관 공용 틀」·「2-2 네 자리 수 탐험관」

## 1. 왜 만드나

- 사용자 요청(2026-11-26): 「2학년 2학기부터 아래서부터 남은 것들」의 두 번째 단원. 2-2 빈 단원: 네 자리 수 ✅ · ② **길이 재기** ← 이번 · 시각과 시간 · 표와 그래프 · 규칙 찾기.
- 수학방에 있는 길이 화면은 3학년 `length_time.html`(mm·km)뿐이다. 2-1 「길이 재기」(cm·자)도 아직 없으므로 cm 기초는 🪜 계단 카드로 받친다.

```
2-1  (화면 없음, 🪜 계단 카드)   1cm · 자로 재기
  ⬆
2-2  length_m.html              1m = 100cm · 몇 m 몇 cm · 합과 차 · 어림   ← 이번
  ⬆
3-1  length_time.html           1mm · 1km
```

## 2. 교과 범위

- 1m = 100cm, 몇 m = 몇백 cm, 줄자 눈금 읽기(몇 cm → 몇 m 몇 cm), m와 cm 바꾸기, 길이 비교(단위가 섞인 두 길이), **받아올림·받아내림 없는** 길이의 합과 차(m는 m끼리, cm는 cm끼리), 몸으로 1m 어림하기·알맞은 단위 고르기·누가 더 가깝게 어림했나.
- **길이는 모두 정수 cm로 다룬다.** 문제의 길이는 1cm ~ 9m 99cm(999cm). 오답 보기도 1cm 이상 999cm 이하. 예외 둘:
  - `split-wrong`(「13m 7cm」처럼 m·cm를 잘못 나눈 글자) — 값이 아니라 쓰기 실수 그 자체. 그래서 이 오답이 나오는 문제의 길이는 101~299cm로 둔다(29m 9cm까지만).
  - 5관 `unit-pick` — 물건 표에 손으로 적은 보기 3개를 그대로 쓴다(§5 표).
- 표기 `fmt(cm)`: 0m면 `45cm`, 0cm면 `2m`, 둘 다 있으면 `1m 25cm`(숫자와 단위 붙여 쓰고, m 뒤 한 칸). 「13m 0cm」 같은 글은 어디에도 나오지 않는다.
- 조사: 길이 뒤에는 받침 없는 말(미터·센티미터)에 맞춰 `는·가·를·와`로 고정(「2m 7cm는」, 「3m를」).

## 3. 공통 설계 (2-2 네 자리 수와 같음)

- 민서에게 맞추기 그대로: 질문 자동 읽기·오답 힌트 자동 읽기(20자 안팎)·`question` 25자 이내(전제 문장은 문제 위 **안내표 `fact`** 한 줄로 따로)·한 문제 누르는 횟수 10번 이내·문제 상자 안 동시 활성 버튼 4개 이하·버튼 56px·길이 보기는 **세로 1열**·지난번 관 기억·`[다음 관 ▶]`·6문제마다 🍬1(하루 3개).
- 틀 `MathExplorer.mount`(`rememberTab`, `wishBox`), `MathDrill.ask/rounds/algo/why`, `MathLadder`. 학습일지 `g:lenm-<종류>`. key `lenm`, 테마 `mx-theme-lenm`(하늘·노랑), 몸 클래스 `mx-grade2`.
- 크기 비교 보기 3개 고정 순서: `> 왼쪽이 길어요` · `< 오른쪽이 길어요` · `= 같아요`.
- **소리 규칙** — 화면 글과 읽는 글을 나눈다. `LengthMCore.speakText(text)`가 화면 글을 읽는 글로 바꾼다:
  - `1m 25cm` → `1미터 25센티미터`, 숫자 없는 `m`·`cm`(「몇 m 몇 cm」) → `미터`·`센티미터`, `+` → `더하기`, `−`·`-` → `빼기`, `○`가 든 비교 질문은 쓰지 않고 문제별 `speak`(「2미터 5센티미터와 150센티미터, 어느 쪽이 길까요?」).
  - 횟수 `2번`~`5번` → `두 번`~`다섯 번`. 동물 보기는 `🐰 토끼`처럼 이름을 같이 적고 읽는 글은 `토끼`.
  - 문제의 `question`·`fact`·힌트·해설·빙고 `call`·리본 주문과 안내 모두 `speakText`를 거쳐 읽는다.

### 3-1. 그리기 부품 `LengthDraw` (`js/length_m-draw.js`, 새 파일)

모든 그림은 폭 `100%`(최대 340px), 높이 130px 이내, 글자 14px 이상, 360px 화면에서 가로 넘침 없음.

- `sticks(n)` — 10cm 막대 n개를 한 줄에 이어 그림. 막대 안에는 `10`만, 그림 위 범례 「막대 1개 = 10cm」, 오른쪽에 큰 글씨로 지금 합계(`70cm`). 5개마다 살짝 띄움. `add()`로 하나 늘고, 10개가 되면 `merge()` 장면(0.8초)으로 하나의 「1m = 100cm」 띠가 된다. 장면 중 `busy()` 참, 끝나면 `onMerged` 부름.
- `tape({ len, max, zoom: true, pins })` — **줄자 그림** 두 층:
  - 위 **전체 줄자**: 0 ~ max cm(max는 200 또는 300), 1m마다 큰 눈금과 `0`·`100`·`200`·`300`(cm로 적음, 실제 줄자처럼), 10cm마다 작은 눈금. 물건 띠(색 막대)는 0에서 len까지.
  - 아래 **🔍 돋보기 띠**(`zoom: true`일 때): `zoomRange(len, max)` 구간 30cm, 1cm마다 짧은 눈금·**5cm마다 중간 눈금**·10cm마다 긴 눈금과 숫자(`120`·`130`…), 좌우 18px 여백(끝 숫자가 잘리지 않게), 물건 끝에 ▼. 전체 줄자의 그 구간을 옅은 사각형으로 표시해 둘을 잇는다.
  - `pins`(5관 ③): `[{ len, label }]` — 전체 줄자 위에 깃발(🐰·🐻·🦊·⭐)을 꽂는다. 깃발이 겹치면 위아래로 엇갈려 놓는다. `zoom: false`와 함께 쓴다.
- `ribbon({ max: 400 })` — 6관 리본 가게. 전체 줄자(0~400, 돋보기 없음) 위로 리본(분홍 띠)이 `set(cm)`에 따라 늘고 줄어든다(0.25초 전환). 그림 위에 큰 글씨로 「지금 1m 20cm」. `get()`.
- 순수 함수 `zoomRange(len, max)` → `{ from, to }`: `from = floor(len/10)*10 − 10`, `to = from + 30`, 0 아래면 `0~30`, max 위면 `max−30 ~ max`로 민다(시험 대상).

## 4. 길이 재기 탐험관 (`length_m.html`, key `lenm`)

| 관 | 배우는 것 | 활동 (문제 순서) | 🪜 |
| :--- | :--- | :--- | :---: |
| 1관 1m는 몇 cm? | 10cm가 10개 = 100cm = 1m | ① `ten-sticks`: 10cm 막대 6~8개가 놓여 있음 → `[＋ 10cm]`로 10개 → 「1m」 띠로 합쳐짐 → "10cm가 10개면 몇 cm?" (100cm / 10cm `count-only` / 90cm `count-off`) ② `m-is-cm`: "1m는 몇 cm예요?" (100cm / 10cm `zero-drop` / 1cm `unit-ignore`) ③ `m-n`: "3m는 몇 cm예요?" n 2~9 (300cm / 30cm `zero-drop` / (n±1)00cm `count-off`, ±는 무작위·범위 안) | ✓ |
| 2관 줄자로 재기 | 줄자 눈금 읽기 | `tape`(돋보기) 그림 아래 묻기. ① `tape-cm`: len 101~199(일의 자리 ≠ 0) "몇 cm예요?" (137cm / 127cm 또는 147cm `tick-off` / 37cm `m-ignore`) ② `tape-mcm`: len 111~299(일의 자리 ≠ 0, cm 부분 ≥ 11) "몇 m 몇 cm예요?" (1m 37cm / 13m 7cm `split-wrong` / 1m 27cm 또는 1m 47cm `tick-off`) ③ `tape-zero`: len 101~109 또는 201~209 "몇 m 몇 cm예요?" (2m 8cm / 2m 80cm `zero-shift` / 28cm `m-as-ten`) | ✓ |
| 3관 m와 cm 바꾸기 | 몇 cm ↔ 몇 m 몇 cm, 비교 | ① `cm-to-m`: len 111~299(일의 자리 ≠ 0, cm 부분 ≥ 11, 십·일 숫자 다름) "135cm는 몇 m 몇 cm?" (1m 35cm / 13m 5cm `split-wrong` / 1m 53cm `swap-digits`) ② `m-to-cm`: cm 부분 1~9 절반·11~99 절반, m 1~9 (한 자리: 207cm / 270cm `zero-shift` / 27cm `zero-drop` · 두 자리(십·일 숫자 다름): 245cm / 254cm `swap-digits` / 45cm `m-ignore`) ③ `compare`: 한쪽은 `몇 m 몇 cm`, 다른 쪽은 `몇 cm`(왼쪽·오른쪽은 무작위), 세 갈래를 1/3씩 — **함정**(m 쪽이 더 긴데 cm 쪽 숫자가 커 보임, 「2m 5cm ○ 150cm」) · **cm 쪽이 긺**(두 길이 차이 30cm 이하, 「1m 90cm ○ 205cm」) · **같음**(「2m 30cm ○ 230cm」) → 비교 보기 3개 | |
| 4관 길이의 합과 차 | m는 m끼리, cm는 cm끼리 | 길이 표(m 칸·cm 칸, 두 줄 + 답 줄은 빈칸)를 보여 주고 묻기. 두 길이 모두 1m 이상·cm 부분 1 이상. ① `add`: "1m 20cm + 2m 35cm" — cm 합 ≤ 99, m 합 ≤ 9 ② `sub`: "3m 75cm − 1m 40cm" — 앞 m > 뒤 m, 앞 cm > 뒤 cm ③ `word`: `fact`에 이야기 한 줄("리본 1m 30cm에 2m 40cm를 이어요", "끈 3m 60cm에서 1m 20cm를 잘라요") + 질문 「모두 몇 m 몇 cm예요?」·「남은 끈은 몇 m 몇 cm?」. 보기(세 문제 같음): 정답 / `forget-m`(cm만 계산하고 m는 앞 길이 그대로) / `m-slip`(m ±1 **그리고** cm ±10) — 정답과 m만 같은 보기·cm만 같은 보기가 함께 나오지 않아 많이 나온 숫자로 찍을 수 없음. cm ±10은 1~99 안쪽 방향(90 이상이면 −10, 10 미만이면 +10), m ±1도 1~9 안쪽 | |
| 5관 길이 어림하기 | 1m 감, 알맞은 단위, 가까운 어림 | ① `unit-pick`: 물건 표(§5)에서 하나 "연필의 길이로 알맞은 것은?" (표의 보기 3개) ② `body-ruler`: `fact` 「양팔을 벌린 길이는 약 1m예요」 + 그림 양팔 🙆 n개 + "양팔로 n번 잰 길이는?" n 2~5 (약 nm / 약 n0cm `unit-swap` / 약 (n±1)m `count-off`) ③ `closest`: `fact` 「실제 길이는 2m 10cm예요」 + `tape({ zoom: false, pins })`에 ⭐(실제)·🐰·🐻·🦊 깃발 + "누가 더 가깝게 어림했나요?" (보기 `🐰 토끼`·`🐻 곰`·`🦊 여우`, 고정 순서) — 실제·어림 모두 10cm 단위 120~280cm, 어림은 「약 1m 90cm」처럼 `약`을 붙여 표시, 차이 셋이 서로 다르고 가장 가까운 차이 ≤ 20cm, 다음 차이 ≥ 가장 가까운 차이 + 20cm | |
| 6관 🎀 리본 가게 | 길이를 만들기 | 손님 주문 "리본 1m 40cm 주세요"(자동 읽기) → `ribbon` 위에서 `[＋ 1m]`·`[＋ 10cm]`·`[↩ 한 번 되돌리기]`로 늘리기 → `[✂️ 자르기]` → 같으면 칭찬·🎀 쌓기, 다르면 "주문보다 20cm 길어요"·"주문보다 1m 10cm 짧아요"(차이를 말해 줌, 자동 읽기) 안내 후 계속 고치기. 주문은 **10cm 단위** 30~390cm, `m + 십의 자리 ≤ 8`(누르는 횟수 8번 + 자르기 1번), 끝없는 새 손님, 6명마다 🍬. 되돌리기는 실제로 바뀐 누름만 쌓은 스택에서 직전 하나를 뺀다(빈 스택이면 꺼짐). 400을 넘는 누름은 바뀌지 않고 쌓이지 않는다 | |
| 7관 🎯 길이 빙고 | 섞어 풀기 | 답 5종(`m-n`·`cm-to-m`·`m-to-cm`·`add`·`sub`)을 섞은 9문제, **답 9개가 글자도 값(cm)도 서로 다름**(「3m」와 「300cm」가 한 판에 같이 나오지 않음), 답 글자 7자 이하, 끝없는 새 판 | |
| 퀴즈 배틀 | 단원 정리 | 노션 CURRICULUM_DB `학년=2-2 · 단원 "3. 길이 재기"` 탐구퀴즈 12제 | |

- 🪜 계단 카드(2-1 길이 재기, 화면 없음이라 카드가 곧 계단):
  - 1관 「1cm」: "1cm가 5번이면 5cm예요." 질문 "1cm가 7번이면 몇 cm?" (7cm / 70cm / 1cm).
  - 2관 「자로 재기」: "물건 한쪽 끝을 0에 맞추고, 다른 끝의 눈금을 읽어요." 질문 "0에서 시작해 8에서 끝나면 몇 cm?" (8cm / 80cm / 9cm).
- 계단 이동 칩: `⬆ 3학년 길이와 시간`(length_time.html) 하나. 아래 칩은 두지 않는다(2-1 길이 화면 없음).
- 1관 ① 문제 상자 안 버튼은 `[＋ 10cm]` 하나(합쳐지면 사라짐) + 보기 3개(합쳐진 뒤에만 보임). 6관은 버튼 4개.
- **오개념** (힌트 20자 안팎, 자동 읽기): `count-only`(막대 개수만 셈), `count-off`(하나 더·덜 셈), `zero-drop`(0을 빠뜨림), `unit-ignore`(단위를 바꾸지 않음), `tick-off`(10cm 눈금 하나 잘못 읽음), `m-ignore`(m 부분을 빼먹음), `split-wrong`(137 → 13m 7cm), `zero-shift`(2m 8cm ↔ 280cm·2m 80cm), `m-as-ten`(2m 8cm → 28cm), `swap-digits`, `compare-digits`(숫자 모양만 보고 비교), `reverse`, `equal`(같지 않은데 같다고 함), `not-equal`(같은 길이인데 다르다고 함), `forget-m`(cm만 계산), `m-slip`(m끼리·cm끼리 다시 계산), `unit-swap`(cm ↔ m), `scale-off`(10배·1/10), `far-guess`(가깝지 않은 어림), `off-by-one`·`off-by-ten`(채움용).

## 5. 순수 계산 모듈 `LengthMCore` (`js/length_m-core.js`, DOM 없음, 시험 대상)

- 상수 `MIN = 1`, `MAX = 999`. `randInt(a, b, rng)`.
- `split(cm)` → `{ m, cm }`, `toCm(m, c)`, `fmt(cm)`, `sayLen(cm)`(`1미터 25센티미터`·`2미터`·`45센티미터`), `speakText(text)`(§3 소리 규칙), `fmtSplitWrong(cm)`(137 → `13m 7cm`: 앞 두 자리를 m로, 일의 자리 ≠ 0인 길이에만).
- `makeProblem(kind, rng)` → `{ kind, question, fact, speak, answerText, answerValue, …종류별 값 }`. `answerText`는 화면 글(`137cm`, `1m 37cm`, `>`, `🐰 토끼`), `answerValue`는 cm 정수(비교·어림 `closest`는 null). `speak`이 없으면 화면은 `speakText(question)`을 읽는다.
  - 종류별 값: `ten-sticks {start}` · `m-is-cm {}` · `m-n {n}` · `tape-cm|tape-mcm|tape-zero {len, max}`(max = len보다 큰 가장 작은 100의 배수, 최소 200) · `cm-to-m {len}` · `m-to-cm {len}` · `compare {a, b, aText, bText, type: 'trap'|'cm-longer'|'equal'}`(a가 왼쪽) · `add|sub {a, b}` · `word {a, b, op: '+'|'-', story}` · `unit-pick {item}` · `body-ruler {n}` · `closest {real, guesses: [{ who, name, emoji, len }]}`(차례 🐰·🐻·🦊 고정).
- 5관 `unit-pick` 물건 표 — 보기는 표에 적힌 그대로(1~999 거름·채움 대상 아님):

  | 물건 | 정답 | 오답 (`unit-swap` / `scale-off`) |
  | :--- | :--- | :--- |
  | 연필 | 15cm | 15m / 1m 50cm |
  | 숟가락 | 20cm | 20m / 2m |
  | 지우개 | 5cm | 5m / 50cm |
  | 우산 | 80cm | 80m / 8cm |
  | 실내화 | 20cm | 20m / 2cm |
  | 교실 문 높이 | 2m | 2cm / 20cm |
  | 침대 긴 쪽 | 2m | 2cm / 20m |
  | 줄넘기 줄 | 2m | 2cm / 20cm |
  | 칠판 긴 쪽 | 4m | 4cm / 40cm |
  | 교실 긴 쪽 | 8m | 8cm / 80cm |

  질문 「연필의 길이로 알맞은 것은?」(조사는 물건 이름 받침에 맞춤: `MathExplorer.josa`와 같은 규칙을 계산 모듈 안에 작게 둠).
- `wrongChoices(p)` → `[{ value, text, mistake }]` 정확히 2개, 정답·서로와 **글자도 값도** 다름(정답과 같은 값의 다른 표기 금지, 예: 정답 3m 55cm일 때 355cm), `value`(cm) 범위 1~999(`split-wrong`·`unit-pick` 예외), 부족하면 ±10cm·±1cm(`off-by-ten`/`off-by-one`)로 채움. 비교 보기: 정답이 아닌 둘 — `trap`이면 함정 쪽 답에 `compare-digits`·나머지 `equal`, `cm-longer`면 `reverse`·`equal`, `equal`이면 둘 다 `not-equal`. 어림 `closest`는 나머지 두 동물(`far-guess`, value null).
- `LAB_KINDS`: 1관 `ten-sticks, m-is-cm, m-n` · 2관 `tape-cm, tape-mcm, tape-zero` · 3관 `cm-to-m, m-to-cm, compare` · 4관 `add, sub, word` · 5관 `unit-pick, body-ruler, closest`. `makeRound(lab, rng)`(한 판 3문제, 같은 문제 중복 없음).
- `BINGO_KINDS` = `m-n, cm-to-m, m-to-cm, add, sub`, `makeBingo(rng)` → 문제 9개(`answerText`도 `answerValue`도 서로 다름·답 글자 7자 이하, 각 문제에 `call`(화면 글, 「2m 7cm는 몇 cm?」·「1m 20cm + 2m 35cm」)과 `speak`(읽는 글)).
- `makeRibbon(rng)` → `{ target, text, speak }`(10cm 단위 30~390, m+십 ≤ 8, `text` 「리본 1m 40cm 주세요」). `ribbonPress(cur, btn)`(`'m'`·`'t'` → +100·+10, 400 넘으면 cur 그대로). `ribbonFeedback(cur, target)` → `{ ok, diff, text, speak }`(「주문보다 20cm 길어요」·「주문보다 1m 10cm 짧아요」 — 차이는 `fmt`).

## 6. 파일 계획

| 파일 | 내용 | 예상 줄 | 초안 |
| :--- | :--- | ---: | :--- |
| `kids/subjects/math/js/length_m-core.js` | `LengthMCore` 순수 계산 | ~450 | 하이드로젠 medium |
| `kids/subjects/math/js/length_m-draw.js` | `LengthDraw` 막대·줄자·깃발·리본 그림 | ~300 | 네온 medium |
| `kids/subjects/math/js/length_m-labs.js` | 관 1~7 + `mount` | ~500 | 네온 medium |
| `kids/css/math_length_m.css` | 테마·막대·줄자·돋보기·깃발·리본·길이 표·안내표 | ~220 | 네온 medium (그리기와 함께) |
| `kids/subjects/math/length_m.html` | 감싸개(`number_four.html`과 같은 모양) | ~75 | 하이드로젠 medium |
| `scripts/data/curriculum/math_2-2_3.json` | 퀴즈 12제 | - | 하이드로젠 medium |
| `tests/math-length-m.test.mjs` | 계산 seed 300·`zoomRange`·화면 파일·퀴즈 자료 | ~240 | Claude |
| `math.html` | 2학년 칸·측정 칸에 카드 | +6 (598줄 이하 유지) | Claude |
| `docs/math_spec.md`, `CORE_CATALOG.md` | 절 추가 | | Claude |

- 노션 학년 선택지 `2-2`는 있다(2026-11-26 생김). 퀴즈 등록은 사용자 승인 뒤 `register_curriculum.py`로.
- 작업 등급 L1(화면), 퀴즈 자료 L0. 공용 부품은 고치지 않는다.

## 7. 검증

- 계산 모듈 seed 300개: 길이 범위 1~999·오답 2개가 정답·서로와 글자도 값도 다름·`split-wrong`·`unit-pick` 말고 999 초과 보기 없음·`13m 0cm` 같은 글 없음·한 판 중복 없음·`fmt`/`sayLen`/`speakText` 표본(45 → `45cm`/`45센티미터`, 200 → `2m`/`2미터`, 207 → `2m 7cm`/`2미터 7센티미터`, 「1m 20cm + 2m 35cm」 → 「1미터 20센티미터 더하기 2미터 35센티미터」, 「몇 m 몇 cm예요?」 → 「몇 미터 몇 센티미터예요?」)·`add` cm 합 ≤ 99·`sub` 받아내림 없음·4관 보기에서 정답과 m만 같은 보기와 cm만 같은 보기가 함께 나오지 않음·`compare` 세 갈래가 다 나옴·`closest` 차이 규칙·`question` 25자 이하·빙고 답 9개 글자·값 다름·리본 주문 누르는 횟수 ≤ 8·`zoomRange`가 0~max 안·30cm 폭.
- 쓰기 차단 서버 360·375px에서 7개 관 자동 완주(오답 먼저 고르기 포함) 오류 0건·가로 넘침 없음, 1관 합쳐지는 장면 뒤 입력 잠금 풀림, 줄자 돋보기 숫자가 읽히는지 사진으로.
- 퀴즈 자료: 정답 검산, 길이 범위, 받아올림 없음.

## 8. 범위 밖

- 받아올림·받아내림 있는 길이 계산(3학년), mm·km(3학년 `length_time.html`), 2-1 cm 단원 화면(계단 카드로 대신), 단원 동화, 「오늘의 길」 연결.

## 9. 설계 검토 기록 (2026-11-26)

카본(medium)·네온(medium)에게 같은 초안을 동시에 보냄(아이 이름 가림). 둘 다 14건, 겹친 지적이 많음. 28건 중 27건 반영.
- 반영: 빙고에서 같은 길이의 다른 표기(3m·300cm)가 한 판에 나오는 문제(값도 서로 다르게), 리본 1cm가 줄자에서 안 보임(10cm 단위 주문·지금 길이 숫자·되돌리기 스택 정의), `unit-pick` 오답이 999 제한·채움 규칙과 충돌(물건 표에 보기를 손으로 고정), 1관 1000cm 오답(범위 밖 → 90cm·1cm), 4관 많이 나온 숫자로 찍는 틈(`m-slip` 오답)·0m 항·`off-by-ten` 경계, 보기 모양으로 찍는 틈(`m-n` 오답 (n±1)00cm, `tick-off` ±10 무작위, `body-ruler` 약 (n±1)m), 비교 함정이 한쪽으로 쏠림·「같음」 비율·`not-equal`, `cm-to-m` 10의 배수와 수십 m 오답(111~299·일의 자리 ≠ 0), 2관 계단 카드 설명과 질문 불일치(0에서 시작), 막대 글자(안에는 `10`만·범례·합계), 돋보기 5cm 중간 눈금·좌우 여백·`tape-mcm` 하한 111, 3관 두 자리 cm 오답을 `swap-digits`로(줄자 없는 곳에 `tick-off` 힌트 금지), 그림 높이 130px 이내·폭 100%, TTS 기호·단독 단위·횟수·동물 이모지·조사(`speakText`), 질문 25자(전제는 `fact`로), `closest` 어림값 10cm 단위와 `약`·줄자 깃발 그림(받아내림 암산 없이 비교), 줄자 `max` 표기 통일(200·300).
- 반영 안 함: 2관·4관 세로 넘침 걱정은 그림 높이 130px 제한으로 대신하고 화면 사진으로 확인(따로 규칙을 더 두지 않음).
