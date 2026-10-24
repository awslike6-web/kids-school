(() => {
    const vCanvas = document.getElementById('viewer-canvas');
    const vCtx = vCanvas.getContext('2d');
    let shape3DType = 'box';
    let rotX = 0.35, rotY = 0.55;
    let isDragging3D = false;
    let lastMouseX = 0, lastMouseY = 0;
    let autoSpinActive = false;
    let activeHighlight = null; // 'flat', 'round', 'point'

    function set3DShape(type) {
      shape3DType = type;
      activeHighlight = null;
      document.querySelectorAll('#lab-1 .shape-selector-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-3d-' + (type === 'cylinder' ? 'cyl' : type)).classList.add('active');

      const fb = document.getElementById('lab1-explain-box');
      if (type === 'box') {
        fb.innerHTML = "📦 <strong>상자 모양:</strong> 6개 면이 모두 평평하고 뾰족한 꼭짓점이 8개 있어요. 어느 방향으로도 잘 쌓여요!";
        if (typeof fairySpeak === 'function') fairySpeak('상자 모양은 모든 면이 평평해서 아주 잘 쌓여요!');
      } else if (type === 'cylinder') {
        fb.innerHTML = "🥫 <strong>둥근기둥 모양:</strong> 위와 아래는 평평한 원이고, 옆면은 매끈하게 둥글어요. 세우면 쌓이고 눕히면 굴러가요!";
        if (typeof fairySpeak === 'function') fairySpeak('둥근기둥 모양은 세우면 쌓이고 눕히면 굴러가요!');
      } else if (type === 'sphere') {
        fb.innerHTML = "⚽ <strong>공 모양:</strong> 몸 전체가 부드러운 둥근 면이에요. 뾰족한 곳이 없어서 어디로든 가장 잘 굴러가요!";
        if (typeof fairySpeak === 'function') fairySpeak('공 모양은 어디로든 잘 굴러가지만 쌓을 수는 없어요!');
      }
      render3D();
    }

    function autoSpin3D() {
      autoSpinActive = !autoSpinActive;
      if (autoSpinActive) requestAnimationFrame(spin3DLoop);
    }

    function spin3DLoop() {
      if (!autoSpinActive) return;
      rotY += 0.02;
      render3D();
      requestAnimationFrame(spin3DLoop);
    }

    function highlightFeature(feat) {
      activeHighlight = feat;
      const fb = document.getElementById('lab1-explain-box');
      if (feat === 'flat') {
        if (shape3DType === 'box') {
          fb.innerHTML = "📐 <strong>상자 모양:</strong> 6개 면이 <span style='color:#db2777; font-weight:bold;'>모두 평평해요!</span> 바닥에 닿는 면이 넓어서 튼튼해요.";
          if (typeof fairySpeak === 'function') fairySpeak('상자 모양은 여섯 개 면이 모두 평평해요!');
        } else if (shape3DType === 'cylinder') {
          fb.innerHTML = "📐 <strong>둥근기둥 모양:</strong> 위아래의 <span style='color:#0284c7; font-weight:bold;'>둥근 원 2개가 평평해요!</span> 이쪽으로 세우면 쌓을 수 있어요.";
          if (typeof fairySpeak === 'function') fairySpeak('둥근기둥 모양은 위와 아래의 면이 평평해요!');
        } else {
          fb.innerHTML = "📐 <strong>공 모양:</strong> <span style='color:#b91c1c; font-weight:bold;'>평평한 면이 0개예요!</span> 바닥에 닿는 면적이 1개 점이라 쌓을 수 없어요.";
          if (typeof fairySpeak === 'function') fairySpeak('공 모양은 평평한 면이 전혀 없어요!');
        }
      } else if (feat === 'round') {
        if (shape3DType === 'box') {
          fb.innerHTML = "🌀 <strong>상자 모양:</strong> 둥근 면이 <span style='color:#b91c1c; font-weight:bold;'>0개예요!</span> 그래서 전혀 굴러가지 않아요.";
          if (typeof fairySpeak === 'function') fairySpeak('상자 모양은 둥근 면이 없어요.');
        } else if (shape3DType === 'cylinder') {
          fb.innerHTML = "🌀 <strong>둥근기둥 모양:</strong> 둘레를 감싼 <span style='color:#0284c7; font-weight:bold;'>옆면이 매끈하게 둥글어요!</span> 눕히면 떼구르르 굴러가요.";
          if (typeof fairySpeak === 'function') fairySpeak('둥근기둥 옆면은 둥글어서 눕히면 잘 굴러가요!');
        } else {
          fb.innerHTML = "🌀 <strong>공 모양:</strong> <span style='color:#10b981; font-weight:bold;'>몸 전체가 하나의 둥근 면이에요!</span> 어떤 방향으로 밀어도 씽씽 굴러가요.";
          if (typeof fairySpeak === 'function') fairySpeak('공 모양은 전체가 둥글어서 어디로든 잘 굴러가요!');
        }
      } else if (feat === 'point') {
        if (shape3DType === 'box') {
          fb.innerHTML = "📍 <strong>상자 모양:</strong> 뾰족한 꼭짓점이 <span style='color:#ef4444; font-weight:bold;'>8개 있어요!</span> 찔리지 않게 만져보세요.";
          if (typeof fairySpeak === 'function') fairySpeak('상자 모양은 뾰족한 꼭짓점이 여덟 개 있어요.');
        } else if (shape3DType === 'cylinder') {
          fb.innerHTML = "📍 <strong>둥근기둥 모양:</strong> 뾰족한 꼭짓점이 <span style='color:#10b981; font-weight:bold;'>0개예요!</span> 부드러운 둥근 테두리만 있어요.";
          if (typeof fairySpeak === 'function') fairySpeak('둥근기둥 모양은 뾰족한 곳이 없어요.');
        } else {
          fb.innerHTML = "📍 <strong>공 모양:</strong> 뾰족한 꼭짓점이 <span style='color:#10b981; font-weight:bold;'>0개예요!</span> 어디를 쥐어도 손이 아프지 않아요.";
          if (typeof fairySpeak === 'function') fairySpeak('공 모양은 뾰족한 곳이 전혀 없어요.');
        }
      }
      render3D();
    }

    // 마우스/터치 드래그 바인딩
    vCanvas.addEventListener('mousedown', e => {
      isDragging3D = true;
      autoSpinActive = false;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => isDragging3D = false);
    vCanvas.addEventListener('mousemove', e => {
      if (!isDragging3D) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      rotY += dx * 0.01;
      rotX += dy * 0.01;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      render3D();
    });

    vCanvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        isDragging3D = true;
        autoSpinActive = false;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    }, {passive: false});
    window.addEventListener('touchend', () => isDragging3D = false);
    vCanvas.addEventListener('touchmove', e => {
      if (!isDragging3D || e.touches.length !== 1) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - lastMouseX;
      const dy = e.touches[0].clientY - lastMouseY;
      rotY += dx * 0.01;
      rotX += dy * 0.01;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
      render3D();
    }, {passive: false});

    // 3D 투영 보조 함수
    function project3D(x, y, z, cx, cy, fov = 420) {
      // Y-axis rotation
      let cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      let x1 = x * cosY + z * sinY;
      let z1 = -x * sinY + z * cosY;

      // X-axis rotation
      let cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      let y2 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;

      let scale = fov / (fov + z2);
      return { x: cx + x1 * scale, y: cy + y2 * scale, z: z2, scale: scale };
    }

    function render3D() {
      const W = vCanvas.width;
      const H = vCanvas.height;
      const cx = W / 2, cy = H / 2;

      vCtx.clearRect(0, 0, W, H);

      // 부드러운 그림자
      vCtx.save();
      vCtx.beginPath();
      vCtx.ellipse(cx, cy + 105, 110, 26, 0, 0, Math.PI * 2);
      vCtx.fillStyle = "rgba(100, 116, 139, 0.18)";
      vCtx.fill();
      vCtx.restore();

      if (shape3DType === 'box') {
        render3DCube(cx, cy);
      } else if (shape3DType === 'cylinder') {
        render3DCylinder(cx, cy);
      } else if (shape3DType === 'sphere') {
        render3DSphere(cx, cy);
      }
    }

    /* 1-1. 상자 모양 3D 렌더러 */
    function render3DCube(cx, cy) {
      const s = 65;
      const vertices = [
        [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
        [-s, -s,  s], [s, -s,  s], [s, s,  s], [-s, s,  s]
      ];
      const faces = [
        { idx: [0, 1, 2, 3], norm: [0, 0, -1], name: "front", color: "#ec4899" },
        { idx: [5, 4, 7, 6], norm: [0, 0, 1],  name: "back",  color: "#db2777" },
        { idx: [4, 0, 3, 7], norm: [-1, 0, 0], name: "left",  color: "#f472b6" },
        { idx: [1, 5, 6, 2], norm: [1, 0, 0],  name: "right", color: "#be185d" },
        { idx: [4, 5, 1, 0], norm: [0, -1, 0], name: "top",   color: "#fbcfe8" },
        { idx: [3, 2, 6, 7], norm: [0, 1, 0],  name: "bottom",color: "#9d174d" }
      ];

      const proj = vertices.map(v => project3D(v[0], v[1], v[2], cx, cy));

      // 면 정렬 및 뒷면 제거
      faces.forEach(f => {
        let avgZ = (proj[f.idx[0]].z + proj[f.idx[1]].z + proj[f.idx[2]].z + proj[f.idx[3]].z) / 4;
        f.avgZ = avgZ;
      });
      faces.sort((a, b) => b.avgZ - a.avgZ);

      faces.forEach(f => {
        const p0 = proj[f.idx[0]], p1 = proj[f.idx[1]], p2 = proj[f.idx[2]], p3 = proj[f.idx[3]];
        // Backface check (2D cross product)
        const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        if (cross < 0) return; // 뒤쪽 면 숨김

        vCtx.beginPath();
        vCtx.moveTo(p0.x, p0.y);
        vCtx.lineTo(p1.x, p1.y);
        vCtx.lineTo(p2.x, p2.y);
        vCtx.lineTo(p3.x, p3.y);
        vCtx.closePath();

        if (activeHighlight === 'flat') {
          vCtx.fillStyle = "rgba(251, 191, 36, 0.85)";
          vCtx.strokeStyle = "#b45309";
          vCtx.lineWidth = 4;
        } else {
          vCtx.fillStyle = f.color;
          vCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          vCtx.lineWidth = 2.5;
        }
        vCtx.fill();
        vCtx.stroke();
      });

      // 뾰족한 곳(꼭짓점) 하이라이트
      if (activeHighlight === 'point') {
        proj.forEach(p => {
          vCtx.beginPath();
          vCtx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          vCtx.fillStyle = "#ef4444";
          vCtx.strokeStyle = "#fff";
          vCtx.lineWidth = 2.5;
          vCtx.fill();
          vCtx.stroke();
        });
      }
    }

    /* 1-2. 둥근기둥 모양 3D 렌더러 (완벽한 볼륨 32각 원통) */
    function render3DCylinder(cx, cy) {
      const R = 62;
      const H2 = 70;
      const N = 32;

      const topPts = [], botPts = [];
      for (let i = 0; i < N; i++) {
        let theta = (i / N) * Math.PI * 2;
        let x = Math.cos(theta) * R;
        let z = Math.sin(theta) * R;
        topPts.push(project3D(x, -H2, z, cx, cy));
        botPts.push(project3D(x,  H2, z, cx, cy));
      }

      // 측면 패싯(Quad) 구성 및 Z-sort
      const quads = [];
      for (let i = 0; i < N; i++) {
        let next = (i + 1) % N;
        let pTop1 = topPts[i], pTop2 = topPts[next];
        let pBot1 = botPts[i], pBot2 = botPts[next];
        let avgZ = (pTop1.z + pTop2.z + pBot1.z + pBot2.z) / 4;
        quads.push({ pTop1, pTop2, pBot1, pBot2, avgZ, idx: i });
      }
      quads.sort((a, b) => b.avgZ - a.avgZ);

      // 1. 측면 그리기
      quads.forEach(q => {
        vCtx.beginPath();
        vCtx.moveTo(q.pTop1.x, q.pTop1.y);
        vCtx.lineTo(q.pTop2.x, q.pTop2.y);
        vCtx.lineTo(q.pBot2.x, q.pBot2.y);
        vCtx.lineTo(q.pBot1.x, q.pBot1.y);
        vCtx.closePath();

        if (activeHighlight === 'round') {
          vCtx.fillStyle = "rgba(14, 165, 233, 0.9)";
          vCtx.strokeStyle = "#fbbf24";
          vCtx.lineWidth = 1.5;
        } else {
          // 광원 효과
          let light = Math.sin((q.idx / N) * Math.PI * 2 + rotY);
          let brightness = Math.floor(180 + light * 60);
          vCtx.fillStyle = `rgb(2, ${brightness}, 235)`;
          vCtx.strokeStyle = "rgba(2, 132, 199, 0.15)";
          vCtx.lineWidth = 0.5;
        }
        vCtx.fill();
        vCtx.stroke();
      });

      // 2. 상단 원 & 하단 원 렌더링
      const drawCap = (pts, isTop) => {
        vCtx.beginPath();
        vCtx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < N; i++) vCtx.lineTo(pts[i].x, pts[i].y);
        vCtx.closePath();

        if (activeHighlight === 'flat') {
          vCtx.fillStyle = "rgba(251, 191, 36, 0.95)";
          vCtx.strokeStyle = "#b45309";
          vCtx.lineWidth = 3.5;
        } else {
          vCtx.fillStyle = isTop ? "#7dd3fc" : "#0284c7";
          vCtx.strokeStyle = "#0284c7";
          vCtx.lineWidth = 2;
        }
        vCtx.fill();
        vCtx.stroke();
      };

      // 법선 방향에 따른 뚜껑 그리기
      let topCenter = project3D(0, -H2, 0, cx, cy);
      let botCenter = project3D(0,  H2, 0, cx, cy);

      if (botCenter.z < topCenter.z) {
        drawCap(topPts, true);
        drawCap(botPts, false);
      } else {
        drawCap(botPts, false);
        drawCap(topPts, true);
      }
    }

    /* 1-3. 공 모양 3D 렌더러 */
    function render3DSphere(cx, cy) {
      const R = 75;
      const center = project3D(0, 0, 0, cx, cy);

      // 본체 구
      vCtx.save();
      vCtx.beginPath();
      vCtx.arc(center.x, center.y, R, 0, Math.PI * 2);

      if (activeHighlight === 'round') {
        vCtx.fillStyle = "rgba(16, 185, 129, 0.95)";
        vCtx.strokeStyle = "#fbbf24";
        vCtx.lineWidth = 5;
      } else {
        let grad = vCtx.createRadialGradient(
          center.x - R * 0.35, center.y - R * 0.35, R * 0.1,
          center.x, center.y, R
        );
        grad.addColorStop(0, "#a7f3d0");
        grad.addColorStop(0.4, "#10b981");
        grad.addColorStop(1, "#047857");
        vCtx.fillStyle = grad;
        vCtx.strokeStyle = "#059669";
        vCtx.lineWidth = 2.5;
      }
      vCtx.fill();
      vCtx.stroke();
      vCtx.restore();

      // 위도선/경도선 (회전 체감용 3D 와이어)
      vCtx.save();
      vCtx.beginPath();
      vCtx.ellipse(center.x, center.y, R * Math.abs(Math.cos(rotY)), R, rotX, 0, Math.PI * 2);
      vCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      vCtx.lineWidth = 2;
      vCtx.stroke();

      vCtx.beginPath();
      vCtx.ellipse(center.x, center.y, R, R * Math.abs(Math.sin(rotX)), 0, 0, Math.PI * 2);
      vCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      vCtx.lineWidth = 1.5;
      vCtx.stroke();
      vCtx.restore();
    }

    /* ========================================================
       2. LAB 2 : 미끄럼틀 굴리기 60fps 물리 시뮬레이션
    ======================================================== */

Object.assign(window, {set3DShape, autoSpin3D, spin3DLoop, highlightFeature, project3D, render3D, render3DCube, render3DCylinder, render3DSphere});
})();
