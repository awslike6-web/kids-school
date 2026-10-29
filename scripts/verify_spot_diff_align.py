"""외부 사진·네트워크 없이 결정적인 그림으로 맞춤·합성을 검증한다."""
from __future__ import annotations

import contextlib
import io
import json
import subprocess
import sys
import tempfile
from unittest.mock import patch
from pathlib import Path

import spot_diff_align as tool


def fixture(seed=20261029):
    np, cv = tool.np, tool.cv2
    rng = np.random.default_rng(seed)
    original = rng.integers(170, 200, (800, 1200, 3), dtype=np.uint8)
    for y in range(0, 800, 70):
        cv.line(original, (0, y), (1199, y), (90, 90, 90), 2)
    for x in range(0, 1200, 70):
        cv.line(original, (x, 0), (x, 799), (90, 90, 90), 2)
    for _ in range(550):
        x, y = rng.integers([15, 15], [1185, 785])
        color = tuple(int(n) for n in rng.integers(0, 255, 3))
        cv.circle(original, (int(x), int(y)), int(rng.integers(3, 13)), color, -1)
    centers = [(300, 240), (660, 400), (936, 560)]
    for x, y in centers:
        cv.rectangle(original, (x-55, y-55), (x+55, y+55), (235, 235, 235), -1)
    cv.rectangle(original, (270, 215), (330, 265), (220, 20, 20), -1)
    cv.rectangle(original, (906, 535), (966, 585), (20, 20, 220), -1)
    edited = original.copy()
    cv.rectangle(edited, (270, 215), (330, 265), (20, 200, 20), -1)
    cv.circle(edited, (660, 400), 27, (20, 20, 220), -1)
    cv.rectangle(edited, (906, 535), (966, 585), (235, 235, 235), -1)
    watermark = (1100, 725)
    cv.rectangle(edited, (1075, 712), (1125, 738), (255, 255, 255), -1)
    matrix = cv.getRotationMatrix2D((0, 0), 1, 1.5)
    matrix[:, 2] += [-40, 25]
    ai = cv.warpAffine(edited, matrix, (1800, 1200), flags=cv.INTER_LANCZOS4)
    noise = rng.integers(-2, 3, ai.shape, dtype=np.int16)
    ai = np.clip(ai.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    spots = [{'x': x/1200, 'y': y/800, 'r': .07, 'hint': f'바뀐 도형 {i+1}'}
             for i, (x, y) in enumerate(centers)]
    return original, ai, spots, watermark


def checked(condition, message):
    if not condition:
        raise AssertionError(message)


def run_cli(args):
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream):
        code = tool.main(args)
    return code, stream.getvalue()


def save_rgb(path, array):
    encoded = tool.cv2.imencode('.png', tool.cv2.cvtColor(array, tool.cv2.COLOR_RGB2BGR))[1]
    encoded.tofile(str(path))


def main():
    if tool.cv2 is None or tool.np is None:
        print('건너뜀: opencv-python-headless 미설치')
        return 0
    np, cv = tool.np, tool.cv2
    original, ai, spots, watermark = fixture()
    analyzed = tool.analyze_arrays(original, ai)
    checked(analyzed['report']['passed'], f'정상 맞춤 실패: {analyzed["report"]}')
    for spot in spots:
        checked(any(np.hypot((spot['x']-c['x'])*1200, (spot['y']-c['y'])*800) < 24
                    for c in analyzed['candidates']), f'실제 변화 후보 누락: {spot}')
    print('통과: 확대·이동·회전·잡음이 있는 그림의 맞춤과 실제 후보 3곳')
    composed = tool.compose_arrays(analyzed, spots)
    checked(composed['report']['passed'], f'정상 합성 실패: {composed["report"]}')
    result, alpha = composed['result'], composed['alpha']
    checked(result.shape == original.shape, '원본과 결과 크기 불일치')
    checked(np.array_equal(result[alpha == 0], original[alpha == 0]), '선택 밖 원본 픽셀 변경')
    x, y = watermark
    checked(np.array_equal(result[y-16:y+17, x-28:x+29], original[y-16:y+17, x-28:x+29]), '워터마크 자리 복원 실패')
    checked(np.any(result != original), '합성이 아무것도 바꾸지 않음')
    checked(tool.compose_arrays(analyzed, spots, color_match=False)['report']['passed'], '색 맞춤 끄기 실패')
    print('통과: 동일 크기·마스크 밖 바이트 보존·워터마크 제외')
    again = tool.compose_arrays(tool.analyze_arrays(original, ai), spots)
    checked(np.array_equal(result, again['result']), '동일 입력의 결과가 다름')
    print('통과: 맞춤부터 다시 계산한 합성 결과의 결정성')

    root = tool.PROJECT / 'uploads/ex/갤러리/_spotdiff_work'
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='self-test-', dir=root) as temp:
        work = Path(temp)
        checked(work.resolve().is_relative_to(root.resolve()), '임시 정리 경로 이탈')
        orig_path, ai_path = work/'원본.png', work/'AI.png'
        save_rgb(orig_path, original); save_rgb(ai_path, ai)
        spots_path = work/'spots.json'
        spots_path.write_text(json.dumps(spots, ensure_ascii=False), encoding='utf-8')
        common = ['--original', str(orig_path), '--ai', str(ai_path)]
        out = work/'성공'
        code, _ = run_cli(['analyze', *common, '--out', str(out)])
        checked(code == 0 and all((out/name).exists() for name in ('aligned.png', 'review.jpg', 'candidates.json', 'report.json')), 'analyze CLI 출력')
        candidates = json.loads((out/'candidates.json').read_text(encoding='utf-8'))
        checked(all(c['hint'] == '' for c in candidates), '후보 힌트가 자동 확정됨')
        code, text = run_cli(['compose', *common, '--spots', str(spots_path), '--out', str(out)])
        checked(code == 0 and '--diff-file' in text and '--diff-spots' in text, 'compose CLI 출력')
        checked(all((out/name).exists() for name in ('원본_diff.jpg', 'check.jpg', 'report.json')), '합성 파일 누락')
        print('통과: 두 CLI의 산출물·부모 확인용 빈 힌트·등록 옵션 출력')

        unrelated = np.random.default_rng(21).integers(0, 256, original.shape, dtype=np.uint8)
        extreme = cv.warpPerspective(original, np.array([[1., .2, 30], [.1, 1., 10], [.006, .004, 1.]]), (1200, 800))
        repaint = original.copy(); repaint[:560] = (30, 100, 180)
        for name, picture in [('무관한 그림', unrelated), ('큰 원근 변화', extreme), ('70% 다시 칠함', repaint)]:
            path = work/f'{name}.png'; save_rgb(path, picture)
            refused = work/f'거부-{name}'
            code, text = run_cli(['compose', '--original', str(orig_path), '--ai', str(path),
                                  '--spots', str(spots_path), '--out', str(refused)])
            checked(code == 1 and not refused.exists(), f'{name} 거부·무출력 실패: {text}')
        # 실패한 compose는 기존 analyze 결과도 덮어쓰지 않는다.
        before = {p.name: p.read_bytes() for p in out.iterdir()}
        code, _ = run_cli(['compose', '--original', str(orig_path), '--ai', str(work/'무관한 그림.png'),
                           '--spots', str(spots_path), '--out', str(out)])
        checked(code == 1 and before == {p.name: p.read_bytes() for p in out.iterdir()}, '실패 시 기존 산출물 변경')
        print('통과: 무관·강한 원근·70% 재칠 거부, 실패 시 새 파일·기존 파일 변경 없음')

        # 아카이브 경로 계약은 임시 폴더로 고립시켜 ID와 누끼·경로 탈출을 검사한다.
        (work/'kids/data').mkdir(parents=True)
        data_path = work/'kids/data/gallery-data.js'
        def entry(url=tool.CDN+'assets/media/minsu/test.jpg', **extra):
            data_path.write_text('const DEFAULT_GALLERY_DATA = '+json.dumps([{'id':'test','imageUrl':url, **extra}])+';', encoding='utf-8')
        with patch.object(tool, 'PROJECT', work), patch.object(tool, 'ARCHIVE', work/'archive'):
            entry()
            checked(tool.resolve_original('test', None) == (work/'archive/assets/media/minsu/test.jpg').resolve(), '작품 ID의 아카이브 매핑 실패')
            for options in [{'hasCutout':True}, {'url': tool.CDN+'../../outside.jpg'}]:
                entry(**options)
                try:
                    tool.resolve_original('test', None)
                except ValueError:
                    pass
                else:
                    raise AssertionError('누끼 또는 아카이브 경로 탈출 허용')
        image = tool.Image.new('RGB', (20, 10), 'red'); exif = image.getexif(); exif[274] = 6
        image.save(work/'회전.jpg', exif=exif)
        checked(tool.read_rgb(work/'회전.jpg', original=True).shape == (20, 10, 3), 'EXIF 회전 보정 실패')
        tool.Image.new('RGBA', (10, 10), (255, 0, 0, 0)).save(work/'투명.png')
        checked(np.all(tool.read_rgb(work/'투명.png') == 255), 'AI 알파의 흰 바탕 합성 실패')
        try:
            tool.read_rgb(work/'투명.png', original=True)
        except ValueError:
            pass
        else:
            raise AssertionError('투명 원본 허용')
        try:
            tool.protect_inputs(work, ['원본.png'], [orig_path])
        except ValueError:
            pass
        else:
            raise AssertionError('출력이 원본을 덮어씀')
        print('통과: ID 경로·누끼 거부·EXIF·흰 바탕·입력 덮어쓰기 방지')

        moved = original.copy()
        cv.rectangle(moved, (270, 215), (330, 265), (20, 200, 20), -1)
        cv.circle(moved, (660, 400), 27, (20, 20, 220), -1)
        cv.rectangle(moved, (906, 535), (966, 585), (235, 235, 235), -1)
        cv.rectangle(moved, (906, 215), (966, 265), (20, 20, 220), -1)
        moving_spots = spots[:2] + [{**spots[2], 'y': .3}]
        move_result = tool.compose_arrays(tool.analyze_arrays(original, moved), moving_spots)
        checked(move_result['report']['passed'] and move_result['unselected'], '옮긴 물건의 이전 자리 경고 누락')
        checked(any('선택하지 않은 큰 변화' in w for w in move_result['report']['warnings']), '이동 안내 누락')
        print('통과: 물건의 새 자리만 선택하면 이전 자리 경고')

        # 덮이지 않는 가장자리를 지정하면 합성 파일을 만들지 않는다.
        bad_spots = [{**spots[0], 'x': 0., 'y': 0.}, *spots[1:]]
        edge_result = tool.compose_arrays(analyzed, bad_spots)
        checked(not edge_result['report']['passed'], 'AI 영역 밖 합성 허용')
        for bad in [[{}], [{**s, 'hint': ''} for s in spots]]:
            spots_path.write_text(json.dumps(bad), encoding='utf-8')
            refused = work/'좌표오류'
            code, _ = run_cli(['compose', *common, '--spots', str(spots_path), '--out', str(refused)])
            checked(code == 1 and not refused.exists(), '빌더 좌표 검증 재사용 실패')
        # OpenCV가 없는 실행 환경에서 도구는 2, 자체 시험은 0으로 끝난다.
        prefix = "import sys;sys.modules['cv2']=None;sys.path.insert(0,sys.argv[1]);"
        for script, expected in [('spot_diff_align', 2), ('verify_spot_diff_align', 0)]:
            expression = prefix + ("import spot_diff_align as m;sys.exit(m.main(['analyze','--original','none','--ai','none']))"
                                   if script == 'spot_diff_align' else 'import verify_spot_diff_align as m;sys.exit(m.main())')
            proc = subprocess.run([sys.executable, '-X', 'utf8', '-c', expression, str(Path(__file__).parent)],
                                  capture_output=True, text=True, encoding='utf-8')
            checked(proc.returncode == expected, f'{script} 미설치 종료 코드: {proc.stderr}')
        print('통과: 덮임·좌표 오류 거부, OpenCV 미설치 안내·종료 코드')
    print('전체 통과: 틀린그림 자동 맞춤·합성 자체 시험')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f'실패: {error}')
        raise SystemExit(1)
