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
// The wheel, live: an oak rim seen slanting (its face turned to the race),
// twelve paddles, spokes to an iron-bound hub on the axle that runs into the
// mill's bearing block. Below the race's surface nothing of it is drawn (the
// race's own water shows there); along the surface the paddles churn foam,
// and a white wake runs off downstream with the current.
const FOAM = ["#f4f8f4", "#d8ecee", "#b0d0dc"];
const millWheel = (ctx, x, y, s, v, time) => {
  const side = v % 2 ? 1 : -1;
  const [wx, wy] = wheelAt(x, y, s, v);
  const R = MILL.R * s, rx = R * MILL.rx, ry = R, wl = waterAt(y, s);
  const turn = time * 0.9 * side;
  const pt = (a, r = 1) => [wx + Math.cos(a) * rx * r, wy + Math.sin(a) * ry * r];
  ctx.save();
  // (cut along a moving, broken surface, never a ruled line)
  ctx.beginPath(); ctx.moveTo(wx - rx - 8, wy - ry - 8); ctx.lineTo(wx + rx + 8, wy - ry - 8);
  for (let px = wx + rx + 8; px >= wx - rx - 8; px -= 0.5) ctx.lineTo(px, wl + Math.sin(px * 1.7 + time * 5) * 0.5 + Math.sin(px * 0.6 - time * 3) * 0.5);
  ctx.closePath(); ctx.clip();
  // its shadow on the footing and the wall behind it, thrown down-right
  ctx.fillStyle = "rgba(28,20,30,0.22)"; ellipse(ctx, wx + 2.5, wy + 1.5, rx + 1, ry); ctx.fill();
  // the axle: from the hub into the bearing block in the wall
  ctx.fillStyle = WOOD_DK; ctx.fillRect(ap(Math.min(wx, wx - side * (rx + 3))), ap(wy - 1.25), rx + 3, 2.5);
  ctx.fillStyle = WOOD; ctx.fillRect(ap(Math.min(wx, wx - side * (rx + 3))), ap(wy - 1.25), rx + 3, 0.5);
  // the far rim, then the spokes, then the paddles and the near rim
  ctx.lineCap = "round";
  ctx.strokeStyle = WOOD_DK; ctx.lineWidth = 1.5;
  ellipse(ctx, wx + side * 1.6, wy, rx, ry); ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = turn + k * Math.PI / 3, [ex, ey] = pt(a, 0.92);
    ctx.strokeStyle = Math.sin(a) < 0 ? OAK : WOOD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ap(wx), ap(wy)); ctx.lineTo(ap(ex), ap(ey)); ctx.stroke();
  }
  for (let k = 0; k < 12; k++) {
    const a = turn + k * Math.PI / 6, [ex, ey] = pt(a, 1);
    const lit = Math.cos(a) * -side > -0.2 && Math.sin(a) < 0.3;
    ctx.fillStyle = lit ? WOOD_LT : WOOD;
    ctx.fillRect(ap(ex + (side < 0 ? 0 : -1.5)), ap(ey - 1), 2, 2);
    ctx.fillStyle = WOOD_DK; ctx.fillRect(ap(ex + side * 1.5 + (side < 0 ? 0 : -1.5)), ap(ey - 0.5), 1, 1.5);
  }
  ctx.strokeStyle = OAK; ctx.lineWidth = 1.5;
  ellipse(ctx, wx, wy, rx, ry); ctx.stroke();
  ctx.strokeStyle = lighten(OAK, 0.3); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.ellipse(wx, wy, rx - 0.5, ry - 0.5, 0, Math.PI * 0.95, Math.PI * 1.6); ctx.stroke();
  ctx.strokeStyle = "#241a26"; ctx.lineWidth = 0.5;
  ellipse(ctx, wx, wy, rx + 1, ry + 1); ctx.stroke();
  ball(ctx, wx, wy, 2, 2.3, WOOD, { hi: 0.4, lo: 0.4 });
  ctx.fillStyle = IRON; ctx.fillRect(ap(wx - 0.5), ap(wy - 0.5), 1, 1);
  // drips off the paddles rising out of the water
  for (let k = 0; k < 4; k++) {
    const ph = (time * 1.4 + k / 4) % 1;
    const dx = wx + side * -(rx * (0.55 + 0.1 * k)), dy = wy + ry * 0.1 + ph * (wl - wy - ry * 0.1);
    ctx.fillStyle = rgba("#dcecf0", 0.8 - ph * 0.5); ctx.fillRect(ap(dx), ap(dy), 0.5, 1);
  }
  ctx.restore();
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
// peat smoke: a few soft puffs climbing from the chimney, drifting east and thinning
const smoke = (ctx, x, y, time, k = 1) => {
  for (let i = 0; i < 4; i++) {
    const ph = (time * 0.22 + i / 4 + x * 0.013) % 1;
    const px = x + ph * 9 + Math.sin(time * 0.9 + i * 2) * 1.2, py = y - ph * 16;
    ctx.fillStyle = rgba(ph < 0.3 ? "#9a948c" : "#c8c4bc", (1 - ph) * 0.42 * k);
    ellipse(ctx, ap(px), ap(py), 1.4 + ph * 2.6, 1.1 + ph * 1.8); ctx.fill();
  }
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
