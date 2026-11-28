// ============ HALL: THE BLADEWHEEL ============
// A flat wheel of blades on an upright post, spun through a gearbox by the
// wheelwright at the crank. It GROWS: an oak post in a ring of stakes with
// six blades at one, a stone drum and an iron-collared post at two, a
// dressed and capped drum with a double ring of ten at three.
//   The Razor Gale puts a windmill behind it, and the wheel screams: the
// Steel Tempest shoes the sails in steel and stacks a second wheel; the
// Hamstringer hangs barbed chains off the rim and stakes snares round it.
//   The Brazier Wheel trades blades for fire pots and stands on a brick
// furnace: the Solar Crown raises a gilded sun over it, the Wildheart Pyre
// grows its post into a living, smouldering trunk with its flames awake.
//
// Pixel art: the base and the sails are baked; the wheel is baked squashed
// at a few phases of one blade's turn, so it spins in crisp steps. Flames,
// sparks and chains are painted live.

import { canBake } from "../buildkit.js";
import { stampTorch } from "../torchflame.js";
import { pxArc, pxRing } from "./pixrings.js";
import { readiness, glint, rgba, glow } from "./kitB.js";
import * as engineerFig from "../pix/fig-engineer.js";
import { crew, drawCrewPix, loopFrame, crewMark } from "../pix/crews.js";
import * as spikerHall from "../pix/hall-spiker.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the wheelwright: fig-engineer.js. Its `wheel` clips ride this
// hall's crank (CRANK from crewSpot, CRANK_RX / RY) and its `bar` clips the level-one
// hand-bar (BAR): the same numbers, in art pixels. A turn is 8 frames.
const ENG = crew("engineer", engineerFig);

const SQ = 0.5, PHASES = 4;
// The wheelwright stands on open ground before the drum (whose front edge is
// at y + 5), feet inside FOOT_NARROW; the crank he turns sits at his hands.
const crewSpot = (s) => (s.lvl === 1 && !s.branch ? [-9.5, 6.8] : [-7.5, 8]);
const CRANK = { x: -4, y: -5 };   // the crank's hub, from (x, y)
const CRANK_RX = 1.9, CRANK_RY = 1.1;   // its handle's throw (a crank laid flat)
// the level-one hand-bar's end, from the wheelwright's feet, and its stroke
const BAR = { hub: [6.4, -13.4], rx: 0.9, ry: 0.5, push: true };

const spec = (t) => {
  const lvl = t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const gale = t.branch === "a", fire = t.branch === "b";
  return {
    lvl, r4, gale, fire, branch: t.branch,
    rr: 8 + lvl + (t.branch ? 1.5 : 0),
    n: fire ? 8 : t.branch ? 12 : 4 + lvl * 2,
    wy: 22 + lvl + (t.branch ? 2 : 0),        // how high the wheel rides
    key: r4 || t.branch || "l" + lvl,
  };
};

// A tongue of fire: two stacked pixel flames that flicker.
const flame = (ctx, x, y, s, time, seed, col = "#f0903a", core = "#ffe08a") => {
  const fl = Math.sin(time * 14 + seed * 2.3), h = s * (3 + fl * 0.8);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x - s * 1.3, y); ctx.quadraticCurveTo(x - s * 0.6, y - h * 0.6, x + fl * 0.4, y - h); ctx.quadraticCurveTo(x + s * 0.7, y - h * 0.5, x + s * 1.3, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.quadraticCurveTo(x, y - h * 0.55, x + s * 0.6, y); ctx.closePath(); ctx.fill();
};

export const drawBladewheel = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const s = spec(t), { lvl, r4, gale, fire, rr, n } = s;
  const bake = canBake();
  const r = readiness(t), anim = t.anim || 0;
  // the building: pix/hall-spiker.js through pix/halls.js. It bakes what
  // stands still; the wheel, the sails and the sun are its sprites, stamped live below at the
  // old hub, radius and phases. Everything else that moves is painted here as before.
  const H = bake ? hallPix("spiker", spikerHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, t.id % 3) : null;

  // the fire ring's light on the post and the furnace top swells with the flames
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, k: { ring: t._idle ? 0.5 : Math.min(1, 0.45 + r * 0.35 + anim * 0.5) } });
  if (H && gale) {
    // the sails turn on the mast's head, before the wheel
    const sp = time * (t._idle ? 0.8 : 3.2) + t.id, k3 = Math.floor((sp / (Math.PI / 2)) * 3) % 3;
    stampPix(ctx, pixSprite(`bw|sails|${t.rank4 || ""}|${k3}`, () => spikerHall.sailsPix(r4, k3)), x + 11, y - 42);
  }

  // the wheel: it winds up (rises, quickens) before it bites, and kicks down
  const wind = t._idle ? 0 : r > 0.85 ? (r - 0.85) / 0.15 : 0;
  const speed = (gale ? 10 : fire ? 3 : 4.5) * (t._idle ? 0.3 : 1 + wind * 0.8 + anim * 1.5);
  const spin = time * speed + t.id;
  const step = (Math.PI * 2) / n;
  const k = Math.floor(((spin % step) + step) % step / step * PHASES);
  const wy0 = y - s.wy - wind * 1.5 + anim * 2.5;
  const wy = Math.round(wy0 * 2) / 2;   // the new wheel moves by whole art pixels
  // fire: a flame on every pot, swelling as the ring gathers, and the sun. `front` false = the half
  // behind the wheel (drawn before it), true = the half in front (after it).
  const firePass = (front) => {
    if (!fire) return;
    const swell = t._idle ? 0.7 : 0.6 + r * 0.5 + anim * 0.6;
    const col = r4 === "ba" ? "#f4c040" : r4 === "bb" ? "#f07030" : "#f0903a";
    const core = r4 === "ba" ? "#fff8d8" : "#ffe08a";
    const ph = (k / PHASES) * step;
    const pots = [];
    for (let i = 0; i < n; i++) { const a = ph + i * step; pots.push([x + Math.cos(a) * (rr + 0.5), wy + Math.sin(a) * (rr + 0.5) * SQ - 0.8, i]); }
    pots.sort((a, b) => a[1] - b[1]);
    // each pot's flame: the owner's Round 20 A (render/torchflame.js), sized as the old tongue; left under the night's
    // shade (not queued) so the back half still passes behind the wheel
    for (const [px, py, i] of pots) if ((py >= wy - 0.8) === front) { const s = 0.9 * swell; stampTorch(ctx, px, py + 0.5, s * 4.16, s * 6.9, time, (i + t.id) % 7, i + t.id); }
    if (anim > 0.4) {
      const rg = rr + 10 + (1 - anim) * 14;   // (owner, 2026-11-28: starts clear of the wheel, as the flame ring)
      pxArc(ctx, x, wy, rg, rg * SQ, `rgba(255,200,110,${anim * 0.8})`, front ? { th: 2, a0: 0, a1: Math.PI } : { th: 2, a0: Math.PI, a1: Math.PI * 2 });
    }
  };
  firePass(false);
  if (H) stampPix(ctx, pixSprite(`bw|wheel|${s.key}|${k}`, () => spikerHall.wheelPix(s, k)), x, wy);
  if (r4 === "aa") {
    // the Steel Tempest's second wheel, counter-turning above
    const k2 = PHASES - 1 - k;
    if (H) stampPix(ctx, pixSprite(`bw|wheel2|${k2}`, () => spikerHall.wheelPix(s, k2, true)), x, wy - 7);   // its shaft is in the sprite
  }
  if (r4 === "ab") {
    // barbed chains flung out from the rim, hooks on the ends
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * Math.PI * 2;
      const cx0 = x + Math.cos(a) * (rr - 1), cy0 = wy + Math.sin(a) * (rr - 1) * SQ;
      const fling = t._idle ? 3 : 9;
      const ex = cx0 + Math.cos(a) * fling, ey = cy0 + Math.sin(a) * fling * SQ + (t._idle ? 6 : 2);
      ctx.lineCap = "butt";
      ctx.strokeStyle = "#241a26"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = "#9aa0ac"; ctx.lineWidth = 0.8; ctx.setLineDash([0.8, 0.8]);
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#241a26"; ctx.fillRect(ex - 1.6, ey - 0.6, 3.2, 3);
      ctx.fillStyle = "#c4c8d0"; ctx.fillRect(ex - 1, ey, 0.9, 2); ctx.fillRect(ex - 1, ey + 1.4, 2, 0.8);
      ctx.fillStyle = "#a04a3a"; ctx.fillRect(ex + 0.5, ey - 0.2, 0.8, 1);
    }
  }
  // (the fire pots and the flash ring are painted by firePass above: the half of the ring behind
  // the wheel before it, the half in front after, so the flames read as coming out of the wheel)
  firePass(true);
  if (r4 === "ba") {
    const sy = wy - 18 + Math.sin(time * 2 + t.id) * 0.6;
    glow(ctx, x, sy, 14, "#f8d870", 0.3 + 0.15 * r);
    if (H) stampPix(ctx, pixSprite("bw|sun", () => spikerHall.sunPix()), x, Math.round(sy * 2) / 2);
  }
  if (r4 === "bb") {
    // the flames are awake: two imps hop the rim (they wake with the crew)
    if (!t.noFolk) for (let i = 0; i < 2; i++) {
      const a = time * 1.3 + i * Math.PI + t.id;
      const ix = x + Math.cos(a) * (rr + 3), iy = wy + Math.sin(a) * (rr + 3) * SQ - 2 - Math.abs(Math.sin(time * 6 + i * 2)) * 3;
      glow(ctx, ix, iy, 4, "#f07a3a", 0.5);
      flame(ctx, ix, iy + 3, 1.7, time, i * 7, "#e85a2a", "#f8c050");
      ctx.fillStyle = "#2a1c1c"; ctx.fillRect(ix - 1.4, iy - 0.6, 0.9, 1.1); ctx.fillRect(ix + 0.5, iy - 0.6, 0.9, 1.1);
    }
    for (let i = 0; i < 3; i++) glow(ctx, x - 6 + i * 6 + Math.sin(time * 3 + i) * 2, y - 6 - ((time * 16 + i * 11 + t.id * 5) % 30), 1.4, "#f0a040", 0.85);
  }
  // release: sparks off the rim
  if (!fire && anim > 0.5) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t.id, d = rr + 10 + (1 - anim) * 14;   // (starts clear of the wheel)
    const sx = x + Math.cos(a) * d, sy = wy + Math.sin(a) * d * SQ;
    ctx.fillStyle = `rgba(255,244,210,${anim})`; ctx.fillRect(sx - 0.5, sy - 0.5, 1.2, 1.2);
    ctx.fillRect(sx - Math.cos(a) * 2 - 0.3, sy - Math.sin(a) * SQ * 2 - 0.3, 0.7, 0.7);
  }

  // ---- the wheelwright at the crank (from level two; the post is turned by
  // hand-bar at one). Turning, his hands ride the handle round (eight frames a
  // turn, the body hauling from the hips) and the handle is drawn at
  // the same turn; at one he leans into the bar and drives it. At ease his
  // hands rest on the still handle and he breathes and looks about.
  const lvl1 = lvl === 1 && !t.branch;
  const turning = !t._idle;
  const [cdx, cdy] = crewSpot(s), cx0 = x + cdx, cy0 = y + cdy;   // his feet stay inside the narrow footprint
  const P = lvl1 ? BAR : { hub: [CRANK.x - cdx, CRANK.y - cdy], rx: CRANK_RX, ry: CRANK_RY };
  if (!t.noFolk) {
    // the wheelwright: the same turn of the crank (8 frames a turn), or at ease on the still
    // handle; the bar / crank arm is drawn to where his fists hold it (the frame's `grip` mark)
    const variant = fire ? "stoker" : "engineer";
    const clip = turning ? (lvl1 ? "bar" : "wheel") : lvl1 ? "barIdle" : "wheelIdle", n = ENG.CLIPS[clip].n;
    const turn = time * (gale ? 12 : 8) / (2 * Math.PI) + t.id * 0.37;
    const cf = turning ? Math.floor((turn - Math.floor(turn)) * n) % n : loopFrame(ENG, clip, time, t.id);
    const g = crewMark(ENG, clip, cf, "grip", 1, variant), gx = cx0 + g[0], gy = cy0 + g[1];
    if (lvl1) {
      ctx.strokeStyle = "#241a26"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, cy0 - 13); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.strokeStyle = "#8a6238"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, cy0 - 13); ctx.lineTo(gx, gy); ctx.stroke();
    } else {
      ctx.strokeStyle = "#241a26"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x + CRANK.x, y + CRANK.y); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.fillStyle = "#241a26"; ctx.fillRect(gx - 1, gy - 1, 2, 2);
      ctx.fillStyle = "#8a909c"; ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1);
    }
    drawCrewPix(ctx, ENG, cx0, cy0, 1, clip, cf, { variant });
  }
  if (H) drawHallFront(ctx, H, x, y, time, { id: t.id });
  // idle: a whetstone spark now and then
  if (t._idle && Math.sin(time * 3.1 + t.id * 1.9) > 0.9) glow(ctx, x + rr - 2, wy - 2, 2.5, "#ffffff", 0.9);
  if (!fire && Math.sin(time * 1.9 + t.id * 2.1) > 0.97) glint(ctx, x - rr * 0.6, wy - rr * 0.3, 1, 0.9);
};
