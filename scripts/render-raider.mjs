
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { SPRITES } = await import("../src/sprites/sprites.js");
const { RAIDER_HIFI } = await import("./goblin-concepts.mjs");

const entries = [
  ["current", SPRITES.goblin],
  ["skeleton", SPRITES.skeleton],
  ["wraith", SPRITES.wraith],
  ["hooded", RAIDER_HIFI.raiderHooded],
  ["bare", RAIDER_HIFI.raiderBare],
];
const SC = 8, PAD = 12;
const hex = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const W = entries.reduce((a,[,s]) => a + s.frames[0][0].length * SC + PAD, PAD);
const H = Math.max(...entries.map(([,s]) => s.frames[0].length)) * SC + PAD*2;
const img = new Uint8Array(W*H*3);
for (let i=0;i<W*H;i++) img.set([105,135,78], i*3);
let cx = PAD;
for (const [,spr] of entries) {
  const map = spr.frames[0];
  for (let r=0;r<map.length;r++) for (let c=0;c<map[r].length;c++) {
    const ch = map[r][c];
    if (ch === "." || !(ch in spr.pal)) continue;
    const rgb = hex(spr.pal[ch]);
    for (let dy=0;dy<SC;dy++) for (let dx=0;dx<SC;dx++) {
      const x = cx + c*SC + dx, y = PAD + r*SC + dy;
      img.set(rgb, (y*W+x)*3);
    }
  }
  cx += map[0].length * SC + PAD;
}
const out = process.argv[2];
writeFileSync(out + ".ppm", Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), Buffer.from(img)]));
execSync(`sips -s format png ${JSON.stringify(out + ".ppm")} --out ${JSON.stringify(out)} >/dev/null`);
unlinkSync(out + ".ppm");
console.log("wrote", out);
