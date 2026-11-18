// ============ PIX RIGS: the new sprites on the board ============
// The pixel sculptor's figures (pix.js, rig.js, fig-*.js) standing in for the
// old rigs, a figure at a time. A type listed in PIX is drawn from its new
// figure wherever the game draws a rig (rigs.js asks hasPix first); every
// other type keeps its old rig, and so does everything when the player turns
// "New sprites" off (Settings > Display).
//
// What the new figures bring, and how the game drives them:
//   - more frames. The old rigs had four walk and four fight frames picked by
//     number. These have 8-frame walks and 11-16 frame attacks, so the board
//     hands over a PHASE instead:
//       "walk"  frame 0..4 (may be fractional: the old four-frame count, kept
//               so every caller can pass what it always passed)
//       "idle"  frame = seconds (a soldier standing; the old rigs stood on walk 0)
//       "atk"   frame 0..1 through the attack clip, from the attack CLOCK
//               (atkFrac below), so the blow lands on the clip's own strike
//       "fight" / "sky"  the old frame numbers 0-3, mapped to the matching
//               moments of the new clip (for callers not yet moved to "atk")
//   - one sun. A figure facing left is drawn from frames baked for that side
//     (the light flipped, then the sprite mirrored), never mirrored light and all.
//   - light. A caster's own glow is a second sprite stamped over him; a fire
//     nearby (LIGHTS, filled by draw.js each frame) stamps a rim overlay on
//     whoever stands in it. "Spell light" in Settings turns both off.
import { prefs } from "../../data/prefs.js";
import { bakeFrame, rimOf } from "./bake.js";
import { vertWalk, marchesOnFoot } from "./march.js";
import * as knight from "./fig-knight.js";
import * as archer from "./fig-archer.js";
import * as goblin from "./fig-goblin.js";
import * as orc from "./fig-orc.js";
import * as necro from "./fig-necro.js";
import * as ironclad from "./fig-ironclad.js";
import * as troll from "./fig-troll.js";
import * as shaman from "./fig-shaman.js";
import * as warchief from "./fig-warchief.js";
import * as wolf from "./fig-wolf.js";
import * as boar from "./fig-boar.js";
import * as bat from "./fig-bat.js";
import * as dragon from "./fig-dragon.js";
import * as thrall from "./fig-thrall.js";
import * as berserker from "./fig-berserker.js";
import * as huscarl from "./fig-huscarl.js";
import * as rimeseer from "./fig-rimeseer.js";
import * as skald from "./fig-skald.js";
import * as rimejarl from "./fig-rimejarl.js";
import * as rimerider from "./fig-rimerider.js";
import * as frostgiant from "./fig-frostgiant.js";
import * as icedrake from "./fig-icedrake.js";
import * as mammoth from "./fig-mammoth.js";
import * as seaserpent from "./fig-seaserpent.js";
import * as risen from "./fig-risen.js";
import * as friar from "./fig-friar.js";
import * as captain from "./fig-captain.js";
import * as storm from "./fig-storm.js";
import * as levy from "./fig-levy.js";
import * as magister from "./fig-magister.js";
import * as crossbow from "./fig-crossbow.js";
import * as sergeant from "./fig-sergeant.js";
import * as chaplain from "./fig-chaplain.js";
import * as marshal from "./fig-marshal.js";
import * as cavalier from "./fig-cavalier.js";
import * as unhorsed from "./fig-unhorsed.js";
import * as gryphon from "./fig-gryphon.js";
import * as ram from "./fig-ram.js";
import * as wolfrider from "./fig-wolfrider.js";
import * as rafter from "./fig-rafter.js";
import * as garrison from "./fig-garrison.js";
import * as paladin from "./fig-paladin.js";
import * as squire from "./fig-squire.js";
import * as farmer from "./fig-farmer.js";
import * as errant from "./fig-errant.js";
import * as errantbow from "./fig-errantbow.js";
import * as champion from "./fig-champion.js";
import * as fieldbow from "./fig-fieldbow.js";
import * as wraith from "./fig-wraith.js";
import * as bonearcher from "./fig-bonearcher.js";
import * as ghoul from "./fig-ghoul.js";
import * as ghast from "./fig-ghast.js";
import * as gravecaller from "./fig-gravecaller.js";
import * as hollowking from "./fig-hollowking.js";
import * as amalgam from "./fig-amalgam.js";
import * as crypt from "./fig-crypt.js";
import * as halberdier from "./fig-halberdier.js";
import * as blade from "./fig-blade.js";
import * as skiff from "./fig-skiff.js";

const mk = (NAME, mod) => ({ ...mod, NAME });
// fig     the figure
// atk     the clip a blow plays;  hit: where in it (0..1) the blow lands
// per     gait units (14 px of road each, engine update.js e.gait) to one walk cycle:
//         the foe's speed x the walk clip's seconds / 14, so it steps at the pace it was drawn at
// legacy  the clip frames that stand for the old four fight frames (melee: guard,
//         wind-up, strike, follow-through; a bowman: full draw, loose, reach, nock)
// sky     the same for the old "sky" sheet (Wren's Arrow Volley, Ysolde's Thunderclap)
// sweep   the same for Hale's six-frame "sweep" sheet
// fx      draw the clip's own effect layer (a blade's smear). Off where the
//         engine already flies the real thing (Wren's arrow).
// variant a look of the same figure (handed to its draw as o.variant): the bare-headed
//         goblin, the boar without its rider
// views   { front, back }: the same figure seen from the front (walking DOWN the screen) and from
//         behind (walking UP it), each a figure module with a `walk` clip in step with the side
//         walk (same n and ms). Drawn unmirrored. Owner, 2026-11-17: side, front and back only,
//         a plain switch between them (no in-between poses). fig-<name>-views.js.
// casts   things it does ON THE MARCH, each a walk-shaped clip in step with "walk" (same
//         legs, other arms and light) worn while an engine clock says so:
//         { clip, clock, every, lead, hold }: from `lead` ms before e[clock] runs out
//         until `hold` ms after it is reset to e[every]
export const PIX = {
  heroKnight: { fig: mk("knight", knight), atk: "attack", hit: 0.5, legacy: [0, 4, 6, 7], fx: true },
  heroHunter: { fig: mk("archer", archer), atk: "attack", hit: 0.62, legacy: [7, 9, 10, 12], sky: [0, 1, 2, 3], fx: false },
  // the newer heroes (owner's picks, 2026-11-14: Osric A, Hale C without the banner, Ysolde A)
  heroFriar: { fig: mk("friar", friar), atk: "attack", hit: 0.56, legacy: [0, 4, 7, 9], fx: true },
  heroCaptain: { fig: mk("captain", captain), atk: "attack", hit: 0.52, legacy: [0, 4, 6, 8], sweep: [0, 1, 2, 3, 4, 5], fx: true },
  heroStorm: { fig: mk("storm", storm), atk: "attack", hit: 0.6, legacy: [0, 7, 8, 11], sky: [0, 1, 2, 3], fx: true },
  // the crown's soldiers (walk by time, so no per)
  knight: { fig: mk("garrison", garrison), atk: "attack", hit: 0.5, legacy: [0, 4, 6, 7], fx: true },
  paladin: { fig: mk("paladin", paladin), atk: "attack", hit: 0.5, legacy: [0, 4, 6, 7], fx: true },
  squire: { fig: mk("squire", squire), atk: "attack", hit: 0.5, legacy: [0, 4, 6, 7], fx: true },
  farmer: { fig: mk("farmer", farmer), atk: "attack", hit: 0.52, legacy: [0, 3, 5, 7], fx: true },
  yeoman: { fig: mk("farmer", farmer), variant: "yeoman", atk: "attack", hit: 0.52, legacy: [0, 3, 5, 7], fx: true },
  errant: { fig: mk("errant", errant), atk: "attack", hit: 0.5, legacy: [0, 4, 6, 7], fx: true },
  errantBow: { fig: mk("errantbow", errantbow), atk: "shoot", hit: 0.44, legacy: [6, 7, 9, 13], fx: true },
  errantRider: { fig: mk("cavalier", cavalier), variant: "errant", atk: "attack", hit: 0.5, per: 3.4, legacy: [0, 3, 6, 7], fx: true },
  champion: { fig: mk("champion", champion), atk: "attack", hit: 0.52, legacy: [0, 4, 7, 8], fx: true },
  // the Gate Guard's halberdiers on the road before the gate (the castle works; the wall sentry is drawn by castle.js)
  halberdier: { fig: mk("halberdier", halberdier), variant: "guard", atk: "thrust", hit: 0.5, legacy: [0, 3, 6, 9], fx: true },
  bowman: { fig: mk("fieldbow", fieldbow), atk: "shoot", hit: 0.62, legacy: [7, 9, 10, 12], fx: false },
  // the Assassin's Covert blades, one figure and a look per form (fig-blade.js)
  assassinUnit: { fig: mk("blade", blade), variant: "base", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  assassinUnitA: { fig: mk("blade", blade), variant: "a", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  assassinUnitB: { fig: mk("blade", blade), variant: "b", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  assassinUnitAA: { fig: mk("blade", blade), variant: "aa", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  assassinUnitAB: { fig: mk("blade", blade), variant: "ab", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  assassinUnitBA: { fig: mk("blade", blade), variant: "ba", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  assassinUnitBB: { fig: mk("blade", blade), variant: "bb", atk: "attack", hit: 0.5, legacy: [0, 4, 6, 8], fx: true },
  // the River Watch's skiff, a look per hall branch; the frame is "<gun pose>.<row 0-4>" (fig-skiff.js)
  skiff: { fig: mk("skiff", skiff), variant: "base", atk: "kick", aimClips: ["aim", "raise", "recoil"], hit: 0.5, legacy: [0, 0, 0, 0], fx: false },
  skiffA: { fig: mk("skiff", skiff), variant: "a", atk: "kick", aimClips: ["aim", "raise", "recoil"], hit: 0.5, legacy: [0, 0, 0, 0], fx: false },
  skiffB: { fig: mk("skiff", skiff), variant: "b", atk: "kick", aimClips: ["aim", "raise", "recoil"], hit: 0.5, legacy: [0, 0, 0, 0], fx: false },
  // ---- the Greenwood horde ----
  goblin: { fig: mk("goblin", goblin), atk: "attack", hit: 0.47, per: 3.5, legacy: [0, 4, 5, 6], fx: true },
  goblinBare: { fig: mk("goblin", goblin), variant: "bare", atk: "attack", hit: 0.47, per: 3.05, legacy: [0, 4, 5, 6], fx: true },
  orc: { fig: mk("orc", orc), atk: "attack", hit: 0.55, per: 4, legacy: [0, 6, 7, 9], fx: true },
  armored: { fig: mk("ironclad", ironclad), atk: "attack", hit: 0.583, per: 3.5, legacy: [0, 5, 7, 8], fx: true },
  troll: { fig: mk("troll", troll), atk: "attack", hit: 0.6, per: 3.6, legacy: [0, 7, 9, 10], fx: true },
  // (the shaman's chant: healCd runs down to each heal and is reset to healEvery)
  shaman: { fig: mk("shaman", shaman), atk: "attack", hit: 0.52, per: 2.4, legacy: [0, 4, 6, 7], fx: true, casts: [{ clip: "chant", clock: "healCd", every: "healEvery", lead: 500, hold: 700 }] },
  // (the warchief's horn: summonCd, the same way)
  hobgoblin: { fig: mk("warchief", warchief), atk: "attack", hit: 0.54, per: 3.5, legacy: [0, 5, 7, 8], fx: true, casts: [{ clip: "horn", clock: "summonCd", every: "summonEvery", lead: 900, hold: 900 }] },
  wolf: { fig: mk("wolf", wolf), atk: "attack", hit: 0.52, per: 3.4, legacy: [0, 3, 4, 6], fx: true },
  boarrider: { fig: mk("boar", boar), atk: "attack", hit: 0.48, per: 2.9, legacy: [0, 3, 5, 6], fx: true },
  boarMount: { fig: mk("boar", boar), variant: "loose", atk: "attack", hit: 0.48, per: 2.9, legacy: [0, 3, 5, 6], fx: true },
  bat: { fig: mk("bat", bat), atk: "attack", hit: 0.56, legacy: [0, 2, 4, 5], fx: false },
  dragon: { fig: mk("dragon", dragon), atk: "attack", hit: 0.4, legacy: [0, 4, 6, 9], fx: true },
  // (his raise: the engine resets raiseCd to raiseEvery when the dead get up, and holds it at 0 while there are none)
  // ---- the Iron Kingdom (owner's picks, 2026-11-14: levy B, the magister A with C's staff) ----
  levy: { fig: mk("levy", levy), atk: "attack", hit: 0.5, per: 3.9, legacy: [0, 3, 5, 8], fx: true },
  // (his aegis: wardCd runs down to each ward and is reset to wardEvery)
  magister: { fig: mk("magister", magister), atk: "cast", hit: 0.54, per: 3.15, legacy: [0, 4, 7, 10], fx: true, casts: [{ clip: "ward", clock: "wardCd", every: "wardEvery", lead: 500, hold: 700 }] },
  crossbow: { fig: mk("crossbow", crossbow), atk: "shoot", hit: 0.44, per: 4.0, legacy: [6, 7, 9, 13], fx: true },
  sergeant: { fig: mk("sergeant", sergeant), atk: "attack", hit: 0.5, per: 3.7, legacy: [0, 4, 6, 8], fx: true },
  // (his heal: healCd runs down to each heal and is reset to healEvery)
  chaplain: { fig: mk("chaplain", chaplain), atk: "attack", hit: 0.54, per: 3.5, legacy: [0, 4, 7, 9], fx: true, casts: [{ clip: "heal", clock: "healCd", every: "healEvery", lead: 500, hold: 700 }] },
  marshal: { fig: mk("marshal", marshal), atk: "attack", hit: 0.5, per: 3.3, legacy: [0, 5, 6, 8], fx: true },
  cavalier: { fig: mk("cavalier", cavalier), atk: "attack", hit: 0.5, per: 3.4, legacy: [0, 3, 6, 7], fx: true },
  cavalierMount: { fig: mk("cavalier", cavalier), variant: "loose", atk: "attack", hit: 0.5, per: 3.4, legacy: [0, 3, 6, 7], fx: true },
  loosehorse: { fig: mk("cavalier", cavalier), variant: "bolt", atk: "attack", hit: 0.5, per: 5.0, legacy: [0, 3, 6, 7], fx: true },
  unhorsed: { fig: mk("unhorsed", unhorsed), atk: "attack", hit: 0.5, per: 3.4, legacy: [0, 3, 6, 9], fx: true },
  unseated: { fig: mk("unhorsed", unhorsed), variant: "gryphon", atk: "attack", hit: 0.5, per: 3.6, legacy: [0, 3, 6, 9], fx: true },
  gryphon: { fig: mk("gryphon", gryphon), atk: "attack", hit: 0.5, legacy: [0, 2, 8, 11], fx: true },
  gryphonMount: { fig: mk("gryphon", gryphon), variant: "loose", atk: "attack", hit: 0.5, legacy: [0, 2, 8, 11], fx: true },
  ram: { fig: mk("ram", ram), atk: "attack", hit: 0.5, per: 3.5, legacy: [0, 1, 6, 8], fx: true },
  // ---- the Hollow Court (owner's pick, 2026-11-14: Risen A, wraith B) ----
  skeleton: { fig: mk("risen", risen), atk: "attack", hit: 0.52, per: 3.5, legacy: [0, 3, 5, 7], fx: false },
  wraith: { fig: mk("wraith", wraith), atk: "attack", hit: 0.56, legacy: [0, 3, 5, 7], fx: true },
  bonearcher: { fig: mk("bonearcher", bonearcher), atk: "shoot", hit: 0.64, per: 3.7, legacy: [8, 9, 11, 2], fx: false },
  ghoul: { fig: mk("ghoul", ghoul), atk: "attack", hit: 0.54, per: 3.35, legacy: [0, 3, 5, 7], fx: false },
  ghast: { fig: mk("ghast", ghast), atk: "attack", hit: 0.54, per: 4.7, legacy: [0, 3, 5, 8], fx: true },
  // (his bell: summonCd runs down to each toll and is reset to summonEvery)
  gravecaller: { fig: mk("gravecaller", gravecaller), atk: "strike", hit: 0.54, per: 3.8, legacy: [0, 4, 5, 7], fx: true, casts: [{ clip: "toll", clock: "summonCd", every: "summonEvery", lead: 900, hold: 900 }] },
  // (the Barrow Wight: a figure of its own inside fig-wraith.js, a third bigger with slower clips)
  wight: { fig: mk("wight", wraith.WIGHT), atk: "attack", hit: 0.56, legacy: [0, 3, 5, 7], fx: true },
  hollowking: { fig: mk("hollowking", hollowking), atk: "attack", hit: 0.54, per: 3.6, legacy: [0, 4, 8, 10], fx: true, casts: [{ clip: "toll", clock: "summonCd", every: "summonEvery", lead: 900, hold: 900 }] },
  amalgam: { fig: mk("amalgam", amalgam), atk: "attack", hit: 0.56, per: 2.8, legacy: [0, 4, 8, 10], fx: false },
  crypt: { fig: mk("crypt", crypt), atk: "attack", hit: 0.54, per: 3.2, legacy: [0, 4, 8, 10], fx: false },
  // the rest of the horde's rigs
  wolfrider: { fig: mk("wolfrider", wolfrider), atk: "attack", hit: 0.52, per: 3.4, legacy: [0, 3, 4, 6], fx: true },
  rafter: { fig: mk("rafter", rafter), atk: "attack", hit: 0.5, per: 3.5, legacy: [0, 3, 6, 8], fx: true },
  // ---- the Rime Clans (owner's pick, 2026-11-14: look C) ----
  thrall: { fig: mk("thrall", thrall), atk: "attack", hit: 0.55, per: 4.2, legacy: [0, 3, 6, 8], fx: true },
  berserker: { fig: mk("berserker", berserker), atk: "attack", hit: 0.52, per: 4.4, legacy: [0, 3, 6, 8], fx: true },
  // (raging he walks at 0.8 of his pace: per follows)
  berserkerRage: { fig: mk("berserker", berserker), variant: "rage", atk: "attack", hit: 0.52, per: 3.5, legacy: [0, 3, 6, 8], fx: true },
  huscarl: { fig: mk("huscarl", huscarl), atk: "attack", hit: 0.56, per: 3.2, legacy: [0, 5, 7, 9], fx: true },
  // (the shroud: freezeCd runs down to each freeze and is reset to freezeEvery)
  rimeseer: { fig: mk("rimeseer", rimeseer), atk: "attack", hit: 0.56, per: 2.7, legacy: [0, 5, 7, 9], fx: true, casts: [{ clip: "freeze", clock: "freezeCd", every: "freezeEvery", lead: 700, hold: 800 }] },
  // (his "chant" clip is drawn, unused: the engine keeps no clock for the war-chant)
  skald: { fig: mk("skald", skald), atk: "attack", hit: 0.54, per: 3.2, legacy: [0, 4, 6, 8], fx: true },
  rimejarlfoot: { fig: mk("rimejarl", rimejarl), atk: "attack", hit: 0.56, per: 2.6, legacy: [0, 6, 7, 9], fx: true, casts: [{ clip: "song", clock: "freezeCd", every: "freezeEvery", lead: 800, hold: 900 }] },
  rimerider: { fig: mk("rimerider", rimerider), atk: "attack", hit: 0.5, per: 2.65, legacy: [0, 4, 6, 7], fx: true },
  rimewolf: { fig: mk("rimerider", rimerider), variant: "loose", atk: "attack", hit: 0.5, per: 2.65, legacy: [0, 4, 6, 7], fx: true },
  frostgiant: { fig: mk("frostgiant", frostgiant), atk: "attack", hit: 0.5625, per: 3.8, legacy: [0, 5, 8, 10], fx: true },
  // (its frost breath is drawn, unused: the drake has no blow the engine plays)
  icedrake: { fig: mk("icedrake", icedrake), atk: "attack", hit: 0.52, legacy: [0, 3, 5, 6], fx: false },
  // the Jarl on his war-mammoth (the boss), his frost song on the march
  rimejarl: { fig: mk("mammoth", mammoth), atk: "attack", hit: 0.5, per: 2.3, legacy: [0, 4, 7, 10], fx: true, casts: [{ clip: "song", clock: "freezeCd", every: "freezeEvery", lead: 800, hold: 900 }] },
  // the sea monsters (drawn at the waterline by rigs-rimebeasts.js drawSeaRig; seized victims
  // are still painted by its old drawSeaHold)
  seaserpent: { fig: mk("seaserpent", seaserpent), atk: "attack", hit: 0.55, legacy: [0, 4, 5, 7], fx: false },
  // (kraken: fig-kraken.js is drawn but held back: the seized-victim coil (drawSeaHold) is still the old painter, and the body needs another pass)
  // (krakenarm: fig-krakenarm.js is drawn but held back: the seized-victim coil (drawSeaHold) is still the old painter, and the body needs another pass)
  necro: { fig: mk("necro", necro), atk: "strike", hit: 0.54, per: 3, legacy: [0, 5, 6, 8], fx: true, casts: [{ clip: "raise", clock: "raiseCd", every: "raiseEvery", lead: -1, hold: 900 }] },
};
// Front and back views (owner, 2026-11-17): every fig-<name>-views.js beside its figure, once the
// lead has checked it and added <name> to VIEWS_ON, gives each PIX entry drawn from that figure
// its `views` (the board then shows its back walking up the screen, its face walking down).
const VIEW_FILES = import.meta.glob("./fig-*-views.js", { eager: true });
export const VIEWS_ON = new Set(["goblin", "shaman", "orc", "ironclad", "troll", "warchief", "necro", "halberdier", "blade", "knight", "archer", "captain", "storm", "friar", "thrall", "huscarl", "berserker", "rafter", "garrison", "squire", "paladin", "champion", "risen", "bonearcher", "ghoul", "ghast", "levy", "crossbow", "sergeant", "unhorsed", "boar", "wolfrider", "rimerider", "gravecaller", "hollowking", "amalgam", "crypt", "farmer", "errant", "errantbow", "fieldbow", "cavalier", "wolf"]);
for (const d of Object.values(PIX)) {
  const name = d.fig.NAME, m = VIEWS_ON.has(name) && VIEW_FILES[`./fig-${name}-views.js`];
  if (m && m.FRONT && m.BACK) d.views = { front: m.FRONT, back: m.BACK };
}
// Up and down the screen every two-legged walker steps under himself instead of
// striding sideways (march.js): four more walks per figure, baked as they are asked for.
for (const d of Object.values(PIX)) {
  if (!marchesOnFoot(d.fig)) continue;
  const W = d.fig.CLIPS.walk;
  d.fig = { ...d.fig, CLIPS: { ...d.fig.CLIPS, walkU: vertWalk(W, 1, -1), walkUh: vertWalk(W, 0.5, -1), walkD: vertWalk(W, 1, 1), walkDh: vertWalk(W, 0.5, 1) } };
  d.vert = true;
}
// the walk sheet for a figure heading `v` up (-1) or down (+1) the screen (render/march.js
// keeps v): the side walk, half-way, or fully foreshortened
export const vertSheet = (type, sheet, v) => {
  if (sheet !== "walk" || !v || !hasPix(type)) return sheet;
  const a = Math.abs(v);
  // a figure drawn from the front and behind shows its back walking up, its face walking down
  if (PIX[type].views && a > 0.6) return v < 0 ? "walkBack" : "walkFront";
  if (!PIX[type].vert) return sheet;
  return a > 0.8 ? (v < 0 ? "walkU" : "walkD") : a > 0.45 ? (v < 0 ? "walkUh" : "walkDh") : sheet;
};
export const hasPix = (type) => Object.prototype.hasOwnProperty.call(PIX, type);

// the rig's box for a pix type (world units, as RIGS' boxes are): symmetric about the feet
export const pixBox = (type) => { const { w, h, ox, oy } = PIX[type].fig.BOX; return { hw: Math.max(ox, w - ox) / 2, up: oy / 2, down: (h - oy) / 2 }; };

const frac = (v) => v - Math.floor(v);
// the walk sheet a marching foe wears just now: "walk", or a cast it is in the middle of
export const marchSheet = (type, e, tms = 0) => {
  for (const c of PIX[type].casts || []) {
    const cd = e[c.clock], every = e[c.every];
    if (cd == null || !every || (e.silencedUntil || 0) > tms) continue;
    if (cd <= c.lead || every - cd < c.hold) return c.clip;
  }
  return "walk";
};
// (sheet, frame) as the game gives them -> [clip, frame index]
const clipFrame = (d, sheet, frame) => {
  const C = d.fig.CLIPS, f = typeof frame === "number" ? frame : 0;
  // the sea monsters ask for named frames ("sub.2", "rise.0": rigs-rimebeasts.js seaFrame)
  if (typeof frame === "string") { const [nm, i] = frame.split("."); if (C[nm]) return [nm, (+i || 0) % C[nm].n]; }
  if (sheet === "idle") { const c = C.idle; return ["idle", Math.floor(frac((f * 1000) / c.ms) * c.n) % c.n]; }
  if (sheet === "atk") { const c = C[d.atk]; return [d.atk, Math.max(0, Math.min(c.n - 1, Math.round(f * (c.n - 1))))]; }
  if (sheet === "sky" && d.sky) return ["sky", d.sky[(f | 0) % d.sky.length]];
  // Hale's Halberd Sweep: its own six frames
  if (sheet === "sweep" && d.sweep) return ["sweep", d.sweep[(f | 0) % d.sweep.length]];
  if (sheet === "fight" || sheet === "sky" || sheet === "sweep") return [d.atk, d.legacy[(f | 0) % 4] ?? 0];
  // "walk", a flier's "fly" (its walk clip is its wingbeat), or a marching cast: all loops in step
  const name = C[sheet] && C[sheet].loop ? sheet : "walk", c = C[name]; return [name, Math.floor(frac(f / 4) * c.n) % c.n];
};
// the baked frame record (bake.js) for what the game asked; left: the figure faces left
// `aim` (degrees in the figure's own frame, engine/aim.js) turns a shooter's bow or gun to its mark: the
// figure reads it as "<variant>@<deg>" (art/briefs/aim-contract.md); only the shooting clip takes it
export const isViewSheet = (sheet) => sheet === "walkFront" || sheet === "walkBack";
export const pixRec = (type, sheet, frame, left = false, aim = 0) => {
  const d = PIX[type];
  // the front / back views: their own figure, the walk in step with the side one, never mirrored
  if (isViewSheet(sheet) && d.views) {
    const vf = sheet === "walkFront" ? d.views.front : d.views.back, c = vf.CLIPS.walk;
    const f = Math.floor((((typeof frame === "number" ? frame : 0) / 4) % 1 + 1) % 1 * c.n) % c.n;
    return bakeFrame(vf, "walk", f, { flip: false, variant: d.variant });
  }
  const [clip, f] = clipFrame(d, sheet, frame);
  const v = aim && (clip === d.atk || d.aimClips?.includes(clip)) ? `${d.variant || ""}@${aim}` : d.variant;
  return bakeFrame(d.fig, clip, f, { flip: left, variant: v });
};

// Baking ahead. A frame is baked the first time the board asks for it: under a
// millisecond for most figures, 5-15 ms for the dragon (measured on the dev Mac).
// So that no figure hitches the first time it walks on, the walks are baked in
// the quiet moments after the game loads: a few milliseconds at a time, the
// biggest figures first, both facings. Anything not reached yet still bakes on demand.
let warming = false;
export const warmPix = () => {
  if (warming || typeof document === "undefined") return;
  warming = true;
  const jobs = [];
  for (const type of Object.keys(PIX).sort((a, b) => PIX[b].fig.BOX.w * PIX[b].fig.BOX.h - PIX[a].fig.BOX.w * PIX[a].fig.BOX.h)) {
    const d = PIX[type], n = d.fig.CLIPS.walk.n;
    for (const flip of [false, true]) for (let f = 0; f < n; f++) jobs.push([d, f, flip]);
  }
  const later = (fn) => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 60));
  const step = () => {
    const t0 = performance.now();
    while (jobs.length && performance.now() - t0 < 4) { const [d, f, flip] = jobs.shift(); bakeFrame(d.fig, "walk", f, { flip, variant: d.variant }); }
    if (jobs.length) later(step);
  };
  setTimeout(() => later(step), 1500);
};

// Where an attack clip stands, from the attack clock: `until` ms to the next
// blow, `rate` ms between blows. The wind-up is timed so the clip's strike
// lands exactly on the blow, the follow-through plays out after it, and in
// between the figure holds its guard (frame 0). A clip longer than the wait
// between blows is hurried to fit.
export const atkFrac = (type, until, rate) => {
  const d = PIX[type], clip = d.fig.CLIPS[d.atk], r = rate > 0 ? rate : clip.ms;
  const D = Math.min(clip.ms, r * 0.96), pre = d.hit * D, post = (1 - d.hit) * D, since = r - until;
  if (until <= pre) return d.hit * (1 - Math.max(0, until) / pre);
  if (since >= 0 && since < post) return d.hit + (1 - d.hit) * (since / post);
  return 0;
};
// a walk as the old four-frame count (0..4), for a foe from the ground it has covered...
export const walkByGait = (type, gait, id) => frac((gait || 0) / (PIX[type].per || 2.5) + (id || 0) * 0.37) * 4;
// ...and for a soldier from the clock (they march at one pace)
export const walkByTime = (type, time, id) => frac((time * 1000) / PIX[type].fig.CLIPS.walk.ms + (id || 0) * 0.37) * 4;

// ---- light on the board ---------------------------------------------------------
// Whatever burns this frame: draw.js clears the list, adds a light for each
// fire (a Dragonbreath jet is a few along its length), then draws the crowd.
// A light: { x, y, r, col, k } in board units; k its strength 0..1.
export const LIGHTS = [];
export const beginLights = () => { LIGHTS.length = 0; };
export const addLight = (x, y, r, col, k) => { if (k > 0.02) LIGHTS.push({ x, y, r, col, k }); };
// the strongest light reaching a point: { k (in fifths), col, dx } or null
export const lightAt = (x, y) => {
  let best = null, bk = 0;
  for (const L of LIGHTS) {
    const d = Math.hypot(L.x - x, (L.y - y) * 1.3);
    if (d >= L.r) continue;
    // full strength over the inner 40%, falling away to the rim
    const k = L.k * Math.min(1, (1 - d / L.r) / 0.6);
    if (k > bk) { bk = k; best = L; }
  }
  if (!best) return null;
  const k = Math.round(bk * 5) / 5;
  return k > 0 ? { k, col: best.col, dx: best.x - x } : null;
};
// the rim overlay for a frame lit from one side: `toward` +1 the light is ahead of the
// figure (the way it faces), -1 behind it
export const pixRim = (rec, toward, col) => rimOf(rec, [toward, -0.35], col);

// ---- icons ------------------------------------------------------------------------
// A figure standing, cropped to its own pixels (menus frame icons by the rig's
// box, and a pix box has room for a swung sword in it).
const ICONS = new Map();
export const pixIcon = (type) => {
  let ic = ICONS.get(type);
  if (ic) return ic;
  const rec = pixRec(type, "idle", 0), src = rec.cv;
  const d = src.getContext("2d").getImageData(0, 0, src.width, src.height).data;
  let x0 = src.width, x1 = 0, y0 = src.height, y1 = 0;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cv = document.createElement("canvas");
  cv.width = x1 - x0 + 3; cv.height = y1 - y0 + 3;
  cv.getContext("2d").drawImage(src, x0 - 1, y0 - 1, cv.width, cv.height, 0, 0, cv.width, cv.height);
  ic = { cv, w: cv.width / 2, h: cv.height / 2 };
  ICONS.set(type, ic);
  return ic;
};
