// ============ the Covert's BLADE seen from the FRONT and from BEHIND ============
// Same figure as fig-blade.js (a deep cowl running into a short mantle, the face in its shade with a glint of
// eye and a cloth over the mouth, a close jerkin crossed by a baldric, a split cloak trailing, the house's
// scarf at the nape, wrapped shins, soft boots, a knife carried reversed low) walking toward the camera
// (FRONT) or away (BACK). One drawer `make(s)`: s = +1 front, -1 back. His RIGHT hand holds the knife
// (screen LEFT in front, RIGHT from behind: `rs`); twin-bladed forms carry the second in his left.
// The knife points the way he walks, so it is foreshortened: a short wedge of steel below the fist in
// FRONT; from BEHIND only the pommel, the cross-guard and a tip showing out past the hip.
// Variants (the side file's own palettes, copied here because they are not exported): base, a, b, aa (gilt
// half-mask, estoc), ab (wide hat, plume, pauldron, purse, scroll), ba (lace veil, long coat, needle),
// bb (beak mask, swinging censer). Walk: the side clip's n, ms, pose, so views switch mid-stride.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES, BOX as SIDE_BOX } from "./fig-blade.js";

// ---- the side file's palettes, kit (copy) ----
const LOOKS = {
  base: { cloak: "#3e3a4c", leather: "#6a5040", hood: "#565068", accent: "#8a3a38", steel: "#c4c8d0", trim: "#b8bcc4", eyes: "#f0d890", mask: "#2e2a36" },
  a: { cloak: "#3a2a52", leather: "#4a4254", hood: "#56427c", accent: "#7a5aa8", steel: "#e4e8f0", trim: "#d8dce6", eyes: "#d8c0ff", mask: "#b8bcc8", twin: true },
  b: { cloak: "#2c4234", leather: "#5a4a30", hood: "#44624a", accent: "#6a8a3a", steel: "#b8c4b4", trim: "#a89a6a", eyes: "#c8f080", mask: "#44583e", vials: "#8ae05a", venom: "#8ae05a" },
  aa: { cloak: "#221a2e", leather: "#383244", hood: "#3e2e5a", accent: "#a82838", steel: "#eef0f6", trim: "#e0b84a", eyes: "#fff0b0", mask: "#e8c14a", twin: true, blade: "long", gild: true },
  ab: { cloak: "#4a3e58", leather: "#7a5a3a", hood: "#46385e", accent: "#7a5aa8", steel: "#d8dce4", trim: "#c8a050", eyes: "#f0e0b0", mask: "#8a3a38", twin: true, blade: "hanger", hat: "#4e3a2c", plume: "#c8403a", pauldron: "#a4aab4", purse: "#8a6038", scroll: "#ecdcb4" },
  ba: { cloak: "#1e1a24", leather: "#3a2a3c", hood: "#342a3e", accent: "#8a2a5a", steel: "#d0d4dc", trim: "#b8a0c0", eyes: "#ff8ad0", mask: "#4e4058", veil: "#4e4058", lace: "#cfc6d4", long: true, vials: "#e05aa8", venom: "#e05aa8", blade: "needle" },
  bb: { cloak: "#2e3a2a", leather: "#5a4630", hood: "#4a5238", accent: "#8a8a3a", steel: "#b8c4b4", trim: "#b89a50", eyes: "#e8f070", mask: "#44583e", beak: "#d8c49a", censer: true, brass: "#b89a50", vials: "#c8e050", venom: "#b8e04a" },
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lighten = (h, k) => hex(rgb(h).map((v) => v + (255 - v) * k));
const rich = (h, k) => { const c = rgb(h), m = (c[0] + c[1] + c[2]) / 3; return hex(c.map((v) => m + (v - m) * k)); };
const GRIP = mat("#5a4636"), VOID = flat("#15101a"), SKIN = mat("#e8b990");
const KITS = new Map();
const kitOf = (v) => {
  const key = LOOKS[v] ? v : "base";
  let K = KITS.get(key);
  if (K) return K;
  const L = LOOKS[key];
  const COWL = mat(lighten(L.hood, 0.14)), HI = mat(lighten(L.hood, 0.34));
  const MASK = mat(lighten(L.mask, L.gild ? 0.04 : 0.1), L.gild ? { contrast: 1.25 } : {});
  const EYE = flat(L.eyes, { emis: true, line: "#241a26" });
  K = { L, COWL, HI, CLOAK: mat(lighten(rich(L.cloak, 1.4), 0.12)), JERKIN: mat(lighten(rich(L.leather, 1.2), 0.14)), SLEEVE: mat(lighten(rich(L.cloak, 1.5), 0.22)),
    HOSE: mat(lighten(rich(L.cloak, 1.3), 0.1)), BOOT: mat(lighten(L.leather, 0.06)), WRAP: mat(lighten(L.leather, 0.24)), SASH: mat(lighten(L.accent, 0.08)),
    TRIM: mat(L.trim), MASK, STEEL: mat(L.steel, { contrast: 1.3 }), EYE,
    GOLD: mat("#e0b84a", { contrast: 1.2 }), PLUME: L.plume ? mat(L.plume) : 0, HAT: L.hat ? mat(lighten(L.hat, 0.1)) : 0, PAUL: L.pauldron ? mat(L.pauldron, { contrast: 1.2 }) : 0,
    PURSE: L.purse ? mat(L.purse) : 0, SCROLL: L.scroll ? mat(L.scroll) : 0, VEIL: L.veil ? mat(lighten(L.veil, 0.1)) : 0, LACE: L.lace ? mat(L.lace) : 0,
    BEAK: L.beak ? mat(L.beak, { contrast: 1.15 }) : 0, BRASS: L.brass ? mat(L.brass, { contrast: 1.2 }) : 0,
    VIAL: L.vials ? flat(L.vials, { emis: true, line: "#241a26" }) : 0, VENOM: L.venom ? flat(L.venom, { emis: true, line: "#241a26" }) : 0,
    LEG: {
      C: { m: COWL, fix: 2 }, c: { m: COWL, fix: 1 }, x: { m: COWL, fix: 0 }, A: { m: HI, fix: 2 }, F: { m: COWL, fix: 2 }, L: { m: HI, fix: 2 }, I: { m: VOID },
      d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, N: { m: SKIN, fix: 3 }, E: { m: EYE }, K: { m: MASK, fix: 2 }, k: { m: MASK, fix: 1 },
    } };
  KITS.set(key, K);
  return K;
};

// FRONT: the cowl round a dark opening: its lip (L) over the brow, the eyes' glint (E), the cloth over the mouth (K). 13 wide, centre col 6.
const FRONT_H = [
  "....CCCCC....",
  "..CAACCCCCc..",
  ".CAACCCCCCCc.",
  ".CACCCCCCCCc.",
  "CCACLLLLLLCcc",
  "CCCLIIIIIIILc",
  "CcCLIdIIIdIcc",
  "CcCLIEIIIEIcc",
  "cCCLIsKKKsIcC",
  "cCCcIKKKKKIcc",
  ".cCCcIKKKIcC.",
  ".ccCCcIIIcCc.",
  "..ccCCCCCCc..",
  "...xccCCCc...",
];
const BLINK = FRONT_H.map((r, i) => (i === 7 ? r.replace(/E/g, "I") : r));
// the Kingslayer's gilt half-mask: the skin of the brow and cheeks is gold; the eyes stay
const GILT = FRONT_H.map((r, i) => (i === 6 ? "CcCLIKIIIKIcc" : i === 7 ? "CcCLIEKKKEIcc" : i === 8 ? "cCCLIKKKKKIcC" : r));
// BACK: the back of the cowl: a deep fold down the middle, the lit band on the left, the hem of the cowl
const BACK_H = [
  "....CCCCC....",
  "..CAACCCCCc..",
  ".CAACCCCCCCc.",
  ".CACCCxCCCCc.",
  "CCACCCxCCCCcc",
  "CCCCCCxCCCCcc",
  "CCCCCCxCCCCcc",
  "cCCCCCxCCCCcc",
  "cCCCCCxCCCCcc",
  ".cCCCCxCCCCc.",
  ".ccCCCxCCCcc.",
  ".ccCCCCCCCcc.",
  "..ccCCCCCcc..",
  "...xccCCCc...",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F, o = {}) => {
  const K = kitOf(String(o.variant || "").split("@")[0]), L = K.L, rs = -s, ls = s;
  const { sk, ph } = F, p = sk.p;
  const lagT = 0.09;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - lagT), sx2 = sw(ph - 2 * lagT);
  const hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1], hipJ = sk.hN[1], hx = Math.round(sx * 0.7);
  const vx = cl((sx - sx1) * 1.4, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 1.4, -2.5, 2.5);
  const vy = cl(sk.C[1] - F.lag1.C[1], -2, 2);
  const hemY = hipY + (L.long ? 8.4 : 4.4);
  const wob = Math.sin(ph * TAU * 2);

  // ---- the cloak: BEHIND (s>0) it frames him at the shoulders and shows under the hem; from BEHIND it is the read, split into tails
  {
    const len = L.long ? 13.6 : 10, h = hipY + len - 1.4;
    const tails = [-7, -4.5, -2.4, 0.4, 2.8, 4.8, 7].map((x, i) => [hx + x + vx * (0.6 + Math.abs(x) * 0.12) - vx2 * (i % 2 ? 0.4 : 1.2), h + (i % 2 === 0 ? 0.8 + (i === 0 || i === 6 ? 0.2 : 0.8) : -1.8) - Math.abs(vx) * 0.5]);
    px.part(); const cid = px._pid;
    if (s > 0) px.poly([[sx - 6.2, chestY - 2], [sx + 6.2, chestY - 2], [sx + 6.9, chestY + 4], [...tails[6]], [...tails[0]], [sx - 6.9, chestY + 4]], K.CLOAK, 0.8, { round: 0.8, bias: -1, floor: 1, cast: 1 });
    else {
      px.poly([[sx - 5.8, chestY - 2.4], [sx + 5.8, chestY - 2.4], [sx + 6.6, chestY + 4], ...tails, [sx - 6.6, chestY + 4]], K.CLOAK, 5.2, { round: 0.8, bias: -1, floor: 1, cast: 1, edge: true });
      px.toneLine(sx - 0.6, chestY + 2, hx - 0.4 + vx, h - 2.4, -1, cid);
      px.toneLine(sx + 3.4, chestY + 5, hx + 3.2 + vx, h - 2.6, -1, cid);
      px.line(sx - 4.4, chestY + 1.4, sx + 4.4, chestY + 1.4, K.WRAP, 5.25, { bias: -1 });     // the cloak's collar band
    }
  }

  // ---- far arm: (his left, screen ls) a sleeve, the empty fist (or the second knife)
  const armZ = s > 0 ? 3.2 : 4.3, wz = s > 0 ? 0 : 1;   // BACK stack: arms 4.3 (both), fists 3.6, weapon 1.0, the cloak 5.2
  const knifeFront = (hd, ang, len, z, side) => {
    // the blade points the way he walks: toward us (FRONT), foreshortened to a wedge below the fist; away (BACK) a tip peeking out
    const l = len * 0.45;
    px.part();
    if (s > 0) {
      px.capsule(hd[0], hd[1] - 1.8, 0.9, hd[0], hd[1] + 2, 0.9, GRIP, z);
      px.dot(hd[0], hd[1] - 2.2, K.TRIM, z + 0.03, { fix: 3 });
      px.line(hd[0] - 1.8, hd[1] + 2.4, hd[0] + 1.8, hd[1] + 2.4, K.TRIM, z + 0.03, { fix: 3 });
      px.part();
      px.poly([[hd[0] - 1.2, hd[1] + 3], [hd[0] + 1.2, hd[1] + 3], [hd[0] + side * 0.3 + 0.2, hd[1] + 2.6 + l]], K.STEEL, z + 0.02, { edge: true });
      px.line(hd[0], hd[1] + 3, hd[0] + side * 0.2, hd[1] + 1.6 + l, K.STEEL, z + 0.04, { fix: 4 });
      if (K.VENOM) px.line(hd[0], hd[1] + 2.4 + l * 0.5, hd[0] + side * 0.2, hd[1] + 1.8 + l, K.VENOM, z + 0.05, { noLine: true });
    } else {
      px.capsule(hd[0], hd[1] - 2, 0.9, hd[0] + side * 0.3, hd[1] + 1.2, 0.9, GRIP, z);
      px.dot(hd[0], hd[1] - 2.4, K.TRIM, z + 0.03, { fix: 3 });
      px.part();
      px.capsule(hd[0] + side * 0.6, hd[1] + 1.2, 0.9, hd[0] + side * (1 + l * 0.1), hd[1] + 1.8 + l * 0.7, 0.4, K.STEEL, z + 0.02, { edge: false });
      if (K.VENOM) px.line(hd[0] + side * 0.8, hd[1] + 2.2 + l * 0.3, hd[0] + side * (1 + l * 0.1), hd[1] + 1.8 + l * 0.7, K.VENOM, z + 0.05, { noLine: true });
    }
  };
  const klen = L.blade === "long" ? 12 : L.blade === "needle" ? 11 : L.blade === "hanger" ? 9.6 : 8.2;
  {
    const aF = (p.aF || [0.8, 0.8, 0])[0];
    const back = s < 0, ao = back ? { cast: 0 } : { bias: -3, floor: 1 };
    const sh = [ls * (back ? 5.6 : 5.2) + sx, chestY + 0.8], hd = back ? [ls * 7.1 + sx, sh[1] + 9.4 + (aF - 0.7) * 1.6] : [ls * 6.8 + sx, sh[1] + 8.4 + (aF - 0.7) * 2.4], el = [ls * (back ? 7.4 : 7.6) + sx, sh[1] + 4.4];
    px.part();
    px.capsule(sh[0], sh[1], 2.2, el[0], el[1], 2.1, K.SLEEVE, armZ, ao);
    px.capsule(el[0], el[1], 2.0, hd[0], hd[1], 1.8, K.SLEEVE, armZ, ao);
    px.capsule(el[0] * 0.35 + hd[0] * 0.65, el[1] * 0.35 + hd[1] * 0.65, 2.0, el[0] * 0.15 + hd[0] * 0.85, el[1] * 0.15 + hd[1] * 0.85, 1.9, K.WRAP, armZ + 0.02, back ? { cast: 0 } : { bias: -1 });
    px.part(); if (back) px.ellipse(hd[0], hd[1] + 0.8, 1.5, 1.5, SKIN, 3.6, { cast: 0 }); else px.ellipse(hd[0], hd[1] + 0.4, 1.7, 1.7, SKIN, armZ + 0.3, { bias: -1 });
    if (L.twin) knifeFront(hd, 0, klen * 0.9, back ? 1.0 : armZ + 0.2, ls);
    // the Plague Bearer's censer swings on its chain from this fist
    if (L.censer) {
      const swg = (p.cz || 0) * 1.4 + wob * 0.5, c0 = [hd[0] + ls * 0.6 + swg, hd[1] + 7.2], cz = back ? 1.0 : armZ + 0.4;
      px.part();
      px.line(hd[0], hd[1] + 1, c0[0], c0[1] - 1.4, K.TRIM, cz, { noLine: true });
      px.ellipse(c0[0], c0[1], 2.4, 2.4, K.BRASS, cz, { vb: 0.2 });
      px.dot(c0[0] + 0.4, c0[1] + 0.2, K.VIAL, cz + 0.1, { noLine: true });
    }
  }

  // ---- legs: a hip apart; wrapped shins, soft boots; forward is down (FRONT) or up (BACK)
  for (const [f, an, side, z] of [[p.fF, sk.anF, ls, 2], [p.fN, sk.anN, rs, 3]]) {
    const lift = Math.max(0, -2 - an[1]), fx = hx + side * 3.2, fy = an[1] + s * f[0] * FWD;
    const hp = [hx + side * 2.4, hipJ], kn = [(hp[0] + fx) / 2 + side * 0.8, (hp[1] + fy) / 2 - lift * 0.3];
    const b = side === rs ? 0 : -1, o2 = { bias: b - 1, floor: 1 };
    const c = [kn[0] * 0.4 + fx * 0.6, kn[1] * 0.4 + fy * 0.6];
    px.part();
    px.capsule(hp[0], hp[1], 2.4, kn[0], kn[1], 2.1, K.HOSE, z, o2);
    px.capsule(kn[0], kn[1], 2.0, fx, fy - 3, 1.8, K.HOSE, z, o2);
    px.capsule(c[0], c[1], 2.0, fx, fy, 1.8, K.BOOT, z + 0.02, o2);
    if (s > 0) px.ellipse(fx, fy + 1.2, 2.5, 1.6, K.BOOT, z + 0.03, o2);
    else { px.ellipse(fx, fy + 0.8, 2.1, 1.3, K.BOOT, z + 0.03, o2); if (lift > 0.8) px.ellipse(fx, fy + 2.2, 1.8, 1.3 * cl(lift / 2.4, 0.3, 1), K.BOOT, z + 0.03, { bias: -2 }); }
    px.line(c[0] - 1.6, c[1] - 0.6, c[0] + 1.6, c[1] - 0.6, K.WRAP, z + 0.04, { bias: b - 1 });
    px.line(c[0] - 1.5, c[1] + 1.2, c[0] + 1.5, c[1] + 1.2, K.WRAP, z + 0.04, { bias: b - 1 });
  }

  // ---- the jerkin: close in the body, the skirt split at the front, belted
  const hw = 5.1;
  px.part(); const coat = px._pid;
  px.poly([[sx - 4.6, chestY - 2], [sx + 4.6, chestY - 2], [sx + 5.2, chestY + 3.5], [hx + 4.6, hipY - 3.2], [hx + hw, hemY], [hx + 2.6, hemY + 1], [hx, hemY - 0.4], [hx - 2.6, hemY + 1], [hx - hw, hemY], [hx - 4.6, hipY - 3.2], [sx - 5.2, chestY + 3.5]], K.JERKIN, 4, { round: 0.92, cast: 2, bias: -1, floor: 1 });
  px.toneLine(hx, hipY - 1, hx, hemY - 0.8, -1, coat);
  px.poly([[hx - 4.8, hipY - 4.8], [hx + 4.8, hipY - 4.8], [hx + 4.8, hipY - 2.8], [hx - 4.8, hipY - 2.8]], K.WRAP, 4.05, { round: 0.92, bias: -1 });
  if (s > 0) {
    px.rect(hx - 1, hipY - 4.8, 2, 2, K.TRIM, 4.06, { fix: 3 });
    // the baldric (the house's sash) from his right shoulder to his left hip, vials strung along it
    const a = [rs * 4.2 + sx, chestY - 1.4], b = [ls * 3.8 + hx, hipY - 3.8];
    px.line(a[0], a[1], b[0], b[1], K.SASH, 4.1);
    px.line(a[0] + 1, a[1], b[0] + 1, b[1], K.SASH, 4.1);
    if (K.VIAL) for (let i = 0; i < 3; i++) { const t = 0.28 + i * 0.26; px.dot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 0.6, K.VIAL, 4.2, { noLine: true }); }
  }
  if (K.PURSE) {
    px.part(); px.ellipse(ls * 4.2 + hx, hipY - 0.6, 2.2, 2.4, K.PURSE, 4.3);
    px.part(); px.capsule(rs * 4 + hx, hipY - 5.6, 0.9, rs * 4.6 + hx, hipY + 1.6, 0.9, K.SCROLL, 4.3);
    px.dot(rs * 4.5 + hx, hipY + 0.6, K.SASH, 4.4, { fix: 3 });
  }

  // ---- the mantle: the cowl's own cloth over both shoulders (a pauldron on the Open Contract's right)
  px.part(); const man = px._pid;
  px.poly([[sx - 5.6, chestY - 3.2], [sx + 5.6, chestY - 3.2], [sx + 6.4, chestY + 0.6], [sx + 4.2, chestY + 2.6], [sx, chestY + 3.2], [sx - 4.2, chestY + 2.6], [sx - 6.4, chestY + 0.6]], K.COWL, s > 0 ? 5 : 5.4, { round: 0.9, cast: 1, bias: -2, floor: 1, edge: s < 0 });
  px.toneLine(sx - 6, chestY + 1.4, sx - 4.2, chestY + 2.6, -1, man);
  px.toneLine(sx - 4.2, chestY + 2.6, sx, chestY + 3.2, -1, man);
  if (K.PAUL) { px.part(); px.ellipse(rs * 5.6 + sx, chestY - 0.4, 3.4, 2.8, K.PAUL, s > 0 ? 9.5 : 5.6, { cast: 1 }); px.line(rs * 5.6 + sx - 2.4, chestY + 1.8, rs * 5.6 + sx + 2.4, chestY + 1.8, K.TRIM, 9.52); }

  // ---- the scarf: wound at the throat (FRONT), or knotted at the nape with two tails down the cloak (BACK)
  if (s > 0) {
    px.part();
    px.poly([[hx - 4, hy - 0.4], [hx + 4, hy - 0.4], [hx + 3.6, hy + 2.2], [hx, hy + 3], [hx - 3.6, hy + 2.2]], K.SASH, 8.9, { round: 0.8 });
  } else {
    const k0 = [hx + 0.4, hy + 0.6], d1 = -vx * 1.3 + wob * 0.2, d2 = -vx * 1.4 - vx2 * 1.8 + vy * 0.5;
    const t1 = [k0[0] - 2.4 + d1, k0[1] + 4.6], e1 = [k0[0] - 2.8 + d2, k0[1] + 10], t2 = [k0[0] + 2.2 + d1 * 0.8, k0[1] + 4.2], e2 = [k0[0] + 3 + d2 * 0.9, k0[1] + 8.6];
    px.part();
    px.capsule(k0[0], k0[1], 1.4, t1[0], t1[1], 1.1, K.SASH, 8.7, { fix: 2 });
    px.capsule(t1[0], t1[1], 1.1, e1[0], e1[1], 0.7, K.SASH, 8.7, { fix: 1 });
    px.capsule(k0[0], k0[1], 1.3, t2[0], t2[1], 1, K.SASH, 8.7, { fix: 2 });
    px.capsule(t2[0], t2[1], 1, e2[0], e2[1], 0.6, K.SASH, 8.7, { fix: 1 });
    px.ellipse(k0[0], k0[1], 1.9, 1.5, K.SASH, 8.95, { fix: 2 });
  }

  // ---- the head in its cowl
  px.part();
  const rows = s < 0 ? BACK_H : p.blink ? BLINK : L.gild ? GILT : FRONT_H;
  px.stamp(rows, hx, hy, K.LEG, 9, { ax: 6, ay: 13, cast: 1, ball: [6.5, 5, 7, 7.5] });
  if (L.gild && s > 0) px.line(hx - 3, hy - 9.4, hx + 3, hy - 9.4, K.GOLD, 9.3);
  if (L.gild && s < 0) px.line(hx - 3, hy - 9.4, hx + 3, hy - 9.4, K.GOLD, 9.3);
  // the Widow's lace veil, dropped from the cowl over the lower face
  if (K.VEIL && s > 0) {
    px.part();
    px.poly([[hx - 4.2, hy - 6], [hx + 4.2, hy - 6], [hx + 3.8, hy - 1.4 + wob * 0.2], [hx, hy + 0.4], [hx - 3.8, hy - 1.4 + wob * 0.2]], K.VEIL, 9.2, { round: 0.6 });
    px.line(hx - 3.6, hy - 1.1, hx + 3.6, hy - 1.1, K.LACE, 9.25);
  }
  // the Plague Bearer's beak, pointing at us: a foreshortened cone from the brow down over the mouth
  if (K.BEAK && s > 0) {
    px.part();
    px.poly([[hx - 2.2, hy - 7], [hx + 2.2, hy - 7], [hx + 1.6, hy - 2.4], [hx, hy - 0.6], [hx - 1.6, hy - 2.4]], K.BEAK, 9.4, { round: 0.7 });
    px.line(hx, hy - 6.6, hx, hy - 1.2, K.BRASS, 9.45, { noLine: true });
  }
  // the Open Contract's wide hat: a brim over the cowl, a low crown, a plume
  if (K.HAT) {
    px.part();
    px.ellipse(hx + 0.4, hy - 9.8, 9.4, s > 0 ? 2.6 : 2.4, K.HAT, 9.6, { cast: 1 });
    px.ellipse(hx, hy - 12.4, 4.8, 3.2, K.HAT, 9.62, { cast: 1 });
    px.line(hx - 4.4, hy - 11.2, hx + 4.4, hy - 11.2, K.TRIM, 9.7);
    const pl = cl(-vx * 2 - vx2 * 1.5, -3, 3);
    px.part();
    if (s > 0) {
      px.capsule(hx + 2.4, hy - 13.8, 1.1, hx + 6.4 + pl, hy - 16.6, 1.6, K.PLUME, 9.58);
      px.capsule(hx + 6.4 + pl, hy - 16.6, 1.6, hx + 10 + pl * 1.4, hy - 13.4 + Math.abs(pl) * 0.4, 0.9, K.PLUME, 9.58);
    } else {
      px.capsule(hx + 2.4, hy - 14, 1.1, hx + 6 + pl, hy - 15.4, 1.6, K.PLUME, 9.8);
      px.capsule(hx + 6 + pl, hy - 15.4, 1.6, hx + 7 + pl * 1.4, hy - 9.4 + Math.abs(pl) * 0.4, 1.0, K.PLUME, 9.8);
    }
  }

  // ---- the near arm (his right) and the knife in his fist. FRONT: over everything. BACK: the same stack as the far arm (z 4.3, fist 3.6, knife 1.0)
  {
    const aN = (p.aN || [0.7, 0.8, 0])[0], back = s < 0;
    const sh = [rs * (back ? 5.6 : 5.2) + sx, chestY + 0.8], el = [rs * (back ? 7.4 : 7.8) + sx, sh[1] + 4.4];
    const hd = back ? [rs * 7.1 + sx, sh[1] + 9.4 + (aN - 0.7) * 1.6] : [rs * 6.8 + sx, sh[1] + 8.4 + s * (aN - 0.7) * 2.4];
    const z = back ? 4.3 : 9.4, ao = back ? { cast: 0 } : { cast: 2, bias: -2, floor: 1 };
    px.part(); px.tag("nearArm");
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.2, K.SLEEVE, z, ao);
    px.capsule(el[0], el[1], 2.2, hd[0], hd[1], 1.9, K.SLEEVE, z, ao);
    { const a = mix(el, hd, 0.56), b = mix(el, hd, 0.84); px.capsule(a[0], a[1], 2.1, b[0], b[1], 1.9, K.WRAP, z + 0.02, back ? { cast: 0 } : { bias: -1 }); }
    px.part(); if (back) px.ellipse(hd[0], hd[1] + 0.8, 1.5, 1.5, SKIN, 3.6, { cast: 0 }); else px.ellipse(hd[0], hd[1], 1.8, 1.8, SKIN, 9.8, { cast: 1 });
    px.tag(null);
    px.tag("knife"); knifeFront(hd, 0, klen, back ? 1.0 : 9.65, rs); px.tag(null);
  }
  return {};
};

const walk = { ...SIDE.walk };
const BOX = { w: 48, h: 62, ox: 24, oy: SIDE_BOX.oy - 2 };
export const FRONT = { NAME: "blade-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "blade-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
