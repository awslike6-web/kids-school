// kids/common_space/gallery-3d-scene.js — 3D 전시관 장면 짓기(벽·바닥·간판·액자·이름표 그림) 부품
// 초안: 안티그래비티 Hydrogen, 검토·분리: Claude. gallery-3d-hall.js가 상태 객체(state)를 넘겨 부른다.
// 명세: docs/gallery_3d_hall_spec.md §4-4~4-6. gallery-3d-layout.js 다음, gallery-3d-hall.js 앞에 싣는다.
(function () {
  "use strict";

  const CFG = Object.freeze({
    MAX_DPR: 1.75, HFOV_HALF_DEG: 35, VFOV_MIN: 65, VFOV_MAX: 95, NEAR: 0.1, FAR: 60,
    FOG_NEAR: 8, FOG_FAR: 30, MAX_PITCH: 0.35, ENTRANCE_PAD: 0.5,
    BORDER_PAD: 0.12, BORDER_DEPTH: 0.06, MAT_PAD: 0.06, PLATE_W: 1.2, PLATE_H: 0.3, PLATE_GAP: 0.12,
    CHAR_H: 1.1, CHAR_Z_OFF: 1.3, CHAR_X_OFF: 0.6, STRIPE_W: 0.18, SIGN_W: 3.2, SIGN_H: 0.65, SIGN_Y: 3.35,
    MAX_IMG_DIM: 1024, MAX_CONCURRENT: 3, PHONE_BP: 700, BUDGET_PHONE: 14, BUDGET_PC: 24,
    TEX_MOVE_DIST: 2, RETRY_COOLDOWN_MS: 15000, DRAG_PX: 6, YAW_SENS: 0.005, PITCH_SENS: 0.003,
    GLIDE_MIN_S: 0.5, GLIDE_MAX_S: 1.6, GLIDE_SPEED: 6, GLIDE_DT_CAP: 0.5, KEY_DT_CAP: 0.1,
    MOVE_SPEED: 3, TURN_SPEED: 1.8, WHEEL_STEP: 0.6, AT_VP_DIST: 0.05, AT_VP_YAW: 0.02,
    HINT_MS: 6000, BLOCK_POLL_MS: 500, FONT: "'Jua', sans-serif"
  });

  const THEMES = Object.freeze({
    neon: Object.freeze({
      bg: "#1a1030", wall: "#2b1d4a", floor: "#1f1638", border: "#00ff9d", mat: "#0f0a1f",
      plateText: "#e8fff6", signText: "#00ff9d", signBg: "#120b24", hemi: 0.9, dir: 0.6
    }),
    pastel: Object.freeze({
      bg: "#fff8f0", wall: "#fdf6ec", floor: "#f3e3d3", border: "#ff85a2", mat: "#ffffff",
      plateText: "#5a3a44", signText: "#ff6f91", signBg: "#fffdf9", hemi: 2.4, dir: 0.5
    })
  });

  const ROOM_PREFIX = "전시실 ";

  function makeCanvasTexture(THREE, w, h, drawFn) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function fitEllipsis(ctx, text, maxW) {
    if (!text) return "";
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
    return s + "…";
  }

  function makeSignTexture(THREE, theme, label) {
    return makeCanvasTexture(THREE, 512, 128, (ctx, w, h) => {
      ctx.fillStyle = theme.signBg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = theme.signText;
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = theme.signText;
      ctx.font = "bold 46px " + CFG.FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fitEllipsis(ctx, label, w - 48), w / 2, h / 2 + 2);
    });
  }

  function makePlateTexture(THREE, theme, title, caption) {
    return makeCanvasTexture(THREE, 512, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = theme.plateText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 38px " + CFG.FONT;
      ctx.fillText(fitEllipsis(ctx, title || "", w - 32), w / 2, caption ? 42 : h / 2);
      if (caption) {
        ctx.globalAlpha = 0.85;
        ctx.font = "28px " + CFG.FONT;
        ctx.fillText(fitEllipsis(ctx, caption, w - 32), w / 2, 92);
      }
    });
  }

  function makePlaceholderTexture(THREE, theme, subText) {
    return makeCanvasTexture(THREE, 256, 256, (ctx, w, h) => {
      ctx.fillStyle = theme.mat;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = theme.plateText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "54px " + CFG.FONT;
      ctx.fillText("🖼️", w / 2, h / 2 - 24);
      ctx.font = "24px " + CFG.FONT;
      ctx.fillText(subText, w / 2, h / 2 + 44);
    });
  }

  function imageToTexture(THREE, img) {
    const nw = img.naturalWidth || img.width || 1;
    const nh = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, CFG.MAX_IMG_DIM / Math.max(nw, nh));
    const tw = Math.max(1, Math.round(nw * scale));
    const th = Math.max(1, Math.round(nh * scale));
    const tex = makeCanvasTexture(THREE, tw, th, (ctx) => {
      ctx.drawImage(img, 0, 0, tw, th);
    });
    return { tex, aspect: nw / nh };
  }

  function buildHall(state) {
    const { THREE, scene, theme, layout } = state;
    const C = window.Gallery3DLayout.CONST;
    const startZ = layout.bounds.maxZ + CFG.ENTRANCE_PAD;
    const endZ = layout.bounds.minZ - 0.7;
    const len = startZ - endZ;
    const midZ = (startZ + endZ) / 2;
    const halfW = C.HALL_WIDTH / 2;

    const floorMat = new THREE.MeshLambertMaterial({ color: theme.floor });
    const wallMat = new THREE.MeshLambertMaterial({ color: theme.wall });
    const ceilMat = new THREE.MeshBasicMaterial({ color: theme.bg });

    const floor = new THREE.Mesh(state.unitPlane, floorMat);
    floor.scale.set(C.HALL_WIDTH, len, 1);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, midZ);
    scene.add(floor);
    state.floorMesh = floor;

    const ceil = new THREE.Mesh(state.unitPlane, ceilMat);
    ceil.scale.set(C.HALL_WIDTH, len, 1);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, C.HALL_HEIGHT, midZ);
    scene.add(ceil);

    const addWall = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(state.unitPlane, wallMat);
      m.scale.set(w, h, 1);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
    };
    addWall(len, C.HALL_HEIGHT, -halfW, C.HALL_HEIGHT / 2, midZ, Math.PI / 2);
    addWall(len, C.HALL_HEIGHT, halfW, C.HALL_HEIGHT / 2, midZ, -Math.PI / 2);
    addWall(C.HALL_WIDTH, C.HALL_HEIGHT, 0, C.HALL_HEIGHT / 2, endZ, 0);
    addWall(C.HALL_WIDTH, C.HALL_HEIGHT, 0, C.HALL_HEIGHT / 2, startZ, Math.PI);

    const stripeMat = new THREE.MeshBasicMaterial({ color: theme.border });
    for (let i = 0; i < layout.rooms.length; i++) {
      const rm = layout.rooms[i];
      if (i > 0) {
        const stripe = new THREE.Mesh(state.unitPlane, stripeMat);
        stripe.scale.set(C.HALL_WIDTH - 0.4, CFG.STRIPE_W, 1);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.005, rm.zStart);
        scene.add(stripe);
      }
      const label = rm.label || (ROOM_PREFIX + (i + 1));
      const signTex = makeSignTexture(THREE, theme, label);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
      const sign = new THREE.Mesh(state.unitPlane, signMat);
      sign.scale.set(CFG.SIGN_W, CFG.SIGN_H, 1);
      sign.position.set(0, CFG.SIGN_Y, rm.zStart - 0.3);
      scene.add(sign);
    }
  }

  function applyFrameDimensions(fObj, aspect) {
    const C = window.Gallery3DLayout.CONST;
    const dim = window.Gallery3DLayout.fitFrame(aspect, C.FRAME_MAX_W, C.FRAME_MAX_H);
    fObj.width = dim.width;
    fObj.height = dim.height;
    fObj.border.scale.set(dim.width + CFG.BORDER_PAD, dim.height + CFG.BORDER_PAD, CFG.BORDER_DEPTH);
    fObj.mat.scale.set(dim.width + CFG.MAT_PAD, dim.height + CFG.MAT_PAD, 1);
    fObj.art.scale.set(dim.width, dim.height, 1);
    fObj.plate.position.set(0, -(dim.height / 2) - CFG.PLATE_GAP - (CFG.PLATE_H / 2), 0.02);
  }

  function buildFrames(state) {
    const { THREE, scene, theme, layout } = state;
    const borderMat = new THREE.MeshLambertMaterial({ color: theme.border });
    const matMat = new THREE.MeshBasicMaterial({ color: theme.mat });

    for (let i = 0; i < layout.frames.length; i++) {
      const f = layout.frames[i];
      const group = new THREE.Group();
      group.position.set(f.x, f.y, f.z);
      group.rotation.y = f.rotY;

      const border = new THREE.Mesh(state.unitBox, borderMat);
      border.position.set(0, 0, -CFG.BORDER_DEPTH / 2);

      const mat = new THREE.Mesh(state.unitPlane, matMat);
      mat.position.set(0, 0, 0.015);

      const artMat = new THREE.MeshBasicMaterial({
        map: state.placeholders.load,
        transparent: Boolean(f.hasCutout)
      });
      const art = new THREE.Mesh(state.unitPlane, artMat);
      art.position.set(0, 0, 0.025);
      art.userData.frameIndex = f.index;

      const plateTex = makePlateTexture(THREE, theme, f.title, f.caption);
      const plateMat = new THREE.MeshBasicMaterial({ map: plateTex, transparent: true });
      const plate = new THREE.Mesh(state.unitPlane, plateMat);
      plate.scale.set(CFG.PLATE_W, CFG.PLATE_H, 1);

      group.add(border, mat, art, plate);
      scene.add(group);

      let charSprite = null;
      if (f.characterUrl) {
        const spMat = new THREE.SpriteMaterial({ map: null, transparent: true });
        charSprite = new THREE.Sprite(spMat);
        charSprite.center.set(0.5, 0);
        charSprite.visible = false;
        const cx = f.side === "left" ? f.x + CFG.CHAR_X_OFF : f.x - CFG.CHAR_X_OFF;
        charSprite.position.set(cx, 0, f.z + CFG.CHAR_Z_OFF);
        scene.add(charSprite);
      }

      const fObj = {
        data: f, group, border, mat, art, plate, charSprite,
        width: f.width, height: f.height, tex: null, charTex: null, status: "empty"
      };
      applyFrameDimensions(fObj, 1);
      state.frames.push(fObj);
      state.frameMap.set(f.id, fObj);
      state.artMeshes.push(art);
    }
  }

  window.Gallery3DScene = Object.freeze({
    CFG, THEMES, makeCanvasTexture, makePlaceholderTexture, imageToTexture,
    buildHall, buildFrames, applyFrameDimensions
  });
})();
