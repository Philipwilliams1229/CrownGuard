// ============ HALL: THE WARDEN MAGE ============
// A stepped stone altar where the warden stands, arms raised, blessings
// drifting down through the cold. Level two raises fluted pillars with
// candles, level three an open arch with a swinging censer. Then:
//   Rimecaller — the stone frosts over, icicles hang from the arch, drifts
//     of snow on the steps.
//     Absolute Zero: the arch shatters into a cluster of ice-crystal spires
//       rising behind the warden; the ground freezes white.
//     Permafrost Heart: a great heart of blue ice beats on a plinth at his
//       back, frost roots cracking out across the ground.
//   Lifebinder — the arch greens over with vines and flowers, warm light.
//     Guardian's Grace: a gilded arch, a great ward-shield hung behind him.
//     High Cathedral: a gothic wall with a stained-glass rose window, a
//       belfry with a swinging bell, a gilt spire.
// Never roofed: everything tall stands behind him or to either side.
//
// Baked layers: ground (un-inked), back (behind the warden), front (the
// arch's pillars and lintel, which frame him). Flames, the bell, the heart's
// beat, the ward's shimmer and the warden himself are live.

import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part, hash,
  groundBed, footClip, ashlar, banner, flame, vine, rock, posy,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { getStats } from "../../engine/towers.js";
import { drawPriest, PRIEST_FOLK } from "../folk.js";

const CACHE = new Map();
export const resetWardenBakes = () => CACHE.clear();
const baked = (key, w, h, draw, ink = true) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw, ink); CACHE.set(key, sp); }
  return sp;
};
const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore();
};

const ALTAR = { base: "#948c80", a: "#9aa8b0", aa: "#b0c4d0", ab: "#8a9cac", b: "#9a9480", ba: "#c8c0a8", bb: "#b8b0a0" };
const ICE = "#a8e4f0", ICE_DK = "#5aa8c8", ICE_LT = "#e8fbff";
const BOX = { left: 40, right: 40, up: 92, down: 18 };

// (kept inside the footprint: the lower step reaches altarW + 4, a pillar's
// base pillarX + 3)
const altarW = (t) => (t.rank4 ? 11 : t.branch || t.level >= 2 ? 10 : 9);
const pillarX = (t) => 13;
const archH = (t) => (t.rank4 ? 36 : 32);

// A crystal of ice: a long hexagonal prism with a pointed head, lit left.
const crystal = (ctx, x, bottom, w, h, lean = 0) => part(ctx, (c) => {
  const tx = x + lean;
  c.beginPath();
  c.moveTo(x - w / 2, bottom); c.lineTo(tx - w / 2, bottom - h + w * 0.8); c.lineTo(tx, bottom - h); c.lineTo(tx + w / 2, bottom - h + w * 0.8); c.lineTo(x + w / 2, bottom); c.closePath();
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, ICE_LT], [0.45, ICE], [1, ICE_DK]]);
  c.fill();
  c.fillStyle = rgba("#ffffff", 0.7);
  c.fillRect(Math.round((x - w / 4 + lean * 0.5) * 2) / 2, bottom - h + w, 0.5, h * 0.55);
});

const paintGround = (ctx, t, x, y) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const pw = altarW(t);
  const ice = t.branch === "a";
  ctx.save();
  footClip(ctx, x, y);
  groundBed(ctx, x, y + 7, pw + 3, t.id, { earth: ice ? "#8aa0a8" : t.branch === "b" ? "#6a7a42" : "#7c6242" });
  // the rune ring the warden keeps swept
  if (t.level >= 2 || t.branch) {
    const col = ice ? "#c8f0f8" : t.branch === "b" ? "#d8f0a0" : "#a8e0e8";
    ctx.strokeStyle = rgba(col, 0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 6, 16.5, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (ice) {
    // frost across the ground; white and wide at Absolute Zero
    const r = r4 === "aa" ? 18 : 16;
    soft(ctx, x, y + 6, r, r * 0.34, [[0, "rgba(236,250,255,0.55)"], [0.7, "rgba(220,244,252,0.35)"], [1, "rgba(220,244,252,0)"]]);
    if (r4 === "ab") {
      // frost roots cracking out from the heart
      ctx.strokeStyle = rgba("#dff8ff", 0.85); ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        let px = x + Math.cos(a) * 10, py = y + 6 + Math.sin(a) * 3.5;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let k = 0; k < 3; k++) { px += Math.cos(a + (hash(i, k) - 0.5)) * 5; py += Math.sin(a + (hash(i, k) - 0.5)) * 2; ctx.lineTo(px, py); }
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  if (t.branch === "b") for (const [i, [fx, fy]] of [[-15, 7], [15, 8], [-11, 12], [11, 12]].entries()) posy(ctx, x + fx, y + fy, i % 2 ? "#f0d060" : "#e8e4d8", t.id + i);
};

// The altar, and everything that stands behind the warden.
const paintBack = (ctx, t, x, y) => {
  const lvl = t.level, br = t.branch;
  const r4 = t.rank4 ? br + t.rank4 : null;
  const key = r4 || br || "base";
  const pw = altarW(t), px0 = pillarX(t), ah = archH(t);
  const col = ALTAR[key] || ALTAR.base;
  const seed = t.id * 3 + lvl;
  const ice = br === "a", life = br === "b";

  // ---- the tall things at the back
  if (r4 === "aa") {
    // a cluster of ice spires, tallest in the middle
    const spires = [[-12, 22, 4, -1.5], [12, 24, 4, 1.5], [-7, 38, 5, -1], [7, 34, 5, 1], [0, 46, 6, 0], [-15, 13, 3, -1], [15, 15, 3, 1]];
    for (const [dx, h, w, lean] of spires.sort((a, b) => a[1] - b[1]).reverse()) crystal(ctx, x + dx, y - 1, w, h, lean);
  } else if (r4 === "ab") {
    // the plinth; the heart itself beats live
    ashlar(ctx, x - 5, y - 36, 10, 34, col, seed, { course: 3.5, block: 4 });
    part(ctx, (c) => cylinder(c, x - 6.5, y - 37.5, 13, 2.5, lighten(col, 0.15), { r: 1 }));
    for (const s of [-1, 1]) { crystal(ctx, x + s * 7.5, y - 35, 3, 14, s * 2.5); crystal(ctx, x + s * 10, y - 1, 3.4, 16, s * 2); crystal(ctx, x + s * 13.5, y, 2.4, 9, s * 2); }
  } else if (r4 === "bb") {
    // the cathedral's gothic wall, its rose window, a belfry and spire
    const wx = px0 + 2;
    ashlar(ctx, x - wx, y - ah - 4, wx * 2, ah + 4, col, seed, { course: 4, block: 6, band: 4 });
    part(ctx, (c) => {                                              // the gable
      c.beginPath(); c.moveTo(x - wx - 1, y - ah - 4); c.lineTo(x, y - ah - 20); c.lineTo(x + wx + 1, y - ah - 4); c.closePath();
      c.fillStyle = lin(c, x - wx, 0, x + wx, 0, [[0, lighten(col, 0.25)], [0.5, col], [1, darken(col, 0.4)]]); c.fill();
    });
    // the belfry: an open arch on the gable with the bell hung live
    part(ctx, (c) => {
      cylinder(c, x - 5, y - ah - 30, 10, 13, col, { r: 1, hi: 0.35, lo: 0.5 });
      c.fillStyle = "#2a2438"; c.beginPath(); c.moveTo(x - 3, y - ah - 18); c.lineTo(x - 3, y - ah - 25); c.arc(x, y - ah - 25, 3, Math.PI, 0); c.lineTo(x + 3, y - ah - 18); c.closePath(); c.fill();
    });
    part(ctx, (c) => cone(c, x, y - ah - 44, 6, 14, "#5a6a8a", { scallops: 2, sag: 1, hi: 0.42, lo: 0.5 }));
    part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(x - 0.5, y - ah - 51, 1, 8); c.fillRect(x - 2, y - ah - 48.5, 4, 1); });
    // the rose window: a wheel of coloured panes in dressed stone
    const ry = y - ah + 6;
    part(ctx, (c) => {
      c.fillStyle = lighten(col, 0.3); c.beginPath(); c.arc(x, ry, 9, 0, Math.PI * 2); c.fill();
      const panes = ["#c8383a", "#3a6ac8", "#e8c14a", "#3a9a5a", "#8a4ac8", "#3a6ac8", "#e8c14a", "#c8383a"];
      for (let i = 0; i < 8; i++) {
        c.fillStyle = panes[i];
        c.beginPath(); c.moveTo(x, ry); c.arc(x, ry, 7.5, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2); c.closePath(); c.fill();
      }
      c.strokeStyle = "#3a3040"; c.lineWidth = 0.6;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(x, ry); c.lineTo(x + Math.cos(a) * 7.5, ry + Math.sin(a) * 7.5); c.stroke(); }
      c.beginPath(); c.arc(x, ry, 4, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#f8e8a0"; c.beginPath(); c.arc(x, ry, 1.8, 0, Math.PI * 2); c.fill();
    });
  } else if (r4 === "ba") {
    // the ward: a great kite shield hung on the arch's back, gilt-rimmed
    part(ctx, (c) => {
      const sy = y - ah + 2;
      c.beginPath(); c.moveTo(x - 9, sy); c.lineTo(x + 9, sy); c.lineTo(x + 9, sy + 10); c.quadraticCurveTo(x + 7, sy + 19, x, sy + 23); c.quadraticCurveTo(x - 7, sy + 19, x - 9, sy + 10); c.closePath();
      c.fillStyle = lin(c, x - 9, 0, x + 9, 0, [[0, "#f8f0d8"], [0.5, "#e8e0c0"], [1, "#b8ac88"]]); c.fill();
      c.strokeStyle = "#d8b34a"; c.lineWidth = 1.6; c.stroke();
      c.fillStyle = "#d8b34a"; c.fillRect(x - 1, sy + 3, 2, 15); c.fillRect(x - 6, sy + 8, 12, 2);
    });
  }

  // ---- the altar: two steps of dressed stone
  ashlar(ctx, x - pw - 4, y + 3, pw * 2 + 8, 4, darken(col, 0.06), seed, { course: 4, block: 6 });
  part(ctx, (c) => { roundRect(c, x - pw - 4, y + 0.5, pw * 2 + 8, 3, 1); c.fillStyle = lighten(col, 0.18); c.fill(); });
  ashlar(ctx, x - pw, y - 1, pw * 2, 4, col, seed + 1, { course: 4, block: 5 });
  part(ctx, (c) => {
    roundRect(c, x - pw, y - 4.5, pw * 2, 4, 1); c.fillStyle = lighten(col, 0.25); c.fill();
    // an inlaid sigil in the top step
    c.fillStyle = ice ? ICE_DK : life ? "#6a9a4a" : "#6aa8b8";
    c.fillRect(x - 3, y - 3, 6, 0.8); c.fillRect(x - 0.4, y - 4, 0.8, 3);
  });
  // snow on the steps, frosted edges
  if (ice) for (let i = 0; i < 5; i++) part(ctx, (c) => ball(c, x - pw - 2 + i * (pw * 2 + 4) / 4, y + 1 + (i % 2) * 0.5, 2.4, 1.1, "#f0faff", { hi: 0.3, lo: 0.25 }));
  if (ice) for (const s of [-1, 1]) { crystal(ctx, x + s * (pw + 2), y + 6, 2.6, 7, s); crystal(ctx, x + s * (pw + 4.5), y + 7, 2, 5, s * 1.5); }
  if (!br && lvl === 1) crystal(ctx, x + pw + 3, y + 6, 2.4, 6, 1);
  if (life) {
    vine(ctx, x - pw - 3, y - 2, 8, -1, seed, "#4f8a3c", null);
    vine(ctx, x + pw + 3, y - 1, 7, 1, seed + 2, "#4f8a3c", "#f0d060");
  }
};

// The pillars, and the arch that frames the warden (drawn over him — it
// never covers him: he stands in its opening).
const paintFront = (ctx, t, x, y) => {
  const lvl = t.level, br = t.branch;
  const r4 = t.rank4 ? br + t.rank4 : null;
  const key = r4 || br || "base";
  const px0 = pillarX(t), ah = archH(t);
  const col = ALTAR[key] || ALTAR.base;
  const ice = br === "a", life = br === "b";
  const arch = (lvl >= 3 || br) && r4 !== "aa" && r4 !== "ab";
  const pillars = lvl >= 2 || br;
  if (!pillars) return;
  const ptop = arch ? y - ah : y - 12;
  for (const s of [-1, 1]) {
    const px = x + s * px0;
    // a fluted pillar on a square base, a capital on top
    part(ctx, (c) => cylinder(c, px - 3, y + 2, 6, 4, darken(col, 0.08), { r: 1 }));
    part(ctx, (c) => {
      cylinder(c, px - 2, ptop, 4, y + 3 - ptop, col, { r: 1, hi: 0.35, lo: 0.5 });
      c.fillStyle = rgba(darken(col, 0.5), 0.5); c.fillRect(px - 0.5, ptop + 2, 0.5, y - ptop - 1); c.fillRect(px + 1, ptop + 2, 0.5, y - ptop - 1);
    });
    part(ctx, (c) => cylinder(c, px - 3, ptop - 2.5, 6, 3, lighten(col, 0.15), { r: 1, hi: 0.3, lo: 0.4 }));
    if (!arch && r4) crystal(ctx, px, ptop - 2, 3, 8, 0);                                            // an ice lamp
    else if (!arch) part(ctx, (c) => { c.fillStyle = "#e8e0c8"; c.fillRect(px - 1, ptop - 6.5, 2, 4); });   // a candle
    if (life) vine(ctx, px + s * 1.5, ptop + 2, y - ptop - 2, s, t.id + s, "#4f8a3c", "#f0a0b8");
    if (ice && arch) crystal(ctx, px + s * 2.8, y + 5, 2, 6, s);
  }
  if (!arch) return;
  // the lintel, and a keystone set with a gem
  const lt = ptop - 6;
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - px0 - 3.5, lt + 4); c.lineTo(x - px0 - 3.5, lt); c.quadraticCurveTo(x, lt - 5, x + px0 + 3.5, lt); c.lineTo(x + px0 + 3.5, lt + 4); c.quadraticCurveTo(x, lt - 1, x - px0 - 3.5, lt + 4); c.closePath();
    c.fillStyle = lin(c, x - px0, 0, x + px0, 0, [[0, lighten(col, 0.28)], [0.5, col], [1, darken(col, 0.38)]]); c.fill();
  });
  const gem = ice ? ICE : r4 === "ba" ? "#e8c14a" : r4 === "bb" ? "#f0d060" : life ? "#8ce08c" : "#8ce8f0";
  part(ctx, (c) => { cylinder(c, x - 2.5, lt - 4.5, 5, 6, lighten(col, 0.15), { r: 1 }); ball(c, x, lt - 1.5, 1.5, 1.5, gem, { hi: 0.6, lo: 0.3 }); });
  if (r4 === "ba" || r4 === "bb") part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(x - px0 - 3, lt + 2.5, px0 * 2 + 6, 0.8); });
  // icicles along the lintel's underside
  if (ice) part(ctx, (c) => {
    for (let i = 0; i < 7; i++) {
      const ix = x - px0 + 1 + i * (px0 * 2 - 2) / 6, il = 2 + hash(t.id, i) * 3.5;
      const iy = lt + 3.5 - Math.abs(ix - x) / px0 * -0.5 + (1 - Math.abs(ix - x) / px0) * -1.5;
      c.fillStyle = ICE; c.beginPath(); c.moveTo(ix - 0.8, iy); c.lineTo(ix, iy + il); c.lineTo(ix + 0.8, iy); c.closePath(); c.fill();
    }
    for (let i = 0; i < 4; i++) ball(c, x - px0 + 2 + i * (px0 * 2 - 4) / 3, lt - 1, 2.2, 1, "#f0faff", { hi: 0.3, lo: 0.25 });
  });
  if (life) {
    part(ctx, (c) => { for (let i = 0; i < 7; i++) ball(c, x - px0 + i * px0 / 3, lt + 0.5 - Math.sin((i / 6) * Math.PI) * 2, 2.2, 1.6, i % 2 ? "#4f8a3c" : "#6aa04a", { hi: 0.4, lo: 0.4 }); });
    for (let i = 0; i < 4; i++) ball(ctx, x - px0 + 2 + i * (px0 * 2 - 4) / 3, lt - 0.5 - (i % 3 ? 1 : 0), 0.9, 0.9, i % 2 ? "#f0a0b8" : "#f0d060", { hi: 0.6, lo: 0.3 });
  }
  // cloth hung from the lintel ends
  if (!ice) for (const s of [-1, 1]) banner(ctx, x + s * (px0 + 0.5), lt + 5, 3.2, 9, r4 === "bb" ? "#6a2a4a" : r4 === "ba" ? "#e8e0c8" : life ? "#4a7a3c" : "#3a6a8a", "#d8b34a", null, { point: true });
};

export const drawSupportTower = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const st = getStats(t);
  const ice = !t.branch || t.branch === "a";
  const auraCol = r4 === "aa" ? "#b8f0f8" : r4 === "ab" ? "#8cd8f8" : r4 === "ba" ? "#e8d47a" : r4 === "bb" ? "#f0d060" : t.branch === "b" ? "#8ce08c" : ice ? "#7cd4d4" : "#c8e8f0";
  const canBake = typeof document !== "undefined";
  const grown = lvl >= 3 || !!t.branch;
  const form = `${lvl}|${t.branch}|${t.rank4}`, v = t.id % 3, tv = { ...t, id: v };
  const px0 = pillarX(t), ah = archH(t);
  const arch = grown && r4 !== "aa" && r4 !== "ab";

  // the aura shows itself only while it works: a pulse sweeping out
  const live = t._auraLive || 0;
  if (live > 0) {
    const pr = (time * 34 + t.id * 40) % st.range;
    ctx.strokeStyle = rgba(auraCol, (0.22 + Math.min(0.4, live * 0.07)) * (1 - pr / st.range));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
  }
  if (canBake) {
    stamp(ctx, baked(`ground|${form}|${v}`, BOX.left + BOX.right, 40, (c) => paintGround(c, tv, BOX.left, 14), false), x, y, BOX.left, 14);
    stamp(ctx, baked(`back|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBack(c, tv, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  } else paintBack(ctx, t, x, y);

  // ---- live things behind the warden
  if (r4 === "ab") {
    // the heart beats: a double pulse, a glow that swells with it
    const ph = (time * 1.1 + t.id * 0.3) % 1;
    const beat = ph < 0.12 ? ph / 0.12 : ph < 0.24 ? 1 - (ph - 0.12) / 0.12 : ph < 0.34 ? (ph - 0.24) / 0.1 * 0.6 : ph < 0.46 ? 0.6 - (ph - 0.34) / 0.12 * 0.6 : 0;
    const hx = x, hy = y - 45, s = 1 + beat * 0.15;
    glow(ctx, hx, hy, 12 + beat * 6, "#6ad0f8", 0.35 + beat * 0.3);
    ctx.fillStyle = "#3a90c8";
    ctx.beginPath(); ctx.moveTo(hx, hy + 7 * s); ctx.bezierCurveTo(hx - 9 * s, hy + 1 * s, hx - 7 * s, hy - 7 * s, hx, hy - 3 * s); ctx.bezierCurveTo(hx + 7 * s, hy - 7 * s, hx + 9 * s, hy + 1 * s, hx, hy + 7 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8ce0f8";
    ctx.beginPath(); ctx.moveTo(hx, hy + 5 * s); ctx.bezierCurveTo(hx - 6.5 * s, hy + 0.5 * s, hx - 5 * s, hy - 5 * s, hx, hy - 2 * s); ctx.bezierCurveTo(hx + 5 * s, hy - 5 * s, hx + 6.5 * s, hy + 0.5 * s, hx, hy + 5 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8fbff"; ctx.fillRect(hx - 4 * s, hy - 3 * s, 1.5, 1.5); ctx.fillRect(hx - 3, hy - 1, 1, 1);
  }
  if (r4 === "bb") {
    // light through the rose window, and the bell swinging in the belfry
    glow(ctx, x, y - ah + 6, 10, "#f8e8a0", 0.3 + 0.1 * Math.sin(time * 1.3 + t.id));
    const sw = live > 0 ? Math.sin(time * 4 + t.id) * 0.5 : Math.sin(time * 1.2 + t.id) * 0.12;
    ctx.save(); ctx.translate(x, y - ah - 26); ctx.rotate(sw);
    ctx.fillStyle = "#d8b34a";
    ctx.beginPath(); ctx.moveTo(-1.2, 0); ctx.lineTo(1.2, 0); ctx.quadraticCurveTo(2.8, 2, 3.2, 5.5); ctx.lineTo(-3.2, 5.5); ctx.quadraticCurveTo(-2.8, 2, -1.2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f8e08a"; ctx.fillRect(-2, 1.5, 1, 3);
    ctx.fillStyle = "#8a6a2a"; ctx.fillRect(-3.2, 5, 6.4, 0.8);
    ctx.restore();
  }
  if (r4 === "ba") {
    const sh = 0.2 + 0.15 * Math.sin(time * 2.2 + t.id);
    glow(ctx, x, y - ah + 13, 14, "#f8e8a0", sh);
  }
  if (r4 === "aa") glow(ctx, x, y - 26, 14, "#c8f4ff", 0.25 + 0.1 * Math.sin(time * 1.5 + t.id));

  // ---- the warden: arms raised in blessing on a slow rhythm, and while the
  // aura works he holds them up, light pooled in his hands
  const working = live > 0;
  const raising = working ? ((time * 0.8 + t.id * 0.7) % 2) < 1.6 : ((time * 0.9 + t.id * 0.7) % 1.6) < 0.55;
  const pal = PRIEST_FOLK[key] || PRIEST_FOLK.base;
  const dir = t._idle ? (Math.sin(time * 0.4 + t.id) >= 0 ? 1 : -1) : (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);
  const py = y - 1;
  if (canBake) {
    const pcv = baked(`priest|${key}|${raising ? 1 : 0}`, 26, 38, (c) => drawPriest(c, 13, 35, 1, pal, raising));
    stamp(ctx, pcv, x, py, 13, 35, dir);
  } else drawPriest(ctx, x, py, dir, pal, raising);
  if (raising) for (const s of [-1, 1]) glow(ctx, x + s * 6, py - 23, working ? 3.4 : 2.2, auraCol, working ? 0.8 : 0.45);
  // halo
  if (grown) glow(ctx, x, py - 30 + Math.sin(time * 2 + t.id) * 1.2, 5, auraCol, 0.4);

  // ---- the arch and pillars, framing him
  if (canBake) stamp(ctx, baked(`front|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintFront(c, tv, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintFront(ctx, t, x, y);
  // candle flames on the pillars below level three
  if ((lvl >= 2 || t.branch) && !arch && r4 !== "aa" && r4 !== "ab") {
    for (const s of [-1, 1]) flame(ctx, x + s * px0, y - 18, 0.45, time, t.id + s);
  }
  if (r4 === "aa" || r4 === "ab") for (const s of [-1, 1]) {
    // crystal lamps atop the ice pillars
    glow(ctx, x + s * px0, y - 19, 4, ICE, 0.5 + 0.2 * Math.sin(time * 2 + s));
  }
  // the censer on its chain, under the lintel
  if (arch) {
    const lt = y - ah - 6;
    const sw = Math.sin(time * 1.6 + t.id) * 6;
    const cx2 = x + sw, cy2 = lt + 10 + Math.abs(sw) * 0.25;
    ctx.strokeStyle = "#6c727e";
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x, lt + 2); ctx.lineTo(cx2, cy2); ctx.stroke();
    ball(ctx, cx2, cy2 + 2, 2.4, 2.2, "#d8b34a", { hi: 0.5, lo: 0.4 });
    for (let i = 0; i < 3; i++) {
      const py2 = cy2 - 1 - ((time * 12 + i * 6 + t.id * 3) % 14);
      glow(ctx, cx2 + Math.sin(time * 3 + i) * 2, py2, 1.6, "#d8e6f0", 0.5 - i * 0.12);
    }
  }
  // Absolute Zero: shards orbit and snow falls
  if (r4 === "aa") {
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.6 + t.id + i * 2.09;
      const sx = x + Math.cos(ang) * 17, sy2 = y - 24 + Math.sin(ang) * 4;
      ctx.fillStyle = Math.sin(ang) >= 0 ? ICE_LT : ICE;
      ctx.beginPath(); ctx.moveTo(sx, sy2 - 3); ctx.lineTo(sx + 1.4, sy2); ctx.lineTo(sx, sy2 + 3); ctx.lineTo(sx - 1.4, sy2); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const fall = (time * 9 + i * 9 + t.id * 5) % 50;
      ctx.fillRect(x - 22 + i * 8.5 + Math.sin(time * 1.5 + i) * 2, y - 50 + fall, 1, 1);
    }
  }
  // Rimecaller: the floating shard
  if (t.branch === "a" && !t.rank4) {
    const hy = y - 36 + Math.sin(time * 2.5 + t.id) * 3;
    ctx.fillStyle = ICE;
    ctx.beginPath(); ctx.moveTo(x + 12, hy); ctx.lineTo(x + 14.5, hy + 4); ctx.lineTo(x + 12, hy + 9); ctx.lineTo(x + 9.5, hy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ICE_LT; ctx.fillRect(x + 11.4, hy + 2.5, 1.2, 2.5);
  }
  // blessings drifting down inside the aura
  ctx.fillStyle = rgba(auraCol, 0.95);
  for (let i = 0; i < 3; i++) {
    const fall = (time * 22 + i * 15 + t.id * 5) % 40;
    const bx = x + (i === 0 ? -15 : i === 1 ? 16 : -3) + Math.sin(time * 2 + i) * 3;
    const by = y - 36 + fall;
    ctx.fillRect(bx - 2, by - 0.5, 4.5, 1.2); ctx.fillRect(bx - 0.4, by - 2, 1.2, 4.5);
  }
  // at rest a mote climbs off the altar and fades
  if (t._idle) {
    const cyc = ((time / 4) + t.id * 0.29) % 1;
    if (cyc < 0.6) glow(ctx, x + Math.sin(time * 1.3 + t.id) * 3, y - 26 - cyc * 20, 1.5, auraCol, 0.8 * (1 - cyc / 0.6));
  }
};
