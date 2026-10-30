import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const rosterFile = 'kids/subjects/quest/monster_roster.js';
const runnerFile = 'kids/common_space/gallery-mini-runner.js';
const spriteUrl = 'https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minsu/test_sprite.png';
const character = { artId: 'art_test', name: '테스트 용', spriteUrl };
const plain = value => JSON.parse(JSON.stringify(value));
function storageOf(initial = {}) {
    const data = new Map(Object.entries(initial));
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key), data };
}
function load(storage = storageOf()) {
    const { sandbox } = loadBrowserScripts([rosterFile, runnerFile], { storage });
    return { sandbox, roster: sandbox.MonsterRoster, game: sandbox.GalleryMiniRunner, storage };
}

test('두 모듈은 document 없는 환경에서 로드하고 닫아도 안전하다', () => {
    const { sandbox, game } = load();
    assert.equal(sandbox.document, undefined);
    game.close(); game.close();
    const source = readFileSync(new URL(`../${runnerFile}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem)\(['"]gallery/);
});

test('민수 장착·저장·포즈 6종·재로드·로스터 순환·해제 복구', () => {
    const { roster, storage } = load();
    const saved = roster.equipGalleryPartner('son', character);
    assert.deepEqual(Object.keys(saved).sort(), ['artId', 'charKey', 'equippedAt', 'name', 'spriteUrl']);
    assert.equal(saved.name, character.name);
    assert.equal(typeof saved.equippedAt, 'number');
    assert.deepEqual(JSON.parse(storage.getItem('galleryPartner_son')), plain(saved));
    assert.equal(storage.getItem('selectedMonster'), 'gallery_partner');
    assert.equal(roster.getSelectedMonsterId(), 'gallery_partner');
    assert.equal(roster.getSelectedMonster().role, '갤러리 파트너');
    assert.equal(Object.values(roster.getSelectedMonster().poses).length, 6);
    assert.ok(Object.values(roster.getSelectedMonster().poses).every(src => src === spriteUrl));
    assert.equal(roster.getNextMonsterId(1), 'clay_bite');
    assert.equal(roster.getNextMonsterId(-1), 'unknown_beast');
    const again = load(storage).roster;
    assert.equal(again.getSelectedMonsterId(), 'gallery_partner');
    assert.equal(again.MONSTER_ORDER.filter(id => id === 'gallery_partner').length, 1);
    assert.ok(again.clearGalleryPartner('son'));
    assert.equal(again.getGalleryPartner('son'), null);
    assert.equal(again.getSelectedMonsterId(), 'clay_bite');
    assert.equal(storage.getItem('selectedMonster'), 'clay_bite');
    assert.equal(again.MONSTER_ROSTER.gallery_partner, undefined);
    assert.deepEqual(plain(again.MONSTER_ORDER), ['clay_bite', 'cottun_bongdomdol', 'unknown_beast']);
});

test('민서 장착·해제·기록은 민수 선택과 저장을 바꾸지 않는다', () => {
    const { roster, storage } = load();
    roster.equipGalleryPartner('son', character);
    roster.equipGalleryPartner('daughter', { ...character, name: '분홍 토끼' });
    assert.equal(roster.getGalleryPartner('daughter').name, '분홍 토끼');
    assert.equal(storage.getItem('selectedMonster'), 'gallery_partner');
    assert.equal(roster.MONSTER_ROSTER.gallery_partner.name, character.name);
    roster.clearGalleryPartner('daughter');
    assert.equal(roster.getSelectedMonsterId(), 'gallery_partner');
    assert.equal(roster.getGalleryPartner('son').artId, character.artId);
    assert.ok(roster.setRunnerBest('daughter', 8));
    assert.ok(roster.setRunnerBest('daughter', 3));
    assert.equal(roster.getRunnerBest('daughter'), 8);
    assert.equal(roster.getRunnerBest('son'), 0);
    assert.equal(roster.setRunnerBest('son', -1), false);
    assert.equal(roster.setRunnerBest('son', Infinity), false);
});

test('깨진 저장·누락 필드·위험 주소·권한 없는 저장소를 안전하게 무시한다', () => {
    for (const raw of ['{', 'null', '{}', JSON.stringify(character),
        JSON.stringify({ ...character, spriteUrl: 'http://bad.test/a.png', equippedAt: 5 }),
        JSON.stringify({ ...character, spriteUrl: 'javascript:alert(1)', equippedAt: 5 })]) {
        const { roster } = load(storageOf({ galleryPartner_son: raw, selectedMonster: 'gallery_partner' }));
        assert.equal(roster.getGalleryPartner('son'), null);
        assert.equal(roster.getSelectedMonsterId(), 'clay_bite');
    }
    const badStorage = { getItem() { throw Error('차단'); }, setItem() { throw Error('차단'); }, removeItem() { throw Error('차단'); } };
    const { roster } = load(badStorage);
    assert.equal(roster.getGalleryPartner('son'), null);
    assert.equal(roster.equipGalleryPartner('son', character), null);
    assert.equal(roster.clearGalleryPartner('son'), false);
    assert.equal(roster.getRunnerBest('son'), 0);
    assert.equal(roster.setRunnerBest('son', 5), false);
});

test('이름·URL 계약과 기존 두 몬스터의 포즈·대사를 보존한다', () => {
    const { roster } = load();
    for (const src of [spriteUrl, '../assets/dragon.png', '/kids/assets/dragon.png'])
        assert.ok(roster.isValidCharacter({ name: '용', spriteUrl: src }));
    for (const src of ['http://bad.test/a.png', 'javascript:alert(1)', 'data:image/png;base64,a', '//bad.test/a.png', '\\bad.test', ''])
        assert.equal(roster.isValidCharacter({ name: '용', spriteUrl: src }), false, src);
    for (const name of ['', '   ', '가'.repeat(13), null]) assert.equal(roster.isValidCharacter({ name, spriteUrl }), false);
    for (const id of ['clay_bite', 'cottun_bongdomdol', 'unknown_beast']) {
        const monster = roster.MONSTER_ROSTER[id];
        for (const [count, pose] of [[1, 'greet'], [2, 'walk_left'], [3, 'walk_right'], [5, 'rage']]) {
            const result = roster.getLabTapResponse(count, id);
            assert.equal(result.poseSrc, monster.poses[pose]);
            assert.ok(result.speech);
        }
        for (const state of ['stageStart', 'correct', 'encourage', 'clear', 'idle']) {
            const result = roster.getRunnerReaction(state, id);
            assert.equal(result.poseSrc, monster.poses[result.poseKey]);
            assert.ok(result.speech);
        }
    }
});

test('상대 주소는 갤러리 폴더와 무관한 같은 출처 경로로 저장한다', () => {
    const { sandbox, roster } = load();
    sandbox.URL = URL;
    sandbox.location.href = 'http://127.0.0.1:8767/kids/common_space/gallery.html';
    roster.equipGalleryPartner('daughter', { ...character, spriteUrl: '../assets/dragon.png' });
    assert.equal(roster.getGalleryPartner('daughter').spriteUrl, '/kids/assets/dragon.png');
});

test('같은 시드는 같은 월드, 다른 시드는 다른 배치를 만든다', () => {
    const { game } = load();
    for (const child of ['son', 'daughter']) {
        assert.deepEqual(plain(game.createWorld(42, child)), plain(game.createWorld(42, child)));
        assert.notDeepEqual(plain(game.createWorld(42, child).obstacles), plain(game.createWorld(43, child).obstacles));
    }
});

// 장애물 하나를 오른쪽 가장자리에 놓고 실제 step으로 통과까지 진행한다.
const FRAME_MS = 1000 / 60;
const ASPECTS = [.45, .55, .8, 1, 1.6, 2.2];
function jumpTrial(game, source, obstacle, first, second = -1, phase = 0) {
    const world = { ...source, elapsed: phase, distance: obstacle.x - source.width, hits: 0, score: 0,
        status: 'running', invincible: 0, player: { ...source.player }, stars: [], obstacles: [{ ...obstacle, hit: false }] };
    const box = game.hitboxOf(null, world.player.x, world.player.y, world.player.w, world.player.h);
    const speed = world.speed * (source.child === 'son' && phase >= 30000 ? 1.12 : 1);
    const last = Math.ceil((source.width + obstacle.w - box.x) / speed * 1000 / FRAME_MS) + 2;
    for (let frame = 0; frame <= last; frame++) {
        if (frame === second && world.player.jumps !== 1) return false;
        game.step(world, { jump: frame === first || frame === second }, FRAME_MS);
        if (world.hits) return false;
    }
    return world.obstacles[0].x + obstacle.w - world.distance < box.x;
}

function findJumpPlan(game, world, obstacle, maxJumps, phase = 0) {
    const box = game.hitboxOf(null, world.player.x, world.player.y, world.player.w, world.player.h);
    const speed = world.speed * (world.child === 'son' && phase >= 30000 ? 1.12 : 1);
    const contact = Math.ceil((world.width - box.x - box.w) / speed * 1000 / FRAME_MS);
    for (let first = contact; first >= 0; first--)
        if (jumpTrial(game, world, obstacle, first, -1, phase)) return [first, -1];
    if (maxJumps === 1) return null;
    // 먼저 정점 부근의 2단 점프를 시도하되 나머지 공중 프레임도 빠짐없이 탐색한다.
    const delays = [40, ...Array.from({ length: 90 }, (_, i) => i + 1).filter(n => n !== 40)];
    for (let first = contact; first >= 0; first--)
        for (const delay of delays)
            if (jumpTrial(game, world, obstacle, first, first + delay, phase)) return [first, first + delay];
    return null;
}

test('전수 통과: 세로·가로 6비율 × 그림 3비율 × 3시드, 민수 가속 전후', t => {
    const { game } = load();
    let worlds = 0, obstacles = 0;
    for (const aspect of ASPECTS) for (const spriteAspect of [.5, 1, 1.6]) for (const seed of [1, 42, 20261029]) {
        for (const child of ['daughter', 'son']) for (const phase of child === 'son' ? [0, 30001] : [0]) {
            const world = game.createWorld(seed, { child, aspect, spriteAspect });
            world.player.w = .18 * spriteAspect;
            const sorted = [...world.obstacles].sort((a, b) => b.h - a.h);
            let plan = null;
            for (const obstacle of sorted) {
                if (!plan || !jumpTrial(game, world, obstacle, ...plan, phase))
                    plan = findJumpPlan(game, world, obstacle, child === 'daughter' ? 1 : 2, phase);
                assert.ok(plan, `통과 불가: ${JSON.stringify({ child, aspect, spriteAspect, seed, phase, height: obstacle.h })}`);
                assert.ok(jumpTrial(game, world, obstacle, ...plan, phase));
                if (child === 'daughter') assert.equal(plan[1], -1);
                obstacles++;
            }
            worlds++;
        }
    }
    t.diagnostic(`${worlds}개 월드·장애물 ${obstacles}개 전수 통과`);
});

test('민수의 높은 장애물은 1단으로 불가능하고 2단으로 통과한다', () => {
    const { game } = load();
    const world = game.createWorld(42, { child: 'son', aspect: 1.6, spriteAspect: 1 });
    const obstacle = [...world.obstacles].sort((a, b) => b.h - a.h)[0];
    assert.equal(findJumpPlan(game, world, obstacle, 1), null);
    const plan = findJumpPlan(game, world, obstacle, 2);
    assert.ok(plan && plan[1] > plan[0]);
    assert.ok(jumpTrial(game, world, obstacle, ...plan));
});

test('반응 시간은 판정 상자 앞쪽 기준으로도 민서 1.6초·민수 1.2초 이상이다', () => {
    const { game } = load();
    for (const aspect of ASPECTS) for (const spriteAspect of [.5, 1, 1.6]) for (const child of ['daughter', 'son']) {
        const world = game.createWorld(1, { child, aspect, spriteAspect });
        const box = game.hitboxOf(null, world.player.x, world.player.y, world.player.w, world.player.h);
        for (const boost of child === 'son' ? [1, 1.12] : [1]) {
            const speed = world.speed * boost, minimum = child === 'daughter' ? 1.6 : 1.2;
            assert.ok((aspect - world.player.x) / speed >= minimum);
            assert.ok((aspect - box.x - box.w) / speed >= minimum, `${child}/${aspect}/${spriteAspect}/${boost}`);
        }
    }
});

test('리사이즈는 상대 거리·통과 상태·공중 상태를 보존하고 새 너비로 속도를 계산한다', () => {
    const { game } = load();
    const world = game.createWorld(42, { child: 'son', aspect: 1.6, spriteAspect: 1.6 });
    for (let i = 0; i < 150; i++) game.step(world, {}, FRAME_MS);
    game.step(world, { jump: true }, FRAME_MS);
    world.obstacles[0].x = world.distance + world.player.x - .3;
    world.obstacles[0].hit = true;
    world.stars[0].taken = true;
    const gaps = items => items.map(item => item.x - world.distance - world.player.x);
    const beforeObstacles = gaps(world.obstacles), beforeStars = gaps(world.stars);
    const beforePlayer = { ...world.player }, distance = world.distance;
    for (const aspect of [.55, 2.2, .45, 1.6]) {
        game.resizeWorld(world, aspect);
        assert.equal(world.width, aspect);
        assert.equal(world.distance, distance);
        for (const [i, gap] of gaps(world.obstacles).entries()) assert.ok(Math.abs(gap - beforeObstacles[i]) < 1e-10);
        for (const [i, gap] of gaps(world.stars).entries()) assert.ok(Math.abs(gap - beforeStars[i]) < 1e-10);
        assert.ok(world.obstacles[0].x + world.obstacles[0].w - world.distance < world.player.x);
        assert.equal(world.obstacles[0].hit, true);
        assert.equal(world.stars[0].taken, true);
        assert.equal(world.player.y, beforePlayer.y);
        assert.equal(world.player.vy, beforePlayer.vy);
        assert.equal(world.player.jumps, beforePlayer.jumps);
        assert.equal(world.speed, game.createWorld(1, { child: 'son', aspect, spriteAspect: 1.6 }).speed);
    }
});

test('속도 범위와 30초 가속은 실제 이동 거리에도 적용된다', () => {
    const { game } = load();
    for (const aspect of ASPECTS) for (const child of ['daughter', 'son']) {
        const world = game.createWorld(1, { child, aspect });
        world.obstacles = []; world.stars = [];
        const [minimum, maximum] = child === 'daughter' ? [.15, .38] : [.18, .58];
        assert.ok(world.speed >= minimum && world.speed <= maximum);
        game.step(world, {}, 20);
        const before = world.distance;
        world.elapsed = 30001;
        game.step(world, {}, 20);
        const ratio = (world.distance - before) / before;
        assert.ok(Math.abs(ratio - (child === 'son' ? 1.12 : 1)) < 1e-10);
    }
});

test('조사: 받침·모음·비한글 이름과 네 가지 짝을 한 함수로 처리한다', () => {
    const { roster } = load();
    for (const [name, pair, result] of [['드래곤', '이/가', '드래곤이'], ['드래곤', '와/과', '드래곤과'],
        ['코코', '이/가', '코코가'], ['코코', '와/과', '코코와'], ['Rex', '이/가', 'Rex이(가)'],
        ['봉돔돌', '이/가', '봉돔돌이'], ['코코', '을/를', '코코를'], ['드래곤', '을/를', '드래곤을'],
        ['코코', '은/는', '코코는'], ['드래곤', '은/는', '드래곤은'], ['🦖', '와/과', '🦖와(과)']])
        assert.equal(roster.withJosa(name, pair), result);
    roster.equipGalleryPartner('son', { ...character, name: '드래곤' });
    assert.equal(roster.getRunnerReaction('stageStart').speech, '드래곤이 함께할게요!');
    assert.equal(roster.getLabTapResponse(1).speech, '드래곤과 함께 시작해요!');
});

test('두 프로필 모두 입력 없이 60초를 채우고 완주한다', () => {
    const { game } = load();
    for (const child of ['son', 'daughter']) for (const aspect of [.55, 1.6]) {
        const world = game.createWorld(17, { child, aspect });
        for (let i = 0; i < 1200; i++) game.step(world, {}, 50);
        assert.equal(world.elapsed, 60000);
        assert.equal(world.status, 'finished');
        assert.ok(world.hits > 0);
        assert.ok(world.score >= 0);
        const end = JSON.stringify(world);
        game.step(world, { jump: true }, 50);
        assert.equal(JSON.stringify(world), end);
    }
});

test('충돌은 별 한 개만 줄이고 0 미만·무적 중 추가 감소를 막는다', () => {
    const { game } = load();
    const world = game.createWorld(42);
    world.stars = [];
    world.score = 3;
    world.obstacles = [{ x: world.player.x, y: 0, w: 1, h: 1 }, { x: world.player.x, y: 0, w: 1, h: 1 }];
    game.step(world, {}, 10);
    assert.equal(world.score, 2);
    assert.equal(world.status, 'running');
    assert.equal(world.invincible, 800);
    game.step(world, {}, 50);
    assert.equal(world.score, 2);
    assert.equal(world.hits, 1);
    world.score = 0;
    world.invincible = 0;
    world.obstacles = [{ x: world.player.x + world.distance, y: 0, w: 1, h: 1 }];
    game.step(world, {}, 10);
    assert.equal(world.score, 0);
});

test('별은 한 번만 획득하고 판정 상자의 높이 70%·가로 상한을 적용한다', () => {
    const { game } = load();
    const world = game.createWorld(1);
    world.obstacles = [];
    world.stars = [{ ...world.player, taken: false }];
    game.step(world, {}, 1);
    assert.equal(world.score, 1);
    game.step(world, {}, 1);
    assert.equal(world.score, 1);
    const small = game.hitboxOf(null, 0, 0, .1, .2), wide = game.hitboxOf(null, 0, 0, .288, .18);
    assert.ok(Math.abs(small.w - .07) < 1e-10 && Math.abs(small.h - .14) < 1e-10);
    assert.equal(wide.w, .08);
    assert.ok(Math.abs(wide.x + wide.w / 2 - .144) < 1e-10);
});

test('공중 두 번 점프 후 세 번째는 거부, 착지하면 다시 가능하다', () => {
    const { game } = load();
    const world = game.createWorld(1);
    world.obstacles = []; world.stars = [];
    game.step(world, { jump: true }, 10);
    assert.equal(world.player.jumps, 1);
    for (let i = 0; i < 10; i++) game.step(world, {}, 20);
    game.step(world, { jump: true }, 10);
    assert.equal(world.player.jumps, 2);
    const velocity = world.player.vy;
    game.step(world, { jump: true }, 10);
    assert.equal(world.player.jumps, 2);
    assert.ok(world.player.vy > velocity);
    for (let i = 0; i < 100; i++) game.step(world, {}, 20);
    assert.equal(world.player.jumps, 0);
});

test('dt는 50ms 상한·0 하한이고 민서 장애물은 1단 점프로 넘는다', () => {
    const { game } = load();
    const world = game.createWorld(1, 'daughter');
    game.step(world, {}, 100000);
    assert.equal(world.elapsed, 50);
    game.step(world, {}, -50);
    assert.equal(world.elapsed, 50);
    const jump = game.createWorld(1, 'daughter');
    jump.obstacles = []; jump.stars = [];
    const groundY = jump.player.y;
    game.step(jump, { jump: true }, 10);
    let peak = groundY - jump.player.y;
    for (let i = 0; i < 100; i++) {
        game.step(jump, {}, 10);
        peak = Math.max(peak, groundY - jump.player.y);
    }
    assert.ok(world.obstacles.every(obstacle => obstacle.h < peak));
    assert.ok(game.createWorld(1, 'son').speed > world.speed);
});

test('실제 캐릭터 데이터는 아카이브 CDN 계약을 지킨다', () => {
    const { roster } = load();
    const context = { window: {} };
    vm.runInNewContext(readFileSync(new URL('../kids/data/gallery-data.js', import.meta.url), 'utf8'), context);
    for (const character of context.window.DEFAULT_GALLERY_DATA.flatMap(item => roster.charactersOf(item))) {
        assert.ok(roster.isValidCharacter(character));
        assert.ok(character.spriteUrl.startsWith('https://raw.githubusercontent.com/awslike6-web/kids-archive/main/'));
    }
});

const python = process.env.GALLERY_TEST_PYTHON || (process.platform === 'win32' &&
    existsSync('C:/Users/pc/AppData/Local/Python/pythoncore-3.14-64/python.exe') ?
    'C:/Users/pc/AppData/Local/Python/pythoncore-3.14-64/python.exe' : 'python');

test('빌더: 임시 환경에서 투명·크롭·512px·카드 제외·실패 격리·아카이브 계약', () => {
    const program = String.raw`
import importlib.util, json, shutil, tempfile, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw
source = Path.cwd() / 'scripts/build_gallery.py'
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    school = root / 'kids-school-main'
    scripts = school / 'scripts'
    scripts.mkdir(parents=True)
    shutil.copy2(source, scripts / source.name)
    uploads = school / 'uploads/ex/갤러리/민수'
    uploads.mkdir(parents=True)
    data = school / 'kids/data'
    data.mkdir(parents=True)
    archive = root / 'kids-archive'
    (archive / 'data').mkdir(parents=True)
    image = Image.new('RGBA', (1600, 1200), (0, 0, 0, 0))
    ImageDraw.Draw(image).rectangle((400, 300, 1199, 899), fill=(100, 30, 200, 255))
    image.save(uploads / 'ok_sprite.png')
    Image.new('RGBA', (100, 100), 'white').save(uploads / 'opaque_sprite.png')
    Image.new('RGB', (100, 100), 'white').save(uploads / 'wrong_sprite.jpg')
    Image.new('RGBA', (100, 100), (0,0,0,0)).save(uploads / 'empty_sprite.png')
    names = {'ok': ('ok_sprite.png', '  보라 용  '), 'opaque': ('opaque_sprite.png', '용'),
             'wrong': ('wrong_sprite.jpg', '용'), 'long': ('ok_sprite.png', '가'*13),
             'missing': ('missing_sprite.png', '용'), 'empty': ('empty_sprite.png', '용'),
             'self': ('self.jpg', '용')}
    meta = {}
    for key, (filename, name) in names.items():
        Image.new('RGB', (120, 100), 'green').save(uploads / (key + '.jpg'))
        meta['art_minsu_' + key] = {'title': key, 'character': {'sprite': filename, 'name': name}}
    (data / 'gallery-meta.json').write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
    result = subprocess.run([sys.executable, '-X', 'utf8', str(scripts / source.name)], capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stderr
    text = (data / 'gallery-data.js').read_text(encoding='utf-8')
    items = json.loads(text.split('const DEFAULT_GALLERY_DATA = ', 1)[1].split(';', 1)[0])
    assert len(items) == 7, [item['id'] for item in items]
    assert sum('characters' in item for item in items) == 1
    ok = next(item for item in items if item['id'] == 'art_minsu_ok')
    assert ok['characters'][0]['name'] == '보라 용'
    target = archive / 'assets/media/minsu/2026_elem_5/minsu_ok_sprite.png'
    with Image.open(target) as image:
        assert max(image.size) == 512, image.size
        assert image.mode == 'RGBA'
        assert abs(image.width/image.height - 4/3) < .01
        assert image.getchannel('A').getextrema() == (0, 255)
        box = image.getchannel('A').getbbox()
        assert 0 < box[0] < 30 and 0 < box[1] < 30, box
    assert result.stdout.count('[character 제외]') == 6, result.stdout
    assert '"character"' not in (archive / 'data/archive-master-data.js').read_text(encoding='utf-8')
    # 원본 업로드가 없어도 이미 보존된 캐릭터를 참조한다.
    (uploads / 'ok_sprite.png').unlink()
    again = subprocess.run([sys.executable, '-X', 'utf8', str(scripts / source.name)], capture_output=True, text=True, encoding='utf-8')
    assert again.returncode == 0, again.stderr
    rebuilt = (data / 'gallery-data.js').read_text(encoding='utf-8')
    assert 'minsu_ok_sprite.png' in rebuilt
    # EXIF 회전과 팔레트 투명도도 실제 Pillow 입력으로 검증한다.
    spec = importlib.util.spec_from_file_location('builder', scripts / source.name)
    builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)
    rotated = Image.new('RGBA', (120, 80), (0,0,0,0))
    ImageDraw.Draw(rotated).rectangle((20, 10, 99, 69), fill='blue')
    exif = rotated.getexif(); exif[274] = 6
    rotated.save(uploads / 'rotated.png', exif=exif)
    checked = builder.load_character_sprite(uploads / 'rotated.png')
    assert checked.size == (80, 120), checked.size
print('빌더 임시 환경 검사 통과')
`;
    const result = spawnSync(python, ['-X', 'utf8', '-c', program], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
});


test('3호 모름은 여섯 포즈 파일과 고유 대사를 제공한다', () => {
    const { roster } = load();
    const monster = roster.MONSTER_ROSTER.unknown_beast;
    assert.equal(monster.name, '모름');
    assert.equal(monster.hasBackground, false);
    assert.equal(monster.number, '3호');
    for (const pose of ['idle', 'greet', 'walk_left', 'walk_right', 'rage', 'roar']) {
        assert.ok(existsSync(new URL(`../${monster.poses[pose]}`, import.meta.url)), pose);
    }
    assert.deepEqual(readFileSync(new URL(`../${monster.poses.greet}`, import.meta.url)),
        readFileSync(new URL(`../${monster.poses.roar}`, import.meta.url)));
    assert.match(roster.getLabTapResponse(5, monster.id).speech, /뒤돌아/);
    assert.equal(roster.getRunnerReaction('stageStart', monster.id).poseSrc, monster.poses.idle);
    assert.equal(roster.getRunnerReaction('stageStart', 'cottun_bongdomdol').poseKey, 'rage');
    assert.ok(monster.runnerDialogues.encourage.every(line => !/실패|오답|틀렸|실수/.test(line)));
});
