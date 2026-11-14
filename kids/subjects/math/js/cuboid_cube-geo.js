// 5-2 수학 5단원 직육면체와 정육면체: 입체 계산 순수 모듈 (CuboidGeo, DOM 없음 · 시험 대상)
// 좌표: x 오른쪽, y 위, z 앞(보는 사람 쪽). 꼭짓점 기호는 교과서처럼 윗면 ㄱㄴㄷㄹ, 아랫면 ㅁㅂㅅㅇ.
(function (global) {
  'use strict';

  var LABELS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'];

  // 꼭짓점: 윗면 ㄱ(뒤 왼) ㄴ(앞 왼) ㄷ(앞 오) ㄹ(뒤 오), 아랫면 ㅁ ㅂ ㅅ ㅇ 은 각각 그 아래
  function cuboidVertices(w, h, d) {
    return [
      [0, h, 0], [0, h, d], [w, h, d], [w, h, 0],
      [0, 0, 0], [0, 0, d], [w, 0, d], [w, 0, 0]
    ];
  }

  // 면: 꼭짓점 번호(바깥에서 볼 때 시계 반대 방향), 이름, 바깥 방향
  var FACES = [
    { id: 'top', v: [0, 1, 2, 3], n: [0, 1, 0], pair: 'bottom', place: '위' },
    { id: 'bottom', v: [4, 7, 6, 5], n: [0, -1, 0], pair: 'top', place: '아래' },
    { id: 'front', v: [1, 5, 6, 2], n: [0, 0, 1], pair: 'back', place: '앞' },
    { id: 'back', v: [0, 3, 7, 4], n: [0, 0, -1], pair: 'front', place: '뒤' },
    { id: 'left', v: [0, 4, 5, 1], n: [-1, 0, 0], pair: 'right', place: '왼쪽' },
    { id: 'right', v: [2, 6, 7, 3], n: [1, 0, 0], pair: 'left', place: '오른쪽' }
  ];

  var EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

  // 면 이름 '면 ㄴㅂㅅㄷ' (교과서 순서: 테두리를 따라 읽기)
  var FACE_NAMES = {
    top: 'ㄱㄴㄷㄹ',
    bottom: 'ㅁㅂㅅㅇ',
    front: 'ㄴㅂㅅㄷ',
    back: 'ㄱㅁㅇㄹ',
    left: 'ㄱㅁㅂㄴ',
    right: 'ㄷㅅㅇㄹ'
  };

  function faceById(id) {
    for (var i = 0; i < FACES.length; i += 1) if (FACES[i].id === id) return FACES[i];
    return null;
  }

  function parallelFace(id) {
    var f = faceById(id);
    return f ? f.pair : null;
  }

  function perpendicularFaces(id) {
    var f = faceById(id);
    if (!f) return [];
    return FACES.filter(function (g) { return g.id !== f.id && g.id !== f.pair; }).map(function (g) { return g.id; });
  }

  // 회전(왼오른 yaw, 위아래 pitch, 도) 후 정사영. 화면 y는 아래로 커지므로 뒤집는다.
  function rotate(p, yawDeg, pitchDeg) {
    var ya = (yawDeg * Math.PI) / 180;
    var pa = (pitchDeg * Math.PI) / 180;
    var x1 = p[0] * Math.cos(ya) + p[2] * Math.sin(ya);
    var z1 = -p[0] * Math.sin(ya) + p[2] * Math.cos(ya);
    var y2 = p[1] * Math.cos(pa) - z1 * Math.sin(pa);
    var z2 = p[1] * Math.sin(pa) + z1 * Math.cos(pa);
    return [x1, y2, z2];
  }

  // 입체(꼭짓점·면) → 화면 좌표, 보이는 면, 모서리 실선/점선, 꼭짓점 보임 여부
  // solid: { vertices: [[x,y,z]], faces: [{ v: [...], id }] } — 면 꼭짓점은 바깥에서 볼 때 시계 반대 방향
  function view(solid, yawDeg, pitchDeg, scale, ox, oy) {
    var c = center(solid.vertices);
    var rv = solid.vertices.map(function (p) {
      return rotate([p[0] - c[0], p[1] - c[1], p[2] - c[2]], yawDeg, pitchDeg);
    });
    var pts = rv.map(function (p) { return [ox + p[0] * scale, oy - p[1] * scale]; });
    var faceVis = solid.faces.map(function (f) {
      var a = rv[f.v[0]];
      var b = rv[f.v[1]];
      var d = rv[f.v[2]];
      var nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
      return nz > 1e-9;
    });
    var edgeMap = {};
    solid.faces.forEach(function (f, fi) {
      for (var i = 0; i < f.v.length; i += 1) {
        var u = f.v[i];
        var w = f.v[(i + 1) % f.v.length];
        var key = u < w ? u + '-' + w : w + '-' + u;
        if (!edgeMap[key]) edgeMap[key] = { a: Math.min(u, w), b: Math.max(u, w), visible: false };
        if (faceVis[fi]) edgeMap[key].visible = true;
      }
    });
    var vertVis = solid.vertices.map(function () { return false; });
    solid.faces.forEach(function (f, fi) {
      if (faceVis[fi]) f.v.forEach(function (vi) { vertVis[vi] = true; });
    });
    return {
      points: pts,
      depth: rv.map(function (p) { return p[2]; }),
      faceVisible: faceVis,
      edges: Object.keys(edgeMap).map(function (k) { return edgeMap[k]; }),
      vertexVisible: vertVis
    };
  }

  function center(vs) {
    var s = [0, 0, 0];
    vs.forEach(function (p) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; });
    return [s[0] / vs.length, s[1] / vs.length, s[2] / vs.length];
  }

  function cuboid(w, h, d) {
    return { vertices: cuboidVertices(w, h, d), faces: FACES.map(function (f) { return { v: f.v, id: f.id }; }) };
  }

  // 1관 분류용 다른 입체: 삼각기둥, 사각뿔 (원기둥은 화면에서 타원으로 그린다)
  function triangularPrism(w, h, d) {
    return {
      vertices: [[0, 0, 0], [w, 0, 0], [w / 2, h, 0], [0, 0, d], [w, 0, d], [w / 2, h, d]],
      faces: [
        { v: [0, 2, 1], id: 'back' }, { v: [3, 4, 5], id: 'front' },
        { v: [0, 1, 4, 3], id: 'bottom' }, { v: [1, 2, 5, 4], id: 'right' }, { v: [2, 0, 3, 5], id: 'left' }
      ]
    };
  }

  function squarePyramid(w, h) {
    return {
      vertices: [[0, 0, 0], [w, 0, 0], [w, 0, w], [0, 0, w], [w / 2, h, w / 2]],
      faces: [
        { v: [0, 1, 2, 3], id: 'bottom' }, { v: [3, 2, 4], id: 'front' }, { v: [2, 1, 4], id: 'right' },
        { v: [1, 0, 4], id: 'back' }, { v: [0, 3, 4], id: 'left' }
      ]
    };
  }

  // ── 전개도 접기 ──
  // 전개도: 정사각형 칸 [열, 행] 6개. 첫 칸을 바닥에 두고, 이웃 칸을 모두 위(+z)로 90° 접는다.
  // 결과: 칸마다 네 모서리의 3D 좌표(정수). 칸 모서리 순서: 왼위, 오른위, 오른아래, 왼아래 (전개도 기준)
  function foldNet(cells) {
    var n = cells.length;
    var key = function (c) { return c[0] + ',' + c[1]; };
    var index = {};
    cells.forEach(function (c, i) { index[key(c)] = i; });
    var parent = [];
    var hinge = [];
    for (var p = 0; p < n; p += 1) {
      parent.push(-1);
      hinge.push(null);
    }
    var seen = [true];
    for (var s = 1; s < n; s += 1) seen.push(false);
    var queue = [0];
    while (queue.length) {
      var cur = queue.shift();
      var cc = cells[cur];
      var nbrs = [[1, 0, 'right'], [-1, 0, 'left'], [0, 1, 'down'], [0, -1, 'up']];
      for (var k = 0; k < nbrs.length; k += 1) {
        var nk = key([cc[0] + nbrs[k][0], cc[1] + nbrs[k][1]]);
        if (Object.prototype.hasOwnProperty.call(index, nk) && !seen[index[nk]]) {
          var ni = index[nk];
          seen[ni] = true;
          parent[ni] = cur;
          hinge[ni] = { dir: nbrs[k][2], cell: cc };
          queue.push(ni);
        }
      }
    }
    var connected = seen.every(Boolean);

    function rotateHinge(pt, h) {
      var x = pt[0];
      var y = pt[1];
      var z = pt[2];
      var c = h.cell;
      if (h.dir === 'right') { var X = c[0] + 1; return [X - z, y, x - X]; }
      if (h.dir === 'left') { var X2 = c[0]; return [X2 + z, y, X2 - x]; }
      if (h.dir === 'down') { var Y = c[1] + 1; return [x, Y - z, y - Y]; }
      var Y2 = c[1];
      return [x, Y2 + z, Y2 - y];
    }

    var corners = cells.map(function (c, i) {
      var pts = [[c[0], c[1], 0], [c[0] + 1, c[1], 0], [c[0] + 1, c[1] + 1, 0], [c[0], c[1] + 1, 0]];
      var node = i;
      while (node > 0 && parent[node] >= 0) {
        var h = hinge[node];
        pts = pts.map(function (pt) { return rotateHinge(pt, h); });
        node = parent[node];
      }
      return pts.map(function (pt) { return pt.map(function (v) { return Math.round(v * 1000) / 1000; }); });
    });
    var centers = corners.map(function (cs) { return center(cs).map(function (v) { return Math.round(v * 1000) / 1000; }); });
    var centerKeys = centers.map(function (c) { return c.join(','); });
    var distinct = centerKeys.filter(function (k, i) { return centerKeys.indexOf(k) === i; }).length;
    return {
      connected: connected,
      parent: parent,
      hinge: hinge,
      corners: corners,
      centers: centers,
      isCube: connected && n === 6 && distinct === 6
    };
  }

  // 마주 보는 칸 번호 (정육면체가 될 때만). 가운데를 지나 맞은편에 있는 칸.
  function oppositeCells(cells) {
    var r = foldNet(cells);
    if (!r.isCube) return null;
    var mid = center(r.centers);
    return r.centers.map(function (c, i) {
      for (var j = 0; j < r.centers.length; j += 1) {
        if (j === i) continue;
        var o = r.centers[j];
        if (Math.abs(c[0] + o[0] - 2 * mid[0]) < 1e-6 && Math.abs(c[1] + o[1] - 2 * mid[1]) < 1e-6 && Math.abs(c[2] + o[2] - 2 * mid[2]) < 1e-6) return j;
      }
      return -1;
    });
  }

  // 전개도의 점(격자 교차점 [x, y])끼리 접었을 때 만나는지: 같은 3D 꼭짓점으로 가는 점 목록
  function meetingPoints(cells, point) {
    var r = foldNet(cells);
    if (!r.isCube) return [];
    var target = null;
    var all = {};
    cells.forEach(function (c, i) {
      var flat = [[c[0], c[1]], [c[0] + 1, c[1]], [c[0] + 1, c[1] + 1], [c[0], c[1] + 1]];
      flat.forEach(function (fp, k) {
        var k3 = r.corners[i][k].join(',');
        var k2 = fp[0] + ',' + fp[1];
        if (fp[0] === point[0] && fp[1] === point[1]) target = k3;
        if (!all[k3]) all[k3] = {};
        all[k3][k2] = fp;
      });
    });
    if (!target) return [];
    return Object.keys(all[target]).map(function (k) { return all[target][k]; })
      .filter(function (fp) { return !(fp[0] === point[0] && fp[1] === point[1]); });
  }

  // 정육면체 전개도 11가지 (서로 다른 모양) + 정육면체가 되지 않는 모양
  var CUBE_NETS = [
    [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
    [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 1]]
  ];

  var NOT_NETS = [
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]].map(function (c, i) { return i === 5 ? [2, 2] : c; })
  ];

  global.CuboidGeo = {
    LABELS: LABELS,
    FACES: FACES,
    EDGES: EDGES,
    FACE_NAMES: FACE_NAMES,
    cuboidVertices: cuboidVertices,
    cuboid: cuboid,
    triangularPrism: triangularPrism,
    squarePyramid: squarePyramid,
    faceById: faceById,
    parallelFace: parallelFace,
    perpendicularFaces: perpendicularFaces,
    rotate: rotate,
    view: view,
    foldNet: foldNet,
    oppositeCells: oppositeCells,
    meetingPoints: meetingPoints,
    CUBE_NETS: CUBE_NETS,
    NOT_NETS: NOT_NETS
  };
})(typeof window !== 'undefined' ? window : globalThis);
