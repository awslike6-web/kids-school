# 🕖 영어 「듣고 끌어다 놓기」 10단원 「하루 시간표 채우기」 제작 명세서

> **작업자**: 안티그래비티 · **검증·병합**: Claude Code
> **작업 위치**: 별도 worktree, 새 브랜치 `antigravity/english-listen-place-L10` (시작점 `origin/main`). 공용 폴더 `kids-school-main`의 브랜치는 바꾸지 않는다. main 병합은 하지 않는다.
> **먼저 읽을 것**: `../GEMINI.md` §2 보고 규칙(「확인」 기준 포함), `docs/english_listen_place_spec.md`(8단원 명세, 엔진 구조), `kids/core/CORE_CATALOG.md` §2-4의 `english_listen_place.js` 항목

---

## 1. 목표
5-2 10단원(하루 일과와 시각, 동화 「The Early Bird and the Night Owl」)의 클래스 카드 문장을 듣고, **활동 그림과 시각**을 하루 시간표에 끌어다 놓는다. 8단원 엔진(`kids/js/english_listen_place.js`)을 그대로 쓰고, 새 장면 `timeline`만 만든다.

## 2. 문장 (노션 VOCA_DB 5-2 · L10, 2026-11-06 기준)
**일반 문제 (활동 + 시각 두 개를 맞힘)**: 8단원의 "머리 + 눈" 두 부위 문장과 같은 방식 (`answer`에 2개)
| 문장 | 정답 |
| :--- | :--- |
| I get up at 6. | 일어나기 + 6:00 |
| I eat breakfast at 7. | 아침 먹기 + 7:00 |
| I exercise at 7:50. | 운동하기 + 7:50 |
| I play the piano at 4:30. | 피아노 치기 + 4:30 |
| I go to bed at 9. | 잠자리에 들기 + 9:00 |
| I read books at night. | 책 읽기 + 밤(🌙) |

- 시각 카드는 아날로그 시계 그림 + 숫자(`6:00`)를 함께 보여도 된다(영어 글자가 아니라 듣기를 방해하지 않음). 활동 카드는 그림만, 영어 글자는 맞힌 뒤에 보인다(8단원과 같음).
- 받침대 4장 = 정답 2장 + 같은 종류 오답 2장(활동 1, 시각 1). 시각 오답은 듣고 헷갈릴 만한 것(예: 7:00 ↔ 7:50, 4:30 ↔ 4:00)을 우선한다.
- 넣지 않는 문장: `What time do you …?` 질문 4개, `That's very late/early.`, `I'm always sleepy.` 등(놓을 물건이 없음). 보고서에 뺀 이유를 쓴다.

**마지막 판 「얼리버드는 누구?」**: 숙어 `early bird` / `night owl` 중 하나를 들려주고, 하루 시간표가 그 말에 맞는 친구 1명을 3명 중에서 고른다.
- 예: `night owl` → 9시 넘어서까지 책을 읽는 친구, `early bird` → 6시에 일어나는 친구.
- 매 판 둘 중 하나를 무작위로 낸다. 숙어 행도 page_id로 읽는다.

## 3. 만들 파일과 건드려도 되는 범위
| 파일 | 내용 |
| :--- | :--- |
| `kids/js/english_listen_place_timeline.js` (새) | `registerScene('timeline', …)`: 하루 시간표 무대, 활동·시계 썸네일, 놓인 칸 그리기, 마지막 판 후보 3명(각자 미니 시간표) |
| `kids/subjects/english/data/listen_place_5-2_L10.js` (새) | 문제 데이터 (§4) |
| `kids/css/english_listen_place.css` | timeline 장면 스타일 추가 (파일 전체 300줄 이하 유지) |
| `kids/subjects/english/listen_place.html` | timeline 장면 스크립트 한 줄 추가 |
| `kids/js/english_listen_place.js` | **§5의 두 가지만** 고친다 |
| `kids/subjects/english/data/english_unit_activities.js` | L10 한 줄 등록 |
| `tests/english-listen-place.test.mjs` | L10 시험 추가 (§6) |
| `kids/core/CORE_CATALOG.md` §2-4, `docs/english_spec.md` §2-2 | timeline 장면 등록 |

**건드리지 않는다**: `english_common.js`, `english.html`, `english_unit_bar.js`, `kids/core/*`(보상·노션 모듈), 8단원 파일(`english_listen_place_dressup.js`, `listen_place_5-2_L8.js`). 8단원은 지금처럼 동작해야 한다.

## 4. 데이터 계약
- 8단원과 같은 꼴: `window.LISTEN_PLACE_SCENE = { scene: 'timeline', grade: '5-2', unit: 'L10', title, badge, subtitle, guideItems, finaleBadge, finalePrompt, completeTitle, completeSubtitle, items: [...], questions: [...] }`
- `items`: `{ id, slot: 'activity' | 'time', label(영어, 맞힌 뒤 표시), desc(한국어), minutes?(시각 카드만: 문장에 나온 그대로 시×60+분, 예 4:30 → 270, 7:50 → 470. 오전·오후는 구분하지 않음) }`. 밤 카드는 `id: 'time-night'`이고 `minutes`가 없다.
- `questions`: `{ pageId, answer: [활동id, 시각id] }`. 마지막 판은 `{ pageId(숙어 행), finale: true, finaleKind: 'early' | 'night' }`.
- 문장 글자·뜻은 VOCA에서 page_id로 읽는다. 문장을 쪼개서 시각을 알아내지 않는다(헌법 §8-5).
- page_id 찾기: 쓰기 차단 서버에서 `english.html`을 열고 콘솔에서
  `(await fetchVocaFromNotion({subject:'영어', filterByStudent:true})).filter(r => (r.grades||[]).includes('5-2') && r.level === 'L10').map(r => (r.pageId||r.id) + ' | ' + r.wordType + ' | ' + r.word).join('\n')`

## 5. 엔진(`english_listen_place.js`) 변경은 두 가지만
1. **받침대 채우기**: `pickTrayItems`의 `'head'` 하드코딩을 없앤다. 같은 부위가 모자라면 장면이 정한 순서(`scene.fillSlots`가 있으면 그 순서, 없으면 남은 아무 물건)로 채운다. 8단원 결과는 지금과 같아야 한다(안경 문제 → 모자로 채움).
2. **마지막 판 후보**: 장면에 `buildFinaleCandidates(items, finaleQuestion)`가 있으면 그것을 쓰고, 없으면 지금 엔진 함수를 쓴다. 후보는 지금과 같은 꼴(`{ isAnswer, ... }`)이면 된다.
- 엔진은 600줄 이하를 유지한다. 그 밖의 엔진 동작(보상 번호, 완주 처리, 캐시 사용, 에러리스)은 바꾸지 않는다.
- 시계 바늘 각도는 수학방 `kids/subjects/math/js/clock_rules_logic.js`의 `MathPlay.timeParts(totalMinutes)`를 쓸 수 있으면 쓴다. 그 파일을 싣는 것만으로 화면 코드가 함께 돌면, 같은 공식 두 줄(분침 = 분×6°, 시침 = (시%12)×30° + 분×0.5°)을 장면 파일에 쓰고 보고서에 그 이유를 적는다.

## 6. 시험 (실제 엔진·장면 파일을 불러서)
- L10 데이터의 `answer`가 모두 `items`에 있고, 문제마다 활동 1 + 시각 1이다.
- 받침대: 정답 2 + 오답 2, 오답은 활동 1·시각 1.
- 시각 카드 하나만 맞히면 완료가 아니고, 둘 다 맞혀야 완료.
- 마지막 판: `early`면 정답 후보만 6시 일어나기, `night`면 정답 후보만 밤 늦게까지 활동. 오답 후보 2명은 그 조건에 맞지 않는다.
- **8단원 회귀**: 기존 8단원 시험이 그대로 통과한다. 안경 문제 받침대가 여전히 4장이고 모자로 채워진다.
- 등록표: `5-2 · L10` 줄이 있고 `scene`이 `data/listen_place_5-2_L10.js`.

## 7. 화면 검증 (`../GEMINI.md` §2 「확인」 기준)
- 자기 worktree에서 `python scripts/guarded_preview_server.py <포트>`.
- 영어방 → 학기 5-2 → 단원 10단원 → 「⭐ 이번 단원 특별 활동」 카드로 들어간다.
- 한 판 끝까지(오답 1번 이상, 끌어다 놓기와 누르기 둘 다). 마지막 판 early·night 둘 다 한 번씩 본다(다시 하기로 반복).
- 완주 직후 `JSON.stringify(window.__blockedWrites)`를 붙인다. `__quizRewardSession`은 완주하면 비워지는 것이 정상이니 되살리지 않는다.
- 8단원도 한 판 해서 깨지지 않았는지 본다.
- 보상 알림은 이제 화면 위 작은 말풍선이다. 한 판에 alert 창이 0번이어야 한다.

## 8. 보고 형식
1. 바꾼 파일 `wc -l` 출력 그대로
2. 넣은 문장·뺀 문장(이유)
3. §5 엔진 변경 두 가지의 diff 요약과 8단원 영향
4. 시험 마지막 요약 줄, `verify_contracts.py --mode git-diff` 마지막 줄 그대로
5. 사진(경로 + 보이는 것 한 줄): ① 대기실 10단원 카드 ② 첫 문제(시간표 + 글자 없는 받침대) ③ 오답 뒤 노란 안내 ④ 활동·시각 둘 다 맞힌 화면 ⑤ 마지막 판 early ⑥ 마지막 판 night ⑦ 완주 카드 ⑧ 375px 문제 화면 ⑨ 8단원 첫 문제(회귀)
6. `__blockedWrites` 출력 그대로
7. 못 한 것 / 확인 안 한 것 / 제품 코드를 검증 때문에 바꾼 곳(없으면 "없음")
