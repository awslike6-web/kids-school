# 특별한 날 원천 통합·등록 도구 화면 검증 (2026-10-29)

## 바뀐 것
- 하루방 특별한 날 탭이 갤러리와 같은 `kids/data/special-days-data.js` 하나만 읽는다. `haru_data.js`의 `defaultEvents`(예시 3건 포함)는 지웠다.
- 하루방은 지금 아이의 행사와 공동·공통·아빠·엄마 행사만 보여 준다(날짜 최신순).
- 하루방에만 있던 생일 영상 2편 목록(`videos`)은 `special-days-data.js`의 생일 항목으로 옮겼다. 데이터 배열 본문은 빌더가 읽고 쓸 수 있게 JSON 형식으로 바꿨다(나머지 내용은 그대로, node로 깊은 비교 확인).
- 등록: 관제탑 `scripts/sync_quick_upload.py --cat "특별한 날"` → 빌더 `scripts/add_activity_photo.py` ([`gallery_archive_spec.md` §5](gallery_archive_spec.md)).

## 화면 확인 (노션 쓰기 차단 서버 `guarded_preview_server.py` 8767, 모바일 375×812)
| 확인 | 민서 (`haru.html?user=minseo`) | 민수 (`haru.html?user=minsu`) |
| :--- | :--- | :--- |
| 카드 수 | 12건 (민서 8 + 공동 4) | 4건 (공동 4, 민수 개인 행사는 아직 없음) |
| 맨 위 | 10/22 반려동물 훈련사 → 10/21 나눔 장터 → 10/18 개업식 | 10/18 개업식 |
| 예시 3건 (어린이날·소풍·크리스마스) | 없음 | 없음 |
| 다른 아이 개인 행사 | 없음 | 민서 행사 없음 |
| 가로 넘침 (`scrollWidth`) | 375 = 화면 폭 | 375 = 화면 폭 |
| 사진 로드 | 첫 3장 모두 로드 (깨진 이미지 0) | 정상 |
| 생일 카드 영상 버튼 | 2편 (촛불 끄기·AI 생일 축하송) | 해당 없음 |
| 노션 쓰기 시도 (`__blockedWrites`) | 0 | 0 |

- 갤러리 특별한 날 탭(`gallery.html`)도 바뀐 데이터 12건을 그대로 읽고 콘솔 오류가 없다.
- 탭 전환 직후 잠깐 흐리게 보이는 것은 패널 등장 애니메이션이다(1~2초 뒤 정상).

## 시험
- `node --test "tests/**/*.test.mjs"`: 61건 중 실패 0, todo 1(기존). 새 시험 `tests/haru-special-days.test.mjs` 4건.
- 빌더·입구는 `--dry-run`(파일·Git 변경 없음 확인)과 임시 폴더·모의 노션으로 검증했다. 실제 `kids-archive`에는 시험 사진을 올리지 않았다.
