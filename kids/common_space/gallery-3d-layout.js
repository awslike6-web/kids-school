// kids/common_space/gallery-3d-layout.js — 가족 그림 갤러리 3D 전시관 계산 모듈
// 초안: 안티그래비티 Hydrogen, 검토: Claude
(function () {
  "use strict";

  // 전시관 기하·배치 기본 상수 (단위: 미터, 각도: 라디안)
  const CONST = Object.freeze({
    HALL_WIDTH: 8,
    HALL_HEIGHT: 4,
    EYE_HEIGHT: 1.45,
    SPACING: 3.2,
    START_GAP: 4,
    PER_ROOM: 10,
    FRAME_CENTER_Y: 1.7,
    FRAME_MAX_W: 1.8,
    FRAME_MAX_H: 1.6,
    END_GAP: 4
  });

  // 내부 계산용 보조 상수
  const HALF_HALL_WIDTH = CONST.HALL_WIDTH / 2;
  const HALF_SPACING = CONST.SPACING / 2;
  const HALF_PI = Math.PI / 2;
  const WALL_INSET = 0.05;
  const BOUND_MARGIN = 0.7;
  const ENTRANCE_MAX_Z = 2;
  const START_Z = 1.5;
  const START_YAW = 0;
  const DEFAULT_ASPECT = 1;
  const DEFAULT_VIEW_DISTANCE = 2.6;
  const UNLOAD_HYSTERESIS = 4;
  const MIN_PER_ROOM = 2;
  const PAIR_SIZE = 2;
  const MONTHS_IN_YEAR = 12;
  const MIN_MONTH = 1;
  const MAX_MONTH = 12;
  const MIN_DAY = 1;
  const MAX_DAY = 31;
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

  /**
   * 유한한 숫자인지 검사한다.
   * @param {*} value
   * @returns {boolean}
   */
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  /**
   * 전시실당 작품 수를 짝수(최소 2)로 정규화한다.
   * @param {object|undefined} opts
   * @returns {number}
   */
  function normalizePerRoom(opts) {
    const raw = opts && opts.perRoom;
    if (!isFiniteNumber(raw)) {
      return CONST.PER_ROOM;
    }
    const floored = Math.floor(raw);
    if (floored < MIN_PER_ROOM) {
      return CONST.PER_ROOM;
    }
    return floored % PAIR_SIZE === 0 ? floored : floored + 1;
  }

  /**
   * null 또는 undefined 문자열을 빈 문자열로 바꾼다.
   * @param {*} value
   * @returns {*}
   */
  function normalizeText(value) {
    return value === undefined || value === null ? "" : value;
  }

  /**
   * 사진 가로/세로 비율을 최대 액자 크기 안에 맞춘다.
   * @param {number} aspect
   * @param {number} [maxW]
   * @param {number} [maxH]
   * @returns {{ width: number, height: number }}
   */
  function fitFrame(aspect, maxW, maxH) {
    const limitW = isFiniteNumber(maxW) && maxW > 0 ? maxW : CONST.FRAME_MAX_W;
    const limitH = isFiniteNumber(maxH) && maxH > 0 ? maxH : CONST.FRAME_MAX_H;

    if (!isFiniteNumber(aspect) || aspect <= 0) {
      const square = Math.min(limitW, limitH);
      return { width: square, height: square };
    }

    if (limitW / limitH > aspect) {
      return { width: limitH * aspect, height: limitH };
    }
    return { width: limitW, height: limitW / aspect };
  }

  /**
   * 'YYYY-MM-DD' 문자열을 연·월 객체로 파싱한다. 유효하지 않으면 null.
   * @param {*} raw
   * @returns {{ year: number, month: number, ym: number } | null}
   */
  function parseYearMonth(raw) {
    if (typeof raw !== "string") {
      return null;
    }
    const match = DATE_PATTERN.exec(raw);
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
      month < MIN_MONTH ||
      month > MAX_MONTH ||
      day < MIN_DAY ||
      day > MAX_DAY
    ) {
      return null;
    }
    return { year: year, month: month, ym: year * MONTHS_IN_YEAR + month };
  }

  /**
   * 날짜 배열로부터 전시실 기간 라벨을 만든다.
   * @param {Array<string>} dates
   * @returns {string}
   */
  function roomLabel(dates) {
    if (!Array.isArray(dates) || dates.length === 0) {
      return "";
    }

    let minEntry = null;
    let maxEntry = null;
    for (let i = 0; i < dates.length; i += 1) {
      const parsed = parseYearMonth(dates[i]);
      if (!parsed) {
        continue;
      }
      if (!minEntry || parsed.ym < minEntry.ym) {
        minEntry = parsed;
      }
      if (!maxEntry || parsed.ym > maxEntry.ym) {
        maxEntry = parsed;
      }
    }

    if (!minEntry || !maxEntry) {
      return "";
    }
    if (minEntry.ym === maxEntry.ym) {
      return minEntry.year + "년 " + minEntry.month + "월";
    }
    if (minEntry.year === maxEntry.year) {
      return (
        minEntry.year +
        "년 " +
        minEntry.month +
        "월 ~ " +
        maxEntry.month +
        "월"
      );
    }
    return (
      minEntry.year +
      "년 " +
      minEntry.month +
      "월 ~ " +
      maxEntry.year +
      "년 " +
      maxEntry.month +
      "월"
    );
  }

  /**
   * 전시 항목 목록으로 액자, 전시실, 이동 경계, 시작 위치를 계산한다.
   * @param {Array<object>} items
   * @param {object} [opts]
   * @returns {{ frames: Array<object>, rooms: Array<object>, bounds: object, start: object }}
   */
  function buildLayout(items, opts) {
    const list = Array.isArray(items) ? items : [];
    const perRoom = normalizePerRoom(opts);
    const defaultSize = fitFrame(DEFAULT_ASPECT);
    const frames = [];

    for (let i = 0; i < list.length; i += 1) {
      const item = list[i] || {};
      const isLeft = i % PAIR_SIZE === 0;
      const pairIndex = Math.floor(i / PAIR_SIZE);
      const roomIndex = Math.floor(i / perRoom);

      frames.push({
        id: item.id,
        index: i,
        roomIndex: roomIndex,
        side: isLeft ? "left" : "right",
        x: isLeft ? -HALF_HALL_WIDTH + WALL_INSET : HALF_HALL_WIDTH - WALL_INSET,
        y: CONST.FRAME_CENTER_Y,
        z: -(CONST.START_GAP + pairIndex * CONST.SPACING),
        rotY: isLeft ? HALF_PI : -HALF_PI,
        width: defaultSize.width,
        height: defaultSize.height,
        title: normalizeText(item.title),
        caption: normalizeText(item.caption),
        imageUrl: item.imageUrl,
        hasCutout: Boolean(item.hasCutout),
        characterUrl: item.characterUrl
      });
    }

    const endWallZ =
      frames.length === 0
        ? -(CONST.START_GAP + CONST.END_GAP)
        : frames[frames.length - 1].z - CONST.END_GAP;

    const rooms = [];
    if (frames.length > 0) {
      const roomCount = Math.ceil(frames.length / perRoom);
      for (let k = 0; k < roomCount; k += 1) {
        const firstIndex = k * perRoom;
        const lastIndex = Math.min((k + 1) * perRoom - 1, frames.length - 1);
        const dates = [];
        for (let j = firstIndex; j <= lastIndex; j += 1) {
          const entry = list[j];
          dates.push(entry ? entry.date : undefined);
        }

        rooms.push({
          index: k,
          label: roomLabel(dates),
          zStart: k === 0 ? 0 : frames[firstIndex].z + HALF_SPACING,
          zEnd: k === roomCount - 1 ? endWallZ : frames[lastIndex].z - HALF_SPACING,
          firstIndex: firstIndex,
          lastIndex: lastIndex
        });
      }
    }

    const bounds = {
      minX: -HALF_HALL_WIDTH + BOUND_MARGIN,
      maxX: HALF_HALL_WIDTH - BOUND_MARGIN,
      minZ: endWallZ + BOUND_MARGIN,
      maxZ: ENTRANCE_MAX_Z
    };

    const start = { x: 0, z: START_Z, yaw: START_YAW };

    return {
      frames: frames,
      rooms: rooms,
      bounds: bounds,
      start: start
    };
  }

  /**
   * 액자 정면 distance 미터 앞, 눈높이에서 바라보는 시점을 반환한다.
   * @param {object} frame
   * @param {number} [distance]
   * @returns {{ x: number, z: number, yaw: number }}
   */
  function viewpointFor(frame, distance) {
    const dist = isFiniteNumber(distance) ? distance : DEFAULT_VIEW_DISTANCE;
    const isLeft = frame && frame.side === "left";
    return {
      x: frame.x + (isLeft ? dist : -dist),
      z: frame.z,
      yaw: isLeft ? HALF_PI : -HALF_PI
    };
  }

  /**
   * 좌표를 걸을 수 있는 영역 안으로 제한한다.
   * @param {number} x
   * @param {number} z
   * @param {object} bounds
   * @returns {{ x: number, z: number }}
   */
  function clampPosition(x, z, bounds) {
    if (!bounds) {
      return { x: x, z: z };
    }
    return {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
      z: Math.min(bounds.maxZ, Math.max(bounds.minZ, z))
    };
  }

  /**
   * 현재 위치 기준으로 불러올 텍스처와 해제할 텍스처를 계산한다.
   * @param {Array<object>} frames
   * @param {{ x: number, z: number }} pos
   * @param {Array|Set} loadedIds
   * @param {number} budget
   * @returns {{ load: Array, unload: Array }}
   */
  function planTextures(frames, pos, loadedIds, budget) {
    const list = Array.isArray(frames) ? frames : [];
    const loaded =
      loadedIds && typeof loadedIds.has === 'function' && typeof loadedIds.forEach === 'function'
        ? loadedIds // Set(다른 realm의 Set도 받도록 instanceof 대신 모양으로 판단)
        : new Set(Array.isArray(loadedIds) ? loadedIds : []);
    const limit =
      isFiniteNumber(budget) && budget > 0 ? Math.floor(budget) : 0;
    const posX = pos && isFiniteNumber(pos.x) ? pos.x : 0;
    const posZ = pos && isFiniteNumber(pos.z) ? pos.z : 0;

    // 입력 배열을 변경하지 않도록 거리 정보만 복사해 정렬한다.
    const ranked = [];
    for (let i = 0; i < list.length; i += 1) {
      const frame = list[i];
      const dx = frame.x - posX;
      const dz = frame.z - posZ;
      ranked.push({
        id: frame.id,
        index: isFiniteNumber(frame.index) ? frame.index : i,
        distSq: dx * dx + dz * dz
      });
    }

    ranked.sort(function (a, b) {
      if (a.distSq !== b.distSq) {
        return a.distSq - b.distSq;
      }
      return a.index - b.index;
    });

    const load = [];
    const loadCount = Math.min(limit, ranked.length);
    for (let i = 0; i < loadCount; i += 1) {
      if (!loaded.has(ranked[i].id)) {
        load.push(ranked[i].id);
      }
    }

    const keepCount = Math.min(limit + UNLOAD_HYSTERESIS, ranked.length);
    const keepSet = new Set();
    for (let i = 0; i < keepCount; i += 1) {
      keepSet.add(ranked[i].id);
    }

    const unload = [];
    loaded.forEach(function (id) {
      if (!keepSet.has(id)) {
        unload.push(id);
      }
    });

    return { load: load, unload: unload };
  }

  /**
   * 길잡이 버튼 이동 후의 작품 인덱스를 계산한다.
   * @param {number} current
   * @param {number} dir
   * @param {number} count
   * @returns {number}
   */
  function stepIndex(current, dir, count) {
    if (!isFiniteNumber(count) || count <= 0) {
      return -1;
    }
    const total = Math.floor(count);
    const delta = isFiniteNumber(dir) ? dir : 0;
    if (current === -1) {
      return delta > 0 ? 0 : -1;
    }
    const base = isFiniteNumber(current) ? current : 0;
    const next = base + delta;
    if (next < 0) {
      return 0;
    }
    if (next >= total) {
      return total - 1;
    }
    return next;
  }

  window.Gallery3DLayout = Object.freeze({
    CONST: CONST,
    buildLayout: buildLayout,
    fitFrame: fitFrame,
    viewpointFor: viewpointFor,
    clampPosition: clampPosition,
    planTextures: planTextures,
    stepIndex: stepIndex,
    roomLabel: roomLabel
  });
})();
