// ============ RENDER: MORE SCENERY OF THE VALE ============
// The Greenwood's own pieces beyond the trees and boulders of scenery.js:
// standing stones for the Kingstones, the mill on the race at Millrace, the
// fishing hamlet on Gullwick Sands, thistles for Thistlecrag and a few farm
// pieces. One registry object, the same shape as IRON_ART (read its header
// in scenery-iron.js); scenery.js gathers it lazily, never at load.
//
// Pieces (decor types):
//   menhir      a standing stone: v0 a tall slab, v1 leaning, v2 a squat
//               shouldered stone, v3 a needle leaning the other way
//   stonefall   a stone fallen flat in the turf, half grown over
//   trilithon   two uprights and a lintel (v1: the lintel slipped)
//   watermill   the mill house with its wheel turning in the race (live):
//               v0 wheel on the west side, v1 on the east; the wheel stands
//               ~27 left (right) of the feet and ~11 below, in the water
//   cottage     a fisher's cottage, limewash and thatch, smoke (live);
//               v odd: door on the right and a lean-to
//   boat        drawn up on the strand: v0 a coble with its mast down,
//               v1 a rowboat upturned on stones, v2 a punt with oars, v3 = v0
//               the other way round. The hull runs ~10 below the feet, so
//               its feet stand on the grass with the boat down on the sand.
//   netrack     nets drying on a rack of posts, floats along the head line
//   creels      lobster pots stacked, a coil of rope and a buoy
//   marram      dune grass on its own little hummock of sand (flat)
//   thistle     a thistle clump, purple heads on spiny stems (flat)
//   skeps       straw beehives on a plank bench
//   haywain     a hay cart, loaded, shafts down

import {
  lighten, darken, mix, rgba, soft, shadow as softShadow, blobPath, ball, hash, ellipse, bakeSprite, part as plainPart, PX,
} from "./paint.js";
import { REALM } from "../data/maps.js";
import { RES } from "../data/constants.js";
import { onDay } from "../data/sun.js";
import { Pix, mat, toCanvas } from "./pix/pix.js";
import { decorSun, sunKey } from "./scenery-gwpix.js";
import { tintRing, tintedPart, baking } from "./scenery-gwpix.js";
import {
  menhirPix, stonefallPix, trilithonPix, millBodyPix, cottageBodyPix, boatPix, netrackPix, creelsPix, skepsPix, haywainPix, marramPix, thistlePix, pixBody, stampPixBody,
} from "./pix/vale-pix.js";

// Look C cast shadow: a ragged, hard-edged blob thrown lower right (same
// arguments as the soft one it replaces), with a soft pool kept under it
const shadow = (c, x, y, rx, ry, a = 0.28) => {
  blobPath(c, x + rx * 0.12, y, rx, ry, Math.round(x * 7 + y * 3), 0.15, 11);
  c.fillStyle = `rgba(28,20,34,${Math.min(0.4, a * 1.1)})`; c.fill();
  softShadow(c, x - rx * 0.35, y, rx * 0.45, ry * 0.7, Math.min(0.4, a * 0.9));
};

const ap = (v) => Math.round(v * PX) / PX;

// ---- the vale's materials ---------------------------------------------------
const WOOD = "#6a4a2e", WOOD_LT = "#8a6440", WOOD_DK = "#46301e", OAK = "#7a5334";
const IRON = "#2e3038";

// ---- the mill ---------------------------------------------------------------
const MILL = { hw: 17, wall: 10.5, frame: 7.5, apex: 12, D: 14, R: 13.5, rx: 0.55 };
// where the wheel's hub stands from the feet (x, y): ~21.5 out on the wheel
// side and ~11 below, its rim pressed against the mill's corner — the decor
// is placed so that point is on the race's centre line
const wheelAt = (x, y, s, v) => [x + (v % 2 ? 1 : -1) * (MILL.hw + 4.5) * s, y + 11 * s];
// the water's surface across the wheel: everything below it is in the race
const waterAt = (y, s) => y + 11 * s + MILL.R * s * 0.46;
// the sluice frame across the race upstream of the wheel (the race comes
// down to the wheel from the north): its middle and its two posts
const sluiceAt = (wx, wy, s, side) => {
  const cx = wx + side * 3.5 * s, cy = wy - 17 * s, nx = -side * 7.5 * s, ny = -1.2 * s;
  return { cx, cy, a: [cx + nx, cy + ny], b: [cx - nx, cy - ny] };
};
// The wheel: an oak rim seen slanting (its face turned to the race), twelve paddles between a near and a
// far rim, six spokes to an iron-bound hub on the axle that runs into the mill's bearing block. SCULPTED
// (pix) and baked as WHEEL_N frames of one sixth of a turn (six spokes: the picture repeats), cut along
// the race's surface (nothing of it shows below the water). A frame blits one canvas; only the churn,
// drips, spray and wake are live specks.
const FOAM = ["#f4f8f4", "#d8ecee", "#b0d0dc"];
const WHEEL_N = 12;
const WHEELS = new Map();
onDay(() => WHEELS.clear());
const wheelFrames = (s, v) => {
  const k = `${s}|${v}${sunKey()}`;
  let F = WHEELS.get(k);
  if (F) return F;
  const t0 = performance.now(), U = RES, side = v % 2 ? 1 : -1, m = wheelMats();
  const R = MILL.R * s * U, rx = R * MILL.rx, Wd = side * 2.6 * s * U, wl = Math.round(R * 0.46);
  const w = Math.ceil((rx + Math.abs(Wd) + 12) * 2) + 2 * Math.ceil(rx + 4 * s * U), h = Math.ceil(R * 2 + 16);
  F = [];
  for (let f = 0; f < WHEEL_N; f++) {
    const turn = side * f * (Math.PI / 3) / WHEEL_N;
    const b = new Pix(w, h, w >> 1, h >> 1);
    const P = (a, r, dx = 0) => [dx + Math.cos(a) * rx * r, Math.sin(a) * R * r];
    // the axle: from the hub into the bearing block in the wall
    b.part(); b.rect(-side > 0 ? 0 : -(rx + 4 * s * U), -2, rx + 4 * s * U, 4, m.axle, 0.1, { n: [0, -0.5, 0.86] });
    // the far rim
    b.part();
    for (let i = 0; i < 36; i++) { const [ax, ay] = P(i * Math.PI / 18, 1, Wd), [bx, by] = P((i + 1) * Math.PI / 18, 1, Wd); b.capsule(ax, ay, 1.3, bx, by, 1.3, m.rimD, 0.2, { limb: false, round: 0.7 }); }
    // the far spokes (a tone down) and the near ones
    for (let q = 0; q < 6; q++) {
      const a = turn + q * Math.PI / 3, [ex, ey] = P(a, 0.93, Wd), [nx, ny] = P(a, 0.93);
      b.part(); b.capsule(Wd * 0.6, 0, 1, ex, ey, 0.8, m.rimD, 0.3, { limb: false, round: 0.6 });
      b.part(); b.capsule(0, 0, 1.3, nx, ny, 1, m.spoke, 0.7, { limb: false, round: 0.8 });
    }
    // the paddles: boards from the near rim to the far, standing out past both
    for (let q = 0; q < 12; q++) {
      const a = turn + q * Math.PI / 6, c = Math.cos(a), sn = Math.sin(a);
      const pts = [P(a, 0.9), P(a, 1.16), P(a, 1.16, Wd), P(a, 0.9, Wd)];
      b.part(); b.poly(pts, q % 4 === 1 ? m.padW : m.pad, 0.5 + (side * c > 0 ? 0 : 0.1), { n: [c * 0.75, sn * 0.75, 0.6] });
    }
    // the near rim: an oak felloe with an iron hoop, and the iron-bound hub
    b.part();
    for (let i = 0; i < 36; i++) { const [ax, ay] = P(i * Math.PI / 18, 1), [bx, by] = P((i + 1) * Math.PI / 18, 1); b.capsule(ax, ay, 1.6, bx, by, 1.6, m.rim, 0.9, { limb: false, round: 0.8 }); }
    for (let i = 0; i < 36; i += 2) { const [ax, ay] = P(i * Math.PI / 18, 1.04); b.dot(ax, ay, m.hoop, 0.95, { noLine: true, cast: 0 }); }
    b.part(); b.ellipse(0, 0, 2.6 * s * U * 0.6, 2.6 * s * U, m.rim, 1, { round: 0.95 });
    b.part(); b.ellipse(0, 0, 1.4 * s * U * 0.6, 1.4 * s * U, m.hoop, 1.1, { round: 0.95 });
    const img = b.resolve({ line: "tint", sun: decorSun() }), cv = toCanvas(img), c = cv.getContext("2d");
    // cut along the race's surface (a few pixels ragged; the live churn hides the line)
    for (let x = 0; x < img.w; x++) { const cy = img.oy + wl - (hash(x, 5) < 0.35 ? 1 : 0); c.clearRect(x, cy, 1, img.h); }
    F.push({ cv, ox: img.ox, oy: img.oy, w: img.w, h: img.h });
  }
  F.ms = performance.now() - t0;
  WHEELS.set(k, F);
  return F;
};
let WM = null;
const wheelMats = () => WM || (WM = {
  rim: mat(OAK, { contrast: 1.1 }), rimD: mat(WOOD_DK, { contrast: 0.9 }), spoke: mat(WOOD, { contrast: 1.05 }), axle: mat(WOOD_DK),
  pad: mat("#7c5a3a", { contrast: 1.15 }), padW: mat("#6a5a48", { contrast: 1.1 }), hoop: mat("#4a4e5a", { contrast: 0.9 }),
});
const millWheel = (ctx, x, y, s, v, time) => {
  const side = v % 2 ? 1 : -1;
  const [wx, wy] = wheelAt(x, y, s, v);
  const R = MILL.R * s, rx = R * MILL.rx, ry = R, wl = waterAt(y, s);
  const F = wheelFrames(s, v), q = 1 / RES;
  const fr = F[Math.floor((((time * 0.9) % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) / (Math.PI / 3) * WHEEL_N) % WHEEL_N];
  ctx.drawImage(fr.cv, wx - fr.ox * q, wy - fr.oy * q, fr.w * q, fr.h * q);
  // water pouring off the paddles as they climb out of the race: short broken streams
  for (let k = 0; k < 5; k++) {
    const ph = (time * 1.6 + k / 5) % 1, u = 0.35 + 0.13 * k;
    const dx = wx - side * rx * u * 1.05 + (k % 2) * 0.5, top = wy + ry * (0.15 + 0.12 * k) - 4;
    const dy = top + ph * (wl - top);
    ctx.fillStyle = rgba(k % 2 ? "#e4f0f2" : "#b8d4e0", 0.85 - ph * 0.45); ctx.fillRect(ap(dx), ap(dy), 0.5, 1.5);
    if (ph > 0.6) { ctx.fillStyle = rgba("#f4f8f4", 0.7); ctx.fillRect(ap(dx - 0.5), ap(wl - 0.5), 1.5, 0.5); }
  }
  // the churn along the surface where the paddles bite: soft broken foam in
  // the water's own light tones, thickest on the downstream side
  for (let i = 0; i < 22; i++) {
    const u = hash(i, 21) * 2 - 1, f = Math.sin(time * (5 + hash(i, 4) * 4) + i * 2.3) * 0.5 + 0.5;
    if (f < 0.25) continue;
    const fx = wx + u * (rx + 2.5) + Math.sin(time * 3 + i) * 0.6;
    const fy = wl - 0.5 + (hash(i, 3) - 0.35) * 3 + (u * -side > 0 ? 0.8 : 0);
    ctx.fillStyle = rgba(FOAM[Math.floor((1 - f) * 2.99)], 0.3 + 0.5 * f);
    ctx.fillRect(ap(fx), ap(fy), f > 0.7 ? 1.5 : 0.5, f > 0.85 ? 1 : 0.5);
  }
  // spray thrown up where the paddles strike, falling back
  for (let k = 0; k < 5; k++) {
    const ph = (time * 1.8 + k / 5) % 1, u = hash(k, 31) - 0.5;
    const fx = wx + side * (rx * 0.3 - ph * 3) + u * rx, fy = wl - Math.sin(ph * Math.PI) * 3.5;
    ctx.fillStyle = rgba("#eef6f6", 0.75 * (1 - ph)); ctx.fillRect(ap(fx), ap(fy), 0.5, 0.5);
  }
  // the wake: foam streaks drifting off downstream with the race and thinning
  for (let k = 0; k < 9; k++) {
    const ph = (time * 0.55 + k / 9) % 1, j = hash(k, 11) - 0.5;
    const fx = wx + j * rx * 1.2 + ph * 10 * s, fy = wl + 1 + ph * 11 * s + j * 2;
    ctx.fillStyle = rgba(FOAM[k % 3], 0.6 * (1 - ph));
    ctx.fillRect(ap(fx), ap(fy), ph < 0.5 ? 1.5 : 1, 0.5);
  }
  // the spill under the sluice board
  const { cx: sx, cy: sy } = sluiceAt(wx, wy, s, side);
  for (let k = 0; k < 6; k++) {
    const ph = (time * 1.1 + k / 6) % 1, u = (k - 2.5) / 2.5;
    ctx.fillStyle = rgba(FOAM[k % 3], 0.55 * (1 - ph));
    ctx.fillRect(ap(sx + u * 5 * s - side * ph * 2), ap(sy + u * 3.6 * s + 0.5 + ph * 3.5), 1, 0.5);
  }
};
const watermill = (ctx, x, y, s, o) => {
  const v = o.v % 2;
  const sp = pixBody(`mill|${s}|${v}`, Math.ceil((MILL.hw + 28) * s), Math.ceil(48 * s + 4), Math.ceil(28 * s), (c, bx, by) => millBodyPix(c, bx, by, s, v));
  stampPixBody(ctx, sp, x, y);
  millWheel(ctx, x, y, s, v, o.time);
};

// ---- the fishing hamlet -------------------------------------------------------
// A fisher's cottage: low limewashed walls, a deep thatch held down by ropes
// weighted with stones, a chimney at the back with peat smoke (live).
const COT = { hw: 12.5, wall: 9, apex: 8.5, D: 13 };
// peat smoke: puffs climbing from the chimney, drifting east, swelling and thinning. Each puff is a baked
// pixel cluster (lit top-left, a shaded underside, a ragged rim: never a soft disc) in five sizes.
const PUFFS = [];
onDay(() => { PUFFS.length = 0; });
const puff = (i) => {
  if (PUFFS[i]) return PUFFS[i];
  const r = 3 + i * 1.6, n = Math.ceil(r * 2 + 4), cv = document.createElement("canvas");
  cv.width = n; cv.height = n;
  const c = cv.getContext("2d"), o = n / 2;
  const cols = ["#ece8e0", "#d2cec6", "#aaa49c", "#8c8680"];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = x + 0.5 - o, dy = (y + 0.5 - o) * 1.15, d = Math.hypot(dx, dy) / r;
    // three lobes make a billow, not a ball
    const l2 = Math.hypot(dx + r * 0.45, dy + r * 0.2) / (r * 0.7), l3 = Math.hypot(dx - r * 0.4, dy + r * 0.3) / (r * 0.65);
    const e = Math.min(d, l2, l3) + (hash(x + i * 17, y) - 0.5) * 0.22;
    if (e > 1) continue;
    const lit = (-dx * 0.55 - dy * 0.8) / r;                // the sun's side of the billow
    let t = lit > 0.35 ? 0 : lit > -0.15 ? 1 : lit > -0.55 ? 2 : 3;
    if (e > 0.82 && t < 2 && (x + y) % 2) t++;             // a dithered rim
    c.fillStyle = cols[t]; c.fillRect(x, y, 1, 1);
  }
  PUFFS[i] = cv;
  return cv;
};
const smoke = (ctx, x, y, time, k = 1) => {
  const q = 1 / RES, was = ctx.globalAlpha;
  for (let i = 0; i < 5; i++) {
    const ph = (time * 0.2 + i / 5 + x * 0.013) % 1;
    const px = x + ph * ph * 11 + Math.sin(time * 0.8 + i * 2.1) * 1.1 * ph, py = y - ph * 17;
    const cv = puff(Math.min(4, Math.floor(ph * 5)));
    ctx.globalAlpha = was * k * (ph < 0.12 ? ph / 0.12 : 1) * (1 - ph) * 0.9;
    ctx.drawImage(cv, ap(px - cv.width * q / 2), ap(py - cv.height * q / 2), cv.width * q, cv.height * q);
  }
  ctx.globalAlpha = was;
};
const cottage = (ctx, x, y, s, o) => {
  const v = o.v % 2;
  const sp = pixBody(`cot|${s}|${v}`, Math.ceil((COT.hw + 12) * s), Math.ceil(40 * s + 4), Math.ceil(14 * s), (c, bx, by) => cottageBodyPix(c, bx, by, s, v));
  stampPixBody(ctx, sp, x, y);
  const gy = y + 8, flip = v % 2 ? 1 : -1;
  smoke(ctx, x + flip * -3.5 * s, gy - (COT.wall + COT.apex + COT.D + 5.5) * s, o.time);
};

// ---- the registry ---------------------------------------------------------------
export const VALE_ART = {
  flat: ["marram", "thistle", "menhir", "stonefall", "trilithon", "boat", "netrack", "creels", "skeps", "haywain"],
  decor: {
    menhir: menhirPix, stonefall: stonefallPix, trilithon: trilithonPix, watermill, cottage, boat: boatPix, netrack: netrackPix,
    creels: creelsPix, marram: marramPix, thistle: thistlePix, skeps: skepsPix, haywain: haywainPix,
  },
  live: ["watermill", "cottage"],
  box: {
    menhir: [20, 40], stonefall: [24, 18], trilithon: [26, 40], boat: [24, 18], netrack: [26, 24],
    creels: [20, 18], marram: [16, 26], thistle: [16, 28], skeps: [20, 18], haywain: [32, 34],
  },
  dress: { menhir: [7, true], trilithon: [16, true], stonefall: [14, true], netrack: [12, false], skeps: [11, false] },
  spawn: {}, turf: {}, road: {},
};
// (how wide each stands, for blocking and grounding, is registered with
// addFootprints in src/data/realms-greenwood.js: data never imports render)
