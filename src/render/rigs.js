// ============ RIGS ============
// Every creature on the road, and every soldier on the field, built from
// parts at the pixel density of the new art: a biped (goblins, men, bones),
// a beast on four legs (wolves, boars, horses, ghouls), and a handful of
// odd bodies — bats, wraiths, gryphons, the dragon, the siege ram, the
// amalgam, a skiff. Each rig paints one pose facing +x with its feet at the
// anchor; frames are baked once into inked sprites and stamped mirrored.
//
// Sheets: "walk" (4 frames), "fight" (2 frames), and for fliers "fly" (4).

import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, blobBall, lin, part, bakeSprite, PX, hash,
} from "./paint.js";

// ---- shared bits -----------------------------------------------------------
const limb = (ctx, x0, y0, x1, y1, w, col) => part(ctx, (c) => {
  c.strokeStyle = lin(c, x0 - w, y0, x0 + w, y0, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
  c.lineWidth = w; c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
});
const lit = (ctx, x0, w, col) => lin(ctx, x0 - w / 2, 0, x0 + w / 2, 0, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
const eye = (ctx, x, y, col = "#2a2230", r = 0.6) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2); ctx.fill(); };

// the walk cycle: leg and arm swing, foot lift, body bob for a 4-frame sheet
const gait = (frame, stride) => {
  const a = (frame / 4) * Math.PI * 2;
  return { swing: Math.sin(a) * stride, lift: Math.max(0, Math.sin(a)) * stride * 0.5, liftB: Math.max(0, -Math.sin(a)) * stride * 0.5, bob: -Math.abs(Math.cos(a)) * 0.8 };
};

// ---- weapons ---------------------------------------------------------------
// drawn in hand at (hx, hy), pointing along `ang` (radians, 0 = +x)
const weapon = (ctx, kind, hx, hy, ang, col = "#c4c8d0", s = 1) => {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const P = (d) => [hx + dx * d * s, hy + dy * d * s];
  part(ctx, (c) => {
    c.lineCap = "round";
    if (kind === "knife") { c.strokeStyle = col; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(...P(0)); c.lineTo(...P(6)); c.stroke(); }
    else if (kind === "sword") { c.strokeStyle = "#5f4326"; c.lineWidth = 1.8 * s; c.beginPath(); c.moveTo(...P(-3)); c.lineTo(...P(1)); c.stroke(); c.strokeStyle = col; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(...P(1)); c.lineTo(...P(11)); c.stroke(); c.strokeStyle = "#8a7444"; c.lineWidth = 1.4 * s; c.beginPath(); c.moveTo(hx + dy * 2.5 * s, hy - dx * 2.5 * s); c.lineTo(hx - dy * 2.5 * s, hy + dx * 2.5 * s); c.stroke(); }
    else if (kind === "axe") { c.strokeStyle = "#5f4326"; c.lineWidth = 1.8 * s; c.beginPath(); c.moveTo(...P(-4)); c.lineTo(...P(9)); c.stroke(); const [ax, ay] = P(7); c.fillStyle = col; c.beginPath(); c.moveTo(ax + dy * 1.5 * s, ay - dx * 1.5 * s); c.quadraticCurveTo(ax - dy * 6 * s + dx * 2 * s, ay + dx * 6 * s + dy * 2 * s, ax + dy * 1.5 * s - dx * 4 * s, ay - dx * 1.5 * s - dy * 4 * s); c.closePath(); c.fill(); }
    else if (kind === "club") { c.strokeStyle = "#6a4a2e"; c.lineWidth = 2.2 * s; c.beginPath(); c.moveTo(...P(-3)); c.lineTo(...P(8)); c.stroke(); const [bx, by] = P(9); ball(c, bx, by, 3.2 * s, 2.8 * s, "#7a5a3a", { hi: 0.35, lo: 0.5 }); }
    else if (kind === "pitchfork") { c.strokeStyle = "#8a6a40"; c.lineWidth = 1.4 * s; c.beginPath(); c.moveTo(...P(-8)); c.lineTo(...P(10)); c.stroke(); const [tx, ty] = P(10); c.strokeStyle = col; c.lineWidth = 1.1 * s; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(tx + dy * k * 1.8 * s, ty - dx * k * 1.8 * s); c.lineTo(tx + dy * k * 1.8 * s + dx * 4 * s, ty - dx * k * 1.8 * s + dy * 4 * s); c.stroke(); } c.beginPath(); c.moveTo(tx + dy * 2 * s, ty - dx * 2 * s); c.lineTo(tx - dy * 2 * s, ty + dx * 2 * s); c.stroke(); }
    else if (kind === "spear") { c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4 * s; c.beginPath(); c.moveTo(...P(-8)); c.lineTo(...P(12)); c.stroke(); const [tx, ty] = P(12); c.fillStyle = col; c.beginPath(); c.moveTo(tx + dx * 4 * s, ty + dy * 4 * s); c.lineTo(tx + dy * 1.6 * s, ty - dx * 1.6 * s); c.lineTo(tx - dy * 1.6 * s, ty + dx * 1.6 * s); c.closePath(); c.fill(); }
    else if (kind === "staff") { c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(...P(-10)); c.lineTo(...P(9)); c.stroke(); const [tx, ty] = P(10); ball(c, tx, ty, 2.2 * s, 2.2 * s, col, { hi: 0.6, lo: 0.3 }); }
    else if (kind === "mace") { c.strokeStyle = "#5f4326"; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(...P(-3)); c.lineTo(...P(7)); c.stroke(); const [bx, by] = P(8.5); ball(c, bx, by, 2.6 * s, 2.6 * s, col, { hi: 0.4, lo: 0.5 }); c.fillStyle = col; for (let i = 0; i < 4; i++) { const a2 = i * 1.57 + 0.4; c.fillRect(bx + Math.cos(a2) * 3 * s - 0.6, by + Math.sin(a2) * 3 * s - 0.6, 1.2, 1.2); } }
    else if (kind === "bow") { c.strokeStyle = "#4a3018"; c.lineWidth = 1.4 * s; c.beginPath(); c.moveTo(hx, hy - 7 * s); c.quadraticCurveTo(hx + 5 * s, hy, hx, hy + 7 * s); c.stroke(); c.strokeStyle = "rgba(240,232,210,0.9)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(hx, hy - 7 * s); c.lineTo(hx - 2 * s, hy); c.lineTo(hx, hy + 7 * s); c.stroke(); }
    else if (kind === "crossbow") { c.strokeStyle = "#5f4326"; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(...P(-3)); c.lineTo(...P(7)); c.stroke(); const [bx, by] = P(5); c.strokeStyle = "#4a3018"; c.lineWidth = 1.4 * s; c.beginPath(); c.moveTo(bx + dy * 6 * s, by - dx * 6 * s); c.lineTo(bx - dy * 6 * s, by + dx * 6 * s); c.stroke(); c.strokeStyle = "rgba(240,232,210,0.9)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(bx + dy * 6 * s, by - dx * 6 * s); c.lineTo(...P(-1)); c.lineTo(bx - dy * 6 * s, by + dx * 6 * s); c.stroke(); }
    else if (kind === "totem") { c.strokeStyle = "#6a4a2e"; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(...P(-10)); c.lineTo(...P(10)); c.stroke(); const [tx, ty] = P(9); ball(c, tx, ty, 3 * s, 3.4 * s, "#e8dfc6", { hi: 0.4, lo: 0.4 }); c.fillStyle = "#2a2230"; c.fillRect(tx - 1.6 * s, ty - 0.8 * s, 1.2, 1.2); c.fillRect(tx + 0.6 * s, ty - 0.8 * s, 1.2, 1.2); for (let i = 0; i < 3; i++) { c.fillStyle = ["#c8383a", "#e8c14a", "#3a80c0"][i]; c.fillRect(tx - 3 * s + i * 2.2 * s, ty - 6 * s, 1.2, 3); } }
    else if (kind === "bell") { c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(...P(-2)); c.lineTo(...P(5)); c.stroke(); const [bx, by] = P(6); cone(c, bx, by - 5 * s, 3.2 * s, 6 * s, col, { scallops: 1, sag: 1, hi: 0.4, lo: 0.5 }); }
    else if (kind === "banner") { c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(...P(-6)); c.lineTo(...P(16)); c.stroke(); const [tx, ty] = P(14); c.fillStyle = col; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - dy * 9 * s, ty + dx * 9 * s); c.lineTo(tx - dy * 9 * s - dx * 6 * s, ty + dx * 9 * s - dy * 6 * s); c.lineTo(tx - dx * 6 * s, ty - dy * 6 * s); c.closePath(); c.fill(); }
    else if (kind === "lantern") { c.strokeStyle = "#3a3a44"; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(...P(-2)); c.lineTo(...P(4)); c.stroke(); const [bx, by] = P(5); c.fillStyle = "#3a3a44"; roundRect(c, bx - 2 * s, by - 2.5 * s, 4 * s, 5 * s, 1); c.fill(); c.fillStyle = col; c.fillRect(bx - 1.2 * s, by - 1.5 * s, 2.4 * s, 3 * s); }
  });
};

const shieldOf = (ctx, kind, x, y, col, s = 1) => part(ctx, (c) => {
  if (kind === "round") { ball(c, x, y, 4.2 * s, 4.6 * s, col, { hi: 0.4, lo: 0.45 }); ball(c, x, y, 1.2 * s, 1.2 * s, "#8a909c", { hi: 0.4, lo: 0.4 }); }
  else if (kind === "kite") { c.beginPath(); c.moveTo(x - 4 * s, y - 5 * s); c.lineTo(x + 4 * s, y - 5 * s); c.lineTo(x + 4 * s, y + 1 * s); c.lineTo(x, y + 6 * s); c.lineTo(x - 4 * s, y + 1 * s); c.closePath(); c.fillStyle = lit(c, x, 8 * s, col); c.fill(); c.fillStyle = rgba("#e0d6ba", 0.8); c.fillRect(x - 0.6, y - 4 * s, 1.2, 8 * s); }
  else if (kind === "lid") { roundRect(c, x - 4 * s, y - 9 * s, 8 * s, 16 * s, 2); c.fillStyle = lit(c, x, 8 * s, col); c.fill(); c.strokeStyle = rgba(darken(col, 0.6), 0.5); c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 2 * s, y - 6 * s); c.lineTo(x + 2 * s, y - 6 * s); c.moveTo(x - 2 * s, y + 3 * s); c.lineTo(x + 2 * s, y + 3 * s); c.stroke(); }
});

// ---- the biped -------------------------------------------------------------
// p: { h, skin, cloth, cloth2, boots, head, hair, eyes, weapon, wcol, shield, shcol,
//      ears, tusks, bulk, stoop, cape, skull, crown, horns, pose, frame, big }
const biped = (ctx, p) => {
  const h = p.h ?? 22, s = h / 22;
  const walk = p.pose !== "fight";
  const g = walk ? gait(p.frame || 0, 3.5 * s) : { swing: 0, lift: 0, liftB: 0, bob: 0 };
  const lunge = !walk && p.frame === 1 ? 2.5 * s : 0;
  const y = g.bob, x = lunge;
  const stoop = (p.stoop || 0) * s;
  const legH = 7.5 * s, bodyH = (p.bulk ? 11 : 10) * s, bodyW = (p.bulk ? 10 : 7.5) * s;
  const boots = p.boots || darken(p.cloth, 0.3);
  shadow(ctx, 1, 0.4, 5 * s, 1.8 * s, 0.3);
  // back leg
  limb(ctx, x - 1.6 * s - g.swing * 0.5, y - legH, x - 1.9 * s - g.swing, y - 0.5 - g.liftB, 2.6 * s, darken(boots, 0.15));
  // back arm (holds shield or two-handed weapon behind)
  const armY = y - legH - bodyH * 0.85;
  if (p.shield) shieldOf(ctx, p.shield, x - 4.5 * s, armY + 3 * s, p.shcol || "#8a6238", s);
  else limb(ctx, x - 2 * s, armY, x - 3.5 * s - g.swing * 0.4, armY + 5 * s, 2.2 * s, p.cloth);
  // torso
  part(ctx, (c) => {
    roundRect(c, x - bodyW / 2 + stoop * 0.3, y - legH - bodyH, bodyW, bodyH + 1, bodyW * 0.35);
    c.fillStyle = lit(c, x, bodyW, p.cloth); c.fill();
    if (p.cloth2) { c.fillStyle = p.cloth2; c.fillRect(x - bodyW / 2 + 0.6, y - legH - bodyH * 0.38, bodyW - 1.2, 1.3 * s); }
    if (p.armor) { c.fillStyle = rgba(lighten(p.cloth, 0.5), 0.35); c.fillRect(x - bodyW / 2 + 1, y - legH - bodyH + 1, bodyW - 2, 2 * s); }
  });
  if (p.cape) part(ctx, (c) => { c.beginPath(); c.moveTo(x - bodyW * 0.45, y - legH - bodyH + 1); c.quadraticCurveTo(x - bodyW * 0.9 - 2 * s, y - legH * 0.5, x - bodyW * 0.7 - 1.5 * s, y - 1); c.lineTo(x - bodyW * 0.4, y - 2); c.closePath(); c.fillStyle = darken(p.cape, 0.15); c.fill(); });
  // head
  const hy = y - legH - bodyH - 3.2 * s + stoop, hx = x + 0.4 * s + stoop * 0.6;
  const headR = (p.big ? 3.8 : 3.3) * s;
  if (p.skull) part(ctx, (c) => { ball(c, hx, hy, headR, headR * 1.05, p.skin, { hi: 0.35, lo: 0.4 }); c.fillStyle = darken(p.skin, 0.2); c.fillRect(hx - 1.6 * s, hy + 1.8 * s, 3.4 * s, 1.2 * s); });
  else part(ctx, (c) => ball(c, hx, hy, headR, headR * 1.05, p.skin, { hi: 0.45, lo: 0.4 }));
  if (p.ears) for (const sgn of [-1, 1]) part(ctx, (c) => { c.beginPath(); c.moveTo(hx + sgn * 1.5 * s, hy - 0.5 * s); c.lineTo(hx + sgn * (p.ears === "long" ? 7 : 5) * s, hy - 2.5 * s); c.lineTo(hx + sgn * 2 * s, hy + 1.2 * s); c.closePath(); c.fillStyle = p.skin; c.fill(); });
  if (p.tusks) { ctx.fillStyle = "#ece0c4"; ctx.fillRect(hx + 1.2 * s, hy + 1.4 * s, 1.1, 2 * s); ctx.fillRect(hx + 2.8 * s, hy + 1.2 * s, 1.1, 2.2 * s); }
  if (p.skull) { eye(ctx, hx + 1.8 * s, hy - 0.2 * s, p.eyes || "#1a1420", 0.9 * s); eye(ctx, hx - 0.4 * s, hy - 0.2 * s, p.eyes || "#1a1420", 0.9 * s); }
  else eye(ctx, hx + 1.7 * s, hy + 0.1 * s, p.eyes || "#2a2230", 0.6 * s);
  if (p.eyes && p.eyes !== "#2a2230" && p.eyes !== "#1a1420") glow(ctx, hx + 1.7 * s, hy, 1.6 * s, p.eyes, 0.7);
  // headgear
  const head = p.head || "bare";
  if (head === "hood") part(ctx, (c) => { ball(c, hx - 0.4 * s, hy - 1.4 * s, headR + 0.4 * s, headR * 0.75, p.hair || p.cloth, { hi: 0.45, lo: 0.45 }); ball(c, hx - 2.2 * s, hy + 0.6 * s, 2.2 * s, headR, p.hair || p.cloth, { hi: 0.3, lo: 0.5 }); });
  else if (head === "helm") part(ctx, (c) => { ball(c, hx - 0.2 * s, hy - 1.2 * s, headR + 0.5 * s, headR * 0.8, p.hair || "#8a909c", { hi: 0.45, lo: 0.45 }); c.fillStyle = p.hair || "#8a909c"; c.fillRect(hx + 0.6 * s, hy - 0.8 * s, 1.4 * s, 3 * s); });
  else if (head === "cap") part(ctx, (c) => ball(c, hx - 0.2 * s, hy - 2.2 * s, headR + 0.3 * s, headR * 0.5, p.hair || "#4a3a2e", { hi: 0.4, lo: 0.4 }));
  else if (head === "hair") part(ctx, (c) => ball(c, hx - 0.6 * s, hy - 1.6 * s, headR + 0.2 * s, headR * 0.7, p.hair || "#4a3020", { hi: 0.35, lo: 0.45 }));
  else if (head === "crown") part(ctx, (c) => { c.fillStyle = p.hair || "#e8c14a"; c.fillRect(hx - 3 * s, hy - 4.2 * s, 6 * s, 1.6 * s); for (let i = 0; i < 3; i++) c.fillRect(hx - 2.6 * s + i * 2.2 * s, hy - 6.2 * s, 1.2 * s, 2.4 * s); });
  else if (head === "horns") for (const sgn of [-1, 1]) part(ctx, (c) => { c.strokeStyle = "#e8dfc6"; c.lineWidth = 1.4 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(hx + sgn * 2 * s, hy - 2.5 * s); c.quadraticCurveTo(hx + sgn * 4.5 * s, hy - 5 * s, hx + sgn * 3.5 * s, hy - 7.5 * s); c.stroke(); });
  else if (head === "mitre") part(ctx, (c) => { c.beginPath(); c.moveTo(hx - 2.8 * s, hy - 2.2 * s); c.lineTo(hx - 1 * s, hy - 8 * s); c.lineTo(hx + 0.6 * s, hy - 6 * s); c.lineTo(hx + 2.2 * s, hy - 8 * s); c.lineTo(hx + 3.6 * s, hy - 2.2 * s); c.closePath(); c.fillStyle = p.hair || "#e8e2d0"; c.fill(); });
  if (p.feathers) for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#c8383a", "#e8c14a", "#3a80c0"][i]; ctx.fillRect(hx - 2 * s + i * 1.6 * s, hy - 7.5 * s + (i % 2) * s, 1.1, 3.5 * s); }
  // front leg
  limb(ctx, x + 1.4 * s + g.swing * 0.5, y - legH, x + 1.7 * s + g.swing, y - 0.5 - g.lift, 2.6 * s, boots);
  // front arm and the weapon
  const wAng = walk ? 0.9 + Math.sin((p.frame || 0) / 4 * Math.PI * 2) * 0.25 : (p.frame === 1 ? 0 : -1.6);
  const hxw = x + 4 * s + (walk ? g.swing * 0.3 : lunge), hyw = armY + 4 * s - (walk ? 0 : p.frame === 1 ? 2 * s : 4 * s);
  limb(ctx, x + 2 * s, armY, hxw, hyw, 2.2 * s, p.cloth);
  ball(ctx, hxw, hyw, 1.4 * s, 1.4 * s, p.skin, { hi: 0.4, lo: 0.4 });
  if (p.weapon) weapon(ctx, p.weapon, hxw, hyw, p.weapon === "bow" || p.weapon === "crossbow" ? 0 : wAng - 0.9, p.wcol, s * (p.wscale || 1));
};

// ---- the beast -------------------------------------------------------------
// p: { len, h, col, belly, head: "wolf"|"boar"|"horse"|"ghoul", tail, mane, tusks, eyes, rider, pose, frame }
const beast = (ctx, p) => {
  const len = p.len ?? 26, h = p.h ?? 12, s = len / 26;
  const walk = p.pose !== "fight";
  const a = ((p.frame || 0) / 4) * Math.PI * 2;
  const bob = walk ? -Math.abs(Math.sin(a)) * 1.2 : 0;
  const lunge = !walk && p.frame === 1 ? 4 * s : 0;
  const by = -h * 0.55 + bob, bx = lunge;
  const legH = h * 0.55;
  shadow(ctx, 2, 0.6, len * 0.45, 2 * s, 0.3);
  const legs = [[-len * 0.3, 1], [len * 0.28, 1], [-len * 0.3, -1], [len * 0.28, -1]];
  const legAt = (lx, ph) => { const sw = walk ? Math.sin(a + ph) * 4 * s : (p.frame === 1 ? 2 : -2) * s * Math.sign(lx || 1); const lift = walk ? Math.max(0, Math.sin(a + ph)) * 2.5 * s : 0; return [bx + lx + sw, -lift]; };
  // far legs
  for (const [lx, side] of legs.slice(2)) { const [fx, fy] = legAt(lx, lx < 0 ? Math.PI : 0); limb(ctx, bx + lx, by + h * 0.3, fx, fy - 0.5, 2.4 * s, darken(p.col, 0.25)); }
  // body
  part(ctx, (c) => { ball(c, bx, by, len * 0.5, h * 0.5, p.col, { hi: 0.45, lo: 0.45 }); });
  if (p.belly) part(ctx, (c) => ball(c, bx - len * 0.02, by + h * 0.2, len * 0.36, h * 0.28, p.belly, { hi: 0.3, lo: 0.2 }));
  if (p.mane) part(ctx, (c) => ball(c, bx + len * 0.25, by - h * 0.3, len * 0.18, h * 0.35, p.mane, { hi: 0.35, lo: 0.45 }));
  // tail
  if (p.tail !== false) part(ctx, (c) => { c.strokeStyle = p.tail || darken(p.col, 0.1); c.lineWidth = 2.2 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(bx - len * 0.45, by - h * 0.1); c.quadraticCurveTo(bx - len * 0.6, by - h * 0.9 + (walk ? Math.sin(a) * 2 : 0), bx - len * 0.7, by - h * 0.5); c.stroke(); });
  // head
  const hx = bx + len * 0.48, hy = by - h * 0.35 + (walk ? 0 : p.frame === 1 ? 1.5 : -1);
  if (p.head === "boar") { part(ctx, (c) => ball(c, hx + 1 * s, hy + 1 * s, 5 * s, 4.2 * s, p.col, { hi: 0.4, lo: 0.45 })); part(ctx, (c) => ball(c, hx + 5 * s, hy + 2.5 * s, 2.4 * s, 1.8 * s, darken(p.col, 0.2), { hi: 0.3, lo: 0.4 })); ctx.fillStyle = "#ece0c4"; ctx.fillRect(hx + 4.5 * s, hy + 3.5 * s, 1.2, 2.5 * s); }
  else if (p.head === "horse") { part(ctx, (c) => { c.beginPath(); c.moveTo(hx - 2 * s, hy + 2 * s); c.lineTo(hx + 1 * s, hy - 7 * s); c.lineTo(hx + 5 * s, hy - 6 * s); c.lineTo(hx + 8 * s, hy - 1 * s); c.lineTo(hx + 5 * s, hy + 2 * s); c.closePath(); c.fillStyle = lit(c, hx, 8 * s, p.col); c.fill(); }); ctx.fillStyle = p.mane || darken(p.col, 0.3); ctx.fillRect(hx - 1 * s, hy - 8 * s, 2.5 * s, 3 * s); }
  else if (p.head === "ghoul") { part(ctx, (c) => ball(c, hx + 1 * s, hy, 3.8 * s, 3.6 * s, p.col, { hi: 0.4, lo: 0.45 })); ctx.fillStyle = "#ece0c4"; for (let i = 0; i < 3; i++) ctx.fillRect(hx + 1.5 * s + i * 1.3 * s, hy + 2.6 * s, 0.9, 1.4 * s); }
  else { part(ctx, (c) => ball(c, hx, hy, 4.2 * s, 3.6 * s, p.col, { hi: 0.4, lo: 0.45 })); part(ctx, (c) => ball(c, hx + 4 * s, hy + 1.2 * s, 2.6 * s, 1.8 * s, p.col, { hi: 0.3, lo: 0.45 })); for (const sgn of [-1, 0.2]) part(ctx, (c) => { c.beginPath(); c.moveTo(hx + sgn * 2 * s, hy - 2 * s); c.lineTo(hx + sgn * 2 * s - 1 * s, hy - 6 * s); c.lineTo(hx + sgn * 2 * s + 2 * s, hy - 3 * s); c.closePath(); c.fillStyle = p.col; c.fill(); }); ctx.fillStyle = "#ece0c4"; ctx.fillRect(hx + 4 * s, hy + 2.6 * s, 1, 1.4 * s); }
  eye(ctx, hx + 2.4 * s, hy - 0.4 * s, p.eyes || "#d8b34a", 0.7 * s);
  if (p.eyes) glow(ctx, hx + 2.4 * s, hy - 0.4 * s, 1.6 * s, p.eyes, 0.7);
  // near legs
  for (const [lx] of legs.slice(0, 2)) { const [fx, fy] = legAt(lx, lx < 0 ? 0 : Math.PI); limb(ctx, bx + lx, by + h * 0.3, fx, fy - 0.5, 2.6 * s, p.col); }
  // a rider, seated at the shoulder
  if (p.rider) { ctx.save(); ctx.translate(bx + len * 0.12, by - h * 0.3); biped(ctx, { ...p.rider, pose: p.pose, frame: 0 }); ctx.restore(); }
};

// ---- odd bodies ---------------------------------------------------------------
const bat = (ctx, p) => {
  const s = (p.h ?? 10) / 10;
  const f = ((p.frame || 0) % 4);
  const up = f < 2 ? 1 - f * 0.6 : (f - 2) * 0.6 - 0.2;
  const y = -8 * s;
  for (const sgn of [-1, 1]) part(ctx, (c) => { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(sgn * 5 * s, y - 6 * s * up, sgn * 10 * s, y - 4 * s * up); c.lineTo(sgn * 8 * s, y + 1 * s); c.lineTo(sgn * 4 * s, y + 2 * s); c.closePath(); c.fillStyle = lit(c, sgn * 5 * s, 10 * s, p.col); c.fill(); });
  part(ctx, (c) => ball(c, 0, y, 2.6 * s, 3 * s, p.col, { hi: 0.4, lo: 0.45 }));
  eye(ctx, 0.8 * s, y - 0.8 * s, "#e05248", 0.5 * s); eye(ctx, -0.8 * s, y - 0.8 * s, "#e05248", 0.5 * s);
  ctx.fillStyle = "#ece0c4"; ctx.fillRect(-0.9 * s, y + 1.4 * s, 0.7, 1.2 * s); ctx.fillRect(0.4 * s, y + 1.4 * s, 0.7, 1.2 * s);
};

const wraith = (ctx, p) => {
  const s = (p.h ?? 26) / 26;
  const f = p.frame || 0;
  const drift = Math.sin(f / 4 * Math.PI * 2) * 1.5 * s;
  const y = -6 * s + drift;
  // the robe tapers into mist
  part(ctx, (c) => { c.beginPath(); c.moveTo(-4 * s, y - 14 * s); c.lineTo(4 * s, y - 14 * s); c.quadraticCurveTo(7 * s, y - 4 * s, 5 * s, y + 2 * s); c.lineTo(2 * s, y - 1 * s); c.lineTo(0, y + 4 * s); c.lineTo(-2 * s, y); c.lineTo(-5 * s, y + 2 * s); c.quadraticCurveTo(-7 * s, y - 4 * s, -4 * s, y - 14 * s); c.closePath(); c.fillStyle = lin(c, -6 * s, 0, 6 * s, 0, [[0, lighten(p.col, 0.3)], [0.5, p.col], [1, darken(p.col, 0.4)]]); c.fill(); });
  limb(ctx, 2 * s, y - 10 * s, 6 * s, y - 5 * s, 2 * s, p.col);
  limb(ctx, -2 * s, y - 10 * s, -5 * s, y - 6 * s, 2 * s, p.col);
  part(ctx, (c) => { ball(c, 0, y - 17 * s, 3.8 * s, 3 * s, p.col, { hi: 0.4, lo: 0.45 }); c.fillStyle = "#0e0a12"; c.beginPath(); c.ellipse(0.8 * s, y - 16.6 * s, 2.2 * s, 2.4 * s, 0, 0, Math.PI * 2); c.fill(); });
  glow(ctx, 1.4 * s, y - 17 * s, 2 * s, p.eyes || "#7ce0b8", 0.9); glow(ctx, -0.2 * s, y - 17 * s, 1.6 * s, p.eyes || "#7ce0b8", 0.8);
};

const dragon = (ctx, p) => {
  const s = (p.len ?? 60) / 60;
  const f = (p.frame || 0) % 4;
  const flap = f === 0 ? 1 : f === 1 ? 0.3 : f === 2 ? -0.6 : 0.3;
  const y = -14 * s;
  // far wing
  part(ctx, (c) => { c.beginPath(); c.moveTo(-6 * s, y - 4 * s); c.quadraticCurveTo(-14 * s, y - 20 * s * flap - 6 * s, -30 * s, y - 16 * s * flap - 4 * s); c.lineTo(-24 * s, y - 2 * s); c.lineTo(-12 * s, y + 2 * s); c.closePath(); c.fillStyle = darken(p.wing, 0.2); c.fill(); });
  // tail
  part(ctx, (c) => { c.strokeStyle = p.col; c.lineWidth = 4.5 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(-14 * s, y + 2 * s); c.quadraticCurveTo(-26 * s, y + 6 * s, -32 * s, y - 2 * s); c.stroke(); c.fillStyle = p.col; c.beginPath(); c.moveTo(-31 * s, y - 5 * s); c.lineTo(-36 * s, y - 2 * s); c.lineTo(-31 * s, y + 1 * s); c.closePath(); c.fill(); });
  // body and belly
  part(ctx, (c) => ball(c, 0, y, 18 * s, 10 * s, p.col, { hi: 0.4, lo: 0.45 }));
  part(ctx, (c) => ball(c, 0, y + 3 * s, 12 * s, 5.5 * s, p.belly, { hi: 0.3, lo: 0.2 }));
  // legs, tucked
  for (const lx of [-8, 8]) limb(ctx, lx * s, y + 5 * s, lx * s + 2 * s, y + 12 * s, 3.5 * s, darken(p.col, 0.1));
  // neck and head
  part(ctx, (c) => { c.strokeStyle = p.col; c.lineWidth = 6 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(14 * s, y - 2 * s); c.quadraticCurveTo(22 * s, y - 8 * s, 24 * s, y - 16 * s); c.stroke(); });
  part(ctx, (c) => { ball(c, 26 * s, y - 18 * s, 6 * s, 4.5 * s, p.col, { hi: 0.4, lo: 0.45 }); ball(c, 31 * s, y - 16.5 * s, 3.5 * s, 2.5 * s, p.col, { hi: 0.3, lo: 0.45 }); });
  for (const [hx, hy] of [[23, -22], [26, -23]]) part(ctx, (c) => { c.strokeStyle = "#e8dfc6"; c.lineWidth = 1.6 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(hx * s, hy * s + y); c.lineTo((hx - 3) * s, (hy - 5) * s + y); c.stroke(); });
  eye(ctx, 28 * s, y - 19 * s, p.eyes || "#e8c14a", 1 * s); glow(ctx, 28 * s, y - 19 * s, 2.2 * s, p.eyes || "#e8c14a", 0.6);
  ctx.fillStyle = "#ece0c4"; for (let i = 0; i < 3; i++) ctx.fillRect((29 + i * 1.8) * s, y - 14.5 * s, 0.9, 1.6 * s);
  // near wing
  part(ctx, (c) => { c.beginPath(); c.moveTo(2 * s, y - 6 * s); c.quadraticCurveTo(10 * s, y - 24 * s * flap - 8 * s, 4 * s, y - 28 * s * flap - 6 * s); c.lineTo(-10 * s, y - 24 * s * flap - 4 * s); c.lineTo(-16 * s, y - 6 * s); c.closePath(); c.fillStyle = lit(c, -6 * s, 24 * s, p.wing); c.fill(); c.strokeStyle = darken(p.wing, 0.5); c.lineWidth = 1; for (const k of [0.3, 0.6]) { c.beginPath(); c.moveTo(-4 * s, y - 6 * s); c.lineTo((4 - 14 * k) * s, y - (28 * flap + 6) * s * k - 2 * s); c.stroke(); } });
};

const gryphon = (ctx, p) => {
  const s = (p.len ?? 34) / 34;
  const f = (p.frame || 0) % 4;
  const flap = f === 0 ? 1 : f === 1 ? 0.3 : f === 2 ? -0.5 : 0.3;
  const y = -8 * s;
  part(ctx, (c) => { c.beginPath(); c.moveTo(-4 * s, y - 2 * s); c.quadraticCurveTo(-10 * s, y - 14 * s * flap - 4 * s, -22 * s, y - 10 * s * flap - 2 * s); c.lineTo(-14 * s, y + 2 * s); c.closePath(); c.fillStyle = darken(p.wing, 0.2); c.fill(); });
  part(ctx, (c) => ball(c, 0, y, 12 * s, 6 * s, p.col, { hi: 0.4, lo: 0.45 }));
  for (const lx of [-6, 5]) limb(ctx, lx * s, y + 3 * s, lx * s + 1 * s, y + 9 * s, 2.6 * s, darken(p.col, 0.1));
  part(ctx, (c) => { c.strokeStyle = p.col; c.lineWidth = 2 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(-11 * s, y); c.quadraticCurveTo(-16 * s, y + 3 * s, -19 * s, y - 1 * s); c.stroke(); });
  part(ctx, (c) => { ball(c, 12 * s, y - 5 * s, 4.5 * s, 4 * s, p.feather, { hi: 0.4, lo: 0.4 }); c.fillStyle = "#e0b855"; c.beginPath(); c.moveTo(15 * s, y - 5.5 * s); c.lineTo(19 * s, y - 3.5 * s); c.lineTo(15 * s, y - 2.5 * s); c.closePath(); c.fill(); });
  eye(ctx, 14 * s, y - 6 * s, "#2a2230", 0.7 * s);
  if (p.rider) { ctx.save(); ctx.translate(-1 * s, y - 3 * s); biped(ctx, { ...p.rider, pose: "walk", frame: 0 }); ctx.restore(); }
  part(ctx, (c) => { c.beginPath(); c.moveTo(2 * s, y - 4 * s); c.quadraticCurveTo(8 * s, y - 18 * s * flap - 6 * s, 2 * s, y - 20 * s * flap - 4 * s); c.lineTo(-8 * s, y - 16 * s * flap - 2 * s); c.lineTo(-12 * s, y - 4 * s); c.closePath(); c.fillStyle = lit(c, -4 * s, 16 * s, p.wing); c.fill(); });
};

const ram = (ctx, p) => {
  const s = (p.len ?? 44) / 44;
  const f = p.frame || 0;
  const roll = (f / 4) * Math.PI * 2;
  shadow(ctx, 2, 0.6, 22 * s, 3 * s, 0.32);
  for (const lx of [-16, 0, 16]) part(ctx, (c) => { ball(c, lx * s, -4 * s, 4.5 * s, 4.5 * s, "#4a3826", { hi: 0.35, lo: 0.5 }); c.strokeStyle = "#8a6238"; c.lineWidth = 1; c.beginPath(); c.moveTo(lx * s - Math.cos(roll) * 3 * s, -4 * s - Math.sin(roll) * 3 * s); c.lineTo(lx * s + Math.cos(roll) * 3 * s, -4 * s + Math.sin(roll) * 3 * s); c.stroke(); });
  part(ctx, (c) => { roundRect(c, -20 * s, -20 * s, 40 * s, 14 * s, 2); c.fillStyle = lin(c, -20 * s, 0, 20 * s, 0, [[0, lighten("#6e4c28", 0.3)], [0.5, "#6e4c28"], [1, darken("#6e4c28", 0.4)]]); c.fill(); c.fillStyle = rgba("#3a2a1a", 0.5); for (let i = 0; i < 6; i++) c.fillRect((-18 + i * 7) * s, -20 * s, 0.8, 14 * s); });
  part(ctx, (c) => { c.beginPath(); c.moveTo(-22 * s, -20 * s); c.lineTo(0, -30 * s); c.lineTo(22 * s, -20 * s); c.closePath(); c.fillStyle = lin(c, -22 * s, -30 * s, 12 * s, -20 * s, [[0, lighten("#5a4a3a", 0.3)], [0.5, "#5a4a3a"], [1, darken("#5a4a3a", 0.4)]]); c.fill(); });
  for (const bx of [-12, 8]) part(ctx, (c) => { c.fillStyle = "#6c727e"; c.fillRect(bx * s, -20 * s, 2 * s, 14 * s); });
  // the ram itself, swinging under the roof
  const sw = Math.sin(roll) * 3 * s;
  part(ctx, (c) => { c.strokeStyle = "#5a3e22"; c.lineWidth = 4 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(-16 * s + sw, -12 * s); c.lineTo(24 * s + sw, -12 * s); c.stroke(); ball(c, 26 * s + sw, -12 * s, 3.5 * s, 3.5 * s, "#6c727e", { hi: 0.4, lo: 0.5 }); });
};

const amalgam = (ctx, p) => {
  const s = (p.h ?? 30) / 30;
  const f = p.frame || 0;
  const bob = -Math.abs(Math.sin(f / 4 * Math.PI * 2)) * 1.5;
  shadow(ctx, 2, 0.6, 14 * s, 3 * s, 0.32);
  for (const [lx, ph] of [[-6, 0], [6, Math.PI], [0, 1.5]]) limb(ctx, lx * s, -10 * s, lx * s + Math.sin(f / 4 * Math.PI * 2 + ph) * 3 * s, -0.5, 3 * s, darken(p.col, 0.2));
  part(ctx, (c) => blobBall(c, 0, -14 * s + bob, 13 * s, 11 * s, p.col, 7, { hi: 0.35, lo: 0.5, wobble: 0.2, n: 9 }));
  // faces and arms stitched into the mass
  for (const [hx, hy, r] of [[-6, -20, 3], [5, -22, 3.4], [9, -12, 2.6]]) { part(ctx, (c) => ball(c, hx * s, hy * s + bob, r * s, r * s, lighten(p.col, 0.1), { hi: 0.4, lo: 0.45 })); eye(ctx, (hx + 1) * s, (hy - 0.5) * s + bob, p.eyes || "#7ce0b8", 0.7 * s); glow(ctx, (hx + 1) * s, (hy - 0.5) * s + bob, 1.4 * s, p.eyes || "#7ce0b8", 0.7); }
  limb(ctx, 10 * s, -18 * s + bob, 16 * s, -12 * s + bob + Math.sin(f) * 2, 2.6 * s, p.col);
  limb(ctx, -11 * s, -16 * s + bob, -16 * s, -20 * s + bob, 2.6 * s, p.col);
};

const eagle = (ctx, p) => {
  const s = (p.len ?? 30) / 30;
  const f = (p.frame || 0) % 4;
  const flap = f === 0 ? 1 : f === 1 ? 0.3 : f === 2 ? -0.6 : 0.3;
  const y = -8 * s;
  part(ctx, (c) => { c.beginPath(); c.moveTo(-3 * s, y - 2 * s); c.quadraticCurveTo(-9 * s, y - 12 * s * flap - 4 * s, -20 * s, y - 9 * s * flap - 2 * s); c.lineTo(-13 * s, y + 2 * s); c.closePath(); c.fillStyle = darken(p.wing, 0.2); c.fill(); });
  part(ctx, (c) => ball(c, 0, y, 9 * s, 5 * s, p.col, { hi: 0.4, lo: 0.45 }));
  part(ctx, (c) => { c.fillStyle = "#ded6c4"; c.beginPath(); c.moveTo(-8 * s, y); c.lineTo(-14 * s, y - 2 * s); c.lineTo(-14 * s, y + 3 * s); c.closePath(); c.fill(); });
  part(ctx, (c) => { ball(c, 9 * s, y - 4 * s, 4 * s, 3.4 * s, "#ece4d2", { hi: 0.4, lo: 0.4 }); c.fillStyle = "#e0b855"; c.beginPath(); c.moveTo(12 * s, y - 4.5 * s); c.lineTo(16 * s, y - 2.5 * s); c.lineTo(12 * s, y - 1.5 * s); c.closePath(); c.fill(); });
  eye(ctx, 10.5 * s, y - 5 * s, "#2a2230", 0.7 * s);
  for (const lx of [-3, 3]) limb(ctx, lx * s, y + 3 * s, lx * s + 1 * s, y + 7 * s, 1.6 * s, "#e0b855");
  if (p.rider) { ctx.save(); ctx.translate(-2 * s, y - 2 * s); biped(ctx, { ...p.rider, pose: "walk", frame: 0 }); ctx.restore(); }
  part(ctx, (c) => { c.beginPath(); c.moveTo(1 * s, y - 3 * s); c.quadraticCurveTo(7 * s, y - 16 * s * flap - 5 * s, 1 * s, y - 18 * s * flap - 3 * s); c.lineTo(-7 * s, y - 14 * s * flap - 2 * s); c.lineTo(-11 * s, y - 3 * s); c.closePath(); c.fillStyle = lit(c, -4 * s, 14 * s, p.wing); c.fill(); });
};

const skiff = (ctx, p) => {
  const s = 1;
  const f = p.frame || 0;
  part(ctx, (c) => { c.beginPath(); c.moveTo(-13, -4); c.lineTo(13, -4); c.quadraticCurveTo(12, 2, 8, 3); c.lineTo(-8, 3); c.quadraticCurveTo(-12, 2, -13, -4); c.closePath(); c.fillStyle = lin(c, -13, -4, 13, 3, [[0, lighten("#8a6238", 0.3)], [0.5, "#8a6238"], [1, darken("#8a6238", 0.4)]]); c.fill(); c.fillStyle = rgba("#5f4326", 0.6); for (let i = 0; i < 5; i++) c.fillRect(-11 + i * 5, -4, 0.8, 7); });
  part(ctx, (c) => { c.fillStyle = "#3a3a44"; roundRect(c, 8, -12, 4, 5, 1); c.fill(); c.fillStyle = "#e8c14a"; c.fillRect(9, -11, 2, 3); });
  ctx.save(); ctx.translate(-2, -3); biped(ctx, { h: 18, skin: "#e8c9a2", cloth: "#4a5a7c", head: "hood", hair: "#3a4a68", weapon: "spear", wcol: "#c4c8d0", pose: "walk", frame: f }); ctx.restore();
};

// ---- the roster ----------------------------------------------------------------
// Each entry: { kind: "biped"|"beast"|..., box: { hw, up, down }, p: params, fly?: true }
const G = "#6aa04f", GL = "#86ba64", GD = "#4d7639";
export const RIGS = {
  goblin: { kind: "biped", box: { hw: 14, up: 26, down: 4 }, p: { h: 20, skin: G, cloth: "#5f4326", cloth2: "#3c2a18", head: "hood", hair: "#5a4630", ears: "long", eyes: "#c8453a", weapon: "knife", wcol: "#8a8a92", shield: "round", shcol: "#8a6238" } },
  goblinBare: { kind: "biped", box: { hw: 14, up: 26, down: 4 }, p: { h: 20, skin: G, cloth: "#6e4c28", head: "bare", ears: "long", eyes: "#c8453a", weapon: "knife", wcol: "#8a8a92" } },
  wolf: { kind: "beast", box: { hw: 22, up: 20, down: 4 }, p: { len: 30, h: 12, col: "#8f929c", belly: "#aab0ba", head: "wolf", eyes: "#d8b34a" } },
  orc: { kind: "biped", box: { hw: 18, up: 32, down: 4 }, p: { h: 27, skin: "#5a8a3c", cloth: "#4a3a2e", cloth2: "#2a2018", head: "hair", hair: "#2a1a10", tusks: true, bulk: true, eyes: "#e8c14a", weapon: "axe", wcol: "#b8bcc4" } },
  armored: { kind: "biped", box: { hw: 18, up: 32, down: 4 }, p: { h: 26, skin: "#5a8a3c", cloth: "#6c727e", cloth2: "#4a4e58", armor: true, head: "helm", hair: "#8a909c", bulk: true, eyes: "#e8c14a", weapon: "sword", wcol: "#c4c8d0", shield: "kite", shcol: "#5c626e" } },
  troll: { kind: "biped", box: { hw: 24, up: 42, down: 4 }, p: { h: 36, skin: "#7a8a5a", cloth: "#5a4a3a", head: "hair", hair: "#3a3a2a", bulk: true, stoop: 2, big: true, eyes: "#e8c14a", weapon: "club", wcol: "#7a5a3a", wscale: 1.3 } },
  shaman: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 21, skin: G, cloth: "#8a4a3a", cloth2: "#e8c14a", head: "bare", ears: "long", eyes: "#c8453a", feathers: true, weapon: "staff", wcol: "#7ce0b8" } },
  necro: { kind: "biped", box: { hw: 18, up: 34, down: 4 }, p: { h: 28, skin: "#c8c0b0", cloth: "#2a2434", cloth2: "#5a4a8c", head: "hood", hair: "#1e1826", eyes: "#b08ad8", cape: "#2a2434", weapon: "staff", wcol: "#b08ad8" } },
  bat: { kind: "bat", fly: true, box: { hw: 12, up: 16, down: 2 }, p: { h: 10, col: "#4a3a48" } },
  boarrider: { kind: "beast", box: { hw: 22, up: 34, down: 4 }, p: { len: 30, h: 14, col: "#6a4a3a", belly: "#8a6a5a", head: "boar", tail: "#4a3020", eyes: "#e05248", rider: { h: 16, skin: G, cloth: "#5f4326", head: "cap", hair: "#5a4630", ears: "long", eyes: "#c8453a", weapon: "spear", wcol: "#c4c8d0" } } },
  hobgoblin: { kind: "biped", box: { hw: 20, up: 38, down: 4 }, p: { h: 30, skin: "#7a9a48", cloth: "#5a3a2a", cloth2: "#e8c14a", head: "horns", bulk: true, ears: "long", eyes: "#e05248", weapon: "totem", wcol: "#e8dfc6" } },
  rafter: { kind: "biped", box: { hw: 14, up: 26, down: 4 }, p: { h: 20, skin: G, cloth: "#6e4c28", head: "bare", ears: "long", eyes: "#c8453a", weapon: "spear", wcol: "#8a8a92" } },
  dragon: { kind: "dragon", fly: true, box: { hw: 40, up: 52, down: 6 }, p: { len: 60, col: "#a04a3a", belly: "#e8d0a0", wing: "#7a3028", eyes: "#e8c14a" } },
  levy: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 24, skin: "#e8b990", cloth: "#4a5a7c", cloth2: "#2c3e54", head: "helm", hair: "#8a909c", weapon: "spear", wcol: "#c4c8d0", shield: "kite", shcol: "#3a5474" } },
  crossbow: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 24, skin: "#e8b990", cloth: "#3a4a6a", cloth2: "#2c3e54", head: "cap", hair: "#4a3a2e", weapon: "crossbow", wcol: "#c4c8d0" } },
  sergeant: { kind: "biped", box: { hw: 18, up: 32, down: 4 }, p: { h: 27, skin: "#e8b990", cloth: "#8a909c", cloth2: "#5c626e", armor: true, head: "helm", hair: "#b8bcc4", bulk: true, cape: "#3a5474", weapon: "sword", wcol: "#dde2ea", shield: "kite", shcol: "#3a5474" } },
  cavalier: { kind: "beast", box: { hw: 24, up: 40, down: 4 }, p: { len: 34, h: 15, col: "#6a4a30", belly: "#8a6a4a", head: "horse", mane: "#3a2a1a", tail: "#3a2a1a", eyes: "#2a2230", rider: { h: 18, skin: "#e8b990", cloth: "#4a5a7c", cloth2: "#2c3e54", head: "helm", hair: "#8a909c", weapon: "spear", wcol: "#c4c8d0", cape: "#3a5474" } } },
  chaplain: { kind: "biped", box: { hw: 16, up: 32, down: 4 }, p: { h: 25, skin: "#e8b990", cloth: "#d8d0bc", cloth2: "#5a7a9c", head: "mitre", hair: "#e8e2d0", weapon: "mace", wcol: "#8a909c" } },
  ram: { kind: "ram", box: { hw: 34, up: 34, down: 4 }, p: { len: 44 } },
  gryphon: { kind: "gryphon", fly: true, box: { hw: 26, up: 40, down: 4 }, p: { len: 34, col: "#a08050", feather: "#e8dfc6", wing: "#8a6a44", rider: { h: 16, skin: "#e8b990", cloth: "#4a5a7c", head: "helm", hair: "#8a909c", weapon: "spear", wcol: "#c4c8d0" } } },
  marshal: { kind: "biped", box: { hw: 24, up: 44, down: 4 }, p: { h: 34, skin: "#e8b990", cloth: "#8a909c", cloth2: "#d8b34a", armor: true, head: "crown", hair: "#e8c14a", bulk: true, big: true, cape: "#8a2a2e", eyes: "#2a2230", weapon: "banner", wcol: "#3a5474", shield: "kite", shcol: "#d8b34a" } },
  skeleton: { kind: "biped", box: { hw: 14, up: 28, down: 4 }, p: { h: 22, skin: "#e0d8c4", cloth: "#8a8478", cloth2: "#5a5448", head: "bare", skull: true, eyes: "#7ce0b8", weapon: "sword", wcol: "#a8a8a0" } },
  ghoul: { kind: "beast", box: { hw: 18, up: 20, down: 4 }, p: { len: 24, h: 10, col: "#8a9a7a", belly: "#a8b898", head: "ghoul", tail: false, eyes: "#e8c14a" } },
  bonearcher: { kind: "biped", box: { hw: 14, up: 28, down: 4 }, p: { h: 22, skin: "#e0d8c4", cloth: "#6a6458", head: "hood", hair: "#4a4438", skull: true, eyes: "#7ce0b8", weapon: "bow", wcol: "#4a3018" } },
  wraith: { kind: "wraith", fly: true, box: { hw: 14, up: 32, down: 4 }, p: { h: 26, col: "#4a5a70", eyes: "#7ce0b8" } },
  ghast: { kind: "biped", box: { hw: 18, up: 32, down: 4 }, p: { h: 26, skin: "#a8b878", cloth: "#7a8a58", cloth2: "#4a5a34", head: "bare", bulk: true, stoop: 2, big: true, eyes: "#e8e070" } },
  crypt: { kind: "biped", box: { hw: 20, up: 36, down: 4 }, p: { h: 30, skin: "#e0d8c4", cloth: "#5c626e", cloth2: "#3a3e48", armor: true, head: "helm", hair: "#6c727e", skull: true, bulk: true, eyes: "#7ce0b8", weapon: "mace", wcol: "#8a909c", shield: "lid", shcol: "#8a8478" } },
  gravecaller: { kind: "biped", box: { hw: 16, up: 32, down: 4 }, p: { h: 26, skin: "#c8c0b0", cloth: "#2a3438", cloth2: "#4a5a58", head: "hood", hair: "#1e2628", eyes: "#7ce0b8", cape: "#2a3438", weapon: "bell", wcol: "#8a7a4a" } },
  amalgam: { kind: "amalgam", box: { hw: 20, up: 36, down: 4 }, p: { h: 30, col: "#6a7a5a", eyes: "#7ce0b8" } },
  hollowking: { kind: "biped", box: { hw: 24, up: 44, down: 4 }, p: { h: 36, skin: "#e0d8c4", cloth: "#2a2434", cloth2: "#7ce0b8", head: "crown", hair: "#5a6a58", skull: true, bulk: true, big: true, cape: "#1e1826", eyes: "#7ce0b8", weapon: "sword", wcol: "#7ce0b8", wscale: 1.3 } },
  // the crown's own
  knight: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 22, skin: "#e8b990", cloth: "#8a909c", cloth2: "#3a5474", armor: true, head: "helm", hair: "#b8bcc4", weapon: "sword", wcol: "#dde2ea", shield: "kite", shcol: "#3a5474" } },
  paladin: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 22, skin: "#e8b990", cloth: "#d8d0bc", cloth2: "#d8b34a", armor: true, head: "helm", hair: "#e8e2d0", weapon: "mace", wcol: "#e8d47a", shield: "kite", shcol: "#d8b34a" } },
  berserk: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 22, skin: "#e8b990", cloth: "#6a3a2a", cloth2: "#3a2018", head: "hair", hair: "#a04a3f", weapon: "axe", wcol: "#b8bcc4" } },
  champion: { kind: "biped", box: { hw: 24, up: 44, down: 4 }, p: { h: 34, skin: "#e8b990", cloth: "#d8d0bc", cloth2: "#d8b34a", armor: true, head: "crown", hair: "#e8c14a", bulk: true, big: true, weapon: "mace", wcol: "#e8d47a", wscale: 1.4, shield: "kite", shcol: "#d8b34a" } },
  wolfrider: { kind: "beast", box: { hw: 22, up: 32, down: 4 }, p: { len: 30, h: 12, col: "#8f929c", belly: "#aab0ba", head: "wolf", eyes: "#d8b34a", rider: { h: 16, skin: "#e8b990", cloth: "#6a3a2a", head: "hair", hair: "#a04a3f", weapon: "axe", wcol: "#b8bcc4" } } },
  farmer: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 21, skin: "#e8b990", cloth: "#8a7a5a", cloth2: "#5a4a3a", head: "cap", hair: "#d8b860", weapon: "pitchfork", wcol: "#b8bcc4" } },
  heroKnight: { kind: "biped", box: { hw: 18, up: 32, down: 4 }, p: { h: 24, skin: "#e8b990", cloth: "#b8bcc4", cloth2: "#e8c14a", armor: true, head: "helm", hair: "#dde2ea", cape: "#a0303a", weapon: "sword", wcol: "#f0f0f4", shield: "kite", shcol: "#a0303a" } },
  heroHunter: { kind: "biped", box: { hw: 16, up: 30, down: 4 }, p: { h: 22, skin: "#e8c9a2", cloth: "#4e7f3e", cloth2: "#2f4a24", head: "hood", hair: "#3f6a34", cape: "#3a5a30", weapon: "bow", wcol: "#4a3018" } },
  assassinUnit: { kind: "biped", box: { hw: 14, up: 28, down: 4 }, p: { h: 22, skin: "#e8b990", cloth: "#3a3244", cloth2: "#6a5a80", head: "hood", hair: "#2a2434", weapon: "knife", wcol: "#c4c8d0" } },
  skiff: { kind: "skiff", box: { hw: 18, up: 26, down: 6 }, p: {} },
  eagle: { kind: "eagle", fly: true, box: { hw: 24, up: 36, down: 6 }, p: { len: 30, col: "#96764a", wing: "#7a5a34", rider: { h: 15, skin: "#e8b990", cloth: "#7a3c30", head: "hood", hair: "#5a2c24", weapon: "spear", wcol: "#c4c8d0" } } },
};

const PAINTERS = { biped, beast, bat, wraith, dragon, gryphon, ram, amalgam, skiff, eagle };

// necromancer-raised foes wear grave-pale colours and witch-fire eyes
const revive = (p) => {
  const out = { ...p };
  for (const k of ["skin", "cloth", "cloth2", "hair", "col", "belly", "wing", "mane", "cape"]) if (typeof out[k] === "string" && out[k][0] === "#") out[k] = mix(out[k], "#9aa8a0", 0.6);
  out.eyes = "#7ce0b8";
  return out;
};

export const hasRig = (type) => !!RIGS[type];
export const rigDef = (type) => RIGS[type];

const CACHE = new Map();
export const resetRigBakes = () => CACHE.clear();

// A baked frame: { cv, ax, ay } with the anchor (feet, centre) inside it.
export const rigFrame = (type, sheet, frame, variant = "") => {
  const key = `${type}|${sheet}|${frame}|${variant}`;
  let sp = CACHE.get(key);
  if (sp) return sp;
  const def = RIGS[type];
  const { hw, up, down } = def.box;
  let p = def.p;
  if (variant === "revived") p = revive(p);
  const pose = sheet === "fight" ? "fight" : "walk";
  const cv = bakeSprite(hw * 2, up + down, (c) => { c.translate(hw, up); PAINTERS[def.kind](c, { ...p, pose, frame }); });
  if (variant === "white") { const c = cv.getContext("2d"); c.globalCompositeOperation = "source-in"; c.fillStyle = "#f4f2ea"; c.fillRect(0, 0, cv.width, cv.height); }
  sp = { cv, ax: hw, ay: up };
  CACHE.set(key, sp);
  return sp;
};

export const drawRig = (ctx, type, x, y, dir, sheet, frame, variant = "", alpha = 1) => {
  const { cv, ax, ay } = rigFrame(type, sheet, frame, variant);
  const w = cv.width / PX, h = cv.height / PX;
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
  if (dir >= 0) ctx.drawImage(cv, x - ax, y - ay, w, h);
  else { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore(); }
  if (alpha !== 1) ctx.restore();
};

// The pixels of a frame, for the death crumble: [[dx, dy, colour], ...] in
// world units from the anchor, sampled every other art pixel.
export const rigPixels = (type, variant = "") => {
  const key = `${type}|px|${variant}`;
  let px = CACHE.get(key);
  if (px) return px;
  const { cv, ax, ay } = rigFrame(type, "walk", 0, variant);
  const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  px = [];
  for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) {
    const i = (y * cv.width + x) * 4;
    if (d[i + 3] > 120) px.push([(x - ax * PX) / PX, (y - ay * PX) / PX, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]);
  }
  CACHE.set(key, px);
  return px;
};
