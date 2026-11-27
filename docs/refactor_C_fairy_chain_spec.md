# 리팩토링 묶음 C: 요정 스크립트 싣는 순서를 한 곳에서 정하기 — 설계 명세

> 작성 2026-11-27 · 작성 Claude Code · 상태: **설계 검토 반영본** (카본·네온 medium 각 9개 지적, 실제 반영 7개씩 — §7)
> 위험도: `kids/core/core.js`·`kids/config.js`·로비 컨트롤러를 바꾸므로 **L2**다. 설계 검토는 카본과 네온에게 동시에 받고(새 설계), 구현 diff는 카본에게 검토받는다.
> 전체 순서: [`docs/refactor_batches.md`](refactor_batches.md) 묶음 C · 앞 묶음: A(빠진 `?v=` 채우기, `2b7de65b`)

## 1. 지금 상태 (2026-11-27 Claude 조사)
요정(음성·보상) 스크립트 묶음은 `fairy-config.js` → `fairy-tts.js` → `fairy-settings-catalog.js` → `fairy-engine.js` 순서로 실려야 한다. 덧붙이는 파일로 `fairy-settings-engine.js`(설정창)와 `fairy-chatbot.js`(요정 대화)가 있다. 그런데 이 순서를 정하는 곳이 세 갈래로 흩어져 있다.

**(가) HTML 태그로 손수 싣기: 64개 화면**

| 화면 수 | 싣는 순서 (공용 코어만) |
| ---: | :--- |
| 25 | config → core → notion-helper → **fairy-config → tts → catalog → engine** |
| 15 | 위 + fairy-chatbot |
| 8 | fairy 4개만 (가족 보드게임: 오목·요트·윷 등) |
| 6+2 | config → core → notion-helper → fairy-config → catalog → **settings-engine → tts** → engine (+chatbot) — 영어방 |
| 나머지 8 | 한두 개씩 다름: `voca.html`(fairy-config 없음, notion-helper가 engine 뒤), `english_voca.html`(chatbot이 tts 앞), `quest_runner.html`·`monster_lab.html`(core 없음), `index.html`(engine 없이 tts·catalog·settings-engine — 설정창만), `family_mail.html`(config·fairy-config·tts만) |

- 기존 시험 `tests/fairy-tts.test.mjs` ①은 「engine을 싣는 화면은 tts를 engine보다 먼저, catalog도 함께」까지만 본다.

**(나) 동적 목록 `loadCoreScripts(경로, [파일들], 완료)`: 화면마다 목록을 따로 들고 있다**
- `kids/core/core.js`의 `requiredCores`, `kids/js/lobby_controller.js`의 `lobbyCores`, `kids/common_space/my-room-main.js`, `kids/subjects/math/gugudan.html`.
- **로비 목록은 순서가 틀렸다**: `fairy-engine.js`가 `fairy-settings-catalog.js`보다 앞이다. 엔진의 자가 삽입(다)이 메워 주고 있을 뿐이다.
- 목록의 이름에 `?v=`가 없다. 그러면 `loadCoreScripts`가 `?v=20260828_${Date.now()}`를 붙인다(`kids/config.js` 162행). 그래서 **로비는 들어올 때마다 요정 파일을 캐시 없이 새로 받는다**. 버전 도장 도구는 `'이름.js?v=값'` 모양만 찍으므로, 지금 목록은 도장 대상도 아니다.
- HTML 태그로 이미 실린 파일은 `loadCoreScripts`가 「그 폴더의 그 파일」 주소를 비교해 건너뛴다. 그래서 (가)와 (나)가 겹쳐도 두 번 실리지는 않는다.

**(다) 엔진 자가 삽입**: `fairy-engine.js` 193행 부근에서, 목록 파일(`fairy-settings-catalog.js`)이 안 실렸으면 엔진이 스스로 끼워 넣는다(자가 치유).

## 2. 고르지 않은 방법과 까닭
- **HTML 태그를 지우고 동적 로더 하나로 싣기**: 동적으로 넣은 스크립트는 `async=false`여도 문서 해석을 막지 않는다. `DOMContentLoaded`도 그 스크립트를 기다리지 않는다. 지금 64개 화면의 인라인 코드와 `DOMContentLoaded` 처리기가 `speakFairyTTS`·`fairyPraise` 등을 곧바로 부를 수 있어서, 하나라도 빠뜨리면 아이 화면에서 소리가 조용히 사라진다. 얻는 것(태그 몇 줄)에 비해 위험이 크다.
- **`document.write`로 태그를 대신 써 주는 로더 1개**: 해석을 막는 성질은 지켜지지만, 페이지가 다 그려진 뒤 동적으로 실리면(예: `loadCoreScripts`·동화 자가 삽입) 화면을 통째로 지운다. 브라우저 경고 대상이기도 하다.

## 3. 고른 방법: 「순서 목록 하나 + 모든 싣는 곳이 그 목록을 따르게 + 시험으로 묶기」
화면이 실리는 방식(해석을 막는 태그)은 그대로 둔다. 순서를 정하는 곳만 하나로 모으고, 나머지는 모두 그것을 보게 한다.

### 3-1. 순서 목록 한 벌 (`kids/config.js`)
```js
// 🧚 요정 묶음 공식 순서 (한 벌). 태그로 싣든 loadCoreScripts로 싣든 이 순서를 따른다. 시험: tests/fairy-chain.test.mjs
var FAIRY_CORE_CHAIN = [
    'fairy-config.js?v=…',
    'fairy-tts.js?v=…',
    'fairy-settings-catalog.js?v=…',
    'fairy-engine.js?v=…'
];
```
- `config.js`는 거의 모든 화면이 맨 앞에 싣고, `loadCoreScripts`도 여기에 있다. 그래서 목록도 여기에 둔다. **`loadCoreScripts`가 있는 곳이면 `FAIRY_CORE_CHAIN`도 반드시 있다.**
- 요정 파일을 고치면 `config.js` 해시가 바뀌어 모든 화면의 `config.js?v=`가 한꺼번에 바뀐다. `config.js`는 작은 파일이라 다시 받는 비용은 무시할 만하므로 받아들인다(검토 지적, 결정).
- 고리 위험 없음(확인): 요정 파일과 `core.js` 안에 `config.js`를 가리키는 글자가 없다. 경로 없는 `'fairy-config.js?v='`는 도장 도구가 「저장소에 하나뿐인 이름」으로 `kids/core/fairy-config.js`를 찾는다(구현 뒤 `--check`로 확인).
- `?v=` 값은 버전 도장 도구가 찍는다(`'이름.js?v=값'` 모양은 이미 지원). 요정 파일이 바뀌면 `config.js`의 해시가 바뀌고, 그것을 싣는 화면의 `?v=`도 줄줄이 바뀐다. 손댈 것은 없다.
- 덧붙이는 파일의 자리 규칙: `fairy-settings-engine.js`는 catalog 뒤 어디든, `fairy-chatbot.js`는 engine 뒤.

### 3-2. 동적 목록이 그 목록을 쓰게 (L2)
- `core.js` `requiredCores`, `lobby_controller.js` `lobbyCores`, `my-room-main.js`, `gugudan.html`이 요정 파일 4개를 직접 적던 자리를 `...FAIRY_CORE_CHAIN`으로 바꾼다. 덧붙이는 파일은 그 뒤에 그대로 둔다.
  - 로비의 engine↔catalog 순서가 저절로 바로잡히고, 요정 파일이 버전 해시로 캐시된다(들어올 때마다 새로 받지 않음).
  - **갈음 목록은 두지 않는다**(검토 반영으로 바꿈). 묶음 A 뒤로 모든 참조가 내용 해시 `?v=`를 달고 있어서, 새 호출 파일과 옛 `config.js`가 섞여 실릴 수 없다. 또 호출하는 `loadCoreScripts` 자체가 `config.js`에 있다. 갈음 목록을 4곳에 복사하면 오히려 순서가 다시 흩어진다.
- `loadCoreScripts` 동작은 이미 맞다(확인, `kids/config.js` 134~180행): ① 이름에 `?`가 있으면 시각 버전을 붙이지 않는다 ② 이미 실린 스크립트는 `?`·`#`을 뗀 「그 폴더의 그 파일」 주소로 건너뛴다 ③ `async=false`로 넣은 순서대로 실행한다 ④ 모두 건너뛰거나 실패해도 완료 콜백을 부른다. 이 네 가지를 시험으로 묶는다(§3-4 ⑤).
- 다른 코어(`daily-diary-*`, `notion-helper.js` 등)는 이번에 손대지 않는다.

### 3-3. HTML 태그 순서 바로잡기 (L1-리팩터, 화면 변화 없음)
목록과 다른 화면만 고친다. 바꾸는 것은 태그의 **순서와 빠진 태그**뿐이다.
- 부작용 확인(검토 지적):
  - 요정 파일 6개의 최상위 이름(`function`·`var`·`let`·`const`·`window.x =`)은 서로 하나도 겹치지 않는다. 그래서 싣는 순서를 바꿔도 「뒤에 실린 쪽이 이긴다」로 뜻이 달라지는 이름이 없다.
  - `FAIRY_CONFIG`를 쓰는 요정 파일은 `fairy-chatbot.js`뿐이다. tts·engine·settings-engine은 쓰지 않는다.
  - `voca.html`은 지금도 `core.js`가 `requiredCores`로 `fairy-config.js`를 나중에 동적으로 싣는다. 그래서 태그를 더하면 같은 파일이 **더 일찍** 실릴 뿐이다.
- 영어방 8개: `fairy-settings-engine.js`가 `fairy-tts.js` 앞에 있다 → 규칙상 catalog 뒤면 되니, tts를 catalog 앞으로 옮긴다(fairy-config → tts → catalog → settings-engine → engine).
- `english_voca.html`: `fairy-chatbot.js`를 engine 뒤로 옮긴다.
- `voca.html`: `fairy-config.js` 태그를 tts 앞에 더한다. notion-helper가 engine 뒤에 있는 것은, 요정 묶음 안의 순서가 아니므로 이번에는 그대로 둔다(파일마다 의존 확인이 필요해서).
- 일부만 싣는 화면의 규칙(검토 반영으로 정밀하게): ⓐ 실린 요정 파일의 순서가 목록 순서의 **부분열**이다 ⓑ engine이 있으면 4개 모두 있다 ⓒ settings-engine 앞에 catalog가 있다 ⓓ chatbot 앞에 fairy-config와 engine이 있다 ⓔ 같은 파일 태그가 두 번 나오지 않는다. 이 규칙으로 `family_mail.html`(fairy-config → tts)과 `index.html`(tts → catalog → settings-engine, 설정창 전용)이 통과한다. tts는 `FAIRY_CONFIG`를 쓰지 않으므로 둘 다 소리가 빠지지 않는다.

### 3-4. 시험 `tests/fairy-chain.test.mjs` (새 파일, 노션 미접속)
1. `kids/config.js`의 `FAIRY_CORE_CHAIN`이 4개 이름을 위 순서대로 갖고, 원소마다 `?v=<8자리 16진수>`가 붙어 있다.
2. **모든 HTML**(맨 위·`kids/` 아래, `.claude`·`scratch`·`node_modules` 제외)에서 **HTML 주석을 지운 뒤** `<script ... src=...>`로 싣는 요정 파일이 §3-3 규칙 ⓐ~ⓔ를 지킨다. 실패하면 파일마다 「기대 순서 / 실제 순서」를 함께 보인다.
3. 저장소 JS·HTML 전체에서 **`loadCoreScripts(` 호출이 있는 파일을 자동으로 모은다**(정의 파일 `kids/config.js`와, 스스로 같은 이름의 함수를 정의한 `print_*.html` 두 곳은 제외). 그 파일들의 요정 파일 이름(`'fairy-config.js'` 등 4개) 글자가 JS 주석 밖에 없다. 즉 4개는 `...FAIRY_CORE_CHAIN`으로만 들어간다. 덧붙이는 `fairy-settings-engine.js`·`fairy-chatbot.js`는 적어도 되지만, `FAIRY_CORE_CHAIN` 펼침보다 뒤에 있어야 한다.
4. `loadCoreScripts`를 쓰는 화면은 `config.js`를 그보다 먼저 싣는다. 대상: `core.js`를 태그로 싣는 HTML, `lobby.html`(`lobby_controller.js`), `my-room.html`(`my-room-main.js`), `gugudan.html`(인라인 호출).
5. `loadCoreScripts` 계약(vm에 `config.js`를 실어 가짜 `document`로): `?v=`가 붙은 이름에 시각 버전을 더 붙이지 않음, 이미 실린 같은 경로는 쿼리가 달라도 건너뜀, 넣는 순서 유지·`async=false`, 모두 건너뛸 때도 완료 콜백 1번.
6. 기존 `tests/fairy-tts.test.mjs` ①은 이 시험과 겹치지만 지우지 않는다(검사가 줄지 않게).

### 3-5. 문서
- `kids/core/CORE_CATALOG.md` §1(요정 로드 순서): 「순서는 `config.js` `FAIRY_CORE_CHAIN` 한 벌, 동적 로더는 `...FAIRY_CORE_CHAIN`, 태그 화면은 시험이 대조」.
- `docs/refactor_batches.md` 진행 기록.

## 4. 하지 말 것
- 화면의 태그를 동적 로더로 바꾸지 않는다(§2).
- `fairy-engine.js`의 자가 삽입(다)은 지우지 않는다. 옛 캐시와 외부 진입을 위한 안전망으로 둔다. 다만 삽입이 일어나면 `console.warn('[요정] fairy-settings-catalog.js가 안 실려 엔진이 끼워 넣음 — 싣는 순서 확인')`을 남겨, 순서 잘못이 안전망 뒤에 숨지 않게 한다(검토 반영). 비동기 삽입이라 엔진이 실린 직후 몇 순간은 목록이 없을 수 있다는 한계도 그 주석에 적는다.
- 다른 코어의 싣는 순서·`notion-helper.js` 자동 로더는 이번 범위가 아니다.

## 5. 확인
- `node --test --test-concurrency=1 tests/fairy-chain.test.mjs tests/fairy-tts.test.mjs`, `node scripts/stamp_versions.mjs` 뒤 `--check`, `python -X utf8 scripts/ci_local.py`
- 쓰기 차단 서버(포트 8769)에서 바뀐 화면 갈래마다 하나 이상 연다: 로비(동적 목록), 마이룸(동적 목록), 구구단(인라인 동적 목록), 영어방(태그 순서 바뀜), `english_voca.html`, `voca.html`(태그 더함), `index.html`(설정창 전용), 오목(요정 4개만).
  - 네트워크: 요정 파일 요청이 모두 `?v=<8자리>`이고 `Date.now()` 버전이 없다. 같은 파일을 두 번 받지 않는다.
  - 콘솔: 오류 없음, 자가 삽입 경고 없음.
  - **실제 소리 경로**: `HTMLMediaElement.prototype.play`와 `speechSynthesis.speak`를 세는 함수로 감싼 뒤 `fairyPraise()`·`speakFairyTTS('안녕')`을 불러, 둘 중 하나라도 1 이상인지 본다(함수가 있기만 하고 안에서 조용히 돌아 나가는 회귀를 잡기 위함). 설정창 전용인 `index.html`은 설정창의 미리듣기 함수로 같은 확인을 한다.
- 폰 크기(390px)에서 로비 요정 버튼을 눌러 같은 확인을 하고 사진을 찍는다.

## 6. 일꾼 배분
- 설계 검토: 카본·네온(medium) 동시 → 반영
- 구현: 네온 medium(`-ReadDir`로 실제 파일 읽기). HTML 태그 순서 바꾸기는 기계적이라 Claude가 직접 해도 된다.
- 구현 diff 검토: 카본(L2)

## 7. 설계 검토 기록 (2026-11-27, 카본·네온 medium 동시)
- 둘이 겹친 지적: `loadCoreScripts`의 `?v=` 중복 부착·중복 실행, 실행 순서·완료 콜백, 도장 도구의 고리·경로 해석, 태그 순서를 바꾸는 부작용, `index.html`과 「앞에서부터」 규칙의 모순, 정적 시험의 주석 착시·호출부 고정, 실제 소리 확인 부족.
- 반영: §3-1(캐시 무효화 결정·고리 확인), §3-2(갈음 목록 없앰·`loadCoreScripts` 계약 시험), §3-3(이름 겹침 없음 확인·규칙 ⓐ~ⓔ), §3-4(주석 제거·호출부 자동 수집·`?v=` 형식·config 선행·실패 메시지), §4(자가 삽입 경고), §5(화면 갈래 전부·실제 소리 경로).
- 반영 안 함: 「`loadCoreScripts`가 `?v=`를 또 붙인다」, 「모두 건너뛰면 콜백이 없다」는 지금 코드에서 이미 아니다. 대신 시험으로 고정했다(§3-4 ⑤).

## 8. 구현 diff 검토 기록 (2026-11-27, 카본 high)
- 반영 3개:
  - ① 배포 직후 10분 안에 옛 `config.js` 캐시와 새 `core.js`가 만나는 경우: 로비가 `core.js`를 버전 없이 싣고 있어 `core.js` 전체가 `ReferenceError`로 멈출 수 있었다. 그래서 `core.js`에만 같은 순서의 갈음 목록을 두고(시험이 공식 목록과 대조), 로비 목록의 `core.js`에도 `?v=` 해시를 단다.
  - ⑤ 시험의 배열 마지막 원소 놓침·뒤 쉼표 이중 처리.
  - ⑦ 경로가 붙은 이름 직접 나열 차단, HTML은 인라인 스크립트만 검사.
- 반영 안 함:
  - ② 「설정창·챗봇 파일이 빠졌다」: diff를 잘못 읽은 것으로, 두 파일은 그대로 있다.
  - ③ 해시 일치: `version-stamps` 시험이 이미 전체를 대조한다.
  - ④ `core.js`가 태그보다 앞에 있어 생기는 중복: `core.js`는 `DOMContentLoaded` 뒤에 부르므로, 브라우저 확인에서 파일마다 한 번만 받는 것을 봤다. 예전과 같은 동작이다.
  - ⑥ `kids/` 밖 폴더: 화면이 없다.
  - ⑧ 정규식 리터럴 주석 오인: 필수 호출 파일 4개 수집을 시험이 따로 확인한다.
  - ⑨ 로비 중첩 로드: 예전과 같은 동작이다.
  - ⑩ `Object.freeze`: 펼쳐 복사하므로 필요 없다.
