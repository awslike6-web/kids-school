# 🧹 800줄 대청소 7차: 갤러리 `gallery.css` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 작업 지시 (구현 전)
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
