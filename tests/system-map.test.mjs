// 시스템 조감도 데이터 계약 시험: 공부방 저장소만 내려받는 GitHub Actions에서도 돌도록 공부방 파일만 확인한다.
// 비공개 저장소 파일까지 보는 전체 검사는 master-tower의 verify_contracts.py → build_system_map.py --check가 맡는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dataUrl = name => new URL(`../scripts/data/${name}`, import.meta.url);
const repoFile = rel => new URL(`../${rel}`, import.meta.url);
const COLUMNS = ['source', 'skill', 'module', 'pipe', 'db'];

function loadMap() {
    const context = { window: {} };
    vm.createContext(context);
    for (const name of ['system_map_troubles.js', 'system_map_nodes_life.js', 'system_map_generated.js', 'system_map_data.js']) {
        vm.runInContext(fs.readFileSync(dataUrl(name), 'utf8'), context, { filename: name });
    }
    return context.window.SYSTEM_MAP_DATA;
}

test('화면이 데이터 파일을 합치는 순서대로 싣는다', () => {
    const html = fs.readFileSync(repoFile('minmin_system_map.html'), 'utf8');
    const positions = ['system_map_troubles.js', 'system_map_nodes_life.js', 'system_map_generated.js', 'system_map_data.js']
        .map(name => html.indexOf(`scripts/data/${name}`));
    assert.ok(positions.every(p => p >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test('카드 id·탭·따옴표 계약을 지킨다', () => {
    const data = loadMap();
    const ids = data.nodes.map(n => n.id);
    assert.equal(new Set(ids).size, ids.length);
    const domains = new Set(data.domains.map(d => d.key));
    for (const node of data.nodes) {
        assert.ok(COLUMNS.includes(node.col), node.id);
        assert.ok(node.domain.every(key => domains.has(key)), node.id);
        assert.ok(node.guardrails.length >= 1 && node.guardrails.length <= 3, node.id);
        assert.ok(![node.summary, node.agentPrompt, ...node.guardrails].some(s => s.includes('"')), node.id);
    }
});

test('연결선은 왼쪽 열에서 오른쪽 열로만 잇는다', () => {
    const data = loadMap();
    const colOf = new Map(data.nodes.map(n => [n.id, COLUMNS.indexOf(n.col)]));
    assert.ok(data.manualEdgeCount > 0 && data.manualEdgeCount <= data.edges.length);
    for (const [from, to] of data.edges) {
        assert.ok(colOf.has(from) && colOf.has(to), `${from} → ${to}`);
        assert.ok(colOf.get(from) < colOf.get(to), `${from} → ${to}`);
    }
});

test('공부방 카드와 서랍이 가리키는 파일이 저장소에 있다', () => {
    const data = loadMap();
    const prefix = 'kids-school-main/';
    const paths = [
        ...data.nodes.map(n => n.path),
        ...COLUMNS.flatMap(col => data.tray[col].map(item => item.path))
    ].filter(p => p.startsWith(prefix));
    assert.ok(paths.length > 30);
    for (const path of paths) {
        assert.ok(fs.existsSync(repoFile(path.slice(prefix.length))), path);
    }
});

test('공개 생성 파일은 비공개 저장소 파일 이름을 싣지 않고 개수만 쓴다', () => {
    const data = loadMap();
    for (const col of COLUMNS) {
        assert.equal(typeof data.hidden[col], 'number');
        for (const item of data.tray[col]) {
            assert.match(item.path, /^(kids-school-main\/|daycare-helper\/|notion:)/, item.path);
        }
    }
    const generated = fs.readFileSync(dataUrl('system_map_generated.js'), 'utf8');
    assert.doesNotMatch(generated, /[A-Z]:[\\/]|master-tower\/|family-data|pnc-bot|asset-trading/);
});

test('생성 파일은 시각 없이 정렬되어 다시 만들어도 같다', () => {
    const generated = fs.readFileSync(dataUrl('system_map_generated.js'), 'utf8');
    assert.doesNotMatch(generated, /20\d\d-\d\d-\d\d/);
    const data = loadMap();
    const auto = Array.from(data.edges.slice(data.manualEdgeCount), e => e.join('>'));
    assert.deepEqual(auto, [...auto].sort());
    for (const col of COLUMNS) {
        const paths = Array.from(data.tray[col], item => item.path);
        assert.deepEqual(paths, [...paths].sort());
    }
});
