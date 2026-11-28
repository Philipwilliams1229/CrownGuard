// ============ IRON OVERHAUL CONCEPT ROUND 1, PANEL 4: CRAGS (2026-11-28) ============
// Not in the game. Lab: ovi1-crags.html. Notes: concept/ovi1-crags.md.
// Crags, outcrops, cliff edges and rock walls as SCENERY on flat ground (no terraces), by THE ROCK RULE
// (concept/overhaul2-decor-gw.md): stacked loaves, a lit top, a mid south face, a shaded east shoulder, nothing
// pointing at the camera. Plus the paved road where it passes them (flags worn and patched, no ruts).
// The kit (sprite, Scene, block) is adapted from concept/overhaul2-decor-gw.js, which is left untouched.
import { Pix, mat, flat, toCanvas } from "../src/render/pix/pix.js";
import { DAY } from "../src/data/sun.js";
import { nearestOnPath, posAt, angleAt, TOTAL_LEN } from "../src/engine/path.js";

const seedOf = (v) => Math.round(v * 7) + 11;
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const lerp = (a, b, t) => a + (b - a) * t;
export const PATH_HALF = 32;

// ---- sprites, golden-hour grade, silhouette shadows ----------------------------------------------------
const sprite = (w, h, build, oy = 4) => {
  w = Math.ceil(w); h = Math.ceil(h);
  const px = new Pix(w, h, w >> 1, h - oy);
  build(px);
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img);
  grade(cv);
  return { cv, ox: img.ox, oy: img.oy };
};
const grade = (cv) => {
  if (!DAY.on || !DAY.warm) return;
  const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
  const c = t.getContext("2d");
  c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = "multiply"; c.fillStyle = DAY.tone === "rose" ? "#f0b8a0" : "#f6c690"; c.globalAlpha = 0.85 * DAY.warm; c.fillRect(0, 0, t.width, t.height);
  c.globalAlpha = 1; c.globalCompositeOperation = "destination-in"; c.drawImage(cv, 0, 0);
  const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(t, 0, 0);
};
const silhouette = (cv, col) => {
  const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
  const c = t.getContext("2d"); c.drawImage(cv, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = col; c.fillRect(0, 0, t.width, t.height);
  return t;
};
const px1 = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
// the day's warm multiply for colours painted straight on the board (ground work, road patches)
const warm = (hex) => {
  if (!DAY.on || !DAY.warm) return hex;
  const k = 0.85 * DAY.warm, m = DAY.tone === "rose" ? [240, 184, 160] : [246, 198, 144];
  const c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)].map((v, i) => Math.round(v * (1 - k + k * m[i] / 255)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};

// ---- the scene list: sprites sorted by their foot line, shadows under all -------------------------------
export class Scene {
  constructor(ctx, sc) { this.ctx = ctx; this.sc = sc; this.items = []; this.ground = []; this.live = []; this.cw = ctx.canvas.width; this.ch = ctx.canvas.height; this.warn = []; this.keep = sc.keep || []; }
  P(lx, ly) { return [Math.round((this.sc.crop[0] + lx) * 2), Math.round((this.sc.crop[1] + ly) * 2)]; }
  add(spr, lx, ly, o = {}) {
    const [x, y] = this.P(lx, ly);
    const near = nearestOnPath(this.sc.crop[0] + lx, this.sc.crop[1] + ly);
    if (near.d < PATH_HALF + (o.clear ?? 2) && !o.road) this.warn.push(`on the road: ${lx},${ly} d=${near.d.toFixed(1)}`);
    this.items.push({ spr, x, y, shade: o.shade ?? 1, sort: y + (o.dy || 0) });
  }
  onGround(fn) { this.ground.push(fn); }
  render() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    for (const fn of this.ground) fn(ctx, this);
    const sh = document.createElement("canvas"); sh.width = this.cw; sh.height = this.ch;
    const s = sh.getContext("2d"); s.imageSmoothingEnabled = false;
    const day = DAY.on && DAY.len > 0, fx = day ? DAY.fall[0] : 0.93, fy = day ? DAY.fall[1] : 0.37, len = day ? DAY.len : 0.6;
    const [r, g, b, a] = DAY.on ? DAY.shade : [42, 28, 44, 0.3];
    for (const it of this.items) {
      if (!it.shade) continue;
      const sil = silhouette(it.spr.cv, `rgb(${r},${g},${b})`);
      const { ox, oy } = it.spr, L = len * it.shade;
      s.setTransform(1, 0, -fx * L, -fy * L, it.x - ox + fx * L * oy, it.y + fy * L * oy);
      s.drawImage(sil, 0, 0);
    }
    ctx.globalAlpha = Math.min(0.62, a * 1.55); ctx.drawImage(sh, 0, 0); ctx.globalAlpha = 1;
    this.items.sort((p, q) => p.sort - q.sort);
    for (const it of this.items) ctx.drawImage(it.spr.cv, it.x - it.spr.ox, it.y - it.spr.oy);
  }
  // the live bits (grass, heather and bracken stirring, puddle glints): t in [0,1), a seamless loop
  paintLive(ctx, t) { ctx.imageSmoothingEnabled = false; for (const fn of this.live) fn(ctx, t); }
}

// ---- materials: Iron's late-autumn palette ------------------------------------------------------------
const M = {
  tor: mat("#7e7a74", { contrast: 1.35 }), torD: mat("#615e5c", { contrast: 1.3 }),
  grit: mat("#86857e", { contrast: 1.3 }), gritD: mat("#64636a", { contrast: 1.25 }),
  slate: mat("#666a76", { contrast: 1.25 }), slateD: mat("#4e525e", { contrast: 1.2 }), cut: mat("#747884", { contrast: 1.05 }),
  pal: mat("#b8b4ac", { contrast: 1.25 }), palB: mat("#787880", { contrast: 1.2 }), palD: mat("#62626c", { contrast: 1.2 }),
  moss: mat("#6a7a36"), mossD: mat("#566428"),
  lichG: mat("#a8b090"), lichY: mat("#c4b048"), lichR: mat("#b0643a"),
  heath: mat("#7a4c7a"), heathL: mat("#a8689a"), heathD: mat("#5a3a5c"),
  brack: mat("#a85a2c"), brackL: mat("#c47a34"), brackD: mat("#7c4224"),
  turf: mat("#6b7a3a"), turfD: mat("#566228"), turfL: mat("#7e8c44"), straw: mat("#bca64e"), strawD: mat("#98843c"),
  rust: mat("#a0603c"), scree: mat("#8a8478", { contrast: 1.1 }), screeD: mat("#6e6a62", { contrast: 1.1 }),
};

// ---- ONE BLOCK (a loaf), by the rock rule --------------------------------------------------------------
// fam: "tor" (granite: rounded, few joints, speckle), "grit" (gritstone: straight beds with a lit lip), "cut" (quarry-dressed: square)
const block = (px, xl, xr, y0, h, d, fam, mt, topM, z, R, o = {}) => {
  const w = xr - xl, tor = fam === "tor" || fam === "slate", cut = fam === "cut";
  const b = Math.max(1, Math.min(tor ? 26 : cut ? 1.5 : 8, w * (tor ? 0.42 : cut ? 0.05 : 0.2), h * (tor ? 0.62 : 0.5)));
  const yt = y0 - h, back = yt - d, ins = tor ? w * 0.1 : w * 0.04;
  const top = [[xl + b * 0.6, yt + 0.5], [xr - b * 0.6, yt + 0.5], [xr - ins - b * 0.3, back + b * 0.6], [xr - ins - b * 1.2, back], [xl + ins + b * 1.2, back], [xl + ins + b * 0.3, back + b * 0.6]];
  px.part().poly(top, topM, z, { round: tor ? 0.25 : 0.2, ny: tor ? -0.5 : -0.6 });
  // the south face: rounded shoulders drawn as arcs, the sides lightly ragged, the top a touch narrower than the foot (a bun, not a box)
  const sf = [], rb = cut ? b : tor ? Math.min(b * 0.4, 5) : b, rbb = cut ? b * 0.7 : Math.min(b * 0.45, h * 0.3), tp = tor ? Math.min(w * 0.04, 3) : 0, jg = () => (cut ? 0 : (R() - 0.5) * (tor ? 1.8 : 1.2));
  const arc = (cx, cy, r, a0, a1, k) => { const n = cut ? 1 : 4; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); sf.push([cx + Math.cos(a) * r * (k ?? 1) + jg() * 0.4, cy + Math.sin(a) * r + jg() * 0.4]); } };
  arc(xl + tp + rb, yt + rb, rb, Math.PI, 1.5 * Math.PI);
  arc(xr - tp - rb, yt + rb, rb, 1.5 * Math.PI, 2 * Math.PI);
  if (!cut) for (let y = yt + rb + 4; y < y0 - rbb - 3; y += 5) sf.push([xr - tp * (1 - (y - yt) / h) + jg(), y]);
  arc(xr - rbb, y0 - rbb, rbb, 0, 0.5 * Math.PI);
  arc(xl + rbb, y0 - rbb, rbb, 0.5 * Math.PI, Math.PI);
  if (!cut) for (let y = y0 - rbb - 3; y > yt + rb + 4; y -= 5) sf.push([xl + tp * (1 - (y - yt) / h) + jg(), y]);
  px.part().poly(sf, mt, z + 0.02, { round: tor ? 0.78 : cut ? 0.28 : 0.6, ny: tor ? 0.14 : 0.24 });
  // the shaded east shoulder (dithered into the south face) and a lit west rim
  if (!cut) { const ew = w * 0.26; for (let y = Math.ceil(yt + b * 0.6); y < y0 - 1; y++) for (let x = Math.floor(xr - ew); x < xr; x++) { const f = (x - (xr - ew)) / ew; if (f > 0.55 || (f > 0.12 && ((x + y) & 1) === 0)) px.tone(x, y, -1); } px.toneLine(xl + 1, yt + b, xl + 1, y0 - b, 1); }
  px.toneLine(xl + b, yt, xr - b - 1, yt, 1);
  px.toneLine(xl + b * 0.5, yt - 1, xl + w * 0.45, yt - 1, 1);
  if (cut) {
    // dressed courses: a joint every ch rows, staggered, and the feather-and-wedge drill pits down the face
    const ch = o.ch ?? 6;
    for (let y = yt + ch; y < y0 - 1; y += ch) {
      px.toneLine(xl + 1, y, xr - 1, y, -1); px.toneLine(xl + 2, y - 1, xr - 3, y - 1, 1);
      const off = (((y - yt) / ch) | 0) % 2 ? 0 : 5;
      for (let x = xl + off + 3 + Math.floor(R() * 3); x < xr - 2; x += 9 + Math.floor(R() * 5)) px.toneLine(x, y - ch + 1, x, y - 1, -1);
    }
    if (o.drill) for (let x = xl + 3 + R() * 3; x < xr - 3; x += 4.5) { const yy = yt + 2; px.dot(x, yy, M.slateD, z + 0.2, { noLine: true }); px.dot(x, yy + 1, M.slateD, z + 0.2, { noLine: true }); px.dot(x + 1, yy, M.cut, z + 0.2, { noLine: true }); }
  } else if (!tor) {
    for (let y = yt + 3 + Math.floor(R() * 2); y < y0 - 2; y += 3 + Math.floor(R() * 3)) {
      const xa = xl + 1 + R() * 2, xb = xr - 1 - R() * 2;
      px.toneLine(xa, y, xb, y + (R() - 0.5), -1); px.toneLine(xa + 1, y - 1, xa + (xb - xa) * (0.3 + R() * 0.4), y - 1, 1);
      if (R() > 0.78) { const vx = xl + w * (0.2 + R() * 0.6); px.toneLine(vx, y + 1, vx + (R() - 0.5), Math.min(y0 - 1, y + 3 + R() * 3), -1); }
    }
    for (let k = 0; k < w / 14; k++) { const x = xl + w * (0.2 + R() * 0.6); px.toneLine(x, yt - 1, x + 2 + R() * 3, back + 1, -1); }
  } else {
    // ONE bedding crack and ONE vertical joint per loaf (ragged, each with a lit lip), a little speckle
    const jy = yt + h * (0.38 + R() * 0.3), vx = xl + w * (0.25 + R() * 0.5);
    for (let x = xl + 2; x < xr - 2; x++) { const yy = Math.round(jy + Math.sin((x - xl) * 0.5) * 0.8 + (hash(x, seedOf(xl)) - 0.5) * 1.4); px.tone(x, yy, -1); if (x % 3 !== 0) px.tone(x, yy - 1, 1); }
    for (let y = yt + 2; y < y0 - 1; y++) { const xx = Math.round(vx + (hash(y, 3) - 0.5) * 1.6); px.tone(xx, y, -1); if (y % 2) px.tone(xx - 1, y, 1); }
    for (let k = 0; k < w * h / 16; k++) px.tone(xl + R() * w, yt + R() * h, R() > 0.5 ? 1 : -1);
  }
  for (let k = 0; k < w * (h + d) / 30; k++) px.tone(xl + R() * w, back + R() * (h + d), R() > 0.6 ? 1 : -1);
  if (o.moss !== false && w > 11) {
    for (let k = 0; k < Math.max(1, w / 12); k++) px.ellipse(xl + w * (0.2 + R() * 0.6), back + d * (0.2 + R() * 0.4), 1.5 + R() * w * 0.12, 1 + R() * 1.5, R() > 0.4 ? M.moss : M.mossD, z + 0.1, { wrap: true, round: 0.5 });
    const L = o.lich ?? [M.lichG, M.lichY, M.lichG, M.lichR, M.lichG];
    for (let k = 0; k < Math.max(1, w / 15); k++) { const lx = xl + w * (0.08 + R() * 0.6), ly = R() > 0.5 ? back + d * R() : yt + 1 + R() * h * 0.35; px.ellipse(lx, ly, 1 + R() * 1.6, 0.6 + R() * 0.8, L[k % L.length], z + 0.12, { wrap: true }); }
  }
  return { yt, back };
};
// the foot of a rock: turf skirt over the lower edge, pebbles, a rust-stained streak or two
const foot = (px, s, R, m1, m2, o = {}) => {
  const heath = o.heath ?? 0;
  for (let k = 0; k < s / 3.2; k++) { const x = (R() - 0.5) * s * 1.05; px.part().ellipse(x, -0.5 + R(), 2 + R() * 2.5, 1.2 + R() * 0.8, R() > 0.5 ? M.turf : M.turfD, 9, { round: 0.6 }); }
  for (let k = 0; k < s / 5; k++) { const x = (R() - 0.5) * s * 1.05; px.part().line(x, 0, x + (R() - 0.5) * 2, -2 - R() * 3, R() > 0.5 ? M.straw : M.turfL, 9.5); }
  for (let k = 0; k < heath; k++) { const x = (R() - 0.5) * s * 1.1; px.part().ellipse(x, -1.2, 2 + R() * 2.4, 1.3 + R() * 0.8, R() > 0.5 ? M.heath : M.heathD, 9.2, { round: 0.7 }); if (R() > 0.4) px.dot(x + (R() - 0.5) * 3, -2.5, M.heathL, 9.4); }
  for (let k = 0; k < (o.pebbles ?? Math.min(5, 1 + s / 16)); k++) { const x = (R() > 0.5 ? 1 : -1) * (s * 0.42 + 2 + R() * 9), ps = 1 + R() * 1.5; px.part().ellipse(x, -ps * 0.5, ps, ps * 0.7, R() > 0.5 ? m1 : m2, 8, { round: 0.9 }); }
};

// ---- a rock mass of width s: one main loaf, a side block in front, a taller mass behind --------------------
// o.fam, o.tall, o.heath (heather clumps on the skirt), o.cap (heather and bracken on the top), o.cut (quarried east half)
const CACHE = new Map();
export const rockMass = (s, fam = "tor", seed = 1, o = {}) => {
  const key = `${s}|${fam}|${seed}|${JSON.stringify(o)}|${DAY.id}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const R = rng(seed), tor = fam === "tor";
  const m1 = o.pale ? M.pal : fam === "tor" ? M.tor : fam === "slate" ? M.slate : M.grit, m2 = o.pale ? M.palD : fam === "tor" ? M.torD : fam === "slate" ? M.slateD : M.gritD, topM = fam === "slate" ? M.cut : m1;
  const spr = sprite(s * 1.35 + 30, s * 1.1 + 44, (px) => {
    const H = (tor ? 0.34 : 0.26) * (o.tall ?? 1), Dp = tor ? 0.22 : 0.25, blocks = [];
    const J = () => 0.7 + R() * 0.6;
    if (o.single) { const a = s * 0.62, c0 = -s * 0.5; blocks.push([c0, c0 + a, 0, s * 0.2 * J(), s * 0.2, 3]); blocks.push([c0 + s * 0.3, c0 + s * 0.3 + s * 0.7, -s * 0.05, s * 0.3 * J(), s * 0.22, 3.2]); if (s > 30) blocks.push([c0 + s * 0.15, c0 + s * 0.15 + s * 0.4, 2, s * 0.1 * J(), s * 0.12, 3.5]); }
    else if (tor && s >= 26) {
      // a woolpack ridge: loaves of unequal height side by side (the tallest set back), one more loaf riding the tallest, never a pyramid
      const bd = s * 0.2, big = s >= 60, jx = () => (R() - 0.5) * s * 0.05;
      blocks.push([-s * 0.58 + jx(), s * 0.08 + jx(), 0, s * 0.17 * J(), bd, 3]);
      const bxl = -s * 0.28 + jx(), bxr = s * 0.4 + jx(), bh = s * (big ? 0.24 : 0.21) * J(), by0 = -bd * 0.7;
      blocks.push([bxl, bxr, by0, bh, bd * 0.9, 2.5]);
      blocks.push([s * 0.2 + jx(), s * 0.6 + jx(), 2, s * 0.11 * J(), bd * 0.6, 3.5]);
      if (s >= 60) blocks.push([bxl + s * 0.1, bxl + s * 0.1 + s * 0.34, by0 - bh - bd * 0.1, s * 0.1 * J(), bd * 0.7, 4]);
      if (s >= 100) blocks.push([-s * 0.5, -s * 0.1, -bd * 1.5, s * 0.22 * J(), bd * 0.8, 2]);
      if (s >= 150) blocks.push([s * 0.3, s * 0.7, -bd * 0.4, s * 0.15 * J(), bd * 0.7, 2.8]);
    } else if (s < 20) blocks.push([-s / 2, s / 2, 0, Math.max(2, s * H * 1.1 * J()), Math.max(2, s * Dp), 3]);
    else {
      const mx = -s * 0.08 + (R() - 0.5) * s * 0.08, mw = s * 0.72, h = s * H * J(), d = s * Dp * J();
      blocks.push([mx - mw / 2, mx + mw / 2, 0, h, d, 3]);
      blocks.push([mx + mw * 0.3, mx + mw * 0.3 + s * 0.42, 2, h * 0.6 * J(), d * 0.7, 3.5]);
      if (s >= 34) { const bw = s * 0.5, bx = mx - mw * 0.12 + (R() - 0.5) * s * 0.1; blocks.push([bx - bw / 2, bx + bw / 2, -d * 0.75, h * 1.25 * J(), d * 0.8, 2]); }
      if (s >= 60) {
        blocks.push([mx - mw / 2 - s * 0.12, mx - mw / 2 + s * 0.2, 3, h * 0.45, d * 0.6, 3.6]);
        blocks.push([mx + mw * 0.02, mx + mw * 0.02 + s * 0.3, -h - d * 0.45, h * 0.5 * J(), d * 0.55, 3.2]);
      }
    }
    blocks.sort((a, b) => a[5] - b[5]);
    const tops = [];
    blocks.forEach(([xl, xr, y0, h, d, z], i) => { const r = block(px, xl, xr, y0, h, d, fam, o.pale ? (i % 2 ? M.palD : M.palB) : tor ? (i % 3 === 1 ? m2 : m1) : m2, o.pale ? M.pal : tor ? (i % 3 === 1 ? m2 : m1) : topM, z + i * 0.01, R, o); tops.push([(xl + xr) / 2, r.back + d * 0.5, xr - xl]); });
    // the cap: heather and bracken on the top planes, moorland growing on the rock
    if (o.cap) for (const [cx, cy, w] of tops) {
      for (let k = 0; k < w / 7; k++) { const x = cx + (R() - 0.5) * w * 0.7, y = cy + (R() - 0.5) * 3; px.part().ellipse(x, y, 2 + R() * 2.4, 1.2 + R() * 0.8, R() > 0.5 ? M.heath : M.heathD, 9, { round: 0.7 }); if (R() > 0.4) px.dot(x + (R() - 0.5) * 3, y - 1.5, M.heathL, 9.3); }
      for (let k = 0; k < w / 10; k++) { const x = cx + (R() - 0.5) * w * 0.8, y = cy + 1; px.part().line(x, y, x + (R() - 0.5) * 4, y - 3 - R() * 3, R() > 0.5 ? M.brack : M.brackL, 9.5); }
    }
    if (o.skirt !== false) foot(px, s, R, m1, m2, { heath: o.heath ?? 0, pebbles: o.pebbles });
  }, 6);
  spr.contact = s * 0.5;
  CACHE.set(key, spr);
  return spr;
};

// ---- the cliff edge / rock wall: a long gritstone escarpment seen from the south ---------------------------
// len art px along, hgt the face height; two staggered courses (the back one taller), a gully, scree and fallen blocks at the foot
export const cliffWall = (len, hgt, seed = 3, o = {}) => {
  const key = `wall|${len}|${hgt}|${seed}|${JSON.stringify(o)}|${DAY.id}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const R = rng(seed), W = len + 60, Hh = hgt * 2.6 + 50;
  const spr = sprite(W, Hh, (px) => {
    const D = hgt * 0.5;
    // the back course first (taller, set up the page), staggered against the front
    let x = -len / 2;
    const gully = o.gully ?? 0.42 * len - len / 2;
    for (let i = 0; x < len / 2 - 6; i++) {
      const w = 36 + Math.floor(R() * 34), xr = Math.min(len / 2, x + w);
      if (xr - x > 8 && !(x < gully + 7 && xr > gully - 7)) block(px, x, xr, -D * 0.75 - 1 + Math.floor(R() * 3), hgt * (0.95 + R() * 0.5), D * 0.7, "grit", M.gritD, M.grit, 2 + i * 0.01, R, { moss: true });
      x = x + (xr - x) * 0.62 + Math.floor(R() * 4);
    }
    x = -len / 2 + 10;
    for (let i = 0; x < len / 2 - 8; i++) {
      const w = 34 + Math.floor(R() * 36), xr = Math.min(len / 2 - 2, x + w);
      if (xr - x > 8 && !(x < gully + 5 && xr > gully - 5)) block(px, x, xr, Math.floor(R() * 5) - 2, hgt * (0.55 + R() * 0.45), D * 0.6, "grit", M.grit, M.grit, 3 + i * 0.01, R, { moss: true });
      x = x + (xr - x) * 0.7 + Math.floor(R() * 4);
    }
    // the heather and bracken lip along the top
    for (let k = 0; k < len / 5; k++) { const lx = (R() - 0.5) * len; if (Math.abs(lx - gully) < 12) continue; px.part().ellipse(lx, -hgt * 1.2 - D * 0.9 + R() * 4, 2 + R() * 3, 1.2 + R(), R() > 0.5 ? M.heath : M.heathD, 9.5, { round: 0.7 }); }
    for (let k = 0; k < len / 9; k++) { const lx = (R() - 0.5) * len, ly = -hgt * 1.1 - D * 0.6; px.part().line(lx, ly, lx + (R() - 0.5) * 4, ly - 3 - R() * 3, R() > 0.5 ? M.brack : M.brackL, 9.6); }
    // rust-brown iron streaks down the south face
    for (let k = 0; k < len / 28; k++) { const sx = (R() - 0.5) * len; px.toneLine(sx, -hgt * 0.7, sx + (R() - 0.5), -2, -1); px.toneLine(sx + 1, -hgt * 0.65, sx + 1, -hgt * 0.2, -1); }
    // scree and fallen blocks along the foot, a little more under the gully
    for (let k = 0; k < len / 3.2; k++) {
      const gx = (R() - 0.5) * len, near = Math.abs(gx - gully) < 24, ps = 1 + R() * (near ? 3.4 : 2.2);
      px.part().ellipse(gx, 2 + R() * 4, ps * 1.2, ps * 0.8, R() > 0.5 ? M.scree : M.screeD, 8, { round: 0.9 });
    }
    for (let k = 0; k < 3; k++) { const gx = gully + (R() - 0.5) * 40, bw = 7 + R() * 7; block(px, gx - bw / 2, gx + bw / 2, 6 + R() * 3, bw * 0.45, bw * 0.3, "grit", M.gritD, M.grit, 6, R, { moss: false }); }
    foot(px, len, R, M.grit, M.gritD, { heath: 5, pebbles: 0 });
  }, 8);
  spr.contact = len * 0.5;
  CACHE.set(key, spr);
  return spr;
};

// ---- the quarried crag: a natural loaf on the west, its east half cut square, dressed blocks and spoil beside it -------
export const quarryCrag = (s, seed = 5, o = {}) => {
  const key = `quarry|${s}|${seed}|${JSON.stringify(o)}|${DAY.id}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const R = rng(seed);
  const spr = sprite(s * 1.5 + 36, s * 1.15 + 44, (px) => {
    const H = s * 0.3, Dp = s * 0.2;
    // the back mass, natural, behind
    block(px, -s * 0.34, s * 0.16, -Dp * 0.8, H * 1.3, Dp * 0.8, "slate", M.slateD, M.cut, 2, R, { moss: true });
    // the natural west loaf at the front
    block(px, -s * 0.5, -s * 0.02, 0, H * 0.95, Dp, "slate", M.slate, M.cut, 3, R, { moss: true });
    // the cut east block: square corners, dressed courses, drill pits down the freshly split face
    block(px, -s * 0.02, s * 0.46, 1, H * 1.05, Dp * 0.9, "cut", M.cut, M.slate, 3.2, R, { moss: false, drill: true, ch: 7 });
    // the last step of the cut: a smaller dressed block, a bench a block's height lower
    block(px, s * 0.3, s * 0.62, 3, H * 0.55, Dp * 0.6, "cut", M.cut, M.slate, 3.4, R, { moss: false, ch: 6 });
    // spoil: a heap of splintered stone in front of the cut, a few dressed blocks stacked square
    for (let k = 0; k < s / 2.2; k++) { const gx = s * 0.12 + (R() - 0.3) * s * 0.7, gy = 3 + R() * 6, ps = 0.8 + R() * 2; px.part().ellipse(gx, gy - ps * 0.4, ps * 1.2, ps * 0.8, R() > 0.5 ? M.slate : M.cut, 8, { round: 0.9 }); }
    for (let k = 0; k < 3; k++) { const bw = 10 + Math.floor(R() * 4); block(px, -s * 0.62 - bw * (k % 2) * 0.4, -s * 0.62 + bw - bw * (k % 2) * 0.4, 8 - k * 4.5, 4.5, 3, "cut", M.cut, M.cut, 6 + k * 0.1, R, { moss: false, ch: 9 }); }
    foot(px, s, R, M.slate, M.slateD, { heath: 2, pebbles: 2 });
  }, 6);
  spr.contact = s * 0.5;
  CACHE.set(key, spr);
  return spr;
};

// one dressed block, for the kerb of the C road and spare stones on the verge
export const dressed = (w, seed) => {
  const key = `dress|${w}|${seed}|${DAY.id}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const R = rng(seed), spr = sprite(w + 10, 20, (px) => { block(px, -w / 2, w / 2, 0, 4 + (w > 12 ? 1 : 0), 3, "cut", M.cut, M.cut, 3, R, { moss: false, ch: 9 }); }, 4);
  CACHE.set(key, spr);
  return spr;
};

// ---- ground work painted straight on the board (art px) -------------------------------------------------------
// a drift of moorland dabs: heather, bracken, straw grass, thinning at the rim
const DRIFT = {
  heather: ["#6e4470", "#7a4c7a", "#8e5a8c", "#a8689a", "#5a3a5c"],
  bracken: ["#8c4a26", "#a85a2c", "#c47a34", "#7c4224", "#b86a30"],
  straw: ["#a89440", "#bca64e", "#cdb85e", "#8e7c36", "#b0a050"],
  crimson: ["#8a2438", "#a83040", "#b84850", "#6a1c34", "#c05a4a"],
  olive: ["#566228", "#6b7a3a", "#7a8640", "#485424", "#8a9448"],
  turf: ["#566228", "#6b7a3a", "#7e8c44", "#485424", "#62703a"],
};
export const drift = (ctx, cx, cy, rx, ry, kind, seed, k = 1, k2 = null) => {
  const cols = DRIFT[kind].map(warm), cols2 = k2 ? DRIFT[k2].map(warm) : null;
  for (let j = -ry - 2; j <= ry + 2; j++) for (let i = -rx - 2; i <= rx + 2; i++) {
    const d = Math.hypot(i / rx, j / ry), n = hash(i + seed * 97, j - seed * 13), n2 = hash((i >> 2) + seed, (j >> 1) - seed);
    const v = d + (n2 - 0.5) * 0.5;
    if (v > 1 || n > k * (1.1 - v * 0.9)) continue;
    const c = cols2 && n2 > 0.62 ? cols2 : cols;
    px1(ctx, cx + i, cy + j, c[(n * 10 | 0) % 5]);
    if (hash(i, j + seed) > 0.8) px1(ctx, cx + i, cy + j - 1, c[(n * 7 | 0) % 5]);
  }
};
// the shrub carpet: solid low clumps, each with a dark base row, a crimson body and a lit top, olive clumps between
let S_CROP = [0, 0];
export const shrubDrift = (ctx, cx, cy, rx, ry, seed, n) => {
  const R = rng(seed), cl = [];
  n = Math.round(rx * ry * 2.6 / 60); for (let k = 0; k < n; k++) { const a = R() * 6.283, r = Math.sqrt(R()); { const qx = cx + Math.cos(a) * r * rx, qy = cy + Math.sin(a) * r * ry; if (nearestOnPath(S_CROP[0] + qx / 2, S_CROP[1] + qy / 2).d < PATH_HALF + 5) continue; cl.push([qx, qy, 9 + Math.floor(R() * 9), 5 + Math.floor(R() * 4), R() < 0.2]); } }
  cl.sort((p, q) => p[1] - q[1]);
  for (const [x, y, w, h, olive] of cl) {
    const body = olive ? ["#4c5a28", "#62722f", "#78883a"] : ["#4e1628", "#6e2234", "#8a3440"];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w * 2 - 1, v = (j + 0.5) / h * 2 - 1, e = (u * u * 0.9 + v * v * 1.1) + (hash(i + x | 0, j + y | 0) - 0.5) * 0.35;
      if (e > 1) continue;
      const lit = (j < h * 0.4 && i < w * 0.7), c = j >= h - 1 ? "#2c0e1e" : lit && hash(i, j + x) > 0.35 ? body[2] : body[1];
      px1(ctx, Math.round(x - w / 2 + i), Math.round(y - h + j), warm(olive && j >= h - 1 ? "#34401c" : c));
    }
  }
};
// a dry gravel band of width w along a polyline (canvas px), ragged edges, pale and grey stones
export const gravelBand = (ctx, pts, w, seed) => {
  const cols = ["#a8a49a", "#8e8a82", "#bcb8ae", "#76726c", "#9a968e"].map(warm);
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let t = 0; t <= n; t++) {
      const x = lerp(ax, bx, t / n), y = lerp(ay, by, t / n), ww = w * (0.8 + 0.4 * Math.sin(t * 0.07 + k + seed));
      for (let j = -ww / 2; j <= ww / 2; j++) {
        if (Math.abs(j) > ww * 0.35 && hash(t + k * 300, j + seed) > 0.55) continue;
        const hh = hash(Math.round(x), Math.round(y + j) + seed);
        px1(ctx, Math.round(x), Math.round(y + j), cols[(hh * 5) | 0]); px1(ctx, Math.round(x) + 1, Math.round(y + j), cols[(hh * 7 | 0) % 5]);
      }
    }
  }
};
// trodden bare earth / scree round a rock: stones on turf
export const scatter = (ctx, cx, cy, rx, ry, seed, cols) => {
  cols = cols.map(warm);
  for (let k = 0; k < rx * ry / 6; k++) {
    const a = hash(k, seed) * 6.283, r = Math.sqrt(hash(seed, k + 9)), x = Math.round(cx + Math.cos(a) * r * rx), y = Math.round(cy + Math.sin(a) * r * ry), c = cols[(hash(k, k) * cols.length) | 0];
    px1(ctx, x, y, c); if (hash(k, seed + 4) > 0.5) px1(ctx, x + 1, y, c);
  }
};

// ---- the road, where the flags are worn and patched (never ruts, never lanes) --------------------------------
// the mask: distance from the road's centre line at every art px of the crop
export const roadMask = (sc) => {
  const w = 840, h = 560, m = new Float32Array(w * h), x0 = sc.crop[0] * 2, y0 = sc.crop[1] * 2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[j * w + i] = nearestOnPath((x0 + i + 0.5) / 2, (y0 + j + 0.5) / 2).d;
  return m;
};
const FW = 42, FH = 24;   // one flag in art px
const PAT = {   // flag tones: [base, lit, shade, mortar]
  fresh: [["#a49c8c", "#b8b09e", "#867e70", "#6a6458"], ["#9c9484", "#b0a896", "#80786c", "#6a6458"], ["#aaa290", "#beb6a2", "#8a8274", "#6a6458"]],
  slate: [["#7e828a", "#949aa2", "#646870", "#4a4d56"], ["#767a84", "#8c9098", "#5e626c", "#4a4d56"], ["#868a92", "#9ca0a8", "#6a6e78", "#4a4d56"]],
  worn: [["#8a8478", "#9a9488", "#706a60", "#585248"], ["#807a6e", "#908a7e", "#686258", "#585248"]],
};
// one flag at canvas (fx, fy) clipped to the mask: a lit top-left edge, a shaded bottom-right, a mortar joint round it
const flag = (ctx, mask, sc, fx, fy, w, h, tones, seed, o = {}) => {
  const [b, l, s, mo] = tones.map(warm), x0 = sc.crop[0] * 2, y0 = sc.crop[1] * 2, lim = PATH_HALF * (o.reach ?? 0.97);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const cx = fx + i - x0, cy = fy + j - y0;
    if (cx < 0 || cy < 0 || cx >= 840 || cy >= 560 || mask[cy * 840 + cx] > lim) continue;
    const n = hash(fx + i, fy + j + seed);
    if (o.chip && ((i < 2 && j < 2) || (i >= w - 3 && j >= h - 2)) && hash(seed, i + j) > 0.35) continue;   // a chipped corner: leave whatever is under it
    let c = b;
    if (i === 0 || j === 0) c = mo;
    else if (i === 1 || j === 1) c = l;
    else if (i >= w - 2 || j >= h - 2) c = s;
    else if (n > 0.93) c = l; else if (n < 0.06) c = s;
    px1(ctx, fx + i, fy + j, c);
  }
};
// where the road runs straight (angle a multiple of 90 degrees): centre points along it, spaced
const straights = (sc, seed, n, skip = 0) => {
  const out = [], R = rng(seed), x0 = sc.crop[0], y0 = sc.crop[1];
  for (let tries = 0; tries < 900 && out.length < n; tries++) {
    const d = R() * TOTAL_LEN, [x, y] = posAt(d), a = angleAt(d), q = Math.abs(((a / (Math.PI / 2)) % 1 + 1) % 1);
    if (!(q < 0.02 || q > 0.98)) continue;
    if (x < x0 + 40 || x > x0 + 380 || y < y0 + 36 || y > y0 + 244) continue;
    if (out.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < 90)) continue;
    const horiz = Math.abs(Math.cos(a)) > 0.7;
    out.push([x, y, horiz]);
  }
  return out.slice(skip);
};
// patches of newer flags laid into the old paving: a few rows, uneven, a tone apart
export const patchRoad = (ctx, S, mask, seed, n, kind = "fresh", o = {}) => {
  const sc = S.sc;
  for (const [bx, by, horiz] of straights(sc, seed, n)) {
    const R = rng(Math.round(bx * 7 + by));
    const cols = o.cols ?? (horiz ? 2 + Math.floor(R() * 2) : 1 + Math.floor(R() * 2)), rows = horiz ? 1 + Math.floor(R() * 2) : 2 + Math.floor(R() * 2);
    const px0 = Math.round(bx * 2 + (R() - 0.5) * 20), py0 = Math.round(by * 2 + (R() - 0.5) * 20);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const fx = px0 + c * FW - (r % 2 ? FW / 2 : 0) + Math.floor(R() * 3) - 1, fy = py0 + r * FH + Math.floor(R() * 2);
      flag(ctx, mask, sc, fx, fy, FW - 1, FH - 1, PAT[kind][(R() * PAT[kind].length) | 0], Math.round(R() * 99), { chip: R() > 0.4 });
    }
    // a hairline crack in the flag next door and weeds in the joint beside the patch
    if (o.weeds !== false) for (let k = 0; k < 7; k++) { const wx = px0 + Math.floor(R() * cols * FW), wy = py0 + (R() > 0.5 ? -1 : rows * FH - 1); px1(ctx, wx, wy, warm(R() > 0.5 ? "#6b7a3a" : "#7e8c44")); px1(ctx, wx, wy - 1, warm("#8a9a4c")); }
  }
};
// the old flags worn: weeds in the joints, tufts at the verge, a few missing corners showing earth, moss on the shaded sides
export const wearRoad = (ctx, S, mask, seed, density = 1) => {
  const sc = S.sc, x0 = sc.crop[0] * 2, y0 = sc.crop[1] * 2, R = rng(seed);
  for (let k = 0; k < 520 * density; k++) {
    const i = Math.floor(R() * 840), j = Math.floor(R() * 560), d = mask[j * 840 + i];
    if (d > PATH_HALF * 0.95) continue;
    const edge = d > PATH_HALF * 0.78, cx = x0 + i, cy = y0 + j;
    if (!edge && R() > 0.18) continue;
    const c = warm(R() > 0.5 ? "#6b7a3a" : R() > 0.5 ? "#566228" : "#7e8c44");
    px1(ctx, cx, cy, c); if (edge) { px1(ctx, cx, cy - 1, warm("#7e8c44")); if (R() > 0.5) px1(ctx, cx + 1, cy, c); }
  }
  // dark worn hollows (no lanes: a few round-ended smudges where feet land)
  for (let k = 0; k < 14 * density; k++) {
    const i = Math.floor(R() * 800 + 20), j = Math.floor(R() * 520 + 20);
    if (mask[j * 840 + i] > PATH_HALF * 0.55) continue;
    const rx = 6 + R() * 10, ry = 3 + R() * 4;
    for (let v = -ry; v <= ry; v++) for (let u = -rx; u <= rx; u++) if (Math.hypot(u / rx, v / ry) < 1 && hash(u + k, v) > 0.45) { const cx = i + Math.round(u), cy = j + Math.round(v); if (mask[cy * 840 + cx] < PATH_HALF * 0.9) { ctx.fillStyle = "rgba(40,34,44,0.16)"; ctx.fillRect(x0 + cx, y0 + cy, 1, 1); } }
  }
};
// a full re-lay in slate flags of unequal sizes (rows of unequal height, flags of unequal width, joints tight), a dressed kerb at the edge (option C)
export const relayRoad = (ctx, S, mask, seed) => {
  const sc = S.sc, x0 = sc.crop[0] * 2, y0 = sc.crop[1] * 2;
  let y = 0, r = 0;
  while (y < y0 + 560) {
    const rh = 20 + Math.floor(hash(r, seed) * 11);
    if (y + rh > y0 - 4) {
      let x = -hash(r, seed + 4) * 40, c = 0;
      while (x < x0 + 840) {
        const fw = 28 + Math.floor(hash(r * 31 + c, seed + 1) * 26);
        if (x + fw > x0 - 4) flag(ctx, mask, sc, Math.round(x), y, fw - 1, rh - 1, PAT.slate[(hash(r * 7 + c, seed + 9) * 3) | 0], r * 131 + c, { chip: hash(c, r) > 0.92, reach: 0.9 });
        x += fw; c++;
      }
    }
    y += rh; r++;
  }
  for (let j = 0; j < 560; j++) for (let i = 0; i < 840; i++) {
    const d = mask[j * 840 + i];
    if (d < PATH_HALF * 0.9 || d > PATH_HALF * 1.0) continue;
    const bw = 13, k = Math.floor((x0 + i + (Math.floor((y0 + j) / 6) % 2) * 6) / bw), n = hash(k, Math.floor((y0 + j) / 6) + seed);
    const edgeLine = d > PATH_HALF * 0.985;
    px1(ctx, x0 + i, y0 + j, warm(edgeLine ? "#40434d" : n > 0.7 ? "#9a9ea6" : n > 0.35 ? "#8a8e98" : "#7a7e88"));
  }
};
// loose stones and a few kerbstones of the old road at the verge
export const verge = (S, seed, n, dressedToo = false) => {
  const sc = S.sc, R = rng(seed);
  for (let tries = 0; tries < 800 && n > 0; tries++) {
    const lx = 10 + R() * 400, ly = 10 + R() * 260, near = nearestOnPath(sc.crop[0] + lx, sc.crop[1] + ly);
    if (near.d < PATH_HALF + 2 || near.d > PATH_HALF + 8) continue;
    n--;
    S.add(dressedToo && R() > 0.4 ? dressed(8 + Math.floor(R() * 7), seed + n) : rockMass(4 + Math.floor(R() * 4), "grit", seed + n + 5, { skirt: false, pebbles: 0, moss: false }), lx, ly, { shade: 0.5 });
  }
};

// a puddle on the flags: sky in a dark rim, a lighter band across its middle, glints and a slow ripple (live)
export const puddle = (S, lx, ly, rx, ry, phase = 0) => {
  const [cx, cy] = S.P(lx, ly), sky = DAY.id === "golden" ? "#8a8fa0" : "#8ea4b4", skyL = DAY.id === "golden" ? "#b8bcc6" : "#c4d4dc", rim = "#4a4854";
  S.onGround((ctx) => {
    for (let j = -ry - 2; j <= ry + 2; j++) for (let i = -rx - 3; i <= rx + 3; i++) {
      const a = Math.atan2(j / ry, i / rx), lob = 1 + 0.22 * Math.sin(a * 3 + lx) + 0.14 * Math.sin(a * 5 + ly), d = Math.hypot(i / rx, j / ry) / lob + (hash(i + lx, j + ly) - 0.5) * 0.3;
      if (d > 1) continue;
      px1(ctx, cx + i, cy + j, d > 0.86 ? rim : (j < -ry * 0.25 && d < 0.7 ? skyL : sky));
    }
  });
  S.live.push((ctx, t) => {
    const u = (t + phase) % 1, r = u * 0.9;
    for (let a = 0; a < 6.283; a += 0.14) { const x = Math.round(cx + Math.cos(a) * rx * r * 0.75), y = Math.round(cy + Math.sin(a) * ry * r * 0.75); px1(ctx, x, y, skyL); }
    const g = Math.floor(t * 3 + phase * 7) % 3; px1(ctx, cx - Math.round(rx * 0.4) + g * 2, cy - Math.round(ry * 0.3), "#e8ecf2");
  });
};

// ---- the live grass: tufts that stir (whole art px, a seamless sway) ---------------------------------------------
const TUFT = {
  heather: { cols: ["#5a3a5c", "#7a4c7a", "#a8689a", "#c88ab8"], h: 5 },
  bracken: { cols: ["#7c4224", "#a85a2c", "#c47a34", "#d8944a"], h: 8 },
  straw: { cols: ["#8e7c36", "#bca64e", "#d8c46a", "#e8d886"], h: 7 },
  turf: { cols: ["#485424", "#6b7a3a", "#7e8c44", "#98a850"], h: 5 },
};
// a tuft rooted at board-local (lx, ly): blades of 1 px, the tips swaying by whole px with the phase
export const tuft = (S, lx, ly, kind, seed = 1, o = {}) => {
  const [cx, cy] = S.P(lx, ly), T = TUFT[kind], R = rng(seed), n = o.n ?? 5, blades = [];
  for (let k = 0; k < n; k++) blades.push({ dx: Math.round((R() - 0.5) * (o.spread ?? 7)), h: Math.round(T.h * (0.6 + R() * 0.7)), lean: (R() - 0.5) * 2, ph: R() * 0.35, c: (R() * 4) | 0 });
  const draw = (ctx, t) => {
    ctx.imageSmoothingEnabled = false;
    for (const b of blades) {
      const sway = Math.sin((t * (o.fast ?? 1) + b.ph + lx / 90) * 6.283);
      for (let y = 0; y < b.h; y++) {
        const f = y / b.h, off = Math.round(b.lean * f * 1.5 + sway * f * (kind === "bracken" ? 2.6 : 1.9) * (o.k ?? 1)), col = warm(T.cols[Math.min(3, Math.floor(f * 3.2) + (b.c > 2 ? 1 : 0))]);
        px1(ctx, cx + b.dx + off, cy - y, col);
        if (kind === "bracken" && y > b.h * 0.55) px1(ctx, cx + b.dx + off + (b.lean > 0 ? 1 : -1), cy - y + 1, col);
      }
      if (kind === "heather") px1(ctx, cx + b.dx + Math.round(sway * 1.2), cy - b.h - 1, warm("#d8a0c8"));
    }
  };
  S.live.push(draw);
};
export const tuftBed = (S, lx, ly, rx, ry, kind, count, seed, o = {}) => { const R = rng(seed); for (let k = 0; k < count; k++) tuft(S, lx + (R() - 0.5) * 2 * rx, ly + (R() - 0.5) * 2 * ry, kind, seed + k, { n: 3 + ((R() * 3) | 0), ...o }); };

// ---- the scenes -------------------------------------------------------------------------------------------------
// Two boards. crop: the 420 x 280 board patch (board units), shown at 4x. LAY names the rocks, board-local, by hand.
export const SCENES = {
  greyhelm: {
    realm: "greyhelm", faction: "iron", crop: [60, 170], sun: "afternoon", halls: [["archer", 205, 205, 2], ["knight", 400, 300, 2]],
    // big: [x, y, size] ... , mid, small are auto-chosen in clear grass
    land: [[112, 250, 190], [372, 112, 150]], edge: [34, 130, 276], wall: [100, 162, 80, 34], run: [[30, 150], [150, 196], [205, 262]],
    zoneBox: [[0, 0, 420, 280]],
  },
  blackcliff: {
    realm: "blackcliff", faction: "iron", crop: [10, 235], sun: "golden", halls: [["archer", 205, 120, 2], ["knight", 360, 235, 2]],
    land: [[75, 228, 190], [262, 247, 140]], edge: [104, 20, 270], wall: [190, 168, 80, 34], run: [[140, 140], [200, 205], [165, 272]],
    zoneBox: [[0, 0, 420, 280]],
  },
};
// clear spots: seeded candidates in the crop, off the road by `clear` and off every hall, not overlapping the earlier ones
const clearSpots = (sc, towers, seed, n, rad, taken) => {
  const R = rng(seed), out = [];
  for (let tries = 0; tries < 4000 && out.length < n; tries++) {
    const lx = 14 + R() * 392, ly = 20 + R() * 250, near = nearestOnPath(sc.crop[0] + lx, sc.crop[1] + ly);
    if (near.d < PATH_HALF + rad + 2) continue;
    if (towers.some((t) => Math.hypot(t.x - sc.crop[0] - lx, t.y - sc.crop[1] - ly) < rad + 26)) continue;
    if ([...taken, ...out].some(([x, y, r]) => Math.hypot(x - lx, y - ly) < r + rad + 3)) continue;
    out.push([lx, ly, rad]);
  }
  return out;
};

// the road is the same in every option: today's flags worn and patched, weeds in the joints, kerbstones and loose stones at the verge, two puddles
const roadAll = (S) => {
  S.onGround((c) => { patchRoad(c, S, S.mask, 8, 5, "fresh"); wearRoad(c, S, S.mask, 9, 1.1); });
  verge(S, 140, 14, true);
  roadPuddle(S, 14, -16, 7, 18, 5, 0.1); roadPuddle(S, 15, 12, -4, 15, 5, 0.55);
};
const compose = (S, opt, towers, o = {}) => {
  const sc = S.sc, L = sc.land, seed = o.seed ?? 1, R = rng(seed + 100);
  const lm = L.map(([x, y, s]) => [x, y, s / 4]);
  const mids = clearSpots(sc, towers, 11 + seed, 5, 14, lm);
  const smalls = clearSpots(sc, towers, 31 + seed, 12, 6, [...lm, ...mids]);
  S_CROP = sc.crop;
  const shrubAt = (x, y, rx, ry, sd, n) => S.onGround((c) => { const [gx, gy] = S.P(x, y); drift(c, gx, gy, rx * 2, ry * 2, "olive", sd, 0.5); shrubDrift(c, gx, gy, rx * 2, ry * 2, sd, n); });
  if (opt === "A") {
    // A, THE TORS: pale-topped grey granite ridges, flat tops, one joint and one crack a loaf; shrub in three drifts; a gravel stream bed with big boulders
    const pts = sc.run || [];
    S.onGround((c) => gravelBand(c, pts.map(([x, y]) => S.P(x, y)), 26, 4));
    shrubAt(L[0][0] + 24, L[0][1] + 10, 54, 11, 7, 26); shrubAt(L[1][0] - 10, L[1][1] + 10, 46, 10, 9, 20); shrubAt(mids[0] ? mids[0][0] : 200, mids[0] ? mids[0][1] + 6 : 150, 34, 8, 12, 14);
    L.forEach(([x, y, s], i) => S.add(rockMass(s, "tor", 31 + i * 7, { pale: true, cap: false, heath: 0, pebbles: 5 }), x, y));
    mids.forEach(([x, y], i) => S.add(rockMass(Math.round(34 + R() * 24), "tor", 50 + i, { pale: true, cap: false, heath: 0, pebbles: 3 }), x, y));
    smalls.forEach(([x, y], i) => S.add(rockMass(7 + Math.floor(R() * 9), "tor", 80 + i, { pale: true, skirt: i % 3 === 0, moss: false, pebbles: 1 }), x, y, { shade: 0.6 }));
    const rr = rng(77);
    for (let k = 0; k + 1 < pts.length; k++) for (let t = 0.1; t < 1; t += 0.4) { const x = lerp(pts[k][0], pts[k + 1][0], t) + (rr() - 0.5) * 8, y = lerp(pts[k][1], pts[k + 1][1], t) + (rr() - 0.5) * 4; if (nearestOnPath(sc.crop[0] + x, sc.crop[1] + y).d < PATH_HALF + 14) continue; S.add(rockMass(Math.round(24 + rr() * 26), "tor", 600 + ((x + y) | 0), { pale: true, single: true, moss: false, pebbles: 2 }), x, y, { shade: 0.8 }); }
    L.forEach(([x, y, s], i) => { tuftBed(S, x, y + 4, s * 0.45, 5, "bracken", 6, 200 + i); tuftBed(S, x, y + 5, s * 0.4, 4, "straw", 6, 260 + i); });
    roadAll(S);
  } else if (opt === "B") {
    // B, THE ERRATICS: no stacked tors; single boulders of every size strewn through the shrub carpet, running in loose lines, clumps of shrub between and against them
    const big = clearSpots(sc, towers, 55 + seed, 7, 16, [...lm.slice(0, 0)]), ev = [...big, ...mids];
    shrubAt(110, 215, 70, 14, 21, 40); shrubAt(290, 130, 50, 12, 23, 28); shrubAt(250, 250, 56, 10, 25, 30);
    ev.forEach(([x, y], i) => S.add(rockMass(Math.round(26 + R() * R() * 60), "tor", 700 + i, { pale: true, single: true, moss: i % 3 === 0, pebbles: 3 }), x, y));
    clearSpots(sc, towers, 91 + seed, 22, 5, ev).forEach(([x, y], i) => S.add(rockMass(5 + Math.floor(R() * 11), "tor", 760 + i, { pale: true, single: true, skirt: i % 3 === 0, moss: false, pebbles: 1 }), x, y, { shade: 0.6 }));
    ev.forEach(([x, y], i) => tuftBed(S, x, y + 3, 14, 3, i % 2 ? "bracken" : "straw", 4, 800 + i));
    roadAll(S);
  } else if (opt === "C") {
    // C, THE CRAG LINE: a broken line of tors along the wood edge (the backdrop), a few fallen boulders in front, shrub at their foot
    const [ex, ey0, ey1] = sc.edge, n = 6;
    shrubAt(ex + 36, (ey0 + ey1) / 2, 30, (ey1 - ey0) / 2 - 20, 31, 46);
    for (let k = 0; k < n; k++) {
      const y = lerp(ey0, ey1, (k + 0.5) / n) + (R() - 0.5) * 8, x = ex + (R() - 0.5) * 14;
      if (k % 3 === 2) continue;   // gaps, so the line breaks
      S.add(rockMass(Math.round(84 + R() * 40), "tor", 900 + k * 11, { pale: true, cap: false, heath: 0, pebbles: 4 }), x, y);
    }
    clearSpots(sc, towers, 71 + seed, 8, 9, [...mids]).filter(([x]) => x < ex + 80).slice(0, 5).forEach(([x, y], i) => S.add(rockMass(Math.round(14 + R() * 16), "tor", 950 + i, { pale: true, single: true, moss: false, pebbles: 2 }), x, y, { shade: 0.7 }));
    roadAll(S);
  }
};
export const buildScene = (ctx, sc, opt, towers, o = {}) => {
  const S = new Scene(ctx, sc);
  S.mask = roadMask(sc);
  compose(S, opt, towers, o);
  return S;
};
// a puddle on the nearest straight of road to a seed point
export const roadPuddle = (S, seed, dx, dy, rx, ry, phase) => { const sp = straights(S.sc, seed, 1)[0]; if (sp) puddle(S, sp[0] - S.sc.crop[0] + dx, sp[1] - S.sc.crop[1] + dy, rx, ry, phase); };
export const LABELS = { A: "A  THE TORS", B: "B  THE ERRATICS", C: "C  THE CRAG LINE", today: "TODAY" };
