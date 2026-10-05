// ============ CAPTAIN HALE'S ENGINE HOOKS ============
// (see ./index.js for what each hook is and when it runs; data/heroes/hale.js
// for the numbers; render/heroes/hale.js draws what is kept here.)
//
// - Hold the Line (`tick`): runMelee gives a hero ONE foe (u.targetId, the
//   foe's blockedBy = his id). Hale also holds up to `holds - 1` more on foot
//   that walk up to him while he is planted in a fight (u.holds, their ids).
//   They stand (blockedBy + engaged, as runMelee's own hold) and strike him on
//   their own clocks. He lets them go when he falls, when he is sent to a new
//   post, when he walks off, or when one is pushed out of his reach; when his
//   main foe falls, the nearest of them becomes it, so he never walks off and
//   leaves a crowd standing. (A fallen captain's holds are also freed by
//   update.js's stale-holder pass the next tick: no hold can outlive him and
//   stall a wave.)
// - His blow sweeps (`strike`): each of his foes besides the one he struck
//   takes the same blow, physical, through dealDamage.
// - Halberd Sweep (`fire`, aim none; id `brace`): he swings the halberd
//   `beats` times (u.brace, first at `lead` ms, then every `gap`; both
//   stretched by the game speed so the player can see them). Each swing
//   strikes every foe on the ground in the half-circle before him (180
//   degrees, the side he faces, reach `r` on the ground ellipse): `dmg`
//   physical and a `stun`-ms stun, `mounted` times the blow for riders and
//   tramplers. A rider's trample within the swing's reach is spent on the
//   halberd (`trampleLeft` 0; the Lord Marshal's re-arms on its own clock).
//   While the swings last he is planted (his feet and facing are locked at
//   the press: `tick` pins them and skips runMelee, so he neither walks nor
//   turns nor trades his ordinary blows) and takes `harm` of every blow
//   (`hurt`); the foes he holds keep striking him on their own clocks.
// - Sound the Levy (`fire`, aim none): two watchmen (halberdier rig) and two
//   crossbowmen (a mixed "militia" band, `levy` set so nothing mistakes it
//   for the player's horn; its cooldown is untouched) fall in on the spot he
//   stands: the soldiers a step ahead of him, the crossbows behind. They
//   fight until they drop (no clock, no respawn); sounding the horn again
//   replaces whatever is left with four fresh men. For
//   `buffDur` ms every friendly soldier within `r` of him strikes `buff`
//   harder (atkBuff, laid by `buffs` after the Support halls' auras, which
//   clear it every tick).
import { dealDamage, releaseEnemy } from "../actions.js";
import { isRising } from "../towers.js";
import { isBuilt } from "../build.js";
import { nextId } from "../ids.js";
import { sfx } from "../../audio/sfx.js";

const HOLD_R = 26;        // how close a foe must come to him to be held (a knight closes to 17)
const HOLD_SLACK = 12;    // ...and how far it may be pushed (a charge's knock) before he lets it go
const TRAMPLE_R = 44;     // a charging rider's trample is spent on the halberd from this far (it closes fast at 4x)
const SWING_LEAD = 130;   // ms of the arc already run when a swing lands (render/heroes/hale.js draws from it)
const FLAT = 0.7;         // the ground's squash: the sweep's reach is `r` across, `r * FLAT` deep

// a foe he could hold besides his first: on foot, on the road, not a ram
// (rams and walls are never held — runMelee's own hero filter), not rising
const holdable = (e, tms) => !e.dead && !e.blockedBy && !e.flying && !e.swimming && !e.crush && !e.roadBlock && !isRising(e, tms);

const braced = (u, tms) => !!(u.brace && u.brace.until > tms);

const releaseAll = (g, u) => {
  if (!u.holds) return;
  for (const id of u.holds) {
    const e = g.enemies.find((x) => x.id === id);
    if (e && e.blockedBy === u.id) releaseEnemy(g, e);
  }
  u.holds = [];
};

// one swing: everything on the ground in the half-circle before him
const swing = (g, b, u, br, i, tms) => {
  const f = u.face < 0 ? -1 : 1;
  let hit = 0;
  for (const e of g.enemies) {
    if (e.dead || e.flying || e.swimming || isRising(e, tms)) continue;
    const dx = (e.x - u.x) * f, dy = (e.y - u.y) / FLAT;
    if (dx < -4 || Math.hypot(dx, dy) > br.r) continue;      // (a body's width of slack behind the line)
    const rider = e.mounted || e.trampleMax > 0;
    dealDamage(g, e, br.dmg * (rider ? br.mounted : 1), "phys", false, false, b.id);
    if (!e.dead && !e.immStun) e.stunUntil = Math.max(e.stunUntil || 0, tms + br.stun);
    g.effects.push({ type: "hit", x: e.x, y: e.y - 6, ttl: 240 });
    hit++;
  }
  // (the arc is drawn from a little before the blow, so the blade is crossing
  // the half-circle as it lands, not just starting out)
  const t0 = tms - SWING_LEAD * br.k;
  (g.haleFx ||= []).push({ kind: "sweep", x: u.x, y: u.y, f, r: br.r, flip: i % 2, t0, k: br.k, until: t0 + 380 * br.k, hit });
  if (hit) g.shake = Math.max(g.shake, 2);
  sfx.play(hit ? "crunch" : "whistle");
};

const runSwings = (g, b, u, tms) => {
  const br = u.brace;
  for (const e of g.enemies) {
    if (e.dead || e.flying || e.swimming || e.crush || !(e.trampleLeft > 0)) continue;
    if (Math.hypot(e.x - u.x, e.y - u.y) <= TRAMPLE_R || e.id === u.targetId) {
      e.trampleLeft = 0;
      if (e.trampleEvery) e.trampleCd = e.trampleEvery;
    }
  }
  while (br.done < br.beats && tms >= br.t0 + (br.lead + br.done * br.gap) * br.k) swing(g, b, u, br, br.done++, tms);
};

// while he swings he takes `harm` of every blow
function hurt(g, b, u, amount) {
  const tms = g.time * 1000;
  return braced(u, tms) ? amount * (u.brace.harm ?? 0.6) : amount;
}

// the foes he holds stand and strike him on their own clocks (runMelee's
// trade of blows, for the foe it holds); one that has slipped out of reach
// does not
const heldBlows = (g, b, u, ids, sdt, tms) => {
  for (const id of ids) {
    const e = g.enemies.find((x) => x.id === id);
    if (!e || e.dead || e.blockedBy !== u.id) continue;
    if (Math.hypot(e.x - u.x, e.y - u.y) > HOLD_R + HOLD_SLACK) continue;
    e.engaged = true;
    e.face = u.x >= e.x ? 1 : -1;
    if ((e.stunUntil <= tms || e.guard > 0) && e.atk > 0) {
      e.meleeCd -= sdt * 1000;
      if (e.meleeCd <= 0) {
        e.meleeCd = e.atkRate;
        e.atkAnim = 200;
        u.hp -= hurt(g, b, u, e.atk, e);
        g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 200 });
        sfx.play("hit");
      }
    }
  }
};

export default {
  fire(g, b, u, a, id, x, y, tms) {
    if (id === "brace") {
      if (u.state === "dead") return false;
      // he turns to the nearest foe he can reach, so the half-circle is on it
      let near = null, nd = Infinity;
      for (const e of g.enemies) {
        if (e.dead || e.flying || e.swimming) continue;
        const d = Math.hypot(e.x - u.x, (e.y - u.y) / FLAT);
        if (d < nd) { nd = d; near = e; }
      }
      if (near && nd <= a.r * 1.5) u.face = near.x >= u.x ? 1 : -1;
      // (stretched by the game speed, as Aldric's slam: the same real time at 1x, 2x and 4x)
      const k = Math.max(1, g.speed || 1);
      u.brace = { x: u.x, y: u.y, face: u.face < 0 ? -1 : 1, t0: tms, k, until: tms + (a.lead + (a.beats - 1) * a.gap + 380) * k, done: 0, beats: a.beats, lead: a.lead, gap: a.gap, dmg: a.dmg, r: a.r, stun: a.stun, mounted: a.mounted, harm: a.harm };
      g.effects.push({ type: "dust", x: u.x, y: u.y + 6, ttl: 360, r: 14 });
      return true;
    }
    if (id === "levy") {
      if (u.state === "dead") return false;
      if (!g.bands) g.bands = [];
      // a fresh levy replaces whoever is left of the last one
      for (const old of g.bands) {
        if (!old.levy || old.heroId !== b.id) continue;
        for (const m of old.units) if (m.state !== "dead") { releaseEnemy(g, g.enemies.find((e) => e.blockedBy === m.id)); g.effects.push({ type: "poof", x: m.x, y: m.y, ttl: 350 }); }
        old.gone = true;
      }
      g.bands = g.bands.filter((x) => !x.gone);
      const men = Math.max(1, Math.round(a.men)), bows = Math.max(0, Math.round(a.bows));
      const n = men + bows;
      const st = {
        count: n, bows, hp: Math.round(a.hp), dmg: a.mdmg, rate: a.rate || 850, range: a.range || 72, unitSpeed: 115, respawnMs: Infinity,
        bow: { men: Math.round(a.bowHp), dmg: a.bowDmg, rate: a.bowRate, range: a.bowRange }, bowRig: "crossbow",
      };
      // they fall in on his own spot: the watchmen a step ahead of him, the
      // crossbows behind (the swordsmen are the first `men` units, the
      // archers the last `bows`, as the Levy works' mixed bands)
      const f = u.face < 0 ? -1 : 1, x = u.x, y = u.y;
      const slots = [];
      for (let i = 0; i < men; i++) slots.push([x + f * 16, y + (men === 1 ? 0 : (i / (men - 1) - 0.5) * 20)]);
      for (let i = 0; i < bows; i++) slots.push([x - f * 15, y + (bows === 1 ? 2 : (i / (bows - 1) - 0.5) * 20 + 2)]);
      const units = slots.map(([sx, sy], i) => {
        const bow = i >= men;
        const hp = bow ? st.bow.men : st.hp;
        const un = { id: nextId(), hp, maxHp: hp, x: x + (i - (n - 1) / 2) * 3, y: y + 3, face: f, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null };
        if (bow) { un.bow = true; un.rig = "crossbow"; }
        return un;
      });
      g.bands.push({ id: nextId(), kind: "militia", levy: true, heroId: b.id, rig: "halberdier", st, rally: { x, y }, slots, units, life: Infinity });
      // the horn's call and the banner's flash play in real time (`k`); the
      // heart it puts into the soldiers lasts `buffDur` of game time
      const k = Math.max(1, g.speed || 1);
      (g.haleLevy ||= []).push({ x, y, r: a.r, buff: a.buff, t0: tms, until: tms + a.buffDur, k, hx: x, hy: y, bx: -f * 26 });
      g.effects.push({ type: "levelup", x, y, ttl: 500 });
      sfx.play("horn");
      return true;
    }
    return undefined;
  },

  tick(g, b, u, sdt, tms) {
    if (braced(u, tms)) {
      // planted for the swings: no walking, no turning, no ordinary blows
      const br = u.brace;
      runSwings(g, b, u, tms);
      u.x = br.x; u.y = br.y; u.face = br.face; u.dash = null; u.state = "fighting";
      const ids = u.holds ? [...u.holds] : [];
      if (u.targetId && !ids.includes(u.targetId)) ids.push(u.targetId);
      heldBlows(g, b, u, ids, sdt, tms);
      if (u.hp > 0) return true;
      // he fell to them: let all go and let runMelee lay him down this tick
      u.brace = null;
      releaseAll(g, u);
      return false;
    }
    if (u.brace && u.brace.until + 600 < tms) u.brace = null;
    const cap = Math.max(0, (b.st.holds || 1) - 1);
    if (!u.holds) u.holds = [];
    // sent to a new post (the rally moved): he lets go of everything but the
    // fight runMelee leashes itself
    if (u.holdRally !== b.rally) { releaseAll(g, u); u.holdRally = b.rally; }
    // keep only the holds that are still his and still within his reach
    if (u.holds.length) {
      const keep = [];
      for (const id of u.holds) {
        const e = g.enemies.find((x) => x.id === id);
        if (!e || e.dead || e.blockedBy !== u.id) continue;
        const far = Math.hypot(e.x - u.x, e.y - u.y) > HOLD_R + HOLD_SLACK || Math.hypot(e.x - b.rally.x, e.y - b.rally.y) > b.st.range + 12;
        if (far || keep.length >= cap || id === u.targetId) { if (id !== u.targetId) releaseEnemy(g, e); continue; }
        keep.push(id);
      }
      u.holds = keep;
    }
    // his first foe fell: the nearest he still holds becomes it, so runMelee
    // fights on where he stands instead of walking off to a fresh one
    const main = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead) : null;
    if (!main && u.holds.length) {
      let best = null, bd = Infinity;
      for (const id of u.holds) {
        const e = g.enemies.find((x) => x.id === id);
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < bd) { bd = d; best = e; }
      }
      u.holds = u.holds.filter((id) => id !== best.id);
      u.targetId = best.id;
      u.state = "fighting";
    }
    // planted in a fight, he takes on whatever else walks up to him
    if (main && u.state === "fighting" && u.holds.length < cap) {
      for (const e of g.enemies) {
        if (u.holds.length >= cap) break;
        if (e === main || !holdable(e, tms)) continue;
        // an unbraced captain is ridden down like anyone (runMelee's trample
        // takes it when the rider is his first foe); braced, the trample is spent
        if (e.trampleLeft > 0) continue;
        if (Math.hypot(e.x - u.x, e.y - u.y) > HOLD_R) continue;
        if (Math.hypot(e.x - b.rally.x, e.y - b.rally.y) > b.st.range) continue;
        e.blockedBy = u.id;
        e.engaged = true;
        u.holds.push(e.id);
      }
    }
    heldBlows(g, b, u, u.holds, sdt, tms);
    // he fell to them: let all of them go now (runMelee lays him down this tick)
    if (u.hp <= 0) releaseAll(g, u);
    return false;
  },

  strike(g, b, u, target, dealt, tms) {
    if (!u.holds || !u.holds.length) return;
    let n = 0;
    for (const id of u.holds) {
      const e = g.enemies.find((x) => x.id === id && !x.dead);
      if (!e || e === target) continue;
      dealDamage(g, e, dealt, "phys", false, false, b.id);
      g.effects.push({ type: "spark", x: e.x, y: e.y - 6, ttl: 160, gold: u.atkBuff > 0 });
      n++;
    }
    if (n) u.sweep = { at: tms, n };
    u.holds = u.holds.filter((id) => g.enemies.some((x) => x.id === id && !x.dead));
  },

  hurt,

  // after the Support halls' auras (which clear atkBuff each tick): the
  // levy's horn puts heart into every soldier near the spot
  buffs(g, sdt, tms) {
    if (!g.haleLevy || !g.haleLevy.length) return;
    for (const lv of g.haleLevy) {
      if (lv.until <= tms) continue;
      const hosts = [...g.towers.filter((t) => t.units && isBuilt(t, g)), ...(g.bands || [])];
      for (const t of hosts) for (const s of t.units) {
        if (s.state === "dead" || Math.hypot(s.x - lv.x, s.y - lv.y) > lv.r) continue;
        s.atkBuff = Math.max(s.atkBuff || 0, lv.buff);
      }
    }
  },

  world(g, sdt, tms) {
    if (g.haleLevy) g.haleLevy = g.haleLevy.filter((lv) => Math.max(lv.until + 600, lv.t0 + 900 * lv.k) > tms);
    if (g.haleFx) g.haleFx = g.haleFx.filter((f) => f.until > tms);
  },

  reset(g) {
    g.haleLevy = [];
    g.haleFx = [];
  },
};
