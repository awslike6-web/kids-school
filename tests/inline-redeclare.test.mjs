// 한 화면이 싣는 클래식 스크립트끼리 최상위 let/const/class 이름이 겹치지 않는지 (2026-11-27)
// 겹치면 뒤 스크립트가 SyntaxError로 통째로 실행되지 않는다. 예: english_voca.html 인라인 스크립트가
// english_common.js의 currentProfile·currentTheme을 다시 let으로 선언해 7월부터 단어를 못 불러왔다.
// 검사: HTML 주석을 지우고 <script>를 싣는 순서대로 읽어(지역 src 파일 + 인라인, module·json은 제외)
//       줄 맨 앞 선언만 최상위로 본다(인라인은 공통 들여쓰기를 뺀 뒤). var·function끼리 겹치는 것은 허용.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.claude', 'scratch', 'uploads']);

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, out);
        else if (e.name.endsWith('.html')) out.push(full);
    }
    return out;
}

function dedent(src) {
    const lines = src.split(/\r?\n/);
    const indents = lines.filter(l => l.trim()).map(l => l.match(/^[ \t]*/)[0].length);
    const cut = indents.length ? Math.min(...indents) : 0;
    return lines.map(l => l.slice(Math.min(cut, l.match(/^[ \t]*/)[0].length))).join('\n');
}

export function topLevelNames(src) {
    const lexical = new Set(), plain = new Set();
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of body.matchAll(/^(let|const|class|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm)) {
        (['let', 'const', 'class'].includes(m[1]) ? lexical : plain).add(m[2]);
    }
    return { lexical, plain };
}

function scriptsOf(file) {
    const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const out = [];
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const attrs = m[1];
        if (/\btype\s*=\s*["']?(module|application\/json|application\/ld\+json|text\/template)/i.test(attrs)) continue;
        const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        if (src) {
            if (/^(https?:)?\/\//i.test(src[1])) continue;
            const target = path.resolve(path.dirname(file), src[1].split(/[?#]/)[0]);
            if (!fs.existsSync(target)) continue;
            out.push({ name: path.relative(root, target).replace(/\\/g, '/'), ...topLevelNames(fs.readFileSync(target, 'utf8')) });
        } else if (m[2].trim()) {
            out.push({ name: '(인라인 스크립트)', ...topLevelNames(dedent(m[2])) });
        }
    }
    return out;
}

test('한 화면의 스크립트끼리 최상위 let/const/class 이름을 다시 선언하지 않는다', () => {
    const files = [...fs.readdirSync(root).filter(f => f.endsWith('.html')).map(f => path.join(root, f)), ...walk(path.join(root, 'kids'))];
    const problems = [];
    for (const file of files) {
        const seen = new Map(); // 이름 → { kind, from }
        for (const s of scriptsOf(file)) {
            for (const name of s.lexical) {
                if (seen.has(name)) problems.push(`${path.relative(root, file)}: ${name} — ${seen.get(name).from} ↔ ${s.name}`);
            }
            for (const name of s.plain) {
                if (seen.get(name)?.kind === 'lexical') problems.push(`${path.relative(root, file)}: ${name} — ${seen.get(name).from}(let/const) ↔ ${s.name}(var/function)`);
            }
            for (const name of s.lexical) seen.set(name, { kind: 'lexical', from: s.name });
            for (const name of s.plain) if (!seen.has(name)) seen.set(name, { kind: 'plain', from: s.name });
        }
    }
    assert.deepEqual(problems, [], `겹치는 최상위 선언(뒤 스크립트가 SyntaxError로 통째로 멈춤):\n${problems.join('\n')}`);
});

test('검사기: 다른 스크립트의 let을 인라인에서 다시 let으로 선언하면 잡는다', () => {
    const a = topLevelNames("let currentProfile = 'son';\nconst isAdmin = false;\nfunction helper() { let inner = 1; }\n");
    const b = topLevelNames(dedent("  let currentProfile = 'x';\n  function go() {\n    let inner = 2;\n  }\n"));
    assert.ok(a.lexical.has('currentProfile') && b.lexical.has('currentProfile'));
    assert.ok(!a.lexical.has('inner') && !b.lexical.has('inner')); // 함수 안 선언은 최상위가 아님
    assert.ok(a.plain.has('helper') && b.plain.has('go'));
});
