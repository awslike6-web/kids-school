#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌟 add_activity_photo.py — 특별한 날(학교 행사·가족 추억) 등록 빌더
-----------------------------------------------------------
공식 입구는 관제탑 scripts/sync_quick_upload.py --cat "특별한 날" 이다 (노션 카드·큐 정리·Git 푸시까지).
이 빌더는 입구가 불러 쓰는 파일 작업 본체이며, 단독 실행은 미리보기(--dry-run)나 노션 없이 파일만 맞출 때 쓴다.

  1. 사진 EXIF 회전 보정 → 긴 변 1200px JPEG(quality 88) → kids-archive/assets/media/{아이}/activities/
     (작품 학년 폴더가 아니다. tests/media-archive-paths.test.mjs가 검사)
  2. 동영상: 로컬 파일은 같은 activities 폴더에 복사, http(s) 주소는 그대로 연결
  3. kids/data/special-days-data.js(DEFAULT_SPECIAL_DAYS_DATA)에 id로 upsert
     (같은 id 재실행 = 덮어쓰기, 중복 없음, 기존 likes·stickers·comments 보존)
  4. kids-archive/data/archive-master-data.js에 같은 id로 upsert
  5. haru.html·gallery.html의 special-days-data.js?v= 캐시 버스팅
  6. (단독 실행 때만) 바뀐 파일만 골라 두 저장소 커밋·푸시 (--no-git, --no-push)

id: evt_{minseo|minsu|together}_{slug}_{YYYYMMDD}. 공동·공통·아빠·엄마는 together 폴더를 쓴다.
slug는 --slug(영문 소문자·숫자·_)가 우선이고, 없으면 첫 사진 파일 이름에서 만든다.

사용법 (공부방 루트에서):
  python -X utf8 scripts/add_activity_photo.py --dry-run \\
    --author 민서 --date 2026-10-22 --slug pet_trainer --category "학교행사/운동회" --icon "🐕" \\
    --title "🐕 진로체험: 반려동물 훈련사와의 따뜻한 만남!" --desc "알림장 내용..." \\
    --file "E:/Downloads/a.jpg" --sub-files "E:/Downloads/b.jpg,E:/Downloads/c.jpg" \\
    --video "https://photos.app.goo.gl/..." --video-btn "🎬 영상 보기"
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

KST = timezone(timedelta(hours=9))
CDN_BASE = "https://raw.githubusercontent.com/awslike6-web/kids-archive/main"
SCHOOL_ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_ROOT = SCHOOL_ROOT.parent / 'kids-archive'

SPECIAL_DAYS_REL = 'kids/data/special-days-data.js'
ARCHIVE_MASTER_REL = 'data/archive-master-data.js'
CACHE_HTML_RELS = ('kids/subjects/haru/haru.html', 'kids/common_space/gallery.html')

# 작성자 → (kids-archive 아이 폴더, 하루아카이브 받은편지함 폴더)
AUTHORS = {
    "민서": ("minseo", "민서"),
    "민수": ("minsu", "민수"),
    "공동": ("together", "공통"),
    "공통": ("together", "공통"),
    "아빠": ("together", "공통"),
    "엄마": ("together", "공통"),
}
# 갤러리 특별한 날 분류 (kids/common_space/gallery-data-sync.js SPECIAL_CATEGORIES와 같은 키)
CATEGORY_ICONS = {
    "가족/생일파티": "🎂",
    "생태/텃밭/체험": "🌱",
    "소풍/현장학습": "🍁",
    "학교행사/운동회": "🎒",
    "사계절 자연관찰": "🌿",
    "소중한 하루": "⭐",
}
DEFAULT_CATEGORY = "소중한 하루"
IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp')
VIDEO_EXTS = ('.mp4', '.mov', '.webm')
DATA_RE = re.compile(r'const DEFAULT_SPECIAL_DAYS_DATA = (\[.*\]);', re.S)
ARCHIVE_RE = re.compile(r'const ARCHIVE_MASTER_DATA = (\[.*\]);', re.S)
ID_RE = re.compile(r'^evt_[a-z0-9]+(?:_[a-z0-9]+)*$')


def kst_today():
    return datetime.now(KST).strftime('%Y-%m-%d')


def kst_stamp():
    return datetime.now(KST).strftime('%Y%m%d-%H%M')


def check_date(value):
    try:
        datetime.strptime(value, '%Y-%m-%d')
    except (TypeError, ValueError):
        raise ValueError(f'날짜는 YYYY-MM-DD 형식이어야 합니다: {value!r}')
    return value


def ascii_slug(text):
    return re.sub(r'[^a-z0-9]+', '_', str(text).lower()).strip('_')[:32].strip('_')


def slug_from_file(path, date_compact):
    """폰 사진 이름(20261030_143012.jpg)처럼 날짜뿐인 이름은 photo_143012가 된다."""
    slug = ascii_slug(Path(path).stem.replace(date_compact, ''))
    if not slug or slug[0].isdigit():
        slug = f'photo_{slug}'.strip('_')
    return slug


@dataclass
class Plan:
    event_id: str
    author: str
    child: str
    entry: dict
    image_jobs: list = field(default_factory=list)   # [(원본 Path, 아카이브 상대경로)]
    video_job: tuple | None = None                   # (원본 Path, 아카이브 상대경로)
    action: str = ''                                 # '신규' | '갱신' (apply/print에서 채움)


def build_plan(author, title, desc, date, files, category=None, icon=None, slug=None,
               event_id=None, video=None, video_btn=None):
    """입력을 검증하고 할 일을 만든다. 파일·Git·노션은 건드리지 않는다."""
    if author not in AUTHORS:
        raise ValueError(f'--author는 {"/".join(AUTHORS)} 중 하나여야 합니다: {author!r}')
    child = AUTHORS[author][0]
    title = (title or '').strip()
    if not title:
        raise ValueError('제목(--title)이 필요합니다')
    date = check_date(date or kst_today())
    category = category or DEFAULT_CATEGORY
    if category not in CATEGORY_ICONS:
        raise ValueError(f'분류는 {", ".join(CATEGORY_ICONS)} 중 하나여야 합니다: {category!r}')
    sources = [Path(f) for f in files if str(f).strip()]
    if not sources:
        raise ValueError('사진(--file)이 한 장 이상 필요합니다')
    for src in sources:
        if not src.is_file():
            raise ValueError(f'사진 파일이 없습니다: {src}')
        if src.suffix.lower() not in IMAGE_EXTS:
            raise ValueError(f'사진은 {"/".join(IMAGE_EXTS)}만 받습니다: {src.name}')

    date_compact = date.replace('-', '')
    if event_id:
        if not ID_RE.match(event_id) or event_id.startswith('evt_custom_'):
            raise ValueError(f'id는 evt_ 로 시작하는 영문 소문자·숫자·_ 형식이어야 합니다: {event_id!r}')
        stem = event_id[len('evt_'):]
    else:
        slug = ascii_slug(slug) if slug else slug_from_file(sources[0], date_compact)
        if not slug:
            raise ValueError('--slug는 영문 소문자·숫자·_로 지어 주세요')
        event_id = f'evt_{child}_{slug}_{date_compact}'
        stem = f'{child}_{date_compact}_{slug}'

    media_dir = f'assets/media/{child}/activities'
    image_jobs = [(src, f'{media_dir}/{stem}_{idx:02d}.jpg') for idx, src in enumerate(sources, 1)]
    urls = [f'{CDN_BASE}/{rel}' for _, rel in image_jobs]

    entry = {
        "id": event_id,
        "author": author,
        "category": category,
        "categoryIcon": icon or CATEGORY_ICONS[category],
        "title": title,
        "date": date,
        "desc": (desc or '').strip(),
        "imageUrl": urls[0],
        "galleryImages": urls,
    }
    video_job = None
    if video:
        if str(video).startswith(('http://', 'https://')):
            entry["videoUrl"] = video
        else:
            v_src = Path(video)
            if not v_src.is_file() or v_src.suffix.lower() not in VIDEO_EXTS:
                raise ValueError(f'동영상은 {"/".join(VIDEO_EXTS)} 파일 또는 http(s) 주소여야 합니다: {video}')
            video_job = (v_src, f'{media_dir}/{stem}_video{v_src.suffix.lower()}')
            entry["videoUrl"] = f'{CDN_BASE}/{video_job[1]}'
        entry["videoBtnText"] = video_btn or "🎬 그날의 영상 보기"
    return Plan(event_id, author, child, entry, image_jobs, video_job)


# ---------------------------------------------------------------- 데이터 파일 읽기·쓰기
def read_js_array(path, pattern):
    text = Path(path).read_text(encoding='utf-8')
    m = pattern.search(text)
    if not m:
        raise ValueError(f'{Path(path).name}에서 데이터 배열을 찾지 못했습니다 (배열 본문은 JSON 형식이어야 함)')
    return text, m, json.loads(m.group(1))


def write_js_array(path, text, match, items):
    body = json.dumps(items, ensure_ascii=False, indent=2)
    Path(path).write_text(text[:match.start(1)] + body + text[match.end(1):], encoding='utf-8')


def upsert_event(items, entry):
    """같은 id면 덮어쓰고(반응·댓글 보존) 없으면 날짜 순서 자리에 끼워 넣는다 → (목록, '신규'|'갱신')."""
    for idx, old in enumerate(items):
        if old.get('id') == entry['id']:
            merged = {**old, **entry}
            for keep in ('likes', 'stickers', 'comments'):
                if keep in old:
                    merged[keep] = old[keep]
            return items[:idx] + [merged] + items[idx + 1:], '갱신'
    new = {"videoUrl": "", **entry, "likes": 0,
           "stickers": {"heart": 0, "thumb": 0, "star": 0, "trophy": 0}, "comments": []}
    pos = next((i for i, it in enumerate(items) if str(it.get('date', '')) < entry['date']), len(items))
    return items[:pos] + [new] + items[pos:], '신규'


def archive_entry(plan, old=None):
    e = plan.entry
    month = int(e['date'][5:7])
    rels = [rel for _, rel in plan.image_jobs]
    old = old or {}
    return {
        "id": e['id'],
        "student": plan.author,
        "studentKey": plan.child,
        "stage": "초등",
        "stageName": "초등학교 생활·체험 활동",
        "year": int(e['date'][:4]),
        "semester": "1학기" if 3 <= month <= 8 else "2학기",
        "date": e['date'],
        "category": e['category'],
        "categoryIcon": e['categoryIcon'],
        "title": e['title'],
        "coverImage": rels[0],
        "galleryImages": rels,
        "description": e['desc'],
        "learningPoints": old.get('learningPoints', []),
        "awards": "특별한 날 추억",
        "likes": old.get('likes', 0),
        "reactions": old.get('reactions', {"heart": 0, "thumb": 0, "star": 0, "trophy": 0}),
        "comments": old.get('comments', []),
    }


def upsert_archive(items, plan):
    for idx, old in enumerate(items):
        if old.get('id') == plan.event_id:
            return items[:idx] + [archive_entry(plan, old)] + items[idx + 1:]
    return items + [archive_entry(plan)]


def bump_cache_versions(school_root, write=True):
    """special-days-data.js?v= 를 지금 시각으로 바꾼다 → 바뀌는 HTML 상대경로 목록."""
    tag = kst_stamp()
    changed = []
    for rel in CACHE_HTML_RELS:
        p = Path(school_root) / rel
        if not p.is_file():
            continue
        text = p.read_text(encoding='utf-8')
        new = re.sub(r'(special-days-data\.js)(\?v=[^"\']+)?', rf'\1?v={tag}', text)
        if new != text:
            changed.append(rel)
            if write:
                p.write_text(new, encoding='utf-8')
    return changed


def optimize_and_save_image(source_path, target_path, max_dim=1200, quality=88):
    from PIL import Image, ImageOps  # 미리보기(--dry-run)는 Pillow 없이도 돈다
    with Image.open(source_path) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGBA')
            bg = Image.new('RGB', img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        w, h = img.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)
        img.save(target_path, 'JPEG', quality=quality, optimize=True)


# ---------------------------------------------------------------- 실행
def apply_plan(plan, school_root=SCHOOL_ROOT, archive_root=ARCHIVE_ROOT, dry_run=False):
    """할 일을 실행한다 (dry_run이면 바뀔 파일만 계산). → {'school': [...], 'archive': [...]} 상대경로."""
    school_root, archive_root = Path(school_root), Path(archive_root)
    if not dry_run and not archive_root.is_dir():
        raise ValueError(f'kids-archive 저장소가 없습니다: {archive_root}')
    data_path = school_root / SPECIAL_DAYS_REL
    text, match, items = read_js_array(data_path, DATA_RE)
    new_items, plan.action = upsert_event(items, plan.entry)
    changed = {'school': [SPECIAL_DAYS_REL], 'archive': [rel for _, rel in plan.image_jobs]}
    if plan.video_job:
        changed['archive'].append(plan.video_job[1])
    archive_path = archive_root / ARCHIVE_MASTER_REL
    if archive_path.is_file():
        changed['archive'].append(ARCHIVE_MASTER_REL)
    elif not dry_run:
        print(f'  ⚠️ {archive_path} 가 없어 포트폴리오 갱신을 건너뜁니다.')
    changed['school'] += bump_cache_versions(school_root, write=not dry_run)
    if dry_run:
        return changed

    for src, rel in plan.image_jobs:
        dest = archive_root / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        optimize_and_save_image(src, dest)
        print(f'  🖼️ {src.name} → {rel} ({dest.stat().st_size:,} bytes)')
    if plan.video_job:
        src, rel = plan.video_job
        dest = archive_root / rel
        if src.resolve() != dest.resolve():
            shutil.copy2(src, dest)
        print(f'  🎬 {src.name} → {rel}')
    write_js_array(data_path, text, match, new_items)
    print(f'  ✅ special-days-data.js {plan.action}: {plan.event_id}')
    if archive_path.is_file():
        a_text, a_match, a_items = read_js_array(archive_path, ARCHIVE_RE)
        write_js_array(archive_path, a_text, a_match, upsert_archive(a_items, plan))
        print(f'  ✅ archive-master-data.js 반영: {plan.event_id}')
    return changed


def print_plan(plan, changed):
    print(f"\n🔎 [미리보기] {plan.event_id} ({plan.action}) — 파일·Git·노션을 바꾸지 않았습니다.")
    for src, rel in plan.image_jobs:
        print(f"  🖼️ {src} → kids-archive/{rel} (EXIF 회전 보정, 긴 변 1200px JPEG)")
    if plan.video_job:
        print(f"  🎬 {plan.video_job[0]} → kids-archive/{plan.video_job[1]}")
    print("  📝 special-days-data.js에 넣을 항목:")
    print('\n'.join('     ' + line for line in json.dumps(plan.entry, ensure_ascii=False, indent=2).splitlines()))
    print(f"  📂 바뀔 kids-school 파일: {', '.join(changed['school'])}")
    print(f"  📂 바뀔 kids-archive 파일: {', '.join(changed['archive'])}")


def group_queue_items(items):
    """폰 퀵업로드 큐의 특별한 날 사진을 행사 하나씩 묶는다 (같은 작성자·날짜·메모 = 같은 행사).
    items: [{'path', 'author', 'date', 'memo', ...}] → [[item, ...], ...] (올린 순서 유지)"""
    groups = {}
    for it in items:
        memo = (it.get('memo') or '').strip()
        key = (it['author'], it['date'], memo) if memo else (it['author'], it['date'], it['path'])
        groups.setdefault(key, []).append(it)
    return list(groups.values())


def queue_group_plan(group):
    """큐 묶음 → Plan. 제목은 메모 첫 줄, 분류는 기본값(갤러리 화면에서 고칠 수 있음)."""
    first = group[0]
    memo = (first.get('memo') or '').strip()
    title = (memo.splitlines()[0][:40] if memo else '') or f"{first['author']}의 특별한 날"
    return build_plan(first['author'], f"⭐ {title}", memo, first['date'], [it['path'] for it in group])


def git_commit(repo, paths, message, push=True):
    if not Path(repo, '.git').exists():
        print(f'  ⚠️ git 저장소가 아닙니다: {repo}')
        return False
    subprocess.run(['git', 'add', '--', *paths], cwd=repo, check=True)
    if subprocess.run(['git', 'diff', '--cached', '--quiet', '--', *paths], cwd=repo).returncode == 0:
        print(f'  ℹ️ {Path(repo).name}: 커밋할 변경이 없습니다.')
        return True
    subprocess.run(['git', 'commit', '-m', message, '--', *paths], cwd=repo, check=True)
    print(f'  📦 {Path(repo).name} 커밋: {message}')
    if push:
        subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, check=True)
        print(f'  🚀 {Path(repo).name} 푸시 완료')
    return True


def main(argv=None):
    p = argparse.ArgumentParser(description='특별한 날 등록 빌더 (공식 입구: 관제탑 scripts/sync_quick_upload.py --cat "특별한 날")')
    p.add_argument('--author', required=True, choices=list(AUTHORS), help='작성자: 민서/민수/공동/아빠/엄마')
    p.add_argument('--title', required=True, help='제목 (앞에 이모지를 붙여 쓰는 것이 기존 형식)')
    p.add_argument('--desc', default='', help='알림장·소감 본문')
    p.add_argument('--date', help='행사 날짜 YYYY-MM-DD (기본: 오늘 KST)')
    p.add_argument('--category', default=DEFAULT_CATEGORY, choices=list(CATEGORY_ICONS), help='갤러리 특별한 날 분류')
    p.add_argument('--icon', help='분류 칩 아이콘 (기본: 분류 아이콘)')
    p.add_argument('--slug', help='id에 들어갈 영문 이름 (예: pet_trainer). 없으면 첫 사진 파일 이름')
    p.add_argument('--id', dest='event_id', help='기존 행사를 고칠 때 evt_... id 직접 지정')
    p.add_argument('--file', required=True, help='대표 사진 경로')
    p.add_argument('--sub-files', default='', help='추가 사진 경로 (쉼표 구분)')
    p.add_argument('--video', help='로컬 동영상 파일 또는 http(s) 주소')
    p.add_argument('--video-btn', help='동영상 버튼 문구')
    p.add_argument('--dry-run', action='store_true', help='파일·Git·노션을 건드리지 않고 할 일만 출력')
    p.add_argument('--no-git', action='store_true', help='Git 커밋 생략')
    p.add_argument('--no-push', action='store_true', help='Git 푸시 생략 (커밋은 함)')
    args = p.parse_args(argv)

    files = [args.file] + [s.strip() for s in args.sub_files.split(',') if s.strip()]
    try:
        plan = build_plan(args.author, args.title, args.desc, args.date, files, args.category,
                          args.icon, args.slug, args.event_id, args.video, args.video_btn)
        changed = apply_plan(plan, dry_run=args.dry_run)
    except (ValueError, OSError) as error:
        print(f'❌ [특별한 날 입력 오류] {error}')
        return 1
    if args.dry_run:
        print_plan(plan, changed)
        print("\n  ℹ️ 노션 카드는 입구(sync_quick_upload.py --cat \"특별한 날\")가 만듭니다.")
        return 0
    if not args.no_git:
        msg = f'feat(special-days): {plan.author} 특별한 날 등록 {plan.event_id}'
        git_commit(ARCHIVE_ROOT, changed['archive'], msg, push=not args.no_push)
        git_commit(SCHOOL_ROOT, changed['school'], msg, push=not args.no_push)
    print(f'\n🎉 특별한 날 {plan.action} 완료: {plan.event_id} (노션 카드는 입구 도구가 맞춥니다)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
