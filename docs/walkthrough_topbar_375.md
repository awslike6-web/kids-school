# 폰 너비 상단 줄 검증 기록 (2026-11-02)

`guarded_preview_server.py`(노션 쓰기 차단)로 앱 내장 브라우저에서 확인했다. 막힌 쓰기 요청은 없었다.

## 측정 결과

| 화면 | 너비 | 전 | 후 |
|---|---|---|---|
| `monster_lab.html?user=minseo` | 375 | scrollWidth 387, 소리 버튼 오른쪽 끝 387 | scrollWidth 375, 소리 버튼 오른쪽 끝 365, 한 줄 |
| `monster_lab.html?user=minsu` | 375 | scrollWidth 375, 칩 오른쪽 끝 370 | scrollWidth 375, 칩 오른쪽 끝 365, 한 줄 |
| `monster_lab.html?user=minseo` | 360 | 측정 안 함 | scrollWidth 360, 이름 숨김, 한 줄 |
| `monster_lab.html?user=minseo` (부모 버튼 표시) | 360 | 측정 안 함 | scrollWidth 360, 두 줄, 잘림 없음 |
| `monster_lab.html?user=minseo` | 320 | 측정 안 함 | scrollWidth 320, 두 줄, 잘림 없음 |
| `monster_lab.html?user=minseo` | 1024 | 측정 안 함 | 코인 글자 14px, 이름 표시 |

| 퀘스트 러너 | 너비 | 후 |
|---|---|---|
| 민수 영어 레슨 | 375 | 배지·단계 표시 각각 한 줄, 활동 문구는 배지 아래 한 줄, 넘침 없음 |
| 민서 국어 한입 레슨 | 375 | 같음 |
| 민수 수학 4+1 | 320 | 같음 |

부모 버튼 표시는 화면에서 `hidden`을 임시로 빼서 확인했고, 실제 부모 인증 흐름은 거치지 않았다.

민수 수학의 `🎁 비밀 맛보기 (하트 0)` 단계 문구는 5번 문제까지 풀지 않아 화면으로 확인하지 못했다.

## 원인

- 연구소: `monster_lab_controller.js`가 칩 글자 크기를 `text-sm`으로 덮어써 HTML의 `text-xs sm:text-sm`이 무시되었다. 민서는 코인 `2,450`이 길어 22px 넘쳤다.
- 퀘스트 러너: 활동 문구 `<p>`가 과목 배지 알약 안에 들어가 배지와 단계 표시를 함께 눌렀다.
