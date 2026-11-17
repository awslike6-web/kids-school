// 용어사전방 기타 과목(도덕·미술·보건) 단원 → 5분 퀘스트 링크 (docs/other_subjects_spec.md §5). 초안: 안티그래비티 Hydrogen, 검토: Claude
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';
const src = read('kids/common_space/voca_common.js');
function load() {
    const ctx = {
        window: { location: { search: '' }, currentProfile: 'son', isAdmin: false, addEventListener() {} },
        URLSearchParams, console, document: { getElementById: () => null },
        fetchVocaFromNotion: async () => [], setTimeout
    };
    vm.createContext(ctx);
    vm.runInContext(src + '\n;globalThis.__t = { buildUnitQuestLink, VOCA_QUEST_SUBJECTS };', ctx);
    return ctx.__t;
}
const make = (n, stage, subject) => Array.from({ length: n }, () => ({ stage, subject }));

test('보건 단원 4개 이상과 특수문자·한글 단원명 인코딩', () => {
    const { buildUnitQuestLink } = load();
    const u1 = '4. 건강 안전과 응급 처치';
    const r1 = buildUnitQuestLink(make(4, u1, ['보건']), u1, null, 'son');
    assert.equal(r1.href, '../../quest_runner.html?subject=health&user=minsu&unit=' + encodeURIComponent(u1) + '&from=voca');
    assert.equal(r1.count, 4);
    assert.equal(r1.subjectKo, '보건');
    const u2 = '미술 톡톡. ㅇㅅㅎ(1, 2)';
    const r2 = buildUnitQuestLink(make(3, u2, ['미술']), u2, null, 'son');
    assert.equal(r2.href, '../../quest_runner.html?subject=art&user=minsu&unit=' + encodeURIComponent(u2) + '&from=voca');
});

test('단원 낱말이 2개뿐이면 null 반환', () => {
    const { buildUnitQuestLink } = load();
    assert.equal(buildUnitQuestLink(make(2, '1단원', ['도덕']), '1단원', null, 'son'), null);
});

test('같은 단원 이름에 과목이 둘 섞이면 null 반환', () => {
    const { buildUnitQuestLink } = load();
    const words = [...make(2, '혼합', ['도덕']), ...make(2, '혼합', ['미술'])];
    assert.equal(buildUnitQuestLink(words, '혼합', null, 'son'), null);
});

test('표에 없는 과목은 null 반환', () => {
    const { buildUnitQuestLink } = load();
    assert.equal(buildUnitQuestLink(make(4, '1단원', ['과학']), '1단원', null, 'son'), null);
});

test('viewer와 profile에 따른 접근 제한 확인', () => {
    const { buildUnitQuestLink } = load();
    const words = make(3, '예절', ['도덕']);
    assert.equal(buildUnitQuestLink(words, '예절', { name: '민서', scope: 'own' }, 'son'), null);
    assert.equal(buildUnitQuestLink(words, '예절', null, 'daughter'), null);
    const r = buildUnitQuestLink(words, '예절', null, 'son');
    assert.equal(r.subjectKo, '도덕');
    assert.equal(r.count, 3);
});

test('unit이 빈 문자열이면 null이고 다른 단원 낱말은 세지 않음', () => {
    const { buildUnitQuestLink } = load();
    const words = [...make(2, '대상', ['보건']), ...make(5, '다른단원', ['보건'])];
    assert.equal(buildUnitQuestLink(words, '', null, 'son'), null);
    assert.equal(buildUnitQuestLink(words, '대상', null, 'son'), null);
});

test('VOCA_QUEST_SUBJECTS 세 키 값 확인', () => {
    const { VOCA_QUEST_SUBJECTS } = load();
    assert.equal(VOCA_QUEST_SUBJECTS['도덕'], 'moral');
    assert.equal(VOCA_QUEST_SUBJECTS['미술'], 'art');
    assert.equal(VOCA_QUEST_SUBJECTS['보건'], 'health');
    assert.equal(Object.keys(VOCA_QUEST_SUBJECTS).length, 3);
});
