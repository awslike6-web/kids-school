# 🧹 800줄 대청소 17차: 과학방 `science.css` 분리 명세서

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01, Claude 검증 완료)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」. 최초 개행 수 집계는 799였으나, 계획 단계에서 마지막 개행 없는 `}`를 포함한 실제 800줄을 확인했다. 같은 방식의 앞선 CSS 작업: `docs/math_number50_split_spec.md`, `docs/gallery_css_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄과 최상위 경계 근거, 새 파일 이름과 예상 줄 수, 참조 검색 결과, 시험 파일 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/science-css-split`, 브랜치 `codex/science-css-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/subjects/science/science.html` 한 곳에서만 싣는 `kids/css/science.css`(800줄, 마지막 개행 없음)를 **모습을 하나도 바꾸지 않고** 연속 구간 두 개로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-11-01 사용자 승인 경계)

| 파일 | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/css/science.css` (**이름 유지**) | 1–400 | 400 | 기본·레이아웃, 오버레이/모달, 퀴즈 UI, `@keyframes shake`·`spin`, 인쇄(`@media print`) |
| `kids/css/science-units.css` | 401–800 | 400 (+머리 주석 1) | 단원 지문 요약 상자, 퀴즈 사진 줌/팬 뷰어, 반응형(`680px`·`550px`), 안전 선행 학습 게이트, 단원 선택 탭, 단원 묶음 섹션, 2단원 가상실험실 칩 그리드 |

- 399줄에서 `@media print`가 닫히고 400줄은 빈 줄, 401줄은 `/* ===… 📖 단원별 교과서 핵심 탐구 지문 요약 상자` 주석이다. 계획 단계에서 주석을 뺀 중괄호 깊이가 0인지 확인해 보고한다.
- 799개의 개행 뒤 마지막 개행 없는 800줄의 `}`까지 둘째 구간에 포함한다. 사용자 승인에 따라 이 마지막 개행 없음도 보존한다.
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
   - 승인된 HTML 원문도 같은 폴더의 `science.html`에 그대로 보관한다. 이 폴더의 fixture는 계약 검사기의 줄 수 제한 대상에서 제외된다.
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

## 8. 구현 결과 (2026-11-01)

- 사용자 승인대로 원본 1–400줄 / 401–800줄을 분리했다. 첫 파일은 원문 그대로이고 둘째 파일에만 §3의 지정 머리 주석 한 줄을 더했다. 머리 주석을 제외한 재결합은 fixture와 바이트까지 같으며, 마지막 개행 없는 `}`도 보존했다. CSS·HTML fixture는 줄바꿈만 LF로 맞추면 작업 전 HEAD 원본과 각각 같다.
- 주석을 제외한 중괄호는 앞 구간 61쌍·뒤 구간 50쌍이며 최저·최종 깊이가 모두 0이다. 399줄에서 인쇄 블록이 닫히고 400줄은 빈 줄, 401줄에서 단원 지문 요약 절 주석이 시작한다.
- `science.html`은 기존 링크 위치에서 `science.css` → `science-units.css`를 상대 경로·동일 `?v=20261101-science-css-split`로 연속해서 한 번씩 로드한다. 두 링크 외 HTML 바이트는 고정 fixture와 같다. 운영 소스에 다른 로드나 버전 없는 옛 참조가 없는지도 시험했다.
- 계획 단계 저장소 파일 2,339개 검색에서 `science.css`는 3개 파일·8줄이었다(실제 HTML 로드 1줄·자기 머리 주석 1줄·이번 명세 6줄). JS 동적 삽입을 포함한 다른 로드는 발견되지 않았다. 기존 카탈로그·과학 명세에 이 화면 CSS 구성이 없어 카탈로그 과학 절에 신규 등록했다. 지난 분리 명세서와 `docs/science_spec.md`는 고치지 않았다.
- `tests/science-css-split.test.mjs`는 CSS·HTML 고정 원본, 정확한 절단 경계, 머리 주석, 바이트 재결합·마지막 개행 없음, 600줄 상한, 독립 CSS 블록·`@import` 부재, HTML 상대 경로·버전·순서·연속·중복·나머지 원문 보존을 검사한다. 운영 DB에는 접속하지 않는다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/css/science.css` | 400 |
| `kids/css/science-units.css` | 401 |
| `kids/subjects/science/science.html` | 412 |
| `tests/science-css-split.test.mjs` | 106 |
| `tests/fixtures/science-css-split/science.css` | 800 |
| `tests/fixtures/science-css-split/science.html` | 411 |
| `kids/core/CORE_CATALOG.md` | 1296 |
| `docs/science_css_split_spec.md` | 83 |

물리 줄 수 기준이다. 첫 CSS는 400번째 빈 줄 뒤 개행도 보존하므로 `split(/\r?\n/).length`로는 401로 집계되지만 두 CSS 모두 600줄 이하이다. `tests/fixtures/`는 사용자 확인대로 계약 검사기의 줄 수 제외 대상이다.

- `node --test tests/science-css-split.test.mjs`: 종료 코드 0, 6개 통과·실패 0개.
- `node --test "tests/**/*.test.mjs"`: 종료 코드 1, 349개 중 통과 345·실패 2·건너뜀 1·기존 TODO 1. 실패는 기존 `tests/gallery-character-runner.test.mjs:477`·`tests/gallery-multi-character.test.mjs:72`의 Python 빌더 하위 프로세스 종료 상태 `null` 두 건이다. 시험이 spawn 오류 코드를 출력하지 않아 그 두 건의 구체적인 실행 실패 원인은 확인하지 못했다. 해당 시험·빌더는 수정하지 않았다.
- `git diff --check`: 종료 코드 1, `kids/css/science.css:400: new blank line at EOF.`. 원본 절단점의 빈 줄을 보존한 결과이므로 제거하지 않았다.

### Claude 검증 (2026-11-01)
- Codex 환경의 전체 시험 실패 2건은 그 샌드박스에서 Python이 실행되지 않아 생긴 것이다. 같은 작업 폴더에서 Claude가 돌린 `node --test "tests/**/*.test.mjs"`는 349개 중 347 통과·실패 0·기존 TODO 1이다.
- 바뀐 파일 6개 모두 `verify_contracts.py --mode file` → `[ALL PASS]`. 첫 파일 + (둘째 파일 머리 주석 뺀 것)이 main 작업 파일과 바이트까지 같다.
- 쓰기 차단 서버 두 개(분리 전 8789, 분리 후 8790)에서 `science.html`을 비교했다: 과학 CSS 규칙 85개 해시와 화면 글자 동일. 같은 조건(같은 폭에서 새로 열고 5초 대기)으로 연 화면의 요소 198개 계산 스타일 해시가 1024px·400px(680px·550px 미디어 쿼리 모두 적용) 모두 같고 콘솔 오류 없음. 폭을 바꿔 가며 잰 첫 비교의 차이는 측정 순서·애니메이션 진행 차이였다.
