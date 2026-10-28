# 음성 엔진 분리·말하기 속도 화면 검증 (2026-10-28)

변경: 음성 합성을 `kids/core/fairy-tts.js`로 분리(엔진 `fairy-engine.js` 1,311줄 → 423줄, 새 파일 725줄). 실시간 음성 대기열 하나로 통일(중간 실패 건너뛰기·끝 콜백·다음 2문장만 미리 받기·다 쓴 음성 해제), 수식 읽기, 브라우저의 OpenAI 직접 호출 삭제, 설정창 한국어·영어 말하기 속도 단추, 영어방 속도 단추 복구(`changeEnglishSpeechRate`가 2026-10 모듈 분리 때 빠져 눌러도 반응 없던 문제).

Worker: 같은 날 Edge 접속 토큰 v2로 교체(v4.6). 이전에는 실시간 음성이 전부 OpenAI 대체로 나오고 있었음.

## 실제 재생 (로컬 서버, 민수)

| 화면 | 행동 | 결과 |
| :--- | :--- | :--- |
| `kids/subjects/math/gugudan.html` | 퀴즈 정답 / 오답 | `fairy/fairy_praise_7.mp3` / `fairy/fairy_encourage_*.mp3` |
| 같은 화면 | `speakFairyTTS`로 4문장(수식 포함) | Worker에 4문장 차례로 요청, "3 더하기 4는 7 이고 10 빼기 3은 7 이에요." 로 읽음, 끝 콜백 옴(약 12초). Worker 응답 엔진 `edge` |
| `quest_runner.html` | "1/3 × 3 = ?" 정답(3/3) | `fairy/fairy_praise_2.mp3`, 콘솔 오류 없음 |
| `kids/subjects/korean/korean.html` 정밀 독해 1학기 5번 | 🔊 요정 코코 낭독 듣기 | 센터 MP3 `center_reading/….mp3` 재생(배속 1) |
| 같은 화면 | 한국어 속도 '느리게' 후 다시 듣기 | 같은 센터 MP3가 배속 0.85로 재생 |
| `index.html` 설정창 | 한국어 '느리게' | 저장 0.85, 미리듣기 문장이 Edge `-10%`로 요청 |
| 같은 설정창 | 영어 '0.75배' | 저장 0.75, 미리듣기 영어가 재생 배속 0.75 |
| `kids/subjects/english/english.html` | 영어방 속도 단추 | 설정창에서 고른 0.75가 켜져 있고, 0.5를 누르면 같은 값이 0.5로 바뀜 |

- 화면마다 로드 순서 확인: `fairy-tts.js` → `fairy-settings-catalog.js` → `fairy-engine.js`.
- 구구단을 로비를 거치지 않고 바로 열면 `currentTheme is not defined`로 퀴즈가 시작되지 않음. 이번 변경 전부터 있던 문제(로비가 `currentTheme`를 저장해 두면 정상). 별도 과제.

## 모바일 (375×812, `index.html` 설정창)
- '🗣️ 말하기 속도' 칸이 2열 단추로 보이고 가로 스크롤 없음(`scrollWidth` = 화면 폭). 영어 단추 이름이 두 줄로 꺾여 '0.5배'처럼 짧게 줄임.

## ⚠️ 검증 중 사고와 조치
- 영어방 화면에서 노션 쓰기 차단을 걸기 전에 속도 단추를 눌러, 민수 인벤토리 「학습설정」이 2번 실제로 덮어써짐(12:50 KST). 원래 값(퀘스트 단원 설정·저금통·스크린타임 승인)이 지워지고 시험 브라우저의 기본 설정만 남음.
- 노션 페이지 업데이트 기록의 전날 19:21 값으로 사용자 승인 후 1번 되돌리고 다시 읽어 1,067자 일치 확인.
- 재발 방지: 화면 검증 서버 `scripts/guarded_preview_server.py`(페이지 `<head>` 맨 앞에 쓰기 차단을 넣어 내보냄). 이후 퀘스트·국어 화면 검증은 이 서버로 했고 설정 저장이 모두 차단됨(`window.__blockedWrites`).
