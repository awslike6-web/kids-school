# 동화 그림 중복 정리 및 화면 검증 기록 (2026-11-08)

`kids-school-main/scripts/guarded_preview_server.py`(포트 8767, 노션 쓰기 차단)를 띄운 상태에서 4개 도서(영어·국어·과학·사회)의 첫 페이지와 마지막 페이지를 데스크톱(1280x800) 및 모바일(폭 375px) 뷰포트에서 직접 조작해 확인했다.

## 1. 네트워크 및 가로 스크롤 점검 요약

- **그림 요청 원본**: 4개 도서의 모든 동화 그림 요청이 kids-archive CDN 주소(`https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/...`)로 전송됨을 확인.
- **네트워크 오류**: 4개 도서 전 페이지 순회 중 HTTP 404 등 실패 응답 0건.
- **모바일 가로 스크롤**: 폭 375px 환경에서 4개 도서 모두 `scrollWidth` 375px로 측정되어 가로 스크롤 발생 없음 (`has_h_scroll: false`).

## 2. 화면 육안 검증 결과 (16장 전수 확인)

| 권 (과목/경로) | 쪽 | 폭 | 사진 경로 (scratch) | 사진에 실제로 보이는 것 | 네트워크 404 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **영어**<br>`kids/subjects/english/english_l9_storybook.html` | 1/11 (첫장) | 1280 | `scratch/storybook_dupes_20261108/shots/english_first_desktop.png` | 초가지붕 집 앞마당 길에 서서 손 흔드는 소녀와 로봇(코코) 삽화. 오른쪽 본문 "Welcome to My Dream House!", "어서 와, 나의 꿈의 집으로!", 하단 컨트롤 바 1/11쪽 표시. | 없음 |
| **영어**<br>`kids/subjects/english/english_l9_storybook.html` | 11/11 (끝장) | 1280 | `scratch/storybook_dupes_20261108/shots/english_last_desktop.png` | 집 앞마당에서 인사하는 소녀와 로봇 삽화. 오른쪽 본문 "Lesson 9 · Page 10 10장: 꿈의 집 투어를 마치며", "I love my dream house!...", 하단 우측 "🎉 완독 축하 & 보상!" 버튼. | 없음 |
| **영어**<br>`kids/subjects/english/english_l9_storybook.html` | 1/11 (첫장) | 375 | `scratch/storybook_dupes_20261108/shots/english_first_375.png` | 375px 폭에 맞춰 비율 축소된 1쪽 양면 펼침면(소녀와 로봇 삽화 + 영한 본문). 가로 스크롤 없이 상하단 컨트롤 온전 배치. | 없음 |
| **영어**<br>`kids/subjects/english/english_l9_storybook.html` | 11/11 (끝장) | 375 | `scratch/storybook_dupes_20261108/shots/english_last_375.png` | 375px 폭에 맞춘 11쪽 양면 펼침면. 본문과 "🎉 완독 축하 & 보상!" 버튼 잘림 없이 표시. | 없음 |
| **국어**<br>`kids/subjects/korean/korean_1_2_2_storybook.html` | 1/11 (첫장) | 1280 | `scratch/storybook_dupes_20261108/shots/korean_first_desktop.png` | 왼쪽 백색 여백, 오른쪽 꽃밭 속 참외씨 캐릭터 뽀로와 멜빵바지 소년이 만나는 표지 삽화 및 "참외씨 뽀로의 맑고 넓은 세상 여행" 표지 텍스트. | 없음 |
| **국어**<br>`kids/subjects/korean/korean_1_2_2_storybook.html` | 11/11 (끝장) | 1280 | `scratch/storybook_dupes_20261108/shots/korean_last_desktop.png` | 흙 속의 참외씨 뽀로와 빛을 비추는 구름 할아버지 요정 삽화. 오른쪽 "따스한 흙 속에서...", "아름다운 멋진 날이었습니다." 본문 및 "완독 축하 & 보상!" 버튼. | 없음 |
| **국어**<br>`kids/subjects/korean/korean_1_2_2_storybook.html` | 1/11 (첫장) | 375 | `scratch/storybook_dupes_20261108/shots/korean_first_375.png` | 375px 폭에 맞춘 1쪽 표지 양면 펼침면. 가로 스크롤 없음. | 없음 |
| **국어**<br>`kids/subjects/korean/korean_1_2_2_storybook.html` | 11/11 (끝장) | 375 | `scratch/storybook_dupes_20261108/shots/korean_last_375.png` | 375px 폭에 맞춘 11쪽 펼침면 및 완독 축하 버튼. 가로 스크롤 없음. | 없음 |
| **과학**<br>`kids/subjects/science/science_temp_storybook.html` | 1/9 (첫장) | 1280 | `scratch/storybook_dupes_20261108/shots/science_first_desktop.png` | 왼쪽 백색 여백, 오른쪽 실험실 책상 앞 노란 모자의 민수와 과학 요정 모리 표지 삽화 및 "온도 탐험대 민수와 열의 이동 비밀" 텍스트. | 없음 |
| **과학**<br>`kids/subjects/science/science_temp_storybook.html` | 9/9 (끝장) | 1280 | `scratch/storybook_dupes_20261108/shots/science_last_desktop.png` | 노을빛 창가 앞에서 책을 든 민수와 날아오르는 요정 모리 삽화. 오른쪽 본문 및 "완독 축하 & 보상!" 버튼. | 없음 |
| **과학**<br>`kids/subjects/science/science_temp_storybook.html` | 1/9 (첫장) | 375 | `scratch/storybook_dupes_20261108/shots/science_first_375.png` | 375px 폭에 맞춘 1쪽 표지 펼침면 및 컨트롤. 가로 스크롤 없음. | 없음 |
| **과학**<br>`kids/subjects/science/science_temp_storybook.html` | 9/9 (끝장) | 375 | `scratch/storybook_dupes_20261108/shots/science_last_375.png` | 375px 폭에 맞춘 9쪽 마지막 펼침면 및 축하 버튼. 가로 스크롤 없음. | 없음 |
| **사회**<br>`kids/subjects/society/joseon_storybook.html` | 1/11 (첫장) | 1280 | `scratch/storybook_dupes_20261108/shots/society_first_desktop.png` | 왼쪽 백색 여백, 오른쪽 해안 절벽 위 민수와 친구 6명 및 거북선 표지 삽화와 "민수와 친구들: 조선을 지킨 용기의 불꽃" 텍스트. | 없음 |
| **사회**<br>`kids/subjects/society/joseon_storybook.html` | 11/11 (끝장) | 1280 | `scratch/storybook_dupes_20261108/shots/society_last_desktop.png` | 박물관 거북선 모형 앞에서 기록하는 민준이와 책을 든 민수 삽화. 오른쪽 본문 및 "완독 축하 & 보상!" 버튼. | 없음 |
| **사회**<br>`kids/subjects/society/joseon_storybook.html` | 1/11 (첫장) | 375 | `scratch/storybook_dupes_20261108/shots/society_first_375.png` | 375px 폭에 맞춘 1쪽 표지 펼침면. 가로 스크롤 없음. | 없음 |
| **사회**<br>`kids/subjects/society/joseon_storybook.html` | 11/11 (끝장) | 375 | `scratch/storybook_dupes_20261108/shots/society_last_375.png` | 375px 폭에 맞춘 11쪽 마지막 펼침면 및 축하 버튼. 가로 스크롤 없음. | 없음 |

## 3. 직접 확인한 것과 확인하지 않은 것

- **직접 확인한 것**:
  - 4개 과목 도서의 첫 펼침면과 마지막 쪽 도달 및 렌더링 상태 (데스크톱 및 폭 375px 모바일 전수 16장 스크린샷 캡처 및 육안 대조).
  - 브라우저 네트워크 콘솔 상 모든 이미지 리소스가 `raw.githubusercontent.com/awslike6-web/kids-archive/...` 경로에서 정상 수신되고 404 오류가 0건임.
  - 모바일 폭 375px에서 `document.documentElement.scrollWidth`가 375px 이하로 유지되어 가로 넘침이 발생하지 않음.
- **확인하지 않은 것**:
  - 4권 외 나머지 27개 스토리북의 전 페이지 수동 육안 점검 (단, 31개 도서의 `imgBase`가 kids-archive CDN 주소임을 Opus 사전 분석에서 기확인함).
  - 완독 보상 모달 클릭 후의 실제 노션 인벤토리 DB 쓰기 동작 (노션 쓰기 차단 서버 보호 환경에서 진행).
