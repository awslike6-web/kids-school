// 실제 MP3 디코딩·국어방/5분방 발화 경로 검사. 외부 요청·운영 DB 쓰기는 차단한다.
const { chromium } = require('./load_playwright.cjs');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../scratch/center-audio-verification');
fs.mkdirSync(output, { recursive: true });
const passages = JSON.parse(fs.readFileSync(path.join(root, 'kids/data/reading_passages_cache.json'), 'utf8'))
    .filter(p => p.track === '🏥 센터 독해').map(p => ({ ...p, id: p.book_id || p.id, fullText: p.full_text || p.fullText }));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'kids/assets/audio/center_reading/manifest.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404).end(); return; }
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Content-Length', data.length);
        res.end(data);
    });
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const live = process.argv.includes('--live');
    const base = live ? 'https://awslike6-web.github.io/kids-school' : `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
    const errors = [], audioRequests = [];
    let checks = 0, decodedFiles = 0;
    try {
        for (const width of [390, 1280]) {
            const context = await browser.newContext({ viewport: { width, height: 844 } });
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                const staticHost = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
                if (route.request().url().startsWith(base + '/') || staticHost) return route.continue();
                return route.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[]}' });
            });
            await context.addInitScript(() => {
                localStorage.setItem('currentUserName', '아빠');
                localStorage.setItem('fairy_tts_enabled', 'false');
                window.staticAudios = [];
                const NativeAudio = window.Audio;
                // 실제 HTMLAudioElement를 유지하고 검사 목적으로만 목록에 기록한다.
                window.Audio = function (url) { const audio = new NativeAudio(url); window.staticAudios.push(audio); return audio; };
            });
            const page = await context.newPage();
            page.on('pageerror', e => errors.push(e.message));
            page.on('response', response => {
                if (response.url().includes('/center_reading/') && response.url().endsWith('.mp3')) {
                    audioRequests.push({ url: response.url(), status: response.status() });
                }
            });
            await page.goto(base + '/kids/subjects/korean/korean.html');
            await page.waitForFunction(() => window.ReadingEngine && window.CenterReadingAudio);
            await page.evaluate(async data => {
                window.fetchReadingPassagesFromNotion = async () => data;
                window.fallbackCalls = 0;
                window.playCloudflareEdgeTtsStream = async () => { window.fallbackCalls++; };
                document.getElementById('missionOverlay').style.display = 'flex';
                await ReadingEngine.renderLobby(document.getElementById('overlayInnerBody'), { subject: '국어', grade: '5-2' });
            }, passages);
            for (const order of [35, 36]) {
                const passage = passages.find(p => p.order === order);
                await page.evaluate(id => {
                    localStorage.setItem('fairy_tts_enabled', 'false');
                    ReadingEngine.startMission(id);
                    localStorage.setItem('fairy_tts_enabled', 'true');
                }, passage.id);
                await page.locator('.reading-tts-btn').click();
                await page.waitForFunction(() => staticAudios.some(a => !a.paused && a.currentTime > 0 && a.duration > 0));
                checks++;
                assert.equal(await page.evaluate(() => fallbackCalls), 0); checks++;
                if (order === 36) await page.screenshot({ path: path.join(output, `reader-${width}.png`), fullPage: true });
                await page.locator('.reading-tts-btn').click();
                assert.equal(await page.evaluate(() => staticAudios.every(a => a.paused)), true); checks++;
                await page.locator('.reading-tts-btn').click();
                await page.waitForFunction(() => staticAudios.some(a => !a.paused));
                await page.evaluate(() => ReadingEngine.startQuestions());
                assert.equal(await page.evaluate(() => staticAudios.every(a => a.paused)), true); checks++;
            }
            // 같은 노션 ID로 본문을 바꿔도 옛 파일을 재사용하지 않는다.
            assert.equal(await page.evaluate(async () => CenterReadingAudio.play('수정된 새 본문, 이전 음성 사용 금지.')), false); checks++;
            await page.evaluate(async () => {
                localStorage.setItem('fairy_tts_enabled', 'false');
                await speakFairyTTS('물체');
            });
            assert.equal(await page.evaluate(() => staticAudios.every(a => a.paused)), true); checks++;
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;

            if (width === 390) {
                const result = await page.evaluate(async ({ base, files }) => {
                    const decoder = new AudioContext();
                    let index = 0, decoded = 0;
                    const failed = [];
                    await Promise.all(Array.from({ length: 4 }, async () => {
                        while (index < files.length) {
                            const file = files[index++];
                            try {
                                const res = await fetch(`${base}/kids/assets/audio/center_reading/${file}`);
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const audio = await decoder.decodeAudioData(await res.arrayBuffer());
                                if (audio.duration <= 0) throw new Error('빈 오디오');
                                decoded++;
                            } catch (error) { failed.push({ file, message: error.message }); }
                        }
                    }));
                    await decoder.close();
                    return { decoded, failed };
                }, { base, files: Object.values(manifest.clips).map(c => c.audio_file) });
                assert.deepEqual(result.failed, []);
                assert.equal(result.decoded, Object.keys(manifest.clips).length);
                decodedFiles = result.decoded;
                checks++;
            }

            // 실제 노션 조회 → 3·3·3 문제 생성 → 러너의 듣기 버튼까지 실행.
            // 운영 DB 대신 이번에 등록된 36회차 데이터의 읽기 응답만 주입한다.
            const vocas = passages.find(p => p.order === 36).vocas;
            const rich = text => [{ plain_text: text || '' }];
            const vocaPages = vocas.map((v, i) => ({ id: `inspection-${i}`, properties: {
                '단어': { title: rich(v.word) }, '뜻풀이': { rich_text: rich(v.meaning) },
                '상세설명': { rich_text: rich(v.desc) }, '단원': { rich_text: rich('audio-verification') },
                '과목': { multi_select: [{ name: '국어' }] }, '학생': { multi_select: [{ name: '민수' }] },
                '학년': { multi_select: [{ name: '5-2' }] }, '어휘유형': { select: { name: v.vtype || '어휘' } }
            } }));
            await context.route('**/v1/databases/375a27115b688038b686d3994ee12919/query', route =>
                route.fulfill({ status: 200, contentType: 'application/json',
                    body: JSON.stringify({ results: vocaPages, has_more: false }) }));
            await page.goto(base + '/quest_runner.html?user=minsu&subject=korean&unit=audio-verification');
            await page.waitForSelector('#masteryStage .qm-speaker');
            await page.evaluate(() => {
                window.staticAudios.length = 0;
                localStorage.setItem('fairy_tts_enabled', 'true');
            });
            await page.locator('#masteryStage .qm-speaker').click();
            await page.waitForFunction(() => staticAudios.some(a => !a.paused && a.currentTime > 0)); checks++;
            await page.evaluate(() => stopFairyTTS());
            assert.equal(await page.evaluate(() => staticAudios.every(a => a.paused)), true); checks++;
            await context.close();
        }
        assert.ok(audioRequests.length >= 10);
        // GitHub Pages는 실제 미디어 Range 요청에 206 Partial Content로 응답할 수 있다.
        assert.ok(audioRequests.every(r => r.status === 200 || r.status === 206));
        assert.deepEqual(errors, []);
        const report = { live, checks, decodedFiles, mp3Requests: audioRequests.length, errors, widths: [390, 1280] };
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report));
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
