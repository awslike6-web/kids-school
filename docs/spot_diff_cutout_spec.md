# 🎄 틀린그림찾기 누끼 작품 지원 명세서 (크리스마스 트리 판)

> **문서 버전**: v1.0 (2026-11-01)
> **상태**: 구현 완료 (2026-11-01). 담당: Antigravity
> **근거**: 노션 현황판 카드 「틀린그림찾기 새 판 추가 (현재 한옥 1판)」, `docs/gallery_spot_diff_spec.md`, `docs/gallery_spot_diff_align_spec.md`, `docs/gallery_archive_spec.md` §3④·§7.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다.

---

## 0. 진행 방식 (꼭 지킨다)
- **먼저 계획(바꿀 함수와 줄 범위, 시험 구성, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 브랜치 `antigravity/spot-diff-cutout`에서 작업하고 그 브랜치까지만 푸시한다. **`main`에 병합·푸시하지 않는다.**
- **실제 등록을 하지 않는다.** `scripts/sync_quick_upload.py`를 실제 저장소에서 실행하지 않는다. 이 도구는 휴대폰 업로드 대기열을 함께 처리하고, 두 저장소에 자동 커밋·푸시하며, `--title`을 주면 노션에 쓴다. 시험은 임시 폴더 복사본과 가짜 데이터로 한다. 실제 등록은 검증 뒤 Claude가 한다.
- 운영 노션에 쓰지 않는다. 화면은 `python scripts/guarded_preview_server.py`로 본다.
- `kids/data/gallery-data.js`, `gallery-meta.json`, `kids-archive`의 파일을 커밋하지 않는다. `walkthrough.md`와 스크린샷도 커밋하지 않는다.
- 커밋 끝에 `Agent: antigravity (모델명)`을 쓴다.
- **완료 보고 규칙**: 실행한 명령과 출력 마지막 10줄을 원문 그대로 붙인다. 화면 문구는 코드에서 복사한다. 커밋 해시와 `git diff --stat main...HEAD`를 붙인다. 하지 않은 일은 "하지 않음"으로 적는다. 실제로 확인하지 않은 것을 확인했다고 적지 않는다.

---

## 1. 배경
민서의 「반짝반짝 크리스마스 양말 트리 캔버스」(`art_minseo_20260906_194054`, 968×1200, `hasCutout: true`)로 틀린그림찾기 새 판을 만든다. 게임에 쓸 그림과 정답은 **이미 Claude가 만들어 검수했다**(§2). 이번 작업은 등록 도구가 누끼 작품을 받아들이게 하는 코드 수정뿐이다. 그림을 다시 만들거나 고치지 않는다.

지금 막히는 곳은 `scripts/build_gallery.py`의 `build_spot_diff`다. `has_cutout`이면 `'누끼 작품은 지원하지 않습니다'`로 제외한다.

## 2. 준비된 입력 (로컬, Git 무시, 수정 금지)
폴더: `uploads/ex/갤러리/_spotdiff_work/art_minseo_20260906_194054/`

| 파일 | 내용 |
| :--- | :--- |
| `final/제미나이용_흰배경_diff.jpg` | 변형 그림 968×1200. `spot_diff_align.py` 원본 도구로 합성, `report.json`의 `passed: true`, 배경 차이 10(기준 12), 선택 안 한 큰 변화 없음 |
| `spots.json` | 정답 5곳(곰돌이 사라짐, 왼쪽 양말 산타, 파란 양말, 오른쪽 양말 루돌프, 노란 별) |

흰 배경 합성은 원본 PNG의 투명 부분을 흰색으로 채운 것이다. `spot_diff_align.py`가 투명 원본을 거부하는 규칙은 그대로 둔다(흰 배경으로 합친 원본을 주는 절차를 문서로 안내한다).

## 3. 요구 사항
`build_spot_diff`에서 `has_cutout`일 때의 처리만 바꾼다. **누끼가 아닌 작품의 동작·결과 파일(JPEG 품질 85, `.jpg`)은 한 글자도 바뀌면 안 된다.**

1. 원본과 변형이 **같은 픽셀 크기로 보이게** 기존처럼 원본 크기로 맞춘다. 비율 1% 검사도 그대로 둔다.
2. 변형 그림에 **원본 PNG의 알파 채널을 그대로 입혀 PNG로 저장**한다(대상 이름 `{sub_dir}_{stem}.png`). 그래야 게임에서 두 그림의 가장자리가 똑같이 투명해서, 가장자리에 가짜 차이가 생기지 않는다.
3. 반환값 `modifiedImageUrl`은 그 `.png`의 CDN 주소, `spots`는 기존 검증 그대로.
4. 원본이 더 새로운지 판단(`need_convert`), 파일이 없을 때 대상 파일을 쓰는 동작은 PNG 대상에도 같게 적용한다.
5. 오류 처리 방식(제외하고 경고만 출력, 작품 카드 생성은 막지 않음)을 유지한다.
6. 게임 화면(`kids/common_space/gallery-spot-diff.js`)이 두 그림을 어떻게 그리는지 확인하고, 고칠 필요가 없으면 고치지 않는다. 고쳐야 하면 계획에서 이유를 먼저 보고한다.
7. `sync_quick_upload.py`가 이 경로를 지나는 데 걸림이 없는지 코드를 읽어 확인한다. 관제탑 저장소를 고쳐야 하면 고치지 말고 계획에서 보고한다.
8. 보석·사탕·경험치·노션과 연결하지 않는다. 새 전역·새 파일을 만들지 않는다.

## 4. T (시험)
1. `tests/gallery-spot-diff.test.mjs`(또는 그 시험이 부르는 Python 자체 시험)에 추가한다. 임시 폴더와 작은 가짜 그림만 쓴다.
   - 누끼 작품: `.png`가 만들어지고, 크기가 원본과 같고, 알파가 원본과 픽셀 단위로 같고, RGB는 변형 그림에서 온다. 주소가 `.png`다.
   - 누끼 아닌 작품: 전과 같이 `.jpg`, 알파 없음, 주소 `.jpg`.
   - 누끼 작품의 비율 불일치·잘못된 좌표는 전과 같이 제외한다(`None`).
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]`.

## 5. 문서
- `docs/gallery_archive_spec.md` §7의 "누끼 작품이면 제외"를 고치고, 누끼 작품 절차를 적는다: 원본을 흰 배경 JPG로 합쳐 AI 편집과 `spot_diff_align.py --original`에 쓰고, 등록하면 빌더가 원본 알파를 입혀 PNG로 저장한다.
- `docs/gallery_spot_diff_spec.md`의 관련 문장, `CORE_CATALOG.md`에 누끼 지원을 짧게 적는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 실제 결과를 적는다.

## 6. 검증과 등록 (Claude가 함)
Claude가 브랜치를 시험·코드로 검증하고(보고서가 아니라 diff와 실행 결과로), 병합한 뒤 실제 등록을 한다.
```bash
python -X utf8 scripts/sync_quick_upload.py --id "art_minseo_20260906_194054" --author "민서" --diff-file "kids-school-main/uploads/ex/갤러리/_spotdiff_work/art_minseo_20260906_194054/final/제미나이용_흰배경_diff.jpg" --diff-spots "kids-school-main/uploads/ex/갤러리/_spotdiff_work/art_minseo_20260906_194054/spots.json"
```
등록 뒤 배포된 갤러리에서 한 판을 끝까지 진행해 가장자리에 가짜 차이가 없는지 본다.

---

## 7. 구현 결과 (Antigravity)
- **`scripts/build_gallery.py`**: `build_spot_diff`에서 `has_cutout=True` 분기 지원 구현. 원본 PNG의 알파 채널(`orig_alpha`)을 추출하여 변형 그림에 `putalpha()`로 입힌 뒤 투명 PNG(`{sub_dir}_{stem}.png`)로 저장하고 CDN 주소도 `.png`로 생성. 누끼가 아닌 작품(`.jpg`, 품질 85)은 100% 기존과 동일하게 유지.
- **`tests/gallery-spot-diff.test.mjs`**: `build_spot_diff` 단위 테스트 3종(누끼 투명 PNG 합성 및 알파 픽셀/RGB/크기 일치 검증, 일반 작품 JPEG 유지 검증, 비율 불일치/좌표 오류 예외 처리) 추가 완료.
- **테스트 결과**: `node --test tests/gallery-spot-diff.test.mjs` 9/9 PASS, 전사 회귀 시험 466 PASS (0 FAIL).
- **계약 검증**: `verify_contracts.py` 전 파일 `[ALL PASS]`.

## 8. 검증과 등록 결과 (Claude, 2026-11-01)
- **브랜치 검증**: diff 검토, `node --test "tests/**/*.test.mjs"` 466 통과·0 실패·todo 1(두 기기 동시 저장, 알려진 한계), 바뀐 파일 `verify_contracts.py` 전부 `[ALL PASS]`. 병합 `c40b6547`.
- **문서 보완**: `gallery_spot_diff_spec.md`에서 빠진 저장 위치·크기 맞춤 설명을 되살림 (`c147c5e7`).
- **등록**: `--no-push`로 먼저 실행해 결과를 확인한 뒤 푸시. kids-school `9ff19475`, kids-archive `60585c2`. 폰 대기 큐 0건, 노션 쓰기 없음. `minseo_20260906_194054_diff.png` 968×1200, 알파가 원본과 바이트 단위로 같음.
- **화면 확인**: 쓰기 차단 서버와 실제 CDN 그림으로 PC 크기에서 한 판 완주(오답 1회 무반응, 원본·변형 양쪽 터치, 5/5 완주, 콘솔 오류 없음), 휴대폰 크기(375×812) 배치 확인. 실기기 터치와 음성은 확인하지 않음.
- **남은 한계**: 파란 양말 발끝은 정답 원(최대 `r` 0.15) 밖이라, 거기를 누르면 정답으로 치지 않고 오답 표시만 나온다(감점 없음).
