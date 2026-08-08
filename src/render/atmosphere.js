// ============ ATMOSPHERE ============
// Everything that sits between the board and your eye: the light a realm is
// seen under, the shadows of clouds crossing it, and whatever is blowing
// through the air. None of it holds state — every particle is a pure function
// of g.time, so pausing freezes it and the sim never has to know it exists.
//
// Three layers, drawn at three different moments in draw():
//   drawCloudShadows  world space, over the ground, under everything alive
//   drawAmbient       world space, over everything (snow falls in front)
//   drawGrade         screen space, last — the realm's light and its vignette

import { W, H, S, CELL } from "../data/constants.js";
import { REALM } from "../data/maps.js";

// ---- light ----------------------------------------------------------------
// Per-realm grade, keyed by REALM.light. `tint` is multiplied over the whole
// board (so it darkens as it colors), `vignette` pulls the corners down, and
// `glow` lays a warm wash along the bottom edge for realms lit from below.
const DEFAULT_LIGHT = { tint: "255,244,222", amount: 0.09, vignette: 0.26 };

let vignetteCache = null;
let vignetteKey = "";
const vignetteFor = (ctx, strength) => {
  if (vignetteKey !== `${strength}`) {
    // radial falloff, transparent until well past the middle
    const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.92);
    gr.addColorStop(0, "rgba(12,10,18,0)");
    gr.addColorStop(0.62, `rgba(12,10,18,${strength * 0.35})`);
    gr.addColorStop(1, `rgba(12,10,18,${strength})`);
    vignetteCache = gr;
    vignetteKey = `${strength}`;
  }
  return vignetteCache;
};

export const drawGrade = (ctx) => {
  const L = REALM.light || DEFAULT_LIGHT;
  if (L.amount > 0) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(${L.tint},${L.amount})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
  if (L.glow) {
    // heat/haze rising off the ground, added rather than mixed
    const gg = ctx.createLinearGradient(0, H, 0, H * 0.45);
    gg.addColorStop(0, `rgba(${L.glow},${L.glowAmount || 0.12})`);
    gg.addColorStop(1, `rgba(${L.glow},0)`);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gg;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
    ctx.globalCompositeOperation = "source-over";
  }
  if (L.vignette > 0) {
    // the gradient is built in buffer space, so it can be cached across frames
    ctx.fillStyle = vignetteFor(ctx, L.vignette);
    ctx.fillRect(0, 0, W, H);
  }
};

// ---- cloud shadows --------------------------------------------------------
// Six soft blobs on a slow easterly drift. Only realms that set `clouds` get
// them — nothing sails over Mistmoor's fog or the Ember Wastes' smoke ceiling.
const CLOUDS = [
  { rx: 168, ry: 96, y: 74, sp: 13, off: 0, a: 0.11 },
  { rx: 124, ry: 70, y: 208, sp: 17, off: 340, a: 0.09 },
  { rx: 208, ry: 112, y: 352, sp: 10, off: 700, a: 0.12 },
  { rx: 96, ry: 56, y: 132, sp: 21, off: 520, a: 0.08 },
  { rx: 150, ry: 84, y: 430, sp: 15, off: 160, a: 0.1 },
  { rx: 118, ry: 66, y: 288, sp: 19, off: 880, a: 0.08 },
];

export const drawCloudShadows = (ctx, time) => {
  if (!REALM.clouds) return;
  const span = W + 560;
  for (const c of CLOUDS) {
    const x = ((c.off + time * c.sp) % span) - 280;
    // shadows breathe a little as the cloud above them deforms
    const rx = c.rx * (1 + Math.sin(time * 0.11 + c.off) * 0.06);
    const gr = ctx.createRadialGradient(x, c.y, 0, x, c.y, rx);
    gr.addColorStop(0, `rgba(24,30,40,${c.a})`);
    gr.addColorStop(0.62, `rgba(24,30,40,${c.a * 0.7})`);
    gr.addColorStop(1, "rgba(24,30,40,0)");
    ctx.save();
    ctx.translate(x, c.y);
    ctx.scale(1, c.ry / rx);
    ctx.translate(-x, -c.y);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, c.y, rx, 0, 7); ctx.fill();
    ctx.restore();
  }
};

// ---- weather --------------------------------------------------------------
const LEAF_COLS = ["#8a9a4e", "#a8b45c", "#c09040", "#7a8a46", "#b8a050"];

export const drawAmbient = (ctx, time) => {
  const kind = REALM.ambient;

  if (kind === "snow") {
    // three depths of snow: far grains, mid flakes, near fat flakes that blur
    for (let i = 0; i < 64; i++) {
      const layer = i % 3;
      const sp = 14 + layer * 16 + (i % 5) * 4;
      const y = (i * 97.3 + time * sp) % H;
      const x = (((i * 143.7 + Math.sin(time * 0.7 + i) * (10 + layer * 9) + time * (4 + layer * 5)) % W) + W) % W;
      const sz = layer === 0 ? 2 : layer === 1 ? 3 : 4;
      ctx.fillStyle = layer === 2 ? "rgba(255,255,255,0.9)" : layer === 1 ? "rgba(244,250,255,0.7)" : "rgba(226,238,248,0.45)";
      ctx.fillRect(S(x), S(y), sz, sz);
    }
    // gusts: faint sheets of blown powder crossing the pass
    for (let i = 0; i < 3; i++) {
      const gx = ((time * (54 + i * 22) + i * 420) % (W + 300)) - 150;
      const gy = 70 + i * 150 + Math.sin(time * 0.5 + i) * 24;
      ctx.fillStyle = "rgba(255,255,255,0.055)";
      for (let k = 0; k < 8; k++) ctx.fillRect(S(gx + k * 17), S(gy + Math.sin(k * 0.8 + time) * 6), 14, 2);
    }
    return;
  }

  if (kind === "embers") {
    for (let i = 0; i < 44; i++) {
      const sp = 18 + (i % 4) * 11;
      const rise = (i * 83.7 + time * sp) % (H + 40);
      const y = H + 20 - rise;
      const x = (((i * 191.3 + Math.sin(time * 1.3 + i * 2) * 11) % W) + W) % W;
      const a = Math.max(0, 1 - rise / (H + 40));
      // embers cool as they climb: yellow at the bottom, dull red at the top
      const hot = a > 0.62;
      ctx.fillStyle = hot
        ? `rgba(248,206,120,${0.35 + 0.55 * a})`
        : i % 3 === 0
          ? `rgba(240,150,80,${0.3 + 0.5 * a})`
          : `rgba(198,84,54,${0.2 + 0.45 * a})`;
      ctx.fillRect(S(x), S(y), i % 6 === 0 ? 3 : 2, i % 6 === 0 ? 3 : 2);
    }
    // ash sifting the other way — down and slow, the sky burning somewhere else
    for (let i = 0; i < 18; i++) {
      const y = (i * 131.7 + time * 11) % H;
      const x = (((i * 227.1 + Math.sin(time * 0.4 + i * 1.7) * 26) % W) + W) % W;
      ctx.fillStyle = "rgba(178,168,160,0.3)";
      ctx.fillRect(S(x), S(y), 2, 2);
    }
    return;
  }

  if (kind === "fireflies") {
    for (let i = 0; i < 3; i++) {
      const fx = ((time * (5 + i * 3) + i * 300) % (W + 360)) - 180;
      const grad = ctx.createLinearGradient(fx - 130, 0, fx + 130, 0);
      grad.addColorStop(0, "rgba(196,212,188,0)");
      grad.addColorStop(0.5, "rgba(196,212,188,0.07)");
      grad.addColorStop(1, "rgba(196,212,188,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(fx - 130, 0, 260, H);
    }
    for (let i = 0; i < 16; i++) {
      const bx = W / 2 + Math.sin(time * 0.22 + i * 2.4) * W * 0.46;
      const by = H / 2 + Math.sin(time * 0.31 + i * 1.7 + 2) * H * 0.42;
      const blink = Math.sin(time * (1.6 + (i % 5) * 0.3) + i * 3);
      if (blink > 0.2) {
        ctx.fillStyle = `rgba(200,232,120,${(blink - 0.2) * 0.3})`;
        ctx.fillRect(S(bx) - 2, S(by) - 2, 6, 6);
        ctx.fillStyle = `rgba(216,244,140,${(blink - 0.2) * 1.1})`;
        ctx.fillRect(S(bx), S(by), 2, 2);
      }
    }
    return;
  }

  if (kind === "leaves") {
    // sunlit pollen hanging in the air — barely moves, catches the light
    for (let i = 0; i < 26; i++) {
      const px = (((i * 173.3 + time * (5 + (i % 4) * 3)) % (W + 40)) + W + 40) % (W + 40) - 20;
      const py = ((i * 89.7 + Math.sin(time * 0.5 + i * 1.3) * 22 + time * 3) % H + H) % H;
      const shine = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(time * 1.7 + i * 2.1));
      ctx.fillStyle = `rgba(248,244,196,${shine})`;
      ctx.fillRect(S(px), S(py), 2, 2);
    }
    // leaves on the wind: carried right and down, tumbling as they go
    for (let i = 0; i < 15; i++) {
      const sp = 34 + (i % 5) * 13;
      const t = time * sp + i * 260;
      const x = ((t % (W + 120)) + W + 120) % (W + 120) - 60;
      const y = ((i * 71.3 + t * 0.34 + Math.sin(time * 1.1 + i) * 20) % (H + 60) + H + 60) % (H + 60) - 30;
      const spin = Math.sin(time * 3.4 + i * 1.9);
      ctx.fillStyle = LEAF_COLS[i % LEAF_COLS.length];
      const sx = S(x), sy = S(y);
      if (spin > 0.35) {          // face on
        ctx.fillRect(sx, sy, CELL * 2, CELL);
        ctx.fillRect(sx + CELL, sy - CELL, CELL, CELL);
      } else if (spin < -0.35) {  // edge on
        ctx.fillRect(sx, sy, CELL, CELL * 2);
      } else {                    // rolling through
        ctx.fillRect(sx, sy, CELL, CELL);
      }
    }
    return;
  }

  if (kind === "wisps") {
    // ground fog first: low, slow sheets dragging across the fen
    for (let i = 0; i < 3; i++) {
      const gx = ((time * (16 + i * 7) + i * 380) % (W + 360)) - 180;
      const gy = 120 + i * 140 + Math.sin(time * 0.3 + i * 2) * 18;
      ctx.fillStyle = "rgba(178,196,188,0.05)";
      for (let k = 0; k < 11; k++) ctx.fillRect(S(gx + k * 20), S(gy + Math.sin(k * 0.6 + time * 0.7) * 8), 18, 4);
    }
    // the dead's own candles: pale motes that rise, drift, and gutter out
    for (let i = 0; i < 20; i++) {
      const life = ((time * (7 + (i % 4) * 3) + i * 61) % 90) / 90;
      const x = (((i * 167.3 + Math.sin(time * 0.4 + i * 1.9) * 30) % W) + W) % W;
      const y = H - 20 - life * (H * 0.65) - Math.sin(time * 0.8 + i) * 6;
      const a = life < 0.15 ? life / 0.15 : life > 0.75 ? (1 - life) / 0.25 : 1;
      const flicker = 0.5 + 0.5 * Math.sin(time * (2.2 + (i % 3)) + i * 2.6);
      ctx.fillStyle = `rgba(124,224,184,${a * flicker * 0.22})`;
      ctx.fillRect(S(x) - 2, S(y) - 2, 6, 6);
      ctx.fillStyle = `rgba(188,244,216,${a * flicker * 0.8})`;
      ctx.fillRect(S(x), S(y), 2, 2);
    }
    // and one great slow soul crossing the board, once in a while
    const soulT = (time * 9) % (W + 500);
    if (soulT < W + 100) {
      const sx2 = soulT - 50;
      const sy2 = H * 0.35 + Math.sin(time * 0.6) * 40;
      ctx.fillStyle = "rgba(124,224,184,0.1)";
      ctx.beginPath(); ctx.arc(S(sx2), S(sy2), 9, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(188,244,216,0.35)";
      ctx.fillRect(S(sx2) - 1, S(sy2) - 1, 3, 3);
      for (let t2 = 1; t2 <= 4; t2++) {
        ctx.fillStyle = `rgba(124,224,184,${0.18 - t2 * 0.04})`;
        ctx.fillRect(S(sx2 - t2 * 7), S(sy2 + Math.sin(time * 2 + t2) * 3), 3, 3);
      }
    }
    return;
  }

  if (kind === "dust") {
    // the Iron Marches: hard wind, cropped turf, grit moving in straight lines
    for (let i = 0; i < 38; i++) {
      const sp = 90 + (i % 6) * 34;
      const x = (((i * 157.1 + time * sp) % (W + 60)) + W + 60) % (W + 60) - 30;
      const y = ((i * 113.7 + Math.sin(time * 0.9 + i * 2.2) * 9 + time * 8) % H + H) % H;
      const len = i % 4 === 0 ? 5 : 3;
      ctx.fillStyle = i % 5 === 0 ? "rgba(206,200,186,0.3)" : "rgba(150,146,138,0.26)";
      ctx.fillRect(S(x), S(y), len, 2);
    }
    // low sheets of dust dragging across the road
    for (let i = 0; i < 2; i++) {
      const gx = ((time * (66 + i * 30) + i * 500) % (W + 340)) - 170;
      const gy = 150 + i * 190 + Math.sin(time * 0.6 + i) * 30;
      ctx.fillStyle = "rgba(196,188,172,0.05)";
      for (let k = 0; k < 10; k++) ctx.fillRect(S(gx + k * 19), S(gy + Math.sin(k * 0.7 + time * 1.2) * 7), 16, 3);
    }
  }
};
