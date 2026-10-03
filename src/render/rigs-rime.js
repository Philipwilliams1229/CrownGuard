// ============ RIGS: THE RIME CLANS' WARRIORS (thrall, huscarl, berserker, rime seer, skald, the Rime Jarl) ============
// Zone IV's sea raiders (art/ZONES-4-5.md), on the same upright human
// skeleton as the Iron Kingdom's foot (rigs-iron.js: the kit below is its
// copy) but never to be taken for them: no plate, no oxblood, no banners.
// Furs and undyed wool weathered by sea salt, ring mail, round shields
// painted in the clans' OCHRE and deep SEA-TEAL, plain or horned iron
// helms, braids, and frost-blue and bone for their charms. Entries have the
// RIGS shape ({ kind, box: { hw, up, down }, p, fightN }); RIME_PAINTERS
// maps the kind to its painter (ctx, p) — p.pose "walk" | "fight", p.frame
// 0-3 (walk: contact, passing, contact, passing; fight: guard, wind-up,
// strike, follow-through — every rig sets fightN: 4), feet at 0,0, facing
// +x. Joints are measured in the joint lab's "rime" set (joint-sets/rime.js).
// p.look picks the kit:
//   thrall     the rank and file: a round iron cap, a flax braid, a fur
//              capelet over a sea-teal tunic, a bearded hand axe and a small
//              painted buckler; a light, quick step
//   huscarl    the heavy: a spangenhelm with nasal and spectacle guard and a
//              mail curtain, ring mail to the knee under a fur mantle, a
//              great painted round shield up to the chin, a long-hafted axe
//   berserker  bare-chested and woad-striped under a bear's pelt worn over
//              the head (snout over his brow, the hide down his back), a
//              hand axe in each fist, a wild forked red beard. `berserkerRage`
//              is the same man wounded and frenzied (p.rage): flushed skin,
//              white-hot eyes, a red haze about him — for the engine to show
//              through e.sprite when his fury rises (he grows faster and
//              harder-hitting as he's hurt)
//   seer       the Rime Seer, the tower freezer: a deep fur-rimmed hood, pale
//              braids, frost-blue eyes and a chin rune, a long smoke-grey robe
//              hemmed in white fur, rune-stones of bone at her belt, and a
//              staff of frozen whalebone crowned with ice. Her fight is the
//              shroud cast: gather (the far palm to the breast), raise (staff
//              high, frost on the palm), release (the staff thrust at the
//              hall, frost shards bursting off the ice), recover
//   skald      the war-chanter: a sea-teal cloak with an ochre border and a
//              fur collar, a long braided beard, singing, a painted frame drum
//              on the far arm and a knobbed bone beater. He beats it on the
//              march (the beater falls on each contact frame, his mouth open).
//              Walk frames 4-7 are a CHANT sheet (he halts, head back,
//              beating and singing): drawRig(ctx, "skald", x, y, dir, "walk",
//              4 + n) — enemies.js plays only 0-3 unless asked. He fights by
//              clubbing with the beater behind the drum
//   jarl       the Rime Jarl, the boss: a horned helm crowned with frost-blue
//              stones, a white bear-fur mantle over mail and a sea-teal cape,
//              a long white-blond braided beard and a two-handed Dane axe whose
//              blade is furred with rime. Registered on foot as `rimejarlfoot`;
//              `rimeJarlRider(ctx, p, fight, frame)` (exported) paints him
//              SEATED astride, hips at the anchor, for the war-mammoth's
//              composite in rigs-rimebeasts.js (RIME_JARL is his palette)
// Colours come only from p.skin / cloth / cloth2 / hair / cape / col / mane /
// wcol / shcol, so the necromancer's pale revive and the white hit-flash
// reach everything.

import { lighten, darken, mix, rgba, ball, glow, lin, part, shadow } from "./paint.js";
import { logJoint } from "./folk-kit.js";

// ---- the kit (copied from rigs-iron.js: the same small skeleton) -------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SUNV = [-0.59, -0.81];

// a closed path; points are [x, y] (rounded through) or [x, y, 1] (a corner)
const path = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = pts[0][2] ? pts[0] : mid(pts[n - 1], pts[0]);
  c.beginPath(); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    if (p[2]) c.lineTo(p[0], p[1]);
    else { const m = q[2] ? q : mid(p, q); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  }
  c.closePath();
};
const cel = (c, x0, y0, x1, y1, col, hi = 0.32, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
// a lit shape as its own inked part; o.then paints inside it, clipped
const blob = (ctx, pts, col, o = {}) => part(ctx, (c) => {
  path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, o.hi, o.lo); c.fill();
  if (o.then) { c.save(); path(c, pts); c.clip(); o.then(c); c.restore(); }
});
const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const poly = (c, pts, col) => { c.beginPath(); c.moveTo(...pts[0]); for (const q of pts.slice(1)) c.lineTo(...q); c.closePath(); c.fillStyle = col; c.fill(); };

// a round limb segment shaded across its width, the lit side toward the sun
const tube = (c, x0, y0, x1, y1, w, col) => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  if (nx * SUNV[0] + ny * SUNV[1] < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  c.strokeStyle = lin(c, mx + nx * w / 2, my + ny * w / 2, mx - nx * w / 2, my - ny * w / 2, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.42)]]);
  c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};
// two bones from a root to a target → [joint, end]; dir 1 bends toward +x
const ik = (ax, ay, bx, by, l1, l2, dir) => {
  const dx = bx - ax, dy = by - ay, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = a - dir * k;
  return [[ax + Math.cos(j) * l1, ay + Math.sin(j) * l1], [ax + Math.cos(a) * d, ay + Math.sin(a) * d]];
};
const frameAt = (x, y, a) => { const cs = Math.cos(a), sn = Math.sin(a); return (lx, ly) => [x + lx * cs - ly * sn, y + lx * sn + ly * cs]; };
const inFrame = (ctx, x, y, a, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fn(ctx); ctx.restore(); };
// walking along a haft: u down its length, v across it (+v is "below" a level haft)
const along = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); return (u, v = 0) => [x + dx * u - dy * v, y + dy * u + dx * v]; };
const haft = (c, to, u0, u1, w, col) => { const [x0, y0] = to(u0), [x1, y1] = to(u1); tube(c, x0, y0, x1, y1, w, col); };

// The gait: contact, passing, contact, passing. The fight is four frames
// (the rigs set fightN: 4; enemies.js plays them off the foe's attack clock):
//   0 guard   weapon up between blows, weight centred
//   1 wind-up the weapon drawn back, the weight settling on the back foot
//   2 strike  the near foot steps in, the weight thrown forward
//   3 follow  the weapon past the line, the body recovering over the planted foot
// st.drive says how far into the blow the body is (0 wound .. 1 struck) and
// st.cloth how far the hems and capes have swung — they trail the body by a
// frame and overshoot on the follow-through.
// A shooter (o.shoot, the crossbowman) stands his ground instead: 0 ready,
// 1 aim, 2 loose (the kick rocks him back), 3 reload (he stoops to the box).
const DRIVE = [0.35, 0, 1, 0.75], CLOTH = [0.45, 0, 0.75, 1];
const step = (p, o) => {
  const f = (p.frame || 0) % 4, s = o.stride;
  if (p.pose !== "fight") {
    const c = [1, 0, -1, 0][f];
    return {
      fight: false, f, c,
      near: f === 3 ? [-0.3 * s, -o.lift] : [c * s + (f === 1 ? 0.2 * s : 0), 0],
      far: f === 1 ? [-0.3 * s, -o.lift] : [-c * s + (f === 3 ? 0.2 * s : 0), 0],
      x: 0, bob: f % 2 ? -o.bob : 0, lean: o.lean + (f % 2 ? 0 : o.dip), swing: -c,
    };
  }
  const hl = o.hitLean ?? 0.2;
  if (o.shoot) return {
    fight: true, f, c: 0, hit: f === 2, drive: [0.3, 0.1, 0.5, 0.6][f], cloth: [0.3, 0.1, 0.6, 0.8][f],
    near: [s * 0.95, 0], far: [-s * 0.95, 0],
    x: [0, 0.15, -0.35, 0.2][f], bob: o.bob * [0.4, 0.6, 0.3, 1.0][f], lean: o.lean + [0.02, 0.06, -0.06, 0.2][f], swing: 0,
  };
  const planted = f >= 2;   // the near foot stepped in on the strike, and stays
  return {
    fight: true, f, c: 0, hit: f === 2, drive: DRIVE[f], cloth: CLOTH[f],
    near: [planted ? s * 1.1 + o.lunge * 0.8 : s * 0.9, 0], far: [-s * 0.95, 0],
    x: [0, -0.6, o.lunge, o.lunge * 0.8][f], bob: o.bob * [0.3, 0.2, 1.1, 0.9][f],
    lean: o.lean + [0.02, -0.13, hl, hl * 0.8][f], swing: 0,
  };
};
const skeleton = (p, o) => {
  // (the clans' additions) seated astride a beast: the hips at the anchor, the
  // legs over its back, the feet down its flank; the ride bobs with its walk
  if (p.seated) {
    const f = (p.frame || 0) % 4, fight = p.pose === "fight";
    const bob = fight ? [0.2, 0.1, 0.5, 0.4][f] : [0, -0.35, 0, -0.35][f];
    const st = {
      fight, f, c: 0, hit: fight && f === 2, drive: fight ? DRIVE[f] : 0, cloth: fight ? CLOTH[f] : 0, seated: true,
      near: [2.6, 8.6], far: [2.0, 8.2], x: 0, bob, lean: fight ? [0.02, -0.12, 0.16, 0.12][f] : 0.03, swing: fight ? 0 : [0.25, 0, -0.25, 0][f],
    };
    const hip = [0, bob * 0.5];
    return { st, hip, ank: o.ankle, T: frameAt(hip[0], hip[1], st.lean) };
  }
  // walk frames 4-7: a halt (the skald's chant), the feet planted as a shooter's
  const chant = p.pose !== "fight" && (p.frame || 0) >= 4;
  const st = chant ? { ...step({ pose: "fight", frame: (p.frame || 0) - 4 }, { ...o, shoot: true }), fight: false, chant: true } : step(p, o);
  const reach = o.L1 + o.L2, ank = o.ankle;
  const hipH = Math.min(Math.sqrt(reach * reach - o.stride * o.stride) * 0.96, reach - o.bob - 0.15) + ank;
  const hip = [st.x, -hipH + st.bob];
  return { st, hip, ank, T: frameAt(hip[0], hip[1], st.lean) };
};
const foot = (ctx, x, y, len, h, col, o = {}) => part(ctx, (c) => {
  path(c, [[x - len * 0.32, y, 1], [x - len * 0.36, y - h * 0.8], [x - len * 0.05, y - h], [x + len * 0.35, y - h * 0.6], [x + len * 0.66, y - h * 0.2], [x + len * 0.68, y, 1]]);
  c.fillStyle = cel(c, x - len * 0.4, y - h, x + len * 0.7, y, col); c.fill();
  if (o.sole) dab(c, x - len * 0.4, y - 0.5, len * 1.1, 0.5, o.sole);
  if (o.plate) { line(c, x - len * 0.05, y - h * 0.9, x + len * 0.3, y - h * 0.45, 0.4, lighten(col, 0.5)); line(c, x + len * 0.1, y - h * 0.75, x + len * 0.12, y - h * 0.1, 0.35, darken(col, 0.4)); }
});
const leg = (ctx, R, o, which, cols) => {
  const { st, T, ank } = R;
  const [fx, fy] = st[which];
  const hp = T(which === "near" ? o.hipW : -o.hipW, 0);
  const [kn, an] = ik(hp[0], hp[1], fx, fy - ank, o.L1, o.L2, 1);
  logJoint(ctx, "leg", hp, kn, an, { lens: [o.L1, o.L2] });
  part(ctx, (c) => {
    tube(c, hp[0], hp[1], kn[0], kn[1], o.thigh, cols.thigh);
    tube(c, kn[0], kn[1], an[0], an[1], o.shin, cols.shin);
    if (cols.wrap) { const t = cols.wrapAt ?? 0.55; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, an[0], an[1], o.shin * 1.1, cols.wrap); }
    if (cols.garter) { const t = 0.12; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, kn[0] + (an[0] - kn[0]) * (t + 0.1), kn[1] + (an[1] - kn[1]) * (t + 0.1), o.shin * 1.15, cols.garter); }
    // the knee cop is a colour step in the leg's own part, never an ink ring
    // across the knee (owner, 2026-09-29: one inked part per limb)
    if (cols.knee) { ball(c, kn[0] + 0.3, kn[1], 1.25, 1.15, cols.knee, { hi: 0.5, lo: 0.45 }); dab(c, kn[0] - 0.1, kn[1] - 0.6, 0.5, 0.5, lighten(cols.knee, 0.6)); }
  });
  foot(ctx, an[0], an[1] + ank, o.foot, ank + 0.55, cols.foot, { plate: cols.plate, sole: cols.sole });
  return { hp, kn, an };
};
// An arm to the hand's target `to`: the elbow folds the natural way (the
// forearm swings forward and up off the upper arm); o.flip folds it the other
// way, ONLY for an arm raised out to the side (see "Joints and motion" in
// art/STYLE-GUIDE.md). The lab is shown the TARGET, so a hand posed out of
// reach reads as a stretched bone. The hand comes back with its elbow on it
// (hd.el) for the wrist check (`grip`).
const arm = (ctx, sh, to, o, cols) => {
  const flip = !!o.flip;
  const [el, hd] = ik(sh[0], sh[1], to[0], to[1], o.up, o.fore, flip ? 1 : -1);
  logJoint(ctx, "arm", sh, el, to, { lens: [o.up, o.fore], flip });
  hd.el = el;
  part(ctx, (c) => {
    tube(c, sh[0], sh[1], el[0], el[1], o.w, cols.up);
    tube(c, el[0], el[1], hd[0], hd[1], o.w * 0.92, cols.fore || cols.up);
    if (cols.cuff) { const t = 0.4; tube(c, el[0] + (hd[0] - el[0]) * t, el[1] + (hd[1] - el[1]) * t, hd[0] - (hd[0] - el[0]) * 0.1, hd[1] - (hd[1] - el[1]) * 0.1, o.w * 1.08, cols.cuff); }
    if (cols.elbow) ball(c, el[0], el[1], o.w * 0.62, o.w * 0.58, cols.elbow, { hi: 0.5, lo: 0.45 });
  });
  return hd;
};
// the wrist: a haft or hilt leaving the fist along `a` (logged for the lab as
// elbow → hand → a point up the haft; the lab draws it, the analysis reads it)
const grip = (ctx, hd, a) => { if (hd.el) logJoint(ctx, "wrist", hd.el, hd, [hd[0] + Math.cos(a) * 3, hd[1] + Math.sin(a) * 3]); };
const fist = (ctx, x, y, r, col) => part(ctx, (c) => ball(c, x, y, r, r * 0.95, col, { hi: 0.45, lo: 0.4 }));
// a caster's open hand: the palm and three fingers spread along the forearm's line
const openHand = (ctx, h, col, spread = 1) => part(ctx, (c) => {
  const a = h.el ? Math.atan2(h[1] - h.el[1], h[0] - h.el[0]) : 0;
  ball(c, h[0], h[1], 0.85, 0.85, col, { hi: 0.45, lo: 0.4 });
  c.strokeStyle = col; c.lineWidth = 0.5; c.lineCap = "round";
  for (const d of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(h[0], h[1]); c.lineTo(h[0] + Math.cos(a + d * spread) * 1.6, h[1] + Math.sin(a + d * spread) * 1.6); c.stroke(); }
});

// ---- the clans' colours ---------------------------------------------------------------
const IRON = "#34343c", OAK = "#7a5636", LEATHER = "#5e4028", INKY = "#1a1420";
const BONE = "#e6dcc0", TEAL = "#2f5866", FROSTC = "#a8dcf4", WRAP = "#a48a64";

// mail: rows of ring dots over a part already filled
const mailDots = (c, x0, y0, x1, y1, col, step = 0.85) => {
  for (let y = y0, r = 0; y < y1; y += step, r++) for (let x = x0 + (r % 2) * step * 0.5; x < x1; x += step) dab(c, x, y, 0.35, 0.35, col);
};

// ---- shields and the drum (faced to the viewer) --------------------------------------
// a round shield: a rawhide rim, a field painted in the clan's two colours
// (`design`: "quarters", "band" or "rays"), plank seams, an iron boss
const roundShield = (ctx, x, y, rx, ry, f1, f2, design = "quarters") => part(ctx, (c) => {
  const rim = "#b0946a";
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - rx, y - ry, x + rx, y + ry, rim, 0.4, 0.45); c.fill();
  const ix = rx - 0.7, iy = ry - 0.7;
  c.beginPath(); c.ellipse(x, y, ix, iy, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - ix, y - iy, x + ix, y + iy, f1, 0.3, 0.4); c.fill();
  c.save(); c.clip();
  const f2c = (k) => cel(c, x - ix, y - iy, x + ix, y + iy, f2, 0.25, 0.4);
  const wedge = (a0, a1) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a0) * rx * 2, y + Math.sin(a0) * ry * 2); c.lineTo(x + Math.cos(a1) * rx * 2, y + Math.sin(a1) * ry * 2); c.closePath(); c.fill(); };
  c.fillStyle = f2c();
  if (design === "quarters") { wedge(-Math.PI / 2, 0); wedge(Math.PI / 2, Math.PI); }
  else if (design === "rays") { for (let k = 0; k < 8; k += 2) wedge(k * Math.PI / 4 + 0.2, (k + 1) * Math.PI / 4 + 0.2); }
  else { c.fillRect(x - rx, y - iy * 0.28, rx * 2, iy * 0.56); c.fillRect(x - ix * 0.24, y - ry, ix * 0.48, ry * 2); }
  for (const k of [-0.5, 0.5]) line(c, x + ix * k, y - iy, x + ix * k + 0.1, y + iy, 0.3, rgba("#2a1c2c", 0.35));
  c.restore();
  c.strokeStyle = lighten(rim, 0.6); c.lineWidth = 0.4;
  c.beginPath(); c.ellipse(x, y, rx - 0.3, ry - 0.3, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; dab(c, x + Math.cos(a) * (rx - 0.35) - 0.22, y + Math.sin(a) * (ry - 0.35) - 0.22, 0.45, 0.45, darken(rim, 0.4)); }
  // the boss
  ball(c, x + 0.1, y, Math.min(rx, ry) * 0.3, Math.min(rx, ry) * 0.3, "#8a8e96", { hi: 0.6, lo: 0.5 });
  dab(c, x - 0.35, y - 0.45, 0.45, 0.45, "#fff3d2");
});

// the skald's frame drum: a stretched hide in a bent-wood hoop, a raven's
// foot rune painted on it in sea-teal; `hit` shows the hide trembling
const frameDrum = (ctx, x, y, rx, ry, p, hit) => part(ctx, (c) => {
  const hide = "#e4d2a8", rune = p.shcol || TEAL;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - rx, y - ry, x + rx, y + ry, OAK, 0.4, 0.45); c.fill();
  const ix = rx - 0.6, iy = ry - 0.6;
  c.beginPath(); c.ellipse(x, y, ix, iy, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - ix, y - iy, x + ix, y + iy, hide, 0.25, 0.3); c.fill();
  // the rune: a staff with three toes (the raven's foot), and a ring
  line(c, x, y - iy * 0.65, x, y + iy * 0.5, 0.55, rune);
  for (const d of [-0.7, 0, 0.7]) line(c, x, y + iy * 0.2, x + d * ix * 0.6, y + iy * 0.65, 0.5, rune);
  c.strokeStyle = rune; c.lineWidth = 0.45; c.beginPath(); c.ellipse(x, y, ix * 0.78, iy * 0.78, 0, 0, Math.PI * 2); c.stroke();
  if (hit) { c.strokeStyle = rgba("#fff3d2", 0.9); c.lineWidth = 0.35; c.beginPath(); c.ellipse(x, y, ix * 0.45, iy * 0.45, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); }
  c.strokeStyle = lighten(OAK, 0.6); c.lineWidth = 0.35;
  c.beginPath(); c.ellipse(x, y, rx - 0.25, ry - 0.25, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
});

// ---- weapons -----------------------------------------------------------------------
// a bearded axe gripped at (x, y), its haft along a: the head at `len`, the
// blade on the haft's +v side (the side that leads an overhead chop), the
// beard dropping back down the haft; s scales the head, o.frost furs the edge
const axe = (ctx, x, y, a, steel, o = {}) => {
  const to = along(x, y, a), back = o.back ?? 1.4, len = o.len ?? 5.6, s = o.s ?? 1, wood = o.wood || OAK;
  part(ctx, (c) => {
    haft(c, to, -back, len + 0.7 * s, o.w ?? 0.95, wood);
    tube(c, ...to(-back - 0.15), ...to(-back + 0.55), (o.w ?? 0.95) * 1.3, LEATHER);
    if (o.rings) for (const u of o.rings) tube(c, ...to(u - 0.25), ...to(u + 0.25), (o.w ?? 0.95) * 1.35, o.ringCol || BONE);
  });
  part(ctx, (c) => {
    const pts = [[...to(len + 0.6 * s, 0.4), 1], [...to(len + 1.5 * s, 2.6 * s)], [...to(len + 0.9 * s, 3.7 * s), 1], [...to(len - 0.6 * s, 3.4 * s)], [...to(len - 2.3 * s, 3.7 * s), 1], [...to(len - 1.3 * s, 1.7 * s)], [...to(len - 0.8 * s, 0.4), 1]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), steel, 0.4, 0.42); c.fill();
    // the bright ground edge, a dark socket, the poll behind the haft
    c.strokeStyle = lighten(steel, 0.7); c.lineWidth = 0.45; c.beginPath(); c.moveTo(...to(len + 1.2 * s, 2.9 * s)); c.quadraticCurveTo(...to(len + 0.6 * s, 3.9 * s), ...to(len - 2.0 * s, 3.6 * s)); c.stroke();
    line(c, ...to(len - 0.8 * s, 1.2 * s), ...to(len + 0.5 * s, 1.2 * s), 0.35, darken(steel, 0.35));
    poly(c, [to(len - 0.8 * s, -0.45), to(len + 0.6 * s, -0.45), to(len + 0.4 * s, -1.25 * s), to(len - 0.6 * s, -1.25 * s)], darken(steel, 0.2));
    if (o.frost) {
      // rime along the edge: pale crystals standing off it
      for (const [u, v] of [[len + 1.3, 3.2], [len + 0.2, 3.9], [len - 1.1, 3.8], [len - 2.1, 4.0]]) {
        const [px, py] = to(u * 1 + (s - 1) * (u - len), v * s);
        dab(c, px - 0.3, py - 0.3, 0.6, 0.6, o.frost);
      }
      line(c, ...to(len - 0.2 * s, 1.6 * s), ...to(len + 0.6 * s, 2.8 * s), 0.4, o.frost);
    }
  });
  return to;
};

// the skald's beater: a short haft and a knob of carved bone
const beater = (ctx, x, y, a) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -1.0, 3.0, 0.8, OAK);
  ball(c, ...to(3.4), 1.05, 1.0, BONE, { hi: 0.45, lo: 0.45 });
  line(c, ...to(2.4, -0.5), ...to(2.4, 0.5), 0.5, LEATHER);
});

// the seer's staff, gripped at (x, y) along a: frozen whalebone, a crook at
// the head curling back over a cluster of ice, two rune-stones swinging on
// cords below it; fl 0 at rest, 1 raised (the ice glows), 2 loosed (frost
// shards burst off it)
const seerStaff = (ctx, x, y, a, p, o) => {
  const to = along(x, y, a), top = o.top ?? 13, butt = o.butt ?? 9, fl = o.frost || 0;
  const bone = p.wcol || BONE, ice = p.col || FROSTC, white = mix(ice, "#f4f8ff", 0.7);
  part(ctx, (c) => {
    haft(c, to, -butt, top, 1.0, bone);
    for (const u of [-butt + 1.2, top - 3.4]) tube(c, ...to(u - 0.3), ...to(u + 0.3), 1.25, LEATHER);
    // knuckles of the bone
    for (const u of [-3, 2.5, 7]) dab(c, ...to(u, -0.2), 0.45, 0.45, darken(bone, 0.25));
  });
  // the crook: a curl back over the ice
  part(ctx, (c) => {
    c.strokeStyle = cel(c, ...to(top - 1, -2), ...to(top + 2, 2), bone, 0.4, 0.4); c.lineWidth = 0.95; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(top - 0.4)); c.quadraticCurveTo(...to(top + 2.6, 0.2), ...to(top + 2.0, -2.4)); c.quadraticCurveTo(...to(top + 1.2, -3.4), ...to(top + 0.2, -2.4)); c.stroke();
  });
  const C = to(top + 0.6, -1.5);
  glow(ctx, C[0], C[1], [3.6, 5.6, 7.4][fl], ice, fl ? 0.5 : 0.32);
  part(ctx, (c) => {
    // the ice: three spikes off a lump, hung inside the crook
    const [cx, cy] = C;
    for (const [dx, dy, l] of [[0, -1, 1.8], [0.9, 0.6, 1.4], [-0.9, 0.7, 1.5]]) poly(c, [[cx - dy * 0.45, cy + dx * 0.45], [cx + dx * l, cy + dy * l], [cx + dy * 0.45, cy - dx * 0.45]], fl ? white : ice);
    ball(c, cx, cy, 0.95, 0.95, ice, { hi: 0.5, lo: 0.35 });
    dab(c, cx - 0.5, cy - 0.5, 0.5, 0.5, "#f8fcff");
  });
  // the rune-stones on their cords, swinging off the crook
  const sw = o.sway || 0;
  for (const [k, L] of [[-0.6, 2.4], [0.5, 3.4]]) {
    const A0 = to(top - 0.2, -0.5 + k * 0.4), B = [A0[0] + sw * 0.6 + k, A0[1] + L];
    ctx.strokeStyle = "#8a7a62"; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(...A0); ctx.lineTo(...B); ctx.stroke();
    part(ctx, (c) => { ball(c, B[0], B[1] + 0.55, 0.75, 0.75, bone, { hi: 0.45, lo: 0.4 }); dab(c, B[0] - 0.15, B[1] + 0.2, 0.35, 0.75, ice); });
  }
  if (fl > 1) {
    // the shroud loosed: frost shards flying off the ice, a pale ring
    ctx.fillStyle = rgba(white, 0.34);
    for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + 0.3; ctx.fillRect(C[0] + Math.cos(t) * 3.2 - 0.35, C[1] + Math.sin(t) * 3.2 - 0.35, 0.7, 0.7); }
    part(ctx, (c) => {
      for (const [t, r] of [[-0.9, 4.6], [-0.2, 5.6], [0.5, 4.8]]) {
        const sx = C[0] + Math.cos(t + a + 1.2) * r, sy = C[1] + Math.sin(t + a + 1.2) * r, ux = Math.cos(t + a + 1.2), uy = Math.sin(t + a + 1.2);
        poly(c, [[sx - uy * 0.4, sy + ux * 0.4], [sx + ux * 1.6, sy + uy * 1.6], [sx + uy * 0.4, sy - ux * 0.4]], white);
      }
    });
  }
};

// ---- heads ----------------------------------------------------------------------------
// (0,0) the middle of the skull, +x the face; a man's head is ~4.6 across
const FACE = [[-2.0, 0.2], [-1.9, -1.6], [-0.6, -2.5], [1.2, -2.4], [2.1, -1.4], [2.3, -0.5], [2.8, 0.3, 1], [2.2, 0.8], [2.0, 1.6], [1.1, 2.4], [-0.4, 2.3], [-1.6, 1.4]];
const face = (c0, skin, o = {}) => blob(c0, FACE, skin, {
  hi: 0.26, lo: 0.36, then: (c) => {
    dab(c, -0.9, -0.3, 0.8, 1.2, darken(skin, 0.24));                      // the ear
    if (o.woad) dab(c, 0.2, -1.5, 3, 1.3, o.woad);                          // woad across the eyes
    line(c, 0.6, -1.2, 1.9, -1.0, o.soft ? 0.4 : 0.55, darken(o.brow || skin, 0.6));
    dab(c, 1.0, -0.72, 0.62, 0.85, o.eyes || INKY);
    if (!o.eyes) dab(c, 1.0, -0.72, 0.3, 0.3, "#fff3d2");
    line(c, 1.9, 0.0, 2.3, 0.6, 0.4, darken(skin, 0.3));                   // the nose's side
    if (o.sing) dab(c, 1.4, 1.0, 1.0, 0.9, "#4a2028");                      // the mouth open in song
    else dab(c, 1.4, 1.3, 0.9, 0.35, darken(skin, 0.45));
    dab(c, 0.4, 0.4, 0.4, 1.4, darken(skin, 0.14));                         // a weathered cheek
    if (o.tattoo) { line(c, 1.5, 1.7, 1.5, 2.5, 0.35, o.tattoo); line(c, 0.9, 1.9, 1.3, 2.4, 0.3, o.tattoo); }
    if (o.shade) { c.fillStyle = darken(skin, 0.32); c.fillRect(-3, -3, 7, o.shade); }
  },
});
// beards hang below the jaw, so they are their own part (outside the face's clip)
const BEARDS = {
  short: [[0.2, 0.9], [1.2, 1.1], [2.4, 1.0], [2.6, 1.9], [2.0, 3.0, 1], [0.8, 2.8], [-0.2, 2.0]],
  full: [[-0.6, 0.3], [1.0, 1.0], [2.4, 1.0], [2.7, 2.0], [2.2, 3.6], [1.4, 4.0, 1], [0.4, 3.3], [-0.6, 2.2]],
  fork: [[-0.6, 0.3], [1.0, 1.0], [2.5, 1.0], [2.8, 2.2], [3.0, 4.4, 1], [2.1, 3.4], [1.5, 4.6, 1], [0.6, 3.4], [-0.6, 2.2]],
  long: [[-0.6, 0.3], [1.0, 1.0], [2.5, 1.0], [2.8, 2.2], [2.4, 4.2], [1.9, 6.0, 1], [1.2, 4.4], [0.2, 3.4], [-0.6, 2.2]],
};
const beard = (c0, kind, col, o = {}) => blob(c0, BEARDS[kind], col, {
  hi: 0.3, lo: 0.4, then: (c) => {
    line(c, 1.0, 1.6, 1.4, 3.4, 0.35, darken(col, 0.3));
    if (o.sing) dab(c, 1.5, 1.05, 1.0, 0.95, "#4a2028");
    else dab(c, 1.5, 1.3, 0.9, 0.35, darken(col, 0.45));
    if (kind === "long") { dab(c, 1.3, 4.3, 1.0, 0.45, o.bead || BONE); dab(c, 1.5, 5.3, 0.7, 0.4, o.bead || BONE); }
    if (kind === "fork") { dab(c, 2.2, 3.4, 0.7, 0.4, o.bead || BONE); }
  },
});
// a braid hanging down the nape, bound in bone beads
const braid = (c0, col, len = 4.6, sw = 0) => blob(c0, [[-1.8, -0.6], [-2.6, 0.4], [-3.0 + sw * 0.3, len * 0.55], [-2.9 + sw, len, 1], [-2.0 + sw, len - 0.2, 1], [-2.1 + sw * 0.3, len * 0.5], [-1.4, 0.8]], col, {
  hi: 0.35, lo: 0.4, then: (c) => { for (let k = 0.3; k < 1; k += 0.28) dab(c, -3.2 + sw * k, len * k, 1.6, 0.35, darken(col, 0.3)); dab(c, -3.0 + sw, len - 0.9, 1.2, 0.5, BONE); },
});

// the thrall's cap: a round iron bowl on a leather band
const capHelm = (c0, steel) => blob(c0, [[-2.5, -0.7, 1], [-2.6, -2.3], [-1.6, -3.8], [0.2, -4.3], [1.9, -3.7], [2.6, -2.3], [2.6, -0.9, 1]], steel, {
  hi: 0.5, lo: 0.42, then: (c) => {
    line(c, -1.2, -3.8, -2.0, -1.6, 0.5, lighten(steel, 0.6));
    dab(c, -3, -1.5, 6, 0.75, LEATHER);
    dab(c, 1.6, -1.4, 0.45, 0.45, BONE);
  },
});
// the spangenhelm: four plates riveted to a peak, a nasal and spectacle
// guard over the eyes; the mail curtain behind is drawn before the face
const spangen = (c0, steel, o = {}) => blob(c0, [[-2.6, -0.7, 1], [-2.7, -2.1], [-1.9, -3.7], [0.0, -4.9, 1], [1.9, -3.7], [2.8, -2.1], [2.8, -0.7, 1]], steel, {
  hi: 0.5, lo: 0.45, then: (c) => {
    line(c, -0.4, -4.6, -2.3, -1.2, 0.5, lighten(steel, 0.6));
    line(c, 0.2, -4.8, 1.2, -1.0, 0.4, darken(steel, 0.35));
    dab(c, -3, -1.45, 6, 0.8, o.band || darken(steel, 0.3));
    for (const rx of [-2.0, -0.2, 1.6]) dab(c, rx, -1.3, 0.45, 0.45, o.rivet || lighten(steel, 0.6));
  },
});
const spectacles = (c0, steel) => part(c0, (c) => {
  // the nasal, and the spectacle's rim round the eye
  dab(c, 2.15, -1.2, 0.75, 2.4, steel);
  c.strokeStyle = steel; c.lineWidth = 0.5; c.beginPath(); c.ellipse(1.3, -0.4, 0.9, 0.75, 0, Math.PI * 0.95, Math.PI * 2.05); c.stroke();
  dab(c, 2.15, -1.2, 0.3, 2.2, lighten(steel, 0.5));
});
const aventail = (c0, mail) => blob(c0, [[-2.6, -1.0], [-3.1, 1.4], [-2.7, 3.2, 1], [0.6, 3.3, 1], [0.0, 1.8], [-0.6, -0.6]], mail, {
  hi: 0.35, lo: 0.4, then: (c) => mailDots(c, -3.2, -0.8, 0.8, 3.4, darken(mail, 0.35)),
});
// horns of bone off the helm's sides: the near one sweeps forward and up,
// the far one (drawn first, behind) back and up
const horn = (c0, near, col) => blob(c0, near
  ? [[-0.2, -2.5, 1], [1.4, -3.6], [2.5, -5.4], [2.7, -7.0, 1], [1.7, -5.6], [0.6, -4.2], [-1.0, -3.0, 1]]
  : [[-1.4, -2.8, 1], [-2.8, -3.8], [-3.6, -5.6], [-3.4, -7.0, 1], [-2.4, -5.4], [-1.4, -4.2], [-0.4, -3.2, 1]], col, {
  hi: 0.4, lo: 0.45, then: (c) => { if (near) { dab(c, 2.0, -7.2, 1.2, 1.4, darken(col, 0.45)); line(c, 0.4, -3.4, 1.0, -2.9, 0.35, darken(col, 0.3)); } else dab(c, -4, -7.2, 1.2, 1.2, darken(col, 0.45)); },
});
// a bear's scalp worn as a hood: the snout over the brow, the ear up top,
// the hide down the nape
const bearHood = (c0, fur, o = {}) => blob(c0, [[-2.9, 0.6], [-3.1, -1.6], [-2.1, -3.6], [-0.2, -4.4], [1.8, -4.1], [3.2, -3.6], [4.6, -2.9], [4.7, -2.0, 1], [3.6, -1.7], [2.6, -1.8], [1.4, -2.0], [0.0, -1.7], [-1.2, -0.5], [-1.6, 1.4], [-2.4, 3.4, 1]], fur, {
  hi: 0.32, lo: 0.45, then: (c) => {
    for (let i = 0; i < 6; i++) line(c, -2.6 + i * 0.9, -3.4 + Math.abs(i - 2) * 0.25, -2.9 + i * 0.9, -2.2 + Math.abs(i - 2) * 0.25, 0.3, darken(fur, 0.3));
    dab(c, 4.1, -3.0, 0.9, 0.8, INKY);                                        // the bear's nose
    dab(c, 1.6, -3.3, 0.55, 0.45, o.eye || INKY);                             // its dead eye
    dab(c, 3.4, -1.9, 0.45, 0.6, BONE); dab(c, 2.6, -1.95, 0.4, 0.5, BONE);                                      // a fang over his brow
  },
});
const bearEar = (c0, fur) => part(c0, (c) => ball(c, -0.5, -4.3, 0.95, 0.8, fur, { hi: 0.4, lo: 0.45 }));
// the seer's deep hood: lining behind the head, the fur-rimmed hood over it
const seerHoodBack = (c0, cloth) => blob(c0, [[-3.0, 3.4, 1], [-3.4, 0.2], [-2.8, -2.8], [-0.8, -4.2], [1.4, -3.8], [2.8, -2.2], [1.4, -1.2], [0.4, 1.4], [1.4, 3.4, 1]], darken(cloth, 0.4), { hi: 0.1, lo: 0.4 });
const seerHood = (c0, cloth, fur) => {
  blob(c0, [[2.6, -1.9, 1], [2.4, -3.2], [1.0, -4.4], [-1.1, -4.7], [-2.9, -3.8], [-3.5, -1.8], [-3.3, 0.4], [-3.6, 2.4], [-3.4, 3.7, 1], [-1.2, 3.7, 1], [-0.7, 1.4], [-0.1, -0.4], [0.5, -1.6]], cloth, {
    hi: 0.3, lo: 0.42, then: (c) => { line(c, -1.2, -4.4, -2.8, -0.4, 0.45, darken(cloth, 0.4)); line(c, 0.6, -4.4, -2.0, -4.6, 0.4, lighten(cloth, 0.3)); },
  });
  // the white fur round the opening
  part(c0, (c) => { c.strokeStyle = cel(c, -1, -4, 3, 3, fur, 0.3, 0.3); c.lineWidth = 1.0; c.lineCap = "round"; c.beginPath(); c.moveTo(2.5, -2.1); c.quadraticCurveTo(0.4, -1.9, -0.2, -0.2); c.lineTo(-0.9, 3.5); c.stroke(); });
};
// the skald's bare head: long hair swept back under a woven band
const hairCap = (c0, col, band) => blob(c0, [[-2.4, 0.6], [-2.8, -1.6], [-1.8, -3.3], [0.4, -3.6], [2.1, -3.0], [2.5, -1.9], [1.0, -2.1], [-0.3, -1.7], [-1.0, -0.4], [-1.2, 1.6]], col, {
  hi: 0.35, lo: 0.42, then: (c) => { for (const k of [-1.6, -0.6, 0.6]) line(c, k + 0.6, -3.3, k - 0.8, -0.4, 0.3, darken(col, 0.3)); if (band) dab(c, -3, -2.5, 6, 0.6, band); },
});

// ---- the gaits ---------------------------------------------------------------------
const MAN = { L1: 4.8, L2: 4.6, stride: 2.4, lift: 1.9, bob: 0.65, lean: 0.06, dip: 0.03, lunge: 1.4, hitLean: 0.18, hipW: 0.7, thigh: 2.2, shin: 1.9, foot: 3.0, ankle: 0.8 };
const MAILED = { L1: 4.8, L2: 4.6, stride: 2.1, lift: 1.4, bob: 0.45, lean: 0.03, dip: 0.02, lunge: 1.2, hitLean: 0.15, hipW: 0.85, thigh: 2.5, shin: 2.2, foot: 3.2, ankle: 0.85 };
const WILD = { L1: 4.8, L2: 4.6, stride: 2.6, lift: 2.1, bob: 0.8, lean: 0.12, dip: 0.05, lunge: 1.7, hitLean: 0.24, hipW: 0.75, thigh: 2.4, shin: 2.0, foot: 3.1, ankle: 0.8 };
const ROBE = { L1: 4.8, L2: 4.6, stride: 1.9, lift: 1.2, bob: 0.45, lean: 0.04, dip: 0.02, lunge: 1.0, hipW: 0.6, thigh: 2.1, shin: 1.8, foot: 2.9, ankle: 0.8 };

// The hands, per look: the march (swinging with the stride), then the four
// fight frames [guard, wind-up, strike, follow-through]. hn is the weapon
// hand's target and an the haft's angle out of the fist (0 = +x, forward); hf
// the far hand (afn its axe's angle, for the berserker); grip, for the jarl's
// two-handed axe, is where the far hand holds the haft (- = below the near hand).
const hands = (look, st, shN, shF) => {
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const pick = (march, fight) => (st.fight ? fight[st.f] : march);
  // the overhead chop shared by the axemen: up at the guard, cocked back over
  // the shoulder (the head ducks under it), down through, and past the line
  const CHOP = [
    { hn: N(2.8, 1.4), an: -1.2 },
    { hn: N(-3.2, -4.4), an: -2.3 },
    { hn: N(3.7, 1.3), an: 0.55 },
    { hn: N(3.0, 3.8), an: 1.05 }];
  const SHIELD = [F(4.6, 2.4), F(5.0, 2.0), F(3.6, 3.4), F(4.2, 3.0)];
  if (look === "thrall") return pick({ hn: N(1.3 + sw * 0.6, 5.0), an: -0.2 + sw * 0.1, hf: F(3.6 - sw * 0.4, 4.0) },
    CHOP.map((h, i) => ({ ...h, hf: SHIELD[i] })));
  if (look === "huscarl") return pick({ hn: N(3.3 + sw * 0.25, 3.3), an: -1.3 + sw * 0.03, hf: F(4.4, 2.3) }, [
    { hn: N(3.0, 1.0), an: -1.3, hf: F(4.6, 1.9) },
    { hn: N(-3.0, -4.5), an: -2.35, hf: F(4.8, 1.8) },
    { hn: N(4.0, 1.0), an: 0.45, hf: F(4.0, 2.6) },
    { hn: N(3.2, 3.6), an: 1.0, hf: F(4.4, 2.4) }]);
  // the berserker: an axe in each fist, swinging wide on the march; in the
  // fight the near axe chops overhead while the far one guards, then the far
  // one comes up for the next blow
  if (look === "berserker") return pick({ hn: N(1.6 + sw * 0.9, 4.6), an: -0.45 + sw * 0.15, hf: F(2.4 - sw * 0.9, 4.4), afn: -0.5 - sw * 0.15 }, [
    { hn: N(3.0, 0.9), an: -1.3, hf: F(4.6, 1.2), afn: -0.9 },
    { hn: N(-3.2, -4.5), an: -2.3, hf: F(5.0, 1.6), afn: -0.35 },
    { hn: N(4.0, 1.5), an: 0.6, hf: F(1.6, 5.0), afn: 0.25 },
    { hn: N(3.0, 4.0), an: 1.1, hf: F(4.2, -2.4), afn: -1.5 }]);
  // the seer: the staff walked tall; the cast as told above. The staff tips
  // forward as it rises and the open far palm is out below her chin, in clear
  // air ahead of the shaft
  if (look === "seer") return pick({ hn: N(4.5 + sw * 0.3, 3.0), an: -1.32 + sw * 0.03, hf: F(1.5 - sw * 0.6, 5.0), top: 12.5, butt: 9.5, frost: 0, sway: sw }, [
    { hn: N(4.1, 2.2), an: -1.3, hf: F(3.6, 3.0), top: 10, butt: 8, frost: 0, palm: true, sway: 0.4 },
    { hn: N(3.9, -3.4), an: -1.2, hf: F(5.4, 1.2), top: 7.5, butt: 9, frost: 1, palm: true, sway: -0.6 },
    { hn: N(4.7, -1.8), an: -0.95, hf: F(5.5, 2.2), top: 8.5, butt: 9, frost: 2, palm: true, sway: 1.2 },
    { hn: N(4.3, -0.6), an: -1.1, hf: F(5.0, 3.0), top: 8.5, butt: 9, frost: 1, palm: true, sway: 0.8 }]);
  // the skald: the drum up on the far arm, the beater falling on each
  // contact (and on each beat of the chant); in the fight he clubs with it
  if (look === "skald") {
    if (st.chant) return [
      { hn: N(1.8, -1.4), an: -0.9, hf: F(4.6, 1.8), beat: false, sing: true },
      { hn: N(2.3, 1.2), an: 0.05, hf: F(4.7, 2.0), beat: true, sing: true },
      { hn: N(1.6, -1.8), an: -1.0, hf: F(4.6, 1.6), beat: false, sing: false },
      { hn: N(2.3, 1.3), an: 0.1, hf: F(4.7, 1.9), beat: true, sing: true }][st.f];
    const down = st.f % 2 === 0;
    return pick({ hn: down ? N(2.5, 2.4) : N(2.1, 0.4), an: down ? 0.15 : -0.7, hf: F(4.6, 3.6), beat: down, sing: down },
      CHOP.map((h, i) => ({ ...h, hf: SHIELD[i], sing: i === 2 })));
  }
  // the jarl: the Dane axe carried on the slope in both fists; the great
  // two-handed chop. The near fist is the upper one, the far one below it
  return pick({ hn: N(3.0 + sw * 0.2, 3.4), an: -0.45 + sw * 0.04, grip: -2.4 }, [
    { hn: N(2.4, 1.6), an: -1.2, grip: -1.4 },
    { hn: N(-2.6, -4.4), an: -2.45, grip: -2.2 },
    { hn: N(4.2, 1.6), an: 0.5, grip: -2.0 },
    { hn: N(3.4, 4.0), an: 1.0, grip: -2.0 }]);
};

// ---- the raider ------------------------------------------------------------------------
const raider = (ctx, p) => {
  const k = (p.h ?? 22) / 22; ctx.save(); ctx.scale(k, k);
  const look = p.look, seated = !!p.seated;
  const o = look === "huscarl" || look === "jarl" ? MAILED : look === "berserker" ? WILD : look === "seer" ? ROBE : MAN;
  const R = skeleton(p, o), { st, T } = R;
  const cl = (struck, wound) => wound + (struck - wound) * st.cloth;
  const skin = p.rage ? mix(p.skin, "#e0503a", 0.45) : p.skin, skinF = darken(skin, 0.24);
  const wool = p.cloth, fur = p.cloth2, mane = p.mane || "#d8b868", steel = p.hair || "#8a8e96";
  const mailed = look === "huscarl" || look === "jarl";
  const burly = look === "jarl" ? 1.14 : look === "huscarl" ? 1.08 : look === "berserker" ? 1.06 : 1;
  if (!seated) shadow(ctx, 0.4, -0.1, 4.8 * burly, 1.3, 0.24);
  const shN = T(1.0 * burly, -6.6), shF = T(-1.1 * burly, -6.8);
  const A = { up: 3.1, fore: 2.9, w: mailed ? 2.1 : look === "berserker" ? 2.05 : 1.9 };
  const H = hands(look, st, shN, shF);
  const mail = mix(steel, "#9aa0a8", 0.3);

  // limb colours
  const trews = mix(wool, "#3a3440", 0.45);
  let armN, legN, fistN = skin, fistF = skinF;
  if (mailed) {
    armN = { up: mail, fore: mail, cuff: LEATHER, elbow: lighten(mail, 0.1) };
    legN = { thigh: trews, shin: trews, wrap: WRAP, wrapAt: 0.3, foot: fur, garter: LEATHER };
  } else if (look === "berserker") {
    armN = { up: skin, fore: skin, cuff: p.col || "#5a8ac8" };
    legN = { thigh: wool, shin: wool, wrap: WRAP, wrapAt: 0.4, foot: fur };
  } else if (look === "seer") {
    armN = { up: wool, fore: wool, cuff: fur };
    legN = { thigh: darken(wool, 0.3), shin: darken(wool, 0.3), foot: LEATHER };
  } else {
    armN = { up: look === "skald" ? fur : wool, fore: wool, cuff: look === "thrall" ? LEATHER : fur };
    legN = { thigh: trews, shin: trews, wrap: WRAP, wrapAt: 0.38, foot: look === "skald" ? LEATHER : fur };
  }
  if (look === "skald") armN = { up: p.cloth2b || "#a87a48", fore: p.cloth2b || "#a87a48", cuff: LEATHER };
  const dk = (cols) => Object.fromEntries(Object.entries(cols).map(([kk, v]) => [kk, typeof v === "string" ? darken(v, 0.25) : v]));
  const armF = dk(armN), legF = dk(legN);

  // the rage: a red haze round the frenzied berserker (soft, so never inked)
  if (p.rage) {
    glow(ctx, T(0, -6)[0], T(0, -6)[1], 11, "#e8402a", 0.42);
    // steam off his shoulders and head (translucent, so the ink leaves it be)
    ctx.fillStyle = "rgba(255,196,170,0.4)";
    const f0 = (st.f + (st.fight ? 2 : 0)) % 4;
    for (let i = 0; i < 4; i++) { const [x, y] = T(-2.2 + i * 1.4, -12.6 - ((i + f0) % 3) * 1.1); ctx.fillRect(x, y, 0.9, 0.9); }
  }

  // capes and pelts behind everything
  const capeBehind = (col, len, o2 = {}) => {
    const fl = st.fight ? cl(o2.flF ?? 1.8, 0.3) : [0.7, 1.4, 0.5, 1.2][st.f] * (o2.fl ?? 1);
    const pts = [[1.4, -7.9], [-1.8, -8.1], [-3.2, -6.2], [-3.7 - fl * 0.3, -1.6], [-4.6 - fl, 2.6], [-5.6 - fl * 1.3, len, 1], [-3.8 - fl * 0.8, len + 0.3, 1], [-1.9 - fl * 0.4, len - 0.1, 1], [-0.6, len - 0.6, 1], [-0.6, 1.0], [-0.2, -4.0]];
    inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, pts, col, {
      hi: 0.3, lo: 0.45, then: (cc) => {
        line(cc, -2.4, -5.2, -4.3 - fl, len - 0.4, 0.5, darken(col, 0.4));
        line(cc, -1.2, -3.4, -2.2 - fl * 0.5, len - 0.4, 0.4, darken(col, 0.3));
        if (o2.border) { cc.strokeStyle = o2.border; cc.lineWidth = 0.8; cc.beginPath(); cc.moveTo(-5.8 - fl * 1.3, len - 0.3); cc.lineTo(-3.8 - fl * 0.8, len); cc.lineTo(-1.9 - fl * 0.4, len - 0.4); cc.lineTo(-0.6, len - 0.9); cc.stroke(); }
        if (o2.furry) for (let i = 0; i < 5; i++) line(cc, -1.4 - i * 0.9 - fl * i * 0.2, -4 + i * 1.6, -2.0 - i * 0.9 - fl * i * 0.25, -2.6 + i * 1.6, 0.3, darken(col, 0.3));
      },
    }));
  };
  if (look === "berserker") capeBehind(fur, 4.6, { furry: true, fl: 1.2 });
  if (look === "skald") capeBehind(p.cape || TEAL, 6.2, { border: p.shcol || "#d0943a" });
  if (look === "jarl") capeBehind(p.cape || TEAL, seated ? 4.4 : 7.0, { border: p.col || FROSTC, flF: 2.2 });
  // the seer's robe falls to the ankles behind the legs
  if (look === "seer" && !seated) inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? cl(0.9, -0.4) : st.c * 0.6;
    blob(c, [[-2.4, -1.2], [-2.8 - sw * 0.3, 3.5], [-3.6 - sw * 0.5, 7.7, 1], [3.1 + sw, 7.7, 1], [2.6 + sw * 0.4, 3.5], [2.3, -1.2]], darken(wool, 0.25), { hi: 0.15, then: (cc) => dab(cc, -4, 6.9, 8, 0.8, darken(fur, 0.2)) });
  });

  // the far arm, behind the body: the shield arm, the berserker's second axe,
  // the seer's open hand. (The jarl's far hand is on the haft: drawn after it.)
  let hfC = null;
  if (look === "thrall" || look === "huscarl" || look === "skald") arm(ctx, shF, H.hf, A, armF);
  if (look === "seer") hfC = arm(ctx, shF, H.hf, A, armF);
  if (look === "berserker") {
    const h = arm(ctx, shF, H.hf, A, armF);
    grip(ctx, h, H.afn);
    axe(ctx, h[0], h[1], H.afn, darken(p.wcol || "#c4c8d0", 0.15), { len: 4.6, back: 1.2, s: 0.9 });
    fist(ctx, h[0], h[1], 1.0, fistF);
  }

  // legs (seated: astride, the feet hanging down the beast's flank)
  if (!seated) leg(ctx, R, o, "far", legF);
  leg(ctx, R, o, "near", legN);

  // the trunk, the skirts below the belt, and what is worn on them
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? cl(0.8, -0.2) : st.c * 0.6;
    if (mailed) {
      // ring mail to the knee, split at the front; the tunic's hem shows below
      const hem = seated ? 3.2 : 5.2;
      blob(c, [[-2.7, -1.0], [2.6, -1.0], [3.1 + sw, hem + 0.6, 1], [-3.1 - sw * 0.6, hem + 0.4, 1]], wool, { hi: 0.25 });
      const panel = (pts, col) => blob(c, pts, col, { hi: 0.4, lo: 0.42, then: (cc) => { mailDots(cc, -4, -1, 4.4, hem + 0.2, darken(col, 0.38)); dab(cc, -4, hem - 0.5, 9, 0.5, darken(col, 0.3)); } });
      panel([[-2.7, -1.0], [0.3, -1.0], [0.1 - sw * 0.3, hem, 1], [-3.0 - sw * 0.6, hem - 0.3, 1]], darken(mail, 0.15));
      panel([[-0.3, -1.0], [2.6, -1.0], [3.0 + sw, hem - 0.2, 1], [0.3 + sw * 0.4, hem, 1]], mail);
    } else if (look === "seer") {
      // the robe to the ankles (to the knee, seated), white fur at the hem
      const hem = seated ? 3.6 : 7.4, kick = st.fight ? cl(1.1, -0.3) : st.c * 0.7;
      blob(c, [[-2.5, -1.2], [2.4, -1.2], [2.8 + kick * 0.5, 3.4], [3.3 + kick, hem, 1], [-1.4 + kick * 0.3, hem + 0.2, 1], [-2.3, 3.2]], wool, {
        hi: 0.28, lo: 0.42, then: (cc) => {
          dab(cc, -3, hem - 0.9, 8, 1.0, fur);
          line(cc, 0.4, 0.2, 0.6 + kick * 0.5, hem - 1.0, 0.4, darken(wool, 0.35));
          line(cc, -1.2, 0.8, -1.3 + kick * 0.2, hem - 1.0, 0.35, lighten(wool, 0.2));
        },
      });
    } else if (look === "berserker") {
      // breeches and a hide kilt under the belt
      const hem = 2.6;
      blob(c, [[-2.4, -1.0], [2.3, -1.0], [2.7 + sw, hem, 1], [1.2 + sw * 0.5, hem - 0.6], [0.0, hem + 0.3, 1], [-1.4, hem - 0.5], [-2.8 - sw * 0.6, hem, 1]], fur, {
        hi: 0.3, lo: 0.45, then: (cc) => { for (const x of [-1.6, -0.2, 1.2]) line(cc, x, -0.4, x + 0.3, hem - 0.4, 0.3, darken(fur, 0.35)); },
      });
    } else {
      // the tunic to mid-thigh, its hem bordered in the clan's ochre
      const hem = seated ? 2.6 : 3.4, trim = p.shcol || "#d0943a";
      const tunic = look === "skald" ? (p.cloth2b || "#a87a48") : wool;
      blob(c, [[-2.5, -1.0], [2.4, -1.0], [2.8 + sw, hem, 1], [-2.9 - sw * 0.6, hem - 0.2, 1]], tunic, {
        hi: 0.28, then: (cc) => { dab(cc, -4, hem - 0.7, 8, 0.7, trim); line(cc, 0.8, -0.6, 1.0 + sw * 0.4, hem - 0.8, 0.35, darken(tunic, 0.3)); },
      });
    }

    const trunk = [[2.0, 0.2], [2.2, -1.8], [2.7, -4.2], [2.8, -5.9], [1.9, -7.0], [0, -7.4], [-1.8, -7.1], [-2.6, -5.8], [-2.5, -3.6], [-2.0, -1.6], [-2.1, 0.2]].map(([x, y]) => [x * (y < -2 ? burly : 1), y]);
    const trunkCol = mailed ? mail : look === "berserker" ? skin : look === "skald" ? (p.cloth2b || "#a87a48") : wool;
    blob(c, trunk, trunkCol, {
      hi: 0.3, lo: 0.42, then: (cc) => {
        if (mailed) {
          mailDots(cc, -3.2, -7.6, 3.4, 0.4, darken(mail, 0.38));
          if (look === "jarl") {
            // a sea-teal surcoat panel, a great round brooch of frost-blue
            poly(cc, [[-0.2, -6.8], [3.4, -6.8], [3.4, 0.6], [-0.2, 0.6]], p.cape || TEAL);
            line(cc, 2.6, -6.0, 2.8, -2.2, 0.4, lighten(p.cape || TEAL, 0.3));
          }
        } else if (look === "berserker") {
          // pectorals, ribs and the woad: three stripes across the chest
          line(cc, 0.2, -5.8, 2.2, -5.4, 0.4, darken(skin, 0.3));
          line(cc, 0.6, -3.6, 2.2, -3.4, 0.3, darken(skin, 0.25));
          const woad = p.col || "#5a8ac8";
          for (const y of [-6.4, -4.8, -3.2]) line(cc, -1.4, y + 0.4, 2.8, y - 0.3, 0.45, woad);
          line(cc, -2.0, -6.4, -2.1, -2.4, 0.45, lighten(skin, 0.25));
        } else if (look === "seer") {
          line(cc, 1.6, -7.2, 2.0, 0.4, 0.4, darken(wool, 0.35));
          line(cc, -2.0, -6.0, -2.2, -1.8, 0.45, lighten(wool, 0.25));
        } else {
          line(cc, 2.0, -6.4, 2.3, -2.2, 0.4, lighten(trunkCol, 0.25));
          line(cc, -0.4, -6.6, -0.2, -1.6, 0.35, darken(trunkCol, 0.3));
          if (look === "thrall") line(cc, 2.2, -7.0, -2.0, -1.8, 0.7, LEATHER);   // the buckler's strap
        }
        // the belt: leather, a bone or frost-silver buckle
        dab(cc, -3.2, -1.6, 6.4, 1.0, "#3e2a1c");
        dab(cc, 1.3, -1.7, 0.9, 1.2, look === "jarl" ? (p.col || FROSTC) : BONE);
      },
    });
    // furs over the shoulders: a capelet (thrall), a mantle (huscarl, seer,
    // jarl), a collar (skald), the bear's forelegs knotted on the chest
    if (look === "thrall" || mailed || look === "seer" || look === "skald") {
      const deep = look === "thrall" ? 4.6 : look === "skald" ? 6.4 : 4.0;
      const top = -7.4 - (mailed ? 0.4 : 0);
      const drape = look === "skald" ? -5.4 : -7.4 + deep * 0.95;
      blob(c, [[-3.0 * burly, drape + 0.2, 1], [-3.4 * burly, -6.0], [-2.7 * burly, top + 0.2], [0, top - 0.3], [2.3 * burly, top + 0.2], [3.0 * burly, -7.4 + deep * 0.36], [2.1 * burly, -7.4 + deep * 0.5], [0.8, -7.4 + deep * 0.42], [-0.6, -7.4 + deep * 0.54], [-1.4, drape + 0.3], [-2.2, drape - 0.2, 1]], fur, {
        hi: 0.35, lo: 0.45, then: (cc) => {
          for (let i = 0; i < 3; i++) line(cc, -3.0 + i * 0.7, -6.4 + i * 0.3, -3.1 + i * 0.7, drape - 0.4, 0.3, darken(fur, 0.32));
          for (let i = 0; i < 6; i++) line(cc, -2.4 + i * 1.0, -7.4 + deep * 0.3 + (i % 2) * 0.3, -2.6 + i * 1.0, -7.4 + deep * 0.5 + (i % 2) * 0.3, 0.3, darken(fur, 0.32));
          if (look === "jarl") { ball(cc, 1.4, -6.2, 0.9, 0.9, p.col || FROSTC, { hi: 0.5, lo: 0.4 }); dab(cc, 1.1, -6.5, 0.4, 0.4, "#f8fcff"); }
          if (look === "skald") { ball(cc, 1.6, -6.0, 0.75, 0.75, p.shcol || "#d0943a", { hi: 0.5, lo: 0.4 }); }
        },
      });
    }
    if (look === "berserker") blob(c, [[-2.0, -7.6], [1.6, -7.8], [2.6, -6.6], [1.4, -5.6, 1], [0.6, -6.4], [-1.6, -6.2]], fur, {
      hi: 0.35, lo: 0.45, then: (cc) => { dab(cc, 1.0, -6.0, 0.4, 0.4, BONE); dab(cc, 1.7, -5.8, 0.4, 0.4, BONE); },
    });
    // the skald's war-horn hangs at his back hip
    if (look === "skald") blob(c, [[-1.0, -1.3], [-2.4, -0.9], [-3.4, 0.3], [-3.7, 1.7, 1], [-3.0, 1.5], [-2.3, 0.4], [-1.0, -0.3]], BONE, {
      hi: 0.4, lo: 0.45, then: (cc) => { dab(cc, -1.6, -1.4, 0.6, 1.3, LEATHER); dab(cc, -3.9, 1.2, 1.2, 0.6, darken(BONE, 0.4)); },
    });
    // the seer's rune-stones on a thong at her belt
    if (look === "seer") for (const [x, y] of [[-1.4, 0.2], [0.0, 0.7], [1.3, 0.3]]) part(c, (cc) => { ball(cc, x, y, 0.75, 0.75, p.wcol || BONE, { hi: 0.45, lo: 0.4 }); dab(cc, x - 0.15, y - 0.4, 0.35, 0.8, p.col || FROSTC); });
  });

  // the head: it follows the blow; ducks under the raised weapon in the heave
  const heave = st.fight && st.f === 1 && look !== "seer";
  const hd = T(0.85, -9.35); hd[0] += st.fight ? 0.4 * st.drive : 0;
  if (heave) { hd[0] += 0.6; hd[1] += 0.7; }
  if (look === "jarl") { hd[0] += 0.15 * (burly - 1) * 10; }
  let ha = st.lean * 0.3;
  if (st.chant) ha -= H.sing ? 0.28 : 0.12;          // the chanting skald throws his head back
  const sing = !!H.sing;
  const head = () => inFrame(ctx, hd[0], hd[1], ha, (c0) => {
    if (look === "thrall") {
      braid(c0, mane, 4.4, st.fight ? -0.3 : st.c * 0.4);
      face(c0, skin, { eyes: p.eyes });
      beard(c0, "short", darken(mane, 0.18));
      capHelm(c0, steel);
    } else if (look === "huscarl") {
      braid(c0, mane, 4.8, st.fight ? -0.4 : st.c * 0.3);
      aventail(c0, mail);
      face(c0, skin, { eyes: p.eyes, shade: 1.0 });
      beard(c0, "full", mane);
      spangen(c0, steel);
      spectacles(c0, lighten(steel, 0.1));
    } else if (look === "berserker") {
      braid(c0, mane, 4.0, st.fight ? -0.6 : st.c * 0.6);
      face(c0, skin, { eyes: p.rage ? "#fff4c8" : p.eyes, woad: p.col || "#5a8ac8", brow: darken(mane, 0.3) });
      beard(c0, "fork", mane);
      bearHood(c0, fur, { eye: p.rage ? "#e04a30" : null });
      bearEar(c0, fur);
      if (p.rage) { dab(c0, 0.9, -0.85, 0.9, 0.5, "#fff4c8"); }
    } else if (look === "seer") {
      seerHoodBack(c0, wool);
      face(c0, skin, { eyes: p.eyes || p.col || FROSTC, soft: true, tattoo: p.col || FROSTC, shade: 0.6 });
      seerHood(c0, wool, fur);
      // her pale braid forward over the shoulder
      blob(c0, [[0.3, 2.0], [1.1, 2.0], [1.2, 4.6], [0.6, 5.6, 1], [0.1, 4.6]], mane, { hi: 0.35, lo: 0.4, then: (c) => { dab(c, 0, 3.0, 1.4, 0.35, darken(mane, 0.3)); dab(c, 0.2, 4.8, 1, 0.5, p.col || FROSTC); } });
    } else if (look === "skald") {
      braid(c0, mane, 5.2, st.fight ? -0.4 : st.c * 0.4);
      face(c0, skin, { eyes: p.eyes, sing });
      beard(c0, "long", mane, { sing });
      hairCap(c0, mane, p.shcol || "#d0943a");
    } else {
      braid(c0, mane, 5.4, st.fight ? -0.4 : st.c * 0.3);
      horn(c0, false, BONE);
      aventail(c0, mail);
      face(c0, skin, { eyes: p.eyes, shade: 1.0 });
      beard(c0, "long", mane, { bead: p.col || FROSTC });
      spangen(c0, steel, { band: darken(steel, 0.35), rivet: p.col || FROSTC });
      spectacles(c0, lighten(steel, 0.15));
      horn(c0, true, BONE);
    }
  });
  if (!heave) head();

  // shields before the weapon arm; the big round shield rides up to the chin
  if (look === "thrall") roundShield(ctx, H.hf[0] + 1.1, H.hf[1] - 0.2, 2.5, 2.9, p.shcol || "#d0943a", p.shcol2 || TEAL, "band");
  else if (look === "huscarl") roundShield(ctx, H.hf[0] + 1.6, H.hf[1] - 0.6, 3.9, 4.7, p.shcol || "#d0943a", p.shcol2 || TEAL, "quarters");
  else if (look === "skald") frameDrum(ctx, H.hf[0] + 1.3, H.hf[1] - 0.4, 2.6, 3.1, p, !!H.beat);
  if (look === "seer" && H.palm) {
    glow(ctx, hfC[0] + 1.0, hfC[1] - 0.2, st.f === 2 ? 3.4 : 2.6, p.col || FROSTC, 0.6);
    openHand(ctx, hfC, fistF, st.f === 2 ? 1.25 : 0.8);
  } else if (look === "seer") fist(ctx, hfC[0], hfC[1], 0.9, fistF);

  // the weapon hand
  if (look === "jarl") {
    const hn = ik(shN[0], shN[1], H.hn[0], H.hn[1], A.up, A.fore, -1)[1];
    const to = axe(ctx, hn[0], hn[1], H.an, p.wcol || "#d8e4ec", { len: 7.0, back: 4.6, s: 1.45, w: 1.1, frost: p.col || FROSTC, rings: [-3.4], ringCol: p.col || FROSTC });
    const h2 = arm(ctx, shF, to(H.grip), A, armF);
    grip(ctx, h2, H.an);
    fist(ctx, h2[0], h2[1], 1.05, fistF);
    const h = arm(ctx, shN, hn, A, armN);
    grip(ctx, h, H.an);
    fist(ctx, h[0], h[1], 1.1, fistN);
    if (heave) head();
  } else {
    const h = arm(ctx, shN, H.hn, A, armN);
    grip(ctx, h, H.an);
    if (look === "thrall") axe(ctx, h[0], h[1], H.an, p.wcol || "#c8ccd2", { len: 4.8, back: 1.3, s: 0.95 });
    else if (look === "huscarl") axe(ctx, h[0], h[1], H.an, p.wcol || "#c8ccd2", { len: st.fight ? 7.6 : 8.6, back: st.fight ? 1.4 : 4.0, s: 1.2, rings: [2.0] });
    else if (look === "berserker") axe(ctx, h[0], h[1], H.an, p.wcol || "#c4c8d0", { len: 4.8, back: 1.2, s: 0.95 });
    else if (look === "seer") seerStaff(ctx, h[0], h[1], H.an, p, H);
    else if (look === "skald") beater(ctx, h[0], h[1], H.an);
    fist(ctx, h[0], h[1], mailed ? 1.1 : 1.0, fistN);
    if (heave) head();
  }
  ctx.restore();
};

// ---- the roster -------------------------------------------------------------------
const SKIN = "#e8b48e";
// the Jarl's palette, for the war-mammoth's composite (rigs-rimebeasts.js)
export const RIME_JARL = { look: "jarl", h: 28, skin: "#e4ae8a", cloth: "#3e5660", cloth2: "#e2ddd2", hair: "#9aa2ac", cape: "#2c4e5a", col: "#9ad8f2", mane: "#ece2c4", wcol: "#d8e4ec", eyes: "#2a3a48" };
export const RIME_RIGS = {
  thrall: { kind: "rimeRaider", box: { hw: 18, up: 30, down: 4 }, fightN: 4, p: { look: "thrall", h: 21, skin: SKIN, cloth: "#4e6a6e", cloth2: "#8a6a48", hair: "#868a92", mane: "#d8b868", wcol: "#c8ccd2", shcol: "#d0943a", shcol2: "#2f5866" } },
  huscarl: { kind: "rimeRaider", box: { hw: 22, up: 36, down: 4 }, fightN: 4, p: { look: "huscarl", h: 24, skin: SKIN, cloth: "#38525a", cloth2: "#6e5a44", hair: "#8e949c", mane: "#c07a44", wcol: "#d0d4da", shcol: "#e0b050", shcol2: "#2a5260" } },
  berserker: { kind: "rimeRaider", box: { hw: 20, up: 33, down: 4 }, fightN: 4, p: { look: "berserker", h: 23, skin: SKIN, cloth: "#5a4232", cloth2: "#6a4c34", mane: "#b8603a", col: "#5a8ac8", wcol: "#c4c8d0" } },
  berserkerRage: { kind: "rimeRaider", box: { hw: 22, up: 34, down: 4 }, fightN: 4, p: { look: "berserker", h: 23, skin: SKIN, cloth: "#5a4232", cloth2: "#6a4c34", mane: "#c8582e", col: "#5a8ac8", wcol: "#c4c8d0", rage: true } },
  rimeseer: { kind: "rimeRaider", box: { hw: 21, up: 37, down: 4 }, fightN: 4, p: { look: "seer", h: 22, skin: "#ecd0bc", cloth: "#5e5868", cloth2: "#ece8e0", mane: "#ece4d0", col: "#9ad8f2", wcol: "#e6dcc0", eyes: "#7cc8ec" } },
  skald: { kind: "rimeRaider", box: { hw: 19, up: 32, down: 4 }, fightN: 4, p: { look: "skald", h: 22, skin: SKIN, cloth: "#4a5a60", cloth2: "#7a6248", cloth2b: "#8c8468", cape: "#2f5866", mane: "#b87444", shcol: "#d0943a" } },
  rimejarlfoot: { kind: "rimeRaider", box: { hw: 30, up: 46, down: 4 }, fightN: 4, p: { ...RIME_JARL } },
};
export const RIME_PAINTERS = { rimeRaider: raider };

// The Jarl seated astride, for the war-mammoth's composite: call it with the
// context at the seat (his hips at 0,0), facing +x — fight false: the ride
// (frame 0-3, the beast's walk frame; the axe on the slope, swaying), fight
// true: the four-frame chop (guard, wind-up, strike, follow-through). p
// defaults to RIME_JARL (pass the composite's p, revived colours and all). He
// is drawn at RIME_JARL.h unless p.h says otherwise; his feet hang ~11
// below the seat (the far leg is left off: the beast hides it), his helm's
// horns reach ~21 above it and the axe swings out ~16 ahead of him.
export const rimeJarlRider = (ctx, p = RIME_JARL, fight = false, frame = 0) => raider(ctx, { ...RIME_JARL, ...p, look: "jarl", seated: true, pose: fight ? "fight" : "walk", frame });
