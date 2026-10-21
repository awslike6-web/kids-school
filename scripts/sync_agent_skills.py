"""에이전트 스킬 두 벌 동기화 (.agent/skills 원본 → .claude/skills 사본)

- 원본: .agent/skills/<스킬>/  (Antigravity·Codex 등 공통 경로, 여기서만 수정)
- 사본: .claude/skills/<스킬>/ (Claude Code 전용, 직접 수정 금지)

사용법:
  python scripts/sync_agent_skills.py          # 원본을 사본으로 복사 (사본에만 있는 파일·스킬은 삭제) + 시스템 조감도 자동 갱신
  python scripts/sync_agent_skills.py --check  # 두 벌이 다르거나 조감도 스킬 요약이 낡았으면 목록을 출력하고 종료 코드 1 (커밋 전 확인용)

줄바꿈(CRLF/LF) 차이는 git 설정 때문에 생길 수 있으므로 비교에서 무시한다.

시스템 조감도(minmin_system_map.html) 자동 갱신:
  scripts/data/system_map_data.js의 AUTO-SYNC 표식 사이(window.SYSTEM_MAP_AUTO)만 다시 쓴다.
  - lastUpdated / catalogUpdatedAt: kids/core/CORE_CATALOG.md 의 git 마지막 커밋 시각 (커밋 안 된 수정이 있으면 파일 수정 시각)
  - skills: .agent/skills/*/SKILL.md frontmatter(name, description)에서 만든 스킬 카드 요약
  master-tower 루트의 sync_agent_skills.py가 이 스크립트를 먼저 실행하므로 루트에서 돌려도 함께 갱신된다.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.agent' / 'skills'
MIRROR = ROOT / '.claude' / 'skills'
CATALOG = ROOT / 'kids' / 'core' / 'CORE_CATALOG.md'
MAP_DATA = ROOT / 'scripts' / 'data' / 'system_map_data.js'
AUTO_START = '// <AUTO-SYNC:START>'
AUTO_END = '// <AUTO-SYNC:END>'
SUMMARY_LIMIT = 150


def relative_files(base: Path):
    if not base.exists():
        return set()
    return {p.relative_to(base) for p in base.rglob('*') if p.is_file()}


def normalized(path: Path) -> bytes:
    return path.read_bytes().replace(b'\r\n', b'\n')


def find_differences():
    src_files = relative_files(SOURCE)
    dst_files = relative_files(MIRROR)
    missing = sorted(src_files - dst_files)
    extra = sorted(dst_files - src_files)
    changed = sorted(f for f in src_files & dst_files if normalized(SOURCE / f) != normalized(MIRROR / f))
    return missing, extra, changed


def check() -> int:
    if not SOURCE.exists():
        print(f'❌ 원본 폴더가 없습니다: {SOURCE}')
        return 1
    missing, extra, changed = find_differences()
    if not (missing or extra or changed):
        print(f'✅ 스킬 두 벌 일치 ({len(relative_files(SOURCE))}개 파일)')
        return 0
    for f in missing:
        print(f'❌ 사본에 없음: .claude/skills/{f.as_posix()}')
    for f in extra:
        print(f'❌ 원본에 없는 사본: .claude/skills/{f.as_posix()}')
    for f in changed:
        print(f'❌ 내용 다름: {f.as_posix()}')
    print('👉 원본(.agent/skills)을 고친 뒤 `python scripts/sync_agent_skills.py`를 실행하세요.')
    return 1


def sync() -> int:
    if not SOURCE.exists():
        print(f'❌ 원본 폴더가 없습니다: {SOURCE}')
        return 1
    missing, extra, changed = find_differences()
    for f in missing + changed:
        target = MIRROR / f
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE / f, target)
        print(f'📄 복사: {f.as_posix()}')
    for f in extra:
        (MIRROR / f).unlink()
        print(f'🗑️ 삭제: .claude/skills/{f.as_posix()}')
    # 비어 버린 사본 스킬 폴더 정리
    if MIRROR.exists():
        for folder in sorted((p for p in MIRROR.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
            if not any(folder.iterdir()):
                folder.rmdir()
    return check()


# ───────── 시스템 조감도 자동 갱신 ─────────

def read_frontmatter(path: Path) -> dict:
    """SKILL.md 맨 위 --- 사이의 `키: 값` 한 줄 항목만 읽는다 (외부 YAML 라이브러리 없이)."""
    lines = path.read_text(encoding='utf-8').splitlines()
    if not lines or lines[0].strip() != '---':
        return {}
    meta = {}
    for line in lines[1:]:
        if line.strip() == '---':
            break
        key, sep, value = line.partition(':')
        if sep and key.strip() and not key.startswith(' '):
            meta[key.strip()] = value.strip().strip('"\'')
    return meta


def summarize(description: str) -> str:
    """카드용 요약: 괄호 설명과 '…요청에서 호출' 트리거 문장을 빼고 150자 안으로 자른다."""
    text = re.sub(r'\s*\([^)]*\)', '', description)
    sentences = [s for s in re.split(r'(?<=\.)\s+', text) if s]
    kept = [s for s in sentences if not ('"' in s and '호출' in s)] or sentences
    text = re.sub(r'\s+', ' ', ' '.join(kept)).strip().replace('"', "'")
    if len(text) <= SUMMARY_LIMIT:
        return text
    cut = text[:SUMMARY_LIMIT]
    boundary = max(cut.rfind(', '), cut.rfind('. '), cut.rfind(' '))
    return (cut[:boundary] if boundary > SUMMARY_LIMIT // 2 else cut).rstrip(' ,.') + '…'


def skill_cards() -> list:
    cards = []
    for skill_md in sorted(SOURCE.glob('*/SKILL.md')):
        meta = read_frontmatter(skill_md)
        name = meta.get('name') or skill_md.parent.name
        cards.append({
            'name': name,
            'path': f'kids-school-main/{skill_md.relative_to(ROOT).as_posix()}',
            'summary': summarize(meta.get('description', '')),
        })
    return cards


def catalog_changed_at() -> datetime:
    """CORE_CATALOG.md 변경 시각: 커밋 안 된 수정이 있으면 파일 수정 시각, 아니면 git 마지막 커밋 시각."""
    rel = CATALOG.relative_to(ROOT).as_posix()
    try:
        dirty = subprocess.run(['git', 'status', '--porcelain', '--', rel], cwd=ROOT,
                               capture_output=True, text=True, check=True).stdout.strip()
        if not dirty:
            stamp = subprocess.run(['git', 'log', '-1', '--format=%cI', '--', rel], cwd=ROOT,
                                   capture_output=True, text=True, check=True).stdout.strip()
            if stamp:
                return datetime.fromisoformat(stamp).astimezone()
    except (OSError, subprocess.CalledProcessError, ValueError):
        pass
    return datetime.fromtimestamp(CATALOG.stat().st_mtime).astimezone()


def build_auto_block() -> dict:
    changed = catalog_changed_at()
    return {
        'lastUpdated': changed.strftime('%Y-%m-%d'),
        'catalogUpdatedAt': changed.strftime('%Y-%m-%d %H:%M'),
        'skills': skill_cards(),
    }


def split_map_data():
    """조감도 데이터 파일을 (앞부분, 현재 자동 구간 dict, 뒷부분)으로 나눈다. 표식이 없으면 None."""
    if not MAP_DATA.exists():
        return None
    text = MAP_DATA.read_text(encoding='utf-8')
    start, end = text.find(AUTO_START), text.find(AUTO_END)
    if start < 0 or end < start:
        return None
    head_end = text.index('\n', start) + 1
    body = text[head_end:end]
    match = re.search(r'window\.SYSTEM_MAP_AUTO\s*=\s*(\{.*\});', body, re.S)
    current = json.loads(match.group(1)) if match else {}
    return text[:head_end], current, text[end:]


def render_auto(auto: dict) -> str:
    return 'window.SYSTEM_MAP_AUTO = ' + json.dumps(auto, ensure_ascii=False, indent=2) + ';\n'


def update_system_map() -> int:
    parts = split_map_data()
    if parts is None:
        print(f'❌ 조감도 데이터 파일이 없거나 AUTO-SYNC 표식이 없습니다: {MAP_DATA.relative_to(ROOT).as_posix()}')
        return 1
    head, current, tail = parts
    auto = build_auto_block()
    if auto == current:
        print(f'✅ 시스템 조감도 최신 (기준일 {auto["lastUpdated"]}, 스킬 {len(auto["skills"])}개)')
        return 0
    MAP_DATA.write_bytes((head + render_auto(auto) + tail).encode('utf-8'))
    print(f'🗺️ 시스템 조감도 갱신: 기준일 {auto["lastUpdated"]}, 스킬 {len(auto["skills"])}개 → {MAP_DATA.relative_to(ROOT).as_posix()}')
    return 0


def check_system_map() -> int:
    parts = split_map_data()
    if parts is None:
        print(f'❌ 조감도 데이터 파일이 없거나 AUTO-SYNC 표식이 없습니다: {MAP_DATA.relative_to(ROOT).as_posix()}')
        return 1
    current, auto = parts[1], build_auto_block()
    if current.get('skills') != auto['skills']:
        print('❌ 시스템 조감도 스킬 요약이 SKILL.md 원본과 다름')
        print('👉 `python scripts/sync_agent_skills.py`를 실행하세요.')
        return 1
    if current.get('catalogUpdatedAt') != auto['catalogUpdatedAt']:
        print(f'ℹ️ 조감도 기준일 {current.get("lastUpdated") or "없음"} → CORE_CATALOG 변경 {auto["catalogUpdatedAt"]} (동기화 실행 시 갱신, 검사는 통과)')
    else:
        print(f'✅ 시스템 조감도 일치 (기준일 {auto["lastUpdated"]})')
    return 0


def main():
    parser = argparse.ArgumentParser(description='.agent/skills 원본을 .claude/skills 사본과 동기화')
    parser.add_argument('--check', action='store_true', help='복사하지 않고 일치 여부만 검사 (불일치 시 종료 코드 1)')
    args = parser.parse_args()
    if args.check:
        sys.exit(check() | check_system_map())
    code = sync()
    sys.exit(code | update_system_map())


if __name__ == '__main__':
    main()
