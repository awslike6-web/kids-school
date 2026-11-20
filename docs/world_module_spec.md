# 🎮 내 친구 월드 명세서 (광장·아레나·비밀 정원·마이룸 인형)

> **문서 버전**: v0.4 (2026-11-20, 사용자 결정 8건·폰 우선 전략 반영)
> **원안**: 제미나이 네온 대화로 만든 「통합 놀이 월드 모듈 설계서」와 시제품 6개(원본은 저장소 밖 `G:\자료\내 컴퓨터\alluploads\`, 저장소에 넣지 않음)
> **검토**: 아르곤·네온 각 2회(설계 빈틈·아이디어 1회, 폰 전략 1회). 반영한 곳에 표시함.
> **상태**: 설계 확정. **P0~P3·P4a·P4b 완료(2026-11-20)**, 다음은 P4c 상점 무기 연결. 로비 🎡 놀이터 → 「🌍 내 친구 월드」(광장) → 포털 → 아레나. 노션 「월드기록」 칸은 사용자가 만들었고 `rich_text`임을 확인함.
> **상위 규칙**: `GEMINI.md` §0(카탈로그 재사용)·§2(로비 인지 부하)·§5(이미지 무결성)·§6(오디오)·§8(골디락스 줄 수·계약 우선·KST 날짜), 관제탑 `../GEMINI.md`
> **연계 문서**: [`gallery_character_runner_spec.md`](gallery_character_runner_spec.md)(갤러리 캐릭터 장착), [`gallery_multi_character_spec.md`](gallery_multi_character_spec.md)(작품당 캐릭터 6개), [`my_room_split_spec.md`](my_room_split_spec.md)(마이룸 분리 계약), [`gallery_archive_spec.md`](gallery_archive_spec.md) §8(캐릭터 등록), `kids/core/CORE_CATALOG.md`

---

## 0. 목표 (사용자 의도, 2026-11-20)

> 시중 게임과 경쟁하려는 것이 아니다. **아이가 직접 그리거나 만들거나 상상한 캐릭터·아이템이 여러 모습으로 살아 움직이고, 어느 정도 원하는 대로 만들 수 있다**는 경험을 주는 것이 목적이다.

판단 기준:
1. **내 것이 주인공**: 갤러리에 등록한 그림이 아레나 선수·보스·무기, 마이룸 인형·가구, 정원·광장 손님이 된다.
2. **있는 것을 잇는다**: 새 재화·새 방·새 저장 체계를 만들지 않는다. 마이룸(하나만 유지)·상점·💎/🍬·갤러리 등록 도구를 그대로 쓴다.
3. **놀이 시간 상한·연료·해금 조건 없음**: 학습과의 연결은 "오늘 공부한 과목이면 조금 더 반짝"하는 읽기 전용 맛보기뿐.
4. **폰이 먼저**: 아이들이 가장 오래 쓰는 기기는 각자의 폰이다. 폰 세로 화면을 기준으로 설계하고 태블릿·PC는 넓혀서 쓴다(§7).
5. **두 아이 모두 전부**: 광장·아레나·정원·마이룸을 두 아이 모두 쓴다. 다른 것은 테마와 난이도 기본값뿐이고, 좋아하는 곳은 아이들이 고른다.

---

## 1. 원안에서 바뀐 점

| 원안 | 이 명세서 | 이유 |
|---|---|---|
| `currentUser`가 `minsu`/`minseo` | **`son`/`daughter`** | 저장소 실제 값 |
| 새 재화 3종(코어·물방울·열쇠), `grantStudyFuel` 다리 | **새 재화 없음.** 상점은 💎(민수)·🍬(민서), 내 그림은 공짜 | 사용자 결정. 다리 함수는 퀘스트 화면에 실리지 않아 지급이 안 되는 구조였음 |
| 민서 마이룸 인형집을 새로 만듦 | **기존 마이룸 확장** | 마이룸은 하나만(사용자 결정) |
| 민수=광장·아레나, 민서=정원·마이룸 | **두 아이 모두 전부**, 테마·난이도 기본값만 다름 | 사용자 결정 |
| PC 키보드·마우스 기준, 태블릿 가상 패드 옵션 | **폰 세로 기준**, 카메라 추적·자동 조준, PC는 입력 어댑터 | 사용자 요청 + 아르곤·네온 공통 추천 + 시제품 폰 측정(§7-1) |
| `scripts/process_character_png.py` 누끼 | **갤러리 캐릭터 등록 입구**(`sync_quick_upload.py --character-*`) | 그 스크립트는 없음 |
| PNG를 `world_data.js`에 손으로 추가 | **등록만 하면 자동으로 나타남** | 갤러리 `characters[]`·`monster_roster.js`를 읽음 |
| 광장 시제품 안에 단순화한 아레나 중복 | 광장은 입구만, 아레나는 한 벌 | 중복 제거 |
| `arena_combat.js` 520줄 하나 | 전투를 3개 파일 + 공용 입력·화면 부품 | 시제품 전투 스크립트가 3,100~3,200줄 |
| 노션 `claimedSourceIds` 200건 | **`월드기록` 한 칸(1,800자 이하)** | 200건은 rich_text 한도 2,000자 초과 |
| 시험 `scripts/test_world_state.mjs` | **`tests/world-*.test.mjs`**(node:test) | 커밋 전 필수 시험·Actions 포함 |
| 계약 검사 `scripts/verify_contracts.py` | 관제탑 **`../scripts/verify_contracts.py`** | 실제 위치 |
| 메인 허브에 진입 버튼 | 로비 **🎡 놀이터 목록**에 한 줄(「🌍 내 친구 월드」) | `GEMINI.md` §2 |

---

## 2. 전체 그림

```
[갤러리 등록]  아이 그림·클레이 → sync_quick_upload.py (--cat "캐릭터" --character-*)
      │            └ 투명 PNG(긴 변 512px), characters[] 메타
      │        (선택) 아이가 📸 찰칵등록으로 직접 올림 → 등록 전까지 「🥚 알」(§8-3)
      ▼
[그림 목록]    world-sprites.js : 갤러리 characters[] + monster_roster 6포즈 + 상점 아이템 그림
      ▼
🌍 광장 (hub) ── 내 친구들이 돌아다니는 첫 화면, 포털로 이동
      ├─▶ ⚔️ 아레나   내 그림 = 선수 / 라이벌 / 보스 / 무기, 응원석
      ├─▶ 🌿 비밀 정원 새로 등록한 친구가 숨어 있다가 → 찾으면 마이룸으로 이사
      └─▶ 🏠 마이룸   (기존 화면) 상점 가구 + 내 그림 인형이 걸어 다니며 가구에 반응
```

| | 민수(`son`) | 민서(`daughter`) |
|---|---|---|
| 테마 | `theme--arcade`(네온) | `theme--slime`(파스텔) |
| 아레나 난이도 기본값 | 보통 | **꼬마 모드**: 보스 느림, 예고선 두껍고 김, 패턴 2종만, 체력 넉넉 |
| 정원 | 같은 놀이, 아케이드 테마(유적·네온 덤불) | 같은 놀이, 파스텔 테마 |
| 글자 | 짧은 글 + 아이콘 | 아이콘 우선 + `speakFairyTTS` 읽어 주기 |

- 난이도는 아이가 시작 화면에서 바꿀 수 있다. 기본값만 다르다.
- **학습 연결(읽기 전용)**: §4-4. 💎/🍬·EXP·학습 시간은 지급·차감하지 않는다. 이 화면들은 `study-activity.js`·`screentime-tracker.js`를 싣지 않는다(가족 보드게임과 같은 원칙).

---

## 3. 갤러리 「🧸 캐릭터 친구들」과 내 친구 설정

### 3-1. 갤러리 분류 추가
- `kids/common_space/gallery-data-sync.js`의 `ART_CATEGORIES`에 `{ key: '캐릭터', label: '캐릭터 친구들', icon: '🧸' }`를 추가한다.
- "작품이라기엔 낙서인데 캐릭터로 쓰고 싶은 그림"도 이 분류로 올리면 된다. 기존 작품에 캐릭터를 붙이는 지금 방식도 그대로 된다.
- 등록 입구: `sync_quick_upload.py --cat "캐릭터" --author 민수 ... --character-key ... --character-sprite ... --character-name ...` (작품당 최대 6개).
- 그림 규격·검수는 갤러리 §8 그대로(EXIF 보정, 투명 픽셀 10% 이상, 사방 여백, 긴 변 512px, **사람이 직접 보고 확인**).

### 3-2. 쓰임은 아이가 화면에서 정한다
- 등록 때 "캐릭터냐 물건이냐"를 나누지 않는다(아르곤 검토 반영). 부모가 매번 판단하지 않고, 아이가 "이거 내 칼로 쓸래" 해도 다시 등록할 필요가 없다.
- 등록된 그림은 무엇이든 선수·보스·무기 겉모습·인형·가구·손님으로 쓸 수 있다.

### 3-3. 그림 목록 읽기 (`world-sprites.js`)
- 갤러리 데이터에서 `MonsterRoster.charactersOf(item)`로 캐릭터를 꺼낸다(판정 중복 금지).
- 작성자 필터: 민수는 `민수`·`공동`, 민서는 `민서`·`공동`. 부모 작품은 제외. 「놀러 오기」(§3-5)를 켜면 상대 아이 것도 포함.
- 고정 몬스터(`monster_roster.js` 6포즈: 콧툰봉돔돌·로텤·모름 등)도 함께 읽는다. `rage`/`roar` 포즈는 보스 2페이즈에 쓴다.
- 그림이 한 장뿐이면 `world-fx.js`가 움직임을 만든다: 숨쉬기, **스쿼시·스트레치**(점프 때 길어지고 착지 때 납작), 발밑 그림자, 걸을 때 좌우 기울기, 맞을 때 흰 번쩍임.
- 512px 그림은 불러올 때 **표시 크기(128~256px) 화면 밖 캔버스로 한 번 줄여 둔다.** 매 프레임 큰 그림을 줄여 그리지 않는다(폰 성능, 아르곤·네온 공통).
- **사라진 그림(유령 방지)**: 저장된 id가 지금 갤러리 목록에 없으면 화면에서 숨기기만 하고 지우지 않는다. 갤러리 목록을 못 불러왔을 때 배치·설정이 날아가지 않게 하기 위해서다(네온 검토).

### 3-4. 내 친구 설정 (아이가 고르는 것, 모두 선택)

| 설정 | 값 | 기본값 | 고르는 곳 |
|---|---|---|---|
| 성격 | ⚡활발 · 💤느긋 · 🎵흥부자 · 🙈수줍 | ⚡활발 | 광장·마이룸·아레나 시작 화면 |
| 단짝 | 다른 내 친구 1명 | 없음 | 마이룸 |
| 가구 행동 | 🛏️자기 · 🍰먹기 · 🦘통통 · 🎵노래 | 🦘통통 | 마이룸에서 가구로 놓을 때 아이콘 원탭 |
| 무기 계열 | 🗡️검 · 🔫라이플 · 💥샷건 | 🗡️검 | 아레나 무기 고르기 |
| 무기 효과 | §4-3의 6종 | 그림 대표색으로 자동 | 아레나 무기 고르기 |
| 오라 색 | 6색 | 그림 대표색 | 어디서나 |

- 성격은 걷는 속도·점프 높이·가구 선호(느긋 → 침대)·말투를 바꾼다. 단짝끼리 만나면 하트 파티클과 함께 나란히 걷는다.
- 민서 화면은 글자 없이 아이콘만, 고르면 음성으로 읽어 준다.

### 3-5. 남매 「놀러 오기」 (기본 꺼짐)
- 「🤝 오빠/동생 친구 초대」를 켜면 상대 아이의 그림도 손님으로 쓸 수 있다. 동생 그림이 오빠 아레나의 보스가 되거나, 오빠 로봇이 동생 마이룸 침대에서 코 골며 잔다.
- 손님은 빌려 쓸 뿐이고, 상대의 설정(§3-4)은 바꾸지 않는다.

### 3-6. 탄생 이야기
- 갤러리 메타의 제목·날짜·분류로 등장 자막과 말풍선을 만든다. 예: 보스 등장 「2026년 9월에 태어난 콧툰봉돔돌!」, 인형을 톡 치면 「나 클레이로 태어났어!」(음성).
- 등록 1년 기념일에는 광장·마이룸에 폭죽. 새로 입력할 것은 없다.

---

## 4. ⚔️ 아레나

### 4-1. 시제품에서 가져올 것

| 원본 | 가져올 것 | 버리거나 바꿀 것 |
|---|---|---|
| `2d_1.html` 타격감 훈련장 | 무기 3계열 타임라인(준비→공격→회복, 검 3연타), 히트스톱·흔들림·탄피·잔상 | 튜닝 패널, 상태 머신 표시 줄 |
| `2d_2_1_1.html` 1:1 라이벌 | 엄폐물 배치, 라이벌 AI(거리 조절·재장전 틈), 에러리스 보호막 | 공방 튜닝 패널. 저스트 회피는 넉넉하게(§4-5) |
| `2d_3.html` 보스 레이드 | 보스 4패턴(돌진·장판·링·내려찍기)과 예고선, 기둥 유인 | 보스전 튜닝 패널 |
| `code_artifact.html` 미니 아레나 | 과목 오버차지 스킬 3종, 결투 시작 화면 | 시간 종료 패배 화면 |

- 튜닝 패널은 아이 화면에 두지 않는다. 필요하면 부모만 `?lab=1`(선택).
- 패배 없음(에러리스): 체력이 바닥나면 긴급 보호막 3초 + 격려. 결과는 "몇 초 만에 이겼나·최고 기록"만.

### 4-2. 시작 화면
- **나**(내 그림 또는 기본 러너), **상대**(라이벌 또는 보스), **무기**, **난이도**를 고른다.
- 보스 목록 = 고정 몬스터 + 내 그림 전부. 내 그림을 보스로 고르면 크기·체력만 보스 규격으로.
- 해금 조건 없음. 새로 등록된 그림에는 「NEW」와 등장 컷.

### 4-3. 무기: 계열 3 × 효과 6
**계열**은 조작감(검 3연타·라이플 연사·샷건 부채꼴), **효과**는 맞았을 때의 느낌이다. 효과는 처음에 한 번만 만들고, 이후 무기가 늘어도 목록에서 고르기만 하면 된다(계속 손이 가지 않게).

| 효과 | 맞았을 때 | 자동 배정(그림 대표색) |
|---|---|---|
| 🔥 불꽃 | 2초 동안 작은 지속 피해, 불씨 파티클 | 빨강·주황 |
| ❄️ 얼음 | 1.5초 느려짐, 얼음 조각 | 파랑·하늘 |
| ⚡ 번개 | 짧은 경직, 지지직 선 | 노랑 |
| 💨 바람 | 넉백 크게, 바람 줄무늬 | 초록 |
| 💥 폭발 | 작은 범위 피해, 둥근 충격파 | 보라·분홍 |
| 🌈 무지개 | 수치 변화 없음, 맞을 때마다 색이 바뀌는 별 파티클 | 그 밖(흰·검정·갈색 등) |

- **균형 규칙**: 효과마다 기본 피해를 조금 깎아 총량을 같게 맞춘다(초당 피해 차이 ±10% 이내, 시험으로 검사). 돈이나 효과 선택으로 강해지지 않는다.
- **상점 무기**: `my-room-core.js` `MARKET_ITEMS.son`의 무기(다이아몬드 검·활·레이저 건·플라즈마 소총·로블록스 검)에 선택 필드 `arena: { class, trait }`를 **한 번** 적는다. 산 무기만 아레나에서 그 그림으로 쓸 수 있다. 민서 상점에 무기가 없으면 기본 무기 + 내 그림 무기로 논다(상점 목록은 바꾸지 않음).
- **갤러리 그림 무기**: 대표색으로 효과를 자동 배정하고, 아이가 바꿀 수 있다. 부모가 판단할 것이 없다.
- 기본 무기 3종(계열당 1개, 효과 🌈)은 항상 공짜.

### 4-4. 오늘 공부한 과목 오버차지 (읽기 전용)
- 오늘(KST) 공부한 과목이 있으면 그 과목 스킬에 반짝임 + 공격력 1.15배.
- 읽는 곳: 학습일지(`study-log-store.js`)의 오늘 기록. 못 읽으면 오버차지 없이 정상 진행.
- `오늘 획득_과목` 노션 칸은 날짜가 바뀌어도 다음 지급 전까지 어제 값이 남아 있으므로 쓰지 않는다.

### 4-5. 폰에서의 전투 규칙 (아르곤·네온 공통 추천)
- **자동 조준**: 공격 버튼을 누르면 가장 가까운 적을 향한다. 트윈스틱(이동+수동 조준) 없음. PC에서는 마우스 조준을 켤 수 있다(어댑터).
- **회피는 넉넉한 무적 대시**: 판정 0.35초 이상. 저스트 회피 슬로우 연출은 남기되, 타이밍 실패에 벌이 없다.
- **화면 밖 공격 알림**: 카메라 밖 보스의 돌진·장판은 내 캐릭터 발밑까지 이어지는 굵은 예고선과 화면 가장자리 경고 표시로 보여 준다.

### 4-6. 응원석
- 전투 중 화면 위쪽 구석에 내 다른 그림 1~2명이 깃발을 흔들며 응원하고, 히트스톱·승리 때 같이 폴짝 뛴다(네온 아이디어). 폰에서는 상단 HUD 줄 안에 작게.

---

## 5. 🌍 광장

### 5-1. 역할
- 「🌍 내 친구 월드」의 첫 화면. **내 그림 친구들이 성격대로 돌아다니는 곳**이자 아레나·정원·마이룸으로 가는 입구다.
- 시제품 `압축형미니광장.html`에서 스크롤 월드·포털·동료 산책을 가져오고, 안에 든 단순화 아레나는 버린다.

### 5-2. 폰 규칙
- 내 캐릭터는 플로팅 조이스틱으로 걷는다. 포털에 닿으면 이동.
- 상시 미니맵 대신 **화면 가장자리 포털 방향 표시**(나침반 아이콘)와 「🗺️ 지도」 토글 버튼.
- 포털 목록은 데이터 배열이다. 나중에 「남매 협동 보물문」 같은 포털을 코드 수정 없이 더할 수 있게 한다(원안의 예약 슬롯 유지).
- 마이룸 포털은 기존 `kids/common_space/my-room.html`로 이동한다(새 마이룸을 만들지 않음).

---

## 6. 🌿 비밀 정원과 🏠 마이룸 인형

### 6-1. 정원: 새 친구가 "태어나는" 곳
- 갤러리에 **새 그림이 등록되면** 먼저 정원 어딘가(덤불·꽃봉오리·별빛 웅덩이)에 숨는다. 찾으면 「새로운 친구 발견!」 연출 뒤 마이룸 서랍과 광장으로 이사한다.
- 이미 찾은 친구도 정원에 놀러 나온다. 숨겨 둘 새 친구가 없으면 계절 꽃·나비 같은 장식만 발견된다(빈 화면 금지).

| 숨는 곳 | 시제품 | 바뀐 점 |
|---|---|---|
| 덤불·구름 | 3번 톡톡 | 그대로 |
| 꽃봉오리 | 💧 물방울을 써서 피움 | 재화가 아닌 **물뿌리개 도구**(무한), 끌어다 놓으면 핀다 |
| 별빛 웅덩이 | 🔑 별열쇠를 써서 엶 | 열쇠는 **정원에서 줍는 것**(덤불에서 가끔). 공부 보상과 무관 |

- 100% 터치·드래그, 키보드 입력 없음. 버튼 최소 64px, 글 대신 그림과 음성.

### 6-2. 마이룸 인형 층 (기존 마이룸 확장)
기존 상점·맵·드래그 배치·노션 동기화(`보유 아이템`·`배치 정보`·`해금 맵`)는 그대로 두고 그 위에 얹는다.
- 서랍에 「🧸 내가 만든 친구」 탭. 갤러리 그림이 모두 뜨고 💎/🍬 없이 배치한다. 놓으면 걸어 다니는 인형이고, 「🪑 가구로 두기」를 누르면 제자리 가구가 되어 행동 태그를 가진다.
- 배치는 기존 `배치 정보`에 그대로, id는 `gal:{artId}#{charKey}`. 인형/가구 구분과 태그는 「내 친구 설정」(§3-4, §8)에 둔다.
- 행동 태그: `sleep`·`eat`·`bounce`·`music`. 상점 가구에는 선택 필드 `tag`를 한 번 적는다. 인형은 걸어 다니다가 가까운 가구의 태그대로 반응하고(자고·먹고·통통·노래), 인형끼리 만나면 짧은 인사(교감).
- 톡 치면 5음계 실로폰 + 짧은 말풍선(5글자 안팎, 음성으로 읽어 줌). 「자유 산책」 끄기 버튼(끄면 지금 마이룸과 같다).
- **폰 드래그**: 끄는 동안 물건을 손가락보다 40px 위에 띄워 보여 주고, 놓을 때 가까운 자리에 살짝 붙는다(자석)(아르곤·네온 공통).
- 폴라로이드 사진첩: 기기 안에만 최근 6장. **IndexedDB**, 가로 480px 이하 JPEG(품질 0.7). `localStorage` 금지(앱 전체가 함께 쓰는 5MB를 채워 학습일지·보상 대기열 저장까지 막힘). 저장 실패 시 사진 찍기는 정상, 안내만.
- 새 모듈 `kids/common_space/my-room-dolls.js`(IIFE, 전역 `MyRoomDolls`). `my-room-main.js`(489줄)·`my-room-core.js`(541줄)에는 연결 몇 줄만. `my_room_split_spec.md` 규칙과 `tests/my-room-split.test.mjs` 유지.

---

## 7. 기기 전략: 폰 세로 기준으로 만들고 넓혀 간다

### 7-1. 왜 폰 기준인가 (시제품 측정 근거, 2026-11-20)
아르곤·네온 모두 "폰 기준으로 구조화하고 태블릿·PC로 확장"을 추천했다. 시제품 6개를 375×812(폰 세로)·812×375(폰 가로)로 띄워 잰 결과도 같은 결론이다.

| 측정 | 결과 |
|---|---|
| 1:1 라이벌, 폰 세로 | 920×580 아레나가 화면 가운데 약 335×210으로 줄어듦(캐릭터가 손톱만 함) |
| 1:1 라이벌, 폰 가로 | 아레나 약 345×210, 상단 HUD가 화면의 1/3, **가상 패드가 사라짐**(넓은 화면을 PC로 판단) |
| 보스 레이드, 폰 가로 | 아레나 790×190으로 납작 |
| 광장, 폰 세로 | 960×600 지도가 125×600으로 **찌그러짐**(비율 깨짐) |
| 글자 | 가장 작은 글자 9~10px, 12px 미만 글자가 화면마다 7~52개 |
| 버튼 | 44px 미만 버튼이 화면마다 3~24개 |
| 캔버스 터치 | 6개 중 5개가 `touch-action: auto`(끌면 화면이 스크롤·확대될 수 있음) |

PC 기준 시제품을 폰에 맞추려면 화면 배치와 조작을 다시 짜야 한다. 반대로 폰 기준으로 만들면 태블릿·PC는 "더 넓게 보기 + 키보드·마우스 연결"만 더하면 된다.

### 7-2. 처음부터 지킬 규칙
1. **세로 기준**: 모든 화면을 세로로 설계한다. 가로로 돌려도 깨지지 않게만 한다(웹에서 방향 고정은 기기마다 안 될 수 있음). 가로에서는 조작 버튼이 좌우 끝으로 간다.
2. **월드와 화면 분리**: 아레나·광장 크기는 "월드 크기"이고, 화면은 카메라가 내 캐릭터를 따라가며 보여 준다. 비율은 절대 늘이거나 찌그러뜨리지 않는다(균일 확대).
   - 보이는 월드 폭(짧은 변 기준): 폰 360, 태블릿·PC 540~640. 넓은 화면은 확대하지 않고 **더 많이 보여 준다**.
3. **조작**: 화면 아래 왼쪽 아무 데나 누르면 생기는 **플로팅 조이스틱**(이동) + 오른쪽 버튼(공격 64px 이상, 회피·무기 바꾸기 56px 이상, 간격 12px 이상). PC는 같은 입력 함수에 키보드·마우스를 연결하는 어댑터.
4. **성능 예산**: DPR 상한 2, 동시 파티클 40개(재사용 풀), 프레임 사이 시간 상한 50ms(느려져도 순간이동하지 않게), 512px 그림은 미리 줄여 두기(§3-3).
5. **글자·HUD**: 본문·버튼 글자 최소 15px(중요 알림 18px 굵게). HUD는 위 한 줄(체력·보스바·나가기)과 아래 조작 구역(화면 아래 약 28%)으로 나누고, 가운데 놀이 영역을 70% 이상 확보한다.
6. **노치·주소창·홈 표시줄**: 높이는 `100dvh`, `viewport-fit=cover`, HUD와 아래 버튼에 `env(safe-area-inset-*)` 여백.
7. **폰 함정 막기**: 놀이 영역에 `touch-action: none`·`user-select: none`·`-webkit-touch-callout: none`·`overscroll-behavior: none`(스크롤·두 손가락 확대·길게 누르기 메뉴·당겨서 새로고침 차단). `visibilitychange`로 탭 전환·화면 꺼짐 때 루프와 소리를 바로 멈춘다.

### 7-3. 검증 순서
각 단계 화면 검증은 **375×812(폰 세로) → 812×375(폰 가로) → 768×1024(태블릿) → 1280×800(PC)** 순서로 한다. 폰 세로에서 끝까지 놀 수 있어야 다음 크기로 넘어간다. 실제 폰 확인은 사용자가 한 번(아이 폰 기종으로).

---

## 8. 파일 구조와 줄 수

```
kids/playground/world/
├── hub.html          (~70)   🌍 광장 (로비 놀이터 목록에서 들어오는 첫 화면)
├── arena.html        (~80)
├── garden.html       (~70)
├── world.css         (~350)  arcade/slime 테마 변수, 안전 영역, 조작 버튼, 공통 HUD
├── core/                     # 공용 부품 (불러올 때 DOM에 손대지 않음)
│   ├── world-view.js   (~300)  window.WorldView    캔버스 크기·DPR·카메라·균일 확대·안전 영역·가시성 멈춤·dt 상한·루프
│   ├── world-input.js  (~350)  window.WorldInput   플로팅 조이스틱·버튼·자동 조준 대상·키보드/마우스 어댑터
│   ├── world-fx.js     (~350)  window.WorldFX      히트스톱·흔들림·파티클 풀·흰 번쩍임·스쿼시·그림자·효과 6종 파티클
│   ├── world-sfx.js    (~200)  window.WorldSFX     Web Audio 합성(타격음·5음계 실로폰), 음소거는 fairy 설정 따름
│   ├── world-sprites.js(~350)  window.WorldSprites 그림 목록·작성자 필터·대표색·미리 줄이기·사라진 그림 숨김
│   └── world-save.js   (~300)  window.WorldSave    기기 저장·짧은 해시·두 기기 합치기·노션 「월드기록」
├── hub.js            (~450)  포털·친구 산책·가장자리 방향 표시·지도 토글
├── arena-weapons.js  (~450)  계열 3 × 효과 6, 투사체, 상점·그림 무기
├── arena-fighter.js  (~550)  선수·라이벌 AI·엄폐물·무적 대시·보호막
├── arena-boss.js     (~500)  보스 4패턴·예고선·화면 밖 경고·2페이즈·꼬마 모드
├── arena-ui.js       (~500)  시작 화면·HUD·응원석·결과·오버차지
└── garden.js         (~550)  숨는 곳·발견 연출·새 친구 대기열·알 부화
kids/common_space/my-room-dolls.js (~500)  §6-2
```

- 모든 파일 600줄 이하 목표, 800줄 미만 절대 상한. IIFE + 전역 하나. 상대 경로만. 외부 게임 엔진·npm 금지(순수 Canvas 2D).
- 시제품마다 같은 함수가 3~6벌 중복돼 있다(`triggerHitStop`·`spawnSparks`·`kickCamera`·`createWhiteSilhouette` 등 20여 개). 이것을 `world-fx.js` 한 벌로 합치는 것이 줄 수를 맞추는 핵심이다.

---

## 9. 저장

### 9-1. 기기 저장 (`localStorage`, 2KB 이하)
키 `kids_world_v1_{son|daughter}`.
```json
{
  "v": 1,
  "arena": { "best": { "rival": 41.2, "boss:rotek": 63.0 }, "loadout": { "me": "k3f9a1", "weapon": "weapon_gun1", "level": "kid" } },
  "seen": ["k3f9a1", "p0x2mz"],
  "found": ["p0x2mz"],
  "cfg": { "k3f9a1": "p=a;b=p0x2mz;t=b;w=r;e=f;c=3", "_t": 1795130000000 },
  "guest": false,
  "keys": 1
}
```
- 그림 id는 `gal:{artId}#{charKey}`를 **6자 짧은 해시**(FNV-1a → 36진수)로 줄인다. 60개가 쌓여도 `seen`이 약 500자(아르곤 검토). 지금 갤러리 목록 안에서 겹치면 7자로 늘린다.
- `seen`에 없는 그림 = 새 친구(정원에 숨기기·아레나 NEW). `found` = 정원에서 찾은 친구. `cfg` = 「내 친구 설정」, `_t` = 마지막으로 바꾼 시각.
- 사진첩·목소리는 IndexedDB(§6-2, §9-4). 인형 배치는 마이룸의 기존 `배치 정보`.

### 9-2. 두 기기 합치기 (폰·태블릿·PC를 번갈아 쓸 때, 네온 검토)

| 항목 | 합치는 법 |
|---|---|
| `seen`, `found` | 합집합(한 번 본·찾은 친구는 다시 숨지 않음) |
| `arena.best` | 기록마다 더 짧은 시간 |
| `cfg` | `_t`가 늦은 쪽 전체 |
| `keys`, `loadout`, `guest` | 노션에 늦게 쓴 쪽 |

- 합친 뒤 바뀌었을 때만 PATCH. 합치기는 순수 함수로 두고 시험한다(두 번 합쳐도 같음, 순서를 바꿔도 같음).

### 9-3. 노션 「월드기록」 (사용자 결정: 만든다)
- `INVENTORY_DB`에 rich_text 칸 **`월드기록`**. **사용자가 노션에서 직접 만든다.** 칸이 없거나 유형이 다르면 기기 저장만 쓰고 PATCH하지 않는다(「런너기록」 선례).
- 1,800자 이하. 넘치면 `arena.best` → 지금 갤러리에 없는 그림의 `cfg` 순으로 버린다. **`seen`·`found`는 버리지 않는다.**
- **이 칸 하나만 PATCH한다.** 마이룸·학습설정 등 다른 칸을 같은 요청에 넣지 않는다.
- 화면 검증은 쓰기 차단 서버(`guarded_preview_server.py`)에서만. 실제 쓰기 시험은 사용자 승인 후 1건. `docs/notion_schemas_school.md` 표에 칸을 추가한다.

### 9-4. 「🥚 알」 — 아이가 직접 올리기 (사용자 결정: 넣는다, P5)
- 로비 하단 📸 찰칵등록(`kids/core/quick-uploader.js`)에 「🧸 내 캐릭터」 칩. 아이가 그림을 찍어 올리면 등록 대기열(노션 갤러리 DB, `구분: 캐릭터`)에 들어간다.
- 놀이 화면은 대기열에서 **아직 등록되지 않은 내 캐릭터 사진**을 읽어 정원·광장에 「🥚 알」로 보여 준다(사진은 알 속 동그란 창에 흐릿하게).
- 부모가 누끼 정리·검수 후 공식 입구로 등록하면 알이 「부화」 연출과 함께 그 친구로 바뀐다.
- 구현 전 확인: 대기열 행의 "처리됨" 표시, 처리된 행과 갤러리 `artId`를 잇는 값. 잇는 값이 없으면 알은 "다음에 들어올 새 친구"로 부화한다.
- 관제탑 `sync_quick_upload.py`가 `구분: 캐릭터`를 처리할 수 있어야 한다(관제탑 쪽 작업, 같은 단계에서 명세).

### 9-5. 내 목소리 입히기 (사용자 결정: 넣는다, P5)
- 그림마다 아이가 직접 녹음한 2~3초 소리(기합·인사·울음소리). 톡 칠 때·필살기 때 재생(아르곤·네온 공통 아이디어).
- `MediaRecorder` 녹음, **그 기기의 IndexedDB에만** 저장. 노션·깃허브·Worker로 보내지 않는다. 그림마다 1개, 총 30개 상한, 오래된 것부터 지움.
- 마이크 권한은 부모가 옆에 있을 때 한 번 허용. 권한이 없거나 거부되면 녹음 버튼만 숨기고 나머지는 정상.
- 기기 간 이동은 하지 않는다(폰에서 녹음한 소리는 그 폰에서만). 이 한계를 화면에 작게 적는다.

---

## 10. 단계

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| **P0 등록 입구** ✅ | `ART_CATEGORIES`에 캐릭터 분류, `--cat "캐릭터"`가 빌더·등록 도구를 통과하는지 | 갤러리 시험 + 관제탑 등록 시험, 임시 구조에서 `--no-push` 등록 1건 — 완료: `tests/gallery-character-category.test.mjs`(3), 관제탑 `test_character_category_survives_registration_and_build`(제목·분류·캐릭터를 함께 등록해 메타·빌드 결과 모두 「캐릭터」·🧸) |
| **P1 공용 부품** ✅ | `core/` 6개 + `world.css` — 완료: 안티그래비티 Hydrogen 초안 7개(병렬), Claude 계약·시험·노션 동기화·검증. `tests/world-core.test.mjs` 23개, 폰 세로·가로·PC 화면 확인 | `tests/world-core.test.mjs`: 그림 목록 합치기(작성자 필터·놀러 오기), 대표색→효과 배정, 짧은 해시·충돌, 새 친구 판정, 두 기기 합치기(멱등·순서 무관), 1,800자 줄이기에서 `seen`·`found` 보존, 사라진 그림 숨김(삭제 아님), 깨진 저장값 복구, 카메라 균일 확대(비율 유지), dt 상한 |
| **P2 아레나** ✅ | 시제품 4개에서 이식, 폰 조작, 계열 3 × 효과 6, 꼬마 모드 — 완료: 엔진 3개(Hydrogen 초안, 시험 실패는 모두 Claude 시험 쪽 실수였음. 계약 빈틈 1곳 수정: 라이벌에게도 보호막이 걸려 이길 수 없던 것) + 그리기·화면 연결·스타일(Hydrogen) + `arena.html`(Claude). `tests/world-arena.test.mjs` 22개, 폰 세로에서 라이벌전·보스전·승리·기록 저장·민서 테마 확인. **미룬 것**: 상점 무기 연결(마이룸 상점 `arena` 필드·보유 목록 읽기)은 P4 마이룸 작업과 함께, 과목별 오버차지는 학습일지에 과목별 오늘 기록 읽기가 생기면(지금은 「오늘 공부함」이면 필살기 게이지 1.5배) | 완료 |
| **P3 광장** ✅ | `hub.html`·`hub.js`, 포털(아레나·마이룸), 친구 산책, 로비 놀이터 목록 한 줄 — 완료: `hub-logic.js`(Hydrogen, 시험 그대로 통과)·`hub.js`·`hub.css`(Hydrogen) + `hub.html`(Claude). 폰 시험에서 고친 것: 조이스틱이 버튼을 가로챔(공용 `world-input.js`), 지도 닫기 클릭이 뒤 친구를 누름, 포털 `enter`(id)를 객체로 잘못 씀(이동 안 됨), 포털을 지나쳐 못 들어감(0.8→0.45초·반지름 88), 같은 캐릭터가 갤러리·몬스터로 둘씩 나옴, 캐시 때문에 고친 파일이 안 실림(스크립트에 `?v=`). `tests/world-hub.test.mjs` 7개 | 완료 |
| **P4 정원 + 마이룸 인형** | `garden.js`, 정원 포털, `my-room-dolls.js`, 서랍 탭, 폰 드래그 | `tests/my-room-split.test.mjs` 유지 + `tests/world-garden.test.mjs`(숨기기·발견·이사), 민서 기준 터치만으로 끝까지 |
| **P5 알·목소리** | §9-4, §9-5, 관제탑 등록 도구 `구분: 캐릭터` | 대기열 읽기 시험(모의 노션), IndexedDB 상한·권한 거부 시험 |

- 매 단계: `node --test "tests/**/*.test.mjs"` 전부 통과, `python -X utf8 ../scripts/verify_contracts.py --mode git-diff` ALL PASS, `CORE_CATALOG.md` 갱신, 따로 브랜치·커밋, 에이전트가 구현하면 커밋 끝에 `Agent:` 줄.
- 광장을 P3에 두는 이유: 광장은 카메라·조이스틱·친구 산책을 아레나와 같은 부품으로 쓴다. 아레나(P2)에서 그 부품이 정상 작동한 뒤에 광장을 얹으면 광장은 포털과 산책만 더하면 된다. 반대로 광장을 먼저 만들면 아직 없는 곳으로 가는 문만 생긴다.
- 시제품 원본은 저장소에 넣지 않는다. 이식할 때 필요한 부분만 옮긴다.

---

## 11. P1 공용 부품 계약 (2026-11-20)

공통 규칙: IIFE + `'use strict'`, 전역은 파일마다 하나(`window.X = Object.freeze({...})`), 불러올 때 DOM에 손대지 않음(시험이 node `vm`에서 `window` 대용 객체로 싣는다), `innerHTML` 금지, `speechSynthesis` 직접 호출 금지, `toISOString` 금지, 상대 경로만. 순수 함수는 DOM·`localStorage` 없이 돈다. 파일 머리에 "초안: 안티그래비티 Hydrogen, 검토: Claude".

### 11-1. `world-save.js` → `window.WorldSave`
| 함수 | 계약 |
|---|---|
| `fnv1a(text)` | UTF-8 바이트 FNV-1a 32비트 부호 없는 정수 |
| `shortId(fullId, len=6)` | `fnv1a(fullId) % 36^6`을 36진수·앞을 `0`으로 채운 6자(32비트 값은 36진수 7자가 될 수 있어 나머지를 씀). `len=7`이면 뒤에 `fnv1a('#'+fullId) % 36`의 36진수 한 자를 붙임(**앞에** 붙여야 독립 해시가 됨. 뒤에 붙이면 원래 해시가 같을 때 결과도 같다) |
| `assignIds(fullIds)` | `Map(full → short)`. 6자가 겹치는 무리는 **모두** 7자(입력 순서와 무관하게 같은 결과) |
| `emptyState()` | `{v:1, at:0, arena:{best:{}, loadout:{}}, seen:[], found:[], cfg:{_t:0}, guest:false, keys:0}` |
| `clean(raw)` | 잘못된 값은 버리고 빈 상태로 채움. id는 `/^[0-9a-z]{6,7}$/`, `seen`·`found`는 중복 없이 정렬, `best` 값은 0 초과 3600 이하 숫자(소수 첫째 자리 반올림), `loadout` 값은 40자 이하 문자열, `cfg` 값은 60자 이하 문자열(키는 id 형식), `keys`는 0~99 정수, `guest`는 불리언, `at`·`cfg._t`는 0 이상 정수 |
| `merge(a, b)` | §9-2 규칙. `seen`·`found` 합집합, `best` 키마다 작은 값, `cfg`는 `_t`가 큰 쪽 전체, `keys`·`loadout`·`guest`는 `at`가 큰 쪽, `at`는 큰 값. 동점은 `JSON.stringify`가 사전순으로 큰 쪽. **교환(a,b=b,a)·멱등(a,a=clean(a))·흡수(merge(merge(a,b),b)=merge(a,b))** |
| `pack(state, liveIds)` | 1,800자 이하 JSON 문자열. 넘치면 `arena.best` 키를 사전순으로 하나씩 버리고, 그래도 넘치면 `liveIds`에 없는 `cfg` 키를 사전순으로 버림. `seen`·`found`는 버리지 않음. 그래도 넘치면 `Error` |
| `parseCfg(text)` / `formatCfg(obj)` | `p=a;b=k3f9a1;t=b;w=r;e=f;c=3;d=f` ↔ 객체. 키 순서 `p b t w e c d`. 허용값: `p` a(활발)·s(느긋)·m(흥부자)·h(수줍), `b` id, `t` s(자기)·e(먹기)·b(통통)·m(노래), `w` b(검)·r(라이플)·s(샷건), `e` f(불꽃)·i(얼음)·l(번개)·w(바람)·x(폭발)·r(무지개), `c` 0~5, `d` d(인형)·f(가구). 모르는 키·값은 버림 |
| `childOf()` / `isParent()` | `localStorage.currentUser`가 `son`·`daughter`면 그 값, 아니면 `null` / `currentUserName`이 아빠·엄마·어른이면 `true` |
| `load(child)` / `save(child, state)` | 키 `kids_world_v1_{child}`. 읽기·쓰기 실패는 삼키고 `clean` 결과·`false` 반환 |
| `update(child, fn)` | 불러온 상태를 `fn(복사본)`에 넘기고 돌려받은 값에 `at=Date.now()`를 넣어 저장, 노션 저장을 1.5초 뒤로 미룸. 부모는 저장만 하고 노션은 건드리지 않음 |
| `pull(child)` / `flush(child)` | 노션 「월드기록」 읽어 합치기 / 합친 값을 그 칸 하나에 PATCH. 「런너기록」(`gallery-runner-rewards.js`)과 같은 방식(Claude 작성) |
| `setSyncHook(fn)` / `setLiveIds(ids)` | `update` 뒤 부를 함수(기본값 `flush`) / `pack`에서 살아 있는 그림 id(기본값 `null` = cfg의 그림 모두 살아 있음) |

### 11-2. `world-sprites.js` → `window.WorldSprites`
| 함수 | 계약 |
|---|---|
| `resolvePath(src, root)` | `./kids/…`·`kids/…`는 `root + 'kids/…'`, `http(s)://`는 그대로, 그 밖은 그대로 |
| `authorsFor(child, guest)` | son `['민수','공동']`, daughter `['민서','공동']`, `guest`면 상대 아이 이름 추가 |
| `collect({items, charactersOf, roster, order, child, guest, root})` | 항목 배열. 갤러리: `{id:'gal:'+artId+'#'+key, kind:'gallery', artId, charKey, name, src, poses:null, author, title, date, category}`(작성자 필터, `id`가 같은 것은 하나만). 몬스터: `order` 순서대로 `{id:'mon:'+몬스터id, kind:'monster', name, src: poses.idle, poses:{…모두 resolvePath}, author:'민수'}`. 갤러리가 먼저, 몬스터가 뒤 |
| `hueTrait(r, g, b)` | 채도 0.25 미만·명도 0.15 미만·0.9 초과면 `r`. 색상각 0~40·330~360 `f`, 40~70 `l`, 70~170 `w`, 170~260 `i`, 260~330 `x` |
| `dominantColor({data, width, height})` | 알파 128 초과·채도 0.25 이상 화소를 색상각 12구간으로 세어 가장 많은 구간의 평균 `{r,g,b}`. 그런 화소가 없으면 불투명 화소 평균, 그것도 없으면 `null` |
| `newFriends(list, seen, idMap)` | `idMap.get(item.id)`가 `seen`에 없는 갤러리 항목(몬스터 제외) |
| `liveOnly(savedShortIds, idMap)` | `idMap` 값에 있는 것만(숨김용, 저장값은 바꾸지 않음) |
| `load(item, size)` | `Promise<{canvas, color, trait} \| null>`. `crossOrigin='anonymous'`, 4초 제한, 긴 변 `size`로 줄인 화면 밖 캔버스, 색을 못 읽으면 `color:null, trait:'r'`. 같은 `src+size`는 캐시 |

### 11-3. `world-view.js` → `window.WorldView`
| 함수 | 계약 |
|---|---|
| `fitView(cssW, cssH)` | 짧은 변 600 미만이면 보이는 짧은 변 360, 이상이면 540. `{scale, viewW, viewH}`, `scale = 짧은 변/보이는 짧은 변`, 가로·세로 같은 배율 |
| `dprFor(ratio)` | 1~2로 자름(잘못된 값은 1) |
| `clampDt(ms)` | 초 단위, 0~0.05 |
| `follow(cam, target, view, world, dt, k=8)` | 카메라를 대상 쪽으로 `1-exp(-k·dt)`만큼 옮긴 새 `{x,y}`(왼쪽 위). 화면이 월드 안에 있게 자르고, 월드가 화면보다 작은 축은 가운데 |
| `toScreen(cam, scale, x, y)` / `toWorld(cam, scale, sx, sy)` | 서로 역함수 |
| `mount(canvas, onResize)` | 크기·DPR 반영, `ctx.setTransform(scale·dpr…)`, 창 크기 바뀌면 다시. `{ctx, get view(), destroy()}` |
| `createLoop({update, render})` | rAF 루프. `visibilitychange`로 숨으면 멈추고 돌아오면 이어 감(첫 프레임 dt 0). `{start, stop, get running}` |

### 11-4. `world-input.js` → `window.WorldInput`
| 함수 | 계약 |
|---|---|
| `stickVector(origin, point, radius=56, dead=0.15)` | `{x, y, mag}`, `mag`는 0~1, 데드존 안이면 0 벡터. 방향은 단위 벡터×mag |
| `keyboardVector(keys)` | `Set`의 `KeyW/A/S/D`·화살표로 단위 벡터(대각선도 길이 1), 없으면 `{x:0,y:0}` |
| `pickTarget(from, targets, maxRange)` | `alive !== false`이고 거리가 `maxRange` 이하인 것 중 가장 가까운 것, 같으면 `id` 사전순, 없으면 `null` |
| `attach(el, {stickZone='left'})` | 왼쪽 절반 아무 데나 누르면 그 자리에 조이스틱(포인터 id별), `[data-action]` 버튼, 키보드(Space 공격·Shift 회피·Q 무기). `{read() → {move:{x,y}, pressed:Set, held:Set}, destroy()}`. `pressed`는 `read` 한 번에 비워짐 |

### 11-5. `world-fx.js` → `window.WorldFX`
| 함수 | 계약 |
|---|---|
| `createFx({max=40})` | `{burst(kind,x,y,n), shake(power,ms), hitstop(ms), flash(ms), step(dt)→실제 dt(히트스톱 중 0), draw(ctx), offset()→{x,y}, get alive}`. 입자는 고정 크기 풀(넘치면 가장 오래된 것 재사용), `kind`: spark·dust·ring·fire·ice·bolt·wind·boom·star |
| `body({t, landedAt, hitAt})` | `{sx, sy, flash}`. 숨쉬기(2초 주기, 진폭 0.03), 착지 0.25초 스쿼시(sx 최대 1.25·sy 최소 0.75, 부피 sx·sy≈1), 맞은 뒤 0.12초 `flash:true` |
| `shadow(ctx, x, y, w)` / `silhouette(canvas)` | 발밑 타원 그림자 / 흰 실루엣 캔버스(캐시) |

### 11-6. `world-sfx.js` → `window.WorldSFX`
`play(name, i)`(hit·slash·shot·shotgun·dash·pop·chime·xylo(i=0~4, 5음계)·levelup), `unlock()`(첫 터치 때 AudioContext 생성·재개), `setMuted(b)`·`isMuted()`(키 `kids_world_sfx`=`off`면 음소거, 기기별). 오디오가 없거나 실패하면 조용히 넘어감.

### 11-7. `world.css`
`theme--arcade`·`theme--slime` 색 변수, `.world-stage`(`100dvh`, 안전 영역, `touch-action:none`, `user-select:none`, `-webkit-touch-callout:none`, `overscroll-behavior:none`), `.world-hud-top`, `.world-controls`(아래 28%), `.world-btn`(56px)·`.world-btn--main`(64px), `.world-stick`, 글자 최소 15px, `prefers-reduced-motion`.

---

## 12. P2 아레나 계약 (2026-11-20)

구성: 계산 엔진 3개(DOM 없음, 시험 대상) → 그리기·화면 연결 2개. 엔진끼리는 서로 부르지 않고 **사건(event) 배열**을 돌려준다. 화면 연결(`arena-ui.js`)이 사건을 받아 피해 적용·연출(`WorldFX`)·소리(`WorldSFX`)로 옮긴다. 난수는 모두 인자 `rng`(0~1 함수)로 받는다(시험에서 시드 고정).

### 12-0. 공통 자료 모양
- 월드 `{w:720, h:1100}`(세로), 벽 두께 24. 엄폐물 `cover = {x, y, w, h}`(왼쪽 위·크기).
- 전투원 `Fighter`: `{id, team:'me'|'foe', x, y, vx, vy, r, hp, maxHp, speed, aim, dashT, dashCd, invulnT, shieldT, hitAt, landedAt, slowT, slowMult, stunT, burnT, burnDps, weapon:{cls, trait, skin}, atk}`.
- 공격 상태 `atk`: `{phase:'idle'|'windup'|'active'|'recovery'|'reload', t, step, comboT, hit:false, shots}`.
- 탄 `Projectile`: `{x, y, vx, vy, r, dmg, kb, trait, team, life}`.
- 보스 `Boss`: `{id, name, x, y, vx, vy, r, hp, maxHp, phase:1|2, state:'idle'|'windup'|'active'|'stunned'|'dead', t, pattern, patternIdx, level:'kid'|'normal', aim, hitAt, data}`.
- 위험 `Hazard`: `{kind:'orb'|'zone'|'ring'|'slam', x, y, r, vx, vy, dmg, kb, armT, life, width}` (`armT > 0`이면 아직 예고 중, 피해 없음).
- 사건: `{type:'hit', target:'me'|'foe'|'boss', dmg, x, y, kb:{x,y}, trait, crit}` · `{type:'swing', step, x, y, aim}` · `{type:'shoot', cls, x, y, aim}` · `{type:'telegraph', pattern}` · `{type:'stun', x, y}` · `{type:'phase2'}` · `{type:'shield'}` · `{type:'dash', x, y}` · `{type:'reload'}` · `{type:'down'}`(라이벌 쓰러짐).

### 12-1. `arena-weapons.js` → `window.ArenaWeapons`
| 이름 | 계약 |
|---|---|
| `WEAPONS` | `blade`(3연타: windup·active·recovery·range·damage·knockback·lunge·arc = 1단 .075·.085·.14·112·24·350·150·1.35, 2단 .065·.085·.145·118·28·400·175·1.4, 3단 .125·.145·.24·146·62·720·230·π(한 바퀴, crit), `comboReset` .68), `rifle`(.014·.022·.082, dmg 14, speed 1220, spread .055, kb 165, 누르고 있으면 연사), `shotgun`(.085·.045·.39, 5발×18, spread .36, speed 1020, kb 260, 반동 320) |
| `TRAITS` | `r` 무지개 ×1.0 · `f` 불꽃 ×0.85 + 2초 화상(맞은 피해의 0.15를 2초에 나눠) · `i` 얼음 ×0.92 + 1.5초 느려짐(0.6배) · `l` 번개 ×0.92 + 0.12초 경직 · `w` 바람 ×0.95 + 넉백 1.8배 · `x` 폭발 ×0.9 + 반지름 70 작은 폭발(연출) |
| `traitTotal(trait)` | 즉시 피해 배수 + 화상 총량 배수(모두 0.9~1.0 사이) |
| `dps(cls, trait)` | 한 주기(블레이드는 3연타 합) 피해 × `traitTotal` ÷ 주기 시간. 샷건은 전탄 명중 기준 |
| `fromShop(item)` / `fromCfg(cfg, colorTrait)` | 상점 항목 `arena:{class, trait}` → `{cls, trait, skin:item.id}`(필드 없으면 `null`) / 내 친구 설정 `w`·`e` → `{cls, trait}`(없으면 `blade`·`colorTrait`) |
| `startAttack(f)` | idle이면 windup 시작(`true`), 블레이드는 recovery 중이면 다음 단 예약, 그 밖은 `false` |
| `stepAttack(f, dt, held, rng)` | 공격 상태 진행. 사건: windup→active 순간 `swing`(블레이드) 또는 `shoot`(총, 탄 생성은 `fire`). 블레이드 `comboReset` 지나면 1단으로. 라이플은 `held`면 recovery 끝에 바로 다음 발. 돌려주는 값 `{events, projectiles}` |
| `fire(f, rng)` | 현재 무기의 탄 배열(샷건 5발은 aim 기준 좌우 대칭 퍼짐 + 작은 난수) |
| `meleeHits(f, targets)` | 블레이드 active 동안 한 번만: 거리 ≤ range + target.r 이고 aim과 각도 차 ≤ arc(3단은 전 방향)인 대상마다 `hit` 사건 |
| `stepProjectiles(list, targets, covers, world, dt)` | 이동·수명·엄폐물·벽 충돌로 제거, 다른 팀 대상과 닿으면 `hit` 사건 후 제거. `{list, events}` |
| `applyTrait(f, trait, dmg)` | 맞은 쪽에 화상·느려짐·경직 적용, 바람이면 넉백 배수 반환 |

### 12-2. `arena-fighter.js` → `window.ArenaFighter`
| 이름 | 계약 |
|---|---|
| `LEVELS` | `kid`(속도 140, 준비 ×1.55, 재장전 1.8초, 재장전 전 2번, 생각 간격 .48, 회피 확률 .08, 체력 160), `normal`(165, ×1.25, 1.5, 2, .3, .24, 230), `ace`(190, ×.96, 1.35, 3, .16, .45, 270) |
| `COVERS` | `pillars4`(기둥 4개 72×72: 중심 (180,330)·(540,330)·(180,770)·(540,770)), `cross`, `open` |
| `create({id, team, x, y, weapon, level})` | me: r 26·체력 160·속도 230, foe: `LEVELS[level]` |
| `move(f, vec, dt, covers, world)` | 느려짐·경직 반영 이동, 엄폐물과 원-사각형 충돌로 밀어냄, 벽 안에 둠, `aim`은 이동 방향(공격 중엔 유지) |
| `dash(f, vec)` | 쿨다운 0.9초, 0.18초 동안 속도 620, 0.35초 무적. 사건 `dash` |
| `damage(f, hit)` | 무적·보호막 중이면 0. (화면 연결은 라이벌이 나에게 주는 피해를 난이도별 꼬마 0.5·보통 0.75·에이스 1배로 줄인다 — 폰 시험에서 시제품 수치가 1초에 체력 70%를 깎음) **내 캐릭터(`team:'me'`)는** 체력이 0 이하가 되면 0으로 두지 않고 최대 체력의 30%로, 보호막 3초(사건 `shield`). 라이벌은 0이 되면 사건 `down`(이길 수 있어야 하므로). 넉백·`hitAt` 적용. 재장전 중인 상대는 피해 ×1.3. 받은 피해 반환 |
| `lineOfSight(a, b, covers)` | 두 중심을 잇는 선분이 엄폐물과 겹치지 않으면 `true` |
| `think(foe, me, covers, dt, rng)` | 라이벌 생각: 무기별 거리(블레이드 90·라이플 300·샷건 160) 유지, 1.2초마다 옆걸음 방향 전환, 시야가 있고 쿨다운이 끝나면 공격, `재장전 전` 횟수만큼 쏘면 `reload`(그동안 공격 안 함, 사건 `reload`), 내 탄이 가까우면 회피 확률만큼 대시. `{move, attack, dash}` |
| `stepStatus(f, dt)` | 대시·무적·보호막·느려짐·경직·화상 시간 감소, 화상 피해(보호막 규칙 그대로) |

### 12-3. `arena-boss.js` → `window.ArenaBoss`
| 이름 | 계약 |
|---|---|
| `create({id, name, level, x, y})` | normal 체력 1800·r 54·걸음 60, kid 체력 1100. 패턴: normal `charge→aoe→ring→slam` 반복, kid `charge→aoe` 반복 |
| `step(boss, me, covers, world, dt, rng)` | `{events, hazards}`(새로 생긴 위험). idle(대기 normal 1.0초·2페이즈 0.7·kid 1.6) → windup(예고: 사건 `telegraph`) → active → idle. 준비 시간 배수: 2페이즈 ×0.85, kid ×1.4 |
| 돌진 | 준비 .96초, 발사 0.35초 전에 방향 잠금(그 전엔 0.35초 늦은 내 위치를 따라감), 속도 680·최대 560. 엄폐물에 부딪히면 `stunned` 1.6초(사건 `stun`), 그동안 받는 피해 ×1.5. 나와 닿으면 `hit` 34·넉백 520(한 번) |
| 장판 | 준비 .52초, 내 근처에 `zone` 4개(2페이즈 3개 + 0.55초 뒤 3개), r 76, `armT` 0.9초 뒤 한 번 터짐 28 |
| 링 | 준비 .82초, `orb` 5발(2페이즈 7발) 부채꼴 1.15(1.55) 속도 280(330) r 10 dmg 26 수명 2.8 + 퍼지는 `ring`(속도 240·2페이즈 290, 두께 18, 최대 520, dmg 30 한 번) |
| 내려찍기 | 준비 .98초, 내 쪽으로 최대 175 이동 후 착지 `slam` 원 r 155(172) dmg 40 넉백 600 |
| `damage(boss, hit)` | 기절 중 ×1.5. 체력 50% 이하가 처음 되면 `phase:2`, 사건 `phase2`. 0이면 `dead`. 받은 피해 반환 |
| `stepHazards(list, me, dt)` | 위험 이동·수명·예고 시간, 무적 아닌 나와 닿으면 `hit`(위험 하나당 한 번). `{list, events}` |
| kid 피해 | 모든 보스 피해 ×0.6 |

### 12-4. 그리기·화면 연결 (2차)
`arena-render.js`(`ArenaRender`: 바닥·벽·엄폐물·전투원·무기·탄·위험 예고선·보스·HUD 아닌 캔버스 전부, 화면 밖 공격 가장자리 경고), `arena-ui.js`(`ArenaUI`: 시작 화면(나·상대·무기·난이도), HUD, 응원석, 결과, 오버차지, 루프·사건 처리), `arena.html`(얇은 래퍼), `arena.css`(시작·결과 화면). 1차 엔진의 실제 공개 함수 목록을 받아 만든다.

---

## 13. P3 광장 계약 (2026-11-20)

`hub.html`(Claude) + `hub-logic.js`(순수 계산, 시험 대상) + `hub.js`(화면) + `hub.css`. 로비 🎡 놀이터 목록 두 아이 모두에 「🌍 내 친구 월드」(→ `kids/playground/world/hub.html`), 아레나 나가기·결과 「나가기」는 광장으로.

### 13-1. `hub-logic.js` → `window.HubLogic` (DOM 없음)
| 이름 | 계약 |
|---|---|
| `WORLD` | `{w:1080, h:1600}` |
| `PORTALS` | `[{id:'arena', name:'아레나', icon:'⚔️', x:540, y:260, r:88, href:'arena.html', ready:true}, {id:'myroom', name:'마이룸', icon:'🏠', x:210, y:1240, r:88, href:'../../common_space/my-room.html', ready:true}, {id:'garden', name:'비밀 정원', icon:'🌿', x:870, y:1240, r:88, href:'garden.html', ready:false}, {id:'coop', name:'남매 보물문', icon:'🎁', x:540, y:1500, r:60, href:null, ready:false, hidden:true}]` — `ready:false`는 「곧 열려요」로 그리고 들어갈 수 없음, `hidden`은 그리지 않음(원안의 예약 슬롯) |
| `portalStep(st, me, portals, dt, need=0.45)` | (폰 시험 뒤 0.8→0.45, 반지름 72→88: 조이스틱을 계속 밀면 0.65초 만에 지나쳐 못 들어갔음) `st={id, t}`. 내가 들어갈 수 있는 포털 원 안에 있으면 같은 포털 시간 누적, 다른 포털·밖이면 `{id:null, t:0}`. `t ≥ need`면 `{id, t, enter:id}`(한 번), 아니면 `enter:null`. 새 객체 반환 |
| `PERSONALITY` | `a` 활발(속도 95, 쉬기 0.3~1.2초, 도착하면 폴짝), `s` 느긋(40, 1.5~4초), `m` 흥부자(70, 0.5~1.5초, 쉬는 동안 춤 = 좌우 흔들기), `h` 수줍(60, 1~2.5초, 나와 180 안이면 나에게서 멀어지는 쪽으로 목표) |
| `createFriend(item, shortId, p, rng, world)` | `{id:item.id, shortId, name:item.name, item, p, x, y, tx, ty, wait, landedAt:-9, hitAt:-9, face:1, bubble:null, bubbleT:0}`, 위치는 가장자리 100 안쪽 무작위, 포털 원과 겹치지 않게(10번까지 다시) |
| `stepFriend(f, me, dt, rng, world, t)` | 기다리는 중이면 `wait` 감소(흥부자는 `face`를 0.3초마다 뒤집음). 아니면 목표로 속도만큼 이동, 도착하면 새 쉬기 시간·새 목표(가장자리 100 안), 활발이면 `landedAt = t`. 수줍이 나와 180 안이면 쉬지 않고 반대쪽 목표. `bubbleT` 감소, 0이면 `bubble=null`. 언제나 월드 안 |
| `hitFriend(friends, x, y, radius=70)` | 그 점에서 가장 가까운 친구(반지름 안), 없으면 `null` |
| `todayLocal(date=new Date())` | 기기 날짜 `YYYY-MM-DD`(지역 시각 getter, `toISOString` 금지) |
| `birthText(item)` | `item.date`가 `YYYY-MM-DD`면 `「{YYYY}년 {M}월에 태어났어!」`, 아니면 `null` |
| `isAnniversary(dateStr, today)` | 월·일이 같고 연도가 더 뒤면 `true` |
| `mapFit(world, w, h, pad=12)` | 미니맵: `{scale, ox, oy}`(균일 축소, 가운데) |

### 13-2. 화면 (`hub.js` → `window.HubUI.boot`)
- 테마·아이 판정은 아레나와 같다. 제목 「🌍 {민수|민서}의 광장」. 나가기 → 로비.
- 나 = 아레나 지난 선택(`arena.loadout.me`)의 그림, 없으면 내 첫 갤러리 캐릭터, 없으면 기본 원. 조이스틱으로 걷는다(아레나와 같은 `WorldInput`), 공격 버튼 없음.
- 친구 = 내 갤러리 캐릭터(나 제외, 최대 12) + 민수는 몬스터. 「놀러 오기」(`state.guest`)를 켜면 상대 아이 캐릭터도. 성격은 `cfg[shortId].p`(없으면 `a`). 새 친구(아직 `seen`에 없음)는 머리 위 ✨.
- 친구를 톡: 말풍선(이름 + `birthText`), `WorldSFX.play('xylo', 성격별 0~3)`, 폴짝, 민서는 `speakFairyTTS`. 아래 판(`#sheet`)에 성격 칩 4개(⚡활발 💤느긋 🎵흥부자 🙈수줍) — 고르면 `cfg[shortId].p` 저장.
- 포털: 빛나는 원 + 아이콘 + 이름, 서 있으면 원 둘레가 0.45초 동안 차오르고 다 차면 `chime`·화면 번쩍 뒤 이동. 「곧 열려요」 포털은 회색·🚧. 화면 밖 포털은 가장자리 화살표.
- 🗺️ 지도 버튼: 덮개(`#map`)에 월드 축소판(포털·나·친구 점) + 「🤝 오빠/동생 친구 초대」 토글(`guest` 저장 후 친구 다시 만들기) + 닫기.
- 생일: 오늘이 등록일 기념일인 친구가 있으면 토스트 「🎂 {이름} 태어난 날이에요!」 + 그 친구 주변 별 폭죽.
- 광장은 `seen`을 바꾸지 않는다(새 친구 「부화」는 P4 정원).

---

## 14. P4a 비밀 정원 계약 (2026-11-20) — 완료

> 결과: `garden-logic.js`·`garden.js`·`garden.css`(Hydrogen) + `garden.html`(Claude). 고친 것: 초안이 `idMap`(Map)을 `map[id]`로 읽어 늘 비던 버그(그대로 두면 정원에 다녀온 뒤 광장에서 갤러리 친구가 모두 사라짐). 광장은 `GardenLogic.visibleIds`로 찾은 친구만 보여 주고 정원 포털을 열었다. `tests/world-garden.test.mjs` 7개, 폰에서 덤불→열쇠→웅덩이, 물뿌리개→꽃봉오리→친구 발견·저장, 민서 파스텔 확인.

`garden.html`(Claude) + `garden-logic.js`(순수 계산, 시험 대상) + `garden.js`(화면) + `garden.css`. 광장의 정원 포털을 연다(`ready:true`).

### 14-1. 「찾은 친구」 규칙 (`state.found`)
- `found`가 **비어 있으면**(정원에 한 번도 안 감) 광장·마이룸은 지금처럼 모든 친구를 보여 준다.
- 정원에 처음 들어가면 기준을 만든다: 갤러리 친구 중 **가장 최근 3명**(`date` 내림차순, 같으면 `id`)을 숨기고 나머지는 모두 `found`에 넣는다(한 번에 저장).
- 그 뒤로는 `found`에 없는 갤러리 친구(= 새로 등록된 친구, 최근 순 최대 8)가 정원에 숨는다. 광장·마이룸은 `found`에 있는 친구만 보여 준다. 몬스터는 늘 보인다.
- 아레나는 이 규칙과 상관없이 모두 보여 준다(`seen` NEW 그대로).

### 14-2. `garden-logic.js` → `window.GardenLogic` (DOM 없음)
| 이름 | 계약 |
|---|---|
| `SPOTS` | 숨는 곳 8개(정규화 좌표 0~1): 덤불 3(`bush`), 꽃봉오리 3(`bud`), 별빛 웅덩이 2(`pool`). 위 HUD(y<0.12)·아래 도구 줄(y>0.86)은 피함 |
| `baseline(items, found, idMap)` | `items`=갤러리 항목. 위 규칙대로 `{toFound:[shortId], hidden:[item.id]}` |
| `visibleIds(items, found, idMap)` | 광장·마이룸에 보일 항목 id 목록(`found` 비면 전부, 아니면 `found`에 있는 갤러리 + 모든 몬스터) |
| `plan(hiddenIds, rng)` | 자리 배열 `[{i, kind, x, y, taps:0, water:0, open:false, content}]`. 숨은 친구를 무작위 자리에 하나씩(최대 8). 나머지: 덤불 30% `{type:'key'}` 아니면 `{type:'deco', deco:'butterfly'}`, 꽃봉오리 `{type:'deco', deco:'flower'}`, 웅덩이 `{type:'deco', deco:'star'}` |
| `tap(spot)` | 열린 자리면 `null`. 덤불: `taps+1`, 3이 되면 열림 → `{open:true, content}`, 아니면 `{shake:true, taps}`. 꽃봉오리 `{need:'water'}`, 웅덩이 `{need:'key'}` |
| `water(spot, amount)` | 꽃봉오리만. `water += amount`, 1 이상이면 열림 `{open:true, content}`, 아니면 `{water}` |
| `unlock(spot, keys)` | 웅덩이만. 열쇠 0이면 `{need:'key'}`, 있으면 열림 `{open:true, content, keys: keys-1}` |
| `nearest(spots, x, y, r=0.09)` | 정규화 좌표에서 반지름 안 가장 가까운 닫힌 자리, 없으면 `null` |

### 14-3. 화면 (`garden.js` → `window.GardenUI.boot`)
- 화면 한 장(스크롤 없음). 자리 좌표 = 정규화 × 보이는 크기. 테마는 아이별(민서 파스텔 꽃밭, 민수 네온 유적 정원).
- 덤불은 톡톡(흔들림·`pop`), 💧 물뿌리개는 아래 도구 줄에서 끌어 꽃봉오리 위에 대면 물이 차오름(물방울 입자), 🔑 열쇠 개수 표시(웅덩이를 톡 하면 하나 씀), 열쇠가 없으면 「덤불을 톡톡 해 봐!」.
- 친구 발견: 가운데 카드(`#found`)에 그림·「✨ 새로운 친구 발견!」·이름·탄생 이야기, 버튼 「🏠 마이룸에 데려가기」(마이룸으로)·「🌿 더 찾기」. `found`에 저장, `levelup`, 민서는 음성.
- 열쇠 발견은 `keys+1` 저장. 장식은 나비·꽃·별 연출만.
- 이미 찾은 친구 최대 4명이 정원을 산책(광장의 `HubLogic.stepFriend` 재사용).
- 숨은 친구가 없으면 장식만 숨어 있고 토스트 「새 친구가 오면 여기 숨어 있을 거야!」.

---

## 15. P4b 마이룸 인형 계약 (2026-11-20) — 완료

> 결과: `my-room-dolls.js`·`my-room-dolls.css`(Hydrogen) + 기존 파일 연결(Claude). 고친 것: 초안이 마이룸 상태를 `window.placedFurniture`로 찾아 「방에 꺼내기」가 안 되던 문제(`let` 전역이라 이름으로 직접 읽어야 함). 폰 크기·부모 검수 모드(기기 저장)에서 꺼내기·걷기·톡 말풍선·사진첩 합성(배경+인형, 교차 출처 문제 없음) 확인. 아이 모드의 노션 저장은 기존 `syncRoomDataToNotion`을 그대로 쓰며 쓰기 차단 서버라 실제 쓰기는 하지 않았다. `tests/world-myroom.test.mjs` 3개, `tests/my-room-split.test.mjs` 스크립트 목록 갱신.

기존 마이룸(`kids/common_space/my-room*`)에 「🧸 내 친구」 탭과 살아 있는 인형 층을 얹는다. 새 파일 `my-room-dolls.js`(Hydrogen)·`my-room-dolls.css`(Hydrogen). 기존 파일 수정(Claude): `my-room.html`(탭 버튼·스크립트), `my-room-main.js`(연결 3줄), `my-room-core.js`(상품 `tag`), `tests/my-room-split.test.mjs`(싣는 스크립트 목록).

### 15-1. 기존 마이룸과 맞물리는 곳 (전역 클래식 스크립트)
- 읽고 고쳐도 되는 전역: `placedFurniture`(배치 배열, 항목 `{id, x, y, rotation, flipX}` px), `currentProfile`('son'|'daughter'), `syncRoomDataToNotion()`(Promise, 노션 저장), `isAdminUser()`·`saveAdminRoomStateToLocal()`(부모는 기기 저장), `renderRoomFurniture()`, `renderDock()`, `dragStart`(기존 끌기 시작 함수: `.furniture-item` 요소의 mousedown/touchstart에 걸면 위치 끌기·저장까지 기존 코드가 함), `rotatePlacedItem(id)`·`flipPlacedItem(id)`, `setSelectedFurniture(id)`, `getCatalogItems(profile)`(상품 목록, 항목에 선택 필드 `tag`), `getItemAssetUrl(item)`.
- **주의**: 위 상태 변수(`placedFurniture`·`currentProfile`·`isDragging`·`activeDragElement`)는 `let` 전역이라 `window.…`로는 보이지 않는다. 이름으로 직접(`typeof placedFurniture !== 'undefined'`) 읽는다. 함수는 `window`에 있다.
- 인형 배치 id는 `gal:{artId}#{charKey}`. 기존 `renderRoomFurniture`는 상품 목록에 없는 id를 그리지 않고 건너뛰므로, 인형은 이 모듈이 같은 방(`#my-room`)에 `.furniture-item.doll-item`(id `furn_{배치 id}`)으로 그린다. 기존 정규화는 모르는 id도 보존한다.
- 연결: `switchTab`이 `#tab-friends-btn`도 켜고 끄며, `renderDock`은 `currentTab === 'friends'`면 `MyRoomDolls.renderDock(dock)`, `renderRoomFurniture` 끝에서 `MyRoomDolls.renderRoom(room)`.

### 15-2. `my-room-dolls.js` → `window.MyRoomDolls`
| 이름 | 계약 |
|---|---|
| `TAGS` | `{sleep:'💤', eat:'😋', bounce:'🦘', music:'🎵'}`, 설정 글자 `s e b m` ↔ 이름 |
| `galId(artId, key)` / `parseGalId(id)` | `'gal:'+artId+'#'+key` / `{artId, key}` 또는 `null` |
| `nearTag(doll, furn, r=90)` | 인형 중심과 가구 중심(`x+44, y+44`) 거리 ≤ r인 태그 가구 중 가장 가까운 것의 태그, 없으면 `null` |
| `trimAlbum(list, max=6)` | `{at}` 내림차순 앞 `max`개 |
| `renderDock(dock)` | 내 갤러리 친구 카드(기존 `.item-card` 모양, 그림·이름·「방에 꺼내기」/「방에 있음」). 친구 목록 = `WorldSprites.collect`(갤러리만, `currentProfile`) 중 `GardenLogic.visibleIds`(찾은 친구). 정원에 숨은 친구가 있으면 맨 끝에 「🌿 정원에 숨은 친구 N명」 카드(정원으로 가는 링크). 꺼내기 = `placedFurniture`에 `{id: gal:…, x, y(방 안 무작위), rotation:0, flipX:false}` 추가 → 저장 → `renderRoomFurniture()`·`renderDock()`. 친구가 없으면 「갤러리에 캐릭터를 등록하면 여기 나와요!」 |
| `renderRoom(room)` | `gal:` 배치마다 인형 요소(그림 `crossOrigin='anonymous'`), 기존 `dragStart`로 끌기, 선택 시 조작 버튼 ↻ ↔ 🪑(인형↔가구) 🏷️(가구일 때 태그 돌리기). 방 오른쪽 위에 「🚶 산책」 켜고 끄기·「📸」 버튼. 걷기 루프는 한 번만 시작 |
| 걷기 | 인형 모드(`cfg.d !== 'f'`)는 방 안을 천천히 걸음(성격 `cfg.p` 속도: 활발 40·느긋 15·흥부자 28·수줍 22 px/초, 쉬기 1~3초). 끄는 중인 요소는 건너뜀. 걸음은 `style.left/top`만 바꾸고 저장하지 않음(끌어서 놓을 때만 기존 코드가 저장). 산책 끄기는 기기 저장 `myroom_doll_roam_{profile}` |
| 반응 | 태그 가구 근처(`nearTag`)에 오면 3초 멈추고 머리 위 이모지(💤😋🦘🎵), 통통이면 폴짝. 인형끼리 60px 안이면 「안녕!」+💕(같은 쌍 10초에 한 번). 톡(끌지 않은 클릭) → 이름·탄생 이야기 말풍선, 5음계 실로폰, 민서는 음성 |
| 가구 모드 | `cfg.d === 'f'`면 서 있고 태그(`cfg.t`, 기본 통통)를 가진 가구로 취급(다른 인형이 반응) |
| 사진첩 | 📸 → 방을 캔버스로 합성(방 배경 그림 cover + 모든 `.furniture-item` 그림을 화면 위치대로) → 가로 480px 이하 JPEG 0.7 → IndexedDB(`kids_world_album`, 아이별) 최근 6장 → 사진첩 창(썸네일·내려받기·닫기). 저장 실패면 「이 기기에는 저장할 수 없어요」 |
| 설정 저장 | 인형/가구·태그는 `WorldSave.update(currentProfile, …)`로 `cfg[shortId]`의 `d`·`t` |

### 15-3. 상품 `tag` (my-room-core.js `MARKET_ITEMS`)
민수: 네모 빨간 침대 `sleep`, 휴대 라디오 `music`, 호버보드 `bounce`. 민서: 과일 5종·하리보 `eat`, 슬라임 `bounce`.

---

## 16. 하지 않는 것

- 새 재화, 연료, 놀이 시간 상한, 해금 조건.
- 💎/🍬·EXP·학습 시간 지급 또는 차감.
- `quest-mastery.js`, 퀘스트 채점·보상 코드, `reward-grant.js` 수정.
- 놀이 화면에서 PNG를 직접 올리는 기능(시제품의 업로드 버튼). 등록은 갤러리 입구와 찰칵등록(알)으로만.
- 아이 목소리를 기기 밖으로 보내는 것.
- 브라우저 `speechSynthesis` 직접 호출(`fairy-tts.js` 경유).
