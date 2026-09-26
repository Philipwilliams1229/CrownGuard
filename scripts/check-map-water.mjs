// Does the campaign map tell the truth about water? Every level whose realm
// has a river (data/maps.js rivers) must have a map river through its
// waypoint; every level with ponds/bogs a lake or pool beside it (within
// ~22 units, edge to waypoint); and no river may pass within 14 units of a
// dry level; a coastal realm (map.coast) must stand within ~24 units of
// its country's shore. (Distances are in map units; the map was laid out
// ~1.7x larger on 2026-09-25 and these grew with it.) A level with no
// waypoint yet (mapLayout.js LEVEL_POS) is listed as not placed. Run after adding a level or moving water in src/ui/mapArt.js:
//   node scripts/check-map-water.mjs

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ getContext: () => null }) };
const root = process.cwd();
const { LEVELS } = await import(root + "/src/data/campaign.js");
const { REALMS } = await import(root + "/src/data/maps.js");
const { RIVERS } = await import(root + "/src/ui/mapArt.js");
const src = (await import("fs")).readFileSync(root + "/src/ui/mapArt.js", "utf8");
const meres = [...src.matchAll(/\{ x: (-?[\d.]+), y: (-?[\d.]+), rx: ([\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2], rx: +m[3] }));
const { CHAPTERS } = await import(root + "/src/data/campaign.js");
// sample a chapter's coastline (an SVG path of M and C commands)
const shore = (d) => {
  const nums = d.match(/-?[\d.]+/g).map(Number), out = [];
  let [x, y] = nums.slice(0, 2);
  for (let i = 2; i + 5 < nums.length; i += 6) {
    const [a, b, c, e, f, g] = nums.slice(i, i + 6);
    for (let t = 0; t <= 1; t += 0.05) {
      const u = 1 - t;
      out.push([u * u * u * x + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * f, u * u * u * y + 3 * u * u * t * b + 3 * u * t * t * e + t * t * t * g]);
    }
    [x, y] = [f, g];
  }
  return out;
};
let bad = 0;
for (const lv of LEVELS) {
  if (!lv.pos) { console.log(`--  ${lv.id.padEnd(11)} not placed on the map yet`); continue; }
  const r = REALMS[lv.realm], [x, y] = lv.pos;
  const dR = Math.min(...RIVERS.map((rv) => Math.min(...rv.pts.map(([px, py]) => Math.hypot(px - x, py - y)))));
  const dM = Math.min(...meres.map((m) => Math.hypot(x - m.x, y - m.y) - m.rx));
  const hasR = (r.rivers || []).length > 0, hasP = (r.ponds || []).length > 0;
  const dC = Math.min(...shore(lv.chapter.region).map(([px, py]) => Math.hypot(px - x, py - y)));
  const ok = (hasR ? dR < 2 : dR > 14) && (!hasP || hasR || dM < 22) && (!r.coast || dC < 24);
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${lv.id.padEnd(11)} river:${hasR ? "yes" : "no "} ponds:${hasP ? "yes" : "no "} coast:${r.coast ? `yes (${dC.toFixed(0)} from shore)` : "no"}  nearest river ${dR.toFixed(1).padStart(5)}  nearest lake ${dM.toFixed(1).padStart(6)}`);
}
console.log(bad ? `${bad} mismatches` : "every level's water matches the map"); if (bad) process.exitCode = 1;
