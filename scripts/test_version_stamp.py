"""등록 도구용 버전 표시 다시 찍기(scripts/version_stamp.py) 시험 — 임시 저장소에서 실제 node 도구를 부른다.

실행: python -X utf8 -m unittest scripts/test_version_stamp.py (공부방 루트에서)
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import version_stamp as vs  # noqa: E402


def content_stamp(text: str) -> str:
    """stamp_versions.mjs contentStamp와 같은 계산 (BOM·CRLF 차이 무시, sha1 앞 8자리)."""
    body = text.lstrip(chr(0xFEFF)).replace(chr(13) + chr(10), chr(10))
    return hashlib.sha1(body.encode('utf-8')).hexdigest()[:8]


def clean_env() -> dict:
    """GIT_DIR 등을 이어받으면 임시 저장소 대신 본 저장소를 건드린다 → 지운다."""
    env = {k: v for k, v in os.environ.items() if not k.upper().startswith('GIT_')}
    env.update({'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@example.com',
                'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@example.com'})
    return env


@unittest.skipUnless(vs.find_node()[0], 'node가 없어 건너뜀')
class RestampRefsTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.env = clean_env()
        (self.root / 'scripts').mkdir()
        shutil.copy2(SCRIPTS / 'stamp_versions.mjs', self.root / 'scripts' / 'stamp_versions.mjs')
        self.write('kids/data/gallery-data.js', 'const GALLERY = [1];\n')
        self.write('kids/js/other.js', 'const OTHER = 1;\n')
        self.write('kids/common_space/gallery.html',
                   '<script src="../data/gallery-data.js?v=20261101-0000"></script>\n'
                   '<script src="../js/other.js?v=old"></script>\n')
        self.write('parent_dashboard.html', '<script src="kids/data/gallery-data.js?v=abc"></script>\n')
        self.git('init', '-q', '-b', 'main')
        self.git('add', '-A')
        self.git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'init')
        self.write('kids/data/gallery-data.js', 'const GALLERY = [1, 2];\n')  # 등록 도구가 데이터를 바꿈

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def write(self, rel, text):
        (self.root / rel).parent.mkdir(parents=True, exist_ok=True)
        (self.root / rel).write_text(text, encoding='utf-8', newline='')

    def read(self, rel):
        with open(self.root / rel, encoding='utf-8', newline='') as f:  # 줄바꿈을 바꾸지 않고 읽기
            return f.read()

    def git(self, *args):
        subprocess.run(['git', '-C', str(self.root), *args], env=self.env, check=True, capture_output=True)

    def run_restamp(self, foreign=frozenset(), **kw):
        with mock.patch.dict(os.environ, self.env, clear=True):
            return vs.restamp_refs(self.root, ['kids/data/gallery-data.js'], foreign=set(foreign), **kw)

    def test_only_refs_to_data_are_restamped_and_returned(self):
        res = self.run_restamp()
        self.assertEqual(sorted(res.files), ['kids/common_space/gallery.html', 'parent_dashboard.html'])
        self.assertTrue(res.safe_to_push)
        want = content_stamp('const GALLERY = [1, 2];\n')
        self.assertIn(f'gallery-data.js?v={want}', self.read('kids/common_space/gallery.html'))
        self.assertIn(f'gallery-data.js?v={want}', self.read('parent_dashboard.html'))
        self.assertIn('other.js?v=old', self.read('kids/common_space/gallery.html'))  # 상관없는 낡은 자리는 그대로
        self.assertEqual(self.run_restamp().files, [])  # 두 번째는 고칠 것 없음

    def test_foreign_file_is_fixed_but_not_committed_and_push_stops(self):
        res = self.run_restamp(foreign={'parent_dashboard.html'})
        self.assertEqual(res.files, ['kids/common_space/gallery.html'])
        self.assertEqual(res.skipped, ['parent_dashboard.html'])
        self.assertFalse(res.safe_to_push)  # 디스크만 맞고 커밋은 낡으면 푸시 전 검사가 못 잡는다
        self.assertIn(content_stamp('const GALLERY = [1, 2];\n'), self.read('parent_dashboard.html'))

    def test_foreign_none_uses_current_git_state(self):
        self.write('parent_dashboard.html', self.read('parent_dashboard.html') + '<!-- 다른 작업 -->\n')
        with mock.patch.dict(os.environ, self.env, clear=True):
            res = vs.restamp_refs(self.root, ['kids/data/gallery-data.js'])
        self.assertEqual(res.skipped, ['parent_dashboard.html'])

    def test_dirty_files_reads_untracked_and_korean_paths(self):
        self.write('kids/새 폴더/메모 1.txt', 'x')
        with mock.patch.dict(os.environ, self.env, clear=True):
            dirty = vs.dirty_files(self.root)
        self.assertIn('kids/새 폴더/메모 1.txt', dirty)
        self.assertIn('kids/data/gallery-data.js', dirty)

    def test_dry_run_writes_nothing(self):
        before = self.read('kids/common_space/gallery.html')
        res = self.run_restamp(dry_run=True)
        self.assertEqual(sorted(res.files), ['kids/common_space/gallery.html', 'parent_dashboard.html'])
        self.assertEqual(self.read('kids/common_space/gallery.html'), before)

    def test_crlf_is_kept(self):
        self.write('kids/common_space/gallery.html', '<script src="../data/gallery-data.js?v=1"></script>\r\n<p>x</p>\r\n')
        self.run_restamp()
        self.assertEqual(self.read('kids/common_space/gallery.html').count('\r\n'), 2)


class PorcelainTest(unittest.TestCase):
    def test_rename_copy_and_spaces(self):
        out = ' M a b.js\0R  new.html\0old.html\0?? 한글/파일.txt\0C  c2.js\0c1.js\0'
        self.assertEqual(vs.parse_porcelain_z(out), {'a b.js', 'new.html', 'old.html', '한글/파일.txt', 'c2.js', 'c1.js'})


class NoNodeTest(unittest.TestCase):
    def test_missing_node_warns_and_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, 'd.js').write_text('x', encoding='utf-8')
            with mock.patch.object(vs, 'find_node', return_value=(None, '', ['PATH'])):
                res = vs.restamp_refs(tmp, ['d.js'])
            self.assertFalse(res.ok)
            self.assertFalse(res.safe_to_push)

    def test_missing_data_file_is_skipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            res = vs.restamp_refs(tmp, ['kids/data/none.js'])
            self.assertEqual((res.files, res.ok), ([], True))


if __name__ == '__main__':
    unittest.main()
