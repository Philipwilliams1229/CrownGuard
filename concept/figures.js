// The concept cast: one module per figure (BOX, BONES, draw, fx?, CLIPS).
// `atk` names its attack clip; `now` the current game rig it stands beside.
import * as mage from "./fig-mage.js";
import * as knight from "./fig-knight.js";
import * as archer from "./fig-archer.js";
import * as goblin from "./fig-goblin.js";
import * as orc from "./fig-orc.js";
import * as necro from "./fig-necro.js";

const mk = (NAME, mod, o) => ({ ...mod, NAME, ...o });
export const FIGS = {
  knight: mk("knight", knight, { label: "Sir Aldric", atk: "attack", now: "heroKnight", side: "crown" }),
  archer: mk("archer", archer, { label: "Wren", atk: "attack", now: "heroHunter", side: "crown" }),
  mage: mk("mage", mage, { label: "Spire mage", atk: "cast", now: "heroStorm", nowLabel: "Ysolde, today's caster", side: "crown" }),
  goblin: mk("goblin", goblin, { label: "Goblin", atk: "attack", now: "goblin", side: "foe" }),
  orc: mk("orc", orc, { label: "Orc", atk: "attack", now: "orc", side: "foe" }),
  necro: mk("necro", necro, { label: "Necromancer", atk: "cast", now: "necro", side: "foe" }),
};
