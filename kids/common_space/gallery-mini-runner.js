/** 갤러리 캐릭터 60초 미니 런. 놀이·장착 화면만 담당하며 학습·노션에는 쓰지 않는다. */
(() => {
    const PROFILES = {
        daughter: { speed: .25, gap: 2.6, obstacle: .10, starGap: .65 },
        son: { speed: .40, gap: 2.0, obstacle: .25, starGap: .95 }
    };
    const DURATION = 60000, GRAVITY = 3, JUMP = 1.1, GROUND = .83;
    let active = null;
    let toast = null;

    // 모든 물리 좌표의 단위는 화면 높이. 속도만 화면 너비 비율로 정한다.
    function createWorld(seed = 1, profile = 'son') {
        const child = (typeof profile === 'string' ? profile : profile.child) === 'daughter' ? 'daughter' : 'son';
        const width = Math.max(.35, Math.min(4, Number(profile.aspect) || 1.6));
        const config = PROFILES[child];
        let state = Number(seed) >>> 0;
        const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
        const speed = width * config.speed;
        const obstacles = [], stars = [];
        for (let time = 3; time < 72; time += config.gap + random()) {
            const h = child === 'daughter' ? .06 + random() * .04 : .08 + random() * (config.obstacle - .08);
            obstacles.push({ x: width + time * speed, y: GROUND - h, w: .08, h, hit: false });
        }
        for (let time = .7; time < 72; time += config.starGap) {
            stars.push({ x: width + time * speed, y: GROUND - .06 - random() * (child === 'daughter' ? .06 : .35),
                w: .045, h: .045, taken: false });
        }
        return { seed, child, width, speed, elapsed: 0, distance: 0, score: 0, status: 'running',
            invincible: 0, hits: 0, player: { x: width * .16, y: GROUND - .18, w: .14, h: .18, vy: 0, jumps: 0 },
            obstacles, stars };
    }

    function hitboxOf(sprite, x, y, w, h) {
        return { x: x + w * .15, y: y + h * .15, w: w * .7, h: h * .7 };
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
        world.distance += world.speed * dt * (world.child === 'son' && world.elapsed >= 30000 ? 1.12 : 1);
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
        for (const star of world.stars) {
            if (!star.taken && overlaps(box, { ...star, x: star.x - world.distance })) {
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

    function viewerOf(viewer) {
        if (viewer) return viewer;
        if (['아빠', '엄마'].includes(window.currentUserName)) return 'parent';
        try { return localStorage.getItem('currentUser') || 'son'; } catch (e) { return 'son'; }
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
    function bindModal(item, { available = true, viewer } = {}) {
        const host = document.getElementById('modalCharacterActions');
        if (!host) return;
        host.replaceChildren();
        host.hidden = true;
        const roster = window.MonsterRoster;
        if (!available || !roster?.isValidCharacter(item.character)) return;
        ensureStyle();
        host.hidden = false;
        host.className = 'gmr-equip';
        const who = viewerOf(viewer);
        const targets = who === 'parent' ? ['son', 'daughter'] : [who === 'daughter' ? 'daughter' : 'son'];
        for (const child of targets) {
            const button = document.createElement('button');
            button.type = 'button';
            const equipped = roster.getGalleryPartner(child)?.artId === item.id;
            const label = child === 'son' ? '민수' : '민서';
            button.textContent = equipped ? `✅ ${who === 'parent' ? label + ' ' : ''}파트너 장착 중 · 해제하기` :
                who === 'parent' ? `${label}에게 장착` : '⚡ 내 공부방 파트너로 장착';
            button.onclick = () => {
                const result = equipped ? roster.clearGalleryPartner(child) :
                    roster.equipGalleryPartner(child, { ...item.character, artId: item.id });
                if (!result) { notify('이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.'); return; }
                if (!equipped && typeof window.fairyPraise === 'function') window.fairyPraise();
                notify(equipped ? '기본 파트너로 돌아왔어요!' : `이제 5분 퀘스트에서 ${item.character.name}가 함께해요!`);
                bindModal(item, { available, viewer: who });
            };
            host.appendChild(button);
        }
        const run = document.createElement('button');
        run.type = 'button';
        run.textContent = '🎮 이 캐릭터로 달리기';
        run.onclick = () => start(item, { viewer: who });
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
        const aspect = width / height;
        if (Math.abs(aspect - w.width) > .001) {
            const factor = aspect / w.width;
            w.player.x *= factor;
            w.obstacles.forEach(item => { item.x *= factor; });
            w.stars.forEach(item => { item.x *= factor; });
            w.speed *= factor; w.distance *= factor; w.width = aspect;
        }
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
        if (daughter) {
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 7; i++) {
                const x = ((i * .63 - w.distance * .13) % (w.width + .7) + w.width + .7) % (w.width + .7) - .35;
                ctx.beginPath(); ctx.ellipse(x, .16 + (i % 3) * .08, .18, .035, 0, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            ctx.strokeStyle = '#00ff9d35'; ctx.lineWidth = .002;
            ctx.beginPath();
            for (let x = -(w.distance * .15 % .15); x < w.width; x += .15) { ctx.moveTo(x, 0); ctx.lineTo(x, 1); }
            for (let y = 0; y < 1; y += .10) { ctx.moveTo(0, y); ctx.lineTo(w.width, y); }
            ctx.stroke();
        }
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
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? .012 : .025;
                const px = x + star.w / 2 + Math.cos(a) * radius, py = star.y + star.h / 2 + Math.sin(a) * radius;
                if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.fill();
        }
        if (image?.complete && image.naturalWidth && (!w.invincible || Math.floor(w.elapsed / 90) % 2)) {
            const p = w.player;
            const bob = p.jumps ? 0 : Math.sin(w.elapsed / 90) * .006;
            ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + bob);
            ctx.rotate(p.jumps ? -.12 : 0);
            ctx.drawImage(image, -p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }
        ctx.restore();
        session.hud.textContent = `⏱ ${Math.ceil((DURATION - w.elapsed) / 1000)}초 · ${daughter ? '⭐' : '⚡'} ${w.score}개`;
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

    function finish(session) {
        session.pause.disabled = true;
        const best = window.MonsterRoster.getRunnerBest(session.child);
        const record = session.world.score > best;
        // 부모 놀이는 자녀 기록을 덮어쓰지 않는다.
        if (session.viewer !== 'parent') window.MonsterRoster.setRunnerBest(session.child, session.world.score);
        showMessage(session, `완주! ⭐ ${session.world.score}개${record && session.viewer !== 'parent' ? ' · 새 기록!' : ''}`,
            [['다시 달리기', () => restart(session)], ['닫기', close]]);
        if (typeof window.fairyReward === 'function') window.fairyReward('finish');
    }

    function frame(session, now) {
        if (active !== session || session.paused || !session.ready) return;
        const before = session.world.score, hits = session.world.hits;
        step(session.world, { jump: session.jump }, session.last == null ? 0 : now - session.last);
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
        showMessage(session, '잠깐 쉬어요 ☁️', [['계속 달리기', () => resume(session)], ['닫기', close]]);
    }

    function restart(session) {
        const aspect = session.canvas.clientWidth / Math.max(1, session.canvas.clientHeight);
        session.world = createWorld(Date.now(), { child: session.child, aspect });
        session.world.player.w = .18 * session.image.naturalWidth / session.image.naturalHeight;
        session.pause.disabled = false;
        resume(session);
    }

    function start(item, { viewer, onClose } = {}) {
        close();
        if (!window.MonsterRoster?.isValidCharacter(item?.character)) return;
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
        root.querySelector('h2').textContent = `${item.character.name}와 달리기`;
        const previousFocus = document.activeElement, overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; document.body.appendChild(root);
        const canvas = root.querySelector('canvas'), image = new Image();
        const session = active = { root, canvas, image, ctx: canvas.getContext('2d'), child, viewer: who, onClose,
            previousFocus, overflow, hud: root.querySelector('[data-hud]'), pause: root.querySelector('[data-pause]'),
            message: root.querySelector('.gmr-message'), world: createWorld(1, child), ready: false,
            paused: false, raf: null, listeners: [], observer: null, audio: null };
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
        image.onload = () => {
            if (active !== session) return;
            if (!session.ctx) { showMessage(session, '이 화면에서는 달리기를 열 수 없어요.', [['닫기', close]]); return; }
            session.ready = true; restart(session);
            if (document.hidden) pause(session);
        };
        image.onerror = () => {
            if (active === session) showMessage(session, '그림을 불러오지 못했어요.', [['닫기', close]]);
        };
        image.src = item.character.spriteUrl;
    }

    function close() {
        const session = active;
        if (!session) return;
        active = null;
        if (session.raf != null) cancelAnimationFrame(session.raf);
        session.listeners.forEach(remove => remove());
        session.observer?.disconnect();
        session.image.onload = session.image.onerror = null;
        session.image.removeAttribute('src');
        if (session.audio) void session.audio.close().catch(() => {});
        session.root.remove();
        document.body.style.overflow = session.overflow;
        if (session.previousFocus?.isConnected) session.previousFocus.focus();
        if (typeof session.onClose === 'function') session.onClose();
    }

    window.GalleryMiniRunner = { start, close, createWorld, step, hitboxOf, bindModal };
})();
