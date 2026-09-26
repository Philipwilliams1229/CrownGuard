// ============ CUTTING A HALL INTO PIECES ============
// For the build (buildanim.js): a hall is painted once off-screen with its
// folk hidden (`noFolk`, which every hall honours), and once as it is, and
// the picture is cut into the pieces a crew would set in place one by one.
//
// The cut follows the art itself. Every part of a hall was drawn as its own
// inked piece (paint.js part(): a 1-art-pixel ink line wherever parts meet),
// so the colour regions between ink lines ARE the parts — a plinth, a shaft,
// a parapet, a roof, a door, a flag. Each region takes the ink round it
// (the nearest region claims each ink pixel), so a piece brings its outline
// with it. Then:
//   - big parts ("wall") are split into courses about 6 world units tall,
//     and a wide course into a left and a right half, laid bottom-up;
//   - small parts ("fit") set into a wall — windows, doors, banners, lamps —
//     are covered by the wall until they are fitted (the course round them
//     is grown in over their place from its own edge pixels);
//     small parts standing free ("trim": flags, props, finials) come last;
//   - tiny orphan specks (sparkles, motes) are left out: they come back
//     with the live hall at the end.
// The folk (the crew, the mage, the priest…) are what differs between the
// two paintings, kept apart as the `crew` layer so they can be put in last.
//
// Everything is in art pixels on a grid locked to the world's (the scratch
// canvas starts on a whole world unit), so a piece drawn back at its offset
// lands on exactly the pixels the live hall paints.

import { PX } from "./paint.js";
import { drawTowerPortrait } from "./towers.js";

const MW = 150, MH = 160, MX = 75, MY = 124;         // scratch canvas, world units; (x, y) sits at (MX, MY)
const COURSE = 12;                                     // a course's height, art px
const WIDE = 40;                                       // wider courses than this split in two, art px
const SPECK = 10;                                      // orphan islands smaller than this are dropped, art px

let cvA = null, cvB = null;
const scratch = (cv) => {
  if (!cv) cv = document.createElement("canvas");
  if (cv.width !== MW * PX || cv.height !== MH * PX) { cv.width = MW * PX; cv.height = MH * PX; }
  return cv;
};
const paintOff = (cv, f, time, x0, y0) => {
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  c.imageSmoothingEnabled = false;
  c.setTransform(PX, 0, 0, PX, -x0 * PX, -y0 * PX);
  c.save();
  try { drawTowerPortrait(c, f, time); }
  finally { c.restore(); }
  return c.getImageData(0, 0, cv.width, cv.height).data;
};

const isInk = (d, i) => d[i + 3] >= 110 && d[i] < 62 && d[i + 1] < 52 && d[i + 2] < 64;

// A canvas holding just the listed pixels of `src` (and `fills`: [i, rgba]).
const sprite = (src, W, idx, bx, by, bw, bh, fills = null) => {
  const cv = document.createElement("canvas");
  cv.width = bw; cv.height = bh;
  const c = cv.getContext("2d");
  const im = c.createImageData(bw, bh), o = im.data;
  for (const i of idx) {
    const x = i % W - bx, y = ((i / W) | 0) - by, j = (y * bw + x) * 4, s = i * 4;
    o[j] = src[s]; o[j + 1] = src[s + 1]; o[j + 2] = src[s + 2]; o[j + 3] = src[s + 3];
  }
  if (fills) for (const [i, col] of fills) {
    const x = i % W - bx, y = ((i / W) | 0) - by, j = (y * bw + x) * 4;
    o[j] = col[0]; o[j + 1] = col[1]; o[j + 2] = col[2]; o[j + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  return cv;
};
const boxOf = (idx, W) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const i of idx) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
};

// Cut tower t (as it will stand) as it looks at `time`, and take its folk
// as they look at `crewTime` — each the moment its snapshot hands over to
// the live hall, so the hand over is pixel for pixel. The result is
//   { x0, y0, top, hw, pieces: [{ cv, x, y, w, h, top, bottom, cx, kind }], crew }
// in world units (x, y: the sprite's top-left), or null if it can't be cut.
// The work (four paintings and the cutting, 5–40 ms) is a generator that
// yields between its stages, so the build can spread it over the frames
// while the crew is still running out (buildanim.js pumps it); cutHall runs
// it straight through.
export const cutHall = (t, time, crewTime = time) => {
  const job = cutSteps(t, time, crewTime);
  let r = job.next();
  while (!r.done) r = job.next();
  return r.value;
};
export function* cutSteps(t, time, crewTime = time) {
  if (typeof document === "undefined") return null;
  const x0 = Math.floor(t.x) - MX, y0 = Math.floor(t.y) - MY;
  // a copy: no raise, no rally flag or aura ring drawn far off the hall
  const f = { ...t, raised: null, units: t.units || [], rally: null, _auraLive: 0 };
  cvA = scratch(cvA); cvB = scratch(cvB);
  const W = MW * PX, H = MH * PX, N = W * H;
  const toWorld = (bx, by) => [x0 + bx / PX, y0 + by / PX];

  // ---- the crew: what the folk add to the picture ----
  const full = paintOff(cvA, f, crewTime, x0, y0);
  let body = paintOff(cvB, { ...f, noFolk: true }, crewTime, x0, y0);
  let crewIdx = [];
  for (let i = 0; i < N; i++) {
    const s = i * 4;
    if (full[s + 3] === 0 && body[s + 3] === 0) continue;
    if (Math.abs(full[s] - body[s]) > 2 || Math.abs(full[s + 1] - body[s + 1]) > 2 || Math.abs(full[s + 2] - body[s + 2]) > 2 || Math.abs(full[s + 3] - body[s + 3]) > 2) crewIdx.push(i);
  }
  let crew = null;
  if (crewIdx.length >= 24) {
    const b = boxOf(crewIdx, W);
    const [wx, wy] = toWorld(b.x0, b.y0);
    crew = {
      cv: sprite(full, W, crewIdx, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1),
      x: wx, y: wy, w: (b.x1 - b.x0 + 1) / PX, h: (b.y1 - b.y0 + 1) / PX,
      top: wy, bottom: y0 + (b.y1 + 1) / PX, cx: x0 + (b.x0 + b.x1 + 1) / 2 / PX,
    };
  }
  yield;
  // the hall itself, as it will look when the pieces hand over
  if (crewTime !== time) { body = paintOff(cvB, { ...f, noFolk: true }, time, x0, y0); yield; }

  // ---- classes: 0 empty, 1 faint (shadow, glow), 2 ink, 3 colour ----
  const cls = new Uint8Array(N);
  let colourN = 0;
  for (let i = 0; i < N; i++) {
    const s = i * 4, a = body[s + 3];
    if (a < 12) continue;
    cls[i] = a < 110 ? 1 : isInk(body, s) ? 2 : 3;
    if (cls[i] === 3) colourN++;
  }
  if (colourN < 30) return null;

  // ---- colour regions between the ink lines (4-connected) ----
  const lab = new Int32Array(N).fill(-1);
  const comps = [];
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (cls[i] !== 3 || lab[i] >= 0) continue;
    const id = comps.length, px = [];
    lab[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop(); px.push(j);
      const x = j % W;
      if (x > 0 && cls[j - 1] === 3 && lab[j - 1] < 0) { lab[j - 1] = id; stack.push(j - 1); }
      if (x < W - 1 && cls[j + 1] === 3 && lab[j + 1] < 0) { lab[j + 1] = id; stack.push(j + 1); }
      if (j >= W && cls[j - W] === 3 && lab[j - W] < 0) { lab[j - W] = id; stack.push(j - W); }
      if (j < N - W && cls[j + W] === 3 && lab[j + W] < 0) { lab[j + W] = id; stack.push(j + W); }
    }
    comps.push({ id, colour: px.length });
  }
  yield;
  // regions too small to be a part join their neighbours: unlabel them
  const MINPART = 8;
  for (let i = 0; i < N; i++) if (lab[i] >= 0 && comps[lab[i]].colour < MINPART) lab[i] = -1;
  // every other painted pixel goes to the nearest region (8-connected, breadth first)
  let front = [];
  for (let i = 0; i < N; i++) if (lab[i] >= 0) front.push(i);
  while (front.length) {
    const next = [];
    for (const j of front) {
      const x = j % W, id = lab[j];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx;
        if (xx < 0 || xx >= W) continue;
        const k = j + dy * W + dx;
        if (k < 0 || k >= N || !cls[k] || lab[k] >= 0) continue;
        lab[k] = id; next.push(k);
      }
    }
    front = next;
  }
  yield;
  // islands nothing reached: a part of their own if big enough, else dropped
  for (let i = 0; i < N; i++) {
    if (!cls[i] || lab[i] >= 0) continue;
    const id = comps.length, px = [];
    lab[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop(); px.push(j);
      const x = j % W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, k = j + dy * W + dx;
        if (xx < 0 || xx >= W || k < 0 || k >= N || !cls[k] || lab[k] >= 0) continue;
        lab[k] = id; stack.push(k);
      }
    }
    comps.push({ id, colour: px.length, island: px.length < SPECK });
  }

  yield;
  // ---- gather each region's pixels and measure it ----
  const px = comps.map(() => []);
  for (let i = 0; i < N; i++) if (lab[i] >= 0 && !comps[lab[i]].island) px[lab[i]].push(i);
  const parts = [];
  for (const c of comps) {
    const idx = px[c.id];
    if (!idx.length) continue;
    let colour = 0;
    for (const i of idx) if (cls[i] === 3) colour++;
    parts.push({ id: c.id, idx, colour, ...boxOf(idx, W) });
  }
  if (!parts.length) return null;
  const byId = new Map(parts.map((p) => [p.id, p]));
  const total = parts.reduce((s, p) => s + p.colour, 0);
  const DETAIL = Math.max(36, total * 0.03);
  for (const p of parts) p.detail = p.colour < DETAIL;

  // is a small part set into something (a window in a wall)? Look at what
  // borders it: mostly painted = set in, and the region it borders most is
  // its host. A host that is itself a detail passes it on up.
  for (const p of parts) {
    if (!p.detail) continue;
    let out = 0, painted = 0;
    const count = new Map();
    for (const i of p.idx) {
      const x = i % W;
      for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (k < 0 || k >= N || lab[k] === p.id) continue;
        out++;
        if (!cls[k] || lab[k] < 0) continue;
        painted++;
        count.set(lab[k], (count.get(lab[k]) || 0) + 1);
      }
    }
    let host = -1, best = 0;
    for (const [id, n] of count) if (n > best && byId.has(id)) { best = n; host = id; }
    p.host = out && painted / out >= 0.8 ? host : -1;
  }
  const hostOf = (p) => {
    let h = p, n = 0;
    while (h && h.detail && h.host >= 0 && n++ < 6) h = byId.get(h.host);
    return h && !h.detail ? h : null;
  };

  yield;
  // ---- the pieces ----
  const pieces = [];
  const opening = new Map();                            // wall part id -> [[i, rgb]] filled over the fittings it holds
  for (const p of parts) {
    if (!p.detail) continue;
    const h = hostOf(p);
    if (!h) { p.kind = "trim"; continue; }
    p.kind = "fit";
    // until it is fitted, the wall runs on over its place: each pixel takes
    // the colour of the nearest pixel of the host (grown in from its edge),
    // so the course reads whole and the fitting is set into it later
    // (only where the fitting is solid: a see-through edge of it must lie
    // over nothing, or it would darken twice once it is set)
    const mine = new Set();
    for (const i of p.idx) if (body[i * 4 + 3] === 255) mine.add(i);
    const col = new Map();
    let front = [];
    for (const i of mine) {
      const x = i % W;
      for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (k < 0 || k >= N || lab[k] === p.id || cls[k] !== 3) continue;
        col.set(i, [body[k * 4], body[k * 4 + 1], body[k * 4 + 2]]);
        front.push(i);
        break;
      }
    }
    while (front.length) {
      const next = [];
      for (const i of front) {
        const x = i % W, c = col.get(i);
        for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
          if (k < 0 || !mine.has(k) || col.has(k)) continue;
          col.set(k, c); next.push(k);
        }
      }
      front = next;
    }
    if (!opening.has(h.id)) opening.set(h.id, []);
    const list = opening.get(h.id);
    for (const i of mine) list.push([i, col.get(i) || [96, 88, 84]]);
  }
  const addPiece = (idx, fills, kind) => {
    if (!idx.length && !(fills && fills.length)) return;
    const all = fills ? idx.concat(fills.map((f) => f[0])) : idx;
    const b = boxOf(all, W);
    const [wx, wy] = toWorld(b.x0, b.y0);
    pieces.push({
      cv: sprite(body, W, idx, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, fills),
      x: wx, y: wy, w: (b.x1 - b.x0 + 1) / PX, h: (b.y1 - b.y0 + 1) / PX,
      top: wy, bottom: y0 + (b.y1 + 1) / PX, cx: x0 + (b.x0 + b.x1 + 1) / 2 / PX, kind,
    });
  };
  yield;
  let made = 0;
  for (const p of parts) {
    if (++made % 10 === 0) yield;
    if (p.detail) { addPiece(p.idx, null, p.kind); continue; }
    // a wall part: courses bottom-up, a wide course in two halves
    const fills = opening.get(p.id) || [];
    const hgt = p.y1 - p.y0 + 1;
    const k = hgt <= COURSE * 1.5 ? 1 : Math.round(hgt / COURSE);
    const slabOf = (i) => Math.min(k - 1, Math.floor((((i / W) | 0) - p.y0) * k / hgt));
    const groups = new Map();
    const put = (i, fill) => {
      const s = slabOf(i);
      let g = groups.get(s);
      if (!g) { g = { idx: [], fills: [] }; groups.set(s, g); }
      if (fill) g.fills.push(fill); else g.idx.push(i);
    };
    for (const i of p.idx) put(i, null);
    for (const fl of fills) put(fl[0], fl);
    for (const [, g] of groups) {
      const b = boxOf(g.idx.concat(g.fills.map((f) => f[0])), W);
      if (b.x1 - b.x0 + 1 > WIDE) {
        const mid = (b.x0 + b.x1 + 1) / 2;
        const L = g.idx.filter((i) => i % W < mid), R = g.idx.filter((i) => i % W >= mid);
        const FL = g.fills.filter((f) => f[0] % W < mid), FR = g.fills.filter((f) => f[0] % W >= mid);
        addPiece(L, FL, "wall"); addPiece(R, FR, "wall");
      } else addPiece(g.idx, g.fills, "wall");
    }
  }

  // ---- the order they go in: the walls bottom-up (left before right on a
  // course), then the fittings and trim bottom-up ----
  const rank = { wall: 0, fit: 1, trim: 1 };
  pieces.sort((a, b) => rank[a.kind] - rank[b.kind] || (Math.round(b.bottom) - Math.round(a.bottom)) || a.cx - b.cx);

  // the standing hall's top and body half-width (as buildanim's measure())
  let top = 0, hw = 0;
  for (const p of pieces) if (p.top < top || !top) top = p.top;
  const bodyRow = t.y - 4;
  for (const p of pieces) if (p.kind === "wall" && p.top < bodyRow) hw = Math.max(hw, Math.abs(p.x - t.x), Math.abs(p.x + p.w - t.x));
  return {
    x0, y0, pieces, crew,
    top: Math.max(-84, Math.min(-18, top - t.y)),
    hw: Math.max(9, Math.min(22, hw || 15)),
  };
}
