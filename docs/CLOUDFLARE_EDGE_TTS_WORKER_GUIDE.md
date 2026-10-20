# ⚡ Cloudflare Worker: 실시간 Edge Neural AI TTS 배포 및 연동 가이드

이 문서는 Microsoft Edge Neural AI(선희 성우 음성)를 실시간으로 스트리밍하는 **Cloudflare Worker**를 1분 만에 무료로 배포하고 연동하는 방법입니다.

---

## 🚀 1. Cloudflare Worker 배포 방법 (1분 소요)

### 옵션 A: Cloudflare Dashboard에서 신규 Worker 생성 (가장 추천)
1. **[Cloudflare 대시보드](https://dash.cloudflare.com/)** 로그인.
2. 좌측 메뉴에서 **`Compute (Workers & Pages)`** ➔ **`Create`** ➔ **`Create Worker`** 클릭.
3. Worker 이름을 `minmin-tts` (또는 원하는 이름)로 지정 후 **`Deploy`** 클릭.
4. 배포 완료 화면에서 **`Edit code`** 클릭.
5. 기존 코드를 모두 지우고, [`workers/edge-tts-worker.js`](file:///g:/master-tower/kids-school-main/workers/edge-tts-worker.js)의 전체 코드를 복사하여 붙여넣기.
6. 우측 상단 **`Save and Deploy`** 클릭!
7. 발급된 Worker URL (예: `https://minmin-tts.awslike6.workers.dev`)을 복사.

---

### 옵션 B: 기존 `minmin-notion` Worker에 엔드포인트 통합
기존 `minmin-notion.awslike6.workers.dev` 워커 소스코드 상단 라우터에 다음 조건문을 추가하셔도 바로 작동합니다:

```javascript
// minmin-notion worker 내부
if (url.pathname === '/api/tts' || url.pathname.endsWith('/tts')) {
    // edge-tts-worker.js의 synthesizeEdgeTTS 로직 호출
}
```

---

## 🎙️ 1-1. OpenAI TTS 대체 경로 (2026-10-20)
- Edge 읽기 서비스가 `HTTP 403`으로 거절되면 `/api/tts`가 OpenAI TTS로 대신 만든다. 키는 브라우저가 아니라 **Worker 비밀값**에만 둔다.
- Cloudflare 대시보드 → `minmin-notion` → Settings → Variables and Secrets:
  | 이름 | 종류 | 값 |
  | :--- | :--- | :--- |
  | `OPENAI_API_KEY` | Secret | OpenAI API 키 |
  | `TTS_ENGINE` | Text (선택) | `openai` 이면 Edge 시도를 건너뛰고 바로 OpenAI (지연 감소) |
  | `OPENAI_TTS_MODEL` | Text (선택) | 기본 `gpt-4o-mini-tts` (`tts-1`도 가능) |
  | `OPENAI_TTS_VOICE` | Text (선택) | 기본 한국어 `coral`, 영어 `nova` |
- 같은 목소리·속도·문장은 Cloudflare 캐시(`/__tts_cache/<SHA-256>.mp3`, 7일)에서 다시 내보내 과금을 줄인다. 응답 헤더 `X-TTS-Engine`(edge/openai)·`X-TTS-Cache`(HIT/MISS)로 확인.
- 미니 독해처럼 고정 문장은 `scripts/build_mini_reading_audio.py`로 Edge mp3를 미리 만들어 두는 쪽이 비용 0원이다.

## ⚙️ 2. 프론트엔드 환경 설정 (`kids/config.js`)

`kids/config.js`에 발급받은 Worker URL을 등록해두면 요정 엔진이 자동으로 연결합니다:

```javascript
window.APP_CONFIG = {
    // ...
    TTS_WORKER_URL: "https://minmin-tts.awslike6.workers.dev/api/tts", // 또는 프록시 URL
    WORKER_PROXY_URL: "https://minmin-notion.awslike6.workers.dev"
};
```

---

## 🧪 3. 작동 테스트 (브라우저 또는 터미널)

### 브라우저 주소창 테스트:
```
https://[워커이름].awslike6.workers.dev/api/tts?text=안녕! 나는 요정 코코야!
```
➔ 접속 시 선희 목소리의 MP3 오디오가 즉시 재생됩니다.

### cURL / Python POST 테스트:
```bash
curl -X POST "https://[워커이름].awslike6.workers.dev/api/tts" \
     -H "Content-Type: application/json" \
     -d "{\"text\": \"민수야, 오늘 수학 퀴즈도 힘차게 풀어보자!\", \"voice\": \"ko-KR-SunHiNeural\"}" \
     --output test.mp3
```
