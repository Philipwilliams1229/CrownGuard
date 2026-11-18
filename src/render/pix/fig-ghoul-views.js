// ============ the Ghoul seen from the FRONT and from BEHIND ============
// Same creature as fig-ghoul.js (a starved corpse on all fours, arms for forelegs, grey-green flesh over
// ribs and a knuckled spine, a purple shroud rag at the hip, a sunken stringy-haired face with teal sockets
// and a wide mouth of teeth), loping toward the camera (FRONT, s = +1: the face slung low between its
// planted arms under the hump of the shoulders, hind haunches showing wide behind) or away (BACK, s = -1:
// the rump and the rag, the crouched hind legs splayed, the knuckled spine up to the shoulder hump, the
// elbows out wide, the head hidden). Unflipped, sun upper left. The walk keeps the side clip's n and ms;
// the arms and legs alternate in turn (a lope: diagonal pairs), the body bobbing twice a cycle.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-ghoul.js";

const FLESH = mat("#7c8a70"), PALE = mat("#b4bc9c"), HAIR = mat("#4a5448", { contrast: 0.9 }), RAG = mat("#4a3a5e", { contrast: 0.9 });
const CLAW = mat("#d8d0b4");
const EYE = flat("#7ce0b8", { emis: true }), SOCK = flat("#15121a"), MOUTH = flat("#2c1a22"), TOOTH = flat("#ece0c4");
const LEG = { F: { m: FLESH }, f: { m: FLESH, bias: -1 }, h: { m: HAIR }, P: { m: PALE }, e: { m: SOCK }, E: { m: EYE }, N: { m: SOCK }, T: { m: TOOTH, fix: 4 }, M: { m: MOUTH } };

// FRONT face, 11 wide (centre column 5), 11 tall: stringy hair over the crown, sunken sockets, the nose holes,
// a wide mouth of teeth over a pale jaw.
const FRONT_H = [
  "..hhhhhhh..",
  ".hhhhFhhhh.",
  ".hhFFFFFhh.",
  ".hFeeFeeFh.",
  ".hFeEFEeFh.",
  ".fFFFNFFFf.",
  ".fFTMTMTFf.",
  "..fTMMMTf..",
  "..fPTTTPf..",
  "...fPPPf...",
  "....fPf....",
];
const SNAP = FRONT_H.map((r, i) => ({ 6: ".fTTMMMTTf.", 7: "..fTMMMTf..", 8: "..fTMMMTf.." })[i] ?? r);
const BLINK = FRONT_H.map((r, i) => (i === 4 ? ".hFeeFeeFh." : r));
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

const make = (s) => (px, F, o = {}) => {
  const { ph } = F, p = F.sk.p;
  const w = Math.sin(ph * TAU);
  const bob = 1.3 * (0.5 + 0.5 * Math.cos(ph * 2 * TAU));              // the body drops on each landing
  const sw = 0.9 * w;                                                   // a lope's roll from side to side
  const vx = cl(sw - 0.9 * Math.sin((ph - 0.09) * TAU), -2, 2);
  const gy = -bob;                                                       // body lift this frame (negative = up)
  const lift = (side) => Math.max(0, side * w) * 3.2;                    // each arm lifts and reaches in turn
  const reach = (side) => s * 2.2 * side * w;                            // forward = down the screen (front) / up (back)

  // ---- the far hind leg and arm first (screen LEFT in front is his right; the pair that is lifted alternates)
  const hindLeg = (side, z, b) => {
    const l = Math.max(0, -side * w) * 2.6;
    const hp = [sw + side * 4.3, -9.5 + gy], kn = [side * 8.8 + sw, -6 + gy - l * 0.3], an = [side * 6 + sw * 0.5, -1.6 - l + s * -side * w * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 2.8, kn[0], kn[1], 1.4, FLESH, z, { bias: b, cast: 1 });
    px.capsule(kn[0], kn[1], 1.4, an[0], an[1], 1, FLESH, z, { bias: b, cast: 1 });
    px.ellipse(kn[0], kn[1], 1.9, 1.8, FLESH, z + 0.02, { bias: b });
    px.part();
    px.ellipse(an[0], an[1] + 1, s > 0 ? 1.7 : 1.5, s > 0 ? 1.2 : 1.3, FLESH, z + 0.3, { bias: b });
    if (s > 0) for (const dx of [-1, 0, 1]) px.dot(an[0] + dx, an[1] + 2, CLAW, z + 0.35, { fix: 3 });
    else if (l > 1) px.ellipse(an[0], an[1] + 2.4, 1.1, 1.3, FLESH, z + 0.35, { bias: -2 });
  };
  const arm = (side, z, b) => {
    const L = lift(side), rc = reach(side);
    const sh = [side * 5.2 + sw, -15.6 + gy];
    const el = s > 0 ? [side * 10.4 + sw, -9.6 + gy * 0.6 - L * 0.4] : [side * 10 + sw, -11 + gy * 0.6 - L * 0.3];
    const hd = s > 0 ? [side * 7.2 + sw, -1.6 + rc - L] : [side * 8 + sw, -15.5 + gy + rc * 0.8 - L * 0.6];
    px.part();
    px.capsule(sh[0], sh[1], 2.2, el[0], el[1], 1.6, FLESH, z, { bias: b, cast: 1 });
    px.capsule(el[0], el[1], 1.6, hd[0], hd[1], 1.2, FLESH, z, { bias: b, cast: 1 });
    px.ellipse(el[0], el[1], 1.8, 1.7, FLESH, z + 0.02, { bias: b + 0.4 });
    px.part();
    px.ellipse(hd[0], hd[1] + (s > 0 ? 0.6 : 0), s > 0 ? 1.9 : 1.5, 1.3, FLESH, z + 0.03, { bias: b });
    if (s > 0) for (const dx of [-1.3, 0, 1.3]) px.line(hd[0] + dx * 0.8, hd[1] + 1, hd[0] + dx * 1.2, hd[1] + 3.2, CLAW, z + 0.05, { fix: 3, bias: b });
  };

  const rs = -s, ls = s;                                                 // screen sides of his right and left
  if (s > 0) { hindLeg(rs, 1, -1); hindLeg(ls, 1, -1); arm(rs, 5, 0); arm(ls, 5, 0); }
  else { arm(rs, 1, -1); arm(ls, 1, -1); }

  // ---- the shroud rag at the hip (it trails the body by a beat)
  if (s < 0) {
    px.part();
    const hm = -2.6;
    px.poly([[sw - 4.8, -13 + gy], [sw + 4.8, -13 + gy], [sw + 5.2, hm - 2 + gy], [sw + 2.8, hm + 1], [sw + 0.6, hm - 1.6], [sw - 1.6, hm + 1.4], [sw - 3.6 - vx, hm - 1], [sw - 5.2 - vx, hm - 3.6]], RAG, 4.6, { round: 0.85, floor: 1 });
    px.line(sw + 1.4, -12 + gy, sw + 1.6, hm - 1.4, RAG, 4.65, { fix: 0 });
  }

  // ---- the body
  px.part(); const id = px._pid;
  if (s > 0) {
    px.ellipse(sw, -14 + gy, 6.4, 5.8, FLESH, 4, { cast: 1 });                    // the hump of the shoulders and the cage under the chin
    px.ellipse(sw, -9 + gy, 4.4, 3.6, PALE, 4.2, { cast: 1 });                    // the pale pinched belly
    for (const dy of [-3, -0.4]) { px.line(sw - 5, -14.2 + gy + dy, sw - 0.8, -13 + gy + dy, HAIR, 4.3, { fix: 1 }); px.line(sw + 5, -14.2 + gy + dy, sw + 0.8, -13 + gy + dy, HAIR, 4.3, { fix: 1 }); }
    px.part();
    px.poly([[sw - 4.4, -12.6 + gy], [sw + 1.6, -13.4 + gy], [sw + 4.4, -9.2 + gy], [sw + 1, -8 + gy], [sw - 1, -9.6 + gy], [sw - 3.4, -8.6 + gy]], RAG, 4.5, { round: 0.8, floor: 1 });
  } else {
    px.ellipse(sw, -9.4 + gy, 5.8, 4.4, FLESH, 4, { cast: 1 });                   // the haunches
    px.ellipse(sw, -16.4 + gy, 6.2, 5.2, FLESH, 3.9, { cast: 1 });                // the hump of the shoulders beyond
    px.capsule(sw, -9 + gy, 3.4, sw, -15 + gy, 3.8, FLESH, 4);
    px.part();
    for (let y = -7.6; y > -21; y -= 2.4) px.dot(Math.round(sw), Math.round(y + gy), PALE, 4.4, { fix: 3 });   // the knuckled spine
    for (const side of [-1, 1]) { px.line(sw + side * 1, -18 + gy, sw + side * 4.6, -14.4 + gy, HAIR, 4.3, { fix: 1 }); px.line(sw + side * 1, -15 + gy, sw + side * 4.8, -11.6 + gy, HAIR, 4.3, { fix: 1 }); }
    px.part();
    px.dot(Math.round(sw - 2), Math.round(-8.6 + gy), HAIR, 4.35, { fix: 1 });
  }
  if (s < 0) { hindLeg(rs, 3, 0); hindLeg(ls, 3, 0); }

  // ---- the head: slung low between the arms (front); only a ragged tuft of hair over the hump behind
  if (s > 0) {
    px.part();
    px.capsule(sw, -14 + gy, 3, sw, -10 + gy, 2.4, FLESH, 4.3);
    px.part();
    const hx = Math.round(sw + vx * 0.5 + Math.sin(ph * TAU + 1) * 0.5), hy = Math.round(-4.2 + gy * 0.8);
    const grid = p.blink ? BLINK : w > 0.5 ? SNAP : FRONT_H;
    px.stamp(grid, hx, hy, LEG, 6, { ax: 5, ay: 10, ball: [5.5, 5, 5.5, 5.5], cast: 1 });
    // the limbs in front of it all: the near-side hands
  } else {
    px.part();
    const tx = Math.round(sw + vx * 0.4), ty = Math.round(-21.4 + gy);
    px.poly([[tx - 3, ty + 1], [tx - 2, ty - 1.6], [tx, ty - 2.4], [tx + 2.2, ty - 1.4], [tx + 3.2, ty + 1], [tx + 1, ty + 0.6], [tx - 1, ty + 1.6]], HAIR, 4.45, { round: 0.8, floor: 1 });
  }
  // arms again over the body in front view's lifted pose (the lifted hand passes in front of the chest)
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "ghoul-front", BOX: { w: 48, h: 46, ox: 24, oy: 40 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "ghoul-back", BOX: { w: 48, h: 46, ox: 24, oy: 40 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
