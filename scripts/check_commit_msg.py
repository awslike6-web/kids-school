"""커밋 메시지 형식 검사기 (출처 `Agent:` · 교정 `교정:` · 반려 `반려:` 줄)

규칙 원본: 같은 폴더의 agent_commit_rules.json / 사람용 설명: 관제탑 docs/AGENT_COMMIT_PROTOCOL.md
원본은 관제탑(master-tower) scripts/에만 있다. kids-school의 scripts/ 사본은
관제탑 `python scripts/sync_agent_skills.py`가 맞추므로 사본을 직접 고치지 않는다.

사용법:
  python -X utf8 scripts/check_commit_msg.py --file .git/COMMIT_EDITMSG      # commit-msg 훅 (.githooks/commit-msg)
  python -X utf8 scripts/check_commit_msg.py --range origin/main..HEAD        # 원격 시험·주간 점검
  python -X utf8 scripts/check_commit_msg.py --range A..B --repo 경로 --json  # 요약을 JSON으로

--range는 규칙 JSON의 enforced_since 이후 커밋만 본다(그 전 표기는 월간 집계에서 aliases로 묶는다).
출처 줄이 없는 커밋은 막지 않고 '자동'(no_agent_subjects 제목) 또는 '출처 없음'으로만 분류한다.
종료 코드: 0 통과 / 1 형식 오류 / 2 실행 실패
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

RULES_PATH = Path(__file__).resolve().with_name("agent_commit_rules.json")
AGENT_VALUE = re.compile(r"^([a-z0-9][a-z0-9-]*) \(([^()]+)\)$")
TAG_LINE = re.compile(r"^\[([^\]]*)\]\s*(.*)$")
TARGET = re.compile(r"\(대상: [0-9a-f]{7,40}\)$")
SCISSORS = "------------------------ >8 ------------------------"
HINT = "규칙: docs/AGENT_COMMIT_PROTOCOL.md · 허용 목록: scripts/agent_commit_rules.json (관제탑)"


def load_rules(path: Path = RULES_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def clean_message(text: str) -> str:
    """git이 지우는 부분(가위 줄 아래, '#' 주석 줄)을 빼고 돌려준다."""
    lines = []
    for line in text.replace("\r\n", "\n").split("\n"):
        if line.startswith("#") and SCISSORS in line:
            break
        if not line.startswith("#"):
            lines.append(line.rstrip())
    return "\n".join(lines).strip()


def _check_agent(value: str, rules: dict) -> str | None:
    tools = rules["agent_line"]["tools"]
    aliases = rules["aliases"]["map"]
    hint = f" → 표준 표기: Agent: {aliases[value]}" if value in aliases and "?" not in aliases[value] else ""
    if "," in value:
        return f"Agent: {value} — 도구마다 한 줄씩 나눠 쓰세요"
    m = AGENT_VALUE.match(value)
    if not m:
        return f"Agent: {value} — 형식은 '{{도구}} ({{모델}})'이고 소문자로 씁니다{hint}"
    tool, model = m.groups()
    if tool not in tools:
        return f"Agent: {value} — 도구 '{tool}'는 목록에 없습니다 (허용: {', '.join(tools)}){hint}"
    if model not in tools[tool]:
        return (f"Agent: {value} — '{tool}'의 모델 '{model}'은 목록에 없습니다 (허용: {', '.join(tools[tool])})."
                f" 새 모델이면 agent_commit_rules.json에 한 줄 추가하세요{hint}")
    return None


def _check_tag_lines(prefix: str, bodies: list[str], tags: dict, allow_pass: bool) -> list[str]:
    errors = []
    used = []
    for body in bodies:
        m = TAG_LINE.match(body)
        if not m:
            errors.append(f"{prefix}{body} — 형식은 '{prefix}[태그] 내용'입니다")
            continue
        tag, content = m.group(1).strip(), m.group(2).strip()
        if "," in tag or content.startswith("["):  # [가, 나] 또는 [가][나] 묶음
            errors.append(f"{prefix}{body} — 태그는 줄마다 하나입니다. 사유마다 '{prefix}' 줄을 나눠 쓰세요")
            continue
        if tag not in tags or (tag == "통과" and not allow_pass):
            allowed = [t for t in tags if allow_pass or t != "통과"]
            errors.append(f"{prefix}{body} — 태그 '[{tag}]'는 목록에 없습니다 (허용: {', '.join(allowed)})")
            continue
        if tag != "통과" and not content:
            errors.append(f"{prefix}{body} — 무엇을 고쳤는지 내용을 적으세요")
            continue
        if "(대상:" in content and not TARGET.search(content):
            errors.append(f"{prefix}{body} — 대상 표기는 줄 끝에 '(대상: 커밋해시)'로 씁니다")
            continue
        used.append(tag)
    if "통과" in used and len(bodies) > 1:
        errors.append(f"{prefix}[통과]는 다른 {prefix.strip(': ')} 줄과 함께 쓸 수 없습니다")
    return errors


def check_message(text: str, rules: dict | None = None) -> tuple[list[str], dict]:
    """메시지 하나를 검사해 (오류 목록, 분류 정보)를 돌려준다.
    분류 kind: 'agent'(출처 줄 있음) / 'auto'(자동 커밋 제목) / 'none'(출처 없음, 사람 커밋 포함)"""
    rules = rules or load_rules()
    msg = clean_message(text)
    lines = msg.split("\n") if msg else []
    subject = lines[0] if lines else ""
    errors, agents, corrections, rejections = [], [], [], []
    for line in lines[1:]:
        stripped = line.strip()
        if stripped.lower().startswith("agent:"):
            if not stripped.startswith("Agent: "):
                errors.append(f"{stripped} — 줄 머리는 'Agent: '(대문자 A, 콜론 뒤 한 칸)로 씁니다")
                continue
            value = stripped[len("Agent: "):].strip()
            err = _check_agent(value, rules)
            if err:
                errors.append(err)
            agents.append(value)
        elif stripped.startswith("교정:"):
            corrections.append(stripped[len("교정:"):].strip())
        elif stripped.startswith("반려:"):
            rejections.append(stripped[len("반려:"):].strip())
    tags = rules["correction"]["tags"]
    errors += _check_tag_lines("교정: ", corrections, tags, allow_pass=True)
    errors += _check_tag_lines("반려: ", rejections, tags, allow_pass=False)
    if agents:
        kind = "agent"
    elif any(re.search(p, subject) for p in rules["no_agent_subjects"]["patterns"]):
        kind = "auto"
    else:
        kind = "none"
    return errors, {"subject": subject, "kind": kind, "agents": agents,
                    "corrections": len(corrections), "rejections": len(rejections)}


def check_range(repo: Path, rev_range: str, rules: dict | None = None) -> list[dict]:
    """범위 안에서 enforced_since 이후 커밋을 검사해 커밋별 결과 목록을 돌려준다."""
    rules = rules or load_rules()
    cmd = ["git", "-C", str(repo), "-c", "core.quotepath=false", "log", "--no-color",
           f"--since={rules['enforced_since']}", "--format=%H%x1f%B%x1e", rev_range]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if out.returncode:
        raise RuntimeError(out.stderr.strip() or "git log 실패")
    results = []
    for rec in out.stdout.split("\x1e"):
        if not rec.strip():
            continue
        sha, body = rec.strip("\n").split("\x1f", 1)
        errors, info = check_message(body, rules)
        results.append({"sha": sha[:7], "errors": errors, **info})
    return results


def summarize(results: list[dict]) -> dict:
    return {
        "commits": len(results),
        "errors": sum(bool(r["errors"]) for r in results),
        "agent": sum(r["kind"] == "agent" for r in results),
        "auto": sum(r["kind"] == "auto" for r in results),
        "none": sum(r["kind"] == "none" for r in results),
        "bad": [{"sha": r["sha"], "subject": r["subject"][:60], "errors": r["errors"]} for r in results if r["errors"]],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="커밋 메시지 형식 검사 (Agent:·교정:·반려: 줄)")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", type=Path, help="검사할 커밋 메시지 파일 (commit-msg 훅이 넘김)")
    src.add_argument("--range", dest="rev_range", help="검사할 커밋 범위 (예: origin/main..HEAD)")
    ap.add_argument("--repo", type=Path, default=Path.cwd(), help="--range를 볼 저장소 (기본: 현재 폴더)")
    ap.add_argument("--json", action="store_true", help="--range 요약을 JSON으로 출력")
    args = ap.parse_args()
    try:
        rules = load_rules()
        if args.file:
            errors, _ = check_message(args.file.read_text(encoding="utf-8", errors="replace"), rules)
            if errors:
                print("❌ 커밋 메시지 형식 오류 — 커밋하지 않았습니다:", file=sys.stderr)
                for e in errors:
                    print(f"   - {e}", file=sys.stderr)
                print(f"   {HINT}", file=sys.stderr)
                return 1
            return 0
        summary = summarize(check_range(args.repo, args.rev_range, rules))
    except (OSError, ValueError, KeyError, RuntimeError) as e:
        print(f"⚠️ 커밋 메시지 검사 실행 실패: {e}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(summary, ensure_ascii=False))
    else:
        print(f"🔍 커밋 메시지 검사 ({args.rev_range}, {rules['enforced_since']} 이후): "
              f"{summary['commits']}개 — 출처 {summary['agent']} · 자동 {summary['auto']} · 출처 없음 {summary['none']}")
        for b in summary["bad"]:
            print(f"❌ {b['sha']} {b['subject']}")
            for e in b["errors"]:
                print(f"   - {e}")
        print("✅ 형식 오류 없음" if not summary["bad"] else f"   {HINT}")
    return 1 if summary["bad"] else 0


if __name__ == "__main__":
    sys.exit(main())
