// ============ CASTLE WORKS ============
// Defences built on the castle itself rather than on the field. In the
// campaign they are bought from the crown's TREASURY — the gold carried home
// from every won level — and stay built for the whole of a region: take the
// wall archers on the Vale Road and they are on the wall at Thornbrook too.
// Free Play pays from the run's purse. Four works, each in tiers, priced to
// be fought for.

import { H } from "./constants.js";
import { inRiver } from "./terrain.js";

export const CASTLE_WORKS = {
  archers: {
    name: "Wall Archers", icon: "",
    blurb: "Bowmen on the walk above the gate. They shoot whatever comes within a long bowshot of the wall.",
    tiers: [
      { cost: 10000, label: "Two bowmen", dmg: 16, rate: 900, range: 170, count: 2 },
      { cost: 15000, label: "Four bowmen, longbows", dmg: 24, rate: 800, range: 190, count: 4 },
      { cost: 25000, label: "Heavy crossbows", dmg: 44, rate: 1100, range: 200, count: 4, pierce: true },
    ],
  },
  ballista: {
    name: "Gate Ballista", icon: "",
    blurb: "A siege bow on the bridge over the gate: slow, screaming bolts at the mightiest foe in reach of the wall.",
    tiers: [
      { cost: 10000, label: "One ballista", dmg: 220, rate: 3200, range: 220 },
      { cost: 15000, label: "Twin ballistae", dmg: 240, rate: 3000, range: 240, twin: true },
      { cost: 25000, label: "Fire bolts", dmg: 280, rate: 2800, range: 260, twin: true, burn: 22, burnDur: 3000 },
    ],
  },
  guards: {
    name: "Gate Guard", icon: "",
    blurb: "Halberdiers at the portcullis hold a foe that reaches the gate for a moment — one last chance for the towers.",
    tiers: [
      { cost: 10000, label: "Halberdiers", hold: 1600 },
      { cost: 15000, label: "A thicker gate", hold: 2000, hp: 5 },
      { cost: 25000, label: "Boiling oil", hold: 2400, hp: 5, oil: 45 },
    ],
  },
  masons: {
    name: "Masons' Guild", icon: "",
    blurb: "Masons on the wall mend the castle after every wave, and shore up its foot.",
    tiers: [
      { cost: 10000, label: "Mend one life a wave", mend: 1 },
      { cost: 15000, label: "Mend two, shore the wall", mend: 2, hp: 3 },
    ],
  },
};

export const emptyWorks = () => ({ archers: 0, ballista: 0, guards: 0, masons: 0 });

// ENDLESS RANKS: in Free Play, a finished work can be raised again and
// again — each rank makes its last tier hit harder (or hold longer, or mend
// more) and costs twice the one before, from 50,000 up. Ranks belong to the
// run (g.castleRanks), never to the saved castle: a fortune made at wave 150
// buys nothing for the next run's wave 1.
export const RANK_COST = (key, r) => CASTLE_WORKS[key].tiers.at(-1).cost * 2 ** (r + 1);
export const rankLabel = (key, r) => ({
  archers: `Rank ${r}: +${r * 40}% bowmen damage`, ballista: `Rank ${r}: +${r * 40}% bolt damage`,
  guards: `Rank ${r}: longer hold, hotter oil, +${r * 2} castle life`, masons: `Rank ${r}: mend ${2 + r} lives a wave`,
}[key]);
const ranked = (key, t, r) => {
  if (!r) return t;
  const m = 1 + 0.4 * r;
  if (key === "archers" || key === "ballista") return { ...t, dmg: t.dmg * m, burn: t.burn ? t.burn * m : t.burn, label: rankLabel(key, r) };
  if (key === "guards") return { ...t, hold: t.hold + 400 * r, oil: (t.oil || 0) * m, hp: (t.hp || 0) + 2 * r, label: rankLabel(key, r) };
  if (key === "masons") return { ...t, mend: (t.mend || 0) + r, label: rankLabel(key, r) };
  return t;
};
// The next thing to buy for a work: its next tier, or in the endless its
// next rank once the tiers are done; null when there is nothing more.
export const nextWork = (works, key, ranks = null, endless = false) => {
  const n = works?.[key] || 0, tiers = CASTLE_WORKS[key].tiers;
  if (n < tiers.length) return tiers[n];
  if (!endless) return null;
  const r = (ranks?.[key] || 0) + 1;
  return { ...ranked(key, tiers.at(-1), r), cost: RANK_COST(key, r - 1), rank: r };
};

// The live tier of a work (with its endless rank), or null when none is built.
export const workTier = (works, key, ranks = null) => {
  const n = works?.[key] || 0;
  return n > 0 ? ranked(key, CASTLE_WORKS[key].tiers[n - 1], ranks?.[key] || 0) : null;
};

// Extra castle life the works grant, summed.
export const worksBonusHp = (works, ranks = null) => {
  let hp = 0;
  for (const key of Object.keys(CASTLE_WORKS)) { const t = workTier(works, key, ranks); if (t?.hp) hp += t.hp; }
  return hp;
};

// ---- where things stand on the wall ----
// Square towers bind the castle's two walls, spaced evenly down each stretch
// of it: from the gate towers at either end of the gatehouse out to one near
// the board's edge, every 90-120 units, and never on a river's culvert. The
// free walk between them is where the works' crews stand — clear of every
// tower, at most at a tower's foot in front of it, never on or behind it.
// Positions are the towers' FEET in world y; the renderer draws them from
// the same list.
export const GATE_TOWER_N = -58, GATE_TOWER_S = 90;   // gate towers' feet, from gy
// Every tower on the wall is square, with an open fighting platform on top.
// Its footprint on the ground runs from `foot - n` to `foot + s` down the
// wall, its west face stands at x0; it stands `h` tall, so its platform is
// that footprint lifted `h` up the board (foot - n - h to foot + s - h: the
// crews' spots below are laid out from that, so keep n + h = 44 and
// s - h = -12). It rises well above both of the castle's walls (the outer
// walk is 14 high, the inner 28), which butt into its flanks, and runs back
// into the inner wall's parapet; the renderer (render/castle.js) draws the
// joins.
export const TOWER = { x0: 741, n: 5.5, s: 26.5, h: 38.5 };
// the platform a tower's crew stands on, as [x, feet y]
// (toward its south-west, clear of the stair turret toward the back)
export const towerDeck = (foot) => [771, foot - 17];
// The Gate Ballista stands on the gate towers' platforms: the north one
// first, the south one too once there are two. Feet positions, and where
// the bolt leaves the bow.
export const ballistaSpots = (gy, twin) => (twin ? [GATE_TOWER_N, GATE_TOWER_S] : [GATE_TOWER_N]).map((d) => towerDeck(gy + d));
export const ballistaMuzzle = ([x, y]) => [x - 2, y - 26];
// where the bowmen on the walk stand (and loose from), in x
export const BOW_X = 778;
const DRUM_EDGE_N = 34, DRUM_EDGE_S = H - 16, DRUM_STEP = 105, DRUM_MIN = 80;
const CULVERT_X = 748;
const wet = (foot) => { for (let y = foot - 14; y <= foot + 14; y += 2) if (inRiver(CULVERT_X, y, 2)) return true; return false; };
export const wallDrums = (gy) => {
  const out = [];
  for (const [from, to, dir] of [[gy + GATE_TOWER_N, DRUM_EDGE_N, -1], [gy + GATE_TOWER_S, DRUM_EDGE_S, 1]]) {
    const span = (to - from) * dir;
    if (span < DRUM_MIN) continue;
    // an even step near 105, held to 90-120; the last drum lands near the edge
    const n = Math.max(1, Math.round(span / DRUM_STEP)), step = Math.min(120, Math.max(90, span / n));
    const run = [];
    for (let k = 1; k <= n; k++) {
      let foot = Math.round(from + dir * k * step);
      if (foot < 14 || foot > H + 6) continue;
      // a river under the wall: slide the drum off the culvert, or leave it out
      if (wet(foot)) {
        let best = null;
        for (let d = 2; d <= 44 && best === null; d += 2) for (const f of [foot - d, foot + d]) {
          if (best !== null || wet(f) || (f - from) * dir < 56 || f < 20 || f > H - 8) continue;
          if (run.some((q) => Math.abs(q - f) < 64)) continue;
          best = f;
        }
        if (best === null) continue;
        foot = best;
      }
      run.push(foot);
    }
    out.push(...run);
  }
  return out.sort((a, b) => a - b);
};
export const wallSlots = (gy) => {
  // the stretches of walk crews may use: clear of the gate towers
  // (a crew's feet land 8 below its slot; north of a tower they must stand
  // clear of its raised platform, which reaches up to foot - n - h - 3)
  // (and north of the gate the ballista rises off its tower: stand clear of that too)
  const runs = [[26, gy + GATE_TOWER_N - 63], [gy + GATE_TOWER_S + 30, H - 12]];
  const blocked = wallDrums(gy).map((f) => [f - TOWER.n - TOWER.h - 10, f + 30]);
  const out = [];
  for (const [a0, b0] of runs) {
    // split the run by the drums standing in it
    let gaps = [[a0, b0]];
    for (const [ba, bb] of blocked) gaps = gaps.flatMap(([a, b]) => (bb <= a || ba >= b ? [[a, b]] : [[a, ba], [bb, b]]));
    for (const [a, b] of gaps) {
      if (b < a) continue;
      const n = Math.floor((b - a) / 24) + 1, step = n > 1 ? (b - a) / (n - 1) : 0;
      for (let i = 0; i < n; i++) out.push(Math.round(n > 1 ? a + i * step : (a + b) / 2));
    }
  }
  return out.sort((a, b) => Math.abs(a - gy) - Math.abs(b - gy));
};
// The bowmen stand nearest the gate, alternating sides; the masons at the far ends.
export const bowmenSpots = (gy, count) => {
  const slots = wallSlots(gy);
  const n = slots.filter((y) => y < gy), s = slots.filter((y) => y > gy);
  const out = [];
  for (let i = 0; out.length < count && (n.length || s.length); i++) {
    const pick = (i % 2 === 0 ? n : s).shift() ?? (i % 2 === 0 ? s : n).shift();
    if (pick != null) out.push(pick);
  }
  // a short wall: the rest go up onto the open tops of the towers nearest the gate
  for (const f of wallDrums(gy).sort((p, q) => Math.abs(p - gy) - Math.abs(q - gy))) if (out.length < count) out.push(towerDeck(f)[1] - 8);
  return out;
};
export const masonSpots = (gy, count) => wallSlots(gy).reverse().slice(0, count);
