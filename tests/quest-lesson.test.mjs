import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const files = ['kids/subjects/quest/quest-mastery.js', 'kids/subjects/quest/quest-lesson.js'];
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(n = 20) {
  const { sandbox } = loadBrowserScripts(files);
  const items = Array.from({length:n}, (_, i) => ({ id:'item'+i, word:'word'+i,
    meaning:'뜻'+i, detail:'설명'+i, kind:i % 4 === 0 ? 'sentence' : 'word' }));
  return { L:sandbox.QuestLesson, M:sandbox.QuestMastery, items, store:{items:{},dirty:{},pushedAt:{}} };
}
const options = f => ({ child:'minsu', items:f.items, store:f.store, subj:'english', today:'2026-10-30', rng:() => 0.25 });
test('단계 구성·결정성·항목별 크레딧은 한 번', () => {
  const f=fixture(), a=f.L.buildLesson(options(f)), b=f.L.buildLesson(options(f));
  assert.deepEqual(plain(a), plain(b));
  assert.deepEqual(plain(a.steps.map(s=>s.questions.length)), [4,5,4]);
  const seen=new Set();
  for (const s of a.steps) for (const q of s.questions) {
    if (q.itemIds.some(id=>seen.has(id))) assert.equal(q.noCredit,true);
    q.itemIds.forEach(id=>seen.add(id));
    if (s.key !== 'boss') assert.ok(q.level<=2);
  }
  assert.ok(a.steps[0].questions.some(q=>q.masteryType==='match_3x3'));
  assert.ok(a.steps[1].questions.slice(0,2).every(q=>q.item.kind==='sentence'));
});
test('녹슨 왕관은 보스 맨 앞, Lv.3 최대 세 개', () => {
  const f=fixture();
  f.items.forEach(it=>{ f.store.items[it.id]={c:7,s:'2026-10-29',r:'2026-10-29'}; });
  f.store.items.item0={c:9,s:'2026-10-20',r:'2026-10-20'};
  const a=f.L.buildLesson(options(f));
  assert.equal(a.steps[2].questions[0].isRustyReview,true);
  assert.ok(a.steps[2].questions.filter(q=>q.level===3).length<=3);
  assert.ok(a.steps.slice(0,2).flatMap(s=>s.questions).every(q=>q.level<=2 && !q.isRustyReview));
  f.items.forEach(it=>{f.store.items[it.id]={c:9,s:'2026-10-20',r:'2026-10-20'};});
  const allRusty=f.L.buildLesson(options(f));
  assert.equal(allRusty.steps[2].questions[0].noCredit,false);
  assert.equal(f.L.validateLesson(allRusty),true);
  const bite=f.L.buildLesson({...options(f),child:'minseo',mode:'bite'});
  assert.equal(f.L.validateLesson(bite),true);
});
test('은메달 당일 상한·한입·소규모 단원 폴백', () => {
  const f=fixture(); f.items.forEach(it=>{ f.store.items[it.id]={c:6,s:'2026-10-30',r:'2026-10-30'}; });
  assert.ok(f.L.buildLesson(options(f)).steps.every(s=>s.questions.every(q=>q.noCredit)));
  const bite=f.L.buildLesson({...options(f),child:'minseo',mode:'bite'});
  assert.equal(bite.steps[0].questions.length,3);
  assert.ok(bite.steps[0].questions.every(q=>q.level<=2&&!q.isRustyReview&&(!q.scramble||q.scramble.seq.length<=3)));
  for(let n=3;n<=8;n++) { const g=fixture(n), a=g.L.buildLesson(options(g));
    assert.equal(a.meta.fallback===true,n<5);
  }
  assert.equal(f.L.pickBiteSubject({korean:2,english:1}),'english');
  assert.equal(f.L.pickBiteSubject({korean:2,english:2}),'korean');
});
test('재출제는 단계당 두 개까지이며 크레딧이 없고 콤보가 초기화된다', () => {
  const f=fixture(), lesson=f.L.buildLesson(options(f)), events=[];
  const s=f.L.createSession(lesson,{onCompanion:e=>events.push(e)});
  for(let i=0;i<3;i++) { assert.equal(s.finish({firstTry:true}),true); assert.equal(s.finish({firstTry:true}),false); s.next(); }
  assert.ok(events.includes('combo'));
  s.finish({firstTry:false}); assert.equal(s.status().combo,0); s.next();
  let guard=0;
  while(s.current()&&s.status().stepIndex===0&&guard++<20) { s.finish({firstTry:false}); s.next(); }
  const retries=s.steps[0].questions.filter(q=>q.lessonRetry);
  assert.ok(retries.length<=2); assert.ok(retries.every(q=>q.noCredit));
});
test('한입 레슨은 틀려도 다시 내지 않아 3문제로 끝난다', () => {
  const f=fixture(), s=f.L.createSession(f.L.buildLesson({...options(f),child:'minseo',mode:'bite'}));
  let answered=0, move;
  do { s.finish({firstTry:false}); answered++; move=s.next(); } while(!move.done&&answered<10);
  assert.equal(answered,3); assert.equal(s.status().total,3);
});
test('오답 조각은 1900자 경계에서 왕복하고 초과 시 최근 기록을 보존한다', () => {
  const {sandbox}=loadBrowserScripts(['kids/core/study-log-store.js']);
  const parts=sandbox.StudyLogStore.reportParts;
  for(const n of [1899,1900,1901,76000]) {
    const value='가'.repeat(n), result=parts(value);
    assert.ok(result.length<=40&&result.every(p=>p.text.content.length<=1900));
    assert.equal(result.map(p=>p.text.content).join(''),value);
  }
  const result=parts('옛 기록'.repeat(20000)+' | 최신 오답');
  assert.ok(result.length<=40); assert.ok(result.map(p=>p.text.content).join('').endsWith('최신 오답'));
});
test('날짜별 한입 횟수는 정상화하고 다음 날짜에는 0부터 시작한다', () => {
  const {sandbox}=loadBrowserScripts(files), L=sandbox.QuestLesson;
  const storage=sandbox.localStorage;
  storage.setItem(L.biteCountKey('2026-10-30'),JSON.stringify({korean:-1,english:'깨짐'}));
  assert.deepEqual(plain(L.readBiteCounts(storage,'2026-10-30')),{korean:0,english:0});
  L.recordBiteCompletion(storage,'english','2026-10-30');
  assert.equal(L.pickBiteSubject(L.readBiteCounts(storage,'2026-10-30')),'korean');
  assert.deepEqual(plain(L.readBiteCounts(storage,'2026-10-31')),{korean:0,english:0});
});
test('크레딧과 보스 제한을 일부러 깨면 시작 전 검증이 거부한다', () => {
  const f=fixture(), lesson=f.L.buildLesson(options(f));
  assert.equal(f.L.validateLesson(lesson),true);
  const duplicate=structuredClone(plain(lesson));
  duplicate.steps[1].questions.push({...duplicate.steps[0].questions[0],noCredit:false});
  assert.equal(f.L.validateLesson(duplicate),false);
  const badBoss=structuredClone(plain(lesson));badBoss.steps[0].questions[0].level=3;
  assert.equal(f.L.validateLesson(badBoss),false);
  const {sandbox}=loadBrowserScripts(files);
  const source=readFileSync(new URL('../kids/subjects/quest/quest-lesson.js',import.meta.url),'utf8')
    .replace('q.noCredit = q.noCredit || q.itemIds.some(id => seen.has(id));','q.noCredit = false;');
  vm.runInContext(source,sandbox);
  const broken=sandbox.QuestLesson.buildLesson(options(f));
  assert.equal(f.L.validateLesson(broken),false);
});
test('한입 화면 흐름은 세 문항 완주·일지 한 번·다음 레슨 새 UUID를 연결한다', async () => {
  const {sandbox}=loadBrowserScripts([...files,'kids/subjects/quest/quest-lesson-ui.js']);
  class Node {
    constructor(){this.children=[];this.style={};this.classList={add(){},remove(){}};this.parentElement=this;}
    append(...nodes){this.children.push(...nodes);} appendChild(n){this.append(n);}
    replaceChildren(...nodes){this.children=nodes;} remove(){} setAttribute(){} focus(){} scrollIntoView(){}
  }
  const nodes=new Map(), node=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
  sandbox.document={getElementById:node,createElement:()=>new Node(),head:new Node(),body:new Node(),querySelectorAll:()=>[]};
  const events={}, records=[], logs=[], phases=[];let bonuses=0, hooks, q, sequence=0;
  sandbox.crypto={randomUUID:()=>`lesson-${++sequence}`};sandbox.CustomEvent=class{constructor(type,opts){this.type=type;this.detail=opts.detail;}};
  sandbox.addEventListener=(name,fn)=>{events[name]=fn;};sandbox.dispatchEvent=()=>{};
  sandbox.StudyActivity={setPhase:p=>phases.push(p),recordCorrect(){},recordLessonComplete:(...args)=>records.push(args)};
  sandbox.grantRewardAndShowUI=async()=>{bonuses++;};sandbox.sendStudyLogToNotion=async e=>logs.push(e);
  sandbox.QuestUIRenderer={render:(box,question,options)=>{box.replaceChildren();hooks=options;q=question;}};
  const f=fixture(10);
  assert.equal(sandbox.QuestLessonUI.start({unit:{child:'minseo',items:f.items,units:['테스트 단원']},subj:'korean',mode:'bite',isMinseo:true}),true);
  for(let i=0;i<3;i++) {
    hooks.onDone({firstTry:i!==0,wrongPicks:i===0?['실제 선택']:[],results:q.itemIds.map(id=>({id,firstTry:i!==0}))});
    node('masteryStage').children.at(-1).onclick();
  }
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(records.length,1);assert.equal(bonuses,1);assert.equal(logs.length,1);assert.equal(logs[0].durationMinutes,0);
  assert.ok(logs[0].errorReport.includes('실제 선택'));
  assert.equal(phases.at(-1),'paused');
  events.pagehide();assert.equal(logs.length,1);
  const panel=node('masteryStage').children[0];
  assert.ok(!panel.children.some(n=>n.textContent?.includes('첫 시도')));
  panel.children.find(n=>n.textContent==='🌸 한 입 더!').onclick();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sequence,2);assert.equal(phases.at(-1),'quiz');
});
