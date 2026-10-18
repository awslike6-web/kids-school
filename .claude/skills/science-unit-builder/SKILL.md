---
name: science-unit-builder
description: 초등 과학 단원(가상 실험실, 『실험관찰』 실험연계 디지털 탐구 보고서, NotebookLM 보고서 연동, 과학 대기실) 신규 제작·개선·검증 시 사용. 5대 가상 실험실(에러리스 터치·Retina DPI·rAF 절전·1회성 보석 잠금)과 실험연계 탐구 보고서(개념 비교표·실험 상세 분석·SVG 그래프·심화 탐구 박스·채점기준 연동 서술형 빌더·섞인 실험 순서 직접 조립기·별점 체크리스트) 표준 규격을 강제 적용할 때 호출.
---

# 🔬 초등 과학 단원(가상 실험실 & 실험연계 탐구 보고서) 표준 제작 스킬 (science-unit-builder)

> **원본 위치**: 이 파일은 `kids-school-main/.agent/skills/science-unit-builder/SKILL.md`가 원본입니다. 루트 `.agent/skills/`와 `.claude/skills/`는 사본이므로 직접 고치지 마세요. 수정 후 반드시 루트에서 `python scripts/sync_agent_skills.py`를 실행합니다.
>
> **핵심 목적**: 과학 단원의 `[4단계] 탐구 보고서`가 단순 어휘 빈칸 맞추기(용어방 복제판)로 퇴행하는 것을 원천 차단하고, **교과서 『실험관찰』 및 NotebookLM 실험연계 학습 보고서 기반의 깊이 있는 실험 분석 + 서술형 문장 조립 빌더 + 가상 실험실 연동**을 모든 단원(1~N단원)에서 100% 동일한 품질로 구현합니다.

---

## 1. 작업 전 필독 문서
1. `kids-school-main/docs/science_spec.md` : 과학방 전체 아키텍처 및 단원별 가상 실험실·탐구 보고서 명세
2. `kids-school-main/kids/core/CORE_CATALOG.md` §2-5 : `science_common.js`, `science_report.js`, `science_lab.js`, `science_u3_engine.js` API 도감
3. `kids-school-main/kids/data/science_lab_data.js` (`window.SCIENCE_LAB_REPORT_3_DATA`) : **3단원 『열과 우리 생활』 골드 스탠다드 레퍼런스 구현체**

---

## 2. 📑 NotebookLM 실험연계 보고서 추출 프롬프트 (부모님/사용자 표준)

다음 단원(예: 5-2 4단원 『물체의 운동』, 5단원 『산과 염기』 등) 작업 시 NotebookLM에 교과서/평가자료를 넣고 아래 구조로 보고서를 생성해 대화창에 붙여넣으면 에이전트가 즉시 표준 데이터셋으로 변환합니다:

```markdown
초등학교 [학년-학기] 과학 [N]단원: [단원명] 실험연계 학습 보고서를 아래 구성으로 작성해줘:
1. 단원 핵심 용어 및 실험 도구/원리 비교표 (표 2~3개: 실험 기구 쓰임새 비교, 원리 비교, 실생활 사례 비교)
2. 주요 탐구 실험 상세 분석 ([실험 1]~[실험 5] 각각의 실험 목표, 준비물, 단계별 실험 방법, 관찰 결과 및 그래프 변화, 결론, 안전 수칙)
3. 첨단 과학 또는 실생활 심화 탐구 박스 (예: KSTAR 인공 태양, 자기부상열차, 천연 지시약 등 호기심을 자극하는 심화 스토리)
4. 실험 연계 실전 문제 (객관식 추론 2~3문항 + 채점 기준 30%/30%/40%가 포함된 서술형 평가 2문항 + 모범 답안)
5. 나의 배움 확인 체크리스트 (성취기준 5~6개 항목)
```

---

## 3. 📝 `[4단계] 실험연계 디지털 탐구 보고서` 필수 구조 (`SCIENCE_LAB_REPORT_{N}_DATA`)

`kids/js/science_report.js`는 **N단원 플러그앤플레이 구조**로 설계되어 있어, 엔진 코드를 수정할 필요 없이 `kids/data/science_lab_data.js`에 `window.SCIENCE_LAB_REPORT_{N}_DATA` 객체를 선언하기만 하면 자동으로 렌더링됩니다.

### 🚫 절대 금지 사항 (Anti-Regression Rules)
1. **단순 단어 빈칸 끼워넣기 금지**: `q1`에 용어 3개(`전도`, `대류`, `단열` 등)만 정의 문장에 넣는 용어방 복제 문제를 절대 만들지 않습니다. 반드시 **실험 결과/그래프 해석 및 원리 서술형 문장 조립 빌더(`rubric` + `templateHtml` + 4~5개 과학 구절 블록)**로 작성합니다.
2. **이미 정렬된 순서 확인 버튼 금지**: `order` 유형의 `steps`는 반드시 `id: 1, 2, 3, 4` 단계별 실험 과정으로 작성하여, 엔진이 무작위로 섞어 제시하고 아이가 직접 1~4단계로 터치해 조립하도록 합니다.
3. **모달 잔상 및 구버전 캐시 방치 금지**: 단원 추가/수정 시 반드시 `science.html` 하단 스크립트 태그의 `?v=YYYYMMDD_u{N}` 버전을 갱신합니다.

### ✅ 필수 데이터 스키마 (`window.SCIENCE_LAB_REPORT_{N}_DATA`)
1. **메타데이터 및 테마 (`theme`)**:
   ```javascript
   window.SCIENCE_LAB_REPORT_4_DATA = {
       title: "4단원 [단원명] 실험연계 디지털 탐구 보고서",
       unit: "5학년 2학기 4단원 : [단원명]",
       rewardMsg: "4단원 [단원명] 실험연계 탐구 보고서 완벽 마스터",
       masterDesc: "[단원 핵심 실험 및 심화 탐구 요약 문구] (+5💎)",
       theme: {
           icon: "🚀", color: "#7c3aed", bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe",
           badge: "🚀 교과서 『실험관찰』 OO~OO쪽 · 실험연계 보고서",
           guide: "🔬 핵심 비교표, 교과서 탐구 실험 분석, 심화 탐구까지 한눈에 정복하세요!"
       },
       ...
   ```
2. **📊 [탭 1 상단] `conceptTables` (핵심 개념·도구·사례 비교표 2~3종)**:
   - 각 표는 `{ title, headers: [...], rows: [[...], ...] }` 형식.
   - 단순 줄글 대신 아이가 한눈에 비교할 수 있는 표(실험 기구별 특징·쓰임새, 조건별 변화 방향, 원리별 실생활 적용 사례)로 구조화합니다.
3. **🧪 [탭 1 중단] `summaryDoc` (교과서 4~5대 핵심 실험 상세 분석)**:
   - 각 실험 카드는 다음 필드를 포함합니다:
     - `title`: `"🌡️ [실험 1] ..."`
     - `page`: `"『실험관찰』 OO~OO쪽"`
     - `labLink`: `"science_xxx_lab.html"` (**`[🧪 가상 실험실 바로가기 ➔]`** 버튼 자동 생성)
     - `process`: 준비물 + `1. ~ 3.` 단계별 실험 과정
     - `diagramHtml`: (선택/권장) 실험 핵심 그래프나 도식을 표현하는 반응형 인라인 SVG 문자열
     - `result`: 실험 결과 및 관찰 내용 (핵심 변화 방향 강조)
     - `conclusion`: 실험을 통해 알게 된 과학적 결론
     - `think`: 일상생활 적용 질문 및 해설
     - `safetyTip`: `"⚠️ 안전 수칙 : ..."` (붉은 점선 안전 배지 자동 렌더링)
4. **🚀 [탭 1 하단] `specialDeepDive` (첨단 과학 / 실생활 심화 탐구 박스)**:
   - `{ badge, title, subtitle, description, points: ["1단계 ...", "2단계 ...", "3단계 ..."] }`
   - 교과서 개념이 실제 첨단 과학(예: KSTAR 인공 태양 1억 ℃, 고속열차, 우주선 등)에 어떻게 쓰이는지 연결하여 과학적 흥미를 극대화합니다.
5. **✍️ [탭 2] `quizItems` (참여형 실험 탐구 & 서술형 미션 6종 표준 구성)**:
   - **`q1` (`type: "blank"` — 서술형 문장 조립 빌더 1: 실험 그래프/결과 해석)**:
     - `rubric`: `["채점기준 ① (30%) : ...", "채점기준 ② (30%) : ...", "채점기준 ③ (40%) : ..."]`
     - `diagramHtml`: (권장) 문제 상단에 관찰용 미니 SVG 그래프 표시
     - `templateHtml`: `"... {b1} ... {b2} ... {b3} ... {b4} ... {b5} ..."`
     - `blanks`: `[{ id: "b1", target: "...", answer: "..." }, ...]` (4~5개 과학 구절)
     - `options`: 정답 구절 + 매력적인 오답 구절 1~2개
   - **`q2` (`type: "choice"` — 실험 조건·결과 비교 추론 4지선다)**:
     - 대조군/실험군 또는 실험 기구 형태 변화(예: 긴 구리판 vs ㄷ자 구리판)에 따른 결과 추론.
   - **`q3` (`type: "order"` — 참여형 실험 과정 직접 배열하기)**:
     - `steps`: `[{ id: 1, text: "..." }, { id: 2, text: "..." }, { id: 3, text: "..." }, { id: 4, text: "..." }]`
   - **`q4` (`type: "choice"` — 실험 도구 쓰임새 & 대표 오개념 찾기 4지선다)**:
     - 실험 기구의 올바른 사용법 및 학생들이 가장 많이 헷갈리는 오개념 판별.
   - **`q5` (`type: "blank"` — 서술형 문장 조립 빌더 2: 실생활 적용 & 심화 탐구 원리)**:
     - `rubric` (35%/35%/30%) + `templateHtml` (`{b1}`~`{b5}`) + `blanks` + `options`.
   - **`q6` (`type: "self_check"` — ⭐ 나의 배움 확인 체크리스트 5~6문항)**:
     - `checklist`: 단원 핵심 성취기준 5~6개 문장 배열.

---

## 4. 🧪 `[3단계] 5대 가상 실험실 (Virtual Labs)` 제작·검증 표준

1. **공통 엔진 및 CSS 필수 임포트**:
   - 스타일: `../../css/science_lab_common.css`
   - 공통 엔진: `../../js/science_u3_engine.js` (`window.ScienceU3Engine`)
2. **5대 기술 가드레일**:
   - **에러리스 터치 (Zero `touchmove` Drag)**: 모바일 화면 스크롤과 충돌하는 드래그앤드롭 대신 스팟 선택 버튼·토글·슬라이더 클릭 방식으로 구현.
   - **숨김 탭 Retina DPI 보정**: `ScienceU3Engine.setupHiDPICanvas(canvas)` 사용 (숨김 탭 `display:none` 상태에서도 부모 `.sim-viewport` 폭을 폴백 측정하여 0px 붕괴 방지).
   - **rAF 절전 루프**: `ScienceU3Engine.createLoop(drawFn)`으로 백그라운드 탭 전환 시 CPU/배터리 점유율 0% 유지.
   - **1회성 보석 트랜잭션 잠금**: `ScienceU3Engine.completeLabQuiz(...)` 및 `localStorage` 키(`minmin_sci_u{N}_{labId}_cleared`)로 중복 적립 차단 및 `science.html` 대기실 칩 `✅` 배지 연동.
   - **골디락스 줄 수 상한**: 모든 가상 실험실 HTML 및 JS 파일은 **절대 상한 800줄 미만**(권장 450~720줄)을 유지합니다.

---

## 5. 🔍 원클릭 자동 검증 및 배포 절차

단원 제작 또는 수정 완료 후 반드시 아래 순서로 검증하고 배포합니다:

1. **자동 검증 스크립트 실행**:
   ```bash
   python -X utf8 scripts/verify_science_unit.py --unit 3
   ```
   *(골디락스 800줄 상한, 탐구 보고서 필수 스키마, 서술형 빌더 빈칸-정답 매칭, 실험 순서 4단계 무결성을 자동 검사하여 `[ALL PASS]` 확인)*
2. **노션 DB 동기화**:
   - `VOCA_DB` (`375a27115b688038b686d3994ee12919`) 및 `CURRICULUM_DB` (`3e8a27115b68806d94bfc81e9b3435fa`)에 해당 단원 어휘 및 탐구보고서/실험실 레코드 동기화.
3. **문서 실시간 최신화**:
   - `kids-school-main/docs/science_spec.md` 및 `kids-school-main/kids/core/CORE_CATALOG.md` 줄 수·기능 명세 갱신.
4. **깃 커밋·푸시 및 노션 타임라인 기록**:
   - `git -C kids-school-main add/commit/push` 후 `python -X utf8 scripts/log_dev_timeline.py` 실행.
