// ============ WHICH TRACK, WHEN ============
// The one place that decides what the game plays. Pure: give it the state,
// get a track id (see tracks/index.js). CrownguardGame calls it every frame
// in battle and music.play() ignores a repeat.

const AREAS = ["greenwood", "iron", "hollow"];

// The area a faction's music belongs to (anything unknown plays Greenwood's).
export const areaOf = (factionId) => (AREAS.includes(factionId) ? factionId : "greenwood");

// g: the live game state; factionId: the faction in the field.
export function battleScore(g, factionId) {
  const area = areaOf(factionId);
  if (g.phase === "won") return "victory";
  if (g.phase === "lost") return "defeat";
  if (g.phase === "combat") {
    const boss = g.enemies.some((e) => e.boss && !e.dead);
    return `${area}-${boss ? "boss" : "fight"}`;
  }
  return `${area}-build`;
}

// Everything that is not the battlefield.
export const menuScore = (screen) => (screen === "map" ? "map" : "title");
