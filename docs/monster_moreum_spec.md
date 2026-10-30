# 3호 모름 로스터 등록

작업 폴더: `G:/master-tower/scratch/worktrees/monster-3-moreum`, PR로 제출한다.

- 원작: 민수 「괴수대백과」 `art_minsu_20260922_213854`.
- 기본 로스터 키: `unknown_beast`, 이름: 모름, 번호: 3호, 역할: 수수께끼 괴수.
- `kids/subjects/quest/monster_roster.js`의 기존 선택·프리로드·반응 API를 그대로 사용한다.
- 검은 외눈과 두 뿔, 호기심 많은 물음표 말투. rage는 삐져서 뒤돌아서는 연출이며 격려는 실패를 지적하지 않는다.
- `monster_lab.html`에 선택 칩, 컨트롤러에 회색 계열 역할·점 색을 추가한다.
- 갤러리 등록·메타·원작·노션 콘텐츠 변경은 이번 작업에서 제외한다. 병합 뒤 사용자가 등록한다.

## 원본과 포즈

원본 폴더: `G:/master-tower/kids-school-main/uploads/ex/이미지/`.
복사 대상: `kids/assets/monsters/unknown_beast/` (원본 이미지 변경 없음).

- `이미지_20261030112411.png` → `idle.png`
- `이미지_20261030112411(1).png` → `walk_right.png`
- `이미지_20261030112411(2).png` → `rage.png`
- `이미지_20261030112411(3).png` → `greet.png`, `roar.png` (동일 이미지)
- `이미지_20261030112411(4).png` → `walk_left.png`

후속 갤러리 등록 sprite는 오른쪽을 향한 `walk_right.png`를 사용한다.

## 검증

전체 Node 테스트, 변경 파일 계약 검사, guarded preview 8767에서 선택 칩·6포즈·러너 시작/정답/격려/완주 반응을 확인한다. 상세 결과와 이미지 육안 검수는 `walkthrough.md`에 남긴다.
