// The pixel sculptor's audit. Part 1: the SEAM SCORE, how rough a figure's joints are.
// Over every clip and frame (default look, facing right; shooters also at aim @-40 / @40) it counts
//   pairs  neighbouring pixels of one creature (the same colour family) that sit 2+ tones apart
//          (a lit limb beside its own shadowed barrel: the "tube pasted on" look)
//   cast   shadows dropped by one part of a creature on another of the same family
//   edge   edge darkening between two parts of one creature
// seam = pairs + cast + edge, averaged per frame (the default ranking: a big figure has more joints
// to be rough at); `by=rel` ranks per 1000 figure pixels instead. Worst first. Hand-pixelled cells (fix) are ignored.
//   node scripts/pix-audit.mjs [top=20] [by=rel] [only=mammoth,troll] [root=<dir holding src/>] [json=out.json]
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const { load, figCases } = await import("./lib/pix-cases.mjs");
const L = await load(q.root || ROOT);
const { sameFamily } = await L.imp("pix.js");
const only = q.only ? q.only.split(",") : null, top = Number(q.top) || 20;
const rows = [];
for (const fig of L.figs) {
  if (fig.error || (only && !only.some((s) => fig.name.includes(s)))) continue;
  let frames = 0, pairs = 0, cast = 0, edge = 0, px = 0;
  for (const c of figCases(L, fig, { light: true })) {
    const st = { cast: 0, edge: 0 }, r = c.run(st), P = r.px, lv = P._lv, w = P.w, h = P.h;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i, m = P.m[k];
      if (m < 0) continue;
      px++;
      if (P.fix[k] >= 0) continue;
      for (const q2 of [i + 1 < w ? k + 1 : -1, j + 1 < h ? k + w : -1]) {
        if (q2 < 0 || P.m[q2] < 0 || P.fix[q2] >= 0) continue;
        if (Math.abs(lv[k] - lv[q2]) >= 2 && sameFamily(m, P.m[q2])) pairs++;
      }
    }
    cast += st.cast; edge += st.edge; frames++;
  }
  if (!frames) continue;
  const seam = pairs + cast + edge;
  rows.push({ fig: fig.name.replace(/^fig-/, ""), frames, px: Math.round(px / frames), pairs: pairs / frames, cast: cast / frames, edge: edge / frames, seam: seam / frames, score: (seam / px) * 1000 });
}
const key = q.by === "rel" ? "score" : "seam";
rows.sort((a, b) => b[key] - a[key]);
const f1 = (x) => x.toFixed(1).padStart(7);
console.log("rank figure          frames  px/fr   pairs    cast    edge   seam/fr  seam per 1000 px");
rows.slice(0, top).forEach((r, i) => console.log(String(i + 1).padStart(4), r.fig.padEnd(15), String(r.frames).padStart(6), String(r.px).padStart(6), f1(r.pairs), f1(r.cast), f1(r.edge), f1(r.seam), "  ", r.score.toFixed(2)));
console.log(`(${rows.length} figures scored)`);
if (q.json) fs.writeFileSync(q.json, JSON.stringify(rows, null, 1));
