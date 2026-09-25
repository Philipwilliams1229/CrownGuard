// ============ HALL: THE WIZARD SPIRE ============
// A round stone spire with a walk at the top where the mage stands. It
// climbs with him: an apprentice on a squat tower, a staff-bearer between
// two floating crystals, a long-beard before a crescent crest with violet
// banners at his back. Then the elements take it.
//   Pyromancer — warm stone, braziers at the corners, ember-lit windows.
//     Volcanic Throne: black basalt split by glowing lava, an obsidian
//       throne-back of spikes, a lava pool smoking at the foot.
//     Wildfire Court: a ring of fire-pillars round the foot, flame-tongued
//       banners, embers on the wind.
//   Stormcaller — blue slate, a copper rod behind him, runes that hum.
//     Tempest Court: two tesla coils throwing arcs across the walk and a
//       storm cloud turning overhead.
//     Thunder Sovereign: a great gilt crown-ring raised behind him, a
//       black cloud above that strikes it.
// The mage anticipates each shot — the orb swells as the cooldown runs out
// — then drives his staff at the foe.
//
// Three baked layers per form (ground, body, front lip); lights, fire,
// lightning, runes and the mage are live.

import { getStats } from "../../engine/towers.js";
import {
  GREY_STONE, lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part, hash,
  groundBed, footClip, footing, ashlar, archWindow, door, banner, brazier, flame, merlons, rock, posy, pennant,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { drawMage, mageTip, MAGE_FOLK } from "../folk.js";

const CACHE = new Map();
export const resetWizardBakes = () => CACHE.clear();
const baked = (key, w, h, draw, ink = true) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw, ink); CACHE.set(key, sp); }
  return sp;
};
const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore();
};

const STONE = { base: "#8e889a", a: "#9a7a6c", aa: "#4a4048", ab: "#a4806a", b: "#7a8298", ba: "#6e7a94", bb: "#72708e" };
const ORB = { base: "#b08ad8", a: "#f0903a", aa: "#ff7a2a", ab: "#f8b040", b: "#8ce8f0", ba: "#a8f0f8", bb: "#f0e070" };
const TRIM = { base: "#d8b34a", a: "#e8a040", aa: "#e8703a", ab: "#f0c060", b: "#8cc8e0", ba: "#a8e0f0", bb: "#e8c14a" };
const CLOTH = { base: "#5a4a8c", a: "#a0402e", aa: "#6a1e18", ab: "#c0582a", b: "#2e5a8a", ba: "#24507a", bb: "#4a3a80" };
const LAVA = "#ff8a2a";

const spireH = (t) => 18 + t.level * 6 + (t.branch ? 4 : 0);
const shaftW = (t) => (t.rank4 ? 24 : t.branch ? 22 : 16 + t.level * 2);
const BOX = { left: 34, right: 34, up: 104, down: 18 };
const FRONT = { left: 20, right: 20, up: 80, down: 4 };

// the element a form belongs to
const elem = (t) => (t.branch === "a" ? "fire" : t.branch === "b" ? "storm" : "arcane");

// A tesla coil: a copper rod ringed with coils, a ball at the top.
const coil = (ctx, x, bottom, h) => {
  part(ctx, (c) => cylinder(c, x - 1.2, bottom - h, 2.4, h, "#b8743a", { r: 1, hi: 0.4, lo: 0.5 }));
  for (let i = 0; i < 3; i++) part(ctx, (c) => cylinder(c, x - 2.6 + i * 0.3, bottom - h * 0.35 - i * 3.2, 5.2 - i * 0.6, 1.6, "#d8a04a", { r: 0.8, hi: 0.5, lo: 0.4 }));
  part(ctx, (c) => ball(c, x, bottom - h - 1.5, 2.4, 2.4, "#c8d4e0", { hi: 0.6, lo: 0.4 }));
};

const paintGround = (ctx, t, x, y) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  ctx.save();
  footClip(ctx, x, y);
  groundBed(ctx, x, y + 7, shaftW(t) / 2 + 1, t.id, { earth: r4 === "aa" ? "#4a3a30" : r4 === "ab" ? "#6a4a30" : "#7c6242" });
  // scorched ground round the Volcanic Throne
  if (r4 === "aa") soft(ctx, x, y + 6, 17, 7, [[0, "rgba(40,24,24,0.45)"], [0.7, "rgba(40,24,24,0.25)"], [1, "rgba(40,24,24,0)"]]);
  ctx.restore();
};

const paintBody = (ctx, t, x, y) => {
  const lvl = t.level, br = t.branch;
  const r4 = t.rank4 ? br + t.rank4 : null;
  const key = r4 || br || "base";
  const el = elem(t);
  const bodyH = spireH(t), sw = shaftW(t), hw = sw / 2;
  const top = y - bodyH;             // the walk's lip
  const base = y + 7;
  const stone = STONE[key] || STONE.base;
  const trim = TRIM[key] || TRIM.base;
  const cloth = CLOTH[key] || CLOTH.base;
  const seed = t.id * 5 + lvl;
  const pw = hw + 4;

  // ---- BACK: what rises behind the mage, above the walk
  if (lvl >= 3 || br) {
    if (!br) {
      // a crescent crest on a stone upright: the moon he studies
      part(ctx, (c) => cylinder(c, x - 2, top - 28, 4, 20, stone, { r: 1, hi: 0.35, lo: 0.5 }));
      part(ctx, (c) => {
        c.beginPath(); c.arc(x, top - 33, 7, 0.15 * Math.PI, 0.85 * Math.PI, true); c.arc(x - 1.2, top - 34.5, 5.6, 0.8 * Math.PI, 0.2 * Math.PI, false); c.closePath();
        c.fillStyle = lin(c, x - 7, 0, x + 7, 0, [[0, lighten(trim, 0.35)], [0.5, trim], [1, darken(trim, 0.4)]]); c.fill();
      });
    } else if (r4 === "aa") {
      // the obsidian throne-back: a fan of black spikes
      for (let i = -3; i <= 3; i++) {
        const sx = x + i * 3.8, sh = 34 - Math.abs(i) * 5.5;
        part(ctx, (c) => {
          c.beginPath(); c.moveTo(sx - 2.2, top - 6); c.lineTo(sx + i * 0.6, top - 6 - sh); c.lineTo(sx + 2.2, top - 6); c.closePath();
          c.fillStyle = lin(c, sx - 2, 0, sx + 2, 0, [[0, "#6a5a70"], [0.5, "#3a3040"], [1, "#1e1824"]]); c.fill();
          c.fillStyle = LAVA; c.fillRect(sx - 0.3, top - 9 - sh * 0.3, 0.6, sh * 0.25);
        });
      }
    } else if (r4 === "ba") {
      for (const s of [-1, 1]) coil(ctx, x + s * (pw - 2), top - 6, 22);
    } else if (r4 === "bb") {
      // the crown-ring on its pole
      part(ctx, (c) => cylinder(c, x - 1.2, top - 32, 2.4, 26, "#8a6a2a", { r: 1 }));
      part(ctx, (c) => {
        c.strokeStyle = lin(c, x - 10, 0, x + 10, 0, [[0, "#f8e08a"], [0.5, "#d8b34a"], [1, "#8a6a2a"]]);
        c.lineWidth = 2.2;
        c.beginPath(); c.ellipse(x, top - 34, 10, 10, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = "#d8b34a";
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const px = x + Math.cos(a) * 10, py = top - 34 + Math.sin(a) * 10;
          c.beginPath(); c.moveTo(px - Math.sin(a) * 1.4, py + Math.cos(a) * 1.4); c.lineTo(px + Math.cos(a) * 3.6, py + Math.sin(a) * 3.6); c.lineTo(px + Math.sin(a) * 1.4, py - Math.cos(a) * 1.4); c.closePath(); c.fill();
        }
      });
    } else if (el === "storm") {
      // the copper lightning rod
      part(ctx, (c) => cylinder(c, x + pw - 4, top - 34, 2, 28, "#b8743a", { r: 1, hi: 0.4, lo: 0.5 }));
      part(ctx, (c) => { ball(c, x + pw - 3, top - 35, 1.8, 1.8, "#e0e8f0", { hi: 0.6, lo: 0.4 }); c.fillStyle = "#d8a04a"; c.fillRect(x + pw - 4.5, top - 24, 3, 1); c.fillRect(x + pw - 4.5, top - 18, 3, 1); });
    }
    // the back corners: braziers for fire, posts for the rest
    if (el === "fire") for (const s of [-1, 1]) {
      part(ctx, (c) => cylinder(c, x + s * (pw - 2) - 1.6, top - 14, 3.2, 9, stone, { r: 1, hi: 0.35, lo: 0.5 }));
      brazier(ctx, x + s * (pw - 2), top - 13, r4 ? 0.9 : 0.75);
    }
  } else if (lvl === 2) {
    // two pedestals for the floating crystals
    for (const s of [-1, 1]) part(ctx, (c) => { cylinder(c, x + s * (pw - 2) - 1.6, top - 12, 3.2, 7, stone, { r: 1, hi: 0.35, lo: 0.5 }); c.fillStyle = trim; c.fillRect(x + s * (pw - 2) - 2, top - 12.5, 4, 1.2); });
  } else {
    // the apprentice's lectern, an open book on it
    part(ctx, (c) => { c.fillStyle = "#6a4a2e"; c.fillRect(x - pw + 3, top - 12, 1.4, 7); c.fillStyle = "#5a3f26"; c.fillRect(x - pw + 1, top - 13, 5.5, 1.5); });
    part(ctx, (c) => { c.fillStyle = "#e8e0c8"; c.fillRect(x - pw + 1, top - 15, 2.6, 2); c.fillRect(x - pw + 3.9, top - 15, 2.6, 2); });
  }

  // ---- the walk: floor seen from above, then the shaft under it
  part(ctx, (c) => {
    roundRect(c, x - pw, top - 10, pw * 2, 9, 2);
    c.fillStyle = lighten(stone, 0.15); c.fill();
    c.fillStyle = rgba(darken(stone, 0.6), 0.45);
    c.beginPath(); c.ellipse(x, top - 5.5, pw - 3, 2.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = rgba(trim, 0.7);
    c.beginPath(); c.ellipse(x, top - 5.5, pw - 5, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = lighten(stone, 0.15);
    c.beginPath(); c.ellipse(x, top - 5.5, pw - 6, 1.3, 0, 0, Math.PI * 2); c.fill();
  });
  footing(ctx, x, base, hw + 1, darken(stone, 0.05), seed, r4 ? 6 : 5);
  ashlar(ctx, x - hw, top + 3, sw, base - 5 - top - 3, stone, seed, { course: 4, block: 5.5, band: lvl >= 3 || br ? 5 : 0, moss: el === "fire" ? 0 : 0.5, cracks: r4 === "aa" });
  if (r4 === "aa") {
    // lava in the seams: jagged glowing cracks down the basalt
    part(ctx, (c) => {
      c.strokeStyle = LAVA; c.lineWidth = 0.8; c.lineCap = "square";
      for (let k = 0; k < 3; k++) {
        let lx = x - hw + 3 + k * (sw - 6) / 2, ly = top + 6 + k * 4;
        c.beginPath(); c.moveTo(lx, ly);
        for (let i = 0; i < 5; i++) { lx += (hash(seed + k, i) - 0.5) * 4; ly += 3 + hash(seed, i + k) * 3; c.lineTo(lx, ly); }
        c.stroke();
      }
      c.strokeStyle = "#ffe08a"; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(x - hw + 3, top + 6); c.lineTo(x - hw + 3.5, top + 10); c.stroke();
    }, { ink: "under" });
  }
  // the lip under the walk, in the trim colour, with a corbel ring
  part(ctx, (c) => cylinder(c, x - pw, top - 1.5, pw * 2, 4.5, darken(stone, 0.1), { r: 1.2, hi: 0.35, lo: 0.5 }));
  part(ctx, (c) => cylinder(c, x - pw + 0.5, top - 1.5, pw * 2 - 1, 1.2, trim, { r: 0.6, hi: 0.45, lo: 0.4 }));
  for (let cx = x - pw + 2; cx <= x + pw - 4; cx += 4) part(ctx, (c) => {
    c.fillStyle = lin(c, cx, 0, cx + 3, 0, [[0, lighten(stone, 0.2)], [0.5, stone], [1, darken(stone, 0.4)]]);
    c.beginPath(); c.moveTo(cx, top + 3); c.lineTo(cx + 3, top + 3); c.lineTo(cx + 2.3, top + 6); c.lineTo(cx + 0.7, top + 6); c.closePath(); c.fill();
  });

  // ---- windows and door; their light is live
  const winY = top + 8;
  archWindow(ctx, x, winY, 4, 7, lighten(stone, 0.2));
  if (bodyH >= 30) archWindow(ctx, x, winY + 12, 3.2, 5, lighten(stone, 0.2));
  door(ctx, x, base - 5, 5, 7.5, el === "storm" ? "#4a4e5e" : "#5e4128");

  // ---- cloth: violet (or the element's) banners hung from the lip
  if (lvl >= 3 || br) {
    for (const s of [-1, 1]) {
      banner(ctx, x + s * (hw - 2.5), top + 4, 4, 11, cloth, trim, (c, cx, cy) => {
        c.fillStyle = trim;
        if (el === "fire") { c.beginPath(); c.moveTo(cx - 1.2, cy + 1.5); c.quadraticCurveTo(cx - 1.5, cy - 1, cx, cy - 2.8); c.quadraticCurveTo(cx + 1.5, cy - 1, cx + 1.2, cy + 1.5); c.closePath(); c.fill(); }
        else if (el === "storm") { c.fillRect(cx, cy - 2.5, 1, 2); c.fillRect(cx - 1, cy - 0.5, 1, 1.5); c.fillRect(cx - 0.2, cy + 0.8, 1, 2); }
        else { c.fillRect(cx - 0.5, cy - 2, 1, 4); c.fillRect(cx - 2, cy - 0.5, 4, 1); }
      }, { point: r4 !== "ab" });
    }
  }
  if (r4 === "ab") {
    // flame tongues licking up the shaft's foot
    for (let i = 0; i < 5; i++) part(ctx, (c) => {
      const fx = x - hw + 2 + i * (sw - 4) / 4, fh = 4 + hash(seed, i) * 4;
      c.fillStyle = i % 2 ? "#e8703a" : "#f0a040";
      c.beginPath(); c.moveTo(fx - 1.6, base - 5); c.quadraticCurveTo(fx - 1, base - 5 - fh * 0.6, fx + 0.5, base - 5 - fh); c.quadraticCurveTo(fx + 1.4, base - 5 - fh * 0.5, fx + 1.6, base - 5); c.closePath(); c.fill();
    }, { ink: "under" });
  }

  // ---- the foot
  if (el === "storm") {
    // rune-stones set round the foot; they hum live
    for (const s of [-1, 1]) rock(ctx, x + s * (hw + 2.5), base - 1, 2, 3, "#8a90a0", seed + s);
  }
  if (r4 === "ab") {
    // a ring of fire-pillars round the foot (their fire is live)
    for (const [px, py] of [[x - hw - 3.5, base - 3], [x + hw + 3.5, base - 3]]) part(ctx, (c) => { cylinder(c, px - 1.7, py - 9, 3.4, 9, "#7a5a4a", { r: 1, hi: 0.35, lo: 0.5 }); c.fillStyle = "#3a2420"; c.fillRect(px - 2, py - 10, 4, 1.4); });
  }
  if (r4 === "aa") for (const [rx, ry] of [[-9, 4], [13, 2], [-13, 1]]) rock(ctx, x + rx, base + ry, 2, 1.3, "#3a3038", seed + rx);
  if (!br) posy(ctx, x - hw - 3, base + 1.5, "#b08ad8", seed);
};

// The low gilt balustrade along the front of the walk.
const paintFront = (ctx, t, x, y) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const bodyH = spireH(t), pw = shaftW(t) / 2 + 4, top = y - bodyH;
  const stone = STONE[key] || STONE.base, trim = TRIM[key] || TRIM.base;
  part(ctx, (c) => cylinder(c, x - pw + 0.5, top - 4.5, pw * 2 - 1, 1.6, darken(stone, 0.05), { r: 0.8, hi: 0.35, lo: 0.5 }));
  for (const s of [-1, 1]) part(ctx, (c) => {
    cylinder(c, x + s * (pw - 1.5) - 1.5, top - 6, 3, 5, stone, { r: 0.8, hi: 0.35, lo: 0.5 });
    ball(c, x + s * (pw - 1.5), top - 6.5, 1.5, 1.2, trim, { hi: 0.5, lo: 0.4 });
  });
};

export const drawWizardSpire = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const el = elem(t);
  const bodyH = spireH(t), sw = shaftW(t), hw = sw / 2, pw = hw + 4;
  const top = y - bodyH, base = y + 7;
  const orbCol = ORB[key] || ORB.base;
  const canBake = typeof document !== "undefined";
  const form = `${lvl}|${t.branch}|${t.rank4}`, v = t.id % 3, tv = { ...t, id: v };
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
  if (canBake) {
    stamp(ctx, baked(`ground|${form}|${v}`, BOX.left + BOX.right, 40, (c) => paintGround(c, tv, BOX.left, 14), false), x, y, BOX.left, 14);
    stamp(ctx, baked(`spire|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBody(c, tv, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  } else paintBody(ctx, t, x, y);
  // the lava pool at the Volcanic Throne's foot breathes under its crust
  if (r4 === "aa") {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + t.id);
    // (it wells up in front of the door, well inside the hall's footing)
    glow(ctx, x + 4, base + 2, 8, LAVA, 0.25 + pulse * 0.15);
    soft(ctx, x + 4, base + 2.5, 6, 2.4, [[0, "#ffe08a"], [0.4, LAVA], [0.85, "#b8321e"], [1, "#6a1e18"]]);
    ctx.fillStyle = "#2a2024";
    ctx.fillRect(x + 0.5, base + 1.5, 2.5, 1); ctx.fillRect(x + 5, base + 3.5, 3, 1); ctx.fillRect(x + 7.5, base + 1.5, 1.5, 1);
  }

  // ---- lights in the stone
  const winCol = el === "fire" ? "#ffa040" : el === "storm" ? "#a8e8ff" : "#ffd070";
  const breath = 0.6 + 0.25 * Math.sin(time * 1.7 + t.id);
  glow(ctx, x, top + 13, 4, winCol, breath);
  if (bodyH >= 30) glow(ctx, x, top + 23, 3, winCol, breath * 0.8);
  if (r4 === "aa") glow(ctx, x, top + bodyH * 0.55, hw + 2, LAVA, 0.12 + 0.1 * Math.sin(time * 2.4 + t.id));
  if (el === "storm") for (const s of [-1, 1]) {
    const on = 0.4 + 0.5 * Math.max(0, Math.sin(time * 3 + s * 1.3 + t.id));
    glow(ctx, x + s * (hw + 2.5), base - 2, 3, "#8ce8f0", on);
    ctx.fillStyle = rgba("#e8fcff", on); ctx.fillRect(x + s * (hw + 2.5) - 0.5, base - 3.5, 1, 2.5);
  }
  // ---- fire at the corners and round the foot
  if (el === "fire" && grown) for (const s of [-1, 1]) flame(ctx, x + s * (pw - 2), top - 19.5, r4 ? 0.9 : 0.7, time, t.id + s * 3);
  if (r4 === "ab") {
    flame(ctx, x - hw - 3.5, base - 12.5, 0.75, time, t.id + 7);
    flame(ctx, x + hw + 3.5, base - 12.5, 0.75, time, t.id + 11);
  }

  // ---- the mage: idle between waves, gathering power as the cooldown
  // runs out, driving the staff at the foe on the shot
  const aimDir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const dir = t._idle ? (Math.sin(time * 0.5 + t.id) >= 0 ? 1 : -1) : aimDir;
  const level = t.branch ? 3 : lvl;
  const pal = MAGE_FOLK[key] || MAGE_FOLK.base;
  const my = top - 7;
  const st = getStats(t);
  const rate = st.rate || 1000;
  const charge = t._idle ? 0 : Math.max(0, Math.min(1, 1 - t.cd / rate));
  const pose = t._idle ? "idle" : t.anim > 0.35 ? "cast" : "charge";
  const mcv = canBake ? baked(`mage|${key}|${level}|${pose}`, 34, 40, (c) => drawMage(c, 14, 37, 1, pal, level, { pose })) : null;
  // star-charms from level three; the back arc passes behind the mage
  const stars = [];
  if (grown) {
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
    ctx.fillStyle = orbCol; ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx + 1.6, cy); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 1.6, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fffaf0"; ctx.fillRect(cx - 0.6, cy - 1.5, 0.8, 1.5);
  }
  if (mcv) stamp(ctx, mcv, x, my, 14, 37, dir); else drawMage(ctx, x, my, dir, pal, level, { pose });
  if (canBake) stamp(ctx, baked(`front|${form}`, FRONT.left + FRONT.right, FRONT.up + FRONT.down, (c) => paintFront(c, tv, FRONT.left, FRONT.up)), x, y, FRONT.left, FRONT.up);
  else paintFront(ctx, t, x, y);

  // ---- the orb at the staff tip: small at rest, swelling with the charge,
  // a flash and a ring as it flies
  const [tx, ty] = mageTip(level, pose);
  const bob = pose === "cast" ? 0 : Math.sin(time * 2.5 + t.id) * 1.2;
  const orbX = x + dir * tx, orbY = my + ty + bob - (level >= 2 ? 1 : 0);
  const rBase = level >= 3 ? 3.4 : level === 2 ? 2.8 : 2.3;
  const rOut = rBase * (t._idle ? 0.8 : 0.75 + charge * 0.45) + (t.anim > 0.4 ? 0.8 : 0);
  glow(ctx, orbX, orbY, rOut * (2 + charge), orbCol, 0.3 + charge * 0.25);
  ball(ctx, orbX, orbY, rOut, rOut, orbCol, { hi: 0.6, lo: 0.3 });
  ctx.fillStyle = "#fffaf0"; ctx.fillRect(orbX - rOut * 0.45, orbY - rOut * 0.5, 1, 1);
  // motes spiral in while it gathers
  if (!t._idle && charge > 0.45 && t.anim < 0.2) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + i * 2.1, d = (1 - charge) * 14 + 3;
      ctx.fillStyle = rgba(orbCol, 0.9);
      ctx.fillRect(orbX + Math.cos(a) * d - 0.5, orbY + Math.sin(a) * d * 0.7 - 0.5, 1, 1);
    }
  }
  if (t.anim > 0.05) {
    glow(ctx, orbX, orbY, rOut * 1.2, "#fffaf0", t.anim);
    ctx.strokeStyle = rgba(orbCol, t.anim * 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(orbX, orbY, rOut + (1 - t.anim) * 12, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
  }
  for (const s of stars) if (s.front) star(s);
  for (const r of runes) if (r.front) rune(ctx, r);

  // ---- storms: static round the Stormcaller, arcs between the Tempest's
  // coils, a thundercloud over the Sovereign that strikes his crown
  if (el === "storm") {
    if (Math.sin(time * 11 + t.id) > 0.55 || t.anim > 0.5) {
      const ang = time * 5 + t.id;
      zig(ctx, orbX + Math.cos(ang) * 4, orbY + Math.sin(ang) * 4, orbX + Math.cos(ang) * 10, orbY + Math.sin(ang) * 8 + 4, time, "#f8f0a0", 1);
    }
    if (r4 === "ba") {
      const a0 = x - pw + 2, a1 = x + pw - 2, ay = top - 29.5;
      glow(ctx, a0, ay, 4, "#a8f0f8", 0.5); glow(ctx, a1, ay, 4, "#a8f0f8", 0.5);
      if (Math.sin(time * 9 + t.id) > -0.3 || t.anim > 0.3) zig(ctx, a0, ay, a1, ay, time * 1.3, "#e8fcff", 1.2);
      cloud(ctx, x, top - 44, time, t.id, "#8a94a8", 0.9);
    }
    if (r4 === "bb") {
      cloud(ctx, x, top - 54, time, t.id, "#4a4a62", 1.2);
      const strike = ((time * 0.7 + t.id * 0.3) % 1) < 0.08 || t.anim > 0.6;
      if (strike) {
        zig(ctx, x + 2, top - 50, x, top - 44, time * 3, "#fff8c0", 1.4);
        glow(ctx, x, top - 34, 12, "#f0e070", 0.45);
      } else glow(ctx, x, top - 34, 8, "#f0e070", 0.15 + 0.1 * Math.sin(time * 3));
    }
  }
  // smoke off the Volcanic Throne; embers up the Wildfire Court
  if (r4 === "aa") for (let i = 0; i < 3; i++) {
    const t2 = (time * 7 + i * 7 + t.id * 2) % 21;
    soft(ctx, x + 4 + Math.sin(time + i) * 2 + t2 * 0.2, base + 1 - t2 * 1.4, 2 + t2 / 6, 2 + t2 / 6, [[0, `rgba(70,60,64,${Math.max(0, 0.45 - t2 * 0.02)})`], [1, "rgba(70,60,64,0)"]]);
  }
  if (r4 === "ab" || r4 === "aa") for (let i = 0; i < 4; i++) {
    const ey = base - ((time * 24 + i * 13 + t.id * 7) % (bodyH + 30));
    const ex = x - hw - 6 + i * (sw + 12) / 3 + Math.sin(time * 3 + i) * 3;
    ctx.fillStyle = i % 2 ? "#ffd070" : "#ff8a2a";
    ctx.fillRect(ex, ey, 1, 1);
  }
  // between battles a tome hangs open by the spire, pages flicking
  if (t._idle && ((time / 9) + t.id * 0.37) % 1 < 0.45) {
    const ty2 = top - 22 + Math.sin(time * 1.6) * 2;
    ctx.fillStyle = "#d8ceb4";
    ctx.fillRect(x + 12, ty2, 3.5, 4.5); ctx.fillRect(x + 16, ty2, 3.5, 4.5);
    ctx.fillStyle = "#a89c7c";
    ctx.fillRect(x + 15.4 + (Math.sin(time * 7) > 0.6 ? 0.6 : 0), ty2, 0.8, 4.5);
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

// A little storm cloud, lumps turning slowly.
const cloud = (ctx, x, y, time, id, col, s = 1) => {
  for (let i = 0; i < 5; i++) {
    const a = time * 0.6 + i * 1.26 + id;
    ball(ctx, x + Math.cos(a) * 6 * s, y + Math.sin(a) * 1.6 * s, (4 + (i % 2)) * s, 3 * s, col, { hi: 0.3, lo: 0.4 });
  }
  ball(ctx, x, y - 1, 5 * s, 3.4 * s, lighten(col, 0.1), { hi: 0.35, lo: 0.35 });
};
