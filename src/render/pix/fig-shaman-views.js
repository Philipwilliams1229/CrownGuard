// ============ CONCEPT FIGURES: the Goblin Shaman seen from the FRONT and from BEHIND ============
// The shaman of fig-shaman.js (approved look: robe, gold hem and collar, circlet and three feathers,
// long ears, the claw staff with its teal orb) walking toward the camera (FRONT) and away (BACK).
// One drawer, `make(s)`: s = +1 front, -1 back. The staff is in his LEFT hand (screen RIGHT in
// front, screen LEFT from behind: `ls`); his RIGHT arm swings free (`rs`). Unflipped on the board;
// one sun upper left. The walk keeps the side clip's n, ms and phase and reads its feet, bob, arm
// swing and the staff's planting (`p.sx`, `p.lift`) from the same pose. Forward is DOWN the
// screen in FRONT and UP in BACK, foreshortened (FWD). Returns the same `light` the side draw does
// (the orb's glow) and `orb`, so the lit walk is the same.
import { mat, flat } from "./pix.js";
import { carry, damp } from "./carry.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-shaman.js";

const SKIN = mat("#6aa04f"), ROBE = mat("#8a4a3a"), SLEEVE = mat("#9a5844"), GOLD = mat("#e8c14a", { contrast: 1.15 }), DARK = mat("#3c2a18");
const WOOD = mat("#6a4a2a"), BONE = mat("#ece0c4"), ORB = mat("#7ce0b8", { contrast: 1.3 });
const F_RED = mat("#c8383a"), F_GOLD = mat("#e8c14a"), F_BLUE = mat("#3a80c0");
const EYE = flat("#c8453a"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const GLOW = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), HOT = flat("#eafff4", { emis: true, line: "#7ce0b8" });

const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
  Y: { m: GOLD, fix: 3 }, y: { m: GOLD, fix: 1 },
};
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);

// FRONT: the bald dome, the gold circlet across the brow, the heavy brow (B), red eyes (E, glint e), the hooked nose
// (L N n) down the middle over the lip, a small grin of odd teeth (T) in a dark mouth (M). 13 wide, centre column 6.
const FRONT_H = [
  "....GGGGG....",
  "..GGGGGGGGG..",
  ".yYYYYYYYYYy.",
  ".GGGGGGGGGGG.",
  ".GBBBBGBBBBG.",
  ".GGeEBGBeEGG.",
  ".GGEEGLGEEGG.",
  ".GGGGGNGGGGG.",
  ".gGGGGnNnGGg.",
  ".ggGMTMNMTMg.",
  "..gGGMMTMMGg.",
  "...gGGGGGGg..",
  ".....ggg.....",
];
const FRONT_BLINK = swap(FRONT_H, { 5: ".GGGGGGGGGGG.", 6: ".GGBBGLGBBGG." });
// BACK: the dome, the circlet's back and its clasp, the nape and the shadow under the ears; no face.
const BACK_H = [
  "....GGGGG....",
  "..GGGGGGGGG..",
  ".yyYYYYYYYyy.",
  ".GGGGGYGGGGG.",
  ".GGLGGGGGGgG.",
  ".GGGGGgGGGGG.",
  ".GGGGGGGGgGG.",
  ".GGGGGGGGGGG.",
  ".gGGGGGgGGGg.",
  "..gGGGGGGGg..",
  "...ggGGGgg...",
  ".....ggg.....",
  ".............",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const STAFF = 36;

// the staff's own angle from straight up (+ forward), read from the side file's walk: planted, it leans from its foot (p.sx) to the fist
const aOf = (q) => { const h = q.hdF, hg = Math.max(2, -h[1] - (q.p.lift || 0)); return Math.atan2(h[0] - (q.p.sx ?? h[0]), hg); };
const aMean = (F) => { let m = 0; for (let i = 0; i < 8; i++) m += aOf(F.at(i / 8)); return m / 8; };

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;                                   // screen side of his right / left
  const { sk, ph } = F, p = sk.p;
  const lagT = 0.09;
  const sw = (t) => rs * 0.8 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - lagT), sx2 = sw(ph - lagT * 2);
  const hipY = sk.P[1], chestY = sk.C[1] + 1.5, hy = Math.round(sk.N[1] + 0.5), hx = Math.round(sx * 0.6);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -2, 2);
  const vx = cl((sx - sx1) * 1.3, -2, 2), vx2 = cl((sx1 - sx2) * 1.3, -2, 2);
  const g = p.glow || 0, lift = p.lift || 0;
  const zs = (z) => (s > 0 ? z : z - 0.5);                  // the BACK stack: carried things sit at 1.0, under everything
  const B = s < 0, ax = B ? 0 : sx * 0.8;                    // from behind an arm swings in y only

  // ---- the staff, in his left fist, standing a little out from the body. Planted while he passes it
  // (the foot slides from ahead of him to behind, foreshortened), then swung on ahead and lifted.
  // ONE pose (carry.js): the staff's angle and the fist's height come from the side walk; FRONT and BACK project it
  const SX = ls * 10.4 + sx * 0.6, hgY = sk.hdF[1], hgt = Math.max(2, -hgY - lift);
  const aS = damp(aOf(sk), aMean(F)), lo = cl(hgt / Math.max(0.3, Math.cos(aOf(sk))), 5, STAFF - 5);
  const C = carry(aS, s, { rs: ls, hand: [SX, hgY], len: STAFF - lo, butt: lo, upright: 0.35 });
  const L = STAFF - lo, at = (a, b) => (a < 0 ? C.at(L + a, b) : C.head(L, a, b));
  const foot = C.at(-lo), fY = foot[1], tipX = at(0, 0)[0], tipY = at(0, 0)[1];
  const orb = at(4.2, 0);
  px.part();
  px.capsule(foot[0], foot[1], 0.9, tipX, tipY, 0.9, WOOD, zs(1.5), { edge: s > 0 });
  { const k = at(-9, 0.6); px.dot(k[0], k[1], WOOD, zs(1.51), { fix: 3 }); const k2 = at(-17, -0.6); px.dot(k2[0], k2[1], WOOD, zs(1.51), { fix: 1 }); }
  px.part();
  px.capsule(...at(-1.4, 0), 1.3, ...at(0, 0), 1.5, GOLD, zs(1.55));
  // the charm: a finger bone on its string, swinging a beat behind
  {
    const csw = cl(-(sx - sx1) * 1.6, -2, 2), c1 = at(-1.6, 1.2 * rs);
    px.part();
    px.line(c1[0], c1[1], c1[0] + 0.5 + csw * 0.4, c1[1] + 2, DARK, zs(1.52));
    px.line(c1[0] + 0.5 + csw * 0.4, c1[1] + 2.6, c1[0] + 0.8 + csw * 0.7, c1[1] + 4.6, BONE, zs(1.53), { fix: 3 });
  }
  // the claw: the shaft forks and curls up round the orb
  px.part();
  px.line(...at(0.6, -1.6), ...at(3.6, -3.2), WOOD, zs(1.58), { fix: 1 }); px.line(...at(3.6, -3.2), ...at(6, -2.4), WOOD, zs(1.58), { fix: 2 });
  px.line(...at(0.6, zs(1.6)), ...at(3.6, 3.2), WOOD, zs(1.58), { fix: 2 }); px.line(...at(3.6, 3.2), ...at(6, 2.4), WOOD, zs(1.58), { fix: 3 });
  px.part();
  {
    const ox = Math.round(orb[0] - 0.5) + 0.5, oy = Math.round(orb[1] - 0.5) + 0.5;
    if (g > 0.75) { px.ellipse(ox, oy, 3.1, 3.1, GLOW, zs(1.6)); px.ellipse(ox, oy, 1.9, 1.9, HOT, zs(1.62)); }
    else if (g > 0.4) { px.ellipse(ox, oy, 2.6, 2.6, GLOW, zs(1.6)); px.ellipse(ox - 0.5, oy - 0.5, 1.1, 1.1, HOT, zs(1.62)); }
    else {
      px.ellipse(ox, oy, 2.6, 2.6, ORB, zs(1.6));
      if (g > 0.22) { px.dot(ox - 1, oy - 1, HOT, zs(1.62)); px.dot(ox, oy - 1, GLOW, zs(1.62)); px.dot(ox - 1, oy, GLOW, zs(1.62)); }
      else px.dot(ox - 1, oy - 1.4, ORB, zs(1.62), { fix: 4 });
    }
  }

  // ---- the left arm (staff side): wide sleeve, gold cuff, fist round the shaft. From behind: both arms at 4.3, the fist under the cuff at 3.6.
  {
    const sh = [ls * 6.2 + sx, chestY + 0.6], el = [ls * 8.6 + ax, chestY + 3.8], fist = [SX, hgY];
    const za = B ? 4.3 : 4.5, zc = B ? 4.35 : 4.6, zf = B ? 3.6 : 4.7, fr = B ? 1.6 : 2.4;
    px.part();
    px.capsule(sh[0], sh[1], 1.9, el[0], el[1], 2, SLEEVE, za, B ? { cast: 0 } : { bias: -1 });
    px.capsule(el[0], el[1], 2, fist[0] - ls * 0.4, fist[1] - 1.2, 2.4, SLEEVE, za, B ? { cast: 0 } : { bias: -1 });
    px.poly([[fist[0] - 2.7, fist[1] - 2.6], [fist[0] + 2.7, fist[1] - 2.6], [fist[0] + 2.7, fist[1] - 0.9], [fist[0] - 2.7, fist[1] - 0.9]], GOLD, zc, { round: 0.8 });
    px.part();
    px.ellipse(fist[0], fist[1] + 0.6, fr, fr + 0.2, SKIN, zf, B ? { cast: 0 } : { bias: -1 });
    if (!B) { px.dot(fist[0] - 1, fist[1] - 0.6, SKIN, 4.75, { fix: 0 }); px.dot(fist[0] - 1, fist[1] + 1.4, SKIN, 4.75, { fix: 0 }); }   // the fingers closed over the shaft
  }

  // ---- bare shins and big flat feet under the hem: forward is down the screen (front) or up it (back)
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lf = f[1], fx = hx + side * 3, fy = -1.8 + s * f[0] * FWD - lf * 0.9;
    const hp = [hx + side * 1.8, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.6, (hp[1] + fy) / 2 - lf * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 1.9, kn[0], kn[1], 1.7, SKIN, z + lf * 0.05, { bias: side === rs ? 0 : -1 });
    px.capsule(kn[0], kn[1], 1.6, fx, fy, 1.25, SKIN, z + lf * 0.05, { bias: side === rs ? 0 : -1 });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1.2, 2.3, 1.35, SKIN, z + 0.4 + lf * 0.05, { bias: side === rs ? 0 : -1 });
    else {
      px.ellipse(fx, fy + 0.9, 1.8, 1.2, SKIN, z + 0.4 + lf * 0.05, { bias: side === rs ? 0 : -1 });
      if (lf > 0.8) px.ellipse(fx, fy + 2.6, 1.7, 1.9 * cl(lf / 2.2, 0.3, 1), SKIN, z + 0.45, { bias: -2 });
    }
  }

  // ---- the robe: a hunched barrel from the shoulders, belling to a gold hem at the shins
  const hemY = -5.2, top = chestY - 3.3, flare = 7.3 + 0.35 * Math.abs(Math.sin(ph * TAU));
  const hemL = hx - flare + sx * 0.2, hemR = hx + flare + sx * 0.2, hm = (t) => hemL + (hemR - hemL) * t;
  px.part(); const robeId = px._pid;
  px.poly([[sx - 5.6, top], [sx + 5.6, top + 0.2], [sx + 6, chestY + 3], [hx + 4.9, hipY - 1.4], [hemR, hemY - 2.2], [hemR, hemY],
    [hemL, hemY], [hemL, hemY - 2.2], [hx - 4.9, hipY - 1.4], [sx - 6, chestY + 3]], ROBE, 4, { round: 0.9, cast: 1 });
  px.toneLine(hx - 1.4, hipY + 0.6, hm(0.3), hemY - 2.4, -1, robeId);
  px.toneLine(hx + 1.4, hipY + 0.4, hm(0.72), hemY - 2.4, 1, robeId);
  px.poly([[hemL, hemY - 1.9], [hemR, hemY - 1.9], [hemR, hemY], [hemL, hemY]], GOLD, 4.04, { round: 0.9 });
  for (let t = 0.1; t < 0.95; t += 0.2) px.tone(hm(t), hemY - 2.6, -1, robeId);
  // the cord round the hip
  px.poly([[hx - 5, hipY - 2.9], [hx + 5, hipY - 2.9], [hx + 5, hipY - 1.5], [hx - 5, hipY - 1.5]], DARK, 4.05, { round: 0.92, floor: 1 });
  {
    const csw = cl(-(sx - sx1) * 1.2, -1.5, 1.5);
    px.part();
    if (s > 0) {
      px.line(hx + 2.6, hipY - 1.4, hx + 2.6 + csw * 0.5, hipY + 0.2, BONE, 4.2, { fix: 3 });          // a finger bone at the front hip
      px.line(hx + 2.6 + csw * 0.5, hipY + 0.8, hx + 2.6 + csw, hipY + 2.4, BONE, 4.2, { fix: 2 });
    } else {
      px.part();
      px.ellipse(hx - 3.2 + csw * 0.4, hipY + 0.6, 1.8, 2, DARK, 4.15, { floor: 1 });                  // the pouch at the back hip
      px.dot(hx - 3.2 + csw * 0.4, hipY - 0.6, GOLD, 4.2, { fix: 2 });
    }
  }
  // the gold collar and the string of teeth and beads under it (front) / the collar's back (behind)
  px.part();
  px.poly([[sx - 4, top - 0.2], [sx + 4, top - 0.1], [sx + 4.3, top + 1.2], [sx - 4.3, top + 1.2]], GOLD, 4.2, { round: 0.9 });
  if (s > 0) {
    const bw = cl(-(sx - sx1) * 0.8, -1, 1);
    const beads = [[-2.6, 3, BONE], [-1.2, 4.2, ORB], [0.2 + bw * 0.3, 4.8, BONE], [1.6 + bw * 0.4, 4.2, ORB], [2.8, 3, BONE]];
    for (const [x, y, m] of beads) px.dot(sx + x, top + y, m, 4.31, { fix: 3 });
  } else px.toneLine(sx, top + 2, hx, hipY - 3.2, -1, robeId);                                        // the robe's back seam

  // ---- the head: the ears behind, the feathers, the dome
  const ey = -vy * 1.3 - vy2 * 0.9, ex = -vx * 1.1 - vx2 * 0.7;
  for (const side of [-1, 1]) {
    px.part(); const eid = px._pid;
    const rr = side, wob = ey * 0.6 + (side === rs ? vx * 0.6 : -vx * 0.6);
    const rt = (xx, yy) => [hx + rr * xx, hy + yy];
    px.poly([rt(4.8, -5.6), rt(5.6, -2), rt(9.2, -4.6 + wob * 0.4), rt(13.6, -9 + wob), rt(9.2, -8.2 + wob * 0.4)], SKIN, s > 0 ? 5.5 : 5.6, { bias: s > 0 ? -1 : 0, n: [rr * 0.3, -0.35, 0.9], cast: 1 });
    px.toneLine(...rt(5.8, -4), ...rt(11, -7.2 + wob * 0.8), -1, eid);
  }
  px.part();
  px.stamp(s > 0 ? (p.blink ? FRONT_BLINK : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 6.5, 7.5, 7.5], cast: 1 });
  {
    const bend = cl(vx * 2 + vx2 * 1.4, -2.4, 2.8), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5), root = [hx, hy - 8];
    const feather = (dx0, ang, len, m, z, k) => {
      const r = [root[0] + dx0, root[1]], dx = Math.sin(ang), dy = -Math.cos(ang);
      const mid = [r[0] + dx * len * 0.5 - bend * 0.35 * k, r[1] + dy * len * 0.5 - bob * 0.3];
      const tip = [r[0] + dx * len - bend * k, r[1] + dy * len - bob * 0.8 + Math.abs(bend) * 0.35 * k];
      px.part();
      px.capsule(r[0], r[1], 0.7, mid[0], mid[1], 1.45, m, z);
      px.capsule(mid[0], mid[1], 1.45, tip[0], tip[1], 0.55, m, z);
    };
    // from the front: red left, gold, blue right (as the side view's front-to-back); from behind the order flips with the screen
    feather(-3 * s, -0.55 * s, 9, F_RED, 5.4, 1.2);
    feather(0, 0.08 * s, 11.5, F_GOLD, 5.35, 1.0);
    feather(3 * s, 0.55 * s, 10, F_BLUE, 5.3, 0.9);
  }

  // ---- the right arm (free side), over the robe: wide sleeve, gold cuff, hand swinging
  {
    const ang = p.aN[0];
    const sh = [rs * 6.2 + sx, chestY + 0.6], el = [rs * 8.4 + ax, chestY + 3.8], hand = [rs * 7.6 + ax, chestY + 7.6 + s * ang * 2.4];
    const wr = [(el[0] * 0.26 + hand[0] * 0.74), (el[1] * 0.26 + hand[1] * 0.74)];
    px.part(); px.tag("nearArm");
    const za = B ? 4.3 : 7.9;
    px.capsule(sh[0], sh[1] + 0.3, 2.1, el[0], el[1], 2.1, SLEEVE, za, { cast: B ? 0 : 2 });
    px.capsule(el[0], el[1], 2.1, wr[0], wr[1], 2.5, SLEEVE, za, { cast: B ? 0 : 2 });
    px.poly([[wr[0] - 2.7, wr[1] - 1], [wr[0] + 2.7, wr[1] - 1], [wr[0] + 2.7, wr[1] + 0.6], [wr[0] - 2.7, wr[1] + 0.6]], GOLD, B ? 4.35 : 7.95, { round: 0.8 });
    px.part();
    px.ellipse(hand[0], hand[1] + 0.6, B ? 1.5 : 1.7 + s * ang * 0.25, B ? 1.6 : 1.8, SKIN, B ? 3.6 : 8.3, B ? { cast: 0 } : {});
    px.tag(null);
  }

  const k = cl(g, 0, 1.4);
  return {
    light: k > 0.05 ? { x: orb[0], y: orb[1], r: 14 + 22 * cl(k, 0, 1), col: "#7ce0b8", k: Math.min(k, 0.4 + 0.25 * k) } : null,
    orb, feet: [hx, 0], hemB: hemL, hemF: hemR,
  };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "shaman-front", BOX: { w: 60, h: 74, ox: 30, oy: 66 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "shaman-back", BOX: { w: 60, h: 74, ox: 30, oy: 66 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
