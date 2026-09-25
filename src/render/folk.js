// ============ FOLK ============
// The little people of the kingdom, as one shared body: a slim, rounded
// figure about 22 world pixels tall, drawn from the feet up in lit, soft
// forms — no outlines. Tower crews stand on this rig now; the soldiers and
// the horde will stand on it next.
//
// Every figure faces +x in its own space and is mirrored by `dir`. A
// palette names the visible materials: skin, hood, coat, boots, trim.

import { lighten, darken, rgba, soft, shadow, ball, roundRect, cylinder, lin, rad, part } from "./paint.js";

// A rounded limb between two points, shaded across its width.
const limb = (ctx, x0, y0, x1, y1, w, col) => part(ctx, (c) => {
  const ww = w * 0.8;                                   // slim: a forearm, not a sausage
  c.strokeStyle = lin(c, x0 - ww, y0 - ww, x0 + ww, y0 + ww, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
  c.lineWidth = ww;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
});

// ---- the body kit ----------------------------------------------------------
// The same construction as the crown's soldiers (rigs-crown.js): a closed
// path through [x, y] points (rounded) or [x, y, 1] (a corner), lit across
// its bounds, inked as its own part; `then` paints inside it, clipped.
const pathPts = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const st = pts[0][2] ? pts[0] : mid(pts[n - 1], pts[0]);
  c.beginPath(); c.moveTo(st[0], st[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    if (p[2]) c.lineTo(p[0], p[1]);
    else { const m = q[2] ? q : mid(p, q); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  }
  c.closePath();
};
const blob = (ctx, pts, col, o = {}) => part(ctx, (c) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  pathPts(c, pts);
  c.fillStyle = lin(c, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), [[0, lighten(col, o.hi ?? 0.3)], [0.5, col], [1, darken(col, o.lo ?? 0.42)]]);
  c.fill();
  if (o.then) { c.save(); pathPts(c, pts); c.clip(); o.then(c); c.restore(); }
});
const at = (pts, x, y, k = 1) => pts.map(([px, py, cn]) => (cn ? [x + px * k, y + py * k, 1] : [x + px * k, y + py * k]));
const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const INKY = "#2a2230";

// A head about 5 across, so a figure stands 4½ heads tall: a jaw, an ear,
// a brow, an eye with a glint, a nose that breaks the profile. The hood (or
// cap) is a peaked cowl that shades the brow and falls to the shoulders.
const FACE = [[-2.0, 0.2], [-1.9, -1.6], [-0.6, -2.5], [1.2, -2.4], [2.1, -1.4], [2.3, -0.5], [2.8, 0.3, 1], [2.2, 0.8], [2.0, 1.6], [1.1, 2.4], [-0.4, 2.3], [-1.6, 1.4]];
const HOOD = [[-2.2, 3.4, 1], [-2.9, 0.6], [-2.9, -1.8], [-4.8, -3.6, 1], [-1.6, -3.4], [0.6, -3.4], [2.2, -2.5], [2.9, -1.3, 1], [1.4, -1.6], [0.4, -0.6], [0.3, 1.4], [1.2, 3.4, 1]];
const head = (ctx, x, y, pal, o = {}) => {
  const k = 1.08, hy = y - 0.3;
  const hooded = o.hood !== false;
  blob(ctx, at(FACE, x, hy, k), pal.skin, {
    hi: 0.28, lo: 0.35, then: (c) => {
      dab(c, x - 1.0 * k, hy - 0.3, 0.8, 1.2, darken(pal.skin, 0.22));                 // the ear
      c.strokeStyle = darken(pal.skin, 0.55); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(x + 0.6 * k, hy - 1.3 * k); c.lineTo(x + 1.9 * k, hy - 1.1 * k); c.stroke();   // brow
      dab(c, x + 1.05 * k, hy - 0.8 * k, 0.65, 0.9, INKY); dab(c, x + 1.05 * k, hy - 0.8 * k, 0.3, 0.3, "#fff3d2");
      dab(c, x + 1.5 * k, hy + 1.3 * k, 0.8, 0.4, darken(pal.skin, 0.45));             // the mouth
      if (hooded) { c.fillStyle = rgba(darken(pal.skin, 0.45), 0.55); c.fillRect(x - 3, hy - 3, 7, 1.6); }   // shade under the hood
    },
  });
  if (hooded) {
    const hood = pal.hood;
    blob(ctx, at(HOOD, x, hy, k), hood, {
      hi: 0.35, lo: 0.45, then: (c) => {
        c.strokeStyle = darken(hood, 0.4); c.lineWidth = 0.45;
        c.beginPath(); c.moveTo(x - 2.0 * k, hy - 2.6 * k); c.lineTo(x - 0.6 * k, hy + 1.0 * k); c.stroke();
        c.strokeStyle = lighten(hood, 0.35); c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(x + 0.6 * k, hy - 3.0 * k); c.lineTo(x + 2.2 * k, hy - 1.9 * k); c.stroke();
      },
    });
    if (pal.hair) blob(ctx, at([[1.0, -1.7], [2.0, -1.4], [1.3, -0.4, 1], [0.8, -0.8]], x, hy, k), pal.hair, { hi: 0.3 });
  } else if (pal.hair) blob(ctx, at([[-2.2, 0.4], [-2.3, -1.8], [-0.6, -2.8], [1.6, -2.6], [2.3, -1.6, 1], [0.2, -1.6], [-0.9, 0.6, 1]], x, hy, k), pal.hair, { hi: 0.3 });
};

// Torso: a jerkin with shoulders, a belt, and a short skirt below it. `top`
// is the shoulder line, `h` down to the hem.
const torso = (ctx, x, top, h, w, pal) => {
  const hw = w / 2, belt = top + h * 0.66, hem = top + h + 1.2;
  const coat = pal.coat;
  blob(ctx, [[x - hw + 0.3, belt], [x + hw - 0.2, belt], [x + hw + 0.5, hem, 1], [x - hw - 0.4, hem, 1]], darken(coat, 0.12), {
    then: (c) => { dab(c, x - hw - 1, hem - 0.8, w + 2, 0.8, darken(coat, 0.45)); dab(c, x + 0.3, belt, 0.5, hem - belt, darken(coat, 0.4)); },
  });
  blob(ctx, [[x + hw - 0.4, belt + 0.4], [x + hw - 0.1, top + h * 0.3], [x + hw * 0.8, top + 0.3], [x + 0.2, top - 0.5], [x - hw * 0.85, top + 0.2], [x - hw - 0.2, top + h * 0.35], [x - hw + 0.2, belt + 0.4]], coat, {
    then: (c) => {
      dab(c, x - hw, belt - 0.6, w, 1.2, darken(pal.trim || pal.boots, 0.15));                    // the belt
      dab(c, x + 0.6, belt - 0.6, 1, 1.2, "#d8b34a");                                               // its buckle
      c.strokeStyle = darken(coat, 0.4); c.lineWidth = 0.45;
      c.beginPath(); c.moveTo(x + hw - 1, top + 1); c.lineTo(x + hw - 1.2, belt - 0.8); c.stroke(); // the jerkin's lacing edge
      c.strokeStyle = rgba(darken(pal.trim || pal.boots, 0.1), 0.9); c.lineWidth = 0.7;             // a strap across the chest
      c.beginPath(); c.moveTo(x - hw, top + 0.8); c.lineTo(x + hw, belt - 1.2); c.stroke();
    },
  });
};

// Two jointed legs: thigh and shin, knees a touch bent, boots with a toe.
const legs = (ctx, x, y, pal, stride = 0) => {
  const leg = (hx, fx, col) => {
    const kx = (hx + fx) / 2 + 0.5, ky = y - 3.8;
    limb(ctx, hx, y - 7.8, kx, ky, 2.6, col);
    limb(ctx, kx, ky, fx, y - 1.2, 2.3, col);
    blob(ctx, [[fx - 1.1, y - 2.2], [fx + 0.8, y - 2.2], [fx + 2.2, y - 0.4, 1], [fx + 1.8, y + 0.2, 1], [fx - 1.2, y + 0.2, 1]], darken(pal.boots, 0.2), { hi: 0.35 });
  };
  leg(x - 0.9, x - 1.6 - stride * 1.5, darken(pal.boots, 0.12));
  leg(x + 0.9, x + 1.5 + stride * 1.5, pal.boots);
};

// ---- poses ---------------------------------------------------------------

// An archer at the string. `draw` runs 0..1: loosed to full draw. Towers
// may pass `o.pose`: "rest" (bow carried low, at ease), "loose" (the string
// has just slipped: it snaps straight and shivers, the bow arm drives on,
// the drawing hand flicks back past the ear), "reach" (a hand over the
// shoulder to the quiver). Without a pose the figure draws by `draw`: the
// limbs bend, the string comes back to the cheek, the arrow rides on it,
// and he leans back into the weight.
export const drawArcher = (ctx, x, y, dir, pal, draw = 1, o = {}) => {
  const big = !!o.big;
  const s = big ? 1.15 : 1;
  const pose = o.pose || "draw";
  const bowCol = o.bowCol || "#4a3018";
  const fl = o.fletch || "#e8e0c8";
  const d = pose === "draw" ? draw : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  shadow(ctx, 0.5, 0.4, 4.6, 1.6, 0.3);
  // the quiver rides on the back, fletchings over the shoulder
  const lean = pose === "draw" ? -d * 0.8 : pose === "loose" ? 0.5 : 0;
  part(ctx, (c) => {
    c.save(); c.translate(-3 + lean, -10.6); c.rotate(-0.42);
    for (const [i, col] of [[0, fl], [1, "#a04a3f"], [2, fl]].entries()) { c.fillStyle = col; c.beginPath(); c.moveTo(-1.0 + i * 0.9, -6.6); c.lineTo(-0.7 + i * 0.9, -8.6); c.lineTo(-0.2 + i * 0.9, -6.6); c.closePath(); c.fill(); }
    roundRect(c, -1.3, -6.8, 2.6, 7, 0.9);
    c.fillStyle = lin(c, -1.3, 0, 1.3, 0, [[0, lighten("#7a5334", 0.3)], [0.5, "#7a5334"], [1, darken("#7a5334", 0.4)]]); c.fill();
    c.fillStyle = darken("#7a5334", 0.45); c.fillRect(-1.3, -5.8, 2.6, 0.6); c.fillRect(-1.3, -1.6, 2.6, 0.6);
    c.restore();
  });
  legs(ctx, 0, 0, pal, pose === "rest" ? 0.1 : 0.55);
  ctx.save();
  ctx.translate(lean, 0);
  // the bow: where the grip sits, how far the limbs bend, where the string's nock is
  const half = big ? 8.6 : 7.6;
  let gx = 7.2, gy = -15.6, rot = 0, belly = 1.2 + d * 2.6, nx, ny;
  if (pose === "rest") { gx = 4.6; gy = -9.2; rot = 0.42; belly = 1.2; }
  if (pose === "reach") { gx = 6.4; gy = -14.2; rot = 0.12; }
  if (pose === "loose") { gx = 7.9; belly = 1.6; }
  // the string hand: sliding back from the grip to the cheek as the draw fills
  const cheek = [2.3, -18.3];
  let hx = gx - 1.2 + (cheek[0] - gx + 1.2) * d, hy = gy + (cheek[1] - gy) * d;
  if (pose === "loose") { hx = -3.8; hy = -17.6; }
  if (pose === "reach") { hx = -2.6; hy = -21.2; }
  if (pose === "rest") { hx = -1.8; hy = -9.6; }
  // the far arm (the bow arm) behind the body, reaching to the grip
  limb(ctx, 0.2, -16.2, gx - 0.4, gy + 0.2, 2.4, darken(pal.coat, 0.18));
  torso(ctx, 0, -17.2, 10.4, 6.4, pal);
  head(ctx, 0.5, -20.6, pal);
  // the bow itself, in front of the body
  ctx.save();
  ctx.translate(gx, gy); ctx.rotate(rot);
  nx = pose === "draw" ? (hx - gx) * Math.cos(-rot) : -0.6; ny = pose === "draw" ? hy - gy : 0;
  const tipX = -0.6 - d * 1.2;
  part(ctx, (c) => {
    c.strokeStyle = lin(c, 0, -half, belly, half, [[0, lighten(bowCol, 0.35)], [0.5, bowCol], [1, darken(bowCol, 0.35)]]);
    c.lineWidth = big ? 1.7 : 1.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(tipX, -half); c.quadraticCurveTo(belly * 2, -half * 0.35, belly * 0.9, 0); c.quadraticCurveTo(belly * 2, half * 0.35, tipX, half); c.stroke();
    c.fillStyle = darken(bowCol, 0.45); c.fillRect(belly * 0.9 - 0.7, -1.1, 1.4, 2.2);           // the leather grip
  });
  ctx.strokeStyle = "rgba(244,236,214,0.95)";
  ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(pose === "draw" ? nx : tipX, pose === "draw" ? ny : 0); ctx.lineTo(tipX, half); ctx.stroke();
  if (pose === "loose") {
    ctx.strokeStyle = "rgba(244,236,214,0.5)";
    ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(tipX - 1.3, 0); ctx.lineTo(tipX, half); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(tipX + 1.1, 0); ctx.lineTo(tipX, half); ctx.stroke();
  }
  ctx.restore();
  // the arrow on the string, from the nock at the hand out past the grip
  if (pose === "draw" && d > 0.25) {
    const len = big ? 13 : 11.5;
    const ax = gx + belly * 0.9 - hx, ay = gy - hy, L = Math.hypot(ax, ay) || 1;
    const ux = ax / L, uy = ay / L, ex = hx + ux * len, ey = hy + uy * len;
    part(ctx, (c) => {
      c.strokeStyle = "#8a6a44"; c.lineWidth = 0.7; c.lineCap = "butt";
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = "#c4c8d0";
      c.beginPath(); c.moveTo(ex + ux * 2.2, ey + uy * 2.2); c.lineTo(ex - uy * 1.1, ey + ux * 1.1); c.lineTo(ex + uy * 1.1, ey - ux * 1.1); c.closePath(); c.fill();
      c.fillStyle = bowCol === "#4a3018" ? "#a04a3f" : fl;
      c.beginPath(); c.moveTo(hx + ux * 0.4, hy + uy * 0.4); c.lineTo(hx + ux * 2.4 - uy * 1.2, hy + uy * 2.4 + ux * 1.2); c.lineTo(hx + ux * 2.6, hy + uy * 2.6); c.closePath(); c.fill();
      c.fillStyle = fl;
      c.beginPath(); c.moveTo(hx + ux * 0.4, hy + uy * 0.4); c.lineTo(hx + ux * 2.4 + uy * 1.2, hy + uy * 2.4 - ux * 1.2); c.lineTo(hx + ux * 2.6, hy + uy * 2.6); c.closePath(); c.fill();
    });
  }
  // the bow hand closes on the grip
  const gpx = gx + Math.cos(rot) * belly * 0.9, gpy = gy + Math.sin(rot) * belly * 0.9;
  ball(ctx, gpx - 0.2, gpy, 1.1, 1.2, pal.skin, { hi: 0.4, lo: 0.4 });
  // the near arm: elbow high and back at full draw, flung out at the loose
  const sh = [0.9, -16.4];
  const ex2 = pose === "draw" ? sh[0] - 1.5 - d * 1.8 : pose === "loose" ? -1.2 : pose === "reach" ? -1.6 : 0.2;
  const ey2 = pose === "draw" ? -15.4 - d * 2.4 : pose === "loose" ? -15.2 : pose === "reach" ? -19.6 : -12.6;
  limb(ctx, sh[0], sh[1], ex2, ey2, 2.4, pal.coat);
  limb(ctx, ex2, ey2, hx, hy, 2.2, pal.coat);
  ball(ctx, hx, hy, 1.05, 1.1, pal.skin, { hi: 0.4, lo: 0.4 });
  if (pose === "loose") { dab(ctx, hx - 1.6, hy - 1.2, 0.6, 0.6, pal.skin); dab(ctx, hx - 1.8, hy + 0.2, 0.6, 0.6, pal.skin); }   // fingers open
  ctx.restore();
  ctx.restore();
};

// A crewman working a winch or a wheel: braced stance, both hands on a bar.
export const drawCrew = (ctx, x, y, dir, pal, work = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 1);
  torso(ctx, 0.5 + work, -17, 10, 7.5, pal);
  head(ctx, 1 + work, -20.5, pal, { hood: true });
  const hx = 5.5 + work * 1.5, hy = -13 + work;
  limb(ctx, 2, -15, hx, hy, 2.4, pal.coat);
  limb(ctx, -1, -15.5, hx - 0.5, hy - 1.5, 2.4, pal.coat);
  ball(ctx, hx, hy, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ball(ctx, hx - 0.5, hy - 1.5, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// A gate guard: a stander with a halberd grounded beside him.
export const drawHalberdier = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.3);
  torso(ctx, 0, -17, 10, 7.5, pal);
  // the pole, from the ground to well over the helmet
  cylinder(ctx, 5.2, -34, 1.6, 34, "#6a4a2e", { r: 0.8, hi: 0.3, lo: 0.5 });
  part(ctx, (c) => {
    c.fillStyle = lin(c, 3, 0, 9, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
    c.beginPath(); c.moveTo(6, -34); c.lineTo(10.5, -30); c.lineTo(6, -25.5); c.closePath(); c.fill();
    c.fillRect(5.3, -37, 1.4, 4);
  });
  limb(ctx, -2.5, -15, -3, -9, 2.4, pal.coat);
  limb(ctx, 2.5, -15, 5.5, -20, 2.4, pal.coat);
  ball(ctx, 5.7, -20.5, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  head(ctx, 0.4, -20.5, pal, { helm: true });
  ctx.restore();
};

// A mason at the wall, trowel up.
export const drawMason = (ctx, x, y, dir, pal, work = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.5);
  torso(ctx, 0, -17, 10, 7.5, pal);
  head(ctx, 0.4, -20.5, pal, { hood: true });
  limb(ctx, -2.5, -15, -4, -9.5, 2.4, pal.coat);
  const hx = 6, hy = -18 - work * 3;
  limb(ctx, 2.5, -15, hx, hy, 2.4, pal.coat);
  ball(ctx, hx, hy, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  part(ctx, (c) => { c.fillStyle = "#b8bcc6"; c.beginPath(); c.moveTo(hx - 1, hy - 1.5); c.lineTo(hx + 5, hy - 3.5); c.lineTo(hx + 3, hy + 0.5); c.closePath(); c.fill(); });
  ctx.restore();
};

export const WALL_FOLK = {
  bowman: { skin: "#e8b990", hood: "#5a4a3a", coat: "#7c3f4a", boots: "#3e2a1a", trim: "#d8b34a" },
  guard: { skin: "#e8b990", hood: "#8a909c", coat: "#7c3f4a", boots: "#2a2a30", trim: "#d8b34a" },
  mason: { skin: "#e8b990", hood: "#c8b898", coat: "#8a7a5a", boots: "#3e2a1a", trim: "#5a4a3a" },
};

// Somebody just standing there, looking about.
export const drawStander = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -2.5, -15, -3, -9, 2.4, pal.coat);
  limb(ctx, 2.5, -15, 3.2, -9, 2.4, pal.coat);
  head(ctx, 0.4, -20.5, pal);
  ctx.restore();
};

// The crews' cloth, by tower and path.
export const ARCHER_FOLK = {
  base: { skin: "#e8b990", hood: "#5c7a3f", coat: "#7a5432", boots: "#3e2a1a", trim: "#3e2a1a" },
  a: { skin: "#e8b990", hood: "#3f6a34", coat: "#8a6a40", boots: "#3e2a1a", trim: "#2f4a24" },
  b: { skin: "#e8b990", hood: "#2c3e54", coat: "#3a5474", boots: "#2a2a30", trim: "#1f2c3e" },
  aa: { skin: "#d6c8a0", hood: "#5a2a3a", coat: "#3c6a34", boots: "#2a3020", trim: "#243a20" },
  ab: { skin: "#e8b990", hood: "#e8e0c8", coat: "#4a7098", boots: "#2a2a30", trim: "#3a5060" },
  bb: { skin: "#e8b990", hood: "#8e2f2a", coat: "#a0473a", boots: "#2a2a30", trim: "#d8b34a" },
  crew: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
};

export { soft };

// ---- the spire's mage and the warden's priest ----------------------------

// A robe: a coat that widens to the hem, no legs showing.
const robe = (ctx, x, top, h, wTop, wHem, col, trim) => part(ctx, (c) => {
  c.beginPath();
  c.moveTo(x - wTop / 2, top);
  c.lineTo(x + wTop / 2, top);
  c.quadraticCurveTo(x + wHem / 2, top + h * 0.6, x + wHem / 2, top + h);
  c.lineTo(x - wHem / 2, top + h);
  c.quadraticCurveTo(x - wHem / 2, top + h * 0.6, x - wTop / 2, top);
  c.closePath();
  c.fillStyle = lin(c, x - wHem / 2, 0, x + wHem / 2, 0, [[0, lighten(col, 0.32)], [0.45, col], [1, darken(col, 0.5)]]);
  c.fill();
  if (trim) { c.fillStyle = trim; c.fillRect(x - wHem / 2 + 0.5, top + h - 1.6, wHem - 1, 1.3); }
});

// The mage: apprentice (bare-handed, small), then a staff-bearer, then the
// long-beard. `level` 1..3. The orb is drawn by the tower, at mageTip().
// o.pose: "charge" (the default — conjuring hand up, staff upright),
// "idle" (staff grounded, hand at rest), "cast" (staff driven forward at
// the foe, the free hand flung out behind it).
export const mageTip = (level, pose = "charge") => {
  const tall = level >= 3;
  if (level < 2) return pose === "cast" ? [8, -17] : pose === "idle" ? [4.5, -12] : [5, -21];
  if (pose === "cast") return [11, -20 - (tall ? 1.5 : 0)];
  return [6.5, -23 - (tall ? 2 : 0)];
};
export const drawMage = (ctx, x, y, dir, pal, level = 3, o = {}) => {
  const pose = o.pose || "charge";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  const tall = level >= 3;
  const lean = pose === "cast" ? 0.8 : 0;
  robe(ctx, 0, -17, 17, 7, tall ? 12 : 10, pal.robe, pal.trim);
  // a sash of the trim colour down the front
  part(ctx, (c) => { c.fillStyle = pal.trim; c.fillRect(1.2, -16.5, 1, 15); });
  const [tx, ty] = mageTip(level, pose);
  // the staff: grounded, upright, or levelled at the foe
  if (level >= 2) {
    part(ctx, (c) => {
      c.strokeStyle = lin(c, tx - 1, 0, tx + 1, 0, [[0, "#8a6a44"], [1, "#4a3420"]]);
      c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath();
      if (pose === "cast") { c.moveTo(3, -4); c.lineTo(tx - 1, ty + 1.5); }
      else { c.moveTo(tx - 1.5, -0.5); c.lineTo(tx - 0.6, ty + 1.5); }
      c.stroke();
      // the head of the staff: a gilt fork that cups the orb
      c.fillStyle = pal.trim;
      c.fillRect(tx - 2.2, ty + 1, 1, 2); c.fillRect(tx + 0.6, ty + 1, 1, 2); c.fillRect(tx - 2.2, ty + 2.5, 3.8, 1);
    });
  }
  ctx.translate(lean, 0);
  // arms: the staff hand, and the free hand conjuring (or resting)
  const sh = pose === "cast" ? [tx - 4, ty + 3.5] : level >= 2 ? [tx - 1, -13] : pose === "cast" ? [tx - 1, ty] : [5.5, -13];
  const fh = pose === "idle" ? [-3, -9.5] : pose === "cast" ? [-5.5, -15] : [-4.5, -20.5];
  if (level < 2 && pose !== "idle") sh[0] = tx - 1, sh[1] = ty + 0.5;
  limb(ctx, 2, -15, sh[0], sh[1], 2.2, pal.robe);
  limb(ctx, -2, -15, fh[0], fh[1], 2.2, pal.robe);
  ball(ctx, fh[0], fh[1], 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  ball(ctx, sh[0], sh[1], 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  // head, beard, hat
  part(ctx, (c) => ball(c, 0.4, -20.5, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  if (tall) part(ctx, (c) => { c.beginPath(); c.moveTo(-2.4, -19); c.quadraticCurveTo(0.6, -10, 3.4, -19); c.closePath(); c.fillStyle = pal.beard || "#e8e0d0"; c.fill(); });
  else if (level === 2) part(ctx, (c) => ball(c, 0.6, -18, 2.2, 1.4, pal.beard || "#c8bca8", { hi: 0.3, lo: 0.3 }));
  part(ctx, (c) => {
    // brim, then the point, flopping back
    ball(c, 0.4, -23, 5.2, 1.5, pal.hat, { hi: 0.4, lo: 0.4 });
    c.beginPath(); c.moveTo(-3.4, -23); c.quadraticCurveTo(0, -25, 1.8 + (tall ? 1.5 : 0) - (pose === "cast" ? 2.5 : 0), -33 - (tall ? 2 : 0)); c.quadraticCurveTo(3, -26, 3.8, -23); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
    c.fillStyle = pal.trim; c.fillRect(-3, -24, 6.6, 1);
  });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(2, -20.3, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

// The priest: a robe and a mitre, arms raised in blessing or folded.
export const drawPriest = (ctx, x, y, dir, pal, raised = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  robe(ctx, 0, -17, 17, 7.5, 12, pal.robe, pal.trim);
  if (raised) {
    limb(ctx, -2.5, -15, -6, -22, 2.2, pal.robe);
    limb(ctx, 2.5, -15, 6, -22, 2.2, pal.robe);
    ball(ctx, -6, -22.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
    ball(ctx, 6, -22.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  } else {
    limb(ctx, -2.5, -15, -1, -11, 2.2, pal.robe);
    limb(ctx, 2.5, -15, 1, -11, 2.2, pal.robe);
  }
  part(ctx, (c) => ball(c, 0.4, -20.5, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  // the mitre: a tall split cap with a gem
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(-3.2, -22.5); c.lineTo(-1.2, -30); c.lineTo(0.6, -27.5); c.lineTo(2.4, -30); c.lineTo(4, -22.5); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
  });
  ball(ctx, 0.5, -25, 0.9, 0.9, pal.gem || "#8ce8f0", { hi: 0.6, lo: 0.2 });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(2, -20.3, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

export const MAGE_FOLK = {
  base: { skin: "#e8b990", robe: "#5a4a8c", hat: "#3f3468", trim: "#d8b34a", beard: "#e8e0d0" },
  a: { skin: "#e8b990", robe: "#8a3a2e", hat: "#5a2420", trim: "#e8a040", beard: "#e8e0d0" },
  aa: { skin: "#e8b990", robe: "#7a2a22", hat: "#3a1a18", trim: "#f0b048", beard: "#d8cfc0" },
  ab: { skin: "#e8b990", robe: "#a04a2a", hat: "#6a2c1c", trim: "#f0c060", beard: "#e8e0d0" },
  b: { skin: "#e8b990", robe: "#2e4a7a", hat: "#1f3252", trim: "#8ce8f0", beard: "#e8e0d0" },
  ba: { skin: "#e8b990", robe: "#24406e", hat: "#182a48", trim: "#a8f0f8", beard: "#e8e0d0" },
  bb: { skin: "#e8b990", robe: "#3a3a80", hat: "#22224e", trim: "#f0e070", beard: "#e8e0d0" },
};
export const PRIEST_FOLK = {
  base: { skin: "#e8b990", robe: "#d8d0bc", hat: "#e8e2d0", trim: "#7cb8c8", gem: "#8ce8f0" },
  a: { skin: "#e8b990", robe: "#c8dce4", hat: "#e8f2f6", trim: "#5aa8c0", gem: "#8ce8f0" },
  aa: { skin: "#d8e0e8", robe: "#b8d4e0", hat: "#eef8fc", trim: "#3a90b0", gem: "#b8f0f8" },
  ab: { skin: "#e8b990", robe: "#a8c8d4", hat: "#e0eef4", trim: "#4a90a8", gem: "#c8ecf4" },
  b: { skin: "#e8b990", robe: "#e0d8b8", hat: "#f0e8c8", trim: "#7cb864", gem: "#8ce08c" },
  ba: { skin: "#e8b990", robe: "#e8dcb0", hat: "#f4ecc8", trim: "#d8b34a", gem: "#e8d47a" },
  bb: { skin: "#e8b990", robe: "#e8e0c0", hat: "#f8f2d8", trim: "#d8b34a", gem: "#f0d060" },
};

// ---- more crews ------------------------------------------------------------

// A smith at the anvil: hammer up (swing 1) or down (swing 0).
export const drawSmith = (ctx, x, y, dir, pal, swing = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.8);
  torso(ctx, 0, -17, 10, 8, pal);
  // leather apron
  part(ctx, (c) => { c.fillStyle = darken(pal.trim || "#6a4a2e", 0.1); roundRect(c, -3, -15, 6, 8, 1.5); c.fill(); });
  head(ctx, 0.4, -20.5, pal, { hood: false });
  part(ctx, (c) => ball(c, 0.2, -22.5, 3.6, 1.6, pal.hood, { hi: 0.4, lo: 0.4 }));   // a flat cap
  const hx = swing > 0.5 ? 3 : 6.5, hy = swing > 0.5 ? -26 : -12;
  limb(ctx, 2, -15, hx, hy, 2.4, pal.coat);
  limb(ctx, -1.5, -15, 4.5, -12, 2.4, pal.coat);
  // the hammer
  part(ctx, (c) => {
    c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + (swing > 0.5 ? 3 : 4), hy + (swing > 0.5 ? -4 : -1)); c.stroke();
    c.fillStyle = "#6c727e"; roundRect(c, hx + (swing > 0.5 ? 1.5 : 2.5), hy + (swing > 0.5 ? -6.5 : -3.5), 4, 3, 0.8); c.fill();
  });
  ball(ctx, hx, hy, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// A hooded figure standing still, arms folded — the covert's blade on watch.
export const drawHooded = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.1);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -3, -14, 2.5, -11, 2.2, pal.coat);
  limb(ctx, 3, -14, -2.5, -11, 2.2, pal.coat);
  // a deep hood: the face is a hollow
  part(ctx, (c) => {
    ball(c, 0.2, -21, 3.8, 4.2, pal.hood, { hi: 0.35, lo: 0.5 });
    c.fillStyle = "#1a1420";
    c.beginPath(); c.ellipse(1.4, -20.6, 2, 2.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = pal.skin; c.fillRect(0.8, -18.6, 1.6, 0.9);   // a chin, nothing more
  });
  ctx.restore();
};

// The falcon-mistress: gauntlet raised to the wheel of birds.
export const drawMistress = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.3);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -2.5, -15, -3, -9, 2.2, pal.coat);
  limb(ctx, 2.5, -15, 8, -21, 2.2, pal.coat);
  part(ctx, (c) => { c.fillStyle = "#6a4a2e"; roundRect(c, 6.5, -23.5, 4, 3.5, 1); c.fill(); });   // the gauntlet
  head(ctx, 0.4, -20.5, pal);
  ctx.restore();
};

// The bombardier, a lit charge in his hands, raised to throw or held low.
export const drawBomber = (ctx, x, y, dir, pal, throwing = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.7);
  torso(ctx, 0, -17, 10, 8, pal);
  head(ctx, 0.4, -20.5, pal, { hood: false });
  part(ctx, (c) => ball(c, 0.2, -22.8, 3.4, 1.4, pal.hood, { hi: 0.3, lo: 0.4 }));
  const bx = throwing ? 5 : 5.5, by = throwing ? -24 : -12;
  limb(ctx, 2, -15, bx - 1, by + 1, 2.4, pal.coat);
  limb(ctx, -1.5, -15, bx - 2, by + 2, 2.4, pal.coat);
  part(ctx, (c) => ball(c, bx + 0.5, by - 1, 2.6, 2.6, "#2e2e36", { hi: 0.45, lo: 0.4 }));
  ctx.restore();
};

// The musketeer: braced, long gun out, a wide hat because he must stand still.
export const drawMusketeer = (ctx, x, y, dir, pal, kick = 0) => {
  ctx.save();
  ctx.translate(x - kick, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 1.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  head(ctx, 0.4, -20.5, pal, { hood: false });
  part(ctx, (c) => { ball(c, 0.2, -22.6, 5.2, 1.5, pal.hood, { hi: 0.35, lo: 0.4 }); ball(c, 0.2, -24, 2.8, 2, pal.hood, { hi: 0.35, lo: 0.4 }); });
  // the gun, barrel out front
  part(ctx, (c) => {
    c.strokeStyle = "#5f4326"; c.lineWidth = 2.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(-1, -12.5); c.lineTo(4, -15); c.stroke();
    c.strokeStyle = "#6c727e"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(3, -15); c.lineTo(13, -16.5); c.stroke();
  });
  limb(ctx, 2, -15, 6, -15, 2.2, pal.coat);
  limb(ctx, -1.5, -15, 1.5, -13, 2.2, pal.coat);
  ctx.restore();
};

export const CREW_FOLK = {
  engineer: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
  smith: { skin: "#e8b990", hood: "#4a3a2e", coat: "#5a4a3c", boots: "#2e2420", trim: "#6a4a2e" },
  clerk: { skin: "#e8b990", hood: "#3a4a6a", coat: "#4a5a7a", boots: "#2a2a30", trim: "#d8b34a" },
  blade: { skin: "#e8b990", hood: "#2a2434", coat: "#3a3244", boots: "#1e1a26", trim: "#6a5a80" },
  bladeGuild: { skin: "#e8b990", hood: "#2e3a2a", coat: "#3a4a34", boots: "#1e241c", trim: "#8a6aa8" },
  mistress: { skin: "#e8b990", hood: "#7a3c30", coat: "#8a5a3a", boots: "#3e2a1a", trim: "#d8b34a" },
  mistressCourt: { skin: "#e8b990", hood: "#3a3468", coat: "#5a4a8c", boots: "#2a2a30", trim: "#d8b34a" },
  bomber: { skin: "#e8b990", hood: "#3a3028", coat: "#5a4a3c", boots: "#2e2420", trim: "#3a3028" },
  musketeer: { skin: "#e8b990", hood: "#2c2a36", coat: "#3a4a6a", boots: "#2a2a30", trim: "#c8b070" },
};
