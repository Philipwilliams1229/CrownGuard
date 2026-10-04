// ============ DATA: THE BARROW GATE ============
// The Hollowfen's gate (REALM.spawn "barrowgate"): the great barrow the road
// runs out of, as a height over the ground, and the portal in its forecourt
// wall. The art (src/render/scenery-hollow.js bakes it) and the rules
// (buildableAt, once it asks barrowBlocks) both read it from here, so the two
// never drift apart — as data/gatecrag.js does for the Greenwood's crag.
// Pure maths, no canvas: safe for the node sims.
import { REALM } from "./maps.js";
import { PTS, SEGS, nearestOnPath, posAt, TOTAL_LEN } from "../engine/path.js";
import { PONDS, DECOR, decorFootprint, inRiver, inSea } from "./terrain.js";
import { W, H, PATH_HALF, LANE_OFF, WALL_W, BLOCK_DIST } from "./constants.js";
import { vnoise as cnoise, sstep } from "./gatecrag.js";

// The mound's two sizes. Honest (FULL_MOUND false): it never lies where a
// hall could set its footing, so it shrinks to the road's berth and the
// thick of the wood. Full (true): a great barrow over the wood band, and
// barrowBlocks (below) says where halls may not stand — for buildableAt to
// refuse, as it refuses the Greenwood's crag (data/gatecrag.js cragBlocks).
// Only turn it on once buildableAt asks barrowBlocks.
export const FULL_MOUND = true;
// (a lab page may try the other size: setFullMound(true); null goes back)
let TRY = null;
export const setFullMound = (v) => { TRY = v; };
export const fullMound = () => TRY ?? FULL_MOUND;
const GEO = { key: "", g: null };
export const gateGeom = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS.length}|${TOTAL_LEN}|${fullMound()}`;
  if (GEO.key === key) return GEO.g;
  GEO.key = key; GEO.g = null;
  if (PTS.length < 2) return null;
  const seed = (REALM.seed || 7) % 9973;
  // the road's first stretch: which way it leaves the portal
  const [ax, ay] = posAt(0), [bx, by] = posAt(40);
  let dx = bx - ax, dy = by - ay;
  const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  // the face looks down the road, turned toward the camera (a road leaving
  // along the screen turns it further, or the portal is seen edge-on)
  const side = Math.abs(dx) > 0.6;
  let nx = dx, ny = dy + Math.max(0.5, 1.1 * Math.abs(dx));
  const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
  const tx = -ny, ty = nx;
  const cosT = Math.max(0.5, nx * dx + ny * dy);
  // the opening clears the outer lanes' marchers; the jambs stand at the
  // road's edges
  const HW = Math.round((LANE_OFF + 4) / cosT + 1);
  const ZA = side ? 31 : 28, LT = 8, HM = ZA + LT + 25;
  const RV = HW + 46, FW = HW + 22, CB = 28, CV = side ? 14 : 0;
  // the forecourt's wall: straight across the portal, its wings curving
  // forward into horns
  const uF = (v) => { const k = Math.max(0, Math.abs(v) - HW * 0.7) / (FW - HW * 0.7); return 14 * k * k; };
  let mx = ax, my = ay, d0 = 12;
  const face = (s, z, du = 0) => { const u = uF(s) + du; return [mx + tx * s + nx * u, my + ty * s + ny * u - z]; };
  // set the portal in until its lintel lies on the board
  for (d0 = 14; d0 <= 72; d0 += 2) {
    [mx, my] = posAt(d0);
    let ok = true;
    // (the board's edge may cut a jamb, as it cuts the Greenwood's mouth)
    for (let s = -HW - 9; s <= HW + 9; s += 3) for (const z of [0, ZA + LT + 3]) { const [px, py] = face(s, z); if (px < -8 || py < 3 || px > W - WALL_W - 8) ok = false; }
    if (ok) break;
  }
  // (the portal stays this close to the road's start: the dead must be
  // seen in its dark from the first step, not walking on the mound's roof)
  // the road beyond the portal (the stretch before it runs inside the hill)
  const after = SEGS.filter((sg) => sg.start + sg.len > d0 - 2 && sg.start < d0 + 420);
  const roadD = (x, y) => {
    let best = 1e9;
    for (const sg of after) {
      const vx = sg.x2 - sg.x1, vy = sg.y2 - sg.y1;
      const t = Math.max(0, Math.min(1, ((x - sg.x1) * vx + (y - sg.y1) * vy) / (sg.len * sg.len)));
      const ex = x - sg.x1 - vx * t, ey = y - sg.y1 - vy * t, d = ex * ex + ey * ey;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  // Honest ground: the mound never lies where a hall could set its footing.
  // Where a hall may stand is buildableAt's rule (engine/actions.js) less
  // the towers — the road's berth, the gate's 50, the decor's footprints,
  // water and sea (kept in step with it: a rule added there only makes this
  // mound smaller, never dishonest). Every cell a buildable footing covers is
  // marked, and the mound eases down to nothing short of the nearest.
  // (on a 2-unit grid, and only round the mound: a sliver of buildable
  // ground between a road's berth and a river's margin is narrow)
  const ocx = mx - nx * CB - tx * CV, ocy = my - ny * CB - ty * CV, OR = RV + 70;
  const FC = 2, fx0 = Math.max(0, Math.floor((ocx - OR) / FC)), fy0 = Math.max(0, Math.floor((ocy - OR) / FC));
  const FWd = Math.min(Math.ceil(W / FC), Math.ceil((ocx + OR) / FC)) - fx0, FHd = Math.min(Math.ceil(H / FC), Math.ceil((ocy + OR) / FC)) - fy0;
  const nearDecor = DECOR.filter((d) => Math.abs(d.x - mx) < 290 && Math.abs(d.y - my) < 290);
  const canBuild = (x, y) => {
    if (x < 18 || x > W - WALL_W - 12 || y < 22 || y > H - 16) return false;
    if (nearestOnPath(x, y).d < BLOCK_DIST || Math.hypot(x - PTS[0][0], y - PTS[0][1]) < 50) return false;
    for (const d of nearDecor) if (Math.hypot(d.x - x, d.y - y) < decorFootprint(d) + 8) return false;
    for (const p of PONDS) if (Math.abs(x - p.x) < p.w / 2 + 14 && Math.abs(y - p.y) < p.h / 2 + 14) return false;
    return !inRiver(x, y, 14) && !inSea(x, y, 14);
  };
  const foot = new Uint8Array(FWd * FHd);
  if (!fullMound()) for (let j = 0; j < FHd; j++) for (let i = 0; i < FWd; i++) {
    const x = (fx0 + i + 0.5) * FC, y = (fy0 + j + 0.5) * FC;
    if (Math.hypot(x - ocx, y - ocy) > OR - 24 || !canBuild(x, y)) continue;
    // (a little wider than the footing all round: a hall may stand between
    // two cells this grid calls closed)
    for (let b = -8; b <= 10; b++) for (let a = -11; a <= 11; a++) {
      if ((a * FC / 21) ** 2 + ((b * FC - 3) / 16) ** 2 > 1) continue;
      const ii = i + a, jj = j + b;
      if (ii >= 0 && jj >= 0 && ii < FWd && jj < FHd) foot[jj * FWd + ii] = 1;
    }
  }
  // (a chamfer distance, in units, from each cell to the nearest footing)
  const fd = new Float32Array(FWd * FHd).fill(1e4);
  for (let k = 0; k < fd.length; k++) if (foot[k]) fd[k] = 0;
  const D1 = FC, D2 = FC * 1.414;
  for (let j = 0; j < FHd; j++) for (let i = 0; i < FWd; i++) {
    const k = j * FWd + i; let v = fd[k];
    if (i > 0) v = Math.min(v, fd[k - 1] + D1);
    if (j > 0) { v = Math.min(v, fd[k - FWd] + D1); if (i > 0) v = Math.min(v, fd[k - FWd - 1] + D2); if (i < FWd - 1) v = Math.min(v, fd[k - FWd + 1] + D2); }
    fd[k] = v;
  }
  for (let j = FHd - 1; j >= 0; j--) for (let i = FWd - 1; i >= 0; i--) {
    const k = j * FWd + i; let v = fd[k];
    if (i < FWd - 1) v = Math.min(v, fd[k + 1] + D1);
    if (j < FHd - 1) { v = Math.min(v, fd[k + FWd] + D1); if (i < FWd - 1) v = Math.min(v, fd[k + FWd + 1] + D2); if (i > 0) v = Math.min(v, fd[k + FWd - 1] + D2); }
    fd[k] = v;
  }
  const footD = (x, y) => {
    const fx = x / FC - fx0 - 0.5, fy = y / FC - fy0 - 0.5;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const at = (a, b) => (a < 0 || b < 0 || a >= FWd || b >= FHd ? 1e4 : fd[b * FWd + a]);
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };
  const bx1 = PTS[0][0] - dx * 90, by1 = PTS[0][1] - dy * 90;
  const behind = (x, y) => {
    const vx = bx1 - PTS[0][0], vy = by1 - PTS[0][1], L2 = vx * vx + vy * vy;
    const t = Math.max(0, Math.min(1, ((x - PTS[0][0]) * vx + (y - PTS[0][1]) * vy) / L2));
    return Math.hypot(x - PTS[0][0] - vx * t, y - PTS[0][1] - vy * t) < PATH_HALF + 4;
  };
  const wet = (x, y, m = 6) => inRiver(x, y, m) || PONDS.some((p) => ((x - p.x) / (p.w / 2 + m + 2)) ** 2 + ((y - p.y) / (p.h / 2 + m + 2)) ** 2 < 1);
  const NEARW = (x, y) => wet(x, y, 30);
  const cutAt = (v) => uF(v) + 70 * sstep(FW - 4, FW + 16, Math.abs(v));
  const hillAt = (x, y) => {
    const rx = x - mx, ry = y - my;
    const u = rx * nx + ry * ny, v = rx * tx + ry * ty, av = Math.abs(v);
    if (u > cutAt(v)) return 0;
    // a great round mound, its heart a way behind the portal
    const w1 = cnoise(x / 15, y / 15, seed + 3) - 0.5;
    const r = Math.hypot(u + CB, v + CV) / (RV + w1 * 12);
    if (r >= 1) return 0;
    let z = HM * Math.pow(1 - r * r, 0.72) + (cnoise(x / 10, y / 10, seed + 5) - 0.5) * 3.4 * (1 - r);
    // beside the portal the mound stops at the road's edge in a turf bank
    if (u > uF(v) - 4 && !(u < uF(v) + 0.5 && av < HW + 7)) z = Math.min(z, (roadD(x, y) - PATH_HALF - 1 + w1 * 4) * 2.4);
    // and it eases down before water, never a sheer cut into a river or mere
    if (z > 0 && NEARW(x, y)) { if (wet(x, y, 13)) return 0; z = Math.min(z, wet(x, y, 20) ? 4 : wet(x, y, 28) ? 12 : z); }
    // and it ends short of any ground a hall could stand on
    // (the road's own ground running back off the board behind the portal
    // is no hall's: the mound always covers it)
    if (z > 0 && !fullMound()) z = Math.min(z, behind(x, y) ? (footD(x, y) - 1) * 2 : (footD(x, y) - 6) * 1.3);
    return Math.max(0, z);
  };
  // the forecourt wall's height along it (what the slabs stand against)
  const wallH = (s) => { const [px, py] = face(s, 0, -1.2); return hillAt(px, py); };
  const g = { seed, side, mx, my, nx, ny, tx, ty, dx, dy, cosT, HW, ZA, LT, HM, RV, FW, CB, CV, uF, cutAt, face, hillAt, roadD, wet, wallH, d0, footD, trees: new Map() };
  // where the portal and its wall stand on screen, column by column (for
  // the wood: a crown over these must give way)
  const cols = [];
  for (let s = -FW - 4; s <= FW + 4; s += 3) {
    const [fx, fy] = face(s, 0, 2);
    const top = Math.abs(s) < HW + 10 ? ZA + LT + 3 : Math.max(8, wallH(s) + 4);
    cols.push([fx, fy - top, fy + 6]);
  }
  g.cols = cols;
  GEO.g = g;
  return g;
};


// Where halls may not stand when the mound is full: the mound and the stones
// round it, grown by a hall's footing (rx 18, ry 13 round (x, y + 3)), on a
// 4-unit grid worked out once per realm. Pure maths, safe in the sims.
const BLK = { key: "", mask: null };
export const barrowBlocks = (x, y) => {
  if (!fullMound() || REALM.spawn !== "barrowgate") return false;
  const G = gateGeom();
  if (!G) return false;
  const CELL = 4, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  if (BLK.key !== GEO.key) {
    BLK.key = GEO.key;
    const solid = new Uint8Array(GW * GH), mask = new Uint8Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const px = (gx + 0.5) * CELL, py = (gy + 0.5) * CELL;
      if (Math.abs(px - G.mx) > 230 || Math.abs(py - G.my) > 230) continue;
      // (the forecourt's slabs and the horn stones stand just in front of the cut)
      const [s, u] = [(px - G.mx) * G.tx + (py - G.my) * G.ty, (px - G.mx) * G.nx + (py - G.my) * G.ny];
      if (G.hillAt(px, py) > 0.3 || (Math.abs(s) < G.FW + 14 && u > G.uF(s) - 2 && u < G.uF(s) + 16)) solid[gy * GW + gx] = 1;
    }
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      let hit = 0;
      for (let j = -4; j <= 5 && !hit; j++) for (let i = -5; i <= 5; i++) {
        if ((i * CELL / 20) ** 2 + ((j * CELL - 3) / 15) ** 2 > 1) continue;
        const qx = gx + i, qy = gy + j;
        if (qx >= 0 && qy >= 0 && qx < GW && qy < GH && solid[qy * GW + qx]) { hit = 1; break; }
      }
      mask[gy * GW + gx] = hit;
    }
    BLK.mask = mask;
  }
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  return gx >= 0 && gy >= 0 && gx < GW && gy < GH && BLK.mask[gy * GW + gx] === 1;
};

