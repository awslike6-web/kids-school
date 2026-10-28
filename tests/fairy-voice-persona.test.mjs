// 캐릭터 목소리(깐죽이·깍쟁이 등) 고르기 회귀 시험
// fairy-engine.js가 목소리 목록(VOICE_CATALOG)만 보고 파일을 고르는지, 다른 아이·준비중 목소리는 기본 요정으로 돌아가는지 확인
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const ttsSrc = read('../kids/core/fairy-tts.js'); // 화면과 같은 순서: 음성 합성 → 목록 → 엔진
const engineSrc = read('../kids/core/fairy-engine.js');
const catalogSrc = read('../kids/core/fairy-settings-catalog.js');

function setup({ user, persona, withCatalog = true, extraVoice = null }) {
    const store = new Map([[`MINMIN_APP_SETTINGS_${user}`, JSON.stringify({ voice_persona: persona })]]);
    const played = [];
    const appended = [];
    const engineTag = { src: 'https://school.test/kids/core/fairy-engine.js?v=1' };
    const sandbox = {
        console,
        URLSearchParams,
        setTimeout,
        clearTimeout,
        localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
        location: { search: `?user=${user}` },
        Audio: class { constructor(src) { this.src = src; played.push(src); } play() { return Promise.resolve(); } pause() {} },
        document: {
            readyState: 'complete',
            getElementsByTagName: () => [engineTag],
            querySelector: () => null,
            createElement: () => ({}),
            head: { appendChild: tag => appended.push(tag.src) },
            addEventListener() {}
        },
        addEventListener() {},
        dispatchEvent() {},
        Event: class { constructor(type) { this.type = type; } }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(ttsSrc, sandbox);
    if (withCatalog) vm.runInContext(catalogSrc, sandbox);
    if (extraVoice) vm.runInContext(`VOICE_CATALOG.push(${JSON.stringify(extraVoice)});`, sandbox);
    vm.runInContext(engineSrc, sandbox);
    const name = src => src.split('/').slice(-2).join('/');
    return {
        sandbox,
        appended,
        play(fn, ...args) { played.length = 0; sandbox[fn](...args); return played.map(name); }
    };
}

test('민서가 깍쟁이를 고르면 정답·오답·완주·인사 모두 snarky 파일', () => {
    const s = setup({ user: 'daughter', persona: 'snarky_minseo' });
    assert.match(s.play('fairyPraise')[0], /^snarky\/snarky_correct_0[1-5]\.wav$/);
    assert.match(s.play('fairyEncourage')[0], /^snarky\/snarky_wrong_0[1-4]\.wav$/);
    assert.deepEqual(s.play('fairyReward', 'quest'), ['snarky/snarky_clear_01.wav']);
    assert.deepEqual(s.play('fairyGreet', 'lobby'), ['snarky/snarky_welcome_01.wav']);
    // 레벨업·과목 인사는 캐릭터 파일이 없으므로 요정 코코 그대로
    assert.deepEqual(s.play('fairyReward', 'level'), ['fairy/fairy_level_up.mp3']);
    assert.deepEqual(s.play('fairyGreet', 'math'), ['fairy/fairy_welcome_math.mp3']);
});

test('정답 음성 5개를 고르게 돌리고 같은 파일이 연달아 나오지 않음', () => {
    const s = setup({ user: 'son', persona: 'tease_minsu' });
    const seen = new Set();
    let last = null;
    for (let i = 0; i < 60; i++) {
        const [file] = s.play('fairyPraise');
        assert.notEqual(file, last);
        seen.add(file);
        last = file;
    }
    assert.equal(seen.size, 5);
});

test('민서에게 민수 전용 깐죽이가 설정돼 있어도 기본 요정 목소리', () => {
    const s = setup({ user: 'daughter', persona: 'tease_minsu' });
    assert.match(s.play('fairyPraise')[0], /^fairy\/fairy_praise_\d+\.mp3$/);
    assert.match(s.play('fairyEncourage')[0], /^fairy\/fairy_encourage_\d+\.mp3$/);
});

test('음성 파일이 없는 준비중 목소리는 기본 요정 목소리, 목록 미로딩이면 오류 없이 조용히 넘어감', () => {
    const ready = setup({ user: 'daughter', persona: 'clingy_minseo' });
    assert.match(ready.play('fairyPraise')[0], /^fairy\/fairy_praise_\d+\.mp3$/);
    // 코코 음성 목록도 목록 파일에 있으므로, 목록이 없으면 소리 없이 끝 콜백만 (모든 화면이 목록을 먼저 싣는다)
    const noCatalog = setup({ user: 'son', persona: 'tease_minsu', withCatalog: false });
    let ended = 0;
    assert.deepEqual(noCatalog.play('fairyPraise', () => ended++), []);
    assert.deepEqual(noCatalog.play('fairyReward', 'level', () => ended++), []);
    assert.deepEqual(noCatalog.play('fairyGreet', 'math', () => ended++), []);
    assert.equal(ended, 3);
    // 목록이 없는 화면에서는 엔진 옆의 목록 파일을 한 번 불러온다
    assert.deepEqual(noCatalog.appended, ['https://school.test/kids/core/fairy-settings-catalog.js']);
});

test('새 목소리는 목록에 항목 하나만 추가하면 엔진 수정 없이 재생', () => {
    const s = setup({
        user: 'son',
        persona: 'whine_v2',
        extraVoice: { id: 'whine_v2', name: '테스트', target: 'son', voiceDir: 'whine', files: { welcome: 1, correct: 5, wrong: 4, clear: 1 } }
    });
    assert.match(s.play('fairyPraise')[0], /^whine\/whine_correct_0[1-5]\.wav$/);
    assert.match(s.play('fairyEncourage')[0], /^whine\/whine_wrong_0[1-4]\.wav$/);
    assert.deepEqual(s.play('fairyReward', 'finish'), ['whine/whine_clear_01.wav']);
    // 문장으로 고르는 경로(resolveFairyPresetAudio)도 같은 목록을 따른다
    assert.match(s.sandbox.resolveFairyPresetAudio('정답이에요! 최고!'), /whine\/whine_correct_0[1-5]\.wav$/);
    assert.match(s.sandbox.resolveFairyPresetAudio('아쉽네요! 다시 해봐요'), /whine\/whine_wrong_0[1-4]\.wav$/);
});

test('목록의 캐릭터 목소리 파일이 실제로 모두 있음', () => {
    const s = setup({ user: 'son', persona: 'default' });
    const voices = vm.runInContext('VOICE_CATALOG', s.sandbox).filter(v => v.files);
    assert.ok(voices.length >= 2);
    for (const v of voices) {
        for (const [kind, count] of Object.entries(v.files)) {
            for (let i = 1; i <= count; i++) {
                const file = `../kids/assets/voices/${v.voiceDir}/${v.voiceDir}_${kind}_${String(i).padStart(2, '0')}.wav`;
                assert.ok(fs.existsSync(new URL(file, import.meta.url)), `${file} 없음`);
            }
        }
        assert.ok(fs.existsSync(new URL(`../kids/${v.previewFile}`, import.meta.url)), `${v.previewFile} 없음`);
    }
});
