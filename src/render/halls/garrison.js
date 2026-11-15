// ============ HALL: THE KNIGHT GARRISON ============
// The barracks the knights muster out of; the knights themselves are units
// and walk the field, the hall only keeps the fire lit. It GROWS: a plank
// bunkhouse with a straw dummy at one, a half-timbered hall with a fence,
// a weapon rack and a standard at two, a stone-footed hall behind a
// palisade with a corner watch-turret and a campfire at three.
//   Paladin Order — whitewashed stone, a blue slate roof with a gilt ridge,
//     a rose window over the door, sun banners.
//     Grand Champion: a colossal war-hammer planted in a plinth before the
//       door, glowing; the turret grows into a gold-capped keep.
//     Radiant Basilica: a golden dome, a sunburst over the door, holy runes
//       in the ground that burn gold.
//   Knights Errant (branch "b") — a lodge of dark gunmetal stone under dark
//     timber, a forest-green roof with a brass ridge, green kite shields
//     blazoned in brass along the wall, a brass crown over the door, crossed
//     swords at the ridge ends, a gunmetal corner turret under a green cone.
//     (The livery shared with the Errant knights' figures: gunmetal #4c525e /
//     #7c8494, forest green #2f6b3f / #1f4a2c / #4f8f58, brass #c9a24a,
//     off-white #e8e2d0.)
//     Lancer Order (rank4 "a"): a STABLE side — an open stall bay with a
//       barded warhorse looking out over its half-door, hay, a water trough,
//       a quintain in the yard, hoof-churned earth, long green pennons on
//       lances at the ridge ends.
//     Crossbow Company (rank4 "b"): a drill-hall — a crossbow rack on the
//       wall, an archery butt (a target on a stand) and a row of pavises in
//       the yard, a crenellated watch-platform with slits at the back, green
//       bolt-and-bow banners, a torch at the door.
//
// The building is the pixel sculptor's (render/pix/hall-knight.js); smoke, the basilica's
// runes and the rally flag are live.

import { pennant, rgba, soft, shadow } from "../buildkit.js";
import * as knightHall from "../pix/hall-knight.js";
import { hallPix, drawHallBack } from "../pix/halls.js";

// the numbers every form is built on
const dims = (t, y = t.y) => {
  const lvl = t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  // the footing reaches hw + 2, which must stay inside the footprint; the
  // Lancers' hall is a little narrower, to leave the stable its side
  const hw = r4 === "ba" ? 12.5 : r4 ? 14.5 : t.branch ? 14 : [11, 12.5, 13.5][lvl - 1];
  const wallH = r4 ? 15 : t.branch ? 14 : 11 + lvl;
  // the footing's front edge sits at y + 5, leaving a strip of yard in front
  // of it (down to y + 15 or so) where the fire and the kit stand clear
  return { hw, wallH, baseY: y + 5, r4, lvl };
};
// the ridge's height over the eaves
const roofOf = (t) => 11 + t.level + (t.branch ? 2 : 0) + (t.branch === "b" ? 1 : 0);
// the standard's colour (the livery's, for the rally flag too)
const flagOf = (t) => t.branch === "a" ? "#e8d47a" : t.branch === "b" ? "#4f8f58" : "#a04a3f";

export const drawGarrison = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const { hw, wallH, baseY, r4, lvl } = dims(t);
  const ber = t.branch === "b";
  const wallTop = baseY - wallH;
  const roofH = roofOf(t);
  const v = t.id % 3;

  const canBake = typeof document !== "undefined";
  // ---- the building (render/pix/hall-knight.js): one picture (the hall has no crew to stand
  // behind a front piece) that brings its own ground, shadow, standard, pennons, campfire and
  // torch flames and their light. The smoke, the basilica's runes and the rally flag are painted here.
  const H = canBake ? hallPix("knight", knightHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, v) : null;
  const dg = 0.45 + 0.15 * Math.sin(time * 1.9 + t.id);
  if (H) {
    drawHallBack(ctx, H, x, y, time, { id: t.id, k: { rose: dg + 0.2, hammer: 0.5 + 0.3 * Math.sin(time * 2 + t.id), dome: 0.45 + 0.25 * Math.sin(time * 1.4 + t.id) } });
    if (r4 === "ab") {
      // the holy runes turn on the gold ring baked in the yard: over the earth, so the ring
      // is drawn wide enough to pass in front of the fire and the rack, and a rune behind
      // the footing is hidden by the hall
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 0.25;
        const ry = y + 9 + Math.sin(a) * 5.5;
        if (ry < y + 6.2) continue;
        const on = 0.5 + 0.5 * Math.sin(time * 2.5 + i * 1.7);
        ctx.fillStyle = rgba("#f8e08a", 0.35 + on * 0.6);
        const rx = x + Math.cos(a) * 16;
        ctx.fillRect(rx - 0.5, ry - 1.5, 1, 3); ctx.fillRect(rx - 1.5, ry - 0.5, 3, 1);
      }
    }
  }

  // the chimney's smoke
  if (!ber && r4 !== "ab") for (let i = 0; i < 4; i++) {
    const t2 = (time * 9 + i * 5 + t.id * 2) % 20;
    const drift = Math.sin(time * 1.6 + i) * 3 + t2 * 0.25;
    soft(ctx, x + hw * 0.5 + drift, wallTop - roofH * 0.55 - 9 - t2, 2 + t2 / 7, 2 + t2 / 7, [[0, `rgba(198,198,190,${Math.max(0, 0.45 - t2 * 0.022)})`], [1, "rgba(198,198,190,0)"]]);
  }
  // rally flag
  if (t.rally) {
    const rx = t.rally.x, ry = t.rally.y;
    shadow(ctx, rx + 1, ry + 4, 4, 1.5, 0.25);
    pennant(ctx, rx, ry - 10, 14, flagOf(t), time, t.id + 3, 1);
  }
};
