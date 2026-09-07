#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎨 kids-school-main/scripts/build_gallery.py
-----------------------------------------------------------
[꿈나무 갤러리 원클릭 자동 동기화 빌더]
- uploads/ex/갤러리/ (민수, 민서, 공동) 폴더를 스캔하여
- 웹 최적화(1200px 리사이즈, 압축) 후 kids/assets/images/gallery/에 배포
- kids/data/gallery-data.js를 자동으로 갱신합니다.
"""

import os
import sys
import json
from PIL import Image, ImageOps

# Windows 콘솔 한글 인코딩 안전장치
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run():
    # 기준 경로 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    upload_base = os.path.join(project_root, 'uploads', 'ex', '갤러리')
    sf_dir = os.path.join(upload_base, '새 폴더')
    dest_base = os.path.join(project_root, 'kids', 'assets', 'images', 'gallery')
    output_js = os.path.join(project_root, 'kids', 'data', 'gallery-data.js')
    meta_json_path = os.path.join(project_root, 'kids', 'data', 'gallery-meta.json')
    
    if not os.path.exists(upload_base):
        print(f"❌ 업로드 경로가 존재하지 않습니다: {upload_base}")
        return

    # 타겟 폴더 생성
    for sub in ['minsu', 'minseo', 'together']:
        os.makedirs(os.path.join(dest_base, sub), exist_ok=True)
        
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
    
    # 폴더 스캔: (폴더 상대경로, 작가명, 작가키, 서브폴더명)
    scan_configs = [
        ('민수', '민수', 'son', 'minsu'),
        ('민서', '민서', 'daughter', 'minseo'),
        ('.', '공동', 'together', 'together')
    ]
    
    for folder_rel, author_name, author_key, sub_dir in scan_configs:
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
                
            # 기존 9월 2일 2개 보존 처리
            if f == '20260902_003203.jpg' and author_name == '민수':
                art_id = 'art_ms_real_01'
                dest_filename = 'minsu_cubism_art_20260902.jpg'
                rel_url = f'../assets/images/gallery/{dest_filename}'
                dest_full = os.path.join(dest_base, dest_filename)
            elif f == '20260902_013104.jpg' and author_name == '민서':
                art_id = 'art_ms_real_02'
                dest_filename = 'minseo_mini_garden_20260902.jpg'
                rel_url = f'../assets/images/gallery/{dest_filename}'
                dest_full = os.path.join(dest_base, dest_filename)
            else:
                art_id = f'art_{sub_dir}_{base_name}'
                target_ext = '.png' if has_cutout else '.jpg'
                dest_filename = f'{sub_dir}_{base_name}{target_ext}'
                rel_url = f'../assets/images/gallery/{sub_dir}/{dest_filename}'
                dest_full = os.path.join(dest_base, sub_dir, dest_filename)
                
            # 대상 파일이 없거나 소스가 더 최신인 경우 리사이즈 및 변환
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
                    print(f"✨ 최적화 변환: {dest_filename}")
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
            
            items.append({
                "id": art_id,
                "author": author_name,
                "authorKey": author_key,
                "title": meta.get("title", default_title),
                "category": meta.get("category", default_cat),
                "categoryIcon": meta.get("categoryIcon", default_icon),
                "date": meta.get("date", date_str),
                "grade": meta.get("grade", "5학년" if author_name == "민수" else ("1학년" if author_name == "민서" else "민수 & 민서 합작")),
                "imageUrl": rel_url,
                "hasCutout": has_cutout,
                "artistNote": meta.get("artistNote", f"{author_name}가 정성을 듬뿍 담아 완성한 소중하고 멋진 작품입니다."),
                "likes": meta.get("likes", 0),
                "stickers": meta.get("stickers", { "heart": 0, "thumb": 0, "star": 0, "trophy": 0 }),
                "comments": meta.get("comments", [])
            })
            
    # 정렬: 공동 작품 최우선 -> 날짜 최신순
    together_list = [x for x in items if x['author'] == '공동']
    other_list = [x for x in items if x['author'] != '공동']
    other_list.sort(key=lambda x: x['date'], reverse=True)
    
    final_list = together_list + other_list
    
    # gallery-data.js 출력
    js_content = "// 🎨 kids/data/gallery-data.js (공부방 꿈나무 갤러리 마스터 데이터)\n"
    js_content += "// ※ python scripts/build_gallery.py 에 의해 자동 동기화됩니다.\n\n"
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
        
    print(f"\n🎉 갤러리 동기화 완료! 총 {len(final_list)}개 작품이 갤러리에 등록되었습니다.")
    print(f"📁 결과 파일: {output_js}")

if __name__ == '__main__':
    run()
