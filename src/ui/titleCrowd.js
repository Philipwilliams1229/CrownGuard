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
import { PX } from "../render/paint.js";
import { VW, ROAD, ROAD_W, HAY } from "./titleArt.js";

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
for (const t of TYPES) for (let f = 0; f < 4; f++) NEEDED.push([t, "walk", f]);
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
function stamp(ctx, D, type, sheet, frame, x, y, s, face, alpha) {
  const { cv, ax, ay } = rigFrame(type, sheet, frame);
  // rig pixels per overlay pixel, stepped so a walker's pixels don't crawl
  const k = Math.round(s * D / PX * 10) / 10;
  const w = Math.round(cv.width * k), h = Math.round(cv.height * k);
  const ox = Math.round(ax * PX * k), oy = Math.round(ay * PX * k);
  const px = Math.round(x * D), py = Math.round(y * D);
  ctx.globalAlpha = alpha;
  const sh = shadowSprite(), sw = Math.round(12 * s * D), shh = Math.round(4.6 * s * D);
  ctx.drawImage(sh, px + Math.round(s * D) - (sw >> 1), py - (shh >> 1), sw, shh);
  if (face >= 0) ctx.drawImage(cv, px - ox, py - oy, w, h);
  else { ctx.save(); ctx.translate(px, 0); ctx.scale(-1, 1); ctx.drawImage(cv, -ox, py - oy, w, h); ctx.restore(); }
}

// the box the crowd can reach, in scene units: cleared each frame
const BOX = [150, 120, 300, 160];

function render(state, canvas) {
  const ctx = canvas.getContext("2d");
  const D = (canvas.width / VW) * 2;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.clearRect(BOX[0] * D, BOX[1] * D, BOX[2] * D, BOX[3] * D);
  const t = state.t, list = [];
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
  const warm = () => {
    if (!alive) return;
    for (const end = Math.min(NEEDED.length, i + 4); i < end; i++) rigFrame(...NEEDED[i]);
    if (i < NEEDED.length) bake = setTimeout(warm, 0);
    else { ready = true; go(); }
  };
  warm();
  return {
    state,
    stop() { alive = false; cancelAnimationFrame(raf); clearTimeout(bake); document.removeEventListener("visibilitychange", onVis); },
    redraw() { if (ready && (still || !raf)) render(state, canvas); },
  };
}

// for the lab: where the road is, to check the figures stand on it
export const crowdDebug = { at, sAt, LEN, step, render };
