// ============ THE MASONS' NET ============
// How a flier caught in the Masons' net looks (castle works, data/castle.js masons `net`; the
// engine holds it on the road while `e.net` is set). rigs.js calls `netify(cv, S)` once per frame
// canvas for the "net" look; enemies.js stamps the result over the figure each frame it is netted.
// `cv` is a copy of the figure's frame (transparent round it); `S` its canvas pixels per art pixel
// (1 for the pix figures, PX for the old painted rigs). Returns a NEW canvas (bigger by `pad` canvas
// pixels each side, `.pad` set) holding ONLY the net; the figure is drawn under it separately.
//
// The net is its own object: the silhouette is grown a few art px and rounded (wing tips and
// spears are wrapped, not traced), over it a diamond mesh of 1 px hemp strands with a lit edge
// (sun upper left) and knots, a 2 px rim rope pulled tight, lead weights hanging from the bottom
// and a short trailing rope end. Deterministic, no randomness.
const PAD = 7;                                   // art px the net may spill past the frame
const DARK = [64, 42, 26], MID = [128, 92, 54], LIT = [222, 196, 140];
const STONE = [124, 116, 112], STONE_LT = [206, 196, 176], STONE_DK = [58, 50, 50];
const P = 9;                                     // mesh period (diamond holes ~6 art px)

export const netify = (cv, S = 1) => {
  S = Math.max(1, S);
  const src = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
  const aw = Math.ceil(cv.width / S), ah = Math.ceil(cv.height / S);
  const W = aw + PAD * 2, H = ah + PAD * 2, N = W * H;
  // 1. the figure's mask on the art grid, inside the padded frame
  let m = new Float32Array(N), any = false;
  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
    const cx = Math.min(cv.width - 1, Math.floor((x + 0.5) * S)), cy = Math.min(cv.height - 1, Math.floor((y + 0.5) * S));
    if (src[(cy * cv.width + cx) * 4 + 3] > 110) { m[(y + PAD) * W + x + PAD] = 1; any = true; }
  }
  const out = document.createElement("canvas"); out.width = W * S; out.height = H * S; out.pad = PAD * S;
  if (!any) return out;
  // 2. grow and round: dilate by a disc, then blur and threshold
  const dilate = (a, r) => {
    const o = new Float32Array(N), r2 = r * r + 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!a[y * W + x]) continue;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        if (i * i + j * j > r2) continue;
        const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < H) o[yy * W + xx] = 1;
      }
    }
    return o;
  };
  const blur = (a, r) => {                          // separable box blur
    const t = new Float32Array(N), o = new Float32Array(N), k = 2 * r + 1;
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * W + Math.max(0, Math.min(W - 1, x))];
      for (let x = 0; x < W; x++) { t[y * W + x] = s / k; s += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.max(0, Math.min(H - 1, y)) * W + x];
      for (let y = 0; y < H; y++) { o[y * W + x] = s / k; s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
    return o;
  };
  const bl = blur(dilate(m, 3), 3);
  const sh = new Uint8Array(N);                      // the net's shape
  let minx = W, maxx = 0, miny = H, maxy = 0, sx = 0, sy = 0, cnt = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bl[y * W + x] > 0.42) {
    sh[y * W + x] = 1; cnt++; sx += x; sy += y;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  const cxm = sx / cnt, cym = sy / cnt, rx = (maxx - minx) / 2 + 1, ry = (maxy - miny) / 2 + 1;
  const at = (a, x, y) => x >= 0 && y >= 0 && x < W && y < H && a[y * W + x] === 1;
  // distance to the outside, capped at 3 (rim rope depth)
  const dist = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!sh[y * W + x]) continue;
    let d = 3;
    for (let k = 1; k <= 2 && d === 3; k++) if (!at(sh, x - k, y) || !at(sh, x + k, y) || !at(sh, x, y - k) || !at(sh, x, y + k)) d = k;
    dist[y * W + x] = d;
  }
  // 3. paint
  const o = new Uint8ClampedArray(N * 4);
  const put = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = a; };
  const mod = (v) => ((v % P) + P) % P;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!sh[y * W + x]) continue;
    const d = dist[y * W + x];
    const nx = (x - cxm) / rx, ny = (y - cym) / ry, r2 = nx * nx + ny * ny, f = 1 - 0.2 * r2;   // the mesh bunches toward the rim
    const mx = cxm + (x - cxm) * f, my = cym + (y - cym) * f;
    const u = Math.round(mx + my), v = Math.round(mx - my);
    const ur = mod(u), vr = mod(v);
    if (d === 1) { put(x, y, DARK); continue; }                     // rim rope, outer pixel
    if (d === 2) {                                                  // rim rope, inner pixel (lit on the upper left)
      put(x, y, nx + ny < 0.1 ? LIT : MID); continue;
    }
    const au = ur === 0, av = vr === 0;
    if (au && av) { put(x, y, DARK); continue; }                    // knot
    if (au || av) { put(x, y, DARK); continue; }
    if (ur === P - 1 || vr === P - 1) { if (((x + y) & 1) === 0) put(x, y, LIT, 235); continue; }   // lit edge (dotted)
    // knot: the crossing's neighbours, drawn as a small blob
  }
  // knots: lit pixel on each crossing's upper left, dark pixel at the lower right
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (!sh[y * W + x] || dist[y * W + x] < 3) continue;
    const nx = (x - cxm) / rx, ny = (y - cym) / ry, f = 1 - 0.2 * (nx * nx + ny * ny);
    const mx = cxm + (x - cxm) * f, my = cym + (y - cym) * f;
    if (mod(Math.round(mx + my)) === 0 && mod(Math.round(mx - my)) === 0) {
      put(x, y, MID); put(x - 1, y, LIT); put(x, y - 1, LIT); put(x + 1, y, DARK); put(x, y + 1, DARK);
    }
  }
  // 4. lead weights hanging from the bottom rim, every ~11 px, picked where the rim faces down
  const hang = [];
  for (let x = minx + 3; x <= maxx - 3; x += 1) {
    let yb = -1; for (let y = maxy + 1; y >= miny; y--) if (sh[y * W + x]) { yb = y; break; }
    if (yb < 0 || yb + 4 >= H) continue;
    // only where the rim is level enough: the pixel two to each side ends within 2 rows
    let yl = -1, yr = -1; for (let y = maxy + 1; y >= miny; y--) { if (yl < 0 && sh[y * W + x - 2]) yl = y; if (yr < 0 && sh[y * W + x + 2]) yr = y; }
    if (Math.abs(yl - yb) > 2 || Math.abs(yr - yb) > 2) continue;
    hang.push([x, yb]);
  }
  let last = -99;
  for (const [x, yb] of hang) {
    if (x - last < 10) continue; last = x;
    put(x, yb + 1, DARK);                                             // the cord
    // stone: a round 3x3 (corners cut) lit upper left, with a dark base
    const y0 = yb + 2;
    put(x, y0, STONE_LT); put(x - 1, y0 + 1, STONE_LT); put(x, y0 + 1, STONE); put(x + 1, y0 + 1, STONE);
    put(x, y0 + 2, STONE_DK); put(x - 1, y0 + 2, STONE_DK); put(x + 1, y0 + 2, STONE_DK); put(x + 1, y0, STONE);
  }
  // 5. a short trailing rope end off the top right
  { let tx = -1, ty = -1; for (let x = maxx; x > cxm; x--) { for (let y = miny; y < cym; y++) if (sh[y * W + x]) { tx = x; ty = y; break; } if (tx >= 0) break; }
    if (tx >= 0) { const pts = [[1, -1], [2, -1], [3, -2], [3, -3], [4, -3], [5, -4]]; pts.forEach(([i, j], k) => put(tx + i - 1, ty + j + 1, k < 4 ? DARK : MID)); put(tx + 4, ty - 2, LIT); } }
  // 6. to the output canvas, scaled up to canvas pixels
  const small = document.createElement("canvas"); small.width = W; small.height = H;
  small.getContext("2d").putImageData(new ImageData(o, W, H), 0, 0);
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, W * S, H * S);
  return out;
};
