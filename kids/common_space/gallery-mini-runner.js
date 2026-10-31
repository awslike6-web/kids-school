/** 갤러리 캐릭터 60초 미니 런. 별 저금통·꾸미기는 GalleryRunnerRewards에 위임한다. */
(() => {
    const PROFILES = {
        daughter: { speed: .25, minSpeed: .15, maxSpeed: .38, gap: 2.6, obstacle: .10, starGap: .65 },
        son: { speed: .40, minSpeed: .18, maxSpeed: .58, gap: 2.0, obstacle: .25, starGap: .95 }
    };
    const DURATION = 60000, GRAVITY = .95, JUMP = .62, GROUND = .83;
    const OBSTACLE_WIDTH = .05, MAX_HITBOX_WIDTH = .08, PLAYER_HEIGHT = .18;
    const PLAYER_ANCHOR = .16, LEFT_MARGIN = .01, BOOST = 1.12, BOOST_AT = 30000;
    const speedOf = (width, child) => Math.max(PROFILES[child].minSpeed,
        Math.min(PROFILES[child].maxSpeed, width * PROFILES[child].speed));
    const playerX = (width, spriteWidth) => Math.max(LEFT_MARGIN, width * PLAYER_ANCHOR - spriteWidth / 2);
    let active = null;
    let toast = null;

    // 물리는 화면 높이 단위. 좁은 화면의 통과 거리와 넓은 화면의 속도 상한을 보장한다.
    function createWorld(seed = 1, profile = 'son') {
        const settings = typeof profile === 'string' ? { child: profile } : profile || {};
        const child = settings.child === 'daughter' ? 'daughter' : 'son';
        const width = Math.max(.35, Math.min(4, Number(settings.aspect) || 1.6));
        const spriteWidth = PLAYER_HEIGHT * Math.max(.01, Number(settings.spriteAspect) || 1);
        const config = PROFILES[child];
        let state = Number(seed) >>> 0;
        const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
        const speed = speedOf(width, child);
        const obstacles = [], stars = [];
        for (let time = 3; time < 72; time += config.gap + random()) {
            const h = child === 'daughter' ? .06 + random() * .04 : .08 + random() * (config.obstacle - .08);
            obstacles.push({ x: width + time * speed, y: GROUND - h, w: OBSTACLE_WIDTH, h, hit: false });
        }
        for (let time = .7; time < 72; time += config.starGap) {
            stars.push({ x: width + time * speed, y: GROUND - .06 - random() * (child === 'daughter' ? .06 : .35),
                w: .045, h: .045, taken: false });
        }
        return { seed, child, width, speed, magnet: settings.magnet === true, elapsed: 0, distance: 0, score: 0, status: 'running',
            invincible: 0, hits: 0, player: { x: playerX(width, spriteWidth), y: GROUND - PLAYER_HEIGHT,
                w: spriteWidth, h: PLAYER_HEIGHT, vy: 0, jumps: 0 },
            obstacles, stars };
    }

    function hitboxOf(sprite, x, y, w, h) {
        const boxWidth = Math.min(w * .7, MAX_HITBOX_WIDTH);
        return { x: x + (w - boxWidth) / 2, y: y + h * .15, w: boxWidth, h: h * .7 };
    }

    function resizeWorld(world, aspect) {
        if (!Number.isFinite(aspect) || aspect <= 0 || Math.abs(aspect - world.width) <= .001) return world;
        const nextX = playerX(aspect, world.player.w), shift = nextX - world.player.x;
        // 진행 거리는 바꾸지 않고 같은 양만큼 옮겨 통과 여부와 접근 거리를 보존한다.
        world.obstacles.forEach(item => { item.x += shift; });
        world.stars.forEach(item => { item.x += shift; });
        world.player.x = nextX;
        world.width = aspect; world.speed = speedOf(aspect, world.child);
        return world;
    }

    function overlaps(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function step(world, input = {}, dtMs = 0) {
        if (world.status !== 'running') return world;
        const ms = Math.max(0, Math.min(50, Number(dtMs) || 0, DURATION - world.elapsed));
        if (!ms) return world;
        const dt = ms / 1000, p = world.player;
        world.elapsed += ms;
        world.invincible = Math.max(0, world.invincible - ms);
        if (input.jump && p.jumps < 2) { p.vy = -JUMP; p.jumps++; }
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.vy = 0; p.jumps = 0; }
        world.distance += world.speed * dt * (world.child === 'son' && world.elapsed >= BOOST_AT ? BOOST : 1);
        const box = hitboxOf(null, p.x, p.y, p.w, p.h);
        for (const obstacle of world.obstacles) {
            const rect = { ...obstacle, x: obstacle.x - world.distance };
            if (!obstacle.hit && !world.invincible && overlaps(box, rect)) {
                obstacle.hit = true;
                world.score = Math.max(0, world.score - 1);
                world.invincible = 800;
                world.hits++;
                p.vy = -.55;
            }
        }
        const starBox = world.magnet ? { x: box.x - .05, y: box.y - .05, w: box.w + .1, h: box.h + .1 } : box;
        for (const star of world.stars) {
            if (!star.taken && overlaps(starBox, { ...star, x: star.x - world.distance })) {
                star.taken = true;
                world.score++;
            }
        }
        if (world.elapsed >= DURATION) world.status = 'finished';
        return world;
    }

    function ensureStyle() {
        if (document.getElementById('gmr-style')) return;
        const style = document.createElement('style');
        style.id = 'gmr-style';
        style.textContent = `
            .gmr{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;background:#1a1033;
                color:#f5f3ff;font-family:system-ui,sans-serif;overscroll-behavior:contain}
            .gmr[data-child=daughter]{background:#fff8f0;color:#713d58}
            .gmr header{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px;flex-shrink:0}
            .gmr h2{font-size:clamp(15px,3vw,22px);margin:0;flex:1;min-width:100px;overflow-wrap:anywhere}
            .gmr button,.gmr-equip button{min-width:44px;min-height:44px;padding:8px 12px;border:1px solid #868099;
                border-radius:16px;background:#fff;color:#342048;font:inherit;cursor:pointer}
            .gmr button:focus-visible{outline:3px solid #00b879;outline-offset:2px}
            .gmr-stage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:manipulation}
            .gmr canvas{display:block;width:100%;height:100%}
            .gmr-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                flex-direction:column;gap:14px;padding:20px;text-align:center;background:#1a1033e8}
            .gmr[data-child=daughter] .gmr-message{background:#fff8f0ed}
            .gmr-message[hidden]{display:none}
            .gmr-message strong{font-size:clamp(22px,5vw,36px)}
            .gmr p{margin:6px 10px;text-align:center;font-size:14px}
            .gmr-equip{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
            .gmr-equip[hidden]{display:none}
            .gmr-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);max-width:90vw;
                width:max-content;background:#33204d;color:white;padding:14px 18px;border-radius:18px;
                z-index:100001;box-sizing:border-box;text-align:center}
        `;
        document.head.appendChild(style);
    }

    // 퀘스트용 녹음(정답·완주)이 끼어들지 않도록 프리셋 라우터를 건너뛰고 상황 문장을 그대로 읽는다.
    function say(text) {
        if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text, { skipPreset: true });
    }

    function viewerOf(viewer) {
        if (viewer) return viewer;
        if (['아빠', '엄마'].includes(window.currentUserName)) return 'parent';
        try { return localStorage.getItem('currentUser') || 'son'; } catch (e) { return 'son'; }
    }

    function viewerOfChild() {
        try { return localStorage.getItem('currentUser') === 'daughter' ? 'daughter' : 'son'; }
        catch (e) { return 'son'; }
    }

    function notify(message) {
        ensureStyle();
        if (toast) { clearTimeout(toast.timer); toast.node.remove(); }
        const node = document.createElement('div');
        node.className = 'gmr-toast';
        node.setAttribute('role', 'status');
        node.textContent = message;
        document.body.appendChild(node);
        toast = { node, timer: setTimeout(() => { node.remove(); toast = null; }, 2000) };
    }

    // 모달 매니저는 이 연결 함수만 호출한다. 키·JSON 형식은 로스터에서만 다룬다.
    function bindModal(item, { available = true, viewer, selectedKey } = {}) {
        const host = document.getElementById('modalCharacterActions');
        if (!host) return;
        host.replaceChildren();
        host.hidden = true;
        const roster = window.MonsterRoster;
        const characters = roster?.charactersOf(item) || [];
        if (!available || !characters.length) return;
        ensureStyle();
        host.hidden = false;
        host.className = 'gmr-equip';
        const who = viewerOf(viewer);
        const targets = who === 'parent' ? ['son', 'daughter'] : [who === 'daughter' ? 'daughter' : 'son'];
        const currentChild = who === 'parent' ? viewerOfChild() : targets[0];
        const saved = roster.getGalleryPartner(currentChild);
        const key = selectedKey || (saved?.artId === item.id ? saved.charKey : null);
        const character = characters.find(c => c.key === key) || characters[0];
        if (characters.length > 1) {
            const picker = document.createElement('div');
            picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', '캐릭터 고르기');
            picker.className = 'gmr-equip';
            for (const candidate of characters) {
                const button = document.createElement('button'); button.type = 'button';
                button.setAttribute('aria-pressed', String(candidate.key === character.key));
                const image = document.createElement('img'); image.src = candidate.spriteUrl;
                image.alt = ''; image.style.height = '40px'; image.style.maxWidth = '70px'; image.style.objectFit = 'contain';
                button.appendChild(image); button.appendChild(document.createTextNode(candidate.name));
                button.onclick = () => bindModal(item, { available, viewer: who, selectedKey: candidate.key });
                picker.appendChild(button);
            }
            host.appendChild(picker);
        }
        if (who !== 'parent' && window.GalleryRunnerRewards) {
            const friendship = window.GalleryRunnerRewards.friendshipOf(currentChild, `${item.id}#${character.key}`);
            const line = document.createElement('div'); line.style.flexBasis = '100%';
            line.textContent = `💖 친밀도 Lv${friendship.level} ${friendship.name}${
                friendship.next ? ` · 다음 단계까지 ${friendship.next.remaining}판` : ''}`;
            host.appendChild(line);
        }
        for (const child of targets) {
            const button = document.createElement('button');
            button.type = 'button';
            const partner = roster.getGalleryPartner(child);
            const equipped = partner?.artId === item.id && partner.charKey === character.key;
            const label = child === 'son' ? '민수' : '민서';
            button.textContent = equipped ? `✅ ${who === 'parent' ? label + ' ' : ''}파트너 장착 중 · 해제하기` :
                who === 'parent' ? `${label}에게 장착` : '⚡ 내 공부방 파트너로 장착';
            button.onclick = () => {
                const result = equipped ? roster.clearGalleryPartner(child) :
                    roster.equipGalleryPartner(child, { ...character, artId: item.id });
                if (!result) { notify('이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.'); return; }
                const message = equipped ? '기본 파트너로 돌아왔어요!' : `이제 5분 퀘스트에서 ${roster.withJosa(character.name, '이/가')} 함께해요!`;
                notify(message); say(message);
                bindModal(item, { available, viewer: who, selectedKey: character.key });
            };
            host.appendChild(button);
        }
        const run = document.createElement('button');
        run.type = 'button';
        run.textContent = characters.length === 1 ? '🎮 이 캐릭터로 달리기' : `🎮 ${roster.withJosa(character.name, '와/과')} 달리기`;
        run.onclick = () => start(item, { character, viewer: who });
        host.appendChild(run);
    }

    function playTone(session, collision = false) {
        if (typeof window.isSafeSfxEnabled !== 'function' || !window.isSafeSfxEnabled()) return;
        try {
            const Audio = window.AudioContext || window.webkitAudioContext;
            if (!Audio) return;
            session.audio ||= new Audio();
            const audio = session.audio;
            if (audio.state === 'suspended') void audio.resume().catch(() => {});
            const oscillator = audio.createOscillator(), gain = audio.createGain();
            oscillator.connect(gain); gain.connect(audio.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(collision ? 230 : 880, audio.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(collision ? 150 : 1320, audio.currentTime + .07);
            gain.gain.setValueAtTime(.055, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .08);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
            oscillator.start(); oscillator.stop(audio.currentTime + .09);
        } catch (e) { /* 소리 미지원 환경에서는 조용히 진행한다. */ }
    }

    function draw(session) {
        const { canvas, world: w, image, ctx } = session;
        const width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height || !ctx) return;
        resizeWorld(w, width / height);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
            canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const daughter = w.child === 'daughter', unit = height;
        ctx.fillStyle = daughter ? '#e6f6fb' : '#1a1033';
        ctx.fillRect(0, 0, width, height);
        const scaleX = width / w.width;
        // 리사이즈해도 이미 진행 중인 월드와 충돌 좌표는 그대로 유지한다.
        ctx.save(); ctx.scale(scaleX, unit);
        const rewards = window.GalleryRunnerRewards, loadout = session.loadout || {};
        rewards?.drawStage(ctx, w, loadout.stage);
        ctx.fillStyle = daughter ? '#cce5c7' : '#00ff9d55';
        ctx.fillRect(0, GROUND, w.width, 1 - GROUND);
        for (const obstacle of w.obstacles) {
            const x = obstacle.x - w.distance;
            if (x < -.3 || x > w.width + .3) continue;
            ctx.fillStyle = daughter ? '#eab4d0' : '#9b68ff';
            ctx.beginPath(); ctx.roundRect(x, obstacle.y, obstacle.w, obstacle.h, daughter ? .025 : .006); ctx.fill();
        }
        ctx.fillStyle = daughter ? '#eea527' : '#00ff9d';
        for (const star of w.stars) {
            const x = star.x - w.distance;
            if (star.taken || x < -.1 || x > w.width + .1) continue;
            rewards?.drawStar(ctx, star, x, loadout.star);
        }
        if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) rewards?.drawTrail(ctx, session.trail || [], loadout.trail);
        if (image?.complete && image.naturalWidth && (!w.invincible || Math.floor(w.elapsed / 90) % 2)) {
            const p = w.player;
            const bob = p.jumps ? 0 : Math.sin(w.elapsed / 90) * .006;
            if (w.magnet) {
                ctx.strokeStyle = '#69cddd80'; ctx.lineWidth = .003;
                ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.h * .7, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + bob);
            ctx.rotate(p.jumps ? -.12 : 0);
            ctx.drawImage(image, -p.w / 2, -p.h / 2, p.w, p.h);
            rewards?.drawHat(ctx, p, loadout.hat);
            ctx.restore();
        }
        ctx.restore();
        session.hud.textContent = `⏱ ${Math.ceil((DURATION - w.elapsed) / 1000)}초 · ${daughter ? '⭐' : '⚡'} ${w.score}개${w.magnet ? ' · 🧲' : ''}`;
    }

    function showMessage(session, title, actions) {
        session.message.replaceChildren();
        session.message.hidden = false;
        const heading = document.createElement('strong');
        heading.textContent = title;
        session.message.appendChild(heading);
        for (const [text, action] of actions) {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = text; button.onclick = action;
            session.message.appendChild(button);
        }
        session.message.querySelector('button')?.focus();
    }

    function wardrobe(session, onBack) {
        window.GalleryRunnerRewards?.openWardrobe(session, { child: session.child, viewer: session.viewer, onBack });
    }

    function finish(session, returning = false) {
        session.pause.disabled = true;
        const rewards = window.GalleryRunnerRewards, childView = session.viewer !== 'parent';
        if (!returning) {
            session.record = session.world.score > window.MonsterRoster.getRunnerBest(session.child);
            const before = childView ? rewards?.readBank(session.child)?.total || 0 : 0;
            const friendship = childView ? rewards?.friendshipOf(session.child, session.friendKey) : null;
            const bank = childView ? rewards?.addStars(session.child, session.world.score) : null;
            const run = childView ? rewards?.addRun(session.child, session.friendKey) : null;
            const after = run ? rewards.friendshipOf(session.child, session.friendKey) : null;
            session.friendshipMessage = after && after.level > friendship.level ?
                `💖 ${window.MonsterRoster.withJosa(session.name, '와/과')} 더 친해졌어요! Lv${after.level} ${after.name}` : '';
            session.gifts = bank ? rewards.newlyUnlocked(session.child, before, bank.total) : [];
        }
        const record = session.record;
        // 부모 놀이는 자녀 기록을 덮어쓰지 않는다.
        if (!returning && childView) window.MonsterRoster.setRunnerBest(session.child, session.world.score);
        showMessage(session, `완주! ⭐ ${session.world.score}개${record && session.viewer !== 'parent' ? ' · 새 기록!' : ''}`,
            [['다시 달리기', () => restart(session)], ['🎨 꾸미기', () => wardrobe(session, () => finish(session, true))], ['닫기', close]]);
        if (childView && rewards) rewards.appendBankSummary(session, session.child, rewards.readBank(session.child).total, session.gifts);
        if (childView && session.friendshipMessage) {
            const line = document.createElement('div'); line.textContent = session.friendshipMessage;
            const summary = session.message.querySelector('.grr-summary');
            summary.insertBefore(line, summary.children[1] || null);
        }
        if (!returning) say(`완주! 별 ${session.world.score}개를 모았어요.${record && childView ? ' 새 기록이에요!' : ''}${
            session.gifts?.length ? ` 새 선물! ${session.gifts.map(i => i.name).join(', ')} 받았어요!` : ''}${
            session.friendshipMessage ? ` ${session.friendshipMessage}` : ''}`);
    }

    function frame(session, now) {
        if (active !== session || session.paused || !session.ready) return;
        const before = session.world.score, hits = session.world.hits;
        step(session.world, { jump: session.jump }, session.last == null ? 0 : now - session.last);
        const p = session.world.player;
        if (session.last != null && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            session.trail.push({ x: p.x, y: p.y + p.h * .6 }); if (session.trail.length > 10) session.trail.shift();
        }
        session.jump = false; session.last = now;
        if (session.world.hits > hits) playTone(session, true);
        else if (session.world.score > before) playTone(session);
        draw(session);
        if (session.world.status === 'finished') { session.raf = null; finish(session); return; }
        session.raf = requestAnimationFrame(time => frame(session, time));
    }

    function resume(session) {
        if (active !== session || !session.ready || document.hidden || session.world.status === 'finished') return;
        session.paused = false; session.last = null; session.jump = false;
        session.message.hidden = true; session.pause.textContent = '잠깐 쉬기';
        if (session.raf == null) session.raf = requestAnimationFrame(time => frame(session, time));
        session.pause.focus();
    }

    function pause(session) {
        if (!session.ready || session.world.status !== 'running') return;
        session.paused = true; session.jump = false;
        if (session.raf != null) cancelAnimationFrame(session.raf);
        session.raf = null; session.pause.textContent = '계속 달리기';
        showMessage(session, '잠깐 쉬어요 ☁️', [['계속 달리기', () => resume(session)],
            ['🎨 꾸미기', () => wardrobe(session, () => pause(session))], ['닫기', close]]);
    }

    function restart(session) {
        const rewards = window.GalleryRunnerRewards;
        session.loadout = session.viewer === 'parent' ? session.previewLoadout || Object.fromEntries(
            (rewards?.LADDERS[session.child] || []).filter(i => !i.at).map(i => [i.kind, i.id])) : rewards?.readBank(session.child)?.loadout;
        session.trail = [];
        const aspect = session.canvas.clientWidth / Math.max(1, session.canvas.clientHeight);
        session.world = createWorld(Date.now(), { child: session.child, aspect,
            spriteAspect: session.image.naturalWidth / session.image.naturalHeight,
            magnet: session.viewer !== 'parent' && Boolean(rewards?.hasBoostToday(session.child)) });
        session.pause.disabled = false;
        say(`${window.MonsterRoster.withJosa(session.name, '와/과')} 출발! 화면을 누르면 점프해요.${
            session.world.magnet ? ' 오늘 공부를 마쳐서 별 자석이 켜졌어요!' : ''}`);
        resume(session);
    }

    function start(item, { character, viewer, onClose } = {}) {
        close();
        const characters = window.MonsterRoster?.charactersOf(item) || [];
        character = character ? characters.find(c => c.key === character.key) : characters[0];
        if (!character) return;
        ensureStyle();
        const who = viewerOf(viewer), child = who === 'daughter' ? 'daughter' : 'son';
        const root = document.createElement('section');
        root.className = 'gmr'; root.dataset.child = child;
        root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'gmr-title');
        root.innerHTML = `<header><button type="button" data-close aria-label="미니 런 닫기">✕ 닫기</button>
            <h2 id="gmr-title"></h2><span data-hud></span><button type="button" data-pause disabled>잠깐 쉬기</button></header>
            <div class="gmr-stage"><canvas aria-label="화면을 누르면 점프해요"></canvas>
            <div class="gmr-message" role="status"></div></div><p>눌러서 점프! 한 번 더 누르면 더 높이! · 스페이스 / ↑</p>`;
        root.querySelector('h2').textContent = `${window.MonsterRoster.withJosa(character.name, '와/과')} 달리기`;
        const previousFocus = document.activeElement, overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; document.body.appendChild(root);
        const canvas = root.querySelector('canvas'), image = new Image();
        const session = active = { root, canvas, image, ctx: canvas.getContext('2d'), child, viewer: who, onClose, name: character.name,
            friendKey: `${item.id}#${character.key}`,
            previousFocus, overflow, hud: root.querySelector('[data-hud]'), pause: root.querySelector('[data-pause]'),
            message: root.querySelector('.gmr-message'), world: createWorld(1, child), ready: false,
            paused: false, raf: null, listeners: [], observer: null, audio: null, trail: [] };
        session.redraw = () => draw(session);
        const initialPull = who === 'parent' ? Promise.resolve() : Promise.race([
            window.GalleryRunnerRewards?.pull(child), new Promise(resolve => {
                session.endPull = resolve; session.pullTimer = setTimeout(resolve, 1500);
            })]);
        const listen = (target, type, handler, options) => {
            target.addEventListener(type, handler, options);
            session.listeners.push(() => target.removeEventListener(type, handler, options));
        };
        listen(root.querySelector('[data-close]'), 'click', close);
        listen(session.pause, 'click', () => session.paused ? resume(session) : pause(session));
        listen(root, 'pointerdown', event => {
            if (!event.target.closest('button') && session.ready && !session.paused && session.world.status === 'running') {
                event.preventDefault(); session.jump = true;
            }
        });
        listen(document, 'keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
            if (event.key === 'Tab') {
                const buttons = [...root.querySelectorAll('button')].filter(b => !b.disabled && b.getClientRects().length);
                const index = buttons.indexOf(document.activeElement);
                if (event.shiftKey && index <= 0) { event.preventDefault(); buttons.at(-1)?.focus(); }
                else if (!event.shiftKey && (index < 0 || index === buttons.length - 1)) { event.preventDefault(); buttons[0]?.focus(); }
            }
            if ([' ', 'ArrowUp'].includes(event.key) && !event.repeat && session.ready && !session.paused && session.world.status === 'running') {
                event.preventDefault(); session.jump = true;
            }
        }, true);
        listen(document, 'visibilitychange', () => { if (document.hidden) pause(session); });
        session.observer = new ResizeObserver(() => draw(session));
        session.observer.observe(canvas);
        showMessage(session, '그림을 불러오고 있어요…', [['닫기', close]]);
        image.crossOrigin = 'anonymous';
        image.onload = async () => {
            await initialPull; clearTimeout(session.pullTimer);
            if (active !== session) return;
            if (!session.ctx) { showMessage(session, '이 화면에서는 달리기를 열 수 없어요.', [['닫기', close]]); return; }
            session.ready = true; restart(session);
            if (document.hidden) pause(session);
        };
        image.onerror = () => {
            if (active === session) showMessage(session, '그림을 불러오지 못했어요.', [['닫기', close]]);
        };
        image.src = character.spriteUrl;
    }

    function close() {
        const session = active;
        if (!session) return;
        active = null;
        clearTimeout(session.pullTimer);
        session.endPull?.();
        if (session.raf != null) cancelAnimationFrame(session.raf);
        session.listeners.forEach(remove => remove());
        session.observer?.disconnect();
        session.image.onload = session.image.onerror = null;
        session.image.removeAttribute('src');
        if (session.audio) void session.audio.close().catch(() => {});
        if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS();
        session.root.remove();
        document.body.style.overflow = session.overflow;
        if (session.previousFocus?.isConnected) session.previousFocus.focus();
        if (typeof session.onClose === 'function') session.onClose();
    }

    window.GalleryMiniRunner = { start, close, createWorld, step, hitboxOf, resizeWorld, bindModal };
})();
