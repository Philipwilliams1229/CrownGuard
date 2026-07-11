// ============ WAVES ============
// The 15 scripted waves. Each entry is [enemyType, count, gapMs between spawns].
// waveHpMult scales enemy HP up over time; waveBonus is the clear reward.

export const WAVES = [
  [["goblin", 8, 900]],
  [["goblin", 12, 750]],
  [["goblin", 8, 700], ["wolf", 4, 600]],
  [["orc", 8, 950]],
  [["goblin", 10, 550], ["wolf", 7, 500]],
  [["orc", 9, 850], ["armored", 4, 1100]],
  [["wolf", 16, 420]],
  [["orc", 10, 750], ["armored", 6, 950]],
  [["troll", 2, 2500], ["goblin", 12, 480]],
  [["armored", 10, 800], ["wolf", 8, 450]],
  [["troll", 4, 2000], ["orc", 10, 650]],
  [["goblin", 22, 340], ["wolf", 12, 380]],
  [["armored", 13, 650], ["troll", 4, 1800]],
  [["troll", 6, 1500], ["orc", 12, 550], ["wolf", 8, 420]],
  [["armored", 8, 900], ["dragon", 1, 0]],
];

export const waveHpMult = (w) => 1 + (w - 1) * 0.13;
export const waveBonus = (w) => 55 + w * 9;
