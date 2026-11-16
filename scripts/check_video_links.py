"""노션 CURRICULUM_DB 또는 자료 JSON의 '단원영상' 유튜브 링크를 점검하는 읽기 전용 도구.

사용 예:
  python -X utf8 scripts/check_video_links.py
  python -X utf8 scripts/check_video_links.py --file scripts/data/curriculum/science_5-2_2.json
명세: docs/video_unit_spec.md §5
영상 ID·화면 주소 규칙은 register_curriculum.py(youtube_id, screen_problem)와 한 벌.
초안: 안티그래비티 Hydrogen, 검토·수정: Claude (2026-11-16)
"""

from __future__ import annotations

import argparse, json, sys, time
import urllib.error, urllib.parse, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import register_voca as rv

import register_curriculum as rc  # 영상 ID·화면 주소 규칙은 등록기와 한 벌 (youtube_id, screen_problem)

CURRICULUM_DB_ID = rc.CURRICULUM_DB_ID
SITE_PREFIX = rc.SITE_PREFIX
parse_youtube_id = rc.youtube_id
check_screen = rc.screen_problem


def check_oembed(video_id: str) -> str:
    """유튜브 oEmbed API로 영상 생존 및 퍼가기 허용 여부를 확인한다."""
    target = urllib.parse.quote(f"https://www.youtube.com/watch?v={video_id}", safe="")
    req = urllib.request.Request(
        f"https://www.youtube.com/oembed?url={target}&format=json",
        headers={"User-Agent": "kids-school-link-check/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return "정상" if resp.status == 200 else f"확인 실패({resp.status})"
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return "퍼가기 막힘(유튜브에서 열기만)"
        return "삭제·비공개" if e.code == 404 else f"확인 실패({e.code})"
    except Exception as e:
        return f"확인 실패({type(e).__name__})"
    finally:
        # 연속 요청 부하 방지
        time.sleep(0.3)


def collect_from_file(path: Path) -> list[dict]:
    """자료 JSON에서 zone이 '단원영상'인 항목만 모은다."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [
        {"title": x.get("title", ""), "media_url": x.get("media_url", ""), "interactive_url": x.get("interactive_url", "")}
        for x in data.get("items", []) if x.get("zone") == "단원영상"
    ]


def collect_from_notion() -> list[dict]:
    """노션 CURRICULUM_DB에서 구역이 '단원영상'인 행을 조회한다.
    '미디어 URL 비어 있지 않음' 단독 조회는 페이지 경계에서 행 하나를 빠뜨렸다(320건 중 1건 누락, 2026-11-17 확인).
    그래서 구역 필터를 함께 건다. 노션은 아직 없는 선택지로 select 필터를 걸면 400을 내므로,
    그 경우는 영상 행이 하나도 없다는 뜻으로 본다(2026-11-16 확인)."""
    flt = {"and": [
        {"property": "구역", "select": {"equals": rc.VIDEO_ZONE}},
        {"property": "미디어 URL", "url": {"is_not_empty": True}},
    ]}
    try:
        pages = rv.query_all(CURRICULUM_DB_ID, flt)
    except RuntimeError as e:
        if "HTTP 400" in str(e) and rc.VIDEO_ZONE in str(e):
            return []
        raise
    return [
        {
            "title": rv.plain_title(p, "제목"),
            "media_url": p["properties"]["미디어 URL"].get("url") or "",
            "interactive_url": p["properties"]["인터랙티브 URL"].get("url") or "",
        }
        for p in pages
        if ((p["properties"].get("구역") or {}).get("select") or {}).get("name") == rc.VIDEO_ZONE
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="단원영상 유튜브 링크 점검")
    parser.add_argument("--file", type=Path, help="노션 대신 점검할 자료 JSON 경로")
    args = parser.parse_args()
    try:
        items = collect_from_file(args.file) if args.file else collect_from_notion()
    except Exception as e:
        print(f"{'파일' if args.file else '노션'} 읽기 실패: {e}")
        return 2
    if not items:
        print("점검할 영상이 없습니다")
        return 0
    ok_count = 0
    for item in items:
        title = item["title"] or "(제목 없음)"
        screen_url = item["interactive_url"]
        # 화면 주소 우선 점검 후 유튜브 ID·oEmbed 확인
        screen_err = check_screen(screen_url)
        vid = parse_youtube_id(item["media_url"])
        if screen_err:
            status = f"화면 주소 틀림({screen_err})"
        elif not vid:
            status = "영상 주소 틀림"
        else:
            status = check_oembed(vid)
        ok_count += status == "정상"
        icon = "✅" if status == "정상" else "⚠️"
        screen_key = screen_url[len(SITE_PREFIX):] if screen_url.startswith(SITE_PREFIX) else (screen_url or "-")
        print(f"{icon} {title} | {screen_key} | {vid or '-'} | {status}")
    bad_count = len(items) - ok_count
    print(f"총 {len(items)}개 · 정상 {ok_count} · 문제 {bad_count}")
    return 0 if bad_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
