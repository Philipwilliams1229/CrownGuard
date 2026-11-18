// ============ VIEWS: the Rime Skald seen from the FRONT and from BEHIND ============
// fig-skald.js (sea-teal cloak with an ochre border, the great fur collar, forked beard hung with brass
// rings, the woven ochre brow band and raven plume, a frame drum on the far arm, the bone-knobbed beater in
// the near fist, a bone war-horn at the back hip) walking toward the camera (FRONT, s = +1) and away from it
// (BACK, s = -1), unmirrored, sun upper left. His RIGHT fist holds the beater (screen LEFT in front, RIGHT
// behind) and rises and falls with the side walk's own drum beat; the drum is on his LEFT arm, seen nearly edge-on.
// The walk reads the side clip's pose (same n, ms): feet, bob and the beater from the solved pose.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-skald.js";

const SKIN = mat("#e2b48c"), TEAL = mat("#2f5866"), OCHRE = mat("#d0943a"), TUNIC = mat("#7a6248"), TUNIC_L = mat("#8c8468"), WOOL = mat("#4a5a60"), LEATHER = mat("#5a3e2a");
const FURW = mat("#e8e6e0"), HAIR = mat("#b87444"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040"), HIDE = mat("#e8dcc0"), WOOD = mat("#7a5632"), RAVEN = mat("#2a3040", { contrast: 1.2 });
const EYE = flat("#2a1c2c");
const LEG = {
  H: { m: HAIR, fix: 2 }, B: { m: OCHRE, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: HAIR, fix: 1 }, G: { m: BRASS, fix: 3 }, T: { m: TEAL },
};
// FRONT: swept-back hair, the ochre band, level eyes, a moustache over a forked beard hung with brass rings. 13 wide, centre col 6.
const FRONT_H = [
  "....HHHHH....",
  "..HHHHHHHHH..",
  ".HHHHHHHHHHH.",
  ".HBBBBBBBBBH.",
  ".HHSSSSSSSHH.",
  ".HSSESSSESSH.",
  ".HSSESNSESSH.",
  ".HSSSSNSSSSH.",
  ".HRRRRSRRRRH.",
  "..HRRRRRRRH..",
  "..HRRRRRRRH..",
  "..HRGRRRGRH..",
  "...HRRRRRH...",
  "....RR.RR....",
  "....G...G....",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
// BACK: hair swept back and tied with a brass ring, the band round it, a few strands, the nape.
const BACK_H = [
  "....HHHHH....",
  "..HHHHHHHHH..",
  ".HHHHHHHHHHH.",
  ".HBBBBBBBBBH.",
  ".HHHHHHRHHHH.",
  ".HHRHHHHHHHH.",
  ".HHHHHHHHRHH.",
  ".HHHRHHHHHHH.",
  "..HHHHHHHRH..",
  "..HHRHGHHHH..",
  "...HHHRHHH...",
  "....HHRHH....",
  ".....SSS.....",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;

const make = (s) => (px, F) => {
  const rs = -s, ls = s;                                       // screen side of his right (beater) and left (drum)
  const { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 0.8 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chestY = sk.C[1] + 1, hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2);
  const vx = cl((sx - sx1) * 1.3, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 1.3, -2.5, 2.5);
  const c0 = chestY - 3;

  // ---- the raven plume, rising behind the head, tipping out (screen right in front, left behind), a beat late
  {
    const bend = cl(-vx * 1.6 - vx2 * 1.2, -3, 3), d = s > 0 ? 1 : -1;
    const r = [hx - d * 1, hy - 8.8], m = [r[0] + d * 3 + bend * 0.4, r[1] - 6 - vy * 0.2], t = [m[0] + d * 4 + bend * 0.8, m[1] - 3.8 + Math.abs(bend) * 0.3];
    px.part();
    px.capsule(r[0], r[1], 1.3, m[0], m[1], 1.9, RAVEN, 0.6); px.capsule(m[0], m[1], 1.9, t[0], t[1], 0.6, RAVEN, 0.6);
    px.dot(r[0] + d * 1.2, r[1] - 3, BRASS, 0.65, { fix: 3 });
  }

  // ---- the cloak behind him: teal, its ochre border along the hem; the tail swings late
  {
    const c = cl(-vx * 1.4 - vx2 * 1, -3, 3), hem = hipY + 8, w = 10.6;
    px.part(); const cid = px._pid;
    px.poly([[sx - 6, c0 - 0.6], [sx + 6, c0 - 0.6], [sx + 9, c0 + 5], [hx + w + c, hem - 2], [hx + w + 0.6 + c, hem], [hx - w + c, hem], [hx - w - 0.6 + c, hem - 2], [sx - 9, c0 + 5]], TEAL, 0.5, { round: 0.85, cast: 1 });
    px.toneLine(sx - 3, c0 + 4, hx - 5 + c, hem - 1, -1, cid);
    px.toneLine(sx + 4, c0 + 4, hx + 6 + c, hem - 1, -1, cid);
    px.poly([[hx - w - 0.4 + c, hem - 1.6], [hx + w + 0.4 + c, hem - 1.6], [hx + w + 0.6 + c, hem], [hx - w + c, hem]], OCHRE, 0.52, { round: 0.9 });
  }

  // ---- legs: wool trews, leather wraps, fur-topped boots. The stepping foot comes toward us (front) / away (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], b = side === rs ? 0 : -1, fx = hx + side * 3.1, fy = -1.6 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 2.2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.6, (hp[1] + fy) / 2 - lift * 0.4], w0 = [(kn[0] + fx) / 2, (kn[1] + fy) / 2];
    px.part();
    px.capsule(hp[0], hp[1], 2.5, kn[0], kn[1], 2.2, WOOL, z, { bias: b });
    px.capsule(kn[0], kn[1], 2.1, fx, fy, 1.8, WOOL, z, { bias: b });
    px.capsule(w0[0], w0[1], 2.1, fx, fy, 1.9, LEATHER, z + 0.03, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.2, fy + 1.2, 2.2, 1.4, LEATHER, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.9, 1.9, 1.2, LEATHER, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.6, 1.7, 1.9 * cl(lift / 2.4, 0.3, 1), LEATHER, z + 0.45, { bias: -2 });
    }
    px.capsule(w0[0] - 2.2, w0[1] - 0.2, 1.1, w0[0] + 2.2, w0[1] + 0.2, 1.1, FURW, z + 0.05, { bias: b });
  }

  // ---- the war-horn at the back hip: from behind it hangs on his left hip (screen right) by a strap
  if (s < 0) {
    const hxh = hx + 5.6, hyh = hipY - 1.4;
    px.part();
    px.line(hx + 3.4, hipY - 3, hxh - 0.4, hyh + 0.4, LEATHER, 4.2);
    px.capsule(hxh, hyh, 1.7, hxh + 1.2, hyh + 4.2, 2.1, BONE, 4.3, { cast: 1 });
    px.capsule(hxh + 1.2, hyh + 4.2, 2.1, hxh + 0.2, hyh + 7.4, 1.1, BONE, 4.3, { cast: 1 });
    px.dot(hxh + 0.4, hyh + 1.4, BRASS, 4.35, { fix: 3 });
  }

  // ---- the tunic to the knee, a leather belt with a brass buckle, an ochre hem
  const hem = hipY + 4.4, hs = -vx * 0.6 - vx2 * 0.4;
  px.part(); const tid = px._pid;
  px.poly([[sx - 5.4, c0], [sx + 5.4, c0], [sx + 5.8, c0 + 4], [hx + 5.6, hipY - 2.4], [hx + 6.2 + hs, hem], [hx - 6.2 + hs, hem], [hx - 5.6, hipY - 2.4], [sx - 5.8, c0 + 4]], TUNIC, 4, { round: 0.92, ny: -0.1, cast: 1 });
  px.toneLine(hx + 0.4, hipY + 0.2, hx + 0.2 + hs, hem - 0.6, -1, tid);
  px.poly([[hx - 5.6, hipY - 3.2], [hx + 5.6, hipY - 3.2], [hx + 5.7, hipY - 1.2], [hx - 5.6, hipY - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.poly([[hx - 6.2 + hs, hem - 1.6], [hx + 6.2 + hs, hem - 1.6], [hx + 6.2 + hs, hem + 0.2], [hx - 6.2 + hs, hem + 0.2]], OCHRE, 4.05, { round: 0.9 });
  if (s > 0) px.rect(hx - 1.2, hipY - 3, 2.4, 2, BRASS, 4.25, { fix: 3 });
  else px.toneLine(sx, c0 + 2, hx, hipY - 4, -1, tid);
  // the big fur collar
  px.part();
  px.ellipse(sx, c0 + 1.4, 9.6, 4.2, FURW, 4.4, { cast: 1 });
  for (const x of [-8, -5.6, -2.8, 0, 2.8, 5.6, 8]) px.dot(sx + x, c0 + 4.4 + (Math.abs(x) > 6 ? -1 : 0) + ((x * 2) & 1), FURW, 4.4);

  // ---- the drum on his left arm: held across and a little out, seen almost edge-on (a thin hoop, a sliver of hide)
  {
    const sh = [sx + ls * 6.2, c0 + 3], dxc = hx + ls * 8.6, dyc = c0 + 11 - (p.dlift || 0), hd = [dxc - ls * 1.2, dyc + 5.6], el = [sx + ls * 9, (sh[1] + hd[1]) / 2];
    px.part();
    px.capsule(sh[0], sh[1], 2.3, el[0], el[1], 2, TUNIC_L, 7.4, { bias: -1, cast: 1 });
    px.capsule(el[0], el[1], 2, hd[0], hd[1], 1.7, TUNIC_L, 7.4, { bias: -1, cast: 1 });
    px.part(); const did = px._pid;
    const Rr = 6.6;
    px.ellipse(dxc, dyc, 2.6, Rr, WOOD, 7.6, { round: 0.5, cast: 1 });
    px.ellipse(dxc + rs * 0.7, dyc, 1.4, Rr * 0.84, HIDE, 7.62, { round: 0.6 });
    px.toneLine(dxc - 1.4, dyc - Rr * 0.7, dxc - 1.4, dyc + Rr * 0.7, -1, did);
    px.part();
    px.ellipse(hd[0], hd[1], 1.8, 1.9, SKIN, 7.8, { bias: -1 });
  }

  // ---- the near arm (his right): a sleeve and a leather cuff, the beater held up in the fist, falling on the beat
  {
    const lift = cl((p.aN[0] - 1.0) * 8, 0, 4), sh = [sx + rs * 7, c0 + 3], hd = [sx + rs * 8.6, hipY - 1 - lift + s * 0.6], el = [sx + rs * 9.2, (sh[1] + hd[1]) / 2 - 0.4];
    px.part(); px.tag("nearArm");
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.2, TUNIC_L, 7.9, { cast: 1 });
    px.capsule(el[0], el[1], 2.2, hd[0], hd[1], 1.9, TUNIC_L, 7.9, { cast: 1 });
    const c1 = [(el[0] + hd[0] * 2) / 3, (el[1] + hd[1] * 2) / 3];
    px.capsule(c1[0], c1[1], 2, hd[0], hd[1], 1.9, LEATHER, 7.95, { cast: 1 });
    px.tag(null);
    px.part(); px.tag("weapon");
    const bl = s > 0 ? 7 : 2.4, tip = s > 0 ? [hd[0] + rs * 0.8, hd[1] - bl] : [hd[0] + rs * 1.6, hd[1] + 2.4];   // from behind only the knob shows, past the hip and down
    px.capsule(hd[0], hd[1] + 1, 0.8, tip[0], tip[1], 0.8, WOOD, 8.1, { edge: true });
    px.ellipse(tip[0], tip[1] - 0.6, 1.9, 1.9, BONE, 8.12);
    px.part(); px.tag(null);
    px.ellipse(hd[0], hd[1], 1.8, 2, SKIN, 8.3);
  }

  // ---- the head
  px.part();
  px.stamp(s > 0 ? (p.blink ? blinkOf(FRONT_H) : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "skald-front", BOX: { w: 64, h: 88, ox: 32, oy: 78 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "skald-back", BOX: { w: 64, h: 88, ox: 32, oy: 78 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
