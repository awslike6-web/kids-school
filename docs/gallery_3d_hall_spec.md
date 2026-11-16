# 🏛️ 꿈나무 갤러리 3D 전시관 명세서

> **문서 버전**: v1.0 (2026-11-16)
> **상태**: 구현 완료 (2026-11-16). 설계·검증: Claude, 초안: 안티그래비티(Argon 명세·코드 검토, Hydrogen 코드)
> **근거**: 노션 통합 개발 현황판 카드 「3D 전시장」, `docs/gallery_archive_spec.md`, 갤러리 OSMU 순서(틀린그림찾기 → 캐릭터 런너 → 3D 전시관).
> **기기**: 안드로이드폰(세로 360×800 안팎), 태블릿, PC. 셋 다 같은 조작이 되어야 한다.

---

## 1. 목표 (A)
갤러리 목록 화면에서 `🏛️ 3D 전시관` 버튼을 누르면 화면 전체를 덮는 3D 전시관이 열린다. 지금 필터(성장 작품/특별한 날, 작가, 분류)에 맞는 작품이 벽에 액자로 걸려 있고, 아이는 화면을 끌어 둘러보고, 바닥을 눌러 걸어가고, 액자를 누르면 액자 앞으로 다가간 뒤 기존 상세 창(`openDetailModal(id)`)이 열린다. `◀ 이전 작품 / 다음 작품 ▶` 버튼만 눌러도 전부 관람할 수 있다.

보기 전용이다. 노션·보석·사탕·경험치·등록 도구·`kids-archive`와 연결하지 않는다.

## 2. 범위 (S)
| 파일 | 내용 | 줄 수 목표 |
| :--- | :--- | :--- |
| `kids/common_space/gallery-3d-layout.js` (신규) | 화면과 무관한 계산만. `window.Gallery3DLayout` | 200~350 |
| `kids/common_space/gallery-3d-scene.js` (신규) | 장면 짓기: CFG·THEMES, 벽·바닥·간판·액자·이름표 그림. `window.Gallery3DScene` | 약 240 |
| `kids/common_space/gallery-3d-hall.js` (신규) | 상태·조작·사진 불러오기·열고 닫기. `window.Gallery3DHall` | 500~750 (상한 800 미만) |
| `kids/common_space/gallery-3d.css` (신규) | 전시관 덮개 화면·버튼 | 100~250 |
| `kids/common_space/gallery.html` | 버튼 1개, CSS 1줄, 스크립트 2줄 | |
| `kids/common_space/gallery_controller.js` | 필터 결과 함수 분리, 전시관 열기 연결 | |
| `tests/gallery-3d-hall.test.mjs` (신규) | 계산 모듈 시험 + 엔진 정적 규칙 시험 | |
| `kids/core/CORE_CATALOG.md`, `docs/gallery_archive_spec.md` | 모듈 등록 | |

수정 금지: `kids-archive`, `kids/data/*.js`(등록 도구가 다시 쓰는 파일), 다른 과목 모듈, Worker, 노션.

## 3. 계산 모듈 계약 — `Gallery3DLayout` (D)
IIFE, DOM·`fetch`·저장소를 쓰지 않는다(node `vm`에서 그대로 실행되어야 함). 공개 객체는 `Object.freeze`. 단위는 미터, 각도는 라디안.

### 3-1. 좌표와 상수 (`Gallery3DLayout.CONST`)
- 복도는 하나의 긴 상자다. 입구 z=0, 안쪽으로 갈수록 z가 **음수**로 커진다. 폭 `HALL_WIDTH = 8`(x는 −4~+4), 높이 `HALL_HEIGHT = 4`, 눈높이 `EYE_HEIGHT = 1.45`.
- 액자 간격 `SPACING = 3.2`. 액자는 왼쪽 벽(x = −4 + 0.05)과 오른쪽 벽(x = +4 − 0.05)에 번갈아 건다: 입력 순서 i가 짝수면 왼쪽, 홀수면 오른쪽, 두 점이 같은 z를 쓴다. `z = −(START_GAP + floor(i/2) × SPACING)`, `START_GAP = 4`.
- 전시실: `PER_ROOM = 10`점씩 묶는다(입력 순서 그대로). `opts.perRoom`이 홀수면 하나 큰 짝수로 올리고, 2보다 작거나 숫자가 아니면 10(한 쌍이 두 방에 갈라지지 않게). 전시실 k는 작품 k×10 ~ k×10+9를 담는다. 전시실 사이에는 벽을 세우지 않고, 천장에 매단 간판(아치)과 바닥 띠로만 구분한다(충돌 계산을 단순하게 하려고).
- 액자 중심 높이 `FRAME_CENTER_Y = 1.7`, 최대 크기 `FRAME_MAX_W = 1.8`, `FRAME_MAX_H = 1.6`.
- 복도 끝: 마지막 액자 z에서 `END_GAP = 4` 더 간 곳에 끝벽.

### 3-2. 함수
| 함수 | 입력 → 출력 |
| :--- | :--- |
| `buildLayout(items, opts?)` | `items`: `[{ id, title, caption, date, imageUrl, hasCutout, characterUrl }]` (컨트롤러가 만든 전시용 항목, 순서 = 관람 순서). `opts.perRoom`(기본 10). → `{ frames, rooms, bounds, start }` |
| `fitFrame(aspect, maxW = 1.8, maxH = 1.6)` | 사진 가로/세로 비율 → `{ width, height }` (둘 다 최대값 이하, 비율 유지, 한쪽은 최대값과 같음). aspect가 0·음수·NaN·Infinity면 정사각 `{ width: min(maxW,maxH), height: min(maxW,maxH) }` |
| `viewpointFor(frame, distance?)` | 액자 정면 `distance`(기본 2.6)m 앞, 눈높이에서 액자를 바라보는 `{ x, z, yaw }` |
| `clampPosition(x, z, bounds)` | 걸을 수 있는 영역 안으로 자른 `{ x, z }` |
| `planTextures(frames, pos, loadedIds, budget)` | 지금 위치 `{x,z}`에서 가까운 순으로 → `{ load: [id…], unload: [id…] }` |
| `stepIndex(current, dir, count)` | 길잡이 버튼용. `current`가 −1(아직 안 고름)이고 dir=+1이면 0. 끝에서 멈춘다(0 미만·count 이상으로 안 감). count=0이면 −1 |
| `roomLabel(dates)` | `'YYYY-MM-DD'` 문자열 배열 → `"2026년 10월"`(최소·최대가 같은 달) 또는 `"2026년 9월 ~ 10월"`(같은 해) 또는 `"2025년 12월 ~ 2026년 1월"`. 형식이 맞지 않는 값은 빼고, 남는 게 없으면 `""` |

### 3-3. `buildLayout` 결과
- `frames[i]` = `{ id, index: i, roomIndex, side: 'left'|'right', x, y, z, rotY, width, height, title, caption, imageUrl, hasCutout, characterUrl }`
  - 왼쪽 벽 액자 `rotY = +π/2`(오른쪽 +x를 바라봄), 오른쪽 벽 `rotY = −π/2`.
  - 처음 `width/height`는 `fitFrame(1)` 값. 사진을 불러온 뒤 엔진이 실제 비율로 다시 맞춘다.
  - `title`·`caption`은 그대로 넘기되 `undefined`·`null`은 `""`.
- `rooms[k]` = `{ index: k, label: roomLabel(그 방 작품 날짜), zStart, zEnd, firstIndex, lastIndex }` (zStart > zEnd, 즉 zStart가 입구 쪽). 경계는 첫 작품 z + SPACING/2 ~ 마지막 작품 z − SPACING/2, 첫 방의 zStart는 0, 마지막 방의 zEnd는 끝벽 z.
- `bounds` = `{ minX: −4 + 0.7, maxX: 4 − 0.7, minZ: 끝벽 z + 0.7, maxZ: 2 }` (입구 뒤로 2m까지만).
- `start` = `{ x: 0, z: 1.5, yaw: 0 }` (yaw 0은 −z, 즉 복도 안쪽을 봄. yaw가 커지면 왼쪽으로 돈다: 바라보는 방향 = `(−sin yaw, −cos yaw)`).
- items가 비어 있으면 `frames: []`, `rooms: []`, 끝벽은 z = −START_GAP − END_GAP.

### 3-4. `planTextures` 규칙 (사진 메모리 관리)
- 거리 = 액자 (x,z)와 pos의 평면 거리. 가까운 순 정렬, 같으면 index 작은 순.
- `load` = 가까운 `budget`개 중 `loadedIds`에 없는 것(가까운 순).
- `unload` = `loadedIds` 중 가까운 `budget + 4`개 안에 들지 못한 것(되풀이 깜빡임을 막는 여유 4).
- 입력 배열을 바꾸지 않는다. `loadedIds`는 배열 또는 Set을 받는다.

### 3-5. `viewpointFor` 규칙
- 왼쪽 벽 액자: 시점 x = frame.x + distance, z = frame.z, yaw = +π/2 (−x 쪽을 봄).
- 오른쪽 벽: x = frame.x − distance, yaw = −π/2.
- 결과는 `clampPosition`을 거치지 않는다(distance 2.6이면 복도 안).

## 4. 3D 엔진 계약 — `Gallery3DHall` (D)
IIFE. 공개: `window.Gallery3DHall = Object.freeze({ open, close, isOpen, debugInfo })`.

### 4-1. `open(options)` → `Promise<boolean>`
`options` = `{ items, theme, heading, isBlocked, onSelect, onBackWhileBlocked, onClose }`
- `items`: 3-2의 전시용 항목 배열(엔진은 `Gallery3DLayout.buildLayout`으로 배치).
- `theme`: `'neon'` | `'pastel'`.
- `heading`: 위쪽 바에 쓸 제목 문자열.
- `isBlocked()`: 다른 창(상세 창)이 떠 있으면 true. true인 동안 키보드·포인터 입력을 무시하고 그리기를 멈춘다.
- `onSelect(id)`: 액자를 눌러 다가간 뒤 부른다.
- `onBackWhileBlocked()`: 상세 창이 떠 있을 때 안드로이드 뒤로가기를 누르면 부른다(컨트롤러가 상세 창을 닫음). 전시관은 닫지 않는다.
- `onClose()`: 전시관이 닫힌 뒤 부른다.
- 이미 열려 있으면 아무것도 하지 않고 `false`. 열 때마다 세션 번호를 올리고, `open()` 안의 비동기 구간(`import()`, `document.fonts?.ready`) 뒤마다 세션이 그대로인지 확인한다. 그 사이 `close()`되었으면 만든 자원을 정리하고 `false`. 성공하면 `true`. WebGL이 없거나 Three.js를 못 불러오면 덮개에 안내 문구와 `목록으로` 버튼만 보이고 `false`.

### 4-2. Three.js 불러오기
- `import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js')` 한 번만(약속을 보관해 재사용). 버전 고정, 다른 주소 금지. 갤러리 목록 화면에서는 불러오지 않는다.
- 실패하면 4-1의 안내 화면.

### 4-3. 덮개 화면 구조 (DOM, `innerHTML`에 작품 자료를 넣지 않는다 — 제목 등은 `textContent`)
```
div#gallery3dOverlay.g3d.g3d--{theme}  (position fixed, inset 0, z-index 900)
  div.g3d-stage                         (캔버스가 들어감, touch-action none)
  div.g3d-topbar
    span.g3d-heading                    (heading)
    span.g3d-room                       (지금 서 있는 전시실 간판 글자)
    button.g3d-close  "✕ 목록으로"
  div.g3d-hint  "화면을 끌어 둘러보고, 바닥을 눌러 걸어가요. 액자를 누르면 크게 봐요"  (처음 6초 또는 첫 조작 뒤 사라짐, class g3d-hint--hide)
  div.g3d-bottombar
    button.g3d-prev  "◀ 이전 작품"
    span.g3d-counter "3 / 41"  (아직 안 고르면 "– / 41")
    button.g3d-next  "다음 작품 ▶"
  div.g3d-status                        (불러오는 중·오류 안내, 평소 hidden)
```
- 상세 창(`.modal-overlay`, z-index 1000)이 위에 떠야 한다.
- 열 때 `document.body`에 `g3d-open` 클래스(페이지 스크롤 막기), 닫을 때 뺀다.

### 4-4. 장면
- `renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })`, `setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))`, `outputColorSpace = SRGBColorSpace`. **그림자 금지**(`shadowMap.enabled`, `castShadow`, `receiveShadow`를 쓰지 않는다).
- 빛: `HemisphereLight` 또는 `AmbientLight` 1개 + `DirectionalLight` 1개. `Fog`(테마 배경색, 가까이 8 / 멀리 30).
- 카메라: `PerspectiveCamera(65, w/h, 0.1, 60)`, 위치 (x, EYE_HEIGHT, z), 회전 순서 `'YXZ'`, `rotation.y = yaw`, `rotation.x = pitch`(±0.35 제한).
- 바닥·천장·양쪽 벽·입구 벽·끝벽: `PlaneGeometry` + `MeshLambertMaterial`(천장은 `MeshBasicMaterial`도 됨). 전시실마다 바닥 띠(얇은 평면)와 천장 아래 간판(CanvasTexture에 `rooms[k].label`, 비어 있으면 `"전시실 k+1"`).
- 액자 하나 = `Group`(위치·rotY는 layout 값): 테두리(얇은 `BoxGeometry`, 테마 색), 매트(평면, 테두리보다 살짝 작게), 그림(평면, `MeshBasicMaterial`, `hasCutout`이면 `transparent: true`), 이름표(그림 아래 평면, CanvasTexture 512×128에 제목 1줄(넘치면 말줄임)·caption 1줄). 그림 평면에는 `userData.frameIndex`.
- 기하(geometry)는 단위 평면·단위 상자를 하나씩 만들어 공유하고 **각 Mesh의 `scale`·`position`**으로 크기를 맞춘다. `Group.scale`은 늘 (1,1,1)(이름표 글자·테두리 두께가 찌그러지지 않게). 이름표는 그림 크기와 무관하게 고정 크기(1.2×0.3), 그림 아래 0.12m.
- 캐릭터: `characterUrl`이 있으면 `Sprite`(높이 1.1m, 폭은 사진 비율대로, `sprite.center.set(0.5, 0)`, y = 0으로 바닥에 섬). 위치는 액자 기준 입구 쪽(z + 1.3), 벽에서 복도 안쪽으로 0.6m. 액자 사진과 같이 불러오고 같이 내린다(내릴 때 map dispose, `visible = false`). Group 밖 장면에 직접 둬도 된다.

### 4-5. 테마 (`THEMES`, 엔진 안 상수)
| | `neon` | `pastel` |
| :--- | :--- | :--- |
| 배경·안개 | `#1a1030` | `#fff8f0` |
| 벽 | `#2b1d4a` | `#fdf6ec` |
| 바닥 | `#1f1638` | `#f3e3d3` |
| 액자 테두리 | `#00ff9d` | `#ff85a2` |
| 매트 | `#0f0a1f` | `#ffffff` |
| 이름표 글자 | `#e8fff6` | `#5a3a44` |
| 간판 | 글자 `#00ff9d`, 바탕 `#120b24` | 글자 `#ff6f91`, 바탕 `#fffdf9` |
캔버스 글꼴은 `'Jua', sans-serif`(페이지가 이미 불러옴). 글자를 그리기 전에 `document.fonts?.ready`를 기다린다(실패해도 진행).

### 4-6. 사진 불러오기
- `new Image()`, `crossOrigin = 'anonymous'`, 주소는 그대로(쿼리 추가 금지). 다 받으면 긴 변 1024px 이하로 캔버스에 줄여 `CanvasTexture`(colorSpace SRGB). 그림 평면 크기를 `fitFrame(실제 비율)`로 다시 맞추고 테두리·매트·이름표 위치도 따라 맞춘다.
- 동시에 3장까지만 받는다(나머지는 대기열).
- 받기 전·실패 시: 테마 색 바탕에 `"🖼️"` 와 `"불러오는 중"`/`"사진을 못 불러왔어요"`를 그린 작은 CanvasTexture(종류별 1개를 공유). **공유 자리표시 텍스처는 내릴 때 dispose하지 않고 `close()` 마지막에 한 번만** dispose한다.
- CORS는 확인됨(raw.githubusercontent·jsdelivr 모두 `Access-Control-Allow-Origin: *`). 실패해도 `crossOrigin` 없이 다시 받지 않는다(오염된 그림은 WebGL 텍스처로 못 쓴다). 실패 = 오류 자리표시.
- 예산: 화면 짧은 변 < 700px(폰)이면 14장, 아니면 24장. 위치가 2m 넘게 바뀔 때마다(또는 활공이 끝났을 때) `planTextures`를 부른다. 이때 `loadedIds`에는 **불러온 것 + 받는 중(pending)**을 넣는다(중복 요청 방지). 대기열은 넣지 않는다(넣으면 `load`에서 빠진 뒤 대기열 교체로 사라진다).
  - `load` 결과로 **대기열을 통째로 바꾼다**(가까운 순). 이미 요청이 나간 pending은 건드리지 않는다.
  - `unload`에 든 것: 불러온 것이면 텍스처 `.dispose()` 후 자리표시로 되돌림, 대기열에 있으면 뺌, pending이면 '버림' 표시(도착하면 바로 버림).
- 엔진이 닫힌 뒤 도착한 사진은 아무것도 하지 않고 버린다.

### 4-7. 조작
- 포인터 이벤트(`pointerdown/move/up/cancel`) 하나로 마우스·터치를 함께 처리. 손가락 2개 이상은 무시.
- 지금 눌린 `pointerId`를 Set으로 관리한다. 2개 이상이 되면 진행 중인 끌기·누르기를 취소한다. 캔버스에 `setPointerCapture`.
- 끌기 판정: `pointerdown` 시작점에서 **누적 거리** `Math.hypot(x − startX, y − startY) > 6`px가 한 번이라도 되면 끌기(손을 뗄 때 누르기로 보지 않음).
- 끌기 회전(화면을 잡고 끄는 느낌): 직전 이벤트와의 차이 dx, dy로 `yaw += dx × 0.005`, `pitch = clamp(pitch + dy × 0.003, −0.35, 0.35)`.
- 누르기(끌기 아님): Raycaster로 그림 평면 → 그 액자 `viewpointFor`로 활공, 도착하면 `onSelect(id)`. 바닥 → 그 점(clampPosition)으로 활공, yaw는 그대로. 다른 것(벽 등) → 무시.
- 활공: 거리에 비례해 0.5~1.6초, ease-in-out, yaw는 가장 짧은 방향으로 보간. 활공 중 새 조작이 오면 새 목표로 바꾼다.
- 방향 벡터(평면 x,z): 앞 = `(−sin yaw, −cos yaw)`, 오른쪽 = `(cos yaw, −sin yaw)`. `←`는 yaw 증가, `→`는 yaw 감소.
- PC 키보드: `W/↑` 앞, `S/↓` 뒤, `A` 왼쪽·`D` 오른쪽 옆걸음, `←/→` 돌기. 속도 3m/s, 돌기 1.8rad/s. `isBlocked()`이거나 `event.target`이 `input/textarea/select/[contenteditable]`이면 무시. 키를 누르고 있는 동안만 움직이고 `blur`되면 전부 뗀 것으로 본다. 휠: 앞뒤 0.6m씩.
- 길잡이 버튼: `stepIndex`로 다음/이전 액자의 `viewpointFor`로 활공(상세 창은 열지 않음). 카운터 갱신.
- 모든 이동은 `clampPosition`을 거친다.
- 지금 서 있는 z가 속한 전시실 간판 글자를 `.g3d-room`에 쓴다(바뀔 때만).

### 4-8. 그리기와 절전
- `requestAnimationFrame` 고리는 **필요할 때만** 돈다: 활공 중, 키를 누르는 중, 끌기 중, 텍스처가 막 바뀐 직후 1프레임. 할 일이 없으면 고리를 멈추고, 입력이 오면 다시 시작한다(`requestRender()`).
- `document.hidden`이면 멈추고, 다시 보이면 1프레임 그린다.
- `isBlocked()`가 true면 그리지 않는다. 막히는 순간 진행 중인 활공·눌린 키·끌기를 모두 초기화한다. 막힌 동안 500ms마다 `isBlocked()`를 확인하는 타이머를 두고, 풀리면 타이머를 멈추고 1프레임 그린다(상세 창을 닫은 뒤 화면이 멈춰 보이지 않게). `focus`·포인터·키 입력이 와도 풀렸는지 확인한다.
- 크기 변화(`resize`, 화면 회전)에 맞춰 `setSize`·카메라 비율을 고치고 1프레임 그린다.
- `webglcontextlost`: 고리를 멈추고 `.g3d-status`에 "3D 화면이 멈췄어요. 목록으로 돌아가 다시 열어 주세요"와 함께 닫기 버튼은 그대로 둔다.

### 4-9. 뒤로가기 (안드로이드)
- 열 때 `history.pushState({ gallery3d: true }, '')`.
- `popstate`: 상세 창이 떠 있으면(`isBlocked()`) `onBackWhileBlocked()`를 부르고 `pushState`를 다시 해서 전시관은 남긴다. 아니면 전시관을 닫는다(이때 `history.back()`을 또 부르지 않는다).
- `popstate` 처리 순서(막혔을 때): 먼저 `history.pushState({ gallery3d: true }, '')`, 그다음 `onBackWhileBlocked()`.
- `✕ 목록으로`·`close()`로 닫을 때: 지금 `history.state?.gallery3d`이면 `history.back()`으로 한 칸 되돌린다. 이 `popstate`는 비동기로 늦게 오므로, 모듈 안에 **무시할 popstate 횟수**를 1 올려 두고, 도착하면 1 내리고 아무것도 하지 않는다(닫자마자 다시 연 전시관이 그 늦은 popstate에 닫히지 않게). `popstate` 듣기는 모듈 로드 때 한 번만 건다.

### 4-10. `close()`·정리
- rAF 취소, 모든 이벤트 해제(window·document·캔버스), 대기 중 사진 무시 표시.
- 장면 전체를 돌며 geometry·material·texture(`map` 포함, CanvasTexture 포함) `.dispose()`, 공유 자리표시 텍스처도 dispose.
- `renderer.dispose()`, `renderer.forceContextLoss()`, 캔버스와 덮개 제거, `body.g3d-open` 제거, 모든 참조 `null`.
- 그다음 `onClose()`. 두 번 불러도 오류 없음.
- `isOpen()` → boolean. `debugInfo()` → `{ open, frames, loadedTextures, pending, budget, position: {x,z,yaw} }`(검증용, 열려 있지 않으면 `{ open: false }`).

### 4-11. 금지
- 그림자, `speechSynthesis`, `localStorage`/노션/`fetch` 쓰기, 작품 자료를 `innerHTML`에 넣기, 다른 CDN, 전역 변수 추가(`Gallery3DHall` 하나만), `toISOString().slice`.

## 5. 갤러리 연결 (Claude 담당)
- `gallery.html`: 「성장 작품 / 특별한 날」 줄 오른쪽에 `button#btn3dHall.view-mode-btn` "🏛️ 3D 전시관". `gallery-3d.css` 링크, `gallery-3d-layout.js`·`gallery-3d-hall.js`를 `gallery_controller.js` 앞에 상대 경로로.
- `gallery_controller.js`: `renderGallery`의 필터를 `getFilteredGalleryItems()`로 뽑아 목록과 전시관이 같이 쓴다. `open3DHall()`이 전시용 항목을 만든다.
  - `title`, `date`, `imageUrl`(없으면 `galleryImages[0]`), `hasCutout`(`hasCutout` 또는 `.png`), `characterUrl` = `characters[0].spriteUrl`(성장 작품만), `caption` = `"{작가 표시} · {date}"`(작가 표시는 목록 카드와 같은 규칙: 공동·가족 → `온 가족`).
  - 테마: 작가 필터가 민수면 `neon`, 민서면 `pastel`, 나머지는 지금 프로필(민서 화면이면 `pastel`, 아니면 `neon`).
  - `heading`: 성장 작품 `"🏛️ 꿈나무 3D 전시관"`, 특별한 날 `"🏛️ 추억 3D 전시관"`.
  - 작품이 0점이면 전시관을 열지 않고 알림.
  - `isBlocked` = 상세 창 `#detailModal`이 보이는지(`style.display === 'flex'`). `onSelect` = `openDetailModal(id)`. `onBackWhileBlocked` = `closeDetailModal()`.

## 6. 시험 (T)
`tests/gallery-3d-hall.test.mjs` (node `vm`, 노션·네트워크 없음):
1. 계산 모듈이 DOM·`fetch`·`localStorage` 없이 로드되고 `Gallery3DLayout` 하나만 공개한다.
2. `buildLayout`: 0·1·10·11·25점에서 frames 수, 좌우 번갈아, 같은 쌍 같은 z, 방 수(10점씩), 모든 액자가 bounds 바깥 벽에 붙어 있음(|x| = 3.95), rooms 경계가 이어지고 겹치지 않음, start가 bounds 안.
3. `fitFrame`: 가로·세로·정사각·0·NaN·아주 긴 비율.
4. `viewpointFor`: 시점에서 액자까지 방향이 yaw의 바라보는 방향 `(−sin yaw, −cos yaw)`과 같고, 거리 = distance, bounds 안.
5. `clampPosition`, `stepIndex`(−1 시작, 양끝 멈춤, count 0), `roomLabel`(같은 달·같은 해·해 넘김·잘못된 값).
6. `planTextures`: 예산 지키기, 가까운 순, 여유 4, Set·배열 둘 다, 입력 불변.
7. 엔진 정적 규칙(소스 문자열 검사): 고정 CDN 주소, `Math.min(` + `1.75`, `forceContextLoss`, `dispose`, `castShadow`·`shadowMap`·`speechSynthesis`·`localStorage`·`innerHTML`·`toISOString` 없음, 줄 수 800 미만.
8. `gallery.html`이 세 파일을 상대 경로로 싣고, 계산 모듈이 엔진보다 먼저, 엔진이 `gallery_controller.js`보다 먼저 온다.
9. 전체 회귀: `node --test --test-concurrency=1 "tests/**/*.test.mjs"`.

화면 검증(Claude): `python scripts/guarded_preview_server.py`로 PC 크기·360×800에서 열기·끌기·바닥 누르기·액자 누르기 → 상세 창·뒤로가기·닫은 뒤 `debugInfo()`와 콘솔 오류. 실제 폰·태블릿 확인은 사용자가 한다.

## 7. 결과 (2026-11-16)
- 파일: `gallery-3d-layout.js` 393줄, `gallery-3d-scene.js` 240줄, `gallery-3d-hall.js` 717줄, `gallery-3d.css` 213줄, 시험 `tests/gallery-3d-hall.test.mjs` 34개. 전체 회귀 790개 통과.
- 진행: Argon이 명세를 검토해 12건 중 10건 반영(CORS 재시도는 오염된 그림을 WebGL에 못 써서 버림, 끌기 방향은 화면을 잡고 끄는 쪽으로 바꿈). Hydrogen이 네 파일 초안을 동시에 씀. 엔진 1차 초안은 1240줄(80칸 줄바꿈)이라 고칠 점 8개와 함께 다시 받았고(939줄), Claude가 장면 짓기 부분을 `gallery-3d-scene.js`로 떼어 냄. Argon 코드 검토로 대기열 증발(명세 오류였음)·늦은 콜백이 새 요청을 지우던 버그 2건 수정.
- 명세와 달라진 점:
  - 세로 화면은 가로 시야 70°에 맞춰 세로 시야를 65~95°로 넓힌다(65° 고정이면 폰에서 액자가 너무 작음).
  - 파스텔은 조명 세기 hemi 2.4·dir 0.5(r169의 새 조명 단위에서는 1.3으로 크림 벽이 회갈색으로 보였음).
  - 실패한 사진은 15초 동안 다시 요청하지 않는다(시험 중 raw.githubusercontent가 429를 줌).
  - 갤러리 CSS 분리 시험(`tests/gallery-css-split.test.mjs`)은 `gallery-3d.css`를 분리 묶음에서 빼도록 고쳤고, 링크는 `design-system.css` 앞에 둔다.
- 화면 확인(노션 쓰기 차단 미리보기, PC와 360×800):
  - 열기, 51점과 22점 배치, 테마 2종을 확인했다.
  - `다음 작품` 안내로 이동하고, 액자를 누르면 그 작품의 상세 창이 열린다.
  - 뒤로가기 1번에 상세 창만 닫히고, 2번에 전시관이 닫힌다.
  - 닫자마자 다시 열기, 닫은 뒤 캔버스 0개, 콘솔 오류 없음을 확인했다.
  - 앞으로 27m 걸어가면 사진을 26장 유지한다(예산 24 + 여유 4).
- **확인 못 한 것**: 미리보기 창이 가려져 있어 애니메이션이 느리게 돌았다. 실제 안드로이드폰·태블릿에서 터치 끌기·바닥 누르기·뒤로가기 버튼은 사용자가 확인해야 한다.
