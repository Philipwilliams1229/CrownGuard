// Shared pieces for the heroes' data files (bands.js gathers them).
// Kept apart from bands.js so each hero's file can use them without an
// import cycle.

// an ability's upgrade line on the Home Screen: +12% damage and 8% off the
// cooldown a rank, plus `more` (a, r) for the ability's own extra
export const abilityLine = (id, name, extra, more) => ({
  id, name, ability: true,
  desc: `${name}: +12% damage and 8% faster to recharge a rank${extra ? `; ${extra}` : ""}.`,
  apply: (st, r) => { const a = st.abil[id]; if (a.dmg !== undefined) a.dmg *= 1 + 0.12 * r; a.cd = Math.round(a.cd * (1 - 0.08 * r)); if (more) more(a, r); },
});
