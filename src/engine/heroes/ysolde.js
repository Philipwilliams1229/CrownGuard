// ysolde's engine hooks (see ./index.js for what each hook is and when it runs;
// data/heroes/ysolde.js for the numbers). Everything she throws is lightning:
// MAGIC, so it hurts a wraith (less its mres) and glances off a shield pip
// without breaking it (dealDamage); a shielded foe also shrugs off her jolts.
import { dealDamage } from "../actions.js";
import { isRising } from "../towers.js";
import { sfx } from "../../audio/sfx.js";
import * as CR from "../../render/rigs-crown.js";

// The crystal on her staff, from her feet (enemies.js stands the rig's feet at
// u.y + 9), facing +x: rigs-crown.js measures it off the painted pose when it
// can (stormStaffTip); until then read off her painted frames — the staff thrust out at the
// strike, raised overhead on the "sky" sheet.
const TIP = { fight: [16, -19], sky: [5, -30], walk: [6, -24] };
export const staffTip = (u, sheet = "fight", frame = 1) => {
  const own = typeof CR.stormStaffTip === "function" ? CR.stormStaffTip(sheet, frame) : null;
  const [dx, dy] = own || TIP[sheet] || TIP.fight;
  return [u.x + (u.face < 0 ? -1 : 1) * dx, u.y + 9 + dy];
};

// a foe a bolt can leap to: alive, out of the ground, above water
const leapable = (e, tms) => !e.dead && !e.swimming && !isRising(e, tms);
// where a bolt bites a foe: its chest (a flier's body rides higher)
const chest = (e) => [e.x, e.y - (e.flying ? 12 : 6)];
// the nearest foe to (x, y) within `reach`, not one already struck. A bolt
// leaps for flesh: it passes over a foe behind a standing shield (it would
// only glance off), so a warded column does not swallow every leap.
const nearestTo = (g, x, y, reach, hit, tms) => {
  let best = null, bd = reach;
  for (const e of g.enemies) {
    if (!leapable(e, tms) || hit.has(e.id) || e.guard > 0) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= bd) { bd = d; best = e; }
  }
  return best;
};
// a jolt: lightning locks the muscles a moment — not a boss built to shrug
// it off (immStun), not a foe behind a standing shield (it stops every status)
const jolt = (e, ms, tms) => {
  if (e.dead || !ms || e.immStun || e.guard > 0) return;
  e.stunUntil = Math.max(e.stunUntil || 0, tms + ms);
};
// The player's own buttons play in the same real time at 1x, 2x and 4x (as
// Aldric's slam does): the look is stretched by the speed, never the rules.
const slow = (g) => Math.max(1, g.speed || 1);

// a bolt from `from` that leaps through up to `n` foes, `first` first, each
// `fall` times the blow before; returns the struck foes' chest points
const leapThrough = (g, b, first, n, dmg, fall, reach, tms, onHit) => {
  const hit = new Set(), pts = [];
  let cur = first, amt = dmg;
  for (let k = 0; k < n && cur; k++) {
    hit.add(cur.id);
    pts.push(chest(cur));
    dealDamage(g, cur, amt, "magic", false, false, b.id);
    onHit?.(cur, k);
    amt *= fall;
    cur = nearestTo(g, cur.x, cur.y, reach, hit, tms);
  }
  return pts;
};

export default {
  // Her ordinary shot (runRangedBand, the clock already reset): lightning,
  // so it lands the instant she looses — no bolt in flight to dodge or to
  // waste on a foe already dead. It leaps on to `chain` more foes within
  // `chainRange`, each `chainFall` of the last. The house's own chain-bolt
  // look (fx.js drawChain) draws it.
  shoot(g, b, u, target, tms) {
    const st = b.st;
    // she does not waste a bolt on a standing shield while there is flesh in
    // reach (the foe at her throat she answers whatever it wears)
    if (target.guard > 0 && target.id !== u.targetId) {
      const bare = nearestTo(g, u.x, u.y, st.range, new Set(), tms);
      if (bare) { target = bare; u.face = target.x >= u.x ? 1 : -1; }
    }
    const from = staffTip(u, "fight", 1);
    const pts = leapThrough(g, b, target, 1 + (st.chain || 0), st.dmg * (1 + (u.atkBuff || 0)), st.chainFall ?? 0.6, st.chainRange || 60, tms);
    g.effects.push({ type: "bolt", pts: [from, ...pts], ttl: 200, seed: Math.random() * 10 });
    sfx.play("zap");
  },

  fire(g, b, u, a, id, x, y, tms) {
    if (id === "storm") {
      // Chain Storm: the foe nearest the tap (none there: keep the charge),
      // then on through up to `jumps` foes in all within `chainRange`, never
      // the same twice, each leap `fall` weaker; every one jolted still
      let mark = null, bd = a.pick;
      for (const e of g.enemies) {
        if (!leapable(e, tms)) continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d <= bd) { bd = d; mark = e; }
      }
      if (!mark) return false;
      u.face = mark.x >= u.x ? 1 : -1;
      const k = slow(g);
      u.cast = { kind: "storm", t0: tms, until: tms + 260 };   // a blink: game time, it holds her fire
      const from = staffTip(u, "fight", 1);
      const pts = leapThrough(g, b, mark, a.jumps, a.dmg, 1 - a.fall, a.chainRange, tms, (e) => jolt(e, a.stun, tms));
      g.effects.push({ type: "ysStorm", pts: [from, ...pts], ttl: 520 * k, life: 520 * k, seed: Math.random() * 10 });
      g.shake = Math.max(g.shake || 0, 2);
      sfx.play("zap");
      sfx.play("boom");
      return true;
    }
    if (id === "thunder") {
      // Thunderclap: a thunderhead gathers over the spot for `delay` ms of
      // game time (a foe may walk out of it — that is the skill), then breaks
      // (the world hook below). She calls it down with her staff raised.
      if (!g.thunderheads) g.thunderheads = [];
      u.face = x >= u.x ? 1 : -1;
      u.cast = { kind: "thunder", t0: tms, until: tms + a.delay };
      g.thunderheads.push({ x, y, r: a.r, dmg: a.dmg, stun: a.stun, air: a.air, src: b.id, t0: tms, at: tms + a.delay, broke: 0, k: slow(g) });
      sfx.play("arcane");
      return true;
    }
    return undefined;
  },

  // While she calls a storm down she does nothing else: the staff is up
  // (render/heroes/ysolde.js pose). Chain Storm's cast is a blink; a
  // Thunderclap holds her for its gathering.
  tick(g, b, u, sdt, tms) {
    if (!u.cast) return false;
    if (tms >= u.cast.until) { u.cast = null; return false; }
    u.state = "fighting";
    return true;
  },

  world(g, sdt, tms) {
    const list = g.thunderheads;
    if (!list || !list.length) return;
    for (const th of list) {
      if (th.broke || tms < th.at) continue;
      // the stroke: everything under the cloud is struck and stunned, a
      // flier (in the cloud's own air) `air` times as hard
      th.broke = tms;
      th.hits = [];                         // where to light a crack (the look)
      for (const e of g.enemies) {
        if (!leapable(e, tms) || Math.hypot(e.x - th.x, e.y - th.y) > th.r) continue;
        th.hits.push(chest(e));
        dealDamage(g, e, th.dmg * (e.flying ? th.air : 1), "magic", false, false, th.src);
        jolt(e, th.stun, tms);
      }
      g.shake = Math.max(g.shake || 0, 5);
      sfx.play("boom");
      sfx.play("zap");
    }
    // the cloud lingers, thinning, a moment after it breaks (the look only)
    g.thunderheads = list.filter((th) => !th.broke || tms - th.broke < 900 * th.k);
  },

  // a retried wave drops any storm still overhead
  reset(g) {
    g.thunderheads = [];
    for (const b of g.bands || []) if (b.hero === "ysolde") for (const u of b.units) u.cast = null;
  },
};
