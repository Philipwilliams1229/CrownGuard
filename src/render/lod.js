// ============ CROWD DETAIL (2026-11-22, owner: the phone "got so hot" in the Hollowfen) ============
// A leaf module (no imports). When the road is packed, the small extras on each rank-and-file foe
// cost more than anyone can see in the crush, so they ease away as the crowd thickens and come back
// as it thins. Nothing pops: `k` slides 0 -> 1 between CROWD_FROM and CROWD_FULL live foes, about a
// second end to end.
//
//   LOD.k          0 a thin road .. 1 a packed one
//   LOD.small      enemies.js sets it round a rank-and-file foe's figure (not a boss, not a big body):
//                  pixrigs.js lightAt then fades the far key lights (the sun's, the moon's) by k for it.
//                  Nearby fire and spell light is never dropped.
//   LOD.long       the frame clock (g.time) of the last long-shadow pass (sunset.js) for ground foes and
//                  the bands (hero, militia, retinue); longMen the same for the halls' own men (the time
//                  of day only: the blood moon throws none for them), longFliers for fliers. Whoever has
//                  a long shadow this frame draws NO short foot shadow under it (owner, 2026-11-22:
//                  "remove the small shadow when the long shadow is present"), crowd or not.
//   LOD.raiseFull  how many full raise-dead effects stand this frame (rings.js): past RAISE_FULL a new
//                  one is the short version (the turned earth and its mist, no ring or ribbons)
//
// What eases away for a small foe on a packed road: foot dust and the far key light's rim. Bosses, big bodies (size 20+), soldiers, heroes and halls keep everything.
export const CROWD_FROM = 100, CROWD_FULL = 140, RAISE_FULL = 12;
export const LOD = { n: 0, k: 0, small: false, long: -1, longMen: -1, longFliers: -1, longA: 0, raiseFull: 0, at: 0 };
// How much of a short foot shadow is left under a long one: all of it with no long shadow this frame
// (`stamp` is LOD.long, longMen or longFliers), none once the long one is a third of the way in, so
// it hands over smoothly while the blood moon's sunset brings the long shadows up.
export const shortShade = (stamp, time) => (stamp !== time ? 1 : Math.max(0, 1 - LOD.longA * 3));

export const lodFrame = (g, now) => {
  let n = 0;
  for (const e of g.enemies) if (!e.dead) n++;
  LOD.n = n;
  const want = Math.max(0, Math.min(1, (n - CROWD_FROM) / (CROWD_FULL - CROWD_FROM)));
  const dt = Math.max(0, Math.min(0.1, (now - LOD.at) / 1000));
  LOD.at = now;
  LOD.k += Math.max(-dt, Math.min(dt, want - LOD.k));
  if (LOD.k < 0.001) LOD.k = 0; else if (LOD.k > 0.999) LOD.k = 1;
  LOD.small = false;
  LOD.raiseFull = 0;
};
// a rank-and-file body, the ones a crowd is made of (size under 20: goblins, orcs, levies, Risen, ghouls,
// thralls, wraiths; a troll, necromancer, warchief, ram, wight or any boss is a big body and keeps everything)
export const BIG_BODY = 20;
export const smallFoe = (e) => !e.boss && !(e.size >= BIG_BODY);
