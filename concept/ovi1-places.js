// ============ IRON MARCHES OVERHAUL, CONCEPT ROUND 1, PANEL 3: PLACES (2026-11-28) ============
// Not in the game. Lab: ovi1-places.html. Notes: concept/ovi1-places.md.
// The war camp, the beacon hill, the quarry and the toll fort / drover's inn, each a PLACE (several pieces arranged,
// the ground worn round them) with its light. A drilled and orderly | B lived-in and muddy | C half-abandoned,
// overgrown. Built on the Greenwood's approved kit (src/render/overhaul/decor-kit.js: its rocks, its pix materials and
// sprite helpers); the Iron pieces are new. Fires are ALWAYS lit; their glow is stronger at sunrise / late / golden.
import { Pix, mat, flat, toCanvas } from "../src/render/pix/pix.js";
import { DAY } from "../src/data/sun.js";
import { nearestOnPath } from "../src/engine/path.js";
import { bakeFrame } from "../src/render/pix/bake.js";
import * as garrisonM from "../src/render/pix/fig-garrison.js";
import * as smithM from "../src/render/pix/fig-smith.js";
import * as levyM from "../src/render/pix/fig-levy.js";
import { lampPost, sprite, spriteL, rockMass, bottoms, silhouette, rng, hash, lerp, M, V, tufts, collar, worn, haystack, woodpile } from "../src/render/overhaul/decor-kit.js";

const F_FRONT = [0, 0.18, 0.98], F_WEST = [-0.85, 0, 0.53], F_EAST = [0.85, 0.05, 0.52], F_TOP = [-0.12, -0.55, 0.83], F_ROOF = [-0.08, -0.32, 0.94];
let MODE = "noon";
const memo = new Map();
const mm = (key, fn) => { const k = key + "|" + DAY.id; let v = memo.get(k); if (!v) { v = fn(); memo.set(k, v); } return v; };


// ---- scaled sculpting: every coordinate and radius is multiplied by k, so a piece reads at the HALLS' scale -----------
class SP {
  constructor(p, k) { this.p = p; this.k = k; }
  part() { this.p.part(); return this; }
  poly(pts, m, z, o) { this.p.poly(pts.map(([x, y]) => [x * this.k, y * this.k]), m, z, o); return this; }
  rect(x, y, w, h, m, z, o) { this.p.rect(x * this.k, y * this.k, w * this.k, h * this.k, m, z, o); return this; }
  line(ax, ay, bx, by, m, z, o) { this.p.line(ax * this.k, ay * this.k, bx * this.k, by * this.k, m, z, o); return this; }
  capsule(ax, ay, ra, bx, by, rb, m, z, o) { const k = this.k; this.p.capsule(ax * k, ay * k, ra * k, bx * k, by * k, rb * k, m, z, o); return this; }
  ellipse(cx, cy, rx, ry, m, z, o) { const k = this.k; this.p.ellipse(cx * k, cy * k, rx * k, ry * k, m, z, o); return this; }
  dot(x, y, m, z, o) { this.p.dot(x * this.k, y * this.k, m, z, o); return this; }
  toneLine(ax, ay, bx, by, d) { const k = this.k; this.p.toneLine(ax * k, ay * k, bx * k, by * k, d); return this; }
  tone(x, y, d) { this.p.tone(x * this.k, y * this.k, d); return this; }
}
const mk = (k, w, h, build, oy = 4) => spriteL(Math.ceil(w * k), Math.ceil(h * k), (px, Lt) => build(new SP(px, k), { win: (x, y, ww, hh) => Lt.win(Math.round(x * k), Math.round(y * k), Math.round(ww * k), Math.round(hh * k)), lamp: (x, y, r, c) => Lt.lamp(x * k, y * k, (r ?? 22) * k, c), paint: (x, y, c) => Lt.paint(Math.round(x * k), Math.round(y * k), c) }), oy * k);
const mkp = (k, w, h, build, oy = 4) => sprite(Math.ceil(w * k), Math.ceil(h * k), (px) => build(new SP(px, k)), oy * k);

// ---- Iron materials -----------------------------------------------------------------------------------------
const I = {
  ox: mat("#8e3030", { contrast: 1.15 }), oxD: mat("#5c1c24", { contrast: 1.1 }), oxL: mat("#b04a42"),
  can: mat("#d6ccb0", { contrast: 0.9 }), canD: mat("#b4a888", { contrast: 0.9 }), canG: mat("#9fa688", { contrast: 0.9 }), canB: mat("#a08c68", { contrast: 0.9 }), canR: mat("#b88a6a", { contrast: 0.9 }),
  steel: mat("#7c8494", { contrast: 1.1 }), steelD: mat("#4c5262", { contrast: 1.1 }), rust: mat("#8a5a3a", { contrast: 1.1 }), brass: mat("#c09a44", { contrast: 1.1 }),
  ash: mat("#9496a0", { contrast: 1.2 }), ashD: mat("#6a6c78", { contrast: 1.2 }), ashL: mat("#b4b6c0", { contrast: 1.1 }),
  coal: flat("#2a2024"), hot: flat("#e0602a", { emis: true }), slate: mat("#5c606c", { contrast: 1.0 }), slateD: mat("#454952", { contrast: 1.0 }),
  mud: mat("#5a4632", { contrast: 0.9 }), purple: mat("#8a5a8a"), purpleD: mat("#64426c"), purpleL: flat("#b883b0"), bracken: mat("#946238"), water: flat("#3a4a58"),
};
const EARTH = ["#6a5a44", "#7a6a50", "#8a7a5c", "#5a4a38"], MUD = ["#4a3a2a", "#5a4632", "#6a5640", "#3a2c20"], FLAG = ["#8c8678", "#a09a8a", "#74705e", "#6a665a"];
const px1 = (c, x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---- live bits drawn straight to canvas: flames, smoke (no outline, like the game's fire) -------------------------------
const FLAME_COLS = ["#b8301c", "#e0601e", "#f89a2c", "#ffd25a", "#fff4b8"];
export const flameSpr = (t, size = 8, lean = 1) => mm(`flame|${t}|${size}|${lean}`, () => {
  const W = Math.ceil(size * 2.4) + 4, H = Math.ceil(size * 2.6) + 4, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), ox = W >> 1, oy = H - 2, R = rng(1000 + t * 31 + size);
  const hh = size * (1.7 + 0.35 * Math.sin(t * 2.1) + 0.2 * Math.sin(t * 5.3)), sway = Math.sin(t * 1.7) * 1.2 + lean * 0.8;
  for (let r = 0; r < hh; r++) {
    const u = r / hh, w = size * 0.62 * Math.pow(1 - u, 0.8) * (1 + 0.28 * Math.sin(r * 0.9 + t * 3.1 + size) + (hash(r, t + size) - 0.5) * 0.35), cx = sway * u * u * 2.2;
    for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
      const d = Math.abs(x) / Math.max(0.5, w); if (d > 1) continue;
      if (d > 0.82 && hash(x + r * 7, t * 5 + size) > 0.55) continue;
      let k = d < 0.28 && u < 0.5 ? 4 : d < 0.45 && u < 0.62 ? 3 : d < 0.72 && u < 0.85 ? 2 : u > 0.88 ? 0 : d > 0.6 ? 0 : 1;
      if (d > 0.35 && d < 0.65 && ((x + r) & 1) && hash(r, x + t) > 0.5) k = Math.max(0, k - 1);
      px1(c, Math.round(ox + cx + x), Math.round(oy - r), FLAME_COLS[k]);
    }
  }
  for (let k = 0; k < Math.max(2, size / 3); k++) { const u = 0.7 + R() * 0.4; px1(c, Math.round(ox + sway * u * 2 + (R() - 0.5) * size * 0.5), Math.round(oy - hh * u - R() * 3), FLAME_COLS[1 + (R() > 0.5 ? 1 : 0)]); }
  return { cv, ox, oy, flame: true };
});
const GREY = [[214, 212, 220], [176, 174, 186], [142, 140, 154], [112, 110, 124]];
// a rising column: puffs placed by phase, lit side up-left, a dithered rim; (t / loop) phase so it loops; wind leans it
export const smokeSpr = (ph, h = 44, wind = 1, o = {}) => mm(`smoke|${Math.round(ph * 24)}|${h}|${wind}|${o.k ?? 1}|${o.dark ?? 0}`, () => {
  const W = Math.ceil(h * 0.9) + 16, H = h + 14, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), ox = 8, oy = H - 3, N = 8, k = (o.k ?? 1) * 1.25;
  for (let n = 0; n < N; n++) {
    const p = (n / N + ph) % 1, rad = (2.4 + p * 6) * k, y = oy - p * h, x = ox + wind * p * p * h * 0.55 + Math.sin(p * 6 + n * 2) * 1.4, a = Math.min(1, p * 5) * (1 - p * 0.9) * 1.05;
    for (let j = -Math.ceil(rad); j <= rad; j++) for (let i = -Math.ceil(rad); i <= rad; i++) {
      const d = Math.hypot(i, j * 1.15) / rad; if (d > 1) continue;
      const q = BAY[((x + i) & 3) + (((y + j) & 3) << 2)] / 16; if (q > a * 1.7 + 0.12) continue;
      const lit = (-i * 0.6 - j * 0.8) / rad, s = Math.max(0, Math.min(3, Math.floor((1.1 - lit) * 1.5 + d * 0.9 + (o.dark ?? 0))));
      const [r, g, b] = GREY[Math.min(3, s)]; c.fillStyle = `rgb(${r},${g},${b})`; c.fillRect(Math.round(x + i), Math.round(y + j), 1, 1);
    }
  }
  return { cv, ox, oy };
});

// ---- the camp ----------------------------------------------------------------------------------------------------
const pennant = (px, x, y, t, len = 11, col = I.ox, z = 4) => {
  const pts = [], pts2 = [];
  for (let i = 0; i <= 4; i++) { const u = i / 4, w = Math.sin(t - u * 3.2) * 1.6 * u; pts.push([x + u * len, y + w]); pts2.push([x + u * len * 0.98, y + 5 * (1 - u * 0.7) + w]); }
  px.part().poly([...pts, ...pts2.reverse()], col, z, { n: F_FRONT });
};
const cloth = (px, x, y, w, h, t, col, z, amp = 1.6, ph = 0) => {
  const top = [], bot = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6, o = Math.sin(t - u * 3.4 + ph) * amp * u; top.push([x + u * w + o * 0.3, y + o]); bot.push([x + u * w + o * 0.3, y + h + o * 1.15]); }
  px.part().poly([...top, ...bot.reverse()], col, z, { n: F_FRONT });
};
// a ridge tent seen from the south: front gable, the east slope receding, the door, guys and pegs
export const tent = (w, h, o = {}) => mm(`tent|${w}|${h}|${JSON.stringify(o)}`, () => mk(2.7, w + 34, h + 34, (px, Lt) => {
  const R = rng(o.seed ?? 3), c1 = o.c1 ?? I.can, c2 = o.c2 ?? I.ox, L = -w / 2, Rr = w / 2, d = w * 0.34, half = (u) => Rr * (1 - u / h);
  const sag = o.torn ? 0.55 : 1;
  px.part().poly([[Rr, 0], [Rr * 0.12, -h * sag], [Rr + d, -h * sag * 0.34], [Rr + d, 0]], o.sideC ?? c1, 1.5, { n: F_EAST });
  px.part().poly([[L, 0], [0, -h * sag], [Rr * 0.12, -h * sag + 1], [Rr, 0]], c1, 2, { n: F_FRONT, round: 0.3 });
  if (o.stripe !== false && !o.torn) { const u0 = h * 0.46, u1 = h * 0.6; px.part().poly([[-half(u0), -u0], [half(u0), -u0], [half(u1), -u1], [-half(u1), -u1]], c2, 2.2, { n: F_FRONT }); }
  if (o.torn) {
    px.part().poly([[-w * 0.22, -h * 0.5], [w * 0.1, -h * 0.55], [w * 0.28, -h * 0.1], [-w * 0.1, -h * 0.05]], V.hole, 2.3);
    px.part().capsule(w * 0.35, 0, 0.9, -w * 0.15, -h * 0.9, 0.8, V.woodD, 2.6, { limb: false });
  } else {
    px.part().poly([[-3.5, 0], [0, -h * 0.72], [3.5, 0]], V.hole, 2.2);
    if (o.lit) { px.part().poly([[-2.4, 0], [0, -h * 0.5], [2.4, 0]], V.lampD, 2.25); Lt.lamp(0, -3, 20, "#ffb24a"); }
    px.part().poly([[-3.5, 0], [-6, 0], [-1.5, -h * 0.55], [-2.5, -h * 0.3]], c1, 2.4, { n: F_WEST }); px.part().poly([[3.5, 0], [6, 0], [1.5, -h * 0.55], [2.5, -h * 0.3]], c1, 2.4, { n: F_EAST });
  }
  for (let k = 0; k < (o.patches ?? 0); k++) { const u = h * (0.15 + R() * 0.45), x = (R() - 0.5) * half(u) * 1.2; px.part().rect(x - 2, -u - 2, 4, 3, [I.canB, I.canG, I.canR][k % 3], 2.5, { n: F_FRONT }); px.toneLine(x - 2, -u - 1, x + 1, -u - 1, -1); }
  px.part().line(0, -h * sag, 0, -h * sag - 4, V.woodD, 3);
  if (o.pennant !== false && !o.torn) pennant(px, 0.5, -h - 3.5, o.t ?? 0, 9, o.flag ?? I.ox);
  for (const x of [L - 5, Rr + d + 5]) { px.part().line(x < 0 ? L + 1 : Rr + d - 1, -1, x, 1.5, I.canD, 3); px.part().line(x, 2.5, x, 0.2, V.peg, 3.1); }
  for (let x = L; x < Rr + d; x += 1) px.tone(x, -0.5, -1);
  if (o.moss) for (let k = 0; k < 7; k++) px.ellipse((R() - 0.5) * w, -R() * h * 0.5 - 1, 2 + R() * 2, 1 + R(), I.canG, 2.6, { wrap: true });
  tufts(px, L - 2, Rr + d + 2, 0, R, 0.5, 3.3, { every: 3, front: 0.6 });
}, 6));
export const pavilion = (w, h, o = {}) => mm(`pav|${w}|${h}|${JSON.stringify(o)}`, () => mk(2.3, w + 34, h + 40, (px, Lt) => {
  const c1 = o.c1 ?? I.can, c2 = o.c2 ?? I.ox, L = -w / 2, Rr = w / 2, wh = h * 0.42;
  px.part().poly([[L, 0], [Rr, 0], [Rr, -wh], [L, -wh]], c1, 2, { n: F_FRONT, round: 0.95 });
  px.part().poly([[L, 0], [Rr, 0], [Rr, -wh * 0.22], [L, -wh * 0.22]], c2, 2.1, { round: 0.3 });
  px.part().poly([[L, -wh], [Rr, -wh], [Rr, -wh * 0.88], [L, -wh * 0.88]], I.brass, 2.15, { round: 0.3 });
  px.part().poly([[L - 3, -wh], [Rr + 3, -wh], [0, -h]], c2, 3, { n: F_ROOF, round: 0.7 });
  px.part().line(L - 3, -wh, 0, -h, I.brass, 3.1); px.part().line(Rr + 3, -wh, 0, -h, I.brass, 3.1);
  for (const x of [-w * 0.2, w * 0.2]) px.part().line(x * 1.2, -wh, x * 0.15, -h + 1, I.oxL, 3.05);
  for (let x = L - 3; x < Rr + 3; x += 4) px.part().poly([[x, -wh], [x + 4, -wh], [x + 2, -wh + 3]], I.brass, 3.2);
  px.part().poly([[-4, 0], [4, 0], [3.2, -wh * 0.9], [-3.2, -wh * 0.9]], V.hole, 2.3);
  if (o.lit !== false) { px.part().poly([[-2.6, 0], [2.6, 0], [2, -wh * 0.7], [-2, -wh * 0.7]], V.lampD, 2.35); Lt.lamp(0, -4, 26, "#ffb24a"); }
  px.part().line(0, -h, 0, -h - 11, V.woodD, 4); pennant(px, 0.5, -h - 11, o.t ?? 0, 12, o.flag ?? I.ox);
  for (const x of [L - 4, Rr + 4]) { px.part().line(x < 0 ? L : Rr, -wh, x, 1, I.canD, 3); px.part().line(x, 2, x, 0, V.peg, 3.1); }
}, 5));
// a standard: tall pole, a crossbar, a hanging oxblood banner with a steel chevron and a brass finial
export const standard = (t, o = {}) => mm(`std|${Math.round(t * 8)}|${JSON.stringify(o)}`, () => mkp(2.0, 34, (o.h ?? 34) + 16, (px) => {
  const h = o.h ?? 34, R = rng(o.seed ?? 5), lean = o.lean ?? 0, col = o.col ?? I.ox;
  px.part().capsule(0, 0.5, 1.2, lean, -h, 1, V.woodD, 2);
  px.part().ellipse(0, -0.3, 3, 1.4, V.rubble, 1.8, { round: 0.7 });
  px.part().ellipse(lean, -h - 1.5, 1.4, 1.4, I.brass, 2.5, { round: 0.9 });
  if (o.torn) { px.part().poly([[lean + 1, -h + 2], [lean + 6, -h + 3], [lean + 3, -h + 10], [lean + 5, -h + 14], [lean + 1, -h + 11]], col, 2.6, { n: F_FRONT }); return; }
  px.part().line(lean, -h + 2, lean + 11, -h + 2, V.woodD, 2.4);
  cloth(px, lean + 1, -h + 3, 10, 15, t, col, 2.6, o.amp ?? 1.7, o.ph ?? 0);
  px.part().poly([[lean + 2.5, -h + 7], [lean + 6, -h + 11], [lean + 9.5, -h + 7], [lean + 9.5, -h + 9], [lean + 6, -h + 13], [lean + 2.5, -h + 9]], I.steel, 2.8, { n: F_FRONT });
  tufts(px, -3, 3, 0, R, 0.5, 3.2, { every: 3 });
}, 3));
// an iron fire basket on a post (A's drill ground), flame laid on after
export const brazierPost = (h = 18) => mm(`brp|${h}`, () => mk(2.2, 24, h + 16, (px, Lt) => {
  px.part().capsule(0, 0.5, 1.2, 0, -h, 1, I.steelD, 2); px.part().ellipse(0, -0.3, 3.4, 1.6, V.rubble, 1.8, { round: 0.7 });
  px.part().poly([[-5, -h - 1], [5, -h - 1], [3, -h + 3], [-3, -h + 3]], I.steelD, 2.4, { n: F_FRONT });
  px.part().ellipse(0, -h - 1, 5, 1.6, I.coal, 2.5); for (const x of [-3, 0, 3]) px.dot(x, -h - 1, I.hot, 2.6);
  for (const x of [-4, 4]) px.part().line(x, -h + 3, x * 0.6, -h + 6, I.steelD, 2.2);
  Lt.lamp(0, -h - 3, 34, "#ff9a3a");
}, 3));
// a tripod and cauldron over a fire, log seats round it
export const cauldron = (o = {}) => mm(`caul|${JSON.stringify(o)}`, () => mk(2.1, 44, 40, (px, Lt) => {
  const R = rng(o.seed ?? 4);
  for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.28; px.part().ellipse(Math.cos(a) * 7.5, -2 + Math.sin(a) * 3, 2.2, 1.6, V.rubble, 1 + Math.sin(a), { round: 0.9 }); }
  for (const [x, lx] of [[-9, -2], [9, 2], [0, 0]]) px.part().capsule(x, x === 0 ? 1 : 0, 1, lx * 0.2, -22, 0.8, V.woodD, x === 0 ? 3 : 2);
  px.part().line(0, -22, 0, -16, I.steelD, 3.1);
  if (!o.cold) { px.part().ellipse(0, -13, 5, 4.2, I.steelD, 3.2, { round: 0.9 }); px.part().ellipse(0, -16, 4.6, 1.4, I.coal, 3.3); px.part().ellipse(0, -16.2, 3.6, 0.9, o.broth ?? V.fire, 3.35); }
  else { px.part().ellipse(5, -3, 4.5, 3.6, I.rust, 3.2, { round: 0.9 }); px.part().ellipse(5, -5.5, 4, 1.2, I.coal, 3.3); }
  for (const [x, y] of o.logs ?? [[-12, 1], [12, 2]]) { px.part().capsule(x - 3, y, 1.8, x + 3, y, 1.8, V.wood, 4, { round: 0.9 }); px.dot(x + 3, y, V.woodL, 4.1); }
  for (let k = 0; k < 3; k++) px.part().capsule(-4 + k * 3, -2, 1.1, -1 + k, -5, 0.9, V.woodD, 1.5);
  tufts(px, -14, 14, 0.5, R, 1.5, 4.2, { every: 3.5, front: 0.5 });
  if (!o.cold) Lt.lamp(0, -4, 36, "#ff9a3a"); else Lt.lamp(0, -3, 12, "#ff7a2a");
}, 4));
// a sharpened picket line, a rope along it (a straight run of len art px)
export const stakes = (len, o = {}) => mm(`stk|${len}|${JSON.stringify(o)}`, () => mkp(1.8, len + 16, 24, (px) => {
  const R = rng(o.seed ?? 6), n = Math.floor(len / (o.gap ?? 4)), x0 = -len / 2;
  for (let k = 0; k <= n; k++) {
    if (o.gone && R() > 0.6) continue;
    const x = x0 + k * (o.gap ?? 4) + (R() - 0.5) * (o.wob ?? 0.6), hh = (o.h ?? 10) * (1 - (o.ragged ?? 0) * R()), lean = (R() - 0.5) * (o.lean ?? 0.6) * 2 + (o.slope ?? 0) * (k - n / 2) * 0.2;
    px.part().poly([[x - 1.1, 0], [x + 1.1, 0], [x + 1.1 + lean, -hh + 3], [x + lean, -hh - 0.5], [x - 1.1 + lean, -hh + 3]], V.wood, 2 + (k % 2) * 0.01, { n: F_FRONT, round: 0.5 });
    px.toneLine(x - 0.5, -1, x - 0.5 + lean, -hh + 3, 1);
  }
  px.part().line(x0, -(o.h ?? 10) * 0.45, x0 + n * (o.gap ?? 4), -(o.h ?? 10) * 0.45 + 0.5, I.canD, 3);
  tufts(px, x0 - 2, x0 + n * (o.gap ?? 4) + 2, 0.5, R, 0.5, 3.4, { every: 3, front: 0.6, h0: 1, h: 2 });
}, 4));
export const rack = (o = {}) => mm(`rack|${JSON.stringify(o)}`, () => mkp(2.2, 34, 40, (px) => {
  const R = rng(o.seed ?? 7), n = o.n ?? 7;
  px.part().capsule(-9, 0, 1.1, -7, -9, 1, V.woodD, 2); px.part().capsule(9, 0, 1.1, 7, -9, 1, V.woodD, 2); px.part().line(-8, -7, 8, -7, V.wood, 2.2);
  for (let k = 0; k < n; k++) {
    const x = -8 + k * (16 / (n - 1)), tx = (k - (n - 1) / 2) * 1.7 + (o.fall ? (R() - 0.5) * 6 : 0), top = -24 - R() * 3 * (o.fall ? 3 : 1);
    px.part().line(x, -3, tx, top, V.woodL, 3 + (k % 2) * 0.01); px.part().poly([[tx - 1, top], [tx + 1, top], [tx, top - 3]], o.rust ? I.rust : I.steel, 3.2);
  }
  if (!o.fall) { px.part().ellipse(-7, -3.5, 3.5, 3.6, I.ox, 3.4, { round: 0.9 }); px.part().ellipse(-7, -3.5, 1, 1, I.brass, 3.5); px.part().ellipse(7, -3.5, 3.5, 3.6, I.steel, 3.4, { round: 0.9 }); }
  tufts(px, -11, 11, 0.5, R, 1, 3.8, { every: 3 });
}, 3));
export const crates = (o = {}) => mm(`crates|${JSON.stringify(o)}`, () => mkp(2.2, 40, 30, (px) => {
  const R = rng(o.seed ?? 9);
  const crate = (x, y, w, h, z) => { px.part().rect(x - w / 2, y - h, w, h, V.wood, z, { n: F_FRONT }); px.part().poly([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - 1.5, y - h - 2.5], [x - w / 2 + 1.5, y - h - 2.5]], V.woodL, z + 0.01, { n: F_TOP }); px.toneLine(x - w / 2, y - h / 2, x + w / 2 - 1, y - h / 2, -1); };
  const barrel = (x, y, z) => { px.part().ellipse(x, y - 4, 3.6, 4.6, V.wood, z, { round: 0.9 }); px.part().ellipse(x, y - 8.2, 3.2, 1.2, V.woodL, z + 0.01); px.toneLine(x - 3, y - 5.5, x + 3, y - 5.5, -1); px.toneLine(x - 3, y - 2.5, x + 3, y - 2.5, -1); };
  crate(-8, 0, 10, 8, 2); crate(4, 0, 9, 7, 2); barrel(14, 1, 2.2); crate(-6, -8, 8, 6, 2.5); if (o.sacks !== false) { px.part().ellipse(-14, -2, 4, 2.8, I.canB, 2.1, { round: 0.9 }); px.part().ellipse(-12, -5, 3.6, 2.6, I.can, 2.2, { round: 0.9 }); }
  if (o.broken) px.part().capsule(6, -7, 1, 12, -2, 1, V.woodD, 3);
  tufts(px, -17, 17, 0.5, R, 1, 3.4, { every: 3 });
}, 3));
export const wagon = (o = {}) => mm(`wagon|${JSON.stringify(o)}`, () => mkp(2.3, 70, 46, (px) => {
  const R = rng(o.seed ?? 11), bw = 26;
  const wheel = (x, z, tilt = 0) => { px.part().ellipse(x, -6.5 + tilt, 6.5, 6.5, V.woodD, z, { round: 0.9 }); px.part().ellipse(x, -6.5 + tilt, 4.6, 4.6, V.hole, z + 0.05); for (let a = 0; a < 3.14; a += 0.8) px.part().line(x + Math.cos(a) * 4.6, -6.5 + tilt + Math.sin(a) * 4.6, x - Math.cos(a) * 4.6, -6.5 + tilt - Math.sin(a) * 4.6, V.woodL, z + 0.1); px.dot(x, -6.5 + tilt, I.steelD, z + 0.2); };
  wheel(-11, 1.8); px.part().rect(-bw / 2, -17, bw, 8, V.wood, 2, { n: F_FRONT }); px.toneLine(-bw / 2 + 1, -13, bw / 2 - 1, -13, -1); px.part().poly([[-bw / 2, -17], [bw / 2, -17], [bw / 2 - 2, -19], [-bw / 2 + 2, -19]], V.woodL, 2.05, { n: F_TOP });
  if (!o.bare) { px.part().ellipse(0, -20, bw / 2 - 1, 8.5, o.cover ?? I.can, 2.4, { round: 0.85 }); px.part().poly([[-bw / 2 + 1, -18], [bw / 2 - 1, -18], [bw / 2 - 1, -12], [-bw / 2 + 1, -12]], o.cover ?? I.can, 2.3); for (const x of [-8, 0, 8]) px.toneLine(x, -27, x + (x < 0 ? -1 : 1), -18, -1); px.part().ellipse(-bw / 2 + 2, -17.5, 1.6, 4, V.hole, 2.5); if (o.stripe !== false) px.part().poly([[-bw / 2 + 2, -23], [bw / 2 - 2, -23], [bw / 2 - 2, -21], [-bw / 2 + 2, -21]], I.ox, 2.5); }
  else for (let k = 0; k < 4; k++) px.part().capsule(-9 + k * 6, -19, 0.9, -9 + k * 6, -24 - (o.broken ? k : 0), 0.9, V.woodD, 2.4);
  wheel(11, 3, o.broken ? 3 : 0); px.part().capsule(bw / 2, -13, 1, bw / 2 + 12, -6, 0.9, V.woodD, 2.2);
  tufts(px, -20, 22, 0.5, R, 1, 4, { every: 3 });
}, 3));
// a washing line between two poles (B)
export const washLine = (t) => mm(`wash|${Math.round(t * 8)}`, () => mkp(1.9, 60, 34, (px) => {
  px.part().capsule(-24, 0, 1, -24, -22, 0.9, V.woodD, 2); px.part().capsule(24, 0, 1, 24, -22, 0.9, V.woodD, 2); px.part().line(-24, -21, 24, -19, I.canD, 2.2);
  [[-16, I.can, 9, 12], [-4, I.canB, 7, 10], [7, I.ox, 8, 9], [18, I.can, 7, 11]].forEach(([x, c, w, h], i) => cloth(px, x, -20, w, h, t * 1 + i * 1.1, c, 2.4, 1.2));
}, 3));
// a forge: stone hearth under a lean-to roof, an anvil, a glowing bed (A: slate and neat; B: sooty; C: cold)
export const forge = (o = {}) => mm(`forge|${JSON.stringify(o)}`, () => mk(2.4, 56, 56, (px, Lt) => {
  const R = rng(o.seed ?? 8);
  px.part().rect(-13, -14, 26, 14, V.mason, 1.6, { n: F_FRONT }); for (let y = -12, k = 0; y < 0; y += 3, k++) { px.toneLine(-13, y, 12, y, -1); for (let x = -12 + (k % 2) * 3; x < 12; x += 6) px.toneLine(x, y, x, y + 2, -1); }
  px.part().rect(-5, -11, 10, 7, I.coal, 2, { n: F_FRONT }); if (!o.cold) { for (const [x, y] of [[-3, -5], [0, -6], [3, -5], [-1.5, -7.5], [1.5, -8]]) px.dot(x, y, I.hot, 2.3); Lt.lamp(0, -7, 28, "#ff7a2a"); } else for (const x of [-2, 2]) px.dot(x, -5, I.ashD, 2.3);
  for (const x of [-16, 16]) px.part().capsule(x, 0, 1.3, x, -26, 1.2, V.woodD, 2.5);
  px.part().poly([[-19, -26], [19, -26], [17, -32], [-17, -32]], o.roof ?? I.slate, 3, { n: F_ROOF }); px.part().poly([[-19, -26], [19, -26], [19, -28], [-19, -28]], (o.roof ?? I.slate) === I.slate ? I.slateD : V.woodD, 3.05, { n: F_FRONT });
  for (let x = -17; x < 17; x += 4) px.toneLine(x, -31, x + 1, -27, -1);
  px.part().poly([[-9, -14], [-9, -26], [-6, -26], [-6, -14]], I.ashD, 2.2);   // chimney throat
  px.part().rect(-8, -34, 5, 8, V.chim, 3.1, { n: F_FRONT });
  px.part().poly([[8, -2], [15, -2], [14, -5], [9, -5]], I.steelD, 3.5, { n: F_TOP }); px.part().rect(10, -2, 3, 2, I.steelD, 3.4);
  px.part().ellipse(-10, -1.5, 3.2, 2, V.woodL, 3.6, { round: 0.9 }); px.part().line(-14, -4, -12, -8, I.steel, 3.7);
  tufts(px, -18, 18, 0.5, R, 1, 4, { every: 3 });
}, 4));

// ---- stone: toll fort, drover's inn, beacon, quarry --------------------------------------------------------------
const coursed = (px, x0, y0, w, h, ch, seed, z, o = {}) => {
  const R = rng(seed);
  for (let y = y0 + ch, k = 0; y < y0 + h; y += ch, k++) {
    px.toneLine(x0, y, x0 + w - 1, y, -1); px.toneLine(x0 + 1, y - 1, x0 + w - 2, y - 1, 1);
    for (let x = x0 + 2 + (k % 2) * 3 + Math.floor(R() * 2); x < x0 + w - 1; x += 5 + Math.floor(R() * 3)) px.toneLine(x, y - ch + 1, x, y - 1, -1);
  }
  if (o.stain) for (let k = 0; k < w / 6; k++) { const x = x0 + R() * w, yy = y0 + R() * h * 0.4; px.toneLine(x, yy, x + (R() - 0.5), yy + 3 + R() * 6, -1); }
};
// the toll fort: a small keep with a gate arch, wings of wall, a barrier pole and a toll hut at the road
export const fort = (o = {}) => mm(`fort|${JSON.stringify(o)}`, () => mk(2.6, 120, 96, (px, Lt) => {
  const R = rng(o.seed ?? 21), st = o.stone ?? I.ash, st2 = o.stone2 ?? I.ashD, kw = 16, kh = o.ruin ? 40 : 52, wh = 22, ww = o.ruin ? 26 : 13;
  const wall = (x0, x1, h, z) => { px.part().poly([[x0, 0], [x1, 0], [x1, -h], [x0, -h]], st, z, { n: F_FRONT }); coursed(px, Math.min(x0, x1), -h, Math.abs(x1 - x0), h, 4, o.seed ?? 21, z, { stain: true }); };
  // wings
  wall(-kw - ww, -kw, wh, 1.8); wall(kw, kw + ww, o.ruin ? wh - 8 : wh, 1.8);
  px.part().poly([[kw + ww, 0], [kw + ww + 7, 0], [kw + ww + 7, -(o.ruin ? wh - 8 : wh) + 3], [kw + ww, -(o.ruin ? wh - 8 : wh)]], st2, 1.7, { n: F_EAST });
  // walkway tops + merlons
  const mer = (x0, x1, y, z, skip = 0) => { for (let x = x0; x < x1 - 2; x += 5) { if (skip && R() < skip) continue; px.part().rect(x, y - 4, 3, 4, st, z, { n: F_FRONT }); px.part().rect(x, y - 5, 3, 1, I.ashL, z + 0.01, { n: F_TOP }); } px.part().rect(x0, y - 1, x1 - x0, 1, st2, z, { n: F_FRONT }); };
  mer(-kw - ww, -kw, -wh, 2, o.ruin ? 0.35 : 0); mer(kw, kw + ww - 2, -(o.ruin ? wh - 8 : wh), 2, o.ruin ? 0.5 : 0);
  // keep: front face, east face, top, merlons, banner
  px.part().poly([[kw, 0], [kw + 8, 0], [kw + 8, -kh + 4], [kw, -kh]], st2, 2.0, { n: F_EAST });
  px.part().poly([[-kw, 0], [kw, 0], [kw, -kh], [-kw, -kh]], st, 2.4, { n: F_FRONT });
  coursed(px, -kw, -kh, 2 * kw, kh, 4, (o.seed ?? 21) + 3, 2.4, { stain: true });
  px.part().poly([[-kw, -kh], [kw, -kh], [kw + 8, -kh + 4], [-kw + 8, -kh + 4]], I.ashL, 2.5, { n: F_TOP });
  if (o.ruin) { px.part().poly([[-kw, -kh], [-kw + 7, -kh - 3], [-kw + 11, -kh + 6], [-kw + 20, -kh + 2], [kw - 3, -kh + 10], [kw, -kh + 6], [kw, -kh], [kw + 8, -kh + 4], [kw - 2, -kh + 14]], V.hole, 2.55); }
  else { mer(-kw - 1, kw + 2, -kh, 2.6); }
  // gate arch, portcullis, lit
  px.part().poly([[-6, 0], [6, 0], [6, -15], [4, -19], [0, -21], [-4, -19], [-6, -15]], V.hole, 2.7);
  if (!o.ruin) { for (let x = -5; x <= 5; x += 2) px.toneLine(x, -2, x, -15, 1); for (let y = -4; y > -16; y -= 4) px.toneLine(-5, y, 5, y, 1); }
  px.part().poly([[-9, 0], [-6, 0], [-6, -15], [-4, -19], [0, -21], [-1, -23], [-5, -21], [-9, -15]], I.ashL, 2.65, { n: F_FRONT });   // voussoirs rim
  // slit windows, lit (the garrison keeps a lamp)
  for (const [x, y] of [[-8, -34], [8, -34], [0, -42]]) { if (o.ruin && x !== 8) continue; px.part().rect(x - 1, y, 2, 6, V.hole, 2.8); Lt.win(x - 1, y + 2, 2, 4); }
  if (!o.ruin) { px.part().line(0, -kh, 0, -kh - 15, V.woodD, 3); cloth(px, 1, -kh - 14, 12, 10, o.t ?? 0, o.flag ?? I.ox, 3.1, 1.7); px.part().poly([[3, -kh - 12], [7, -kh - 9], [11, -kh - 12], [11, -kh - 10], [7, -kh - 7], [3, -kh - 10]], I.steel, 3.2); }
  // gate braziers (A) / a single lantern (C) / torch (B)
  const lampAt = (x, y, r, col) => { px.part().capsule(x, 0, 1, x, -9, 0.9, I.steelD, 3.2); px.part().poly([[x - 3, -10], [x + 3, -10], [x + 2, -7], [x - 2, -7]], I.steelD, 3.3); Lt.lamp(x, -12, r, col); };
  if (o.braziers) { lampAt(-12, 0, 30, "#ff9a3a"); lampAt(12, 0, 30, "#ff9a3a"); }
  if (o.lantern) { px.part().line(8, -17, 8, -14, I.steelD, 3.4); px.part().rect(6.5, -14, 3, 4, V.pane, 3.45); px.part().rect(6.5, -15, 3, 1, I.steelD, 3.46); Lt.lamp(8, -12, 22, "#ffb24a"); }
  // rubble
  if (o.ruin) for (let k = 0; k < 9; k++) px.part().ellipse(-30 + R() * 80, -1 - R() * 2, 2 + R() * 2.4, 1.4 + R(), R() > 0.5 ? st : st2, 3.4, { round: 0.8 });
  tufts(px, -kw - ww - 3, kw + ww + 8, 0.5, R, 1, 4, { every: 3, front: 0.6 });
  if (o.ivy) for (let k = 0; k < 18; k++) px.ellipse(-kw - ww + R() * (2 * kw + 2 * ww), -R() * kh * 0.7, 2 + R() * 2.5, 1.5 + R() * 2, o.ivy, 3.0, { wrap: true });
}, 4));
// a barrier pole, red / white, hinged at a post, with a counterweight (raised or down)
export const barrier = (o = {}) => mm(`bar|${JSON.stringify(o)}`, () => mkp(2.2, 70, 40, (px) => {
  const R = rng(5), up = o.up ?? 0.35, len = 30;
  px.part().capsule(-len / 2 - 3, 0, 1.6, -len / 2 - 3, -10, 1.4, V.woodD, 2); px.part().ellipse(-len / 2 - 3, -0.3, 3.4, 1.4, V.rubble, 1.8, { round: 0.7 });
  const x0 = -len / 2 - 3, y0 = -9, ex = x0 + Math.cos(up) * len, ey = y0 - Math.sin(up) * len;
  if (o.snapped) { const mx = x0 + Math.cos(up) * len * 0.45, my = y0 - Math.sin(up) * len * 0.45; px.part().capsule(x0, y0, 1.3, mx, my, 1.1, V.wood, 3); px.part().capsule(mx + 6, -2, 1.1, mx + 14, -3, 1.1, V.woodD, 3); return; }
  for (let k = 0; k < 6; k++) { const a = k / 6, b = (k + 1) / 6; px.part().capsule(lerp(x0, ex, a), lerp(y0, ey, a), 1.3, lerp(x0, ex, b), lerp(y0, ey, b), 1.3, k % 2 ? I.can : I.ox, 3 + k * 0.01, { limb: false }); }
  px.part().ellipse(x0 - 4, y0 + 3, 2.4, 2.4, I.steelD, 3.1, { round: 0.9 }); px.part().line(x0, y0, x0 - 4, y0 + 3, I.steelD, 3.05);
  tufts(px, x0 - 4, x0 + 4, 0.5, R, 1, 3.4, { every: 3 });
}, 3));
// the drover's inn: a long low house, gable end south, slate roof, a chimney, a hanging sign, lit windows
export const inn = (o = {}) => mm(`inn|${JSON.stringify(o)}`, () => mk(2.6, 90, 84, (px, Lt) => {
  const R = rng(o.seed ?? 31), hw = 17, wall = 17, apex = o.ruin ? 9 : 15, D = 22, rc = o.roof ?? I.slate, rcE = o.roofE ?? I.slateD;
  // the long east side (the roof running back up the page)
  px.part().poly([[hw, 0], [hw + D, -D * 0.34], [hw + D, -wall - D * 0.34], [hw, -wall]], V.mason, 1.4, { n: F_EAST });
  px.part().rect(-hw, -wall, hw * 2, wall, V.mason, 2, { n: F_FRONT });
  coursed(px, -hw, -wall, hw * 2, wall, 4, 33, 2, { stain: true });
  // gable and the roof running back
  if (o.ruin) { px.part().poly([[-hw - 2, -wall], [-hw - 2, -wall - 5], [-4, -wall - apex + 1], [4, -wall - 4], [hw + 2, -wall - 2], [hw + 2, -wall]], V.rubble, 2.2, { n: F_FRONT }); }
  else { px.part().poly([[-hw - 2, -wall], [0, -wall - apex], [hw + 2, -wall]], V.rubble, 2.2, { n: F_FRONT }); px.part().poly([[0, -wall - apex], [hw + 2, -wall], [hw + D + 3, -wall - D * 0.34], [D * 0.45 + 2, -wall - apex - D * 0.34]], rcE, 2.3, { n: F_ROOF }); for (let k = 0; k < 5; k++) px.toneLine(4 + k * 6, -wall - apex + 3 - k * 2, 6 + k * 6, -wall + 1 - k * 2.2, -1); px.part().line(-hw - 2, -wall, 0, -wall - apex, rc, 2.4); px.part().line(0, -wall - apex, hw + 2, -wall, rc, 2.4); }
  // door and windows, a hearth glow
  px.part().poly([[-3, 0], [3, 0], [3, -9], [0, -11], [-3, -9]], o.lit === false ? V.hole : V.doorR, 2.4); px.dot(2, -4, I.brass, 2.5);
  for (const x of [-12, 7]) { px.part().rect(x, -14, 5, 6, V.hole, 2.4); Lt.win(x, -13, 5, 5); px.part().rect(x - 1, -14, 1, 6, V.woodD, 2.45); px.part().rect(x + 5, -14, 1, 6, V.woodD, 2.45); }
  Lt.win(-1.5, -wall - 7, 3, 4);
  // chimney and its flue
  px.part().rect(hw - 8, -wall - apex - 11, 6, 13, V.chim, 2.0, { n: F_FRONT }); px.part().rect(hw - 9, -wall - apex - 12, 8, 2, V.mason, 2.1);
  // sign on a bracket, with a lantern
  px.part().line(hw + 1, -wall + 1, hw + 8, -wall + 1, I.steelD, 3); px.part().rect(hw + 2, -wall + 3, 9, 7, V.sign, 3.1, { n: F_FRONT }); px.part().ellipse(hw + 6.5, -wall + 6.5, 2.2, 2.2, I.brass, 3.2, { round: 0.9 });
  if (!o.ruin) { px.part().line(-hw - 1, -14, -hw - 6, -14, I.steelD, 3); px.part().rect(-hw - 8, -13, 3, 4, V.pane, 3.2); Lt.lamp(-hw - 7, -11, 30, "#ffb24a"); }
  else { px.part().line(-hw - 1, -14, -hw - 6, -14, I.steelD, 3); px.part().rect(-hw - 8, -13, 3, 4, V.pane, 3.2); Lt.lamp(-hw - 7, -11, 20, "#ffb24a"); }
  // foot: stone plinth, turf, mud
  px.part().rect(-hw - 1, -2, hw * 2 + 2, 2, V.mason, 2.2, { n: F_FRONT });
  if (o.ivy) for (let k = 0; k < 16; k++) px.ellipse(-hw + R() * hw * 2, -R() * wall, 2 + R() * 2.5, 1.5 + R() * 2, o.ivy, 2.6, { wrap: true });
  tufts(px, -hw - 3, hw + D + 2, 0.5, R, 1, 4, { every: 3, front: 0.6 });
}, 4));
export const trough = () => mm("trough", () => mkp(2.0, 30, 16, (px) => { px.part().rect(-10, -5, 20, 5, V.wood, 2, { n: F_FRONT }); px.part().rect(-9, -6, 18, 2, I.water, 2.1); px.toneLine(-9, -6, 8, -6, 1); for (const x of [-9, 8]) px.part().rect(x, -2, 2, 2, V.woodD, 2.2); tufts(px, -12, 12, 0.5, rng(2), 1, 3, { every: 3 }); }, 3));
export const signboard = (t = 0) => mm(`sgn|${Math.round(t * 4)}`, () => mkp(2.0, 24, 38, (px) => { px.part().capsule(0, 0, 1.2, 0, -26, 1, V.woodD, 2); px.part().rect(-8, -26, 16, 10, V.wood, 3, { n: F_FRONT }); px.part().rect(-7, -25, 14, 8, I.oxD, 3.1, { n: F_FRONT }); px.toneLine(-5, -22, 4, -22, 1); px.toneLine(-5, -20, 2, -20, 1); tufts(px, -4, 4, 0.5, rng(3), 1, 3, { every: 3 }); }, 3));
// a beacon: a stone drum with a fire cage and its pole, a woodstack, a ladder; the flame is drawn live over it
export const beaconDrum = (o = {}) => mm(`bcn|${JSON.stringify(o)}`, () => mk(3.3, 70, 80, (px, Lt) => {
  const R = rng(o.seed ?? 41), rx = 15, ry = 6, h = o.h ?? 22, st = o.stone ?? I.ash, st2 = o.stone2 ?? I.ashD;
  px.part().ellipse(0, -1, rx + 5, ry + 2, I.ashD, 1, { round: 0.8 });
  // the drum: a front face between two ellipses
  px.part().poly([[-rx, -h + 1], [rx, -h + 1], [rx, -2], [-rx, -2]], st, 2, { n: F_FRONT, round: 0.75 });
  px.part().ellipse(0, -2, rx, ry, st, 2, { round: 0.6, ny: 0.2 });
  coursed(px, -rx, -h, rx * 2, h - 2, 4, o.seed ?? 41, 2, { stain: true });
  px.part().ellipse(0, -h, rx, ry, I.ashL, 2.4, { round: 0.6, ny: -0.6 });
  px.part().ellipse(0, -h, rx - 3, ry - 2, I.coal, 2.5);
  if (o.ruin) for (let k = 0; k < 4; k++) px.part().rect(-rx + k * 9, -h - 2 - R() * 2, 5, 3, st2, 2.6, { n: F_FRONT });
  // the iron cage: three bars either side and a ring, the pole behind
  px.part().capsule(0, -h, 1.4, 0, -h - 18, 1.2, V.woodD, 2.2);
  for (const x of [-9, -5, 5, 9]) px.part().line(x, -h + 1, x * 0.6, -h - 11, I.steelD, 3.1);
  px.part().ellipse(0, -h - 11, 6, 1.8, I.steelD, 3.2, { round: 0.8 }); px.part().ellipse(0, -h - 11, 4.6, 1.1, I.coal, 3.3);
  // the stair slot / door at the foot
  px.part().poly([[-3, -2], [3, -2], [3, -9], [0, -11], [-3, -9]], V.hole, 2.7);
  if (!o.cold) Lt.lamp(0, -h - 14, 54, "#ff8a2a");
  tufts(px, -rx - 4, rx + 4, 0.5, R, 1, 4, { every: 3, front: 0.7 });
}, 4));
// cut stone: a dressed block stack (A), spoil (B), a toppled crane (C)
export const blocks = (n = 6, o = {}) => mm(`blk|${n}|${JSON.stringify(o)}`, () => mkp(2.4, 50, 36, (px) => {
  const R = rng(o.seed ?? 51), st = o.m ?? I.ash;
  const bk = (x, y, w, h, z) => { px.part().rect(x - w / 2, y - h, w, h, st, z, { n: F_FRONT }); px.part().poly([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 + 3, y - h - 2.5], [x - w / 2 + 3, y - h - 2.5]], I.ashL, z + 0.01, { n: F_TOP }); px.part().poly([[x + w / 2, y - h], [x + w / 2 + 3, y - h - 2.5], [x + w / 2 + 3, y - 2.5], [x + w / 2, y]], I.ashD, z, { n: F_EAST }); px.toneLine(x - w / 2 + 1, y - h / 2, x + w / 2 - 1, y - h / 2 + (R() - 0.5), -1); };
  let k = 0;
  if (o.tidy !== false) { for (let r = 0; r < 3 && k < n; r++) for (let c = 0; c < 3 - r && k < n; c++, k++) bk(-10 + c * 11 + r * 5.5, -r * 7, 10, 7, 2 + r * 0.1); }
  else for (; k < n; k++) bk(-12 + R() * 24, -R() * 6, 6 + R() * 6, 4 + R() * 4, 2 + R() * 2);
  tufts(px, -18, 18, 0.5, R, 1, 4.5, { every: 3, front: 0.7 });
}, 4));
export const crane = (o = {}) => mm(`crane|${JSON.stringify(o)}`, () => mkp(2.7, 90, 76, (px) => {
  const R = rng(61), tilt = o.fallen ? 1 : 0;
  if (o.fallen) { px.part().capsule(-26, -1, 2, 8, -2, 1.7, V.woodD, 2); px.part().capsule(8, -2, 1.7, 30, -11, 1.4, V.wood, 2.1); px.part().capsule(-26, -1, 2, -30, -18, 1.4, V.woodD, 2.2); px.part().ellipse(-20, -2, 6, 2, V.rubble, 1.9); return; }
  px.part().capsule(-12, 0, 2, 0, -46, 1.5, V.woodD, 2); px.part().capsule(12, 0, 2, 0, -46, 1.5, V.woodD, 2.1);
  px.part().line(-8, -14, 8, -14, V.wood, 2.2); px.part().capsule(0, -42, 1.4, 30, -52, 1.2, V.wood, 3, { limb: false }); px.part().line(0, -46, 24, -34, V.wood, 2.9); px.part().line(0, -46, -22, -2, I.canD, 2.5);
  px.part().line(30, -52, 30, -26, I.canD, 3.1); px.part().rect(28, -27, 4, 4, I.steelD, 3.2);
  px.part().rect(23, -20, 14, 8, I.ashL, 3.3, { n: F_FRONT }); px.part().rect(23, -20, 14, 2, I.ash, 3.35, { n: F_TOP }); px.toneLine(24, -16, 36, -16, -1);
  px.part().ellipse(-22, -2, 4, 1.6, V.rubble, 2); tufts(px, -16, 16, 0.5, R, 1, 4, { every: 3 });
}, 3));
// a quarry's cut face: a vertical wall of dressed courses with drill holes, a lit lip, a return on the east, rubble at the foot
export const cutFace = (len = 60, hgt = 14, o = {}) => mm(`cut|${len}|${hgt}|${JSON.stringify(o)}`, () => mkp(2.0, len + 24, hgt + 24, (px) => {
  const R = rng(o.seed ?? 81), st = o.m ?? V.gran2, x0 = -len / 2;
  px.part().poly([[len / 2, 0], [len / 2 + 7, -3], [len / 2 + 7, -hgt - 4], [len / 2, -hgt]], I.ashD, 1.5, { n: F_EAST });
  const jag = []; for (let x = 0; x <= len; x += 4) jag.push([x0 + x, -hgt + Math.round((R() - 0.5) * 4.5)]);
  px.part().poly([[x0, 0], ...jag, [x0 + len, 0]], st, 2, { n: F_FRONT });
  coursed(px, x0, -hgt, len, hgt, 6, o.seed ?? 81, 2, { stain: true });
  for (let k = 0; k < len / 3; k++) px.tone(x0 + R() * len, -R() * hgt, R() > 0.5 ? 1 : -1);
  for (let x = x0 + 5; x < x0 + len - 3; x += 7 + Math.floor(R() * 5)) { const y = -hgt * (0.3 + R() * 0.4); px.dot(x, y, V.hole, 2.5); px.dot(x, y + 1.2, V.hole, 2.5); px.toneLine(x + 1, y - 1, x + 1, y + 2, 1); }
  px.part().poly([...jag, ...jag.slice().reverse().map(([x, y]) => [x + 6, y - 4])], I.ash, 2.4, { n: F_TOP });
  tufts(px, x0 + 2, x0 + len + 4, -hgt - 3.5, R, 1, 4, { every: 3.5, front: 0.3 });
  for (let k = 0; k < len / 4; k++) px.part().ellipse(x0 + R() * (len + 6), -0.5 - R() * 1.5, 1.4 + R() * 2.2, 1 + R() * 1.2, R() > 0.5 ? I.ash : I.ashD, 3, { round: 0.85 });
  if (o.ivy) for (let k = 0; k < 10; k++) px.ellipse(x0 + R() * len, -R() * hgt * 0.8, 2 + R() * 3, 1.5 + R() * 2.5, o.ivy, 3.0, { wrap: true });
}, 4));
export const spoil = (r = 14, o = {}) => mm(`spoil|${r}|${JSON.stringify(o)}`, () => mkp(2.0, r * 3 + 12, r * 1.4 + 14, (px) => {
  const R = rng(o.seed ?? 71), mt = o.m ?? I.ashD;
  for (let k = 0; k < r * 1.6; k++) { const a = R(), x = (a - 0.5) * r * 2.3, y = -Math.sqrt(Math.max(0, 1 - ((a - 0.5) * 2) ** 2)) * r * 0.6 * R(); px.part().ellipse(x, y - 1, 1.6 + R() * 2.6, 1.2 + R() * 1.6, R() > 0.5 ? I.ash : mt, 2 - y * 0.05, { round: 0.85 }); }
  tufts(px, -r * 1.1, r * 1.1, 0.5, R, 1, 5, { every: 4, front: 0.7 });
}, 3));
// heather and bracken drift over a ruin (C): a sprite you can lay anywhere
export const heather = (n = 8, seed = 3, bracken = false) => mm(`hth|${n}|${seed}|${bracken}`, () => mkp(1.5, n * 4 + 20, 24, (px) => {
  const R = rng(seed);
  for (let k = 0; k < n; k++) {
    const x = (R() - 0.5) * n * 3.6, y = -R() * 3, s = 2 + R() * 2.2;
    if (bracken && k % 3 === 0) { for (let f = 0; f < 5; f++) { const a = -0.9 + f * 0.45; px.part().line(x, y, x + Math.sin(a) * s * 2.6, y - Math.cos(a) * s * 2.2 - 1, f % 2 ? I.bracken : I.rust, 2 + y * 0.01); } }
    else { px.part().ellipse(x, y - s * 0.5, s, s * 0.7, k % 2 ? I.purpleD : I.purple, 2 + y * 0.01, { round: 0.9 }); px.dot(x + (R() - 0.5) * s, y - s * 0.95, I.purpleL, 2.5); }
  }
}, 3));


// ---- timber: a palisade run, a watch tower, a gateway (C, the stockade) --------------------------------------------------
export const palisade = (len, o = {}) => mm(`pal|${len}|${JSON.stringify(o)}`, () => mkp(1.9, len + 16, 44, (px) => {
  const R = rng(o.seed ?? 91), x0 = -len / 2, H = o.h ?? 26;
  for (let row = 0; row < 2; row++) for (let x = x0 + (row ? 1.6 : 0); x <= x0 + len; x += 3.2) {
    const hh = H * (row ? 1.12 : 1) * (0.92 + R() * 0.16), y0 = row ? -4 : 0, lean = (R() - 0.5) * 0.8;
    px.part().poly([[x - 1.6, y0], [x + 1.6, y0], [x + 1.6 + lean, -hh + 4], [x + lean, -hh - 0.5], [x - 1.6 + lean, -hh + 4]], row ? V.woodD : V.wood, 2 - row * 0.5 + (x % 2) * 0.01, { n: F_FRONT, round: 0.4 });
    if (!row) px.toneLine(x - 0.8, -1, x - 0.8 + lean, -hh + 4, 1);
  }
  px.part().line(x0, -H * 0.35, x0 + len, -H * 0.35, I.canD, 3); px.part().line(x0, -H * 0.7, x0 + len, -H * 0.7, I.canD, 3);
  tufts(px, x0 - 2, x0 + len + 2, 0.5, R, 1, 4, { every: 3, front: 0.6 });
}, 4));
export const timberTower = (h = 34, o = {}) => mm(`tt|${h}|${JSON.stringify(o)}`, () => mk(2.3, 56, h + 40, (px, Lt) => {
  const R = rng(o.seed ?? 93);
  for (const [x, w] of [[-10, 1.6], [10, 1.6]]) px.part().capsule(x, 0, w, x * 0.8, -h, w * 0.9, V.woodD, 2.1);
  for (const x of [-7, 7]) px.part().capsule(x, -4, 1.2, x * 0.8, -h, 1.1, V.woodD, 1.5);
  px.part().line(-10, -2, 8, -h * 0.5, V.wood, 2.3); px.part().line(10, -2, -8, -h * 0.5, V.wood, 2.3); px.part().line(-8, -h * 0.5, 8, -h, V.wood, 2.3); px.part().line(8, -h * 0.5, -8, -h, V.wood, 2.3);
  px.part().rect(-12, -h - 2, 24, 3, V.wood, 3, { n: F_FRONT }); px.part().poly([[-12, -h - 2], [12, -h - 2], [15, -h - 5], [-9, -h - 5]], V.woodL, 3.05, { n: F_TOP });
  for (let x = -11; x <= 11; x += 3.2) px.part().poly([[x - 1.2, -h - 2], [x + 1.2, -h - 2], [x + 1.2, -h - 11], [x, -h - 13], [x - 1.2, -h - 11]], V.woodD, 3.1);
  if (o.fire) { px.part().poly([[-6, -h - 2], [6, -h - 2], [4.5, -h - 6], [-4.5, -h - 6]], I.steelD, 3.4); px.part().ellipse(0, -h - 6, 4.5, 1.2, I.coal, 3.5); Lt.lamp(0, -h - 9, 56, "#ff8a2a"); }
  else { px.part().poly([[-14, -h - 11], [14, -h - 11], [0, -h - 24]], V.thatchD, 3.2, { n: F_ROOF }); px.part().rect(-12, -h - 12, 24, 2, V.woodD, 3.25); Lt.lamp(7, -h - 7, 24, "#ffb24a"); px.dot(7, -h - 7, V.lamp, 3.4); }
  tufts(px, -13, 13, 0.5, R, 1, 4, { every: 3 });
}, 4));
export const gateway = (o = {}) => mm(`gw|${JSON.stringify(o)}`, () => mk(2.3, 50, 56, (px, Lt) => {
  for (const x of [-10, 10]) px.part().capsule(x, 0, 1.8, x, -28, 1.6, V.woodD, 2);
  px.part().rect(-13, -33, 26, 5, V.wood, 2.2, { n: F_FRONT }); px.toneLine(-12, -31, 12, -31, -1);
  px.part().poly([[-8, 0], [8, 0], [8, -26], [-8, -26]], V.hole, 1.8);
  px.part().line(0, -28, 0, -23, I.steelD, 2.5); px.part().rect(-1.5, -23, 3, 4, V.pane, 2.6); Lt.lamp(0, -21, 30, "#ffb24a");
  cloth(px, 11, -42, 10, 12, o.t ?? 0, I.ox, 2.6, 1.6); px.part().line(10, -44, 10, -26, V.woodD, 2.5);
  tufts(px, -12, 12, 0.5, rng(4), 1, 3, { every: 3 });
}, 3));
// idle people: the game's own pix figures through the bake (soldiers, a smith)
const FIGS = { guard: { fig: { ...garrisonM, NAME: "ovi-garrison" }, clip: "idle", n: 8, variant: "squire" }, guardN: { fig: { ...garrisonM, NAME: "ovi-garrison" }, clip: "idle", n: 8, variant: "knight" }, smith: { fig: { ...smithM, NAME: "ovi-smith" }, clip: "hammer", n: 12 }, levy: { fig: { ...levyM, NAME: "ovi-levy" }, clip: "idle", n: 8 } };
const man = (S, kind, lx, ly, f, o = {}) => {
  const F = FIGS[kind], i = (Math.floor(((f + (o.ph ?? 0)) / FL) * F.n)) % F.n;
  S.add(bakeFrame(F.fig, F.clip, i, { flip: !!o.flip, variant: F.variant }), lx, ly, { ground: false });
};

// ---- the scene list ---------------------------------------------------------------------------------------------
class Scene {
  constructor(ctx, crop, off = 0) { this.ctx = ctx; this.crop = crop; this.off = off; this.items = []; this.ground = []; this.glows = []; this.cw = ctx.canvas.width; this.ch = ctx.canvas.height; }
  P(lx, ly) { return [Math.round((this.crop[0] + lx) * 2), Math.round((this.crop[1] + ly + this.off) * 2)]; }
  add(spr, lx, ly, o = {}) {
    const [x, y] = this.P(lx, ly);
    const near = nearestOnPath(this.crop[0] + lx, this.crop[1] + ly);
    if (near.d < 30 && !o.road) console.error("on the road:", lx, ly, near.d.toFixed(1));
    this.items.push({ spr, x, y, shade: o.shade ?? 1, sort: y + (o.dy || 0), alpha: o.alpha ?? 1, contact: o.contact ?? 0, ground: o.ground ?? true });
    for (const [ax, ay, r, col] of spr.lamps ?? []) this.glows.push([x + ax, y + ay, r, col, o.glow ?? 1]);
    return this;
  }
  glow(lx, ly, r, col = "#ff9a3a", k = 1) { const [x, y] = this.P(lx, ly); this.glows.push([x, y, r, col, k]); }
  onGround(fn) { this.ground.push(fn); }
  render() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    for (const fn of this.ground) fn(ctx, this);
    // the ground's warm pools under every fire (always lit; stronger at the low sun)
    const gk = MODE === "golden" ? 1 : MODE === "sunrise" ? 1 : 0.55;
    for (const [x, y, r, col, k] of this.glows) pool(ctx, x, y + 2, r * 0.9, col, 0.5 * gk * k);
    const sh = document.createElement("canvas"); sh.width = this.cw; sh.height = this.ch;
    const s = sh.getContext("2d"); s.imageSmoothingEnabled = false;
    const day = DAY.on && DAY.len > 0, fx = day ? DAY.fall[0] : 0.93, fy = day ? DAY.fall[1] : 0.37, len = day ? DAY.len : 0.6;
    const [r, g, b, a] = DAY.on ? DAY.shade : [42, 28, 44, 0.3];
    for (const it of this.items) {
      if (!it.shade || it.spr.flame) continue;
      const sil = silhouette(it.spr.cv, `rgb(${r},${g},${b})`), { ox, oy } = it.spr, L = len * it.shade;
      s.setTransform(1, 0, -fx * L, -fy * L, it.x - ox + fx * L * oy, it.y + fy * L * oy); s.drawImage(sil, 0, 0);
    }
    s.setTransform(1, 0, 0, 1, 0, 0);
    // a dark earth line under every column standing on the ground
    for (const it of this.items) {
      if (!it.ground || it.spr.flame || it.alpha < 1) continue;
      const bot = bottoms(it.spr), { ox, oy } = it.spr;
      for (let u = 0; u < bot.length; u++) { const v = bot[u]; if (v < 0 || v < oy - 3 || v > oy + 3) continue; ctx.fillStyle = "rgba(30,24,30,0.5)"; ctx.fillRect(it.x - ox + u, it.y - oy + v + 1, 1, 1); }
    }
    ctx.globalAlpha = Math.min(0.62, a * 1.55); ctx.drawImage(sh, 0, 0); ctx.globalAlpha = 1;
    this.items.sort((p, q) => p.sort - q.sort);
    for (const it of this.items) { ctx.globalAlpha = it.alpha; ctx.drawImage(it.spr.cv, it.x - it.spr.ox, it.y - it.spr.oy); }
    ctx.globalAlpha = 1;
    // lit windows (lamp yellow) and a warm bloom over each flame, brighter at the low sun
    const wk = MODE === "noon" ? 0.5 : 0.95;
    for (const it of this.items) for (const [wx, wy, ww, wh] of it.spr.lights ?? []) {
      for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { ctx.fillStyle = j === 0 ? `rgba(240,160,70,${wk})` : `rgba(255,214,130,${wk})`; ctx.fillRect(it.x + wx + i, it.y + wy + j, 1, 1); }
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const bk = MODE === "noon" ? 0.14 : 0.3;
    for (const [x, y, r, col, k] of this.glows) bloom(ctx, x, y, r * 0.55, col, bk * k);
    ctx.restore();
  }
}
const RGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// stepped, dithered warm pool on the ground (an ellipse 1.6 wide)
const pool = (ctx, x, y, r, col, a) => {
  const [cr, cg, cb] = RGB(col);
  for (let j = -r; j <= r; j++) for (let i = -r * 1.7; i <= r * 1.7; i++) {
    const d = Math.hypot(i / 1.7, j * 1.05) / r; if (d > 1) continue;
    const s = d < 0.38 ? 3 : d < 0.68 ? 2 : 1; if (s === 1 && ((Math.round(i) + Math.round(j)) & 1)) continue; if (s === 2 && BAY[((Math.round(x + i) & 3) + ((Math.round(y + j) & 3) << 2))] > 11) continue;
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${a * s / 3 * 0.55})`; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1);
  }
};
const bloom = (ctx, x, y, r, col, a) => {
  const [cr, cg, cb] = RGB(col);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j) / r; if (d > 1) continue; const s = d < 0.35 ? 3 : d < 0.7 ? 2 : 1; if (s < 3 && BAY[((Math.round(x + i) & 3) + ((Math.round(y + j) & 3) << 2))] / 16 > s * 0.3) continue; ctx.fillStyle = `rgba(${cr},${cg},${cb},${a * s / 3})`; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1); }
};

// ---- ground work -------------------------------------------------------------------------------------------------
const dirt = (S, lx, ly, rx, ry, cols = EARTH, seed = 1, k = 1) => S.onGround((c) => { const [x, y] = S.P(lx, ly); worn(c, x, y, rx, ry, cols, seed, k); });
// flagstones: a worn paved patch (A's parade ground), courses of slabs and a kerb
const paved = (S, lx, ly, rx, ry, seed = 2, worn_ = 0.12) => S.onGround((c) => {
  const [x0, y0] = S.P(lx, ly); const R = rng(seed);
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const d = Math.hypot(i / rx, j / ry); if (d > 1) continue; if (d > 0.9 && hash(i + seed, j) > 0.55) continue;
    const row = Math.floor(j / 5), off = (row & 1) * 4, seam = (j % 5 + 5) % 5 === 0 || ((i + off) % 9 + 9) % 9 === 0, id = hash(Math.floor((i + off) / 9) + seed, row);
    px1(c, x0 + i, y0 + j, seam ? "#5e5a50" : id > 0.8 ? FLAG[3] : id > 0.5 ? FLAG[0] : FLAG[1]);
    if (!seam && hash(i, j + seed) < worn_) px1(c, x0 + i, y0 + j, FLAG[2]);
  }
});
const mudPatch = (S, lx, ly, rx, ry, seed = 3) => { dirt(S, lx, ly, rx, ry, MUD, seed, 0.55); S.onGround((c) => { const [x0, y0] = S.P(lx, ly), R = rng(seed + 5); for (let k = 0; k < rx / 3; k++) { const px_ = x0 + Math.round((R() - 0.5) * rx * 1.5), py = y0 + Math.round((R() - 0.5) * ry * 1.4), w = 4 + Math.floor(R() * 7); for (let i = 0; i < w; i++) { px1(c, px_ + i, py, i < 2 || i > w - 3 ? "#3a4654" : "#4e6070"); if (i > 1 && i < w - 2) px1(c, px_ + i, py + 1, "#3a4654"); } for (let i = 1; i < 3; i++) px1(c, px_ + i, py - 1, "#7a8a96"); } }); };
const heatherGround = (S, lx, ly, rx, ry, seed = 4, dens = 0.1) => S.onGround((c) => { const [x0, y0] = S.P(lx, ly); for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { if (Math.hypot(i / rx, j / ry) > 1) continue; const h = hash(i + seed * 31, j - seed); if (h > dens) continue; const g = hash(i >> 2, j >> 2); px1(c, x0 + i, y0 + j, g > 0.55 ? "#7a4e7c" : g > 0.3 ? "#5e4062" : "#8a5a3a"); if (h < dens * 0.4) px1(c, x0 + i, y0 + j - 1, "#a070a0"); } });
const pit = (S, lx, ly, rx, ry, o = {}) => S.onGround((c) => {
  const [x0, y0] = S.P(lx, ly);
  for (let j = -ry - 3; j <= ry + 3; j++) for (let i = -rx - 3; i <= rx + 3; i++) {
    const wob = (hash(i >> 3, j >> 2) - 0.5) * 0.3, d = Math.hypot(i / rx, j / ry) + wob; if (d > 1.05) continue;
    if (d > 0.92 && hash(i, j) > 0.5) continue;
    if (o.water && d < 0.8) { const lit = j < -ry * 0.2; px1(c, x0 + i, y0 + j, lit ? (((i + j) & 3) === 0 ? "#9ab4c4" : "#6a8696") : hash(i, j) > 0.97 ? "#aac4d4" : "#587486"); continue; }
    const g = hash(i + 3, j), k = hash(i >> 1, j >> 1);
    px1(c, x0 + i, y0 + j, d > 0.82 ? "#8a8a90" : g > 0.9 ? "#c0c0c4" : k > 0.7 ? "#a4a4a8" : g < 0.1 ? "#80808a" : "#b0b0b4");
  }
});
// the paving of a piece of road where it passes: just for the fort's gate (a worn threshold)
export const OPTS = ["A", "B", "C"];

// ---- the scenes --------------------------------------------------------------------------------------------------
// camp: The Muster, the strip south of the road (crop [230, 280]: local x 0-420, y 0-280; the strip is y 175-275)
export const SCENES = {
  camp: { realm: "muster", faction: "iron", crop: [230, 280], off: -12, halls: [["archer", 440, 330, 2], ["knight", 330, 345, 1]], wave: 6, at: 3, size: [420, 280] },
  hillsN: { realm: "stonewatch", faction: "iron", crop: [300, 0], off: 12, halls: [["archer", 430, 215, 2], ["wizard", 360, 250, 1]], wave: 6, at: 3, size: [420, 280] },
  hillsS: { realm: "stonewatch", faction: "iron", crop: [210, 280], off: -24, halls: [["archer", 500, 330, 2], ["knight", 420, 350, 1]], wave: 6, at: 3, size: [420, 280] },
  gallows: { realm: "gallowscross", faction: "iron", crop: [420, 280], halls: [["archer", 500, 330, 1]], wave: 6, at: 3, size: [420, 280] },
};
for (const [k, v] of Object.entries(SCENES)) v.id = k;
export const KEEP = /tree|pine|spruce|scots|thorn|larch|forest|wood/;

// the camp, three ways (f = frame 0..F-1, F = loop length)
const FL = 24, TT = (f) => (f / FL) * Math.PI * 2;
const flameAt = (S, lx, ly, f, size, ph = 0, lean = 1) => { const spr = flameSpr(Math.round(((f + ph) % FL) / 4) * 1.3 + ph, size, lean); S.add(spr, lx, ly, { shade: 0, ground: false, dy: 900 }); };
const smokeAt = (S, lx, ly, f, h, o = {}) => { const spr = smokeSpr(((f / FL) + (o.ph ?? 0)) % 1, h, o.wind ?? 1, o); S.add(spr, lx, ly, { shade: 0, ground: false, alpha: o.alpha ?? 0.8, dy: 900 }); };
const barrelsPair = () => crates({ seed: 14, sacks: false });
const BT = (h) => ((h + 11) * 3.3) / 2;   // board units from a beacon drum's foot to its fire cage
const tor = (S, x, y, seed = 3, w = 190) => { S.add(rockMass(w, "granite", seed, { tall: 1.5 }), x, y - 6, { glow: 0 }); };
const torFront = (S, x, y, seed = 5) => { S.add(rockMass(64, "granite", seed + 1), x - 44, y + 4, { glow: 0 }); S.add(rockMass(54, "granite", seed + 2), x + 46, y + 6, { glow: 0 }); };
export const OPTIONS = {
  camp: {
    A(S, f) {   // drilled: ranks of tents (two vary), a flagged parade ground, a smith, soldiers at stand-easy
      const T = TT(f);
      dirt(S, 210, 240, 400, 46, EARTH, 2, 1.1); paved(S, 330, 244, 100, 30, 4, 0.1);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const odd = (r === 0 && c === 1) || (r === 1 && c === 2);
        S.add(tent(odd ? 22 : 24, odd ? 18 : 20, { seed: 3 + c + r * 3, t: T + c * 0.4, lit: c === 1 && r === 1, c1: odd ? I.canB : I.can, c2: odd ? I.oxD : I.ox, stripe: !odd || r === 1 }), 42 + c * 58, 214 + r * 46);
      }
      S.add(pavilion(40, 40, { t: T }), 394, 224);
      for (let k = 0; k < 3; k++) S.add(standard(T, { ph: k * 0.5, amp: 1.7, h: 36 }), 284 + k * 30, 212);
      for (const x of [268, 376]) { S.add(brazierPost(18), x, 258); flameAt(S, x, 258 - 19, f, 13, x % 3, 0.5); }
      S.add(rack({ seed: 2 }), 308, 270); S.add(rack({ seed: 3 }), 350, 270);
      S.add(forge({ seed: 2 }), 214, 262); flameAt(S, 214, 262 - 8, f, 7, 1, 0); smokeAt(S, 214 - 9, 262 - 42, f, 66, { wind: 0.8, ph: 0.15, k: 1.1 });
      man(S, "smith", 233, 266, f, { flip: true });
      man(S, "guard", 296, 240, f); man(S, "guard", 322, 246, f, { ph: 3 }); man(S, "guardN", 352, 240, f, { flip: true, ph: 5 });
    },
    B(S, f) {   // lived-in: mud, mixed canvas, cookfires with people at them, wagon, laundry
      const T = TT(f);
      mudPatch(S, 130, 242, 150, 44, 2); mudPatch(S, 330, 250, 100, 30, 6); dirt(S, 220, 246, 220, 20, MUD, 3, 0.7);
      const cs = [I.can, I.canB, I.canG, I.canR, I.can];
      [[30, 214, 0], [82, 238, 1], [130, 212, 2], [20, 262, 3], [180, 234, 4]].forEach(([x, y, c], i) => S.add(tent(i % 2 ? 22 : 26, 18 + (i % 3) * 2, { seed: 5 + i, c1: cs[c], c2: i % 2 ? I.oxD : I.ox, patches: 2, stripe: i % 3 === 0, lit: i === 2, t: T + i, sideC: cs[c] }), x, y));
      S.add(cauldron({ seed: 1 }), 244, 262); flameAt(S, 244, 259, f, 11, 0); smokeAt(S, 244, 256, f, 70, { ph: 0, wind: 1.1, k: 1.2 });
      man(S, "levy", 224, 268, f); man(S, "guard", 268, 270, f, { flip: true, ph: 4 });
      S.add(cauldron({ seed: 2, logs: [[-12, 1], [12, 3]] }), 112, 270); flameAt(S, 112, 267, f, 9, 3); smokeAt(S, 112, 264, f, 56, { ph: 0.4, wind: 1, k: 1.1 });
      S.add(forge({ seed: 3 }), 336, 240); flameAt(S, 336, 232, f, 7, 2, 0); smokeAt(S, 336 - 9, 240 - 42, f, 66, { ph: 0.3, wind: 0.9, dark: 1, k: 1.1 });
      man(S, "smith", 356, 244, f, { flip: true });
      S.add(pavilion(34, 34, { c1: I.canB, c2: I.oxD, t: T }), 396, 262);
      S.add(wagon({ seed: 7 }), 300, 276); S.add(crates({ seed: 6 }), 176, 270);
      S.add(washLine(T), 168, 256); S.add(standard(T, { lean: 2, h: 34, amp: 2.1, seed: 9 }), 206, 226);
    },
    C(S, f) {   // a fortified stockade on the road: palisade round the camp, a timber gate tower with a fire, guards, a fire inside
      const T = TT(f);
      dirt(S, 210, 244, 400, 44, EARTH, 2, 1.0);
      S.add(palisade(220, { seed: 3 }), 108, 200); S.add(palisade(130, { seed: 4 }), 330, 200);
      S.add(timberTower(36, { fire: true }), 236, 210); flameAt(S, 236, 210 - (36 + 9) * 2.3 / 2, f, 14, 2, 0.6); smokeAt(S, 236, 210 - 54, f, 70, { ph: 0.1, wind: 1.2, k: 1.1 });
      S.add(timberTower(36, { seed: 5 }), 28, 214); S.add(timberTower(36, { seed: 6, fire: true }), 410, 214); flameAt(S, 410, 214 - (36 + 9) * 2.3 / 2, f, 14, 4, 0.6);
      for (const [x, y, i] of [[60, 234, 0], [124, 246, 1], [188, 232, 2], [330, 238, 3]]) S.add(tent(22, 18, { seed: 5 + i, c1: i % 2 ? I.canB : I.can, patches: i % 2, t: T + i, lit: i === 1 }), x, y);
      S.add(cauldron({ seed: 4 }), 252, 262); flameAt(S, 252, 259, f, 10, 0); smokeAt(S, 252, 256, f, 60, { ph: 0.3, wind: 1.1, k: 1.1 });
      man(S, "guard", 204, 262, f, { ph: 2 }); man(S, "guardN", 276, 266, f, { flip: true, ph: 6 });
      S.add(gateway({ t: T }), 236, 270); S.add(palisade(100, { seed: 7 }), 96, 272); S.add(palisade(100, { seed: 8 }), 380, 272);
      S.add(standard(T, { h: 36, amp: 2 }), 180, 270); S.add(crates({ seed: 5 }), 340, 266);
    },
  },
  hillsN: {   // the beacon ON its tor (crop [300, 0]; the strip is y 5-120)
    A(S, f) {   // dressed drum, braziers, a tidy woodstack, a watch tent, one watcher
      const T = TT(f);
      dirt(S, 262, 112, 300, 22, EARTH, 5, 0.9);
      tor(S, 262, 104, 3, 160); S.add(beaconDrum({ seed: 5, h: 24 }), 262, 106); flameAt(S, 262, 106 - BT(24), f, 36, 0);
      smokeAt(S, 262, 106 - BT(24) - 4, f, 130, { ph: 0, wind: 1.3, k: 2.2, alpha: 0.75 }); torFront(S, 262, 108, 5);
      S.add(woodpile(3), 196, 116); S.add(woodpile(5), 332, 118);
      S.add(tent(20, 17, { seed: 3, t: T }), 150, 82); S.add(brazierPost(16), 212, 118); flameAt(S, 212, 118 - 17, f, 12, 2, 0.5); S.add(brazierPost(16), 312, 120); flameAt(S, 312, 120 - 17, f, 12, 4, 0.5);
      man(S, "guard", 232, 122, f, { ph: 1 }); man(S, "guardN", 298, 124, f, { flip: true, ph: 4 });
    },
    B(S, f) {   // lived-in: rough drum, a ragged woodstack, a boiling pot with a watcher, mud
      const T = TT(f);
      mudPatch(S, 262, 114, 130, 20, 5); dirt(S, 262, 112, 300, 22, MUD, 6, 0.5);
      tor(S, 262, 104, 11, 165); S.add(beaconDrum({ seed: 8, h: 20, stone: I.ashD, stone2: I.ash }), 262, 108); flameAt(S, 262, 108 - BT(20), f, 38, 1);
      smokeAt(S, 262, 108 - BT(20) - 4, f, 140, { ph: 0, wind: 1.4, k: 2.4, alpha: 0.8, dark: 1 }); torFront(S, 262, 110, 13);
      for (const [x, y, s_] of [[200, 120, 1], [180, 126, 2], [338, 122, 3], [362, 114, 4]]) S.add(woodpile(s_ + 4), x, y);
      S.add(tent(22, 18, { seed: 4, c1: I.canB, patches: 3, lit: true, t: T }), 140, 86); S.add(cauldron({ seed: 6 }), 300, 126); flameAt(S, 300, 123, f, 10, 3); smokeAt(S, 300, 120, f, 62, { ph: 0.5, wind: 1.2, k: 1.1 });
      man(S, "levy", 322, 128, f, { flip: true });
    },
    C(S, f) {   // a timber beacon tower on the tor inside a palisade
      const T = TT(f);
      dirt(S, 262, 112, 280, 22, EARTH, 5, 0.9);
      tor(S, 262, 106, 3, 150); S.add(timberTower(44, { fire: true, seed: 9 }), 262, 100); flameAt(S, 262, 100 - (44 + 9) * 2.3 / 2, f, 32, 1);
      smokeAt(S, 262, 100 - (44 + 9) * 2.3 / 2 - 4, f, 120, { ph: 0, wind: 1.3, k: 2, alpha: 0.75 }); torFront(S, 262, 108, 5);
      S.add(palisade(110, { seed: 3 }), 190, 122); S.add(palisade(110, { seed: 5 }), 338, 124);
      S.add(woodpile(2), 300, 106); S.add(tent(20, 17, { seed: 3, t: T }), 150, 90);
      man(S, "guard", 262, 128, f, { ph: 2 });
    },
  },
  hillsS: {   // the quarry (left) and the toll fort / inn (right), Stonewatch's bottom strip (crop [210, 280]; off -24)
    A(S, f) {   // benched cut faces, block stacks, a crane against the face; one honest gate tower with its wall stubs
      const T = TT(f);
      pit(S, 90, 244, 100, 22, { seed: 3 }); dirt(S, 200, 268, 250, 12, EARTH, 6, 0.8); dirt(S, 330, 262, 110, 22, EARTH, 7, 0.8);
      S.add(cutFace(140, 22, { seed: 3 }), 92, 206); S.add(cutFace(96, 14, { seed: 12 }), 70, 228); S.add(cutFace(56, 8, { seed: 15 }), 34, 246);
      S.add(crane({}), 156, 232); S.add(blocks(6, { seed: 1 }), 100, 262); S.add(blocks(5, { seed: 3 }), 42, 270);
      man(S, "levy", 130, 266, f, { ph: 2 });
      S.add(fort({ seed: 3, braziers: true, t: T }), 336, 258); flameAt(S, 336 - 12 * 2.6 / 2, 258 - 12 * 2.6 / 2 - 1, f, 11, 0, 0.5); flameAt(S, 336 + 12 * 2.6 / 2, 258 - 12 * 2.6 / 2 - 1, f, 11, 2, 0.5);
      S.add(barrier({ up: 0.3 }), 248, 276); man(S, "guard", 296, 270, f, { ph: 3 }); man(S, "guardN", 374, 270, f, { flip: true, ph: 6 });
    },
    B(S, f) {   // working: spoil heaps, a cart, rough-cut stone; the drover's inn in stone with a yard wall, a lamp post and two lit windows
      const T = TT(f);
      pit(S, 90, 244, 100, 22, { seed: 5 }); mudPatch(S, 110, 268, 100, 14, 4); mudPatch(S, 330, 264, 110, 22, 8); dirt(S, 220, 270, 160, 10, MUD, 9, 0.6);
      S.add(cutFace(140, 21, { seed: 5 }), 92, 206); S.add(cutFace(90, 13, { seed: 13 }), 72, 228);
      S.add(crane({}), 160, 232); S.add(spoil(18, { seed: 2 }), 36, 262); S.add(blocks(7, { seed: 4, tidy: false }), 108, 262); S.add(wagon({ seed: 8, bare: true }), 170, 272);
      man(S, "levy", 56, 270, f, { ph: 1 });
      S.add(inn({ seed: 31, lit: true }), 330, 258); smokeAt(S, 330 + 5, 258 - 34 * 2.6 / 2 - 6, f, 70, { ph: 0.2, wind: 1.1, k: 1.1 });
      S.add(cutFace(60, 6, { seed: 21, m: V.mason }), 270, 276); S.add(lampPost(30), 248, 270); S.add(signboard(T), 396, 276); S.add(trough(), 300, 276); S.add(haystack(11, 3), 398, 258);
      S.add(cauldron({ seed: 9 }), 224, 276); flameAt(S, 224, 273, f, 9, 5); smokeAt(S, 224, 270, f, 50, { ph: 0.5, wind: 1.2, k: 1 });
      man(S, "guard", 270, 266, f, { ph: 3 });
    },
    C(S, f) {   // timber: a hoist gantry over the cut, a palisaded yard, a log gate with two towers and a torch
      const T = TT(f);
      pit(S, 90, 244, 100, 22, { seed: 7 }); dirt(S, 200, 268, 250, 12, EARTH, 6, 0.8); dirt(S, 330, 262, 120, 22, EARTH, 7, 0.8);
      S.add(cutFace(140, 22, { seed: 8 }), 92, 206); S.add(cutFace(96, 14, { seed: 14 }), 70, 228);
      S.add(crane({}), 130, 232); S.add(crane({}), 36, 240); S.add(blocks(6, { seed: 7 }), 90, 264); S.add(palisade(110, { seed: 2 }), 100, 278);
      S.add(timberTower(36, { fire: true }), 290, 258); flameAt(S, 290, 258 - (36 + 9) * 2.3 / 2, f, 12, 1, 0.6);
      S.add(timberTower(36, { seed: 2, fire: true }), 390, 258); flameAt(S, 390, 258 - (36 + 9) * 2.3 / 2, f, 12, 3, 0.6);
      S.add(gateway({ t: T }), 340, 270); S.add(palisade(40, { seed: 3 }), 316, 266); man(S, "guard", 316, 274, f, { ph: 2 });
    },
  },
};
export const paintPlaces = (ctx, sc, opt, o = {}) => {
  MODE = o.mode ?? "noon";
  const fn = OPTIONS[sc.id]?.[opt];
  if (!fn) return;
  const S = new Scene(ctx, sc.crop, sc.off ?? 0);
  fn(S, o.frame ?? 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 738 * 2, ctx.canvas.height); ctx.clip();
  S.render();
  ctx.restore();
};
