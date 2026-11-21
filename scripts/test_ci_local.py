"""scripts/ci_local.py 시험: 로컬 CI 단계가 원격 시험(regression.yml)과 같은 목록인지 본다.

둘이 어긋나면 「로컬은 통과, 원격은 빨간불」이 다시 생긴다 (2026-11-17~20 19연속 실패의 원인).
실행: python -X utf8 -m unittest scripts/test_ci_local.py
"""
import importlib.util
import io
import os
import re
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = (ROOT / '.github' / 'workflows' / 'regression.yml').read_text(encoding='utf-8')

spec = importlib.util.spec_from_file_location('ci_local', ROOT / 'scripts' / 'ci_local.py')
ci_local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci_local)


def workflow_runs() -> list[str]:
    """run: 한 줄짜리 명령과 run: | 블록 본문을 모두 모은다 (주석 줄 제외)."""
    runs, block, indent = [], None, 0
    for line in WORKFLOW.splitlines():
        if block is not None:
            if line.strip() and (len(line) - len(line.lstrip())) <= indent:
                runs.append('\n'.join(block))
                block = None
            else:
                block.append(line.strip())
                continue
        m = re.match(r'^(\s*)run:\s*(.*)$', line)
        if not m:
            continue
        if m.group(2).strip() in ('|', '>'):
            block, indent = [], len(m.group(1))
        else:
            runs.append(m.group(2).strip())
    if block:
        runs.append('\n'.join(block))
    return runs


class WorkflowParityTest(unittest.TestCase):
    def test_python_unittests_match(self):
        unittest_runs = [r for r in workflow_runs() if '-m unittest' in r]
        self.assertEqual(len(unittest_runs), 1, '원격 시험의 파이썬 unittest 단계는 하나여야 대조할 수 있다')
        remote = re.findall(r'scripts/test_[\w]+\.py', unittest_runs[0])
        self.assertEqual(remote, ci_local.PY_UNITTESTS,
                         'regression.yml 등록기 시험 목록과 ci_local.PY_UNITTESTS를 같은 순서로 맞추세요')

    def test_node_glob_matches(self):
        node_runs = [r for r in workflow_runs() if 'node --test' in r]
        self.assertTrue(node_runs, '원격 시험에 node 회귀 시험 단계가 없다')
        self.assertIn(f'"{ci_local.NODE_TEST_GLOB}"', node_runs[0])

    def test_allowlist_step_present(self):
        self.assertTrue(any('check_scripts_allowlist.py --all' in r for r in workflow_runs()))
        names = [name for name, _ in ci_local.steps(4)]
        self.assertIn('scripts 허용 목록', names)

    def test_every_remote_check_is_local_or_known_exception(self):
        """원격에 새 검사 단계가 생기면 ci_local에도 넣거나, 여기 예외에 이유와 함께 적어야 한다."""
        local_cmds = ' '.join(' '.join(cmd) for _, cmd in ci_local.steps(4))
        known_remote_only = {
            'pip install': '원격 러너에 Pillow 설치 (이 PC는 이미 있음)',
            'check_commit_msg.py': '커밋할 때 commit-msg 훅이 이미 검사',
        }
        for run in workflow_runs():
            if any(k in run for k in known_remote_only):
                continue
            scripts = re.findall(r'scripts/[\w]+\.py', run)
            for s in scripts:
                if s.startswith('scripts/test_'):
                    continue  # 위 test_python_unittests_match가 본다
                self.assertIn(s, local_cmds, f'원격 단계의 {s}가 ci_local에 없다')
            if 'node --test' in run:
                self.assertIn('node --test', local_cmds)

    def test_concurrency_flag(self):
        node = dict(ci_local.steps(1))['회귀 시험 (node)']
        self.assertIn('--test-concurrency=1', node)


class FindNodeTest(unittest.TestCase):
    """PATH에 node가 없는 실행 환경(안티그래비티 앱 등) 대비: 기본 위치 탐색과 원인 안내."""

    def setUp(self):
        self.saved = {k: os.environ.get(k) for k in ('PATH', 'CI_LOCAL_NODE')}
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        for k, v in self.saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        shutil.rmtree(self.tmp, ignore_errors=True)

    def fake_node(self) -> Path:
        p = self.tmp / 'node.exe'
        p.write_text('', encoding='utf-8')
        return p

    def test_forced_path_wins(self):
        p = self.fake_node()
        os.environ['CI_LOCAL_NODE'] = str(p)
        self.assertEqual(ci_local.find_node()[:2], (str(p), 'CI_LOCAL_NODE'))

    def test_falls_back_to_default_places_without_path(self):
        os.environ.pop('CI_LOCAL_NODE', None)
        os.environ['PATH'] = str(self.tmp / 'empty')
        p = self.fake_node()
        with mock.patch.object(ci_local, 'node_candidates', return_value=[Path('relative/node.exe'), p]):
            node, how, tried = ci_local.find_node()
        self.assertEqual((node, how), (str(p), '기본 설치 위치'))
        self.assertNotIn('relative', ' '.join(tried))

    def test_nvm_versions_sorted_numerically(self):
        for v in ('v9.11.2', 'v22.11.0', 'v18.20.4'):
            (self.tmp / v).mkdir()
            (self.tmp / v / 'node.exe').write_text('', encoding='utf-8')
        with mock.patch.dict(os.environ, {'NVM_HOME': str(self.tmp)}):
            nvm = [p.parent.name for p in ci_local.node_candidates() if p.parent.parent == self.tmp]
        self.assertEqual(nvm, ['v22.11.0', 'v18.20.4', 'v9.11.2'])

    def test_missing_node_explains_and_exits_3(self):
        os.environ.pop('CI_LOCAL_NODE', None)
        os.environ['PATH'] = str(self.tmp / 'empty')
        with mock.patch.object(ci_local, 'node_candidates', return_value=[self.tmp / 'none' / 'node.exe']), \
             mock.patch('sys.argv', ['ci_local.py']), mock.patch('sys.stdout', new_callable=io.StringIO) as out:
            code = ci_local.main()
        self.assertEqual(code, ci_local.NODE_MISSING)
        self.assertIn('node를 찾지 못했습니다', out.getvalue())
        self.assertIn('CI_LOCAL_NODE', out.getvalue())


class FailureTailTest(unittest.TestCase):
    def test_keeps_failure_lines(self):
        out = '\n'.join(['ok 1'] * 50 + ['FAIL: test_x', 'AssertionError: 1 != 2'] + ['ok'] * 5)
        tail = ci_local.failure_tail(out)
        self.assertIn('FAIL: test_x', tail)
        self.assertIn('AssertionError', tail)
        self.assertNotIn('ok 1\nok 1\nok 1\nok 1\nok 1\nok 1', tail)

    def test_falls_back_to_last_lines(self):
        out = '\n'.join(f'line {i}' for i in range(100))
        self.assertTrue(ci_local.failure_tail(out, limit=5).endswith('line 99'))


if __name__ == '__main__':
    unittest.main()
