# 🧹 800줄 대청소 12차: 과학 실험실 3개 인라인 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록. **1차 `docs/math_pages_split_spec.md` §3 「옮기는 규칙」, 8차 `docs/math_pages_split2_spec.md`와 같은 방식.**
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 과학 규칙은 `docs/science_spec.md`.

---

## 0. 진행 방식
- **먼저 계획(페이지별 인라인 블록 위치, 새 파일 이름과 예상 줄 수, 스크립트 최상위 실행문이 DOM·뒤 스크립트에 기대는지 여부, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/science-labs-split`, 브랜치 `codex/science-labs-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
과학 실험실 3개 페이지의 인라인 `<style>`·`<script>`를 **동작을 하나도 바꾸지 않고** 별도 파일로 옮겨 모든 파일을 600줄 이하로 만든다.

## 2. 대상 (2026-10-31 main 기준)
| 페이지 (`kids/subjects/science/`) | 전체 | style | script | 새 CSS (`kids/css/`) | 새 JS (`kids/subjects/science/js/`, 새 폴더) |
| :--- | ---: | :--- | :--- | :--- | :--- |
| `science_season_airmass_lab.html` | 1174 | 8–346 | 753–1170 | `science_season_airmass_lab.css` | `science_season_airmass_lab.js` |
| `science_cloud_lab.html` | 832 | 8–257 | 485–828 | `science_cloud_lab.css` | `science_cloud_lab.js` |
| `science_wind_lab.html` | 820 | 8–296 | 513–816 | `science_wind_lab.css` | `science_wind_lab.js` |

- 공통 실험실 CSS(`kids/css/science_lab_common.css`)가 이미 `kids/css/`에 있으므로 새 CSS도 그곳에 둔다. JS는 수학방(`kids/subjects/math/js/`)과 같은 구조로 과목 폴더 아래 `js/`.
- 각 스크립트는 600줄 이하이므로 한 파일씩.

## 3. 옮기는 규칙 (1차 §3과 같음)
1. **내용을 고치지 않는다.** 태그 안쪽 원문(들여쓰기·첫 개행 포함)을 그대로 옮긴다. 머리 주석도 넣지 않는다. 정리·버그 수정 금지(발견하면 보고만).
2. 원래 `<style>` 자리에 `<link rel="stylesheet" href="../../css/{css}?v=20261031-science-split">`. 앞의 `design-system.css` 링크는 그대로.
3. 원래 인라인 `<script>` 자리에 `<script src="./js/{js}?v=20261031-science-split"></script>`. 뒤의 `study-activity.js` 태그와 순서는 그대로. IIFE·`type="module"`·`defer` 금지(HTML `onclick`이 전역 함수를 부름).
4. 나머지 마크업은 그대로.

## 4. 범위 밖
- 다른 과학 페이지, 실험 기능·보상 변경, 공통 코어.

## 5. T (시험)
1. 신규 `tests/science-labs-split.test.mjs` (`tests/math-pages-split2.test.mjs`와 같은 구성):
   - 구현 때 원본 style·script 원문과 나머지 마크업을 `tests/fixtures/science-labs-split/{페이지}.json`에 저장해 커밋한다.
   - 페이지·CSS·JS 모두 600줄 이하, 상대 경로 실존, 인라인 style·script 없음, CSS = fixture style, JS = fixture script(1차 `normalize`), 자리표시 마크업 = fixture markup, 외부 script 순서 보존.
   - `vm`에서 JS를 실행해 읽는 즉시 오류가 없다(DOM 조회가 최상위에 있으면 계획에서 밝히고 시험 모의 환경에 허용 목록으로 둔다).
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트, 한 탭씩)에서 세 페이지를 분리 전·후로 열어 화면 글자·class·계산된 스타일·콘솔 오류를 비교하고, 각 실험을 한 번씩 조작해 본다.

## 7. 문서
- `CORE_CATALOG.md`나 `docs/science_spec.md`에 세 페이지 파일 구성이 적혀 있으면 새 구성으로 고친다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-10-31)

- 사용자 승인 후 세 페이지의 style·script 태그 내부를 첫 개행·들여쓰기·닫는 태그 앞 공백까지 그대로 옮겼다. 원래 위치의 태그만 상대 경로·`?v=20261031-science-split` 외부 참조로 교체했다. 기존 DOM·전역 함수·외부 스크립트 순서를 보존했다.
- 고정 fixture는 구현 시점 `git show main:<HTML>`에서 `source`·`markup`·`styles`·`scripts` 형식으로 만들었다. 당시 작업 폴더 원본과 main은 CRLF/LF를 제외하면 같았다. 시험 실행은 git·main·네트워크에 의존하지 않는다. 추가 읽기 검사로 main 원문을 작업 폴더의 CRLF로 맞췄을 때 새 CSS·JS 6개가 원문과 완전히 같음을 확인했다.
- 승인된 VM 허용 목록은 `localStorage.getItem('min_science_gems')` 1회, `gemCount.textContent` 쓰기 1회이며, 구름만 `cloudCanvas.getContext('2d')` 1회를 추가 허용했다. 저장값 없음·17의 두 경우를 검사한다. 계절·기단의 `DOMContentLoaded` 등록은 1회, 나머지는 0회이며 HTML에서 호출하는 전역 함수도 보존한다. 뒤의 `study-activity.js` 선언에 의존하지 않는다.
- 줄 수는 선행 시험과 같은 `text.split(/\r?\n/).length` 기준이다. 원본 HTML은 이 기준으로 1175·833·821줄로 §2 기록보다 각각 1줄 많으며, 블록 위치는 같다. 대상 HTML·CSS·JS 모두 600줄 이하이다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/subjects/science/science_season_airmass_lab.html` | 420 |
| `kids/css/science_season_airmass_lab.css` | 339 |
| `kids/subjects/science/js/science_season_airmass_lab.js` | 418 |
| `kids/subjects/science/science_cloud_lab.html` | 241 |
| `kids/css/science_cloud_lab.css` | 250 |
| `kids/subjects/science/js/science_cloud_lab.js` | 344 |
| `kids/subjects/science/science_wind_lab.html` | 230 |
| `kids/css/science_wind_lab.css` | 289 |
| `kids/subjects/science/js/science_wind_lab.js` | 304 |
| `tests/science-labs-split.test.mjs` | 142 |
| `tests/fixtures/science-labs-split/science_season_airmass_lab.json` | 2 |
| `tests/fixtures/science-labs-split/science_cloud_lab.json` | 2 |
| `tests/fixtures/science-labs-split/science_wind_lab.json` | 2 |
| `docs/science_spec.md` | 192 |
| `kids/core/CORE_CATALOG.md` | 1270 |
| `docs/science_labs_split_spec.md` | 89 |

### 검증 결과 및 남은 확인

- `node --test tests/science-labs-split.test.mjs`: 15개 통과, 실패 0개(종료 코드 0).
- `node --test "tests/**/*.test.mjs"`: 총 301개 중 통과 297개, 실패 2개, 건너뜀 1개, TODO 1개(종료 코드 1). 실패는 기존 `gallery-character-runner.test.mjs:546`·`gallery-multi-character.test.mjs:92`의 Python 빌더 하위 프로세스 종료 상태가 `null`인 경우다. 수학 선행 명세서에도 기록된 환경 실패이며 이번 범위 밖의 시험·빌더는 고치지 않았다. 건너뜀은 로컬 kids-archive 부재, TODO는 기존 두 기기 동시 저장 한계다. 신규 15개는 전체 묶음에서도 모두 통과했다.
- 계약 검사로 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/science-labs-split/kids/subjects/science/science_season_airmass_lab.html`을 실행했으나 `python` 명령을 찾지 못해 종료 코드 1로 실패했다. §0에 따라 반복하지 않았으며 나머지 변경 파일의 계약 검사도 실행하지 못했다.
- `git diff --check`: 종료 코드 0, 출력 없음.
- §6의 분리 전후 화면 글자·class·계산된 스타일·콘솔 오류 비교와 각 실험 조작은 Claude 담당으로 남는다. 운영 노션 쓰기·main 병합·푸시는 하지 않았다.
- 커밋 못 함: 전체 회귀 시험 2개 실패와 필수 계약 검사 미실행으로 커밋 조건을 충족하지 못했다. Git 커밋 권한 차단을 확인했다는 뜻은 아니며, 스테이징·커밋은 하지 않았다. 커밋·푸시 후 노션 기록도 미실행이다.

### Claude 확인 (2026-10-31)

- `main`의 세 HTML에서 뽑은 style·script 원문과 새 CSS·JS 6개가 태그 바로 뒤 줄바꿈·닫는 태그 앞 들여쓰기만 빼고 같다.
- `node --test "tests/**/*.test.mjs"`: 301개 중 통과 299개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일 16개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8785·8786, 한 탭씩)로 분리 전후 비교: 계절·기단(`selectAirmass('pacific')`, `highlightMatrix('okhotsk')`), 구름(`pressPump()` 3번), 바람(`switchLabMode('wind')`, `setWindTime('night')`) 조작 전후 모두 요소 수·화면 글자·class 목록·계산된 스타일이 같다(계절·기단은 카드 선택 전환 효과가 끝난 뒤 비교). 콘솔 오류·쓰기 요청 0건.
