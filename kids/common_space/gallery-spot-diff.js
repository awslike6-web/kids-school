/** 갤러리 전용 틀린그림찾기: 판정, 놀이, 부모 좌표·차이 검수. */
(() => {
    'use strict';
    let active = null;
    const finite = n => typeof n === 'number' && Number.isFinite(n);
    const validSpots = spots => Array.isArray(spots) && spots.length >= 3 && spots.length <= 5 &&
        spots.every(s => s && finite(s.x) && s.x >= 0 && s.x <= 1 &&
            finite(s.y) && s.y >= 0 && s.y <= 1 && finite(s.r) && s.r >= .03 && s.r <= .15 &&
            typeof s.hint === 'string' && [...s.hint.trim()].length >= 1 && [...s.hint].length <= 30);
    function isValid(data) {
        return !!data && typeof data.modifiedImageUrl === 'string' &&
            data.modifiedImageUrl.trim().length > 0 && validSpots(data.spots);
    }
    function fitRect(boxW, boxH, imgW, imgH) {
        if (![boxW, boxH, imgW, imgH].every(n => finite(n) && n > 0)) return { x: 0, y: 0, w: 0, h: 0 };
        const scale = Math.min(boxW / imgW, boxH / imgH);
        const w = imgW * scale, h = imgH * scale;
        return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
    }
    function toNormalized(px, py, rect) {
        if (!finite(px) || !finite(py) || rect.w <= 0 || rect.h <= 0 ||
            px < rect.x || py < rect.y || px > rect.x + rect.w || py > rect.y + rect.h) return null;
        return { nx: (px - rect.x) / rect.w, ny: (py - rect.y) / rect.h };
    }
    function hitTest(spots, nx, ny, rect, foundSet, minTouchPx = 22) {
        let best = -1, distance = Infinity;
        spots.forEach((s, i) => {
            if (foundSet.has(i)) return;
            const d = Math.hypot((nx - s.x) * rect.w, (ny - s.y) * rect.h);
            if (d <= Math.max(s.r * Math.min(rect.w, rect.h), minTouchPx) && d < distance) {
                best = i; distance = d;
            }
        });
        return best;
    }
    const css = `
        .gsd{position:fixed;inset:0;z-index:10000;background:#1a1033;color:#fff;
          display:flex;flex-direction:column;font-family:inherit;isolation:isolate}
        .gsd *{box-sizing:border-box}.gsd.light{background:#fff8f0;color:#432c39;--ring:#ff85a2}
        .gsd{--ring:#00ff9d}.gsd button,.gsd input,.gsd textarea{font:inherit}
        .gsd button{border:1px solid currentColor;border-radius:18px;padding:8px 12px;
          background:transparent;color:inherit;cursor:pointer;min-height:44px}
        .gsd button:focus-visible,.gsd input:focus-visible{outline:3px solid var(--ring)}
        .gsd-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;
          padding-top:max(10px,env(safe-area-inset-top));flex:none}
        .gsd-title{margin:0;font-size:1.1rem;flex:1;min-width:100px;overflow-wrap:anywhere}
        .gsd-progress{white-space:nowrap}.gsd-message{margin:0;padding:0 12px;min-height:26px}
        .gsd-body{flex:1;min-height:0;min-width:0;position:relative;overflow:hidden}
        .gsd-pair{position:absolute;inset:0;display:flex;gap:8px;padding:8px}
        .gsd-pair.vertical{flex-direction:column}.gsd-picture{position:relative;flex:1;min-width:0;min-height:0}
        .gsd-picture canvas{width:100%;height:100%;display:block;touch-action:manipulation}
        .gsd-label{position:absolute;top:4px;left:4px;background:#0009;color:#fff;
          border-radius:8px;padding:3px 7px;pointer-events:none;font-size:.85rem}
        .gsd-admin{flex:none;max-height:35%;overflow:auto;padding:8px 12px;border-top:1px solid #8888}
        .gsd-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .gsd-tools label{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        .gsd-tools input{max-width:110px}.gsd-row{display:flex;align-items:center;gap:6px;margin-top:6px}
        .gsd-row input{min-width:0;flex:1;padding:7px}.gsd-admin textarea{width:100%;min-height:90px}
        .gsd-finish{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:16px;background:#1a1033ed;color:white;text-align:center}
        .gsd-finish[hidden],.gsd [hidden]{display:none!important}
        .gsd-finish div{display:flex;gap:12px}.gsd-error{display:grid;place-content:center;text-align:center}
    `;
    function node(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }
    function listen(s, el, name, fn) { el.addEventListener(name, fn, { signal: s.abort.signal }); }
    function button(s, text, fn) {
        const el = node('button', '', text); el.type = 'button';
        listen(s, el, 'click', fn); return el;
    }
    function say(name, ...args) { if (typeof window[name] === 'function') window[name](...args); }
    function isAdmin() {
        return new URLSearchParams(window.location.search).get('admin') === 'diff' &&
            ['아빠', '엄마'].includes(window.currentUserName);
    }
    function viewerTheme(viewer) {
        if (!viewer && ['아빠', '엄마'].includes(window.currentUserName || localStorage.getItem('currentUserName'))) return '';
        const user = viewer || localStorage.getItem('currentUser') || localStorage.getItem('currentUserName');
        return ['daughter', '민서', 'minseo'].includes(user) ? 'light' : '';
    }
    function close() {
        const s = active;
        if (!s) return;
        active = null;
        s.abort.abort(); s.observer?.disconnect(); cancelAnimationFrame(s.frame);
        s.images.forEach(img => { img.onload = null; img.onerror = null; img.removeAttribute('src'); });
        s.images.length = 0; s.diff = null; s.mask = null; s.effects.length = 0;
        s.overlay.remove(); document.body.style.overflow = s.oldOverflow;
        if (s.previousFocus?.isConnected) s.previousFocus.focus();
        if (typeof s.onClose === 'function') s.onClose();
    }
    function open(item, { viewer, onClose } = {}) {
        close();
        const admin = isAdmin();
        if (!item || (!isValid(item.spotDiff) && !(admin && item.spotDiff?.modifiedImageUrl))) return;
        if (!document.getElementById('gsd-style')) {
            const style = node('style'); style.id = 'gsd-style'; style.textContent = css;
            document.head.append(style);
        }
        const s = active = {
            abort: new AbortController(), admin, onClose, images: [], canvases: [], rects: [],
            found: new Set(), foundAt: new Map(), spots: (Array.isArray(item.spotDiff.spots) ? item.spotDiff.spots : []).filter(p =>
                p && finite(p.x) && finite(p.y) && finite(p.r)).map(p => ({ ...p })),
            effects: [], frame: 0, hintIndex: -1, hintUntil: 0, threshold: 40,
            showDiff: false, diff: null, mask: null, ready: false,
            previousFocus: document.activeElement, oldOverflow: document.body.style.overflow,
        };
        s.overlay = node('section', `gsd ${viewerTheme(viewer)}`);
        s.overlay.setAttribute('role', 'dialog'); s.overlay.setAttribute('aria-modal', 'true');
        s.overlay.setAttribute('aria-label', '틀린그림찾기');
        const head = node('header', 'gsd-head');
        const closeBtn = button(s, '✕ 닫기', close);
        head.append(closeBtn, node('h2', 'gsd-title', item.title || '틀린그림찾기'));
        s.progress = node('span', 'gsd-progress');
        s.progress.setAttribute('aria-live', 'polite');
        s.hintBtn = button(s, '💡 힌트', () => hint(s));
        s.hintBtn.hidden = admin; head.append(s.progress, s.hintBtn);
        s.message = node('p', 'gsd-message', '그림을 불러오는 중이에요');
        s.message.setAttribute('role', 'status');
        s.body = node('div', 'gsd-body'); s.pair = node('div', 'gsd-pair');
        ['원본 그림', '바뀐 그림'].forEach((label, i) => {
            const pane = node('div', 'gsd-picture'), canvas = node('canvas');
            canvas.setAttribute('aria-label', label); canvas.setAttribute('role', 'img');
            pane.append(canvas, node('span', 'gsd-label', label)); s.pair.append(pane);
            s.canvases.push(canvas); listen(s, canvas, 'pointerdown', ev => point(s, i, ev));
        });
        s.finish = node('div', 'gsd-finish'); s.finish.hidden = true;
        const actions = node('div');
        actions.append(button(s, '다시 하기', () => restart(s)), button(s, '닫기', close));
        s.finish.append(node('h2', '', '다 찾았어요! 🎉'), actions);
        s.body.append(s.pair, s.finish); s.overlay.append(head, s.message, s.body);
        if (admin) setupAdmin(s);
        document.body.append(s.overlay); document.body.style.overflow = 'hidden'; closeBtn.focus();
        listen(s, s.overlay, 'keydown', ev => {
            if (ev.key === 'Escape') { ev.preventDefault(); close(); }
            if (ev.key === 'Tab') {
                const items = [...s.overlay.querySelectorAll('button,input,textarea')].filter(el =>
                    !el.disabled && el.getClientRects().length);
                const first = items[0], last = items.at(-1);
                if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
                else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
            }
        });
        updateProgress(s);
        Promise.all([loadImage(s, item.imageUrl), loadImage(s, item.spotDiff.modifiedImageUrl)])
            .then(images => {
                if (active !== s) return;
                s.images = images; s.ready = true; s.message.textContent = '';
                s.observer = new ResizeObserver(() => layout(s)); s.observer.observe(s.body);
                layout(s);
            }).catch(() => {
                if (active !== s) return;
                s.message.textContent = '그림을 불러오지 못했어요';
                s.body.hidden = true; s.adminPanel?.remove(); s.hintBtn.hidden = true;
                s.progress.hidden = true;
            });
    }
    function loadImage(s, url) {
        return new Promise((resolve, reject) => {
            const img = new Image(); s.images.push(img); img.crossOrigin = 'anonymous';
            img.onload = () => { img.onload = null; img.onerror = null; resolve(img); };
            img.onerror = () => { img.onload = null; img.onerror = null; reject(new Error('image')); };
            img.src = url;
        });
    }
    function layout(s) {
        if (active !== s || !s.ready) return;
        const { width: w, height: h } = s.body.getBoundingClientRect();
        const img = s.images[0], iw = img.naturalWidth, ih = img.naturalHeight;
        const horizontal = fitRect(Math.max(1, (w - 24) / 2), Math.max(1, h - 16), iw, ih);
        const vertical = fitRect(Math.max(1, w - 16), Math.max(1, (h - 24) / 2), iw, ih);
        s.pair.classList.toggle('vertical', vertical.w * vertical.h > horizontal.w * horizontal.h);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        s.canvases.forEach((canvas, i) => {
            const box = canvas.getBoundingClientRect();
            canvas.width = Math.max(1, Math.round(box.width * dpr));
            canvas.height = Math.max(1, Math.round(box.height * dpr));
            canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
            s.rects[i] = fitRect(box.width, box.height, iw, ih);
        });
        render(s);
    }
    function updateProgress(s) {
        s.progress.textContent = s.admin ? `좌표 ${s.spots.length}곳` : `찾은 곳 ${s.found.size} / ${s.spots.length}`;
    }
    function hint(s) {
        if (!s.ready || !s.finish.hidden) return;
        const i = s.spots.findIndex((_, index) => !s.found.has(index));
        if (i < 0) return;
        s.hintIndex = i; s.hintUntil = performance.now() + 2000;
        s.message.textContent = s.spots[i].hint; say('speakFairyTTS', s.spots[i].hint); render(s);
    }
    function restart(s) {
        s.found.clear(); s.foundAt.clear(); s.effects.length = 0;
        s.hintUntil = 0; s.finishAt = 0; s.message.textContent = ''; s.finish.hidden = true;
        updateProgress(s); render(s);
    }
    function point(s, side, ev) {
        if (!s.ready || !s.finish.hidden || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        const box = s.canvases[side].getBoundingClientRect();
        const p = toNormalized(ev.clientX - box.left, ev.clientY - box.top, s.rects[side]);
        if (!p) return;
        const now = performance.now();
        if (s.admin) {
            if (s.spots.length >= 5) { s.message.textContent = '좌표는 5곳까지 찍어요'; return; }
            s.spots.push({ x: +p.nx.toFixed(3), y: +p.ny.toFixed(3), r: +s.radius.value, hint: '' });
            adminRows(s); updateProgress(s); render(s); return;
        }
        const index = hitTest(s.spots, p.nx, p.ny, s.rects[side], s.found);
        if (index >= 0) {
            s.found.add(index); s.foundAt.set(index, now); say('fairyPraise');
            updateProgress(s);
            if (s.hintIndex === index) { s.hintUntil = 0; s.message.textContent = ''; }
            if (s.found.size === s.spots.length) {
                s.finishAt = now + 300;
            }
        } else if (hitTest(s.spots, p.nx, p.ny, s.rects[side], new Set()) < 0) {
            s.effects.push({ ...p, side, at: now });
        }
        render(s);
    }
    function ring(ctx, rect, spot, radius, color, alpha = 1, label = '') {
        const x = rect.x + spot.x * rect.w, y = rect.y + spot.y * rect.h;
        ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
        if (label) {
            ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = color;
            ctx.fillText(label, x + 4, y - 4);
        }
        ctx.restore();
    }
    function render(s) {
        if (active !== s || !s.ready) return;
        cancelAnimationFrame(s.frame); s.frame = 0;
        const now = performance.now(), color = s.overlay.classList.contains('light') ? '#ff85a2' : '#00ff9d';
        let animate = false;
        s.effects = s.effects.filter(e => now - e.at < 600);
        if (s.hintUntil && now >= s.hintUntil) { s.hintUntil = 0; s.message.textContent = ''; }
        s.canvases.forEach((canvas, side) => {
            const ctx = canvas.getContext('2d'), rect = s.rects[side];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(s.images[side], rect.x, rect.y, rect.w, rect.h);
            if (side === 1 && s.showDiff && s.mask) ctx.drawImage(s.mask, rect.x, rect.y, rect.w, rect.h);
            s.spots.forEach((spot, i) => {
                if (!s.admin && !s.found.has(i)) return;
                const t = s.admin ? 1 : Math.min(1, (now - s.foundAt.get(i)) / 300);
                if (t < 1) animate = true;
                ring(ctx, rect, spot, Math.max(1, spot.r * Math.min(rect.w, rect.h) * t), color, 1,
                    s.admin ? String(i + 1) : '');
            });
            if (s.hintUntil > now && s.hintIndex >= 0) {
                animate = true;
                ring(ctx, rect, s.spots[s.hintIndex], Math.max(22,
                    s.spots[s.hintIndex].r * Math.min(rect.w, rect.h)) + 5, '#ffd966', .5 + .5 * Math.sin(now / 100));
            }
            s.effects.filter(e => e.side === side).forEach(e => {
                animate = true;
                ring(ctx, rect, { x: e.nx, y: e.ny }, 5 + (now - e.at) / 18, color,
                    .35 * (1 - (now - e.at) / 600));
            });
        });
        if (s.finishAt) {
            if (now >= s.finishAt) {
                s.finishAt = 0; s.finish.hidden = false; say('fairyReward', 'finish');
                s.finish.querySelector('button').focus();
            } else animate = true;
        }
        if (animate) s.frame = requestAnimationFrame(() => render(s));
    }
    function setupAdmin(s) {
        s.adminPanel = node('aside', 'gsd-admin'); const tools = node('div', 'gsd-tools');
        const slider = (label, min, max, step, value, change) => {
            const wrap = node('label', '', label), input = node('input');
            input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value;
            input.setAttribute('aria-label', label); wrap.append(input); tools.append(wrap);
            listen(s, input, 'input', change); return input;
        };
        s.radius = slider('마지막 원 크기', .03, .15, .001, .08, () => {
            if (s.spots.length) s.spots.at(-1).r = +s.radius.value;
            render(s);
        });
        const diffBtn = button(s, '🔬 차이 보기', () => {
            if (!s.ready) return;
            s.showDiff = !s.showDiff;
            if (s.showDiff && !buildMask(s)) s.showDiff = false;
            diffBtn.setAttribute('aria-pressed', String(s.showDiff)); render(s);
        });
        diffBtn.setAttribute('aria-pressed', 'false'); tools.append(diffBtn);
        slider('차이 문턱값', 10, 120, 1, 40, ev => {
            s.threshold = +ev.target.value;
            if (s.showDiff) buildMask(s);
            render(s);
        });
        tools.append(button(s, '📋 spots 전체 복사', async () => {
            if (!validSpots(s.spots)) { s.message.textContent = '3~5곳을 찍고 힌트를 1~30자로 적어 주세요'; return; }
            const json = JSON.stringify(s.spots, null, 2);
            try {
                await navigator.clipboard.writeText(json);
                if (active === s) s.message.textContent = '좌표를 복사했어요';
            } catch {
                if (active !== s) return;
                s.copyBox.value = json; s.copyBox.hidden = false; s.copyBox.focus(); s.copyBox.select();
                s.message.textContent = '아래 글을 복사해 주세요';
            }
        }));
        s.rows = node('div'); s.copyBox = node('textarea'); s.copyBox.hidden = true;
        s.copyBox.readOnly = true; s.copyBox.setAttribute('aria-label', '복사할 좌표 JSON');
        s.adminPanel.append(tools, s.rows, s.copyBox); s.overlay.append(s.adminPanel); adminRows(s);
    }
    function adminRows(s) {
        s.rows.replaceChildren();
        s.spots.forEach((spot, i) => {
            const row = node('div', 'gsd-row'), input = node('input');
            input.type = 'text'; input.maxLength = 30; input.value = spot.hint || '';
            input.placeholder = '힌트를 적어요'; input.setAttribute('aria-label', `${i + 1}번 힌트`);
            listen(s, input, 'input', () => { spot.hint = input.value; });
            row.append(node('span', '', `${i + 1}. ${spot.x.toFixed(3)}, ${spot.y.toFixed(3)}`), input,
                button(s, '삭제', () => {
                    s.spots.splice(i, 1); adminRows(s); updateProgress(s); render(s);
                }));
            s.rows.append(row);
        });
        if (s.spots.length) s.radius.value = s.spots.at(-1).r;
    }
    function buildMask(s) {
        try {
            if (!s.diff) {
                const original = s.images[0], scale = Math.min(1, 600 / Math.min(original.naturalWidth, original.naturalHeight));
                const w = Math.max(1, Math.round(original.naturalWidth * scale));
                const h = Math.max(1, Math.round(original.naturalHeight * scale));
                const pixels = s.images.map(img => {
                    const c = node('canvas'); c.width = w; c.height = h;
                    const ctx = c.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0, w, h); return ctx.getImageData(0, 0, w, h).data;
                });
                const values = new Uint8Array(w * h);
                for (let i = 0; i < values.length; i++) {
                    const p = i * 4;
                    values[i] = Math.max(...[0, 1, 2].map(k => Math.abs(pixels[0][p + k] - pixels[1][p + k])));
                }
                s.diff = { w, h, values };
            }
            const { w, h, values } = s.diff;
            const mask = s.mask || node('canvas'); mask.width = w; mask.height = h;
            const ctx = mask.getContext('2d'), data = ctx.createImageData(w, h);
            for (let i = 0; i < values.length; i++) {
                if (values[i] > s.threshold) { data.data[i * 4] = 255; data.data[i * 4 + 3] = 140; }
            }
            ctx.putImageData(data, 0, 0); s.mask = mask; return true;
        } catch {
            s.message.textContent = '차이 보기를 쓸 수 없는 그림이에요'; return false;
        }
    }
    window.GallerySpotDiff = { open, close, isValid, fitRect, toNormalized, hitTest };
})();
