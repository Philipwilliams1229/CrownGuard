// ============ MAIN UPDATE STEP ============
// Advances the whole simulation by one frame: spawns, aura effects, enemy
// movement & castle leaks, knight combat, tower firing, projectiles, wave
// clears, the build-phase auto-start horn, and effect/shake decay.
// `dt` is the raw (already clamped) seconds since the last frame.

import { RESPAWN_MS, W, H, MX, MXR, BUILD_TIME, CASTLE_HP, BASE_SPEED, PATH_HALF, LANE_OFF, pickLane } from "../data/constants.js";
import { SANDBOX, INFINITE_GOLD } from "../data/sandbox.js";
import { workTier, worksBonusHp, bowmenSpots, ballistaSpots, ballistaMuzzle, BOW_X, guardSpots, GUARD_X } from "../data/castle.js";
import { MILITIA, heroStats, heroXpFor, HERO_MAX_LEVEL, heroAbilities, HERO_RETINUE, retinueAt, KNIGHT_REGEN, KNIGHT_REST_REGEN } from "../data/bands.js";
import { RIVER_ROUTE, riverRouteAt, seaRoute, seaDepthAt, underBridge, routeSpans, clearOfSpans, stationQ, patrolOf } from "../data/terrain.js";
import { ENEMIES } from "../data/enemies.js";
import { victoryWave, waveBonus } from "../data/waves.js";
import { PTS, posAt, angleAt, lanePos, nearestOnPath, TOTAL_LEN } from "./path.js";
import { nextId } from "./ids.js";
import { getStats, syncUnits, unitSlots, pickTarget, isPrey, pickPrey, orderFilter, archerLayout, isRising } from "./towers.js";
import { dealDamage, releaseEnemy, startWave, pondAt, fieldHero } from "./actions.js";
import { sfx } from "../audio/sfx.js";
import { heroHook, HERO_HOOKS } from "./heroes/index.js";
import { isBuilt, fights } from "./build.js";
// zone IV: landings, the frost shroud (fights = built and not frozen), weather
import { rimeTick, seaborne } from "./rime.js";
import { registerSeaTools } from "./serpent.js";
import { tickWeather, WX, canSee } from "./weather.js";
import { arrowFrom, wallArrowFrom, staffFrom, muzzleFrom, shellFrom, flaskFrom, bandArrowFrom, foeShotFrom, falconCount, falconKind, wheelAt, gloveBirdAt, skiffShotFrom, MUSKET_LIFE } from "./muzzles.js";

// ---- the Falconry's stoops ------------------------------------------------------
// A cast bird reaches its prey STOOP_HIT ms later (following it down) and is
// back on the wheel by STOOP_LIFE; a Storm Falcon's ricochet leg strikes
// RICOCHET_HIT into its RICOCHET_LIFE. birds.js draws the flight to match.
const STOOP_HIT = 230, STOOP_LIFE = 780, RICOCHET_HIT = 190, RICOCHET_LIFE = 420;
// The talons land: damage, the mark, the stun, and a Storm Falcon's
// ricochet into the next victim (itself a strike). A prey that fell before
// the talons arrived gives the blow to whoever stands where it was.
const resolveStrikes = (g, tms) => {
  if (!g.strikes || !g.strikes.length) return;
  const fresh = [];
  for (const s of g.strikes) {
    let v = g.enemies.find((e) => e.id === s.id && !e.dead) || null;
    if (tms < s.at) {
      if (v) { s.fx.x2 = v.x; s.fx.y2 = v.y - 6; }
      fresh.push(s);
      continue;
    }
    if (!v) {
      let bd = 24;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - s.fx.x2, e.y - 6 - s.fx.y2);
        if (d < bd) { bd = d; v = e; }
      }
    }
    if (!v) continue;
    dealDamage(g, v, s.dmg * (v.flying ? s.air : 1), "phys", false, false, s.src);
    if (!v.dead) {
      v.markUntil = tms + s.markDur;
      v.markAmp = Math.max(v.markAmp, s.mark);
      v.markShredAmt = Math.max(v.markShredAmt, s.markShred);
      if (s.diveStun && Math.random() < s.diveStun) v.stunUntil = tms + s.diveStunDur;
    }
    if (s.chain) {
      let nxt = null, nd = Infinity;
      for (const e of g.enemies) {
        if (e.dead || e === v || s.others.includes(e.id)) continue;
        const dd = Math.hypot(e.x - v.x, e.y - v.y);
        if (dd <= s.chain && dd < nd) { nd = dd; nxt = e; }
      }
      if (nxt) {
        const fx = { type: "talon", x1: v.x, y1: v.y - 6, x2: nxt.x, y2: nxt.y - 6, ttl: RICOCHET_LIFE, life: RICOCHET_LIFE, hit: RICOCHET_HIT, kind: s.kind };
        g.effects.push(fx);
        fresh.push({ ...s, at: tms + RICOCHET_HIT, id: nxt.id, fx, dmg: s.dmg * 0.5, markShred: 0, diveStun: 0, chain: 0, others: [] });
      }
    }
  }
  g.strikes = fresh;
};

// ---- the Skyknight's war-eagle -------------------------------------------------
// With the sky clear she strafes the road: a pass is PASS_MS long, a dive
// from HIGH over the prey out to one side (REACH back along her line) to the
// strike point LOW over it and LANCE short of it, where the rider's lance
// goes through at STRIKE_MS (rigs-eagle.js: fight 1's lance point is 20.5
// out and 16.8 down from her position, so it meets the prey's body there), then the climb out the far side; a wheel there
// until her next pass (st.groundRate from the last) brings her back the
// other way. draw.js plays her fight frames off eg.passAt and eg.blowAt.
export const PASS_MS = 720, STRIKE_MS = 300;
const REACH = 58, LANCE = 20, HIGH = 40, LOW = 20;
// where a pass puts her `ms` into it, over an anchor (ax, ay), going `dir`:
// the dive steepest at its top and flat at the bottom, the climb the mirror
export const passPoint = (ax, ay, dir, ms) => {
  if (ms <= STRIKE_MS) {
    const p = Math.max(0, ms) / STRIKE_MS;
    return [ax + dir * (-REACH + (REACH - LANCE) * p), ay - HIGH + (HIGH - LOW) * Math.sin(p * Math.PI / 2)];
  }
  const q = Math.min(1, (ms - STRIKE_MS) / (PASS_MS - STRIKE_MS));
  return [ax + dir * (-LANCE + (REACH + LANCE) * q), ay - LOW - (HIGH - LOW) * (1 - Math.cos(q * Math.PI / 2))];
};
// the foremost foe on foot in the tower's reach, or the one she's after
const groundPrey = (g, t, eg, st) => {
  let prey = eg.gTargetId ? g.enemies.find((e) => e.id === eg.gTargetId && !e.dead && !e.flying && !e.swimming) : null;
  if (prey && Math.hypot(prey.x - t.x, prey.y - t.y) > st.range + 20) prey = null;
  if (!prey) {
    let bd = -1;
    for (const e of g.enemies) {
      if (e.dead || e.flying || e.swimming || e.dist <= bd) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
      bd = e.dist; prey = e;
    }
    eg.gTargetId = prey ? prey.id : null;
  }
  return prey;
};
// Returns false when there is nothing on the road to strafe (she wheels home).
// Nothing on foot can reach her up there; the first flier in reach calls her
// back to the duel above (the caller drops the pass).
const strafe = (g, t, eg, st, tms, sdt) => {
  const prey = groundPrey(g, t, eg, st);
  eg.atkCd -= sdt * 1000;
  if (eg.passAt != null) {
    const ms = tms - eg.passAt;
    // the pass rides over its prey as the prey walks; a prey that dies
    // leaves the pass flying on over where it fell
    const it = g.enemies.find((e) => e.id === eg.passPrey && !e.dead);
    if (it) { eg.passX = it.x; eg.passY = it.y; }
    const [px, py] = passPoint(eg.passX, eg.passY, eg.passDir, ms);
    const dx = px - eg.x, dy = py - eg.y, d = Math.hypot(dx, dy), v = 420 * sdt;
    if (d > 0.01) { eg.x += (dx / d) * Math.min(v, d); eg.y += (dy / d) * Math.min(v, d); }
    if (!eg.struck && ms >= STRIKE_MS) {
      // the lance goes through whoever is under it at the bottom of the dive
      eg.struck = true;
      const lx = eg.x + eg.passDir * 20.5, ly = eg.y + 16.8;
      let v2 = it && Math.hypot(it.x - lx, it.y - ly) < 30 ? it : null;
      if (!v2) {
        let bd = 20;
        for (const e of g.enemies) {
          if (e.dead || e.flying || e.swimming) continue;
          const dd = Math.hypot(e.x - lx, e.y - ly);
          if (dd < bd) { bd = dd; v2 = e; }
        }
      }
      if (v2) {
        dealDamage(g, v2, st.groundDmg, "phys", false, false, t.id);
        g.effects.push({ type: "spark", x: v2.x, y: v2.y - 8, ttl: 220, gold: true });
        sfx.play("falcon");
        if (v2.dead && v2.id === eg.gTargetId) eg.gTargetId = null;
      }
    }
    if (ms < PASS_MS) return true;
    eg.passAt = null;
  }
  if (!prey) return false;
  // out to the side she's on, up at the height a pass starts from; the next
  // pass as soon as she is there and the last one's beat is spent
  const dir = eg.x <= prey.x ? 1 : -1;
  const [sx, sy] = passPoint(prey.x, prey.y, dir, 0);
  const wy = sy + Math.sin(tms / 260 + t.id) * 2.5;
  const dx = sx - eg.x, dy = wy - eg.y, d = Math.hypot(dx, dy), v = 170 * sdt;
  if (d > 0.01) { eg.x += (dx / d) * Math.min(v, d); eg.y += (dy / d) * Math.min(v, d); }
  // turning back for the next pass: face the prey across the gap
  if (d < 20) eg.vx = dir;
  if (d < 12 && eg.atkCd <= 0) {
    eg.atkCd = st.groundRate;
    eg.passAt = tms; eg.passDir = dir; eg.passPrey = prey.id; eg.passX = prey.x; eg.passY = prey.y; eg.struck = false;
  }
  return true;
};
// Every gryphon knight in reach of her turns on her: hovering at her side
// (movement eases it there off its lane, e.airOx/airOy) and striking on its
// own clock. The one she holds fights back the same way. Returns true if
// they bring her down. Where one hangs: its anchor AIR_SIDE out to her side
// and AIR_DROP below hers, so its lance point (rigs-ironmounts.js fight 2, 31
// out and 29 up) lands on her rider; more on the same side stack above and
// below it (AIR_STACK). enemies.js stands a gryphon's feet ~4.5 under e.y,
// draw.js her anchor 10 under eg.y.
const AIR_SIDE = 30, AIR_DROP = 9, AIR_PULL = 46;
const AIR_STACK = [[0, 0], [4, -16], [4, 16], [8, -30], [8, 30]];
const gangOnEagle = (g, eg, tms, sdt) => {
  const ey = eg.y + 12;                       // her body, on the foes' footing
  const onSide = { 1: 0, "-1": 0 };
  for (const e of g.enemies) {
    if (e.dead || !e.airAtk || e.airFight) continue;
    if (e.stunUntil > tms && !e.immStun) continue;
    const lx = e.x - e.airOx, ly = e.y - e.airOy;
    if (Math.hypot(e.x - eg.x, e.y - ey) > e.airReach) continue;
    const fresh = tms - (e.airFightAt || -1e9) > 400;
    // it keeps the side of her it came in on
    if (fresh || !e.airSide) e.airSide = lx >= eg.x ? 1 : -1;
    e.airFight = eg.id;
    // the one in her talons stays put (she sits on it); the rest take a
    // slot at her side, at most AIR_PULL off their lanes
    if (e.blockedBy === eg.id) { e.airTx = 0; e.airTy = 0; e.face = eg.x >= e.x ? 1 : -1; }
    else {
      const [sx, sy] = AIR_STACK[Math.min(AIR_STACK.length - 1, onSide[e.airSide]++)];
      let ox = eg.x + e.airSide * (AIR_SIDE + sx) - lx, oy = eg.y + 10 + AIR_DROP + sy - 4.5 - ly;
      const ol = Math.hypot(ox, oy);
      if (ol > AIR_PULL) { ox *= AIR_PULL / ol; oy *= AIR_PULL / ol; }
      e.airTx = ox; e.airTy = oy;
      e.face = -e.airSide;
    }
    // a fresh attacker winds up before its first blow
    if (fresh && e.meleeCd <= 0) e.meleeCd = e.atkRate * 0.45;
    e.airFightAt = tms;
    e.meleeCd -= sdt * 1000;
    if (e.meleeCd <= 0) {
      e.meleeCd = e.atkRate;
      e.atkAnim = 200;
      eg.hp -= e.airAtk;
      g.effects.push({ type: "hit", x: eg.x, y: eg.y + 2, ttl: 200 });
      sfx.play("hit");
      if (eg.hp <= 0) return true;
    }
  }
  return false;
};
// she falls: whatever she held goes free, and the roost raises another
const eagleFalls = (g, eg, st) => {
  releaseEnemy(g, g.enemies.find((x) => x.blockedBy === eg.id));
  eg.targetId = null; eg.passAt = null;
  eg.respawn = st.eagleRespawn;
  g.effects.push({ type: "poof", x: eg.x, y: eg.y, ttl: 450 });
  sfx.play("falcon");
};
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

// A River Watch's water and boats. Moored in a pond or mere, its skiffs row a
// ring round the open water; moored off a coast they patrol the shore;
// otherwise they work the river it is moored in. The boats take the water as
// soon as the hall is built (in the build phase too, so a player who taps a
// new watch sees its skiffs and their reach at once), each at her station
// clear of the bridges. Returns the route, or null (no water, no watch).
const launchSkiffs = (g, t, st) => {
  if (t._pond === undefined) t._pond = pondAt(t.x, t.y) || null;
  if (t._sea === undefined) t._sea = !t._pond && seaDepthAt(t.x, t.y) > 0;
  // a river or the coast is rowed only PATROL_LEN of it (terrain.js patrolOf)
  if (!t._pond && !t._sea && t._river === undefined) t._river = patrolOf(riverRouteAt(t.x, t.y), t.x, t.y);
  if (t._sea && t._seaRt === undefined) t._seaRt = patrolOf(seaRoute(), t.x, t.y);
  const rt = t._pond ? pondRoute(t._pond) : t._sea ? t._seaRt : t._river;
  if (!rt) return null;
  const n = st.count || 1;
  if (!t.units) t.units = [];
  while (t.units.length < n) {
    const sd = stationQ(rt, t.units.length, n);
    const [x, y] = rt.at(sd);
    t.units.push({ id: nextId(), hp: st.hp, maxHp: st.hp, sd, x, y, face: 1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null });
  }
  if (t.units.length > n) t.units.length = n;
  return rt;
};

// road points every 7px, for the trapsmith's bench (rebuilt when the road changes)
let ROAD7 = null;

// When a wave is cleared the bones left on the road dissolve (render/remains.js
// thins them out over fadeMs); they are gone from g.corpses once `until` passes.
const CORPSE_DISSOLVE_MS = 1800;
const dissolveCorpses = (g, tms) => {
  if (!g.corpses) return;
  for (const c of g.corpses) if (c.until === Infinity) { c.fadeAt = tms; c.fadeMs = CORPSE_DISSOLVE_MS; c.until = tms + CORPSE_DISSOLVE_MS; }
};

// A rolling log loses weight to every foe it crushes (update.js, logs).
const LOG_FALLOFF = 0.9, LOG_FLOOR = 0.4;

// How many bodies one blast can take (a tower may carry its own splashCap).
const SPLASH_CAP = 16;

// ---- the Powder Works' charge and its shrapnel ----
// A charge comes down ON its mark: a tight blast that hurts that foe alone,
// and then the iron flies — `frags` shards spread evenly round the circle
// (a fresh turn each burst, a little jitter in heading, reach and pace, so
// the burst breaks up rather than flying as a ring), each flying `fragReach` along
// the ground and striking the FIRST foe in its path (never the mark), a
// physical blow of `fragDmg`: a raised shield swallows a shard whole like any
// other blow. First-in-path piles the shards onto the nearest ring of bodies,
// so a burst strips whole shields off the few nearest the mark rather than a
// pip off everyone in a circle (as the old splash did): on a clump of 16
// levies (48 pips) a Grand Battery burst lands ~25 of its 32 shards and takes
// ~11 pips. Shards run the musket ball's own path-hitting code (hitIds /
// hitsLeft, pierceStrike below).
// The burst lies on the ground: its reach is squashed north-south by FRAG_SQ
// to read as a ring seen at 3/4, like the blasts (render/fx.js RY).
const FRAG_SQ = 0.8, FRAG_SPEED = 260;
const inBurst = (o, x, y, r) => {
  const dx = o.x - x, dy = (o.y - y) / FRAG_SQ;
  return dx * dx + dy * dy <= r * r;
};
// a charge's riders on a foe it (or one of its shards) struck: the Bombard
// Yard's crack (brittle, as Permafrost's), and fire
const powderRiders = (e, p, tms, burn) => {
  if (e.dead) return;
  if (burn && p.burn) {
    if (!(e.burnUntil > tms) || e.burnDps <= p.burn) { e.burnDps = p.burn; e.burnSrc = p.src; }
    e.burnUntil = Math.max(e.burnUntil || 0, tms + p.burnDur);
    if (p.burnSpreads) e.burnSpread = true;
  }
  if (p.crack) {
    e.brittleAmp = Math.max(e.brittleUntil > tms ? e.brittleAmp : 0, p.crack);
    e.brittleUntil = Math.max(e.brittleUntil, tms + p.crackDur);
  }
};
const burstCharge = (g, p, target, tms) => {
  // the mark fell before the charge came down: whoever stands on the spot
  // takes it (nobody there, and only the shrapnel does any work)
  let mark = target && !target.flying ? target : null;
  if (!mark) {
    let nd = Infinity;
    for (const e of g.enemies) {
      if (e.dead || e.flying) continue;
      const dd = Math.hypot(e.x - p.tx, e.y - p.ty);
      if (dd <= (e.size || 14) * 0.6 + 4 && dd < nd) { nd = dd; mark = e; }
    }
  }
  sfx.play("boom");
  g.effects.push({ type: "keg", x: p.tx, y: p.ty, ttl: 320, r: 14 });
  g.effects.push({ type: "scorch", x: p.tx, y: p.ty, ttl: 2000, life: 2000, r: 9, seed: Math.random() * 6 });
  if (mark) {
    dealDamage(g, mark, p.dmg, "phys", false, false, p.src);
    powderRiders(mark, p, tms, true);
  }
  const n = p.frags | 0;
  if (n <= 0) return;
  const turn = Math.random() * Math.PI * 2, step = (Math.PI * 2) / n;
  const hot = p.fragBurn;
  for (let i = 0; i < n; i++) {
    const a = turn + i * step + (Math.random() - 0.5) * step * 0.5;
    const reach = p.fragReach * (0.9 + Math.random() * 0.2);
    const ex = Math.cos(a), ey = Math.sin(a) * FRAG_SQ;
    g.projectiles.push({
      id: nextId(), x: p.tx, y: p.ty, sx: p.tx, sy: p.ty, targetId: null, tx: p.tx + ex * reach, ty: p.ty + ey * reach,
      total: Math.hypot(ex, ey) * reach, angle: Math.atan2(ey, ex),
      speed: FRAG_SPEED * (0.75 + Math.random() * 0.5), delay: 0, dmg: p.fragDmg, dtype: "phys", pierce: false, splash: 0,
      burn: hot ? p.burn : 0, burnDur: hot ? p.burnDur : 0, burnSpreads: hot && p.burnSpreads, hot,
      crack: p.crack || 0, crackDur: p.crackDur || 0, slow: 0, slowDur: 0,
      kind: "frag", src: p.src, hitsLeft: 1, hitIds: mark ? [mark.id] : [], ground: true, v: i & 3,
    });
  }
};
// the first foe a shard's step [p, p + step along its heading] passes through
// (a shard is small and quick: a fast game would step it clean over a
// goblin, so it sweeps the whole step rather than testing where it stands).
// Only what lies AHEAD of it, and a body a little narrower than a musket
// ball's mark, so a burst in a packed crowd spreads over it instead of
// emptying into whoever stands against the mark.
const fragVictim = (g, p, step) => {
  const ux = Math.cos(p.angle), uy = Math.sin(p.angle);
  let best = null, bestAlong = Infinity;
  for (const e of g.enemies) {
    if (e.dead || e.flying || p.hitIds.includes(e.id)) continue;
    const r = (e.size || 14) * 0.5 + 2;
    const ex = e.x - p.x, ey = e.y - p.y;
    const along = ex * ux + ey * uy;
    if (along < 0 || along > step + r || along >= bestAlong) continue;
    if (Math.abs(ex * uy - ey * ux) > r) continue;
    best = e; bestAlong = along;
  }
  return best;
};

// a spike, a musket ball or a shard striking one body on its way through
const pierceStrike = (g, p, e, tms) => {
  dealDamage(g, e, p.dmg, p.dtype, false, false, p.src);
  p.hitIds.push(e.id);
  if (!e.dead && p.slow) { e.slowUntil = tms + p.slowDur; e.slowPct = Math.max(e.slowPct, p.slow); }
  // Dragon's Breath's hot shot (and its hot shards) set what they pass through alight
  if (!e.dead && p.burn) {
    if (!(e.burnUntil > tms) || e.burnDps <= p.burn) e.burnSrc = p.src;
    e.burnDps = Math.max(e.burnUntil > tms ? e.burnDps : 0, p.burn);
    e.burnUntil = Math.max(e.burnUntil, tms + p.burnDur);
    if (p.burnSpreads) e.burnSpread = true;
  }
  // the Bombard Yard's shards crack what they strike, for the musket to pick
  if (!e.dead && p.crack) powderRiders(e, p, tms, false);
  if (--p.hitsLeft <= 0) p.done = true;
};

// Build a fresh enemy instance of `type` with wave HP multiplier `mult`.
// Used by the spawn queue and by necromancers raising the dead.
// Dragonbreath: no shots, a held gout of flame. The mage swings it toward
// the foe his standing order picks (a turning speed, so a sweep across the
// road takes a moment) and it scorches everything inside the cone — range
// and half-angle `cone` — every tick, `dmg` per second, the nearest
// SPLASH_CAP bodies and no more. t.breath is what the renderer reads:
// on (0..1, eased so the jet grows and gutters), ang (ground-plane
// radians from the tower's foot), len (its reach).
const BREATH_TURN = 4.2;   // radians a second
const breathe = (g, t, sdt, tms) => {
  const st = getStats(t);
  const b = t.breath || (t.breath = { on: 0, ang: t.lastAim || 0, len: st.range });
  b.len = st.range;
  const tgt = pickTarget(g, t, st);
  if (tgt) {
    const want = Math.atan2(tgt.y - t.y, tgt.x - t.x);
    let d = want - b.ang;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const step = BREATH_TURN * sdt;
    b.ang += Math.abs(d) <= step || b.on < 0.05 ? d : Math.sign(d) * step;
    t.lastAim = b.ang;
  }
  const was = b.on;
  b.on = tgt ? Math.min(1, b.on + sdt * 5) : Math.max(0, b.on - sdt * 3);
  if (was === 0 && b.on > 0) sfx.play("firenova");
  t.anim = b.on;
  if (b.on < 0.5) return;
  const cosA = Math.cos(b.ang), sinA = Math.sin(b.ang), cone = st.cone || 0.42;
  const hit = [];
  for (const e of g.enemies) {
    if (e.dead) continue;
    const dx = e.x - t.x, dy = e.y - t.y, dd = Math.hypot(dx, dy);
    if (dd > st.range + (e.size || 14) * 0.4) continue;
    // inside the cone, with a little grace for a big body at the edge
    const along = dx * cosA + dy * sinA, across = Math.abs(-dx * sinA + dy * cosA);
    if (along <= 0 || across > along * Math.tan(cone) + (e.size || 14) * 0.4) continue;
    hit.push([dd, e]);
  }
  if (hit.length > SPLASH_CAP) { hit.sort((u, v) => u[0] - v[0]); hit.length = SPLASH_CAP; }
  for (const [, e] of hit) {
    dealDamage(g, e, st.dmg * sdt, "magic", false, true, t.id);
    if (e.dead || !st.burn) continue;
    if (!(e.burnUntil > tms) || e.burnDps <= st.burn) { e.burnDps = st.burn; e.burnSrc = t.id; }
    e.burnUntil = Math.max(e.burnUntil || 0, tms + st.burnDur);
  }
};

const makeEnemy = (type, mult) => {
  const d = ENEMIES[type];
  // some foes field a mixed party: each spawn draws one look (and its pace)
  const v = d.variants ? d.variants[Math.floor(Math.random() * d.variants.length)] : null;
  return {
    id: nextId(), type, sprite: v ? v.sprite : null,
    hp: d.hp * mult, maxHp: d.hp * mult, mult, dist: 0,
    speed: d.speed * (v?.speedMul || 1) * (SANDBOX ? SANDBOX.speedMul : 1), armor: d.armor, mres: d.mres || 0, regen: d.regen || 0,
    // A foe's purse used to be fixed while its health inflated forever, so by
    // the eightieth wave you were paid a wave-one wage to kill a wave-eighty
    // troll. The purse now follows the meat, at a quarter of its rate.
    // ...but only up to three times its wage: deep in the Endless March the
    // meat inflates a hundredfold, and a purse that followed it bought out
    // the board by wave ninety and then piled up with nothing left to buy.
    bounty: Math.max(SANDBOX && SANDBOX.bountyMul === 0 ? 0 : 1, Math.round(d.bounty * Math.min(3, 1 + Math.max(0, mult - 1) * 0.08) * (SANDBOX ? SANDBOX.bountyMul : 1))),
    boss: !!d.boss, size: d.size, atk: d.atk, atkRate: d.atkRate, castleDmg: d.castleDmg || 1,
    lane: pickLane(d.boss || !!d.roadBlock),
    // Iron Kingdom traits: shields, discipline, charges, volleys, wards, banners
    flying: !!d.flying, haunts: !!d.haunts, holyOnly: !!d.holyOnly, raisesOnKill: !!d.raisesOnKill, swarms: d.swarms || 0, guard: d.guard || 0, guardFlash: 0,
    roadBlock: d.roadBlock || 0, packRange: d.packRange || 0, capDist: Infinity,
    airAtk: d.airAtk || 0, airReach: d.airReach || 0, airFight: null, airOx: 0, airOy: 0,
    immSlow: !!d.immSlow, immStun: !!d.immStun, crush: !!d.crush, mounted: !!d.mounted,
    trampleLeft: d.trample || 0, trampleMax: d.trample || 0, trampleEvery: d.trampleEvery || 0, trampleCd: null,
    rangedAtk: d.rangedAtk || 0, rangedRange: d.rangedRange || 0, rangedRate: d.rangedRate || 0, rangedCd: 0,
    wardEvery: d.wardEvery || 0, wardHits: d.wardHits || 0, wardRange: d.wardRange || 0, wardCd: null, wardFx: d.wardFx || null, wardSelf: d.wardSelf !== false,
    bannerRange: d.bannerRange || 0, bannerSpeedAmt: d.bannerSpeed || 0, bannerArmorAmt: d.bannerArmor || 0,
    bannerSpeed: 0, bannerArmor: 0,
    // Hollow Court traits: bells that summon, bodies that split or burst
    summonEvery: d.summonEvery || 0, summonType: d.summonType || null, summonCount: d.summonCount || 0, summonAhead: !!d.summonAhead, summonAtStart: !!d.summonAtStart, summonCd: d.summonFirst ?? null,
    splitInto: d.splitInto || null, splitDrop: !!d.splitDrop, splitChance: d.splitChance ?? null, splits: undefined, deathBurst: d.deathBurst || null, deathDone: false,
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
    healPct: d.healPct || 0, healCap: (d.healCap || 0) * Math.sqrt(mult), healRange: d.healRange || 0,
    raiseEvery: d.raiseEvery || 0, raiseCd: null, revived: false, healedFlash: 0,
    // zone IV's frost shroud (engine/rime.js): ice a hall every freezeEvery ms
    freezeEvery: d.freezeEvery || 0, freezeRange: d.freezeRange || 0, freezeFor: d.freezeFor || 0, freezeFirst: d.freezeFirst ?? null, freezeCd: null,
    // the Rime Clans are cold-hardy (the Frost Altar's chill, nova freeze and
    // cold do nothing), and their sea monsters move by engine/serpent.js
    frostProof: !!d.frostProof, sea: d.sea || null,
  };
};

// Drop a fresh enemy onto the road at distance `dist`, already walking.
// Shared by gravecaller bells and amalgams coming apart (and the sandbox's
// spawner, engine/sandboxTools.js).
export const spawnAt = (g, type, mult, dist, tms) => {
  const u = makeEnemy(type, mult);
  u.dist = Math.max(0, dist);
  u.lane = pickLane(u.boss || !!u.roadBlock);
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
  for (const t of g.towers) if (t.units && isBuilt(t, g)) out.push(t);   // (a hall still going up keeps its people back)
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
// zone IV's sea monsters and frost giants hurt soldiers from engine/serpent.js
registerSeaTools({ killUnit, spawnAt, unitHosts, dealDamage });

// A wraith's victim does not stay down: where the knight fell, a new wraith
// rises out of the body (at the killer's strength, paying half). Capped, so a
// wave of them cannot turn a garrison into an endless brood.
const BROOD_CAP = 24, RISE_MS = 1300;
// the necromancer's dead rise slower than a wraith does (owner, 2026-09-30)
const NECRO_RISE_MS = 2200;
const raiseFrom = (g, killer, u, tms) => {
  if (g.enemies.reduce((n, x) => n + (!x.dead && x.type === killer.type ? 1 : 0), 0) >= BROOD_CAP) return;
  const at = nearestOnPath(u.x, u.y);
  const w = spawnAt(g, killer.type, killer.mult, at.dist ?? killer.dist, tms);
  w.bounty = Math.max(1, Math.ceil(w.bounty / 2));
  // it comes up OUT of the body, on the very spot the knight fell: it stays
  // put and rises for RISE_MS (the painter fades and lifts it), then drifts
  // onto the road and joins the march
  w.born = tms - 400;
  w.riseAt = tms; w.riseMs = RISE_MS; w.riseX = u.x; w.riseY = u.y;
  g.effects.push({ type: "raise", x: u.x, y: u.y, ttl: RISE_MS, life: RISE_MS });
  sfx.play("raise");
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
    const ret = HERO_RETINUE[b.hero];
    const joins = ret && ret.at.includes(b.level);
    g.effects.push({ type: "coin", x: u.x, y: u.y - 26, ttl: joins ? 2600 : 1400, text: woke ? `${b.name} — level ${b.level} · ${woke.name} ready!` : joins ? `${b.name} — level ${b.level} · ${ret.joins}` : `${b.name} — level ${b.level}`, big: true });
    sfx.play("ascend");
  }
  if (b.level >= HERO_MAX_LEVEL) b.xp = 0;
};

// how near a foe must come to a ranged hero to stop and fight her
const RANGED_ENGAGE = 22;
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
    // A huntress on the road is not invisible: a foe that walks up to her
    // stops and fights her, as it would a knight (owner, 2026-09-30). She
    // holds one at a time and keeps shooting; the foe's blows are the same
    // as against any soldier. Rams roll over, fliers and swimmers pass.
    if (b.kind === "hero" || b.kind === "retinue") {
      let held = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead && e.blockedBy === u.id) : null;
      if (held && Math.hypot(held.x - u.x, held.y - u.y) > RANGED_ENGAGE + 10) { releaseEnemy(g, held); held = null; }
      if (!held) {
        u.targetId = null;
        let bd2 = RANGED_ENGAGE;
        for (const e of g.enemies) {
          if (e.dead || isRising(e, tms) || (e.flying && !e.haunts) || e.swimming || e.blockedBy || e.crush || e.roadBlock || !(e.atk > 0)) continue;
          const dd = Math.hypot(e.x - u.x, e.y - u.y);
          if (dd < bd2) { bd2 = dd; held = e; }
        }
        if (held) { held.blockedBy = u.id; u.targetId = held.id; }
      }
      if (held) {
        held.engaged = true;
        held.face = u.x >= held.x ? 1 : -1;
        if (held.stunUntil <= tms || held.guard > 0) {
          held.meleeCd -= sdt * 1000;
          if (held.meleeCd <= 0) {
            held.meleeCd = held.atkRate;
            held.atkAnim = 200;
            if (u.shield) {
              u.shield = false; u.shieldCd = 6500;
              g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 });
            } else {
              const hurt = b.kind === "hero" ? heroHook(b.hero)?.hurt : null;
              u.hp -= hurt ? hurt(g, b, u, held.atk, held) : held.atk;
              g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 200 });
              sfx.play("hit");
            }
            if (u.hp <= 0) {
              killUnit(g, b, u);
              if (held.raisesOnKill) raiseFrom(g, held, u, tms);
              return;
            }
          }
        }
      }
    }
    // loosing an Arrow Volley skyward she has no hand for anything else
    if (u.volley) {
      if (u.volley.until > tms) { u.state = "fighting"; return; }
      u.volley = null;
    }
    let best = null, bd = st.range;
    // she shoots whoever is on her first
    const onHer = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead) : null;
    if (onHer) best = onHer;
    else for (const e of g.enemies) {
      if (e.dead || e.submerged) continue;   // (a serpent under the water: serpent.js)
      const dd = Math.hypot(e.x - u.x, e.y - u.y);
      if (dd < bd) { bd = dd; best = e; }
    }
    if (!best) return;
    u.face = best.x >= u.x ? 1 : -1;
    u.state = "fighting";
    if (u.atkCd > 0) return;
    u.atkCd = st.rate;
    u.swing = 160;
    const [bx0, by0] = bandArrowFrom(u, b.kind === "hero");   // from the bow hand
    const own = b.kind === "hero" ? heroHook(b.hero)?.shoot : null;
    if (own) { own(g, b, u, best, tms); return; }
    const shoot = (e) => g.projectiles.push({ id: nextId(), x: bx0, y: by0, targetId: e.id, tx: e.x, ty: e.y, speed: 440, delay: 0, dmg: st.dmg * (1 + (u.atkBuff || 0)), dtype: "phys", pierce: !!st.pierce, splash: 0, burn: 0, burnDur: 0, slow: st.slow || 0, slowDur: st.slowDur || 0, kind: "arrow", src: b.id });
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

// The Masons' barricades (castle works, castle.js masons): after every wave
// they set `spikes` rows of stake frames across the road in front of the Gate
// Guard, one frame to a lane, rebuilt whole each time the build phase opens
// (or the guild is raised). `g.barricades` is a list of rows
// { dist, segs: [{ lane, hp, maxHp }] }, outermost first.
// SPIKE_FIRST keeps the foes held at the first frame (SPIKE_FIRST + SPIKE_HOLD
// back from the guard) out of the halberdiers' seizing reach (range x 0.92,
// 48 at most), so the Gate Guard never walks out to a foe while a frame stands.
// LEAK_BACK: a foe that gets through hits the castle this far short of the
// road's end, just behind the halberdiers, not a step inside the gate.
const LEAK_BACK = 20;
const SPIKE_FIRST = 66, SPIKE_ROW = 34, SPIKE_HOLD = 7, SPIKE_LANES = [-LANE_OFF, 0, LANE_OFF];
const syncBarricades = (g) => {
  const tier = g.castle && PTS.length ? workTier(g.castle, "masons", g.castleRanks) : null;
  const key = tier ? `${tier.spikes}:${tier.spikeHp}` : "";
  if (g.phase === "build" && (g._spikePhase !== "build" || g._spikeKey !== key)) {
    g.barricades = [];
    if (tier && tier.spikes) {
      const [gx, gy] = PTS[PTS.length - 1];
      const gd = nearestOnPath(GUARD_X, gy).dist ?? TOTAL_LEN - 16;
      for (let r = tier.spikes - 1; r >= 0; r--) {
        const dist = gd - SPIKE_FIRST - r * SPIKE_ROW;
        if (dist < 30) continue;
        g.barricades.push({ dist, segs: SPIKE_LANES.map((lane) => ({ lane, hp: tier.spikeHp, maxHp: tier.spikeHp, thorns: tier.thorns })) });
        const [bx, by] = lanePos(dist, 0);
        g.effects.push({ type: "dust", x: bx, y: by, ttl: 380, r: 22 });
      }
    }
    g._spikeKey = key;
  }
  g._spikePhase = g.phase;
  if (g.barricades && g.barricades.length && g.phase !== "build") {
    g.barricades = g.barricades.filter((row) => row.segs.some((sg) => sg.hp > 0));
  }
};
// a foe on foot meets a barricade: it halts before the frame in its lane and
// hacks at it, pricked by the spikes at each blow. A siege ram rolls through;
// a foe with no blow to strike (atk 0) simply walks on.
const barricadePass = (g, e, stunned, sdt, tms) => {
  if (!(e.atk > 0) && !e.crush) return;
  const k = e.lane < -LANE_OFF / 2 ? 0 : e.lane > LANE_OFF / 2 ? 2 : 1;
  for (const row of g.barricades) {
    const sg = row.segs[k];
    if (sg.hp <= 0 || e.dist > row.dist) continue;
    if (e.dist < row.dist - SPIKE_HOLD) return;      // not there yet, and the rows further in are further still
    if (e.crush) {
      sg.hp = 0;
      const [bx, by] = lanePos(row.dist, sg.lane);
      g.effects.push({ type: "dust", x: bx, y: by, ttl: 420, r: 20 });
      g.shake = Math.max(g.shake, 3);
      sfx.play("hit");
      return;
    }
    e.dist = Math.min(e.dist, row.dist - SPIKE_HOLD);
    e.barred = tms;
    if (stunned) return;
    e.meleeCd -= sdt * 1000;
    if (e.meleeCd <= 0) {
      e.meleeCd = e.atkRate;
      e.atkAnim = 200;
      sg.hp -= e.atk;
      sg.hitAt = tms;
      const [bx, by] = lanePos(row.dist, sg.lane);
      g.effects.push({ type: "hit", x: bx, y: by - 6, ttl: 200 });
      sfx.play("clink");
      if (sg.hp <= 0) g.effects.push({ type: "dust", x: bx, y: by, ttl: 420, r: 16 });
      else dealDamage(g, e, sg.thorns, "phys", false, false, null);
    }
    return;
  }
};

// The Gate Guard (castle works): halberdiers on the road before the gate,
// fielded as a band so they block exactly as a garrison's knights do — one
// foe on foot each, never a flier or a swimmer. Kept in step with the works
// every tick: raised mid-run, the new man walks out; a fallen one comes back
// at his post after respawnMs.
const syncGateGuard = (g) => {
  const tier = g.castle && PTS.length ? workTier(g.castle, "guards", g.castleRanks) : null;
  let b = g.bands?.find((x) => x.kind === "gateguard");
  if (!tier) { if (b) g.bands = g.bands.filter((x) => x !== b); return; }
  if (!g.bands) g.bands = [];
  const gy = PTS[PTS.length - 1][1];
  const st = { count: tier.count, hp: tier.men, dmg: tier.dmg, rate: tier.rate, range: tier.range, unitSpeed: 80, respawnMs: 8000, oil: tier.oil || 0 };
  if (!b) {
    b = { id: nextId(), kind: "gateguard", st, rally: { x: GUARD_X, y: gy }, units: [] };
    g.bands.push(b);
  }
  b.st = st;
  b.rally.x = GUARD_X; b.rally.y = gy;
  b.slots = guardSpots(gy, st.count);
  while (b.units.length < st.count) {
    const [x, y] = b.slots[b.units.length];
    b.units.push({ id: nextId(), hp: st.hp, maxHp: st.hp, x, y, face: -1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null });
  }
  for (const u of b.units) { if (u.maxHp !== st.hp) { u.hp = Math.min(st.hp, u.hp + Math.max(0, st.hp - u.maxHp)); u.maxHp = st.hp; } }
};

// The hero's retinue (bands.js HERO_RETINUE): followers who join at set
// levels, fielded as their own band so they fight with the ordinary band
// code — squires block as knights do, archers shoot from their posts. Their
// rally is the hero's, so they go wherever he is sent; a newcomer steps out
// of the hero's own spot with a flourish.
const RETINUE_SLOTS = { melee: [[-17, 9], [17, 9]], ranged: [[-16, 13], [16, 13]] };
const syncRetinue = (g) => {
  if (!g.bands) return;
  const hero = g.bands.find((x) => x.kind === "hero");
  let b = g.bands.find((x) => x.kind === "retinue");
  const def = hero && HERO_RETINUE[hero.hero];
  const n = def ? retinueAt(hero.hero, hero.level) : 0;
  if (!n) { if (b) g.bands = g.bands.filter((x) => x !== b); return; }
  if (!b || b.heroId !== hero.id) {
    if (b) g.bands = g.bands.filter((x) => x !== b);
    b = { id: nextId(), kind: "retinue", heroId: hero.id, hero: hero.hero, name: def.name, rig: def.rig, st: { ...def.st, count: 0 }, rally: hero.rally, units: [] };
    g.bands.push(b);
  }
  b.rally = hero.rally;
  b.st.count = n;
  b.slots = RETINUE_SLOTS[def.st.ranged ? "ranged" : "melee"].slice(0, n).map(([dx, dy]) => [hero.rally.x + dx, hero.rally.y + dy]);
  while (b.units.length < n) {
    const hu = hero.units[0];
    const x = hu.state !== "dead" ? hu.x : hero.rally.x, y = hu.state !== "dead" ? hu.y : hero.rally.y;
    b.units.push({ id: nextId(), hp: def.st.hp, maxHp: def.st.hp, x, y, face: hu.face || -1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null });
    g.effects.push({ type: "levelup", x, y, ttl: 700 });
    g.effects.push({ type: "dust", x, y: y + 6, ttl: 400 });
  }
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
        // a Knight Hall's men mend on their own (bands.js KNIGHT_REGEN), faster at their post
        if (t.kind === "knight" && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * (u.state === "fighting" ? KNIGHT_REGEN : KNIGHT_REST_REGEN) * sdt);
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
            if (e.dead || isRising(e, tms) || (e.flying && !e.haunts) || e.swimming || e.blockedBy) continue;
            if (e.crush && t.kind === "hero") continue;      // the hero knows better than to stand in front of a ram
            if (Math.hypot(e.x - t.rally.x, e.y - t.rally.y) <= st.range * 0.92 && e.dist > bestDist) { bestDist = e.dist; best = e; }
          }
          if (best) { best.blockedBy = u.id; u.targetId = best.id; u.state = "moving"; target = best; }
        }

        if (target) {
          const dx = target.x - u.x, dy = target.y - u.y;
          const d = Math.hypot(dx, dy);
          if (d > 17) {
            target.engaged = d < 30 && !target.crush;         // a ram never slows for the man walking out to it
            const sp = (st.unitSpeed || 95) * sdt;
            u.x += (dx / d) * sp; u.y += (dy / d) * sp;
            u.face = dx >= 0 ? 1 : -1;
            u.state = "moving";
          } else {
            // Siege Ram: no man holds six wheels of oak and iron. Whoever
            // steps in front of it is crushed, and it rolls on without a pause.
            if (target.crush) {
              u.hp = 0;
              g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 260 });
              g.effects.push({ type: "dust", x: u.x, y: u.y + 6, ttl: 420, r: 14 });
              g.shake = Math.max(g.shake, 4);
              sfx.play("hit");
              killUnit(g, t, u);
              return;
            }
            target.engaged = true;
            // Cavalier: the charge rides its first blocker down and gallops on.
            // Whoever steps up second is the one who actually holds him.
            if (target.trampleLeft > 0 && !WX.noCharge) {   // (a storm's mud bogs the charge down, weather.js)
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
              // a holy knight's blade is still steel: while a shield stands
              // his blow breaks a pip like any other (only magic from afar
              // glances off) — else a Paladin who stuns and heals could hold a
              // shielded levy forever and the wave would never end
              const holy = st.magic && !(target.guard > 0);
              const hpBefore = target.hp;
              dealDamage(g, target, dealt, holy ? "magic" : "phys", st.magic, false, t.id, !!st.magic);
              const done = Math.max(0, hpBefore - target.hp);   // what the blow actually took off
              sfx.play("clink");
              if (st.frenzy) u.frenzy = (u.frenzy || 0) + 1;
              // lifesteal feeds on the damage actually done — none dealt (a wraith, a
              // standing shield, armour that turns it), none healed
              if (st.lifesteal && done > 0 && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + done * st.lifesteal); u.healGlow = 200; }
              g.effects.push({ type: "spark", x: target.x, y: target.y - 6, ttl: 160, gold: !!st.magic || u.atkBuff > 0 });
              if (st.stun && Math.random() < st.stun) target.stunUntil = tms + st.stunDur;
              if (t.kind === "hero") heroHook(t.hero)?.strike?.(g, t, u, target, dealt, tms);
              if (target.dead) { u.targetId = null; u.state = "rally"; }
            }
            if (!target.dead && (target.stunUntil <= tms || target.guard > 0) && target.atk > 0) {
              target.meleeCd -= sdt * 1000;
              if (target.meleeCd <= 0) {
                target.meleeCd = target.atkRate;
                target.atkAnim = 200;
                if (u.shield) {
                  // Guardian's Grace: the ward swallows the blow whole
                  u.shield = false; u.shieldCd = 6500;
                  g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 });
                } else {
                  const hurt = t.kind === "hero" ? heroHook(t.hero)?.hurt : null;
                  u.hp -= hurt ? hurt(g, t, u, target.atk, target) : target.atk;
                  g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 200 });
                  sfx.play("hit");
                }
                if (u.hp <= 0) {
                  killUnit(g, t, u);
                  if (target.raisesOnKill) raiseFrom(g, target, u, tms);
                }
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
  // time keeps its pace while a menu is open (the old tactical half-speed is gone)
  const speed = g.speed * BASE_SPEED;
  const sdt = g.paused ? 0 : dt * speed;
  g.time += sdt;
  // the sandbox's bottomless coffers: whatever was spent is back by the next frame
  if (SANDBOX?.infiniteGold) g.gold = INFINITE_GOLD;
  const tms = g.time * 1000;
  // zone IV (rime.js, weather.js): the weather's clock and its live multipliers
  // (WX), longships at sea and the frost shroud. Inert on every realm without
  // `weather` / `landings` and every army without a freezer.
  tickWeather(g, sdt, tms);
  if (!g.paused) rimeTick(g, sdt, tms);
  // who owns which id this frame — the damage ledger resolves through this
  g._towerById = new Map(g.towers.map((t) => [t.id, t]));
  if (g.bands) for (const b of g.bands) g._towerById.set(b.id, b);
  if (g.phase === "combat" && !g.paused) for (const t of g.towers) {
    t.liveTime = (t.liveTime || 0) + sdt;
    // the menu's dps clock: only the seconds a built tower has a foe in its
    // reach (around its rally flag for halls that fight there) count, and
    // it starts over with every upgrade (formDmg / formTime, actions.js)
    if ((t.readyAt || 0) > g.time || !g.enemies.length) continue;
    const r = getStats(t).range;
    if (!r) continue;
    const c = (t.kind === "knight" || t.kind === "assassin") && t.rally ? t.rally : t;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const rr = r + (e.size || 14) * 0.4;
      const dx = e.x - c.x, dy = e.y - c.y;
      if (dx * dx + dy * dy <= rr * rr) { t.formTime = (t.formTime || 0) + sdt; break; }
    }
  }
  if (!g.grounds) g.grounds = []; // lingering ground effects (lava pools)
  if (!g.traps) g.traps = [];     // the trapsmith's armed road

  // The trapsmith's bench runs in the quiet of the build phase as much as in
  // battle: charges accumulate whether or not anyone watches, and the smith
  // walks his stretch of road and arms it himself — one charge at a beat,
  // always into the widest uncovered gap in his reach.
  if (!g.paused && (g.phase === "combat" || g.phase === "build")) {
    // ---- the River Watch's boats are on the water from the moment it's built ----
    for (const t of g.towers) if (t.kind === "riverwatch" && isBuilt(t, g)) launchSkiffs(g, t, getStats(t));
    // ---- the bands: militia, the hero, and the Gate Guard ----
    syncGateGuard(g);
    syncBarricades(g);
    // a garrison walks to its flag in the quiet of the build phase too, so a
    // new hall's knights (or a re-posted flag) take their ground before the horn
    // (in battle the combat pass below runs them)
    if (g.phase === "build") for (const t of g.towers) {
      if (t.kind !== "knight" || !isBuilt(t, g)) continue;
      syncUnits(t, g);
      runMelee(g, t, getStats(t), unitSlots(t), sdt, tms);
    }
    syncRetinue(g);
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
        if (b.kind === "hero" && b.leaving) {
          // he runs into the castle; when he is through the gate the new hero walks out of it
          const u = b.units[0], sw = g.heroSwap, [gx, gy] = PTS[PTS.length - 1];
          const dx = gx - u.x, dy = gy - u.y, d = Math.hypot(dx, dy);
          const step = ((b.st?.unitSpeed || 105) * 1.5) * sdt;
          u.face = dx >= 0 ? 1 : -1;
          u.state = "moving";
          u.fade = Math.max(0, Math.min(1, (d - 4) / 26));
          if (d <= step + 3) {
            b.gone = true;
            g.effects.push({ type: "dust", x: gx, y: gy + 6, ttl: 420, r: 20 });
            if (sw) {
              const nb = fieldHero(g, sw.key, 1, gx, gy, sw.talents);
              if (nb) { nb.rally = sw.rally; nb.units[0].emerge = 0; nb.units[0].fade = 0; nb.units[0].face = -1; }
              g.effects.push({ type: "flash", x: gx, y: gy - 6, ttl: 380 });
            }
            g.heroSwap = null;
          } else { u.x += (dx / d) * step; u.y += (dy / d) * step; }
          continue;
        }
        if (b.kind === "hero") {
          b.st = heroStats(b.hero, b.level, b.talents);
          const u = b.units[0];
          u.maxHp = b.st.hp;
          // a hero just out of the gate solidifies as he steps into the light
          if (u.emerge !== undefined) { u.emerge += sdt; u.fade = Math.min(1, u.emerge / 0.7); if (u.fade >= 1) { delete u.emerge; delete u.fade; } }
          levelHero(g, b);
          // passive regeneration (bands.js HERO_REGEN): a share of max health a second, faster at rest
          if (u.state !== "dead" && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * (u.state === "fighting" ? b.st.regen : b.st.restRegen) * sdt);
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
          // the newer heroes' own doings (engine/heroes/<key>.js); true skips the fighting
          const tick = heroHook(b.hero)?.tick;
          if (tick && u.state !== "dead" && tick(g, b, u, sdt, tms)) continue;
        }
        const st = b.st;
        const n = st.count || 1;
        const base = [[0, -8], [-12, 6], [12, 6]];
        const slots = b.slots || base.slice(0, n).map(([dx, dy]) => [b.rally.x + dx, b.rally.y + dy]);
        if (st.bows) {
          // a mixed band (the Levy's upper tiers): the swordsmen hold the road
          // as any garrison does, the archers loose from the rear. Each half is
          // run as a band of its own over the same unit objects
          const bowAt = (u) => !!u.bow;
          const half = (keep) => ({ ...b, units: b.units.filter((u) => bowAt(u) === keep) });
          const slotsOf = (keep) => slots.filter((_, i) => bowAt(b.units[i]) === keep);
          runMelee(g, half(false), st, slotsOf(false), sdt, tms);
          runRangedBand(g, half(true), { ...st, hp: st.bow.men, dmg: st.bow.dmg, rate: st.bow.rate, range: st.bow.range, ranged: true }, slotsOf(true), sdt, tms);
        } else if (st.ranged) runRangedBand(g, b, st, slots, sdt, tms);
        else runMelee(g, b, st, slots, sdt, tms);
        // at their posts the halberdiers face the road, not the gate behind them
        if (b.kind === "gateguard") for (const u of b.units) if (u.state === "rally") u.face = -1;
        // the oil comes down the murder holes on whatever the halberdiers hold
        if (b.kind === "gateguard" && st.oil) for (const u of b.units) {
          if (u.state !== "fighting") continue;
          const e = g.enemies.find((x) => x.id === u.targetId && !x.dead);
          if (!e) continue;
          dealDamage(g, e, st.oil * sdt, "magic", true, true, b.id);
          if (Math.random() < sdt * 6) g.effects.push({ type: "hit", x: e.x + (Math.random() - 0.5) * 8, y: e.y - 6, ttl: 200 });
        }
      }
      g.bands = g.bands.filter((b) => !b.gone);
    }
    // the newer heroes' lingering effects (engine/heroes/<key>.js)
    for (const k in HERO_HOOKS) HERO_HOOKS[k].world?.(g, sdt, tms);
    // Arrow Volley: Wren looses `beats` flights skyward, `gap` apart after
    // her `lead`; each comes down `flight` later and strikes everything in
    // its ring once — fliers too. (The arrows linger, stuck in the ground,
    // until `until`; draw.js.)
    if (g.volleys && g.volleys.length) {
      for (const v of g.volleys) {
        while (v.loosed < v.beats && v.t0 + v.lead + v.loosed * v.gap <= tms) { v.loosed++; sfx.play("arrow"); }
        while (v.landed < v.beats && v.t0 + v.lead + v.landed * v.gap + v.flight <= tms) {
          v.landed++;
          for (const e of g.enemies) {
            if (e.dead || e.swimming || Math.hypot(e.x - v.x, e.y - v.y) > v.r) continue;
            dealDamage(g, e, v.dmg, "phys", false, false, v.src);
            if (Math.random() < 0.5) g.effects.push({ type: "hit", x: e.x, y: e.y - 6, ttl: 200 });
          }
        }
      }
      g.volleys = g.volleys.filter((v) => v.until > tms);
    }

    // (a hall still going up holds its fire, its aura and its people until
    // its person is in: isBuilt, engine/build.js)
    for (const t of g.towers) {
      if (t.kind !== "trapsmith" || !fights(t, g)) continue;
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
        // every lane of the road, not just its crown: a trap springs on what
        // walks within 15 of it, and the outer lanes run LANE_OFF either side.
        // The smith takes the lanes in turn (middle, one side, the other), so
        // each is stocked alike; if his lane has no room, any lane will do.
        const LANES = [0, -LANE_OFF, LANE_OFF];
        const want = LANES[(t.laneIdx || 0) % 3];
        const layIn = (lanes) => { for (const [rx, ry, pa] of ROAD7) {
          if ((rx - t.x) * (rx - t.x) + (ry - t.y) * (ry - t.y) > r2) continue;
          const nx = Math.cos(pa + Math.PI / 2), ny = Math.sin(pa + Math.PI / 2);
          for (const lo of lanes) {
            const px = rx + nx * lo, py = ry + ny * lo;
            let near2 = 3600;
            const cx = (px / 30) | 0, cy = (py / 30) | 0;
            for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
              const list = grid.get((cx + i) * 1000 + cy + j);
              if (list) for (const tr of list) { const dd = (tr.x - px) * (tr.x - px) + (tr.y - py) * (tr.y - py); if (dd < near2) near2 = dd; }
            }
            const spread = Math.sqrt(near2);
            if (spread > bestSpread) { bestSpread = spread; best = [px, py, pa]; }
          }
        } };
        layIn([want]);
        if (!best) layIn(LANES);
        if (best) t.laneIdx = (t.laneIdx || 0) + 1;
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
    // A foe held by someone no longer on the field — a band that stood down
    // (the retinue, the gate guard), a trimmed garrison — walks on. A stale
    // hold never lets go by itself, and the wave could never end (it stalled
    // the Citadel in the sims).
    if (g.enemies.some((e) => e.blockedBy)) {
      const holders = new Set();
      for (const t of g.towers) {
        if (t.units) for (const u of t.units) if (u.state !== "dead") holders.add(u.id);
        if (t.eagle) holders.add(t.eagle.id);
      }
      for (const b of g.bands || []) for (const u of b.units) if (u.state !== "dead") holders.add(u.id);
      for (const e of g.enemies) if (e.blockedBy && !holders.has(e.blockedBy)) { e.blockedBy = null; e.engaged = false; }
    }
    g.spawnTimer += sdt * 1000;
    const justSpawned = new Set();
    while (g.spawnQueue.length && g.spawnQueue[0].at <= g.spawnTimer) {
      const s = g.spawnQueue.shift();
      // a `single` foe (the siege ram) waits its turn: while one of its kind
      // is still on the road, the next is put back a beat and tried again
      if (ENEMIES[s.type]?.single && (g.enemies.some((x) => !x.dead && x.type === s.type) || justSpawned.has(s.type))) {
        const q = { ...s, at: g.spawnTimer + 500 };
        let k = 0; while (k < g.spawnQueue.length && g.spawnQueue[k].at <= q.at) k++;
        g.spawnQueue.splice(k, 0, q);
        continue;
      }
      const e = makeEnemy(s.type, s.mult);
      if (ENEMIES[s.type]?.single) justSpawned.add(s.type);
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
      // a longship putting out from the sea edge, or a raider it landed (rime.js)
      if (s.ship || s.landAt != null) seaborne(g, e, s, tms);
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
      if (t.kind !== "support" || !fights(t, g)) continue;
      const st = getStats(t);
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range && !e.frostProof) {   // (cold-hardy Rime foes feel no chill: enemies.js frostProof)
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
            if (!e.dead && !e.frostProof) {   // (the blast lands; the freeze doesn't, on a cold-hardy foe)
              e.stunUntil = Math.max(e.stunUntil, tms + st.novaFreeze);
              // a freeze holds like a stun but LOOKS like ice (fx.js drawStatus)
              e.frozenUntil = Math.max(e.frozenUntil || 0, tms + st.novaFreeze);
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
    // the newer heroes' auras on their soldiers (engine/heroes/<key>.js buffs),
    // laid after the Support halls have cleared and set atkBuff
    for (const k in HERO_HOOKS) HERO_HOOKS[k].buffs?.(g, sdt, tms);
    // Lead to Gold: the transmuter's aura eats armor off everything inside it
    for (const t of g.towers) {
      if (t.kind !== "goldworks" || t.branch !== "b" || !fights(t, g)) continue;
      const st = getStats(t);
      if (!st.shredAura) continue;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= st.auraRange) e.shredAura = Math.max(e.shredAura, st.shredAura);
      }
    }
    // Kingsight: the court's eye rests on the mightiest foe alive, always
    for (const t of g.towers) {
      if (t.kind !== "falconry" || !t.branch || !(t.branch + (t.rank4 || "") === "ba") || !isBuilt(t, g)) continue;
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
    // The Skyknight: one rider, one war-eagle, one enemy of the air at a time.
    // Gryphon knights answer her in kind: every one in reach breaks off to
    // lance her (e.airFight holds it in the air at her side, movement below)
    // and a flight of them can gang up on one bird.
    for (const e of g.enemies) e.airFight = null;
    for (const t of g.towers) {
      if (t.kind !== "falconry" || !fights(t, g)) continue;
      const st = getStats(t);
      if (!st.skyknight) continue;
      if (!t.eagle) t.eagle = { id: nextId(), hp: st.eagleHp, maxHp: st.eagleHp, x: t.x, y: t.y - 44, targetId: null, atkCd: 0, respawn: 0, hurtCd: 0 };
      const eg = t.eagle;
      eg.maxHp = st.eagleHp;
      if (eg.respawn > 0) {
        eg.respawn -= sdt * 1000;
        if (eg.respawn <= 0) { eg.hp = eg.maxHp; eg.x = t.x; eg.y = t.y - 44; eg.targetId = null; eg.passAt = null; }
        continue;
      }
      // which way she's flying, for the painter (last tick's travel)
      if (eg.px != null && Math.abs(eg.x - eg.px) > 0.05) eg.vx = eg.x - eg.px;
      eg.px = eg.x;
      // anything that mends knights mends the eagle: it is a unit on the field,
      // not a projectile, and a wounded bird is the whole tower being wounded
      for (const h of g.towers) {
        if (h.kind !== "support" || !isBuilt(h, g)) continue;
        const hs = getStats(h);
        if (!hs.heal || eg.hp >= eg.maxHp) continue;
        if (Math.hypot(h.x - eg.x, h.y - eg.y) > hs.range) continue;
        eg.hp = Math.min(eg.maxHp, eg.hp + hs.heal * sdt);
        eg.healGlow = 220;
      }
      for (const kt of g.towers) {
        if (kt.kind !== "knight" || eg.hp >= eg.maxHp || !isBuilt(kt, g)) continue;
        const ks = getStats(kt);
        if (!ks.heal || !kt.rally) continue;
        if (Math.hypot(kt.rally.x - eg.x, kt.rally.y - eg.y) > ks.range + 20) continue;
        eg.hp = Math.min(eg.maxHp, eg.hp + ks.heal * 0.5 * sdt);
        eg.healGlow = 220;
      }
      eg.healGlow = Math.max(0, (eg.healGlow || 0) - sdt * 1000);
      // the gryphons round her, each on its own clock (meleeCd / atkAnim, so
      // the painter plays its fight): a fresh one winds up before its lance
      if (gangOnEagle(g, eg, tms, sdt)) { eagleFalls(g, eg, st); continue; }
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
      if (target) eg.passAt = null;
      eg.latched = false;
      if (!target && st.groundDmg && strafe(g, t, eg, st, tms, sdt)) continue;
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
        eg.x = target.x; eg.y = target.y - 12; eg.latched = true;
        eg.atkCd -= sdt * 1000;
        if (eg.atkCd <= 0) { eg.atkCd = st.eagleRate; eg.blowAt = tms; dealDamage(g, target, st.eagleDmg, "phys", false, false, t.id); }
        // the held thing fights back: a gryphon with its lance (gangOnEagle),
        // anything else by sheer thrashing
        if (!target.airAtk) {
          eg.hurtCd -= sdt * 1000;
          if (eg.hurtCd <= 0) {
            eg.hurtCd = target.atkRate > 0 ? target.atkRate : 800;
            eg.hp -= target.atk > 0 ? target.atk : (target.boss ? 30 : 9);
            if (eg.hp <= 0) eagleFalls(g, eg, st);
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
    // A siege ram is a wall across all three lanes: nothing behind it gets
    // past while it lives. Each frame, work out how far along the road every
    // foe behind a ram may go (`capDist`). The ram itself sets the limit for
    // whoever stands nearest it in each lane; once a foe is pressed against
    // that limit, the next behind it in its lane queues up a body's length
    // back, so the whole column stacks up in the ram's lee.
    for (const e of g.enemies) e.capDist = Infinity;
    for (const w of g.enemies) {
      if (w.dead || !w.roadBlock) continue;
      const wall = w.dist - w.roadBlock;
      // (flyers sail over it and horses ride round it; and the caps are rebuilt every frame, so the
      // moment the ram dies the whole column is released at its own pace)
      const behind = g.enemies.filter((e) => !e.dead && e !== w && !e.swimming && !e.flying && !e.mounted && e.dist < w.dist);
      behind.sort((p, q) => q.dist - p.dist);
      const front = [wall, wall, wall];
      for (const e of behind) {
        const k = e.lane < -LANE_OFF / 2 ? 0 : e.lane > LANE_OFF / 2 ? 2 : 1;
        const cap = Math.min(front[k], w.dist - w.roadBlock);
        e.capDist = Math.min(e.capDist, cap);
        // pressed against the limit: the next one back queues behind it
        if (e.dist >= cap - 1) front[k] = Math.max(e.dist, cap) - 9;
      }
    }
    for (const e of g.enemies) {
      if (e.dead || e.ship || e.sea) continue;    // (a longship sails by rime.js, a sea monster swims by serpent.js, not the road)
      if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * sdt);
      // Goblin Shaman: a rhythmic chant mends the WHOLE warband
      // Battle Chaplain: the same, but only for those near him, by a share of
      // each one's own health (capped, so a ram is not mended like a levy)
      if ((e.healAmt || e.healPct) && e.silencedUntil <= tms) {
        e.healCd = (e.healCd ?? e.healEvery * 0.6) - sdt * 1000;
        if (e.healCd <= 0) {
          e.healCd = e.healEvery;
          g.effects.push({ type: "healwave", x: e.x, y: e.y, ttl: 550, r: e.healRange || 64 });
          sfx.play("chant");
          for (const e2 of g.enemies) {
            if (e2.dead || e2.hp >= e2.maxHp || e2.noHealUntil > tms) continue;
            if (e.healPct && (e2.healPct || Math.hypot(e2.x - e.x, e2.y - e.y) > e.healRange)) continue;   // never a fellow healer (two chaplains held apart once out-mended a paladin for ever)
            const amt = e.healPct ? Math.min(e.healPct * e2.maxHp, e.healCap || Infinity) : e.healAmt;
            e2.hp = Math.min(e2.maxHp, e2.hp + amt);
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
      // The Aegis Magister casts the same way, wider and slower, and tops
      // every shield around him back up to three, his own among them.
      if (e.wardEvery && e.silencedUntil <= tms) {
        e.wardCd = (e.wardCd ?? e.wardEvery * (e.wardFx === "aegis" ? 0.25 : 0.5)) - sdt * 1000;
        if (e.wardCd <= 0) {
          e.wardCd = e.wardEvery;
          g.effects.push({ type: "wardwave", x: e.x, y: e.y, ttl: e.wardFx === "aegis" ? 800 : 550, r: e.wardRange, kind: e.wardFx || "ward" });
          sfx.play("ward");
          for (const e2 of g.enemies) {
            if (e2.dead || (e2 === e && !e.wardSelf) || Math.hypot(e2.x - e.x, e2.y - e.y) > e.wardRange) continue;
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
          if (e.summonAtStart) {
            // a horn: the party streams out of the wood at the head of the road,
            // each a tenth of a second behind the last, paying half
            const at0 = g.spawnTimer;
            for (let i = 0; i < e.summonCount; i++) g.spawnQueue.push({ type: e.summonType, at: at0 + 200 + i * 110, mult: e.mult, pay: 0.5 });
            g.spawnQueue.sort((p, q) => p.at - q.at);
            g.effects.push({ type: "toll", x: e.x, y: e.y - 12, ttl: 550, r: 52 });
            sfx.play("horn");
          } else {
          for (let i = 0; i < e.summonCount; i++) {
            const u = spawnAt(g, e.summonType, e.mult * 0.8, e.summonAhead ? Math.min(TOTAL_LEN - 6, e.dist + 16 + i * 7) : e.dist - 14 - i * 7, tms);
            u.bounty = Math.max(1, Math.ceil(u.bounty / 2)); // conjured chaff pays half
            g.effects.push({ type: "raise", x: u.x, y: u.y, ttl: 600, life: 600 });
          }
          g.effects.push({ type: "toll", x: e.x, y: e.y, ttl: 550, r: 46 });
          sfx.play("toll");
          }
        }
      }
      // Necromancer: calls nearby fallen back to their feet at half strength (up to 5 every raiseEvery; buffed 2026-09-30: hp 420 -> 700, every 6 s -> 3.8 s, reach 150 -> 400: he walks behind the column, so the fallen lie ahead of him)
      if (e.raiseEvery && e.silencedUntil <= tms) {
        e.raiseCd = (e.raiseCd ?? e.raiseEvery * 0.5) - sdt * 1000;
        if (e.raiseCd <= 0) {
          e.raiseCd = e.raiseEvery;
          let raised = 0;
          for (let ci = g.corpses.length - 1; ci >= 0 && raised < 5; ci--) {
            const c = g.corpses[ci];
            // only this wave's dead, and none already dissolving
            if (c.until !== Infinity || c.wave !== g.wave || Math.hypot(c.x - e.x, c.y - e.y) > 400) continue;
            g.corpses.splice(ci, 1);
            raised++;
            const u = makeEnemy(c.type, 1);
            u.hp = u.maxHp = Math.max(1, Math.round(c.hp0 * 0.5));
            u.dist = c.dist; u.lane = c.lane; u.x = c.x; u.y = c.y;
            u.bounty = Math.ceil(u.bounty / 2);
            u.revived = true;
            if (c.sprite) u.sprite = c.sprite;   // it rises in the look it fell in
            // it climbs out of the ground on the spot, slowly (the wraith's
            // rising, only longer): held there, sunk and faded, then it walks
            u.born = tms - 400;
            u.riseAt = tms; u.riseMs = NECRO_RISE_MS; u.riseX = c.x; u.riseY = c.y;
            g.enemies.push(u);
            g.effects.push({ type: "raise", x: c.x, y: c.y, ttl: NECRO_RISE_MS, life: NECRO_RISE_MS });
            sfx.play("raise");
          }
        }
      }
      if (e.burnUntil > tms) {
        dealDamage(g, e, e.burnDps * sdt, "magic", false, true, e.burnSrc);
        // Wildheart Pyre / Hellburner: flames leap from burning foes to nearby unburned ones
        if (e.burnSpread) {
          for (const e2 of g.enemies) {
            if (e2.dead || e2 === e || e2.burnUntil > tms) continue;
            if (Math.hypot(e2.x - e.x, e2.y - e.y) <= 40) {
              e2.burnUntil = tms + 1300;
              e2.burnDps = e.burnDps * 0.6;
              e2.burnSrc = e.burnSrc;          // the hall that lit it keeps the credit
            }
          }
        }
      }
      if (!e.dead && e.poisonUntil > tms) dealDamage(g, e, e.poisonDps * sdt, "magic", false, true, e.poisonSrc);
      // Lava and burning ground scorch anyone standing in them. Plague
      // ground is the dead's own filth — it only troubles the living knights.
      if (!e.dead) {
        for (const gr of g.grounds) {
          if (gr.kind === "plague" || (gr.kind === "fire" && e.flying)) continue;
          if (gr.until <= tms || Math.hypot(e.x - gr.x, e.y - gr.y) > gr.r) continue;
          if (gr.kind === "caltrops") { e.auraSlow = Math.max(e.auraSlow, gr.slowPct || 0.35); continue; }
          dealDamage(g, e, gr.dps * sdt, "magic", false, true, gr.src);
        }
      }
      if (e.dead) continue;
      e.atkAnim = Math.max(0, e.atkAnim - sdt * 1000);
      // discipline and dead weight: sergeants and rams shrug off the chill and
      // the shock that stop everything else
      // (a standing shield shrugs off every status: stun and slow do nothing to a shielded foe)
      const stunned = e.stunUntil > tms && !e.immStun && !(e.guard > 0);
      // a gryphon at war with a war-eagle hangs in the air to fight her
      const held = (e.blockedBy && e.engaged) || !!e.airFight;
      // ---- the river road ----
      // A swimmer answers to the current, not the highway: it paddles to the
      // crossing, climbs the bank there, and joins the march already past
      // everything you built between the gate and the bridge.
      if (e.swimming) {
        if (!stunned) {
          const slowW = (e.immSlow || e.guard > 0) ? 0 : Math.max(e.slowUntil > tms ? e.slowPct : 0, e.auraSlow || 0);
          e.swimD += e.speed * 0.85 * (1 - slowW) * sdt * e.swimDir;
        }
        const done = e.swimDir > 0 ? e.swimD >= RIVER_ROUTE.exitSwim : e.swimD <= RIVER_ROUTE.exitSwim;
        if (done) {
          e.swimming = false;
          e.dist = RIVER_ROUTE.exitRoad;
          e.lane = pickLane(e.boss || !!e.roadBlock);
          g.effects.push({ type: "dust", x: e.x, y: e.y, ttl: 420, r: 20 });
        } else {
          const [wx, wy] = RIVER_ROUTE.at(e.swimD);
          const [nx] = RIVER_ROUTE.at(e.swimD + e.swimDir * 6);
          e.x = wx; e.y = wy;
          e.face = nx >= wx ? 1 : -1;
          continue;                       // no road position, no leak check
        }
      }
      // Archers hold their ground while any friendly soldier or hero is in
      // reach, shooting from afar; once none is left standing they march on.
      // (`aiming` is last frame's answer; a 14 s budget of standing still per
      // archer keeps a healer's stalemate from holding a wave open for ever)
      const standing = (e.rangedAtk && e.aiming && (e.pauseLeft ??= 14000) > 0) || (e.clawing && (e.clawLeft ??= 22000) > 0);
      if (standing) { if (e.clawing) e.clawLeft -= sdt * 1000; else e.pauseLeft -= sdt * 1000; }
      const rising = e.riseAt !== undefined && tms - e.riseAt < e.riseMs;
      if (!stunned && !held && !standing && !rising) {
        const slow = (e.immSlow || e.guard > 0) ? 0 : Math.max(e.slowUntil > tms ? e.slowPct : 0, e.auraSlow || 0);
        // (WX: weather.js — a squall's foeSpeed / flierSpeed; 1 on a clear day)
        const step = e.speed * (1 + (e.bannerSpeed || 0)) * (1 - slow) * sdt * WX.foeSpeed * (e.flying ? WX.flierSpeed : 1);
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
        // a company marches together: a chaplain keeps the pace of the
        // soldiers around him so he stays inside the column
        let pace = 1;
        if (e.packRange) {
          let n = 0, sum = 0;
          for (const o of g.enemies) {
            if (o.dead || o === e || o.packRange || o.flying || o.boss || o.roadBlock) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) > e.packRange) continue;
            n++; sum += o.speed * (1 + (o.bannerSpeed || 0));
          }
          if (n >= 2) pace = Math.min(1.6, (sum / n) / Math.max(1, e.speed * (1 + (e.bannerSpeed || 0))));
        }
        // never onward past a ram's rear, never backward for it either
        e.dist = Math.min(e.dist + (step * pace) / stretch, Math.max(e.capDist, e.dist));
      }
      if (g.barricades && g.barricades.length && !e.flying && !e.swimming && !rising) barricadePass(g, e, stunned, sdt, tms);
      const [nx, ny, a] = lanePos(e.dist, e.lane);
      // the walk cycle follows the ground actually covered, so no foot slides
      if (e.px != null) e.gait = (e.gait || 0) + Math.hypot(nx - e.px, ny - e.py) / 14;
      e.px = nx; e.py = ny;
      e.x = nx; e.y = ny;
      // a wraith rising from a fallen knight stays over the body until it is up
      if (rising) {
        const k = (tms - e.riseAt) / e.riseMs, s = Math.max(0, (k - 0.6) / 0.4);
        e.x = e.riseX + (nx - e.riseX) * s; e.y = e.riseY + (ny - e.riseY) * s;
      }
      // ...and closes on her side of the sky, off its lane, easing back after
      if (e.airAtk) {
        const k = Math.min(1, sdt * 5);
        e.airOx += ((e.airFight ? e.airTx : 0) - e.airOx) * k;
        e.airOy += ((e.airFight ? e.airTy : 0) - e.airOy) * k;
        e.x += e.airOx; e.y += e.airOy;
      }
      if (!held && Math.abs(Math.cos(a)) > 0.3) e.face = Math.cos(a) >= 0 ? 1 : -1;
      // a gryphon back from an air fight turns to its road again, even where
      // the road runs straight up or down the board
      if (e.airAtk) { if (held) e.airWas = true; else if (e.airWas) { e.airWas = false; e.face = e.walkFace || e.face; } else e.walkFace = e.face; }
      // Crossbowmen: they shoot your knights from outside sword reach and
      // never break stride to do it. Nothing blocks this — only killing them.
      if (e.rangedAtk && !stunned) {
        e.rangedCd -= sdt * 1000;
        {
          let mark = null, markTower = null, bd = e.rangedRange;
          for (const t of unitHosts(g)) {
            for (const u of t.units) {
              if (u.state === "dead") continue;
              const d = Math.hypot(u.x - e.x, u.y - e.y);
              if (d < bd) { bd = d; mark = u; markTower = t; }
            }
          }
          e.aiming = !!mark;
          if (mark && e.rangedCd <= 0) {
            e.rangedCd = e.rangedRate;
            e.atkAnim = 220;
            e.face = mark.x >= e.x ? 1 : -1;
            const [qx, qy] = foeShotFrom(e);   // from the crossbow's nose / the bow hand
            g.effects.push({ type: "bolt", x: qx, y: qy, tx: mark.x, ty: mark.y - 8, ttl: 170, arrow: e.type === "bonearcher" ? "grave" : undefined });
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
      if (!e.rangedAtk || stunned) e.aiming = false;
      // Wraiths bunch up: any soldier within reach draws every wraith that
      // passes, and they all claw at it at once (no blocker is needed, so one
      // knight can be swarmed by many — and each one it kills raises another)
      if (e.swarms && !stunned && !held) {
        let prey = null, host = null, pd = e.swarms;
        for (const t of unitHosts(g)) for (const u of t.units) {
          if (u.state === "dead") continue;
          const d = Math.hypot(u.x - e.x, u.y - e.y);
          if (d < pd) { pd = d; prey = u; host = t; }
        }
        e.clawing = !!prey;
        if (prey) {
          e.face = prey.x >= e.x ? 1 : -1;
          e.meleeCd -= sdt * 1000;
          if (e.meleeCd <= 0) {
            e.meleeCd = e.atkRate;
            e.atkAnim = 200;
            if (prey.shield) {
              prey.shield = false; prey.shieldCd = 6500;
              g.effects.push({ type: "flash", x: prey.x, y: prey.y - 6, ttl: 300 });
            } else {
              prey.hp -= e.atk;
              g.effects.push({ type: "hit", x: prey.x, y: prey.y - 10, ttl: 200 });
              sfx.play("hit");
            }
            if (prey.hp <= 0) { killUnit(g, host, prey); if (e.raisesOnKill) raiseFrom(g, e, prey, tms); }
          }
        }
      } else if (e.swarms) e.clawing = false;
      if (e.dist >= TOTAL_LEN - LEAK_BACK) {
        e.dead = true;
        const dmgC = e.castleDmg || 1;
        // the sandbox's unbreakable castle counts the blow but keeps its walls
        if (!SANDBOX?.invincible) g.lives -= dmgC;
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
          for (const e of g.enemies) { if (e.dead || isRising(e, tms)) continue; const d = Math.hypot(e.x - gx, e.y - gy); if (d < bows.range && d < bd) { bd = d; best = e; } }
          if (best) {
            cd.archers = bows.rate / bows.count;
            cd.shot = (cd.shot + 1) % bows.count;
            const spots = bowmenSpots(gy, bows.count);
            const sy = spots[cd.shot % spots.length] ?? gy;
            // when each bowman last loosed: the wall draws him drawing his
            // next shot while there is something to shoot, and at ease after
            (cd.loosed || (cd.loosed = []))[cd.shot % spots.length] = tms;
            const [wx, wy] = wallArrowFrom(BOW_X, sy, !!bows.pierce);   // from his bow hand
            g.projectiles.push({ id: nextId(), x: wx, y: wy, targetId: best.id, tx: best.x, ty: best.y, speed: 460, delay: 0, dmg: bows.dmg, dtype: "phys", pierce: !!bows.pierce, splash: 0, burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow", src: null, big: !!bows.pierce });
            sfx.play("arrow");
          }
        }
      }
      const bal = workTier(g.castle, "ballista", g.castleRanks);
      if (bal) {
        cd.ballista -= sdt * 1000;
        if (cd.ballista <= 0) {
          let best = null, bh = -1;
          for (const e of g.enemies) { if (e.dead || isRising(e, tms)) continue; const d = Math.hypot(e.x - gx, e.y - gy); if (d < bal.range && e.hp > bh) { bh = e.hp; best = e; } }
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
      // (a foe with only a chance to split rolled it when it was killed; one that
      // leaked or was swept never splits)
      const splits = e.splits ?? (e.splitChance == null);
      if (e.splitInto && splits && e.splitDrop) {
        // a gryphon brought down drops its knight right where it fell: he
        // hits the road in its lane, sits dazed a moment, and marches on
        const [type, n] = e.splitInto;
        for (let i = 0; i < n; i++) {
          const k = spawnAt(g, type, e.mult, e.dist - i * 9, tms);
          k.lane = e.lane;
          k.x = e.x; k.y = e.y; k.face = e.face;
          k.born = undefined;
          k.dropAt = tms;                        // the renderer drops him from the saddle
          k.stunUntil = tms + 650;
        }
        g.effects.push({ type: "dust", x: e.x, y: e.y + 4, ttl: 420, r: 22 });
      } else if (e.splitInto && splits) {
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
      if (t.kind !== "knight" || !fights(t, g)) continue;
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
            if (Math.hypot(e.x - u.x, e.y - u.y) <= 42) dealDamage(g, e, st.sear * sdt, "magic", false, true, t.id, true);
          }
        }
      }
    }


    // ---- the Powder Works ----
    // Two men on one platform who do NOT share a trigger: the bombardier lobs
    // powder at whatever is close while the musketeer takes his own slow,
    // deliberate shot at something much further out. Both grow on every
    // path, and each path is a way of working together: the Bombard Yard's
    // charges crack armor (brittle) and the musket takes the cracked first;
    // the Long Muskets' musketeer spots, and the charges follow his mark.
    for (const t of g.towers) {
      if (t.kind !== "gunpowder" || !fights(t, g)) continue;
      const st = getStats(t);
      // --- the bombardier: one charge on one foe, and the iron it throws ---
      // (owner, 2026-09-29: no more circles of damage — "it shoots out pieces
      // of fragment around a small explosion"). burstCharge (up top) lands it.
      t.cd = (t.cd || 0) - sdt * 1000;
      if (t.cd <= 0) {
        let near = null, nearScore = -Infinity;
        // spotted: the musketeer's last mark, out to the musket's reach, while
        // it is fresh (his last shot, and a little over his reload)
        const spotted = st.spot && t.spotId != null && tms < t.spotUntil
          ? g.enemies.find((e) => e.id === t.spotId && !e.dead && !e.flying && Math.hypot(e.x - t.x, e.y - t.y) <= st.mRange) : null;
        if (spotted) near = spotted;
        else {
          // he throws where the crowd is thickest, being a man with a bucket
          // of powder: judged by how many stand in reach of the shrapnel
          const fr = st.fragReach || 40;
          for (const e of g.enemies) {
            if (e.dead || e.flying) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) > st.range || !canSee(t, e)) continue;
            let crowd = 0;
            for (const o of g.enemies) if (!o.dead && !o.flying && inBurst(o, e.x, e.y, fr)) crowd++;
            const score = crowd * 1e6 + e.dist;
            if (score > nearScore) { nearScore = score; near = e; }
          }
        }
        if (near) {
          t.cd = st.rate;
          t.anim = 1;
          t.lastAim = t.bAim = Math.atan2(near.y - t.y, near.x - t.x);
          // the charge leaves the bombardier's hand at the top of his throw
          // and comes down ON its mark (it follows him, so a long throw to a
          // spotted mark still lands where he is walking)
          const [shx, shy] = shellFrom(t);
          g.projectiles.push({
            id: nextId(), x: shx, y: shy, sx: shx, sy: shy, tx: near.x, ty: near.y, targetId: near.id,
            total: Math.hypot(near.x - shx, near.y - shy),
            t: 0, speed: 200, delay: 0, dmg: st.dmg, dtype: "phys", pierce: false, splash: 0,
            burn: st.burn || 0, burnDur: st.burnDur || 0, slow: 0, slowDur: 0,
            burnSpreads: !!st.burnSpread, crack: st.crack || 0, crackDur: st.crackDur || 0,
            frags: st.frags || 0, fragDmg: st.fragDmg || 0, fragReach: st.fragReach || 40, fragBurn: !!st.fragBurn,
            kind: "shell", src: t.id, arc: true,
          });
          sfx.play("boom");
          g.shake = Math.max(g.shake, 2);
        }
      }
      // --- the musketeer: long, slow, and it goes through plate ---
      t.mCd = (t.mCd || 0) - sdt * 1000;
      if (t.mCd <= 0) {
        let far = null, farScore = -Infinity, farCracked = false;
        for (const e of g.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) > st.mRange || !canSee(t, e)) continue;
          const mode = t.aim || "first";
          const score = mode === "last" ? -e.dist : mode === "strong" ? e.hp : mode === "weak" ? -e.hp : e.dist;
          // the Bombard Yard's musketeer shoots into the cracks first
          const cracked = !!st.crack && e.brittleUntil > tms;
          if (cracked !== farCracked ? cracked : score > farScore) { farScore = score; far = e; farCracked = cracked; }
        }
        if (far) {
          t.mCd = st.mRate;
          t.mAnim = 1;
          t.mAim = Math.atan2(far.y - t.y, far.x - t.x);
          const balls = st.mShots || 1;
          // one held breath in three lands triple
          t.mShotIdx = ((t.mShotIdx || 0) + 1) % (st.mCrit || 1);
          const crit = st.mCrit && t.mShotIdx === 0 ? 3 : 1;
          // the ball leaves the musket's muzzle and flies from there straight
          // through its mark (it used to start 20 over the hall and fly a line
          // aimed from the hall's foot, passing over small foes side-on). The
          // hall never turns: each man faces his own last shot (muzzles.js).
          // the Long Muskets: his mark is the bombardier's next target
          if (st.spot) { t.spotId = far.id; t.spotUntil = tms + st.mRate + 200; }
          const [mzx, mzy] = muzzleFrom(t);
          const aim0 = Math.atan2(far.y - mzy, far.x - mzx);
          for (let i = 0; i < balls; i++) {
            const spread = balls > 1 ? (i - (balls - 1) / 2) * (st.mSpread || 0.2) : 0;
            const a2 = aim0 + spread;
            const reach = st.mRange;
            g.projectiles.push({
              x: mzx, y: mzy, tx: mzx + Math.cos(a2) * reach, ty: mzy + Math.sin(a2) * reach,
              t: 0, speed: 620, delay: 0, dmg: st.mDmg * crit / (balls > 1 ? 1 : 1), dtype: "phys",
              pierce: !!st.mPierce, splash: 0, burn: st.mBurn || 0, burnDur: st.mBurnDur || 0, slow: 0, slowDur: 0,
              burnSpreads: !!st.burnSpread, hot: !!st.mBurn,
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
      if (t.kind !== "riverwatch" || !fights(t, g)) continue;
      const st = getStats(t);
      const rt = launchSkiffs(g, t, st);         // its water, and its boats on it
      if (!rt) continue;                         // no water, no watch
      const n = st.count || 1;
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
      // a skiff rows under a bridge but never stops there (terrain.js)
      routeSpans(rt);
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
          // (a sea monster is the boats' quarry, even a serpent under the water: serpent.js)
          if (e.dead || e.flying || (e.swimming && !e.ship && !e.sea) || (isRising(e, tms) && !e.submerged)) continue;
          const nr = nearOnRiver(e.x, e.y, e);
          if (nr.d > st.range || !canSee(u, e)) continue;   // (fog / grave mist hide it from the boat, weather.js)
          // each skiff may carry her own order (u.aim); without one she follows the hall's
          const mode = u.aim || t.aim || "first";
          const score = mode === "last" ? -e.dist : mode === "strong" ? e.hp : mode === "weak" ? -e.hp : e.dist;
          if (score > markScore) { markScore = score; mark = e; markQ = nr.q; }
        }
        const home = (rt.total * (i + 1)) / (n + 1);
        const want = clearOfSpans(rt, mark ? markQ : home, u.sd);
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
        if (rt._spans.length && underBridge(u.x, u.y)) return;   // no shooting from under the deck
        // the musket goes off from the bow (the Fireships' hot shot bursts in
        // flame at the mark); the ball is quick enough to land at once
        u.atkCd = st.rate;
        u.swing = 200;
        u.targetId = mark.id;
        const [mzx, mzy] = skiffShotFrom(u, g.time);
        g.effects.push({ type: "musket", x: mzx, y: mzy, tx: mark.x, ty: mark.y - 6, ttl: MUSKET_LIFE, life: MUSKET_LIFE, fire: !!st.burn, splash: st.splash || 0 });
        sfx.play(st.splash ? "boom" : "musket");
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
      if (t.kind !== "assassin" || !fights(t, g)) continue;
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
    resolveStrikes(g, tms);   // the falcons' talons landing
    for (const t of g.towers) {
      t.anim = Math.max(0, t.anim - sdt * 4);
      if (!fights(t, g)) continue;
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
            if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range && canSee(t, e) && (!best || e.hp > best.hp)) best = e;
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
      if (t.kind === "wizard" && t.branch === "a" && t.rank4 === "b") { breathe(g, t, sdt, tms); continue; }
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
        // each arrow leaves its own archer's bow hand (the Ballista's bolt,
        // its nose): muzzles.js arrowFrom
        offs.forEach((spot, i) => {
          const [ax, ay] = arrowFrom(t, spot);
          g.projectiles.push({
            id: nextId(), x: ax, y: ay, targetId: target.id,
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
            // the rings lick up at a wraith, which drifts low over the road
            if (e.dead || (e.flying && !(st.scorchHaunts && e.haunts))) continue;
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
            if (e.dead || e.flying) continue;
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
              kind: "spike", src: t.id, hitsLeft: st.spikePierce || 1, hitIds: [], angle: ang, ground: true,
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
        // The birds are cast: the one on her glove first (it leaves her hand
        // as she throws the arm out), any more (Talon Rain) from their places
        // on the wheel. Each stoops on its prey, following it, and the talons
        // land STOOP_HIT ms later (resolveStrikes); it beats back up to its
        // place on the wheel by STOOP_LIFE. The hall hides a bird while it is
        // away (t.falconsAway) — halls/falconry.js, birds.js drawStoop.
        const n = falconCount(t, st);
        const away = (t.falconsAway || []).filter((a) => a.back > g.time);
        const free = [];
        for (let b = 0; b < n; b++) if (!away.some((a) => a.b === b)) free.push(b);
        hits.forEach((v, i) => {
          const b = free[i] ?? i % n, back = g.time + STOOP_LIFE / 1000;
          const [sx, sy] = b === 0 ? gloveBirdAt(t, "cast") : wheelAt(t, b, n, g.time);
          const fx = { type: "talon", x1: sx, y1: sy, x2: v.x, y2: v.y - 6, ttl: STOOP_LIFE, life: STOOP_LIFE, hit: STOOP_HIT, kind: falconKind(t, b), home: wheelAt(t, b, n, back) };
          g.effects.push(fx);
          away.push({ b, back });
          (g.strikes || (g.strikes = [])).push({ at: tms + STOOP_HIT, id: v.id, others: hits.map((h) => h.id), fx, src: t.id, dmg: st.dmg, air: st.airMult, mark: st.mark, markDur: st.markDur, markShred: st.markShred || 0, diveStun: st.diveStun || 0, diveStunDur: st.diveStunDur || 0, chain: st.chain ? st.chainRange : 0, kind: fx.kind });
        });
        t.falconsAway = away;
        sfx.play("falcon");
      } else if (st.arc) {
        // Stormcaller: lightning strikes instantly and arcs down the line
        let cur = target, mult = 1;
        const hitIds = new Set();
        const pts = [staffFrom(t)];   // the bolt leaves the head of the mage's staff
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
        // Inferno Throne: only every Nth fireball leaves the ground burning
        let pooled = !!st.poolDps;
        if (pooled && st.poolEvery) {
          t.poolIdx = ((t.poolIdx || 0) + 1) % st.poolEvery;
          pooled = t.poolIdx === 0;
        }
        // the Wizard Spire's orb leaves the head of the mage's staff as he
        // drives it at the foe; the Transmuter's flask his hand at the release
        // (the Midas Cannon's shot its gilded muzzle): muzzles.js
        const alch = t.kind === "goldworks" && t.branch === "b";
        const [sx, sy] = t.kind === "wizard" ? staffFrom(t) : alch ? flaskFrom(t) : [t.x, t.y - 30];
        g.projectiles.push({
          id: nextId(), x: sx, y: sy, targetId: target.id,
          tx: target.x, ty: target.y, speed: 300, delay: 0,
          dmg: st.dmg, dtype: st.dtype, pierce: !!st.pierce, splash: st.splash || 0, splashCap: st.splashCap || 0,
          burn: st.burn || 0, burnDur: st.burnDur || 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
          poolDps: pooled ? st.poolDps : 0, poolDur: st.poolDur || 0, poolR: st.poolR || 0, poolKind: st.poolKind,
          burnSpreads: !!st.burnSpread, midas, big: pooled && !!st.poolEvery,
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
      // spikes, musket balls and the Powder Works' shards skewer whatever
      // they pass through (no homing, no arrival hit), `hitsLeft` bodies
      if (p.kind === "spike" || p.kind === "ball" || p.kind === "frag") {
        if (p.kind === "frag") {
          const e = fragVictim(g, p, Math.min(p.speed * WX.shotSpeed * sdt, Math.hypot(p.tx - p.x, p.ty - p.y)));
          if (e) {
            pierceStrike(g, p, e, tms);
            g.effects.push({ type: "spark", x: e.x, y: e.y - 5, ttl: 180, gold: p.hot });
          }
        } else {
          for (const e of g.enemies) {
            if (e.dead || p.hitIds.includes(e.id) || (p.ground && e.flying)) continue;
            if (Math.hypot(e.x - p.x, e.y - p.y) <= (e.size || 14) * 0.7 + 3) { pierceStrike(g, p, e, tms); if (p.done) break; }
          }
        }
        if (p.done) continue;
      }
      // (a shard, a spike and a ball fly to a point: no mark to follow)
      const target = p.targetId == null ? null : g.enemies.find((e) => e.id === p.targetId && !e.dead);
      if (target) { p.tx = target.x; p.ty = target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * WX.shotSpeed * sdt;   // (WX.shotSpeed: a squall slows every shot, weather.js)
      if (d <= stepLen + 4) {
        p.done = true;
        // the Powder Works' charge: a tight blast on its mark, then the shrapnel
        if (p.kind === "shell") burstCharge(g, p, target, tms);
        else if (p.splash > 0) {
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
              // the Bombard Yard's blast cracks armor open (brittle, as Permafrost's)
              if (p.crack) {
                e.brittleAmp = Math.max(e.brittleUntil > tms ? e.brittleAmp : 0, p.crack);
                e.brittleUntil = Math.max(e.brittleUntil, tms + p.crackDur);
              }
            }
          }
          // Inferno Throne / Hellburner: the blast leaves the ground burning
          if (p.poolDps) g.grounds.push({ src: p.src, x: p.tx, y: p.ty, r: p.poolR || 32, dps: p.poolDps, until: tms + (p.poolDur || 3000), born: tms, kind: p.poolKind || "lava" });
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

    // a fight the sandbox called up between waves (sandboxSpawn) is no wave:
    // when its foes are gone the build phase simply resumes — no bonus, no
    // Gold Works payout, no victory
    if (g.summonFight && !g.spawnQueue.length && g.enemies.length === 0 && g.phase === "combat") {
      g.summonFight = false;
      dissolveCorpses(g, tms);
      g.phase = "build";
      g.buildUntil = g.time + (SANDBOX ? SANDBOX.buildTime : BUILD_TIME);
    }
    if (!g.spawnQueue.length && g.enemies.length === 0 && g.phase === "combat") {
      g.gold += waveBonus(g.wave);
      // the hero learns from every wave the realm lives through, alive or not
      sfx.play("waveClear");
      dissolveCorpses(g, tms);   // the fallen crumble away: the next wave's necromancer starts with none
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
      if (g.wave === victoryWave() && !g.victory) { g.victory = true; g.phase = "won"; sfx.play("won"); }
      else { g.phase = "build"; g.buildUntil = g.time + (SANDBOX ? SANDBOX.buildTime : BUILD_TIME); }
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
