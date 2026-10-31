# 💖 미니 런 캐릭터 친밀도 명세서 (Runner Friendship Spec)

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 코드 구현 완료 · Python 실행·Git 인덱스 권한 제한으로 전체 검증·커밋 보류
> **선행**: [`docs/gallery_runner_star_bank_spec.md`](gallery_runner_star_bank_spec.md) (별 저금통, 구현 완료 `34ad1216`). 같은 저장·동기화 규칙을 그대로 따른다.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`(`gallery-runner-rewards.js`·`monster_roster.js` 절), 위 선행 명세를 먼저 읽는다.

---

## 0. 진행 방식
- **먼저 계획(바꿀 파일·예상 줄 수·이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더는 이미 만들어져 있다: `G:/master-tower/scratch/worktrees/runner-friendship`, 브랜치 `codex/runner-friendship`. 이 폴더 밖의 파일을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- **운영 노션에 쓰지 않는다.** 노션은 시험에서 모의(fetch mock)로만 확인한다.
- 커밋 끝에 `Agent: codex (모델명)`. `walkthrough.md`·스크린샷은 커밋하지 않는다.
- **완료 보고 규칙**: 시험·계약 검사는 실행한 명령과 출력 마지막 10줄을 원문 그대로 붙인다. 새로 넣은 대사는 요약하지 말고 코드에서 그대로 복사한다. 커밋 해시와 `git diff --stat main...HEAD`를 붙인다.

---

## 1. A (목표)
같은 캐릭터로 많이 달릴수록 **친밀도**가 오르고, 그 캐릭터를 파트너로 장착했을 때 5분 퀘스트·연구소에서 **친해진 만큼 새 대사**가 나온다. 아이 그림 캐릭터에 대한 애착을 키우는 것이 목적이다.

- 별과 마찬가지로 보석·사탕·경험치와 연결하지 않는다.
- 새 그림 파일은 없다(갤러리 캐릭터는 그림이 한 장뿐).

## 2. 도입 전 구조 (2026-10-31 확인)
- 별 저금통: `kids/common_space/gallery-runner-rewards.js`(323줄, 전역 `GalleryRunnerRewards`). 로컬 키 `galleryRunnerBank_{son|daughter}`, 노션 INVENTORY_DB 「런너기록」(rich_text) JSON `{v,total,loadout,boostDate,updatedAt}`. 동기화 불변식: 노션 값을 새로 읽고 **이 기기의 `pending`만 더한다.**
- 런너 완주: `gallery-mini-runner.js` `finish()`가 아이 보기일 때 `addStars(child, score)`.
- 파트너: `monster_roster.js`의 `getGalleryPartner(child)` → `{artId, charKey, name, spriteUrl}`. 민수는 `refreshGalleryMonster()`가 로스터 항목 `gallery_partner`(대사 `labDialogues`·`runnerDialogues`)를 만든다. 민서는 `monster_lab_controller.js` 312행·`quest-runner.js` 89행에서 이름·그림만 쓴다.
- `monster_lab.html`(778줄)은 `gallery-runner-rewards.js`를 로드하지 않는다. `quest_runner.html`·`gallery.html`은 로드한다.

## 3. S (범위)
| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| `kids/common_space/gallery-runner-rewards.js` | 친밀도 저장·동기화·레벨 계산 | 전체 500줄 이하 |
| `kids/common_space/gallery-mini-runner.js` | 완주 시 `addRun`, 완주 화면 레벨 업 안내, 작품 창 친밀도 줄 | 전체 520줄 이하 |
| `kids/subjects/quest/monster_roster.js` | `refreshGalleryMonster`에 레벨별 대사, 배지 | 추가 40줄 이내 |
| `kids/subjects/quest/monster_lab_controller.js`, `kids/subjects/quest/quest-runner.js` | 민서 파트너 이름 옆 💖 레벨 | 각 추가 8줄 이내 |
| `monster_lab.html` | `gallery-runner-rewards.js` 로드 1줄, 캐시 쿼리 | 800줄 미만 유지 |
| `gallery.html`, `quest_runner.html` | 캐시 쿼리 | |
| `tests/gallery-runner-rewards.test.mjs` 등 | §7 시험 | |
| `kids/core/CORE_CATALOG.md`, 이 문서 | §8 | |

손대지 않는 것: 보석·사탕·학습일지, 「학습설정」, Worker, 갤러리 데이터·메타, 다른 과목.

## 4. D (데이터)

### 4-1. 친밀도 키와 단계
- 캐릭터 키: `{artId}#{charKey}` (예: `art_minsu_20260922_213854#rotek`). 형식 검사 `^art_[a-z0-9_]{1,80}#[a-z0-9_-]{1,32}$`. 아니면 무시.
- 아이별로 따로 센다(민수의 로텤스펲펲과 민서의 로텤스펲펲은 다른 기록).
- 완주 1판 = 1회. 중간에 닫은 판은 세지 않는다. 부모 보기는 세지 않는다.

| 레벨 | 누적 완주 | 이름 |
| ---: | ---: | :--- |
| 1 | 0 | 처음 만남 |
| 2 | 3 | 친구 |
| 3 | 8 | 단짝 |
| 4 | 15 | 절친 |
| 5 | 25 | 영혼의 단짝 |

### 4-2. 저장 (별 저금통 JSON에 함께)
- 로컬 저금통에 `friends: { key: runs }`, `friendsPending: { key: runs }`를 더한다.
- 노션 「런너기록」 JSON에는 `friends`만 넣는다(`friendsPending`은 넣지 않음).
- **동기화는 별과 같은 불변식**: flush 때 노션 `friends[key] + friendsPending[key]`로 저장하고, 성공하면 보낸 만큼만 pending에서 뺀다. pull 때 로컬 `friends[key] = 노션 friends[key] + friendsPending[key]`.
- **노션 rich_text 한 칸은 2000자 제한이다.** PATCH 전에 JSON 길이를 재고, 1900자를 넘으면 `friends`에서 **완주 수가 가장 적은 항목부터** 빼서 맞춘다(pending이 남은 항목은 빼지 않음). 시험으로 확인한다.
- 숫자는 0 이상 안전 정수만 받는다. 잘못된 값은 0으로 읽는다. 기존 `{v:1,...}` 데이터(`friends` 없음)는 빈 친밀도로 읽는다.

### 4-3. API (`GalleryRunnerRewards`에 추가)
| 이름 | 설명 |
| :--- | :--- |
| `addRun(child, key)` | 로컬 `friends`·`friendsPending` +1 저장 후 flush. 부모·잘못된 키면 `false` |
| `friendshipOf(child, key)` | `{runs, level, name, next: {level, remaining} \| null}` |
| `FRIEND_LEVELS` | §4-1 표 상수 |

- 런너 `finish()`에서 `addStars`와 함께 `addRun`을 부른다. flush는 한 번으로 묶는다(두 번 PATCH하지 않음).

## 5. 화면

### 5-1. 갤러리 작품 창 (캐릭터 고르기 아래)
`💖 친밀도 Lv3 단짝 · 다음 단계까지 7판` (최고 레벨이면 `💖 친밀도 Lv5 영혼의 단짝`). 아이 보기에서만. 부모 보기는 표시하지 않는다.

### 5-2. 런너 완주 화면
레벨이 오른 판이면 별 저금통 줄 아래에 `💖 {이름}{과/와} 더 친해졌어요! Lv3 단짝`. 완주 TTS 문장 끝에도 같은 말을 덧붙인다(`say()` 한 번). 조사는 `MonsterRoster.withJosa`.

### 5-3. 민수 연구소·5분 퀘스트 (`refreshGalleryMonster`)
- `badgeText`: `자작: {이름} 💖Lv{n}`.
- 레벨에 따라 대사를 **더한다**(기존 대사는 그대로 두고 배열에 추가):

| 레벨 | `labDialogues.walk`에 추가 | `runnerDialogues.correct`에 추가 |
| :--- | :--- | :--- |
| 2+ | `우리 벌써 {runs}번이나 같이 달렸어!` | `역시 내 친구! 멋져! 💖` |
| 3+ | `단짝이랑 공부하니까 더 신나! ✨` | `단짝 파워! 정답이야! 🎉` |
| 4+ | `너랑 있으면 어떤 문제도 안 무서워!` | `절친답게 척척 풀었네! 🌟` |
| 5 | `영혼의 단짝! 오늘도 함께 출발! 🚀` | `영혼의 단짝 콤비, 최고야! 👑` |

- `{runs}`는 실제 누적 완주 수. 격려(`encourage`) 대사는 바꾸지 않는다(에러리스 유지).
- `refreshGalleryMonster`는 `window.GalleryRunnerRewards`가 없으면 지금처럼 동작한다(레벨 1 취급).

### 5-4. 민서 파트너 이름 (연구소·5분 퀘스트)
갤러리 파트너 이름 표시를 `{이름} 💖Lv{n}`으로. 레벨 1이면 `💖` 없이 이름만.

## 6. 성능·안전
- 친밀도 계산은 로컬 저금통만 읽는다. 연구소·퀘스트 화면에서 노션을 기다리지 않는다.
- 연구소(`monster_lab.html`)에서는 로드만 하고 pull·flush를 부르지 않는다.

## 7. T (시험)
1. 레벨 경계: 0/2/3/7/8/14/15/24/25/100판.
2. `addRun`: 로컬 friends·pending 증가, 부모·잘못된 키 거부, flush 1회.
3. 두 기기 시험: 노션 friends `{A:5}`, 태블릿 A +2·폰 A +1 → 노션 A 8. 둘 다 저장 실패 후 차례로 저장해도 8(별 시험과 같은 방식).
4. 완주 1판에 `addStars`+`addRun`이 PATCH 1회로 함께 저장.
5. 2000자 제한: 항목 60개로 길이 초과 → 1900자 이하로 줄고, 가장 적게 달린 항목부터 빠지며 pending 항목은 남는다.
6. 옛 데이터(`friends` 없음)·깨진 값 → 빈 친밀도, 예외 없음.
7. `refreshGalleryMonster`: 레벨 1/3/5에서 대사 개수와 `{runs}` 치환, 모듈이 없을 때 기존과 동일.
8. 기존 시험 전부 통과: `node --test "tests/**/*.test.mjs"`.
9. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]`.

## 8. 문서 갱신
- `CORE_CATALOG.md`의 `gallery-runner-rewards.js` 절에 친밀도 API·저장·2000자 규칙, `monster_roster.js` 절에 레벨 대사 한 줄.
- 이 문서 상태를 "구현 완료"로 바꾸고 실제 줄 수를 적는다.

## 9. 구현·검증 현황 (2026-10-31)

- 승인한 작업 폴더·브랜치에서 구현했다. 친밀도는 별과 같은 pending 합산·스냅샷 차감 경로로 저장하며 정상 완주 한 판의 PATCH는 한 번이다. 전송 중 새 적립은 다음 요청으로 보존한다.
- 전체 JSON 1900자 초과 시 pending 없는 기록부터 완주 수·키 순으로 제거한다. pending만으로 초과하면 PATCH를 보류하고 로컬 원문을 보존한다(사용자 승인 보완).
- 실제 줄 수: `gallery-runner-rewards.js` 377, `gallery-mini-runner.js` 473, `monster_roster.js` 462, `monster_lab_controller.js` 747, `quest-runner.js` 696, `monster_lab.html` 781, `gallery.html` 306, `quest_runner.html` 609.
- 시험 파일은 `gallery-runner-rewards.test.mjs` 595줄, `gallery-character-runner.test.mjs` 582줄이다. 로스터는 추가 대사가 실제 탭으로 선택되도록 갤러리 파트너의 walk 배열을 탭 주기 전체에 걸쳐 순환한다. 격려·기존 캐릭터 탭 규칙은 유지했다.
- §7-1~7의 친밀도·연결 집중 시험 20건 통과. 전체 회귀는 141건 중 통과 137·실패 2·기존 skip 1·TODO 1이다. 실패 두 건은 기존 Python 빌더 시험이며 실행 파일이 `EPERM`으로 차단됐다. 실패를 skip으로 바꾸지 않았다.
- §7-9 계약 검사는 Python 실행 시 액세스 거부로 시작하지 못했다. `[ALL PASS]`가 아니다. `git diff --check`는 통과했다.
- 화면 육안·모바일 스크롤·TTS 실제 재생·폰 60초 플레이는 확인하지 못했다. DOM 모의는 화면 확인을 대체하지 않는다. 운영 노션 요청·노션 개발 기록·main 병합·푸시는 하지 않았다.
- 커밋 전 필수 전체 시험·계약 검사가 충족되지 않았다. 구현 파일만 `git add`했으나 공유 Git 메타데이터의 `index.lock` 생성도 권한 거부돼 스테이징·커밋하지 못했다. 명령·원문 출력·차단 원인은 미커밋 `walkthrough.md`에 기록한다.
