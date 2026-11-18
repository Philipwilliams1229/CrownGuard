// ============ CONCEPT FIGURES: the goblin raider seen from the FRONT and from BEHIND ============
// Every pix figure is drawn side-on and only flips; a road that runs down or up the board
// needs the figure facing the camera or away from it. This is the test for the cast: the
// goblin of fig-goblin.js (approved look: colours, gear, build, hunch) drawn walking toward
// the camera (FRONT) and away from it (BACK). One drawer serves both, `view(s)`: s = +1 front,
// -1 back. The goblin's RIGHT hand holds the knife (screen LEFT in front, screen RIGHT from
// behind: `rs`), the shield rides his LEFT arm. Unflipped on the board; one sun, upper left.
// The walk keeps the side clip's n, ms and phase (frame 0: near foot planted forward), and
// reads its feet, bob and arm swing from the same walkPose, so views switch mid-stride.
// Forward is DOWN the screen in FRONT and UP in BACK, foreshortened (FWD 0.4 a px of stride).
// Pattern for the next figure: head grids per view (hood / bare), ears and hood point first,
// legs, torso, far arm, near arm, head, weapon; `bare` swaps the hood and shield.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-goblin.js";

const SKIN = mat("#6aa04f"), HOOD = mat("#5a4630"), JERK = mat("#6a4a2a"), DARK = mat("#3c2a18");
const STEEL = mat("#8a8a92", { contrast: 1.25 }), WOOD = mat("#8a6238"), BONE = mat("#ece0c4");
const EYE = flat("#d8402e"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const JERK_B = mat("#6e4c28"), HAIR = mat("#3a2a1c"), PATCH = mat("#7a6240");

const LEG = {
  K: { m: HOOD }, k: { m: HOOD, bias: -1 }, G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH }, D: { m: HAIR }, P: { m: PATCH }, s: { m: HOOD, bias: -2 },
};
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const bareOf = (rows, top) => swap(rows.map((r) => r.replace(/K/g, "G").replace(/k/g, "g")), top);

// FRONT: the hood frames the face; heavy brow (B), red eyes (E, glint e), the hooked nose (N) down the
// middle and over the lip, snaggle grin of odd teeth (T) in a dark mouth (M). 13 wide, centre column 6.
const FRONT_H = [
  "...KKKKKKK...",
  "..KKKKKKKKK..",
  ".KKKKKKKKKKK.",
  ".KKkkkkkkkkK.",
  ".KkBBGGGBBkK.",
  ".KGeEBGBeEGK.",
  ".KGEEGGGEEGK.",
  ".KGGGLNLGGGK.",
  ".KGGgnNngGGK.",
  ".KGMTMNMTMMGK",
  "..kGMMTMMMMGk",
  "...gGGGGGGg..",
  ".....ggggg...",
];
const FRONT_B = bareOf(FRONT_H, { 0: "....GDDDG....", 1: "..GGGDGGGGG..", 2: ".GGLLGGGGGGG.", 3: ".GGGGGGGGGGG." });
const blinkOf = (rows) => swap(rows, { 5: rows[5].replace(/[eE]/g, "G"), 6: rows[6].replace(/E/g, "B") });
// BACK: the back of the hood, a seam down it, a patch, the tatter of its hem; no face.
const BACK_H = [
  "...KKKKKKK...",
  "..KKKKKKKKK..",
  ".KKKKKKKKKKK.",
  ".KKKKKsKKKKK.",
  ".KKKKKsKKKkK.",
  "KKKKKKsKPPKkK",
  "KKKKKKsKPPKKK",
  "KKKKKKsKKKKKK",
  ".KKKKKsKKKKK.",
  ".kkKKKsKKKkk.",
  "..kkkKKKkkk..",
  "...kkKkkKkk..",
  ".....kkk.....",
];
const BACK_B = [
  "....GDDDG....",
  "..GGGDDGGGG..",
  ".GGLLGGGGGGG.",
  ".GGGLGGGGGGG.",
  ".GGGGGGGgGGG.",
  ".GGGGGGGGGGG.",
  ".GGGGgGGGGGG.",
  ".gGGGGGGGGGg.",
  "..gGGDGGDGg..",
  "...ggGGGgg...",
  "....gGGGg....",
  ".....ggg.....",
  ".............",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F, o = {}) => {
  const bare = o.variant === "bare", jerk = bare ? JERK_B : JERK, rs = -s, ls = s;    // rs: screen side of his right
  const { sk, ph } = F, p = sk.p, TAU = Math.PI * 2;
  const lagT = 0.09;
  const sw = (t) => rs * 0.8 * Math.sin(t * TAU);                  // sways over the planted foot (near foot planted 0..0.5)
  const sx = sw(ph), sx1 = sw(ph - lagT), sx2 = sw(ph - lagT * 2);
  const hipY = sk.P[1], chestY = sk.C[1] + 1.5, hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -2, 2);
  const vx = cl((sx - sx1) * 1.3, -2, 2), vx2 = cl((sx1 - sx2) * 1.3, -2, 2);
  const tilt = 0.5 * Math.sin(ph * TAU);

  // far side first. The shield (his left, screen side ls): in FRONT seen nearly edge-on beside him, carried forward;
  // from BEHIND its back: dark rim, planks, a strap, the boss's rivets, mostly beyond his body.
  const shY = chestY + 0.4 - tilt * ls * rs * -1;
  const shL = [ls * 4.3 + sx, shY], shR = [rs * 4.3 + sx, shY - 0.5 * tilt * 0 + tilt];
  if (bare) {
    const ang = (p.bF || [0.5, 0.8, 0])[0], hand = [ls * 6.6 + sx, shL[1] + 7.2 + s * ang * 2.0], el = [ls * 7.2 + sx, shL[1] + 3.6];
    px.part();
    px.capsule(shL[0], shL[1], 1.6, el[0], el[1], 1.5, SKIN, 4.6, { bias: -1 });
    px.capsule(el[0], el[1], 1.5, hand[0], hand[1], 1.4, SKIN, 4.6, { bias: -1 });
    px.part();
    px.ellipse(hand[0], hand[1] + 0.3, 1.9 + s * ang * 0.3, 1.8, SKIN, 4.7, { bias: -1 });
  } else {
    const c = [ls * 8 + sx, shL[1] + 6.2];
    px.part();
    const zs = s > 0 ? 7.4 : 3.2;
    px.capsule(shL[0], shL[1], 1.6, ls * 6.8 + sx, shL[1] + 4.4, 1.5, SKIN, zs - 0.2, { bias: -1 });
    px.part(); const id = px._pid;
    px.ellipse(c[0], c[1], 3.1, 5.2, DARK, zs, { round: 0.6 });
    px.ellipse(c[0], c[1], 2.1, 4.2, WOOD, zs + 0.02, { round: 0.75 });
    px.toneLine(c[0] - 0.6, c[1] - 4, c[0] - 0.6, c[1] + 4, -1, id);
    px.part();
    if (s > 0) px.ellipse(c[0] + ls * 0.5, c[1] - 0.2, 1.1, 1.3, STEEL, zs + 0.06, { cast: 1 });
    else {
      px.line(c[0] - 2.2, c[1] - 0.8, c[0] + 2.2, c[1] - 0.8, DARK, zs + 0.06, { cast: 0 });
      px.dot(c[0] - 1.4, c[1] - 3.4, STEEL, zs + 0.06); px.dot(c[0] + 1.4, c[1] + 2.6, STEEL, zs + 0.06);
    }
  }

  // the hood's point, behind the head: tips to one side (screen right in front) and flops a beat behind the bob
  const top = hy - 9, bend = cl(vx * 2 + vx2 * 1.4, -2.4, 2.4), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5);
  px.part();
  if (bare) {
    px.poly([[hx - 2.4, top + 2.2], [hx + 2.4, top + 2.2], [hx + 2.6 + bend * 0.5, top - 0.6 - bob * 0.5], [hx + 4.4 + bend, top - 2.2 - bob], [hx + 0.6 + bend * 0.4, top - 1.2 - bob * 0.5], [hx - 1.4, top]], HAIR, 5.2, { round: 0.8, floor: 1 });
  } else {
    const tipx = hx + (s > 0 ? 6 : -5) + bend * 1.4;
    if (s < 0) {
      // from behind the point still rises above the crown, tipping to screen LEFT (the mirror of the front's lean)
      const tx = hx - 6 + bend * 1.4;
      px.poly([[hx - 4.4, top + 3], [hx + 4.4, top + 3], [hx + 3.2 + bend * 0.4, top - 3.4 - bob * 0.5], [tx, top - 8 - bob + Math.abs(bend) * 0.3], [hx - 0.6 + bend * 0.5, top - 6 - bob * 0.6], [hx - 2.8, top - 2]], HOOD, 5.2, { round: 0.9, ny: -0.2 });
    } else
    px.poly([[hx - 4, top + 2], [hx + 4, top + 2], [hx + 3 + bend * 0.4, top - 2.6 - bob * 0.5], [tipx, top - 5.6 - bob + Math.abs(bend) * 0.3], [hx + 0.8 + bend * 0.5, top - 4.2 - bob * 0.6], [hx - 2.4, top - 1.2]], HOOD, 5.2, { round: 0.9, ny: -0.2 });
  }

  // the long ears out to both sides, back and up (from behind: their backs, a tone down; the near one notched when bare)
  const ey = -vy * 1.3 - vy2 * 0.9 - (p.ear || 0) * 1.4;
  for (const side of [-1, 1]) {
    px.part(); const eid = px._pid;
    const r = side, notch = bare && side === rs, wob = ey * 0.8 + (side === rs ? vx * 0.6 : -vx * 0.6);
    const rt = (xx, yy) => [hx + r * xx, hy + yy];
    const pts = notch
      ? [rt(4.6, -6.2), rt(5.4, -2.2), rt(8.4, -3.6), rt(9.6, -4.2 + wob * 0.3), rt(11.4, -5 + wob * 0.5), rt(14.6, -10 + wob), rt(9.4, -8.6 + wob * 0.4)]
      : [rt(4.6, -6.2), rt(5.4, -2.6), rt(9.4, -5.4 + wob * 0.4), rt(14, -9.6 + wob), rt(9.4, -8.2 + wob * 0.4)];
    px.poly(pts, SKIN, s > 0 ? 5.5 : 6.6, { bias: s > 0 ? -1 : -2, n: [r * 0.3, -0.35, 0.9], cast: 1 });
    px.toneLine(...rt(5.6, -4.6), ...rt(11.4, -7.8 + wob * 0.8), -1, eid);
  }

  // bandy bare legs, big flat feet: forward is down the screen (front) or up it (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  const mid = [];
  for (const [f, side, z] of feet) {
    const lift = f[1], fx = hx + side * 2.9 + (side === rs ? 0 : 0), fy = -1.8 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 1.9, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 1.3, (hp[1] + fy) / 2 - lift * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 2.1, kn[0], kn[1], 1.8, SKIN, z + lift * 0.05, { bias: side === rs ? 0 : -1 });
    px.capsule(kn[0], kn[1], 1.7, fx, fy, 1.3, SKIN, z + lift * 0.05, { bias: side === rs ? 0 : -1 });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1.1, 2.3, 1.35, SKIN, z + 0.4 + lift * 0.05, { bias: side === rs ? 0 : -1 });
    else {
      px.ellipse(fx, fy + 0.9, 1.8, 1.2, SKIN, z + 0.4 + lift * 0.05, { bias: side === rs ? 0 : -1 });
      if (lift > 0.8) px.ellipse(fx, fy + 2.6, 1.7, 1.9 * cl(lift / 2.2, 0.3, 1), SKIN, z + 0.45, { bias: -2 });   // the sole shows as the heel comes up
    }
    mid.push(kn);
  }

  // the jerkin: a hunched barrel to a ragged hem, belt round it
  const c0 = chestY - 3, b0 = hipY;
  px.part();
  px.poly([[sx - 5.2, c0], [sx + 5.2, c0], [sx + 5, c0 + 3.4], [hx + 4.7, b0 + 0.2], [hx + 4.8, b0 + 2.2], [hx - 4.8, b0 + 2.2], [hx - 4.7, b0 + 0.2], [sx - 5, c0 + 3.4]], jerk, 4, { round: 0.92, cast: 1 });
  for (const dx of [-3.4, -1.6, 0.6, 3.2]) px.dot(hx + dx, b0 + 2.6, jerk, 4);
  px.poly([[hx - 4.9, b0 - 2], [hx + 4.9, b0 - 2], [hx + 4.9, b0 - 0.2], [hx - 4.9, b0 - 0.2]], DARK, 4.05, { round: 0.92 });
  px.part();
  if (s > 0) {
    px.dot(hx, b0 - 1.1, STEEL, 4.2);                                       // buckle
    px.dot(sx, c0 + 2, DARK, 4.1); px.dot(sx, c0 + 4, DARK, 4.1);           // the lacing
  } else {
    px.toneLine(sx, c0 + 1, hx, b0 - 2.6, -1, px._pid);                      // the back seam
    px.poly([[hx + 1.2, c0 + 3], [hx + 3.8, c0 + 3], [hx + 3.8, c0 + 5.6], [hx + 1.2, c0 + 5.6]], PATCH, 4.1, { noSeam: true });
  }

  // the near arm (his right, screen side rs): the knife in its fist. Forward swing = the hand lower and bigger in front.
  const ang = p.aN[0], hand = [rs * 6.8 + sx, shR[1] + 7.4 + s * ang * 2.4], elb = [rs * 7.8 + sx, shR[1] + 3.8];
  const hr = cl(1.7 + s * ang * 0.5, 1.4, 2.3);
  px.part();
  px.ellipse(shR[0] - rs * 0.2, shR[1] + 0.2, 2.5, 2.3, jerk, 4.6, { cast: 0, bias: 1 });
  px.part();
  px.capsule(shR[0], shR[1] + 0.6, 1.7, elb[0], elb[1], 1.6, SKIN, 4.5, { cast: 1 });
  px.capsule(elb[0], elb[1], 1.6, hand[0], hand[1], 1.5, SKIN, 4.5, { cast: 1 });
  const b0m = [(elb[0] * 0.38 + hand[0] * 0.62), (elb[1] * 0.38 + hand[1] * 0.62)];
  px.capsule(b0m[0], b0m[1], 1.65, hand[0] - rs * 0.1, hand[1] - 0.8, 1.6, DARK, 4.55, { cast: 1 });
  px.part();
  px.ellipse(hand[0], hand[1], hr, hr, SKIN, 8.3);
  // the knife, a crude blade held up and a little out; from behind only its tip clears the fist
  px.part(); px.tag("weapon");
  const kl = s > 0 ? 8 : 5.4, tip = [hand[0] + rs * (s > 0 ? 3.4 : 2.4), hand[1] - kl - Math.max(0, -ang) * 0.6];
  px.poly([[hand[0] - 0.9, hand[1] - 1], [hand[0] + 1, hand[1] - 1], [tip[0] + 0.5, tip[1] + 2], [tip[0], tip[1]]], STEEL, 8.1, { fix: 3 });
  px.line(hand[0] - 0.2, hand[1] - 1.2, tip[0], tip[1] + 1.4, STEEL, 8.12, { fix: 4 });
  px.tag(null);

  // the head
  px.part();
  const blink = p.blink || (ph >= 0.86 && ph < 0.98 && false);
  if (s > 0) {
    const rows = bare ? FRONT_B : FRONT_H;
    px.stamp(blink ? blinkOf(rows) : rows, hx, hy, LEG, 6, { ax: 6, ay: 9, ball: [6.5, 6, 7, 7], cast: 1 });
  } else {
    px.stamp(bare ? BACK_B : BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 9, ball: [6.5, 6, 7, 7], cast: 1 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "goblin-front", BOX: { w: 48, h: 48, ox: 24, oy: 42 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "goblin-back", BOX: { w: 48, h: 48, ox: 24, oy: 42 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };

// (Three-quarter turning poses were drawn and tried at the corners the same day; the owner
// preferred the plain switch: "Lets leave it as just side, front, and back.")
