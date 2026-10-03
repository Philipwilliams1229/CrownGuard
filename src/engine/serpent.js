// ============ ZONE IV: THE SEA MONSTERS ============
// The Rime Clans' two monsters from the deep (owner, 2026-10-03), kept out of
// update.js: rime.js's rimeTick calls seaTick once a frame in combat. Neither
// ever walks the road: update.js's movement loop skips any foe with `sea`
// (set by makeEnemy from enemies.js), and this file moves it instead. Both are
// left out of a wave on a board without their water (waves.js dryLand), so on
// a dry board nothing here runs.
//
// ---- the Sea Serpent (`sea: "serpent"`) ----
// Owner: "on maps with rivers it could swim down them and attack knights,
// heroes and towers". It puts in at the river's end nearest the horde (the
// first river, terrain.js RIVER_ROUTE — the same end a raft goblin takes) and
// swims the WHOLE river to its far end; on a board with no river it runs the
// coast's rowable line (terrain.js seaRoute) from the end nearest the horde.
// Submerged (`e.submerged`) it is untouchable — towers.js isRising counts it
// as not there, and dealDamage lets only a River Watch's boats hurt it — and
// only the skiffs can see it (update.js's skiff loop). When prey lies within
// `reach` of the water (a soldier of any kind, the hero, a skiff, or a hall)
// and it has rested `rest` ms since its last dive, it rises (`rise` ms of
// ripples, still hidden), then stays up `up` ms: it strikes at once and every
// `strikeRate` ms while up — a soldier is mauled (`maul` x sqrt(wave mult)
// damage; a ward pops instead), a hall is coiled and holds its fire `coil` ms
// (t.downLeft, through build.js `fights`, the frost shroud's gate). While it is
// up anything in reach can hit it; a stun keeps it up longer. Then it dives
// (`dive` ms, still hittable) and swims on. At the water's end it slips away,
// costing castleDmg (1) life as a leak — the owner's harasser: what it costs
// is mostly what it mauls on the way.
//
// ---- the Kraken (`sea: "kraken"`) and its arms (`sea: "arm"`) ----
// The body settles offshore in the sea, off the stretch of shore nearest the
// road, and stays there. Every `armEvery` ms while fewer than `armMax` arms
// are up, an arm (a `krakenarm` foe of its own, targetable once risen) bursts
// up on the shore (up to `inland` px from the waterline) within `armSpan` of the body, by a soldier it can grab,
// else a hall it can smash, else the road. An arm acts every `rate` ms: it
// grabs the nearest soldier in `reach` (`grab` damage: a knight is dragged
// under), else smashes a hall (holds its fire `smash` ms), else sweeps the road
// (`sweep` damage to every soldier in reach); it sinks after `armLife` ms. An
// arm cut down tears `armBlow` of the body's max health away. The body itself
// is a plain target for halls and boats in reach. After `stay` ms it sinks
// back into the deep, arms and all, and that costs castleDmg lives like a
// leak — it can never hold a wave open.
//
// Tallies for the sims ride on g.zoneStats (rime.js): serpents, bites, coils,
// slipped (serpents that got away), arms, grabs, smashes, krakens fled.

import { W, H } from "../data/constants.js";
import { ENEMIES } from "../data/enemies.js";
import { RIVER_ROUTE, seaRoute, seaDepthAt, COAST, underBridge } from "../data/terrain.js";
import { SANDBOX } from "../data/sandbox.js";
import { posAt, nearestOnPath, TOTAL_LEN } from "./path.js";
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

// the water a serpent swims, entered at the end nearest the horde's gate
const serpentRoute = () => {
  if (RIVER_ROUTE) {
    const end = RIVER_ROUTE.dir > 0 ? RIVER_ROUTE.total : 0;
    return { at: RIVER_ROUTE.at, q0: RIVER_ROUTE.entry, end, dir: RIVER_ROUTE.dir, kind: "river" };
  }
  const sr = seaRoute();
  if (!sr) return null;
  const [sx, sy] = posAt(0);
  const [ax, ay] = sr.at(0), [bx, by] = sr.at(sr.total);
  const fromStart = Math.hypot(ax - sx, ay - sy) <= Math.hypot(bx - sx, by - sy);
  return { at: sr.at, q0: fromStart ? 0 : sr.total, end: fromStart ? sr.total : 0, dir: fromStart ? 1 : -1, kind: "sea" };
};

// which way is out to sea (unit vector), from the coast's edge
const seaward = () => {
  const e = COAST?.edge || "bottom";
  return e === "bottom" ? [0, 1] : e === "top" ? [0, -1] : e === "left" ? [-1, 0] : [1, 0];
};
// from (x, y) ashore, the waterline straight out to sea (null if > max px)
const shoreFrom = (x, y, max) => {
  const [dx, dy] = seaward();
  for (let r = 0; r <= max; r += 3) {
    const px = x + dx * r, py = y + dy * r;
    if (px < 0 || py < 0 || px > W || py > H) return null;
    if (seaDepthAt(px, py) >= -2) return [px, py, r];
  }
  return null;
};

// who could be struck from (x, y) within r: [{ u, host } | { t }] nearest first
const preyNear = (g, x, y, r, halls = true) => {
  const out = [];
  for (const h of tools.unitHosts(g)) {
    for (const u of h.units) {
      if (u.state === "dead" || u.leaving) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= r) out.push({ d, u, host: h });
    }
  }
  if (halls) {
    for (const t of g.towers) {
      if (!isBuilt(t, g) || t.downLeft > 0 || t.iceLeft > 0 || t.downSafe > g.time * 1000) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= r + 8) out.push({ d: d + 4, t });   // a soldier in the same reach goes first
    }
  }
  return out.sort((a, b) => a.d - b.d);
};

// a blow to a soldier: a ward swallows it whole, as against a crossbow bolt
const hurtUnit = (g, host, u, dmg) => {
  if (u.shield) { u.shield = false; u.shieldCd = 6500; g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 }); return false; }
  u.hp -= dmg;
  g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 220 });
  if (u.hp <= 0) { tools.killUnit(g, host, u); return true; }
  return false;
};
// knock a hall out for ms (coiled, smashed): build.js `fights` reads downLeft
const knockOut = (g, t, ms, kind, tms) => {
  t.downLeft = Math.max(t.downLeft || 0, ms);
  t.downMax = Math.max(t.downLeft, t.downMax || 0);
  t.downKind = kind; t.downAt = tms;
  t.downSafe = tms + t.downLeft + DOWN_GRACE;   // back up, it gets a breath before the next blow
};
const DOWN_GRACE = 4000;

// a monster that gets away: a leak's price, but it never reaches the gate
const slipAway = (g, e, n, fx) => {
  e.dead = true; e.quiet = true;
  if (n > 0) {
    if (!SANDBOX?.invincible) g.lives -= n;
    if (g.run) g.run.leaks += 1;
    g.shake = Math.max(g.shake || 0, 3 + n);
    g.effects.push({ type: "leak", x: e.x - 10, y: e.y - 10, ttl: 900, text: `-${n}` });
    sfx.play("leak");
    if (g.lives <= 0) { g.lives = 0; g.phase = "lost"; sfx.play("lost"); }
  }
  g.effects.push({ type: fx, x: e.x, y: e.y, face: e.face, ttl: 900, life: 900 });
};
const gone = (e) => { e.dead = true; e.quiet = true; };

// ---- the serpent ----
const initSerpent = (g, e, tms) => {
  const R = serpentRoute();
  if (!R) { gone(e); return; }
  e.serp = { R, q: R.q0, phase: "swim", t: tms, cd: 1800 };
  e.submerged = true; e.swimming = true; e.lane = 0; e.born = tms;
  [e.x, e.y] = R.at(R.q0);
  e.dist = nearestOnPath(e.x, e.y).dist;
  tally(g, "serpents");
};
const serpentTick = (g, e, d, ms, tms) => {
  const S = e.serp, R = S.R;
  const stunned = e.stunUntil > tms && !e.immStun && !(e.guard > 0);
  if (S.phase === "swim") {
    const [ox] = R.at(S.q);
    S.q += R.dir * e.speed * (stunned ? 0 : 1) * ms / 1000;
    [e.x, e.y] = R.at(S.q);
    if (Math.abs(e.x - ox) > 0.01) e.face = e.x >= ox ? 1 : -1;
    e.dist = nearestOnPath(e.x, e.y).dist;          // "first" orders rank it where it swims
    if (R.dir > 0 ? S.q >= R.end : S.q <= R.end) { tally(g, "slipped"); slipAway(g, e, e.castleDmg || 1, "serpentGone"); return; }
    S.cd -= ms;
    // (never under a bridge: it breaks the surface in open water either side)
    if (S.cd <= 0 && !stunned && !underBridge(e.x, e.y, 30) && preyNear(g, e.x, e.y, d.reach).length) {
      S.phase = "rise"; S.t = tms;
      g.effects.push({ type: "serpentRise", x: e.x, y: e.y, ttl: d.rise + 200, life: d.rise + 200 });
    }
  } else if (S.phase === "rise") {
    if (tms - S.t >= d.rise) { S.phase = "up"; S.t = tms; S.next = tms; e.submerged = false; e.born = undefined; sfx.play("crack"); }
  } else if (S.phase === "up") {
    if (stunned) S.t += ms;                          // held up while stunned: more time to hit it
    else if (tms >= S.next) {
      S.next = tms + d.strikeRate;
      const p = preyNear(g, e.x, e.y, d.reach)[0];
      if (p) {
        e.atkAnim = 420;
        if (p.u) {
          e.face = p.u.x >= e.x ? 1 : -1;
          tally(g, "bites");
          sfx.play("crunch");
          g.effects.push({ type: "serpentBite", x: e.x, y: e.y, tx: p.u.x, ty: p.u.y, ttl: 380, life: 380 });
          hurtUnit(g, p.host, p.u, d.maul * Math.sqrt(e.mult || 1));
        } else {
          e.face = p.t.x >= e.x ? 1 : -1;
          tally(g, "coils");
          sfx.play("crunch");
          knockOut(g, p.t, d.coil, "coil", tms);
          g.effects.push({ type: "serpentBite", x: e.x, y: e.y, tx: p.t.x, ty: p.t.y - 10, ttl: 380, life: 380 });
        }
      }
    }
    if (tms - S.t >= d.up) { S.phase = "dive"; S.t = tms; }
  } else if (S.phase === "dive") {
    if (tms - S.t >= d.dive) {
      S.phase = "swim"; S.cd = d.rest; e.submerged = true;
      g.effects.push({ type: "serpentRise", x: e.x, y: e.y, ttl: 500, life: 500, dive: true });
    }
  }
};

// ---- the kraken ----
const initKraken = (g, e, tms) => {
  const sr = seaRoute();
  if (!sr) { gone(e); return; }
  // off the stretch of shore nearest the road's middle: the route point
  // closest to any of the road's middle three-fifths
  let bq = sr.total / 2, bd = Infinity;
  for (let q = 0; q <= sr.total; q += 12) {
    const [x, y] = sr.at(q);
    for (let s = 0.2; s <= 0.8; s += 0.04) {
      const [rx, ry] = posAt(s * TOTAL_LEN);
      const dd = Math.hypot(rx - x, ry - y);
      if (dd < bd) { bd = dd; bq = q; }
    }
  }
  // ...and out to sea from there, as deep as the board allows
  const [qx, qy] = sr.at(bq), [dx, dy] = seaward();
  let x = qx, y = qy;
  for (let r = 4; r <= 44; r += 4) {
    const px = qx + dx * r, py = qy + dy * r;
    if (px < 16 || py < 16 || px > W - 16 || py > H - 10) break;
    x = px; y = py;
  }
  e.x = x; e.y = y; e.face = 1; e.lane = 0; e.swimming = true; e.born = tms;
  e.dist = nearestOnPath(x, y).dist;
  e.kr = { t0: tms, armCd: 1400, arms: [] };
  g.shake = Math.max(g.shake || 0, 5);
  sfx.play("rumble");
  g.effects.push({ type: "krakenRise", x, y, ttl: 1200, life: 1200 });
};

// where the next arm comes up: [x, y] at the waterline, or null
const armSpot = (g, body, d, ad) => {
  const near = (x, y) => Math.hypot(x - body.x, y - body.y) <= d.armSpan;
  const taken = (x, y) => body.kr.arms.some((a) => !a.dead && Math.hypot(a.x - x, a.y - y) < 44);
  const spots = { unit: [], hall: [], road: [] };
  const consider = (kind, x, y) => {
    const s = shoreFrom(x, y, ad.reach + ad.inland + 10);
    if (!s || s[2] > ad.reach + ad.inland - 4 || !near(s[0], s[1])) return;
    // the arm bursts up through the shingle, up to `inland` px from the
    // waterline toward its mark (no further than it needs to reach it)
    const [sx, sy] = seaward();
    const k = Math.min(ad.inland, Math.max(3, s[2] - ad.reach * 0.6));
    const ax = s[0] - sx * k, ay = s[1] - sy * k;
    if (!taken(ax, ay)) spots[kind].push([ax, ay]);
  };
  for (const h of tools.unitHosts(g)) for (const u of h.units) if (u.state !== "dead" && !u.leaving) consider("unit", u.x, u.y);
  for (const t of g.towers) if (isBuilt(t, g) && !(t.downLeft > 0) && !(t.downSafe > g.time * 1000)) consider("hall", t.x, t.y);
  for (let q = 0; q <= TOTAL_LEN; q += 24) { const [x, y] = posAt(q); consider("road", x, y); }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return spots.unit.length ? pick(spots.unit) : spots.hall.length ? pick(spots.hall) : spots.road.length ? pick(spots.road) : null;
};

const krakenTick = (g, e, d, ms, tms) => {
  const K = e.kr;
  K.arms = K.arms.filter((a) => !a.dead || !a.blowDone);
  // an arm cut down (not one that sank) tears at the body
  for (const a of K.arms) {
    if (!a.dead || a.blowDone) continue;
    a.blowDone = true;
    if (a.quiet) continue;
    g.effects.push({ type: "armCut", x: a.x, y: a.y, ttl: 600, life: 600 });
    if (!e.dead) tools.dealDamage(g, e, e.maxHp * d.armBlow, "pure", true, false, null);
  }
  if (e.dead) return;
  if (tms - K.t0 >= d.stay) {
    for (const a of K.arms) if (!a.dead) { gone(a); a.blowDone = true; g.effects.push({ type: "armSink", x: a.x, y: a.y, ttl: 500, life: 500 }); }
    tally(g, "krakenFled");
    slipAway(g, e, e.castleDmg || 4, "krakenSink");
    return;
  }
  const stunned = e.stunUntil > tms && !e.immStun;
  K.armCd -= ms;
  const up = K.arms.filter((a) => !a.dead).length;
  if (K.armCd > 0 || stunned || up >= d.armMax) return;
  const ad = ENEMIES.krakenarm;
  const spot = armSpot(g, e, d, ad);
  K.armCd = spot ? d.armEvery : 600;                 // nothing to reach: look again soon
  if (!spot) return;
  const a = tools.spawnAt(g, "krakenarm", e.mult, nearestOnPath(spot[0], spot[1]).dist, tms);
  a.x = spot[0]; a.y = spot[1]; a.lane = 0; a.face = a.x >= e.x ? 1 : -1;
  a.sea = "arm"; a.seaInit = true; a.swimming = true; a.armOf = e.id;
  a.armT = tms; a.next = tms + ad.rise;
  a.riseAt = tms; a.riseMs = ad.rise; a.born = undefined;   // untouchable until it is up (towers.js isRising)
  K.arms.push(a);
  tally(g, "arms");
  sfx.play("rumble");
  g.effects.push({ type: "armRise", x: a.x, y: a.y, ttl: ad.rise, life: ad.rise });
};

const armTick = (g, a, d, ms, tms) => {
  const body = g.enemies.find((b) => b.id === a.armOf && b.sea === "kraken");
  if (!body || body.dead || tms - a.armT >= ENEMIES[body.type].armLife) {
    gone(a);
    g.effects.push({ type: "armSink", x: a.x, y: a.y, ttl: 500, life: 500 });
    return;
  }
  const stunned = a.stunUntil > tms && !a.immStun;
  if (stunned || tms < a.next) return;
  a.next = tms + d.rate;
  a.atkAnim = 500;
  const k = Math.sqrt(a.mult || 1);
  const soldiers = preyNear(g, a.x, a.y, d.reach, false);
  if (soldiers.length) {
    const p = soldiers[0];
    a.face = p.u.x >= a.x ? 1 : -1;
    tally(g, "grabs");
    sfx.play("crunch");
    const died = hurtUnit(g, p.host, p.u, d.grab * k);
    g.effects.push({ type: "armGrab", x: a.x, y: a.y, tx: p.u.x, ty: p.u.y, ttl: 600, life: 600, drag: died });
    return;
  }
  const hall = preyNear(g, a.x, a.y, d.reach, true).find((p) => p.t);
  if (hall) {
    a.face = hall.t.x >= a.x ? 1 : -1;
    tally(g, "smashes");
    sfx.play("rock");
    g.shake = Math.max(g.shake || 0, 3);
    knockOut(g, hall.t, d.smash, "smash", tms);
    g.effects.push({ type: "armSmash", x: a.x, y: a.y, tx: hall.t.x, ty: hall.t.y, ttl: 500, life: 500 });
    return;
  }
  // nothing to grab or smash: it lashes across the road
  const near = nearestOnPath(a.x, a.y);
  const [rx, ry] = posAt(near.dist);
  g.effects.push({ type: "armSweep", x: a.x, y: a.y, tx: rx, ty: ry, ttl: 520, life: 520 });
  for (const p of preyNear(g, a.x, a.y, d.reach * 1.3, false)) hurtUnit(g, p.host, p.u, d.sweep * k);
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
  // the bodies last, so an arm cut down this frame has already been counted dead
  for (const e of g.enemies) if (e.sea === "kraken" && e.kr && (!e.dead || e.kr.arms.some((a) => a.dead && !a.blowDone))) krakenTick(g, e, ENEMIES[e.type], ms, tms);
};

// between waves: nothing stays knocked out
export const seaRest = (g) => { for (const t of g.towers) if (t.downLeft > 0) { t.downLeft = 0; t.downMax = 0; } };
