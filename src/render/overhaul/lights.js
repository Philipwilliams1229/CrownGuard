// The overhaul's lived-in lights (art/briefs/overhaul-build-millrace.md, B4): when the farm's windows glow
// and its lanterns burn. Windows: lit at sunrise, late afternoon and golden hour (a baked lit twin of each
// house, decor.js) and under the night (nightOn: the Blood Moon's painter runs). Lanterns: always show
// their warm horn panes (baked); at night each one is a real lamp through nightlight.js noteLamp, noted
// while the frame's drawables are pushed (the bloom is laid by the night painter after them, the pools
// next frame from the kept list), as the Knight Garrison's rally-flag lantern is.
import { DAY } from "../../data/sun.js";
import { prefs } from "../../data/prefs.js";
import { nightOn, noteLamp } from "../nightlight.js";

const WARM_HOURS = new Set(["sunrise", "late", "golden"]);
// the windows' state this frame: "lit" or "day"
export const windowsLit = (time) => WARM_HOURS.has(DAY.id) || nightOn(time);

// note every lantern of the placed pieces as a lamp (board units). lamps: [[x, y, r, col]] in ART px from
// each piece's foot (already mirrored with the piece); a slow, stepped flicker per lamp
export const noteFarmLamps = (pieces, time) => {
  if (!nightOn(time) || prefs.spellLight === false) return;
  let i = 0;
  for (const p of pieces) for (const [ax, ay, r, col] of p.lamps) {
    const fl = [1, 0.9, 0.96, 0.86, 1, 0.93][Math.floor(time * 7 + i * 1.7) % 6];
    noteLamp(p.x + ax / 2, p.y + ay / 2, Math.max(9, r / 2), col || "#ffb24a", 0.72 * fl, Math.max(2, -ay / 2));
    i++;
  }
};
