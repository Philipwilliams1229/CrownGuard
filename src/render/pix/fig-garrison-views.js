// ============ CONCEPT FIGURES: the crown's knights seen from the FRONT and from BEHIND ============
// The Knight Garrison's knight (fig-garrison.js) drawn walking toward the camera (FRONT) and away
// (BACK); the Paladin, the squire and the Champion (fig-paladin-views.js, fig-squire-views.js,
// fig-champion-views.js) are the same figure through `knightViews(C)`, so the family reads as one:
// the same legs, tabard, pauldrons, belt and hand placing, each with its own plate, head, shield and
// weapon. Pattern of the goblin's views: one drawer `make(s)`, s = +1 front, -1 back; his RIGHT
// hand (the weapon) is on screen LEFT in front and on screen RIGHT from behind (`rs`), the shield
// rides his LEFT arm (`ls`). Unflipped on the board; one sun, upper left. The walk is the side
// clip's own (same n, ms, pose), feet / bob / arm heights read from the solved pose, so the game
// can switch views mid-stride. Forward is DOWN the screen in FRONT and UP in BACK (FWD 0.4 a px).
// Config C: NAME, BOX/BONES/walk (the side figure's), W (build: offsets x W), KS (the champion's
// scale-pass proxy), look(o) -> palette, head grids, shield / weapon kinds.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES, BOX as SIDE_BOX, STEEL, MAIL, BLADE, SKIN, HAIR, LEATHER, CREAM, BRASS, EYE } from "./fig-garrison.js";

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const DARK = mat("#2a2430"), RIVET = mat("#c8a448", { contrast: 1.15 });

const SC = ["capsule", "ellipse", "line", "toneLine", "rect"];
export const scaleProxy = (px, KS) => new Proxy(px, { get(t, k) {
  const f = t[k]; if (typeof f !== "function") return f;
  if (SC.includes(k)) return (...a) => { const n = k === "capsule" ? 6 : 4; for (let i = 0; i < n; i++) a[i] *= KS; return f.apply(t, a); };
  if (k === "dot") return (...a) => { a[0] *= KS; a[1] *= KS; return f.apply(t, a); };
  if (k === "poly") return (...a) => { a[0] = a[0].map((q) => [q[0] * KS, q[1] * KS]); return f.apply(t, a); };
  return f.bind(t);
} });

export const knightViews = (C) => {
  const RW = C.W > 1 ? C.W * 0.9 : C.W;                     // radii grow a little less than the offsets
  const make = (s) => (px0, F, o = {}) => {
    const L = C.look(o), W = C.W, KS = C.KS || 1;
    const px = C.KS ? scaleProxy(px0, KS) : px0;
    const { sk, ph } = F, p = sk.p, rs = -s, ls = s;
    const sw = (t) => rs * 0.75 * W * Math.sin(t * TAU);
    const tx = sw(ph), hx = tx * 0.7, vx = cl((tx - sw(ph - 0.09)) * 1.3, -2.5, 2.5);
    const yC = sk.C[1], yP = sk.P[1], yH = sk.hN[1], hemY = yP + 4.6 * W;
    const gy0 = sk.anN[1] + p.fN[1];
    const hdx = Math.round(hx * KS), hdy = Math.round(sk.N[1] * KS);

    // ---- the cape (the Champion's): behind everything in front, over the back from behind
    if (L.cape) {
      const hemC = C.capeHem, sx2 = -vx * 1.2 + (p.sway || 0) * 0.6, sh = (a) => a * W;
      px.part(); const cid = px._pid;
      px.poly([[tx - sh(4.4), yC - sh(1.8)], [tx + sh(4.4), yC - sh(1.8)], [tx + sh(6.4), yC + sh(4)], [hx + sh(8.4), yP + sh(2)], [hx + sh(9) + sx2, hemC], [hx + sh(5) + sx2 * 0.6, hemC + 1.6], [hx + sh(1.5) + sx2 * 0.4, hemC - 0.4], [hx - sh(2.5) + sx2 * 0.4, hemC + 1.8], [hx - sh(6) + sx2 * 0.6, hemC], [hx - sh(9) + sx2, hemC + 0.6], [hx - sh(8.4), yP + sh(2)], [tx - sh(6.4), yC + sh(4)]], L.cape, s > 0 ? 0.5 : 4.4, { round: 0.85 });
      px.toneLine(hx - sh(2.2), yC + sh(3), hx - sh(2.4) + sx2 * 0.5, hemC - 0.8, -1, cid);
      if (s < 0) px.toneLine(hx + sh(3), yC + sh(4), hx + sh(3.4) + sx2 * 0.5, hemC - 0.6, -1, cid);
    }

    // ---- the shield arm (his left, screen side ls)
    {
      const sh0 = [tx + ls * 5.5 * W, sk.sF[1] + 0.4 * W], el = [tx + ls * 6.3 * W, sk.eF[1]], hd = [tx + ls * 6 * W, sk.hdF[1]];
      if (L.shield === "sign") {
        // raised: upper arm toward us (foreshortened), forearm up, the holy sign above the fist
        const e2 = [tx + ls * 7.4 * W, yC + 1.8 * W], h2 = [tx + ls * 8.4 * W, sk.hdF[1] + 1.4 * W];
        px.part();
        px.capsule(sh0[0], sh0[1], 2.1 * RW, e2[0], e2[1], 2 * RW, L.plate, s > 0 ? 4.5 : 4.4, { bias: -1 });
        px.capsule(e2[0], e2[1], 2 * RW, h2[0], h2[1], 1.8 * RW, L.plate, s > 0 ? 4.55 : 4.45, { bias: -1 });
        px.ellipse(e2[0], e2[1], 1.8 * RW, 1.8 * RW, L.trim, s > 0 ? 4.6 : 4.5, { vb: 0.25 });
        const zs = s > 0 ? 6.6 : 3.4, gx = h2[0], gy = h2[1] * KS === 0 ? 0 : h2[1];
        px.part();
        const big = C.sign || 1;
        px.line(gx, gy - 6 * big, gx, gy - 0.4, L.holy, zs);
        px.ellipse(gx, gy - 6.4 * big, 2.9 * big, 2.9 * big, L.trim, zs - 0.05, { noLine: true });
        px.ellipse(gx, gy - 6.4 * big, 1.6 * big, 1.6 * big, L.holy, zs + 0.02, { noLine: true });
        px.part(); px.ellipse(gx, gy + 0.2, 1.7 * RW, 1.7 * RW, L.mail, zs + 0.1, { bias: -1 });
      } else {
        px.part();
        px.capsule(sh0[0], sh0[1], 2 * RW, el[0], el[1], 1.9 * RW, L.plate, s > 0 ? 3.6 : 4.55, { bias: -1 });
        px.capsule(el[0], el[1], 1.9 * RW, hd[0], hd[1], 1.7 * RW, L.plate, s > 0 ? 3.6 : 4.55, { bias: -1 });
        // the kite: face-on in front; from behind its back, seen mostly edge-on past the body
        const k = C.shK || 1, xs = (s > 0 ? 0.9 : 0.5) * k, ys = 0.95 * k;
        const scx = tx + ls * (s > 0 ? 7.4 : 8.2) * W, scy = sk.hdF[1] * 0.7 + sk.eF[1] * 0.3 + (s > 0 ? 3.2 : 0.8) * W;   // carried low: the top stays under the chin
        const tl = ((p.shield ?? 0.08) - 0.08) * ls * 0.8, cs = Math.cos(tl), sn = Math.sin(tl);
        const S = (x, y) => [scx + (x * cs - y * sn) * xs, scy + (x * sn + y * cs) * ys];
        const zk = s > 0 ? 4.6 : 3.2;
        px.part(); const sid = px._pid;
        px.poly([S(-4.6, -6.2), S(4.6, -6.2), S(4.9, 0.6), S(0, 8), S(-4.9, 0.6)], L.rim, zk, { round: 0.6, cast: 2 });
        if (s > 0) {
          px.poly([S(-3.5, -5.1), S(3.5, -5.1), S(3.7, 0.3), S(0, 6.3), S(-3.7, 0.3)], L.field, zk + 0.02, { round: 0.6 });
          if (L.shieldCross) { px.line(...S(0, -4.4), ...S(0, 4.4), L.shieldCross, zk + 0.05); px.line(...S(-2.6, -1.6), ...S(2.6, -1.6), L.shieldCross, zk + 0.05); }
          else { px.line(...S(-2.4, -2.6), ...S(0, -0.6), CREAM, zk + 0.05); px.line(...S(0, -0.6), ...S(2.4, -2.6), CREAM, zk + 0.05); }
          px.dot(...S(0, -0.2), L.trim, zk + 0.1, { fix: 3 });
        } else {
          px.poly([S(-3.5, -5.1), S(3.5, -5.1), S(3.7, 0.3), S(0, 6.3), S(-3.7, 0.3)], LEATHER, zk + 0.02, { round: 0.6 });
          px.line(...S(-3, -2.4), ...S(3, -2.4), DARK, zk + 0.05); px.line(...S(-2.6, 2.2), ...S(2.6, 2.2), DARK, zk + 0.05);
          px.dot(...S(-3, -2.4), L.trim, zk + 0.08, { fix: 3 }); px.dot(...S(3, 2.2), L.trim, zk + 0.08, { fix: 3 });
        }
      }
    }

    // ---- plate legs, a hip apart; each foot lifts toward us (front) or away (back)
    for (const [f, side, z, b] of [[p.fF, ls, 2, -1], [p.fN, rs, 3, 0]]) {
      const lift = f[1], hip = [hx + side * 2.5 * W, yH], fx = hx + side * 3 * W, fy = gy0 + s * f[0] * FWD - lift * 0.9 * W;
      const kn = [(hip[0] + fx) / 2 + side * 0.6 * W, (hip[1] + fy) / 2 - lift * 0.4];
      px.part(); const lid = px._pid;
      px.capsule(hip[0], hip[1], 2.4 * RW, kn[0], kn[1], 2 * RW, L.plate, z, { bias: b });
      px.capsule(kn[0], kn[1], 1.9 * RW, fx, fy, 1.6 * RW, L.plate, z, { bias: b });
      if (s > 0) px.ellipse(kn[0], kn[1] + 0.3, 2 * RW, 1.9 * RW, L.cop, z + 0.02, { bias: b, vb: 0.25 });
      else px.toneLine(kn[0] - 1.6 * RW, kn[1] + 0.4, kn[0] + 1.6 * RW, kn[1] + 0.4, -1, lid);
      px.part();
      if (s > 0) px.ellipse(fx + side * 0.2, fy + 1.3, 2.4 * RW, 1.6, L.mail, z + 0.03, { bias: b });
      else {
        px.ellipse(fx, fy + 1, 1.9 * RW, 1.3, L.mail, z + 0.03, { bias: b });
        if (lift > 0.8) px.capsule(fx, fy + 0.6, 1.5 * RW, fx, fy + 1.8, 1.1 * RW, L.mail, z + 0.04, { bias: -1 });   // the heel, still on the shin
      }
    }

    // ---- the body: breastplate, the tabard over it to the knee (a notch at the hem), the belt
    px.part();
    px.poly([[tx - 4.8 * W, yC - 1.6 * W], [tx + 4.8 * W, yC - 1.6 * W], [tx + 5.9 * W, yC + 3.5 * W], [hx + 4.7 * W, yP - 2.6 * W], [hx - 4.7 * W, yP - 2.6 * W], [tx - 5.9 * W, yC + 3.5 * W]], L.plate, 4, { round: 0.92, ny: -0.12, cast: 2 });
    px.part(); const coat = px._pid;
    px.poly([[tx - 3.8 * W, yC - 1.2 * W], [tx + 3.8 * W, yC - 1.2 * W], [tx + 4.9 * W, yC + 3.3 * W], [hx + 4.7 * W, yP - 2.6 * W], [hx + 5.4 * W, hemY], [hx + 1 * W, hemY], [hx, hemY - 2.4 * W], [hx - 1 * W, hemY], [hx - 5.4 * W, hemY], [hx - 4.7 * W, yP - 2.6 * W], [tx - 4.9 * W, yC + 3.3 * W]], L.coat, 4.2, { round: 0.9, cast: 2 });
    px.line(hx - 5 * W, hemY - 0.7, hx - 1.2 * W, hemY - 0.7, L.hem, 4.22); px.line(hx + 1.2 * W, hemY - 0.7, hx + 5 * W, hemY - 0.7, L.hem, 4.22);
    if (s > 0) {
      if (L.sun) { px.ellipse(tx + 0.4, yC + 2.8 * W, 2.3 * RW, 2.3 * RW, L.sun, 4.25, { noLine: true }); px.ellipse(tx + 0.4, yC + 2.8 * W, 1.1 * RW, 1.1 * RW, L.coat, 4.27, { noLine: true }); }
      if (L.cross) { px.line(tx, yC - 0.2 * W, hx, yC + 5.4 * W, L.cross, 4.25); px.line(tx - 2.2 * W, yC + 1.8 * W, tx + 2.2 * W, yC + 1.8 * W, L.cross, 4.25); }
    } else {
      px.toneLine(tx, yC + 0.5 * W, hx, hemY - 1.4, -1, coat);
      px.dot(tx - 0.8, yC + 2 * W, L.hem, 4.25); px.dot(tx - 0.8, yC + 4 * W, L.hem, 4.25);
      if (L.cross && L.backCross) { px.line(tx, yC + 0.2 * W, hx, yC + 4.6 * W, L.cross, 4.25); px.line(tx - 1.8 * W, yC + 1.8 * W, tx + 1.8 * W, yC + 1.8 * W, L.cross, 4.25); }
    }
    px.poly([[hx - 4.9 * W, yP - 3.4 * W], [hx + 4.9 * W, yP - 3.4 * W], [hx + 4.9 * W, yP - 1.6 * W], [hx - 4.9 * W, yP - 1.6 * W]], LEATHER, 4.3, { round: 0.9 });
    if (s > 0) px.rect(hx - 1 * W, yP - 3.4 * W, 2 * W, 1.8 * W, L.trim, 4.32, { fix: 3 });
    px.line(tx - 2.6 * W, yC - 1.2 * W, tx + 2.6 * W, yC - 1.2 * W, L.plate, 4.3);

    // ---- the sword arm (his right, screen side rs): pauldron, vambrace, the fist on the grip
    const sh1 = [tx + rs * 5.4 * W, sk.sN[1] + 0.4 * W], el1 = [tx + rs * 6.2 * W, sk.eN[1]], H1 = [tx + rs * 5.6 * W, sk.hdN[1] + 0.5];
    px.part();
    px.capsule(sh1[0], sh1[1], 2.1 * RW, el1[0], el1[1], 2 * RW, L.plate, 4.6, { cast: 2 });
    px.capsule(el1[0], el1[1], 2 * RW, H1[0], H1[1], 1.8 * RW, L.plate, 4.6, { cast: 2 });
    px.ellipse(el1[0], el1[1], 1.7 * RW, 1.7 * RW, L.cop, 4.62, { vb: 0.25 });
    // the weapon, held upright and canted a little outward; flat face toward us
    const tilt = rs * (s > 0 ? 0.2 : 0.14), d = [Math.sin(tilt), -Math.cos(tilt)], nrm = [-d[1], d[0]], wk = C.wk || 1;
    const B = (t, off = 0) => [H1[0] + d[0] * t * wk + nrm[0] * off * (wk > 1 ? 1.15 : 1), H1[1] + d[1] * t * wk + nrm[1] * off * (wk > 1 ? 1.15 : 1)];
    px.part(); px.tag("weapon");
    if (s < 0) {
      // from behind it is the same weapon in the same fist, at true depth: it points forward and up, away from us, so what
      // runs in front of him is foreshortened and sunk behind his arm (z 3.9, under the torso and the arm); the grip, the
      // guard and the pommel are at the fist, and the far end pokes out past the arm's outline, canted outward
      const t2 = rs * 0.7, d2 = [Math.sin(t2), -Math.cos(t2)], n2 = [-d2[1], d2[0]], FS = 0.42;
      const B2 = (t, off = 0) => [H1[0] + d2[0] * t * FS * wk + n2[0] * off, H1[1] + d2[1] * t * FS * wk + n2[1] * off];
      const hw = L.weapon === "sword";
      px.capsule(...B(-3.4), 0.9, ...B(2), 0.9, hw ? LEATHER : L.wood, 5.2);
      px.ellipse(...B(-3.8), 1.1, 1.1, hw ? BRASS : L.trim, 5.22);
      px.part();
      if (hw) {
        px.capsule(...B(1.8, -2.4), 0.8, ...B(1.8, 2.4), 0.8, STEEL, 5.22, { edge: true });
        px.capsule(...B2(2.5), 1.2, ...B2(16), 1, BLADE, 3.9, { edge: true });
      } else if (L.weapon === "mace") {
        px.capsule(...B2(0), 0.9, ...B2(11), 0.9, L.wood, 3.9, { edge: true });
        px.ellipse(...B2(15), 3.2, 3.2, L.trim, 3.92, { edge: true });
      } else {
        px.capsule(...B2(0), 1.2, ...B2(17), 1.2, L.wood, 3.9, { edge: true });
        px.ellipse(...B2(20), 3.7, 3.4, L.trim, 3.92, { edge: true });
      }
    } else if (L.weapon === "sword") {
      px.capsule(...B(2.5), 1.2, ...B(14.5), 1, BLADE, 5.2, { edge: true });
      px.capsule(...B(14.5), 1, ...B(16.6), 0.3, BLADE, 5.2, { edge: true });
      px.part();
      px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, 5.22);
      px.capsule(...B(1.8, -2.6), 0.8, ...B(1.8, 2.6), 0.8, STEEL, 5.25, { edge: true });
      px.ellipse(...B(-3.6), 1.1, 1.1, BRASS, 5.25);
    } else if (L.weapon === "mace") {
      px.capsule(...B(-3.4), 0.9, ...B(11), 0.9, L.wood, 5.2, { edge: true });
      px.ellipse(...B(-3.8), 1.1, 1.1, L.trim, 5.22);
      px.part();
      px.ellipse(...B(14), 3.2, 3.2, L.trim, 5.25, { edge: true });
      px.capsule(...B(14, -4), 1, ...B(14, 4), 1, L.trim, 5.27, { edge: true });
      px.capsule(...B(10.6), 1, ...B(17.6), 1, L.trim, 5.27, { edge: true });
      px.dot(...B(14), L.plate, 5.3, { fix: 4 });
    } else {
      // the war hammer: its block seen end-on (it swings toward us), a back-spike's tip beside it
      px.capsule(...B(-4.6), 1.2, ...B(17), 1.2, L.wood, 5.2, { edge: true });
      px.ellipse(...B(-5.2), 1.6, 1.6, L.trim, 5.22);
      px.part();
      px.ellipse(...B(19), 3.7, 3.4, L.trim, 5.25, { edge: true });
      px.ellipse(...B(19, -0.9), 1.9, 1.6, L.plate, 5.3, { noLine: true, fix: 4 });
    }
    px.tag(null);
    px.part();
    px.ellipse(H1[0], H1[1], 1.8 * RW, 2.1 * RW, L.mail, 5.3);
    // the pauldrons, both shoulders
    for (const sd of [rs, ls]) {
      px.part();
      px.ellipse(tx + sd * 6 * W, sk.sN[1] - 0.2 * W, 3.2 * RW, 3 * RW, L.plate, 4.8, { cast: 2 });
      px.line(tx + sd * 6 * W - 2.7 * RW, sk.sN[1] + 2.1 * W, tx + sd * 6 * W + 2.7 * RW, sk.sN[1] + 2.1 * W, L.hem, 4.82);
    }

    // ---- the head (stamped at the board's scale: the Champion's grid is drawn small already)
    const head = s > 0 ? (p.blink ? L.blink : L.front) : L.back;
    if (s < 0 && L.plume) {
      px0.part();
      const pl = cl(vx * 2, -2.5, 2.5), top = hdy - L.ay;
      px0.capsule(hdx, top + 0.5, 1.5, hdx + pl * 0.4, top + 4, 1.7, L.plume, 6.3);
      px0.capsule(hdx + pl * 0.4, top + 4, 1.7, hdx + pl, top + 8.5, 1.1, L.plume, 6.3);
    }
    if (s > 0 && L.plume) {
      px0.part();
      px0.ellipse(hdx + 1, hdy - L.ay - 1.2, 2.6, 2.6, L.plume, 5.6);
    }
    px0.part();
    px0.stamp(head, hdx, hdy, L.LEG, 6, { ax: 6, ay: L.ay, ball: L.ball, cast: 2 });
    return {};
  };
  const walk = { ...C.walk };
  const BOX = { ...C.BOX, ox: C.BOX.w / 2 };
  return { FRONT: { NAME: C.NAME + "-front", BOX, BONES: C.BONES, draw: make(1), CLIPS: { walk } }, BACK: { NAME: C.NAME + "-back", BOX, BONES: C.BONES, draw: make(-1), CLIPS: { walk } } };
};

// ---- the Knight Garrison's knight: steel and navy, the cream cross, a short plume
const HEAD_F = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".mmmmmmmmmmm.",
  ".cMsbbSbbsMc.",
  ".cMSESSSESMc.",
  ".cMSESNSESMc.",
  ".ccMSSNSSMcc.",
  ".ccMSlllSMcc.",
  "..ccmSSSmcc..",
  "..ccccccccc..",
];
const HEAD_B = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMsMMMMM.",
  ".mRmmmsmmmRm.",
  ".MMMMMsMMMMM.",
  ".MMMMMsMMMMM.",
  ".MMMMMsMMMMM.",
  ".cMMMMsMMMMc.",
  ".ccMMMMMMMcc.",
  "..ccccccccc..",
  "...ccccccc...",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 6 || i === 7 ? r.replace(/E/g, "e") : r));
export const KNIGHT_LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 }, R: { m: BRASS, fix: 3 },
};
export const KNIGHT_HEADS = { front: HEAD_F, back: HEAD_B, blink: blinkOf(HEAD_F) };
export const KNIGHT_LOOKS = {
  knight: { coat: mat("#3a5474", { contrast: 1.1 }), hem: mat("#28405c"), plume: mat("#3a5474"), field: mat("#3a5474", { contrast: 1.1 }), shieldCross: CREAM, cross: CREAM },
  squire: { coat: mat("#a0303a", { contrast: 1.1 }), hem: mat("#762230"), plume: mat("#a0303a"), field: mat("#a0303a", { contrast: 1.1 }), shieldCross: null, cross: null },
};
export const knightLook = (name) => (o) => ({
  ...KNIGHT_LOOKS[name], ...KNIGHT_HEADS, LEG: KNIGHT_LEG, ay: 10, ball: [6.5, 5.5, 7, 7],
  plate: STEEL, mail: MAIL, cop: STEEL, rim: STEEL, trim: BRASS, weapon: "sword", shield: "kite",
});

const set = knightViews({ NAME: "garrison", BOX: SIDE_BOX, BONES: SIDE_BONES, walk: SIDE.walk, W: 1, look: knightLook("knight") });
export const FRONT = set.FRONT, BACK = set.BACK;
