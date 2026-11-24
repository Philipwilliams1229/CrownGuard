// Effects concepts, Round 20, row 1 (fireball20): fire in flight, in Dragonbreath's look. See art/briefs/fx-round20.md.
// Three shots fly across one cell at board size (1 art px = 1 px), on today's paths and speeds:
//   - the Pyromancer's fireball (fx.js drawOrb, element "fire"): 300 units/s from the staff to its foe, straight; the second one
//     each loop is the Inferno Throne's big firestorm orb (p.big). Its landing blast is the approved `fireboom`: not drawn here.
//   - the Comet Sling's burning stone (fx.js "rock" with p.burn; today it flies as a plain stone, no fire at all): 240 units/s on
//     today's arc (height min(64, total x 0.24)), tumbling (the game's own rockSprite under the new flames).
//   - the Fireship Wharf's fire pot (musketfx.js drawMusketShot with fire: true, splash 54): ~1900 units/s, in the air 36-110 ms,
//     so it is caught in only one or two frames, as in the game; its muzzle flash and landing burst are redrawn too (no smoke).
// The flame is ONE field per shot, worked out per pixel in the shot's own frame (s along the heading, n across it): a round head,
// a tail streaming back that may rise a little (fire climbs), ragged licks swept back against the flight (each pixel tests the
// profile at s + lean x |n|), Dragonbreath's mottled cells stretched along the motion and drifting back along the tail, a white-hot
// heart a little forward of the middle, a broken pale core down the tail, a 1-px tinted dark-red rim, the tail see-through in steps.
// Everything is a function of the shot's AGE (ms since launch) and heading, so it bakes per (kind, heading step, age step).
// The loop is LOOP ms in N frames of 50 ms (e.t); each shot's age repeats exactly, so the loop closes.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/fx.js")), ...(await import("/src/render/musketfx.js")), ...(await import("/src/render/paint.js")), ...(await import("/src/render/pix/proj-sprites.js")) } : {};

const LOOP = 700, N = 14;
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // Dragonbreath's tones
const INK = "#8a2028";                                                            // its tinted rim
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const P = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const PXu = () => G.PX || 2;

// ---- the cell (art px, anchor at the top left) ------------------------------------------------------------------------------
const CELL = { cw: 400, ch: 300, ax: 0, ay: 0, N };
// fireballs: 0.6 art px a ms (300 units/s), 350 ms a flight, launched at loop t 0 and 350 from the staff tip
const STAFF = [36, 84];
const BALLS = [
  { t0: 0, to: [36 + 210 * Math.cos(0.1), 84 + 210 * Math.sin(0.1)], big: false, id: 3 },
  { t0: 350, to: [36 + 210 * Math.cos(-0.16), 84 + 210 * Math.sin(-0.16)], big: true, id: 8 },
];
const BALL_MS = 350;
// the comet stone: from the arm's tip to its mark, one flight a loop (0.48 art px a ms = 240 units/s)
const STONE = { from: [26, 214], to: [362, 280] };
STONE.tot = Math.hypot(STONE.to[0] - STONE.from[0], STONE.to[1] - STONE.from[1]);           // art px
STONE.hMax = Math.min(64, (STONE.tot / 2) * 0.24) * 2;                                         // art px, today's arc
STONE.ms = (STONE.tot / 2) / 240 * 1000;                                                       // its flight, ms
const STONE_T0 = -20;
// the fire pot: a skiff's muzzle low on the left to a goblin on the right; two shots a loop, each caught in two frames
const MUZ = [18, 150], POT_TO = [372, 140];
const POTS = [{ t0: -10 }, { t0: 340 }];
const POT_D = Math.hypot(POT_TO[0] - MUZ[0], POT_TO[1] - MUZ[1]) / 2;                           // world units
const POT_FL = Math.max(36, Math.min(110, POT_D / 1.9)), POT_HIT = 170, FLASH_MS = 72;
const GOBS = [[BALLS[0].to[0], BALLS[0].to[1] + 2], [BALLS[1].to[0], BALLS[1].to[1] + 2], [POT_TO[0], POT_TO[1] + 4], [STONE.to[0], STONE.to[1] + 2], [240, 292]];

const ageOf = (t, t0, period = LOOP) => (((t - t0) % period) + period) % period;
const gobs = (c, e) => GOBS.forEach(([x, y], k) => { const s = e.foe(e.i + k * 3, ""); c.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay)); });
const shadow = (c, x, y, rx) => { const ry = rx * 0.45; for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) P(c, x + i, y + j, "#1a2410", 0.22); };

// ---- the flame field ----------------------------------------------------------------------------------------------------------
// o: x, y (the head's middle), ux, uy (heading), R (head radius), Lt (tail length behind the head's middle), pw (the tail's taper),
// wt (the tail's width at the head, x R), lean (how far the licks sweep back), rag (how ragged), bend (the tail rises: px per px^2),
// age (ms, drifts the cells back), vd (drift, px a ms), see (the far tail's alpha), heart (white-hot radius, x R), seed, skip (fn(s, n)
// true = leave the pixel out), aMul, glow (a dithered warm halo round the head), coreTail (how far down the tail the pale core runs)
const field = (c, o) => {
  const { x, y, ux, uy, R, Lt, pw = 1.2, wt = 0.85, lean = 0.7, rag = 0.5, bend = 0, age = 0, vd = 0.07, see = 0.55, heart = 0.5, seed = 1, aMul = 1 } = o;
  const q0 = age * vd;                                                // the cells drift back along the flame
  const prof = (s, side) => {                                        // the half-width at s on one side, licks and all
    let w = s > 0 ? R * Math.sqrt(Math.max(0, 1 - (s / (R * 1.05)) ** 2)) : Math.max(R * Math.sqrt(Math.max(0, 1 - (s / R) ** 2)), -s < Lt ? R * wt * Math.pow(1 - (-s) / Lt, pw) : 0);
    if (w <= 0) return 0;
    if (s < R * 0.4) {
      const k = Math.floor((s + q0) / 2.5), h1 = H(k, seed * 7 + side * 3), h2 = H(Math.floor((s + q0) / 6), seed * 5 + side * 11 + 40);
      w *= 1 - rag * 0.45 + rag * (0.7 * h1 * h1 * h1 + 0.45 * h2);
    }
    return w;
  };
  const ext = Math.max(R, Lt) + R + 3, x0 = Math.floor(x - ext), x1 = Math.ceil(x + ext), y0 = Math.floor(y - ext - (bend > 0 ? bend * Lt * Lt : 0)), y1 = Math.ceil(y + ext);
  const inside = (px, py) => {
    const dx = px + 0.5 - x, dy0 = py + 0.5 - y, s = dx * ux + dy0 * uy;
    const dy = s < 0 ? dy0 + bend * s * s : dy0, n = -dx * uy + dy * ux, side = n >= 0 ? 1 : 0, an = Math.abs(n);
    const sp = s + lean * an * cl(-s / R + 0.15), w = prof(sp, side);   // licks sweep back behind the head; the head's front stays round
    if (an >= w || (o.skip && o.skip(s, n))) return null;
    return { s, n, an, w, sp };
  };
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const f = inside(px, py);
    if (!f) {
      if (o.glow) {                                                  // a faint warm halo round the head only
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
        if (d < R + o.glow && d > R * 0.6 && bay(px, py) < 0.34 * (1 - (d - R) / o.glow)) P(c, px, py, d < R + 2 ? FIRE[2] : FIRE[3], 0.4 * aMul);
      }
      continue;
    }
    if (o.thin && H(px * 0.37 + py * 1.71, 91 + Math.floor(o.age / 50)) < o.thin) continue;              // breaking up as it dies (dropped pixels, not a muddy alpha)
    const { s, n, an, w } = f, tn = an / Math.max(0.8, w), u = s < 0 ? cl(-s / Lt) : 0;
    const qa = s + q0, m1 = H(Math.floor(qa / 5) + 300, Math.floor((n + 40) / 2) + seed * 13), m2 = H(Math.floor(qa / 9) + 500, Math.floor((n + 40) / 3.5) + seed * 17), m = m1 * 0.6 + m2 * 0.4;
    const dh = Math.hypot(s - R * 0.2, n * 1.15) / (R * heart);
    let heat = (1 - Math.pow(tn, 1.3)) * (1 - 0.7 * u) * 0.85 + (m - 0.5) * 0.8 + (dh < 1 ? 0.35 * (1 - dh) : 0);
    let col = heat > 0.98 ? FIRE[0] : heat > 0.76 ? FIRE[1] : heat > 0.5 ? FIRE[2] : heat > 0.26 ? FIRE[3] : FIRE[4];
    if (dh < 0.5) col = dh < 0.3 || bay(px, py) < 0.5 ? FIRE[0] : FIRE[1];                 // the white-hot heart
    else if (an < 1 && s < 0 && u < (o.coreTail ?? 0.5) && m > 0.48) col = m > 0.7 && u < 0.25 ? FIRE[0] : FIRE[1];   // the broken pale core
    const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
    if (edge) col = u > 0.6 ? FIRE[4] : bay(px, py) < 0.7 ? INK : FIRE[4];
    else if (tn > 0.86 && bay(px, py) < 0.3) col = FIRE[4];
    let a = u < 0.35 ? 1 : u < 0.58 ? 0.85 : u < 0.8 ? 0.7 : see;                            // see-through in steps down the tail
    if (u > 0.72 && bay(px, py) < (u - 0.72) * 2.2) continue;                                  // and breaking up at its end
    if (edge && u < 0.6) a = Math.max(a, 0.9);
    P(c, px, py, col, a * aMul);
  }
};

// ---- sparks shed along a path: born at the shot, then lifting and drifting back, fading in steps ----------------------------
const sparks = (c, posAt, age, o) => {
  const { n = 14, life0 = 140, life1 = 300, every = 22, seed = 1, spread = 3 } = o;
  for (let k = 0; k < n; k++) {
    const born = k * every + H(k, seed) * every; if (born > age) break;
    const sa = age - born, life = life0 + (life1 - life0) * H(k, seed + 2);
    if (sa > life) continue;
    const [bx, by, ux, uy] = posAt(born), u = sa / life;
    const j = (H(k, seed + 3) - 0.5) * 2 * spread;
    const x = bx - ux * (4 + sa * 0.02) - uy * j + Math.sin(sa * 0.02 + k) * 1.2, y = by - uy * (4 + sa * 0.02) + ux * j - sa * (0.035 + 0.03 * H(k, seed + 4));
    P(c, x, y, u < 0.3 ? FIRE[0] : u < 0.55 ? FIRE[1] : u < 0.8 ? FIRE[2] : FIRE[3], u < 0.8 ? 1 : 0.7);
    if (u < 0.5 && H(k, seed + 5) > 0.35) P(c, x + ux, y + uy + 1, u < 0.25 ? FIRE[2] : FIRE[3], 0.8);          // a short streak on the young ones
  }
};

// ---- each shot's position over its life ---------------------------------------------------------------------------------------
const ballAt = (b, age) => { const [tx, ty] = b.to, dx = tx - STAFF[0], dy = ty - STAFF[1], d = Math.hypot(dx, dy), k = cl(age / BALL_MS); return [STAFF[0] + dx * k, STAFF[1] + dy * k, dx / d, dy / d]; };
const stoneAt = (age) => {
  const k = cl(age / STONE.ms), [sx, sy] = STONE.from, [tx, ty] = STONE.to, h = Math.sin(k * Math.PI) * STONE.hMax;
  const vx = tx - sx, vy = ty - sy - Math.PI * Math.cos(k * Math.PI) * STONE.hMax, vl = Math.hypot(vx, vy);
  return [sx + (tx - sx) * k, sy + (ty - sy) * k - h, vx / vl, vy / vl, sx + (tx - sx) * k, sy + (ty - sy) * k, k];
};
const potAt = (age) => { const dx = POT_TO[0] - MUZ[0], dy = POT_TO[1] - MUZ[1], d = Math.hypot(dx, dy), k = cl(age / POT_FL); return [MUZ[0] + dx * k, MUZ[1] + dy * k, dx / d, dy / d]; };

// ---- TODAY: the game's own painters, in world units -----------------------------------------------------------------------------
const today = (c, e) => {
  const t = e.t * LOOP, U = PXu();
  gobs(c, e);
  c.save(); c.scale(U, U);
  // the comet stone (a plain tumbling rock today: fx.js draws no fire on a stone)
  const sa = ageOf(t, STONE_T0);
  if (sa < STONE.ms) {
    const k = sa / STONE.ms, [sx, sy] = STONE.from, [tx, ty] = STONE.to;
    const p = { kind: "rock", id: 4, sx: sx / U, sy: sy / U, tx: tx / U, ty: ty / U, x: (sx + (tx - sx) * k) / U, y: (sy + (ty - sy) * k) / U, total: STONE.tot / U, burn: 9 };
    G.drawProjectile(c, p, t / 1000);
  }
  for (const b of BALLS) {
    const age = ageOf(t, b.t0); if (age >= BALL_MS) continue;
    const [x, y] = ballAt(b, age);
    G.drawProjectile(c, { kind: "orb", id: b.id, burn: 8, big: b.big, poolDps: b.big ? 24 : 0, x: x / U, y: y / U, tx: b.to[0] / U, ty: b.to[1] / U }, (t + b.id * 37) / 1000);
  }
  for (const s of POTS) {
    const age = ageOf(t, s.t0);
    if (age < 900) G.drawMusketShot(c, { type: "musket", x: MUZ[0] / U, y: MUZ[1] / U, tx: POT_TO[0] / U, ty: POT_TO[1] / U, ttl: 900 - age, life: 900, fire: true, splash: 54 });
  }
  c.restore();
};

// ---- the new look ----------------------------------------------------------------------------------------------------------------
// o.ball / o.stone / o.pot: field options per shot; o.sparks: shed sparks (C)
const scene = (o) => (c, e) => {
  const t = e.t * LOOP;
  gobs(c, e);
  // the comet stone: its shadow on the ground, the flame wrapped round it streaming back, the tumbling stone, pitch burning on its back
  const sa = ageOf(t, STONE_T0);
  if (sa < STONE.ms) {
    const [x, y, ux, uy, gx, gy, k] = stoneAt(sa), h = Math.sin(k * Math.PI) * STONE.hMax;
    shadow(c, gx + 1, gy + 1, 7.8 * (1.3 - 0.4 * h / STONE.hMax));
    if (o.sparks) sparks(c, (b) => stoneAt(b), sa, { n: 30, every: 22, life0: 160, life1: 340, seed: 21, spread: 5 });
    const Lt = Math.min(o.stone.Lt, 8 + sa * 0.48);
    field(c, { x: x - ux * 1.5, y: y - uy * 1.5, ux, uy, R: 9.5, heart: 0.42, glow: 3, age: sa, seed: 4, ...o.stone, Lt });
    const rs = G.rockSprite("rock", Math.floor(k * 12 + 4) & 3);
    c.drawImage(rs.cv, Math.round(x - rs.ax), Math.round(y - rs.ay));
    field(c, { x, y, ux, uy, R: 7.5, Lt: 10, wt: 1, lean: 0.4, rag: 0.8, age: sa, seed: 9, heart: 0, aMul: 0.9, coreTail: 0, skip: (s, n) => s > -1 || H(Math.floor(s + sa * 0.05), Math.floor(n / 2) + 70) < 0.45 });
  }
  // the fireballs (the second, bigger, is the Inferno Throne's firestorm)
  for (const b of BALLS) {
    const age = ageOf(t, b.t0); if (age >= BALL_MS) continue;
    const [x, y, ux, uy] = ballAt(b, age), R = b.big ? 10 : 7, Lt = Math.min(o.ball.Lt * R, 4 + age * 0.6);
    if (o.sparks) sparks(c, (bn) => ballAt(b, bn), age, { n: 26, every: 13, seed: b.id, spread: R * 0.6 });
    field(c, { x, y, ux, uy, R, glow: b.big ? 4 : 3, age, seed: b.id, ...o.ball, Lt });
  }
  // the fire pot: a white-hot shot with a streak of flame, the flash at the muzzle, a burst of flame where it lands
  for (const s of POTS) {
    const age = ageOf(t, s.t0), [, , ux, uy] = potAt(0);
    if (age < FLASH_MS) {
      const f = age / FLASH_MS;
      field(c, { x: MUZ[0] + ux * 2, y: MUZ[1] + uy * 2, ux: -ux, uy: -uy, R: 4 - 1.5 * f, Lt: 14 - 6 * f, pw: 1.5, wt: 0.9, lean: 0.5, rag: 0.7, age: age * 3, seed: 30, heart: 0.8, coreTail: 0.7 });
    }
    if (age < POT_FL) {
      const [x, y] = potAt(age), flown = Math.hypot(x - MUZ[0], y - MUZ[1]);
      if (o.sparks) sparks(c, (bn) => potAt(bn), age, { n: 12, every: 7, life0: 90, life1: 200, seed: 33, spread: 2 });
      field(c, { x, y, ux, uy, R: 3, wt: 0.9, lean: 0.6, rag: 0.55, heart: 0.9, age: age * 4, seed: 31, coreTail: 0.8, ...o.pot, Lt: Math.min(o.pot.Lt, flown) });
    } else if (age < POT_FL + POT_HIT) {
      const f = (age - POT_FL) / POT_HIT, gx = POT_TO[0], gy = POT_TO[1] + 3;
      // a burst of flame climbing off the mark: a mottled bloom that grows, rises, thins see-through and breaks up; embers thrown out
      field(c, { x: gx, y: gy - 2 - 9 * f, ux: 0, uy: 1, R: (4 + 6 * Math.sqrt(f)) * (f < 0.6 ? 1 : 1 - (f - 0.6) * 1.2), Lt: 8 + 14 * f, pw: 0.9, wt: 0.95, lean: 0.9, rag: 0.8, age: age * 2, seed: 35, heart: 0.6 * (1 - f), coreTail: 0.4, see: 0.45, thin: f < 0.45 ? 0 : f < 0.7 ? 0.25 : 0.5 });
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI * (0.1 + 0.8 * H(k, 36)), d = 6 + f * (14 + 10 * H(k, 37));
        P(c, gx + Math.cos(a) * d * 1.3, gy + Math.sin(a) * d * 0.8 + f * f * 10, f < 0.4 ? FIRE[1] : f < 0.75 ? FIRE[2] : FIRE[3]);
      }
    }
  }
  // the pot shots from the muzzle still in the next frames (age past the loop's end) are covered by the second shot's t0
};

// A: a mottled fireball, white-hot heart, a short flame tail streaming back
const OPT_A = { ball: { Lt: 3.2, pw: 0.95, wt: 0.85, lean: 0.75, rag: 0.6 }, stone: { Lt: 22, pw: 1.1, lean: 0.7, rag: 0.55 }, pot: { Lt: 18, pw: 1.3 } };
// B: a long comet tail, needle at the back to the head (Dragonbreath reversed), rising a little and thinning see-through
const OPT_B = { ball: { Lt: 7, pw: 1.45, wt: 0.92, lean: 0.85, rag: 0.45, bend: 0.0025, see: 0.45, coreTail: 0.7 }, stone: { Lt: 60, pw: 1.45, wt: 0.92, lean: 0.85, rag: 0.45, bend: 0.0018, see: 0.45, coreTail: 0.7 }, pot: { Lt: 40, pw: 1.6, see: 0.45, coreTail: 0.9 } };
// C: A, shedding sparks along its path that lift and fade
const OPT_C = { ...OPT_A, sparks: true };

export const ROWS = [
  { id: "fireball20", label: "Fire in flight: fireball, comet stone, fire pot", group: "Round 20",
    note: "Three shots flying across at board size, at the game's real speeds: on top the Pyromancer's fireball (the second, bigger one is the Inferno Throne's firestorm), in the middle the Fireship's fire pot (it is so fast it shows in only one or two frames, as in the game), along the bottom the Comet Sling's stone (today it flies as a plain stone with no fire at all). The fireball still flies all the way to its foe; its blast on landing is the one you approved and is not shown. A: each shot a mottled fireball with a white-hot heart and a short tail of flame streaming back; the stone wrapped in it, pitch burning on its back. B: a long comet tail, thin at the back and fat at the head (Dragonbreath turned round), rising a little and thinning see-through. C: A, shedding sparks along the way that lift and fade.",
    ...CELL, today, A: scene(OPT_A), B: scene(OPT_B), C: scene(OPT_C) },
];
