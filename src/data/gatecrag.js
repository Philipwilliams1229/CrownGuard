// ============ DATA: THE GATE'S CRAG ============
// The hill of rock the enemy's gate is cut into (the Greenwood's "grove" and
// the old realms' "cave"): its shape as a height over the ground. The art
// (src/render/scenery.js bakes it) and the rules (buildableAt keeps halls off
// it) both read it from here, so the two never drift apart. Pure math, no
// canvas: safe for the node sims.
import { W, H, PATH_HALF } from "./constants.js";
import { PTS, SEGS, posAt } from "../engine/path.js";
import { COAST, seaDepthAt } from "./terrain.js";
import { REALM } from "./maps.js";

// (the same hash as the paint kit's, kept here so data never imports render)
const hash = (a, b = 0) => {
  let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// smooth value noise on a unit lattice
export const vnoise = (x, y, seed) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const k = seed * 131;
  const a = hash(xi + k, yi), b = hash(xi + 1 + k, yi), c = hash(xi + k, yi + 1), d = hash(xi + 1 + k, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// does this realm's gate stand in a crag? (the chapters' camps and barrows,
// and the fen's barrow, are other things)
export const hasCrag = (r = REALM) => !r.spawn || r.spawn === "grove" || r.spawn === "cave";

let CRAG = null, CRAG_KEY = "";
// The crag for the realm in play (null where the gate is something else).
export const gateCrag = () => {
  const key = `${REALM.id}|${REALM.spawn}|${PTS[0]}|${PTS.length}|${TOTAL()}`;
  if (CRAG_KEY === key) return CRAG;
  CRAG_KEY = key;
  CRAG = hasCrag() && PTS.length > 1 ? build() : null;
  return CRAG;
};
const TOTAL = () => SEGS.length ? SEGS[SEGS.length - 1].start + SEGS[SEGS.length - 1].len : 0;

const build = () => {
  const seed = (REALM.seed || 7) % 9973;
  // the road's first stretch: which way it leaves the mouth
  const [ax, ay] = posAt(0), [bx, by] = posAt(40);
  let dx = bx - ax, dy = by - ay;
  const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  // the mouth faces down the road, turned toward the camera — a road that
  // leaves along the screen turns it a good deal further, or the camera sees
  // the arch edge-on as a slit
  const side = Math.abs(dx) > 0.6;
  let nx = dx, ny = dy + Math.max(0.5, 1.1 * Math.abs(dx));
  const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
  const tx = -ny, ty = nx;
  // wide enough that its jambs stand at the road's edges
  const cosT = Math.max(0.5, nx * dx + ny * dy);
  const HW = Math.round(PATH_HALF / cosT + 3), ARCH = side ? 34 : 28, S = 2.2, HMAX = 46, FL = 20;
  // the portal on screen: (s along the face, z up it) -> world
  let mx = 0, my = 0;
  const onFace = (s, z) => [mx + tx * s - nx * z / S, my + ty * s - ny * z / S - z];
  // the arch: shoulders leaning in, its line broken by a few bites
  const archTop = (s) => ARCH * Math.pow(Math.max(0, 1 - (s / HW) ** 2), 0.58) * (0.8 + 0.24 * vnoise(s / 9 + 20, 1.5, seed) + 0.1 * vnoise(s / 3.2 + 50, 7.5, seed));
  // set the mouth in far enough that the whole arch lies on the board
  for (let d0 = 12; d0 <= 64; d0 += 4) {
    [mx, my] = posAt(d0);
    let ok = true;
    for (let s = -HW; s <= HW; s += 4) { const [px, py] = onFace(s, archTop(s)); if (px < 3 || py < 5) ok = false; }
    if (ok) break;
  }
  // the road near the gate, for keeping the crag off it
  const near = SEGS.filter((sg) => sg.start < 320);
  const roadD = (x, y) => {
    let best = 1e9;
    for (const sg of near) {
      const vx = sg.x2 - sg.x1, vy = sg.y2 - sg.y1;
      const t = Math.max(0, Math.min(1, ((x - sg.x1) * vx + (y - sg.y1) * vy) / (sg.len * sg.len)));
      const ex = x - sg.x1 - vx * t, ey = y - sg.y1 - vy * t;
      const d = ex * ex + ey * ey;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  // the crag, as a height over the ground at (x, y): steep stone round the
  // mouth, easing out along the flanks into lower, turfed slopes
  const faceAt = (v) => {
    const av = Math.abs(v);
    return FL * sstep(HW + 6, HW + 54, av) + (vnoise(v / 11 + 40, 3.3, seed) - 0.5) * 8 * sstep(HW - 2, HW + 12, av);
  };
  const hillAt = (x, y) => {
    const rx = x - mx, ry = y - my;
    const u = rx * nx + ry * ny, v = rx * tx + ry * ty, av = Math.abs(v);
    let z = 0;
    if (u < FL + 8 && av < 158) {
      const nearM = 1 - sstep(HW, HW + 75, av);
      // the face: straight across the mouth, the flanks stepping forward
      let dep = faceAt(v) - u + (vnoise(x / 6, y / 6, seed + 1) - 0.5) * 3;
      // beside the mouth, the crag stops at the road's edge
      if (dep > 0 && av > HW + 3) dep = Math.min(dep, roadD(x, y) - PATH_HALF - 1);
      if (dep > 0) {
        z = dep * (1.05 + 1.15 * nearM);
        // the shoulder rounds over into a turfed top with a few humps
        const top = HMAX * (0.5 + 0.5 * nearM) + (vnoise(x / 17, y / 17, seed + 2) - 0.5) * 14;
        if (z > top - 7) z = top - 7 + 7 * (1 - Math.exp(-(z - top + 7) / 7));
        // the ends of the ridge wander rather than stop on a ruled line
        z *= 1 - sstep(62, 124, av + (vnoise(u / 19, 7.7, seed) - 0.5) * 44);
        // and never out onto a beach
        if (COAST) z *= sstep(-(COAST.sand || 0) - 6, -(COAST.sand || 0) - 44, seaDepthAt(x, y));
      }
    }
    return z;
  };
  // stones fallen at the mouth's feet, and a few outcrops at the flanks' feet
  // ([x, y, r, h] on the ground, just in front of the face)
  const rocks = [];
  for (const [s, r, hh] of [[HW + 2, 6.5, 8], [-HW - 2, 5.5, 6.5], [HW + 10, 3.2, 3.5], [-HW - 11, 3.5, 4],
    [HW + 30, 7, 9], [-HW - 36, 8, 10], [HW + 56, 6, 7], [-HW - 62, 6.5, 8]]) {
    const fu = faceAt(s) + r * 0.55 + 1;
    const x = mx + tx * s + nx * fu, y = my + ty * s + ny * fu;
    if (x < 4 || y < 6 || x > W - 4 || y > H - 4) continue;
    if (roadD(x, y) > PATH_HALF - 5 + (Math.abs(s) > HW + 20 ? r + 4 : 0) && hillAt(x, y + r * 0.6) < 2) rocks.push([x, y, r, hh * (0.85 + hash(Math.round(s), seed) * 0.3)]);
  }
  return { seed, side, mx, my, nx, ny, tx, ty, HW, ARCH, S, HMAX, FL, onFace, archTop, roadD, hillAt, rocks, mask: null };
};

// ---- where halls may not stand -------------------------------------------
// A hall's footing (rx 18, ry 13 round (x, y + 3)) may not reach onto the
// crag's slopes or its fallen stones: a hall on a cliff face breaks the
// ground. Worked out once per realm on a 4-unit grid.
const CELL = 4;
export const cragBlocks = (x, y) => {
  const C = gateCrag();
  if (!C) return false;
  if (!C.mask) C.mask = buildMask(C);
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  const GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return false;
  return C.mask[gy * GW + gx] === 1;
};
const buildMask = (C) => {
  const GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  const solid = new Uint8Array(GW * GH), mask = new Uint8Array(GW * GH);
  let any = false;
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL;
    if (Math.abs(x - C.mx) > 200 || Math.abs(y - C.my) > 200) continue;
    let z = C.hillAt(x, y);
    for (const [bx, by, r] of C.rocks) if (Math.abs(x - bx) < r + 1 && Math.abs(y - by) < r * 0.8 + 1) z = Math.max(z, 2);
    if (z > 0.8) { solid[gy * GW + gx] = 1; any = true; }
  }
  if (!any) return mask;
  // grow it by the footing: a hall at (x, y) is refused if any solid cell
  // lies inside its footing's ellipse
  const RX = 16 / CELL, RY = 11 / CELL, OY = 3 / CELL;
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    if (Math.abs((gx + 0.5) * CELL - C.mx) > 230 || Math.abs((gy + 0.5) * CELL - C.my) > 230) continue;
    let hit = 0;
    for (let j = Math.floor(-RY + OY); j <= Math.ceil(RY + OY) && !hit; j++) for (let i = -Math.ceil(RX); i <= Math.ceil(RX); i++) {
      const a = i / RX, b = (j - OY) / RY;
      if (a * a + b * b > 1) continue;
      const qx = gx + i, qy = gy + j;
      if (qx >= 0 && qy >= 0 && qx < GW && qy < GH && solid[qy * GW + qx]) { hit = 1; break; }
    }
    mask[gy * GW + gx] = hit;
  }
  return mask;
};
