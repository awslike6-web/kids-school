# 🏃 꿈나무 갤러리 「자작 캐릭터 파트너 장착 & 1분 미니 런」 작업 명세서 (Gallery Character & Mini Runner Spec)

> **문서 버전**: v1.0 (2026-10-29 작성, 구현 전)
> **상태**: 작업 지시서. 구현이 끝나면 §11대로 기능 명세서로 고쳐 쓴다.
> **상위 규칙**: `kids-school-main/GEMINI.md`(§5 이미지 무결성, §6 오디오, §8 클린 코드·계약), `g:/master-tower/GEMINI.md`
> **연계 문서**: [`docs/gallery_spot_diff_spec.md`](gallery_spot_diff_spec.md)(같은 방식의 선택 필드·빌더·등록 옵션 선례), [`docs/gallery_archive_spec.md`](gallery_archive_spec.md), [`docs/character_studio_handover.md`](character_studio_handover.md)(캐릭터 그래픽 규격·남매 테마), `kids/core/CORE_CATALOG.md`의 `monster_roster.js` 절
> **작업자 참고**: 코드를 쓰기 전에 `AGENTS.md` 순서대로 `GEMINI.md`, `CORE_CATALOG.md`, 위 연계 문서를 읽는다.

---

## 0. 작업 방식 (ASDST)

- 코드를 쓰기 전에 이 문서 기준으로 **실행 계획(고칠 파일, 파일별 예상 줄 수, 이 문서와 다르게 하려는 점과 이유)을 먼저 보고하고 승인을 기다린다.**
- 작업은 두 저장소다. 커밋도 따로 한다. **A(공부방)를 먼저 끝내고 시험을 통과한 뒤 B(관제탑)**를 한다.
  - A: `G:/master-tower/kids-school-main`
  - B: `G:/master-tower` (`scripts/sync_quick_upload.py`)
- worktree에서 작업하면 계약 검사는 바뀐 파일마다 worktree 절대 경로로 `--mode file --file <경로>`를 실행한다 (`verify_contracts.py`는 `G:/master-tower` 기준으로 저장소를 찾음).
- worktree에는 옆 폴더(`../kids-archive`)가 없다. 빌더·등록 도구 시험은 임시 복제 환경에서 하고, 등록 도구는 `--no-push`로만 돌린다. **노션 카드 Upsert가 실행되는 경로(`--title` 지정)는 시험하지 않는다.**

---

## 1. A (Action · 목표)

아이가 직접 그리거나 만든 캐릭터 작품에 배경을 지운 캐릭터 그림(투명 PNG)을 붙여 두면, 갤러리 상세 모달에서
1. **`[⚡ 내 공부방 파트너로 장착]`**: 5분 퀘스트 연구소(`monster_lab.html`)와 퀘스트 러너(`quest_runner.html`)의 파트너가 그 캐릭터로 바뀐다.
2. **`[🎮 이 캐릭터로 달리기]`**: 그 캐릭터가 주인공인 60초 횡스크롤 미니게임(탭으로 점프, 별 모으기)이 열린다.

---

## 2. 현재 구조 (2026-10-29 확인한 사실)

- **민수 파트너**: `kids/subjects/quest/monster_roster.js`(234줄, 전역 `MonsterRoster`). `MONSTER_ROSTER`에 고정 2종(`clay_bite`, `cottun_bongdomdol`)이 있고, 각각 포즈 6종(`idle/greet/walk_left/walk_right/rage/roar`)과 대사(`labDialogues`, `runnerDialogues`)를 가진다. 선택은 `localStorage('selectedMonster')`에 **몬스터 ID**로 저장한다(남매 구분 없음. 민서 화면은 로스터를 쓰지 않음).
  - 연구소: `monster_lab_controller.js`(725줄)의 `renderActivePartnerMonster`가 `#monsterImg`를 그린다. 민서면 바로 돌아간다.
  - 러너: `quest-runner.js`(669줄)의 `syncCheerMonsterReaction`이 `#cheerMonster`를 그린다. 민서는 고정 이름 「요정 코코」와 고정 대사를 쓰고 그림은 HTML 기본값이다.
- **민서 파트너**: 연구소 `monster_lab.html`(778줄)의 `#minseoPartnerImg`가 고정 그림 `./assets/images/characters/minseo_family_3d_trio.png`이다.
- **갤러리의 누끼 작품**: `hasCutout: true`인 10건은 액자, 비누, 상장 등 **캐릭터가 아니다.** 그래서 `hasCutout`을 캐릭터 판정에 쓰지 않고, 새 선택 필드를 둔다.
- 줄 수 여유가 적다: `monster_lab.html` 778줄, `monster_lab_controller.js` 725줄, `quest-runner.js` 669줄, `quest_runner.html` 606줄(상한 800줄 미만). **이 파일들에는 연결 몇 줄만 넣고, 로직은 로스터와 새 모듈에 둔다.**

---

## 3. S (Scope · 범위)

### A: 공부방
| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| 신규 `kids/common_space/gallery-mini-runner.js` | 미니 런 게임. IIFE, 전역 `GalleryMiniRunner` 하나. 스타일은 `<style id="gmr-style">` 1회 삽입 | 400~600줄 (800 미만) |
| 신규 `tests/gallery-character-runner.test.mjs` | §8-1 시험 | 제한 없음 |
| `kids/subjects/quest/monster_roster.js` | 갤러리 파트너 저장소(§5-1)와 로스터 동적 항목 | 추가 80~130줄 |
| `kids/common_space/gallery.html` | 로스터·미니 런 스크립트 로드, 모달 버튼 2개 | 추가 12줄 이내 |
| `kids/common_space/gallery-modal-manager.js` | 버튼 표시 조건·연결만 (현재 약 600줄) | 추가 25줄 이내 |
| `kids/subjects/quest/monster_lab_controller.js` | 민서 파트너 그림·이름 반영 | 추가 15줄 이내 |
| `kids/subjects/quest/quest-runner.js` | 민서 러너 파트너 그림·이름 반영 | 추가 15줄 이내 |
| `monster_lab.html`, `quest_runner.html` | **가능하면 고치지 않는다.** 꼭 필요하면 각 5줄 이내 | |
| `scripts/build_gallery.py` | `character` 선택 필드 변환·검증 (§4-2) | |
| `kids/core/CORE_CATALOG.md`, `docs/gallery_archive_spec.md`, `docs/character_studio_handover.md`, 이 문서 | §11 | |

### B: 관제탑
| 파일 | 내용 |
| :--- | :--- |
| `scripts/sync_quick_upload.py` | `--character-sprite`, `--character-name` 옵션 (§4-3) |

### 손대지 않는 것
- **노션**: 성장 갤러리 DB와 인벤토리 DB에는 캐릭터용 속성이 없다. 노션 요청에 `character`나 파트너 정보를 넣지 않는다. `gallery-data-sync.js`도 고치지 않는다.
- 보석·사탕 보상, 학습일지, 하트: 미니 런은 순수 놀이다. 보상 경제에 연결하지 않는다.
- `gallery.css`(860줄, 상한 초과), `gallery-spot-diff.js`, 다른 과목 모듈, Worker, `kids-archive`의 기존 파일

---

## 4. D (Data · 데이터 계약)

### 4-1. `kids/data/gallery-meta.json` (사람이 쓰는 원본)
```json
"art_minsu_20261101_neon_dragon": {
  "title": "...",
  "character": {
    "sprite": "20261101_neon_dragon_sprite.png",
    "name": "네온 드래곤"
  }
}
```
- `sprite`: 배경을 지운 캐릭터 PNG **파일명**. 원본처럼 `uploads/ex/갤러리/{민수|민서|.}/`에 둔다.
- `name`: 1~12자. 파트너 이름표와 대사에 쓴다.

### 4-2. 빌더 → `kids/data/gallery-data.js`
```js
"character": {
  "spriteUrl": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minsu/2026_elem_5/minsu_20261101_neon_dragon_sprite.png",
  "name": "네온 드래곤"
}
```
빌더 규칙 (`spotDiff`와 같은 방식):
1. `sprite` 파일명은 단독 작품 카드로 만들지 않는다 (`subImages`, `spotDiff.modifiedImage`처럼 훑기에서 뺀다).
2. **누끼 검사**: PNG이고 알파 채널이 있어야 한다. 완전 투명 픽셀(α=0)이 전체의 10% 이상이어야 한다. 아니면 "배경이 지워지지 않은 그림"으로 보고 `character`를 뺀다.
3. **정리**: `ImageOps.exif_transpose` → 투명 여백 자르기(α>0인 영역의 경계 상자 + 사방 4% 여백) → 긴 변을 512px 이하로 줄이기(LANCZOS) → PNG(`optimize=True`)로 `kids-archive/assets/media/{sub_dir}/{sub_path}/{sub_dir}_{파일베이스}.png`에 저장한다. 정사각형으로 늘리지 않는다(비율 유지).
4. **이름 검증**: 앞뒤 공백을 뺀 1~12자 문자열.
5. 실패하면 `⚠️ [character 제외] {art_id}: {이유}`를 출력하고 `character`만 뺀다. 작품 카드는 정상으로 만든다.
6. `archive-master-data.js`에는 넣지 않는다.

### 4-3. 등록 도구 (B)
```bash
python -X utf8 scripts/sync_quick_upload.py --id "art_minsu_20261101_neon_dragon" --author "민수" \
  --character-sprite "E:/Downloads/dragon_cutout.png" --character-name "네온 드래곤"
```
- `--character-sprite`: 로컬 PNG. `uploads/ex/갤러리/{작가}/{원본베이스}_sprite.png`로 복사한다.
- `--character-name`: 이름. 둘 중 하나만 주면 기존 `character`의 나머지 값을 유지한다.
- **틀린그림 옵션 처리(`prepare_spot_diff`, `set_meta_spot_diff`)를 그대로 본뜬다**: 복사·메타 쓰기 전에 검증하고(PNG·알파·투명 10%·이름 길이), 실패하면 메타를 쓰지 않고 종료 코드 1. 메타에 항목이 없어도 `gallery-data.js`에 이미 있는 작품이면 허용한다. **`--title` 없이 줄 때는 메타에 `character`만 병합하고 제목·분류·메모는 건드리지 않는다** (2026-10-29 `f5bceb3`에서 틀린그림 옵션의 같은 버그를 고친 방식).
- 노션 카드 Upsert는 바꾸지 않는다.

### 4-4. 파트너 저장소 (브라우저 `localStorage`, 이 기기에만 저장)
| 키 | 값 |
| :--- | :--- |
| `galleryPartner_son` | 민수가 장착한 갤러리 캐릭터 `{"artId","name","spriteUrl","equippedAt"}` (JSON) |
| `galleryPartner_daughter` | 민서용, 같은 형식 |
| `selectedMonster` (기존) | 민수가 갤러리 캐릭터를 장착하면 `"gallery_partner"` |
| `galleryRunnerBest_son` / `_daughter` | 미니 런 최고 별 개수 (숫자 문자열) |

- 키 이름과 JSON 형식은 **`monster_roster.js` 한 곳에만** 정의한다. 갤러리, 연구소, 러너는 모두 로스터 함수로만 읽고 쓴다(§5-1).
- 기기 간 동기화는 이번 범위가 아니다. 폰에서 장착하면 그 폰에서만 바뀐다. 이 한계를 `CORE_CATALOG.md`에 적는다.

---

## 5. S (Spec · 동작 규칙)

### 5-1. `monster_roster.js` 확장
`window.MonsterRoster`에 다음을 추가한다. 기존 함수의 동작은 바꾸지 않는다.
```js
MonsterRoster.equipGalleryPartner(child, { artId, name, spriteUrl })  // child: 'son' | 'daughter'
MonsterRoster.getGalleryPartner(child)    // → 저장값 또는 null (JSON 깨짐·필드 누락·https 아닌 주소면 null)
MonsterRoster.clearGalleryPartner(child)
MonsterRoster.isValidCharacter(character) // gallery-data.js의 character 계약 검사 (§4-2)
```
- **민수(`son`) 장착**: 저장 후 `MONSTER_ROSTER.gallery_partner`를 만들어 `MONSTER_ORDER` 끝에 넣고 `selectedMonster`를 `gallery_partner`로 바꾼다. 포즈 6종은 모두 같은 `spriteUrl`이다. 번호는 「자작」, `role`은 「갤러리 파트너」. 대사는 이름을 넣은 공용 문구로 만든다(예: `${name} 출격 준비 완료! ⚡`). 아이를 탓하는 말은 쓰지 않는다(에러리스).
- **스크립트가 실릴 때** `galleryPartner_son`이 있으면 `gallery_partner` 항목을 자동으로 만든다. 그래서 연구소의 좌우 넘기기(`getNextMonsterId`)에도 갤러리 파트너가 나온다. 저장값이 없거나 깨졌는데 `selectedMonster`가 `gallery_partner`면 기본 몬스터로 돌아간다(지금의 `getSelectedMonsterId` 안전장치와 같음).
- **해제**: `clearGalleryPartner('son')`은 항목을 지우고, 선택이 `gallery_partner`였으면 `clay_bite`로 돌린다.
- **민서(`daughter`)**: 로스터 항목은 만들지 않는다. 저장만 한다. 화면은 §5-2가 읽어서 쓴다.
- 스크립트가 처음 실행될 때 `document`를 건드리지 않는다(시험 샌드박스용). `localStorage` 접근은 모두 `try/catch`로 감싼다.

### 5-2. 화면 반영
- **민수**: 지금 코드가 로스터만 보므로, 로스터 확장만으로 연구소·러너에 나온다. 연구소의 포즈 전환 애니메이션은 같은 그림이어도 그대로 동작해야 한다.
- **민서 연구소** (`monster_lab_controller.js`): 민서 화면을 그릴 때 `getGalleryPartner('daughter')`가 있으면 `#minseoPartnerImg`의 `src`와 `alt`를 그 캐릭터로 바꾼다. 없으면 기본 그림을 그대로 둔다. 그림을 불러오지 못하면 기본 그림으로 되돌린다(`onerror`).
- **민서 러너** (`quest-runner.js`): `syncCheerMonsterReaction`의 민서 분기에서 갤러리 파트너가 있으면 `poseSrc`를 그 그림으로, `monsterName`을 그 이름으로 바꾼다. 대사는 지금의 민서 대사를 그대로 쓴다.
- 장착한 캐릭터가 나중에 갤러리에서 빠져도 저장된 `spriteUrl`로 계속 보인다(CDN 파일은 영구 보존). 장착 해제는 갤러리 모달에서 한다.

### 5-3. 갤러리 상세 모달
- 갤러리 작품이고(특별한 날 제외) `MonsterRoster.isValidCharacter(item.character)`가 참이면 버튼 두 개를 보인다.
  - `⚡ 내 공부방 파트너로 장착`: 지금 보는 아이(`currentUser` `son`/`daughter`)에게 장착한다. 이미 그 캐릭터가 장착돼 있으면 버튼이 `✅ 파트너 장착 중 · 해제하기`로 바뀌고, 누르면 해제한다.
  - **부모 계정(아빠·엄마)**: 장착 버튼 대신 `민수에게 장착`, `민서에게 장착` 두 버튼을 보인다.
  - 장착하면 짧은 안내(「이제 5분 퀘스트에서 ○○가 함께해요!」)와 `fairyPraise()`. 안내는 토스트로 띄우고 2초 뒤 사라진다.
  - `🎮 이 캐릭터로 달리기`: `GalleryMiniRunner.start(item, { viewer })`
- 모달을 닫으면 `GalleryMiniRunner.close()`를 부른다.
- 모달 매니저에는 버튼 조건과 호출만 넣는다. 저장·게임 로직은 넣지 않는다.

### 5-4. 미니 런 `GalleryMiniRunner`
```js
GalleryMiniRunner.start(item, { viewer, onClose })  // 전체 화면 오버레이. 이미 열려 있으면 먼저 닫음
GalleryMiniRunner.close()                            // rAF·리스너·타이머·ResizeObserver 해제, DOM 제거. 여러 번 불러도 안전
// 시험용 순수 함수 (DOM 없이 동작)
GalleryMiniRunner.createWorld(seed, profile)         // 결정적 난수로 장애물·별 배치
GalleryMiniRunner.step(world, input, dtMs)           // 물리·충돌·점수 한 단계 진행, world를 돌려줌
GalleryMiniRunner.hitboxOf(sprite, x, y, w, h)       // 그림 크기의 70% 판정 상자
```
**규칙**
1. **조작**: 화면 아무 곳 `pointerdown` 또는 스페이스·위 화살표 키로 점프한다. 공중에서 한 번 더 누르면 2단 점프가 된다. 길게 누를 필요는 없다.
2. **시간**: 60초. 남은 시간을 위쪽에 표시한다. 일시정지 버튼이 있다. `document.visibilitychange`로 숨겨지면 자동으로 일시정지한다.
3. **에러리스**: 장애물에 부딪혀도 게임이 끝나지 않는다. 캐릭터가 통통 튀며 0.8초 동안 깜박이고(그동안 무적), 별을 1개 잃는다(0개 아래로는 안 내려감). 감점 소리·빨간 화면·「실패」 문구는 쓰지 않는다. **모든 판은 60초를 채우고 「완주」로 끝난다.**
4. **난이도 프로필**: 
   | | 민서 | 민수 |
   | :--- | :--- | :--- |
   | 속도 | 느림 (화면 너비의 약 25%/초) | 보통 (약 40%/초), 30초 뒤 조금 빨라짐 |
   | 장애물 간격 | 넓음, 1단 점프로 모두 넘을 수 있음 | 가끔 2단 점프가 필요한 높이 |
   | 별 | 많음, 낮은 곳 위주 | 높은 곳에도 배치 |
   - 구체 수치는 파일 맨 위 상수로 둔다. 화면 크기와 상관없이 같은 체감이 되도록 **화면 높이 기준 비율 좌표**로 물리를 계산한다.
5. **테마** (지금 보는 사람 기준, `character_studio_handover.md` 색상):
   - 민수: 어두운 사이버 퍼플 바탕 + 네온 그린(`#00ff9d`) 격자가 뒤로 흐름. 장애물은 네온 블록, 별 대신 「에너지 코어」.
   - 민서: 크림·파스텔 하늘 + 구름이 흐름. 장애물은 둥근 쿠션, 별은 별사탕·하트.
   - 부모: 민수 테마. 배경과 아이템은 캔버스 도형으로 그린다(외부 그림 파일 추가 없음).
6. **캐릭터 그림**: `item.character.spriteUrl`을 `crossOrigin='anonymous'`로 불러와 비율을 유지한 채 화면 높이의 약 18% 크기로 그린다. 점프 중에는 살짝 기울이고, 달릴 때는 위아래로 통통 움직인다. 그림을 못 불러오면 안내와 닫기 버튼만 보인다.
7. **끝**: 「완주! ⭐ N개」 화면. 최고 기록보다 많으면 「새 기록!」을 표시하고 `galleryRunnerBest_*`에 저장한다. `[다시 달리기]`, `[닫기]` 버튼. 소리는 `fairyReward('finish')`.
8. **소리**: 별을 먹을 때는 Web Audio로 짧은 「띵」을 낸다(0.1초 미만). 부딪힐 때는 부드러운 「뽕」을 낸다. fairy-engine의 효과음 설정(`isSafeSfxEnabled` 등 기존 함수)이 꺼져 있으면 내지 않는다. 한국어 안내 음성이 필요하면 `speakFairyTTS`만 쓴다(`speechSynthesis` 직접 호출 금지).
9. **성능**: 캔버스 해상도는 `CSS 크기 × min(devicePixelRatio, 2)`이다. 일시정지·끝 화면·숨김 상태에서는 rAF를 멈춘다(가만히 있을 때 CPU 0%). 프레임 간격(`dt`)은 최대 50ms로 자른다(탭 전환 뒤 순간이동 방지).
10. **접근성**: 오버레이 `role="dialog"`, Esc로 닫기, 포커스 가두기. 버튼은 최소 44px.

---

## 6. 하지 말 것
- `hasCutout`으로 캐릭터 여부를 판단하기 (누끼 작품은 대부분 캐릭터가 아님)
- 파트너 저장 키나 JSON 형식을 로스터 밖에서 다시 정의하기
- 민수 파트너 저장에 이미지 주소만 따로 저장해서 로스터를 우회하기 (포즈·대사가 깨짐)
- 이미 760줄을 넘는 `monster_lab.html`에 로직 넣기
- 게임오버, 하트, 감점 소리, 보석 보상 넣기
- 노션에 캐릭터·파트너 정보 쓰기
- 가짜 캐릭터 그림이나 시험 데이터를 커밋하기, 실제 작품에 `character`를 임의로 붙이기

---

## 7. 시험용 그림
- 실제 갤러리에는 아직 캐릭터 작품이 없다. 화면 시험에는 저장소에 있는 민수 자작 캐릭터 그림 `kids/assets/monsters/cottun_bongdomdol/idle.png`(투명 PNG)를 쓴다. 로컬 `gallery-data.js`의 작품 하나에 임시로 `character`를 넣고(`spriteUrl`은 미리보기 서버에서 열리는 상대·로컬 주소), 끝나면 `git checkout -- kids/data/gallery-data.js`로 되돌린다.
  - 이때 `isValidCharacter`가 `https://raw.githubusercontent.com/awslike6-web/kids-archive/main/`만 허용하면 시험이 막힌다. **검증은 「`https:` 주소 또는 같은 출처의 상대 주소」를 허용**하고, 계약 시험(§8-1)에서 실제 데이터는 아카이브 CDN만 쓰는지 따로 확인한다.
- 빌더 시험의 누끼 거부 사례는 시험 안에서 Pillow로 만든 불투명 PNG를 쓴다.

---

## 8. T (Test · 합격 기준)

### 8-1. 명령 시험 (커밋 전 필수)
1. `node --test "tests/**/*.test.mjs"` 전부 통과. 새 `tests/gallery-character-runner.test.mjs`는 `tests/browser-sandbox.mjs`의 `loadBrowserScripts`로 다음을 확인한다:
   - **로스터**: 장착 → 저장 형식, `selectedMonster`가 `gallery_partner`가 됨, `getSelectedMonster()`의 포즈 6종이 모두 그림 주소, 다시 실어도(새 샌드박스에 같은 저장소) 유지됨, 해제하면 `clay_bite`로 돌아감, 깨진 JSON·`http:`·`javascript:` 주소는 무시, 민서 장착은 `selectedMonster`를 바꾸지 않음, 기존 2종의 동작(`getLabTapResponse`, `getRunnerReaction`)은 그대로
   - **미니 런 순수 함수**: 같은 시드면 같은 배치, 60초 동안 `step`을 돌리면 항상 완주 상태로 끝남(아무 입력 없이도), 충돌 시 별이 1개 줄되 0 미만으로 안 내려감, 무적 시간 동안 추가 감소 없음, 2단 점프는 공중에서 한 번만, `dt` 50ms 자르기, 민서 프로필의 모든 장애물은 1단 점프 최고 높이보다 낮음
   - **계약**: `gallery-data.js`에서 `character`가 있는 모든 항목이 `isValidCharacter`를 통과하고 `spriteUrl`이 아카이브 CDN 주소로 시작함(지금은 0건이어도 통과)
   - 두 스크립트 모두 실을 때 `document`에 접근하지 않음
2. 시험이 실제로 고장을 잡는지 확인한다. 아래처럼 일부러 깨뜨리면 시험이 실패해야 하고, 확인 후 되돌린다:
   - 충돌 시 게임을 끝내도록 바꾸기
   - 별을 음수로 허용하기
   - 해제 시 기본 몬스터로 돌리지 않기
3. 빌더: 임시 복제 환경에서 정상 누끼 PNG, 불투명 PNG, JPG, 이름 13자, 파일 없음을 확인한다. 정상만 `character`가 들어가고 나머지는 `⚠️ [character 제외]`가 뜨며 카드는 정상이어야 한다. 정상 결과 PNG의 여백이 잘렸는지, 긴 변이 512 이하인지, 알파가 유지됐는지 확인한다.
4. 등록 도구(B): 임시 환경 + `--no-push`로 확인한다. 메타 없는 기존 작품 허용, 갤러리에 없는 ID 거부, 옵션만 줄 때 메타에 `character`만 생기고 다른 항목은 그대로인지, 잘못된 PNG면 메타를 안 쓰고 종료 코드 1인지 본다. **노션·외부 API·원격 git 호출이 0회**인지도 확인한다.
5. 계약 검사: 바뀐 파일마다 `[ALL PASS]`

### 8-2. 화면 시험
- 서버는 `python scripts/guarded_preview_server.py`(포트 8767, 노션 쓰기 차단)만 쓴다.
- 360×800, 1280×800 두 크기에서 확인한다:
  1. `character` 있는 작품에만 버튼이 보이고, 부모 계정은 「민수에게/민서에게」 두 버튼이 보인다
  2. 민수로 장착 → `monster_lab.html`의 `#monsterImg`, `quest_runner.html`의 `#cheerMonster`에 그 캐릭터와 이름이 보인다. 연구소에서 좌우로 넘겨 다른 몬스터를 골랐다가 다시 고를 수 있다. 해제하면 클레이 바이트로 돌아간다
  3. 민서로 장착 → 연구소 `#minseoPartnerImg`와 러너 파트너가 바뀌고, 민수의 선택은 그대로다
  4. 미니 런: 탭·스페이스로 1단·2단 점프, 부딪혀도 계속 달림, 60초 뒤 완주 화면, 다시 달리기, 창 크기 변경, 탭 숨김 시 일시정지, 닫은 뒤 오버레이·rAF 해제, 민서·민수 테마 차이
  5. 콘솔 오류 0건, `window.__blockedWrites` 비어 있음
- 결과는 완료 보고에 항목별 통과·실패로 적는다. 확인하지 못한 항목은 못 했다고 적는다(`GEMINI.md` §5-4). `walkthrough.md`는 저장소에 만들지 않는다.

---

## 9. 커밋 단위 (권장)

| 순서 | 저장소 | 내용 |
| :--- | :--- | :--- |
| 1 | 공부방 | `feat(quest): 갤러리 파트너 저장소·로스터 동적 항목` (로스터, 연구소·러너 연결, 시험 일부) |
| 2 | 공부방 | `feat(gallery): 자작 캐릭터 미니 런·모달 버튼` |
| 3 | 공부방 | `feat(gallery): 빌더 character 변환·검증` |
| 4 | 공부방 | `docs(gallery): 캐릭터 파트너·미니 런 명세·카탈로그 갱신` |
| 5 | 관제탑 | `feat(gallery): 작품 등록 도구 --character-sprite/--character-name` |

- 바뀐 스크립트의 `?v=` 캐시 쿼리를 올린다(`gallery.html`, `monster_lab.html`, `quest_runner.html` 중 실제로 바뀐 스크립트를 싣는 곳만).

---

## 10. 부모용 등록 절차 (구현 후 `gallery_archive_spec.md`로 옮김)

1. **캐릭터 누끼 만들기**: 아이가 그린 캐릭터나 만든 인형 사진에서 배경을 지운 PNG를 만든다. 갤럭시 갤러리 앱의 「배경 지우기」, 사진 길게 눌러 개체 복사 같은 기능을 쓴다. 캐릭터 하나만 남기고, 손이나 책상이 같이 잘리지 않게 한다.
2. **등록**: 그 작품(원본 사진은 이미 갤러리에 있음)에 붙인다.
   ```bash
   python -X utf8 scripts/sync_quick_upload.py --id "art_..." --author "민수" --character-sprite "E:/Downloads/xxx.png" --character-name "이름"
   ```
3. **확인**: 갤러리에서 장착하고 5분 퀘스트 연구소에 들어가 본다. 미니 런도 한 판 해 본다.

---

## 11. 구현 후 문서 정리
- 이 문서 맨 위 상태를 「구현 완료 (날짜)」로 바꾸고, 작업 지시용 절(§0, §7, §8, §9)을 줄여 실제 API, 데이터 계약, 동작 규칙, 한계만 남긴다.
- `CORE_CATALOG.md`: `monster_roster.js` 절에 새 함수와 저장 키(기기 로컬 한계 포함), 갤러리 절에 `gallery-mini-runner.js`, 회귀 시험 절에 새 시험을 추가한다.
- `gallery_archive_spec.md`: 파일 맵, 등록 옵션, §10 절차를 추가하고 문서 버전을 올린다.
- `character_studio_handover.md`: 「갤러리 자작 캐릭터 → 파트너」 연결 규격(필드, 그림 규격 512px·투명 PNG, 저장 키)을 한 절로 추가한다.
