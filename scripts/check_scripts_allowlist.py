"""scripts/ 허용 목록 검사기 — 목록에 없는 새 파이썬 파일(일회성 스크립트)을 막는다

규칙: 관제탑 docs/AGENT_COMMIT_PROTOCOL.md §8, GEMINI.md §9-5 (등록마다 일회성 스크립트를 새로 만들지 않는다)
목록: 검사하는 저장소의 scripts/allowed_scripts.txt (없으면 검사하지 않는다)
원본은 관제탑(master-tower) scripts/에만 있다. kids-school 사본은 관제탑 `python scripts/sync_agent_skills.py`가 맞춘다.

보는 곳: 저장소 맨 위의 *.py, scripts/ 바로 아래의 *.py (scripts/archive/, scripts/data/ 같은 하위 폴더는 보지 않는다)

사용법:
  python -X utf8 scripts/check_scripts_allowlist.py --staged --repo .   # pre-commit 훅: 이번 커밋에 새로 더하는 파일
  python -X utf8 scripts/check_scripts_allowlist.py --all --repo .      # 원격 시험·주간 점검: 목록에 없는 파일 전부
  python -X utf8 scripts/check_scripts_allowlist.py --all --json        # 점검용 요약
종료 코드: 0 통과 / 1 목록에 없는 파일 있음 / 2 실행 실패
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path, PurePosixPath

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

LIST_NAME = "scripts/allowed_scripts.txt"
CLEANUP_SECTION = "정리 대상"
HINT = ("기존 공식 도구에 기능을 더하세요(GEMINI.md §9-5). 정말 새 공용 도구라면 scripts/allowed_scripts.txt의 [도구] 아래에 "
        "'scripts/파일명.py  # 목적' 한 줄을 더해 같은 커밋에 넣습니다. 한 번 쓰고 버릴 코드는 scratch/에 둡니다.")


def watched(path: str) -> bool:
    """검사 대상 경로인가: 맨 위 *.py 또는 scripts/*.py"""
    p = PurePosixPath(path)
    if p.suffix != ".py":
        return False
    return len(p.parts) == 1 or (len(p.parts) == 2 and p.parts[0] == "scripts")


def load_allowlist(repo: Path) -> dict[str, str] | None:
    """{경로: 구역}. 목록 파일이 없으면 None. 줄 형식: 'scripts/x.py  # 목적', 구역 머리: '[도구]'"""
    f = repo / LIST_NAME
    if not f.exists():
        return None
    entries, section = {}, ""
    for raw in f.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1].strip()
            continue
        entries[line] = section
    return entries


def _git(repo: Path, *args: str) -> list[str]:
    out = subprocess.run(["git", "-C", str(repo), "-c", "core.quotepath=false", *args],
                         capture_output=True, text=True, encoding="utf-8", errors="replace")
    if out.returncode:
        raise RuntimeError(out.stderr.strip() or f"git {' '.join(args)} 실패")
    return [l.strip() for l in out.stdout.splitlines() if l.strip()]


def staged_new(repo: Path) -> list[str]:
    """이번 커밋에 새로 더해지는 파일. 이름 바꾸기도 새 파일로 본다(--no-renames)."""
    return _git(repo, "diff", "--cached", "--name-only", "--no-renames", "--diff-filter=A")


def all_files(repo: Path) -> list[str]:
    """git이 아는 파일 + 아직 안 올린 새 파일 중 지금 디스크에 있는 것 (지우고 아직 커밋 안 한 파일은 뺀다)"""
    files = set(_git(repo, "ls-files") + _git(repo, "ls-files", "--others", "--exclude-standard"))
    return sorted(f for f in files if (repo / f).is_file())


def check(repo: Path, staged: bool) -> dict:
    allow = load_allowlist(repo)
    if allow is None:
        return {"skipped": True, "unlisted": [], "missing": [], "cleanup": []}
    files = staged_new(repo) if staged else all_files(repo)
    unlisted = sorted(f for f in files if watched(f) and f not in allow)
    result = {"skipped": False, "unlisted": unlisted, "missing": [], "cleanup": []}
    if not staged:
        present = set(files)
        result["missing"] = sorted(p for p in allow if p not in present)
        result["cleanup"] = sorted(p for p, sec in allow.items() if sec == CLEANUP_SECTION and p in present)
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="scripts/ 허용 목록 검사 (일회성 스크립트 차단)")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--staged", action="store_true", help="이번 커밋에 새로 더하는 파일만 (pre-commit 훅)")
    mode.add_argument("--all", action="store_true", help="목록에 없는 파일 전부 (원격 시험·주간 점검)")
    ap.add_argument("--repo", type=Path, default=Path.cwd(), help="검사할 저장소 (기본: 현재 폴더)")
    ap.add_argument("--json", action="store_true", help="요약을 JSON으로 출력")
    args = ap.parse_args()
    try:
        result = check(args.repo.resolve(), staged=args.staged)
    except (OSError, RuntimeError) as e:
        print(f"⚠️ scripts 허용 목록 검사 실행 실패: {e}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(result, ensure_ascii=False))
        return 1 if result["unlisted"] else 0
    if result["skipped"]:
        return 0
    out = sys.stderr if args.staged else sys.stdout
    if result["unlisted"]:
        head = "❌ 허용 목록에 없는 새 파이썬 파일 — 커밋하지 않았습니다:" if args.staged else "❌ 허용 목록에 없는 파이썬 파일:"
        print(head, file=out)
        for f in result["unlisted"]:
            print(f"   - {f}", file=out)
        print(f"   {HINT}", file=out)
    if args.all:
        for f in result["missing"]:
            print(f"⚠️ 목록에는 있는데 파일이 없음 (목록에서 지우세요): {f}")
        if not result["unlisted"]:
            print(f"✅ scripts 허용 목록 통과 (정리 대상 {len(result['cleanup'])}개)")
    return 1 if result["unlisted"] else 0


if __name__ == "__main__":
    sys.exit(main())
