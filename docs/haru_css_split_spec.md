# 🧹 800줄 대청소 2차: 하루방 `haru.css` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 2차분. 1차는 `docs/math_pages_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 최상위 경계인 근거, 새 파일 이름과 예상 줄 수, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/haru-css-split`, 브랜치 `codex/haru-css-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/css/haru.css`(2756줄)는 하루방 `kids/subjects/haru/haru.html` 한 곳에서만 쓰인다. **보이는 모습을 하나도 바꾸지 않고** 영역별 CSS 파일 여러 개로 잘라 모든 파일을 800줄 미만(가능하면 600줄 이하)으로 만든다.

## 2. 자르는 위치 (2026-10-31 main `2146839b` 기준 제안)
원래 파일의 절 머리 주석이 있는 줄에서 자른다. 아래는 제안이며, 계획 단계에서 각 절단 줄이 **최상위**(어떤 `{ }`·`@media` 블록 안도 아님)인지 확인해 보고한다. 맞지 않으면 가까운 최상위 절 경계로 옮긴다.

| 새 파일 (`kids/css/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `haru-base.css` | 1–430 | 430 | 변수·공통·상단 바·헤더·탭·위젯 카드, 1. 습관 & 루틴, 2. 자연 & 예술 감상실 |
| `haru-special-days.css` | 431–936 | 506 | 3. 특별한 날 추억 게시판(포토 카드·감정 도장·동영상·음성 중단·이야기 폼·반응형) |
| `haru-checkin.css` | 937–1275 | 339 | 30초 하루 체크인, 특별한 날 사진 팝업 모달 |
| `haru-safety.css` | 1276–1781 | 506 | 4. 119 안전 수호대 & 닥터 코코 |
| `haru-timeline-clock.css` | 1782–2298 | 517 | 24시간 타임머신 헤더·날짜 바·시계판·핀·툴팁·필터 |
| `haru-timeline-list.css` | 2299–2756 | 458 | 타임라인 목록·스티커 트레이·모달 입력·요일 선택기·끝의 반응형 |

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 선택자·속성·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 정리·포맷팅·중복 제거·버그 수정 금지(발견하면 보고만).
2. **순서 보존**: CSS는 뒤에 온 규칙이 이긴다. `haru.html`의 원래 `<link rel="stylesheet" href="../../css/haru.css?v=20260918_02">` **바로 그 자리**에 새 `<link>` 6개를 위 표 순서대로 넣는다. 캐시 버전은 모두 `?v=20261031-haru-split`. 다른 `<link>`·`<script>`의 위치와 순서는 그대로.
3. 각 새 파일 맨 위에 한 줄 주석 `/* kids/css/{파일} - haru.css 분리 {n}/6: {내용} (haru.html에서 순서대로 로드) */`만 추가한다. 이 줄 말고는 원문 그대로.
4. 원래 `kids/css/haru.css`는 지운다(다른 참조가 없음을 계획 단계에서 `kids/`, `docs/`, `scripts/`, `tests/` 전체 검색으로 다시 확인해 보고).
5. `@import`로 한 파일에서 나머지를 부르는 방식은 쓰지 않는다(요청이 직렬로 늘어남).

## 4. 범위 밖
- 다른 800줄 초과 파일(`daily-diary.js`, `notion-reward.js`, `my-room.html`, `gallery.css` 등)과 하루방 JS·HTML 마크업은 이번에 하지 않는다.
- 공통 코어(`kids/core/*`)는 건드리지 않는다.

## 5. T (시험)
1. 신규 `tests/haru-css-split.test.mjs`:
   - 구현 때 원래 `haru.css`를 `tests/fixtures/haru-css-split/haru.css`로 그대로 복사해 커밋한다(시험 실행 때 git·main을 읽지 않음).
   - `haru.html`에서 `kids/css/haru-*.css`를 가리키는 `<link>`를 문서 순서대로 읽고, 그 파일들이 실제로 있고 6개이며, 각 파일의 첫 줄(§3-3 머리 주석)을 뺀 내용을 순서대로 이어 붙인 것이 fixture와 같다(줄바꿈 형식·줄 끝 공백·마지막 개행 차이만 허용). 정규화 방식은 `tests/math-pages-split.test.mjs`의 `normalize`와 같게.
   - 각 새 파일이 800줄 미만, 600줄 이하.
   - 각 새 파일은 주석을 뺀 뒤 `{`와 `}` 개수가 같다(블록 중간에서 자르지 않았음).
   - `haru.html`에 `haru.css` 참조가 남지 않았고, `kids/css/haru.css` 파일이 없다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고).

## 6. 화면 확인 (Claude가 함)
분리 전(main)·후(브랜치)를 노션 쓰기 차단 서버로 열어 하루방 탭마다(습관·감상실·특별한 날·안전·타임머신, 체크인 모달) 스크린샷과 계산된 스타일, 콘솔 오류를 비교한다. 폰 폭(375px)도 본다.

## 7. 문서
- `CORE_CATALOG.md` §2-8과 `docs/haru_spec.md` §6에 새 파일 구성·역할·로드 순서·시험을 기록한다.
- **승인 시 확정한 예외**: `docs/math_pages_split_spec.md`는 지난 작업 기록이므로 수정하지 않는다. 이 문서의 기존 파일 언급과 fixture 경로는 분리 이력·시험 계약으로 유지한다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 8. 구현 결과 (2026-10-31)

계획에서 제안한 원본 범위 1–430 / 431–936 / 937–1275 / 1276–1781 / 1782–2298 / 2299–2756을 그대로 사용했습니다. 각 절단점은 중괄호 깊이 0이며 열린 주석·문자열·괄호가 없습니다. 직전 블록은 각각 429줄(일반 규칙), 935줄(`@media`), 1274줄(`@media`), 1781줄(일반 규칙), 2297줄(일반 규칙)에서 닫힙니다.

| 파일 | 실제 줄 수 (머리 주석 포함) | 역할 |
| :--- | ---: | :--- |
| `kids/css/haru-base.css` | 431 | 변수·공통·상단·습관·감상실 |
| `kids/css/haru-special-days.css` | 507 | 특별한 날 추억 게시판 |
| `kids/css/haru-checkin.css` | 340 | 30초 체크인·사진 팝업 |
| `kids/css/haru-safety.css` | 507 | 119 안전 수호대·닥터 코코 |
| `kids/css/haru-timeline-clock.css` | 518 | 타임머신 헤더·시계판·필터 |
| `kids/css/haru-timeline-list.css` | 459 | 타임라인 목록·스티커·모달·반응형 |
| `kids/subjects/haru/haru.html` | 799 | 기존 링크 자리에 CSS 6개 로드 |
| `tests/haru-css-split.test.mjs` | 99 | 신규 회귀 시험 10개 |
| `tests/fixtures/haru-css-split/haru.css` | 2756 | 원본 보존용 정적 fixture |
| `kids/core/CORE_CATALOG.md` | 1227 | §2-8 CSS 구성 등록 |
| `docs/haru_spec.md` | 175 | §6 스타일 로드 계약 |
| `docs/haru_css_split_spec.md` | 97 | 구현 결과·검증 한계 |

원본 fixture는 2,756줄입니다. 마지막 개행까지 `split(/\r?\n/).length`로 세는 시험에서는 실제 줄 수보다 1 크게 집계하며 모든 새 CSS가 여전히 600줄 이하입니다.

계획 단계 전수 검색 결과는 `kids/` 2줄, `docs/` 9줄, `scripts/`·`tests/` 0줄이며 실제 로드 참조는 `haru.html:8` 한 곳이었습니다. 원본 머리 주석과 문서의 과거 파일명·fixture 언급은 로드 참조가 아닙니다.

- `haru.html`의 기존 링크만 6개 링크로 바꾸고 나머지 마크업·스크립트 순서는 보존했습니다.
- 원본 파일은 제거하고 고정 fixture로 보존했습니다.
- 신규 시험은 링크 6개·순서·버전·실존·기존 위치, 원문 재결합, 크기·블록 경계·`@import` 금지, 기존 파일·참조 제거를 검사합니다.
- 화면 비교는 수행하지 않았으며 §6의 Claude 후속 확인 대상입니다.

### 실행한 검증과 남은 확인

- `node --test tests/haru-css-split.test.mjs`: 종료 코드 0, 10개 통과·실패 0개.
- `node --test "tests/**/*.test.mjs"`: 종료 코드 1, 총 192개 중 통과 188개·실패 2개·건너뜀 1개·기존 todo 1개. 실패한 갤러리 빌더 두 시험은 Python 하위 프로세스의 `status=null`로 중단됐습니다(기존 시험은 원래 spawn 오류 코드를 출력하지 않음).
- `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file G:/master-tower/scratch/worktrees/haru-css-split/kids/css/haru-base.css`: PowerShell이 `python` 명령을 찾지 못해 실행되지 않았습니다. §0에 따라 재시도하지 않았으며 나머지 변경 파일의 계약 검사도 미실행입니다.
- Node 읽기 전용 대조로 CSS 재결합 바이트와 fixture의 완전 일치, Git 원본과 fixture의 CRLF 정규화 후 일치, HTML 링크 외 동일, 수학 작업 기록 미변경을 확인했습니다.
- 커밋 못 함: 필수 계약 검사를 실행하지 못했고 전체 회귀 시험도 통과하지 않아 커밋하지 않았습니다. main 병합·푸시·노션 기록은 하지 않았습니다.
- 화면 비교와 Python 사용이 가능한 환경에서의 전체 회귀·변경 파일별 계약 검사, 커밋은 Claude 후속 작업으로 남깁니다.

### Claude 확인 (2026-10-31)

- `main:kids/css/haru.css`와 새 파일 6개(머리 주석 제외)를 순서대로 이은 내용이 줄바꿈 형식만 빼고 같다. fixture도 같다.
- `node --test "tests/**/*.test.mjs"`: 192개 중 통과 190개, 실패 0개(건너뜀 1·todo 1). Codex 환경의 갤러리 빌더 실패 2개는 Python이 막혀서였고 이 PC에서는 통과.
- 변경 파일 7개 `verify_contracts.py --mode file`: 모두 `[ALL PASS]`.
- 노션 쓰기 차단 서버로 분리 전(main)·후(브랜치) `haru.html` 비교: haru CSS 규칙 358개와 그 내용 해시가 같고, body 요소 1,182개의 계산된 스타일(21개 속성)이 애니메이션 진행 중인 2개(`checkin-banner-icon` 맥박, 탭 `fadeIn`)를 빼고 모두 같다. 375px 화면이 분리 전과 같고 콘솔 오류 없음.
- 분리와 무관한 기존 모습: 375px에서 「오늘의 30초 하루 체크인」 배너 글자가 한두 글자씩 줄바꿈되어 좁다(main에서도 같음). 고치지 않음.
