# 🎬 단원 영상 부품 명세 (video_unit_spec) — v0.1 초안

> 작성: 2026-11-16 · 상태: 초안(1차 구현 대상) · 관련: `GEMINI.md` §1(3단계 사다리 1단계 워밍업)·§4-5(보기 섞기)·§8-2(노션 동적 송출)·§8-5(계약 우선)
> 목적: 단원마다 스토리북(삽화 10장 + mp3)을 만드는 대신, **유튜브 교육 영상 링크를 노션에 등록하면 화면이 알아서 그리는** 공용 부품을 둔다. 첫 적용 대상은 과학 실험실 14개 화면에 직접 박혀 있던 영상이다.

---

## 1. 왜 바꾸나

| 문제 | 지금 | 바꾼 뒤 |
| :--- | :--- | :--- |
| 용량 | 스토리북 1권 = 삽화 10장 + mp3 10개. 저장소 팩이 이미 1.66GiB | 영상 ID 한 줄. 저장소에 파일이 늘지 않음 |
| 하드코딩 | 과학 실험실 14개 HTML에 유튜브 주소가 직접 박힘 (§8-2 위반) | 노션 CURRICULUM_DB 한 행. 부모가 폰으로 영상 교체 |
| 링크 끊김 | 끊겨도 아무도 모름 | 점검 도구(`check_video_links.py`)로 월 1회 확인 |
| 추천 영상 이탈 | 영상이 끝나면 유튜브 추천 영상이 뜸 | 끝나는 순간 덮개를 씌워 "다시 보기 / 확인 문제" |
| 저사양 태블릿 | 실험실을 열자마자 유튜브 iframe이 실림 | 썸네일만 먼저 보이고, 누르면 그때 플레이어를 실음 |
| 수동 시청 | 보고 끝 | (선택) 핵심 3줄 + 확인 문제 0~3개 |

스토리북은 없애지 않는다. **글 자체가 학습 대상**인 경우(국어 문학 단원, 민서 읽기 연습)에만 만들고, 나머지 단원의 1단계 워밍업은 이 부품을 기본으로 쓴다.

---

## 2. 노션 계약 (CURRICULUM_DB, 칸 추가 없음)

새 칸을 만들지 않고 기존 칸을 쓴다. 새 **구역** 선택지 2개만 늘어난다.

### 2-1. 영상 행 (`구역` = `단원영상`)
| 칸 | 값 | 비고 |
| :--- | :--- | :--- |
| 제목 | 화면에 보일 영상 제목 (예: `페트병 속 구름 만들기 실험`) | 등록기의 같은 행 판정 기준. 접두어 규칙 없음, 화면은 그대로 표시만 함 |
| 과목·학년·단원 | 기존 규칙 그대로 | |
| 구역 | `단원영상` | |
| 미디어 URL | `https://www.youtube.com/watch?v={ID}` (표준형) | 등록기가 `youtu.be/`·`embed/`·`shorts/`도 받아 표준형으로 바꿔 씀 |
| **인터랙티브 URL** | **영상이 나올 화면의 배포 주소** `https://awslike6-web.github.io/kids-school/{저장소 상대 경로}` | **화면 ↔ 영상 연결 열쇠.** 노션에서 눌러 바로 화면으로 갈 수 있음 |
| 해설 | 출처 (예: `스마트올TV 초등 실험실`, `EBS 초등`) | 영상 행에서는 출처 칸으로 쓴다 |
| 핵심 쓰임새/설명 | (선택) 핵심 문장 1~3개를 ` \| `로 이어 씀 | §8-5에 따라 쉼표가 아닌 `\|`로 나눈다 |
| 퀴즈 질문·보기·정답 | 비움 | |

### 2-2. 확인 문제 행 (`구역` = `영상확인`, 선택, 화면당 0~3개)
| 칸 | 값 |
| :--- | :--- |
| 제목 | 문제 식별용 이름 (예: `[구름 영상 확인] 뚜껑을 열면`) |
| 인터랙티브 URL | 영상 행과 **글자까지 같은** 화면 주소 |
| 퀴즈 질문 / 보기 1~4 / 정답 / 해설 | 기존 문항 규칙 그대로 (보기 2~4개 줄바꿈 구분, 정답은 1부터, 해설에 보기 번호 금지) |

### 2-3. 연결 규칙
- 화면은 자기 **화면 열쇠**(저장소 상대 경로, 예: `kids/subjects/science/science_cloud_lab.html`)를 안다. 부품은 `https://awslike6-web.github.io/kids-school/` + 열쇠로 주소를 만들어 노션 `인터랙티브 URL` **equals** 필터로 찾는다. 로컬·미리보기 서버에서도 같은 열쇠를 쓰므로 똑같이 동작한다.
- 한 화면에 영상 행이 여러 개면 노션 생성 순서대로 모두 그린다(권장 1개, 최대 3개).
- 기존 과학 화면(`science_lab.js`)은 구역으로 거르므로 새 구역 행을 무시한다(2026-11-16 확인: `안전수칙`·`탐구보고서`·`실험실` 등만 읽음).

---

## 3. 공용 부품 `kids/core/video-unit.js` + `kids/css/video-unit.css`

### 3-1. 쓰는 법 (화면 쪽은 3줄)
```html
<link rel="stylesheet" href="../../css/video-unit.css?v=20261116-video">
<div class="video-unit" data-video-unit="kids/subjects/science/science_cloud_lab.html"></div>
<script src="../../core/video-unit.js?v=20261116-video"></script>
```
- `DOMContentLoaded`(이미 지났으면 즉시)에 `[data-video-unit]` 요소를 모두 찾아 그린다.
- 직접 부를 때: `window.VideoUnit.mount(element, screenKey)` → `Promise<{videos, questions, source}>` (`source` = `'notion' | 'cache' | 'stale-cache' | 'none'`).
- 전역 이름은 `window.VideoUnit` 하나 (IIFE).
- 화면이 `config.js`를 싣지 않아도 동작한다: Worker 주소·DB ID는 `APP_CONFIG`가 있으면 그것, 없으면 `science_lab.js`와 같은 기본값.

### 3-2. 데이터 읽기
1. **먼저 보여 주고 뒤에서 새로 읽기**: `localStorage` 키 `MINMIN_VIDEO_UNIT_V1:{화면 열쇠}` = `{savedAt: 'YYYY-MM-DD HH:mm'(KST), videos, questions}`에 마지막으로 성공한 결과가 있으면 **바로 그린다**(`source: 'cache'`). 그리고 **매번** 노션을 다시 읽는다(Worker 엣지 캐시가 있어 부담이 적고, 부모가 영상을 바꾸면 다음 화면 열기에 바로 반영되게 하려고).
2. 노션 조회 (`POST {Worker}/v1/databases/{CURRICULUM_DB}/query`, 헤더는 `Content-Type`만. 브라우저에서 `User-Agent`를 붙이지 않는다):
   ```json
   {"page_size": 20,
    "filter": {"property": "인터랙티브 URL", "url": {"equals": "<배포 주소>"}},
    "sorts": [{"timestamp": "created_time", "direction": "ascending"}]}
   ```
   **구역은 화면에서 거른다**(`rowsToUnit`이 `단원영상`·`영상확인`만 남김). 노션은 DB에 아직 없는 선택지로 select 필터를 걸면 조회 전체를 `400 validation_error`로 거절한다(2026-11-16 확인: `영상확인` 행을 한 번도 등록하지 않으면 그 선택지가 생기지 않아 모든 화면이 실패). 같은 화면 주소를 `가상실험` 행 등도 쓰고 있으니 화면 쪽 거르기는 반드시 필요하다.
3. 성공하고 영상이 1개 이상이면 캐시에 쓴다. 캐시로 그린 내용과 **영상 ID·문항이 다를 때만** 다시 그린다(같으면 손대지 않음). 다시 그릴 때 재생 중인 플레이어가 있으면 그 영상이 끝날 때까지 미룬다 (`source: 'notion'`).
4. 성공했지만 **0건이면 캐시를 지우고 영역을 숨긴다**(`hidden`). 0건은 캐시에 쓰지 않는다(노션 등록 전에 화면을 연 기기가 영상을 못 보게 굳는 것 방지). 노션에서 영상을 지우면 다음 열기에 조용히 사라진다.
5. 실패하면 캐시로 그린 것을 그대로 둔다(`'cache'`). 캐시도 없으면 "영상을 불러오지 못했어요" 안내와 [다시 시도] 버튼 (`'none'`).
6. 시각은 KST 로컬 헬퍼로 만든다 (`toISOString().slice` 금지, §8-5). `savedAt`은 진단용이며 만료 판단에 쓰지 않는다.
7. 노션 `url` equals는 글자 그대로 비교한다. 그래서 화면 열쇠·배포 주소는 등록기·점검 도구가 검사하고(§4·§5), 부모가 노션에서 손으로 칸을 고칠 때는 공백·끝 `/`를 넣지 않는다고 안내한다.

### 3-3. 영상 ID 뽑기 (`VideoUnit.parseYouTubeId(url)`, 시험용 공개)
- `watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `youtube-nocookie.com/embed/`를 `URL` 객체로 읽는다. ID는 `^[A-Za-z0-9_-]{11}$`만 인정, 아니면 `null` → 그 행은 건너뛴다.

### 3-4. 그리기 (영상 1개당)
1. **썸네일 먼저**: `https://i.ytimg.com/vi/{ID}/hqdefault.jpg` 위에 ▶ 버튼(16:9 비율 유지). 이때는 유튜브 스크립트를 싣지 않는다.
2. **▶를 누르면 플레이어를 API가 만들게 한다** (이미 만든 iframe을 넘기면 `host` 옵션이 무시되어 끝 이벤트가 안 올 수 있음):
   - 썸네일 자리에 빈 `<div>`를 두고 `loadYouTubeApi()`(아래 5)를 기다린 뒤
     `new YT.Player(div, {host: 'https://www.youtube-nocookie.com', videoId: ID, playerVars: {rel: 0, playsinline: 1, autoplay: 1, origin: location.origin}, events: {onReady: e => e.target.playVideo(), onStateChange}})`.
   - **API가 5초 안에 준비되지 않으면** 대신 iframe을 직접 넣는다: `https://www.youtube-nocookie.com/embed/{ID}?rel=0&playsinline=1&autoplay=1` (`allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`, `allowfullscreen`). 이 경우 끝 덮개는 없다(오류 내지 않음).
   - 알려진 한계: 휴대폰·태블릿은 소리 있는 자동 재생을 막는 일이 많아 유튜브 ▶를 한 번 더 눌러야 할 수 있다. 정상 동작으로 본다.
3. 플레이어 아래 한 줄: `{제목} · {출처}` + [📺 유튜브에서 열기 ↗] (`https://youtu.be/{ID}`, 새 창, `rel="noopener noreferrer"`). 퍼가기 막힘·연령 제한·`file://` 실행처럼 화면 안 재생이 안 될 때의 탈출구라 **항상** 보인다.
4. **끝 덮개**: `onStateChange` 상태 `0`(끝남)이면 플레이어 위를 덮는다: "다 봤어요! 🎉" + [🔁 다시 보기] (+ 확인 문제가 있으면 [✏️ 확인 문제 풀기]). [다시 보기]는 덮개를 치우고 `seekTo(0, true)` → `playVideo()`.
   - 한 영상이 재생 상태(`1`)가 되면 같은 화면의 다른 플레이어는 `pauseVideo()`.
5. **API 싣기 (`loadYouTubeApi()` → Promise, 화면당 한 번)**: `window.YT && YT.Player`가 있으면 바로 끝. 아니면 `<script src="https://www.youtube.com/iframe_api">`를 **한 번만** 넣고, 기존 `window.onYouTubeIframeAPIReady`가 있으면 그것도 이어서 부르는 래퍼로 바꿔 둔다. 여러 영상이 동시에 기다려도 같은 Promise를 쓴다(경쟁 없음). 실패·5초 초과는 reject → 2의 직접 iframe 경로.
6. **핵심 3줄**: `핵심 쓰임새/설명`이 있으면 ` | `로 나눠 앞 3개를 "📌 핵심 정리" 목록으로 플레이어 아래에 늘 보인다.

### 3-5. 확인 문제 (있을 때만)
- 플레이어 아래 [✏️ 확인 문제 N개] 버튼으로도 열 수 있다(유튜브 앱에서 본 아이 대비). 끝 덮개 버튼도 같은 동작.
- 한 번에 한 문제. 보기는 `window.QuizChoices.arrange`로 섞는다. `QuizChoices`가 없으면 부품이 **자기 파일 위치 기준**(스크립트 맨 앞에서 `document.currentScript.src`를 저장해 `new URL('quiz-flow-controller.js?v=20261114-shuffle', 그 주소)`)으로 한 번 실어 보고, 그래도 없으면 원래 순서. (상대 경로를 그냥 쓰면 HTML 위치 기준이 되어 틀린다.)
- **에러리스**: 정답 → `fairyPraise()`; 오답 → 하트·경고음 없이 정답 보기를 노란색으로 표시 + 해설 + `fairyEncourage()`, [다음]으로 진행. 마지막 문제 뒤 "확인 완료! ⭐" + `fairyReward()`.
- 오디오 함수는 `typeof window.fairyPraise === 'function'`일 때만 부른다(실험실 화면 중 fairy 엔진을 안 싣는 곳이 있음). `speechSynthesis` 직접 호출 금지.
- **보석·사탕 지급, 학습일지 기록은 1차 범위 밖**(§7). 보상 경제는 따로 설계한다.

### 3-6. 코딩 규칙
- 바닐라, IIFE, 전역 `window.VideoUnit` 하나. 노션에서 온 글자는 모두 `textContent`로 넣는다(`innerHTML`에 노션 글자 금지).
- CSS 클래스는 모두 `vu-` 접두어(`.video-unit`만 예외). 화면 원래 CSS(`.video-frame-wrap` 등)에 기대지 않는다.
- 줄 수: JS 300~450줄, CSS 200줄 이하.
- 시험용 공개 함수: `parseYouTubeId`, `buildQuery(screenKey)`, `rowsToUnit(results)` (노션 결과 → `{videos:[{id,title,source,summary[]}], questions:[{title,question,choices[],answer(0부터),explanation}]}`), `kstNow()`, `loadYouTubeApi()`, `loadUnit(screenKey, onData)` (DOM 없는 데이터 층: 캐시가 있으면 `onData(unit, 'cache')`를 먼저, 노션 결과가 다르면 `onData(unit, 'notion')`, 0건이면 `onData(null, 'notion')`; 반환 Promise는 최종 `source`).
- 검토 기록: 2026-11-16 Argon 명세 검토 10건 모두 반영(플레이어를 API가 만들기, 0건 캐시 금지, 먼저 보여 주고 매번 새로 읽기, 브라우저 `User-Agent` 제거, API 싣기 경쟁·다른 영상 일시정지, 부품 기준 상대 경로, 다시 보기 동작, 모바일 자동 재생 한계, oEmbed 한계, url equals 글자 비교).

---

## 4. 등록기 보완 (`scripts/register_curriculum.py`)

자료 JSON 형식은 그대로. 아래 검사만 늘린다.
- `zone`이 `단원영상`:
  - `media_url` 필수, 유튜브 ID 11자를 뽑을 수 있어야 함 → 표준형 `https://www.youtube.com/watch?v={ID}`로 바꿔 씀.
  - `interactive_url` 필수, `https://awslike6-web.github.io/kids-school/`로 시작하고 그 뒤 경로가 **저장소에 실제로 있는 파일**이어야 함.
  - `question/choices/answer`를 적으면 멈춤.
- `zone`이 `영상확인`: 문항 셋 필수, `interactive_url`은 같은 자료 파일 또는 노션의 `단원영상` 행과 글자까지 같아야 함(없으면 경고).
- 같은 화면 열쇠에 `단원영상`이 4개 이상이면 경고.
- 선택지에 없는 구역 경고는 그대로 두되, `단원영상`·`영상확인`은 처음 등록 때 노션이 선택지를 새로 만든다는 안내로 바꾼다.

## 5. 링크 점검 도구 (`scripts/check_video_links.py`, 새로 만듦)
- 기본: 노션 CURRICULUM_DB에서 `구역 = 단원영상` 그리고 `미디어 URL 비어 있지 않음` 행을 **읽기만** 한다. `--file <자료 JSON>`이면 그 파일의 `단원영상` 항목만.
  - `미디어 URL` 조건만 걸고 구역을 나중에 거르면 노션이 페이지 경계에서 행 하나를 빠뜨렸다(2026-11-17, 320건 중 `단열재의 원리` 누락). 그래서 구역 필터를 함께 건다.
  - `단원영상` 선택지가 아직 없는 DB는 노션이 400을 낸다. 점검 도구는 이를 "영상 행 0개"로 본다(화면 부품은 §3-2대로 주소 하나로만 조회하니 영향 없음).
- 영상마다 `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={ID}&format=json` 조회:
  `200` = 정상, `401`/`403` = 퍼가기 막힘(유튜브에서 열기만 됨), `404` = 삭제·비공개, 그 밖 = 확인 실패.
- 한계: 연령·지역 제한 영상은 oEmbed가 `200`을 주고 화면에서만 막힐 수 있다. 그래서 화면은 [유튜브에서 열기]를 항상 둔다(§3-4-3).
- 함께 검사: `인터랙티브 URL`이 배포 주소 접두어로 시작하고 저장소에 그 파일이 있는가(부모가 노션에서 손으로 고친 주소의 공백·끝 `/` 잡기). 틀리면 상태 `화면 주소 틀림`.
- 출력: `제목 | 화면 열쇠 | ID | 상태` 표 + 요약 한 줄. 정상이 아닌 것이 있으면 종료코드 1.
- 노션 통신은 `register_voca.py`의 공용 함수를 쓴다. 요청 사이 0.3초 쉼. 학생 이름·개인 정보는 외부로 보내지 않는다(영상 ID만).

## 6. 과학 실험실 14개 이전 (1차 적용)

### 6-1. 자료 (`scripts/data/curriculum/science_5-2_{2,3,4}.json`에 `단원영상` 항목 추가)
| 단원 | 화면 | 영상 ID |
| :--- | :--- | :--- |
| 2. 날씨와 우리 생활 | `science_cloud_lab.html` | `nigzeqE0NvY` |
| 2 | `science_wind_lab.html` | `4V_7h0BRsK4` |
| 2 | `science_dew_fog_lab.html` | `ROjo_rnyAl8` |
| 2 | `science_hygrometer_lab.html` | `mNnO_y6xWZ4` |
| 3. 열과 우리 생활 | `science_thermometer_lab.html` | `vhzXePTRvfY` |
| 3 | `science_conduction_lab.html` | `aSOBt24wxRk` |
| 3 | `science_liquid_convection_lab.html` | `I-S_3s_FUKE` |
| 3 | `science_gas_convection_lab.html` | `KbBeiqJVAKM` |
| 3 | `science_insulation_lab.html` | `_fRlOk-jNCE` |
| 4. 자원과 에너지 | `science_wind_turbine_lab.html` | `cbcelOlDFMI` |
| 4 | `science_resource_finite_lab.html` | `04PnZ7YXbM0` |
| 4 | `science_renewable_energy_lab.html` | `CIxhlYjgJZI` |
| 4 | `science_energy_efficiency_lab.html` | `Mw7KrW3sIow` |
| 4 | `science_eco_house_lab.html` | `cvh-D_ScKgs` |

- 제목은 각 iframe의 `title` 속성, 출처는 화면에 적힌 채널 이름(없으면 비움). 핵심 3줄·확인 문제는 1차에서 넣지 않는다(화면에 이미 관찰 포인트·3컷 요약·퀴즈가 있음).
- 단원 칸 원문은 기존 자료 파일의 `unit`과 같게.

### 6-2. 화면 (영상 부분만 바꾸고 나머지는 그대로)
- **A형** (cloud·wind·dew_fog·hygrometer): `.video-frame-wrap`(iframe)과 머리줄의 "YouTube 앱/새 창에서 보기" `<a>`를 지우고 그 자리에 `<div class="video-unit" data-video-unit="…">`. 관찰 포인트 안의 "영상이 재생되지 않을 경우 위의 버튼…" 안내 줄은 지운다(부품이 [유튜브에서 열기]를 그림).
- **B형** (나머지 10개): `.video-frame-wrap`과 `.yt-fallback-bar`를 지우고 그 자리에 부품 div. 3컷 요약 아코디언·출처 배지·섹션 머리는 그대로.
- 각 화면에 `video-unit.css`·`video-unit.js` 두 줄 추가(상대 경로). 화면의 `.video-frame-wrap`·`.yt-fallback-bar` CSS는 쓰는 곳이 없어지면 지운다(`science_lab_common.css`, `science_cloud_lab.css`, `science_wind_lab.css`, dew_fog·hygrometer 인라인 `<style>`).
- 이전 뒤 `kids/` 아래 HTML·JS에 `youtube.com/embed`·`youtube-nocookie.com/embed`가 남지 않아야 한다(과학 실험실 기준, 시험으로 지킴).

### 6-3. 순서 (운영 DB 보호)
1. 부품·등록기·점검 도구·시험 작성 → `node --test` 전부 통과.
2. 등록기 **미리보기**로 14행 확인 → 사용자 승인 → `--apply` (새 행만 만듦, 기존 행 안 건드림).
3. `check_video_links.py`로 14개 상태 확인.
4. 쓰기 차단 미리보기 서버(`kids-school-guarded`)에서 A형 1개·B형 1개 화면을 열어 썸네일 → 재생 → 유튜브 열기 링크 확인.
5. 노션 행이 먼저 들어가야 화면을 배포할 수 있다(반대로 하면 배포된 화면에서 영상이 사라짐).

### 6-4. 진행 기록 (2026-11-16)
- [x] 1. 부품·CSS·시험(Hydrogen 초안 4개 동시 → Claude 검토), 등록기 검사, 점검 도구, 실험실 14개 마크업 교체·옛 CSS 삭제. 시험 전체 통과, `verify_contracts` ALL PASS.
- [x] Argon 명세 검토 10건 반영, Argon 코드 검토 8건 중 4건 반영(API 재시도 시 script·래퍼 중복, 보기 섞기 부품 실패 기억, `new URL` 예외 시 빈 문제판, 첫 문제 전 '완료' 노출·연타). 나머지 4건은 해당 없음(오류 화면은 캐시 없을 때만이라 플레이어 없음, 보기는 `rowsToUnit`이 거름, 캐시 만료 없음은 명세 결정).
- [x] 미리보기에서 찾은 것: ① 노션 select 필터에 없는 선택지 → 400 (조회를 화면 주소 하나로 바꿈, §3-2) ② 어두운 실험실에서 캡션이 안 보임(OS 다크 모드 대신 화면 색 상속) ③ ▶ 버튼이 썸네일 밑에 깔림(z-index).
- [x] 2. 등록기 미리보기: 신규 14행(2단원 4·3단원 5·4단원 5), 기존 행 변경 0.
- [x] 3. 링크 점검 14/14 정상(oEmbed 200).
- [x] 4. 미리보기 서버(전도 B형·구름 A형, 375px 폭 포함): 노션 행이 없을 때 조용히 숨김, 모의 행으로 썸네일→API 플레이어(nocookie)→끝 덮개→확인 문제(오답 노란 안내·격려음 → 정답 칭찬음 → 완료 보상음) 확인. 끝 덮개는 미리보기 창에서 영상 끝까지 넘기기가 안 되어 덮개 모양만 확인(코드 경로는 상태 0 처리 확인).
- [x] 2-1. `--apply`로 14행 실제 등록 (2026-11-17, 사용자 승인): 만듦 14(2단원 4·3단원 5·4단원 5), 고침 0, 기존 행 변경 0. 다시 미리보기하면 신규 0.
- [x] 3-1. 노션 기준 링크 점검 14/14 정상. 처음엔 13개로 나와 점검 도구 조회를 구역 필터 포함으로 고침(§5).
- [x] 5. 노션 등록 뒤 화면 배포: 커밋 `078e5ed`, 2026-11-17 푸시.

## 7. 1차 범위 밖 (다음 판)
- 영상 시청·확인 문제 완료 보상(💎/🍬)과 학습일지 기록 — 보상 경제 설계와 함께.
- 사회·국어 등 다른 과목방의 "📚 단원 동화 도서관" 카드에 영상 단원 섞기(카드 목록 쪽 계약 필요).
- 점검 도구를 GitHub Actions 월간 실행으로 돌리기.
- 실험실 화면에 남은 3컷 요약·관찰 포인트를 노션 `핵심 쓰임새/설명`으로 옮기기.
- 기타 과목(도덕·실과·음악) "교양" 과목 키 추가 — 별도 작업.

## 8. 시험 (`tests/video-unit.test.mjs`)
- `parseYouTubeId`: 표준형·짧은형·embed·nocookie·shorts·쿼리 섞인 주소 → ID, 잘못된 주소·10자 ID → `null`.
- `buildQuery`: 배포 주소 equals 하나만(select 필터 없음) + 생성 순 정렬.
- `rowsToUnit`: 영상/문항 분리, 요약 ` | ` 분할(최대 3), 보기 줄바꿈 분할, 정답 1→0, ID 없는 영상 행 건너뜀.
- 캐시: 캐시 있으면 fetch 전에 그려짐 + fetch 1회 / 같은 결과면 다시 안 그림 / 다른 결과면 다시 그림·캐시 갱신 / 0건이면 캐시 삭제·숨김 / fetch 실패 + 캐시 → `cache` / 둘 다 없음 → `none`.
- API 싣기: `loadYouTubeApi()`를 두 번 불러도 script 태그 1개·같은 Promise, 기존 `onYouTubeIframeAPIReady`도 불림, 5초 초과 시 reject.
- 지킴이: 과학 실험실 14개 HTML에 `youtube.com/embed`·`youtube-nocookie.com/embed`가 없고, 각각 `data-video-unit` 값이 자기 파일 경로와 같으며 `video-unit.js`를 싣는다.
- `quiz-choices-guard`를 통과한다(부품이 `QuizChoices`를 씀).
