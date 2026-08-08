// Sanity-checks every sprite map: all rows the same length, all frames the
// same size, every non-'.' character present in the palette, ASCII only.
// Run after touching any sprite art: node scripts/check-sprites.mjs

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { SPRITES } = await import("../src/sprites/sprites.js");

// Unknown palette letters merely draw nothing (drawSprite skips them), and
// some of the original art leans on that — so they're warnings, summarized.
// Broken geometry and non-ascii are the real, drawing-breaking errors.
let bad = 0;
const warns = new Map();
for (const [name, spr] of Object.entries(SPRITES)) {
  const sheets = [["frames", spr.frames], ["fight", spr.fight]].filter(([, f]) => f);
  let dims = null;
  for (const [label, frames] of sheets) {
    frames.forEach((frame, fi) => {
      const w = frame[0].length, h = frame.length;
      if (!dims) dims = [w, h];
      if (w !== dims[0] || h !== dims[1]) {
        console.log(`✘ ${name} ${label}[${fi}]: ${w}x${h}, expected ${dims[0]}x${dims[1]}`);
        bad++;
      }
      frame.forEach((row, ri) => {
        if (row.length !== w) {
          console.log(`✘ ${name} ${label}[${fi}] row ${ri}: length ${row.length}, expected ${w}`);
          bad++;
        }
        for (const ch of row) {
          if (ch === ".") continue;
          if (ch.charCodeAt(0) > 126) {
            console.log(`✘ ${name} ${label}[${fi}] row ${ri}: non-ascii '${ch}'`);
            bad++;
          } else if (spr.pal && !(ch in spr.pal)) {
            warns.set(name, (warns.get(name) || new Set()).add(ch));
          }
        }
      });
    });
  }
}
for (const [name, chars] of warns) console.log(`~ ${name}: unmapped letters (drawn as nothing): ${[...chars].join(" ")}`);
console.log(bad === 0 ? `✔ all ${Object.keys(SPRITES).length} sprites geometrically clean` : `${bad} hard errors`);
process.exit(bad === 0 ? 0 : 1);
