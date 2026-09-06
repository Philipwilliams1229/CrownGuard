// ============ MASTER RENDER ============
// Paints one whole frame into an off-screen buffer, then blits it — with
// smoothing off — onto the visible canvas. Handles camera zoom/pan, terrain,
// path, build previews, depth-sorted actors, projectiles, floating effects,
// and the pause overlay.
//
// The buffer is FULL board resolution (one world pixel to one buffer pixel).
// It used to be half that and get doubled on the way out, which cost every
// piece of art half its detail — a 13-cell-wide goblin landed on screen as 13
// actual pixels. Sprites that opt into `px: 1` (see sprites.js) now get four
// times the pixels inside the same footprint.

import { W, H, CELL, S, INK, CASTLE_HP, RALLY_RANGE, RES } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS, posAt, angleAt } from "../engine/path.js";
import { DECOR, PONDS, RIVERS, BRIDGES } from "../data/terrain.js";
import { groundLayer, drawRoadLive } from "./world.js";
import { ball as pip } from "./paint.js";
import { TOWERS } from "../data/towers.js";
import { getStats } from "../engine/towers.js";
import { buildableAt } from "../engine/actions.js";
import { SPRITES, UNDEAD_PALS } from "../sprites/sprites.js";
import { drawEnemy, drawKnightUnit } from "./enemies.js";
import { drawArcherTower, drawWizardSpire, drawGarrison, drawSupportTower, drawCatapult, drawBladewheel, drawGoldworks, drawTrapsmith, drawFalconry, drawSunforge, drawAssassin, drawRiverwatchHall, drawGunpowder } from "./towers.js";
import { drawTree, drawPond, drawRiver, drawBridge, drawCastle, drawSpawn } from "./scenery.js";
import { drawCloudShadows, drawAmbient, drawGrade } from "./atmosphere.js";

// The wave announcement: a ribbon that sweeps in, holds, and clears. Drawn in
// buffer space over the finished board, so it reads at any camera zoom. It's
// the one piece of type on the field, so it stays short and gets out of the way.
const BANNER_LIFE = 2.4;

function drawBanner(ctx, g) {
  const b = g.banner;
  if (!b) return;
  const age = g.time - b.t0;
  if (age < 0 || age > BANNER_LIFE) return;
  // ease in over a fifth of a second, hold, then fade out over the last half
  const inP = Math.min(1, age / 0.22);
  const out = Math.max(0, (age - (BANNER_LIFE - 0.5)) / 0.5);
  const a = (1 - out) * inP;
  const slide = (1 - inP) * (1 - inP) * 120;
  const cy = Math.round(H * 0.3);
  const hh = b.sub ? 26 : 18;

  ctx.save();
  ctx.translate(-slide, 0);
  // the ribbon: dark bar, a bright rule top and bottom, ends bleeding off-board
  // drawn wider than the board so the slide never uncovers its own edge
  ctx.fillStyle = `rgba(14,12,18,${a * 0.72})`;
  ctx.fillRect(-160, cy - hh, W + 320, hh * 2);
  const edge = b.boss ? "224,90,80" : "216,179,74";
  ctx.fillStyle = `rgba(${edge},${a * 0.85})`;
  ctx.fillRect(-160, cy - hh, W + 320, 2);
  ctx.fillRect(-160, cy + hh - 2, W + 320, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(${b.boss ? "240,168,160" : "240,224,168"},${a})`;
  ctx.font = "bold 22px monospace";
  // letter-spacing the hard way: canvas has no such property here
  const chars = [...b.text];
  const gap = 22 * 0.72 + 5;
  let px = W / 2 - ((chars.length - 1) * gap) / 2;
  for (const ch of chars) { ctx.fillText(ch, Math.round(px), cy + (b.sub ? -7 : 0)); px += gap; }
  if (b.sub) {
    ctx.font = "11px monospace";
    ctx.fillStyle = `rgba(196,190,176,${a * 0.85})`;
    ctx.fillText(b.sub, W / 2, cy + 13);
  }
  ctx.restore();
}

export function draw(g, canvas, bufRef) {
  const cv = canvas;
  if (!cv) return;
  // The buffer is RES times the board on each side: everything below draws
  // in world units and the transform does the rest, so curves come out curved.
  if (cv.width !== W * RES) { cv.width = W * RES; cv.height = H * RES; }
  let buf = bufRef.current;
  if (!buf || buf.width !== W * RES) {
    buf = document.createElement("canvas");
    buf.width = W * RES; buf.height = H * RES;
    bufRef.current = buf;
  }
  const ctx = buf.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W * RES, H * RES);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(RES, RES);
  if (g.shake > 0) ctx.translate(S((Math.random() - 0.5) * g.shake), S((Math.random() - 0.5) * g.shake));
  ctx.scale(g.cam.zoom, g.cam.zoom);
  ctx.translate(-g.cam.x, -g.cam.y);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // the ground, painted once per realm at full detail, then the water that
  // lives on it and the road's kindling chevrons
  ctx.drawImage(groundLayer(), 0, 0, W, H);
  for (const p of PONDS) drawPond(ctx, p, g.time);
  for (const rv of RIVERS) drawRiver(ctx, rv, g.time, REALM.water);
  drawRoadLive(ctx, g);

  // timber spans wherever the road wades a river — over the road texture,
  // under everything that walks
  for (const b of BRIDGES) drawBridge(ctx, b, g.time, posAt, angleAt, REALM.bridge);

  // the trapsmith's work, waiting flush with the road
  if (g.traps) {
    for (const tr of g.traps) {
      const tx = S(tr.x), ty = S(tr.y);
      const kind = tr.kind || (tr.sky ? "balloon" : tr.branch === "b" ? "mine" : "jaws");
      if (kind === "balloon") {
        // a bomb on a balloon, bobbing at flier height above its road anchor
        const by = ty - 13 + Math.sin(g.time * 2 + tr.x) * 1.5;
        ctx.fillStyle = "rgba(20,20,26,0.25)";
        ctx.fillRect(tx - 2, ty + 1, 5, 2);
        ctx.strokeStyle = "rgba(16,19,26,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx + 0.5, ty); ctx.lineTo(tx + 0.5, by + 4); ctx.stroke();
        ctx.fillStyle = INK; ctx.fillRect(tx - 2, by - 5, 6, 6);
        ctx.fillStyle = "#c05848"; ctx.fillRect(tx - 1, by - 4, 4, 4);
        ctx.fillStyle = "#e8927a"; ctx.fillRect(tx - 1, by - 4, 1, 2);
        ctx.fillStyle = INK; ctx.fillRect(tx - 1, by + 1, 4, 3);
        ctx.fillStyle = "#5f636d"; ctx.fillRect(tx, by + 2, 2, 2);
        ctx.fillStyle = Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a";
        ctx.fillRect(tx, by + 2, 1, 1);
      } else if (kind === "spike") {
        // road spikes: a low iron strip with teeth standing up out of it
        ctx.fillStyle = INK;
        ctx.fillRect(tx - 7, ty - 1, 15, 4);
        ctx.fillStyle = "#6c727e";
        ctx.fillRect(tx - 6, ty, 13, 2);
        ctx.fillStyle = "#c4c8d0";
        for (let i2 = 0; i2 < 5; i2++) {
          const sx = tx - 6 + i2 * 3;
          ctx.fillRect(sx, ty - 3, 1, 3);
          ctx.fillRect(sx, ty - 4, 1, 1);
        }
        ctx.fillStyle = "#8a8f9a";
        ctx.fillRect(tx - 6, ty + 2, 13, 1);
      } else if (kind === "caltrop") {
        // a scatter of four-pointed iron, too many to count
        ctx.fillStyle = INK;
        for (let i2 = 0; i2 < 4; i2++) {
          const cx2 = tx - 5 + ((i2 * 7) % 11), cy2 = ty - 2 + ((i2 * 5) % 6);
          ctx.fillRect(cx2 - 2, cy2, 5, 1);
          ctx.fillRect(cx2, cy2 - 2, 1, 5);
        }
        ctx.fillStyle = "#b8bcc4";
        for (let i2 = 0; i2 < 4; i2++) {
          const cx2 = tx - 5 + ((i2 * 7) % 11), cy2 = ty - 2 + ((i2 * 5) % 6);
          ctx.fillRect(cx2, cy2, 1, 1);
        }
      } else if (kind === "mine") {
        // a pressure mine: steel disc, and a patient red eye
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#5f636d";
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#8a8f9a";
        ctx.fillRect(tx - 3, ty - 3, 3, 2);
        ctx.fillStyle = Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a";
        ctx.fillRect(tx - 1, ty - 1, 2, 2);
      } else {
        // bear-iron: open jaws, teeth up
        ctx.fillStyle = INK;
        ctx.fillRect(tx - 8, ty - 2, 16, 5);
        ctx.fillStyle = "#8a8f9a";
        ctx.fillRect(tx - 7, ty - 1, 14, 3);
        ctx.fillStyle = "#b8bcc4";
        for (let i2 = 0; i2 < 4; i2++) ctx.fillRect(tx - 7 + i2 * 4, ty - 3, 2, 3);
        ctx.fillStyle = "#6c727e";
        ctx.fillRect(tx - 2, ty, 4, 2);
      }
    }
  }

  // clouds crossing the sun — over the ground, under everything standing on it
  drawCloudShadows(ctx, g.time);

  // scorch marks: blasts leave the turf blackened for a few seconds. Drawn
  // here, before the actors, so troops walk over the burn rather than under it.
  for (const fx of g.effects) {
    if (fx.type !== "scorch") continue;
    const a = Math.min(1, fx.ttl / fx.life) * 0.42;
    const r = fx.r, ry = r * 0.6, step = CELL * 2;
    const core = fx.frost ? `rgba(168,214,232,${a})` : `rgba(38,29,26,${a})`;
    const rim = fx.frost ? `rgba(214,240,248,${a * 0.7})` : `rgba(64,50,42,${a * 0.75})`;
    // Stamped cell by cell rather than filled as an ellipse: a smooth vector
    // blob is the one shape on this board that isn't made of pixels, and the
    // eye goes straight to it. The hash gives the edge a burnt raggedness.
    const ox = S(fx.x), oy = S(fx.y);
    for (let dy = -ry; dy <= ry; dy += step) {
      for (let dx = -r; dx <= r; dx += step) {
        const n = (dx * dx) / (r * r) + (dy * dy) / (ry * ry);
        if (n > 1) continue;
        const h = ((((dx | 0) * 73856093) ^ ((dy | 0) * 19349663) ^ ((fx.seed * 977) | 0)) >>> 0) % 64 / 64;
        if (n > 0.42 && h < (n - 0.42) / 0.58) continue;   // crumbling outer edge
        ctx.fillStyle = n < 0.34 ? core : rim;
        ctx.fillRect(ox + S(dx), oy + S(dy), step, step);
      }
    }
  }

  // lingering ground effects: pools of living lava, and the ghasts' plague
  if (g.grounds) {
    const tmsG = g.time * 1000;
    for (const gr of g.grounds) {
      const fade = Math.min(1, (gr.until - tmsG) / 600);
      if (gr.kind === "plague") {
        // grave-rot: a dull green slick with rising blister bubbles. It only
        // troubles knights, so it reads sickly rather than hot.
        ctx.fillStyle = `rgba(74,96,52,${0.6 * fade})`;
        ctx.beginPath(); ctx.arc(S(gr.x), S(gr.y), gr.r * 0.95, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(112,138,70,${0.55 * fade})`;
        ctx.beginPath(); ctx.arc(S(gr.x), S(gr.y), gr.r * 0.6, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(168,196,110,${0.85 * fade})`;
        for (let i = 0; i < 6; i++) {
          const ang = i * 1.05 + ((i * 53) % 7);
          const rr = gr.r * (0.2 + 0.6 * ((i * 41) % 10) / 10);
          const pop = (g.time * 1.6 + i * 0.9) % 1;
          if (pop > 0.55) continue;                    // burst, gone, reforms
          ctx.fillRect(S(gr.x + Math.cos(ang) * rr) - 1, S(gr.y + Math.sin(ang) * rr * 0.8) - 1 - pop * 4, CELL + 1, CELL + 1);
        }
        continue;
      }
      if (gr.kind === "spores") {
        // the Plague Bearer's harvest: a pale toxin haze that hunts the LIVING column
        ctx.fillStyle = `rgba(96,74,120,${0.5 * fade})`;
        ctx.beginPath(); ctx.arc(S(gr.x), S(gr.y), gr.r * 0.95, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(140,110,168,${0.45 * fade})`;
        ctx.beginPath(); ctx.arc(S(gr.x), S(gr.y), gr.r * 0.55, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(196,170,220,${0.8 * fade})`;
        for (let i = 0; i < 7; i++) {
          const ang = g.time * 0.8 + i * 0.9;
          const rr = gr.r * (0.25 + 0.55 * ((i * 31) % 10) / 10);
          const drift = ((g.time * 0.7 + i * 0.37) % 1) * 6;
          ctx.fillRect(S(gr.x + Math.cos(ang) * rr) - 1, S(gr.y + Math.sin(ang) * rr * 0.8) - 1 - drift, CELL, CELL);
        }
        continue;
      }
      ctx.fillStyle = `rgba(125,51,41,${0.75 * fade})`;
      ctx.beginPath(); ctx.arc(S(gr.x), S(gr.y), gr.r * 0.9, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(216,118,58,${0.8 * fade})`;
      for (let i = 0; i < 5; i++) {
        const ang = g.time * 1.4 + i * 1.26;
        const rr = gr.r * (0.25 + 0.45 * ((i * 37) % 10) / 10);
        const bub = Math.sin(g.time * 6 + i * 2.4) > 0.3 ? CELL : 0;
        ctx.fillRect(S(gr.x + Math.cos(ang) * rr) - 1, S(gr.y + Math.sin(ang) * rr * 0.8) - 1 - bub, CELL + 1, CELL + 1);
      }
      ctx.fillStyle = `rgba(232,193,74,${0.9 * fade})`;
      ctx.fillRect(S(gr.x + Math.sin(g.time * 3) * gr.r * 0.3), S(gr.y + Math.cos(g.time * 2.2) * gr.r * 0.25), CELL, CELL);
    }
  }

  drawSpawn(ctx, g.time, REALM.spawn);

  // A range ring, drawn as a slowly turning ring of ticks rather than a solid
  // hairline. It reads as a live area of control instead of a drawn-on circle,
  // and the rotation tells you which ring is following the cursor.
  // Tick count comes from the circumference, not a fixed number: a catapult's
  // ring is three times a garrison's, and 44 dots around it is confetti.
  const rangeRing = (cx, cy, radius, color, spin) => {
    const ticks = Math.max(24, Math.round((Math.PI * 2 * radius) / 5));
    ctx.fillStyle = color;
    for (let i = 0; i < ticks; i++) {
      if (i % 4 >= 2) continue;                         // two on, two off
      const ang = (i / ticks) * Math.PI * 2 + spin;
      ctx.fillRect(S(cx + Math.cos(ang) * radius) - 1, S(cy + Math.sin(ang) * radius) - 1, CELL + 1, CELL + 1);
    }
  };

  if (g.buildMode && g.hover) {
    const [hx, hy] = g.hover;
    const ok = buildableAt(g, hx, hy, g.buildMode) && g.gold >= TOWERS[g.buildMode].cost;
    const radius = g.buildMode === "knight" ? RALLY_RANGE : TOWERS[g.buildMode].levels[0].range;
    ctx.fillStyle = ok ? "rgba(140,224,140,0.25)" : "rgba(224,110,100,0.28)";
    ctx.fillRect(S(hx) - 20, S(hy) - 20, 40, 40);
    ctx.fillStyle = ok ? "rgba(140,224,140,0.09)" : "rgba(224,110,100,0.09)";
    ctx.beginPath(); ctx.arc(S(hx), S(hy), radius, 0, 7); ctx.fill();
    rangeRing(hx, hy, radius, ok ? "rgba(150,232,150,0.85)" : "rgba(232,120,110,0.85)", g.time * 0.5);
    const minR = TOWERS[g.buildMode].levels[0].minRange;
    if (minR) rangeRing(hx, hy, minR, "rgba(232,120,110,0.7)", -g.time * 0.7);
  }

  const sel = g.towers.find((t) => t.id === g.selectedId);
  if (sel) {
    const st = getStats(sel);
    const radius = sel.kind === "knight" ? RALLY_RANGE : st.range;
    ctx.fillStyle = "rgba(216,179,74,0.1)";
    ctx.beginPath(); ctx.arc(S(sel.x), S(sel.y), radius, 0, 7); ctx.fill();
    rangeRing(sel.x, sel.y, radius, "rgba(232,196,90,0.9)", g.time * 0.5);
    if (st.minRange) rangeRing(sel.x, sel.y, st.minRange, "rgba(232,120,110,0.7)", -g.time * 0.7);
  }

  // Paints one tower of `kind` at (x, y). Used both for the real thing and
  // for the ghost under the cursor, so what you preview is what you get.
  const paintTower = (t) => {
    if (t.kind === "archer") drawArcherTower(ctx, t, g.time);
    else if (t.kind === "wizard") drawWizardSpire(ctx, t, g.time);
    else if (t.kind === "support") drawSupportTower(ctx, t, g.time);
    else if (t.kind === "catapult") drawCatapult(ctx, t, g.time);
    else if (t.kind === "spiker") drawBladewheel(ctx, t, g.time);
    else if (t.kind === "goldworks") drawGoldworks(ctx, t, g.time);
    else if (t.kind === "trapsmith") drawTrapsmith(ctx, t, g.time);
    else if (t.kind === "assassin") drawAssassin(ctx, t, g.time);
    else if (t.kind === "falconry") drawFalconry(ctx, t, g.time);
    else if (t.kind === "sunforge") drawSunforge(ctx, t, g.time);
    else if (t.kind === "riverwatch") drawRiverwatchHall(ctx, t, g.time);
    else if (t.kind === "gunpowder") drawGunpowder(ctx, t, g.time);
    else drawGarrison(ctx, t, g.time);
  };

  const drawables = [];
  for (const d of DECOR) drawables.push({ y: d.y + 14, fn: () => drawTree(ctx, d, g.time) });
  // the tower you're about to buy, standing on the spot at half weight
  if (g.buildMode && g.hover) {
    const [hx, hy] = g.hover;
    const ghost = {
      kind: g.buildMode, x: S(hx), y: S(hy), level: 1,
      branch: null, rank4: null, id: 0, anim: 0, lastAim: 0, rally: null, range: 0,
    };
    drawables.push({
      y: hy + 14,
      fn: () => {
        ctx.globalAlpha = 0.45 + Math.sin(g.time * 4) * 0.08;
        paintTower(ghost);
        ctx.globalAlpha = 1;
      },
    });
  }
  for (const t of g.towers) {
    // wardens read the crowd inside their cold before they draw it
    if (t.kind === "support") {
      const stA = getStats(t);
      let n = 0;
      for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= stA.range) n++;
      t._auraLive = n;
    }
    // idle detection: no living foe in reach, and the soldiers find small
    // things to do with their hands — see each tower's own habits
    {
      const stI = getStats(t);
      let busy = false;
      for (const e of g.enemies) { if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= stI.range) { busy = true; break; } }
      t._idle = !busy;
    }
    drawables.push({
      y: t.y + 14,
      fn: () => {
        paintTower(t);
        // rank pips: one gold stud per level, a small crown once evolved
        if (!t.branch) {
          for (let i = 0; i < t.level; i++) pip(ctx, t.x - (t.level - 1) * 4 + i * 8, t.y + 21, 2.2, 2.2, "#e8c14a");
        } else {
          pip(ctx, t.x, t.y + 20, 2.6, 2.6, "#e8c14a");
          pip(ctx, t.x - 5, t.y + 21.5, 1.6, 1.6, "#e8c14a");
          pip(ctx, t.x + 5, t.y + 21.5, 1.6, 1.6, "#e8c14a");
        }
      },
    });
    if (t.units) for (const u of t.units) drawables.push({ y: u.y + 9, fn: () => drawKnightUnit(ctx, u, t, g.time) });
  }
  const tms = g.time * 1000;
  for (const e of g.enemies) {
    if (!e.dead) drawables.push({ y: e.y + 10, fn: () => drawEnemy(ctx, e, g.time, tms) });
  }
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.fn();

  // the Sunforge's held light: drawn over the fray so the line of the beam
  // is never lost, its width and fury growing with the focus
  for (const t of g.towers) {
    if (t.kind !== "sunforge" || t.beamId == null) continue;
    const st = getStats(t);
    const heat = ((t.ramp || 1) - 1) / Math.max(1, (st.rampMax || 3) - 1);
    const moon = t.branch === "b";
    const glowC = moon ? "168,196,240" : "232,193,74";
    const coreC = moon ? "236,244,252" : "252,244,220";
    const beamTo = (id, dim) => {
      const e = g.enemies.find((en) => en.id === id && !en.dead);
      if (!e) return;
      const x1 = S(t.x), y1 = S(t.y) - 16, x2 = S(e.x), y2 = S(e.y) - 6;
      ctx.strokeStyle = `rgba(${glowC},${(0.2 + heat * 0.35) * dim})`;
      ctx.lineWidth = 5 + heat * 5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = `rgba(${coreC},${(0.55 + heat * 0.45) * dim})`;
      ctx.lineWidth = 1 + heat * 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineWidth = 1;
      // the burn-point
      ctx.fillStyle = `rgba(${glowC},${0.5 * dim})`;
      ctx.beginPath(); ctx.arc(x2, y2, 4 + heat * 4 + Math.sin(g.time * 14) * heat * 2, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(${coreC},${0.9 * dim})`;
      ctx.fillRect(x2 - 1, y2 - 1, 3, 3);
    };
    beamTo(t.beamId, 1);
    if (t.beamId2 != null) beamTo(t.beamId2, 0.55);
  }

  // Skyknight war-eagles fly free of their roosts, so they paint above the
  // fray — and at half a dragon's span, with the mistress on its back.
  for (const t of g.towers) {
    if (t.kind !== "falconry" || !t.eagle) continue;
    const eg = t.eagle;
    if (eg.respawn > 0) continue;   // the mistress whistles a new bird soon
    const ex = S(eg.x), ey = S(eg.y);
    const beat = Math.sin(g.time * 6 + t.id) > 0;
    const fighting = !!eg.targetId;
    // a shadow the size of the thing casting it
    ctx.fillStyle = "rgba(20,20,26,0.24)";
    ctx.fillRect(ex - 14, ey + 20, 28, 4);
    // ---- the wings: four ribbed fingers a side, a dragon's half ----
    for (const side of [-1, 1]) {
      const lift = beat ? -6 : 3;
      for (let f = 0; f < 4; f++) {
        const len = 26 - f * 5;
        const ang = side < 0 ? Math.PI - (0.28 + f * 0.26) : 0.28 + f * 0.26;
        const tx2 = ex + Math.cos(ang) * len;
        const ty2 = ey + Math.sin(ang) * len * 0.5 + lift + f * 2;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ex + side * 3, ey); ctx.lineTo(tx2, ty2); ctx.stroke();
      }
      // the membrane between the fingers
      ctx.fillStyle = beat ? "#8a6a44" : "#96764a";
      ctx.beginPath();
      ctx.moveTo(ex + side * 3, ey);
      for (let f = 0; f < 4; f++) {
        const len = 26 - f * 5;
        const ang = side < 0 ? Math.PI - (0.28 + f * 0.26) : 0.28 + f * 0.26;
        ctx.lineTo(ex + Math.cos(ang) * len, ey + Math.sin(ang) * len * 0.5 + (beat ? -6 : 3) + f * 2);
      }
      ctx.closePath(); ctx.fill();
      // pale primaries along the leading edge
      ctx.fillStyle = "#ded6c4";
      const tipA = side < 0 ? Math.PI - 0.28 : 0.28;
      ctx.fillRect(S(ex + Math.cos(tipA) * 25) - 2, S(ey + Math.sin(tipA) * 12 + (beat ? -6 : 3)) - 1, 4, 3);
    }
    // ---- the body ----
    ctx.fillStyle = INK;
    ctx.fillRect(ex - 6, ey - 6, 12, 16);
    ctx.fillStyle = "#96764a";
    ctx.fillRect(ex - 5, ey - 5, 10, 14);
    ctx.fillStyle = "#7a5f3a";
    ctx.fillRect(ex - 5, ey + 4, 10, 4);
    // tail fan
    ctx.fillStyle = INK;
    ctx.fillRect(ex - 7, ey + 9, 14, 5);
    ctx.fillStyle = "#ded6c4";
    ctx.fillRect(ex - 6, ey + 10, 12, 3);
    // ---- the head: hooked, white-hooded, gold-beaked ----
    ctx.fillStyle = INK;
    ctx.fillRect(ex - 5, ey - 13, 10, 9);
    ctx.fillStyle = "#ece4d2";
    ctx.fillRect(ex - 4, ey - 12, 8, 7);
    ctx.fillStyle = "#e0b855";
    ctx.fillRect(ex - 1, ey - 8, 5, 3);
    ctx.fillRect(ex + 3, ey - 7, 2, 2);
    ctx.fillStyle = INK;
    ctx.fillRect(ex - 3, ey - 11, 2, 2);
    ctx.fillStyle = fighting ? "#e05248" : "#c8a83c";
    ctx.fillRect(ex - 2, ey - 10, 1, 1);
    // ---- the mistress, seated between the wings ----
    ctx.fillStyle = INK;
    ctx.fillRect(ex - 3, ey - 6, 6, 8);
    ctx.fillStyle = t.branch === "b" ? "#5a4a8c" : "#7a3c30";
    ctx.fillRect(ex - 2, ey - 5, 4, 6);
    ctx.fillStyle = "#e8c9a2";
    ctx.fillRect(ex - 2, ey - 7, 3, 2);
    ctx.fillStyle = "#b06630";
    ctx.fillRect(ex + 1, ey - 7, 2, 3);
    // her lance, couched, dipping when the talons go in
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(ex + 3, ey - (fighting ? 1 : 4), 12, 2);
    ctx.fillStyle = "#c4c8d0";
    ctx.fillRect(ex + 14, ey - (fighting ? 1 : 4) - 1, 4, 3);
    // ---- talons out when it has something ----
    if (fighting) {
      ctx.fillStyle = "#e0b855";
      ctx.fillRect(ex - 5, ey + 12, 3, 4);
      ctx.fillRect(ex + 2, ey + 12, 3, 4);
    }
    // ---- wounds, and the mending of them ----
    if (eg.healGlow > 0) {
      ctx.fillStyle = "rgba(140,224,140,0.7)";
      for (let i2 = 0; i2 < 3; i2++) ctx.fillRect(ex - 8 + i2 * 8, ey - 18 - ((g.time * 22 + i2 * 6) % 10), 2, 2);
    }
    if (eg.hp < eg.maxHp) {
      ctx.fillStyle = INK; ctx.fillRect(ex - 12, ey - 22, 24, 5);
      ctx.fillStyle = eg.hp / eg.maxHp > 0.4 ? "#7fc95e" : "#e07a72";
      ctx.fillRect(ex - 11, ey - 21, Math.max(1, Math.round(22 * eg.hp / eg.maxHp)), 3);
    }
  }

  // ---- rolling logs ----
  // Drawn above the fray because a two-ton trimmed oak going down the lane is
  // the most important thing on the board while it lasts.
  if (g.logs) {
    for (const lg of g.logs) {
      const lx = S(lg.x), ly = S(lg.y);
      const px = Math.cos(lg.a), py = Math.sin(lg.a);
      const nx = -py, ny = px;              // across the barrel
      const half = lg.w * 0.5;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(lg.a + Math.PI / 2);
      // the dust it kicks up, behind
      ctx.fillStyle = "rgba(178,164,136,0.5)";
      for (let i = 0; i < 4; i++) {
        const o = (lg.spin * 9 + i * 5) % 16;
        ctx.fillRect(-half + i * (lg.w / 4), 9 + o * 0.5, 3, 2);
      }
      ctx.fillStyle = "rgba(20,20,26,0.3)";
      ctx.fillRect(-half - 1, 7, lg.w + 2, 4);
      // the barrel itself
      ctx.fillStyle = INK;
      ctx.fillRect(-half - 2, -8, lg.w + 4, 16);
      ctx.fillStyle = "#8a6238";
      ctx.fillRect(-half, -7, lg.w, 14);
      ctx.fillStyle = "#a0754a";
      ctx.fillRect(-half, -7, lg.w, 3);
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(-half, 4, lg.w, 3);
      // bark grain that TURNS, so the thing visibly rolls
      ctx.fillStyle = "#4a3018";
      for (let i = 0; i < 4; i++) {
        const gy = -7 + ((i * 4 + lg.spin * 7) % 14);
        ctx.fillRect(-half + 1, gy, lg.w - 2, 1);
      }
      // iron banding on the drum, powder-red on the keg
      if (lg.stun) {
        ctx.fillStyle = "#8a8f9a";
        ctx.fillRect(-half, -7, 3, 14);
        ctx.fillRect(half - 3, -7, 3, 14);
      }
      if (lg.blast) {
        ctx.fillStyle = "#c05848";
        ctx.fillRect(-half + 2, -3, lg.w - 4, 2);
        ctx.fillStyle = Math.sin(g.time * 24) > 0 ? "#f4e08a" : "#e8933a";
        ctx.fillRect(half - 2, -9, 2, 2);
      }
      // cut ends
      ctx.fillStyle = "#c8a878";
      ctx.fillRect(-half - 2, -8, 2, 16);
      ctx.fillRect(half, -8, 2, 16);
      ctx.restore();
      if (lg.burn) {
        for (let i = 0; i < 3; i++) {
          const fx2 = lg.x + nx * (i - 1) * 7, fy2 = lg.y + ny * (i - 1) * 7;
          ctx.fillStyle = i === 1 ? "#e8c14a" : "#d8763a";
          ctx.fillRect(S(fx2), S(fy2 - 8 - ((g.time * 30 + i * 7) % 8)), CELL, CELL * 2);
        }
      }
    }
  }

  drawCastle(ctx, g.time, Math.min(1, Math.max(0, g.lives) / CASTLE_HP));

  // ---- the spawn marker ----
  // Drawn after everything standing, because it used to sit under the pines
  // beside the thicket and read as "EY COME". Loud while you're laying out
  // your defence, faint once the fighting starts and the horde speaks for
  // itself.
  {
    const [lsx, lsy] = PTS[0];
    // the sign stands at the wood's mouth, clear of the board edge
    const mx = S(Math.max(lsx, 60)), my = lsy < 60 ? S(lsy) + 70 : S(lsy) - 46;
    const a = g.phase === "combat" ? 0.3 : 0.95;
    // Three chevrons above the plate, lighting in sequence so the eye is
    // walked downward into the mouth of the road. They live above rather than
    // below because below is canopy, and a marker you can't see is no marker.
    for (let k = 0; k < 3; k++) {
      const lit = 0.3 + 0.7 * Math.max(0, Math.sin(g.time * 4 - k * 1.05));
      const yy = my - 30 + k * 7;
      ctx.fillStyle = `rgba(224,110,100,${a * lit})`;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(mx - 6 + i * CELL, yy + i * CELL, CELL, CELL);
        ctx.fillRect(mx + 4 - i * CELL, yy + i * CELL, CELL, CELL);
      }
    }
    ctx.fillStyle = `rgba(18,14,18,${a * 0.72})`;
    ctx.fillRect(mx - 34, my - 8, 68, 15);
    ctx.fillStyle = `rgba(224,122,114,${a * 0.55})`;
    ctx.fillRect(mx - 34, my - 8, 68, 1);
    ctx.fillRect(mx - 34, my + 6, 68, 1);
    ctx.fillStyle = `rgba(232,138,128,${a})`;
    ctx.font = "bold 10px monospace";
    ctx.fillText("THEY COME", mx, my);
  }

  for (const p of g.projectiles) {
    if (p.delay > 0) continue;
    if (p.kind === "ball") {
      // a musket ball: a hot streak with a lead dot at its head
      const a2 = Math.atan2(p.ty - p.y, p.tx - p.x);
      ctx.strokeStyle = "rgba(240,226,190,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(S(p.x - Math.cos(a2) * 13), S(p.y - Math.sin(a2) * 13));
      ctx.lineTo(S(p.x), S(p.y));
      ctx.stroke();
      ctx.fillStyle = "#3a3a42";
      ctx.fillRect(S(p.x) - 1, S(p.y) - 1, 3, 3);
      ctx.fillStyle = "#e8d8a8";
      ctx.fillRect(S(p.x), S(p.y), 1, 1);
      continue;
    }
    if (p.kind === "shell") {
      // a powder charge lobbed short and fat, fuse trailing sparks
      const remaining = Math.hypot(p.tx - p.x, p.ty - p.y);
      const tot = Math.max(1, Math.hypot(p.tx - (p.sx ?? p.x), p.ty - (p.sy ?? p.y)));
      const prog = Math.min(1, Math.max(0, 1 - remaining / tot));
      const arcH = Math.sin(prog * Math.PI) * 26;
      const cy = S(p.y - arcH);
      ctx.fillStyle = "rgba(20,20,26,0.3)";
      ctx.fillRect(S(p.x) - 3, S(p.y) + 2, 6, 2);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(S(p.x), cy, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#4a4a52";
      ctx.beginPath(); ctx.arc(S(p.x), cy, 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#6c6c76";
      ctx.fillRect(S(p.x) - 2, cy - 2, 2, 1);
      // the fuse, spitting
      ctx.fillStyle = Math.sin(g.time * 30 + p.x) > 0 ? "#f4e08a" : "#e8933a";
      ctx.fillRect(S(p.x) + 1, cy - 5, 1, 2);
      ctx.fillStyle = "rgba(232,147,58,0.75)";
      ctx.fillRect(S(p.x) + 2, cy - 7, 1, 1);
      continue;
    }
    if (p.kind === "rock") {
      // boulder lobbed in an arc: shadow tracks the ground, rock rises above it
      const remaining = Math.hypot(p.tx - p.x, p.ty - p.y);
      const prog = p.total > 0 ? 1 - remaining / p.total : 1;
      const arcH = Math.sin(Math.min(1, Math.max(0, prog)) * Math.PI) * Math.min(64, p.total * 0.24);
      const r = p.mini ? 2.5 : p.big ? 6 : 4;
      // A motion trail of the stone itself, shrinking back along the arc.
      // (It used to be dust-coloured, which was invisible: the road is dust.)
      if (!p.mini && p.sx !== undefined) {
        for (let i = 4; i >= 1; i--) {
          const u = prog - i * 0.05;
          if (u <= 0.02) continue;              // still leaving the throwing arm
          const px = p.sx + (p.tx - p.sx) * u;
          const py = p.sy + (p.ty - p.sy) * u;
          const ph = Math.sin(u * Math.PI) * Math.min(64, p.total * 0.24);
          ctx.fillStyle = `rgba(122,122,132,${0.42 - i * 0.08})`;
          ctx.beginPath(); ctx.arc(S(px), S(py - ph), r * (1 - i * 0.16), 0, 7); ctx.fill();
        }
      }
      const cy = S(p.y - arcH);
      ctx.fillStyle = "rgba(20,20,26,0.35)";
      ctx.fillRect(S(p.x) - r + 1, S(p.y) - 2, (r - 1) * 2, 4);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(S(p.x), cy, r + 1, 0, 7); ctx.fill();
      ctx.fillStyle = "#8a8a92";
      ctx.beginPath(); ctx.arc(S(p.x), cy, r, 0, 7); ctx.fill();
      // lit from the upper left, in shadow at the lower right
      ctx.fillStyle = "#62626c";
      ctx.beginPath(); ctx.arc(S(p.x) + r * 0.34, cy + r * 0.34, r * 0.68, 0, 7); ctx.fill();
      ctx.fillStyle = "#a8a8b2";
      ctx.beginPath(); ctx.arc(S(p.x) - r * 0.3, cy - r * 0.32, r * 0.5, 0, 7); ctx.fill();
      // and it tumbles: one dark chip circling the face as the stone rolls
      if (!p.mini) {
        const roll = g.time * 7 + p.id;
        ctx.fillStyle = "#4e4e58";
        ctx.fillRect(S(p.x + Math.cos(roll) * r * 0.42) - CELL, S(p.y - arcH + Math.sin(roll) * r * 0.42) - CELL, CELL * 2, CELL * 2);
      }
    } else if (p.kind === "arrow") {
      ctx.fillStyle = p.poison ? "#7cc85c" : p.pierce ? "#e8d47a" : "#d2c6a2";
      const dx = Math.cos(p.angle || 0), dy = Math.sin(p.angle || 0);
      if (p.big) {
        // ballista bolt / heartseeker crit: longer, thicker, screaming
        for (let i = -3; i <= 3; i++) ctx.fillRect(S(p.x + dx * i * 3), S(p.y + dy * i * 3), CELL * 2, CELL * 2);
        ctx.fillStyle = "rgba(232,212,122,0.4)";
        for (let i = -5; i <= -4; i++) ctx.fillRect(S(p.x + dx * i * 3), S(p.y + dy * i * 3), CELL, CELL);
      } else {
        for (let i = -2; i <= 2; i++) ctx.fillRect(S(p.x + dx * i * 3), S(p.y + dy * i * 3), CELL, CELL);
      }
    } else if (p.kind === "spike") {
      // a flung steel sliver, oriented along its flight
      const dx = Math.cos(p.angle || 0), dy = Math.sin(p.angle || 0);
      ctx.fillStyle = p.slow ? "#8ce8f0" : p.hitsLeft > 1 ? "#e8d47a" : "#c4c8d0";
      ctx.fillRect(S(p.x - dx * 2), S(p.y - dy * 2), CELL, CELL);
      ctx.fillRect(S(p.x), S(p.y), CELL, CELL);
      ctx.fillRect(S(p.x + dx * 2), S(p.y + dy * 2), 2, 2);
    } else {
      const col = p.burn ? "#d8763a" : p.slow ? "#9fd4e8" : "#b08ad8";
      const rgb = p.burn ? "216,118,58" : p.slow ? "159,212,232" : "176,138,216";
      // a comet tail behind the orb, laid back along its heading
      const dx = Math.cos(p.angle || 0), dy = Math.sin(p.angle || 0);
      for (let i = 5; i >= 1; i--) {
        const wob = Math.sin(g.time * 14 + i * 1.1 + p.id) * i * 0.6;
        ctx.fillStyle = `rgba(${rgb},${0.42 - i * 0.06})`;
        ctx.fillRect(S(p.x - dx * i * 4 - dy * wob) - 2, S(p.y - dy * i * 4 + dx * wob) - 2, 6 - i * 0.6, 6 - i * 0.6);
      }
      // halo, outline, core — the orb itself reads brightest
      ctx.fillStyle = `rgba(${rgb},0.28)`;
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 8 + Math.sin(g.time * 12 + p.id) * 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 5, 0, 7); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#f4f0e4";
      ctx.fillRect(S(p.x) - CELL, S(p.y) - CELL, CELL, CELL);
    }
  }

  for (const fx of g.effects) {
    const a = Math.min(1, fx.ttl / 300);
    if (fx.type === "boom" || fx.type === "frost" || fx.type === "arcane") {
      // round magic, as it should be
      const col = fx.type === "boom" ? "216,118,58" : fx.type === "frost" ? "159,212,232" : "176,138,216";
      const r = fx.r * (1 - a * 0.3);
      ctx.fillStyle = `rgba(${col},${a * 0.35})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${a * 0.85})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
    } else if (fx.type === "dust") {
      // rock impact: an earthy shockwave ring plus tumbling grit
      const r = fx.r * (1 - a * 0.3);
      ctx.fillStyle = `rgba(150,132,100,${a * 0.3})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(120,104,78,${a * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(178,164,136,${a})`;
      for (let i = 0; i < 6; i++) {
        const ang = i * 1.05 + 0.3;
        const rr = r * 0.7;
        ctx.fillRect(S(fx.x + Math.cos(ang) * rr), S(fx.y + Math.sin(ang) * rr * 0.7 - (1 - a) * 6), CELL, CELL);
      }
    } else if (fx.type === "bolt") {
      // chain lightning: jagged white-hot segments between struck foes
      for (let s2 = 0; s2 < fx.pts.length - 1; s2++) {
        const [x1, y1] = fx.pts[s2];
        const [x2, y2] = fx.pts[s2 + 1];
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
          const u2 = i / steps;
          const mid = Math.sin(u2 * Math.PI);
          const jit = Math.sin(i * 2.7 + (fx.seed || 0) * 9 + s2 * 5) * 5 * mid;
          const nx2 = -(y2 - y1), ny2 = (x2 - x1);
          const nl = Math.hypot(nx2, ny2) || 1;
          const px2 = x1 + (x2 - x1) * u2 + (nx2 / nl) * jit;
          const py2 = y1 + (y2 - y1) * u2 + (ny2 / nl) * jit;
          ctx.fillStyle = `rgba(240,224,104,${a * 0.8})`;
          ctx.fillRect(S(px2) - 2, S(py2) - 2, 5, 5);
          ctx.fillStyle = `rgba(252,252,240,${a})`;
          ctx.fillRect(S(px2) - 1, S(py2) - 1, 3, 3);
        }
      }
    } else if (fx.type === "frostnova") {
      // expanding ring of biting cold
      const prog = 1 - fx.ttl / 500;
      const r = prog * fx.r;
      ctx.strokeStyle = `rgba(124,212,212,${a * 0.9})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(200,236,244,${a})`;
      for (let i = 0; i < 8; i++) {
        const ang = i * 0.785 + 0.3;
        ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.9), CELL, CELL);
      }
    } else if (fx.type === "firenova") {
      // the Brazier Wheel's expanding ring of flame
      const prog = 1 - fx.ttl / 450;
      const r = prog * fx.r;
      ctx.strokeStyle = `rgba(216,118,58,${a * 0.9})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(232,193,74,${a})`;
      for (let i = 0; i < 8; i++) {
        const ang = i * 0.785 + 0.5;
        ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.9) - CELL, CELL, CELL * 2);
      }
    } else if (fx.type === "healwave") {
      // the shaman's mending chant washing outward
      const prog = 1 - fx.ttl / 550;
      const r = prog * fx.r;
      ctx.strokeStyle = `rgba(140,224,140,${a * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(190,232,176,${a})`;
      for (let i = 0; i < 4; i++) {
        const ang = i * 1.57 + 0.8;
        const px2 = S(fx.x + Math.cos(ang) * r), py2 = S(fx.y + Math.sin(ang) * r * 0.85);
        ctx.fillRect(px2 - CELL, py2, CELL * 3, CELL);
        ctx.fillRect(px2, py2 - CELL, CELL, CELL * 3);
      }
    } else if (fx.type === "silence") {
      // the stolen voice: a chant-note crossed out, rising off the silenced
      const rise = (1 - fx.ttl / 900) * 8;
      ctx.fillStyle = `rgba(200,204,214,${a})`;
      ctx.fillRect(S(fx.x) + 2, S(fx.y) - rise - 5, 2, 6);
      ctx.fillRect(S(fx.x), S(fx.y) - rise, 4, 3);
      ctx.strokeStyle = `rgba(224,82,72,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S(fx.x) - 3, S(fx.y) - rise + 4); ctx.lineTo(S(fx.x) + 7, S(fx.y) - rise - 7); ctx.stroke();
    } else if (fx.type === "shadowstep") {
      // the Covert at work: a ripple of shadow crosses, a blade-cross lands
      const life = fx.life || 380;
      const prog = 1 - fx.ttl / life;
      const step = Math.min(1, prog * 2.2);
      const hx = fx.x1 + (fx.x2 - fx.x1) * step;
      const hy = fx.y1 + (fx.y2 - fx.y1) * step;
      ctx.fillStyle = `rgba(30,26,44,${0.55 * a})`;
      for (let gi = 0; gi < 3; gi++) {
        const gt = Math.max(0, step - gi * 0.16);
        ctx.fillRect(S(fx.x1 + (fx.x2 - fx.x1) * gt) - 2, S(fx.y1 + (fx.y2 - fx.y1) * gt) - 3, 4, 6);
      }
      if (step >= 1) {
        // the cross of the cut, gold for marked prey, steel for the rest
        const flash = Math.max(0, 1 - (prog - 0.45) * 3);
        ctx.strokeStyle = fx.prey ? `rgba(232,193,74,${flash})` : `rgba(222,214,196,${flash})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(S(fx.x2) - 5, S(fx.y2) - 5); ctx.lineTo(S(fx.x2) + 5, S(fx.y2) + 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(S(fx.x2) + 5, S(fx.y2) - 5); ctx.lineTo(S(fx.x2) - 5, S(fx.y2) + 5); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(30,26,44,${0.8 * a})`;
        ctx.fillRect(S(hx) - 2, S(hy) - 4, 5, 8);
      }
    } else if (fx.type === "talon") {
      // the stoop is a curve, not a line: out wide, down hard, and home again
      const life = fx.life || 520;
      const prog = 1 - fx.ttl / life;
      const side = ((Math.round(fx.x1 + fx.y1)) & 2) - 1;
      const cx = (fx.x1 + fx.x2) / 2 + side * 26;
      const cy = (fx.y1 + fx.y2) / 2 - 14;
      const bez = (t2) => {
        const u = 1 - t2;
        return [u * u * fx.x1 + 2 * u * t2 * cx + t2 * t2 * fx.x2,
                u * u * fx.y1 + 2 * u * t2 * cy + t2 * t2 * fx.y2];
      };
      const out = Math.min(1, prog / 0.5);
      const back = Math.max(0, (prog - 0.5) / 0.5);
      const tt = back > 0 ? 1 - back * back * (3 - 2 * back) : out * out;
      const lift = back > 0 ? Math.sin(back * Math.PI) * 9 : 0;
      const [hx, hy] = bez(tt);
      // ghost wingbeats trailing the flight
      for (let gi = 1; gi <= 2; gi++) {
        const gtt = back > 0 ? Math.min(1, tt + gi * 0.09) : Math.max(0, tt - gi * 0.09);
        const [gx, gy] = bez(gtt);
        ctx.fillStyle = `rgba(232,226,212,${(0.28 - gi * 0.11) * a})`;
        ctx.fillRect(S(gx) - 2, S(gy) - lift - 1, 5, 2);
      }
      if (out === 1 && back < 0.2) {
        ctx.fillStyle = `rgba(224,184,85,${0.9 - back * 4})`;
        ctx.fillRect(S(fx.x2) - 2, S(fx.y2) - 2, 5, 5);
      }
      const bx = S(hx), by = S(hy) - lift;
      const ink = `rgba(16,19,26,${Math.min(1, a + 0.2)})`;
      ctx.fillStyle = ink;
      if (back === 0) {
        // wings swept for the dive
        ctx.fillRect(bx - 2, by - 3, 2, 3); ctx.fillRect(bx + 1, by - 3, 2, 3);
        ctx.fillRect(bx - 1, by - 1, 3, 3);
      } else {
        // the climb home, wings beating
        const upstroke = Math.sin(prog * 26) > 0;
        if (upstroke) { ctx.fillRect(bx - 4, by - 2, 3, 2); ctx.fillRect(bx + 2, by - 2, 3, 2); }
        else { ctx.fillRect(bx - 5, by, 3, 2); ctx.fillRect(bx + 3, by, 3, 2); }
        ctx.fillRect(bx - 1, by - 1, 3, 3);
      }
      ctx.fillStyle = `rgba(160,130,88,${a})`; ctx.fillRect(bx - 1, by, 2, 1);
      ctx.fillStyle = `rgba(232,226,212,${a})`; ctx.fillRect(bx - 1, by + 1, 2, 1);
    } else if (fx.type === "midas") {
      // the golden mistake: a ring of mint-light and rising coins
      const prog = 1 - fx.ttl / fx.life;
      ctx.strokeStyle = `rgba(232,193,74,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), prog * 26, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const ang = i * 1.26 + 0.4;
        ctx.fillStyle = i % 2 ? `rgba(240,216,133,${a})` : `rgba(216,179,74,${a})`;
        ctx.fillRect(S(fx.x + Math.cos(ang) * prog * 18), S(fx.y + Math.sin(ang) * prog * 12 - prog * 14), 3, 3);
      }
    } else if (fx.type === "toll") {
      // the gravecaller's bell: two witch-purple rings, one chasing the other
      const prog = 1 - fx.ttl / 550;
      ctx.strokeStyle = `rgba(176,138,216,${a * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), prog * fx.r, 0, 7); ctx.stroke();
      if (prog > 0.3) {
        ctx.strokeStyle = `rgba(124,224,184,${a * 0.5})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), (prog - 0.3) * fx.r, 0, 7); ctx.stroke();
      }
      ctx.lineWidth = 1;
    } else if (fx.type === "plagueburst") {
      // a ghast going up: a burst ring of rot with gobbets flung outward
      const prog = 1 - fx.ttl / 500;
      const r = prog * fx.r;
      ctx.fillStyle = `rgba(112,138,70,${a * 0.3})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(140,168,88,${a * 0.85})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(196,220,130,${a})`;
      for (let i = 0; i < 7; i++) {
        const ang = i * 0.9 + 0.4;
        const rr = r * (0.5 + (i % 3) * 0.25);
        const fall = prog * prog * 18;
        ctx.fillRect(S(fx.x + Math.cos(ang) * rr), S(fx.y + Math.sin(ang) * rr * 0.7 + fall - prog * 10), i % 2 ? CELL : CELL + 1, CELL + 1);
      }
    } else if (fx.type === "wardwave") {
      // a chaplain's ward washing out over the column — cold blue, not green
      const prog = 1 - fx.ttl / 550;
      const r = prog * fx.r;
      ctx.strokeStyle = `rgba(150,190,235,${a * 0.85})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
      // little shield glyphs riding the wavefront
      ctx.fillStyle = `rgba(210,228,245,${a})`;
      for (let i = 0; i < 4; i++) {
        const ang = i * 1.57 + 0.4;
        const px2 = S(fx.x + Math.cos(ang) * r), py2 = S(fx.y + Math.sin(ang) * r * 0.85);
        ctx.fillRect(px2 - CELL, py2 - CELL, CELL * 3, CELL * 2);
        ctx.fillRect(px2, py2 + CELL, CELL, CELL);
      }
    } else if (fx.type === "bolt") {
      // a crossbow quarrel in flight, drawn as the streak it leaves
      const prog = 1 - fx.ttl / 170;
      const hx = fx.x + (fx.tx - fx.x) * prog, hy = fx.y + (fx.ty - fx.y) * prog;
      const bx = fx.x + (fx.tx - fx.x) * Math.max(0, prog - 0.35);
      const by = fx.y + (fx.ty - fx.y) * Math.max(0, prog - 0.35);
      ctx.strokeStyle = `rgba(232,224,200,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S(bx), S(by)); ctx.lineTo(S(hx), S(hy)); ctx.stroke();
      ctx.lineWidth = 1;
    } else if (fx.type === "raise") {
      // grave-light: witch-fire motes rising as a corpse claws back up
      const prog = 1 - fx.ttl / fx.life;
      ctx.fillStyle = `rgba(176,138,216,${a * 0.4})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 12 * (1 - prog * 0.5), 0, 7); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const rise = prog * (14 + (i % 3) * 8);
        ctx.fillStyle = i % 2 ? `rgba(124,200,92,${a})` : `rgba(176,138,216,${a})`;
        ctx.fillRect(S(fx.x - 8 + i * 4), S(fx.y + 2 - rise), CELL, CELL * 2);
      }
    } else if (fx.type === "shrapnel") {
      // actual flying shards: fling out, then rain down
      const prog = 1 - fx.ttl / fx.life;
      for (let i = 0; i < 7; i++) {
        const ang = i * 0.9 + 0.35;
        const dist = prog * (22 + (i % 3) * 9);
        const fall = prog * prog * 26 - prog * 12;
        ctx.fillStyle = i % 2 ? `rgba(184,184,192,${a})` : `rgba(138,138,146,${a})`;
        ctx.fillRect(S(fx.x + Math.cos(ang) * dist), S(fx.y + Math.sin(ang) * dist * 0.6 + fall), i % 3 === 0 ? 3 : 2, 2);
      }
    } else if (fx.type === "shrapnelhit") {
      // small sharp puff where a shard lands
      ctx.fillStyle = `rgba(170,160,140,${a * 0.5})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 8 * (1 - a * 0.4), 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(190,186,176,${a})`;
      for (let i = 0; i < 3; i++) {
        const ang = i * 2.1 + 0.5;
        ctx.fillRect(S(fx.x + Math.cos(ang) * 7), S(fx.y + Math.sin(ang) * 5), 2, 2);
      }
    } else if (fx.type === "death") {
      // flash white, then crumble into drifting pixels
      const spr = SPRITES[fx.etype];
      if (spr) {
        const sp = spr.px || CELL;   // hi-res sprites crumble on their own grid
        const prog = 1 - fx.ttl / fx.life;
        if (prog < 0.22) {
          ctx.globalAlpha = 0.9;
          const map = spr.frames[0];
          const w2 = map[0].length, h2 = map.length;
          const ox2 = Math.round((fx.x - (w2 * sp) / 2) / sp) * sp;
          const oy2 = Math.round((fx.y - (h2 * sp) / 2) / sp) * sp;
          ctx.fillStyle = "#f4f2ea";
          for (let rr = 0; rr < h2; rr++) {
            for (let cc = 0; cc < w2; cc++) {
              if (map[rr][fx.face < 0 ? w2 - 1 - cc : cc] !== ".") ctx.fillRect(ox2 + cc * sp, oy2 + rr * sp, sp, sp);
            }
          }
          ctx.globalAlpha = 1;
        } else {
          const p2 = (prog - 0.22) / 0.78;
          const map = spr.frames[0];
          const w2 = map[0].length, h2 = map.length;
          const ox2 = fx.x - (w2 * sp) / 2, oy2 = fx.y - (h2 * sp) / 2;
          ctx.globalAlpha = 1 - p2;
          for (let rr = 0; rr < h2; rr++) {
            for (let cc = 0; cc < w2; cc++) {
              const ch = map[rr][fx.face < 0 ? w2 - 1 - cc : cc];
              if (ch === "." || ch === undefined) continue;
              const hash = ((rr * 31 + cc * 17) % 13) / 13;
              if (hash < p2 * 1.15) continue; // pixels crumble away over time
              const dpal = fx.revived && UNDEAD_PALS[fx.etype] ? UNDEAD_PALS[fx.etype] : spr.pal;
              const col = dpal?.[ch];
              if (!col) continue;
              const scatter = p2 * (hash - 0.5) * 26;
              const fall = p2 * p2 * (18 + hash * 22);
              ctx.fillStyle = col;
              ctx.fillRect(S(ox2 + cc * sp + scatter), S(oy2 + rr * sp + fall), sp, sp);
            }
          }
          ctx.globalAlpha = 1;
        }
      }
    } else if (fx.type === "coin") {
      ctx.fillStyle = `rgba(232,212,122,${a})`;
      ctx.font = fx.big ? "bold 16px monospace" : "bold 12px monospace";
      ctx.fillText(fx.text, fx.x, fx.y - (700 - fx.ttl) * 0.02);
    } else if (fx.type === "poof") {
      ctx.fillStyle = `rgba(220,218,210,${a * 0.7})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 12 * (1 - a) + 4, 0, 7); ctx.fill();
    } else if (fx.type === "hit") {
      ctx.fillStyle = `rgba(224,110,100,${a})`;
      ctx.fillRect(S(fx.x) - 2, S(fx.y) - 2, 4, 4);
    } else if (fx.type === "spark") {
      ctx.fillStyle = fx.gold ? `rgba(232,212,122,${a})` : `rgba(240,240,240,${a})`;
      for (let i = 0; i < 4; i++) {
        const ang = i * 1.57 + 0.4;
        ctx.fillRect(S(fx.x + Math.cos(ang) * 6), S(fx.y + Math.sin(ang) * 6), CELL, CELL);
      }
    } else if (fx.type === "burst") {
      const prog = 1 - fx.ttl / fx.life;
      ctx.fillStyle = fx.gold ? `rgba(232,196,90,${1 - prog})` : `rgba(150,224,150,${1 - prog})`;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + (fx.gold ? prog * 1.6 : 0);
        const r = prog * (fx.gold ? 44 : 30);
        ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.75 - prog * 8), CELL, CELL);
      }
    } else if (fx.type === "flash") {
      const fa = fx.ttl / 450;
      ctx.fillStyle = `rgba(244,240,224,${fa * 0.5})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 34 * (1.4 - fa), 0, 7); ctx.fill();
    } else if (fx.type === "levelup" || fx.type === "evolve") {
      ctx.strokeStyle = fx.type === "evolve" ? `rgba(232,196,90,${a})` : `rgba(150,224,150,${a})`;
      ctx.lineWidth = 3;
      const r = (1 - fx.ttl / (fx.type === "evolve" ? 900 : 600)) * 34 + 10;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
    } else if (fx.type === "leak") {
      ctx.fillStyle = `rgba(224,90,80,${a})`;
      ctx.font = "bold 18px monospace";
      ctx.fillText(fx.text || "-1", fx.x, fx.y - 14 - (700 - fx.ttl) * 0.02);
    } else if (fx.type === "pierce") {
      ctx.fillStyle = `rgba(232,212,122,${a * 0.7})`;
      ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 8, 0, 7); ctx.fill();
    }
  }

  // ---- passing life (purely cosmetic) ----
  // now and then a pair of birds crosses the high sky — not over the fens
  if (REALM.ambient !== "wisps") {
    const cyc = ((g.time + 7) % 23) / 23;
    if (cyc < 0.42) {
      const bx = -20 + cyc / 0.42 * (W + 40);
      for (let bi = 0; bi < 2; bi++) {
        const wx = S(bx - bi * 14);
        const wy = S(40 + bi * 9 + Math.sin(g.time * 2.4 + bi) * 3);
        const up = Math.sin(g.time * 8 + bi * 1.7) > 0;
        ctx.fillStyle = "rgba(26,30,38,0.55)";
        if (up) { ctx.fillRect(wx - 2, wy - 1, 2, 1); ctx.fillRect(wx + 1, wy - 1, 2, 1); ctx.fillRect(wx, wy, 1, 1); }
        else { ctx.fillRect(wx - 2, wy + 1, 2, 1); ctx.fillRect(wx + 1, wy + 1, 2, 1); ctx.fillRect(wx, wy, 1, 1); }
      }
    }
  }
  // butterflies work the greenwood meadows
  if (REALM.ambient === "leaves") {
    for (let i = 0; i < 3; i++) {
      const ax = (i * 173 + 89) % W, ay = (i * 131 + 60) % (H - 80) + 30;
      const fx2 = ax + Math.sin(g.time * 0.7 + i * 2.4) * 34 + Math.sin(g.time * 1.9 + i) * 10;
      const fy2 = ay + Math.cos(g.time * 0.53 + i * 1.8) * 22 + Math.sin(g.time * 2.6 + i) * 5;
      const open = Math.sin(g.time * 11 + i * 2) > 0;
      const col = i % 2 ? "#e8dcc0" : "#e0a050";
      ctx.fillStyle = col;
      if (open) { ctx.fillRect(S(fx2) - 2, S(fy2) - 1, 2, 2); ctx.fillRect(S(fx2) + 1, S(fy2) - 1, 2, 2); }
      else ctx.fillRect(S(fx2) - 1, S(fy2) - 1, 3, 2);
      ctx.fillStyle = "rgba(16,19,26,0.8)";
      ctx.fillRect(S(fx2), S(fy2), 1, 2);
    }
  }

  // ---- ambient weather (per realm, purely cosmetic) ----
  // Snow, embers, fireflies, leaves, blown grit — all of it derived from
  // g.time in render/atmosphere.js, so there is no state to keep.
  drawAmbient(ctx, g.time);
  ctx.restore();

  // The realm's light, laid over the finished board in buffer space so camera
  // zoom and screen shake can't drag the vignette around with them.
  ctx.save();
  ctx.scale(RES, RES);
  drawGrade(ctx);
  drawBanner(ctx, g);
  ctx.restore();

  const sc = cv.getContext("2d");
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.imageSmoothingEnabled = true;
  sc.clearRect(0, 0, W * RES, H * RES);
  sc.drawImage(buf, 0, 0);

  if (g.paused && g.phase !== "won" && g.phase !== "lost") {
    sc.save();
    sc.scale(RES, RES);
    sc.fillStyle = "rgba(16,14,20,0.5)";
    sc.fillRect(0, 0, W, H);
    sc.fillStyle = "#e8d47a";
    sc.font = "bold 24px monospace";
    sc.textAlign = "center"; sc.textBaseline = "middle";
    sc.fillText("* PAUSED *", W / 2, H / 2);
    sc.restore();
  }
}
