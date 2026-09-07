# 🎨 꿈나무 갤러리 미디어 안내

이 디렉토리는 **kids-school 레포지토리의 경량화(용량 다이어트)**를 위해 미디어 원본 파일을 직접 저장하지 않습니다.

- **미디어 단일 원천 (Single Source of Truth)**:
  - 모든 원본 및 웹 최적화 작품 사진은 **`kids-archive` (https://github.com/awslike6-web/kids-archive)** 저장소에 영구 보존됩니다.
- **공부방 연동 방식**:
  - `kids/data/gallery-data.js`는 `kids-archive`의 GitHub CDN URL(`https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/...`)을 직접 참조합니다.
- **신규 작품 추가 시**:
  - `python scripts/build_gallery.py`를 실행하면 이미지는 자동으로 `kids-archive`로 복사/배포되고 `gallery-data.js`에 원격 URL이 등록됩니다.
