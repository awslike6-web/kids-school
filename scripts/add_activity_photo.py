#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌱 add_activity_photo.py
-----------------------------------------------------------
[학교 활동 사진 원클릭 kids-archive 아카이빙 & 하루 방 연동 빌더]
- 학교 알림장 등에서 다운받은 활동 사진(땅콩 수확, 모종 심기 등)을 입력받아
- 1200px 웹 최적화 리사이즈 및 압축 후
- 12년 성장 아카이브(kids-archive/assets/media/{child}/activities/)에 배포
- kids-archive 깃 자동 커밋 및 푸시
- kids-school의 하루 방(haru_data.js)에 CDN URL과 함께 '특별한 날' 피드로 등록
"""

import os
import sys
import re
import json
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

def sanitize_slug(text):
    clean = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '_', clean)[:24]

def optimize_and_save_image(source_path, target_path, max_dim=1200, quality=85):
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

    entry_js = f"""      {{
        id: "{new_entry['id']}",
        category: "{new_entry['category']}",
        categoryIcon: "{new_entry['categoryIcon']}",
        title: "{new_entry['title']}",
        date: "{new_entry['date']}",
        desc: "{new_entry['desc']}",
        icon: "{new_entry['icon']}",
        imageUrl: "{new_entry['imageUrl']}",
        fallbackIcon: "{new_entry['categoryIcon']}"
      }},"""

    parts = content.split(marker, 1)
    new_content = parts[0] + marker + "\n" + entry_js + parts[1]

    with open(haru_data_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✅ haru_data.js 에 신규 특별한 날 스토리 등록 완료!")
    return True

def update_archive_master_js(archive_js_path, new_entry, child_name, rel_media_path):
    if not os.path.exists(archive_js_path):
        return False

    with open(archive_js_path, 'r', encoding='utf-8') as f:
        content = f.read()

    marker = "const ARCHIVE_MASTER_DATA = ["
    if marker not in content:
        return False

    year = datetime.now().year
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
      "{rel_media_path}"
    ],
    "description": "{new_entry['desc']}",
    "learningPoints": [
      "자연과 생태에 대한 탐구심 및 관찰력 발휘",
      "학교 텃밭 및 공동체 협동 체험을 통한 바른 인성 함양"
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
    parser.add_argument("--file", required=True, help="업로드할 원본 사진 파일 경로")
    parser.add_argument("--child", choices=["minseo", "minsu", "together"], default="minseo", help="대상 학생 (minseo/minsu/together)")
    parser.add_argument("--title", required=True, help="활동 제목 (예: 가을 텃밭 땅콩 수확하기)")
    parser.add_argument("--desc", required=True, help="활동 설명 및 소감")
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"), help="활동 날짜 (YYYY-MM-DD)")
    parser.add_argument("--category", default="생태/텃밭", help="카테고리 (생태/텃밭, 학교활동, 가을소풍, 가족기념일 등)")
    parser.add_argument("--no-push", action="store_true", help="kids-archive 깃 푸시 생략")

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"❌ 파일을 찾을 수 없습니다: {args.file}")
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    parent_dir = os.path.dirname(project_root)

    archive_root = os.path.join(parent_dir, 'kids-archive')
    if not os.path.exists(archive_root):
        print(f"❌ kids-archive 레포지토리가 없습니다: {archive_root}")
        sys.exit(1)

    child_name_map = {"minseo": "민서", "minsu": "민수", "together": "공동"}
    child_name = child_name_map.get(args.child, "민서")
    cat_icon = CATEGORY_ICON_MAP.get(args.category, "🌱")

    # 대상 파일명 생성
    date_compact = args.date.replace("-", "")
    slug = sanitize_slug(args.title)
    filename = f"{args.child}_{date_compact}_{slug}.jpg"

    # 타겟 디렉토리
    target_dir = os.path.join(archive_root, 'assets', 'media', args.child, 'activities')
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, filename)

    print(f"\n🖼️ [1/4] 사진 최적화 리사이즈 중...")
    optimize_and_save_image(args.file, target_file)
    print(f"   ➔ 저장 완료: {target_file}")

    # CDN 주소
    rel_media_path = f"assets/media/{args.child}/activities/{filename}"
    cdn_url = f"{CDN_BASE}/{rel_media_path}"
    print(f"\n🌐 [2/4] kids-archive CDN 주소 생성:")
    print(f"   ➔ {cdn_url}")

    # 데이터 등록
    new_entry = {
        "id": f"evt_act_{date_compact}_{int(datetime.now().timestamp())}",
        "child": args.child,
        "category": args.category,
        "categoryIcon": cat_icon,
        "title": f"{cat_icon} {args.title}",
        "date": args.date,
        "desc": args.desc,
        "icon": cat_icon,
        "imageUrl": cdn_url
    }

    print(f"\n📝 [3/4] 데이터베이스 동기화 중...")
    haru_data_path = os.path.join(project_root, 'kids', 'subjects', 'haru', 'data', 'haru_data.js')
    update_haru_data_js(haru_data_path, new_entry)

    archive_master_path = os.path.join(archive_root, 'data', 'archive-master-data.js')
    update_archive_master_js(archive_master_path, new_entry, child_name, rel_media_path)

    print(f"\n🚀 [4/4] kids-archive 깃 동기화 중...")
    commit_msg = f"feat: {child_name} 학교 활동 사진 아카이브 - {args.title}"
    git_commit_push_archive(archive_root, commit_msg, do_push=(not args.no_push))

    print(f"\n🎉 [성공] 모든 작업이 완료되었습니다!")
    print(f"• 학생: {child_name}")
    print(f"• 제목: {args.title}")
    print(f"• 날짜: {args.date}")
    print(f"• CDN 주소: {cdn_url}")
    print(f"• 하루 방 및 kids-archive 갤러리에서 즉시 확인 가능합니다.\n")

if __name__ == '__main__':
    main()
