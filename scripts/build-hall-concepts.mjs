// Packs the tower-buildings concept sheet (hall-concepts.html + concept/halls.js + the
// strip of today's halls) into ONE self-contained page, for publishing or sending:
//   node scripts/build-hall-concepts.mjs      -> concept/dist/crownguard-tower-concepts.html
// Needs .shots/hallc_now.png (open /hall-now.html on the dev server once).
import { build } from "esbuild";
import fs from "node:fs";

const out = await build({ entryPoints: ["concept/halls.js"], bundle: true, format: "iife", minify: true, write: false, target: "es2020" });
const js = out.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
const png = fs.readFileSync(".shots/hallc_now.png").toString("base64");
let html = fs.readFileSync("hall-concepts.html", "utf8");
const swap = (from, to) => { if (!html.includes(from)) throw new Error("not found: " + from); html = html.replace(from, () => to); };
swap('window.HALL_NOW_SRC = "/.shots/hallc_now.png";', `window.HALL_NOW_SRC = "data:image/png;base64,${png}";`);
swap('<script type="module" src="/concept/halls.js"></script>', `<script>${js}</script>`);
fs.mkdirSync("concept/dist", { recursive: true });
fs.writeFileSync("concept/dist/crownguard-tower-concepts.html", html);
console.log("concept/dist/crownguard-tower-concepts.html", (html.length / 1024).toFixed(0) + " KB");
