// ============ RENDER: ENEMIES & KNIGHTS ============
// Draws a walking/fighting enemy (with its status auras, burn, stun, health
// bar, armor badge) and a knight unit (weapon, buffs, heal glow, health bar).

import { INK, CELL, S } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { SPRITES, KNIGHT_PALS, UNDEAD_PALS, drawSprite, whitePal, ASSASSIN_PALS } from "../sprites/sprites.js";
import { hasRig, rigDef, drawRig } from "./rigs.js";
import { shadow as softShadow } from "./paint.js";

// A puff kicked up where a foot lands. The whole thing is a function of the
// walker's own gait phase, so it needs no state and it stays in step with the
// sprite's animation — heavy things land, light things skim.
const footfall = (ctx, x, y, face, rate, phase, weight, time) => {
  const step = (time * rate * 0.5 + phase) % 1;
  if (step > 0.55) return;
  const a = (1 - step / 0.55) * weight;
  const spread = 3 + (1 - a / weight) * 9;
  ctx.fillStyle = `${REALM.PEBBLE}${Math.round(Math.max(0, a) * 90).toString(16).padStart(2, "0")}`;
  ctx.fillRect(S(x - face * spread) - spread / 2, S(y - (1 - a / weight) * 4), spread, CELL * 2);
  ctx.fillRect(S(x - face * spread * 1.5), S(y - (1 - a / weight) * 6), CELL * 2, CELL);
};

export const drawEnemy = (ctx, e, time, tms) => {
  // mixed-party foes carry their drawn look on e.sprite; everyone else
  // wears their type's sheet
  const skin = e.sprite || e.type;
  const rigged = hasRig(skin);
  const spr = SPRITES[skin] || { frames: [[""]], rate: 6 };
  // necromancer-raised foes wear grave-pale colors with witch-fire eyes
  const pal = e.revived && UNDEAD_PALS[skin] ? UNDEAD_PALS[skin] : spr.pal;
  const fighting = e.blockedBy && e.engaged;
  // anything flying rides the air the way the dragon always has: no footfall,
  // no fight cycle, a slow bob, and a shadow that stays down on the road
  const airborne = !!e.flying;
  // sprites may define any number of walk frames (spr.frames), an optional
  // dedicated fight cycle (spr.fight), and their own animation rate (spr.rate)
  const walkRate = spr.rate || (e.type === "wolf" ? 8 : e.type === "goblin" || e.type === "orc" ? 5 : 4);
  let sheet = spr, frame;
  if (fighting && !airborne) {
    if (spr.fight) { sheet = { frames: spr.fight, px: spr.px }; frame = Math.floor(time * 7 + e.id) % spr.fight.length; }
    else frame = Math.floor(time * 8) % spr.frames.length;
  } else {
    frame = Math.floor(time * walkRate + e.id) % spr.frames.length;
  }
  // dust first, so the shadow sits on top of it and the foot stays grounded
  if (!fighting && !airborne && !e.swimming) {
    footfall(ctx, e.x, e.y + e.size * 0.55, e.face, walkRate, e.id, e.size >= 15 || e.boss ? 0.55 : 0.28, time);
  }
  // riding the current: a spreading wake instead of a shadow on the road
  if (e.swimming) {
    ctx.fillStyle = "rgba(226,240,246,0.5)";
    for (let i = 0; i < 3; i++) {
      const back = -e.face * (10 + i * 7);
      const spread = 4 + i * 3;
      const bob = Math.sin(time * 3 + e.id + i) * 1.5;
      ctx.fillRect(S(e.x + back - spread), S(e.y + 5 + bob), spread * 2, CELL);
    }
    ctx.fillStyle = "rgba(180,214,228,0.55)";
    ctx.fillRect(S(e.x - 9), S(e.y + 7), 18, CELL);
  }
  if (rigged) softShadow(ctx, e.x + 1.5, e.y + e.size * 0.55, e.size * (airborne ? 0.45 : 0.62), e.size * 0.22, airborne ? 0.22 : 0.3);
  else {
    ctx.fillStyle = airborne ? "rgba(20,20,26,0.22)" : "rgba(20,20,26,0.3)";
    const shw = Math.round(e.size * (airborne ? 0.45 : 0.6) / CELL) * CELL;
    ctx.fillRect(S(e.x - shw), S(e.y + e.size * 0.55), shw * 2, CELL * 2);
  }
  // Fresh arrivals resolve out of the shadow of the wood over a third of a
  // second, so nothing ever simply blinks into being at the spawn point.
  const age = e.born === undefined ? 999 : tms - e.born;
  const emerging = age < 340;
  const baseAlpha = emerging ? Math.max(0.05, age / 340) : 1;
  if (emerging) ctx.globalAlpha = baseAlpha;
  // a solid hit knocks them back a pixel or two before they lean in again
  const knock = e.hitFlash > tms ? -e.face * CELL : 0;
  const lunge = (e.atkAnim > 0 ? CELL * e.face : 0) + knock;
  // fliers hover; small quick critters get a lively hop on their off-frames
  let hover = airborne ? S(Math.sin(time * 3 + e.id) * 3) - (e.boss ? 10 : 7) : 0;
  if (e.swimming) hover = S(Math.sin(time * 2.4 + e.id) * 2);
  if (!rigged && (e.type === "goblin" || e.type === "wolf" || e.type === "ghoul") && frame % 2 === 1 && !fighting) hover -= CELL;
  if (rigged) {
    // rigged foes: baked frames, feet on the ground line, mirrored to face
    const rsheet = fighting && !airborne ? "fight" : "walk";
    const n = rsheet === "fight" ? 2 : 4;
    const def = rigDef(skin);
    // walkers step to the ground they cover; fliers and fighters keep time
    const rframe = rsheet === "walk" && !def.fly
      ? Math.floor((e.gait || 0) * (def.kind === "beast" ? 1.6 : 1.2) + e.id) % n
      : Math.floor(time * (rsheet === "fight" ? 5 : 8) + e.id) % n;
    const feet = e.y + e.size * 0.55 + hover;
    const variant = e.revived ? "revived" : "";
    drawRig(ctx, skin, e.x + lunge, feet, e.face, rsheet, rframe, variant);
    if (e.hitFlash > tms) drawRig(ctx, skin, e.x + lunge, feet, e.face, rsheet, rframe, "white", 0.7);
  } else {
    drawSprite(ctx, sheet, pal, frame, e.x + lunge, e.y + hover, e.face < 0);
    // white flash on solid hits
    if (e.hitFlash > tms) {
      ctx.globalAlpha = 0.7 * baseAlpha;
      drawSprite(ctx, sheet, whitePal(pal), frame, e.x + lunge, e.y + hover, e.face < 0);
      ctx.globalAlpha = baseAlpha;
    }
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
  // the falconer's mark: four gold corners closing on the prey
  if (e.markUntil > tms) {
    const mr = e.size * 0.7 + 3 + Math.sin(time * 6) * 1.5;
    ctx.fillStyle = "rgba(224,184,85,0.9)";
    for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx2 = S(e.x + sx2 * mr), cy2 = S(e.y - 4 + sy2 * mr * 0.8);
      ctx.fillRect(cx2 - (sx2 > 0 ? CELL : 0), cy2, CELL * 2, CELL / 2 + 1);
      ctx.fillRect(cx2 - (sx2 > 0 ? 1 : 0), cy2 - (sy2 > 0 ? CELL : 0), CELL / 2 + 1, CELL * 2);
    }
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
  // Stun is the one status worth interrupting a plan for, so it gets more
  // than a speck: three little stars circling the head, drawn as crosses so
  // they read as stars and not as stray pixels.
  if (e.stunUntil > tms) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 5 + i * 2.09;
      const sx = S(e.x + Math.cos(ang) * 12);
      // clear of the health bar, which lives at -size-12 and is not negotiable
      const sy = S(e.y - e.size - 32 + Math.sin(ang) * 4);
      const near = Math.sin(ang) > 0;                  // the one in front is brighter
      ctx.fillStyle = near ? "#f4e8a8" : "#c8a83c";
      ctx.fillRect(sx - CELL, sy, CELL * 3, CELL);
      ctx.fillRect(sx, sy - CELL, CELL, CELL * 3);
      if (near) {
        ctx.fillStyle = "#fffbe8";
        ctx.fillRect(sx, sy, CELL, CELL);
      }
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
  if (emerging) ctx.globalAlpha = 1;
};

// A blade of the Covert in the grass: no shield wall, no banner — a hooded
// figure that walks to its mark, cuts, and looks for the next one.
const drawAssassinUnit = (ctx, u, t, time) => {
  const pal = ASSASSIN_PALS[t.branch || "base"] || ASSASSIN_PALS.base;
  const frame = u.state === "moving" ? Math.floor(time * 9 + u.id) % 2 : 0;
  if (u.state === "moving") footfall(ctx, u.x, u.y + 9, u.face, 7, u.id, 0.22, time);
  ctx.fillStyle = "rgba(20,20,26,0.28)";
  ctx.fillRect(S(u.x - 5), S(u.y + 9), 10, CELL);
  drawRig(ctx, "assassinUnit", u.x, u.y + 9, u.face, u.state === "fighting" ? "fight" : "walk", u.state === "moving" ? Math.floor(time * 7 + u.id) % 4 : u.state === "fighting" ? (u.swing > 0 ? 1 : 0) : 0);
  // the cut itself: a short bright arc thrown out on the swing
  if (u.swing > 0) {
    const reach = u.face < 0 ? -9 : 9;
    ctx.fillStyle = t.branch === "b" ? "#8ac06a" : "#e8e2d4";
    ctx.fillRect(S(u.x + reach), S(u.y - 6), 3, 2);
    ctx.fillRect(S(u.x + reach * 0.7), S(u.y - 9), 2, 3);
  }
  // a guildsman under orders wears a small mark of them
  if (u.targetId != null && u.state === "fighting") {
    ctx.fillStyle = "rgba(232,193,74,0.85)";
    ctx.fillRect(S(u.x) - 1, S(u.y - 22), 2, 2);
  }
};

// A crown skiff on patrol: hull, wake, and the lantern that says the watch
// is awake. It never touches the ground, so it never casts a ground shadow.
const drawSkiff = (ctx, u, t, time) => {
  const frame = Math.floor(time * 5 + u.id) % 2;
  ctx.fillStyle = "rgba(226,240,246,0.45)";
  for (let i = 0; i < 3; i++) {
    const back = -u.face * (11 + i * 7);
    const spread = 4 + i * 3;
    ctx.fillRect(S(u.x + back - spread), S(u.y + 5 + Math.sin(time * 3 + u.id + i) * 1.5), spread * 2, CELL);
  }
  drawRig(ctx, "skiff", u.x, u.y + 6 + Math.sin(time * 2.2 + u.id) * 1.5, u.face, "walk", Math.floor(time * 5 + u.id) % 4);
  if (u.swing > 0) {
    ctx.fillStyle = "#e8e2d4";
    ctx.fillRect(S(u.x + u.face * 12), S(u.y - 6), 4, 2);
  }
  if (u.hp < u.maxHp) {
    ctx.fillStyle = INK;
    ctx.fillRect(S(u.x) - 8, S(u.y - 16), 16, 4);
    ctx.fillStyle = "#7fc95e";
    ctx.fillRect(S(u.x) - 7, S(u.y - 15), Math.max(1, Math.round(14 * u.hp / u.maxHp)), 2);
  }
};

export const drawKnightUnit = (ctx, u, t, time) => {
  if (u.state === "dead") return;
  if (t.kind === "riverwatch") { drawSkiff(ctx, u, t, time); return; }
  if (t.kind === "assassin") { drawAssassinUnit(ctx, u, t, time); return; }
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  const berserk = t.branch === "b";
  const paladin = t.branch === "a";
  const giant = r4 === "aa";
  const rider = r4 === "ba";
  const pal = giant ? KNIGHT_PALS.champion : paladin ? KNIGHT_PALS.paladin : berserk ? KNIGHT_PALS.berserk : KNIGHT_PALS.base;
  const frame = u.state === "moving" ? Math.floor(time * 8 + u.id) % 2 : 0;
  // Bored soldiers: a rallied knight with nothing to fight will, every so
  // often, stoop for a blade of grass, toe a pebble down the field, or
  // glance back over his shoulder. Kids at the far end of the pitch.
  let stoop = 0, glance = false, fidget = -1, fp = 0;
  if (u.state === "rally" && !rider) {
    const cyc = ((time / 8.4) + u.id * 0.618) % 1;
    if (cyc < 0.16) { fidget = u.id % 3; fp = cyc / 0.16; }
    if (fidget === 0) stoop = Math.round((fp < 0.5 ? fp : 1 - fp) * 2) * 2;
    if (fidget === 2 && fp > 0.25 && fp < 0.75) glance = true;
  }
  if (u.state === "moving") footfall(ctx, u.x, u.y + 9, u.face, 8, u.id, giant || rider ? 0.5 : 0.3, time);
  softShadow(ctx, u.x + 1, u.y + 9, giant ? 10 : rider ? 11 : 6, giant ? 3.5 : 2.4, 0.3);
  if (fidget === 1 && fp > 0.3) {
    // the pebble, skittering off and settling
    const roll = Math.min(1, (fp - 0.3) / 0.5);
    const slide = (1 - (1 - roll) * (1 - roll)) * 10;
    ctx.fillStyle = "#8a8a92";
    ctx.fillRect(S(u.x + u.face * (5 + slide)), S(u.y + 8), 2, 2);
    if (fp < 0.45) {
      ctx.fillStyle = `rgba(${"178,164,136"},0.7)`;
      ctx.fillRect(S(u.x + u.face * 5), S(u.y + 6), CELL, CELL);
    }
  }
  {
    const kind = rider ? "wolfrider" : giant ? "champion" : paladin ? "paladin" : berserk ? "berserk" : "knight";
    const fighting = u.state === "fighting";
    const rsheet = fighting ? "fight" : "walk";
    const rframe = u.state === "moving" ? Math.floor(time * (rider ? 9 : 7) + u.id) % 4 : fighting ? (u.swing > 90 ? 0 : 1) : 0;
    const face = (u.face < 0) !== glance ? -1 : 1;
    drawRig(ctx, kind, u.x, u.y + 9 + stoop, face, rsheet, rframe);
    if (fidget === 0 && fp >= 0.3 && fp < 0.62) {
      // down among the stems: a couple of blades coming loose
      ctx.fillStyle = "#6a8a3e";
      ctx.fillRect(S(u.x + u.face * 6), S(u.y + 5), CELL, CELL);
      ctx.fillRect(S(u.x + u.face * 8), S(u.y + 3), CELL, CELL);
    } else if (fidget === 0 && fp >= 0.62) {
      // and one kept, held up for inspection
      ctx.fillStyle = "#6a8a3e";
      ctx.fillRect(S(u.x + u.face * 6), S(u.y - 6), CELL, CELL * 2);
    }
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


// ---- the bands: militia farmers and the hero ----
export const drawBandUnit = (ctx, u, b, time) => {
  if (u.state === "dead") return;
  const hero = b.kind === "hero";
  const kind = hero ? (b.hero === "wren" ? "heroHunter" : "heroKnight") : "farmer";
  const fighting = u.state === "fighting";
  const sheet = fighting && !b.st?.ranged ? "fight" : "walk";
  const frame = u.state === "moving" ? Math.floor(time * 7 + u.id) % 4 : fighting && !b.st?.ranged ? (u.swing > 90 ? 0 : 1) : 0;
  if (u.state === "moving") footfall(ctx, u.x, u.y + 9, u.face, 8, u.id, 0.3, time);
  softShadow(ctx, u.x + 1, u.y + 9, hero ? 7 : 6, 2.6, 0.3);
  // the hero stands in a ring of gold so he can be found in a crowd
  if (hero) {
    ctx.strokeStyle = `rgba(232,196,90,${0.45 + 0.2 * Math.sin(time * 4)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(u.x + 1, u.y + 9, 11, 4.2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  drawRig(ctx, kind, u.x, u.y + 9, u.face, sheet, frame);
  // the huntress at the string: a short pull when she has just loosed
  if (u.healGlow > 0) { ctx.fillStyle = "rgba(150,224,150,0.5)"; ctx.fillRect(S(u.x - 4), S(u.y - 26), CELL * 4, CELL); }
  // health: the hero always shows his, a farmer only once hurt
  if (hero || u.hp < u.maxHp) {
    const w = hero ? 18 : 12, x0 = u.x - w / 2, y0 = u.y - (hero ? 27 : 22);
    ctx.fillStyle = "rgba(20,16,20,0.75)"; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 4);
    const pct = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = pct > 0.5 ? "#7ad06a" : pct > 0.25 ? "#e8c14a" : "#e07a72";
    ctx.fillRect(x0, y0, w * pct, 2);
  }
  if (hero) {
    // the level, on a small shield below the bar
    ctx.fillStyle = "#e8c14a"; ctx.fillRect(u.x - 12, u.y - 31, 5, 5);
    ctx.fillStyle = "#2a1c2c"; ctx.font = "bold 4px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(b.level), u.x - 9.5, u.y - 28.3);
  }
};
