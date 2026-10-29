"""AI 편집본을 원본에 맞추고 부모가 선택한 변화만 합성하는 로컬 도구."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image, ImageDraw, ImageFont, ImageOps

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = np = None

# 품질 기준은 여기에 한 벌만 유지한다. 픽셀 수치는 최종 원본 해상도 기준이다.
MAX_FEATURES = 4000
MATCH_RATIO = .75
RANSAC_PX = 3.0
MIN_INLIERS = 30
MAX_REPROJECTION_PX = 1.5
MAX_BACKGROUND_DIFF = 12
MIN_SCALE, MAX_SCALE = .2, 5.0
MAX_PERSPECTIVE = .002
MAX_CHANGED_RATIO = .40
MIN_COMPONENT_RATIO = .0015
LARGE_CHANGE_RATIO = .005
MAX_CANDIDATES = 8
DEFAULT_THRESHOLD = 40
PROJECT = Path(__file__).resolve().parent.parent
ARCHIVE = Path('G:/master-tower/kids-archive')
CDN = 'https://raw.githubusercontent.com/awslike6-web/kids-archive/main/'


def require_dependencies():
    if cv2 is None or np is None:
        raise ImportError('OpenCV가 필요합니다. python -m pip install opencv-python-headless')


def validate_spots(spots):
    """빌더의 원본 검증을 불러온다. 등록·파일 변환은 실행하지 않는다."""
    spec = importlib.util.spec_from_file_location('gallery_contract', Path(__file__).with_name('build_gallery.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.validate_diff_spots(spots)


def read_rgb(path, *, original=False):
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        rgba = image.convert('RGBA')
        if original and rgba.getchannel('A').getextrema()[0] < 255:
            raise ValueError('투명한 누끼 원본은 지원하지 않아요')
        background = Image.new('RGBA', rgba.size, 'white')
        rgb = Image.alpha_composite(background, rgba).convert('RGB')
        return np.array(rgb)


def resolve_original(item_id, original):
    if original:
        return Path(original).resolve()
    text = (PROJECT / 'kids/data/gallery-data.js').read_text(encoding='utf-8')
    marker = 'const DEFAULT_GALLERY_DATA = '
    items, _ = json.JSONDecoder().raw_decode(text.split(marker, 1)[1].lstrip())
    item = next((item for item in items if item.get('id') == item_id), None)
    if not item:
        raise ValueError(f'갤러리에서 작품을 찾지 못했어요: {item_id}')
    if item.get('hasCutout'):
        raise ValueError('누끼 작품은 지원하지 않아요')
    url = item.get('imageUrl', '')
    if not url.startswith(CDN):
        raise ValueError('원본 주소가 성장 아카이브 CDN이 아니에요')
    relative = unquote(urlparse(url).path.split('/main/', 1)[1])
    path = (ARCHIVE / relative).resolve()
    if not path.is_relative_to(ARCHIVE.resolve()) or not relative.startswith('assets/media/'):
        raise ValueError('아카이브 원본 경로가 올바르지 않아요')
    return path


def kernel(radius):
    radius = max(1, int(round(radius)))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))


def transform_ok(matrix, points):
    if matrix is None or not np.isfinite(matrix).all() or abs(matrix[2, 2]) < 1e-10 or not len(points):
        return False
    h = matrix / matrix[2, 2]
    if np.max(np.abs(h[2, :2])) > MAX_PERSPECTIVE:
        return False
    p = points.reshape(-1, 1, 2).astype(np.float64)
    center = cv2.perspectiveTransform(p, h)
    lengths = [np.linalg.norm(cv2.perspectiveTransform(p + shift, h) - center, axis=2)
               for shift in (np.array([1., 0.]), np.array([0., 1.]))]
    return all(np.isfinite(x).all() and x.min() >= MIN_SCALE and x.max() <= MAX_SCALE for x in lengths)


def components(original, aligned, coverage, threshold):
    difference = np.max(np.abs(original.astype(np.int16) - aligned.astype(np.int16)), axis=2)
    binary = ((difference > threshold) & coverage).astype(np.uint8) * 255
    opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    grouped = cv2.dilate(opened, kernel(min(original.shape[:2]) * .02))
    grouped[~coverage] = 0
    count, labels, stats, centers = cv2.connectedComponentsWithStats(grouped)
    return difference, opened, labels, stats, centers, count


def candidate_spots(labels, stats, centers, coverage):
    height, width = labels.shape
    border = coverage & ~cv2.erode(coverage.astype(np.uint8), np.ones((3, 3), np.uint8),
                                  borderType=cv2.BORDER_CONSTANT, borderValue=1).astype(bool)
    edge_labels = set(np.unique(labels[border]))
    candidates, warnings = [], []
    order = sorted(range(1, len(stats)), key=lambda i: (-int(stats[i, cv2.CC_STAT_AREA]), i))
    for label in order:
        if stats[label, cv2.CC_STAT_AREA] < width * height * MIN_COMPONENT_RATIO or label in edge_labels:
            continue
        x, y = centers[label]
        ys, xs = np.where(labels == label)
        radius = float(np.hypot(xs - x, ys - y).max()) / min(height, width)
        candidates.append({'x': round(float(x) / width, 3), 'y': round(float(y) / height, 3),
                           'r': round(float(np.clip(radius, .03, .15)), 3), 'hint': ''})
        if radius > .15:
            warnings.append(f'후보 {len(candidates)}: 영역이 커서 두 곳 이상이 붙었을 수 있어요')
        if len(candidates) == MAX_CANDIDATES:
            break
    return candidates, warnings


def quality_reasons(report):
    reasons = []
    if not report['transform_valid']:
        reasons.append('그림의 배율이나 원근 변화가 너무 커요')
    if report['inliers'] < MIN_INLIERS:
        reasons.append('맞출 단서가 부족해요')
    if report['reprojection_median_px'] is None or report['reprojection_median_px'] > MAX_REPROJECTION_PX:
        reasons.append('그림 위치가 정확하게 맞지 않아요')
    if report['background_gray_median'] is None or report['background_gray_median'] > MAX_BACKGROUND_DIFF:
        reasons.append('바꾸지 않은 배경도 원본과 많이 달라요')
    return reasons


def analyze_arrays(original, ai, threshold=DEFAULT_THRESHOLD):
    require_dependencies()
    cv2.setRNGSeed(0)
    cv2.setNumThreads(1)
    gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY)
    ai_gray = cv2.cvtColor(ai, cv2.COLOR_RGB2GRAY)
    sift = cv2.SIFT_create(nfeatures=MAX_FEATURES)
    keys, desc = sift.detectAndCompute(gray, None)
    ai_keys, ai_desc = sift.detectAndCompute(ai_gray, None)
    pairs = cv2.BFMatcher(cv2.NORM_L2).knnMatch(ai_desc, desc, k=2) if (
        desc is not None and ai_desc is not None and len(desc) >= 2) else []
    matches = [pair[0] for pair in pairs if len(pair) == 2 and pair[0].distance < MATCH_RATIO * pair[1].distance]
    src = np.float32([ai_keys[m.queryIdx].pt for m in matches]).reshape(-1, 2)
    dst = np.float32([keys[m.trainIdx].pt for m in matches]).reshape(-1, 2)
    matrix = inlier_mask = None
    method = '호모그래피'
    if len(matches) >= 4:
        matrix, inlier_mask = cv2.findHomography(src, dst, cv2.RANSAC, RANSAC_PX)
    inliers = inlier_mask.ravel().astype(bool) if inlier_mask is not None else np.zeros(len(matches), bool)
    if not transform_ok(matrix, src[inliers]) and len(matches) >= 3:
        affine, mask = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=RANSAC_PX)
        matrix = np.vstack((affine, [0., 0., 1.])) if affine is not None else None
        inliers = mask.ravel().astype(bool) if mask is not None else np.zeros(len(matches), bool)
        method = '부분 아핀'
    valid = transform_ok(matrix, src[inliers])
    height, width = original.shape[:2]
    aligned = np.zeros_like(original)
    coverage = np.zeros((height, width), bool)
    error = None
    if valid:
        matrix = matrix / matrix[2, 2]
        projected = cv2.perspectiveTransform(src[inliers].reshape(-1, 1, 2), matrix).reshape(-1, 2)
        error = float(np.median(np.linalg.norm(projected - dst[inliers], axis=1)))
        aligned = cv2.warpPerspective(ai, matrix, (width, height), flags=cv2.INTER_LANCZOS4)
        coverage = cv2.warpPerspective(np.ones(ai.shape[:2], np.uint8), matrix, (width, height),
                                       flags=cv2.INTER_NEAREST).astype(bool)
    difference, opened, labels, stats, centers, _ = components(original, aligned, coverage, threshold)
    background = coverage & (labels == 0)
    gray_difference = np.abs(gray.astype(np.int16) - cv2.cvtColor(aligned, cv2.COLOR_RGB2GRAY).astype(np.int16))
    candidates, warnings = candidate_spots(labels, stats, centers, coverage)
    report = {'matches': len(matches), 'inliers': int(inliers.sum()), 'method': method,
              'transform_valid': bool(valid), 'transform': matrix.tolist()
              if matrix is not None and np.isfinite(matrix).all() else None,
              'reprojection_median_px': error, 'background_gray_median': float(np.median(gray_difference[background]))
              if background.any() else None, 'coverage_ratio': float(coverage.mean()),
              'changed_ratio': float((opened > 0).mean()), 'threshold': threshold,
              'original_size': [width, height], 'ai_size': [ai.shape[1], ai.shape[0]],
              'candidate_count': len(candidates), 'warnings': warnings}
    report['reasons'] = quality_reasons(report)
    report['passed'] = not report['reasons']
    return {'original': original, 'aligned': aligned, 'coverage': coverage, 'labels': labels,
            'stats': stats, 'centers': centers, 'difference': difference, 'candidates': candidates, 'report': report}


def select_regions(analysis, spots):
    labels = analysis['labels']
    height, width = labels.shape
    chosen = set()
    fallback = np.zeros_like(labels, np.uint8)
    for spot in spots:
        circle = np.zeros_like(fallback)
        center = (round(spot['x'] * width), round(spot['y'] * height))
        radius = max(1, round(spot['r'] * min(height, width)))
        cv2.circle(circle, center, round(radius * 1.2), 255, -1)
        intersecting = set(np.unique(labels[circle > 0])) - {0}
        chosen.update(intersecting)
        if not intersecting:
            cv2.circle(fallback, center, radius, 255, -1)
    selected = np.isin(labels, sorted(chosen)).astype(np.uint8) * 255
    selected = cv2.bitwise_or(selected, fallback)
    return selected, chosen


def compose_arrays(analysis, spots, color_match=True):
    validate_spots(spots)
    report = {**analysis['report'], 'warnings': list(analysis['report']['warnings']),
              'reasons': list(analysis['report']['reasons'])}
    original, aligned, coverage = analysis['original'], analysis['aligned'], analysis['coverage']
    if report['changed_ratio'] >= MAX_CHANGED_RATIO:
        report['reasons'].append('AI가 그림을 너무 많이 바꿨어요. 구도와 시점을 그대로 두고 다시 편집해 주세요')
    selected, chosen = select_regions(analysis, spots)
    count, regions = cv2.connectedComponents(selected)
    short = min(original.shape[:2])
    radius = max(1, round(short * .015))
    spot_coverage = []
    for spot in spots:
        mask, _ = select_regions(analysis, [spot])
        mask = cv2.GaussianBlur(cv2.dilate(mask, kernel(radius)),
                                (2 * radius + 1, 2 * radius + 1), max(1., radius / 3))
        support = mask > 0
        spot_coverage.append(float(coverage[support].mean()) if support.any() else 0.)
    report['spot_coverage_ratios'] = spot_coverage
    alpha = np.zeros(selected.shape, np.float32)
    corrected = aligned.astype(np.float32).copy()
    region_coverage = []
    for i in range(1, count):
        region = (regions == i).astype(np.uint8) * 255
        expanded = cv2.dilate(region, kernel(radius))
        softened = cv2.GaussianBlur(expanded, (2 * radius + 1, 2 * radius + 1), max(1., radius / 3))
        support = softened > 0
        ratio = float(coverage[support].mean()) if support.any() else 0.
        region_coverage.append(ratio)
        if ratio != 1.:
            report['reasons'].append('선택 영역에 AI 그림이 없는 곳이 있어요. 가장자리에서 더 안쪽을 골라 주세요')
        if color_match:
            ring = (cv2.dilate(expanded, kernel(short * .02)) > 0) & ~support & coverage & (analysis['labels'] == 0)
            if ring.sum() >= 16:
                a, b = aligned[ring].astype(np.float32), original[ring].astype(np.float32)
                gain = np.clip(b.std(axis=0) / np.maximum(a.std(axis=0), 1.), .8, 1.25)
                corrected[support] = np.clip(aligned[support] * gain + b.mean(axis=0) - a.mean(axis=0) * gain, 0, 255)
            else:
                report['warnings'].append('색을 맞출 바깥 고리가 부족해서 이 영역의 색은 그대로 두었어요')
        alpha = np.maximum(alpha, softened.astype(np.float32) / 255)
    report['region_coverage_ratios'] = region_coverage
    report['composite_ratio'] = float((alpha > 0).mean())
    report['passed'] = not report['reasons']
    if not report['passed']:
        return {'result': None, 'alpha': alpha, 'report': report, 'unselected': []}
    large = [i for i in range(1, len(analysis['stats'])) if i not in chosen and
             analysis['stats'][i, cv2.CC_STAT_AREA] >= selected.size * LARGE_CHANGE_RATIO]
    report['unselected_large_changes'] = [{'label': i, 'bbox': analysis['stats'][i, :4].tolist(),
        'area_ratio': float(analysis['stats'][i, cv2.CC_STAT_AREA] / selected.size)} for i in large]
    if large:
        report['warnings'].append(f'선택하지 않은 큰 변화 {len(large)}곳은 원본으로 되돌렸어요. '
                                  '옮긴 물건의 원래 자리였다면 그 자리도 정답으로 넣어 주세요.')
    result = original.copy()
    support = alpha > 0
    weight = alpha[support, None]
    result[support] = np.clip(np.rint(corrected[support] * weight + original[support] * (1 - weight)), 0, 255).astype(np.uint8)
    assert result.shape == original.shape
    assert np.array_equal(result[~support], original[~support])
    return {'result': result, 'alpha': alpha, 'report': report, 'unselected': large}


def review_image(analysis, image, spots, unselected=()):
    original = analysis['original']
    height, width = original.shape[:2]
    overlay = image.copy()
    difference = np.max(np.abs(original.astype(np.int16) - image.astype(np.int16)), axis=2)
    different = (difference > analysis['report']['threshold']) & analysis['coverage']
    overlay[different] = (overlay[different] * .45 + np.array([255, 0, 0]) * .55).astype(np.uint8)
    for i, spot in enumerate(spots, 1):
        center = (round(spot['x'] * width), round(spot['y'] * height))
        radius = round(spot['r'] * min(height, width))
        cv2.circle(overlay, center, radius, (0, 255, 130), 3)
        cv2.putText(overlay, str(i), center, cv2.FONT_HERSHEY_SIMPLEX, .8, (0, 255, 130), 2)
    for label in unselected:
        x, y, w, h = analysis['stats'][label, :4]
        for start, end in [((x, y), (x+w, y)), ((x, y+h), (x+w, y+h)),
                           ((x, y), (x, y+h)), ((x+w, y), (x+w, y+h))]:
            length = max(abs(end[0]-start[0]), abs(end[1]-start[1]))
            for offset in range(0, int(length), 16):
                a = tuple(round(start[k] + (end[k]-start[k])*offset/max(1, length)) for k in (0, 1))
                b = tuple(round(start[k] + (end[k]-start[k])*min(length, offset+8)/max(1, length)) for k in (0, 1))
                cv2.line(overlay, a, b, (255, 220, 0), 3)
    panel_w = min(800, width)
    panel_h = round(height * panel_w / width)
    review = Image.new('RGB', (panel_w*3, panel_h+38), 'white')
    font_path = Path('C:/Windows/Fonts/malgun.ttf')
    font = ImageFont.truetype(str(font_path), 20) if font_path.exists() else ImageFont.load_default()
    draw = ImageDraw.Draw(review)
    for i, (array, title) in enumerate(zip((original, image, overlay), ('원본', '맞춤 / 합성 결과', '차이·좌표 (노랑: 선택 안 함)'))):
        review.paste(Image.fromarray(array).resize((panel_w, panel_h), Image.Resampling.LANCZOS), (i*panel_w, 38))
        draw.text((i*panel_w+8, 5), title, fill='black', font=font)
    return review


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def protect_inputs(out, names, inputs):
    sources = {Path(p).resolve() for p in inputs if p is not None}
    if any((out / name).resolve() in sources for name in names):
        raise ValueError('출력 이름이 입력 파일과 같아요. 다른 작업 폴더를 골라 주세요')


def main(argv=None):
    parser = argparse.ArgumentParser(description='AI 틀린그림 자동 맞춤·선택 합성 (로컬 전용)')
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ('analyze', 'compose'):
        command = commands.add_parser(name)
        source = command.add_mutually_exclusive_group(required=True)
        source.add_argument('--id', help='등록된 작품 ID')
        source.add_argument('--original', help='원본 파일 경로')
        command.add_argument('--ai', required=True, help='AI 편집본 파일 경로')
        command.add_argument('--out', help='작업 폴더')
        command.add_argument('--threshold', type=int, default=DEFAULT_THRESHOLD, help='차이 문턱값 (1~255)')
        if name == 'compose':
            command.add_argument('--spots', required=True, help='부모가 확인한 좌표 JSON 파일')
            command.add_argument('--no-color-match', action='store_true', help='색 맞춤 끄기')
    args = parser.parse_args(argv)
    try:
        require_dependencies()
        if not 1 <= args.threshold <= 255:
            raise ValueError('차이 문턱값은 1~255여야 해요')
        spots = None
        if args.command == 'compose':
            spots = json.loads(Path(args.spots).read_text(encoding='utf-8-sig'))
            validate_spots(spots)
        original_path = resolve_original(args.id, args.original)
        original, ai = read_rgb(original_path, original=True), read_rgb(args.ai)
        analysis = analyze_arrays(original, ai, args.threshold)
        token = args.id or original_path.stem
        if Path(token).name != token or token in ('.', '..'):
            raise ValueError('작업 폴더 이름이 올바르지 않아요')
        out = Path(args.out) if args.out else PROJECT / 'uploads/ex/갤러리/_spotdiff_work' / token
        if args.command == 'compose':
            composed = compose_arrays(analysis, spots, not args.no_color_match)
            report = composed['report']
            if not report['passed']:
                print('❌ [맞춤 실패] ' + ' / '.join(report['reasons']))
                return 1
            result = composed['result']
            assert result.shape == original.shape
            preview = review_image(analysis, result, spots, composed['unselected'])
            output = out / f'{original_path.stem}_diff.jpg'
            protect_inputs(out, [output.name, 'check.jpg', 'report.json'], [original_path, args.ai, args.spots])
            out.mkdir(parents=True, exist_ok=True)
            Image.fromarray(result).save(output, quality=92)
            preview.save(out / 'check.jpg', quality=92)
            write_json(out / 'report.json', report)
            print(f'✅ 합성 완료: {output.resolve()}')
            print(f'--diff-file "{output.resolve()}"\n--diff-spots "{Path(args.spots).resolve()}"')
        else:
            report = analysis['report']
            aligned = analysis['aligned'].copy()
            shown = aligned.copy(); shown[~analysis['coverage']] = 255
            preview = review_image(analysis, shown, analysis['candidates'])
            protect_inputs(out, ['aligned.png', 'candidates.json', 'review.jpg', 'report.json'], [original_path, args.ai])
            out.mkdir(parents=True, exist_ok=True)
            rgba = np.dstack((aligned, analysis['coverage'].astype(np.uint8)*255))
            Image.fromarray(rgba).save(out / 'aligned.png')
            write_json(out / 'candidates.json', analysis['candidates'])
            preview.save(out / 'review.jpg', quality=92)
            write_json(out / 'report.json', report)
            print(('✅ 분석 완료: ' + str(out.resolve())) if report['passed'] else
                  '❌ [맞춤 실패] ' + ' / '.join(report['reasons']))
        for warning in report['warnings']:
            print('⚠️ ' + warning)
        return 0 if report['passed'] else 1
    except ImportError as error:
        print(str(error)); return 2
    except (OSError, ValueError, KeyError, IndexError, cv2.error if cv2 is not None else RuntimeError) as error:
        print(f'❌ 처리하지 못했어요: {error}'); return 1


if __name__ == '__main__':
    raise SystemExit(main())
