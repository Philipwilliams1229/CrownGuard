// ============ HALL: THE RIVER WATCH ============
// The only hall moored in running water: a plank jetty on driven piles with
// the watchman standing out on it, and the watch lantern burning against the
// current. Its skiffs are units and row the river themselves. It GROWS: a
// bare jetty and a mooring post at one, a rail, a bell and a keg at two, a
// stilted watch hut at the back at three.
//   The Harbour Patrol builds a boathouse with a skiff's nose in it and oars
// racked: the Crown Navy raises a mast with a crow's nest and the admiral's
// long pennant and faces the jetty in stone; the Harpooners mount a great
// harpoon gun on the end. The Fireship Wharf stacks pitch and keeps a
// cauldron smoking: the Hellburner lights a beacon over powder kegs; the
// Chain Boom winds a capstan whose chain runs down into the water.
//
// Pixel art: the whole jetty is baked per form; water ripples, the lantern,
// smoke and the watchman's habits are live.

import { OAKWOOD, TIMBER, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import { masonry } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, ROPE, PITCH, foot, beam, planks, barrel, crate, rope, coil, glint,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawStander } from "../folk.js";

const cache = spriteCache();
export const resetRiverwatchBakes = () => cache.clear();
const BOX = { left: 30, right: 30, up: 66, down: 16 };
const BEACON = -5, CAPSTAN = 7;   // the Hellburner's beacon post and the Chain Boom's capstan (x offsets; live art follows them)
const DECK = "#9a6e42", PILE = "#5a3e26", SHINGLE = "#4a6a8a", NAVY = "#3a5a8a", PITCHRED = "#a04030";
const WATCH = {
  base: { skin: "#e8b990", hood: "#3a4a5a", coat: "#4a6a7a", boots: "#2a2a30", trim: "#c8b070" },
  a: { skin: "#e8b990", hood: "#2a3a5a", coat: "#3a5a8a", boots: "#2a2a30", trim: "#e8e0c8" },
  b: { skin: "#e8b990", hood: "#3a2a28", coat: "#7a3a2a", boots: "#2a2420", trim: "#2e2630" },
};

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level;
  return { lvl, r4: t.rank4 ? t.branch + t.rank4 : null, hw: 9.5 + lvl * 0.5 + (t.branch ? 1 : 0) };   // the deck keeps inside the footprint
};

// A pile driven into the river: wet and dark below the line.
const pile = (ctx, x, top, bottom, w = 2.8) => {
  part(ctx, (c) => cylinder(c, x - w / 2, top, w, bottom - top, PILE, { r: 1, hi: 0.3, lo: 0.5 }));
  part(ctx, (c) => { c.fillStyle = rgba("#2a3a3a", 0.55); c.fillRect(x - w / 2, bottom - 3, w, 3); c.fillStyle = rgba("#6a8a5a", 0.7); c.fillRect(x - w / 2, bottom - 3.6, w, 0.8); });
};

const paintJetty = (ctx, t, x, y) => {
  const { lvl, r4, hw } = spec(t);
  const navy = r4 === "aa", fire = t.branch === "b";
  // the dark of the water under the boards
  shadow(ctx, x + 2, y + 6, hw + 2, 4, 0.34);
  // ---- at the back: what the jetty grows
  if (t.branch === "a") {
    // the boathouse: an open-fronted shed, a skiff's nose in the dark
    const bx = x + 3;
    for (const dx of [-9, 9]) pile(ctx, bx + dx, y - 12, y - 4, 2.4);
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, bx - 9, y - 22, 18, 13, 1); c.fill(); });
    planks(ctx, bx - 10, y - 24, 3, 16, darken(DECK, 0.15), 3, 1);
    planks(ctx, bx + 7, y - 24, 3, 16, darken(DECK, 0.2), 3, 2);
    part(ctx, (c) => {   // the skiff's bow, pale blue with a white strake
      c.beginPath(); c.moveTo(bx - 5, y - 10); c.quadraticCurveTo(bx, y - 16, bx + 5, y - 10); c.closePath();
      c.fillStyle = lin(c, bx - 5, 0, bx + 5, 0, [[0, "#6a8ab0"], [1, "#3a5a80"]]); c.fill();
      c.fillStyle = "#e8e0c8"; c.fillRect(bx - 4, y - 11.4, 8, 0.8);
    });
    part(ctx, (c) => {   // the gable roof
      c.beginPath(); c.moveTo(bx - 13, y - 22); c.lineTo(bx, y - 31); c.lineTo(bx + 13, y - 22); c.closePath();
      c.fillStyle = lin(c, bx - 13, y - 31, bx + 13, y - 22, [[0, lighten(SHINGLE, 0.35)], [0.5, SHINGLE], [1, darken(SHINGLE, 0.4)]]); c.fill();
      c.fillStyle = rgba(darken(SHINGLE, 0.5), 0.35);
      for (let ry = y - 24; ry > y - 30; ry -= 2.4) c.fillRect(bx - 12, ry, 24, 0.7);
    });
    part(ctx, (c) => { c.fillStyle = "#e8e0c8"; c.beginPath(); c.moveTo(bx - 2.4, y - 23); c.lineTo(bx, y - 26); c.lineTo(bx + 2.4, y - 23); c.closePath(); c.fill(); });
  } else if (lvl >= 3 && !fire) {
    // the watch hut on stilts at the back
    const hx = x + 7;
    for (const dx of [-6, 6]) pile(ctx, hx + dx, y - 16, y - 4, 2.2);
    planks(ctx, hx - 7, y - 25, 14, 10, darken(DECK, 0.1), 3.4, 5);
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, hx - 2, y - 23, 4, 4, 0.8); c.fill(); });
    part(ctx, (c) => { c.fillStyle = NAVY; c.fillRect(hx - 4, y - 23, 2, 4); c.fillRect(hx + 2, y - 23, 2, 4); });   // shutters
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(hx - 9.5, y - 24); c.lineTo(hx, y - 32); c.lineTo(hx + 9.5, y - 24); c.closePath();
      c.fillStyle = lin(c, hx - 9, y - 32, hx + 9, y - 24, [[0, lighten("#8e4d3e", 0.35)], [0.5, "#8e4d3e"], [1, darken("#8e4d3e", 0.4)]]); c.fill();
    });
  }
  // the back rail from level two
  if (lvl >= 2 && t.branch !== "a") {
    part(ctx, (c) => { for (const dx of [-hw + 1, -hw * 0.3, hw * 0.3]) cylinder(c, x + dx - 0.8, y - 11, 1.6, 6, OAKWOOD, { r: 0.6 }); });
    beam(ctx, x - hw + 1, y - 10.5, x + hw * 0.3, y - 10.5, 1.2, OAKWOOD, { grain: false });
  }
  // ---- the jetty: piles, then the deck
  for (const dx of [-hw + 2, 0, hw - 2]) pile(ctx, x + dx, y - 3, y + 7);
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - hw, y - 7); c.lineTo(x + hw, y - 7); c.lineTo(x + hw + 1, y - 3); c.lineTo(x - hw - 1, y - 3); c.closePath();
    c.fillStyle = lin(c, x - hw, y - 7, x + hw, y - 3, [[0, lighten(DECK, 0.3)], [1, DECK]]); c.fill();
    c.fillStyle = rgba(darken(DECK, 0.5), 0.4);
    for (let px = x - hw + 3; px < x + hw; px += 3.2) c.fillRect(px, y - 7, 0.6, 4);
    c.fillStyle = rgba(darken(DECK, 0.5), 0.8);
    for (let px = x - hw + 1.5; px < x + hw; px += 6.4) { c.fillRect(px, y - 6, 0.6, 0.6); c.fillRect(px, y - 4, 0.6, 0.6); }   // nail heads
  });
  if (navy) part(ctx, (c) => masonry(c, x - hw - 1, y - 3, hw * 2 + 2, 5, "#a19a8a", { r: 1, course: 2.5, block: 5, hi: 0.3, lo: 0.45 }));
  else planks(ctx, x - hw - 1, y - 3, hw * 2 + 2, 3, darken(DECK, 0.25), 5, 3);
  if (fire) part(ctx, (c) => { c.fillStyle = rgba("#2a1c1c", 0.45); c.fillRect(x + 2, y - 7, 5, 2); c.fillRect(x - 9, y - 6, 3, 2); });   // scorch
  // ---- on the deck, at the back: everything here stands ON the boards
  // (drawn after them, feet on the planking) rather than sunk behind them
  if (fire) {
    // the pitch stacked at the back
    for (const [dx, dy] of [[4, 0], [9.5, 0], [6.75, -6.5]]) barrel(ctx, x + dx, y - 6 + dy, 5.4, 7, "#5a3a2a", { hoop: "#2e2630", mark: r4 === "ba" ? "#e8dcc0" : null });
    if (r4 === "ba") {
      // the beacon: an iron basket on a tall post, stood clear of the mooring post
      const bx = x + BEACON;
      foot(ctx, bx, y - 5.2, 1.8, 0.35);
      beam(ctx, bx, y - 5.5, bx, y - 36, 2.4, darken(OAKWOOD, 0.2), { bands: [0.3, 0.7] });
      part(ctx, (c) => { c.fillStyle = "#3a3440"; c.beginPath(); c.moveTo(bx - 5, y - 42); c.lineTo(bx + 5, y - 42); c.lineTo(bx + 2.5, y - 36); c.lineTo(bx - 2.5, y - 36); c.closePath(); c.fill(); });
      part(ctx, (c) => { c.fillStyle = IRON; for (const dx of [-3, -0.5, 2]) c.fillRect(bx + dx, y - 42, 0.8, 6); });
    }
    if (r4 === "bb") {
      // the capstan on the deck, its bars across the top, the chain off its drum
      const cx = x + CAPSTAN;
      foot(ctx, cx, y - 5, 4.6, 0.4);
      part(ctx, (c) => cylinder(c, cx - 4, y - 13, 8, 8, "#6a6058", { r: 2.5, hi: 0.35, lo: 0.5 }));
      part(ctx, (c) => { c.fillStyle = "#3a3c46"; c.fillRect(cx - 4, y - 10, 8, 1.4); c.fillRect(cx - 4, y - 7.4, 8, 1.4); });
      beam(ctx, cx - 7, y - 13.6, cx + 7, y - 12.4, 1.6, OAKWOOD, { grain: false });
      part(ctx, (c) => ball(c, cx, y - 13.4, 4, 1.5, lighten("#6a6058", 0.2), { hi: 0.3, lo: 0.3 }));
    }
  }
  // the mooring post, and the lantern on it; for the Crown Navy the mast
  // itself carries the lantern (one timber, not two side by side)
  const lx = x - hw + 2;
  if (navy) {
    foot(ctx, lx, y - 4.6, 2.2, 0.4);
    beam(ctx, lx, y - 4.8, lx, y - 58, 2.8, OAKWOOD, { bands: [0.2, 0.55] });
    beam(ctx, lx - 8, y - 44, lx + 8, y - 44, 1.6, OAKWOOD, { grain: false });
    part(ctx, (c) => { cylinder(c, lx - 4, y - 53, 8, 4.5, TIMBER, { r: 1.2, hi: 0.35, lo: 0.45 }); c.fillStyle = GOLD; c.fillRect(lx - 4, y - 51.6, 8, 0.9); });
    rope(ctx, lx, y - 56, x + 15.5, y - 22.5, 3, ROPE, 0.6);   // stayed to the boathouse eave
  } else {
    foot(ctx, lx, y - 4.6, 2.2, 0.4);
    beam(ctx, lx, y - 4.8, lx, y - 24, 3, OAKWOOD, { bands: lvl >= 2 ? [0.7] : null });
  }
  beam(ctx, lx, y - 22, lx - 5, y - 22, 1.4, OAKWOOD, { grain: false });
  part(ctx, (c) => { c.fillStyle = "#3a3a44"; roundRect(c, lx - 6.4, y - 22, 4.4, 5.6, 1.2); c.fill(); c.fillStyle = "#e8c860"; c.fillRect(lx - 5.4, y - 20.6, 2.4, 3); c.fillStyle = "#3a3a44"; c.fillRect(lx - 5, y - 23.2, 1.6, 1.4); });
  coil(ctx, lx + 3, y - 4.6, 2.4);
  // ---- the dressings on the deck
  if (lvl >= 2 && !t.branch) {
    // the alarm bell on its little frame
    beam(ctx, x + hw - 4, y - 5, x + hw - 4, y - 18, 1.6, OAKWOOD, { grain: false });
    beam(ctx, x + hw - 4, y - 17.5, x + hw - 0.5, y - 17.5, 1.4, OAKWOOD, { grain: false });
    part(ctx, (c) => { c.beginPath(); c.moveTo(x + hw - 3, y - 12); c.quadraticCurveTo(x + hw - 3, y - 17, x + hw - 1, y - 17); c.quadraticCurveTo(x + hw + 1, y - 17, x + hw + 1, y - 12); c.closePath(); c.fillStyle = lin(c, x + hw - 3, 0, x + hw + 1, 0, [[0, "#f0d070"], [1, "#9a7a2a"]]); c.fill(); });
    barrel(ctx, x + hw - 8.5, y - 4, 4.6, 5.5, "#7a5634");
  }
  if (r4 === "ab") {
    // the harpoon gun on its swivel, and a rack of barbed irons
    part(ctx, (c) => cylinder(c, x + hw - 7, y - 10, 4, 6, IRON, { r: 1, hi: 0.4, lo: 0.45 }));
    beam(ctx, x + hw - 12, y - 11, x + hw + 5, y - 15, 2.8, "#6a4a2e", { bands: [0.3, 0.8] });
    beam(ctx, x + hw - 7, y - 12.5, x + hw - 3, y - 19, 2, "#6a4a2e", { grain: false });
    beam(ctx, x + hw - 7, y - 12.5, x + hw - 1, y - 7.5, 2, "#6a4a2e", { grain: false });
    part(ctx, (c) => { c.fillStyle = STEEL; c.beginPath(); c.moveTo(x + hw + 4, y - 17); c.lineTo(x + hw + 9, y - 16.4); c.lineTo(x + hw + 4.6, y - 13.6); c.closePath(); c.fill(); c.fillRect(x + hw + 3.5, y - 15.6, 1.5, 0.9); });
    coil(ctx, x + hw - 2, y - 4.2, 2.4, "#b8a070");   // at the jetty end, clear of the watchman's feet
  }
  if (navy) {
    // a bronze swivel gun at the jetty end
    part(ctx, (c) => cylinder(c, x + hw - 6, y - 8, 4, 3, "#5a4a3a", { r: 1 }));
    beam(ctx, x + hw - 8, y - 9, x + hw + 1, y - 11, 2.6, "#b08a4a", { bands: [0.15, 0.9], bandCol: "#7a5a2a" });
  }
  if (fire && r4 !== "bb") {
    // the pitch cauldron on a trivet
    part(ctx, (c) => { for (const dx of [-3, 3]) cylinder(c, x + hw - 5 + dx - 0.6, y - 9, 1.2, 5, "#3a3440", { r: 0.5 }); });
    part(ctx, (c) => { ball(c, x + hw - 5, y - 10, 4.4, 3.2, "#3a3440", { hi: 0.35, lo: 0.45 }); ball(c, x + hw - 5, y - 12.3, 3.3, 1, PITCH, { hi: 0.1, lo: 0.1 }); });
  }
  if (r4 === "bb") {
    // the chain, off the capstan's drum and down over the jetty edge into the river
    part(ctx, (c) => {
      c.fillStyle = "#3a3c46";
      for (let i = 0; i < 9; i++) { const k = i / 8; c.fillRect(x + CAPSTAN - 2 + k * 2 - 1, y - 8 + k * 17, i % 2 ? 1 : 2, 1.6); }
    });
  }
};

export const drawRiverwatchHall = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const { lvl, r4, hw } = spec(t);
  const bake = canBake();
  // ripples where the piles stand, and the current dragging past
  ctx.strokeStyle = "rgba(226,240,246,0.45)"; ctx.lineWidth = 0.8;
  for (const dx of [-hw + 2, 0, hw - 2]) { const r = 3 + ((((time * 6 + dx) % 5) + 5) % 5); ctx.beginPath(); ctx.ellipse(x + dx, y + 7.5, r, r * 0.35, 0, 0, 7); ctx.stroke(); }
  if (r4 === "bb") { const r = 2 + ((time * 4) % 4); ctx.beginPath(); ctx.ellipse(x + CAPSTAN, y + 10, r, r * 0.35, 0, 0, 7); ctx.stroke(); }
  if (bake) stamp(ctx, cache.get(`jetty|${t.level}|${t.branch}|${t.rank4}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintJetty(c, t, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintJetty(ctx, t, x, y);
  // the watch lantern
  const lx = x - hw + 2;
  const lit = 0.7 + 0.3 * Math.sin(time * 3 + t.id);
  glow(ctx, lx - 4.2, y - 19, 6, "#e8c14a", 0.55 * lit);
  // fire and smoke
  if (t.branch === "b" && r4 !== "bb") {
    for (let i = 0; i < 3; i++) { const k = ((time * 0.5 + i / 3 + t.id * 0.13) % 1); soft(ctx, x + hw - 5 + Math.sin(time + i * 2) * 2, y - 14 - k * 16, 2 + k * 3.5, 2 + k * 3.5, [[0, `rgba(58,50,56,${0.45 * (1 - k)})`], [1, "rgba(58,50,56,0)"]]); }
    glow(ctx, x + hw - 5, y - 6, 4, "#f0903a", 0.6 + 0.2 * Math.sin(time * 6));
  }
  if (r4 === "ba") {
    const fl = Math.sin(time * 13 + t.id);
    const bx = x + BEACON;
    glow(ctx, bx, y - 44, 11, "#f0903a", 0.45 + fl * 0.1);
    ctx.fillStyle = "#e8602a"; ctx.beginPath(); ctx.moveTo(bx - 5, y - 42); ctx.quadraticCurveTo(bx - 3 + fl, y - 50, bx + fl, y - 53); ctx.quadraticCurveTo(bx + 3, y - 48, bx + 5, y - 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f8d060"; ctx.beginPath(); ctx.moveTo(bx - 3, y - 42); ctx.quadraticCurveTo(bx, y - 47 - fl, bx + 3, y - 42); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 2; i++) { const k = ((time * 0.4 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, bx + k * 6, y - 56 - k * 16, 3 + k * 4, 3 + k * 4, [[0, `rgba(58,50,56,${0.4 * (1 - k)})`], [1, "rgba(58,50,56,0)"]]); }
  }
  // the watchman out on the boards: now and then he raises a glass to the river
  const pal = WATCH[t.branch || "base"];
  const wx = x - 1.5, wy = y - 4.5;
  const dir = Math.sin(time * 0.4 + t.id) >= 0 ? 1 : -1;
  if (t.noFolk) { /* no watchman yet, nor his glass */ }
  else if (bake) stamp(ctx, cache.get(`watch|${t.branch}`, 26, 30, (c) => drawStander(c, 12, 27, 1, pal)), wx, wy, 12, 27, dir);
  else drawStander(ctx, wx, wy, dir, pal);
  const glass = t._idle ? ((time / 6 + t.id * 0.3) % 1) < 0.4 : ((time / 3 + t.id * 0.3) % 1) < 0.6;
  if (glass && !t.noFolk) {
    ctx.fillStyle = "#241a26"; ctx.fillRect(wx + dir * 1.5 - (dir < 0 ? 6.2 : 0), y - 26.3, 6.2, 2.4);
    ctx.fillStyle = "#c8a048"; ctx.fillRect(wx + dir * 2 - (dir < 0 ? 5.2 : 0), y - 25.8, 5.2, 1.4);
    ctx.fillStyle = "#fff3d2"; ctx.fillRect(wx + dir * 6.6 - (dir < 0 ? 0.8 : 0), y - 25.6, 0.8, 0.8);
  }
  // pennants: the admiral's is long and gold-crowned
  if (r4 === "aa") {
    const wv = Math.sin(time * 4 + t.id) * 1.5;
    ctx.fillStyle = "#241a26";
    const mx = lx + 1;   // the pennant flies off the mast (which stands at the lantern post)
    ctx.beginPath(); ctx.moveTo(mx, y - 58.5); ctx.quadraticCurveTo(mx + 10, y - 58 + wv, mx + 20, y - 56 + wv * 1.4); ctx.lineTo(mx, y - 54.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.moveTo(mx, y - 58); ctx.quadraticCurveTo(mx + 10, y - 57.5 + wv, mx + 19, y - 56 + wv * 1.4); ctx.lineTo(mx, y - 55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = GOLD; ctx.fillRect(mx + 2, y - 57.4, 2.6, 1.6); ctx.fillRect(mx + 1.7, y - 58.2, 0.8, 0.9); ctx.fillRect(mx + 2.9, y - 58.2, 0.8, 0.9); ctx.fillRect(mx + 4.1, y - 58.2, 0.8, 0.9);
    if (Math.sin(time * 1.3 + t.id) > 0.9) glint(ctx, lx, y - 58, 1, 0.9);
  } else {
    const pc = t.branch === "b" ? (r4 === "bb" ? "#6a6058" : PITCHRED) : t.branch === "a" ? (r4 === "ab" ? "#8a6a4a" : NAVY) : "#4a5a7c";
    if (t.branch === "a") pennant(ctx, x + 3, y - 41, 10, pc, time, t.id, 1);
    else pennant(ctx, lx, y - (lvl >= 2 ? 34 : 31), lvl >= 2 ? 11 : 8, pc, time, t.id, -1);
  }
  // the alarm bell swings when there is work on the water
  if (lvl >= 2 && !t.branch && !t._idle && Math.sin(time * 8) > 0.6) glint(ctx, x + hw - 1, y - 14, 0.8, 0.8);
};
