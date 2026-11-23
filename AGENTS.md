# 🤖 AI 에이전트 진입 안내 (kids-school)

> 이 파일은 **연결 전용**입니다. 규칙 본문을 여기에 쓰지 마세요.
> 규칙은 `GEMINI.md` 한 벌만 유지하고, 모듈·API 사실 정보는 `kids/core/CORE_CATALOG.md`가 유일한 원본입니다.

## 작업 전에 반드시 읽을 것 (순서대로)
1. **`GEMINI.md`**: 공부방 헌법 (3단계 학습 사다리, 5분 퀘스트, 골디락스 300~600줄·상한 800줄, 상대 경로, TTS·보상 오디오 규칙)
2. **`../GEMINI.md`** (master-tower 안에서 작업할 때): 전사 최고 헌법 (ASDST 사전 보고, 노션 개발 타임라인 기록, 안전 방어선)
3. **`kids/core/CORE_CATALOG.md`**: 새 코드를 짜기 전에 재사용할 공통 엔진을 먼저 찾습니다.
4. 해당 과목 명세서: `docs/{과목}_spec.md`, 노션 스키마: `docs/notion_schemas_school.md`. 등록 작업은 명세서에 적힌 공식 도구를 씁니다(일회성 스크립트 금지, `../GEMINI.md` §9-5).
   - 갤러리 작품 등록: [`docs/gallery_archive_spec.md`](docs/gallery_archive_spec.md) — 작품·특별한 날 등록과 "잘 등록됐는지 확인"은 `gallery-special-day-register` 스킬 순서대로 하고, 끝에 점검표 `scripts/verify_gallery_entry.py`(§9)와 사진 육안 확인을 거친다
   - 특별한 날 등록: [`docs/gallery_archive_spec.md` §5](docs/gallery_archive_spec.md) (입구 관제탑 `scripts/sync_quick_upload.py --cat "특별한 날"`, 빌더 `scripts/add_activity_photo.py`)
   - 알림장 등록: [`docs/timetable_diary_spec.md` §4](docs/timetable_diary_spec.md) · 웹 자동 수신은 `school-notice-intake` 스킬 ([`docs/notice_web_intake_spec.md`](docs/notice_web_intake_spec.md))
   - 종이일기 등록: [`docs/timetable_diary_spec.md` §5](docs/timetable_diary_spec.md)
   - 센터 교재·독해 등록: [`docs/korean_spec.md` §8-1](docs/korean_spec.md#센터-독해-등록-표준)
   - 민서 국어 단원 등록: `minseo-korean-unit` 스킬
   - 영어 등 단원 어휘(VOCA_DB) 등록: `scripts/register_voca.py` + 자료 `scripts/data/voca/*.json` (`docs/english_spec.md` §7, 단원별 스크립트 금지)
   - 사회 사료·지도·도표, 과학 실험 문항(CURRICULUM_DB) 등록: `scripts/register_curriculum.py` + 자료 `scripts/data/curriculum/*.json` (`docs/society_spec.md` §6, 단원별 스크립트 금지)

## 작업별 스킬 (필요할 때 읽기)
- 원본 위치: `.agent/skills/<스킬>/SKILL.md`
- Claude Code용 사본: `.claude/skills/` (직접 고치지 말 것)
- 스킬을 고쳤으면 `python scripts/sync_agent_skills.py`로 사본을 맞추고, 커밋 전에 `python scripts/sync_agent_skills.py --check`가 통과해야 합니다.
- 현재 스킬:
  - `quest-engine-spec` (5분 퀘스트 3·3·3 마스터리 엔진·에러리스 UI·VOCA_DB 숙련도 동기화)
  - `minseo-korean-unit` (민서 국어 단원 추가: 받아쓰기 회차 → 5분방 정제 어휘 + 미니 독해 지문·mp3 등록 표준 절차)
  - `gallery-special-day-register` (갤러리 작품·특별한 날 등록·점검: 입구 미리보기→실행, 온 가족 작성자=`공동`, 구글 포토 링크, 등록 후 점검표, 육안 확인, 보고 형식)
  - `science-unit-builder` (초등 과학 5대 가상실험실 & NotebookLM 기반 『실험관찰』 실험연계 디지털 탐구 보고서·서술형 빌더·실험순서 조립 표준 제작)
  - `school-notice-intake` (하이클래스·클래스팅 웹 알림장 자동 수신 → 원문 보존·JSON 작성·공식 도구 노션 등록)

## 로컬 실행·검증 메모 (이 PC 기준)
- **OS·런타임**: Windows, **Node.js v24.22.0** (2026-10-20 설치). JS 엔진 검증은 `node scripts/verify_quest_mastery.js`처럼 명령으로 하고, 화면 확인은 정적 서버(`python -m http.server`)와 브라우저로 합니다.
- **로컬 CI (푸시 전 필수, 훅이 강제)**: `python -X utf8 scripts/ci_local.py` — 원격 시험(`regression.yml`)과 같은 단계(node 회귀 시험·파이썬 등록기 시험·scripts 허용 목록)를 돌립니다(이 PC 약 15초, 노션 미접속). 관제탑 `.githooks/pre-push`가 푸시 전에 자동 실행해 실패하면 푸시를 막으니 `--no-verify`로 건너뛰지 않습니다. node 시험만 돌리고 넘어가면 2026-11-17~20처럼 원격만 빨간불이 됩니다. 원격에 단계를 더하면 `ci_local.py`도 같이 고칩니다(`scripts/test_ci_local.py`가 대조).
- **캐시 버전 표시(`?v=`)는 손으로 올리지 않습니다 (2026-11-24~)**: JS·CSS를 고쳤으면 커밋 전에 `node scripts/stamp_versions.mjs`를 한 번 돌립니다. 그 파일을 가리키는 모든 자리(HTML 태그, `notion-helper.js` 자동 로더 목록, 동화 자가 삽입 등)의 `?v=`가 파일 내용 해시 8자리로 맞춰집니다. 빠뜨리면 `tests/version-stamps.test.mjs`가 실패해 푸시가 막힙니다(`--check`는 고치지 않고 알리기만). 새로 거는 참조에도 `?v=` 아무 값이나 붙여 두면 도구가 맞춥니다. 조감도 자료(`scripts/build_system_map.py`)도 다시 만들었다면 그 **뒤에** 돌립니다(조감도 자료 파일의 해시가 바뀌므로).
- **회귀 시험 묶음**: `node --test "tests/**/*.test.mjs"` (노션 미접속). 연산 스튜디오 범위 시험은 로컬에서 표본, `KIDS_TEST_FULL=1`이면 전수(Actions는 전수). 분리 파일 시험은 얼린 원본 대조 없이 `tests/split-rules.mjs` 규칙만 보므로, HTML·JS를 고칠 때 `tests/fixtures`를 같이 고칠 필요가 없습니다. `main` 푸시마다 GitHub Actions가 같은 시험을 돌립니다. 구성은 `kids/core/CORE_CATALOG.md` 끝의 「회귀 시험 묶음」 절.
- **한글 출력**: Python으로 한글을 출력할 때는 `python -X utf8` 또는 `PYTHONIOENCODING=utf-8`을 붙입니다.
- **노션 Worker(`minmin-notion.awslike6.workers.dev`) 호출**:
  - Python에서 부를 때는 `User-Agent` 헤더가 없으면 403이 납니다.
  - 소스는 2026-10-21부터 관제탑 저장소 `master-tower/workers/minmin-notion/`에만 있습니다(이 저장소에는 사본 없음). 배포는 관제탑 루트에서 `npx wrangler deploy -c workers/minmin-notion/wrangler.toml`로 하고, `/health`의 `version`으로 반영을 확인합니다. 엣지 캐시 우회용 `Pragma` 헤더는 CORS에서 막힙니다. `?force=true`는 Worker(v4.6)가 지우고 넘기므로 캐시 우회에 쓸 수 있습니다(2026-10-28 확인).
- **운영 DB 보호**: 화면 검증은 노션 쓰기 차단 서버 `python scripts/guarded_preview_server.py`(포트 8767, 미리보기 이름 `kids-school-guarded`)로 합니다. 페이지가 실리기 전부터 쓰기(`PATCH/POST /v1/pages` 등)를 막습니다. 화면마다 손으로 `fetch`를 가로채면 빠뜨리기 쉽습니다(2026-10-28 민수 「학습설정」 덮어쓰기 사고). 실제 쓰기 시험은 사용자 승인 후 1건만 하고, 원래 값으로 되돌린 뒤 다시 읽어 확인합니다.
