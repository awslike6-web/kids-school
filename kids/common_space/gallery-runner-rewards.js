/** 미니 런 전용 별 저금통·꾸미기. 노션 쓰기는 「런너기록」 rich_text 한 속성으로 제한한다. */
(() => {
    const KINDS = { stage: '스테이지', trail: '꼬리', hat: '모자', star: '별 모양' };
    const item = (at, id, kind, name) => Object.freeze({ at, id, kind, name });
    const LADDERS = Object.freeze({
        son: Object.freeze([
            item(0, 'neon_grid', 'stage', '🟩 네온 격자'), item(0, 'none', 'trail', '없음'),
            item(0, 'none', 'hat', '없음'), item(0, 'bolt', 'star', '⚡ 네온 별'),
            item(40, 'neon_trail', 'trail', '⚡ 네온 잔상'), item(120, 'night_city', 'stage', '🌃 밤하늘 도시'),
            item(250, 'crown', 'hat', '👑 왕관'), item(450, 'diamond', 'star', '💎 다이아 조각'),
            item(700, 'space_station', 'stage', '🌌 우주 정거장'), item(1000, 'fire_trail', 'trail', '🔥 불꽃'),
            item(1400, 'headset', 'hat', '🎧 헤드셋'), item(1900, 'lava_cave', 'stage', '🌋 용암 동굴'),
            item(2500, 'rainbow_trail', 'trail', '🌈 무지개')
        ]),
        daughter: Object.freeze([
            item(0, 'cloud_field', 'stage', '☁️ 구름 들판'), item(0, 'none', 'trail', '없음'),
            item(0, 'none', 'hat', '없음'), item(0, 'star', 'star', '⭐ 노란 별'),
            item(60, 'sparkle_trail', 'trail', '✨ 반짝 별가루'), item(180, 'flower_field', 'stage', '🌷 꽃밭'),
            item(360, 'ribbon', 'hat', '🎀 리본'), item(650, 'heart', 'star', '💗 하트'),
            item(1000, 'seaside', 'stage', '🏖️ 바닷가'), item(1450, 'rainbow_trail', 'trail', '🌈 무지개'),
            item(2000, 'crown', 'hat', '👑 왕관'), item(2700, 'starry_night', 'stage', '🌙 별빛 밤하늘'),
            item(3500, 'bubble_trail', 'trail', '🫧 비눗방울')
        ])
    });
    const validChild = child => child === 'son' || child === 'daughter';
    const ladderOf = child => validChild(child) ? LADDERS[child] : [];
    const integer = n => Number.isSafeInteger(n) && n >= 0;
    const validFriendKey = key => typeof key === 'string' && /^art_[a-z0-9_]{1,80}#[a-z0-9_-]{1,32}$/.test(key);
    const FRIEND_LEVELS = Object.freeze([
        [0, '처음 만남'], [3, '친구'], [8, '단짝'], [15, '절친'], [25, '영혼의 단짝']
    ].map(([at, name], i) => Object.freeze({ level: i + 1, at, name })));
    const cleanFriends = raw => Object.fromEntries(Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
        .filter(([key]) => validFriendKey(key)).map(([key, n]) => [key, integer(n) ? n : 0]));
    const hasFriendPending = bank => Object.values(bank.friendsPending).some(n => n > 0);
    function mergeFriends(cloud, pending) {
        const friends = { ...cloud };
        for (const [key, n] of Object.entries(pending)) {
            const total = (friends[key] || 0) + n;
            if (!integer(total)) throw new Error('친밀도 범위 초과');
            friends[key] = total;
        }
        return friends;
    }
    const keyOf = child => `galleryRunnerBank_${child}`;
    const queues = {}, flushing = {}, timers = {};
    const today = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const dateOf = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
    const laterDate = (a, b) => a > b ? a : b;
    function isParent() {
        try { return ['아빠', '엄마'].includes(window.currentUserName) ||
            ['아빠', '엄마'].includes(localStorage.getItem('currentUserName')) || localStorage.getItem('currentUser') === 'parent'; }
        catch { return false; }
    }
    const allowed = child => validChild(child) && !isParent();
    const unlockedOf = (child, total) => ladderOf(child).filter(i => i.at <= total).map(i => i.id);
    const nextGoal = (child, total) => {
        const next = ladderOf(child).find(i => i.at > total);
        return next ? { item: next, remaining: next.at - total } : null;
    };
    const newlyUnlocked = (child, before, after) => ladderOf(child).filter(i => i.at > before && i.at <= after);
    function clean(raw, child) {
        raw = raw && typeof raw === 'object' ? raw : {};
        const total = integer(raw.total) ? raw.total : 0;
        const loadout = {};
        for (const kind of Object.keys(KINDS)) {
            const choices = (LADDERS[child] || []).filter(i => i.kind === kind);
            loadout[kind] = choices.find(i => i.id === raw.loadout?.[kind] && i.at <= total)?.id || choices[0]?.id;
        }
        return { v: 1, total, pending: integer(raw.pending) && raw.pending <= total ? raw.pending : 0,
            loadout, boostDate: dateOf(raw.boostDate), updatedAt: integer(raw.updatedAt) ? raw.updatedAt : 0,
            friends: cleanFriends(raw.friends), friendsPending: cleanFriends(raw.friendsPending) };
    }
    function readBank(child) {
        if (!validChild(child)) return null;
        if (!allowed(child)) return clean(null, child);
        try { return clean(JSON.parse(localStorage.getItem(keyOf(child))), child); }
        catch { return clean(null, child); }
    }
    function save(child, bank) {
        if (!allowed(child)) return false;
        try { localStorage.setItem(keyOf(child), JSON.stringify(bank)); return true; }
        catch { return false; }
    }
    const touch = bank => { bank.updatedAt = Math.max(Date.now(), bank.updatedAt + 1); };
    function friendshipOf(child, key) {
        const runs = allowed(child) && validFriendKey(key) ? readBank(child).friends[key] || 0 : 0;
        const stage = FRIEND_LEVELS.findLast(stage => runs >= stage.at), next = FRIEND_LEVELS[stage.level];
        return { runs, level: stage.level, name: stage.name,
            next: next ? { level: next.level, remaining: next.at - runs } : null };
    }
    function addRun(child, key) {
        if (!allowed(child) || !validFriendKey(key)) return false;
        const bank = readBank(child), runs = (bank.friends[key] || 0) + 1, pending = (bank.friendsPending[key] || 0) + 1;
        if (!integer(runs) || !integer(pending)) return false;
        bank.friends[key] = runs; bank.friendsPending[key] = pending;
        if (!save(child, bank)) return false;
        void flush(child); return bank;
    }
    function addStars(child, n) {
        if (!allowed(child) || !integer(n)) return false;
        const bank = readBank(child);
        if (!integer(bank.total + n) || !integer(bank.pending + n)) return false;
        bank.total += n; bank.pending += n;
        if (!save(child, bank)) return false;
        void flush(child); return bank;
    }
    function setLoadout(child, kind, id) {
        if (!allowed(child)) return false;
        const bank = readBank(child);
        if (!(LADDERS[child] || []).some(i => i.kind === kind && i.id === id && i.at <= bank.total)) return false;
        bank.loadout[kind] = id; touch(bank);
        if (!save(child, bank)) return false;
        clearTimeout(timers[child]); timers[child] = setTimeout(() => { void flush(child); }, 1000);
        return true;
    }
    function enqueue(child, task) {
        const next = (queues[child] || Promise.resolve()).then(task).catch(error => {
            console.warn('[별 저금통 동기화]', error); return false;
        });
        queues[child] = next; return next;
    }
    async function cloudOf(child) {
        if (!allowed(child)) return null;
        const config = typeof APP_CONFIG === 'undefined' ? {} : APP_CONFIG;
        const proxy = (config.WORKER_PROXY_URL || 'https://minmin-notion.awslike6.workers.dev').replace(/\/$/, '');
        const db = config.INVENTORY_DB_ID || '374a27115b688042bb61e6a102242e12';
        const name = child === 'daughter' ? '민서' : '민수', cacheKey = `MINMIN_INVENTORY_PAGE_ID_${name}`;
        let pageId;
        try { pageId = localStorage.getItem(cacheKey); } catch { /* 캐시 없이 조회한다. */ }
        const headers = { 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' };
        if (!pageId) {
            const response = await fetch(`${proxy}/v1/databases/${db}/query`, { method: 'POST', headers,
                body: JSON.stringify({ filter: { property: '이름', title: { equals: name } } }) });
            if (!response.ok) throw new Error(`인벤토리 조회 ${response.status}`);
            pageId = (await response.json()).results?.[0]?.id;
            if (!pageId) return null;
            try { localStorage.setItem(cacheKey, pageId); } catch { /* 캐시 실패는 저장을 막지 않는다. */ }
        }
        if (!allowed(child)) return null;
        const url = `${proxy}/v1/pages/${encodeURIComponent(pageId)}`;
        const response = await fetch(`${url}?force=true`, { headers });
        if (!response.ok) throw new Error(`저금통 조회 ${response.status}`);
        const property = (await response.json()).properties?.['런너기록'];
        // 숫자형 등 잘못 만든 속성에도 PATCH하지 않는다. 다른 속성은 읽지 않는다.
        if (property?.type !== 'rich_text' || !Array.isArray(property.rich_text)) return null;
        const text = property.rich_text.map(part => part.plain_text ?? part.text?.content ?? '').join('');
        const raw = text ? JSON.parse(text) : {};
        if (text && (!raw || raw.v !== 1 || !integer(raw.total))) throw new Error('저금통 JSON 형식 오류');
        return { url, headers, bank: clean(raw, child) };
    }
    function merged(child, cloud, local) {
        const total = cloud.total + local.pending;
        if (!integer(total)) throw new Error('별 개수 범위 초과');
        return clean({ ...local, total, loadout: cloud.updatedAt > local.updatedAt ? cloud.loadout : local.loadout,
            updatedAt: Math.max(cloud.updatedAt, local.updatedAt), boostDate: laterDate(cloud.boostDate, local.boostDate),
            friends: mergeFriends(cloud.friends, local.friendsPending) }, child);
    }
    async function pull(child) {
        if (!allowed(child)) return false;
        const result = await enqueue(child, async () => {
            const cloud = await cloudOf(child);
            return cloud && allowed(child) ? save(child, merged(child, cloud.bank, readBank(child))) : false;
        });
        if (result && (readBank(child).pending || hasFriendPending(readBank(child)))) return flush(child);
        return Boolean(result);
    }
    function packPayload(payload, pending) {
        const removable = Object.keys(payload.friends).filter(key => !pending[key])
            .sort((a, b) => payload.friends[a] - payload.friends[b] || (a < b ? -1 : a > b ? 1 : 0));
        let text = JSON.stringify(payload);
        for (const key of removable) {
            if (text.length <= 1900) break;
            delete payload.friends[key]; text = JSON.stringify(payload);
        }
        // 미전송 항목만으로 한도를 넘으면 전송·로컬 변경 없이 다음 저장을 기다린다.
        if (text.length > 1900) throw new Error('친밀도 미전송 기록이 1900자를 넘습니다');
        return text;
    }
    async function flushOnce(child) {
        const cloud = await cloudOf(child);
        if (!cloud || !allowed(child)) return false;
        const snapshot = readBank(child), bank = merged(child, cloud.bank, snapshot);
        const { pending, friendsPending, ...payload } = bank;
        payload.updatedAt = Math.max(Date.now(), bank.updatedAt);
        const content = packPayload(payload, friendsPending);
        const response = await fetch(cloud.url, { method: 'PATCH', headers: cloud.headers,
            body: JSON.stringify({ properties: { '런너기록': { rich_text: [{ text: { content } }] } } }) });
        if (!response.ok) throw new Error(`저금통 저장 ${response.status}`);
        if (!allowed(child)) return false;
        // PATCH 도중 번 별·바꾼 꾸미기는 보존하고 보낸 pending만 차감한다.
        const latest = readBank(child), rest = latest.pending - snapshot.pending;
        if (rest < 0) throw new Error('저장 중 저금통이 바뀌었습니다');
        const friendsRest = {};
        for (const key of new Set([...Object.keys(snapshot.friendsPending), ...Object.keys(latest.friendsPending)])) {
            const n = (latest.friendsPending[key] || 0) - (snapshot.friendsPending[key] || 0);
            if (!integer(n)) throw new Error('저장 중 친밀도가 바뀌었습니다');
            if (n) friendsRest[key] = n;
        }
        return save(child, clean({ ...payload, total: payload.total + rest, pending: rest,
            friends: mergeFriends(payload.friends, friendsRest), friendsPending: friendsRest,
            loadout: latest.updatedAt > snapshot.updatedAt ? latest.loadout : payload.loadout,
            updatedAt: Math.max(latest.updatedAt, payload.updatedAt), boostDate: laterDate(latest.boostDate, payload.boostDate) }, child));
    }
    function flush(child) {
        if (!allowed(child)) return Promise.resolve(false);
        // 같은 실행 구간의 별·친밀도 적립은 GET을 시작하기 전에 한 요청으로 묶는다.
        if (flushing[child]) { if (flushing[child].started) flushing[child].again = true; return flushing[child].promise; }
        const job = flushing[child] = { again: false, started: false };
        job.promise = enqueue(child, async () => {
            job.started = true;
            let result;
            do { job.again = false; result = await flushOnce(child); } while (job.again && result && allowed(child));
            return result;
        }).finally(() => { delete flushing[child]; });
        return job.promise;
    }
    function markQuestBoost(child) {
        if (!allowed(child)) return false;
        const bank = readBank(child); bank.boostDate = today();
        if (!save(child, bank)) return false;
        void flush(child); return true;
    }
    const hasBoostToday = child => allowed(child) && readBank(child).boostDate === today();

    // 그리기 좌표는 모두 화면 높이 단위이며 프레임·저장소·DOM을 직접 다루지 않는다.
    function drawStage(ctx, world, id) {
        const w = world.width, d = world.distance;
        const colors = { neon_grid: '#1a1033', night_city: '#17213b', space_station: '#151c30', lava_cave: '#302027',
            cloud_field: '#e6f6fb', flower_field: '#ecf4e8', seaside: '#dbeef0', starry_night: '#252c4d' };
        ctx.fillStyle = colors[id] || colors.neon_grid; ctx.fillRect(0, 0, w, 1);
        ctx.save(); ctx.lineWidth = .002;
        const drift = (i, gap = .28) => ((i * gap - d * .1) % (w + gap) + w + gap) % (w + gap) - gap;
        if (id === 'neon_grid') {
            ctx.strokeStyle = '#00ff9d35'; ctx.beginPath();
            for (let x = -(d * .15 % .15); x < w; x += .15) { ctx.moveTo(x, 0); ctx.lineTo(x, 1); }
            for (let y = 0; y < 1; y += .1) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();
        } else if (id === 'cloud_field' || id === 'flower_field' || id === 'seaside') {
            ctx.fillStyle = '#ffffffb0';
            for (let i = 0; i < 7; i++) {
                ctx.beginPath(); ctx.ellipse(drift(i, .63), .16 + i % 3 * .08, .18, .035, 0, 0, Math.PI * 2); ctx.fill();
            }
            if (id === 'flower_field') {
                ctx.fillStyle = '#d9e8cf'; ctx.fillRect(0, .61, w, .22);
                ctx.font = '.038px serif'; for (let i = 0; i < 14; i++) ctx.fillText('🌷', drift(i), .72 + i % 3 * .035);
            } else if (id === 'seaside') {
                ctx.fillStyle = '#a9ced4'; ctx.fillRect(0, .53, w, .19);
                ctx.fillStyle = '#e4d9bd'; ctx.fillRect(0, .72, w, .11);
                ctx.strokeStyle = '#efffff90'; ctx.beginPath();
                for (let i = 0; i < 12; i++) { const x = drift(i); ctx.moveTo(x, .65); ctx.lineTo(x + .1, .65); }
                ctx.stroke();
            }
        } else if (id === 'night_city') {
            for (let i = 0; i < 18; i++) {
                const x = drift(i), h = .15 + i % 4 * .05;
                ctx.fillStyle = '#293550'; ctx.fillRect(x, .78 - h, .19, h);
                ctx.fillStyle = '#8c987b'; ctx.fillRect(x + .04, .8 - h, .02, .02);
            }
        } else if (id === 'lava_cave') {
            ctx.fillStyle = '#604039'; ctx.beginPath(); ctx.moveTo(0, .8);
            for (let i = 0; i < 20; i++) ctx.lineTo(drift(i, .21) + .21, .68 + i % 3 * .04);
            ctx.lineTo(w, .83); ctx.lineTo(0, .83); ctx.fill();
        } else {
            ctx.fillStyle = '#d0d8e890';
            for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.arc(drift(i, .19), .07 + i % 7 * .065, .0025, 0, Math.PI * 2); ctx.fill(); }
            if (id === 'space_station') {
                ctx.strokeStyle = '#8299ad70'; ctx.beginPath(); ctx.ellipse(drift(3, .5), .28, .24, .08, -.3, 0, Math.PI * 2); ctx.stroke();
            } else {
                ctx.fillStyle = '#ddd8b6'; ctx.beginPath(); ctx.arc(drift(2, .6), .2, .05, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    }
    function drawTrail(ctx, points, id) {
        if (id === 'none') return;
        ctx.save();
        const colors = { neon_trail: '#48e9ae', fire_trail: '#ef9755', sparkle_trail: '#d89fb9', bubble_trail: '#86bcca' };
        points.forEach((p, i) => {
            ctx.globalAlpha = (i + 1) / points.length * .55;
            ctx.fillStyle = id === 'rainbow_trail' ? `hsl(${i * 33} 70% 65%)` : colors[id] || '#d89fb9';
            ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .002;
            ctx.beginPath(); ctx.arc(p.x - (points.length - i) * .012, p.y, .006 + i * .0008, 0, Math.PI * 2);
            if (id === 'bubble_trail') ctx.stroke(); else ctx.fill();
        });
        ctx.restore();
    }
    function drawHat(ctx, player, id) {
        const emoji = { crown: '👑', headset: '🎧', ribbon: '🎀' }[id];
        if (!emoji) return;
        ctx.save(); ctx.font = `${player.h * .35}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, -player.h * .48); ctx.restore();
    }
    function drawStar(ctx, star, x, id) {
        const cx = x + star.w / 2, cy = star.y + star.h / 2;
        ctx.save(); ctx.fillStyle = id === 'star' ? '#eea527' : id === 'heart' ? '#d45d87' : '#00df98';
        ctx.strokeStyle = id === 'star' || id === 'heart' ? '#664232' : '#c2ffe5'; ctx.lineWidth = .002;
        ctx.beginPath();
        if (id === 'heart') {
            ctx.moveTo(cx, cy + .022); ctx.bezierCurveTo(cx - .05, cy - .01, cx - .012, cy - .04, cx, cy - .012);
            ctx.bezierCurveTo(cx + .012, cy - .04, cx + .05, cy - .01, cx, cy + .022);
        } else if (id === 'diamond' || id === 'bolt') {
            const vertices = id === 'diamond' ? [[0, -.027], [.023, 0], [0, .027], [-.023, 0]] :
                [[.008, -.028], [-.022, .005], [-.002, .005], [-.008, .028], [.023, -.008], [.003, -.008]];
            vertices.forEach(([dx, dy], i) => i ? ctx.lineTo(cx + dx, cy + dy) : ctx.moveTo(cx + dx, cy + dy));
        } else {
            for (let i = 0; i < 10; i++) {
                const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? .012 : .025;
                if (i) ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
        }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    function ensureStyle() {
        if (document.getElementById('grr-style')) return;
        const style = document.createElement('style'); style.id = 'grr-style';
        style.textContent = `.gmr-message{overflow-y:auto;justify-content:safe center;box-sizing:border-box}
            .grr-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:760px}
            .grr-row h3{width:100%;margin:4px}.grr-row button[aria-pressed=true]{border:3px solid #00a877;background:#d9ffee}
            .grr-row button{min-height:44px;max-width:100%;font-size:14px}.grr-summary{max-width:100%;flex-shrink:0}
            .grr-summary progress{width:min(280px,70vw);display:block;margin:8px auto}`;
        document.head.appendChild(style);
    }
    function appendBankSummary(session, child, total, gifts = []) {
        ensureStyle();
        const host = document.createElement('div'); host.className = 'grr-summary';
        const text = document.createElement('div'); text.textContent = `별 저금통 ⭐ ${total}개`; host.appendChild(text);
        const goal = nextGoal(child, total);
        if (goal) {
            const bar = document.createElement('progress'); bar.max = goal.item.at; bar.value = total;
            bar.setAttribute('aria-label', `다음 선물 ${goal.item.name}`); host.appendChild(bar);
            const label = document.createElement('div'); label.textContent = `다음 선물 ${goal.item.name}까지 ⭐ ${goal.remaining}개`; host.appendChild(label);
        }
        if (gifts.length) {
            const label = document.createElement('div'); label.textContent = `🎁 새 선물: ${gifts.map(i => i.name).join(', ')}!`; host.appendChild(label);
        }
        session.message.insertBefore(host, session.message.querySelector('button'));
    }
    function openWardrobe(session, { child, viewer, onBack }) {
        if (!validChild(child)) return false;
        ensureStyle();
        const preview = viewer === 'parent' || isParent();
        const bank = preview ? clean({ total: Number.MAX_SAFE_INTEGER, loadout: session.previewLoadout }, child) : readBank(child);
        session.message.replaceChildren(); session.message.hidden = false;
        const title = document.createElement('strong'); title.textContent = '🎨 꾸미기'; session.message.appendChild(title);
        const notice = document.createElement('div'); notice.setAttribute('role', 'status');
        for (const [kind, label] of Object.entries(KINDS)) {
            const row = document.createElement('div'); row.className = 'grr-row';
            row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
            const heading = document.createElement('h3'); heading.textContent = label; row.appendChild(heading);
            for (const gift of LADDERS[child].filter(i => i.kind === kind)) {
                const button = document.createElement('button'); button.type = 'button';
                const locked = gift.at > bank.total;
                button.textContent = `${gift.name}${locked ? ` · 🔒 ⭐ ${gift.at - bank.total}개 더` : ''}`;
                button.setAttribute('aria-pressed', String(bank.loadout[kind] === gift.id));
                button.onclick = () => {
                    if (locked) { notice.textContent = `별을 ${gift.at - bank.total}개 더 모으면 열려요!`; return; }
                    if (preview) session.previewLoadout = { ...bank.loadout, [kind]: gift.id };
                    else if (!setLoadout(child, kind, gift.id)) { notice.textContent = '이 기기에 저장하지 못했어요.'; return; }
                    session.loadout = preview ? session.previewLoadout : readBank(child).loadout;
                    bank.loadout = { ...session.loadout };
                    row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
                    session.redraw?.(); notice.textContent = `${gift.name} 골랐어요!`;
                };
                row.appendChild(button);
            }
            session.message.appendChild(row);
        }
        session.message.appendChild(notice);
        const back = document.createElement('button'); back.type = 'button'; back.textContent = '돌아가기'; back.onclick = onBack;
        session.message.appendChild(back); session.message.querySelector('button')?.focus(); return true;
    }
    window.GalleryRunnerRewards = Object.freeze({ LADDERS, FRIEND_LEVELS, friendshipOf, addRun, unlockedOf, nextGoal, newlyUnlocked, readBank, addStars, setLoadout,
        pull, flush, markQuestBoost, hasBoostToday, drawStage, drawTrail, drawHat, drawStar, openWardrobe, appendBankSummary });
})();
