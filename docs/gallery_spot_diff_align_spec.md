# 🧩 틀린그림찾기 AI 편집본 자동 맞춤·선택 합성

> 문서 버전: v2.0 (2026-10-29)
> 상태: 구현 완료. 실제 작품 등록·운영 노션 쓰기는 포함하지 않음.
> 상위 규칙: `GEMINI.md`, `../GEMINI.md`
> 선행 계약: [`gallery_spot_diff_spec.md`](gallery_spot_diff_spec.md)
> 부모 제작 절차: [`gallery_archive_spec.md` §7](gallery_archive_spec.md)

## 1. 목적과 구성

AI 편집본의 확대·이동·회전·작은 원근 차이를 원본 구도로 맞춥니다. 부모가 선택한 변화만 AI에서 가져오고 나머지는 원본으로 채워, 기존 등록 도구에 넣을 JPEG와 검수 자료를 만듭니다.

- `scripts/spot_diff_align.py`: `analyze`, `compose` CLI 및 배열 기반 처리 함수.
- 핵심 함수: `analyze_arrays(original, ai, threshold=40)`는 맞춤 배열·덮임·차이 덩어리·후보·보고서를 반환하고, `compose_arrays(analysis, spots, color_match=True)`는 결과 RGB 배열·알파·보고서·미선택 큰 변화 목록을 반환합니다. 실패한 합성의 결과 배열은 `None`입니다.
- `scripts/verify_spot_diff_align.py`: 외부 사진 없는 결정적 자체 시험. Node/Actions 묶음 밖에서 실행합니다.
- 좌표 검증은 `build_gallery.validate_diff_spots`를 importlib로 불러 재사용합니다. 빌더의 `run()`은 호출하지 않습니다.
- 기존 빌더·관제탑 등록 도구·브라우저 모듈·노션·아카이브 미디어는 수정하지 않습니다.
- 실행 중 네트워크·Worker·Git에 접근하지 않습니다. 등록은 검수 뒤 부모가 기존 도구로 수행합니다.

## 2. 실행 환경과 명령

NumPy, OpenCV, Pillow가 필요합니다. OpenCV 또는 NumPy를 불러오지 못하면 도구는 설치 안내 후 종료 코드 2로 끝납니다. OpenCV 설치 명령은 `python -m pip install opencv-python-headless`입니다. 별도 requirements 파일이나 브라우저 라이브러리는 추가하지 않습니다.

공부방 저장소 루트에서 실행합니다. Windows 한글 출력은 `-X utf8`을 사용합니다.

```bash
python -X utf8 scripts/spot_diff_align.py analyze --id "art_..." --ai "E:/Downloads/gemini_edit.webp"
python -X utf8 scripts/spot_diff_align.py compose --id "art_..." --ai "E:/Downloads/gemini_edit.webp" --spots "작업폴더/spots.json"
```

등록 전 작품이나 로컬 표본은 ID 대신 원본 파일을 직접 지정합니다.

```bash
python -X utf8 scripts/spot_diff_align.py analyze --original "원본.jpg" --ai "AI.webp" --out "작업폴더"
python -X utf8 scripts/spot_diff_align.py compose --original "원본.jpg" --ai "AI.webp" --spots "작업폴더/spots.json" --out "작업폴더"
```

공통 옵션:
- `--id` / `--original`: 둘 중 하나만 필수입니다. `--id`는 현재 공부방의 `kids/data/gallery-data.js`에서 `imageUrl`을 찾아 `G:/master-tower/kids-archive/assets/media/...`로 매핑합니다. 최종 아카이브 원본이므로 놀이 좌표 기준과 같습니다. CDN 밖 주소·아카이브를 벗어나는 경로·누끼 작품은 거부합니다.
- `--ai`: AI 편집 그림 파일, 필수. EXIF를 보정하고 알파는 흰 바탕에 합쳐 RGB로 읽습니다. 직접 지정한 원본도 EXIF 보정하며 투명 원본은 거부합니다.
- `--out`: 작업 폴더. 기본은 `uploads/ex/갤러리/_spotdiff_work/{id 또는 원본파일명}/`입니다. uploads는 Git 무시 대상이고 빌더는 작가 폴더의 바로 아래 파일만 훑으므로 산출물이 작품 카드로 잡히지 않습니다.
- `--threshold`: RGB 차이 문턱값, 기본 40, 허용 1~255.
- `compose --spots`: 부모가 고른 spots 배열 JSON 파일, 필수. UTF-8 BOM도 읽습니다. 빌더 계약인 3~5곳, x/y 0~1, r 0.03~0.15, 힌트 1~30자를 검증합니다.
- `compose --no-color-match`: 영역별 색 맞춤을 끕니다.

출력 이름이 입력 파일과 겹치면 입력을 덮어쓰지 않고 거부합니다. 출력 폴더가 이미 있으면 성공한 명령의 산출물만 갱신합니다.

## 3. 분석 출력과 부모 선택

`analyze`의 산출물:
- `aligned.png`: 원본 크기로 맞춘 AI 그림. 덮지 못한 부분은 투명합니다.
- `candidates.json`: 넓이 순 최대 8개의 후보 배열. 각 항목은 `{x, y, r, hint}`이고 숫자는 소수 셋째 자리입니다. 힌트는 의도적으로 빈 문자열이며 등록 검증을 통과하지 않습니다.
- `review.jpg`: 원본 / 맞춘 AI / 빨간 차이와 초록 후보 원·번호를 담은 한 장짜리 검수 그림.
- `report.json`: 맞춤·품질 수치, 후보 수, 경고와 통과 여부.

부모는 candidates를 복사해 `spots.json`으로 저장하고, 필요 없는 후보를 지우고 붙은 후보를 나누며 힌트를 적습니다. 반지름은 원본의 짧은 변 비율입니다. 덩어리를 감싸는 후보 반지름은 0.03~0.15로 제한하며, 0.15를 넘으면 합쳐진 후보일 수 있다는 경고를 남깁니다. 후보를 자동으로 정답으로 확정하지 않습니다.

## 4. 맞춤과 후보 검출

1. RGB를 회색조로 바꾸고 SIFT 특징점 최대 4000개를 구합니다.
2. AI → 원본 방향의 BF L2 `knnMatch(k=2)`, 비율 0.75로 대응점을 고릅니다.
3. `findHomography(..., RANSAC, 3.0)`로 변환합니다. 정상값 위치에서 x·y 축의 1픽셀 변환 길이가 모두 0.2~5배이며, 정규화된 원근 항 절댓값이 0.002 이하여야 합니다.
4. 변환이 정상 범위를 벗어나면 회전·배율·이동만 있는 `estimateAffinePartial2D`로 재시도합니다.
5. 원본 크기로 LANCZOS4 워핑하고 별도의 최근접 워핑으로 덮임 마스크를 만듭니다. `setRNGSeed(0)`과 단일 OpenCV 스레드로 같은 입력의 결과를 고정합니다.
6. 덮인 영역에서 채널별 절대 차이 최댓값을 구합니다. 문턱값 초과 → 5×5 열림 → 짧은 변 2% 반경 팽창 → 연결 요소 순서로 덩어리를 구합니다.
7. 후보에서는 넓이 0.15% 미만과 덮임 경계에 닿는 덩어리를 제외합니다. 원본 프레임 자체가 아니라 AI의 덮임이 끝나는 선을 경계로 봅니다. 워터마크 전용 감지 규칙은 없습니다.
8. 덩어리 무게중심과 이를 감싸는 반지름으로 후보를 만듭니다.

## 5. 품질 판정과 종료 코드

판정 상수는 `spot_diff_align.py` 상단에 있습니다.
- 정상값 수 `MIN_INLIERS`: 30 이상.
- 정상값 재투영 오차 중앙값 `MAX_REPROJECTION_PX`: 1.5px 이하.
- 모든 차이 덩어리 밖의 덮인 배경에서 회색조 차이 중앙값 `MAX_BACKGROUND_DIFF`: 12 이하. 비교 가능한 배경이 없으면 실패합니다.
- 합성에서는 최종 마스크 지원 영역이 덮인 영역 안에 100% 들어가야 합니다. 각 spot과 연결 합성 영역의 덮임 비율을 모두 기록합니다.
- 합성 시 `MAX_CHANGED_RATIO`: 전체 그림 중 열림 처리한 변화 픽셀의 비율이 40% 미만이어야 합니다. 선택한 spot만 작게 잡아 전체 재칠을 우회하지 못합니다. 이 추가 거부는 `compose`에서 적용합니다.

`report.json` 주요 필드:
- `matches`, `inliers`, `method`, `transform_valid`, `transform`.
- `reprojection_median_px`, `background_gray_median`, `coverage_ratio`, `changed_ratio`, `threshold`.
- `original_size`, `ai_size`, `candidate_count`, `passed`, `reasons`, `warnings`.
- 합성 성공 시 `spot_coverage_ratios`, `region_coverage_ratios`, `composite_ratio`, `unselected_large_changes`(라벨·경계상자·넓이 비율).

종료 코드:
- 0: 성공. 이동 관련 경고가 있어도 0입니다.
- 1: 입력·품질 실패. 한국어 이유를 출력합니다. 품질이 나쁜 `analyze`는 검수 자료와 보고서를 남깁니다. 실패한 `compose`는 새 파일을 만들거나 기존 산출물을 갱신하지 않습니다.
- 2: 필수 OpenCV·NumPy 미설치 또는 CLI 인자 오류.

## 6. 선택 합성

1. 같은 원본·AI 입력으로 맞춤을 다시 계산합니다.
2. 후보 제외 규칙을 적용하기 전의 차이 덩어리에서 spot 원(반지름 ×1.2)과 겹치는 덩어리만 선택합니다. 한 덩어리를 여러 spot이 선택할 수 있습니다.
3. 겹치는 덩어리가 없는 spot은 해당 원 자체를 합성 영역으로 사용합니다.
4. 연결 영역별로 짧은 변 1.5% 반경을 넓히고, 유한 가우시안 커널로 가장자리를 부드럽게 합니다. 이 최종 지원 영역 전체의 덮임을 검증합니다.
5. 바로 바깥 폭 2% 고리 중 덮여 있고 변화 덩어리가 아닌 픽셀에서 RGB 평균·표준편차를 구합니다. AI 색의 이득은 0.8~1.25로 제한하고 오프셋을 맞춥니다. 고리 표본이 부족하면 해당 영역은 보정하지 않고 경고합니다.
6. `AI×α + 원본×(1−α)`로 합성합니다. α=0인 픽셀은 원본 배열에서 복사하며 바이트 일치를 단언합니다. 결과 크기도 저장 전에 단언합니다.
7. 원본 크기의 RGB `{원본베이스}_diff.jpg`를 품질 92로 저장하고 `check.jpg`, 갱신된 `report.json`을 만듭니다. JPEG는 손실 압축이므로 바깥 픽셀 바이트 일치 보장은 저장 전 배열에 대한 것입니다. 등록 빌더의 JPEG 품질은 기존 85를 유지합니다.
8. 콘솔에 등록용 `--diff-file`, `--diff-spots` 두 줄을 출력합니다. 부모의 spots 파일은 덮어쓰지 않습니다.

선택하지 않은 덩어리가 그림 넓이의 0.5% 이상이면 이동한 물건의 이전 자리일 수 있다고 경고합니다. 해당 영역은 원본으로 복원하고 check에 노란 점선 상자를 그립니다. 경계 잡음도 이 경고에 포함될 수 있으므로 위치를 직접 확인해야 합니다.

## 7. 검증과 한계

- 자체 시험: `python -X utf8 scripts/verify_spot_diff_align.py`. 결정적인 1200×800 표본에 1.5배 확대·이동·1° 회전·잡음·워터마크와 변화 3곳을 넣습니다. 후보 중심 오차 24px 미만, 선택 밖 배열 일치·워터마크 복원·결정성·CLI 출력·품질 거부·이동 경고를 확인합니다. ID 매핑·누끼·EXIF·알파·입력 보호·의존성 누락도 검사합니다.
- OpenCV가 없으면 자체 시험은 「건너뜀: opencv-python-headless 미설치」와 종료 코드 0입니다. 이를 실제 검증 통과로 해석하지 않습니다.
- 전체 덩어리를 합성하는 변이는 워터마크 복원 시험이, 품질 판정을 우회하는 변이는 무관한 그림 거부 시험이 실패해야 합니다.
- 기존 회귀 시험은 `node --test "tests/**/*.test.mjs"`. worktree의 변경 파일은 관제탑 검사기의 `--mode file --file <worktree 절대 경로>`로 각각 검사합니다.
- 실제 한옥 표본은 `uploads/ex/spotdiff_samples/hanok/`의 1200×710 원본과 2000×1116 AI 편집본입니다. 분석·합성·검수 그림은 로컬 작업 폴더에만 남기고 완료 보고에서 경로와 결과를 제시합니다.
- 도구는 시각적인 차이와 변환을 처리합니다. AI가 요청한 변경을 실제로 수행했는지, 옮긴 물건의 이전 자리를 지웠는지는 부모가 확인해야 합니다. 품질이 나쁘거나 의도하지 않은 변화가 남으면 AI 편집본을 다시 만듭니다.
- 자동 후보가 부정확하면 기존 갤러리 부모 관리자 모드로 좌표를 보완합니다. 작업 산출물·가짜 표본·검수 기록은 커밋하지 않습니다.
