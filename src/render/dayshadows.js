// ============ THE DAY'S CAST SHADOWS (time of day; owner: the shadows agent, art/briefs/time-of-day.md) ============
// Under a fixed sun other than noon (data/sun.js DAY), in the ground pass:
//   - every soldier, hero, militiaman and ground foe throws a long shadow along DAY.fall, its height x DAY.len
//     long; a flier a short one on the ground below it, thrown the same way
//   - every hall throws its OWN silhouette from the outline of its base (render/sunset.js bakeHallSun: the
//     owner-approved rule for a shadow falling right, mirrored whole for an eastern sun)
//   - and arms the halls drawn next (pix/halls.js noteHall / hallRim) to note themselves for next frame's
//     shadow and stamp the sun's edge line and stepped wash on their sunward side in DAY.col at DAY.rim.
// The machinery is the blood moon's sunset (render/sunset.js), given a direction and a colour; at noon,
// and while the blood moon is up, nothing here runs (daylight.js `live`).
import { DAY } from "../data/sun.js";
import { drawLongShadows, drawHallShadows, dayFrame } from "./sunset.js";

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixTo = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// The sun's parameters, made once per sun (DAY.v)
let P = null;
const dayParams = () => {
  if (P && P.v === DAY.v) return P;
  const col = hex(DAY.col), sh = DAY.shade, v = DAY.v;
  // the edge line: the light's colour (a pale daylight one pushed a little warmer so it reads on pale stone);
  // the wash a step deeper
  const line = mixTo(mixTo(col, [255, col[1] * 0.9, col[2] * 0.7], 0.5 * DAY.warm), [255, 190, 110], 0.25 * (1 - DAY.warm)), soft = mixTo(col, [col[0], col[1] * 0.82, col[2] * 0.62], 1);
  P = {
    v, key: DAY.id + "." + v,
    side: DAY.side,
    fall: DAY.fall,
    F: DAY.side > 0 ? [-DAY.fall[0], DAY.fall[1]] : DAY.fall,   // the fall as a western sun's (bakes are made in that frame)
    rgb: sh.slice(0, 3),
    a: Math.min(1, sh[3] / 0.63),     // the sprites' bodies are baked at 160/255: reach the shade's own strength
    len: DAY.len, shear: 1,          // halls: DAY.len x their height
    unitH: 19, foeK: 1.15,           // figures' heights (board units; a foe's by its size)
    fliers: true,
    rim: DAY.rim, line, soft,
    live: (dv) => DAY.on && dv === DAY.v,
  };
  return P;
};

export const drawDayShadows = (ctx, g) => {
  if (!DAY.on || !(DAY.len > 0)) return;
  const p = dayParams();
  drawLongShadows(ctx, g, p.len, p.a, p);
  drawHallShadows(ctx, p.len, p.a, p);   // last frame's halls (noted while drawn)
  dayFrame(g.time, p, p.v);
};
