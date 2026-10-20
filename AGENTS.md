# 🤖 AI 에이전트 진입 안내 (kids-school)

> 이 파일은 **연결 전용**입니다. 규칙 본문을 여기에 쓰지 마세요.
> 규칙은 `GEMINI.md` 한 벌만 유지하고, 모듈·API 사실 정보는 `kids/core/CORE_CATALOG.md`가 유일한 원본입니다.

## 작업 전에 반드시 읽을 것 (순서대로)
1. **`GEMINI.md`**: 공부방 헌법 (3단계 학습 사다리, 5분 퀘스트, 골디락스 300~600줄·상한 800줄, 상대 경로, TTS·보상 오디오 규칙)
2. **`../GEMINI.md`** (master-tower 안에서 작업할 때): 전사 최고 헌법 (ASDST 사전 보고, 노션 개발 타임라인 기록, 안전 방어선)
3. **`kids/core/CORE_CATALOG.md`**: 새 코드를 짜기 전에 재사용할 공통 엔진을 먼저 찾습니다.
4. 해당 과목 명세서: `docs/{과목}_spec.md`, 노션 스키마: `docs/notion_schemas_school.md`

## 작업별 스킬 (필요할 때 읽기)
- 원본 위치: `.agent/skills/<스킬>/SKILL.md`
- Claude Code용 사본: `.claude/skills/` (직접 고치지 말 것)
- 스킬을 고쳤으면 `python scripts/sync_agent_skills.py`로 사본을 맞추고, 커밋 전에 `python scripts/sync_agent_skills.py --check`가 통과해야 합니다.
- 현재 스킬:
  - `quest-engine-spec` (5분 퀘스트 3·3·3 마스터리 엔진·에러리스 UI·VOCA_DB 숙련도 동기화)
  - `minseo-korean-unit` (민서 국어 단원 추가: 받아쓰기 회차 → 5분방 정제 어휘 + 미니 독해 지문·mp3 등록 표준 절차)
  - `science-unit-builder` (초등 과학 5대 가상실험실 & NotebookLM 기반 『실험관찰』 실험연계 디지털 탐구 보고서·서술형 빌더·실험순서 조립 표준 제작)

## 로컬 실행·검증 메모 (이 PC 기준)
- **OS·런타임**: Windows, **Node.js v24.22.0** (2026-10-20 설치). JS 엔진 검증은 `node scripts/verify_quest_mastery.js`처럼 명령으로 하고, 화면 확인은 정적 서버(`python -m http.server`)와 브라우저로 합니다.
- **한글 출력**: Python으로 한글을 출력할 때는 `python -X utf8` 또는 `PYTHONIOENCODING=utf-8`을 붙입니다.
- **노션 Worker(`minmin-notion.awslike6.workers.dev`) 호출**:
  - Python에서 부를 때는 `User-Agent` 헤더가 없으면 403이 납니다.
  - 배포는 GitHub와 자동 연동되지 않습니다. `workers/minmin-notion-worker.js`를 Cloudflare 대시보드 편집기에 붙여 넣고 Deploy 하며, `/health`의 `version`으로 반영을 확인합니다(2026-10-20 기준 저장소와 같은 v4.3). 엣지 캐시 우회용 `Pragma` 헤더는 CORS에서 막히고, `?force=true`는 노션까지 넘어가 400이 납니다.
- **운영 DB 보호**: 화면 검증 중 노션 쓰기(`PATCH/POST /v1/pages`)는 페이지 안에서 `fetch`를 가로채 막습니다. 실제 쓰기 시험은 사용자 승인 후 1건만 하고, 원래 값으로 되돌린 뒤 다시 읽어 확인합니다.
