// ============ FOLK: THE GUNNERS AND OTHERS ============
// The covert's hooded blade, the falcon-mistress, the bombardier (and the
// alchemist, in his cloth) and the musketeer. Built from folk-kit.js;
// folk.js re-exports it.
//
// Each figure is a table of KEY POSES (named frames the halls bake one by
// one) plus a timing helper that says which frame a hall shows. Every pose
// keeps to "Joints and motion" in art/STYLE-GUIDE.md: the hips shift over
// planted feet (knees solved), the trunk leans about the hips, the head
// rides on it; and the halls ask these same numbers where a hand is, so what
// it holds (a fuse, a vial, a bird, the muzzle) moves with it.

import { darken, shadow, ball, lin, part } from "./paint.js";
import { head, hat, torso, legs, arm, cap, elbowFor } from "./folk-kit.js";

// ---- the body's frame ---------------------------------------------------------
const HIP = [0, -7.8];                                   // the hips' centre, standing
// Feet planted `stride` apart, the front foot stepped `step` further on; the
// hips shifted by `hip` and dropped as far as the knees need to stay a touch
// bent (legs() solves them; a hip too high would lock them straight).
const footing = (p) => {
  const stride = p.stride ?? 0.4, step = p.step || 0, [h0, h1] = p.hip || [0, 0];
  const back = -1.6 - 1.5 * stride, front = 1.5 + 1.5 * stride + step;
  const need = (dx) => 6.6 - Math.sqrt(Math.max(0, 6.42 * 6.42 - dx * dx));
  return { stride, step, hip: [h0, Math.max(h1, need(front - h0 - 0.9), need(h0 - 0.9 - back))] };
};
// A pose's frame: P(x, y) carries a point of the upright figure onto the
// posed one (hips shifted, trunk leant `lean` radians about them, + forward);
// on(ctx, fn) paints fn in that frame.
const bodyOf = (p) => {
  const ft = footing(p), lean = p.lean || 0, c = Math.cos(lean), s = Math.sin(lean);
  const hx = HIP[0] + ft.hip[0], hy = HIP[1] + ft.hip[1];
  const P = (x, y) => { const dx = x - HIP[0], dy = y - HIP[1]; return [hx + dx * c - dy * s, hy + dx * s + dy * c]; };
  const on = (ctx, fn) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(lean); ctx.translate(-HIP[0], -HIP[1]); fn(); ctx.restore(); };
  return { ...ft, lean, P, on };
};
// the legs under it: the back foot stays put, the front one steps
const stand = (ctx, b, pal) => legs(ctx, b.step / 2, 0, pal, b.stride + b.step / 3, { hip: [b.hip[0] - b.step / 2, b.hip[1]] });
// The head on its neck: carried by the trunk, moved by `head` [dx, dy] and
// tipped `tilt` more (− looks up); fn paints it at (x, y) in that tilt.
const headAt = (b, p) => { const [x, y] = b.P(0.4 + (p.head ? p.head[0] : 0), -20.5 + (p.head ? p.head[1] : 0)); return [x, y, b.lean + (p.tilt || 0)]; };
const onHead = (ctx, hd, fn) => {
  const [x, y, a] = hd;
  ctx.save(); ctx.translate(x, y + 2.4); ctx.rotate(a); ctx.translate(-x, -(y + 2.4)); fn(x, y); ctx.restore();
};
// An open hand (a throw let go, a bird cast off): palm, fingers along `ang`,
// a thumb — painted into the arm's own part, so no ink rings the wrist.
const openHand = (c, x, y, ang, col) => {
  c.strokeStyle = col; c.lineCap = "round";
  c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * 1.9, y + Math.sin(ang) * 1.9); c.stroke();
  c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang - 1.2) * 1.3, y + Math.sin(ang - 1.2) * 1.3); c.stroke();
  ball(c, x, y, 0.9, 1.0, col, { hi: 0.4, lo: 0.4 });
};
// An arm to a hand point, the elbow solved (o.flip for the out-to-the-side
// poses); o.open lays the hand open along the forearm; o.then paints more
// into the arm's part (a gauntlet). The arm is one inked part (arm()).
// Returns the elbow.
const reach = (ctx, sh, hd, pal, o = {}) => {
  const el = elbowFor(sh[0], sh[1], hd[0], hd[1], o);
  const then = (c, e) => {
    if (o.then) o.then(c, e);
    if (o.open) openHand(c, hd[0], hd[1], Math.atan2(hd[1] - e[1], hd[0] - e[0]), o.glove || pal.skin);
  };
  arm(ctx, sh[0], sh[1], hd[0], hd[1], pal, { ...o, elbow: el, hand: o.open ? false : o.hand, then });
  return el;
};
// which way a frame lies in a cycle: 0..1 from a clock in seconds
const cyc = (clock, period) => (((clock / period) % 1) + 1) % 1;

// ============ THE HOODED BLADE ============
// The covert's blade on watch, in the Covert's close wrap (hat() "wrap": the
// skull bound, a mask over nose and jaw, only the eye showing; `tails`, the
// knot's tails streaming as he moves), arms folded: the upper arms down his sides,
// the forearms laid across his chest (hands tucked). Now and then his weight
// settles back, or the near hand drops to the dagger at his hip and rests on
// the hilt; when the work is on he drops into a crouch, blade half drawn,
// and is gone in smoke (the hall paints the smoke).
//   fold, foldB (the weight settled back, a breath out), reach (the near arm
//   unfolding), hilt (the hand on the hilt), crouch (the vanish's first beat)
const HOODED = {
  fold: { stride: 0.1, hip: [0, 0.3], near: [4.9, -13.4], far: [4.0, -14.4], tuck: true },
  foldB: { stride: 0.1, hip: [-0.35, 0.6], lean: -0.03, near: [4.5, -13.0], far: [3.6, -14.0], tuck: true, tails: -0.08 },
  reach: { stride: 0.15, hip: [0.1, 0.4], lean: 0.02, near: [4.7, -10.8], far: [4.0, -14.3], farTuck: true },
  hilt: { stride: 0.2, hip: [0.3, 0.45], lean: 0.05, near: "grip", far: [4.1, -14.2], farTuck: true },
  crouch: { stride: 0.7, hip: [0.7, 2.0], lean: 0.26, near: "draw", far: [5.0, -12.0], tilt: 0.18, tails: 0.4 },
};
export const HOODED_POSES = Object.keys(HOODED);
// the dagger at his near hip, in the trunk's frame: the sheath's mouth, the
// grip's end (the pommel) and, half drawn, where the fist has it
const SHEATH = [1.7, -10.4], POMMEL = [3.5, -12.5], DRAWN = [4.6, -12.9];
const hoodedHand = (b, p) => (p.near === "grip" ? b.P(3.0, -11.8) : p.near === "draw" ? b.P(...DRAWN) : p.near);
// where the whetted edge glints (the pommel, or the drawn steel), figure space
export const hoodedGlint = (pose = "fold") => {
  const p = HOODED[pose] || HOODED.fold, b = bodyOf(p);
  return p.near === "draw" ? b.P(DRAWN[0] - 1.2, DRAWN[1] + 0.8) : b.P(...POMMEL);
};
// the frame a watching blade shows: `clock` in seconds (phase it by the hall's id)
export const hoodedFrame = (clock) => {
  const c = cyc(clock, 9.5);
  if (c > 0.62 && c < 0.64) return "reach";
  if (c >= 0.64 && c < 0.82) return "hilt";
  if (c >= 0.82 && c < 0.84) return "reach";
  return cyc(clock, 3.1) < 0.45 ? "foldB" : "fold";
};
export const drawHooded = (ctx, x, y, dir, pal, pose = "fold") => {
  const p = HOODED[pose] || HOODED.fold, b = bodyOf(p);
  const dark = darken(pal.coat, 0.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  stand(ctx, b, pal);
  b.on(ctx, () => {
    torso(ctx, 0, -17, 10, 7.5, pal);
    // the sheath at his hip, hanging back; the hilt up and forward out of it
    part(ctx, (c) => {
      c.strokeStyle = "#2a2026"; c.lineWidth = 1.3; c.lineCap = "round";
      c.beginPath(); c.moveTo(SHEATH[0], SHEATH[1]); c.lineTo(-0.9, -5.6); c.stroke();
      c.strokeStyle = "#8a8490"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-0.6, -6.1); c.lineTo(-0.9, -5.6); c.stroke();   // the chape
      if (p.near !== "draw") {
        c.strokeStyle = "#5a4636"; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(SHEATH[0] + 0.2, SHEATH[1] - 0.3); c.lineTo(POMMEL[0], POMMEL[1]); c.stroke();
        c.strokeStyle = "#a8a4b0"; c.lineWidth = 0.55;                                                                   // the guard, across
        c.beginPath(); c.moveTo(SHEATH[0] - 0.5, SHEATH[1] - 0.7); c.lineTo(SHEATH[0] + 0.9, SHEATH[1] + 0.4); c.stroke();
        c.fillStyle = "#b8b4c0"; c.fillRect(POMMEL[0] - 0.3, POMMEL[1] - 0.3, 0.7, 0.7);
      }
    });
  });
  // the Covert's close wrap: the skull bound, a mask over the nose and jaw,
  // only the eye in its slit; the knot's tails stream back
  onHead(ctx, headAt(b, p), (hx, hy) => {
    head(ctx, hx, hy, { ...pal, skin: darken(pal.skin, 0.12) }, { hood: false });
    hat(ctx, hx, hy, "wrap", pal, { tails: p.tails || 0 });
  });
  // the far arm (folded, or steadying himself low as he drops)
  reach(ctx, b.P(-2.4, -15.6), p.far, pal, { col: dark, hand: p.tuck || p.farTuck ? false : undefined });
  if (p.near === "draw") {
    // the blade half out of the sheath, the fist on its grip
    const m = b.P(SHEATH[0] + 0.2, SHEATH[1] - 0.3), h = b.P(...DRAWN);
    part(ctx, (c) => {
      c.strokeStyle = "#c8ccd4"; c.lineWidth = 0.7; c.lineCap = "round";
      c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(h[0] - 0.8, h[1] + 0.5); c.stroke();
      c.strokeStyle = "#a8a4b0"; c.lineWidth = 0.55;
      c.beginPath(); c.moveTo(h[0] - 1.3, h[1] - 0.3); c.lineTo(h[0] - 0.4, h[1] + 1.0); c.stroke();
    });
  }
  reach(ctx, b.P(2.2, -15.6), hoodedHand(b, p), pal, { hand: p.tuck ? false : undefined });
  ctx.restore();
};

// ============ THE FALCON-MISTRESS ============
// Her gauntlet is the near arm. carry: the glove at her chest, forearm out
// level (where a hawk rides); glance: the same, her head up to the wheel of
// birds; present: the glove raised to show the bird the field; draw: the
// fist pulled back to her shoulder, weight going back (the anticipation);
// cast: the arm thrown out and up, hand open, a step into it — the bird is
// away; follow: the arm coming down, still open, before she settles.
// `plume`: her hat's plume trailing the move (hat() "falconer").
const MIST = {
  carry: { stride: 0.3, hip: [0, 0.2], near: [6.3, -13.4], far: [-2.3, -7.4] },
  glance: { stride: 0.3, hip: [0.1, 0.3], near: [6.2, -13.1], far: [-2.2, -7.3], tilt: -0.26 },
  present: { stride: 0.35, hip: [0.2, 0.3], lean: 0.02, near: [7.6, -20.2], far: [-2.2, -7.4], tilt: -0.12, plume: 0.05 },
  draw: { stride: 0.5, hip: [-0.5, 0.45], lean: -0.07, near: [4.7, -17.9], far: [-3.0, -7.8], tilt: -0.1, plume: 0.15 },
  cast: { stride: 0.5, step: 0.8, hip: [0.7, 0.6], lean: 0.1, near: [9.0, -21.4], open: true, far: [-2.0, -8.0], tilt: -0.16, plume: -0.22 },
  follow: { stride: 0.5, step: 0.8, hip: [0.5, 0.5], lean: 0.06, near: [8.6, -16.0], open: true, far: [-1.8, -7.6], tilt: -0.04, plume: -0.1 },
};
export const MISTRESS_POSES = Object.keys(MIST);
// the glove (the back of her fist, where the bird's feet go), figure space
export const mistressGlove = (pose = "present") => (MIST[pose] || MIST.present).near;
// which frame: ms since the last strike and until the next (≤ 0: ready with
// nothing to strike — the bird waits on her glove at her chest), the rate;
// idle: the clock (s) and whether a bird rides
export const mistressFrame = (since, until, rate, o = {}) => {
  if (o.idle) return o.perched ? (cyc(o.clock, 5.3) < 0.3 ? "glance" : "carry") : (cyc(o.clock, 4.1) < 0.4 ? "glance" : "carry");
  const r = rate || 1000;
  if (since < Math.max(60, r * 0.1)) return "cast";
  if (since < Math.max(150, r * 0.26)) return "follow";
  if (until <= 0) return cyc(o.clock || 0, 3.7) < 0.3 ? "glance" : "carry";   // ready, nothing to strike: the bird rides her glove
  if (until <= Math.max(60, r * 0.13)) return "draw";
  if (until <= r * 0.42) return "present";
  return cyc(o.clock || 0, 2.7) < 0.35 ? "glance" : "carry";
};
// the long leather gauntlet over the forearm, flaring to a gilt cuff —
// painted INTO the arm's own part (arm()'s o.then), so no ink line runs
// round it across the forearm
const gauntlet = (c, el, hd) => {
  const dx = hd[0] - el[0], dy = hd[1] - el[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const a = [el[0] + dx * 0.28, el[1] + dy * 0.28], e = [el[0] + dx * 0.8, el[1] + dy * 0.8], w0 = 1.45, w1 = 0.95;
  c.fillStyle = lin(c, a[0], a[1], e[0], e[1], [[0, "#9a6a44"], [1, "#5a3a22"]]);
  c.beginPath(); c.moveTo(a[0] + nx * w0, a[1] + ny * w0); c.lineTo(e[0] + nx * w1, e[1] + ny * w1);
  c.lineTo(e[0] - nx * w1, e[1] - ny * w1); c.lineTo(a[0] - nx * w0, a[1] - ny * w0); c.closePath(); c.fill();
  const g = [a[0] + dx / L * 0.4, a[1] + dy / L * 0.4];
  c.strokeStyle = "#d8b34a"; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(g[0] + nx * w0, g[1] + ny * w0); c.lineTo(g[0] - nx * w0, g[1] - ny * w0); c.stroke();
};
export const drawMistress = (ctx, x, y, dir, pal, pose = "present") => {
  const p = MIST[pose] || MIST.present, b = bodyOf(p);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  stand(ctx, b, pal);
  reach(ctx, b.P(-2.4, -15.6), p.far, pal, { col: darken(pal.coat, 0.12) });   // the free arm hangs behind her
  b.on(ctx, () => torso(ctx, 0, -17, 10, 7.5, pal));
  // a falconer's hat, its plume swept back, her braid down her back
  onHead(ctx, headAt(b, p), (hx, hy) => { head(ctx, hx, hy, pal, { hood: false }); hat(ctx, hx, hy, "falconer", pal, { plume: p.plume || 0 }); });
  const sh = b.P(2.2, -15.6);
  reach(ctx, sh, p.near, pal, { glove: "#7a5234", open: p.open, then: (c, el) => gauntlet(c, el, p.near) });
  ctx.restore();
};

// ============ THE BOMBARDIER (AND THE ALCHEMIST) ============
// A throw in eight frames, the charge in his near hand:
//   hold     the charge at his belt in both hands, fuse lit; breath its pair
//   back     swung down behind his hip, the weight going back (wind-up)
//   cock     drawn back behind his head at its height, the arm out to the
//            side and back (a flip pose) and running under the face, never
//            across it; the off hand pointing at the mark
//   whip     over the top, elbow ahead of his head, the front foot stepping in
//   release  the arm out at the mark, the hand open, the trunk bent after it
//   follow   the arm swung down across, the trunk over the step
//   recover  upright again, a fresh charge from the pouch at his hip
// o.vial: the alchemist's flask instead of a powder charge.
const BOMB = {
  hold: { stride: 0.7, hip: [0, 0.2], lean: 0.03, near: [4.4, -11.4], far: [5.3, -12.4], ch: [5.4, -13.3], lit: 1, farFront: true },
  breath: { stride: 0.7, hip: [0, 0.65], lean: 0.05, near: [4.5, -11.0], far: [5.4, -12.0], ch: [5.5, -12.9], lit: 1, farFront: true },
  back: { stride: 0.8, hip: [-0.5, 0.35], lean: -0.03, near: [-3.0, -8.0], far: [4.4, -14.2], ch: "hand", off: [-0.6, 0.6], lit: 1, farFront: true },
  cock: { stride: 0.9, hip: [-0.8, 0.5], lean: -0.07, near: [-5.6, -18.4], flip: true, far: [5.8, -17.3], ch: "hand", off: [-0.8, -1.4], lit: 1, farFront: true },
  whip: { stride: 0.9, step: 1.0, hip: [0.5, 0.6], lean: 0.1, near: [5.3, -23.0], far: [1.8, -11.0], ch: "hand", off: [0.1, -2.0], lit: 1, smear: true },
  release: { stride: 0.9, step: 1.2, hip: [0.9, 0.8], lean: 0.12, near: [7.0, -22.4], open: true, far: [1.0, -7.4] },
  follow: { stride: 0.9, step: 1.2, hip: [1.2, 1.0], lean: 0.2, near: [4.2, -6.6], open: true, far: [0.8, -7.0] },
  recover: { stride: 0.8, step: 0.4, hip: [0.4, 0.5], lean: 0.06, near: [2.6, -8.4], far: [3.9, -10.6], ch: "hand", off: [0.9, -1.2], lit: 0, farFront: true },
};
export const BOMBER_POSES = Object.keys(BOMB);
const chargeAt = (p) => (p.ch === "hand" ? [p.near[0] + p.off[0], p.near[1] + p.off[1]] : p.ch);
// the charge he holds in a frame (figure space, facing +x, feet at 0, 0):
// its centre, the fuse's tip and whether it burns; null when his hand is empty
export const bomberCharge = (pose = "hold") => {
  const p = BOMB[pose] || BOMB.hold;
  if (!p.ch) return null;
  const [x, y] = chargeAt(p);
  return { x, y, fx: x + 1.1, fy: y - 3.2, lit: !!p.lit };
};
// which frame: ms since the last throw and until the next (≤ 0: ready, no
// mark), the rate; `clock` (s, phased by the hall) for the idle breath.
// The fast part (whip, release) is short; the wind-up and the hold are long.
export const bomberFrame = (since, until, rate, clock = 0) => {
  const k = Math.min(1, (rate || 2000) / 2000);
  if (since < 70 * k) return "release";
  if (since < 210 * k) return "follow";
  if (since < 420 * k) return "recover";
  if (until > 0 && until <= 90 * k) return "whip";
  if (until > 0 && until <= 430 * k) return "cock";
  if (until > 0 && until <= 680 * k) return "back";
  return cyc(clock, 3.4) < 0.4 ? "breath" : "hold";
};
const bomb = (ctx, x, y) => part(ctx, (c) => {
  ball(c, x, y, 2.3, 2.3, "#2e2e36", { hi: 0.45, lo: 0.4 });
  c.strokeStyle = "#8a6a44"; c.lineWidth = 0.6; c.lineCap = "round";
  c.beginPath(); c.moveTo(x + 0.3, y - 2.0); c.quadraticCurveTo(x + 0.3, y - 3.0, x + 1.1, y - 3.2); c.stroke();
});
const flask = (ctx, x, y) => part(ctx, (c) => {
  ball(c, x, y + 0.4, 1.7, 1.8, "#6ac090", { hi: 0.6, lo: 0.35 });
  c.fillStyle = "#c8e8d8"; c.fillRect(x - 0.6, y - 2.8, 1.2, 1.8);
  c.fillStyle = "#a88a68"; c.fillRect(x - 0.55, y - 3.5, 1.1, 0.8);
  c.fillStyle = "#e8fff0"; c.fillRect(x - 0.9, y - 0.4, 0.6, 0.6);
});
export const drawBomber = (ctx, x, y, dir, pal, pose = "hold", o = {}) => {
  const key = pose === true ? "cock" : typeof pose === "string" && BOMB[pose] ? pose : "hold";
  const p = BOMB[key], b = bodyOf(p);
  const far = () => reach(ctx, b.P(-1.2, -15.6), p.far, pal, { col: darken(pal.coat, 0.18) });
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  stand(ctx, b, pal);
  if (!p.farFront) far();                   // the off arm swung back: behind him
  b.on(ctx, () => torso(ctx, 0, -17, 10, 8, pal));
  onHead(ctx, headAt(b, p), (hx, hy) => { head(ctx, hx, hy, pal, { hood: false }); cap(ctx, hx, hy, pal.hood, { tall: true }); });   // a knitted cap
  if (p.farFront) far();
  const sh = b.P(1.8, -15.6);
  if (p.smear) {
    // the whip: a pale smear of the charge's path over the top
    const [cx, cy] = chargeAt(p), r = Math.hypot(cx - sh[0], cy - sh[1]), a = Math.atan2(cy - sh[1], cx - sh[0]);
    ctx.strokeStyle = "rgba(240,232,210,0.3)"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(sh[0], sh[1], r, a - 0.95, a - 0.3); ctx.stroke();
  }
  if (p.ch) { const [cx, cy] = chargeAt(p); if (o.vial) flask(ctx, cx, cy); else bomb(ctx, cx, cy); }
  reach(ctx, sh, p.near, pal, { flip: p.flip, open: p.open });
  ctx.restore();
};

// ============ THE MUSKETEER ============
// The gun is one rigid piece in its own space: origin at the wrist of the
// stock, +x down the barrel (`len` long), the butt at GUN_BUTT. A pose places
// it (ang: the barrel's angle, − up) by its butt against the near shoulder,
// by its wrist, or by its muzzle; the hands hold it where it lies.
//   aim     braced, cheek down on the stock, the barrel level
//   kick    the shot drives the gun, the shoulder and the head back, the
//           barrel jumps
//   recoil  coming back down, the weight returning
//   port    the gun brought up across his chest to load
//   ramA/B  the butt grounded, the rod worked down the barrel
//   raise   the gun coming up to the shoulder again
// Idle: port, and now and then a long look down the sights.
const GUN_BUTT = [-5, 1.6];
const GUN_LEN = 7.5;
const MUSK = {
  aim: { stride: 1.2, hip: [0.2, 0.3], lean: 0.05, head: [0.6, 0.7], tilt: 0.06, gun: { ang: -0.05, butt: [0.4, -0.6] }, grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  kick: { stride: 1.2, hip: [-0.5, 0.4], lean: -0.09, head: [-0.2, 0.1], tilt: -0.16, gun: { ang: -0.3, butt: [0.1, -0.5] }, grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  recoil: { stride: 1.2, hip: [-0.15, 0.35], lean: -0.02, head: [0.3, 0.4], tilt: -0.04, gun: { ang: -0.14, butt: [0.3, -0.6] }, grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  port: { stride: 1.0, hip: [0, 0.3], gun: { ang: -1.05, wrist: [5.0, -14.3] }, grip: [-0.9, 0.9], rest: [2.4, 0.9] },
  ramA: { stride: 1.0, hip: [0.2, 0.4], lean: 0.04, tilt: -0.1, gun: { ang: -1.3, muzzle: [7.4, -19.2] }, hold: 4.5, rod: 2.2 },
  ramB: { stride: 1.0, hip: [0.2, 0.5], lean: 0.06, tilt: -0.04, gun: { ang: -1.3, muzzle: [7.4, -19.2] }, hold: 4.5, rod: 0.6 },
  raise: { stride: 1.1, hip: [0.1, 0.3], lean: 0.02, head: [0.2, 0.3], gun: { ang: -0.5, butt: [0.5, 0.8] }, grip: [-0.9, 0.9], rest: [2.6, 0.9] },
};
export const MUSKET_POSES = Object.keys(MUSK);
const gunOf = (p, b, len) => {
  const g = p.gun, c = Math.cos(g.ang), s = Math.sin(g.ang);
  const R = (u, v) => [u * c - v * s, u * s + v * c];
  let W;
  if (g.butt) { const sh = b.P(1.8, -15.6), bt = R(...GUN_BUTT); W = [sh[0] + g.butt[0] - bt[0], sh[1] + g.butt[1] - bt[1]]; }
  else if (g.wrist) W = g.wrist;
  else { const m = R(len, 0); W = [g.muzzle[0] - m[0], g.muzzle[1] - m[1]]; }
  return { W, ang: g.ang, at: (u, v) => { const r = R(u, v); return [W[0] + r[0], W[1] + r[1]]; } };
};
const muskKey = (pose) => (typeof pose === "string" && MUSK[pose] ? pose : typeof pose === "number" && pose > 0 ? "kick" : "aim");
// A point of the gun (its own space: u down the barrel from the stock's
// wrist, v across) in a frame, in figure space, and the barrel's angle:
// { x, y, ang }. `len`: the barrel's length. The muzzle is (len, 0) — or
// past it, a bell's lip: musketMuzzle(pose, len, lip).
export const musketPoint = (pose, len, u, v = 0) => {
  const p = MUSK[muskKey(pose)], g = gunOf(p, bodyOf(p), len || GUN_LEN), [x, y] = g.at(u, v);
  return { x, y, ang: g.ang };
};
export const musketMuzzle = (pose = "aim", len = GUN_LEN, lip = 0) => musketPoint(pose, len, len + lip, -0.2);
// which frame: ms since the shot and until the next, the rate; idle: the clock
export const musketFrame = (since, until, rate, o = {}) => {
  if (o.idle) {
    const c = cyc(o.clock || 0, 13);
    return c < 0.56 ? "port" : c < 0.59 ? "raise" : c < 0.9 ? "aim" : c < 0.93 ? "raise" : "port";
  }
  const k = Math.min(1, (rate || 2600) / 2600);
  if (since < 95 * k) return "kick";
  if (since < 260 * k) return "recoil";
  if (since < 470 * k) return "port";
  if (since < 1050 * k) return cyc(since / 1000, 0.29) < 0.5 ? "ramA" : "ramB";
  if (since < 1250 * k) return "port";
  if (since < 1450 * k) return "raise";
  return "aim";
};
// o.len: the barrel's length; o.parts(c, len): paints branch fittings (a
// scope, a bell) in the gun's own space, after the barrel.
export const drawMusketeer = (ctx, x, y, dir, pal, pose = 0, o = {}) => {
  const key = muskKey(pose), p = MUSK[key], b = bodyOf(p), len = o.len || GUN_LEN, g = gunOf(p, b, len);
  const ramming = !!p.rod;
  const nearHand = ramming ? g.at(len + p.rod, -0.2) : g.at(...p.rest);
  const farHand = ramming ? g.at(len - p.hold, 0.8) : g.at(...p.grip);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  stand(ctx, b, pal);
  b.on(ctx, () => torso(ctx, 0, -17, 10, 7.5, pal));
  const hd = headAt(b, p);
  // the far hand on the grip (or the barrel), behind the gun
  reach(ctx, b.P(-1.2, -15.6), farHand, pal, { col: darken(pal.coat, 0.1) });
  // the gun
  ctx.save();
  ctx.translate(g.W[0], g.W[1]); ctx.rotate(g.ang);
  part(ctx, (c) => {
    c.lineCap = "round";
    c.strokeStyle = "#5f4326"; c.lineWidth = 2.1;                                  // the stock
    c.beginPath(); c.moveTo(GUN_BUTT[0] + 0.4, GUN_BUTT[1] - 0.2); c.lineTo(0.2, 0.3); c.stroke();
    c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, 0.5); c.lineTo(len * 0.62, 0.5); c.stroke();   // the fore-stock under the barrel
    c.strokeStyle = "#6c727e"; c.lineWidth = 1.3;                                  // the barrel
    c.beginPath(); c.moveTo(-0.4, -0.2); c.lineTo(len, -0.2); c.stroke();
    c.fillStyle = "#c8b070"; c.fillRect(-1.0, 0.3, 0.9, 0.7);                     // the lock's brass
    if (ramming) {                                                                  // the rod down the barrel
      c.strokeStyle = "#9a9ea8"; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(len - 0.3, -0.2); c.lineTo(len + p.rod + 0.8, -0.2); c.stroke();
    }
    if (o.parts) o.parts(c, len);
  });
  ctx.restore();
  onHead(ctx, hd, (hx, hy) => {
    head(ctx, hx, hy, pal, { hood: false });
    cap(ctx, hx, hy, pal.hood, { wide: true, tall: true, band: pal.trim });   // the broad hat
  });
  reach(ctx, b.P(1.8, -15.6), nearHand, pal);
  ctx.restore();
};
