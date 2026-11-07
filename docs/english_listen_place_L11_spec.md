# 🧭 영어 「듣고 끌어다 놓기」 11단원 「마을 길 찾기」 제작 명세서

> **작업자**: 안티그래비티 · **검증·병합**: Claude Code
> **시작 조건**: 담임 선생님 11단원 클래스 카드 문장이 노션 VOCA_DB(5-2 · `L11`)에 등록된 뒤 시작한다. 2026-11-07 현재 L11 행 0개. 등록 전이면 작업하지 말고 "L11 문장 없음"으로 보고한다.
> **작업 위치**: 별도 worktree, 새 브랜치 `antigravity/english-listen-place-L11` (시작점 `origin/main`). 공용 폴더 브랜치는 바꾸지 않는다. main 병합은 하지 않는다.
> **먼저 읽을 것**: `../GEMINI.md` §2 보고 규칙, `docs/english_listen_place_L10_spec.md`(가장 최근 장면 추가 예), `kids/js/english_listen_place_timeline.js`(장면 파일 예)

---

## 1. 목표
길 안내 문장을 듣고, **어느 장소인지(장소 카드)**와 **마을 지도 위 어느 자리인지(위치 표지)**를 끌어다 놓는다. 10단원 "활동 + 시각"과 같은 두 개 맞히기 구조다. 새 장면 `map` 하나만 만든다.

## 2. 문장 고르기 (노션 L11 등록 후)
- **넣는 문장**: 장소와 위치가 함께 정해지는 문장 묶음. 예(교과서 핵심 표현, 실제 클래스 카드 문장으로 바꿀 것):
  `Where is the library? Go straight and turn right. It's on your left.` → 장소 `library` + 위치 표지(출발점에서 직진·우회전 뒤 왼쪽)
- 한 문제는 노션 문장 1행(page_id 1개)을 기본으로 한다. 질문과 안내가 따로 행으로 등록돼 있으면 `pageIds: [질문, 안내]`처럼 여러 행을 이어 들려주고, 화면에는 이어 붙여 보여 준다(엔진에 이 기능이 없으면 §5대로 추가).
- **넣지 않는 문장**: 위치가 정해지지 않는 문장(인사, 감사 등). 층(`second floor`)·`behind` 같은 건물 안 위치 문장은 이번 장면에서 빼고, 보고서에 뺀 이유를 쓴다.

## 3. 지도와 정답
- 무대는 위에서 내려다본 마을 지도 하나다: 아래쪽 가운데 출발점(🧒 "You are here"), 길 몇 개, 길가 건물 자리 6~8곳(각 자리에 A, B, C… 표지).
- 장면 데이터에 지도 좌표를 둔다: `spots: [{ id: 'spot-A', x, y, label: 'A' }, …]`, `routes`(정답 길을 다 맞힌 뒤 화살표로 보여 줄 경로).
- `items`: 장소 카드(`slot: 'place'`, 그림만, 영어 글자는 맞힌 뒤) + 위치 표지 카드(`slot: 'spot'`, A·B… 글자는 보여도 됨).
- `questions`: `{ pageId 또는 pageIds, answer: ['place-library', 'spot-C'] }`. 문장을 쪼개서 방향을 알아내지 않는다(헌법 §8-5). 어느 자리가 정답인지는 데이터에 사람이 정해 넣는다.
- **헷갈리는 오답 우선**: 위치 오답은 좌우만 바뀐 자리(`turn right` ↔ `turn left`, `on your left` ↔ `on your right`)를 `confusable`로 먼저 낸다. 장소 오답은 같은 단원의 다른 장소.
- 두 개를 다 맞히면 출발점에서 정답 자리까지 경로 화살표를 그려 보여 준다(듣기 확인용 시각 피드백).

## 4. 마지막 판 「도서관 찾아가기」
- 안내 문장 하나를 들려주고, 지도 3장 중 그 경로대로 그려진 지도를 고른다. 오답 지도 2장은 좌우가 바뀐 경로, 한 블록 더 간 경로.
- 장면의 `buildFinaleCandidates`로 만든다(엔진은 이미 장면 쪽 함수를 쓰게 되어 있음).

## 5. 만들 파일과 건드려도 되는 범위
| 파일 | 내용 |
| :--- | :--- |
| `kids/js/english_listen_place_map.js` (새) | `registerScene('map', …)`: 지도 무대, 장소·표지 썸네일, 놓인 칸 그리기, 경로 화살표, 마지막 판 지도 3장 |
| `kids/subjects/english/data/listen_place_5-2_L11.js` (새) | 문제·지도 데이터 (`trayGuide`도 장면에 맞게: "아래 그림을 누르거나 지도 위 자리로 끌어다 놓으세요") |
| `kids/css/english_listen_place.css` | map 장면 스타일 (파일 300줄 이하 유지. 넘으면 `english_listen_place_map.css`로 따로) |
| `kids/subjects/english/listen_place.html` | map 장면 스크립트 한 줄 |
| `kids/js/english_listen_place.js` | `pageIds`(여러 행 이어 듣기)가 꼭 필요할 때만 그 기능 하나. 600줄 이하 유지. 8·10단원 동작은 그대로 |
| `kids/subjects/english/data/english_unit_activities.js` | L11 한 항목 (`href: 'listen_place.html'` — 주소값 붙이지 않음). 머리 설명 주석은 지우지 않는다 |
| `tests/english-listen-place.test.mjs` | L11 시험 + 8·10단원 회귀 |
| `kids/core/CORE_CATALOG.md` §2-4, `docs/english_spec.md` §2-2 | map 장면 등록 |

**건드리지 않는다**: `english_common.js`, `english.html`, `english_unit_bar.js`, `kids/core/*`, 8·10단원 장면·데이터 파일.

## 6. 시험 (실제 엔진·장면 파일을 불러서)
- L11 데이터의 `answer`가 모두 `items`에 있고 문제마다 장소 1 + 위치 1.
- 받침대: 정답 2 + 오답 2(장소 1·위치 1), 위치 오답은 `confusable`(좌우 바뀐 자리)이 먼저.
- 하나만 맞히면 완료가 아니고 둘 다 맞혀야 완료. 완료 뒤 경로 화살표가 그려진다.
- 마지막 판: 정답 지도만 데이터의 정답 경로와 같다.
- 8·10단원 기존 시험이 그대로 통과한다.

## 7. 화면 검증과 보고
- 검증 방법과 보고 형식은 `docs/english_listen_place_L10_spec.md` §7·§8과 같다(영어방 → 5-2 → 11단원 → 특별 활동 카드, 한 판 완주, alert 0회, `__blockedWrites` 그대로).
- 사진: ① 대기실 11단원 카드 ② 첫 문제(지도 + 글자 없는 장소 카드) ③ 오답 뒤 노란 안내 ④ 둘 다 맞혀 경로 화살표가 보이는 화면 ⑤ 마지막 판 ⑥ 완주 카드 ⑦ 375px 문제 화면 ⑧ 10단원 첫 문제(회귀) ⑨ 8단원 첫 문제(회귀).
- 노션에 넣은 문장의 page_id 표와 뺀 문장(이유)을 보고서에 넣는다.
