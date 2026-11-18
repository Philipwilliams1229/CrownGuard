// ============ FIGURE: the Rime Jarl on his war-mammoth (game type `rimejarl`, the boss) ============
// The lord of the clans seated in a plank howdah on a great shaggy war-mammoth: umber coat rimed
// white along the hump, a long dark hair skirt hanging off the belly, pillar legs on broad pads,
// a domed skull, a swinging trunk and two iron-banded tusks swept forward and up. A teal saddle
// cloth with a white fur hem, round shields hung on the howdah's rail and a teal banner at its
// back. The Jarl is fig-rimejarl.js's man (horned helm, white-blond braids, white bear mantle,
// the rimed Dane axe) sitting down. Look c, bold, like the thrall and the Jarl on foot.
// About 150 px from the pads to the horns, 110 px long with the trunk and tusks.
// The mammoth stands on beast.js (four legs, amble); the howdah, the Jarl, the trunk and the
// tusks are drawn here off its spine, a beat behind it.
// Clips: idle (the trunk sways, an ear flaps, he breathes), walk (the slow four-beat amble, the
// axe held up across him), song (the same legs, axe raised, the head back, the stones blazing:
// the game's freezeCd clock), attack (the trample: weight back, REAR and trumpet with the axe
// hauled up, forefeet down in a burst of ice as the axe comes down, the tusk sweep).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, ik } from "./rig.js";
import { QUAD, beastFrames, tailPts, walkGait, legChain } from "./beast.js";

// the mammoth
const HIDE = mat("#6e5442", { contrast: 1.1 }), SHAG = mat("#3e2e24", { contrast: 1.15 }), RIMEHAIR = mat("#e8eef0"), TUSK = mat("#ece2c6", { contrast: 1.2 });
const EARM = mat("#5e4636", { contrast: 1.25 });
const TOENAIL = mat("#d8ccb0"), PADM = mat("#4a382e"), BANDM = mat("#7e8692", { contrast: 1.3 }), BANDD = mat("#4e5560");
const EYEM = flat("#1e1620"), EYEG = flat("#e0f8ff", { emis: true, line: "#3a86b0" });
// the howdah and its trappings
const CLOTH = mat("#2f5a58", { contrast: 1.15 }), FURH = mat("#ece8e0"), OAK = mat("#7a5334", { contrast: 1.1 }), OAKD = mat("#4a3426"), BRASS = mat("#c8a040", { contrast: 1.2 });
const SHB = mat("#d8d0bc"), CREAM = mat("#e8e2d0");
// the Jarl (fig-rimejarl.js)
const SKIN = mat("#e4ae8a"), TEAL = mat("#2c4e5a"), WOOL = mat("#4a5a60"), LEATHER = mat("#4a3426");
const MAIL = mat("#8a929c", { contrast: 1.25 }), MAIL_D = mat("#5a626e"), FURW = mat("#ece8e0"), IRON = mat("#7e8692", { contrast: 1.3 }), IRON_D = mat("#4e5560");
const STEEL = mat("#d8e4ec", { contrast: 1.3 }), SILVER = mat("#c8d0d8", { contrast: 1.3 }), WOOD = mat("#6a4a2e"), BLOND = mat("#ece2c4"), BONE = mat("#ece0c4");
const EYE = flat("#2a3a48"), RIME = flat("#f4fcff"), ICE = flat("#9ad8f2", { emis: true, line: "#3a86b0" }), ICEHOT = flat("#f4fcff", { emis: true, line: "#9ad8f2" });
const SMEAR = flat("#f4fcff", { emis: true, line: "#9ad8f2" }), STONE = mat("#7cc8ec", { contrast: 1.3 });

const HEAD = [
  ".....MMMM....",
  "...MMMMMMMM..",
  "..MMmMMMMMMM.",
  ".BBBBBBBBBBB.",
  ".HMMsDDsDDs..",
  ".HMMSESDSES..",
  ".HmMSESDSESN.",
  ".HHMSSSDSSSN.",
  ".HHmRRRRRRR..",
  "..HRRRRRRRR..",
  "..HHRRRRR.R..",
];
const BLINK = HEAD.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, B: { m: SILVER, fix: 3 }, H: { m: BLOND, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: BLOND, fix: 2 },
};

export const BOX = { w: 190, h: 168, ox: 72, oy: 154 };
export const BONES = HUMAN;               // unused: the mammoth stands on beast.js's bones
const Q = { ...QUAD, spine: 54, height: 70, sh: [-2, 16], hip: [2, 15], foreU: 27, foreL: 25.5, hindU: 27, hindL: 25.5, paw: 3,
  neckAt: [2, -6], neck: 12, tailAt: [-2, 2], tail: [7, 7, 6], far: [3.4, -1.4], foreX: 0, hindX: -1 };
const R = { upper: 9.4, fore: 8.8 };      // the Jarl's arm bones (HUMAN x 1.52)
const L = 26;                              // the Dane axe's haft

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cap = (px, a, b, ra, rb, m, z, o) => px.capsule(a[0], a[1], ra, b[0], b[1], rb, m, z, o);

// a trunk's points, root to tip: the heading a0 (0 level ahead, + down), turning by `curl` over its length
const trunkPts = (root, a0, curl, len, n = 9) => {
  const pts = [root.slice()], seg = len / n;
  let [x, y] = root;
  for (let i = 1; i <= n; i++) { const a = a0 + curl * Math.pow(i / n, 1.5); x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
  return pts;
};

// A leg is ONE welded limb of the mammoth's one body (pix.js body / limb): a single tube from the
// shoulder or hip to the pad, one radius at the knee, its root fading into the barrel's own shading
// (near legs; a far leg is covered by the barrel anyway). The thigh's shag is tone strokes down
// the hide and a few wrapped tufts, never a second lit shape. Far legs stay a tone down, whole.
// A HIND leg is an elephant's, not a horse's: beast.js folds it with the hock back, so it is re-solved
// here from the same hip to the same pad with a long pillar thigh and the knee LOW, bending FORWARD, then a
// thick straight shin to the round pad; its top is welded deep into the rump (no seam at the hip).
const HIND_U = 31, HIND_L = 21.5;
const leg = (px, l, z, bias, near, BID) => {
  const { j, a } = l, k = l.fore ? l.k : ik(j[0], j[1], a[0], a[1], HIND_U, HIND_L, -1).mid;
  const chain = l.fore ? legChain(l) : [[j[0], j[1] - 4], j, k, a];
  const rad = l.fore ? [9.6, 8, 6.6] : [12.4, 11.2, 8.4, 7.4];
  px.limb(chain, rad, HIDE, z, { bias, cast: 1, weld: near ? 5 : l.fore ? 0 : 4, weldRoot: near ? (l.fore ? 11 : 15) : l.fore ? 0 : 8 });
  for (const [t0, t1, dx] of [[0.2, 0.7, -5], [0.3, 0.95, -1.5], [0.25, 0.85, 2.5], [0.4, 1.0, 5.5]]) { const q0 = mix(j, k, t0), q1 = mix(j, k, t1); px.toneLine(q0[0] + dx, q0[1], q1[0] + dx, q1[1], -1, BID); }
  for (const t of [0.15, 0.5]) { const m = mix(k, a, t); px.dot(m[0] - 5, m[1] + 1, SHAG, z + 0.03, { noLine: true, wrap: true }); px.dot(m[0] + 4, m[1] + 2, SHAG, z + 0.03, { noLine: true, wrap: true }); }
  const up = cl(l.lift / 4, 0, 1);
  px.ellipse(a[0] + 0.6, a[1] + 0.2 - up * 0.6, 8.4, 3.6, PADM, z + 0.04, { bias, floor: 1, rot: up * 0.2 });
  for (const dx of [-3.8, -0.4, 3.2]) px.dot(a[0] + dx + 2, a[1] - 0.4 + up * 0.2, TOENAIL, z + 0.06, { fix: near ? 3 : 2, noLine: true });
};

// the iron bands on a tusk: two short bright rings
const band = (px, pts, i, r, z) => {
  const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  px.part();
  px.line(a[0] + nx * r, a[1] + ny * r, a[0] - nx * r, a[1] - ny * r, BANDM, z, { fix: 3 });
  px.line(a[0] + dx * 0.25 + nx * r, a[1] + dy * 0.25 + ny * r, a[0] + dx * 0.25 - nx * r, a[1] + dy * 0.25 - ny * r, BANDD, z, { fix: 1 });
};

const axeAt = (h, a) => { const d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)]; return (f, s = 0) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s]; };

export const draw = (px, F) => {
  const { b, b1, b2 } = beastFrames(F, Q);
  const p = b.p, g = p.glow || 0, hot = g > 0.6;
  const wx = cl(b.W[0] - b1.W[0], -3, 3), wy = cl(b.W[1] - b1.W[1], -2, 2);

  // ---- the mammoth: one body, so no part shadows or edges another ----
  const BID = px.body(1);
  leg(px, b.FH, 1, -1, false, BID);
  leg(px, b.FF, 1.2, -1, false, BID);

  // the long tail, a tuft at its end
  const t = tailPts(b, b1, b2);
  px.part();
  cap(px, t[0], t[1], 2.2, 1.8, HIDE, 2.5); cap(px, t[1], t[2], 1.8, 1.5, HIDE, 2.5);
  px.part();
  cap(px, t[2], t[3], 2, 2.8, SHAG, 2.52, { floor: 1 });

  // the body: the barrel, the hump over the shoulders, the sloping rump
  const hu = b.at(0.26, 0, 0), ru = b.at(-0.38, 0, 5), ba = b.at(-0.1, 0, 8), fr = b.at(0.34, 0, 10);
  const bodyId = BID;
  px.ellipse(ru[0], ru[1], 17, 18, HIDE, 4);
  cap(px, hu, ba, 22, 21, HIDE, 4);
  px.ellipse(hu[0], hu[1] - 1, 21, 19.5, HIDE, 4, { rot: b.ang(0.26) - 0.1 });
  cap(px, fr, b.at(0.05, 0, 12), 19, 17, HIDE, 4);
  // the shoulder's bulge, a lighter belly line, tone strokes of the coat on the flank
  for (const [s, d0, d1] of [[0.3, 4, 15], [0.18, 6, 17], [0.06, 3, 14], [-0.06, 6, 18], [-0.18, 4, 15], [-0.3, 6, 16], [0.4, 8, 17]]) { const q0 = b.at(s, 0, d0), q1 = b.at(s - 0.05, 0, d1); px.toneLine(q0[0], q0[1], q1[0], q1[1], -1, bodyId); }
  for (const [s, d0, d1] of [[0.12, 1, 9], [-0.14, 2, 10], [-0.34, 1, 8]]) { const q0 = b.at(s, 0, d0), q1 = b.at(s - 0.06, 0, d1); px.toneLine(q0[0], q0[1], q1[0], q1[1], 1, bodyId); }
  // the rime: frost-white tips of the coat along the hump and the back
  px.part();
  for (const [s, d, u] of [[0.4, -8, 0], [0.34, -17, 1], [0.26, -19, 0], [0.18, -20, 1], [0.1, -19, 0], [0.02, -17, 1], [-0.08, -15, 0], [-0.18, -13, 1], [-0.28, -10, 0], [-0.4, -6, 1], [0.3, -12, 1], [0.14, -14, 0]]) {
    const q = b.at(s, 0, d); px.dot(q[0], q[1], RIMEHAIR, 4.4, { fix: 3 }); if (u) px.dot(q[0] + 1, q[1] + 0.6, RIMEHAIR, 4.4, { fix: 2, noLine: true });
  }

  // the skirt: long dark locks hanging from the belly and flank, torn at the hem
  px.part();
  const SK = [-0.46, -0.4, -0.34, -0.28, -0.22, -0.16, -0.1, -0.04, 0.02, 0.08, 0.14, 0.2, 0.26, 0.32, 0.38, 0.44];
  SK.forEach((s, i) => {
    const top = b.at(s, 0, 10), len = 13 + ((i * 7) % 5) * 2.6 + (Math.abs(s) > 0.38 ? -3 : 0), sw = wx * 0.7 + Math.sin(F.ph * 6.28 + i) * 0.5;
    const bot = b.at(s - 0.015, 0, 10 + len), w = 3.6;
    px.poly([[top[0] - w, top[1]], [top[0] + w, top[1]], [bot[0] + 1 + sw, bot[1]], [bot[0] - 1.4 + sw * 0.5, bot[1] + 1]], SHAG, 4.3, { round: 0.6, floor: 1, bias: i % 2 ? -0.6 : 0 });
  });

  // the head: a domed skull, a flat ear, the eye deep in the hair
  const ear = p.ear ?? 0, hc = [b.K[0] + 3 + (p.hx ?? 0) * 0.2, b.K[1] + 5];
  px.part();
  const nk0 = b.at(0.46, 0, 0);
  cap(px, nk0, hc, 17, 14, HIDE, 4.2);
  px.part(); const hid = px._pid;
  px.ellipse(hc[0], hc[1], 14.5, 17.5, HIDE, 6, { rot: 0.18, weld: 4 });
  px.ellipse(hc[0] + 6, hc[1] + 7, 8.5, 9, HIDE, 6.1, { weld: 3 });                          // the face, down to the trunk's root
  px.ellipse(hc[0] - 2, hc[1] - 14, 6, 3, HIDE, 6.2, { bias: 1, cast: 0 });  // the crown of the dome
  for (const [dx, dy] of [[-6, -15], [-2, -17], [3, -16.5], [-9, -11], [6, -14]]) px.dot(hc[0] + dx, hc[1] + dy, RIMEHAIR, 6.3, { fix: 3 });
  // the throat hair
  px.part();
  px.poly([[hc[0] - 9, hc[1] + 6], [hc[0] + 2, hc[1] + 8], [hc[0] + 3, hc[1] + 17], [hc[0] - 1, hc[1] + 14], [hc[0] - 3, hc[1] + 19], [hc[0] - 6, hc[1] + 13], [hc[0] - 9, hc[1] + 16]], SHAG, 6.15, { floor: 1 });
  // the ear flap, flicked now and then
  px.part();
  const ec = [hc[0] - 6.4 - ear * 1.8, hc[1] + 2.4 - ear * 0.6], er = 0.18 + ear * 0.35; const eid = px._pid;
  px.ellipse(ec[0], ec[1], 8.8 + ear * 0.6, 13.2 + ear * 1.4, SHAG, 6.33, { rot: er, cast: 2, floor: 1 });           // the flap's dark rim
  px.ellipse(ec[0] - 0.6, ec[1] - 0.6, 7.4 + ear * 0.6, 11.8 + ear * 1.4, EARM, 6.35, { rot: er, bias: -0.5 });
  px.toneLine(ec[0] + 2.4, ec[1] - 6, ec[0] + 3.6, ec[1] + 6, -1, eid); px.toneLine(ec[0] - 2, ec[1] - 4, ec[0] - 1.2, ec[1] + 7, -1, eid);
  px.toneLine(ec[0] - 4, ec[1] - 9, ec[0] + 3, ec[1] - 10.6, 1, eid);
  for (let i = 0; i < 4; i++) {                                                                // the shaggy hem of the flap
    const x = ec[0] - 5 + i * 3 + Math.sin(er) * 4, y = ec[1] + 9.4 + (i === 0 || i === 3 ? -1.6 : 0);
    px.poly([[x - 1.6, y], [x + 1.6, y], [x + 0.4 - ear, y + 4.4 + (i & 1) * 1.6]], EARM, 6.37, { bias: -0.6, floor: 1 });
  }
  // the eye: small, set under a brow ridge
  px.part();
  px.rect(hc[0] + 7, hc[1] + 2, 3, 2, p.blink ? SHAG : EYEG, 6.5, { fix: 3 });
  px.rect(hc[0] + 8, hc[1] + 3, 2, 2, EYEM, 6.55);
  px.line(hc[0] + 5, hc[1] + 1.5, hc[0] + 10, hc[1] + 2, SHAG, 6.6, { floor: 1 });

  // the trunk, ringed with creases; the far tusk first, behind it
  const root = [hc[0] + 11, hc[1] + 9];
  const tp = p.tusk ?? 0, tusk = (dx, dz, z, m, bias) => {
    const o = [root[0] - 5 + dx, root[1] - 2];
    const pts = [o, [o[0] + 8, o[1] + 8 - tp * 2], [o[0] + 19, o[1] + 11 - tp * 5], [o[0] + 28, o[1] + 6 - tp * 8], [o[0] + 33, o[1] - 5 - tp * 9], [o[0] + 33.5, o[1] - 13 - tp * 8]];
    const w = [4.4, 4, 3.4, 2.6, 1.6, 0.7];
    px.body(0); px.part();
    for (let i = 0; i + 1 < pts.length; i++) cap(px, pts[i], pts[i + 1], w[i], w[i + 1], m, z, { bias, cast: 1 });
    px.body(1);
    return pts;
  };
  tusk(-2.4, 0, 5.4, TUSK, -1);
  const tr = trunkPts(root, p.tA ?? 1.45, p.tC ?? 0.1, p.tL ?? 42);
  const trId = BID;
  px.limb(tr, tr.map((q, i) => 6.4 - i * 0.5), HIDE, 6.6, { weld: 4, weldRoot: 7 });
  for (let i = 2; i < tr.length - 1; i += 2) { const q = tr[i]; px.toneLine(q[0] - 4, q[1] - 1, q[0] + 4, q[1] + 1, -1, trId); }
  px.dot(tr[tr.length - 1][0], tr[tr.length - 1][1] + 0.5, SHAG, 6.7, { floor: 1 });
  const tusks = tusk(0, 0, 6.8, TUSK, 0);
  band(px, tusks, 1, 3.6, 7); band(px, tusks, 2, 3.2, 7);
  px.body(0);

  // ---- the saddle cloth, the howdah, the shields, the banner ----
  const cA = b.at(-0.42, 0, -12), cB = b.at(0.46, 0, -12), cC = b.at(0.42, 0, 9), cD = b.at(-0.4, 0, 9);
  px.part(); const clId = px._pid;
  px.poly([cA, cB, cC, cD], CLOTH, 7.4, { round: 0.5 });
  px.toneLine(...b.at(-0.1, 0, -6), ...b.at(-0.12, 0, 14), -1, clId);
  px.toneLine(...b.at(0.22, 0, -6), ...b.at(0.2, 0, 15), -1, clId);
  px.poly([b.at(-0.4, 0, 9), b.at(0.42, 0, 9), b.at(0.43, 0, 14), b.at(0.34, 0, 11), b.at(0.24, 0, 14.5), b.at(0.14, 0, 11), b.at(0.04, 0, 14.5), b.at(-0.06, 0, 11), b.at(-0.16, 0, 14.5), b.at(-0.26, 0, 11), b.at(-0.34, 0, 14), b.at(-0.41, 0, 11.5)], FURH, 7.45, { round: 0.8 });
  // the cream diamonds along the cloth's border
  for (const s of [-0.3, -0.12, 0.06, 0.24, 0.38]) { const q = b.at(s, 0, 3); px.dot(q[0], q[1], CREAM, 7.5, { fix: 3 }); px.dot(q[0] + 1, q[1] + 1, CREAM, 7.5, { fix: 2, noLine: true }); }

  // the Jarl sits a beat behind the back under him
  const s0 = b.at(0.02, 0, -14), s1 = b1.at(0.02, 0, -16), s2 = b2.at(0.02, 0, -16);
  const late = s1[1] * 0.65 + s2[1] * 0.35, air = cl(s0[1] - late, 0, 2), press = cl(late - s0[1], 0, 1.6);
  const H = [s0[0], s0[1] - air];
  const lean = (p.jLean ?? 0.1) + press * 0.03 - air * 0.03, sp = 17 - press * 0.5;
  const C = [H[0] + Math.sin(lean) * sp, H[1] - Math.cos(lean) * sp];
  const N = [C[0] + Math.sin(lean) * 3 + 1.6 + (p.jHx ?? 0), C[1] - 3 + (p.jHy ?? 0)];
  const sN = [C[0] - 3.2, C[1] + 1.6], sF = [C[0] + 3.4, C[1] + 0.6];
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const vx = cl((s0[0] - s1[0]) * 1.6, -2.5, 2.5), vy = cl(s0[1] - s1[1], -2, 2);

  // the banner pole, at the howdah's back, and the teal flag streaming off it
  px.part();
  const bp0 = b.at(-0.36, 0, -16), bp1 = b.at(-0.36, 0, -52);
  cap(px, bp0, bp1, 1, 0.8, OAKD, 7.2, { floor: 1 });
  px.dot(bp1[0], bp1[1] - 1.4, BRASS, 7.3, { fix: 3 });
  const fl = cl(-wx * 1.6, -3, 3), flu = Math.sin(F.ph * 6.28 * 2) * 1.4;
  px.part(); const fId = px._pid;
  px.poly([[bp1[0], bp1[1] + 1], [bp1[0] - 10 + fl, bp1[1] + 2 + flu * 0.6], [bp1[0] - 20 + fl * 2, bp1[1] + 1 - flu], [bp1[0] - 25 + fl * 2.4, bp1[1] + 4.6 + flu * 0.5], [bp1[0] - 19 + fl * 2, bp1[1] + 7.4 - flu * 0.6], [bp1[0] - 10 + fl, bp1[1] + 9 + flu * 0.4], [bp1[0], bp1[1] + 10]], CLOTH, 7.25, { round: 0.7 });
  px.toneLine(bp1[0] - 2, bp1[1] + 5, bp1[0] - 22 + fl * 2, bp1[1] + 4, -1, fId);
  px.poly([[bp1[0] - 6 + fl * 0.5, bp1[1] + 3.8], [bp1[0] - 14 + fl, bp1[1] + 4 - flu * 0.4], [bp1[0] - 14 + fl, bp1[1] + 5.4 - flu * 0.4], [bp1[0] - 6 + fl * 0.5, bp1[1] + 5.4]], CREAM, 7.3, { fix: 3 });

  // the box's back wall and floor (the Jarl sits in front of it)
  const w0 = b.at(-0.4, 0, -10), w1 = b.at(0.44, 0, -10), w2 = b.at(0.44, 0, -18), w3 = b.at(-0.4, 0, -18);
  px.part(); const wId = px._pid;
  px.poly([w0, w1, w2, w3], OAK, 7.6, { round: 0.3 });
  for (const s of [-0.22, 0, 0.22]) px.toneLine(...b.at(s, 0, -10), ...b.at(s, 0, -18), -1, wId);

  // the cape, streaming behind the shoulders, its tail late
  {
    const s = cl(-vx * 1.8 - wx * 1.4, -5, 5), top = C[0] - 3;
    px.part(); const cid = px._pid;
    px.poly([[top + 4, C[1] - 1.6], [top - 3, C[1] + 0.4], [top - 12 + s * 0.4, C[1] + 8], [H[0] - 14 + s * 0.8, H[1] + 2], [H[0] - 3 + s * 0.4, H[1] + 4], [H[0] + 2, H[1] - 1], [C[0] + 3.4, C[1] + 3]], TEAL, 8.4, { round: 0.7 });
    px.toneLine(top - 2, C[1] + 3, H[0] - 6 + s * 0.8, H[1] + 1, -1, cid);
  }
  // the far horn behind the helm
  const horn = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 2.8], [x0 + dir * 3.8, y0 - 1.2, 2.3], [x0 + dir * 6.8, y0 - 4.4, 1.7], [x0 + dir * 8, y0 - 8.4, 1], [x0 + dir * 7.4, y0 - 12, 0.4]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
  };
  px.part(); horn(hx - 3.6, hy - 8.6, -1, 8.7);

  // the far arm and the axe: both hands on the haft
  const hdN0 = [sN[0] + (p.jHd?.[0] ?? 8), sN[1] + (p.jHd?.[1] ?? 2)];
  const aa = p.axe ?? 0.3, at = axeAt(hdN0, aa);
  const gF = at(-(p.span ?? 8.5));
  const eF = ik(sF[0], sF[1], gF[0], gF[1], R.upper, R.fore, 1).mid;
  px.part();
  cap(px, sF, eF, 2.7, 2.4, MAIL_D, 8.6, { bias: -1 }); cap(px, eF, gF, 2.4, 2, MAIL_D, 8.6, { bias: -1 });
  // the hauberk, belt, mantle
  px.part(); const mId = px._pid;
  px.poly([[C[0] - 6, C[1] - 1.6], [C[0] + 6, C[1] - 1.6], [C[0] + 6.8, C[1] + 3.6], [H[0] + 6.4, H[1] - 1], [H[0] + 6, H[1] + 4], [H[0] - 6.4, H[1] + 4], [H[0] - 6.8, H[1] - 1], [C[0] - 7, C[1] + 3.6]], MAIL, 8.8, { round: 0.85, cast: 1 });
  px.toneLine(H[0] + 0.6, H[1] - 1, C[0] + 0.6, C[1] + 3, -1, mId);
  for (let yy = C[1] + 2; yy < H[1] + 2; yy += 2.8) for (let xx = -5; xx <= 5; xx += 3.2) { const sh = ((yy - C[1]) / 2.8 | 0) % 2 ? 1.6 : 0; px.dot(C[0] + xx + sh + (H[0] - C[0]) * (yy - C[1]) / 14, yy, MAIL_D, 8.85, { noLine: true }); }
  px.poly([[H[0] - 6.4, H[1] - 2.6], [H[0] + 6.4, H[1] - 2.6], [H[0] + 6.5, H[1] - 0.4], [H[0] - 6.4, H[1] - 0.4]], LEATHER, 8.9, { round: 0.9 });
  px.rect(H[0] + 1.2, H[1] - 2.4, 3, 2.2, SILVER, 8.95, { fix: 3 });
  px.part();
  px.ellipse(C[0] + 0.2, C[1] + 0.6, 11.4, 5, FURW, 9, { cast: 1 });
  px.ellipse(sN[0] - 0.4, sN[1] + 0.2, 6, 5.4, FURW, 9.2, { cast: 1 });
  for (const x of [-9.6, -7, -4.2, -1.4, 1.4, 4.2, 7, 9.4]) px.dot(C[0] + 0.2 + x, C[1] + 4.4 + Math.abs(x) * -0.1 + (x & 1), FURW, 9);
  // the braided beard: two plaits, a beat late
  {
    const s = cl(-vx * 1.4 - wx * 1, -2.4, 2.4);
    for (const [dx, k] of [[-1.4, 1], [2.2, 0.85]]) {
      px.part();
      const b0 = [hx + dx, hy + 4.6], b1p = [b0[0] + s * 0.3, b0[1] + 5 * k - vy * 0.3], b2p = [b1p[0] + s * 0.6, b1p[1] + 4 * k];
      cap(px, b0, b1p, 1.9, 1.7, BLOND, 9.6); cap(px, b1p, b2p, 1.7, 1.3, BLOND, 9.6);
      px.dot(b2p[0], b2p[1] + 1, BRASS, 9.7, { fix: 3 });
    }
  }
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 9.8, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part();
  horn(hx + 2.6, hy - 8.6, 1, 10);
  for (const x of [-3.2, -0.2, 2.8]) px.dot(hx + x, hy - 5.4, hot ? ICEHOT : STONE, 10.1, { fix: 3 });
  px.dot(hx - 0.2, hy - 10, hot ? ICEHOT : STONE, 10.1, { fix: 3 });

  // the near arm and the axe (blade furred with rime)
  const eN = ik(sN[0], sN[1], hdN0[0], hdN0[1], R.upper, R.fore, 1).mid;
  px.part();
  cap(px, [sN[0], sN[1] + 0.6], eN, 2.7, 2.4, MAIL, 10.3, { cast: 1 }); cap(px, eN, hdN0, 2.4, 2.1, MAIL, 10.3, { cast: 1 });
  const c0 = mix(eN, hdN0, 0.7);
  cap(px, c0, hdN0, 2.4, 2.3, FURW, 10.35, { cast: 1 });
  {
    const k = 1.55;
    px.part();
    px.capsule(...at(-6), 1, ...at(L + 1), 1, WOOD, 10.5, { edge: true });
    px.part();
    px.poly([at(L - 2.2 * k, 0.4), at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.8 * k), at(L + 1.8 * k, 3.4 * k), at(L + 1.8 * k, 0.4)], STEEL, 10.52, { fix: 2 });
    px.poly([at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.8 * k), at(L + 1.8 * k, 3.4 * k), at(L + 1 * k, 2.6 * k), at(L - 1 * k, 3.4 * k)], STEEL, 10.53, { fix: 4 });
    px.poly([at(L - 1.6, -0.4), at(L + 1.2, -0.4), at(L + 1.6, -4.6)], IRON_D, 10.51, { fix: 1 });
    px.poly([at(L - 2.8, -0.8), at(L + 2, -0.8), at(L + 2, 1), at(L - 2.8, 1)], IRON_D, 10.54, { fix: 1 });
    for (const [f, s2] of [[L - 4, 4.6], [L - 1.6, 5.4], [L + 1.4, 4.2], [L - 6, 2.8], [L + 2.2, 1.6]]) px.dot(...at(f, s2 * (s2 > 4 ? 1 : 0.9)), RIME, 10.56, { noLine: true });
    for (const f of [L - 4.6, L - 1.8, L + 1]) px.dot(...at(f, -1.2), RIME, 10.56, { noLine: true });
    px.dot(...at(L - 6.6, 0), hot ? ICEHOT : STONE, 10.57, { fix: 3 });
  }
  px.part();
  px.ellipse(hdN0[0], hdN0[1], 2.2, 2.2, SKIN, 10.7); px.ellipse(gF[0], gF[1], 2, 2, SKIN, 10.7);

  // the howdah's near rail and the round shields hung on it, over his hips
  const r0 = b.at(-0.44, 0, -8), r1 = b.at(0.48, 0, -8), r2 = b.at(0.48, 0, -16), r3 = b.at(-0.44, 0, -16);
  px.part(); const rId = px._pid;
  px.poly([r0, r1, r2, r3], OAK, 11, { round: 0.35 });
  px.toneLine(...b.at(-0.44, 0, -12), ...b.at(0.48, 0, -12), -1, rId);
  px.toneLine(...b.at(-0.44, 0, -17.5), ...b.at(0.48, 0, -17.5), -1, rId);
  px.part();
  for (const s of [-0.45, 0.48]) { const q = b.at(s, 0, -8), q2 = b.at(s, 0, -16); cap(px, q, q2, 1.8, 1.8, OAKD, 11.1, { floor: 1 }); }
  [[-0.28, 0], [0, 1], [0.28, 2]].forEach(([s, i]) => {
    const c = b.at(s, 0, -12);
    px.part();
    px.ellipse(c[0], c[1], 4.6, 4.6, i % 2 ? SHB : CLOTH, 11.3, { cast: 1 });
    px.poly([[c[0] - 4.6, c[1] - 4.6], [c[0], c[1] - 4.6], [c[0], c[1]], [c[0] - 4.6, c[1]]], i % 2 ? CLOTH : SHB, 11.4, { round: 0, n: [-0.2, -0.2, 0.9], cast: 0 });
    px.poly([[c[0], c[1]], [c[0] + 4.6, c[1]], [c[0] + 4.6, c[1] + 4.6], [c[0], c[1] + 4.6]], i % 2 ? CLOTH : SHB, 11.4, { round: 0, n: [-0.2, -0.2, 0.9], cast: 0 });
    px.ellipse(c[0], c[1], 1.2, 1.2, BANDM, 11.5, { fix: 3 });
  });

  // the near legs last, in front
  px.body(1);
  leg(px, b.NH, 12, 0, true, BID);
  leg(px, b.NF, 12.2, 0, true, BID);
  px.body(0);

  const k = cl(g, 0, 1.4);
  return { light: k > 0.05 ? { x: hx, y: hy - 5, r: 18 + 24 * cl(k, 0, 1), col: "#9ad8f2", k: Math.min(k, 0.45) } : null, axeAt: at, head: [hx, hy], foot: b.NF.a, foot2: b.FF.a, tip: tr[tr.length - 1] };
};

// the chop's smear, the ice thrown up where the forefeet land, the song's rime motes
export const fx = (px, F, info, clip) => {
  const p = F.sk.p;
  if (clip === "attack") {
    const ph = F.ph;
    if (ph >= 0.36 && ph <= 0.72 && info.axeAt) {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const q = Math.max(0.36, Math.min(ph, 0.56) - i * 0.014), pp = CLIPS.attack.pose(q), at = axeAt([0, 0], pp.axe ?? 0.3);
        const hd = [info.axeAt(0)[0] - (p.jHd?.[0] ?? 8) + (pp.jHd?.[0] ?? 8), info.axeAt(0)[1] - (p.jHd?.[1] ?? 2) + (pp.jHd?.[1] ?? 2)];
        const a2 = axeAt(hd, pp.axe ?? 0.3);
        pts.push([a2(L + 2, 3), a2(L - 5, 5)]);
      }
      for (let i = 0; i + 1 < pts.length; i++) px.poly([pts[i][0], pts[i + 1][0], pts[i + 1][1], pts[i][1]], SMEAR, 20 - i, { noLine: true });
    }
    // the ice bursts where the forefeet come down
    if (ph >= 0.5 && ph <= 0.78 && info.foot) {
      const u = (ph - 0.5) / 0.28, f = info.foot, e = Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u * 0.5);
      for (let i = 0; i < 9; i++) {
        const a = -0.2 - (i / 8) * 2.7, r = (5 + (i % 3) * 3) * (0.3 + u * 1.6), x = f[0] + 4 + Math.cos(a) * r * 1.6, y = f[1] - Math.sin(-a) * r * 1.1 * e - 1;
        px.dot(x, y, i % 2 ? ICEHOT : ICE, 20, u > 0.6 ? { noLine: true } : {});
      }
    }
  }
  if (clip === "song" && info.head) {
    const [hx, hy] = info.head;
    for (let i = 0; i < 6; i++) {
      const u = (F.ph + i / 6) % 1, x = hx + Math.sin(i * 2.2 + u * 5) * (7 + 6 * u) + (i - 2.5) * 2, y = hy - 12 - u * 16;
      if (u > 0.9 || y < -BOX.oy + 3) continue;
      px.dot(x, y, u < 0.5 ? ICEHOT : ICE, 20, u > 0.7 ? { noLine: true } : {});
    }
  }
};

const TAU = Math.PI * 2;
// the mammoth's trunk: hang, tuck, trumpet, curl
const HANG = { tA: 1.45, tC: 0.12, tL: 42 };
const STAND = { drop: 1, pitch: 0, arch: 0.02, neck: -0.04, hx: 0, hy: 0, tail: -0.9, curl: -0.25, ear: 0, tusk: 0, ...HANG,
  fNF: [0, 0], fFF: [0, 0], fNH: [0, 0], fFH: [0, 0],
  jLean: 0.1, jHd: [8, 2], axe: 0.3, span: 8.5, glow: 0.14, jHx: 0, jHy: 0, blink: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2800, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * TAU), s2 = Math.sin(ph * TAU - 1.2);
      return { ...STAND, drop: 1 + 0.6 * (0.5 + 0.5 * s), neck: -0.04 + 0.03 * s2, tA: 1.45 + 0.1 * s2, tC: 0.12 + 0.26 * Math.sin(ph * TAU - 0.4), tail: -0.9 + 0.3 * s2, curl: -0.25 + 0.2 * s,
        ear: ph >= 0.3 && ph < 0.5 ? Math.sin(((ph - 0.3) / 0.2) * Math.PI) : 0, blink: ph >= 0.8 && ph < 0.9 ? 1 : 0,
        jLean: 0.1 + 0.03 * s2, jHd: [8 + 0.4 * s, 2], axe: 0.3 + 0.03 * s, glow: 0.14 + 0.1 * (0.5 + 0.5 * s) };
    },
  },
  walk: {
    n: 8, ms: 900, loop: true, lag: 0.09,
    pose: (ph) => {
      const g = walkGait(ph, { travel: 64.8, duty: 0.7, lift: 5, bob: 0.8, rock: 0.02, flex: 0.02, nod: 0.03 });
      const s = Math.sin(ph * TAU * 2);
      return { ...STAND, ...g, neck: -0.04 + g.nod, ear: 0.3 + 0.3 * Math.sin(ph * TAU - 1.4), tA: 1.45 + 0.1 * Math.sin(ph * TAU), tC: 0.12 + 0.22 * Math.sin(ph * TAU - 0.6), tail: -0.9 + 0.3 * Math.sin(ph * TAU - 1), curl: -0.25,
        jLean: 0.12 + 0.02 * s, jHd: [8, 2 + 0.4 * s], axe: 0.3 - 0.02 * s };
    },
  },
  // his frost song on the march: the legs of walk, the axe held high, the head back, the stones blazing
  song: {
    n: 8, ms: 900, loop: true, lag: 0.09,
    pose: (ph) => {
      const g = walkGait(ph, { travel: 64.8, duty: 0.7, lift: 5, bob: 0.8, rock: 0.02, flex: 0.02, nod: 0.03 });
      const b = Math.sin(ph * TAU * 2);
      return { ...STAND, ...g, neck: -0.04 + g.nod + 0.04, tA: 1.45 + 0.1 * Math.sin(ph * TAU), tC: 0.12 + 0.22 * Math.sin(ph * TAU - 0.6), tail: -0.9, curl: -0.25,
        jLean: 0.02, jHx: -0.8, jHy: -1.4, jHd: [3.5, -17 + 0.6 * b], axe: 0.15 + 0.06 * b, glow: 1.1 + 0.25 * b };
    },
  },
  attack: {
    n: 14, ms: 1300, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: STAND },
      // the weight goes back, the head drops, the axe is hauled over the shoulder
      { t: 0.16, e: "out", p: { ...STAND, rx: -3, drop: 3, pitch: 0.05, neck: -0.2, tA: 1.2, tC: -0.5, tail: -0.3, tusk: 0.3,
        jLean: -0.06, jHd: [-1, -14], axe: -0.5, glow: 0.4 } },
      // REAR: the forefeet leave the ground, the trunk flung up to trumpet, the axe held high
      { t: 0.36, e: "out", p: { ...STAND, rx: -4.5, drop: 5.4, pitch: -0.34, neck: 0.22, hy: -2, tA: -1.2, tC: 1.1, tL: 46, tail: 0.2, curl: 0.2, ear: 1, tusk: 0.8,
        fNF: [6, 18], fFF: [4, 15], fNH: [-3, 0], fFH: [-1, 0],
        jLean: -0.34, jHd: [-3, -19], axe: -0.65, jHx: -1, jHy: -1, glow: 0.7 } },
      // the forefeet come down: ice bursts, the axe comes down before him
      { t: 0.5, e: "in3", p: { ...STAND, rx: 3.6, drop: 4.4, pitch: 0.16, neck: -0.22, hy: 2, tA: 1.2, tC: 0.3, tail: -0.3, ear: 0.4, tusk: 0.1,
        fNF: [8, 0], fFF: [5, 0], fNH: [-2, 0], fFH: [0, 0],
        jLean: 0.55, jHd: [13, 6], axe: 2.0, jHx: 2.6, jHy: 1, glow: 0.95 } },
      { t: 0.6, e: "out", p: { ...STAND, rx: 4, drop: 4, pitch: 0.18, neck: -0.2, hy: 2, tA: 1.3, tC: 0.1, tail: -0.4, tusk: 0,
        fNF: [8, 0], fFF: [5, 0], fNH: [-2, 0], fFH: [0, 0],
        jLean: 0.6, jHd: [13, 7], axe: 2.15, jHx: 2.8, jHy: 1.2, glow: 0.6 } },
      // the tusk sweep: the head swung round and up
      { t: 0.76, e: "io", p: { ...STAND, rx: 2, drop: 2.4, pitch: -0.08, neck: 0.12, hx: 2, tA: 0.2, tC: -0.7, tail: -0.6, tusk: 1,
        fNF: [5, 1.4], fFF: [3, 0.6], jLean: 0.3, jHd: [10, 4], axe: 1.2, glow: 0.3 } },
      { t: 1, e: "out", p: STAND },
    ], ph),
  },
};
