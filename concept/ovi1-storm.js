// Iron overhaul, concept round 1, panel 5: THE STORM (Ironford under a full storm).
// Draws the LOOK only: darker wet stone, glossier paving, streams in spate, YELLOW lightning, YELLOW paralyze
// (foes, soldiers, struck halls) and a stroke landing in a puddle. Nothing under src/ is touched.
//
// How it works: the REAL engine and draw() run Ironford (storm, wet pinned at 1). The board is drawn three ways at
// the same instant (everything / no foes and soldiers / no foes, soldiers or halls) so the ground, the actors
// and each hall are separate pixels; the concept paints between them: wet grade and gloss on the ground,
// puddles under the actors, then the actors (jolted / tinted / outlined), then yellow light and bolts on top.
import { W, H, RES, WALL_W } from "/src/data/constants.js";
import { selectRealm } from "/src/data/maps.js";
import { selectFaction } from "/src/data/factions.js";
import { setWaveWindow } from "/src/data/waves.js";
import { TOTAL_LEN, posAt, angleAt, lanePos } from "/src/engine/path.js";
import { updateGame } from "/src/engine/update.js";
import { placeTower, upgradeTower, branchTower, buildableAt, startWave } from "/src/engine/actions.js";
import { draw } from "/src/render/draw.js";
import { setLevelWeather, weatherDef, segAt } from "/src/engine/weather.js";
import { setDay } from "/src/data/sun.js";
import { inRiver, underBridge, RIVERS } from "/src/data/terrain.js";

export const PW = W * RES, PH = H * RES;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const h2 = (a, b, s = 0) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// the YELLOW (lemon, never fire's orange, never today's white-blue): white-hot, pale, lemon, deep, ink
export const Y = ["#fffdf0", "#fff58a", "#f6e03a", "#c9b01c", "#6e640e"];
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

// ---- three ideas, three dials ------------------------------------------------------------------------------
export const LOOK = {
  A: { name: "Mirror", tone: "#aab6c8", dark: 0.74, sheen: [176, 202, 232], gloss: "slab", amt: 0.5, silt: [104, 92, 62], siltA: 0.34, bolt: "glass", stun: "rim", foam: "chevron", puddle: "glass", hall: "rim" },
  B: { name: "Arcs", tone: "#8c9bbb", dark: 0.66, sheen: [150, 172, 214], gloss: "bead", amt: 0.34, silt: [78, 76, 72], siltA: 0.28, bolt: "fork", stun: "cage", foam: "streak", puddle: "arcs", hall: "arcs" },
  C: { name: "Static", tone: "#b8b6a4", dark: 0.72, sheen: [206, 200, 160], gloss: "diag", amt: 0.24, silt: [132, 100, 52], siltA: 0.4, bolt: "step", stun: "scan", foam: "collar", puddle: "joints", hall: "scan" },
};

// ---- the scene: the real engine -----------------------------------------------------------------------------------
const TOWERS = "archer@0.2:3,knight@0.32:3,wizard@0.45:3,b,gunpowder@0.58:3,archer@0.7:3,wizard@0.82:2";
export const makeScene = ({ sun = "noon", secs = 11, towers = TOWERS, seed = 1 } = {}) => {
  setDay(sun);
  selectRealm("ironford"); selectFaction("iron"); setWaveWindow(null);
  setLevelWeather({ kind: "storm", strength: 1 });
  const DT = 1 / 60;
  const g = {
    run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: 1e7, lives: 9999, wave: 6, phase: "build",
    towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
    selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
    cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0, freeplay: true,
  };
  for (const spec of towers.split(",").reduce((acc, p) => (p.includes("@") ? acc.push([p]) : acc[acc.length - 1].push(p), acc), [])) {
    const [head, br] = spec, [kd, rest] = head.split("@"), [at, lv] = rest.split(":").map(Number);
    const d0 = at * TOTAL_LEN, [rx, ry] = posAt(d0), a = angleAt(d0);
    let spot = null;
    for (let r = 50; r < 130 && !spot; r += 3) for (const s of [1, -1]) {
      const x = rx + Math.cos(a + Math.PI / 2) * r * s, y = ry + Math.sin(a + Math.PI / 2) * r * s;
      if (buildableAt(g, x, y, kd)) { spot = [x, y]; break; }
    }
    if (!spot) continue;
    placeTower(g, kd, spot[0], spot[1]);
    const t = g.towers[g.towers.length - 1];
    for (let l = 1; l < (lv || 1); l++) upgradeTower(g, t);
    if (br) branchTower(g, t, br);
    t.readyAt = 0; t.raised = null;
  }
  for (let i = 0; i < 30; i++) updateGame(g, DT);
  const def = weatherDef(), w = g.weather;
  let s, t = 0;
  do { s = segAt(w, def, t); t = s.t1; } while (s.ph !== "squall" && t < 5000);
  w.clock = Math.max(0, s.t0 + 2);
  updateGame(g, DT);
  const pin = () => { if (g.weather) { g.weather.k = 1; g.weather.wet = 1; } };
  startWave(g);
  for (let el = 0; el < secs; el += DT) { pin(); updateGame(g, DT); g.lives = 9999; if (g.phase !== "combat") startWave(g); }
  pin(); g.shake = 0;
  return { g, pin, sun };
};

// draw the board; `hide` = what to leave out ("foes" = foes and soldiers, "halls" = every hall, or a hall object)
const cvDraw = mk(PW, PH);
export const shoot = (g, hide = []) => {
  const sv = { e: g.enemies, b: g.bands, t: g.towers };
  if (hide.includes("foes")) { g.enemies = []; g.bands = []; }
  if (hide.includes("halls")) g.towers = [];
  const one = hide.find((h) => typeof h === "object");
  if (one) g.towers = g.towers.filter((t) => t !== one);
  g.shake = 0;
  draw(g, cvDraw, { current: null });
  g.enemies = sv.e; g.bands = sv.b; g.towers = sv.t;
  const o = mk(PW, PH); o.getContext("2d").drawImage(cvDraw, 0, 0);
  return o;
};
const px = (c) => c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
// pixels that differ between two renders (>thr summed channels) -> a layer of b's pixels where it differs
const diffLayer = (full, base, thr = 36) => {
  const a = px(full), b = px(base), out = new ImageData(PW, PH), mask = new Uint8Array(PW * PH);
  for (let i = 0, n = PW * PH; i < n; i++) {
    const j = i * 4, d = Math.abs(a.data[j] - b.data[j]) + Math.abs(a.data[j + 1] - b.data[j + 1]) + Math.abs(a.data[j + 2] - b.data[j + 2]);
    if (d > thr) { mask[i] = 1; out.data[j] = a.data[j]; out.data[j + 1] = a.data[j + 1]; out.data[j + 2] = a.data[j + 2]; out.data[j + 3] = 255; }
  }
  const cv = mk(PW, PH); cv.getContext("2d").putImageData(out, 0, 0);
  return { cv, mask };
};
const bboxOf = (mask, x0, y0, x1, y1) => {
  x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(PW - 1, x1 | 0); y1 = Math.min(PH - 1, y1 | 0);
  let a = 1e9, b = 1e9, c = -1, d = -1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y * PW + x]) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
  return c < 0 ? null : { x: a, y: b, w: c - a + 1, h: d - b + 1 };
};

// ---- masks (once per scene) ------------------------------------------------------------------------------------------------
const roadMask = () => {
  const c = mk(PW, PH), o = c.getContext("2d");
  o.fillStyle = "#000"; o.fillRect(0, 0, PW, PH);
  o.strokeStyle = "#fff"; o.lineWidth = 40 * RES; o.lineJoin = "round"; o.lineCap = "butt";
  o.beginPath();
  for (let d = 0; d <= TOTAL_LEN; d += 4) { const [x, y] = posAt(d); d ? o.lineTo(x * RES, y * RES) : o.moveTo(x * RES, y * RES); }
  o.stroke();
  const D = px(c).data, m = new Uint8Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) m[i] = D[i * 4] > 128 ? 1 : 0;
  return m;
};
const riverMask = () => {
  const m = new Uint8Array(PW * PH);
  for (let y = 0; y < PH; y += 2) for (let x = 0; x < PW - 2; x += 2) {
    const ux = x / RES, uy = y / RES;
    if (inRiver(ux, uy, -2) && !underBridge(ux, uy, 8)) { m[y * PW + x] = m[y * PW + x + 1] = 1; if (y + 1 < PH) m[(y + 1) * PW + x] = m[(y + 1) * PW + x + 1] = 1; }
  }
  const bank = new Uint8Array(PW * PH);
  for (let y = 8; y < PH - 8; y++) for (let x = 8; x < PW - 8; x++) {
    const i = y * PW + x; if (m[i]) continue;
    if (m[i - 4] || m[i + 4] || m[i - 4 * PW] || m[i + 4 * PW]) bank[i] = 1;
    else if (m[i - 8] || m[i + 8] || m[i - 8 * PW] || m[i + 8 * PW]) bank[i] = 2;
  }
  const edge = [];
  for (let y = 3; y < PH - 3; y++) for (let x = 3; x < PW - 3; x++) {
    const i = y * PW + x;
    if (m[i] && (!m[i - 3] || !m[i + 3] || !m[i - 3 * PW] || !m[i + 3 * PW])) edge.push(x, y);
  }
  // each river's centre line (for foam dashes), flow top to bottom as the board runs
  const lines = RIVERS.map((rv) => {
    const P = [];
    for (const s of rv.segs) { const n = Math.max(1, Math.round(s.len / 3)), tx = (s.x2 - s.x1) / s.len, ty = (s.y2 - s.y1) / s.len; for (let q = 0; q < n; q++) P.push([(s.x1 + (s.x2 - s.x1) * q / n) * RES, (s.y1 + (s.y2 - s.y1) * q / n) * RES, tx, ty]); }
    return { P, hw: ((rv.w || 30) / 2) * RES };
  });
  return { m, bank, edge, lines };
};

// ---- the wet grade of the ground ------------------------------------------------------------------------------------------
// gloss(ground, masks, opt): darker stone, a mirror sheen on the paving (a different idea per option), the river in spate
const mixW = (hex, w) => rgb(hex).map((v) => v + (255 - v) * w);
const gloss = (ground, K, o, warm = 0) => {
  const im = px(ground), D = im.data, tn = mixW(o.tone, warm), sh = o.sheen, sl = rgb("#6a6a5a");
  const wallX = Math.ceil((W - WALL_W) * RES);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x, j = i * 4;
    let r = D[j], g = D[j + 1], b = D[j + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    // the whole board takes the storm's tone
    if (!K.river.m[i]) { r = r * tn[0] / 255; g = g * tn[1] / 255; b = b * tn[2] / 255; } else { r *= 0.9; g *= 0.94; b *= 1; }
    if (K.river.m[i]) {
      const a = o.siltA * (0.8 + 0.4 * h2(x >> 3, y >> 3, 5));
      r += (o.silt[0] - r) * a; g += (o.silt[1] - g) * a; b += (o.silt[2] - b) * a;
    } else if (K.river.bank[i] && !K.road[i]) {   // the flood has crept over the bank: wet mud, ragged
      const bb = K.river.bank[i], th = bb === 1 ? 0.8 : 0.4;
      if (bay(x, y) < th) { const a = o.siltA * 1.5; r += (o.silt[0] * 0.8 - r) * a; g += (o.silt[1] * 0.8 - g) * a; b += (o.silt[2] * 0.8 - b) * a; r *= 0.85; g *= 0.85; b *= 0.85; }
    } else if (K.road[i] && sat < 46) {
      r *= o.dark; g *= o.dark; b *= o.dark;
      let s = 0;
      if (o.gloss === "slab") {          // each flag a mirror: a bright stripe on its upper edge, flags differ
        const row = Math.floor(y / 12), xs = x + (row & 1) * 11, cx = Math.floor(xs / 22), yy = (y % 12) - Math.floor(h2(cx, row, 10) * 5), xi = xs % 22;
        const gl = h2(cx, row, 9) < 0.55 ? 0 : 0.35 + 0.65 * h2(cx, row, 11), run = 10 + h2(cx, row, 12) * 10;
        s = gl * (xi < run ? (yy >= 0 && yy < 2 ? 1 : yy === 2 ? 0.5 : 0) : 0);
      } else if (o.gloss === "bead") {   // dark and rough with beaded glints, and a faint wide sheet
        const hv = h2(x, y, 3);
        s = (hv > 0.978 ? 1.2 : 0) + 0.18 * (0.5 + 0.5 * Math.sin((x * 0.045) + y * 0.11));
      } else {                           // long diagonal reflections of the cloud edge
        const q = ((x * 0.5 + y * 1.0) % 84 + 84) % 84;
        s = q < 12 ? 1 - Math.abs(q - 6) / 8 : q < 17 ? 0.25 : 0;
        s *= 0.5 + 0.5 * h2(x >> 4, y >> 4, 4);
      }
      s *= o.amt;
      r += (sh[0] - r) * s; g += (sh[1] - g) * s; b += (sh[2] - b) * s;
    } else if (x >= wallX) {             // the castle wall: dark, with runoff streaks
      r *= 0.82; g *= 0.82; b *= 0.84;
      const col = x >> 1, st = h2(col, 1, 31);
      if (st < 0.16 && ((y + st * 400) % 200) < 70 + st * 300) { r *= 0.86; g *= 0.88; b *= 0.92; if ((y & 7) === 0) { r += 24; g += 30; b += 40; } }
    }
    D[j] = clamp(r, 0, 255); D[j + 1] = clamp(g, 0, 255); D[j + 2] = clamp(b, 0, 255);
  }
  const out = mk(PW, PH); out.getContext("2d").putImageData(im, 0, 0);
  return out;
};
// the actors take the same tone (and a touch of the wet), alpha kept
const tonedLayer = (layer, o, warm = 0) => {
  const t = mk(PW, PH), c = t.getContext("2d"), tn = mixW(o.tone, warm);
  c.drawImage(layer, 0, 0);
  c.globalCompositeOperation = "multiply";
  c.fillStyle = `rgb(${Math.min(255, tn[0] + 20)},${Math.min(255, tn[1] + 20)},${Math.min(255, tn[2] + 20)})`; c.fillRect(0, 0, PW, PH);
  c.globalCompositeOperation = "destination-in"; c.drawImage(layer, 0, 0);
  return t;
};

// ---- the prepared scene: layers, masks, targets -----------------------------------------------------------------------------
export const prepare = (S, ev = []) => {
  const { g } = S;
  const full = shoot(g), bare = shoot(g, ["foes"]), ground0 = shoot(g, ["foes", "halls"]);
  const act = diffLayer(full, bare), hall = diffLayer(bare, ground0);
  const K = { road: roadMask(), river: riverMask() };
  const P = { sun: S.sun, g, full, bare, ground0, act, hall, K, events: ev, o: {}, targets: [], halls: [] };
  // foe targets: bbox of each foe's pixels near its feet
  const tms = g.time * 1000;
  const tgt = (e) => {
    const fx = e.x * RES, fy = (e.y + e.size * 0.55) * RES, hw = Math.max(10, e.size * RES * 0.55);
    const b = bboxOf(act.mask, fx - hw, fy - e.size * RES * 2.0, fx + hw, fy + 4);
    return b && { e, fx, fy, b, hw };
  };
  P.tgt = tgt;
  P.tms = tms;
  return P;
};
export const grade = (P, key) => {
  if (P.o[key]) return P.o[key];
  const o = LOOK[key];
  const warm = P.sun === "noon" ? 0 : 0.5;
  const halls = gloss(P.bare, P.K, o, warm), hd = px(halls), ho = new ImageData(PW, PH), m = P.hall.mask;
  for (let i = 0; i < PW * PH; i++) if (m[i]) { const j = i * 4; ho.data[j] = hd.data[j]; ho.data[j + 1] = hd.data[j + 1]; ho.data[j + 2] = hd.data[j + 2]; ho.data[j + 3] = 255; }
  const hallsOnly = mk(PW, PH); hallsOnly.getContext("2d").putImageData(ho, 0, 0);
  P.o[key] = { ground: gloss(P.ground0, P.K, o, warm), halls, hallsOnly, actors: tonedLayer(P.act.cv, o, warm) };
  // `halls` = the ground + the standing halls, graded alike (halls are wet stone too)
  return P.o[key];
};

// ---- small painters ---------------------------------------------------------------------------------------------------------
const dot = (c, x, y, col, a = 1, w = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, w); c.globalAlpha = 1; };
const seg = (c, x0, y0, x1, y1, w, col, a = 1) => {
  c.globalAlpha = a; c.fillStyle = col;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) | 0, o = (w / 2) | 0;
  for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n) - o, Math.round(y0 + (y1 - y0) * i / n) - o, w, w);
  c.globalAlpha = 1;
};
const poly = (c, pts, layers) => { for (const [w, col, a] of layers) for (let i = 1; i < pts.length; i++) seg(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, col, a); };
const boltPts = (x0, y0, x1, y1, seed, jit, step, mode) => {
  const pts = [[x0, y0]], n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 1; i <= n; i++) {
    const t = i / n, last = i === n;
    let x = x0 + (x1 - x0) * t + (last ? 0 : (h2(i, seed, 1) - 0.5) * 2 * jit), y = y0 + (y1 - y0) * t + (last ? 0 : (h2(i, seed, 2) - 0.5) * jit * 0.5);
    if (mode === "step") { x = Math.round(x / 6) * 6; y = Math.round(y / 6) * 6; if (last) { x = x1; y = y1; } }
    pts.push([x, y]);
  }
  if (mode === "step") { const q = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = q[q.length - 1], b = pts[i]; if (a[0] !== b[0] && a[1] !== b[1]) q.push([b[0], a[1]]); q.push(b); } return q; }
  return pts;
};
// a bolt from above the board down to (bx, by); amt 0..1 thickness flicker
const BOLT_LAYERS = {
  glass: [[9, Y[2], 0.2], [5, Y[2], 0.62], [3, Y[1], 1], [1, Y[0], 1]],
  fork: [[5, Y[3], 0.3], [3, Y[2], 0.95], [1, Y[0], 1]],
  step: [[5, Y[4], 1], [3, Y[2], 1], [1, Y[0], 1]],
};
export const drawBolt = (c, o, bx, by, seed, amt = 1, from = null) => {
  const mode = o.bolt === "step" ? "step" : "free", L = BOLT_LAYERS[o.bolt].map(([w, col, a]) => [amt < 0.6 ? Math.max(1, w - 2) : w, col, a]);
  const sx = from ? from[0] : bx + 44 + h2(seed, 1) * 40, sy = from ? from[1] : -6;
  const jit = o.bolt === "fork" ? 22 : o.bolt === "step" ? 18 : 15;
  const pts = boltPts(sx, sy, bx, by, seed, jit, o.bolt === "step" ? 22 : 17, mode);
  poly(c, pts, L);
  const nb = o.bolt === "fork" ? 4 : o.bolt === "glass" ? 2 : 2;
  for (let k = 0; k < nb; k++) {
    const i = 2 + Math.floor(h2(k, seed, 3) * (pts.length - 4)), [x, y] = pts[i], dir = h2(k, seed, 4) < 0.5 ? -1 : 1;
    const len = (o.bolt === "fork" ? 60 : 44) * (0.7 + h2(k, seed, 5) * 0.6);
    const bp = boltPts(x, y, x + dir * len * 0.6, y + len * 0.8, seed + k * 7, 10, 12, mode);
    poly(c, bp, L.map(([w, col, a]) => [Math.max(1, w - 2), col, a]));
    if (o.bolt === "fork" && k < 2) { const j = Math.floor(bp.length / 2), bp2 = boltPts(bp[j][0], bp[j][1], bp[j][0] + dir * 24, bp[j][1] + 30, seed + k * 13, 6, 9, mode); poly(c, bp2, [[1, Y[1], 1]]); }
  }
  return pts;
};
// a flattened stepped ring on the ground
const ring = (c, x, y, rx, ry, col, a, step = 1, dash = 0) => {
  const n = Math.max(24, Math.round(rx * 3));
  c.globalAlpha = a; c.fillStyle = col;
  for (let i = 0; i < n; i++) { if (dash && (i % dash) > dash / 2) continue; const t = (i / n) * Math.PI * 2; c.fillRect(Math.round(x + Math.cos(t) * rx), Math.round(y + Math.sin(t) * ry), step, step); }
  c.globalAlpha = 1;
};
// Bayer-dithered lit ellipse (lit 0..1): white-hot middle to lemon rim
const litEllipse = (c, x, y, rx, ry, lit, hot = true, a = 1) => {
  c.globalAlpha = a;
  for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
    const d = (xx / rx) ** 2 + (yy / ry) ** 2; if (d > 1) continue;
    const t = lit * (1.15 - 0.55 * d);
    if (bay(xx + 100, yy + 100) >= t) continue;
    c.fillStyle = hot ? (d < 0.18 ? Y[0] : d < 0.5 ? Y[1] : Y[2]) : Y[2];
    c.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
  }
  c.globalAlpha = 1;
};
// rain rings in a puddle, periodic over F frames
const rainRings = (c, x, y, rx, ry, f, F, seed) => {
  for (let k = 0; k < 6; k++) {
    const per = F / 2, ph = (f / per + h2(k, seed, 1)) % 1, ox = (h2(k, seed, 2) - 0.5) * 1.5 * rx, oy = (h2(k, seed, 3) - 0.5) * 1.5 * ry;
    if ((ox / rx) ** 2 + (oy / ry) ** 2 > 0.7) continue;
    ring(c, x + ox, y + oy, 2 + ph * 7, 1 + ph * 3.5, "#c6d6ea", 0.55 * (1 - ph), 1);
  }
};

// ---- the rain I add (periodic: every drop repeats over the loop) --------------------------------------------------------------
const rain = (c, f, F, x0, y0, w, h, n = 700) => {
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  for (let i = 0; i < n; i++) {
    const cyc = [6, 8, 12, 24][i & 3], ox = h2(i, 1, 40) * PW, oy = h2(i, 2, 40) * PH - 60, u = ((f + h2(i, 3, 40) * cyc) % cyc) / cyc;
    const x = ox - 40 * u, y = oy + 128 * u;
    if (x < x0 - 8 || x > x0 + w + 8 || y < y0 - 8 || y > y0 + h + 8) continue;
    c.fillStyle = "#cfdcec"; c.globalAlpha = 0.22 + 0.3 * h2(i, 4, 40);
    c.fillRect(Math.round(x), Math.round(y), 1, 3); c.fillRect(Math.round(x) - 1, Math.round(y) + 3, 1, 3);
  }
  c.restore(); c.globalAlpha = 1;
};

// ---- the river in spate: foam, per option ------------------------------------------------------------------------------------------
const spate = (c, K, o, f, F) => {
  // foam collars where the water meets bank and pier: the dither crawls (periodic)
  const E = K.river.edge, ph = f / F;
  c.fillStyle = "#e8eef4";
  for (let i = 0; i < E.length; i += 2) {
    const x = E[i], y = E[i + 1], hv = h2(x >> 1, y >> 1, 6);
    const dens = o.foam === "collar" ? 0.4 : o.foam === "chevron" ? 0.22 : 0.16;
    if (((hv + ph * (1 + (x & 1))) % 1) < dens * 0.5) { c.globalAlpha = 0.5 + 0.4 * hv; c.fillRect(x, y, 1, 1); if (o.foam === "collar") c.fillRect(x + ((x >> 1) & 1 ? 1 : -1), y, 1, 1); }
  }
  c.globalAlpha = 1;
  const inR = (X, Y0) => X > 0 && Y0 > 0 && X < PW && Y0 < PH && K.river.m[(Y0 | 0) * PW + (X | 0)];
  for (let ri = 0; ri < K.river.lines.length; ri++) {
    const { P, hw } = K.river.lines[ri], n = P.length, u = f / F;
    const at = (idx, lat) => { const i0 = Math.floor(idx), fr = idx - i0, a = P[((i0 % n) + n) % n], b = P[(((i0 + 1) % n) + n) % n], x = a[0] + (b[0] - a[0]) * fr, y = a[1] + (b[1] - a[1]) * fr, tx = a[2], ty = a[3]; return [x - ty * lat, y + tx * lat, tx, ty]; };
    if (o.foam === "chevron") {          // A: rows of standing waves across the stream, a white crest over a brown trough
      const D = 5;
      for (let k = 0; k < n / D; k++) {
        if (h2(k, ri, 74) < 0.3) continue;
        const idx = k * D + u * D, w0 = 0.35 + 0.55 * h2(k, ri, 75), c0 = (h2(k, ri, 76) - 0.5) * 0.7;
        for (let l = -w0; l <= w0; l += 0.025) {
          const [X, Y0] = at(idx + Math.abs(l) * 3.2, (l + c0) * hw), a = 0.95 - Math.abs(l) * 0.4;
          if (!inR(X, Y0)) continue;
          dot(c, X, Y0, "#f8fbfd", a, 2); dot(c, X, Y0 + 2, "#46391f", a * 0.7, 2);
        }
      }
    } else if (o.foam === "streak") {    // B: long bright streaks racing down the current, two speeds
      const lanes = 5;
      for (let L = 0; L < lanes; L++) {
        const lat = ((L + 0.5) / lanes - 0.5) * 1.8 * hw, D = 5 + (L % 3), sp = 1 + (L & 1);
        for (let k = 0; k < n / D; k++) {
          const idx = k * D + h2(k, L, 70) * 2 + u * D * sp;
          if (h2(k, L, 77) < 0.25) continue; for (let q = 0; q < 26 + (L & 1) * 8; q++) { const [X, Y0] = at(idx + q * 0.25, lat + (h2(k, L, 71) - 0.5) * 3); if (inR(X, Y0)) dot(c, X, Y0, q < 10 ? "#ffffff" : "#c4d6ea", Math.max(0.2, 0.98 - q * 0.03), q < 18 ? 2 : 1); }
        }
      }
    } else {                             // C: blocky bores of cream foam, in broken bars across the stream
      const D = 4;
      for (let k = 0; k < n / D; k++) {
        const idx = k * D + u * D;
        for (let l = -0.9; l <= 0.9; l += 0.075) {
          if (h2(k, Math.round(l * 4), 72) < 0.5) continue;
          const [X, Y0] = at(idx + h2(k, Math.round(l * 10), 73) * 1.5, l * hw);
          if (inR(X, Y0)) { dot(c, X, Y0, "#fbf6e6", 1, 3); dot(c, X, Y0 + 3, "#7a6238", 0.85, 3); dot(c, X + 3, Y0, "#e0d4b0", 0.9, 3); }
        }
      }
    }
  }
};

// ---- timeline for one event (frame f of F; the stroke lands on `at`) ---------------------------------------------------------------
export const tl = (f, at = 3) => {
  const d = f - at;
  const bolt = d === 0 ? 1 : d === 1 ? 1 : d === 2 ? 0 : d === 3 ? 0.55 : 0;
  const flash = [0.5, 0.26, 0.08, 0.2, 0.06][d] ?? 0;
  const stun = d < 1 ? 0 : f < 19 ? 1 : f < 23 ? ((f & 1) ? 0.45 : 1) : 0;
  const jolt = d >= 0 && d <= 5 ? 1 - d / 6 : 0;
  const age = d < 0 ? -1 : d;
  return { d, bolt, flash, stun, jolt, age };
};

// ---- the per-option effects on a foe / a hall ------------------------------------------------------------------------------------
const cropOf = (src, b, pad = 3) => { const x = b.x - pad, y = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2, c = mk(w, h); c.getContext("2d").drawImage(src, x, y, w, h, 0, 0, w, h); return { c, x, y, w, h }; };
const lumOf = (r, g, b) => (r * 0.3 + g * 0.55 + b * 0.15) / 255;
const ramp = (l) => rgb(l > 0.78 ? Y[0] : l > 0.55 ? Y[1] : l > 0.3 ? Y[2] : l > 0.14 ? Y[3] : Y[4]);
// returns a (possibly tinted) copy of a crop, per option and frame
const stunCrop = (cr, key, s, f, flashAmt) => {
  const o = LOOK[key], out = mk(cr.w, cr.h), c = out.getContext("2d");
  c.drawImage(cr.c, 0, 0);
  if (s <= 0 && flashAmt <= 0) return out;
  const im = c.getImageData(0, 0, cr.w, cr.h), D = im.data, w = cr.w, h = cr.h;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && D[(y * w + x) * 4 + 3] > 200;
  const edges = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = (y * w + x) * 4; if (D[j + 3] < 200) continue;
    let r = D[j], g = D[j + 1], b = D[j + 2];
    if (flashAmt > 0) { r += (255 - r) * flashAmt; g += (250 - g) * flashAmt; b += (200 - b) * flashAmt * 0.7; }
    if (o.stun === "scan" && s > 0) {                 // C: scan bands, every few rows the body reads as yellow plate
      const row = (y + f * 2) % 8;
      if (row < 2) { const l = lumOf(r, g, b), q = ramp(l * 1.1 + 0.18); r = q[0]; g = q[1]; b = q[2]; }
      else if (row === 2) { r = Math.min(255, r + 40); g = Math.min(255, g + 40); b *= 0.85; }
      // a bright line sweeping up the body
      const sweep = h - 1 - ((f * 5) % (h + 14)); if (Math.abs(y - sweep) < 1) { r = 255; g = 253; b = 220; }
    } else if (o.stun === "rim" && s > 0) {           // A: the edge pixels turn yellow and crawl
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) edges.push(x, y);
      r = r * 0.97 + 4 * s; g = g * 0.97 + 6 * s; b = b * 0.9;
    }
    D[j] = r; D[j + 1] = g; D[j + 2] = b;
  }
  if (o.stun === "rim" && s > 0) for (let i = 0; i < edges.length; i += 2) {
    const x = edges[i], y = edges[i + 1], j = (y * w + x) * 4, t = ((x * 3 + y * 2 + f * 3) % 11);
    const q = rgb(t < 2 ? Y[0] : t < 7 ? Y[2] : Y[3]); D[j] = q[0]; D[j + 1] = q[1]; D[j + 2] = q[2]; D[j + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  return out;
};
// marks drawn OVER a stunned foe
const stunOver = (c, key, t, f, s) => {
  if (s <= 0) return;
  const o = LOOK[key], { fx, fy, b } = t, cx = b.x + b.w / 2, top = b.y, mid = b.y + b.h * 0.5;
  if (o.stun === "rim") {          // two sparks orbit the body, a few hop off the rim
    for (let k = 0; k < 2; k++) {
      const a = (f / 12 + k / 2) * Math.PI * 2, X = cx + Math.cos(a) * (b.w * 0.75), Y1 = mid + Math.sin(a) * b.h * 0.18 + b.h * 0.1;
      dot(c, X, Y1, Y[0], s, 2); dot(c, X - 1, Y1, Y[2], s * 0.7); dot(c, X + 2, Y1, Y[2], s * 0.7);
    }
    for (let k = 0; k < 3; k++) { const hv = h2(f >> 1, k, t.e.id | 0 || 7); dot(c, b.x + hv * b.w, b.y + h2(k, f >> 1, 9) * b.h, Y[1], s); }
  } else if (o.stun === "cage") {  // B: crossing arcs between the body's corners, re-struck every other frame
    const sd = (f >> 1) * 11 + (t.e.id | 0);
    const cs = [[b.x - 2, b.y + b.h * 0.25, b.x + b.w + 2, b.y + b.h * 0.8], [b.x + b.w + 2, b.y + b.h * 0.2, b.x - 2, b.y + b.h * 0.7]];
    cs.forEach(([x0, y0, x1, y1], i) => { const p = boltPts(x0, y0, x1, y1, sd + i, 5, 7, "free"); poly(c, p, [[3, Y[3], 0.14 * s], [1, i ? Y[1] : Y[0], 0.9 * s]]); });
    for (let k = 0; k < 3; k++) { const a = (f / 6 + k / 3) * Math.PI * 2; dot(c, cx + Math.cos(a) * 6, top - 6 + Math.sin(a) * 1.5, Y[1], s, 2); }
  } else {                          // C: a ground ring of crawling dots under the feet and a bar over the head
    ring(c, fx, fy + 1, b.w * 0.75, b.w * 0.28, Y[2], 0.9 * s, 1, 4);
    ring(c, fx, fy + 1, b.w * 0.55, b.w * 0.2, Y[0], 0.7 * s, 1, 6);
    const ph = (f % 6) / 6; for (let k = 0; k < 4; k++) dot(c, cx - 6 + k * 4 + (ph > 0.5 ? 2 : 0), top - 5, k & 1 ? Y[0] : Y[2], s, 2);
  }
};

// ---- compose one frame -----------------------------------------------------------------------------------------------------------
// ev: the events {type: "open"|"puddle"|"hall", at: frame the stroke lands, ...}; returns the whole board canvas.
export const compose = (P, key, f, F = 24, opt = {}) => {
  const o = LOOK[key], G = grade(P, key), out = mk(PW, PH), c = out.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(G.halls, 0, 0);                    // ground + halls, graded
  spate(c, P.K, o, f, F);
  const evs = P.events, states = evs.map((e) => ({ e, T: tl(f, e.at ?? 3) }));
  const stunned = new Map(), jolted = new Map();
  for (const { e, T } of states) {
    if (e.type === "open") for (const t of e.targets) stunned.set(t, T);
    if (e.type === "puddle") for (const t of e.targets) { stunned.set(t, T); jolted.set(t, T); }
  }
  // puddles (under the actors)
  for (const { e, T } of states) if (e.type === "puddle") puddleGround(c, P, o, key, e, T, f, F, G);
  c.drawImage(G.hallsOnly, 0, 0);               // halls stand in front of a puddle
  // soldiers and the rest of the foes: the actor layer with the target boxes cut out
  const rest = mk(PW, PH), rc = rest.getContext("2d"); rc.drawImage(G.actors, 0, 0);
  for (const [t] of stunned) rc.clearRect(t.b.x - 3, t.b.y - 3, t.b.w + 6, t.b.h + 6);
  c.drawImage(rest, 0, 0);
  for (const [t, T] of stunned) {
    const cr = cropOf(G.actors, t.b), jt = jolted.get(t), j = jt ? jt.jolt : 0;
    const dx = j > 0 ? (((f * 7 + (t.e.id | 0)) % 3) - 1) * (j > 0.5 ? 2 : 1) : 0, dy = j > 0.4 ? ((f & 1) ? -1 : 0) : 0;
    const img = stunCrop(cr, key, T.stun, f, jt ? T.flash * 0.55 + (j > 0.6 ? 0.12 : 0) : T.flash * 0.3);
    c.drawImage(img, cr.x + dx, cr.y + dy);
  }
  // halls struck: tint / rim on the hall's own pixels
  for (const { e, T } of states) if (e.type === "hall") hallStrike(c, P, o, key, e, T, f, F, G);
  // marks over the foes
  for (const [t, T] of stunned) stunOver(c, key, t, f, T.stun);
  // the strokes themselves, the burst and the flash
  for (const { e, T } of states) strokeFx(c, P, o, key, e, T, f);
  rain(c, f, F, 0, 0, PW, PH, opt.rain ?? 650);
  const fl = states.reduce((m, { T }) => Math.max(m, T.flash), 0);
  if (fl > 0) { c.globalCompositeOperation = "screen"; c.fillStyle = `rgba(255,244,160,${fl * 0.42})`; c.fillRect(0, 0, PW, PH); c.globalCompositeOperation = "source-over"; }
  return out;
};

const pCenter = (e) => ({ x: e.px * RES, y: e.py * RES, rx: e.rx * RES, ry: e.ry * RES });
const puddleGround = (c, P, o, key, e, T, f, F, G) => {
  const { x, y, rx, ry } = pCenter(e), lit = T.d < 0 ? 0 : T.d < 2 ? 1 : clamp(0.78 - (T.d - 2) * 0.075, 0, 1);
  // dark mirror water
  const w = mk(PW, PH), wc = w.getContext("2d");
  for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
    const d = (xx / rx) ** 2 + (yy / ry) ** 2, jag = 1 - 0.12 * h2((xx >> 2) + 50, (yy >> 1) + 50, 8);
    if (d > jag) continue;
    wc.fillStyle = d > 0.78 ? "#2c3a4a" : yy < -ry * 0.3 ? "#56708c" : "#1d2a3a"; wc.globalAlpha = d > 0.78 ? 0.8 : 0.92;
    wc.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
  }
  c.drawImage(w, 0, 0);
  c.save();
  c.beginPath(); c.ellipse(x, y, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2); c.clip();
  if (o.puddle === "glass") {          // A: the pool mirrors the foes standing in it, upside down
    for (const t of e.targets) {
      const cr = cropOf(G.actors, t.b, 1);
      c.save(); c.globalAlpha = 0.5 * (1 - lit * 0.6); c.translate(0, 2 * t.fy + 2); c.scale(1, -0.9); c.drawImage(cr.c, cr.x, cr.y + (-t.fy * 0.1 / 0.9)); c.restore();
    }
    c.globalAlpha = 0.35; c.fillStyle = "#0e1824"; c.fillRect(x - rx, y - ry, rx * 2, ry * 2); c.globalAlpha = 1;
  }
  if (o.puddle === "joints") {         // C: the flag joints run through the water; they carry the charge
    for (let yy = -ry; yy <= ry; yy += 12) { const row = Math.round(yy / 12); for (let xx = -rx; xx <= rx; xx++) { if (!(xx & 1) || lit <= 0) continue; if (bay(xx, yy) < lit) dot(c, x + xx, y + yy, T.d < 2 ? Y[0] : Y[2], 0.95); } for (let xx = -rx + (row & 1) * 11; xx <= rx; xx += 22) for (let q = -5; q <= 5; q++) if (lit > 0 && bay(xx, yy + q) < lit) dot(c, x + xx, y + yy + q + 6, Y[2], 0.9); }
  }
  rainRings(c, x, y, rx, ry, f, F, e.seed || 3);
  if (lit > 0) litEllipse(c, x, y, rx, ry, o.puddle === "joints" ? lit * 0.45 : o.puddle === "arcs" ? lit * 0.6 : lit, true, 0.95);
  c.restore();
  // the rim of the water
  ring(c, x, y, rx, ry, lit > 0 ? Y[1] : "#8fa6c0", lit > 0 ? 0.9 : 0.5, 1);
};
const hallStrike = (c, P, o, key, e, T, f, F, G) => {
  const H = e.hall, b = H.b; if (!b) return;
  const cr = cropOf(P.o[key].halls, b, 2); // graded hall + ground; we only recolour hall pixels
  const hm = H.mask, w = cr.w, h = cr.h, cx = b.x + b.w / 2;
  const s = T.d < 0 ? 0 : f < 20 ? 1 : f < 23 ? ((f & 1) ? 0.5 : 1) : 0;
  if (s <= 0) return;
  const im = cr.c.getContext("2d").getImageData(0, 0, w, h), D = im.data;
  const inH = (x, y) => x + cr.x >= 0 && y + cr.y >= 0 && x + cr.x < PW && y + cr.y < PH && hm[(y + cr.y) * PW + x + cr.x];
  const out = mk(w, h), oc = out.getContext("2d");
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inH(x, y)) continue;
    const j = (y * w + x) * 4; let r = D[j], g = D[j + 1], bb = D[j + 2];
    const edge = !inH(x - 1, y) || !inH(x + 1, y) || !inH(x, y - 1) || !inH(x, y + 1);
    if (T.d <= 1) { const q = T.d === 0 ? 0.32 : 0.14; r += (255 - r) * q; g += (250 - g) * q; bb += (190 - bb) * q * 0.7; }
    if (o.hall === "scan") {
      const row = (y + f * 2) % 11; if (row < 2) { const q = ramp(lumOf(r, g, bb) * 1.1 + 0.08); r = q[0]; g = q[1]; bb = q[2]; }
      const sweep = h - 1 - ((f * 6) % (h + 16)); if (Math.abs(y - sweep) < 1) { r = 255; g = 252; bb = 210; }
    } else if (o.hall === "rim" && edge) { const t2 = (x * 3 + y * 2 + f * 3) % 11, q = rgb(t2 < 2 ? Y[0] : t2 < 7 ? Y[2] : Y[3]); r = q[0]; g = q[1]; bb = q[2]; }
    else if (o.hall === "arcs" && edge) { const q = rgb(h2(x, y + f, 4) < 0.35 ? Y[1] : Y[3]); r = (r + q[0]) / 2; g = (g + q[1]) / 2; bb = (bb + q[2]) / 2; }
    img.data[j] = r; img.data[j + 1] = g; img.data[j + 2] = bb; img.data[j + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  c.drawImage(out, cr.x, cr.y);
  // light on the ground round the struck base, and sparks
  const gy = H.t.y * RES + 6, base = b.w * 0.6;
  litEllipse(c, cx, gy, base, base * 0.3, 0.28 * s, false, 0.8);
  if (o.hall === "scan") { ring(c, cx, gy, base * 1.05, base * 0.34, Y[2], 0.9 * s, 1, 4); ring(c, cx, gy, base * 0.8, base * 0.26, Y[0], 0.8 * s, 1, 6); }
  if (o.hall === "rim") ring(c, cx, gy, base * 1.1 + (f % 8), base * 0.34 + (f % 8) * 0.3, Y[1], 0.7 * (1 - (f % 8) / 8) * s, 1);
  if (o.hall === "arcs") {
    const sd = (f >> 1) * 5;
    for (let k = 0; k < 4; k++) { const x0 = b.x + b.w * (0.2 + 0.6 * h2(k, sd, 1)), p = boltPts(x0, b.y + 4, b.x + b.w * (0.1 + 0.8 * h2(k, sd, 2)), b.y + b.h, sd + k * 3, 8, 8, "free"); poly(c, p, [[3, Y[3], 0.22 * s], [1, k & 1 ? Y[1] : Y[0], s]]); }
    ring(c, cx, gy, base * 1.1, base * 0.34, Y[2], 0.7 * s, 1, 3);
  }
  for (let k = 0; k < 7; k++) { const hv = h2(f, k, 5); dot(c, b.x + hv * b.w, b.y + h2(k, f, 6) * b.h * 0.9, Y[(k & 1) ? 0 : 1], s * (0.6 + 0.4 * h2(k, f, 7))); }
};
const strokeFx = (c, P, o, key, e, T, f) => {
  if (T.d < 0) return;
  const bx = e.sx * RES, by = e.sy * RES;
  if (T.bolt > 0) {
    drawBolt(c, o, bx, by, e.seed || 5, T.bolt, e.from ? [e.from[0] * RES, e.from[1] * RES] : null);
    // the foot: a burst on the ground
    if (T.d <= 1) litEllipse(c, bx, by, 18, 9, 1, true, 0.95);
    else litEllipse(c, bx, by, 12, 6, 0.8, true, 0.9);
    if (o.bolt === "glass") for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; seg(c, bx, by, bx + Math.cos(a) * 26, by + Math.sin(a) * 13, 1, Y[1], 0.9); }
  }
  // the ground wave of the stroke (the blast ring, in the idea's own way)
  if (e.type !== "hall" && T.d >= 0 && T.d <= 10) {
    const p = T.d / 10, R = (e.r || 45) * RES * (0.2 + 0.8 * Math.sqrt(p)), a = 1 - p;
    if (o.bolt === "glass") ring(c, bx, by, R, R * 0.5, Y[2], 0.8 * a, 2);
    else if (o.bolt === "fork") { ring(c, bx, by, R, R * 0.5, Y[3], 0.6 * a, 1, 3); ring(c, bx, by, R * 0.7, R * 0.35, Y[1], 0.8 * a, 1, 5); }
    else ring(c, bx, by, R, R * 0.5, Y[2], 0.9 * a, 2, 6);
  }
  // little arcs hopping from the foot to the stunned (open) or to every body in the puddle (arcs idea)
  if (T.d >= 0 && T.d < 6 && (e.type === "open" || e.type === "puddle")) {
    for (const t of e.targets) {
      if (o.puddle === "arcs" || e.type === "open") {
        const p = boltPts(bx, by, t.fx, t.fy - 2, (t.e.id | 0) + T.d * 3, 6, 7, o.bolt === "step" ? "step" : "free");
        poly(c, p, [[3, Y[3], 0.2], [1, T.d < 2 ? Y[0] : Y[1], 0.95]]);
      }
    }
  }
};

// ---- the TODAY frame: the real engine's own bolt / stun / shock, for the same event ------------------------------------------
export const todayFrame = (S, P, ageMs = 120) => {
  const { g } = S, tms = g.time * 1000;
  const added = [];
  for (const e of P.events) {
    if (e.type === "hall") { const t = g.towers[e.i]; e._sv = [t.shockMax, t.shockLeft, t.shockAt]; t.shockMax = 3000; t.shockLeft = 2400; t.shockAt = g.time - 0.6; }
    else {
      for (const t of e.targets) { t.e._sv = t.e.stunUntil; t.e.stunUntil = tms + 3000; }
    }
    const fx = { type: "wxbolt", x: e.sx, y: e.sy, r: e.r || 45, ttl: 1000 - ageMs, life: 1000 };
    g.effects.push(fx); added.push(fx);
  }
  const cv = shoot(g);
  g.effects = g.effects.filter((x) => !added.includes(x));
  for (const e of P.events) {
    if (e.type === "hall") { const t = g.towers[e.i]; [t.shockMax, t.shockLeft, t.shockAt] = e._sv; }
    else for (const t of e.targets) t.e.stunUntil = t.e._sv;
  }
  return cv;
};

// ---- choosing the events on the real board ------------------------------------------------------------------------------------
// The concept STAGES its actors: three foes (and a soldier) are set down where the road is clear, so each body can be read.
const feetOf = (e) => [e.x, e.y + e.size * 0.55];
export const stage = (S) => {
  const { g } = S, tnow = g.time * 1000, foes = g.enemies.filter((e) => e.hp > 0 && !e.flying && e.size && (e.born === undefined || tnow - e.born > 4000));
  const spots = [];
  for (let d = 0.04 * TOTAL_LEN; d < 0.97 * TOTAL_LEN; d += 5) {
    const [x, y] = posAt(d), a = angleAt(d);
    if (x < 60 || x > 655 || y < 60 || y > 500 || [-40, -20, 0, 20, 40].some((o) => inRiver(x + o * 1.2, y + o * 0.4, 14) || inRiver(x + o, y - 30, 14)) || underBridge(x, y, 95)) continue;
    if (Math.abs(Math.sin(angleAt(d - 14) - angleAt(d + 14))) > 0.1) continue;
    if (g.towers.some((t) => Math.hypot(t.x - x, t.y - y) < 60)) continue;
    const dm = Math.min(...foes.map((e) => Math.hypot(e.x - x, e.y - y)), 999);
    spots.push({ d, x, y, a, dm, h: Math.abs(Math.sin(a)) < 0.22 });
  }
  spots.sort((p, q) => q.dm - p.dm);
  const used = [], pick = (minApart, hz) => { const s = spots.find((p) => (!hz || p.h) && used.every((u) => Math.hypot(u.x - p.x, u.y - p.y) > minApart)); if (s) used.push(s); return s; };
  const pool = [...foes];
  const lay = (spot, offs, n, tan = false) => pool.splice(0, n).map((e, i) => { const [al, la] = offs[i], cx = tan ? Math.cos(spot.a) : 1, cy = tan ? Math.sin(spot.a) : 0; e.x = spot.x + cx * al - cy * la; e.y = spot.y + cy * al + cx * la - e.size * 0.55 + 4; return e; });
  const pu = pick(0, true), op = pick(120, false), ha = null;
  console.log('stage spots', spots.length, pu && [pu.x | 0, pu.y | 0], op && [op.x | 0, op.y | 0]);
  const puddleFoes = pu && lay(pu, [[-26, 6], [2, -5], [27, 5]], 3);
  const openFoes = op && lay(op, [[-22, 3], [6, -6], [30, 5]], 3, true);
  return { pu, op, puddleFoes, openFoes, spots };
};
export const pickEvents = (S, P, ST, want = ["puddle", "open", "hall"], hallI = null) => {
  const { g } = S, evs = [];
  if (want.includes("puddle") && ST.pu) {
    const { pu, puddleFoes } = ST, ts = puddleFoes.map((e) => P.tgt(e)).filter(Boolean);
    evs.push({ type: "puddle", at: 3, px: pu.x, py: pu.y + 6, rx: 44, ry: 21, sx: pu.x + 2, sy: pu.y + 4, r: 45, seed: 7, targets: ts });
  }
  if (want.includes("open") && ST.op) {
    const { op, openFoes } = ST;
    let sx = op.x, sy = op.y + 30;
    for (const side of [-1, 1]) { const x = op.x - Math.sin(op.a) * 34 * side, y = op.y + Math.cos(op.a) * 34 * side; if (!inRiver(x, y, 6) && x > 40 && x < 700 && y > 60) { sx = x; sy = y; break; } }
    const ts = openFoes.map((e) => P.tgt(e)).filter(Boolean);
    // a soldier of the garrison, if one stands on the field, set beside them
    evs.push({ type: "open", at: 3, sx, sy, r: 45, seed: 11, from: [sx + 56, -6], targets: ts });
  }
  if (want.includes("hall")) {
    let i = hallI;
    if (i == null) { i = 0; let best = -1; g.towers.forEach((t, k) => { const d = Math.min(...evs.map((e) => Math.hypot(t.x - e.sx, t.y - e.sy)), 999); if (d > best) { best = d; i = k; } }); }
    const t = g.towers[i], nt = shoot(g, ["foes", t]), hl = diffLayer(P.bare, nt);
    const b = bboxOf(hl.mask, t.x * RES - 90, t.y * RES - 190, t.x * RES + 90, t.y * RES + 40);
    evs.push({ type: "hall", at: 3, i, hall: { t, ...hl, b }, sx: (b.x + b.w / 2) / RES, sy: b.y / RES + 10, seed: 17, r: 30, targets: [], from: [(b.x + b.w / 2) / RES + 50, -6] });
  }
  P.events = evs;
  return evs;
};
