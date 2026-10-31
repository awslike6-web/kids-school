# 🧹 800줄 대청소 8차: 수학 `math.html`·`angles_concept.html` 인라인 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
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

## 8. 구현 결과 (2026-10-31)

- 사용자 승인 후 두 페이지의 style·script 태그 내부를 들여쓰기·첫 개행·닫는 태그 앞 공백까지 그대로 옮겼습니다. 원래 위치의 태그만 상대 경로·`?v=20261031-math-split2` 외부 참조로 교체했습니다.
- `math.html` 원본의 style 8–274줄·script 718–847줄, `angles_concept.html` 원본의 style 11–133줄·script 333–865줄을 각각 한 파일씩 옮겼습니다. 기존 외부 스크립트 순서와 나머지 마크업은 유지했습니다.
- `tests/fixtures/math-split/{math,angles_concept}.json`에 구현 시점 `git show main:<HTML>`의 원문과 자리표시 마크업을 1차 형식(`source`·`markup`·`styles`·`scripts`)으로 고정했습니다. 시험 실행은 git·main·네트워크에 의존하지 않습니다.
- 두 스크립트 모두 뒤에 오는 파일의 선언에 기대지 않습니다. 대문은 최상위에서 `goLobbyBtn` 클릭을 즉시 등록하므로, 사용자 승인대로 VM에서 이 버튼 조회·클릭 등록만 허용했습니다. 각도 페이지는 DOMContentLoaded 등록 전 DOM 접근이 없습니다. 콜백 실행과 화면 조작은 §6의 별도 확인입니다.
- 줄 수는 1차와 같은 `text.split(/\r?\n/).length` 기준입니다. 원본은 이 기준으로 849줄·868줄이며 §2의 기록보다 각각 1줄 많습니다. 분리된 HTML·CSS·JS는 모두 600줄 이하입니다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/subjects/math/math.html` | 454 |
| `kids/css/math_lobby.css` | 267 |
| `kids/subjects/math/js/math_lobby.js` | 130 |
| `kids/subjects/math/angles_concept.html` | 214 |
| `kids/css/math_angles_concept.css` | 123 |
| `kids/subjects/math/js/angles_concept.js` | 533 |

### 검증 결과 및 남은 확인

- `node --test tests/math-pages-split2.test.mjs`: 10개 통과, 실패 0개(종료 코드 0).
- `node --test "tests/**/*.test.mjs"`: 249개 중 245개 통과, 실패 2개, 건너뜀 1개, TODO 1개(종료 코드 1). 실패는 기존 `gallery-character-runner.test.mjs:546`·`gallery-multi-character.test.mjs:92`의 Python 빌더 하위 프로세스 종료 상태가 `null`이어서 발생했습니다. 1차 명세서에도 기록된 환경 실패이며 해당 시험·빌더는 수정하지 않았습니다. 건너뜀은 로컬 kids-archive 부재, TODO는 기존 두 기기 동시 저장 한계입니다.
- 계약 검사로 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/math-split2/kids/subjects/math/math.html`을 실행했으나 `python` 명령을 찾지 못해 실패했습니다. §0에 따라 반복하지 않았고 다른 변경 파일의 계약 검사도 실행하지 못했습니다.
- `git diff --check`는 종료 코드 0이며 출력이 없습니다.
- §6의 분리 전후 화면 HTML·계산된 스타일·콘솔·각도 조작 비교는 Claude 담당으로 남습니다. 운영 노션 쓰기·main 병합·푸시는 하지 않았습니다.
- 커밋 못 함: 전체 회귀 시험 2개 실패와 필수 계약 검사 미실행으로 커밋 조건을 충족하지 못해 스테이징·커밋하지 않았습니다. Git 권한 차단을 확인했다는 뜻은 아니며 변경 파일과 fixture는 작업 폴더에 남아 있습니다. 커밋·푸시 후 노션 기록도 미실행입니다.

### Claude 확인 (2026-10-31)

- `main`의 두 HTML에서 뽑은 style·script 원문과 새 CSS·JS가 태그 바로 뒤 줄바꿈·닫는 태그 앞 들여쓰기만 빼고 같다(1차와 같은 방식).
- `node --test "tests/**/*.test.mjs"`: 249개 중 통과 247개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일 9개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8777·8778) 분리 전후 비교: `math.html`은 화면 글자와 요소 293개의 계산된 스타일이 같다. `angles_concept.html`은 요소 188개의 계산된 스타일이 같고, 글자 차이는 무작위로 뽑는 「미지의 각」 문제와 퀴즈 보기 순서뿐. 두 페이지 모두 콘솔 오류 없음.
- 분리본 각도 페이지에서 120° 프리셋을 눌러 각도기 바늘과 「120° 🪭 둔각」 표시가 바뀌는 것을 확인했다.
