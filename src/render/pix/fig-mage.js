// ============ FIGURE: the Spire's mage ============
// The wizard the owner approved as a concept ("mage is awesome"): pointed hat (its tip
// trails the body), long beard, a robe with gold trim, a staff. Now he is also the
// Wizard Spire's crew (render/halls/wizard.js, through pix/crews.js), so he comes in
// the hall's three LEVELS and every form's LIVERY:
//   o.variant  ""          the concept's own look: the crown's blue, an ember crystal in a
//                          gold claw, his own fireball (fx). The concept sheet draws this.
//              "L|key"     the hall's: L = 1 apprentice (no staff: the orb floats over his
//                          open palm, a young bare chin, a short hat), 2 staff-bearer (short
//                          beard), 3 long-beard (taller hat, wider hem, longer staff);
//                          key = base | a | aa | ab | b | ba | bb (LIVERY below: the old
//                          MAGE_FOLK palettes, plus the form's orb colour for his light).
// A hall mage's staff ends in an EMPTY gilt fork: the hall draws its live orb (it swells
// with the charge and takes the form's colour) at marks.tip, the fork's cup; the figure's
// own `light` sits there too and follows the pose's glow.
// Sized for the hall: the old crew figure stood 23.5 units to the crown of the head, so the
// bones are HUMAN x 1.3 (47 art px at two to a unit); the head is the same hand-pixelled grid.
// Clips: idle, walk, cast (a shot clip, `hit`), hold (the wind-up kept alive while there is
// no one to shoot), level (the way into and out of the breath), breath (Dragonbreath's loop).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, solve, ik, HUMAN, scaled } from "./rig.js";

const K = 1.3;
export const BOX = { w: 68, h: 72, ox: 24, oy: 67 };
export const BONES = scaled(HUMAN, K, { shN: -3.7, shF: 3.9 });
const ARM = BONES.upper + BONES.fore;

// ---- the looks ---------------------------------------------------------------------
const LIVERY = {
  base: { robe: "#5a4a8c", hat: "#3f3468", trim: "#d8b34a", orb: "#b08ad8" },
  a: { robe: "#8a3a2e", hat: "#5a2420", trim: "#e8a040", orb: "#f0903a" },
  aa: { robe: "#9a2420", hat: "#6a1616", trim: "#f0c050", orb: "#ff8a2a" },
  ab: { robe: "#c05a24", hat: "#2e2228", trim: "#f0c050", orb: "#f8b040" },
  b: { robe: "#2e4a7a", hat: "#1f3252", trim: "#8ce8f0", orb: "#8ce8f0" },
  ba: { robe: "#24406e", hat: "#182a48", trim: "#a8f0f8", orb: "#a8f0f8" },
  bb: { robe: "#3a3a80", hat: "#22224e", trim: "#f0e070", orb: "#f0e070" },
};
const CONCEPT = { robe: "#3b5b92", hat: "#34528a", trim: "#d8b34a", orb: "#ffb040" };
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toward = (c, to, t) => "#" + hex(c).map((v, i) => Math.round(v + (hex(to)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const WOOD = mat("#7a5334"), BOOT = mat("#4a3426"), BELT = mat("#6e4a2a"), SKIN = mat("#e8b990"), EYE = flat("#2a1c2c");
const EMBER = mat("#e8923a", { contrast: 1.2 }), HOT = flat("#fff6c8", { emis: true, line: "#e8923a" }), FLAME = flat("#ffb347", { emis: true, line: "#c85a28" });
const FIRE2 = flat("#f0722c", { emis: true, line: "#a83a22" }), FIRE3 = flat("#c8432a", { emis: true, line: "#7a2a2a" });

// The head, facing +x, a quarter turned: hair and beard behind and below, the face in
// front, the nose proud of it. (S skin, s skin a tone down, H beard / hair, h the same a
// tone down, E eye, N nose a tone up.) The hat's brim covers rows 0-2.
const TOP = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHsssssss..",
  ".HHSSSSSSSS..",
  ".HHSSESSSESN.",
  ".HhSSESSSESNN",
  ".HHSsSSSSSS..",
];
const HEADS = {
  // the long-beard
  3: [...TOP,
    ".HHHHHHHHHHH.",
    "..HHHHHHHHHH.",
    "..HhHHHHhHH..",
    "...HHhHHHHH..",
    "...HHHHhHH...",
    "....HhHHH....",
    ".....HHh....."],
  // the staff-bearer: a short trimmed beard
  2: [...TOP,
    ".HHHHHHHHHHH.",
    "..HHHhHHHHH..",
    "...HHHHhHH...",
    ".....HHh....."],
  // the apprentice: a bare young chin, his hair at the nape
  1: [...TOP,
    "..hSSSSSSSS..",
    "...sSSSSmS...",
    "....sSSs....."],
};
const blinkOf = (rows) => rows.map((r, i) => (i === 4 ? ".HHSSSSSSSSN." : i === 5 ? ".HhSSeSSSeSNN" : r));
const BLINKS = { 1: blinkOf(HEADS[1]), 2: blinkOf(HEADS[2]), 3: blinkOf(HEADS[3]) };

const LOOKS = new Map();
const lookOf = (variant) => {
  let L = LOOKS.get(variant);
  if (L) return L;
  const [lv, key] = variant ? variant.split("|") : ["3", ""];
  const level = Math.max(1, Math.min(3, Number(lv) || 3)), own = !variant, pal = own ? CONCEPT : LIVERY[key] || LIVERY.base;
  const HAIR = level === 1 ? mat("#8a5a34") : mat(own ? "#dcd6ca" : "#e8e0d0");
  L = {
    level, own, orb: pal.orb,
    ROBE: mat(pal.robe), SLEEVE: mat(toward(pal.robe, "#ffffff", 0.09)), HAT: mat(pal.hat), GOLD: mat(pal.trim, { contrast: 1.15 }),
    LEG: { S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, m: { m: SKIN, fix: 0 }, H: { m: HAIR }, h: { m: HAIR, bias: -1 }, E: { m: EYE } },
  };
  LOOKS.set(variant, L);
  return L;
};

// a belled sleeve: the upper arm, a forearm that widens to a flat cuff of trim short of the hand
const sleeve = (px, s, e, h, M, GOLD, z, o = {}) => {
  const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l], n = [-u[1], u[0]], back = Math.min(3.4, l * 0.5);
  const w = [h[0] - u[0] * back, h[1] - u[1] * back], c = [w[0] + u[0] * 2, w[1] + u[1] * 2], r0 = o.r0 ?? 3, r1 = o.r1 ?? 3.9;
  px.capsule(s[0], s[1], r0, e[0], e[1], r0, M, z, o);
  px.poly([[e[0] + n[0] * r0, e[1] + n[1] * r0], [w[0] + n[0] * r1, w[1] + n[1] * r1], [w[0] - n[0] * r1, w[1] - n[1] * r1], [e[0] - n[0] * r0, e[1] - n[1] * r0]], M, z, { ...o, round: 0.9 });
  px.poly([[w[0] + n[0] * r1, w[1] + n[1] * r1], [c[0] + n[0] * r1, c[1] + n[1] * r1], [c[0] - n[0] * r1, c[1] - n[1] * r1], [w[0] - n[0] * r1, w[1] - n[1] * r1]], GOLD, z + 0.01, { round: 0.9, bias: o.bias || 0 });
};
const edgeX = (a, b, y) => a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// Pose fields of his own (beside the rig's):
//   staff   the staff's tilt from upright (rad, + toward the foe)
//   gnd     1: its foot stands `lift` px off the walk (it slides through the fist);
//           0: `above` px of it stand above the fist (swung off the ground); between: blended
//   g2      0..1: the near hand on the staff too, `g2d` px down it from the far fist
//   aA, aB  the APPRENTICE's arms, in place of aF / aN: his conjuring (far) hand, his near hand;
//   oA      his orb from the conjuring hand
//   palm    the near hand open, cupped to the orb
//   glow    his light;  gust: a wind in his face (his own jet's back-blast)
export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const L = lookOf(o.variant || ""), lvl = L.level, { ROBE, SLEEVE, HAT, GOLD } = L;
  const { p, P, C, N, sN, sF, anN, anF, B } = sk;
  const armTo = (s, [ang, reach, flip]) => { const r = ik(s[0], s[1], s[0] + Math.sin(ang) * reach * ARM, s[1] + Math.cos(ang) * reach * ARM, B.upper, B.fore, flip > 0.5 ? -1 : 1); return [r.mid, r.end]; };
  let [eF, hdF] = lvl === 1 && p.aA ? armTo(sF, p.aA) : [sk.eF, sk.hdF], [eN, hdN] = lvl === 1 && p.aB ? armTo(sN, p.aB) : [sk.eN, sk.hdN];
  // (gust: a wind in his face bends hat and hem back)
  const vx = cl(C[0] - lag1.C[0] + (p.gust || 0), -2.4, 2.4), vx2 = cl(lag1.C[0] - lag2.C[0] + (p.gust || 0) * 0.6, -2.4, 2.4);
  const g = p.glow || 0, front = (p.staffFront || 0) > 0.5, sz = front ? 7 : 1.5;

  // the staff, in the far fist, standing before him
  let tip;
  if (lvl >= 2) {
    const tl = p.staff ?? 0.04, d = [Math.sin(tl), -Math.cos(tl)], n = [Math.cos(tl), Math.sin(tl)], LEN = lvl >= 3 ? 49 : 45, gnd = p.gnd ?? 1;
    const below = (LEN - (p.above ?? 24)) * (1 - gnd) + ((-(p.lift ?? 0.6) - hdF[1]) / Math.max(0.3, Math.cos(tl))) * gnd;
    const foot = [hdF[0] - d[0] * below, hdF[1] - d[1] * below];
    tip = [hdF[0] + d[0] * (LEN - below), hdF[1] + d[1] * (LEN - below)];
    if ((p.g2 || 0) > 0.01) {
      const q = p.g2d ?? 9.5, w = Math.min(1, p.g2), tx = hdN[0] + (hdF[0] - d[0] * q - hdN[0]) * w, ty = hdN[1] + (hdF[1] - d[1] * q - hdN[1]) * w;
      const r = ik(sN[0], sN[1], tx, ty, B.upper, B.fore, 1); eN = r.mid; hdN = r.end;
    }
    const at = (k, s = 0) => [tip[0] - d[0] * k + n[0] * s, tip[1] - d[1] * k + n[1] * s];
    px.part();
    if (L.own) {
      // the concept's ember crystal in a gold claw
      const e = at(3.2);
      px.capsule(foot[0], foot[1], 1.1, e[0], e[1], 1.1, WOOD, sz, { edge: true });
      px.part(); px.capsule(...at(4.6), 1.6, ...at(2.4), 2.3, GOLD, sz + 0.05);
      px.part();
      if (g > 0.55) { px.ellipse(tip[0], tip[1], 3.8, 3.8, FLAME, sz + 0.1); px.ellipse(tip[0], tip[1], 2.3, 2.3, HOT, sz + 0.12); }
      else if (g > 0.32) { px.ellipse(tip[0], tip[1], 3.4, 3.4, FLAME, sz + 0.1); px.ellipse(tip[0] - 0.3, tip[1] - 0.3, 1.5, 1.5, HOT, sz + 0.12); }
      else { px.ellipse(tip[0], tip[1], 3.3, 3.3, EMBER, sz + 0.1); px.dot(tip[0] - 1.5, tip[1] - 1.5, HOT, sz + 0.12); px.dot(tip[0] - 0.5, tip[1] - 1.5, HOT, sz + 0.12); }
    } else {
      // the hall's: a gilt fork, empty: the hall's live orb sits in its cup (at `tip`)
      const sp = lvl >= 3 ? 5 : 4.2, c0 = at(7.6), c1 = at(6);
      px.capsule(foot[0], foot[1], 1.1, c0[0], c0[1], 1.1, WOOD, sz, { edge: true });
      px.part(); px.capsule(c0[0], c0[1], 1.5, c1[0], c1[1], 2, GOLD, sz + 0.05);
      for (const s of [-1, 1]) { const a = at(5.6, s * 1.4), b = at(3.6, s * (sp - 0.6)), e = at(0.8, s * sp); px.capsule(a[0], a[1], 1, b[0], b[1], 0.9, GOLD, sz + 0.05); px.capsule(b[0], b[1], 0.9, e[0], e[1], 0.75, GOLD, sz + 0.05); }
    }
  } else {
    const oa = p.oA || [1, -5.5];
    tip = [hdF[0] + oa[0], hdF[1] + oa[1]];
  }

  // the far arm, a tone down, behind the body; its fist on the staff (the apprentice's open under his orb)
  px.part();
  sleeve(px, sF, eF, hdF, SLEEVE, GOLD, 1, { bias: -1, floor: 1, r0: 2.8, r1: 3.6 });
  px.part();
  if (lvl === 1) px.ellipse(hdF[0] + 0.4, hdF[1], 2.4, 1.7, SKIN, 1.7, { bias: -1 });
  else px.ellipse(hdF[0], hdF[1], 1.9, 2.1, SKIN, front ? 7.2 : 1.7, { bias: front ? 0 : -1 });

  // boots under the hem
  for (const [an, zz, b] of [[anF, 2, -1], [anN, 3, 0]]) { px.part(); px.ellipse(an[0] + 1.4, an[1] + 1.4, 3.2, 1.7, BOOT, zz, { bias: b }); }

  // the robe: shoulders to a hem shaped by where the feet are; it trails the body
  const W = lvl >= 3 ? 1 : 0.86, hemY = -1.4, top = C[1] - 2.3;
  const hemF = Math.max(P[0] + 8.4 * W, Math.max(anN[0], anF[0]) + 4.2) - vx * 0.9;
  const hemB = Math.min(P[0] - 9.6 * W, Math.min(anN[0], anF[0]) - 3.8) - vx * 1.4 - vx2 * 0.9;
  const wF = [P[0] + 6.3, P[1] - 2], wB = [P[0] - 7, P[1] - 2];
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 5.6, top], [C[0] + 5.8, top], [C[0] + 7.1, C[1] + 3.2], wF, [hemF, hemY], [hemB, hemY], wB, [C[0] - 7.3, C[1] + 3.2]], ROBE, 4, { round: 0.94, cast: 2, floor: 1 });
  // gold hem, belt and buckle
  const hy = hemY - 2.5;
  px.poly([[edgeX(wB, [hemB, hemY], hy), hy], [edgeX(wF, [hemF, hemY], hy), hy], [hemF, hemY], [hemB, hemY]], GOLD, 4.05, { round: 0.94 });
  px.poly([[wB[0] - 0.1, P[1] - 4.4], [wF[0] + 0.2, P[1] - 4.4], [wF[0], P[1] - 1.8], [wB[0], P[1] - 1.8]], BELT, 4.05, { round: 0.94 });
  px.rect(P[0] + 2, P[1] - 4.4, 2.6, 2.6, GOLD, 4.06, { fix: 3 });
  // folds: creases from the belt to the hem
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.toneLine(P[0] + 1.3, P[1] + 0.6, hm(0.56), hy - 0.5, -1, robeId);
  px.toneLine(P[0] - 3.4, P[1] + 4, hm(0.3), hy - 0.5, -1, robeId);
  if (lvl >= 3) px.toneLine(P[0] + 4.2, P[1] + 5, hm(0.8), hy - 0.5, -1, robeId);
  // the collar's gold
  px.line(C[0] - 3.9, top + 0.2, C[0] + 4.7, top + 0.2, GOLD, 4.06);

  // head and beard
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp((p.blink ? BLINKS : HEADS)[lvl], hx, hyy, L.LEG, 6, { ax: 6, ay: 8, ball: [6.5, 5, 7, 7], cast: 2 });

  // the hat: brim, band, a cone whose point lags behind and settles (taller with his years)
  const cx = hx + 0.5, by = hyy - 6.4, bend = 1 + cl(vx * 2.2 + vx2 * 1.6, -2.2, 3), hk = lvl >= 3 ? 1.24 : lvl === 2 ? 1.04 : 0.84;
  px.part();
  px.poly([[cx - 5.6, by], [cx + 5.4, by], [cx + 3.4 - bend * 0.2, by - 5 * hk], [cx + 0.9 - bend * 0.9, by - 9.6 * hk], [cx - 2.4 - bend * 1.9, by - 13.4 * hk + Math.abs(bend) * 0.5],
    [cx - 2.9 - bend * 1.0, by - 8.4 * hk], [cx - 4.6 - bend * 0.3, by - 4.2 * hk]], HAT, 6.4, { round: 0.95, ny: -0.15, floor: 1 });
  px.poly([[cx - 5.5, by - 2.2], [cx + 5.3, by - 2.2], [cx + 5.4, by], [cx - 5.6, by]], GOLD, 6.45, { round: 0.95 });
  px.dot(cx + 0.8 - bend * 0.3, by - 5.6 * hk, GOLD, 6.5, { fix: 4 });
  if (lvl >= 2) px.dot(cx - 1.6 - bend * 0.8, by - 8.8 * hk, GOLD, 6.5, { fix: 3 });
  if (lvl >= 3) px.dot(cx - 2.6 - bend * 0.5, by - 4.6 * hk, GOLD, 6.5, { fix: 3 });
  px.part();
  px.ellipse(cx + 0.4, by + 0.7, 8.6, 1.6, HAT, 6.6, { rot: -0.05, cast: 2, vb: 0.15, floor: 1 });

  // the near arm over it all: a belled sleeve, an open hand
  px.part();
  sleeve(px, sN, eN, hdN, SLEEVE, GOLD, 8, { cast: 2 });
  px.part(); px.ellipse(hdN[0], hdN[1], 2.3, 2.3, SKIN, 8.2);

  return { light: { x: tip[0], y: tip[1], r: 40, col: L.orb, k: g }, orb: tip, own: L.own, marks: { tip, hand: hdF, head: [N[0], N[1] - 3] } };
};

// The concept's own spell (the "" look only: on a hall the engine flies the real orb):
// gathering sparks, then the fireball leaving the staff (as far as his box runs)
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "cast" || !info.own || !info.orb) return;
  const [ox, oy] = info.orb, HIT = CLIPS.cast.hit, END = BOX.w - BOX.ox - 5;
  if (ph > 0.12 && ph < HIT) {
    const k = (ph - 0.12) / (HIT - 0.12);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + k * 2.2, r = (1 - ((k * 1.6 + i * 0.23) % 1)) * 11 + 2.5;
      px.dot(ox + Math.cos(a) * r, oy + Math.sin(a) * r * 0.8, i % 3 ? FLAME : HOT, 20);
    }
  }
  if (ph >= HIT) {
    const t = (ph - HIT) / (1 - HIT), x = ox + 4 + t * 34 * (1 + t * 0.6), y = oy + 1 + t * 3.5, r = 3.6 + Math.sin(t * 9) * 0.4;
    if (x < END) {
      for (let i = 5; i >= 1; i--) { const tx = x - i * (3.2 + t * 2.2), wob = Math.sin(i * 1.7 + t * 14) * 1.3; if (tx > ox + 2) px.ellipse(tx, y + wob - i * 0.25, Math.max(0.7, r - i * 0.62), Math.max(0.7, r - i * 0.7), i > 3 ? FIRE3 : FIRE2, 20 - i * 0.1); }
      px.ellipse(x, y, r + 0.3, r, FIRE2, 20.5); px.ellipse(x + 0.6, y, r - 1, r - 1.1, FLAME, 20.6); px.ellipse(x + 1.2, y, r - 2.2, r - 2.3, HOT, 20.7);
    }
    if (t < 0.18) px.ellipse(ox + 1, oy, 5 - t * 14, 5 - t * 14, HOT, 21);
  }
};

// ---- the poses ---------------------------------------------------------------------
// Hands are given as POINTS (art px from the feet) and turned into the rig's arm angles
// here, once, against the pose's own shoulders: F the far fist (the staff), N the near
// hand, A the apprentice's conjuring hand.
const armAt = (pose, far, [tx, ty]) => { const s = solve(pose, BONES), sh = far ? s.sF : s.sN, dx = tx - sh[0], dy = ty - sh[1]; return [Math.atan2(dx, dy), Math.min(1, Math.hypot(dx, dy) / ARM), 0]; };
const hands = (pose, h) => { const out = { ...pose, ...(h.F ? { aF: armAt(pose, true, h.F) } : {}), ...(h.N ? { aN: armAt(pose, false, h.N) } : {}), ...(h.A ? { aA: armAt(pose, true, h.A) } : {}) }; out.aB = h.B ? armAt(pose, false, h.B) : out.aN; return out; };
const BASE = { staff: 0.04, gnd: 1, lift: 0.6, above: 24.4, glow: 0.3, oA: [1, -5.5], g2: 0, g2d: 9.5, staffFront: 0, gust: 0, palm: 0, blink: 0 };
const READY = hands(BASE, { F: [13.3, -25.2], N: [0.6, -22], A: [11, -24] });
// the wind-up, HELD while there is no one to shoot: leaning back, the staff lifted off the
// walk, the free hand cupped under its head
const WIND = hands({ ...BASE, rx: -1.6, lean: -0.12, rise: 1.2, hy: -0.4, staff: -0.03, lift: 5, above: 23, glow: 0.9, oA: [1, -6], palm: 1 }, { F: [13.5, -31], N: [11, -35.5], A: [11, -33], B: [7, -33.5] });
// the strike: the staff driven at the foe, the body stepping in under it. Its fork's cup
// lands on the old figure's staff head (mageTip(level, "strike"): [26.4, -43] art px for the
// staffs, [25.6, -42.6] for the apprentice's orb), where the engine starts the real orb.
const STRIKE = hands({ ...BASE, rx: 2.4, drop: 1.2, lean: 0.17, hx: 0.6, fF: [6, 0], staff: 0.698, gnd: 0, above: 11.2, glow: 1, oA: [4.8, -2.6], palm: 1, aN: [-0.75, 0.9, 0] }, { F: [19.4, -34.4], A: [20.8, -40] });
// Dragonbreath's brace: both hands on a levelled staff, feet apart, shuddering against the
// blast. Its fork lands on the old brace's staff head ([31.6, -38.5]): the jet's mouth.
const brace = (ph) => {
  const a = ph * Math.PI * 2, s = Math.sin(a * 2), s2 = Math.sin(a * 3 + 1);
  return hands({ ...BASE, rx: 1.2 + 0.35 * s, drop: 1.6, lean: 0.1 + 0.02 * s2, hx: 0.5, fN: [-4.6, 0], fF: [5, 0], staff: 1.152 + 0.03 * s, gnd: 0, above: 16, staffFront: 1, glow: 0.9 + 0.1 * s2, gust: 1.3 + 0.5 * s2, g2: 1 }, { F: [17, -32], N: [8.3, -28.1] });
};

export const CLIPS = {
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.1,
    // a slow breath: the chest lifts, the staff (its foot planted) tips a hair after it, the free hand drifts
    pose: (ph) => { const b = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2), c = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2 - 1.1), arm = [READY.aN[0] + 0.07 * c, READY.aN[1], 0]; return { ...READY, rise: 1.3 * b, lean: -0.012 * b, staff: 0.04 - 0.014 * c, aN: arm, aB: arm, oA: [1, -5.5 - 0.6 * c], glow: 0.3 + 0.08 * b, blink: ph > 0.72 && ph < 0.86 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.4, lift: 2.8, swing: 0.36, bob: 1.2 }), a = Math.cos(ph * Math.PI * 2); return { ...BASE, ...w, aF: [0.8 + 0.12 * a, 0.86, 0], aA: [0.7 + 0.1 * a, 0.86, 0], aB: w.aN, staff: 0.08 - 0.2 * a, gnd: 0, above: 27 }; },
  },
  // The shot. Frames 0-6 gather and wind up (frame 6 is the pose he WAITS in), frame 7 is the
  // strike (hit = 7/13: the frame the engine's orb leaves on), then the follow-through.
  cast: {
    n: 14, ms: 1150, loop: false, lag: 0.06, hit: 7 / 13,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.22, e: "out", p: hands({ ...BASE, rx: -0.8, lean: -0.06, rise: 0.6, staff: 0.02, lift: 2.5, above: 24, glow: 0.55, palm: 1 }, { F: [13.4, -27.5], N: [8, -32], A: [11.5, -27.5], B: [5.5, -29] }) },
      { t: 6 / 13, e: "io", p: WIND },
      { t: 7 / 13, e: "in3", p: STRIKE },
      { t: 8 / 13, e: "out", p: hands({ ...BASE, rx: 3, drop: 1.6, lean: 0.22, hx: 0.8, fF: [6, 0], staff: 0.87, gnd: 0, above: 10.6, glow: 0.6, oA: [5.5, -1.5], aN: [-0.95, 0.9, 0] }, { F: [20.2, -32.6], A: [21, -36] }) },
      { t: 0.82, e: "io", p: hands({ ...BASE, rx: 0.8, drop: 0.4, lean: 0.05, fF: [3.5, 0], staff: 0.3, gnd: 0.5, lift: 2, above: 20, glow: 0.35, aN: [0.1, 0.84, 0] }, { F: [15.5, -27.5], A: [14, -27] }) },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
  // the wind-up kept alive: he breathes against the gathered power for as long as he must wait
  hold: {
    n: 8, ms: 1700, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), c = Math.cos(ph * Math.PI * 2); return { ...WIND, rise: 1.2 + 0.5 * b, staff: -0.03 + 0.012 * c, lift: 5 + 0.5 * b, glow: 0.9 + 0.1 * b, aN: [WIND.aN[0] + 0.03 * c, WIND.aN[1], 0], aB: [WIND.aB[0] + 0.03 * c, WIND.aB[1], 0], oA: [1, -6 - 0.5 * b] }; },
  },
  // Dragonbreath, the way in and out (the hall drives it by the breath, 0..1): the staff
  // swings down off the walk and he takes it in both hands
  level: {
    n: 6, ms: 420, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.5, e: "io", p: hands({ ...BASE, rx: 0.8, drop: 0.8, lean: 0.06, fN: [-3, 0], fF: [4, 0], staff: 0.66, gnd: 0, above: 16, glow: 0.55, g2: 0.4, gust: 0.4 }, { F: [15.6, -29.2], N: [5, -25] }) },
      { t: 1, e: "out", p: brace(0) },
    ], ph),
  },
  // Dragon's Breath: braced behind a levelled staff, pouring fire (the jet itself is the
  // hall's, it runs far past his box). The staff shudders, and the back-blast streams hat
  // and hem behind him.
  breath: { n: 8, ms: 520, loop: true, lag: 0.1, pose: brace },
};
