// 용어사전방 기타 과목 단원 영상 열쇠 (docs/other_subjects_spec.md §6). 초안: 안티그래비티 Hydrogen, 검토: Claude
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { root, read } from './split-rules.mjs';
const src = read('kids/common_space/voca_common.js');
function load() {
    const ctx = {
        window: { location: { search: '' }, currentProfile: 'son', isAdmin: false, addEventListener() {} },
        URLSearchParams, console, document: { getElementById: () => null },
        fetchVocaFromNotion: async () => [], setTimeout
    };
    vm.createContext(ctx);
    vm.runInContext(src + '\n;globalThis.__t = { vocaUnitVideoKey, unitVideoSubject };', ctx);
    return ctx.__t;
}

test('등록 자료와 같은 단원영상 열쇠를 만든다', () => {
    const { vocaUnitVideoKey } = load();
    const dir = path.join(root, 'scripts/data/curriculum');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('_video.json'));
    assert.ok(files.length >= 20, `expected >= 20 video files, got ${files.length}`);
    for (const file of files) {
        const seed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        const expected = 'https://awslike6-web.github.io/kids-school/' + vocaUnitVideoKey(seed.subject, seed.unit);
        for (const item of seed.items || []) {
            if (item.zone === '단원영상') {
                assert.equal(item.interactive_url, expected, `${file}: ${item.interactive_url}`);
            }
        }
    }
});

test('열쇠에 공백이 없고 subject 다음에 unit 순서로 온다', () => {
    const { vocaUnitVideoKey } = load();
    const cases = [
        ['보건', '4. 건강 안전과 응급 처치'],
        ['미술', "1. '나'라는 우주"],
    ];
    for (const [subject, unit] of cases) {
        const key = vocaUnitVideoKey(subject, unit);
        assert.equal(key.includes(' '), false);
        const q = key.split('?')[1] || '';
        const sIdx = q.indexOf('subject=');
        const uIdx = q.indexOf('&unit=');
        assert.ok(sIdx === 0 && uIdx > sIdx, `unexpected query order: ${key}`);
    }
});

test('unitVideoSubject는 해당 단원 과목이 도덕·미술·보건 중 하나일 때만 반환한다', () => {
    const { unitVideoSubject } = load();
    const u = '4. 건강 안전과 응급 처치';
    assert.equal(unitVideoSubject([
        { stage: u, subject: ['보건'] },
        { stage: ` ${u} `, subject: ['보건'] },
        { stage: '다른 단원', subject: ['과학'] },
    ], u), '보건');
    assert.equal(unitVideoSubject([
        { stage: u, subject: ['도덕'] },
        { stage: u, subject: ['미술'] },
    ], u), null);
    assert.equal(unitVideoSubject([{ stage: u, subject: ['과학'] }], u), null);
    assert.equal(unitVideoSubject([{ stage: '', subject: ['보건'] }], ''), null);
});
