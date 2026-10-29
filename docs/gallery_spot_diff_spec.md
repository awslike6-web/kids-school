# 🔍 꿈나무 갤러리 「틀린그림찾기」 작업 명세서 (Gallery Spot-Diff Spec)

> **문서 버전**: v1.0 (2026-10-29 작성, 구현 전)
> **상태**: 작업 지시서. 구현이 끝나면 이 문서를 기능 명세서로 고쳐 쓰고(§9), 상태를 「구현 완료」로 바꾼다.
> **상위 규칙**: `kids-school-main/GEMINI.md`(특히 §5 이미지 무결성, §6 오디오, §8 클린 코드·계약), `g:/master-tower/GEMINI.md`
> **연계 명세서**: [`docs/gallery_archive_spec.md`](gallery_archive_spec.md) (작품 등록 흐름·노션 저장 규칙)
> **작업자 참고**: 이 문서만 보고 작업할 수 있게 썼다. 그래도 코드를 쓰기 전에 `AGENTS.md`에 적힌 순서대로 `GEMINI.md`와 `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 작업 방식 (ASDST)

- 코드를 쓰기 전에 이 문서의 §1~§8을 기준으로 **실행 계획을 먼저 보고하고 승인을 기다린다.** 계획에는 고칠 파일, 파일별 예상 줄 수, 이 문서와 다르게 하려는 점(있다면 이유)을 적는다.
- 작업은 **A(공부방 저장소)**와 **B(관제탑 저장소)** 두 묶음이다. 저장소가 둘이라 커밋도 따로 한다.
  - A: `G:/master-tower/kids-school-main` (자체 git 저장소, 공부방)
  - B: `G:/master-tower` (관제탑 저장소, `scripts/sync_quick_upload.py`가 있음)
- A를 먼저 끝내고 시험까지 통과시킨 뒤 B를 한다.

---

## 1. A (Action · 목표)

갤러리 상세 모달에서 「틀린그림찾기」 데이터가 있는 작품을 열면 `[🔍 틀린그림찾기 도전]` 버튼이 보이고, 누르면 원본 그림과 바뀐 그림을 나란히 놓고 터치로 다른 곳을 찾는 놀이 화면이 열린다. 부모는 같은 화면의 관리자 모드에서 정답 좌표를 찍어 복사하고, 두 그림의 차이를 겹쳐 보며 의도하지 않은 차이가 없는지 검수한다. 등록은 기존 작품 등록 도구에 옵션 두 개를 더해 처리한다.

---

## 2. S (Scope · 범위)

### 새로 만드는 파일
| 파일 | 내용 | 목표 줄 수 |
| :--- | :--- | :--- |
| `kids/common_space/gallery-spot-diff.js` | 놀이 화면 + 관리자 좌표 추출기 + 판정 순수 함수. IIFE, 전역 `window.GallerySpotDiff` 하나만 노출. CSS는 이 파일이 `<style id="gsd-style">` 한 번만 넣는다 | 400~600 (상한 800 미만) |
| `tests/gallery-spot-diff.test.mjs` | 판정·검증 순수 함수 시험 + `gallery-data.js`의 `spotDiff` 계약 시험 | 제한 없음 |

> 모듈 위치를 `kids/core/`가 아니라 `kids/common_space/`로 하는 이유: 갤러리에서만 쓰는 모듈이고, 같은 폴더의 `gallery_controller.js`, `gallery-modal-manager.js`와 같은 구조다.
> CSS를 별도 파일로 만들지 않는 이유: `gallery.css`는 이미 860줄이라 더 붙이면 안 되고, 100줄 남짓한 CSS 파일을 따로 두면 파일만 잘게 쪼개진다.

### 고치는 파일 (A: 공부방)
| 파일 | 고칠 내용 | 한도 |
| :--- | :--- | :--- |
| `kids/common_space/gallery.html` | `gallery-modal-manager.js` 바로 앞에 `<script src="./gallery-spot-diff.js?v=...">` 한 줄. 상세 모달 버튼 영역(현재 `modalVideoBtn` 근처)에 `<button id="modalSpotDiffBtn">` 한 개 | 추가 10줄 이내 |
| `kids/common_space/gallery-modal-manager.js` | `openDetailModal`에서 `item.spotDiff`가 유효하면 버튼을 보이고 `GallerySpotDiff.open(item)`을 연결한다. `closeDetailModal`에서 `GallerySpotDiff.close()`를 부른다 | 추가 15줄 이내 (현재 590줄) |
| `scripts/build_gallery.py` | §3-2의 `spotDiff` 변환·검증 | |
| `kids/core/CORE_CATALOG.md` | §2-0-1 갤러리 절에 모듈 항목, 「회귀 시험 묶음」 절에 새 시험 한 줄 | |
| `docs/gallery_archive_spec.md` | 파일 맵 표에 새 모듈 행, 등록 명령 예시(§3)에 새 옵션, 새 절 「틀린그림찾기 등록」 | |
| `docs/gallery_spot_diff_spec.md` | 이 문서를 구현된 내용대로 고쳐 쓰기 | |

### 고치는 파일 (B: 관제탑)
| 파일 | 고칠 내용 |
| :--- | :--- |
| `scripts/sync_quick_upload.py` | `--diff-file`, `--diff-spots` 옵션 (§3-3) |

### 손대지 않는 것
- `kids-archive` 저장소 안의 기존 미디어 파일, 다른 과목 모듈, Worker 코드(`workers/minmin-notion/`)
- **노션**: 성장 갤러리 DB(`3dfa2711...`)에는 `spotDiff`용 속성이 없다. 노션으로 보내는 요청 본문에 `spotDiff`를 절대 넣지 않는다 (없는 속성을 하나라도 보내면 노션이 저장 전체를 거부함, `gallery_archive_spec.md` §6). `gallery-data-sync.js`도 고치지 않는다.
- 보석·사탕 보상, 학습일지(`STUDY_LOG_DB`) 기록: 이번 단계에서는 넣지 않는다. 갤러리 놀이로 보석을 벌게 하면 보상 경제가 흔들리므로 나중에 따로 정한다.
- `gallery.css` (860줄, 이미 상한 초과)

---

## 3. D (Data · 데이터 계약)

### 3-1. `kids/data/gallery-meta.json` (사람이 쓰는 원본)
기존 작품 항목에 선택 필드 `spotDiff`를 더한다. 필드가 없으면 지금과 똑같이 동작한다.

```json
"art_minsu_20261028_paldo_bibimmyeon": {
  "title": "...",
  "subImages": ["..."],
  "spotDiff": {
    "modifiedImage": "20261028_paldo_bibimmyeon_diff.jpg",
    "spots": [
      { "x": 0.25, "y": 0.40, "r": 0.08, "hint": "왼쪽 새우 꼬리" },
      { "x": 0.72, "y": 0.18, "r": 0.07, "hint": "뚜껑 글자 색" },
      { "x": 0.50, "y": 0.82, "r": 0.08, "hint": "계란 노른자 개수" }
    ]
  }
}
```

- `modifiedImage`: 바뀐 그림의 **파일명**. 원본처럼 `uploads/ex/갤러리/{민수|민서|.}/`에 둔다 (`subImages`와 같은 방식).
- `spots`: 3~5개. 좌표는 **원본 그림 기준 0~1 비율**이다.
  - `x`: 왼쪽 끝 0 → 오른쪽 끝 1, `y`: 위 0 → 아래 1
  - `r`: 판정 반지름. **그림의 짧은 변에 대한 비율**로 정의한다 (가로 길이 기준이 아님). 허용 범위 0.03~0.15
  - `hint`: 1~30자 한국어. 힌트 버튼과 읽어 주기에 쓴다

### 3-2. `scripts/build_gallery.py` → `kids/data/gallery-data.js` (화면이 읽는 결과)
빌더는 `spotDiff`를 아래처럼 바꿔 작품 객체에 넣는다. 검증에 실패하면 **`spotDiff`만 빼고** 작품 카드는 정상으로 만든 뒤 `⚠️ [spotDiff 제외] {art_id}: {이유}`를 출력한다. 빌드 전체를 멈추지 않는다.

```js
"spotDiff": {
  "modifiedImageUrl": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minsu/2026_elem_5/minsu_20261028_paldo_bibimmyeon_diff.jpg",
  "spots": [ { "x": 0.25, "y": 0.40, "r": 0.08, "hint": "왼쪽 새우 꼬리" } ]
}
```

빌더 규칙:
1. **단독 카드 제외**: `modifiedImage` 파일명은 `sub_image_to_parent`처럼 따로 모아 두고, 폴더를 훑을 때 단독 작품 카드로 만들지 않는다. 지금 `subImages`를 건너뛰는 방식과 같다.
2. **변환**: 서브 이미지 변환과 같은 순서로 처리한다. `ImageOps.exif_transpose` → RGB 변환 → JPEG(품질 85)로 `kids-archive/assets/media/{sub_dir}/{sub_path}/{sub_dir}_{파일베이스}.jpg`에 저장한다. 대신 1200px 줄이기 대신 **원본 작품의 결과물과 픽셀 크기가 똑같도록** 맞춘다. 원본 결과 파일을 `Image.open`으로 열어 크기를 읽고 `LANCZOS`로 그 크기에 맞춘다.
3. **비율 검사**: 회전 보정 후 바뀐 그림의 가로세로 비율이 원본과 1% 넘게 다르면 늘려서 맞추지 말고 `spotDiff`를 제외한다. 비율이 다르면 좌표가 어긋나고 그림이 일그러진다.
4. **누끼 작품 제외**: `hasCutout`이 `true`인 작품은 이번 단계에서 `spotDiff`를 지원하지 않는다 (투명 PNG라 비교 화면이 어색함). 경고 후 제외한다.
5. **좌표 검증**: `spots`는 3~5개, `0 ≤ x,y ≤ 1`, `0.03 ≤ r ≤ 0.15`, `hint`는 1~30자 문자열이어야 한다. 하나라도 어기면 제외한다. 숫자는 소수 셋째 자리로 반올림해 출력한다.
6. **파일 없음**: `modifiedImage` 파일이 업로드 폴더에도, 아카이브에도 없으면 제외한다.
7. `archive-master-data.js`(kids-archive 쪽 포트폴리오)에는 `spotDiff`를 넣지 않는다. 그쪽은 영구 성장 기록이라 놀이 데이터와 섞지 않는다.

### 3-3. 등록 도구 `scripts/sync_quick_upload.py` (B: 관제탑)
```bash
python -X utf8 scripts/sync_quick_upload.py \
  --id "art_minsu_20261028_paldo_bibimmyeon" --author "민수" --title "..." \
  --diff-file "E:/Downloads/paldo_diff.jpg" \
  --diff-spots "E:/Downloads/paldo_spots.json"
```
- `--diff-file`: 바뀐 그림의 로컬 경로. `uploads/ex/갤러리/{민수|민서}/{원본베이스}_diff{확장자}`로 복사하고, `gallery-meta.json`의 `spotDiff.modifiedImage`에 그 파일명을 적는다.
- `--diff-spots`: **JSON 파일 경로**를 우선으로 받는다 (윈도 셸에서 JSON을 직접 따옴표로 넘기면 깨지기 쉬워서). 경로가 아니고 `[`로 시작하면 JSON 문자열로 읽는다. 내용은 §3-1의 `spots` 배열이다.
- 두 옵션 중 하나만 주면 기존 `spotDiff`의 나머지 값은 유지한다 (`register_meta_entry`의 `**existing` 병합 방식을 따름). 둘 다 없으면 `spotDiff`를 건드리지 않는다.
- 도구 안에서 §3-2-5와 같은 좌표 검증을 먼저 한다. 실패하면 메타를 쓰지 않고 이유를 출력한 뒤 종료 코드 1로 끝낸다.
- 노션 카드 Upsert(`upsert_notion_gallery_card`)의 속성·블록은 **바꾸지 않는다.**

### 3-4. 전역 인터페이스 `window.GallerySpotDiff`
```js
GallerySpotDiff.open(item, { viewer, onClose })
// item: gallery-data.js 작품 객체 (item.imageUrl = 원본, item.spotDiff = 3-2 형식)
// viewer: 'son' | 'daughter' | 'parent' — 생략하면 localStorage currentUser·currentUserName으로 정함
// 전체 화면 오버레이를 document.body에 붙인다. 이미 열려 있으면 먼저 닫는다.

GallerySpotDiff.close()          // 오버레이·리스너·ResizeObserver·rAF·타이머 모두 해제. 여러 번 불러도 안전
GallerySpotDiff.isValid(spotDiff) // §3-2-5 규칙 그대로. 모달 버튼 표시 여부에 사용

// 순수 함수 (DOM 없이 시험 가능해야 함)
GallerySpotDiff.fitRect(boxW, boxH, imgW, imgH)
// → { x, y, w, h }: 상자 안에 그림을 비율 유지로 꽉 맞춘(contain) 영역
GallerySpotDiff.toNormalized(px, py, rect)
// → { nx, ny } 또는 그림 바깥이면 null
GallerySpotDiff.hitTest(spots, nx, ny, rect, foundSet, minTouchPx = 22)
// → 맞힌 spot의 인덱스(아직 못 찾은 것 중 가장 가까운 것) 또는 -1
```

- 이 파일은 **처음 실행될 때 `document`를 건드리지 않는다.** 순수 함수만 정의하고, DOM 작업은 `open()` 안에서만 한다. 그래야 `tests/browser-sandbox.mjs`로 실을 수 있다.

---

## 4. S (Spec · 동작 규칙)

### 4-1. 판정 (가장 중요)
- 캔버스 크기와 그림 크기의 비율이 다르면 그림 주변에 빈 여백(레터박스)이 생긴다. 그래서 **터치 좌표 ÷ 캔버스 크기로 계산하지 않는다.** `fitRect`로 그림이 실제로 그려진 영역을 구하고, 그 영역 기준으로 `toNormalized`를 계산한다. 그림 바깥 여백을 터치하면 무시한다.
- 거리는 픽셀로 계산한다: `dx = (nx − x) × rect.w`, `dy = (ny − y) × rect.h`, `Math.hypot(dx, dy) ≤ max(r × min(rect.w, rect.h), minTouchPx)`이면 정답.
  - `minTouchPx`(기본 22 CSS px): 작은 폰에서 손가락이 닿기 어려운 아주 작은 정답 원을 보완한다.
- 원본과 바뀐 그림 중 **어느 쪽을 눌러도** 같은 방식으로 판정한다.
- 이미 찾은 곳을 다시 누르면 아무 일도 일어나지 않는다. 두 정답 원이 겹치면 못 찾은 것 중 가장 가까운 곳으로 판정한다.
- 입력은 `pointerdown` 하나로 받는다 (마우스·터치·펜 공통). 캔버스에 `touch-action: manipulation`을 준다.

### 4-2. 화면 배치
- 전체 화면 오버레이. 윗줄에 `✕ 닫기`, 제목, 진행 `찾은 곳 1 / 3`, `💡 힌트` 버튼이 있다.
- 두 그림의 배치는 **화면 방향이 아니라 공간에 따라** 정한다. 오버레이 본문의 가로세로 비율로 위아래 배치와 좌우 배치를 각각 계산해 보고, 그림이 더 크게 보이는 쪽을 고른다. 세로 폰에서는 보통 위아래, 가로 태블릿이나 PC에서는 보통 좌우가 된다. 위·왼쪽이 원본, 아래·오른쪽이 바뀐 그림이다.
- `ResizeObserver`로 크기 변화를 감지해 다시 배치하고 다시 그린다. 이미 찾은 표시는 비율 좌표로 저장해 두었으니 그대로 다시 그려진다.
- 캔버스 실제 해상도는 `CSS 크기 × min(devicePixelRatio, 2)`이다.
- 이미지는 `crossOrigin = 'anonymous'`로 불러온다 (관리자 차이 보기의 `getImageData`에 필요. `raw.githubusercontent.com`은 CORS를 허용함). 둘 중 하나라도 불러오지 못하면 "그림을 불러오지 못했어요" 안내와 닫기 버튼만 보이고 오류를 던지지 않는다.

### 4-3. 피드백 (에러리스)
| 상황 | 화면 | 소리 |
| :--- | :--- | :--- |
| 정답 | 두 그림의 같은 위치에 동그라미가 0.3초 동안 커지며 그려지고 그대로 남는다. 진행 숫자가 오른다 | `fairyPraise()` |
| 오답 | 누른 자리에 옅은 물결 원이 0.6초 퍼졌다 사라진다 | **없음** (매번 소리가 나면 시끄럽다) |
| 힌트 | 못 찾은 곳 하나(목록 순서상 첫 번째) 주변에 반짝이는 링이 2초 동안 깜박인다. 화면 위에 `hint` 글자를 띄운다 | `speakFairyTTS(hint)` |
| 모두 찾음 | 축하 오버레이 「다 찾았어요! 🎉」, `[다시 하기]` `[닫기]` 버튼 | `fairyReward('finish')` |

- 오답에 감점·하트·흔들기·빨간 X·경고음을 쓰지 않는다.
- 소리 함수는 `typeof fairyPraise === 'function'`인지 확인하고 부른다. 없으면 조용히 넘어간다. 브라우저 `speechSynthesis`를 직접 부르지 않는다 (`GEMINI.md` §6).
- 힌트 횟수는 제한하지 않는다.

### 4-4. 테마
- 테마는 작품을 그린 아이가 아니라 **지금 보고 있는 사람** 기준이다 (민서가 오빠 그림으로 놀 수도 있다).
  - `son` / 민수: 어두운 보라 바탕(`#1a1033` 계열), 정답 원 `#00ff9d`, 글자 밝은 색
  - `daughter` / 민서: 크림색 바탕(`#fff8f0` 계열), 정답 원 `#ff85a2`, 둥근 버튼
  - 부모: 민수 테마
- 버튼 글자는 민서(초1)도 읽을 수 있게 짧고 쉬운 말로 쓴다.

### 4-5. 관리자 모드 (부모용 좌표 추출기 + 차이 검수)
- **켜는 조건**: URL에 `admin=diff`가 있고, 지금 사용자가 `아빠` 또는 `엄마`(`window.currentUserName`)일 때만. 아이 계정에서는 URL을 붙여도 켜지지 않는다.
- 관리자 모드에서는 놀이 판정 대신 다음 기능이 동작한다:
  1. **좌표 찍기**: 바뀐 그림(또는 원본)을 누르면 그 자리에 번호 붙은 원이 생기고, 목록에 `{ "x": 0.xxx, "y": 0.yyy, "r": 0.08, "hint": "" }`가 추가된다. 반지름 슬라이더(0.03~0.15, 기본 0.08)로 마지막 원의 `r`을 바꾼다. 목록의 각 줄에서 힌트 입력과 삭제를 할 수 있다.
  2. **복사**: `[📋 spots 전체 복사]`를 누르면 §3-1 형식의 `spots` 배열 JSON(들여쓰기 2칸)을 복사한다. `navigator.clipboard.writeText`가 실패하면 선택된 상태의 `<textarea>`로 보여 준다. 이 JSON을 파일로 저장하면 `--diff-spots`에 그대로 쓸 수 있다.
  3. **차이 겹쳐 보기**: `[🔬 차이 보기]` 토글. 두 그림을 같은 크기로 그린 뒤 `getImageData`로 픽셀마다 RGB 차이를 구하고, 차이가 문턱값(기본 40, 슬라이더 10~120)보다 큰 픽셀을 바뀐 그림 위에 빨간 반투명으로 칠한다. **찍어 둔 원 밖에 빨간 덩어리가 보이면 AI가 의도하지 않게 바꾼 곳**이다. 이 그림은 다시 만들어야 한다.
  4. 차이 계산은 그림의 짧은 변을 최대 600px로 줄인 사본에서 한 번만 하고 결과를 캐시한다 (폰에서 멈추지 않게).
  - CORS 때문에 `getImageData`가 실패하면 "차이 보기를 쓸 수 없는 그림이에요" 안내만 띄운다.
- 관리자 모드에서도 노션이나 파일에 아무것도 쓰지 않는다. 결과는 클립보드로만 나간다.

### 4-6. 상세 모달 연결
- `openDetailModal(id)`에서 갤러리 작품이고(특별한 날 제외) `GallerySpotDiff.isValid(item.spotDiff)`가 참이면 `#modalSpotDiffBtn`을 보인다. 아니면 숨긴다.
- 버튼 글자: `🔍 틀린그림찾기 도전` (모든 곳을 찾은 적이 있어도 같은 글자. 기록 저장은 이번 범위가 아님)
- 관리자 모드 조건이 맞으면 `spotDiff`의 `spots`가 비어 있거나 유효하지 않아도 `modifiedImageUrl`만 있으면 버튼을 보인다 (좌표를 처음 찍을 때 필요). 이 경우는 빌더가 `spotDiff`를 내보내지 않으므로, 관리자는 로컬에서 `gallery-data.js`를 임시로 고쳐 찍는다. 이 절차는 §8에 적는다.
- 상세 모달을 닫으면 `GallerySpotDiff.close()`를 부른다.

### 4-7. 성능·정리
- 애니메이션이 있는 동안에만 `requestAnimationFrame`을 돌린다. 모든 애니메이션이 끝나면 루프를 멈춘다 (가만히 있을 때 CPU 0%).
- `close()`는 rAF, 타이머, `ResizeObserver`, 이벤트 리스너를 모두 해제하고 오버레이를 DOM에서 지운다. 이미지 참조도 끊는다.
- 모듈 전역 상태는 IIFE 안에만 둔다. `window`에는 `GallerySpotDiff` 하나만 추가한다.

---

## 5. T (Test · 합격 기준)

### 5-1. 명령 시험 (커밋 전 필수)
1. `node --test "tests/**/*.test.mjs"` 전부 통과. 새 `tests/gallery-spot-diff.test.mjs`는 `tests/browser-sandbox.mjs`의 `loadBrowserScripts(['kids/common_space/gallery-spot-diff.js'])`로 모듈을 싣고 다음을 확인한다:
   - `fitRect`: 가로로 긴 상자와 세로로 긴 상자 각각에서 그림이 가운데 오고 비율이 유지된다
   - `toNormalized`: 레터박스 여백을 누르면 `null`, 그림 네 모서리는 (0,0)·(1,1)
   - `hitTest`: 원 안쪽은 정답, 바깥쪽은 -1, 이미 찾은 곳은 건너뜀, 두 원이 겹치면 가까운 쪽, `r`이 아주 작을 때 `minTouchPx`가 적용됨, **가로세로 비율이 다른 그림에서 `r`이 짧은 변 기준으로 계산됨**
   - `isValid`: 개수 2개·6개, 좌표 범위 밖, `r` 범위 밖, 빈 힌트, 31자 힌트는 거짓. 정상 예시는 참
   - **계약 시험**: `kids/data/gallery-data.js`의 `DEFAULT_GALLERY_DATA`에서 `spotDiff`가 있는 모든 항목이 `isValid`를 통과하고 `modifiedImageUrl`이 `https://raw.githubusercontent.com/awslike6-web/kids-archive/main/`으로 시작한다 (지금은 0건이어도 통과)
   - 모듈을 실어도 `document`에 접근하지 않는다 (샌드박스에 `document`가 없어도 예외가 나지 않음)
2. 시험이 실제로 고장을 잡는지 한 번 확인한다: `r`을 가로 길이 기준으로 바꾸거나 레터박스 계산을 빼면 시험이 실패해야 한다. 확인 후 원래대로 되돌린다.
3. 관제탑 루트(`G:/master-tower`)에서 `python -X utf8 scripts/verify_contracts.py --mode git-diff --repo kids-school-main` → `[ALL PASS]` (이 스크립트는 공부방 저장소가 아니라 관제탑 저장소에 있음. B 작업 뒤에는 `--repo master-tower`로도 한 번 더)
4. 빌더 확인 (로컬에 `G:/master-tower/kids-archive`가 있을 때만): 시험용 작품 1건에 `spotDiff`를 넣고 `python -X utf8 scripts/build_gallery.py`를 돌린다. 정상 데이터는 `gallery-data.js`에 들어가고, 좌표 오류·비율 불일치·파일 없음은 `⚠️ [spotDiff 제외]`가 뜨고 카드는 그대로 나오는지 본다. **확인이 끝나면 시험용 메타·이미지·생성물을 모두 되돌린다** (`git checkout -- kids/data`, kids-archive의 새 파일 삭제). 가짜 시험 데이터를 커밋하지 않는다.

### 5-2. 화면 시험
- 서버는 반드시 `python scripts/guarded_preview_server.py`(포트 8767, 노션 쓰기 차단)로 띄운다. `python -m http.server`는 쓰지 않는다.
- 시험용 바뀐 그림은 기존 갤러리 그림 1장을 Pillow로 복사해 도형 3개를 그려 만든다. **작업 폴더 밖(임시 폴더)에 두고 커밋하지 않는다.** `gallery-data.js`에 임시로 `spotDiff`를 넣어 확인하고, 끝나면 `git checkout -- kids/data/gallery-data.js`로 되돌린다.
- 확인할 항목 (360×800, 1280×800 두 크기):
  1. 상세 모달에 버튼이 보이고, `spotDiff`가 없는 작품에는 보이지 않는다
  2. 360×800에서는 위아래, 1280×800에서는 좌우로 배치된다
  3. 정답 위치를 누르면 두 그림 모두에 원이 그려진다. 창 크기를 바꿔도 원이 같은 자리에 있다
  4. 레터박스 여백을 누르면 아무 반응이 없고, 오답 위치는 물결만 보인다
  5. 3곳을 모두 찾으면 축하 화면이 뜨고, 닫으면 오버레이가 DOM에서 사라진다
  6. 아이 계정에서 `?admin=diff`를 붙여도 관리자 모드가 켜지지 않는다. 아빠 계정에서는 켜지고, 좌표 복사와 차이 보기가 동작한다
  7. 콘솔 오류 0건. `window.__blockedWrites`가 비어 있다 (이 기능은 노션에 아무것도 쓰지 않아야 함)
- 소리는 함수가 불렸는지만 확인하면 된다 (`fairyPraise` 등을 감싸 호출 횟수 기록).

### 5-3. 보고
- 완료 보고에는 위 항목마다 통과·실패를 적고, 확인하지 못한 항목은 못 했다고 적는다 (`GEMINI.md` §5-4: 검수 없이 「완료」라고 쓰지 않음).
- 실제 아이 그림으로 만든 틀린그림 데이터는 이번 작업에 포함하지 않는다. 콘텐츠는 부모가 §8 절차로 따로 등록한다.

---

## 6. 커밋 단위 (권장)

| 순서 | 저장소 | 내용 |
| :--- | :--- | :--- |
| 1 | 공부방 | `feat(gallery): 틀린그림찾기 모듈·시험 추가` — 모듈, 시험, 모달·HTML 연결 |
| 2 | 공부방 | `feat(gallery): 빌더 spotDiff 변환·검증` — `build_gallery.py` |
| 3 | 공부방 | `docs(gallery): 틀린그림찾기 명세·카탈로그 갱신` |
| 4 | 관제탑 | `feat(gallery): 작품 등록 도구 --diff-file/--diff-spots` |

- `gallery.html`의 `?v=` 캐시 쿼리는 바뀐 스크립트만 새 값(`YYYYMMDD-HHMM`, KST)으로 올린다.
- 커밋마다 `node --test "tests/**/*.test.mjs"` 통과를 확인한다. 이 저장소는 `main` 푸시 때 GitHub Actions가 같은 시험을 돌린다.

---

## 7. 하지 말 것 (자주 하는 실수)

- 터치 좌표를 `캔버스 너비`로 나누기 (레터박스 때문에 어긋남, §4-1)
- `r`을 가로 길이 기준으로 계산하기 (세로로 긴 그림에서 원이 찌그러지고 판정이 틀림)
- 바뀐 그림을 원본과 다른 크기로 저장하거나 비율이 다른데 늘려서 맞추기 (§3-2)
- `spotDiff`를 노션 요청에 넣기, `gallery-data-sync.js` 고치기
- `gallery.css`에 스타일 추가하기
- `gallery-modal-manager.js`에 놀이 로직 넣기 (모달에는 버튼과 호출만)
- 루트 절대 경로(`/kids-school/...`) 쓰기. 상대 경로만 쓴다
- `.toISOString().slice(0,10)`으로 날짜 만들기 (캐시 쿼리 시간도 KST 헬퍼 사용)
- 가짜 그림이나 시험 데이터를 커밋하기

---

## 8. 부모용 콘텐츠 제작 절차 (구현 후 `gallery_archive_spec.md`로 옮김)

1. **바뀐 그림 만들기**: 원본 그림을 AI 이미지 편집기에 주고 "다른 곳은 하나도 바꾸지 말고, ①… ②… ③…만 바꿔 줘"라고 구체적으로 요청한다.
   - 민서용: 3곳, 크고 분명한 차이(색 전체 바꾸기, 물건 하나 없애기), `r` 0.10~0.12
   - 민수용: 4~5곳, 작은 차이(무늬, 개수, 방향), `r` 0.06~0.08
2. **좌표 찍기**: 로컬에서 `gallery-data.js`의 해당 작품에 `spotDiff.modifiedImageUrl`을 임시로 적는다 (로컬 파일 경로나 아카이브 주소). 아빠 계정으로 `gallery.html?admin=diff`를 열고 바뀐 곳을 찍은 뒤 힌트를 적고 `[📋 spots 전체 복사]` → `spots.json`으로 저장한다.
3. **차이 검수 (필수)**: `[🔬 차이 보기]`를 켜서 찍은 원 밖에 빨간 덩어리가 없는지 본다. 있으면 아이가 정답이 아닌 차이를 찾고 헷갈리므로 그림을 다시 만든다. 그 차이도 정답으로 넣을 만하면 좌표를 추가해도 된다.
4. **등록**: `gallery-data.js` 임시 수정을 되돌리고, 관제탑 루트에서 실행한다.
   ```bash
   python -X utf8 scripts/sync_quick_upload.py --id "art_..." --author "민수" --title "..." --diff-file "E:/Downloads/xxx_diff.jpg" --diff-spots "E:/Downloads/spots.json"
   ```
5. **확인**: 배포된 갤러리에서 직접 한 판 끝까지 해 본다.

---

## 9. 구현 후 문서 정리

- 이 문서의 맨 위 상태를 「구현 완료 (날짜)」로 바꾸고, §0·§5·§6처럼 작업 지시용인 절은 줄이거나 지운다. 실제 API, 데이터 계약, 동작 규칙만 남긴다.
- `CORE_CATALOG.md` §2-0-1에 `gallery-spot-diff.js` 항목을 추가한다 (위치, 전역 이름, 줄 수, `open/close/isValid` + 순수 함수, 로드 순서는 `gallery-modal-manager.js`보다 먼저).
- `gallery_archive_spec.md`에는 파일 맵 행, `--diff-file`/`--diff-spots` 설명, §8 절차를 추가하고 문서 버전을 올린다.
