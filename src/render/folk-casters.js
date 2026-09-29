// ============ FOLK: THE CASTERS ============
// The spire's mage and the warden's priest. Built from folk-kit.js;
// folk.js re-exports it.

import { lighten, darken, rgba, shadow, ball, lin, part } from "./paint.js";
import { limb, limbStroke, pathPts, blob, dab, head, hand, arm, elbowFor, logJoint } from "./folk-kit.js";

// A robe: a coat that widens to the hem, no legs showing. o.lean slides
// the shoulders over the planted hem (the body leaning), o.trail flares the
// hem's back edge out behind (it lags a lunge), o.step pushes the front
// edge out (a foot stepping in under it).
const robe = (ctx, x, top, h, wTop, wHem, col, trim, o = {}) => part(ctx, (c) => {
  const ln = o.lean || 0, tr = o.trail || 0, st = o.step || 0;
  const xl = x - wHem / 2 - tr, xr = x + wHem / 2 + st;
  c.beginPath();
  c.moveTo(x - wTop / 2 + ln, top);
  c.lineTo(x + wTop / 2 + ln, top);
  c.quadraticCurveTo(x + wHem / 2 + ln * 0.35 + st * 0.2, top + h * 0.6, xr, top + h);
  c.lineTo(xl, top + h);
  c.quadraticCurveTo(x - wHem / 2 + ln * 0.35 - tr * 0.4, top + h * 0.6, x - wTop / 2 + ln, top);
  c.closePath();
  c.fillStyle = lin(c, xl, 0, xr, 0, [[0, lighten(col, 0.32)], [0.45, col], [1, darken(col, 0.5)]]);
  c.fill();
  if (trim) { c.fillStyle = trim; c.fillRect(xl + 0.5, top + h - 1.6, xr - xl - 1, 1.3); }
});
// an open hand: the palm and two fingers up (s = 1 facing +x)
const openHand = (ctx, x, y, col, s = 1) => {
  hand(ctx, x, y, col);
  dab(ctx, x + s * 0.6, y - 1.9, 0.6, 1, col); dab(ctx, x - s * 0.3, y - 2.1, 0.6, 1.1, col);   // fingers spread
};

// ---- the mage -----------------------------------------------------------------
// The spire's mage: an apprentice (bare-handed, the orb over his palm), then
// a staff-bearer, then the long-beard. `level` 1..3. The orb is drawn by the
// tower, at mageTip() — the orb's centre, in the fork of the staff's head.
//
// He is a caster who GATHERS, then RELEASES. Every pose is a set of joint
// targets; the arms are solved by the kit (bones keep their length, elbows
// fold the right way), the staff keeps its length and is always in a fist:
//   lean   the shoulders slide over the planted hem (+ toward the foe); the
//          head and the hat's point follow a little further
//   rise   the shoulders and head lift (a breath)
//   hand   the near (staff) hand; for the apprentice the conjuring hand
//   free   the far hand (drawn a shade darker, behind the staff)
//   ang    the staff's tilt from upright in degrees (+ toward the foe)
//   lift   the staff's foot this far off the walk (it stands on it at 0) —
//   above  — or, for a staff swung off the ground, its length above the fist
//   grip2  both hands on the staff: the free hand this far down it
//   orb    the apprentice's orb, from his hand
//   hat / hem / step   the hat's point and the hem trailing (+ back: they
//          lag a lunge, swing past it in the follow-through), a foot
//          stepping in under the robe's front
//   palm   the free hand open (the apprentice's near hand too when `push`)
// The firing cycle (MAGE_CYCLE, by the phase since the shot): strike (the
// staff driven at the foe, the body stepping into it, the free hand
// sweeping forward and down), follow-through (hat and hem swing past),
// recover, ready, three gathering frames (the free hand rises before the
// chest, palm to the orb; the staff lifts; the body leans back as power
// builds), then the wind-up — a small pull back — held until the shot.
// Old names still work: "charge" = the full gather, "cast" = the strike.
const STAFF_POSES = {
  idle: { hand: [5.8, -11.8], free: [-1.2, -8.2], ang: 3, lift: 0.3 },
  idle2: { lean: -0.2, rise: -0.5, hand: [5.8, -12.0], free: [-1.1, -8.7], ang: 3, lift: 0.3, hat: 0.3 },
  ready: { hand: [5.9, -12.0], free: [1.4, -10.6], ang: 4, lift: 0.3 },
  gather1: { lean: -0.3, hand: [5.9, -12.6], free: [3.4, -14.6], ang: 3, lift: 0.8, palm: 1 },
  gather2: { lean: -0.6, hand: [5.8, -13.2], free: [4.4, -17.2], ang: 2, lift: 1.3, palm: 1, hat: -0.2 },
  gather3: { lean: -0.9, hand: [5.6, -13.8], free: [4.9, -18.9], ang: 1, lift: 1.8, palm: 1, hat: -0.5, hem: -0.3 },
  windup: { lean: -1.7, hand: [5.0, -15.0], free: [4.0, -19.3], ang: -5, lift: 2.4, palm: 1, hat: -1.3, hem: -0.8 },
  strike: { lean: 1.4, hand: [9.6, -17.2], free: [5.2, -13.0], ang: 40, above: 5.6, palm: 1, hat: 2.2, hem: 1.6, step: 1.6 },
  follow: { lean: 1.1, hand: [9.8, -16.2], free: [3.6, -10.8], ang: 50, above: 5.4, hat: -1.2, hem: 0.8, step: 1.6 },
  recover: { lean: 0.5, hand: [7.4, -13.4], free: [2.2, -10.4], ang: 16, lift: 1.2, hat: -0.6, hem: -0.3, step: 0.6 },
  // Dragonbreath: the staff swung down (level), then braced in both hands
  // and levelled at the foe while the jet pours out of it
  level: { lean: 0.6, hand: [7.8, -14.6], free: [3.6, -13.2], ang: 38, above: 8, hat: 0.8, hem: 0.6, step: 0.8 },
  brace: { lean: 1.2, hand: [7.6, -15.6], ang: 66, above: 9, grip2: 4.4, hat: 1.6, hem: 1.4, step: 1.8 },
  brace2: { lean: 0.9, hand: [7.3, -15.4], ang: 66, above: 9, grip2: 4.4, hat: 2.0, hem: 1.8, step: 1.8 },
};
const HAND_POSES = {
  idle: { hand: [4.8, -11.4], free: [-1.2, -8.2], orb: [0.6, -2.6] },
  idle2: { lean: -0.2, rise: -0.5, hand: [4.8, -11.8], free: [-1.1, -8.7], orb: [0.6, -2.6], hat: 0.3 },
  ready: { hand: [5.6, -12.4], free: [1.4, -10.6], orb: [0.6, -2.7] },
  gather1: { lean: -0.3, hand: [6.0, -13.4], free: [3.4, -15.2], orb: [0.5, -2.9], palm: 1 },
  gather2: { lean: -0.6, hand: [6.0, -14.2], free: [4.0, -17.8], orb: [0.5, -3.0], palm: 1, hat: -0.2 },
  gather3: { lean: -0.9, hand: [5.8, -14.8], free: [4.7, -18.7], orb: [0.6, -3.1], palm: 1, hat: -0.5, hem: -0.3 },
  windup: { lean: -1.7, hand: [4.6, -16.0], free: [3.9, -19.2], orb: [0.8, -3.0], palm: 1, hat: -1.3, hem: -0.8 },
  strike: { lean: 1.4, hand: [10.4, -20.0], free: [5.0, -13.0], orb: [2.4, -1.3], palm: 1, push: 1, hat: 2.2, hem: 1.6, step: 1.6 },
  follow: { lean: 1.1, hand: [10.0, -17.6], free: [3.6, -10.8], orb: [2.0, -0.8], push: 1, hat: -1.2, hem: 0.8, step: 1.6 },
  recover: { lean: 0.5, hand: [7.6, -13.8], free: [2.2, -10.4], orb: [0.8, -2.6], hat: -0.6, hem: -0.3, step: 0.6 },
};
const LEGACY = { charge: "gather3", cast: "strike" };
const poseOf = (level, pose) => {
  const set = level >= 2 ? STAFF_POSES : HAND_POSES, nm = LEGACY[pose] || pose;
  return set[nm] || set[nm === "level" || nm === "brace" || nm === "brace2" ? "strike" : "gather3"];
};
const rad = (d) => (d * Math.PI) / 180;
// Where everything is for a pose (figure space, facing +x, feet at 0):
// shoulders, hands, the staff's foot and head, the orb. Labs read it too.
export const mageRig = (level, pose = "charge") => {
  const P = poseOf(level, pose);
  const lean = P.lean || 0, rise = P.rise || 0;
  const nsh = [2 + lean, -15.4 + rise], fsh = [-2 + lean, -15.4 + rise];
  const hnd = P.hand;
  let free = P.free, staff = null, tip;
  if (level >= 2) {
    const a = rad(P.ang), d = [Math.sin(a), -Math.cos(a)], len = level >= 3 ? 24.5 : 22.5;
    const below = P.lift != null ? (-P.lift - hnd[1]) / Math.cos(a) : len - P.above;
    const above = len - below;
    tip = [hnd[0] + d[0] * above, hnd[1] + d[1] * above];
    staff = { foot: [hnd[0] - d[0] * below, hnd[1] - d[1] * below], tip, d, a };
    if (P.grip2) free = [hnd[0] - d[0] * P.grip2, hnd[1] - d[1] * P.grip2];
  } else tip = [hnd[0] + P.orb[0], hnd[1] + P.orb[1]];
  return { P, lean, rise, nsh, fsh, hand: hnd, free, staff, tip };
};
export const mageTip = (level, pose = "charge") => mageRig(level, pose).tip;
// The firing cycle by phase p = 1 - cd/rate (0 at the shot, 1 ready again):
// the strike is the shortest frame, the ready pose and the wind-up are held.
export const MAGE_CYCLE = [[0.07, "strike"], [0.16, "follow"], [0.28, "recover"], [0.45, "ready"], [0.6, "gather1"], [0.75, "gather2"], [0.9, "gather3"], [Infinity, "windup"]];
export const magePoseAt = (p) => MAGE_CYCLE.find(([end]) => p < end)[1];
// idle: a slow breath every few seconds (phase by id, so neighbours differ)
export const mageIdlePose = (time, id = 0) => ((time / 3.7 + id * 0.37) % 1 < 0.38 ? "idle2" : "idle");
// Dragonbreath: `on` 0..1 is the breath; the staff swings down, then he
// braces in both hands, shuddering a little against the blast
export const mageBreathPose = (on, time, id = 0) => (on <= 0 ? "ready" : on < 0.55 ? "level" : Math.floor(time * 6 + id) % 2 ? "brace2" : "brace");

export const drawMage = (ctx, x, y, dir, pal, level = 3, o = {}) => {
  const R = mageRig(level, o.pose || "charge"), P = R.P;
  const { lean, rise } = R;
  const tall = level >= 3;
  const hl = lean * 1.15;                                   // the head leads the shoulders a little
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1 + (P.step || 0) * 0.3, 0.4, 5, 1.8, 0.3);
  if ((P.step || 0) > 0.8) dab(ctx, (tall ? 6 : 5) + P.step - 1.2, -1.1, 1.9, 1.1, "#3a2a2a");   // a boot stepping in
  robe(ctx, 0, -17 + rise * 0.5, 17 - rise * 0.5, 7, tall ? 12 : 10, pal.robe, pal.trim, { lean, trail: P.hem, step: P.step });
  // a sash of the trim colour down the front, leaning with him
  part(ctx, (c) => { c.strokeStyle = pal.trim; c.lineWidth = 1; c.beginPath(); c.moveTo(1.7 + lean, -16.5 + rise * 0.5); c.lineTo(1.7 + (P.step || 0) * 0.3, -1.6); c.stroke(); });
  const farCol = darken(pal.robe, 0.14);
  // the far arm, behind him (with both hands on the staff its fist is laid
  // over the staff once the staff is drawn)
  arm(ctx, R.fsh[0], R.fsh[1], R.free[0], R.free[1], pal, { col: farCol, hand: !P.palm && !P.grip2 });
  if (P.palm && !P.grip2) openHand(ctx, R.free[0], R.free[1], pal.skin);
  // head and beard: the soldiers' face under the wizard's hat
  const hx = 0.4 + hl, hy = rise;
  head(ctx, hx, -20.5 + hy, pal, { hood: false });
  const sway = -(P.hat || 0) * 0.35;                       // the beard's end trails like the hat's point
  if (tall) part(ctx, (c) => { c.beginPath(); c.moveTo(hx - 2.8, -19 + hy); c.quadraticCurveTo(hx + 0.2 + sway, -10 + hy, hx + 3.0, -19 + hy); c.closePath(); c.fillStyle = pal.beard || "#e8e0d0"; c.fill(); });
  else if (level === 2) part(ctx, (c) => ball(c, hx + 0.2 + sway * 0.4, -18 + hy, 2.2, 1.4, pal.beard || "#c8bca8", { hi: 0.3, lo: 0.3 }));
  part(ctx, (c) => {
    // brim, then the point, flopping back; it trails the body a frame. The
    // brim sits at the brow, above the eye, so the face reads under it.
    // (The long-beard's point stays inside the hall's 40-high bake with a
    // row to spare, even on a breath.)
    const hy = rise - 0.8;
    const px = hx + 1.4 + (tall ? 1.5 : 0) + lean * 0.25 - (P.hat || 0), py = -33 - (tall ? 1.6 : 0) + hy;
    ball(c, hx, -23 + hy, 5.2, 1.5, pal.hat, { hi: 0.4, lo: 0.4 });
    c.beginPath(); c.moveTo(hx - 3.8, -23 + hy); c.quadraticCurveTo(hx - 0.4 - (P.hat || 0) * 0.3, -25 + hy, px, py); c.quadraticCurveTo(hx + 2.6 - (P.hat || 0) * 0.3, -26 + hy, hx + 3.4, -23 + hy); c.closePath();
    c.fillStyle = lin(c, hx - 3.4, 0, hx + 3.6, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
    c.fillStyle = pal.trim; c.fillRect(hx - 3.4, -24 + hy, 6.6, 1);
  });
  // the staff, always in his fist: grounded, lifted, driven or levelled. It
  // is held on our side of him, so it is drawn over the hat's brim and the
  // beard (its fork never passes behind the brim), and under the fists.
  if (R.staff) {
    const { foot, tip, d, a } = R.staff, end = [tip[0] - d[0] * 3.6, tip[1] - d[1] * 3.6];
    part(ctx, (c) => {
      const n = [Math.cos(a), Math.sin(a)], m = [(foot[0] + end[0]) / 2, (foot[1] + end[1]) / 2];
      c.strokeStyle = lin(c, m[0] - n[0], m[1] - n[1], m[0] + n[0], m[1] + n[1], [[0, "#8a6a44"], [1, "#4a3420"]]);
      c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath(); c.moveTo(foot[0], foot[1]); c.lineTo(end[0], end[1]); c.stroke();
      // the head of the staff: a gilt fork that cups the orb
      c.save(); c.translate(tip[0], tip[1]); c.rotate(a);
      c.fillStyle = pal.trim;
      c.fillRect(-2.1, 1.6, 1, 2.2); c.fillRect(1.1, 1.6, 1, 2.2); c.fillRect(-2.1, 3.3, 4.2, 1);
      c.restore();
    });
  }
  if (P.grip2) hand(ctx, R.free[0], R.free[1], pal.skin);   // the far fist round the staff
  // the near arm: the staff hand (the apprentice's conjuring hand), on our
  // side of him, so over the beard and the staff; it never rises to the brim
  arm(ctx, R.nsh[0], R.nsh[1], R.hand[0], R.hand[1], pal, { col: pal.robe, hand: !P.push });
  if (P.push) openHand(ctx, R.hand[0], R.hand[1], pal.skin);
  ctx.restore();
};

// The warden's priest: a frost-and-light mage-priest. A shaped alb that
// flares at the hem, wide bell sleeves cuffed in the accent colour, a stole
// hanging down the front, a two-peaked mitre with its ribbons behind, and a
// short staff crowned with a charm.
//
// His blessing is the benediction seen from the side: the far hand keeps
// the staff (it never floats — it lifts a little with him), the near hand
// leaves it and rises, turning open, until the palm stands at head height
// before him, the elbow forward and down; the head lifts, the sleeves lag
// the arm and settle after it. Frames, in play order (PRIEST_FRAMES):
//   folded / folded2   both hands on the staff at the breast (2: a breath)
//   lift               the near hand leaves the staff, the sleeve hanging
//   rise               the hand at the shoulder, opening
//   raised             the palm up at head height: the light pools in it
//   crest              the overshoot at the top of the rise, sleeve swinging
//   raised2            held while the aura works: the palm pressed forward
// priestLight(frame) says where the hall pools the light (the palm, the
// staff's charm) and how strongly; drawPriest(..., true / false) still
// means raised / folded.
// A bell-sleeved arm: the upper sleeve to the solved elbow (bones keep
// their length, the elbow folds the right way — logged for the joint lab),
// then the bell from the elbow to a cuff short of the hand, its loose side
// hanging by `droop`, the hand (closed or open) beyond it. A raised arm's
// bell slides down toward the elbow: `bare` (0..1) of the forearm shows.
// The upper sleeve and the bell are ONE inked part (no line at the elbow);
// the only edge on the arm is the cuff, where the sleeve really ends.
const bellArm = (ctx, sh, hd, col, cuff, skin, o = {}) => {
  const el = elbowFor(sh[0], sh[1], hd[0], hd[1]);
  logJoint(ctx, "arm", sh, el, hd);
  const f = [hd[0] - el[0], hd[1] - el[1]], L = Math.hypot(f[0], f[1]) || 1;
  const k = Math.max(1.3, (L - 1.4) * (1 - (o.bare || 0)));
  const cf = [el[0] + (f[0] / L) * k, el[1] + (f[1] / L) * k];
  if (o.bare) limb(ctx, cf[0], cf[1], hd[0], hd[1], 1.9, skin);
  const w = o.w || 2.1, nx = -f[1] / L, ny = f[0] / L;
  const p = [cf[0] + nx * w, cf[1] + ny * w], q = [cf[0] - nx * w, cf[1] - ny * w];
  (p[1] > q[1] ? p : q)[1] += o.droop || 0;                               // the loose side hangs
  const bell = [[el[0] + nx * 1.3, el[1] + ny * 1.3], [el[0] - nx * 1.3, el[1] - ny * 1.3], [q[0], q[1], 1], [p[0], p[1], 1]];
  part(ctx, (c) => {
    limbStroke(c, sh[0], sh[1], el[0], el[1], 2.7, col);                 // the upper sleeve
    const xs = bell.map((v) => v[0]), ys = bell.map((v) => v[1]);
    pathPts(c, bell);
    c.fillStyle = lin(c, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.4)]]);
    c.fill();
    c.save(); pathPts(c, bell); c.clip();
    c.strokeStyle = cuff; c.lineWidth = 1; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(p[0], p[1]); c.stroke();
    c.restore();
  });
  if (o.open) openHand(ctx, hd[0], hd[1], skin, 1); else hand(ctx, hd[0], hd[1], skin);
};
const priestStaff = (ctx, x0, y0, x1, y1, pal) => {
  const metal = pal.metal || "#d8b34a";
  part(ctx, (c) => {
    c.strokeStyle = lin(c, x1 - 1, 0, x1 + 1, 0, [[0, lighten(pal.staff || "#8a6a44", 0.3)], [1, darken(pal.staff || "#8a6a44", 0.35)]]);
    c.lineWidth = 1.3; c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.fillStyle = metal; c.fillRect(x1 - 1, y1 - 0.2, 2, 0.9);                              // the collar
    c.strokeStyle = metal; c.lineWidth = 0.8;
    c.beginPath(); c.arc(x1, y1 - 2.4, 1.9, 0, Math.PI * 2); c.stroke();                      // the ring
    c.fillStyle = rgba(pal.gem, 0.45); c.beginPath(); c.arc(x1, y1 - 2.4, 1.5, 0, Math.PI * 2); c.fill();
  });
  ball(ctx, x1, y1 - 2.4, 1.1, 1.3, pal.gem, { hi: 0.7, lo: 0.25 });
  dab(ctx, x1 - 0.5, y1 - 3.2, 0.5, 0.5, "#fff3d2");
};
// near: the near hand; far: the far hand (on the staff); lift: the staff
// off the ground; rise: shoulders and head up; chin: the head drawn back a
// hair as he looks up; droop: the near sleeve's hang (it lags the arm);
// hem: the hem's sway (+ back); open: the near hand open; glow: the light.
const PRIEST = {
  folded: { near: [5.6, -12.6], far: [5.7, -15.2], droop: 1.0, sw: 1.9 },
  folded2: { rise: -0.4, near: [5.6, -12.7], far: [5.7, -15.3], droop: 1.2, sw: 1.9 },
  lift: { rise: -0.2, near: [6.8, -15.6], far: [5.7, -15.6], lift: 0.6, droop: 2.2, sw: 2.1, hem: 0.3, glow: 0.2 },
  rise: { rise: -0.3, chin: -0.2, near: [7.9, -19.2], far: [5.7, -16.0], lift: 1.1, droop: 2.4, bare: 0.2, hem: 0.5, open: 1, glow: 0.6 },
  raised: { rise: -0.4, chin: -0.4, near: [8.0, -22.2], far: [5.75, -16.4], lift: 1.5, droop: 1.4, bare: 0.45, sw: 2.3, hem: 0.1, open: 1, glow: 1 },
  crest: { rise: -0.6, chin: -0.5, near: [7.9, -23.0], far: [5.75, -16.6], lift: 1.8, droop: 0.6, bare: 0.5, sw: 2.3, hem: -0.3, open: 1, glow: 1.15 },
  raised2: { rise: -0.4, chin: -0.4, near: [8.3, -22.5], far: [5.75, -16.4], lift: 1.5, droop: 1.6, bare: 0.45, sw: 2.3, hem: 0.1, open: 1, glow: 1.1 },
};
export const PRIEST_FRAMES = ["folded", "folded2", "lift", "rise", "raised", "crest", "raised2"];
const priestFrame = (raised) => (typeof raised === "string" && PRIEST[raised] ? raised : raised ? "raised" : "folded");
// the staff: its foot and collar for a frame (it stands just behind the far
// hand), held a little out before him so its charm clears the mitre's peak
const priestStaffAt = (F) => [[5.5, 0.2 - (F.lift || 0)], [5.85, -24.6 - (F.lift || 0)]];
// where the hall pools the light for a frame: the open palm, the charm
export const priestLight = (raised) => {
  const F = PRIEST[priestFrame(raised)], [, top] = priestStaffAt(F);
  return { palm: [F.near[0] + 0.2, F.near[1] - 1.2], charm: [top[0], top[1] - 2.4], k: F.glow || 0, head: [0.4 + (F.chin || 0) * 0.6, -20.5 + (F.rise || 0)] };
};
// The blessing's frame at a time: when the aura is quiet (between waves, or
// no foe in his cold) a blessing every five seconds — up over 0.45 s, a
// crest, held, lowered over 0.5 s — phased by id so neighbours differ;
// `work` (0..1, eased by the hall) holds it up while the aura bites, the
// palm pressing forward now and then.
export const priestPose = (time, id = 0, work = 0) => {
  const P = 5, s = ((((time / P + id * 0.37) % 1) + 1) % 1) * P;
  let v = s < 0.45 ? s / 0.45 : s < 1.9 ? 1 : s < 2.4 ? 1 - (s - 1.9) / 0.5 : 0;
  const crest = s >= 0.45 && s < 0.66 && work < 1;
  v = Math.max(v, work);
  if (v < 0.12) return (time / 3.3 + id * 0.29) % 1 < 0.4 ? "folded2" : "folded";
  if (v < 0.45) return "lift";
  if (v < 0.8) return "rise";
  if (crest) return "crest";
  return work >= 1 && (time * 0.75 + id * 0.3) % 1 < 0.4 ? "raised2" : "raised";
};
export const drawPriest = (ctx, x, y, dir, pal, raised = false) => {
  const F = PRIEST[priestFrame(raised)];
  const robeC = pal.robe, stole = pal.trim, metal = pal.metal || "#d8b34a";
  const farC = darken(robeC, 0.16);
  const r = F.rise || 0, hm = F.hem || 0, hx = 0.4 + (F.chin || 0) * 0.6;
  const nsh = [2.2, -16.4 + r], fsh = [-1.4, -16.6 + r];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 0.6, 0.4, 5.6, 1.8, 0.3);
  // the far arm, behind the alb: only its hand shows, on the staff
  bellArm(ctx, fsh, F.far, farC, stole, pal.skin, { w: 1.8, droop: 0.8 });
  // the alb: shoulders, a nipped waist, a hem that flares and ripples
  blob(ctx, [[-3.3, -16.4 + r], [-0.8, -17.6 + r], [2.2, -17.4 + r], [3.8, -16.0 + r], [3.9, -11.2], [4.8, -5.4], [6.2 - hm, -0.3, 1], [4.2 - hm, 0.5], [1.6 - hm, 0.0], [-1.0 - hm, 0.5], [-3.6 - hm, 0.0], [-5.8 - hm * 1.4, -0.3, 1], [-4.8 - hm * 0.5, -5.4], [-3.8, -11.2]], robeC, {
    hi: 0.28, lo: 0.4, then: (c) => {
      c.strokeStyle = darken(robeC, 0.32); c.lineWidth = 0.55;                                // folds, fanning to the hem
      c.beginPath(); c.moveTo(-1.6, -9.4); c.quadraticCurveTo(-2.0, -4, -2.8 - hm, 0.4); c.stroke();
      c.beginPath(); c.moveTo(0.6, -8.6); c.quadraticCurveTo(0.8, -4, 0.6 - hm, 0.4); c.stroke();
      c.beginPath(); c.moveTo(3.2, -8.8); c.quadraticCurveTo(3.8, -4, 4.4 - hm, 0.4); c.stroke();
      c.strokeStyle = lighten(robeC, 0.45); c.lineWidth = 0.6;                               // the lit edge of a fold
      c.beginPath(); c.moveTo(-3.0, -9); c.quadraticCurveTo(-3.6, -4.5, -4.4 - hm, -0.6); c.stroke();
      c.beginPath(); c.moveTo(-0.6, -8.8); c.quadraticCurveTo(-0.8, -4, -1.2 - hm, -0.4); c.stroke();
      dab(c, -7, -1.0, 14, 1.6, darken(robeC, 0.22));                                          // the hem band
      dab(c, -7, -1.4, 14, 0.5, stole);
      dab(c, -5, -11.6, 10, 0.9, metal);                                                       // the girdle cord
    },
  });
  dab(ctx, 3.9, -0.6, 1.6, 0.9, "#4a3a3a");                                                    // a toe under the hem
  // the stole: two strands down the front, a gilt mark near each end
  for (const [x0, x1, bot, col] of [[-0.9, -0.6, -4.6, darken(stole, 0.2)], [1.4, 2.4, -3.4, stole]]) {
    blob(ctx, [[x0, -17.4 + r, 1], [x0 + 1.7, -17.4 + r, 1], [x1 + 1.8 - hm * 0.3, bot, 1], [x1 + 0.9 - hm * 0.3, bot + 0.7, 1], [x1 - hm * 0.3, bot, 1]], col, {
      hi: 0.35, lo: 0.3, then: (c) => { dab(c, x1 + 0.5 - hm * 0.3, bot - 2.4, 0.8, 1.6, metal); dab(c, x1 + 0.2 - hm * 0.3, bot - 2.0, 1.4, 0.6, metal); },
    });
  }
  // the mitre's ribbons, fallen behind the neck
  part(ctx, (c) => { c.fillStyle = darken(stole, 0.15); c.fillRect(hx - 3.3, -22.4 + r, 0.9, 4.6); c.fillRect(hx - 2.4, -22.4 + r, 0.7, 3.6); });
  // the staff in the far hand, its foot on (or just off) the ground
  const [foot, top] = priestStaffAt(F);
  priestStaff(ctx, foot[0], foot[1], top[0], top[1], pal);
  hand(ctx, F.far[0], F.far[1], pal.skin);                                                     // the far fist round it
  // the near arm, in front: on the staff, or raised in blessing
  bellArm(ctx, nsh, F.near, robeC, stole, pal.skin, { w: F.sw || 2.2, droop: F.droop || 0, open: F.open, bare: F.bare });
  head(ctx, hx, -20.5 + r, pal, { hood: false });
  const hy = r, mx = hx - 0.4;
  if (pal.hair) { dab(ctx, mx - 1.9, -22.6 + hy, 2.0, 0.8, pal.hair); dab(ctx, mx - 1.9, -22.0 + hy, 0.8, 2.2, darken(pal.hair, 0.15)); }   // hair at the nape, under the mitre
  if (pal.beard) part(ctx, (c) => { c.beginPath(); c.moveTo(mx - 0.2, -19.4 + hy); c.quadraticCurveTo(mx + 1.6, -15.6 + hy, mx + 3.2, -19.2 + hy); c.closePath(); c.fillStyle = pal.beard; c.fill(); });
  // the mitre: a back peak, then the front one, banded and gemmed
  const hat = pal.hat;
  blob(ctx, [[mx - 2.6, -22.8 + hy, 1], [mx + 1.4, -22.8 + hy, 1], [mx + 0.6, -26.4 + hy], [mx - 0.9, -29.4 + hy, 1], [mx - 2.4, -26.6 + hy]], darken(hat, 0.2), { hi: 0.25 });
  blob(ctx, [[mx - 1.9, -22.4 + hy, 1], [mx + 3.5, -22.4 + hy, 1], [mx + 3.7, -25.2 + hy], [mx + 2.6, -28.2 + hy], [mx + 1.1, -30.2 + hy, 1], [mx - 0.4, -28.2 + hy], [mx - 1.9, -25.4 + hy]], hat, {
    hi: 0.3, lo: 0.42, then: (c) => {
      dab(c, mx - 2.2, -23.6 + hy, 6.2, 1.2, metal);                                           // the band
      dab(c, mx + 0.6, -29 + hy, 1, 5.4, metal);                                               // the orphrey up the front
      dab(c, mx + 0.4, -26.4 + hy, 1.4, 1.4, pal.gem); dab(c, mx + 0.5, -26.3 + hy, 0.5, 0.5, "#fff3d2");   // the gem
    },
  });
  ctx.restore();
};

export const MAGE_FOLK = {
  base: { skin: "#e8b990", robe: "#5a4a8c", hat: "#3f3468", trim: "#d8b34a", beard: "#e8e0d0" },
  a: { skin: "#e8b990", robe: "#8a3a2e", hat: "#5a2420", trim: "#e8a040", beard: "#e8e0d0" },
  aa: { skin: "#e8b990", robe: "#9a2420", hat: "#6a1616", trim: "#f0c050", beard: "#e8e0d0" },
  ab: { skin: "#e8b990", robe: "#c05a24", hat: "#2e2228", trim: "#f0c050", beard: "#e8e0d0" },
  b: { skin: "#e8b990", robe: "#2e4a7a", hat: "#1f3252", trim: "#8ce8f0", beard: "#e8e0d0" },
  ba: { skin: "#e8b990", robe: "#24406e", hat: "#182a48", trim: "#a8f0f8", beard: "#e8e0d0" },
  bb: { skin: "#e8b990", robe: "#3a3a80", hat: "#22224e", trim: "#f0e070", beard: "#e8e0d0" },
};
export const PRIEST_FOLK = {
  base: { skin: "#e8b990", hair: "#8a5a34", robe: "#e6dfcc", hat: "#f0ead8", trim: "#4a9ab4", gem: "#8ce8f0", metal: "#d8b34a", staff: "#8a6a44" },
  a: { skin: "#e8b990", hair: "#8a5a34", robe: "#d0e2ec", hat: "#eef6fa", trim: "#3a7eb0", gem: "#a8ecf8", metal: "#c4d4e0", staff: "#9aaebc" },
  aa: { skin: "#f0d0bc", hair: "#e4eef4", robe: "#b4d0e4", hat: "#f2faff", trim: "#28588e", gem: "#c8f6ff", metal: "#e0ecf4", staff: "#b4c8d8" },
  ab: { skin: "#e8b990", hair: "#6a4a30", robe: "#a4c4d6", hat: "#e4f0f6", trim: "#2e6c8c", gem: "#9ce4f8", metal: "#c4d4e0", staff: "#8aa0b0" },
  b: { skin: "#e8b990", hair: "#8a5a34", robe: "#ece6cc", hat: "#f4efdc", trim: "#5a9a44", gem: "#9ce88c", metal: "#d8b34a", staff: "#8a6a44" },
  ba: { skin: "#e8b990", hair: "#a06a38", robe: "#f2e8c4", hat: "#f8f0d4", trim: "#4e8a3c", gem: "#f0dc7a", metal: "#e0bc50", staff: "#7a5334" },
  bb: { skin: "#e8b990", hair: "#a06a38", robe: "#faf4de", hat: "#fff8e4", trim: "#c8962c", gem: "#f8e070", metal: "#e8c458", staff: "#7a5334" },
};
