// ============ CONCEPT FIGURES: the Aegis Magister seen from the FRONT and from BEHIND ============
// The same figure as fig-magister.js (black-iron robe lined in oxblood, steel gorget, brass-edged
// pauldron on the near shoulder, tall oxblood hood over a grey-bearded face, the caged pale-blue
// ward crystal on his staff) drawn walking toward the camera (FRONT) and away from it (BACK), in the
// pattern of fig-goblin-views.js. One drawer serves both: s = +1 front, -1 back. His RIGHT arm (the
// side's near arm, open hand, pauldron) is on screen LEFT in front and screen RIGHT behind (`rs`);
// the staff rides his LEFT fist (the side's far arm). Unflipped; one sun upper left.
// The walk is the side clip's own (same n, ms, pose); feet, bob, arm swing and the staff's lift are
// read from the solved pose. Forward is DOWN the screen in FRONT and UP in BACK, foreshortened.
// The staff's crystal glows a little on the march, as in the side walk (its light comes back).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-magister.js";

const ROBE = mat("#2e3038", { contrast: 0.95, floor: 1 }), OX = mat("#7a2a2c", { contrast: 1.1 }), OXD = mat("#561c20", { floor: 1 }), HOOD = mat("#7a2a2c", { contrast: 1.1 });
const SKIN = mat("#d8a888"), BEARD = mat("#8c96ac"), WOOD = mat("#34363f"), BRASS = mat("#c8a040", { contrast: 1.2 }), IRON = mat("#6c7280", { contrast: 1.25 });
const STEEL = mat("#9aa0ae", { contrast: 1.3 }), BOOT = mat("#202228", { floor: 1 });
const VOID = flat("#17141a"), SOCK = flat("#2a1c22"), EYE = flat("#c8e0ff", { emis: true });
const WARD = flat("#7aa8e0", { emis: true, line: "#2f4f7c" }), CORE = flat("#e4f2ff", { emis: true });

const LEG = {
  C: { m: HOOD }, c: { m: HOOD, bias: -1 }, K: { m: HOOD, bias: 1 }, k: { m: HOOD, bias: -2 }, I: { m: VOID },
  d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, H: { m: SKIN, fix: 3 }, N: { m: SKIN, fix: 3 },
  e: { m: SOCK }, E: { m: EYE }, m: { m: VOID }, B: { m: BEARD }, b: { m: BEARD, bias: -1 },
};
// FRONT: the tall hood frames the face, the dark of its inside (I) round a stern brow (d), pale eyes
// (E) in sockets (e), a long nose (N) and the grey beard (B) forking down onto the gorget. 15 wide, centre col 7.
const FRONT_H = [
  "......CCC......",
  "....CCCCCCC....",
  "...CCCCCCCCC...",
  "..CCCKKKKKCCC..",
  ".CCKKIIIIIKKCc.",
  ".CCKIdddddIKCc.",
  ".CCKIeEdEeIKCc.",
  ".CCKIsSNSsIKCc.",
  ".CCKIdSHSdIKCc.",
  ".CCKIBBBBBIKCc.",
  ".cCKIBBmBBIKCc.",
  ".cCCKIBBBBBIKCc".replace(/^(.{14})$/, "$1."),
  "..cCCKBBBBBKCc.",
  "...cCCBBBBBCc..",
  ".....cBBbBBc...",
];
// BACK: the back of the hood, a dark seam down it, folds, the nape where the hood gathers; no face.
const BACK_H = [
  "......CCC......",
  "....CCCCCCC....",
  "...CCCCCCCCC...",
  "..CCCCCCkCCCC..",
  ".CCCCCCCkCCCCc.",
  ".CCKCCCCkCCCCc.",
  ".CKCCCCCkCCCCc.",
  ".CKCCCCCkCCCCc.",
  ".CCCCCCCkCCCCc.",
  ".CCCCCCCkCCCcc.",
  ".cCCCCCCkCCCcc.",
  "..cCCCCCkCCcc..",
  "...cCCCCkCcc...",
  "....ccCCkCc....",
  ".....ccCCcc....",
];

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F) => {
  const rs = -s, ls = s, { sk, ph } = F, { p, P, C, N } = sk;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const vx = cl((sx - sx1) * 1.4, -2, 2), vx2 = cl((sx1 - sx2) * 1.4, -2, 2), vy = cl(C[1] - F.lag1.C[1], -2, 2);
  const hipY = P[1], chY = C[1], shY = chY + 0.9, hy = Math.round(N[1]), hx = Math.round(sx * 0.7);
  const g = p.glow || 0, lift = p.lift || 0;

  // ---- the staff in his LEFT fist (screen side ls): shaft to the ground (raised a little as it swings), caged crystal on top
  const stx = sx + ls * 8.6, foot = -lift * 0.7 + 0.2 + s * 0.6, tipY = foot - 58;
  px.part();
  px.capsule(stx, foot, 0.95, stx, tipY, 0.95, WOOD, 5.6, { edge: true });
  px.capsule(stx, foot, 1.2, stx, foot - 2.4, 1.2, IRON, 5.62);
  px.part();
  px.capsule(stx, tipY + 2.4, 1.4, stx, tipY + 0.4, 1.7, BRASS, 5.62);                    // the collar
  const cs = 1.35, cy = tipY - (8.4 * cs + 1);
  px.part();
  for (const d of [-1, 1]) { px.line(stx + d * 3.4, tipY, stx + d * 4.6, tipY - 6, IRON, 5.6); px.line(stx + d * 4.6, tipY - 6, stx + d * 3.4, tipY - 15, IRON, 5.6); }
  px.ellipse(stx, tipY - 16, 1.6, 1.3, BRASS, 5.62, { cast: 1 });
  px.part();
  const pip = [[-2.6, -3.2], [2.6, -3.2], [2.6, 0.2], [0, 3.6], [-2.6, 0.2]];
  px.poly(pip.map(([a, b]) => [stx + a * cs * 1.1, cy + b * cs * 1.15]), WARD, 5.7, {});
  px.poly([[-1.1, -1.4], [1.1, -1.4], [1.1, 0.4], [0, 1.6], [-1.1, 0.4]].map(([a, b]) => [stx + a * cs * 1.1 + 0.3, cy + b * cs * 1.15 + 0.2]), CORE, 5.71);

  // ---- boots under the hem: the foot that comes toward us (front) or away (back) shows below it
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]], fy = [0, 0];
  feet.forEach(([f, side, z], i) => {
    const bx = hx + side * 3.3, by = -1.2 + s * f[0] * FWD - f[1] * 0.8; fy[i] = f[1];
    px.part(); px.ellipse(bx, by + 1.2, s > 0 ? 3 : 2.6, 1.9, BOOT, z, { fix: 1 });
  });

  // ---- the robe: narrow shoulders to a hem that flares, lifted by the foot stepping under it
  const top = chY - 2.4, hem = -0.6, hl = hem - fy[0] * 0.3, hr = hem - fy[1] * 0.3, fl = -vx * 0.9 - vx2 * 0.6;
  px.part(); const rid = px._pid;
  px.poly([[sx - 5.6, top], [sx + 5.6, top], [sx + 6.4, chY + 3], [hx + 5.6, hipY - 2], [hx + 8 + fl, hr * (ls > 0 ? 1 : 1)], [hx - 8 + fl, hl], [hx - 5.6, hipY - 2], [sx - 6.4, chY + 3]], ROBE, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(hx - 3.2, hipY + 3, hx - 5.4 + fl, hem - 5, -1, rid);
  px.toneLine(hx + 3.4, hipY + 3, hx + 5.6 + fl, hem - 5, 1, rid);
  px.part();
  if (s > 0) {
    px.poly([[hx - 1.3, hipY - 1.4], [hx + 1.3, hipY - 1.4], [hx + 3.6 + fl * 0.6, hem - 0.4], [hx - 3.6 + fl * 0.6, hem - 0.4]], OX, 4.03, { round: 0.8 });   // the front slit's oxblood lining
  } else {
    px.toneLine(hx, hipY, hx + fl * 0.6, hem - 3, -1, rid);                                                  // the back seam
    px.line(hx - 7.6 + fl, hem - 1, hx + 7.6 + fl, hem - 1, OX, 4.03, { noLine: true });                    // the lining's hem peeping
  }
  px.part();
  px.poly([[hx - 5.8, hipY - 3.6], [hx + 5.8, hipY - 3.6], [hx + 5.8, hipY - 1.9], [hx - 5.8, hipY - 1.9]], IRON, 4.05, { round: 0.94, bias: -1 });
  if (s > 0) px.rect(hx - 1.2, hipY - 3.6, 2.4, 1.8, BRASS, 4.06, { fix: 3 });
  else px.poly([[hx + 1, hipY - 1.9], [hx + 3, hipY - 1.9], [hx + 3.4 + fl * 0.4, hipY + 6], [hx + 1.2 + fl * 0.4, hipY + 6]], IRON, 4.04, { bias: -1 });   // the belt's tail
  // the gorget: a steel collar over the shoulders, brass at its lower edge; the rank brooch on his breast
  px.part();
  px.poly([[sx - 6.8, chY - 3.2], [sx + 6.8, chY - 3.2], [sx + 7.4, chY + 1], [sx + 2.4, chY + (s > 0 ? 3.2 : 2.4)], [sx - 2.4, chY + (s > 0 ? 3.2 : 2.4)], [sx - 7.4, chY + 1]], STEEL, 5, { round: 0.9, cast: 1 });
  px.line(sx - 7, chY + 1.4, sx + 7, chY + 1.4, BRASS, 5.05, { noLine: true });
  if (s > 0) { px.part(); px.rect(sx - 1, chY + 3.8, 2, 2, BRASS, 4.3, { fix: 3 }); }

  // ---- the arms. Hands rise and fall a little as the arms swing (forward is toward us in front).
  const angN = p.aN[0], angF = p.aF[0];
  const arm = (side, hy0, cuffM, z, tone, hold) => {
    const sh = [sx + side * 6, shY], el = [sx + side * 7.7, shY + 5.2], hand = [sx + side * (hold ? 8.4 : 7.6), hy0], wr = [hand[0], hand[1] - 2.2];
    px.part();
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.3, ROBE, z, { cast: 2, floor: 1, bias: tone });
    px.capsule(el[0], el[1], 2.3, wr[0], wr[1], 3, ROBE, z, { cast: 2, floor: 1, bias: tone });
    px.poly([[wr[0] - 3.2, wr[1] - 0.6], [wr[0] + 3.2, wr[1] - 0.6], [wr[0] + 3.2, wr[1] + 1.4], [wr[0] - 3.2, wr[1] + 1.4]], cuffM, z + 0.02, { bias: 1 });
    px.part(); px.ellipse(hand[0], hand[1] + 0.8, 1.9, hold ? 2.1 : 1.8, SKIN, z + 0.3, { cast: 1 });
  };
  arm(ls, shY + 10.4 + s * (angF - 0.9) * 7, OXD, 8.5, -1, true);
  arm(rs, shY + 11.6 + s * (angN - 0.36) * 8, OX, 8.6, 0, false);
  // the pauldron: a steel cap on the near (his right) shoulder, brass-edged
  px.part();
  px.ellipse(sx + rs * 6.8, shY - 0.4, 4.4, 3.8, STEEL, 8.7, { cast: 1 });
  px.line(sx + rs * 6.8 - 4, shY + 1.8, sx + rs * 6.8 + 4, shY + 1.8, BRASS, 8.72, { noLine: true });

  // ---- the hood's peak: a nub over the crown in front (tipping to screen right); behind, it hangs down his back
  const bend = cl(vx * 2.2 + vx2 * 1.6 + (p.sway || 0) * 0.6, -2.4, 2.4), dr = cl(-vy * 1.3, -1.2, 1.8);
  px.part();
  if (s > 0) px.poly([[hx - 3, hy - 11], [hx + 3, hy - 11], [hx + 2.4 + bend * 0.3, hy - 15 + dr * 0.3], [hx + 6.4 + bend, hy - 17.6 + dr], [hx + 0.6 + bend * 0.4, hy - 16 + dr * 0.5], [hx - 2, hy - 13.4]], HOOD, 7.9, { round: 0.9, ny: -0.2 });
  else px.poly([[hx - 2.4, hy - 6], [hx + 2.4, hy - 6], [hx + 3 - bend * 0.3, hy + 2], [hx + 2.4 - bend, hy + 9 - dr * 0.4], [hx + 0.2 - bend * 1.1, hy + 11.4], [hx - 2.4 - bend * 0.8, hy + 8.4], [hx - 3, hy + 2]], HOOD, 8.2, { round: 0.85, ny: -0.2, cast: 1 });
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, LEG, 8, { ax: 7, ay: 13, ball: [7, 7.5, 7.5, 8.5], cast: 1 });
  const k = cl(g, 0, 1.4);
  return { light: k > 0.05 ? { x: stx, y: cy, r: 20 + 26 * cl(k, 0, 1), col: "#9ab6d8", k: k * 0.4 } : null };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "magister-front", BOX: { w: 56, h: 102, ox: 28, oy: 93 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "magister-back", BOX: { w: 56, h: 102, ox: 28, oy: 93 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
