# 🧹 800줄 대청소 17차: 과학방 `science.css` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」. 16차까지 800줄 이상 파일은 모두 정리했고, 이번부터는 **정확히 799줄이라 한 줄만 더해도 상한을 넘는 파일**을 미리 나눈다. 같은 방식의 앞선 CSS 작업: `docs/math_number50_split_spec.md`, `docs/gallery_css_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄과 최상위 경계 근거, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 시험 파일 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/science-css-split`, 브랜치 `codex/science-css-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/subjects/science/science.html` 한 곳에서만 싣는 `kids/css/science.css`(799줄)를 **모습을 하나도 바꾸지 않고** 연속 구간 두 개로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-11-01 main 기준 제안)

| 파일 | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/css/science.css` (**이름 유지**) | 1–400 | 400 | 기본·레이아웃, 오버레이/모달, 퀴즈 UI, `@keyframes shake`·`spin`, 인쇄(`@media print`) |
| `kids/css/science-units.css` | 401–799 | 399 (+머리 주석 1) | 단원 지문 요약 상자, 퀴즈 사진 줌/팬 뷰어, 반응형(`680px`·`550px`), 안전 선행 학습 게이트, 단원 선택 탭, 단원 묶음 섹션, 2단원 가상실험실 칩 그리드 |

- 399줄에서 `@media print`가 닫히고 400줄은 빈 줄, 401줄은 `/* ===… 📖 단원별 교과서 핵심 탐구 지문 요약 상자` 주석이다. 계획 단계에서 주석을 뺀 중괄호 깊이가 0인지 확인해 보고한다.
- 둘째 파일의 `@media` 규칙이 첫 파일 선택자를 덮어쓰는 경우가 있어도, 두 파일을 원래 순서로 이어 실으면 우선순위(나중 규칙 우선)가 원본과 같다. `@keyframes`는 같은 문서의 스타일시트끼리 공유된다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 선택자·속성·주석·공백 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 둘째 파일 맨 위에만 한 줄 주석을 추가한다: `/* kids/css/science-units.css - science.css 분리 2/2: 지문 요약·사진 뷰어·반응형·안전 게이트·단원 탭·실험실 칩 (science.css 다음에 로드) */`. 첫 파일은 원문만.
2. `@import` 금지. HTML `<link>` 두 개로 싣는다.
3. **참조**: `science.html`의 `<link rel="stylesheet" href="../../css/science.css">`(버전 없음)에 `?v=20261101-science-css-split`을 붙이고, 바로 다음 줄에 `<link rel="stylesheet" href="../../css/science-units.css?v=20261101-science-css-split">`를 넣는다. 계획 단계에서 저장소 전체를 다시 검색해 다른 로드(다른 과학 화면, 동적 삽입 포함)가 있으면 보고한다.

## 4. 범위 밖
- 다른 799줄 파일(`lobby.html`, `kids/subjects/haru/haru.html`), 과학 실험실 화면들의 CSS, 모습·기능 변경.

## 5. T (시험)
1. 신규 `tests/science-css-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/science-css-split/science.css`에 그대로 복사해 커밋한다.
   - 첫 파일 + (둘째 파일에서 머리 주석 1줄 뺀 것)을 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`, 앞선 작업처럼 바이트 보존도 확인).
   - 두 파일 600줄 이하, 둘째 파일 첫 줄이 지정 머리 주석, 두 파일 각각 주석을 뺀 `{`·`}` 개수가 같고 깊이가 음수로 내려가지 않는다.
   - `science.html`이 두 파일을 같은 버전·지정 순서로 연속해서 한 번씩 싣고 버전 없는 옛 참조가 없으며, 두 링크 외 HTML 원문이 바뀌지 않았다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버 두 개(분리 전·후, 한 탭씩)에서 `science.html`을 열어 CSS 규칙 해시, 계산된 스타일(데스크톱·680px 이하·550px 이하), 콘솔 오류를 비교한다.

## 7. 문서
- `CORE_CATALOG.md`나 `docs/science_spec.md`에 이 화면 CSS 구성이 적혀 있으면 새 구성으로 고치고, 없으면 `CORE_CATALOG.md` 과학 절에 두 파일의 역할·로드 순서·시험을 짧게 등록한다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
