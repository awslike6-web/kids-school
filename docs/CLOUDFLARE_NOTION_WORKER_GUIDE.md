# ⚡ Cloudflare Worker: minmin-notion 엣지 캐시 & 프록시 배포 가이드

이 문서는 **노션 REST API 초고속 엣지 캐싱(Cache API)**, **단일 번들링(/api/bootstrap)**, **Microsoft Edge Neural AI TTS**, 그리고 **📸 스마트폰 퀵업로드 미디어 파이프라인 2.1(/api/upload-media)**을 통합 지원하는 **`minmin-notion`** 워커를 배포하고 갱신하는 매뉴얼입니다.

---

## 🚀 1. 소스 위치와 배포 (2026-10-21 관제탑 저장소로 이전)

- `minmin-notion`은 공부방·관제탑·보육비서가 함께 쓰는 전사 공용 서버라서, 소스는 이 저장소가 아니라 관제탑 저장소 [`master-tower/workers/minmin-notion/`](https://github.com/awslike6-web/master-tower/tree/main/workers/minmin-notion)에 한 벌만 둡니다.
- 대시보드 편집기에 코드를 붙여 넣는 배포는 더 이상 하지 않습니다. 관제탑 루트에서 배포합니다:
  ```bash
  node --test workers/minmin-notion/*.test.js
  npx wrangler deploy -c workers/minmin-notion/wrangler.toml
  ```
- 배포 후 `/health`의 `version`으로 반영을 확인합니다. 비밀값과 대시보드 변수는 배포해도 유지됩니다(`keep_vars = true`).

---

## ⚙️ 2. 환경변수(Secrets) 설정 (권장)

워커가 노션 및 깃허브 API 호출 시 사용할 토큰을 대시보드에 등록해두면 완벽한 원스톱 파이프라인이 가동됩니다:

1. `minmin-notion` Worker 상세 페이지 ➔ **`Settings`** 탭 ➔ **`Variables and Secrets`** 클릭.
2. **`Add`** 클릭:
   - **`NOTION_TOKEN`** (또는 `NOTION_API_KEY`): 노션 인테그레이션 시크릿 키 입력 (`secret_...`)
   - **`GITHUB_TOKEN`** (선택 사항): GitHub Personal Access Token (Repo 쓰기 권한). 설정 시 폰에서 업로드 즉시 GitHub 레포지토리로 직접 자동 커밋됩니다!
   - Type: **`Secret`** (암호화 보관) 선택
3. 저장 완료.

---

## 📸 3. 미디어 퀵업로드 파이프라인 2.1 연동 규격

### 1) 미디어 업로드 API (`POST /api/upload-media`)
스마트폰 퀵업로더에서 캔버스 압축 이미지(Base64)와 메타데이터를 전송합니다:
```json
{
  "filename": "20261020_134512.jpg",
  "author": "민수",
  "category": "만들기/공예",
  "memo": "달콤한 딸기 모형 케이크",
  "date": "2026-10-20",
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "createNotionPage": true
}
```
- **응답**: `{ "status": "ok", "id": "...", "filename": "...", "githubCommitted": false, "notionPageId": "..." }`

### 2) 대기 큐 조회 API (`GET /api/pending-media`)
PC 파이프라인 스크립트가 대기 중인 사진들을 가져옵니다:
- `GET /api/pending-media?include_data=true`: Base64 바이너리 포함 전체 목록 반환
- `DELETE /api/pending-media?id={id}`: PC 동기화 완료 후 큐에서 제거

### 3) PC 원클릭 동기화 실행
스마트폰에서 사진을 올린 후, PC에서 단 1줄만 실행하면 전 과정 자동 완결:
```bash
python scripts/sync_quick_upload.py
```
1. 워커 큐에서 폰 사진 자동 다운로드 & `uploads/ex/...` 배치
2. `gallery-meta.json` 메타데이터 자동 등록
3. `build_gallery.py` ➔ 고화질 최적화 변환
4. `kids-archive` & `kids-school` Git commit & push
5. 노션 타임라인 자동 기록!

---

## 🧪 4. 즉시 작동 검증 (터미널 또는 브라우저)

### 1) 헬스체크 및 기능 확인
```bash
curl -i "https://minmin-notion.awslike6.workers.dev/health"
```
응답 예시:
```json
{
  "status": "ok",
  "service": "minmin-notion-edge-cache",
  "features": ["notion-proxy", "l1-memory-cache", "l2-cache-api", "bootstrap-bundle", "edge-tts", "quick-upload-pipeline"]
}
```
