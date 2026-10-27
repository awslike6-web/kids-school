const {chromium} = require('./load_playwright.cjs');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error,data) => error ? res.writeHead(404).end() : (res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream'),res.end(data)));
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  const errors = [], missing = []; let checks = 0;
  try {
    for (const viewport of [{width:390,height:844},{width:1280,height:900}]) {
      const context = await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});
      await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.fulfill({status:200,contentType:'application/json',body:'{"results":[]}'}));
      await context.addInitScript(() => localStorage.setItem('fairy_tts_enabled','false'));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {if(response.url().startsWith(base) && response.status() === 404) missing.push(response.url());});
      await page.goto(base + '/kids/subjects/math/addition_concept.html');
      await page.evaluate(() => {window.audioCalls=[];window.speakFairyTTS=t=>audioCalls.push(['tts',t]);window.fairyPraise=()=>audioCalls.push(['praise']);window.fairyEncourage=()=>audioCalls.push(['hint']);window.grantRewardAndShowUI=()=>{};});
      assert.deepEqual(await page.evaluate(() => ArithmeticCPA.additionPlan(8,5,'left')),{a:8,b:5,target:'left',need:2,rest:3,sum:13}); checks++;
      assert.deepEqual(await page.evaluate(() => ArithmeticCPA.additionPlan(8,5,'right')),{a:8,b:5,target:'right',need:5,rest:3,sum:13}); checks++;
      assert.deepEqual(await page.evaluate(() => ArithmeticCPA.threePlan([4,3,1],false)),{a:4,b:3,c:1,middle:7,answer:8,sign:'+'}); checks++;
      await page.locator('#strategy-step').click(); assert.equal(await page.locator('#make10-left .cpa-chip').count(),10); checks++;
      await page.locator('#strategy-step').click(); assert.equal(await page.locator('#make10-equation-view').textContent(),'8 + 5 = 13'); checks++;
      await page.locator('[data-strategy="right"]').click(); await page.locator('#strategy-step').click();
      assert.equal(await page.locator('#make10-right .cpa-chip').count(),10); checks++;
      await page.locator('[data-panel="panel-train"]').click(); await page.locator('#train-step').click();
      assert.match(await page.locator('#train-guide').textContent(),/4 \+ 3 = 7/); checks++;
      await page.locator('#train-step').click(); assert.equal(await page.locator('#train-equation').textContent(),'4 + 3 + 1 = 8'); checks++;
      await page.locator('[data-panel="panel-partner"]').click();
      const partner = 10 - Number(await page.locator('#partner-dice').textContent());
      await page.locator('#partner-choices').getByRole('button',{name:String(partner),exact:true}).click();
      assert.match(await page.locator('#partner-feedback').textContent(),/짝꿍/); checks++;
      await page.locator('[data-panel="panel-story"]').click();
      await page.locator('#story-a').selectOption('8'); await page.locator('#story-op').selectOption('+'); await page.locator('#story-b').selectOption('5'); await page.locator('#story-result').selectOption('13'); await page.locator('#story-check').click();
      assert.match(await page.locator('#story-feedback').textContent(),/모두 13개/); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true); checks++;
      await page.screenshot({path:path.join(root,`docs/math-phase2-add-${viewport.width}.png`),fullPage:true});
      await page.goto(base + '/kids/subjects/math/subtraction_concept.html');
      await page.evaluate(() => {window.audioCalls=[];window.speakFairyTTS=t=>audioCalls.push(['tts',t]);window.fairyPraise=()=>audioCalls.push(['praise']);window.fairyEncourage=()=>audioCalls.push(['hint']);window.grantRewardAndShowUI=()=>{};});
      assert.deepEqual(await page.evaluate(() => ArithmeticCPA.subtractionPlan(14,9,'ones')),{a:14,b:9,ones:4,strategy:'ones',firstRemoved:4,secondRemoved:5,tenRemainder:1,answer:5}); checks++;
      assert.deepEqual(await page.evaluate(() => ArithmeticCPA.subtractionPlan(14,9,'ten')),{a:14,b:9,ones:4,strategy:'ten',firstRemoved:9,secondRemoved:0,tenRemainder:1,answer:5}); checks++;
      assert.deepEqual(await page.evaluate(() => ArithmeticCPA.threePlan([9,2,3],true)),{a:9,b:2,c:3,middle:7,answer:4,sign:'−'}); checks++;
      await page.locator('#strategy-step').click(); assert.equal(await page.locator('#sub10-right .cpa-chip').count(),0); checks++;
      await page.locator('#strategy-step').click(); assert.equal(await page.locator('#sub10-left .cpa-chip').count(),5); checks++;
      assert.equal(await page.locator('#sub10-removed .cpa-chip').count(),9); checks++;
      await page.locator('[data-strategy="ten"]').click(); await page.locator('#strategy-step').click(); assert.equal(await page.locator('#sub10-left .cpa-chip').count(),1); checks++;
      await page.locator('#strategy-step').click(); assert.equal(await page.locator('#sub10-left .cpa-chip').count(),5); checks++;
      assert.equal(await page.locator('#sub10-equation-view').textContent(),'14 − 9 = 5'); checks++;
      await page.locator('[data-panel="panel-train"]').click(); await page.locator('#train-step').click(); await page.locator('#train-step').click();
      assert.equal(await page.locator('#train-equation').textContent(),'9 − 2 − 3 = 4'); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true); checks++;
      await page.screenshot({path:path.join(root,`docs/math-phase2-sub-${viewport.width}.png`),fullPage:true});
      await context.close();
    }
    assert.deepEqual(errors,[]); assert.deepEqual(missing,[]);
    console.log(JSON.stringify({checks,pageErrors:errors,missing},null,2));
  } finally {await browser.close();server.close();}
})().catch(error => {console.error(error);server.close();process.exitCode=1;});
