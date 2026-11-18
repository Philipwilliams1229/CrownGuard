// Shared by scripts/views-check.mjs and scripts/views-sheet.mjs: every PIX type whose figure has
// front / back views switched on (VIEWS_ON in src/render/pix/pixrigs.js), and an INSTRUMENTED bake
// that records, for each pixel, which drawing call put it there (an "op": capsule, limb, ellipse,
// poly, line, dot, stamp, with its artist tag, depth, start point and the cells a stamp asked for).
// No browser: node only. Nothing here changes a pixel.
import fs from "node:fs";
const ROOT = process.env.CG_ROOT || new URL("../..", import.meta.url).pathname.replace(/\/$/, "");   // CG_ROOT=<dir holding src/> checks an older copy
export { ROOT };
const PIX = ROOT + "/src/render/pix";

const { Pix, MATS } = await import(PIX + "/pix.js");
const { frameAt } = await import(PIX + "/rig.js");
export { Pix, MATS, frameAt };

// ---- the cast ------------------------------------------------------------------------------
export const listTypes = () => {
  const src = fs.readFileSync(PIX + "/pixrigs.js", "utf8");
  const on = new Set(JSON.parse("[" + src.match(/VIEWS_ON = new Set\(\[([^\]]*)\]\)/)[1] + "]"));
  const types = [];
  for (const line of src.split("\n")) {
    const m = line.match(/^\s+(\w+): \{ fig: mk\("(\w+)", (\w+)\)/);
    if (!m || !on.has(m[2])) continue;
    const v = line.match(/variant: "([^"]*)"/);
    types.push({ type: m[1], name: m[2], variant: v ? v[1] : "" });
  }
  return types;
};
// four-legged figures and riders: the two-legged rules (arms, ground by the feet) don't apply
export const BEAST = new Set(["wolf", "boarMount", "cavalierMount", "loosehorse", "rimewolf", "gryphonMount", "rimejarl", "mammoth"]);
export const RIDER = new Set(["boarrider", "cavalier", "errantRider", "wolfrider", "rimerider", "rimejarl", "gryphon"]);

export const loadFig = async (name) => ({
  side: await import(`${PIX}/fig-${name}.js`),
  views: await import(`${PIX}/fig-${name}-views.js`),
});

// ---- the instrumented bake -----------------------------------------------------------------
const P = Pix.prototype, KINDS = ["capsule", "limb", "ellipse", "poly", "line", "dot", "stamp"];
const ORIG = Object.fromEntries(KINDS.map((k) => [k, P[k]]));
const ORIG_PUT = P._put;
let REC = null;   // the bake being recorded, or null (then the sculptor runs untouched)
for (const k of KINDS) P[k] = function (...a) {
  if (!REC || REC.depth) return ORIG[k].apply(this, a);
  const op = { id: REC.ops.length, kind: k, tag: this.tagNames ? this.tagNames[this._tag] || "" : "", px: 0, x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  if (k === "capsule") { op.a = [a[0], a[1]]; op.b = [a[3], a[4]]; op.z = a[7]; }
  else if (k === "limb") { op.a = a[0][0]; op.b = a[0][a[0].length - 1]; op.z = a[3]; }
  else if (k === "ellipse") { op.a = [a[0], a[1]]; op.z = a[5]; }
  else if (k === "poly") { op.z = a[2]; }
  else if (k === "line") { op.a = [a[0], a[1]]; op.b = [a[2], a[3]]; op.z = a[5]; }
  else if (k === "dot") { op.a = [a[0], a[1]]; op.z = a[3]; }
  else if (k === "stamp") {
    const [rows, x, y, legend, z, o = {}] = a;
    op.z = z; op.foot = []; op.unknown = new Set();
    const gx = Math.round(x) - (o.ax || 0), gy = Math.round(y) - (o.ay || 0);
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch === "." || ch === " ") continue;
      if (!legend[ch]) { op.unknown.add(ch); continue; }
      const i = gx + c + Math.floor(this.ox), j = gy + r + Math.floor(this.oy);
      if (i >= 0 && j >= 0 && i < this.w && j < this.h) op.foot.push(j * this.w + i);
    }
  }
  REC.ops.push(op); REC.cur = op; REC.depth++;
  try { return ORIG[k].apply(this, a); } finally { REC.depth--; REC.cur = null; }
};
P._put = function (i, j, m, z, ...rest) {
  if (!REC || i < 0 || j < 0 || i >= this.w || j >= this.h) return ORIG_PUT.call(this, i, j, m, z, ...rest);
  const k = j * this.w + i, z0 = this.z[k], m0 = this.m[k], wrap = rest[3] && rest[3].wrap && m0 >= 0;
  ORIG_PUT.call(this, i, j, m, z, ...rest);
  if (wrap || this.z[k] !== z0 || this.m[k] !== m0) {
    const op = REC.cur; if (!op) return;
    REC.own[k] = op.id + 1;
    if (i < op.x0) op.x0 = i; if (i > op.x1) op.x1 = i; if (j < op.y0) op.y0 = j; if (j > op.y1) op.y1 = j;
  }
};

// bake one frame of one figure (a side figure, or views.FRONT / views.BACK), recording the ops.
// Returns { px, img, ops, own } : own[k] = 1 + the id of the op that owns pixel k at the end (0 = none)
export const bakeRec = (fig, clipName, f, variant) => {
  const clip = fig.CLIPS[clipName], F = frameAt(clip, f, fig.BONES);
  const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
  REC = { ops: [], own: new Int32Array(px.w * px.h), cur: null, depth: 0 };
  let info;
  try { info = fig.draw(px, F, { variant }) || {}; } finally { var rec = REC; REC = null; }
  const lights = (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02);
  const img = px.resolve({ lights });
  for (const op of rec.ops) op.px = 0;
  for (let k = 0; k < rec.own.length; k++) if (rec.own[k]) rec.ops[rec.own[k] - 1].px++;
  return { px, img, ops: rec.ops, own: rec.own };
};

// a material's identity across files: its mid tone (views files repeat the side file's hex)
export const matKey = (m) => MATS[m].c[2].join(",");
export const hexOf = (key) => "#" + key.split(",").map((v) => (+v).toString(16).padStart(2, "0")).join("");

// ---- PNG out (no dependencies) --------------------------------------------------------------
import zlib from "node:zlib";
export const png = (W, H, buf) => {
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
