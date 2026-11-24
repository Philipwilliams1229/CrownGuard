// Round 19: the Brazier Wheel's ring of fire THROUGH THE AIR, starting further out (owner's notes on Round 18's B). Began as a copy of
// concept/fx-r18-ring.js. Owner: "I don't want it to go across the ground. I like the direction in B, but can we have it go through
// the air? And make it start a little bit further out, so we're not burning our operator."
// So: a hoop of flame flying outward at a height, in Round 18 B's look (a low fast front, tongues leaning back against the roll, a
// see-through sheet of flame trailing behind the front). Nothing is laid on the ground (no coals, no scorch, no burning band): only a
// faint warm light on the turf under the hoop so its height reads. It is first seen R0 out (clear of the hall's footing and the
// operator standing in front of it, ~38 art px out) and still reaches the full reach at today's moment (rings.js's ease), so the
// damage reads honest. Every flame pixel carries the GROUND depth of the point it flies over, so the far half passes behind the
// hall and the goblins standing inside it, the near half in front (the depth sort of Round 18).
// Painters get (c, e): c is the cell translated to (ax, ay), 1 unit = 1 art px. Game modules load only in a browser.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/halls/spiker.js")), ...(await import("/src/render/paint.js")) } : {};
import { ROWS as R18 } from "./fx-r18-ring.js";

const TAU = Math.PI * 2, N = 14, LIFE = 450, SQ = 0.55;
const PXu = () => G.PX || 2;
const R = 65 * 2;                                                       // the Brazier Wheel's reach in art px (65 world units)
const R0 = 66;                                                          // first seen here (33 world units, half the reach): well past the hall and its operator
const CELL = { cw: 320, ch: 236, ax: 160, ay: 156, N };
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // Dragonbreath's tones
const INK = "#8a2028";
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - (1 - cl(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(cl(a) * n) / n;
const per = (a, n) => ((a % n) + n) % n;
const sm = (u) => u * u * (3 - 2 * u);
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const ring1 = (n, pos, seed) => { const k = Math.floor(pos), f = pos - k, a = H(per(k, n), seed), b = H(per(k + 1, n), seed); return a + (b - a) * sm(f); };

// the clock: today's ease, from R0 to the rim (so the front reaches the rim when today's does); the fade is draw.js's ttl / 300 stepped
const frontOf = (p) => R0 + (R - R0) * easeOut(p * 1.15);
const fadeOf = (p) => stepA(Math.min(1, (LIFE * (1 - p)) / 300));

// ---- the cell: the real hall and the goblins (as Round 18) -------------------------------------------------------------------
const GOB = [[-74, 26], [60, 44], [24, -42], [-30, -58], [-146, 6], [122, -46]];   // feet, art px; the last two stand out of reach
const hallT = (e) => ({ id: 3, kind: "spiker", x: 0, y: 0, level: 3, branch: "b", rank4: null, cd: 0, aim: "first", lastAim: Math.PI, anim: Math.max(0, 1 - e.p * 2), shotIdx: 0, critIdx: 0, invested: 0, units: [], rally: null, kills: 0, dmgOut: 0, liveTime: 1 });
const drawHall = (c, e) => { c.save(); c.scale(PXu(), PXu()); G.drawBladewheel(c, hallT(e), 3 + e.p * 0.45); c.restore(); };
const tintC = {};
const tinted = (s, col, key) => {
  const k = key + col; if (tintC[k]) return tintC[k];
  const t = document.createElement("canvas"); t.width = s.cv.width; t.height = s.cv.height; const x = t.getContext("2d");
  x.drawImage(s.cv, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height); return (tintC[k] = t);
};
const gobItems = (c, e, front) => GOB.map(([x, y], k) => {
  const dg = Math.hypot(x, y / SQ), f = (e.i + k * 3) & 7, d = front - dg;
  const flash = Math.abs(d) < 6 && e.p < 0.9, near = dg < R + 4 ? cl(1 - Math.abs(d) / 16) * fadeOf(e.p) : 0;
  return { y, draw: () => {
    const s = e.foe(f, "");
    c.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay));
    if (near > 0) { c.globalAlpha = Math.ceil(near * 3) / 3 * 0.36; c.drawImage(tinted(s, "#ff9a30", "g" + f), Math.round(x - s.ax), Math.round(y - s.ay)); c.globalAlpha = 1; }
    if (flash) { const w = e.foe(f, "white"); c.globalAlpha = 0.7; c.drawImage(w.cv, Math.round(x - w.ax), Math.round(y - w.ay)); c.globalAlpha = 1; }
  } };
});

// flame pixels: one per (place, surface, half), the nearest sample winning; then drawn with the hall and goblins, back to front
const put = (out, x, y, col, dep, a, s) => {
  if (a <= 0) return;
  const k = ((x + 1024) * 2048 + (y + 1024)) * 32 + s, o = out.get(k);
  if (!o || dep > o.dep) out.set(k, { x, y, col, dep, a });
};
const compose = (c, out, items) => {
  const px = [...out.values()].sort((a, b) => a.dep - b.dep), its = items.slice().sort((a, b) => a.y - b.y);
  let j = 0;
  for (const p of px) {
    while (j < its.length && its[j].y < p.dep) { c.globalAlpha = 1; its[j++].draw(); }
    c.globalAlpha = Math.round(p.a * 20) / 20; c.fillStyle = p.col; c.fillRect(p.x, p.y, 1, 1);
  }
  c.globalAlpha = 1;
  while (j < its.length) its[j++].draw();
};

// ---- the hoop's leading edge: a ribbon of flame flying at height hh ------------------------------------------------------------
// Sampled round the ring (theta) and up / down from the hoop's line (h). Above the line: tongues (two periodic noises round the ring,
// sliding frame by frame) leaning back INWARD against the outward flight; below it a short ragged fringe (flame in the air has no
// foot). Body: Dragonbreath's mottled cells drifting up, a broken pale core along the hoop's line, a 1-px tinted dark-red line on
// both edges, the tongues' tips see-through (o.see, stepped and dithered). o.gut (0..1) gutters it: tongues sink, the body breaks up.
const hoopPx = (out, e, r, o) => {
  const i = e.i, gut = o.gut || 0, n1 = Math.max(6, Math.round(TAU * r / 10)), n2 = Math.max(10, Math.round(TAU * r / 4.5)), nm = Math.max(12, Math.round(TAU * r / 3));
  const hAt = (th) => {
    const a1 = ring1(n1, th / TAU * n1 + i * 0.15, 11), a2 = ring1(n2, th / TAU * n2 + i * o.slide, 23 + (i >> 1) * 0.37);
    return o.H0 * o.hk * (1 - 0.75 * gut) * (0.45 + 0.3 * a1 + 0.62 * a2 * a2 * a2 * a2);
  };
  const dAt = (th) => o.dn * (0.4 + 0.6 * ring1(n2, th / TAU * n2 - i * 0.4, 51)) * (1 - 0.5 * gut);
  const dth = 0.45 / r, dl = 1.3 / r;
  for (let th = 0; th < TAU; th += dth) {
    const cs = Math.cos(th), sn = Math.sin(th), hg = hAt(th), hl = Math.min(hAt(th - dl), hAt(th + dl)), dn = dAt(th), half = sn >= 0 ? 1 : 0;
    const cu = per(Math.floor(th / TAU * nm), nm), cu2 = per(Math.floor(th / TAU * nm / 2 + 0.5), Math.max(1, nm >> 1));
    for (let h = -Math.ceil(dn); h <= Math.ceil(hg); h++) {
      const up = h >= 0, t = up ? Math.min(1, h / Math.max(1, hg)) : Math.min(1, -h / Math.max(1, dn)), L = up ? Math.min(o.lean * h * t, r * 0.25) : -h * 0.3;
      const rr = r - L, x = Math.round(rr * cs - 0.5), y = Math.round(rr * SQ * sn - o.hh - h - 0.5), dep = rr * SQ * sn;
      if (gut > 0 && bay(x + 512, y + 512) < gut * 0.8 * (0.4 + 0.6 * t)) continue;
      const m1 = H(cu, Math.floor((h + 8 + i * o.rise) / 4) + 40), m2 = H(cu2 + 7, Math.floor((h + 8 + i * o.rise * 0.7) / 7) + 90), m = m1 * 0.6 + m2 * 0.4;
      const heat = (1 - t) * (up ? 0.6 : 0.5) + (m - 0.5) * 0.62 + 0.2 - 0.15 * gut;
      let col = heat > 0.9 ? FIRE[0] : heat > 0.72 ? FIRE[1] : heat > 0.5 ? FIRE[2] : heat > 0.3 ? FIRE[3] : FIRE[4];
      if (h >= 0 && h <= 1 && m > 0.45 && gut < 0.5) col = m > 0.66 ? FIRE[0] : FIRE[1];                 // the broken pale core along the line
      const rim = (up && (h >= hg - 1 || h > hl + 0.5)) || (!up && h <= -dn + 1);
      if (rim) col = (up && h >= hg - 0.5) || (!up && h <= -dn + 0.5) || bay(x, y) < 0.6 ? INK : FIRE[4];
      else if (up && h >= hg - 2 && bay(x, y) < 0.5) col = FIRE[4];
      const eq = up ? Math.min(1, Math.floor(cl((t - 0.4) / 0.4) * 3 + bay(x, y)) / 3) : 0;
      let al = o.body * (1 - (1 - o.see) * eq);
      if (rim) al = Math.max(al, 0.9 * o.body);
      put(out, x, y, col, dep, al * o.fa, half);
    }
  }
};
// ---- the sheet of flame trailing behind the front, at the hoop's height, see-through (the ground shows through it) ----------
const trail = (out, e, r, o) => {
  const i = e.i, W = o.W, gut = o.gut || 0, m = Math.ceil(r + 1), myy = Math.ceil((r + 1) * SQ), nm = Math.max(12, Math.round(TAU * r / 4));
  for (let y = -myy; y <= myy; y++) for (let x = -m; x <= m; x++) {
    const dg = Math.hypot(x + 0.5, (y + 0.5) / SQ), d = r - dg;
    if (d < 0 || d > W) continue;
    const k = 1 - d / W, an = Math.atan2((y + 0.5) / SQ, x + 0.5);
    const cu = per(Math.floor((an + Math.PI) / TAU * nm), nm), mm = H(cu, Math.floor((d + i * 2.2) / 3) + 60) * 0.6 + H(cu + 3, Math.floor((d + i * 1.4) / 5) + 70) * 0.4;
    const sy = y - o.hh + Math.round(d * 0.25);                          // the trailing flame sags a little behind the front
    if (bay(x + 512, sy + 512) > k * 1.6 + (mm - 0.5) * 0.5 - gut * 0.7) continue;   // breaks up toward the inside
    const heat = k * 0.5 + (mm - 0.5) * 0.75 + 0.15;
    const col = heat > 0.75 ? FIRE[1] : heat > 0.5 ? FIRE[2] : heat > 0.28 ? FIRE[3] : heat > 0.1 ? FIRE[4] : INK;
    const al = (k > 0.66 ? o.a[0] : k > 0.33 ? o.a[1] : o.a[2]) * o.fa;
    put(out, x, sy, col, y + 0.5, al, 20 + (an >= 0 ? 1 : 0));
  }
};
// ---- a faint warm light on the turf under the hoop, so its height reads (the only thing on the ground) -----------------------
const underLight = (c, r, fa, k) => {
  const m = Math.ceil(r + 4), myy = Math.ceil((r + 4) * SQ);
  for (let y = -myy; y <= myy; y++) for (let x = -m; x <= m; x++) {
    const d = r - Math.hypot(x + 0.5, (y + 0.5) / SQ);
    if (d < -3 || d > 12) continue;
    const st = d > -1 && d < 7 ? 0.5 : 0.25;
    if (bay(x + 512, y + 512) < st * fa * k) P(c, x, y, FIRE[2], 0.32);
  }
};
// ---- embers dropping out of a guttering hoop ------------------------------------------------------------------------------------
const drips = (c, e, hhOf, n0) => {
  const p = e.p;
  for (let k = 0; k < n0; k++) {
    const born = 0.45 + H(k, 81) * 0.4; if (p < born) continue;
    const th = H(k, 82) * TAU, d0 = frontOf(born) - 3, age = (p - born) * LIFE, life = 120 + 140 * H(k, 83);
    if (age > life) continue;
    const u = age / life, cs = Math.cos(th), sn = Math.sin(th);
    const x = d0 * cs + Math.sin(age * 0.03 + k) * 1.2, y = d0 * SQ * sn - hhOf(born) + age * age * 0.00025 + age * 0.02;
    P(c, x, y, u < 0.35 ? FIRE[1] : u < 0.7 ? FIRE[2] : FIRE[3]);
  }
};

// ---- the three options ------------------------------------------------------------------------------------------------------
const run = (c, e, o) => {
  const r = frontOf(e.p), fa = fadeOf(e.p), out = new Map(), hh = typeof o.hh === "function" ? o.hh(e.p) : o.hh, gut = o.gut ? o.gut(e.p) : 0;
  if (fa > 0) {
    underLight(c, r, fa, o.light);
    trail(out, e, r - 1, { W: o.W, hh, a: o.ta, fa, gut });
    hoopPx(out, e, r, { H0: o.H0, dn: o.dn, hk: 0.6 + 0.4 * fa, hh, lean: o.lean, rise: 3, slide: 1.4, see: o.see, body: o.body, fa, gut });
  }
  compose(c, out, [{ y: 0, draw: () => drawHall(c, e) }, ...gobItems(c, e, r)]);
  if (o.drips) drips(c, e, typeof o.hh === "function" ? o.hh : () => o.hh, o.drips);
};
// A: the hoop at a goblin's chest (20 art px up), B's tongues leaning back, a see-through sheet of flame trailing it
const optA = (c, e) => run(c, e, { hh: 20, H0: 13, dn: 4, lean: 0.7, W: 15, ta: [0.75, 0.6, 0.45], see: 0.8, body: 1, light: 1 });
// B: thinner and higher, at a goblin's head (32 up), more see-through, a shorter sheet behind it
const optB = (c, e) => run(c, e, { hh: 32, H0: 8, dn: 2, lean: 0.55, W: 10, ta: [0.55, 0.4, 0.3], see: 0.6, body: 0.85, light: 0.7 });
// C: launched at the wheel's rim height (46 up), rising a little as it flies out (to 58), then guttering: tongues sink, it breaks up, embers drop
const optC = (c, e) => run(c, e, { hh: (p) => 46 + 12 * easeOut(p * 1.1), gut: (p) => cl((p - 0.45) / 0.5), H0: 12, dn: 3, lean: 0.6, W: 12, ta: [0.7, 0.55, 0.4], see: 0.75, body: 1, light: 0.55, drips: 28 });

export const ROWS = [
  { id: "firering19", label: "Brazier Wheel ring of fire, through the air", group: "Round 19",
    note: "Round 18's B as you saw it (first strip) taken off the ground: a hoop of fire flying outward through the air, nothing burnt onto the ground, only a faint warm light under it so you can tell how high it flies. It now appears about half-way out from the hall's middle, past the operator, and still reaches the edge of the range at the same moment as today. A: the hoop at a goblin's chest, its tongues leaning back toward the hall, a see-through sheet of flame trailing behind the front. B: thinner and higher, at a goblin's head, more see-through. C: thrown from the wheel's rim height, it rises a little as it flies out, then gutters, its tongues sinking and embers dropping from it.",
    ...CELL, today: R18[0].B, A: optA, B: optB, C: optC },
];
