// 공용 음성 함수(fairy-tts.js)를 과목 파일이 다시 정의해 덮지 않는다 (2026-11-28 리팩토링 묶음 E)
// 사회방 대문(society_common.js)이 10-02부터 speakFairyTTS·stopFairyTTS를 다시 정의해, 없는 FairyEngine을 찾다가
// 브라우저 기계음(speechSynthesis)으로 읽고 있었다. 「엔진이 아직 없을 때만」 두는 임시 함수(if (!window.X))는 허용한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['speakFairyTTS', 'stopFairyTTS', 'speakEnglish'];

function jsFiles(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', 'data'].includes(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) jsFiles(full, out);
        else if (e.name.endsWith('.js')) out.push(full);
    }
    return out;
}

test('fairy-tts.js 말고는 공용 음성 함수를 최상위에서 다시 정의하지 않는다', () => {
    const offenders = [];
    for (const file of jsFiles(path.join(root, 'kids'))) {
        const rel = path.relative(root, file).replace(/\\/g, '/');
        if (rel === 'kids/core/fairy-tts.js') continue;
        const src = fs.readFileSync(file, 'utf8');
        for (const name of NAMES) {
            // 최상위 function 선언(줄 맨 앞) 또는 가드 없는 window.X = function — 가드(if (!window.X))로 감싼 임시 함수는 허용
            if (new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm').test(src)) offenders.push(`${rel}: function ${name}`);
            for (const m of src.matchAll(new RegExp(`^(\\s*)window\\.${name}\\s*=\\s*(?:async\\s+)?function`, 'gm'))) {
                const before = src.slice(Math.max(0, m.index - 200), m.index);
                if (!new RegExp(`if\\s*\\(\\s*!\\s*window\\.${name}\\s*\\)`).test(before)) offenders.push(`${rel}: window.${name} = (가드 없음)`);
            }
        }
    }
    assert.deepEqual(offenders, [], offenders.join('\n'));
});

test('사회방 대문을 싣고 나도 speakFairyTTS는 공용 함수 그대로다', () => {
    const real = function speakFairyTTS() { return 'real'; };
    const store = new Map();
    const ctx = {
        console: { log() {}, warn() {}, error() {} },
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
        document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
        speakFairyTTS: real,
        stopFairyTTS: () => {}
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'kids/js/society_common.js'), 'utf8'), ctx);
    assert.equal(ctx.speakFairyTTS, real);
});
