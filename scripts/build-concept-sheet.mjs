// Packs the concept sheet (concept-sheet.html + concept/*.js + today's rigs
// strip) into ONE self-contained page, for publishing or sending:
//   node scripts/build-concept-sheet.mjs        -> concept/dist/crownguard-sprite-concepts.html
// Needs .shots/cpt_now.png (open /concept-now.html on the dev server once).
import { build } from "esbuild";
import fs from "node:fs";

const out = await build({ entryPoints: ["concept/sheet.js"], bundle: true, format: "iife", minify: true, write: false, target: "es2020" });
const js = out.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
const png = fs.readFileSync(".shots/cpt_now.png").toString("base64");
let html = fs.readFileSync("concept-sheet.html", "utf8");
const swap = (from, to) => { if (!html.includes(from)) throw new Error("not found: " + from); html = html.replace(from, () => to); };
swap('window.NOW_SRC = "/.shots/cpt_now.png";', `window.NOW_SRC = "data:image/png;base64,${png}";`);
swap('<script type="module" src="/concept/sheet.js"></script>', `<script>${js}</script>`);
fs.mkdirSync("concept/dist", { recursive: true });
fs.writeFileSync("concept/dist/crownguard-sprite-concepts.html", html);
console.log("concept/dist/crownguard-sprite-concepts.html", (html.length / 1024).toFixed(0) + " KB");
