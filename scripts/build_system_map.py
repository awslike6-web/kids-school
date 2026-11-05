"""시스템 조감도 자동 생성·검사 (minmin_system_map.html)

사람이 쓰는 설명·주의사항·증상 카드는 scripts/data/의 손 관리 파일에 두고,
파일 목록과 찾을 수 있는 연결선만 코드·문서에서 만들어 system_map_generated.js에 쓴다.

사용법 (master-tower 안의 kids-school-main에서만 생성한다):
  python -X utf8 scripts/build_system_map.py           # 생성 파일 다시 쓰기
  python -X utf8 scripts/build_system_map.py --check   # 어긋남 검사 (실패 시 종료 코드 1, 파일을 바꾸지 않음)
  python -X utf8 scripts/build_system_map.py --report  # 문서에 없는 파일 이름까지 이 PC 화면에만 출력
  python -X utf8 scripts/build_system_map.py --json    # 건강 점검용 숫자

공개 규칙: kids-school은 공개 저장소다. 비공개 저장소(master-tower 등) 파일은 생성 파일에 이름을 넣지 않고 개수만 쓴다.
같은 입력이면 항상 같은 결과가 나오도록 시각을 넣지 않고 정렬해서 쓴다.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

KIDS = Path(__file__).resolve().parent.parent
TOWER = KIDS.parent
DAYCARE = TOWER / 'daycare-helper'
DATA_DIR = KIDS / 'scripts' / 'data'
OUTPUT = DATA_DIR / 'system_map_generated.js'
HEADER = ('// 자동 생성 파일입니다. 직접 고치지 마세요. python -X utf8 scripts/build_system_map.py가 다시 씁니다.\n'
          '// 비공개 저장소 파일은 이름 없이 개수만 적습니다 (kids-school은 공개 저장소).\n')
PREFIX = 'window.SYSTEM_MAP_GENERATED = '

COLUMN_ORDER = ['source', 'skill', 'module', 'pipe', 'db']
SCRIPT_EXTS = {'.py', '.js', '.cjs', '.mjs'}
TOKEN = re.compile(r'(?<![\w\-.*])[A-Za-z0-9_][\w\-.]*\.(?:py|js|mjs|cjs|md|json|css|html)\b')
FILE_PATH = re.compile(r'^[\w.\-/]+$')
SHORT_ID = re.compile(r'\b([0-9a-f]{4})…([0-9a-f]{4})\b')
FULL_ID = re.compile(r'\bID: ([0-9a-f]{32})\b')
MODULE_SKIP = re.compile(r'(^|/)story_|legacy|backup|_data|data_')
SPLIT_SPEC = re.compile(r'_split\d*_spec\.md$')
# 연결선을 찾을 때 제외하는 카드: 모든 파일을 언급하는 문서·도구라 실제 관계가 아님
EDGE_SKIP_CARDS = {'doc_catalog', 'src_sync_skills'}
LOAD_SNIPPET = r"""
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { window: {} };
vm.createContext(ctx);
for (const name of ['system_map_troubles.js', 'system_map_nodes_life.js', 'system_map_data.js']) {
  vm.runInContext(fs.readFileSync(path.join(process.argv[1], name), 'utf8'), ctx, { filename: name });
}
const d = ctx.window.SYSTEM_MAP_DATA;
process.stdout.write(JSON.stringify({ domains: d.domains, nodes: d.nodes, edges: d.edges, troubles: d.troubles, autoRules: d.autoRules }));
"""


def in_tower() -> bool:
    return (TOWER / 'scripts' / 'repo_health.py').exists()


def load_curated() -> dict:
    """손 관리 데이터를 실제 JS로 읽는다 (생성 파일 없이 읽으므로 edges는 수동 연결선만 나온다)."""
    res = subprocess.run(['node', '-e', LOAD_SNIPPET, str(DATA_DIR)], capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        raise RuntimeError(f'조감도 데이터를 읽지 못했습니다: {res.stderr.strip()[:400]}')
    return json.loads(res.stdout)


def git_files(repo: Path) -> list[str]:
    res = subprocess.run(['git', '-C', str(repo), 'ls-files', '--cached', '--others', '--exclude-standard'],
                         capture_output=True, text=True, encoding='utf-8', errors='replace')
    return sorted(f.strip('"') for f in res.stdout.splitlines() if f and (repo / f.strip('"')).is_file())


def new_files(repo: Path) -> set[str]:
    """이번 작업에서 새로 생긴 파일 (미추적 + 추가로 올린 것)"""
    out = set()
    for args in (['ls-files', '--others', '--exclude-standard'], ['diff', '--name-only', '--diff-filter=A', 'HEAD']):
        res = subprocess.run(['git', '-C', str(repo), *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
        out.update(f.strip('"') for f in res.stdout.splitlines() if f)
    return out


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding='utf-8', errors='replace')
    except OSError:
        return ''


class Sources:
    """저장소별 파일 목록과 문서 언급 색인"""

    def __init__(self):
        self.repos = {'kids-school-main': KIDS, 'daycare-helper': DAYCARE, 'master-tower': TOWER}
        self.files = {name: git_files(path) for name, path in self.repos.items() if (path / '.git').exists()}
        self.by_name: dict[str, list[tuple[str, str]]] = {}
        for repo, files in self.files.items():
            for f in files:
                self.by_name.setdefault(Path(f).name, []).append((repo, f))
        self.mentions: dict[str, set[tuple[str, str]]] = {}
        for repo, rel in self._doc_paths():
            text = read_text(self.repos[repo] / rel)
            for token in set(TOKEN.findall(text)):
                self.mentions.setdefault(token, set()).add((repo, Path(rel).name))

    def _doc_paths(self):
        for repo, files in self.files.items():
            for f in files:
                is_doc = f.startswith('docs/') and f.endswith('.md') and '/' not in f[5:]
                if is_doc and not SPLIT_SPEC.search(f) and 'walkthrough' not in f:
                    yield repo, f
        for repo, rel in (('kids-school-main', 'kids/core/CORE_CATALOG.md'), ('kids-school-main', 'AGENTS.md'),
                          ('kids-school-main', 'GEMINI.md'), ('master-tower', 'AGENTS.md'), ('master-tower', 'GEMINI.md'),
                          ('daycare-helper', 'docs/CORE_CATALOG.md')):
            if repo in self.files and rel in self.files[repo]:
                yield repo, rel

    def split_card_path(self, path: str) -> tuple[str, str]:
        for repo in ('kids-school-main', 'daycare-helper'):
            if path.startswith(repo + '/'):
                return repo, path[len(repo) + 1:]
        return 'master-tower', path

    def card_files(self, node: dict) -> list[Path]:
        """카드의 실제 파일: path + 제목에 적힌 파일명 (같은 저장소 우선)"""
        found: list[Path] = []
        repo, rel = self.split_card_path(node['path'])
        if is_file_path(node['path']) and (self.repos[repo] / rel).is_file():
            found.append(self.repos[repo] / rel)
        for token in TOKEN.findall(node['title']):
            hits = [h for h in self.by_name.get(token, []) if 'legacy' not in h[1]]
            hits.sort(key=lambda h: (h[0] != repo, h[1]))
            if hits:
                found.append(self.repos[hits[0][0]] / hits[0][1])
        return list(dict.fromkeys(found))


def is_file_path(path: str) -> bool:
    return bool(FILE_PATH.match(path)) and not path.startswith('github.com') and '.workers.dev' not in path


def domains_for(path: str, rules: list) -> list[str]:
    low = path.lower()
    return sorted({key for pattern, key in rules if re.search(pattern, low)})


def share_domain(a: dict, b: dict) -> bool:
    return bool(set(a['domain']) & set(b['domain']))


def code_mark_hit(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text) for p in patterns)


def db_key_hit(text: str, keys: list[str]) -> bool:
    return any(re.search(rf'(?<![A-Z_]){re.escape(k)}(?![A-Z_])', text) for k in keys)


def build_edges(curated: dict, src: Sources) -> list[list[str]]:
    nodes = [n for n in curated['nodes'] if n['id'] not in EDGE_SKIP_CARDS]
    rules = curated['autoRules']
    text_of = {n['id']: '\n'.join(read_text(p) for p in src.card_files(n)) for n in nodes}
    tokens_of = {n['id']: {p.name for p in src.card_files(n)} for n in nodes}
    by_col = {c: [n for n in nodes if n['col'] == c] for c in COLUMN_ORDER}
    known = {tuple(e) for e in curated['edges']} | {tuple(e) for e in rules['edgeIgnore']}
    found = set()

    def add(a: str, b: str):
        if (a, b) not in known:
            found.add((a, b))

    for doc in by_col['skill']:
        doc_tokens = set(TOKEN.findall(text_of[doc['id']]))
        for script in by_col['source']:
            if share_domain(doc, script) and tokens_of[script['id']] & doc_tokens:
                add(script['id'], doc['id'])
        for module in by_col['module']:
            if share_domain(doc, module) and tokens_of[module['id']] & doc_tokens:
                add(doc['id'], module['id'])
    for module in by_col['module']:
        for pipe in by_col['pipe']:
            marks = rules['pipeMarks'].get(pipe['id'])
            if marks and share_domain(module, pipe) and code_mark_hit(text_of[module['id']], marks):
                add(module['id'], pipe['id'])
    for script in by_col['source']:
        for db in by_col['db']:
            keys = rules['dbKeys'].get(db['id'])
            if keys and share_domain(script, db) and db_key_hit(text_of[script['id']], keys):
                add(script['id'], db['id'])
    return [list(e) for e in sorted(found)]


def inventory(src: Sources) -> list[tuple[str, str, str]]:
    """지도에 오를 수 있는 파일 전체: (열, 저장소, 저장소 안 경로)"""
    items = []
    for repo, files in src.files.items():
        for f in files:
            p = Path(f)
            parts = p.parts
            if len(parts) == 2 and parts[0] == 'scripts' and p.suffix in SCRIPT_EXTS:
                items.append(('source', repo, f))
            elif len(parts) == 2 and parts[0] == 'docs' and f.endswith('_spec.md') and not SPLIT_SPEC.search(f):
                items.append(('skill', repo, f))
            elif p.suffix == '.js' and not MODULE_SKIP.search(f):
                in_kids = repo == 'kids-school-main' and f.startswith('kids/') and not f.startswith(('kids/data/', 'kids/assets/'))
                in_daycare = repo == 'daycare-helper' and f.startswith('public/js/')
                if in_kids or in_daycare:
                    items.append(('module', repo, f))
    return items


def card_text(curated: dict) -> str:
    return '\n'.join(f"{n['title']}\n{n['path']}\n{n['summary']}" for n in curated['nodes'])


def schema_rows() -> list[dict]:
    text = read_text(TOWER / 'docs' / 'NOTION_SCHEMA_MAP.md')
    return [{'domain': m[0], 'name': m[1], 'id': m[2]}
            for m in re.findall(r'^\| \*\*(.+?)\*\* \| `(\w+)` \| `([0-9a-f]{32})`', text, re.M)]


def public_docs(src: Sources, name: str) -> list[str]:
    docs = {d for repo, d in src.mentions.get(name, set()) if repo != 'master-tower'}
    docs -= {'AGENTS.md', 'GEMINI.md'}
    return sorted(docs, key=lambda d: (not d.endswith('_spec.md'), d))[:3]


def build(curated: dict, src: Sources) -> dict:
    text = card_text(curated)
    on_cards = set(TOKEN.findall(text))
    rules = curated['autoRules']['domainRules']
    tray = {c: [] for c in COLUMN_ORDER}
    hidden = {c: 0 for c in COLUMN_ORDER}
    for col, repo, rel in inventory(src):
        name = Path(rel).name
        if name in on_cards or name not in src.mentions:
            continue
        if repo == 'master-tower':
            hidden[col] += 1
            continue
        path = f'{repo}/{rel}'
        tray[col].append({'name': name, 'path': path, 'domain': domains_for(path, rules), 'docs': public_docs(src, name)})
    for row in schema_rows():
        short = f"{row['id'][:4]}…{row['id'][-4:]}"
        if row['id'] in text or short in text:
            continue
        if row['domain'] in ('공부방', '보육'):
            tray['db'].append({'name': row['name'], 'path': f"notion:{row['name']}", 'domain': domains_for(row['name'], rules), 'docs': []})
        else:
            hidden['db'] += 1
    for col in tray:
        tray[col].sort(key=lambda t: t['path'])
    return {'edges': build_edges(curated, src), 'tray': tray, 'hidden': hidden}


def render(data: dict) -> str:
    """한 항목 한 줄로 써서 여러 에이전트가 고쳐도 병합 충돌이 적게 한다."""
    dump = lambda v: json.dumps(v, ensure_ascii=False)
    lines = [HEADER + PREFIX + '{', '  "edges": [']
    lines.append(',\n'.join(f'    {dump(e)}' for e in data['edges']))
    lines += ['  ],', '  "tray": {']
    blocks = []
    for col in COLUMN_ORDER:
        rows = ',\n'.join(f'      {dump(t)}' for t in data['tray'][col])
        blocks.append(f'    {dump(col)}: [\n{rows}\n    ]' if rows else f'    {dump(col)}: []')
    lines.append(',\n'.join(blocks))
    lines += ['  },', f'  "hidden": {dump(data["hidden"])}', '};', '']
    return '\n'.join(lines)


def read_output() -> dict | None:
    text = read_text(OUTPUT).replace('\r\n', '\n')
    start = text.find(PREFIX)
    if start < 0:
        return None
    try:
        return json.loads(text[start + len(PREFIX):].rstrip().rstrip(';'))
    except ValueError:
        return None


def tray_paths(data: dict) -> set[str]:
    return {t['path'] for col in data['tray'].values() for t in col}


def check_cards(curated: dict, src: Sources, data: dict, errors: list[str], warnings: list[str]):
    nodes = curated['nodes']
    ids = [n['id'] for n in nodes]
    col_of = {n['id']: n['col'] for n in nodes}
    domains = {d['key'] for d in curated['domains']}
    for dup in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append(f'카드 id 중복: {dup}')
    schema_ids = {r['id'] for r in schema_rows()}
    for n in nodes:
        repo, rel = src.split_card_path(n['path'])
        if is_file_path(n['path']) and not (src.repos[repo] / rel).exists():
            errors.append(f"카드가 가리키는 파일 없음: {n['id']} → {n['path']}")
        for token in TOKEN.findall(n['title']):
            if token not in src.by_name:
                errors.append(f"카드 제목의 파일 없음: {n['id']} → {token}")
        for key in n['domain']:
            if key not in domains:
                errors.append(f"없는 탭 이름: {n['id']} → {key}")
        strings = [n['summary'], n.get('agentPrompt', ''), *n.get('guardrails', [])]
        if any('"' in s for s in strings):
            errors.append(f"큰따옴표 포함 (복사 버튼이 깨짐): {n['id']}")
        if schema_ids:
            for full in FULL_ID.findall(n['path']):
                if full not in schema_ids:
                    errors.append(f"노션 DB ID가 스키마 지도에 없음: {n['id']} → {full}")
            for head, tail in SHORT_ID.findall(n['path']):
                if not any(s.startswith(head) and s.endswith(tail) for s in schema_ids):
                    errors.append(f"노션 DB 축약 ID가 스키마 지도에 없음: {n['id']} → {head}…{tail}")
        for token in TOKEN.findall(' '.join(strings)):
            if token not in src.by_name:
                warnings.append(f"설명 속 파일명을 찾지 못함: {n['id']} → {token}")
    for label, edges in (('수동', curated['edges']), ('자동', data['edges'] if data else [])):
        for a, b in edges:
            if a not in col_of or b not in col_of:
                errors.append(f'{label} 연결선이 끊김: {a} → {b}')
            elif COLUMN_ORDER.index(col_of[a]) >= COLUMN_ORDER.index(col_of[b]):
                errors.append(f'{label} 연결선 방향 오류: {a} → {b}')
    for i, t in enumerate(curated['troubles'], 1):
        for token in TOKEN.findall(' '.join([*t['targetFiles'], t['prompt']])):
            if token not in src.by_name:
                warnings.append(f'증상 카드 {i}번의 파일명을 찾지 못함: {token}')


def check_private_names(data: dict, src: Sources, errors: list[str]):
    """공개 생성 파일에 비공개 저장소에만 있는 파일 이름이 들어가지 않았는지 확인"""
    private_only = {Path(f).name for f in src.files.get('master-tower', [])
                    if {r for r, _ in src.by_name.get(Path(f).name, [])} == {'master-tower'}}
    for col in data['tray'].values():
        for item in col:
            if not item['path'].startswith(('kids-school-main/', 'daycare-helper/', 'notion:')) or item['name'] in private_only:
                errors.append(f"공개 파일에 비공개 저장소 이름이 있음: {item['path']}")


def unregistered(curated: dict, src: Sources) -> list[tuple[str, str]]:
    on_cards = set(TOKEN.findall(card_text(curated)))
    return [(repo, rel) for col, repo, rel in inventory(src)
            if col != 'skill' and Path(rel).name not in on_cards and Path(rel).name not in src.mentions]


def run_check(curated: dict, src: Sources) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    wanted = build(curated, src)
    current = read_output()
    if current is None:
        errors.append('생성 파일이 없거나 읽을 수 없음. python -X utf8 kids-school-main/scripts/build_system_map.py 실행')
    else:
        added = tray_paths(wanted) - tray_paths(current)
        removed = tray_paths(current) - tray_paths(wanted)
        if added or removed or wanted['hidden'] != current['hidden']:
            errors.append(f'지도 파일 목록이 낡음 (추가 {len(added)}, 삭제 {len(removed)}). '
                          'python -X utf8 kids-school-main/scripts/build_system_map.py 실행 후 kids-school 저장소에 함께 커밋')
        elif wanted != current:
            warnings.append('자동 연결선이나 서랍 설명이 달라짐. build_system_map.py 실행 권장')
    check_cards(curated, src, current or wanted, errors, warnings)
    check_private_names(current or wanted, src, errors)
    fresh = {(repo, f) for repo, path in src.repos.items() if repo in src.files for f in new_files(path)}
    for repo, rel in unregistered(curated, src):
        if (repo, rel) in fresh:
            warnings.append(f'새 파일인데 문서에 없음 (명세나 카탈로그에 등록 필요): {repo}/{rel}')
    return errors, warnings


def write_output() -> int:
    """생성 파일을 다시 쓴다. master-tower 밖이면 비공개 목록을 읽을 수 없어 건너뛴다."""
    if not in_tower():
        print('ℹ️ master-tower 밖이라 조감도 생성을 건너뜁니다.')
        return 0
    data = build(load_curated(), Sources())
    text = render(data)
    if read_text(OUTPUT).replace('\r\n', '\n') == text:
        print(f'✅ 조감도 자동 데이터 최신 (연결선 {len(data["edges"])}, 서랍 {len(tray_paths(data))})')
        return 0
    OUTPUT.write_bytes(text.encode('utf-8'))
    print(f'🗺️ 조감도 자동 데이터 갱신: 연결선 {len(data["edges"])}, 서랍 {len(tray_paths(data))} → {OUTPUT.relative_to(KIDS).as_posix()}')
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='시스템 조감도 자동 생성·검사')
    parser.add_argument('--check', action='store_true', help='파일을 바꾸지 않고 어긋남만 검사')
    parser.add_argument('--report', action='store_true', help='문서에 없는 파일 이름까지 이 PC 화면에 출력')
    parser.add_argument('--json', action='store_true', help='건강 점검용 숫자를 JSON으로 출력')
    args = parser.parse_args()
    if not (args.check or args.report or args.json):
        return write_output()
    if not in_tower():
        print('ℹ️ master-tower 밖이라 조감도 검사를 건너뜁니다.')
        return 0
    curated, src = load_curated(), Sources()
    errors, warnings = run_check(curated, src)
    loose = unregistered(curated, src)
    if args.json:
        current = read_output() or {'tray': {}, 'hidden': {}}
        print(json.dumps({'errors': errors, 'warnings': warnings, 'tray': len(tray_paths(current)) if current['tray'] else 0,
                          'hidden': sum(current['hidden'].values()), 'unregistered': len(loose)}, ensure_ascii=False))
        return 1 if errors else 0
    for line in errors:
        print(f'❌ {line}')
    for line in warnings:
        print(f'⚠️ {line}')
    if args.report:
        print(f'\n문서에 없는 파일 {len(loose)}개 (이름은 공개 파일에 쓰지 않습니다):')
        for repo, rel in loose:
            print(f'  {repo}/{rel}')
    if not errors:
        print(f'✅ 조감도 검사 통과 (경고 {len(warnings)}건)')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
