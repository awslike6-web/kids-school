# 🎭 갤러리 작품 1개에 캐릭터 여러 개 작업 지시서 (Gallery Multi-Character)

> **문서 버전**: v2.0 (2026-10-30 구현)
> **원 명세**: [`docs/gallery_character_runner_spec.md`](gallery_character_runner_spec.md) (단일 `character` 계약), 보완 [`docs/gallery_character_runner_fix_spec.md`](gallery_character_runner_fix_spec.md)
> **작업 범위**: 공부방(`kids-school`) + 관제탑(`master-tower`) 등록 도구. 노션은 바꾸지 않는다.

---

## 0. 배경과 목표
- 지금은 갤러리 작품 1개에 `character` 1개만 붙는다.
- 민수 작품 「괴수대백과 (로텤스펲펲 & 뿌쀳히탈탈)」(`art_minsu_20260922_213854`)에는 괴수가 네 마리 있다. 이 괴수들을 3D로 만든 그림을 **원본 작품 한 곳에** 모두 붙이고 싶다.
  - 지금 3D 그림이 있는 것: 콧툰봉돔돌, 뿌쀳히탈탈(보라색).
  - 나머지 두 마리는 나중에 그림이 생기면 추가한다.
- 목표: 작품 하나에 캐릭터를 **최대 6개** 붙인다. 작품 창에서 하나를 골라 장착하거나 달리기를 한다.
- 이미 등록된 단일 캐릭터 작품(민서 49번 「달리는 민서」)과 **이미 폰에 장착된 파트너**는 아무 조치 없이 계속 동작해야 한다.

## 1. 작업 방식
- 새 브랜치 2개: 공부방 `codex/gallery-multi-character`, 관제탑 `codex/gallery-multi-character`. 각각 PR을 연다. `main` 병합·푸시는 하지 않는다.
- 코드를 쓰기 전에 **실행 계획(파일별 변경 요약, 예상 줄 수, 이 문서와 다르게 하려는 점)을 먼저 보고하고 승인을 기다린다.**
- 커밋 전에:
  - 공부방 `node --test "tests/**/*.test.mjs"` 전부 통과
  - 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <worktree 절대 경로>`가 `[ALL PASS]`
  - 관제탑 등록 시험은 `GALLERY_SCHOOL_SOURCE=<공부방 worktree 경로>`를 붙여 실행

---

## 2. 데이터 계약

### 2-1. `kids/data/gallery-meta.json` (입력)
```json
"art_minsu_20260922_213854": {
  "characters": [
    { "key": "bongdomdol", "name": "콧툰봉돔돌", "sprite": "20260922_213854_sprite_bongdomdol.png" },
    { "key": "tataltal",   "name": "뿌쀳히탈탈", "sprite": "20260922_213854_sprite_tataltal.png" }
  ]
}
```
- `key`: 작품 안에서 캐릭터를 구분하는 이름표. `^[a-z0-9_-]{1,32}$`. 한 작품 안에서 겹치면 안 된다.
- `name`, `sprite`: 기존 `character` 규칙과 같다(이름은 공백을 뺀 1~12자, sprite는 경로 없는 PNG 파일명).
- **기존 `character` 객체도 계속 읽는다.** 빌더는 이것을 `key: "main"`인 캐릭터 1개짜리 목록으로 취급한다. 한 작품에 `character`와 `characters`가 함께 있으면 `characters`만 쓰고 경고를 출력한다.

### 2-2. `kids/data/gallery-data.js` (빌더 출력)
```json
"characters": [
  { "key": "bongdomdol", "name": "콧툰봉돔돌", "spriteUrl": "https://raw.githubusercontent.com/.../minsu_20260922_213854_sprite_bongdomdol.png" }
]
```
- 출력은 **`characters` 배열 하나로 통일**한다. `character` 단일 필드는 더 이상 출력하지 않는다(49번도 `characters: [{key: "main", ...}]`로 나간다).
- 유효한 캐릭터가 0개면 `characters` 필드 자체를 뺀다.

### 2-3. 빌더 검증 (`scripts/build_gallery.py`)
- 캐릭터마다 기존 `build_character` 검증(PNG·알파·투명 10%·크롭·512px)을 그대로 쓴다.
- **잘못된 캐릭터는 그 캐릭터만 뺀다.** `⚠️ [character 제외] {art_id}#{key}: {이유}`를 출력한다. 같은 작품의 다른 캐릭터와 작품 카드는 정상으로 만든다.
- key 중복, 7번째 이후 캐릭터도 같은 방식으로 뺀다.
- sprite 파일이 갤러리 일반 작품 카드로 잘못 잡히지 않게, `character_images` 집합에 **모든 캐릭터의 sprite**를 넣는다(지금은 단일 `character`만 넣는다).

---

## 3. 화면

### 3-1. 공통 판정 (`kids/subjects/quest/monster_roster.js`)
- `MonsterRoster.charactersOf(item)`를 새로 둔다. `item.characters`에서 `isValidCharacter`이고 key 형식이 맞는 것만, 순서대로 돌려준다. 미니 런과 모달은 이 함수만 쓴다(중복 판정 금지).
- 파트너 저장값에 `charKey`를 더한다: `{ artId, charKey, name, spriteUrl, equippedAt }`.
  - `equipGalleryPartner(child, { ...character, artId })`가 `character.key`를 `charKey`로 저장한다.
  - **이미 저장된 값에 `charKey`가 없으면 `"main"`으로 본다.** 폰에 이미 장착된 「달리는 민서」가 풀리지 않아야 한다.
- 대사·조사(`withJosa`)·5분방 로스터 연결(`refreshGalleryMonster`)은 지금처럼 이름과 그림만 쓴다.

### 3-2. 작품 창 (`kids/common_space/gallery-mini-runner.js`의 `bindModal`)
- 캐릭터가 **1개**면 지금 화면과 똑같다(고르기 줄을 보이지 않는다).
- **2개 이상**이면 장착·달리기 버튼 위에 **고르기 줄**을 보인다.
  - 버튼마다 작은 그림(높이 40px 안팎) + 이름. 터치 영역 44px 이상.
  - 처음 선택: 지금 보는 아이가 이 작품의 캐릭터를 장착 중이면 그 캐릭터, 아니면 첫 번째.
  - 고르면 장착 버튼 문구와 「🎮 {이름}{와/과} 달리기」 버튼이 고른 캐릭터를 따른다.
  - 「장착 중」 판정은 `artId`와 `charKey`가 **둘 다** 같을 때만 참이다. 같은 작품의 다른 캐릭터를 장착하면 바로 교체된다(해제 후 재장착이 필요 없다).
  - 부모 보기(민수·민서 두 줄)에서도 같은 고르기 줄 하나를 공유한다.
- `start(item, …)`는 어떤 캐릭터로 달릴지 받도록 바꾼다. 예: `start(item, { character, viewer })`. 이름·그림은 그 캐릭터 것을 쓴다.
- 카드 목록의 캐릭터 표시(있다면)도 `charactersOf`로 판정한다.

### 3-3. 하지 말 것
- 게임 규칙·물리 상수·에러리스 규칙은 바꾸지 않는다.
- 5분방 기본 로스터(`clay_bite`=뿌쀳히탈탈, `cottun_bongdomdol`)는 고치지 않는다. 갤러리 파트너로 같은 괴수를 장착하면 연구소에 「자작: …」으로 하나 더 보이는 것은 이번 범위에서 허용한다(완료 보고에 사실로 적는다).
- `gallery-mini-runner.js` 600줄, `monster_roster.js` 600줄을 넘기지 않는다.
- 실제 작품 메타에 캐릭터를 임의로 붙이지 않는다. 시험 그림·시험 데이터를 커밋하지 않는다. 실제 등록은 병합 뒤 Claude가 한다.
- 노션 요청에 캐릭터 정보를 넣지 않는다.

---

## 4. 등록 도구 (관제탑 `scripts/gallery_registration_options.py`, `scripts/sync_quick_upload.py`)

### 4-1. 옵션
```bash
python -X utf8 scripts/sync_quick_upload.py --id "art_minsu_20260922_213854" --author "민수" \
  --character-key "bongdomdol" --character-sprite "E:/Downloads/bongdomdol.png" --character-name "콧툰봉돔돌"
```
- 새 옵션 `--character-key`. 기존 `--character-sprite`, `--character-name`은 그대로.
- 새 옵션 `--character-remove KEY`: 그 key의 캐릭터를 메타에서 뺀다(sprite 파일은 지우지 않는다). 다른 캐릭터 옵션과 함께 쓰면 오류.

### 4-2. 규칙
1. 작품 메타에 단일 `character`가 있으면 **먼저 `characters: [{key: "main", ...}]`로 바꿔 쓴 뒤** 아래 규칙을 적용한다. 메타에 `character` 키를 남기지 않는다.
2. `--character-key`를 주면:
   - 그 key가 있으면: 준 값(이름·그림)만 바꾼다.
   - 없으면: 새 캐릭터로 **뒤에 추가**한다. 이때 `--character-sprite`와 `--character-name`이 둘 다 있어야 한다. 6개가 이미 있으면 오류.
3. `--character-key`를 안 주면:
   - 캐릭터가 0개: key `main`으로 추가(지금 동작과 같다).
   - 정확히 1개: 그 캐릭터를 고친다(지금 동작과 같다).
   - 2개 이상: 오류. `--character-key`를 요구하는 안내를 출력한다.
4. 복사 파일명: key가 `main`이면 지금처럼 `{원본베이스}_sprite.png`, 아니면 `{원본베이스}_sprite_{key}.png`.
5. 지금처럼 **복사·메타 쓰기 전에 모두 검증**하고, 실패하면 아무것도 쓰지 않고 종료 코드 1. `--title` 없이 쓰면 메타의 `characters`만 바꾸고 제목·분류·메모·학년은 건드리지 않는다.
6. 메타가 없어진 기존 작품을 빌드 결과에서 복구하는 부분(`built_character` 처리)은 `characters` 배열 기준으로 바꾼다.

---

## 5. 시험

### 5-1. 공부방 (`tests/gallery-character-runner.test.mjs`에 추가, 또는 새 파일)
- `charactersOf`: 정상 2개, 잘못된 key, 잘못된 그림 주소, 빈 배열, `characters` 없음.
- 장착: 같은 작품의 A를 장착한 뒤 B를 장착하면 B로 바뀌고, A는 「장착 중」이 아니다.
- **옛 저장값 호환**: `charKey` 없는 `galleryPartner_daughter` 값이 `main` 캐릭터의 「장착 중」으로 판정된다.
- 모달: 캐릭터 1개면 고르기 줄이 없고, 2개면 버튼 2개가 생기고, 고른 캐릭터 이름이 달리기 버튼에 나온다.

### 5-2. 빌더 (Python 시험 또는 공부방 시험에서 빌더 호출)
- 단일 `character` 메타 → 출력 `characters` 1개(`key: "main"`).
- 2개 중 1개가 투명 아닌 PNG → 그 1개만 빠지고 경고, 작품 카드는 정상.
- key 중복·7개째 → 빠짐.
- 모든 sprite 파일이 일반 작품 카드로 나오지 않음.

### 5-3. 관제탑 등록
- §4-2 규칙 1~6 각각, 그리고 `--character-remove`.
- 실패 시 메타와 업로드 폴더가 바뀌지 않음.
- **고장 잡기 확인**: `charKey` 비교를 빼면(같은 작품이면 무조건 장착 중) 5-1의 교체 시험이 실패하는지 확인하고 되돌린다.

### 5-4. 화면 시험
- `python scripts/guarded_preview_server.py`(노션 쓰기 차단)로 연다. 시험용 캐릭터 2개는 브라우저 응답에만 주입하고 커밋하지 않는다.
- 360×800, 1280×800에서 고르기 줄 → 장착 → 다른 캐릭터로 교체 → 달리기 시작까지 확인한다.
- 5분방 `quest_runner.html`과 `monster_lab.html`에 고른 캐릭터가 나오는지 확인한다.
- 브라우저 창이 숨겨져 rAF가 멈추면 달리기 진행을 확인하지 못한 것이다. 그 경우 못 했다고 적는다.

---

## 6. 문서·캐시
- 이 문서에 구현 결과(최종 함수 이름, 줄 수)를 덧붙인다.
- `docs/gallery_character_runner_spec.md`: 데이터 계약 절에 「`characters` 배열로 바뀜, 이 문서 참조」 한 줄과 등록 예시 갱신.
- `kids/core/CORE_CATALOG.md`의 `monster_roster.js`·`gallery-mini-runner.js` 절에 `charactersOf`, `charKey` 반영.
- `docs/gallery_archive_spec.md`의 캐릭터 등록 예시에 `--character-key` 추가.
- 바뀐 JS의 실제 로드 지점 `?v=`를 `20261030-multi-character`로 갱신한다(`gallery.html`, `monster_lab.html`, `quest_runner.html`).

## 7. 완료 보고에 적을 것
- 파일별 변경 줄 수, 최종 줄 수
- §5 시험 결과와 고장 잡기 확인 결과
- 화면 시험에서 실제로 본 것과 못 본 것
- 49번 작품을 새 빌더로 다시 만들었을 때 `gallery-data.js` 차이(`character` → `characters`)만 생기는지. **이 차이는 커밋하지 않고** 보고만 한다.

## 8. 구현 결과 (2026-10-30)
- 로스터 `charactersOf(item)`가 배열 우선·단일 main 호환·key/주소/중복/6개 상한을 처리합니다. 장착은 charKey를 저장하고 옛 저장값은 읽을 때만 main으로 해석합니다.
- `GalleryMiniRunner.bindModal`은 2개 이상일 때만 선택 줄을 만들고 artId+charKey로 장착 여부를 판단합니다. 선택은 장착 뒤에도 유지하며 부모의 두 자녀 버튼이 같은 선택을 공유합니다. `start(item,{character,viewer,onClose})`는 목록 안에서 선택 캐릭터를 확인합니다.
- 빌더 `character_entries`, `validate_character_key`, `build_characters`를 추가하고 기존 PNG 정리 함수를 재사용합니다. 단일/배열이 함께 있으면 배열을 우선하며 항목별 오류를 격리합니다. 예약 sprite PNG는 참조가 사라져도 일반 작품으로 만들지 않습니다.
- 등록 도구 `prepare_character`/`apply_character_plan`은 key별 추가·부분 갱신·삭제를 처리합니다. 마지막 삭제는 character·characters 키를 모두 제거하고 이미지 파일은 보존합니다. 입력 오류 시 메타와 업로드가 바뀌지 않는지 스냅샷으로 확인합니다.
- 전체 Node 시험 85건: 통과 83, 실패 0, 기존 skip 1·TODO 1. 관제탑 등록 시험 12건 통과. charKey 비교를 제거하면 A→B 교체 시험이 실패함을 확인한 뒤 복원했습니다.
- 360×800·1280×800에서 부모 공유 선택·장착·다른 캐릭터로 교체·실제 rAF 달리기·남매 연구소/러너 반영을 확인했습니다. 런타임 오류 0, 노션 쓰기 0. 시험 데이터는 응답에만 주입했습니다.
- 49개 작품을 임시 복제 환경에서 재빌드한 결과, 49개가 유지되고 기존 단일 character→characters(main) 변환 외 차이가 없었습니다. 실제 생성 데이터·메타는 커밋하지 않습니다.
- 기본 로스터 두 종과 갤러리 파트너는 별개입니다. 같은 괴수를 장착하면 연구소에 자작 항목으로 하나 더 보이는 것을 허용합니다. 실제 콘텐츠 등록과 main 병합·푸시, 노션 변경은 수행하지 않습니다.

### 최종 파일별 줄 수와 변경량
- `kids/common_space/gallery-mini-runner.js`: +40/−12, 최종 426줄.
- `kids/common_space/gallery.html`: +2/−2, 최종 305줄.
- `kids/subjects/quest/monster_roster.js`: +15/−3, 최종 355줄.
- `scripts/build_gallery.py`: +46/−9, 최종 520줄.
- `tests/gallery-character-runner.test.mjs`: +6/−6, 최종 433줄.
- `scripts/gallery_registration_options.py`: +55/−17, 최종 233줄.
- `scripts/sync_quick_upload.py`: +3/−1, 최종 710줄.
- `scripts/test_gallery_registration_options.py`: +49/−7, 최종 224줄.
- 신규 `tests/gallery-multi-character.test.mjs`: 82줄.
- `monster_lab.html`: +1/−1(캐시 쿼리만), 최종 778줄.
- `quest_runner.html`: +1/−1(캐시 쿼리만), 최종 606줄.
