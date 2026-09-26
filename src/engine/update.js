// ============ MAIN UPDATE STEP ============
// Advances the whole simulation by one frame: spawns, aura effects, enemy
// movement & castle leaks, knight combat, tower firing, projectiles, wave
// clears, the build-phase auto-start horn, and effect/shake decay.
// `dt` is the raw (already clamped) seconds since the last frame.

import { RESPAWN_MS, W, H, MX, MXR, BUILD_TIME, CASTLE_HP, BASE_SPEED, PATH_HALF, pickLane } from "../data/constants.js";
import { workTier, worksBonusHp, bowmenSpots, ballistaSpots, ballistaMuzzle, BOW_X } from "../data/castle.js";
import { MILITIA, heroStats, heroXpFor, HERO_MAX_LEVEL, heroAbilities } from "../data/bands.js";
import { RIVER_ROUTE, seaRoute, seaDepthAt } from "../data/terrain.js";
import { ENEMIES } from "../data/enemies.js";
import { scriptedWaves, waveBonus } from "../data/waves.js";
import { PTS, posAt, angleAt, lanePos, TOTAL_LEN } from "./path.js";
import { nextId } from "./ids.js";
import { getStats, syncUnits, unitSlots, pickTarget, isPrey, pickPrey, orderFilter, archerLayout } from "./towers.js";
import { dealDamage, releaseEnemy, startWave, pondAt } from "./actions.js";
import { sfx } from "../audio/sfx.js";
// the field's width without the castle's wider border: logs roll off it here
const FIELD_W = W - MXR + MX;

// A pond's rowing ring for a River Watch moored in it: an ellipse inside
// the shore, with the same { total, at(q) } shape as the river's route.
const POND_ROUTES = new WeakMap();
const pondRoute = (p) => {
  let rt = POND_ROUTES.get(p);
  if (rt) return rt;
  const rx = Math.max(8, p.w / 2 - 12), ry = Math.max(6, p.h / 2 - 9);
  const total = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  rt = { total, ring: true, at: (q) => { const a = (q / total) * Math.PI * 2; return [p.x + Math.cos(a) * rx, p.y + Math.sin(a) * ry]; } };
  POND_ROUTES.set(p, rt);
  return rt;
};

// road points every 7px, for the trapsmith's bench (rebuilt when the road changes)
let ROAD7 = null;

// A rolling log loses weight to every foe it crushes (update.js, logs).
const LOG_FALLOFF = 0.9, LOG_FLOOR = 0.4;

// How many bodies one blast can take (a tower may carry its own splashCap).
const SPLASH_CAP = 16;

// Build a fresh enemy instance of `type` with wave HP multiplier `mult`.
// Used by the spawn queue and by necromancers raising the dead.
const makeEnemy = (type, mult) => {
  const d = ENEMIES[type];
  // some foes field a mixed party: each spawn draws one look (and its pace)
  const v = d.variants ? d.variants[Math.floor(Math.random() * d.variants.length)] : null;
  return {
    id: nextId(), type, sprite: v ? v.sprite : null,
    hp: d.hp * mult, maxHp: d.hp * mult, mult, dist: 0,
    speed: d.speed * (v?.speedMul || 1), armor: d.armor, mres: d.mres || 0, regen: d.regen || 0,
    // A foe's purse used to be fixed while its health inflated forever, so by
    // the eightieth wave you were paid a wave-one wage to kill a wave-eighty
    // troll. The purse now follows the meat, at a quarter of its rate.
    // ...but only up to three times its wage: deep in the Endless March the
    // meat inflates a hundredfold, and a purse that followed it bought out
    // the board by wave ninety and then piled up with nothing left to buy.
    bounty: Math.max(1, Math.round(d.bounty * Math.min(3, 1 + Math.max(0, mult - 1) * 0.08))),
    boss: !!d.boss, size: d.size, atk: d.atk, atkRate: d.atkRate, castleDmg: d.castleDmg || 1,
    lane: pickLane(d.boss),
    // Iron Kingdom traits: shields, discipline, charges, volleys, wards, banners
    flying: !!d.flying, guard: d.guard || 0, guardFlash: 0,
    immSlow: !!d.immSlow, immStun: !!d.immStun,
    trampleLeft: d.trample || 0, trampleMax: d.trample || 0, trampleEvery: d.trampleEvery || 0, trampleCd: null,
    rangedAtk: d.rangedAtk || 0, rangedRange: d.rangedRange || 0, rangedRate: d.rangedRate || 0, rangedCd: 0,
    wardEvery: d.wardEvery || 0, wardHits: d.wardHits || 0, wardRange: d.wardRange || 0, wardCd: null,
    bannerRange: d.bannerRange || 0, bannerSpeedAmt: d.bannerSpeed || 0, bannerArmorAmt: d.bannerArmor || 0,
    bannerSpeed: 0, bannerArmor: 0,
    // Hollow Court traits: bells that summon, bodies that split or burst
    summonEvery: d.summonEvery || 0, summonType: d.summonType || null, summonCount: d.summonCount || 0, summonCd: null,
    splitInto: d.splitInto || null, deathBurst: d.deathBurst || null, deathDone: false,
    // falconry marks and alchemical shred
    markUntil: 0, markAmp: 0, markShredAmt: 0, shredAura: 0,
    x: PTS[0][0], y: PTS[0][1], face: 1, atkAnim: 0, auraSlow: 0,
    slowUntil: 0, slowPct: 0, burnUntil: 0, burnDps: 0, poisonUntil: 0, poisonDps: 0,
    brittleUntil: 0, brittleAmp: 0, burnSpread: false,
    stunUntil: 0, dead: false, blockedBy: null, engaged: false, meleeCd: 0,
    silencedUntil: 0, noHealUntil: 0, sporeOn: null,
    // things that take the water instead of the road
    swims: !!d.swims, swimming: false, swimD: 0, swimDir: 1,
    healAmt: d.heal ? d.heal * Math.sqrt(mult) : 0, healEvery: d.healEvery || 0, healCd: null,
    raiseEvery: d.raiseEvery || 0, raiseCd: null, revived: false, healedFlash: 0,
  };
};

// Drop a fresh enemy onto the road at distance `dist`, already walking.
// Shared by gravecaller bells and amalgams coming apart.
const spawnAt = (g, type, mult, dist, tms) => {
  const u = makeEnemy(type, mult);
  u.dist = Math.max(0, dist);
  u.lane = pickLane(u.boss);
  const [px, py] = posAt(u.dist);
  const a = angleAt(u.dist);
  u.x = px + Math.cos(a + Math.PI / 2) * u.lane;
  u.y = py + Math.sin(a + Math.PI / 2) * u.lane;
  u.born = tms;
  g.enemies.push(u);
  return u;
};

// A knight falls: it drops whatever it was holding and starts its respawn
// clock. Shared by melee deaths and crossbow bolts.
// Anyone who fields units: a tower with a garrison, or a band (militia, hero).
export const hostStats = (h) => h.st || getStats(h);
export const unitHosts = (g) => {
  const out = [];
  for (const t of g.towers) if (t.units) out.push(t);
  if (g.bands) for (const b of g.bands) out.push(b);
  return out;
};
const killUnit = (g, t, u) => {
  u.state = "dead";
  u.respawn = hostStats(t).respawnMs || RESPAWN_MS;
  u.targetId = null;
  u.shield = false;
  releaseEnemy(g, g.enemies.find((x) => x.blockedBy === u.id));
  g.effects.push({ type: "poof", x: u.x, y: u.y, ttl: 400 });
};

// A ranged band (the huntress): holds the rally point, shoots the nearest
// foe in range, never blocks. Wounded by crossbowmen and plague like anyone.
// Levelling: each level tops the hero up and makes him a little more, and a
// level can wake his second ability. What he ends a won map at is paid out
// as hero stars by the shell (see CrownguardGame / profile bankHeroStars).
const levelHero = (g, b) => {
  const u = b.units[0];
  while (b.level < HERO_MAX_LEVEL && b.xp >= heroXpFor(b.level)) {
    b.xp -= heroXpFor(b.level); b.level += 1;
    b.st = heroStats(b.hero, b.level, b.talents);
    u.maxHp = b.st.hp;
    if (u.state !== "dead") u.hp = b.st.hp;
    g.effects.push({ type: "levelup", x: u.x, y: u.y, ttl: 700 });
    const woke = heroAbilities(b.hero).find((a) => a.unlock === b.level && a.unlock > 1);
    g.effects.push({ type: "coin", x: u.x, y: u.y - 26, ttl: 1400, text: woke ? `${b.name} — level ${b.level} · ${woke.name} ready!` : `${b.name} — level ${b.level}`, big: true });
    sfx.play("ascend");
  }
  if (b.level >= HERO_MAX_LEVEL) b.xp = 0;
};

const runRangedBand = (g, b, st, slots, sdt, tms) => {
  b.units.forEach((u, i) => {
    if (u.state === "dead") {
      u.respawn -= sdt * 1000;
      if (u.respawn <= 0) { u.state = "rally"; u.hp = st.hp; u.x = slots[i][0]; u.y = slots[i][1]; u.targetId = null; }
      return;
    }
    u.atkCd -= sdt * 1000;
    u.swing = Math.max(0, u.swing - sdt * 1000);
    u.healGlow = Math.max(0, (u.healGlow || 0) - sdt * 1000);
    for (const gr of g.grounds) {
      if (gr.kind !== "plague" || gr.until <= tms) continue;
      if (Math.hypot(u.x - gr.x, u.y - gr.y) <= gr.r) u.hp -= gr.dps * sdt;
    }
    if (u.hp <= 0) { killUnit(g, b, u); return; }
    const hx = slots[i][0], hy = slots[i][1];
    const dx = hx - u.x, dy = hy - u.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) { const sp = Math.min(d, (st.unitSpeed || 100) * sdt); u.x += (dx / d) * sp; u.y += (dy / d) * sp; u.face = dx >= 0 ? 1 : -1; u.state = "moving"; return; }
    u.state = "rally";
    let best = null, bd = st.range;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dd = Math.hypot(e.x - u.x, e.y - u.y);
      if (dd < bd) { bd = dd; best = e; }
    }
    if (!best) return;
    u.face = best.x >= u.x ? 1 : -1;
    u.state = "fighting";
    if (u.atkCd > 0) return;
    u.atkCd = st.rate;
    u.swing = 160;
    const shoot = (e) => g.projectiles.push({ id: nextId(), x: u.x, y: u.y - 14, targetId: e.id, tx: e.x, ty: e.y, speed: 440, delay: 0, dmg: st.dmg * (1 + (u.atkBuff || 0)), dtype: "phys", pierce: !!st.pierce, splash: 0, burn: 0, burnDur: 0, slow: st.slow || 0, slowDur: st.slowDur || 0, kind: "arrow", src: b.id });
    shoot(best);
    // Split Shot: now and then a second arrow for the next-nearest foe
    if (st.split && Math.random() < st.split) {
      let second = null, sd = st.range;
      for (const e of g.enemies) {
        if (e.dead || e === best) continue;
        const dd = Math.hypot(e.x - u.x, e.y - u.y);
        if (dd < sd) { sd = dd; second = e; }
      }
      if (second) shoot(second);
    }
    sfx.play("arrow");
  });
};

// One garrison's (or band's) fighters for one tick: respawn, hold the rally
// point, seize a passing foe, walk to it, trade blows. Shared by the Knight
// Garrison, the militia and the melee hero.
const runMelee = (g, t, st, slots, sdt, tms) => {
      t.units.forEach((u, i) => {
        if (u.state === "dead") {
          u.respawn -= sdt * 1000;
          if (u.respawn <= 0) { u.state = "rally"; u.hp = st.hp; u.x = slots[i][0]; u.y = slots[i][1]; u.targetId = null; u.frenzy = 0; u.shield = false; u.shieldCd = 0; }
          return;
        }
        if (st.heal && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + st.heal * sdt);
        u.atkCd -= sdt * 1000;
        u.swing = Math.max(0, u.swing - sdt * 1000);
        u.healGlow = Math.max(0, (u.healGlow || 0) - sdt * 1000);
        u.shieldCd = Math.max(0, (u.shieldCd || 0) - sdt * 1000);
        // plague ground eats at any knight who stands his post in it
        for (const gr of g.grounds) {
          if (gr.kind !== "plague" || gr.until <= tms) continue;
          if (Math.hypot(u.x - gr.x, u.y - gr.y) <= gr.r) u.hp -= gr.dps * sdt;
        }
        if (u.hp <= 0) { killUnit(g, t, u); return; }

        let target = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead) : null;
        // tight leash: knights break off quickly once a foe leaves the rally circle
        if (target && Math.hypot(target.x - t.rally.x, target.y - t.rally.y) > st.range + 12) { releaseEnemy(g, target); target = null; u.targetId = null; }
        if (!target && u.targetId) u.targetId = null;

        if (!target) {
          let best = null, bestDist = -1;
          for (const e of g.enemies) {
            if (e.dead || e.flying || e.swimming || e.blockedBy) continue;
            if (Math.hypot(e.x - t.rally.x, e.y - t.rally.y) <= st.range * 0.92 && e.dist > bestDist) { bestDist = e.dist; best = e; }
          }
          if (best) { best.blockedBy = u.id; u.targetId = best.id; u.state = "moving"; target = best; }
        }

        if (target) {
          const dx = target.x - u.x, dy = target.y - u.y;
          const d = Math.hypot(dx, dy);
          if (d > 17) {
            target.engaged = d < 30;
            const sp = (st.unitSpeed || 95) * sdt;
            u.x += (dx / d) * sp; u.y += (dy / d) * sp;
            u.face = dx >= 0 ? 1 : -1;
            u.state = "moving";
          } else {
            target.engaged = true;
            // Cavalier: the charge rides its first blocker down and gallops on.
            // Whoever steps up second is the one who actually holds him.
            if (target.trampleLeft > 0) {
              target.trampleLeft -= 1;
              u.hp -= target.atk * 2;
              g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 260 });
              g.shake = Math.max(g.shake, 3);
              releaseEnemy(g, target);
              u.targetId = null;
              u.state = "rally";
              if (u.hp <= 0) killUnit(g, t, u);
              return;
            }
            u.state = "fighting";
            u.face = dx >= 0 ? 1 : -1;
            target.face = -u.face;
            if (u.atkCd <= 0) {
              // Blood Frenzy: each hit stacks attack speed and feeds the berserker
              const frenzyMul = st.frenzy ? 1 - Math.min(0.45, (u.frenzy || 0) * 0.06) : 1;
              u.atkCd = st.rate * frenzyMul;
              u.swing = 180;
              const dealt = st.dmg * (1 + (u.atkBuff || 0));
              dealDamage(g, target, dealt, st.magic ? "magic" : "phys", st.magic, false, t.id);
              sfx.play("clink");
              if (st.frenzy) u.frenzy = (u.frenzy || 0) + 1;
              if (st.lifesteal && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + dealt * st.lifesteal); u.healGlow = 200; }
              g.effects.push({ type: "spark", x: target.x, y: target.y - 6, ttl: 160, gold: !!st.magic || u.atkBuff > 0 });
              if (st.stun && Math.random() < st.stun) target.stunUntil = tms + st.stunDur;
              if (target.dead) { u.targetId = null; u.state = "rally"; }
            }
            if (!target.dead && target.stunUntil <= tms && target.atk > 0) {
              target.meleeCd -= sdt * 1000;
              if (target.meleeCd <= 0) {
                target.meleeCd = target.atkRate;
                target.atkAnim = 200;
                if (u.shield) {
                  // Guardian's Grace: the ward swallows the blow whole
                  u.shield = false; u.shieldCd = 6500;
                  g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 });
                } else {
                  u.hp -= target.atk;
                  g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 200 });
                  sfx.play("hit");
                }
                if (u.hp <= 0) killUnit(g, t, u);
              }
            }
          }
        } else {
          const hx = slots[i][0], hy = slots[i][1];
          const dx = hx - u.x, dy = hy - u.y;
          const d = Math.hypot(dx, dy);
          // never step past the post: a fast unit at 4x speed would otherwise
          // overshoot it every tick and jitter there forever
          if (d > 3) { const sp = Math.min(d, (st.unitSpeed ? st.unitSpeed * 0.9 : 85) * sdt); u.x += (dx / d) * sp; u.y += (dy / d) * sp; u.face = dx >= 0 ? 1 : -1; u.state = "moving"; }
          else { u.state = "rally"; u.frenzy = 0; }
        }
      });
};

export function updateGame(g, dt) {
  // Tactical half-speed: during combat, while the player is managing — the
  // build drawer is open, a tower is being placed, or a tower is selected —
  // time runs at 50% so there's room to think.
  const managing = g.phase === "combat" && (g.buildMenuOpen || g.buildMode || g.selectedId);
  const speed = g.speed * BASE_SPEED * (managing ? 0.5 : 1);
  const sdt = g.paused ? 0 : dt * speed;
  g.time += sdt;
  const tms = g.time * 1000;
  // who owns which id this frame — the damage ledger resolves through this
  g._towerById = new Map(g.towers.map((t) => [t.id, t]));
  if (g.bands) for (const b of g.bands) g._towerById.set(b.id, b);
  if (g.phase === "combat" && !g.paused) for (const t of g.towers) t.liveTime = (t.liveTime || 0) + sdt;
  if (!g.grounds) g.grounds = []; // lingering ground effects (lava pools)
  if (!g.traps) g.traps = [];     // the trapsmith's armed road

  // The trapsmith's bench runs in the quiet of the build phase as much as in
  // battle: charges accumulate whether or not anyone watches, and the smith
  // walks his stretch of road and arms it himself — one charge at a beat,
  // always into the widest uncovered gap in his reach.
  if (!g.paused && (g.phase === "combat" || g.phase === "build")) {
    // ---- the bands: militia and the hero ----
    if (g.bands) {
      g.militiaCd = Math.max(0, (g.militiaCd || 0) - sdt * 1000);
      for (const b of g.bands) {
        if (b.kind === "militia") {
          b.life -= sdt * 1000;
          if (b.life <= 0) {
            for (const u of b.units) { if (u.state !== "dead") { releaseEnemy(g, g.enemies.find((x) => x.blockedBy === u.id)); g.effects.push({ type: "poof", x: u.x, y: u.y, ttl: 350 }); } }
            b.gone = true;
            continue;
          }
        }
        if (b.kind === "hero") {
          b.st = heroStats(b.hero, b.level, b.talents);
          const u = b.units[0];
          u.maxHp = b.st.hp;
          levelHero(g, b);
          if (u.state === "dead") { b.deadFor = (b.deadFor || 0) + sdt * 1000; u.dash = null; }
          // abilities recharge whatever he is doing, dead or alive
          if (b.abCd) for (const k in b.abCd) b.abCd[k] = Math.max(0, b.abCd[k] - sdt * 1000);
          // Valiant Charge: he rides at his mark, trampling and throwing back
          // everything on foot in his path, and holds the spot when he arrives
          if (u.dash && u.state !== "dead") {
            const a = b.st.abil.charge;
            const dx = u.dash.tx - u.x, dy = u.dash.ty - u.y, d = Math.hypot(dx, dy);
            const step = 380 * sdt;
            const k = d <= step ? 1 : step / d;
            u.x += dx * k; u.y += dy * k;
            u.face = dx >= 0 ? 1 : -1;
            u.state = "moving";
            if (Math.random() < 0.5) g.effects.push({ type: "dust", x: u.x, y: u.y + 6, ttl: 300, r: 9 });
            for (const e of g.enemies) {
              if (e.dead || e.flying || e.swimming || u.dash.hit.includes(e.id)) continue;
              if (Math.hypot(e.x - u.x, e.y - u.y) > a.width) continue;
              u.dash.hit.push(e.id);
              dealDamage(g, e, a.dmg, "phys", false, false, b.id);
              if (!e.dead && !e.boss) { e.dist = Math.max(0, e.dist - a.knock); releaseEnemy(g, e); }
              g.effects.push({ type: "hit", x: e.x, y: e.y - 6, ttl: 220 });
            }
            if (k === 1) { u.dash = null; u.state = "rally"; g.shake = Math.max(g.shake, 4); g.effects.push({ type: "dust", x: u.x, y: u.y + 6, ttl: 420, r: 26 }); }
            else continue;                   // mid-charge: no ordinary fighting
          }
        }
        const st = b.st;
        const n = st.count || 1;
        const base = [[0, -8], [-12, 6], [12, 6]];
        const slots = base.slice(0, n).map(([dx, dy]) => [b.rally.x + dx, b.rally.y + dy]);
        if (st.ranged) runRangedBand(g, b, st, slots, sdt, tms);
        else runMelee(g, b, st, slots, sdt, tms);
      }
      g.bands = g.bands.filter((b) => !b.gone);
    }
    // Arrow Volley: the rain falls on its spot in beats, hitting everything
    // under it — fliers too
    if (g.volleys && g.volleys.length) {
      for (const v of g.volleys) {
        while (v.next <= tms && v.next <= v.until) {
          v.next += v.tick;
          for (const e of g.enemies) {
            if (e.dead || e.swimming || Math.hypot(e.x - v.x, e.y - v.y) > v.r) continue;
            dealDamage(g, e, v.dmg, "phys", false, false, v.src);
            if (Math.random() < 0.35) g.effects.push({ type: "hit", x: e.x, y: e.y - 6, ttl: 200 });
          }
        }
      }
      g.volleys = g.volleys.filter((v) => v.until > tms);
    }

    for (const t of g.towers) {
      if (t.kind !== "trapsmith") continue;
      const st = getStats(t);
      if ((t.charges || 0) < st.maxCharges) {
        t.chargeCd = (t.chargeCd ?? st.chargeEvery) - sdt * 1000;
        if (t.chargeCd <= 0) { t.charges = (t.charges || 0) + 1; t.chargeCd = st.chargeEvery; }
      }
      // level-ups can raise the ceiling; never hold more than it allows
      t.charges = Math.min(t.charges || 0, st.maxCharges);
      t.layCd = Math.max(0, (t.layCd || 0) - sdt * 1000);
      if ((t.charges || 0) > 0 && t.layCd <= 0) {
        // Density is the smith's whole argument now: he fills his stretch of
        // road rather than rationing it, so the only limit is how fast the
        // bench works. He still prefers bare ground, but 6px is "bare".
        // (road samples cached per road; traps bucketed in 30px cells, since
        // a late board carries hundreds of them and the scan was quadratic)
        if (!ROAD7 || ROAD7.len !== TOTAL_LEN) { ROAD7 = []; ROAD7.len = TOTAL_LEN; for (let d = 10; d < TOTAL_LEN - 8; d += 7) ROAD7.push([...posAt(d), angleAt(d)]); }
        const grid = new Map();
        for (const tr of g.traps) { const k = ((tr.x / 30) | 0) * 1000 + ((tr.y / 30) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(tr); }
        let best = null, bestSpread = 6;
        const r2 = st.range * st.range;
        for (const [px, py, pa] of ROAD7) {
          if ((px - t.x) * (px - t.x) + (py - t.y) * (py - t.y) > r2) continue;
          let near2 = 3600;
          const cx = (px / 30) | 0, cy = (py / 30) | 0;
          for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
            const list = grid.get((cx + i) * 1000 + cy + j);
            if (list) for (const tr of list) { const dd = (tr.x - px) * (tr.x - px) + (tr.y - py) * (tr.y - py); if (dd < near2) near2 = dd; }
          }
          const spread = Math.sqrt(near2);
          if (spread > bestSpread) { bestSpread = spread; best = [px, py, pa]; }
        }
        if (best) {
          // a yard with aerostats floats every Nth charge instead of burying it
          const floats = !!(st.balloon && ((t.layIdx = (t.layIdx || 0) + 1) % st.balloon === 0));
          // `a`: the road's heading there, so a spike plank can lie across it
          g.traps.push({ x: best[0], y: best[1], a: best[2], byTower: t.id, branch: t.branch, rank4: t.rank4,
            kind: floats ? "balloon" : (st.trapKind || "spike"), sky: floats });
          t.charges -= 1;
          t.layCd = 420;
          g.effects.push({ type: "dust", x: best[0], y: best[1], ttl: 300, r: 14 });
          sfx.play("place");
        }
      }
    }
  }

  if (!g.paused && g.phase === "combat") {
    g.spawnTimer += sdt * 1000;
    while (g.spawnQueue.length && g.spawnQueue[0].at <= g.spawnTimer) {
      const s = g.spawnQueue.shift();
      const e = makeEnemy(s.type, s.mult);
      if (s.pay != null && s.pay < 1) e.bounty = Math.max(1, Math.round(e.bounty * s.pay));   // a crowd pays less a head
      e.born = tms;                       // the renderer fades them out of the wood
      // a swimmer puts in at the bank nearest the gate and takes the river
      if (e.swims && RIVER_ROUTE) {
        e.swimming = true;
        e.swimD = RIVER_ROUTE.entry;
        e.swimDir = RIVER_ROUTE.dir;
        const [wx, wy] = RIVER_ROUTE.at(e.swimD);
        e.x = wx; e.y = wy; e.lane = 0;
      }
      g.enemies.push(e);
      // something that size doesn't arrive quietly
      if (e.boss) {
        g.shake = Math.max(g.shake, 6);
        sfx.play("bossHorn");
        g.effects.push({ type: "dust", x: e.x, y: e.y + 6, ttl: 420, r: 40 });
      }
    }
    if (!g.corpses) g.corpses = []; // fresh kills a necromancer may raise
    for (const e of g.enemies) { e.auraSlow = 0; e.bannerSpeed = 0; e.bannerArmor = 0; e.shredAura = 0; }
    // A Lord Marshal's banner drives everything marching near it: quicker feet
    // and harder plate for as long as he is on his.
    for (const b of g.enemies) {
      if (b.dead || !b.bannerRange || b.silencedUntil > tms) continue;
      for (const e of g.enemies) {
        if (e.dead || Math.hypot(e.x - b.x, e.y - b.y) > b.bannerRange) continue;
        e.bannerSpeed = Math.max(e.bannerSpeed, b.bannerSpeedAmt);
        e.bannerArmor = Math.max(e.bannerArmor, b.bannerArmorAmt);
      }
    }
    for (const t of unitHosts(g)) for (const u of t.units) u.atkBuff = 0;
    for (const t of g.towers) {
      if (t.kind !== "support") continue;
      const st = getStats(t);
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range) {
          e.auraSlow = Math.max(e.auraSlow, st.slow);
          // Absolute Zero: the aura itself bites, dealing cold damage
          if (st.colddps) dealDamage(g, e, st.colddps * sdt, "magic", false, true, t.id);
        }
      }
      // Rimecaller frost nova: periodically flash-freeze everything in the aura
      if (st.nova) {
        t.novaCd = (t.novaCd ?? st.novaEvery * 0.5) - sdt * 1000;
        if (t.novaCd <= 0) {
          t.novaCd = st.novaEvery;
          g.effects.push({ type: "frostnova", x: t.x, y: t.y, ttl: 500, r: st.range });
          sfx.play("nova");
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
            dealDamage(g, e, st.nova, "magic", false, false, t.id);
            if (!e.dead) {
              e.stunUntil = Math.max(e.stunUntil, tms + st.novaFreeze);
              if (st.brittle) { e.brittleUntil = tms + (st.brittleDur || 4000); e.brittleAmp = st.brittle; }
            }
          }
        }
      }
      if (st.heal || st.buff || st.shield) {
        for (const t2 of unitHosts(g)) {
          for (const u of t2.units) {
            if (u.state === "dead") continue;
            if (Math.hypot(u.x - t.x, u.y - t.y) > st.range) continue;
            if (st.heal && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + st.heal * sdt); u.healGlow = 250; }
            if (st.buff) u.atkBuff = Math.max(u.atkBuff, st.buff);
            // Guardian's Grace: grant a ward that swallows one blow, then reforms
            if (st.shield && !u.shield && (u.shieldCd || 0) <= 0) u.shield = true;
          }
        }
      }
    }
    // Lead to Gold: the transmuter's aura eats armor off everything inside it
    for (const t of g.towers) {
      if (t.kind !== "goldworks" || t.branch !== "b") continue;
      const st = getStats(t);
      if (!st.shredAura) continue;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= st.auraRange) e.shredAura = Math.max(e.shredAura, st.shredAura);
      }
    }
    // Kingsight: the court's eye rests on the mightiest foe alive, always
    for (const t of g.towers) {
      if (t.kind !== "falconry" || !t.branch || !(t.branch + (t.rank4 || "") === "ba")) continue;
      const st = getStats(t);
      if (!st.kingsight) continue;
      let big = null;
      for (const e of g.enemies) if (!e.dead && (!big || e.hp > big.hp)) big = e;
      if (big) {
        big.markUntil = Math.max(big.markUntil, tms + 400);
        big.markAmp = Math.max(big.markAmp, st.mark);
        big.markShredAmt = Math.max(big.markShredAmt, st.markShred || 0);
      }
      break;
    }
    // The Skyknight: one rider, one war-eagle, one enemy of the air at a time
    for (const t of g.towers) {
      if (t.kind !== "falconry") continue;
      const st = getStats(t);
      if (!st.skyknight) continue;
      if (!t.eagle) t.eagle = { id: nextId(), hp: st.eagleHp, maxHp: st.eagleHp, x: t.x, y: t.y - 44, targetId: null, atkCd: 0, respawn: 0, hurtCd: 0 };
      const eg = t.eagle;
      eg.maxHp = st.eagleHp;
      if (eg.respawn > 0) {
        eg.respawn -= sdt * 1000;
        if (eg.respawn <= 0) { eg.hp = eg.maxHp; eg.x = t.x; eg.y = t.y - 44; eg.targetId = null; }
        continue;
      }
      // anything that mends knights mends the eagle: it is a unit on the field,
      // not a projectile, and a wounded bird is the whole tower being wounded
      for (const h of g.towers) {
        if (h.kind !== "support") continue;
        const hs = getStats(h);
        if (!hs.heal || eg.hp >= eg.maxHp) continue;
        if (Math.hypot(h.x - eg.x, h.y - eg.y) > hs.range) continue;
        eg.hp = Math.min(eg.maxHp, eg.hp + hs.heal * sdt);
        eg.healGlow = 220;
      }
      for (const kt of g.towers) {
        if (kt.kind !== "knight" || eg.hp >= eg.maxHp) continue;
        const ks = getStats(kt);
        if (!ks.heal || !kt.rally) continue;
        if (Math.hypot(kt.rally.x - eg.x, kt.rally.y - eg.y) > ks.range + 20) continue;
        eg.hp = Math.min(eg.maxHp, eg.hp + ks.heal * 0.5 * sdt);
        eg.healGlow = 220;
      }
      eg.healGlow = Math.max(0, (eg.healGlow || 0) - sdt * 1000);
      let target = eg.targetId ? g.enemies.find((e) => e.id === eg.targetId && !e.dead) : null;
      if (!target) {
        eg.targetId = null;
        let best = null;
        for (const e of g.enemies) {
          if (e.dead || !e.flying) continue;
          if (e.blockedBy && e.blockedBy !== eg.id) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) > st.range + 40) continue;
          if (!best || e.hp > best.hp) best = e;
        }
        if (best) { eg.targetId = best.id; target = best; }
      }
      if (!target) {
        // no war in the sky: wheel home above the roost
        const wx = t.x + Math.cos(g.time * 1.1 + t.id) * 24;
        const wy = t.y - 44 + Math.sin(g.time * 1.1 + t.id) * 8;
        eg.x += (wx - eg.x) * Math.min(1, sdt * 3);
        eg.y += (wy - eg.y) * Math.min(1, sdt * 3);
        continue;
      }
      const dxE = target.x - eg.x, dyE = target.y - 12 - eg.y;
      const dE = Math.hypot(dxE, dyE);
      if (dE > 14) {
        const v = 130 * sdt;
        eg.x += (dxE / dE) * Math.min(v, dE);
        eg.y += (dyE / dE) * Math.min(v, dE);
        if (target.blockedBy === eg.id) { target.blockedBy = null; target.engaged = false; }
      } else {
        // talons in: the enemy is HELD — dragon or no dragon
        if (target.blockedBy == null || target.blockedBy === eg.id) {
          if (target.blockedBy !== eg.id || !target.engaged) { sfx.play("roc"); g.effects.push({ type: "spark", x: target.x, y: target.y - 12, ttl: 300, gold: true }); }
          target.blockedBy = eg.id; target.engaged = true;
        }
        eg.x = target.x; eg.y = target.y - 12;
        eg.atkCd -= sdt * 1000;
        if (eg.atkCd <= 0) { eg.atkCd = st.eagleRate; dealDamage(g, target, st.eagleDmg, "phys", false, false, t.id); }
        // the held thing fights back — with its own arms, or by sheer thrashing
        eg.hurtCd -= sdt * 1000;
        if (eg.hurtCd <= 0) {
          eg.hurtCd = target.atkRate > 0 ? target.atkRate : 800;
          eg.hp -= target.atk > 0 ? target.atk : (target.boss ? 30 : 9);
          if (eg.hp <= 0) {
            releaseEnemy(g, target);
            eg.targetId = null;
            eg.respawn = st.eagleRespawn;
            g.effects.push({ type: "poof", x: eg.x, y: eg.y, ttl: 450 });
            sfx.play("falcon");
          }
        }
      }
    }
    // The armed road: any foot on a trap springs it. Foes are bucketed in
    // 30px cells once, so each trap asks only its own neighbourhood.
    const egrid = new Map();
    if (g.traps.length) for (const e of g.enemies) { if (e.dead) continue; const k = ((e.x / 30) | 0) * 1000 + ((e.y / 30) | 0); (egrid.get(k) || egrid.set(k, []).get(k)).push(e); }
    for (let ti = g.traps.length - 1; ti >= 0; ti--) {
      const tr = g.traps[ti];
      const owner = g._towerById.get(tr.byTower);
      const st = owner ? getStats(owner) : { trapDmg: 60, splash: 34, slow: 0.3, slowDur: 1400 };
      const wantsFly = !!tr.sky || tr.kind === "balloon";
      let victim = null;
      const cx = (tr.x / 30) | 0, cy = (tr.y / 30) | 0, reach = wantsFly ? 20 : 15;
      for (let i = -1; i <= 1 && !victim; i++) for (let j = -1; j <= 1 && !victim; j++) {
        const list = egrid.get((cx + i) * 1000 + cy + j);
        if (list) for (const e of list) {
          if (e.dead || (wantsFly ? !e.flying : e.flying)) continue;
          if (Math.hypot(e.x - tr.x, e.y - tr.y) < reach) { victim = e; break; }
        }
      }
      if (!victim) continue;
      g.traps.splice(ti, 1);
      const r4 = tr.branch ? tr.branch + (tr.rank4 || "") : "";
      g.effects.push({ type: tr.branch === "b" ? "boom" : "dust", x: tr.x, y: tr.y - (wantsFly ? 14 : 0), ttl: 340, r: st.splash || 34 });
      sfx.play(tr.branch === "b" ? "boom" : "trapSnap");
      g.shake = Math.max(g.shake, tr.branch === "b" ? 4 : 2);
      // a trap's blast bites like any other: the nearest SPLASH_CAP bodies
      const caught = [];
      for (const e of g.enemies) {
        if (e.dead || (wantsFly ? !e.flying : e.flying)) continue;
        const dd = Math.hypot(e.x - tr.x, e.y - tr.y);
        if (dd <= (st.splash || 34)) caught.push([dd, e]);
      }
      if (caught.length > SPLASH_CAP) { caught.sort((u, v) => u[0] - v[0]); caught.length = SPLASH_CAP; }
      for (const [dd, e] of caught) {
        // the springer eats the full bite; the splash takes the rest
        const full = e === victim;
        // a guillotine finishes the nearly-dead outright
        if (full && st.execute && !e.boss && e.hp / e.maxHp <= st.execute) {
          dealDamage(g, e, e.hp + 9999, "phys", true, false, tr.byTower);
          continue;
        }
        dealDamage(g, e, st.trapDmg * (full ? 1 : 0.6), "phys", false, false, tr.byTower);
        if (e.dead) continue;
        if (full && st.root && !e.boss) e.stunUntil = Math.max(e.stunUntil, tms + st.root);
        if (st.stunAll) e.stunUntil = Math.max(e.stunUntil, tms + st.stunAll);
        if (st.burn) { e.burnUntil = tms + st.burnDur; e.burnDps = st.burn; e.burnSrc = tr.byTower; }
        if (st.slow) { e.slowUntil = tms + st.slowDur; e.slowPct = Math.max(e.slowPct, st.slow); }
      }
      if (st.caltrops) g.grounds.push({ src: tr.byTower, x: tr.x, y: tr.y, r: 40, dps: 0, slowPct: st.caltropSlow || 0.35, until: tms + st.caltrops, kind: "caltrops" });
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * sdt);
      // Goblin Shaman: a rhythmic chant mends the WHOLE warband
      if (e.healAmt && e.silencedUntil <= tms) {
        e.healCd = (e.healCd ?? e.healEvery * 0.6) - sdt * 1000;
        if (e.healCd <= 0) {
          e.healCd = e.healEvery;
          g.effects.push({ type: "healwave", x: e.x, y: e.y, ttl: 550, r: 64 });
          sfx.play("chant");
          for (const e2 of g.enemies) {
            if (e2.dead || e2.hp >= e2.maxHp || e2.noHealUntil > tms) continue;
            e2.hp = Math.min(e2.maxHp, e2.hp + e.healAmt);
            e2.healedFlash = tms + 450;
          }
        }
      }
      // A Lord Marshal gathers himself and charges again — no line holds him
      // for long, however many swords step up.
      if (e.trampleEvery && e.trampleLeft < e.trampleMax) {
        e.trampleCd = (e.trampleCd ?? e.trampleEvery) - sdt * 1000;
        if (e.trampleCd <= 0) { e.trampleCd = e.trampleEvery; e.trampleLeft += 1; }
      }
      // Battle Chaplain: lays a ward over the soldiers around him that eats one
      // blow each. Re-cast on a rhythm, so killing him is the only real answer.
      if (e.wardEvery && e.silencedUntil <= tms) {
        e.wardCd = (e.wardCd ?? e.wardEvery * 0.5) - sdt * 1000;
        if (e.wardCd <= 0) {
          e.wardCd = e.wardEvery;
          g.effects.push({ type: "wardwave", x: e.x, y: e.y, ttl: 550, r: e.wardRange });
          sfx.play("ward");
          for (const e2 of g.enemies) {
            if (e2.dead || Math.hypot(e2.x - e.x, e2.y - e.y) > e.wardRange) continue;
            e2.guard = Math.max(e2.guard, e.wardHits);
            e2.guardFlash = tms + 400;
          }
        }
      }
      // Gravecaller / Hollow King: the bell tolls, and fresh dead climb out of
      // the road itself just behind the caller. No corpses required — this is
      // where the flood comes from, and why the caller dies first.
      if (e.summonEvery && e.silencedUntil <= tms) {
        e.summonCd = (e.summonCd ?? e.summonEvery * 0.6) - sdt * 1000;
        if (e.summonCd <= 0) {
          e.summonCd = e.summonEvery;
          for (let i = 0; i < e.summonCount; i++) {
            const u = spawnAt(g, e.summonType, e.mult * 0.8, e.dist - 14 - i * 12, tms);
            u.bounty = Math.max(1, Math.ceil(u.bounty / 2)); // conjured chaff pays half
            g.effects.push({ type: "raise", x: u.x, y: u.y, ttl: 600, life: 600 });
          }
          g.effects.push({ type: "toll", x: e.x, y: e.y, ttl: 550, r: 46 });
          sfx.play("toll");
        }
      }
      // Necromancer: calls nearby fallen back to their feet at half strength
      if (e.raiseEvery && e.silencedUntil <= tms) {
        e.raiseCd = (e.raiseCd ?? e.raiseEvery * 0.5) - sdt * 1000;
        if (e.raiseCd <= 0) {
          e.raiseCd = e.raiseEvery;
          let raised = 0;
          for (let ci = g.corpses.length - 1; ci >= 0 && raised < 3; ci--) {
            const c = g.corpses[ci];
            if (c.until <= tms || Math.hypot(c.x - e.x, c.y - e.y) > 150) continue;
            g.corpses.splice(ci, 1);
            raised++;
            const u = makeEnemy(c.type, 1);
            u.hp = u.maxHp = Math.max(1, Math.round(c.hp0 * 0.5));
            u.dist = c.dist; u.lane = c.lane; u.x = c.x; u.y = c.y;
            u.bounty = Math.ceil(u.bounty / 2);
            u.revived = true;
            if (c.sprite) u.sprite = c.sprite;   // it rises in the look it fell in
            g.enemies.push(u);
            g.effects.push({ type: "raise", x: c.x, y: c.y, ttl: 600, life: 600 });
            sfx.play("raise");
          }
        }
      }
      if (e.burnUntil > tms) {
        dealDamage(g, e, e.burnDps * sdt, "magic", false, true, e.burnSrc);
        // Wildfire Court: flames leap from burning foes to nearby unburned ones
        if (e.burnSpread) {
          for (const e2 of g.enemies) {
            if (e2.dead || e2 === e || e2.burnUntil > tms) continue;
            if (Math.hypot(e2.x - e.x, e2.y - e.y) <= 40) {
              e2.burnUntil = tms + 1300;
              e2.burnDps = e.burnDps * 0.6;
            }
          }
        }
      }
      if (!e.dead && e.poisonUntil > tms) dealDamage(g, e, e.poisonDps * sdt, "magic", false, true, e.poisonSrc);
      // Volcanic Throne: lava pools scorch anyone standing in them. Plague
      // ground is the dead's own filth — it only troubles the living knights.
      if (!e.dead) {
        for (const gr of g.grounds) {
          if (gr.kind === "plague") continue;
          if (gr.until <= tms || Math.hypot(e.x - gr.x, e.y - gr.y) > gr.r) continue;
          if (gr.kind === "caltrops") { e.auraSlow = Math.max(e.auraSlow, gr.slowPct || 0.35); continue; }
          dealDamage(g, e, gr.dps * sdt, "magic", false, true, gr.src);
        }
      }
      if (e.dead) continue;
      e.atkAnim = Math.max(0, e.atkAnim - sdt * 1000);
      // discipline and dead weight: sergeants and rams shrug off the chill and
      // the shock that stop everything else
      const stunned = e.stunUntil > tms && !e.immStun;
      const held = e.blockedBy && e.engaged;
      // ---- the river road ----
      // A swimmer answers to the current, not the highway: it paddles to the
      // crossing, climbs the bank there, and joins the march already past
      // everything you built between the gate and the bridge.
      if (e.swimming) {
        if (!stunned) {
          const slowW = e.immSlow ? 0 : Math.max(e.slowUntil > tms ? e.slowPct : 0, e.auraSlow || 0);
          e.swimD += e.speed * 0.85 * (1 - slowW) * sdt * e.swimDir;
        }
        const done = e.swimDir > 0 ? e.swimD >= RIVER_ROUTE.exitSwim : e.swimD <= RIVER_ROUTE.exitSwim;
        if (done) {
          e.swimming = false;
          e.dist = RIVER_ROUTE.exitRoad;
          e.lane = pickLane(e.boss);
          g.effects.push({ type: "dust", x: e.x, y: e.y, ttl: 420, r: 20 });
        } else {
          const [wx, wy] = RIVER_ROUTE.at(e.swimD);
          const [nx] = RIVER_ROUTE.at(e.swimD + e.swimDir * 6);
          e.x = wx; e.y = wy;
          e.face = nx >= wx ? 1 : -1;
          continue;                       // no road position, no leak check
        }
      }
      if (!stunned && !held) {
        const slow = e.immSlow ? 0 : Math.max(e.slowUntil > tms ? e.slowPct : 0, e.auraSlow || 0);
        const step = e.speed * (1 + (e.bannerSpeed || 0)) * (1 - slow) * sdt;
        // every foe walks its OWN lane at its own speed: round a bend the
        // inside lane is shorter, so a foe on it gains road on its neighbours
        // and the outside lane loses some — the column staggers itself.
        // (Stepping the centre line instead made inside lanes crawl.)
        // `stretch` is how much lane ground one unit of road holds here.
        let stretch = 1;
        if (e.lane) {
          const [x0, y0] = lanePos(e.dist, e.lane);
          const [x1, y1] = lanePos(Math.min(TOTAL_LEN, e.dist + 4), e.lane);
          if (e.dist + 4 <= TOTAL_LEN) stretch = Math.max(0.4, Math.min(2.5, Math.hypot(x1 - x0, y1 - y0) / 4));
        }
        e.dist += step / stretch;
      }
      const [nx, ny, a] = lanePos(e.dist, e.lane);
      // the walk cycle follows the ground actually covered, so no foot slides
      if (e.px != null) e.gait = (e.gait || 0) + Math.hypot(nx - e.px, ny - e.py) / 14;
      e.px = nx; e.py = ny;
      e.x = nx; e.y = ny;
      if (!held && Math.abs(Math.cos(a)) > 0.3) e.face = Math.cos(a) >= 0 ? 1 : -1;
      // Crossbowmen: they shoot your knights from outside sword reach and
      // never break stride to do it. Nothing blocks this — only killing them.
      if (e.rangedAtk && !stunned) {
        e.rangedCd -= sdt * 1000;
        if (e.rangedCd <= 0) {
          let mark = null, markTower = null, bd = e.rangedRange;
          for (const t of unitHosts(g)) {
            for (const u of t.units) {
              if (u.state === "dead") continue;
              const d = Math.hypot(u.x - e.x, u.y - e.y);
              if (d < bd) { bd = d; mark = u; markTower = t; }
            }
          }
          if (mark) {
            e.rangedCd = e.rangedRate;
            e.atkAnim = 220;
            e.face = mark.x >= e.x ? 1 : -1;
            g.effects.push({ type: "bolt", x: e.x, y: e.y - 6, tx: mark.x, ty: mark.y - 8, ttl: 170 });
            sfx.play("enemyBolt");
            if (mark.shield) {
              mark.shield = false; mark.shieldCd = 6500;
              g.effects.push({ type: "flash", x: mark.x, y: mark.y - 6, ttl: 300 });
            } else {
              mark.hp -= e.rangedAtk;
              g.effects.push({ type: "hit", x: mark.x, y: mark.y - 10, ttl: 200 });
              if (mark.hp <= 0) killUnit(g, markTower, mark);
            }
          }
        }
      }
      // the gate guard: a foe that reaches the portcullis is held there a
      // moment — and, with the oil on, scalded while it waits
      const guard = workTier(g.castle, "guards", g.castleRanks);
      if (guard && !e.flying) {
        if (!e.gateHeld && e.dist >= TOTAL_LEN - 3) {
          e.gateHeld = true; e.holdUntil = tms + guard.hold;
          g.effects.push({ type: "spark", x: e.x, y: e.y - 8, ttl: 300 });
        }
        if (e.gateHeld && e.holdUntil > tms) {
          e.dist = TOTAL_LEN - 3;
          if (guard.oil) dealDamage(g, e, guard.oil * sdt, "magic", true, true, null);
          if (guard.oil && Math.random() < sdt * 6) g.effects.push({ type: "hit", x: e.x + (Math.random() - 0.5) * 8, y: e.y - 6, ttl: 200 });
        }
      }
      if (e.dist >= TOTAL_LEN) {
        e.dead = true;
        const dmgC = e.castleDmg || 1;
        g.lives -= dmgC;
        if (g.run) g.run.leaks += 1;
        g.shake = 5 + dmgC * 2.5;
        g.effects.push({ type: "leak", x: e.x - 10, y: e.y, ttl: 700, text: `-${dmgC}` });
        sfx.play("leak");
        // something got through the gate: stone dust and a hit on the wall
        g.effects.push({ type: "dust", x: e.x, y: e.y, ttl: 400, r: 18 + dmgC * 5 });
        g.effects.push({ type: "flash", x: e.x, y: e.y - 8, ttl: 320 });
        if (g.lives <= 0) { g.lives = 0; g.phase = "lost"; sfx.play("lost"); }
      }
    }
    // ---- the castle's own works: bowmen on the walk, ballistae on the drums ----
    if (g.castle) {
      const [gx, gy] = PTS[PTS.length - 1];
      g.castleCd = g.castleCd || { archers: 0, ballista: 0, shot: 0 };
      const cd = g.castleCd;
      const bows = workTier(g.castle, "archers", g.castleRanks);
      if (bows) {
        cd.archers -= sdt * 1000;
        if (cd.archers <= 0) {
          let best = null, bd = Infinity;
          for (const e of g.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - gx, e.y - gy); if (d < bows.range && d < bd) { bd = d; best = e; } }
          if (best) {
            cd.archers = bows.rate / bows.count;
            cd.shot = (cd.shot + 1) % bows.count;
            const spots = bowmenSpots(gy, bows.count);
            const sy = spots[cd.shot % spots.length] ?? gy;
            g.projectiles.push({ id: nextId(), x: BOW_X, y: sy - 12, targetId: best.id, tx: best.x, ty: best.y, speed: 460, delay: 0, dmg: bows.dmg, dtype: "phys", pierce: !!bows.pierce, splash: 0, burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow", src: null, big: !!bows.pierce });
            sfx.play("arrow");
          }
        }
      }
      const bal = workTier(g.castle, "ballista", g.castleRanks);
      if (bal) {
        cd.ballista -= sdt * 1000;
        if (cd.ballista <= 0) {
          let best = null, bh = -1;
          for (const e of g.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - gx, e.y - gy); if (d < bal.range && e.hp > bh) { bh = e.hp; best = e; } }
          if (best) {
            cd.ballista = bal.rate / (bal.twin ? 2 : 1);
            cd.shot = (cd.shot + 1) % 2;
            // the bolt leaves the ballista drawn on the gate tower's open top
            const [bx, by] = ballistaMuzzle(ballistaSpots(gy, bal.twin)[bal.twin ? cd.shot : 0]);
            g.projectiles.push({ id: nextId(), x: bx, y: by, targetId: best.id, tx: best.x, ty: best.y, speed: 560, delay: 0, dmg: bal.dmg, dtype: "phys", pierce: true, splash: 0, burn: bal.burn || 0, burnDur: bal.burnDur || 0, slow: 0, slowDur: 0, kind: "arrow", src: null, big: true });
            sfx.play("bolt");
          }
        }
      }
    }
    // ---- deaths with consequences ----
    // Amalgams come apart into ghouls; plague ghasts burst over the line.
    // Handled here, just before the fallen leave the array, so a wave can
    // never be declared clear while its last body still owes children.
    for (const e of g.enemies) {
      if (!e.dead || e.deathDone) continue;
      e.deathDone = true;
      // Plague Bearer: whoever dies carrying the guild's venom bursts
      if (e.sporeOn) {
        g.grounds.push({ src: e.sporeOn.src, x: e.x, y: e.y, r: e.sporeOn.r, dps: e.sporeOn.dps, until: tms + e.sporeOn.dur, kind: "spores" });
        g.effects.push({ type: "boom", x: e.x, y: e.y, ttl: 300, r: e.sporeOn.r * 0.7 });
      }
      if (e.splitInto) {
        const [type, n] = e.splitInto;
        for (let i = 0; i < n; i++) spawnAt(g, type, e.mult, e.dist - 4 - i * 9, tms);
        g.effects.push({ type: "dust", x: e.x, y: e.y, ttl: 380, r: 30 });
        g.shake = Math.max(g.shake, 2);
      }
      if (e.deathBurst) {
        const b = e.deathBurst;
        g.effects.push({ type: "plagueburst", x: e.x, y: e.y, ttl: 500, r: b.r });
        sfx.play("plague");
        g.grounds.push({ x: e.x, y: e.y, r: b.r * 0.8, dps: b.dps, until: tms + b.dur, kind: "plague" });
        for (const t of unitHosts(g)) {
          for (const u of t.units) {
            if (u.state === "dead" || Math.hypot(u.x - e.x, u.y - e.y) > b.r) continue;
            if (u.shield) {
              u.shield = false; u.shieldCd = 6500;
              g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 });
            } else {
              u.hp -= b.dmg;
              g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 220 });
            }
            if (u.hp <= 0) killUnit(g, t, u);
          }
        }
      }
    }
    g.enemies = g.enemies.filter((e) => !e.dead);

    for (const t of g.towers) {
      if (t.kind !== "knight") continue;
      syncUnits(t, g);
      const st = getStats(t);
      const slots = unitSlots(t);
      runMelee(g, t, st, slots, sdt, tms);
      // Radiant Basilica: holy ground around each living paladin sears nearby foes
      if (st.sear) {
        for (const u of t.units) {
          if (u.state === "dead") continue;
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - u.x, e.y - u.y) <= 42) dealDamage(g, e, st.sear * sdt, "magic", false, true, t.id);
          }
        }
      }
    }


    // ---- the Powder Works ----
    // Two men on one platform who do NOT share a trigger: the bombardier lobs
    // powder into whatever is close while the musketeer takes his own slow,
    // deliberate shot at something much further out. Every path funds one of
    // them harder, and neither is ever laid off.
    for (const t of g.towers) {
      if (t.kind !== "gunpowder") continue;
      const st = getStats(t);
      // --- the bombardier: short, fat, splashing ---
      t.cd = (t.cd || 0) - sdt * 1000;
      if (t.cd <= 0) {
        let near = null, nearScore = -Infinity;
        for (const e of g.enemies) {
          if (e.dead || e.flying) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
          // he throws where the crowd is thickest, being a man with a bucket of powder
          let crowd = 0;
          for (const o of g.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= st.splash) crowd++;
          const score = crowd * 1e6 + e.dist;
          if (score > nearScore) { nearScore = score; near = e; }
        }
        if (near) {
          t.cd = st.rate;
          t.anim = 1;
          t.lastAim = Math.atan2(near.y - t.y, near.x - t.x);
          const throws = st.shells || 1;
          for (let i = 0; i < throws; i++) {
            const sp = throws > 1 ? (i - (throws - 1) / 2) * 34 : 0;
            g.projectiles.push({
              x: t.x, y: t.y - 16, tx: near.x + sp, ty: near.y + (i % 2 ? -12 : 12) * (throws > 1 ? 1 : 0),
              t: 0, speed: 200, delay: 0, dmg: st.dmg, dtype: "phys", pierce: false, splash: st.splash, splashCap: st.splashCap || 0,
              burn: st.burn || 0, burnDur: st.burnDur || 0, slow: 0, slowDur: 0,
              burnSpreads: !!st.burnSpread, kind: "shell", src: t.id, arc: true,
            });
          }
          sfx.play("boom");
          g.shake = Math.max(g.shake, 2);
        }
      }
      // --- the musketeer: long, slow, and it goes through plate ---
      t.mCd = (t.mCd || 0) - sdt * 1000;
      if (t.mCd <= 0) {
        let far = null, farScore = -Infinity;
        for (const e of g.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) > st.mRange) continue;
          const mode = t.aim || "first";
          const score = mode === "last" ? -e.dist : mode === "strong" ? e.hp : mode === "weak" ? -e.hp : e.dist;
          if (score > farScore) { farScore = score; far = e; }
        }
        if (far) {
          t.mCd = st.mRate;
          t.mAnim = 1;
          t.mAim = Math.atan2(far.y - t.y, far.x - t.x);
          const balls = st.mShots || 1;
          // one held breath in three lands triple
          t.mShotIdx = ((t.mShotIdx || 0) + 1) % (st.mCrit || 1);
          const crit = st.mCrit && t.mShotIdx === 0 ? 3 : 1;
          for (let i = 0; i < balls; i++) {
            const spread = balls > 1 ? (i - (balls - 1) / 2) * (st.mSpread || 0.2) : 0;
            const a2 = t.mAim + spread;
            const reach = st.mRange;
            g.projectiles.push({
              x: t.x + 6, y: t.y - 20, tx: t.x + Math.cos(a2) * reach, ty: t.y - 20 + Math.sin(a2) * reach,
              t: 0, speed: 620, delay: 0, dmg: st.mDmg * crit / (balls > 1 ? 1 : 1), dtype: "phys",
              pierce: !!st.mPierce, splash: 0, burn: 0, burnDur: 0, slow: 0, slowDur: 0,
              kind: "ball", src: t.id, hitsLeft: balls > 1 ? 1 : 2, hitIds: [],
            });
          }
          sfx.play("musket");
          g.shake = Math.max(g.shake, crit > 1 ? 3 : 1);
        }
      }
      t.mAnim = Math.max(0, (t.mAnim || 0) - sdt * 3.2);
    }

    // ---- the River Watch ----
    // Boats, not battlements. The skiffs row their own river looking for
    // anything walking the banks, and they can bring a harpoon to stretches
    // of ground no tower will ever be allowed to stand on. If the water is
    // quiet they spread out and hold station.
    for (const t of g.towers) {
      if (t.kind !== "riverwatch") continue;
      const st = getStats(t);
      // moored in a pond or mere, its skiffs row a ring round the open water;
      // moored off a coast they patrol the shore; otherwise they work the river
      if (t._pond === undefined) t._pond = pondAt(t.x, t.y) || null;
      if (t._sea === undefined) t._sea = !t._pond && seaDepthAt(t.x, t.y) > 0;
      const rt = t._pond ? pondRoute(t._pond) : t._sea ? seaRoute() : RIVER_ROUTE;
      if (!rt) continue;                         // no water, no watch
      const n = st.count || 1;
      if (!t.units) t.units = [];
      while (t.units.length < n) {
        const idx = t.units.length;
        t.units.push({ id: nextId(), hp: st.hp, maxHp: st.hp, sd: (rt.total * (idx + 1)) / (n + 1),
          x: t.x, y: t.y, face: 1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null });
      }
      if (t.units.length > n) t.units.length = n;
      // where the river runs nearest a given spot, as a distance along it.
      // The river is sampled once per route, and each foe's answer is kept
      // for the tick — every skiff of every watch asks about every foe, and
      // scanning the whole river each time was most of a late-game tick.
      if (rt._samples === undefined) {
        rt._samples = [];
        for (let q = 0; q <= rt.total; q += 10) { const [px, py] = rt.at(q); rt._samples.push([q, px, py]); }
      }
      const nearOnRiver = (x, y, e) => {
        if (e && e._rivT === tms && e._rivR === rt) return e._riv;
        let bd2 = Infinity, bq = 0;
        for (const [q, px, py] of rt._samples) {
          const dd = (px - x) * (px - x) + (py - y) * (py - y);
          if (dd < bd2) { bd2 = dd; bq = q; }
        }
        const r = { q: bq, d: Math.sqrt(bd2) };
        if (e) { e._rivT = tms; e._rivR = rt; e._riv = r; }
        return r;
      };
      t.units.forEach((u, i) => {
        u.maxHp = st.hp;
        if (u.state === "dead") {
          u.respawn -= sdt * 1000;
          if (u.respawn <= 0) { u.state = "rally"; u.hp = st.hp; u.sd = (rt.total * (i + 1)) / (n + 1); u.targetId = null; }
          return;
        }
        u.atkCd -= sdt * 1000;
        u.swing = Math.max(0, u.swing - sdt * 1000);
        if (u.hp <= 0) { killUnit(g, t, u); return; }

        // pick the foe furthest along the road that a boat can actually reach
        let mark = null, markQ = 0, markScore = -Infinity;
        for (const e of g.enemies) {
          if (e.dead || e.flying || e.swimming) continue;
          const nr = nearOnRiver(e.x, e.y, e);
          if (nr.d > st.range) continue;
          const mode = t.aim || "first";
          const score = mode === "last" ? -e.dist : mode === "strong" ? e.hp : mode === "weak" ? -e.hp : e.dist;
          if (score > markScore) { markScore = score; mark = e; markQ = nr.q; }
        }
        const home = (rt.total * (i + 1)) / (n + 1);
        const want = mark ? markQ : home;
        const row = (st.rowSpeed || 78) * sdt;
        // round a pond the short way; along a river, up or down it
        let gap = want - u.sd;
        if (rt.ring) { gap = ((gap % rt.total) + rt.total * 1.5) % rt.total - rt.total / 2; }
        if (Math.abs(gap) > 1) u.sd += Math.sign(gap) * Math.min(row, Math.abs(gap));
        u.sd = rt.ring ? ((u.sd % rt.total) + rt.total) % rt.total : Math.max(0, Math.min(rt.total, u.sd));
        const [bx, by] = rt.at(u.sd);
        const [nx] = rt.at(Math.min(rt.total, u.sd + 6));
        u.x = bx; u.y = by;
        u.state = mark ? "moving" : "rally";
        if (!mark) { u.face = nx >= bx ? 1 : -1; return; }
        u.face = mark.x >= u.x ? 1 : -1;
        if (Math.hypot(mark.x - u.x, mark.y - u.y) > st.range || u.atkCd > 0) return;
        // the harpoon goes out
        u.atkCd = st.rate;
        u.swing = 200;
        u.targetId = mark.id;
        g.effects.push({ type: "bolt", x: u.x, y: u.y - 6, tx: mark.x, ty: mark.y - 6, ttl: 190 });
        sfx.play(st.splash ? "boom" : "bolt");
        dealDamage(g, mark, st.dmg, "phys", !!st.pierce, false, t.id);
        if (st.splash) {
          for (const e2 of g.enemies) {
            if (e2.dead || e2 === mark || e2.flying) continue;
            if (Math.hypot(e2.x - mark.x, e2.y - mark.y) > st.splash) continue;
            dealDamage(g, e2, st.dmg * 0.55, "phys", false, false, t.id);
          }
        }
        for (const e2 of g.enemies) {
          if (e2.dead || e2.flying) continue;
          const dd = Math.hypot(e2.x - mark.x, e2.y - mark.y);
          if (dd > (st.splash || 1)) continue;
          if (st.burn) { e2.burnUntil = tms + st.burnDur; e2.burnDps = st.burn; e2.burnSrc = t.id; }
          if (st.stun && Math.random() < st.stun) e2.stunUntil = tms + st.stunDur;
        }
        if (!mark.dead) {
          if (st.slow) { mark.slowUntil = tms + st.slowDur; mark.slowPct = Math.max(mark.slowPct, st.slow); }
          if (st.burn && !st.splash) { mark.burnUntil = tms + st.burnDur; mark.burnDps = st.burn; mark.burnSrc = t.id; }
        }
        if (st.poolDps) g.grounds.push({ src: t.id, x: mark.x, y: mark.y, r: st.poolR || 30, dps: st.poolDps, until: tms + (st.poolDur || 2600), kind: "lava" });
      });
    }

    // ---- the Covert's blades ----
    // Troops, not a volley. They walk out, take the mark their standing order
    // names, and cut. Nothing blocks for them and nothing blocks them: the
    // column walks straight past while the work is done in the grass. Only a
    // crossbow bolt or grave-rot ever finds one.
    for (const t of g.towers) {
      if (t.kind !== "assassin") continue;
      syncUnits(t, g);
      const st = getStats(t);
      const slots = unitSlots(t);
      t.units.forEach((u, i) => {
        if (u.state === "dead") {
          u.respawn -= sdt * 1000;
          if (u.respawn <= 0) { u.state = "rally"; u.hp = st.hp; u.x = slots[i][0]; u.y = slots[i][1]; u.targetId = null; }
          return;
        }
        u.atkCd -= sdt * 1000;
        u.swing = Math.max(0, u.swing - sdt * 1000);
        for (const gr of g.grounds) {
          if (gr.kind !== "plague" || gr.until <= tms) continue;
          if (Math.hypot(u.x - gr.x, u.y - gr.y) <= gr.r) u.hp -= gr.dps * sdt;
        }
        if (u.hp <= 0) { killUnit(g, t, u); return; }

        let target = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead) : null;
        // a blade keeps its mark only while the mark keeps to the ground it hunts
        if (target && !st.preyAnywhere && Math.hypot(target.x - t.rally.x, target.y - t.rally.y) > st.range + 30) { target = null; u.targetId = null; }
        // and an ORDER outranks whatever the blade happens to be doing: the
        // moment a named foe walks into reach, the current throat is forgotten
        const order = orderFilter(t, st);
        if (target && order && !order(target)) {
          const named = pickPrey(g, t, st);
          if (named && order(named)) { target = named; u.targetId = named.id; }
        }
        if (!target) {
          target = pickPrey(g, t, st);
          u.targetId = target ? target.id : null;
        }
        if (!target) {
          // no orders worth walking for: melt back to the muster
          const [sx, sy] = slots[i];
          const dx0 = sx - u.x, dy0 = sy - u.y, d0 = Math.hypot(dx0, dy0);
          if (d0 > 2) {
            const sp = (st.unitSpeed || 120) * sdt;
            u.x += (dx0 / d0) * Math.min(sp, d0);
            u.y += (dy0 / d0) * Math.min(sp, d0);
            u.face = dx0 >= 0 ? 1 : -1;
            u.state = "moving";
          } else u.state = "rally";
          return;
        }

        const dx = target.x - u.x, dy = target.y - u.y;
        const d = Math.hypot(dx, dy);
        if (d > 15) {
          const sp = (st.unitSpeed || 120) * sdt;
          u.x += (dx / d) * sp; u.y += (dy / d) * sp;
          u.face = dx >= 0 ? 1 : -1;
          u.state = "moving";
        } else {
          u.state = "fighting";
          u.face = dx >= 0 ? 1 : -1;
          if (u.atkCd <= 0) {
            u.atkCd = st.rate;
            u.swing = 200;
            const prey = isPrey(target);
            let dmg = st.dmg * (prey ? st.preyMult : 1);
            // a blade of the Court finishes what is already dying
            if (st.cull && !target.boss && target.hp / target.maxHp <= st.cull) dmg = target.hp + 99999;
            // the venom rides the blade in — even a killing cut leaves it behind
            if (st.venom) {
              const cur = target.poisonUntil > tms ? target.poisonDps : 0;
              target.poisonDps = Math.max(cur, st.venom);
              target.poisonUntil = tms + st.venomDur;
              target.poisonSrc = t.id;
              if (st.venomNoHeal) target.noHealUntil = tms + st.venomDur;
              if (st.spores) target.sporeOn = { dps: st.spores, r: st.sporeR, dur: st.sporeDur, src: t.id };
            }
            dealDamage(g, target, dmg, "phys", !!st.pierce, false, t.id);
            if (!target.dead && st.silence) {
              target.silencedUntil = tms + st.silence;
              g.effects.push({ type: "silence", x: target.x, y: target.y - target.size - 6, ttl: 900 });
            }
            g.effects.push({ type: "shadowstep", x1: u.x, y1: u.y - 8, x2: target.x, y2: target.y - 4, ttl: 260, life: 260, prey });
            sfx.play("stab");
            if (target.dead) u.targetId = null;
          }
        }
      });
    }
    for (const t of g.towers) {
      t.anim = Math.max(0, t.anim - sdt * 4);
      if (t.kind === "knight" || t.kind === "support" || t.kind === "trapsmith" || t.kind === "assassin" || t.kind === "riverwatch" || t.kind === "gunpowder") continue;
      if (t.kind === "goldworks" && !t.branch) continue;   // the mint pulls no trigger
      // The Sunforge holds its beam instead of firing: same target, growing
      // heat; a new target starts the focus from cold.
      if (t.kind === "sunforge") {
        const st = getStats(t);
        let tgt = t.beamId != null ? g.enemies.find((e) => e.id === t.beamId && !e.dead) : null;
        if (tgt && Math.hypot(tgt.x - t.x, tgt.y - t.y) > st.range) tgt = null;
        if (!tgt) {
          let best = null;
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range && (!best || e.hp > best.hp)) best = e;
          }
          tgt = best;
          t.beamId = best ? best.id : null;
          t.ramp = 1;
        }
        t.beamId2 = null;
        if (tgt) {
          t.ramp = Math.min(st.rampMax, (t.ramp || 1) + ((sdt * 1000) / st.rampTime) * (st.rampMax - 1));
          const atMax = t.ramp >= st.rampMax - 0.01;
          t.lastAim = Math.atan2(tgt.y - t.y, tgt.x - t.x);
          dealDamage(g, tgt, st.dps * t.ramp * sdt, "magic", false, true, t.id);
          if (!tgt.dead) {
            if (st.beamSlow) { tgt.slowUntil = tms + 200; tgt.slowPct = Math.max(tgt.slowPct, atMax && st.wellRoot ? 0.95 : st.beamSlow); }
            if (atMax && st.igniteBurn) { tgt.burnUntil = tms + st.igniteDur; tgt.burnDps = st.igniteBurn; tgt.burnSrc = t.id; }
          }
          if (atMax && st.beamSplash) {
            for (const e of g.enemies) {
              if (e.dead || e === tgt) continue;
              if (Math.hypot(e.x - tgt.x, e.y - tgt.y) <= st.beamSplash) dealDamage(g, e, st.dps * 0.5 * sdt, "magic", false, true, t.id);
            }
          }
          if (st.beams > 1) {
            let second = null;
            for (const e of g.enemies) {
              if (e.dead || e === tgt) continue;
              if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range && (!second || e.hp > second.hp)) second = e;
            }
            if (second) {
              dealDamage(g, second, st.dps * Math.max(1, t.ramp * 0.5) * sdt, "magic", false, true, t.id);
              if (!second.dead) {
                t.beamId2 = second.id;
                if (st.beamSlow) { second.slowUntil = tms + 200; second.slowPct = Math.max(second.slowPct, st.beamSlow); }
              }
            }
          }
          if (tgt.dead) { t.beamId = null; t.ramp = 1; }
        }
        continue;
      }
      t.cd -= sdt * 1000;
      if (t.cd > 0) continue;
      const st = getStats(t);
      const target = pickTarget(g, t, st);
      if (!target) continue;
      t.cd = st.rate;
      t.anim = 1;
      t.lastAim = Math.atan2(target.y - t.y, target.x - t.x);
      if (st.roller) {
        // ---- the Log Roller ----
        // It does not aim at a foe; it aims at a BEARING, the one you set with
        // its flag. The log leaves the cradle and grinds on until it is off the
        // board, taking everything it touches with it.
        // It rolls in ONE straight line from the cradle, straight through the
        // flag and on until it leaves the board — the road doesn't bend it.
        // (Its hit reaches the whole width of the road wherever it crosses.)
        const bearing = t.rally ? Math.atan2(t.rally.y - t.y, t.rally.x - t.x)
          : t.logAim != null ? t.logAim : 0;
        if (!g.logs) g.logs = [];
        g.logs.push({
          id: nextId(), src: t.id, x: t.x, y: t.y, a: bearing, via: null, bearing,
          speed: st.logSpeed || 118, dmg: st.logDmg || 120, w: st.logWidth || 22,
          stun: st.logStun || 0, slow: st.logSlow || 0, slowDur: st.logSlowDur || 0,
          burn: st.logBurn || 0, burnDur: st.logBurnDur || 0,
          blast: st.logBlast || 0, blastDmg: st.logBlastDmg || 0,
          hitIds: [], spin: 0,
        });
        sfx.play("rock");
        g.shake = Math.max(g.shake, 3);
        t.anim = 1;
        t.lastAim = bearing;
        continue;
      }
      if (t.kind === "archer") {
        sfx.play(getStats(t).bolt ? "bolt" : "arrow");
        const lay = archerLayout(t);
        const hgt = lay.h;
        let offs;
        if (t.branch === "a") {
          t.shotIdx = (t.shotIdx + 1) % 3;
          offs = [lay.spots[t.shotIdx]];
        } else {
          offs = lay.spots;
        }
        // Dragonslayer: every st.crit-th shot is a heartseeker at critMult damage
        let dmgMul = 1;
        if (st.crit) {
          t.critIdx = ((t.critIdx || 0) + 1) % st.crit;
          if (t.critIdx === 0) dmgMul = st.critMult || 3;
        }
        const per = t.branch ? st.dmg : Math.round(st.dmg / offs.length);
        offs.forEach(([ox, oy], i) => {
          g.projectiles.push({
            id: nextId(), x: t.x + ox, y: t.y - hgt + oy - 12, targetId: target.id,
            tx: target.x, ty: target.y, speed: st.bolt ? 560 : 460, delay: i * 90,
            dmg: Math.round(per * dmgMul), dtype: st.dtype, pierce: !!st.pierce, splash: 0,
            burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow", src: t.id,
            big: !!st.bolt || dmgMul > 1,
            poison: st.poison || 0, poisonDur: st.poisonDur || 0, poisonCap: st.poisonCap || 0,
            chain: st.chain || 0, chainRange: st.chainRange || 0,
          });
        });
      } else if (t.kind === "catapult") {
        // Rocks lob toward where the target is HEADED — a fixed landing point,
        // no homing. Lead the shot by projecting the enemy along the road for
        // the rock's flight time (fast enemies can dodge; clumps get crushed).
        const rockSpeed = t.branch === "a" ? 270 : 240;
        sfx.play("catapult");
        const d0 = Math.hypot(target.x - t.x, target.y - t.y);
        const slowNow = Math.max(target.slowUntil > tms ? target.slowPct : 0, target.auraSlow || 0);
        const lead = Math.min(target.dist + target.speed * (1 - slowNow) * (d0 / rockSpeed) * 0.85, TOTAL_LEN - 1);
        const [lx, ly] = posAt(lead);
        const la = angleAt(lead);
        const ax = lx + Math.cos(la + Math.PI / 2) * target.lane;
        const ay = ly + Math.sin(la + Math.PI / 2) * target.lane;
        const shots = st.shots || 1;
        for (let i = 0; i < shots; i++) {
          const ox = shots > 1 ? (Math.random() - 0.5) * 46 : 0;
          const oy = shots > 1 ? (Math.random() - 0.5) * 34 : 0;
          // the stone leaves the arm's tip where it slams into its stop
          // (halls/catapult.js spec: a trebuchet's sling tops out higher)
          const f = ax >= t.x ? 1 : -1;
          const sx = t.x + f * (t.branch === "a" ? 20 : 14), sy = t.y - (t.branch === "a" ? 50 : 35 + t.level);
          g.projectiles.push({
            id: nextId(), x: sx, y: sy, sx, sy, targetId: null,
            tx: ax + ox, ty: ay + oy, speed: rockSpeed, delay: i * 130,
            dmg: st.dmg, dtype: st.dtype, pierce: false, splash: st.splash || 0, splashCap: st.splashCap || 0,
            burn: st.burn || 0, burnDur: st.burnDur || 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
            kind: "rock", src: t.id, frag: !!st.frag, ground: !!st.groundOnly,
            total: Math.hypot(ax + ox - sx, ay + oy - sy),
            big: t.branch === "a",
          });
        }
      } else if (t.kind === "spiker") {
        if (st.nova) {
          // Brazier Wheel: a ring of flame scorches everything in reach
          g.effects.push({ type: "firenova", x: t.x, y: t.y, ttl: 450, r: st.range });
          sfx.play("firenova");
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
            dealDamage(g, e, st.dmg, st.dtype, false, false, t.id);
            if (!e.dead && st.burn) {
              e.burnUntil = tms + st.burnDur;
              e.burnDps = st.burn;
              if (st.burnSpread) e.burnSpread = true;
            }
          }
        } else {
          // a full ring of spikes, the whole ring rotating a little each volley
          const n = st.spikes || 8;
          sfx.play("spike");
          // the wheel lets fly as a spoke swings onto the nearest foe, so the
          // ring always puts one spike straight down the thickest line
          let near = null, nd = Infinity;
          for (const e of g.enemies) {
            if (e.dead) continue;
            const d = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
            if (d < nd) { nd = d; near = e; }
          }
          t.spinOff = near ? Math.atan2(near.y - (t.y - 8), near.x - t.x) : (t.spinOff || 0) + 0.37;
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + t.spinOff;
            g.projectiles.push({
              id: nextId(), x: t.x, y: t.y - 8, targetId: null,
              tx: t.x + Math.cos(ang) * st.range, ty: t.y - 8 + Math.sin(ang) * st.range,
              speed: 360, delay: 0, dmg: st.dmg, dtype: st.dtype, pierce: false, splash: 0,
              burn: 0, burnDur: 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
              kind: "spike", src: t.id, hitsLeft: st.spikePierce || 1, hitIds: [], angle: ang,
            });
          }
        }
      } else if (t.kind === "falconry") {
        // a Skyknight's mews has no birds left to throw — she is riding it
        if (st.skyknight) { t.cd = 400; continue; }
        // the bird stoops: instant talons, a mark left behind, and — for the
        // storm mews — a ricochet into the next victim
        const hits = [target];
        if (st.shots > 1) {
          for (const e of g.enemies) {
            if (hits.length >= st.shots) break;
            if (e.dead || hits.includes(e)) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range) hits.push(e);
          }
        }
        for (const v of hits) {
          g.effects.push({ type: "talon", x1: t.x, y1: t.y - 38, x2: v.x, y2: v.y - 6, ttl: 520, life: 520 });
          dealDamage(g, v, st.dmg * (v.flying ? st.airMult : 1), "phys", false, false, t.id);
          if (!v.dead) {
            v.markUntil = tms + st.markDur;
            v.markAmp = Math.max(v.markAmp, st.mark);
            v.markShredAmt = Math.max(v.markShredAmt, st.markShred || 0);
            if (st.diveStun && Math.random() < st.diveStun) v.stunUntil = tms + st.diveStunDur;
          }
          if (st.chain) {
            let nxt = null, nd = Infinity;
            for (const e of g.enemies) {
              if (e.dead || e === v || hits.includes(e)) continue;
              const dd = Math.hypot(e.x - v.x, e.y - v.y);
              if (dd <= st.chainRange && dd < nd) { nd = dd; nxt = e; }
            }
            if (nxt) {
              g.effects.push({ type: "talon", x1: v.x, y1: v.y - 6, x2: nxt.x, y2: nxt.y - 6, ttl: 420, life: 420 });
              dealDamage(g, nxt, st.dmg * 0.5 * (nxt.flying ? st.airMult : 1), "phys", false, false, t.id);
              if (!nxt.dead) { nxt.markUntil = tms + st.markDur; nxt.markAmp = Math.max(nxt.markAmp, st.mark); }
            }
          }
        }
        sfx.play("falcon");
      } else if (st.arc) {
        // Stormcaller: lightning strikes instantly and arcs down the line
        let cur = target, mult = 1;
        const hitIds = new Set();
        const pts = [[t.x, t.y - 34]];
        for (let j = 0; j < st.arc && cur; j++) {
          dealDamage(g, cur, st.dmg * mult, "magic", false, false, t.id);
          if (st.zapStun && !cur.dead && Math.random() < st.zapStun) cur.stunUntil = tms + (st.zapStunDur || 600);
          hitIds.add(cur.id);
          pts.push([cur.x, cur.y - 6]);
          g.effects.push({ type: "spark", x: cur.x, y: cur.y - 6, ttl: 200, gold: true });
          mult *= st.arcFall ?? 0.7;
          let nxt = null, nd = Infinity;
          for (const e of g.enemies) {
            if (e.dead || hitIds.has(e.id)) continue;
            const dd = Math.hypot(e.x - cur.x, e.y - cur.y);
            if (dd <= (st.arcRange || 90) && dd < nd) { nd = dd; nxt = e; }
          }
          cur = nxt;
        }
        g.effects.push({ type: "bolt", pts, ttl: 220, seed: Math.random() * 10 });
      sfx.play("zap");
      } else {
        // Midas Cannon: count the shots — every Nth flies gilded
        let midas = false;
        if (st.midas) {
          t.midasIdx = ((t.midasIdx || 0) + 1) % st.midas;
          midas = t.midasIdx === 0;
        }
        // the Wizard Spire's orb leaves from the mage's staff at the top of
        // the spire (halls/wizard.js: spire height 18 + 6/level + 4 branched)
        const oy = t.kind === "wizard" ? 30 + 18 + t.level * 6 + (t.branch ? 4 : 0) : 30;
        const ox = t.kind === "wizard" ? (target.x >= t.x ? 7 : -7) : 0;
        g.projectiles.push({
          id: nextId(), x: t.x + ox, y: t.y - oy, targetId: target.id,
          tx: target.x, ty: target.y, speed: 300, delay: 0,
          dmg: st.dmg, dtype: st.dtype, pierce: !!st.pierce, splash: st.splash || 0, splashCap: st.splashCap || 0,
          burn: st.burn || 0, burnDur: st.burnDur || 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
          poolDps: st.poolDps || 0, poolDur: st.poolDur || 0, poolR: st.poolR || 0,
          burnSpreads: !!st.burnSpread, midas,
          kind: "orb", src: t.id,
        });
      }
    }

    // ---- rolling logs ----
    // A log is not a projectile: it never arrives anywhere. It rolls a straight
    // bearing, crushes what it overlaps ONCE each, and dies at the board edge.
    if (g.logs && g.logs.length) {
      for (const lg of g.logs) {
        const step = lg.speed * sdt;
        // down the ramp to the road first, then off along its bearing
        if (lg.via && Math.hypot(lg.via[0] - lg.x, lg.via[1] - lg.y) <= step) { lg.x = lg.via[0]; lg.y = lg.via[1]; lg.via = null; lg.a = lg.bearing; }
        lg.x += Math.cos(lg.a) * step;
        lg.y += Math.sin(lg.a) * step;
        lg.spin += step * 0.09;
        for (const e of g.enemies) {
          if (e.dead || e.flying || lg.hitIds.includes(e.id)) continue;
          // distance from the enemy to the log's axle line, across its width.
          // The log reaches the whole road, all three lanes, however narrow it
          // is drawn: it takes its bearing from the centreline, and a foe in
          // an outer lane must not step round it.
          const dx = e.x - lg.x, dy = e.y - lg.y;
          const along = dx * Math.cos(lg.a) + dy * Math.sin(lg.a);
          const across = Math.abs(-dx * Math.sin(lg.a) + dy * Math.cos(lg.a));
          if (Math.abs(along) > 10 || across > Math.max(lg.w * 0.5, PATH_HALF) + (e.size || 14) * 0.5) continue;
          lg.hitIds.push(e.id);
          // every body it rolls over takes some of its weight: 10% less for
          // the next, never under 40% — the head of a column takes the worst
          dealDamage(g, e, lg.dmg * Math.max(LOG_FLOOR, Math.pow(LOG_FALLOFF, lg.hitIds.length - 1)), "phys", true, false, lg.src);
          g.effects.push({ type: "dust", x: e.x, y: e.y, ttl: 260, r: 16 });
          if (!e.dead) {
            if (lg.stun && !e.immStun) e.stunUntil = Math.max(e.stunUntil, tms + lg.stun);
            if (lg.slow && !e.immSlow) { e.slowUntil = tms + lg.slowDur; e.slowPct = Math.max(e.slowPct, lg.slow); }
            if (lg.burn) { e.burnUntil = tms + lg.burnDur; e.burnDps = lg.burn; e.burnSrc = lg.src; }
          }
        }
        // off the board: the powder keg makes its point on the way out
        if (lg.x < -40 || lg.x > FIELD_W + 40 || lg.y < -40 || lg.y > H + 40) {
          lg.done = true;
          if (lg.blast) {
            const bx = Math.max(0, Math.min(FIELD_W, lg.x)), by = Math.max(0, Math.min(H, lg.y));
            g.effects.push({ type: "boom", x: bx, y: by, ttl: 420, r: lg.blast });
            g.shake = Math.max(g.shake, 6);
            sfx.play("boom");
            for (const e of g.enemies) {
              if (e.dead || Math.hypot(e.x - bx, e.y - by) > lg.blast) continue;
              dealDamage(g, e, lg.blastDmg, "phys", false, false, lg.src);
            }
          }
        }
      }
      g.logs = g.logs.filter((lg) => !lg.done);
    }

    for (const p of g.projectiles) {
      // a single-target shot reserves its damage on its mark the moment it
      // exists, so the next tower to look knows that one is already dead
      if (p.pend === undefined) {
        p.pend = 0;
        if (p.targetId != null && !p.splash && p.kind !== "spike" && p.kind !== "ball") {
          const m = g.enemies.find((e) => e.id === p.targetId && !e.dead);
          if (m) {
            let est = p.dmg || 0;
            if (p.dtype === "phys" && !p.pierce) est *= 1 - Math.min(0.85, m.armor || 0);
            if (p.dtype === "magic") est *= 1 - (m.mres || 0);
            if (m.guard > 0) est = 0;
            p.pend = est; p.markRef = m;
            m.incoming = (m.incoming || 0) + est;
          }
        }
      }
      if (p.delay > 0) { p.delay -= sdt * 1000; continue; }
      // spikes skewer whatever they pass through (no homing, no arrival hit)
      if (p.kind === "spike" || p.kind === "ball") {
        for (const e of g.enemies) {
          if (e.dead || p.hitIds.includes(e.id)) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= (e.size || 14) * 0.7 + 3) {
            dealDamage(g, e, p.dmg, p.dtype, false, false, p.src);
            p.hitIds.push(e.id);
            if (!e.dead && p.slow) { e.slowUntil = tms + p.slowDur; e.slowPct = Math.max(e.slowPct, p.slow); }
            if (--p.hitsLeft <= 0) { p.done = true; break; }
          }
        }
        if (p.done) continue;
      }
      const target = g.enemies.find((e) => e.id === p.targetId && !e.dead);
      if (target) { p.tx = target.x; p.ty = target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * sdt;
      if (d <= stepLen + 4) {
        p.done = true;
        if (p.splash > 0) {
          if (!p.mini) sfx.play(p.kind === "rock" ? "rock" : p.kind === "shell" || p.burn ? "boom" : p.slow ? "frost" : "arcane");
          g.effects.push({ type: p.kind === "rock" ? (p.mini ? "shrapnelhit" : "dust") : p.kind === "shell" || p.burn ? "boom" : p.slow ? "frost" : "arcane", x: p.tx, y: p.ty, ttl: 320, r: p.splash });
          // a mark on the ground that outlives the blast: soot, or a rime of frost
          if (!p.mini) {
            g.effects.push({
              type: "scorch", x: p.tx, y: p.ty, ttl: 2600, life: 2600,
              r: Math.max(12, p.splash * 0.62), frost: !!p.slow && !p.burn, seed: Math.random() * 6,
            });
          }
          // A blast has a BITE: it takes the nearest `cap` bodies and no more
          // (Bloons' pierce). Splash still eats a crowd — but a big enough
          // crowd eats back, which is the whole point of sending one.
          const cap = p.splashCap || SPLASH_CAP;
          const hit = [];
          for (const e of g.enemies) {
            if (e.dead || (p.ground && e.flying)) continue;
            const dd = Math.hypot(e.x - p.tx, e.y - p.ty);
            if (dd <= p.splash) hit.push([dd, e]);
          }
          if (hit.length > cap) { hit.sort((u, v) => u[0] - v[0]); hit.length = cap; }
          for (const [dd, e] of hit) {
            {
              dealDamage(g, e, p.dmg * (1 - 0.55 * (dd / p.splash)), p.dtype, p.pierce, false, p.src);
              if (e.dead) continue;
              if (p.burn) { e.burnUntil = tms + p.burnDur; e.burnDps = p.burn; if (p.burnSpreads) e.burnSpread = true; }
              if (p.slow) { e.slowUntil = tms + p.slowDur; e.slowPct = p.slow; }
            }
          }
          // Volcanic Throne: the blast leaves a pool of living lava
          if (p.poolDps) g.grounds.push({ src: p.src, x: p.tx, y: p.ty, r: p.poolR || 32, dps: p.poolDps, until: tms + (p.poolDur || 3000), kind: "lava" });
          // Grapeshot: the stone bursts into a spray of shrapnel
          if (p.frag) {
            g.effects.push({ type: "shrapnel", x: p.tx, y: p.ty, ttl: 420, life: 420 });
            for (let k = 0; k < 3; k++) {
              const ang = Math.random() * Math.PI * 2;
              const rr = 24 + Math.random() * 26;
              const nx = p.tx + Math.cos(ang) * rr, ny = p.ty + Math.sin(ang) * rr * 0.8;
              g.projectiles.push({
                id: nextId(), x: p.tx, y: p.ty, sx: p.tx, sy: p.ty, targetId: null,
                tx: nx, ty: ny, speed: 190, delay: k * 40,
                dmg: Math.max(1, Math.round(p.dmg * 0.4)), dtype: "phys", pierce: false,
                splash: Math.round(p.splash * 0.55), burn: 0, burnDur: 0, slow: 0, slowDur: 0,
                kind: "rock", mini: true, src: p.src, ground: p.ground, total: Math.hypot(nx - p.tx, ny - p.ty),
              });
            }
          }
        } else if (target) {
          if (p.midas && !target.boss) {
            // turned to gold where it stood: killed outright, worth triple
            target.bounty = target.bounty * 3;
            g.effects.push({ type: "midas", x: p.tx, y: p.ty, ttl: 650, life: 650 });
            sfx.play("midas");
            dealDamage(g, target, target.hp + 99999, "magic", true, false, p.src);
          } else {
            dealDamage(g, target, p.dmg, p.dtype, p.pierce, false, p.src);
          }
          if (p.pierce) g.effects.push({ type: "pierce", x: p.tx, y: p.ty, ttl: 250 });
          // Briar Rangers: each hit stacks poison dps (capped), refreshing duration
          if (p.poison && !target.dead) {
            const cur = target.poisonUntil > tms ? target.poisonDps : 0;
            target.poisonDps = Math.min(p.poisonCap || p.poison, cur + p.poison);
            target.poisonUntil = tms + p.poisonDur;
            target.poisonSrc = p.src;
          }
          // Hawkeye Conclave: the arrow ricochets to one more enemy nearby
          if (p.chain > 0) {
            let next = null, nd = Infinity;
            for (const e of g.enemies) {
              if (e.dead || e.id === p.targetId) continue;
              const dd = Math.hypot(e.x - p.tx, e.y - p.ty);
              if (dd <= p.chainRange && dd < nd) { nd = dd; next = e; }
            }
            if (next) {
              g.projectiles.push({
                id: nextId(), x: p.tx, y: p.ty, targetId: next.id,
                tx: next.x, ty: next.y, speed: 460, delay: 0,
                dmg: Math.max(1, Math.round(p.dmg * 0.6)), dtype: p.dtype, pierce: p.pierce, splash: 0,
                burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow", src: p.src,
                poison: p.poison, poisonDur: p.poisonDur, poisonCap: p.poisonCap,
                chain: p.chain - 1, chainRange: p.chainRange,
              });
            }
          }
        }
      } else {
        p.x += (dx / d) * stepLen;
        p.y += (dy / d) * stepLen;
        p.angle = Math.atan2(dy, dx);
      }
    }
    // landed or lost: hand back what each spent shot had reserved
    for (const p of g.projectiles) if (p.done && p.pend && p.markRef) { p.markRef.incoming -= p.pend; p.pend = 0; }
    g.projectiles = g.projectiles.filter((p) => !p.done);

    if (!g.spawnQueue.length && g.enemies.length === 0 && g.phase === "combat") {
      g.gold += waveBonus(g.wave);
      // the hero learns from every wave the realm lives through, alive or not
      sfx.play("waveClear");
      if (g.run) g.run.goldEarned += waveBonus(g.wave);
      // the Gold Works pay out on every wave held
      for (const t of g.towers) {
        if (t.kind !== "goldworks") continue;
        const st = getStats(t);
        if (!st.income) continue;
        let pay = st.income + (t.mintBonus || 0);
        if (st.hoard) pay = g.lives >= (g.livesAtWaveStart ?? g.lives) ? pay * 2 : 0;
        if (st.compound) t.mintBonus = (t.mintBonus || 0) + st.compound;
        if (pay > 0) {
          g.gold += pay;
          t.paidTotal = (t.paidTotal || 0) + pay;
          if (g.run) g.run.goldEarned += pay;
          g.effects.push({ type: "coin", x: t.x, y: t.y - 26, ttl: 1100, text: `+${pay}g` });
          sfx.play("payout");
        } else if (st.hoard) {
          g.effects.push({ type: "coin", x: t.x, y: t.y - 26, ttl: 1100, text: "the hoard withholds" });
        }
      }
      // the road is swept between waves: whatever never sprang is picked up,
      // and the smiths lay a fresh field for whatever comes next
      if (g.traps && g.traps.length) {
        for (const tr of g.traps) g.effects.push({ type: "dust", x: tr.x, y: tr.y, ttl: 260, r: 10 });
        g.traps = [];
      }
      for (const t of g.towers) if (t.kind === "trapsmith") { t.layCd = 0; t.layIdx = 0; }
      g.effects.push({ type: "coin", x: W / 2, y: 40, ttl: 1200, text: `Wave cleared! +${waveBonus(g.wave)}g`, big: true });
      // High Cathedral: each cleared wave rebuilds one castle HP — and its
      // masons don't stop at the old walls: they raise them, up to 100
      // EVERY cathedral sends its masons — the old code asked whether ANY
      // existed and then laid a single stone, so the second one was decoration
      const masons = g.towers.filter((t) => t.kind === "support" && t.branch === "b" && t.rank4 === "b").length;
      if (masons > 0 && g.lives < 100) {
        const laid = Math.min(masons, 100 - g.lives);
        g.lives += laid;
        g.effects.push({ type: "coin", x: W / 2, y: 64, ttl: 1300, text: `${g.lives > CASTLE_HP ? "The Cathedrals raise the walls" : "The Cathedrals mend the walls"} +${laid}`, big: true });
      }
      // the castle's own masons
      const guild = workTier(g.castle, "masons", g.castleRanks);
      if (guild) {
        const cap = CASTLE_HP + worksBonusHp(g.castle, g.castleRanks);
        const laid = Math.min(guild.mend, Math.max(0, cap - g.lives));
        if (laid > 0) { g.lives += laid; g.effects.push({ type: "coin", x: W / 2, y: 88, ttl: 1300, text: `The masons mend the wall +${laid}`, big: true }); }
      }
      // the campaign is won at wave 15 — once — then the Endless March is open
      if (g.wave === scriptedWaves() && !g.victory) { g.victory = true; g.phase = "won"; sfx.play("won"); }
      else { g.phase = "build"; g.buildUntil = g.time + BUILD_TIME; }
    }
  }

  // rush mode sounds the horn the moment the build phase opens, banking the
  // full early-start bonus; otherwise the horn waits out the 30s timer
  if (!g.paused && g.phase === "build" && g.buildUntil != null && (g.rush || g.time >= g.buildUntil)) {
    startWave(g);
  }

  if (!g.paused) {
    for (const fx of g.effects) fx.ttl -= sdt * 1000;
    g.effects = g.effects.filter((fx) => fx.ttl > 0);
    g.grounds = g.grounds.filter((gr) => gr.until > tms);
    if (g.corpses) g.corpses = g.corpses.filter((c) => c.until > tms);
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30);
  }
}
