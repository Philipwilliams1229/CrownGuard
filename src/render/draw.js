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
import { PTS } from "../engine/path.js";
import { GRASS_PATCHES, TUFTS, FLOWERS, PEBBLES, CHEVRONS, DECOR, PONDS, SPECKS } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { getStats } from "../engine/towers.js";
import { buildableAt } from "../engine/actions.js";
import { SPRITES, UNDEAD_PALS } from "../sprites/sprites.js";
import { drawEnemy, drawKnightUnit } from "./enemies.js";
import { drawArcherTower, drawWizardSpire, drawGarrison, drawSupportTower, drawCatapult, drawBladewheel } from "./towers.js";
import { drawTree, drawPond, drawCastle, drawSpawn } from "./scenery.js";

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
    ctx.save();
    ctx.translate(S(ch.x), S(ch.y));
    ctx.rotate(Math.round(ch.a / (Math.PI / 2)) * (Math.PI / 2));
    ctx.fillStyle = on ? `rgba(${REALM.CHEVRON},0.55)` : `rgba(${REALM.CHEVRON},0.28)`;
    ctx.fillRect(-4, -6, 3, 3); ctx.fillRect(-1, -3, 3, 3); ctx.fillRect(2, 0, 3, 3);
    ctx.fillRect(-1, 3, 3, 3); ctx.fillRect(-4, 6, 3, 3);
    ctx.restore();
  }

  // lingering ground effects: pools of living lava
  if (g.grounds) {
    const tmsG = g.time * 1000;
    for (const gr of g.grounds) {
      const fade = Math.min(1, (gr.until - tmsG) / 600);
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

  const [lsx, lsy] = PTS[0];
  const bounce = Math.sin(g.time * 4) > 0 ? CELL : 0;
  ctx.fillStyle = "#e07a72";
  ctx.font = "bold 11px monospace";
  ctx.fillText("THEY COME", S(lsx), S(lsy) - 48);
  ctx.fillRect(S(lsx) - 5, S(lsy) - 42 + bounce, 10, 3);
  ctx.fillRect(S(lsx) - 2, S(lsy) - 39 + bounce, 4, 4);

  if (g.buildMode && g.hover) {
    const [hx, hy] = g.hover;
    const ok = buildableAt(g, hx, hy) && g.gold >= TOWERS[g.buildMode].cost;
    const radius = g.buildMode === "knight" ? RALLY_RANGE : TOWERS[g.buildMode].levels[0].range;
    ctx.fillStyle = ok ? "rgba(140,224,140,0.25)" : "rgba(224,110,100,0.28)";
    ctx.fillRect(S(hx) - 20, S(hy) - 20, 40, 40);
    ctx.strokeStyle = ok ? "rgba(140,224,140,0.6)" : "rgba(224,110,100,0.6)";
    ctx.beginPath(); ctx.arc(S(hx), S(hy), radius, 0, 7); ctx.stroke();
    const minR = TOWERS[g.buildMode].levels[0].minRange;
    if (minR) {
      ctx.strokeStyle = "rgba(224,110,100,0.55)";
      ctx.beginPath(); ctx.arc(S(hx), S(hy), minR, 0, 7); ctx.stroke();
    }
  }

  const sel = g.towers.find((t) => t.id === g.selectedId);
  if (sel) {
    const st = getStats(sel);
    const radius = sel.kind === "knight" ? RALLY_RANGE : st.range;
    ctx.fillStyle = "rgba(216,179,74,0.1)";
    ctx.strokeStyle = "rgba(216,179,74,0.6)";
    ctx.beginPath(); ctx.arc(S(sel.x), S(sel.y), radius, 0, 7); ctx.fill(); ctx.stroke();
    if (st.minRange) {
      ctx.strokeStyle = "rgba(224,110,100,0.55)";
      ctx.beginPath(); ctx.arc(S(sel.x), S(sel.y), st.minRange, 0, 7); ctx.stroke();
    }
  }

  const drawables = [];
  for (const d of DECOR) drawables.push({ y: d.y + 14, fn: () => drawTree(ctx, d, g.time) });
  for (const t of g.towers) {
    drawables.push({
      y: t.y + 14,
      fn: () => {
        if (t.kind === "archer") drawArcherTower(ctx, t, g.time);
        else if (t.kind === "wizard") drawWizardSpire(ctx, t, g.time);
        else if (t.kind === "support") drawSupportTower(ctx, t, g.time);
        else if (t.kind === "catapult") drawCatapult(ctx, t, g.time);
        else if (t.kind === "spiker") drawBladewheel(ctx, t, g.time);
        else drawGarrison(ctx, t, g.time);
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

  drawCastle(ctx, g.time, Math.max(0, g.lives) / CASTLE_HP);

  for (const p of g.projectiles) {
    if (p.delay > 0) continue;
    if (p.kind === "rock") {
      // boulder lobbed in an arc: shadow tracks the ground, rock rises above it
      const remaining = Math.hypot(p.tx - p.x, p.ty - p.y);
      const prog = p.total > 0 ? 1 - remaining / p.total : 1;
      const arcH = Math.sin(Math.min(1, Math.max(0, prog)) * Math.PI) * Math.min(64, p.total * 0.24);
      const r = p.mini ? 2.5 : p.big ? 6 : 4;
      ctx.fillStyle = "rgba(20,20,26,0.35)";
      ctx.fillRect(S(p.x) - r + 1, S(p.y) - 2, (r - 1) * 2, 4);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y - arcH), r + 1, 0, 7); ctx.fill();
      ctx.fillStyle = "#8a8a92";
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y - arcH), r, 0, 7); ctx.fill();
      ctx.fillStyle = "#a2a2aa";
      ctx.fillRect(S(p.x) - 2, S(p.y - arcH) - 2, 3, 2);
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
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 5, 0, 7); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 3.5, 0, 7); ctx.fill();
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
  // All particles are derived from g.time, so there is no state to keep.
  if (REALM.ambient === "snow") {
    for (let i = 0; i < 54; i++) {
      const sp = 16 + (i % 5) * 7;
      const y = (i * 97.3 + g.time * sp) % H;
      const x = (((i * 143.7 + Math.sin(g.time * 0.7 + i) * 14 + g.time * 6) % W) + W) % W;
      ctx.fillStyle = i % 4 === 0 ? "rgba(255,255,255,0.85)" : "rgba(238,246,252,0.6)";
      ctx.fillRect(S(x), S(y), i % 3 ? 2 : 3, i % 3 ? 2 : 3);
    }
  } else if (REALM.ambient === "embers") {
    for (let i = 0; i < 34; i++) {
      const sp = 20 + (i % 4) * 9;
      const rise = (i * 83.7 + g.time * sp) % (H + 40);
      const y = H + 20 - rise;
      const x = (((i * 191.3 + Math.sin(g.time * 1.3 + i * 2) * 9) % W) + W) % W;
      const a2 = Math.max(0, 1 - rise / (H + 40));
      ctx.fillStyle = i % 3 === 0 ? `rgba(240,170,90,${0.35 + 0.5 * a2})` : `rgba(216,100,60,${0.25 + 0.45 * a2})`;
      ctx.fillRect(S(x), S(y), 2, 2);
    }
  } else if (REALM.ambient === "fireflies") {
    // slow bands of marsh fog...
    for (let i = 0; i < 3; i++) {
      const fx2 = ((g.time * (5 + i * 3) + i * 300) % (W + 360)) - 180;
      const grad = ctx.createLinearGradient(fx2 - 130, 0, fx2 + 130, 0);
      grad.addColorStop(0, "rgba(196,212,188,0)");
      grad.addColorStop(0.5, "rgba(196,212,188,0.07)");
      grad.addColorStop(1, "rgba(196,212,188,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(fx2 - 130, 0, 260, H);
    }
    // ...and fireflies blinking as they wander
    for (let i = 0; i < 16; i++) {
      const bx = W / 2 + Math.sin(g.time * 0.22 + i * 2.4) * W * 0.46;
      const by = H / 2 + Math.sin(g.time * 0.31 + i * 1.7 + 2) * H * 0.42;
      const blink = Math.sin(g.time * (1.6 + (i % 5) * 0.3) + i * 3);
      if (blink > 0.2) {
        ctx.fillStyle = `rgba(200,232,120,${(blink - 0.2) * 0.3})`;
        ctx.fillRect(S(bx) - 2, S(by) - 2, 6, 6);
        ctx.fillStyle = `rgba(216,244,140,${(blink - 0.2) * 1.1})`;
        ctx.fillRect(S(bx), S(by), 2, 2);
      }
    }
  }
  ctx.restore();

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
