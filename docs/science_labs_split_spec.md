# 🧹 800줄 대청소 12차: 과학 실험실 3개 인라인 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
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
