// 용어사전방 아이별 보기 범위 (2026-11-17): 로비 ?user= 로 들어온 아이에 맞춰 열고,
// 'own' 범위 아이(민서)는 다른 아이 낱말을 불러오지도, 학생 전환 버튼을 보지도 못한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

const src = read('kids/common_space/voca_common.js');

function load({ search = '', profile = 'son', isAdmin = false } = {}) {
    const ctx = {
        window: { location: { search }, currentProfile: profile, isAdmin, addEventListener() {} },
        URLSearchParams, console, document: { getElementById: () => null },
        fetchVocaFromNotion: async () => [], setTimeout
    };
    vm.createContext(ctx);
    vm.runInContext(src + '\n;globalThis.__t = { VOCA_VIEWER, selectedStudents, resolveVocaViewer, vocaWordForStudent, VOCA_STUDENT_SCOPE };', ctx);
    return ctx.__t;
}

test('범위 표: 민수는 mine, 민서는 own (민서가 자라면 mine으로 바꾼다)', () => {
    const { VOCA_STUDENT_SCOPE } = load();
    assert.equal(VOCA_STUDENT_SCOPE.son, 'mine');
    assert.equal(VOCA_STUDENT_SCOPE.daughter, 'own');
});

test('로비 ?user=daughter → 민서·own, 처음 고른 학생은 민서', () => {
    const t = load({ search: '?user=daughter', profile: 'son' });
    assert.equal(t.VOCA_VIEWER.name, '민서');
    assert.equal(t.VOCA_VIEWER.scope, 'own');
    assert.deepEqual([...t.selectedStudents], ['민서']);
});

test('?user=son → 민수·mine, 주소가 없으면 저장된 프로필을 쓴다', () => {
    assert.equal(load({ search: '?user=son' }).VOCA_VIEWER.scope, 'mine');
    const t = load({ search: '', profile: 'daughter' });
    assert.equal(t.VOCA_VIEWER.name, '민서');
    assert.equal(load({ search: '?user=minseo' }).VOCA_VIEWER.name, '민서');
});

test('부모 로그인과 모르는 값은 전체 학생으로 연다', () => {
    const parent = load({ search: '?user=daughter', isAdmin: true });
    assert.equal(parent.VOCA_VIEWER, null);
    assert.deepEqual([...parent.selectedStudents], []);
    assert.equal(load({ search: '?user=guest', profile: 'guest' }).VOCA_VIEWER, null);
});

test('자기 낱말과 공통 낱말만 own 범위에 남는다', () => {
    const { vocaWordForStudent } = load();
    assert.ok(vocaWordForStudent({ target: ['민서'] }, '민서'));
    assert.ok(vocaWordForStudent({ target: ['공통'] }, '민서'));
    assert.ok(vocaWordForStudent({ target: ['민수', '민서'] }, '민서'));
    assert.ok(!vocaWordForStudent({ target: ['민수'] }, '민서'));
});
