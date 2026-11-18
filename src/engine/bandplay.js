// ============ THE KING'S BAND AT WORK (update.js calls these) ============
// band.js has the rules and the tune; this lays it on the board each tick.
//   layBands(g, sdt, tms)      every tick, before anything reads a hall's numbers:
//                              clears every hall's `t.tune`, then each band that
//                              can play (built, not frozen or struck: `fights`)
//                              lays the biggest of each number on the halls it
//                              plays for. Also runs the Thunder Drums' roll and
//                              the War Horn's blast (combat only).
//   bandSoldiers(g, hosts)     after the Warden Mages have set `u.atkBuff`: the
//                              Royal Tattoo's soldiers in earshot strike harder.
import { getStats } from "./towers.js";
import { fights } from "./build.js";
import { soloOf, rolling } from "./band.js";

export function layBands(g, sdt, tms) {
  let any = false;
  for (const t of g.towers) { t.tune = null; if (t.kind === "band") any = true; }
  if (!any) return;
  const live = g.phase === "combat" && !g.paused;
  for (const b of g.towers) {
    if (b.kind !== "band") continue;
    b.playsFor = [];
    if (!fights(b, g)) { b.soloNow = []; continue; }
    const st = getStats(b);
    // Thunder Drums: a roll every `every` ms of fighting
    if (st.roll && live) {
      b.rollCd = (b.rollCd ?? st.roll.every) - sdt * 1000;
      if (b.rollCd <= 0) { b.rollCd = st.roll.every; b.rollAt = tms; b.rollUntil = tms + st.roll.dur; }
    }
    // The War Horn: foes in earshot stagger (slowed; bosses only marked) and are marked
    if (st.horn && live) {
      const h = st.horn;
      b.hornCd = (b.hornCd ?? h.every * 0.5) - sdt * 1000;
      if (b.hornCd <= 0 && g.enemies.some((e) => !e.dead && !e.neutral && Math.hypot(e.x - b.x, e.y - b.y) <= h.r)) {
        b.hornCd = h.every; b.hornAt = tms;
        g.effects.push({ type: "toll", x: b.x, y: b.y - 10, ttl: 700, r: h.r });
        for (const e of g.enemies) {
          if (e.dead || e.neutral || Math.hypot(e.x - b.x, e.y - b.y) > h.r) continue;
          e.markAmp = Math.max(e.markUntil > tms ? e.markAmp || 0 : 0, h.amp);
          e.markUntil = Math.max(e.markUntil || 0, tms + h.ampMs);
          if (!e.boss) { const was = e.slowUntil > tms ? e.slowPct || 0 : 0; e.slowPct = Math.max(was, h.slow); e.slowUntil = Math.max(e.slowUntil || 0, tms + h.slowMs); }
        }
      }
    }
    const tempo = rolling(b, st, tms) ? Math.max(st.tempo || 0, st.roll.tempo) : st.tempo || 0;
    const ids = st.picks ? soloOf(b, st, g.towers) : null;
    b.soloNow = ids || [];
    const voice = b.branch === "b" ? "horn" : "drum";
    for (const o of g.towers) {
      if (o.kind === "band") continue;
      if (ids ? !ids.includes(o.id) : Math.hypot(o.x - b.x, o.y - b.y) > st.range) continue;
      const tu = o.tune || (o.tune = { tempo: 0, reach: 0, might: 0, swell: 0, voice, by: [] });
      tu.tempo = Math.max(tu.tempo, tempo);
      tu.reach = Math.max(tu.reach, st.reach || 0);
      tu.might = Math.max(tu.might, st.might || 0);
      tu.swell = Math.max(tu.swell, st.swell || 0);
      if (tu.voice !== voice) tu.voice = "both";
      tu.by.push(b.id);
      b.playsFor.push(o.id);
    }
  }
}

export function bandSoldiers(g, hosts) {
  for (const b of g.towers) {
    if (b.kind !== "band" || !b.rank4 || !fights(b, g)) continue;
    const st = getStats(b);
    if (!st.buff) continue;
    for (const t of hosts) for (const u of t.units) {
      if (u.state === "dead" || Math.hypot(u.x - b.x, u.y - b.y) > st.range) continue;
      u.atkBuff = Math.max(u.atkBuff || 0, st.buff);
    }
  }
}
