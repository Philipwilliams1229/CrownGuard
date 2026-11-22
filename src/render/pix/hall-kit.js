// ============ HALL KIT: buildings in the pixel sculptor (CONCEPT, 2026-11-13) ============
// The tower BUILDINGS drawn the way the new figures are (pix.js): every part
// writes material, depth and a normal; one resolve shades each material on its
// five-tone hue-shifted ramp under ONE sun from the upper left and inks a
// one-pixel line in the material's own dark. On top of that a building needs
// things a figure does not, and they live here:
//   - round masonry in the board's 3/4 camera (a drum: courses sag toward the
//     viewer, stones narrow toward the silhouette), with the STONEWORK as tone,
//     never as ink: a stone a tone up or down, broken mortar, a bevel
//   - real cast shadows (the parapet's overhang on the shaft, the back wall on
//     the deck), a core shadow with a little bounce light at the far edge
//   - an open-topped parapet split in two pictures, BACK (behind the crew) and
//     FRONT (over their shins), so the crew is never roofed in
//   - timber, wheels, banners, windows that glow, doors, ivy
//   - LIVE pieces as small baked frames (a pennant's ripple, a torch's flame)
//     and light as overlays (Pix.lightLayer): a torch or a spell on the stone
//     is one more stamp, exactly as it is on the figures
// Nothing in the game reads this yet: it draws the concept sheet
// (hall-concepts.html, concept/halls.js) and `node scripts/hall-render.mjs`.
// Coordinates: art pixels (two to a board unit) from the hall's base centre, y down.
import { Pix, mat, flat } from "./pix.js";

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const hash = (a, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const frac = (v) => v - Math.floor(v);

// The three treatments on the sheet. A: today's design, clean line and light
// only. B: A plus worked materials (stone by stone, bevels, weathering, lit
// windows, deeper shadow). C: B on bolder shapes (each hall decides what that means).
export const STYLES = {
  A: { key: "A", stones: 1, bevel: false, wear: 0, shade: 1, lit: false, moss: 0, bold: false },
  B: { key: "B", stones: 2, bevel: true, wear: 1, shade: 2, lit: true, moss: 1, bold: false },
  C: { key: "C", stones: 2, bevel: true, wear: 1, shade: 2, lit: true, moss: 1, bold: true },
};

export const newPix = (box) => new Pix(box.w, box.h, box.ox, box.oy);
// one pixel, straight into the buffers (x, y in art px from the anchor)
const put = (px, x, y, m, z, nx, ny, nz, o) => px._put(Math.floor(x + px.ox), Math.floor(y + px.oy), m, z, nx, ny, nz, o);
const unit = (nx, ny) => { nx = clamp(nx, -0.98, 0.98); return [nx, ny, Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny))]; };

// ---- round masonry -------------------------------------------------------------
// A drum: a round shaft standing on the ground, seen from the south and above.
//   top / bot   the height (y) of its top and bottom rings' centres
//   r / r2      radius at the top / bottom (r2 > r: a battered foot)
//   sq          how much a circle is squashed by the camera (ry = r * sq)
//   st          a STYLES entry (how much stonework to show)
//   under       (x) => y of an overhang's lower edge above this wall: its shadow falls here
//   skip        (u, h) => true to leave a pixel out (a corbel table's gaps)
//   mTrim       a second material for string courses, `strings`: [h, thick] rows
export const drum = (px, o) => {
  const { cx = 0, top, bot, r, r2 = r, sq = 0.3, m, z = 0, st = STYLES.A, seed = 1, course = 6, stoneW = 0.44, skew = 0.2, tilt = -0.04 } = o;
  px.part();
  const R = Math.max(r, r2), rad = (h) => r + (r2 - r) * clamp((h - top) / (bot - top || 1), 0, 1);
  const map = (x, y) => {
    let rr = rad(y), u = 0, h = 0;
    for (let it = 0; it < 3; it++) { u = x / rr; if (Math.abs(u) >= 1) return null; h = y - rr * sq * Math.sqrt(1 - u * u); rr = rad(h); }
    u = x / rr; if (Math.abs(u) >= 1 || h < top || h > bot) return null;
    return { u, h };
  };
  const strings = o.strings || [];
  // every pixel's place on the wall, worked out once: u (-1 west edge .. 1 east), h (height), its course and stone
  const i0 = -Math.ceil(R) - 2, j0 = Math.floor(top) - 2, gw = Math.ceil(R) * 2 + 5, gh = Math.ceil(bot + R * sq) + 3 - j0;
  const U = new Float32Array(gw * gh).fill(9), Hh = new Float32Array(gw * gh), C = new Int16Array(gw * gh), K = new Int16Array(gw * gh);
  for (let gj = 0; gj < gh; gj++) for (let gi = 0; gi < gw; gi++) {
    const q = map(gi + i0 + 0.5, gj + j0 + 0.5); if (!q) continue;
    const g = gj * gw + gi, c = Math.floor((q.h - top) / course);
    U[g] = q.u; Hh[g] = q.h; C[g] = c; K[g] = Math.floor(Math.asin(q.u) / stoneW + (c & 1) * 0.5 + hash(c, seed) * 0.35);
  }
  for (let gj = 1; gj < gh - 1; gj++) for (let gi = 1; gi < gw - 1; gi++) {
    const g = gj * gw + gi; if (U[g] > 1) continue;
    const x = gi + i0 + 0.5, y = gj + j0 + 0.5, q = { u: U[g], h: Hh[g] }, c = C[g], k = K[g];
    if (o.skip && o.skip(q.u, q.h, x, y)) continue;
    const ok = (d) => U[g + d] <= 1, side = Math.abs(q.u) < 0.9;
    const eB = ok(gw) && C[g + gw] !== c, eT = ok(-gw) && C[g - gw] !== c;
    const eR = side && ok(1) && K[g + 1] !== k, eL = side && ok(-1) && K[g - 1] !== k;
    const hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
    let bias = 0, mm = m;
    const sc = strings.find((s) => q.h >= s[0] && q.h < s[0] + s[1]);
    if (sc) { mm = sc[2] ?? o.mTrim ?? m; bias += q.h < sc[0] + 1 ? 1 : 0; }
    else if (strings.some((s) => q.h >= s[0] + s[1] && q.h < s[0] + s[1] + 1.2)) bias -= 1;   // the moulding's own shadow
    else if (o.boards) { if (frac(Math.asin(q.u) / o.boards) < 0.16 && Math.abs(q.u) < 0.93) bias -= 1; else if (hash(Math.floor(Math.asin(q.u) / o.boards), seed) > 0.75 && q.u < 0.3) bias += 1; }
    else if (st.stones === 2) {
      if (hv < 0.15) bias -= 1; else if (hv > 0.8) bias += 1;
      if ((eB || eR) && hm < 0.72) bias -= 1;
      else if (st.bevel && (eT || eL) && hv > 0.5 && q.u < 0.25) bias += 1;
      if (q.u > 0.42) bias = clamp(bias, -1, 0);            // the shadow side stays quiet
      if (q.u < -0.55) bias = clamp(bias, 0, 1);            // and the brightest strip is never cut up
    } else if (st.stones === 1) {
      // clean: about one stone in four shows its lower right corner, nothing else
      if (hv < 0.27 && q.u < 0.5 && q.u > -0.8 && (eB || eR)) bias -= 1;
    }
    if (o.under) {                                                           // the overhang's shadow, longer away from the sun
      const d = y - o.under(x), len = (o.underLen ?? 5) + Math.max(0, q.u) * 4;
      if (d < len) bias -= 1;
      if (st.shade === 2 && d < 2.2) bias -= 1;
    }
    if (q.u > 0.84) bias += 1;                                               // bounce light off the ground on the far edge
    if (q.h > bot - 1.6) bias -= 1;                                          // it sits IN the ground
    if (st.wear && o.stain) { const s = o.stain(x, q.h); if (s) bias += s; }
    const [nx, ny, nz] = unit(q.u * 0.92 + skew, tilt);
    put(px, cx + x, y, mm, z, nx, ny, nz, { bias, cast: o.cast ?? 1 });
  }
  return px;
};

// A flat round top seen from above (a deck, a plinth's top, a lid).
//   lip   the height of a wall standing on its back rim: its shadow lies on the deck
export const disc = (px, o) => {
  const { cx = 0, y, r, sq = 0.3, m, z = 0, lip = 0, planks = 0 } = o, ry = r * sq;
  px.part();
  for (let j = Math.floor(y - ry) - 1; j <= Math.ceil(y + ry) + 1; j++) for (let i = -Math.ceil(r) - 1; i <= Math.ceil(r) + 1; i++) {
    const x = i + 0.5, yy = j + 0.5 - y;
    if ((x / r) ** 2 + (yy / ry) ** 2 >= 1) continue;
    let bias = 0;
    const d = lip * 0.75;
    if (lip && ((x - d) / r) ** 2 + ((yy - d * 0.55) / ry) ** 2 >= 1) bias -= 1;        // the back wall's shadow
    if (planks && Math.floor(x + 400) % planks === 0) bias -= 1;
    put(px, cx + x, j + 0.5, m, z, 0, -0.8, 0.6, { bias, vb: o.vb ?? 0 });
  }
  return px;
};

// An open-topped parapet round a deck, in two pictures: the far half's inner
// face into `back` (the crew stands in front of it), the near half's outer face
// into `front` (drawn over the crew's shins). The near half's lower `band`
// overhangs the shaft on a corbel table; a string course runs at deck height.
//   deck   the deck's centre height; wall: the wall's height above it; band: its depth below
//   mer    { n, duty, h, ph }: merlons round the whole ring (n), the share of each
//          step that is merlon, their height, and a turn of the pattern
export const parapet = (back, front, o) => {
  const { cx = 0, deck, r, sq = 0.3, wall = 6, band = 8, m, mTrim = m, z = 10, st = STYLES.A, seed = 3, skew = 0.2, corbels = true } = o;
  const mer = { n: 12, duty: 0.56, h: 7, ph: 0.22, ...(o.mer || {}) }, ry = r * sq, step = (Math.PI * 2) / mer.n;
  const isMer = (a) => frac(a / step + mer.ph) < mer.duty;
  const merEdge = (a) => { const f = frac(a / step + mer.ph) / mer.duty; return f < 0.12 ? -1 : f > 0.86 ? 1 : 0; };
  // the far half, seen from inside
  if (back) {
    back.part();
    for (let j = Math.floor(deck - wall - mer.h - ry) - 1; j <= Math.ceil(deck); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
      const x = i + 0.5, y = j + 0.5, u = x / r;
      if (Math.abs(u) >= 1) continue;
      const s = Math.sqrt(1 - u * u), h = y + ry * s, a = Math.PI - Math.asin(u), M = isMer(a), topH = deck - wall - (M || o.rail ? mer.h : 0);
      if (h < topH || h > deck) continue;
      if (o.rail && !M && h >= topH + 2 && h < deck - wall) continue;                     // open between the posts, under the top rail
      let bias = -1, ny = 0;
      if (h < topH + 1.5) { ny = -0.85; bias = 0; }                                       // the wall's top, in the sun
      else if (M) bias -= merEdge(a) < 0 ? 0 : merEdge(a) > 0 ? 1 : 0;
      const [nx, nyy, nz] = unit(-u * 0.8 + skew, ny);
      put(back, cx + x, y, m, z - 9, nx, nyy, nz, { bias, cast: 1 });
    }
  }
  // the near half, seen from outside
  front.part();
  const cStep = step / 2;
  for (let j = Math.floor(deck - wall - mer.h) - 1; j <= Math.ceil(deck + band + ry) + 1; j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
    const x = i + 0.5, y = j + 0.5, u = x / r;
    if (Math.abs(u) >= 1) continue;
    const s = Math.sqrt(1 - u * u), h = y - ry * s, a = Math.asin(u), M = isMer(a), topH = deck - wall - (M || o.rail ? mer.h : 0);
    if (h < topH || h > deck + band) continue;
    if (o.rail && !M && h >= topH + 2 && h < deck - wall) continue;
    let bias = 0, ny = -0.04, mm = m;
    if (h < topH + 1.6) { ny = -0.85; }                                                   // tops catch the sun
    else if (h < deck - wall && M) { const e = merEdge(a); bias += e < 0 ? 1 : e > 0 ? -1 : 0; }
    else if (h >= deck - 1 && h < deck + 1.4) { mm = mTrim; bias += h < deck ? 1 : 0; }   // the string course
    else if (h >= deck + 1.4 && h < deck + 2.6) bias -= 1;                                // and its shadow
    else if (corbels && h > deck + band - 3.4) {                                          // the corbel table: every other step is a gap
      const f = frac(a / cStep + 0.25);
      if (f > 0.55 && h > deck + band - 2.6) continue;
      if (f > 0.55) bias -= 1; else if (f < 0.14) bias += 1;
    } else if (o.boards) { if (frac(a / o.boards) < 0.16 && Math.abs(u) < 0.93) bias -= 1; }   // upright boards
    else if (st.stones === 2) {
      const c = Math.floor((h - deck) / 5), k = Math.floor(a / 0.5 + (c & 1) * 0.5), hv = hash(c, k, seed);
      if (hv < 0.2 && u < 0.4) bias -= 1; else if (hv > 0.8 && u < 0.3) bias += 1;
    }
    if (u > 0.86) bias += 1;
    const [nx, nyy, nz] = unit(u * 0.92 + skew, ny);
    put(front, cx + x, y, mm, z, nx, nyy, nz, { bias, cast: 1 });
  }
};
// the lower edge of a parapet's band, for the shaft's `under`
export const bandEdge = (o) => (x) => { const u = clamp(x / o.r, -1, 1); return o.deck + (o.band ?? 8) + o.r * (o.sq ?? 0.3) * Math.sqrt(1 - u * u); };

// A cone (a turret's cap, a spire): base ring centred (cx, y), radius r, apex h above.
export const cone = (px, o) => {
  const { cx = 0, y, r, h, sq = 0.3, m, z = 0, st = STYLES.A, rows = 4, seed = 2, skew = 0.2 } = o, ry = r * sq;
  px.part();
  for (let j = Math.floor(y - h) - 1; j <= Math.ceil(y + ry) + 1; j++) for (let i = -Math.ceil(r) - 1; i <= Math.ceil(r) + 1; i++) {
    const x = i + 0.5, yy = j + 0.5;
    // the cone's outline: straight sides from the apex to the base ring, closed by the ring's near arc
    let t = (yy - (y - h)) / h;                                    // 0 at the apex .. 1 at the ring's centre height
    if (t < 0) continue;
    let u, v;
    if (t <= 1) { u = x / (r * Math.max(t, 0.02)); if (Math.abs(u) >= 1) continue; v = t; }
    else { u = x / r; if (Math.abs(u) >= 1 || yy - y > ry * Math.sqrt(1 - u * u)) continue; v = 1; }
    const vv = clamp(v + (yy > y ? 0 : 0) , 0, 1), row = Math.floor(vv * rows + 0.001), a = Math.asin(clamp(u, -1, 1));
    let bias = 0;
    if (st.stones === 2) {
      const k = Math.floor(a / 0.5 + (row & 1) * 0.5), fr = frac(vv * rows);
      if (fr > 0.82 && row < rows) bias -= 1;                                              // each course of slates laps the next
      else if (hash(row, k, seed) > 0.78 && u < 0.2) bias += 1;
    } else if (frac(vv * rows) > 0.84 && row < rows && Math.abs(u) < 0.7) bias -= 1;
    if (u > 0.86) bias += 1;
    const [nx, ny, nz] = unit(u * 0.9 + skew, -0.3);
    put(px, cx + x, yy, m, z, nx, ny, nz, { bias });
  }
  return px;
};

// ---- timber and iron -----------------------------------------------------------
// A beam from a to b, `w` wide: one flat face with a sunlit upper edge, a dark
// lower edge and (B) a line of grain. o.n: the face's normal; o.grain false: none.
export const beam = (px, ax, ay, bx, by, w, m, z, o = {}) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px_ = -uy, py_ = ux, hw = w / 2;
  if (!o.same) px.part();
  const n = o.n || [0, -0.12, 0.99], x0 = Math.floor(Math.min(ax, bx) - hw) - 1, x1 = Math.ceil(Math.max(ax, bx) + hw) + 1, y0 = Math.floor(Math.min(ay, by) - hw) - 1, y1 = Math.ceil(Math.max(ay, by) + hw) + 1;
  // which side of the beam is "up" on screen (takes the light)
  const upSign = py_ < 0 || (py_ === 0 && px_ < 0) ? 1 : -1;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const x = i + 0.5 - ax, y = j + 0.5 - ay, t = x * ux + y * uy, d = x * px_ + y * py_;
    if (t < 0 || t > L || Math.abs(d) > hw) continue;
    const e = d * upSign;                                         // + toward the lit edge
    let bias = o.bias || 0;
    if (w >= 3) { if (e > hw - 1.05) bias += 1; else if (e < -hw + 1.05) bias -= 1; }
    if (o.grain !== false && w >= 4 && Math.abs(e) < 0.5 && hash(Math.floor(t / 3), o.seed || 1) < 0.5) bias -= 1;
    if (o.bands) for (const bt of o.bands) if (Math.abs(t - bt * L) < 1) { put(px, i + 0.5, j + 0.5, o.bandM, z + 0.05, n[0], n[1], n[2], { bias: e > hw - 1.05 ? 1 : 0, cast: 0 }); bias = 99; }
    if (bias === 99) continue;
    put(px, i + 0.5, j + 0.5, m, z, n[0], n[1], n[2], { bias, cast: o.cast ?? 1, floor: o.floor || 0 });
  }
  return px;
};

// A spoked cart wheel facing the viewer (squashed a little by the camera): felloe, iron tyre, hub.
export const wheel = (px, cx, cy, r, m, mIron, z, o = {}) => {
  const sq = o.sq ?? 0.92, turn = o.turn || 0, spokes = o.spokes || 8;
  px.part();
  for (let j = Math.floor(cy - r) - 1; j <= Math.ceil(cy + r) + 1; j++) for (let i = Math.floor(cx - r) - 1; i <= Math.ceil(cx + r) + 1; i++) {
    const x = (i + 0.5 - cx) / sq, y = j + 0.5 - cy, d = Math.hypot(x, y);
    if (d > r) continue;
    const a = Math.atan2(y, x) + turn, sp = Math.abs(frac((a / (Math.PI * 2)) * spokes + 0.5) - 0.5) * ((Math.PI * 2) / spokes) * d;
    let mm = -1, bias = 0;
    if (d > r - 1.3) { mm = mIron; bias = y < -r * 0.3 && x < r * 0.3 ? 1 : 0; }
    else if (d > r - 3.2) { mm = m; bias = y > r * 0.35 ? -1 : 0; }
    else if (d < 2.3) { mm = mIron; bias = d < 1.1 ? 1 : 0; }
    else if (sp < 0.72) { mm = m; bias = 1; }
    if (mm < 0) continue;
    const [nx, ny, nz] = unit((x / r) * 0.7, (y / r) * 0.7);
    put(px, i + 0.5, j + 0.5, mm, z, nx, ny, nz, { bias, cast: 1 });
  }
  return px;
};

// ---- openings ------------------------------------------------------------------
const DARK = flat("#2a2030"), GLASS = flat("#3a3348");
export const WARM = flat("#ffd070", { emis: true }), WARM2 = flat("#f8a040", { emis: true });
// An arched opening: a stone surround a tone up, a dark reveal up and to the left
// (the wall's thickness, in shadow), and inside it darkness or (lit) lamplight.
//   glow: a flat emissive material for the light inside; false: dark glass
export const archWindow = (px, x, y, w, h, mStone, z, o = {}) => {
  px.part();
  const hw = w / 2, arch = (xx, yy, k) => { const r = hw + k; return Math.abs(xx) <= r && yy <= h + (k > 0 ? 1.5 : 0) && (yy >= r || xx * xx + (yy - r) * (yy - r) <= r * r); };
  for (let j = -2; j <= h + 2; j++) for (let i = -Math.ceil(hw) - 2; i <= Math.ceil(hw) + 2; i++) {
    const xx = i + 0.5, yy = j + 0.5;
    if (arch(xx, yy, 0)) {
      const reveal = !arch(xx - 1, yy - 1, 0) || (o.deep && !arch(xx - 2, yy - 2, 0));
      const bar = o.bars && (Math.abs(xx) < 0.5 || Math.abs(yy - h * 0.55) < 0.5);
      put(px, x + xx, y + yy, reveal || bar || !o.glow ? (reveal || !o.glass ? DARK : GLASS) : o.glow, z + 0.2, 0, 0, 1, { cast: 0, noLine: false });
    } else if (o.frame !== false && arch(xx, yy, 1.2)) {
      const sill = yy > h, east = xx > hw;
      put(px, x + xx, y + yy, mStone, z + 0.1, sill ? 0 : -0.2, sill ? -0.8 : 0, sill ? 0.6 : 0.97, { bias: sill ? 0 : east ? -1 : 0, cast: 0 });
    }
  }
  return px;
};
// an arrow loop: a tall dark slit with a lit jamb
export const loop = (px, x, y, h, mStone, z) => {
  px.part();
  for (let j = 0; j < h; j++) { put(px, x + 0.5, y + j + 0.5, DARK, z + 0.2, 0, 0, 1, { cast: 0 }); put(px, x + 1.5, y + j + 0.5, DARK, z + 0.2, 0, 0, 1, { cast: 0 }); put(px, x + 2.5, y + j + 0.5, mStone, z + 0.1, -0.5, 0, 0.8, { bias: 1, cast: 0 }); }
  for (let i = -1; i <= 3; i++) put(px, x + i + 0.5, y + h + 0.5, mStone, z + 0.1, 0, -0.6, 0.7, { bias: 1, cast: 0 });
  return px;
};
// An oak door in a stone arch: planks, two iron straps, a ring; a step in front.
export const door = (px, x, y, w, h, mStone, mOak, mIron, z, o = {}) => {
  px.part();
  const hw = w / 2, inA = (xx, yy, k) => { const r = hw + k; return Math.abs(xx) <= r && yy >= -h - k && yy <= 0 && (yy >= -h - k + r || xx * xx + (yy + h + k - r) ** 2 <= r * r); };
  for (let j = -h - 3; j <= 0; j++) for (let i = -Math.ceil(hw) - 3; i <= Math.ceil(hw) + 3; i++) {
    const xx = i + 0.5, yy = j + 0.5;
    if (inA(xx, yy, 0)) {
      const reveal = !inA(xx - 1, yy - 1, 0), strap = o.straps !== false && (Math.abs(yy + h * 0.3) < 0.5 || Math.abs(yy + h * 0.68) < 0.5);
      const mm = reveal ? DARK : strap ? mIron : mOak;
      let bias = 0; if (!reveal && !strap && Math.floor(xx + 40) % 3 === 0) bias = -1;
      put(px, x + xx, y + yy, mm, z + 0.2, 0, 0, 1, { bias, cast: 0 });
    } else if (inA(xx, yy, 2)) {
      const a = Math.atan2(yy + h - hw, xx), vous = o.vous && Math.floor((a + 9) * 2.6) % 2 === 0;
      put(px, x + xx, y + yy, mStone, z + 0.1, -0.35, yy < -h + 1 ? -0.5 : 0, 0.8, { bias: (vous ? 1 : 0) + (xx > hw ? -1 : 0), cast: 0 });
    }
  }
  if (o.ring !== false) put(px, x + hw - 1.5, y - h * 0.45, o.mRing ?? mIron, z + 0.3, 0, 0, 1, { fix: 4, cast: 0 });
  return px;
};

// ---- cloth -----------------------------------------------------------------------
// A banner hung flat on a wall from a gilt rod: folds as tone, a trim, a swallow tail.
//   device: rows of characters (a small emblem, "#" = trim colour) centred on the cloth
export const wallBanner = (px, x, y, w, h, m, mTrim, z, o = {}) => {
  px.part();
  const hw = w / 2;
  for (let i = -Math.ceil(hw) - 1; i <= Math.ceil(hw); i++) put(px, x + i + 0.5, y - 0.5, mTrim, z + 0.3, 0, -0.7, 0.7, { cast: 1 });
  for (let j = 0; j < h; j++) for (let i = -Math.floor(hw); i < Math.floor(hw); i++) {
    const xx = i + 0.5, yy = j + 0.5, tail = o.tail === "point" ? (h - yy) < Math.abs(xx) * 1.1 - 0.2 : (h - yy) < (hw - Math.abs(xx)) * 0.9 - 0.4;
    if (o.tail !== "flat" && tail && yy > h - hw) continue;
    let bias = 0, mm = m;
    if (xx < -hw + 1.6) bias += 1; else if (xx > hw - 1.6) bias -= 1;
    if (o.fold && Math.abs(xx - o.fold) < 0.6) bias -= 1;
    if (yy < 1.2 || (o.stripe && Math.abs(yy - h * 0.72) < 0.7)) mm = mTrim;
    put(px, x + xx, y + yy, mm, z + 0.25, -0.15, 0, 0.98, { bias, cast: 1 });
  }
  if (o.device) {
    const rows = o.device, gw = rows[0].length;
    rows.forEach((row, rj) => [...row].forEach((ch, ci) => { if (ch === "#") put(px, x - gw / 2 + ci + 0.5, y + (o.deviceY ?? 3) + rj + 0.5, mTrim, z + 0.3, -0.15, 0, 0.98, { cast: 0 }); else if (ch === "o") put(px, x - gw / 2 + ci + 0.5, y + (o.deviceY ?? 3) + rj + 0.5, mTrim, z + 0.3, -0.15, 0, 0.98, { bias: -1, cast: 0 }); }));
  }
  return px;
};

// A pennant on a pole, rippling: `n` frames, each a small resolved picture with
// the pole's foot at its anchor. Live in the game: one stamp a flag a frame.
export const pennantFrames = (col, o = {}) => {
  const n = o.n || 8, len = o.len || 13, hgt = o.h || 7, pole = o.pole ?? 16, d = o.dir < 0 ? -1 : 1, M = mat(col), MP = mat("#6f4a2a"), MG = mat("#d8b34a");
  const frames = [];
  for (let f = 0; f < n; f++) {
    const px = new Pix(len + 8, pole + hgt + 6, d < 0 ? len + 5 : 3, pole + hgt + 3), ph = (f / n) * Math.PI * 2;
    px.part();
    if (pole) { px.capsule(0.5, 0, 0.8, 0.5, -pole - hgt, 0.7, MP, 0, { cast: 0 }); px.dot(0.5, -pole - hgt - 1.5, MG, 1, { fix: 3 }); px.dot(0.5, -pole - hgt - 0.5, MG, 1); }
    px.part();
    for (let i = 0; i < len; i++) {
      const t = i / (len - 1), wave = Math.sin(t * 5.2 - ph) * (0.4 + 1.9 * t), half = (hgt / 2) * (o.swallow ? 1 : 1 - t * 0.85);
      const cy = -pole - hgt / 2 + wave + t * 1.5, slope = Math.cos(t * 5.2 - ph);
      for (let j = Math.round(cy - half); j <= Math.round(cy + half); j++) {
        if (o.swallow && t > 0.72 && Math.abs(j - cy) < (t - 0.72) * hgt * 0.9) continue;
        px._put(Math.floor((d < 0 ? -0.5 - i : 1.5 + i) + px.ox), Math.floor(j + px.oy), M, 2, clamp(slope * 0.75 * d, -0.9, 0.9), -0.2, 0.6, { cast: 0 });
      }
    }
    frames.push(px.resolve({ line: o.line || "tint" }));
  }
  return frames;
};

// A flame: `n` looping frames (a torch, a brazier), hot core to red tips, no outline.
const FLAME = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a"].map((c) => flat(c, { emis: true }));
export const flameFrames = (o = {}) => {
  const n = o.n || 6, w = o.w || 5, h = o.h || 9, cols = o.cols ? o.cols.map((c) => flat(c, { emis: true })) : FLAME, frames = [];
  for (let f = 0; f < n; f++) {
    const px = new Pix(w + 6, h + 5, (w + 6) / 2, h + 3), ph = (f / n) * Math.PI * 2;
    for (let j = 0; j < h + 2; j++) {
      const t = j / h, half = (w / 2) * Math.sqrt(Math.max(0, 1 - t)) * (0.8 + 0.2 * Math.sin(ph + j)), cx = Math.sin(ph * 1 + j * 0.8) * t * 1.6;
      for (let i = -w; i <= w; i++) {
        const d = Math.abs(i + 0.5 - cx) / (half + 0.01);
        if (d > 1) continue;
        const heat = (1 - d) * (1 - t * 0.8) + 0.12 * Math.sin(ph * 2 + i + j);
        const s = heat > 0.62 ? 0 : heat > 0.4 ? 1 : heat > 0.18 ? 2 : 3;
        px._put(Math.floor(i + px.ox), Math.floor(-j - 1 + px.oy), cols[s], 1, 0, 0, 1, { noLine: true });
      }
    }
    // a spark or two thrown up
    const sy = -h - 1 - ((f * 3) % 5), sx = Math.round(Math.sin(f * 2.1) * 2);
    px._put(Math.floor(sx + px.ox), Math.floor(sy + px.oy), cols[1], 1, 0, 0, 1, { noLine: true });
    frames.push(px.resolve({ line: "none" }));
  }
  return frames;
};

// ---- growth and wear ---------------------------------------------------------------
// Ivy climbing a wall: leaves in two greens along a wandering stem from (x, y) up `h`.
export const ivy = (px, x, y, h, z, o = {}) => {
  const M1 = mat(o.col || "#4f8a3c"), M2 = mat(o.col2 || "#3a6a34"), seed = o.seed || 1, side = o.side || 1;
  px.part();
  let cx = x;
  for (let j = 0; j < h; j += 1.5) {
    cx += (hash(j, seed) - 0.5 + side * 0.08) * 1.6;
    const spread = (1 - j / h) * (o.spread ?? 3) + 0.6;
    for (let k = 0; k < 2; k++) {
      const lx = cx + (hash(j, k, seed + 3) - 0.5) * spread * 2, ly = y - j - hash(j * 2, k, seed) * 1.5;
      const big = hash(j, k + 9, seed) > 0.55;
      put(px, lx, ly, k ? M1 : M2, z, -0.4, -0.5, 0.7, { bias: k ? 1 : 0, cast: 1 });
      if (big) { put(px, lx + 1, ly, M1, z, -0.4, -0.5, 0.7, { cast: 1 }); put(px, lx, ly + 1, M2, z, 0.2, 0.3, 0.8, { cast: 1 }); }
    }
  }
  return px;
};

// a round stone or boulder lying at a wall's foot
export const boulder = (px, x, y, rx, ry, m, z) => { px.part(); px.ellipse(x, y - ry * 0.7, rx, ry, m, z, { round: 0.9 }); return px; };

// ---- putting a hall together --------------------------------------------------------
// The shadow a building lays on the ground: the silhouette's foot, sheared away
// from the sun, as rows of whole pixels ({ rows: [[y, x0, x1], ...] } in art px).
export const groundShadow = (rx, ry, o = {}) => {
  const rows = [], dx = o.dx ?? 5, dy = o.dy ?? 2;
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
    const k = 1 - (j / (ry + 0.3)) ** 2; if (k <= 0) continue;
    const w = Math.round(rx * Math.sqrt(k));
    rows.push([dy + j, dx - w + Math.round(j * 0.35), dx + w + Math.round(j * 0.35)]);
  }
  return rows;
};

// Light falling on a building from a lamp or a spell, as an overlay of its own (the
// figures' is Pix.lightLayer; a wall wants it gentler, or the stonework drowns): the
// light's colour in three stepped strengths, strongest near it and on what faces it.
// Stamped over the picture at whatever strength the moment calls for (a flicker, a cast).
export const wallLight = (px, img, lt) => {
  const { w, h } = px, out = new Uint8ClampedArray(w * h * 4), c = [1, 3, 5].map((i) => parseInt(lt.col.slice(i, i + 2), 16)), A = [0, 40, 84, 132].map((v) => Math.round(v * (lt.a ?? 1)));   // lt.a: a gentler lamp
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i; if (!img.data[k * 4 + 3]) continue;
    let dx = lt.x + px.ox - (i + 0.5), dy = lt.y + px.oy - (j + 0.5); const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const face = px.m[k] >= 0 ? clamp(0.62 + 0.5 * (px.nx[k] * dx + px.ny[k] * dy), 0.2, 1) : 0.7, g = clamp(1 - d / lt.r, 0, 1) * face;
    const s = g > 0.56 ? 3 : g > 0.32 ? 2 : g > 0.12 ? 1 : 0; if (!s) continue;
    out[k * 4] = c[0]; out[k * 4 + 1] = c[1]; out[k * 4 + 2] = c[2]; out[k * 4 + 3] = A[s];
  }
  return { data: out, w, h, ox: px.ox, oy: px.oy };
};

// A hall's two pictures and what moves on it, resolved:
//   back / front   { data, w, h, ox, oy } (front may be null)
//   glows          [{ img, key }] light overlays baked from `lights` (a torch, the crew's spell)
// `build(back, front)` draws into the two buffers and returns the hall's spec:
//   { crew: [{ x, y, fig, dir, clip }], live: [{ kind, x, y, ... }], lights: [{ key, x, y, r, col, on: "back"|"front" }], shadow: {rx, ry} }
export const bakeHall = (box, build, o = {}) => {
  const back = newPix(box), front = newPix(box);
  const spec = build(back, front) || {};
  const res = { line: o.line || "tint", flip: !!o.flip, sun: o.sun };
  const out = { box, spec, back: back.resolve(res), front: front.m.some((v) => v >= 0) ? front.resolve(res) : null, glows: [] };
  for (const lt of spec.lights || []) {
    const b = wallLight(back, out.back, lt);
    const f = out.front ? wallLight(front, out.front, lt) : null;
    out.glows.push({ key: lt.key, col: lt.col, x: lt.x, y: lt.y, r: lt.r, back: b, front: f });
  }
  return out;
};

// A caster's orb (the hall draws it live at the staff's fork): `n` pulsing frames, no outline.
export const orbFrames = (col, o = {}) => {
  const n = o.n || 6, r = o.r || 3.6, frames = [];
  const C = [flat(col, { emis: true }), flat(mixHex(col, "#ffffff", 0.45), { emis: true }), flat("#fffaf0", { emis: true }), flat(mixHex(col, "#2a1c2c", 0.35), { emis: true })];
  for (let f = 0; f < n; f++) {
    const px = new Pix(18, 18, 9, 9), k = 0.5 + 0.5 * Math.sin((f / n) * Math.PI * 2), rr = r + k * 0.9;
    for (let j = -8; j < 8; j++) for (let i = -8; i < 8; i++) {
      const d = Math.hypot(i + 0.5, j + 0.5);
      if (d > rr) continue;
      const s = d < rr * 0.34 ? 2 : d < rr * 0.68 ? 1 : (i + j > 2 && d > rr - 1.1) ? 3 : 0;
      px._put(i + 9, j + 9, C[s], 1, 0, 0, 1, { noLine: true });
    }
    // motes thrown off it
    for (let e = 0; e < 3; e++) { const a = f * 1.05 + e * 2.1, d = rr + 1.5 + ((f + e * 2) % n) * 0.5; px._put(Math.floor(9 + Math.cos(a) * d), Math.floor(9 + Math.sin(a) * d), C[1], 1, 0, 0, 1, { noLine: true }); }
    frames.push(px.resolve({ line: "none" }));
  }
  return frames;
};
// a twinkle: a four-point spark that opens and shuts (`n` frames; most are empty)
export const sparkFrames = (col, o = {}) => {
  const n = o.n || 8, C = flat(col, { emis: true }), W = flat("#fffaf0", { emis: true }), frames = [];
  for (let f = 0; f < n; f++) {
    const px = new Pix(9, 9, 4, 4), s = [0, 1, 2, 1, 0, 0, 0, 0][f % 8];
    if (s) { px._put(4, 4, W, 1, 0, 0, 1, { noLine: true }); for (let d = 1; d <= s; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) px._put(4 + dx, 4 + dy, C, 1, 0, 0, 1, { noLine: true }); }
    frames.push(px.resolve({ line: "none" }));
  }
  return frames;
};
function mixHex(a, b, t) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
export { mixHex };

// a spellbook hanging open in the air (the Spire's; the page bobs it): one small picture
export const bookFrames = (cover = "#5a4a8c") => {
  const px = new Pix(17, 12, 8, 8), C = mat(cover), P = mat("#e8e0c8"), G = mat("#d8b34a");
  px.part(); px.poly([[-7, -3], [0, -1], [7, -3], [7, 2], [0, 4], [-7, 2]], C, 0, { n: [0, -0.3, 0.95] });
  px.part(); px.poly([[-6, -4], [0, -2], [0, 3], [-6, 1]], P, 1, { n: [-0.35, -0.5, 0.8], cast: 0 }); px.poly([[0, -2], [6, -4], [6, 1], [0, 3]], P, 1, { n: [0.4, -0.3, 0.85], cast: 0 });
  px.toneLine(-4.5, -1.5, -1.5, -0.5, -1); px.toneLine(1.5, -0.5, 4.5, -1.5, -1); px.dot(-0.5, 3.5, G, 2, { fix: 3 });
  return [px.resolve({ line: "tint" })];
};
