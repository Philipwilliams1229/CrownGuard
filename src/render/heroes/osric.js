// ============ BROTHER OSRIC'S EFFECTS ON THE BOARD ============
// (see ./index.js for the hooks; engine/heroes/osric.js keeps the state on g.)
//
//   g.sanctuaries  Sanctuary: a warm wash of light rolls out from his feet to
//                  the ring's rim, a gold ring on its front, shafts of light
//                  and motes lifting where it has passed; then it lets go in
//                  hard steps. `wave`/`life` are already stretched by the
//                  game speed (the player's own button: same real time at
//                  1x, 2x and 4x, as Aldric's slam).
//   g.consecrated  Consecrate: blessed earth under everyone — a pale gold
//                  dithered round, a rim of art pixels with a dotted inner
//                  ring, eight little crosses set round it, a cross of light
//                  at the heart; motes rise off it in the air pass.
//   g.osricGlints  a soft gold glint over a man his mending has just healed.
//
// Pixel art as in rings.js: rows of art pixels and dithered fills snapped to
// the art grid, alpha in a few hard steps, no gradients.
import { PX, hash } from "../paint.js";
import { ringPx } from "../fx.js";

const GOLD = ["#fff3d2", "#f8e6a8", "#f0d885", "#d8b34a", "#a8782e"];
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const sn = (v) => Math.round(v * PX) / PX;
const seedOf = (o) => ((Math.floor(o.x) * 7 + Math.floor(o.y) * 13 + Math.floor(o.t0 || 0)) >>> 0) % 997;

// a 4x4 ordered-dither pattern of one colour (art-pixel sized), per context
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PATS = new WeakMap();
const dither = (ctx, hex, dens) => {
  let m = PATS.get(ctx);
  if (!m) PATS.set(ctx, (m = new Map()));
  const key = hex + dens + ":" + PX;
  let p = m.get(key);
  if (!p) {
    const cv = document.createElement("canvas");
    cv.width = 4; cv.height = 4;
    const c = cv.getContext("2d");
    c.fillStyle = hex;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((BAYER[y * 4 + x] + 0.5) / 16 < dens) c.fillRect(x, y, 1, 1);
    p = ctx.createPattern(cv, "repeat");
    if (p.setTransform) p.setTransform(new DOMMatrix([1 / PX, 0, 0, 1 / PX, 0, 0]));
    m.set(key, p);
  }
  return p;
};
// a disc (or, with r0, a band) of art-pixel rows in one path, one fill
const disc = (ctx, x, y, r, r0, style) => {
  if (r < 1) return;
  const step = r < 40 ? 1 / PX : 1, cx = sn(x), cy = sn(y);
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let dy = -Math.ceil(r / step) * step; dy < r; dy += step) {
    const m = dy + step / 2;
    if (Math.abs(m) >= r) continue;
    const hw = r * Math.sqrt(1 - (m / r) ** 2), L = sn(cx - hw), R = sn(cx + hw);
    if (r0 > 0 && Math.abs(m) < r0) {
      const hi = r0 * Math.sqrt(1 - (m / r0) ** 2), Li = sn(cx - hi), Ri = sn(cx + hi);
      if (Li > L) ctx.rect(L, cy + dy, Li - L, step);
      if (R > Ri) ctx.rect(Ri, cy + dy, R - Ri, step);
    } else ctx.rect(L, cy + dy, R - L, step);
  }
  ctx.fill();
};
// dotted ring: art-pixel squares every `gap` units
const dash = (ctx, x, y, r, sz, gap, style, turn = 0) => {
  if (r < 1) return;
  const n = Math.max(8, Math.round((TAU * r) / gap));
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + turn;
    ctx.rect(sn(x + Math.cos(a) * r - sz / 2), sn(y + Math.sin(a) * r - sz / 2), sz, sz);
  }
  ctx.fill();
};
// a little cross of light: arms `s` long, one art pixel thick (plus a core)
const cross = (ctx, x, y, s, col, core) => {
  const X = sn(x), Y = sn(y), p = 1 / PX;
  ctx.fillStyle = col;
  ctx.fillRect(X - p, Y - s, p * 2, s * 2 + p);           // the upright, a little taller
  ctx.fillRect(X - s * 0.7, Y - s * 0.35, s * 1.4 + p, p * 2);
  if (core) { ctx.fillStyle = core; ctx.fillRect(X - p, Y - s * 0.35, p * 2, p * 2); }
};
// motes: a batch of one-colour squares
const motes = (ctx, list, sz, col) => {
  if (!list.length) return;
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < list.length; i += 2) ctx.rect(sn(list[i]), sn(list[i + 1]), sz, sz);
  ctx.fill();
};

// ---- Sanctuary ----
const sanctGround = (ctx, s, tms) => {
  const age = tms - s.t0, p = clamp01(age / s.wave), r = s.r * easeOut(p * 1.15);
  const A = stepA(1.4 * (1 - age / s.life));
  if (A <= 0) return;
  ctx.save();
  ctx.globalAlpha *= A;
  // the light pools on the ground: a bright band riding the front, a thin
  // wash inside it, and a warm core round his feet — in hard steps, the
  // wash going first
  const band = Math.min(r, 7);
  disc(ctx, s.x, s.y, r, r - band, dither(ctx, GOLD[1], 0.44));
  ctx.globalAlpha *= stepA(1.2 - age / s.life, 3);
  disc(ctx, s.x, s.y, r - band, r * 0.42, dither(ctx, GOLD[0], 0.14));
  disc(ctx, s.x, s.y, r * 0.42, 0, dither(ctx, GOLD[0], 0.32));
  ctx.restore();
};
const sanctAir = (ctx, s, tms) => {
  const age = tms - s.t0, p = clamp01(age / s.wave), r = s.r * easeOut(p * 1.15), sd = seedOf(s);
  const k = age / s.life;
  if (k >= 1) return;
  const a0 = ctx.globalAlpha;
  ctx.save();
  // the front: a gold ring with a cream crest and a dotted echo outside it
  const AF = stepA(1.6 * (1 - p * 0.6) * (1 - k));
  if (AF > 0) {
    ctx.globalAlpha = a0 * AF;
    ringPx(ctx, s.x, s.y, r, r, 2, GOLD[3]);
    dash(ctx, s.x, s.y, r - 1.5, 1, 1.6, GOLD[0]);
    if (p < 1) dash(ctx, s.x, s.y, r + 3, 1, 3.2, GOLD[2], sd);
  }
  // a shaft of light down on him as he calls it: a thin dithered column
  // (he must still show through it), gone before the ring is out
  const AP = stepA(1 - age / (s.wave * 0.8), 3);
  if (AP > 0) {
    ctx.globalAlpha = a0 * AP;
    const hgt = 44 * easeOut(age / 140), top = s.y - 6 - hgt;
    ctx.fillStyle = dither(ctx, GOLD[0], 0.5);
    ctx.fillRect(sn(s.x - 3), sn(top), 6, hgt);
    ctx.fillStyle = dither(ctx, GOLD[1], 0.25);
    ctx.fillRect(sn(s.x - 6), sn(top + 6), 12, hgt - 6);
  }
  // rays: shafts of light lifting where the front has passed, and motes
  const AR = stepA(1.3 * (1 - k));
  if (AR > 0) {
    ctx.globalAlpha = a0 * AR;
    const sh = [], mo = [], mo2 = [];
    for (let i = 0; i < 26; i++) {
      const an = hash(sd, i + 500) * TAU, d = s.r * Math.sqrt(hash(sd, i + 530)), born = (d / s.r) * 0.75;
      if (p < born) continue;
      const t = age - born * s.wave;
      const z = (t * 0.03 + hash(sd, i + 560) * 5) % 20;
      const x = s.x + Math.cos(an) * d, y = s.y + Math.sin(an) * d;
      if (i < 14) sh.push(x, y - z - 8); else (i & 1 ? mo : mo2).push(x, y - z * 1.4);
    }
    ctx.fillStyle = GOLD[2];
    ctx.beginPath();
    for (let i = 0; i < sh.length; i += 2) ctx.rect(sn(sh[i]), sn(sh[i + 1]), 1, 9);
    ctx.fill();
    ctx.fillStyle = GOLD[0];
    ctx.beginPath();
    for (let i = 0; i < sh.length; i += 2) ctx.rect(sn(sh[i]), sn(sh[i + 1]), 1, 3);
    ctx.fill();
    motes(ctx, mo, 1, GOLD[0]);
    motes(ctx, mo2, 1, GOLD[2]);
  }
  ctx.restore();
};

// ---- Consecrate ----
const blessFade = (c, tms) => {
  const age = tms - c.t0, left = c.until - tms;
  return stepA(Math.min(age / 260, left / 700, 1));
};
const blessGround = (ctx, c, tms) => {
  const A = blessFade(c, tms);
  if (A <= 0) return;
  const age = tms - c.t0, r = c.r * easeOut(age / 260), sd = seedOf(c);
  const rb = Math.max(0, r - 12);                  // the glyph band's inner edge
  ctx.save();
  ctx.globalAlpha *= A;
  // a thin wash of light over the whole round, a brighter band near the rim
  // where the crosses stand, and a warm heart
  disc(ctx, c.x, c.y, rb, 0, dither(ctx, GOLD[0], 0.12));
  disc(ctx, c.x, c.y, r - 2, rb, dither(ctx, GOLD[1], 0.36));
  disc(ctx, c.x, c.y, r * 0.3, 0, dither(ctx, GOLD[0], 0.3));
  ringPx(ctx, c.x, c.y, r, r, 1.5, GOLD[3]);
  if (rb > 4) ringPx(ctx, c.x, c.y, rb, rb, 1, GOLD[3]);
  // a breath of light round the rim, turning slowly
  const breath = 0.5 + 0.5 * Math.sin(tms / 420 + sd);
  ctx.globalAlpha *= 0.5 + 0.5 * breath;
  dash(ctx, c.x, c.y, r + 2, 1, 4, GOLD[0], -tms / 4000);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= A;
  // eight crosses set in the band, and a great one at the heart, each with
  // a dark step under it so it reads on pale road and grass alike
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * TAU + sd * 0.1, rr = r - 7;
    const x = c.x + Math.cos(an) * rr, y = c.y + Math.sin(an) * rr;
    cross(ctx, x + 1 / PX, y + 1 / PX, 3, GOLD[4]);
    cross(ctx, x, y, 3, GOLD[3], GOLD[0]);
  }
  cross(ctx, c.x + 1 / PX, c.y, 6, GOLD[4]);
  cross(ctx, c.x, c.y - 1 / PX, 6, GOLD[2], GOLD[0]);
  ctx.restore();
};
const blessAir = (ctx, c, tms) => {
  const A = blessFade(c, tms);
  if (A <= 0) return;
  const sd = seedOf(c), mo = [], mo2 = [];
  // motes lifting off the blessed earth, each on its own slow loop
  for (let i = 0; i < 16; i++) {
    const per = 1400 + hash(sd, i + 90) * 900, ph = ((tms - c.t0) / per + hash(sd, i + 70)) % 1;
    const an = hash(sd, i + 10) * TAU, d = c.r * 0.92 * Math.sqrt(hash(sd, i + 30));
    const x = c.x + Math.cos(an) * d + Math.sin(ph * 6 + i) * 1.2, y = c.y + Math.sin(an) * d - ph * 20;
    if (ph > 0.85) continue;                     // gone before it reaches the top
    (i % 3 ? mo : mo2).push(x, y);
  }
  ctx.save();
  ctx.globalAlpha *= A;
  motes(ctx, mo, 1, GOLD[0]);
  motes(ctx, mo2, 1, GOLD[2]);
  ctx.restore();
};

// ---- the mending's glint over a healed man ----
const glintFx = (ctx, gl, tms) => {
  const u = gl.u, life = gl.until - gl.t0, k = clamp01((tms - gl.t0) / life);
  const A = stepA(1.6 * (1 - k));
  if (A <= 0 || u.state === "dead") return;
  ctx.save();
  ctx.globalAlpha *= A;
  const id = u.id || 0;
  for (let i = 0; i < 2; i++) {
    // above the health bar (u.y - 21), drifting up as it fades
    const x = u.x - 4 + i * 8 + (hash(id, i) - 0.5) * 3, y = u.y - 27 - k * 8 - i * 3;
    cross(ctx, x + 1 / PX, y + 1 / PX, 2, GOLD[4]);
    cross(ctx, x, y, 2, GOLD[2], GOLD[0]);
  }
  ctx.restore();
};

export default {
  // Sanctuary: he lifts the mace (the fight sheet's wind-up) while it rings out
  pose: (b, u, time) => (u.osricCast && time * 1000 < u.osricCast.until ? { sheet: "fight", frame: 1 } : null),
  under: (ctx, g) => {
    const tms = g.time * 1000;
    if (g.consecrated) for (const c of g.consecrated) blessGround(ctx, c, tms);
    if (g.sanctuaries) for (const s of g.sanctuaries) sanctGround(ctx, s, tms);
  },
  fx: (ctx, g) => {
    const tms = g.time * 1000;
    if (g.consecrated) for (const c of g.consecrated) blessAir(ctx, c, tms);
    if (g.sanctuaries) for (const s of g.sanctuaries) sanctAir(ctx, s, tms);
    if (g.osricGlints) for (const gl of g.osricGlints) glintFx(ctx, gl, tms);
  },
};
