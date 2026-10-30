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
