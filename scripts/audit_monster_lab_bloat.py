import re
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open('monster_lab.html', 'r', encoding='utf-8') as f:
    html = f.read()

lines = html.splitlines()
print(f"📊 monster_lab.html 전체 줄 수: {len(lines)}줄")

# 1. HTML 내 정적 단원 버튼 전수조사
chips = re.findall(r'<button[^>]*class=["\'][^"\']*parent-chip[^"\']*["\'][^>]*>(.*?)</button>', html)
print(f"🔍 HTML에 정적으로 박혀 있는 parent-chip 개수: {len(chips)}개")
for idx, c in enumerate(chips, 1):
    print(f"  {idx}. {c.strip()}")

# 2. 부모 관리판 모달 크기 조사
modal_match = re.search(r'(<!-- =+ 5-2.*?parentProgressModal.*?-->.*?)(<!-- =+ 6\.)', html, re.DOTALL)
if modal_match:
    modal_content = modal_match.group(1)
    print(f"\n📦 부모 진도 관리판 모달 HTML 줄 수: {len(modal_content.splitlines())}줄 ({len(modal_content)} 바이트)")

# 3. 부모 관리판 JS 로직 줄 수 조사
js_match = re.search(r'(// =+ 부모 진도 설정판.*?)(// =+ 아이 원터치 직결)', html, re.DOTALL)
if js_match:
    js_content = js_match.group(1)
    print(f"📦 부모 진도 관리판 JS 로직 줄 수: {len(js_content.splitlines())}줄 ({len(js_content)} 바이트)")
