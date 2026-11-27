// 5분 퀘스트 「문제 만들기」 분리 계약 (2026-11-28 리팩토링 묶음 D2)
// quest-mastery.js(숙련도·1판 배치·노션 동기화)와 quest-questions.js(문항 생성·한글 받침 분석)로 나눴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const MASTERY = 'kids/subjects/quest/quest-mastery.js';
const QUESTIONS = 'kids/subjects/quest/quest-questions.js';
const MOVED = ['shuffle', 'chunkSentence', 'buildScramble', 'koreanTier', 'misspellingsOf', 'pickBlankToken',
    'usageInDetail', 'buildFillBlank', 'buildQuestion', 'buildMatch', 'isSentenceLike'];

function htmlFiles(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', '.claude', 'scratch'].includes(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) htmlFiles(full, out);
        else if (e.name.endsWith('.html')) out.push(full);
    }
    return out;
}

test('엔진을 <script>로 싣는 화면은 모두 quest-questions.js를 바로 앞에 싣는다', () => {
    const pages = [...fs.readdirSync(root).filter(f => f.endsWith('.html')).map(f => path.join(root, f)), ...htmlFiles(path.join(root, 'kids'))];
    const loaders = [];
    for (const file of pages) {
        const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
        const srcs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => path.basename(m[1].split('?')[0]));
        const at = srcs.indexOf('quest-mastery.js');
        if (at < 0) continue;
        loaders.push(path.relative(root, file));
        assert.equal(srcs[at - 1], 'quest-questions.js', `${path.relative(root, file)}: quest-questions.js가 quest-mastery.js 바로 앞에 없음`);
    }
    assert.ok(loaders.length >= 3, `엔진을 싣는 화면이 ${loaders.length}곳뿐`);
});

test('노드 require로 엔진만 불러도 문제 만들기를 스스로 불러오고, 옮긴 함수는 같은 함수다', () => {
    const QM = require(path.join(root, MASTERY));
    const QQ = require(path.join(root, QUESTIONS));
    // 엔진이 예전부터 바깥에 내놓던 이름은 그대로 (shuffle·isSentenceLike는 원래 안쪽 전용)
    for (const name of MOVED.filter(n => !['shuffle', 'isSentenceLike'].includes(n))) assert.equal(QM[name], QQ[name], name);
    assert.deepEqual(QM.misspellingsOf('앉다'), ['안다', '앚다']);
});

test('브라우저에서 순서가 틀려도 엔진은 멈추지 않고 문제 만들기 파일을 끼워 넣는다 (나중에 실리면 동작)', () => {
    const appended = [];
    const warns = [];
    const doc = {
        getElementsByTagName: () => [{ src: 'https://school.test/kids/subjects/quest/quest-mastery.js?v=abcd1234' }],
        createElement: () => ({}),
        head: { appendChild: el => appended.push(el.src) }
    };
    const ctx = { console: { ...console, warn: m => warns.push(String(m)) }, document: doc };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read(MASTERY), ctx); // 멈추지 않음
    assert.deepEqual(appended, ['https://school.test/kids/subjects/quest/quest-questions.js']);
    assert.match(warns.join(' '), /quest-questions\.js가 먼저 실리지 않아/);
    assert.throws(() => ctx.QuestMastery.misspellingsOf('앉다'), /quest-questions\.js의 misspellingsOf이 없습니다/);
    vm.runInContext(read(QUESTIONS), ctx); // 끼워 넣은 파일이 실린 뒤
    assert.equal(JSON.stringify(ctx.QuestMastery.misspellingsOf('앉다')), JSON.stringify(['안다', '앚다']));
});

test('옛 quest-questions.js가 섞여 함수가 빠지면 처음 실을 때 어떤 함수인지 알려 준다', () => {
    const ctx = { console, QuestQuestions: { shuffle() {} } };
    ctx.window = ctx;
    vm.createContext(ctx);
    assert.throws(() => vm.runInContext(read(MASTERY), ctx), /buildQuestion/);
});

test('quest-questions.js는 혼자서(빈 환경) 네 가지 문제를 만들고, 두 파일을 실으면 1판을 만든다', () => {
    const ctx = { console };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read(QUESTIONS), ctx);
    const Q = ctx.QuestQuestions;
    let s = 7;
    const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const items = [
        { id: '1', word: '앉다', meaning: '엉덩이를 바닥에 대다', kind: 'word', detail: '의자에 앉다.' },
        { id: '2', word: '넓다', meaning: '면적이 크다', kind: 'word', detail: '운동장이 넓다.' },
        { id: '3', word: '읽다', meaning: '글을 보다', kind: 'word', detail: '책을 읽다.' },
        { id: '4', word: '친구와 함께 놀아요', meaning: '같이 놀다', kind: 'sentence', detail: '' }
    ];
    const ctxQ = { subj: 'korean', lang: 'ko', rng };
    const types = new Set();
    for (const level of [1, 2, 3]) for (const it of items) types.add(Q.buildQuestion(it, level, items, ctxQ, {}).masteryType);
    types.add(Q.buildMatch(items.slice(0, 3), ctxQ).masteryType);
    assert.ok(types.size >= 3, `문제 종류가 ${[...types].join(', ')}뿐`);
    assert.ok(types.has('match_3x3'));
    vm.runInContext(read(MASTERY), ctx);
    assert.equal(typeof ctx.QuestMastery.buildRound, 'function');
});

test('문제 만들기 함수는 한 벌: quest-mastery.js에 다시 정의하지 않는다', () => {
    const src = read(MASTERY);
    for (const name of ['HINT_POLICY', 'EN_STOPWORDS', 'HANGUL_BASE', 'DOUBLE_JONG']) {
        assert.doesNotMatch(src, new RegExp(`(?:const|let|var)\\s+${name}\\s*=`), `quest-mastery.js에 ${name} 사본이 다시 생김`);
    }
    for (const name of MOVED) {
        assert.doesNotMatch(src, new RegExp(`(?:function\\s+${name}\\b|(?:const|let|var)\\s+${name}\\s*=\\s*(?:function|\\())`), `quest-mastery.js에 ${name} 사본이 다시 생김`);
        assert.match(read(QUESTIONS), new RegExp(`function\\s+${name}\\b`), `quest-questions.js에 ${name} 없음`);
    }
});
