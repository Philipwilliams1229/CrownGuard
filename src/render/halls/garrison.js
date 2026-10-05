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
// Ground (un-inked) and hall (inked) are baked per form; fire, smoke, flags
// and pennons are live.

import {
  pennant, hipRoof, TIMBER, OAKWOOD, PALE_STONE, GREY_STONE,
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part, hash,
  groundBed, footClip, footHalf, footing, ashlar, planks, beam, door, banner, flame, torchBracket, rock, posy, merlons,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";

const CACHE = new Map();
export const resetGarrisonBakes = () => CACHE.clear();
const baked = (key, w, h, draw, ink = true) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw, ink); CACHE.set(key, sp); }
  return sp;
};

const BOX = { left: 46, right: 46, up: 78, down: 20 };

// the Errant livery
const L = {
  gun: "#4c525e", gunLt: "#7c8494", gunDeep: "#34383f",
  green: "#2f6b3f", greenDeep: "#1f4a2c", greenLt: "#4f8f58",
  brass: "#c9a24a", cream: "#e8e2d0", timber: "#4a3f3a",
};

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
// Where the yard's things stand (their feet), all on open ground in front of
// the footing and inside the footprint: the campfire (or the pavises)
// front-left, the rack, dummy, hammer, quintain or butt front-right.
const yard = (x, y) => ({
  // (kept inside x ± 9 or so: the shared ground-blend layer paints its
  // front clumps round the rim at about (x ± 12, y + 8.5), over the hall)
  fireX: x - 5.5, fireY: y + 12,        // the campfire ring's centre
  brazX: x - 5.5, brazY: y + 13.5,      // the pavise row's centre
  kitX: x + 8.5, kitY: y + 12.5,        // the right-hand prop's feet
});
const COLORS = (t) => {
  const pal = t.branch === "a", ber = t.branch === "b";
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  return {
    wall: pal ? "#e0d8c4" : ber ? L.timber : "#9a7a52",
    roof: pal ? (r4 === "ab" ? "#d8b34a" : "#4a6a92") : ber ? L.green : "#a0503c",
    flag: pal ? "#e8d47a" : ber ? L.greenLt : "#a04a3f",
    trim: pal ? "#d8b34a" : ber ? L.brass : "#a04a3f",
  };
};

// A straw training dummy on a post, arms out, a painted target on its chest.
const dummy = (ctx, x, y) => {
  part(ctx, (c) => cylinder(c, x - 0.8, y - 14, 1.6, 14, OAKWOOD, { r: 0.8 }));
  part(ctx, (c) => cylinder(c, x - 5, y - 11.5, 10, 1.5, OAKWOOD, { r: 0.7 }));
  part(ctx, (c) => { roundRect(c, x - 2.6, y - 13, 5.2, 7, 2); c.fillStyle = lin(c, x - 3, 0, x + 3, 0, [[0, "#f0d890"], [0.5, "#d8b868"], [1, "#9a7a3a"]]); c.fill(); c.fillStyle = "#a04a3f"; c.fillRect(x - 1, y - 10.5, 2, 2); });
  part(ctx, (c) => ball(c, x, y - 15.5, 2.2, 2.2, "#d8b868", { hi: 0.4, lo: 0.45 }));
};

// A rack of spears and a shield leaned against it.
// Seven wide, spears and all; a shield (if any) leans on its left post.
const rack = (ctx, x, y, shield) => {
  if (shield) part(ctx, (c) => { ball(c, x - 3, y - 3.5, 2.6, 2.9, shield, { hi: 0.4, lo: 0.45 }); c.fillStyle = "#d8b34a"; c.fillRect(x - 3.5, y - 4, 1, 1); });
  part(ctx, (c) => { cylinder(c, x - 3.5, y - 9, 1.5, 9, OAKWOOD, { r: 0.7 }); cylinder(c, x + 2, y - 9, 1.5, 9, OAKWOOD, { r: 0.7 }); cylinder(c, x - 3.5, y - 8, 7, 1.4, lighten(OAKWOOD, 0.1), { r: 0.6 }); });
  part(ctx, (c) => {
    for (let i = 0; i < 3; i++) {
      const sx = x - 2 + i * 1.8;
      c.fillStyle = "#6a4a2e"; c.fillRect(sx, y - 15, 0.9, 15);
      c.fillStyle = "#c4c8d0"; c.beginPath(); c.moveTo(sx - 0.7, y - 15); c.lineTo(sx + 0.45, y - 18.5); c.lineTo(sx + 1.6, y - 15); c.closePath(); c.fill();
    }
  });
};

// ---- the Errant kit -------------------------------------------------------
// A heater of the livery: a kite shield, brass-rimmed, green field, a brass
// device (a cross, or a chevron, by the seed).
const kiteShape = (c, x, y, w, h) => {
  c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.lineTo(x + w / 2, y + h * 0.45); c.lineTo(x, y + h); c.lineTo(x - w / 2, y + h * 0.45); c.closePath();
};
const kite = (ctx, x, y, seed = 0, w = 4, h = 7) => part(ctx, (c) => {
  kiteShape(c, x, y, w, h);
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, lighten(L.brass, 0.3)], [0.5, L.brass], [1, darken(L.brass, 0.4)]]); c.fill();
  kiteShape(c, x, y + 0.7, w - 1.4, h - 1.9);
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, L.greenLt], [0.5, L.green], [1, L.greenDeep]]); c.fill();
  c.fillStyle = L.brass;
  if (seed % 2 === 0) { c.fillRect(x - 0.4, y + 1.2, 0.8, h - 3.4); c.fillRect(x - 1.2, y + 2.2, 2.4, 0.8); }
  else { c.beginPath(); c.moveTo(x - 1.3, y + 3.4); c.lineTo(x, y + 2); c.lineTo(x + 1.3, y + 3.4); c.lineTo(x + 1.3, y + 4.3); c.lineTo(x, y + 3); c.lineTo(x - 1.3, y + 4.3); c.closePath(); c.fill(); }
});

// A little brass crown (the order's mark over the door).
const crown = (ctx, x, y) => part(ctx, (c) => {
  c.fillStyle = lin(c, x - 2.6, 0, x + 2.6, 0, [[0, lighten(L.brass, 0.35)], [0.5, L.brass], [1, darken(L.brass, 0.4)]]);
  c.beginPath(); c.moveTo(x - 2.6, y); c.lineTo(x - 2.6, y - 2.6); c.lineTo(x - 1.3, y - 1.3); c.lineTo(x, y - 3); c.lineTo(x + 1.3, y - 1.3); c.lineTo(x + 2.6, y - 2.6); c.lineTo(x + 2.6, y); c.closePath(); c.fill();
  c.fillStyle = L.green; c.fillRect(x - 0.5, y - 1.2, 1, 0.9);
});

// Two swords crossed, point up (the ridge-end finials): steel blades, brass
// crossguards and pommels.
const crossedSwords = (ctx, x, y) => part(ctx, (c) => {
  c.lineCap = "butt";
  for (const s of [-1, 1]) {
    c.strokeStyle = "#9aa2b0"; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(x - s * 2, y - 1); c.lineTo(x + s * 2, y - 6.6); c.stroke();
    c.fillStyle = L.brass; c.fillRect(x - s * 2 - 0.5, y - 0.4, 1, 1.4);             // the pommel
    c.save(); c.translate(x - s * 1.2, y - 2.1); c.rotate(s * 0.7); c.fillRect(-1.4, -0.3, 2.8, 0.7); c.restore();   // the guard
  }
});

// A lance, point up, with a brass head (its pennon is live).
const lance = (ctx, x, base, top) => {
  part(ctx, (c) => cylinder(c, x - 0.5, top, 1, base - top, "#8a6a44", { r: 0.5, hi: 0.3, lo: 0.4 }));
  part(ctx, (c) => { c.fillStyle = "#c4c8d0"; c.beginPath(); c.moveTo(x - 1, top); c.lineTo(x, top - 3.4); c.lineTo(x + 1, top); c.closePath(); c.fill(); c.fillStyle = L.brass; c.fillRect(x - 1.1, top, 2.2, 0.9); });
};
// A long swallowtail pennon streaming from a lance (live).
const pennon = (ctx, x, top, len, time, phase) => {
  const wv = Math.sin(time * 4.2 + phase) * 1.3, wv2 = Math.sin(time * 4.2 + phase - 0.9) * 1.6;
  ctx.fillStyle = L.green;
  ctx.beginPath();
  ctx.moveTo(x + 0.7, top + 0.5);
  ctx.quadraticCurveTo(x + len * 0.5, top + 0.2 + wv * 0.5, x + len + wv2, top + 0.8);
  ctx.lineTo(x + len * 0.78 + wv2, top + 2.5);
  ctx.lineTo(x + len + wv2, top + 4.2);
  ctx.quadraticCurveTo(x + len * 0.5, top + 4 + wv * 0.5, x + 0.7, top + 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.brass;
  ctx.beginPath(); ctx.moveTo(x + 0.7, top + 3.2); ctx.quadraticCurveTo(x + len * 0.5, top + 3.2 + wv * 0.5, x + len * 0.9 + wv2, top + 3.4); ctx.lineTo(x + len * 0.9 + wv2, top + 4.1); ctx.quadraticCurveTo(x + len * 0.5, top + 4 + wv * 0.5, x + 0.7, top + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.greenLt; ctx.fillRect(x + 1, top + 1, len * 0.28, 0.7);
};

// ---- the Lancers' stable
const hayBale = (ctx, x, y, w = 4.6, h = 3.4) => part(ctx, (c) => {
  roundRect(c, x - w / 2, y - h, w, h, 0.8);
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, "#f0d888"], [0.5, "#d8b860"], [1, "#9a7a3a"]]); c.fill();
  c.fillStyle = "#8a6a30"; c.fillRect(x - w * 0.22, y - h, 0.6, h); c.fillRect(x + w * 0.22, y - h, 0.6, h);
  c.fillStyle = "#f8e8a8"; c.fillRect(x - w / 2 + 0.6, y - h + 0.7, w * 0.3, 0.5); c.fillRect(x + 0.4, y - h + 1.8, w * 0.3, 0.5);
});
// A barded warhorse's head and neck, looking out over the half-door: a bay
// under a gunmetal chanfron with a brass stud, a dark mane, a green crest.
const horseHead = (ctx, x, y) => {
  part(ctx, (c) => {
    const col = "#b0693a";
    c.fillStyle = lin(c, x - 4, 0, x + 4, 0, [[0, lighten(col, 0.25)], [0.5, col], [1, darken(col, 0.45)]]);
    c.beginPath(); c.moveTo(x - 4.2, y + 7); c.lineTo(x - 3.2, y - 0.5); c.lineTo(x + 2.4, y - 1); c.lineTo(x + 4, y + 7); c.closePath(); c.fill();       // the neck
    c.fillStyle = "#3a2018"; c.fillRect(x - 3.8, y - 1.5, 1.4, 7.5);                                                                                         // the mane
    c.fillStyle = lin(c, x - 2, 0, x + 2, 0, [[0, lighten(col, 0.2)], [0.5, col], [1, darken(col, 0.4)]]);
    ball(c, x, y + 0.4, 2.7, 3.6, col, { hi: 0.35, lo: 0.4 });                                                                                          // the head
    ball(c, x + 0.4, y + 3.8, 1.9, 1.4, lighten(col, 0.1), { hi: 0.3, lo: 0.4 });                                                                       // the muzzle
    c.fillStyle = col;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * 1.2, y - 2); c.lineTo(x + s * 1.9, y - 4.6); c.lineTo(x + s * 2.4, y - 1.6); c.closePath(); c.fill(); }   // ears
  });
  part(ctx, (c) => {
    c.fillStyle = "#f0e2c4"; c.beginPath(); c.ellipse(x + 0.4, y + 4, 1.5, 1.1, 0, 0, Math.PI * 2); c.fill();                                           // a pale muzzle
    c.fillStyle = lin(c, x - 0.8, 0, x + 0.8, 0, [[0, L.gunLt], [1, L.gun]]);
    c.beginPath(); c.moveTo(x - 0.8, y - 2.6); c.lineTo(x + 0.8, y - 2.6); c.lineTo(x + 0.9, y + 0.9); c.lineTo(x, y + 1.6); c.lineTo(x - 0.9, y + 0.9); c.closePath(); c.fill();   // the chanfron
    c.fillStyle = L.brass; c.fillRect(x - 0.4, y - 1.2, 0.8, 0.8);
    c.fillStyle = L.green; c.fillRect(x - 1.1, y - 3.9, 2.2, 1);                                                                                         // a green poll-crest
    c.fillStyle = "#1a1418"; c.fillRect(x - 2.1, y - 0.2, 0.8, 0.8); c.fillRect(x + 1.4, y - 0.2, 0.8, 0.8);                                             // eyes
  });
};
// The stall: posts, a dark bay, hay, the horse, a half-door, a little green roof.
const stable = (ctx, sx, sy) => {
  const hw = 4.8, wh = 10.5;
  soft(ctx, sx + 1.5, sy + 1, hw + 3, 2, [[0, "rgba(28,20,30,0.45)"], [1, "rgba(28,20,30,0)"]]);
  part(ctx, (c) => {
    roundRect(c, sx - hw, sy - wh, hw * 2, wh, 0.6);
    c.fillStyle = lin(c, sx - hw, 0, sx + hw, 0, [[0, "#5a4a42"], [1, "#2c2224"]]); c.fill();
    c.fillStyle = "#c8a850"; c.fillRect(sx - hw, sy - 1, hw * 2, 1);                                  // straw underfoot
  });
  hayBale(ctx, sx - hw + 2.2, sy - 0.8, 3.8, 3);
  horseHead(ctx, sx + 1.2, sy - 5.6);
  part(ctx, (c) => {                                                                                  // the half-door
    cylinder(c, sx - hw + 0.4, sy - 3, hw * 2 - 0.8, 3, L.timber, { r: 0.5, hi: 0.3, lo: 0.5 });
    c.fillStyle = rgba(darken(L.timber, 0.6), 0.7); c.fillRect(sx - 2, sy - 3, 0.5, 3); c.fillRect(sx + 1.2, sy - 3, 0.5, 3);
    c.fillStyle = L.brass; c.fillRect(sx - 0.4, sy - 2.2, 0.8, 0.8);
  });
  for (const s of [-1, 1]) part(ctx, (c) => {                                                         // gunmetal posts, brass caps
    cylinder(c, sx + s * hw - 0.9, sy - wh, 1.8, wh + 0.5, L.gun, { r: 0.6, hi: 0.35, lo: 0.5 });
    c.fillStyle = L.brass; c.fillRect(sx + s * hw - 1.1, sy - wh, 2.2, 0.9);
  });
  hipRoof(ctx, sx, sy - wh + 0.8, hw + 2, 2.4, 6, L.green);
  part(ctx, (c) => { c.fillStyle = L.brass; c.fillRect(sx - 2.6, sy - wh - 5.8, 5.2, 0.9); });   // the ridge, brass
};
const trough = (ctx, x, y) => part(ctx, (c) => {
  cylinder(c, x - 3.4, y - 2.8, 6.8, 2.8, L.timber, { r: 0.7, hi: 0.3, lo: 0.5 });
  c.fillStyle = "#6aa0c0"; c.fillRect(x - 2.6, y - 2.6, 5.2, 1); c.fillStyle = "#b8dcec"; c.fillRect(x - 2, y - 2.6, 1.6, 0.5);
  c.fillStyle = L.gunLt; c.fillRect(x - 3.4, y - 1.2, 6.8, 0.6);
});
// A tilting post: a quintain with a green kite on one arm and a sandbag on the other.
const quintain = (ctx, x, y) => {
  beam(ctx, x - 4, y, x - 0.5, y - 5, 1.1, OAKWOOD); beam(ctx, x + 4, y, x + 0.5, y - 5, 1.1, OAKWOOD);
  part(ctx, (c) => cylinder(c, x - 0.9, y - 13, 1.8, 13, OAKWOOD, { r: 0.8 }));
  part(ctx, (c) => { cylinder(c, x - 6.2, y - 13.4, 12.4, 1.4, darken(OAKWOOD, 0.1), { r: 0.6 }); c.fillStyle = L.brass; c.fillRect(x - 1, y - 14.4, 2, 1); });
  kite(ctx, x - 5.4, y - 12.2, 0, 3.8, 6.4);
  part(ctx, (c) => { c.fillStyle = "#3a2c28"; c.fillRect(x + 5.4, y - 12, 0.5, 3); ball(c, x + 5.7, y - 7.6, 2.1, 2.4, "#b89a64", { hi: 0.4, lo: 0.45 }); });
};

// ---- the Crossbow Company's kit
const bolt = (c, x, y, len, ang = 0) => {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = "#6a4a2e"; c.fillRect(0, -0.3, len, 0.6);
  c.fillStyle = "#c4c8d0"; c.beginPath(); c.moveTo(len, -0.9); c.lineTo(len + 1.6, 0); c.lineTo(len, 0.9); c.closePath(); c.fill();
  c.fillStyle = L.cream; c.fillRect(-0.3, -0.9, 1.4, 1.8);
  c.restore();
};
// A crossbow in side view, lying across a rack: stock, steel bow.
const crossbowIcon = (c, x, y, w = 6) => {
  c.fillStyle = "#7a5a3a"; c.fillRect(x - w / 2, y - 0.5, w, 1.1);
  c.fillStyle = L.brass; c.fillRect(x + w / 2 - 1.2, y - 0.5, 0.8, 1.1);
  c.strokeStyle = L.gunLt; c.lineWidth = 0.9; c.lineCap = "round";
  c.beginPath(); c.moveTo(x + w / 2 - 1.8, y - 3); c.quadraticCurveTo(x + w / 2 - 0.2, y, x + w / 2 - 1.8, y + 3); c.stroke();
  c.strokeStyle = L.cream; c.lineWidth = 0.4;
  c.beginPath(); c.moveTo(x + w / 2 - 1.8, y - 3); c.lineTo(x + w / 2 - 3, y); c.lineTo(x + w / 2 - 1.8, y + 3); c.stroke();
};
const crossbowRack = (ctx, x0, top, w, h) => {
  part(ctx, (c) => {
    cylinder(c, x0, top, w, h, L.gunDeep, { r: 0.7, hi: 0.3, lo: 0.5 });
    c.fillStyle = L.brass; c.fillRect(x0, top, w, 0.7);
  });
  part(ctx, (c) => { crossbowIcon(c, x0 + w / 2, top + 2.8, 5.6); crossbowIcon(c, x0 + w / 2, top + h - 2.2, 5.6); });
};
// A butt: a straw target on two legs, rings in the livery, a bolt or two in it.
const butt = (ctx, x, y) => {
  beam(ctx, x - 3.2, y, x - 0.8, y - 5, 1.1, OAKWOOD); beam(ctx, x + 3.2, y, x + 0.8, y - 5, 1.1, OAKWOOD);
  part(ctx, (c) => ball(c, x, y - 8.2, 4.9, 5.1, "#d8b868", { hi: 0.4, lo: 0.4 }));
  part(ctx, (c) => {
    const rings = [[4, L.cream], [3, L.gun], [2, L.green], [1, L.brass]];
    for (const [r, col] of rings) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 8.2, r * 0.92, r, 0, 0, Math.PI * 2); c.fill(); }
    bolt(c, x - 1.4, y - 9.4, 3, Math.PI * 0.82); bolt(c, x + 1.2, y - 7.4, 3, Math.PI * 0.2);
  });
};
// A pavise: the tall shield a crossbowman shelters behind, propped on a stay.
const pavise = (ctx, x, y, seed = 0) => {
  beam(ctx, x + 0.4, y - 8, x + 1.8, y, 0.9, darken(OAKWOOD, 0.2));
  part(ctx, (c) => {
    roundRect(c, x - 2, y - 9.5, 4, 9.5, 1);
    c.fillStyle = lin(c, x - 2, 0, x + 2, 0, [[0, L.greenLt], [0.5, L.green], [1, L.greenDeep]]); c.fill();
    c.fillStyle = L.brass; c.fillRect(x - 2, y - 9.5, 4, 0.7); c.fillRect(x - 2, y - 0.9, 4, 0.7);
    c.fillStyle = L.cream; c.fillRect(x - 0.25, y - 8.6, 0.5, 7.5);
    c.fillStyle = L.brass; c.fillRect(x - 0.9, y - 5.4 - (seed % 2) * 0.6, 1.8, 1.4);
  });
};

const paintGround = (ctx, t, x, y) => {
  const { hw, baseY, r4, lvl } = dims(t, y);
  const ber = t.branch === "b", pal = t.branch === "a";
  const grown = lvl >= 3 || !!t.branch;
  const Y = yard(x, y);
  const fire = grown && r4 !== "ba" && r4 !== "bb";
  ctx.save();
  footClip(ctx, x, y);
  groundBed(ctx, x, baseY, hw + 2, t.id, { earth: ber ? "#6a5a48" : "#7c6242" });
  // the trodden mustering yard before the door
  soft(ctx, x, baseY + 5, 11, 4.5, [[0, "rgba(124,98,66,0.32)"], [1, "rgba(124,98,66,0)"]]);
  if (r4 === "ab") {
    ctx.strokeStyle = "rgba(232,200,90,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 9, 15, 5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (r4 === "ba") {
    // hoof-churned earth before the stable and round the quintain: dark
    // trampled patches, a few crescents, scraps of straw
    for (const [px, py, rx] of [[-11, 10.5, 5], [-5, 12.5, 4], [-14, 12.5, 3.2], [6, 11, 4], [11.5, 13, 3.6], [2, 14, 3]]) {
      soft(ctx, x + px, y + py, rx, rx * 0.4, [[0, "rgba(58,42,32,0.55)"], [0.7, "rgba(58,42,32,0.32)"], [1, "rgba(58,42,32,0)"]]);
    }
    ctx.strokeStyle = "rgba(40,28,22,0.7)"; ctx.lineWidth = 0.55;
    for (const [px, py] of [[-13, 11], [-8.5, 12], [-10.8, 13.4], [-4, 13], [-6.5, 14.5], [4.5, 12.2], [9, 14.5], [12, 11.4], [1, 13.8]]) {
      ctx.beginPath(); ctx.arc(x + px, y + py, 0.9, Math.PI * 1.05, Math.PI * 1.95, true); ctx.stroke();
    }
    ctx.fillStyle = "rgba(216,184,104,0.8)";
    for (const [px, py] of [[-15, 9.8], [-7, 9.4], [-9.5, 11.2], [-2.5, 11.8], [5.5, 13.6], [10, 12]]) ctx.fillRect(x + px, y + py, 1.6, 0.5);
  }
  if (r4 === "bb") {
    // a swept firing lane at the butt, scuffed pale, with spent bolts in the dust
    soft(ctx, x + 5, y + 13.5, 9.5, 2.6, [[0, "rgba(190,174,140,0.35)"], [1, "rgba(190,174,140,0)"]]);
    for (const [px, py, a] of [[3.5, 14.8, 0.3], [6.5, 15.6, -0.2], [13, 14.6, 0.5]]) {
      ctx.save(); ctx.translate(x + px, y + py); ctx.rotate(a);
      ctx.fillStyle = "#8a6a46"; ctx.fillRect(-1.6, -0.25, 3.2, 0.5); ctx.fillStyle = L.cream; ctx.fillRect(-1.8, -0.5, 0.8, 1); ctx.restore();
    }
  }
  // contact shadows: each thing in the yard sits on its own patch of shade
  if (fire) {
    soft(ctx, Y.fireX, Y.fireY + 0.5, 6, 2.6, [[0, "rgba(40,28,24,0.5)"], [0.7, "rgba(40,28,24,0.3)"], [1, "rgba(40,28,24,0)"]]);   // ash and scorch
  }
  if (r4 === "bb") {
    shadow(ctx, Y.brazX + 0.8, Y.brazY + 0.4, 8.5, 1.5, 0.34);                 // the pavise row
    shadow(ctx, Y.kitX + 0.8, Y.kitY + 0.5, 6, 1.5, 0.32);                     // the butt
  } else if (r4 === "ba") {
    shadow(ctx, Y.kitX + 0.8, Y.kitY + 0.4, 6.4, 1.6, 0.34);                   // the quintain
    shadow(ctx, x - 12.2 + 1, y + 10.8, 4.4, 1.3, 0.32);                       // the trough
    shadow(ctx, x - 5.2, y + 9.8, 3.2, 1, 0.3);                                // a bale
  } else if (r4 === "aa") shadow(ctx, Y.kitX + 0.8, Y.kitY + 0.4, 5.6, 1.6, 0.36);
  else if (!pal && lvl >= 2 || ber) shadow(ctx, Y.kitX + 0.8, Y.kitY + 0.4, 4.6, 1.3, 0.32);
  if (!pal && !ber && lvl === 1) shadow(ctx, Y.kitX + 0.8, Y.kitY + 0.5, 2.6, 1, 0.32);
  if (!pal && !ber && lvl === 2) shadow(ctx, Y.fireX + 0.8, Y.kitY + 0.5, 2.6, 1, 0.32);
  ctx.restore();
};

const paintHall = (ctx, t, x, y) => {
  const { hw, wallH, baseY, r4, lvl } = dims(t, y);
  const pal = t.branch === "a", ber = t.branch === "b";
  const grown = lvl >= 3 || !!t.branch;
  const col = COLORS(t);
  const seed = t.id * 11 + lvl;
  const wallTop = baseY - wallH;
  const roofH = roofOf(t);

  // ---- behind the hall: palisade, turret, keep or watch-platform
  // (its feet are behind the hall, where the footprint is narrow: it only
  // shows its crown over the roof)
  if (grown && !ber) palisade(ctx, x + 1, wallTop - 4, footHalf(y, wallTop + 2) - 2, pal ? "#8a7a5a" : OAKWOOD, seed);
  if (grown && !ber) {
    // a corner watch-turret at the back left; the Champion's is a keep
    const tx = x - hw + 3, keep = r4 === "aa";
    const tw = keep ? 11 : 8, th = keep ? 34 : 24;
    const stone = pal ? PALE_STONE : GREY_STONE;
    ashlar(ctx, tx - tw / 2, wallTop - th + 8, tw, th, stone, seed + 4, { course: 3.5, block: 4.5 });
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, tx - 0.8, wallTop - th + 13, 1.6, 4, 0.6); c.fill(); });
    const ch = keep ? 13 : 10, ttop = wallTop - th + 8;
    part(ctx, (c) => cone(c, tx, ttop - ch + 1.5, tw / 2 + 2, ch, keep ? "#d8b34a" : pal ? "#4a6a92" : "#a0503c", { scallops: 2, sag: 1, hi: 0.42, lo: 0.5 }));
    if (keep) part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(tx - 0.5, ttop - ch - 3, 1, 4); });
  }
  if (ber && !r4) {
    // the lodge's turret: gunmetal stone under a green cone, a brass finial
    const tx = x - hw + 3, tw = 8, th = 24, ttop = wallTop - th + 8, ch = 10;
    ashlar(ctx, tx - tw / 2, ttop, tw, th, "#5c6270", seed + 4, { course: 3.5, block: 4.5 });
    part(ctx, (c) => { c.fillStyle = "#1c1a22"; roundRect(c, tx - 0.8, ttop + 5, 1.6, 4, 0.6); c.fill(); });
    part(ctx, (c) => cone(c, tx, ttop - ch + 1.5, tw / 2 + 2, ch, L.green, { scallops: 2, sag: 1, hi: 0.42, lo: 0.5 }));
    part(ctx, (c) => { c.fillStyle = L.brass; c.fillRect(tx - 0.5, ttop - ch - 2.2, 1, 3.4); c.fillRect(tx - 1.3, ttop - ch - 0.2, 2.6, 0.9); });
  }
  if (r4 === "bb") {
    // the watch-platform: a square gunmetal tower, slits, a crenellated deck
    const tx = x - hw + 2.5, tw = 9, th = 29, ttop = wallTop - th + 8;
    ashlar(ctx, tx - tw / 2, ttop, tw, th, "#5c6270", seed + 4, { course: 3.5, block: 4.5 });
    part(ctx, (c) => { c.fillStyle = "#1c1a22"; for (const sy of [ttop + 7, ttop + 14]) roundRect(c, tx - 0.6, sy, 1.2, 3.4, 0.5), c.fill(); });
    part(ctx, (c) => cylinder(c, tx - tw / 2 - 1.5, ttop - 1, tw + 3, 2.4, L.gunLt, { r: 0.6, hi: 0.3, lo: 0.4 }));
    merlons(ctx, tx, ttop - 0.6, tw / 2 + 1.5, L.gunLt, { step: 3.4, w: 2.2, h: 3.4, seed });
    banner(ctx, tx, ttop + 3.4, 4, 7, L.green, L.brass, (c, cx, cy) => { c.fillStyle = L.cream; c.fillRect(cx - 0.3, cy - 2.2, 0.6, 4); c.fillStyle = L.brass; c.fillRect(cx - 1.2, cy - 1.4, 2.4, 0.6); }, { point: true });
  }

  // ---- the walls
  footing(ctx, x, baseY, hw, pal ? "#b8b0a0" : ber ? L.gun : GREY_STONE, seed, grown ? 4 : 3);
  const wallBot = baseY - (grown ? 4 : 3);
  if (pal) ashlar(ctx, x - hw, wallTop, hw * 2, wallBot - wallTop, col.wall, seed, { course: 3.5, block: 6 });
  else if (ber) {
    // dark timber above, gunmetal stone below, a brass band under the eaves
    planks(ctx, x - hw, wallTop, hw * 2, wallBot - wallTop, col.wall, seed, { pw: 3 });
    ashlar(ctx, x - hw, wallBot - 4.5, hw * 2, 4.5, "#5c6270", seed + 2, { course: 2.4, block: 4.5 });
    part(ctx, (c) => { c.fillStyle = L.brass; c.fillRect(x - hw, wallTop + 0.6, hw * 2, 0.7); });
  }
  else if (lvl === 1) planks(ctx, x - hw, wallTop, hw * 2, wallBot - wallTop, "#8a6238", seed, { pw: 3.2 });
  else {
    // wattle and daub between oak framing
    part(ctx, (c) => cylinder(c, x - hw, wallTop, hw * 2, wallBot - wallTop, "#e0d4b4", { r: 1, hi: 0.25, lo: 0.4 }));
    for (const fx of [x - hw + 1, x - hw * 0.45, x + hw * 0.45, x + hw - 1]) beam(ctx, fx, wallTop, fx, wallBot, 1.8, darken(OAKWOOD, 0.1));
    beam(ctx, x - hw, wallTop + 1, x + hw, wallTop + 1, 1.8, darken(OAKWOOD, 0.1));
    beam(ctx, x - hw + 1, wallBot - 1, x - hw * 0.45, wallTop + 2, 1.3, darken(OAKWOOD, 0.1));
    beam(ctx, x + hw - 1, wallBot - 1, x + hw * 0.45, wallTop + 2, 1.3, darken(OAKWOOD, 0.1));
  }

  // ---- the door, and what hangs on the wall around it
  door(ctx, x, wallBot, 7, ber ? 8.5 : Math.min(wallH - 2, 10.5), ber ? L.greenDeep : "#5e4128");
  if (!pal && !ber) {
    // the kingdom's shield beside the door
    part(ctx, (c) => {
      const sx = x - hw * 0.72, sy = wallTop + 3;
      c.fillStyle = lin(c, sx - 3, 0, sx + 3, 0, [[0, "#c86a5a"], [0.5, col.trim], [1, darken(col.trim, 0.4)]]);
      c.beginPath(); c.moveTo(sx - 3, sy); c.lineTo(sx + 3, sy); c.lineTo(sx + 3, sy + 4); c.lineTo(sx, sy + 7); c.lineTo(sx - 3, sy + 4); c.closePath(); c.fill();
      c.fillStyle = "#e0d6ba"; c.fillRect(sx - 0.5, sy + 1, 1, 4); c.fillRect(sx - 2, sy + 2, 4, 1);
    });
    if (lvl >= 2) torchBracket(ctx, x + 5, wallBot - 6);
  }
  if (ber && !r4) {
    // kite shields in the livery, three left of the door (the rack stands before the right)
    for (const [i, sx] of [x - 12.2, x - 8.7, x - 5.3].entries()) kite(ctx, sx, wallTop + 2.4, i + seed, 3.6, 6.6);
  }
  if (r4 === "ba") kite(ctx, x + 8.3, wallTop + 2.4, seed + 1, 4, 6.6);
  if (r4 === "bb") {
    // a bolt-and-bow banner on the left, the crossbow rack on the right
    banner(ctx, x - 8.2, wallTop + 2, 4.5, 7, L.green, L.brass, (c, cx, cy) => {
      c.fillStyle = L.cream; c.fillRect(cx - 0.3, cy - 2.4, 0.6, 4.2);
      c.beginPath(); c.moveTo(cx - 0.9, cy - 2.4); c.lineTo(cx, cy - 4); c.lineTo(cx + 0.9, cy - 2.4); c.closePath(); c.fill();
      c.strokeStyle = L.brass; c.lineWidth = 0.7; c.beginPath(); c.moveTo(cx - 2, cy - 1.8); c.quadraticCurveTo(cx, cy + 0.8, cx + 2, cy - 1.8); c.stroke();
    }, { point: true });
    crossbowRack(ctx, x + 5, wallTop + 2.2, 8.4, 7.2);
    torchBracket(ctx, x - 4.8, wallBot - 5.5);
    torchBracket(ctx, x + 4.8, wallBot - 5.5);
  }
  if (pal) {
    // the rose window over the door and a gilt band
    part(ctx, (c) => {
      c.fillStyle = "#e8e0c8"; c.beginPath(); c.arc(x, wallTop - 1, 3.4, 0, Math.PI * 2); c.fill();
      const panes = ["#3a6ac8", "#e8c14a", "#c8383a", "#3a6ac8"];
      for (let i = 0; i < 4; i++) { c.fillStyle = panes[i]; c.beginPath(); c.moveTo(x, wallTop - 1); c.arc(x, wallTop - 1, 2.6, i * Math.PI / 2, (i + 1) * Math.PI / 2); c.closePath(); c.fill(); }
    });
    for (const s of [-1, 1]) banner(ctx, x + s * hw * 0.62, wallTop + 2, 4.5, 8, r4 === "aa" ? "#e8e0c8" : "#3a5a8a", "#d8b34a", (c, cx, cy) => {
      c.fillStyle = "#e8c14a"; c.beginPath(); c.arc(cx, cy, 1.3, 0, 7); c.fill();
      c.fillRect(cx - 0.3, cy - 2.6, 0.6, 1); c.fillRect(cx - 0.3, cy + 1.6, 0.6, 1); c.fillRect(cx - 2.6, cy - 0.3, 1, 0.6); c.fillRect(cx + 1.6, cy - 0.3, 1, 0.6);
    }, { point: true });
  }

  // ---- the roof
  if (r4 === "ab") {
    // the basilica: a short gilt-edged roof crowned by a golden dome
    hipRoof(ctx, x, wallTop, hw + 3, hw * 0.4, 9, "#e0d8c4");
    part(ctx, (c) => cylinder(c, x - 7, wallTop - 14, 14, 6, "#e0d8c4", { r: 1, hi: 0.3, lo: 0.45 }));
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 8, wallTop - 13); c.bezierCurveTo(x - 8, wallTop - 25, x + 8, wallTop - 25, x + 8, wallTop - 13); c.closePath();
      c.fillStyle = lin(c, x - 8, wallTop - 24, x + 8, wallTop - 13, [[0, "#f8e8a0"], [0.45, "#d8b34a"], [1, "#8a6a2a"]]); c.fill();
      c.fillStyle = rgba("#8a6a2a", 0.6); c.fillRect(x - 3.5, wallTop - 21, 0.5, 8); c.fillRect(x + 3, wallTop - 21, 0.5, 8);
    });
    part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(x - 0.5, wallTop - 29, 1, 6); c.beginPath(); c.arc(x, wallTop - 30, 1.5, 0, 7); c.fill(); });
  } else {
    hipRoof(ctx, x, wallTop, hw + 4, hw * (ber ? 0.5 : 0.35), roofH, col.roof);
    if (pal || ber) part(ctx, (c) => { c.fillStyle = pal ? "#d8b34a" : L.brass; c.fillRect(x - hw * (ber ? 0.5 : 0.35) - 1, wallTop - roofH - 1.5, hw * (ber ? 1 : 0.7) + 2, 1.2); });
  }
  if (ber) {
    const rt = wallTop - roofH, rx = hw * 0.5;
    // the order's crown set on the eave face over the door
    crown(ctx, x, wallTop + 1.6);
    if (r4 === "ba") for (const [i, s] of [-1, 1].entries()) lance(ctx, x + s * (rx + 1.5), rt + 3, rt - 11 + i * 2);   // lances at the ridge ends (pennons live)
    else for (const s of [-1, 1]) crossedSwords(ctx, x + s * (rx + 1.5), rt + 1.5);            // crossed swords at the ridge ends
  }
  if (!ber && r4 !== "ab") part(ctx, (c) => {
    // the chimney
    const chx = x + hw * 0.5, chy = wallTop - roofH * 0.55;
    cylinder(c, chx - 2.5, chy - 7, 5, 9, pal ? PALE_STONE : "#7a746a", { r: 1, hi: 0.3, lo: 0.45 });
    c.fillStyle = darken(pal ? PALE_STONE : "#7a746a", 0.25); c.fillRect(chx - 3, chy - 8, 6, 1.6);
  });

  // the standard's pole on the ridge
  if (r4 !== "ba") part(ctx, (c) => cylinder(c, x - 0.8, wallTop - roofH - (r4 === "ab" ? 18 : 12), 1.6, 12, OAKWOOD, { r: 0.8 }));

  // ---- the Lancers' stable, in front of the hall's left end
  if (r4 === "ba") stable(ctx, x - 11.4, y + 6.2);

  // ---- the yard: everything stands on open ground in front of the footing
  // (feet a good step below its front edge), inside the footprint, and is
  // drawn back to front so nothing cuts into what stands behind it
  const Y = yard(x, y);
  const { fireX, fireY } = Y;
  if (grown && r4 !== "ba" && r4 !== "bb") {
    // the campfire ring (its fire is live): the back stones first, then the
    // logs, then the front stones over their ends
    const stones = [...Array(6).keys()].map((i) => (i / 6) * Math.PI * 2 + 0.26);
    for (const a of stones.filter((a) => Math.sin(a) < 0)) rock(ctx, fireX + Math.cos(a) * 4, fireY + Math.sin(a) * 1.8, 1.4, 1, "#8a8478", seed + a * 10);
    part(ctx, (c) => { beam(c, fireX - 3.2, fireY + 0.6, fireX + 2.6, fireY - 1.2, 1.4, "#5f4326"); beam(c, fireX - 2.6, fireY - 1.2, fireX + 3.2, fireY + 0.6, 1.4, "#4a3018"); });
    for (const a of stones.filter((a) => Math.sin(a) >= 0)) rock(ctx, fireX + Math.cos(a) * 4, fireY + Math.sin(a) * 1.8, 1.4, 1, "#8a8478", seed + a * 10);
  }
  if (r4 === "ba") {
    trough(ctx, x - 12.2, y + 11.2);
    hayBale(ctx, x - 5.4, y + 10.2, 4.4, 3.2);
    quintain(ctx, Y.kitX, Y.kitY);
  } else if (r4 === "bb") {
    for (const [i, px] of [-9.2, -5.4, -1.6].entries()) pavise(ctx, x + px, Y.brazY, i);
    butt(ctx, Y.kitX, Y.kitY);
  } else if (ber) rack(ctx, Y.kitX, Y.kitY, L.green);
  else if (r4 === "aa") {
    // the Champion's hammer: handle driven into a stone plinth that stands
    // in the yard, the great head held high
    const hx = Y.kitX - 0.5, py = Y.kitY;
    part(ctx, (c) => cylinder(c, hx - 1.3, y - 16, 2.6, py - 3 - (y - 16), "#6a4a2e", { r: 1 }));
    part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(hx - 1.7, y - 2, 3.4, 1.2); c.fillRect(hx - 1.7, y - 8, 3.4, 1.2); });
    part(ctx, (c) => {
      roundRect(c, hx - 7, y - 24, 14, 8, 1.5);
      c.fillStyle = lin(c, hx - 7, 0, hx + 7, 0, [[0, "#f0f2f8"], [0.5, "#b0b4c0"], [1, "#5a5e6a"]]); c.fill();
      c.fillStyle = "#d8b34a"; c.fillRect(hx - 7, y - 21, 14, 1.2); c.fillRect(hx - 1, y - 24, 2, 8);
    });
    part(ctx, (c) => { roundRect(c, hx - 4.5, py - 5.5, 9, 2.5, 1); c.fillStyle = lighten(PALE_STONE, 0.18); c.fill(); });   // its top
    ashlar(ctx, hx - 4, py - 3.5, 8, 3.5, PALE_STONE, seed, { course: 3.5, block: 4 });
    part(ctx, (c) => cylinder(c, hx - 1.3, py - 7, 2.6, 3, "#6a4a2e", { r: 1 }));   // where it bites the stone
  } else if (!pal && lvl >= 2) rack(ctx, Y.kitX, Y.kitY, "#a04a3f");
  else if (pal) rack(ctx, Y.kitX, Y.kitY, "#d8b34a");
  if (!pal && !ber && lvl === 1) dummy(ctx, Y.kitX, Y.kitY + 0.5);
  if (!pal && !ber && lvl === 2) dummy(ctx, fireX, Y.kitY + 0.5);
  // a posy where the yard has room for one
  if (!ber && !pal && lvl === 1) posy(ctx, x - 6, y + 13, "#e8e4d8", seed);
  if (pal && r4 !== "aa") posy(ctx, x + 7.5, y + 13, "#e8e4d8", seed);
};

// A row of sharpened stakes, tallest in the middle, behind the hall (the
// bunkhouse's and the paladins' backing fence).
const palisade = (ctx, x, top, half, col, seed = 0) => {
  const n = Math.round(half / 3.4);
  for (let i = -n; i <= n; i++) {
    const px = x + i * 3.4, ph = 18 - Math.abs(i) * (8 / n) + hash(seed, i + 9) * 2;
    part(ctx, (c) => {
      cylinder(c, px - 1.7, top - ph, 3.4, ph + 4, mix(col, darken(col, 0.3), hash(seed, i + 20)), { r: 1, hi: 0.3, lo: 0.5 });
      c.fillStyle = lighten(col, 0.1); c.beginPath(); c.moveTo(px - 1.7, top - ph); c.lineTo(px, top - ph - 3); c.lineTo(px + 1.7, top - ph); c.closePath(); c.fill();
    });
  }
  part(ctx, (c) => cylinder(c, x - n * 3.4 - 1.7, top - 6, n * 6.8 + 3.4, 1.4, darken(col, 0.2), { r: 0.6 }));
};

export const drawGarrison = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const { hw, wallH, baseY, r4, lvl } = dims(t);
  const pal = t.branch === "a", ber = t.branch === "b";
  const grown = lvl >= 3 || !!t.branch;
  const col = COLORS(t);
  const wallTop = baseY - wallH;
  const roofH = roofOf(t);
  const form = `${lvl}|${t.branch}|${t.rank4}`, v = t.id % 3, tv = { ...t, id: v };

  const canBake = typeof document !== "undefined";
  if (canBake) {
    const g = baked(`ground|${form}|${v}`, BOX.left + BOX.right, 44, (c) => paintGround(c, tv, BOX.left, 16), false);
    ctx.drawImage(g, x - BOX.left, y - 16, g.width / PX, g.height / PX);
  }
  if (r4 === "ab") {
    // holy runes burning in the ring: on the ground, so under the hall and
    // the yard's things
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.25;
      const on = 0.5 + 0.5 * Math.sin(time * 2.5 + i * 1.7);
      ctx.fillStyle = rgba("#f8e08a", 0.35 + on * 0.6);
      const rx = x + Math.cos(a) * 14.5, ry = y + 9 + Math.sin(a) * 4.6;
      ctx.fillRect(rx - 0.5, ry - 1.5, 1, 3); ctx.fillRect(rx - 1.5, ry - 0.5, 3, 1);
    }
  }
  if (canBake) {
    const cv = baked(`hall|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintHall(c, tv, BOX.left, BOX.up));
    ctx.drawImage(cv, x - BOX.left, y - BOX.up, cv.width / PX, cv.height / PX);
  } else paintHall(ctx, t, x, y);

  // ---- fire: the campfire
  const Y = yard(x, y);
  if (grown && r4 !== "ba" && r4 !== "bb") flame(ctx, Y.fireX, Y.fireY - 0.6, 0.72, time, t.id);
  // the chimney's smoke
  if (!ber && r4 !== "ab") for (let i = 0; i < 4; i++) {
    const t2 = (time * 9 + i * 5 + t.id * 2) % 20;
    const drift = Math.sin(time * 1.6 + i) * 3 + t2 * 0.25;
    soft(ctx, x + hw * 0.5 + drift, wallTop - roofH * 0.55 - 9 - t2, 2 + t2 / 7, 2 + t2 / 7, [[0, `rgba(198,198,190,${Math.max(0, 0.45 - t2 * 0.022)})`], [1, "rgba(198,198,190,0)"]]);
  }
  // torchlight at the door and in the windows
  const dg = 0.45 + 0.15 * Math.sin(time * 1.9 + t.id);
  if (lvl >= 2 && !pal && !ber) flame(ctx, x + 5, baseY - 11.5, 0.4, time, t.id + 2);
  if (r4 === "bb") for (const s of [-1, 1]) flame(ctx, x + s * 4.8, baseY - 4 - 5.5 - 5, 0.38, time, t.id + 2 + s);
  if (pal) glow(ctx, x, wallTop - 1, 4, "#f8e8a0", dg);
  if (r4 === "aa") glow(ctx, Y.kitX - 0.5, y - 20, 9, "#f8e8a0", 0.35 + 0.15 * Math.sin(time * 2 + t.id));
  // the sunburst over the dome
  if (r4 === "ab") glow(ctx, x, wallTop - 20, 10, "#f8e08a", 0.3 + 0.12 * Math.sin(time * 1.4 + t.id));
  // the Lancers' long pennons on their lances
  if (r4 === "ba") {
    const rt = wallTop - roofH, rx = hw * 0.5;
    for (const [i, s] of [-1, 1].entries()) pennon(ctx, x + s * (rx + 1.5), rt - 11 + i * 2, 12, time, t.id + s * 1.3);
  }
  // the standard on the ridge
  if (r4 !== "ba") pennant(ctx, x, wallTop - roofH - (r4 === "ab" ? 18 : 12), 1, col.flag, time, t.id, 1);
  // rally flag
  if (t.rally) {
    const rx = t.rally.x, ry = t.rally.y;
    shadow(ctx, rx + 1, ry + 4, 4, 1.5, 0.25);
    pennant(ctx, rx, ry - 10, 14, col.flag, time, t.id + 3, 1);
  }
};
