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
import { DECOR, PONDS, RIVERS, BRIDGES, bridgeLift, underBridge } from "../data/terrain.js";
import { groundLayer, drawRoadLive } from "./world.js";
import { ball as pip, glow as glowFx, shadow as softShadow, cylinder } from "./paint.js";
import { TOWERS } from "../data/towers.js";
import { getStats } from "../engine/towers.js";
import { buildableAt } from "../engine/actions.js";
import { SPRITES, UNDEAD_PALS } from "../sprites/sprites.js";
import { hasRig, rigPixels, drawRig } from "./rigs.js";
import { ENEMIES } from "../data/enemies.js";
import { drawEnemy, drawKnightUnit, drawBandUnit } from "./enemies.js";
import { drawArcherTower, drawWizardSpire, drawGarrison, drawSupportTower, drawCatapult, drawBladewheel, drawGoldworks, drawTrapsmith, drawFalconry, drawSunforge, drawAssassin, drawRiverwatchHall, drawGunpowder } from "./towers.js";
import { drawTree, drawPond, drawRiver, drawBridge, drawCastle, drawCastleWorks, drawSpawn, drawSpawnSign } from "./scenery.js";
import { drawCloudShadows, drawAmbient, drawGrade } from "./atmosphere.js";
import { drawGround, drawLog, isBlast, drawBlast, drawScorch, drawProjectile, drawChain, drawQuarrel, drawSpark, drawPoof, drawFlash, drawFloatText, ringPx } from "./fx.js";

// The wave announcement: a ribbon that sweeps in, holds, and clears. Drawn in
// buffer space over the finished board, so it reads at any camera zoom. It's
// the one piece of type on the field, so it stays short and gets out of the way.
const BANNER_LIFE = 2.4;
const PAINT_WARNED = new Set();   // hall kinds whose painter has thrown (logged once)

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
  // cached art is stamped pixel for pixel; zoom scales those pixels whole
  ctx.imageSmoothingEnabled = false;
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

  // a River Watch skiff in under a bridge is drawn with the water, so the
  // span passes over it; everywhere else it sorts with the other actors
  const underSpan = new Set();
  if (BRIDGES.length) for (const t of g.towers) {
    if (t.kind !== "riverwatch" || !t.units) continue;
    for (const u of t.units) {
      if (u.state === "dead" || !underBridge(u.x, u.y)) continue;
      underSpan.add(u);
      drawKnightUnit(ctx, u, t, g.time);
    }
  }

  // timber spans wherever the road wades a river — over the road texture
  // and the boats beneath, under everything that walks
  for (const b of BRIDGES) drawBridge(ctx, b, g.time, posAt, angleAt, REALM.bridge);

  // the trapsmith's work, waiting flush with the road
  if (g.traps) {
    for (const tr of g.traps) {
      const tx = tr.x, ty = tr.y;
      const kind = tr.kind || (tr.sky ? "balloon" : tr.branch === "b" ? "mine" : "jaws");
      if (kind === "balloon") {
        const by = ty - 13 + Math.sin(g.time * 2 + tr.x) * 1.5;
        softShadow(ctx, tx, ty + 1, 3, 1.2, 0.25);
        ctx.strokeStyle = "rgba(16,19,26,0.7)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, by + 4); ctx.stroke();
        pip(ctx, tx, by, 3.2, 3.6, "#c05848", { hi: 0.5, lo: 0.45 });
        pip(ctx, tx, by + 4.5, 1.6, 1.4, "#3a3028", { hi: 0.3, lo: 0.4 });
        glowFx(ctx, tx + 0.6, by + 4.5, 1.2, Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a", 0.9);
      } else if (kind === "spike") {
        ctx.fillStyle = "#6c727e"; ctx.fillRect(tx - 7, ty - 0.5, 14, 2.4);
        ctx.fillStyle = "#c4c8d0";
        for (let i2 = 0; i2 < 5; i2++) { const sx = tx - 6 + i2 * 3; ctx.beginPath(); ctx.moveTo(sx - 0.8, ty); ctx.lineTo(sx, ty - 3.5); ctx.lineTo(sx + 0.8, ty); ctx.closePath(); ctx.fill(); }
      } else if (kind === "caltrop") {
        for (let i2 = 0; i2 < 4; i2++) {
          const cx2 = tx - 5 + ((i2 * 7) % 11), cy2 = ty - 2 + ((i2 * 5) % 6);
          ctx.strokeStyle = "#8a8f9a"; ctx.lineWidth = 0.9; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(cx2 - 2, cy2 + 1); ctx.lineTo(cx2 + 2, cy2 + 1); ctx.moveTo(cx2, cy2 + 1); ctx.lineTo(cx2, cy2 - 2.4); ctx.moveTo(cx2, cy2 + 1); ctx.lineTo(cx2 + 1.4, cy2 + 2.4); ctx.stroke();
        }
      } else if (kind === "mine") {
        pip(ctx, tx, ty, 5.5, 4, "#5f636d", { hi: 0.45, lo: 0.5 });
        glowFx(ctx, tx, ty - 0.5, 1.2, Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a", 0.9);
      } else {
        // bear-iron: open jaws, teeth up
        ctx.fillStyle = "#6c727e"; ctx.fillRect(tx - 8, ty - 1, 16, 3.4);
        ctx.fillStyle = "#b8bcc4";
        for (let i2 = 0; i2 < 4; i2++) { const sx = tx - 6.5 + i2 * 4; ctx.beginPath(); ctx.moveTo(sx - 1, ty - 1); ctx.lineTo(sx, ty - 3.5); ctx.lineTo(sx + 1, ty - 1); ctx.closePath(); ctx.fill(); }
        pip(ctx, tx, ty + 0.5, 2, 1.4, "#3a3e48", { hi: 0.3, lo: 0.4 });
      }
    }
  }

  // clouds crossing the sun — over the ground, under everything standing on it
  drawCloudShadows(ctx, g.time);

  // Scorch marks and the ground half of every blast (its shockwave and
  // wash), drawn here, before the actors, so the crowd stands IN the blast
  // and walks over the burn rather than under it. All baked in render/fx.js.
  for (const fx of g.effects) {
    if (fx.type === "scorch") drawScorch(ctx, fx);
  }
  for (const fx of g.effects) {
    if (isBlast(fx.type)) drawBlast(ctx, fx, "g");
  }

  // lingering ground effects: lava pools, the ghasts' plague, spore clouds
  // and the Caltrop Field's beds — pixel decals from fx.js
  if (g.grounds) {
    const tmsG = g.time * 1000;
    for (const gr of g.grounds) drawGround(ctx, gr, g.time, tmsG);
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
    // one hall's painter failing must never take the whole frame (and the
    // game with it) down: skip it this frame, restore the pen, say so once
    ctx.save();
    try { paintTowerRaw(t); }
    catch (err) { if (!PAINT_WARNED.has(t.kind)) { PAINT_WARNED.add(t.kind); console.error("hall paint failed", t.kind, err); } }
    ctx.restore();
  };
  const paintTowerRaw = (t) => {
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

  // whoever stands on a bridge is drawn up on its arched deck
  const onDeck = (x, y, fn) => {
    const lift = BRIDGES.length ? bridgeLift(x, y) : 0;
    if (!lift) return fn();
    ctx.save(); ctx.translate(0, -lift); fn(); ctx.restore();
  };
  const drawables = [];
  for (const d of DECOR) drawables.push({ y: d.y + 14, fn: () => drawTree(ctx, d, g.time) });
  // the tower you're about to buy, standing on the spot at half weight
  if (g.buildMode && g.hover) {
    const [hx, hy] = g.hover;
    // every field a real, freshly built hall carries — the hall painters read
    // their crew's timers, and a missing one poisoned a whole frame (NaN glow)
    const ghost = {
      kind: g.buildMode, x: S(hx), y: S(hy), level: 1,
      branch: null, rank4: null, id: 0, anim: 0, lastAim: 0, rally: null, range: 0,
      cd: 0, aim: "first", shotIdx: 0, critIdx: 0, invested: 0, units: [], kills: 0, dmgOut: 0,
      liveTime: 0, _idle: true, charges: 0, ramp: 0, mAnim: 0, eagle: null,
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
    if (t.units) for (const u of t.units) if (!underSpan.has(u)) drawables.push({ y: u.y + 9, fn: () => onDeck(u.x, u.y, () => drawKnightUnit(ctx, u, t, g.time)) });
  }
  if (g.bands) for (const b of g.bands) {
    for (const u of b.units) drawables.push({ y: u.y + 9, fn: () => onDeck(u.x, u.y, () => drawBandUnit(ctx, u, b, g.time)) });
    // a fallen hero's ghost of a marker, and the militia's dwindling time
    if (b.kind === "hero" && b.units[0].state === "dead") drawables.push({ y: b.rally.y, fn: () => {
      const left = Math.max(0, Math.ceil(b.units[0].respawn / 1000));
      ctx.fillStyle = "rgba(20,16,20,0.6)"; ctx.fillRect(b.rally.x - 12, b.rally.y - 4, 24, 9);
      ctx.fillStyle = "#e8d47a"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${left}s`, b.rally.x, b.rally.y + 0.5);
    } });
  }
  const tms = g.time * 1000;
  for (const e of g.enemies) {
    if (!e.dead) drawables.push({ y: e.y + 10, fn: () => (e.flying ? drawEnemy(ctx, e, g.time, tms) : onDeck(e.x, e.y, () => drawEnemy(ctx, e, g.time, tms))) });
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
  // fray, the mistress on their backs.
  for (const t of g.towers) {
    if (t.kind !== "falconry" || !t.eagle) continue;
    const eg = t.eagle;
    if (eg.respawn > 0) continue;
    const face = eg.targetId ? (Math.cos(Math.atan2(0, 1)) >= 0 ? 1 : 1) : 1;
    const dir = (eg.vx ?? 1) < 0 ? -1 : 1;
    softShadow(ctx, eg.x + 4, eg.y + 22, 12, 3, 0.24);
    drawRig(ctx, "eagle", eg.x, eg.y + 10, dir, "walk", Math.floor(g.time * 8 + t.id) % 4);
    if (eg.healGlow > 0) for (let i2 = 0; i2 < 3; i2++) glowFx(ctx, eg.x - 8 + i2 * 8, eg.y - 18 - ((g.time * 22 + i2 * 6) % 10), 1.4, "#8ce08c", 0.8);
    if (eg.hp < eg.maxHp) {
      ctx.fillStyle = INK; ctx.fillRect(eg.x - 12, eg.y - 22, 24, 5);
      ctx.fillStyle = eg.hp / eg.maxHp > 0.4 ? "#7fc95e" : "#e07a72";
      ctx.fillRect(eg.x - 11, eg.y - 21, Math.max(1, Math.round(22 * eg.hp / eg.maxHp)), 3);
    }
  }

  if (g.logs) {
    for (const lg of g.logs) drawLog(ctx, lg, g.time);
  }

  drawCastle(ctx, g.time, Math.min(1, Math.max(0, g.lives) / CASTLE_HP));
  drawCastleWorks(ctx, g);

  // ---- the spawn marker ----
  // Drawn after everything standing so nothing hides it; the sign itself
  // (and where it stands) lives with the rest of the scenery.
  drawSpawnSign(ctx, g.time, g.phase);

  // shots in flight: arrows, orbs, boulders, shells, spikes, musket balls —
  // each a cached pixel sprite (render/fx.js)
  for (const p of g.projectiles) {
    if (p.delay > 0) continue;
    drawProjectile(ctx, p, g.time);
  }

  for (const fx of g.effects) {
    const a = Math.min(1, fx.ttl / 300);
    if (isBlast(fx.type)) {
      // the air half of a blast (fireball, flash, flying debris); its ground
      // half went down under the crowd earlier. Shrapnel landings are small dust.
      drawBlast(ctx, fx, "a");
    } else if (fx.type === "bolt") {
      // chain lightning between struck foes — or, carrying x/tx instead of
      // pts, a crossbow quarrel or a harpoon in flight
      if (fx.pts) drawChain(ctx, fx); else drawQuarrel(ctx, fx);
    } else if (fx.type === "frostnova") {
      // expanding ring of biting cold
      const prog = 1 - fx.ttl / 500;
      const r = prog * fx.r;
      ctx.strokeStyle = `rgba(124,212,212,${a * 0.9})`;
      ctx.lineWidth = 3;
      ringPx(ctx, fx.x, fx.y, r, r, 2, ctx.strokeStyle);
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
      ringPx(ctx, fx.x, fx.y, r, r, 2, ctx.strokeStyle);
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
      ringPx(ctx, fx.x, fx.y, r, r, 1.5, ctx.strokeStyle);
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
      ringPx(ctx, fx.x, fx.y, prog * 26, prog * 26, 1.5, ctx.strokeStyle);
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
      ringPx(ctx, fx.x, fx.y, prog * fx.r, prog * fx.r, 1.5, ctx.strokeStyle);
      if (prog > 0.3) {
        ctx.strokeStyle = `rgba(124,224,184,${a * 0.5})`;
        ringPx(ctx, fx.x, fx.y, (prog - 0.3) * fx.r, (prog - 0.3) * fx.r, 1.5, ctx.strokeStyle);
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
      ringPx(ctx, fx.x, fx.y, r, r, 2, ctx.strokeStyle);
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
      ringPx(ctx, fx.x, fx.y, r, r, 1.5, ctx.strokeStyle);
      ctx.lineWidth = 1;
      // little shield glyphs riding the wavefront
      ctx.fillStyle = `rgba(210,228,245,${a})`;
      for (let i = 0; i < 4; i++) {
        const ang = i * 1.57 + 0.4;
        const px2 = S(fx.x + Math.cos(ang) * r), py2 = S(fx.y + Math.sin(ang) * r * 0.85);
        ctx.fillRect(px2 - CELL, py2 - CELL, CELL * 3, CELL * 2);
        ctx.fillRect(px2, py2 + CELL, CELL, CELL);
      }
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
    } else if (fx.type === "death" && hasRig(fx.etype)) {
      // a rigged foe: flash white, then come apart pixel by pixel
      const prog = 1 - fx.ttl / fx.life;
      const feet = fx.y + (ENEMIES[fx.etype]?.size || 15) * 0.55;
      const variant = fx.revived ? "revived" : "";
      if (fx.lite) {
        // a crowd's worth of deaths: a white blink and a puff, no crumble
        if (prog < 0.3) drawRig(ctx, fx.etype, fx.x, feet, fx.face, "walk", 0, "white", 0.9 * (1 - prog / 0.3));
        ctx.fillStyle = `rgba(220,214,200,${0.5 * (1 - prog)})`;
        ctx.beginPath(); ctx.ellipse(fx.x, feet - 3, 5 + prog * 8, 2.5 + prog * 3, 0, 0, 7); ctx.fill();
      } else if (prog < 0.22) drawRig(ctx, fx.etype, fx.x, feet, fx.face, "walk", 0, "white", 0.9);
      else {
        const p2 = (prog - 0.22) / 0.78;
        const px = rigPixels(fx.etype, variant);
        ctx.globalAlpha = 1 - p2;
        for (let i = 0; i < px.length; i++) {
          const [dx, dy, col] = px[i];
          const hh = ((i * 7919) % 13) / 13;
          if (hh < p2 * 1.15) continue;
          const scatter = p2 * (hh - 0.5) * 26;
          const fall = p2 * p2 * (18 + hh * 22);
          ctx.fillStyle = col;
          ctx.fillRect(fx.x + dx * fx.face + scatter, feet + dy + fall, 1, 1);
        }
        ctx.globalAlpha = 1;
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
      // a minted coin and the take, in the little arcade font
      drawFloatText(ctx, fx);
    } else if (fx.type === "poof") {
      drawPoof(ctx, fx);
    } else if (fx.type === "hit") {
      drawSpark(ctx, fx, "hit", 220);
    } else if (fx.type === "spark") {
      drawSpark(ctx, fx, fx.gold ? "gold" : "white", 200);
    } else if (fx.type === "burst") {
      const prog = 1 - fx.ttl / fx.life;
      ctx.fillStyle = fx.gold ? `rgba(232,196,90,${1 - prog})` : `rgba(150,224,150,${1 - prog})`;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + (fx.gold ? prog * 1.6 : 0);
        const r = prog * (fx.gold ? 44 : 30);
        ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.75 - prog * 8), CELL, CELL);
      }
    } else if (fx.type === "flash") {
      drawFlash(ctx, fx);
    } else if (fx.type === "levelup" || fx.type === "evolve") {
      const r = (1 - fx.ttl / (fx.type === "evolve" ? 900 : 600)) * 34 + 10;
      ctx.save(); ctx.globalAlpha = Math.ceil(a * 4) / 4;
      ringPx(ctx, fx.x, fx.y, r, r, 1.5, fx.type === "evolve" ? "#e8c45a" : "#96e096");
      ringPx(ctx, fx.x, fx.y, r - 1.5, r - 1.5, 0.5, "#fff3d2");
      ctx.restore();
    } else if (fx.type === "leak") {
      drawFloatText(ctx, fx, true);
    } else if (fx.type === "pierce") {
      drawSpark(ctx, fx, "gold", 250);
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
