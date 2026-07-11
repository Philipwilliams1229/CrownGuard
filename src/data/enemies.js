// ============ ENEMIES ============
// Base stats for each foe. Wave HP scaling is applied on top at spawn time.

export const ENEMIES = {
  goblin: { hp: 55, speed: 82, bounty: 6, armor: 0, size: 15, name: "Goblin", atk: 10, atkRate: 800, castleDmg: 1 },
  wolf: { hp: 42, speed: 145, bounty: 6, armor: 0, size: 15, name: "Dire Wolf", atk: 12, atkRate: 650, castleDmg: 1 },
  orc: { hp: 135, speed: 62, bounty: 10, armor: 0, size: 18, name: "Orc", atk: 22, atkRate: 900, castleDmg: 2 },
  armored: { hp: 210, speed: 55, bounty: 14, armor: 0.5, size: 17, name: "Ironclad", atk: 18, atkRate: 900, castleDmg: 2 },
  troll: { hp: 560, speed: 40, bounty: 26, armor: 0.15, regen: 9, size: 21, name: "Troll", atk: 38, atkRate: 1100, castleDmg: 3 },
  dragon: { hp: 4300, speed: 34, bounty: 200, armor: 0.3, size: 27, name: "DRAGON", boss: true, atk: 0, atkRate: 0, castleDmg: 5 },
};
