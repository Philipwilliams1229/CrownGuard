// the overhaul: decor (art/briefs/overhaul-build-millrace.md, B4: the farm, the rocks, the lights).
//
// What it draws on an overhaul realm (its place from decor-layout.js LAYOUTS[realm]: Millrace's farm, Gullwick's
// hamlet details and ruined tower, the Greenwood's croft, Bramblewick's steading, Foxmere's chapel):
//   - THE FARM (Millrace's, decor-layout.js FARM): barn, farmhouse, hen house, well, haystacks, the garden's fence, hens,
//     a cat, washing, a yard lamp, chimney smoke, a granite group; sculpted with the approved concept's kit
//     (decor-kit.js), y-sorted with the actors (decorDrawables), casting along the sun (decorShadowExtras),
//     its yard, path, garden plot and every piece's contact line baked into the ground (decorGroundMarks).
//   - THE ROCKS: every `rock` piece (the board's DECOR and the apron's) re-sculpted by THE ROCK RULE
//     (ownsDecor / drawDecorPiece / decorShadowItem).
//   - THE LIGHTS (lights.js): lit windows at sunrise / late / golden and at night, lanterns as lamps at night.
// Light: every piece is sculpted under the level's sun; under an eastern sun it is sculpted under the
// sun's WEST twin and the baked canvas is mirrored (the concept's painted details assume a western light),
// except fence runs (sculpted under the true sun, never mirrored). Bakes are kept per sun and dropped on
// onDay; a house has a lit twin, baked the first time it is asked for. Nothing per pixel in a frame.
//
// Slots: the lead wires them (overhaul/wire.js) from the exports below; decorKey() joins the ground's cache key.
import { DAY, onDay } from "../../data/sun.js";
import * as K from "./decor-kit.js";
import { FARM_BLOCKS, LAYOUTS } from "./decor-layout.js";
import { REALM } from "../../data/maps.js";
import { windowsLit, noteFarmLamps } from "./lights.js";
import { DECOR } from "../../data/terrain.js";

export { FARM_BLOCKS };
// this realm's place (decor-layout.js LAYOUTS), or null: a board with only its rocks redrawn
const layout = () => (REALM && LAYOUTS[REALM.id]) || null;
// for the lead: the ellipses where halls may not be built, per realm (copied into the realm data's `blocks`)
export const decorBlocks = (id) => (LAYOUTS[id] && LAYOUTS[id].blocks) || [];
// the ground bake's version (wire.js adds it to world.js groundLayer's cache key)
export const decorKey = () => "b4.4";

const mirrorNow = () => DAY.on && DAY.side === 1;
const snap = (v) => Math.round(v * 2) / 2;

// a baked piece flipped about its anchor (ox' = w - ox; lamp points and window rects follow)
const flip = (s) => {
  const c = document.createElement("canvas");
  c.width = s.cv.width; c.height = s.cv.height;
  const x = c.getContext("2d");
  x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(s.cv, 0, 0);
  return { cv: c, ox: c.width - s.ox, oy: s.oy, lights: (s.lights || []).map(([a, b, w, h]) => [-a - w, b, w, h]), lamps: (s.lamps || []).map(([a, b, r, col]) => [-a, b, r, col]), contact: s.contact };
};
// sculpt under the right sun (twin + mirrored, or the true sun), windows lit or not
const sculpt = (make, mirror, lit = false) => {
  K.SUNM.twin = mirror || !DAY.on; K.WIN.lit = lit;
  try {
    const s = make();
    const m = mirror && DAY.on && DAY.side === 1 ? flip(s) : s;
    return { ...m, lights: m.lights || [], lamps: m.lamps || [], foot: mirror && DAY.side === 1 && DAY.on ? undefined : s.foot };
  } finally { K.SUNM.twin = true; K.WIN.lit = false; }
};

// ---- the farm's pieces, expanded (a fence run is many sprites, each at its own foot) ----
// each: { make(t) -> sprite, x, y, sort (sort y), shade (casts), round, mirror, frames (live: [t values]),
//         fps, lit (has a lit twin), over }
const mat = (n) => (typeof n === "string" ? K.V[n] : n);
const houseOpts = (o) => ({ ...o, door: o.door ? [o.door[0], o.door[1], o.door[2], mat(o.door[3])] : o.door,
  windows: (o.windows || []).map(([x, y, w, h, wo]) => [x, y, w, h, wo && wo.shutter ? { ...wo, shutter: mat(wo.shutter) } : wo]) });
// the t values that give a hen's two poses (standing, pecking): the kit's hen pecks while sin(t*2.2+seed*1.7) > 0.35
const henTs = (seed) => { let up = null, dn = null; for (let t = 0; t < 6 && (up === null || dn === null); t += 0.05) { const pk = Math.sin(t * 2.2 + seed * 1.7) > 0.35; if (pk && dn === null) dn = t; if (!pk && up === null) up = t; } return [up ?? 0, dn ?? 0]; };
const cyc = (n, period) => Array.from({ length: n }, (_, i) => (i * period) / n);
let PIECES = null, PIECES_FOR = null;
const pieces = () => {
  const id = REALM ? REALM.id : "";
  if (PIECES && PIECES_FOR === id) return PIECES;
  if (PIECES_FOR !== id) BAKE = new Map();   // (a new board: its own bakes)
  PIECES_FOR = id;
  const out = [], byId = {}, L = layout();
  for (const p of L ? L.pieces : []) {
    const base = { x: p.x, y: p.y, sort: p.y, shade: true, round: true, mirror: p.mirror !== false };
    switch (p.k) {
      case "house": { const it = { ...base, make: () => K.house(houseOpts(p.o)), round: false, lit: (p.o.windows || []).length > 0 || p.o.gableWin !== false }; out.push(it); byId[p.id] = it; break; }
      case "henhouse": out.push({ ...base, make: () => K.henhouse(), round: false }); break;
      case "well": out.push({ ...base, make: (t) => K.well2(t), frames: cyc(6, (2 * Math.PI) / 1.6), fps: 2.6 }); break;
      case "woodpile": out.push({ ...base, make: () => K.woodpile(5), round: false }); break;
      case "haystack": out.push({ ...base, make: () => K.haystack(p.r, p.seed) }); break;
      case "hen": { const col = p.col ? K.V[p.col] : K.V.hen; out.push({ ...base, make: (t) => K.hen3(t, p.seed, col), frames: henTs(p.seed), hen: p.seed }); break; }
      case "cat": out.push({ ...base, make: (t) => K.cat(t), frames: [0, 1, 2, 3], fps: 2.5 }); break;
      case "washing": out.push({ ...base, make: (t) => K.washing(t), frames: cyc(6, (2 * Math.PI) / 1.5), fps: 2.4, round: false }); break;
      case "lamp": out.push({ ...base, make: () => K.lampPost(p.h) }); break;
      case "rock": out.push({ ...base, make: () => K.rockMass(p.s, p.fam, p.seed), rock: true }); break;
      case "chapel": out.push({ ...base, make: () => K.chapel(p.seed, { lamp: true }), round: false }); break;
      case "stile": out.push({ ...base, make: () => K.stile(), round: false }); break;
      case "wall": out.push({ ...base, mirror: false, round: false, sort: p.y + Math.max(...p.pts.map((q) => q[1])) / 2, make: () => K.dryWall(p.pts, p.hgt ?? 11, p.seed, { gaps: 0.03, m: K.M.stoneW }) }); break;
      case "smoke": { const h = byId[p.of]; out.push({ x: h.x, y: h.y, dx: p.dx, dy: p.dy, smoke: true, sort: h.y + 150, shade: false, mirror: true, make: (t) => K.smoke(t), frames: cyc(8, 20), fps: 2 }); break; }
      case "fence": {
        const pts = p.pts, gap = p.gap ?? 9, h = p.h ?? 9, f = { ...base, mirror: false, round: false };
        for (let s = 0; s + 1 < pts.length; s++) {
          const [ax, ay] = pts[s], [bx, by] = pts[s + 1], dx = bx - ax, dy = by - ay;
          if (Math.abs(dx) >= Math.abs(dy)) {
            const go = p.gate && p.gate[0] === s ? { gate: [0, p.gate[1], p.gate[2]] } : {};
            out.push({ ...f, x: p.x + ax / 2, y: p.y + ay / 2, sort: p.y + Math.max(ay, by) / 2, make: () => K.fence([[0, 0], [dx, dy]], p.seed + s, { h, gap, ...go }) });
          } else {
            const n = Math.max(1, Math.round(Math.abs(dy) / gap)), yf = Math.max(ay, by), yb = Math.min(ay, by);
            out.push({ ...f, x: p.x + ax / 2, y: p.y + yf / 2, sort: p.y + yf / 2 + 0.5, shade: false, make: () => K.fence([[0, yb - yf], [0.01, 0]], p.seed + s, { h, noPosts: true }) });
            for (let k = 1; k < n; k++) { const y = p.y + K.lerp(ay, by, k / n) / 2; out.push({ ...f, x: p.x + ax / 2, y, sort: y, round: true, make: () => K.post(h, p.seed + k) }); }
            if (s === pts.length - 2) { const y = p.y + by / 2; out.push({ ...f, x: p.x + bx / 2, y, sort: y, round: true, make: () => K.post(h, p.seed + 40) }); }
          }
        }
        break;
      }
    }
  }
  out.forEach((it, i) => { it.idx = i; });
  return (PIECES = out);
};

// ---- the bakes (per sun; a house's lit twin on demand; live pieces one sprite a frame) ----
let BAKE = new Map();
onDay(() => { BAKE = new Map(); K.ROCKS.clear(); });
const bakeOf = (it, lit = false, f = 0) => {
  const key = `${it.idx}|${lit && it.lit ? 1 : 0}|${f}`;
  let b = BAKE.get(key);
  if (!b) { b = sculpt(() => it.make(it.frames ? it.frames[f] : 0), it.mirror, lit && it.lit); BAKE.set(key, b); }
  return b;
};
// for labs: the bakes kept now (count, bytes)
export const decorStats = () => { let n = 0, bytes = 0; for (const b of BAKE.values()) { n++; bytes += b.cv.width * b.cv.height * 4; } for (const r of K.ROCKS.values()) { n++; bytes += r.cv.width * r.cv.height * 4; } return { n, bytes }; };
const frameOf = (it, time) => {
  if (!it.frames) return 0;
  if (it.hen !== undefined) return Math.sin(time * 2.6 + it.hen * 1.7) > 0.35 ? 1 : 0;
  return Math.floor(time * (it.fps || 2) + it.x * 0.37) % it.frames.length;
};
// where a piece's canvas goes (board units): its foot, or its house's chimney (smoke follows a mirrored house)
const footOf = (it) => {
  if (!it.smoke) return [snap(it.x), snap(it.y)];
  const m = mirrorNow() ? -1 : 1;
  return [snap(it.x + it.dx * m), snap(it.y + it.dy)];
};
const blit = (ctx, b, x, y) => ctx.drawImage(b.cv, x - b.ox / 2, y - b.oy / 2, b.cv.width / 2, b.cv.height / 2);

// ---- the rocks (the board's DECOR `rock` pieces, and the apron's) ----
const hashXY = (x, y) => K.hash(Math.round(x), Math.round(y));
// a rock standing in the farm's ground (the stackyard's, 628,45) is a darker granite loaf, a little bigger
// and sunk 1 unit deeper, so it sits with the haystacks rather than reading as a pale slab on the grass
const inFarm = (d) => decorBlocks(REALM && REALM.id).some((b) => ((d.x - b.x) / (b.rx + 14)) ** 2 + ((d.y - b.y) / (b.ry + 14)) ** 2 <= 1);
const rockSpec = (d) => {
  const h = hashXY(d.x, d.y), farm = inFarm(d);
  return { s: Math.round(24 * (d.s || 1) + h * 4) + (farm ? 2 : 0), fam: farm || h < 0.7 ? "granite" : "limestone", seed: 1 + Math.floor(h * 997), sink: farm ? 1 : 0 };
};
const ROCK_FOOT = 8;   // today's pixRock stands its foot 8 below the piece's y
const rockBake = (d) => {
  const r = rockSpec(d), key = `rock|${r.s}|${r.fam}|${r.seed}`;
  let b = BAKE.get(key);
  if (!b) { b = sculpt(() => K.rockMass(r.s, r.fam, r.seed), true); BAKE.set(key, b); }
  return b;
};
// a DECOR piece this realm's look redraws (decor-layout.js `own`: Gullwick's watchtower as the ruin)
const ownSpec = (d) => { const L = layout(); return (L && L.own && L.own[d.t]) || null; };
const ownBake = (d, o) => {
  const key = `own|${d.t}|${o.r}|${o.h}|${o.seed}`;
  let b = BAKE.get(key);
  if (!b) { b = sculpt(() => (o.k === "tower" ? K.oldTower(o.r, o.h, o.seed) : null), true); BAKE.set(key, b); }
  return b;
};
// one DECOR piece as decor.js draws it: [bake, foot x, foot y] (null: not ours)
const pieceOf = (d) => {
  if (d.t === "rock") return [rockBake(d), snap(d.x), snap(d.y + ROCK_FOOT + rockSpec(d).sink)];
  const o = ownSpec(d);
  return o ? [ownBake(d, o), snap(d.x), snap(d.y + (o.foot ?? 8))] : null;
};
export const ownsDecor = (d) => d.t === "rock" || !!ownSpec(d);
export const drawDecorPiece = (ctx, d) => {
  if (typeof document === "undefined") return;
  const q = pieceOf(d);
  if (q) blit(ctx, q[0], q[1], q[2]);
};
const spOf = (b) => ({ cv: b.cv, hw: b.ox / 2, top: b.oy / 2, bot: (b.cv.height - b.oy) / 2 });
export const decorShadowItem = (d) => {
  if (!DAY.on || typeof document === "undefined") return null;
  const q = pieceOf(d);
  return q ? { sp: spOf(q[0]), x: q[1], y: q[2], lift: 0, mirror: false, round: d.t === "rock" } : null;
};

// ---- the farm: shadows, ground marks, drawables ----
export const decorShadowExtras = () => {
  if (!DAY.on || typeof document === "undefined") return [];
  const out = [];
  for (const it of pieces()) if (it.shade) { const [x, y] = footOf(it); out.push({ sp: spOf(bakeOf(it)), x, y, lift: 0, mirror: false, round: it.round }); }
  return out;
};

const SOIL = ["#5a3e28", "#6e4c30", "#83603e"], LEAF = ["#4f8a2c", "#6aa83a", "#9ac850"];
const YARD = ["#8e8a44", "#a8885a", "#bc9c6c", "#8a6e46"];
// the dark earth line under every column whose lowest pixel stands on the ground (the concept's Scene2
// contact pass: "nothing floats"), and a rock's contact band; ctx in ART px of the board
const contact = (c, b, x, y) => {
  const bot = K.bottoms(b), X0 = Math.round(x * 2) - b.ox, Y0 = Math.round(y * 2) - b.oy, cx = DAY.on && DAY.fall[0] < 0 ? -1 : 1;
  for (let u = 0; u < bot.length; u++) {
    const v = bot[u]; if (v < 0) continue;
    const gv = b.foot ? b.foot(u) : b.oy;
    if (v < gv - 3 || v > gv + 3) continue;
    const X = X0 + u, Y = Y0 + v;
    c.fillStyle = "rgba(30,24,30,0.5)"; c.fillRect(X, Y + 1, 1, 1);
    c.fillStyle = "rgba(30,24,30,0.24)"; c.fillRect(X + cx, Y + 2, 1, 1);
    if (bot[u - 1] === undefined || bot[u - 1] < 0) c.fillRect(X - 1, Y + 1, 1, 1);
    if (bot[u + 1] === undefined || bot[u + 1] < 0) { c.fillStyle = "rgba(30,24,30,0.4)"; c.fillRect(X + 1, Y + 1, 1, 1); }
  }
  if (b.contact) {
    const n = Math.round(b.contact), xc = Math.round(x * 2), yc = Math.round(y * 2);
    for (let i = -n; i <= n; i++) { const e = 1 - Math.abs(i) / n; if (e < 0.08) continue; c.fillStyle = `rgba(36,30,40,${0.42 * Math.min(1, e * 2.5)})`; c.fillRect(xc + i, yc - 1, 1, e > 0.35 ? 3 : 2); }
  }
};
// BAKE: the ground layer (world units); everything laid in whole art pixels
export const decorGroundMarks = (ctx) => {
  if (typeof document === "undefined") return;
  ctx.save();
  ctx.scale(0.5, 0.5);
  ctx.imageSmoothingEnabled = false;
  const P = ([x, y]) => [Math.round(x * 2), Math.round(y * 2)];
  const L = layout();
  for (const m of L ? L.marks : []) {
    if (m.m === "worn") K.worn(ctx, ...P([m.x, m.y]), m.rx, m.ry, YARD, m.seed, m.k ?? 2);
    else if (m.m === "path") K.path(ctx, m.pts.map(P), m.w, YARD, m.seed);
    else if (m.m === "plot") K.plot(ctx, ...P([m.x, m.y]), m.w, m.h, SOIL, LEAF, m.seed);
  }
  // the stackyard's straw and trodden earth run round the farm's rock: a darker, wetter foot
  for (const d of DECOR) if (d.t === "rock" && inFarm(d)) K.worn(ctx, Math.round(d.x * 2), Math.round((d.y + ROCK_FOOT) * 2), 16, 5, ["#5e5236", "#6e5e3c", "#7a6a44", "#544a30"], 11, 1.2);
  for (const it of pieces()) if (!it.smoke) { const [x, y] = footOf(it); contact(ctx, bakeOf(it), x, y); }
  for (const d of DECOR) { const q = (d.t === "rock" || ownSpec(d)) && pieceOf(d); if (q) contact(ctx, q[0], q[1], q[2]); }
  ctx.restore();
};
// FRAME: the farm's standing things, sorted with the actors; its lanterns noted as lamps at night
export const decorDrawables = (list, ctx, g) => {
  if (typeof document === "undefined") return;
  const time = g.time, lit = windowsLit(time), placed = [];
  for (const it of pieces()) {
    const b = bakeOf(it, lit, frameOf(it, time)), [x, y] = footOf(it);
    list.push({ y: it.sort, fn: () => blit(ctx, b, x, y) });
    if (b.lamps.length) placed.push({ x, y, lamps: b.lamps });
  }
  noteFarmLamps(placed, time);
};
