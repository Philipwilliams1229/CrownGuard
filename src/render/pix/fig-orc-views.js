// ============ the orc bruiser seen from the FRONT and from BEHIND ============
// Same job as fig-goblin-views.js: one drawer, `make(s)`: s = +1 front, -1 back. Colours, build, kilt, strap,
// fur collar, mane, topknot, bearded axe and hide pauldron are the side figure's (fig-orc.js, approved).
// Hands: his RIGHT (the axe, the hide pauldron) is screen LEFT in front (rs = -s), screen RIGHT from behind.
// The axe rides upright by his right side, beard out. Feet, bob and arm swing come from the side walk's pose
// (the same n / ms / phase), forward = DOWN the screen in front, UP behind (FWD 0.4 a px of stride).
// One sun, upper left, both views unmirrored.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-orc.js";

const SKIN = mat("#5a8a3c"), HAIR = mat("#2e1e16"), HIDE = mat("#6e523a"), DARK = mat("#3e2c22"), FUR = mat("#9a8462"), BOOT = mat("#4a382c");
const STEEL = mat("#b8bcc4", { contrast: 1.2 }), IRON = mat("#7c808c"), WOOD = mat("#7a5632"), BONE = mat("#ece0c4");
const BAND = mat("#a8432e"), EYE = flat("#f0c83c"), MOUTH = flat("#2c1a22");
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, L: { m: SKIN, fix: 3 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 0 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, Y: { m: EYE }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
  H: { m: HAIR }, h: { m: HAIR, bias: 1 },
};
// FRONT: the mane framing the face, one slab of brow, yellow eyes cut to a scowl, flat snout, the underbite's tusks standing up.
const FRONT_H = [
  "....HHHHHHH....",
  "..HHHHHHHHHHH..",
  ".HHHGGGGGGGHHH.",
  ".HHGGGGGGGGGHH.",
  ".HHBBBBGBBBBHH.",
  ".HGbYYGGGYYbGH.",
  ".HGGbYGGGYbGGH.",
  ".HGGGGGLGGGGGH.",
  ".HGGGGnLnGGGGH.",
  ".HGTGMMMMMGTGH.",
  ".HGTTLLLLLTTGH.",
  ".HGGGGGGGGGGGH.",
  "..gGGGGGGGGGg..",
  "...gGGGGGGGg...",
  "....ggggggg....",
];
// BACK: the mane to the nape, one tie-line down it, the ears out at the sides, the thick neck.
const BACK_H = [
  "....HHHHHHH....",
  "..HHHHHHHHHHH..",
  ".HHHHHHHHHHHHH.",
  ".HHHHHHhHHHHHH.",
  ".HHHHHHhHHHHHH.",
  "GGHHHHHhHHHHHGG",
  ".GHHHHHhHHHHHG.",
  ".HHHHHHhHHHHHH.",
  ".HHHHHHhHHHHHH.",
  ".gHHHHHhHHHHHg.",
  ".gGHHHHhHHHHGg.",
  "..gGGHHHHHGGg..",
  "..gGGGGGGGGGg..",
  "...gGGGGGGGg...",
  "....ggggggg....",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F) => {
  const K = s < 0, rs = -s, ls = s, TAU = Math.PI * 2, { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chY = sk.C[1], hy = Math.round(sk.N[1]), hx = Math.round(sx * 0.7);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2.5, 2.5), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -2.5, 2.5);
  const vx = cl((sx - sx1) * 1.3, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 1.3, -2.5, 2.5);
  const tilt = 0.5 * Math.sin(ph * TAU);

  // far arm (his left, screen side ls): bare upper arm, a dark bracer, a green fist hanging at his side
  const shY = chY - 1.4, aF = p.aF[0], aN = p.aN[0];
  const armOf = (side, ang, sh) => {
    const shp = [side * 12.6 + sx, sh], el = [side * 13 + sx, sh + 8.4], hd = [side * 13 + sx, sh + 15.6 + s * ang * 3];
    return [shp, el, hd];
  };
  {
    const [sp, el, hd] = armOf(ls, aF, shY - tilt * ls * 0.6);
    px.part();
    px.capsule(sp[0], sp[1] + 0.6, 4.2, el[0], el[1], 3.6, SKIN, K ? 4.3 : 4.5, { bias: K ? 0 : -1, cast: K ? 0 : 1 });
    px.capsule(el[0], el[1], 3.4, hd[0], hd[1], 3.7, SKIN, K ? 4.3 : 4.5, { bias: K ? 0 : -1, cast: K ? 0 : 1 });
    const b0 = mix(el, hd, 0.35), b1 = mix(el, hd, 0.8);
    px.capsule(b0[0], b0[1], 3.6, b1[0], b1[1], 3.9, DARK, K ? 4.31 : 4.55, { bias: K ? 0 : -1, cast: K ? 0 : 1 });
    px.dot(...mix(b0, b1, 0.3), IRON, K ? 4.32 : 4.57, { fix: 4 }); px.dot(...mix(b0, b1, 0.8), IRON, K ? 4.32 : 4.57, { fix: 4 });
    px.part();
    px.ellipse(hd[0], hd[1] + (K ? 1.2 : 0.4), K ? 2.4 : 3, K ? 2.4 : 3.1, SKIN, K ? 3.55 : 4.7, { bias: K ? 0 : -1 });
  }

  // legs: short thick, bare knees, dark hide boots in a fur cuff; forward is down (front) / up (back)
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 5.2, fy = -2.2 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 4.4, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.9, (hp[1] + fy) / 2 - lift * 0.5];
    const b = side === rs ? 0 : -1;
    px.part();
    px.capsule(hp[0], hp[1], 3.9, kn[0], kn[1], 3.4, SKIN, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 3.3, fx, fy, 2.7, SKIN, z + lift * 0.05, { bias: b });
    const b0 = mix(kn, [fx, fy], 0.5);
    px.capsule(b0[0], b0[1], 3.2, fx, fy, 2.9, BOOT, z + 0.03 + lift * 0.05, { bias: b });
    px.capsule(b0[0] - 2.4, b0[1] - 0.2, 1.1, b0[0] + 2.4, b0[1] + 0.2, 1.1, FUR, z + 0.05 + lift * 0.05, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx, fy + 1.4, 3.3, 2.1, BOOT, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 1, 3, 1.8, BOOT, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 3, 2.8, 2.2 * cl(lift / 2.4, 0.3, 1), BOOT, z + 0.45, { bias: -2 });   // the sole as the heel comes up
    }
  }

  // the hide kilt, hung from the belt, ragged hem
  const kh = hipY + 4.2, kw = 8.2;
  px.part(); const kiltId = px._pid;
  px.poly([[hx - 7.4, hipY - 1], [hx + 7.4, hipY - 1], [hx + kw + 0.4 - vx * 0.6, kh - 1], [hx + kw * 0.62, kh + 0.8], [hx + kw * 0.36, kh - 0.6], [hx + kw * 0.1, kh + 1.2], [hx - kw * 0.16, kh - 0.4], [hx - kw * 0.42, kh + 0.8], [hx - kw * 0.7, kh - 0.2], [hx - kw - 0.4 - vx * 0.6, kh - 1.4]], HIDE, 3.6, { round: 0.85, cast: 1 });
  px.toneLine(hx + 2.4, hipY + 1, hx + 2.6, kh - 1, -1, kiltId);
  px.toneLine(hx - 2.6, hipY + 1, hx - 2.8, kh - 1.2, -1, kiltId);

  // the trunk: a bare green barrel, deep in the chest; belt; strap across it
  const c0 = chY - 2.4, wy = hipY;
  px.part(); const bodyId = px._pid;
  px.poly([[sx - 10.4, c0], [sx + 10.4, c0], [sx + 11.2, chY + 5], [sx + 10.2, chY + 9.4], [hx + 7.6, wy - 5], [hx + 7.2, wy + 0.4], [hx - 7.2, wy + 0.4], [hx - 7.6, wy - 5], [sx - 10.2, chY + 9.4], [sx - 11.2, chY + 5]], SKIN, 4, { round: 0.92, cast: 1 });
  if (s > 0) {
    px.toneLine(sx, chY + 3, sx, chY + 8.6, -1, bodyId);                      // between the pecs
    px.toneLine(sx - 8.4, chY + 8.8, sx - 1.4, chY + 9.4, -1, bodyId);        // under the chest
    px.toneLine(sx + 1.4, chY + 9.4, sx + 8.4, chY + 8.8, -1, bodyId);
    px.toneLine(hx, chY + 11, hx, wy - 5, -1, bodyId);                        // the belly's line
  } else {
    px.toneLine(sx, c0 + 1.5, hx, wy - 5.4, -1, bodyId);                      // the spine
    px.toneLine(sx - 8.4, chY + 1, sx - 3.2, chY + 6, -1, bodyId);            // the shoulder blades
    px.toneLine(sx + 8.4, chY + 1, sx + 3.2, chY + 6, -1, bodyId);
  }
  // the strap: over his right shoulder (rs) and down to the opposite hip
  px.poly([[sx + rs * 8.6, c0 + 0.4], [sx + rs * 5.4, c0 + 0.4], [hx + ls * 7.4, wy - 3.6], [hx + ls * 7.6, wy - 6.4]], DARK, 4.03, { round: 0.5 });
  px.poly([[hx - 7.6, wy - 4], [hx + 7.6, wy - 4], [hx + 7.2, wy + 0.4], [hx - 7.2, wy + 0.4]], BOOT, 4.05, { round: 0.92, bias: 1 });
  if (s > 0) { px.rect(hx - 1.5, wy - 3.4, 3, 3, IRON, 4.06, { fix: 3 }); px.dot(hx, wy - 2.2, IRON, 4.07, { fix: 1 }); }
  else { px.dot(hx - 3, wy - 2, IRON, 4.06, { fix: 1 }); px.dot(hx + 3, wy - 2, IRON, 4.06, { fix: 1 }); }

  // the fur collar the head sits in
  px.part();
  px.ellipse(sx, chY - 1.8, 9.8, 3.7, FUR, K ? 5 : 4.2, { cast: 1, edge: K });
  for (const x of [-7.6, -4.6, -1.6, 1.6, 4.6, 7.6]) px.dot(sx + x, chY + 1.6 + Math.abs(x) * 0.05, FUR, K ? 5 : 4.2);

  // the topknot: a bone-banded tail whipping a beat behind the head (tips to one side, as the hood does)
  const top = hy - 11, sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2, 2);
  const side = -s * 0.9, k0 = [hx, top + 0.8], k1 = [hx + side * 0.6, top - 3.4 - hop * 0.3], k2 = [hx + side * 4.6 + sway * 0.5, top - 3 - hop + Math.abs(sway) * 0.2], k3 = [hx + side * 7 + sway, top + 1 - hop * 1.2];
  px.part();
  px.capsule(k0[0], k0[1], 1.7, k1[0], k1[1], 2, HAIR, 6.3);
  px.capsule(k1[0], k1[1], 2, k2[0], k2[1], 1.5, HAIR, 6.3);
  px.capsule(k2[0], k2[1], 1.5, k3[0], k3[1], 0.8, HAIR, 6.3);
  px.part();
  px.capsule(k0[0] - 1.8, k0[1] - 0.9, 0.9, k0[0] + 1.8, k0[1] - 0.9, 0.9, BAND, 6.4);

  // the head
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, LEG, 6, { ax: 7, ay: 11, ball: [7.5, 7, 8.5, 8.5], cast: 1 });

  // the near arm (his right, screen side rs): bracer, green fist round the axe's haft, hide pauldron
  {
    const [sp, el, hd] = armOf(rs, aN, shY + tilt * rs * 0.6);
    px.part(); px.tag("nearArm");
    px.capsule(sp[0], sp[1] + 1, 4.4, el[0], el[1], 3.8, SKIN, K ? 4.3 : 7.9, { cast: K ? 0 : 1 });
    px.capsule(el[0], el[1], 3.6, hd[0], hd[1], 3.9, SKIN, K ? 4.3 : 7.9, { cast: K ? 0 : 1 });
    const b0 = mix(el, hd, 0.34), b1 = mix(el, hd, 0.78);
    px.capsule(b0[0], b0[1], 3.9, b1[0], b1[1], 4.1, DARK, K ? 4.31 : 7.95, { cast: K ? 0 : 1 });
    px.dot(...mix(b0, b1, 0.25), IRON, K ? 4.32 : 7.96, { fix: 4 }); px.dot(...mix(b0, b1, 0.8), IRON, K ? 4.32 : 7.96, { fix: 4 });
    px.tag(null);
    // the axe stands up by his side, beard out: an oak haft through the fist, a bearded steel head above it
    const t = -rs * 0.12 + vx * 0.05, A = (f, o) => [hd[0] + t * f + rs * o, hd[1] + f * 0.8], H = 9;   // hangs at his side, head down by the thigh
    px.part(); px.tag("weapon");
    px.capsule(...A(-3, 0), 1.05, ...A(H + 3.4, 0), 1.05, WOOD, K ? 1 : 8.1, { edge: !K });
    px.part();
    px.poly([A(H - 2.4, 0.6), A(H - 3.6, 4.4), A(H - 5, 8.6), A(H - 1.4, 9.6), A(H + 2.4, 9), A(H + 5.4, 6.6), A(H + 3.6, 3.4), A(H + 2.8, 0.6)], STEEL, K ? 1.02 : 8.12, { fix: 2 });
    px.poly([A(H - 5, 8.6), A(H - 1.4, 9.6), A(H + 2.4, 9), A(H + 5.4, 6.6), A(H + 3.9, 5.6), A(H + 1.8, 7.4), A(H - 1.4, 7.9), A(H - 4.2, 7)], STEEL, K ? 1.02 : 8.13, { fix: 4 });
    px.poly([A(H - 2.4, 0.6), A(H - 3.3, 3.4), A(H + 3.3, 3), A(H + 2.8, 0.6)], STEEL, K ? 1.02 : 8.13, { fix: 1 });
    px.poly([A(H - 1.8, -0.8), A(H + 2.2, -0.8), A(H + 1.8, -3), A(H - 1.4, -3)], IRON, K ? 1.03 : 8.12, { fix: 2 });
    px.poly([A(H - 2.4, -1.2), A(H + 2.8, -1.2), A(H + 2.8, 1.2), A(H - 2.4, 1.2)], IRON, K ? 1.03 : 8.14, { fix: 1 });
    px.tag(null);
    px.part();
    px.ellipse(hd[0], hd[1] + (K ? 1 : 0), K ? 2.5 : 3.2, K ? 2.5 : 3.2, SKIN, K ? 3.56 : 8.3);
    // the hide pauldron with its fur fringe and rivets
    px.part();
    px.ellipse(sp[0] + rs * 0.4, sp[1] - 0.6, 5.4, 4.5, HIDE, K ? 5 : 8, { cast: 1, edge: K });
    for (const x of [-3.6, -1, 1.6, 4]) px.dot(sp[0] + rs * 0.4 + x, sp[1] + 3.6 - Math.abs(x) * 0.3, FUR, K ? 5 : 8);
    px.dot(sp[0] - 1.8, sp[1] - 1.4, IRON, K ? 5.01 : 8.01, { fix: 4 }); px.dot(sp[0] + 2.4, sp[1] - 1.8, IRON, K ? 5.01 : 8.01, { fix: 4 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "orc-front", BOX: { w: 80, h: 84, ox: 40, oy: 78 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "orc-back", BOX: { w: 80, h: 84, ox: 40, oy: 78 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
