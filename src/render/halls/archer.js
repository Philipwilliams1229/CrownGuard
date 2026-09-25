// ============ HALL: THE ARCHER TOWER ============
// It GROWS: a timber watch-post on trestle legs at level one, a stone storey
// under a jettied timber loft at two, a coursed stone tower with a parapet
// walk at three. The Ranger Company goes to the forest — moss and ivy, a
// leaf-thatched awning, a butt of straw at the foot; the Briar Rangers let
// the thorns in and brew venom in a cauldron; the Hawkeye Conclave raises a
// hawk's mast. The Master Longbowman climbs a slender pale tower between
// two slate-capped pinnacles; the Ballista bands it in iron and mounts a
// great siege bow; the Dragonslayer hangs a wyrm's skull under the walk.
//
// Three layers, all baked once per form: the ground bed (un-inked, so the
// shadow stays a shadow), the body (everything behind the crew), and the
// front rail the crew stand behind. Only lights, cloth, birds and the crew
// themselves are painted live. archerLayout() says how high the walk is and
// where each archer stands; the engine reads the same numbers, so every
// arrow leaves the bow that loosed it.

import { archerLayout, getStats } from "../../engine/towers.js";
import {
  pennant, vine, TIMBER, OAKWOOD, GREY_STONE, PALE_STONE,
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part, hash,
  groundBed, footClip, footing, ashlar, planks, beam, archWindow, door, banner, flame, torchBracket, merlons, rock, posy,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { drawArcher, drawCrew, ARCHER_FOLK } from "../folk.js";

const FLAGS = {
  base: "#a04a3f", a: "#5c8a44", aa: "#8e2f3a", ab: "#9fc4dc", b: "#3f5a8c", ba: "#6c727e", bb: "#a8302a",
};
const STONES = { base: GREY_STONE, a: "#8f9484", aa: "#83887a", ab: "#98a09c", b: "#bdb5a3", ba: "#8a8782", bb: "#b3a594" };

// ---- sprites ---------------------------------------------------------
const CACHE = new Map();
export const resetArcherBakes = () => CACHE.clear();
const baked = (key, w, h, draw, ink = true) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw, ink); CACHE.set(key, sp); }
  return sp;
};
// stamp a baked sprite anchored at (ax, ay) inside it, facing `dir`
const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.drawImage(cv, -ax, -ay, w, h);
  ctx.restore();
};

// The Ballista's siege bow, mounted on the deck (the castle's wall crews use
// this front-on one too — keep its signature).
export const ballista = (ctx, x, y, dir, recoil) => {
  cylinder(ctx, x - 7, y - 3, 14, 4, OAKWOOD, { r: 1.5, hi: 0.3, lo: 0.5 });
  ctx.save();
  ctx.translate(x, y - 3);
  ctx.rotate(dir * 0.18);
  cylinder(ctx, -2.2, -16, 4.4, 17, darken(TIMBER, 0.1), { r: 1.6, hi: 0.3, lo: 0.5 });
  for (const by of [-14, -6]) cylinder(ctx, -2.8, by, 5.6, 1.8, "#6c727e", { r: 0.8, hi: 0.4, lo: 0.4 });
  for (const side of [-1, 1]) {
    ctx.strokeStyle = lin(ctx, 0, -14, side * 14, -24, [[0, lighten(OAKWOOD, 0.3)], [1, darken(OAKWOOD, 0.35)]]);
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(side * 2, -13);
    ctx.quadraticCurveTo(side * 9, -14, side * 13, -23);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(240,232,210,0.95)";
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-13, -23); ctx.lineTo(0, -19 + recoil * 4); ctx.lineTo(13, -23); ctx.stroke();
  ctx.fillStyle = lin(ctx, -1, 0, 1, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
  roundRect(ctx, -1, -30 + recoil * 4, 2, 12, 1); ctx.fill();
  ctx.fillStyle = "#c4c8d0";
  ctx.beginPath(); ctx.moveTo(-2, -29 + recoil * 4); ctx.lineTo(0, -33 + recoil * 4); ctx.lineTo(2, -29 + recoil * 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ball(ctx, x + 8, y - 4, 3.2, 3.2, "#6c727e", { hi: 0.4, lo: 0.5 });
};

// The tower's own siege bow, seen from the side and facing +x: a banded
// stock on a yoked post, a steel bow-stave arching round the nose, the
// string hauled back to the nut and a bolt the length of a man lying in the
// groove. `loosed` (0..1) runs the string forward and empties the groove.
const IRON = "#4a4c56";
const siegeBow = (ctx, x, y, loosed) => {
  part(ctx, (c) => {
    cylinder(c, x - 2.5, y - 9, 5, 9, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 });
    c.fillStyle = IRON; c.fillRect(x - 2.5, y - 4, 5, 1);
    c.fillRect(x - 4, y - 1, 8, 1.5);
  });
  part(ctx, (c) => {                                   // the yoke
    c.fillStyle = darken(IRON, 0.1);
    c.fillRect(x - 3.5, y - 12.5, 1.5, 4); c.fillRect(x + 2, y - 12.5, 1.5, 4); c.fillRect(x - 3.5, y - 9.5, 7, 1.2);
  });
  ctx.save();
  ctx.translate(x, y - 12);
  ctx.rotate(-0.2);
  const nut = -6 + loosed * 16;
  part(ctx, (c) => {                                   // the stock
    roundRect(c, -14, -1.8, 29, 3.8, 1);
    c.fillStyle = lin(c, 0, -2, 0, 2, [[0, lighten(TIMBER, 0.3)], [0.5, TIMBER], [1, darken(TIMBER, 0.45)]]);
    c.fill();
    c.fillStyle = IRON;
    for (const bx of [-11, -3, 8]) c.fillRect(bx, -2, 1.5, 4);
    c.fillStyle = "#2a2230"; c.fillRect(-9, -2, 21, 0.6);          // the groove
  });
  part(ctx, (c) => {                                   // the stave, arching round the nose
    c.strokeStyle = lin(c, 12, -12, 17, 12, [[0, "#8a909c"], [0.5, "#6c727e"], [1, "#3e4048"]]);
    c.lineWidth = 2.4;
    c.lineCap = "round";
    c.beginPath(); c.moveTo(10.5, -11.5); c.quadraticCurveTo(18.5, 0, 10.5, 11.5); c.stroke();
    c.fillStyle = "#c4c8d0"; c.fillRect(9.5, -12.5, 2, 2); c.fillRect(9.5, 10.5, 2, 2);
  });
  ctx.strokeStyle = "rgba(240,232,210,0.95)";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(10.5, -11.5); ctx.lineTo(nut, -0.5); ctx.lineTo(10.5, 11.5); ctx.stroke();
  if (loosed < 0.5) {
    part(ctx, (c) => {                                 // the bolt in the groove
      c.fillStyle = "#6a4a2e"; c.fillRect(nut, -3, 22, 1.4);
      c.fillStyle = "#c4c8d0";
      c.beginPath(); c.moveTo(nut + 22, -4.2); c.lineTo(nut + 26, -2.3); c.lineTo(nut + 22, -0.4); c.closePath(); c.fill();
      c.fillStyle = "#a04a3f"; c.fillRect(nut, -4, 3, 1); c.fillRect(nut, -1.6, 3, 1);
    });
  }
  // the winch at the heel
  part(ctx, (c) => { ball(c, -13, 0.5, 3.4, 3.4, darken(OAKWOOD, 0.1), { hi: 0.35, lo: 0.5 }); c.fillStyle = IRON; c.fillRect(-13.5, 0, 1, 1); });
  ctx.restore();
};

// A bleached dragon skull, mounted as a trophy: horns swept back, a jaw
// full of teeth, black sockets. Faces +x.
const dragonSkull = (ctx, x, y) => {
  const bone = "#e8dfc6";
  part(ctx, (c) => {                                    // horns behind the crown
    c.strokeStyle = lin(c, x - 8, y - 8, x, y, [[0, "#b8ac8c"], [1, bone]]);
    c.lineWidth = 2.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(x - 2, y - 3); c.quadraticCurveTo(x - 8, y - 5, x - 9, y - 11); c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x - 1, y - 4); c.quadraticCurveTo(x - 4, y - 9, x - 2, y - 12); c.stroke();
  });
  part(ctx, (c) => {
    ball(c, x, y - 1, 5, 4, bone, { hi: 0.45, lo: 0.45 });                 // cranium
    c.fillStyle = lin(c, x, y - 3, x + 9, y + 2, [[0, lighten(bone, 0.2)], [0.5, bone], [1, darken(bone, 0.35)]]);
    c.beginPath(); c.moveTo(x + 1, y - 3.5); c.lineTo(x + 9.5, y - 0.5); c.lineTo(x + 9.5, y + 1.5); c.lineTo(x + 1, y + 2); c.closePath(); c.fill();   // snout
  });
  part(ctx, (c) => {                                    // the jaw, hanging a little open
    c.fillStyle = darken(bone, 0.12);
    c.beginPath(); c.moveTo(x - 2, y + 2); c.lineTo(x + 8.5, y + 3); c.lineTo(x + 8, y + 4.5); c.lineTo(x - 2, y + 4.5); c.closePath(); c.fill();
    c.fillStyle = "#fff8e6";
    for (let i = 0; i < 4; i++) { c.fillRect(x + 1 + i * 2, y + 1.5, 0.8, 1.2); c.fillRect(x + 1.8 + i * 2, y + 2.4, 0.8, 1); }
  });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(x + 0.8, y - 1.2, 1.5, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x + 7.5, y - 0.8, 1, 0.8);
  ctx.fillStyle = "#e8483a"; ctx.fillRect(x + 0.7, y - 1.3, 0.8, 0.8);   // a coal of old spite in the socket
};

// A straw butt on a trestle, target rings painted on, an arrow or two in it.
const strawButt = (ctx, x, y) => {
  beam(ctx, x - 2.5, y, x - 1.5, y - 8, 1.2, OAKWOOD);
  beam(ctx, x + 2.5, y, x + 1.5, y - 8, 1.2, OAKWOOD);
  part(ctx, (c) => {
    ball(c, x, y - 8, 4.2, 4.4, "#d8b868", { hi: 0.35, lo: 0.45 });
    c.fillStyle = "#e8e0c8"; c.beginPath(); c.ellipse(x + 0.3, y - 8, 2.8, 3, 0, 0, 7); c.fill();
    c.fillStyle = "#a04a3f"; c.beginPath(); c.ellipse(x + 0.3, y - 8, 1.8, 1.9, 0, 0, 7); c.fill();
    c.fillStyle = "#e8c14a"; c.fillRect(x - 0.2, y - 8.5, 1, 1);
  });
  ctx.fillStyle = "#6a4a2e"; ctx.fillRect(x + 0.5, y - 10, 4, 0.6);
  ctx.fillStyle = "#e8e0c8"; ctx.fillRect(x + 4, y - 10.4, 1.2, 1.4);
};

// A barrel stood on end, a sheaf of arrows in it.
const arrowBarrel = (ctx, x, y, n = 5) => {
  ctx.fillStyle = "#6a4a2e";
  for (let i = 0; i < n; i++) ctx.fillRect(x - 2.2 + i * 1.1, y - 11 - (i % 2), 0.6, 5);
  ctx.fillStyle = "#e8e0c8";
  for (let i = 0; i < n; i++) ctx.fillRect(x - 2.4 + i * 1.1, y - 12 - (i % 2), 1, 1.5);
  part(ctx, (c) => {
    cylinder(c, x - 3.2, y - 7, 6.4, 7, "#7a5334", { r: 1.5, hi: 0.3, lo: 0.5 });
    c.fillStyle = IRON; c.fillRect(x - 3.2, y - 6, 6.4, 0.8); c.fillRect(x - 3.2, y - 2, 6.4, 0.8);
  });
};

// ---- the parts of every form -------------------------------------------

// Where the foot-of-the-tower props stand: out on the grass in front of the
// footing (whose front edge is y + 7), feet a good step below it, inside the
// footprint — the straw butt front-left, the arrow barrel or the Briar
// cauldron front-right.
// (Kept inside x ± 9 or so: the shared ground-blend layer paints its front
// clumps round the rim at about (x ± 12, y + 8.5), over the hall.)
const PROPS = (x, y) => ({ buttX: x - 8.5, buttY: y + 13.5, barX: x + 8, barY: y + 13, calX: x + 7.5, calY: y + 13 });

// The walk the crew stand on: its floor seen from above (dy-8 .. dy+2) and
// its front face (dy+2 .. dy+7). Timber for the posts, flagstones for towers.
const walkFloor = (ctx, x, dy, pw, stone, col, seed) => {
  if (stone) {
    part(ctx, (c) => {
      roundRect(c, x - pw, dy - 8, pw * 2, 10, 1.5);
      c.fillStyle = lighten(col, 0.12); c.fill();
      c.fillStyle = rgba(darken(col, 0.55), 0.5);
      for (let i = 0; i < 3; i++) c.fillRect(x - pw + 1, dy - 5 + i * 3, pw * 2 - 2, 0.5);
      for (let i = 0; i < 9; i++) c.fillRect(x - pw + 2 + hash(seed, i) * (pw * 2 - 4), dy - 7.5 + (i % 3) * 3, 0.5, 2.5);
    });
    ashlar(ctx, x - pw, dy + 2, pw * 2, 5, col, seed + 3, { course: 5, block: 5 });
    // corbels stepping in under the walk
    for (let cx = x - pw + 2; cx <= x + pw - 3; cx += 4.5) {
      part(ctx, (c) => {
        c.fillStyle = lin(c, cx, 0, cx + 3, 0, [[0, lighten(col, 0.2)], [0.5, col], [1, darken(col, 0.4)]]);
        c.beginPath(); c.moveTo(cx, dy + 7); c.lineTo(cx + 3, dy + 7); c.lineTo(cx + 2.4, dy + 10); c.lineTo(cx + 0.6, dy + 10); c.closePath(); c.fill();
      });
    }
  } else {
    part(ctx, (c) => {
      roundRect(c, x - pw, dy - 8, pw * 2, 10, 1.5);
      c.fillStyle = lighten(col, 0.18); c.fill();
      c.fillStyle = rgba(darken(col, 0.6), 0.55);
      for (let i = 0; i < 4; i++) c.fillRect(x - pw + 1, dy - 6 + i * 2.5, pw * 2 - 2, 0.5);
    });
    planks(ctx, x - pw, dy + 2, pw * 2, 5, col, seed, { flat: true, pw: 2.5 });
    // joist ends under the lip
    for (let jx = x - pw + 2; jx <= x + pw - 3; jx += 5) part(ctx, (c) => cylinder(c, jx, dy + 7, 2.2, 2.4, darken(col, 0.2), { r: 0.6, hi: 0.3, lo: 0.5 }));
  }
};

// A rail of posts and a top rail (timber) along the walk's front.
const woodRail = (ctx, x, dy, pw, col = OAKWOOD, n = 5, rustic = false) => {
  for (let i = 0; i < n; i++) {
    const px = x - pw + 1.5 + (i / (n - 1)) * (pw * 2 - 3);
    part(ctx, (c) => cylinder(c, px - 1.1, dy - 3.5, 2.2, 6.5, col, { r: 0.9, hi: 0.3, lo: 0.5 }));
  }
  part(ctx, (c) => {
    if (rustic) { cylinder(c, x - pw, dy - 4.2, pw * 2, 2.2, lighten(col, 0.08), { r: 1, hi: 0.35, lo: 0.45 }); c.fillStyle = rgba(darken(col, 0.5), 0.6); c.fillRect(x - pw + 3, dy - 3.5, 0.5, 0.5); c.fillRect(x + pw - 5, dy - 3.5, 0.5, 0.5); }
    else cylinder(c, x - pw, dy - 3.8, pw * 2, 1.6, lighten(col, 0.1), { r: 0.8, hi: 0.35, lo: 0.45 });
  });
};

// The ground each form stands on, un-inked.
const paintGround = (ctx, t, x, y) => {
  const lay = archerLayout(t);
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const hw = lay.hw + (t.branch ? 3 : 1);
  ctx.save();
  footClip(ctx, x, y);
  groundBed(ctx, x, y + 7, hw, t.id, { earth: r4 === "aa" ? "#5a5a3a" : "#7c6242" });
  // contact shadows under the props at the tower's foot
  const P = PROPS(x, y);
  const butt = (!t.branch && t.level === 1) || t.branch === "a";
  const barrel = (!t.branch && t.level === 2) || (t.branch === "a" && r4 !== "aa");
  if (butt) shadow(ctx, P.buttX + 0.8, P.buttY + 0.3, 3.8, 1.2, 0.32);
  if (barrel) shadow(ctx, P.barX + 0.8, P.barY + 0.4, 3.8, 1.3, 0.34);
  if (r4 === "aa") soft(ctx, P.calX, P.calY + 0.3, 5, 2, [[0, "rgba(40,28,24,0.5)"], [0.7, "rgba(40,28,24,0.3)"], [1, "rgba(40,28,24,0)"]]);
  ctx.restore();
};

// ---- the still stone and timber of one form, behind the crew -------------
const paintBody = (ctx, t, x, y) => {
  const lay = archerLayout(t);
  const { h, hw, pw } = lay;
  const lvl = t.level, br = t.branch;
  const r4 = t.rank4 ? br + t.rank4 : null;
  const key = r4 || br || "base";
  const dy = y - h;                  // the walk's front edge
  const base = y + 7;                // where the footing meets the turf
  const seed = t.id * 7 + lvl;
  const col = STONES[key] || GREY_STONE;

  if (!br && lvl === 1) {
    // ---- the watch-post: a plank deck on four splayed trestle legs
    for (const s of [-1, 1]) {
      rock(ctx, x + s * hw, base - 0.5, 2.6, 1.6, "#9a9488", seed + s);
      beam(ctx, x + s * (pw - 5), dy + 6, x + s * (hw - 4), base - 2, 2.2, darken(OAKWOOD, 0.25));   // back legs
    }
    beam(ctx, x - hw + 1, base - 5, x + hw - 1, dy + 11, 1.3, darken(OAKWOOD, 0.1));                 // cross-braces
    beam(ctx, x + hw - 1, base - 5, x - hw + 1, dy + 11, 1.3, darken(OAKWOOD, 0.05));
    beam(ctx, x - hw, dy + 16, x + hw, dy + 16, 1.5, OAKWOOD);                                        // girt
    for (const s of [-1, 1]) beam(ctx, x + s * (pw - 2), dy + 5, x + s * hw, base - 1, 2.8, OAKWOOD); // front legs
    // the ladder up the middle
    for (const s of [-1, 1]) beam(ctx, x + s * 2.4, base - 1, x + s * 2.2, dy + 4, 1.1, lighten(OAKWOOD, 0.12));
    part(ctx, (c) => { c.fillStyle = lighten(OAKWOOD, 0.15); for (let ry = base - 4; ry > dy + 6; ry -= 3) c.fillRect(x - 2.2, ry, 4.4, 0.8); });
    // a flagpole lashed to the back corner
    part(ctx, (c) => cylinder(c, x + pw - 3.2, dy - 20, 1.6, 22, OAKWOOD, { r: 0.8 }));
    walkFloor(ctx, x, dy, pw, false, TIMBER, seed);
    const P = PROPS(x, y);
    posy(ctx, x + 6.5, y + 13.5, "#b08ad8", seed);
    strawButt(ctx, P.buttX, P.buttY);
    return;
  }

  // ---- every stone form: the footing and the shaft
  const bodyTop = dy + 7;
  const green = br === "a", master = br === "b";
  footing(ctx, x, base, hw + (master ? 1 : 0), darken(col, 0.05), seed, master ? 6 : 5);
  if (!br && lvl === 2) {
    // a stone storey under a jettied timber loft
    const loftTop = bodyTop, loftBot = bodyTop + 10;
    ashlar(ctx, x - hw, loftBot, hw * 2, base - 5 - loftBot, col, seed, { course: 4.5, block: 6.5, moss: 0.6 });
    door(ctx, x, base - 5, 5, 8);
    planks(ctx, x - hw - 1.5, loftTop, hw * 2 + 3, loftBot - loftTop, TIMBER, seed, { pw: 3 });
    part(ctx, (c) => cylinder(c, x - hw - 2, loftBot - 1, hw * 2 + 4, 2, darken(OAKWOOD, 0.1), { r: 0.8 }));
    for (const s of [-1, 1]) beam(ctx, x + s * (hw - 1), loftBot + 4, x + s * (hw + 1), loftBot, 1.4, darken(OAKWOOD, 0.1));
    // a round shield hung on the loft
    part(ctx, (c) => { ball(c, x + 5, loftTop + 5, 3, 3, "#a04a3f", { hi: 0.4, lo: 0.45 }); c.fillStyle = "#e8e0c8"; c.fillRect(x + 4.5, loftTop + 2.5, 1, 5); c.fillRect(x + 2.5, loftTop + 4.5, 5, 1); });
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, x - 5.2, loftTop + 2.5, 2.4, 5, 1); c.fill(); });    // a shutter slit
    // back posts and a back rail
    for (const s of [-1, 1]) part(ctx, (c) => cylinder(c, x + s * (pw - 2) - 1.1, dy - 13, 2.2, 7, OAKWOOD, { r: 0.9 }));
    part(ctx, (c) => cylinder(c, x - pw + 1, dy - 13, pw * 2 - 2, 1.6, lighten(OAKWOOD, 0.1), { r: 0.8 }));
    part(ctx, (c) => cylinder(c, x + pw - 3.2, dy - 26, 1.6, 20, OAKWOOD, { r: 0.8 }));
    walkFloor(ctx, x, dy, pw, false, TIMBER, seed);
    const P = PROPS(x, y);
    arrowBarrel(ctx, P.barX, P.barY, 4);
    return;
  }

  // the shaft
  ashlar(ctx, x - hw, bodyTop, hw * 2, base - 5 - bodyTop, col, seed, {
    course: master ? 4 : 4.5, block: master ? 5.5 : 6.5, band: master ? 5 : 4, moss: green ? 1.2 : 0.5, cracks: r4 === "ba" || r4 === "bb",
  });
  door(ctx, x, base - 5, master ? 5 : 6, master ? 9 : 9.5);
  torchBracket(ctx, x - (master ? 5 : 6.5), base - 11);
  // arrow slits; their torchlight is painted live
  const slits = master ? [dy + 30, dy + 17] : [dy + 26];
  for (const sy of slits) part(ctx, (c) => {
    c.fillStyle = lighten(col, 0.25); roundRect(c, x - 2, sy - 1, 4, 8, 1.5); c.fill();
    c.fillStyle = "#2a2430"; roundRect(c, x - 1, sy, 2, 6, 0.8); c.fill();
  });
  if (r4 === "ba") {
    // iron hoops round the shaft, riveted
    for (const by of [dy + 14, dy + 36]) part(ctx, (c) => {
      cylinder(c, x - hw - 0.5, by, hw * 2 + 1, 2.2, IRON, { r: 0.6, hi: 0.4, lo: 0.5 });
      c.fillStyle = "#8a909c"; for (let rx = x - hw + 1.5; rx < x + hw; rx += 3) c.fillRect(rx, by + 0.8, 0.6, 0.6);
    });
  }

  // ---- what stands at the BACK of the walk, behind the crew
  if (green) {
    // a leaf-thatched lean-to on two poles, sloping up and away
    const roof = r4 === "aa" ? "#3f5e30" : r4 === "ab" ? "#4d7a52" : "#4d7a3c";
    for (const s of [-1, 1]) part(ctx, (c) => cylinder(c, x + s * (pw - 3) - 1.2, dy - 25, 2.4, 20, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));
    if (r4 === "ab") {
      // the hawk's mast, a perch bar and a little crow's-nest
      part(ctx, (c) => cylinder(c, x - 1.1, dy - 58, 2.2, 36, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));
      part(ctx, (c) => cylinder(c, x - 7, dy - 50, 14, 1.6, lighten(OAKWOOD, 0.1), { r: 0.8 }));
      part(ctx, (c) => { roundRect(c, x - 4, dy - 44, 8, 4, 1); c.fillStyle = lin(c, x - 4, 0, x + 4, 0, [[0, lighten(TIMBER, 0.3)], [0.5, TIMBER], [1, darken(TIMBER, 0.4)]]); c.fill(); c.fillStyle = rgba(darken(TIMBER, 0.6), 0.6); c.fillRect(x - 4, dy - 42.5, 8, 0.5); });
      banner(ctx, x - 5.5, dy - 49, 3.5, 7, "#9fc4dc", "#e8e0c8", null, { point: true });
    }
    part(ctx, (c) => {
      c.beginPath();
      c.moveTo(x - pw - 1, dy - 14);
      c.lineTo(x - pw + 2, dy - 27);
      c.lineTo(x + pw - 2, dy - 27);
      c.lineTo(x + pw + 1, dy - 14);
      c.closePath();
      c.fillStyle = lin(c, x - pw, dy - 27, x + pw * 0.6, dy - 14, [[0, lighten(roof, 0.35)], [0.45, roof], [1, darken(roof, 0.45)]]);
      c.fill();
      c.save(); c.clip();
      for (let ry = dy - 16, i = 0; ry > dy - 27; ry -= 2.8, i++) {
        c.fillStyle = rgba(darken(roof, 0.55), 0.45); c.fillRect(x - pw - 1, ry, pw * 2 + 2, 0.5);
        c.fillStyle = rgba(lighten(roof, 0.4), 0.35);
        for (let lx = x - pw + (i % 2) * 2; lx < x + pw; lx += 4) c.fillRect(lx, ry - 1.5, 1.5, 1);
      }
      c.restore();
    });
    // a ragged fringe of leaves along the eave
    for (let i = 0; i < 9; i++) {
      const lx = x - pw + (i / 8) * pw * 2;
      part(ctx, (c) => ball(c, lx, dy - 14 + (i % 2), 2.2, 1.7, i % 3 ? roof : lighten(roof, 0.18), { hi: 0.4, lo: 0.4 }));
    }
    if (r4 === "aa") for (let i = 0; i < 5; i++) {
      const bx2 = x - pw + 3 + i * (pw * 2 - 6) / 4;
      ball(ctx, bx2, dy - 15 + (i % 2), 0.9, 0.9, "#c8383a", { hi: 0.6, lo: 0.3 });
    }
  } else if (master) {
    // two slender pinnacles at the back corners, capped in slate (or
    // crimson with a gilt spike for the Dragonslayer); the Ballista trades
    // them for an iron-bound back wall racked with bolts
    if (r4 === "ba") {
      ashlar(ctx, x - pw + 1, dy - 22, pw * 2 - 2, 16, col, seed + 11, { course: 4, block: 5 });
      merlons(ctx, x, dy - 22, pw - 1, col, { step: 5.5, w: 3.5, h: 4, seed });
      part(ctx, (c) => {
        for (let i = 0; i < 5; i++) {
          const bx2 = x - 8 + i * 4;
          c.fillStyle = "#6a4a2e"; c.fillRect(bx2, dy - 19, 1.2, 12);
          c.fillStyle = "#c4c8d0"; c.beginPath(); c.moveTo(bx2 - 0.8, dy - 19); c.lineTo(bx2 + 0.6, dy - 22.5); c.lineTo(bx2 + 2, dy - 19); c.closePath(); c.fill();
        }
        c.fillStyle = IRON; c.fillRect(x - 10, dy - 12, 20, 1.2);
      });
    } else {
      const capCol = r4 === "bb" ? "#a8302a" : "#4a6a92";
      for (const s of [-1, 1]) {
        const px = x + s * (pw - 3);
        ashlar(ctx, px - 2.5, dy - 22, 5, 18, col, seed + s * 5, { course: 3.5, block: 5, r: 1 });
        part(ctx, (c) => cylinder(c, px - 3.2, dy - 23.5, 6.4, 2, lighten(col, 0.1), { r: 0.8 }));
        part(ctx, (c) => cone(c, px, dy - 36, 4, 13, capCol, { scallops: 2, sag: 1, hi: 0.42, lo: 0.5 }));
        part(ctx, (c) => {
          c.fillStyle = r4 === "bb" ? "#d8b34a" : "#c4c8d0";
          c.fillRect(px - 0.4, dy - 40, 0.8, 4.5);
          ball(c, px, dy - 36.5, 1, 1, r4 === "bb" ? "#d8b34a" : "#c4c8d0", { hi: 0.5, lo: 0.3 });
        });
        if (r4 !== "bb") part(ctx, (c) => { c.fillStyle = "#2a2430"; c.fillRect(px - 0.5, dy - 17, 1, 3); });
      }
      // a low back wall between them
      merlons(ctx, x, dy - 7, pw - 6, col, { step: 5, w: 3.5, h: 4, seed });
    }
  } else {
    // the finished tower: a crenellated back parapet
    merlons(ctx, x, dy - 7, pw - 1, col, { step: 5.8, w: 4, h: 5, seed });
    part(ctx, (c) => cylinder(c, x + pw - 3.2, dy - 34, 1.6, 28, OAKWOOD, { r: 0.8 }));
  }

  walkFloor(ctx, x, dy, pw, !green, green ? TIMBER : col, seed);

  // ---- dressings on the shaft, under the walk
  if (!br) banner(ctx, x, bodyTop + 3.5, 6, 12, FLAGS.base, "#d8b34a", (c, cx, cy) => {
    c.fillStyle = "#e8d47a"; c.fillRect(cx - 0.5, cy - 3, 1, 6);
    c.beginPath(); c.moveTo(cx - 2, cy - 2); c.lineTo(cx, cy - 4.5); c.lineTo(cx + 2, cy - 2); c.closePath(); c.fill();
  });
  if (green) {
    vine(ctx, x - hw + 1, bodyTop + 4, base - bodyTop - 8, -1, seed, r4 === "aa" ? "#3c6a34" : "#4f8a3c", r4 === "aa" ? "#c8383a" : null);
    vine(ctx, x + hw - 1, bodyTop + 12, base - bodyTop - 16, 1, seed + 3, r4 === "aa" ? "#3c6a34" : "#4f8a3c", r4 === "aa" ? "#c8383a" : null);
    const bcol = r4 === "aa" ? "#4a2a3a" : r4 === "ab" ? "#5a86a8" : "#3f6a34";
    banner(ctx, x + 1, bodyTop + 3.5, 6.5, 13, bcol, r4 === "ab" ? "#e8e0c8" : "#d8b34a", (c, cx, cy) => {
      if (r4 === "aa") {                                  // a briar rose
        c.fillStyle = "#c8383a"; c.beginPath(); c.arc(cx, cy, 1.8, 0, 7); c.fill();
        c.fillStyle = "#6fa04a"; c.fillRect(cx - 0.3, cy + 1.5, 0.8, 3);
      } else if (r4 === "ab") {                           // an open eye
        c.fillStyle = "#e8e0c8"; c.beginPath(); c.ellipse(cx, cy, 2.4, 1.4, 0, 0, 7); c.fill();
        c.fillStyle = "#2a3a5a"; c.fillRect(cx - 0.8, cy - 0.8, 1.6, 1.6);
      } else {                                            // an oak leaf
        c.fillStyle = "#e8d47a"; c.beginPath(); c.ellipse(cx, cy, 1.5, 2.6, 0, 0, 7); c.fill();
        c.fillRect(cx - 0.25, cy + 2, 0.5, 2);
      }
    }, { point: true });
    const P = PROPS(x, y);
    strawButt(ctx, P.buttX, P.buttY);
    if (r4 !== "aa") arrowBarrel(ctx, P.barX, P.barY, 5);
  }
  if (master) {
    const bcol = r4 === "ba" ? "#3e4048" : r4 === "bb" ? "#8e2a26" : "#3f5a8c";
    banner(ctx, x, bodyTop + 3, 6, 11, bcol, "#d8b34a", (c, cx, cy) => {
      c.fillStyle = "#e8d47a";
      if (r4 === "ba") { c.fillRect(cx - 2, cy - 2, 4, 0.8); c.fillRect(cx - 0.4, cy - 3, 0.8, 6); }            // a bolt
      else if (r4 === "bb") { c.beginPath(); c.moveTo(cx - 2, cy + 2); c.lineTo(cx, cy - 3); c.lineTo(cx + 2, cy + 2); c.lineTo(cx, cy); c.closePath(); c.fill(); }  // a wing
      else { c.fillRect(cx - 0.4, cy - 3, 0.8, 6); c.beginPath(); c.moveTo(cx - 1.8, cy - 1.5); c.lineTo(cx, cy - 4); c.lineTo(cx + 1.8, cy - 1.5); c.closePath(); c.fill(); }
    }, { point: true });
    if (r4 === "bb") dragonSkull(ctx, x - 1, bodyTop + 22);
    if (r4 === "ba") {
      // (the spare bolts live in the rack on the walk: the foot is kept clear)
    }
  }
  if (r4 === "aa") {
    // the venom cauldron on its fire-stones, out in the grass; the brew is
    // painted live
    const { calX: cx, calY: cb } = PROPS(x, y);
    part(ctx, (c) => {
      c.beginPath(); c.ellipse(cx, cb - 3.7, 3.6, 3.2, 0, 0, Math.PI * 2);
      c.fillStyle = lin(c, cx - 3.5, 0, cx + 3.5, 0, [[0, "#5a5a66"], [0.5, "#3a3a44"], [1, "#22222a"]]);
      c.fill();
      c.fillStyle = "#6c727e"; c.fillRect(cx - 3.5, cb - 6.5, 7, 1);
    });
    for (let i = 0; i < 3; i++) rock(ctx, cx - 2.5 + i * 2.5, cb - 0.2 + (i === 1 ? 0.5 : 0), 1.2, 0.9, "#8a8478", seed + i);
  }
};

// ---- what stands IN FRONT of the crew: the rail they lean on -------------
const paintFront = (ctx, t, x, y) => {
  const lay = archerLayout(t);
  const { h, pw } = lay;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const dy = y - h;
  const col = STONES[key] || GREY_STONE;
  if (!t.branch && t.level <= 2) woodRail(ctx, x, dy + 2, pw - 0.5, OAKWOOD, t.level === 1 ? 4 : 5);
  else if (t.branch === "a") {
    woodRail(ctx, x, dy + 2, pw - 0.5, darken(OAKWOOD, 0.1), 5, true);
    if (r4 === "aa") {
      // sharpened briar stakes bristling from the rail
      for (let i = 0; i < 5; i++) {
        const sx = x - pw + 2 + i * (pw * 2 - 4) / 4;
        beam(ctx, sx, dy + 1, sx + (i < 2 ? -2 : i > 2 ? 2 : 0), dy - 6, 1.1, "#5a4028");
      }
    }
  } else {
    merlons(ctx, x, dy + 2.5, pw - 0.5, col, { step: pw > 15 ? 6.4 : 5.6, w: 4, h: 4, seed: t.id });
  }
};

// The sprite boxes around the anchor: how far the art reaches each way.
const BOX = { left: 40, right: 40, up: 116, down: 18 };
const FRONT = { left: 24, right: 24, up: 64, down: 4 };

export const drawArcherTower = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lay = archerLayout(t);
  const { h, pw, hw, big } = lay;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const dy = y - h;
  const base = y + 7;
  const form = `${lvl}|${t.branch}|${t.rank4}`;
  const v = t.id % 3;
  const canBake = typeof document !== "undefined";
  const tv = { ...t, id: v };

  // ---- the still parts, baked
  if (canBake) {
    stamp(ctx, baked(`ground|${form}|${v}`, BOX.left + BOX.right, 36, (c) => paintGround(c, tv, BOX.left, 14), false), x, y, BOX.left, 14);
    stamp(ctx, baked(`body|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBody(c, tv, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  } else paintBody(ctx, t, x, y);

  // ---- torchlight: the slits breathe, the door torch flickers
  const master = t.branch === "b";
  if (lvl >= 3 || t.branch) {
    const slits = master ? [dy + 30, dy + 17] : [dy + 26];
    for (const [i, sy] of slits.entries()) if (!t._idle || Math.sin(time * 1.7 + t.id + i * 2) > -0.5) glow(ctx, x, sy + 3, 3, "#ffd070", 0.7);
    flame(ctx, x - (master ? 5 : 6.5), base - 16.5, 0.45, time, t.id);
  }
  if (r4 === "aa") {
    // the venom brew: a sick green glow and bubbles that pop at the rim
    const { calX: cx, calY: cb } = PROPS(x, y);
    glow(ctx, cx, cb - 7, 5, "#8ce05a", 0.35 + 0.1 * Math.sin(time * 3 + t.id));
    ctx.fillStyle = "#8ce05a"; ctx.fillRect(cx - 3, cb - 7.1, 6, 1);
    for (let i = 0; i < 3; i++) {
      const ph = (time * 0.9 + i * 0.37 + t.id * 0.1) % 1;
      const bx = cx - 2 + i * 2, by = cb - 7.5 - ph * 7;
      ctx.fillStyle = rgba("#b8f08a", 1 - ph);
      ctx.fillRect(bx, by, ph < 0.2 ? 1.5 : 1, ph < 0.2 ? 1.5 : 1);
    }
  }

  // ---- the crew
  const st = getStats(t);
  const rate = st.rate || 1000;
  const aimDir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const spots = lay.spots.map((s, i) => ({ dx: s[0], dy: s[1], i })).sort((a, b) => a.dy - b.dy);
  // One archer's moment in the cycle: `ph` 0 = the one who just loosed.
  const poseOf = (ph) => {
    if (ph === 0) {
      if (t.anim > 0.55) return ["loose", 0];
      if (t.anim > 0.2) return ["reach", 0];
      const f = t.cd / rate;
      return ["draw", f > 0.6 ? 1 : f > 0.28 ? 2 : 3];
    }
    return ph === 1 ? ["draw", 3] : ["draw", 1];
  };
  if (r4 === "ba") {
    const loosed = t.anim > 0.3 ? 1 : 0;
    const dir = t._idle ? (Math.sin(time * 0.35 + t.id) >= 0 ? 1 : -1) : aimDir;
    const bcv = canBake ? baked(`siege|${loosed}`, 50, 40, (c) => siegeBow(c, 22, 34, loosed)) : null;
    if (bcv) stamp(ctx, bcv, x - dir * 2, dy + 1, 22, 34, dir); else siegeBow(ctx, x, dy + 1, loosed);
    // the winch's spokes turn while it cocks
    if (!t._idle && t.anim < 0.3) {
      // the winch hub sits at (-13, 0.5) on the stock, which is tipped -0.2
      const spin = time * 5;
      const wx = x - dir * 2 - dir * 12.64, wy = dy + 1 - 12 + 3.07;
      ctx.strokeStyle = "#c4c8d0"; ctx.lineWidth = 0.6;
      for (let i = 0; i < 2; i++) {
        const a = spin + (i / 2) * Math.PI;
        ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 2.6, wy - Math.sin(a) * 2.6); ctx.lineTo(wx + Math.cos(a) * 2.6, wy + Math.sin(a) * 2.6); ctx.stroke();
      }
    }
    const work = t._idle ? 1 : Math.round((Math.sin(time * 6 + t.id) + 1) * 1.5);   // 0..3
    const ccv = canBake ? baked(`crew|${work}`, 28, 30, (c) => drawCrew(c, 12, 27, 1, ARCHER_FOLK.crew, (work - 1.5) * 0.4)) : null;
    if (ccv) stamp(ctx, ccv, x - dir * (pw - 3), dy + 1, 12, 27, dir);
  } else {
    const pal = ARCHER_FOLK[key] || ARCHER_FOLK.base;
    const bowCol = r4 === "bb" ? "#8a2f24" : master ? "#3a2a1e" : "#4a3018";
    const fletch = r4 === "bb" ? "#d8b34a" : r4 === "ab" ? "#9fc4dc" : undefined;
    const n = spots.length;
    for (const sp of spots) {
      let pose, step, dir;
      if (t._idle) {
        // at ease: bows down, each archer looking his own way; now and
        // then one tests his string
        dir = Math.sin(time * 0.5 + t.id + sp.i * 2.1) >= 0 ? 1 : -1;
        const test = ((time / 5 + sp.i * 0.33 + t.id * 0.17) % 1) < 0.14;
        pose = test ? "draw" : "rest"; step = test ? 2 : 0;
      } else {
        dir = aimDir;
        // the rangers loose in relay; everyone else as one
        const ph = t.branch === "a" ? (sp.i - t.shotIdx + n) % n : 0;
        [pose, step] = poseOf(ph);
      }
      const fkey = `archer|${key}|${big ? 1 : 0}|${pose}|${step}`;
      const draw = step / 3;
      const fcv = canBake ? baked(fkey, 34, 34, (c) => drawArcher(c, 12, 30, 1, pal, draw, { big, bowCol, pose, fletch })) : null;
      if (fcv) stamp(ctx, fcv, x + sp.dx, dy + 3 + sp.dy, 12, 30, dir);
      else drawArcher(ctx, x + sp.dx, dy + 3 + sp.dy, dir, pal, draw, { big, bowCol, pose });
    }
  }

  // ---- the rail the crew stand behind
  if (canBake) stamp(ctx, baked(`front|${form}|${v}`, FRONT.left + FRONT.right, FRONT.up + FRONT.down, (c) => paintFront(c, tv, FRONT.left, FRONT.up)), x, y, FRONT.left, FRONT.up);
  else paintFront(ctx, t, x, y);

  // ---- the standard, flying from the back corner of the walk
  const flag = FLAGS[key] || FLAGS.base;
  if (!t.branch) {
    const top = lvl === 1 ? dy - 20 : lvl === 2 ? dy - 26 : dy - 34;
    pennant(ctx, x + pw - 2.4, top, 1, flag, time, t.id, 1);
  } else if (master && r4 !== "ba") pennant(ctx, x - pw + 3, dy - 40, 1, flag, time, t.id, -1);
  else if (r4 === "ba") pennant(ctx, x + pw - 3, dy - 30, 8, flag, time, t.id, 1);
  else if (r4 !== "ab") pennant(ctx, x + pw - 3, dy - 33, 8, flag, time, t.id, 1);
  if (r4 === "ab") {
    // one hawk keeps the perch, one wheels over the road
    const perched = t._idle && Math.sin(time * 0.3 + t.id) > 0;
    hawkSit(ctx, x + 5, dy - 51);
    if (!perched) hawk(ctx, x, dy - 62, time, t.id);
    else hawkSit(ctx, x - 5, dy - 51);
  }
};

// A hawk on the wing, wheeling over the tower.
const hawk = (ctx, x, y, time, id) => {
  const ang = time * 1.6 + id;
  const hx = x + Math.cos(ang) * 20, hy = y + Math.sin(ang) * 6;
  const flap = Math.sin(time * 9 + id) * 2.5;
  const face = Math.cos(ang + Math.PI / 2) >= 0 ? 1 : -1;
  for (const side of [-1, 1]) {
    ctx.strokeStyle = side < 0 ? "#5a4028" : "#7a5a3a";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + side * 4, hy - 2 - flap, hx + side * 8, hy - flap * 0.6); ctx.stroke();
  }
  ball(ctx, hx, hy, 2.6, 1.6, "#7a5a3a", { hi: 0.45, lo: 0.4 });
  ball(ctx, hx + face * 2.4, hy - 0.4, 1.3, 1.1, "#e8dfc6", { hi: 0.4, lo: 0.3 });
  ctx.fillStyle = "#e8c14a"; ctx.fillRect(hx + face * 3.4 - 0.4, hy - 0.4, 0.8, 0.8);
};
// A hawk at rest on the perch bar.
const hawkSit = (ctx, x, y) => {
  ball(ctx, x, y - 2.4, 1.8, 2.6, "#7a5a3a", { hi: 0.45, lo: 0.45 });
  ball(ctx, x + 0.5, y - 5, 1.4, 1.3, "#e8dfc6", { hi: 0.4, lo: 0.3 });
  ctx.fillStyle = "#e8c14a"; ctx.fillRect(x + 1.6, y - 5, 0.8, 0.6);
  ctx.fillStyle = "#4a3420"; ctx.fillRect(x - 1.8, y - 1, 1, 2);
};
