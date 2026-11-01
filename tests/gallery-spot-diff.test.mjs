import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const python = process.env.GALLERY_TEST_PYTHON || (process.platform === 'win32' &&
    existsSync('C:/Users/pc/AppData/Local/Python/pythoncore-3.14-64/python.exe') ?
    'C:/Users/pc/AppData/Local/Python/pythoncore-3.14-64/python.exe' : 'python');

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

test('build_spot_diff: 누끼 작품 투명 PNG 합성 및 계약 검증', () => {
    const program = String.raw`
import sys, tempfile
from pathlib import Path
from PIL import Image

source = Path('scripts/build_gallery.py') if Path('scripts/build_gallery.py').exists() else Path('kids-school-main/scripts/build_gallery.py')
sys.path.insert(0, str(source.parent.resolve()))
from build_gallery import build_spot_diff

with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)
    target_dir = tmp_path / 'target'
    folder_full = tmp_path / 'source'
    target_dir.mkdir()
    folder_full.mkdir()

    # 1. 누끼 작품: 20x20 크기, 상단 10줄 불투명 빨강, 하단 10줄 투명
    orig_cutout = folder_full / 'orig_cutout.png'
    cutout_img = Image.new('RGBA', (20, 20), (255, 0, 0, 0))
    for x in range(20):
        for y in range(10):
            cutout_img.putpixel((x, y), (255, 0, 0, 255))
    cutout_img.save(orig_cutout, format='PNG')

    # 변형 그림: 20x20 흰배경 파랑 (0, 0, 255)
    diff_cutout = folder_full / 'diff_cutout.jpg'
    Image.new('RGB', (20, 20), (0, 0, 255)).save(diff_cutout, format='JPEG')

    spots = [
        {'x': 0.2, 'y': 0.2, 'r': 0.05, 'hint': '힌트1'},
        {'x': 0.5, 'y': 0.5, 'r': 0.05, 'hint': '힌트2'},
        {'x': 0.8, 'y': 0.8, 'r': 0.05, 'hint': '힌트3'}
    ]
    data_cutout = {'modifiedImage': 'diff_cutout.jpg', 'spots': spots}

    result = build_spot_diff(data_cutout, 'art_cutout_01', True, str(folder_full),
                             str(orig_cutout), str(target_dir), 'minseo', '2026_elem_1')
    assert result is not None, 'build_spot_diff failed for cutout'
    assert result['modifiedImageUrl'].endswith('.png'), f"Expected .png, got {result['modifiedImageUrl']}"
    assert len(result['spots']) == 3

    target_png = target_dir / 'minseo_diff_cutout.png'
    assert target_png.is_file(), 'Target png does not exist'
    with Image.open(target_png) as saved:
        assert saved.format == 'PNG', f"Expected PNG format, got {saved.format}"
        assert saved.size == (20, 20), f"Expected size (20, 20), got {saved.size}"
        assert saved.getchannel('A').tobytes() == cutout_img.getchannel('A').tobytes(), 'Alpha mismatch'
        r, g, b, a = saved.getpixel((5, 5))
        assert (b > 200 and r < 50), f"RGB should be from diff image, got {(r, g, b)}"

    # 2. 일반 작품: JPEG 품질 85, 알파 없음
    orig_normal = folder_full / 'orig_normal.jpg'
    Image.new('RGB', (20, 20), (100, 100, 100)).save(orig_normal, format='JPEG')
    diff_normal = folder_full / 'diff_normal.jpg'
    Image.new('RGB', (20, 20), (200, 200, 200)).save(diff_normal, format='JPEG')
    data_normal = {'modifiedImage': 'diff_normal.jpg', 'spots': spots}

    res_normal = build_spot_diff(data_normal, 'art_normal_01', False, str(folder_full),
                                 str(orig_normal), str(target_dir), 'minsu', '2026_elem_5')
    assert res_normal is not None, 'build_spot_diff failed for normal'
    assert res_normal['modifiedImageUrl'].endswith('.jpg'), f"Expected .jpg, got {res_normal['modifiedImageUrl']}"
    target_jpg = target_dir / 'minsu_diff_normal.jpg'
    assert target_jpg.is_file(), 'Target jpg does not exist'
    with Image.open(target_jpg) as saved_jpg:
        assert saved_jpg.format == 'JPEG', f"Expected JPEG format, got {saved_jpg.format}"
        assert saved_jpg.mode == 'RGB', f"Expected RGB mode, got {saved_jpg.mode}"

    # 3. 비정상 입력 (비율 불일치 및 잘못된 좌표) -> None 반환
    diff_mismatch = folder_full / 'diff_mismatch.jpg'
    Image.new('RGB', (30, 20), (0, 0, 0)).save(diff_mismatch, format='JPEG')
    assert build_spot_diff({'modifiedImage': 'diff_mismatch.jpg', 'spots': spots},
                           'art_err_01', True, str(folder_full), str(orig_cutout),
                           str(target_dir), 'minseo', '2026_elem_1') is None

    assert build_spot_diff({'modifiedImage': 'diff_cutout.jpg', 'spots': spots[:1]},
                           'art_err_02', True, str(folder_full), str(orig_cutout),
                           str(target_dir), 'minseo', '2026_elem_1') is None

print('ALL SPOT DIFF PYTHON TESTS PASSED')
`;
    const res = spawnSync(python, ['-X', 'utf8', '-c', program], { encoding: 'utf8' });
    assert.equal(res.status, 0, (res.stdout || '') + (res.stderr || ''));
    assert.match(res.stdout, /ALL SPOT DIFF PYTHON TESTS PASSED/);
});
