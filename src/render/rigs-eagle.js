// ============ RIGS: THE SKYKNIGHT'S WAR-EAGLE ============
// The Falconry's Skyknight form: the eagle and its rider, painted as one
// rig ("eagle" in rigs.js RIGS). Split out of rigs.js (pixel-identical);
// draw.js flies it (the eagle's state is update.js t.eagle).

import { lighten, darken, rgba, shadow, ball, lin, part } from "./paint.js";
import { limb, lit, eye } from "./rigs.js";

// The Skyknight's war-eagle: a great white-headed eagle in flight, a knight
// in the saddle between its shoulders with a pennoned lance. Faces +x; the
// anchor is under its tucked feet (the ground shadow is draw.js's). "walk"
// is the wingbeat (0 up, 1 level, 2 down, 3 rising); "fight" throws the
// talons forward (0 wind-up, 1 strike). The rider always sits in front of
// the near wing so he is never hidden by it.
export const eagle = (ctx, p) => {
  const s = (p.len ?? 34) / 34;
  const P = (x, y) => [x * s, y * s];
  const fight = p.pose === "fight";
  const f = (p.frame || 0) % (fight ? 2 : 4);
  const bob = fight ? (f ? 0.5 : -1) : [0.8, 0, -1.2, -0.4][f];
  const Y = -9 + bob;                                   // body centre, above the anchor
  const col = p.col, wingC = p.wing, head = p.head || "#f0ead8", tailC = p.tail || "#ece4d2";
  const beakC = p.beak || "#e8b840", footC = p.foot || "#e8b840";
  const r = p.rider || {};
  // wings: shoulder, wrist, tip, trailing root, as (x, y) from the body centre
  const W = fight
    ? (f === 0
      ? { far: [[-1, -6], [-2, -20], [-12, -33], [-9, -4]], near: [[-2, -4], [-6, -17], [-19, -28], [-10, -2]] }
      : { far: [[-1, -6], [1, -18], [-8, -32], [-9, -4]], near: [[-2, -4], [-1, -15], [-13, -28], [-10, -2]] })
    : [
      { far: [[-1, -6], [-5, -19], [-17, -32], [-9, -4]], near: [[-2, -4], [-8, -16], [-23, -25], [-10, -2]] },
      { far: [[-1, -6], [-3, -15], [-16, -24], [-9, -4]], near: [[-1, 0], [-3, 8], [-15, 15], [-9, 1]] },
      { far: [[-2, -4], [-6, -1], [-15, 5], [-9, -2]], near: [[0, 1], [1, 9], [-8, 17], [-8, 2]] },
      { far: [[-1, -6], [-4, -17], [-18, -27], [-9, -4]], near: [[-1, 0], [-4, 6], [-17, 12], [-9, 1]] },
    ][f];
  const at = ([x, y]) => P(x, Y + y);
  const wingOf = ([S0, W0, T0, R0], far) => {
    const [sx, sy] = at(S0), [wx, wy] = at(W0), [tx, ty] = at(T0), [rx, ry] = at(R0);
    const base = far ? darken(wingC, 0.28) : wingC;
    const dx = tx - wx, dy = ty - wy, dl = Math.hypot(dx, dy) || 1;
    let nx = -dy / dl, ny = dx / dl;                    // across the hand, toward the trailing edge
    if (nx * (rx - wx) + ny * (ry - wy) < 0) { nx = -nx; ny = -ny; }
    const angT = Math.atan2(dy, dx), angN = Math.atan2(ny, nx);
    // one flight feather: a long tapered blade from (bx, by) along `ang`
    const feather = (c, bx, by, ang, len, w) => {
      const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
      c.beginPath();
      c.moveTo(bx + px * w / 2, by + py * w / 2);
      c.quadraticCurveTo(bx + ux * len * 0.7 + px * w * 0.55, by + uy * len * 0.7 + py * w * 0.55, bx + ux * len, by + uy * len);
      c.quadraticCurveTo(bx + ux * len * 0.7 - px * w * 0.45, by + uy * len * 0.7 - py * w * 0.45, bx - px * w / 2, by - py * w / 2);
      c.closePath(); c.fill();
    };
    // the fingered primaries, fanned from the hand toward the tip
    part(ctx, (c) => {
      for (let i = 4; i >= 0; i--) {
        const k = i / 4, bx = wx + dx * 0.12 * k + nx * k * 2.2 * s, by = wy + dy * 0.12 * k + ny * k * 2.2 * s;
        const ang = angT + (angN - angT > Math.PI ? angN - angT - Math.PI * 2 : angN - angT < -Math.PI ? angN - angT + Math.PI * 2 : angN - angT) * k * 0.42;
        c.fillStyle = i % 2 ? darken(base, 0.5) : darken(base, 0.4);
        feather(c, bx, by, ang, dl * (1 - k * 0.22), 2.8 * s);
      }
    });
    // the secondaries along the arm's trailing edge, pale-tipped
    part(ctx, (c) => {
      for (let i = 0; i < 5; i++) {
        const k = (i + 0.5) / 5;
        const bx = sx + (wx - sx) * k + (rx - sx) * (1 - k) * 0.6, by = sy + (wy - sy) * k + (ry - sy) * (1 - k) * 0.6;
        const ang = angN - (angN - angT > Math.PI ? angN - angT - Math.PI * 2 : angN - angT < -Math.PI ? angN - angT + Math.PI * 2 : angN - angT) * 0.28;
        c.fillStyle = i % 2 ? darken(base, 0.3) : darken(base, 0.22);
        feather(c, bx, by, ang, 6.5 * s, 3.2 * s);
      }
    });
    // the coverts: the lit shoulder of the wing, over the feathers' roots
    part(ctx, (c) => {
      const hx = wx + dx * 0.2, hy = wy + dy * 0.2;
      c.beginPath(); c.moveTo(sx, sy);
      c.quadraticCurveTo((sx + wx) / 2 - nx * 1.6 * s, (sy + wy) / 2 - ny * 1.6 * s, wx, wy);
      c.lineTo(hx, hy); c.lineTo(hx + nx * 2.4 * s, hy + ny * 2.4 * s);
      c.quadraticCurveTo((wx + rx) / 2 + nx * 1.2 * s, (wy + ry) / 2 + ny * 1.2 * s, rx, ry);
      c.closePath();
      c.fillStyle = lin(c, wx - nx * s, wy - ny * s, wx + nx * 4 * s, wy + ny * 4 * s, [[0, lighten(base, far ? 0.15 : 0.35)], [0.5, base], [1, darken(base, 0.2)]]);
      c.fill();
      c.fillStyle = rgba(lighten(base, 0.5), far ? 0.3 : 0.6);
      for (let i = 1; i < 4; i++) { const k = i / 4; c.fillRect(sx + (wx - sx) * k + nx * 1.6 * s, sy + (wy - sy) * k + ny * 1.6 * s, 1, 1); }
    });
  };

  // far wing, behind everything
  wingOf(W.far, true);
  // the white tail, fanned
  part(ctx, (c) => {
    const [ax, ay] = at([-8, -2]), [bx, by] = at([-8, 2]);
    const fan = fight ? 5 : 3.5;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(...at([-20, -fan - 1])); c.lineTo(...at([-22, 0])); c.lineTo(...at([-20, fan + 1])); c.lineTo(bx, by); c.closePath();
    c.fillStyle = lin(c, 0, ay - fan * s, 0, by + fan * s, [[0, lighten(tailC, 0.3)], [0.5, tailC], [1, darken(tailC, 0.3)]]); c.fill();
    c.strokeStyle = rgba(darken(tailC, 0.4), 0.7); c.lineWidth = 0.8;
    for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(...at([-11, k * 2])); c.lineTo(...at([-20.5, k * fan * 1.6])); c.stroke(); }
  });
  // feet: tucked back under the tail in flight, thrown forward to strike
  const foot = (x0, y0, x1, y1, open) => {
    const [ax, ay] = at([x0, y0]), [fx, fy] = at([x1, y1]);
    // a feathered thigh, a short scaled shank, and a hand of hooked talons
    part(ctx, (c) => ball(c, ax, ay, 2.6 * s, 2.2 * s, darken(col, 0.15), { hi: 0.3, lo: 0.4 }));
    limb(ctx, ax + (fx - ax) * 0.3, ay + (fy - ay) * 0.3, fx, fy, 1.8 * s, footC);
    part(ctx, (c) => {
      c.strokeStyle = footC; c.lineWidth = 1.2 * s; c.lineCap = "round";
      const toes = open ? [[2.4, -1.4], [2.8, 0.4], [1.6, 2.0], [-1.4, 1.2]] : [[1.4, 0.9], [0.3, 1.5], [-1, 1.2]];
      for (const [tx, ty] of toes) { c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + tx * s, fy + ty * s); c.stroke(); }
      c.fillStyle = "#2a2230";
      for (const [tx, ty] of toes) { const l = Math.hypot(tx, ty); c.fillRect(fx + tx * s + tx / l * 0.6 * s - 0.5, fy + ty * s + ty / l * 0.6 * s - 0.5, 1, 1); }
    });
  };
  if (!fight) { foot(-3, 3, -9, 5.5, false); }
  // the body: a deep brown barrel, darker underneath
  part(ctx, (c) => ball(c, ...at([0, 0]), 11.5 * s, 5.8 * s, col, { hi: 0.4, lo: 0.5 }));
  part(ctx, (c) => ball(c, ...at([-3, 3.2]), 5 * s, 2.6 * s, darken(col, 0.2), { hi: 0.2, lo: 0.4 }));   // feathered thighs
  if (fight) { foot(0, 4, f ? 8 : 5.5, f ? 9 : 8.5, true); foot(3.5, 3, f ? 10.5 : 8, f ? 6.5 : 7, true); }
  // war tack: a crown-blue saddlecloth with a gold hem, a breast strap
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(...at([-6, -5.4])); c.lineTo(...at([5, -5.6])); c.lineTo(...at([4, 0.5])); c.lineTo(...at([-5, 0.5])); c.closePath();
    c.fillStyle = lin(c, 0, (Y - 6) * s, 0, (Y + 1) * s, [[0, lighten(r.saddle || "#3a5474", 0.3)], [0.5, r.saddle || "#3a5474"], [1, darken(r.saddle || "#3a5474", 0.35)]]); c.fill();
    c.fillStyle = r.cloth2 || "#d8b34a"; c.fillRect(...at([-5, 0]), 9 * s, 1 * s);
    c.strokeStyle = "#4a3020"; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(...at([4.5, -3])); c.lineTo(...at([9, 1])); c.stroke();
  });
  // neck, the white head, the hooked gold beak
  part(ctx, (c) => ball(c, ...at([9, -3.2]), 5 * s, 4.4 * s, head, { hi: 0.3, lo: 0.35 }));
  part(ctx, (c) => {
    const hx = 13, hy = -6.4;
    ball(c, ...at([hx, hy]), 4.4 * s, 3.6 * s, head, { hi: 0.4, lo: 0.35 });
    c.beginPath();
    c.moveTo(...at([hx + 2.4, hy - 1.8])); c.quadraticCurveTo(...at([hx + 6.6, hy - 2.2]), ...at([hx + 7.4, hy + 0.6]));
    c.lineTo(...at([hx + 6.6, hy + 2.4])); c.lineTo(...at([hx + 6, hy + 1])); c.lineTo(...at([hx + 3, hy + 1.6])); c.closePath();
    c.fillStyle = lin(c, 0, (Y + hy - 2) * s, 0, (Y + hy + 2.4) * s, [[0, lighten(beakC, 0.35)], [0.5, beakC], [1, darken(beakC, 0.4)]]); c.fill();
    c.fillStyle = "#6a4a2a"; c.fillRect(...at([hx + 3.2, hy + 0.4]), 3 * s, 0.8);   // the gape
  });
  // a fierce eye under a heavy brow
  eye(ctx, ...at([14.6, -7.1]), "#e8a030", 1.1 * s);
  eye(ctx, ...at([15, -7.1]), "#2a2230", 0.55 * s);
  ctx.fillStyle = "#4a4050"; ctx.fillRect(...at([13, -9]), 3.8 * s, 1.1 * s);

  // near wing, then the knight over it
  wingOf(W.near, false);

  const skin = r.skin || "#e8b990", cloth = r.cloth || "#3a5474", steel = r.steel || "#b8bcc4";
  const cape = r.cape || "#a0303a", plume = r.plume || "#e8e2d0", wcol = r.wcol || "#dde2ea";
  const flut = [0, 1, 2, 1][fight ? 1 : f];
  // his cape streams back over the eagle's back
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(...at([0, -15])); c.quadraticCurveTo(...at([-6, -15 + flut]), ...at([-11, -11 + flut]));
    c.lineTo(...at([-8, -8 + flut * 0.5])); c.lineTo(...at([-3, -8])); c.lineTo(...at([1, -12])); c.closePath();
    c.fillStyle = lin(c, 0, (Y - 15) * s, 0, (Y - 8) * s, [[0, lighten(cape, 0.25)], [0.5, cape], [1, darken(cape, 0.35)]]); c.fill();
  });
  // seated: thigh forward along the saddle, boot in the stirrup
  limb(ctx, ...at([1, -6.5]), ...at([5.5, -4]), 2.8 * s, darken(steel, 0.15));
  limb(ctx, ...at([5.5, -4]), ...at([4.5, 0]), 2.2 * s, darken(steel, 0.25));
  part(ctx, (c) => { c.fillStyle = "#4a3020"; c.fillRect(...at([3.6, -0.6]), 2.6 * s, 1.4 * s); });
  // the far arm on the reins
  limb(ctx, ...at([2.5, -13]), ...at([6.5, -9.5]), 1.8 * s, darken(steel, 0.3));
  ctx.strokeStyle = "#4a3020"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(...at([6.5, -9.5])); ctx.quadraticCurveTo(...at([11, -8]), ...at([15.5, -5])); ctx.stroke();
  // torso: mail under a crown-blue tabard, a gold belt
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(...at([-0.4, -16])); c.lineTo(...at([4.6, -16])); c.lineTo(...at([4.2, -6])); c.lineTo(...at([-0.2, -6])); c.closePath();
    c.fillStyle = lit(c, 2.2 * s, 5 * s, cloth); c.fill();
    c.fillStyle = steel; c.fillRect(...at([-0.2, -16.2]), 4.8 * s, 1.6 * s);      // mail at the shoulders
    c.fillStyle = r.cloth2 || "#d8b34a"; c.fillRect(...at([-0.2, -8.2]), 4.4 * s, 1 * s);
    c.fillRect(...at([1.7, -14.4]), 0.9 * s, 5.4 * s);                             // a gold stripe down the tabard
  });
  // head: a face under a round steel helm with a nasal and a plume
  const [hx, hy] = at([2.6, -18.6]);
  part(ctx, (c) => ball(c, hx + 0.3 * s, hy + 0.3 * s, 2.3 * s, 2.5 * s, skin, { hi: 0.4, lo: 0.4 }));
  eye(ctx, hx + 1.5 * s, hy + 0.1 * s, "#2a2230", 0.5 * s);
  part(ctx, (c) => {
    c.beginPath(); c.ellipse(hx, hy - 0.6 * s, 2.8 * s, 2.4 * s, 0, Math.PI * 0.95, Math.PI * 2.05); c.closePath();
    c.fillStyle = lit(c, hx, 5.6 * s, steel); c.fill();
    c.fillRect(hx - 2.8 * s, hy - 0.8 * s, 1.6 * s, 3 * s);                        // the neck guard
    c.fillStyle = darken(steel, 0.2); c.fillRect(hx + 1.6 * s, hy - 0.8 * s, 0.9 * s, 2.4 * s);   // nasal
  });
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(hx - 0.4 * s, hy - 2.8 * s);
    c.quadraticCurveTo(hx - 2.5 * s, hy - 5.8 * s, hx - 6 * s, hy - 3.6 * s + flut * 0.5 * s);
    c.quadraticCurveTo(hx - 3 * s, hy - 3.6 * s, hx - 1.8 * s, hy - 2 * s); c.closePath();
    c.fillStyle = plume; c.fill();
  });
  // the lance, pennon flying, held in the near hand
  const la = fight ? (f ? 0.08 : -0.6) : -0.5 + [0, 0.03, 0.06, 0.03][f];
  const [hdx, hdy] = at([fight && f ? 8.5 : 7.5, fight && f ? -11 : -11.5]);
  limb(ctx, ...at([3.4, -14.6]), ...at([5.4, -11.6]), 2 * s, steel);
  limb(ctx, ...at([5.4, -11.6]), hdx, hdy, 1.8 * s, steel);
  const ca = Math.cos(la), sa = Math.sin(la);
  part(ctx, (c) => {
    c.lineCap = "round";
    c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4 * s;
    c.beginPath(); c.moveTo(hdx - ca * 9 * s, hdy - sa * 9 * s); c.lineTo(hdx + ca * 15 * s, hdy + sa * 15 * s); c.stroke();
    const tx = hdx + ca * 15 * s, ty = hdy + sa * 15 * s;
    c.fillStyle = wcol; c.beginPath(); c.moveTo(tx + ca * 4 * s, ty + sa * 4 * s); c.lineTo(tx - sa * 1.4 * s, ty + ca * 1.4 * s); c.lineTo(tx + sa * 1.4 * s, ty - ca * 1.4 * s); c.closePath(); c.fill();
    // a swallow-tailed pennon behind the head
    const px = hdx + ca * 12 * s, py = hdy + sa * 12 * s, wv = [0, 0.8, 1.4, 0.8][fight ? 2 : f] * s;
    c.fillStyle = cape; c.beginPath(); c.moveTo(px, py); c.lineTo(px - ca * 6 * s + 1.2 * s, py - sa * 6 * s - 1.2 * s + wv);
    c.lineTo(px - ca * 4.6 * s + 1.6 * s, py - sa * 4.6 * s + 0.6 * s + wv * 0.5); c.lineTo(px - ca * 6.2 * s + 2.8 * s, py - sa * 6.2 * s + 1.4 * s + wv);
    c.lineTo(px - ca * 1.5 * s + 2.4 * s, py - sa * 1.5 * s + 2.2 * s); c.closePath(); c.fill();
    c.fillStyle = r.cloth2 || "#d8b34a"; c.fillRect(px - 0.4, py - 0.4, 1.2 * s, 1.2 * s);
  });
  ball(ctx, hdx, hdy, 1.3 * s, 1.3 * s, darken(steel, 0.1), { hi: 0.4, lo: 0.4 });
};
