/**
 * 👾 5분 퀘스트 파트너 몬스터 로스터 & 포즈/대사 엔진 (Monster Roster SSOT)
 * - 1호: 클레이 바이트 (기본 투명 배경 네온 비스트)
 * - 2호: 콧툰봉돔돌 (민수 자작 SCP-봉제괴수 · 실사 배경 + 6종 포즈 인터랙션)
 * - localStorage('selectedMonster') 연동 및 포즈 이미지 즉시 프리로드(Preload) 지원
 */
(() => {
    const STORAGE_KEY = 'selectedMonster';
    const DEFAULT_MONSTER_ID = 'clay_bite';

    const MONSTER_ROSTER = {
        clay_bite: {
            id: 'clay_bite',
            number: '1호',
            name: '클레이 바이트',
            role: '수호 비스트',
            code: 'UNIT-01 // NEON BEAST',
            badgeText: '1호: 클레이 바이트',
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
        }
    };

    const MONSTER_ORDER = ['clay_bite', 'cottun_bongdomdol'];
    const preloadedCache = new Set();

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

        if (state === 'stageStart') {
            return {
                poseKey: 'rage',
                poseSrc: monster.poses.rage || monster.poses.idle,
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
