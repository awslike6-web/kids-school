// kids/common_space/gallery-3d-hall.js — 가족 그림 갤러리 3D 전시관 엔진
// 초안: 안티그래비티 Hydrogen, 검토: Claude
(function () {
  "use strict";

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";
  const SCENE = window.Gallery3DScene; // 장면 짓기 부품 (gallery-3d-scene.js)
  const CFG = SCENE.CFG;
  const THEMES = SCENE.THEMES;

  const MSG = Object.freeze({
    close: "✕ 목록으로", prev: "◀ 이전 작품", next: "다음 작품 ▶", view: "🔍 크게 보기",
    hint: "화면을 끌어 둘러보고, 바닥이나 액자를 눌러 다가가요. 작품 앞에서 크게 보기 버튼을 눌러 보세요",
    loading: "불러오는 중", loadErr: "사진을 못 불러왔어요",
    initErr: "3D 화면을 열 수 없어요. 목록으로 돌아가 주세요.",
    lost: "3D 화면이 멈췄어요. 목록으로 돌아가 다시 열어 주세요", roomPrefix: "전시실 "
  });

  let threePromise = null;
  let ignorePopCount = 0;
  let popBound = false;
  let sessionSeq = 0;
  let state = createEmptyState(0, null);

  function createEmptyState(session, opts) {
    return {
      session, opts, open: false, THREE: null, theme: THEMES.neon, layout: null,
      overlay: null, els: null, canvas: null, renderer: null, scene: null, camera: null, raycaster: null,
      floorMesh: null, unitPlane: null, unitBox: null,
      placeholders: { load: null, err: null },
      frames: [], frameMap: new Map(), artMeshes: [],
      loadedIds: new Set(), queue: [], pending: new Map(), failedAt: new Map(),
      budget: CFG.BUDGET_PC, lastTexPos: { x: 0, z: 0 },
      cam: { x: 0, z: 0, yaw: 0, pitch: 0 }, currentIndex: -1, lastRoomIdx: -1,
      glide: null, keys: new Set(), pointers: new Set(), drag: null,
      rafId: 0, lastTickMs: 0, needsRender: false, blocked: false,
      blockedTimer: 0, hintTimer: 0, cleanups: []
    };
  }

  function loadThree() {
    if (!threePromise) {
      threePromise = import(THREE_URL).catch((err) => {
        threePromise = null;
        throw err;
      });
    }
    return threePromise;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function wrapAngle(a) {
    let x = (a + Math.PI) % (Math.PI * 2);
    if (x < 0) x += Math.PI * 2;
    return x - Math.PI;
  }

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function calcVfov(aspect) {
    const halfRad = (CFG.HFOV_HALF_DEG * Math.PI) / 180;
    const deg = (2 * Math.atan(Math.tan(halfRad) / Math.max(aspect, 0.2))) * (180 / Math.PI);
    return clamp(deg, CFG.VFOV_MIN, CFG.VFOV_MAX);
  }

  function getBudget() {
    return Math.min(window.innerWidth, window.innerHeight) < CFG.PHONE_BP ? CFG.BUDGET_PHONE : CFG.BUDGET_PC;
  }

  function isEditableTarget(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildOverlay(themeKey, heading) {
    const root = el("div", "g3d g3d--" + themeKey);
    root.id = "gallery3dOverlay";
    const stage = el("div", "g3d-stage");
    const topbar = el("div", "g3d-topbar");
    const headingEl = el("span", "g3d-heading", heading || "");
    const roomEl = el("span", "g3d-room", "");
    const closeBtn = el("button", "g3d-close", MSG.close);
    closeBtn.type = "button";
    topbar.append(headingEl, roomEl, closeBtn);
    const hintEl = el("div", "g3d-hint", MSG.hint);
    const bottombar = el("div", "g3d-bottombar");
    const prevBtn = el("button", "g3d-prev", MSG.prev);
    const counterEl = el("span", "g3d-counter", "– / 0");
    const nextBtn = el("button", "g3d-next", MSG.next);
    prevBtn.type = "button";
    nextBtn.type = "button";
    bottombar.append(prevBtn, counterEl, nextBtn);
    const viewBtn = el("button", "g3d-view", MSG.view);
    viewBtn.type = "button";
    viewBtn.hidden = true;
    const statusEl = el("div", "g3d-status");
    statusEl.hidden = true;
    root.append(stage, topbar, hintEl, viewBtn, bottombar, statusEl);
    return { root, stage, headingEl, roomEl, closeBtn, hintEl, viewBtn, prevBtn, counterEl, nextBtn, statusEl };
  }

  function showStatus(text) {
    if (!state.els) return;
    state.els.statusEl.textContent = text;
    state.els.statusEl.hidden = false;
  }

  function dismissHint() {
    if (!state.els) return;
    state.els.hintEl.classList.add("g3d-hint--hide");
    if (state.hintTimer) { clearTimeout(state.hintTimer); state.hintTimer = 0; }
  }

  function canViewActiveFrame() {
    if (!state.open || state.currentIndex < 0) return false;
    const fObj = state.frames[state.currentIndex];
    if (!fObj || !state.opts || typeof state.opts.onSelect !== "function") return false;
    const vp = window.Gallery3DLayout.viewpointFor(fObj.data);
    const dist = Math.hypot(state.cam.x - vp.x, state.cam.z - vp.z);
    const yawDiff = Math.abs(wrapAngle(vp.yaw - state.cam.yaw));
    return dist <= 1.6 && yawDiff <= 0.85;
  }

  function updateViewBtn() {
    if (!state.els || !state.els.viewBtn) return;
    const show = canViewActiveFrame();
    if (state.els.viewBtn.hidden === show) state.els.viewBtn.hidden = !show;
  }

  function updateCounter() {
    if (!state.els) return;
    const total = state.frames.length;
    const cur = state.currentIndex >= 0 ? String(state.currentIndex + 1) : "–";
    state.els.counterEl.textContent = cur + " / " + total;
    updateViewBtn();
  }

  function updateRoomLabel() {
    if (!state.els || !state.layout) return;
    const rooms = state.layout.rooms;
    const z = state.cam.z;
    let idx = -1;
    for (let i = 0; i < rooms.length; i++) {
      if (z <= rooms[i].zStart && z >= rooms[i].zEnd) { idx = i; break; }
    }
    if (idx === -1 && rooms.length > 0) idx = z > rooms[0].zStart ? 0 : rooms.length - 1;
    if (idx !== state.lastRoomIdx) {
      state.lastRoomIdx = idx;
      if (idx >= 0) {
        state.els.roomEl.textContent = rooms[idx].label || (MSG.roomPrefix + (idx + 1));
      } else {
        state.els.roomEl.textContent = "";
      }
    }
  }

  function isSharedPlaceholder(tex) {
    return tex === state.placeholders.load || tex === state.placeholders.err;
  }

  function loadSingleImage(url, onDone) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => onDone(null, img);
    img.onerror = () => onDone(new Error("img"));
    img.src = url;
  }

  function startFrameLoad(fObj) {
    const sid = state.session;
    const id = fObj.data.id;
    const token = { aborted: false };
    state.pending.set(id, token);
    const release = () => { if (state.pending.get(id) === token) state.pending.delete(id); }; // 내 요청일 때만 비움

    const finishArt = (err, img) => {
      if (token.aborted || state.session !== sid || !state.open) {
        release();
        return;
      }
      if (err || !img) {
        release();
        state.failedAt.set(id, Date.now());
        fObj.status = "error";
        fObj.art.material.map = state.placeholders.err;
        fObj.art.material.needsUpdate = true;
        requestRender();
        pumpQueue();
        return;
      }
      const { tex, aspect } = SCENE.imageToTexture(state.THREE, img);
      if (fObj.tex && !isSharedPlaceholder(fObj.tex)) fObj.tex.dispose();
      fObj.tex = tex;
      fObj.art.material.map = tex;
      fObj.art.material.needsUpdate = true;
      SCENE.applyFrameDimensions(fObj, aspect);
      fObj.status = "loaded";
      state.failedAt.delete(id);
      state.loadedIds.add(id);

      if (fObj.charSprite && fObj.data.characterUrl) {
        loadSingleImage(fObj.data.characterUrl, (cErr, cImg) => {
          release();
          if (token.aborted || state.session !== sid || !state.open) return;
          if (!cErr && cImg) {
            const cRes = SCENE.imageToTexture(state.THREE, cImg);
            if (fObj.charTex) fObj.charTex.dispose();
            fObj.charTex = cRes.tex;
            fObj.charSprite.material.map = cRes.tex;
            fObj.charSprite.material.needsUpdate = true;
            fObj.charSprite.scale.set(CFG.CHAR_H * cRes.aspect, CFG.CHAR_H, 1);
            fObj.charSprite.visible = true;
            requestRender();
          }
          pumpQueue();
        });
      } else {
        release();
        requestRender();
        pumpQueue();
      }
    };

    loadSingleImage(fObj.data.imageUrl, finishArt);
  }

  function pumpQueue() {
    if (!state.open) return;
    const now = Date.now();
    while (state.pending.size < CFG.MAX_CONCURRENT && state.queue.length > 0) {
      const nextId = state.queue.shift();
      if (state.loadedIds.has(nextId) || state.pending.has(nextId)) continue;
      const failTime = state.failedAt.get(nextId);
      if (failTime && now - failTime < CFG.RETRY_COOLDOWN_MS) continue;
      const fObj = state.frameMap.get(nextId);
      if (fObj) startFrameLoad(fObj);
    }
  }

  function unloadFrameTexture(id) {
    const qIdx = state.queue.indexOf(id);
    if (qIdx !== -1) state.queue.splice(qIdx, 1);
    const pend = state.pending.get(id);
    if (pend) {
      pend.aborted = true;
      state.pending.delete(id);
    }
    state.loadedIds.delete(id);
    const fObj = state.frameMap.get(id);
    if (!fObj) return;
    if (fObj.tex && !isSharedPlaceholder(fObj.tex)) {
      fObj.tex.dispose();
      fObj.tex = null;
    }
    fObj.art.material.map = state.placeholders.load;
    fObj.art.material.needsUpdate = true;
    fObj.status = "empty";
    if (fObj.charTex) {
      fObj.charTex.dispose();
      fObj.charTex = null;
    }
    if (fObj.charSprite) {
      fObj.charSprite.material.map = null;
      fObj.charSprite.visible = false;
    }
  }

  function updateTextures(force) {
    if (!state.open || !state.layout) return;
    const dist = Math.hypot(state.cam.x - state.lastTexPos.x, state.cam.z - state.lastTexPos.z);
    if (!force && dist < CFG.TEX_MOVE_DIST) return;
    state.lastTexPos = { x: state.cam.x, z: state.cam.z };
    const known = new Set(state.loadedIds);
    for (const id of state.pending.keys()) known.add(id);
    // 대기열은 넣지 않는다: 넣으면 plan.load에서 빠진 뒤 아래 교체로 대기열에서 사라진다 (Argon 검토 2026-11-16)
    const plan = window.Gallery3DLayout.planTextures(state.layout.frames, state.cam, known, state.budget);
    for (let i = 0; i < plan.unload.length; i++) unloadFrameTexture(plan.unload[i]);
    const now = Date.now();
    state.queue = plan.load.filter((id) => {
      const t = state.failedAt.get(id);
      return !(t && now - t < CFG.RETRY_COOLDOWN_MS);
    });
    pumpQueue();
  }

  function stopBlockedPoll() {
    if (state.blockedTimer) { clearInterval(state.blockedTimer); state.blockedTimer = 0; }
  }

  function startBlockedPoll() {
    if (state.blockedTimer) return;
    state.blockedTimer = setInterval(() => {
      if (!state.open) { stopBlockedPoll(); return; }
      if (!checkBlocked()) requestRender();
    }, CFG.BLOCK_POLL_MS);
  }

  function checkBlocked() {
    const b = Boolean(state.opts && typeof state.opts.isBlocked === "function" && state.opts.isBlocked());
    if (b && !state.blocked) {
      state.blocked = true;
      state.glide = null;
      state.keys.clear();
      state.drag = null;
      state.pointers.clear();
      startBlockedPoll();
    } else if (!b && state.blocked) {
      state.blocked = false;
      stopBlockedPoll();
      requestRender();
    }
    return b;
  }

  function startGlide(toX, toZ, toYaw, onArrive) {
    const dx = toX - state.cam.x;
    const dz = toZ - state.cam.z;
    const dist = Math.hypot(dx, dz);
    const dur = clamp(dist / CFG.GLIDE_SPEED, CFG.GLIDE_MIN_S, CFG.GLIDE_MAX_S);
    state.glide = {
      fromX: state.cam.x, fromZ: state.cam.z, fromYaw: state.cam.yaw, fromPitch: state.cam.pitch,
      toX, toZ, dYaw: wrapAngle(toYaw - state.cam.yaw),
      elapsed: 0, dur, onArrive: onArrive || null
    };
    requestRender();
  }

  function focusFrame(idx) {
    const fObj = state.frames[idx];
    if (!fObj) return;
    state.currentIndex = idx;
    updateCounter();
    const vp = window.Gallery3DLayout.viewpointFor(fObj.data);
    const dist = Math.hypot(state.cam.x - vp.x, state.cam.z - vp.z);
    const yawDiff = Math.abs(wrapAngle(vp.yaw - state.cam.yaw));
    if (dist < CFG.AT_VP_DIST && yawDiff < CFG.AT_VP_YAW && Math.abs(state.cam.pitch) < CFG.AT_VP_YAW) {
      updateViewBtn();
      return;
    }
    startGlide(vp.x, vp.z, vp.yaw, null);
  }

  function stepIndexGlide(dir) {
    if (!state.open || checkBlocked() || state.frames.length === 0) return;
    dismissHint();
    const nextIdx = window.Gallery3DLayout.stepIndex(state.currentIndex, dir, state.frames.length);
    if (nextIdx < 0) return;
    focusFrame(nextIdx);
  }

  function handleTap(clientX, clientY) {
    if (!state.open || !state.canvas || !state.raycaster) return;
    const rect = state.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const ndc = {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1
    };
    state.raycaster.setFromCamera(ndc, state.camera);
    const targets = state.floorMesh ? state.artMeshes.concat(state.floorMesh) : state.artMeshes;
    const hits = state.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return;
    const hit = hits[0];
    if (hit.object.userData && hit.object.userData.frameIndex != null) {
      focusFrame(hit.object.userData.frameIndex);
    } else if (hit.object === state.floorMesh) {
      const c = window.Gallery3DLayout.clampPosition(hit.point.x, hit.point.z, state.layout.bounds);
      startGlide(c.x, c.z, state.cam.yaw, null);
    }
  }

  function applyKeys(dt) {
    const k = state.keys;
    if (k.size === 0) return false;
    let fwd = 0, str = 0, turn = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) fwd += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) fwd -= 1;
    if (k.has("KeyD")) str += 1;
    if (k.has("KeyA")) str -= 1;
    if (k.has("ArrowLeft")) turn += 1;
    if (k.has("ArrowRight")) turn -= 1;
    if (fwd === 0 && str === 0 && turn === 0) return false;
    if (state.glide) state.glide = null;
    if (turn !== 0) state.cam.yaw = wrapAngle(state.cam.yaw + turn * CFG.TURN_SPEED * dt);
    if (fwd !== 0 || str !== 0) {
      const sin = Math.sin(state.cam.yaw), cos = Math.cos(state.cam.yaw);
      const len = Math.hypot(fwd, str) || 1;
      const nf = fwd / len, ns = str / len;
      const vx = (-sin * nf + cos * ns) * CFG.MOVE_SPEED * dt;
      const vz = (-cos * nf - sin * ns) * CFG.MOVE_SPEED * dt;
      const c = window.Gallery3DLayout.clampPosition(state.cam.x + vx, state.cam.z + vz, state.layout.bounds);
      state.cam.x = c.x;
      state.cam.z = c.z;
    }
    return true;
  }

  function applyGlide(dt) {
    const g = state.glide;
    if (!g) return false;
    g.elapsed += dt;
    const rawT = clamp(g.elapsed / g.dur, 0, 1);
    const t = easeInOut(rawT);
    state.cam.x = g.fromX + (g.toX - g.fromX) * t;
    state.cam.z = g.fromZ + (g.toZ - g.fromZ) * t;
    state.cam.yaw = wrapAngle(g.fromYaw + g.dYaw * t);
    state.cam.pitch = g.fromPitch * (1 - t);
    if (rawT >= 1) {
      state.glide = null;
      updateTextures(true);
      if (typeof g.onArrive === "function") g.onArrive();
    }
    return true;
  }

  function tick(now) {
    state.rafId = 0;
    if (!state.open || document.hidden || checkBlocked()) return;
    const rawDt = state.lastTickMs ? Math.max(0, (now - state.lastTickMs) / 1000) : 0.016;
    state.lastTickMs = now;

    const gliding = applyGlide(Math.min(rawDt, CFG.GLIDE_DT_CAP));
    const keying = applyKeys(Math.min(rawDt, CFG.KEY_DT_CAP));
    if (gliding || keying) {
      updateRoomLabel();
      updateViewBtn();
      updateTextures(false);
    }

    const C = window.Gallery3DLayout.CONST;
    state.camera.position.set(state.cam.x, C.EYE_HEIGHT, state.cam.z);
    state.camera.rotation.y = state.cam.yaw;
    state.camera.rotation.x = state.cam.pitch;
    state.renderer.render(state.scene, state.camera);
    state.needsRender = false;

    const active = Boolean(state.glide) || state.keys.size > 0 || Boolean(state.drag && state.drag.moved);
    if (active || state.needsRender) {
      state.rafId = requestAnimationFrame(tick);
    } else {
      state.lastTickMs = 0;
    }
  }

  function requestRender() {
    if (!state.open || document.hidden || checkBlocked()) return;
    state.needsRender = true;
    if (!state.rafId) {
      state.lastTickMs = 0;
      state.rafId = requestAnimationFrame(tick);
    }
  }

  function onResize() {
    if (!state.open || !state.renderer || !state.camera) return;
    const w = state.els.stage.clientWidth || window.innerWidth;
    const h = state.els.stage.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    const aspect = w / h;
    state.renderer.setSize(w, h, false);
    state.camera.aspect = aspect;
    state.camera.fov = calcVfov(aspect);
    state.camera.updateProjectionMatrix();
    const newBudget = getBudget();
    if (newBudget !== state.budget) {
      state.budget = newBudget;
      updateTextures(true);
    }
    requestRender();
  }

  function addEvt(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    state.cleanups.push(() => target.removeEventListener(type, fn, opts));
  }

  function bindEvents() {
    const c = state.canvas;
    addEvt(c, "pointerdown", (e) => {
      if (!state.open || checkBlocked()) return;
      state.pointers.add(e.pointerId);
      if (state.pointers.size >= 2) { state.drag = null; return; }
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
      state.drag = {
        id: e.pointerId, startX: e.clientX, startY: e.clientY,
        lastX: e.clientX, lastY: e.clientY, moved: false
      };
    });

    addEvt(c, "pointermove", (e) => {
      const d = state.drag;
      if (!d || d.id !== e.pointerId || state.pointers.size >= 2) return;
      if (checkBlocked()) { state.drag = null; return; }
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > CFG.DRAG_PX) {
        d.moved = true;
        state.glide = null;
        dismissHint();
      }
      if (d.moved) {
        const dx = e.clientX - d.lastX;
        const dy = e.clientY - d.lastY;
        state.cam.yaw = wrapAngle(state.cam.yaw + dx * CFG.YAW_SENS);
        state.cam.pitch = clamp(state.cam.pitch + dy * CFG.PITCH_SENS, -CFG.MAX_PITCH, CFG.MAX_PITCH);
        updateViewBtn();
        requestRender();
      }
      d.lastX = e.clientX;
      d.lastY = e.clientY;
    });

    const onPtrEnd = (e) => {
      state.pointers.delete(e.pointerId);
      const d = state.drag;
      if (d && d.id === e.pointerId) {
        state.drag = null;
        if (e.type === "pointerup" && !d.moved && state.pointers.size === 0 && !checkBlocked()) {
          dismissHint();
          handleTap(e.clientX, e.clientY);
        }
      }
    };
    addEvt(c, "pointerup", onPtrEnd);
    addEvt(c, "pointercancel", onPtrEnd);

    addEvt(c, "wheel", (e) => {
      if (!state.open || checkBlocked()) return;
      e.preventDefault();
      dismissHint();
      state.glide = null;
      const dir = e.deltaY < 0 ? 1 : -1;
      const nx = state.cam.x - Math.sin(state.cam.yaw) * CFG.WHEEL_STEP * dir;
      const nz = state.cam.z - Math.cos(state.cam.yaw) * CFG.WHEEL_STEP * dir;
      const cl = window.Gallery3DLayout.clampPosition(nx, nz, state.layout.bounds);
      state.cam.x = cl.x;
      state.cam.z = cl.z;
      updateRoomLabel();
      updateViewBtn();
      updateTextures(false);
      requestRender();
    }, { passive: false });

    addEvt(c, "webglcontextlost", (e) => {
      e.preventDefault();
      if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = 0; }
      state.glide = null;
      state.keys.clear();
      showStatus(MSG.lost);
    });

    addEvt(window, "keydown", (e) => {
      if (!state.open || checkBlocked() || isEditableTarget(e.target)) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
        dismissHint();
        state.keys.add(e.code);
        requestRender();
      }
    });

    addEvt(window, "keyup", (e) => { state.keys.delete(e.code); });
    addEvt(window, "blur", () => { state.keys.clear(); state.drag = null; state.pointers.clear(); });
    addEvt(window, "focus", () => { if (state.open && !checkBlocked()) requestRender(); });
    addEvt(window, "resize", onResize);
    addEvt(document, "visibilitychange", () => {
      if (!state.open) return;
      if (document.hidden) {
        if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = 0; }
      } else if (!checkBlocked()) {
        requestRender();
      }
    });

    addEvt(state.els.prevBtn, "click", () => stepIndexGlide(-1));
    addEvt(state.els.nextBtn, "click", () => stepIndexGlide(1));
    addEvt(state.els.viewBtn, "click", () => {
      if (!state.open || checkBlocked() || state.currentIndex < 0) return;
      const fObj = state.frames[state.currentIndex];
      if (fObj && state.opts && typeof state.opts.onSelect === "function") {
        state.opts.onSelect(fObj.data.id);
      }
    });
  }

  function onPopState() {
    if (ignorePopCount > 0) { ignorePopCount--; return; }
    if (!state.open) return;
    if (checkBlocked()) {
      history.pushState({ gallery3d: true }, "");
      if (state.opts && typeof state.opts.onBackWhileBlocked === "function") state.opts.onBackWhileBlocked();
      return;
    }
    closeInternal(true);
  }

  function ensurePopListener() {
    if (popBound) return;
    popBound = true;
    window.addEventListener("popstate", onPopState);
  }

  function disposeSceneResources() {
    if (state.scene) {
      state.scene.traverse((obj) => {
        if (obj.geometry && typeof obj.geometry.dispose === "function") obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        for (let i = 0; i < mats.length; i++) {
          if (mats[i].map && typeof mats[i].map.dispose === "function") mats[i].map.dispose();
          if (typeof mats[i].dispose === "function") mats[i].dispose();
        }
      });
    }
    if (state.placeholders.load) state.placeholders.load.dispose();
    if (state.placeholders.err) state.placeholders.err.dispose();
    if (state.renderer) {
      state.renderer.dispose();
      try { state.renderer.forceContextLoss(); } catch (_) {}
    }
  }

  function closeInternal(fromPop) {
    if (!state.overlay && !state.open) return;
    const wasOpen = state.open;
    const onCloseCb = state.opts ? state.opts.onClose : null;
    state.session = ++sessionSeq;
    state.open = false;
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = 0; }
    stopBlockedPoll();
    if (state.hintTimer) { clearTimeout(state.hintTimer); state.hintTimer = 0; }
    for (const pend of state.pending.values()) pend.aborted = true;
    for (let i = 0; i < state.cleanups.length; i++) state.cleanups[i]();
    disposeSceneResources();
    if (state.overlay && state.overlay.parentNode) state.overlay.parentNode.removeChild(state.overlay);
    document.body.classList.remove("g3d-open");
    state = createEmptyState(state.session, null);
    if (!fromPop && wasOpen && history.state && history.state.gallery3d) {
      ignorePopCount++;
      history.back();
    }
    if (wasOpen && typeof onCloseCb === "function") onCloseCb();
  }

  async function open(options) {
    if (state.open) return false;
    if (state.overlay) closeInternal(false);
    const opts = options || {};
    const sid = ++sessionSeq;
    const themeKey = opts.theme === "pastel" ? "pastel" : "neon";
    state = createEmptyState(sid, opts);
    state.theme = THEMES[themeKey];
    state.els = buildOverlay(themeKey, opts.heading);
    state.overlay = state.els.root;
    document.body.appendChild(state.overlay);
    document.body.classList.add("g3d-open");
    addEvt(state.els.closeBtn, "click", close);
    ensurePopListener();

    let THREE;
    try {
      THREE = await loadThree();
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) {}
      }
    } catch (_) {
      if (state.session !== sid) return false;
      showStatus(MSG.initErr);
      return false;
    }
    if (state.session !== sid) return false;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (_) {
      showStatus(MSG.initErr);
      return false;
    }

    const w = state.els.stage.clientWidth || window.innerWidth;
    const h = state.els.stage.clientHeight || window.innerHeight;
    const aspect = w > 0 && h > 0 ? w / h : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.MAX_DPR));
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    state.els.stage.appendChild(renderer.domElement);

    state.THREE = THREE;
    state.renderer = renderer;
    state.canvas = renderer.domElement;
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(state.theme.bg);
    state.scene.fog = new THREE.Fog(state.theme.bg, CFG.FOG_NEAR, CFG.FOG_FAR);
    state.camera = new THREE.PerspectiveCamera(calcVfov(aspect), aspect, CFG.NEAR, CFG.FAR);
    state.camera.rotation.order = "YXZ";
    state.raycaster = new THREE.Raycaster();

    const hemi = new THREE.HemisphereLight(0xffffff, state.theme.floor, state.theme.hemi);
    const dir = new THREE.DirectionalLight(0xffffff, state.theme.dir);
    dir.position.set(2, 6, 3);
    state.scene.add(hemi, dir);

    state.unitPlane = new THREE.PlaneGeometry(1, 1);
    state.unitBox = new THREE.BoxGeometry(1, 1, 1);
    state.placeholders.load = SCENE.makePlaceholderTexture(THREE, state.theme, MSG.loading);
    state.placeholders.err = SCENE.makePlaceholderTexture(THREE, state.theme, MSG.loadErr);
    state.layout = window.Gallery3DLayout.buildLayout(opts.items || []);
    state.cam = { x: state.layout.start.x, z: state.layout.start.z, yaw: state.layout.start.yaw, pitch: 0 };
    state.budget = getBudget();

    SCENE.buildHall(state);
    SCENE.buildFrames(state);
    bindEvents();
    state.open = true;
    history.pushState({ gallery3d: true }, "");
    updateRoomLabel();
    updateCounter();
    updateTextures(true);
    state.hintTimer = setTimeout(dismissHint, CFG.HINT_MS);
    requestRender();
    return true;
  }

  function close() { closeInternal(false); }

  function isOpen() { return Boolean(state.open); }

  function debugInfo() {
    if (!state.open) return { open: false };
    return {
      open: true, frames: state.frames.length, loadedTextures: state.loadedIds.size,
      pending: state.pending.size, budget: state.budget,
      position: { x: state.cam.x, z: state.cam.z, yaw: state.cam.yaw }
    };
  }

  window.Gallery3DHall = Object.freeze({ open, close, isOpen, debugInfo });
})();
