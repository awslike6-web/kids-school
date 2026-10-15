"""에이전트 스킬 두 벌 동기화 (.agent/skills 원본 → .claude/skills 사본)

- 원본: .agent/skills/<스킬>/  (Antigravity·Codex 등 공통 경로, 여기서만 수정)
- 사본: .claude/skills/<스킬>/ (Claude Code 전용, 직접 수정 금지)

사용법:
  python scripts/sync_agent_skills.py          # 원본을 사본으로 복사 (사본에만 있는 파일·스킬은 삭제)
  python scripts/sync_agent_skills.py --check  # 두 벌이 다르면 목록을 출력하고 종료 코드 1 (커밋 전 확인용)

줄바꿈(CRLF/LF) 차이는 git 설정 때문에 생길 수 있으므로 비교에서 무시한다.
"""
import argparse
import shutil
import sys
from pathlib import Path

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.agent' / 'skills'
MIRROR = ROOT / '.claude' / 'skills'


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


def main():
    parser = argparse.ArgumentParser(description='.agent/skills 원본을 .claude/skills 사본과 동기화')
    parser.add_argument('--check', action='store_true', help='복사하지 않고 일치 여부만 검사 (불일치 시 종료 코드 1)')
    args = parser.parse_args()
    sys.exit(check() if args.check else sync())


if __name__ == '__main__':
    main()
