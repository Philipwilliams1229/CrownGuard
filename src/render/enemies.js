// ============ RENDER: ENEMIES & KNIGHTS ============
// Draws a walking/fighting enemy (with its status auras, burn, stun, health
// bar, armor badge) and a knight unit (weapon, buffs, heal glow, health bar).

import { ringFlash } from "./ringflash.js";
import { LOD, smallFoe, shortShade } from "./lod.js";
import { INK, CELL, S } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { ASSASSIN_PALS } from "../sprites/sprites.js";
import { hasRig, rigDef, drawRig, rigFrame } from "./rigs.js";
import { atkFrac, walkByGait, walkByTime, marchSheet, vertSheet } from "./pix/pixrigs.js";
import { vertOf, turnOf, drawTurned } from "./march.js";
import { skiffGunPose, skiffRowFrame, skiffBlade, skiffBob, SKIFF_LIFT } from "./rigs-skiff.js";
import { fillWet } from "./waterreach.js";
import * as CROWN from "./rigs-crown.js";
import { getStats } from "../engine/towers.js";
import { PX } from "./paint.js";
import { shadow as softShadow } from "./paint.js";
import { drawStatus } from "./fx.js";
import { statusShield } from "./statusfx.js";
import { noteEyes } from "./bloodmoon.js";
import { canvasFont } from "../ui/fonts.js";
import { HEROES } from "../data/bands.js";
import { heroPose } from "./heroes/index.js";
// the friendly health bar's colour (knights, the hero, halberdiers, militia, the Masons' barricades)
export const FRIEND_BAR = "#7cb4d8";

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

// A bolting horse (the loose horse, owner 2026-11-18: "let's make it kick some dust too"): a
// trail of dust clouds thrown up behind its hooves, each rising, spreading and fading as it
// falls back, staggered so the cloud never pops. Pure function of time and the foe's id.
const gallopDust = (ctx, x, y, face, time, id, vy = 0) => {
  // the trail runs back along its heading (vy: how much of it is up / down the screen, march.js)
  const tx = -face * Math.sqrt(Math.max(0, 1 - vy * vy)), ty = -vy * 0.7;
  for (let i = 0; i < 5; i++) {
    const k = (time * 2.6 + id * 0.37 + i / 5) % 1;          // 0 = just kicked up, 1 = gone
    const a = (1 - k) * (1 - k) * 0.55;
    const r = 2 + k * 6;
    const back = 6 + k * 16 + i * 1.5, up = 1 + k * 5 + (i % 2) * 1.5;
    ctx.fillStyle = `${REALM.PEBBLE}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
    const dx = x + tx * back, dy = y + ty * back - up;
    ctx.fillRect(S(dx - r / 2), S(dy - r / 3), Math.max(CELL, r), Math.max(CELL, r * 0.6));
    if (r > 4) ctx.fillRect(S(dx + tx * r * 0.4), S(dy - r * 0.3), Math.max(CELL, r * 0.6), CELL);
  }
};

// How far above its feet a rig's art actually reaches (the topmost inked
// pixel of its first walk frame), so the health bar sits on each creature's
// own head instead of at one height for all. Measured once per look.
const HEADROOM = new Map();
const headroom = (skin) => {
  let h = HEADROOM.get(skin);
  if (h !== undefined) return h;
  h = 0;
  try {
    const { cv, ay } = rigFrame(skin, "walk", 0);
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let top = cv.height;
    for (let y = 0; y < cv.height && top === cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 100) { top = y; break; }
    h = ay - top / PX;
  } catch { h = 0; }
  HEADROOM.set(skin, h);
  return h;
};

// how fast a type's feet fall, for the dust it kicks up (steps a second; 4 unless listed)
const FOOT_RATE = {
  troll: 3, hollowking: 3, orc: 5, hobgoblin: 5, chaplain: 5, ram: 5, ghast: 5, skiff: 5,
  shaman: 6, levy: 6, crossbow: 6, sergeant: 6, rafter: 6, skeleton: 7, bonearcher: 7, dragon: 8, gryphon: 8,
  goblin: 9, goblinBare: 9, boarrider: 9, marshal: 9, cavalier: 10, ghoul: 10, wolf: 12, bat: 12,
};

// how long and from how high an unseated rider falls (engine: splitDrop)
const DROP_MS = 420, DROP_H = 17;

export const drawEnemy = (ctx, e, time, tms) => {
  // mixed-party foes carry their drawn look on e.sprite; everyone else
  // wears their type's sheet; a berserker past half health wears his
  // frenzied sheet (his rage grows as he is wounded: engine/rime.js)
  const skin = e.sprite || (e.type === "berserker" && e.hp < e.maxHp * 0.5 && hasRig("berserkerRage") ? "berserkerRage" : e.type);
  const fighting = e.blockedBy && e.engaged;
  // anything flying rides the air the way the dragon always has: no footfall,
  // no fight cycle, a slow bob, and a shadow that stays down on the road
  const airborne = !!e.flying;
  const walkRate = FOOT_RATE[skin] || 4;
  // dust first, so the shadow sits on top of it and the foot stays grounded
  // (on a packed road the rank and file's dust, far rim light and doubled shadow ease away: render/lod.js)
  const thin = smallFoe(e) ? LOD.k : 0;
  if (!fighting && !airborne && !e.swimming) {
    if (thin < 1) footfall(ctx, e.x, e.y + e.size * 0.55, e.face, walkRate, e.id, (e.size >= 15 || e.boss ? 0.55 : 0.28) * (1 - thin), time);
    if (skin === "loosehorse") gallopDust(ctx, e.x, e.y + e.size * 0.55, e.face, time, e.id, e._mv || 0);
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
  // (no short shadow under a long one: sunset.js says who has a long one this frame, lod.js)
  const sk = shortShade(airborne ? LOD.longFliers : LOD.long, time);
  if (sk > 0) softShadow(ctx, e.x + 1.5, e.y + e.size * 0.55, e.size * (airborne ? 0.45 : 0.62), e.size * 0.22, (airborne ? 0.22 : 0.3) * sk);
  // Fresh arrivals resolve out of the shadow of the wood over a third of a
  // second, so nothing ever simply blinks into being at the spawn point.
  const age = e.born === undefined ? 999 : tms - e.born;
  const emerging = age < 340;
  const baseAlpha = emerging ? Math.max(0.05, age / 340) : 1;
  if (emerging) ctx.globalAlpha = baseAlpha;
  // a wraith rising out of the body of a knight it killed: it lifts out of the
  // ground on the very spot, solidifying as it comes (engine raiseFrom)
  const rise = e.riseAt !== undefined && tms - e.riseAt < e.riseMs ? (tms - e.riseAt) / e.riseMs : 1;
  if (rise < 1) ctx.globalAlpha = 0.12 + 0.88 * rise * rise;
  // a solid hit knocks them back a pixel or two before they lean in again
  const knock = e.hitFlash > tms ? -e.face * CELL : 0;
  const lunge = (e.atkAnim > 0 ? CELL * e.face : 0) + knock;
  // fliers hover; small quick critters get a lively hop on their off-frames
  let hover = airborne ? S(Math.sin(time * 3 + e.id) * 3) - (e.boss ? 10 : 7) : 0;
  if (rise < 1) hover += S((1 - rise) * (1 - rise) * 18);      // sunk in the body, coming up
  if (e.swimming) hover = S(Math.sin(time * 2.4 + e.id) * 2);
  // a knight thrown from a gryphon brought down: he drops from the saddle's
  // height to the road, gathering speed as he falls, and lands with a bump
  if (e.dropAt !== undefined && tms - e.dropAt < DROP_MS) {
    const p = (tms - e.dropAt) / DROP_MS;
    hover -= p < 0.8 ? S(DROP_H * (1 - (p / 0.8) ** 2)) : S(Math.sin((p - 0.8) / 0.2 * Math.PI) * 1.5);
  }
  // seized by a sea monster (engine/serpent.js): lifted a little off the
  // ground in its coils, wriggling
  if (e.seized) hover -= S(2.5 + Math.sin(time * 9 + e.id) * 0.8);
  // rigged foes: baked frames, feet on the ground line, mirrored to face
  // (a gryphon at war with a war-eagle fights in the air: e.airFight)
  // (a flier caught in the Masons' net, e.net, flails at it: its blow plays on its own clock, the engine's meleeCd)
  // (and a foe hacking at a Masons' barricade, e.barred: stamped by the engine each frame it is held there)
  const atWall = e.barred != null && tms - e.barred < 120;
  const rsheet = (fighting && !airborne) || e.airFight || e.net || atWall ? "fight" : "walk";
  const def = rigDef(skin);
  // walkers step to the ground they cover; fliers keep time. A foe held in a melee trades blows
  // on its own clock (engine meleeCd, reset to atkRate at each blow, atkAnim 200 ms from it);
  // a figure's blow is timed off it so the clip's strike lands on the engine's.
  const clocked = rsheet === "fight" && e.atkRate > 0 && (e.meleeCd > 0 || e.atkAnim > 0);
  const feet = e.y + e.size * 0.55 + hover;
  const variant = e.revived ? "revived" : "";
  // a redrawn figure (render/pix) takes a phase, not one of four frames: its
  // walk from the ground covered, its blow timed off the same attack clock so
  // the clip's strike lands on the engine's
  let ps = rsheet, pf;
  // (a flier's "walk" is its wingbeat, on the clock; a walker may be mid-chant or sounding a horn)
  // (up and down the screen a walker steps under himself, render/march.js)
  const heading = vertOf(e);
  // (pinned by the Ballista's chain harpoon, e.pinUntil: it keeps walking in place, slowed, straining
  // against the chain, owner 2026-11-18; its wings beat slower too)
  const strain = e.pinUntil > tms ? 0.5 : 0;
  if (rsheet === "walk") { pf = def.fly || strain ? walkByTime(skin, time * (strain || 1), e.id) : walkByGait(skin, e.gait, e.id); if (!def.fly) ps = vertSheet(skin, marchSheet(skin, e, tms), airborne || e.swimming ? 0 : heading); }
  else { ps = "atk"; pf = clocked ? atkFrac(skin, e.meleeCd, e.atkRate) : (time * 1.1 + e.id * 0.37) % 1; }
  // a foe archer's bow or crossbow turns to its last mark (engine: e.aimDeg, aim.js)
  const aim = e.rangedAtk && e.aimDeg ? e.aimDeg : 0;
  // a change of facing turns him through a squeeze, not a one-frame mirror (render/march.js)
  const tn = e.swimming ? { face: e.face, sx: 1 } : turnOf(e, e.face, tms);
  // a walker climbing out of its grave is cut off at the ground, so it comes up OUT of the dark earth (rings.js raise)
  const climbing = rise < 1 && !airborne;
  if (climbing) { ctx.save(); ctx.beginPath(); ctx.rect(e.x - 60, e.y + e.size * 0.55 - 120, 120, 121); ctx.clip(); }
  LOD.small = thin > 0;
  drawTurned(ctx, e.x + lunge, feet, tn.sx, () => {
    drawRig(ctx, skin, e.x + lunge, feet, tn.face, ps, pf, variant, 1, aim);
    if (e.hitFlash > tms || ringFlash(e.x, e.y)) drawRig(ctx, skin, e.x + lunge, feet, tn.face, ps, pf, "white", 0.7, aim);
    // a flier the Masons' net has dragged down: the net hugs its silhouette (rigs.js netify)
    if (e.net) drawRig(ctx, skin, e.x + lunge, feet, tn.face, ps, pf, "net", 1, aim);
  });
  LOD.small = false;
  if (climbing) ctx.restore();
  // under a blood moon the undead's eyes glow red in their own sockets (render/bloodmoon.js; drawn over the shade)
  if (rise >= 1) noteEyes(e, skin, e.x + lunge, feet, tn.face, ps, pf, aim, time);
  // Status tells — slow's stars, a freeze's ice, a stun's ring, cracks,
  // licking flames, poison bubbles, mending motes — each a few cached sprites
  // (render/fx.js), cheap enough for a crowd of three hundred all on fire.
  {
    const feetY = e.y + e.size * 0.55 + hover;
    // (a shielded foe shrugs every status off, so none is shown on it)
    if (e.burnUntil > tms || (!e.immSlow && (e.slowUntil > tms || e.auraSlow > 0))) e._rf = { skin, ps, pf };   // the frame drawn: the burn and the slow's mist read its silhouette (statusfx.js)
    if (!(e.guard > 0)) drawStatus(ctx, e, time, tms, feetY, feetY - headroom(skin));
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
  // Stun (a jagged gold ring spinning over the crown) is drawn with the
  // other holds — slow's dizzy stars, freeze's shell of ice — in drawStatus.
  // The health bar: slim, just over the creature's own head, and only once
  // it has been hurt — a fresh crowd of two hundred shows two hundred goblins,
  // not two hundred bars. Bosses always wear theirs.
  const pct = Math.max(0, e.hp / e.maxHp);
  const barY = Math.round(e.y + e.size * 0.55 + hover - headroom(skin) - 5);
  if (pct < 0.999 || e.boss) {
    const w = e.boss ? 40 : Math.max(14, Math.min(22, Math.round(e.size * 1.1)));
    const x0 = Math.round(e.x - w / 2);
    ctx.fillStyle = "rgba(36,26,38,0.85)";
    ctx.fillRect(x0 - 1, barY - 1, w + 2, e.boss ? 5 : 4);
    ctx.fillStyle = pct > 0.5 ? "#7cc05e" : pct > 0.25 ? "#e0b84a" : "#d0564a";
    ctx.fillRect(x0, barY, Math.max(1, Math.round(w * pct)), e.boss ? 3 : 2);
    if (e.boss) { ctx.fillStyle = "rgba(255,243,210,0.35)"; ctx.fillRect(x0, barY, Math.max(1, Math.round(w * pct)), 1); }
    // armour and rune-ward badges ride the bar's ends
    if (e.armor >= 0.3 || e.holyOnly) { ctx.fillStyle = "#b4bac6"; ctx.fillRect(x0 + w + 2, barY - 1, 3, 3); ctx.fillRect(x0 + w + 3, barY + 2, 1, 1); }
    if (e.mres >= 0.3) { ctx.fillStyle = "#b890e0"; ctx.fillRect(x0 - 5, barY - 1, 3, 3); ctx.fillRect(x0 - 4, barY + 2, 1, 1); }
  }
  // raised shields / chaplain and magister wards: one pip per blow still to
  // be swallowed whole, on the health bar's own line (over it when it shows)
  // so you can see them being spent
  if (e.guard > 0) statusShield(ctx, e, time, tms, barY + (e.boss ? 1.5 : 1));
  if (emerging || rise < 1) ctx.globalAlpha = 1;
};

// A blade of the Covert in the grass: no shield wall, no banner — a hooded
// figure that walks to its mark, cuts, and looks for the next one.
const drawAssassinUnit = (ctx, u, t, time) => {
  const pal = ASSASSIN_PALS[t.branch || "base"] || ASSASSIN_PALS.base;
  // each final form has its own rig (and so its own baked frames): AA the
  // Kingslayer, AB the Open Contract, BA the Widow's Kiss, BB the Plague Bearer
  const r4 = t.branch && t.rank4 ? t.branch + t.rank4 : null;
  const rig = r4 ? "assassinUnit" + r4.toUpperCase() : t.branch === "a" ? "assassinUnitA" : t.branch === "b" ? "assassinUnitB" : "assassinUnit";
  const fighting = u.state === "fighting", f = u.face < 0 ? -1 : 1;
  if (u.state === "moving") footfall(ctx, u.x, u.y + 9, u.face, 9, u.id, 0.18, time);
  { const sk = shortShade(LOD.longMen, time); if (sk > 0) softShadow(ctx, u.x + 1, u.y + 9, 5.5, 2, 0.24 * sk); }
  // the blade (fig-blade.js): a smooth walk, a real idle at the tent, and the cut
  // timed off his own attack clock as the soldiers' blows are
  const heading = vertOf(u), tn = turnOf(u, u.face, time * 1000);
  const sheet = u.state === "moving" ? vertSheet(rig, "walk", heading) : fighting ? "atk" : "idle";
  const fr = u.state === "moving" ? walkByTime(rig, time, u.id) : fighting ? atkFrac(rig, u.atkCd, getStats(t).rate) : time + u.id * 1.3;
  drawTurned(ctx, u.x, u.y + 9, tn.sx, () => drawRig(ctx, rig, u.x, u.y + 9, tn.face, sheet, fr));
  // the Plague Bearer's censer breathes: a spore or two drifting up off it
  if (r4 === "bb") {
    for (let i = 0; i < 2; i++) {
      const ph = (time * 0.7 + u.id * 0.37 + i * 0.5) % 1;
      const sx = u.x + f * (fighting ? 6 : 5) + Math.sin((ph + i) * 6.3) * 1.2, sy = u.y + (fighting ? 4 : 3) - ph * 9;
      ctx.fillStyle = `rgba(216,232,96,${(0.75 * (1 - ph)).toFixed(2)})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
  }
  // the cut itself: a thin bright line running out past the point, a nick of
  // light where it lands, and on a Nightshade blade the venom flung off it
  // (gold for the Kingslayer, whose estoc reaches further; the Widow's venom
  // pink; the Plague Bearer's cut puffs spores)
  if (u.swing > 0) {
    const k = u.swing / 200, tx = Math.round(u.x + f * (r4 === "aa" ? 21 : 19)), ty = Math.round(u.y - 4);
    const len = Math.round(2 + 4 * k);
    ctx.fillStyle = r4 === "aa" ? `rgba(240,204,88,${(0.3 + 0.55 * k).toFixed(2)})` : `rgba(255,243,210,${(0.3 + 0.55 * k).toFixed(2)})`;
    ctx.fillRect(f > 0 ? tx - len : tx, ty, len, 1);
    ctx.fillStyle = r4 === "aa" ? "#f0cc58" : r4 === "ba" ? "#e05aa8" : r4 === "bb" ? "#d8e860" : t.branch === "b" ? pal.v : "#fff3d2";
    ctx.fillRect(tx + f * 2, ty - 1, 1, 3);
    ctx.fillRect(tx + f * 2 - 1, ty, 3, 1);
    if (t.branch === "b") { ctx.fillRect(Math.round(tx + f * (4 - 2 * k)), Math.round(ty + 2 + 3 * (1 - k)), 1, 1); ctx.fillRect(tx + f, Math.round(ty + 3 + 4 * (1 - k)), 1, 1); }
    if (r4 === "bb") { ctx.fillStyle = `rgba(216,232,96,${(0.35 * (1 - k) + 0.1).toFixed(2)})`; const r = Math.round(2 + 3 * (1 - k)), cx = tx + f * 2; ctx.fillRect(cx - r, ty - r + 2, r * 2 + 1, r * 2 - 3); ctx.fillRect(cx - r + 1, ty - r + 1, r * 2 - 1, 1); ctx.fillRect(cx - r + 1, ty + r - 1, r * 2 - 1, 1); }
  }
  // a guildsman at his work wears a small gilt mark of his orders over the hood
  if (u.targetId != null && fighting) {
    const mx = Math.round(u.x - f * 1), my = Math.round(u.y - 17);
    ctx.fillStyle = INK; ctx.fillRect(mx - 2, my, 5, 1); ctx.fillRect(mx, my - 2, 1, 5); ctx.fillRect(mx - 1, my - 1, 3, 3);
    ctx.fillStyle = "#e8c14a"; ctx.fillRect(mx, my - 1, 1, 3); ctx.fillRect(mx - 1, my, 3, 1);
    ctx.fillStyle = "#fff3d2"; ctx.fillRect(mx, my, 1, 1);
  }
};

// A crown skiff on patrol (rigs-skiff.js): an oarsman pulling while she is
// under way and resting on his oars when she lies still, and a musketeer in
// the bow working his gun off the attack clock (skiffGunPose: kick, recoil,
// the rod, raise, aim — the shot itself is the engine's "musket" effect,
// render/musketfx.js) or, with no mark, standing easy. A wake while she
// moves, a ripple round her when she lies still; never a ground shadow.
const SKIFF_SEEN = new WeakMap();
const px2 = (v) => Math.round(v * 2) / 2;
const drawSkiff = (ctx, u, t, time) => {
  // under way? The engine keeps no speed, so remember where she was.
  let m = SKIFF_SEEN.get(u);
  if (!m) { m = { x: u.x, y: u.y, moved: -1e9, hunt: u.state === "moving", turned: -1e9 }; SKIFF_SEEN.set(u, m); }
  if (m.hx === undefined) { m.hx = u.face || 1; m.hy = 0; }
  if (Math.abs(u.x - m.x) + Math.abs(u.y - m.y) > 0.02) {
    // her heading, eased, so the wake trails the way she really goes
    const dx = u.x - m.x, dy = u.y - m.y, l = Math.hypot(dx, dy);
    if (l < 12) { m.hx = m.hx * 0.7 + (dx / l) * 0.3; m.hy = m.hy * 0.7 + (dy / l) * 0.3; }
    m.moved = time; m.x = u.x; m.y = u.y;
  }
  const hunting = u.state === "moving";
  if (hunting !== m.hunt) { m.hunt = hunting; m.turned = time; }
  const underway = Math.abs(time - m.moved) < 0.3;
  const ay = u.y + SKIFF_LIFT + skiffBob(time, u.id);
  // the wake and the ripples keep to the open water: each streak is laid
  // only over the water's own pixels (waterreach.js fillWet), so it stops at
  // a bank, a pond's shore, the beach and a bridge's deck
  if (underway) {
    // three streaks, wider as they fall behind her: astern along the way
    // she rows (side-on she is long, end-on short, so the streaks sit
    // closer astern up and down a river than along one)
    const hl = Math.hypot(m.hx, m.hy) || 1, hx = m.hx / hl, hy = m.hy / hl;
    const reach = Math.abs(hx) + Math.abs(hy) * 0.55;
    ctx.fillStyle = "rgba(226,240,246,0.45)";
    for (let i = 0; i < 3; i++) {
      const back = (11 + i * 7) * reach;
      const spread = 4 + i * 3;
      fillWet(ctx, S(u.x - hx * back - spread), S(u.y + 5 - hy * back + Math.sin(time * 3 + u.id + i) * 1.5), spread * 2, CELL);
    }
  } else {
    // lying to: a ring of ripple slides off her bow and stern
    const k = (time * 0.6 + u.id * 0.37) % 1;
    ctx.fillStyle = `rgba(226,240,246,${(0.5 * (1 - k)).toFixed(2)})`;
    for (const s of [-1, 1]) fillWet(ctx, px2(u.x + s * (15 + k * 5) - 1.5), px2(ay + 1.5 + k), 3, 0.5);
  }
  const rate = getStats(t).rate || 900;
  const since = u.atkCd > 0 ? rate - u.atkCd : Infinity;
  const gun = skiffGunPose(since, rate, { hunting, clock: time + u.id * 1.37, turned: time - m.turned });
  const row = underway ? skiffRowFrame(time + u.id * 0.29) : "rest";
  drawRig(ctx, t.branch === "a" ? "skiffA" : t.branch === "b" ? "skiffB" : "skiff", u.x, ay, u.face, "walk", `${gun}.${row === "rest" ? 4 : row}`, "", 1, hunting ? u.aimDeg || 0 : 0);
  // the water the near oar works (live: foam takes no ink; none over dry ground)
  const bl = skiffBlade(row), bx = u.x + u.face * bl.x, by = ay + bl.y;
  if (bl.wet >= 1) {
    ctx.fillStyle = "rgba(226,240,246,0.8)";
    fillWet(ctx, px2(bx - 2.5), px2(by + 1), 5, 0.5);
    fillWet(ctx, px2(bx - u.face * 3), px2(by + 0.5), 1, 0.5);
  } else if (bl.wet > 0) {
    ctx.fillStyle = "rgba(226,240,246,0.6)";
    fillWet(ctx, px2(bx - 1.5), px2(by + 1.2), 3, 0.5);
  } else if (row === 3) {
    ctx.fillStyle = "rgba(226,240,246,0.75)";
    fillWet(ctx, px2(bx), px2(by + 1.5), 0.5, 0.5);
    fillWet(ctx, px2(bx + u.face), px2(by + 3), 0.5, 0.5);
  }
  if (u.hp < u.maxHp) {
    ctx.fillStyle = INK;
    ctx.fillRect(S(u.x) - 8, S(u.y - 25), 16, 4);
    ctx.fillStyle = "#7fc95e";
    ctx.fillRect(S(u.x) - 7, S(u.y - 24), Math.max(1, Math.round(14 * u.hp / u.maxHp)), 2);
  }
};

// ---- the fight's frames ----
// A soldier's fight frame from its attack clock. Rigs that list four fight
// frames (rigs-crown.js CROWN_FIGHT_FRAMES) play guard → wind-up → strike →
// follow-through: the wind-up over the last WIND of the wait before a blow
// (u.atkCd counts down to it), the strike for the first part of u.swing
// (set at the blow) and the follow-through for the rest. A bowman: loose,
// reach to the quiver, nock and draw, then hold at full draw till the next.
// Two-frame rigs keep their pair (0 just after a blow, 1 otherwise).
const WIND = 0.35;
function fightFrame4(u, rate) { const r = rate || 800; return u.swing > 80 ? 2 : u.swing > 0 ? 3 : u.atkCd > 0 && u.atkCd < r * WIND ? 1 : 0; }
function fightFrame(kind, u, rate, ranged) {
  const n = (CROWN.CROWN_FIGHT_FRAMES && CROWN.CROWN_FIGHT_FRAMES[kind]) || 2;
  if (n < 4) return ranged ? (u.swing > 0 ? 1 : 0) : (u.swing > 90 ? 0 : 1);
  const r = rate || 800;
  if (ranged) return u.swing > 80 ? 1 : u.swing > 0 ? 2 : u.atkCd > r * 0.45 ? 3 : 0;
  return fightFrame4(u, r);
}

// Her frame through an Arrow Volley (null past its end, so -1): full draw
// while she raises the bow, then at each flight the loose, the reach to the
// quiver, the nock and the draw again, the last loose held to the end.
function volleyFrame(v, tms) {
  if (tms >= v.until) return -1;
  const s = tms - v.t0 - v.lead;
  if (s < 0) return 0;
  const k = Math.floor(s / v.gap), ph = (s % v.gap) / v.gap;
  if (k >= v.beats - 1) return 1;
  return ph < 0.3 ? 1 : ph < 0.5 ? 2 : ph < 0.75 ? 3 : 0;
}

export const drawKnightUnit = (ctx, u, t, time) => {
  if (u.state === "dead") return;
  if (t.kind === "riverwatch") { drawSkiff(ctx, u, t, time); return; }
  if (t.kind === "assassin") { drawAssassinUnit(ctx, u, t, time); return; }
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  const errant = t.branch === "b";
  const paladin = t.branch === "a";
  const giant = r4 === "aa";
  const rider = r4 === "ba";
  const bow = !!u.bow;                       // a Crossbow Company crossbowman
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
  { const sk = t.kind === "riverwatch" ? 1 : shortShade(LOD.longMen, time); if (sk > 0) softShadow(ctx, u.x + 1, u.y + 9, giant ? 10 : rider ? 11 : 6, giant ? 3.5 : 2.4, 0.3 * sk); }
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
    const want = bow ? "errantBow" : rider ? "errantRider" : giant ? "champion" : paladin ? "paladin" : errant ? "errant" : "knight";
    const kind = want;
    const fighting = u.state === "fighting";
    const rsheet = fighting ? "fight" : "walk";
    const st = getStats(t);
    const rframe = u.state === "moving" ? Math.floor(time * (rider ? 9 : 7) + u.id) % 4 : fighting ? fightFrame(kind, u, bow ? st.bowRate : st.rate, bow) : 0;
    const heading = vertOf(u), tn = turnOf(u, (u.face < 0) !== glance ? -1 : 1, time * 1000);
    drawTurned(ctx, u.x, u.y + 9 + stoop, tn.sx, () => drawRig(ctx, kind, u.x, u.y + 9 + stoop, tn.face, u.state === "moving" ? vertSheet(kind, rsheet, heading) : rsheet, rframe));
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
    // slim, and over the soldier's own head: a mounted knight and the champion
    // stand far taller than a knight
    const by = u.y - (rider ? 33 : giant ? 42 : 21);
    ctx.fillStyle = "rgba(36,26,38,0.85)";
    ctx.fillRect(u.x - 8, by - 1, 16, 4);
    ctx.fillStyle = pct > 0.4 ? FRIEND_BAR : "#d0564a";
    ctx.fillRect(u.x - 7, by, Math.max(1, Math.round(14 * pct)), 2);
  }
};

// ---- the bands: militia farmers and the hero ----
export const drawBandUnit = (ctx, u, b, time) => {
  if (u.state === "dead") return;
  const hero = b.kind === "hero";
  const kind = hero ? (HEROES[b.hero]?.rig || "heroKnight") : b.kind === "gateguard" ? "halberdier" : b.kind === "retinue" || b.rig ? (u.rig || b.rig) : "farmer";
  const fighting = u.state === "fighting";
  // Wren's Arrow Volley: the "sky" sheet, her draw raised high, cycling
  // loose → quiver → nock → draw once a flight (actions.js u.volley)
  const sky = hero && u.volley && u.state !== "moving" ? volleyFrame(u.volley, time * 1000) : -1;
  // a newer hero's ability can take the body over (render/heroes/<key>.js pose)
  const own = hero && sky < 0 ? heroPose(b, u, time) : null;
  const sheet = own ? own.sheet : sky >= 0 ? "sky" : fighting ? "fight" : "walk";
  // a swordsman winds up then strikes; the huntress holds at full draw and
  // flings the string hand back for the moment after she looses
  let frame = own ? own.frame : sky >= 0 ? sky : 0;
  // a redrawn figure (render/pix): a real idle while standing, a smooth march,
  // and a blow timed off the attack clock
  let psheet = sheet;
  if (!own && sky < 0) {
    if (u.state === "moving") frame = walkByTime(kind, time, u.id);
    else if (fighting) { psheet = "atk"; frame = atkFrac(kind, u.atkCd, u.bow ? b.st.bow.rate : b.st?.rate); }
    else { psheet = "idle"; frame = time + u.id * 1.3; }
  }
  if (u.state === "moving") footfall(ctx, u.x, u.y + 9, u.face, 8, u.id, 0.3, time);
  { const sk = shortShade(LOD.long, time); if (sk > 0) softShadow(ctx, u.x + 1, u.y + 9, hero ? 7 : 6, 2.6, 0.3 * sk); }
  // the hero stands in a ring of gold so he can be found in a crowd
  if (hero) {
    ctx.strokeStyle = `rgba(232,196,90,${0.45 + 0.2 * Math.sin(time * 4)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(u.x + 1, u.y + 9, 11, 4.2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // seized by a sea monster (engine/serpent.js): lifted in its coils, wriggling
  const lift = u.seizedBy ? 2.5 + Math.sin(time * 9 + u.id) * 0.8 : 0;
  // a bowman turns his bow to the foe he last loosed at (engine: u.aimDeg, aim.js)
  const heading = vertOf(u), tn = turnOf(u, u.face, time * 1000);
  if (u.state === "moving" && !own && sky < 0) psheet = vertSheet(kind, psheet, heading);
  // (a hero's own pose may turn him too: Hale's whirlwind)
  const fc = own && own.face ? own.face : tn.face;
  drawTurned(ctx, u.x, u.y + 9 - lift, tn.sx, () => drawRig(ctx, kind, u.x, u.y + 9 - lift, fc, psheet, frame, "", 1, u.aimDeg || 0));
  // the huntress at the string: a short pull when she has just loosed
  if (u.healGlow > 0) { ctx.fillStyle = "rgba(150,224,150,0.5)"; ctx.fillRect(S(u.x - 4), S(u.y - 26), CELL * 4, CELL); }
  // health (owner, 2026-11-18: friendly bars as the soldiers' are): the hero, halberdiers, militia
  // and retinue show the knights' pale-blue bar only while hurt or being mended, gone at full
  if (u.hp < u.maxHp) {
    const w = hero ? 18 : 14, x0 = u.x - w / 2, y0 = u.y - (hero ? 27 : b.kind === "gateguard" ? 27 : 22);   // (a halberdier stands a head taller than a farmer)
    ctx.fillStyle = "rgba(36,26,38,0.85)"; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 4);
    const pct = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = pct > 0.4 ? FRIEND_BAR : "#d0564a";
    ctx.fillRect(x0, y0, Math.max(1, Math.round(w * pct)), 2);
  }
  if (hero) {
    // the level, on a small shield below the bar
    ctx.fillStyle = "#e8c14a"; ctx.fillRect(u.x - 12, u.y - 31, 5, 5);
    ctx.fillStyle = "#2a1c2c"; ctx.font = canvasFont("board", 4, true); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(b.level), u.x - 9.5, u.y - 28.3);
  }
};
