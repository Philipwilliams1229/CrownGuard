// ============ BROTHER OSRIC'S ENGINE HOOKS ============
// (see ./index.js for what each hook is and when it runs; data/heroes/osric.js
// for the numbers; render/heroes/osric.js draws what is kept on g here.)
//
// - His blows are holy (st.magic: runMelee deals them as magic with `holy`,
//   so a wraith feels them; against a standing shield pip they are steel and
//   break it). `strike` adds his bite on the dead: `smite` more against the
//   undead, as a second holy blow (never when the blow just hit a shield).
// - His mending (`tick`): every `mendEvery` ms each friendly soldier within
//   `mendRange` — a Knight Hall's or the Covert's men, the militia, the Gate
//   Guard, his templars and himself — heals `mend` of its max health.
// - Sanctuary (`fire`, aim none): a ring of light round him. Soldiers in it
//   heal `heal` of their max health; the undead in it take `dmg` holy magic
//   and are stunned `stun` ms; the living are only dazzled (`daze` of it).
// - Consecrate (`fire`, aim ground): blessed ground for `dur` ms
//   (g.consecrated, run by `world`): each second the undead on it burn `dmg`
//   (the living half) and are slowed `slow`; soldiers on it mend `mend` of
//   their max health.
//
// "Undead" (isUndead): the Hollow Court's whole roster, anything a
// necromancer has raised (`revived`), and wraiths wherever they walk.
import { ENEMIES } from "../../data/enemies.js";
import { dealDamage } from "../actions.js";
import { isRising } from "../towers.js";
import { isBuilt } from "../build.js";
import { sfx } from "../../audio/sfx.js";

export const isUndead = (e) => !!(e.revived || e.haunts || ENEMIES[e.type]?.faction === "hollow");

// Everyone who fights for the crown on foot: a Knight Hall's or the Covert's
// men (once the hall is up), and every band — militia, Gate Guard, the hero
// and his retinue. Not the River Watch's boats, nor the Skyknight's eagle.
const soldiers = (g, fn) => {
  for (const t of g.towers) {
    if ((t.kind !== "knight" && t.kind !== "assassin") || !t.units || !isBuilt(t, g)) continue;
    for (const u of t.units) if (u.state !== "dead") fn(u);
  }
  if (g.bands) for (const b of g.bands) {
    if (b.leaving) continue;
    for (const u of b.units) if (u.state !== "dead") fn(u);
  }
};
// heal a share of max health; true if it did anything (a whole man is left be)
const mendUnit = (u, share) => {
  if (!(u.hp < u.maxHp)) return false;
  u.hp = Math.min(u.maxHp, u.hp + u.maxHp * share);
  u.healGlow = Math.max(u.healGlow || 0, 320);
  return true;
};
// a short gold glint over a healed man (drawn by render/heroes/osric.js);
// keyed by unit, so a man mended twice keeps one glint
const glint = (g, u, tms, life = 700) => {
  if (!g.osricGlints) g.osricGlints = [];
  const old = g.osricGlints.find((x) => x.u === u);
  if (old) { old.t0 = tms; old.until = tms + life; return; }
  if (g.osricGlints.length < 40) g.osricGlints.push({ u, t0: tms, until: tms + life });
};

export default {
  fire: (g, b, u, a, id, x, y, tms) => {
    // effects run in game time, but these are the player's own buttons:
    // stretch them by the speed so they play in the same real time at 1x,
    // 2x and 4x (as Aldric's slam does, actions.js)
    const k = Math.max(1, g.speed || 1);
    if (id === "sanctuary") {
      const r = a.r, ux = u.x, uy = u.y + 4;
      soldiers(g, (s) => { if (Math.hypot(s.x - ux, s.y - uy) <= r && mendUnit(s, a.heal)) glint(g, s, tms, 900 * k); });
      for (const e of g.enemies) {
        if (e.dead || e.swimming || isRising(e, tms)) continue;
        if (Math.hypot(e.x - ux, e.y - uy) > r) continue;
        if (isUndead(e)) {
          dealDamage(g, e, a.dmg, "magic", false, false, b.id, true);
          if (!e.dead && !e.immStun) e.stunUntil = Math.max(e.stunUntil || 0, tms + a.stun);
          g.effects.push({ type: "spark", x: e.x, y: e.y - 8, ttl: 220, gold: true });
        } else if (!e.flying && !e.immStun && !e.boss) {
          // the living are only dazzled: a blink of a stop, no harm
          e.stunUntil = Math.max(e.stunUntil || 0, tms + a.stun * (a.daze || 0));
        }
      }
      if (!g.sanctuaries) g.sanctuaries = [];
      g.sanctuaries.push({ x: ux, y: uy, r, t0: tms, wave: 520 * k, life: 1500 * k, src: b.id });
      // he lifts the mace for the blessing (render/heroes/osric.js pose)
      u.osricCast = { t0: tms, until: tms + 520 * k };
      g.shake = Math.max(g.shake || 0, 3);
      sfx.play("chant");
      sfx.play("nova");
      return true;
    }
    if (id === "consecrate") {
      if (!g.consecrated) g.consecrated = [];
      // one blessing at a time per spot: a new one over an old one replaces it
      g.consecrated = g.consecrated.filter((c) => Math.hypot(c.x - x, c.y - y) > c.r * 0.5);
      g.consecrated.push({ x, y, r: a.r, dmg: a.dmg, mend: a.mend, slow: a.slow || 0, t0: tms, until: tms + a.dur, src: b.id, ping: tms });
      u.osricCast = { t0: tms, until: tms + 420 * k };
      sfx.play("ward");
      return true;
    }
    return undefined;
  },

  tick: (g, b, u, sdt, tms) => {
    const st = b.st;
    if (!st.mend || !st.mendEvery) return false;
    b.mendCd = (b.mendCd ?? st.mendEvery) - sdt * 1000;
    if (b.mendCd > 0) return false;
    b.mendCd += st.mendEvery;
    if (b.mendCd < 0) b.mendCd = st.mendEvery;
    soldiers(g, (s) => { if (Math.hypot(s.x - u.x, s.y - u.y) <= st.mendRange && mendUnit(s, st.mend)) glint(g, s, tms); });
    return false;
  },

  // his mace bites deeper into the dead: `smite` more as a second holy blow
  // (not when the blow just landed on a shield pip — that one was steel)
  strike: (g, b, u, target, dealt, tms) => {
    const sm = b.st.smite || 0;
    if (!sm || target.dead || target.guardFlash > tms || !isUndead(target)) return;
    dealDamage(g, target, dealt * sm, "magic", false, false, b.id, true);
  },

  world: (g, sdt, tms) => {
    if (g.sanctuaries && g.sanctuaries.length) g.sanctuaries = g.sanctuaries.filter((s) => tms < s.t0 + s.life);
    if (g.osricGlints && g.osricGlints.length) g.osricGlints = g.osricGlints.filter((x) => tms < x.until && x.u.state !== "dead");
    if (!g.consecrated || !g.consecrated.length || sdt <= 0) return;
    for (const c of g.consecrated) {
      for (const e of g.enemies) {
        if (e.dead || e.swimming || isRising(e, tms)) continue;
        const und = isUndead(e);
        if (e.flying && !e.haunts) continue;           // the living sky is out of reach of the ground
        if (Math.hypot(e.x - c.x, e.y - c.y) > c.r) continue;
        // a burn on the ground: `tick`, so a standing shield pip shrugs it off
        dealDamage(g, e, c.dmg * (und ? 1 : 0.5) * sdt, "magic", false, true, c.src, true);
        // and the hallowed earth drags at the dead, so they linger in it
        // (movement ignores it on a shielded or slow-proof foe)
        if (und && c.slow && !e.dead) { e.slowUntil = tms + 250; e.slowPct = Math.max(e.slowPct || 0, c.slow); }
      }
      // once a second the blessing mends whoever stands on it (and glints)
      if (tms - c.ping >= 1000) {
        c.ping += 1000;
        soldiers(g, (s) => { if (Math.hypot(s.x - c.x, s.y - c.y) <= c.r && mendUnit(s, c.mend)) glint(g, s, tms); });
      }
    }
    g.consecrated = g.consecrated.filter((c) => tms < c.until);
  },

  reset: (g) => { g.consecrated = []; g.sanctuaries = []; g.osricGlints = []; },
};
