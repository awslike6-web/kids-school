# 시스템 조감도 데이터 분리 & 자동 갱신 검증 보고서 (2026-10-21)

## 바뀐 파일 (kids-school 저장소)
| 파일 | 내용 |
| :--- | :--- |
| `minmin_system_map.html` | 내장 데이터 430줄 제거 → `scripts/data/system_map_data.js` 로드. 도메인 탭·기준일 배지를 데이터에서 렌더링. 모바일에서 헤더 고정 해제 (1094줄 → 679줄) |
| `scripts/data/system_map_data.js` (신규, 722줄) | 카드 60개(기존 22) · 연결선 93개(기존 37) · 증상 카드 10개(기존 6) · 도메인 탭 10개 + AUTO-SYNC 구간 + 합치기 IIFE |
| `scripts/sync_agent_skills.py` | 동기화 시 조감도 자동 갱신, `--check` 시 스킬 요약 검사 추가 (기존 복사·검사 로직은 그대로) |
| `kids/core/CORE_CATALOG.md` §10, `docs/homeschool_spec.md` §9-③ | 조감도 파일·데이터 구조·자동 갱신 규칙 등록 |

## 새로 채운 영역
- 국어 독해: `register_reading_passage.py` → `korean_spec.md` → `korean_common.js`·`reading_engine.js` → 오프라인 캐시 → LIBRARY_DB
- 수학: `migrate_math_to_curriculum.py` → `math_spec.md` → `math_quiz_engine.js`·`quest_engine.js` → CURRICULUM_DB·VOCA_DB
- 영어: `register_voca.py`(자료 `scripts/data/voca/`) → `english_spec.md` → `english_common.js`·`english_chat.js` → Gemini Worker 프록시·요정 TTS
- 사회: `society_quiz_generator.py` → `society_spec.md` → `society_common.js`·`society_history.js` → CURRICULUM_DB
- 하루: `haru_spec.md` → `haru_common.js`·체크인/시계판/안전 엔진 → 보상·STUDY_LOG·INVENTORY
- 관제탑 라이프로그: 3대 CLI → `lifelog_spec.md` → `lifelog.js` → family-data·Worker → 일상 허브·운동/병원/차량 DB
- 보육비서: 운영 도구 → `daycare_spec.md` → 브라우저 3대 파사드 → 보육 worker → TEACHER·CHILD·DAYCARE_LOG DB
- 공통: `build_storybook.py` → `storybook_engine.js`, `fairy-engine.js`, 개발 타임라인·현황판 DB

## 검증 결과
| 항목 | 결과 |
| :--- | :--- |
| node 데이터 무결성 (중복 id, 도메인 키, 끊긴/역방향 연결선, 가드레일 3줄, 큰따옴표, 파일 경로 실존) | PASS (기존 카드의 `verify_science_unit.py` 경로 오류 1건 발견 → 루트 `scripts/`로 정정) |
| `python -X utf8 scripts/sync_agent_skills.py` 2회 | 1회차 갱신, 2회차 `✅ 시스템 조감도 최신` (변경 없음) |
| `--check` (공부방 / master-tower 루트) | 둘 다 종료 코드 0 |
| 스킬 요약 일부러 훼손 → `--check` | 종료 코드 1로 감지 → 동기화 실행 시 원상 복구 |
| 지도에 없는 스킬 주입 (vm 시험) | 2열 마지막에 `Skill (신규)` 카드 자동 추가 |
| CORE_CATALOG.md 수정 후 동기화 | 기준일 2026-10-20 → 2026-10-21 자동 변경 |
| 브라우저 PC (1024px) | 콘솔 오류 0, 카드 60·선 93, 탭 11개 필터 모두 동작, 카드 클릭 시 연결선 강조, 증상 카드 10개, 가로 넘침 없음 |
| 브라우저 모바일 (375px) | 페이지 가로 넘침 없음(캔버스만 내부 스크롤), 헤더가 화면 절반을 가리던 문제 → 모바일 고정 해제로 해결 |

## 자동 생성 전환 검증 (2026-11-06)
| 항목 | 결과 |
| :--- | :--- |
| 카드·연결선 | 카드 60 → 79, 수동 연결선 93 → 121 (기존 93개 유지), 자동 연결선 21개 (23개 중 근거 줄을 확인해 2개 제외) |
| 미분류 서랍 | 공개 저장소 파일 144개는 이름 표시, 비공개 저장소 21개는 개수만 표시. 문서에 없는 파일 102개는 화면에 올리지 않음 |
| 고장 주입 → `--check` | 없는 경로·끊긴 선·거꾸로 된 선·없는 DB ID·문서에 적었지만 생성 안 한 새 파일은 모두 종료 코드 1. 문서 없는 새 파일은 경고만 |
| 시험 후 복원 | 임시 파일 삭제, 데이터 원복 후 오류·경고 0건 |
| 기존 시험 3건 | 파일 이름 목록을 스크립트 참조로 읽어 실패 → 생성 파일만 탐색에서 제외 (number50·세로셈·용어사전 시험) |
| 포트 메모 | 재시작 전에는 Windows 제외 포트 범위(8467~8866)가 8765~8767을 막아 임시 포트를 썼고, 재시작 후 8767 복구 |

## 화면 개편 검증 (2026-11-06, Stitch 시안 이식)
Stitch 시안 3장(첫 화면·5단계 흐름·모바일)에서 배치와 색만 가져오고, 시안에 있던 없는 파일 이름·영어 장식 글자·외부 글꼴 4종은 버렸습니다. 노션 쓰기 차단 미리보기(8767)에서 확인했습니다.

| 항목 | 결과 |
| :--- | :--- |
| 파일 크기 | 뼈대 HTML 763 → 174줄, 화면 코드 `system_map_view.js` 약 460줄, 스타일 `system_map.css` 약 290줄 (모두 800줄 미만). Tailwind CDN 제거 |
| 첫 화면 (1440px) | 검색, 기능 칩 13개 + 전체 지도(카드 수 표시), 증상 카드 10개. 콘솔 오류 없음 |
| 증상 → 흐름 | `#trouble/0`이 5분 퀘스트 탭을 열고 관련 카드 4장을 노란 테두리로 강조, 상세 패널에 원인·관련 카드·지시문 표시 |
| 카드 선택 | 국어 탭에서 받아쓰기 카드 선택 시 이어진 연결선 13개 강조, 이전·다음 단계 링크 동작 |
| 검색·서랍 | 첫 화면 검색 → 흐름 지도로 넘어가며 입력 유지, 기능 칩을 누르면 검색 해제. 서랍 항목 선택 시 등록 지시문 표시 |
| 1280px | 5단계 열이 잘리지 않음(보드 가로 넘침 0), 전체 지도 카드 79장·연결선 142개 |
| 모바일 375px | 5단계 세로 목록 + 단계 사이 화살표, 상세는 아래 시트(닫기 버튼, Esc), 가로 넘침 0 |
| 시험 | `node --test` 664 통과·실패 0, 증상 카드 연결 계약 시험 추가 |

## 알아둘 점
- CORE_CATALOG.md를 커밋하면 기준 시각이 파일 수정 시각에서 커밋 시각으로 바뀝니다. 커밋 뒤 동기화를 한 번 더 돌리면 `catalogUpdatedAt`이 커밋 시각으로 맞춰집니다 (`--check`는 날짜 차이만으로 실패하지 않음).
- 연결 강조는 상류·하류를 끝까지 따라갑니다. 관제탑 `lifelog.js`도 공부방과 같은 Notion Worker를 쓰기 때문에, 선택하면 공부방 DB까지 함께 강조됩니다.
- 브라우저가 이전 데이터 파일을 캐시할 수 있습니다. 갱신 직후 화면이 그대로면 강력 새로고침하세요.
