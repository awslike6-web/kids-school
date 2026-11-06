# 3호 모름 검증 기록 (2026-10-30)

- 작업 폴더: `G:/master-tower/scratch/worktrees/monster-3-moreum`, `origin/main`에서 분기.
- 갤러리 등록·메타·원작·노션 콘텐츠는 변경하지 않았다.

## 이미지 육안 검수

사용자가 제공한 PNG 5장을 눈으로 확인했다. 검은 외눈 괴수의 두 뿔·팔·발이 모두 보이고 정방향이며 육안으로 잘린 신체 부위는 없다. RGBA 알파 범위는 모두 0~255로 투명 픽셀이 있다. 원본 가장자리에 캐릭터가 매우 가깝고 일부 알파 픽셀이 경계에 닿는다. 넉넉한 여백이 있는 원본이라고 판단하지 않았으며 원본을 크롭·확대·좌우반전하지 않고 복사했다.

앞모습 idle, 오른쪽 모습 walk_right, 뒷모습 rage, 손 인사 greet와 roar, 왼쪽을 향한 뛰기 walk_left로 연결했다. greet와 roar는 동일 바이트다. 원본 파일명 대응은 `monster_moreum_spec.md`에 기재했다.

## 자동 검사

- `node --test "tests/**/*.test.mjs"`: 87개 중 85개 통과, 실패 0, 기존 skip 1, 기존 TODO 1.
- 변경 코드·HTML의 `verify_contracts.py --mode file --file ...`: 전부 `[ALL PASS]`.
- 3호의 실제 6포즈 파일 존재·greet/roar 일치·뒤돌아선 대사·격려 문구 검사.
- 기존 갤러리 미니 달리기 162개 월드·장애물 4248개 통과.

## 브라우저 검증

Chrome 360×800, 1280×800에서 3호 칩 선택과 이미지 6포즈 로딩·대사 표시, 실제 quest_runner의 시작·정답·격려·완주 반응을 확인했다. 저장·외부 통신은 시험 전용으로 격리했고 런타임 페이지 오류 0, 차단된 노션 쓰기 요청 0이었다. 3호 칩은 모바일에서 글자 중간이 잘리지 않도록 칩 단위로 줄바꿈한다.

`guarded_preview_server.py 8767`을 기동했으나 이 세션의 브라우저에서 loopback 연결이 시간 초과되어, 브라우저 요청에 로컬 파일과 서버 모듈의 동일 GUARD를 직접 공급했다. Tailwind와 Material Symbols는 실제 CDN 파일을 임시 다운로드해 공급했다. 따라서 실제 8767 HTTP 전송까지 정상이라고 보고하지 않는다. 본문 글꼴은 시스템 대체 글꼴로 검증했다.

모바일 기존 헤더는 viewport 360px에서 scrollWidth 413px로 가로로 넘친다. `origin/main` 원본 HTML을 같은 조건에서 재검증해 동일 413px임을 확인했다. 이번 3호 칩 폭은 340px 안에 들어오며 PC는 1280px 내에 표시된다. 기존 헤더 문제는 이 PR의 변경 범위에 포함하지 않았다.

스크린샷(커밋 제외): `G:/master-tower/scratch/moreum-lab-360.png`, `moreum-lab-1280.png`, `moreum-runner-360.png`, `moreum-runner-1280.png`.

---

# 영어 「듣고 끌어다 놓기」(Listen & Place) 8단원 옷 입히기 v2 검증 기록 (2026-11-06)

- **작업 폴더**: `G:/master-tower/scratch/worktrees/english-listen-place-v2`
- **작업 브랜치**: `antigravity/english-listen-place-v2` (`origin/antigravity/english-listen-place`에서 분기 후 `origin/main` 병합)

## 1. 자동 검사 결과

- `node --test "tests/english-listen-place.test.mjs"`: 7개 통과 (`tests 7, pass 7, fail 0`).
  - 파일 줄 수(600줄 이하) 및 금지 문자열(`saveStudyLogDirect`, `speechSynthesis`, `toISOString().slice`, 루트 절대경로) 없음 확인
  - 등록표에 없는 `grade`·`unit` 차단 확인
  - 캐시 모양 기록(`id`만 있고 `pageId` 없음)으로 문제 생성 및 없는 `page_id` 건너뛰기 확인
  - 받침대 물건 4개 구성 및 안경 문제에서 다른 부위(모자 등)로 채우기 확인
  - 정답 전 받침대 카드에 영어 글자가 없고 맞힌 뒤에 표시되는지 확인
  - 실제 엔진 `_judge` 및 `attemptItemById`: 오답 시 보상 미호출·노란 안내 대상 지정, 두 부위 문장 두 개 모두 맞혀야 완료 확인
  - 한 판 완주: 정답마다 서로 다른 번호(`0, 1, 2`)로 `rewardQuizCorrect` 호출, 완주 시 `finalizeQuizRewardSession({ isFullComplete: true, subject: '영어(L8)' })` 호출 확인
- `node --test "tests/**/*.test.mjs"`: `tests 694, pass 691, fail 0, skipped 2, todo 1`.
- `verify_contracts.py --mode git-diff`: `[ALL PASS]`.

## 2. 브라우저 조작 및 화면 확인

- **테스트 서버**: 별도 worktree에서 `scripts/guarded_preview_server.py 8768` 구동.
- **조작 경로**: `english.html`에서 학기 `5-2` 칩, 단원 `8단원` 칩을 차례로 누른 뒤 `⭐ 이번 단원 특별 활동` 카드(`👕 친구 옷 입혀 주기`)를 눌러 진입.
- **진행 확인**:
  - 민수(`currentUser='son'`, `currentUserName='민수'`)로 첫 문제에서 오답 1회 클릭 후 노란 안내 테두리 확인, 끌어다 놓기(`PointerEvent`)와 클릭을 모두 사용해 일반 6문제 + 마지막 판 1문제 완주.
  - 민수 완주 직후 콘솔 출력:
    - `{"c":7,"a":3}`
    - `["PATCH https://minmin-notion.awslike6.workers.dev/v1/pages/374a2711-5b68-8030-aede-d4c2493fe233","PATCH https://minmin-notion.awslike6.workers.dev/v1/pages/374a2711-5b68-8030-aede-d4c2493fe233","PATCH https://minmin-notion.awslike6.workers.dev/v1/pages/374a2711-5b68-8030-aede-d4c2493fe233","PATCH https://minmin-notion.awslike6.workers.dev/v1/pages/374a2711-5b68-8030-aede-d4c2493fe233","POST https://minmin-notion.awslike6.workers.dev/v1/pages"]`
  - 민서(`currentUser='daughter'`, `currentUserName='민서'`)로 분홍색 테마(`theme--slime`)에서 한 판 완주 확인.
  - 모바일 폭 `375×812`에서 `innerWidth: 375, scrollWidth: 375`로 가로 넘침 없음 확인.
- **화면 사진 (`G:/master-tower/scratch/` 보관, 커밋 제외)**:
  1. `lp_v2_1_english_card.png`: 영어방 `5-2`·`8단원` 선택 상태에서 특별 활동 카드가 보이는 화면
  2. `lp_v2_2_first_question.png`: 첫 문제 (인물 + 영어 글자 없는 받침대 카드 4개)
  3. `lp_v2_3_wrong_guide.png`: 오답 클릭 뒤 정답 카드에 노란 안내선이 켜진 화면
  4. `lp_v2_4_two_part_done.png`: 두 부위 문장(`He has short curly hair and green eyes.`) 두 개를 다 맞힌 화면
  5. `lp_v2_5_finale.png`: 마지막 판 「친구를 찾아라!」 후보 3명 화면
  6. `lp_v2_6_completed.png`: 8단원 옷 입히기 완주 카드 화면
  7. `lp_v2_7_mobile_375.png`: 폭 375px 문제 화면
  8. `lp_v2_8_minseo_theme.png`: 민서 테마(`theme--slime`) 문제 화면 (머리 4종 구분 확인)
