#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌱 add_activity_photo.py
-----------------------------------------------------------
[학교 활동 사진 원클릭 kids-archive 아카이빙 & 하루 방 연동 빌더]
- uploads/ex/갤러리/하루아카이브/{민서,민수,공통} 폴더 자동 스캔 지원
- 단일 파일 또는 다중 파일(갤러리 사진 3장 등) 일괄 최적화(1200px)
- 12년 성장 아카이브(kids-archive/assets/media/{child}/activities/)에 배포
- kids-archive 깃 자동 커밋 및 푸시
- kids-school의 하루 방(haru_data.js)에 CDN URL과 함께 '특별한 날' 피드로 등록
- 아이 감정 도장(Reaction Stamps) 및 다중 사진 슬라이드 썸네일 완벽 연동
"""

import os
import sys
import re
import glob
import argparse
import subprocess
from datetime import datetime
from PIL import Image, ImageOps

# Windows 콘솔 한글 인코딩 안전장치
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CDN_BASE = "https://raw.githubusercontent.com/awslike6-web/kids-archive/main"

CATEGORY_ICON_MAP = {
    "생태/텃밭": "🌱",
    "학교활동": "🎒",
    "가을소풍": "🍁",
    "가족기념일": "🎂",
    "자연관찰": "🌿",
    "특별한날": "⭐"
}

CHILD_NAME_MAP = {
    "minseo": "민서",
    "minsu": "민수",
    "together": "공통"
}

CHILD_DIR_MAP = {
    "민서": "minseo",
    "민수": "minsu",
    "공통": "together",
    "공동": "together"
}

def sanitize_slug(text):
    clean = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '_', clean)[:24]

def optimize_and_save_image(source_path, target_path, max_dim=1200, quality=88):
    with Image.open(source_path) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode in ('RGBA', 'P', 'LA'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                bg.paste(img, mask=img.split()[3])
            else:
                bg.paste(img)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        w, h = img.size
        if max(w, h) > max_dim:
            if w >= h:
                new_w = max_dim
                new_h = int(h * (max_dim / w))
            else:
                new_h = max_dim
                new_w = int(w * (max_dim / h))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        img.save(target_path, 'JPEG', quality=quality, optimize=True)
    return True

def update_haru_data_js(haru_data_path, new_entry):
    if not os.path.exists(haru_data_path):
        print(f"⚠️ haru_data.js 파일을 찾을 수 없습니다: {haru_data_path}")
        return False

    with open(haru_data_path, 'r', encoding='utf-8') as f:
        content = f.read()

    marker = "defaultEvents: ["
    if marker not in content:
        print("⚠️ defaultEvents 배열 위치를 찾지 못했습니다.")
        return False

    gallery_js = json.dumps(new_entry.get('galleryImages', [new_entry['imageUrl']]), ensure_ascii=False, indent=10)
    # indent formatting for js
    gallery_lines = [(" " * 10) + line.strip() for line in gallery_js.split("\n")]
    gallery_str = "\n".join(gallery_lines).strip()

    entry_js = f"""      {{
        id: "{new_entry['id']}",
        category: "{new_entry['category']}",
        categoryIcon: "{new_entry['categoryIcon']}",
        title: "{new_entry['title']}",
        date: "{new_entry['date']}",
        desc: "{new_entry['desc']}",
        icon: "{new_entry['icon']}",
        imageUrl: "{new_entry['imageUrl']}",
        galleryImages: {gallery_str},
        fallbackIcon: "{new_entry['categoryIcon']}"
      }},"""

    parts = content.split(marker, 1)
    new_content = parts[0] + marker + "\n" + entry_js + parts[1]

    with open(haru_data_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✅ haru_data.js 에 신규 특별한 날 스토리 등록 완료!")
    return True

def update_archive_master_js(archive_js_path, new_entry, child_name, rel_media_path, gallery_rel_paths):
    if not os.path.exists(archive_js_path):
        return False

    with open(archive_js_path, 'r', encoding='utf-8') as f:
        content = f.read()

    marker = "const ARCHIVE_MASTER_DATA = ["
    if marker not in content:
        return False

    year = datetime.now().year
    gallery_js = ",\n".join([f'      "{p}"' for p in gallery_rel_paths])

    archive_entry = f"""  {{
    "id": "{new_entry['id']}",
    "student": "{child_name}",
    "studentKey": "{new_entry['child']}",
    "stage": "초등",
    "stageName": "초등학교 생활·체험 활동",
    "year": {year},
    "semester": "2학기",
    "date": "{new_entry['date']}",
    "category": "학교체험/자연",
    "categoryIcon": "{new_entry['categoryIcon']}",
    "title": "{new_entry['title']}",
    "coverImage": "{rel_media_path}",
    "galleryImages": [
{gallery_js}
    ],
    "description": "{new_entry['desc']}",
    "learningPoints": [
      "자연과 생태에 대한 탐구심 및 텃밭 수확의 기쁨 체득",
      "선후배 간의 따뜻한 나눔과 학교 공동체 협동심 함양"
    ],
    "awards": "특별한 하루 추억 피드 등록",
    "likes": 0,
    "reactions": {{ "heart": 0, "thumb": 0, "star": 0, "trophy": 0 }},
    "comments": []
  }},"""

    parts = content.split(marker, 1)
    new_content = parts[0] + marker + "\n" + archive_entry + parts[1]

    with open(archive_js_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✅ archive-master-data.js 에 성장 포트폴리오 등록 완료!")
    return True

def git_commit_push_archive(archive_root, commit_msg, do_push=True):
    try:
        subprocess.run(["git", "add", "."], cwd=archive_root, check=True)
        diff_proc = subprocess.run(["git", "diff", "--staged", "--quiet"], cwd=archive_root)
        if diff_proc.returncode != 0:
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=archive_root, check=True)
            print(f"📦 kids-archive 깃 커밋 완료: {commit_msg}")
            if do_push:
                subprocess.run(["git", "push", "origin", "main"], cwd=archive_root, check=True)
                print(f"🚀 kids-archive 원격 저장소 푸시 완료!")
        else:
            print("ℹ️ kids-archive 에 스테이징할 변경사항이 없습니다.")
    except Exception as e:
        print(f"⚠️ kids-archive 깃 작업 중 경고 (수동 푸시 가능): {e}")

def main():
    parser = argparse.ArgumentParser(description="학교 활동 사진 kids-archive 배포 & 하루 방 연동 빌더")
    parser.add_argument("--file", help="업로드할 단일 사진 파일 경로")
    parser.add_argument("--child", choices=["minseo", "minsu", "together"], help="대상 학생 (minseo/minsu/together)")
    parser.add_argument("--title", help="활동 제목 (예: 가을 텃밭 땅콩 수확하기)")
    parser.add_argument("--desc", help="활동 설명 및 소감")
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"), help="활동 날짜 (YYYY-MM-DD)")
    parser.add_argument("--category", default="생태/텃밭", help="카테고리 (생태/텃밭, 학교활동, 가을소풍, 가족기념일 등)")
    parser.add_argument("--no-push", action="store_true", help="kids-archive 깃 푸시 생략")

    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    parent_dir = os.path.dirname(project_root)
    archive_root = os.path.join(parent_dir, 'kids-archive')

    archive_inbox_base = os.path.join(project_root, 'uploads', 'ex', '갤러리', '하루아카이브')

    # 대화형 모드 분기 (인자가 부족할 때)
    child_key = args.child
    if not child_key:
        print("=" * 60)
        print("🌱 [학교 활동 사진 하루아카이브 빌더] 대화형 마법사")
        print("=" * 60)
        print("대상 자녀를 선택하세요:")
        print("  1. 민서 (초등 1학년)")
        print("  2. 민수 (초등 5학년)")
        print("  3. 공통/가족")
        ans = input("선택 [1]: ").strip()
        if ans == "2":
            child_key = "minsu"
        elif ans == "3":
            child_key = "together"
        else:
            child_key = "minseo"

    child_name = CHILD_NAME_MAP.get(child_key, "민서")
    folder_kor = "민서" if child_key == "minseo" else ("민수" if child_key == "minsu" else "공통")
    inbox_folder = os.path.join(archive_inbox_base, folder_kor)

    input_files = []
    if args.file:
        input_files = [args.file]
    elif os.path.exists(inbox_folder):
        found = sorted(glob.glob(os.path.join(inbox_folder, "*.*")))
        valid_exts = ('.jpg', '.jpeg', '.png', '.webp')
        input_files = [f for f in found if os.path.splitext(f)[1].lower() in valid_exts]

    if not input_files:
        print(f"❌ 처리할 사진 파일이 없습니다. 폴더({inbox_folder})에 사진을 넣거나 --file 인자를 지정해 주세요.")
        sys.exit(1)

    print(f"\n📸 발견된 사진 ({len(input_files)}장):")
    for idx, f in enumerate(input_files, 1):
        print(f"  [{idx}] {os.path.basename(f)} ({os.path.getsize(f):,} bytes)")

    title = args.title
    if not title:
        title = input("\n✏️ 활동 제목 (예: 5학년 선배들이 선물한 가을 땅콩 수확): ").strip()
        if not title:
            title = "즐거운 학교 활동 이야기"

    desc = args.desc
    if not desc:
        print("\n📝 선생님 알림장 공지글이나 소감을 붙여넣으세요 (끝내려면 빈 줄 엔터):")
        lines = []
        while True:
            try:
                line = input()
                if not line:
                    break
                lines.append(line)
            except EOFError:
                break
        desc = " ".join(lines).strip()
        if not desc:
            desc = f"{child_name}와 함께한 특별하고 소중한 학교 활동 하루입니다!"

    category = args.category or "생태/텃밭"
    cat_icon = CATEGORY_ICON_MAP.get(category, "🌱")
    date_str = args.date

    # 대상 파일들 리사이즈 및 아카이브 저장
    target_dir = os.path.join(archive_root, 'assets', 'media', child_key, 'activities')
    os.makedirs(target_dir, exist_ok=True)

    date_compact = date_str.replace("-", "")
    slug = sanitize_slug(title)

    gallery_cdn_urls = []
    gallery_rel_paths = []

    print(f"\n🖼️ [1/4] 사진 최적화 리사이즈 중...")
    for idx, src_file in enumerate(input_files, 1):
        target_filename = f"{child_key}_{date_compact}_{slug}_{idx:02d}.jpg"
        target_file_path = os.path.join(target_dir, target_filename)
        optimize_and_save_image(src_file, target_file_path, max_dim=1200, quality=88)

        rel_path = f"assets/media/{child_key}/activities/{target_filename}"
        cdn_url = f"{CDN_BASE}/{rel_path}"
        gallery_rel_paths.append(rel_path)
        gallery_cdn_urls.append(cdn_url)
        print(f"   [{idx}/{len(input_files)}] {target_filename} ➔ {os.path.getsize(target_file_path):,} bytes")

    cover_cdn_url = gallery_cdn_urls[0]
    cover_rel_path = gallery_rel_paths[0]

    # 데이터 엔트리 생성
    clean_title = title if not title.startswith(cat_icon) else title.split(maxsplit=1)[1]
    new_entry = {
        "id": f"evt_act_{date_compact}_{int(datetime.now().timestamp())}",
        "child": child_key,
        "category": category,
        "categoryIcon": cat_icon,
        "title": f"{cat_icon} {clean_title}",
        "date": f"{date_str} (학교활동)",
        "desc": desc,
        "icon": cat_icon,
        "imageUrl": cover_cdn_url,
        "galleryImages": gallery_cdn_urls
    }

    print(f"\n📝 [2/4] 데이터베이스 동기화 중...")
    haru_data_path = os.path.join(project_root, 'kids', 'subjects', 'haru', 'data', 'haru_data.js')
    update_haru_data_js(haru_data_path, new_entry)

    archive_master_path = os.path.join(archive_root, 'data', 'archive-master-data.js')
    update_archive_master_js(archive_master_path, new_entry, child_name, cover_rel_path, gallery_rel_paths)

    print(f"\n🚀 [3/4] kids-archive 깃 동기화 중...")
    commit_msg = f"feat: {child_name} 학교 활동 사진 {len(input_files)}장 아카이브 - {title}"
    git_commit_push_archive(archive_root, commit_msg, do_push=(not args.no_push))

    print(f"\n🎉 [성공] 모든 작업이 완료되었습니다!")
    print(f"• 학생: {child_name}")
    print(f"• 제목: {title}")
    print(f"• 사진 수: {len(input_files)}장")
    print(f"• 메인 사진 CDN: {cover_cdn_url}")
    print(f"• 하루 방 및 kids-archive 갤러리에서 즉시 확인 가능합니다.\n")

if __name__ == '__main__':
    main()
