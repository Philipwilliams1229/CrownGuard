// ============ TYPE ============
// Every font in the game, in one place. Nothing else names a font family:
//  - the DOM reads CSS variables set on :root here (--mark, --title, --head,
//    --display, --menu, --numeric, --body, --map, and --num-adjust); theme.js
//    re-exports them as FONT, DISPLAY, TITLE, HEAD... for inline styles;
//  - canvas code (the board's banners and notices, the campaign map's label
//    measure) can't read CSS variables, so it asks canvasFont().
//
// ROLES (a "slot" is a place in the game; each type option gives every slot
// a face):
//   mark   the CROWNGUARD wordmark on the title screen
//   title  screen and card titles (War Council, Field Guide, the victory and
//          defeat banners, FREE PLAY)
//   head   the campaign map's own heads (THE CAMPAIGN, the chosen level's
//          name): today Verdana bold, in every other option the title face
//   ui     headings, labels, the HUD's planks and buttons (--display). Today
//          that is Silkscreen, which draws its lowercase as capitals, so an
//          option whose ui face has true lowercase sets `caps` (hud.css then
//          sets the same places in capitals: [data-type-caps])
//   menu   the menu buttons on the title screen, campaign map, War Council
//   num    anything with digits: gold, lives, prices, waves (--numeric)
//   body   tales, blurbs, long text, a card's stat lines (--body)
//   map    the campaign map's scroll labels and chapter ribbons (SVG)
//   board  text painted on the battle canvas (wave banners, notices, PAUSED)
// Not a role: the board's floating numbers (+12 gold, -3 at the wall) are a
// hand-drawn 5x7 bitmap in render/fx.js, part of the board's pixel art, the
// same in every option.
//
// OPTIONS: "current" is today's exact look (the default until the owner
// picks); the others are whole identities of two or three Google Fonts
// families. Pick one with ?type=<id> (remembered in localStorage "cg-type");
// ?type=current goes back. type-lab.html shows them side by side and
// scripts/type-shots.mjs shoots the real game in each.
//
// SIZE TUNING: layouts were built for today's faces, so a new face is never
// used at its raw size. Each Google face is registered again under an alias
// ("cg <family> <size>") whose @font-face carries `size-adjust`, so the
// scale travels with the face into every rule, inline style, SVG text and
// canvas that uses it, and nothing inherits the wrong correction. Each alias
// claims the whole weight range its weights cover (a one-weight face answers
// every weight), so no browser ever smears a face into a faux bold.
//
// DIGITS: an option may name one `digits` face that draws every digit in
// every slot (the other faces' aliases leave 0-9 out of their unicode-range,
// and the digits alias covers only 0-9), so a price, a stat line and a tale
// count in the same unmistakable figures; `sizes` sizes it per slot, `keep`
// lists slots that keep their own face's digits, `only` the slots it serves. A face may also `lack` other
// characters (Silkscreen's "&" reads as "$"): they fall through to the next
// face in the slot's stack, and every stack ends with the option's body face.
//
// WHEN THE OWNER PICKS: set DEFAULT_TYPE, and move the chosen option's alias
// @font-face rules (fetched here at run time) into a static stylesheet with
// <link rel=preload> for its woff2 files, replacing index.html's link, so the
// first paint never waits behind the bundle.

const GOOGLE = "https://fonts.googleapis.com/css2";
const FALLBACK = "Verdana, Geneva, sans-serif";
const DIGITS = "0123456789";

// a face from Google Fonts at a size factor; `wght` lists the weights to
// fetch; `lacks` lists characters it must not draw (they fall through); `lh`
// is the height `line-height: normal` gives it, in ems (today's Verdana: 1.215),
// for a face whose own ascent and descent stand taller (set with the
// ascent/descent overrides, which Chrome and Firefox honour; Safari keeps the
// face's own, a pixel or two taller)
const face = (family, size = 1, wght = [400], lacks = "", lh = 0) => ({ family, size, wght, lacks, lh });
// a face's own ascent and descent (em), for `lh`: measured in type-lab
const METRICS = { Grenze: [1.1, 0.38], "Grenze Gotisch": [1.1, 0.38], Alegreya: [1.02, 0.35], Cinzel: [0.98, 0.37] };
const VERDANA_LH = 1.215;

export const TYPES = {
  // Today's look, family for family (the style guide's rules: Silkscreen
  // for words, Press Start 2P with font-size-adjust for digits, Verdana for
  // long text, the system monospace on the board).
  current: {
    name: "Current",
    sketch: "Today's mix of four: Silkscreen words, Press Start 2P digits, Verdana text, monospace on the board.",
    plain: {
      mark: FALLBACK,
      title: `"Silkscreen", ${FALLBACK}`,
      head: FALLBACK,
      ui: `"Silkscreen", ${FALLBACK}`,
      menu: FALLBACK,
      num: `"Press Start 2P", "Silkscreen", Verdana, monospace`,
      body: FALLBACK,
      map: FALLBACK,
      board: "monospace",
    },
    numAdjust: "0.58",
  },
  // All pixel: the Jersey family for every word, on a 25px grid for the big
  // ones and a 15px grid for the rest; Press Start 2P, today's HUD digits,
  // for every number (Jersey's own 6 and 9 blur into 8 at small sizes on a
  // 1x screen).
  keep: {
    name: "Arcade Keep",
    sketch: "All pixel: chunky Jersey capitals for every word, the HUD's own Press Start 2P for every number.",
    caps: true,
    // (in the chips the size today's digits have; in words, the height of
    // Jersey's capitals)
    digits: { ...face("Press Start 2P", 0.7), sizes: { num: 0.77 } },
    slots: {
      mark: face("Jersey 25", 1.15),
      title: face("Jersey 25", 1.05),
      ui: face("Jersey 15", 1.13),
      menu: face("Jersey 15", 1.2),
      num: face("Jersey 15", 1.2),
      body: face("Jersey 15", 1.2),
      map: face("Jersey 15", 1.2),
      board: face("Jersey 15", 1.3),
    },
  },
  // Gothic throughout, from one foundry's pair: Grenze Gotisch, a blocky
  // carved blackletter, for the crown's name, every title and head; Grenze,
  // its roman sister (a narrow book hand with gothic bones), for labels,
  // numbers and every word you read. The pixel blackletters (Jacquard,
  // Jacquarda Bastarda) lose their hairlines under ~40px, and a pixel text
  // face under a gothic title read as a terminal.
  letter: {
    name: "Black Letter",
    sketch: "Gothic throughout: carved blackletter for names and titles, its narrow roman sister for every word and number.",
    caps: true,
    features: '"lnum"',
    // Grenze's own figures are old-style (a 0 stands like an o), and text
    // baked on a canvas can't ask for its lining ones: the board's digits
    // come from Germania One, a condensed lining face of the same weight
    digits: { ...face("Germania One", 0.94), only: ["board"] },
    slots: {
      mark: face("Grenze Gotisch", 1.05, [800]),
      title: face("Grenze Gotisch", 1.05, [700]),
      ui: face("Grenze", 1.12, [500, 700]),
      menu: face("Grenze", 1.12, [600]),
      num: face("Grenze", 1.12, [600]),
      body: face("Grenze", 1.12, [400, 700], "", VERDANA_LH),
      map: face("Grenze", 1.1, [700]),
      board: face("Grenze", 1.05, [700]),
    },
  },
  // The storybook: carved Roman capitals for names and labels, a
  // calligrapher's serif for tales and numbers (set in its lining figures,
  // `features`: its default hanging figures make 0 a small o and 1 a
  // small-cap I).
  illuminated: {
    name: "Illuminated",
    sketch: "A storybook: carved Roman capitals for names and labels, a calligrapher's serif for tales and numbers.",
    features: '"lnum"',
    // Cinzel's 1 is an I ("1x" read "IX"): every digit in the DOM is
    // Alegreya's. The board keeps Cinzel's own (a canvas can't ask for lining
    // figures, and Alegreya's hanging ones would sit low in WAVE 12).
    digits: { ...face("Alegreya", 1.08, [400, 700]), keep: ["board"] },
    slots: {
      mark: face("Cinzel Decorative", 0.85, [900]),
      title: face("Cinzel", 0.92, [700]),
      ui: face("Cinzel", 0.9, [700]),
      menu: face("Cinzel", 0.98, [700]),
      num: face("Alegreya", 1.08, [700]),
      body: face("Alegreya", 1.12, [400, 700], "", VERDANA_LH),
      map: face("Cinzel", 0.95, [700]),
      board: face("Cinzel", 0.82, [700]),
    },
  },
  // Today's HUD, everywhere: Silkscreen keeps every heading, label and
  // banner, Press Start 2P every number, as they are in battle now; one
  // readable pixel hand takes over Verdana's long text and the board's
  // monospace. Four faces cut to three, and the HUD doesn't move.
  pair: {
    name: "Tidy HUD",
    sketch: "Today's HUD everywhere: Silkscreen words and Press Start 2P numbers, one readable pixel hand for the tales.",
    // (the board keeps Silkscreen's own digits: Press Start 2P's stand a size
    // taller than the board's shrunken Silkscreen in WAVE 12)
    digits: { ...face("Press Start 2P", 0.7), sizes: { num: 0.77 }, keep: ["board"] },
    slots: {
      mark: face("Silkscreen", 0.84, [400, 700], "&"),
      title: face("Silkscreen", 1, [400, 700], "&"),
      head: face("Silkscreen", 0.9, [400, 700], "&"),
      ui: face("Silkscreen", 1, [400, 700], "&"),
      menu: face("Silkscreen", 0.95, [400, 700], "&"),
      num: face("Press Start 2P", 0.77),
      body: face("Jersey 15", 1.2),
      map: face("Silkscreen", 0.8, [400, 700], "&"),
      board: face("Silkscreen", 0.72, [400, 700], "&"),
    },
  },
};

export const TYPE_IDS = Object.keys(TYPES);
export const DEFAULT_TYPE = "current";
export const SLOTS = ["mark", "title", "head", "ui", "menu", "num", "body", "map", "board"];

// ---- which option ------------------------------------------------------
const pickType = () => {
  let id = null;
  try {
    const q = new URLSearchParams(window.location.search).get("type");
    if (q && TYPES[q]) {
      id = q;
      try { window.localStorage.setItem("cg-type", q); } catch { /* storage blocked */ }
    }
  } catch { /* no window (node) */ }
  if (!id) {
    try {
      const s = window.localStorage.getItem("cg-type");
      if (s && TYPES[s]) id = s;
    } catch { /* storage blocked */ }
  }
  return id || DEFAULT_TYPE;
};

// ---- aliases -----------------------------------------------------------
const pct = (f) => Math.round(f.size * 100);
// the ascent/descent overrides that give a face its `lh`
const lineOf = (f) => {
  const m = f.lh && METRICS[f.family];
  if (!m) return "";
  const k = f.lh / f.size / (m[0] + m[1]), p = (v) => `${(v * k * 100).toFixed(1)}%`;
  return `ascent-override:${p(m[0])};descent-override:${p(m[1])};line-gap-override:0%;`;
};
// what a face leaves out in an option: its own `lacks`, and the digits when
// the option draws them in another face (unless the slot is one the digits
// face `keep`s out of: canvas text can't set a font feature, see below)
const cutOf = (t, f, slot) => {
  const own = t.digits && t.digits.family === f.family && (t.digits.sizes?.[slot] || t.digits.size) === f.size;
  const d = t.digits && !own && !t.digits.keep?.includes(slot) && (!t.digits.only || t.digits.only.includes(slot)) ? DIGITS : "";
  return [...new Set(d + (f.lacks || ""))].join("");
};
const cutTag = (cut) => (cut ? ` -${cut.replace(DIGITS, "0-9")}` : "");
// a face as the option uses it: `part` is "digits" for the digits face, or
// the characters it leaves out
const use = (f, part = "") => ({ ...f, part });
export const aliasOf = (f) =>
  `cg ${f.family} ${pct(f)}${f.wght.join() === "400" ? "" : ` w${f.wght.join("-")}`}${f.lh ? ` lh${f.lh}` : ""}${f.part === "digits" ? " digits" : cutTag(f.part)}`;
const q = (f) => `"${aliasOf(f)}"`;

const slotFace = (t, s) => t.slots[s] || (s === "head" ? t.slots.title : null);
// the faces an option uses, slot by slot: [slot face, digits, body], as uses
const usesOf = (t, s) => {
  const f = slotFace(t, s), body = t.slots.body;
  const out = [use(f, cutOf(t, f, s))];
  if (t.digits && out[0].part.includes("0")) out.push(use({ ...t.digits, size: t.digits.sizes?.[s] || t.digits.size }, "digits"));
  const b = use(body, cutOf(t, body));
  if (!out.some((u) => aliasOf(u) === aliasOf(b))) out.push(b);
  return out;
};

// the family stack each slot of an option uses
export const stacksOf = (id) => {
  const t = TYPES[id] || TYPES[DEFAULT_TYPE];
  if (t.plain) return { ...t.plain };
  const out = {};
  for (const s of SLOTS) out[s] = [...usesOf(t, s).map(q), FALLBACK].join(", ");
  return out;
};
// the distinct faces (as used) an option needs
export const facesOf = (id) => {
  const t = TYPES[id];
  if (!t || t.plain) return [];
  const seen = new Map();
  for (const s of SLOTS) for (const u of usesOf(t, s)) seen.set(aliasOf(u), u);
  return [...seen.values()];
};

// unicode-range arithmetic: "U+0000-00FF, U+0131" less some characters, or
// kept to only some characters
const spans = (range) => (range || "U+0-10FFFF").split(",").map((r) => {
  const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(r.trim());
  if (!m) return null;
  if (m[1].includes("?")) return [parseInt(m[1].replace(/\?/g, "0"), 16), parseInt(m[1].replace(/\?/g, "F"), 16)];
  const lo = parseInt(m[1], 16);
  return [lo, m[2] ? parseInt(m[2], 16) : lo];
}).filter(Boolean);
const fmt = (ss) => ss.map(([a, b]) => (a === b ? `U+${a.toString(16)}` : `U+${a.toString(16)}-${b.toString(16)}`)).join(", ");
const cutRange = (range, chars) => {
  let ss = spans(range);
  for (const cp of [...chars].map((c) => c.codePointAt(0))) {
    ss = ss.flatMap(([a, b]) => (cp < a || cp > b ? [[a, b]] : [[a, cp - 1], [cp + 1, b]].filter(([x, y]) => x <= y)));
  }
  return fmt(ss);
};
const keepRange = (range, chars) => {
  const cps = [...chars].map((c) => c.codePointAt(0)).filter((cp) => spans(range).some(([a, b]) => cp >= a && cp <= b));
  return cps.length ? fmt(cps.map((cp) => [cp, cp])) : null;
};
// the weight range each fetched weight answers (so nothing is synthesised)
const weightSpan = (ws, w) => {
  const s = [...ws].sort((a, b) => a - b), i = s.indexOf(w);
  const lo = i <= 0 ? 1 : Math.floor((s[i - 1] + w) / 2) + 1, hi = i === s.length - 1 ? 1000 : Math.floor((w + s[i + 1]) / 2);
  return `${lo} ${hi}`;
};

// Fetch the faces' Google CSS and re-register each block under its alias,
// with size-adjust and its unicode-range cut. Resolves once every alias is
// loaded (or failed: the fallback stack takes over). Safe to call for
// several options at once.
const registered = new Map();
export const loadFaces = (faces) => {
  if (typeof document === "undefined" || !faces.length) return Promise.resolve();
  const todo = faces.map((f) => ({ part: "", lacks: "", lh: 0, ...f })).filter((f) => !registered.has(aliasOf(f)));
  if (todo.length) {
    const fams = [...new Map(todo.map((f) => [f.family, f])).values()];
    // one request per family (weights merged), so a bad name spoils nothing else
    const job = Promise.all(fams.map((f) => {
      const ws = [...new Set(todo.filter((g) => g.family === f.family).flatMap((g) => g.wght))].sort((a, b) => a - b);
      const qs = `family=${f.family.replace(/ /g, "+")}${ws.length > 1 || ws[0] !== 400 ? `:wght@${ws.join(";")}` : ""}`;
      return fetch(`${GOOGLE}?${qs}&display=swap`).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    })).then((sheets) => {
      const css = [];
      for (const f of todo) {
        const text = sheets[fams.findIndex((g) => g.family === f.family)] || "";
        for (const m of text.matchAll(/@font-face\s*{([^}]*)}/g)) {
          const b = m[1];
          const fam = /font-family:\s*'([^']+)'/.exec(b)?.[1];
          const w = Number(/font-weight:\s*([\d ]+);/.exec(b)?.[1]?.trim().split(" ")[0]) || f.wght[0];
          if (fam !== f.family || !f.wght.includes(w)) continue;
          const src = /src:\s*([^;]+);/.exec(b)?.[1];
          const given = /unicode-range:\s*([^;]+);/.exec(b)?.[1];
          if (!src) continue;
          const range = f.part === "digits" ? keepRange(given, DIGITS) : f.part ? cutRange(given, f.part) : given;
          if (f.part === "digits" && !range) continue;
          css.push(`@font-face{font-family:"${aliasOf(f)}";font-style:normal;font-weight:${weightSpan(f.wght, w)};` +
            `font-display:swap;src:${src};${range ? `unicode-range:${range};` : ""}size-adjust:${pct(f)}%;${lineOf(f)}}`);
        }
      }
      if (css.length) {
        const st = document.createElement("style");
        st.dataset.cgType = "faces";
        st.textContent = css.join("\n");
        document.head.appendChild(st);
      }
    });
    for (const f of todo) {
      const probe = f.part === "digits" ? "0123456789" : "AaZz";
      registered.set(aliasOf(f), job.then(() => Promise.all(
        f.wght.map((w) => document.fonts.load(`${w} 20px "${aliasOf(f)}"`, probe)),
      )).catch(() => null));
    }
  }
  return Promise.all(faces.map((f) => registered.get(aliasOf({ part: "", lacks: "", lh: 0, ...f }))));
};

// ---- the live option ---------------------------------------------------
export const TYPE_ID = typeof window === "undefined" ? DEFAULT_TYPE : pickType();
export const TYPE = TYPES[TYPE_ID];
// the family stack per slot, for JS styles, SVG and canvas
export const FONTS = stacksOf(TYPE_ID);
// font-size-adjust for the digits (today's Press Start 2P needs 0.58; the
// new options carry their size in the face itself)
export const NUM_ADJUST = TYPE.numAdjust || "none";

// Canvas text: `canvasFont("board", 22, true)` is today's "bold 22px monospace".
// A badge-sized font (6px or less) is never drawn smaller than asked, even in
// an option that shrinks its board face.
export const canvasFont = (slot, px, bold = false) => {
  if (TYPE.plain) return `${bold ? "bold " : ""}${px}px ${FONTS[slot]}`;
  const f = slotFace(TYPE, slot), w = bold ? f.wght[f.wght.length - 1] : f.wght[0];
  const size = px <= 6 && f.size < 1 ? Math.round((px / f.size) * 10) / 10 : px;
  return `${w} ${size}px ${FONTS[slot]}`;
};

// bumped each time faces arrive, so baked text sprites re-bake
let epoch = 0;
export const typeEpoch = () => epoch;

let ready = Promise.resolve();
if (typeof document !== "undefined") {
  // the DOM's variables, on :root (hud.css and every inline style read these)
  const html = document.documentElement, root = html.style;
  root.setProperty("--mark", FONTS.mark);
  root.setProperty("--title", FONTS.title);
  root.setProperty("--head", FONTS.head);
  root.setProperty("--display", FONTS.ui);
  root.setProperty("--menu", FONTS.menu);
  root.setProperty("--numeric", FONTS.num);
  root.setProperty("--body", FONTS.body);
  root.setProperty("--map", FONTS.map);
  root.setProperty("--num-adjust", NUM_ADJUST);
  if (!TYPE.plain) root.setProperty("font-synthesis", "none");
  if (TYPE.features) { root.setProperty("font-feature-settings", TYPE.features); html.dataset.typeFeatures = ""; }
  if (TYPE.caps) html.dataset.typeCaps = "";
  const faces = facesOf(TYPE_ID);
  if (faces.length) {
    // hold the first paint so the title never flashes in the wrong face: until
    // the faces are in, or 3 s after the page began loading (1 s at least)
    const hold = document.createElement("style");
    hold.textContent = "#root{visibility:hidden}";
    document.head.appendChild(hold);
    ready = loadFaces(faces).then(() => { epoch++; });
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    Promise.race([ready, new Promise((r) => setTimeout(r, Math.max(1000, 3000 - now)))]).then(() => hold.remove());
  } else if (document.fonts?.ready) {
    ready = document.fonts.ready.then(() => {});
  }
}
// resolves when the chosen option's faces are in (not when the hold gives up)
export const fontsReady = () => ready;
