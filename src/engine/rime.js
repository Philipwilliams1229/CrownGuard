// ============ ZONE IV: LANDINGS AND THE FROST SHROUD ============
// Two of the Rimewater's mechanics, kept out of update.js so the hot file
// only carries a few hooks (search update.js for "rime.js"). Both run only
// where the data asks for them; every existing level is untouched.
//
// ---- Landings ----
// A realm declares where a longship may beach (maps.js / realms-*.js):
//   landings: [{ at: 0.55, from: "bottom" }]
//     at      where the party joins the road: a fraction of the road's length,
//             or a [col, row] grid point (the road's nearest point to it)
//     from    the board edge the ship sails in from ("top" | "bottom" |
//             "left" | "right"); default the realm's coast edge, else "bottom"
//     beach   optional [col, row] where the keel grounds; default the
//             waterline straight out from the road at `at` toward `from` (or
//             BEACH_OFF px off the road on a board with no coast that way)
//     sail    optional ms from putting out to beaching (default SAIL_MS)
// The faction's script says which waves send one and who is aboard
// (factions: `landings: { warWave: [[type, count, gap], ...] }`, plus
// `landingGen` for generated waves; waves.js landingsOf). In the wave spec
// those groups carry `landing` (the spot's index); startWave keeps them off
// the road's queue and queues ONE ship instead (queueLanding, below), which
// puts out part-way through the wave (LAND_AT of the road's spawn time).
// The ship is a foe (`ship` in enemies.js; default type "longship"): towers in
// reach and River Watch skiffs can shoot it while it sails, it pays a bounty
// if sunk, and the party that jumps down when it beaches is scaled by the
// health it has left (a ship at 40% lands 40% of the party, rounded; a sunk
// one lands nobody). The party then marches on from the landing point like
// any group (blocked, slowed, leaking at the gate as usual). A board with no
// `landings` sends the same groups out of the wood with everyone else.
//
// ---- The frost shroud ----
// A foe with `freezeEvery` (ms) casts, every so often, an ice shell on the
// nearest built hall within `freezeRange` (px) that is not already frozen:
// the hall holds its fire (shots, auras, traps, skiffs, its garrison) for
// `freezeFor` ms. `freezeFirst` (ms) is the first cast after it spawns
// (default half of freezeEvery). It cannot cast while stunned, silenced or
// BURNING. Fire halls (any form with a burn, a breath, hot shot or a lava
// pool) thaw FIRE_SELF x as fast, and thaw every frozen hall within
// FIRE_NEAR px FIRE_HELP x as fast — fire is the answer to frost.
// A frozen hall carries t.iceLeft / t.iceMax (ms); engine/build.js `fights`
// is the gate every hall's fire goes through.

import { W, H, tileX, tileY, pickLane } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { seaDepthAt } from "../data/terrain.js";
import { MECH } from "../data/zone-flags.js";
import { ENEMIES } from "../data/enemies.js";
import { posAt, angleAt, nearestOnPath, TOTAL_LEN } from "./path.js";
import { getStats } from "./towers.js";
import { isBuilt } from "./build.js";
import { sfx } from "../audio/sfx.js";

export const SAIL_MS = 6500;      // putting out to beaching; ~5 s of it on the board
export const LAND_AT = 0.45;      // the ship puts out this far through the wave's road queue
const LAND_MIN = 4000;            // ...but never in the first few seconds of a wave
const BEACH_OFF = 38;             // the keel grounds this far off the road's centre
const OFFBOARD = 70;              // where it puts out from, past the board's edge
const SLANT = 260;                // ...and how far along the edge from its beach

// A realm's landing spots, resolved onto the live road (null: none).
export const landingGeom = (i) => {
  const L = REALM?.landings?.[i];
  if (!L) return null;
  const dist = Array.isArray(L.at) ? nearestOnPath(tileX(L.at[0]), tileY(L.at[1])).dist : Math.max(0.05, Math.min(0.95, L.at)) * TOTAL_LEN;
  const from = L.from || REALM.coast?.edge || "bottom";
  const [rx, ry] = posAt(dist);
  let bx, by;
  if (L.beach) { bx = tileX(L.beach[0]); by = tileY(L.beach[1]); }
  else {
    // off the road on the sea's side: of the road's two sides, the one facing `from`
    const a = angleAt(dist) + Math.PI / 2, nx = Math.cos(a), ny = Math.sin(a);
    const want = from === "bottom" ? [0, 1] : from === "top" ? [0, -1] : from === "left" ? [-1, 0] : [1, 0];
    const s = nx * want[0] + ny * want[1] >= 0 ? 1 : -1;
    bx = rx + nx * s * BEACH_OFF; by = ry + ny * s * BEACH_OFF;
    // walk out to the waterline, if there is one that way
    for (let r = 20; r < 240; r += 4) {
      const x = rx + nx * s * r, y = ry + ny * s * r;
      if (x < 0 || y < 0 || x > W || y > H) break;
      if (seaDepthAt(x, y) >= -2) { bx = x; by = y; break; }
    }
  }
  // it puts out from past the edge and slants in across the water, so most
  // of its run is on the board: the warning a watching player gets
  const sx = from === "left" ? -OFFBOARD : from === "right" ? W + OFFBOARD : bx + (bx < W / 2 ? 1 : -1) * SLANT;
  const sy = from === "top" ? -OFFBOARD * 0.5 : from === "bottom" ? H + OFFBOARD * 0.5 : by + (by < H / 2 ? 1 : -1) * SLANT * 0.6;
  return { dist, from, rx, ry, bx, by, sx, sy, sail: L.sail || SAIL_MS };
};

// startWave's half of a landing: the wave's landing groups board ONE ship,
// queued to put out part-way through the wave. `roadEnd` is when the road's
// last group finishes coming out of the wood (ms on the wave clock).
export const queueLanding = (g, spec, mult, roadEnd, queue) => {
  const party = spec.filter((grp) => grp.landing != null);
  if (!party.length) return;
  const spot = party[0].landing;
  const type = party[0].ship || "longship";
  queue.push({
    type, at: Math.max(LAND_MIN, Math.round(roadEnd * LAND_AT)), mult,
    ship: { spot, party: party.map(([t, n, gap, pay = 1]) => ({ type: t, count: n, gap: Math.max(160, gap || 0), pay })) },
  });
};

// The spawn loop's half: a ship entry puts out from the sea edge; a raider
// it lands starts on the road at its landing point. Called for every spawn
// that carries `ship` or `landAt` (update.js).
// tallies for the sims (scripts/sim.mjs prints them): ships put out, sunk,
// raiders landed / lost with a holed hull, halls shrouded (squalls: g.squalls, weather.js)
export const zoneStats = (g) => (g.zoneStats ||= { ships: 0, sunk: 0, landed: 0, lost: 0, shrouds: 0 });
export const seaborne = (g, e, s, tms) => {
  if (s.ship) {
    zoneStats(g).ships++;
    const geo = landingGeom(s.ship.spot);
    if (!geo) { e.dead = true; e.quiet = true; return; }   // (a realm without the spot: never happens via waves.js)
    e.ship = { ...s.ship, geo, t0: tms, mult: s.mult };
    e.swimming = true;                 // no knight, blade, trap or charge reaches it; towers and skiffs do
    e.dist = geo.dist;                 // "first" orders rank it by where it will land
    e.x = geo.sx; e.y = geo.sy; e.lane = 0;
    e.face = geo.bx >= geo.sx ? 1 : -1;
    e.born = undefined;
    sfx.play("seaHorn");
    g.effects.push({ type: "landingWarn", x: geo.bx, y: geo.by, rx: geo.rx, ry: geo.ry, ttl: geo.sail, life: geo.sail });
    return;
  }
  e.dist = s.landAt;
  e.lane = pickLane(e.boss || !!e.roadBlock);
  const [px, py] = posAt(e.dist);
  const a = angleAt(e.dist);
  e.x = px + Math.cos(a + Math.PI / 2) * e.lane;
  e.y = py + Math.sin(a + Math.PI / 2) * e.lane;
  e.swimming = false;
  e.landed = true;
  e.born = tms;
  if (s.fromX != null) g.effects.push({ type: "plank", x: s.fromX, y: s.fromY, tx: e.x, ty: e.y, ttl: 380, life: 380 });
};

// Sail every ship one frame; beach the ones that arrive. A ship sunk last
// frame leaves a wreck effect. Runs before the movement loop, which skips
// ships (update.js).
const sailShips = (g, tms) => {
  for (const e of g.enemies) {
    if (!e.ship) continue;
    const sh = e.ship;
    if (e.dead) {
      if (!e.quiet && !sh.sunkFx) { sh.sunkFx = true; const zs = zoneStats(g); zs.sunk++; zs.lost += sh.party.reduce((n, p) => n + p.count, 0); g.effects.push({ type: "shipsink", x: e.x, y: e.y, face: e.face, ttl: 1600, life: 1600 }); }
      continue;
    }
    const geo = sh.geo;
    const p = Math.min(1, (tms - sh.t0) / geo.sail);
    const k = 1 - (1 - p) * (1 - p) * 0.6 - (1 - p) * 0.4;   // eases in to the beach
    e.x = geo.sx + (geo.bx - geo.sx) * k;
    e.y = geo.sy + (geo.by - geo.sy) * k + Math.sin(tms / 420 + e.id) * 1.2 * (1 - p);
    sh.p = p;
    if (p < 1) continue;
    // aground: the party jumps down, as many as the hull has left in it
    const frac = Math.max(0, e.hp / e.maxHp);
    let at = g.spawnTimer + 250;
    for (const grp of sh.party) {
      const n = Math.round(grp.count * frac);
      zoneStats(g).landed += n; zoneStats(g).lost += grp.count - n;
      for (let i = 0; i < n; i++) { g.spawnQueue.push({ type: grp.type, at, mult: sh.mult, pay: grp.pay, landAt: geo.dist, fromX: geo.bx, fromY: geo.by }); at += grp.gap; }
    }
    g.spawnQueue.sort((a, b) => a.at - b.at);
    e.dead = true; e.quiet = true;     // no bounty, no leak: it simply stays on the beach
    g.effects.push({ type: "beached", x: geo.bx, y: geo.by, face: e.face, ttl: 9000, life: 9000, hp: frac });
    g.effects.push({ type: "dust", x: geo.bx, y: geo.by + 4, ttl: 500, r: 26 });
    g.shake = Math.max(g.shake, 2);
  }
};

// ---- the frost shroud ----
export const FIRE_SELF = 3, FIRE_HELP = 2, FIRE_NEAR = 72;
// Does this hall's current form burn? (Brazier Wheel, Dragonbreath / Dragon's
// Breath, fire wizards and stones, hot-shot skiffs, the Solar Lance...)
export const isFireHall = (t) => {
  const st = getStats(t);
  return !!(st.burn || st.mBurn || st.igniteBurn || st.logBurn || st.fragBurn || st.breath || st.poolDps);
};
// Can a seer shroud this hall? Built, not already frozen, and a hall that
// does something a shroud could stop (a plain Gold Works pulls no trigger).
const shroudable = (t, g) => isBuilt(t, g) && !(t.iceLeft > 0) && !(t.kind === "goldworks" && !t.branch);

const castShrouds = (g, sdt, tms) => {
  for (const e of g.enemies) {
    if (e.dead || !e.freezeEvery) continue;
    if (e.freezeCd == null) e.freezeCd = e.freezeFirst ?? e.freezeEvery * 0.5;
    e.freezeCd -= sdt * 1000;
    if (e.freezeCd > 0) continue;
    // a seer stunned, silenced or burning keeps its spell for later
    if (e.stunUntil > tms || e.silencedUntil > tms || e.burnUntil > tms || e.swimming) continue;
    let best = null, bd = e.freezeRange;
    for (const t of g.towers) {
      if (!shroudable(t, g)) continue;
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      if (d <= bd) { bd = d; best = t; }
    }
    if (!best) continue;              // nothing in reach: the spell waits, ready
    e.freezeCd = e.freezeEvery;
    e.atkAnim = 320;
    best.iceLeft = best.iceMax = e.freezeFor;
    best.iceAt = tms;
    zoneStats(g).shrouds++;
    g.effects.push({ type: "frostcast", x: e.x, y: e.y - 10, tx: best.x, ty: best.y - 14, ttl: 420, life: 420 });
    g.effects.push({ type: "frostnova", x: best.x, y: best.y, ttl: 400, r: 22 });
    sfx.play("shroud");
  }
};

const thawHalls = (g, sdt) => {
  let fires = null;
  for (const t of g.towers) {
    if (!(t.iceLeft > 0)) continue;
    fires ??= g.towers.filter((h) => isBuilt(h, g) && isFireHall(h));
    let rate = 1;
    if (fires.includes(t)) rate = FIRE_SELF;
    else if (fires.some((h) => !(h.iceLeft > 0) && Math.hypot(h.x - t.x, h.y - t.y) <= FIRE_NEAR)) rate = FIRE_HELP;
    t.iceLeft -= sdt * 1000 * rate;
    t.thawFast = rate > 1;
    if (t.iceLeft <= 0) { t.iceLeft = 0; g.effects.push({ type: "thaw", x: t.x, y: t.y - 10, ttl: 380, life: 380 }); }
  }
};

// update.js calls this once a frame (not while paused), before the spawns
// and the movement loop. Out of combat the ice simply melts.
export const rimeTick = (g, sdt, tms) => {
  if (g.phase !== "combat") { thawAll(g); return; }
  sailShips(g, tms);
  if (MECH.freeze) castShrouds(g, sdt, tms);
  thawHalls(g, sdt);
};

// Between waves the ice is gone (a retried wave rebuilds its halls fresh).
export const thawAll = (g) => { for (const t of g.towers) if (t.iceLeft > 0) t.iceLeft = 0; };

// what the spawn queue's ship entry is, for the wave preview and the sims
export const isShipType = (type) => !!ENEMIES[type]?.ship;
