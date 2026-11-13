import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const rosterFile = 'kids/subjects/quest/monster_roster.js';
const load = () => loadBrowserScripts([rosterFile]).sandbox;

// 재생 함수가 쓰는 만큼만 흉내 내는 DOM. 실제 표시는 화면 시험에서 확인한다.
function domOf(sandbox) {
    const head = [];
    sandbox.document = {
        getElementById: id => head.find(node => node.id === id) || null,
        head: { append: node => head.push(node) },
        createElement: () => {
            const node = { dataset: {}, setAttribute() {}, remove() { node.parent?.children.splice(node.parent.children.indexOf(node), 1); } };
            return node;
        }
    };
    const frame = {
        children: [],
        append(node) { node.parent = frame; frame.children.push(node); },
        querySelector() { return frame.children.find(node => node.className === 'mr-badge') || null; }
    };
    const classes = new Set();
    const element = { parentElement: frame, offsetWidth: 56, classes,
        classList: { add: name => classes.add(name), remove: (...names) => names.forEach(name => classes.delete(name)) } };
    return { head, frame, element };
}

test('파트너마다 손인사·만세·격려 포즈를 고르고 격려는 화난 그림을 쓰지 않는다', () => {
    const { MonsterRoster: roster } = load();
    const expected = { clay_bite: 'greet', cottun_bongdomdol: 'rage', unknown_beast: 'walk_left', rotek: 'greet' };
    for (const [id, cheer] of Object.entries(expected)) {
        assert.equal(roster.getRunnerReaction('stageStart', id).poseKey, 'greet', id);
        assert.equal(roster.getRunnerReaction('stageStart', id).reaction, 'wave', id);
        for (const state of ['correct', 'clear']) {
            assert.equal(roster.getRunnerReaction(state, id).poseKey, cheer, id);
            assert.equal(roster.getRunnerReaction(state, id).reaction, 'cheer', id);
        }
        assert.equal(roster.getRunnerReaction('encourage', id).poseKey, 'idle', id);
        assert.equal(roster.getRunnerReaction('encourage', id).reaction, 'cross', id);
        assert.equal(roster.getRunnerReaction('idle', id).reaction, null, id);
    }
});

test('그림이 1장인 자작 파트너와 포즈가 빠진 파트너도 세 리액션에 그림이 있다', () => {
    const { MonsterRoster: roster } = load();
    roster.equipGalleryPartner('son', { artId: 'art_test', name: '테스트 용', spriteUrl: 'https://example.test/a.png' });
    for (const state of ['stageStart', 'correct', 'encourage', 'clear', 'idle'])
        assert.equal(roster.getRunnerReaction(state, 'gallery_partner').poseSrc, 'https://example.test/a.png', state);
    const monster = roster.MONSTER_ROSTER.rotek;
    delete monster.poses.greet;
    assert.equal(roster.getRunnerReaction('correct', 'rotek').poseSrc, monster.poses.idle);
    assert.equal(roster.getRunnerReaction('stageStart', 'rotek').poseSrc, monster.poses.idle);
});

test('리액션은 표시를 하나만 붙이고 끝나면 지우며 새 리액션이 이전 끝처리를 취소한다', t => {
    // 실제 1.7초를 두 번 기다리지 않도록 가짜 타이머로 시간을 넘긴다(샌드박스는 불러올 때의 setTimeout을 쓴다).
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const sandbox = load();
    const { frame, element } = domOf(sandbox);
    let ended = 0;
    sandbox.MonsterRoster.playReaction(element, 'wave', { onEnd: () => { ended += 100; } });
    assert.ok(element.classes.has('mr-wave'));
    assert.equal(frame.children[0].dataset.kind, 'wave');
    sandbox.MonsterRoster.playReaction(element, 'cross', { onEnd: () => { ended += 1; } });
    assert.ok(!element.classes.has('mr-wave') && element.classes.has('mr-cross'));
    assert.equal(frame.children.length, 1);
    assert.equal(frame.children[0].dataset.kind, 'cross');
    sandbox.MonsterRoster.playReaction(element, null);
    assert.equal(element.classes.size, 0);
    assert.equal(frame.children.length, 0);
    t.mock.timers.tick(1700);
    assert.equal(ended, 0);
    sandbox.MonsterRoster.playReaction(element, 'cheer', { onEnd: () => { ended += 1; } });
    t.mock.timers.tick(1700);
    assert.equal(ended, 1);
    assert.equal(element.classes.size, 0);
    assert.equal(frame.children.length, 0);
});

test('격려 표시는 빨간색을 쓰지 않고 동작 감소 설정을 지킨다', () => {
    const sandbox = load();
    const { head, element } = domOf(sandbox);
    sandbox.MonsterRoster.playReaction(element, 'cross');
    sandbox.MonsterRoster.playReaction(element, null);
    assert.equal(head.length, 1);
    const css = head[0].textContent;
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css.slice(css.indexOf('prefers-reduced-motion')), /#cheerMonster/);
    for (const rule of css.match(/\[data-kind="cross"\][^{]*\{[^}]*\}/g))
        assert.doesNotMatch(rule, /red|#f00|#ef4444|#dc2626/i, rule);
});

test('그림이 실패하면 대체 그림으로 내려가고 실패한 주소를 다시 부르지 않는다', () => {
    const { MonsterRoster: roster } = load();
    const sprite = 'https://example.test/broken.png';
    const img = { style: {}, src: './start.png', getAttribute() { return this.src; } };
    roster.setPoseImage(img, sprite);
    assert.equal(img.src, sprite);
    img.onerror();
    const idle = roster.MONSTER_ROSTER.clay_bite.poses.idle;
    assert.equal(img.src, idle);
    roster.setPoseImage(img, sprite);
    assert.equal(img.src, idle);
    img.onerror();
    assert.equal(img.style.visibility, 'hidden');
    assert.equal(img.onerror, null);
    const daughter = { style: {}, src: './start.png', getAttribute() { return this.src; } };
    roster.setPoseImage(daughter, 'https://example.test/partner.png', 'daughter');
    daughter.onerror();
    assert.equal(daughter.src, './assets/images/characters/minseo_3d_single.png');
    daughter.onerror();
    assert.equal(daughter.src, './assets/images/minseo-char1.png');
});

test('완주 창 파트너는 그림이 실패하면 원래 아이콘으로 돌아간다', () => {
    const sandbox = load();
    domOf(sandbox);
    const container = { textContent: '🏆', style: {}, replaceChildren(node) { this.child = node; this.textContent = ''; },
        append() {}, querySelector() { return null; } };
    const made = [];
    const baseCreate = sandbox.document.createElement;
    sandbox.document.createElement = tag => {
        const node = baseCreate(tag);
        node.classList = { add() {}, remove() {} };
        node.parentElement = container;
        made.push(node);
        return node;
    };
    assert.equal(sandbox.MonsterRoster.mountCheerPartner(container, null, '용'), false);
    assert.equal(sandbox.MonsterRoster.mountCheerPartner(container, './a.png', '용'), true);
    assert.equal(container.child.src, './a.png');
    made.find(node => node.src === './a.png').onerror();
    assert.equal(container.textContent, '🏆');
});

test('러너와 레슨은 채점·보상 호출을 그대로 두고 리액션만 연결한다', () => {
    const runner = readFileSync(new URL('../kids/subjects/quest/quest-runner.js', import.meta.url), 'utf8');
    const lesson = readFileSync(new URL('../kids/subjects/quest/quest-lesson-ui.js', import.meta.url), 'utf8');
    for (const call of ["playSound('correct')", "playSound('wrong')", 'fairyPraise()', 'fairyEncourage()', 'fairyReward()', 'hearts - 1'])
        assert.ok(runner.includes(call), call);
    assert.match(lesson, /onEncourage: \(\) => \{ root\.fairyEncourage\?\.\(\); onCompanion\?\.\('encourage'/);
    assert.match(lesson, /onPraise: \(\) => \{ root\.fairyPraise\?\.\(\); onCompanion\?\.\('correct'/);
    assert.ok(!/playSound|hearts/.test(lesson), '레슨에 경고음·하트를 넣지 않는다');
});
