// The views checker (2026-11-18; the advisor's study of the owner's notes, art/briefs/views-notes-log.md):
// about two-thirds of the owner's notes on the front / back views were MECHANICAL faults a script can
// find. This bakes every frame of every figure with views switched on (side, FRONT, BACK walks, the
// PIX type's own variant) and fails the ones a machine can see, before any person looks:
//   islands   a piece of the figure that does not touch the rest (a foot off its leg, a weapon tip
//             adrift, a stray pixel): the owner's "make sure feet stay connected!"
//   ground    a view whose lowest pixel stands off the side walk's ground line (floating or sunk)
//   box       pixels on the edge of the BOX (the figure is cut off)
//   legend    a stamp grid letter with no legend entry (it draws nothing: the farmer's black dot)
//   face      something that is not part of the head (a pauldron, a shield, a haft) over the lower
//             part of the head stamp, FRONT and BACK: "shoulders over the face"
//   spine     BACK: an arm (a limb or capsule starting at the shoulders) crossing the spine between
//             the shoulders and the hips: the owner's "arm folded behind his back" (the BACK stack)
//   missing   a colour the side walk shows in quantity (a weapon's steel or haft) that a view never
//             shows in any frame: "goblins with spears that didn't have them on the back view"
//   clip      the views' walk must have the side walk's frame count and timing
// FAIL = must be fixed or explained before the lead looks; WARN = look at it (colours a view may
// rightly hide, like the eyes from behind, land here). NOT CHECKED lists what a rule could not see.
//   node scripts/views-check.mjs [only=goblin,orc] [json=out.json] [quiet=1] [warn=0]
// Exit 1 when anything FAILs. Thresholds are the constants below; tune them, never per figure.
import fs from "node:fs";
import { listTypes, loadFig, bakeRec, matKey, hexOf, BEAST, RIDER, MATS } from "./lib/views-cases.mjs";
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const only = q.only ? new Set(q.only.split(",")) : null;

const ISLAND_MIN = 1;       // islands of this many pixels or more count
const FLOAT_TOL = 2;        // px a view's lowest pixel may sit ABOVE the side walk's ground (floating)
const SINK_TOL = 6;         // ... and below it (a stride toward or away from us drops the leading foot down the screen)
const FACE_PX = 6;          // foreign pixels over the lower head before it fails
const FACE_FROM = 0.35, FACE_TO = 0.8;   // the "face": this band of the head stamp's height (FRONT only; the chin and neck rows below it meet the collar)
const FOREIGN = 2;          // an op reaching this far outside the head's box is not part of the head
const SPINE_PX = 3;         // arm pixels on the spine column before it fails
const MISSING_SIDE = 8;     // a colour the side shows at least this many px a frame on average ...
const MISSING_VIEW = 0;     // ... and a view shows at most this many px in its best frame

// faults the OWNER chose (a rule's verdict overruled by an owner's note). Keep it short, with the note:
// "<type> <view> <rule>": reason. They print as "accepted", never fail.
const ACCEPTED = {
  "hobgoblin FRONT face": "owner, 2026-11-18: the banner pole stands before his ear (a pennant crosses the cheek)",
};

// figures whose head lies UNDER the back from behind, by design (the stack rule reads their head's depth wrong)
const HUNCHED = new Set(["ghast", "amalgam"]);

// ---- the measures ------------------------------------------------------------------------------
const alpha = (img, k) => img.data[k * 4 + 3];
const islands = (img, px) => {
  const { w, h } = img, solid = (k) => alpha(img, k), seen = new Int32Array(w * h), comps = [];
  for (let s = 0; s < w * h; s++) {
    if (!solid(s) || seen[s]) continue;
    const id = comps.length + 1, st = [s]; seen[s] = id; let n = 0, x0 = 1e9, y0 = 1e9, body = 0;
    while (st.length) {
      const k = st.pop(), x = k % w, y = (k / w) | 0; n++; if (px.m[k] >= 0 && !(px.flag[k] & 6)) body++; if (x < x0) x0 = x; if (y < y0) y0 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const q2 = Y * w + X; if (solid(q2) && !seen[q2]) { seen[q2] = id; st.push(q2); }
      }
    }
    comps.push({ n, x: x0, y: y0, body });   // body 0: only unlined / unlit pixels (a haze, sparks): drawn loose on purpose
  }
  comps.sort((a, b) => b.n - a.n);
  return comps;
};
const extent = (img) => {
  const { w, h } = img; let top = 1e9, bot = -1, edge = 0; const sides = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha(img, y * w + x)) {
    if (y < top) top = y; if (y > bot) bot = y;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { edge++; sides.add(y === 0 ? "top" : y === h - 1 ? "bottom" : x === 0 ? "left" : "right"); }
  }
  return { top, bot, edge, sides: [...sides].join("+") };
};
const colours = (r) => {
  const c = new Map(), { px } = r;
  for (let k = 0; k < px.m.length; k++) if (px.m[k] >= 0) { const key = matKey(px.m[k]); c.set(key, (c.get(key) || 0) + 1); }
  return c;
};
// the head: the op tagged "head", else the highest big stamp (the face / back-of-head grid)
const headOf = (r) => {
  const t = r.ops.find((o) => o.tag === "head" && o.foot);
  if (t) return t;
  let best = null;
  for (const o of r.ops) if (o.kind === "stamp" && o.foot.length >= 30 && o.px > 0) {
    const top = Math.min(...o.foot.map((k) => (k / r.px.w) | 0)), xs = o.foot.map((k) => k % r.px.w);
    if (Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - r.px.ox) > 8) continue;   // off to one side: a banner, a shield badge, not the head
    if (!best || top < best.top) best = Object.assign(o, { top });
  }
  return best;
};
const faceCover = (r, head) => {
  const w = r.px.w, ys = head.foot.map((k) => (k / w) | 0), xs = head.foot.map((k) => k % w);
  const top = Math.min(...ys), bot = Math.max(...ys), l = Math.min(...xs), rt = Math.max(...xs), cut = top + (bot - top) * FACE_FROM, cut2 = top + (bot - top) * FACE_TO;
  const by = new Map();
  for (const k of head.foot) {
    const y = (k / w) | 0; if (y < cut || y > cut2) continue;
    const o = r.own[k] ? r.ops[r.own[k] - 1] : null;
    if (!o || o === head) continue;
    // part of the head: fits inside its width and is not much taller than it (a beak, a beard, a visor);
    // anything wider (a pauldron, a shield, a crossing spear) or taller (a haft) is foreign
    // headwear: starts at or above the head's top, centred on it, a brim's width at most (a hat, hood, helm)
    const hat = o.y0 <= top + 1 && Math.abs((o.x0 + o.x1) / 2 - (l + rt) / 2) <= 2 && (o.x1 - o.x0) <= (rt - l) + 10;
    const foreign = !hat && (o.x0 < l - FOREIGN || o.x1 > rt + FOREIGN || (o.y1 - o.y0) > (bot - top) * 1.5);
    if (!foreign) continue;
    const key = o.tag || o.kind; by.set(key, (by.get(key) || 0) + 1);
  }
  return by;
};
// BACK: arm ops (capsules / limbs starting in the shoulder band, long enough) and their pixels on the spine
const spineCross = (r, fig, top) => {
  const { px, own, ops } = r, H = fig.BOX.oy - top, w = px.w, cx = Math.floor(fig.BOX.ox);
  const yS = -0.86 * H, yS2 = -0.55 * H, yHip = -0.42 * H;
  const arm = (o) => (o.kind === "capsule" || o.kind === "limb") && o.a && o.b && o.a[1] >= yS && o.a[1] <= yS2
    && Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]) >= 0.14 * H && Math.abs(o.a[0]) >= 1.5;
  let n = 0; const who = new Set();
  for (let y = Math.max(0, Math.round(fig.BOX.oy + yS + 0.12 * H)); y < Math.round(fig.BOX.oy + yHip); y++) for (const x of [cx - 1, cx, cx + 1]) {
    const k = y * w + x, o = own[k] ? ops[own[k] - 1] : null;
    if (o && arm(o)) { n++; who.add(o.tag || o.kind); }
  }
  return { n: n / 3, who };
};

// BACK: the depth stack (the advisor's "BACK stack"): from behind, the arms lie UNDER the head and back
// gear (arms 4.3, head 6.0). An arm drawn at or over the head's depth is the side view's stack reused, which
// lays the arm ON the back with its shadow: the owner's "arm folded behind his back". Arms here are ops tagged
// like an arm or hand, else capsules / limbs starting in the shoulder band.
const isArm = (o, H) => /arm|hand/i.test(o.tag) || ((o.kind === "capsule" || o.kind === "limb") && o.a && o.a[1] >= -0.86 * H && o.a[1] <= -0.55 * H && Math.abs(o.a[0]) >= 1.5);
const stackFault = (r, head, H) => {
  const bad = new Set(); let n = 0;
  const chin = Math.max(...head.foot.map((k) => (k / r.px.w) | 0)) - r.px.oy;   // an arm starts at the shoulder, below the chin: what starts higher is headgear (antlers, a topknot)
  // a tagged arm may not reach the head's depth; an untagged shoulder capsule may be back gear (a fur mantle,
  // 5.0 and up), so it fails only when drawn OVER the head (the old side stack put arms at 7.9-9.8)
  for (const o of r.ops) if (o.px && o !== head && isArm(o, H) && !(o.a && o.a[1] < chin - 1 && !/arm|hand/i.test(o.tag)) && o.z >= head.z - (/arm|hand/i.test(o.tag) ? 0.5 : -0.4)) { n += o.px; bad.add(`${o.tag || o.kind} z ${+o.z.toFixed(2)}`); }
  return { n, bad };
};

// ---- the run -------------------------------------------------------------------------------------
const report = [];
let fails = 0, warns = 0;
for (const t of listTypes()) {
  if (only && !only.has(t.type) && !only.has(t.name)) continue;
  const R = { type: t.type, name: t.name, fail: [], warn: [], unchecked: [] };
  report.push(R);
  let side, views;
  try { ({ side, views } = await loadFig(t.name)); } catch (e) { R.fail.push(`load: ${String(e.message).split("\n")[0]}`); continue; }
  const sw = side.CLIPS.walk, beast = BEAST.has(t.type), rider = RIDER.has(t.type);
  // the side walk: its ground line, its height, its colours
  const sideBot = [], sideBotF = [], sideCols = new Map(); let sideTop = 1e9;
  for (let f = 0; f < sw.n; f++) {
    const r = bakeRec(side, "walk", f, t.variant), e = extent(r.img);
    sideBot.push(e.bot - side.BOX.oy); sideBotF.push(e.bot - side.BOX.oy); sideTop = Math.min(sideTop, e.top - side.BOX.oy);
    for (const [k, n] of colours(r)) sideCols.set(k, (sideCols.get(k) || 0) + n / sw.n);
  }
  const ground = sideBot.sort((a, b) => a - b)[sideBot.length >> 1];
  for (const [vn, fig] of [["FRONT", views.FRONT], ["BACK", views.BACK]]) {
    if (!fig || !fig.CLIPS || !fig.CLIPS.walk) { R.fail.push(`${vn}: no walk clip`); continue; }
    const vw = fig.CLIPS.walk;
    if (vw.n !== sw.n || vw.ms !== sw.ms) R.fail.push(`${vn} clip: ${vw.n} frames / ${vw.ms} ms, the side walk has ${sw.n} / ${sw.ms}`);
    const isl = [], gnd = [], box = [], face = new Map(), spine = new Map(), stack = new Map(), unknown = new Set(), best = new Map();
    let headSeen = 0, armSeen = 0;
    for (let f = 0; f < vw.n; f++) {
      let r; try { r = bakeRec(fig, "walk", f, t.variant); } catch (e) { R.fail.push(`${vn} #${f}: draw threw ${String(e.message).split("\n")[0]}`); break; }
      const e = extent(r.img), comps = islands(r.img, r.px);
      for (const c of comps.slice(1)) if (c.n >= ISLAND_MIN && c.body) isl.push(`#${f} ${c.n}px at (${c.x - Math.floor(fig.BOX.ox)},${c.y - Math.floor(fig.BOX.oy)})`);
      // against the side walk's whole range (its bob, a gallop's leap, a hem or pole butt that hangs lowest)
      const b = e.bot - fig.BOX.oy, hi = Math.min(0, ...sideBotF), lo = Math.max(...sideBotF);
      if (b < hi - FLOAT_TOL) gnd.push(`#${f} floats ${hi - b}px`); else if (b > lo + SINK_TOL) gnd.push(`#${f} sinks ${b - lo}px`);
      if (e.edge) box.push(`#${f} ${e.edge}px ${e.sides}`);
      for (const o of r.ops) if (o.unknown) for (const ch of o.unknown) unknown.add(ch);
      for (const [k, n] of colours(r)) best.set(k, Math.max(best.get(k) || 0, n));
      const head = beast || vn === "BACK" ? null : headOf(r);
      if (head) {
        headSeen++;
        const by = faceCover(r, head), n = [...by.values()].reduce((a, b) => a + b, 0);
        if (n >= FACE_PX) face.set(f, [...by].map(([k, v]) => `${k} ${v}px`).join(", "));
      }
      if (vn === "BACK" && !beast) {
        const hd = headOf(r), H = fig.BOX.oy - (sideTop + fig.BOX.oy);
        if (hd && !rider && !HUNCHED.has(t.type)) { const st = stackFault(r, hd, H); if (st.n >= SPINE_PX) stack.set(f, `${st.n}px over the head's depth ${+hd.z.toFixed(2)} (${[...st.bad].join(", ")})`); }
      }
      if (vn === "BACK" && !beast && !rider) {
        const s = spineCross(r, fig, sideTop + fig.BOX.oy);
        armSeen++;
        if (s.n >= SPINE_PX) spine.set(f, `${s.n.toFixed(0)}px (${[...s.who].join(", ")})`);
      }
    }
    if (isl.length) R.fail.push(`${vn} islands: ${isl.slice(0, 4).join("; ")}${isl.length > 4 ? ` (+${isl.length - 4} more)` : ""}`);
    if (gnd.length) R.fail.push(`${vn} ground: ${gnd.slice(0, 4).join("; ")}${gnd.length > 4 ? " ..." : ""} (against the side walk's lowest pixels, ${Math.min(...sideBotF)}..${Math.max(...sideBotF)})`);
    if (box.length) R.fail.push(`${vn} box: cut off at the BOX edge ${box.slice(0, 3).join("; ")}`);
    if (unknown.size) R.fail.push(`${vn} legend: stamp letters with no legend entry: ${[...unknown].join(" ")}`);
    if (face.size) R.fail.push(`${vn} face: covered in ${face.size}/${vw.n} frames, #${[...face.keys()].join(" #")}, e.g. #${[...face][0][0]} ${[...face][0][1]}`);
    if (spine.size) R.fail.push(`${vn} spine: an arm across the back in ${spine.size}/${vw.n} frames, #${[...spine.keys()].join(" #")}, e.g. #${[...spine][0][0]} ${[...spine][0][1]}`);
    if (stack.size) R.fail.push(`${vn} stack: an arm drawn over the head's depth (the side stack reused) in ${stack.size}/${vw.n} frames #${[...stack.keys()].join(" #")}, e.g. ${[...stack][0][1]}`);
    if (!beast && vn === "FRONT" && !headSeen) R.unchecked.push(`${vn} face (no head stamp found: tag it px.tag("head"))`);
    if (vn === "BACK" && HUNCHED.has(t.type)) R.unchecked.push("BACK stack (hunched: the head sits under the hump by design)");
    if (vn === "BACK" && (beast || rider)) R.unchecked.push(`BACK spine (${beast ? "four-legged" : "rider"})`);
    R[vn] = best;
  }
  // a colour the side shows in quantity that NEITHER view ever shows: a weapon or a piece of kit dropped
  // (one hidden from behind only is normal: faces, chest pieces)
  if (R.FRONT && R.BACK) for (const [k, n] of sideCols) if (n >= MISSING_SIDE && (R.FRONT.get(k) || 0) <= MISSING_VIEW && (R.BACK.get(k) || 0) <= MISSING_VIEW)
    R.warn.push(`missing from both views: ${hexOf(k)} (the side walk shows ~${Math.round(n)}px of it a frame)`);
  delete R.FRONT; delete R.BACK;
  R.accepted = R.fail.filter((x) => ACCEPTED[`${t.type} ${x.split(":")[0]}`]).map((x) => `${x.split(":")[0]} (${ACCEPTED[`${t.type} ${x.split(":")[0]}`]})`);
  R.fail = R.fail.filter((x) => !ACCEPTED[`${t.type} ${x.split(":")[0]}`]);
  fails += R.fail.length; warns += R.warn.length;
}

// ---- out ------------------------------------------------------------------------------------------
for (const R of report) {
  const bad = R.fail.length, w = q.warn === "0" ? 0 : R.warn.length;
  if (q.quiet && !bad && !w) continue;
  console.log(`${bad ? "FAIL" : w ? "warn" : " ok "} ${R.type}${R.type !== R.name ? ` (${R.name})` : ""}`);
  for (const s of R.fail) console.log("   FAIL", s);
  if (q.warn !== "0") for (const s of R.warn) console.log("   warn", s);
  if (!q.quiet) for (const s of R.unchecked) console.log("   NOT CHECKED", s);
  if (!q.quiet) for (const s of R.accepted) console.log("   accepted", s);
}
const nb = report.filter((r) => r.fail.length).length;
console.log(`\n${report.length} figures: ${nb} fail (${fails} faults), ${warns} warnings`);
if (q.json) fs.writeFileSync(q.json, JSON.stringify(report, null, 1));
if (fails) process.exit(1);
