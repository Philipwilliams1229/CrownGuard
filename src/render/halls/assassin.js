// ============ HALL: THE ASSASSIN'S COVERT ============
// A dusk-coloured tent pitched in the grass, its door flap tied back on a
// cut deeper than any night, a knife board by it, and the blade on watch out
// front — who vanishes in a puff of black smoke when the work is on. It
// GROWS: a low lean-to of hides on two poles at one; a bell tent with a
// scalloped valance and a shaded lantern at two; a taller bell tent with a
// weapons rack and a second hood waiting in the doorway at three.
//   The Silent Court dresses in plum and gold and hangs its seal over the
// door: the Kingslayer flies a black banner of a crown run through with a
// dagger; the Open Contract nails a notice board thick with names.
//   The Nightshade Guild greens its canvas and hangs venom vials along the
// eave: the Widow's Kiss sets bubbling poison vats before it; the Plague
// Bearer's ground swells with spore pods that breathe out a sickly haze.
//
// Pixel art: ground and tent bake per form and facing; the watcher is a
// baked frame; smoke, lantern, bubbles and spores are live.

import { spriteCache, stamp, canBake, banner } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, foot, padB, skirtB, beam, planks, crate, rope,
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawHooded, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetAssassinBakes = () => cache.clear();
const BOX = { left: 36, right: 36, up: 64, down: 18 };
const CANVAS = { l: "#7a6e78", a: "#6a5486", aa: "#4e3e62", ab: "#766e78", b: "#5e7250", ba: "#4c5e44", bb: "#747a4a" };
const VENOM = "#b050c0", SPORE = "#c8d060", POLE = "#4a3828";
const LANTERN = 15.5;   // the lantern post's x offset (the live glow follows it)
// the Plague Bearer's pods [dx, dy, r]: kept off the knife board and the tent's wall
const PODS = [[-10.5, 9.5, 2.4], [-5.5, 12.5, 1.8], [14.5, 3.5, 2], [-8.5, 5.5, 1.3], [1, 13.5, 1.4]];

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const court = t.branch === "a", guild = t.branch === "b";
  const canvas = CANVAS[r4 || t.branch || "l"];
  const trim = court ? GOLD : guild ? "#8a6aa8" : "#6a5a80";
  return { lvl, r4, court, guild, canvas, trim, key: r4 || t.branch || "l" + lvl, hw: lvl === 1 ? 11 : lvl === 2 ? 12.5 : 13.5, th: lvl === 1 ? 15 : lvl === 2 ? 22 : 26 };
};

// ---- the ground ------------------------------------------------------------------
const paintGround = (ctx, t, x, y, f) => {
  const s = spec(t);
  padB(ctx, x, y, t.id, { hw: s.hw + 1, stones: 4 });
  if (s.r4 === "bb") {
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 3, 17.5, 12.5, 0, 0, Math.PI * 2); ctx.clip();
    soft(ctx, x, y + 6, 16, 7, [[0, "rgba(120,140,50,0.35)"], [1, "rgba(120,140,50,0)"]]);   // the sickened ground
    ctx.restore();
  }
  skirtB(ctx, x, y, t.id, 3);
};

// ---- the tent ----------------------------------------------------------------------
// A bell tent: a short round wall, a cone of canvas to the pole, a valance
// scalloped round the eave, seams down to it, the door flap tied back.
const bellTent = (ctx, x, y, s, f) => {
  const hw = s.hw, wall = 5, top = y - s.th, col = s.canvas, dx = x - f * 2;
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - hw, y + 1); c.lineTo(x - hw, y + 1 - wall);
    c.quadraticCurveTo(x - hw * 0.5, top + (y - top) * 0.35, x, top);
    c.quadraticCurveTo(x + hw * 0.5, top + (y - top) * 0.35, x + hw, y + 1 - wall);
    c.lineTo(x + hw, y + 1);
    c.ellipse(x, y + 1, hw, 3.5, 0, 0, Math.PI, false);
    c.closePath();
    c.fillStyle = lin(c, x - hw, 0, x + hw, 0, [[0, lighten(col, 0.35)], [0.45, col], [1, darken(col, 0.45)]]);
    c.fill();
    c.save(); c.clip();
    // the roof cone reads a shade lighter than the wall under the valance
    c.fillStyle = rgba(darken(col, 0.5), 0.35);
    c.beginPath(); c.ellipse(x, y + 1 - wall, hw, 3.2, 0, 0, Math.PI, false); c.lineTo(x - hw, y + 5); c.lineTo(x + hw, y + 5); c.closePath(); c.fill();
    // seams from the pole
    c.strokeStyle = rgba(darken(col, 0.6), 0.55); c.lineWidth = 0.7;
    for (const k of [-0.62, -0.22, 0.22, 0.62]) { c.beginPath(); c.moveTo(x, top + 1); c.quadraticCurveTo(x + hw * k * 0.7, top + (y - top) * 0.4, x + hw * k, y + 1 - wall + 3.2 * Math.sqrt(1 - k * k)); c.stroke(); }
    c.restore();
    // the valance: little scallops hung round the eave, in the trim colour
    c.fillStyle = s.trim;
    for (let i = 0; i <= 8; i++) {
      const k = -1 + i / 4, ex = x + hw * k * 0.98, ey = y + 1 - wall + 3.2 * Math.sqrt(Math.max(0, 1 - k * k));
      c.beginPath(); c.arc(ex, ey, 1.2, 0, Math.PI); c.fill();
    }
    c.fillRect(x - hw, y + 1 - wall - 0.6, 0.01, 0.01);
  });
  // the door: the cut, and the flap tied back beside it
  part(ctx, (c) => {
    const dt = y - 12 + (s.lvl === 2 ? 0 : 0);
    c.fillStyle = "#0e0a12";
    c.beginPath(); c.moveTo(dx - 3.8, y + 4.2); c.lineTo(dx - 0.6, dt); c.lineTo(dx + 0.6, dt); c.lineTo(dx + 3.8, y + 4.2); c.closePath(); c.fill();
    c.fillStyle = lin(c, dx, 0, dx + f * 5, 0, [[0, lighten(col, 0.25)], [1, darken(col, 0.2)]]);
    c.beginPath(); c.moveTo(dx + f * 0.6, dt); c.lineTo(dx + f * 3.8, y + 4.2); c.lineTo(dx + f * 6, y + 3.6); c.quadraticCurveTo(dx + f * 4.5, y - 3, dx + f * 0.6, dt); c.closePath(); c.fill();
    c.fillStyle = s.trim; c.fillRect(dx + f * 4.2 - 0.6, y - 2.5, 1.4, 1.2);   // the tie
  });
  // the pole's finial
  part(ctx, (c) => { cylinder(c, x - 0.7, top - 4, 1.4, 5, POLE, { r: 0.6 }); ball(c, x, top - 4.4, 1.2, 1.2, s.court ? GOLD : "#8a8f9a", { hi: 0.5, lo: 0.3 }); });
};

// The pup tent of level one: two poles and a ridge, the canvas pegged down
// either side, seen corner-on — its long side falling away behind.
const leanTo = (ctx, x, y, s, f) => {
  const hw = s.hw, top = y - s.th, col = s.canvas, bx = x - f * 5, btop = top - 2.5;
  // the far slope, running back from the front gable
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x, top); c.lineTo(bx, btop); c.lineTo(bx - f * (hw - 1), y - 1); c.lineTo(x - f * hw, y + 3); c.closePath();
    c.fillStyle = lin(c, bx, btop, x - f * hw, y + 3, [[0, lighten(col, 0.3)], [1, darken(col, 0.15)]]); c.fill();
    c.strokeStyle = rgba(darken(col, 0.5), 0.5); c.lineWidth = 0.6;
    for (const k of [0.33, 0.66]) { c.beginPath(); c.moveTo(x + (bx - x) * k, top + (btop - top) * k); c.lineTo(x - f * hw + (bx - f * (hw - 1) - x + f * hw) * k, y + 3 - 4 * k); c.stroke(); }
  });
  // the front gable, a triangle of canvas with the door cut in it
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - hw, y + 3); c.lineTo(x, top); c.lineTo(x + hw, y + 3); c.closePath();
    c.fillStyle = lin(c, x - hw, 0, x + hw, 0, [[0, lighten(col, 0.1)], [0.5, darken(col, 0.1)], [1, darken(col, 0.45)]]); c.fill();
    c.fillStyle = "#0e0a12"; c.beginPath(); c.moveTo(x - 4, y + 3); c.lineTo(x, top + 4); c.lineTo(x + 4, y + 3); c.closePath(); c.fill();
    c.fillStyle = lighten(col, 0.2); c.beginPath(); c.moveTo(x + f * 0.4, top + 4); c.lineTo(x + f * 4, y + 3); c.lineTo(x + f * 6, y + 2.6); c.closePath(); c.fill();
  });
  // the poles, crossed at the top; the ridge between them
  part(ctx, (c) => {
    c.strokeStyle = POLE; c.lineWidth = 1.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(x, top); c.lineTo(bx, btop);
    for (const [px, py] of [[x, top], [bx, btop]]) { c.moveTo(px - 1.6, py - 2); c.lineTo(px + 1.6, py + 1.5); c.moveTo(px + 1.6, py - 2); c.lineTo(px - 1.6, py + 1.5); }
    c.stroke();
  });
  // guy ropes to pegs
  for (const sg of [-1, 1]) rope(ctx, x, top + 1, x + sg * (hw + 3), y + 5, 1, "#b8a888", 0.6);
};

// A plank knife board with blades stuck in it.
const knifeBoard = (ctx, bx, gy, n) => {
  foot(ctx, bx, gy, 2.4);
  part(ctx, (c) => { c.fillStyle = POLE; c.fillRect(bx - 0.6, gy - 11, 1.2, 11); });
  planks(ctx, bx - 3, gy - 12, 6, 7, "#6a5038", 2, 3);
  part(ctx, (c) => {
    c.strokeStyle = "#c04a3a"; c.lineWidth = 0.6; c.beginPath(); c.arc(bx, gy - 8.5, 1.8, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < n; i++) { const kx = bx - 1.8 + i * 1.8, ky = gy - 11 + (i % 2) * 2; c.fillStyle = STEEL; c.fillRect(kx, ky, 0.8, 3); c.fillStyle = "#3a2a20"; c.fillRect(kx - 0.1, ky - 1.6, 1, 1.6); }
  });
};

// The Open Contract's notice board: two posts, a little roof, names.
const noticeBoard = (ctx, bx, gy, seed) => {
  foot(ctx, bx, gy, 4, 0.3);
  for (const sg of [-1, 1]) { foot(ctx, bx + sg * 3, gy, 1.3); part(ctx, (c) => cylinder(c, bx + sg * 3 - 0.7, gy - 15, 1.4, 15, POLE, { r: 0.6 })); }
  planks(ctx, bx - 4, gy - 13.5, 8, 8, "#7a5a3a", 2.3, seed);
  part(ctx, (c) => { c.fillStyle = "#4a3828"; c.beginPath(); c.moveTo(bx - 5.4, gy - 14.5); c.lineTo(bx, gy - 17.5); c.lineTo(bx + 5.4, gy - 14.5); c.closePath(); c.fill(); });
  part(ctx, (c) => {
    for (let i = 0; i < 5; i++) {
      const px = bx - 3.4 + (i % 3) * 2.3 + hash(seed, i) * 0.5, py = gy - 13 + Math.floor(i / 3) * 3.6 + hash(seed, i + 3) * 0.8;
      c.fillStyle = i % 2 ? "#e8dcb8" : "#f4ecd4"; c.fillRect(px, py, 2.2, 2.8);
      c.fillStyle = "#6a5a50"; c.fillRect(px + 0.4, py + 0.8, 1.4, 0.4); c.fillRect(px + 0.4, py + 1.6, 1, 0.4);
      c.fillStyle = "#b03a32"; c.fillRect(px + 1.4, py + 2, 0.7, 0.7);
    }
    c.fillStyle = STEEL; c.fillRect(bx + 2.6, gy - 12, 0.8, 3.2); c.fillStyle = "#3a2a20"; c.fillRect(bx + 2.5, gy - 13.4, 1, 1.4);   // the knife that pins the latest
  });
};

// A wooden vat of venom on the ground.
const vat = (ctx, vx, gy, w, h) => {
  foot(ctx, vx, gy, w / 2 + 0.5);
  part(ctx, (c) => {
    cylinder(c, vx - w / 2, gy - h, w, h, "#5a4030", { r: 1, hi: 0.3, lo: 0.5 });
    c.fillStyle = IRON; c.fillRect(vx - w / 2, gy - h + 1.2, w, 0.9); c.fillRect(vx - w / 2, gy - 1.8, w, 0.9);
    ball(c, vx, gy - h, w / 2, 1.3, "#3a2a24", { hi: 0.1, lo: 0.1 });
    ball(c, vx, gy - h + 0.2, w / 2 - 0.8, 0.9, VENOM, { hi: 0.5, lo: 0.3 });
  });
};

// A swollen spore pod, lit on its crown, spotted.
const pod = (ctx, px, gy, r, seed) => part(ctx, (c) => {
  shadow(c, px + 0.5, gy, r, r * 0.35, 0.35);
  ball(c, px, gy - r * 0.85, r, r * 0.95, mix(SPORE, "#8a9a40", hash(seed, 1)), { hi: 0.5, lo: 0.45 });
  c.fillStyle = rgba("#5a6a28", 0.7);
  c.fillRect(px - r * 0.3, gy - r * 0.7, 0.8, 0.8); c.fillRect(px + r * 0.3, gy - r * 1.1, 0.7, 0.7);
  c.fillStyle = "#f0f4b0"; c.fillRect(px - 0.4, gy - r * 1.75, 0.8, 0.8);
});

const paintCovert = (ctx, t, x, y, f) => {
  const s = spec(t), lvl = s.lvl, r4 = s.r4;
  // behind: the Kingslayer's banner, high on its own pole
  if (r4 === "aa") {
    const px = x - f * 7;
    part(ctx, (c) => cylinder(c, px - 0.8, y - 46, 1.6, 42, POLE, { r: 0.8, hi: 0.3, lo: 0.5 }));
    part(ctx, (c) => ball(c, px, y - 47, 1.3, 1.3, GOLD, { hi: 0.6, lo: 0.3 }));
    banner(ctx, px - f * 4.4, y - 44, 8, 13, "#241c2c", GOLD, (c, bx, by) => {
      c.fillStyle = GOLD;   // the crown
      c.fillRect(bx - 2.4, by - 0.4, 4.8, 1.8);
      c.fillRect(bx - 2.4, by - 2, 1, 1.6); c.fillRect(bx - 0.5, by - 2.6, 1, 2.2); c.fillRect(bx + 1.4, by - 2, 1, 1.6);
      c.fillStyle = "#e8ecf2";   // the dagger through it
      c.fillRect(bx - 0.4, by - 5, 0.8, 7);
      c.fillStyle = "#b03a32"; c.fillRect(bx - 1.6, by + 2, 3.2, 0.8); c.fillRect(bx - 0.4, by + 2.8, 0.8, 1.6);
    }, { point: true });
  }
  // behind the tent: the weapons rack from three
  if (lvl >= 3 && !r4) part(ctx, (c) => {
    const rx = x - f * 9;
    c.strokeStyle = POLE; c.lineWidth = 1.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(rx - 3, y - 6); c.lineTo(rx - 3, y - 15); c.moveTo(rx + 3, y - 6); c.lineTo(rx + 3, y - 15); c.moveTo(rx - 4, y - 13); c.lineTo(rx + 4, y - 13); c.stroke();
  });
  if (lvl === 1) leanTo(ctx, x, y, s, f);
  else bellTent(ctx, x, y, s, f);
  // the house's sign over the door: a gold seal, or venom vials along the eave
  if (s.court) part(ctx, (c) => { ball(c, x - f * 1, y - 22, 2.2, 2.2, GOLD, { hi: 0.6, lo: 0.4 }); c.fillStyle = darken(GOLD, 0.45); c.fillRect(x - f * 1 - 0.8, y - 22.6, 1.6, 1.2); });
  if (s.guild) for (let i = 0; i < 4; i++) part(ctx, (c) => {
    const vx = x - s.hw * 0.75 + i * s.hw * 0.5, vy = y - 2.4 + Math.abs(i - 1.5) * 0.3;
    c.fillStyle = "#8a8f9a"; c.fillRect(vx - 0.3, vy, 0.6, 1.2);
    ball(c, vx, vy + 2.4, 1.2, 1.4, i % 2 ? "#a8d060" : "#9a6ac0", { hi: 0.6, lo: 0.3 });   // hung off the valance, clear of the ground
  });
  // ---- on the ground in front: every prop stands clear of the tent's wall
  // on its own shadow, and they draw back to front so none cuts another
  const props = [];
  // by the door, stood off to the side: the knife board, or the notice board
  if (r4 === "ab") props.push([y + 6, () => noticeBoard(ctx, x - f * 13.5, y + 6, t.id)]);
  else props.push([y + 6, () => knifeBoard(ctx, x - f * 15, y + 6, lvl + 1)]);
  // the lantern post from two (a closed, shaded lamp), planted in front of the wall's corner
  if (lvl >= 2 && !s.guild) props.push([y + 4, () => {
    const lx = x + f * LANTERN;
    foot(ctx, lx, y + 4, 1.6, 0.35);
    part(ctx, (c) => {
      c.fillStyle = POLE; c.fillRect(lx - 0.6, y - 13, 1.2, 17); c.fillRect(Math.min(lx, lx - f * 2.5) - 0.4, y - 13, 3.3, 1);   // the arm, post to lamp either way round
      cylinder(c, lx - f * 2.5 - 1.4, y - 12, 2.8, 3.6, "#2e2a30", { r: 0.8 });
    });
  }]);
  // Widow's Kiss: two vats of venom before the tent
  if (r4 === "ba") { props.push([y + 11, () => vat(ctx, x - f * 9, y + 11, 6, 4.6)]); props.push([y + 13, () => vat(ctx, x - f * 2.5, y + 13, 4.6, 3.6)]); }
  // Plague Bearer: spore pods swelling round the tent's foot
  if (r4 === "bb") for (const [dx, dy, r] of PODS) props.push([y + dy, () => pod(ctx, x + f * dx, y + dy, r, dx)]);
  // Nightshade (plain): the poisoner's bench with a pestle bowl
  if (s.guild && !r4) props.push([y + 12, () => { foot(ctx, x - f * 5, y + 12, 3.4, 0.4); crate(ctx, x - f * 5, y + 12, 5.5, 3.5, "#6a5038"); }]);
  props.sort((p, q) => p[0] - q[0]).forEach((p) => p[1]());
};

// ---- per frame -------------------------------------------------------------------
export const drawAssassin = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const s = spec(t), r4 = s.r4;
  const f = t._idle ? 1 : (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);
  const bake = canBake(), id5 = t.id % 5;
  const layer = (name, fn) => {
    if (!bake) { fn(ctx, t, x, y, f); return; }
    stamp(ctx, cache.get(`${name}|${s.key}|${s.lvl}|${f}|${name === "g" ? id5 : 0}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => fn(c, { ...t, id: id5 }, BOX.left, BOX.up, f)), x, y, BOX.left, BOX.up);
  };
  layer("g", paintGround);
  layer("c", paintCovert);
  const pal = s.guild ? CREW_FOLK.bladeGuild : CREW_FOLK.blade;
  const hood = (hx, hy, dir, key) => {
    if (bake) stamp(ctx, cache.get(`blade|${key}`, 26, 30, (c) => drawHooded(c, 12, 27, 1, pal)), hx, hy, 12, 27, dir);
    else drawHooded(ctx, hx, hy, dir, pal);
  };
  // the second hood waits in the doorway from three, half in the dark
  if (s.lvl >= 3 && !t.noFolk) {
    hood(x - f * 2, y + 2.5, f, s.guild ? "g" : "c");
  }
  // live: the lantern's shaded light; the vats bubble; the pods breathe
  if (s.lvl >= 2 && !s.guild) glow(ctx, x + f * (LANTERN - 2.5), y - 9.5, 3.5, s.court ? "#f0c060" : "#b0a0e0", 0.55 + 0.15 * Math.sin(time * 3 + t.id));
  if (r4 === "ba") for (const [vx, vy, i] of [[x - f * 9, y + 6.4, 0], [x - f * 2.5, y + 9.4, 1]]) {
    const k = (time * 1.3 + i * 0.5 + t.id * 0.2) % 1;
    glow(ctx, vx, vy, 3, VENOM, 0.35);
    ctx.fillStyle = k < 0.7 ? "#e8a0f0" : "#c060d0"; ctx.fillRect(vx - 1 + i * 1.5, vy - k * 3 - 0.5, 1, 1);
  }
  if (r4 === "bb") for (let i = 0; i < 4; i++) {
    const k = (time * 0.35 + i * 0.25 + t.id * 0.1) % 1;
    const px = x + f * PODS[i][0] + Math.sin(time * 1.5 + i) * 2;
    glow(ctx, px, y + 2 - k * 16, 1.6 + k * 1.5, SPORE, 0.7 * (1 - k));
  }
  // ---- the blade on watch out front, facing the road; when the work is on
  // he goes up in black smoke and is gone until the job is done
  const wx = x + f * 10, wy = y + 9;
  const anim = t.anim || 0;
  if (t.noFolk) return;   // (him, his glint, his smoke and his streak: the build puts him in last)
  if (anim <= 0.4) {
    hood(wx, wy, f, s.guild ? "g" : "c");
    if (Math.sin(time * 2.3 + t.id) > 0.92) glow(ctx, wx + f * 1, wy - 12, 2, "#ffffff", 0.9);   // the whetted edge glints
  } else {
    const k = (anim - 0.4) / 0.6, p = 1 - k;
    if (anim > 0.75) { ctx.save(); ctx.globalAlpha = (anim - 0.75) / 0.25; hood(wx, wy, f, s.guild ? "g" : "c"); ctx.restore(); }
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + t.id, r = 2 + p * 5;
      soft(ctx, wx + Math.cos(a) * r, wy - 8 - i * 3 - p * 4, 4 + p * 3, 4 + p * 2.5, [[0, `rgba(34,26,40,${0.75 * k})`], [0.6, `rgba(52,42,60,${0.45 * k})`], [1, "rgba(52,42,60,0)"]]);
    }
    // the blade leaves toward the road: a streak of steel
    if (k > 0.5) { ctx.fillStyle = `rgba(232,236,242,${(k - 0.5) * 1.6})`; for (let i = 0; i < 3; i++) ctx.fillRect(wx + f * (5 + p * 12 + i * 2.5) - 0.6, wy - 12 + i * 0.4, 1.4, 0.8); }
  }
};
