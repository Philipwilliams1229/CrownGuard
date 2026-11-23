// The overhaul water's LIFE (B1): reed clumps swaying (4 baked poses each), lily pads bobbing, ducks
// paddling in the slack, a heron standing in the shallows. Placed from the field at the bake
// (buildLife), drawn every frame (drawLife): one blit a piece.
// Creatures keep clear of foes: a duck within FLEE units of a foe paddles off from it (and back).
import { hs, clamp } from "./field.js";
import { underBridge } from "../../data/terrain.js";
import { W, H, WALL_W } from "../../data/constants.js";

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pal = (...a) => a.map(hex);
const REED = pal("#2e4a24", "#46683a", "#628a44", "#82a854", "#a8c470", "#c8d890");
const PAD = pal("#23482a", "#336a34", "#4c8a3e", "#6cac52", "#90c86a");
const FOAM2 = hex("#cfe2da");
const TAU = Math.PI * 2;
const FLEE = 60;

// a little RGBA painter over a fresh canvas (art px)
function sprite(w, h, paint) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h), P = img.data;
  const set = (x, y, col, a = 1) => {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4, A = Math.round(a * 255);
    if (P[o + 3] && A < 255) { const k = a; P[o] += (col[0] - P[o]) * k; P[o + 1] += (col[1] - P[o + 1]) * k; P[o + 2] += (col[2] - P[o + 2]) * k; return; }
    P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = Math.max(P[o + 3], A);
  };
  paint(set); c.putImageData(img, 0, 0); return cv;
}

// a reed / rush clump, its foot at (cx, base) of a 20 x 28 sprite; sway = the tip's offset (art px)
const RW = 20, RH = 28;
function reedClump(seed, size, sway, cattails) {
  return sprite(RW, RH, (set) => {
    const X = 10, Y = RH - 3, n = 7 + Math.floor(hs(seed, 1) * 6);
    for (let x = -4; x <= 4; x++) set(X + x, Y + 1, hex("#1e3426"), 0.45 * (1 - Math.abs(x) / 5));
    const stems = [];
    for (let q = 0; q < n; q++) stems.push({ dx: (hs(seed, q, 2) - 0.5) * 7, hgt: size * (0.6 + hs(seed, q, 3) * 0.5), lean: (hs(seed, q, 4) - 0.5) * 0.5, q });
    stems.sort((a, b) => a.dx - b.dx);
    for (const { dx, hgt, lean, q } of stems) {
      const sw = sway * (0.75 + 0.5 * hs(seed, q, 8));
      const at = (y) => X + dx + lean * y * (y / hgt) + sw * (y / hgt) * (y / hgt);
      for (let y = 0; y < hgt; y++) {
        const x = at(y);
        set(x, Y - y, y < 2 ? REED[0] : y < hgt * 0.35 ? REED[1] : dx < 0 ? REED[3 + (y > hgt * 0.7 ? 1 : 0)] : REED[2 + (y > hgt * 0.75 ? 1 : 0)]);
        if (q % 2 === 0 && y < hgt * 0.75) set(x + 1, Y - y, y < hgt * 0.35 ? REED[0] : REED[1]);
      }
      if (cattails && hs(seed, q, 5) > 0.82) { const x = at(hgt); for (let y = 0; y < 3; y++) { set(x, Y - hgt + 1 - y, y === 2 ? hex("#8a5a32") : hex("#5e3a20")); set(x + 1, Y - hgt + 1 - y, hex("#3e2614")); } set(x, Y - hgt - 2, REED[3]); }
      else if (hs(seed, q, 6) > 0.5) { const x = at(hgt); set(x + (lean > 0 ? 1 : -1), Y - hgt + 1, REED[4]); set(x + (lean > 0 ? 2 : -2), Y - hgt + 2, REED[3]); }
    }
  });
}
// a lily pad (and sometimes a flower), r art px; bob shifts it down one px
function lilyPad(seed, r) {
  const w = Math.ceil(r * 2.8) + 3, h = r * 2 + 4;
  return sprite(w, h, (set) => {
    const X = Math.floor(w / 2), Y = r + 2, notch = hs(seed, 1) * 6.28;
    for (let y = -r; y <= r; y++) for (let x = -r * 1.4; x <= r * 1.4; x++) {
      const u = x / (r * 1.4), v = y / r, rr = u * u + v * v; if (rr > 1) continue;
      const a = Math.atan2(v, u), da = Math.abs(((a - notch + 9.42) % 6.28) - 3.14); if (da > 2.85 && rr > 0.05) continue;
      set(X + x, Y + y, rr > 0.7 && v > 0 ? PAD[0] : u + v < -0.6 ? PAD[4] : rr < 0.25 ? PAD[3] : PAD[2]);
    }
    if (hs(seed, 2) > 0.6) {
      const fx = X + Math.round((hs(seed, 3) - 0.5) * r), fy = Y - 1, pink = hs(seed, 4) > 0.5;
      set(fx, fy, hex("#f6e070")); set(fx - 1, fy, pink ? hex("#e898b4") : hex("#f4f0ea")); set(fx + 1, fy, pink ? hex("#d47898") : hex("#dcd8d0"));
      set(fx, fy - 1, pink ? hex("#f4b8cc") : hex("#ffffff")); set(fx, fy + 1, pink ? hex("#c46888") : hex("#c8c4bc"));
    }
  });
}
// birds: hand-placed pixels
const DUCK = ["..gg....", ".gGgk...", ".gge....", "bbbbbb..", "BBwwbbb.", ".BBBBb.."];
const HEN = ["..bb....", ".bBbk...", ".bbe....", "bbbbbb..", "BBbbbbb.", ".BBBBb.."];
const HERON = ["...gg..", "..gGG..", ".yy.g..", "....g..", "...gg..", "..gGGg.", ".gGGGgg", "..gGGg.", "...l...", "...l...", "...l...", "..wwww."];
const HERON_DIP = [".......", ".......", ".......", "..gg...", ".gGGg..", "yygGGg.", ".gGGGgg", "..gGGg.", "...l...", "...l...", "...l...", "..wwww."];
const BC = { g: "#1e6a3e", G: "#3aa060", k: "#101010", e: "#f0c040", b: "#b08458", B: "#6a4428", w: "#f2f0e8", y: "#d8b048", l: "#6a6a5a" };
function birdSprite(map, flip, heron) {
  const C = { ...BC }; if (heron) { C.g = "#8a9098"; C.G = "#b4bcc4"; C.w = "#cfe2da"; }
  const w = map[0].length + 10, h = map.length + 2;
  return sprite(w, h, (set) => {
    map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") set(5 + (flip ? row.length - 1 - i : i), j, hex(C[ch]), heron && ch === "w" ? 0.55 : 1); }));
    if (!heron) for (let i = -1; i <= map[0].length; i++) set(5 + i, map.length, FOAM2, i % 3 ? 0.3 : 0.55);   // the water line round it
  });
}

let LIFE = null;
export function buildLife(F) {
  if (!F) { LIFE = null; return; }
  if (F.k !== 2) return;
  const { w, h, D, KIND, NX, NY, BODY, FW } = F, ax0 = Math.round(F.x0 * 2), ay0 = Math.round(F.y0 * 2), XR = (W - WALL_W) * 2;
  const reeds = [], lilies = [], seen = new Set();
  for (let j = 3; j < h - 3; j++) for (let i = 3; i < w - 3; i++) {
    const p = j * w + i, d = D[p]; if (BODY[p] < 0 || d > 0 || d < -1) continue;
    const kd = KIND[p], X = ax0 + i, Y = ay0 + j; if (X > XR - 6) continue;
    if (kd !== 2 && kd !== 0) continue;
    const near = NY[p] / 127 > 0.35, cz = kd === 2 ? 5 : 7, cell = `${kd}${Math.floor(X / cz)},${Math.floor(Y / cz)}`;
    if (seen.has(cell)) continue; seen.add(cell);
    const r = hs(X, Y, 90), inx = -NX[p] / 127, iny = -NY[p] / 127;
    const x = (X + inx * 4) / 2, y = (Y + iny * 4 + 3) / 2;
    if (underBridge(x, y, 6)) continue;
    if (kd === 2) {
      if (r < 0.62) { const o = 2 + hs(X, Y, 95) * 6; reeds.push({ x: (X + inx * o) / 2, y: (Y + iny * o + 3) / 2, seed: X * 31 + Y, size: 9 + hs(X, Y, 91) * 9, cat: true }); }
      if (r < 0.5) { const dd = 12 + hs(X, Y, 92) * 20, lx = (X + inx * dd + (hs(X, Y, 93) - 0.5) * 10) / 2, ly = (Y + iny * dd) / 2; lilies.push({ x: lx, y: ly, seed: X + Y * 7, r: 2 + Math.round(hs(X, Y, 94) * 2) }); }
    } else if (!near && r > 0.4 && r < 0.47) reeds.push({ x: (X + inx * 3) / 2, y: (Y + iny * 3 + 2) / 2, seed: X + Y * 3, size: 9, cat: false });
  }
  // keep lilies on open water, clear of each other
  const fieldAt = (x, y) => { const i = Math.floor((x - F.x0) * 2), j = Math.floor((y - F.y0) * 2); return i < 0 || j < 0 || i >= w || j >= h ? -1 : j * w + i; };
  const pads = [];
  for (const L of lilies) { const q = fieldAt(L.x, L.y); if (q < 0 || D[q] > -(FW[q] / 8 + 3)) continue; if (pads.some((o) => Math.hypot(o.x - L.x, o.y - L.y) < 3.5)) continue; pads.push(L); }
  // sprites: each reed clump its own 4 poses (sway -1, 0, 1, 0 px at the tip, larger for tall ones)
  for (const R of reeds) { const A = R.size > 13 ? 1.6 : 1.1; R.poses = [-A, 0, A].map((sw) => reedClump(R.seed, R.size, sw, R.cat)); }
  for (const L of pads) L.cv = lilyPad(L.seed, L.r);
  reeds.sort((a, b) => a.y - b.y);
  // ducks in the reed bay (or any slack water), a heron at the edge of the shallows
  const spots = (pred, n, gap) => {
    const out = [];
    for (let j = 0; j < h; j += 4) for (let i = 0; i < w; i += 4) {
      const q = j * w + i; if (BODY[q] < 0) continue; const e = -D[q] - FW[q] / 8;
      if (!pred(KIND[q], e, F.Q[q])) continue;
      const x = F.x0 + (i + 0.5) / 2, y = F.y0 + (j + 0.5) / 2; if (x * 2 > XR - 10 || y < 4 || y > H - 4 || underBridge(x, y, 10)) continue;
      out.push({ x, y, r: hs(i, j, 333) });
    }
    out.sort((a, b) => b.r - a.r);
    const pick = []; for (const c of out) { if (pick.length >= n) break; if (pick.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < gap)) continue; pick.push(c); }
    return pick;
  };
  const bay = spots((k, e) => k === 2 && e > 10 && e < 18, 1, 40);
  const slack = bay.length ? bay : spots((k, e, q) => k === 0 && e > 8 && e < 14 && q < 0.8, 1, 40);
  const ducks = [];
  for (const c of slack) for (let n = 0; n < 3; n++) ducks.push({ x: c.x + (n - 1) * 5 + hs(n, 1, 5) * 2, y: c.y + (n === 1 ? -2 : 1.5), ph: n * 2.1, hen: n === 2, ox: 0, oy: 0 });
  const heronAt = spots((k, e, q) => (k === 0 || k === 2) && e > 2.5 && e < 5, 12, 1).find((c) => c.y > 60 && c.y < H - 60 && c.x > 40);
  const sprites = {
    duck: [false, true].map((f) => birdSprite(DUCK, f)), hen: [false, true].map((f) => birdSprite(HEN, f)),
    heron: [HERON, HERON_DIP].map((m) => birdSprite(m, false, true)),
  };
  LIFE = { reeds, pads, ducks, heron: heronAt ? { x: heronAt.x, y: heronAt.y } : null, sprites };
}

export function drawLife(ctx, g) {
  if (!LIFE) return;
  const time = g.time || 0, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  // lilies (under the reeds), bobbing a pixel as a ripple passes
  for (const L of LIFE.pads) { const bob = Math.sin(TAU * time / 3 + L.seed * 0.61) > 0.45 ? 0.5 : 0; ctx.drawImage(L.cv, Math.round(L.x * 2 - L.cv.width / 2) / 2, L.y - L.cv.height / 4 + bob, L.cv.width / 2, L.cv.height / 2); }
  // reeds: a slow sway with a gust running across the board (poses -A, 0, A, 0)
  const ORDER = [0, 1, 2, 1];
  for (const R of LIFE.reeds) {
    const ph = time / 3.2 - R.x / 260 + (R.seed % 7) * 0.02, f = ORDER[((Math.floor(ph * 4) % 4) + 4) % 4];
    ctx.drawImage(R.poses[f], R.x - RW / 4, R.y - (RH - 3) / 2, RW / 2, RH / 2);
  }
  // ducks: idling in small ellipses, paddling off from any foe that comes near
  const foes = g.enemies || [];
  for (const d of LIFE.ducks) {
    let fx = 0, fy = 0;
    for (const e of foes) { const dx = d.x - e.x, dy = d.y - e.y, r = Math.hypot(dx, dy); if (r < FLEE && r > 0.1) { fx += (dx / r) * (FLEE - r) / FLEE; fy += (dy / r) * (FLEE - r) / FLEE; } }
    d.ox += (clamp(fx * 10, -10, 10) - d.ox) * 0.02; d.oy += (clamp(fy * 4, -4, 4) - d.oy) * 0.02;
    const ph = TAU * time / 9 + d.ph, x = d.x + 2.5 * Math.cos(ph) + d.ox, y = d.y + 0.8 * Math.sin(ph) + d.oy, flip = Math.sin(ph) < 0;
    const bob = Math.sin(TAU * time / 1.4 + d.ph) > 0.5 ? 0.5 : 0;
    const cv = (d.hen ? LIFE.sprites.hen : LIFE.sprites.duck)[flip ? 1 : 0];
    ctx.drawImage(cv, Math.round(x * 2) / 2 - cv.width / 4, Math.round(y * 2) / 2 - cv.height / 2 + bob, cv.width / 2, cv.height / 2);
  }
  // the heron: still, dipping now and then
  if (LIFE.heron) {
    const H0 = LIFE.heron, dip = ((time + 3) % 11) < 0.9 ? 1 : 0, cv = LIFE.sprites.heron[dip];
    let near = false; for (const e of foes) if (Math.hypot(e.x - H0.x, e.y - H0.y) < FLEE * 0.7) { near = true; break; }
    if (!near) ctx.drawImage(cv, Math.round(H0.x * 2) / 2 - cv.width / 4, H0.y - cv.height / 2 + 1, cv.width / 2, cv.height / 2);
  }
  ctx.imageSmoothingEnabled = sm;
}

export const lifeMB = () => {
  if (!LIFE) return 0;
  let b = 0; for (const R of LIFE.reeds) b += 3 * RW * RH * 4; for (const L of LIFE.pads) b += L.cv.width * L.cv.height * 4;
  return b / 1048576;
};
export const lifeInfo = () => LIFE && { ducks: LIFE.ducks.map((d) => [d.x | 0, d.y | 0]), heron: LIFE.heron, reeds: LIFE.reeds.length, pads: LIFE.pads.length };
