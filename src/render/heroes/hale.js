// ============ CAPTAIN HALE'S EFFECTS ON THE BOARD ============
// (see ./index.js for the hooks; engine/heroes/hale.js keeps the state.)
//
//   u.brace      Halberd Sweep, a WHIRLWIND (owner, 2026-11-24): he turns
//                three full times, one revolution a `gap`, each blow at the
//                middle of its turn. `spinAt` is the one clock for both his
//                body and the trail: `pose` shows him from the side (the
//                figure's "spin" frames, mirrored as he faces left), from the
//                front ("spinFront") and from behind ("spinBack") by where
//                the blade is; `spinTrail` runs a ring of steel light round
//                him at the halberd's height, its far half drawn under the
//                figures (`under`), its near half over them (`fx`), and a
//                dotted ring of the reach on the ground. g.haleFx keeps the
//                half-circle arcs (drawSwing) for any `full`-less sweep.
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

// ---- the whirlwind ----
// where the spin stands at `tms`: null outside it, else { th (radians turned since the
// spin began), psi (the blade's bearing on the board: 0 = +x, PI/2 = toward the camera;
// it starts on the side he faced), f0, cx, cy, r } — the body and the trail both read this
const spinAt = (br, tms) => {
  if (!br || !br.full) return null;
  const rel = (tms - br.t0) / br.k, S0 = br.lead - br.gap / 2, S1 = br.lead + (br.beats - 1) * br.gap + br.gap / 2;
  if (rel < S0 - 80 || rel > S1 + 160) return null;
  const q = Math.max(0, Math.min(S1 - S0, rel - S0)), th = (q / br.gap) * TAU;
  const f0 = br.face < 0 ? -1 : 1;
  return { rel, S0, S1, th, psi: Math.atan2(Math.sin(th), f0 * Math.cos(th)), f0, cx: br.x, cy: br.y + 6, r: br.r };
};
const SPIN_TAIL = 0.6;            // how much of a turn the trail runs behind the blade
// the trail: `near` true draws the half toward the camera (over the figures), false the far half
const spinTrail = (ctx, br, tms, near) => {
  const sp = spinAt(br, tms);
  if (!sp) return;
  const { rel, S0, S1, th, f0, cx, cy } = sp, R = sp.r * 0.92;
  // in at the start, the tail catching up the head after the last turn
  const fade = rel < S0 ? stepA(1 - (S0 - rel) / 80, 3) : rel > S1 ? stepA(1 - (rel - S1) / 160, 3) : 1;
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha *= fade;
  const tail = Math.min(SPIN_TAIL * TAU, th + 0.0001), n = 36;
  const at = (a) => [cx + f0 * Math.cos(a) * R, cy - 8 + Math.sin(a) * R * FLAT];
  let p0 = null;
  for (let i = 0; i <= n; i++) {
    const a = th - tail * (1 - i / n), [x, y] = at(a), t = i / n;     // t: 0 the tail's end, 1 the blade
    const isNear = Math.sin(a) >= 0;
    if (p0 && isNear === near) {
      ctx.globalAlpha = fade * stepA(0.25 + 0.75 * t, 4);
      pxLine(ctx, p0[0], p0[1], x, y, 1 + 3.5 * t * t, t > 0.85 ? STEEL[0] : t > 0.45 ? STEEL[1] : STEEL[2]);
    }
    p0 = [x, y];
  }
  // a twinkle where the blade is, on whichever half it is crossing
  if (rel <= S1 && (Math.sin(th) >= 0) === near) { ctx.globalAlpha = fade; const [x, y] = at(th); star(ctx, x, y, 3.5, STEEL[1], STEEL[0]); }
  ctx.restore();
};
// the reach, a dotted ring on the ground all round him while he spins; it flashes as each blow lands
const spinGround = (ctx, br, tms) => {
  const sp = spinAt(br, tms);
  if (!sp) return;
  const { rel, cx, cy } = sp, R = sp.r;
  let flash = 0;
  for (let i = 0; i < br.beats; i++) { const d = rel - (br.lead + i * br.gap); if (d >= 0 && d < 160) flash = Math.max(flash, 1 - d / 160); }
  ctx.save();
  ctx.globalAlpha *= 0.45 + 0.4 * stepA(flash, 3);
  ctx.fillStyle = flash > 0.3 ? STEEL[0] : STEEL[3];
  ctx.beginPath();
  const N = 36, turn = sp.th * 0.25;
  for (let i = 0; i < N; i++) {
    const an = (i / N) * TAU + turn;
    ctx.rect(sn(cx + Math.cos(an) * R - 0.75), sn(cy + Math.sin(an) * R * FLAT - 0.5), 1.5, 1);
  }
  ctx.fill();
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
  // through the three swings the captain's body is ours: the "sweep" sheet
  // (rigs-crown.js SWEEP: guard, wind-up, the blade coming round, strike,
  // follow-through, recover), keyed to the beat. The engine lands each blow
  // at `lead` then every `gap` (all stretched by `k`); the arc is drawn from
  // 130 ms before the blow.
  pose(b, u, time) {
    const tms = time * 1000, br = u.brace;
    if (!br || br.until <= tms) return null;
    if (br.full) {
      // the whirlwind: a wind-up, three turns, a recover (frames of the sweep sheet either side)
      const rel = (tms - br.t0) / br.k, S0 = br.lead - br.gap / 2, S1 = br.lead + (br.beats - 1) * br.gap + br.gap / 2;
      if (rel < S0) return { sheet: "sweep", frame: 1, face: br.face };
      if (rel > S1) return { sheet: "sweep", frame: rel - S1 < 90 ? 5 : 0, face: br.face };
      const sp = spinAt(br, tms), c = Math.cos(sp.psi), s = Math.sin(sp.psi);
      // he faces where the blade is: from the side while it is out to his left or right
      // (frame 0 the blade on the far side of him, 1 the near), from the front while it
      // comes at the camera, from behind while it goes away (frame 0 the blade to screen
      // right, 1 to screen left)
      if (Math.abs(c) >= Math.abs(s)) return { sheet: "spin", frame: s > 0 ? 1 : 0, face: c > 0 ? 1 : -1 };
      return { sheet: s > 0 ? "spinFront" : "spinBack", frame: c > 0 ? 0 : 1, face: 1 };
    }
    const rel = (tms - br.t0) / br.k;
    const i = Math.max(0, Math.min(br.beats - 1, Math.round((rel - br.lead) / br.gap)));
    const d = rel - (br.lead + i * br.gap);          // ms from this beat's blow
    return { sheet: "sweep", frame: d < -250 ? 0 : d < -130 ? 1 : d < -30 ? 2 : d < 90 ? 3 : d < 250 ? 4 : d < 330 ? 5 : 0 };
  },

  under(ctx, g) {
    const tms = g.time * 1000;
    const hb = hale(g), hu = hb?.units[0];
    if (hu && hu.state !== "dead" && hu.brace) { spinGround(ctx, hu.brace, tms); spinTrail(ctx, hu.brace, tms, false); }
    if (g.haleLevy) for (const lv of g.haleLevy) levyGround(ctx, lv, tms);
  },

  fx(ctx, g) {
    const tms = g.time * 1000;
    const b = hale(g), u = b?.units[0];
    if (u && u.state !== "dead") { drawSweep(ctx, u, tms); if (u.brace) spinTrail(ctx, u.brace, tms, true); }
    if (g.haleFx) for (const f of g.haleFx) if (f.kind === "sweep") drawSwing(ctx, f, tms);
    if (g.haleLevy) for (const lv of g.haleLevy) { levyBanner(ctx, lv, tms); drawHorn(ctx, lv, tms); }
  },
};
