# 🌉 1학년 → 2-1 다리: 100까지의 수 탐험관·10 만들기 빙고 설계 명세 (math_1_bridge_spec.md)

> 상태: **구현 완료 (2026-11-24, A·B 2920c63c · C a9440348 · D 다음 커밋)** · 카본(high)·네온(high) 설계 검토 반영(§8). 초안: 계산 모듈·10 빙고 하이드로젠 medium, 화면 네온 medium → Claude 시험·화면 확인. 화면 확인 때 고친 것: 1 작은 수 오답 힌트 방향(「작아지는 쪽으로」), 4관 작은 모형 크기(9묶음도 한 줄), 개념 퀴즈가 숨은 탭에서 질문을 읽던 것, 퀴즈 버튼 56px, 읽는 말 조사(「9 더하기 3, 얼마예요?」). 탭 이름은 `🎲 10 빙고`(개념 퀴즈 🎯와 구분). · 사용자 결정: 겨울방학 1학년 점검 뒤 「1순위 A」(100까지의 수를 2-1과 같은 탐험관 틀로, 덧셈·뺄셈 개념에 10 만들기 빙고).
> 앞선 작업: [`math_2-1_ladder_spec.md`](math_2-1_ladder_spec.md) — §3-0(민서에게 맞추기)·§3-3(놀이 층)을 그대로 따른다. 공용 부품 목록은 [`CORE_CATALOG.md`](../kids/core/CORE_CATALOG.md) 「수학 탐험관 공용 놀이·저학년 부품」·「2-1 세 자리 수·덧셈과 뺄셈 탐험관」.

## 1. 왜 고치나

민서(초1)는 2027년 3월에 2학년이 되고, 3월 첫 단원은 2-1 탐험관 `number_three.html`(세 자리 수)·`add_sub_two.html`(덧셈과 뺄셈)이다. 겨울방학에는 1학년 수학으로 흥미를 붙이고, 3월에 2-1을 만나면 **"아는 놀이에서 자리만 늘어났네"** 하고 느끼게 하는 것이 목표다. 새 단원은 만들지 않는다.

2026-11-24 점검(쓰기 차단 서버, 375px, 민서로 직접 조작)에서 1학년 화면은 다음과 같았다.

| 화면 | 문제 |
| :--- | :--- |
| `number100.html` | 한 페이지에 장난감 5개(높이 4,494px), 질문 자동 읽기 없음, 버튼 42px, 틀린 부등호가 「23 > 61」로 남음, 맞힐 때마다 보상(상한 없음), 조사 오류(「23와」「23는」), 짝짓기 패널 가로 10px 넘침, 위아래 배치라 `<` 기호 뜻이 헷갈림 |
| `addition_concept.html` · `subtraction_concept.html` | 10 만들기 애니메이션은 좋음(2-1 덧셈 1관 계단 카드와 같은 말). 개념 퀴즈는 질문을 읽지 않고, 틀린 보기가 꺼지지 않으며, 보기 4개 46px, 퀴즈에 구슬판이 없는데 힌트가 "구슬판에서 10을 살펴봐요", 맞힐 때마다 보상 |

```
1학년  number50 ── number100 (이번: 탐험관 틀로)      addition/subtraction_concept (이번: 🎯 10 빙고·퀴즈 다듬기)
           │  10개씩 묶음·낱개 = BaseTenDraw 두 줄         │  10 만들기·10에서 빼기
           ▼  🎯 수 빙고·🔍 스무고개(두 자리)              ▼  🎯 빙고
2-1    number_three (같은 틀 + 백 줄이 생김)         add_sub_two (같은 틀, 1·3관 계단 카드가 1학년 말)
```

## 2. 공통 원칙

- 2-1 명세 §3-0을 그대로 따른다: 질문 자동 읽기(수를 읽는 법을 묻는 문제는 수를 소리 내지 않음), 오답 힌트도 읽기(20자 안팎), 한 문제 누르기 10번 이내, 문제 상자 안 동시 활성 버튼 4개 이하, 버튼 56px 이상, 지난번 관 기억, `[다음 관 ▶]`, 더 풀기 **6문제마다 🍬1·하루 3개**, 첫 판 완주는 틀이 주는 보상.
- §3-3을 따른다: 한 관에 장난감 하나, 꾸밈만 얹지 않는다. 🫧 말랑 버튼·📮 건의함은 틀 옵션 그대로.
- **1학년 말로 쓴다**: 1학년 교과서는 「십의 자리」 대신 **「10개씩 묶음」·「낱개」**를 쓴다. 화면 글자·힌트·스무고개 칩 모두 이 말로 쓰고, 2-1 탐험관에서 같은 모형이 「십 모형·십의 자리」로 이름만 바뀐다. (예: 1학년 「10개씩 묶음이 5개보다 많아요?」 → 2학년 「십의 자리가 5보다 커요?」)
- 노션 쓰기 없음. 1학년 탐험관에는 노션 퀴즈 배틀 탭을 두지 않는다(노션에 1학년 수학 탐구퀴즈가 없음, 만들면 L3라 이번 범위 밖).
- 학습일지 키 `g:n100-<종류>`(100까지의 수, 지금 화면의 비교 기록 `g:n100-compare-*`과 같은 접두라 기록이 이어짐), `g:cpa-bingo-<종류>`(10 빙고). 기존 개념 퀴즈 키 `g:cpa-make10`·`g:cpa-add-1x1`·`g:cpa-add-1x1-carry`·`g:cpa-sub-10`·`g:cpa-sub-teen`·`g:cpa-sub-teen-borrow`는 그대로 둔다(기록 이어짐).

## 3. ① 100까지의 수 탐험관 (`number100.html`, key `n100`)

틀 `MathExplorer.mount({ key: 'n100', rememberTab: true, wishBox: true, labs })`, 퀴즈 탭 없음. 테마 `mx-theme-n100`(딸기우유·민트), `body`에 `mx-grade1`(공용 CSS의 `mx-grade2` 저학년 규칙과 같은 큰 글자·56px). 머리 링크 `⬇ 1학년 50까지의 수`(`number50.html`) · `⬆ 2학년 세 자리 수`(`number_three.html`).

**수의 범위**: 문제의 수는 10~99(두 자리). 오답 보기는 1~99(한 자리 오답 `6` 같은 `place-ignore`는 허용). 100 이상은 오답에도 내지 않는다 — 100은 2-1 1관에서 처음 만든다.

| 관 | 배우는 것 | 활동 (문제 3개 순서, 종류 이름) | 🪜 |
| :--- | :--- | :--- | :---: |
| 1관 📦 묶음과 낱개 | 10개씩 묶음 n개와 낱개 m개 = nm | ① `tens-make`: 빈 판에서 `[＋ 10개씩 묶음]`으로 n개(3~6) → "얼마예요?"(n0 / n / n0±10 중) ② `listen-build`: "삼십이"를 들려줌(`[🔊 다시 듣기]` 있음) → `[＋ 10개씩 묶음]`·`[＋ 낱개]`로 만들기(묶음 2~4, 낱개 1~3 → 누르기 최대 7번) → 숫자 고르기(32 / 23 / 33) — 만든 모형과 숫자를 잇는 단계라 남긴다(2-1 3관과 같음) ③ `count-picture`: 모형 그림만(묶음 1~9, 낱개 1~9) → "모두 얼마예요?"(52 / 25 / 53) | ✓ |
| 2관 🗣️ 두 가지로 읽기 | 오십이·쉰둘, 몇십(예순·일흔·여든·아흔) | ① `read-sino`: 수가 보임 → "이 수를 어떻게 읽어요?"(수 소리 없음) 오십이 / 오이 / 이십오 ② `read-native`: 수가 보임 → "하나, 둘로 세는 말로 읽으면?"(수 소리 없음, 섞여 나와도 뜻이 통하게) 쉰둘 / 다섯둘 / 예순둘 ③ `listen-native`: "여든둘"을 들려줌 → 82 / 28 / 92 | ✓ |
| 3관 🦘 수의 순서 | 1 큰 수·1 작은 수·사이의 수 | ① `next-1`: "39보다 1 큰 수는?" ② `prev-1`: "40보다 1 작은 수는?" ③ `between`: 수 띠 `57 □ 59` → "□에 알맞은 수는?" — ①②는 절반이 묶음 경계(x9→(x+1)0, x0→(x−1)9) | |
| 4관 ⚖️ 크기 비교 | 묶음 수부터 비교 | **두 수를 좌우로 나란히**: 왼쪽 카드(수 + 작은 모형) ○ 오른쪽 카드 — 보기의 「왼쪽·오른쪽」과 방향이 같다(작은 모형은 `.n100-cmp .bt-board { zoom: .62 }`). 보기 3개 고정 순서 `> 왼쪽이 커요`·`< 오른쪽이 커요`·`= 같아요`(2-1과 같음). ① `compare-diff-tens` ② `compare-same-tens`(4번에 1번은 같은 수 → 정답 `=`) ③ `compare-trap`(묶음은 적은데 낱개가 큰 쌍: 38 ○ 41) | |
| 5관 🍡 짝수와 홀수 | 둘씩 짝 지어 남는지 (③ 앞에 안내 「10개씩 묶음은 늘 짝이 맞아요. 낱개만 봐요」) | ① `pair-candies`: 사탕 n개(6~12) → `[👫 둘씩 짝 짓기]` 한 번 → 짝이 지어지고 남은 하나가 반짝 → "짝수예요, 홀수예요?" 보기 2개 고정 `짝수`·`홀수` ② `pair-candies`(13~20) ③ `which-even`: 두 자리 수 3개 중 하나 고르기 — 절반은 「짝수는 어느 것?」(짝수 1·홀수 2), 절반은 「홀수는 어느 것?」(홀수 1·짝수 2). 필드 `target: 'even'|'odd'` | |
| 6관 🎯 수 빙고 | 섞어 풀기 | §3-3-2 `MathBingo` 그대로. 9문제 답이 서로 다름(10~99). 문제 글(`call`)은 4종: `call-bundle`(「10개씩 묶음 4개와 낱개 7개」) · `call-sino`(「오십팔」) · `call-native`(「예순둘」) · `call-next`(「39보다 1 큰 수」, 답 11~99). 빙고는 **들은 수를 판에서 찾는 놀이**라 `call`을 그대로 읽어 준다(수 읽는 법을 묻는 문제가 아님). 보이는 글과 읽는 말이 같으므로 `speak` 필드는 두지 않는다 | |
| 7관 🔍 수 스무고개 | 크기·묶음·낱개 추론 | 공용 `NumberTwenty`를 두 자리 설정으로(§3-3). 앱이 10~99 중 하나를 정함 | |

- 🪜 계단 카드(1학년 1학기 50까지의 수, `number50.html`과 같은 말): 1관 「10개씩 묶음 2개와 낱개 3개는 23이에요.」(문제: 묶음 3개와 낱개 4개는? 34 / 43 / 7) · 2관 「23은 이십삼, 스물셋이라고 읽어요.」(문제: 30을 다르게 읽으면? 서른 / 셋 / 마흔). 버튼 글자 `🪜 50까지의 수 다시 보기`.
- **오개념과 힌트**(20자 안팎, 자동 읽기). 2관 수 읽기 문제의 힌트는 수·정답 낱말을 소리 내지 않는 말로 쓴다:
  | 이름 | 예 | 힌트 |
  | :--- | :--- | :--- |
  | `place-ignore` | 60 → 6 | 묶음 하나는 10이에요 |
  | `swap-digits` | 63 → 36 | 묶음 수를 먼저 써요 |
  | `off-by-one` | 63 → 64 | 낱개를 다시 세어 봐요 |
  | `off-by-ten` | 60 → 70 | 묶음을 다시 세어 봐요 |
  | `read-digits` | 52 → 오이 | 묶음 숫자 뒤에 십을 붙여요 |
  | `read-one-prefix` | 15 → 일십오 | 묶음 1개는 '일'을 빼요 |
  | `native-digit` | 52 → 다섯둘, 15 → 하나다섯 | 묶음은 다른 이름으로 읽어요 |
  | `native-neighbor` | 52 → 예순둘 | 묶음 수를 다시 봐요 |
  | `read-zero` | 60 → 육십영 | 낱개 0은 읽지 않아요 |
  | `off-by-one`(3관 사이의 수) | 57 □ 59에서 57 | 두 수 사이를 봐요 |
  | `wrong-step` | 39+1 → 49 | 1만 커져요 |
  | `wrong-direction` | 39+1 → 38 | 커지는 쪽으로 세어요 |
  | `boundary` | 39+1 → 310 | 낱개가 10개면 묶음이 돼요 |
  | `compare-ones-first` | 38 ○ 41에서 `>` | 묶음 수부터 비교해요 |
  | `compare-ones` | 42 ○ 47에서 `>` | 묶음이 같으면 낱개를 봐요 |
  | `reverse` | 52 ○ 45에서 `<` | 어느 쪽이 큰지 다시 봐요 |
  | `equal` · `not-equal` | `=`를 고름 · 같은 수인데 `>`·`<` | 두 수가 같지 않아요 · 두 수가 똑같아요 |
  | `even-odd-swap` | 사탕 문제 | 남는 사탕이 있는지 봐요 |
  | `last-digit` | `which-even` | 낱개가 0·2·4·6·8이면 짝수예요 |
- 4관 비교 오답 이름: `compare-diff-tens` 반대 기호 = `reverse`, `compare-same-tens` 반대 기호 = `compare-ones`, `compare-trap` 반대 기호 = `compare-ones-first`, `=` = `equal`. 같은 수(정답 `=`)면 `>`·`<` 둘 다 `not-equal`.
- 세 자리 수(`310` 같은 `boundary`)는 내지 않으므로 `boundary`는 이름만 남기고 쓰지 않는다. 경계 문제의 오답은 `wrong-step`(±10)·`wrong-direction`(반대로 1) 중 1~99 안의 것.
- **범위·겹침 대체 규칙**(계산 모듈이 지킴): 오답이 1~99 밖이거나 정답·다른 오답과 같으면 다음 차례로 바꾼다 — 숫자 답: `swap-digits` → `off-by-ten`(±10) → `off-by-one`(±1). 예: 55·60(뒤집으면 같거나 6)은 `off-by-ten`. 읽기 답: `read-digits`(일의 0이면 못 만듦) → `read-zero`(일의 0일 때) → `read-one-prefix`(십의 1일 때) → `swap-digits`의 읽기. 순우리말: `native-digit` → `native-neighbor`(±10, 10~99 안).
- 3관 범위: `next-1` 시작 10~98(경계면 19·29…89), `prev-1` 시작 11~99(경계면 20·30…90), `between` 답 11~98.

### 3-1. 순수 계산 모듈 `HundredCore` (`kids/subjects/math/js/number100-core.js`, DOM 없음, 시험 대상)

- 읽기: `readSino(n)`(10~99: 10 십, 15 십오, 52 오십이, 60 육십 — 십의 자리 1은 "일"을 붙이지 않고 일의 자리 0은 읽지 않음), `readNative(n)`(10~99: 열·스물·서른·마흔·쉰·예순·일흔·여든·아흔 + 하나·둘·셋·넷·다섯·여섯·일곱·여덟·아홉, 52 쉰둘, 60 예순), `digits(n)` → `{ t, o }`.
- 문제: `LAB_KINDS`(관 1~5 → 종류 3개 배열, 위 표 순서: `{1:['tens-make','listen-build','count-picture'], 2:['read-sino','read-native','listen-native'], 3:['next-1','prev-1','between'], 4:['compare-diff-tens','compare-same-tens','compare-trap'], 5:['pair-candies','pair-candies-big','which-even']}`), `makeProblem(kind, rng)`, `wrongChoices(p)` → 오답 `{ value, text, mistake }` 2개(사탕 2종은 1개: 반대 말 `even-odd-swap`), `makeRound(lab, rng)`(3문제, 종류 순서 그대로), `makeBingo(rng)`(답이 서로 다른 9문제, `call` 포함). 섞어 풀기(`makeMixedRound`)는 부르는 곳이 없어 두지 않는다.
- **문제 객체 필드**(문제는 데이터만, 보기·오개념은 모두 `wrongChoices`가 만든다): 모든 종류 `{ kind, answerText(문자열) }` +
  - `tens-make` `{ t(3~6), o: 0, n }` · `listen-build` `{ t(2~4), o(1~3), n, reading: readSino(n) }` · `count-picture` `{ t(1~9), o(1~9), n }`
  - `read-sino` `{ n }`(answerText = readSino) · `read-native` `{ n }`(= readNative) · `listen-native` `{ n, reading: readNative(n) }`(answerText = 숫자)
  - `next-1` `{ start, step: 1, n }` · `prev-1` `{ start, step: -1, n }` · `between` `{ a: n−1, b: n+1, n }`
  - `compare-*` `{ a, b }`(answerText `>`·`<`·`=`)
  - `pair-candies` `{ count(6~12) }` · `pair-candies-big` `{ count(13~20) }`(answerText `짝수`·`홀수`) · `which-even` `{ target: 'even'|'odd', n }`(오답 2개가 반대 홀짝의 두 자리 수, mistake `last-digit`)
  - 빙고 문제 `{ kind: 'call-bundle'|'call-sino'|'call-native'|'call-next', n, answerText, call }`, `call`은 25자 이내이고 답 숫자를 글자로 포함하지 않는다.
- 스무고개(`NumberTwenty`가 부르는 계약, `ThreeDigitCore`와 같은 이름): `makeSecret(rng)`(10~99), `chipList()`, `chipText(id)`, `chipAnswer(n, id)`, `candidates(asked)`(10~99 중 남은 수). 칩 ID: `gt:15`·`gt:25`…`gt:85`(「35보다 커요?」 — 몇십이 아닌 수라 `tg:`와 겹치지 않고 크기 비교 연습이 됨), `t:1`~`t:9`(「10개씩 묶음이 5개예요?」), `tg:1`~`tg:8`(「10개씩 묶음이 5개보다 많아요?」), `o:0`~`o:9`(「낱개가 3개예요?」·0은 「낱개가 없어요?」), `og:1`~`og:8`(「낱개가 4개보다 많아요?」, `og:0`은 `o:0`과 뜻이 겹쳐 뺌), `even`(「짝수예요?」).
- 제약: 문제의 수 10~99, 숫자 오답 1~99(위 대체 규칙), 오답끼리·정답과 겹치지 않음, 200번 안에 못 뽑으면 종류별 고정 예시. `rng`는 `() => [0,1)`.
- `listen-build`의 누르기: 묶음 2~4 + 낱개 1~3 + 답 1 ≤ 8.

### 3-2. 화면 `HundredLabs` (`kids/subjects/math/js/number100-labs.js`)

`number_three-labs.js`와 같은 모양(`makeLab`, `askWrap`, `MathDrill.rounds`/`ask`/`algo`/`why`/`expr`, `perReward: 6`, `nextButton: true`, `ladderLabel`). 차이:
- 1관 모형: `BaseTenDraw.model({ h: 0, t, o })` + `placeControls({ places: ['t','o'], names: { t: '10개씩 묶음', o: '낱개' } })`(§3-4). 백 줄은 1학년 CSS가 늘 숨긴다(`body.mx-grade1 .bt-row-h { display: none; }`, 1학년 화면에는 백 모형이 없음).
- 4관 그림: 좌우 카드 `.n100-cmp`(가로 2칸) 안에 수(2rem)와 `BaseTenDraw.picture(n)`(1학년 CSS가 `zoom: .62`).
- 5관 사탕: 새 그리기(이 파일 안, 작은 함수). 사탕 🍬 n개를 5개씩 줄로 → `[👫 둘씩 짝 짓기]` 누르면 두 개씩 묶음 테두리가 생기고(0.6초, 움직임 줄이기면 바로) 남은 하나는 노랗게 반짝 → 짝수/홀수 보기(`order: ['짝수','홀수']`, 고정). 버튼은 한 번 누르면 꺼진다.
- 6관 `MathBingo.render(area, ctx, { makeBingo: HundredCore.makeBingo, prefix: 'n100', counterKey: 'n100', perReward: 6 })`.
- 7관 `NumberTwenty.makeLab({ ... 두 자리 설정 })`(§3-3).

### 3-3. 스무고개 공용화 (`number_three-twenty.js`)

지금은 `ThreeDigitCore`·100~999·`TOTAL_CANDS = 900`·백·십·일 묶음·학습일지 `num3`이 고정이다. **`NumberTwenty.makeLab(cfg)`**를 더하고 기존 `NumberTwenty.lab`은 `makeLab()`(세 자리 기본값)으로 만든다(2-1 화면은 그대로).

```js
NumberTwenty.makeLab({
  core: HundredCore,            // makeSecret·chipList·chipText·chipAnswer·candidates
  key: 'n100',                // 학습일지 g:n100-twenty, 더 풀기 셈 math_n100_drill_…
  total: 90,                    // 남은 수 막대의 전체
  title: '7관 🔍 수 스무고개',
  guide: '내가 생각한 두 자리 수를 질문으로 맞혀 봐요!',
  categories: [                 // 묶음 버튼(라벨·칩 앞글자·자리 나누는 수)
    { id: 'size', label: '📏 크기', prefix: 'gt:' },
    { id: 't', label: '📦 10개씩 묶음', name: '10개씩 묶음', unit: '개', prefix: 't:', cmp: 'tg:', div: 10 },
    { id: 'o', label: '🍬 낱개', name: '낱개', unit: '개', prefix: 'o:', cmp: 'og:', div: 1 },
    { id: 'even', label: '짝수?', prefix: 'even' }
  ]
})
```
- `pickChips`·`digitsLeft`는 지금처럼 순수 함수로 두되 `categories`·`core`를 인자로 받을 수 있게(기본값 = 지금 값). 남은 숫자 줄 글자는 묶음의 `name`·`unit`을 쓴다(1학년 `{ name: '10개씩 묶음', unit: '개' }` → 「10개씩 묶음은 5 · 6 · 7개 중 하나」, 조사는 `MathExplorer.josa`). 맞히기는 지금처럼 후보 중 숫자 보기 3개(입력 없음)라 자릿수 설정은 필요 없다.
- 기존 시험 `tests/math-twenty.test.mjs`가 그대로 통과해야 한다.

### 3-4. 수 모형 이름 옵션 (`base_ten-draw.js`)

`placeControls(ui, { …, names })` — `names = { t: '10개씩 묶음', o: '낱개' }`를 주면 버튼 글자 `＋ 10개씩 묶음`·`＋ 낱개`, 안내 「10개씩 묶음은 다 놓았어요」·「낱개는 0개라 놓지 않아요」. 주지 않으면 지금 글자 그대로(`＋ 십`, 「십 모형은 다 놓았어요」). `planPress(state, place, target, names)`도 같은 선택 인자.

### 3-5. 옮기는 것과 버리는 것

- 버림: 인라인 스크립트 330줄과 화면 내 `style` 속성. 기억 카드(육십-예순 뒤집기, 한 번에 카드 16장 = 장난감 과다)와 100칸 배열판 뛰어 세기(버튼 100개)는 2관 읽기·3관 순서·7관 스무고개로 대신한다.
- 짝수·홀수 바구니는 5관으로 옮긴다(누르기 횟수를 버튼 하나로 줄임).
- 학습일지: 지금 화면의 비교 키 `g:n100-compare-diff-tens`·`g:n100-compare-same-tens`를 4관이 그대로 잇는다(같은 수 쌍은 `compare-same-tens` 종류 안에서 나오므로 `g:n100-compare-equal`은 더 쌓이지 않는다). 시험 `tests/learning-log-math.test.mjs`의 100까지의 수 절은 새 화면에 맞게 바꾼다.

## 4. ② 덧셈·뺄셈 개념 화면 다듬기 (`addition_concept.html` · `subtraction_concept.html`)

화면 구조(탭·구슬판 애니메이션·기차)는 그대로 두고 두 가지만 바꾼다.

### 4-1. 🎯 10 빙고 탭 (새 파일 `kids/subjects/math/js/arithmetic_bingo.js`, `ArithmeticBingo`)

- 탭 `🎯 10 빙고`를 `🎯 개념 퀴즈` 앞에 더한다(덧셈·뺄셈 모두).
- 문제 만들기(순수 함수, 시험 대상) `makeBingo(op, rng)` → 9문제, 답 서로 다름:
  - 덧셈: `make10`(「8 + □ = 10」, 답 1~9) · `add-cross`(「8 + 5」 받아올림, 두 수 2~9, 답 11~18). 9칸 중 `make10` 4~5개.
  - 뺄셈: `sub10`(「10 − 3」, 답 1~9) · `sub-teen`(「13 − 5」 받아내림, 처음 수 11~18, 답 2~9). 답 1~9가 한 번씩이고 `sub10`이 4~5개(답 1은 늘 `10 − 9`).
  - 문제 객체 `{ kind, op, a, b, answerText, call, speak }`: `call`(보이는 글)은 식(`8 + □ = 10`, `13 − 5`, 빼기는 `−` U+2212), `speak`(읽는 말)은 「8 더하기 몇은 10?」·「8 더하기 5」·「10 빼기 3」. `MathBingo`는 지금 `TwoDigitCore.speakText`만 따로 읽으므로, 문제에 `speak`가 있으면 그것을 읽도록 `MathBingo`의 읽는 말 함수에 한 줄 더한다(없으면 지금대로).
- 판·터뜨리기·🎁 해금은 `MathBingo.render`를 그대로 부른다. 이 화면은 탐험관 틀이 아니므로 **작은 `ctx` 어댑터**를 이 파일이 만든다: `ui = MathExplorer.makeUi(say, praise, encourage)`, `say`·`praise`·`encourage`는 요정 엔진 함수, `complete`는 오늘 첫 판에만 보상 1(연산별 키 `math_cpa-bingo-{add|sub}_first_{아이}_{로컬 날짜}`), `isDone`은 그 키 여부, `hasNext`는 거짓. 더 풀기 셈 `counterKey: 'cpa-bingo-{add|sub}'`, 학습일지 접두 `cpa-bingo`(종류 이름이 연산마다 달라 키가 겹치지 않음: `g:cpa-bingo-make10` 등), `perReward: 6`.
- 어댑터는 `ArithmeticBingo.makeCtx()`로 공개해 개념 퀴즈(§4-2)도 같은 `ui`·`say`를 쓴다(퀴즈가 빙고 내부에 기대지 않게 함수 하나만 공유). 싣는 순서상 `arithmetic_bingo.js`가 `arithmetic_cpa.js`보다 앞이다.
- 싣는 파일: … `math_quiz_engine.js` → `math_explorer-shell.js`(전역만 정의, `mount`는 부르지 않음) → `math_squishy.js` → `math_explorer-ladder.js` → `math_bingo.js` → `arithmetic_bingo.js` → `arithmetic_cpa.js` → `arithmetic_lessons.js`. 🫧 말랑 버튼은 `MathSquishy.attach()`(문서 전체 `.mx-btn` 감촉·소리) + 빙고 탭 안에 `MathSquishy.chooserButton()`.
- **CSS**: `math_explorer.css`를 **페이지 CSS보다 먼저** 싣는다(복제하지 않음). 2026-11-24 화면 시험: 먼저 실었을 때 바뀌는 것은 `body` 줄 간격(normal → 1.55)뿐이라 `arithmetic_cpa.css`에 `body { line-height: normal; }` 한 줄로 되돌린다. 1학년 큰 버튼은 `body`에 `mx-grade1` 클래스.

### 4-2. 개념 퀴즈 다듬기 (`arithmetic_cpa.js` `initQuiz`)

- 문제 상자를 `MathDrill.ask`(위 어댑터의 `ui`)로 바꾼다: 문제가 뜨면 질문을 읽음(「5 더하기 몇은 10?」), 보기 3개(정답 + 오개념 2개), 틀리면 그 보기만 꺼지고 노란 힌트를 읽어 줌 + 정답 보기 반짝, 버튼 56px.
- 퀴즈에 작은 10칸 구슬판을 붙인다(`make10`: 빨간 구슬 a개, `sub-10`: 10개 중 지울 b개 빗금, 기존 `frame()` 재사용) — 힌트가 가리키는 판이 실제로 보이게. 십몇 문제는 판 없이 식만.
- 오개념(종류마다 오답 2개, 0 이하·겹침이면 `off-by-one`의 반대쪽으로 대체): `cpa-make10` → `make10-sum`(5 + □ = 10에서 15)·`off-by-one` / `cpa-add-1x1` → `off-by-one`(+1)·`off-by-one`(−1) / `cpa-add-1x1-carry` → `no-carry`(8 + 5 = 3)·`off-by-one` / `cpa-sub-10` → `add-instead`(10 − 3 = 13)·`off-by-one` / `cpa-sub-teen` → `add-instead`(17 − 3 = 20)·`off-by-one` / `cpa-sub-teen-borrow` → `reverse-subtract`(13 − 5 = 12, 일의 자리를 거꾸로 뺌)·`off-by-one`.
- 힌트(20자 안팎, 읽어 줌): `make10-sum` 「10이 되는 짝꿍을 찾아요」, `no-carry` 「10을 넘으면 십몇이 돼요」, `add-instead` 「빼면 작아져요」, `reverse-subtract` 「10에서 먼저 빼 봐요」, `off-by-one` 「하나씩 다시 세어 봐요」.
- 보상: 맞힐 때마다 +1 → **6문제마다 🍬1·하루 3개**(`MathDrill.counter('cpa-quiz', { perReward: 6 })`). 학습일지 키는 기존 그대로.
- 기존 시험(`tests/learning-log-math.test.mjs` CPA 절)이 보는 키·`wrong(글자)` 기록을 유지한다(바뀌는 것은 보기 수와 화면).

## 5. 파일 계획

| 파일 | 내용 | 예상 줄 |
| :--- | :--- | ---: |
| `kids/subjects/math/js/number100-core.js` | `HundredCore` 순수 모듈 | ~420 |
| `kids/subjects/math/js/number100-labs.js` | 1~6관 + 7관 연결 + `mount` | ~520 |
| `kids/css/math_number100.css` | 테마, 1학년 백 줄 숨김(`.mx-grade1 .bt-row-h`), 비교 좌우 카드, 사탕 짝짓기 | ~80 |
| `kids/subjects/math/number100.html` | 감싸개(2-1과 같은 아이디 계약) | ~75 |
| `kids/subjects/math/js/number_three-twenty.js` | `makeLab(cfg)` | +40 |
| `kids/subjects/math/js/base_ten-draw.js` | `names` 옵션 | +12 |
| `kids/css/math_explorer.css` | `body.mx-grade1`을 `mx-grade2` 저학년 규칙에 함께 | +8 |
| `kids/subjects/math/js/arithmetic_bingo.js` | `ArithmeticBingo`: 문제 만들기 + 어댑터 + 탭 그리기 | ~260 |
| `kids/subjects/math/js/arithmetic_cpa.js` | 개념 퀴즈를 `MathDrill.ask`로 | ±60 |
| `kids/subjects/math/arithmetic_cpa.css` | 줄 간격 되돌리기·퀴즈 구슬판 | +10 |
| `kids/subjects/math/js/math_bingo.js` | 문제에 `speak`가 있으면 그것을 읽음 | +2 |
| `addition_concept.html` · `subtraction_concept.html` | 탭 하나·스크립트 | +8씩 |
| `tests/math-number100.test.mjs` | 계산 모듈 seed 300·읽기 표·범위·화면 파일 계약 | ~280 |
| `tests/math-arithmetic-bingo.test.mjs` | 빙고 문제 seed 300·답 서로 다름·범위 | ~120 |
| `tests/learning-log-math.test.mjs` | 100까지의 수 절 교체 | ± |

- 모두 수학 화면 부품(L1). `number_three-twenty.js`·`base_ten-draw.js`는 2-1 화면이 그대로 도는지 기존 시험 + 화면으로 확인.
- 노션·Worker·공통 코어(`kids/core/`) 변경 없음.

## 6. 검증

- 계산 모듈 seed 300개: 모든 수·오답 10~99, 오답 겹침 없음, 읽기 표(10·11·15·20·21·52·60·99 한자어/순우리말), 경계 문제 절반, 빙고 답 9개 서로 다름, 스무고개 `candidates([])` 90개·칩마다 후보를 나눔.
- 화면(쓰기 차단 서버, 375px, 민서): 7관 자동 완주(오답 먼저 고르기 포함) 콘솔 오류 0, 가로 넘침 없음, 질문 음성 호출 1번·수 읽기 문제 음성에 수 없음, 오답 힌트 음성, 버튼 56px, 한 문제 누르기 10번 이내, 6문제마다 🍬 셈, 다시 열면 지난번 관. 10 빙고 한 판 완주(덧셈·뺄셈), 개념 퀴즈 오답→힌트→정답.
- 2-1 두 화면 회귀: `number_three.html` 1관·7관, `add_sub_two.html` 1관 자동 완주.
- `node --test "tests/**/*.test.mjs"`(PC 약함 → `--test-concurrency=1`), `python -X utf8 scripts/ci_local.py`, `node scripts/stamp_versions.mjs`, `verify_contracts.py --mode git-diff`.

## 7. 범위 밖 (B·C·D 묶음, 다음 차례)

- B: `number50.html`(숫자 키보드 입력·버저), `shapes.html`(질문 읽기·원뿔 보기), `clock_rules.html`.
- C: 국어 🎯 받침 빙고 — **2026-11-24 구현**, 명세 [`korean_spec.md` §5-4-1](korean_spec.md). `MathBingo`에 함정 칩(decoys)·안내 읽기·문항기록 옵션과 공용 `makeCtx`를 더함.
- D: 받아쓰기 글자 자석 크기, 국어방 머리 버튼 배치.

## 8. 설계 검토 기록 (2026-11-24)

카본(high)·네온(high)에게 같은 초안을 동시에 보냄(아이 이름 가림). 네온 15건 중 12건, 카본 14건 중 10건 반영(두 검토가 겹친 것 7건).
- 반영: 4관 모형을 좌우 카드로(보기의 왼쪽·오른쪽과 방향 맞춤), 한 자리 오답(`place-ignore`)을 범위 규칙의 예외로, 같은 묶음 쌍의 힌트를 `compare-ones`로 나누고 같은 수 쌍을 넣어 `=` 보기가 늘 오답이 되지 않게, 경계·겹침 대체 규칙과 3관 범위, 5관 사탕 종류 이름 분리(`pair-candies-big`), `which-even` 전용 힌트·홀수 고르기·안내 줄, `listen-build` 범위 축소(누르기 8번)와 예시 수정, 빙고 `speak` 필드와 `MathBingo` 한 줄 수정, 덧셈·뺄셈 빙고 키를 연산별로, 뺄셈 빙고 답 1은 `10 − 9`, 개념 퀴즈 6종 각각의 오답 규칙·1 이상, 공용 CSS를 복제하지 않고 먼저 싣기(화면 시험으로 줄 간격만 차이 확인), 스무고개 크기 칩을 `gt:15`~`gt:85`로 바꿔 묶음 칩과 겹치지 않게·`og:0` 뺌, 남은 숫자 줄 조사(`name`·`unit`), 2관 힌트·질문이 수·정답을 소리 내지 않게, 용어 「10개씩 묶음」 통일, 백 줄은 1학년에서 늘 숨김, `makeMixedRound`·`options` 필드 없앰.
- 반영 안 함: 스무고개 클릭 수 줄이기(후보 4개 이하에서 바로 맞히기) — 2-1 7관과 같은 규칙(9개 이하)을 유지해 3월에 같은 놀이로 느끼게 함. `listen-build`의 숫자 고르기 단계 없애기 — 모형과 숫자를 잇는 단계라 2-1 3관과 같게 남김. 5관 ②를 10개 묶음 + 낱개 사탕으로 그리기 — 다음 차례 후보. `math_drill.js` 누락 지적 — `MathDrill`은 `math_explorer-ladder.js` 안에 있음.

## 9. B 묶음: 50까지의 수·모양·시계 다듬기 (2026-11-24, 커밋 2920c63c)

사용자가 A 다음으로 고른 묶음. 화면 구조(탭·카드)는 그대로 두고 §2 공통 원칙(자동 읽기·에러리스·56px·키보드 없음·6문제마다 🍬)만 맞춘다. 새 공용 부품 없음.

| 화면 | 바꾼 것 |
| :--- | :--- |
| `number50.html` · `kids/js/math_number50.js` · `math_number50_stages.js` · `math_number50_stages.css` | 2단계 표 채우기: 숫자 입력칸 3개 → 「10개씩 묶음은 몇 개예요?」→「낱개는 몇 개예요?」→「모두 얼마예요?」 차례 3지선다(`renderPickChoices`·`pickWrongs`, 누르기 3~6번), 표 머리 「모두」, 읽기(이십일·스물하나)는 다 채운 뒤에만 보임, [정답 확인하기] 버튼 없앰. 4단계 기차: 빈칸 입력 → 왼쪽 빈칸부터 반짝이며 3지선다(±1·±10), 다 채우면 저절로 출발(`checkTrainTrack`은 이름만 남김), 힌트는 앞 칸·뒤 칸 기준. 크기 비교: 틀려도 연속 기록을 지우지 않고 카드만 흐리게 + 「10개씩 묶음 수부터 비교해 봐요」 읽기, 정답 문구 조사 오류 없앰. 오답 버저(`soundWrong`) → `fairyEncourage`. 질문은 그 단계가 보일 때만 읽고 탭을 열 때 읽음(`isStageShown`·`speakStage2Question`·`speakCompQuestion`). 버튼 56px. |
| `shapes.html` · `js/shapes_logic.js` · `math_play.css` | 모양 분류 퀴즈 보기를 1학년 세 모양(상자·둥근기둥·공)만으로(원뿔·삼각기둥·원기둥·하트 등 뺌), 세로 한 줄 56px, 관을 열 때·새 문제마다 「주사위, 어떤 모양일까요?」 읽기(5관이 보일 때만), 틀리면 고른 보기를 끄고 정답 보기 반짝 + **고른 모양의 특징**을 읽음(예전 힌트는 정답 이름을 말했음), 보상은 맞힐 때마다 → 6문제마다 🍬(`MathDrill.counter('shape-quiz')`, `math_explorer-ladder.js` 실음). 학습일지 `s:shape-quiz:<번호>` 그대로. |
| `clock_rules.html` · `js/clock_rules_logic.js` · `math_play.css` | 시계 읽기: 새 문제마다 「몇 시일까요?」 읽기, 틀린 보기 끄기·정답 반짝·힌트 읽기(정각/30분을 틀렸으면 긴바늘, 시를 틀렸으면 짧은바늘). 다음 구슬 맞히기도 같은 에러리스 + 「다음에 올 것은 무엇일까요?」 읽기. 뛰어 세기 수 배열판은 오답 힌트를 읽음. 고르기·조작 버튼 56px(수 배열판 칸은 그대로). 학습일지 키 그대로. |

- 캐시 표시가 없던 `arithmetic_cpa`·`math_play.css`·`shapes_logic.js`·`clock_rules_logic.js`에 `?v=`를 붙여 `stamp_versions.mjs`가 맞추게 했다.
- 검증: `number50-split`(600줄·HTML이 부르는 함수·싣는 순서) 16개, `learning-log-math` 10개, `quiz-choices-guard` 통과. 375px에서 세 화면을 오답 먼저 골라 완주, 콘솔 오류 0·가로 넘침 없음.
- 남은 것(D 묶음 후보): 시계 화면은 아직 한 페이지에 장난감 4개(카드), 50까지의 수 3단계 선 잇기는 끌기 조작이라 손이 작은 아이에게 어려울 수 있음.

## 10. D 묶음: 손가락 크기·한 화면 하나 (2026-11-24)

| 화면 | 바꾼 것 |
| :--- | :--- |
| 국어방 머리 줄 (`kids/css/korean.css`) | 폰(≤480px)에서 버튼 묶음이 줄을 넘기게(`flex-wrap`, 글자 한 줄, 48px) — 예전엔 「단원 동화 도서관」 글자가 세로로 찌그러짐. |
| 받아쓰기 글자 자석·블록 (`korean.css`) | 자석 50×44px → 56×56px 이상, 띄어쓰기·지우기·정답 확인 56px. 긴 문장(10글자+띄어쓰기)은 여전히 10번 넘게 누르지만 띄어쓰기도 배우는 단계라 자동 띄어쓰기는 넣지 않음. `korean_dictation.js`는 그대로. |
| 50까지의 수 선 잇기 (`math_number50_stages.js`·`.css`, `number50.html`) | 375px에서 옆 줄 점끼리 약 10px라 점 끌기·누르기가 어려움 → **카드 하나 누르고 옆 줄 카드 누르기**로도 잇게(고른 카드 노란 테두리, 같은 줄 다시 누르면 바꿈, 끌기도 그대로). 틀린 짝 「같은 수를 나타내는 것끼리 이어요」, 떨어진 줄 「바로 옆 줄끼리 이어요」 읽기. 안내 글 바꿈. |
| 시계·규칙 (`clock_rules_logic.js`·`math_play.css`) | 카드 4개를 탭(🕒 시계 읽기·📿 규칙 만들기·🧩 다음 구슬·🔍 뛰어 세기)으로 나눠 한 번에 하나만, 아이별 지난번 탭 기억(`math_clock_tab_{minseo|minsu}`), 탭을 바꾸면 읽던 소리 멈춤. 375px 페이지 높이 2,637 → 1,279px. |

- 검증: `ci_local` 통과, `verify_contracts` ALL PASS, 375px에서 국어방 머리·받아쓰기 자석 크기 측정, 선 잇기는 실제 마우스 누르기로 틀린 짝 → 맞는 짝 연결, 시계 탭 전환·다시 열기 기억 확인.
