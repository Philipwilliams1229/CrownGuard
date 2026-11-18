// ============ VIEWS: the militia farmer (and the Levy's yeoman) from the FRONT and from BEHIND ============
// The farmer of fig-farmer.js (same hat, jerkin, breeches, wraps, clogs, rope belt) walking toward the
// camera (FRONT) and away from it (BACK). One drawer, `view(s)`: s = +1 front, -1 back. His RIGHT hand holds
// the weapon (screen LEFT in front, screen RIGHT from behind: `rs`); his left swings free (farmer) or carries
// the buckler (yeoman). The pitchfork is carried upright beside him (its head turned half-way so the tines
// still show; the side view's slant is foreshortened away). Same walk clip as the side (n, ms, pose) and
// the same feet / bob / swing, read from the solved pose. Unflipped on the board; one sun, upper left.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-farmer.js";

const SKIN = mat("#e8b990"), EYE = flat("#2a1c2c"), STUB = mat("#b88c6a"), BROW = mat("#6a4a2e");
const STRAW = mat("#d8b860", { contrast: 1.2 }), STRAWD = mat("#a8883c"), BAND = mat("#6a3e2c"), HAIRN = mat("#8a6234");
const JERKIN = mat("#9a8a62", { contrast: 1.15 }), SHIRT = mat("#d4c8a8", { contrast: 1.1 }), BREECH = mat("#5a4a3a", { contrast: 1.1 }), WRAP = mat("#cfc2a0");
const CLOG = mat("#4a3220", { contrast: 1.2, floor: 1 }), ROPE = mat("#b49a64"), ASH = mat("#9a7a4a"), IRON = mat("#b8bcc4", { contrast: 1.3 }), IRONK = mat("#7c8290");
const BLADE = mat("#d0d4dc", { contrast: 1.35 }), LEATHER = mat("#5a3c28"), OAK = mat("#8a5e34", { contrast: 1.15 });

const LEG = {
  H: { m: STRAW }, h: { m: STRAWD }, b: { m: BAND }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, B: { m: BROW, fix: 1 },
  E: { m: EYE }, e: { m: SKIN, fix: 0 }, z: { m: STUB, fix: 1 }, l: { m: STUB, fix: 2 }, r: { m: HAIRN }, w: { m: STRAWD, fix: 1 },
};
// FRONT: the broad brim shades the brow; two dark eyes, nose down the middle, stubble on the jaw, lips; hair at the sides. 15 wide, centre 7.
const FRONT_H = [
  ".....HHHHH.....",
  "....HHHHHHH....",
  "...HHHHHHHHH...",
  "...bbbbbbbbb...",
  "HHHHHHHHHHHHHHH",
  ".hhhhhhhhhhhhh.",
  "..rsBBsssBBsr..",
  "..rsSESSSESsr..",
  "..rsSESSSESsr..",
  "..rSSSSNSSSSr..",
  "..rzSSlllSSzr..",
  "...rzSSSSSzr...",
  "....rsSSSsr....",
];
const BLINK = FRONT_H.map((r, i) => (i === 7 ? r.replace(/E/g, "S") : i === 8 ? r.replace(/E/g, "e") : r));
// BACK: the crown of the hat with its band and a weave, the brim, the hair at the nape, the ears, the neck.
const BACK_H = [
  ".....HHHHH.....",
  "....HHwHHwH....",
  "...HHHHwHHHHw..",
  "...bbbbbbbbb...",
  "HHHHHHHHHHHHHHH",
  ".hhhhhhhhhhhhh.",
  "..rrrrrrrrrrr..",
  "..rrrrrrrrrrr..",
  "..SrrrrrrrrrS..",
  "..sSrrrrrrrSs..",
  "...ssrrrrrss...",
  "....rrrrrrr....",
  ".....sSSSs.....",
];

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F, o = {}) => {
  const yeo = String(o.variant || "").split("@")[0] === "yeoman";
  const rs = -s, ls = s;
  const { sk, ph } = F, p = sk.p, vv = s > 0;
  const sx = rs * 0.6 * Math.sin(ph * TAU), hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const a = Math.cos(ph * TAU), swL = a * 0.45;        // his left arm: forward as the right foot is planted
  const hem = hipY + 3.6, shY = chestY - 0.4;

  // ---- the left (far) arm: free in the farmer, under the buckler in the yeoman
  const lSh = [ls * 5.4 + sx, shY], lEl = [ls * 6.6 + sx, shY + 5.2], lHd = [ls * 6.5 + sx, shY + (yeo ? 11 : 10.6) + s * swL * 2.2];
  px.part();
  px.capsule(lSh[0], lSh[1], 2.1, lEl[0], lEl[1], 1.9, JERKIN, 4.4, { bias: -1 });
  px.capsule(lEl[0], lEl[1], 1.8, lHd[0], lHd[1], 1.5, SKIN, 4.4, { bias: -1 });
  px.part();
  px.ellipse(lHd[0], lHd[1] + 0.4, 1.7 + s * swL * 0.3, 1.7, SKIN, 4.6, { bias: -1 });

  if (yeo) {   // the buckler: oak planks, iron rim and boss; from behind its back, a strap and the rim
    const bx = ls * 8.4 + sx, by = shY + 9;
    px.part(); const bid = px._pid, bz = vv ? 8.5 : 3.3;
    px.ellipse(bx, by, 4.5, 4.9, IRONK, bz, { round: 0.7 });
    px.ellipse(bx, by, 3.6, 4.0, OAK, bz + 0.02, { round: 0.8 });
    px.toneLine(bx - 1.2, by - 3.4, bx - 1.4, by + 3.4, -1, bid);
    px.part();
    if (vv) { px.dot(bx, by, IRON, bz + 0.1, { fix: 4 }); px.dot(bx + 1, by + 0.4, IRONK, bz + 0.1, { fix: 2 }); }
    else { px.line(bx - 2.6, by - 0.4, bx + 2.6, by - 0.4, LEATHER, bz + 0.1); px.dot(bx - 2.4, by - 2.2, IRONK, bz + 0.1); px.dot(bx + 2.4, by + 1.8, IRONK, bz + 0.1); }
  }

  // ---- legs: breeches, wraps, clogs. Forward is down the screen in front, up it from behind.
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], fx = hx + side * 2.8, fy = -1.8 + s * f[0] * FWD - lift * 0.9, b = side === rs ? 0 : -1;
    const hp = [hx + side * 2.0, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.5, (hp[1] + fy) / 2 - lift * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 2.3, kn[0], kn[1], 2.0, BREECH, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 1.9, fx, fy - 1.6, 1.6, BREECH, z + lift * 0.05, { bias: b });
    px.capsule(kn[0] * 0.5 + fx * 0.5, kn[1] * 0.5 + (fy - 1.6) * 0.5, 2.0, fx, fy - 1.4, 1.8, WRAP, z + lift * 0.05 + 0.01, { bias: b });
    px.part();
    if (vv) {
      px.ellipse(fx + side * 0.2, fy + 0.6, 2.6, 1.7, CLOG, z + 0.4 + lift * 0.05, { bias: b, floor: 1 });
      px.ellipse(fx, fy + 1.4, 2.2, 1.0, CLOG, z + 0.45 + lift * 0.05, { bias: b, floor: 1 });
    } else {
      px.ellipse(fx, fy + 0.5, 2.1, 1.5, CLOG, z + 0.4 + lift * 0.05, { bias: b, floor: 1 });
      if (lift > 0.8) px.ellipse(fx, fy + 2.4, 1.8, 1.7 * cl(lift / 2.4, 0.3, 1), CLOG, z + 0.45, { bias: -2, floor: 1 });   // the sole shows as the heel comes up
    }
  }

  // ---- the jerkin to the hip, a frayed hem, the rope belt; open laces on the chest in front, a seam behind
  px.part(); const jk = px._pid;
  const hm = [[sx + 5.2, hem], [sx + 3.4, hem + 1.2], [sx + 1.4, hem], [sx - 0.8, hem + 1.2], [sx - 2.8, hem], [sx - 4.6, hem + 1.2], [sx - 5.2, hem]];
  px.poly([[sx - 4.6, chestY - 1.8], [sx + 4.6, chestY - 1.8], [sx + 5.4, chestY + 3], [sx + 5.2, hipY], ...hm, [sx - 5.2, hipY], [sx - 5.4, chestY + 3]], JERKIN, 4, { round: 0.92, cast: 2 });
  px.toneLine(sx - 3.8, hipY - 1, sx - 3.6, hem - 0.6, -1, jk);
  px.line(sx - 5.2, hipY - 2.4, sx + 5.2, hipY - 2.4, ROPE, 4.1);
  px.part();
  if (vv) {
    px.line(sx, chestY - 1.4, sx + 0.2, chestY + 4.4, SHIRT, 4.05);                  // the open laces / shirt in the V
    px.line(sx - 1.4, chestY - 1.4, sx - 0.2, chestY + 2.4, SHIRT, 4.05); px.line(sx + 1.4, chestY - 1.4, sx + 0.2, chestY + 2.4, SHIRT, 4.05);
    px.dot(sx + 0.6, hipY - 1.4, ROPE, 4.12, { fix: 2 }); px.dot(sx + 0.6, hipY - 0.2, ROPE, 4.12, { fix: 1 }); px.dot(sx - 0.8, hipY - 0.8, ROPE, 4.12, { fix: 2 });   // the knot and its ends
  } else {
    px.toneLine(sx + 0.4, chestY - 0.6, sx, hipY - 3, -1, jk);                       // the back seam
    px.poly([[sx - 3.6, chestY + 3], [sx - 1, chestY + 3], [sx - 1, chestY + 5.6], [sx - 3.6, chestY + 5.6]], STRAWD, 4.1, { noSeam: true });   // a sewn patch
    px.dot(sx + 2.4, hipY - 1, ROPE, 4.12, { fix: 2 });
  }
  px.part();   // the collar of the shirt
  px.poly([[sx - 3.4, chestY - 2.8], [sx + 3.4, chestY - 2.8], [sx + 3.8, chestY - 0.6], [sx - 3.8, chestY - 0.6]], SHIRT, 5, { round: 0.9, cast: 1 });

  // ---- the right (near) arm and the weapon: sleeve, bare forearm, the fist on it. The forward swing = hand lower and bigger in front.
  const ang = p.aN[0] * 0.5, rSh = [rs * 5.4 + sx, shY], rEl = [rs * 7.2 + sx, shY + 4.6], rHd = [rs * 8 + sx, shY + 8 + s * ang * 1.4 + (yeo ? 0 : 0.6)];
  const wx = rHd[0] + rs * 0.4;
  px.part(); px.tag("weapon");
  if (!yeo) {   // the pitchfork, upright beside him: ONE straight ash haft through the closed fist (the side view's 42 long,
    // gripped 17 up from the butt), a small iron socket and the side view's three tines, the middle one the tallest
    const hx0 = Math.round(rHd[0]), hy0 = rHd[1], butt = hy0 + 15, top = hy0 - 23;
    px.capsule(hx0, butt, 0.95, hx0, top, 0.95, ASH, 8.2, { edge: true });
    px.part();
    const ty = Math.round(top);   // the same head every frame: socket, a crossbar, two outer tines and a taller middle one
    px.capsule(hx0, ty + 1.6, 1.05, hx0, ty - 0.6, 1.05, IRONK, 8.25);
    px.capsule(hx0 - 3, ty - 1, 0.6, hx0 + 3, ty - 1, 0.6, IRON, 8.26, { edge: true });
    px.part();
    px.rect(hx0 - 3, ty - 7, 1, 6, IRON, 8.27, { noLine: true }); px.rect(hx0 + 3, ty - 7, 1, 6, IRON, 8.27, { noLine: true });
    px.rect(hx0, ty - 8, 1, 7, IRON, 8.27, { noLine: true });
    px.dot(hx0 - 3, ty - 7.4, IRONK, 8.28); px.dot(hx0 + 3, ty - 7.4, IRONK, 8.28); px.dot(hx0, ty - 8.4, IRONK, 8.28);
  } else if (!vv) {   // from behind: the grip's end and the pommel below the fist; the blade stands up in front of him, so the
    // torso and arm hide its lower part and only its upper blade peeks above / behind his right shoulder (z 3.9)
    px.capsule(wx, rHd[1] + 0.5, 0.9, wx, rHd[1] + 3, 0.9, LEATHER, 8.2);
    px.ellipse(wx, rHd[1] + 3.8, 1.1, 1.1, IRONK, 8.22);
    px.part();
    const b0 = [wx - rs * 1.2, rHd[1] - 1.5], b1 = [rs * 7.6 + sx, shY - 9.5];   // from the fist's thumb side up behind the shoulder
    const d3 = [b1[0] - b0[0], b1[1] - b0[1]], L3 = Math.hypot(...d3), B3 = (t) => [b0[0] + d3[0] * t / L3, b0[1] + d3[1] * t / L3];
    px.capsule(...B3(0), 1.15, ...B3(L3 - 2.2), 0.95, BLADE, 3.9, { edge: true });
    px.capsule(...B3(L3 - 2.2), 0.95, ...B3(L3), 0.3, BLADE, 3.9, { edge: true });
  } else {      // the short sword upright from the fist, a cross guard, a pommel
    const sy = rHd[1], tilt = rs * 0.1;
    px.capsule(wx, sy - 2, 1.15, wx + tilt * 14, sy - 15, 0.95, BLADE, 8.2, { edge: true });
    px.capsule(wx + tilt * 14, sy - 15, 0.95, wx + tilt * 16, sy - 17.4, 0.3, BLADE, 8.2, { edge: true });
    px.part();
    px.capsule(wx, sy + 0.4, 0.9, wx, sy - 2, 0.9, LEATHER, 8.22);
    px.capsule(wx - 2.4, sy - 2.2, 0.75, wx + 2.4, sy - 2.2, 0.75, IRONK, 8.25, { edge: true });
    px.ellipse(wx, sy + 1.6, 1.0, 1.0, IRONK, 8.25);
  }
  px.tag(null);
  px.part(); px.tag("nearArm");
  px.capsule(rSh[0], rSh[1] + 0.3, 2.2, rEl[0], rEl[1], 1.9, JERKIN, 8, { cast: 2 });
  px.capsule(rEl[0], rEl[1], 1.9, rHd[0], rHd[1], 1.6, SKIN, 8, { cast: 2 });
  const fx0 = yeo ? rHd[0] : Math.round(rHd[0]);
  px.part(); px.ellipse(fx0, rHd[1], 1.8, 1.7, SKIN, 8.6);
  if (!yeo) px.toneLine(fx0 - 1, rHd[1] + 0.4, fx0 + 1, rHd[1] + 0.4, -1, px._pid);   // the fingers closed over the haft
  px.tag(null);

  // ---- the head and its hat
  px.part();
  const rows = vv ? (p.blink ? BLINK : FRONT_H) : BACK_H;
  px.stamp(rows, hx, hy, LEG, 6, { ax: 7, ay: 12, ball: [7.5, 7, 6.4, 6.4], cast: 2 });
  return {};
};

const walk = { ...SIDE.walk };
const BOX = { w: 44, h: 72, ox: 22, oy: 62 };
export const FRONT = { NAME: "farmer-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "farmer-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
