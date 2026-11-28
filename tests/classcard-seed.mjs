// tests/classcard-seed.mjs
// 클래스카드 시험용 카드 묶음: 등록 자료(scripts/data/classcard/english_5-2_L11.json)를 노션 응답 모양의 행으로 바꿔
// 실제 english_classcard_deck.js(EnglishClasscard.Deck.buildDeck)로 묶는다. 노션에는 접속하지 않는다.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, base), 'utf8');

export const SEED_FILE = 'scripts/data/classcard/english_5-2_L11.json';
export const DECK_FILE = 'kids/js/english_classcard_deck.js';

export function readSeed() {
  return JSON.parse(read(SEED_FILE));
}

const text = (kind, value) => ({ [kind]: value ? [{ plain_text: value }] : [] });

// 등록기(register_classcard.py)가 노션에 쓰는 칸과 같은 모양의 행
export function seedPages(seed = readSeed(), override = {}) {
  const students = Array.isArray(seed.student) ? seed.student : [seed.student];
  return seed.cards.map(c => ({
    id: `page-${c.no}`,
    properties: {
      영어: text('title', c.en),
      뜻: text('rich_text', c.ko),
      읽기: text('rich_text', c.say || ''),
      학년: { select: { name: seed.grade } },
      단원: { select: { name: seed.unit } },
      학생: { multi_select: students.map(name => ({ name })) },
      구간: { number: c.section },
      순번: { number: c.order ?? c.no },
      카드번호: { number: c.no },
      사용: { checkbox: (override[c.no] ?? c.use ?? seed.use ?? true) === true }
    }
  }));
}

// vm 상자에 Deck 모듈을 싣고 ctx.CLASSCARD_DECK에 민수용 5-2 L11 묶음을 둔다 (예전 정적 파일 자리)
export function installSeedDeck(ctx) {
  vm.runInContext(read(DECK_FILE), ctx, { filename: DECK_FILE });
  ctx.CLASSCARD_DECK = ctx.EnglishClasscard.Deck.buildDeck(seedPages(), { grade: '5-2', unit: 'L11', students: ['민수', '공통'] });
  return ctx.CLASSCARD_DECK;
}
