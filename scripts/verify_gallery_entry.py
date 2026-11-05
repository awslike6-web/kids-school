#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔎 verify_gallery_entry.py — 갤러리 작품·특별한 날 등록 후 점검표
-----------------------------------------------------------
누가 등록하든(agy·Claude·사람) 등록이 끝나면 같은 항목을 같은 방법으로 확인한다.
관제탑 입구 scripts/sync_quick_upload.py가 등록·푸시 뒤에 자동으로 부르고, 단독으로도 쓴다.
읽기만 한다: 파일·Git·노션에 아무것도 쓰지 않는다.

점검 항목 (id마다)
  1. 데이터     special-days-data.js(evt_) 또는 gallery-data.js(art_)에 정확히 1건
  2. 작성자     저장값 규칙 (온 가족 = "공동", 특별한 날은 아빠·엄마도)
  3. 아카이브   kids-archive/data/archive-master-data.js에 같은 id, 같은 작성자
  4. 사진 파일  kids-archive에 실제 파일, 폴더 규칙(특별한 날 = activities, 작품 = 학년 폴더), EXIF 회전값 없음
  5. CDN       raw.githubusercontent.com 주소가 열림 (푸시 직후면 --cdn-wait초까지 다시 시도)
  6. 영상 링크  videoUrl·videos 주소가 열림 (구글 포토 공유 링크 포함)
  7. 노션       성장 갤러리 DB(3dfa2711...)에 식별ID 카드가 정확히 1장, 구분·주인공·날짜·제목 일치

사진이 바로 서 있는지·대상이 잘리지 않았는지·제목과 맞는지는 기계가 판단하지 못한다.
마지막에 출력하는 사진 경로를 에이전트가 직접 열어 눈으로 확인한다 (GEMINI.md §5-3).

사용법 (공부방 루트에서):
  python -X utf8 scripts/verify_gallery_entry.py --id evt_minseo_lotteworld_20261105 --id art_minseo_20261028_cat_dog_crossbag
  --no-network  CDN·영상·노션 확인을 건너뜀 (파일·데이터만)
  --no-cdn      CDN만 건너뜀 (--no-push로 등록했을 때)
종료 코드: 모두 통과 0, 하나라도 ❌ 1
"""

import argparse
import importlib.util
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SCHOOL_ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_ROOT = SCHOOL_ROOT.parent / 'kids-archive'
CDN_MEDIA = 'https://raw.githubusercontent.com/awslike6-web/kids-archive/main/'
PROXY_URL = 'https://minmin-notion.awslike6.workers.dev'
GALLERY_DB_ID = '3dfa27115b688010a85be385f91d64ee'
UA = {'User-Agent': 'Mozilla/5.0 (kids-school verify_gallery_entry)'}

ART_AUTHORS = {'민서': 'minseo', '민수': 'minsu', '공동': 'together'}
DATA_FILES = {
    'evt_': ('kids/data/special-days-data.js', 'DEFAULT_SPECIAL_DAYS_DATA', '특별한 날'),
    'art_': ('kids/data/gallery-data.js', 'DEFAULT_GALLERY_DATA', '작품'),
}


def load_builder():
    """작성자 규칙(AUTHORS·AUTHOR_ALIASES)은 특별한 날 빌더 한 곳에만 둔다."""
    spec = importlib.util.spec_from_file_location('special_days_builder', SCHOOL_ROOT / 'scripts/add_activity_photo.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    return builder


def read_array(path, var):
    text = Path(path).read_text(encoding='utf-8')
    m = re.search(rf'const {var} = (\[.*?\n\]);', text, re.S)
    if not m:
        raise ValueError(f'{Path(path).name}에서 {var} 배열을 찾지 못했습니다')
    return json.loads(m.group(1))


def http_ok(url, timeout=15):
    """주소가 열리면 (True, 최종 주소), 아니면 (False, 사유)."""
    for method in ('HEAD', 'GET'):
        try:
            req = urllib.request.Request(url, headers=UA, method=method)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return 200 <= resp.status < 400, resp.geturl()
        except urllib.error.HTTPError as e:
            if method == 'HEAD' and e.code in (403, 405):
                continue
            return False, f'HTTP {e.code}'
        except Exception as e:  # 네트워크 오류
            return False, type(e).__name__
    return False, 'HEAD/GET 실패'


def notion_cards(item_id):
    body = json.dumps({'filter': {'property': '식별ID', 'title': {'equals': item_id}}, 'page_size': 5}).encode('utf-8')
    req = urllib.request.Request(f'{PROXY_URL}/v1/databases/{GALLERY_DB_ID}/query', data=body,
                                 headers={**UA, 'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8')).get('results', [])


def prop_text(props, name):
    v = props.get(name) or {}
    kind = v.get('type')
    val = v.get(kind)
    if kind in ('title', 'rich_text'):
        return ''.join(x.get('plain_text', '') for x in val or [])
    if kind == 'select':
        return (val or {}).get('name')
    if kind == 'date':
        return (val or {}).get('start')
    if kind == 'relation':
        return len(val or [])
    return val


class Report:
    def __init__(self, item_id):
        self.item_id = item_id
        self.rows = []

    def add(self, ok, name, detail=''):
        self.rows.append(('✅' if ok is True else '⚠️' if ok is None else '❌', name, detail))

    @property
    def failed(self):
        return any(mark == '❌' for mark, _, _ in self.rows)


def check_item(item_id, builder, args, view_paths):
    rep = Report(item_id)
    prefix = item_id[:4]
    if prefix not in DATA_FILES:
        rep.add(False, '데이터', 'id는 evt_ 또는 art_로 시작해야 합니다')
        return rep
    rel, var, kind = DATA_FILES[prefix]
    special = prefix == 'evt_'
    hits = [it for it in read_array(SCHOOL_ROOT / rel, var) if it.get('id') == item_id]
    rep.add(len(hits) == 1, '데이터', f'{rel}에 {len(hits)}건')
    if not hits:
        return rep
    item = hits[0]

    # 2. 작성자 저장값
    author = item.get('author')
    allowed = builder.AUTHORS if special else ART_AUTHORS
    if author in allowed:
        rep.add(True, '작성자', author)
    else:
        hint = f' → "{builder.normalize_author(author)}"로 고쳐야 합니다' if builder.normalize_author(author) != author else ''
        rep.add(False, '작성자', f'"{author}"는 {"/".join(allowed)} 중 하나가 아닙니다{hint}')
    child = (builder.AUTHORS.get(author, (None,))[0] if special else ART_AUTHORS.get(author))

    # 3. 아카이브 마스터
    master_path = ARCHIVE_ROOT / 'data/archive-master-data.js'
    if master_path.exists():
        rec = [r for r in read_array(master_path, 'ARCHIVE_MASTER_DATA') if r.get('id') == item_id]
        if len(rec) != 1:
            rep.add(False, '아카이브', f'archive-master-data.js에 {len(rec)}건')
        else:
            same = rec[0].get('student') == author
            rep.add(same, '아카이브', '작성자 일치' if same else f'작성자 다름: 아카이브 "{rec[0].get("student")}"')
    else:
        rep.add(None, '아카이브', '../kids-archive 없음 (건너뜀)')

    # 4·5. 사진 파일·폴더·EXIF·CDN
    images = item.get('galleryImages') or ([item['imageUrl']] if item.get('imageUrl') else [])
    if not images:
        rep.add(False, '사진', '사진 주소가 없습니다')
    for url in images:
        name = url.rsplit('/', 1)[-1]
        if not url.startswith(CDN_MEDIA + 'assets/media/'):
            rep.add(False, f'사진 {name}', 'kids-archive CDN 주소가 아닙니다')
            continue
        rel_path = url[len(CDN_MEDIA):]
        parts = rel_path.split('/')  # assets/media/{아이}/{폴더}/{파일}
        folder_ok = parts[2] == child and ((parts[3] == 'activities') if special else (parts[3] != 'activities'))
        local = ARCHIVE_ROOT / rel_path
        detail = []
        ok = folder_ok
        if not folder_ok:
            detail.append(f'폴더 규칙 위반 ({parts[2]}/{parts[3]})')
        if ARCHIVE_ROOT.exists():
            if not local.exists():
                ok = False
                detail.append('kids-archive에 파일 없음')
            else:
                try:
                    from PIL import Image
                    with Image.open(local) as im:
                        orient = im.getexif().get(0x0112, 1)
                        detail.append(f'{im.width}×{im.height}')
                        if orient not in (1, None):
                            ok = False
                            detail.append(f'EXIF 회전값 {orient} 남음')
                except ImportError:
                    detail.append('Pillow 없음: 크기·회전 미확인')
                view_paths.append(str(local))
        if not args.no_network and not args.no_cdn:
            deadline = time.time() + args.cdn_wait
            while True:
                cdn_ok, why = http_ok(url)
                if cdn_ok or time.time() >= deadline:
                    break
                time.sleep(10)
            ok = ok and cdn_ok
            detail.append('CDN 열림' if cdn_ok else f'CDN 안 열림 ({why})')
        rep.add(ok, f'사진 {name}', ', '.join(detail))

    # 6. 영상 링크
    links = []
    if item.get('videoUrl'):
        links.append(('videoUrl', item['videoUrl']))
    for i, v in enumerate(item.get('videos') or [], 1):
        if isinstance(v, dict) and v.get('url') and v['url'] != item.get('videoUrl'):
            links.append((f'videos {i}', v['url']))
    for label, url in links:
        if args.no_network:
            rep.add(None, f'영상 {label}', '네트워크 확인 건너뜀')
            continue
        if url.startswith(CDN_MEDIA) and args.no_cdn:
            rep.add(None, f'영상 {label}', 'CDN 확인 건너뜀')
            continue
        link_ok, final = http_ok(url)
        rep.add(link_ok, f'영상 {label}', final if not link_ok else url)

    # 7. 노션 카드
    if args.no_network:
        rep.add(None, '노션', '네트워크 확인 건너뜀')
        return rep
    try:
        cards = notion_cards(item_id)
    except Exception as e:
        rep.add(False, '노션', f'조회 실패: {e}')
        return rep
    if len(cards) != 1:
        rep.add(False, '노션', f'식별ID 카드 {len(cards)}장 (정확히 1장이어야 함)')
        return rep
    props = cards[0].get('properties', {})
    want_owner = '부모관리자' if author in ('아빠', '엄마') else author
    diffs = []
    for name, want in (('구분', kind), ('주인공', want_owner), ('날짜', item.get('date')), ('제목', item.get('title'))):
        got = prop_text(props, name)
        if got != want:
            diffs.append(f'{name} "{got}" ≠ "{want}"')
    rep.add(not diffs, '노션', '; '.join(diffs) if diffs else '카드 1장, 구분·주인공·날짜·제목 일치')
    linked = prop_text(props, 'AI 대화록 및 일상 기록 DB')
    rep.add(True if linked else None, '노션 일상 연결', f'{linked}건' if linked else '그날 일상 기록 카드가 없어 연결 안 됨')
    return rep


def main(argv=None):
    p = argparse.ArgumentParser(description='갤러리 작품·특별한 날 등록 후 점검표 (읽기 전용)')
    p.add_argument('--id', dest='ids', action='append', required=True, help='점검할 id (여러 번 지정 가능)')
    p.add_argument('--no-network', action='store_true', help='CDN·영상·노션 확인 건너뜀')
    p.add_argument('--no-cdn', action='store_true', help='CDN 확인만 건너뜀 (--no-push 등록)')
    p.add_argument('--cdn-wait', type=int, default=0, help='CDN이 안 열리면 이 초만큼 10초 간격으로 다시 시도 (푸시 직후)')
    args = p.parse_args(argv)

    builder = load_builder()
    view_paths = []
    failed = False
    print('=' * 68)
    print('🔎 [등록 후 점검표] 갤러리 작품·특별한 날')
    print('=' * 68)
    for item_id in dict.fromkeys(args.ids):
        rep = check_item(item_id.strip(), builder, args, view_paths)
        failed = failed or rep.failed
        print(f'\n■ {rep.item_id}')
        for mark, name, detail in rep.rows:
            print(f'  {mark} {name:<14} {detail}')
    if view_paths:
        print('\n👀 [눈으로 확인] 아래 사진을 직접 열어 ① 바로 서 있는지 ② 대상이 잘리지 않았는지 ③ 제목과 맞는지 확인하세요:')
        for path in view_paths:
            print(f'  - {path}')
    print('\n' + '=' * 68)
    if failed:
        print('❌ [점검 실패] 위 ❌ 항목을 고치기 전에는 등록 완료로 보고하지 않습니다.')
        return 1
    print('✅ [점검 통과] 기계 점검은 모두 통과했습니다. 사진 육안 확인 결과와 함께 보고하세요.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
