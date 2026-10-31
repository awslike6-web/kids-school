# 🧹 800줄 대청소 10차: 교재 이미지 체인저 `admin-image-changer.html` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」 두 번째 목록의 첫 파일. 같은 방식의 앞선 작업: `docs/my_room_split_spec.md`, 규칙 원본 `docs/math_pages_split_spec.md` §3.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(인라인 블록 위치, 자를 줄과 최상위 함수 경계 근거, core의 최상위 실행문 목록, 새 파일 이름과 예상 줄 수, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/admin-changer-split`, 브랜치 `codex/admin-changer-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.
- 이 화면은 GitHub 업로드와 노션 쓰기를 한다. 시험·조사 중에 실제 GitHub·노션 요청을 보내지 않는다(모의 `fetch`만).

---

## 1. A (목표)
루트의 `admin-image-changer.html`(1346줄, 부모용 교재 이미지 퀵 체인저)은 인라인 `<style>`(8–240줄)과 인라인 `<script>`(475–1344줄, 868줄)를 담고 있다. **동작을 하나도 바꾸지 않고** 스타일과 스크립트를 별도 파일로 옮겨 모든 파일을 600줄 이하로 만든다.

## 2. 새 파일 (2026-10-31 main 기준 제안)
| 새 파일 | 원래 줄 (태그 안쪽) | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `kids/css/admin_image_changer.css` | 9–239 | 약 231 | 화면 스타일 |
| `kids/js/admin_image_changer-core.js` | 476–932 | 약 457 | 설정 상수·상태, `DOMContentLoaded` 등록, 모드 전환, 노션 교과·어휘 조회와 파싱, 필터, `renderQuestions`, 드래그 기본 동작 막기 |
| `kids/js/admin_image_changer-main.js` | 933–1343 | 약 411 | 편집 서랍, 이미지 압축·처리, 토큰 모달, GitHub 업로드·노션 갱신, 새 항목 모달, 토스트 |

- 933줄이 최상위 `function toggleDrawer(pageId)`. 계획 단계에서 경계가 함수·블록·템플릿 문자열 밖인지 확인해 보고한다.

## 3. 옮기는 규칙 (1차 `math_pages_split_spec.md` §3과 같음)
1. **내용을 고치지 않는다.** 태그 안쪽 원문(들여쓰기·첫 개행 포함)을 그대로 옮긴다. 머리 주석도 넣지 않는다. 정리·버그 수정 금지(발견하면 보고만).
2. 원래 `<style>` 자리에 `<link rel="stylesheet" href="kids/css/admin_image_changer.css?v=20261031-admin-split">`(이 페이지의 기존 상대 경로 방식 `kids/...`를 따른다).
3. 원래 인라인 `<script>` 자리에 core, main 순서로 `<script src="kids/js/admin_image_changer-core.js?v=20261031-admin-split"></script>`, `<script src="kids/js/admin_image_changer-main.js?v=20261031-admin-split"></script>`. 앞의 `kids/config.js`는 그대로. IIFE·`type="module"`·`defer` 금지(HTML `onclick`이 전역 함수를 부름).
4. core를 읽는 즉시 main의 함수를 부르는 코드가 없어야 한다(계획 단계에서 최상위 실행문을 모두 나열해 확인). `DOMContentLoaded` 콜백 안의 호출은 두 파일이 모두 실린 뒤라 괜찮다.

## 4. 범위 밖
- 화면 기능·GitHub/노션 요청 방식 변경, 다른 800줄 초과 파일.

## 5. T (시험)
1. 신규 `tests/admin-image-changer-split.test.mjs` (`tests/my-room-split.test.mjs` 방식):
   - 구현 때 원본 style·script 원문과 나머지 마크업을 `tests/fixtures/admin-image-changer-split/admin-image-changer.json`에 저장해 커밋한다.
   - HTML·CSS·JS 모두 600줄 이하, 상대 경로 실존, 인라인 style·script 없음, CSS = fixture style, core+main = fixture script, 자리표시 마크업 = fixture markup.
   - `vm`(가짜 `window`·`document`·`localStorage`, `fetch`는 호출되면 실패)에서 core만 실행해도 오류·네트워크 요청이 없고, core+main 실행 후 전역 함수 목록과 등록 이벤트 목록이 원래 스크립트 하나를 실행했을 때와 같다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트)에서 분리 전(main)·후(브랜치)를 열어 목록 HTML·계산된 스타일·콘솔 오류를 비교하고, 모드 전환·필터·편집 서랍 열기만 눌러 본다. **업로드·저장·토큰 입력은 하지 않는다.**

## 7. 문서
- `CORE_CATALOG.md`나 `docs/`에 이 화면의 파일 구성이 적혀 있으면 새 구성으로 고친다. 지난 분리 명세서는 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-10-31)

- 승인한 원본 933줄 `function toggleDrawer(pageId)` 앞에서 나눴습니다. `renderQuestions`는 928줄에서 끝나며 930·931줄의 이벤트 등록 뒤, 함수·블록·템플릿 문자열 밖의 경계입니다.
- 원래 style·script의 첫 개행·들여쓰기·닫는 태그 앞 공백까지 그대로 옮겼습니다. 머리 주석·IIFE·module·defer를 추가하지 않았고 기존 `kids/config.js` → core → main 순서 및 전역 함수를 유지했습니다.
- core 최상위 실행문은 설정 상수 5개, 상태 초기화 3개, 이벤트 등록 3개입니다. main 함수를 즉시 부르는 문장은 없으며 `DOMContentLoaded`·`dragover`·`drop` 콜백은 등록만 합니다.
- `tests/fixtures/admin-image-changer-split/admin-image-changer.json`에 분리 전 원문과 자리표시 마크업을 고정했습니다. 시험 실행은 git·main·실제 네트워크에 의존하지 않습니다. fixture는 계약 검사 줄 수 제한 대상에서 제외됩니다.
- 참조 검색에서 진입 링크는 `index.html`·`lobby.html`·`parent_dashboard.html`, 설명은 `README.md`·과학/사회 명세서·`unit_production_pipeline.md`에 있었습니다. 기존 HTML 경로와 기능은 유지되어 해당 참조는 바꾸지 않았고, 새 구성은 `CORE_CATALOG.md`에 등록했습니다. 지난 분리 명세서는 수정하지 않았습니다.
- 아래 줄 수는 기존 시험의 `text.split(/\r?\n/).length` 기준이며, 본문 행 범위만 센 §2 예상값과 달리 경계 개행도 포함합니다. 명세서와 다르게 구현한 사항은 없습니다.

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `admin-image-changer.html` | 247 |
| `kids/css/admin_image_changer.css` | 233 |
| `kids/js/admin_image_changer-core.js` | 459 |
| `kids/js/admin_image_changer-main.js` | 412 |

### 검증 결과 및 남은 확인

- 신규 시험: `node --test tests/admin-image-changer-split.test.mjs` → 7개 통과, 실패 0개. 원문·마크업·로드 순서·600줄 제한 및 설정 없음/빈 설정/설정 있음의 core 단독 실행·전역 함수 31개·등록 이벤트 3개를 확인했습니다. 초기화 전 DOM·저장소·통신·타이머 접근은 실패시키고 이벤트 콜백은 실행하지 않습니다.
- 전체 회귀 시험: `node --test "tests/**/*.test.mjs"` → 총 277개, 통과 273개, 실패 2개, 건너뜀 1개, TODO 1개(종료 코드 1). 실패는 수정하지 않은 `tests/gallery-character-runner.test.mjs:546`·`tests/gallery-multi-character.test.mjs:92`의 Python 빌더 시험이며, 하위 프로세스 종료 상태가 `null`이라 기대값 0과 달랐습니다. 해당 시험·빌더는 수정하지 않았습니다.
- 계약 검사: `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/admin-changer-split/admin-image-changer.html` → PowerShell에서 `python` 명령을 찾지 못해 실행하지 못했습니다. §0에 따라 반복하지 않았으며 나머지 변경 파일의 계약 검사도 미실행입니다. fixture의 줄 수 제외와는 무관한 실행 환경 문제입니다.
- `git diff --check`는 출력 없이 통과했습니다.
- 커밋 못 함: 전체 회귀 시험과 계약 검사의 필수 통과 조건을 충족하지 못해 스테이징·커밋은 시도하지 않았습니다. 변경 파일은 지정 작업 폴더에 남아 있습니다.
- 전후 화면·계산된 스타일·콘솔·모드 전환·필터·편집 서랍 비교는 §6에 따라 Claude 담당으로 남습니다. 실제 GitHub·노션 요청과 업로드·저장·토큰 입력, main 병합·푸시는 수행하지 않습니다.

### Claude 확인 (2026-10-31)

- `main:admin-image-changer.html`의 style·script 원문과 새 CSS, core+main을 이은 내용이 태그 바로 뒤 줄바꿈·닫는 태그 앞 들여쓰기만 빼고 같다.
- `node --test "tests/**/*.test.mjs"`: 277개 중 통과 275개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일 7개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8781·8782) 분리 전후 비교(읽기만, 업로드·저장·토큰 입력 안 함): 교과 모드 418개 항목 목록, 첫 항목 편집 서랍 열기, 용어사전 모드 100개 항목에서 요소 수·화면 글자·class 목록이 모두 같다. 계산된 스타일 차이는 배경 탭에서 멈춘 전환 효과(모드 탭 버튼 2개)뿐. 콘솔 오류·쓰기 요청 0건.
