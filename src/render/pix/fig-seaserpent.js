// ============ FIGURE: the Sea Serpent (game type `seaserpent`) ============
// A long sea-green serpent with a pale belly, a ridge of ice-blue frill down its back, a fan of
// frill behind a horned, fanged head with yellow eyes. THE ANCHOR IS THE WATERLINE: (0, 0) is
// the surface, y > 0 is under it. Whatever is below the line is repainted in dim water colours
// (`underwater`, below: a pass over the buffers before the resolve), whatever is above is full
// colour, and a foam collar marks every place the body cuts the surface. Facing +x.
// Neutral sea monster (engine/serpent.js, drawn by rigs-rimebeasts.js drawSeaRig, which asks for
// a sheet and a frame, the frame sometimes a STRING such as "sub.2"). Clips by those names:
//   walk    4-frame swim, humps rolling back, neck up (the old walk sheet)
//   attack  the blow (guard, hiss drawn back, STRIKE at 0.55, follow-through in the spray)
//   sub     4 frames: swimming submerged, only fin tips and a vee of wake above the water
//   surface 4 frames: the bulge, breaking the surface, the neck rising, reared and dripping
//   dive    4 frames: the head dips in, goes under, the fluke flung up, gone
//   hold    4 frames: the humps stay up, the neck is under (drawSeaHold paints the rest)
import { mat, flat, hex2rgb, MATS } from "./pix.js";
import { HUMAN, sampleKeys, ik } from "./rig.js";

const SCALE = mat("#3c8478", { contrast: 1.3 }), BELLY = mat("#d4ece0", { contrast: 1.1 }), BACK = mat("#245850", { contrast: 1.2 }), FRILL = mat("#86cce0", { contrast: 1.25 });
const FANG = flat("#f4f8f0"), EYEY = flat("#e8f070", { emis: true, line: "#7a6a10" }), MAW = flat("#4a1a28"), PUPIL = flat("#1a1a22");
const FOAM = flat("#f2fbff", { emis: true, line: "#7fb4cc" }), FOAM2 = flat("#cfe8f2", { emis: true, line: "#7fb4cc" });

export const BOX = { w: 172, h: 122, ox: 84, oy: 86 };
export const BONES = HUMAN;                 // unused

// ---- shared with the kraken: the water line --------------------------------------------
const mixHex = (a, b, t) => "#" + hex2rgb(a).map((v, i) => Math.round(v + (hex2rgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const SUB = new Map();
const subOf = (m) => {
  let s = SUB.get(m);
  if (s === undefined) { s = mat(mixHex(MATS[m].base, "#1e4c5e", 0.64), { contrast: 0.55 }); SUB.set(m, s); }
  return s;
};
// everything below the surface (rows under the anchor) goes dim and blue; `sink` also hides it
// (an arm in its hole). Then foam wherever the figure meets the surface.
export const underwater = (px, o = {}) => {
  const { w, h, oy } = px;
  for (let j = oy + 1; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, m = px.m[k];
    if (m < 0) continue;
    if (o.hide) { px.m[k] = -1; continue; }
    px.m[k] = subOf(m); px.fix[k] = -1; px.bias[k] = 0;
  }
  if (o.hide) return;
  const cols = [];
  for (let i = 0; i < w; i++) { let hit = false; for (let j = oy - 2; j <= oy + 1; j++) if (px.m[j * w + i] >= 0) hit = true; cols.push(hit); }
  let i = 0;
  while (i < w) {
    if (!cols[i]) { i++; continue; }
    let e = i; while (e < w && cols[e]) e++;
    const a = i - px.ox, bb = e - px.ox;
    // a collar of foam along the cut: a long bright row, a ragged second row under it
    for (let x = a - 2; x <= bb + 2; x++) px.dot(x + 0.5, 0.5, (x + 7) % 3 ? FOAM : FOAM2, 40, { noLine: true });
    for (let x = a - 3; x <= bb + 3; x += 2) px.dot(x + 0.5, 1.5, FOAM2, 40, { noLine: true });
    px.dot(a - 2.5, -0.5, FOAM, 40, { noLine: true }); px.dot(bb + 2.5, -0.5, FOAM, 40, { noLine: true });
    i = e;
  }
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const cap = (px, a, b, ra, rb, m, z, o) => px.capsule(a[0], a[1], ra, b[0], b[1], rb, m, z, o);
// a smooth curve through the points (Catmull-Rom), n steps a segment
const spline = (pts, n = 4) => {
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 1; s <= n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  return out;
};

// a pose, in the old painter's units (x2 here): A hump height, ph the wave's phase, nk the neck's
// three control points flat [x, y, x, y, x, y] from the waterline up, tilt / jaw the head, dep
// the whole beast sunk, fins (swimming submerged), fluke (the tail flung up), fx
const P0 = { A: 5, ph: 0, nk: [10, -6, 11.6, -12, 14.2, -16.6], tilt: 0.14, jaw: 0.05, dep: 0, fins: 0, fluke: 0, ring: 0, spray: 0, splash: 0, drip: 0, bulge: 0, blink: 0 };
const SERP_WALK = (f) => ({ ...P0, A: 5, ph: f * Math.PI / 2, nk: [10, -6 + [0, 0.8, 0, -0.8][f], 11.6, -12, 14.2, -16.6] });
const GUARD = { ...P0, A: 4, ph: 0.4, nk: [9, -10, 8, -20, 12, -28], tilt: 0.22, jaw: 0.1 };
const HISS = { ...P0, A: 4, ph: 0.9, nk: [8, -12, 5, -24, 8, -31], tilt: -0.34, jaw: 0.55 };
const STRIKE = { ...P0, A: 3.4, ph: 1.4, nk: [12, -10, 20, -14, 26, -10], tilt: 0.55, jaw: 0.7, spray: 1 };
const FOLLOW = { ...P0, A: 3.4, ph: 1.9, nk: [11, -7, 17, -9, 22, -5], tilt: 0.32, jaw: 0.14, splash: 1 };
const EXTRA = {
  hold: (f) => ({ ...P0, A: 4.6, ph: f * Math.PI / 2, nk: [9, 1.5, 10.4, 4, 12, 5.6], tilt: 0, jaw: 0, ring: 1 }),
  sub: (f) => ({ ...P0, A: 4, ph: f * Math.PI / 2, nk: [10, 3, 13, 4, 16, 4.6], tilt: 0, jaw: 0, dep: 6, fins: 1 }),
  surface: (f) => [
    { ...P0, A: 3, ph: 0, nk: [10, 3, 13, 2, 15, 2.4], tilt: -0.2, jaw: 0, dep: 5, bulge: 1 },
    { ...P0, A: 3, ph: 0.4, nk: [10, -3, 12, -6, 13, -8], tilt: -0.7, jaw: 0, dep: 2, spray: 1 },
    { ...P0, A: 3.4, ph: 0.8, nk: [10, -6, 11.4, -11, 13.4, -15], tilt: -0.1, jaw: 0.1, drip: 1 },
    { ...GUARD, drip: 1 },
  ][f],
  dive: (f) => [
    { ...P0, A: 4, ph: 0.6, nk: [11, -10, 17, -10, 20, -4], tilt: 1.2, jaw: 0 },
    { ...P0, A: 4, ph: 1.2, nk: [12, -7, 17, -4, 19, 2], tilt: 1.45, jaw: 0, splash: 1 },
    { ...P0, A: 3, ph: 1.8, nk: [10, 3, 13, 4, 16, 4.6], tilt: 0, jaw: 0, dep: 4, fluke: 1, ring: 1 },
    { ...P0, A: 3, ph: 2.4, nk: [10, 3, 13, 4, 16, 4.6], tilt: 0, jaw: 0, dep: 9, ring: 1 },
  ][f],
};

// the head, in its own frame (+x forward, origin where the neck ends), rotated by `tilt`
const head = (px, at, tilt, jaw, z0, p) => {
  const c = Math.cos(tilt), s = Math.sin(tilt), T = (x, y) => [at[0] + x * c - y * s, at[1] + x * s + y * c];
  const jr = (x, y) => { const a = jaw * 0.9, hx = 3, hy = 3.4, dx = x - hx, dy = y - hy; return [hx + dx * Math.cos(a) - dy * Math.sin(a), hy + dx * Math.sin(a) + dy * Math.cos(a)]; };
  // the frill fanned behind the skull, ribbed
  px.part();
  for (const [a, l, w] of [[-2.35, 9, 2.2], [-1.85, 10.5, 2.6], [-3.0, 8, 2], [-1.4, 9, 2.2]]) {
    const b0 = T(1, -1), b1 = T(1 + Math.cos(a) * l, -1 + Math.sin(a) * l * 0.9);
    cap(px, b0, b1, w, 0.5, FRILL, z0 - 0.1);
  }
  // the lower jaw (drawn first when open: the maw shows between)
  px.part();
  if (jaw > 0.18) px.poly([T(3, 0), T(14.5, 1), T(...jr(14, 3.6)), T(...jr(3, 3.4))], MAW, z0 + 0.1, { floor: 1 });
  cap(px, T(...jr(3, 3.6)), T(...jr(13, 3.4)), 2.2, 1.6, BELLY, z0 + 0.15, { bias: -0.5 });
  if (jaw > 0.18) for (const x of [6, 9, 12]) { const t = T(...jr(x, 2.2)); px.line(t[0], t[1], t[0] + s * 0, t[1] - 1.8 * c, FANG, z0 + 0.3, { fix: 4, noLine: true }); }
  // the skull and the long snout
  px.part();
  px.ellipse(...T(3.6, 0), 6.6, 5.2, SCALE, z0 + 0.2, { rot: tilt });
  cap(px, T(6, 0.6), T(15, 1.4), 3.8, 2.6, SCALE, z0 + 0.25);
  cap(px, T(5, 2), T(13, 2.6), 1.8, 1.4, BELLY, z0 + 0.3, { bias: -0.5 });
  if (jaw > 0.18) for (const x of [7, 10.5, 13.5]) { const t = T(x, 2.4); px.line(t[0], t[1], t[0], t[1] + 1.8, FANG, z0 + 0.3, { fix: 4, noLine: true }); }
  // horns of ice swept back off the brow, a dark ridge
  px.part();
  cap(px, T(2, -4), T(-2.4, -8.4), 1.7, 0.4, FRILL, z0 + 0.2, { bias: 1 });
  cap(px, T(4.6, -4.4), T(1.4, -9), 1.5, 0.4, FRILL, z0 + 0.2, { bias: 1 });
  px.line(...T(2.4, -3.6), ...T(8, -3.2), BACK, z0 + 0.35, { floor: 1 });
  // the eye, a hot yellow slit, the nostril
  px.part();
  const e = T(6.4, -1.8);
  px.rect(e[0] - 1.2, e[1] - 0.8, 2.6, 1.8, p.blink ? BACK : EYEY, z0 + 0.5, { fix: 3 });
  px.dot(e[0] + 0.4, e[1], PUPIL, z0 + 0.55);
  px.dot(...T(14.6, -0.4), PUPIL, z0 + 0.5);
};

// a ring of ripples on the surface and a few drops
const rings = (px, x, r) => {
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; px.dot(x + Math.cos(a) * r * 1.5, 0.5 + Math.sin(a) * 0.5, FOAM, 41, { noLine: true }); }
  for (let dx = -r; dx <= r; dx += 2) px.dot(x + dx, 1 + (Math.abs(dx) > r * 0.6 ? 0 : 1), FOAM2, 41, { noLine: true });
};
const drops = (px, x, y, n, spread, seed = 0) => {
  for (let i = 0; i < n; i++) { const a = -0.3 - ((i + seed) % n) / n * 2.5, r = 4 + ((i * 5 + seed) % 7) * spread / 7; px.dot(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.1, i % 2 ? FOAM : FOAM2, 42, { noLine: true }); }
};

export const draw = (px, F) => {
  const k = F.sk.p, S = 2;
  const dep = k.dep * S, A = k.A * S, X0 = 14, X1 = -62, lam = 30;
  // the centreline: humps rolling back along a wave behind the neck, then the neck
  const pts = [];
  for (let x = X1; x <= X0 + 0.01; x += 3) {
    const env = Math.min(1, (X0 - x) / 8);
    pts.push([x, 3 - A * env * Math.sin((2 * Math.PI * (X0 - x)) / lam - k.ph) + dep]);
  }
  const base = pts[pts.length - 1], nb = pts.length;
  const nk = [[k.nk[0] * S, k.nk[1] * S + dep], [k.nk[2] * S, k.nk[3] * S + dep], [k.nk[4] * S, k.nk[5] * S + dep]];
  const all = pts.concat(spline([base, ...nk], 4).slice(1));
  const rs = all.map((_, i) => (i < nb ? 3.8 + 4.2 * Math.pow(i / (nb - 1), 0.7) : 8 - 2.2 * ((i - nb) / (all.length - nb))));
  const nrm = (i) => { const a = all[Math.max(0, i - 1)], b = all[Math.min(all.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };   // always the left of the way to the head: the back stays on one side, round the upright neck too
  // the frill down the back
  px.part();
  for (let i = 4; i < all.length - 3; i += 3) { const n = nrm(i), r = rs[i], a = [all[i][0] + n[0] * r * 0.8, all[i][1] + n[1] * r * 0.8], bb = [a[0] + n[0] * 4.4 - 1.4, a[1] + n[1] * 4.4]; cap(px, a, bb, 1.4, 0.3, FRILL, 1, { bias: 1 }); }
  // the fluke on the tail's end (flung up on the dive)
  px.part();
  const t0 = all[0];
  if (k.fluke) { const u = [t0[0] - 3, t0[1] - 10 * k.fluke - 6]; cap(px, t0, u, 3, 1.6, SCALE, 1.2); cap(px, u, [u[0] - 5, u[1] - 7], 5, 0.8, FRILL, 1.3, { bias: 1 }); cap(px, u, [u[0] + 4, u[1] - 7], 4, 0.8, FRILL, 1.3, { bias: 1 }); }
  else { cap(px, t0, [t0[0] - 8, t0[1] - 3], 3, 0.6, FRILL, 1.2, { bias: 1 }); cap(px, t0, [t0[0] - 8, t0[1] + 3.4], 3, 0.6, FRILL, 1.2, { bias: 1 }); }
  // the body: ONE welded tube (pix.js body / limb) of the creature's one body, so the light runs on along the humps and the neck;
  // the pale belly and the dark back are wrapped over it (the same normal, their own colour)
  px.body(1);
  px.limb(all, rs, SCALE, 2, { cast: 1 });
  const side = (f) => all.map((q, i) => { const n = nrm(i); return [q[0] + n[0] * rs[i] * f, q[1] + n[1] * rs[i] * f]; });
  // (one short piece a link, as the side's normal flips where the neck stands upright: a long chain would zigzag)
  const sb = side(-0.55), sk = side(0.62);
  for (let i = 0; i + 1 < all.length; i++) {
    px.capsule(sb[i][0], sb[i][1], rs[i] * 0.42, sb[i + 1][0], sb[i + 1][1], rs[i + 1] * 0.42, BELLY, 2.2, { bias: -0.5, wrap: true });
    px.capsule(sk[i][0], sk[i][1], rs[i] * 0.3, sk[i + 1][0], sk[i + 1][1], rs[i + 1] * 0.3, BACK, 2.1, { bias: -0.5, floor: 1, wrap: true });
  }
  px.body(0);
  // scale flecks
  for (let i = 3; i < all.length - 2; i += 2) { const n = nrm(i), q = [all[i][0] - n[0] * rs[i] * 0.1, all[i][1] - n[1] * rs[i] * 0.1]; px.dot(q[0], q[1], SCALE, 2.5, { bias: 1.5, noLine: true }); }

  const hd = all[all.length - 1];
  if (!k.fins && (dep < 6 || k.dep < 5)) head(px, hd, k.tilt, k.jaw, 3, k);
  else if (!k.fins) head(px, hd, k.tilt, k.jaw, 3, k);

  // fin tips slicing the surface over three humps, a vee of wake behind each
  if (k.fins) {
    px.part();
    for (const x of [-40, -10, 18]) {
      px.poly([[x - 3.2, 0.6], [x - 5.2, -5.6], [x + 2.4, 0.6]], FRILL, 5, { bias: 0.5 });
      for (let i = 1; i < 4; i++) { px.dot(x - 5 - i * 4.6, 0.2 - i * 1, FOAM2, 41, { noLine: true }); px.dot(x - 5 - i * 4.6, 1.4 + i * 1, FOAM2, 41, { noLine: true }); px.dot(x - 6 - i * 4.6, 0.2 - i * 1, FOAM2, 41, { noLine: true }); }
    }
  }
  // the water's work
  underwater(px);
  const hx = hd[0];
  if (k.bulge) { for (let x = 6; x <= 30; x++) px.dot(x, -0.5 - (x > 12 && x < 24 ? 1 : 0), FOAM2, 41, { noLine: true }); drops(px, 18, -2, 6, 6); }
  if (k.spray) { drops(px, hx, -3, 8, 14, 1); drops(px, 20, -2, 6, 10, 3); }
  if (k.splash) { drops(px, hx, -2, 9, 16, 2); for (let x = hx - 8; x <= hx + 8; x++) px.dot(x, -0.5, FOAM, 41, { noLine: true }); }
  if (k.drip) for (const [dx, dy] of [[-4, 8], [8, 12], [22, -14], [26, -6]]) px.dot(hx + dx - 8, hd[1] + dy, FOAM, 42, { noLine: true });
  if (k.ring) rings(px, k.ring && k.dep ? 30 : hx, 7);
  return {};
};

const TAU = Math.PI * 2;
const strip = (name, ms) => ({ n: 4, ms, loop: false, lag: 0.1, pose: (ph) => EXTRA[name](Math.round(ph * 3)) });
export const CLIPS = {
  walk: { n: 4, ms: 1000, loop: true, lag: 0.1, pose: (ph) => SERP_WALK(Math.floor(ph * 4) % 4) },
  attack: {
    n: 10, ms: 900, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.4, e: "io", p: HISS },
      { t: 0.55, e: "in3", p: STRIKE },
      { t: 0.78, e: "out", p: FOLLOW },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
  sub: strip("sub", 800), surface: strip("surface", 500), dive: strip("dive", 450), hold: strip("hold", 800),
};
