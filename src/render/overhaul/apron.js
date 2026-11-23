// The overhaul: the calm meadow carried on past the board's edge (art/briefs/overhaul-build-millrace.md, B5).
//
// apronGround(ctx, rect, k): BAKE. Repaints the apron's own ground canvas (apron.js paintGround's result,
// before its rivers and road are laid on it) in place: every pixel in the realm's TURF palette becomes the
// calm meadow's, from the very same world-space fields as the board's (overhaul/meadow.js), so no seam
// shows at the board's edge. The wood's floor, the crag and the pixels under the board (clear) are left.
//   ctx  the strip canvas's 2D context, pixel space (identity transform)
//   rect [x0, y0, x1, y1] the strip in world units (x0, y0 = its pixel (0, 0)'s corner)
//   k    canvas pixels per world unit (2 = the board's own grain; the far apron is coarser)
// At the board's grain the wood's fringe of long grass runs on too (Millrace's wood runs off the top and
// bottom of the board on the left); the damp band at the water follows each river carried straight on
// from its end segments, only within 60 units of the board (the apron's rivers curve away further out).
// The stands and the drift are the board's alone.
//
// SEAM (the lead's, apron.js `layer()`, right after `const cv = paintGround(lx0, ly0, lw, lh, k, dens, road);`):
//     if (ovhOn()) apronGround(cv.getContext("2d"), [lx0, ly0, lx0 + lw / k, ly0 + lh / k], k);
// (or a new OVH slot `apronGround` with that call as its body; default: nothing).
import { W, H } from "../../data/constants.js";
import { FOREST } from "../../data/terrain.js";
import { palette, seedOf, heightGrid, waterGrid, woodRows, massPainter, raised, fringeLook, fringeAt, shadeOf } from "./meadow.js";

export const APRON_PROF = {};

export function apronGround(ctx, rect, k) {
  const T0 = performance.now();
  const cv = ctx.canvas, w = cv.width, h = cv.height, N = w * h;
  if (!w || !h) return;
  const [x0, y0] = rect;
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const P = palette(), G = P.G, seed = seedOf(), mass = massPainter(G);
  // the art-px rect the strip covers (absolute: 2 art px a world unit, as the board's)
  const AX0 = Math.floor(x0 * 2), AY0 = Math.floor(y0 * 2), AW = Math.ceil(w * 2 / k) + 2, AH = Math.ceil(h * 2 / k) + 2;
  const hgt = heightGrid(AX0, AY0, AW, AH, seed, k < 1.5 ? 8 : 4);
  const outside = (x, y) => Math.max(-x, x - W, -y, y - H, 0);
  const near = outside(x0 + w / k / 2, y0 + h / k / 2) < 400;   // (no water lookups far out)
  const wdAt = near ? waterGrid(AX0, AY0, AW, AH, true) : () => 999;
  const fdAt = woodRows(AX0, AY0, AW, AH);
  const fine = Math.abs(k - 2) < 1e-6;
  const T1 = performance.now();
  const TURF = new Uint8Array(N), WD = fine ? new Int16Array(N) : null, FD = fine ? new Float32Array(N) : null;
  for (let py = 0; py < h; py++) {
    const y = y0 + (py + 0.5) / k, Y = Math.floor(y * 2);
    for (let px = 0; px < w; px++) {
      const i = py * w + px, o = i * 4;
      if (!d[o + 3]) continue;
      if (!P.turf.has((d[o] << 16) | (d[o + 1] << 8) | d[o + 2])) continue;
      const x = x0 + (px + 0.5) / k, X = Math.floor(x * 2), out = outside(x, y);
      const wd = out < 60 ? wdAt(X, Y) : 999, fd = fdAt(X, Y);
      const c = mass(X, Y, hgt(X, Y), wd, fd);
      TURF[i] = 1;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      if (fine) { WD[i] = Math.round(Math.max(-999, Math.min(999, wd))); FD[i] = fd; }
    }
  }
  const T2 = performance.now();
  if (fine) {
    // the wood's fringe, as the board's (meadow.js), on the strip's own grid
    if (FOREST) {
      const Z = new Int16Array(N), SH = new Uint8Array(N);
      for (let i = 0; i < N; i++) Z[i] = (i / w) | 0;
      const set = (i, c) => { if (!TURF[i]) return; const o = i * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; };
      const S = { set, Z, SH, w, h, X0: AX0, Y0: AY0 };
      const FM = new Uint8Array(N);
      let any = false;
      let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
      for (let i = 0; i < N; i++) {
        if (!TURF[i] || FD[i] < -26 || FD[i] > -5 || WD[i] <= 6) continue;
        const x = i % w, y = (i / w) | 0;
        if (!fringeAt(x + AX0, y + AY0, FD[i], seed)) continue;
        FM[i] = 1; any = true;
        if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      }
      const fm = (x, y) => x >= 0 && y >= 0 && x < w && y < h && FM[y * w + x] === 1;
      if (any) raised(S, fm, [bx0, by0, bx1, by1], 5, fringeLook(G, 700));
      const [sc, sa] = shadeOf();
      for (let i = 0; i < N; i++) {
        if (!TURF[i] || !SH[i]) continue;
        const a = sa * SH[i] / 200, o = i * 4;
        d[o] = d[o] * (1 - a) + sc[0] * a; d[o + 1] = d[o + 1] * (1 - a) + sc[1] * a; d[o + 2] = d[o + 2] * (1 - a) + sc[2] * a;
      }
    }
  }
  const T3 = performance.now();
  ctx.putImageData(img, 0, 0);
  APRON_PROF.grids = (APRON_PROF.grids || 0) + T1 - T0;
  APRON_PROF.pixels = (APRON_PROF.pixels || 0) + T2 - T1;
  APRON_PROF.fringe = (APRON_PROF.fringe || 0) + T3 - T2;
  APRON_PROF.ms = (APRON_PROF.ms || 0) + performance.now() - T0;
  APRON_PROF.px = (APRON_PROF.px || 0) + N;
  if (typeof window !== "undefined") window.__ovhApron = APRON_PROF;   // (labs read it)
}
