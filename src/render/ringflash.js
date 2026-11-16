// ============ THE RING'S FLASH (owner, 2026-11-16) ============
// "When the circle passes over the enemy, they flash white like they do for
// physical hits ... radiating out from the center. Tie this to the AOE of the
// attacks." Each frame draw.js calls collectRings(g) once; it lists every
// attack ring on the ground and how far out its front has rolled NOW, from the
// effect's own `r` (the attack's area: a projectile's `splash`, a nova's
// `range`, a log's blast, the hero's slam reach) and the same easing its
// painter uses (fx.js BLAST, rings.js). enemies.js then asks ringFlash(e.x, e.y)
// for each foe: true while a ring's growing front is over it (the engine centres a blast on its mark's x, y), so the
// white flash runs out from the centre foe by foe. Visual only: the engine's
// damage is unchanged. A new area attack: give its effect `r` and a line in RING.

const easeOut = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;
const RY_BLAST = 0.7;     // fx.js RY: a blast's ring is a circle seen at 3/4

// type -> [life ms (if the effect has no `life`), squash, front(p) as a fraction of r, p where it stops growing]
const RING = {
  boom: [320, RY_BLAST, (p) => 0.3 + 0.7 * easeOut(p / 0.72), 0.72],
  arcane: [320, RY_BLAST, (p) => 0.25 + 0.75 * easeOut(p / 0.7), 0.7],
  keg: [320, RY_BLAST, (p) => 0.3 + 0.7 * easeOut(p / 0.7), 0.7],
  frost: [320, RY_BLAST, (p) => 0.3 + 0.7 * easeOut(p / 0.7), 0.7],
  dust: [380, RY_BLAST, (p) => 0.3 + 0.7 * easeOut(p / 0.7), 0.7],
  frostnova: [500, 1, (p) => easeOut(p * 1.25), 0.8],
  firenova: [450, 1, (p) => easeOut(p * 1.15), 0.87],
};

const LIVE = [];          // [x, y, front, squash, band] for this frame
export const collectRings = (g) => {
  LIVE.length = 0;
  if (!g.effects) return;
  for (const fx of g.effects) {
    const def = RING[fx.type];
    let p, front, sq, end;
    if (def) {
      const life = def[1] === 1 ? fx.life || def[0] : fx.life || fx._l || Math.max(fx.ttl, def[0]); // as fx.js lifeOf / rings.js lifeP
      p = 1 - fx.ttl / life;
      if (p < 0 || p >= def[3]) continue;
      front = (fx.r || 16) * def[2](p); sq = def[1]; end = def[3];
    } else if (fx.type === "slam") {
      const wave = fx.wave || 450, life = fx.life || wave;
      p = Math.min(1, Math.max(0, (life - fx.ttl) / wave));
      if (p >= 1 / 1.3) continue;
      front = (fx.r || 62) * easeOut(p * 1.3); sq = 1; end = 1 / 1.3;
    } else continue;
    // the band the flash spans behind the front: wide enough that no foe is
    // skipped between two frames, never the whole disc
    const band = Math.max(5, (fx.r || 16) * 0.22);
    LIVE.push(fx.x, fx.y, front, sq, band);
  }
};

// is a ring's front passing over the ground point (x, y) right now?
export const ringFlash = (x, y) => {
  for (let i = 0; i < LIVE.length; i += 5) {
    const dx = x - LIVE[i], dy = (y - LIVE[i + 1]) / LIVE[i + 3], d = Math.sqrt(dx * dx + dy * dy), f = LIVE[i + 2];
    if (d <= f + 1 && d >= f - LIVE[i + 4]) return true;
  }
  return false;
};
