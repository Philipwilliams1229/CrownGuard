// ============ CAPTAIN HALE'S EFFECTS ON THE BOARD ============
// (see ./index.js for the hooks; engine/heroes/hale.js keeps the state.)
//
//   u.brace      Halberd Sweep: for the three swings he stands in the sweep
//                pose (wind-up, strike, follow-through each beat); `pose` reads
//                it, the arcs themselves are g.haleFx.
//   g.haleFx     one swing: a half-circle of steel light run across the ground
//                in front of him at the halberd's height, head first, thick at
//                its leading edge and thinning behind, with a faint dotted
//                half-ring on the ground showing the reach; a spark star where
//                the blade is at the head of it. Beats alternate fore- and
//                backhand (the arc runs the other way).
//   u.sweep      his passive blow's sweep through every foe he holds: a pale arc
//                of steel before him for a moment after the blow.
//   g.haleLevy   Sound the Levy: the horn's call rings off him (arcs of gold
//                lifting from his head), and beside him a crown-blue pennant
//                is planted while the heart lasts, with a gold ring run out to
//                the reach of it and left lying as a dotted ring.
//
// Pixel art as in rings.js: rows of art pixels snapped to the grid, alpha in a
// few hard steps, no gradients.
import { PX } from "../paint.js";
import { ringPx } from "../fx.js";

const INK = "#241a26", STEEL = ["#fff3d2", "#e0e4ea", "#c4c8d0", "#8a90a0"], OAK = ["#a07a52", "#7a5334"];
const GOLD = ["#fff3d2", "#f0d885", "#d8b34a", "#a8782e"], BLUE = ["#5a7aa8", "#3a5474", "#2a3c58"];
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const sn = (v) => Math.round(v * PX) / PX;

// a line of art pixels `th` units thick, one path, one fill
const pxLine = (ctx, x0, y0, x1, y1, th, col) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * PX));
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.rect(sn(x0 + (x1 - x0) * t - th / 2), sn(y0 + (y1 - y0) * t - th / 2), th, th);
  }
  ctx.fill();
};
// a four-point twinkle: arms `s` long, one art pixel thick, a cream core
const star = (ctx, x, y, s, col, core) => {
  const X = sn(x), Y = sn(y), p = 1 / PX;
  ctx.fillStyle = col;
  ctx.fillRect(X - p / 2, Y - s, p, s * 2);
  ctx.fillRect(X - s, Y - p / 2, s * 2, p);
  if (core) { ctx.fillStyle = core; ctx.fillRect(X - p, Y - p, p * 2, p * 2); }
};

const hale = (g) => g.bands?.find((b) => b.kind === "hero" && b.hero === "hale" && !b.leaving) || null;

// ---- Halberd Sweep ----
const FLAT = 0.7;                 // the ground's squash (engine/heroes/hale.js uses the same)
const SWING_MS = 300;             // the head of the arc crosses the half-circle in this long (real time)
// one swing: `p` runs 0..1 across the half-circle. The ground ring is the
// reach (the engine's own half-ellipse); the trail rides 8 up, at the blade
const drawSwing = (ctx, fx, tms) => {
  const age = (tms - fx.t0) / fx.k;
  if (age < 0 || age > 380) return;
  const p = clamp01(age / SWING_MS), fade = stepA(1 - clamp01((age - SWING_MS) / 80), 3);
  if (fade <= 0) return;
  const f = fx.f, R = fx.r, cx = fx.x, cy = fx.y + 6;
  ctx.save();
  ctx.globalAlpha *= fade;
  // the reach, a dotted half-ring on the ground, there while the swing is
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = STEEL[3];
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) {
    const an = -Math.PI / 2 + (i / 18) * Math.PI;
    ctx.rect(sn(cx + f * Math.cos(an) * R), sn(cy + Math.sin(an) * R * FLAT), 1.5, 1);
  }
  ctx.fill();
  ctx.globalAlpha /= 0.5;
  // the trail: from the far edge round to the near (or back), head first
  const n = 40, head = easeOut(p * 1.1) * 0.98 + 0.02;
  const lit = [];
  let px0 = null, py0 = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (t > head) break;
    const an = -Math.PI / 2 + (fx.flip ? 1 - t : t) * Math.PI;
    const w = 1 + 3.5 * clamp01(1 - (head - t) / 0.45);
    // (the blade's own run is a touch outside the reach, so the edge reads)
    const x = cx + f * Math.cos(an) * R * 0.92, y = cy - 8 + Math.sin(an) * R * FLAT * 0.92;
    if (px0 !== null) pxLine(ctx, px0, py0, x, y, w, head - t < 0.12 ? STEEL[0] : STEEL[1]);
    if (head - t < 0.12) lit.push(x, y);
    px0 = x; py0 = y;
  }
  if (lit.length && p < 1) star(ctx, lit[lit.length - 2], lit[lit.length - 1], 3.5, STEEL[1], STEEL[0]);
  ctx.restore();
};

// ---- his sweep ----
const drawSweep = (ctx, u, tms) => {
  const sw = u.sweep;
  if (!sw) return;
  const age = tms - sw.at;
  if (age < 0 || age > 240) return;
  const p = age / 240, f = u.face || 1;
  const cx = u.x + f * 2, cy = u.y - 1, r = 21 + 5 * p;
  // a crescent before him, from high behind to low in front
  ctx.save();
  ctx.globalAlpha *= stepA(1 - p, 3);
  // (a wide half-moon: his foes stand all round him, so it reaches back
  // too) — a band of steel light thickest at its leading edge, at the
  // halberd's height, thinning to nothing behind
  const a0 = -2.5, a1 = 1.1, n = 44, head = Math.min(1, 0.35 + p * 1.5);
  ctx.beginPath();
  const lit = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, an = a0 + (a1 - a0) * t;
    if (t > head) break;
    const w = 1 + 3 * clamp01(1 - (head - t) / 0.5);       // thick at the edge, thin behind
    const x = cx + f * Math.cos(an) * r, y = cy - 4 + Math.sin(an) * r * 0.55;
    ctx.rect(sn(x - 0.75), sn(y - w / 2), 1.5, Math.max(1 / PX, w));
    if (head - t < 0.18) lit.push(x, y);
  }
  ctx.fillStyle = STEEL[1];
  ctx.fill();
  ctx.fillStyle = STEEL[0];
  ctx.beginPath();
  for (let i = 0; i < lit.length; i += 2) ctx.rect(sn(lit[i] - 0.75), sn(lit[i + 1] - 0.75), 1.5, 1.5);
  ctx.fill();
  ctx.restore();
};

// ---- Sound the Levy ----
// the horn's call: three arcs of gold lift off his head and widen, each a
// beat after the last
const drawHorn = (ctx, lv, tms) => {
  const age = (tms - lv.t0) / lv.k;
  if (age > 900) return;
  const hx = lv.hx, hy = lv.hy - 20;
  ctx.save();
  const a0 = ctx.globalAlpha;
  for (let j = 0; j < 3; j++) {
    const q = (age - j * 150) / 600;
    if (q < 0 || q > 1) continue;
    const r = 4 + 16 * easeOut(q);
    ctx.globalAlpha = a0 * stepA(1 - q, 3);
    ctx.fillStyle = j ? GOLD[2] : GOLD[1];
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const an = -Math.PI * 0.85 + (i / 10) * Math.PI * 0.7;   // the upper arc only
      ctx.rect(sn(hx + Math.cos(an) * r), sn(hy + Math.sin(an) * r * 0.8 - q * 4), 1, 1);
    }
    ctx.fill();
  }
  ctx.restore();
};
const levyFade = (lv, tms) => stepA(Math.min((tms - lv.t0) / (160 * lv.k), (lv.until - tms) / 600, 1));
// the ground: a gold ring run out to the reach of the heart, then a dotted
// ring that stays while it lasts
const levyGround = (ctx, lv, tms) => {
  const A = levyFade(lv, tms);
  if (A <= 0) return;
  const q = (tms - lv.t0) / (420 * lv.k), r = lv.r * easeOut(q);
  ctx.save();
  ctx.globalAlpha *= A;
  if (q < 1) {
    ctx.save();
    ctx.globalAlpha *= stepA(1.3 - q, 3);
    ringPx(ctx, lv.x, lv.y, r, r * 0.55, 2, GOLD[2]);
    ringPx(ctx, lv.x, lv.y, r - 2, (r - 2) * 0.55, 1, GOLD[0]);
    ctx.restore();
  }
  ctx.globalAlpha *= 0.55;
  const n = Math.max(12, Math.round((TAU * r) / 7)), turn = tms / 5000;
  ctx.fillStyle = GOLD[2];
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + turn;
    ctx.rect(sn(lv.x + Math.cos(an) * r - 1), sn(lv.y + Math.sin(an) * r * 0.55 - 0.5), 2, 1);
  }
  ctx.fill();
  ctx.restore();
};
// the banner: an ash pole with a gilt finial and a crown-blue swallowtail
// pennant, a gold band across it; it springs up as the horn sounds and flaps
const levyBanner = (ctx, lv, tms) => {
  const A = levyFade(lv, tms);
  if (A <= 0) return;
  const up = easeOut((tms - lv.t0) / (200 * lv.k)), H = 30 * up;
  const x = lv.x + (lv.bx || 0), base = lv.y + 2, top = base - H;   // (planted a little off his shoulder)
  const flap = Math.floor(tms / 180) % 2;
  ctx.save();
  ctx.globalAlpha *= A;
  // a contact shadow down-right
  ctx.fillStyle = "rgba(36,26,38,0.25)";
  ctx.fillRect(sn(x - 1), sn(base), 5, 1.5);
  // the pole: ink then oak
  ctx.fillStyle = INK; ctx.fillRect(sn(x - 1), sn(top - 1), 2, H + 1.5);
  ctx.fillStyle = OAK[0]; ctx.fillRect(sn(x - 0.5), sn(top), 1, H);
  if (H > 12) {
    // the pennant flies off the pole toward +x (mirrors cleanly: no
    // lettering), a swallowtail: each row of art pixels runs out to the fly,
    // the middle rows cut back by the notch; the tails dip as it flaps
    const py = top + 2, w = 13, h = 8, rows = h * PX, row = 1 / PX;
    const len = (j) => { const m = Math.abs((j + 0.5) / rows - 0.5) * 2; return w - Math.max(0, 4 * (1 - m * 1.6)) + (flap && j >= rows - 2 ? -1 : 0); };
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (let j = -2; j < rows + 2; j++) ctx.rect(sn(x), py + j * row, len(Math.max(0, Math.min(rows - 1, j))) + 1, row);
    ctx.fill();
    for (let j = 0; j < rows; j++) {
      ctx.fillStyle = j < 3 ? BLUE[0] : j >= rows - 3 ? BLUE[2] : BLUE[1];   // lit from above, the hem in shadow
      ctx.fillRect(sn(x + 0.5), py + j * row, len(j) - 0.5, row);
    }
    ctx.fillStyle = GOLD[2];
    ctx.fillRect(sn(x + 3), py, 2, h);                     // a gold band at the hoist
    ctx.fillStyle = GOLD[1];
    ctx.fillRect(sn(x + 3), py, 1, h);
  }
  // the finial: a gilt point, with a flash as it is planted
  ctx.fillStyle = INK; ctx.fillRect(sn(x - 1.5), sn(top - 3), 3, 3);
  ctx.fillStyle = GOLD[1]; ctx.fillRect(sn(x - 1), sn(top - 2.5), 2, 2);
  const fl = (tms - lv.t0) / (360 * lv.k);
  if (fl < 1) {
    ctx.globalAlpha *= stepA(1 - fl, 3);
    star(ctx, x, top - 2, 4 + 5 * easeOut(fl), GOLD[0], GOLD[0]);
  }
  ctx.restore();
};

export default {
  // through the three swings the captain's body is ours: guard, wind-up,
  // strike and follow-through each beat, in step with the arcs (engine
  // swings at `lead` then every `gap`, all stretched by `k`)
  pose(b, u, time) {
    const tms = time * 1000, br = u.brace;
    if (!br || br.until <= tms || u.state === "moving") return null;
    const rel = (tms - br.t0) / br.k;
    // the beat nearest ahead or just behind (a swing lasts ~300 ms)
    const i = Math.max(0, Math.min(br.beats - 1, Math.round((rel - br.lead) / br.gap)));
    const d = rel - (br.lead + i * br.gap);          // ms from this beat's strike
    return { sheet: "fight", frame: d < -170 ? 0 : d < 0 ? 1 : d < 90 ? 2 : d < 380 ? 3 : 0 };
  },

  under(ctx, g) {
    const tms = g.time * 1000;
    if (g.haleLevy) for (const lv of g.haleLevy) levyGround(ctx, lv, tms);
  },

  fx(ctx, g) {
    const tms = g.time * 1000;
    const b = hale(g), u = b?.units[0];
    if (u && u.state !== "dead") drawSweep(ctx, u, tms);
    if (g.haleFx) for (const f of g.haleFx) if (f.kind === "sweep") drawSwing(ctx, f, tms);
    if (g.haleLevy) for (const lv of g.haleLevy) { levyBanner(ctx, lv, tms); drawHorn(ctx, lv, tms); }
  },
};
