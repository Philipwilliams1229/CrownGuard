// ============ RENDER: ENEMIES & KNIGHTS ============
// Draws a walking/fighting enemy (with its status auras, burn, stun, health
// bar, armor badge) and a knight unit (weapon, buffs, heal glow, health bar).

import { INK, CELL, S } from "../data/constants.js";
import { SPRITES, KNIGHT_PALS, UNDEAD_PALS, drawSprite, whitePal } from "../sprites/sprites.js";

export const drawEnemy = (ctx, e, time, tms) => {
  const spr = SPRITES[e.type];
  // necromancer-raised foes wear grave-pale colors with witch-fire eyes
  const pal = e.revived && UNDEAD_PALS[e.type] ? UNDEAD_PALS[e.type] : spr.pal;
  const fighting = e.blockedBy && e.engaged;
  // sprites may define any number of walk frames (spr.frames), an optional
  // dedicated fight cycle (spr.fight), and their own animation rate (spr.rate)
  const walkRate = spr.rate || (e.type === "wolf" ? 8 : e.type === "goblin" || e.type === "orc" ? 5 : 4);
  let sheet = spr, frame;
  if (fighting && e.type !== "dragon") {
    if (spr.fight) { sheet = { frames: spr.fight, px: spr.px }; frame = Math.floor(time * 7 + e.id) % spr.fight.length; }
    else frame = Math.floor(time * 8) % spr.frames.length;
  } else {
    frame = Math.floor(time * walkRate + e.id) % spr.frames.length;
  }
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  const shw = Math.round(e.size * 0.6 / CELL) * CELL;
  ctx.fillRect(S(e.x - shw), S(e.y + e.size * 0.55), shw * 2, CELL * 2);
  const lunge = e.atkAnim > 0 ? CELL * e.face : 0;
  // dragons hover; small quick critters get a lively hop on their off-frames
  let hover = e.type === "dragon" ? S(Math.sin(time * 3 + e.id) * 3) - 10 : 0;
  if ((e.type === "goblin" || e.type === "wolf") && frame % 2 === 1 && !fighting) hover -= CELL;
  drawSprite(ctx, sheet, pal, frame, e.x + lunge, e.y + hover, e.face < 0);
  // white flash on solid hits
  if (e.hitFlash > tms) {
    ctx.globalAlpha = 0.7;
    drawSprite(ctx, sheet, whitePal(pal), frame, e.x + lunge, e.y + hover, e.face < 0);
    ctx.globalAlpha = 1;
  }
  // shaman's mending: green motes drift up off freshly-healed foes
  if (e.healedFlash > tms) {
    ctx.fillStyle = "#8ce08c";
    for (let i = 0; i < 2; i++) {
      const gy = e.y - e.size - 2 - ((time * 18 + i * 7 + e.id) % 9);
      ctx.fillRect(S(e.x - 6 + i * 12), S(gy), CELL, CELL);
    }
  }
  // Permafrost brittleness: pale cracks across the body
  if (e.brittleUntil > tms) {
    ctx.fillStyle = "#c8ecf4";
    ctx.fillRect(S(e.x - 4), S(e.y - 6), CELL, CELL);
    ctx.fillRect(S(e.x - 2), S(e.y - 3), CELL, CELL);
    ctx.fillRect(S(e.x + 3), S(e.y - 1), CELL, CELL);
    ctx.fillRect(S(e.x + 1), S(e.y + 4), CELL, CELL);
  }
  if (e.slowUntil > tms || e.auraSlow > 0) {
    ctx.fillStyle = "#9fd4e8";
    for (let i = 0; i < 3; i++) {
      const ang = time * 2 + i * 2.1;
      ctx.fillRect(S(e.x + Math.cos(ang) * 11), S(e.y - 2 + Math.sin(ang) * 4), CELL, CELL * 2);
    }
  }
  if (e.burnUntil > tms) {
    for (let i = 0; i < 3; i++) {
      const fx = e.x - 8 + i * 8;
      const fy = e.y - e.size - 2 - ((time * 30 + i * 7) % 8);
      ctx.fillStyle = i === 1 ? "#e8c14a" : "#d8763a";
      ctx.fillRect(S(fx), S(fy), CELL, CELL * 2);
    }
  }
  if (e.poisonUntil > tms) {
    ctx.fillStyle = "#7cc85c";
    for (let i = 0; i < 2; i++) {
      const py = e.y - 4 + ((time * 22 + i * 9 + e.id * 3) % 12);
      ctx.fillRect(S(e.x - 7 + i * 13), S(py), CELL, CELL * 2);
    }
  }
  if (e.stunUntil > tms) {
    ctx.fillStyle = "#e8d47a";
    for (let i = 0; i < 3; i++) {
      const ang = time * 6 + i * 2.09;
      ctx.fillRect(S(e.x + Math.cos(ang) * 11), S(e.y - e.size - 6 + Math.sin(ang) * 3), CELL, CELL);
    }
  }
  const w = e.boss ? 44 : 26;
  const pct = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = INK;
  ctx.fillRect(e.x - w / 2 - 1, e.y - e.size - 12, w + 2, 6);
  ctx.fillStyle = pct > 0.5 ? "#6fae5c" : pct > 0.25 ? "#d8b34a" : "#c05248";
  ctx.fillRect(e.x - w / 2, e.y - e.size - 11, Math.round(w * pct / CELL) * CELL, 4);
  if (e.armor >= 0.3) {
    ctx.fillStyle = "#9aa0ac";
    ctx.fillRect(e.x + w / 2 + 4, e.y - e.size - 12, 4, 4);
    ctx.fillRect(e.x + w / 2 + 5, e.y - e.size - 8, 2, 2);
  }
  // rune-ward badge: magic resistance
  if (e.mres >= 0.3) {
    ctx.fillStyle = "#b08ad8";
    ctx.fillRect(e.x - w / 2 - 8, e.y - e.size - 12, 4, 4);
    ctx.fillRect(e.x - w / 2 - 7, e.y - e.size - 8, 2, 2);
  }
  // raised shields / chaplain wards: one pip per blow still to be swallowed,
  // sitting just under the health bar so you can see them being spent
  if (e.guard > 0) {
    ctx.fillStyle = e.guardFlash > tms ? "#eaf2ff" : "#9ab6d8";
    for (let i = 0; i < Math.min(4, e.guard); i++) {
      const gx = e.x - w / 2 + i * 6;
      ctx.fillRect(S(gx), S(e.y - e.size - 5), CELL * 2, CELL * 2);
      ctx.fillRect(S(gx + 1), S(e.y - e.size - 3), CELL, CELL);
    }
  }
};

export const drawKnightUnit = (ctx, u, t, time) => {
  if (u.state === "dead") return;
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  const berserk = t.branch === "b";
  const paladin = t.branch === "a";
  const giant = r4 === "aa";
  const rider = r4 === "ba";
  const pal = giant ? KNIGHT_PALS.champion : paladin ? KNIGHT_PALS.paladin : berserk ? KNIGHT_PALS.berserk : KNIGHT_PALS.base;
  const frame = u.state === "moving" ? Math.floor(time * 8 + u.id) % 2 : 0;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(S(u.x - (giant ? 9 : rider ? 10 : 6)), S(u.y + 9), giant ? 18 : rider ? 20 : 12, CELL);
  if (rider) {
    // Wolf Lodge: a great wolf carries the berserker
    drawSprite(ctx, SPRITES.wolf, SPRITES.wolf.pal, frame, u.x, u.y + 3, u.face < 0);
    drawSprite(ctx, SPRITES.knight, pal, frame, u.x, u.y - 9, u.face < 0);
  } else if (giant) {
    // Grand Champion: double-stacked bulk, crowned in gold
    drawSprite(ctx, SPRITES.knight, pal, frame, u.x, u.y - 1, u.face < 0);
    drawSprite(ctx, SPRITES.knight, pal, frame, u.x, u.y - 7, u.face < 0);
    ctx.fillStyle = "#e8c14a";
    ctx.fillRect(S(u.x) - 3, S(u.y - 20), 6, 2);
    ctx.fillRect(S(u.x) - 3, S(u.y - 23), 2, 3);
    ctx.fillRect(S(u.x) + 1, S(u.y - 23), 2, 3);
    ctx.fillRect(S(u.x) - 1, S(u.y - 24), 2, 4);
  } else {
    drawSprite(ctx, SPRITES.knight, pal, frame, u.x, u.y - 2, u.face < 0);
  }
  // Guardian's Grace ward: a shimmering diamond overhead
  if (u.shield) {
    const wy2 = S(u.y - (giant ? 30 : 24) + Math.sin(time * 3 + u.id) * 2);
    ctx.fillStyle = "#8ce8f0";
    ctx.fillRect(S(u.x) - 1, wy2 - 2, 2, 2);
    ctx.fillRect(S(u.x) - 3, wy2, 6, 2);
    ctx.fillRect(S(u.x) - 1, wy2 + 2, 2, 2);
  }
  // Blood Frenzy: rising red motes as the stacks build
  if (r4 === "bb" && u.frenzy > 0) {
    ctx.fillStyle = "#e05248";
    const n = Math.min(3, Math.ceil(u.frenzy / 3));
    for (let i = 0; i < n; i++) {
      const fy = u.y - 14 - ((time * 26 + i * 8 + u.id * 5) % 12);
      ctx.fillRect(S(u.x - 6 + i * 6), S(fy), CELL, CELL);
    }
  }
  const raised = u.swing > 90;
  const wx = S(u.x + (u.face < 0 ? -8 : 6));
  const wy = S(u.y - (raised ? 14 : 6));
  if (berserk) {
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(wx, wy, CELL, 10);
    ctx.fillStyle = "#b8bcc4";
    ctx.fillRect(wx + (u.face < 0 ? -CELL * 2 : CELL), wy, CELL * 2, 6);
  } else {
    ctx.fillStyle = paladin ? "#e8d47a" : "#c4c8d0";
    ctx.fillRect(wx, wy - 4, CELL, 12);
    ctx.fillStyle = "#8a7444";
    ctx.fillRect(wx - CELL, wy + 6, CELL * 3, CELL);
  }
  if (paladin && u.swing > 120) {
    ctx.fillStyle = "rgba(232,212,122,0.35)";
    ctx.beginPath(); ctx.arc(S(u.x), S(u.y - 4), 11, 0, 7); ctx.fill();
  }
  if (u.atkBuff > 0) {
    ctx.fillStyle = "#d8b34a";
    ctx.fillRect(S(u.x) - CELL, S(u.y - 22), CELL, CELL);
    ctx.fillRect(S(u.x) - CELL * 2, S(u.y - 20), CELL, CELL);
    ctx.fillRect(S(u.x), S(u.y - 20), CELL, CELL);
  }
  if (u.healGlow > 0) {
    ctx.fillStyle = "#8ce08c";
    for (let i = 0; i < 2; i++) {
      const gy = u.y - 20 - ((time * 16 + i * 7 + u.id) % 10);
      const gx = u.x - 5 + i * 10;
      ctx.fillRect(S(gx) - CELL, S(gy), CELL * 3, CELL);
      ctx.fillRect(S(gx), S(gy) - CELL, CELL, CELL * 3);
    }
  }
  if (u.hp < u.maxHp) {
    const pct = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = INK;
    ctx.fillRect(u.x - 10, u.y - 18, 20, 5);
    ctx.fillStyle = pct > 0.4 ? "#7cb4d8" : "#c05248";
    ctx.fillRect(u.x - 9, u.y - 17, Math.round(18 * pct / CELL) * CELL, 3);
  }
};
