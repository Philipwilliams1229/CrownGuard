// ============ WHICH TRACK, WHEN ============
// The one place that decides what the game plays. Pure: give it the state,
// get a track id (see tracks/index.js). CrownguardGame calls it every frame
// in battle and music.play() ignores a repeat.

const AREAS = ["greenwood", "iron", "hollow"];

// The area a faction's music belongs to (anything unknown plays Greenwood's).
export const areaOf = (factionId) => (AREAS.includes(factionId) ? factionId : "greenwood");

// g: the live game state; factionId: the faction in the field.
// One continuous piece per battle (owner, 2026-10-02): the area's calm
// `-build` theme until the first horn (the same one its realm plays on the
// campaign map, so it runs on unbroken into the level), then its `-fight`
// theme for every wave AND the build phases between them. A boss on the field
// takes over with `-boss`; when he falls the fight theme picks up where it
// left off (music.js remembers its place) instead of starting over.
export function battleScore(g, factionId) {
  const area = areaOf(factionId);
  if (g.phase === "won") return "victory";
  if (g.phase === "lost") return "defeat";
  if (g.wave < 1) return `${area}-build`;
  const boss = g.phase === "combat" && g.enemies.some((e) => e.boss && !e.dead);
  return `${area}-${boss ? "boss" : "fight"}`;
}

// The campaign map plays the build theme of the realm whose level card is open.
export const mapScore = (factionId) => `${areaOf(factionId)}-build`;

// Everything else that is not the battlefield (the campaign map has mapScore).
export const menuScore = () => "title";
