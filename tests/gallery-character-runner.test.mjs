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
    assert.deepEqual(Object.keys(saved).sort(), ['artId', 'equippedAt', 'name', 'spriteUrl']);
    assert.equal(saved.name, character.name);
    assert.equal(typeof saved.equippedAt, 'number');
    assert.deepEqual(JSON.parse(storage.getItem('galleryPartner_son')), plain(saved));
    assert.equal(storage.getItem('selectedMonster'), 'gallery_partner');
    assert.equal(roster.getSelectedMonsterId(), 'gallery_partner');
    assert.equal(roster.getSelectedMonster().role, '갤러리 파트너');
    assert.equal(Object.values(roster.getSelectedMonster().poses).length, 6);
    assert.ok(Object.values(roster.getSelectedMonster().poses).every(src => src === spriteUrl));
    assert.equal(roster.getNextMonsterId(1), 'clay_bite');
    assert.equal(roster.getNextMonsterId(-1), 'cottun_bongdomdol');
    const again = load(storage).roster;
    assert.equal(again.getSelectedMonsterId(), 'gallery_partner');
    assert.equal(again.MONSTER_ORDER.filter(id => id === 'gallery_partner').length, 1);
    assert.ok(again.clearGalleryPartner('son'));
    assert.equal(again.getGalleryPartner('son'), null);
    assert.equal(again.getSelectedMonsterId(), 'clay_bite');
    assert.equal(storage.getItem('selectedMonster'), 'clay_bite');
    assert.equal(again.MONSTER_ROSTER.gallery_partner, undefined);
    assert.deepEqual(plain(again.MONSTER_ORDER), ['clay_bite', 'cottun_bongdomdol']);
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
    for (const id of ['clay_bite', 'cottun_bongdomdol']) {
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

test('두 프로필 모두 입력 없이 60초를 채우고 완주한다', () => {
    const { game } = load();
    for (const child of ['son', 'daughter']) {
        const world = game.createWorld(17, child);
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

test('별은 한 번만 획득하고 판정 상자는 그림의 70%다', () => {
    const { game } = load();
    const world = game.createWorld(1);
    world.obstacles = [];
    world.stars = [{ ...world.player, taken: false }];
    game.step(world, {}, 1);
    assert.equal(world.score, 1);
    game.step(world, {}, 1);
    assert.equal(world.score, 1);
    assert.deepEqual(plain(game.hitboxOf(null, 10, 20, 100, 200)), { x: 25, y: 50, w: 70, h: 140 });
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
    for (let i = 0; i < 60; i++) game.step(world, {}, 20);
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
    for (const item of context.window.DEFAULT_GALLERY_DATA.filter(item => item.character)) {
        assert.ok(roster.isValidCharacter(item.character));
        assert.ok(item.character.spriteUrl.startsWith('https://raw.githubusercontent.com/awslike6-web/kids-archive/main/'));
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
             'missing': ('missing_sprite.png', '용'), 'empty': ('empty_sprite.png', '용')}
    meta = {}
    for key, (filename, name) in names.items():
        Image.new('RGB', (120, 100), 'green').save(uploads / (key + '.jpg'))
        meta['art_minsu_' + key] = {'title': key, 'character': {'sprite': filename, 'name': name}}
    (data / 'gallery-meta.json').write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
    result = subprocess.run([sys.executable, '-X', 'utf8', str(scripts / source.name)], capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stderr
    text = (data / 'gallery-data.js').read_text(encoding='utf-8')
    items = json.loads(text.split('const DEFAULT_GALLERY_DATA = ', 1)[1].split(';', 1)[0])
    assert len(items) == 6, [item['id'] for item in items]
    assert sum('character' in item for item in items) == 1
    ok = next(item for item in items if item['id'] == 'art_minsu_ok')
    assert ok['character']['name'] == '보라 용'
    target = archive / 'assets/media/minsu/2026_elem_5/minsu_ok_sprite.png'
    with Image.open(target) as image:
        assert max(image.size) == 512, image.size
        assert image.mode == 'RGBA'
        assert abs(image.width/image.height - 4/3) < .01
        assert image.getchannel('A').getextrema() == (0, 255)
        box = image.getchannel('A').getbbox()
        assert 0 < box[0] < 30 and 0 < box[1] < 30, box
    assert result.stdout.count('[character 제외]') == 5, result.stdout
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
