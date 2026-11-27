"""🏷️ 등록 도구용 버전 표시(?v=) 다시 찍기 — node scripts/stamp_versions.mjs --only 를 부르는 얇은 감싸개.

왜: 화면이 데이터 파일을 `gallery-data.js?v=<내용 해시>`처럼 가리키고, 회귀 시험(tests/version-stamps.test.mjs)이
그 해시가 파일 내용과 맞는지 본다. 등록 도구가 데이터 파일을 바꾼 뒤 예전처럼 `?v=YYYYMMDD-HHMM` 시각 글자를
쓰면 시험이 깨지고, 자동 푸시가 푸시 전 검사(ci_local.py)에 막힌다(2026-11-27 발견).
그래서 등록 도구는
  1. 아무것도 쓰기 전에 dirty_files()로 「이미 커밋 안 한 변경이 있던 파일」을 적어 두고(남의 작업),
  2. 데이터 파일을 다 쓴 **뒤에** restamp_refs()를 불러 그 파일을 가리키는 자리만 해시로 맞추고,
  3. 돌려받은 files를 같은 커밋에 넣고, safe_to_push가 거짓이면 자동 푸시를 하지 않는다.
푸시 전 검사는 커밋이 아니라 디스크의 파일을 보므로, 남의 변경 때문에 커밋에서 뺀 파일이 있으면 낡은 커밋이
검사를 통과해 원격에서만 깨진다(카본 검토 2026-11-27) → 그런 경우는 푸시를 멈추고 사람에게 넘긴다.

쓰는 곳: scripts/add_activity_photo.py(특별한 날), 관제탑 scripts/sync_quick_upload.py(갤러리 입구).
시험: scripts/test_version_stamp.py
"""
from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from ci_local import find_node  # noqa: E402  (node 찾기 한 벌: CI_LOCAL_NODE → PATH → 기본 설치 위치)

STAMP_TOOL = 'scripts/stamp_versions.mjs'
CHANGED_PREFIX = '   고침: '


@dataclass
class RestampResult:
    files: list[str] = field(default_factory=list)    # 같은 커밋에 넣을 파일 (저장소 기준 / 경로)
    skipped: list[str] = field(default_factory=list)  # 고쳤지만 남의 변경이 있어 커밋에서 뺀 파일
    ok: bool = True                                   # 거짓 = 도장을 못 찍음 (node 없음·도구 실패·git 실패)

    @property
    def safe_to_push(self) -> bool:
        return self.ok and not self.skipped


def _key(rel: str) -> str:
    """경로 비교 열쇠 (구분자·Windows 대소문자 차이 무시)."""
    return rel.replace('\\', '/').lower()


def parse_porcelain_z(out: str) -> set[str]:
    """`git status --porcelain -z -uall` 출력 → 경로 집합. 이름 바뀜·복사(R·C)는 새 경로와 옛 경로를 모두 넣는다."""
    paths, tokens, i = set(), out.split('\0'), 0
    while i < len(tokens):
        entry = tokens[i]
        i += 1
        if len(entry) < 4:
            continue
        paths.add(entry[3:])
        if entry[0] in 'RC' and i < len(tokens):  # 다음 토큰이 옛 경로
            paths.add(tokens[i])
            i += 1
    return paths


def dirty_files(school_root) -> set[str] | None:
    """커밋 안 한 변경이 있는 파일(미추적 포함). git이 실패하면 None (그때는 자동 푸시하지 않는다)."""
    try:
        res = subprocess.run(['git', 'status', '--porcelain', '-z', '-uall'], cwd=school_root,
                             capture_output=True, text=True, encoding='utf-8', errors='replace')
    except OSError:
        return None
    return parse_porcelain_z(res.stdout) if res.returncode == 0 else None


def restamp_refs(school_root, data_rels, dry_run=False, foreign=None) -> RestampResult:
    """data_rels(저장소 기준 경로)를 가리키는 ?v= 자리를 내용 해시로 맞춘다.

    foreign: 이 도구가 쓰기 시작하기 **전에** dirty_files()로 적어 둔 집합. 그 파일은 고치기는 하되 커밋에서 빼고
             skipped로 알린다(남의 작업을 같이 커밋하지 않게). None이면 지금 상태에서 data_rels만 뺀 것으로 갈음한다.
    dry_run: 아무것도 쓰지 않고 지금 낡은 파일만 files로 돌려준다.
    """
    school_root = Path(school_root)
    rels = [r for r in data_rels if (school_root / r).is_file()]
    if not rels:
        return RestampResult()
    node, _how, tried = find_node()
    if not node:
        print(f"  ⚠️ [버전 표시] node를 찾지 못해 ?v= 를 다시 찍지 못했습니다(찾아본 곳: {', '.join(tried)}).")
        print("     공부방 폴더에서 `node scripts/stamp_versions.mjs` 를 돌리고 커밋한 뒤 푸시하세요.")
        return RestampResult(ok=False)
    if not dry_run and foreign is None:
        now = dirty_files(school_root)
        if now is None:
            print("  ⚠️ [버전 표시] git 상태를 읽지 못해 ?v= 를 다시 찍지 않았습니다.")
            return RestampResult(ok=False)
        foreign = now - set(rels)
    foreign_keys = {_key(p) for p in (foreign or ())}
    cmd = [node, STAMP_TOOL, '--only', ','.join(rels)] + (['--check'] if dry_run else [])
    try:
        res = subprocess.run(cmd, cwd=school_root, capture_output=True, text=True, encoding='utf-8', errors='replace')
    except OSError as error:
        print(f"  ⚠️ [버전 표시] stamp_versions.mjs 를 실행하지 못했습니다: {error}")
        return RestampResult(ok=False)
    if res.returncode not in ((0, 1) if dry_run else (0,)):  # --check는 낡은 곳이 있으면 1
        print(f"  ⚠️ [버전 표시] stamp_versions.mjs 실패 (종료 코드 {res.returncode}): {res.stdout.strip() or res.stderr.strip()}")
        return RestampResult(ok=False)
    changed = [line[len(CHANGED_PREFIX):].strip() for line in res.stdout.splitlines() if line.startswith(CHANGED_PREFIX)]
    if dry_run:
        return RestampResult(files=changed)
    result = RestampResult(files=[r for r in changed if _key(r) not in foreign_keys],
                           skipped=[r for r in changed if _key(r) in foreign_keys])
    for rel in result.skipped:
        print(f"  ⚠️ [버전 표시] {rel} 에 커밋 안 한 다른 변경이 있어 자동 커밋에서 뺐습니다 → 자동 푸시를 멈춥니다."
              " 그 변경과 함께 직접 커밋한 뒤 푸시하세요.")
    if result.files:
        print(f"  🏷️ [버전 표시] ?v= 를 내용 해시로 맞춤: {', '.join(result.files)}")
    return result
