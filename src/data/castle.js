// ============ CASTLE WORKS ============
// Defences built on the castle itself rather than on the field. Expensive,
// bought with the run's gold, and in the campaign they stay built for the
// whole of a region: take the wall archers on the Vale Road and they are on
// the wall at Thornbrook too. Four works, each in tiers.

import { H } from "./constants.js";

export const CASTLE_WORKS = {
  archers: {
    name: "Wall Archers", icon: "🏹",
    blurb: "Bowmen on the walk above the gate. They shoot whatever comes within a long bowshot of the wall.",
    tiers: [
      { cost: 320, label: "Two bowmen", dmg: 16, rate: 900, range: 170, count: 2 },
      { cost: 520, label: "Four bowmen, longbows", dmg: 24, rate: 800, range: 190, count: 4 },
      { cost: 840, label: "Heavy crossbows", dmg: 44, rate: 1100, range: 200, count: 4, pierce: true },
    ],
  },
  ballista: {
    name: "Gate Ballista", icon: "⚙",
    blurb: "A siege bow on the bridge over the gate: slow, screaming bolts at the mightiest foe in reach of the wall.",
    tiers: [
      { cost: 480, label: "One ballista", dmg: 220, rate: 3200, range: 220 },
      { cost: 720, label: "Twin ballistae", dmg: 240, rate: 3000, range: 240, twin: true },
      { cost: 1050, label: "Fire bolts", dmg: 280, rate: 2800, range: 260, twin: true, burn: 22, burnDur: 3000 },
    ],
  },
  guards: {
    name: "Gate Guard", icon: "🛡",
    blurb: "Halberdiers at the portcullis hold a foe that reaches the gate for a moment — one last chance for the towers.",
    tiers: [
      { cost: 260, label: "Halberdiers", hold: 1600 },
      { cost: 460, label: "A thicker gate", hold: 2000, hp: 5 },
      { cost: 780, label: "Boiling oil", hold: 2400, hp: 5, oil: 45 },
    ],
  },
  masons: {
    name: "Masons' Guild", icon: "🧱",
    blurb: "Masons on the wall mend the castle after every wave, and shore up its foot.",
    tiers: [
      { cost: 360, label: "Mend one life a wave", mend: 1 },
      { cost: 620, label: "Mend two, shore the wall", mend: 2, hp: 3 },
    ],
  },
};

export const emptyWorks = () => ({ archers: 0, ballista: 0, guards: 0, masons: 0 });

// The live tier of a work, or null when none is built.
export const workTier = (works, key) => {
  const n = works?.[key] || 0;
  return n > 0 ? CASTLE_WORKS[key].tiers[n - 1] : null;
};

// Extra castle life the works grant, summed.
export const worksBonusHp = (works) => {
  let hp = 0;
  for (const key of Object.keys(CASTLE_WORKS)) { const t = workTier(works, key); if (t?.hp) hp += t.hp; }
  return hp;
};

// ---- where things stand on the wall ----
// The wall has round drums every 150 world units down its length (none near
// the gate) and two great drums flanking the gate bridge. The free stretches
// of walkway between them are the slots the works' crews stand in.
const DRUM_STEP = 150, DRUM_R = 15, GATE_R = 25, GATE_G = 70;
export const wallSlots = (gy) => {
  const blocked = [];
  for (let y = 70; y < H; y += DRUM_STEP) if (Math.abs(y - gy) >= GATE_G + 92) blocked.push([y - DRUM_R * 3.7, y + DRUM_R * 2.4]);
  for (const cy of [gy - GATE_G, gy + GATE_G]) blocked.push([cy - GATE_R * 3, cy + GATE_R * 1.5]);
  blocked.push([gy - 46, gy + 46]);
  const out = [];
  for (let y = 26; y < H - 8; y += 24) {
    if (blocked.some(([a, b]) => y > a && y < b)) continue;
    out.push(y);
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
  return out;
};
export const masonSpots = (gy, count) => wallSlots(gy).reverse().slice(0, count);
