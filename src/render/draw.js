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

import { W, H, CELL, S, INK, CASTLE_HP, RALLY_RANGE, PATH_HALF } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS, posAt, angleAt } from "../engine/path.js";
import { GRASS_PATCHES, TUFTS, FLOWERS, PEBBLES, CHEVRONS, DECOR, PONDS, SPECKS, RIVERS, BRIDGES } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { getStats } from "../engine/towers.js";
import { buildableAt } from "../engine/actions.js";
import { SPRITES, UNDEAD_PALS } from "../sprites/sprites.js";
import { drawEnemy, drawKnightUnit } from "./enemies.js";
import { drawArcherTower, drawWizardSpire, drawGarrison, drawSupportTower, drawCatapult, drawBladewheel, drawGoldworks, drawTrapsmith, drawFalconry, drawSunforge, drawAssassin } from "./towers.js";
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
  let buf = bufRef.current;
  if (!buf || buf.width !== W) {
    buf = document.createElement("canvas");
    buf.width = W; buf.height = H;
    bufRef.current = buf;
  }
  const ctx = buf.getContext("2d");
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  if (g.shake > 0) ctx.translate(S((Math.random() - 0.5) * g.shake), S((Math.random() - 0.5) * g.shake));
  ctx.scale(g.cam.zoom, g.cam.zoom);
  ctx.translate(-g.cam.x, -g.cam.y);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  ctx.fillStyle = REALM.GRASS;
  ctx.fillRect(0, 0, W, H);
  for (const p of GRASS_PATCHES) {
    ctx.fillStyle = p.s > 0.5 ? REALM.GRASS_LT : REALM.GRASS_DK;
    ctx.fillRect(S(p.x - p.r), S(p.y - p.r * 0.6), S(p.r * 2), S(p.r * 1.2));
  }
  // a second, smaller patch layer breaks up the first one's edges
  for (const p of GRASS_PATCHES) {
    if (p.s > 0.72) continue;
    ctx.fillStyle = p.s > 0.36 ? REALM.GRASS_DK : REALM.GRASS_LT;
    ctx.fillRect(S(p.x - p.r * 0.4), S(p.y - p.r * 0.3), S(p.r * 0.8), S(p.r * 0.5));
  }
  // stones, twigs and dry clumps on the turf
  for (const sp of SPECKS) {
    ctx.fillStyle = sp.k > 0.62 ? REALM.GRASS_DK : sp.k > 0.3 ? REALM.TUFT : REALM.GRASS_LT;
    ctx.fillRect(S(sp.x), S(sp.y), sp.w, sp.h);
  }
  for (const p of PONDS) drawPond(ctx, p, g.time);
  for (const rv of RIVERS) drawRiver(ctx, rv, g.time, REALM.water);
  ctx.fillStyle = REALM.TUFT;
  for (const tf of TUFTS) {
    const sway = Math.sin(g.time * 1.8 + tf.p) > 0 ? CELL : 0;
    ctx.fillRect(S(tf.x) + sway, S(tf.y - 5 * tf.s), CELL, S(5 * tf.s));
    ctx.fillRect(S(tf.x) + CELL * 2 + sway, S(tf.y - 4 * tf.s), CELL, S(4 * tf.s));
  }
  // wildflowers
  for (const f of FLOWERS) {
    const sway = Math.sin(g.time * 1.5 + f.p) > 0 ? CELL : 0;
    ctx.fillStyle = REALM.TUFT;
    ctx.fillRect(S(f.x) + 1, S(f.y) + 2, CELL, CELL * 2);
    ctx.fillStyle = f.c;
    ctx.fillRect(S(f.x) + sway, S(f.y) - 2, CELL * 2, CELL * 2);
    ctx.fillStyle = "#e8d47a";
    ctx.fillRect(S(f.x) + sway + 1, S(f.y) - 1, 2, 2);
  }

  const strokePath = (width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PTS[0][0], PTS[0][1]);
    for (let i = 1; i < PTS.length; i++) ctx.lineTo(PTS[i][0], PTS[i][1]);
    ctx.stroke();
  };
  strokePath(PATH_HALF * 2 + 10, REALM.PATH_EDGE);
  strokePath(PATH_HALF * 2 + 4, REALM.PATH_DK);
  strokePath(PATH_HALF * 2 - 4, REALM.PATH_MAIN);
  ctx.lineWidth = 1;
  for (const pb of PEBBLES) {
    ctx.fillStyle = pb.s > 0.6 ? REALM.PATH_DK : REALM.PEBBLE;
    ctx.fillRect(S(pb.x), S(pb.y), S(pb.r * 2) || CELL, S(pb.r * 1.4) || CELL);
  }
  for (const ch of CHEVRONS) {
    const on = Math.sin(g.time * 2.2 - ch.d * 0.045) > 0;
    // the road lights up under a marching column: chevrons within a stride
    // of any foe burn bright, so the board itself reads the advance
    let near = false;
    for (const e of g.enemies) {
      if (!e.dead && Math.abs(e.dist - ch.d) < 60) { near = true; break; }
    }
    ctx.save();
    ctx.translate(S(ch.x), S(ch.y));
    ctx.rotate(Math.round(ch.a / (Math.PI / 2)) * (Math.PI / 2));
    ctx.fillStyle = near
      ? `rgba(${REALM.CHEVRON},${on ? 0.95 : 0.7})`
      : on ? `rgba(${REALM.CHEVRON},0.55)` : `rgba(${REALM.CHEVRON},0.28)`;
    ctx.fillRect(-4, -6, 3, 3); ctx.fillRect(-1, -3, 3, 3); ctx.fillRect(2, 0, 3, 3);
    ctx.fillRect(-1, 3, 3, 3); ctx.fillRect(-4, 6, 3, 3);
    if (near) {                      // a hot core on the lit ones
      ctx.fillStyle = "rgba(255,240,200,0.5)";
      ctx.fillRect(-1, -3, 3, 3); ctx.fillRect(2, 0, 3, 3);
    }
    ctx.restore();
  }

  // timber spans wherever the road wades a river — over the road texture,
  // under everything that walks
  for (const b of BRIDGES) drawBridge(ctx, b, g.time, posAt, angleAt, REALM.bridge);

  // the trapsmith's work, waiting flush with the road
  if (g.traps) {
    for (const tr of g.traps) {
      const tx = S(tr.x), ty = S(tr.y);
      if (tr.sky) {
        // a bomb on a balloon, bobbing at flier height above its road anchor
        const by = ty - 13 + Math.sin(g.time * 2 + tr.x) * 1.5;
        ctx.fillStyle = "rgba(20,20,26,0.25)";
        ctx.fillRect(tx - 2, ty + 1, 5, 2);
        ctx.strokeStyle = "rgba(16,19,26,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx + 0.5, ty); ctx.lineTo(tx + 0.5, by + 4); ctx.stroke();
        ctx.fillStyle = INK;
        ctx.fillRect(tx - 2, by - 5, 6, 6);
        ctx.fillStyle = "#c05848";
        ctx.fillRect(tx - 1, by - 4, 4, 4);
        ctx.fillStyle = "#e8927a";
        ctx.fillRect(tx - 1, by - 4, 1, 2);
        ctx.fillStyle = INK;
        ctx.fillRect(tx - 1, by + 1, 4, 3);
        ctx.fillStyle = "#5f636d";
        ctx.fillRect(tx, by + 2, 2, 2);
        ctx.fillStyle = Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a";
        ctx.fillRect(tx, by + 2, 1, 1);
        continue;
      }
      if (tr.branch === "b") {
        // a pressure mine: steel disc, and a patient red eye
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#5f636d";
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#8a8f9a";
        ctx.fillRect(tx - 3, ty - 3, 3, 2);
        ctx.fillStyle = Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a";
        ctx.fillRect(tx - 1, ty - 1, 2, 2);
      } else if (tr.branch === "a") {
        // bear-iron: open jaws, teeth up
        ctx.fillStyle = INK;
        ctx.fillRect(tx - 8, ty - 2, 16, 5);
        ctx.fillStyle = "#8a8f9a";
        ctx.fillRect(tx - 7, ty - 1, 14, 3);
        ctx.fillStyle = "#b8bcc4";
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(tx - 7 + i * 4, ty - 3, 2, 3);
          ctx.fillRect(tx - 6 + i * 4, ty + 2, 2, 3);
        }
        ctx.fillStyle = "#3c2a18";
        ctx.fillRect(tx - 1, ty, 2, 2);
      } else {
        // a spike snare: wooden ring, whetted points
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#6e4c28";
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#c4c8d0";
        for (let i = 0; i < 4; i++) {
          const ang = i * 1.57 + 0.78;
          ctx.fillRect(S(tx + Math.cos(ang) * 3), S(ty + Math.sin(ang) * 3), 2, 2);
        }
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
    const ok = buildableAt(g, hx, hy) && g.gold >= TOWERS[g.buildMode].cost;
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
    drawables.push({
      y: t.y + 14,
      fn: () => {
        paintTower(t);
        if (!t.branch) {
          ctx.fillStyle = "#e8d47a";
          for (let i = 0; i < t.level; i++) ctx.fillRect(S(t.x) - 10 + i * 10, S(t.y) + 20, 4, 4);
        } else {
          ctx.fillStyle = "#e8d47a";
          ctx.fillRect(S(t.x) - 2, S(t.y) + 19, 4, 4);
          ctx.fillRect(S(t.x) - 4, S(t.y) + 21, 8, 2);
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

  // Skyknight war-eagles fly free of their roosts, so they paint above the fray
  for (const t of g.towers) {
    if (t.kind !== "falconry" || !t.eagle) continue;
    const eg = t.eagle;
    if (eg.respawn > 0) continue;   // the mistress whistles a new bird soon
    const ex = S(eg.x), ey = S(eg.y);
    const beat = Math.sin(g.time * 10 + t.id) > 0;
    const fighting = !!eg.targetId;
    ctx.fillStyle = "rgba(20,20,26,0.25)";
    ctx.fillRect(ex - 6, ey + 16, 12, 3);
    ctx.fillStyle = INK;
    if (beat) { ctx.fillRect(ex - 7, ey - 4, 5, 3); ctx.fillRect(ex + 2, ey - 4, 5, 3); }
    else { ctx.fillRect(ex - 8, ey - 1, 5, 3); ctx.fillRect(ex + 3, ey - 1, 5, 3); }
    ctx.fillRect(ex - 3, ey - 3, 6, 7);
    ctx.fillStyle = "#96764a";
    ctx.fillRect(ex - 2, ey - 2, 4, 5);
    ctx.fillStyle = "#ded6c4";
    if (beat) { ctx.fillRect(ex - 7, ey - 4, 2, 2); ctx.fillRect(ex + 5, ey - 4, 2, 2); }
    else { ctx.fillRect(ex - 8, ey - 1, 2, 2); ctx.fillRect(ex + 6, ey - 1, 2, 2); }
    ctx.fillRect(ex - 2, ey + 3, 4, 2);
    ctx.fillStyle = "#c04838";
    ctx.fillRect(ex - 1, ey - 3, 2, 3);
    ctx.fillStyle = "#e0b855";
    ctx.fillRect(ex - 1, ey + 2, 2, 1);
    if (fighting) { ctx.fillRect(ex - 3, ey + 5, 2, 2); ctx.fillRect(ex + 1, ey + 5, 2, 2); }
    if (eg.hp < eg.maxHp) {
      ctx.fillStyle = INK; ctx.fillRect(ex - 7, ey - 9, 14, 3);
      ctx.fillStyle = "#7fc95e"; ctx.fillRect(ex - 6, ey - 8, Math.max(1, Math.round(12 * eg.hp / eg.maxHp)), 1);
    }
  }

  drawCastle(ctx, g.time, Math.max(0, g.lives) / CASTLE_HP);

  // ---- the spawn marker ----
  // Drawn after everything standing, because it used to sit under the pines
  // beside the thicket and read as "EY COME". Loud while you're laying out
  // your defence, faint once the fighting starts and the horde speaks for
  // itself.
  {
    const [lsx, lsy] = PTS[0];
    const mx = S(lsx), my = S(lsy) - 46;
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

  // ---- ambient weather (per realm, purely cosmetic) ----
  // Snow, embers, fireflies, leaves, blown grit — all of it derived from
  // g.time in render/atmosphere.js, so there is no state to keep.
  drawAmbient(ctx, g.time);
  ctx.restore();

  // The realm's light, laid over the finished board in buffer space so camera
  // zoom and screen shake can't drag the vignette around with them.
  drawGrade(ctx);
  drawBanner(ctx, g);

  const sc = cv.getContext("2d");
  sc.imageSmoothingEnabled = false;
  sc.clearRect(0, 0, W, H);
  sc.drawImage(buf, 0, 0, W, H);

  if (g.paused && g.phase !== "won" && g.phase !== "lost") {
    sc.fillStyle = "rgba(16,14,20,0.5)";
    sc.fillRect(0, 0, W, H);
    sc.fillStyle = "#e8d47a";
    sc.font = "bold 24px monospace";
    sc.textAlign = "center"; sc.textBaseline = "middle";
    sc.fillText("* PAUSED *", W / 2, H / 2);
  }
}
