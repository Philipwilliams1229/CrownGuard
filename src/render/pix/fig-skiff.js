// ============ FIGURE: the River Watch's skiff and her crew of two ============
// The hall's boat as the sculptor draws it (the old painter: rigs-skiff.js `skiff`): a lapped
// clinker hull with a cream strake and a pale rail, the far side's planking and ribs seen into
// shade, a thwart, a bow lantern on its crook; an oarsman in a knitted cap and a linen smock
// pulling on the thwart, his back to the bow, an ash oar working the near water; a watchman
// standing in the bow with his musket, the gunwale at his thighs, in the hall's colours.
// The engine reads the same numbers as before (rigs-skiff.js skiffMuzzle: the ball leaves the
// musket's mouth in the `kick` pose), so the gun here is placed on musketPoint's own points and
// its muzzle IS that point. Everything is drawn in the old rig's world units x 2 (one art pixel
// is half a world unit), the anchor where drawSkiff stamps the rig (the waterline amidships).
//   Looks (the PIX entries skiff, skiffA, skiffB; o.variant): "base" the Watch's blue-grey,
//     "a" the Longwatch's dark blue, "b" the Hellburners' brick red (halls/riverwatch.js WATCH)
//   Clips, one per gun pose the old frame string named: kick recoil port ramA ramB raise aim,
//     each 5 frames: the oarsman's row 0 catch, 1 drive, 2 finish, 3 recover, 4 rest (oars
//     easy). enemies.js drawSkiff asks for "<gun>.<row>"; `walk` is the port gun rowing.
// Marks: muzzle (art px from the anchor).
import { mat, flat } from "./pix.js";
import { ik, HUMAN } from "./rig.js";
import { musketPoint } from "../folk-gunners.js";

const GUNNER = {
  base: { coat: "#4a6a7a", hood: "#34404e", trim: "#c8b070", boots: "#2a2a30" },
  a: { coat: "#3a5a8a", hood: "#2a3a5a", trim: "#e8e0c8", boots: "#2a2a30" },
  b: { coat: "#7a3a2a", hood: "#3a2a28", trim: "#c8b070", boots: "#2a2420" },
};
const KITS = new Map();
const kitOf = (v) => {
  const key = GUNNER[v] ? v : "base";
  let K = KITS.get(key);
  if (K) return K;
  const G = GUNNER[key];
  K = {
    COAT: mat(G.coat, { contrast: 1.1 }), HAT: mat(G.hood, { contrast: 1.25 }), TRIM: mat(G.trim), BOOT: mat(G.boots, { contrast: 1.2 }),
    BREECH: mat("#3a4048"),
  };
  KITS.set(key, K);
  return K;
};
const SKIN = mat("#e8b990"), RSKIN = mat("#dcae86"), HAIR = mat("#5a3a26"), EYE = flat("#2a1c2c");
const WOOD = mat("#8a6238", { contrast: 1.15 }), WOODD = mat("#6a4624", { contrast: 1.1 }), INSIDE = mat("#50361f", { contrast: 1.1 }), RAIL = mat("#b8925e", { contrast: 1.1 });
const STRAKE = mat("#e8e0c8"), OAR = mat("#d6c296", { contrast: 1.15 }), IRON = mat("#3a3a44", { contrast: 1.2 }), LAMP = flat("#e8c14a", { emis: true, line: "#a8782a" });
const CAP = mat("#a8505c"), SMOCK = mat("#b4ae9a", { contrast: 1.1 }), SMOCK2 = mat("#c4bea8"), BREECHES = mat("#5a4632");
const STOCK = mat("#6a4a2a", { contrast: 1.15 }), BARREL = mat("#7c828e", { contrast: 1.3 }), BRASS = mat("#c89a48");

export const BOX = { w: 80, h: 66, ox: 40, oy: 52 };
export const BONES = HUMAN;
const GUN_LEN = 7.5, GUNNER_AT = [2, 2], ROWER_AT = [-8.2, -2.8], LOCK = [4.2, -2.1], FAR_LOCK = [4.2, -4.0], OAR_OUT = 1.8;
const ROW = [{ lean: 0.3, hand: [8.0, -5.6] }, { lean: -0.05, hand: [5.5, -6.9] }, { lean: -0.26, hand: [3.0, -6.3] }, { lean: 0.2, hand: [7.4, -5.0] }, { lean: 0.05, hand: [5.4, -5.0] }];
const W = (x, y) => [x * 2, y * 2];
const rot = (L, x, y) => { const c = Math.cos(L), s = Math.sin(L); return [x * c - y * s, x * s + y * c]; };
// the oarsman's frame (+x to the stern, drawn mirrored) -> the rig's, in art px
const rig = (x, y) => W(ROWER_AT[0] - x, ROWER_AT[1] + y);
const quad = (a, c, b, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
const polyline = (px, pts, m, z, o) => { for (let i = 1; i < pts.length; i++) px.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], m, z, o); };
// the near gunwale, stern to bow, dropped by dy (world units)
const nearRail = (dy = 0, n = 12) => quad([-14.2, -5.2 + dy], [0, -3.2 + dy], [15, -5.9 + dy], n).map(([x, y]) => W(x, y));
const farRail = (n = 12) => quad([-14.2, -5.2], [0, -8.8], [15, -5.9], n).map(([x, y]) => W(x, y));

// the gunner: a lump in a coat with a broad hat, and a musket on musketPoint's own points. Per pose:
// hip / lean / head as the Powder Works' musketeer (folk-gunners.js MUSK), the hands where it holds the gun
const POSE = {
  aim: { hip: [0.2, 0.3], lean: 0.05, head: [0.6, 0.7], grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  kick: { hip: [-0.5, 0.4], lean: -0.09, head: [-0.2, 0.1], grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  recoil: { hip: [-0.15, 0.35], lean: -0.02, head: [0.3, 0.4], grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  port: { hip: [0, 0.3], lean: 0, head: [0, 0], grip: [-0.9, 0.9], rest: [2.4, 0.9] },
  ramA: { hip: [0.2, 0.4], lean: 0.04, head: [0, 0], hold: 4.5, rod: 2.2 },
  ramB: { hip: [0.2, 0.5], lean: 0.06, head: [0, 0], hold: 4.5, rod: 0.6 },
  raise: { hip: [0.1, 0.3], lean: 0.02, head: [0.2, 0.3], grip: [-0.9, 0.9], rest: [2.6, 0.9] },
};
// Why he stood still: the clip's pose carried only the gun name, so every frame of a clip drew the same
// gunner (only the oarsman's row changed). `row` (the frame) now drives his body: a bob with the boat,
// breath and sway, shouldering on aim / raise, a kick on recoil / kick, a pump on the rammer. The gun,
// and so the muzzle mark, stays on musketPoint's points: only the body moves.
const MOTION = (gun, row) => {
  const t = (row / 4) * Math.PI * 2, bob = Math.sin(t) * 0.35, sway = Math.cos(t) * 0.3, breath = Math.sin(t + 1) * 0.15;
  let m = { dx: sway, dy: bob + breath, lean: sway * 0.04, hx: sway * 0.5, hy: breath };
  if (gun === "aim" || gun === "raise") { const s = [0, 0.5, 1, 0.8, 1][row] || 0; m.lean += 0.05 * s; m.hx += 0.5 * s; m.dx += 0.3 * s; }
  if (gun === "kick" || gun === "recoil") { const s = [1, 0.6, 0.3, 0.1, 0][row] || 0; m.lean -= 0.12 * s; m.dx -= 0.9 * s; m.hx -= 0.6 * s; m.hy += 0.3 * s; m.dy += 0.3 * s; }
  if (gun === "ramA" || gun === "ramB") { const s = Math.sin(t + (gun === "ramB" ? Math.PI : 0)); m.dy += 0.25 * s; m.lean += 0.04 * s; m.dx += 0.3 * s; }
  return m;
};
const drawGunner = (px, K, gun, row = 4) => {
  const M = MOTION(gun, row);
  const p0 = POSE[gun] || POSE.port, p = { ...p0, hip: [p0.hip[0] + M.dx, p0.hip[1] + M.dy], lean: p0.lean + M.lean, head: [p0.head[0] + M.hx, p0.head[1] + M.hy] };
  const [gx, gy] = GUNNER_AT, at = (u, v) => { const m = musketPoint(gun, GUN_LEN, u, v); return [gx + m.x, gy + m.y]; };
  const hip = [gx + p.hip[0], gy - 8.4 + p.hip[1]], sh = rot(p.lean, 1.8, -7.2).map((v, i) => v + hip[i]), nk = [sh[0] + 0.4 + p.head[0], sh[1] - 2.6 + p.head[1]];
  const hd = [nk[0] + 0.3, nk[1] - 2.0];
  const farSh = [sh[0] - 2.6, sh[1] + 0.4];
  // the near hand and the far hand, on the gun
  const near = p.rod != null ? at(GUN_LEN + p.rod, -0.2) : at(...p.rest), far = p.rod != null ? at(GUN_LEN - p.hold, 0.8) : at(...p.grip);
  // legs (the gunwale hides all but the thighs)
  px.part();
  px.capsule(...W(...hip), 2.6, ...W(gx + 1.4, gy - 1), 2.2, K.BREECH, 6, { bias: -1 });
  px.capsule(...W(hip[0] - 1, hip[1]), 2.6, ...W(gx - 1.4, gy - 1), 2.2, K.BREECH, 5.9, { bias: -2 });
  // the far arm, behind the body, the near over it
  const arm = (s, h, m, z, r) => { const e = ik(s[0], s[1], h[0], h[1], 4.2, 4.2, -1).mid, e2 = ik(s[0], s[1], h[0], h[1], 4.2, 4.2, 1).mid, el = e[1] > e2[1] ? e : e2; px.part(); px.capsule(...W(...s), r, ...W(...el), r - 0.2, m, z, { bias: -1 }); px.capsule(...W(...el), r - 0.2, ...W(...h), r - 0.5, m, z, { bias: -1 }); };
  arm(farSh, far, K.COAT, 7, 2.2);
  // the coat, a buff cross-belt
  px.part();
  px.capsule(...W(...hip), 4.6, ...W(...sh), 4.8, K.COAT, 7.2, { round: 0.95, cast: 1, bias: -1 });
  px.line(...W(sh[0] - 2.2, sh[1] - 1), ...W(hip[0] + 2, hip[1] + 0.6), K.TRIM, 7.3);
  // the gun: stock to the muzzle, one rigid piece
  const butt = at(-4.2, 0.4), wr = at(1.4, 0), mz = at(GUN_LEN, -0.2);
  px.part();
  px.capsule(...W(...butt), 1.9, ...W(...wr), 1.5, STOCK, 7.6, { edge: true });
  px.capsule(...W(...wr), 1.2, ...W(...mz), 1.0, BARREL, 7.6, { edge: true });
  px.dot(...W(...mz), BRASS, 7.7, { fix: 3 });
  arm(sh, near, K.COAT, 8, 2.4);
  px.part(); px.ellipse(...W(...near), 1.7, 1.7, SKIN, 8.2); px.ellipse(...W(...far), 1.6, 1.6, SKIN, 7.4);
  // the head under a broad hat, a bit of face to the front
  px.part(); px.ellipse(...W(hd[0], hd[1] + 0.2), 4.2, 4.6, SKIN, 8.4, { cast: 1 });
  px.dot(...W(hd[0] + 1.6, hd[1] - 0.3), EYE, 8.6); px.dot(...W(hd[0] + 2.2, hd[1] + 0.9), SKIN, 8.5, { fix: 3 });
  px.part(); px.ellipse(...W(hd[0] - 0.2, hd[1] - 1.4), 6.2, 1.5, K.HAT, 8.8, { cast: 1 });
  px.ellipse(...W(hd[0] - 0.2, hd[1] - 2.8), 3.6, 2.8, K.HAT, 8.82, { cast: 1 });
  px.line(...W(hd[0] - 2, hd[1] - 1.9), ...W(hd[0] + 1.6, hd[1] - 1.9), K.TRIM, 8.9);
  return W(...mz);
};

// the oarsman: his own frame (+x to the stern), mapped through rig() to face the stern
const drawRower = (px, row) => {
  const rp = ROW[row] || ROW[4], L = rp.lean, nh = rp.hand, fh = [nh[0] - 0.5, nh[1] - 0.7];
  const nsh = rot(L, 1.7, -7.8), fsh = rot(L, -1.1, -7.8);
  const R = (p) => rig(p[0], p[1]);
  // the far oar's loom, behind everything, to the far gunwale
  px.part(); px.line(...R(fh), ...R(FAR_LOCK), OAR, 1.2, { bias: -2 });
  const elbow = (s, h) => { const a = ik(s[0], s[1], h[0], h[1], 4.2, 4.2, 1).mid, b = ik(s[0], s[1], h[0], h[1], 4.2, 4.2, -1).mid; return a[1] > b[1] ? a : b; };
  const ef = elbow(fsh, fh), en = elbow(nsh, nh);
  px.part(); px.capsule(...R(fsh), 2.2, ...R(ef), 2.0, SMOCK2, 3, { bias: -1 }); px.capsule(...R(ef), 2.0, ...R(fh), 1.7, RSKIN, 3, { bias: -1 });
  // thwart (a plank the width of him), legs, the trunk leant about the hips
  px.part(); px.rect(...W(ROWER_AT[0] - 2.6, -5.7), 10.4, 2.8, WOOD, 2.5, { bias: -1 });
  px.part(); px.capsule(...R([0.8, -1.6]), 2.4, ...R([5.8, -1.0]), 2.2, BREECHES, 3.2, { bias: -1 });
  const hip = [0, -1.6], ch = rot(L, 0, -9);
  px.part(); px.capsule(...R(hip), 4.8, ...R(ch), 4.8, SMOCK, 4, { round: 0.95, cast: 1 });
  px.line(...R(rot(L, -2.2, -4)), ...R(rot(L, 2.2, -4)), SMOCK2, 4.1);
  // the head rides the trunk, a knitted cap to the ears with a turned-up band
  const hd = rot(L, 0.5, -12.6);
  px.part(); px.ellipse(...R(hd), 4.5, 4.9, RSKIN, 5, { cast: 1 });
  px.dot(...R([hd[0] + 1.3, hd[1] + 0.2]), EYE, 5.1);
  px.ellipse(...R([hd[0] - 0.4, hd[1] - 2.0]), 5.0, 3.3, CAP, 5.2, { cast: 1 });
  px.line(...R([hd[0] - 2.4, hd[1] - 0.9]), ...R([hd[0] + 2.4, hd[1] - 0.9]), HAIR, 5.3);
  // the near arm over the hull
  px.part(); px.capsule(...R(nsh), 2.4, ...R(en), 2.1, SMOCK2, 15, { bias: -1 }); px.capsule(...R(en), 2.1, ...R(nh), 1.7, RSKIN, 15, { bias: -1 });
  px.part(); px.ellipse(...R(nh), 1.6, 1.6, RSKIN, 15.2);
  // the near oar: the hands, over the lock, to the blade in the water
  const bl = [LOCK[0] + (LOCK[0] - nh[0]) * OAR_OUT, LOCK[1] + (LOCK[1] - nh[1]) * OAR_OUT], b0 = [nh[0] + (bl[0] - nh[0]) * 0.72, nh[1] + (bl[1] - nh[1]) * 0.72];
  px.part(); px.capsule(...R(nh), 1.1, ...R(bl), 1.0, OAR, 14, { edge: true });
  px.capsule(...R(b0), 1.5, ...R(bl), 1.5, OAR, 14.02, { edge: true, bias: -1 });
  px.dot(...R(LOCK), IRON, 14.1);
};

export const draw = (px, F, o = {}) => {
  const K = kitOf(o.variant), p = F.sk.p || {}, gun = p.gun || "port", row = p.row | 0;
  // inside her: the far side's planking in shade, its rail catching the light, ribs
  const nr = nearRail(0), fr = farRail();
  px.part(); px.poly([...fr, ...nr.slice().reverse()], INSIDE, 1, { round: 0.3, ny: 0.1 });
  for (let x = -10; x <= 11; x += 3.5) px.line(...W(x, -6.4 + Math.abs(x) * 0.06), ...W(x, -4.7), WOODD, 1.2, { noLine: true });
  polyline(px, fr, RAIL, 1.5, {});
  drawRower(px, row);
  const muzzle = drawGunner(px, K, gun, row);
  // her near side: the hull below the rail, wet-dark under the water, a lapped seam, a cream strake, a pale rail
  const hull = [...nr, ...quad([15, -5.9], [13.4, 1.6], [8, 3.1], 6).map(([x, y]) => W(x, y)).slice(1), ...[[-9, 3.1]].map(([x, y]) => W(x, y)), ...quad([-9, 3.1], [-13.1, 2.7], [-13.7, 0.4], 5).map(([x, y]) => W(x, y)).slice(1)];
  px.part(); const hid = px._pid;
  px.poly(hull, WOOD, 12, { round: 0.4, ny: -0.1, cast: 1 });
  polyline(px, nearRail(1.15), STRAKE, 12.1, { noLine: true });
  polyline(px, nearRail(3.2).filter((_, i) => i > 0 && i < 12), WOODD, 12.1, { noLine: true });
  px.toneLine(-28, 5, 14, 6, 1, hid);
  polyline(px, nearRail(0.1), RAIL, 12.2, {});
  // the bow lantern on its crook
  px.part();
  px.line(...W(12.2, -4.9), ...W(12.2, -10.6), IRON, 13, { noLine: true }); px.line(...W(12.2, -10.6), ...W(13.6, -10.6), IRON, 13, { noLine: true });
  px.rect(...W(12.6, -10.2), 4.4, 6.4, IRON, 13.1); px.rect(...W(13.0, -9.6), 2.8, 4, LAMP, 13.2, { noLine: true });
  return { marks: { muzzle }, light: null };
};

// ---- the clips: the gun pose names the clip; frame = the oarsman's row (4 = at rest) ----
const clipOf = (gun, loop = false) => ({ n: 5, ms: 1050, loop, lag: 0.05, pose: (ph) => ({ gun, row: Math.round(ph * 4) }) });
export const CLIPS = {
  kick: clipOf("kick"), recoil: clipOf("recoil"), port: clipOf("port"), ramA: clipOf("ramA"), ramB: clipOf("ramB"), raise: clipOf("raise"), aim: clipOf("aim"),
  // the Pix loop: the gun at the port, the oars working (the engine never asks the walk by phase)
  walk: { n: 4, ms: 1050, loop: true, lag: 0.05, pose: (ph) => ({ gun: "port", row: Math.floor(ph * 4) % 4 }) },
  idle: { n: 1, ms: 1000, loop: true, lag: 0.05, pose: () => ({ gun: "port", row: 4 }) },
};
