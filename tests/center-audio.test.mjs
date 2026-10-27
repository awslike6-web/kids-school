import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';

const source = fs.readFileSync(new URL('../kids/core/center-reading-audio.js', import.meta.url), 'utf8');
const settings = { normalization: 'v2', engine: 'edge-tts', voice: 'ko-KR-SunHiNeural', rate: '+0%', pitch: '+0Hz' };
const keyOf = text => createHash('sha256').update(`v2|edge-tts|ko-KR-SunHiNeural|+0%|+0Hz|${text}`).digest('hex').slice(0, 24);

function setup({ delay = false, broken = false } = {}) {
    const text = '물체는 물질로 만들어요.';
    const key = keyOf(text);
    let enabled = true, release;
    const objects = [];
    const data = { version: 2, settings, clips: { [key]: { spoken_text: text, audio_file: `${key}.mp3` } } };
    const root = {
        crypto: webcrypto, localStorage: { getItem: () => enabled ? 'true' : 'false' },
        fetch: async () => { if (delay) await new Promise(r => { release = r; }); return { ok: true, json: async () => data }; },
        Audio: class {
            constructor(url) { this.url = url; this.paused = true; objects.push(this); }
            async play() { if (broken) throw new Error('MP3 404'); this.paused = false; }
            pause() { this.paused = true; }
        },
        addEventListener() {}
    };
    vm.runInNewContext(source, { window: root, document: { currentScript: { src: 'https://school.test/kids/core/center-reading-audio.js' } },
        URL, TextEncoder, Uint8Array, AbortController, setTimeout, clearTimeout, console });
    return { api: root.CenterReadingAudio, text, objects, data, off: () => { enabled = false; }, release: () => release() };
}

test('정규화·합성설정 해시와 본문 변경 시 옛 MP3 미사용', async () => {
    const { api, text, objects } = setup();
    const normalized = api.normalize('가공*  (㉠) ‘안녕’ “물질”');
    assert.equal(normalized, '가공 빈칸 \'안녕\' "물질"');
    assert.equal(await api.hash(text, settings), keyOf(text));
    assert.equal(await api.play(`${text}\n`), true);
    assert.equal(objects.length, 1);
    assert.match(objects[0].url, /kids\/assets\/audio\/center_reading\/[a-f0-9]{24}\.mp3$/);
    assert.equal(await api.play('노션에서 바뀐 본문'), false);
    assert.equal(objects[0].paused, true);
    assert.equal(objects.length, 1);
});

test('목록 요청 대기 중 중지·화면 닫기는 지연 재생을 취소', async () => {
    const state = setup({ delay: true });
    const pending = state.api.play(state.text);
    state.api.stop();
    state.release();
    assert.equal(await pending, true);
    assert.equal(state.objects.length, 0);
});

test('음성 OFF, 재생 실패 대체, 오래된 종료 이벤트 차단', async () => {
    const state = setup();
    state.off();
    assert.equal(await state.api.play(state.text), true);
    assert.equal(state.objects.length, 0);
    const failure = setup({ broken: true });
    let fallback = 0;
    await failure.api.play(failure.text, { onError: () => fallback++ });
    assert.equal(fallback, 1);
    let ended = 0;
    const current = setup();
    await current.api.play(current.text, { onEnd: () => ended++ });
    const oldEnd = current.objects[0].onended;
    current.api.stop();
    oldEnd();
    assert.equal(ended, 0);
});
