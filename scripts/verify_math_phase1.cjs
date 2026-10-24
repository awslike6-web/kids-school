// 실행: node scripts/verify_math_phase1.cjs (브라우저와 모든 운영 요청을 분리)
const {chromium} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  const file = path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  fs.readFile(file,(err,data) => {if(err) res.writeHead(404).end(); else {res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);}});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 let checks=0; const errors=[],missing=[];
 try {
  for (const viewport of [{width:390,height:844},{width:1280,height:900}]) {
   const ctx=await browser.newContext({viewport,hasTouch:true});
   await ctx.route('**/*',r=>r.request().url().startsWith(base) ? r.continue() : r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],object:'list'})}));
   await ctx.addInitScript(()=>localStorage.setItem('fairy_tts_enabled','false'));
   const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()===404)missing.push(r.url());});
   await page.goto(base+'/kids/subjects/math/clock_rules.html');
   await page.evaluate(()=>{window.audioCalls=[];window.speakFairyTTS=(text)=>audioCalls.push(['tts',text]);window.fairyPraise=()=>audioCalls.push(['praise']);window.fairyEncourage=()=>audioCalls.push(['encourage']);});
   assert.equal(await page.locator('#clock-digital-display').textContent(),'10시 30분'); checks++;
   assert.deepEqual(await page.evaluate(()=>MathPlay.timeParts(750)),{hour:12,minute:30,hourAngle:15,minuteAngle:180}); checks++;
   assert.deepEqual(await page.evaluate(()=>MathPlay.findRepeat(['a','b','b','a','b','b'])),{unit:['a','b','b'],next:'a'});checks++;
   assert.equal(await page.evaluate(()=>MathPlay.findRepeat(['a','b','c','a','c'])),null);checks++;
   await page.getByRole('button',{name:'+30분',exact:true}).click();
   assert.equal(await page.locator('#clock-digital-display').textContent(),'11시 정각');checks++;
   const face=await page.locator('#clock-face').boundingBox();
   const cx=face.x+face.width/2, cy=face.y+face.height/2;
   await page.mouse.move(cx,cy-80);await page.mouse.down();
   for(let i=1;i<=36;i++){const a=i*Math.PI/18;await page.mouse.move(cx+80*Math.sin(a),cy-80*Math.cos(a));}
   await page.mouse.up();assert.equal(await page.locator('#clock-digital-display').textContent(),'12시 정각');checks++;
   await page.mouse.move(cx,cy-80);await page.mouse.down();
   for(let i=1;i<=36;i++){const a=-i*Math.PI/18;await page.mouse.move(cx+80*Math.sin(a),cy-80*Math.cos(a));}
   await page.mouse.up();assert.equal(await page.locator('#clock-digital-display').textContent(),'11시 정각');checks++;
   await page.locator('#clock-face').scrollIntoViewIfNeeded();
   const touchFace=await page.locator('#clock-face').boundingBox();
   const tx=touchFace.x+touchFace.width/2,ty=touchFace.y+touchFace.height/2;
   const cdp=await ctx.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty-80}]});
   for(let i=1;i<=18;i++){const a=i*Math.PI/18;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+80*Math.sin(a),y:ty-80*Math.cos(a)}]});}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await page.locator('#clock-digital-display').textContent(),'11시 30분');checks++;
   for(let i=0;i<2;i++){await page.getByRole('button',{name:'🍓',exact:true}).first().click();await page.locator('#bead-palette').getByRole('button',{name:'🍌',exact:true}).click();await page.locator('#bead-palette').getByRole('button',{name:'🍌',exact:true}).click();}
   await page.locator('#bead-analyze').click();assert.match(await page.locator('#bead-feedback').textContent(),/다음 구슬은 🍓/);checks++;
   await page.locator('#bead-next').click();assert.equal(await page.locator('#bead-row button').count(),7);checks++;
   await page.locator('#bead-layout').selectOption('bracelet');assert.match(await page.locator('#bead-row').getAttribute('class'),/bracelet/);checks++;
   await page.locator('#bead-analyze').click();
   await page.locator('#bead-row button').last().click();assert.equal(await page.locator('#bead-row button').count(),6);checks++;
   await page.locator('#number-grid').getByRole('button',{name:'10',exact:true}).click();assert.match(await page.locator('#number-feedback').textContent(),/10!/);checks++;
   await page.locator('#clock-quiz').click();assert.equal(await page.locator('#clock-digital-display').textContent(),'몇 시일까요?');checks++;
   const correct=await page.evaluate(()=>{const a=parseFloat(document.getElementById('hand-hour').style.transform.match(/[-\d.]+/)[0]);const t=MathPlay.timeParts(a*2);return `${t.hour}시 ${t.minute?'30분':'정각'}`;});
   await page.locator('#clock-choices').getByRole('button',{name:correct,exact:true}).click();assert.match(await page.locator('#clock-feedback').textContent(),/잘 읽었어요/);checks++;
   const praiseCount=await page.evaluate(()=>audioCalls.filter(x=>x[0]==='praise').length);
   await page.locator('#clock-choices').getByRole('button',{name:correct,exact:true}).click();assert.equal(await page.evaluate(()=>audioCalls.filter(x=>x[0]==='praise').length),praiseCount);checks++;
   await page.locator('#clock-read').click();assert.ok(await page.evaluate(()=>audioCalls.some(x=>x[0]==='tts'&&x[1].includes('시'))));checks++;
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
   await page.screenshot({path:path.join(root,`docs/math-phase1-clock-${viewport.width}.png`),fullPage:true});
   await page.goto(base+'/kids/subjects/math/shapes.html');
   await page.evaluate(()=>{window.shapeRewards=0;window.speakFairyTTS=window.fairySpeak=()=>{};window.fairyPraise=()=>{};window.fairyEncourage=()=>{};window.grantRewardAndShowUI=()=>shapeRewards++;});
   await page.getByRole('button',{name:/4\. 모양 조립/}).click();
   for(const id of ['box','cylinder','sphere'])await page.locator('#btn-ws-part-'+id).click();
   assert.equal(await page.getByRole('button',{name:/다시 조립하기/}).count(),1);checks++;
   await page.getByRole('button',{name:/다시 조립하기/}).click();assert.equal(await page.locator('#btn-ws-part-box').count(),1);checks++;
   await page.getByRole('button',{name:/5\. 모양 분류/}).click();
   const rewards=await page.evaluate(()=>shapeRewards);
   await page.locator('#shape-quiz-choices').getByRole('button',{name:'공 모양',exact:true}).click();assert.match(await page.locator('#shape-quiz-feedback').textContent(),/다시 골라/);checks++;
   await page.locator('#shape-quiz-choices').getByRole('button',{name:'상자 모양',exact:true}).click();
   await page.locator('#shape-quiz-choices').getByRole('button',{name:'상자 모양',exact:true}).click();assert.equal(await page.evaluate(()=>shapeRewards),rewards+1);checks++;
   await page.getByRole('button',{name:/6\. 입체 도장/}).click();
   await page.locator('#stamp-center').click();assert.equal(await page.locator('#stamp-paper g').count(),0);checks++;
   for(const solid of ['box','cylinder','prism']){await page.locator('#stamp-solid').selectOption(solid);await page.locator('#stamp-ink').click();await page.locator('#stamp-center').click();}
   assert.equal(await page.locator('#stamp-paper g').count(),3);checks++;
   await page.screenshot({path:path.join(root,`docs/math-phase1-stamp-${viewport.width}.png`),fullPage:true});
   await page.getByRole('button',{name:/7\. 모양 꾸미기/}).click();await page.locator('[data-piece="triangle"]').click();
   await page.locator('#art-paper').press('ArrowRight');assert.equal(await page.locator('#art-paper .piece').getAttribute('data-x'),'260');checks++;
   await page.locator('#art-rotate').click();assert.equal(await page.locator('#art-paper .piece').getAttribute('data-angle'),'45');checks++;
   await page.locator('#art-delete').click();assert.equal(await page.locator('#art-paper .piece').count(),0);checks++;
   for(const guide of ['house','train','butterfly']){await page.locator('#art-guide').selectOption(guide);assert.ok(await page.locator('#art-paper .guide>*').count());checks++;}
   await page.locator('[data-piece="circle"]').tap();
   await page.locator('#art-paper').scrollIntoViewIfNeeded();
   const piece=await page.locator('#art-paper .piece').boundingBox();
   const oldX=Number(await page.locator('#art-paper .piece').getAttribute('data-x'));
   await page.mouse.move(piece.x+piece.width/2,piece.y+piece.height/2);await page.mouse.down();await page.mouse.move(piece.x+piece.width/2+30,piece.y+piece.height/2+20);await page.mouse.up();
   assert.ok(Number(await page.locator('#art-paper .piece').getAttribute('data-x'))>oldX);checks++;
   await page.screenshot({path:path.join(root,`docs/math-phase1-art-${viewport.width}.png`),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
   await ctx.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log(JSON.stringify({checks,pageErrors:errors,missing},null,2));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
