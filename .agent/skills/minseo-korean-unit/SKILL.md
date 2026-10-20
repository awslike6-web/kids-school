---
name: minseo-korean-unit
description: 민서(초1) 국어 단원 추가·수정 시 사용. 학교 받아쓰기 회차 문장에서 겹받침·맞춤법 낱말을 뽑아 5분방(3·3·3)용 VOCA_DB 정제 어휘(원형 + 학교 문장 예문 + [활용형])로 등록하고, 국어방 '🌱 민서 미니 독해' 지문(3~4문장 + 낱말→인물→글쓴이 3단계 문제)과 Edge-TTS mp3를 만드는 표준 절차. "민서 국어 N단원 추가", "받아쓰기 N회 낱말", "미니 독해 지문 추가/교과서로 교체" 요청에서 호출.
---

# 🌱 민서 국어 단원 추가 절차 (minseo-korean-unit)

> **원본 위치**: 이 파일은 `.agent/skills/minseo-korean-unit/SKILL.md`가 원본입니다. `.claude/skills/`는 사본이므로 직접 고치지 마세요. 고친 뒤에는 `python scripts/sync_agent_skills.py`를 실행합니다.
>
> **경로 기준**: 모든 경로는 `kids-school-main/` 기준입니다. master-tower 루트에서 작업 중이면 앞에 `kids-school-main/`을 붙이고, git 명령은 그 폴더 안에서 실행합니다(별도 저장소 `awslike6-web/kids-school`).
>
> **사실 정보의 원본은 따로 있습니다**: 규칙 본문은 `docs/korean_spec.md` §5-3·§5-4, 모듈·스크립트 API는 `kids/core/CORE_CATALOG.md`(`korean_mini_reading.js` 항목), 노션 속성은 `docs/notion_schemas_school.md`가 원본입니다. 이 스킬은 순서와 판단 기준만 둡니다.

## 1. 데이터 구조 (한눈에)
| 데이터 | 노션 DB · 핵심 속성 | 쓰는 곳 |
| :--- | :--- | :--- |
| 학교 받아쓰기 문장 (회차) | VOCA_DB · `과목=받아쓰기`만 · `단원=N회 (단원명)` | 국어방 받아쓰기 훈련소 |
| 정제 어휘 (이 스킬이 만듦) | VOCA_DB · `과목=국어`만 · `단원=N단원 (N. 단원명)` · `학년=1-2` · `학생=민서` · `어휘유형=단어` | 5분방 3·3·3, 국어 용어방 |
| 미니 독해 지문 (이 스킬이 만듦) | LIBRARY_DB · `트랙=🌱 민서 미니 독해` · `문제데이터`=step 1·2·3 JSON · `출처구분` | 국어방 `[4단계] 🌱 민서 미니 독해` |

- 받아쓰기 행은 **절대 고치지 않는다**. 정제 어휘에 `받아쓰기` 태그를 붙이지 않는다(붙이면 받아쓰기 훈련소에 섞임). 받아쓰기 행에 `국어` 태그를 붙이지 않는다(붙이면 5분방에 통문장이 나옴).
- 1-2 회차 ↔ 단원: 1회=1단원 · 2·3회=2단원 · 4회=3단원 · 5회=4단원 · 6회=5단원 · 7회=6단원 · 8·9회=7단원 · 10회=8단원. 실제 표기는 `--show-dictation`으로 확인한다.

## 2. 작업 순서
1. **학교 문장 보기**: `python -X utf8 scripts/register_minseo_korean.py --show-dictation 5` (단원에 회차가 둘이면 둘 다)
2. **시드 JSON 작성**: 직전 단원 파일을 복사해 `scripts/data/minseo_korean_1-2_u<N>.json`을 만든다. `unit`은 `N단원 (N. 단원명)` 형식으로 받아쓰기 회차의 괄호 안 단원명과 맞춘다.
3. **미리보기 → 등록**: 같은 명령에 `--file`을 주고 먼저 미리보기, 이상 없으면 `--apply`. 같은 학생·단원·단어는 갱신만 하고 숙련도·달성은 건드리지 않는다. LIBRARY_DB에 없는 속성·옵션은 스크립트가 만든다.
   ```
   python -X utf8 scripts/register_minseo_korean.py --file scripts/data/minseo_korean_1-2_u4.json
   python -X utf8 scripts/register_minseo_korean.py --file scripts/data/minseo_korean_1-2_u4.json --apply
   ```
4. **mp3 생성**: `pip install -U edge-tts` 후 `python -X utf8 scripts/build_mini_reading_audio.py` (없는 문장만 생성, `--dry-run` 목록, `--prune` 안 쓰는 파일 정리). 지문을 노션에서 고친 뒤에도 다시 돌린다.
5. **검증** (§5) → `docs/korean_spec.md` §5-3에 "N단원 등록분" 한 줄 추가 → 커밋·푸시 → 노션 개발 타임라인 기록(master-tower `scripts/log_dev_timeline.py`).

## 3. 정제 어휘 고르는 기준 (단원당 15~18개)
- **1순위 — 받아쓰기 문장 속 맞춤법 낱말**: 겹받침(ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ), 쌍받침(ㄲ ㅆ), 연음이 일어나는 받침(`일어났다→이러났다`), ㅎ 받침(`빨갛게→빨가케`), ㅐ/ㅔ 헷갈림. 문장마다 1~2개.
- **2순위 — 뜻을 알아야 하는 낱말**: 높임말(`댁`), 부사(`직접`, `열심히`, `간신히`), 단원 핵심 용어(`그림일기`, `날씨`, `느낌`). 단원당 3~5개.
- **빼는 것**: 조사·흔한 기초어(`나`, `가다`), 이미 다른 민서 국어 단원에 있는 표제어(묶음 출제 시 한쪽만 남아 진도가 갈림), 뜻 고르기가 성립하지 않는 의성어 남발, 의미 없는 발음 연습 글자.
- **표제어**는 기본형(`닳다`, `만나다`), 명사는 그대로.

## 4. 작성 규칙
- **뜻풀이**: 초1이 귀로 듣고 아는 말, 한 줄(25자 안팎). 표제어를 뜻풀이 안에 쓰지 않는다. 출처 표기(`1학년 2학기 받아쓰기 …`)를 넣지 않는다(5분방에서 제외됨).
- **상세설명(예문)**: 학교 받아쓰기 문장을 그대로 쓰고, 표제어의 활용형 한 어절만 `[ ]`로 감싼다 — `연필심이 [닳았다].` `[ ]` 안 어절은 **표제어와 첫 글자가 같아야** 5분방 Lv.2 빈칸으로 쓰인다(`usageInDetail`). 문장이 조각이면(`빨갛게 익은 사과를`) 자연스럽게 끝맺어도 된다. `( )`·`(예: …)` 형식은 쓰지 않는다.
- **미니 독해 지문** (단원당 2편):
  - 3~4문장(줄바꿈 = 화면 한 줄 = mp3 한 개), 초1 어휘, 받아쓰기 낱말 1~2개를 자연스럽게 넣는다.
  - 문제는 반드시 3개, `step` 1·2·3 순서: ① 낱말(지문 속 맞춤법 표기 고르기 또는 낱말 뜻) ② 인물의 생각·마음·까닭(`speaker: {name, icon, line}` 말풍선) ③ 글쓴이의 중심 생각·하고 싶은 말. 보기 3개, `answer`는 보기 문자열 그대로, `explanation`은 초1 말투 한두 문장.
  - `book_id`=`minseo_1-2_u<N>_<nn>`, `order`=`N*10+편번호`(서가 정렬용).
  - **출처구분**: 교과서 글을 보지 않고 새로 쓰면 `자체 창작`, 교과서 소재·장면을 바탕으로 새로 쓰면 `교과서 재구성`, 교과서 문장을 옮기면 `교과서 원문`. `원작 출처`에 무엇을 바탕으로 했는지 적는다. 교과서 사진을 받지 않았으면 교과서 내용을 지어내지 말고 `자체 창작`으로 쓴다.

## 5. 검증 (완료 판정)
1. 미리보기 출력에 `⚠️ [활용형] 표시가 없어` 경고가 없을 것.
2. 5분방 빈칸 보기 확인: 아래 명령으로 낱말별 보기를 출력해 엉뚱한 보기가 없는지 본다(Node 필요, PC에 v24 설치됨).
   ```
   node -e "global.localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}};require('./kids/subjects/quest/quest-mastery.js');const QM=globalThis.QuestMastery,d=require('./scripts/data/minseo_korean_1-2_u4.json');const it=QM.selectUnitItems(d.voca.map((v,i)=>({id:'v'+i,word:v.word,meaning:v.meaning,detailContext:v.detail,wordType:'단어',stage:d.unit,grades:['1-2'],subject:['국어'],target:['민서']})),{childName:'민서',subjectKo:'국어',unit:d.unit,semester:'1-2'});it.forEach(x=>{const f=QM.buildFillBlank(x,it,'ko',Math.random);console.log(x.word,'|',f&&f.display,'|',f&&f.options.join(' / '))})"
   ```
3. `node scripts/verify_quest_mastery.js`(또는 html) 전부 PASS.
4. 화면: 공부방 ⚙️ 설정 → 노션 동기화 후, 부모 진도판 민서 국어에 `📒 N단원 … · 개수` 칩이 생기고(여러 단원 묶음 최대 10개), 국어방 미니 독해 서가에 새 단원 묶음과 지문이 보이며 mp3로 읽히는지(개발자 도구 Network에서 `mini_reading/*.mp3` 200) 확인.

## 6. 함정
- 노션 Worker는 같은 query 본문을 5분간 캐시한다. 등록 직후 재실행 중복은 스크립트가 page_size를 바꿔 피하지만, 화면 확인은 노션 동기화가 필요하다.
- Python에서 Worker를 부를 때 `User-Agent`가 없으면 403. 한글 출력은 `python -X utf8`.
- 미니 독해 mp3 파일명은 대본 글자의 SHA-1이다. 화면 읽기 규칙(`korean_mini_reading.js`의 `linesOf`·`questionScript`)과 `build_mini_reading_audio.py`의 `clip_texts`·`question_script`는 반드시 같이 고친다.
- 지운 VOCA 행은 노션 휴지통(30일)에서 복원한다. 대량 정리 전에는 `scripts/data/archive/`에 원본 JSON을 남긴다.
