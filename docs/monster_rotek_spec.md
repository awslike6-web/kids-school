# 4호 로텤스펲펲 로스터 등록

> 작업자: 안티그래비티. 선례: 3호 모름 [`monster_moreum_spec.md`](monster_moreum_spec.md), 커밋 `02737e2f`·`38fbbb94`. 같은 방식으로 한다.

## 0. 진행 방식
- **코드를 쓰기 전에 바꿀 파일과 줄 수를 먼저 보고하고 승인을 기다린다.**
- worktree `G:/master-tower/scratch/worktrees/monster-4-rotek`, 브랜치 `antigravity/monster-4-rotek`. PR로 제출하고 `main` 병합·푸시는 하지 않는다.
- 커밋 끝에 `Agent: antigravity (gemini-3.8)`.
- 이 PC는 성능이 낮다. **로컬에서 무거운 이미지 처리(rembg 등 누끼 모델)를 돌리지 않는다.** 그림은 이미 준비돼 있다(§2).

## 1. 캐릭터
- 원작: 민수 「괴수대백과」 `art_minsu_20260922_213854`의 맨 왼쪽 괴수. 갤러리 캐릭터로는 key `rotek`으로 이미 등록됨(2026-10-31).
- 로스터 키 `rotek`, 이름 「로텤스펲펲」, 번호 4호.
- 원작 능력: "사람을 늘릴 수 있고, 집을 뒤집을 수 있다." 역할 이름과 대사는 이 설정으로 장난스럽고 신나는 말투로 짓는다(예: 뒤집기, 늘리기). 무섭거나 겁주는 말은 쓰지 않는다. 격려 대사는 실패를 지적하지 않는다(에러리스).
- 연구소 선택 칩과 역할·점 색은 분홍 계열.

## 2. 그림 (준비 완료, 그대로 복사)
원본 폴더: `G:/master-tower/kids-school-main/uploads/ex/이미지/rotek_cutout/roster/` (깃 제외 폴더라 worktree에는 없다. 절대 경로로 복사한다)
복사 대상: `kids/assets/monsters/rotek/`

| 포즈 | 파일 | 그림 |
| :--- | :--- | :--- |
| idle | `idle.png` | 정면 |
| walk_right | `walk_right.png` | 오른쪽을 보고 걷기 |
| walk_left | `walk_left.png` | 왼쪽을 향해 비스듬히 선 모습 |
| greet, roar | `greet.png`, `roar.png` | 손 흔들기 (같은 그림) |
| rage | `rage.png` | 화남 (💢·번개 표시 포함) |

- 투명 PNG, 높이 512px. Claude가 배경 제거 후 다섯 장을 모두 눈으로 확인했다.
- 그림을 다시 만들거나 고치지 않는다. 화면에서 이상해 보이면 고치지 말고 보고한다.

## 3. 바꿀 곳 (모름 커밋과 같은 범위)
- `kids/subjects/quest/monster_roster.js`: `rotek` 항목(포즈 6종, `labDialogues`, `runnerDialogues`). 퀘스트 시작(`stageStart`) 포즈는 기본 `rage`이다. 화난 얼굴로 맞이하는 게 어색하면 모름처럼 `runnerPoses: { stageStart: 'idle' }`를 쓴다.
- `monster_lab.html`: 선택 칩 하나. `monster_lab_controller.js`: 역할·점 색.
- 바뀐 JS의 캐시 쿼리(`?v=`)를 `monster_lab.html`, `quest_runner.html`, `kids/common_space/gallery.html`에서 갱신.
- `kids/core/CORE_CATALOG.md` `monster_roster.js` 절에 4호 한 줄. `tests/gallery-character-runner.test.mjs`에 모름처럼 4호 로스터 시험 추가.
- 상한: `monster_lab.html`은 778줄이라 **800줄을 넘기지 않는다.** 넘을 것 같으면 멈추고 보고한다.
- 손대지 않는 것: 갤러리 데이터·메타, 노션, 런너(`gallery-mini-runner.js`), `quest-runner.js` (Codex가 별 저금통 작업 중).

## 4. 검증
- `node --test "tests/**/*.test.mjs"` 실패 0.
- 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <worktree 절대 경로>` → `[ALL PASS]`.
- `python scripts/guarded_preview_server.py`(포트 8767, 노션 쓰기 차단)로 연구소에서 4호 칩 선택 → 탭 반응 포즈, 퀘스트 러너에서 시작·정답·격려·완주 반응을 확인한다. 스크린샷과 walkthrough는 커밋하지 않는다.

## 5. 완료 보고
바꾼 파일과 줄 수, 커밋 해시, 시험·계약 결과, 화면에서 본 것과 못 본 것, 지은 대사 목록.
