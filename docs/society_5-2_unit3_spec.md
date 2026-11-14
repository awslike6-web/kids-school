# 🏛️ 민수 5-2 사회 3단원 등록 설계 (Antigravity 작업 지시)

> 단원: **3. 식민 통치와 저항, 전쟁이 바꾼 사회와 생활** (민수 5-2)
> 자료 추출: NotebookLM(교과서 원본) → 작업: Antigravity `gemini-4-hydrogen`
> 기준 문서: `GEMINI.md` §1·§3·§5·§8, `docs/society_spec.md`, `kids/core/CORE_CATALOG.md`
> 작성: 2026-11-13 (Claude Code가 기존 1·2단원 등록 흔적을 조사해 정리)

---

## 0. 기존 등록 방식 조사 결과 (왜 이렇게 설계했나)

| 항목 | 2단원(2-1·2-2) 때 한 방식 | 3단원에서 바꿀 점 |
| :--- | :--- | :--- |
| 용어(VOCA_DB) | 일회성 스크립트 `register_society_5_2_late_joseon_data.py` (지금은 `scripts/archive/2026-11/`) | **공식 도구 `scripts/register_voca.py` + 자료 JSON** (일회성 스크립트 금지, 관제탑 GEMINI.md §9-5) |
| 사료·지도·도표 문제(CURRICULUM_DB) | 같은 일회성 스크립트 | **공식 도구가 아직 없음** → 먼저 `scripts/register_curriculum.py`를 만든다 (§3) |
| 사진 URL 넣기 | 일회성 `update_society_curriculum_media.py` | 위 공식 도구의 `media_url` 칸으로 함께 처리 |
| 오프라인 사본 | `kids/data/society-data.js`에 196줄 복사 | **넣지 않는다.** 노션 단일 원천(GEMINI.md §8-2), 두 벌이면 글자가 어긋난다 |
| 동화 | 관제탑 `scripts/build_storybook.py` | 그대로. 단 `--skip-deploy` 필수 (기본값이 자동 푸시) |

기존 노션 행에 실제로 쓰인 값 (그대로 맞춘다):
- VOCA_DB: `과목=사회`, `학년=5-2`, `학생=[민수, 공통]`, `영역 분류=용어방`, `어휘유형=개념`, `시험범위=✓`, `단원=소단원 원문`
- CURRICULUM_DB: `과목=사회`, `학년=5-2`, `구역 ∈ {역사사료, 지도탐방, 자료분석}`, `보기 1~4`=줄바꿈(`\n`)으로 4줄, `정답`=1~4 (1부터 셈)
- 사회방 화면의 구역 연결: `chart=자료분석`, `map=지도탐방`, `history=역사사료` (`kids/js/society_common.js` `fetchCurriculumFromNotion`)
- 보기 순서는 화면이 섞는다(2026-11-14~, `QuizChoices`). 자료의 정답 위치는 신경 쓰지 않아도 되고, 해설에 보기 번호를 쓰지 않는다.

---

## 1. 단원 이름 계약 (가장 먼저 확정)

칩·퀘스트·동화가 모두 노션 「단원」 원문 글자로 묶인다. 한 글자라도 다르면 칩이 둘로 갈라진다 (`society_spec.md` §3-4).

- 2단원 선례: `2-1. 유교 문화의 영향으로 달라진 조선 사회`, `2-2. 새로운 사회를 향한 조선 후기 사람들의 노력`
- 3단원: **NotebookLM으로 교과서 목차의 소단원 제목을 글자 그대로 뽑아** 아래 형식으로 정한다.
  - 소단원이 있으면: `3-1. {소단원1 원문}`, `3-2. {소단원2 원문}`
  - 소단원이 없으면: `3. 식민 통치와 저항, 전쟁이 바꾼 사회와 생활`
- 정한 원문은 이 문서 §7 표에 적고, 이후 모든 JSON·동화 `units`에 복사해서 쓴다 (손으로 다시 치지 않기).

---

## 2. NotebookLM 추출 지시 (교과서 → 자료 3종)

NotebookLM에 교과서 3단원 PDF/사진을 넣고 아래 순서로 뽑는다. **추출본은 원본 그대로 보존**: `scripts/data/source/society_5-2_u3/notebooklm_*.md` (사람이 확인할 근거).

1. **목차·쪽수**: 소단원 제목 원문, 각 차시 제목과 교과서 쪽수.
2. **핵심 용어**: 소단원마다 5~8개. 교과서에 굵게/용어풀이로 나온 낱말만. 각 용어에 `뜻(초5 눈높이 한 줄)`, `교과서 문장 기반 설명 1~2문장`, `쪽수`.
3. **사료·지도·도표 목록**: 교과서에 실린 독립 자료(사진·지도·그래프·문서)만. 각 자료에 `쪽수`, `자료 이름`, `무엇을 보여 주는지`. 만화 삽화·캐릭터 컷은 제외 (GEMINI.md §5-1).
4. **4지선다 문제**: 위 자료마다 1문항. `질문`, `보기 4개`, `정답 번호`, `해설(왜 맞고 왜 틀린지)`, `구역(역사사료/지도탐방/자료분석)`.
5. **동화 줄거리 재료**: 소단원별 사건 순서(연도 포함)와 꼭 들어가야 할 장면 8~10개.

추출 후 사람이 대조할 것: 연도·인물·사건명 표기가 교과서와 같은가 (예: `3·1 운동` 가운뎃점, 띄어쓰기). 다르면 교과서 표기를 따른다.

---

## 3. CURRICULUM_DB 공식 등록 도구 ✅ (2026-11-13 Claude Code 제작)

- 도구: `scripts/register_curriculum.py` (회귀 시험 `scripts/test_register_curriculum.py`, CI에서도 돎)
- 자료: `scripts/data/curriculum/society_5-2_{단원키}.json` (예: `society_5-2_3-1.json`)
- 동작은 `register_voca.py`와 같다: 기본 미리보기 → `--apply`는 새 행만 → `--update`는 기존 행도 덮어씀. 노션에만 있는 행은 알려만 주고 지우지 않음.
- 같은 행 = `과목·학년·단원·제목`. **제목을 바꾸면 새 행이 생긴다** (옛 행은 「노션에만 있음」으로 남음).
- 자료 검사: `question·choices·answer`는 셋 다 쓰거나 셋 다 비움, 보기 2~4개(4지선다는 4개)·줄바꿈 금지·중복 금지, 정답은 1부터 센 번호.
- 경고: 선택지에 없는 과목·학년·구역 / 사회방이 안 읽는 구역(역사사료·지도탐방·자료분석 외) / 사회 구역별 행 100개 초과.
- `media_url`: 빼면 노션 사진 칸을 건드리지 않음(퀵체인지로 바꾼 사진 보호), `""`이면 공란으로 맞춤 (GEMINI.md §5-1).
- 상세 계약: `kids/core/CORE_CATALOG.md` 「교재·사료 문항 등록기」 절.

자료 형식:
```json
{
  "_설명": "민수 5-2 사회 3-1 사료·지도·도표 문제. 출처: NotebookLM 추출본 scripts/data/source/society_5-2_u3/",
  "subject": "사회", "grade": "5-2", "unit": "3-1. {소단원1 원문}",
  "items": [
    {
      "title": "[독립운동] 3·1 운동 (교과서 OO쪽 사진)",
      "zone": "역사사료",
      "question": "…",
      "choices": ["…", "…", "…", "…"],
      "answer": 2,
      "explanation": "…",
      "usage": "교과서 OO쪽 · 자료가 보여 주는 내용 한 줄",
      "media_url": ""
    }
  ]
}
```

---

## 4. Antigravity(hydrogen) 작업 순서

각 단계 끝에 **미리보기 출력을 사람에게 보여 주고 승인 후** 다음으로 간다.

### ① 용어방 (2단계 빌드업) — VOCA_DB
- 자료: `scripts/data/voca/society_5-2_3-1.json`, `society_5-2_3-2.json` (소단원마다 1개)
```json
{
  "_설명": "민수 5-2 사회 3-1 핵심 용어. 출처: NotebookLM 추출본 (교과서 쪽수는 detail 끝에 표기)",
  "subject": "사회", "grade": "5-2", "student": ["민수", "공통"],
  "unit": "3-1. {소단원1 원문}",
  "test_scope": true, "area": "용어방",
  "voca": [
    {"word": "…", "meaning": "초5 눈높이 한 줄 뜻", "detail": "교과서 문장 기반 1~2문장 (OO쪽)", "type": "개념"}
  ]
}
```
- 초성 힌트는 화면이 단어에서 자동 계산하므로 `pos`(품사)는 비운다.
- 실행: `python -X utf8 scripts/register_voca.py --file scripts/data/voca/society_5-2_3-1.json` (미리보기) → 승인 → `--apply`

### ② 사료·지도·도표 (2·3단계) — CURRICULUM_DB
- 자료: `scripts/data/curriculum/society_5-2_3-1.json`, `society_5-2_3-2.json` (§3 형식)
- 구역 배분 권장(소단원당 8~11문항, 2단원 선례): 역사사료 4~5 · 자료분석 3~4 · 지도탐방 1~2
- 실행: `python -X utf8 scripts/register_curriculum.py --file …` (미리보기) → 승인 → `--apply`

### ③ 교과서 사진 (사료 문제의 그림)
- 저장 위치: `kids/subjects/society/images/minsu/5-2/3/` (1·2단원이 `…/5-2/1/`, `…/5-2/2/`)
- **필수 순서**: `ImageOps.exif_transpose` → 자르기 → **에이전트가 파일을 직접 열어 육안 검수**(방향·대상이 가운데·문제와 일치) → 통과한 것만 JSON `media_url`에 넣고 `--update`.
- 사진이 없거나 만화 삽화뿐이면 **공란**. 보고서에 「교과서 내 독립 사료 부재로 공란」이라고 표로 적는다 (GEMINI.md §5-1·§5-4).
- 일회성 크롭 스크립트를 `scripts/`에 두지 않는다 (작업 폴더는 임시 폴더).

### ④ 단원 동화 (1단계 워밍업) — 2편 권장
| 편 | 소단원 | 식별자(안) | 그림 폴더 번호 |
| :--- | :--- | :--- | :---: |
| 7편 | 3-1 식민 통치와 저항 | `colonial_resistance` | 7 |
| 8편 | 3-2 전쟁이 바꾼 사회와 생활 | `war_life_change` | 8 |

- 그림 폴더 번호는 **단원 번호가 아니라 책 순번**이다 (kids-archive `assets/storybook/society/minsu/5-2/1~6`이 이미 1~6편).
- 지문 파일: `[표지]`, `[1장]`…`[10장]` 태그로 나눈다 (빌더가 이 태그로 쪽을 자른다). `(이미지: …)` 같은 지문 찌꺼기는 빌더가 걸러 주지만, 화면 글·그림 장면·TTS 대본이 1:1로 같아야 한다 (GEMINI.md §3-4).
- 실행 (관제탑 루트에서):
```bash
python scripts/build_storybook.py --subject society --child minsu --grade 5-2 --unit 7 --book-id colonial_resistance --title "도서명" --text-file "지문.txt" --img-dir "삽화폴더" --skip-deploy
```
  - ⚠️ `--skip-deploy`를 빼면 빌드 직후 자동으로 깃 푸시까지 한다. 반드시 붙인다.
- 서가 등록: `kids/js/society_storybook.js`의 `SOCIETY_STORYBOOK_LIBRARY`에 빌더가 출력한 코드를 넣고 `units: ["3-1. {원문}"]`을 단다.
- 내용 기준 (전쟁·식민지 주제):
  - 초5 눈높이. 폭력·죽음은 직접 묘사하지 않고 「사람들이 겪은 어려움」과 「지키려 한 마음」 중심.
  - 연도·사건명은 교과서와 같게. 실존 인물(독립운동가 등)은 교과서에 나온 인물만, 지어낸 대사는 교과서 사실 범위 안에서.
  - 그림을 만든 뒤 10장 모두 육안 검수 (인물 얼굴 깨짐, 글자 섞임, 장면-글 불일치).

### ⑤ 5분 퀘스트 연결
- 따로 코드를 고치지 않는다. ①의 `시험범위=✓` 행이 3·3·3 마스터리로 출제된다.
- 확인 주소: `quest_runner.html?subject=society&user=minsu&unit={단원 원문 URL 인코딩}`

---

## 5. 검증 (커밋 전, 모두 통과해야 함)

1. 노션 쓰기 차단 서버로 화면 확인: `python scripts/guarded_preview_server.py` (포트 8767)
   - 사회방: 학기 칩 `5-2` → 단원 칩에 3단원 소단원이 **하나씩만** 뜨는가 (갈라짐 없음)
   - 사다리 카드 숫자: 용어 N개 · 사료 N개 · 명소 N개 · 문제 N개 · 동화 N권
   - 용어방·돋보기·지도·도표·동화 각각 열어 3단원 자료가 나오는가, 사진 확대(돋보기) 동작
   - 5분 퀘스트 한 판: 정답 `fairyPraise`, 오답 노란 안내 + `fairyEncourage`, 완주 `fairyReward`
2. 동화: 모든 쪽 음성 재생, 글-음성 일치
3. `python -X utf8 ../scripts/verify_contracts.py --mode git-diff` (검사기는 관제탑 `scripts/`에 있음) → `[ALL PASS]`. 「조감도 지도 파일 목록이 낡음」이 나오면 `python -X utf8 scripts/build_system_map.py` 후 같이 커밋
4. `node --test "tests/**/*.test.mjs"` → `fail 0` (S5-기기 「알려진 한계」 todo 1건은 실패로 세지 않음)
5. `python -X utf8 -m unittest scripts/test_register_voca.py scripts/test_register_curriculum.py` 통과 (자료 JSON도 함께 검사됨)
6. `python -X utf8 scripts/check_scripts_allowlist.py --all` 통과 (새 일회성 스크립트 없음)

### 미리 볼 위험
- `fetchCurriculumFromNotion`은 구역별로 **최대 100행만** 읽는다 (다음 쪽 안 읽음). `register_curriculum.py` 미리보기가 행 수를 세어 100을 넘으면 경고한다. 경고가 나오면 등록 전에 멈추고 여러 쪽 읽기로 먼저 고친다 (Claude Code에 맡겨도 됨). 2026-11-13 미리보기에서는 경고 없음.
- 노션 Worker가 `HTTP 429 rate_limited`를 내면 `retry_after`초(약 1분) 기다렸다 다시 실행한다. 연달아 여러 번 돌리지 않는다.

---

## 6. 문서·기록 갱신 (같은 작업 안에서)
- `docs/society_spec.md`: §3-1 서가 9권, §3-2 3단원 라인업(어휘 수·문항 수), §3-4 동화↔단원
- `kids/core/CORE_CATALOG.md`: 새 도구(§3)를 만들었으면 등록
- 노션 개발 타임라인 기록 (관제탑 GEMINI.md)
- 커밋 끝줄: `Agent: antigravity (gemini-4-hydrogen)` (관제탑 `scripts/agent_commit_rules.json`과 글자까지 같게)
- 커밋 단위(권장): ① 용어 JSON ② 문제 JSON ③ 사진 ④ 동화 7편 ⑤ 동화 8편 ⑥ 문서

---

## 7. 확정 값 기록표 (작업하면서 채움)

| 항목 | 값 |
| :--- | :--- |
| 소단원 1 원문 | `3-1. 식민 통치와 저항으로 달라진 사회와 생활 모습` |
| 소단원 2 원문 | `3-2. 8·15 광복과 6·25 전쟁으로 달라진 사회와 생활 모습` |
| 용어 수 (3-1 / 3-2) | `12개` / `14개` (+ `2-1` 핵심 4개, `2-2` 핵심 3개 추가) |
| 문항 수 (역사사료 / 자료분석 / 지도탐방) | 3-1: `5 / 5 / 2` (12문항) · 3-2: `4 / 4 / 2` (10문항) |
| 사진 등록 / 공란 문항 | 사진 등록 22건 (`images/minsu/5-2/3/*.jpg`) / 공란 0건 (QR 영상 링크 1건) |
| 동화 7편 제목 | `꺾이지 않는 겨레의 불꽃` (`colonial_resistance_storybook.html`) |
| 동화 8편 제목 | `전차가 멈춘 날에서 6월의 편지까지` (`war_life_change_storybook.html`) |
