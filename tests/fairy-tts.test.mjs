// 음성 합성(fairy-tts.js)과 엔진(fairy-engine.js) 분리 회귀 시험
// ① 엔진을 싣는 모든 화면이 fairy-tts.js를 먼저 싣는지 ② 두 파일을 함께 실어도 이름이 겹치지 않고 공개 함수가 다 있는지
// ③ 문장 대기열: 중간 실패 건너뛰기·끝 콜백·미리 받기 개수·음성 해제 ④ 수식 읽기·말하기 속도
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const ttsSrc = read('kids/core/fairy-tts.js');
const engineSrc = read('kids/core/fairy-engine.js');
const catalogSrc = read('kids/core/fairy-settings-catalog.js');

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'tests', 'scratch'].includes(entry.name) || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(html|js)$/.test(entry.name)) out.push(full);
    }
    return out;
}

// 정적 <script> 태그 또는 동적 불러오기 목록의 한 항목
const loadPattern = name => new RegExp(`<script[^>]+${name.replace('.', '\\.')}|['"]${name.replace('.', '\\.')}['"]\\s*,`, 'g');

test('① 엔진을 싣는 모든 화면·로더가 fairy-tts.js를 먼저, 목록 파일도 함께 싣는다', () => {
    const loaders = [];
    for (const file of walk(repoRoot)) {
        const src = fs.readFileSync(file, 'utf8');
        const engine = [...src.matchAll(loadPattern('fairy-engine.js'))];
        if (!engine.length) continue;
        const rel = path.relative(repoRoot, file);
        loaders.push(rel);
        const tts = [...src.matchAll(loadPattern('fairy-tts.js'))];
        assert.ok(tts.length, `${rel}: fairy-tts.js 없음`);
        assert.ok(tts[0].index < engine[0].index, `${rel}: fairy-tts.js가 fairy-engine.js보다 뒤에 있음`);
        assert.ok(loadPattern('fairy-settings-catalog.js').test(src), `${rel}: fairy-settings-catalog.js 없음`);
    }
    // 설정창(말하기 속도 단추)이 있는 화면도 fairy-tts.js를 싣는다
    for (const file of walk(repoRoot)) {
        const src = fs.readFileSync(file, 'utf8');
        if (!loadPattern('fairy-settings-engine.js').test(src)) continue;
        assert.ok(loadPattern('fairy-tts.js').test(src), `${path.relative(repoRoot, file)}: 설정창은 있는데 fairy-tts.js 없음`);
    }
    // 정적 HTML 34곳 + core.js·lobby_controller.js
    assert.ok(loaders.length >= 36, `엔진을 싣는 곳이 ${loaders.length}개뿐`);
    assert.ok(loaders.some(f => f.endsWith('core.js')) && loaders.some(f => f.endsWith('lobby_controller.js')));
});

test('② 새 파일 이름에 fairy-engine.js 글자가 없고, 두 파일의 최상위 이름이 겹치지 않는다', () => {
    assert.ok(!'fairy-tts.js'.includes('fairy-engine.js'));
    const topNames = src => new Set([...src.matchAll(/^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
    const overlap = [...topNames(ttsSrc)].filter(n => topNames(engineSrc).has(n));
    assert.deepEqual(overlap, []);
});

function makeSandbox({ settings = {}, legacy = {}, fetchPlan = {}, user = 'son' } = {}) {
    const store = new Map(Object.entries(legacy));
    store.set(`MINMIN_APP_SETTINGS_${user}`, JSON.stringify(settings));
    const log = { fetched: [], played: [], revoked: [], created: [] };
    const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        URLSearchParams, setTimeout, clearTimeout, AbortController, Promise,
        Event: class { constructor(type) { this.type = type; } },
        localStorage: {
            getItem: k => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: k => store.delete(k)
        },
        location: { search: `?user=${user}` },
        URL: {
            createObjectURL: blob => { const url = `blob:${blob.text}`; log.created.push(url); return url; },
            revokeObjectURL: url => log.revoked.push(url)
        },
        fetch: async (url, init) => {
            const text = JSON.parse(init.body).text;
            log.fetched.push(text);
            if (fetchPlan[text] === 'fail') throw new Error('network down');
            return { ok: true, blob: async () => ({ size: 10, text }) };
        },
        Audio: class {
            constructor(src) { this.src = src; this.playbackRate = 1; }
            play() {
                log.played.push({ src: this.src, rate: this.playbackRate });
                setTimeout(() => this.onended && this.onended(), 1);
                return Promise.resolve();
            }
            pause() {}
        },
        document: {
            readyState: 'complete',
            getElementsByTagName: () => [{ src: 'https://school.test/kids/core/fairy-engine.js' }],
            querySelector: () => ({}),
            addEventListener() {}, removeEventListener() {},
            createElement: () => ({}), head: { appendChild() {} }
        },
        addEventListener() {},
        dispatchEvent() {}
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    return { sandbox, log, store };
}

test('② 세 파일을 한 화면처럼 차례로 실으면 공개 함수가 모두 생긴다', () => {
    const { sandbox } = makeSandbox();
    vm.runInContext(ttsSrc, sandbox);
    vm.runInContext(catalogSrc, sandbox);
    vm.runInContext(engineSrc, sandbox);
    const exported = [
        'speakFairyTTS', 'fairySpeak', 'speak', 'speakFairy', 'speakEnglish', 'stopFairyTTS', 'playFairyPresetAudio',
        'playFairyPreset', 'getBestKoreanVoice', 'unlockFairySpeechEngine', 'initFairyAudio', 'isEnglishText',
        'getCloudflareEdgeTtsConfig', 'fetchCloudflareEdgeTtsAudio', 'playCloudflareEdgeTtsStream',
        'getEnglishSpeechRate', 'setEnglishSpeechRate', 'getKoreanSpeechRate', 'setKoreanSpeechRate',
        'fairyPraise', 'fairyEncourage', 'fairyHint', 'fairyReward', 'fairyGreet', 'resolveFairyPresetAudio', 'pickPersonaVoiceFile',
        'getFairyAssetBaseUrl', 'toggleFairyTtsSetting', 'updateTtsToggleUi'
    ];
    for (const name of exported) assert.equal(typeof sandbox.window[name], 'function', name);
    assert.equal(typeof sandbox.window.FAIRY_AUDIO_PRESETS, 'object');
    // 브라우저 OpenAI 직접 호출 경로는 없어야 한다 (헌법 §5)
    assert.ok(!/api\.openai\.com|OPENAI_API_KEY'\)\s*\|\|/.test(ttsSrc + engineSrc));
    for (const gone of ['getOpenAITtsConfig', 'openTtsVoiceSettingsModal', 'saveTtsVoiceSettings']) {
        assert.equal(sandbox.window[gone], undefined, gone);
    }
});

function runStream(sandbox, text) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('끝 콜백이 오지 않음')), 2000);
        let ends = 0;
        sandbox.playCloudflareEdgeTtsStream(text, () => {
            ends++;
            setTimeout(() => { clearTimeout(timer); resolve(ends); }, 30);
        }).catch(reject);
    });
}

const LONG = n => `이 문장은 대기열 시험을 위해 일부러 길게 만든 ${n}번째 문장으로, 캐시에 넣지 않을 만큼 충분히 길어서 재생이 끝나면 바로 해제되어야 합니다.`;

test('③ 중간 문장이 실패하면 건너뛰고 끝 콜백이 한 번 온다, 다 쓴 긴 문장 음성은 해제한다', async () => {
    const sentences = [LONG(1), LONG(2), LONG(3)];
    const { sandbox, log } = makeSandbox({ fetchPlan: { [sentences[1]]: 'fail' } });
    vm.runInContext(ttsSrc, sandbox);
    const ends = await runStream(sandbox, sentences.join(' '));
    assert.equal(ends, 1);
    assert.deepEqual(log.played.map(p => p.src), [`blob:${sentences[0]}`, `blob:${sentences[2]}`]);
    assert.deepEqual([...log.revoked].sort(), [`blob:${sentences[0]}`, `blob:${sentences[2]}`].sort());
});

test('③ 첫 문장부터 실패하면 거절해서 브라우저 음성으로 넘어가게 한다', async () => {
    const { sandbox } = makeSandbox({ fetchPlan: { [LONG(1)]: 'fail' } });
    vm.runInContext(ttsSrc, sandbox);
    await assert.rejects(sandbox.playCloudflareEdgeTtsStream(`${LONG(1)} ${LONG(2)}`, () => {}), /network down/);
});

test('③ 한꺼번에 받지 않고 지금 문장 + 다음 2문장만 미리 받는다, 짧은 문장은 캐시에 남긴다', async () => {
    const { sandbox, log } = makeSandbox();
    vm.runInContext(ttsSrc, sandbox);
    const text = [1, 2, 3, 4, 5, 6].map(n => `짧은 문장 ${n}번입니다.`).join(' ');
    const started = sandbox.playCloudflareEdgeTtsStream(text, null);
    await started; // 첫 문장 재생 시작 시점
    assert.ok(log.fetched.length <= 3, `처음에 ${log.fetched.length}개를 받음`);
    await new Promise(r => setTimeout(r, 100));
    assert.equal(log.played.length, 6);
    assert.deepEqual(log.revoked, []); // 60자 이하 문장은 캐시
});

test('③ 재생 중 정지하면 끝 콜백 없이 멈추고 미리 받은 긴 문장 음성을 해제한다', async () => {
    const { sandbox, log } = makeSandbox();
    vm.runInContext(ttsSrc, sandbox);
    let ended = false;
    await sandbox.playCloudflareEdgeTtsStream([1, 2, 3, 4].map(LONG).join(' '), () => { ended = true; });
    sandbox.stopFairyTTS();
    await new Promise(r => setTimeout(r, 50));
    assert.equal(ended, false);
    assert.equal(log.played.length, 1);
    for (const url of log.created) assert.ok(log.revoked.includes(url), `${url} 해제 안 됨`);
});

test('④ 수식 기호를 말로 읽는다 ("5-2학기"처럼 등호 없는 빼기표는 그대로)', () => {
    const { sandbox } = makeSandbox();
    vm.runInContext(ttsSrc, sandbox);
    const say = t => sandbox.cleanTextForTTS(t).text;
    assert.equal(say('3+4=7'), '3 더하기 4는 7');
    assert.equal(say('10-3=7'), '10 빼기 3은 7');
    assert.equal(say('6×7=?'), '6 곱하기 7은 ?');
    assert.equal(say('12÷4=3'), '12 나누기 4는 3');
    assert.equal(say('5-2학기 과학'), '5 2학기 과학');
});

test('④ 말하기 속도: 한국어는 Edge 속도로, 영어는 재생 배속으로, 예전 영어 저장값도 읽는다', async () => {
    const slow = makeSandbox({ settings: { korean_speech_rate: 0.85 }, legacy: { english_speech_rate: '0.5' } });
    vm.runInContext(ttsSrc, slow.sandbox);
    assert.equal(slow.sandbox.getCloudflareEdgeTtsConfig('안녕하세요').rate, '-10%');
    assert.equal(slow.sandbox.getEnglishSpeechRate(), 0.5);
    await runStream(slow.sandbox, 'Hello there.');
    assert.equal(slow.log.played[0].rate, 0.5);

    const normal = makeSandbox();
    vm.runInContext(ttsSrc, normal.sandbox);
    assert.equal(normal.sandbox.getCloudflareEdgeTtsConfig('안녕하세요').rate, '+6%');
    assert.equal(normal.sandbox.getEnglishSpeechRate(), 0.85);
    normal.sandbox.setEnglishSpeechRate(0.75);
    normal.sandbox.setKoreanSpeechRate(1.15);
    const saved = JSON.parse(normal.store.get('MINMIN_APP_SETTINGS_son'));
    assert.deepEqual([saved.english_speech_rate, saved.korean_speech_rate], [0.75, 1.15]);
    assert.equal(normal.sandbox.getCloudflareEdgeTtsConfig('안녕하세요').rate, '+22%');
    // 기기에 남아 있던 OpenAI 키는 지운다
    const withKey = makeSandbox({ legacy: { OPENAI_API_KEY: 'sk-old' } });
    vm.runInContext(ttsSrc, withKey.sandbox);
    assert.equal(withKey.store.has('OPENAI_API_KEY'), false);
});

test('⑤ 코코 음성 목록(FAIRY_AUDIO_PRESETS)은 목록 파일에 있고, 적힌 mp3가 모두 실제로 있다', () => {
    const { sandbox } = makeSandbox();
    vm.runInContext(catalogSrc, sandbox);
    const presets = sandbox.FAIRY_AUDIO_PRESETS;
    assert.ok(!/(?:var|const|let)\s+FAIRY_(?:AUDIO_PRESETS|PRESET_AUDIOS)/.test(engineSrc), '엔진에 목록이 남아 있음');
    const files = Object.entries(presets).filter(([k]) => k !== 'aliases').flatMap(([, v]) => v);
    assert.ok(files.length >= 36, `코코 음성 ${files.length}개`);
    for (const file of files) {
        assert.ok(fs.existsSync(path.join(repoRoot, 'kids/assets/sounds/fairy', file)), `${file} 없음`);
    }
    for (const [oldName, target] of Object.entries(presets.aliases)) {
        assert.equal(typeof presets[target], 'string', `옛 이름 ${oldName} → ${target} 없음`);
    }
});

test('⑤ 엔진은 목록 파일의 코코 음성을 쓴다 (옛 이름·무작위 칭찬·보상)', () => {
    const { sandbox, log } = makeSandbox();
    vm.runInContext(ttsSrc, sandbox);
    vm.runInContext(catalogSrc, sandbox);
    vm.runInContext(engineSrc, sandbox);
    const name = src => src.split('/').pop();
    assert.equal(name(sandbox.resolveFairyPresetAudio('welcome_math_minsu')), 'fairy_welcome_minsu.mp3');
    assert.equal(name(sandbox.resolveFairyPresetAudio('hint_open')), 'fairy_hint_open.mp3');
    assert.equal(sandbox.resolveFairyPresetAudio('aliases'), null);
    sandbox.fairyPraise();
    sandbox.fairyReward('diamond');
    assert.match(name(log.played[0].src), /^fairy_praise_\d+\.mp3$/);
    assert.equal(name(log.played[1].src), 'fairy_reward_diamond.mp3');
});
