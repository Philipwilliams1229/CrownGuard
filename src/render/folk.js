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

// An arm in two parts: shoulder to elbow to hand, the elbow dropping (or,
// with bend -1, lifting) as the arm folds, and a small closed hand on the end.
const hand = (ctx, x, y, col) => ball(ctx, x, y, 1.1, 1.2, col, { hi: 0.4, lo: 0.4 });
const arm = (ctx, sx, sy, hx, hy, pal, o = {}) => {
  const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
  const k = Math.sqrt(Math.max(0, 24 - (L / 2) ** 2)) * 0.8;
  let nx = -dy / L, ny = dx / L;
  if ((ny < 0) !== (o.bend === -1)) { nx = -nx; ny = -ny; }
  const ex = (sx + hx) / 2 + nx * k, ey = (sy + hy) / 2 + ny * k;
  const col = o.col || pal.coat;
  limb(ctx, sx, sy, ex, ey, 2.4, col);
  limb(ctx, ex, ey, hx, hy, 2.2, col);
  if (o.hand !== false) hand(ctx, hx, hy, o.glove || pal.skin);
};
// A cap over a bare head: a crown and a brim that juts forward (+x).
const cap = (ctx, x, y, col, o = {}) => {
  const hy = y - 0.3, w = o.wide ? 1.9 : 1;
  blob(ctx, [[x - 2.6 * w, hy - 1.8, 1], [x + 3.2 * w, hy - 1.8, 1], [x + 3.4 * w, hy - 1.1, 1], [x - 2.8 * w, hy - 1.1, 1]], darken(col, 0.1), { hi: 0.3 });
  blob(ctx, [[x - 2.4, hy - 1.6, 1], [x - 2.2, hy - 3.3], [x - 0.2, hy - (o.tall ? 5.2 : 4.1)], [x + 2.0, hy - 3.4], [x + 2.5, hy - 1.6, 1]], col, {
    hi: 0.35, then: (c) => { if (o.band) dab(c, x - 2.6, hy - 2.6, 5.4, 0.8, o.band); },
  });
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
  arm(ctx, -0.6 + work, -15.8, hx - 0.6, hy - 1.4, pal, { col: darken(pal.coat, 0.18) });   // the far arm, behind
  arm(ctx, 1.6 + work, -15.4, hx, hy, pal);
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
  arm(ctx, -2.4, -15.6, -2.8, -8.6, pal);
  head(ctx, 0.4, -20.5, pal, { helm: true });
  arm(ctx, 2.2, -15.6, 5.8, -19.6, pal);
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
  arm(ctx, -2.4, -15.6, -3.8, -9.2, pal);
  const hx = 6, hy = -18 - work * 3;
  arm(ctx, 2.2, -15.6, hx, hy, pal, { bend: -1 });
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
  arm(ctx, -2.4, -15.6, -2.9, -8.6, pal);
  arm(ctx, 2.3, -15.6, 3.1, -8.6, pal);
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
  arm(ctx, 2, -15.4, sh[0], sh[1], pal, { col: pal.robe });
  arm(ctx, -2, -15.4, fh[0], fh[1], pal, { col: pal.robe, bend: pose === "charge" ? -1 : 1 });
  // head, beard, hat: the soldiers' face under the wizard's hat
  head(ctx, 0.4, -20.5, pal, { hood: false });
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
  ctx.restore();
};

// The warden's priest: a frost-and-light mage-priest. A shaped alb that
// flares at the hem, wide bell sleeves cuffed in the accent colour, a stole
// hanging down the front, a two-peaked mitre with its ribbons behind, and a
// short staff crowned with a charm. Folded: both hands on the staff. Raised:
// staff aloft in the near hand, the far hand open in blessing — the hands
// land at (±6, -23), where the hall pools its light.
const sleeve = (ctx, sx, sy, cx, cy, w, col, cuff, droop = 0) => {
  const dx = cx - sx, dy = cy - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const p = [cx + nx * w, cy + ny * w], q = [cx - nx * w, cy - ny * w];
  (p[1] > q[1] ? p : q)[1] += droop;                                     // the loose side hangs
  blob(ctx, [[sx + nx * 1.3, sy + ny * 1.3], [sx - nx * 1.3, sy - ny * 1.3], [q[0], q[1], 1], [p[0], p[1], 1]], col, {
    hi: 0.3, lo: 0.4, then: (c) => { c.strokeStyle = cuff; c.lineWidth = 1; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(p[0], p[1]); c.stroke(); },
  });
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
const openHand = (ctx, x, y, col, s) => {
  hand(ctx, x, y, col);
  dab(ctx, x + s * 0.6, y - 1.9, 0.6, 1, col); dab(ctx, x - s * 0.3, y - 2.1, 0.6, 1.1, col);   // fingers spread
};
export const drawPriest = (ctx, x, y, dir, pal, raised = false) => {
  const robeC = pal.robe, stole = pal.trim, metal = pal.metal || "#d8b34a";
  const farC = darken(robeC, 0.16);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 0.6, 0.4, 5.6, 1.8, 0.3);
  // the far arm raised goes behind the body
  if (raised) {
    limb(ctx, -5.0, -19.8, -6, -22.4, 1.9, pal.skin);
    sleeve(ctx, -2.2, -16.4, -5.0, -20.0, 2.0, farC, stole, 2.6);
    openHand(ctx, -6, -23, pal.skin, -1);
  }
  // the alb: shoulders, a nipped waist, a hem that flares and ripples
  blob(ctx, [[-3.3, -16.4], [-0.8, -17.6], [2.2, -17.4], [3.8, -16.0], [3.9, -11.2], [4.8, -5.4], [6.2, -0.3, 1], [4.2, 0.5], [1.6, 0.0], [-1.0, 0.5], [-3.6, 0.0], [-5.8, -0.3, 1], [-4.8, -5.4], [-3.8, -11.2]], robeC, {
    hi: 0.28, lo: 0.4, then: (c) => {
      c.strokeStyle = darken(robeC, 0.32); c.lineWidth = 0.55;                                // folds, fanning to the hem
      c.beginPath(); c.moveTo(-1.6, -9.4); c.quadraticCurveTo(-2.0, -4, -2.8, 0.4); c.stroke();
      c.beginPath(); c.moveTo(0.6, -8.6); c.quadraticCurveTo(0.8, -4, 0.6, 0.4); c.stroke();
      c.beginPath(); c.moveTo(3.2, -8.8); c.quadraticCurveTo(3.8, -4, 4.4, 0.4); c.stroke();
      c.strokeStyle = lighten(robeC, 0.45); c.lineWidth = 0.6;                               // the lit edge of a fold
      c.beginPath(); c.moveTo(-3.0, -9); c.quadraticCurveTo(-3.6, -4.5, -4.4, -0.6); c.stroke();
      c.beginPath(); c.moveTo(-0.6, -8.8); c.quadraticCurveTo(-0.8, -4, -1.2, -0.4); c.stroke();
      dab(c, -7, -1.0, 14, 1.6, darken(robeC, 0.22));                                          // the hem band
      dab(c, -7, -1.4, 14, 0.5, stole);
      dab(c, -5, -11.6, 10, 0.9, metal);                                                       // the girdle cord
    },
  });
  dab(ctx, 3.9, -0.6, 1.6, 0.9, "#4a3a3a");                                                    // a toe under the hem
  // the stole: two strands down the front, a gilt mark near each end
  for (const [x0, x1, bot, col] of [[-0.9, -0.6, -4.6, darken(stole, 0.2)], [1.4, 2.4, -3.4, stole]]) {
    blob(ctx, [[x0, -17.4, 1], [x0 + 1.7, -17.4, 1], [x1 + 1.8, bot, 1], [x1 + 0.9, bot + 0.7, 1], [x1, bot, 1]], col, {
      hi: 0.35, lo: 0.3, then: (c) => { dab(c, x1 + 0.5, bot - 2.4, 0.8, 1.6, metal); dab(c, x1 + 0.2, bot - 2.0, 1.4, 0.6, metal); },
    });
  }
  // the mitre's ribbons, fallen behind the neck
  part(ctx, (c) => { c.fillStyle = darken(stole, 0.15); c.fillRect(-2.9, -22.4, 0.9, 4.6); c.fillRect(-2.0, -22.4, 0.7, 3.6); });
  if (raised) {
    priestStaff(ctx, 6.6, -14.6, 5.5, -30.2, pal);
    limb(ctx, 5.0, -19.8, 6, -22.4, 1.9, pal.skin);
    sleeve(ctx, 2.2, -16.4, 5.0, -20.0, 2.1, robeC, stole, 2.8);
    hand(ctx, 6, -23, pal.skin);
  } else {
    priestStaff(ctx, 5.0, 0.2, 4.4, -24.6, pal);
    sleeve(ctx, -1.6, -16.6, 2.6, -14.0, 1.8, farC, stole, 0.8);                             // the far arm across the breast
    hand(ctx, 4.5, -14.8, pal.skin);
    sleeve(ctx, 2.2, -16.4, 3.4, -12.4, 2.3, robeC, stole, 1.4);
    hand(ctx, 4.7, -12.2, pal.skin);
  }
  head(ctx, 0.4, -20.5, pal, { hood: false });
  if (pal.hair) { dab(ctx, -1.9, -22.6, 2.0, 0.8, pal.hair); dab(ctx, -1.9, -22.0, 0.8, 2.2, darken(pal.hair, 0.15)); }   // hair at the nape, under the mitre
  if (pal.beard) part(ctx, (c) => { c.beginPath(); c.moveTo(-0.2, -19.4); c.quadraticCurveTo(1.6, -15.6, 3.2, -19.2); c.closePath(); c.fillStyle = pal.beard; c.fill(); });
  // the mitre: a back peak, then the front one, banded and gemmed
  const hat = pal.hat;
  blob(ctx, [[-2.6, -22.8, 1], [1.4, -22.8, 1], [0.6, -26.4], [-0.9, -29.4, 1], [-2.4, -26.6]], darken(hat, 0.2), { hi: 0.25 });
  blob(ctx, [[-1.9, -22.4, 1], [3.5, -22.4, 1], [3.7, -25.2], [2.6, -28.2], [1.1, -30.2, 1], [-0.4, -28.2], [-1.9, -25.4]], hat, {
    hi: 0.3, lo: 0.42, then: (c) => {
      dab(c, -2.2, -23.6, 6.2, 1.2, metal);                                                    // the band
      dab(c, 0.6, -29, 1, 5.4, metal);                                                         // the orphrey up the front
      dab(c, 0.4, -26.4, 1.4, 1.4, pal.gem); dab(c, 0.5, -26.3, 0.5, 0.5, "#fff3d2");         // the gem
    },
  });
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
  base: { skin: "#e8b990", hair: "#8a5a34", robe: "#e6dfcc", hat: "#f0ead8", trim: "#4a9ab4", gem: "#8ce8f0", metal: "#d8b34a", staff: "#8a6a44" },
  a: { skin: "#e8b990", hair: "#8a5a34", robe: "#d0e2ec", hat: "#eef6fa", trim: "#3a7eb0", gem: "#a8ecf8", metal: "#c4d4e0", staff: "#9aaebc" },
  aa: { skin: "#f0d0bc", hair: "#e4eef4", robe: "#b4d0e4", hat: "#f2faff", trim: "#28588e", gem: "#c8f6ff", metal: "#e0ecf4", staff: "#b4c8d8" },
  ab: { skin: "#e8b990", hair: "#6a4a30", robe: "#a4c4d6", hat: "#e4f0f6", trim: "#2e6c8c", gem: "#9ce4f8", metal: "#c4d4e0", staff: "#8aa0b0" },
  b: { skin: "#e8b990", hair: "#8a5a34", robe: "#ece6cc", hat: "#f4efdc", trim: "#5a9a44", gem: "#9ce88c", metal: "#d8b34a", staff: "#8a6a44" },
  ba: { skin: "#e8b990", hair: "#a06a38", robe: "#f2e8c4", hat: "#f8f0d4", trim: "#4e8a3c", gem: "#f0dc7a", metal: "#e0bc50", staff: "#7a5334" },
  bb: { skin: "#e8b990", hair: "#a06a38", robe: "#faf4de", hat: "#fff8e4", trim: "#c8962c", gem: "#f8e070", metal: "#e8c458", staff: "#7a5334" },
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
  cap(ctx, 0.4, -20.5, pal.hood);   // a flat cap
  const hx = swing > 0.5 ? 3 : 6.5, hy = swing > 0.5 ? -26 : -12;
  arm(ctx, -1.2, -15.6, 4.5, -12, pal, { col: darken(pal.coat, 0.18) });   // the far hand steadies the iron
  arm(ctx, 1.8, -15.6, hx, hy, pal, { bend: swing > 0.5 ? -1 : 1, hand: false });
  // the hammer
  part(ctx, (c) => {
    c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + (swing > 0.5 ? 3 : 4), hy + (swing > 0.5 ? -4 : -1)); c.stroke();
    c.fillStyle = "#6c727e"; roundRect(c, hx + (swing > 0.5 ? 1.5 : 2.5), hy + (swing > 0.5 ? -6.5 : -3.5), 4, 3, 0.8); c.fill();
  });
  hand(ctx, hx, hy, pal.skin);
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
  // a deep hood: the face in its shadow, only the eye's glint and a chin
  head(ctx, 0.4, -20.5, { ...pal, skin: darken(pal.skin, 0.62) });
  part(ctx, (c) => { c.fillStyle = darken(pal.skin, 0.1); c.fillRect(1.4, -18.6, 1.4, 0.8); });
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
  arm(ctx, -2.4, -15.6, -2.9, -8.6, pal);
  head(ctx, 0.4, -20.5, pal);
  // the glove arm raised, a long leather gauntlet to the elbow
  arm(ctx, 2.2, -15.6, 8, -21.4, pal, { bend: -1, glove: "#7a5234" });
  part(ctx, (c) => { c.fillStyle = lin(c, 6, 0, 9, 0, [[0, "#9a6a44"], [1, "#5a3a22"]]); c.beginPath(); c.moveTo(5.2, -18.6); c.lineTo(7.2, -20); c.lineTo(8.6, -21.8); c.lineTo(9.4, -20.6); c.lineTo(7.6, -17.6); c.closePath(); c.fill(); c.fillStyle = "#d8b34a"; c.fillRect(5.6, -18.8, 1.8, 0.6); });
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
  cap(ctx, 0.4, -20.5, pal.hood, { tall: true });   // a knitted cap
  const bx = throwing ? 5 : 5.5, by = throwing ? -24 : -12;
  arm(ctx, -1.2, -15.6, bx - 2, by + 2, pal, { col: darken(pal.coat, 0.18), bend: throwing ? -1 : 1 });
  arm(ctx, 1.8, -15.6, bx - 1, by + 1, pal, { bend: throwing ? -1 : 1 });
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
  cap(ctx, 0.4, -20.5, pal.hood, { wide: true, tall: true, band: pal.trim });   // the broad hat
  // the gun, barrel out front
  part(ctx, (c) => {
    c.strokeStyle = "#5f4326"; c.lineWidth = 2.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(-1, -12.5); c.lineTo(4, -15); c.stroke();
    c.strokeStyle = "#6c727e"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(3, -15); c.lineTo(13, -16.5); c.stroke();
  });
  arm(ctx, 1.8, -15.6, 6, -15, pal);
  arm(ctx, -1.2, -15.6, 1.5, -13, pal, { col: darken(pal.coat, 0.1) });
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

// ---- the builders ------------------------------------------------------------
// The crew that sprints out of the castle gate to raise a new hall
// (builders.js bakes every frame once and stamps it). The same slim body in
// work clothes, posed limb by limb: two-bone legs that find the ground (a
// boot that pitches toe-up at the heel strike and toe-down at the push), the
// upper body leaning off the hip, two-bone arms. Three looks:
//   mason  — the cream coif and a long leather apron, a wooden mallet
//   hod    — a flat cap and a short canvas apron; carries a plank out on his
//            shoulder and hands the stone up the ladder
//   setter — a red knitted cap and a canvas bib apron; carries a dressed
//            block out in his arms and feeds the courses from the pile
// Poses (WORKER_POSES gives each one's frame count):
//   run (6)    lean forward, knees up, arms pumping; `o.load` carries the
//              plank / block out (the mason always has his mallet)
//   climb (4)  seen from behind on a ladder, hand over hand, mallet at the belt
//   hammer (3) raised, coming down, struck
//   hand (4)   a block lifted from the knees to the chest, overhead, let go
//   pick (4)   crouched reaching, crouched holding, up with it, tossed
//   jump (3)   crouched to spring, rising, falling
//   land (2)   squashed, rising out of it
//   cheer (2)  the tool held up high
//   stand (1)
// Feet at (x, y), facing +x (mirrored by dir). No ground shadow unless
// o.shadow: the builders stamp their own, so it stays on the ground in a
// jump and is left off in the water.
export const WORKER_POSES = { run: 6, climb: 4, hammer: 3, hand: 4, pick: 4, jump: 3, land: 2, cheer: 2, stand: 1 };
export const BUILDER_FOLK = {
  mason: { skin: "#e8b990", hood: "#e4d8b8", coat: "#8a7a5a", boots: "#3e2a1a", trim: "#5a4a3a", apron: "#9a643a" },
  hod: { skin: "#d9a47a", hood: "#6e5434", coat: "#9c8a60", boots: "#3a2818", trim: "#4a3a2a", apron: "#dcd0b4", hair: "#5a3a22" },
  setter: { skin: "#e8b990", hood: "#b04a38", coat: "#76684c", boots: "#3e2a1a", trim: "#4a3a2a", apron: "#d2c4a2", hair: "#a06a38" },
};
const WK = { wood: "#c49a5c", woodHi: "#e8c486", woodLo: "#94693a", stone: "#a19a8a", stoneHi: "#c8c0ac", haft: "#6a4a2e", maul: "#b4804a" };

const clampW = (v, a, b) => (v < a ? a : v > b ? b : v);
// two bones from a root to a target: the joint, bending toward +x (dir 1)
const joint2 = (ax, ay, bx, by, l1, l2, dir = 1) => {
  const dx = bx - ax, dy = by - ay, d = clampW(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const a = Math.atan2(dy, dx), k = Math.acos(clampW((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = a - dir * k;
  return [ax + Math.cos(j) * l1, ay + Math.sin(j) * l1];
};
// a boot about its ankle, pitched by `ang` (positive: toe down)
const BOOT = [[-1.1, -1.0], [0.8, -1.0], [2.2, 0.8, 1], [1.8, 1.4, 1], [-1.2, 1.4, 1]];
const bootAt = (ctx, ax, ay, ang, col) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  blob(ctx, BOOT.map(([x, y, k]) => (k ? [ax + x * c - y * s, ay + x * s + y * c, 1] : [ax + x * c - y * s, ay + x * s + y * c])), col, { hi: 0.35 });
};
const LEG1 = 3.9, LEG2 = 3.0;
const workLeg = (ctx, hx, hy, [ax, ay, ang], col, bootCol) => {
  const [kx, ky] = joint2(hx, hy, ax, ay, LEG1, LEG2, 1);
  limb(ctx, hx, hy, kx, ky, 2.7, col);
  limb(ctx, kx, ky, ax, ay, 2.3, col);
  bootAt(ctx, ax, ay, ang, bootCol);
};
// an arm from the shoulder to the hand: [hx, hy, bend (1 elbow down, -1
// up), ex, ey] — a raised arm names its elbow, so it lifts in front of the
// face rather than across it
const workArm = (ctx, sx, sy, [hx, hy, bend = 1, ex, ey], pal, col) => {
  if (ex === undefined) { arm(ctx, sx, sy, hx, hy, pal, { col, bend }); return; }
  limb(ctx, sx, sy, ex, ey, 2.4, col);
  limb(ctx, ex, ey, hx, hy, 2.2, col);
  hand(ctx, hx, hy, pal.skin);
};

// the tools and loads, in the upper body's frame
const malletAt = (ctx, hx, hy, ang) => part(ctx, (c) => {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const ex = hx + ca * 5.4, ey = hy + sa * 5.4;
  c.strokeStyle = WK.haft; c.lineWidth = 1.1; c.lineCap = "round";
  c.beginPath(); c.moveTo(hx - ca * 1.1, hy - sa * 1.1); c.lineTo(ex, ey); c.stroke();
  c.save(); c.translate(ex, ey); c.rotate(ang);
  c.fillStyle = lin(c, 0, -2.2, 0, 2.2, [[0, lighten(WK.maul, 0.38)], [0.5, WK.maul], [1, darken(WK.maul, 0.42)]]);
  roundRect(c, -1.2, -2.2, 3.0, 4.4, 0.7); c.fill();
  c.fillStyle = darken(WK.maul, 0.3); c.fillRect(-1.2, -2.2, 3.0, 0.6); c.fillRect(-1.2, 1.6, 3.0, 0.6);   // the end grain
  c.restore();
});
const plankAt = (ctx, x, y, a, len = 17) => part(ctx, (c) => {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = WK.wood; c.fillRect(-len / 2, -0.9, len, 1.9);
  c.fillStyle = WK.woodHi; c.fillRect(-len / 2, -0.9, len, 0.6);
  c.fillStyle = WK.woodLo; c.fillRect(-len / 2, 0.5, len, 0.5); c.fillRect(-len / 2, -0.9, 0.6, 1.9); c.fillRect(len / 2 - 0.6, -0.9, 0.6, 1.9);
  c.fillStyle = darken(WK.wood, 0.25); c.fillRect(-len / 2 + 5, -0.2, 2.2, 0.4); c.fillRect(len / 2 - 6, 0, 1.6, 0.4);   // grain
  c.restore();
});
export const drawBuilderBlock = (ctx, x, y) => part(ctx, (c) => {
  c.fillStyle = WK.stone; c.fillRect(x - 2.3, y - 1.8, 4.6, 3.6);
  c.fillStyle = WK.stoneHi; c.fillRect(x - 2.3, y - 1.8, 4.6, 1.1);
  c.fillStyle = darken(WK.stone, 0.3); c.fillRect(x + 1.5, y - 0.7, 0.8, 2.5);
  c.fillStyle = darken(WK.stone, 0.15); c.fillRect(x - 1.4, y + 0.2, 1.2, 0.4);   // a tool mark
});
// the apron over the torso: a long bib (mason, setter) or a short waist one
// (hod); `flap` blows its hem back on the run
const apronOn = (ctx, pal, look, flap) => {
  const col = pal.apron, f = flap * 1.8;
  if (look === "hod") {
    blob(ctx, [[-0.5, -3.1, 1], [3.3, -3.1, 1], [3.8 - f, 2.6 - f * 0.25, 1], [-0.7 - f, 2.9 - f * 0.2, 1]], col, {
      hi: 0.25, lo: 0.3, then: (c) => { dab(c, -1, -3.2, 5, 0.6, darken(col, 0.3)); dab(c, 1.2 - f * 0.4, -1.2, 0.5, 3.5, darken(col, 0.18)); },
    });
    return;
  }
  blob(ctx, [[0.0, -7.7, 1], [2.9, -7.7, 1], [3.3, -3.4], [3.9 - f, 3.3 - f * 0.35, 1], [-0.9 - f, 3.5 - f * 0.25, 1], [-0.5, -3.4]], col, {
    hi: 0.28, lo: 0.36, then: (c) => {
      dab(c, -3.6, -3.0, 7.5, 0.6, darken(col, 0.35));                                  // the waist tie
      dab(c, 0.6, -1.4, 2.2, 1.6, darken(col, 0.2)); dab(c, 0.6, -1.4, 2.2, 0.4, darken(col, 0.4));   // a pocket
      if (look === "mason") dab(c, 1.0 - f * 0.3, 1.2, 0.5, 2.0, lighten(col, 0.2));   // a scuffed crease
    },
  });
  part(ctx, (c) => { c.strokeStyle = darken(col, 0.3); c.lineWidth = 0.55; c.beginPath(); c.moveTo(0.3, -7.6); c.lineTo(1.0, -9.6); c.stroke(); });   // the neck strap
};
// the head and its cap, in the upper body's frame (neck at 0.3, -10.5)
const workHead = (ctx, pal, look, tilt) => {
  ctx.save();
  ctx.translate(0.3, -10.5); ctx.rotate(tilt); ctx.translate(-0.3, 10.5);
  if (look === "mason") head(ctx, 0.4, -12.7, pal, { hood: true });
  else {
    head(ctx, 0.4, -12.7, pal, { hood: false });
    if (look === "hod") cap(ctx, 0.4, -12.7, pal.hood, { band: darken(pal.hood, 0.35) });
    else cap(ctx, 0.4, -12.7, pal.hood, { tall: true, band: lighten(pal.hood, 0.3) });
  }
  ctx.restore();
};

// One posed figure. S: { hip: [x, y], lean, tilt, legs: [near, far] as
// [ankleX, ankleY, bootAngle] in foot space, hands: [near, far] as [x, y,
// bend] in the upper body's frame (origin at the hip, turned by lean),
// mallet: angle | null (in the near hand), load: { kind, x, y, a } | null,
// flap }.
const SH_N = [0.9, -8.6], SH_F = [-1.0, -8.8];
const workerBody = (ctx, pal, look, S) => {
  const [hx, hy] = S.hip;
  const farC = darken(pal.coat, 0.2);
  const up = (fn) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(S.lean || 0); fn(); ctx.restore(); };
  // the far arm, behind everything
  up(() => workArm(ctx, SH_F[0], SH_F[1], S.hands[1], pal, farC));
  workLeg(ctx, hx - 0.5, hy, S.legs[1], darken(pal.boots, 0.14), darken(pal.boots, 0.28));
  workLeg(ctx, hx + 0.5, hy, S.legs[0], pal.boots, darken(pal.boots, 0.18));
  up(() => {
    torso(ctx, 0, -9.2, 10, 7, pal);
    apronOn(ctx, pal, look, S.flap || 0);
    const L = S.load;
    if (L && L.kind === "plank") plankAt(ctx, L.x, L.y, L.a || 0, L.len || 17);
    workHead(ctx, pal, look, S.tilt || 0);
    if (L && L.kind === "block") drawBuilderBlock(ctx, L.x, L.y);
    if (S.mallet != null) malletAt(ctx, S.hands[0][0], S.hands[0][1], S.mallet);
    workArm(ctx, SH_N[0], SH_N[1], S.hands[0], pal, pal.coat);
    if (S.open) { dab(ctx, S.hands[0][0] + 0.4, S.hands[0][1] - 2.0, 0.6, 1.0, pal.skin); dab(ctx, S.hands[0][0] - 0.8, S.hands[0][1] - 1.9, 0.6, 1.0, pal.skin); }
  });
};

// ---- the poses ----
// the run: contact, down, push-and-knee-up, then the same on the other leg
const RUN_LEGS = [
  [0.0, -7.0, [3.6, -1.2, -0.35], [-3.8, -3.0, 0.7]],
  [0.2, -6.5, [0.8, -1.2, 0.0], [-2.2, -5.0, 0.95]],
  [0.5, -7.9, [-3.0, -2.0, 0.8], [3.4, -4.9, -0.1]],
];
const RUN_ARMS = [
  [[-3.0, -4.4, -1], [4.2, -10.2, 1]],
  [[-1.2, -5.0, -1], [2.8, -8.6, 1]],
  [[2.6, -8.6, 1], [-1.6, -5.2, -1]],
  [[4.2, -10.2, 1], [-3.0, -4.4, -1]],
  [[2.8, -8.6, 1], [-1.2, -5.0, -1]],
  [[-1.6, -5.2, -1], [2.6, -8.6, 1]],
];
const runPose = (look, f, load) => {
  const [hx, hy, a, b] = RUN_LEGS[f % 3];
  const legs = f < 3 ? [a, b] : [b, a];
  let hands = RUN_ARMS[f], lean = 0.3, mallet = null, L = null;
  const bob = f % 3 === 1 ? 0.15 : 0;
  if (look === "mason") {
    // the mallet pumps with the near arm, head up when it swings forward
    mallet = [2.5, 2.0, -0.5, -1.1, -0.9, 1.2][f];
  } else if (load && look === "hod") {
    // the plank on the near shoulder, steadied by the near hand
    hands = [[2.6, -9.2, 1, 2.4, -5.4], RUN_ARMS[f][1]];
    L = { kind: "plank", x: 0.4, y: -9.0 + bob, a: -0.06 };
    lean = 0.16;
  } else if (load && look === "setter") {
    // the block hugged to the belly, both arms round it
    hands = [[3.0, -4.6 + bob, 1], [4.6, -5.8 + bob, 1]];
    L = { kind: "block", x: 3.8, y: -5.0 + bob };
    lean = 0.12;
  }
  return { hip: [hx, hy], lean, tilt: -lean * 0.55, legs, hands, mallet, load: L, flap: 1 };
};
const STAND_LEGS = [[1.5, -1.2, 0], [-1.3, -1.2, 0]];
const workerPose = (look, pose, f, load) => {
  const mason = look === "mason";
  switch (pose) {
    case "run": return runPose(look, f, load);
    case "hammer": {
      const K = [
        { hip: [-0.3, -7.6], lean: -0.12, hands: [[3.4, -17.4, -1, 5.4, -12.4], [3.2, -4.6, 1]], mallet: -2.7 },
        { hip: [0.0, -7.5], lean: 0.08, hands: [[6.4, -12.8, -1, 4.6, -10.0], [3.4, -5.0, 1]], mallet: -0.95 },
        { hip: [0.3, -7.0], lean: 0.3, hands: [[6.0, -5.2, 1, 3.8, -6.0], [2.8, -4.6, 1]], mallet: 0.45 },
      ][f];
      return { ...K, tilt: -K.lean * 0.4, legs: [[2.8, -1.2, 0], [-2.4, -1.2, 0]] };
    }
    case "hand": {
      const blk = f < 3;
      const K = [
        { hip: [-0.6, -5.6], lean: 0.5, hands: [[4.0, -2.4, 1], [5.2, -3.0, 1]], load: { kind: "block", x: 4.8, y: -2.2 }, legs: [[2.4, -1.2, 0], [-2.2, -1.2, 0.15]] },
        { hip: [-0.2, -7.3], lean: 0.1, hands: [[3.2, -7.2, 1], [4.4, -7.8, 1]], load: { kind: "block", x: 4.0, y: -7.6 }, legs: STAND_LEGS },
        { hip: [0.0, -8.0], lean: -0.18, hands: [[4.8, -17.0, -1, 5.0, -12.2], [3.4, -17.6, -1, 3.0, -12.6]], load: { kind: "block", x: 4.2, y: -19.2 }, legs: [[1.8, -1.7, 0.35], [-1.2, -1.6, 0.35]] },
        { hip: [0.0, -8.0], lean: -0.14, hands: [[5.2, -17.8, -1, 5.1, -12.6], [3.8, -18.2, -1, 3.2, -12.8]], load: null, open: true, legs: [[1.8, -1.7, 0.35], [-1.2, -1.6, 0.35]] },
      ][f];
      if (!blk) K.load = null;
      return { tilt: -K.lean * 0.3, ...K };
    }
    case "pick": {
      const K = [
        { hip: [-1.0, -5.2], lean: 0.62, hands: [[4.4, -0.6, 1], [5.4, -1.0, 1]], load: null, legs: [[2.4, -1.2, 0], [-2.4, -1.2, 0.2]] },
        { hip: [-1.0, -5.4], lean: 0.55, hands: [[4.0, -1.8, 1], [5.2, -2.4, 1]], load: { kind: "block", x: 4.8, y: -1.4 }, legs: [[2.4, -1.2, 0], [-2.4, -1.2, 0.2]] },
        { hip: [0.0, -7.7], lean: 0.06, hands: [[3.0, -5.8, 1], [4.4, -6.4, 1]], load: { kind: "block", x: 3.8, y: -6.2 }, legs: STAND_LEGS },
        { hip: [0.4, -7.5], lean: 0.22, hands: [[6.2, -10.6, 1], [5.6, -11.2, 1]], load: null, open: true, legs: [[2.8, -1.2, 0], [-2.2, -1.4, 0.3]] },
      ][f];
      return { tilt: -K.lean * 0.5, ...K };
    }
    case "jump": {
      const K = [
        { hip: [-0.4, -5.2], lean: 0.4, hands: [[-3.4, -3.2, -1], [-2.8, -2.6, -1]], mallet: 2.3, legs: [[2.0, -1.2, 0], [-1.6, -1.2, 0.2]] },
        { hip: [0.0, -8.6], lean: 0.02, hands: [[4.8, -16.6, -1, 4.8, -11.8], [-3.6, -15.4, -1, -3.8, -11.0]], mallet: -1.9, legs: [[2.4, -3.4, -0.2], [-1.4, -4.4, 0.5]] },
        { hip: [0.0, -8.3], lean: -0.04, hands: [[6.2, -13.8, -1, 4.8, -10.4], [-4.8, -13.2, -1, -3.8, -10.0]], mallet: -1.4, legs: [[1.4, -0.9, 0.35], [-1.3, -0.7, 0.45]] },
      ][f];
      return { tilt: 0, flap: f === 2 ? -0.5 : 0.3, ...K, mallet: mason ? K.mallet : null };
    }
    case "land": {
      const K = [
        { hip: [0.4, -4.4], lean: 0.5, hands: [[4.8, -4.4, 1], [-2.6, -3.6, -1]], mallet: 0.2, legs: [[2.7, -1.2, 0], [-2.5, -1.2, 0]] },
        { hip: [0.2, -6.4], lean: 0.22, hands: [[3.4, -4.8, 1], [-2.4, -4.2, -1]], mallet: 0.6, legs: [[2.5, -1.2, 0], [-2.3, -1.2, 0]] },
      ][f];
      return { tilt: -K.lean * 0.5, flap: 0.2, ...K, mallet: mason ? K.mallet : null };
    }
    case "cheer": {
      const hip = f ? [0, -8.2] : [0, -7.8];
      return { hip, lean: -0.06, tilt: -0.15, legs: f ? [[1.5, -1.6, 0.3], [-1.3, -1.6, 0.3]] : STAND_LEGS,
        hands: [[4.8, -18.2 - f * 0.6, -1, 5.0, -12.6], [-3.2, -15.8 - f, -1, -3.6, -11.6]], mallet: mason ? -1.75 : null, open: !mason };
    }
    default:
      return { hip: [0, -7.8], lean: 0.02, legs: STAND_LEGS, hands: [[2.6, -0.9, 1], [-2.4, -1.0, 1]], mallet: mason ? 1.35 : null };
  }
};

// The climb, seen from behind: hand over hand up a ladder facing us.
const workerClimb = (ctx, pal, look, f) => {
  const side = f < 2 ? 1 : -1;                       // which foot is up
  const mid = f % 2 === 1;
  const footUp = mid ? -1.6 : -3.2, handUp = mid ? -21.8 : -23.0;
  const legC = pal.boots, farLeg = darken(pal.boots, 0.12);
  // legs: one boot on the rung, the other lifted to the next
  for (const s of [-1, 1]) {
    const up = s === side, fx = s * 1.4, fy = up ? footUp : 0;
    const kx = s * 2.0, ky = up ? fy - 3.6 : -3.9;
    limb(ctx, s * 1.1, -7.8, kx, ky, 2.7, up ? legC : farLeg);
    limb(ctx, kx, ky, fx, fy - 1.0, 2.3, up ? legC : farLeg);
    blob(ctx, [[fx - 1.2, fy - 1.6], [fx + 1.2, fy - 1.6], [fx + 1.3, fy + 0.3, 1], [fx - 1.3, fy + 0.3, 1]], darken(pal.boots, 0.2), { hi: 0.3 });
  }
  // the back of the jerkin, the belt, the apron's bow
  blob(ctx, [[-3.5, -16.8], [0, -17.4], [3.5, -16.8], [3.9, -11], [3.5, -5.6, 1], [-3.5, -5.6, 1], [-3.9, -11]], pal.coat, {
    hi: 0.25, lo: 0.4, then: (c) => {
      dab(c, -4, -10.4, 8, 1.2, darken(pal.trim, 0.1));
      dab(c, -4, -6.4, 8, 0.8, darken(pal.coat, 0.4));
      dab(c, -0.2, -15.6, 0.5, 5, darken(pal.coat, 0.3));                              // the back seam
      if (look !== "hod") { dab(c, -4, -16.2, 1.2, 6, darken(pal.apron, 0.2)); dab(c, 2.9, -16.2, 1.2, 6, darken(pal.apron, 0.2)); }   // the bib's straps
    },
  });
  blob(ctx, [[-1.0, -11.0, 1], [1.0, -11.0, 1], [1.4, -9.0, 1], [0, -9.8], [-1.4, -9.0, 1]], darken(pal.apron, 0.12), { hi: 0.3 });   // the apron's knot
  if (look === "mason") {
    // the mallet stuck through the belt while his hands are on the rungs
    part(ctx, (c) => { c.strokeStyle = WK.haft; c.lineWidth = 1; c.beginPath(); c.moveTo(3.0, -12.0); c.lineTo(3.8, -6.8); c.stroke(); });
    blob(ctx, [[2.3, -7.4, 1], [5.4, -7.8, 1], [5.6, -5.4, 1], [2.5, -5.0, 1]], WK.maul, { hi: 0.35 });
  }
  // the head from behind: the neck, the ears, the coif or the hair and cap
  dab(ctx, -1, -18.2, 2, 1.2, darken(pal.skin, 0.25));
  const hy = -20.8;
  if (look === "mason") {
    blob(ctx, [[-2.7, hy + 2.6, 1], [-3.0, hy], [-2.3, hy - 2.8], [0, hy - 3.5], [2.3, hy - 2.8], [3.0, hy], [2.7, hy + 2.6, 1]], pal.hood, {
      hi: 0.3, lo: 0.42, then: (c) => { dab(c, -0.2, hy - 3.4, 0.5, 4.4, darken(pal.hood, 0.3)); dab(c, -3, hy + 1.4, 6, 0.7, darken(pal.hood, 0.35)); },
    });
    blob(ctx, [[-0.9, hy + 1.2], [0.9, hy + 1.2], [0.6, hy + 3.4, 1], [-0.6, hy + 3.4, 1]], darken(pal.hood, 0.12), { hi: 0.2 });   // the tie at the nape
  } else {
    dab(ctx, -2.9, hy - 0.8, 1, 1.4, pal.skin); dab(ctx, 1.9, hy - 0.8, 1, 1.4, pal.skin);    // the ears
    blob(ctx, [[-2.3, hy + 1.8], [-2.5, hy - 1.2], [-1.3, hy - 2.7], [1.3, hy - 2.7], [2.5, hy - 1.2], [2.3, hy + 1.8], [0, hy + 2.5]], pal.hair, { hi: 0.25 });
    const tall = look === "setter";
    blob(ctx, [[-2.7, hy - 1.2, 1], [2.7, hy - 1.2, 1], [2.3, hy - 3.2], [0, hy - (tall ? 5.4 : 4.2)], [-2.3, hy - 3.2]], pal.hood, {
      hi: 0.3, then: (c) => dab(c, -3, hy - 2.1, 6, 0.8, tall ? lighten(pal.hood, 0.3) : darken(pal.hood, 0.35)),
    });
  }
  // arms up to the rails either side of the head, one reaching higher
  for (const s of [-1, 1]) {
    const hi = s === -side;
    const hx = s * 3.4, hy2 = hi ? handUp : handUp + 2.6, ex = s * 4.6, ey = hi ? -19.8 : -18.6;
    limb(ctx, s * 3.0, -16.2, ex, ey, 2.4, s < 0 ? darken(pal.coat, 0.1) : pal.coat);
    limb(ctx, ex, ey, hx, hy2, 2.2, s < 0 ? darken(pal.coat, 0.1) : pal.coat);
    hand(ctx, hx, hy2, pal.skin);
  }
};

export const drawWorker = (ctx, x, y, dir, pal, pose, frame = 0, o = {}) => {
  const look = o.look || "mason";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  if (o.shadow) shadow(ctx, 1, 0.4, 4.6, 1.6, 0.3);
  if (pose === "climb") workerClimb(ctx, pal, look, frame % 4);
  else workerBody(ctx, pal, look, workerPose(look, pose, frame % (WORKER_POSES[pose] || 1), !!o.load));
  ctx.restore();
};
