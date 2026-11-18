// ============ the castle's HALBERDIER seen from the FRONT and from BEHIND ============
// Same man as fig-halberdier.js (steel helm over a mail aventail, tabard in the castle's colour, gold
// belt and hem, halberd a head and a half taller than he is) walking toward the camera (FRONT) or
// away (BACK). One drawer, `make(s)`: s = +1 front, -1 back. His RIGHT hand carries the halberd (screen
// LEFT in front, RIGHT from behind: `rs`); the blade of the axe lies outward of the haft (foreshortened
// from the side view's "toward the foe" into a face-on plate), the fluke inward, the spike up. The far (left)
// arm swings free. Walk: the side clip's own n, ms and pose (frame 0 the same stride moment), feet,
// bob and arm swing read from the solved skeleton as fig-goblin-views does. Variants: guard (crimson), sentry (blue).
// Unflipped on the board: one sun, upper left.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES, BOX as SIDE_BOX } from "./fig-halberdier.js";

const SKIN = mat("#e8b990"), EYE = flat("#2a1c2c"), LIP = flat("#b0705a"), BROW = mat("#6a4a30");
const STEEL = mat("#8a909c", { contrast: 1.2 }), MAIL = mat("#727a8a", { contrast: 1.1 }), BLADE = mat("#d8dce4", { contrast: 1.3 });
const WOOD = mat("#6a4a2e"), LEATHER = mat("#5a3c28"), GOLD = mat("#d8b34a", { contrast: 1.15 }), BOOT = mat("#2a2a30", { contrast: 1.25 }), HOSE = mat("#4e5462");
const COATS = { guard: "#7c3f4a", sentry: "#3a5474" };
const LOOKS = new Map();
const look = (v) => {
  if (!COATS[v]) v = "guard";
  let L = LOOKS.get(v);
  if (!L) LOOKS.set(v, (L = { COAT: mat(COATS[v]) }));
  return L;
};

const LEG = {
  M: { m: STEEL }, W: { m: STEEL, bias: 1 }, m: { m: STEEL, bias: -1 }, c: { m: MAIL }, d: { m: MAIL, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, l: { m: LIP }, b: { m: BROW, fix: 1 }, G: { m: GOLD, fix: 3 },
};
// FRONT: the helm's dome with its band, brow, two eyes, the nose down the middle, lips, chin, the mail gorget. 13 wide, centre col 6.
const FRONT_H = [
  "....MMMMM....",
  "..MMMWWMMMM..",
  ".MMMWMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".MmmmmmmmmmM.",
  ".MMbbbSbbbMM.",
  ".MSSESSSESSM.",
  ".MSSSSNSSSSM.",
  ".dMsSSNSSsMd.",
  ".ddMSllllSMd.",
  "..ddMsSSSMd..",
  "..cccccccccc.",
];
const BLINK = FRONT_H.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/N/g, "N") : r));
// BACK: the dome with its ridge seam and rivets, the band, then the mail aventail over the nape.
const BACK_H = [
  "....MMMMM....",
  "..MMMWmWMMM..",
  ".MMMWMmMMMMM.",
  ".MMMMMmMMMMM.",
  ".MmmmmmmmmmM.",
  ".MMMMMmMMMMM.",
  ".McMMMmMMMcM.",
  ".cccccddcccc.",
  ".cdccdcccdcc.",
  "..ccdcccdcc..",
  "..cccdcccdc..",
  "..cccccccccc.",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F, o = {}) => {
  const L = look(String(o.variant || "").split("@")[0]), rs = -s, ls = s;
  const { sk, ph } = F, p = sk.p, TAU = Math.PI * 2;
  const lagT = 0.08;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);                  // sways over the planted foot
  const sx = sw(ph), sx1 = sw(ph - lagT);
  const hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1], hx = Math.round(sx * 0.7), hipJ = sk.hN[1];
  const vx = cl((sx - sx1) * 1.3, -2, 2);

  // far arm (his left, screen side ls): hangs a little out, swinging, a gauntlet fist
  {
    const ang = (p.aF || [0.1, 0.9, 0])[0];
    const sh = [ls * 5.3 + sx, chestY + 1.2], el = [ls * 7.2 + sx, sh[1] + 4.8], hd = [ls * 7 + sx, sh[1] + 10 + s * ang * 2.2];
    px.part();
    px.capsule(sh[0], sh[1], 2.1, el[0], el[1], 2.0, MAIL, s > 0 ? 3.2 : 4.3, { bias: -1 });
    px.capsule(el[0], el[1], 2.0, hd[0], hd[1], 1.7, MAIL, s > 0 ? 3.2 : 4.3, { bias: -1 });
    px.capsule(el[0] * 0.3 + hd[0] * 0.7, el[1] * 0.3 + hd[1] * 0.7, 1.8, el[0] * 0.15 + hd[0] * 0.85, el[1] * 0.15 + hd[1] * 0.85, 1.8, LEATHER, s > 0 ? 3.22 : 4.32, { bias: -1 });
    px.part(); px.ellipse(hd[0], hd[1] + 0.4, 1.7 + s * ang * 0.2, 1.7, SKIN, s > 0 ? 3.3 : 3.6, { bias: -1 });
  }

  // legs: a hip apart, boots; forward is down the screen (front) or up it (back)
  const feet = [[p.fF, sk.anF, ls, 2], [p.fN, sk.anN, rs, 3]];
  for (const [f, an, side, z] of feet) {
    const lift = Math.max(0, -2.4 - an[1]), fx = hx + side * 3.6, fy = an[1] + s * f[0] * FWD;
    const hp = [hx + side * 2.6, hipJ], kn = [(hp[0] + fx) / 2 + side * 0.9, (hp[1] + fy) / 2 - lift * 0.3 - (s > 0 ? 0 : 0)];
    const b = side === rs ? 0 : -1;
    px.part();
    px.capsule(hp[0], hp[1], 2.5, kn[0], kn[1], 2.2, HOSE, z, { bias: b, floor: 1 });
    px.capsule(kn[0], kn[1], 2.1, fx, fy - 2.5, 1.8, HOSE, z, { bias: b, floor: 1 });
    px.capsule(kn[0] * 0.4 + fx * 0.6, kn[1] * 0.4 + (fy - 2.5) * 0.6, 2.2, fx, fy, 2.0, BOOT, z + 0.02, { bias: b, floor: 1 });
    if (s > 0) px.ellipse(fx, fy + 1.4, 2.6, 1.7, BOOT, z + 0.03, { bias: b, floor: 1 });
    else { px.ellipse(fx, fy + 1, 2.2, 1.4, BOOT, z + 0.03, { bias: b, floor: 1 }); if (lift > 0.8) px.ellipse(fx, fy + 2.4, 1.9, 1.4 * cl(lift / 2.4, 0.3, 1), BOOT, z + 0.03, { bias: -2 }); }
  }

  // the mail skirt, the tabard to a gold hem, the belt
  const hemY = hipY + 4.6, hemW = 5.8;
  px.part();
  px.poly([[sx - 4.4, hipY - 3], [sx + 4.4, hipY - 3], [hx + hemW - 0.4, hemY + 2.2], [hx - hemW + 0.4, hemY + 2.2]], MAIL, 3.9, { round: 0.92, bias: -1 });
  px.part(); const coat = px._pid;
  px.poly([[sx - 4.8, chestY - 2], [sx + 4.8, chestY - 2], [sx + 5.8, chestY + 3.2], [hx + 4.3, hipY - 4], [hx + hemW, hemY], [hx - hemW, hemY], [hx - 4.3, hipY - 4], [sx - 5.8, chestY + 3.2]], L.COAT, 4, { round: 0.92, cast: 2 });
  px.toneLine(hx - 0.5 * s, hipY - 2, hx, hemY - 1.4, -1, coat);
  px.line(hx - hemW + 0.6, hemY - 0.6, hx + hemW - 0.6, hemY - 0.6, GOLD, 4.04);
  px.poly([[hx - 4.7, hipY - 5], [hx + 4.7, hipY - 5], [hx + 4.8, hipY - 3], [hx - 4.8, hipY - 3]], LEATHER, 4.05, { round: 0.92 });
  px.part();
  if (s > 0) {
    px.rect(hx - 1, hipY - 5, 2, 2, GOLD, 4.06, { fix: 3 });                  // the buckle
    px.rect(sx - 1, chestY + 4.6, 3, 2, GOLD, 4.06, { fix: 3 }); px.dot(sx - 1, chestY + 3.8, GOLD, 4.06, { fix: 3 }); px.dot(sx + 1, chestY + 3.8, GOLD, 4.06, { fix: 3 });   // the crown's badge
  } else {
    px.line(hx - 3, hipY - 4, hx - 1, hipY - 4, GOLD, 4.06, { fix: 3 });       // the belt's tail and keeper
    px.dot(hx + 3, hipY - 4, GOLD, 4.06, { fix: 3 });
    px.line(sx - 2.6, chestY + 1, sx + 2.6, chestY + 1, GOLD, 4.06, { fix: 3 });   // a gold yoke across the back
  }
  // the aventail over the shoulders
  px.part();
  px.poly([[sx - 5.6, chestY - 3.2], [sx + 5.6, chestY - 3.2], [sx + 6.4, chestY + 0.6], [sx + 2.6, chestY + 2], [sx - 2.6, chestY + 2], [sx - 6.4, chestY + 0.6]], MAIL, 5, { round: 0.9, cast: 1 });

  // the head
  px.part();
  const rows = s > 0 ? (p.blink ? BLINK : FRONT_H) : BACK_H;
  px.stamp(rows, hx, hy, LEG, 6, { ax: 6, ay: 12, cast: 2, ball: [6.5, 4, 7, 7] });

  // the halberd in his right hand: haft upright at his side, butt off the flags, the axe blade outward
  const hdx = rs * (s > 0 ? 8 : 7.4) + sx, hdy = sk.hdN[1], a = Math.cos(ph * TAU) * 0.035;
  const butt = [hdx - 32 * Math.sin(a) * -0, hdy + 32], top = [hdx + 64 * Math.sin(a) * 0, hdy + 32 - 64];
  const kb = s > 0 ? 1 : 0.5, bz = s > 0 ? 7.06 : 0.9;     // from behind the blade runs forward, away from us: mostly hidden behind the haft
  const at = (u, b) => [top[0] + rs * b * (b > 0 ? kb : 1), top[1] - u];
  px.part();
  const hz = s > 0 ? 7 : 1; px.capsule(butt[0], butt[1], 0.95, top[0], top[1], 0.95, WOOD, hz, { edge: s > 0 });
  px.capsule(butt[0], butt[1], 1.1, butt[0], butt[1] - 1.6, 1.1, STEEL, hz + 0.01);
  px.part();
  px.capsule(...at(-11.5, 0), 1.25, ...at(0, 0), 1.25, STEEL, hz + 0.05);
  px.capsule(...at(0, 0), 1.0, ...at(6, 0), 0.35, BLADE, hz + 0.05);
  px.poly([at(-9.6, 0.6), at(-11.4, 5.4), at(-6.2, 6.6), at(-0.8, 5.2), at(-2.6, 0.6)], STEEL, bz, { n: [rs * 0.1, 0.2, 0.95] });
  px.line(...at(-10.6, 5.6), ...at(-1.6, 5.4), BLADE, bz + 0.01, { fix: 4 });
  px.poly([at(-7.8, -0.6), at(-6.4, -4.4), at(-4.4, -0.6)], STEEL, hz + 0.06, { n: [-rs * 0.3, -0.4, 0.86] });

  // the near arm (his right): mail sleeve to a leather cuff, his fist on the haft
  {
    const sh = [rs * 5.3 + sx, chestY + 1.2];
    // FRONT: the forearm comes up to the haft. BACK: the arm hangs straight down at his side to the haft, the back of the fist toward us, thumb inward
    const hd = s > 0 ? [hdx, hdy + 2] : [hdx, hdy + 3], el = s > 0 ? [rs * 8.4 + sx, (sh[1] + hd[1]) / 2 + 0.5] : [rs * 7.8 + sx, chestY + 3.2];
    px.part();
    const az = s > 0 ? 8 : 4.3, ao = s > 0 ? { cast: 2 } : { cast: 0, bias: -1 }; px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.2, MAIL, az, ao);
    px.capsule(el[0], el[1], 2.2, hd[0], hd[1], 1.9, MAIL, az, ao);
    px.capsule(el[0] * 0.28 + hd[0] * 0.72, el[1] * 0.28 + hd[1] * 0.72, 2.0, el[0] * 0.16 + hd[0] * 0.84, el[1] * 0.16 + hd[1] * 0.84, 2.0, LEATHER, az + 0.02);
    px.part(); if (s > 0) px.ellipse(hd[0], hd[1], 1.8, 1.8, SKIN, 8.2); else px.ellipse(hd[0], hd[1] + 1.2, 1.5, 1.5, SKIN, 3.6, { bias: -1 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "halberdier-front", BOX: { w: 64, h: 82, ox: 32, oy: SIDE_BOX.oy }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "halberdier-back", BOX: { w: 64, h: 82, ox: 32, oy: SIDE_BOX.oy }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
