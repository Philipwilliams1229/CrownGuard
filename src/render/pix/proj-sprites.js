// ============ PIX PROJECTILES: what flies, in the new look ============
// Arrows, bolts, musket balls, thrown spikes, the bombardier's shell, catapult stones and the
// wizard's orbs (fx.js drawProjectile / drawQuarrel asks here). The standard of the figures and halls:
//   - ONE sun, upper left: a shot's lit side is chosen in WORLD space from its heading, so the
//     bright flank of a shaft never swaps sides when it turns round (the old shapes always lit
//     "up" in their own frame, so a shot flying left was lit from below);
//   - a ONE-pixel outline TINTED from the colour it borders (a dark of the body, not black);
//   - hard art pixels: a rotating shot is baked per heading (32 steps) by sampling its upright
//     shape per output pixel, a tumbling stone per turn, an orb per breath; nothing is rotated
//     live and nothing is blended. A bake is a few hundred pixels, once per kind and heading.
// Sizes, anchors and colour families are the old ones (so the engine's reach for each kind and
// the trail / spark meanings in fx.js are unchanged). Keep shots STRAIGHT: the aim contract
// (art/briefs/aim-contract.md) draws arrows along their line, which is what the heading is.

const PXS = 2;                                       // art pixels to a world unit (render/paint.js PX)
const DIRS = 32;
const INK = [36, 26, 38];
const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hexes = (...a) => a.map(hx);
const LIGHT = [-0.62, -0.78];                        // toward the sun, world

// ---- a little RGBA pixel buffer -------------------------------------------------------------
const buf = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4), f: new Uint8Array(w * h) });
const put = (b, x, y, c, o = 1, a = 255) => {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.d[i] = c[0]; b.d[i + 1] = c[1]; b.d[i + 2] = c[2]; b.d[i + 3] = a; b.f[y * b.w + x] = o ? 1 : 0;
};
const solid = (b, x, y) => b.d[(y * b.w + x) * 4 + 3] > 200 && b.f[y * b.w + x] === 1;
// the tinted one-pixel line round everything flagged "outlined"
const outline = (b) => {
  const { w, h, d } = b, add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 0) continue;
    let n = -1;
    if (x > 0 && solid(b, x - 1, y)) n = (y * w + x - 1) * 4;
    else if (y > 0 && solid(b, x, y - 1)) n = ((y - 1) * w + x) * 4;
    else if (x < w - 1 && solid(b, x + 1, y)) n = (y * w + x + 1) * 4;
    else if (y < h - 1 && solid(b, x, y + 1)) n = ((y + 1) * w + x) * 4;
    if (n < 0) continue;
    add.push(y * w + x, d[n] * 0.42 + INK[0] * 0.58, d[n + 1] * 0.42 + INK[1] * 0.58, d[n + 2] * 0.42 + INK[2] * 0.58);
  }
  for (let i = 0; i < add.length; i += 4) {
    const p = add[i] * 4; d[p] = add[i + 1]; d[p + 1] = add[i + 2]; d[p + 2] = add[i + 3]; d[p + 3] = 255;
  }
};
const toCv = (b) => {
  const cv = document.createElement("canvas"); cv.width = b.w; cv.height = b.h;
  const c = cv.getContext("2d"); const img = c.createImageData(b.w, b.h); img.data.set(b.d); c.putImageData(img, 0, 0);
  return cv;
};
const CACHE = new Map();
const memo = (k, make) => { let s = CACHE.get(k); if (!s) { s = make(); CACHE.set(k, s); } return s; };

// ---- rotating shots: a shape in its own frame (head at the origin, flying +x), sampled per heading ----
// shape(lx, ly, sy) -> { c: [r,g,b], o: 1 outlined | 0 plain } or null; sy = +1 when the +ly flank
// faces the sun at this heading, so a flank's tone is `ly * sy > 0 ? lit : shade`.
const bakeRot = (d, reach, shape, streak) => {
  const a = (d / DIRS) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  const half = Math.ceil(reach) + 3, B = buf(half * 2, half * 2);
  // LIGHT points toward the sun (up-left); local +y in world is (-s, c)
  const lit = LIGHT[0] * -s + LIGHT[1] * c > 0 ? 1 : -1;
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
    const dx = x + 0.5 - half, dy = y + 0.5 - half;
    const r = shape(dx * c + dy * s, -dx * s + dy * c, lit);
    if (r) put(B, x, y, r.c, r.o);
  }
  outline(B);
  if (streak) {
    // the motion streak sits behind, un-inked, fading
    const [from, len, k, a0] = streak;
    for (let i = 0; i < len; i++) {
      const lx = -from - i, X = Math.floor(half + lx * c), Y = Math.floor(half + lx * s);
      if (X < 0 || Y < 0 || X >= B.w || Y >= B.h) continue;
      const p = (Y * B.w + X) * 4;
      if (B.d[p + 3] === 0) { B.d[p] = k[0]; B.d[p + 1] = k[1]; B.d[p + 2] = k[2]; B.d[p + 3] = Math.round(a0 * (1 - i / len)); }
    }
  }
  return { cv: toCv(B), ax: half, ay: half };
};

// ---- arrows and bolts -----------------------------------------------------------------------
// head: a leaf of steel (ridge down the middle, lit flank bright, shade flank dark) on a socket;
// shaft: one pixel of wood, the sunward pixel a shade lighter; fletching: three vanes (the two we
// see, a lit one and a shaded one) with a nock notch behind. `len` is in world units, as before.
const ARROWS = {
  plain: { len: 9, head: hexes("#f6f8fb", "#bcc2cc", "#7c8494", "#4e5262"), wood: hexes("#d4a870", "#8c6642"), vane: hexes("#fbf4e2", "#c8483c", "#8c2e2e"), bind: hx("#c8483c"), hw: 1.9, streak: "#f4ecd8", sa: 110 },
  poison: { len: 9, head: hexes("#eaffd0", "#9ccc6a", "#5c8c40", "#34602c"), wood: hexes("#c8a670", "#88683e"), vane: hexes("#d6f2a4", "#4a8a34", "#2e5e28"), bind: hx("#4a8a34"), hw: 1.9, streak: "#c8f0a0", sa: 110 },
  pierce: { len: 9, head: hexes("#fff8dc", "#e2b440", "#a87a20", "#6a4a18"), wood: hexes("#d4a870", "#8c6642"), vane: hexes("#fff0b0", "#c89a30", "#8a6a20"), bind: hx("#c89a30"), hw: 1.9, streak: "#f8e08a", sa: 170 },
  big: { len: 13, head: hexes("#f6f8fb", "#aab0bc", "#6c7484", "#3e4252"), wood: hexes("#b88a58", "#6e4c30"), vane: hexes("#fbf4e2", "#a8483c", "#74302c"), bind: hx("#a8483c"), hw: 2.5, streak: "#f4ecd8", sa: 110, thick: true },
  quarrel: { len: 7, head: hexes("#f0f2f6", "#aab0bc", "#6c7484", "#3e4252"), wood: hexes("#8a6a4a", "#52402e"), vane: hexes("#cac4b8", "#8a847c", "#5a544e"), bind: hx("#6c7484"), hw: 1.8, streak: "#e8e2d4", sa: 110, quarrel: true },
  // a barrow archer's black arrow: bone head, grave-black shaft, teal fletching
  grave: { len: 9, head: hexes("#fbf6e8", "#d2c8aa", "#968a70", "#5a5242"), wood: hexes("#4a4450", "#2a2630"), vane: hexes("#b8f4dc", "#4aa888", "#2e6e5e"), bind: hx("#4aa888"), hw: 1.9, streak: "#9ce8cc", sa: 110 },
};
const arrowShape = (A) => {
  const L = A.len * PXS, [hi, mid, lo, dk] = A.head, [wl, wd] = A.wood, [vl, vm, vd] = A.vane, hl = A.hw;
  const hLen = A.quarrel ? 5.6 : A.thick ? 8 : 7;    // the head runs from the tip back this far
  const vlen = A.quarrel ? 5 : A.thick ? 8 : 6.5;
  return (lx, ly, lit) => {
    const ay = Math.abs(ly), u = ly * lit;
    if (lx > 0.7 || lx < -L - 1) return null;
    if (lx > -hLen) {
      // the leaf: swells to its widest a little behind the middle, then narrows to a socket
      const t = -lx / hLen;                                        // 0 tip .. 1 socket
      const w = (t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45 * 0.72) * hl * 0.9;
      if (ay > w + 0.25) return null;
      if (ay < 0.45) return { c: t < 0.6 ? hi : mid, o: 1 };       // the ridge catches the sun
      return { c: u > 0 ? (t < 0.6 ? hi : mid) : (t < 0.6 ? lo : dk), o: 1 };
    }
    if (lx > -hLen - 1.2) return ay <= 0.62 ? { c: A.bind, o: 1 } : null;   // the binding
    const back = lx + L + 1;                                       // 0 at the nock
    if (back < vlen) {
      // fletching: a vane each side widening to the tail; the lit one pale, the other deep, one stripe
      const reach = 0.75 + (vlen - back) * 0.24;
      if (ay > 0.6 && ay <= reach) return { c: back > 2.2 && back < 3.4 ? vd : u > 0 ? vl : vm, o: 1 };
      if (ay <= 0.6) return back < 0.6 ? null : { c: u >= 0 ? wl : wd, o: 0 };   // the nock notch
      return null;
    }
    if (ay <= (A.thick ? 0.8 : 0.62)) return { c: u >= 0 ? wl : wd, o: A.thick ? 1 : 0 };
    return null;
  };
};
export const arrowSprite = (v, d) => memo(`ar|${v}|${d}`, () => {
  const A = ARROWS[v] || ARROWS.plain;
  return bakeRot(d, A.len * PXS + 22, arrowShape(A), [A.len * PXS + 2, v === "big" ? 20 : 14, hx(A.streak), A.sa]);
});

// ---- the musket ball: a lead pea with a cream glint, a hard comet tail ---------------------------
const BALL = hexes("#e8e8f0", "#a8a8b8", "#6a6a7c", "#34343e");
export const ballSprite = (d) => memo(`mb|${d}`, () => bakeRot(d, 30, (lx, ly, lit) => {
  const dx = lx + 1.0, dd = Math.hypot(dx, ly);
  if (dd > 2.9) return null;
  // sphere shading in world light: lit side toward the sun, rim darkest on the far side
  const tw = ly * lit;
  const k = dd < 1.6 && tw > 0 ? 0 : tw > 0.4 ? 1 : dd > 2 && tw < 0 ? 3 : 2;
  return { c: BALL[k], o: 1 };
}, [4, 26, hx("#fff3d2"), 230]));

// ---- the thrown spike: a needle blade with a ridge, a collar, a leather grip --------------------
const SPIKES = {
  steel: { blade: hexes("#f6f8fb", "#aab0bc", "#6c7484"), grip: hexes("#9a6a44", "#5e402c"), collar: hx("#d8d2c0"), streak: "#f4ecd8" },
  ice: { blade: hexes("#f4feff", "#8ed2ee", "#3e78a8"), grip: hexes("#7ab4d0", "#3e6a98"), collar: hx("#d4f2fa"), streak: "#d4f2fa" },
  gold: { blade: hexes("#fff4b0", "#d8a43a", "#8a5e24"), grip: hexes("#9a6a44", "#5e402c"), collar: hx("#fff0a0"), streak: "#f4ecd8" },
};
export const spikeSprite = (k, d) => memo(`spk|${k}|${d}`, () => {
  const S = SPIKES[k] || SPIKES.steel, [bh, bm, bd] = S.blade, [gl, gd] = S.grip;
  return bakeRot(d, 26, (lx, ly, lit) => {
    const ay = Math.abs(ly), u = ly * lit;
    if (lx > 0.7 || lx < -15) return null;
    if (lx > -10) {
      if (ay > -lx * 0.17 + 0.35) return null;
      return { c: ay < 0.4 ? bh : u > 0 ? bm : bd, o: 1 };       // a ridge down the blade
    }
    if (lx > -12) return ay <= 2.1 ? { c: ay < 0.6 ? S.collar : u > 0 ? bm : bd, o: 1 } : null;   // the collar
    return ay <= 0.85 ? { c: u > 0 ? gl : gd, o: 1 } : null;                                       // the grip
  }, [16, 10, hx(S.streak), 110]);
});

// ---- a catapult stone: a faceted boulder that tumbles through four turns ------------------------
// `R` is the old radius (world units, x PXS); facets are sectors whose brightness is re-dealt each
// turn so the tumble reads, over a dome shaded from the sun.
const STONE = hexes("#e2dccf", "#b4aea4", "#807a82", "#4e4856", "#2e2a36");
const SIZES = { mini: 2.3, rock: 3.9, big: 5.6 };
export const rockSprite = (size, f) => memo(`rk|${size}|${f}`, () => {
  const r = SIZES[size] * PXS, n = Math.ceil(r * 1.3) + 3, B = buf(n * 2, n * 2), c = n;
  const rot = f * (Math.PI / 2) + 0.4, SEC = size === "mini" ? 4 : 6;
  const hsh = (i) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    // a polygonal outline: each sector has its own reach, so the stone has corners, not a wobbling circle
    const sec = ((th - rot) / (Math.PI * 2) * SEC), si = Math.floor(sec), fr = sec - si;
    const r0 = r * (0.74 + 0.3 * hsh((((si % SEC) + SEC) % SEC) * 3 + 1)), r1 = r * (0.74 + 0.3 * hsh((((si + 1) % SEC + SEC) % SEC) * 3 + 1));
    const R = r0 + (r1 - r0) * fr;
    if (d > R) continue;
    const l = -(dx * 0.58 + dy * 0.7) / R;                     // dome toward the sun
    // each face has a tilt that is re-dealt every turn, so the tumble reads
    const fv = (hsh((((si % SEC) + SEC) % SEC + f * 2) * 7.3) - 0.5) * 0.9;
    const v = l * 0.8 + fv * 0.5;
    put(B, x, y, STONE[v > 0.38 ? 0 : v > 0.05 ? 1 : v > -0.3 ? 2 : 3], 1);
  }
  // pits and a crack that turn with the stone
  if (size !== "mini") for (let k = 0; k < 3; k++) {
    const a = rot + k * 2.1 + 0.3, dd = r * 0.45;
    const x = c + Math.cos(a) * dd, y = c + Math.sin(a) * dd;
    if (Math.hypot(x - c, y - c) < r * 0.85) { put(B, x, y, STONE[3]); put(B, x + 1, y, STONE[2]); put(B, x, y - 1, STONE[0]); }
  }
  outline(B);
  return { cv: toCv(B), ax: c, ay: c };
});

// ---- the bombardier's shell: a black-iron sphere with a riveted band and a rope fuse -------------
const SHELL = hexes("#c4c8d6", "#7c8094", "#4c4e60", "#2c2c38");
export const shellSprite = (f) => memo(`sh|${f}`, () => {
  const r = 6.4, S = 28, c = S / 2, B = buf(S, S);
  const ph = f * (Math.PI / 2);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const dl = Math.hypot(dx + 2.2, dy + 2.2) / r;
    let k = dl < 0.42 ? 0 : dl < 0.95 ? 1 : 2;
    if (d > r - 1.4 && dx + dy > 1) k = 3;
    // a band round the middle that turns with the tumble, a rivet on it
    const band = Math.abs(dx * Math.cos(ph + 0.6) + dy * Math.sin(ph + 0.6)) < 0.9 && d > 1;
    put(B, x, y, band ? SHELL[Math.min(3, k + 1)] : SHELL[k], 1);
  }
  const rv = ph + 0.6 + Math.PI / 2;
  put(B, c + Math.cos(rv) * r * 0.55, c + Math.sin(rv) * r * 0.55, SHELL[0], 1);
  // the rope fuse, stepping out toward where fx.js draws its spark (10 art pixels off the centre)
  const a = ph - 2.2, FU = hexes("#e2c488", "#a88050", "#6a4a30");
  for (let i = 0; i < 4; i++) put(B, c + Math.cos(a) * (r - 0.5 + i), c + Math.sin(a) * (r - 0.5 + i), FU[i === 0 ? 2 : i % 2 ? 1 : 0], 1);
  outline(B);
  return { cv: toCv(B), ax: c, ay: c };
});

// ---- the wizard's orbs: a lit core in a ringed shell, a swirl turning inside, a dithered glow ----
const ORB = {
  arcane: hexes("#fff6dc", "#ecdcff", "#b896e8", "#7a58b8", "#4a3478"),
  fire: hexes("#fff6dc", "#f8e078", "#f0a040", "#d0602e", "#8a2e2a"),
  frost: hexes("#ffffff", "#dcf6fc", "#98d4ec", "#5a9ccc", "#34629a"),
  gold: hexes("#fff6dc", "#f8e898", "#e0b844", "#aa7e2a", "#6e4c1c"),
};
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
export const orbSprite = (el, f, big = 0) => memo(`orb|${el}|${f}|${big}`, () => {
  const S = big ? 56 : 40, T = ORB[el], B = buf(S, S), c = S / 2, r0 = big ? 10.5 : 7, halo = (big ? 10 : 6.5) + [0, 1, 2, 1][f];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d <= r0) {
      const dl = Math.hypot(dx + r0 * 0.3, dy + r0 * 0.34) / r0;
      let k = dl < 0.36 ? 0 : dl < 0.8 ? 1 : 2;
      if (d > r0 - 1.1) k = dx + dy > 0 ? 4 : 3;                  // the tinted rim, darker on the far side
      else if (d > r0 - 2.1 && dx + dy > 1) k = 3;
      put(B, x, y, T[k], 0);
    } else if (d < r0 + halo) {
      const t = (d - r0) / halo;
      // two glow rings: a close, denser one and a sparse outer one, both dithered
      if (bay(x, y) < (t < 0.4 ? 0.85 : 0.42) * (1 - t)) put(B, x, y, T[d < r0 + 2.4 ? 2 : 3], 0, 200);
    }
  }
  // a swirl turning inside the core: two arcs of bright pixels, a quarter turn a frame
  const sw = f * (Math.PI / 2);
  for (let i = 0; i < 7; i++) for (const s of [0, Math.PI]) {
    const t = i / 6, a = sw + s + t * 1.8, rr = r0 * (0.2 + t * 0.52);
    put(B, c + Math.cos(a) * rr - 0.5, c + Math.sin(a) * rr - 0.5, T[t < 0.4 ? 0 : 1], 0);
  }
  // two glints wheeling round the rim
  const a = sw + 0.4;
  for (const s of [0, Math.PI]) put(B, c + Math.cos(a + s) * (r0 + 3), c + Math.sin(a + s) * (r0 + 3), T[0], 0);
  return { cv: toCv(B), ax: c, ay: c };
});
