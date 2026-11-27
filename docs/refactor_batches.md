# 🧹 공부방 리팩토링 묶음 목록 (2026-11-27~)

> 헌법 §8-4 정기 대청소. 한꺼번에 몰아서 하지 않고 **작은 묶음 하나씩** 끝낸다.
> 12-21 월말 점검은 시작일이 아니라 **중간 점검**이다. 그때 노션 작업 기록·GitHub 로그·실사용 기록으로 남은 순서를 다시 정한다.
> 노션 현황판 카드: 「공부방 리팩토링 0~2」, 「학습설정 두 아이 몫 중복 저장 정리」.

## 묶음마다 지킬 것
1. **한 묶음 = 한 커밋(또는 한 브랜치)**. 문제가 생기면 그 묶음만 되돌린다.
2. 고치기 **전에** 지금 동작을 시험으로 묶는다(없으면 먼저 쓴다). 그 다음에 옮기거나 합친다.
3. 등급은 §9 표를 따른다. `kids/core/`·퀘스트 엔진이면 L2 → 카본 교차 검토와 `검토: carbon` 줄을 남긴다.
4. 지금 기능 작업 중인 구역(수학 사다리 새 탐험관, 오늘의 길)은 그 세션들이 쉴 때만 손댄다.
5. JS·CSS를 고쳤으면 `node scripts/stamp_versions.mjs`를 돌린다. 푸시 전에는 `python -X utf8 scripts/ci_local.py`를 돌린다.
6. 일꾼 배분: 목록·지시서는 Claude, 쉬운 구현은 하이드로젠 medium, 보통 구현은 네온 medium, 검토는 카본(L2)이나 Opus(agy 주도일 때).

## 조사 결과 (2026-11-27 어림)
- 11월 커밋 232개. 11-21 이후 새 파일 201개(대부분 수학 사다리).
- 회귀 시험 정리(분리 보존 시험·간헐 실패·속도)는 11-14 main에 병합됐다(`d027afd6`). 안전망 전제조건은 이미 갖춰져 있다.
- **공용 코어 스크립트 태그에 `?v=`가 빠진 자리가 많다.** `stamp_versions.mjs`는 `?v=`가 이미 붙은 자리만 맞추므로, 빠진 자리는 고쳐도 휴대폰이 옛 파일을 쓸 수 있다(GitHub Pages 캐시 약 10분, 서비스 워커는 알림 전용이라 캐시하지 않음).

  | 파일 | `?v=` 없음 | 있음 |
  | :--- | ---: | ---: |
  | `fairy-settings-catalog.js` | 53 | 7 |
  | `fairy-config.js` | 51 | 9 |
  | `core.js` | 45 | 9 |
  | `notion-helper.js` | 39 | 16 |
  | `fairy-chatbot.js` | 20 | 2 |
  | `fairy-settings-engine.js` | 7 | 1 |
  | `fairy-tts.js` / `fairy-engine.js` | 6 | 55 / 54 |
  | `design-system.css` | 65 | 8 |

  예: 11-26에 `fairy-settings-catalog.js`에 넣은 학습설정 쪼개기 함수는, 옛 파일을 받은 화면에서 없는 것으로 보인다. 그러면 지킴 장치 때문에 노션 저장 없이 기기에만 저장된다(깨지지는 않지만 조용히 빠진다).
- `fairy-*` 스크립트 4~5개를 화면 60곳이 **각자 같은 순서로 손으로** 싣는다(config → tts → settings-catalog → engine). `notion-helper.js`는 자기 하위 모듈을 자동 로더로 싣는데, 요정 묶음에는 그런 장치가 없다.
- 백업 폴더 2곳: `kids/data/legacy_backup/`(5개, 568KB, 11-02 데이터 다이어트 때 옮김), `kids/deprecated_backup/`(2개). 화면 코드는 둘 다 싣지 않는다. 주석·검사 허용 목록·도장 도구 제외 목록에서만 이름이 나온다.
- 750~800줄 파일이 13개 있다. 상한(800) 바로 밑에 붙어 있어서 "상한에 맞춰 눌러 담기"가 의심된다. 공용 코어 쪽은 `notion-api-client.js` 800, `fairy-tts.js` 796, `quest-mastery.js` 792이고, 화면 쪽은 `table_graph-core.js` 796, `bar_line-core.js` 785 등이다.
- 수학 화면 49개 중 22개가 공용 탐험관 틀(`math_explorer-shell.js`)을 쓴다. 11-15 이후 새로 만든 탐험관은 모두 틀을 쓴다(11-14 `congruence_symmetry`가 틀 없이 만든 마지막 화면). 틀을 안 쓰는 27개는 7~9월에 만든 옛 화면, 동화 래퍼(76줄 표준), 그리고 이 합동 화면이다.

## 묶음 (위에서부터)

### A. 공용 코어 참조에 `?v=` 달기 — L1-리팩터, 쉬움 (하이드로젠 medium)
- 모든 HTML의 `core/*.js`·`design-system.css` 참조에 `?v=`를 붙이고 `stamp_versions.mjs`로 값을 맞춘다. 화면 변화는 없다.
- `tests/version-stamps.test.mjs`에 "공용 코어(`kids/core/`, `kids/css/`) 참조는 `?v=`가 반드시 있어야 한다" 규칙을 더해서, 다시 빠지지 않게 한다.
- 끝 기준: 위 표의 "없음"이 전부 0이고, `ci_local.py`가 통과한다.

### B. 백업 폴더 치우기 — L1-리팩터, 쉬움 (Claude 직접) · **사용자 확인 후**
- `kids/data/legacy_backup/`·`kids/deprecated_backup/`를 지운다. git 기록에 남으므로 필요하면 되살릴 수 있다. 커밋 메시지에 되살리는 명령(`git checkout <커밋>^ -- 경로`)을 적어 둔다.
- `science-data.js` 7행 주석("영구 보존")을 git 기록 안내로 바꾼다. 검사 허용 목록·도장 도구 제외 목록에서 이름을 뺀다.

### C. 요정 묶음 싣는 방식 통일 — L2, 보통 (설계 Claude → 구현 네온 medium → 검토 카본)
- 화면마다 손으로 싣는 `fairy-config/tts/settings-catalog/engine`를 한 곳에서 순서를 보장해 싣게 한다. 후보는 `notion-helper.js` 자동 로더 확장, 또는 요정 전용 로더 1개다. 설계 검토를 먼저 받는다.
- A가 끝난 뒤에 한다(버전 표시가 먼저 정돈돼 있어야 바꾼 뒤 확인이 쉽다).
- 현황판 카드 1번에 해당한다.

### D. 800줄 근접 파일 점검 — 파일마다 등급이 다름 (점검 Claude, 나누기 네온)
- 13개를 훑어서 "한 책임인데 길다"(놔둠)와 "두 책임이 섞였다"(나눔)로 가른다. 나누기는 §8-0 기준(300~600줄 완성형 단위)을 따르고, 50~100줄로 잘게 쪼개지 않는다.
- 공용 코어 3개(`notion-api-client`·`fairy-tts`·`quest-mastery`)는 L2다.
- **분류 결과 (2026-11-27, 750줄 이상 16개 — 루트 HTML 3개 포함)**:

  | 파일 | 줄 | 판정 |
  | :--- | ---: | :--- |
  | `kids/core/notion-api-client.js` | 800 | **D1 끝**: 시간표 파서가 `notion-timetable.js`와 두 벌이었음 → 한 벌로(590줄) |
  | `kids/subjects/quest/quest-mastery.js` | 792 | **D2 끝**: 문제 생성·한글 분석을 `quest-questions.js`로 (521줄) |
  | `kids/js/science_report.js` | 784 | **D3 끝**: 보고서 그리기 342줄 + `science_report_quiz.js` 469줄 |
  | `kids/js/society_common.js`·`korean_common.js`·`english_common.js` | 772~794 | **→ 묶음 E**: 세 과목방 대문이 같은 뼈대(방 열기·학년/단원 고르기·미션 시작·보상)를 각자 복사 |
  | `kids/subjects/math/fractions_decimals.html` | 770 | **→ 묶음 F**: 공용 탐험관 틀 이전의 옛 화면(인라인 스크립트 413줄) |
  | `minseo_lab.html` | 780 | 살펴볼 것: 인라인 스크립트 241줄·스타일 51줄 — 파일로 빼면 줄지만 급하지 않음 |
  | `kids/core/fairy-tts.js` | 796 | 놔둠(지켜봄): 음성 합성 한 책임. 10-28에 엔진에서 이미 떼어 낸 파일 |
  | `kids/subjects/haru/js/haru-timeline-engine.js` | 783 | 놔둠: 하루 시간표 한 기능(시계판·목록·스티커는 서로 맞물림) |
  | `kids/subjects/quest/monster_lab_controller.js` | 754 | 놔둠: 한 화면 조종기 |
  | `kids/subjects/math/js/table_graph-core.js`·`bar_line-core.js` | 796·785 | 놔둠(지금은): 문제 생성 한 책임, 수학 사다리 세션이 만드는 중인 구역 |
  | `kids/css/math_operator_studio.css` | 789 | 놔둠: 한 화면 스타일 |
  | `lobby.html`·`monster_lab.html` | 770·781 | 놔둠: 인라인 스크립트가 거의 없는 마크업 |


### E. 중복 도우미 합치기 — 현황판 카드 2번 (목록 Claude)
- **조사 결과 (2026-11-28)**: 국어·사회·영어·과학 대문(`*_common.js`, 합계 약 2,800줄)에 같은 이름 함수가 15개 있지만, 본문 겹침은 0.06~0.5에 그친다(로딩 표시 0.5, 토론 마무리 0.72 외에는 과목마다 고쳐 쓴 다른 코드). 합치면 화면 동작이 바뀌므로 **억지로 합치지 않는다**. 대신 조사 중 찾은 버그를 고쳤다:
  - 사회방 대문이 공용 `speakFairyTTS`·`stopFairyTTS`를 다시 정의해, 10-02부터 사회방 음성이 Edge(선희) 대신 브라우저 기계음이었다 → 지움, 시험 `tests/society-tts.test.mjs`(공용 음성 함수 덮어쓰기 금지)
  - 국어·영어 로딩 문구에 보이던 「Fairy_」 오타
- **기계음 직접 호출 7곳 점검 (2026-11-28)**: 5곳(단어 모달 2·50까지의 수·하루방·분수 곱셈)은 공용 음성이 없을 때만 쓰는 대체 경로, 파닉스는 Edge Jenny를 직접 부르고 실패 때만 대체 → 그대로. **늘 기계음이던 2곳을 고침**: 나눗셈·약수(`math_factors_logic.js` `speak`)는 공용 `speakFairyTTS` 먼저, 영어 듣기(`listen.html`, 인쇄 카드 QR)는 공용 Edge 재생(`playCloudflareEdgeTtsStream`에 이번만 빠르기 `options.playbackRate` 추가)으로 — 요정 목소리 끔과 상관없이 읽고, 이전 재생 알림 무시·첫 자동 재생 막힘 처리(카본 검토). 시험 `society-tts.test.mjs`에 「기계음만 쓰는 파일 금지」.
- 과목 공통 파일(`korean_common.js` 783, `english_common.js` 772, `society_common.js` 794)과 수학 `*-core.js`에서 같은 일을 하는 함수(섞기·날짜·말풍선·보상 호출 등)를 찾아 공용으로 올린다.
- 먼저 목록만 만들고, 합칠 것은 작은 묶음으로 다시 나눈다.

### F. 옛 수학 화면 공용 틀로 옮기기 — L1-화면, 큰 일 (뒤로)
- 탐험관 모양인 옛 화면(`fractions_decimals` 770, `big_numbers`, `shapes`, `planar_shapes` 등)만 대상으로 한다. 동화 래퍼·대문·연산 도구는 제외한다.
- 화면이 바뀌므로 폰 크기 사진이 필요하다. 아이가 그 화면을 쓰는 중이면 방학 뒤로 미룬다.
- **대상과 순서 (2026-11-28 사용자 결정: 큰 것부터, 박힌 퀴즈는 노션으로)**:

  | # | 화면 | 학년·단원 | 줄(인라인) | 상태 |
  | :-: | :--- | :--- | ---: | :--- |
  | F1 | `fractions_decimals` 분수와 소수 | 3-1 6단원 | 770(412) | **끝** (관 4개 + 노션 퀴즈 12제) |
  | F2 | `big_numbers` 큰 수 | 4-1 1단원 | 592(254) | **끝** (관 3개 + 노션 퀴즈 12제) |
  | F3 | `division_concept` 나눗셈 | 3-1 3단원 | 461(225) | **끝** (관 3개 + 노션 퀴즈 12제) |
  | F4 | `planar_shapes` 평면도형 | 3-1 2단원 | 420(177) | **끝** (관 3개 + 노션 퀴즈 12제) |
  | F5 | `shape_movement` 도형의 이동 | 4-1 4단원 | 481(172) | **끝** (관 4개 + 노션 퀴즈 12제) |
  | F6 | `angles_concept` 각도 | 4-1 2단원 | 213 + JS 532 | **끝** (관 4개 + 노션 퀴즈 12제) |
  | F7 | `length_time` 길이와 시간 | 3-1 5단원 | 238 + JS 532 | 다음 |

  방학 뒤로 미룸(아이가 이번 학기에 쓰는 중): 민수 5-2 `ranges_estimation`·`fractions_multiplication`·`fractions_training`·`congruence_symmetry`, 민서 1-2 `shapes`·`clock_rules`·`addition_subtraction_concept`·`number50`.
- **옮기는 틀**: 옛 활동은 그대로 관으로(다시 설계하지 않음), 관마다 미션 3개로 완료, 박힌 퀴즈는 `scripts/data/curriculum/math_{학년}_{단원}.json` → `register_curriculum.py`로 노션에, 순수 계산은 `{화면}-core.js`(시험), 관은 `{화면}-labs.js`.

### G. 학습설정 두 아이 몫 중복 저장 정리 — L3 (사용자 사전 승인)
- 노션 데이터를 옮기는 일이다. 맨 뒤에 하고, 실제 쓰기는 승인을 받은 뒤 1건만 시험하고 되돌려 확인한다.

## 진행 기록
| 날짜 | 묶음 | 결과 |
| :--- | :--- | :--- |
| 2026-11-27 | 0 (목록) | 이 문서 작성 |
| 2026-11-28 | F1 | `fractions_decimals.html`(770줄, 인라인 412줄) → 틀 래퍼 71줄 + `fractions_decimals-core.js`·`-labs.js`·CSS. 옛 활동 4개를 관으로, 관마다 미션 3개. 박힌 번개 퀴즈 6문제 + 새 6문제를 노션 3-1 `6. 분수와 소수` 12행으로 등록. 시험 `math-fractions-decimals3.test.mjs` 9개, 폰 크기에서 1~4관 미션 완료·퀴즈 배틀 채점 확인 |
| 2026-11-28 | F2 | `big_numbers.html`(592줄, 인라인 254줄) → 틀 래퍼 71줄 + `big_numbers-core.js`·`-labs.js`·CSS. 16자리 표를 조·억·만·일 네 묶음으로(폰 가로 스크롤 없앰), 뛰어 세기·크기 비교는 무작위 문제로. 틀린 비유 3개 바로잡음. 노션 4-1 `1. 큰 수` 12행 등록. 시험 `math-big-numbers4.test.mjs` 7개, 폰 크기에서 1~3관 완료·완주 창·퀴즈 배틀 확인 |
| 2026-11-28 | F3 | `division_concept.html`(461줄, 인라인 225줄) → 틀 래퍼 71줄 + `division_concept-core.js`·`-labs.js`·CSS. 관 3개(똑같이 나누기·곱셈구구 짝꿍·몫과 나머지) 무작위 미션, 「3개씩 4접시」 설명 오류 바로잡음. 노션 3-1 `3. 나눗셈` 12행 등록(Q11 해설의 「4번이」가 보기 번호 경고에 걸려 문구 바꿔 그 행만 --update). 시험 `math-division-concept3.test.mjs` 7개, 폰 크기에서 1~3관 완료·완주 창·퀴즈 배틀 확인 |
| 2026-11-28 | F4 | `planar_shapes.html`(420줄, 인라인 177줄) → 틀 래퍼 71줄 + `planar_shapes-core.js`·`-labs.js`·CSS. 관 3개(선의 3총사·각과 직각·도형 3총사) 무작위 미션, 맞히면 직각 표시. 노션 3-1 `2. 평면도형` 12행 등록(미리보기 경고 확인 후). 시험 `math-planar-shapes3.test.mjs` 6개, 폰 크기에서 1~3관 완료·완주 창·퀴즈 배틀 확인 |
| 2026-11-28 | F5 | `shape_movement.html`(481줄, 인라인 172줄) → 틀 래퍼 71줄 + `shape_movement-core.js`·`-labs.js`·CSS. 관 4개(밀기·뒤집기·돌리기·무늬 꾸미기), 대칭 없는 F 모양을 칸 좌표로 계산. 확인 중 무늬 규칙 두 개(pinwheel·diagonal)가 같은 무늬를 내던 것 고치고 규칙별 무늬가 다른지 시험 추가. 노션 4-1 `4. 평면도형의 이동` 12행 등록(Q10 「4번」을 「네 번」으로 고친 뒤). 시험 `math-shape-movement4.test.mjs` 10개, 폰 크기에서 1~4관 완료·완주 창·퀴즈 배틀 확인 |
| 2026-11-28 | F6 | `angles_concept.html`(213줄) + `js/angles_concept.js`(532줄) → 틀 래퍼 71줄 + `angles_concept-core.js`·`-labs.js`·CSS(같은 이름 새 내용), 옛 JS 지움. 관 4개(각도기 읽기·각 만들기·삼각형 세 각·사각형 네 각), 적힌 각대로 꼭짓점 계산. 확인 중 10°처럼 좁은 각에서 변이 눈금 숫자를 가림 → 20°~160°·숫자를 변 위에, 가는 삼각형(90°·70°·20°)에서 각 숫자가 다른 꼭짓점 쪽에 찍힘 → 가장 작은 각 30° 이상·표시 거리를 변 길이에 맞춤. 「평각」 분류 뺌. 노션 4-1 `2. 각도` 12행 등록. 시험 `math-angles-concept4.test.mjs` 10개(옛 `math-pages-split2`에서 각도 화면 뺌), 폰 크기에서 1~4관 완료·완주 창·퀴즈 배틀 확인 |
| 2026-11-27 | A | `--add-missing`·빠진 자리 시험 추가, HTML 125개의 `?v=` 521곳 채움(하이드로젠 medium 초안, Claude 적용·검수). 버전 글자를 그대로 비교하던 시험 7개를 쿼리 무시로 고침 |
| 2026-11-27 | B | `kids/data/legacy_backup/`(5개)·`kids/deprecated_backup/`(2개) 지움, 검사 제외 목록·주석 정리. 되살리기: `git checkout 2b7de65b -- kids/data/legacy_backup kids/deprecated_backup` |
| 2026-11-28 | E | 같은 이름 함수 15개 비교 → 본문이 갈라져 합치지 않음. 사회방 음성이 기계음이던 버그(공용 함수 덮어쓰기) 고침, 「Fairy_」 오타, 덮어쓰기 금지 시험 |
| 2026-11-28 | D3 | `science_report.js`(784줄) → 보고서 그리기 342줄 + `science_report_quiz.js` 469줄. 함께 쓰던 진행 상태 11개를 `ScienceReport._state` 한 객체로, 이름표 23개·전역 14개 그대로. 시험 `science-report-split.test.mjs` 5개, 폰 크기에서 3단원 보고서→미션 1 정답→미션 2 확인 |
| 2026-11-28 | D2 | `quest-mastery.js`(792줄)의 문제 생성·한글 받침 분석 308줄을 `quest-questions.js`(333줄)로 그대로 옮김 → 엔진 521줄. 화면 3곳 태그 추가, 옛 HTML 캐시와 섞여도 엔진이 멈추지 않게 자가 삽입·지연 함수(카본 검토), 시험 `quest-questions-split.test.mjs` 6개, 옮기기 전후 같은 씨앗 문제 45개 같음 |
| 2026-11-27 | D1 | 시간표 파서 두 벌(`notion-api-client.js` 안 사본 약 210줄 ↔ `notion-timetable.js`) → `notion-timetable.js` 한 벌(IIFE, 공개 9개 + `NotionTimetable`), 본문 읽기 4개는 api-client 한 벌. 사본에만 있던 정렬 수정을 옮겨 `timetable.html` 행 누락 위험도 고침. 시험 `notion-timetable.test.mjs` 5개. 카본 diff 검토 8개 중 3개 반영 |
| 2026-11-27 | C | 요정 묶음 순서 한 벌 `config.js` `FAIRY_CORE_CHAIN`, 동적 목록 4곳이 펼쳐 씀(로비 engine↔catalog 순서 바로잡음·요정 파일 캐시됨), 태그 순서 12화면 바로잡음, 엔진 자가 삽입 경고, `tests/fairy-chain.test.mjs`(네온 medium 초안). 설계 검토 카본·네온 |
