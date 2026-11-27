# 리팩토링 묶음 A: 빠진 `?v=` 채우기 작업 지시서 (안티그래비티 하이드로젠 주도 · Claude 검수)

> 작성 2026-11-27 · 작성 Claude Code · 실행 안티그래비티 **Gemini 4 Hydrogen (Medium)**
> 위험도: 화면 모양은 그대로이고 HTML의 버전 표시와 도구·시험만 바뀌므로 **L1-리팩터**다. 다만 `kids/subjects/quest/` 아래 HTML도 고치게 되는데, 이 경로가 L2 목록에 있어서 커밋 훅이 `검토:` 줄을 찾는다. 검토는 Claude가 diff를 보고 한다(§7).
> 전체 순서: [`docs/refactor_batches.md`](refactor_batches.md) 묶음 A.

## 1. 왜 하나
- `scripts/stamp_versions.mjs`는 **이미 `?v=`가 붙은 자리만** 파일 내용 해시로 맞춘다. 버전 표시가 아예 없는 자리는 그대로 둔다.
- 그런데 HTML 태그 가운데 지역 `.js`·`.css`를 싣는 자리 약 500곳에 `?v=`가 없다(2026-11-27 Claude 집계). 이런 자리는 파일을 고쳐도 휴대폰이 옛 파일을 쓸 수 있다.
  - 많이 빠진 것: `design-system.css` 65곳, `fairy-settings-catalog.js` 53곳, `config.js` 53곳, `fairy-config.js` 51곳, `core.js` 45곳, `notion-helper.js` 39곳, `storybook_viewer.css` 21곳, `fairy-chatbot.js` 20곳, `math_factors.css` 16곳, `storybook_engine.js` 15곳.
  - 실제 예: 11-26에 `fairy-settings-catalog.js`에 넣은 학습설정 쪼개기 함수가 옛 파일을 받은 화면에서는 없는 것으로 보인다. 그러면 노션 저장 없이 기기에만 저장된다.
- 한 번 채우고 끝내지 않는다. **도구에 "빠진 자리 채우기" 기능을 넣고, 시험이 다시 빠지는 것을 막게** 한다. 일회성 스크립트는 쓰지 않는다(상위 헌법 §9-5).

## 2. 범위
**채울 자리**: 저장소 루트의 `*.html`과 `kids/**/*.html` 안에서, 다음 두 가지 태그 중 지역 파일을 가리키고 `?v=`가 없는 자리.
- `<script ... src="경로.js" ...>`
- `<link ... href="경로.css" ...>` (속성 순서는 아무거나. `rel`이 앞이든 뒤든 상관없다)

**건드리지 않을 자리** (도구가 알아서 빼야 한다):
1. `http:`·`https:`·`//`로 시작하는 주소 (글꼴, CDN)
2. 가리키는 파일이 저장소에 없는 자리. 고치지 말고 목록으로만 알린다.
3. **`kids/data/`·`scripts/data/` 아래 데이터 파일을 가리키는 자리.** 등록 도구가 이 파일들을 자주 바꾸고 커밋·푸시까지 하는데, 도장을 다시 찍지 않는다. 여기에 해시 도장을 달면 등록할 때마다 버전 시험이 깨진다(이 문제는 묶음 A와 따로 고친다, §8).
4. `deprecated_backup/`·`legacy_backup/` 안의 파일 (묶음 B에서 2026-11-27 지웠다)
5. 이미 `?v=`가 있는 자리 (값은 기존 도장 단계가 맞춘다)
6. JS 파일 안의 동적 로더 문자열. 이번에는 HTML 태그만 다룬다. 동적 로더 쪽에 `?v=` 없는 자리가 보이면 고치지 말고 보고에 목록만 적는다.

## 3. 할 일

### 3-1. `scripts/stamp_versions.mjs`에 `--add-missing` 추가
- 새 함수 `findMissing(root = ROOT)`를 만들어 내보낸다(export). 위 범위에서 `?v=`가 빠진 자리를 `{ file, ref }` 목록으로 돌려준다(file은 저장소 기준 `/` 경로).
- 파일 찾기는 기존 `resolveTarget`·`existsExact`를 그대로 쓴다. 새로 짜지 않는다. 경로가 적혀 있는데 파일이 없으면 「못 찾음」으로 분류하고, 빠진 자리 목록에는 넣지 않는다.
- 주소 판별은 기존 `isUrlToken`과 같은 기준을 쓴다.
- `node scripts/stamp_versions.mjs --add-missing`
  1. 빠진 자리에 `?v=0`을 붙인다.
  2. 이어서 평소의 도장 단계를 돌려 `0`을 진짜 해시로 바꾼다.
  3. 몇 곳을 채웠는지, 못 찾은 자리는 어디인지 출력한다.
- `--check`가 빠진 자리도 알리게 한다. 빠진 자리가 있으면 종료 코드 1이고, 메시지에 `--add-missing`으로 고치라고 쓴다.
- 파일 머리 주석(사용법)에 새 옵션과 「데이터 파일 제외」 이유를 한두 줄 더한다.
- 줄 수: 지금 약 220줄이다. 600줄을 넘기지 않는다.

### 3-2. 저장소 전체에 실제로 채우기
- `node scripts/stamp_versions.mjs --add-missing`을 한 번 돌린다.
- 이어서 `node scripts/stamp_versions.mjs --check`가 통과해야 한다.
- **HTML 말고 다른 글자가 바뀌면 안 된다.** `git diff --stat`으로 확인한다. `?v=`가 붙는 것 말고 줄바꿈(CRLF↔LF)이나 BOM이 바뀐 파일이 있으면 도구가 잘못된 것이니 고친다.

### 3-3. 시험 (`tests/version-stamps.test.mjs`에 더함, 노션 미접속)
1. **저장소 시험**: `findMissing()`이 빈 목록이다. 실패하면 빠진 자리 처음 10개와 고치는 명령을 메시지에 보인다.
2. **도구 시험** (임시 폴더에 작은 저장소를 만들어서, 기존 도구 시험과 같은 방식):
   - `<script src="../core/a.js">` → 채움
   - `<link rel="stylesheet" href="css/b.css">`와 `<link href="css/b.css" rel="stylesheet">` → 둘 다 채움
   - `https://...`·`//cdn...` → 그대로
   - `kids/data/x.js`를 가리키는 자리 → 그대로
   - 없는 파일 → 그대로 두고 「못 찾음」으로 분류
   - 이미 `?v=abc`인 자리 → 채우지 않음 (도장 단계가 값만 맞춤)
   - 채운 뒤 `--check`와 같은 검사에서 낡은 곳 0, 빠진 곳 0
   - CRLF 파일을 채운 뒤에도 CRLF가 그대로임
3. **기존 시험 고치기**: 태그 글자를 `?v=` 없이 그대로 비교하는 시험은 채우고 나면 깨진다. 지금 알려진 곳은 `tests/family-yut.test.mjs` 406행(`'src="../../core/fairy-config.js"'`)이다. 이런 시험은 도장을 되돌리지 말고 **시험 쪽을** 쿼리를 무시하고 경로만 보도록 고친다(예: `src="../../core/fairy-config.js` 까지만 찾기). `ci_local.py`에서 같은 이유로 깨지는 시험이 더 나오면 같은 방법으로 고치고, 보고에 목록을 적는다.

### 3-4. 문서
- `AGENTS.md`의 「캐시 버전 표시」 줄 끝에, 새로 거는 참조에 `?v=`를 빠뜨려도 `--add-missing`이 채우고 시험이 잡는다는 내용을 한 문장으로 더한다.
- `kids/core/CORE_CATALOG.md` 끝 「회귀 시험 묶음」 절에 버전 시험 설명이 있으면, 「빠진 자리 검사」를 한 구절 더한다.
- `docs/refactor_batches.md` 「진행 기록」 표에 한 줄을 더한다(날짜 · A · 채운 수 · 커밋).

## 4. 하지 말 것
- 요정 스크립트 싣는 순서·방식은 바꾸지 않는다(묶음 C에서 한다).
- 데이터 파일 참조, 등록 도구(`scripts/add_activity_photo.py`, 관제탑 `scripts/sync_quick_upload.py`)는 건드리지 않는다.
- 이 저장소의 다른 세션이 아직 커밋하지 않은 파일은 건드리지 않는다. `git status`로 확인해서 내 작업과 상관없는 변경이 있으면 커밋에 넣지 않는다.
- `--no-verify`를 쓰지 않는다.

## 5. 확인 순서 (이 PC는 node 시험을 하나씩 돌려야 함)
```powershell
node scripts/stamp_versions.mjs --check
node --test --test-concurrency=1 tests/version-stamps.test.mjs
python -X utf8 ../scripts/verify_contracts.py --mode git-diff
python -X utf8 scripts/ci_local.py
```
- 화면 사진은 필요 없다(L1-리팩터). 다만 경로를 잘못 이은 곳이 없는지 보려고 쓰기 차단 서버(`python scripts/guarded_preview_server.py`, 미리보기 `kids-school-guarded`)에서 `lobby.html`, `kids/subjects/math/number100.html`, `quest_runner.html` 세 화면을 열어 콘솔과 네트워크에 404가 없는지만 본다. 8767 포트가 막혀 있으면 `kids-school-guarded-alt`(8769)를 쓴다.

## 6. 커밋 (푸시는 하지 않는다. Claude 검수 뒤 사용자가 정한다)
```
정리: 빠진 ?v= 채우기 — stamp_versions --add-missing·빠진 자리 시험 (리팩토링 묶음 A)

- 도구: --add-missing(빠진 자리 채운 뒤 해시 도장), --check가 빠진 자리도 알림, 데이터 파일 제외
- 저장소: HTML 지역 js·css 참조 N곳에 ?v= 추가 (화면 변화 없음)
- 시험: 저장소에 빠진 자리 0 + 도구 경우 8가지

검토: opus
Agent: antigravity (gemini-4-hydrogen)
```
- `검토: opus` 줄은 Claude가 §7 검수를 마친 뒤에 붙인다. 먼저 커밋하고 검수 뒤 고칠 것이 있으면 새 커밋을 더한다.

## 7. Claude가 볼 것 (받아들이는 기준)
1. `findMissing()`이 빈 목록이고 `--check`가 통과한다. 출력된 채운 수가 약 500이다(크게 다르면 범위를 다시 본다).
2. diff에서 HTML 쪽은 `?v=<8자리>`가 붙은 것 말고 바뀐 글자가 없다(줄바꿈·BOM 포함).
3. `kids/data/`·`scripts/data/`를 가리키는 자리에는 새 `?v=`가 없다.
4. 도구가 기존 함수(`resolveTarget`·`existsExact`·`isUrlToken`)를 다시 썼고, 새로 짠 경로 찾기가 없다.
5. 도구 시험 8가지가 있고 `ci_local.py`가 통과한다. 기존 시험은 기대값을 느슨하게 고쳤을 뿐 검사를 빼지 않았다.

## 8. 따로 고친 것 (2026-11-27 Claude, 이번 범위 밖)
- 갤러리 등록 도구가 `?v=`를 시각 글자(`?v=YYYYMMDD-HHMM`)로 바꿔 쓰던 문제는 고쳤다. 이제 데이터를 쓴 뒤 `scripts/version_stamp.py`가 `node scripts/stamp_versions.mjs --only …`를 불러 해시로 맞춘다.
- **그래서 `stamp_versions.mjs`에는 이미 `--only` 옵션과 `scan(root, { only })` 인자가 있다.** `--add-missing`을 넣을 때 이것을 지우거나 바꾸지 말고 옆에 더한다. `tests/version-stamps.test.mjs`의 `--only` 시험도 그대로 통과해야 한다.
