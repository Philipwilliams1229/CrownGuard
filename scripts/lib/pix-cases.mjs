// Shared by scripts/pix-regress.mjs and scripts/pix-audit.mjs: loads the pixel sculptor from a
// source root (the repo, or a copy of HEAD's src for a before / after) and lists every figure,
// clip, frame and variant to bake. No browser: node only.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const GENERIC_VARIANTS = ["base", "a", "b", "aa", "ab", "ba", "bb", "bare", "bolt", "errant", "gryphon", "guard", "loose", "rage", "yeoman", "base|long", "aa|long", "long"];
export const AIMS = ["@-40", "@40"];

export const load = async (root) => {
  const dir = path.join(root, "src/render/pix"), imp = (f) => import(pathToFileURL(path.join(dir, f)).href);
  const { Pix } = await imp("pix.js"), rig = await imp("rig.js");
  const figs = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/^(fig-|bird-).*\.js$/.test(f)) continue;
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    let mod; try { mod = await imp(f); } catch (e) { figs.push({ name: f, error: String(e.message).split("\n")[0] }); continue; }
    if (!mod.CLIPS || !mod.draw) continue;
    figs.push({ name: f.replace(/\.js$/, ""), mod, vary: /variant/.test(src), aims: /@/.test(src) });
  }
  return { dir, root, Pix, rig, figs, imp };
};

// every baked frame of one figure: returns [{ key, run() -> { px, img, info, fx } }]
export const figCases = (L, fig, o = {}) => {
  const { mod } = fig, out = [];
  const variants = [{ v: "", flips: [false, true] }];
  if (fig.vary && !o.light) for (const v of GENERIC_VARIANTS) variants.push({ v, flips: [false] });
  if (fig.aims) for (const a of AIMS) { variants.push({ v: a, flips: [false] }); if (!o.light) variants.push({ v: "base" + a, flips: [false] }, { v: "aa|long" + a, flips: [false] }); }
  if (o.light) { const keep = variants.filter((x) => x.v === "" || AIMS.includes(x.v)); variants.length = 0; variants.push(...keep.map((x) => ({ ...x, flips: [false] }))); }
  for (const { v, flips } of variants) for (const flip of flips) for (const [clipName, clip] of Object.entries(mod.CLIPS)) {
    for (let f = 0; f < clip.n; f++) {
      out.push({
        key: `${fig.name}|${clipName}|${v}|${flip ? "L" : "R"}|${f}`, fig: fig.name, clip: clipName, frame: f, variant: v,
        run: (stats) => {
          const F = L.rig.frameAt(clip, f, mod.BONES);
          const px = new L.Pix(mod.BOX.w, mod.BOX.h, mod.BOX.ox, mod.BOX.oy);
          const info = mod.draw(px, F, { flip, variant: v }) || {};
          const lights = (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02);
          const img = px.resolve({ flip, lights, stats, keepLv: !!stats });
          let fx = null;
          if (mod.fx) { const fxp = new L.Pix(mod.BOX.w, mod.BOX.h, mod.BOX.ox, mod.BOX.oy); mod.fx(fxp, F, info, clipName); fx = fxp.resolve({ line: "tint" }); }
          return { px, img, info, fx };
        },
      });
    }
  }
  return out;
};
