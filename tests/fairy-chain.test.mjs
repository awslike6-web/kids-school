// 요정 스크립트 묶음(FAIRY_CORE_CHAIN) 공식 순서·정적 태그·동적 로더·config.js 선행·loadCoreScripts 계약 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OFFICIAL_CHAIN = [
    'fairy-config.js',
    'fairy-tts.js',
    'fairy-settings-catalog.js',
    'fairy-engine.js'
];
const FAIRY_EXTRAS = ['fairy-settings-engine.js', 'fairy-chatbot.js'];
const FAIRY_ALL = new Set([...OFFICIAL_CHAIN, ...FAIRY_EXTRAS]);
const SKIP_DIRS = new Set(['.claude', 'scratch', 'node_modules', '.git']);

const toRel = full => path.relative(repoRoot, full).replace(/\\/g, '/');
const readRel = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const stripHtmlComments = text => text.replace(/<!--[\s\S]*?-->/g, '');
const stripJsComments = code => code.replace(
    /'(?:\\.|[^'\\\r\n])*'|"(?:\\.|[^"\\\r\n])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
    m => (m.startsWith('//') || m.startsWith('/*') ? '' : m)
);
const stripCodeComments = (text, isHtml) => {
    const noHtml = stripHtmlComments(text);
    return isHtml
        ? noHtml.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => open + stripJsComments(body) + close)
        : stripJsComments(noHtml);
};

// 저장소 맨 위 파일과 kids/ 아래 파일 수집 (제외 폴더 건너뜀)
function collectFiles(exts) {
    const out = [];
    const matchExt = name => exts.some(ext => name.endsWith(ext));
    for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
        if (entry.isFile() && matchExt(entry.name)) out.push(path.join(repoRoot, entry.name));
    }
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (SKIP_DIRS.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && matchExt(entry.name)) out.push(full);
        }
    };
    const kidsDir = path.join(repoRoot, 'kids');
    if (fs.existsSync(kidsDir)) walk(kidsDir);
    return out.sort();
}

const scriptTagRe = name => new RegExp(
    `<script\\b[^>]*\\bsrc\\s*=\\s*["'](?:[^"']*\\/)?${name.replace('.', '\\.')}(?:\\?[^"']*)?["']`, 'i'
);

test('공식 목록: kids/config.js의 FAIRY_CORE_CHAIN 순서와 8자리 16진수 버전', () => {
    const clean = stripJsComments(readRel('kids/config.js'));
    const match = clean.match(/(?:var|const|let)\s+FAIRY_CORE_CHAIN\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(match, 'kids/config.js에서 FAIRY_CORE_CHAIN 배열을 찾을 수 없음');
    const items = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
    const names = items.map(item => {
        const parsed = item.match(/^([^?]+)\?v=([0-9a-f]{8})$/);
        assert.ok(parsed, `버전 형식 오류(?v=8자리 16진수 필요): ${item}`);
        return parsed[1];
    });
    assert.deepEqual(names, OFFICIAL_CHAIN, 'FAIRY_CORE_CHAIN 원소 순서 불일치');
});

test('HTML 태그 규칙: 요정 스크립트 순서·필수 선행·중복 금지', () => {
    const expected = OFFICIAL_CHAIN.join(' → ');
    const failures = [];
    for (const file of collectFiles(['.html'])) {
        const html = stripHtmlComments(fs.readFileSync(file, 'utf8'));
        const found = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
            .map(m => m[1].split(/[?#]/)[0].split('/').pop())
            .filter(name => FAIRY_ALL.has(name));
        if (!found.length) continue;
        const rel = toRel(file);
        const actual = found.join(' → ');
        const fail = rule => failures.push(`${rel}: ${rule} — 기대 <${expected}> / 실제 <${actual}>`);

        if (new Set(found).size !== found.length) fail('ⓔ 같은 요정 파일 태그 중복');
        let lastIdx = -1;
        for (const name of found.filter(n => OFFICIAL_CHAIN.includes(n))) {
            const idx = OFFICIAL_CHAIN.indexOf(name);
            if (idx < lastIdx) { fail('ⓐ 공식 순서 역전'); break; }
            lastIdx = idx;
        }
        if (found.includes('fairy-engine.js') && !OFFICIAL_CHAIN.every(n => found.includes(n))) {
            fail('ⓑ fairy-engine.js 존재 시 공식 4개 전부 필요');
        }
        const seIdx = found.indexOf('fairy-settings-engine.js');
        const catIdx = found.indexOf('fairy-settings-catalog.js');
        if (seIdx !== -1 && (catIdx === -1 || catIdx > seIdx)) {
            fail('ⓒ fairy-settings-engine.js 앞에 fairy-settings-catalog.js 필요');
        }
        const cbIdx = found.indexOf('fairy-chatbot.js');
        const cfgIdx = found.indexOf('fairy-config.js');
        const engIdx = found.indexOf('fairy-engine.js');
        if (cbIdx !== -1 && (cfgIdx === -1 || cfgIdx > cbIdx || engIdx === -1 || engIdx > cbIdx)) {
            fail('ⓓ fairy-chatbot.js 앞에 fairy-config.js와 fairy-engine.js 필요');
        }
    }
    assert.deepEqual(failures, [], failures.join('\n'));
});

test('동적 로더 호출 파일: 공식 4개 직접 나열 금지 및 ...FAIRY_CORE_CHAIN 선행', () => {
    // 경로가 붙은 이름('../core/fairy-tts.js')도 직접 나열로 본다 (카본 검토 2026-11-27)
    const directRe = /['"](?:[^'"\s]*\/)?(fairy-config|fairy-tts|fairy-settings-catalog|fairy-engine)\.js(\?v=[^'"]*)?['"]/g;
    // core.js 한 곳만 허용하는 갈음: 옛 config.js 캐시와 만나도 멈추지 않게 (이름·순서는 공식 목록과 같아야 함)
    const fallbackRe = /typeof\s+FAIRY_CORE_CHAIN\s*!==\s*['"]undefined['"]\s*\?\s*FAIRY_CORE_CHAIN\s*:\s*\[([^\]]*)\]/g;
    const callers = [];
    const failures = [];
    for (const file of collectFiles(['.js', '.html'])) {
        const rel = toRel(file);
        if (rel === 'kids/config.js') continue;
        let clean = stripCodeComments(fs.readFileSync(file, 'utf8'), file.endsWith('.html'));
        if (!clean.includes('loadCoreScripts(') || /function\s+loadCoreScripts\b/.test(clean)) continue;
        callers.push(rel);
        // HTML은 src로 싣는 태그(태그 규칙 시험 몫)를 빼고 인라인 스크립트만 본다
        if (file.endsWith('.html')) clean = clean.replace(/<script\b[^>]*\bsrc=[^>]*>\s*<\/script>/gi, '');
        clean = clean.replace(fallbackRe, (whole, body) => {
            const names = [...body.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
            if (rel !== 'kids/core/core.js') failures.push(`${rel}: 갈음 목록은 kids/core/core.js에만 둔다`);
            if (JSON.stringify(names) !== JSON.stringify(OFFICIAL_CHAIN)) failures.push(`${rel}: 갈음 목록이 공식 순서와 다름 (${names.join(', ')})`);
            return 'FAIRY_CORE_CHAIN';
        });

        const direct = [...clean.matchAll(directRe)].map(m => m[0]);
        if (direct.length) failures.push(`${rel}: 공식 파일 직접 나열 금지 (${direct.join(', ')})`);

        const spreadIdx = clean.search(/\.\.\.\(?\s*FAIRY_CORE_CHAIN/); // core.js는 갈음을 둔 ...(FAIRY_CORE_CHAIN) 모양
        for (const extra of FAIRY_EXTRAS) {
            const extraIdx = clean.indexOf(extra);
            if (extraIdx === -1) continue;
            if (spreadIdx === -1) failures.push(`${rel}: ${extra}가 있으나 ...FAIRY_CORE_CHAIN 없음`);
            else if (spreadIdx > extraIdx) failures.push(`${rel}: ...FAIRY_CORE_CHAIN이 ${extra}보다 뒤에 있음`);
        }
    }
    const mustHave = [
        'kids/core/core.js',
        'kids/js/lobby_controller.js',
        'kids/common_space/my-room-main.js',
        'kids/subjects/math/gugudan.html'
    ];
    for (const req of mustHave) {
        assert.ok(callers.includes(req), `자동 수집 목록에 필수 파일 누락: ${req}`);
    }
    assert.deepEqual(failures, [], failures.join('\n'));
});

test('config.js 먼저: core.js·로비·마이룸·구구단 화면은 대상보다 앞에 로드', () => {
    const configRe = scriptTagRe('config.js');
    const coreRe = scriptTagRe('core.js');
    const failures = [];
    const checkBefore = (rel, html, targetMatch, label) => {
        const cfgMatch = html.match(configRe);
        if (!cfgMatch) { failures.push(`${rel}: config.js 태그 없음`); return; }
        if (!targetMatch) { failures.push(`${rel}: 대상(${label}) 없음`); return; }
        if (html.indexOf(cfgMatch[0]) >= html.indexOf(targetMatch[0])) {
            failures.push(`${rel}: config.js가 ${label}보다 뒤에 있음`);
        }
    };

    // (가) core.js를 <script src>로 싣는 모든 HTML
    let coreHtmlCount = 0;
    for (const file of collectFiles(['.html'])) {
        const html = stripHtmlComments(fs.readFileSync(file, 'utf8'));
        const coreMatch = html.match(coreRe);
        if (!coreMatch) continue;
        coreHtmlCount++;
        checkBefore(toRel(file), html, coreMatch, 'core.js');
    }
    assert.ok(coreHtmlCount > 0, 'core.js를 싣는 HTML을 찾지 못함');

    // (나) lobby.html · (다) my-room.html
    for (const [rel, target] of [
        ['lobby.html', 'lobby_controller.js'],
        ['kids/common_space/my-room.html', 'my-room-main.js']
    ]) {
        const html = stripHtmlComments(readRel(rel));
        checkBefore(rel, html, html.match(scriptTagRe(target)), target);
    }

    // (라) gugudan.html — 첫 인라인 <script> 중 loadCoreScripts(가 든 것
    const guguHtml = stripHtmlComments(readRel('kids/subjects/math/gugudan.html'));
    const guguTarget = [...guguHtml.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)]
        .find(m => stripJsComments(m[1]).includes('loadCoreScripts('));
    checkBefore('kids/subjects/math/gugudan.html', guguHtml, guguTarget, 'loadCoreScripts 인라인 script');
    assert.deepEqual(failures, [], failures.join('\n'));
});

test('loadCoreScripts 계약: 버전 유지·중복 건너뛰기·순서·완료 콜백', () => {
    const configSrc = readRel('kids/config.js');
    const createSandbox = (existingScripts = []) => {
        const appended = [];
        const store = new Map();
        const sandbox = {
            console: { log() {}, warn() {}, error() {} },
            URL, URLSearchParams, Date,
            location: {
                href: 'https://school.test/kids/subjects/math/x.html',
                pathname: '/kids/subjects/math/x.html',
                search: '', origin: 'https://school.test', hostname: 'school.test', protocol: 'https:'
            },
            document: {
                scripts: existingScripts.map(src => ({ src })),
                createElement: () => ({}),
                head: { appendChild: el => { appended.push(el); return el; } },
                addEventListener() {}, querySelector: () => null, getElementsByTagName: () => []
            },
            localStorage: {
                getItem: k => (store.has(k) ? store.get(k) : null),
                setItem: (k, v) => store.set(k, String(v)),
                removeItem: k => store.delete(k)
            },
            addEventListener() {}
        };
        sandbox.window = sandbox;
        vm.createContext(sandbox);
        vm.runInContext(configSrc, sandbox, { filename: path.join(repoRoot, 'kids/config.js') });
        return { sandbox, appended };
    };

    // 1) 버전 유지·미지정 시 시각 버전·순서·async=false·onload 완료 콜백 1번
    const s1 = createSandbox();
    assert.equal(s1.sandbox.APP_CONFIG.useRemoteCore, false, 'useRemoteCore는 false여야 함');
    let done1 = 0;
    s1.sandbox.loadCoreScripts('../../core/', ['fairy-tts.js?v=abc12345', 'fairy-engine.js'], () => { done1++; });
    assert.equal(s1.appended.length, 2);
    assert.equal(s1.appended[0].src, '../../core/fairy-tts.js?v=abc12345');
    assert.doesNotMatch(s1.appended[0].src, /20260828_/);
    assert.match(s1.appended[1].src, /^\.\.\/\.\.\/core\/fairy-engine\.js\?v=20260828_\d+$/);
    assert.ok(s1.appended.every(el => el.async === false));
    assert.equal(done1, 0);
    s1.appended[0].onload();
    assert.equal(done1, 0);
    s1.appended[1].onload();
    assert.equal(done1, 1);

    // 2) 쿼리가 달라도 이미 실린 파일은 건너뜀
    const s2 = createSandbox(['https://school.test/kids/core/fairy-tts.js?v=old']);
    let done2 = 0;
    s2.sandbox.loadCoreScripts('../../core/', ['fairy-tts.js?v=new', 'fairy-engine.js?v=11223344'], () => { done2++; });
    assert.equal(s2.appended.length, 1);
    assert.equal(s2.appended[0].src, '../../core/fairy-engine.js?v=11223344');
    assert.equal(done2, 0);
    s2.appended[0].onload();
    assert.equal(done2, 1);

    // 3) 목록이 모두 이미 실려 있으면 즉시 완료 콜백 1번
    const s3 = createSandbox([
        'https://school.test/kids/core/fairy-config.js?v=old',
        'https://school.test/kids/core/fairy-tts.js?v=old'
    ]);
    let done3 = 0;
    s3.sandbox.loadCoreScripts('../../core/', ['fairy-config.js?v=new', 'fairy-tts.js?v=new'], () => { done3++; });
    assert.equal(s3.appended.length, 0);
    assert.equal(done3, 1);
});
