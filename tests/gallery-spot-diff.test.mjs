import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const { sandbox } = loadBrowserScripts(['kids/common_space/gallery-spot-diff.js']);
const api = sandbox.GallerySpotDiff;
const spot = (x = .5, y = .5, r = .08, hint = '달라진 곳') => ({ x, y, r, hint });
const data = () => ({ modifiedImageUrl: 'https://example.test/diff.jpg', spots: [spot(.2), spot(.5), spot(.8)] });
const plain = obj => JSON.parse(JSON.stringify(obj));
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);

test('불러올 때 DOM에 접근하거나 다른 전역을 만들지 않는다', () => {
    assert.equal(sandbox.document, undefined);
    assert.deepEqual(Object.keys(api).sort(), ['close', 'fitRect', 'hitTest', 'isValid', 'open', 'toNormalized']);
    api.close(); api.close();
});

test('fitRect: 가로·세로 상자에서 비율과 가운데 정렬을 유지한다', () => {
    assert.deepEqual(plain(api.fitRect(800, 200, 400, 400)), { x: 300, y: 0, w: 200, h: 200 });
    assert.deepEqual(plain(api.fitRect(200, 800, 400, 400)), { x: 0, y: 300, w: 200, h: 200 });
    const rect = api.fitRect(360, 500, 1200, 800);
    approx(rect.w / rect.h, 1.5); approx(rect.x * 2 + rect.w, 360); approx(rect.y * 2 + rect.h, 500);
    assert.deepEqual(plain(api.fitRect(0, 200, 400, 400)), { x: 0, y: 0, w: 0, h: 0 });
});

test('toNormalized: 네 모서리와 레터박스 경계를 구별한다', () => {
    const rect = api.fitRect(800, 200, 400, 400);
    assert.equal(api.toNormalized(299, 100, rect), null);
    assert.equal(api.toNormalized(501, 100, rect), null);
    [[300, 0, 0, 0], [500, 0, 1, 0], [300, 200, 0, 1], [500, 200, 1, 1]].forEach(([x, y, nx, ny]) =>
        assert.deepEqual(plain(api.toNormalized(x, y, rect)), { nx, ny }));
    const tall = api.fitRect(200, 800, 400, 400);
    assert.equal(api.toNormalized(100, 299, tall), null);
    assert.equal(api.toNormalized(100, 501, tall), null);
});

test('hitTest: 원 안/밖, 중복 정답, 겹친 원 중 가장 가까운 미발견 정답', () => {
    const rect = { x: 0, y: 0, w: 400, h: 400 }, spots = [spot(.4), spot(.5)];
    assert.equal(api.hitTest(spots, .4, .5, rect, new Set()), 0);
    assert.equal(api.hitTest(spots, .9, .9, rect, new Set()), -1);
    assert.equal(api.hitTest(spots, .4, .5, rect, new Set([0])), -1);
    assert.equal(api.hitTest(spots, .46, .5, rect, new Set()), 1);
    assert.equal(api.hitTest(spots, .46, .5, rect, new Set([1])), 0);
});

test('hitTest: 짧은 변 반지름을 가로·세로 그림에 동일하게 적용한다', () => {
    const spots = [spot(.5, .5, .1)];
    for (const rect of [{ w: 1000, h: 200 }, { w: 200, h: 1000 }]) {
        assert.equal(api.hitTest(spots, .5 + 19 / rect.w, .5, rect, new Set(), 0), 0);
        assert.equal(api.hitTest(spots, .5 + 21 / rect.w, .5, rect, new Set(), 0), -1);
        assert.equal(api.hitTest(spots, .5, .5 + 21 / rect.h, rect, new Set(), 0), -1);
    }
});

test('hitTest: 작은 정답의 손가락 허용 반경은 CSS 22px이다', () => {
    const rect = { w: 100, h: 200 }, spots = [spot(.5, .5, .03)];
    assert.equal(api.hitTest(spots, .71, .5, rect, new Set()), 0);
    assert.equal(api.hitTest(spots, .73, .5, rect, new Set()), -1);
    assert.equal(api.hitTest(spots, .71, .5, rect, new Set(), 0), -1);
});

test('isValid: 개수·유한 숫자·좌표·반지름·힌트·이미지 계약', () => {
    assert.equal(api.isValid(data()), true);
    assert.equal(api.isValid({ ...data(), spots: [spot(0, 0, .03), spot(1, 1, .15), spot()] }), true);
    for (const spots of [[spot(), spot()], Array.from({ length: 6 }, () => spot())]) {
        assert.equal(api.isValid({ ...data(), spots }), false);
    }
    for (const [key, value] of [
        ['x', -.01], ['x', 1.01], ['y', -.01], ['y', 1.01], ['r', .029], ['r', .151],
        ['x', NaN], ['y', Infinity], ['r', '0.08'], ['x', true],
        ['hint', ''], ['hint', '   '], ['hint', '가'.repeat(31)], ['hint', 123],
    ]) {
        const d = data(); d.spots[0][key] = value;
        assert.equal(api.isValid(d), false, `${key}=${value}`);
    }
    assert.equal(api.isValid({ ...data(), modifiedImageUrl: '' }), false);
    assert.equal(api.isValid({ ...data(), spots: [null, spot(), spot()] }), false);
    assert.equal(api.isValid(null), false);
});

test('생성 갤러리의 spotDiff는 공개 CDN과 데이터 계약을 지킨다', () => {
    const { sandbox: gallery } = loadBrowserScripts(['kids/data/gallery-data.js']);
    for (const item of gallery.DEFAULT_GALLERY_DATA) {
        if (!item.spotDiff) continue;
        assert.ok(api.isValid(item.spotDiff), item.id);
        assert.ok(item.spotDiff.modifiedImageUrl.startsWith('https://raw.githubusercontent.com/awslike6-web/kids-archive/main/'));
    }
});
