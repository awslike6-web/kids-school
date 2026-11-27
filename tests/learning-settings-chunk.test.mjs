// 학습설정(INVENTORY_DB rich_text) 1,900자 나눔 함수 단위 시험·4곳 통합 시험·지키기 시험
// 명세: docs/learning_settings_chunk_spec.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { expandFairyChain } from './fairy-chain-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const CATALOG_REL = 'kids/core/fairy-settings-catalog.js';
const WRITER_FILES = [
    'kids/core/fairy-settings-engine.js',
    'kids/core/quiz-flow-controller.js',
    'kids/subjects/haru/js/haru-checkin-engine.js',
    'kids/subjects/quest/parent_progress_controller.js'
];

// 외톨이 서로게이트(상위 서로게이트만 있거나 하위 서로게이트만 있는 깨진 UTF-16) 검사
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function createChunkSandbox({ userName = '민수', child = 'minsu', user = 'son', extraStore = {} } = {}) {
    const store = new Map(Object.entries({
        currentUserName: userName,
        currentChild: child,
        currentUser: user,
        MINMIN_INVENTORY_PAGE_ID_민수: 'page_minsu',
        MINMIN_INVENTORY_PAGE_ID_민서: 'page_minseo',
        ...extraStore
    }));
    const calls = [];
    const warnings = [];
    const sandbox = {
        console: {
            log() {},
            info() {},
            warn: (...args) => warnings.push(args.join(' ')),
            error() {}
        },
        setTimeout,
        clearTimeout,
        Date,
        Math,
        JSON,
        URLSearchParams,
        MutationObserver: class { observe() {} disconnect() {} },
        alert() {},
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => { store.set(k, String(v)); },
            removeItem: (k) => { store.delete(k); }
        },
        location: { search: `?user=${child}`, pathname: '/lobby.html', href: 'https://school.test/lobby.html' },
        document: {
            readyState: 'complete',
            addEventListener() {},
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] }),
            head: { appendChild() {} },
            body: { appendChild() {}, classList: { add() {}, remove() {} } }
        },
        fetch: async (url, options = {}) => {
            const body = options.body ? JSON.parse(options.body) : {};
            calls.push({ url, method: options.method || 'GET', body, keepalive: options.keepalive });
            return { ok: true, status: 200, json: async () => ({ id: 'page_ok', results: [{ id: 'page_ok' }] }) };
        }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(read(CATALOG_REL), sandbox, { filename: CATALOG_REL });
    return { sandbox, store, calls, warnings };
}

test('① 단위 시험: 1,900자 경계(1,899·1,900·1,901자), 4,000자 이상, 빈 글, 이어 붙이면 원문', () => {
    const { sandbox } = createChunkSandbox();
    const chunk = sandbox.chunkLearningSettingsRichText;
    assert.equal(typeof chunk, 'function');

    // 1) 빈 글
    for (const empty of ['', null, undefined]) {
        const res = chunk(empty);
        assert.deepEqual(JSON.parse(JSON.stringify(res)), [{ text: { content: '' } }]);
        assert.equal(res.map((p) => p.text.content).join(''), '');
    }

    // 2) 1,899자 경계 → 1조각
    const s1899 = 'a'.repeat(1899);
    const c1899 = chunk(s1899);
    assert.equal(c1899.length, 1);
    assert.equal(c1899[0].text.content.length, 1899);
    assert.equal(c1899.map((p) => p.text.content).join(''), s1899);

    // 3) 정확히 1,900자 → 1조각, 1,901자 → 2조각(1900 + 1)
    const s1900 = 'b'.repeat(1900);
    const c1900 = chunk(s1900);
    assert.equal(c1900.length, 1);
    assert.equal(c1900[0].text.content.length, 1900);
    assert.equal(c1900.map((p) => p.text.content).join(''), s1900);

    const s1901 = 'c'.repeat(1900) + 'Z';
    const c1901 = chunk(s1901);
    assert.equal(c1901.length, 2);
    assert.equal(c1901[0].text.content.length, 1900);
    assert.equal(c1901[1].text.content, 'Z');
    assert.equal(c1901.map((p) => p.text.content).join(''), s1901);

    // 4) 4,000자 이상 (4,500자 JSON 문자열) → 3조각(1900 + 1900 + 700)
    const s4500 = JSON.stringify({ pad: '가'.repeat(4480) });
    assert.ok(s4500.length >= 4000);
    const c4500 = chunk(s4500);
    assert.equal(c4500.length, 3);
    for (const part of c4500) {
        assert.ok(part.text.content.length <= 1900, `조각 길이 초과: ${part.text.content.length}`);
    }
    assert.equal(c4500.map((p) => p.text.content).join(''), s4500);
    assert.deepEqual(JSON.parse(c4500.map((p) => p.text.content).join('')), JSON.parse(s4500));
});

test('② 단위 시험: 조각 경계(1,899자 뒤)에 걸친 이모지(서로게이트 쌍)를 반으로 쪼개지 않는다', () => {
    const { sandbox } = createChunkSandbox();
    const chunk = sandbox.chunkLearningSettingsRichText;

    // 1,899자 뒤에 UTF-16 길이 2인 이모지 '🚀'가 오면 1899 + 2 = 1901 > 1900이므로
    // 첫 조각은 1,899자에서 멈추고 둘째 조각이 '🚀'로 시작해야 한다.
    const boundaryEmoji = 'x'.repeat(1899) + '🚀' + 'y'.repeat(50);
    const parts = chunk(boundaryEmoji);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].text.content.length, 1899);
    assert.ok(parts[1].text.content.startsWith('🚀'));
    for (const p of parts) {
        assert.ok(!LONE_SURROGATE_RE.test(p.text.content), '외톨이 서로게이트가 발생했습니다');
        assert.ok(p.text.content.length <= 1900);
    }
    assert.equal(parts.map((p) => p.text.content).join(''), boundaryEmoji);

    // 이모지 1,000개 연속 (UTF-16 길이 2,000) → 950개(1,900 유닛) + 50개(100 유닛)
    const allEmojis = '🧸'.repeat(1000);
    const emojiParts = chunk(allEmojis);
    assert.equal(emojiParts.length, 2);
    assert.equal(emojiParts[0].text.content.length, 1900);
    assert.equal(emojiParts[1].text.content.length, 100);
    for (const p of emojiParts) {
        assert.ok(!LONE_SURROGATE_RE.test(p.text.content));
    }
    assert.equal(emojiParts.map((p) => p.text.content).join(''), allEmojis);
});

test('③ 단위 시험: 노션 배열 한도(100조각) 이하만 허용하고, 100조각을 넘으면 자르지 않고 경고 후 null을 돌려준다', () => {
    const { sandbox, warnings } = createChunkSandbox();
    const chunk = sandbox.chunkLearningSettingsRichText;

    // 정확히 100조각 (190,000자) → 정상 반환
    const exact100 = 'm'.repeat(1900 * 100);
    const res100 = chunk(exact100);
    assert.ok(Array.isArray(res100));
    assert.equal(res100.length, 100);
    assert.equal(res100.map((p) => p.text.content).join(''), exact100);

    // 101조각 (190,001자) → null 반환 + 경고
    const over100 = 'm'.repeat(1900 * 100 + 1);
    const resOver = chunk(over100);
    assert.equal(resOver, null);
    assert.ok(warnings.some((w) => w.includes('100개') && w.includes('로컬만 저장됨')));
});

test('④ 통합 시험: 쓰는 곳 4곳 모두 2,500자 이상 설정을 여러 조각으로 나눠 PATCH하고 읽는 곳과 왕복 일치한다', async () => {
    const largeCloud = JSON.stringify({
        questSettings: {
            minsu: { units: Array.from({ length: 60 }, (_, i) => `5-2 과학 ${i + 1}단원 심화 탐구 및 실험관찰 정리 🚀`) },
            minseo: { units: Array.from({ length: 60 }, (_, i) => `1-2 국어 ${i + 1}단원 받아쓰기 및 미니 독해 🌱`) }
        }
    });
    assert.ok(largeCloud.length >= 2500, `초기 설정 길이: ${largeCloud.length}`);

    // 1) fairy-settings-engine.js
    {
        const { sandbox, calls } = createChunkSandbox({
            extraStore: { MINMIN_CLOUD_SETTINGS_민수: largeCloud }
        });
        vm.runInContext(read('kids/core/fairy-settings-engine.js'), sandbox);
        await sandbox.SettingsManager.saveToCloud();
        const patches = calls.filter((c) => c.method === 'PATCH');
        assert.equal(patches.length, 1);
        const rt = patches[0].body.properties['학습설정'].rich_text;
        assert.ok(rt.length >= 2, `조각 수 부족: ${rt.length}`);
        rt.forEach((p) => assert.ok(p.text.content.length <= 1900));
        const joined = rt.map((p) => p.text.content).join('');
        const parsed = JSON.parse(joined);
        assert.equal(parsed.questSettings.minsu.units.length, 60);
        assert.equal(typeof parsed.appSettings, 'object');

        // 읽는 곳 왕복 확인 (plain_text 없는 text.content 조각 배열도 이어 붙여 읽음)
        sandbox.SettingsManager.set('voice_persona', 'tease_minsu');
        const patchAfterSet = calls.filter((c) => c.method === 'PATCH').pop();
        const rtAfterSet = patchAfterSet.body.properties['학습설정'].rich_text;
        assert.ok(rtAfterSet.length >= 2);
        sandbox.localStorage.setItem('MINMIN_APP_SETTINGS_son', JSON.stringify({ voice_persona: 'default' }));
        sandbox.SettingsManager.syncFromCloud({ rich_text: rtAfterSet });
        assert.equal(sandbox.SettingsManager.get('voice_persona'), 'tease_minsu');
    }

    // 2) quiz-flow-controller.js (keepalive 64KiB 방어 및 읽는 곳 왕복 포함)
    {
        const { sandbox, calls } = createChunkSandbox({
            extraStore: { MINMIN_CLOUD_SETTINGS_민수: largeCloud }
        });
        vm.runInContext(read('kids/core/quiz-flow-controller.js'), sandbox);
        sandbox.localStorage.setItem('kids_quiz_flow_mode_민수_과학', 'speed'); // 2026-11-24부터 템포 키는 아이별
        await sandbox.saveQuizFlowToCloud();
        const patches = calls.filter((c) => c.method === 'PATCH');
        assert.equal(patches.length, 1);
        assert.equal(patches[0].keepalive, true);
        const rt = patches[0].body.properties['학습설정'].rich_text;
        assert.ok(rt.length >= 2);
        rt.forEach((p) => assert.ok(p.text.content.length <= 1900));
        const parsed = JSON.parse(rt.map((p) => p.text.content).join(''));
        assert.equal(parsed.quizFlow['과학'], 'speed');

        // 읽는 곳 왕복 확인
        sandbox.localStorage.setItem('kids_quiz_flow_mode_민수_과학', 'review');
        sandbox.syncQuizFlowFromCloud({ rich_text: rt });
        assert.equal(sandbox.getQuizFlowMode('과학'), 'speed');

        // 본문이 20,000자 이상일 때는 keepalive가 false로 꺼져 브라우저 64KiB 제한을 피한다
        sandbox.localStorage.setItem('MINMIN_CLOUD_SETTINGS_민수', JSON.stringify({ huge: '한'.repeat(21000) }));
        await sandbox.saveQuizFlowToCloud();
        assert.equal(calls[calls.length - 1].keepalive, false);
    }

    // 3) haru-checkin-engine.js
    {
        const { sandbox, calls } = createChunkSandbox({
            userName: '민서',
            child: 'minseo',
            user: 'daughter',
            extraStore: { MINMIN_CLOUD_SETTINGS_민서: largeCloud }
        });
        vm.runInContext(read('kids/subjects/haru/js/haru-checkin-engine.js'), sandbox);
        sandbox.setPiggyCoins(7);
        await new Promise((r) => setTimeout(r, 10));
        const patches = calls.filter((c) => c.method === 'PATCH');
        assert.equal(patches.length, 1);
        const rt = patches[0].body.properties['학습설정'].rich_text;
        assert.ok(rt.length >= 2);
        rt.forEach((p) => assert.ok(p.text.content.length <= 1900));
        const parsed = JSON.parse(rt.map((p) => p.text.content).join(''));
        assert.equal(parsed.piggyBank.coins, 7);
    }

    // 4) parent_progress_controller.js
    {
        const { sandbox, calls } = createChunkSandbox({
            extraStore: { MINMIN_CLOUD_SETTINGS_민수: largeCloud }
        });
        vm.runInContext(read('kids/subjects/quest/parent_unit_chips.js'), sandbox);
        vm.runInContext(read('kids/subjects/quest/parent_progress_controller.js'), sandbox);
        sandbox.saveParentProgressSettings();
        await new Promise((r) => setTimeout(r, 10));
        const patches = calls.filter((c) => c.method === 'PATCH');
        assert.equal(patches.length, 1);
        const rt = patches[0].body.properties['학습설정'].rich_text;
        assert.ok(rt.length >= 2);
        rt.forEach((p) => assert.ok(p.text.content.length <= 1900));
        const parsed = JSON.parse(rt.map((p) => p.text.content).join(''));
        assert.equal(typeof parsed.questSettings, 'object');
    }
});

test('⑤ 통합 시험: 100조각 초과 및 함수 미로드 시 4곳 모두 경고를 남기고 노션 PATCH를 보내지 않는다', async () => {
    const overLimitJson = JSON.stringify({ huge: 'x'.repeat(1900 * 100 + 50) });

    const { sandbox, calls, warnings } = createChunkSandbox({
        extraStore: {
            MINMIN_CLOUD_SETTINGS_민수: overLimitJson,
            MINMIN_CLOUD_SETTINGS_민서: overLimitJson
        }
    });
    vm.runInContext(read('kids/core/fairy-settings-engine.js'), sandbox);
    vm.runInContext(read('kids/core/quiz-flow-controller.js'), sandbox);
    vm.runInContext(read('kids/subjects/haru/js/haru-checkin-engine.js'), sandbox);
    vm.runInContext(read('kids/subjects/quest/parent_unit_chips.js'), sandbox);
    vm.runInContext(read('kids/subjects/quest/parent_progress_controller.js'), sandbox);

    await sandbox.SettingsManager.saveToCloud();
    await sandbox.saveQuizFlowToCloud();
    sandbox.setPiggyCoins(5);
    sandbox.saveParentProgressSettings();
    await new Promise((r) => setTimeout(r, 10));

    const patches = calls.filter((c) => c.method === 'PATCH');
    assert.equal(patches.length, 0, '100조각 초과 시 PATCH를 보내면 안 됩니다');
    const overWarnings = warnings.filter((w) => w.includes('100개') && w.includes('로컬만 저장됨'));
    assert.equal(overWarnings.length, 4, '4곳 모두 100조각 초과 경고를 남겨야 합니다');

    // 나눔 함수가 미로드된 상태에서도 ReferenceError 없이 경고 4건을 남기고 PATCH를 보내지 않아야 한다
    warnings.length = 0;
    sandbox.localStorage.setItem('MINMIN_CLOUD_SETTINGS_민수', '{"ok":1}');
    sandbox.localStorage.setItem('MINMIN_CLOUD_SETTINGS_민서', '{"ok":1}');
    sandbox.chunkLearningSettingsRichText = undefined;

    await sandbox.SettingsManager.saveToCloud();
    await sandbox.saveQuizFlowToCloud();
    sandbox.setPiggyCoins(6);
    sandbox.saveParentProgressSettings();
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(calls.filter((c) => c.method === 'PATCH').length, 0);
    const missingFnWarnings = warnings.filter((w) => w.includes('chunkLearningSettingsRichText') && w.includes('로컬만 저장됨'));
    assert.equal(missingFnWarnings.length, 4, '4곳 모두 함수 미로드 경고를 남겨야 합니다');
});

function walkFiles(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'tests', 'scratch', 'uploads'].includes(entry.name) || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkFiles(full, out);
        else if (/\.(html|js)$/.test(entry.name)) out.push(full);
    }
    return out;
}

// 정적 <script src="...파일명..."> 또는 동적 로더 배열 항목 '파일명'(뒤에 쉼표나 ?v= 유무 무관, .includes('...') 비교는 제외) 매칭
function findScriptLoadIndex(src, fileName) {
    const escaped = fileName.replace(/\./g, '\\.');
    const re = new RegExp(`<script[^>]+src=["'][^"']*${escaped}(?:\\?[^"']*)?["']|(?<!includes\\(\\s*)["'](?:[^"']*\\/)?${escaped}(?:\\?[^"']*)?["']`, 'g');
    const m = re.exec(src);
    return m ? m.index : -1;
}

test('⑥ 지키기 시험: kids/ 안에서 학습설정을 한 조각 고정 배열로 쓰지 않고, 쓰는 4곳을 싣는 화면·로더가 모두 catalog를 먼저 싣는다', () => {
    // 따옴표 있는 키("학습설정":), 따옴표 없는 키(학습설정:), 대괄호 접근(['학습설정'] =) 아래의 rich_text 배열 리터럴 모두 차단
    const singleChunkRe = /(?:["']?학습설정["']?|\[["']학습설정["']\])\s*[:=]\s*\{\s*rich_text\s*:\s*\[/;

    for (const file of walkFiles(path.join(ROOT, 'kids'))) {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        const src = fs.readFileSync(file, 'utf8');
        assert.ok(
            !singleChunkRe.test(src),
            `${rel}: "학습설정"에 한 조각 고정 배열(rich_text: [...])을 직접 쓰면 안 됩니다. chunkLearningSettingsRichText()를 쓰세요.`
        );
    }

    // 쓰는 곳 4개 함수 본문 안에서 rich_text 배열 리터럴 우회 생성이 없고 chunkLearningSettingsRichText 결과를 넘기는지 확인
    const writerFnNames = ['saveToCloud', 'saveQuizFlowToCloud', 'syncPiggyCoinsToCloud', 'syncParentProgressToCloud'];
    for (let i = 0; i < WRITER_FILES.length; i++) {
        const writerRel = WRITER_FILES[i];
        const fnName = writerFnNames[i];
        const src = read(writerRel);
        assert.ok(src.includes('chunkLearningSettingsRichText('), `${writerRel}: chunkLearningSettingsRichText 호출 없음`);
        assert.match(src, /["']학습설정["']\s*:\s*\{\s*rich_text\s*:\s*richTextChunks\s*\}/, `${writerRel}: rich_text에 richTextChunks 변수를 넘겨야 합니다`);
        const fnStart = src.indexOf(fnName);
        assert.ok(fnStart >= 0, `${writerRel}: ${fnName} 함수를 찾을 수 없습니다`);
        const fnWindow = src.slice(fnStart, fnStart + 2500);
        assert.ok(!/rich_text\s*:\s*\[/.test(fnWindow), `${writerRel} (${fnName}): 함수 안에서 rich_text 배열 리터럴을 직접 만들면 안 됩니다`);
    }

    // 쓰는 4개 모듈을 로드하는 모든 HTML·로더에서 fairy-settings-catalog.js 선행 로드 확인
    const writerNames = WRITER_FILES.map((f) => path.basename(f));
    // QuizChoices(보기 섞기) 전용으로 quiz-flow-controller.js만 단독 로드하는 2곳만 예외
    const QUIZ_CHOICES_ONLY_ALLOWLIST = new Set([
        'kids/subjects/science/science_season_airmass_lab.html',
        'kids/core/video-unit.js'
    ]);

    const checkedLoaders = [];
    for (const file of walkFiles(ROOT)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        if (rel.startsWith('scripts/data/system_map')) continue;
        const src = expandFairyChain(fs.readFileSync(file, 'utf8')); // 동적 목록의 ...FAIRY_CORE_CHAIN을 이름으로 펼침

        const loadedWriters = writerNames
            .map((name) => ({ name, idx: findScriptLoadIndex(src, name) }))
            .filter((w) => w.idx >= 0 && path.basename(rel) !== w.name);

        if (!loadedWriters.length) continue;
        if (QUIZ_CHOICES_ONLY_ALLOWLIST.has(rel)) {
            assert.deepEqual(loadedWriters.map((w) => w.name), ['quiz-flow-controller.js']);
            continue;
        }

        const catIdx = findScriptLoadIndex(src, 'fairy-settings-catalog.js');
        assert.ok(catIdx >= 0, `${rel}: 학습설정 쓰는 모듈(${loadedWriters.map((w) => w.name).join(', ')})을 싣는데 fairy-settings-catalog.js가 없습니다`);

        for (const w of loadedWriters) {
            // gugudan.html은 정적 quiz-flow-controller.js 뒤 인라인 loadCoreScripts에서 catalog → fairy-settings-engine.js 순으로 로드함
            if (rel === 'kids/subjects/math/gugudan.html' && w.name === 'quiz-flow-controller.js') continue;
            assert.ok(
                catIdx < w.idx,
                `${rel}: fairy-settings-catalog.js(${catIdx})가 ${w.name}(${w.idx})보다 먼저 실려야 합니다`
            );
        }
        checkedLoaders.push(rel);
    }

    assert.ok(checkedLoaders.includes('kids/core/core.js'));
    assert.ok(checkedLoaders.includes('kids/js/lobby_controller.js'));
    assert.ok(checkedLoaders.includes('kids/subjects/haru/haru.html'));
    assert.ok(checkedLoaders.includes('monster_lab.html'));
    assert.ok(checkedLoaders.includes('kids/common_space/family_quiz.html'));
    assert.ok(checkedLoaders.includes('kids/subjects/english/classcard.html'));
});
