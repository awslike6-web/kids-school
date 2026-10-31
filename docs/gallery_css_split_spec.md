# 🧹 800줄 대청소 7차: 갤러리 `gallery.css` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 7차분. 같은 방식의 앞선 작업: `docs/haru_css_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 갤러리 구조는 `docs/gallery_archive_spec.md`.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 최상위 경계인 근거, 새 파일 이름과 예상 줄 수, `gallery.css` 참조 검색 결과, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/gallery-css-split`, 브랜치 `codex/gallery-css-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/common_space/gallery.css`(860줄)는 갤러리 `kids/common_space/gallery.html` 한 곳에서만 쓰인다. **보이는 모습을 하나도 바꾸지 않고** 연속된 두 구간으로 잘라 두 파일 모두 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
| 파일 (`kids/common_space/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `gallery.css` (**이름 유지**) | 1–406 | 406 | 변수·민수/민서 테마, 상단 내비, 히어로, 통계 바, 필터·툴바, 작품 그리드·카드 |
| `gallery-modal.css` | 407–860 | 454 | 상세 보기 라이트박스, 작가의 한마디, 칭찬 스티커, 가족 방명록, 새 작품 등록 모달, 빈 상태, 2대 뷰 모드 스위처 |

- 407줄은 `/* 🪟 상세 보기 모달 (라이트박스) */` 주석. 앞 규칙 `.card-like-btn:hover`가 405줄에서 닫힌다. 파일 전체가 8칸 들여쓰기이므로 "최상위"는 줄 첫 글자가 아니라 중괄호 깊이 0으로 판단한다. 계획 단계에서 확인해 보고한다.
- 첫 파일 이름을 유지하면 문서·카탈로그의 기존 설명이 그대로 맞는다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 선택자·속성·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 정리·중복 제거·버그 수정 금지(발견하면 보고만).
2. 새 파일 `gallery-modal.css` 맨 위에만 한 줄 주석 `/* kids/common_space/gallery-modal.css - gallery.css 분리 2/2: 라이트박스·스티커·방명록·등록 모달·뷰 스위처 (gallery.css 다음에 로드) */`를 추가한다. `gallery.css`는 원래 머리 주석이 있으므로 그대로 둔다(1–406줄 원문만).
3. **순서 보존**: `gallery.html`의 `<link rel="stylesheet" href="./gallery.css">` 자리를 `./gallery.css?v=20261031-gallery-split`로 바꾸고 **바로 다음 줄**에 `<link rel="stylesheet" href="./gallery-modal.css?v=20261031-gallery-split">`를 넣는다. 다른 `<link>`·`<script>` 순서는 그대로(`design-system.css` 다음).
4. `@import`는 쓰지 않는다.

## 4. 범위 밖
- 다른 800줄 초과 파일(`math.html`, `angles_concept.html`, `lobby_controller.js`)과 갤러리 JS·HTML 마크업.

## 5. T (시험)
1. 신규 `tests/gallery-css-split.test.mjs` (`tests/haru-css-split.test.mjs` 방식):
   - 구현 때 원래 `gallery.css`를 `tests/fixtures/gallery-css-split/gallery.css`로 그대로 복사해 커밋한다.
   - `gallery.css` + (`gallery-modal.css`에서 머리 주석 1줄 뺀 것)을 이은 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`와 같게).
   - 두 파일 600줄 이하, 주석을 뺀 뒤 `{`·`}` 개수가 같다.
   - `gallery.html`이 두 파일을 같은 버전으로 연달아 싣고, 버전 없는 `./gallery.css` 링크가 남지 않았다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버(새 포트)에서 분리 전(main)·후(브랜치) `gallery.html`을 민수·민서로 열어 CSS 규칙 해시, `body` 계산된 스타일, 상세 보기 모달·등록 모달을 열었을 때의 모습, 콘솔 오류를 비교한다.

## 7. 문서
- `CORE_CATALOG.md` 957줄 근처와 `docs/gallery_archive_spec.md` 64줄의 파일 구성 설명에 `gallery-modal.css`를 더한다. 지난 명세서는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-10-31)

승인한 원본 범위 1–406 / 407–860을 그대로 사용했습니다. `.card-like-btn:hover`가 405줄에서 닫히며 중괄호 깊이가 0이 되고, 406줄은 빈 줄, 407줄은 상세 보기 모달 머리 주석입니다. 절단점에 열린 주석·문자열·소괄호가 없으며, 주석을 뺀 앞 구간은 중괄호 54쌍, 뒤 구간은 62쌍입니다. 명세서와 다른 구현은 없습니다.

| 파일 | 실제 줄 수 | 역할 |
| :--- | ---: | :--- |
| `kids/common_space/gallery.css` | 406 | 원본 1–406줄, 머리 주석 포함 그대로 유지 |
| `kids/common_space/gallery-modal.css` | 455 | 지정 머리 주석 1줄 + 원본 407–860줄 |
| `kids/common_space/gallery.html` | 307 | 기존 CSS 링크 자리에서 두 파일 순차 로드 |
| `tests/gallery-css-split.test.mjs` | 90 | 신규 회귀 시험 6개 |
| `tests/fixtures/gallery-css-split/gallery.css` | 860 | 분리 전 원본 바이트 보존 |
| `kids/core/CORE_CATALOG.md` | 1245 | 파일 역할·로드 순서·시험 등록 |
| `docs/gallery_archive_spec.md` | 217 | 두 CSS의 역할·로드 계약 기록 |
| `docs/gallery_css_split_spec.md` | 86 | 구현 결과·검증 한계 기록 |

물리 줄 수 기준입니다. 마지막 개행을 별도 항목으로 세는 시험의 `split(/\r?\n/).length`에서는 CSS가 각각 407·456으로 집계되며 모두 600줄 이하입니다. 원본 fixture는 계약 검사기의 `tests/fixtures/` 제외 대상이므로 860줄을 그대로 보존합니다.

- 원문은 선택자·속성·주석·들여쓰기·줄바꿈을 그대로 옮겼습니다. 새 CSS 맨 위의 지정 주석 1줄만 추가했습니다.
- `gallery.html`에서 두 CSS를 `?v=20261031-gallery-split`로 연속 로드하며, 기존 `design-system.css` 다음 위치를 유지했습니다.
- 계획 단계 검색: `kids/` 3개 파일·5줄, `docs/` 11개 파일·21줄, `scripts/`·`tests/` 0건. 실제 화면 로드는 `gallery.html:10` 한 곳이었습니다.
- 시험은 링크 파일명·상대 경로·순서·버전·실존·기존 위치·바로 다음 줄, 고정 fixture 재결합, 크기·블록 경계·`@import` 금지·버전 없는 링크 제거를 확인합니다. 시험 실행 시 git·main을 읽지 않습니다.
- Node 읽기 전용 대조로 CSS 재결합과 fixture의 바이트 완전 일치, fixture와 Git HEAD 원본의 CRLF 정규화 후 일치, HTML의 링크 외 원문 동일, 지난 명세서 미변경을 확인했습니다.

### 실행한 검증과 남은 확인

- `node --test tests/gallery-css-split.test.mjs`: 종료 코드 0, 6개 통과·실패 0개.
- `git diff --check`: 종료 코드 1, `kids/common_space/gallery.css:406: new blank line at EOF.` 원본 406줄의 빈 줄을 그대로 보존한 결과이므로 §3의 원문 유지 규칙에 따라 제거하지 않았습니다.
- `node --test "tests/**/*.test.mjs"`: 종료 코드 1, 총 239개 중 통과 235개·실패 2개·건너뜀 1개·기존 todo 1개. 실패한 `tests/gallery-character-runner.test.mjs`와 `tests/gallery-multi-character.test.mjs`의 Python 빌더 시험은 하위 프로세스 `status=null`로 중단됐습니다. 기존 시험은 spawn 오류 코드를 출력하지 않으므로 구체적인 오류 코드는 확인하지 못했습니다.
- `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/gallery-css-split/kids/common_space/gallery.css`: PowerShell이 `python` 명령을 찾지 못해 실행되지 않았습니다. §0에 따라 재시도하지 않았으며 나머지 변경 파일의 계약 검사도 미실행입니다.
- 화면 비교는 수행하지 않았으며 §6의 Claude 후속 확인 대상입니다. 노션 쓰기는 하지 않았습니다.
- 커밋 못 함: 전체 회귀 시험과 필수 계약 검사가 통과하지 않아 커밋하지 않았습니다. main 병합·푸시·노션 기록은 하지 않았습니다.
- Claude 후속 확인: Python 사용이 가능한 환경에서 전체 회귀와 변경 파일별 계약 검사, 노션 쓰기 차단 서버의 민수·민서 화면 비교, 검증 후 커밋.

### Claude 확인 (2026-10-31)

- `main:kids/common_space/gallery.css`와 `gallery.css` + `gallery-modal.css`(머리 주석 제외)를 이은 내용이 줄바꿈 형식만 빼고 같다. fixture도 같다. `git diff --check`의 「406줄 빈 줄」은 원본 406줄 빈 줄을 보존한 것.
- `node --test "tests/**/*.test.mjs"`: 239개 중 통과 237개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일 7개 계약 검사 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버(새 포트 8775·8776)로 `gallery.html` 분리 전후 비교: 갤러리 CSS 규칙 113개와 그 내용 해시가 같고, 숨은 모달을 포함한 `body` 요소 890개의 계산된 스타일(18개 속성)이 모두 같다. 콘솔 오류 없음.
