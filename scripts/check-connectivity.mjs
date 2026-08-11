// Finds "floating body parts": for each sprite frame, count 8-connected
// components of non-empty cells. A humanoid should be ONE piece — every
// extra island is a limb or weapon that came loose.
//   node scripts/check-connectivity.mjs [name ...]

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { SPRITES } = await import("../src/sprites/sprites.js");

const names = process.argv.slice(2);
const picks = names.length ? names : Object.keys(SPRITES);

let worst = 0;
for (const name of picks) {
  const spr = SPRITES[name];
  if (!spr) { console.log(`no sprite: ${name}`); continue; }
  const sheets = [["walk", spr.frames], ["fight", spr.fight || []]];
  for (const [label, frames] of sheets) {
    frames.forEach((map, fi) => {
      const h = map.length, w = map[0].length;
      const seen = Array.from({ length: h }, () => new Array(w).fill(false));
      const comps = [];
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (map[r][c] === "." || seen[r][c]) continue;
          // flood fill
          let size = 0;
          const stack = [[r, c]];
          seen[r][c] = true;
          let minR = r, maxR = r, minC = c, maxC = c;
          while (stack.length) {
            const [cr, cc] = stack.pop();
            size++;
            minR = Math.min(minR, cr); maxR = Math.max(maxR, cr);
            minC = Math.min(minC, cc); maxC = Math.max(maxC, cc);
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = cr + dr, nc = cc + dc;
                if (nr < 0 || nc < 0 || nr >= h || nc >= w) continue;
                if (seen[nr][nc] || map[nr][nc] === ".") continue;
                seen[nr][nc] = true;
                stack.push([nr, nc]);
              }
            }
          }
          comps.push({ size, at: `r${minR}-${maxR},c${minC}-${maxC}` });
        }
      }
      if (comps.length > 1) {
        comps.sort((a, b) => b.size - a.size);
        const strays = comps.slice(1).map((s) => `${s.size}px@${s.at}`).join("  ");
        console.log(`${name} ${label}[${fi}]: ${comps.length} pieces — strays: ${strays}`);
        worst = Math.max(worst, comps.length - 1);
      }
    });
  }
}
console.log(worst === 0 ? "✔ every frame is one connected piece" : `worst frame has ${worst} loose parts`);
