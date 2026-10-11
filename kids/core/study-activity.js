// Shared active-study meter. No parent secret, camera, microphone or answer content is collected.
(function(root) {
    'use strict';
    const IDLE_MS = 90000, MAX_TICK_MS = 5000;
    const ACTIVE = 'GUARDIAN_STUDY_V2_ACTIVE_', QUEUE = 'GUARDIAN_STUDY_V2_QUEUE_';
    const LOCAL = 'GUARDIAN_STUDY_V2_DAY_';
    const CORRECT = 'GUARDIAN_STUDY_V3_ANSWERS_';
    const dayKey = ms => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
    function appendRange(ranges, a, b) {
        const last = ranges[ranges.length - 1];
        if (last && last[1] === a && b - last[0] <= 120000) last[1] = b;
        else if (b > a) ranges.push([a, b]);
    }
    function unionMilliseconds(ranges, date) {
        const lo = Date.parse(`${date}T00:00:00+09:00`), hi = lo + 86400000;
        const sorted = ranges.filter(r => Array.isArray(r) && r.length === 2 && r.every(Number.isSafeInteger))
            .map(([a,b]) => [Math.max(lo,a), Math.min(hi,b)]).filter(([a,b]) => b > a).sort((a,b) => a[0]-b[0]);
        let total = 0, start = 0, end = 0;
        for (const [a,b] of sorted) {
            if (a > end) { total += end-start; start=a; end=b; } else end=Math.max(end,b);
        }
        return total + end-start;
    }
    function measuredMinutes(pages, child, date) {
        const ranges=[];
        for (const page of pages) {
            const props=page.properties || {};
            if (props['학생']?.select?.name !== child) continue;
            try {
                const value=JSON.parse((props['활동측정']?.rich_text || [])
                    .map(t => t.plain_text ?? t.text?.content ?? '').join(''));
                const entered=Date.parse(props['입장']?.date?.start), exited=Date.parse(props['퇴장']?.date?.start);
                if (![2,3].includes(value.v) || !['study','quiz'].includes(value.kind) || !Array.isArray(value.ranges)
                    || value.ranges.length > 256 || !Number.isFinite(entered) || !Number.isFinite(exited)) continue;
                if (value.ranges.some(r => !Array.isArray(r) || r.length !== 2 || !r.every(Number.isSafeInteger)
                    || r[1] <= r[0] || r[1]-r[0] > 120000 || r[0] < entered || r[1] > exited || r[1] > Date.now())) continue;
                ranges.push(...value.ranges);
            } catch {}
        }
        return Math.floor(unionMilliseconds(ranges,date)/60000);
    }
    class ActivityClock {
        constructor(wall, mono) {
            this.wall=wall; this.mono=mono; this.lastAction=-Infinity;
            this.eligible=false; this.ranges=[];
        }
        tick(wall, mono, eligible, readingAudio = false) {
            const elapsed=mono-this.mono, wallElapsed=wall-this.wall;
            this.discontinuity=false;
            if (elapsed > MAX_TICK_MS || elapsed < 0 || Math.abs(wallElapsed-elapsed) > 1000) {
                // Suspended browser/device sleep or clock changes must never earn a catch-up interval.
                this.lastAction=-Infinity;
                this.discontinuity=true;
            } else if (this.eligible && eligible && elapsed > 0) {
                // Only the course book's audio can extend a manual interaction lease, up to ten minutes.
                const stop=Math.min(mono, this.lastAction+(readingAudio ? 600000 : IDLE_MS));
                if (stop > this.mono) appendRange(this.ranges, Math.round(this.wall),
                    Math.round(this.wall + stop-this.mono));
            }
            this.wall=wall; this.mono=mono; this.eligible=eligible;
        }
        activity(wall, mono, eligible, trusted) {
            this.tick(wall,mono,eligible);
            if (trusted && eligible) this.lastAction=mono;
        }
        pause(wall, mono) {
            this.tick(wall,mono,this.eligible);
            this.eligible=false; this.lastAction=-Infinity;
        }
        drain() { const result=this.ranges; this.ranges=[]; return result; }
    }
    function pageContext(win) {
        const saved=win.localStorage.getItem('currentUserName');
        if (win.isAdmin || ['아빠','엄마','어른'].includes(saved)) return null;
        if (win.__guardianStudyPhase === 'paused' || win.document.getElementById('screenTimeReceiptModal')) return null;
        const path=win.location.pathname;
        if (/playground|deprecated|parent_|admin|print_|library|gallery|my-room|timetable/.test(path)) return null;
        let subject=path.match(/\/subjects\/(math|korean|english|science|society)\//)?.[1];
        if (/\/quest_runner\.html$/.test(path)) subject=new URLSearchParams(win.location.search).get('subject') || 'math';
        if (/\/subjects\/common\/storybook_viewer\.html$/.test(path)) {
            subject=new URLSearchParams(win.location.search).get('subject');
        }
        if (/\/common_space\/voca\.html$/.test(path)) subject='voca';
        const subjects={math:'수학',korean:'국어',english:'영어',science:'과학',society:'사회',voca:'용어사전'};
        if (!subjects[subject]) return null;
        const landing=new RegExp(`/subjects/${subject}/${subject}\\.html$`).test(path);
        const overlay=win.document.getElementById('missionOverlay');
        if (landing && !(overlay && overlay.getClientRects().length) && !win.__quizRewardSession) return null;
        // 퀘스트에 전달된 학생과 측정 기록의 학생을 일치시킵니다.
        const questUser=/\/quest_runner\.html$/.test(path) ? new URLSearchParams(win.location.search).get('user') : null;
        const child=questUser ? (['minseo','daughter'].includes(questUser) ? '민서' : '민수') : (win.localStorage.getItem('currentUser') === 'daughter'
            || win.localStorage.getItem('currentChild') === 'minseo' || saved === '민서') ? '민서' : '민수';
        return {child, subject:subjects[subject], kind:(win.__guardianStudyPhase === 'quiz'
            || win.__quizRewardSession || /quest_runner\.html$/.test(path)) ? 'quiz' : 'study'};
    }
    function createBrowserMeter(win) {
        const store=win.localStorage;
        const config=win.APP_CONFIG || {};
        const proxy=config.WORKER_PROXY_URL || 'https://minmin-notion.awslike6.workers.dev';
        const database=config.STUDY_LOG_DB_ID || '37aa27115b688001b2ffe5e6c8f82ab2';
        const clock=new ActivityClock(Date.now(),win.performance.now());
        let context=null, id=win.crypto.randomUUID(), lastFlush=Date.now(), lastSave=0;
        let sending=false, retryAt=0, failures=0, storageHealthy=true, lastTrusted=-Infinity;
        let foregroundInput=false, answers=[], uploadPromise;
        const answered=new Set();
        const keys=prefix => Object.keys(store).filter(key => key.startsWith(prefix));
        const parse=key => { try { return JSON.parse(store.getItem(key)); } catch { return null; } };
        // 일부 모바일 WebView는 실제 터치 중에도 hasFocus=false를 반환합니다.
        // 신뢰할 수 있는 입력만 대체 근거로 쓰며 blur/숨김에서 즉시 해제합니다.
        const visible=() => win.document.visibilityState === 'visible' && (win.document.hasFocus() || foregroundInput);
        const rich=text => [{text:{content:text}}];
        function makeRecord(ranges) {
            if (!context || (!ranges.length && !answers.length)) return null;
            return {v:3,id,kind:context.kind,ranges,answers:answers.slice(),child:context.child,subject:context.subject,savedAt:Date.now()};
        }
        function save(key, record) {
            try { store.setItem(key,JSON.stringify(record)); storageHealthy=true; return true; }
            catch { storageHealthy=false; console.warn('[학습 측정] 저장 공간에 기록하지 못했습니다.'); return false; }
        }
        function updateLocal(record) {
            for (const answer of record.answers || []) {
                const key=CORRECT+record.child+'_'+dayKey(answer.at);
                save(key,Array.from(new Set([...(parse(key) || []),answer.id])));
            }
            const dates=new Set(record.ranges.flatMap(([a,b]) => [dayKey(a),dayKey(b-1)]));
            for (const date of dates) {
                const key=LOCAL+record.child+'_'+date;
                const old=parse(key) || [];
                const ranges=old.concat(record.ranges).sort((a,b) => a[0]-b[0]);
                const merged=[];
                for (const [a,b] of ranges) {
                    const last=merged[merged.length-1];
                    if (last && a <= last[1]) last[1]=Math.max(last[1],b); else merged.push([a,b]);
                }
                save(key,merged);
                const minutes=Math.floor(unionMilliseconds(merged,date)/60000);
                // Compatibility display only. The server independently merges the same intervals.
                store.setItem(`MINMIN_DAILY_STUDY_TIME_${record.child}_${date}`,String(minutes));
            }
        }
        function checkpoint() {
            const record=makeRecord(clock.ranges);
            if (record && save(ACTIVE+id,record)) { updateLocal(record); lastSave=Date.now(); }
        }
        function seal() {
            const record=makeRecord(clock.ranges);
            if (record && !save(QUEUE+id,record)) return false;
            if (record) updateLocal(record);
            store.removeItem(ACTIVE+id);
            clock.drain(); answers=[]; id=win.crypto.randomUUID(); lastFlush=Date.now();
            return true;
        }
        function sample() {
            const next=pageContext(win), wall=Date.now(), mono=win.performance.now();
            if (JSON.stringify(next) !== JSON.stringify(context)) {
                clock.pause(wall,mono);
                if (!seal()) return;
                context=next;
                if (context && visible() && mono-lastTrusted < 1000) clock.lastAction=lastTrusted;
            }
            const audio=win.document.getElementById('mainAudio');
            clock.tick(wall,mono,!!context && visible(),!!audio && !audio.paused && !audio.ended);
            // Keep valid intervals from before a clock correction in their own immutable batch.
            if (clock.discontinuity && clock.ranges.length) seal();
            // Include this tick before sealing, so the first 60 seconds award a complete minute.
            if (wall-lastFlush >= 60000 && (clock.ranges.length || answers.length)) seal();
            if (wall-lastSave >= 5000) checkpoint();
        }
        function recover() {
            for (const key of keys(ACTIVE)) {
                if (key === ACTIVE+id) continue;
                const record=parse(key);
                if (record && Date.now()-record.savedAt > 120000 && save(QUEUE+record.id,record)) store.removeItem(key);
            }
            const cutoff=dayKey(Date.now()-7*86400000);
            for (const key of [...keys(LOCAL),...keys(CORRECT)]) if (key.slice(-10) < cutoff) store.removeItem(key);
        }
        function payload(record) {
            const times=record.ranges.flat().concat((record.answers || []).map(a => a.at));
            const start=Math.min(...times), end=Math.max(...times);
            const measurement=JSON.stringify({v:record.v,id:record.id,kind:record.kind,ranges:record.ranges,
                ...(record.v === 3 ? {answers:record.answers || []} : {})});
            const parts=[];
            for (let i=0;i<measurement.length;i+=1900) parts.push({text:{content:measurement.slice(i,i+1900)}});
            return {parent:{database_id:database},properties:{
                'ID':{title:rich('학습활동_'+record.id)},'학생':{select:{name:record.child}},
                '과목':{rich_text:rich(record.subject)},'입장':{date:{start:new Date(start).toISOString()}},
                '퇴장':{date:{start:new Date(end).toISOString()}},
                '소요시간':{number:record.ranges.reduce((n,[a,b]) => n+b-a,0)/60000},
                '활동측정':{rich_text:parts}
            }};
        }
        async function uploadBatch() {
            if (sending || win.navigator.onLine === false || Date.now() < retryAt) return;
            sending=true;
            try {
                recover();
                // Limit each burst; retained immutable records are retried without minting duplicate time.
                for (const key of keys(QUEUE).slice(0,1)) {
                    const record=parse(key);
                    if (!record || !Array.isArray(record.ranges) || (!record.ranges.length && !record.answers?.length)) { store.removeItem(key); continue; }
                    // Read before retrying a potentially committed write (including HTTP 503).
                    // 프록시 CORS 허용 헤더만 사용합니다. Pragma는 브라우저 전송을 차단합니다.
                    const options={method:'POST',headers:{'Content-Type':'application/json'},
                        signal:AbortSignal.timeout(8000)};
                    const query=await win.fetch(`${proxy}/v1/databases/${database}/query`,{...options,body:JSON.stringify({
                        page_size:1,filter:{property:'ID',title:{equals:'학습활동_'+record.id}}})});
                    if (!query.ok) throw query;
                    const found=await query.json();
                    if (!Array.isArray(found.results)) throw new Error('Invalid study response');
                    if (!found.results.length) {
                        const response=await win.fetch(`${proxy}/v1/pages`,{...options,body:JSON.stringify(payload(record))});
                        if (!response.ok) throw response;
                    }
                    store.removeItem(key); failures=0;
                    retryAt=Date.now()+2000;
                }
            } catch (error) {
                failures++;
                const seconds=Number(error.headers?.get('Retry-After')) || Math.min(300,2**Math.min(failures,8));
                retryAt=Date.now()+seconds*1000;
                console.warn('[학습 측정] 전송 대기 중입니다. 저장된 기록은 다음 접속에서 재시도합니다.');
            } finally { sending=false; }
        }
        function upload() {
            if (sending) return uploadPromise;
            uploadPromise=uploadBatch(); return uploadPromise;
        }
        function flush() { sample(); seal(); return upload(); }
        function pause() { foregroundInput=false; clock.pause(Date.now(),win.performance.now()); seal(); upload(); }
        const handler=event => {
            if (event.isTrusted === true) { lastTrusted=win.performance.now(); foregroundInput=true; }
            sample();
            clock.activity(Date.now(),win.performance.now(),!!context && visible(),event.isTrusted === true);
        };
        for (const type of ['pointerdown','pointermove','keydown','touchstart','wheel']) {
            // Mouse hovering is not studying; dragging/drawing with a pressed pointer is.
            win.document.addEventListener(type,event => {
                if (type === 'pointermove' && !event.buttons) return;
                handler(event);
            },{capture:true,passive:true});
        }
        win.document.addEventListener('visibilitychange',() => {
            if (win.document.visibilityState !== 'visible') pause(); else sample();
        });
        win.addEventListener('blur',pause);
        win.addEventListener('pagehide',pause);
        win.addEventListener('pageshow',sample);
        win.addEventListener('online',upload);
        win.setInterval(() => { sample(); upload(); },1000);
        sample(); recover(); upload();
        return {flush,clock, recordCorrect(answerId) {
            sample();
            // 채점 결과 내용은 저장하지 않습니다. 같은 시도/문항의 중복 호출만 제거합니다.
            if (!context || context.kind !== 'quiz' || !visible() || win.performance.now()-lastTrusted > 5000
                || typeof answerId !== 'string' || !answerId.length || answerId.length > 160 || answered.has(answerId)) return false;
            answered.add(answerId); answers.push({id:answerId,at:Date.now()});
            checkpoint(); return true;
        }, getTodayMinutes(child) {
            const date=dayKey(Date.now());
            const local=Math.floor(unionMilliseconds(parse(LOCAL+child+'_'+date)||[],date)/60000);
            const cloud=Number(store.getItem('GUARDIAN_STUDY_V2_CLOUD_'+child+'_'+date)) || 0;
            return Math.max(local,cloud);
        }, setPhase(phase) {
            pause(); win.__guardianStudyPhase=phase;
            if (phase === 'quiz' && win.performance.now()-lastTrusted < 1000) foregroundInput=true;
            sample();
        }, getTodayCorrectAnswers(child) { return (parse(CORRECT+child+'_'+dayKey(Date.now())) || []).length;
        }, getStatus() { return {storageHealthy,pending:keys(QUEUE).length,failures,
            eligible:!!context && visible(),idle:win.performance.now()-clock.lastAction >= IDLE_MS}; }};
    }
    const api={ActivityClock,unionMilliseconds,measuredMinutes,pageContext,createBrowserMeter,IDLE_MS};
    if (typeof module !== 'undefined' && module.exports) module.exports=api;
    if (root.document && !root.StudyActivity) {
        root.StudyActivity=api;
        try { root.StudyActivity.meter=createBrowserMeter(root); root.StudyActivity.flush=() => root.StudyActivity.meter.flush(); }
        catch (error) { console.warn('[학습 측정] 초기화 실패: 활동 시간은 지급하지 않습니다.',error.message); }
        root.StudyActivity.setPhase=phase => root.StudyActivity.meter?.setPhase(phase);
        root.StudyActivity.recordCorrect=id => root.StudyActivity.meter?.recordCorrect(id);
    }
})(typeof window !== 'undefined' ? window : globalThis);
