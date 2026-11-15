// ============ FIGURE: the Siege Ram (game type `ram`) ============
// The Iron Kingdom's battering engine: a long ram-shed on six spoked wheels (three a side), a
// roof of wet oxblood hides lashed down with rope and plated at the front in riveted iron lames,
// the grey tower of the Kingdom painted on its slope, a dagged hide skirt, an iron-capped ridge
// and a pennant at the back. Out of the front, past a post, an oak log banded in iron carries
// a cast-iron ram's head with a curled horn and a battered striking brow. Under the skirt the
// crew's legs strain, bent to the push. A machine: slow and heavy; the shed rocks a little at
// each stride, the wheels turn in step with the road. About 92 px long, 60 tall with the pennant.
// Clips: idle (halted: the crew shifting, the ram nodding in its slings, the pennant stirring),
// walk (its roll: 8 frames, the wheels turning as the crew's legs plant and push), attack (the
// ram swung back on its slings, the whole shed settling back, then driven forward with a lurch
// and a puff of dust; `hit` is the head landing).
// No skeleton: the machine poses itself (the biped bones are unused).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, ik } from "./rig.js";

const OAK = mat("#6a4a2e"), OAKL = mat("#8a6238"), HIDE = mat("#7a2a2c", { contrast: 1.1 }), HIDE2 = mat("#561c20"), STEEL = mat("#8a90a0", { contrast: 1.3 });
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), CAST = mat("#4a4e5a", { contrast: 1.3 }), BRASS = mat("#c8a040", { contrast: 1.2 });
const GREY = mat("#8e94a2", { contrast: 1.2 }), ROPE = mat("#a88858"), HOSE = mat("#521a1e", { floor: 1 }), BOOT = mat("#3a2a20", { floor: 1 });
const UNDER = flat("#2c2234"), EYEB = flat("#e8b84a", { emis: true }), DUST = flat("#cdb894", { line: "#a89674" }), DUST2 = flat("#b09c7c", { line: "#8a7a5c" });
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" });

export const BOX = { w: 120, h: 76, ox: 56, oy: 68 };
export const BONES = HUMAN;                // unused: the machine poses itself

const TAU = Math.PI * 2;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the geometry, art px from the ground under the shed's middle ----
const WX = [-22, 1.5, 25];                 // the wheels' axles
const WR = 7.4, WY = -7.6;                 // their radius and height
const TOP = -44, EAVE = -25, FX0 = 20, FX1 = 37.5, BX0 = -31, BX1 = -45.5;   // the roof: ridge, eave, its hips
const xe = (y) => FX0 + ((y - TOP) / (EAVE - TOP)) * (FX1 - FX0);

// a spoked wheel: an iron tyre, a plank disc, six spokes turning with `roll`, hobnails round the rim
const wheel = (px, x, y, roll, z, dim) => {
  px.part();
  px.ellipse(x, y, WR, WR, IRON, z, { round: 0.6, bias: dim ? -1 : 0, cast: 1 });
  px.ellipse(x, y, WR - 1.5, WR - 1.5, OAK, z + 0.01, { round: 0.35, bias: dim ? -1 : 0, cast: 0 });
  for (let i = 0; i < 6; i++) {
    const a = roll + (i * TAU) / 6;
    px.capsule(x, y, 1.1, x + Math.cos(a) * (WR - 1.8), y + Math.sin(a) * (WR - 1.8), 0.85, OAKL, z + 0.02, { bias: dim ? -1 : 0, cast: 0 });
  }
  px.ellipse(x, y, 1.9, 1.9, IRON, z + 0.04, { bias: dim ? -1 : 0, cast: 0 });
  px.dot(x - 0.4, y - 0.4, dim ? IRON : BRASS, z + 0.05, { fix: dim ? 2 : 3 });
  for (let i = 0; i < 8; i++) { const a = roll * 0.9 + 0.2 + (i * TAU) / 8; px.dot(x + Math.cos(a) * (WR - 0.7), y + Math.sin(a) * (WR - 0.7), IRON, z + 0.03, { fix: dim ? 2 : 4, noLine: true }); }
};

// one of the crew's two legs, bent to the push: the hip under the wall, the foot on the ground
const crewLeg = (px, hx, foot, z, bias) => {
  const hip = [hx, -12.4], lg = ik(hip[0], hip[1], foot[0], foot[1] - 1.2, 6.8, 6.4, -1);
  px.part();
  px.limb([hip, lg.mid, lg.end], [2.8, 2.25, 1.8], HOSE, z, { bias, floor: 1 });
  px.line(lg.mid[0] - 1.6, lg.mid[1] + 3, lg.mid[0] + 1.8, lg.mid[1] + 3.2, BRASS, z + 0.02, { bias, fix: 2 });   // a garter
  px.capsule(lg.end[0] - 0.4, lg.end[1] + 0.4, 2, lg.end[0] + 3.4, foot[1] - 0.8, 1.5, BOOT, z + 0.03, { bias, floor: 1 });
};

export const draw = (px, F, o = {}) => {
  const { sk, lag1, lag2 } = F, p = sk.p, p1 = lag1.p, p2 = lag2.p;
  const bob = p.bob ?? 0, sw = p.sw ?? 0, roll = p.roll ?? 0, by = Math.round(bob * 2) / 2;
  const tail = cl((p1.sw ?? 0) * 0.5 + (p2.sw ?? 0) * 0.5, -9, 9);       // what hangs on the shed lags it a beat

  // the dark under the shed
  px.part();
  px.poly([[BX1 + 2, EAVE + 1], [FX1 - 1, EAVE + 1], [FX1 - 1, -2.4], [BX1 + 2, -2.4]], UNDER, 0.4, { noLine: true });

  // the far wheels, a tone down, set a little ahead and up
  for (const x of WX) wheel(px, x + 2.4, WY - 1.2, roll, 1, true);

  // the crew: three men, their legs planted and pushing (far leg a tone down)
  for (const [x, c] of [[-26, p.c ?? 0], [-4, (p.c ?? 0) + 0.34], [14, (p.c ?? 0) + 0.67]]) {
    for (const [side, bias, z] of [[0, 0, 3], [0.5, -1, 2]]) {
      const q = (((c + side) % 1) + 1) % 1, st = p.step ?? 1;
      const planted = q < 0.5, u = planted ? q / 0.5 : (q - 0.5) / 0.5;
      const off = (planted ? 5 * (1 - 2 * u) : -5 + 10 * (u * u * (3 - 2 * u))) * st;
      const fx = x - 3.4 + off + (p.shove ?? 0) * 0.3 - (p.set ?? 0) * 0.4;
      const fy = planted ? 0 : -2.6 * Math.sin(Math.PI * u) * Math.min(1, st * 4);
      crewLeg(px, x + side * 1.6, [fx + side * 2, fy], z, bias);
    }
  }

  // ---- the shed and ram ride the bob
  const Y = by, X = Math.round(sw * 0.3);
  // the plank wall under the eaves, a dark sill at its foot
  px.part(); const wall = px._pid;
  px.poly([[BX1 + 3 + X, -26 + Y], [FX1 - 2 + X, -26 + Y], [FX1 - 2 + X, -15.6 + Y], [BX1 + 3 + X, -15.6 + Y]], OAK, 3.2, { round: 0.2, cast: 1 });
  for (let x = BX1 + 6; x < FX1 - 3; x += 9.2) px.toneLine(x + X, -26 + Y, x + X, -16.4 + Y, -1, wall);
  px.line(BX1 + 3 + X, -16.4 + Y, FX1 - 2 + X, -16.4 + Y, IRONK, 3.25, { fix: 1, noLine: true });
  for (const x of [-26, 4]) { px.rect(x + X, -24.2 + Y, 2, 6, IRON, 3.3, { fix: 2 }); px.dot(x + 0.6 + X, -22 + Y, STEEL, 3.32, { fix: 4, noLine: true }); }

  // ---- the ram: a banded oak log slung under the roof, a cast head on its end
  const rx = sw, ry = -20.6 + Y + (p.nod ?? 0);
  const X0 = 22 + X, XE = 38 + rx;
  px.part(); const log = px._pid;
  px.capsule(X0, ry, 3.9, XE, ry, 3.9, OAK, 4, { cast: 1 });
  px.toneLine(X0, ry - 2.2, XE, ry - 2.2, 1, log);
  for (let x = XE - 3; x > X0 + 2; x -= 5) { px.part(); px.rect(x, ry - 4, 1.6, 8, IRON, 4.1, { fix: 2 }); px.dot(x + 0.4, ry - 3, STEEL, 4.12, { fix: 4, noLine: true }); }
  // the cast head: a long ram's face ending in a battered striking brow
  const hx = XE - 1.5;
  px.part(); const head = px._pid;
  px.poly([[hx, ry - 5.4], [hx + 5, ry - 6], [hx + 10, ry - 5], [hx + 14.6, ry - 2.6], [hx + 17, ry + 0.4], [hx + 17.6, ry + 3.2], [hx + 14.6, ry + 4.8], [hx + 9, ry + 5.4], [hx + 2, ry + 5.8], [hx - 1.4, ry + 5.2]], CAST, 4.4, { round: 0.7, cast: 1 });
  px.poly([[hx + 12, ry - 4], [hx + 17.6, ry + 0.2], [hx + 17.6, ry + 4.4], [hx + 14.6, ry + 2.4]], IRON, 4.5, { fix: 3 });   // the battered face
  px.line(hx + 8, ry - 4.2, hx + 12, ry - 4.2, IRONK, 4.52, { fix: 0, noLine: true });                                       // the brow
  px.rect(hx + 8.4, ry - 3, 2.4, 2, EYEB, 4.6, { noLine: true }); px.dot(hx + 10.4, ry - 3, IRONK, 4.62, { noLine: true });   // a brass eye
  px.dot(hx + 15.8, ry + 1.6, IRONK, 4.6, { noLine: true });                                                                  // a nostril
  px.line(hx + 10, ry + 4.4, hx + 16, ry + 3.8, IRONK, 4.55, { fix: 0, noLine: true });
  // the curled horn round the ear, its point hooking forward under the jaw
  px.part();
  for (let i = 0; i < 9; i++) {
    const a0 = -3 + i * 0.5, a1 = a0 + 0.5, r0 = 4.4 - i * 0.12, r1 = 4.4 - (i + 1) * 0.12, cx = hx + 4, cy = ry - 0.4;
    px.capsule(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, 1.9 - i * 0.08, cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, 1.8 - i * 0.08, STEEL, 4.7, { cast: 1 });
  }
  px.part();
  px.rect(hx - 2.6, ry - 5.6, 3, 11.6, BRASS, 4.75, { fix: 3 });   // the collar
  void head;

  // the front post the ram runs out past
  px.part(); const post = px._pid;
  px.poly([[FX1 - 4 + X, -28 + Y], [FX1 - 0.6 + X, -28 + Y], [FX1 - 0.6 + X, -14 + Y], [FX1 - 4 + X, -14 + Y]], OAK, 5, { round: 0.5, cast: 1 });
  px.rect(FX1 - 4 + X, -28 + Y, 3.4, 2, IRON, 5.1, { fix: 2 }); px.rect(FX1 - 4 + X, -17.4 + Y, 3.4, 2, IRON, 5.1, { fix: 2 });
  void post;

  // ---- the roof, hipped: the south slope toward us, wet hides lashed down
  px.part(); const roof = px._pid;
  px.poly([[BX0 + X, TOP + Y], [FX0 + X, TOP + Y], [FX1 + X, EAVE + Y], [BX1 + X, EAVE + Y]], HIDE, 6, { n: [-0.12, -0.4, 0.9], cast: 2 });
  // hide seams, stitched, and a sunlit sheen where it is wet
  for (const x of [-22, -9]) {
    px.toneLine(x + 1 + X, TOP + 1 + Y, x - 3 + X, EAVE - 0.6 + Y, -1, roof);
    for (let y = TOP + 3; y < EAVE - 2; y += 3.4) px.dot(x - 0.2 - (y - TOP) * 0.2 + X, y + Y, HIDE, 6.02, { fix: 3, noLine: true });
  }
  px.toneLine(-39 + X, -33.6 + Y, 14 + X, -33.6 + Y, -1, roof);
  px.line(BX0 + 2 + X, TOP + 1.6 + Y, FX0 - 3 + X, TOP + 1.6 + Y, HIDE, 6.05, { fix: 4, noLine: true });
  // rope lashings down the slope
  for (const x of [-34, -21, -7]) px.line(x + 5 + X, TOP + Y, x - 3 + X, EAVE - 0.6 + Y, ROPE, 6.1, { fix: 3, noLine: true });
  // the grey tower of the Kingdom, painted on the hide
  px.part();
  const tx = -16 + X, ty = -35.4 + Y;
  px.rect(tx - 3.4, ty - 1, 6.8, 9, GREY, 6.2, { fix: 3 });
  for (const dx of [-3.4, -0.9, 1.6]) px.rect(tx + dx, ty - 3, 1.8, 2.6, GREY, 6.2, { fix: 3 });
  px.rect(tx - 1, ty + 4, 2, 4, HIDE2, 6.22, { noLine: true });
  // iron lames over the front, lapped downward, riveted
  for (let r = 0; r < 3; r++) {
    const y0 = TOP - 0.4 + r * 6.2 + Y, y1 = y0 + 7, l0 = xe(y0 - Y) - 18 + r * 1 + X, l1 = xe(y1 - Y) - 18 + r * 1 + X;
    px.part(); const lm = px._pid;
    px.poly([[l0, y0], [xe(y0 - Y) + 1 + X, y0], [xe(y1 - Y) + 1 + X, y1], [l1, y1]], IRON, 6.3 + r * 0.01, { round: 0.4, cast: 1 });
    px.line(l1, y1 - 0.4, xe(y1 - Y) + 1 + X, y1 - 0.4, IRONK, 6.34 + r * 0.01, { fix: 0, noLine: true });
    px.line(l0 + 1, y0 + 0.4, xe(y0 - Y) + X, y0 + 0.4, STEEL, 6.36 + r * 0.01, { fix: 4, noLine: true });
    for (let x = l0 + 2.4; x < xe(y0 - Y) + X - 1; x += 3.8) px.dot(x + (r % 2 ? 1.4 : 0), y0 + 2.4, STEEL, 6.38 + r * 0.01, { fix: 4, noLine: true });
    void lm;
  }
  px.line(BX1 + X, EAVE - 0.4 + Y, FX1 + 1 + X, EAVE - 0.4 + Y, HIDE2, 6.4, { fix: 0, noLine: true });
  // the ridge, capped in iron, rivets along it
  px.part();
  px.capsule(BX0 - 0.4 + X, TOP - 0.2 + Y, 1.5, FX0 + 0.6 + X, TOP - 0.2 + Y, 1.5, IRON, 6.5, { cast: 1 });
  for (let x = BX0 + 3; x < FX0; x += 6) px.dot(x + X, TOP - 0.8 + Y, STEEL, 6.52, { fix: 4, noLine: true });
  // the hide skirt hanging off the eave, dagged
  px.part(); const sk2 = px._pid;
  const sp = [[BX1 - 0.4 + X, EAVE - 1 + Y], [FX1 + 0.6 + X, EAVE - 1 + Y]];
  for (let x = FX1 + 0.6; x > BX1 + 1; x -= 4.2) sp.push([x + X, EAVE + 5 + Y + (Math.round(x) % 3) * 0.5], [x - 2.1 + X, EAVE + 2.8 + Y]);
  px.poly(sp, HIDE, 6.6, { n: [-0.1, 0.1, 0.95], cast: 2 });
  px.toneLine(BX1 + X, EAVE + 1.4 + Y, FX1 + X, EAVE + 1.4 + Y, -1, sk2);
  for (let x = BX1 + 5; x < FX1 - 2; x += 8.4) px.dot(x + X, EAVE + 0.8 + Y, BRASS, 6.62, { fix: 3, noLine: true });

  // the pennant at the back, the tower on oxblood, streaming a beat late
  const fl = (p.flag ?? 0), pol = [BX0 + 8 + X, TOP + Y];
  px.part();
  px.capsule(pol[0], pol[1], 0.9, pol[0], pol[1] - 15, 0.8, OAK, 6.6, { cast: 1 });
  px.dot(pol[0], pol[1] - 16, BRASS, 6.62, { fix: 3 });
  px.part(); const fid = px._pid;
  const f0 = [pol[0] - 0.4, pol[1] - 14.4], dr = cl(-tail * 0.3, -2, 2);
  px.poly([f0, [f0[0] - 6 + dr * 0.4, f0[1] - 0.4 + fl * 0.6], [f0[0] - 13 + dr, f0[1] + 1.2 + fl * 1.8], [f0[0] - 9 + dr * 0.8, f0[1] + 3 + fl], [f0[0] - 12 + dr, f0[1] + 5.4 + fl * 1.6], [f0[0] - 6 + dr * 0.4, f0[1] + 5.4 + fl * 0.6], [f0[0] - 0.4, f0[1] + 6]], HIDE, 6.7, { round: 0.5, cast: 1 });
  px.toneLine(f0[0] - 1, f0[1] + 1, f0[0] - 10 + dr, f0[1] + 4.2 + fl * 1.2, -1, fid);
  px.rect(f0[0] - 6 + dr * 0.4, f0[1] + 1.6 + fl * 0.5, 2.4, 2.8, GREY, 6.74, { fix: 3 });

  // the near wheels, turning, in front of it all
  for (const x of WX) wheel(px, x, WY, roll, 8, false);
  return { head: [hx + 17.6, ry + 1.4], rx };
};

// the dust kicked up under the wheels as the shed lurches, and a white flash where the head lands
export const fx = (px, F, info, clip) => {
  const p = F.sk.p;
  if (clip === "attack" && (p.puff ?? 0) > 0.05) {
    const u = p.puff;
    for (const [dx, dy, r, m] of [[2, 0, 3 + u * 2, DUST], [-3, -3, 2.4 + u * 2.4, DUST2], [5, -5, 1.6 + u * 2, DUST2]]) px.ellipse(info.head[0] + dx + (1 - u) * 3, info.head[1] + 2 + dy - (1 - u) * 5, r, r * 0.8, m, 20, { noLine: true });
  }
  if (clip === "attack" && (p.flash ?? 0) > 0.5) {
    const [x, y] = info.head;
    px.poly([[x + 1, y - 1], [x + 6, y - 7], [x + 3, y], [x + 8, y + 1], [x + 3, y + 2], [x + 5, y + 7], [x + 1, y + 2]], SMEAR, 20.1, { noLine: true });
  }
};

// ---- poses ------------------------------------------------------------------------------------
const REST = { bob: 0, sw: 0, roll: 0, c: 0, step: 1, flag: 0, nod: 0, shove: 0, set: 0, puff: 0, flash: 0 };
const AREST = { ...REST, step: 0 };
export const CLIPS = {
  // halted: the crew shifting their weight (the legs barely move), the ram nodding in its slings, the pennant stirring
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * TAU), s2 = Math.sin(ph * TAU - 1);
      return { ...REST, c: 0.1 + 0.06 * s, step: 0.1, bob: 0.4 * (0.5 + 0.5 * s2) * 0, sw: 0.6 * s2, nod: 0.5 * s, flag: s2 };
    },
  },
  // the roll: 8 frames, each wheel turning as the road passes; the shed rises at each push, the ram sways in its slings
  walk: {
    n: 8, ms: 640, loop: true, lag: 0.09,
    pose: (ph) => ({ ...REST, roll: ph * 4.7, c: ph, step: 1, bob: -0.9 * (0.5 - 0.5 * Math.cos(ph * TAU * 2)), sw: 1.2 * Math.sin(ph * TAU * 2 - 0.4),
      nod: 0.35 * Math.sin(ph * TAU * 2), flag: Math.sin(ph * TAU * 2 - 0.8) }),
  },
  // the ram hauled back on its slings (the crew set their heels), then driven home with the shed's lurch
  attack: {
    n: 12, ms: 1100, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => sampleKeys([
      { t: 0, p: AREST },
      { t: 0.3, e: "io", p: { ...REST, step: 0, sw: -7, set: 1.6, bob: 0.6, nod: -0.8, flag: -0.6, shove: -2 } },
      { t: 0.42, e: "io", p: { ...REST, step: 0, sw: -8.2, set: 2, bob: 0.9, nod: -1, flag: -0.8, shove: -2.6 } },
      // the drive: the whole shed lurches forward on the ram, the head lands and the dust jumps
      { t: 0.5, e: "in3", p: { ...REST, step: 0, sw: 9.4, set: -1, bob: -1.2, nod: 0.4, flag: 1.2, shove: 3.6, puff: 0.3, flash: 1 } },
      { t: 0.58, e: "out", p: { ...REST, step: 0, sw: 8.2, set: -1, bob: -0.6, nod: 0.2, flag: 0.8, shove: 3, puff: 1, flash: 0 } },
      { t: 0.8, e: "io", p: { ...REST, step: 0, sw: 3, set: 0, bob: 0, nod: 0, flag: 0.2, shove: 0.8, puff: 0.5 } },
      { t: 1, e: "io", p: AREST },
    ], ph),
  },
};
