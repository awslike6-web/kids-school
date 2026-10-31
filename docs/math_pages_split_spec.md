# 🧹 800줄 대청소 1차: 수학 HTML 인라인 스타일·스크립트 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현 완료 (화면 비교는 §6에 따라 Claude 담당)
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
   - 사용자 승인 변경: 연산 스튜디오는 `math_`가 중복되지 않는 `kids/css/math_operator_studio.css`를 사용한다.
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

## 8. 구현 결과 (2026-10-31)

- 원래 블록의 내용·들여쓰기·태그 안쪽 개행까지 그대로 잘라 옮겼다. 상대 경로·캐시 버전과 외부 로드 태그만 바뀌었다.
- 절단점은 원본 HTML 기준 분수 곱셈 1036줄(`initPlayground` 다음 피자 렌더링 절), 분수 훈련 1087줄(`renderScaffoldMode`), 연산 스튜디오 1113줄(`changeBlockStep` 다음 세로셈 튜터 절), 수의 범위 1001줄(`setRoundingScope`)이다. 길이와 시간은 한 파일로 옮겼다.
- 각 HTML에 있던 인라인 script 1개씩, 총 5개를 원래 위치에서 외부 파일로 교체했다. core → main 순서와 기존 `DOMContentLoaded` 초기화를 유지한다.
- `tests/fixtures/math-split/{페이지}.json` 5개에 구현 당시 `git show main:<HTML>`의 style·script 원문과 나머지 마크업을 보존했다. 시험 실행 때 git·main·네트워크에 의존하지 않는다.
- 줄 수는 `text.split(/\r?\n/).length` 기준이다. 태그 안쪽 개행을 보존하여 계획 예상값보다 일부 파일이 1줄 많다. 실행 파일은 모두 800줄 미만이고 JS는 모두 600줄 이하이다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/subjects/math/fractions_multiplication.html` | 112 |
| `kids/css/math_fractions_multiplication.css` | 481 |
| `kids/subjects/math/js/fractions_multiplication-core.js` | 449 |
| `kids/subjects/math/js/fractions_multiplication-main.js` | 552 |
| `kids/subjects/math/fractions_training.html` | 66 |
| `kids/css/math_fractions_training.css` | 583 |
| `kids/subjects/math/js/fractions_training-core.js` | 444 |
| `kids/subjects/math/js/fractions_training-main.js` | 387 |
| `kids/subjects/math/math_operator_studio.html` | 107 |
| `kids/css/math_operator_studio.css` | 648 |
| `kids/subjects/math/js/math_operator_studio-core.js` | 365 |
| `kids/subjects/math/js/math_operator_studio-main.js` | 255 |
| `kids/subjects/math/ranges_estimation.html` | 337 |
| `kids/css/math_ranges_estimation.css` | 345 |
| `kids/subjects/math/js/ranges_estimation-core.js` | 324 |
| `kids/subjects/math/js/ranges_estimation-main.js` | 333 |
| `kids/subjects/math/length_time.html` | 239 |
| `kids/css/math_length_time.css` | 169 |
| `kids/subjects/math/js/length_time.js` | 532 |

### 발견한 기존 문제 (수정하지 않음)

- 연산 스튜디오 `renderBlocksView`의 마지막 단계에서 십진 막대 개수를 `Math.floor(quotient / 1)`로 표시한다. 기본값 `74 ÷ 6`의 몫 12에 대해 설명이 `10개 막대 12개 + 낱개 2개`가 된다. 원본과 같은 표현을 유지했으며 이번 분리에서 고치지 않았다.

### 검증 결과 및 남은 확인

- `node --test tests/math-pages-split.test.mjs`: 25개 통과, 실패 0개.
- `node --test "tests/**/*.test.mjs"`: 166개 중 통과 162개, 실패 2개, 건너뜀 1개, TODO 1개. 실패는 기존 `gallery-character-runner.test.mjs`와 `gallery-multi-character.test.mjs`의 Python 빌더 시험이며 하위 프로세스 종료 상태가 `null`로 기동에 실패했다. 해당 시험·빌더는 수정하지 않았다.
- 계약 검사: `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/math-split/kids/subjects/math/fractions_multiplication.html`은 PowerShell에서 `python` 명령을 찾지 못해 실행하지 못했다. §0에 따라 반복하지 않았으며 나머지 변경 파일의 계약 검사도 미실행이다.
- §6의 전후 화면·콘솔·문제 풀이 비교는 Claude 담당으로 남는다. 네트워크·운영 노션 쓰기·main 병합·푸시는 수행하지 않았다.
- 커밋 못 함: 지정 파일의 `git add`에서 `G:/master-tower/kids-school-main/.git/worktrees/math-split/index.lock` 생성이 `Permission denied`로 차단됐다. 스테이징을 반복하거나 커밋 명령으로 재시도하지 않았다. 변경 파일은 작업 폴더에 남아 있다.
