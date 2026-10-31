import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const file = 'kids/common_space/gallery-runner-rewards.js';
const key = 'galleryRunnerBank_son';
const plain = value => JSON.parse(JSON.stringify(value));
const bank = (total = 300, pending = 0, extras = {}) => ({ v: 1, total, pending, updatedAt: 10, boostDate: '',
    loadout: { stage: 'neon_grid', trail: 'none', hat: 'none', star: 'bolt' }, ...extras });
function storageOf(initial = {}) {
    const data = new Map(Object.entries({ currentUserName: '민수', MINMIN_INVENTORY_PAGE_ID_민수: 'son-page', ...initial }));
    return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
}
function notion(initial = bank()) {
    return { value: plain(initial), calls: [], fail: null, propertyType: 'rich_text', beforePatch: null,
        active: 0, peak: 0,
        async fetch(url, options = {}) {
            const method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : {};
            this.calls.push({ url, method, body });
            this.active++; this.peak = Math.max(this.peak, this.active);
            try {
                await Promise.resolve();
                if (this.fail === 'network') throw new Error('오프라인');
                if (this.fail === method || this.fail === '500') return { ok: false, status: 500 };
                if (method === 'POST') return { ok: true, json: async () => ({ results: [{ id: 'son-page' }] }) };
                if (method === 'PATCH') {
                    await this.beforePatch?.();
                    assert.deepEqual(Object.keys(body.properties), ['런너기록']);
                    this.value = JSON.parse(body.properties['런너기록'].rich_text[0].text.content);
                    return { ok: true, json: async () => ({}) };
                }
                const property = this.propertyType === 'missing' ? undefined :
                    this.propertyType === 'rich_text' ? { type: 'rich_text', rich_text: this.rawText === undefined ?
                        [{ plain_text: JSON.stringify(this.value) }] : [{ text: { content: this.rawText } }] } :
                        { type: this.propertyType, number: 300 };
                return { ok: true, json: async () => ({ properties: { ...(property ? { '런너기록': property } : {}),
                    '학습설정': { type: 'rich_text', rich_text: [{ plain_text: '{"보존":"필수"}' }] } } }) };
            } finally { this.active--; }
        }
    };
}
function load(initial = {}, cloud = notion()) {
    const storage = storageOf(initial);
    const { sandbox } = loadBrowserScripts([file], { storage, fetch: cloud.fetch.bind(cloud) });
    // 꾸미기 디바운스를 기다리지 않고 명시적으로 실행한다. 운영 코드의 지연값도 확인한다.
    const timers = new Map(); let id = 0;
    sandbox.setTimeout = (fn, ms) => { timers.set(++id, { fn, ms }); return id; };
    sandbox.clearTimeout = id => timers.delete(id);
    return { api: sandbox.GalleryRunnerRewards, storage, cloud, sandbox, timers };
}
const patches = cloud => cloud.calls.filter(c => c.method === 'PATCH');
const friendA = 'art_test#main', friendB = 'art_test#second';

test('친밀도 단계·다음 단계·읽기 전용 상수의 모든 경계를 확인한다 (§7-1)', () => {
    const { api, storage, cloud } = load();
    for (const [runs, level, name, remaining] of [[0,1,'처음 만남',3], [2,1,'처음 만남',1], [3,2,'친구',5],
        [7,2,'친구',1], [8,3,'단짝',7], [14,3,'단짝',1], [15,4,'절친',10], [24,4,'절친',1],
        [25,5,'영혼의 단짝',null], [100,5,'영혼의 단짝',null]]) {
        storage.setItem(key, JSON.stringify(bank(0, 0, { friends: { [friendA]: runs } })));
        assert.deepEqual(plain(api.friendshipOf('son', friendA)), { runs, level, name,
            next: remaining === null ? null : { level: level + 1, remaining } });
    }
    assert.ok(Object.isFrozen(api.FRIEND_LEVELS)); assert.ok(api.FRIEND_LEVELS.every(Object.isFrozen));
    assert.equal(cloud.calls.length, 0);
});

test('addRun은 로컬 두 값을 증가시키고 PATCH 한 번·아이별 키 분리를 지킨다 (§7-2)', async () => {
    const { api, cloud, storage } = load();
    assert.ok(api.addRun('son', friendA));
    assert.equal(api.readBank('son').friends[friendA], 1);
    assert.equal(api.readBank('son').friendsPending[friendA], 1);
    assert.deepEqual(plain(api.readBank('daughter').friends), {});
    await api.flush('son');
    assert.equal(patches(cloud).length, 1); assert.equal(cloud.value.friends[friendA], 1);
    assert.deepEqual(plain(api.readBank('son').friendsPending), {});
    assert.ok(!Object.hasOwn(cloud.value, 'friendsPending')); assert.ok(!Object.hasOwn(cloud.value, 'pending'));
    storage.setItem(key, JSON.stringify(bank(0, 0, { friends: { [friendA]: Number.MAX_SAFE_INTEGER } })));
    assert.equal(api.addRun('son', friendA), false);
    assert.equal(patches(cloud).length, 1);
});

test('부모·잘못된 아이·잘못된 친밀도 키는 읽기·쓰기·요청 없이 거부한다 (§7-2)', async () => {
    for (const invalid of ['', 'art_test', 'art_TEST#main', 'art_test#', 'art_test#UPPER', 'art_test#x/y',
        `art_${'a'.repeat(81)}#main`, `art_test#${'a'.repeat(33)}`, null, {}, '__proto__']) {
        const { api, cloud, storage } = load(), before = [...storage.data.entries()];
        assert.equal(api.addRun('son', invalid), false);
        assert.equal(api.friendshipOf('son', invalid).runs, 0);
        assert.deepEqual([...storage.data.entries()], before); assert.equal(cloud.calls.length, 0);
    }
    for (const initial of [{ currentUserName: '아빠' }, { currentUserName: '엄마' }, { currentUser: 'parent' }]) {
        const { api, cloud, storage } = load(initial), before = [...storage.data.entries()];
        const get = storage.getItem; let reads = 0;
        storage.getItem = k => { if (k.startsWith('galleryRunnerBank_')) reads++; return get(k); };
        assert.equal(api.addRun('son', friendA), false); assert.equal(api.friendshipOf('son', friendA).level, 1);
        await api.pull('son'); await api.flush('son');
        assert.equal(reads, 0); assert.equal(cloud.calls.length, 0); assert.deepEqual([...storage.data.entries()], before);
    }
    const { api, cloud } = load();
    for (const child of ['parent', '', null, '__proto__']) assert.equal(api.addRun(child, friendA), false);
    assert.equal(cloud.calls.length, 0);
});

test('두 기기 친밀도 5+2+1은 정상 저장·오프라인 재시도 모두 8이다 (§7-3)', async () => {
    for (const offline of [false, true]) {
        const cloud = notion(bank(300, 0, { friends: { [friendA]: 5 } }));
        const initial = { [key]: JSON.stringify(cloud.value) }, tablet = load(initial, cloud), phone = load(initial, cloud);
        if (offline) cloud.fail = 'PATCH';
        tablet.api.addRun('son', friendA); tablet.api.addRun('son', friendA); await tablet.api.flush('son');
        phone.api.addRun('son', friendA); await phone.api.flush('son');
        if (offline) {
            assert.equal(cloud.value.friends[friendA], 5);
            assert.equal(tablet.api.readBank('son').friendsPending[friendA], 2);
            assert.equal(phone.api.readBank('son').friendsPending[friendA], 1);
            cloud.fail = null;
            await tablet.api.pull('son'); await phone.api.pull('son');
        }
        assert.equal(cloud.value.friends[friendA], 8);
        await tablet.api.pull('son'); await phone.api.pull('son');
        for (const device of [tablet, phone]) {
            assert.equal(device.api.readBank('son').friends[friendA], 8);
            assert.deepEqual(plain(device.api.readBank('son').friendsPending), {});
        }
    }
});

test('전송 중 추가한 같은·다른 캐릭터 pending은 보낸 만큼만 차감한다 (§7-3·4)', async () => {
    const { api, cloud } = load({ [key]: JSON.stringify(bank(352, 52,
        { friends: { [friendA]: 7 }, friendsPending: { [friendA]: 2 } })) },
        notion(bank(300, 0, { friends: { [friendA]: 5 } })));
    let changed = false;
    cloud.beforePatch = () => {
        if (changed) return; changed = true;
        api.addRun('son', friendA); api.addRun('son', friendB); api.addStars('son', 4);
    };
    assert.equal(await api.flush('son'), true);
    assert.equal(patches(cloud).length, 2); assert.equal(cloud.peak, 1);
    assert.equal(cloud.value.total, 356); assert.deepEqual(cloud.value.friends, { [friendA]: 8, [friendB]: 1 });
    assert.equal(api.readBank('son').pending, 0); assert.deepEqual(plain(api.readBank('son').friendsPending), {});
});

test('친밀도 저장 실패·속성 부재에도 두 pending을 보존한다 (§7-3·6)', async () => {
    for (const failure of ['500', 'network', 'PATCH', 'missing', 'number']) {
        const initial = bank(352, 52, { friends: { [friendA]: 6 }, friendsPending: { [friendA]: 1 } });
        const { api, cloud, storage } = load({ [key]: JSON.stringify(initial) }, notion(bank(300, 0, { friends: { [friendA]: 5 } })));
        if (['missing', 'number'].includes(failure)) cloud.propertyType = failure; else cloud.fail = failure;
        const before = storage.getItem(key);
        assert.equal(await api.flush('son'), false); assert.equal(storage.getItem(key), before);
        cloud.fail = null; cloud.propertyType = 'rich_text';
        assert.equal(await api.flush('son'), true); assert.equal(cloud.value.friends[friendA], 6);
        assert.equal(cloud.value.total, 352); await api.flush('son'); assert.equal(cloud.value.friends[friendA], 6);
    }
});

test('60개 항목은 전체 JSON 1900자 이하·완주 오름차순 삭제·pending 보호 (§7-5)', async () => {
    const entries = Array.from({ length: 60 }, (_, i) => [`art_${String(i).padStart(3, '0')}_${'x'.repeat(35)}#main`, i + 1]);
    const friends = Object.fromEntries(entries), protectedKey = entries[0][0];
    const cloud = notion(bank(300, 0, { friends }));
    const local = bank(302, 2, { friends: { ...friends, [protectedKey]: 2 }, friendsPending: { [protectedKey]: 1 } });
    const { api } = load({ [key]: JSON.stringify(local) }, cloud);
    assert.ok(JSON.stringify(cloud.value).length > 2000); assert.equal(await api.flush('son'), true);
    const content = patches(cloud)[0].body.properties['런너기록'].rich_text[0].text.content;
    assert.ok(content.length <= 1900); assert.equal(cloud.value.friends[protectedKey], 2);
    const removed = entries.slice(1).filter(([k]) => !Object.hasOwn(cloud.value.friends, k));
    assert.ok(removed.length > 0); assert.ok(removed.length < 59);
    assert.deepEqual(removed, entries.slice(1, removed.length + 1));
    assert.equal(cloud.value.total, 302); assert.deepEqual(plain(api.readBank('son').friends), cloud.value.friends);
    assert.deepEqual(plain(api.readBank('son').friendsPending), {});
});

test('pending만으로 1900자를 넘으면 PATCH 0건·로컬 원문 보존 (§7-5 보완)', async () => {
    const friends = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`art_${i}_${'x'.repeat(35)}#main`, 1]));
    const { api, cloud, storage } = load({ [key]: JSON.stringify(bank(352, 52, { friends, friendsPending: friends })) });
    const before = storage.getItem(key);
    assert.equal(await api.flush('son'), false); assert.equal(patches(cloud).length, 0);
    assert.equal(storage.getItem(key), before);
});

test('옛 v1·깨진 친밀도 값은 정규화하고 노션의 pending은 합산하지 않는다 (§7-6)', async () => {
    for (const raw of ['{', JSON.stringify(bank()), JSON.stringify(bank(0, 0, { friends: [], friendsPending: 'broken' }))]) {
        const { api } = load({ [key]: raw });
        assert.deepEqual(plain(api.readBank('son').friends), {}); assert.deepEqual(plain(api.readBank('son').friendsPending), {});
    }
    for (const bad of [-1, 1.5, '3', null, Number.MAX_SAFE_INTEGER + 1]) {
        const { api } = load({ [key]: JSON.stringify(bank(0, 0, { friends: { [friendA]: bad, invalid: 10 }, friendsPending: { [friendA]: bad } })) });
        assert.deepEqual(plain(api.readBank('son').friends), { [friendA]: 0 });
        assert.deepEqual(plain(api.readBank('son').friendsPending), { [friendA]: 0 });
    }
    const cloud = notion(bank(300, 0, { friends: { [friendA]: 5 }, friendsPending: { [friendA]: 99 } }));
    const { api } = load({}, cloud); await api.pull('son');
    assert.equal(api.readBank('son').friends[friendA], 5); assert.equal(patches(cloud).length, 0);
});

test('DOM 없이 로드하고 사다리·모든 경계·기본 네 항목·읽기 전용을 보장한다', () => {
    const { api, sandbox } = load();
    assert.equal(sandbox.document, undefined);
    for (const child of ['son', 'daughter']) {
        assert.equal(api.unlockedOf(child, 0).length, 4);
        for (const item of api.LADDERS[child].filter(i => i.at)) {
            assert.ok(!api.unlockedOf(child, item.at - 1).includes(item.id));
            assert.ok(api.unlockedOf(child, item.at).includes(item.id));
        }
        assert.ok(Object.isFrozen(api.LADDERS[child]));
        assert.ok(api.LADDERS[child].every(Object.isFrozen));
    }
    assert.ok(['neon_trail', 'night_city', 'crown'].every(id => api.unlockedOf('son', 250).includes(id)));
});

test('다음 선물·마지막 선물·한 판 여러 해금을 계산한다', () => {
    const { api } = load();
    assert.equal(api.nextGoal('son', 312).remaining, 138);
    assert.equal(api.nextGoal('son', 2500), null);
    assert.equal(api.nextGoal('daughter', 3500), null);
    assert.deepEqual(plain(api.newlyUnlocked('son', 230, 260)).map(i => i.id), ['crown']);
    assert.deepEqual(plain(api.newlyUnlocked('daughter', 50, 400)).map(i => i.id), ['sparkle_trail', 'flower_field', 'ribbon']);
});

test('잘못된 학생·입력과 안전 정수 초과는 쓰기·요청 없이 거부한다', async () => {
    const { api, cloud } = load();
    for (const child of ['parent', '', 'toString', '__proto__', null]) {
        assert.equal(api.readBank(child), null);
        assert.deepEqual(plain(api.unlockedOf(child, 100)), []);
        assert.equal(api.nextGoal(child, 0), null);
        assert.deepEqual(plain(api.newlyUnlocked(child, 0, 100)), []);
        assert.equal(api.addStars(child, 1), false);
        assert.equal(api.setLoadout(child, 'stage', 'neon_grid'), false);
        assert.equal(api.markQuestBoost(child), false);
        assert.equal(api.hasBoostToday(child), false);
        assert.equal(await api.flush(child), false); assert.equal(await api.pull(child), false);
    }
    for (const n of [-1, .5, '2', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(api.addStars('son', n), false);
    assert.equal(cloud.calls.length, 0);
    const full = load({ [key]: JSON.stringify(bank(Number.MAX_SAFE_INTEGER)) });
    assert.equal(full.api.addStars('son', 1), false);
});

test('깨진 JSON·모르는/잠긴 장착·저장소 접근 실패를 기본값으로 처리한다', () => {
    for (const raw of ['{', 'null', '[]', JSON.stringify(bank(0, 0, { loadout: { stage: 'night_city', hat: 'crown', star: 'unknown' } }))]) {
        const { api } = load({ [key]: raw });
        assert.deepEqual(plain(api.readBank('son').loadout), bank().loadout);
    }
    const { api, storage, cloud } = load();
    storage.getItem = () => { throw new Error('접근 거부'); };
    storage.setItem = () => { throw new Error('저장 거부'); };
    assert.equal(api.readBank('son').total, 0);
    assert.equal(api.addStars('son', 30), false);
    assert.equal(api.markQuestBoost('son'), false);
    assert.equal(cloud.calls.length, 0);
});

test('별 52개는 total·pending에 더하고 노션 300+52만 PATCH한다', async () => {
    const { api, cloud } = load({ [key]: JSON.stringify(bank(300)) });
    const result = api.addStars('son', 52);
    assert.equal(result.total, 352); assert.equal(result.pending, 52);
    await api.flush('son');
    assert.equal(cloud.value.total, 352); assert.equal(api.readBank('son').pending, 0);
    for (const call of patches(cloud)) {
        assert.deepEqual(Object.keys(call.body.properties), ['런너기록']);
        const payload = JSON.parse(call.body.properties['런너기록'].rich_text[0].text.content);
        assert.equal('pending' in payload, false);
    }
    assert.ok(cloud.calls.filter(c => c.method === 'GET').every(c => new URL(c.url).searchParams.get('force') === 'true'));
});

test('두 기기: 오래된 로컬 300에서 50·15개를 차례로 더하면 365개', async () => {
    const cloud = notion(), tablet = load({ [key]: JSON.stringify(bank(300)) }, cloud), phone = load({ [key]: JSON.stringify(bank(300)) }, cloud);
    tablet.api.addStars('son', 50); await tablet.api.flush('son');
    phone.api.addStars('son', 15); await phone.api.flush('son');
    assert.equal(cloud.value.total, 365);
    await tablet.api.pull('son'); await phone.api.pull('son');
    assert.equal(tablet.api.readBank('son').total, 365); assert.equal(phone.api.readBank('son').total, 365);
});

test('두 기기: 오프라인 pending 40·15개는 복구 뒤 순서대로 합쳐 355개', async () => {
    const cloud = notion(), tablet = load({ [key]: JSON.stringify(bank(300)) }, cloud), phone = load({ [key]: JSON.stringify(bank(300)) }, cloud);
    cloud.fail = 'network';
    tablet.api.addStars('son', 40); phone.api.addStars('son', 15);
    await tablet.api.flush('son'); await phone.api.flush('son');
    assert.equal(tablet.api.readBank('son').pending, 40); assert.equal(phone.api.readBank('son').pending, 15);
    cloud.fail = null;
    await tablet.api.pull('son'); await phone.api.pull('son');
    assert.equal(cloud.value.total, 355);
    await tablet.api.pull('son'); await phone.api.pull('son');
    assert.equal(tablet.api.readBank('son').total, 355); assert.equal(phone.api.readBank('son').total, 355);
});

test('GET/PATCH 500·네트워크 실패는 pending을 유지하고 다음 저장에서 한 번만 합산한다', async () => {
    for (const failure of ['500', 'PATCH', 'network']) {
        const { api, cloud } = load({ [key]: JSON.stringify(bank(352, 52)) });
        cloud.fail = failure; assert.equal(await api.flush('son'), false);
        assert.equal(api.readBank('son').pending, 52);
        cloud.fail = null; assert.equal(await api.flush('son'), true);
        assert.equal(cloud.value.total, 352); assert.equal(api.readBank('son').pending, 0);
        await api.flush('son'); assert.equal(cloud.value.total, 352);
    }
});

test('속성이 없거나 number 등 rich_text가 아니면 PATCH 0건·로컬 유지', async () => {
    for (const propertyType of ['missing', 'number', 'formula', 'title']) {
        const { api, cloud, storage } = load({ [key]: JSON.stringify(bank(352, 52)) });
        cloud.propertyType = propertyType;
        const original = storage.getItem(key);
        assert.equal(await api.pull('son'), false); assert.equal(await api.flush('son'), false);
        assert.equal(patches(cloud).length, 0); assert.equal(storage.getItem(key), original);
    }
});

test('빈 rich_text는 새 저금통, 잘못된 JSON은 덮어쓰지 않는다', async () => {
    const empty = load({ [key]: JSON.stringify(bank(52, 52)) }); empty.cloud.rawText = '';
    assert.equal(await empty.api.flush('son'), true); assert.equal(empty.cloud.value.total, 52);
    for (const raw of ['{', 'null', '{"v":1,"total":-5}']) {
        const { api, cloud } = load({ [key]: JSON.stringify(bank(352, 52)) }); cloud.rawText = raw;
        assert.equal(await api.flush('son'), false); assert.equal(patches(cloud).length, 0);
        assert.equal(api.readBank('son').pending, 52);
    }
});

test('겹친 flush·pull은 직렬화하고 별을 중복 합산하지 않는다', async () => {
    const { api, cloud } = load({ [key]: JSON.stringify(bank(352, 52)) });
    await Promise.all([api.flush('son'), api.flush('son'), api.pull('son')]);
    assert.equal(cloud.value.total, 352); assert.equal(api.readBank('son').total, 352);
    assert.equal(api.readBank('son').pending, 0); assert.equal(cloud.peak, 1);
});

test('PATCH 진행 중 번 별과 꾸미기·자석 변경을 보존한다', async () => {
    const { api, cloud } = load({ [key]: JSON.stringify(bank(352, 52)) });
    let changed = false;
    cloud.beforePatch = () => {
        if (changed) return; changed = true;
        api.addStars('son', 15); api.setLoadout('son', 'hat', 'crown'); api.markQuestBoost('son');
    };
    await api.flush('son');
    assert.equal(cloud.value.total, 367); assert.equal(cloud.value.loadout.hat, 'crown');
    assert.equal(api.readBank('son').pending, 0); assert.ok(api.hasBoostToday('son'));
});

test('pull은 클라우드 total+pending·최신 꾸미기·늦은 자석 날짜를 합친다', async () => {
    const { api, cloud } = load({ [key]: JSON.stringify(bank(350, 50, { boostDate: '2026-10-31' })) });
    cloud.value = bank(400, 0, { updatedAt: 200, boostDate: '2026-10-30', loadout: { ...bank().loadout, hat: 'crown' } });
    await api.pull('son');
    assert.equal(api.readBank('son').total, 450); assert.equal(cloud.value.total, 450);
    assert.equal(api.readBank('son').loadout.hat, 'crown'); assert.equal(cloud.value.boostDate, '2026-10-31');
});

test('꾸미기 해금 검증·1초 디바운스·최신 로컬 우선', async () => {
    const { api, cloud, timers } = load({ [key]: JSON.stringify(bank(300)) });
    assert.equal(api.setLoadout('son', 'stage', 'space_station'), false);
    assert.equal(api.setLoadout('son', 'hat', 'unknown'), false);
    assert.ok(api.setLoadout('son', 'stage', 'night_city'));
    assert.ok(api.setLoadout('son', 'hat', 'crown'));
    assert.equal(timers.size, 1); assert.equal([...timers.values()][0].ms, 1000);
    assert.equal(cloud.calls.length, 0);
    [...timers.values()][0].fn(); await api.flush('son');
    assert.equal(cloud.value.loadout.stage, 'night_city'); assert.equal(cloud.value.loadout.hat, 'crown');
});

test('부모 모드는 모든 저금통 API를 읽기·쓰기·fetch 없이 막는다', async () => {
    for (const name of ['아빠', '엄마']) {
        const { api, storage, cloud } = load({ currentUserName: name, [key]: JSON.stringify(bank(352, 52)) });
        const before = [...storage.data.entries()]; let bankReads = 0;
        const get = storage.getItem; storage.getItem = k => { if (k.startsWith('galleryRunnerBank_')) bankReads++; return get(k); };
        assert.equal(api.readBank('son').total, 0);
        assert.equal(api.addStars('son', 15), false); assert.equal(api.setLoadout('son', 'stage', 'neon_grid'), false);
        assert.equal(api.markQuestBoost('son'), false); assert.equal(api.hasBoostToday('son'), false);
        await api.pull('son'); await api.flush('son');
        assert.equal(bankReads, 0); assert.equal(cloud.calls.length, 0); assert.deepEqual([...storage.data.entries()], before);
    }
});

test('퀘스트 자석은 별 수 그대로 기기 간 공유하고 클라우드의 더 늦은 날짜를 보존한다', async () => {
    const cloud = notion(), tablet = load({ [key]: JSON.stringify(bank(300)) }, cloud), phone = load({}, cloud);
    assert.equal(tablet.api.markQuestBoost('son'), true); await tablet.api.flush('son');
    assert.equal(cloud.value.total, 300); assert.ok(cloud.value.boostDate);
    await phone.api.pull('son'); assert.equal(phone.api.hasBoostToday('son'), true);
    cloud.value.boostDate = '2099-01-01';
    tablet.api.markQuestBoost('son'); await tablet.api.flush('son');
    assert.equal(cloud.value.boostDate, '2099-01-01');
    assert.equal(tablet.api.hasBoostToday('son'), false);
});

test('날짜는 UTC가 아닌 로컬 자정 직전·직후의 년월일을 쓴다', async () => {
    for (const [day, hour, expected] of [[31, 23, '2026-10-31'], [1, 0, '2026-11-01']]) {
        const { api, sandbox, cloud } = load();
        sandbox.Date = class extends Date {
            constructor() { super('2026-10-31T15:00:00Z'); }
            getFullYear() { return 2026; } getMonth() { return day === 31 ? 9 : 10; }
            getDate() { return day; } getHours() { return hour; }
        };
        assert.ok(api.markQuestBoost('son')); await api.flush('son');
        assert.equal(cloud.value.boostDate, expected); assert.ok(api.hasBoostToday('son'));
        sandbox.Date = class extends sandbox.Date { getDate() { return day + 1; } };
        assert.equal(api.hasBoostToday('son'), false);
    }
});

test('페이지 ID 캐시가 없으면 이름으로 조회·캐시하며 APP_CONFIG를 사용한다', async () => {
    const { api, sandbox, storage, cloud } = load();
    storage.data.delete('MINMIN_INVENTORY_PAGE_ID_민수');
    sandbox.APP_CONFIG = { WORKER_PROXY_URL: 'https://mock.invalid', INVENTORY_DB_ID: 'mock-db' };
    await api.pull('son');
    assert.deepEqual(cloud.calls[0].body, { filter: { property: '이름', title: { equals: '민수' } } });
    assert.equal(cloud.calls[0].url, 'https://mock.invalid/v1/databases/mock-db/query');
    assert.equal(storage.getItem('MINMIN_INVENTORY_PAGE_ID_민수'), 'son-page');
});

test('민서 저장 키·장착·별은 민수 기록과 분리한다', async () => {
    const { api, storage } = load({ [key]: JSON.stringify(bank(300)) });
    const before = storage.getItem(key);
    const result = api.addStars('daughter', 60);
    assert.equal(result.total, 60); assert.equal(result.pending, 60);
    assert.equal(result.loadout.stage, 'cloud_field'); assert.equal(result.loadout.star, 'star');
    assert.ok(api.setLoadout('daughter', 'trail', 'sparkle_trail'));
    await api.flush('daughter'); assert.equal(storage.getItem(key), before);
});

test('HTML 로드 순서와 퀘스트 완주 연결을 유지한다', () => {
    for (const [html, after] of [['kids/common_space/gallery.html', 'gallery-mini-runner.js'], ['quest_runner.html', 'quest-runner.js']]) {
        const text = readFileSync(new URL(`../${html}`, import.meta.url), 'utf8');
        assert.ok(text.indexOf('gallery-runner-rewards.js') < text.indexOf(after));
    }
    const source = readFileSync(new URL('../kids/subjects/quest/quest-runner.js', import.meta.url), 'utf8');
    assert.equal((source.match(/GalleryRunnerRewards\?\.markQuestBoost/g) || []).length, 2);
    // 완주 함수 자체를 모의 UI에서 실행해 보상 화면·기존 보상 경로가 계속 진행되는지 확인한다.
    const begin = source.indexOf('  async function showClearModal()');
    const end = source.indexOf('\n  function ', begin + 1);
    assert.ok(begin >= 0 && end > begin);
    const order = [], context = { global: { GalleryRunnerRewards: { markQuestBoost: child => order.push(child) } },
        masteryRound: null, playSound() {}, syncCheerMonsterReaction() {}, fairyReward() {}, isMinseo: true,
        UI: { skinClearModalForMinseo() {}, showModal() { order.push('화면'); } }, currentSubj: 'math', KOREAN_SUBJ_MAP: { math: '수학' },
        grantRewardAndShowUI: async () => order.push('기존 보상'), console };
    vm.createContext(context);
    return vm.runInContext(`${source.slice(begin, end)}\nshowClearModal()`, context).then(() => {
        assert.deepEqual(order.slice(0, 3), ['daughter', '화면', '기존 보상']);
    });
});

test('최신 full·한입 레슨의 실제 완료 이벤트도 자석을 한 번 켠다', async () => {
    const source = readFileSync(new URL('../kids/subjects/quest/quest-runner.js', import.meta.url), 'utf8');
    const hook = source.split('\n').find(line => line.includes("global.addEventListener('quest-lesson-complete'"));
    const { api, cloud } = load();
    for (const isMinseo of [false, true]) {
        const listeners = new Map(), calls = [];
        const global = { addEventListener: (name, fn) => listeners.set(name, fn),
            GalleryRunnerRewards: { markQuestBoost: child => { calls.push(child); return api.markQuestBoost(child); } } };
        vm.runInNewContext(hook, { global, isMinseo });
        listeners.get('quest-lesson-complete')();
        assert.deepEqual(calls, [isMinseo ? 'daughter' : 'son']);
        await api.flush(calls[0]); assert.ok(cloud.value.boostDate);
    }
});

// 레이아웃·그림 육안 검사를 대체하지 않는 DOM 기능 모의다.
function attachDom(sandbox) {
    class Element {
        constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.style = {}; this._text = ''; }
        set textContent(value) { this._text = String(value); this.children = []; }
        get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
        setAttribute(k, v) { this.attributes[k] = String(v); }
        getAttribute(k) { return this.attributes[k] ?? null; }
        appendChild(e) { this.children.push(e); return e; }
        replaceChildren() { this.children = []; this._text = ''; }
        insertBefore(e, before) { const i = this.children.indexOf(before); this.children.splice(i < 0 ? this.children.length : i, 0, e); }
        querySelectorAll(selector) {
            const all = this.children.flatMap(c => [c, ...c.querySelectorAll('*')]);
            if (selector === '*') return all;
            return all.filter(c => selector === c.tag || selector === `.${c.className}` ||
                selector === `[role=${c.attributes.role}]`);
        }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        focus() { sandbox.document.activeElement = this; }
    }
    const head = new Element('head'), body = new Element('body');
    sandbox.document = { head, body, createElement: tag => new Element(tag),
        getElementById: id => head.querySelectorAll('*').find(e => e.id === id) || null };
    const message = new Element('div');
    return { Element, session: { message, child:'son', viewer:'son', redraw() {} } };
}

test('꾸미기 DOM: 네 분류·잠김 안내·선택 표시·돌아가기·즉시 장착을 연결한다', () => {
    const { api, sandbox, cloud } = load({ [key]: JSON.stringify(bank(260)) });
    const { session } = attachDom(sandbox);
    let back = 0, redraw = 0; session.redraw = () => redraw++;
    api.openWardrobe(session, { child:'son', viewer:'son', onBack:() => back++ });
    assert.equal(session.message.querySelectorAll('h3').length, 4);
    const locked = session.message.querySelectorAll('button').find(b => b.textContent.includes('용암 동굴'));
    assert.ok(!locked.disabled); locked.onclick();
    assert.match(session.message.querySelector('[role=status]').textContent, /1640개 더 모으면/);
    const crown = session.message.querySelectorAll('button').find(b => b.textContent === '👑 왕관');
    crown.onclick(); assert.equal(crown.getAttribute('aria-pressed'), 'true');
    assert.equal(api.readBank('son').loadout.hat, 'crown'); assert.equal(redraw, 1);
    session.message.querySelectorAll('button').find(b => b.textContent === '돌아가기').onclick();
    assert.equal(back, 1); assert.equal(cloud.calls.length, 0);
});

test('부모 꾸미기는 모든 선물이 열리고 장착을 세션에만 저장한다', () => {
    const { api, sandbox, storage, cloud } = load({ currentUserName:'아빠', [key]: JSON.stringify(bank(0)) });
    const { session } = attachDom(sandbox), before = [...storage.data.entries()];
    let reads = 0; const get = storage.getItem;
    storage.getItem = k => { if (k.startsWith('galleryRunnerBank_')) reads++; return get(k); };
    api.openWardrobe(session, { child:'son', viewer:'parent', onBack() {} });
    assert.ok(session.message.querySelectorAll('button').every(b => !b.textContent.includes('🔒')));
    session.message.querySelectorAll('button').find(b => b.textContent === '🌋 용암 동굴').onclick();
    assert.equal(session.previewLoadout.stage, 'lava_cave');
    api.openWardrobe(session, { child:'son', viewer:'parent', onBack() {} });
    assert.equal(session.message.querySelectorAll('button').find(b => b.textContent === '🌋 용암 동굴').getAttribute('aria-pressed'), 'true');
    assert.equal(reads, 0); assert.equal(cloud.calls.length, 0); assert.deepEqual([...storage.data.entries()], before);
});

test('완주 DOM: 진행 바·새 선물·마지막 선물 이후 표시를 구분한다', () => {
    const { api, sandbox } = load(), { session } = attachDom(sandbox);
    for (const [total, gifts, progress] of [[260, api.newlyUnlocked('son', 230, 260), true], [305, [], true], [4005, [], false]]) {
        session.message.replaceChildren();
        api.appendBankSummary(session, 'son', total, gifts);
        const bar = session.message.querySelector('progress');
        assert.equal(Boolean(bar), progress);
        if (bar) { assert.equal(bar.value, total); assert.ok(bar.max > total); assert.ok(bar.getAttribute('aria-label')); }
        assert.equal(session.message.textContent.includes('🎁 새 선물'), gifts.length > 0);
        assert.ok(session.message.textContent.includes(`별 저금통 ⭐ ${total}개`));
    }
});

test('실제 finish·꾸미기·돌아가기 경로는 별을 한 번만 적립하고 완주 TTS도 한 번만 읽는다', async () => {
    const { api, sandbox, cloud } = load({ [key]: JSON.stringify(bank(230, 0, { friends: { [friendA]: 7 } })) },
        notion(bank(300, 0, { friends: { [friendA]: 7 } })));
    const { session, Element } = attachDom(sandbox);
    vm.runInContext(readFileSync(new URL('../kids/subjects/quest/monster_roster.js', import.meta.url), 'utf8'), sandbox);
    const runner = readFileSync(new URL('../kids/common_space/gallery-mini-runner.js', import.meta.url), 'utf8');
    vm.runInContext(runner.replace('window.GalleryMiniRunner =', 'window.testFinish = finish; window.GalleryMiniRunner ='), sandbox);
    const spoken = []; sandbox.speakFairyTTS = text => spoken.push(text);
    session.pause = new Element('button'); session.world = { score:30 }; session.gifts = [];
    session.friendKey = friendA; session.name = '테스트 용';
    sandbox.testFinish(session);
    assert.equal(api.readBank('son').total, 260); assert.equal(api.readBank('son').pending, 30);
    assert.match(session.message.textContent, /새 선물: 👑 왕관/);
    assert.equal(spoken.length, 1); assert.match(spoken[0], /새 선물!.*왕관/);
    assert.equal(api.friendshipOf('son', friendA).runs, 8);
    assert.match(session.message.textContent, /💖 테스트 용과 더 친해졌어요! Lv3 단짝/);
    assert.match(spoken[0], /💖 테스트 용과 더 친해졌어요! Lv3 단짝/);
    assert.match(session.message.querySelector('.grr-summary').children[1].textContent, /더 친해졌어요/);
    session.message.querySelectorAll('button').find(b => b.textContent === '🎨 꾸미기').onclick();
    session.message.querySelectorAll('button').find(b => b.textContent === '돌아가기').onclick();
    assert.equal(api.readBank('son').total, 260); assert.equal(spoken.length, 1);
    assert.equal(api.friendshipOf('son', friendA).runs, 8);
    await api.flush('son'); assert.equal(cloud.value.total, 330);
    assert.equal(cloud.value.friends[friendA], 8); assert.equal(patches(cloud).length, 1);
});

test('모든 선물 그리기 함수는 DOM·저장소 없이 주어진 좌표만 그린다', () => {
    const { api, sandbox, storage } = load();
    storage.getItem = storage.setItem = () => { throw new Error('그리기 중 저장소 접근'); };
    delete sandbox.document;
    let operations = 0;
    const ctx = new Proxy({}, { get: (target, k) => target[k] || (() => operations++), set: (target, k, v) => { target[k] = v; return true; } });
    for (const child of ['son', 'daughter']) for (const gift of api.LADDERS[child]) {
        if (gift.kind === 'stage') api.drawStage(ctx, { width:.55, distance:4 }, gift.id);
        if (gift.kind === 'trail') api.drawTrail(ctx, [{ x:.1, y:.4 }, { x:.11, y:.4 }], gift.id);
        if (gift.kind === 'hat') api.drawHat(ctx, { h:.18 }, gift.id);
        if (gift.kind === 'star') api.drawStar(ctx, { w:.045, h:.045, y:.4 }, .5, gift.id);
    }
    assert.ok(operations > 100);
});

test('작품 창은 고른 캐릭터별 단계·최고 단계 문구를 표시하고 부모에게 숨긴다 (§7-4)', () => {
    const { sandbox, cloud } = load({ [key]: JSON.stringify(bank(0, 0, { friends: { [friendA]:8, [friendB]:25 } })) });
    const { Element } = attachDom(sandbox), host = new Element('div');
    sandbox.document.body.appendChild(host);
    const get = sandbox.document.getElementById;
    sandbox.document.getElementById = id => id === 'modalCharacterActions' ? host : get(id);
    sandbox.document.createTextNode = text => { const e = new Element('text'); e.textContent = text; return e; };
    vm.runInContext(readFileSync(new URL('../kids/subjects/quest/monster_roster.js', import.meta.url), 'utf8'), sandbox);
    vm.runInContext(readFileSync(new URL('../kids/common_space/gallery-mini-runner.js', import.meta.url), 'utf8'), sandbox);
    const spriteUrl = './test.png';
    const item = { id:'art_test', characters:[{ key:'main', name:'용', spriteUrl }, { key:'second', name:'새', spriteUrl }] };
    const bind = selectedKey => sandbox.GalleryMiniRunner.bindModal(item, { viewer:'son', selectedKey });
    bind('main'); assert.match(host.textContent, /💖 친밀도 Lv3 단짝 · 다음 단계까지 7판/);
    bind('second'); assert.match(host.textContent, /💖 친밀도 Lv5 영혼의 단짝/); assert.ok(!host.textContent.includes('다음 단계까지'));
    sandbox.GalleryMiniRunner.bindModal(item, { viewer:'parent' }); assert.ok(!host.textContent.includes('친밀도'));
    assert.equal(cloud.calls.length, 0);
});

test('부모 완주는 친밀도·별 저장과 친밀도 안내가 없고 중간 닫기도 적립하지 않는다 (§7-4)', () => {
    const { sandbox, storage, cloud } = load(), { session, Element } = attachDom(sandbox);
    vm.runInContext(readFileSync(new URL('../kids/subjects/quest/monster_roster.js', import.meta.url), 'utf8'), sandbox);
    const runner = readFileSync(new URL('../kids/common_space/gallery-mini-runner.js', import.meta.url), 'utf8');
    vm.runInContext(runner.replace('window.GalleryMiniRunner =',
        'window.testFinish = finish; window.testSetActive = session => { active = session; }; window.GalleryMiniRunner ='), sandbox);
    const before = [...storage.data.entries()];
    session.pause = new Element('button'); session.world = { score:30 }; session.viewer = 'parent'; session.friendKey = friendA;
    sandbox.testFinish(session); assert.ok(!session.message.textContent.includes('💖'));
    assert.deepEqual([...storage.data.entries()], before); assert.equal(cloud.calls.length, 0);
    session.viewer = 'son'; session.world.status = 'running'; session.listeners = []; session.image = { removeAttribute() {} };
    session.root = { remove() {} }; sandbox.testSetActive(session); sandbox.GalleryMiniRunner.close();
    assert.deepEqual([...storage.data.entries()], before); assert.equal(cloud.calls.length, 0);
});
