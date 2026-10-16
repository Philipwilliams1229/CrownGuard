// Checks src/native/keep.js, the iOS app's save copy, on a fake localStorage
// and a fake native store: a fresh install, a wipe put back, an erase that
// stays erased, clear(), and a store that never answers.
//   node scripts/keep-test.mjs
import { startKeeping, STAMP } from "../src/native/keep.js";

class Store {
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
const native = () => {
  const n = { value: null, get: async () => n.value, set: async (v) => { n.value = v; } };
  return n;
};
const copyOf = (n) => (n.value ? JSON.parse(n.value).keys : null);
let fails = 0;
const check = (what, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) fails++; };

// a fresh install
let ls = new Store(), n = native();
let k = await startKeeping(n, ls);
check("fresh: stamp set", ls.getItem(STAMP) != null);
await k.flush();
check("fresh: empty copy kept", JSON.stringify(copyOf(n)) === "{}");

// the game saves
ls.setItem("crownguard.campaign", "{\"won\":3}");
ls.setItem("cg-type", "tidy3");
await k.flush();
check("save: copy follows", copyOf(n)["crownguard.campaign"] === "{\"won\":3}" && copyOf(n)["cg-type"] === "tidy3");
check("save: stamp not in the copy", !(STAMP in copyOf(n)));
k.stop();

// iOS wipes the web view's storage; the app launches again
ls = new Store();
k = await startKeeping(n, ls);
check("wipe: save put back", ls.getItem("crownguard.campaign") === "{\"won\":3}" && ls.getItem("cg-type") === "tidy3");
check("wipe: stamp set again", ls.getItem(STAMP) != null);
k.stop();

// the player erases everything; the page reloads before the copy catches up
ls.removeItem("crownguard.campaign");
ls.removeItem("cg-type");
const before = n.value;
k = await startKeeping(n, ls);
check("erase: nothing comes back", ls.getItem("crownguard.campaign") == null && ls.getItem("cg-type") == null);
await k.flush();
check("erase: copy follows", before !== n.value && JSON.stringify(copyOf(n)) === "{}");

// clear() keeps the stamp
ls.setItem("crownguard.x", "1");
ls.clear();
check("clear: stamp stays", ls.getItem(STAMP) != null);
await k.flush();
check("clear: copy empty", JSON.stringify(copyOf(n)) === "{}");
k.stop();

// writes after stop() are not watched
ls.setItem("crownguard.y", "2");
check("stop: hooks gone", Object.getPrototypeOf(ls).setItem === Store.prototype.setItem);

// a native store that never answers still lets the game launch
const t0 = Date.now();
const hang = { get: () => new Promise(() => {}), set: () => new Promise(() => {}) };
k = await startKeeping(hang, new Store());
check(`hang: launch goes on (${Date.now() - t0} ms)`, Date.now() - t0 < 4000);
k.stop();

console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
