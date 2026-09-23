"""
민민이네 공부방 PWA 전용 고화질 아이콘 생성 스크립트 (192x192, 512x512)
"""
from PIL import Image, ImageDraw, ImageFont
import math

def create_kids_icon(size):
    # 초고해상도 4배 수퍼샘플링 렌더링 후 다운스케일 (안티앨리어싱 극대화)
    scale = 4
    render_size = size * scale
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. 둥근 스퀴클 배경 (부드러운 스카이블루 ~ 파스텔 옐로우 그라데이션)
    margin = int(render_size * 0.04)
    radius = int(render_size * 0.22)
    
    # 그라데이션 베이스 박스
    for y in range(margin, render_size - margin):
        ratio = (y - margin) / (render_size - 2 * margin)
        # #4ECDC4 (78, 205, 196) -> #6EC6F5 (110, 198, 245) -> #A78BFA (167, 139, 250)
        if ratio < 0.5:
            sub = ratio * 2
            r = int(78 + (110 - 78) * sub)
            g = int(205 + (198 - 205) * sub)
            b = int(196 + (245 - 196) * sub)
        else:
            sub = (ratio - 0.5) * 2
            r = int(110 + (167 - 110) * sub)
            g = int(198 + (139 - 198) * sub)
            b = int(245 + (250 - 245) * sub)
        draw.line([(margin, y), (render_size - margin, y)], fill=(r, g, b, 255), width=1)

    # 둥근 모서리 마스크 생성
    mask = Image.new('L', (render_size, render_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, render_size - margin, render_size - margin],
        radius=radius,
        fill=255
    )
    
    # 배경에 마스크 적용
    bg_img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    bg_img.paste(img, (0, 0), mask)
    img = bg_img
    draw = ImageDraw.Draw(img)

    # 2. 책 (펼쳐진 책 그래픽 디자인)
    cx = render_size // 2
    cy = int(render_size * 0.55)
    bw = int(render_size * 0.65)
    bh = int(render_size * 0.38)

    # 책등 및 펼쳐진 페이지
    left_x = cx - bw // 2
    right_x = cx + bw // 2
    top_y = cy - bh // 2
    bottom_y = cy + bh // 2

    # 책 그림자
    draw.rounded_rectangle(
        [left_x + 8, top_y + 14, right_x + 8, bottom_y + 16],
        radius=int(16 * scale),
        fill=(30, 40, 70, 60)
    )

    # 책 하단 커버 (#FF6B9D 핑크)
    draw.rounded_rectangle(
        [left_x, top_y + int(10 * scale), right_x, bottom_y + int(10 * scale)],
        radius=int(14 * scale),
        fill=(255, 107, 157, 255)
    )

    # 왼쪽 페이지 (화이트/아이보리)
    left_page = [
        (cx - int(4 * scale), top_y + int(4 * scale)),
        (left_x + int(8 * scale), top_y + int(8 * scale)),
        (left_x + int(8 * scale), bottom_y),
        (cx - int(4 * scale), bottom_y - int(4 * scale))
    ]
    draw.polygon(left_page, fill=(255, 254, 247, 255))

    # 오른쪽 페이지
    right_page = [
        (cx + int(4 * scale), top_y + int(4 * scale)),
        (right_x - int(8 * scale), top_y + int(8 * scale)),
        (right_x - int(8 * scale), bottom_y),
        (cx + int(4 * scale), bottom_y - int(4 * scale))
    ]
    draw.polygon(right_page, fill=(250, 248, 238, 255))

    # 페이지 텍스트 라인 데코레이션
    line_color = (200, 210, 230, 255)
    line_w = int(4 * scale)
    for ly in [top_y + int(24 * scale), top_y + int(40 * scale), top_y + int(56 * scale)]:
        draw.line([(left_x + int(20 * scale), ly), (cx - int(16 * scale), ly - int(2 * scale))], fill=line_color, width=line_w)
        draw.line([(cx + int(16 * scale), ly - int(2 * scale)), (right_x - int(20 * scale), ly)], fill=line_color, width=line_w)

    # 3. 책 위에서 솟아오르는 빛나는 별 🌟
    star_cx = cx
    star_cy = int(render_size * 0.30)
    star_r = int(render_size * 0.14)
    star_inner = int(star_r * 0.45)

    star_pts = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = star_r if i % 2 == 0 else star_inner
        star_pts.append((star_cx + r * math.cos(angle), star_cy - r * math.sin(angle)))
    
    # 별 외곽 발광
    draw.polygon(star_pts, fill=(255, 217, 61, 255))
    # 별 하이라이트
    inner_star_pts = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = int(star_r * 0.6) if i % 2 == 0 else int(star_inner * 0.6)
        inner_star_pts.append((star_cx + r * math.cos(angle), star_cy - r * math.sin(angle)))
    draw.polygon(inner_star_pts, fill=(255, 245, 150, 255))

    # 4. 안티앨리어싱 리사이징
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    for sz in [192, 512]:
        icon = create_kids_icon(sz)
        filename = f"icon-{sz}.png"
        icon.save(filename, "PNG")
        print(f"Created {filename} successfully ({sz}x{sz})")
