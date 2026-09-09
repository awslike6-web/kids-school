# ⚡ Cloudflare Worker: minmin-notion 엣지 캐시 & 프록시 배포 가이드

이 문서는 **노션 REST API 초고속 엣지 캐싱(Cache API)**, **단일 번들링(/api/bootstrap)**, **Microsoft Edge Neural AI TTS**를 통합 지원하는 **`minmin-notion`** 워커를 배포하고 갱신하는 매뉴얼입니다.

---

## 🚀 1. Cloudflare Dashboard에서 1분 만에 갱신 배포하기

1. **[Cloudflare 대시보드](https://dash.cloudflare.com/)**에 로그인합니다.
2. 좌측 메뉴에서 **`Compute (Workers & Pages)`** 클릭.
3. 목록에서 기존 **`minmin-notion`** Worker를 클릭합니다.
4. 우측 상단의 **`Edit code`** 버튼을 클릭합니다.
5. 에디터 창의 기존 코드를 모두 지웁니다.
6. 로컬 레포지토리의 [`kids-school-main/workers/minmin-notion-worker.js`](file:///g:/master-tower/kids-school-main/workers/minmin-notion-worker.js) 전체 내용을 복사하여 붙여넣습니다.
7. 우측 상단의 **`Deploy`** (또는 `Save and Deploy`) 버튼을 클릭합니다.
8. **배포 완료!** 즉시 전 세계 300+개 엣지 로케이션에 고속 캐싱 엔진이 가동됩니다.

---

## ⚙️ 2. 환경변수(Secrets) 설정 (권장)

워커가 노션 API 호출 시 사용할 토큰을 대시보드에 등록해두면 프론트엔드에서 토큰을 전송하지 않아도 안전하게 동작합니다:

1. `minmin-notion` Worker 상세 페이지 ➔ **`Settings`** 탭 ➔ **`Variables and Secrets`** 클릭.
2. **`Add`** 클릭:
   - Variable name: `NOTION_TOKEN` (또는 `NOTION_API_KEY`)
   - Value: 노션 인테그레이션 시크릿 키 입력 (`secret_...`)
   - Type: **`Secret`** (암호화 보관) 선택
3. 저장 완료.

---

## 🧪 3. 즉시 작동 검증 (터미널 또는 브라우저)

### 1) 헬스체크 및 캐시 기능 확인
브라우저 주소창 또는 curl:
```bash
curl -i "https://minmin-notion.awslike6.workers.dev/health"
```
응답 예시:
```json
{
  "status": "ok",
  "service": "minmin-notion-edge-cache",
  "version": "2026.09-v2",
  "features": ["notion-proxy", "edge-cache-api", "bootstrap-bundle", "edge-tts"],
  "cacheTTL": {
    "query": "300s",
    "bootstrap": "180s"
  }
}
```

### 2) 엣지 캐시 HIT / MISS 검증
파이썬 테스트 스크립트 실행:
```bash
python scripts/test_worker_cache.py
```
- **1회차 요청**: `X-Cache-Status: MISS` (노션 원본 통신, ~1.2초)
- **2회차 요청**: `X-Cache-Status: HIT` (엣지 캐시 즉답, **~0.08초 (80ms)**) 🚀
