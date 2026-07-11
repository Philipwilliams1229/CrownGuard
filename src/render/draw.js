// ============ MASTER RENDER ============
// Paints one whole frame into a half-resolution buffer (for the crisp
// low-res pixel look), then upscales it — with smoothing off — onto the
// visible canvas. Handles camera zoom/pan, terrain, path, build previews,
// depth-sorted actors, projectiles, floating effects, and the pause overlay.

import {
  W, H, CELL, S, INK, CASTLE_HP, RALLY_RANGE,
  GRASS, GRASS_DK, GRASS_LT, PATH_HALF, PATH_MAIN, PATH_DK, PATH_EDGE,
} from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { GRASS_PATCHES, TUFTS, FLOWERS, PEBBLES, CHEVRONS, DECOR } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { getStats } from "../engine/towers.js";
import { buildableAt } from "../engine/actions.js";
import { drawEnemy, drawKnightUnit } from "./enemies.js";
import { drawArcherTower, drawWizardSpire, drawGarrison, drawSupportTower, drawCatapult } from "./towers.js";
import { drawTree, drawCastle, drawCave } from "./scenery.js";

export function draw(g, canvas, bufRef) {
  const cv = canvas;
  if (!cv) return;
  let buf = bufRef.current;
  if (!buf) {
    buf = document.createElement("canvas");
    buf.width = W / 2; buf.height = H / 2;
    bufRef.current = buf;
  }
  const ctx = buf.getContext("2d");
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W / 2, H / 2);
  ctx.scale(0.5, 0.5);
  if (g.shake > 0) ctx.translate(S((Math.random() - 0.5) * g.shake), S((Math.random() - 0.5) * g.shake));
  ctx.scale(g.cam.zoom, g.cam.zoom);
  ctx.translate(-g.cam.x, -g.cam.y);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  ctx.fillStyle = GRASS;
  ctx.fillRect(0, 0, W, H);
  for (const p of GRASS_PATCHES) {
    ctx.fillStyle = p.s > 0.5 ? GRASS_LT : GRASS_DK;
    ctx.fillRect(S(p.x - p.r), S(p.y - p.r * 0.6), S(p.r * 2), S(p.r * 1.2));
  }
  ctx.fillStyle = GRASS_DK;
  for (const tf of TUFTS) {
    const sway = Math.sin(g.time * 1.8 + tf.p) > 0 ? CELL : 0;
    ctx.fillRect(S(tf.x) + sway, S(tf.y - 5 * tf.s), CELL, S(5 * tf.s));
    ctx.fillRect(S(tf.x) + CELL * 2 + sway, S(tf.y - 4 * tf.s), CELL, S(4 * tf.s));
  }
  // wildflowers
  for (const f of FLOWERS) {
    const sway = Math.sin(g.time * 1.5 + f.p) > 0 ? CELL : 0;
    ctx.fillStyle = GRASS_DK;
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
  strokePath(PATH_HALF * 2 + 10, PATH_EDGE);
  strokePath(PATH_HALF * 2 + 4, PATH_DK);
  strokePath(PATH_HALF * 2 - 4, PATH_MAIN);
  ctx.lineWidth = 1;
  for (const pb of PEBBLES) {
    ctx.fillStyle = pb.s > 0.6 ? PATH_DK : "#d2ba8e";
    ctx.fillRect(S(pb.x), S(pb.y), S(pb.r * 2) || CELL, S(pb.r * 1.4) || CELL);
  }
  for (const ch of CHEVRONS) {
    const on = Math.sin(g.time * 2.2 - ch.d * 0.045) > 0;
    ctx.save();
    ctx.translate(S(ch.x), S(ch.y));
    ctx.rotate(Math.round(ch.a / (Math.PI / 2)) * (Math.PI / 2));
    ctx.fillStyle = on ? "rgba(60,46,28,0.55)" : "rgba(60,46,28,0.28)";
    ctx.fillRect(-4, -6, 3, 3); ctx.fillRect(-1, -3, 3, 3); ctx.fillRect(2, 0, 3, 3);
    ctx.fillRect(-1, 3, 3, 3); ctx.fillRect(-4, 6, 3, 3);
    ctx.restore();
  }

  drawCave(ctx, g.time);

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
      const r = p.big ? 6 : 4;
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
