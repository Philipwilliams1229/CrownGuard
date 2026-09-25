// ============ HALL: THE SUNFORGE ============
// An obsidian ring dais cut with a channel that carries the light, curved
// obsidian horns holding the sky open, and between them the captive shard
// turning — held at exactly the height the beam leaves from (y - 16), its
// halo breathing with the focus, light drawn in off the horns and a ring of
// it pulsing out while the beam is held. It GROWS: a flat ring and
// two short horns at one; a stepped pedestal and taller horns at two; a
// second pair of horns behind, gold-banded, and runes in the channel at three.
//   The Solar Lance gilds the horns and stands two golden mirrors on posts to
// throw the sun in: Noon Eternal hangs a blazing corona behind the shard;
// the Sun Spear raises a tall focusing spire with a lens ring over it.
//   The Moon Prism grows its horns into silver-blue crystal: the Gravity
// Well turns a dark ring of stones round the shard; the Eclipse sets a sun
// and a moon circling each other over the horns.
//
// Pixel art: ground, dais and horns bake per form; the shard, halo, orbits,
// sparks and pulses are live.

import { spriteCache, stamp, canBake } from "../buildkit.js";
import { GOLD, foot, padB, skirtB, beam, lighten, darken, rgba, soft, shadow, ball, glow, cylinder, hash, lin, part } from "./kitB.js";
import { getStats } from "../../engine/towers.js";

const cache = spriteCache();
export const resetSunforgeBakes = () => cache.clear();
const BOX = { left: 34, right: 34, up: 72, down: 18 };
const OBS = "#3a3246", SILVER = "#c8d4e4", CRYSTAL = "#9cc4ec";
const SY = 16;   // the beam leaves from (x, y - 16): draw.js — the shard sits there

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const sun = t.branch === "a", moon = t.branch === "b";
  return { lvl, r4, sun, moon, key: r4 || t.branch || "l" + lvl, ph: 22 + lvl * 3 + (t.branch ? 2 : 0) };
};

// ---- the ground and dais ---------------------------------------------------------
const paintGround = (ctx, t, x, y) => {
  const s = spec(t);
  padB(ctx, x, y, t.id, { hw: 13, stones: 5 });
  if (s.moon) { ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 3, 17.5, 12.5, 0, 0, Math.PI * 2); ctx.clip(); soft(ctx, x, y + 3, 16, 8, [[0, "rgba(150,180,230,0.22)"], [1, "rgba(150,180,230,0)"]]); ctx.restore(); }
  skirtB(ctx, x, y, t.id, 3);
};

// One curved horn from the dais up round the shard. `sgn` its side, `back`
// the darker pair behind.
const horn = (ctx, x, y, sgn, top, col, o = {}) => part(ctx, (c) => {
  const bx = x + sgn * (o.base ?? 10), tx = x + sgn * (o.tip ?? 6.5);
  const w = o.w ?? 3.4;
  c.beginPath();
  c.moveTo(bx - w, y + 1);
  c.quadraticCurveTo(x + sgn * 14.5 - w * 0.5, y - SY, tx - 0.8, top);
  c.lineTo(tx + 0.8, top - 0.5);
  c.quadraticCurveTo(x + sgn * 14.5 + w * 0.5, y - SY, bx + w, y + 1);
  c.closePath();
  c.fillStyle = lin(c, x + sgn * 8, 0, x + sgn * 15, 0, sgn < 0 ? [[0, darken(col, 0.3)], [0.5, col], [1, lighten(col, 0.35)]] : [[0, lighten(col, 0.15)], [0.5, col], [1, darken(col, 0.4)]]);
  c.fill();
  if (o.facet) { c.fillStyle = rgba("#ffffff", 0.35); c.fillRect(x + sgn * 12.5 - 0.4, y - SY - 4, 0.8, 9); }
  if (o.bands) for (const k of o.bands) {
    const py = y - SY + (top - y + SY) * k, px = x + sgn * (12.8 - 3.5 * k);
    c.fillStyle = o.bandCol || GOLD; c.fillRect(px - 2.1, py, 4.2, 1.4);
    c.fillStyle = rgba("#fff3d2", 0.7); c.fillRect(px - 1.8, py, 1, 0.6);
  }
});

// A crystal pillar: a hexagonal shard with a lit facet and a point.
const crystal = (ctx, cx, gy, w, h, col, lean = 0) => part(ctx, (c) => {
  c.beginPath();
  c.moveTo(cx - w / 2, gy); c.lineTo(cx - w / 2 + lean, gy - h); c.lineTo(cx + lean, gy - h - w * 0.8); c.lineTo(cx + w / 2 + lean, gy - h); c.lineTo(cx + w / 2, gy); c.closePath();
  c.fillStyle = lin(c, cx - w / 2, 0, cx + w / 2, 0, [[0, lighten(col, 0.45)], [0.45, col], [1, darken(col, 0.35)]]);
  c.fill();
  c.fillStyle = rgba("#ffffff", 0.45); c.fillRect(cx - w / 4 + lean * 0.5, gy - h + 1, 0.8, h * 0.6);
});

const paintAltar = (ctx, t, x, y) => {
  const s = spec(t), lvl = s.lvl, r4 = s.r4;
  const chan = s.moon ? "#7aa0d8" : "#e0a040";
  const hornCol = s.sun ? "#4a3a36" : r4 === "ba" ? "#4a4270" : s.moon ? "#56648a" : OBS;
  const top = y - s.ph;
  // behind everything: the Sun Spear's spire
  if (r4 === "ab") {
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 3, y - 2); c.lineTo(x - 1.2, y - 62); c.lineTo(x, y - 66); c.lineTo(x + 1.2, y - 62); c.lineTo(x + 3, y - 2); c.closePath();
      c.fillStyle = lin(c, x - 3, 0, x + 3, 0, [[0, lighten(OBS, 0.35)], [0.5, OBS], [1, darken(OBS, 0.4)]]); c.fill();
      c.fillStyle = GOLD; for (const py of [-30, -44, -54]) c.fillRect(x - 2.4 + (-py - 30) * 0.02, y + py, 4.8 - (-py - 30) * 0.04, 1.2);
    });
    part(ctx, (c) => { c.strokeStyle = GOLD; c.lineWidth = 1.3; c.beginPath(); c.ellipse(x, y - 40, 5, 1.8, 0, 0, Math.PI * 2); c.stroke(); });   // the lens ring
    part(ctx, (c) => ball(c, x, y - 40, 2.4, 2.4, "#fff0b0", { hi: 0.6, lo: 0.3 }));
    part(ctx, (c) => ball(c, x, y - 66, 1.4, 1.8, GOLD, { hi: 0.6, lo: 0.3 }));
  }
  // behind: the Noon corona, a gold sunburst the shard hangs in
  if (r4 === "aa") part(ctx, (c) => {
    const cy = y - SY;
    c.fillStyle = "#e0a838";
    c.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 9 : 15 - (i % 4 === 0 ? 0 : 2.5); c.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.95); }
    c.closePath(); c.fill();
    ball(c, x, cy, 9.5, 9, "#f4d070", { hi: 0.4, lo: 0.3 });
  });
  // the dais: a ring of obsidian with a channel of light cut round it
  foot(ctx, x + 1, y + 3.5, 14, 0.35);
  part(ctx, (c) => ball(c, x, y + 2.5, 15, 6.5, OBS, { hi: 0.35, lo: 0.5 }));
  part(ctx, (c) => ball(c, x, y + 1, 12, 4.6, lighten(OBS, 0.1), { hi: 0.35, lo: 0.45 }));
  part(ctx, (c) => {
    c.strokeStyle = chan; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y + 1, 8.5, 2.8, 0, 0, Math.PI * 2); c.stroke();
    if (lvl >= 3) { c.fillStyle = lighten(chan, 0.4); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; c.fillRect(x + Math.cos(a) * 11 - 0.5, y + 1 + Math.sin(a) * 3.8 - 0.4, 1, 0.8); } }
  });
  // far horns (from three)
  if (lvl >= 3) for (const sg of [-1, 1]) horn(ctx, x, y - 3, sg, top + 3, darken(hornCol, 0.25), { base: 6, tip: 4, w: 2.4 });
  // the pedestal step from two
  if (lvl >= 2) {
    part(ctx, (c) => cylinder(c, x - 5, y - 4, 10, 5, darken(OBS, 0.05), { r: 1.5, hi: 0.35, lo: 0.5 }));
    part(ctx, (c) => ball(c, x, y - 4, 5, 1.8, lighten(OBS, 0.2), { hi: 0.3, lo: 0.3 }));
    part(ctx, (c) => { c.fillStyle = chan; c.fillRect(x - 0.6, y - 3.6, 1.2, 4); });
  }
  // the Moon Prism: crystal clusters on the dais
  if (s.moon) for (const [dx, dy, w, h, l] of [[-11, 3, 2.6, 5, -0.6], [-8.5, 5, 2, 3.5, 0.3], [9.5, 4.5, 2.4, 4.5, 0.5], [12, 2.5, 1.8, 3, 0]]) crystal(ctx, x + dx, y + dy, w, h, r4 === "ba" ? "#8a80c0" : CRYSTAL, l);
  // the near horns: obsidian, gilded, or grown into crystal pillars
  const bands = s.sun ? [0.2, 0.55, 0.85] : lvl >= 3 ? [0.3, 0.75] : null;
  if (s.moon) for (const sg of [-1, 1]) {
    horn(ctx, x, y, sg, top, hornCol, { bands: [0.15], bandCol: SILVER });
    crystal(ctx, x + sg * 7.5, y - s.ph + 8, 3, 6, CRYSTAL, -sg * 0.8);
  } else for (const sg of [-1, 1]) horn(ctx, x, y, sg, top, hornCol, { bands, facet: s.sun });
  if (s.sun) for (const sg of [-1, 1]) part(ctx, (c) => ball(c, x + sg * 6.5, top - 1.2, 1.5, 1.8, GOLD, { hi: 0.6, lo: 0.3 }));
  // the Solar Lance's mirrors: gold dishes on posts, turned in to the shard
  if (s.sun && r4 !== "ab") for (const sg of [-1, 1]) {
    const mx = x + sg * 15;
    foot(ctx, mx, y + 6.5, 2.4);
    part(ctx, (c) => cylinder(c, mx - 0.8, y - 7, 1.6, 13.5, "#5a4a3a", { r: 0.7 }));
    part(ctx, (c) => {
      c.save(); c.translate(mx, y - 10); c.rotate(-sg * 0.5);
      ball(c, 0, 0, 2, 4.2, "#8a6a2a", { hi: 0.3, lo: 0.4 });
      ball(c, -sg * 0.7, 0, 1.4, 3.6, "#f4d878", { hi: 0.7, lo: 0.25 });
      c.restore();
    });
  }
};

// ---- per frame -------------------------------------------------------------------
export const drawSunforge = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const s = spec(t), r4 = s.r4;
  const st = getStats(t);
  const heat = t._idle ? 0 : Math.max(0, Math.min(1, ((t.ramp || 1) - 1) / Math.max(1, (st.rampMax || 3) - 1)));
  const live = !t._idle;
  const col = s.moon ? "#a8c8f0" : "#f0c050", core = s.moon ? "#eef6ff" : "#fff4d0";
  const bake = canBake(), id5 = t.id % 5;
  const layer = (name, fn) => {
    if (!bake) { fn(ctx, t, x, y); return; }
    stamp(ctx, cache.get(`${name}|${s.key}|${s.lvl}|${name === "g" ? id5 : 0}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => fn(c, { ...t, id: id5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  };
  layer("g", paintGround);
  const sy = y - SY + Math.round(Math.sin(time * 1.6 + t.id) * 1);
  // the Gravity Well's ring: the far half of the orbit goes behind the dais art
  const orbit = (front) => {
    for (let i = 0; i < 9; i++) {
      const a = time * (0.8 + heat * 1.6) + (i / 9) * Math.PI * 2;
      const sn = Math.sin(a);
      if ((sn > 0) !== front) continue;
      const ox = x + Math.cos(a) * 14, oy = sy + sn * 4.5 - Math.cos(a) * 2;
      ball(ctx, ox, oy, i % 3 ? 1.9 : 2.5, i % 3 ? 1.6 : 2.1, i % 3 ? "#3a2c4c" : "#6a4a90", { hi: 0.5, lo: 0.4 });
      if (!(i % 3)) glow(ctx, ox, oy, 2.4, "#9a70d8", 0.35);
    }
  };
  const ring = (front) => {
    ctx.strokeStyle = front ? "rgba(42,26,58,0.85)" : "rgba(42,26,58,0.5)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x, sy, 14, 4.8, -0.14, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
  };
  if (r4 === "ba") { glow(ctx, x, sy, 14, "#2a1a3a", 0.5); ring(false); orbit(false); }
  layer("a", paintAltar);
  // the channel's light
  glow(ctx, x, y + 1, 9, col, 0.3 + heat * 0.35);
  // Noon Eternal: the corona flares round the shard
  if (r4 === "aa") {
    glow(ctx, x, sy, 17 + heat * 6 + Math.sin(time * 3) * 1.5, "#ffb838", 0.35 + heat * 0.3);
    for (let i = 0; i < 6; i++) { const a = time * 0.6 + (i / 6) * Math.PI * 2; const r = 15 + Math.sin(time * 5 + i) * 1.5; ctx.fillStyle = "rgba(255,240,180,0.85)"; ctx.fillRect(x + Math.cos(a) * r - 0.6, sy + Math.sin(a) * r - 0.6, 1.2, 1.2); }
  }
  // the Sun Spear: light climbs the spire to the lens
  if (r4 === "ab") {
    const k = (time * (0.6 + heat) + t.id * 0.2) % 1;
    glow(ctx, x, y - 20 - k * 20, 2.5, core, 0.8 * (1 - k));
    glow(ctx, x, y - 40, 4 + heat * 3, col, 0.4 + heat * 0.4);
  }
  // the Eclipse: a sun and a moon wheel round each other over the horns
  const pair = (front) => {
    const a = time * 0.7 + t.id;
    for (const [k, isSun] of [[0, true], [Math.PI, false]]) {
      const sn = Math.sin(a + k);
      if ((sn > 0) !== front) continue;
      const ox = x + Math.cos(a + k) * 9, oy = y - 38 + sn * 2.5;
      if (isSun) { glow(ctx, ox, oy, 7, "#f4c050", 0.55); ball(ctx, ox, oy, 3.6, 3.6, "#f4c050", { hi: 0.6, lo: 0.3 }); }
      else { glow(ctx, ox, oy, 6, "#a8c8f0", 0.4); ball(ctx, ox, oy, 3.4, 3.4, "#2a2638", { hi: 0.2, lo: 0.3 }); ctx.fillStyle = "#dce8fa"; ctx.fillRect(ox - 3.4, oy - 1.5, 1, 3); ctx.fillRect(ox - 2.8, oy - 2.6, 1, 1); ctx.fillRect(ox - 2.8, oy + 1.6, 1, 1); }
    }
  };
  if (r4 === "bb") { pair(false); pair(true); }
  // the captive shard, turning between the horns at the beam's height
  glow(ctx, x, sy, 9 + heat * 8 + (live ? Math.sin(time * 9) * 1.5 : 0), col, 0.35 + heat * 0.35);
  const spin = time * (1.2 + heat * 3) + t.id;
  const w = 2.5 + Math.round(Math.abs(Math.cos(spin)) * 3);
  const shard = (hw, hh, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, sy - hh); ctx.lineTo(x + hw, sy); ctx.lineTo(x, sy + hh); ctx.lineTo(x - hw, sy); ctx.closePath(); ctx.fill(); };
  shard(w + 1, 8, "#241a26");
  shard(w, 7, s.moon ? "#7aa0d8" : "#e0a040");
  shard(w * 0.6, 5, col);
  shard(w * 0.3, 3, core);
  // when the beam is held: light drawn in from the horns to the shard
  if (live) for (const sg of [-1, 1]) {
    const k = (time * 2.2 + (sg > 0 ? 0.5 : 0) + t.id * 0.1) % 1;
    ctx.fillStyle = core; ctx.fillRect(x + sg * (12 - k * 10) - 0.6, sy + (1 - k) * 4 - 0.6, 1.2, 1.2);
  }
  if (heat > 0.5) for (let i = 0; i < 4; i++) { const a = time * 3 + i * 1.57 + t.id; const r = 8 + ((time * 20 + i * 9) % 12); glow(ctx, x + Math.cos(a) * r, sy + Math.sin(a) * r * 0.6, 1.4, core, 0.9 * heat); }
  if (r4 === "ba") { ring(true); orbit(true); }
  // the held beam pulses a ring of light out of the shard
  if (live) {
    const k = (time * 1.6 + t.id * 0.3) % 1;
    ctx.strokeStyle = `rgba(${s.moon ? "200,224,255" : "255,236,170"},${0.7 * (1 - k)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, sy, 5 + k * 12, (5 + k * 12) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // idle: a mote climbs off it
  if (t._idle) { const cyc = ((time / 4) + t.id * 0.29) % 1; if (cyc < 0.6) glow(ctx, x + Math.sin(time * 1.3 + t.id) * 3, sy - 8 - cyc * 18, 1.5, col, 0.8 * (1 - cyc / 0.6)); }
};
