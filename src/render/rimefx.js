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
//                   it thaws; also (same pass) a hall coiled by the serpent or
//                   smashed by a kraken's arm, and stars over dazed soldiers
//   drawSea         the sea monsters (engine/serpent.js): the serpent's wake
//                   and shadow while submerged, its coils and raised head when
//                   up; the kraken's dome offshore; each arm on the shore
//   serpentRise / serpentBite / serpentGone / krakenRise / krakenSink /
//   armRise / armGrab / armSmash / armSweep / armCut / armSink / stomp
//                   their effects (ZONE_FX)
// A real rig for any of these (rigs-rime.js / rigs-rimebeasts.js) replaces
// the alias or painter here: delete the alias line; for the sea monsters,
// draw.js's `e.sea` hook calls drawSea, which an artist may rewrite freely.

import { S, CELL } from "../data/constants.js";
import { RIGS, drawRig } from "./rigs.js";
// the sea monsters' own frame mapping (waterlines, the arm's grab, the sinks)
import { drawSeaRig, armSinkFx, krakenSinkFx } from "./rigs-rimebeasts.js";

// ---- borrowed looks for the clans' stub foes (data/enemies.js) ----
// (until rigs-rime.js exists: delete these lines when it lands)
for (const [type, like] of [
  ["thrall", "levy"], ["huscarl", "sergeant"], ["rimeseer", "chaplain"],
  ["berserker", "berserk"], ["rimerider", "wolfrider"], ["rimewolf", "wolf"], ["skald", "shaman"],
  ["frostgiant", "troll"], ["icedrake", "bat"], ["rimejarl", "marshal"],
]) {
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
    ctx.restore();
    // a small timer bar under it
    ctx.fillStyle = "rgba(16,14,20,0.6)"; ctx.fillRect(S(t.x) - 12, S(t.y) + 10, 24, 3);
    ctx.fillStyle = "#bfe8ff"; ctx.fillRect(S(t.x) - 11, S(t.y) + 11, Math.round(22 * k), 1);
  }
  drawDowned(ctx, g, tms);
  drawDazed(ctx, g, tms);
  drawHolds(ctx, g, tms);
};


// ---- halls knocked out by the sea monsters (engine/serpent.js t.downLeft) ----
const COIL = "#3e5a5c", COIL_LT = "#6f9a94", COIL_DK = "#1e2e30", INK = "#2a1830";
const drawDowned = (ctx, g, tms) => {
  for (const t of g.towers) {
    if (!(t.downLeft > 0)) continue;
    const k = Math.min(1, t.downLeft / (t.downMax || 1));
    ctx.save();
    if (t.downKind === "coil") {
      // three loops of the serpent wrapped round the hall, squeezing
      const sq = Math.sin(tms / 140) * 1.5;
      for (let i = 0; i < 3; i++) {
        const y = t.y - 10 - i * 14, w = 24 - i * 3 + sq;
        ctx.fillStyle = COIL_DK; ctx.fillRect(S(t.x - w) - 2, S(y) - 2, w * 2 + 4, 10);
        ctx.fillStyle = COIL; ctx.fillRect(S(t.x - w), S(y), w * 2, 6);
        ctx.fillStyle = COIL_LT; ctx.fillRect(S(t.x - w), S(y), w * 2, CELL);
        for (let j = -w + 4; j < w - 2; j += 8) { ctx.fillStyle = COIL_DK; ctx.fillRect(S(t.x + j), S(y + 2), CELL, CELL); }
      }
    } else {
      // smashed: dust and splinters over a hall knocked askew
      ctx.globalAlpha = 0.5 + 0.5 * k;
      ctx.fillStyle = "rgba(120,100,80,0.55)"; ctx.fillRect(S(t.x - 22), S(t.y - 30), 44, 36);
      ctx.fillStyle = "#3a2a1a";
      for (let i = 0; i < 5; i++) ctx.fillRect(S(t.x - 18 + i * 9), S(t.y - 24 + (i * 7) % 18), 6, CELL);
      ctx.fillStyle = INK;
      ctx.fillRect(S(t.x - 6), S(t.y - 34), CELL, 14); ctx.fillRect(S(t.x - 4), S(t.y - 22), 8, CELL);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(16,14,20,0.6)"; ctx.fillRect(S(t.x) - 12, S(t.y) + 10, 24, 3);
    ctx.fillStyle = t.downKind === "coil" ? "#8ad0b8" : "#e0b070"; ctx.fillRect(S(t.x) - 11, S(t.y) + 11, Math.round(22 * k), 1);
  }
};
// soldiers dazed by a frost giant's stomp: stars wheeling over their heads
const drawDazed = (ctx, g, tms) => {
  const star = (x, y) => { ctx.fillStyle = "#f8e890"; ctx.fillRect(S(x), S(y), CELL, CELL); };
  const one = (u) => {
    if (!(u.dazedUntil > tms) || u.state === "dead") return;
    for (let i = 0; i < 3; i++) { const a = tms / 220 + i * 2.1; star(u.x + Math.cos(a) * 7, u.y - 26 + Math.sin(a) * 2); }
  };
  for (const t of g.towers) if (t.units) for (const u of t.units) one(u);
  for (const b of g.bands || []) for (const u of b.units) one(u);
};

// ---- the sea monsters (engine/serpent.js) ----
const SERP = "#36575a", SERP_LT = "#6a9690", SERP_DK = "#18282a", BELLY = "#b8c8a0", EYE = "#f0d050";
const KRAK = "#6a2e4a", KRAK_LT = "#9a5070", KRAK_DK = "#3a1428", SUCK = "#e0b8c0";
const ripple = (ctx, x, y, r, a) => {
  ctx.strokeStyle = `rgba(226,240,246,${a})`; ctx.lineWidth = CELL;
  ctx.beginPath(); ctx.ellipse(S(x), S(y), Math.max(1, r), Math.max(1, r * 0.45), 0, 0, Math.PI * 2); ctx.stroke();
};
const bar = (ctx, x, y, k, w = 28, col) => {
  ctx.fillStyle = "rgba(16,14,20,0.75)"; ctx.fillRect(S(x) - w / 2 - 1, S(y), w + 2, 4);
  ctx.fillStyle = col || (k > 0.5 ? "#8ad06a" : k > 0.25 ? "#e0c050" : "#d85a48"); ctx.fillRect(S(x) - w / 2, S(y) + 1, Math.round(w * Math.max(0, k)), 2);
};

const drawSerpent = (ctx, e, g) => {
  const t = g.time, tms = t * 1000, sp = e.serp;
  if (!sp) return;
  const f = e.face || 1;
  if (e.submerged) {
    // a long dark shadow under the water, and a V of a wake behind its head
    ctx.save();
    ctx.translate(S(e.x), S(e.y));
    ctx.fillStyle = "rgba(10,24,30,0.35)";
    for (let i = 0; i < 6; i++) ctx.fillRect(S(-f * i * 6) - 4, S(Math.sin(t * 5 + i) * 2) - 2, 8, 4);
    ctx.fillStyle = "rgba(226,240,246,0.55)";
    for (let i = 1; i <= 4; i++) { ctx.fillRect(S(-f * i * 6), S(-i * 2.2) , 4, CELL); ctx.fillRect(S(-f * i * 6), S(i * 2.2), 4, CELL); }
    ctx.restore();
    if (sp.phase === "rise") { const p = Math.min(1, (tms - sp.t) / 500); ripple(ctx, e.x, e.y, 6 + 12 * p, 0.8 * (1 - p * 0.5)); }
    return;
  }
  // surfaced: arches of coil breaking the water behind a raised S of a neck
  const dive = sp.phase === "dive" ? Math.min(1, (tms - sp.t) / 450) : 0;
  const lift = 1 - dive;
  const blob = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(S(x), S(y), r, 0, Math.PI * 2); ctx.fill(); };
  ctx.save();
  ctx.translate(S(e.x), S(e.y));
  // two arches of its back, each a row of scales over the water
  for (let i = 1; i <= 2; i++) {
    const cx = -f * (i * 16 + 2), hh = (11 - i * 3) * lift;
    for (let k = 0; k <= 6; k++) {
      const u = k / 6, x = cx + (u - 0.5) * 14, y = -Math.sin(u * Math.PI) * hh;
      blob(x, y, 4, SERP_DK);
    }
    for (let k = 0; k <= 6; k++) {
      const u = k / 6, x = cx + (u - 0.5) * 14, y = -Math.sin(u * Math.PI) * hh;
      blob(x, y, 2.6, k % 2 ? SERP : SERP_LT);
    }
    ctx.fillStyle = "rgba(226,240,246,0.6)"; ctx.fillRect(S(cx) - 10, 2, 6, CELL); ctx.fillRect(S(cx) + 4, 2, 6, CELL);
  }
  // the neck: an S-curve of round segments, the head lunging on a strike
  const lunge = e.atkAnim > 0 ? Math.sin((1 - e.atkAnim / 420) * Math.PI) : 0;
  const nh = 30 * lift, pts = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    pts.push([f * (Math.sin(u * Math.PI * 1.4) * 4 + u * u * (4 + lunge * 12)), -u * nh * (1 - lunge * 0.25)]);
  }
  for (const [x, y] of pts) blob(x, y, 4.5, SERP_DK);
  pts.forEach(([x, y], k) => { blob(x, y, 3.2, SERP); if (k % 2 === 0) blob(x + f * 1.5, y, 1.4, BELLY); });
  const [hx, hy] = pts[8];
  // the head: a wedge with a brow ridge, a yellow eye, fangs when it bites
  blob(hx + f * 3, hy, 6, SERP_DK);
  blob(hx + f * 3, hy, 4.6, SERP);
  ctx.fillStyle = SERP_DK; ctx.fillRect(S(hx + f * 6) - 3, S(hy) - 2, 6, 4);
  ctx.fillStyle = SERP; ctx.fillRect(S(hx + f * 6) - 2, S(hy) - 1, 6, 2);
  ctx.fillStyle = SERP_LT; ctx.fillRect(S(hx + f * 1) - 2, S(hy) - 5, 6, CELL);
  ctx.fillStyle = EYE; ctx.fillRect(S(hx + f * 4), S(hy) - 3, CELL, CELL);
  if (lunge > 0.2) { ctx.fillStyle = "#f4f0e0"; ctx.fillRect(S(hx + f * 7), S(hy) + 1, CELL, 3); ctx.fillRect(S(hx + f * 4), S(hy) + 1, CELL, 3); }
  // white water round the neck
  ctx.fillStyle = "rgba(226,240,246,0.75)"; ctx.fillRect(-8, 2, 16, CELL); ctx.fillRect(-5, 4, 10, CELL);
  ctx.restore();
  if (e.hitFlash > tms) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(S(e.x) - 8, S(e.y - nh - 8), 16, nh + 10); }
  bar(ctx, e.x, e.y - 46, e.hp / e.maxHp);
};

const drawKraken = (ctx, e, g) => {
  const t = g.time, tms = t * 1000, K = e.kr;
  if (!K) return;
  const age = tms - K.t0;
  const up = Math.min(1, age / 1200);
  const bob = Math.sin(t * 1.6) * 2;
  ctx.save();
  ctx.translate(S(e.x), S(e.y + bob));
  // the dome of its mantle above the black water
  const w = 34, h = 18 * up;
  ctx.fillStyle = KRAK_DK; ctx.beginPath(); ctx.ellipse(0, 0, w + 2, h + 2, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = KRAK; ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = KRAK_LT; for (let i = -3; i <= 3; i++) ctx.fillRect(S(i * 8) - 2, S(-h * 0.7 + Math.abs(i) * 2), 4, CELL);
  // two great eyes just above the water
  if (up > 0.6) for (const sx of [-1, 1]) {
    ctx.fillStyle = "#f0e070"; ctx.fillRect(S(sx * 14) - 3, -6, 6, 4);
    ctx.fillStyle = "#1a0a10"; ctx.fillRect(S(sx * 14) - 1, -6, CELL, 4);
  }
  // the water churning round it
  ctx.fillStyle = "rgba(226,240,246,0.65)";
  for (let i = -5; i <= 5; i++) ctx.fillRect(S(i * 7 + Math.sin(t * 3 + i) * 2), 0, 5, CELL);
  ctx.restore();
  if (e.hitFlash > tms) { ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(S(e.x) - w, S(e.y) - h, w * 2, h); }
  bar(ctx, e.x, e.y - 30, e.hp / e.maxHp, 44);
  // the tide it will go out on: a thin bar of what is left of its stay
  const stay = K.stay || 75000;
  bar(ctx, e.x, e.y - 25, 1 - age / stay, 44, "#7ab8e0");
};

const drawArm = (ctx, e, g) => {
  const t = g.time, tms = t * 1000;
  const rise = e.riseAt !== undefined ? Math.min(1, (tms - e.riseAt) / (e.riseMs || 700)) : 1;
  const f = e.face || 1;
  const strike = e.atkAnim > 0 ? Math.sin((1 - e.atkAnim / 500) * Math.PI) : 0;
  const H2 = 36 * rise, n = 9;
  ctx.save();
  ctx.translate(S(e.x), S(e.y));
  // a splash ring where it breaks through
  ctx.fillStyle = "rgba(226,240,246,0.7)"; ctx.fillRect(-10, 0, 20, CELL); ctx.fillRect(-6, 2, 12, CELL);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const sway = Math.sin(t * 3 + u * 3 + e.id) * 3 * u + f * strike * 14 * u * u;
    const x = sway, y = -u * H2, wdt = Math.max(2, 8 - u * 6);
    ctx.fillStyle = KRAK_DK; ctx.fillRect(S(x) - wdt / 2 - 1, S(y) - 3, wdt + 2, 6);
    ctx.fillStyle = KRAK; ctx.fillRect(S(x) - wdt / 2, S(y) - 2, wdt, 5);
    if (i % 2 === 0 && wdt > 3) { ctx.fillStyle = SUCK; ctx.fillRect(S(x + f * (wdt / 2 - 2)), S(y), CELL, CELL); }
  }
  ctx.restore();
  if (e.hitFlash > tms) { ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(S(e.x) - 6, S(e.y - H2), 12, H2); }
  if (rise >= 1) bar(ctx, e.x, e.y - 44, e.hp / e.maxHp, 18);
};

// With the beast artist's rig (rigs-rimebeasts.js: seaserpent / kraken /
// krakenarm, anchored at the waterline) the monster is drawn from its sheets,
// picked off the engine's state; without one, the placeholder painters above.
const q4 = (k) => Math.min(3, Math.max(0, Math.floor(k * 4)));
const seaFrame = (e, g) => {
  const tms = g.time * 1000, cyc = Math.floor(g.time * 6 + e.id) % 4;
  const fight = e.atkAnim > 0 ? q4(1 - e.atkAnim / 500) : null;
  if (e.sea === "serpent") {
    const sp = e.serp;
    if (!sp) return null;
    if (sp.phase === "swim") return ["walk", `sub.${cyc}`];
    if (sp.phase === "rise") return ["walk", `surface.${q4((tms - sp.t) / ENEMY_MS.rise)}`];
    if (sp.phase === "dive") return ["walk", `dive.${q4((tms - sp.t) / ENEMY_MS.dive)}`];
    return fight != null ? ["fight", fight] : ["walk", cyc];
  }
  if (e.sea === "kraken") {
    const age = tms - (e.kr?.t0 ?? tms);
    if (age < 1200) return ["walk", `rise.${q4(age / 1200)}`];
    return ["walk", cyc];
  }
  const rise = e.riseAt !== undefined ? (tms - e.riseAt) / (e.riseMs || 700) : 1;
  if (rise < 1) return ["walk", `rise.${q4(rise)}`];
  return fight != null ? ["fight", fight] : ["walk", cyc];
};
const ENEMY_MS = { rise: 500, dive: 450 };   // (the serpent's rise / dive, enemies.js)
const seaRig = (ctx, e, g) => {
  const fr = seaFrame(e, g);
  if (!fr) return false;
  const tms = g.time * 1000;
  drawRig(ctx, e.type, e.x, e.y, e.face || 1, fr[0], fr[1]);
  if (e.hitFlash > tms && !e.submerged) drawRig(ctx, e.type, e.x, e.y, e.face || 1, fr[0], fr[1], "white", 0.6);
  return true;
};
// the kraken under the water as it roams (engine/serpent.js: e.submerged
// while it swims): a great dark shape and a churn of wake, no rig
const drawKrakenDeep = (ctx, e, g) => {
  const t = g.time;
  ctx.save();
  ctx.translate(S(e.x), S(e.y));
  ctx.fillStyle = "rgba(20,8,18,0.32)";
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(20,8,18,0.22)";
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + Math.sin(t * 1.4 + i) * 0.2; ctx.fillRect(S(Math.cos(a) * 34) - 3, S(Math.sin(a) * 15) - 2, 6, 4); }
  ctx.fillStyle = "rgba(226,240,246,0.5)";
  for (let i = -3; i <= 3; i++) ctx.fillRect(S(i * 9 + Math.sin(t * 2 + i) * 3), S(-12 + Math.abs(i) * 2), 5, CELL);
  ctx.restore();
};
export const drawSea = (ctx, e, g) => {
  if (!e.seaInit) return;
  if (e.sea === "kraken" && e.kr && e.kr.phase === "swim") { drawKrakenDeep(ctx, e, g); return; }
  if (RIGS[e.type] && (drawSeaRig(ctx, e, g) || seaRig(ctx, e, g))) {
    // the bars stay (what is left of it; the kraken's tide)
    if (e.sea === "kraken" && e.kr) {
      bar(ctx, e.x, e.y - 46, e.hp / e.maxHp, 44);

    } else if (!e.submerged && !(e.riseAt !== undefined && g.time * 1000 - e.riseAt < e.riseMs)) bar(ctx, e.x, e.y - 50, e.hp / e.maxHp, e.sea === "arm" ? 18 : 28);
    return;
  }
  if (e.sea === "serpent") drawSerpent(ctx, e, g);
  else if (e.sea === "kraken") drawKraken(ctx, e, g);
  else if (e.sea === "arm") drawArm(ctx, e, g);
};

// their effects
const ringFx = (col, r0, r1) => (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  ctx.strokeStyle = col.replace("A", (1 - p).toFixed(2)); ctx.lineWidth = CELL;
  ctx.beginPath(); ctx.ellipse(S(fx.x), S(fx.y), r0 + (r1 - r0) * p, (r0 + (r1 - r0) * p) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
};
const lineFx = (col) => (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  ctx.fillStyle = col.replace("A", (1 - p).toFixed(2));
  for (let i = 0; i <= 8; i++) ctx.fillRect(S(fx.x + (fx.tx - fx.x) * i / 8) - 1, S(fx.y - 18 + (fx.ty - fx.y + 18) * i / 8) - 1, 4, 4);
};
Object.assign(ZONE_FX, {
  serpentRise: ringFx("rgba(226,240,246,A)", 6, 24),
  serpentGone: ringFx("rgba(226,240,246,A)", 8, 30),
  serpentBite: lineFx("rgba(240,240,220,A)"),
  krakenRise: ringFx("rgba(226,240,246,A)", 20, 70),
  krakenSink: (ctx, fx) => { ringFx("rgba(226,240,246,A)", 30, 80)(ctx, fx); if (RIGS.kraken) krakenSinkFx(ctx, fx); },
  armRise: ringFx("rgba(200,180,160,A)", 4, 18),
  armSink: (ctx, fx) => { ringFx("rgba(226,240,246,A)", 4, 16)(ctx, fx); if (RIGS.krakenarm) armSinkFx(ctx, fx); },
  armGrab: lineFx("rgba(154,80,112,A)"),
  armSmash: (ctx, fx) => { ringFx("rgba(180,140,100,A)", 6, 28)(ctx, { ...fx, x: fx.tx, y: fx.ty }); },
  armSweep: lineFx("rgba(106,46,74,A)"),
  armCut: (ctx, fx) => {
    const p = 1 - fx.ttl / fx.life;
    ctx.fillStyle = `rgba(30,16,30,${0.8 * (1 - p)})`;
    for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.fillRect(S(fx.x + Math.cos(a) * 14 * p), S(fx.y - 10 + Math.sin(a) * 8 * p), 4, 4); }
  },
  stomp: (ctx, fx) => { ringFx("rgba(200,232,255,A)", 6, fx.r || 50)(ctx, fx); },
});

// ---- what a sea monster holds (engine/serpent.js m.hold) ----
// PLACEHOLDER: a loop of tentacle (or coil) round the held creature's middle,
// squeezing, and a rope of it back to the arm / the serpent's head
const drawHolds = (ctx, g, tms) => {
  for (const m of g.enemies) {
    if (m.dead || !m.hold || !m.sea) continue;
    const v = m.hold.u || m.hold.e;
    if (!v) continue;
    const arm = m.sea === "arm";
    const col = arm ? KRAK : SERP, lt = arm ? KRAK_LT : SERP_LT, dk = arm ? KRAK_DK : SERP_DK;
    const sq = Math.sin(tms / 160 + m.id) * 1.5;
    // the rope from the monster to its victim
    const fx = m.x, fy = m.y - (arm ? 22 : 18), tx = v.x, ty = v.y - 9;
    for (let i = 1; i < 7; i++) {
      const u = i / 7, x = fx + (tx - fx) * u, y = fy + (ty - fy) * u - Math.sin(u * Math.PI) * 6;
      ctx.fillStyle = dk; ctx.fillRect(S(x) - 3, S(y) - 3, 6, 6);
      ctx.fillStyle = col; ctx.fillRect(S(x) - 2, S(y) - 2, 4, 4);
    }
    // the loop round its middle
    const w = 9 + sq;
    ctx.fillStyle = dk; ctx.fillRect(S(v.x - w) - 1, S(ty) - 3, w * 2 + 2, 7);
    ctx.fillStyle = col; ctx.fillRect(S(v.x - w), S(ty) - 2, w * 2, 5);
    ctx.fillStyle = lt; ctx.fillRect(S(v.x - w), S(ty) - 2, w * 2, CELL);
    if (arm) { ctx.fillStyle = SUCK; for (let x = -w + 3; x < w - 1; x += 5) ctx.fillRect(S(v.x + x), S(ty) + 1, CELL, CELL); }
  }
};
