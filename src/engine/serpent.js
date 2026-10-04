// ============ ZONE IV: THE SEA MONSTERS ============
// The Rimewater's two monsters from the deep. The owner's design
// (2026-10-04): they are ENVIRONMENTAL HAZARDS, NEUTRAL in the war —
//   - they never hurt the castle: reaching the water's end, a monster simply
//     leaves (no life lost);
//   - they attack whatever is near the water, friend or foe: foes on the road,
//     soldiers, the hero, skiffs, and halls (coiled / smashed). A foe a monster
//     kills pays the player nothing; killing a monster still pays its bounty;
//   - they never hold a wave open: once the war's own foes are all dead (and
//     none are still to come), every monster dives and leaves, so the wave
//     ends as it would have without them (`clearOut`, below);
//   - towers may shoot them, but a monster only outranks the army when it is
//     holding one of yours (`e.menacing`; towers.js pickTarget).
// They ride in g.enemies like any foe (so towers, skiffs and the ledger see
// them), carry `e.neutral` and `e.sea` (makeEnemy), and never walk the road:
// update.js's march skips `e.sea`, and seaTick (called from rime.js rimeTick
// once a frame in combat) moves them. Both are left out of a wave on a board
// with no water at all (waves.js dryLand: `water` in enemies.js).
//
// ---- the Sea Serpent (`sea: "serpent"`) ----
// It puts in at the first river's end nearest the horde (terrain.js
// RIVER_ROUTE) and swims to its far end; on a board with no river it runs the
// coast's rowable line (terrain.js seaRoute). Submerged (`e.submerged`) only a
// River Watch's boats can see or hurt it (towers.js isRising, actions.js
// dealDamage). With prey within `reach` of it and its `rest` over, it rises
// (`rise` ms of ripples, still hidden), stays up `up` ms, then dives (`dive`
// ms, still hittable) and swims on. While up it strikes every `strikeRate`
// ms: it seizes the nearest creature (a soldier, the hero or a foe) and mauls
// it (`maul` x sqrt(wave mult)) until it dives, or the victim dies and it takes
// the next; with no creature in reach it coils round a hall (`coil` ms out of
// the fight: t.downLeft, through build.js `fights`).
//
// ---- the Kraken (`sea: "kraken"`) and its tentacles (`sea: "arm"`) ----
// It plays like the serpent (owner, 2026-10-04): it roams the water (the coast
// if the board has one, else the river), mostly submerged, and surfaces near
// prey (`reach`). Up, it sends `armMax` tentacles (krakenarm foes, one every
// `armEvery` ms) bursting up at the waterline beside creatures within
// `armSpan`; each GRABS its creature — a soldier, the hero or a foe — and
// squeezes it (`grip` every `gripRate` ms) while the creature hacks back at it
// (a soldier at his own pace: seaHold below, hooked into update.js runMelee; a
// foe with a blow at its `atkRate`). A tentacle cut down lets go and tears
// `armBlow` of the body's max health away; the body is targetable while up and
// has a boatload of health. With no creature in its reach a tentacle smashes a
// hall (`smash` ms) and sinks. After `up` ms at a spot (or as soon as it has
// nothing to reach) the arms sink, the body dives and swims on (`rest` before
// it may rise again), and at the water's end it leaves.
//
// A seized soldier carries u.seizedBy (the monster's id), a seized foe
// e.seized (update.js treats it as held), the monster m.hold. Tallies for the
// sims ride on g.zoneStats (rime.js): serpents, krakens, bites, coils,
// smashes, arms, grabsFoe / grabsFriend, armsCut, freedFoe / freedFriend
// (cut down while holding one), killsFoe / killsFriend,
// serpentLeft / krakenLeft (swam off the board), cleared (sent off at a
// wave's end).

import { W, H } from "../data/constants.js";
import { ENEMIES } from "../data/enemies.js";
import { RIVER_ROUTE, seaRoute, seaDepthAt, inRiver, underBridge } from "../data/terrain.js";
import { posAt, nearestOnPath } from "./path.js";
import { isBuilt } from "./build.js";
import { sfx } from "../audio/sfx.js";

// update.js's own helpers, handed over once at load (importing update.js from
// here would close an import cycle through rime.js and actions.js)
const tools = {};
export const registerSeaTools = (t) => Object.assign(tools, t);
export const seaToolsRef = tools;   // (rime.js's roster borrows them too)

const stats = (g) => (g.zoneStats ||= { ships: 0, sunk: 0, landed: 0, lost: 0, shrouds: 0 });
const tally = (g, k) => { const z = stats(g); z[k] = (z[k] || 0) + 1; };

// Is there water for a monster that needs `need` ("any" | "coast")? (waves.js)
export const hasWater = (need) => (need === "coast" ? !!seaRoute() : !!(RIVER_ROUTE || seaRoute()));

// the water a monster swims, entered at the end nearest the horde's gate:
// the river first for the serpent, the coast first for the kraken
const route = (seaFirst) => {
  const river = () => {
    if (!RIVER_ROUTE) return null;
    const end = RIVER_ROUTE.dir > 0 ? RIVER_ROUTE.total : 0;
    return { at: RIVER_ROUTE.at, q0: RIVER_ROUTE.entry, end, dir: RIVER_ROUTE.dir, kind: "river" };
  };
  const sea = () => {
    const sr = seaRoute();
    if (!sr) return null;
    const [sx, sy] = posAt(0);
    const [ax, ay] = sr.at(0), [bx, by] = sr.at(sr.total);
    const fromStart = Math.hypot(ax - sx, ay - sy) <= Math.hypot(bx - sx, by - sy);
    return { at: sr.at, q0: fromStart ? 0 : sr.total, end: fromStart ? sr.total : 0, dir: fromStart ? 1 : -1, kind: "sea" };
  };
  return seaFirst ? sea() || river() : river() || sea();
};
const isWater = (x, y) => inRiver(x, y, 0) || seaDepthAt(x, y) > 0;

// ---- who a monster can strike ----
// creatures (soldiers, the hero, skiffs, foes on the land) and halls within r
// of (x, y), nearest first. `m` (the monster asking) may keep its own victim.
const canSeize = (g, e, m, tms) => !e.dead && !e.sea && !e.ship && !e.flying && !e.swimming && !e.boss && !e.roadBlock && !e.crush
  && !(e.riseAt !== undefined && tms - e.riseAt < e.riseMs) && (!e.seized || e.seized === m?.id);
const preyNear = (g, x, y, r, m, { halls = true, units = true, foes = true } = {}) => {
  const tms = g.time * 1000, out = [];
  if (units) for (const h of tools.unitHosts(g)) {
    for (const u of h.units) {
      if (u.state === "dead" || u.leaving || (u.seizedBy && u.seizedBy !== m?.id)) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= r) out.push({ d, u, host: h });
    }
  }
  if (foes) for (const e of g.enemies) {
    if (!canSeize(g, e, m, tms)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= r) out.push({ d, e });
  }
  if (halls) for (const t of g.towers) {
    if (!isBuilt(t, g) || t.downLeft > 0 || t.iceLeft > 0 || t.downSafe > tms) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d <= r + 8) out.push({ d: d + 1000, t });   // any creature in reach goes first
  }
  return out.sort((a, b) => a.d - b.d);
};

// a monster's blow to a soldier: a ward swallows it whole, as against a bolt
const hurtUnit = (g, host, u, dmg) => {
  if (u.shield) { u.shield = false; u.shieldCd = 6500; g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 }); return false; }
  u.hp -= dmg;
  g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 220 });
  if (u.hp <= 0) { tools.killUnit(g, host, u); tally(g, "killsFriend"); return true; }
  return false;
};
// ...and to a foe: a physical blow (a shield pip swallows it), and a foe it
// kills pays the player nothing
const hurtFoe = (g, e, dmg) => {
  const pay = e.bounty;
  e.bounty = 0;
  tools.dealDamage(g, e, dmg, "phys", false, false, null);
  if (e.dead) tally(g, "killsFoe");
  else e.bounty = pay;
  g.effects.push({ type: "hit", x: e.x, y: e.y - 10, ttl: 220 });
};
// knock a hall out for ms (coiled, smashed): build.js `fights` reads downLeft;
// back up, it gets DOWN_GRACE ms before it can be knocked out again
const DOWN_GRACE = 4000;
const knockOut = (g, t, ms, kind, tms) => {
  t.downLeft = Math.max(t.downLeft || 0, ms);
  t.downMax = Math.max(t.downLeft, t.downMax || 0);
  t.downKind = kind; t.downAt = tms;
  t.downSafe = tms + t.downLeft + DOWN_GRACE;
};

// ---- holding a creature ----
const seize = (g, m, p) => {
  release(g, m);
  if (p.u) {
    m.hold = { u: p.u, host: p.host };
    // a skiff is struck, never pinned (she rows on)
    if (p.host.kind !== "riverwatch") { p.u.seizedBy = m.id; p.u.pinX = p.u.x; p.u.pinY = p.u.y; }
    tally(g, "grabsFriend");
  } else {
    m.hold = { e: p.e };
    p.e.seized = m.id; p.e.seaCd = 300;
    tally(g, "grabsFoe");
  }
  m.menacing = !!p.u;   // holding one of yours: the towers' first business (towers.js)
};
const release = (g, m) => {
  const h = m.hold;
  if (!h) return;
  if (h.u && h.u.seizedBy === m.id) h.u.seizedBy = null;
  if (h.e && h.e.seized === m.id) h.e.seized = null;
  m.hold = null; m.menacing = false;
};
// is the hold still good? (victim alive and still within reach)
const holdOk = (m, reach) => {
  const h = m.hold;
  if (!h) return false;
  if (h.u) return h.u.state !== "dead" && Math.hypot(h.u.x - m.x, h.u.y - m.y) <= reach * 1.5;
  return !h.e.dead && h.e.seized === m.id;
};
// the held thing gets hurt; returns true if it died
const squeeze = (g, m, dmg) => {
  const h = m.hold;
  if (!h) return false;
  if (h.u) return hurtUnit(g, h.host, h.u, dmg);
  hurtFoe(g, h.e, dmg);
  return h.e.dead;
};

// update.js runMelee calls this for a soldier who has u.seizedBy, right after
// his death check: while held he stands where he was caught and hacks at the
// monster at his own pace (and lets go of any foe he was holding). Returns
// false (and clears the hold) once he is free, so runMelee goes on as usual.
export const seaHold = (g, host, st, u, tms) => {
  const m = g.enemies.find((x) => x.id === u.seizedBy && !x.dead);
  if (!m || m.hold?.u !== u) { u.seizedBy = null; return false; }
  const held = g.enemies.find((x) => x.blockedBy === u.id);
  if (held) { held.blockedBy = null; held.engaged = false; }
  u.targetId = null;
  if (u.pinX != null) { u.x = u.pinX; u.y = u.pinY; }
  u.state = "fighting";
  u.face = m.x >= u.x ? 1 : -1;
  if (u.atkCd <= 0) {
    u.atkCd = st.rate || 1000;
    u.swing = 180;
    tools.dealDamage(g, m, (st.dmg || 10) * (1 + (u.atkBuff || 0)), st.magic ? "magic" : "phys", !!st.magic, false, host.id, !!st.magic);
    g.effects.push({ type: "spark", x: m.x + (u.x - m.x) * 0.4, y: m.y - 8, ttl: 160 });
    sfx.play("clink");
  }
  return true;
};

// a held foe with a blow hacks at what holds it
const foesHackBack = (g, m, ms, tms) => {
  const e = m.hold?.e;
  if (!e || !(e.atk > 0) || (e.stunUntil > tms && !e.immStun)) return;
  e.seaCd = (e.seaCd ?? 0) - ms;
  if (e.seaCd > 0) return;
  e.seaCd = e.atkRate || 900;
  e.atkAnim = 200;
  e.face = m.x >= e.x ? 1 : -1;
  tools.dealDamage(g, m, e.atk, "phys", false, false, null);
};

// a monster leaving the board: quietly, no castle damage, nothing paid
const leave = (g, e, fx) => {
  release(g, e);
  if (e.kr) for (const a of e.kr.arms) if (!a.dead) sinkArm(g, a);
  e.dead = true; e.quiet = true;
  if (fx) g.effects.push({ type: fx, x: e.x, y: e.y, face: e.face, ttl: 900, life: 900 });
};
const gone = (e) => { e.dead = true; e.quiet = true; };
const sinkArm = (g, a) => {
  release(g, a);
  gone(a);
  a.blowDone = true;
  g.effects.push({ type: "armSink", x: a.x, y: a.y, face: a.face, ttl: 500, life: 500 });
};

// ---- the serpent ----
const initSerpent = (g, e, tms) => {
  const R = route(false);
  if (!R) { gone(e); return; }
  e.serp = { R, q: R.q0, phase: "swim", t: tms, cd: 1800 };
  e.submerged = true; e.swimming = true; e.lane = 0; e.born = tms;
  [e.x, e.y] = R.at(R.q0);
  e.dist = nearestOnPath(e.x, e.y).dist;
  tally(g, "serpents");
};
const swimOn = (g, e, R, q, speed, ms) => {
  const [ox] = R.at(q);
  const nq = q + R.dir * speed * ms / 1000;
  [e.x, e.y] = R.at(nq);
  if (Math.abs(e.x - ox) > 0.01) e.face = e.x >= ox ? 1 : -1;
  e.dist = nearestOnPath(e.x, e.y).dist;          // "first" orders rank it where it swims
  return nq;
};
const atEnd = (R, q) => (R.dir > 0 ? q >= R.end : q <= R.end);

const serpentTick = (g, e, d, ms, tms) => {
  const S = e.serp, R = S.R;
  const stunned = e.stunUntil > tms && !e.immStun;
  if (S.phase === "swim") {
    if (!stunned) S.q = swimOn(g, e, R, S.q, e.speed, ms);
    if (atEnd(R, S.q)) { tally(g, "serpentLeft"); leave(g, e, "serpentGone"); return; }
    S.cd -= ms;
    // (never under a bridge: it breaks the surface in open water either side)
    if (S.cd <= 0 && !stunned && !underBridge(e.x, e.y, 30) && preyNear(g, e.x, e.y, d.reach, e).length) {
      S.phase = "rise"; S.t = tms;
      g.effects.push({ type: "serpentRise", x: e.x, y: e.y, ttl: d.rise + 200, life: d.rise + 200 });
    }
  } else if (S.phase === "rise") {
    if (tms - S.t >= d.rise) { S.phase = "up"; S.t = tms; S.next = tms; e.submerged = false; e.born = undefined; sfx.play("crack"); }
  } else if (S.phase === "up") {
    if (!holdOk(e, d.reach)) release(g, e);
    foesHackBack(g, e, ms, tms);
    if (stunned) S.t += ms;                          // held up while stunned: more time to hit it
    else if (tms >= S.next) {
      S.next = tms + d.strikeRate;
      let p = e.hold ? (e.hold.u ? { u: e.hold.u, host: e.hold.host } : { e: e.hold.e }) : preyNear(g, e.x, e.y, d.reach, e)[0];
      if (p && !p.t && !e.hold) seize(g, e, p);
      if (p) {
        e.atkAnim = 420;
        tally(g, p.t ? "coils" : "bites");
        sfx.play("crunch");
        if (p.t) {
          e.face = p.t.x >= e.x ? 1 : -1;
          knockOut(g, p.t, d.coil, "coil", tms);
          g.effects.push({ type: "serpentBite", x: e.x, y: e.y, tx: p.t.x, ty: p.t.y - 10, ttl: 380, life: 380 });
        } else {
          const v = p.u || p.e;
          e.face = v.x >= e.x ? 1 : -1;
          g.effects.push({ type: "serpentBite", x: e.x, y: e.y, tx: v.x, ty: v.y, ttl: 380, life: 380 });
          if (squeeze(g, e, d.maul * Math.sqrt(e.mult || 1))) release(g, e);
        }
      }
    }
    if (tms - S.t >= d.up) { release(g, e); S.phase = "dive"; S.t = tms; }
  } else if (S.phase === "dive") {
    if (tms - S.t >= d.dive) {
      S.phase = "swim"; S.cd = d.rest; e.submerged = true;
      g.effects.push({ type: "serpentRise", x: e.x, y: e.y, ttl: 500, life: 500, dive: true });
    }
  }
};

// ---- the kraken ----
// the body rides a little out from the coast line (in the river: on it)
const krakenAt = (R, q) => {
  const [x, y] = R.at(q);
  if (R.kind !== "sea") return [x, y];
  for (let r = 24; r >= 0; r -= 4) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const px = x + dx * r, py = y + dy * r;
    if (px > 16 && py > 16 && px < W - 16 && py < H - 10 && seaDepthAt(px, py) > r + 10) return [px, py];
  }
  return [x, y];
};
const initKraken = (g, e, tms) => {
  const R = route(true);
  if (!R) { gone(e); return; }
  e.kr = { R, q: R.q0, phase: "swim", t: tms, cd: 2500, arms: [], t0: tms, stay: 1e9 };
  e.submerged = true; e.swimming = true; e.lane = 0; e.born = tms;
  [e.x, e.y] = krakenAt(R, R.q0);
  e.dist = nearestOnPath(e.x, e.y).dist;
  e.noHealUntil = Infinity;
  tally(g, "krakens");
};

// where a tentacle bursts up to reach (px, py): from the water nearest the
// creature, at the waterline (or up to `inland` px ashore toward it)
const holeFor = (g, body, ad, px, py) => {
  const R = body.kr.R;
  let best = null, bd = Infinity;
  const span = 260, step = 8;
  for (let dq = -span; dq <= span; dq += step) {
    const [x, y] = R.at(body.kr.q + dq);
    const dd = Math.hypot(x - px, y - py);
    if (dd < bd) { bd = dd; best = [x, y]; }
  }
  if (!best) return null;
  let [x, y] = best;
  const ux = (px - x) / Math.max(1, bd), uy = (py - y) / Math.max(1, bd);
  let walked = 0;
  while (walked < bd && isWater(x + ux * 3, y + uy * 3)) { x += ux * 3; y += uy * 3; walked += 3; }
  let ashore = 0;
  while (ashore < ad.inland && Math.hypot(px - x, py - y) > ad.reach * 0.55) { x += ux * 2; y += uy * 2; ashore += 2; }
  if (Math.hypot(px - x, py - y) > ad.reach) return null;
  return [x, y];
};

const spawnArm = (g, body, d, ad, tms) => {
  const taken = (x, y) => body.kr.arms.some((a) => !a.dead && Math.hypot(a.x - x, a.y - y) < 30);
  const marked = new Set(body.kr.arms.filter((a) => !a.dead && a.mark).map((a) => a.mark));
  // any creature (or, failing one, a hall) a tentacle could reach: one of the
  // nearest few, picked at random — a raider or a knight alike
  const cands = [];
  for (const p of preyNear(g, body.x, body.y, d.armSpan, null)) {
    const v = p.u || p.e;
    if (v && marked.has(v)) continue;
    const at = p.t ? [p.t.x, p.t.y] : [v.x, v.y];
    const hole = holeFor(g, body, ad, at[0], at[1]);
    if (!hole || taken(hole[0], hole[1])) continue;
    cands.push({ p, v, at, hole });
    if (cands.length >= 6) break;
  }
  if (cands.length) {
    const creatures = cands.filter((c) => !c.p.t);
    const pool = creatures.length ? creatures : cands;
    const { p, v, at, hole } = pool[Math.floor(Math.random() * pool.length)];
    const a = tools.spawnAt(g, "krakenarm", body.mult, nearestOnPath(hole[0], hole[1]).dist, tms);
    a.x = hole[0]; a.y = hole[1]; a.lane = 0; a.face = at[0] >= a.x ? 1 : -1;
    a.sea = "arm"; a.seaInit = true; a.swimming = true; a.neutral = true; a.armOf = body.id;
    a.armT = tms; a.next = tms + ad.rise; a.mark = v || p.t;
    a.riseAt = tms; a.riseMs = ad.rise; a.born = undefined;   // untouchable until it is up (towers.js isRising)
    a.noHealUntil = Infinity;
    body.kr.arms.push(a);
    tally(g, "arms");
    sfx.play("rumble");
    g.effects.push({ type: "armRise", x: a.x, y: a.y, ttl: ad.rise, life: ad.rise });
    return true;
  }
  return false;
};

const krakenTick = (g, e, d, ms, tms) => {
  const K = e.kr, R = K.R;
  // tentacles cut down (not sunk) let go and tear at the body
  for (const a of K.arms) {
    if (!a.dead || a.blowDone) continue;
    a.blowDone = true;
    if (a.hold) tally(g, a.hold.u ? "freedFriend" : "freedFoe");   // cut down with something in its grip
    release(g, a);
    tally(g, "armsCut");
    g.effects.push({ type: "armCut", x: a.x, y: a.y, ttl: 600, life: 600 });
    if (!e.dead) tools.dealDamage(g, e, e.maxHp * d.armBlow, "pure", true, false, null);
  }
  K.arms = K.arms.filter((a) => !a.dead);
  if (e.dead) { for (const a of K.arms) sinkArm(g, a); return; }
  const stunned = e.stunUntil > tms && !e.immStun;
  if (K.phase === "swim") {
    if (!stunned) K.q = swimOn(g, e, R, K.q, e.speed, ms);
    if (R.kind === "sea") [e.x, e.y] = krakenAt(R, K.q);
    if (atEnd(R, K.q)) { tally(g, "krakenLeft"); leave(g, e, null); return; }
    K.cd -= ms;
    // it surfaces only where a tentacle could reach a creature (looked for a
    // few times a second, not every frame)
    if (K.cd <= 0 && !stunned && (K.look = (K.look || 0) - ms) <= 0) K.look = 250;
    else return;
    const ad = ENEMIES.krakenarm;
    if (preyNear(g, e.x, e.y, d.reach, null, { halls: false }).some((p) => holeFor(g, e, ad, (p.u || p.e).x, (p.u || p.e).y))) {
      K.phase = "up"; K.t = tms; K.t0 = tms; K.stay = d.up + 1200; K.armCd = 0; K.idle = 0;
      e.born = undefined;
      g.shake = Math.max(g.shake || 0, 4);
      sfx.play("rumble");
      g.effects.push({ type: "krakenRise", x: e.x, y: e.y, ttl: 1200, life: 1200 });
    }
    return;
  }
  if (K.phase === "up") {
    if (e.submerged && tms - K.t >= 500) e.submerged = false;     // up out of the water: now it can be hit
    K.armCd -= ms;
    if (K.armCd <= 0 && !stunned && tms - K.t >= 400) {
      K.armCd = d.armEvery;
      if (K.arms.length < d.armMax) spawnArm(g, e, d, ENEMIES.krakenarm, tms);
    }
    // nothing held, nothing coming: it loses interest sooner
    K.idle = K.arms.length ? 0 : (K.idle || 0) + ms;
    if (tms - K.t >= d.up || (tms - K.t > 4000 && K.idle > 2500)) {
      for (const a of K.arms) sinkArm(g, a);
      K.arms = [];
      K.phase = "dive"; K.t = tms;
      K.stay = tms - K.t0 + 1200;                    // (the rig's sink frames play over the dive)
    }
    return;
  }
  if (K.phase === "dive") {
    if (tms - K.t >= 1200) { K.phase = "swim"; K.cd = d.rest; e.submerged = true; K.stay = 1e9; }
  }
};

const armTick = (g, a, ad, ms, tms) => {
  const body = g.enemies.find((b) => b.id === a.armOf && b.sea === "kraken");
  if (!body || body.dead || body.kr?.phase !== "up" || tms - a.armT >= ad.armLife) { sinkArm(g, a); return; }
  if (a.hold && !holdOk(a, ad.reach)) release(g, a);
  foesHackBack(g, a, ms, tms);
  if (tms < a.next) return;
  const stunned = a.stunUntil > tms && !a.immStun;
  if (stunned) return;
  const k = Math.sqrt(a.mult || 1);
  if (!a.hold) {
    // grab its mark if it can, else the nearest creature in reach, else smash a hall and sink
    const near = preyNear(g, a.x, a.y, ad.reach, a);
    const p = near.find((q) => (q.u || q.e) === a.mark && !q.t) || near.find((q) => !q.t);
    if (p) {
      seize(g, a, p);
      const v = p.u || p.e;
      a.face = v.x >= a.x ? 1 : -1;
      sfx.play("crunch");
      g.effects.push({ type: "armGrab", x: a.x, y: a.y, tx: v.x, ty: v.y, ttl: 600, life: 600 });
      a.next = tms + 500;
      return;
    }
    const hall = near.find((q) => q.t);
    if (hall && !a.smashed) {
      a.smashed = true;
      a.atkAnim = 500;
      a.face = hall.t.x >= a.x ? 1 : -1;
      tally(g, "smashes");
      sfx.play("rock");
      g.shake = Math.max(g.shake || 0, 3);
      knockOut(g, hall.t, ad.smash, "smash", tms);
      g.effects.push({ type: "armSmash", x: a.x, y: a.y, tx: hall.t.x, ty: hall.t.y, ttl: 500, life: 500 });
      a.next = tms + 900;
      return;
    }
    sinkArm(g, a);
    return;
  }
  // holding: squeeze on its own clock
  a.next = tms + ad.gripRate;
  if (squeeze(g, a, ad.grip * k)) release(g, a);
};

// When the war's own foes are all gone (and none are still to come), every
// monster leaves at once, so it never holds a wave open (owner, 2026-10-04).
const clearOut = (g) => {
  const hostile = g.enemies.some((e) => !e.dead && !e.neutral) || g.spawnQueue.some((s) => !ENEMIES[s.type]?.sea);
  if (hostile) return false;
  g.spawnQueue = g.spawnQueue.filter((s) => !ENEMIES[s.type]?.sea);
  for (const e of g.enemies) {
    if (e.dead || !e.neutral) continue;
    if (e.sea !== "arm") tally(g, "cleared");
    if (e.sea === "arm") sinkArm(g, e);
    else leave(g, e, e.sea === "kraken" ? "krakenSink" : "serpentGone");
  }
  return true;
};

// once a frame in combat (rime.js rimeTick), before the spawns and the march
export const seaTick = (g, sdt, tms) => {
  const ms = sdt * 1000;
  // knocked-out halls come back
  for (const t of g.towers) {
    if (!(t.downLeft > 0)) continue;
    t.downLeft -= ms;
    if (t.downLeft <= 0) { t.downLeft = 0; t.downMax = 0; }
  }
  if (!tools.unitHosts) return;
  // foes a monster let go of (it died, sank or left) walk on
  for (const e of g.enemies) if (e.seized && !g.enemies.some((m) => m.id === e.seized && !m.dead && m.hold?.e === e)) e.seized = null;
  if (!g.enemies.some((e) => e.sea && !e.dead)) return;
  if (clearOut(g)) return;
  for (const e of g.enemies) {
    if (!e.sea || e.dead) continue;
    const d = ENEMIES[e.type];
    if (!e.seaInit) {
      e.seaInit = true;
      if (e.sea === "serpent") initSerpent(g, e, tms);
      else if (e.sea === "kraken") initKraken(g, e, tms);
      else gone(e);                                  // an arm with no body (a sandbox summon)
      continue;
    }
    if (e.sea === "serpent") serpentTick(g, e, d, ms, tms);
    else if (e.sea === "arm") armTick(g, e, d, ms, tms);
  }
  // the bodies last, so an arm cut down this frame is already dead
  for (const e of g.enemies) if (e.sea === "kraken" && e.kr && (!e.dead || e.kr.arms.length)) krakenTick(g, e, ENEMIES[e.type], ms, tms);
  // a dead monster lets go
  for (const e of g.enemies) if (e.sea && e.dead && e.hold) release(g, e);
  // a held ranged soldier or skiff-less band member stays where she was caught
  // (melee soldiers are pinned by seaHold in runMelee)
  for (const h of tools.unitHosts(g)) for (const u of h.units) if (u.seizedBy && u.pinX != null && u.state !== "dead") { u.x = u.pinX; u.y = u.pinY; }
};

// between waves: nothing stays knocked out, nobody stays held
export const seaRest = (g) => {
  for (const t of g.towers) if (t.downLeft > 0) { t.downLeft = 0; t.downMax = 0; }
  if (!tools.unitHosts) return;
  for (const h of tools.unitHosts(g)) for (const u of h.units) if (u.seizedBy) u.seizedBy = null;
};
export const _seaDebug = { holeFor: (...a) => holeFor(...a), route };   // (for scratch tests)
