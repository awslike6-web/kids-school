# 🧹 800줄 대청소 8차: 수학 `math.html`·`angles_concept.html` 인라인 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 8차분. **1차 `docs/math_pages_split_spec.md` §3 「옮기는 규칙」을 그대로 따른다.**
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(페이지별 새 파일 이름과 예상 줄 수, 인라인 블록 위치, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/math-split2`, 브랜치 `codex/math-split2`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
수학방 두 페이지의 인라인 `<style>`·`<script>`를 **동작을 하나도 바꾸지 않고** 별도 파일로 옮겨 모든 파일을 600줄 이하로 만든다.

## 2. 대상 (2026-10-31 main 기준)
| 페이지 | 전체 줄 | 인라인 style | 인라인 script | 새 파일 (제안) |
| :--- | ---: | :--- | :--- | :--- |
| `kids/subjects/math/math.html` (수학방 대문) | 848 | 8–274줄 | 718–847줄 | `kids/css/math_lobby.css`, `kids/subjects/math/js/math_lobby.js` |
| `kids/subjects/math/angles_concept.html` | 867 | 11–133줄 | 333–865줄 | `kids/css/math_angles_concept.css`, `kids/subjects/math/js/angles_concept.js` |

- 두 스크립트 모두 600줄 이하이므로 core/main으로 나누지 않고 한 파일씩.
- `math.html`의 CSS 이름은 이미 있는 `math_style.css`와 헷갈리지 않게 `math_lobby.css`로 한다.

## 3. 옮기는 규칙 (1차 §3과 같음)
1. **내용을 고치지 않는다.** 태그 안쪽 원문(들여쓰기·첫 개행 포함)을 그대로 옮긴다. 머리 주석도 넣지 않는다. 정리·버그 수정 금지(발견하면 보고만).
2. 원래 `<style>` 자리에 `<link rel="stylesheet" href="../../css/{css}?v=20261031-math-split2">`.
3. 원래 인라인 `<script>` 자리에 `<script src="./js/{js}?v=20261031-math-split2"></script>`. IIFE·`type="module"`·`defer` 금지(HTML `onclick`이 전역 함수를 부름). 앞뒤 외부 스크립트(`core.js`, `notion-helper.js`, `fairy-*` 등) 순서는 그대로.
4. 나머지 마크업은 그대로.

## 4. 범위 밖
- 다른 페이지, `lobby_controller.js`, 공통 코어(`kids/core/*`).

## 5. T (시험)
1. 신규 `tests/math-pages-split2.test.mjs` (`tests/math-pages-split.test.mjs`와 같은 구성):
   - 구현 때 원본 style·script 원문과 나머지 마크업을 `tests/fixtures/math-split/{math,angles_concept}.json`에 저장해 커밋한다(1차 fixture 형식 그대로).
   - 페이지·CSS·JS 모두 600줄 이하, 상대 경로 실존, 인라인 style·script 없음, CSS = fixture style, JS = fixture script(1차 `normalize`), 자리표시 마크업 = fixture markup, 외부 script 순서 보존.
   - `vm` 컨텍스트에서 JS를 실행해 읽는 즉시 오류가 없다(1차 시험의 "core 실행 가능" 검사와 같은 방식).
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트)에서 두 페이지를 분리 전·후로 열어 화면 HTML·계산된 스타일·콘솔 오류를 비교하고, 각도 페이지는 한 번 조작해 본다.

## 7. 문서
- `CORE_CATALOG.md`나 `docs/math_spec.md`에 두 페이지 파일 구성이 적혀 있으면 새 구성으로 고친다. 1차 명세서는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
