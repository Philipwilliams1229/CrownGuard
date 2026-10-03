// ============ ZONE IV PAINTERS (PLACEHOLDER) ============
// What the Rimewater's engine mechanics look like until the zone IV artists
// draw them (engine/rime.js has the rules). Hooked into draw.js in four
// places: the longship among the drawables (drawShip), the ice shells over
// frozen halls (drawFrostShells), the effects (ZONE_FX[fx.type]), and the
// rig aliases below. Everything here is a stand-in to be replaced:
//   drawShip        a longship under sail: hull, striped sail, oars, a
//                   health bar (its hp decides how many raiders land)
//   landingWarn     the telegraph: a pulsing ring where it will beach and a
//                   dotted line up to the road, for the whole run in
//   beached         the empty hull drawn up on the shingle, fading
//   shipsink        a holed hull going down by the bow
//   plank           a raider's jump from the hull to the road
//   frostcast       the seer's cast: a pale line from her to the hall
//   thaw            the shell breaking up
//   drawFrostShells a pale blue ice shell over a frozen hall, cracking as
//                   it thaws (faster, with a warm rim, when fire is helping)

import { S, CELL } from "../data/constants.js";
import { RIGS } from "./rigs.js";

// ---- borrowed looks for the clans' stub foes (data/enemies.js) ----
// (until rigs-rime.js exists: delete these lines when it lands)
for (const [type, like] of [["thrall", "levy"], ["huscarl", "sergeant"], ["rimeseer", "chaplain"]]) {
  if (!RIGS[type] && RIGS[like]) RIGS[type] = RIGS[like];
}

const HULL = "#4a3420", HULL_LT = "#7a5634", HULL_DK = "#2a1c12", SAIL = "#e8e0cc", STRIPE = "#a8382c";

// the hull, sail and oars of a longship centred on (x, y), facing `face`,
// tilted by `tilt` (radians) and sunk by `sink` px (both for the wreck)
const longship = (ctx, x, y, face, t, { tilt = 0, sink = 0, sail = true, oars = true, alpha = 1 } = {}) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(S(x), S(y + sink));
  ctx.rotate(tilt);
  ctx.scale(face, 1);
  // wake
  if (oars) { ctx.fillStyle = "rgba(226,240,246,0.45)"; for (let i = 0; i < 3; i++) ctx.fillRect(-30 - i * 8, 5 + (i % 2) * 2, 10, CELL); }
  // oars, beating
  if (oars) {
    ctx.fillStyle = HULL_DK;
    const sw = Math.sin(t * 6) * 3;
    for (let i = -2; i <= 2; i++) { ctx.fillRect(i * 7 - 1 + sw * 0.4, 4, CELL, 7); }
  }
  // hull: a long low boat, prow and stern curling up
  ctx.fillStyle = HULL_DK; ctx.fillRect(-24, 0, 48, 6);
  ctx.fillStyle = HULL; ctx.fillRect(-22, -2, 44, 6);
  ctx.fillStyle = HULL_LT; ctx.fillRect(-22, -2, 44, CELL);
  ctx.fillStyle = HULL; ctx.fillRect(22, -8, 4, 8); ctx.fillRect(-26, -7, 4, 7);
  ctx.fillStyle = HULL_LT; ctx.fillRect(24, -10, 2, 2); ctx.fillRect(-26, -9, 2, 2);
  // shields along the rail
  for (let i = -3; i <= 3; i++) { ctx.fillStyle = i % 2 ? "#c8b060" : "#5a7890"; ctx.fillRect(i * 6 - 2, -4, 4, 4); }
  if (sail) {
    ctx.fillStyle = HULL_DK; ctx.fillRect(-1, -30, CELL, 28);
    ctx.fillStyle = SAIL; ctx.fillRect(-12, -28, 24, 18);
    ctx.fillStyle = STRIPE; for (let i = 0; i < 4; i++) ctx.fillRect(-12 + i * 6, -28, 3, 18);
  }
  ctx.restore();
};

export const drawShip = (ctx, e, g) => {
  const t = g.time;
  longship(ctx, e.x, e.y, e.face, t);
  // health bar: what is left of the hull is what lands
  const k = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = "rgba(16,14,20,0.75)"; ctx.fillRect(S(e.x) - 16, S(e.y) - 38, 32, 4);
  ctx.fillStyle = k > 0.5 ? "#8ad06a" : k > 0.25 ? "#e0c050" : "#d85a48"; ctx.fillRect(S(e.x) - 15, S(e.y) - 37, Math.round(30 * k), 2);
  if (e.hitFlash > t * 1000) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(S(e.x) - 24, S(e.y) - 2, 48, 6); }
};

// ---- effects ----
const landingWarn = (ctx, fx, g) => {
  const p = 1 - fx.ttl / fx.life, t = g.time;
  const pulse = 0.5 + 0.5 * Math.sin(t * 8);
  ctx.save();
  ctx.strokeStyle = "rgba(20,10,10,0.6)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(fx.x, fx.y, 20 + 6 * pulse, 10 + 3 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(240,64,48,${0.7 + 0.3 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(fx.x, fx.y, 20 + 6 * pulse, 10 + 3 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
  // dotted run up the shingle to where they will join the road
  ctx.fillStyle = "rgba(232,72,56,0.8)";
  const n = 6;
  for (let i = 0; i <= n; i++) {
    if ((i + Math.floor(t * 6)) % 2) continue;
    ctx.fillRect(S(fx.x + (fx.rx - fx.x) * i / n) - 1, S(fx.y + (fx.ry - fx.y) * i / n) - 1, 3, 3);
  }
  // a bold "!" over the beach while the ship is coming
  if (p < 0.98) {
    ctx.fillStyle = "rgba(20,10,10,0.7)"; ctx.fillRect(S(fx.x) - 6, S(fx.y) - 30, 12, 16);
    ctx.fillStyle = "#ff6a50"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", fx.x, fx.y - 21);
  }
  ctx.restore();
};
const beached = (ctx, fx, g) => longship(ctx, fx.x, fx.y, fx.face, g.time, { oars: false, sail: fx.hp > 0.5, alpha: Math.min(1, fx.ttl / 1500) });
const shipsink = (ctx, fx, g) => {
  const p = 1 - fx.ttl / fx.life;
  longship(ctx, fx.x, fx.y, fx.face, g.time, { oars: false, tilt: -0.35 * p * fx.face, sink: 10 * p, sail: p < 0.5, alpha: 1 - p });
  ctx.fillStyle = `rgba(226,240,246,${0.6 * (1 - p)})`;
  for (let i = 0; i < 5; i++) ctx.fillRect(S(fx.x - 20 + i * 10 + Math.sin(i + p * 9) * 3), S(fx.y + 4), 6, CELL);
};
const plank = (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  ctx.fillStyle = `rgba(122,86,52,${0.8 * (1 - p)})`;
  for (let i = 0; i <= 5; i++) ctx.fillRect(S(fx.x + (fx.tx - fx.x) * i / 5), S(fx.y + (fx.ty - fx.y) * i / 5), CELL * 2, CELL);
};
const frostcast = (ctx, fx) => {
  const a = fx.ttl / fx.life;
  ctx.save();
  ctx.strokeStyle = `rgba(190,232,255,${0.9 * a})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx.x, fx.y);
  // a jagged line of frost
  for (let i = 1; i <= 6; i++) { const u = i / 6; ctx.lineTo(fx.x + (fx.tx - fx.x) * u + (i < 6 ? Math.sin(i * 2.7) * 4 : 0), fx.y + (fx.ty - fx.y) * u + (i < 6 ? Math.cos(i * 1.9) * 4 : 0)); }
  ctx.stroke();
  ctx.restore();
};
const thaw = (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  ctx.fillStyle = `rgba(214,240,255,${1 - p})`;
  for (let i = 0; i < 8; i++) { const a = i * 0.785; ctx.fillRect(S(fx.x + Math.cos(a) * (8 + 16 * p)), S(fx.y + Math.sin(a) * (6 + 12 * p) + 10 * p * p), CELL, CELL); }
};
export const ZONE_FX = { landingWarn, beached, shipsink, plank, frostcast, thaw };

// ---- frozen halls ----
export const drawFrostShells = (ctx, g) => {
  const tms = g.time * 1000;
  for (const t of g.towers) {
    if (!(t.iceLeft > 0)) continue;
    const k = Math.min(1, t.iceLeft / (t.iceMax || 1));         // 1 fresh, 0 melted
    const born = Math.min(1, (tms - (t.iceAt || 0)) / 200);
    const h = 60, w = 21;          // (a generic hall: decks and crews stand ~55 px tall)
    ctx.save();
    ctx.globalAlpha = born * (0.55 + 0.45 * k);
    // the shell: a pale blue block of ice over the hall, inked
    ctx.fillStyle = "rgba(40,70,100,0.8)";
    ctx.fillRect(S(t.x - w) - 2, S(t.y - h) - 2, w * 2 + 4, h + 12);
    ctx.fillStyle = "rgba(170,220,250,0.7)";
    ctx.fillRect(S(t.x - w), S(t.y - h), w * 2, h + 8);
    ctx.fillStyle = "rgba(236,248,255,0.7)";
    ctx.fillRect(S(t.x - w), S(t.y - h), w * 2, CELL);                 // lit top edge
    ctx.fillRect(S(t.x - w), S(t.y - h), CELL, h + 8);                 // lit left edge
    ctx.fillRect(S(t.x - w + 6), S(t.y - h + 6), CELL, 14);            // a glint
    // cracks that grow as it thaws
    ctx.fillStyle = "rgba(90,140,180,0.8)";
    const cracks = Math.round((1 - k) * 6);
    for (let i = 0; i < cracks; i++) ctx.fillRect(S(t.x - w + 6 + i * 6), S(t.y - h + 10 + (i * 13) % 26), CELL, 8);
    // fire helping: a warm rim along the bottom
    if (t.thawFast) { ctx.fillStyle = "rgba(240,150,70,0.7)"; ctx.fillRect(S(t.x - w), S(t.y + 6), w * 2, CELL); }
    ctx.restore();
    // a small timer bar under it
    ctx.fillStyle = "rgba(16,14,20,0.6)"; ctx.fillRect(S(t.x) - 12, S(t.y) + 10, 24, 3);
    ctx.fillStyle = "#bfe8ff"; ctx.fillRect(S(t.x) - 11, S(t.y) + 11, Math.round(22 * k), 1);
  }
};
