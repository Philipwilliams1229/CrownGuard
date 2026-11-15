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

import { canBake } from "../buildkit.js";
import { rgba, ball, glow } from "./kitB.js";
import { getStats } from "../../engine/towers.js";
import * as sunforgeHall from "../pix/hall-sunforge.js";
import { hallPix, drawHallBack, stampPix, pixSprite } from "../pix/halls.js";

const SY = 16;   // the beam leaves from (x, y - 16): draw.js — the shard sits there

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const sun = t.branch === "a", moon = t.branch === "b";
  return { lvl, r4, sun, moon, key: r4 || t.branch || "l" + lvl, ph: 22 + lvl * 3 + (t.branch ? 2 : 0) };
};

// ---- per frame -------------------------------------------------------------------
export const drawSunforge = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const s = spec(t), r4 = s.r4;
  const st = getStats(t);
  const heat = t._idle ? 0 : Math.max(0, Math.min(1, ((t.ramp || 1) - 1) / Math.max(1, (st.rampMax || 3) - 1)));
  const live = !t._idle;
  const col = s.moon ? "#a8c8f0" : "#f0c050", core = s.moon ? "#eef6ff" : "#fff4d0";
  const bake = canBake();
  // The building (render/pix/hall-sunforge.js): its dais, horns, mirrors and the light on its
  // stone. Nobody stands here, so there is no front picture. The shard, halos, orbits and beam
  // are painted live below.
  const H = bake ? hallPix("sunforge", sunforgeHall, { level: s.lvl, branch: t.branch, rank4: t.rank4 }, t.id % 3) : null;
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
  if (H) {
    // light on the stone, in fifths: the shard's rises with the focus and flashes with each
    // pulse of the held beam; the finals' own lights follow what is painted live below
    const fifth = (k) => Math.round(Math.max(0, Math.min(1, k)) * 5) / 5;
    const pulse = live ? Math.max(0, 1 - ((time * 1.6 + t.id * 0.3) % 1) * 3) : 0;
    const hk = { sun: fifth((t._idle ? 0.25 : 0.4) + heat * 0.4 + pulse * 0.2), chan: fifth(0.4 + heat * 0.6) };
    if (r4 === "aa") hk.corona = fifth(0.4 + heat * 0.5 + Math.sin(time * 3) * 0.1);
    if (r4 === "ab") hk.lens = fifth(0.4 + heat * 0.5);
    if (r4 === "ba") hk.well = fifth(0.4 + heat * 0.5);
    if (r4 === "bb") { const c = Math.cos(time * 0.7 + t.id); hk.sunW = c < 0 ? 1 : 0; hk.sunE = c >= 0 ? 1 : 0; }
    drawHallBack(ctx, H, x, y, time, { id: t.id, k: hk });
  }
  // Noon Eternal: the corona flares round the shard
  if (r4 === "aa") {
    for (let i = 0; i < 6; i++) { const a = time * 0.6 + (i / 6) * Math.PI * 2; const r = 15 + Math.sin(time * 5 + i) * 1.5; ctx.fillStyle = "rgba(255,240,180,0.85)"; ctx.fillRect(x + Math.cos(a) * r - 0.6, sy + Math.sin(a) * r - 0.6, 1.2, 1.2); }
  }
  // the Sun Spear: light climbs the spire to the lens
  if (r4 === "ab") {
    const k = (time * (0.6 + heat) + t.id * 0.2) % 1;
    glow(ctx, x, y - 20 - k * 20, 2.5, core, 0.8 * (1 - k));
  }
  // the Eclipse: a sun and a moon wheel round each other over the horns
  const pair = (front) => {
    const a = time * 0.7 + t.id;
    for (const [k, isSun] of [[0, true], [Math.PI, false]]) {
      const sn = Math.sin(a + k);
      if ((sn > 0) !== front) continue;
      const ox = x + Math.cos(a + k) * 9, oy = y - 38 + sn * 2.5;
      if (isSun) { ball(ctx, ox, oy, 3.6, 3.6, "#f4c050", { hi: 0.6, lo: 0.3 }); }
      else { ball(ctx, ox, oy, 3.4, 3.4, "#2a2638", { hi: 0.2, lo: 0.3 }); ctx.fillStyle = "#dce8fa"; ctx.fillRect(ox - 3.4, oy - 1.5, 1, 3); ctx.fillRect(ox - 2.8, oy - 2.6, 1, 1); ctx.fillRect(ox - 2.8, oy + 1.6, 1, 1); }
    }
  };
  if (r4 === "bb") { pair(false); pair(true); }
  // the captive shard, turning between the horns at the beam's height
  glow(ctx, x, sy, 9 + heat * 8 + (live ? Math.sin(time * 9) * 1.5 : 0), col, 0.35 + heat * 0.35);
  const spin = time * (1.2 + heat * 3) + t.id;
  if (H) {
    const wi = Math.round(Math.abs(Math.cos(spin)) * 3);
    stampPix(ctx, pixSprite(`sunshard|${s.moon ? 1 : 0}|${wi}`, () => sunforgeHall.shard(s.moon, wi)), x, Math.round(sy * 2) / 2);
  }
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
