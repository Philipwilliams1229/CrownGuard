// ============ DRAGONFIRE AND BURNING GROUND ============
// The Pyromancer's two final forms, as they touch the field:
//   drawBreath      — Dragonbreath's held jet of fire (a straight comet onto
//                     the road, owner's pick of Effects Round 17). Reads
//                     t.breath { on 0..1, ang (ground-plane radians from the
//                     hall's foot), len (reach), cone } set by engine/update.js
//                     breathe, and leaves from breathMouth(t) in halls/wizard.js.
//   drawFireGround  — the Inferno Throne's burning ground (g.grounds, kind
//                     "fire"), left by every fifth fireball.
//
// Pixel art like fx.js and rings.js: every flame, puff and patch is painted
// art pixel by art pixel ONCE into a memo'd sprite (stepped tones, ordered
// dither, no smooth blends) and stamped with drawImage. A breath is one
// baked sprite and one dithered fill a frame; a burning patch is one stamp and
// a few specks.
//
// The breath, in the 3/4 camera: one straight comet from the staff's ring down
// onto the far part of the damage wedge (half-angle cone from the hall's foot,
// out to len), its round head landing on the road at 0.84 of the reach, so
// what burns on screen is what the engine hits.

import { breathMouth } from "./halls/wizard.js";
import { PX, hash } from "./paint.js";

// ---- palette -------------------------------------------------------------
const KC = {};
const K = (h) => KC[h] || (KC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const SOOT = ["#221a1e", "#2e2226", "#3a2c28", "#4e3e32"];
const ASH = "#6a5c56";
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const sn = (v) => Math.round(v * PX) / PX;

// ---- pixel canvas (as in fx.js) ------------------------------------------
const grid = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  const W = cv.width, H = cv.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.createImageData(W, H), d = img.data;
  const set = (x, y, k, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (typeof k === "string") k = K(k);
    const i = (y * W + x) * 4;
    d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = a;
  };
  const done = () => { c.putImageData(img, 0, 0); return cv; };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(Math.floor(y) * W + Math.floor(x)) * 4 + 3]);
  return { cv, W, H, set, done, d, at };
};
const SPR = new Map();
const memo = (key, make) => {
  let s = SPR.get(key);
  if (!s) { if (SPR.size > 1500) SPR.clear(); s = make(); SPR.set(key, s); }
  return s;
};
const put = (ctx, s, x, y) => {
  ctx.drawImage(s.cv, sn(x) - s.ax / PX, sn(y) - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const vnoise = (x, y, cell, seed) => {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  let fx = x / cell - gx, fy = y / cell - gy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const s = Math.floor(seed * 977);
  const h = (i, j) => hash(gx + i + s, gy + j);
  return (h(0, 0) * (1 - fx) + h(1, 0) * fx) * (1 - fy) + (h(0, 1) * (1 - fx) + h(1, 1) * fx) * fy;
};
// a batch of art-pixel squares in one colour: [x, y, size] triples
const dots = (ctx, list, n, style) => {
  if (!n) return;
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i < n; i += 3) ctx.rect(sn(list[i]), sn(list[i + 1]), list[i + 2], list[i + 2]);
  ctx.fill();
};

// ---- dither wash (as in rings.js) -----------------------------------------
const PATS = new WeakMap();
const dither = (ctx, h, dens) => {
  let m = PATS.get(ctx);
  if (!m) PATS.set(ctx, (m = new Map()));
  const key = h + dens;
  let p = m.get(key);
  if (!p) {
    const G = grid(4, 4);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (bay(x, y) < dens) G.set(x, y, h);
    p = ctx.createPattern(G.done(), "repeat");
    if (p.setTransform) p.setTransform(new DOMMatrix([1 / PX, 0, 0, 1 / PX, 0, 0]));
    m.set(key, p);
  }
  return p;
};

// ---- Dragonbreath (owner's pick, Effects Round 17 version 1; concept/fx-r17-a.js) ------------------------
// One straight comet of flame from the staff's ring (breathMouth) down onto the far part of the damage wedge,
// after the owner's reference: a white needle and a flickering spark at the staff, then a dense, mottled body
// with a pale core line that WIDENS steadily (a straight taper) to half the head's width where the head flares,
// ragged licks leaning back along both edges, and a big round head landing ON the road at 0.84 of the reach,
// its foot spread 1.4x and pressed a little flat (it settles like a flame, not a ball touching the road). From
// the flare's start the head is evenly ~80% opaque (HEAD_A, eased in by dithered steps), its one-pixel tinted
// outline nearly solid, so the foes inside show through it; the stem is solid. Two pumped surges a loop run down
// the jet and swell the head as they land; sparks lift off the far end; a stepped glow where the head rests
// and a faint dither over exactly the damage wedge. No smoke, no ground fires.
// The whole jet (glow, body, spark, sparks) is ONE sprite per (aim step of 48, loop frame of 16 at 110 ms of
// game time, `on` bucket of 6, reach, mouth offset), baked lazily (at most BREATH_BAKES a frame; a missing one
// borrows the nearest baked frame or aim meanwhile) into a cache held to BREATH_BUDGET bytes, oldest first.
// While t.breath.on grows the comet shoots out from the staff (the head travels out and swells to full); as it
// gutters it draws back the same way.
const JET = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // the concept's tones (the blast round's)
const J_INK = "#8a2028", J_WINE = "#6a1830", J_HOT = "#ffd860";
const HEAD_A = 0.8, FLARE_EASE = 0.9, A_STEPS = 3, LINE_A = 0.92;   // the see-through flare
const FOOT = 1.4, FLAT = 0.2, GLOW = 1.2, GLOW_A = 0.5;             // the settled foot; the landing glow (lighter than the concept: it lies over the foes)
const SW = [1.15, 1.08, 1.01, 0.96, 0.94, 0.95, 0.99, 1.08];       // the head's swell through one surge (8 frames)
const J_N = 16, J_MS = 110, J_AIMS = 48, J_ONS = 6, J_CONE = 0.42;
const BREATH_BUDGET = 32 * 1024 * 1024, BREATH_BAKES = 2;
const JH = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const jper = (i, n) => ((i % n) + n) % n;
const jcell = (a, b, n) => JH(jper(a, n), b);
const JETS = new Map();
let jetBytes = 0, jetBakes = 0, jetStamp = -1;
export const breathStats = () => ({ sprites: JETS.size, mb: +(jetBytes / 1048576).toFixed(1) });

// bake one jet: art pixels, origin at the hall's foot; M the mouth, ang the aim, L the reach (art px), i the frame
const bakeJet = (ang, i, ob, L, Mx, My) => {
  const gr = easeOut(ob), ext = 0.12 + 0.88 * gr, sz = 0.3 + 0.7 * gr;
  const R = 26 * SW[i % 8] * sz, R0 = 26 * (0.4 + 0.6 * gr);
  const Gp = { x: Math.cos(ang) * L * 0.84, y: Math.sin(ang) * L * 0.84 };
  const Hf = { x: Gp.x, y: Gp.y - R * 0.45 };
  const Hc = { x: Mx + (Hf.x - Mx) * ext, y: My + (Hf.y - My) * ext };
  const dx = Hc.x - Mx, dy = Hc.y - My, Lt = Math.max(4, Math.hypot(dx, dy)), ux = dx / Lt, uy = dy / Lt;
  const tp = (i % 8) / 8 * 1.15 - 0.06;
  const tf = Math.max(0.5, (Lt - 1.3 * R0) / Lt), Wf = R0 * 0.5, Rj = Wf / tf;
  // the box: the jet, the glow and the sparks' rise
  const sparkS = (k) => L * (0.62 + 0.38 * 0.95 * JH(k, 2));
  let x0 = Math.min(Mx, Hc.x) - R * 1.6 - 3, x1 = Math.max(Mx, Hc.x) + R * 1.6 + 3;
  let y0 = Math.min(My, Hc.y) - R * 1.6 - 3, y1 = Math.max(My, Hc.y) + R * 1.6 + 3;
  const rx = R * 1.7 * GLOW, ry = R * 0.62, glowOn = ext > 0.97;
  if (glowOn) { x0 = Math.min(x0, Gp.x - rx - 1); x1 = Math.max(x1, Gp.x + rx + 1); y1 = Math.max(y1, Gp.y + ry + 4); }
  if (gr > 0.5) for (let k = 0; k < 10; k++) {
    const a = ang + (JH(k, 1) - 0.5) * 2 * J_CONE * 0.7, s = sparkS(k);
    x0 = Math.min(x0, Math.cos(a) * s - 4); x1 = Math.max(x1, Math.cos(a) * s + 4);
    y0 = Math.min(y0, Math.sin(a) * s - 4 - 34 * 1.1 - 2); y1 = Math.max(y1, Math.sin(a) * s + 2);
  }
  const ox = Math.floor(x0), oy = Math.floor(y0);
  const G = grid(Math.ceil(x1) - ox + 1, Math.ceil(y1) - oy + 1);
  const put1 = (x, y, col, a) => G.set(Math.floor(x) - ox, Math.floor(y) - oy, col, Math.round(a * 255));
  // the landing's glow, under the head
  if (glowOn) for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) {
    const d = Math.hypot(x / rx, y / ry); if (d > 1) continue;
    const st = Math.ceil((1 - d) * 4) / 4;
    if (bay(x + 512, y + 512) < st * 0.85) put1(Gp.x + x, Gp.y + y + 3, st > 0.7 ? JET[0] : st > 0.4 ? JET[1] : JET[2], GLOW_A);
  }
  // the jet, pixel by pixel
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const px = x + 0.5 - Mx, py = y + 0.5 - My, a = px * ux + py * uy, b = px * -uy + py * ux, tt = a / Lt;
    if (a < 3) continue;                                                 // the little gap after the spark
    if (a > Lt + R * 2 || Math.abs(b) > R * 1.7) continue;
    const pulse = Math.max(0, 1 - Math.abs(tt - tp) / 0.09);
    let qc = 9, w = 1;
    if (tt <= 1) { w = (0.7 + (Wf - 0.7) * Math.max(0, tt) / tf) * (1 + 0.3 * pulse); qc = Math.abs(b) / w; }
    const fy = Math.min(1, Math.max(0, (y + 0.5 - Hc.y) / (R * 0.65))), fs = fy * fy * (3 - 2 * fy);
    const hx = Hc.x - Mx + (x + 0.5 - Hc.x) / (1 + (FOOT - 1) * fs), hy = Hc.y - My + (y + 0.5 - Hc.y) * (1 + FLAT * fs);
    const ha = hx * ux + hy * uy, hb = hx * -uy + hy * ux;
    const qh = Math.hypot((ha - Lt) / (R * (ha < Lt ? 1.3 : 1.0)), hb / R);
    const k = 0.07, q = -k * Math.log(Math.exp(-qc / k) + Math.exp(-qh / k));
    const head = qh < qc * 1.05, side = b > 0 ? 1 : -1;
    const amp = head ? (y + 0.5 > Hc.y + R * 0.3 ? 0.05 : 0.12) : 0.05 + 0.2 * Math.max(0, tt), ab = a + 0.6 * Math.max(0, Math.abs(b) - Rj * tt);
    const lk = jcell(Math.floor((ab - 4 * i) / 2), side * 7 + 3, 32), lk2 = jcell(Math.floor((ab - 4 * i) / 4) + 5, side * 3 + 11, 16);
    const edge = 1 + amp * (lk * lk * lk * 2.2 + lk2 * 0.5 - 0.45);
    if (q > edge) continue;
    const m1 = jcell(Math.floor((a - 6 * i) / 3), Math.floor(b / 3) + 50, 32), m2 = jcell(Math.floor((a - 5 * i) / 5), Math.floor(b / 4) + 90, 16);
    const m = m1 * 0.6 + m2 * 0.4;
    let h = (1 - q) * 0.6 + (1 - 0.4 * Math.min(1, Math.max(0, tt))) * 0.2 + (m - 0.5) * 0.55 + 0.26 * pulse;
    if (tt < 0.12) h += (0.12 - tt) * 4;
    if (head) h += 0.06 - 0.25 * Math.max(0, qh - 0.7);
    let col = h > 0.96 ? JET[0] : h > 0.8 ? JET[1] : h > 0.56 ? JET[2] : h > 0.32 ? JET[3] : JET[4];
    if (Math.abs(b) < Math.max(1, w * 0.13) && tt > 0.03 && tt < 0.97 && m > 0.22) col = tt < 0.25 || pulse > 0.3 ? JET[0] : JET[1];
    const rim = edge - q;
    if (rim < 0.07) col = head && y + 0.5 > Hc.y + R * 0.3 && rim < 0.035 ? J_INK : head && y + 0.5 > Hc.y + R * 0.3 ? J_WINE : JET[4];
    else if (rim < 0.16 && (head || tt > 0.6) && bay(x, y) < 0.5) col = JET[4];
    const eh = Math.min(1, Math.max(0, (a - (Lt - 1.3 * R)) / (FLARE_EASE * R)));
    const eq = Math.min(1, Math.floor(eh * A_STEPS + bay(x, y)) / A_STEPS);
    const al = Math.round((1 - (1 - HEAD_A) * eq) * 20) / 20;
    put1(x, y, col, rim < 0.07 ? Math.max(al, LINE_A) : al);
  }
  // the spark at the staff's ring
  const s = [2, 3, 2, 1][i % 4];
  put1(Mx, My, JET[0], 1);
  for (let k = 1; k <= s; k++) { const col = k === s ? JET[2] : JET[1]; put1(Mx + k, My, col, 1); put1(Mx - k, My, col, 1); put1(Mx, My + k, col, 1); put1(Mx, My - k, col, 1); }
  if (s > 1) { put1(Mx + 1, My + 1, JET[1], 0.8); put1(Mx - 1, My - 1, JET[1], 0.8); }
  // sparks lifting off the far end: each lives half the loop
  if (gr > 0.5) for (let k = 0; k < 10; k++) {
    const qq = ((2 * i) / J_N + k / 10) % 1, a = ang + (JH(k, 1) - 0.5) * 2 * J_CONE * 0.7, ss = sparkS(k);
    const x = Math.cos(a) * ss + Math.sin(qq * 9 + k) * 2, y = Math.sin(a) * ss - 4 - 34 * qq * (0.6 + 0.5 * JH(k, 3));
    if (bay(k, i) < qq * qq * 0.9) continue;
    put1(x, y, k % 3 === 0 ? JET[0] : J_HOT, 1);
    if (k % 3 === 0) { put1(x + 1, y, JET[2], 0.8); put1(x, y + 1, JET[2], 0.8); } else if (qq > 0.5) put1(x, y + 1, JET[3], 0.7);
  }
  return { cv: G.done(), ox, oy, bytes: G.W * G.H * 4 };
};

const jetKey = (as, i, ob, Lr, mx, my) => `${as}|${i}|${ob}|${Lr}|${mx}|${my}`;
const jetGet = (key) => { const s = JETS.get(key); if (s) { JETS.delete(key); JETS.set(key, s); } return s; };

export const drawBreath = (ctx, t, time) => {
  const b = t.breath;
  if (!b || b.on <= 0) return;
  const on = clamp01(b.on), ob = Math.max(1, Math.ceil(on * J_ONS));   // on bucket 1..6
  if (time !== jetStamp) { jetStamp = time; jetBakes = 0; }
  const m = breathMouth(t);
  const mx = Math.round((m.x - t.x) * PX), my = Math.round((m.y - t.y) * PX);
  const as = jper(Math.round((b.ang / TAU) * J_AIMS), J_AIMS), Lr = Math.round(b.len);
  const i = jper(Math.floor((time * 1000) / J_MS), J_N);
  const make = (aa, ii) => {
    const key = jetKey(aa, ii, ob, Lr, mx, my);
    let s = jetGet(key);
    if (s) return s;
    if (jetBakes >= BREATH_BAKES) return null;
    jetBakes++;
    s = bakeJet((aa / J_AIMS) * TAU, ii, ob / J_ONS, Lr * PX, mx, my);
    JETS.set(key, s); jetBytes += s.bytes;
    for (const [k2, s2] of JETS) { if (jetBytes <= BREATH_BUDGET) break; JETS.delete(k2); jetBytes -= s2.bytes; }
    return s;
  };
  let s = make(as, i);
  // out of bakes this frame: borrow the nearest baked frame (then aim) so nothing pops
  for (let d = 1; !s && d < J_N; d++) s = JETS.get(jetKey(as, jper(i - d, J_N), ob, Lr, mx, my)) || JETS.get(jetKey(as, jper(i + d, J_N), ob, Lr, mx, my));
  for (let d = 1; !s && d <= 2; d++) s = JETS.get(jetKey(jper(as - d, J_AIMS), i, ob, Lr, mx, my)) || JETS.get(jetKey(jper(as + d, J_AIMS), i, ob, Lr, mx, my));
  if (!s) { jetBakes = 0; s = make(as, i); }                           // first sight: bake it anyway
  ctx.save();
  const fade = stepA(Math.min(1, on * 2.4), 4);
  if (fade < 1) ctx.globalAlpha *= fade;
  // a faint dither over exactly the damage wedge, so what burns reads on the road
  const ca = Math.cos(b.ang), sa = Math.sin(b.ang), px = -sa, py = ca, cone = b.cone || J_CONE, tanC = Math.tan(cone);
  const reach = b.len * (0.2 + 0.8 * easeOut(on)), s0 = reach * 0.25;
  ctx.beginPath();
  ctx.moveTo(t.x + ca * s0 + px * s0 * tanC, t.y + sa * s0 + py * s0 * tanC);
  for (let k = 0; k <= 10; k++) { const q = b.ang + cone * (1 - k / 5); ctx.lineTo(t.x + Math.cos(q) * reach, t.y + Math.sin(q) * reach); }
  ctx.lineTo(t.x + ca * s0 - px * s0 * tanC, t.y + sa * s0 - py * s0 * tanC);
  ctx.closePath();
  ctx.fillStyle = dither(ctx, JET[2], 0.16);
  ctx.fill();
  ctx.drawImage(s.cv, sn(t.x) + s.ox / PX, sn(t.y) + s.oy / PX, s.cv.width / PX, s.cv.height / PX);
  ctx.restore();
};

// ---- the Inferno Throne's burning ground (owner's pick, "Burning ground, take 2: B") ----------
// The pool LIES IN the ground: a char heart, the ground's own colour scorched and browned round it,
// dithered and ragged, no outline; a few forking hairline fissures with embers living in them; and
// patches of 2-4 flame tongues sharing a root, each patch on its own clock, inked with the tinted
// one-pixel line. Baked per (size bucket, shape variant, frame): the ground (embers), the flames and
// smoke behind a foe standing in it ("back", drawn in the ground layer) and the tongues rooted in the
// pool's front half ("front", drawn by drawFireFront after the figures). It catches over ~0.5 s, the
// flames shrink first as it dies (embers last).
const HF = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const smt = (t) => t * t * (3 - 2 * t);
const vn = (x, y, s, sd = 0) => { const gx = x / s, gy = y / s, ix = Math.floor(gx), iy = Math.floor(gy), fx = smt(gx - ix), fy = smt(gy - iy);
  const a = HF(ix, iy + sd), b = HF(ix + 1, iy + sd), c = HF(ix, iy + 1 + sd), d = HF(ix + 1, iy + 1 + sd); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
const blobEdge = (x, y, R, ry, sd) => { const a = Math.atan2(y / ry, x / R);
  const r = 1 + 0.16 * Math.sin(3 * a + sd) + 0.11 * Math.sin(5 * a + 2 * sd + 1) + 0.06 * Math.sin(9 * a + sd * 3) + (a > 2.2 || a < -2.6 ? 0.1 : 0);
  return Math.hypot(x / R, y / ry) / r; };
const FS = [FIRE[0], FIRE[1], FIRE[2], FIRE[3], FIRE[4]];
const FNF = 8;                                   // frames in the loop
const FLT = [0, 0.25, 0.55, 1];                  // flame strength by tier
const PATCH = [[-12, -4, 0.0, 1.3, 4], [10, 7, 0.3, 1.1, 3], [24, -6, 0.62, 0.8, 3], [-30, 8, 0.8, 0.7, 2], [2, -14, 0.45, 0.8, 2]];
const fireGeom = (rb) => { const R = rb * PX * 0.93, ry = R * 0.59, top = Math.ceil(R * 0.75) + 14, hx = Math.ceil(R * 1.5) + 3, hy = Math.ceil(ry * 1.5) + 3; return { R, ry, top, hx, hy }; };
const ellA = (G, cx, cy, rx, ry, col, al, dens) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1 || bay(x, y) >= dens) continue; G.set(x, y, col, al * 255); } };
const fireFlame = (G, x, y, h, w, ph, sway) => {
  for (let j = 0; j < h; j++) {
    const p = j / Math.max(1, h - 1), prof = p < 0.25 ? 0.62 + p * 1.5 : Math.pow(Math.cos(((p - 0.25) / 0.75) * (Math.PI / 2)), 0.85);
    const hw = Math.max(0.6, (w / 2) * prof), off = Math.sin(ph + p * 3.2) * sway * p;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      if (Math.abs(dx) > hw + 0.2) continue;
      const d = Math.abs(dx) / hw;
      G.set(x + dx + off, y - j, d > 0.72 ? FS[3] : d > 0.42 || p > 0.8 ? FS[2] : p < 0.55 && d < 0.2 ? FS[0] : FS[1]);
    }
  }
};
const inkPass = (G) => { const { d, W, H } = G, out = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 40) continue; let n = -1;
    if (x > 0 && d[i - 1] > 40) n = i - 4; else if (x < W - 1 && d[i + 7] > 40) n = i + 4; else if (y > 0 && d[i - W * 4 + 3] > 40) n = i - W * 4; else if (y < H - 1 && d[i + W * 4 + 3] > 40) n = i + W * 4;
    if (n < 0) continue; out[i] = d[n] * 0.4 + 10; out[i + 1] = d[n + 1] * 0.32 + 4; out[i + 2] = d[n + 2] * 0.46 + 18; out[i + 3] = 255; }
  d.set(out); };
const firePatches = (G, g, f, v, tier, front) => { const sc = g.R / 56, cx = G.cx, cy = G.cy;
  PATCH.forEach(([x, y, ph, sz, n], k) => { y = Math.round(y * sc); if ((y > 5 * sc) !== front) return;
    const env = Math.pow(Math.sin(((f / FNF + ph + v * 0.21) % 1) * Math.PI), 0.7) * FLT[tier]; if (env < 0.12) return;
    for (let j = 0; j < n; j++) { const off = Math.round(((j - (n - 1) / 2) * 5 + (HF(k, j) - 0.5) * 2) * sc), h = Math.round((8 + 14 * HF(k, j + 3 + v)) * sz * env * (j === 1 ? 1.3 : 1) * 1.15 * sc); if (h < 4) continue;
      fireFlame(G, cx + Math.round(x * sc) + off, cy + y - (j & 1), h, Math.max(3, Math.min(Math.round(h * 0.6), Math.round(7 * sc))), f * 0.9 + k * 2 + j, 1.2 * sc); } }); };
// the ground: glow, char with its scorched fringe, fissures, embers
const fireBaseS = (rb, v, f) => memo(`fb|${rb}|${v}|${f}`, () => {
  const g = fireGeom(rb), { R, ry } = g, G = grid(2 * g.hx, 2 * g.hy + g.top), cx = g.hx, cy = g.hy + g.top, sd = 1.3 + v * 2.1;
  G.cx = cx; G.cy = cy;
  ellA(G, cx, cy, R * 1.1, ry * 1.1, FS[2], 0.1 + 0.02 * Math.sin(f * 0.8), 0.5); ellA(G, cx, cy, R * 0.66, ry * 0.66, FS[2], 0.2 + 0.04 * Math.sin(f * 0.8), 0.5);
  for (let y = -g.hy; y <= g.hy; y++) for (let x = -g.hx; x <= g.hx; x++) {
    const d = blobEdge(x, y, R, ry, sd) + (vn(x, y, 5, 4) - 0.5) * 0.4 + (HF(x, y) - 0.5) * 0.12;
    if (d > 1.45) continue;
    if (d < 0.62) { G.set(cx + x, cy + y, vn(x, y, 6, 2) > 0.6 ? "#2a1c20" : "#20161a"); continue; }
    const k = (d - 0.62) / 0.83;
    if (bay(x, y) >= Math.min(1, (1 - k) * 1.25 + 0.05)) continue;
    G.set(cx + x, cy + y, k < 0.25 ? "#2a1c1c" : k < 0.6 ? "#3a2a1e" : "#4a3a28", (k < 0.6 ? 0.95 : 0.7) * 255);
    if (k > 0.6 && HF(x * 3, y) > 0.7) G.set(cx + x, cy + y, "#1e1a16", 0.6 * 255);
  }
  // fissures: random walks that fork, the same every frame; the embers in them breathe
  const sc = R / 56, walk = (x, y, ang, len, depth, my) => { for (let i = 0; i < len; i++) { ang += (HF(my * 7 + i, sd) - 0.5) * 0.9; x += Math.cos(ang); y += Math.sin(ang) * 0.6;
    if (blobEdge(x, y, R, ry, sd) > 0.88) break; const X = Math.round(x), Y = Math.round(y), lit = 0.5 + 0.5 * Math.sin((f / FNF) * TAU + my * 2.1);
    if ((X + Y) % 2 === 0) { G.set(cx + X, cy + Y - 1, FS[4], 0.45 * 255); G.set(cx + X + 1, cy + Y, FS[4], 0.35 * 255); }
    G.set(cx + X, cy + Y, lit > 0.75 ? FS[1] : lit > 0.4 ? FS[2] : FS[3]); // warm, never white (the lead, 2026-11-16)
    if (depth < 2 && HF(my + i, sd + 5) > 0.93) walk(x, y, ang + (HF(i, my) > 0.5 ? 0.8 : -0.8), (len * 0.6) | 0, depth + 1, my * 3 + i); } };
  for (let k = 0; k < 8; k++) { const a = HF(k, sd + 1) * TAU, dd = 0.08 + 0.35 * HF(k, sd + 2); walk(Math.cos(a) * R * dd, Math.sin(a) * ry * dd, HF(k, sd + 3) * TAU, ((22 + 20 * HF(k, sd + 4)) * Math.max(0.6, sc)) | 0, 0, k); }
  for (let y = -g.hy; y <= g.hy; y++) for (let x = -g.hx; x <= g.hx; x++) if (blobEdge(x, y, R, ry, sd) < 0.7 && HF(x * 2.1, y * 1.7) > 0.985) G.set(cx + x, cy + y, FS[(f + x) & 1 ? 2 : 3]);
  return { cv: G.done(), ax: cx, ay: cy };
});
// the flames (and, behind, the smoke): back = tongues rooted in the back half, front = the front half
const fireFlamesS = (rb, v, f, tier, front) => memo(`ff|${rb}|${v}|${f}|${tier}|${front ? 1 : 0}`, () => {
  const g = fireGeom(rb), G = grid(2 * g.hx, 2 * g.hy + g.top);
  G.cx = g.hx; G.cy = g.hy + g.top;
  firePatches(G, g, f, v, tier, front);
  inkPass(G);
  if (!front && tier > 0) PATCH.slice(0, 3).forEach(([x, y, ph], k) => { const q = (f / FNF * 0.8 + ph) % 1, sc = g.R / 56, sx = G.cx + Math.round(x * sc) + Math.sin(q * 6 + k) * 3, sy = G.cy + Math.round(y * sc) - (24 + q * 26) * sc;
    const rx = (3 + q * 5) * sc, ry2 = (1.6 + q * 3) * sc, col = q < 0.5 ? "#9c969a" : "#6a666e", al = 0.55 * (1 - q) * FLT[tier], dn = 0.85 - q * 0.4;
    for (let yy = Math.floor(sy - ry2); yy <= Math.ceil(sy + ry2); yy++) for (let xx = Math.floor(sx - rx); xx <= Math.ceil(sx + rx); xx++) { const nx = (xx + 0.5 - sx) / rx, ny = (yy + 0.5 - sy) / ry2;
      if (nx * nx + ny * ny > 1 || bay(xx, yy) >= dn || G.at(xx, yy) > 0) continue; G.set(xx, yy, col, al * 255); } });
  let any = false; for (let i = 3; i < G.d.length; i += 4) if (G.d[i]) { any = true; break; }
  return { cv: G.done(), ax: G.cx, ay: G.cy, empty: !any };
});

const FG = new Float32Array(6 * 3);
const fireState = (gr, time, tms) => {
  const left = gr.until - tms, age = gr.born != null ? tms - gr.born : 1e9;
  const a = stepA(Math.min(1, left / 900, age / 240), 4);
  const tier = Math.min(age < 250 ? 1 : age < 500 ? 2 : 3, left < 500 ? 0 : left < 1200 ? 1 : left < 2000 ? 2 : 3);
  const r = Math.max(12, gr.r || 36), rb = Math.round(r / 4) * 4;
  const v = ((Math.floor(gr.x) * 7 + Math.floor(gr.y) * 13) % 4 + 4) % 4;
  const f = (Math.floor(time * 5 + (Math.floor(gr.x) * 3 + Math.floor(gr.y)) * 0.37) % FNF + FNF) % FNF;
  return { a, tier, r, rb, v, f };
};
export const drawFireGround = (ctx, gr, time, tms) => {
  const q = fireState(gr, time, tms);
  if (q.a <= 0) return;
  if (q.a < 1) { ctx.save(); ctx.globalAlpha *= q.a; }
  put(ctx, fireBaseS(q.rb, q.v, q.f), gr.x, gr.y);
  if (q.tier > 0) put(ctx, fireFlamesS(q.rb, q.v, q.f, q.tier, false), gr.x, gr.y);
  // a few sparks lifting off it
  let n = 0;
  if (q.tier > 0) for (let i = 0; i < 5; i++) {
    const ph = (time * 0.9 + i * 0.29 + gr.x * 0.013) % 1;
    const an = i * 2.3 + gr.y * 0.07, d = q.r * (0.15 + 0.07 * i);
    FG[n++] = gr.x + Math.cos(an) * d + Math.sin(time * 4 + i) * 1.5;
    FG[n++] = gr.y + Math.sin(an) * d * 0.6 - 3 - ph * 22;
    FG[n++] = ph < 0.35 ? 1 : 0.5;
    if (q.tier < 3 && i >= 2) break;
  }
  dots(ctx, FG, n, ((time * 3) | 0) % 2 ? FIRE[2] : FIRE[3]);
  if (q.a < 1) ctx.restore();
};
// the tongues rooted in the pool's front half: drawn after the figures (draw.js)
export const drawFireFront = (ctx, gr, time, tms) => {
  const q = fireState(gr, time, tms);
  if (q.a <= 0 || q.tier <= 0) return;
  const s = fireFlamesS(q.rb, q.v, q.f, q.tier, true);
  if (s.empty) return;
  if (q.a < 1) { ctx.save(); ctx.globalAlpha *= q.a; }
  put(ctx, s, gr.x, gr.y);
  if (q.a < 1) ctx.restore();
};
