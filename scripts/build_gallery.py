#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎨 kids-school-main/scripts/build_gallery.py
-----------------------------------------------------------
[꿈나무 갤러리 원클릭 자동 동기화 빌더 (kids-archive 연동형)]
- uploads/ex/갤러리/ (민수, 민서, 공동) 폴더를 스캔하여
- 웹 최적화(1200px 리사이즈, 압축) 후 kids-archive/assets/media/에 배포
- kids-archive/data/archive-master-data.js 와 kids-school/kids/data/gallery-data.js를 동시 갱신합니다.
- kids-school 레포지토리에 대용량 이미지를 저장하지 않아 용량을 0MB로 유지합니다.
"""

import os
import sys
import json
import shutil
from PIL import Image, ImageOps

# Windows 콘솔 한글 인코딩 안전장치
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CDN_BASE = "https://raw.githubusercontent.com/awslike6-web/kids-archive/main"

def run():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    parent_dir = os.path.dirname(project_root)
    
    upload_base = os.path.join(project_root, 'uploads', 'ex', '갤러리')
    sf_dir = os.path.join(upload_base, '새 폴더')
    
    archive_root = os.path.join(parent_dir, 'kids-archive')
    archive_media_base = os.path.join(archive_root, 'assets', 'media')
    archive_master_js = os.path.join(archive_root, 'data', 'archive-master-data.js')
    
    output_js = os.path.join(project_root, 'kids', 'data', 'gallery-data.js')
    meta_json_path = os.path.join(project_root, 'kids', 'data', 'gallery-meta.json')
    
    if not os.path.exists(upload_base):
        print(f"❌ 업로드 경로가 존재하지 않습니다: {upload_base}")
        return

    # kids-archive 대상 폴더 확인/생성
    target_dirs = {
        'minsu': os.path.join(archive_media_base, 'minsu', '2026_elem_5'),
        'minseo': os.path.join(archive_media_base, 'minseo', '2026_elem_1'),
        'together': os.path.join(archive_media_base, 'together', '2026_elem')
    }
    for d in target_dirs.values():
        os.makedirs(d, exist_ok=True)
        
    sf_files = os.listdir(sf_dir) if os.path.exists(sf_dir) else []
    
    # 커스텀 메타데이터 불러오기
    meta_dict = {}
    if os.path.exists(meta_json_path):
        try:
            with open(meta_json_path, 'r', encoding='utf-8') as f:
                meta_dict = json.load(f)
        except Exception as e:
            print(f"⚠️ gallery-meta.json 읽기 오류 (무시됨): {e}")

    items = []
    archive_entries = []
    
    # 폴더 스캔: (폴더 상대경로, 작가명, 작가키, 서브폴더명, 학년정보)
    scan_configs = [
        ('민수', '민수', 'son', 'minsu', '초등', '초등학교 5학년', '2026_elem_5'),
        ('민서', '민서', 'daughter', 'minseo', '초등', '초등학교 1학년', '2026_elem_1'),
        ('.', '공동', 'together', 'together', '초등', '민수 & 민서 합작', '2026_elem')
    ]
    
    for folder_rel, author_name, author_key, sub_dir, stage, stage_name, sub_path in scan_configs:
        folder_full = os.path.normpath(os.path.join(upload_base, folder_rel))
        if not os.path.exists(folder_full):
            continue
            
        files = [f for f in sorted(os.listdir(folder_full)) if os.path.isfile(os.path.join(folder_full, f))]
        
        for f in files:
            base_name, ext = os.path.splitext(f)
            ext_lower = ext.lower()
            if ext_lower not in ('.jpg', '.jpeg', '.png', '.webp'):
                continue
                
            full_source = os.path.join(folder_full, f)
            
            # 새 폴더에 누끼 png가 존재하는지 확인
            candidate_png = [x for x in sf_files if os.path.splitext(x)[0] == base_name and x.lower().endswith('.png')]
            
            has_cutout = False
            chosen_source = full_source
            if ext_lower == '.png':
                has_cutout = True
            elif candidate_png:
                chosen_source = os.path.join(sf_dir, candidate_png[0])
                has_cutout = True
                
            # 파일 식별 및 대상 경로
            if f == '20260902_003203.jpg' and author_name == '민수':
                art_id = 'art_ms_real_01'
                dest_filename = 'minsu_cubism_art_20260902.jpg'
            elif f == '20260902_013104.jpg' and author_name == '민서':
                art_id = 'art_ms_real_02'
                dest_filename = 'minseo_mini_garden_20260902.jpg'
            else:
                art_id = f'art_{sub_dir}_{base_name}'
                target_ext = '.png' if has_cutout else '.jpg'
                dest_filename = f'{sub_dir}_{base_name}{target_ext}'
                
            rel_archive_media = f"assets/media/{sub_dir}/{sub_path}/{dest_filename}"
            dest_full = os.path.join(target_dirs[sub_dir], dest_filename)
            cdn_url = f"{CDN_BASE}/{rel_archive_media}"
            
            # 대상 파일이 없거나 소스가 더 최신인 경우 리사이즈 및 변환 후 kids-archive에 저장
            need_convert = not os.path.exists(dest_full) or os.path.getmtime(chosen_source) > os.path.getmtime(dest_full)
            if need_convert:
                try:
                    with Image.open(chosen_source) as img:
                        if not has_cutout:
                            img = ImageOps.exif_transpose(img)
                        w, h = img.size
                        max_dim = 1200
                        if max(w, h) > max_dim:
                            scale = max_dim / max(w, h)
                            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
                            
                        if has_cutout:
                            img.save(dest_full, format='PNG', optimize=True)
                        else:
                            if img.mode in ('RGBA', 'P'):
                                img = img.convert('RGB')
                            img.save(dest_full, format='JPEG', quality=85, optimize=True)
                    print(f"✨ 아카이브 최적화 변환: {dest_filename}")
                except Exception as e:
                    print(f"⚠️ 변환 실패 ({chosen_source}): {e}")
                    continue
                    
            # 날짜 파싱
            date_str = '2026-09-06'
            if len(base_name) >= 8 and base_name[:8].isdigit():
                date_str = f"{base_name[:4]}-{base_name[4:6]}-{base_name[6:8]}"
                
            # 메타데이터 매핑
            meta = meta_dict.get(art_id, {})
            num_str = base_name[-4:] if len(base_name) >= 4 else base_name
            default_title = f"{author_name}의 창의 예술 작품 ({num_str})"
            default_cat = "만들기/공예" if has_cutout else "그림/미술"
            default_icon = "✂️" if has_cutout else "🎨"
            title = meta.get("title", default_title)
            category = meta.get("category", default_cat)
            category_icon = meta.get("categoryIcon", default_icon)
            artist_note = meta.get("artistNote", f"{author_name}가 정성을 듬뿍 담아 완성한 소중하고 멋진 작품입니다.")
            likes = meta.get("likes", 0)
            stickers = meta.get("stickers", { "heart": 0, "thumb": 0, "star": 0, "trophy": 0 })
            comments = meta.get("comments", [])
            grade_str = meta.get("grade", "5학년" if author_name == "민수" else ("1학년" if author_name == "민서" else "민수 & 민서 합작"))

            items.append({
                "id": art_id,
                "author": author_name,
                "authorKey": author_key,
                "title": title,
                "category": category,
                "categoryIcon": category_icon,
                "date": meta.get("date", date_str),
                "grade": grade_str,
                "imageUrl": cdn_url,
                "hasCutout": has_cutout,
                "artistNote": artist_note,
                "likes": likes,
                "stickers": stickers,
                "comments": comments
            })

            # archive entry
            learning_pts = []
            if "입체" in title or "큐비즘" in title or "액자" in title or "온실" in title or "트리" in title or "테라리움" in title:
                learning_pts.append("공간 감각 및 입체 조형 구조화 능력 발휘")
            if category == "만들기/공예" or category == "만들기/입체공예":
                learning_pts.append("다양한 자연물 및 복합 재료를 활용한 소근육 응용력")
            else:
                learning_pts.append("선과 색채의 조화를 통한 시각적 감정 표현력")
            learning_pts.append(f"{author_name}만의 독창적인 예술적 상상력과 미적 탐구")

            archive_entries.append({
                "id": art_id,
                "student": author_name,
                "studentKey": 'minsu' if author_name == '민수' else ('minseo' if author_name == '민서' else 'together'),
                "stage": stage,
                "stageName": stage_name,
                "year": 2026,
                "semester": "2학기" if date_str >= "2026-09-01" else "1학기",
                "date": meta.get("date", date_str),
                "category": category,
                "categoryIcon": category_icon,
                "title": title,
                "coverImage": rel_archive_media,
                "galleryImages": [rel_archive_media],
                "description": artist_note,
                "learningPoints": learning_pts,
                "awards": "가족 갤러리 명예의 전당 등록",
                "likes": likes,
                "reactions": stickers,
                "comments": comments
            })
            
    # 정렬: 공동 작품 최우선 -> 날짜 최신순
    together_list = [x for x in items if x['author'] == '공동']
    other_list = [x for x in items if x['author'] != '공동']
    other_list.sort(key=lambda x: x['date'], reverse=True)
    final_list = together_list + other_list
    
    # kids-school gallery-data.js 출력
    js_content = "// 🎨 kids/data/gallery-data.js (공부방 꿈나무 갤러리 마스터 데이터)\n"
    js_content += "// ※ 미디어 원본은 kids-archive (Single Source of Truth)의 CDN URL을 참조합니다.\n\n"
    js_content += "const DEFAULT_GALLERY_DATA = " + json.dumps(final_list, ensure_ascii=False, indent=2) + ";\n\n"
    js_content += """if (typeof window !== 'undefined') {
  window.DEFAULT_GALLERY_DATA = DEFAULT_GALLERY_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_GALLERY_DATA };
}
"""
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(js_content)

    # kids-archive/data/archive-master-data.js 출력
    if os.path.exists(archive_root):
        archive_together = [x for x in archive_entries if x['student'] == '공동']
        archive_other = [x for x in archive_entries if x['student'] != '공동']
        archive_other.sort(key=lambda x: x['date'], reverse=True)
        final_archive = archive_together + archive_other

        archive_js_content = """// 🏛️ kids-archive/data/archive-master-data.js
// 민민이네 디지털 성장 아카이브 & 평생 포트폴리오 마스터 데이터베이스
// ※ 단일 원천(Single Source of Truth)으로 관리되며 초·중·고 12년 성장 기록을 영구 보존합니다.

const ARCHIVE_MASTER_DATA = """ + json.dumps(final_archive, ensure_ascii=False, indent=2) + """;

if (typeof window !== 'undefined') {
  window.ARCHIVE_MASTER_DATA = ARCHIVE_MASTER_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ARCHIVE_MASTER_DATA };
}
"""
        with open(archive_master_js, 'w', encoding='utf-8') as f:
            f.write(archive_js_content)
        print(f"🏛️ kids-archive 마스터 데이터 동기화 완료: {archive_master_js}")
        
    print(f"\n🎉 갤러리 동기화 완료! 총 {len(final_list)}개 작품이 등록되었습니다.")
    print(f"📁 결과 파일: {output_js}")

if __name__ == '__main__':
    run()
