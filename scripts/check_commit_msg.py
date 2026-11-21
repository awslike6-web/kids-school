"""커밋 메시지 형식 검사기 (출처 `Agent:` · 교정 `교정:` · 반려 `반려:` · 검토 `검토:` 줄)

검토 줄(2026-11-21): L2 경로를 고친 에이전트 커밋에 교차 검토 기록이 있는지 본다. 규칙 JSON review_line.mode가
'warn'인 동안은 경고만 내고 막지 않는다(한 달 시험, 2026-12-21 월말 점검에서 사람이 정함).

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
from datetime import datetime
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


def l2_files(files: list[str], repo_name: str | None, rules: dict) -> list[str]:
    """고친 파일 중 위험도 L2 경로(규칙 JSON review_line.l2_paths)에 걸리는 것."""
    rl = rules.get("review_line") or {}
    prefixes = rl.get("l2_paths", {}).get(repo_name or "", [])
    excludes = rl.get("l2_exclude", [])
    return [f for f in files if any(f.startswith(p) for p in prefixes) and not any(x in f for x in excludes)]


def _check_reviews(values: list[str], agents: list[str], files: list[str] | None,
                   repo_name: str | None, rules: dict) -> list[str]:
    """'검토:' 줄 경고 목록. 형식이 틀렸거나, L2 경로를 고친 에이전트 커밋에 검토 줄이 없거나,
    검토자가 작성자와 같은 계열이면 알린다. mode가 warn이면 호출한 쪽이 막지 않는다."""
    rl = rules.get("review_line")
    if not rl:
        return []
    reviewers, none = rl["reviewers"], rl["none_value"]
    prefix = rl["prefix"]
    warns, families = [], set()
    for v in values:
        if "," in v.split("(", 1)[0]:  # 괄호 안 사유의 쉼표는 괜찮다
            warns.append(f"{prefix}{v} — 검토자마다 '{prefix}' 줄을 나눠 쓰세요")
            continue
        name = re.split(r"[\s(]", v, maxsplit=1)[0] if v else ""  # 'neon(메모)'처럼 붙여 써도 이름만
        if name == none:
            if not v[len(none):].strip():
                warns.append(f"{prefix}{none} — 왜 생략했는지 '{prefix}{none} (사유)'로 적으세요")
            continue
        if name not in reviewers:
            warns.append(f"{prefix}{v} — 검토자 '{name}'는 목록에 없습니다 (허용: {', '.join(reviewers)}, 생략은 '{none} (사유)')")
            continue
        families.add(reviewers[name])
    if not agents:  # 사람·자동 커밋은 교차 검토 대상이 아니다
        return warns
    hit = l2_files(files or [], repo_name, rules)
    if hit and not values:
        more = f" 외 {len(hit) - 1}개" if len(hit) > 1 else ""
        warns.append(f"L2 경로({hit[0]}{more})를 고쳤는데 '{prefix}' 줄이 없습니다. 교차 검토를 받았으면 "
                     f"'{prefix}neon'처럼, 일부러 생략했으면 '{prefix}{none} (사유)'로 남기세요")
    author = {rl["tool_family"].get(a.split(" ", 1)[0]) for a in agents} - {None}
    if families and len(author) == 1 and families <= author:
        warns.append(f"검토자가 작성자와 같은 계열({next(iter(author))})입니다. 교차 검토는 다른 계열 모델로 받습니다 "
                     "(위험도 표: kids-school-main/GEMINI.md §9)")
    return warns


def check_message(text: str, rules: dict | None = None, changed_files: list[str] | None = None,
                  repo_name: str | None = None) -> tuple[list[str], dict]:
    """메시지 하나를 검사해 (오류 목록, 분류 정보)를 돌려준다.
    분류 kind: 'agent'(출처 줄 있음) / 'auto'(자동 커밋 제목) / 'none'(출처 없음, 사람 커밋 포함)
    changed_files·repo_name을 주면 L2 경로 검토 줄도 본다. 그 결과는 info['review_warnings']에 담고,
    규칙 mode가 'block'일 때만 오류에도 넣는다."""
    rules = rules or load_rules()
    msg = clean_message(text)
    lines = msg.split("\n") if msg else []
    subject = lines[0] if lines else ""
    errors, agents, corrections, rejections, reviews = [], [], [], [], []
    review_head = (rules.get("review_line") or {}).get("prefix", "검토: ").strip()
    for line in lines[1:]:
        stripped = line.strip()
        if stripped.startswith(review_head):
            reviews.append(stripped[len(review_head):].strip())
            continue
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
    review_warnings = []
    if changed_files is not None or reviews:
        review_warnings = _check_reviews(reviews, agents, changed_files, repo_name, rules)
        if (rules.get("review_line") or {}).get("mode") == "block":
            errors += review_warnings
    return errors, {"subject": subject, "kind": kind, "agents": agents,
                    "corrections": len(corrections), "rejections": len(rejections),
                    "reviews": reviews, "review_warnings": review_warnings}


def _git(repo: Path, *args: str) -> str:
    out = subprocess.run(["git", "-C", str(repo), "-c", "core.quotepath=false", *args],
                         capture_output=True, text=True, encoding="utf-8", errors="replace")
    return out.stdout if out.returncode == 0 else ""


def repo_name_of(repo: Path, rules: dict) -> str | None:
    """원격 주소 끝 이름(kids-school 등). worktree에서도 같다. 원격이 없으면 규칙 repos의 local 폴더 이름으로 찾는다."""
    url = _git(repo, "config", "--get", "remote.origin.url").strip()
    if url:
        return url.rstrip("/").rsplit("/", 1)[-1].removesuffix(".git")
    top = Path(_git(repo, "rev-parse", "--show-toplevel").strip() or repo).name
    for r in rules.get("repos", {}).get("enforce", []):
        if Path(r.get("local", "")).name == top:
            return r["github"]
    return None


def staged_files(repo: Path) -> list[str] | None:
    """commit-msg 훅에서 이번 커밋에 들어갈 파일. 병합 커밋이면 None(검토 줄은 각 커밋에서 본다).
    한계: --amend면 고치기 전 커밋에 이미 있던 파일은 안 보인다. 원격 시험·주간 점검(check_range)이 최종 커밋으로 다시 본다."""
    if _git(repo, "rev-parse", "-q", "--verify", "MERGE_HEAD").strip():
        return None
    return [f for f in _git(repo, "diff", "--cached", "--name-only").splitlines() if f]


def _after(when: str, since: str) -> bool:
    try:
        return datetime.fromisoformat(when) >= datetime.fromisoformat(since)
    except (ValueError, TypeError):  # 시각대 없는 since 등 잘못된 설정이면 검토 검사만 건너뛴다
        return False


def check_range(repo: Path, rev_range: str, rules: dict | None = None) -> list[dict]:
    """범위 안에서 enforced_since 이후 커밋을 검사해 커밋별 결과 목록을 돌려준다.
    review_line.since 이후의 병합 아닌 에이전트 커밋은 고친 파일로 검토 줄도 본다."""
    rules = rules or load_rules()
    cmd = ["git", "-C", str(repo), "-c", "core.quotepath=false", "log", "--no-color",
           f"--since={rules['enforced_since']}", "--format=%H%x1f%cI%x1f%P%x1f%B%x1e", rev_range]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if out.returncode:
        raise RuntimeError(out.stderr.strip() or "git log 실패")
    review_since = (rules.get("review_line") or {}).get("since")
    name = repo_name_of(repo, rules) if review_since else None
    results = []
    for rec in out.stdout.split("\x1e"):
        if not rec.strip():
            continue
        sha, when, parents, body = rec.strip("\n").split("\x1f", 3)
        files = None
        if review_since and len(parents.split()) <= 1 and _after(when, review_since) and "Agent:" in body:
            files = [f for f in _git(repo, "show", "--name-only", "--format=", sha).splitlines() if f]
        errors, info = check_message(body, rules, files, name)
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
        "reviewed": sum(bool(r.get("reviews")) for r in results),
        "review_warnings": sum(bool(r.get("review_warnings")) for r in results),
        "review_bad": [{"sha": r["sha"], "subject": r["subject"][:60], "warnings": r["review_warnings"]}
                       for r in results if r.get("review_warnings")],
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
            errors, info = check_message(args.file.read_text(encoding="utf-8", errors="replace"), rules,
                                         staged_files(args.repo), repo_name_of(args.repo, rules))
            # block 모드면 검토 경고가 이미 errors에 들어 있어 아래 오류 목록에 나온다
            if info["review_warnings"] and rules.get("review_line", {}).get("mode") != "block":
                print("⚠️ 검토 줄 경고 (경고만 — 이 경고로는 커밋이 막히지 않습니다):", file=sys.stderr)
                for w in info["review_warnings"]:
                    print(f"   - {w}", file=sys.stderr)
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
        warn_mode = rules.get("review_line", {}).get("mode") != "block"  # block이면 위 ❌ 목록에 이미 나옴
        for b in summary["review_bad"] if warn_mode else []:  # warn 모드에서는 종료 코드에 영향 없음
            print(f"⚠️ {b['sha']} {b['subject']}")
            for w in b["warnings"]:
                print(f"   - {w}")
        if summary["review_warnings"] and warn_mode:
            print(f"⚠️ 검토 줄 경고 {summary['review_warnings']}개 커밋 (경고만, 실패로 치지 않음)")
        print("✅ 형식 오류 없음" if not summary["bad"] else f"   {HINT}")
    return 1 if summary["bad"] else 0


if __name__ == "__main__":
    sys.exit(main())
