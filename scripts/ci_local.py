"""공부방 로컬 CI: GitHub Actions 「공부방 회귀 시험」(.github/workflows/regression.yml)과 같은 검사를 이 PC에서 돌린다.

왜: 2026-11-17~20 main이 19번 연속 빨간불이었다. 첫 실패(078e5ed)는 node 시험이 아니라 파이썬 등록기 시험이었는데,
「커밋 전 필수」로 node 시험만 돌리고 있어서 아무도 몰랐다. 로컬과 원격의 검사 목록을 이 파일 하나로 맞춘다.

- 관제탑 .githooks/pre-push가 푸시 전에 이 파일을 실행하고, 실패하면 푸시를 막는다 (Claude·안티그래비티·사람 모두).
- 직접 실행: python -X utf8 scripts/ci_local.py   (이 PC 약 15~20초, 노션 미접속)
- 원격과 다른 점: 연산 스튜디오 범위 시험은 로컬 표본(원격은 KIDS_TEST_FULL=1 전수), 커밋 메시지 형식은 commit-msg 훅이 커밋할 때 이미 본다.
- node 찾기: CI_LOCAL_NODE → PATH → 기본 설치 위치(Program Files\\nodejs 등). 끝내 없으면 찾아본 곳을 보여 주고 종료 코드 3.
  (안티그래비티 앱처럼 PATH가 다른 환경에서 푸시할 때 「node가 없다」는 원인을 바로 알 수 있게)
- 단계를 더하거나 빼면 regression.yml도 같이 고친다. scripts/test_ci_local.py가 두 목록이 같은지 확인한다.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NODE_MISSING = 3  # 종료 코드: node를 못 찾음 (pre-push 훅이 로그에 「node없음」으로 남긴다)

# regression.yml 「어휘·교재 등록기 시험」 단계와 같은 목록 (scripts/test_ci_local.py가 대조)
PY_UNITTESTS = [
    'scripts/test_register_voca.py',
    'scripts/test_register_curriculum.py',
    'scripts/test_ci_local.py',
    'scripts/test_version_stamp.py',
]
NODE_TEST_GLOB = 'tests/**/*.test.mjs'


def _version_key(name: str) -> tuple[int, ...]:
    """'v22.11.0' → (22, 11, 0). 숫자가 아닌 조각은 0."""
    return tuple(int(x) if x.isdigit() else 0 for x in name.lstrip('v').split('.'))


def node_candidates() -> list[Path]:
    """PATH에 node가 없을 때(안티그래비티 앱 등 다른 실행 환경) 찾아볼 기본 설치 위치."""
    env = os.environ.get
    places = [Path(env('ProgramFiles', r'C:\Program Files')) / 'nodejs' / 'node.exe',
              Path(env('ProgramFiles(x86)', r'C:\Program Files (x86)')) / 'nodejs' / 'node.exe',
              Path(env('LOCALAPPDATA', '')) / 'Programs' / 'nodejs' / 'node.exe',
              Path(env('USERPROFILE', '')) / '.volta' / 'bin' / 'node.exe']
    if env('NVM_SYMLINK'):
        places.append(Path(env('NVM_SYMLINK')) / 'node.exe')
    if env('NVM_HOME') and Path(env('NVM_HOME')).is_dir():  # nvm-windows: 가장 높은 버전 (v22가 v9보다 앞, 숫자로 비교)
        places += sorted(Path(env('NVM_HOME')).glob('v*/node.exe'), key=lambda p: _version_key(p.parent.name), reverse=True)
    places += [Path('/usr/local/bin/node'), Path('/usr/bin/node')]
    return places


def find_node() -> tuple[str | None, str, list[str]]:
    """(node 경로, 찾은 방법, 찾아본 곳). 순서: CI_LOCAL_NODE → PATH → 기본 설치 위치."""
    tried: list[str] = []
    forced = os.environ.get('CI_LOCAL_NODE')
    if forced:
        tried.append(f'CI_LOCAL_NODE={forced}')
        if Path(forced).is_file():
            return forced, 'CI_LOCAL_NODE', tried
    on_path = shutil.which('node')
    tried.append('PATH')
    if on_path:
        return on_path, 'PATH', tried
    for p in node_candidates():
        if not p.is_absolute():  # 환경 변수가 비어 생긴 상대 경로는 건너뜀
            continue
        tried.append(str(p))
        if p.is_file():
            return str(p), '기본 설치 위치', tried
    return None, '', tried


def steps(concurrency: int, node: str = 'node') -> list[tuple[str, list[str]]]:
    py = [sys.executable, '-X', 'utf8']
    return [
        ('회귀 시험 (node)', [node, '--test', f'--test-concurrency={concurrency}', '--test-reporter=dot', NODE_TEST_GLOB]),
        ('어휘·교재 등록기 시험 (파이썬)', py + ['-m', 'unittest', *PY_UNITTESTS]),
        ('scripts 허용 목록', py + ['scripts/check_scripts_allowlist.py', '--all']),
    ]


def run_step(name: str, cmd: list[str], verbose: bool) -> tuple[bool, float, str]:
    start = time.monotonic()
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    proc = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=not verbose, text=True, encoding='utf-8', errors='replace')
    out = '' if verbose else (proc.stdout or '') + (proc.stderr or '')
    return proc.returncode == 0, time.monotonic() - start, out


def failure_tail(out: str, limit: int = 40) -> str:
    """실패 출력에서 볼 만한 줄만 남긴다 (node는 ✖·not ok 근처, 파이썬은 FAIL/ERROR/AssertionError 근처)."""
    lines = out.splitlines()
    keys = ('✖', 'not ok', 'FAIL:', 'ERROR:', 'Error', 'error', '❌', '🔴')
    hits = [i for i, line in enumerate(lines) if any(k in line for k in keys)]
    if not hits:
        return '\n'.join(lines[-limit:])
    picked: list[str] = []
    for i in hits:
        for line in lines[max(0, i - 1): i + 4]:
            if not picked or picked[-1] != line:
                picked.append(line)
        if len(picked) >= limit:
            break
    return '\n'.join(picked[:limit])


def main() -> int:
    ap = argparse.ArgumentParser(description='공부방 로컬 CI (regression.yml과 같은 검사)')
    ap.add_argument('--concurrency', type=int, default=int(os.environ.get('CI_LOCAL_CONCURRENCY', '4')),
                    help='node 시험 동시 실행 수 (기본 4, 이 PC 약 13초. 메모리가 모자라면 1, 약 42초)')
    ap.add_argument('-v', '--verbose', action='store_true', help='각 단계 출력을 그대로 보여 준다')
    args = ap.parse_args()

    print(f'🔍 공부방 로컬 CI ({ROOT.name})')
    node, how, tried = find_node()
    if not node:
        print('❌ node를 찾지 못했습니다 — 회귀 시험을 돌릴 수 없어 멈춥니다.')
        print(f"   찾아본 곳: {' · '.join(tried)}")
        print('   해결: ① 이 실행 환경(안티그래비티 앱 터미널 등)의 PATH에 node 폴더를 넣거나')
        print(r'         ② 환경 변수 CI_LOCAL_NODE에 node.exe 전체 경로를 준다 (예: C:\Program Files\nodejs\node.exe)')
        return NODE_MISSING
    if os.environ.get('CI_LOCAL_NODE') and how != 'CI_LOCAL_NODE':
        print(f"⚠️ CI_LOCAL_NODE({os.environ['CI_LOCAL_NODE']})가 node 파일이 아니라 무시하고 다른 곳에서 찾았습니다.")
    if how != 'PATH':
        print(f'ℹ️ PATH에 node가 없어 {how}에서 찾음: {node} (시험 안에서 부르는 node도 이걸 쓰도록 PATH 앞에 붙임)')
        os.environ['PATH'] = str(Path(node).parent) + os.pathsep + os.environ.get('PATH', '')
    failed: list[str] = []
    total = time.monotonic()
    for name, cmd in steps(max(1, args.concurrency), node):
        ok, sec, out = run_step(name, cmd, args.verbose)
        print(f"{'✅' if ok else '❌'} {name} ({sec:.0f}초)")
        if not ok:
            failed.append(name)
            if out:
                print(failure_tail(out))
    took = time.monotonic() - total
    if failed:
        print(f"❌ 실패 {len(failed)}단계: {', '.join(failed)} ({took:.0f}초). 고친 뒤 다시 푸시하세요.")
        print('   자세히: python -X utf8 scripts/ci_local.py -v')
        return 1
    print(f'✅ 모두 통과 ({took:.0f}초) — 원격 시험과 같은 단계')
    return 0


if __name__ == '__main__':
    sys.exit(main())
