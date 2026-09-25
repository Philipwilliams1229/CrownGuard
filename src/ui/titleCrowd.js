// ============ TITLE CROWD ============
// The crown's people going about the morning on the title vista: soldiers
// and militia walking the road to and from the gate at their own paces, a
// few stopping to look about, two knights keeping the gate, a pair talking
// at the bend, and a militiaman forking hay in the field. They are the
// board's own rigs (render/rigs.js, walk and fight sheets), stamped on a
// second canvas laid exactly over the vista (same aspect, same object-fit
// and object-position), so they stay on the road under every crop.
//
// The overlay canvas is sized in whole vista frames: `K` overlay pixels per
// vista pixel, picked by the home screen to match the device's pixels, so a
// figure is drawn once at its final size (no second resample). Figures shrink
// with distance up the road (sAt), and step at a pace that fits their stride.
// Cost per frame: one clear of the road's box and two stamps a figure
// (shadow, body), about a dozen figures; ticks at ~30 fps.

import { rigFrame } from "../render/rigs.js";
import { PX, bakeSprite, part, lighten, darken, blobBall, cylinder, hash } from "../render/paint.js";
import { flame } from "../render/buildkit.js";
import { VW, ROAD, ROAD_W, HAY, CASTLE_LIFE as CL } from "./titleArt.js";

// ---- the road as a path ----------------------------------------------------
// From the gate (d = 0) down past the bottom edge, where walkers come and go.
const PATH = [...ROAD, [184, 292]];
const SEG = [];
let LEN = 0;
for (let k = 0; k < PATH.length - 1; k++) {
  const [x0, y0] = PATH[k], [x1, y1] = PATH[k + 1], l = Math.hypot(x1 - x0, y1 - y0);
  SEG.push({ x0, y0, dx: (x1 - x0) / l, dy: (y1 - y0) / l, l, d0: LEN, k });
  LEN += l;
}
const at = (d, lane = 0) => {
  let s = SEG[SEG.length - 1];
  for (const g of SEG) if (d < g.d0 + g.l) { s = g; break; }
  const t = Math.max(0, d - s.d0);
  // the painted width, eased between stretches; lane -1..1 is edge to edge
  const w = ROAD_W(Math.min(s.k + t / s.l, ROAD.length - 1)) - 1.5;
  return { x: s.x0 + s.dx * t - s.dy * lane * w / 2, y: s.y0 + s.dy * t + s.dx * lane * w / 2 };
};

// Size with distance: a man at the gate stands about a third of its arch;
// in the near field, a little under the height of the young oaks.
const sAt = (y) => 0.4 + 0.34 * Math.min(1, Math.max(0, (y - 172) / 98));

// ---- the cast ----------------------------------------------------------------
const WALKERS = ["knight", "farmer", "paladin", "berserk", "knight", "farmer", "heroKnight", "heroHunter"];
const HEROES = new Set(["heroKnight", "heroHunter"]);
const TYPES = ["farmer", "heroHunter", "knight", "heroKnight", "paladin", "berserk"];

// those who stay put: [type, x, y, face, what]
const STAYERS = [
  ["knight", 349, 173.5, -1, "guard"],
  ["knight", 371, 173.5, 1, "guard"],
  ["paladin", 274, 201, 1, "talk"],
  ["berserk", 283, 202.5, -1, "talk"],
  ["farmer", HAY[0] - 11, HAY[1] + 1, 1, "hay"],
];

// idle: now and then shift the weight to the other foot (walk frame 0 <-> 2)
// and glance back over the shoulder, like the rallied soldiers on the board
const idle = (t, seed) => {
  const shift = Math.floor(t / (4.5 + (seed % 3) * 1.3) + seed * 0.37) % 2;
  const g = (t / (5.5 + (seed % 4) * 0.9) + seed * 0.618) % 1;
  return { sheet: "walk", frame: shift ? 2 : 0, glance: g < 0.14 };
};
// the militiaman at the hay: wind up, pitch, three times, then a breather
const pitch = (t, seed) => {
  const c = (t + seed) % 8;
  if (c < 3.6) return { sheet: "fight", frame: (c % 1.2) < 0.75 ? 0 : 1, glance: false };
  return idle(t, seed);
};

// the frames the crowd uses, baked a few at a time before it starts
const NEEDED = [];
for (const t of TYPES) for (let f = 0; f < 4; f++) NEEDED.push([t, "walk", f]);   // (the sentry is a knight)
NEEDED.push(["farmer", "fight", 0], ["farmer", "fight", 1]);

// a contact shadow: a plum ellipse, hard-edged, baked once
let SHADOW = null;
const shadowSprite = () => {
  if (SHADOW) return SHADOW;
  const w = 48, h = 18, cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), im = c.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2;
    if (r <= 1) { const i = (y * w + x) * 4; im.data[i] = 42; im.data[i + 1] = 28; im.data[i + 2] = 44; im.data[i + 3] = r < 0.45 ? 92 : 64; }
  }
  c.putImageData(im, 0, 0);
  return (SHADOW = cv);
};


// ---- the castle's idle life ----------------------------------------------------
// Baked once as small frame sets at the art's own density, stamped live: the
// royal standard on the keep, pennants on the stair turrets, the two crown
// banners on the gatehouse, torches either side of the gate, chimney smoke,
// a sentry on the wall walk, and a few birds wheeling over the towers who
// now and then settle on a merlon.
const BLUE = "#34508e", GOLD = "#d8b34a";
const band3 = (v, col) => (v > 0.35 ? lighten(col, 0.18) : v < -0.35 ? darken(col, 0.3) : col);
// a flag streaming from a pole at (1, 1): length `len`, depth `dep`, rippling
// with phase `ph`; a swallowtail at the fly and, if `crown`, the gold device
const flagFrame = (len, dep, ph, col, o = {}) => bakeSprite(len + 3, dep + 4 + (o.pole || 0), (c) => {
  const y0 = 1.5, wave = (u) => Math.sin(u * 0.55 - ph) * (u / len) * 1.3;
  if (o.pole) part(c, (cc) => { cylinder(cc, 0.3, 0.4, 1.2, dep + 1.5 + o.pole, "#6a4a2e", { r: 0.5, hi: 0.3, lo: 0.5 }); });
  part(c, (cc) => {
    for (let u = 0; u < len; u += 0.5) {
      const w = wave(u), tail = u > len - 3 ? Math.min(dep * 0.35, (u - (len - 3)) * 0.8) : 0;
      cc.fillStyle = band3(Math.cos(u * 0.55 - ph), col);
      const top = y0 + w, bot = y0 + w + dep * (1 - (u / len) * 0.18);
      if (tail) { cc.fillRect(1.3 + u, top, 0.5, (bot - top) / 2 - tail / 2); cc.fillRect(1.3 + u, (top + bot) / 2 + tail / 2, 0.5, (bot - top) / 2 - tail / 2); }
      else cc.fillRect(1.3 + u, top, 0.5, bot - top);
      if (o.trim) { cc.fillStyle = GOLD; cc.fillRect(1.3 + u, top, 0.5, 0.5); }
    }
    if (o.crown) {
      const cx = 1.3 + len * 0.36, cy = y0 + wave(len * 0.36) + dep * 0.5;
      cc.fillStyle = GOLD;
      cc.fillRect(cx - 1.5, cy, 3, 1); cc.fillRect(cx - 1.5, cy - 1.2, 0.6, 1.2); cc.fillRect(cx - 0.3, cy - 1.6, 0.6, 1.6); cc.fillRect(cx + 0.9, cy - 1.2, 0.6, 1.2);
    }
  });
});
// a crown banner hanging from its rod: the hem sways, a fold travels across
const bannerFrame = (ph) => bakeSprite(11, 19, (c) => {
  const w = 7, h = 14, x = 5.5, top = 1.5;
  part(c, (cc) => {
    for (let y = 0; y < h + 3; y += 0.5) {
      const sway = Math.sin(ph + y * 0.3) * 0.7 * (y / h);
      const tail = y > h - 3 ? (y - (h - 3)) * 1.2 : 0;
      for (let u = 0; u < w; u += 0.5) {
        if (tail && Math.abs(u - w / 2 + 0.25) < tail * 0.5) continue;
        if (y >= h) continue;
        const fold = Math.sin(u * 0.9 + ph * 1.3 - y * 0.12);
        cc.fillStyle = u < 0.6 || u >= w - 0.6 || (y > 1 && y < 1.6) ? GOLD : band3(fold - (u / w) * 0.5 + 0.2, BLUE);
        cc.fillRect(x - w / 2 + u + sway, top + y, 0.5, 0.5);
      }
    }
    const sw = Math.sin(ph + 1.5) * 0.25;
    cc.fillStyle = GOLD;
    const cy = top + 7 + sw;
    cc.fillRect(x - 2 + sw, cy, 4, 1.2); cc.fillRect(x - 2 + sw, cy - 1.8, 0.8, 1.8); cc.fillRect(x - 0.4 + sw, cy - 2.4, 0.8, 2.4); cc.fillRect(x + 1.2 + sw, cy - 1.8, 0.8, 1.8);
    cc.fillStyle = "#c04a52"; cc.fillRect(x - 0.4 + sw, cy + 0.2, 0.8, 0.6);
  });
  part(c, (cc) => cylinder(cc, x - w / 2 - 1.2, top - 1, w + 2.4, 1.4, "#5a3f26", { r: 0.6, hi: 0.3, lo: 0.4 }));
});
const flameFrame = (i) => bakeSprite(10, 12, (c) => flame(c, 5, 10.5, 0.55, i * 0.137 + 0.4, i * 3), false);
const puffFrame = () => bakeSprite(7, 6, (c) => blobBall(c, 3.5, 3, 2.8, 2.2, "#b8b0c4", 5, { hi: 0.5, lo: 0.4 }), false);
// a bird in three poses: wings up, wings down, perched
const birdFrame = (pose) => bakeSprite(8, 6, (c) => {
  const col = "#3e3650", lt = "#6a6078", bill = "#d8a040";
  const parts = pose === 2
    ? [[2.5, 2.5, 3, 1.5, col], [5, 2, 1, 1, col], [6, 2.5, 0.5, 0.5, bill], [3, 4, 0.5, 1, "#2a2230"], [1.5, 3, 1, 0.5, col]]
    : [[2.5, 2.5, 3, 1, col], [3, 3.5, 2, 0.5, lt], [5.5, 2, 1, 1, col], [6.5, 2.5, 0.5, 0.5, bill],
      ...(pose === 0 ? [[1.5, 0.5, 1, 2, col], [3.5, 1, 1, 1.5, col]] : [[1.5, 3.5, 1, 1.5, col], [3.5, 3.5, 1, 1, col]])];
  c.fillStyle = "#241a26";
  for (const [x, y, w, h] of parts) c.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
  for (const [x, y, w, h, cc] of parts) { c.fillStyle = cc; c.fillRect(x, y, w, h); }
}, false);

let LIFE = null;
const lifeBakes = () => [
  () => ({ standard: [0, 1, 2, 3].map((f) => flagFrame(13, 6, (f / 4) * Math.PI * 2, BLUE, { crown: true, trim: true })) }),
  () => ({ pennant: [0, 1, 2, 3].map((f) => flagFrame(6, 2.4, (f / 4) * Math.PI * 2, BLUE, { pole: 4, trim: true })) }),
  () => ({ banner: [0, 1, 2, 3].map((f) => bannerFrame((f / 4) * Math.PI * 2)) }),
  () => ({ flame: [0, 1, 2, 3, 4, 5].map(flameFrame), puff: puffFrame(), bird: [0, 1, 2].map(birdFrame) }),
];

// a baked sprite at (x, y) in scene units, its anchor (ax, ay) in its own units
const put = (ctx, D, cv, x, y, ax = 0, ay = 0, face = 1) => {
  const k = D / PX, w = Math.round(cv.width * k), h = Math.round(cv.height * k);
  const px = Math.round((x - ax * face) * D), py = Math.round((y - ay) * D);
  if (face >= 0) ctx.drawImage(cv, px, py, w, h);
  else { ctx.save(); ctx.translate(px, 0); ctx.scale(-1, 1); ctx.drawImage(cv, 0, py, w, h); ctx.restore(); }
};

// the sentry: paces his stretch of the wall walk, pausing at each end to look out
const SENTRY_S = 0.34;
const sentryAt = (t) => {
  const { x0, x1 } = CL.walk, v = 2.4, pause = 3.2, leg = (x1 - x0) / v, T = 2 * (leg + pause);
  const u = (t + 4) % T;
  if (u < pause) return { x: x0, face: -1, moving: false };
  if (u < pause + leg) return { x: x0 + (u - pause) * v, face: 1, moving: true, ph: (u - pause) * v };
  if (u < 2 * pause + leg) return { x: x1, face: 1, moving: false };
  return { x: x1 - (u - 2 * pause - leg) * v, face: -1, moving: true, ph: (u - 2 * pause - leg) * v };
};

// the birds: wheel over the keep, and now and then one drops onto a merlon
const BIRDS = [0, 1, 2];
const wheel = (i, t) => {
  const a = t * (0.32 + i * 0.05) + i * 2.1;
  return { x: 362 + Math.cos(a) * (44 - i * 7), y: 40 + i * 6 + Math.sin(a) * (7 + i * 2), dx: -Math.sin(a) };
};
const birdAt = (i, t) => {
  const T = 34, u = (t + i * 11.3) % T, perch = CL.perches[(Math.floor((t + i * 11.3) / T) + i) % CL.perches.length];
  const ease = (k) => k * k * (3 - 2 * k);
  const flap = Math.floor(t * 6 + i) % 2 && (t * 0.7 + i) % 3 < 1.6 ? 1 : 0;
  if (u < 22) { const w = wheel(i, t); return { x: w.x, y: w.y, face: w.dx >= 0 ? 1 : -1, pose: flap }; }
  const t0 = t - (u - 22), t1 = t0 + 12;
  if (u < 25) { const w = wheel(i, t0), k = ease((u - 22) / 3); return { x: w.x + (perch[0] - w.x) * k, y: w.y + (perch[1] - w.y) * k, face: perch[0] > w.x ? 1 : -1, pose: k > 0.8 ? 1 : 0 }; }
  if (u < 31) return { x: perch[0], y: perch[1], face: hash(i, Math.floor(t / 1.7)) > 0.5 ? 1 : -1, pose: 2 };
  const w = wheel(i, t1), k = ease((u - 31) / 3);
  return { x: perch[0] + (w.x - perch[0]) * k, y: perch[1] + (w.y - perch[1]) * k, face: w.x > perch[0] ? 1 : -1, pose: flap };
};

function renderLife(ctx, D, t) {
  if (!LIFE) return;
  // the sentry, seen only between the merlons of the wall walk
  const s = sentryAt(t), W = CL.walk;
  ctx.save();
  ctx.beginPath();
  ctx.rect((W.x0 - 8) * D, 0, (W.x1 - W.x0 + 16) * D, (W.top - 0.6) * D);
  for (const [g0, g1] of W.gaps) ctx.rect((g0 + 0.5) * D, (W.top - 1) * D, (g1 - g0 - 1) * D, (W.y - W.top + 1) * D);
  ctx.clip();
  const fr = s.moving ? Math.floor(s.ph / (9.2 * SENTRY_S / 4)) % 4 : (Math.floor(t / 2.2) % 3 === 2 ? 2 : 0);
  stamp(ctx, D, "knight", "walk", fr, s.x, W.y + 2.6, SENTRY_S, s.face, 1, false);
  ctx.restore();
  // the standard, the turret pennants, the gate's banners
  const [fx, fy] = CL.standard;
  put(ctx, D, LIFE.standard[Math.floor(t * 6) % 4], fx, fy, 1, 1.5);
  CL.pennants.forEach(([x, y], i) => put(ctx, D, LIFE.pennant[Math.floor(t * 7 + i * 1.3) % 4], x, y, 0.9, 8.2));
  CL.banners.forEach(([x, y], i) => put(ctx, D, LIFE.banner[Math.floor(t * 2.6 + i * 2) % 4], x, y, 5.5, 0.5));
  // torchlight
  CL.torches.forEach(([x, y], i) => put(ctx, D, LIFE.flame[Math.floor(hash(Math.floor(t * 9), i + 3) * 6)], x, y, 5, 10.5));
  // smoke from the keep's chimney, leaning off with the breeze
  const [cx, cy] = CL.chimney;
  for (let i = 0; i < 5; i++) {
    const a = ((t / 7 + i / 5) % 1), sc = 0.5 + a * 1.1;
    ctx.globalAlpha = 0.55 * (1 - a) * Math.min(1, a * 8);
    const pc = LIFE.puff, w = Math.round(pc.width * D / PX * sc), h = Math.round(pc.height * D / PX * sc);
    ctx.drawImage(pc, Math.round((cx + a * 9 + Math.sin(a * 5 + i) * 0.8) * D - w / 2), Math.round((cy - a * 16) * D - h / 2), w, h);
  }
  ctx.globalAlpha = 1;
  // the birds
  for (const i of BIRDS) { const b = birdAt(i, t); put(ctx, D, LIFE.bird[b.pose], b.x, b.y, 4, 5, b.face); }
}

// ---- the crowd -------------------------------------------------------------------
let SEQ = 0;
function makeWalker(state, toGate, d) {
  const onRoad = new Set(state.walkers.map((w) => w.type));
  let type;
  do type = WALKERS[Math.floor(Math.random() * WALKERS.length)]; while (HEROES.has(type) && onRoad.has(type));
  const fps = 5.2 + Math.random() * 2.4;
  const seed = ++SEQ;
  return {
    type, seed, toGate, fps, d: d ?? (toGate ? LEN : 0),
    lane: (toGate ? 0.3 : -0.3) + (Math.random() - 0.5) * 0.16,
    phase: Math.random() * 4,
    // one in three stops somewhere along the way to look about
    stopAt: Math.random() < 0.35 ? 30 + Math.random() * (LEN - 70) : -1, stopFor: 2.5 + Math.random() * 3,
    paused: 0, blocked: false,
  };
}

export function createCrowd() {
  const state = { walkers: [], t: 0, nextSpawn: 2 + Math.random() * 3 };
  // start with the road already in use, spread along its length
  for (const [toGate, f] of [[true, 0.25], [false, 0.5], [true, 0.8], [false, 0.12]]) {
    state.walkers.push(makeWalker(state, toGate, LEN * f));
  }
  return state;
}

function step(state, dt) {
  state.t += dt;
  const W = state.walkers;
  for (const w of W) {
    const p = at(w.d, w.lane), s = sAt(p.y);
    // someone close ahead going the same way: wait on them (and so a pair
    // forms and passes the time); go again once there's a gap
    const gap = 18 * s;
    let ahead = Infinity;
    for (const o of W) if (o !== w && o.toGate === w.toGate) {
      const g = w.toGate ? w.d - o.d : o.d - w.d;
      if (g > 0 && g < ahead) ahead = g;
    }
    if (w.blocked ? ahead < gap * 1.6 : ahead < gap) { w.blocked = true; continue; }
    w.blocked = false;
    if (w.paused > 0) { w.paused -= dt; continue; }
    if (w.stopAt >= 0 && (w.toGate ? w.d <= w.stopAt : w.d >= w.stopAt)) { w.paused = w.stopFor; w.stopAt = -1; continue; }
    // one walk cycle carries a man about 9 units of his own size
    const v = (w.fps / 4) * 9.2 * s;
    w.d += (w.toGate ? -v : v) * dt;
    w.phase += w.fps * dt;
  }
  // through the gate, or off the bottom edge: gone
  state.walkers = W.filter((w) => (w.toGate ? w.d > 0.5 : w.d < LEN));
  state.nextSpawn -= dt;
  if (state.nextSpawn <= 0 && state.walkers.length < 6) {
    const toGate = Math.random() < 0.5;
    const start = toGate ? LEN : 0;
    // not on top of someone just setting out
    if (!state.walkers.some((w) => w.toGate === toGate && Math.abs(w.d - start) < 26)) {
      state.walkers.push(makeWalker(state, toGate));
      state.nextSpawn = 4 + Math.random() * 5;
    } else state.nextSpawn = 1;
  }
}

// One figure: its shadow, then its frame, at `s` of board size, with the
// feet on (x, y) in scene units. D = overlay pixels per scene unit.
function stamp(ctx, D, type, sheet, frame, x, y, s, face, alpha, shade = true) {
  const { cv, ax, ay } = rigFrame(type, sheet, frame);
  // rig pixels per overlay pixel, stepped so a walker's pixels don't crawl
  const k = Math.round(s * D / PX * 10) / 10;
  const w = Math.round(cv.width * k), h = Math.round(cv.height * k);
  const ox = Math.round(ax * PX * k), oy = Math.round(ay * PX * k);
  const px = Math.round(x * D), py = Math.round(y * D);
  ctx.globalAlpha = alpha;
  const sh = shadowSprite(), sw = Math.round(12 * s * D), shh = Math.round(4.6 * s * D);
  if (shade) ctx.drawImage(sh, px + Math.round(s * D) - (sw >> 1), py - (shh >> 1), sw, shh);
  if (face >= 0) ctx.drawImage(cv, px - ox, py - oy, w, h);
  else { ctx.save(); ctx.translate(px, 0); ctx.scale(-1, 1); ctx.drawImage(cv, -ox, py - oy, w, h); ctx.restore(); }
}

// the box the crowd can reach, in scene units: cleared each frame
const BOX = [150, 10, 310, 265];

function render(state, canvas) {
  const ctx = canvas.getContext("2d");
  const D = (canvas.width / VW) * 2;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.clearRect(BOX[0] * D, BOX[1] * D, BOX[2] * D, BOX[3] * D);
  const t = state.t, list = [];
  renderLife(ctx, D, t);
  STAYERS.forEach(([type, x, y, face, what], i) => {
    const pose = what === "hay" ? pitch(t, i * 2.3) : idle(t, i * 3 + 1);
    // the talkers turn to each other; one looks off now and then
    list.push({ type, x, y, face: pose.glance && what !== "guard" ? -face : face, sheet: pose.sheet, frame: pose.frame, a: 1 });
  });
  for (const w of state.walkers) {
    const p = at(w.d, w.lane);
    const moving = !w.blocked && !(w.paused > 0);
    const pose = moving ? { sheet: "walk", frame: Math.floor(w.phase) % 4, glance: false } : idle(t, w.seed);
    const face = (w.toGate ? 1 : -1) * (pose.glance ? -1 : 1);
    // out of the gate's shadow, and back into it
    const a = Math.min(1, w.d / 7);
    list.push({ type: w.type, x: p.x, y: p.y, face, sheet: pose.sheet, frame: pose.frame, a });
  }
  list.sort((a, b) => a.y - b.y);
  for (const f of list) if (f.a > 0.02) stamp(ctx, D, f.type, f.sheet, f.frame, f.x, f.y, sAt(f.y), f.face, f.a);
  ctx.globalAlpha = 1;
}

// Start the crowd on `canvas`. `still`: stand them where they are, idling in
// place (prefers-reduced-motion) — drawn once, no loop. Returns a handle with
// stop() and redraw() (call redraw after the canvas is resized).
export function startCrowd(canvas, { still = false } = {}) {
  const state = createCrowd();
  let alive = true, raf = 0, last = 0, ready = false, bake = 0;
  const frame = (now) => {
    raf = 0;
    if (!alive || document.hidden) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    // about 30 fps is plenty for a slow stroll
    if (dt && dt < 0.03) { raf = requestAnimationFrame(frame); return; }
    last = now;
    step(state, dt);
    render(state, canvas);
    raf = requestAnimationFrame(frame);
  };
  const go = () => {
    if (!alive || raf || !ready) return;
    render(state, canvas);
    if (still || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const onVis = () => { if (!document.hidden) go(); };
  document.addEventListener("visibilitychange", onVis);
  // bake the frames a handful at a time, so the menu never stutters
  let i = 0;
  const lb = LIFE ? [] : lifeBakes(), life = {};
  const warm = () => {
    if (!alive) return;
    if (i < NEEDED.length) for (const end = Math.min(NEEDED.length, i + 4); i < end; i++) rigFrame(...NEEDED[i]);
    else if (lb.length) Object.assign(life, lb.shift()());
    if (i < NEEDED.length || lb.length) bake = setTimeout(warm, 0);
    else { if (!LIFE) LIFE = life; ready = true; go(); }
  };
  warm();
  return {
    state,
    stop() { alive = false; cancelAnimationFrame(raf); clearTimeout(bake); document.removeEventListener("visibilitychange", onVis); },
    redraw() { if (ready && (still || !raf)) render(state, canvas); },
  };
}

// for the lab: where the road is, to check the figures stand on it
export const crowdDebug = { at, sAt, LEN, step, render, bakeLife: () => { LIFE = LIFE || Object.assign({}, ...lifeBakes().map((f) => f())); } };
