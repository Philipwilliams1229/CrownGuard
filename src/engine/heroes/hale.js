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
// - Brace Pikes (`fire`, aim none): for `dur` ms he is braced (u.brace).
//   Each foe on foot that comes within IMPALE_R of him is impaled once for
//   `dmg` and stunned `stun` ms — `mounted` times over for riders and
//   tramplers. A trampler's trample is spent on him: `trampleLeft` goes to 0
//   (the Lord Marshal's re-arms on its own clock), so runMelee's ride-down
//   never fires and he holds the horse. He takes `harm` of every blow (`hurt`).
// - Sound the Levy (`fire`, aim ground): `men` watchmen (a "militia" band in
//   the halberdier rig, `levy` set so nothing mistakes it for the player's
//   horn; its cooldown is untouched) run out from him to the spot, or rise
//   to the horn there if it is far; for `buffDur` ms every friendly soldier
//   within `r` of the spot strikes `buff` harder (atkBuff, laid by `buffs`
//   after the Support halls' auras, which clear it every tick).
import { dealDamage, releaseEnemy } from "../actions.js";
import { isRising } from "../towers.js";
import { isBuilt } from "../build.js";
import { nextId } from "../ids.js";
import { sfx } from "../../audio/sfx.js";

const HOLD_R = 26;        // how close a foe must come to him to be held (a knight closes to 17)
const HOLD_SLACK = 12;    // ...and how far it may be pushed (a charge's knock) before he lets it go
const IMPALE_R = 40;      // the pikes' reach when braced: a halberd's length, so a rider galloping past in the far lane still meets them
const TRAMPLE_R = 44;     // a charging rider's trample is spent on him from this far (it closes fast at 4x)
const RUN_OUT = 150;      // the levy runs out from him to a spot this near; further, it rises there

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

// Brace Pikes: whatever reaches him is impaled — once a brace — and a
// charging rider's trample breaks on the halberd instead of on him.
const runBrace = (g, b, u, tms) => {
  const br = u.brace;
  for (const e of g.enemies) {
    if (e.dead || e.flying || e.swimming || isRising(e, tms)) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    const rider = e.mounted || e.trampleMax > 0;
    if (e.trampleLeft > 0 && !e.crush && (d <= TRAMPLE_R || e.id === u.targetId)) {
      e.trampleLeft = 0;
      if (e.trampleEvery) e.trampleCd = e.trampleEvery;
    }
    if (d > IMPALE_R || br.hit.includes(e.id)) continue;
    br.hit.push(e.id);
    dealDamage(g, e, br.dmg * (rider ? br.mounted : 1), "phys", false, false, b.id);
    if (!e.dead && !e.immStun) e.stunUntil = Math.max(e.stunUntil || 0, tms + br.stun);
    // (a flash stretched by the game speed, as Aldric's slam: the same real
    // time at 1x, 2x and 4x)
    const life = 420 * Math.max(1, g.speed || 1);
    (g.haleFx ||= []).push({ kind: "impale", x: e.x, y: e.y, hx: u.x, hy: u.y, t0: tms, life, until: tms + life, big: rider });
    g.effects.push({ type: "hit", x: e.x, y: e.y - 6, ttl: 240 });
    if (rider) g.shake = Math.max(g.shake, 3);
    sfx.play(rider ? "crunch" : "stab");
  }
};

// braced, he takes `harm` of every blow, and a foe that strikes him through
// the pikes meets them (if it somehow reached him unimpaled)
function hurt(g, b, u, amount, foe) {
  const tms = g.time * 1000;
  if (!braced(u, tms)) return amount;
  if (foe && !u.brace.hit.includes(foe.id)) runBrace(g, b, u, tms);
  return amount * (u.brace.harm ?? 0.5);
}

export default {
  fire(g, b, u, a, id, x, y, tms) {
    if (id === "brace") {
      if (u.state === "dead") return false;
      u.brace = { t0: tms, until: tms + a.dur, hit: [], dmg: a.dmg, stun: a.stun, mounted: a.mounted, harm: a.harm, k: Math.max(1, g.speed || 1) };
      g.effects.push({ type: "dust", x: u.x, y: u.y + 6, ttl: 360, r: 16 });
      g.shake = Math.max(g.shake, 2);
      sfx.play("spike");
      return true;
    }
    if (id === "levy") {
      if (!g.bands) g.bands = [];
      const n = Math.max(1, Math.round(a.men));
      const st = { count: n, hp: Math.round(a.hp), dmg: a.mdmg, rate: a.rate || 850, range: a.range || 72, unitSpeed: 115, respawnMs: 999999 };
      // round the spot: one ahead, the rest in a shallow fan behind
      const slots = [];
      for (let i = 0; i < n; i++) {
        if (i === 0) { slots.push([x, y - 8]); continue; }
        const side = i % 2 ? -1 : 1, row = Math.ceil(i / 2);
        slots.push([x + side * 12 * row, y + 6 + (row - 1) * 4]);
      }
      // he blows the horn and they run out from behind him; a far spot hears
      // it and the watch turns out there
      const alive = u.state !== "dead";
      const near = alive && Math.hypot(x - u.x, y - u.y) <= RUN_OUT;
      const units = slots.map(([sx, sy], i) => ({
        id: nextId(), hp: st.hp, maxHp: st.hp, x: near ? u.x + (i - (n - 1) / 2) * 6 : sx, y: near ? u.y + 4 : sy,
        face: x >= u.x ? 1 : -1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null,
      }));
      g.bands.push({ id: nextId(), kind: "militia", levy: true, heroId: b.id, rig: "halberdier", st, rally: { x, y }, slots, units, life: a.life });
      // the horn's call and the banner's flash play in real time (`k`); the
      // heart it puts into the soldiers lasts `buffDur` of game time
      const k = Math.max(1, g.speed || 1);
      (g.haleLevy ||= []).push({ x, y, r: a.r, buff: a.buff, t0: tms, until: tms + a.buffDur, k, hx: alive ? u.x : x, hy: alive ? u.y : y });
      if (alive) u.face = x >= u.x ? 1 : -1;
      if (!near) for (const [sx, sy] of slots) g.effects.push({ type: "dust", x: sx, y: sy + 6, ttl: 400 });
      g.effects.push({ type: "levelup", x, y, ttl: 500 });
      sfx.play("horn");
      return true;
    }
    return undefined;
  },

  tick(g, b, u, sdt, tms) {
    if (braced(u, tms)) runBrace(g, b, u, tms);
    else if (u.brace && u.brace.until + 600 < tms) u.brace = null;
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
    // the held ones stand and strike him on their own clocks (runMelee's
    // trade of blows, for the foe it holds)
    for (const id of u.holds) {
      const e = g.enemies.find((x) => x.id === id);
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
