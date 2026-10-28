# 캐릭터 목소리 고르기 화면 검증 (2026-10-28)

변경: `fairy-engine.js`가 목소리 목록(`VOICE_CATALOG`)만 보고 캐릭터 음성 파일을 고름. 다른 아이 전용·준비중 목소리는 요정 코코로 돌아감. 설정창의 준비중 목소리는 잠금.

## 실제 재생 파일 (로컬 서버 `python -m http.server`, 노션 쓰기는 페이지 안에서 차단)

| 화면 | 학생·설정 | 정답 / 오답 / 완주 |
| :--- | :--- | :--- |
| `kids/subjects/math/number100.html` (목록 파일을 싣지 않는 화면) | 민서·깍쟁이 | `snarky_correct_01` / `snarky_wrong_04` / `snarky_clear_01` |
| 같은 화면 | 민서·깐죽이(민수 전용) | 요정 코코 `fairy_praise_6` / `fairy_encourage_5` / `fairy_quest_complete` |
| 같은 화면 | 민서·아기새(준비중) | 요정 코코 |
| `quest_runner.html` (5분 퀘스트) | 민수·깐죽이 | `tease_correct_03`·`tease_correct_01`(연속 중복 없음) / `tease_wrong_04` / `tease_clear_01`, 로비 인사 `tease_welcome_01` |
| 같은 화면 | 민수·깍쟁이(민서 전용) | 요정 코코 |

- 목록 파일을 싣지 않는 화면에서도 엔진이 목록을 1번만 불러옴(`<script>` 1개). 콘솔 오류 없음.
- 음성 파일 응답 200 확인(`snarky_correct_05.wav`).

## 설정창 (모바일 375×812, `index.html?user=daughter`)
- 목소리 카드 4개: 요정 코코·깍쟁이는 선택 가능, 아기새·아빠는 흐리게 표시되고 '준비중'. 준비중 카드를 눌러도 설정이 바뀌지 않음.
- 가로 스크롤 없음, 카드 글자·미리듣기 버튼이 잘리지 않음.
- 참고(이번 변경 전부터): 설정창 CSS(`fairy-settings-modal.css`)는 `index.html`·`lobby.html`에만 연결되어 있어, 구구단 등 과목 화면에서 설정창을 열면 스타일 없이 표시됨.
