// Round 11 (2026-11-24): the owner's pick from Round 10, "A explosion, with D inner ring", as BUILT in the game
// (src/render/fx.js BLAST.fireboom, drawn here by the game's own drawBlast). See art/briefs/fx-round10.md.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/fx.js")), ...(await import("/src/render/paint.js")) } : {};
const R10 = BR ? await import("./fx-r10-fireblast.js") : {};
const NW = { cw: 220, ch: 190, ax: 110, ay: 112, N: 12 };
const LIFE = 530;
const game = (type) => (c, e) => {                         // the game's own drawBlast, both layers, around Round 10's knights and light
  const PXu = G.PX || 2, ms = e.p * LIFE, items = [], fx = { ...R10.r10fxAt(e), type };
  R10.r10glow(c, ms, 1);                                   // the lab's light pool under the ring (in the game the light falls on the figures)
  c.save(); c.scale(PXu, PXu); G.drawBlast(c, fx, "g"); c.restore();
  R10.r10knights(c, ms, items, R10.r10glowK(ms));
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  c.save(); c.scale(PXu, PXu); G.drawBlast(c, fx, "a"); c.restore();
};
export const ROWS = [{
  threeCols: true, id: "fireblast11", label: "Fire wizard's blast, as built (round 11)", group: "Round 11", ...NW,
  today: game("boom"),
  A: game("fireboom"), B: game("fireboom"),
  C: (c, e) => R10.r10frame(c, e, R10.r10noSmoke, 1, R10.r10innerRing),
  note: "The owner's pick from Round 10 (A's blast with D's inner ring), BUILT in the game as its own effect, fireboom, for the fire mage only (the Pyromancer and the Inferno Throne). TODAY is the old look (still used by the Powder Keg Run, the trap bombs and the spores). IN THE GAME is the new effect drawn by the game's own code: the same outer ring, a faint broken inner ring of fire following it, the fireball with no smoke burning out into rising sparks. The last strip is Round 10's concept version, for comparison.",
}];
