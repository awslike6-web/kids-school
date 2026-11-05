---
name: gallery-special-day-register
description: 갤러리 작품(만들기·그림·상장 등)이나 특별한 날(소풍·현장학습·생일·가족 나들이·학교행사) 추억을 등록·수정할 때 사용. 공식 입구 sync_quick_upload.py 미리보기→실행, 작성자 저장값(온 가족="공동"), 구글 포토 영상 링크(--video / --videos-json), 등록 후 점검표 verify_gallery_entry.py, 사진 육안 확인, 결과 보고 형식을 정한 표준 절차. "갤러리에 올려줘", "특별한 날 등록", "퀵업로드 올린 거 등록해줘", "구글 포토 링크 넣어줘", "등록 잘 됐는지 확인해줘" 요청에서 호출.
---

# 🖼️ 갤러리·특별한 날 등록 절차 (gallery-special-day-register)

> **원본 위치**: 이 파일은 `.agent/skills/gallery-special-day-register/SKILL.md`가 원본입니다. `.claude/skills/`는 사본이므로 직접 고치지 마세요. 고친 뒤에는 `python scripts/sync_agent_skills.py`를 실행합니다.
>
> **경로 기준**: 공식 입구는 관제탑 루트(`master-tower/`)의 `scripts/sync_quick_upload.py`이고, 그 밖의 경로는 `kids-school-main/` 기준입니다. 저장소는 셋입니다: 관제탑, `kids-school`(공부방), `kids-archive`(12년 보존 사진).
>
> **사실 정보의 원본은 따로 있습니다**: 명령·옵션·폴더 규칙은 `docs/gallery_archive_spec.md`(§3 작품, §5 특별한 날, §9 점검표·데이터 규칙), 노션 속성은 `docs/notion_schemas_school.md`, 스크립트 API는 `kids/core/CORE_CATALOG.md`가 원본입니다. 이 스킬은 순서와 판단 기준만 둡니다.

## 1. 지켜야 할 규칙 (도구와 시험이 함께 막는다)
| 규칙 | 지키는 곳 |
| :--- | :--- |
| 작성자 저장값: `민서`·`민수`·`공동`(온 가족)·`아빠`·`엄마`. "공통·가족·온가족·함께"라고 들어도 **공동** | 빌더 `normalize_author`, 시험 `tests/gallery-data-contract.test.mjs` |
| 특별한 날 분류는 6종(가족/생일파티·생태/텃밭/체험·소풍/현장학습·학교행사/운동회·사계절 자연관찰·소중한 하루) | 빌더 `--event-cat` 검사, 같은 시험 |
| 특별한 날 사진은 `kids-archive/assets/media/{아이}/activities/`, 작품은 학년 폴더 | 빌더, `tests/media-archive-paths.test.mjs` |
| 같은 대상 사진 여러 장은 카드 1개(`--file` + `--sub-files`) | 명세서 §4 |
| 구글 포토·유튜브 링크는 새 창 버튼으로만 연다 (창 안 재생은 `.mp4` 등 파일만) | 화면 `gallery-modal-manager.js` |
| 일회성 스크립트로 데이터 파일을 직접 고치지 않는다. 도구에 없는 기능이 필요하면 도구를 고치고 명세서·시험·CORE_CATALOG도 같이 고친다 | `../GEMINI.md` §9-5, `GEMINI.md` §0 |

## 2. 작업 순서
1. **입력 정리**: 사용자에게 받은 사진 경로, 제목, 날짜, 작성자, 분류, 설명, 영상 링크를 표로 정리한다. 작성자가 "공통/온 가족"이면 `공동`으로 적는다.
2. **미리보기 (특별한 날)**: 관제탑 루트에서 `--dry-run`으로 id·사진 경로·넣을 항목을 확인한다.
   ```bash
   python -X utf8 scripts/sync_quick_upload.py --cat "특별한 날" --dry-run \
     --author "민서" --date "2026-11-05" --slug lotteworld --event-cat "소풍/현장학습" --icon "🏰" \
     --title "🏰 제목" --note "설명" --file "E:/Downloads/a.jpg" \
     --videos-json '[{"url":"https://photos.app.goo.gl/...","text":"🏰 퍼레이드 풀영상"},{"url":"https://photos.app.goo.gl/...","text":"🎢 놀이기구 모음"}]'
   ```
   - 영상 링크가 1개면 `--video "주소" --video-btn "🎬 문구"`, 여러 개면 `--videos-json`. 버튼 문구 맨 앞 이모지가 버튼 아이콘이 된다(`icon`은 생략).
   - 작품은 미리보기가 없다. 명세서 §3의 작품 명령을 그대로 쓴다.
3. **실행**: 같은 명령에서 `--dry-run`만 뺀다. 도구가 사진 보정 → 데이터 → 노션 카드 → 두 저장소 커밋·푸시 → **등록 후 점검표**까지 한 번에 한다.
4. **점검표 확인**: 마지막에 나오는 `🔎 [등록 후 점검표]`에 ❌가 하나라도 있으면 완료가 아니다. 원인을 고치고 다시 확인한다. 단독 실행:
   ```bash
   python -X utf8 scripts/verify_gallery_entry.py --id evt_... --id art_...   # kids-school-main에서
   ```
5. **사진 육안 확인**: 점검표 끝의 `👀` 사진 경로를 모두 직접 열어 ① 바로 서 있는지 ② 대상이 잘리지 않았는지 ③ 제목과 맞는지 본다 (`GEMINI.md` §5-3). 기계 점검은 이것을 대신하지 못한다.
6. **영상 링크 내용 확인(링크를 넣었을 때)**: 링크를 열어 버튼 문구와 내용이 맞는지 본다(예: "전체 사진 앨범"이라고 쓴 링크가 실제로 무엇인지). 다르면 사용자에게 묻는다.
7. **보고**: 아래 형식으로 보고한다.

## 3. 보고 형식
| 종류 | id | 제목 | 작성자 | 사진 | 영상 링크 | 노션 | 점검표 | 육안 확인 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 특별한 날 | evt_minseo_lotteworld_20261105 | 🏰 … | 민서 | 1장 | 3개 | 1장 | ✅ | 바로 섬·대상 온전·제목 일치 |

- 점검표 ❌·노션 실패·육안 확인 안 한 사진이 있으면 "완료"라고 쓰지 않는다. 무엇이 남았는지 적는다.
- 사용자가 준 정보와 다르게 넣은 것(작성자 별칭을 `공동`으로 바꿈 등)은 한 줄로 알린다.

## 4. 이미 등록한 것 점검만 할 때 ("잘 등록됐는지 확인해줘")
1. `git log`로 최근 등록 커밋을 찾고, `kids/data/special-days-data.js`·`gallery-data.js`에서 새 id를 모은다.
2. 그 id들로 `verify_gallery_entry.py`를 실행한다.
3. 사진 육안 확인, 영상 링크 내용 확인(§2의 5·6)을 한다.
4. `node --test "tests/**/*.test.mjs"`로 데이터 규칙 시험까지 통과하는지 본다.
5. §3 형식으로 보고한다. 기존 데이터가 사라지지 않았는지(작업 전후 id 목록 비교)도 적는다.

## 5. 자주 하는 실수
- 작성자를 "공통"으로 저장 → 갤러리 '온 가족 추억' 탭에서 빠졌다 (2026-11-06). 이제 빌더가 `공동`으로 바꾼다.
- 도구에 옵션을 추가하면서 명세서·시험을 안 고침 → 다음 에이전트가 옵션을 모른다. 옵션을 추가하면 `docs/gallery_archive_spec.md`, `CORE_CATALOG.md`, 시험을 같은 커밋에서 고친다.
- `--videos-json` JSON 오류 → 예전에는 경고만 하고 영상 없이 등록됐다. 이제 등록 전에 멈춘다(종료 코드 1).
- 시험 사진을 실제 `kids-archive`에 올림 → 12년 보존 저장소다. 도구 검증은 `--dry-run`과 임시 폴더로 한다.
