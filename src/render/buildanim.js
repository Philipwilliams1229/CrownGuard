// ============ RAISING A HALL ============
// The moment a hall is bought, levelled, branched or ascended. The engine
// marks it (actions.js markRaised): t.raised = { at, how, prev } where `at`
// is g.time in seconds, `how` is "build" | "level" | "branch" | "ascend",
// and `prev` the form it had before ({ level, branch, rank4 }, null for a
// new hall). While raiseSecs(t) have not passed, draw.js hands the hall to
// drawRaising instead of painting it directly. `paint(t)` paints any form
// of it — pass a copy with other fields to paint the old one, e.g.
// paint({ ...t, ...t.raised.prev }), or `{ ...t, noFolk: true }` for the
// hall without its people (every hall honours noFolk: its crew, mage,
// priest, birds, and whatever they hold). Visual only: the hall already
// fights.
//
// One shared treatment for all thirteen halls:
//   build  — a timelapse. Three builders sprint out of the castle gate in a
//            straight line (builders.js; nothing on the board touches them)
//            while the plot is staked out; the scaffold goes up; the hall is
//            set piece by piece — cut from its own picture along its ink
//            lines (buildcut.js): the walls course by course under a working
//            platform that climbs with them, then the fittings into their
//            openings, then the trim — and the person is put in place last;
//            the scaffold comes down, and the crew runs home. Its length
//            depends on the run (buildPlan / raiseSecs). On water the same,
//            the poles standing in the river.
//   level  — the old form with a quick scaffold round it and a hammer
//            knocking twice (the hall jolts, chips and a spark), then the new
//            form pops with a squash-and-stretch, chips and a sparkle.
//   branch / ascend — a column of gold light wraps the old form, which
//            trembles and glows; the new form shoots up out of it with a big
//            bounce, still glowing, and a ring of gold motes rolls out round
//            its feet. Ascend is taller, brighter and has more motes.
// The engine's own effects fire alongside (build: a dust ring, knock and
// shake; level: the green ring and burst; branch/ascend: the gold ring,
// burst and white flash) — these parts stay out of their way: nothing here
// is a flat ring or a white bloom.
//
// Rules kept: every offset and scale is snapped to art pixels (a scale only
// ever moves the hall's edges by whole art pixels, and is exactly 1 at
// rest); from 97% of a level/branch/ascend on, and once a build's scaffold
// is down, the hall is painted plainly, so the hand back to draw.js is pixel
// for pixel. Each hall form is measured once (its
// top and body width, painted off-screen with drawTowerPortrait) so the
// scaffold and the reveal fit a squat catapult and a 70px spire alike.

import { PX, hash } from "./paint.js";
import { TOWERS } from "../data/towers.js";
import { PTS } from "../engine/path.js";
import { drawTowerPortrait } from "./towers.js";
import { cutSteps } from "./buildcut.js";

// build: a nominal length only — a build's real length depends on how far
// the crew has to run (buildPlan / raiseSecs)
export const RAISE_SECS = { build: 2.4, level: 0.45, branch: 0.7, ascend: 0.8 };

// ---- small maths -----------------------------------------------------------
const sn = (v) => Math.round(v * PX) / PX;            // snap to the art grid
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p, a, b) => cl((p - a) / (b - a));       // 0..1 across [a, b]
const eo = (u) => 1 - (1 - u) * (1 - u);              // ease out
const backOut = (u, s = 1.6) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2;
// a value along keyframes [[p, v], ...], smoothstepped between them
const keys = (p, ks) => {
  if (p <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (p <= ks[i][0]) {
      const [a, va] = ks[i - 1], [b, vb] = ks[i];
      const u = (p - a) / (b - a);
      return va + (vb - va) * u * u * (3 - 2 * u);
    }
  }
  return ks[ks.length - 1][1];
};
const rect = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(sn(x), sn(y), sn(w), sn(h)); };

// ---- palette ---------------------------------------------------------------
const INK = "#241a26";
// fresh-cut scaffold timber, paler than any hall's seasoned oak so it reads apart
const WOOD_HI = "#e8c486", WOOD = "#c49a5c", WOOD_LO = "#94693a";
const STONE = "#a19a8a", STONE_HI = "#c8c0ac";
const GOLD = "#d8b34a", GOLD_HI = "#f4d878", CREAM = "#fff3d2";
const DUST_HI = "#efe4c8", DUST = "#d4c6a6", DUST_LO = "#b3a386";
const FOAM = "#eef6f4";
const CHIP_LO = "#4a3630";

// ---- measuring a form ------------------------------------------------------
// The top of each form (relative to t.y) and its body's half-width, painted
// once off-screen. Falls back to a middling hall if anything goes wrong.
const BOX = new Map();
let mcv = null;
const MW = 150, MH = 160, MX = 75, MY = 124;           // scratch canvas, world units
const measure = (t, form) => {
  const key = `${t.kind}|${form.level}|${form.branch || ""}|${form.rank4 || ""}`;
  let b = BOX.get(key);
  if (b) return b;
  b = { top: -46, hw: 15 };
  try {
    if (!mcv) { mcv = document.createElement("canvas"); mcv.width = MW * PX; mcv.height = MH * PX; }
    const c = mcv.getContext("2d", { willReadFrequently: true });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, mcv.width, mcv.height);
    c.setTransform(PX, 0, 0, PX, 0, 0);
    c.imageSmoothingEnabled = false;
    const f = { ...t, level: form.level, branch: form.branch || null, rank4: form.rank4 || null,
      x: MX, y: MY, raised: null, anim: 0, mAnim: 0, _idle: true, units: [], eagle: null };
    c.save(); drawTowerPortrait(c, f, 0); c.restore();
    const d = c.getImageData(0, 0, mcv.width, mcv.height).data, W = mcv.width, H = mcv.height;
    const bodyRow = (MY - 4) * PX;
    let top = -1, hw = 0;
    for (let y = 0; y < H; y++) {
      const row = y * W * 4;
      for (let x = 0; x < W; x++) {
        if (d[row + x * 4 + 3] > 80) {
          if (top < 0) top = y;
          if (y < bodyRow) { const dx = Math.abs((x + 0.5) / PX - MX); if (dx > hw) hw = dx; }
        }
      }
    }
    if (top >= 0) b = { top: Math.max(-84, Math.min(-18, top / PX - MY)), hw: Math.max(9, Math.min(22, hw)) };
  } catch (e) { /* keep the fallback */ }
  BOX.set(key, b);
  return b;
};

// ---- the hall itself, scaled about its base ----------------------------------
// Each scale is rounded so the hall's edges move by whole art pixels; at
// (1, 1) it is simply painted.
const paintScaled = (ctx, paint, f, bx, by, sx, sy, hw, hh, dx = 0, dy = 0) => {
  const W2 = hw * 2 * PX, H2 = hh * PX;
  const ex = Math.round((sx - 1) * W2), ey = Math.round((sy - 1) * H2);
  const ox = sn(dx), oy = sn(dy);
  if (!ex && !ey && !ox && !oy) { paint(f); return; }
  ctx.save();
  ctx.translate(bx + ox, by + oy);
  ctx.scale(1 + ex / W2, 1 + ey / H2);
  ctx.translate(-bx, -by);
  paint(f);
  ctx.restore();
};
// the same hall added over itself in light: it glows in its own colours
const paintGlow = (ctx, paint, f, a, draw = () => paint(f)) => {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = a;
  draw();
  ctx.restore();
};

// ---- timber ----------------------------------------------------------------
// A pole standing on (x, foot), h tall: ink, a lit left edge, the wood.
const pole = (ctx, x, foot, h) => {
  if (h <= 0.5) return;
  rect(ctx, x - 1, foot - h, 2, h + 0.5, INK);
  rect(ctx, x - 0.5, foot - h + 0.5, 0.5, h - 0.5, WOOD_HI);
  rect(ctx, x, foot - h + 0.5, 0.5, h - 0.5, WOOD_LO);
};
// A ledger across from x0 to x1 at y (its middle).
const ledger = (ctx, x0, x1, y, thick = false) => {
  const h = thick ? 3 : 2;
  rect(ctx, x0 - 0.5, y - h / 2, x1 - x0 + 1, h, INK);
  rect(ctx, x0, y - h / 2 + 0.5, x1 - x0, 0.5, WOOD_HI);
  rect(ctx, x0, y - h / 2 + 1, x1 - x0, h - 1.5, thick ? WOOD : WOOD_LO);
  if (thick) for (let xx = x0 + 3; xx < x1 - 1; xx += 5) rect(ctx, xx, y - 1, 0.5, 2, WOOD_LO);   // plank joints
};
// A diagonal brace, stepped in art pixels.
const brace = (ctx, x0, y0, x1, y1) => {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) * PX));
  ctx.fillStyle = INK;
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.fillRect(sn(x0 + (x1 - x0) * u) - 0.75, sn(y0 + (y1 - y0) * u) - 0.75, 1.5, 1.5); }
  ctx.fillStyle = WOOD;
  for (let i = 1; i < n; i++) { const u = i / n; ctx.fillRect(sn(x0 + (x1 - x0) * u) - 0.25, sn(y0 + (y1 - y0) * u) - 0.25, 0.5, 0.5); }
};

// ---- dust puffs --------------------------------------------------------------
// Pixel clouds of three lumps, baked per size and frame; later frames thin
// out to a dither and go.
const PUFFS = new Map();
const puffSprite = (r, f) => {
  const key = `${r}|${f}`;
  let cv = PUFFS.get(key);
  if (cv) return cv;
  const n = Math.ceil((2 * r + 2) * PX);
  cv = document.createElement("canvas"); cv.width = n; cv.height = n;
  const c = cv.getContext("2d"), c0 = n / 2, R = r * PX * (0.7 + f * 0.12);
  const lumps = [[-0.35, 0.15, 0.62], [0.3, 0.2, 0.55], [0, -0.22, 0.6]];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let inside = false, lit = 0;
    for (const [lx, ly, lr] of lumps) {
      const dx = (x + 0.5 - c0) / R - lx, dy = (y + 0.5 - c0) / R - ly, d = Math.hypot(dx, dy) / lr;
      if (d < 1) { inside = true; lit = Math.max(lit, -dx - dy * 1.2); }
    }
    if (!inside) continue;
    if (f >= 2 && hash(x * 7 + f, y * 13) < (f - 1) * 0.3) continue;   // thinning away
    c.fillStyle = lit > 0.35 ? DUST_HI : lit > -0.3 ? DUST : DUST_LO;
    c.fillRect(x, y, 1, 1);
  }
  PUFFS.set(key, cv);
  return cv;
};
// a puff at (x, y) over its life u (0..1)
const puff = (ctx, x, y, r, u) => {
  if (u <= 0 || u >= 1) return;
  const cv = puffSprite(r, Math.min(3, Math.floor(u * 4))), s = cv.width / PX;
  ctx.drawImage(cv, sn(x - s / 2), sn(y - s / 2 - u * 3), s, s);
};

// ---- chips -----------------------------------------------------------------
// n bits of wood and stone thrown up out of (x0, y0) at p0, arcing down to
// the ground line and lying a moment. Deterministic per hall and burst.
const chips = (ctx, seed, n, p0, p, dur, x0, y0, spread, ground, o = {}) => {
  const age = (p - p0) * dur;
  if (age < 0 || age > (o.life || 0.34)) return;
  const up = o.up ?? 1, cols = o.cols || [WOOD_HI, WOOD, STONE, STONE_HI];
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed, i * 3 + 1), h2 = hash(seed, i * 3 + 2), h3 = hash(seed, i * 3 + 3);
    const side = h3 < 0.5 ? -1 : 1;
    const vx = side * (18 + h1 * 40) * (o.wide || 1), vy = -(30 + h2 * 55) * up;
    const x = x0 + (h3 - 0.5) * spread + vx * age;
    let y = y0 + vy * age + 0.5 * 320 * age * age;
    if (y > ground) y = ground;
    const s = h2 > 0.6 ? 1 : 0.5;
    // a chip is its colour with a dark lower-right edge, not an inked
    // square: at this size a full outline reads as a black speck
    rect(ctx, x, y, s + 0.5, s + 0.5, CHIP_LO);
    rect(ctx, x, y, s, s, cols[i % cols.length]);
  }
};

// ---- light -------------------------------------------------------------------
// A four-point twinkle, arms s art pixels long.
const twinkle = (ctx, x, y, s, col = GOLD_HI) => {
  if (s < 1) return;
  const a = 1 / PX, L = s * a;
  x = sn(x); y = sn(y);
  ctx.fillStyle = col;
  ctx.fillRect(x - L, y, 2 * L + a, a);
  ctx.fillRect(x, y - L, a, 2 * L + a);
  ctx.fillStyle = CREAM;
  ctx.fillRect(x - a, y, 3 * a, a);
  ctx.fillRect(x, y - a, a, 3 * a);
};
// A column of gold light from the ground (yb) up past ytop, half-width w,
// in stepped bands of gold wash, with a stepped pool of light on the ground.
const COLUMN = [[1, [248, 196, 84], 0.2], [0.64, [255, 216, 120], 0.26], [0.3, [255, 240, 190], 0.42]];
const column = (ctx, x, yb, ytop, w, a) => {
  if (w < 0.5 || a <= 0.02) return;
  ctx.save();
  // the pool on the ground, row by row, in two steps
  const rx = w * 1.8, ry = w * 0.7;
  for (let yy = -ry; yy <= ry; yy += 1 / PX) {
    const k = Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)), hw = rx * k;
    ctx.fillStyle = `rgba(255,214,120,${(k > 0.55 ? 0.2 : 0.11) * a})`;
    ctx.fillRect(sn(x - hw), sn(yb + yy), sn(2 * hw), 1 / PX);
  }
  COLUMN.forEach(([k, [r, g, b], al]) => {
    const hw = Math.max(0.5, sn(w * k));
    ctx.fillStyle = `rgba(${r},${g},${b},${al * a})`;
    ctx.fillRect(sn(x - hw), sn(ytop), hw * 2, sn(yb - ytop));
    // the top frays upward in three fading steps
    for (let n = 1; n <= 3; n++) {
      ctx.fillStyle = `rgba(${r},${g},${b},${al * a * (1 - n / 4)})`;
      const hh = Math.max(0.5, sn(hw * (1 - n * 0.22)));
      ctx.fillRect(sn(x - hh), sn(ytop - n * 5), hh * 2, 5);
    }
  });
  ctx.restore();
};

// ======================================================================
// BUILD: the crew runs out of the castle gate (builders.js) to a staked-out
// plot, the scaffold goes up, the hall is set piece by piece (buildcut.js)
// under a working platform that climbs with the courses, the fittings go
// in, the person is put in place last, and the scaffold comes down.
//
// Everything keys off one plan per raise, buildPlan(t): the clock (absolute
// g.time moments), the scaffold's lines, the platform's height at any time,
// and where each builder stands. builders.js reads the same plan, so every
// mallet stroke lands with a piece.

export const BUILD = {
  run: 1100,                   // the crew's sprint, world units per game second: a timelapse dash
  runMin: 0.3, runMax: 0.62,   // one leg of the run, game seconds, however far the plot is
  stagger: 0.06,               // one builder after the next
  up: 0.24,                    // the scaffold going up
  lay: 1.2,                    // setting the pieces, however many there are
  drop: 0.13,                  // a piece's swing down onto its bed
  person: 0.22,                // the person's hop into place
  down: 0.36,                  // the scaffold coming down
};

const PLANS = new WeakMap();
export const buildPlan = (t) => {
  const r = t && t.raised;
  if (!r || r.how !== "build") return null;
  let P = PLANS.get(r);
  if (P) return P;
  const def = TOWERS[t.kind] || {};
  const box = measure(t, t);
  const x = sn(t.x), by = sn(t.y + 3), topY = t.y + box.top;
  const narrow = !!def.roadClear, water = !!def.water;
  const rx = narrow ? 10 : Math.min(18, Math.max(11, box.hw + 1)), ry = narrow ? 6 : 8;
  const fF = sn(by + ry * 0.7), fB = sn(by - ry * 0.7);           // front / back pole feet
  const xl = sn(x - rx), xr = sn(x + rx);
  // the gate: the road's last point, just inside the arch
  const last = PTS[PTS.length - 1] || [756, t.y];
  const gate = { x: last[0] - 4, y: last[1] };
  const run = Math.min(BUILD.runMax, Math.max(BUILD.runMin, Math.hypot(gate.x - x, gate.y - fF) / BUILD.run));
  const at = r.at, arrive = at + run;
  const lay = BUILD.lay, lay0 = arrive + 0.14, lay1 = lay0 + lay;
  const personAt = lay1 + 0.06 + BUILD.person;
  const down0 = personAt + 0.12, down1 = down0 + BUILD.down;
  const low = fF - 6;
  P = {
    at, gate, run, arrive, lay0, lay1, personAt, down0, down1,
    end: down1 + 0.02,
    leave: down0 + 0.04,                                  // the ground crew sets off home
    hop: [down0, down0 + 0.2],                            // the mason jumps down off the platform
    home: down0 + 0.2 + run + BUILD.stagger * 2 + 0.05,   // the last of them is back through the gate
    stagger: BUILD.stagger,
    x, by, fF, fB, xl, xr, ladder: xr + 5, water, narrow, box, topY, low,
    // the pieces are cut from the hall as it will look the moment they
    // hand over to the live hall (lay1 + 0.02), the person as at their
    // landing — a few milliseconds a frame while the crew runs (pumpCut)
    job: cutSteps(t, lay1 + 0.02, personAt),
    cut: null, pieces: [], lands: [],
    pf: [[arrive, low]],
    platformY: (time) => sn(keys(time, P.pf)),            // the platform's top face, world y
    posts: [
      { role: "mason", x: xr + 5, dir: -1 },                         // up on the platform at the ladder's head
      { role: "hod", x: xr + 12, y: sn(t.y + 15.5), dir: -1 },       // at the ladder's foot, handing up
      { role: "setter", x: xl - 5, y: sn(t.y + 16.5), dir: 1 },      // at the front left corner, by the pile
    ],
  };
  PLANS.set(r, P);
  return P;
};

// The cut's work is pumped a few milliseconds a frame from drawRaising (the
// frame of the tap itself stays light); whatever is left runs at once if
// the pieces are due. Then the pieces get their moments and the platform
// its climb.
const PUMP_MS = 4;
export const pumpCut = (P, time) => {
  if (!P || !P.job || time < P.at + 0.03 && time < P.lay0 - 0.03) return;
  const t0 = performance.now(), must = time >= P.lay0 - 0.03;
  try {
    for (;;) {
      const r = P.job.next();
      if (r.done) { P.job = null; finishCut(P, r.value); return; }
      if (!must && performance.now() - t0 > PUMP_MS) return;
    }
  } catch (err) {
    P.job = null;
    finishCut(P, null);
    if (!WARNED) { WARNED = true; console.error("hall cut failed", err); }
  }
};
const finishCut = (P, cut) => {
  P.cut = cut;
  const pieces = P.pieces = cut ? cut.pieces : [];
  const nW = pieces.filter((p) => p.kind === "wall").length, nD = pieces.length - nW;
  // when each piece lands: the walls through the first two-thirds, then the
  // fittings — all in, glints done, a beat before the hand-over at lay1
  const { lay0, lay1 } = P, done = lay1 - 0.1, wEnd = nD ? lay0 + BUILD.lay * 0.66 : done;
  const spread = (i, n, a, b) => (n > 1 ? a + (b - a) * (i / (n - 1)) : b);
  P.lands = pieces.map((p, i) => (i < nW ? spread(i, nW, lay0 + BUILD.drop, wEnd) : spread(i - nW, nD, wEnd + 0.06, done)));
  // the working platform rises with the courses — just under the highest
  // piece set so far, reached as each one lands — and tops out at the
  // body's broad top (a spire's finial or a flagpole is not worth one)
  let broad = 0, ceil = Infinity;
  for (const p of pieces) if (p.kind === "wall") broad = Math.max(broad, p.w);
  for (const p of pieces) if (p.kind === "wall" && p.w >= broad * 0.6) ceil = Math.min(ceil, p.top);
  if (!Number.isFinite(ceil)) ceil = P.topY;
  const high = Math.min(P.low, sn(ceil + 5));
  const pf = [[P.arrive, P.low]];
  let reach = Infinity;
  pieces.forEach((p, i) => {
    if (p.kind !== "wall") return;
    reach = Math.min(reach, p.top);
    const tg = Math.max(high, Math.min(P.low, reach + 6)), t0 = P.lands[i] + 0.06;
    if (t0 > pf[pf.length - 1][0]) pf.push([t0, tg]);
  });
  if (!cut) pf.push([lay0, P.low], [lay1, high]);                 // no pieces: it climbs steadily
  P.pf = pf;
};

// how long a raise lasts, game seconds (a build's depends on its plan)
export const raiseSecs = (t) => {
  const r = t && t.raised;
  if (!r) return 0;
  if (r.how === "build") { const P = typeof document === "undefined" ? null : buildPlan(t); return P ? P.end - r.at : RAISE_SECS.build; }
  return RAISE_SECS[r.how] || 0.6;
};
// the rank pips wait for the person, like everything else about a new hall
export const raiseHidesPips = (t, time) => {
  const r = t && t.raised;
  if (!r || r.how !== "build" || typeof document === "undefined") return false;
  const P = buildPlan(t);
  return !!P && time >= r.at && time < P.personAt;
};

// ---- the plot, before the crew: four stakes and a string round it ----
const stakes = (ctx, P, time) => {
  const u = seg(time, P.at, P.at + 0.1);
  if (u <= 0 || time >= P.arrive + 0.04) return;
  const h = Math.max(1, sn(4 * eo(u)));
  if (u >= 1) {
    const yb = P.fB - 3, yf = P.fF - 3;
    ctx.fillStyle = DUST_HI;
    ctx.fillRect(P.xl, yb, P.xr - P.xl, 0.5);
    ctx.fillRect(P.xl, yf, P.xr - P.xl, 0.5);
    ctx.fillRect(P.xl, yb, 0.5, yf - yb);
    ctx.fillRect(P.xr, yb, 0.5, yf - yb);
  }
  for (const [sx, sy] of [[P.xl, P.fB], [P.xr, P.fB], [P.xl, P.fF], [P.xr, P.fF]]) {
    rect(ctx, sx - 0.5, sy - h, 1.5, h + 0.5, INK);
    rect(ctx, sx, sy - h + 0.5, 0.5, h - 0.5, WOOD_HI);
    if (P.water) rect(ctx, sx - 1.5, sy, 3.5, 0.5, FOAM);
  }
};

// ---- the loads the crew brought: planks and dressed stone, used up as the
// pieces go in ----
const pile = (ctx, P, time) => {
  if (P.water || time < P.arrive + P.stagger * 2 || time >= P.down0) return;
  let used = 0;
  for (const L of P.lands) if (L <= time) used++;
  const left = Math.ceil(5 * (1 - used / Math.max(1, P.lands.length)));
  if (left <= 0) return;
  const px = P.xl - 12, py = P.fF + 4;
  ctx.fillStyle = "rgba(42,28,44,0.28)";
  ctx.fillRect(sn(px - 5), sn(py), 11, 1);
  const plank = (x, y) => { rect(ctx, x - 5, y - 2, 10, 2.5, INK); rect(ctx, x - 4.5, y - 1.5, 9, 0.5, WOOD_HI); rect(ctx, x - 4.5, y - 1, 9, 1, WOOD); };
  const block = (x, y) => { rect(ctx, x - 2, y - 3, 4.5, 3.5, INK); rect(ctx, x - 1.5, y - 2.5, 3.5, 2.5, STONE); rect(ctx, x - 1.5, y - 2.5, 3.5, 0.5, STONE_HI); };
  const items = [() => plank(px, py), () => plank(px + 0.5, py - 2), () => block(px - 2.5, py - 4), () => block(px + 2, py - 4), () => plank(px, py - 6.5)];
  for (let i = 0; i < left; i++) items[i]();
};

// ---- the scaffold: four poles, ledgers every LEDGER (the front keeps only
// its lowest, with the brace, so the hall can be watched going up), the
// working platform, and a ladder up the right-hand side. It grows with the
// platform; it comes down plank by plank — the platform first, then the
// ledgers top-down, each dropping to the ground — and the poles sink away.
const LEDGER = 15;
const FALL = 0.13;                                  // a plank's drop to the ground
const fallen = (ctx, x0, x1, y, ground, a, thick) => {
  if (a < 0) return;
  if (a < FALL) { ledger(ctx, x0, x1, sn(y + (ground - 1.5 - y) * (a / FALL) ** 2), thick); return; }
  puff(ctx, (x0 + x1) / 2, ground + 1, thick ? 4 : 3, seg(a, FALL, FALL + 0.2));
};
const scaffold = (ctx, P, time, front) => {
  if (time < P.arrive || time >= P.down1) return;
  const D = BUILD.down;
  const yP = P.platformY(Math.min(time, P.down0));
  const H = P.fF - yP + 5;                                          // pole height, feet to tip
  const foot = front ? P.fF : P.fB;
  const nL = Math.max(0, Math.floor((H - 4) / LEDGER));
  // the take-down: the platform lets go at down0, the ledgers top-down after
  const letGo = (k) => P.down0 + 0.03 + ((nL - k) / Math.max(1, nL)) * 0.1;    // k = 1 bottom … nL top
  const sink = seg(time, P.down0 + 0.16, P.down1) ** 2 * (H + 3);
  const upL = seg(time, P.arrive + 0.04, P.arrive + 0.2);             // the later pole of each pair rising
  ctx.save();
  ctx.beginPath(); ctx.rect(P.x - 50, foot - 140, 100, 140.5); ctx.clip();
  ctx.translate(0, sn(sink));
  const poles = front ? [[P.xl, 2], [P.xr, 3]] : [[P.xl, 0], [P.xr, 1]];
  for (const [px, i] of poles) {
    const u = seg(time, P.arrive + i * 0.04, P.arrive + i * 0.04 + 0.16);
    pole(ctx, px, foot, sn(H * Math.min(1, backOut(u, 1.2))));
    if (P.water && !sink) { rect(ctx, px - 2.5, foot, 1.5, 0.5, FOAM); rect(ctx, px + 1.5, foot, 1.5, 0.5, FOAM); }
  }
  const risen = H * Math.min(1, backOut(upL, 1.2));
  for (let k = 1; k <= nL; k++) {
    if (front && k > 1) break;
    if (risen < k * LEDGER + 2 || time >= letGo(k)) continue;
    ledger(ctx, P.xl, P.xr, foot - k * LEDGER);
    if (front) brace(ctx, P.xl + 1, foot - 1, P.xr - 1, foot - LEDGER + 1);
  }
  // the working platform (and its back ledger): set on once the poles are up
  const pu = seg(time, P.arrive + 0.16, P.arrive + 0.24);
  if (pu > 0 && time < P.down0) {
    const dy = -3 * (1 - pu) ** 2;
    if (front) ledger(ctx, P.xl - 2, P.xr + 8, sn(yP + 1.5 + dy), true);
    else ledger(ctx, P.xl, P.xr, sn(yP + 1.5 + dy - (P.fF - P.fB)));
  }
  ctx.restore();
  // what has let go drops to the ground (not sinking with the poles)
  if (time >= P.down0) {
    if (front) fallen(ctx, P.xl - 2, P.xr + 8, yP + 1.5, P.fF, time - P.down0, true);
    else fallen(ctx, P.xl, P.xr, yP + 1.5 - (P.fF - P.fB), P.fB, time - P.down0, false);
    for (let k = 1; k <= nL; k++) {
      if (front && k > 1) break;
      fallen(ctx, P.xl, P.xr, foot - k * LEDGER, foot, time - letGo(k), false);
    }
  }
  // the ladder, up the right-hand side to the platform; it is carried off
  // with the platform (it shortens to the ground)
  if (front && time >= P.arrive + 0.08 && time < P.down0 + 0.08) {
    const lx = P.ladder;
    const top = time < P.down0 ? yP - 2 : P.fF - (P.fF - yP + 2) * (1 - seg(time, P.down0, P.down0 + 0.08));
    const rise = seg(time, P.arrive + 0.08, P.arrive + 0.18);
    const tp = sn(P.fF - (P.fF - top) * rise);
    if (P.fF - tp > 2) {
      rect(ctx, lx - 2.5, tp, 1.5, P.fF - tp + 0.5, INK); rect(ctx, lx + 1.5, tp, 1.5, P.fF - tp + 0.5, INK);
      rect(ctx, lx - 2, tp + 0.5, 0.5, P.fF - tp - 0.5, WOOD_HI); rect(ctx, lx + 2, tp + 0.5, 0.5, P.fF - tp - 0.5, WOOD);
      for (let yy = P.fF - 2; yy > tp + 1; yy -= 3) { rect(ctx, lx - 1, yy - 0.5, 2.5, 1, INK); rect(ctx, lx - 1, yy - 0.5, 2.5, 0.5, WOOD); }
    }
  }
};

// ---- the hall, piece by piece ----
const drawPiece = (ctx, pc, dy = 0) => ctx.drawImage(pc.cv, pc.x, pc.y + sn(dy), pc.w, pc.h);
const setPieces = (ctx, P, time, seed) => {
  const moving = [];
  P.pieces.forEach((pc, i) => {
    const L = P.lands[i];
    if (pc.kind === "fit") {
      // fittings are set into their openings: in, with a glint
      if (time < L) return;
      drawPiece(ctx, pc);
      const g = time - L;
      if (g < 0.08) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = g < 0.04 ? 0.55 : 0.28; drawPiece(ctx, pc); ctx.restore(); }
      return;
    }
    if (time < L - BUILD.drop) return;
    if (time < L) { moving.push([pc, (time - (L - BUILD.drop)) / BUILD.drop]); return; }
    drawPiece(ctx, pc);
  });
  // pieces on their way down swing in fast and settle onto their beds
  for (const [pc, u] of moving) drawPiece(ctx, pc, -(pc.kind === "wall" ? 6 : 5) * (1 - u) ** 3);
  // a little dust off the bed where each wall piece is set
  P.pieces.forEach((pc, i) => {
    const L = P.lands[i], a = time - L;
    if (pc.kind !== "wall" || a < 0 || a > 0.16 || pc.w < 6) return;
    const k = Math.floor(a / 0.04), spread = 1 + k * 1.5;
    ctx.fillStyle = k < 2 ? DUST_HI : DUST;
    for (const side of [-1, 1]) {
      const ex = sn(pc.cx + side * (pc.w / 2 + spread)), ey = sn(pc.bottom - 0.5 - (k > 1 ? 0.5 : 0));
      ctx.fillRect(ex, ey, 0.5, 0.5);
      if (k < 3) ctx.fillRect(sn(ex - side * 1), sn(ey - 0.5), 0.5, 0.5);
    }
    if (i % 3 === 0) chips(ctx, seed + i, 2, L, time, 1, pc.cx, pc.bottom - 1, pc.w * 0.6, Math.max(pc.bottom + 2, P.fF + 2), { life: 0.2, wide: 0.5, up: 0.6 });
  });
};

// the person: the folk layer of the cut, hopping down into place
const person = (ctx, P, time) => {
  const c = P.cut && P.cut.crew;
  if (!c) return;
  const u = seg(time, P.personAt - BUILD.person, P.personAt);
  if (u <= 0) return;
  const dy = keys(u, [[0, -11], [0.72, 0], [0.86, -1.5], [1, 0]]);
  ctx.drawImage(c.cv, c.x, c.y + sn(dy), c.w, c.h);
};

const raiseBuild = (ctx, t, P, time, paint) => {
  const seed = t.id * 31 + 7;
  stakes(ctx, P, time);
  scaffold(ctx, P, time, false);
  // the hall: pieces from the cut until they are all in, then the live hall
  // (its people held back) while the person comes, then all of it
  if (time >= P.personAt) paint(t);
  else if (time >= P.lay1 + 0.02) { paint({ ...t, noFolk: true }); person(ctx, P, time); }
  else if (P.cut) setPieces(ctx, P, time, seed);
  else if (time >= P.lay0) {
    // no cut to be had: the hall is revealed under the climbing platform
    ctx.save();
    ctx.beginPath(); ctx.rect(P.x - 60, P.platformY(time), 120, 200); ctx.clip();
    paint({ ...t, noFolk: true });
    ctx.restore();
  }
  pile(ctx, P, time);
  scaffold(ctx, P, time, true);
  // dust where the poles bite, and again as they go down
  puff(ctx, P.xl - 1, P.fF + 1, 3, seg(time, P.arrive, P.arrive + 0.3));
  puff(ctx, P.xr + 1, P.fF + 1, 3, seg(time, P.arrive + 0.04, P.arrive + 0.34));
  puff(ctx, P.xl - 2, P.fF + 1, 3, seg(time, P.down0 + 0.16, P.down1));
  puff(ctx, P.xr + 2, P.fF + 1, 3, seg(time, P.down0 + 0.19, P.down1));
  // a few splinters as the platform comes off
  chips(ctx, seed + 40, 4, P.down0, time, 1, P.x, P.platformY(P.down0) + 3, (P.xr - P.xl) * 0.9, P.fF + 3, { life: 0.26, cols: [WOOD_HI, WOOD, WOOD_LO] });
  // the person lands: a glint over them
  const c = P.cut && P.cut.crew;
  if (c) {
    const tu = seg(time, P.personAt, P.personAt + 0.28);
    if (tu > 0 && tu < 1) twinkle(ctx, c.cx + 2, c.top + 1, Math.round(Math.sin(tu * Math.PI) * 4), CREAM);
  }
  // a Master Build is handed over finished: a glint of gold on its crown
  if (t.branch) {
    const top = t.y + P.box.top, hh = P.by - top;
    for (const [a, b, fx, fy] of [[0.0, 0.22, 0.3, 0], [0.08, 0.3, -0.5, 0.3]]) {
      const tu = seg(time, P.down0 + a, P.down0 + b);
      if (tu > 0 && tu < 1) twinkle(ctx, P.x + fx * P.box.hw, top + 3 + fy * hh, Math.round(Math.sin(tu * Math.PI) * 4));
    }
  }
};

// ======================================================================
// LEVEL: a scaffold and a hammer round the old form, then the new pops.
const raiseLevel = (ctx, t, p, dur, time, paint) => {
  const def = TOWERS[t.kind] || {};
  const prev = { ...t, ...(t.raised.prev || {}) };
  const bo = measure(t, prev), bn = measure(t, t);
  const x = sn(t.x), by = sn(t.y + 3);
  const water = !!def.water, narrow = !!def.roadClear;
  const rx = narrow ? 10 : Math.min(18, Math.max(11, bo.hw + 1)), fF = sn(by + (narrow ? 4 : 5.5));
  const xl = sn(x - rx), xr = sn(x + rx);
  const SW = 0.4;                                                   // the switch to the new form
  const s = t.id * 23 + 11;
  // the scaffold: two front poles and a ledger, springing up; sinks at the switch
  const hS = Math.min(-bo.top * 0.55, 28) * eo(seg(p, 0, 0.16));
  const sink = seg(p, SW, SW + 0.14) ** 2 * (hS + 3);
  const knocks = [0.15, 0.29];
  const knockAt = knocks.find((k) => p >= k && p < k + 0.05);
  const scaffold = () => {
    if (water || hS < 1 || sink >= hS + 2) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, fF - 80, 80, 80.5); ctx.clip();
    ctx.translate(0, sn(sink));
    pole(ctx, xl, fF, hS); pole(ctx, xr, fF, hS);
    if (hS > 8) ledger(ctx, xl - 1, xr + 1, fF - hS + 3, true);
    if (hS > 12) brace(ctx, xl + 1, fF - 1, xr - 1, fF - hS + 5);
    ctx.restore();
  };
  if (p < SW) {
    paintScaled(ctx, paint, prev, x, by, 1, 1, bo.hw, by - (t.y + bo.top), 0, knockAt !== undefined ? 0.5 : 0);
    scaffold();
    // the hammer, at the right-hand pole's top, knocking twice
    const hx = water ? x + bo.hw + 3 : xr + 3, hy = water ? sn(by - (by - t.y - bo.top) * 0.45) : fF - hS + 1;
    if (hS > 6) hammer(ctx, hx, hy, knockAt !== undefined ? 1 : p < 0.1 ? 0.5 : 0);
    for (const k of knocks) {
      if (p >= k && p < k + 0.07) twinkle(ctx, hx - 4, hy + 2, p < k + 0.035 ? 3 : 2, CREAM);
      chips(ctx, s + k * 100, 3, k, p, dur, hx - 4, hy + 2, 2, fF + 3, { life: 0.2, wide: 0.7 });
    }
  } else {
    const sy = keys(p, [[SW, 0.86], [SW + 0.1, 1.1], [SW + 0.22, 0.95], [SW + 0.34, 1.03], [SW + 0.44, 1]]);
    const sx = keys(p, [[SW, 1.1], [SW + 0.1, 0.94], [SW + 0.22, 1.04], [SW + 0.34, 0.99], [SW + 0.44, 1]]);
    paintScaled(ctx, paint, t, x, by, sx, sy, bn.hw, by - (t.y + bn.top));
    scaffold();
    chips(ctx, s + 5, 7, SW, p, dur, x, by - 6, rx * 1.6, fF + 3, { life: 0.2, wide: 1.2 });
    if (!water) { puff(ctx, xl - 1, fF + 1, 3, seg(p, SW, SW + 0.4)); puff(ctx, xr + 1, fF + 1, 3, seg(p, SW + 0.03, SW + 0.43)); }
    // a sparkle on the new top, and one lower on the far side
    const topY = t.y + bn.top;
    const tw1 = seg(p, SW + 0.12, SW + 0.42), tw2 = seg(p, SW + 0.22, SW + 0.52);
    if (tw1 > 0 && tw1 < 1) twinkle(ctx, x + bn.hw * 0.35, topY + 3, Math.round(Math.sin(tw1 * Math.PI) * 4));
    if (tw2 > 0 && tw2 < 1) twinkle(ctx, x - bn.hw * 0.6, topY + (by - topY) * 0.4, Math.round(Math.sin(tw2 * Math.PI) * 3));
  }
};
// A mallet in art pixels, its head at (x, y) and the handle running out to
// the right: pose 0 raised, 0.5 coming down, 1 struck.
const hammer = (ctx, x, y, pose) => {
  const ang = pose >= 1 ? -0.2 : pose > 0 ? 0.5 : 1.05;         // the head's lift above the grip
  const ca = Math.cos(ang), sa = Math.sin(ang), a = 1 / PX;
  // swinging about the grip: the grip stays put, the head arcs
  const gx = x + 8, gy = y + 1.5;
  const hx = gx - ca * 8, hy = gy - sa * 8;
  const pts = [];
  for (let i = 0; i <= 15; i++) pts.push([gx - ca * i * a, gy - sa * i * a, i < 5 ? WOOD_LO : WOOD]);
  for (let i = -4; i <= 4; i++) for (let j = -2; j <= 3; j++) {
    pts.push([hx - ca * j * a - sa * i * a, hy - sa * j * a + ca * i * a, i < -2 ? "#dde0e6" : i > 2 ? "#6a6e78" : "#a4a8b2"]);
  }
  ctx.fillStyle = INK;
  for (const [px, py] of pts) ctx.fillRect(sn(px) - a, sn(py) - a, 3 * a, 3 * a);
  for (const [px, py, c] of pts) { ctx.fillStyle = c; ctx.fillRect(sn(px), sn(py), a, a); }
};

// ======================================================================
// BRANCH / ASCEND: a column of gold light takes the old form; the new one
// shoots up out of it and a ring of gold motes rolls out round its feet.
const raiseGrand = (ctx, t, p, dur, time, paint) => {
  const grand = t.raised.how === "ascend";
  const prev = { ...t, ...(t.raised.prev || {}) };
  const bo = measure(t, prev), bn = measure(t, t);
  const x = sn(t.x), by = sn(t.y + 3), hhN = by - (t.y + bn.top), hhO = by - (t.y + bo.top);
  const SW = grand ? 0.44 : 0.42;
  const s = t.id * 29 + (grand ? 5 : 1);
  const W0 = grand ? 15 : 12;
  const colTop0 = t.y + Math.min(bo.top, bn.top) - (grand ? 22 : 14);
  // the column: grows round the old form, then narrows away upward
  const cw = p < SW ? W0 * eo(seg(p, 0, SW * 0.7)) : W0 * (1 - eo(seg(p, SW, SW + 0.34)));
  const colTop = p < SW ? colTop0 : colTop0 - 40 * eo(seg(p, SW, SW + 0.34));
  const colA = p < SW ? 0.7 + 0.3 * seg(p, SW * 0.5, SW) : 1;
  // the ring of motes: behind the hall first, the front half after it
  const motes = (front) => {
    const mu = seg(p, SW, grand ? 0.95 : 0.93);
    if (mu <= 0 || mu >= 1) return;
    const n = grand ? 14 : 10, r = 8 + (grand ? 26 : 21) * eo(mu), rot = mu * 1.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot, sa = Math.sin(a);
      if ((sa > 0) !== front) continue;
      const mx = x + Math.cos(a) * r, my = by + sa * r * 0.45 - mu * (6 + hash(s, i) * 10);
      if (mu > 0.7 && hash(s, i + 40 + Math.floor(mu * 12)) < (mu - 0.7) * 3) continue;
      const tw = (i + Math.floor(mu * 10)) % 4 === 0;
      if (tw) twinkle(ctx, mx, my, 2);
      else { rect(ctx, mx - 0.5, my - 0.5, 1.5, 1.5, "#8a6420"); rect(ctx, mx - 0.5, my - 0.5, 1, 1, i % 3 ? GOLD : GOLD_HI); }
    }
  };
  // light rising in the column
  const risers = () => {
    if (cw < 2) return;
    const n = grand ? 7 : 5, span = by - colTop;
    for (let i = 0; i < n; i++) {
      const k = ((time * (grand ? 70 : 55) + hash(s, i + 70) * span) % span);
      const mx = x + (hash(s, i + 80) - 0.5) * cw * 1.2, my = by - k;
      rect(ctx, mx, my, 0.5, i % 2 ? 1 : 1.5, i % 3 ? GOLD_HI : CREAM);
    }
  };
  motes(false);
  if (p < SW) {
    // the old form trembles and brightens in the light
    const shake = p > SW * 0.4 ? (Math.floor(time * 40) % 2 ? 0.5 : -0.5) : 0;
    const draw = () => paintScaled(ctx, paint, prev, x, by, 1, 1, bo.hw, hhO, shake, 0);
    draw();
    const g = Math.floor(seg(p, SW * 0.25, SW) * 4) / 4 * (grand ? 0.34 : 0.28);
    paintGlow(ctx, paint, prev, g + (Math.floor(time * 24) % 2 ? 0.06 : 0), draw);
  } else {
    // the new form shoots up out of it and bounces, glowing as it comes
    const big = grand ? 1.22 : 1.16;
    const sy = keys(p, [[SW, 0.3], [SW + 0.12, big], [SW + 0.22, 0.91], [SW + 0.32, 1.05], [SW + 0.42, 0.985], [SW + 0.48, 1]]);
    const sx = keys(p, [[SW, 0.7], [SW + 0.12, 0.9], [SW + 0.22, 1.08], [SW + 0.32, 0.98], [SW + 0.42, 1.01], [SW + 0.48, 1]]);
    const draw = () => paintScaled(ctx, paint, t, x, by, sx, sy, bn.hw, hhN);
    draw();
    paintGlow(ctx, paint, t, Math.floor((1 - seg(p, SW, SW + 0.3)) * 4) / 4 * 0.36, draw);
  }
  column(ctx, x, by + 4, colTop, cw, colA);
  risers();
  motes(true);
  // sparkles on the new crown
  if (p > SW) {
    const topY = t.y + bn.top;
    const sp = [[0.1, 0.3, 0, 0], [0.18, 0.4, -0.55, 0.25], [0.26, 0.46, 0.5, 0.4]];
    if (grand) sp.push([0.14, 0.4, 0.8, 0.1], [0.3, 0.5, -0.3, 0.55]);
    for (const [a, b, fx, fy] of sp) {
      const u = seg(p, SW + a, SW + b);
      if (u > 0 && u < 1) twinkle(ctx, x + fx * bn.hw, topY + 2 + fy * hhN, Math.round(Math.sin(u * Math.PI) * (grand ? 5 : 4)));
    }
  }
};

// ======================================================================
let WARNED = false;
export const drawRaising = (ctx, t, time, paint) => {
  const r = t.raised;
  if (!r || typeof document === "undefined") { paint(t); return; }
  if (r.how === "build") {
    // the build ends on the plain hall: its scaffold is gone by down1
    ctx.save();
    try {
      const P = buildPlan(t);
      pumpCut(P, time);
      if (!P || time >= P.down1 || time < r.at) paint(t);
      else raiseBuild(ctx, t, P, time, paint);
    } catch (err) {
      if (!WARNED) { WARNED = true; console.error("raise failed", t.kind, err); }
      ctx.restore(); ctx.save();
      paint(t);
    }
    ctx.restore();
    return;
  }
  const dur = RAISE_SECS[r.how] || 0.6;
  const p = cl((time - r.at) / dur);
  // the last moments are the hall itself, so the hand back is seamless
  if (p >= 0.97) { paint(t); return; }
  ctx.save();
  try {
    if (r.how === "level") raiseLevel(ctx, t, p, dur, time, paint);
    else raiseGrand(ctx, t, p, dur, time, paint);
  } catch (err) {
    if (!WARNED) { WARNED = true; console.error("raise failed", t.kind, err); }
    ctx.restore(); ctx.save();
    paint(t);
  }
  ctx.restore();
};
