// Proves the pixel sculptor still draws every figure the same: bakes every figure's clips, frames,
// looks and aim variants (and the birds, the ballista, every hall form) and hashes the pixels, the
// buffers behind them and each figure's marks / lights.
//   node scripts/pix-regress.mjs hash out=a.json [root=<dir holding src/>]      write the hashes
//   node scripts/pix-regress.mjs diff a.json b.json                              compare two runs
//   only=mammoth,eagle   limit to figures whose name contains one of these;  halls=0 skips the halls
// Before / after a kit change: `git archive HEAD src | tar -x -C <dir>` (plus package.json), hash
// root=<dir> and the repo, then diff. Zero differences = the new options are off by default.
import fs from "node:fs";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const args = process.argv.slice(2);
if (args[0] === "diff") {
  const A = JSON.parse(fs.readFileSync(args[1])), B = JSON.parse(fs.readFileSync(args[2]));
  const bad = {}, keys = new Set([...Object.keys(A), ...Object.keys(B)]);
  for (const k of keys) if (A[k] !== B[k]) { const g = k.split("|")[0]; (bad[g] ||= []).push(k); }
  console.log(`${keys.size} cases compared`);
  const gs = Object.keys(bad);
  if (!gs.length) console.log("0 differences");
  else for (const g of gs) console.log(`${bad[g].length} differ in ${g}, first: ${bad[g][0]}`);
  process.exit(gs.length ? 1 : 0);
}
const q = Object.fromEntries(args.map((a) => a.split("=")));
const root = q.root || ROOT, only = q.only ? q.only.split(",") : null;
const { load, figCases } = await import("./lib/pix-cases.mjs");
const L = await load(root);
const sha = (...bufs) => { const h = crypto.createHash("sha1"); for (const b of bufs) h.update(typeof b === "string" ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength)); return h.digest("hex").slice(0, 16); };
// every resolve() in a case folds into one hash: its pixels and the old buffers behind them
let LOG = [];
const orig = L.Pix.prototype.resolve;
L.Pix.prototype.resolve = function (o) {
  const r = orig.call(this, o);
  LOG.push(sha(r.data, this.m, this.z, this.nx, this.ny, this.nz, this.bias, this.vb, this.fix, this.pid, this.cast, this.flag, this.floor));
  return r;
};
const plain = (x) => JSON.stringify(x, (k, v) => (typeof v === "function" ? undefined : typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v));
const out = {};
const done = (key, extra = "") => { out[key] = sha(LOG.join(",") + extra); LOG = []; };
let n = 0;
for (const fig of L.figs) {
  if (fig.error) { out[fig.name + "|load"] = "ERR " + fig.error; continue; }
  if (only && !only.some((s) => fig.name.includes(s))) continue;
  for (const c of figCases(L, fig)) {
    LOG = [];
    try { const r = c.run(); done(c.key, plain(r.info)); } catch (e) { LOG = []; out[c.key] = "ERR " + String(e.message).split("\n")[0]; }
    if (++n % 2000 === 0) console.error(n, "cases", c.fig);
  }
}
const tryAll = async (name, fn) => { LOG = []; try { await fn(); } catch (e) { out[name + "|ERR"] = String(e.message).split("\n")[0]; } };
if (!only) {
  await tryAll("falcon", async () => {
    const m = await L.imp("bird-falcon.js");
    for (const kind of ["hawk", "king", "storm"]) for (const flip of [false, true]) {
      for (const pose of ["tuck", "up", "mid", "down", "strike"]) for (let i = 0; i < 8; i++) { LOG = []; m.falconImage(pose, i, kind, flip); done(`bird-falcon|${kind}|${pose}|${i}|${flip}`); }
      for (const hood of [false, true]) { LOG = []; m.perchedImage(kind, hood, flip); done(`bird-falcon|perched|${kind}|${hood}|${flip}`); }
    }
  });
  await tryAll("ballista", async () => {
    const m = await L.imp("castle-ballista.js");
    for (let s = 0; s <= 4; s++) for (let p = 0; p < m.PITCHES.length; p++) for (const burn of [false, true]) for (const flip of [false, true]) { LOG = []; m.ballistaPix(s, p, burn, flip); done(`castle-ballista|${s}|${p}|${burn}|${flip}`); }
  });
  if (q.halls !== "0") await tryAll("halls", async () => {
    const kit = await L.imp("hall-kit.js");
    const FORMS = [{ level: 1 }, { level: 2 }, { level: 3 }, ...["a", "aa", "ab", "b", "ba", "bb"].map((f) => ({ level: 3, branch: f[0], rank4: f[1] || null }))];
    for (const f of fs.readdirSync(L.dir).sort()) {
      if (!/^hall-.*\.js$/.test(f) || f === "hall-kit.js") continue;
      const m = await L.imp(f);
      if (!m.build || !m.BOX) continue;
      for (const form of FORMS) for (const seed of [0, 1]) for (const flip of [false, true]) {
        const key = `${f.replace(".js", "")}|${form.level}${form.branch || ""}${form.rank4 || ""}|${seed}|${flip}`;
        LOG = [];
        try { const b = kit.bakeHall(m.BOX, m.build({ ...form, seed, style: "B" }), { flip }); done(key, plain({ l: b.spec.lights, live: b.spec.live, crew: b.spec.crew })); } catch (e) { LOG = []; out[key] = "ERR " + String(e.message).split("\n")[0]; }
      }
    }
  });
}
const file = q.out || "pix-hashes.json";
fs.writeFileSync(file, JSON.stringify(out));
const errs = Object.entries(out).filter(([, v]) => String(v).startsWith("ERR"));
console.log(`${Object.keys(out).length} cases hashed -> ${file}; ${errs.length} errors (same in both runs is fine)`);
for (const [k, v] of errs.slice(0, 5)) console.log("  ", k, v);
