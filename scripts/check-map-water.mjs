// Does the campaign map tell the truth about water? Every level whose realm
// has a river (data/maps.js rivers) must have a map river through its
// waypoint; every level with ponds/bogs a lake or pool beside it (within
// ~13 units, edge to waypoint); and no river may pass within 8 units of a
// dry level. Run after adding a level or moving water in src/ui/mapArt.js:
//   node scripts/check-map-water.mjs

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ getContext: () => null }) };
const root = process.cwd();
const { LEVELS } = await import(root + "/src/data/campaign.js");
const { REALMS } = await import(root + "/src/data/maps.js");
const { RIVERS } = await import(root + "/src/ui/mapArt.js");
const src = (await import("fs")).readFileSync(root + "/src/ui/mapArt.js", "utf8");
const meres = [...src.matchAll(/\{ x: (-?[\d.]+), y: (-?[\d.]+), rx: ([\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2], rx: +m[3] }));
let bad = 0;
for (const lv of LEVELS) {
  const r = REALMS[lv.realm], [x, y] = lv.pos;
  const dR = Math.min(...RIVERS.map((rv) => Math.min(...rv.pts.map(([px, py]) => Math.hypot(px - x, py - y)))));
  const dM = Math.min(...meres.map((m) => Math.hypot(x - m.x, y - m.y) - m.rx));
  const hasR = (r.rivers || []).length > 0, hasP = (r.ponds || []).length > 0;
  const ok = (hasR ? dR < 2 : dR > 8) && (!hasP || hasR || dM < 13);
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${lv.id.padEnd(11)} river:${hasR ? "yes" : "no "} ponds:${hasP ? "yes" : "no "}  nearest river ${dR.toFixed(1).padStart(5)}  nearest lake ${dM.toFixed(1).padStart(6)}`);
}
console.log(bad ? `${bad} mismatches` : "every level's water matches the map"); if (bad) process.exitCode = 1;
