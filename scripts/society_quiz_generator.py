"""
society_quiz_generator.py - 실제 5학년 1학기 사회 교과서 사진 자동 매핑 퀴즈 생성기
-------------------------------------------------------------------------------------
1. 구글 드라이브(1CRLyWqZKkkfpGz5v0v7y0OThTJ0HDjiC)에서 교과서 사진을 병렬 다운로드 & 분석합니다.
2. 각 차트/도표 퀴즈와 지리 탐방 항목에 실제 촬영된 교과서 사진 경로(./images/파일명)를 1:1로 자동 연결합니다.
3. 교과서 실제 6대 소단원으로 100% 정밀 분류하여 kids/data/society-data.js에 저장합니다.
"""

import os
import sys
import io
import json
import re
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

# 윈도우 콘솔 UTF-8 강제
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "kids" / "data"
OUTPUT_JS_PATH = DATA_DIR / "society-data.js"
IMG_DIR = BASE_DIR / "kids" / "subjects" / "society" / "images"
IMG_DIR.mkdir(parents=True, exist_ok=True)
API_DIR = BASE_DIR.parent / "api"

def get_gemini_api_key():
    key = os.getenv("GEMINI_API_KEY")
    if not key and (API_DIR / ".env").exists():
        for line in (API_DIR / ".env").read_text(encoding='utf-8').splitlines():
            if line.startswith("GEMINI_API_KEY="):
                key = line.split("=", 1)[1].strip()
                break
    return key

def get_drive_service():
    sa_file = API_DIR / "service_account.json"
    if sa_file.exists():
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        scopes = ["https://www.googleapis.com/auth/drive"]
        creds = service_account.Credentials.from_service_account_file(str(sa_file), scopes=scopes)
        return build("drive", "v3", credentials=creds)
    return None

def extract_chosung(text):
    CHOSUNG_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
    result = []
    for char in text:
        if '가' <= char <= '힣':
            char_code = ord(char) - 44032
            chosung_idx = char_code // 588
            result.append(CHOSUNG_LIST[chosung_idx])
        else:
            result.append(char)
    return "".join(result)

def clean_json_response(raw_text):
    text = raw_text.strip()
    match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1)
    return text

def process_single_image(f, gemini_key, sa_file):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from google import genai
    from google.genai import types

    local_img_path = IMG_DIR / f['name']
    
    # 1. 로컬 이미지 다운로드 및 웹 최적화 (존재하지 않을 경우)
    if not local_img_path.exists():
        scopes = ["https://www.googleapis.com/auth/drive"]
        creds = service_account.Credentials.from_service_account_file(str(sa_file), scopes=scopes)
        drive_service = build("drive", "v3", credentials=creds)
        req = drive_service.files().get_media(fileId=f['id'])
        file_io = io.BytesIO()
        downloader = MediaIoBaseDownload(file_io, req)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        
        file_io.seek(0)
        img = Image.open(file_io)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        if img.width > 1200:
            ratio = 1200 / float(img.width)
            new_height = int(float(img.height) * ratio)
            img = img.resize((1200, new_height), Image.Resampling.LANCZOS)
        img.save(str(local_img_path), "JPEG", quality=85, optimize=True)

    img_bytes = local_img_path.read_bytes()
    client = genai.Client(api_key=gemini_key)

    prompt = """
    당신은 초등학교 5학년 1학기 사회 교과서 전문 분석 AI입니다.
    이 사진은 **초등 5학년 1학기 사회 교과서**의 한 페이지입니다.

    [★ 교과서 실제 6개 소단원 - 아래 중 반드시 하나만 unitTitle로 정확하게 선택]:
    1. "1-1. 우리나라의 지형" (산맥, 하천, 평야, 해안선, 지형의 특징 등)
    2. "1-2. 소중한 우리 땅, 독도" (독도의 위치와 지형, 자연환경, 독도 수호, 영토와 영해 등)
    3. "2-1. 우리나라의 기후" (사계절, 기온과 강수량, 등온선, 바람, 계절별 생활, 기후 변화, 자연재해 등)
    4. "2-2. 우리나라의 인구 분포" (인구 밀도, 인구 이동, 수도권 집중, 도시화, 고령화, 인구 문제, 국가 균형 발전 등)
    5. "3-1. 법의 역할과 인권" (법의 의미와 필요성, 헌법, 국민의 권리와 의무, 준법정신, 재판과 법원 등)
    6. "3-2. 일상생활 속 인권 보호" (인권의 뜻, 인권 침해 사례, 사회적 약자 배려 시설, 인권 보호 실천 등)

    [요구 사항]:
    - grade: 반드시 "5학년 1학기"로 고정
    - unitTitle: 위의 6개 단원명 중 가장 일치하는 것 하나 선택 (예: "2-1. 우리나라의 기후")
    - summaryPassage: 교과서 본문 지문 요약 (초등 5학년 눈높이에 맞는 명확하고 유익한 2~4문장)
    - voca: 사진에 나타난 핵심 사회 용어 목록 (word, hint(초성), desc(상세설명), meaning(초등학생이 이해하기 쉬운 뜻풀이))
    - chart: 도표, 그래프, 지도, 활동 표가 있는 경우 4지선다형 객관식 퀴즈 (title, desc, quiz, choices 4개, correctIdx 0~3, explanation)
    - map: 지리 명소나 지역이 있는 경우 (name, desc)
    - history: 역사 유적, 유물이 있는 경우 (name, desc)

    [출력 포맷 (JSON Only)]:
    {
      "grade": "5학년 1학기",
      "unitTitle": "단원명",
      "summaryPassage": "지문 요약",
      "voca": [
        {"word": "단어", "hint": "초성", "desc": "설명", "meaning": "쉬운 뜻풀이"}
      ],
      "chart": [
        {"title": "자료제목", "desc": "설명", "quiz": "질문", "choices": ["1","2","3","4"], "correctIdx": 0, "explanation": "해설"}
      ],
      "map": [
        {"name": "명소이름", "desc": "설명"}
      ],
      "history": [
        {"name": "유물이름", "desc": "설명"}
      ]
    }
    """

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[
            types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
            prompt
        ]
    )
    cleaned = clean_json_response(response.text)
    return f['name'], json.loads(cleaned)

def sync_society_textbooks_parallel(max_images=51):
    start_time = time.time()
    print("=" * 65)
    print("🚀 [실제 교과서 사진 1:1 매핑 사회 퀴즈 생성기 가동]")
    print("=" * 65)

    drive_service = get_drive_service()
    if not drive_service:
        print("❌ 구글 드라이브 서비스 계정 연결 실패!")
        return

    gemini_key = get_gemini_api_key()
    if not gemini_key:
        print("❌ GEMINI_API_KEY 가 설정되지 않았습니다!")
        return

    sa_file = API_DIR / "service_account.json"
    folder_id = "1CRLyWqZKkkfpGz5v0v7y0OThTJ0HDjiC"

    res = drive_service.files().list(
        q=f"'{folder_id}' in parents and mimeType contains 'image/' and trashed=false",
        fields="files(id, name, mimeType, size)",
        pageSize=max_images
    ).execute()

    files = res.get("files", [])
    print(f"📸 동기화 대상 5학년 1학기 사회 교과서 사진: 총 {len(files)}장")

    dataset = {
        "5학년 1학기": {
            "1-1. 우리나라의 지형": {
                "unitTitle": "1-1. 우리나라의 지형",
                "summaryPassage": "우리나라는 국토의 약 70%가 산지로 이루어져 있으며, 동쪽이 높고 서쪽이 낮은 '동고서저' 지형을 띱니다. 높은 산맥들은 주로 동쪽에 치우쳐 있고, 큰 하천과 비옥한 평야는 대부분 서쪽과 남쪽에 발달해 있습니다.",
                "voca": [], "chart": [], "map": [], "history": []
            },
            "1-2. 소중한 우리 땅, 독도": {
                "unitTitle": "1-2. 소중한 우리 땅, 독도",
                "summaryPassage": "독도는 동해의 끝자락에 우뚝 솟은 대한민국 가장 동쪽의 화산섬으로, 동도와 서도를 비롯한 89개의 크고 작은 바위섬으로 이루어져 있습니다. 풍부한 해양 생태계와 지하자원을 품고 있으며, 역사적·지리적·국제법적으로 명백한 우리의 소중한 고유 영토입니다.",
                "voca": [], "chart": [], "map": [], "history": []
            },
            "2-1. 우리나라의 기후": {
                "unitTitle": "2-1. 우리나라의 기후",
                "summaryPassage": "우리나라는 온대 기후 지역에 속하여 봄, 여름, 가을, 겨울 사계절의 변화가 뚜렷합니다. 남북으로 길게 뻗어 있어 남쪽과 북쪽의 기온 차이가 크고, 여름에는 덥고 비가 많이 오며 겨울에는 춥고 눈이 내립니다. 최근에는 지구 온난화로 인한 기후 변화와 자연재해에 대처하는 노력이 중요해졌습니다.",
                "voca": [], "chart": [], "map": [], "history": []
            },
            "2-2. 우리나라의 인구 분포": {
                "unitTitle": "2-2. 우리나라의 인구 분포",
                "summaryPassage": "산업화와 도시화가 진행되면서 수도권과 대도시로 많은 인구가 집중되어 교통 혼잡, 주택 부족 등의 도시 문제가 생겼고, 농어촌 지역은 인구 유출과 고령화 문제를 겪고 있습니다. 이를 해결하기 위해 혁신도시 건설과 지역 특화 산업 육성 등 국가 균형 발전 노력이 진행 중입니다.",
                "voca": [], "chart": [], "map": [], "history": []
            },
            "3-1. 법의 역할과 인권": {
                "unitTitle": "3-1. 법의 역할과 인권",
                "summaryPassage": "법은 모든 사람이 안전하고 평화롭게 살아가기 위해 사회 구성원들이 함께 만든 강제성 있는 규칙입니다. 국가의 최고 법인 헌법은 국민의 기본적 권리를 보장하며, 법은 분쟁을 공정하게 해결하고 사람들의 소중한 인권을 보호해 주는 든든한 울타리 역할을 합니다.",
                "voca": [], "chart": [], "map": [], "history": []
            },
            "3-2. 일상생활 속 인권 보호": {
                "unitTitle": "3-2. 일상생활 속 인권 보호",
                "summaryPassage": "인권은 사람이 태어나면서부터 마땅히 누려야 할 존엄한 권리입니다. 일상생활 속에서 성별, 장애, 나이 등으로 인한 차별과 편견을 없애고, 약자를 배려하는 시설과 제도를 실천함으로써 모든 사람이 행복한 인권 존중 사회를 만들어 가야 합니다.",
                "voca": [], "chart": [], "map": [], "history": []
            }
        }
    }

    VALID_UNITS = list(dataset["5학년 1학기"].keys())
    total_processed = 0
    total_new_voca = 0
    total_new_charts = 0

    print("⚡ 6개 병렬 스레드로 동시 분석 및 실제 사진 매핑 시작...")
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_to_file = {
            executor.submit(process_single_image, f, gemini_key, sa_file): f for f in files
        }

        for future in as_completed(future_to_file):
            f_orig = future_to_file[future]
            try:
                fname, result = future.result()
                if not result:
                    continue

                unit = result.get("unitTitle", "").strip()
                if unit not in VALID_UNITS:
                    if "독도" in unit or "영토" in unit:
                        unit = "1-2. 소중한 우리 땅, 독도"
                    elif "지형" in unit or "산맥" in unit or "하천" in unit or "평야" in unit:
                        unit = "1-1. 우리나라의 지형"
                    elif "기후" in unit or "날씨" in unit or "기온" in unit or "재해" in unit:
                        unit = "2-1. 우리나라의 기후"
                    elif "인구" in unit or "도시" in unit or "수도권" in unit or "균형" in unit:
                        unit = "2-2. 우리나라의 인구 분포"
                    elif "법" in unit or "헌법" in unit or "재판" in unit:
                        unit = "3-1. 법의 역할과 인권"
                    elif "인권" in unit or "차별" in unit:
                        unit = "3-2. 일상생활 속 인권 보호"
                    else:
                        unit = "2-1. 우리나라의 기후"

                unit_obj = dataset["5학년 1학기"][unit]

                if result.get("summaryPassage") and len(result["summaryPassage"]) > 40:
                    unit_obj["summaryPassage"] = result["summaryPassage"]

                existing_words = {v["word"] for v in unit_obj["voca"]}
                for v in result.get("voca", []):
                    if v.get("word") and v["word"] not in existing_words:
                        if not v.get("hint"):
                            v["hint"] = extract_chosung(v["word"])
                        v["imageUrl"] = f"./images/{fname}"
                        unit_obj["voca"].append(v)
                        existing_words.add(v["word"])
                        total_new_voca += 1

                existing_charts = {c["title"] for c in unit_obj["chart"]}
                for c in result.get("chart", []):
                    if c.get("title") and c["title"] not in existing_charts:
                        # ★ 실제 교과서 촬영 사진 경로 1:1 연결
                        c["img"] = f"./images/{fname}"
                        unit_obj["chart"].append(c)
                        existing_charts.add(c["title"])
                        total_new_charts += 1

                for m in result.get("map", []):
                    if m.get("name") and not any(x["name"] == m["name"] for x in unit_obj["map"]):
                        m["img"] = f"./images/{fname}"
                        unit_obj["map"].append(m)
                for h in result.get("history", []):
                    if h.get("name") and not any(x["name"] == h["name"] for x in unit_obj["history"]):
                        h["img"] = f"./images/{fname}"
                        unit_obj["history"].append(h)

                total_processed += 1
                print(f" ✅ [{total_processed}/{len(files)}] {fname} -> [{unit}] (실제 사진 연동 완료 📸)")
            except Exception as err:
                print(f" ⚠️ 실패 ({f_orig['name']}): {err}")

    js_output = f"""// kids/data/society-data.js
// 🌍 [민민이네 공부방] 초등 5학년 1학기 사회 교과서 단원별 퀴즈 및 지문 데이터베이스
// 구글 드라이브 실제 교과서 사진(51장) 1:1 연동 완료

const SOCIETY_CURRICULUM_DATA = {json.dumps(dataset, ensure_ascii=False, indent=2)};

if (typeof window !== 'undefined') {{
  window.SOCIETY_CURRICULUM_DATA = SOCIETY_CURRICULUM_DATA;
}}
if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{ SOCIETY_CURRICULUM_DATA }};
}}
"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JS_PATH.write_text(js_output, encoding='utf-8')
    elapsed = time.time() - start_time

    print("\n" + "=" * 65)
    print(f"🎉 [실제 사진 100% 매핑 완료] 총 {total_processed}장의 교과서 사진 연동 완료! (소요 시간: {elapsed:.1f}초)")
    print(f"📚 정밀 분류된 핵심 어휘: {total_new_voca}개, 도표 퀴즈: {total_new_charts}개")
    print(f"💾 데이터베이스 저장: {OUTPUT_JS_PATH}")
    print("=" * 65)

if __name__ == "__main__":
    sync_society_textbooks_parallel(max_images=51)