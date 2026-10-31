# 🧹 800줄 대청소 5차: 마이룸 `my-room.html` 인라인 스타일·스크립트 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 5차분. 같은 방식의 앞선 작업: `docs/math_pages_split_spec.md`(인라인 분리 규칙 §3).
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 최상위 함수 경계인 근거, 최상위 실행문 목록, 새 파일 이름과 예상 줄 수, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/my-room-split`, 브랜치 `codex/my-room-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/common_space/my-room.html`(1280줄)은 인라인 `<style>`(9–209줄)과 인라인 `<script>`(249–1277줄, 1029줄)를 담고 있다. **동작을 하나도 바꾸지 않고** 스타일과 스크립트를 별도 파일로 옮겨 모든 파일을 600줄 이하로 만든다.

## 2. 새 파일 (2026-10-31 main 기준 제안)
| 새 파일 (`kids/common_space/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `my-room.css` | 9–209 (`<style>` 안쪽) | 약 201 | 방·상점 독·가구 스타일 |
| `my-room-core.js` | 249–788 (`<script>` 안쪽 앞부분) | 약 540 | 노션 주소 헬퍼, 상태 변수, 맵·상점 목록, 노션 속성·로컬 저장·동기화 함수 |
| `my-room-main.js` | 789–1277 (`<script>` 안쪽 뒷부분) | 약 489 | `initRoom`, 독·가구 렌더링, 구매·맵 선택, 드래그, 맨 끝 `DOMContentLoaded` 등록 |

- 789줄은 `// ⚙️ 초기 기동` 주석, 790줄이 최상위 `function initRoom()`이다. 계획 단계에서 이 경계가 함수·블록·템플릿 문자열 밖인지 확인해 보고한다.
- 갤러리처럼 이 폴더에 CSS·JS를 둔다(`kids/common_space/gallery.css`, `gallery-*.js`).

## 3. 옮기는 규칙 (가장 중요, 수학 분리 §3과 같음)
1. **내용을 고치지 않는다.** 들여쓰기(8칸)까지 그대로 잘라 옮긴다. 이름 변경·정리·포맷팅·버그 수정 금지(발견하면 보고만). 새 파일 머리 주석도 넣지 않는다(수학 분리와 같게).
2. **스타일**: `<style>`이 있던 자리에 `<link rel="stylesheet" href="./my-room.css?v=20261031-room-split">`.
3. **스크립트**: 인라인 `<script>`가 있던 자리에 `<script src="./my-room-core.js?v=20261031-room-split"></script>`와 `<script src="./my-room-main.js?v=20261031-room-split"></script>`를 순서대로. 기존 `<script src="../config.js">`는 그대로 그 앞.
   - **IIFE로 감싸지 않는다.** HTML `onclick` 등이 전역 함수를 부른다. `type="module"`·`defer`도 붙이지 않는다.
   - 최상위 `let`/`const`(상태 변수, `ROOM_MAPS`, `MARKET_ITEMS`, `NOTION_ROOM_PROPS` 등)는 core에 그대로 둔다. **core를 읽는 즉시 main의 함수를 부르는 코드가 없어야 한다**(계획 단계에서 최상위 실행문을 모두 나열해 확인). `DOMContentLoaded` 등록은 main 끝에 그대로.
4. HTML 나머지 마크업은 그대로. 결과 HTML·CSS·JS 모두 600줄 이하.

## 4. 범위 밖
- 다른 800줄 초과 파일(`parent_dashboard.js`, `gallery.css`, `math.html`, `angles_concept.html` 등).
- 마이룸 기능·노션 저장 방식 변경, `kids/core/*`.

## 5. T (시험)
1. 신규 `tests/my-room-split.test.mjs` (`tests/math-pages-split.test.mjs` 방식을 따른다):
   - 구현 때 원본의 style·script 원문과 나머지 마크업을 `tests/fixtures/my-room-split/my-room.json`에 저장해 커밋한다(시험 때 git·main을 읽지 않음).
   - HTML·CSS·JS 모두 600줄 이하, 상대 경로 파일이 실제로 있음, 인라인 `<style>`·인라인 `<script>`가 남지 않음.
   - CSS 내용 = fixture style, core+main을 이은 내용 = fixture script(정규화는 수학 시험의 `normalize`).
   - 링크·스크립트 태그를 자리표시로 바꾼 마크업 = fixture markup.
   - `vm` 컨텍스트(가짜 `window`·`document`·`localStorage`)에서 core만 실행해도 오류가 없고, core+main 실행 후 전역 함수 이름 목록이 원래 인라인 스크립트 하나를 실행했을 때와 같다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고). fixture는 검사기가 줄 수 검사에서 뺀다.

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버에서 분리 전(main)·후(브랜치) `my-room.html`을 민수·민서로 열어 상점·맵 탭 독 HTML, 방 가구 배치, 계산된 스타일, 콘솔 오류를 비교한다. 가구 하나를 끌어 옮겨 본다(쓰기는 차단됨).

## 7. 문서
- `CORE_CATALOG.md`나 `docs/`에 마이룸 파일 구성이 적혀 있으면 새 구성으로 고친다. 지난 분리 명세서는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.
