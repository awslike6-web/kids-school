// 5-2 수학 3단원 합동과 대칭: 화면 없는 도형 계산 (CongruenceGeo)
(function (global) {
  'use strict';

  const GRID = 8;
  const LABELS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ'];

  function cleanZero(n) {
    return n === 0 ? 0 : n;
  }

  function key(p) {
    return cleanZero(p[0]) + ',' + cleanZero(p[1]);
  }

  function samePointSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    const ka = a.map(key).sort();
    const kb = b.map(key).sort();
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return false;
    }
    return true;
  }

  function normalize(poly) {
    if (!poly || poly.length === 0) return [];
    let minX = Infinity;
    let minY = Infinity;
    for (let i = 0; i < poly.length; i++) {
      if (poly[i][0] < minX) minX = poly[i][0];
      if (poly[i][1] < minY) minY = poly[i][1];
    }
    return poly.map(function (p) {
      return [cleanZero(p[0] - minX), cleanZero(p[1] - minY)];
    });
  }

  function transform(poly, rot, flip) {
    const r = ((rot % 4) + 4) % 4;
    const pts = poly.map(function (p) {
      let x = flip ? -p[0] : p[0];
      let y = p[1];
      if (r === 1) {
        const nx = -y;
        const ny = x;
        x = nx;
        y = ny;
      } else if (r === 2) {
        x = -x;
        y = -y;
      } else if (r === 3) {
        const nx = y;
        const ny = -x;
        x = nx;
        y = ny;
      }
      return [cleanZero(x), cleanZero(y)];
    });
    return normalize(pts);
  }

  function findCongruence(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
      return null;
    }
    const nb = normalize(b);
    const bMap = new Map();
    for (let j = 0; j < nb.length; j++) {
      const k = key(nb[j]);
      if (!bMap.has(k)) {
        bMap.set(k, j);
      }
    }
    if (bMap.size !== nb.length) return null;

    const flips = [false, true];
    for (let fi = 0; fi < flips.length; fi++) {
      const flip = flips[fi];
      for (let rot = 0; rot < 4; rot++) {
        const ta = transform(a, rot, flip);
        const map = new Array(ta.length);
        const used = new Set();
        let ok = true;
        for (let i = 0; i < ta.length; i++) {
          const idx = bMap.get(key(ta[i]));
          if (idx === undefined || used.has(idx)) {
            ok = false;
            break;
          }
          used.add(idx);
          map[i] = idx;
        }
        if (ok) {
          return { rot: rot, flip: flip, map: map };
        }
      }
    }
    return null;
  }

  function isCongruent(a, b) {
    return findCongruence(a, b) !== null;
  }

  function reflectPoint(p, axis) {
    const ax = axis.a[0];
    const ay = axis.a[1];
    const bx = axis.b[0];
    const by = axis.b[1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return [cleanZero(p[0]), cleanZero(p[1])];
    if (dx === 0) {
      return [cleanZero(2 * ax - p[0]), cleanZero(p[1])];
    }
    if (dy === 0) {
      return [cleanZero(p[0]), cleanZero(2 * ay - p[1])];
    }
    const apx = p[0] - ax;
    const apy = p[1] - ay;
    const t = (apx * dx + apy * dy) / len2;
    const fx = ax + t * dx;
    const fy = ay + t * dy;
    return [cleanZero(2 * fx - p[0]), cleanZero(2 * fy - p[1])];
  }

  function rotatePoint(p, center, deg) {
    const cx = center[0];
    const cy = center[1];
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const steps = ((Math.round(deg / 90) % 4) + 4) % 4;
    if (steps === 0) return [cleanZero(cx + dx), cleanZero(cy + dy)];
    if (steps === 1) return [cleanZero(cx - dy), cleanZero(cy + dx)];
    if (steps === 2) return [cleanZero(cx - dx), cleanZero(cy - dy)];
    return [cleanZero(cx + dy), cleanZero(cy - dx)];
  }

  function rotateHalf(p, center) {
    return [cleanZero(2 * center[0] - p[0]), cleanZero(2 * center[1] - p[1])];
  }

  function bbox(poly) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      const x = poly[i][0];
      const y = poly[i][1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function bboxCenter(poly) {
    const b = bbox(poly);
    return [cleanZero((b.minX + b.maxX) / 2), cleanZero((b.minY + b.maxY) / 2)];
  }

  function candidateAxes(poly) {
    if (!poly || poly.length === 0) return [];
    const b = bbox(poly);
    const cx = cleanZero((b.minX + b.maxX) / 2);
    const cy = cleanZero((b.minY + b.maxY) / 2);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const axes = [
      { kind: 'v', a: [cx, 0], b: [cx, GRID] },
      { kind: 'h', a: [0, cy], b: [GRID, cy] }
    ];
    if (w > 0 && w === h) {
      axes.push({ kind: 'd1', a: [b.minX, b.minY], b: [b.maxX, b.maxY] });
      axes.push({ kind: 'd2', a: [b.minX, b.maxY], b: [b.maxX, b.minY] });
    }
    return axes;
  }

  function symmetryAxes(poly) {
    const cands = candidateAxes(poly);
    return cands.filter(function (axis) {
      const reflected = poly.map(function (p) {
        return reflectPoint(p, axis);
      });
      return samePointSet(poly, reflected);
    });
  }

  function isPointSymmetric(poly) {
    if (!poly || poly.length === 0) return false;
    const c = bboxCenter(poly);
    const rotated = poly.map(function (p) {
      return rotateHalf(p, c);
    });
    return samePointSet(poly, rotated);
  }

  function signedArea2(poly) {
    let sum = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      sum += a[0] * b[1] - b[0] * a[1];
    }
    return sum;
  }

  function angleAt(poly, i) {
    const n = poly.length;
    const idx = ((i % n) + n) % n;
    const prev = poly[(idx - 1 + n) % n];
    const curr = poly[idx];
    const next = poly[(idx + 1) % n];

    const ux = prev[0] - curr[0];
    const uy = prev[1] - curr[1];
    const vx = next[0] - curr[0];
    const vy = next[1] - curr[1];

    const mag = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    if (mag === 0) return 0;

    const cosVal = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / mag));
    let deg = (Math.acos(cosVal) * 180) / Math.PI;

    const e1x = curr[0] - prev[0];
    const e1y = curr[1] - prev[1];
    const cross = e1x * vy - e1y * vx;
    const area2 = signedArea2(poly);

    if (area2 * cross < 0) {
      deg = 360 - deg;
    }
    return Math.round(deg * 10) / 10;
  }

  function sideLength(poly, i) {
    const n = poly.length;
    const a = poly[((i % n) + n) % n];
    const b = poly[(((i + 1) % n) + n) % n];
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }

  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SHAPES = {
    rightTriangle: {
      name: '직각삼각형',
      poly: [[1, 1], [1, 5], [4, 5]]
    },
    rightTrapezoid: {
      name: '사다리꼴',
      poly: [[1, 1], [4, 1], [6, 5], [1, 5]]
    },
    lHexagon: {
      name: 'ㄱ자 육각형',
      poly: [[1, 1], [7, 1], [7, 3], [3, 3], [3, 6], [1, 6]]
    },
    smallL: {
      // 1관: 2배로 키워도 8칸 안에 들어가는 작은 ㄱ자 (가로 3, 세로 4)
      name: '작은 ㄱ자 육각형',
      poly: [[1, 1], [4, 1], [4, 2], [2, 2], [2, 5], [1, 5]]
    },
    scaleneQuad: {
      name: '사각형',
      poly: [[1, 2], [4, 1], [7, 5], [2, 7]]
    },
    isoscelesTriangle: {
      name: '이등변삼각형',
      poly: [[4, 1], [7, 6], [1, 6]]
    },
    kite: {
      name: '연꼴',
      poly: [[4, 1], [7, 3], [4, 7], [1, 3]]
    },
    arrow: {
      name: '화살표',
      poly: [[4, 1], [7, 4], [5, 4], [5, 7], [3, 7], [3, 4], [1, 4]]
    },
    parallelogram: {
      name: '평행사변형',
      poly: [[2, 2], [7, 2], [5, 6], [0, 6]]
    },
    sHexagon: {
      name: 'S자 육각형',
      poly: [[1, 1], [6, 1], [4, 3], [7, 7], [2, 7], [4, 5]]
    },
    rectangle: {
      name: '직사각형',
      poly: [[1, 2], [7, 2], [7, 6], [1, 6]]
    },
    square: {
      name: '정사각형',
      poly: [[2, 2], [6, 2], [6, 6], [2, 6]]
    },
    rhombus: {
      name: '마름모',
      poly: [[4, 1], [6, 4], [4, 7], [2, 4]]
    },
    wideHexagon: {
      name: '육각형',
      poly: [[2, 2], [6, 2], [8, 4], [6, 6], [2, 6], [0, 4]]
    }
  };

  function makeLinePuzzle(rng, orientation) {
    const orient = orientation === 'h' ? 'h' : 'v';
    const midCount = rng() < 0.5 ? 2 : 3;
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const total = midCount + 2;
    for (let i = 0; i < total; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const ys = pool.slice(0, total).sort(function (a, b) {
      return a - b;
    });

    const leftPts = [];
    for (let i = 1; i <= midCount; i++) {
      const x = Math.floor(rng() * 4);
      leftPts.push([x, ys[i]]);
    }

    const givenV = [[4, ys[0]]].concat(leftPts, [[4, ys[ys.length - 1]]]);
    const answerV = leftPts.slice().reverse().map(function (p) {
      return [8 - p[0], p[1]];
    });

    if (orient === 'h') {
      const swap = function (p) {
        return [p[1], p[0]];
      };
      const given = givenV.map(swap);
      const answer = answerV.map(swap);
      return {
        axis: { kind: 'h', a: [0, 4], b: [8, 4] },
        given: given,
        answer: answer,
        full: given.concat(answer)
      };
    }

    return {
      axis: { kind: 'v', a: [4, 0], b: [4, 8] },
      given: givenV,
      answer: answerV,
      full: givenV.concat(answerV)
    };
  }

  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  }

  function makePointPuzzle(rng) {
    const center = [4, 4];
    const byRay = new Map();

    for (let y = 0; y <= GRID; y++) {
      for (let x = 0; x <= GRID; x++) {
        const dx = x - 4;
        const dy = y - 4;
        if (dx === 0 && dy === 0) continue;
        if (!(dy > 0 || (dy === 0 && dx > 0))) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < 1 || dist > 4) continue;
        const g = gcd(dx, dy);
        const rayKey = (dx / g) + ',' + (dy / g);
        if (!byRay.has(rayKey)) {
          byRay.set(rayKey, []);
        }
        byRay.get(rayKey).push({ p: [x, y], angle: Math.atan2(dy, dx) });
      }
    }

    const rays = Array.from(byRay.values());
    const count = rng() < 0.5 ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(rng() * (rays.length - i));
      const tmp = rays[i];
      rays[i] = rays[j];
      rays[j] = tmp;
    }

    const chosen = rays.slice(0, count).map(function (bucket) {
      return bucket[Math.floor(rng() * bucket.length)];
    });
    chosen.sort(function (a, b) {
      return a.angle - b.angle;
    });

    const given = chosen.map(function (item) {
      return item.p;
    });
    const answer = given.map(function (p) {
      return rotateHalf(p, center);
    });

    return {
      center: center,
      given: given,
      answer: answer,
      full: given.concat(answer)
    };
  }

  global.CongruenceGeo = {
    GRID: GRID,
    LABELS: LABELS,
    key: key,
    samePointSet: samePointSet,
    normalize: normalize,
    transform: transform,
    findCongruence: findCongruence,
    isCongruent: isCongruent,
    reflectPoint: reflectPoint,
    rotatePoint: rotatePoint,
    rotateHalf: rotateHalf,
    candidateAxes: candidateAxes,
    symmetryAxes: symmetryAxes,
    bboxCenter: bboxCenter,
    isPointSymmetric: isPointSymmetric,
    angleAt: angleAt,
    sideLength: sideLength,
    makeRng: makeRng,
    SHAPES: SHAPES,
    makeLinePuzzle: makeLinePuzzle,
    makePointPuzzle: makePointPuzzle
  };
})(typeof window !== 'undefined' ? window : globalThis);
