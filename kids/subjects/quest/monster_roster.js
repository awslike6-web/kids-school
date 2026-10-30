/**
 * 👾 5분 퀘스트 파트너 몬스터 로스터 & 포즈/대사 엔진 (Monster Roster SSOT)
 * - 1호: 뿌쀳히탈탈 (민수 「괴수대백과」 괴수, 투명 배경 3D)
 * - 2호: 콧툰봉돔돌 (민수 자작 SCP-봉제괴수 · 실사 배경 + 6종 포즈 인터랙션)
 * - 3호: 모름 (민수 「괴수대백과」 외눈 수수께끼 괴수)
 * - localStorage('selectedMonster') 연동 및 포즈 이미지 즉시 프리로드(Preload) 지원
 */
(() => {
    const STORAGE_KEY = 'selectedMonster';
    const DEFAULT_MONSTER_ID = 'clay_bite';

    const MONSTER_ROSTER = {
        clay_bite: {
            id: 'clay_bite',
            number: '1호',
            name: '뿌쀳히탈탈',
            role: '수호 비스트',
            code: 'UNIT-01 // NEON BEAST',
            badgeText: '1호: 뿌쀳히탈탈',
            hasBackground: false,
            poses: {
                idle: './kids/assets/images/monsters/purple_monster.png',
                greet: './kids/assets/images/monsters/purple_monster.png',
                walk_left: './kids/assets/images/monsters/purple_monster.png',
                walk_right: './kids/assets/images/monsters/purple_monster.png',
                rage: './kids/assets/images/monsters/purple_monster.png',
                roar: './kids/assets/images/monsters/purple_monster.png'
            },
            labDialogues: {
                idle: '오늘도 나랑 같이 5분 퀘스트 달릴 준비 됐어? ⚡',
                greet: '반가워! 오늘도 에너지가 넘치는데? 🔮',
                walk: [
                    '크르릉! 간지러워~ 어서 과목 고르고 출격하자! 🚀',
                    '보라색 번개 파워 충전 완료! 보석 사냥 가자! 💎',
                    '3·3·3 마스터리 금메달, 오늘도 문제없어! 👑'
                ],
                rage: '크아앙! 에너지가 과열됐어! 지금 바로 출격하자!! 🔥',
                roar: '전투 준비 완료! 5분 퀘스트로 돌격!! 🚀'
            },
            runnerDialogues: {
                stageStart: '이번 문제들은 내가 번개 파워로 함께 풀어줄게! ⚡',
                correct: [
                    '정답이야! 역시 최고야! 하이파이브! 🙌✨',
                    '완벽해! 숙련도 게이지가 쑥쑥 오르고 있어! 🔥',
                    '대단한걸? 이 기세로 메달까지 직진하자! 💎'
                ],
                encourage: [
                    '괜찮아! 힌트를 보고 찬찬히 다시 골라보자! 💡',
                    '아깝다! 한 번 더 생각해보면 바로 맞힐 수 있어! 🌱',
                    '실수해도 괜찮아! 끝까지 해보는 게 진짜 실력이야! 💪'
                ],
                clear: '우와아!! 5분 퀘스트 완벽 클리어!! 최고야!! 🏆🎉'
            }
        },
        cottun_bongdomdol: {
            id: 'cottun_bongdomdol',
            number: '2호',
            name: '콧툰봉돔돌',
            role: 'SCP-봉제괴수',
            code: 'UNIT-02 // BONGDOMDOL',
            badgeText: '2호: 콧툰봉돔돌 (SCP-봉제괴수)',
            hasBackground: false,
            poses: {
                idle: './kids/assets/monsters/cottun_bongdomdol/idle.png',
                greet: './kids/assets/monsters/cottun_bongdomdol/greet.png',
                walk_left: './kids/assets/monsters/cottun_bongdomdol/walk_left.png',
                walk_right: './kids/assets/monsters/cottun_bongdomdol/walk_right.png',
                rage: './kids/assets/monsters/cottun_bongdomdol/rage.png',
                roar: './kids/assets/monsters/cottun_bongdomdol/roar.png'
            },
            labDialogues: {
                idle: '초록·빨강 단추 눈 이상 무! 용수철 펀치 대기 중! 🧸🔩',
                greet: '민수 요원 반가워! 용수철 펀치 준비 완료! 🧸⚡',
                walk: [
                    '간지러워 크하핫! 출격하자! 🐾',
                    '끼리릭 철컥! 용수철 팔다리 워밍업 완료! 🔩',
                    '어느 과목부터 정복할까? 단추 눈 레이더 가동! 👀'
                ],
                rage: '크아앙! 누가 내 단추 눈을 자꾸 건드리는 거야! 🔥',
                roar: '크아아앙!! 봉제괴수 출격!! 문제를 다 날려버리자!! 🔥🧸'
            },
            runnerDialogues: {
                stageStart: '이번 문제들은 내가 용수철 주먹으로 다 날려버릴게! 🔥',
                correct: [
                    '역시 민수 요원! 용수철 하이파이브! 🧸⚡',
                    '명중이다 크하핫! 단추 눈이 반짝반짝 빛나고 있어! ✨',
                    '완벽한 타격! 이 기세로 금메달까지 뚫어버리자! 🔩🔥'
                ],
                encourage: [
                    '괜찮아 민수야! 단추 눈 크게 뜨고 다시 골라보자! 💡',
                    '절대 기죽지 마! 내 용수철 방패가 지켜줄게, 다시 도전! 🛡️',
                    '힌트 레이더 포착! 천천히 읽고 한 번 더 눌러보자! 🧸💪'
                ],
                clear: '크아아앙!! 승리 포효!! 오늘 퀘스트 완벽 정복이다!! 🔥🏆'
            }
        },
        unknown_beast: {
            id: 'unknown_beast',
            number: '3호',
            name: '모름',
            role: '수수께끼 괴수',
            code: 'UNIT-03 // UNKNOWN BEAST',
            badgeText: '3호: 모름',
            hasBackground: false,
            poses: {
                idle: './kids/assets/monsters/unknown_beast/idle.png',
                greet: './kids/assets/monsters/unknown_beast/greet.png',
                walk_left: './kids/assets/monsters/unknown_beast/walk_left.png',
                walk_right: './kids/assets/monsters/unknown_beast/walk_right.png',
                rage: './kids/assets/monsters/unknown_beast/rage.png',
                roar: './kids/assets/monsters/unknown_beast/roar.png'
            },
            // rage 그림이 뒷모습이라 퀘스트 시작은 앞을 보는 기본 포즈로 맞이한다.
            runnerPoses: { stageStart: 'idle' },
            labDialogues: {
                idle: '내 이름은 모름! 오늘은 어떤 수수께끼를 만나볼까? 👁️',
                greet: '안녕? 커다란 눈으로 네가 오기를 기다렸어! 👋',
                walk: [
                    '왼쪽에 단서가 있나? 살금살금 찾아볼까? 👣',
                    '오른쪽에도 궁금한 게 한가득인데? 👁️',
                    '모르는 걸 하나씩 알아가는 탐험, 같이 갈래? 🔎'
                ],
                rage: '흥, 잠깐 뒤돌아 있을래? 그래도 네가 부르면 돌아볼 거야! 🌙',
                roar: '손 번쩍! 나도 함께 탐험해도 될까? 🙌'
            },
            runnerDialogues: {
                stageStart: '등 뒤에 숨겨 둔 호기심을 꺼내볼까? 오늘도 함께 탐험하자! 🔎',
                correct: [
                    '오? 수수께끼 하나가 풀렸는데? 눈이 번쩍! 👁️✨',
                    '네 생각을 따라가니 새로운 단서가 보이는데? 🔎',
                    '궁금했던 게 하나 더 밝혀졌어! 다음도 함께 볼까? 🌟'
                ],
                encourage: [
                    '여기 단서가 반짝이는데? 천천히 같이 읽어볼까? 🔎',
                    '내 커다란 눈으로도 함께 살펴볼게! 네 속도로 가볼까? 👁️',
                    '잠깐 숨을 고르고, 마음 가는 단서부터 찾아볼까? 🌱'
                ],
                clear: '손 번쩍! 끝까지 함께 탐험했네? 오늘 발견한 것들을 간직할까? 🙌🏆'
            }
        },
        rotek: {
            id: 'rotek',
            number: '4호',
            name: '로텤스펲펲',
            role: '우당탕 뒤집기 괴수',
            code: 'UNIT-04 // ROTEK SPEP PEP',
            badgeText: '4호: 로텤스펲펲',
            hasBackground: false,
            poses: {
                idle: './kids/assets/monsters/rotek/idle.png',
                greet: './kids/assets/monsters/rotek/greet.png',
                walk_left: './kids/assets/monsters/rotek/walk_left.png',
                walk_right: './kids/assets/monsters/rotek/walk_right.png',
                rage: './kids/assets/monsters/rotek/rage.png',
                roar: './kids/assets/monsters/rotek/roar.png'
            },
            // rage 그림에 번개·화남 표시가 있어 퀘스트 시작은 정면 대기 포즈로 맞이한다.
            runnerPoses: { stageStart: 'idle' },
            labDialogues: {
                idle: '안녕! 나는 로텤스펲펲! 오늘은 세상을 어떻게 뒤집어볼까? 🌀',
                greet: '반가워! 신나게 쭉쭉 늘리고 빙글 뒤집어보자! 👋',
                walk: [
                    '왼쪽으로 슝! 집도 구름도 뒤집어볼까? 🏠🔄',
                    '오른쪽으로 폴짝! 키가 쑥쑥 늘어나는 마법! 🎈',
                    '우당탕탕! 거꾸로 보면 더 재미있는 문제들이 가득해! ✨'
                ],
                rage: '으랏차차! 힘을 너무 줘서 번개가 찌릿찌릿! ⚡💢',
                roar: '손 흔들흔들! 기운이 쑤욱 늘어났다! 출격 준비 완료! 🙌'
            },
            runnerDialogues: {
                stageStart: '준비됐지? 재미있는 문제들을 신나게 뒤집어보자! 🌀',
                correct: [
                    '정답! 문제를 쏙 뒤집어서 멋지게 풀어냈어! 🌀✨',
                    '대단해! 생각의 힘이 쑥쑥 늘어났는데? 🎈',
                    '우와! 머릿속 마법이 팡팡 터진다! 최고야! 🌟'
                ],
                encourage: [
                    '문제를 살짝 뒤집어보면 다른 정답 길이 보일 거야! 💡',
                    '천천히 생각을 쭉쭉 늘려보자! 함께 보면 풀릴 거야! 🌱',
                    '뒤집고 늘리고, 재미있게 하나씩 찾아가보자! 🎈'
                ],
                clear: '와아! 오늘 퀘스트를 완벽하게 뒤집어버렸어! 기운이 쑥쑥 늘어났네! 🏆🙌'
            }
        }
    };

    const MONSTER_ORDER = ['clay_bite', 'cottun_bongdomdol', 'unknown_beast', 'rotek'];
    const preloadedCache = new Set();
    // 갤러리 파트너·최고 기록은 이 기기의 자녀별 저장소에만 보관한다.
    const PARTNER_KEYS = { son: 'galleryPartner_son', daughter: 'galleryPartner_daughter' };
    const BEST_KEYS = { son: 'galleryRunnerBest_son', daughter: 'galleryRunnerBest_daughter' };
    const GALLERY_ID = 'gallery_partner';

    function validSprite(src) {
        if (typeof src !== 'string' || !src || /[\s\\\u0000-\u001f]/.test(src)) return false;
        if (/^https:\/\/[^/@?#]+(?:\/[^\s]*)?$/i.test(src)) return true;
        // 같은 출처 상대 주소는 로컬 미리보기에도 허용한다. 외부 프로토콜은 거절한다.
        return !src.startsWith('//') && !/^[^/?#]*:/.test(src) && !src.startsWith('#');
    }

    function isValidCharacter(character) {
        return !!character && typeof character.name === 'string' &&
            Array.from(character.name.trim()).length >= 1 && Array.from(character.name.trim()).length <= 12 &&
            validSprite(character.spriteUrl);
    }

    function charactersOf(item) {
        const entries = Array.isArray(item?.characters) ? item.characters :
            item?.characters === undefined && item?.character ? [{ ...item.character, key: 'main' }] : [];
        const seen = new Set();
        return entries.slice(0, 6).filter(c => {
            if (!isValidCharacter(c) || typeof c.key !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(c.key || '') || seen.has(c.key)) return false;
            seen.add(c.key); return true;
        });
    }

    function getGalleryPartner(child) {
        if (!Object.hasOwn(PARTNER_KEYS, child)) return null;
        try {
            const value = JSON.parse(localStorage.getItem(PARTNER_KEYS[child]));
            return isValidCharacter(value) && typeof value.artId === 'string' && value.artId.trim() &&
                Number.isFinite(value.equippedAt) && value.equippedAt > 0 ? { ...value, charKey: value.charKey ?? 'main' } : null;
        } catch (e) { return null; }
    }

    function withJosa(name, pair) {
        const text = String(name ?? '').trim();
        const pairs = { '이/가': ['이', '가', '이(가)'], '와/과': ['과', '와', '와(과)'],
            '을/를': ['을', '를', '을(를)'], '은/는': ['은', '는', '은(는)'] };
        const choices = pairs[pair];
        if (!text || !choices) return text;
        const code = Array.from(text).at(-1).codePointAt(0);
        const suffix = code >= 0xAC00 && code <= 0xD7A3 ? choices[(code - 0xAC00) % 28 ? 0 : 1] : choices[2];
        return text + suffix;
    }

    function refreshGalleryMonster() {
        const partner = getGalleryPartner('son');
        if (!partner) {
            delete MONSTER_ROSTER[GALLERY_ID];
            const index = MONSTER_ORDER.indexOf(GALLERY_ID);
            if (index >= 0) MONSTER_ORDER.splice(index, 1);
            return;
        }
        const name = partner.name;
        MONSTER_ROSTER[GALLERY_ID] = {
            id: GALLERY_ID, number: '자작', name, role: '갤러리 파트너',
            code: 'GALLERY // PARTNER', badgeText: `자작: ${name}`, hasBackground: false,
            poses: Object.fromEntries(['idle', 'greet', 'walk_left', 'walk_right', 'rage', 'roar']
                .map(pose => [pose, partner.spriteUrl])),
            labDialogues: { idle: `${name} 출격 준비 완료! ⚡`, greet: `${withJosa(name, '와/과')} 함께 시작해요!`,
                walk: [`${withJosa(name, '와/과')} 천천히 준비해요!`, '어느 과목부터 함께해 볼까?'],
                rage: '에너지가 가득해요! ✨', roar: `${withJosa(name, '와/과')} 함께 출발!` },
            runnerDialogues: { stageStart: `${withJosa(name, '이/가')} 함께할게요!`,
                correct: ['멋지게 해냈어요! 🙌', '차근차근 잘하고 있어요!'],
                encourage: ['괜찮아요! 힌트를 보고 다시 해봐요. 🌱'], clear: '끝까지 함께했어요! 🎉' }
        };
        if (!MONSTER_ORDER.includes(GALLERY_ID)) MONSTER_ORDER.push(GALLERY_ID);
    }

    function equipGalleryPartner(child, character) {
        if (!Object.hasOwn(PARTNER_KEYS, child) || !isValidCharacter(character) ||
            typeof character.artId !== 'string' || !character.artId.trim()) return null;
        let spriteUrl = character.spriteUrl;
        // 상대 주소를 출처 기준 경로로 고정해 갤러리와 연구소의 폴더 차이를 없앤다.
        if (!/^https:/i.test(spriteUrl) && typeof URL !== 'undefined' && window.location?.href) {
            const url = new URL(spriteUrl, window.location.href);
            spriteUrl = url.pathname + url.search + url.hash;
        }
        const charKey = character.key ?? 'main';
        if (!/^[a-z0-9_-]{1,32}$/.test(charKey)) return null;
        const value = { charKey, artId: character.artId, name: character.name.trim(), spriteUrl, equippedAt: Date.now() };
        try {
            localStorage.setItem(PARTNER_KEYS[child], JSON.stringify(value));
            if (child === 'son') localStorage.setItem(STORAGE_KEY, GALLERY_ID);
        } catch (e) { return null; }
        if (child === 'son') refreshGalleryMonster();
        return value;
    }

    function clearGalleryPartner(child) {
        if (!Object.hasOwn(PARTNER_KEYS, child)) return false;
        try {
            localStorage.removeItem(PARTNER_KEYS[child]);
            if (child === 'son' && localStorage.getItem(STORAGE_KEY) === GALLERY_ID)
                localStorage.setItem(STORAGE_KEY, DEFAULT_MONSTER_ID);
        } catch (e) { return false; }
        if (child === 'son') refreshGalleryMonster();
        return true;
    }

    function getRunnerBest(child) {
        if (!Object.hasOwn(BEST_KEYS, child)) return 0;
        try {
            const score = Number(localStorage.getItem(BEST_KEYS[child]));
            return Number.isSafeInteger(score) && score >= 0 ? score : 0;
        } catch (e) { return 0; }
    }

    function setRunnerBest(child, score) {
        if (!Object.hasOwn(BEST_KEYS, child) || !Number.isSafeInteger(score) || score < 0) return false;
        try { localStorage.setItem(BEST_KEYS[child], String(Math.max(score, getRunnerBest(child)))); }
        catch (e) { return false; }
        return true;
    }

    refreshGalleryMonster();

    function getSelectedMonsterId() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && MONSTER_ROSTER[saved]) return saved;
        } catch (e) {}
        return DEFAULT_MONSTER_ID;
    }

    function getSelectedMonster() {
        return MONSTER_ROSTER[getSelectedMonsterId()] || MONSTER_ROSTER[DEFAULT_MONSTER_ID];
    }

    function preloadMonsterAssets(monsterId) {
        const monster = MONSTER_ROSTER[monsterId] || getSelectedMonster();
        if (!monster || !monster.poses) return;
        Object.values(monster.poses).forEach((src) => {
            if (!src || preloadedCache.has(src)) return;
            const img = new Image();
            img.src = src;
            preloadedCache.add(src);
        });
    }

    function preloadAllMonsters() {
        MONSTER_ORDER.forEach((id) => preloadMonsterAssets(id));
    }

    function setSelectedMonsterId(monsterId) {
        const targetId = MONSTER_ROSTER[monsterId] ? monsterId : DEFAULT_MONSTER_ID;
        try {
            localStorage.setItem(STORAGE_KEY, targetId);
        } catch (e) {}
        preloadMonsterAssets(targetId);
        return MONSTER_ROSTER[targetId];
    }

    function getNextMonsterId(dir = 1) {
        const currentId = getSelectedMonsterId();
        const idx = MONSTER_ORDER.indexOf(currentId);
        const nextIdx = (idx + dir + MONSTER_ORDER.length) % MONSTER_ORDER.length;
        return MONSTER_ORDER[nextIdx];
    }

    /**
     * 연구소(monster_lab.html) 탭 횟수에 따른 포즈 및 대사 반환
     * 1회: greet / 2~4회: walk_left ↔ walk_right 교차 / 5회+: rage (과열)
     */
    function getLabTapResponse(tapCount, monsterId) {
        const monster = MONSTER_ROSTER[monsterId] || getSelectedMonster();
        const cycle = ((tapCount - 1) % 5) + 1;

        if (cycle === 1) {
            return {
                poseKey: 'greet',
                poseSrc: monster.poses.greet,
                speech: monster.labDialogues.greet,
                isRage: false
            };
        }
        if (cycle >= 2 && cycle <= 4) {
            const poseKey = cycle % 2 === 0 ? 'walk_left' : 'walk_right';
            const walkLines = monster.labDialogues.walk || [];
            const speech = walkLines[(cycle - 2) % walkLines.length] || monster.labDialogues.greet;
            return {
                poseKey,
                poseSrc: monster.poses[poseKey] || monster.poses.idle,
                speech,
                isRage: false
            };
        }
        return {
            poseKey: 'rage',
            poseSrc: monster.poses.rage || monster.poses.idle,
            speech: monster.labDialogues.rage,
            isRage: true
        };
    }

    /**
     * 퀘스트 러너(quest_runner.html) 에러리스 반응 조회
     * state: 'stageStart' | 'correct' | 'encourage' | 'clear' | 'idle'
     */
    function getRunnerReaction(state, monsterId) {
        const monster = MONSTER_ROSTER[monsterId] || getSelectedMonster();
        const pick = (arr) => Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr;
        // 몬스터마다 그림 뜻이 다를 수 있어 runnerPoses로 상황별 포즈를 바꿀 수 있다(예: 모름의 rage는 뒷모습).
        const poseOf = (state, fallback) => {
            const key = monster.runnerPoses?.[state];
            return key && monster.poses[key] ? key : fallback;
        };

        if (state === 'stageStart') {
            const poseKey = poseOf('stageStart', 'rage');
            return {
                poseKey,
                poseSrc: monster.poses[poseKey] || monster.poses.idle,
                speech: monster.runnerDialogues.stageStart
            };
        }
        if (state === 'correct') {
            return {
                poseKey: 'greet',
                poseSrc: monster.poses.greet || monster.poses.idle,
                speech: pick(monster.runnerDialogues.correct)
            };
        }
        if (state === 'encourage') {
            return {
                poseKey: 'walk_left',
                poseSrc: monster.poses.walk_left || monster.poses.idle,
                speech: pick(monster.runnerDialogues.encourage)
            };
        }
        if (state === 'clear') {
            return {
                poseKey: 'roar',
                poseSrc: monster.poses.roar || monster.poses.idle,
                speech: monster.runnerDialogues.clear
            };
        }
        return {
            poseKey: 'idle',
            poseSrc: monster.poses.idle,
            speech: monster.runnerDialogues.stageStart
        };
    }

    window.MonsterRoster = {
        equipGalleryPartner, getGalleryPartner, clearGalleryPartner, isValidCharacter,
        getRunnerBest, setRunnerBest, withJosa, charactersOf,
        MONSTER_ROSTER,
        MONSTER_ORDER,
        getSelectedMonsterId,
        getSelectedMonster,
        setSelectedMonsterId,
        getNextMonsterId,
        preloadMonsterAssets,
        preloadAllMonsters,
        getLabTapResponse,
        getRunnerReaction
    };
})();
