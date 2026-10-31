# 🧹 800줄 대청소 1차: 수학 HTML 인라인 스타일·스크립트 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 1차분.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(파일별로 어디서 자를지, 새 파일 이름과 예상 줄 수, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/math-split`, 브랜치 `codex/math-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
수학방 페이지 5개는 HTML 한 파일에 큰 `<style>`과 `<script>`가 들어 있어 800줄을 넘는다. **동작을 하나도 바꾸지 않고** 스타일과 스크립트를 별도 파일로 옮겨 모든 파일을 800줄 미만으로 만든다.

## 2. 대상 (2026-10-31 측정)
| 페이지 | 전체 줄 | 인라인 style | 인라인 script |
| :--- | ---: | ---: | ---: |
| `kids/subjects/math/fractions_multiplication.html` | 1590 | 480 | 999 |
| `kids/subjects/math/fractions_training.html` | 1476 | 582 | 829 |
| `kids/subjects/math/math_operator_studio.html` | 1371 | 647 | 618 |
| `kids/subjects/math/ranges_estimation.html` | 1335 | 344 | 655 |
| `kids/subjects/math/length_time.html` | 938 | 168 | 531 |

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·스타일 한 글자도 바꾸지 않고 잘라서 옮기기만 한다. 변수 이름 변경, 정리, 포맷팅, 버그 수정 모두 금지(발견하면 보고만).
2. **스타일**: `<style>` 내용을 `kids/css/math_{페이지}.css`로 옮기고, 원래 `<style>` 자리에 `<link rel="stylesheet" href="../../css/math_{페이지}.css?v=20261031-split">`. (기존 `kids/css/` 규칙을 따름)
3. **스크립트**: 인라인 `<script>` 내용을 `kids/subjects/math/js/{페이지}.js`로 옮기고, **원래 그 `<script>`가 있던 자리**에 `<script src="./js/{페이지}.js?v=20261031-split"></script>`. 로드 순서를 바꾸지 않는다.
   - **IIFE로 감싸지 않는다.** HTML의 `onclick="..."` 등이 전역 함수를 부르기 때문에 클래식 스크립트 그대로 둔다. `type="module"`·`defer`도 붙이지 않는다(원래 속성 그대로).
   - 한 파일이 600줄을 넘으면 **함수 경계에서** 둘로 나눈다: `{페이지}-core.js`(상수·상태·함수 선언), `{페이지}-main.js`(나머지). 나눈 파일은 원래 순서대로 연달아 로드한다.
   - 나눌 때 주의: 함수 선언 끌어올리기(hoisting)는 파일 하나 안에서만 된다. **파일을 읽는 즉시 실행되는 코드**(최상위의 함수 호출, 즉시 쓰는 변수 초기화)가 뒤 파일의 함수를 부르면 안 된다. 그런 즉시 실행 코드는 마지막 파일에 둔다. `DOMContentLoaded`·이벤트 안의 호출은 괜찮다.
4. 인라인 `<script>`가 여러 개면 각각 따로 옮기거나, 바로 이어 붙어 있을 때만 합친다(사이에 다른 스크립트가 있으면 합치지 않음).
5. HTML의 나머지(마크업)는 그대로. 결과 HTML·CSS·JS 모두 800줄 미만, 가능하면 600줄 이하.

## 4. 범위 밖
- 다른 과목·다른 800줄 초과 파일(`haru.css`, `daily-diary.js`, `notion-reward.js`, `my-room.html`, `gallery.css` 등)은 이번에 하지 않는다.
- 공통 코어(`kids/core/*`)는 건드리지 않는다.

## 5. T (시험)
1. 신규 `tests/math-pages-split.test.mjs`:
   - 5개 페이지와 새로 만든 CSS·JS가 모두 800줄 미만.
   - 각 페이지가 참조하는 새 CSS·JS 파일이 실제로 있음(상대 경로 기준).
   - 각 페이지에 남은 인라인 `<script>`가 없음(원래 없던 것 제외), 인라인 `<style>` 없음.
   - **내용 보존**: `git show main:<원래 HTML>`에서 뽑은 인라인 style·script 원문과, 새 파일 내용을 순서대로 이어 붙인 것이 같다(줄 끝 공백·마지막 줄바꿈 차이만 허용). 이 비교는 시험 안에서 `main` 원본을 읽지 말고, 구현 때 원본을 `tests/fixtures/math-split/`에 저장해 두고 비교한다. 시험 데이터는 커밋한다(용량 작음).
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
분리 전(main)·후(브랜치)를 노션 쓰기 차단 서버로 열어 5개 페이지의 첫 화면 스크린샷과 콘솔 오류를 비교한다. 문제 하나 풀기까지 눌러 본다.

## 7. 문서
- `CORE_CATALOG.md`에 수학방 페이지 파일 구조가 적혀 있으면 새 경로로 고친다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
