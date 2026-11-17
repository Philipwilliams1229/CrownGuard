// ============ HALL: THE WIZARD SPIRE ============
// A round stone spire with a walk at the top where the mage stands. It
// climbs with him: an apprentice on a squat tower, a staff-bearer between
// two floating crystals, a long-beard before a crescent crest with violet
// banners at his back. Then the elements take it.
//   Pyromancer — warm stone, braziers at the corners, ember-lit windows.
//     Inferno Throne: pale gold sandstone, crimson banners, a red runner to
//       the door between two gilt fire-bowls. A gilded throne-back rises
//       behind the mage, crested with a CROWN OF FIVE FLAMES that counts
//       his shots: one flame per shot since the last firestorm (t.poolIdx
//       0..4), all five blazing when the next fireball is the firestorm,
//       which leaves with a white-gold flash.
//     Dragonbreath: sooty dark stone, scorched earth, two horned dragon
//       skulls on posts at the back corners, their sockets smouldering.
//       No orbs: while t.breath.on > 0 the mage braces with his staff
//       levelled at the foe, his robe streaming back, a furnace-bright
//       spell-ring at the staff head — the flamethrower's jet (render/
//       flames.js) leaves from breathMouth(t), at that ring. Between
//       breaths he idles like any mage and the skulls breathe smoke.
//   Stormcaller — blue slate, a copper rod behind him, runes that hum.
//     Tempest Court: two tesla coils throwing arcs across the walk and a
//       storm cloud turning overhead.
//     Thunder Sovereign: a great gilt crown-ring raised behind him, a
//       black cloud above that strikes it.
// The mage anticipates each shot — the orb swells as the cooldown runs out
// — then drives his staff at the foe (Dragonbreath's orb follows the
// breath instead: it never fires; the jet leaves his levelled staff).
//
// Three baked layers per form (ground, body, front lip); lights, fire,
// lightning, runes and the mage are live.
//
// While "New sprites" is on the BUILDING is the pixel sculptor's
// (pix/hall-wizard.js through pix/halls.js: see `const H =` below), built
// round the same spireH / shaftW, so the mage, his orb and everything the
// engine reads stand where they did; the painters above are the old hall,
// kept whole for the switch.

import { getStats } from "../../engine/towers.js";
import { pxArc, pxRing } from "./pixrings.js";
import { rgba, soft, ball, glow, hash } from "../buildkit.js";
import { mageTip } from "../folk.js";
import { stormCloud, stormSpots, stormBolt } from "../stormcloud.js";
import * as mageFig from "../pix/fig-mage.js";
import { crew, drawCrewPix, loopFrame, shotFrame, fracFrame, markOf } from "../pix/crews.js";
import * as wizardHall from "../pix/hall-wizard.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the new sprites' mage (pix/fig-mage.js; "New sprites" off draws the old one below)
const MAGE = crew("mage", mageFig);

const ORB = { base: "#b08ad8", a: "#f0903a", aa: "#ff8a2a", ab: "#f8b040", b: "#8ce8f0", ba: "#a8f0f8", bb: "#f0e070" };
// Dragonbreath's skull posts: out from the axis, skull centre over the lip
const SKULL_DX = 14, SKULL_Y = 18;
const RUNE_DX = 10.5;

const spireH = (t) => 18 + t.level * 6 + (t.branch ? 4 : 0);
const shaftW = (t) => (t.rank4 ? 24 : t.branch ? 22 : 16 + t.level * 2);

// Where Dragonbreath's jet leaves the hall (render/flames.js draws from
// here): the spell-ring just past the head of the mage's levelled staff
// (his "brace" pose, both hands on it), mirrored with the facing
// drawWizardSpire uses (the aim, which the engine keeps on the breath).
const RING_OUT = 2.5;
export const breathMouth = (t) => {
  const ang = t.breath ? t.breath.ang : t.lastAim || 0;
  const [tx, ty] = mageTip(3, "brace");
  return { x: t.x + (Math.cos(ang) >= 0 ? 1 : -1) * (tx + RING_OUT), y: t.y - spireH(t) - 7 + ty };
};

// the element a form belongs to
const elem = (t) => (t.branch === "a" ? "fire" : t.branch === "b" ? "storm" : "arcane");

// The Inferno Throne's back: a gilded arch of radius THRONE_R whose
// centre stands THRONE_Y over the walk's lip; five gilt cups round its
// crest, west to east (the crown of flames lights them in that order).
const THRONE_R = 10, THRONE_Y = 31;
const throneCups = (x, top) => [0, 1, 2, 3, 4].map((i) => {
  const a = Math.PI + (i / 4) * Math.PI, r = THRONE_R - 0.8;
  return [x + Math.cos(a) * r, top - THRONE_Y + Math.sin(a) * r];
});

export const drawWizardSpire = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  // (a Dragonbreath still pouring out its last gout is not idle, whatever
  // the foes in reach say: the jet leaves his staff until it gutters)
  const idle = t._idle && !(t.branch === "a" && t.rank4 === "b" && t.breath && t.breath.on > 0);
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const el = elem(t);
  const bodyH = spireH(t), sw = shaftW(t), hw = sw / 2, pw = hw + 4;
  const top = y - bodyH, base = y + 7;
  const orbCol = ORB[key] || ORB.base;
  const canBake = typeof document !== "undefined";
  const v = t.id % 3;
  const grown = lvl >= 3 || !!t.branch;

  // runes orbit the spire from level two; the back half hides behind stone
  const runes = [];
  if (lvl >= 2 || t.branch) {
    const runeCol = el === "fire" ? "#f8c070" : el === "storm" ? "#a8f0f8" : "#c8a8f0";
    for (let i = 0; i < 6; i++) {
      const ang = time * 0.9 + (i / 6) * Math.PI * 2;
      runes.push({ rx: x + Math.cos(ang) * (hw + 6), ry: y - bodyH / 2 + Math.sin(ang) * 5, front: Math.sin(ang) >= 0, col: runeCol, i });
    }
    for (const r of runes) if (!r.front) rune(ctx, r);
  }
  // the Stormcallers' clouds hang BEHIND the hall's top: the Sovereign's
  // gilt crown-ring stands against his black one (there is no headroom
  // above the ring), the Tempest mage's hat tip against his grey-blue one
  if (r4 === "bb") cloud(ctx, x, top, time, t, "sovereign");
  if (r4 === "ba") cloud(ctx, x, top, time, t, "tempest");
  const aimDir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const dir = aimDir;   // at rest he keeps facing the way of his last cast
  // Dragonbreath's breath, 0..1 (eased by the engine)
  const on = r4 === "ab" && !idle && t.breath ? t.breath.on : 0;
  const st = getStats(t);
  const rate = st.rate || 1000;
  // how far the spell has gathered: 0 at the shot, 1 ready
  // (Dragonbreath never fires an orb: its glow follows the breath)
  const charge = idle ? 0 : r4 === "ab" ? on : Math.max(0, Math.min(1, 1 - (t.cd || 0) / rate));

  // ---- the new building (render/pix/hall-wizard.js), while "New sprites" is on: its BACK picture
  // here, its FRONT after the mage; it brings its own shadow, lit windows, brazier and fire-bowl
  // flames and the light on its stone, so the old still parts and those live lights below stand
  // down. The mage stands where he always did (the new building is built round spireH / shaftW).
  const H = canBake ? hallPix("wizard", wizardHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, v) : null;
  // The light on the stone, in fifths so it steps like the pixels do: the orb's rises with the
  // charge and flashes on the cast, on the side he faces; the finals' own lights follow what
  // the hall paints live (the throne's crown ready, the skulls' heat, the coils' arc, the strike)
  let hk = null;
  if (H) {
    const fifth = (k) => Math.round(Math.max(0, Math.min(1, k)) * 5) / 5;
    const kOrb = t.noFolk ? 0 : fifth((idle ? 0.3 : 0.35 + charge * 0.45) + (t.anim > 0.05 && r4 !== "ab" ? t.anim * 0.4 : 0));
    hk = { orb: dir > 0 ? kOrb : 0, orbW: dir < 0 ? kOrb : 0 };
    if (r4 === "aa") { const gone = !idle && (t.poolIdx || 0) === 0 && t.anim > 0.05, ready = !idle && (gone || (t.poolIdx || 0) === 4); hk.throne = ready ? fifth(gone ? 0.4 + t.anim * 0.6 : 0.6) : 0.2; }
    if (r4 === "ab") hk.skull = fifth(0.4 + on * 0.5);
    if (r4 === "ba") hk.coil = Math.sin(time * 9 + t.id) > -0.3 || t.anim > 0.3 ? 0.8 : 0.4;
    if (r4 === "bb") hk.crown = ((time * 0.7 + t.id * 0.3) % 1) < 0.08 || t.anim > 0.6 ? 1 : 0.2;
  }
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, k: hk });


  // ---- lights in the stone
  if (el === "storm") for (const s of [-1, 1]) {
    const on = 0.4 + 0.5 * Math.max(0, Math.sin(time * 3 + s * 1.3 + t.id));
    glow(ctx, x + s * RUNE_DX, base + 2, 3, "#8ce8f0", on);
    ctx.fillStyle = rgba("#e8fcff", on); ctx.fillRect(x + s * RUNE_DX - 0.5, base + 0.8, 1, 2.5);
  }
  // ---- fire at the corners and round the foot
  if (r4 === "aa") {
    // the crown of flames counts the shots to the firestorm: one flame lit
    // per shot since the last (t.poolIdx), all five when the next is it;
    // on the firestorm itself all five flare and die back
    const storm = !idle && (t.poolIdx || 0) === 0 && t.anim > 0.05;
    const lit = idle ? 5 : storm ? 5 : (t.poolIdx || 0) + 1;
    const ready = !idle && lit === 5;
    throneCups(x, top).forEach(([cx, cy], i) => {
      // (the new building's crown burns in pixel flames, three sizes: lit, ready, the firestorm's)
      if (i < lit) { const size = idle ? 0 : storm ? 2 : ready ? 1 : 0, f = Math.floor(Math.max(0, time) * 11 + t.id + i * 2) % 6; stampPix(ctx, pixSprite(`wizcrown|${size}|${f}`, () => wizardHall.crownFlame(size, f)), cx, cy - 1.5); }
      else { glow(ctx, cx, cy - 2, 2.4, "#d8482a", 0.35); ctx.fillStyle = "#d8482a"; ctx.fillRect(cx - 1, cy - 2.4, 2, 0.8); }
    });
  }

  // ---- the mage: idle between waves (a slow breath), gathering power as
  // the cooldown runs out, driving the staff at the foe on the shot — the
  // whole cycle is folk-casters.js MAGE_CYCLE, picked by the phase since
  // the shot (`charge`: 0 at the shot, 1 ready), one baked frame per pose
  const level = t.branch ? 3 : lvl;
  const my = top - 7;
  // (st, rate and charge: worked out above, before the building is drawn)
  // the Inferno Throne's fifth shot is the firestorm: its orb swells for it
  const stormNext = r4 === "aa" && !idle && (t.poolIdx || 0) === 4;
  const stormGone = r4 === "aa" && !idle && (t.poolIdx || 0) === 0 && t.anim > 0.05;
  // The new sprites' mage: the same clocks pick a clip and a frame. Between waves he idles;
  // in a wave he gathers and winds up as the cooldown runs out (cast, timed so its strike
  // shows on the frame the orb leaves), and with the spell ready and no one in reach he
  // holds the wind-up, breathing (hold). Dragonbreath swings the staff level with the
  // breath (level, by `on`) and stands braced behind it while it pours (breath).
  let pclip = "idle", pf = 0, prec = null;
  if (idle) pf = loopFrame(MAGE, "idle", time, t.id);
  else if (r4 === "ab") { if (on >= 0.55) { pclip = "breath"; pf = loopFrame(MAGE, "breath", time, t.id); } else { pclip = "level"; pf = fracFrame(MAGE, "level", on / 0.55); } }
  else if ((t.cd || 0) <= 0) { pclip = "hold"; pf = loopFrame(MAGE, "hold", time, t.id); }
  else { pclip = "cast"; pf = shotFrame(MAGE, "cast", t.cd || 0, rate); }
  // star-charms from level three; the back arc passes behind the mage
  const stars = [];
  if (grown && !t.noFolk) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.7 + i * 2.09 + t.id;
      stars.push({ cx: x + Math.cos(ang) * 15, cy: my - 14 + Math.sin(ang) * 5, front: Math.sin(ang) >= 0 });
    }
  }
  const star = (s) => { ctx.fillStyle = orbCol; ctx.fillRect(s.cx - 0.5, s.cy - 2, 1.2, 4.5); ctx.fillRect(s.cx - 2.2, s.cy - 0.3, 4.5, 1.2); };
  for (const s of stars) if (!s.front) star(s);
  // level two's crystals float over their pedestals
  if (lvl === 2 && !t.branch) for (const s of [-1, 1]) {
    const cy = top - 17 + Math.sin(time * 2 + s + t.id) * 1.2, cx = x + s * (pw - 2);
    glow(ctx, cx, cy, 4, orbCol, 0.35);
    if (H) stampPix(ctx, pixSprite("wizcrystal", () => wizardHall.crystal(orbCol)), cx, Math.round(cy * 2) / 2);   // the building's crystal, on whole pixels
  }
  if (!t.noFolk) {
    // (fx off: the engine flies the real orb; the figure's own light follows its pose)
    prec = drawCrewPix(ctx, MAGE, x, my, dir, pclip, pf, { variant: `${level}|${key}`, fx: false });
  }
  if (H) drawHallFront(ctx, H, x, y, time, { id: t.id, k: hk });

  // ---- the orb at the staff tip (mageTip is its centre, in the fork; the
  // apprentice's floats over his palm): small at rest, swelling with the
  // charge, a flash and a ring as it flies. It rides the staff still while
  // he drives it at the foe, and floats a little in the fork otherwise.
  // (the new figure marks the cup of its staff's fork, the apprentice's palm: `tip`)
  const [tx, ty] = prec ? markOf(prec, "tip", 1) : [0, 0];
  const hitF = Math.round(MAGE.CLIPS.cast.hit * (MAGE.CLIPS.cast.n - 1));
  const driven = pclip === "level" || pclip === "breath" || (pclip === "cast" && pf >= hitF && pf <= hitF + 2);
  const bob = driven ? 0 : Math.sin(time * 2.5 + t.id) * (level >= 2 ? 0.8 : 1.2);
  const orbX = x + dir * tx, orbY = my + ty + bob;
  const rBase = level >= 3 ? 3.4 : level === 2 ? 2.8 : 2.3;
  if (!t.noFolk) {
    const rOut = r4 === "ab" ? 2 + on * 0.8 : (rBase * (idle ? 0.8 : 0.75 + charge * 0.45) + (t.anim > 0.4 ? 0.8 : 0)) * (stormNext || stormGone ? 1.35 : 1);
    const oc = stormNext || stormGone ? "#ffc850" : orbCol;
    glow(ctx, orbX, orbY, rOut * (2 + charge), oc, 0.3 + charge * 0.25);
    ball(ctx, orbX, orbY, rOut, rOut, oc, { hi: 0.6, lo: 0.3 });
    ctx.fillStyle = "#fffaf0"; ctx.fillRect(orbX - rOut * 0.45, orbY - rOut * 0.5, 1, 1);
    // motes spiral in while it gathers
    if (!idle && charge > 0.45 && t.anim < 0.2) {
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + i * 2.1, d = (1 - charge) * 14 + 3;
        ctx.fillStyle = rgba(orbCol, 0.9);
        ctx.fillRect(orbX + Math.cos(a) * d - 0.5, orbY + Math.sin(a) * d * 0.7 - 0.5, 1, 1);
      }
    }
    if (t.anim > 0.05 && r4 !== "ab") {
      glow(ctx, orbX, orbY, rOut * (stormGone ? 2.2 : 1.2), "#fffaf0", t.anim);
      pxRing(ctx, orbX, orbY, rOut + (1 - t.anim) * (stormGone ? 22 : 12), rgba(oc, t.anim * 0.7), stormGone ? 3 : 2);
    }
  }
  for (const s of stars) if (s.front) star(s);
  for (const r of runes) if (r.front) rune(ctx, r);

  // ---- storms: static round the Stormcaller, arcs between the Tempest's
  // coils, a thundercloud over the Sovereign that strikes his crown
  if (el === "storm") {
    if (!t.noFolk && (Math.sin(time * 11 + t.id) > 0.55 || t.anim > 0.5)) {
      const ang = time * 5 + t.id;
      zig(ctx, orbX + Math.cos(ang) * 4, orbY + Math.sin(ang) * 4, orbX + Math.cos(ang) * 10, orbY + Math.sin(ang) * 8 + 4, time, "#f8f0a0", 1);
    }
    if (r4 === "ba") {
      const a0 = x - pw + 2, a1 = x + pw - 2, ay = top - 29.5;
      glow(ctx, a0, ay, 4, "#a8f0f8", 0.5); glow(ctx, a1, ay, 4, "#a8f0f8", 0.5);
      if (Math.sin(time * 9 + t.id) > -0.3 || t.anim > 0.3) zig(ctx, a0, ay, a1, ay, time * 1.3, "#e8fcff", 1.2);
    }
    if (r4 === "bb") {
      // the cloud (drawn behind the hall, above) strikes the crown-ring:
      // from its belly beyond the ring's rim to the spike on that side
      const beat = time * 0.7 + t.id * 0.3;
      const strike = (beat % 1) < 0.08 || t.anim > 0.6;
      if (strike) {
        const s = Math.floor(beat) % 2 ? 1 : -1;
        stormBolt(ctx, x + s * SOV_CLOUD.w * 0.42, top - SOV_CLOUD.base + 1.5, x + s * 13.2, top - 34.5, Math.floor(time * 20) + t.id, ["#f0e070", "#fff8c0", "#ffffff"], 1, 4, 2.2);
        glow(ctx, x, top - 34, 12, "#f0e070", 0.45);
      } else glow(ctx, x, top - 34, 8, "#f0e070", 0.15 + 0.1 * Math.sin(time * 3));
    }
  }
  // Dragonbreath: the dragon skulls' sockets smoulder (and smoke between
  // breaths); while he breathes, a furnace-bright spell-ring stands at his
  // staff head, turning, and the jet (flames.js) pours through it
  if (r4 === "ab") {
    for (const s of [-1, 1]) {
      const sx = x + s * SKULL_DX, sy = top - SKULL_Y;
      const heat = 0.45 + on * 0.45 + 0.1 * Math.sin(time * 4 + s + t.id);
      glow(ctx, sx, sy - 0.3, 2.6 + on * 1.5, "#ff8a2a", heat * 0.6);
      ctx.fillStyle = rgba("#ffd070", heat); ctx.fillRect(sx - 2.5, sy - 1.1, 1.4, 1.2); ctx.fillRect(sx + 1.1, sy - 1.1, 1.4, 1.2);
      if (on < 0.2) {
        const t2 = (time * 5 + (s + 1) * 6 + t.id * 2) % 16;
        soft(ctx, sx + Math.sin(time * 2 + s) * 0.8, sy + 4.5 - t2 * 0.9, 1 + t2 / 7, 1 + t2 / 7, [[0, `rgba(90,80,84,${Math.max(0, 0.35 - t2 * 0.022)})`], [1, "rgba(90,80,84,0)"]]);
      }
    }
    if (on > 0 && !t.noFolk) {
      const m = breathMouth({ x, y, level: lvl, branch: t.branch, rank4: t.rank4, breath: { ang: t.lastAim } });
      const jit = Math.sin(time * 37) * 0.3;
      glow(ctx, orbX, orbY, 6 + on * 6, "#ff7a2a", on * 0.55);
      glow(ctx, orbX, orbY, 2.5 + on * 2, "#fff0a8", on * 0.9);
      // the ring, edge-on toward the foe: a tall thin ellipse with fire-runes
      const rx = 1.3 * on, ry = 5.2 * on;
      pxArc(ctx, m.x + jit, m.y, Math.max(0.5, rx), Math.max(0.5, ry), rgba("#ffd070", 0.9 * on), { th: 2 });
      ctx.fillStyle = rgba("#fff3d2", on);
      for (let i = 0; i < 4; i++) {
        const a = time * 7 * dir + (i / 4) * Math.PI * 2;
        ctx.fillRect(m.x + jit + Math.cos(a) * rx - 0.5, m.y + Math.sin(a) * ry - 0.5, 1, 1);
      }
      glow(ctx, m.x, m.y, 3 + on * 2, "#fff0a8", on * 0.5);
    }
  }
  // embers up both final forms
  if (r4 === "ab" || r4 === "aa") for (let i = 0; i < 4; i++) {
    const ey = base - ((time * 24 + i * 13 + t.id * 7) % (bodyH + 30));
    const ex = x - hw - 6 + i * (sw + 12) / 3 + Math.sin(time * 3 + i) * 3;
    ctx.fillStyle = i % 2 ? "#ffd070" : "#ff8a2a";
    ctx.fillRect(ex, ey, 1, 1);
  }
  // between battles a tome hangs open by the spire, pages flicking
  if (idle && !t.noFolk && ((time / 9) + t.id * 0.37) % 1 < 0.45) {
    const ty2 = top - 22 + Math.sin(time * 1.6) * 2;
    if (H) stampPix(ctx, pixSprite(`wiztome|${key}`, () => wizardHall.tome(key)), x + 16, Math.round(ty2 * 2) / 2 + 3);   // the building's tome: a pixel spellbook, bobbing on whole pixels
  }
};

// A glowing rune: a little lit glyph, three strokes.
const rune = (ctx, r) => {
  ctx.fillStyle = rgba(r.col, r.front ? 0.95 : 0.5);
  ctx.fillRect(r.rx - 0.5, r.ry - 1.5, 1, 3);
  ctx.fillRect(r.rx - 1.5, r.ry - (r.i % 2 ? 1.5 : -0.5), 2, 1);
};

// A jagged bolt between two points, re-kinked a few times a second.
const zig = (ctx, x0, y0, x1, y1, time, col, w) => {
  const k = Math.floor(time * 14);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i < 5; i++) {
    const f = i / 5;
    ctx.lineTo(x0 + (x1 - x0) * f + (hash(k, i) - 0.5) * 4, y0 + (y1 - y0) * f + (hash(k, i + 9) - 0.5) * 4);
  }
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.lineWidth = 1;
};

// The Stormcallers' clouds (render/stormcloud.js paints and bakes them).
// Each sits in the hallshot cell's headroom: base `base` above the walk's
// lip, `h` tall, so with its ink it stays under the cell's top (y - 93.6).
//   Tempest Court: grey-blue, quick churn, lit from inside as the coils arc
//     and when it fires; it hangs just over the mage's hat, behind its tip.
//   Thunder Sovereign: black, slow, wider, two heads framing the crown-ring
//     that stands before it;
//     a dim gold flicker now and then, a full light where it strikes.
const TEMPEST_CLOUD = { w: 30, h: 8, base: 44.5 };
const SOV_CLOUD = { w: 46, h: 11, base: 40.5 };
const cloud = (ctx, x, top, time, t, kind) => {
  const tempest = kind === "tempest", C = tempest ? TEMPEST_CLOUD : SOV_CLOUD;
  const seed = 1 + (t.id % 3);
  let lit = null;
  const spots = stormSpots(C.w, C.h, seed, 3);
  if (tempest) {
    if (Math.sin(time * 9 + t.id) > 0.72 || t.anim > 0.3) lit = spots[Math.floor(time * 6 + t.id) % 3];
  } else {
    const beat = time * 0.7 + t.id * 0.3, ph = beat % 1;
    if (ph < 0.08 || t.anim > 0.6) {
      const s = Math.floor(beat) % 2 ? 1 : -1;
      lit = { x: s * C.w * 0.32, y: -C.h * 0.1, r: C.h * 1.1 };
    } else if (ph > 0.5 && ph < 0.53) lit = spots[Math.floor(beat) % 3];
  }
  stormCloud(ctx, x + Math.sin(time * 0.4 + t.id) * 0.6, top - C.base, {
    w: C.w, h: C.h, pal: kind, seed, time, fps: tempest ? 4 : 2, frames: 6, amp: tempest ? 0.6 : 0.4, ink: 2, lit,
    shape: tempest ? "heap" : "twin",
  });
};
