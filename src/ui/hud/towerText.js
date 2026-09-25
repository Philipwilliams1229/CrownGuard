// ============ TOWER CARD WORDING ============
// What the tower card says about a hall: its working numbers as short tags,
// and — for the next level — exactly which numbers move and by how much.
// Everything reads through getStats, so the permanent skill-tree perks show
// in the card the same way they act on the board.

import { getStats } from "../../engine/towers.js";

// perks leave stats fractional on purpose — round for the panel
const rounded = (t) => {
  const st = { ...getStats(t) };
  for (const k of ["dmg", "hp", "range", "splash", "heal", "colddps"]) if (typeof st[k] === "number") st[k] = Math.round(st[k]);
  return st;
};

// The hall's working numbers, one short phrase per tag.
export function towerTags(t) {
  const st = rounded(t);
  const s = (n) => (n / 1000).toFixed(2) + "s";
  let line;
  if (t.kind === "knight") line = `${st.count || 1} knight${(st.count || 1) > 1 ? "s" : ""} · ${st.dmg} dmg · ${s(st.rate)} · ${st.hp} hp${st.magic ? " · magic" : ""}${st.heal ? " · self-heal" : ""}${st.sear ? " · searing ground" : ""}${st.frenzy ? " · frenzy + lifesteal" : ""}${st.unitSpeed ? " · wolf-swift" : ""}`;
  else if (t.kind === "support") line = `${Math.round(st.slow * 100)}% slow aura · ${st.range} range${st.colddps ? ` · ${st.colddps} cold dps` : ""}${st.nova ? " · frost novas freeze" : ""}${st.brittle ? " · brittles foes (+phys dmg)" : ""}${st.heal ? ` · mends knights ${st.heal}/s` : ""}${st.shield ? " · shields knights" : ""}${st.mend ? " · +1 castle HP per wave" : ""}`;
  else if (t.kind === "gunpowder") line = `bombard ${Math.round(st.dmg)} dmg · ${st.splash} splash · ${st.range} rng${st.shells > 1 ? ` · ${st.shells} charges` : ""}${st.burn ? " · burning" : ""}${st.burnSpread ? " · fire spreads" : ""} · musket ${Math.round(st.mDmg)} dmg · ${s(st.mRate)} · ${st.mRange} rng${st.mPierce ? " · pierces" : ""}${st.mCrit ? " · every 3rd triples" : ""}${st.mShots > 1 ? ` · ${st.mShots}-ball fan` : ""}`;
  else if (t.kind === "riverwatch") line = `${st.count || 1} skiff${(st.count || 1) > 1 ? "s" : ""} · ${Math.round(st.dmg)} dmg · ${s(st.rate)} · ${st.range} rng${st.splash ? ` · ${st.splash} splash` : ""}${st.burn ? " · burning pitch" : ""}${st.pierce ? " · pierces armor" : ""}${st.slow ? " · harpoons drag" : ""}${st.stun ? " · the boom stuns" : ""} · rows the river`;
  else if (t.kind === "assassin") line = `${st.count || 1} blade${(st.count || 1) > 1 ? "s" : ""} · ${Math.round(st.dmg)} dmg · ×${st.preyMult} vs support · ${s(st.rate)} · ${st.hp} hp each${st.pierce ? " · pierces armor" : ""}${st.cull ? " · culls the weak" : ""}${st.silence ? " · silences" : ""}${st.venom ? ` · ${st.venom}/s venom` : ""}${st.venomNoHeal ? " · unhealable venom" : ""}${st.spores ? " · spore clouds" : ""} · never blocks`;
  else if (t.kind === "trapsmith") line = `${Math.round(st.trapDmg)} trap dmg · ${st.maxCharges} charge${st.maxCharges > 1 ? "s" : ""}, one per ${(st.chargeEvery / 1000).toFixed(0)}s · ${st.range} rng${st.root ? " · jaws hold fast" : ""}${st.execute ? " · finishes the weak" : ""}${st.burn ? " · burning mines" : ""}${st.stunAll ? " · stunning blasts" : ""}${st.autoSeed ? " · reseeds each wave" : ""}`;
  else if (t.kind === "goldworks") line = `pays ${Math.round(st.income + (t.mintBonus || 0))}g a wave${st.compound ? ` · grows +${st.compound} each wave` : ""}${st.hoard ? " · hoard doubles or withholds" : ""}${st.mend ? " · mends the castle" : ""}${st.bountyAura ? ` · kills nearby pay +${Math.round(st.bountyAura * 100)}%` : ""}${st.shredAura ? " · aura strips armor" : ""}${st.midas ? " · midas shots" : ""} · paid ${Math.round(t.paidTotal || 0)}g so far`;
  else if (t.kind === "sunforge") line = `${Math.round(st.dps)}/s beam, ramps ×${st.rampMax} · ${st.range} rng${st.beams > 1 ? ` · ${st.beams} beams` : ""}${st.igniteBurn ? " · ignites at full focus" : ""}${st.beamSplash ? " · spills over at focus" : ""}${st.wellRoot ? " · pins its victim" : ""}${st.beamSlow ? " · slows the held" : ""}`;
  else line = `${st.dmg} dmg${st.shots ? ` ×${st.shots} stones` : ""}${st.spikes ? ` ×${st.spikes} spikes` : ""} · ${s(st.rate)} · ${st.range} rng${st.nova ? " · flame ring hits all in reach" : ""}${st.spikePierce > 1 ? " · spikes skewer through" : ""}${st.arc ? ` · chains ×${st.arc}` : ""}${st.zapStun ? " · shocks can stun" : ""}${st.minRange ? ` · blind under ${st.minRange}` : ""}${st.splash ? ` · ${st.splash} splash` : ""}${st.poolDps ? " · lava pools" : ""}${st.burnSpread ? " · fire spreads" : ""}${st.frag ? " · shrapnel bursts" : ""}${st.pierce ? " · pierces armor" : ""}${st.dtype === "magic" ? " · magic" : ""}`;
  return line.split("·").map((x) => x.trim()).filter(Boolean);
}

// The numbers an upgrade can move, in reading order. `lower` marks a stat
// where less is better (a reload time).
const DELTAS = [
  ["count", "Swords", (v) => v],
  ["dmg", "Damage", (v) => Math.round(v)],
  ["trapDmg", "Trap dmg", (v) => Math.round(v)],
  ["dps", "Beam", (v) => `${Math.round(v)}/s`],
  ["rate", "Reload", (v) => `${(v / 1000).toFixed(2)}s`, true],
  ["range", "Range", (v) => Math.round(v)],
  ["hp", "Health", (v) => Math.round(v)],
  ["splash", "Splash", (v) => Math.round(v)],
  ["shots", "Stones", (v) => v],
  ["spikes", "Spikes", (v) => v],
  ["slow", "Slow", (v) => `${Math.round(v * 100)}%`],
  ["colddps", "Cold", (v) => `${Math.round(v)}/s`],
  ["heal", "Mending", (v) => `${Math.round(v)}/s`],
  ["income", "Pay", (v) => `${Math.round(v)}g`],
  ["maxCharges", "Charges", (v) => v],
  ["chargeEvery", "Recharge", (v) => `${(v / 1000).toFixed(0)}s`, true],
  ["mDmg", "Musket", (v) => Math.round(v)],
  ["mRate", "Musket reload", (v) => `${(v / 1000).toFixed(2)}s`, true],
  ["preyMult", "Vs support", (v) => `×${v}`],
];

// What buying the next level changes: [{ label, from, to, better }].
export function levelDeltas(t) {
  const a = getStats(t), b = getStats({ ...t, level: t.level + 1 });
  const out = [];
  for (const [k, label, fmt, lower] of DELTAS) {
    if (a[k] == null || b[k] == null || a[k] === b[k]) continue;
    const from = fmt(a[k]), to = fmt(b[k]);
    if (String(from) === String(to)) continue;
    out.push({ label, from, to, better: lower ? b[k] < a[k] : b[k] > a[k] });
  }
  return out;
}
