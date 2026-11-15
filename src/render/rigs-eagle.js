// ============ RIGS: THE SKYKNIGHT'S WAR-EAGLE ============
// The Falconry's Skyknight form: the eagle and its rider, one figure ("eagle" in rigs.js RIGS);
// draw.js flies it (the eagle's state is update.js t.eagle). The sculpted eagle and falconer
// (pix/bird-eagle.js) is drawn through the PIX table (pix/pixrigs.js: both facings baked with one
// sun, spell light on it). The old painter is gone.
//
// "walk" frames 0..3 are the cruise's wingbeats: 0 up, 1 level, 2 down, 3 rising. The attack
// clip's four frames are the lance pass draw.js's strafing run plays in order (and the air duel
// reuses): 0 the dive, 1 the strike, 2 the follow-through, 3 the climb.
import { PIX } from "./pix/pixrigs.js";
import * as eagleFig from "./pix/bird-eagle.js";
PIX.eagle = { fig: { ...eagleFig, NAME: "eagle" }, atk: "attack", hit: 0.5, legacy: [0, 1, 2, 3], fx: false };
