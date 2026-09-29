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
// OPTIONS: whole identities of two or three families (Google Fonts, or
// self-hosted: see below). The default is tidy3, Tidy HUD with CG Pixel Sans
// for the words (the owner's pick, 2026-09-29); "current" is the look before
// it, family for family. tidy2 and tidy3 are Tidy HUD with another word face
// (tidyWith). Pick one with ?type=<id> (remembered in localStorage "cg-type");
// a link with no ?type keeps a player's remembered pick. type-lab.html shows
// them side by side and scripts/type-shots.mjs shoots the real game in each.
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
// SELF-HOSTED FACES: a face Google doesn't serve lives in public/fonts/ (its
// licence file beside it) and is named with own() instead of face(). It goes
// through the same alias, size-adjust and unicode-range cut as a Google face,
// with no stylesheet to fetch first; the URL is relative to the page, so it
// works from the dev server's root and from GitHub Pages' /CrownGuard/. A
// missing file (or no network) fails like a Google face: the first paint
// waits 3 s at most and the slot's stack takes over. The tidy options' faces
// are recuts made by scripts/font-recut.py from the originals in
// scripts/font-src/: the lowercase draws the capitals, as Silkscreen's does;
// a Latin subset; Silkscreen's line box baked into the font's own metrics
// (not @font-face ascent-override, which Safari ignores), so each line keeps
// Silkscreen's height and baseline in every browser; renamed wherever the
// original's licence reserves its name (Pixeloid Sans -> CG Pixel Sans).
//
// FIRST PAINT: the game can't paint before the bundle runs, so index.html
// only starts the default's downloads early: a preload for each of its
// self-hosted woff2 files and for each Google stylesheet the loader fetches
// (the same URLs, so the loader's requests are answered from the preloads).
// A new default changes those links. No option's stylesheet is linked there:
// a plain option (current) links its own at boot (`sheet`).

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
// a self-hosted face (public/fonts/): `files` maps each weight to its file
const own = (family, files, size = 1, lacks = "") =>
  ({ family, files, size, wght: Object.keys(files).map(Number).sort((a, b) => a - b), lacks, lh: 0 });
// a face's own ascent and descent (em), for `lh`: measured in type-lab
const METRICS = { Grenze: [1.1, 0.38], "Grenze Gotisch": [1.1, 0.38], Alegreya: [1.02, 0.35], Cinzel: [0.98, 0.37] };
const VERDANA_LH = 1.215;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

// Tidy HUD with another word face (tidy2, tidy3). Every slot Tidy HUD gives
// Silkscreen gets the new face at Tidy HUD's size times `k`; the face's file
// carries Silkscreen's line box at that k (scripts/font-recut.py: ascent
// 1.03 / k, descent 0.25 / k), so each line keeps its height and its
// baseline. `tune` nudges one slot (times its k), and a slot tuned off k
// stands in a box that much off Silkscreen's. Silkscreen's
// lowercase draws its capitals, and the game's words are written for that
// (the board's notices and the map's labels are measured and drawn as
// written), so the new face is a recut that does the same (public/fonts/,
// see its licence file): it stands in everywhere, where an option's `caps`
// would reach only the DOM's words (hud.css) and leave the canvas and SVG
// text in lowercase. Press Start 2P draws every digit: as tall as the face's
// capitals (`cap`: the face's capital height, in ems) in the words and on
// the board, at Tidy HUD's sizes in the num slot (0.77) and the tales (0.7,
// so every tale wraps as it did). `body` is the tale face (Tidy HUD's Jersey
// 15 unless given).
const PAIR_SIZES = { mark: 0.84, title: 1, head: 0.9, ui: 1, menu: 0.95, map: 0.8, board: 0.72 };
const PS2P_CAP = 0.875;
const tidyWith = ({ name, sketch, word: [family, files, lacks = ""], k, cap, tune = {}, body = face("Jersey 15", 1.2) }) => {
  const slots = { num: face("Press Start 2P", 0.77), body };
  for (const [s, z] of Object.entries(PAIR_SIZES)) {
    slots[s] = own(family, files, r4(z * k * (tune[s] || 1)), lacks);
  }
  const dig = (z) => r4((z * cap) / PS2P_CAP);
  return { name, sketch, digits: { ...face("Press Start 2P", dig(k)), sizes: { num: 0.77, body: 0.7, board: dig(slots.board.size) } }, slots };
};

export const TYPES = {
  // The look before Tidy HUD, family for family (Silkscreen for words, Press
  // Start 2P with font-size-adjust for digits, Verdana for long text, the
  // system monospace on the board). Its faces come in Google's own
  // stylesheet (`sheet`), linked at boot.
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
    sheet: `${GOOGLE}?family=Silkscreen:wght@400;700&family=Press+Start+2P&display=swap`,
    probes: ['400 20px "Silkscreen"', '700 20px "Silkscreen"', '400 20px "Press Start 2P"'],
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
  // Tidy HUD with a word face whose W reads (the owner, 2026-09-29: "I like
  // tidy HUD but it's just a bit difficult to read ... I'm looking at the w
  // especially"). Silkscreen draws its capitals 5 pixels tall, so its bold W
  // closes into a block (TWIN read T-IN), and M and N nearly do; each of these
  // self-hosted faces draws them 7 pixels tall, with room for two open V's.
  // Same roles and tale face as Tidy HUD, Press Start 2P for every digit
  // (tidyWith, above). Two looks: tidy2 square and airy (Silkscreen's own
  // stance), tidy3 chunky (the clearest, the furthest from today's).
  tidy2: tidyWith({
    name: "Tidy HUD · Pixel Operator",
    sketch: "Tidy HUD with Pixel Operator 8 for the words: the same square pixel capitals, taller, so W, M and N stay open.",
    // (its "&" is vague: it falls through to the tale face; its bold W is
    // redrawn in the recut with three 2-pixel strokes: the original's
    // 1-pixel middle one faded at 1x, and TWIN read TUIN)
    word: ["Pixel Operator 8 Caps", { 400: "PixelOperator8Caps.woff2", 700: "PixelOperator8Caps-Bold.woff2" }, "&"],
    // 7-pixel capitals on an 8-pixel em: 0.75 sets them a shade taller than
    // Silkscreen's (0.667 would be pixel-exact at 12px, but reads small
    // beside Silkscreen's wide letters)
    k: 0.75, cap: 0.875,
  }),
  // (a recut of GGBotNet's Pixeloid Sans: its licence reserves the name
  // "Pixeloid", so the recut carries another)
  tidy3: tidyWith({
    name: "Tidy HUD · Pixel Sans",
    sketch: "Tidy HUD with CG Pixel Sans (a recut of GGBotNet's Pixeloid Sans) for the words: the clearest pixel capitals, chunky in bold.",
    word: ["CG Pixel Sans", { 400: "CGPixelSans.woff2", 700: "CGPixelSans-Bold.woff2" }],
    // 7-pixel capitals on a 9-pixel em
    k: 0.875, cap: 0.778,
  }),
};

export const TYPE_IDS = Object.keys(TYPES);
export const DEFAULT_TYPE = "tidy3";
export const SLOTS = ["mark", "title", "head", "ui", "menu", "num", "body", "map", "board"];

// ---- which option ------------------------------------------------------
// only TYPES' own ids count: "constructor" or "__proto__" in a link must not
// pass as an option (and be remembered, blanking every later visit)
const isType = (id) => typeof id === "string" && Object.prototype.hasOwnProperty.call(TYPES, id);
const pickType = () => {
  let id = null;
  try {
    const q = new URLSearchParams(window.location.search).get("type");
    if (q && isType(q)) {
      id = q;
      try { window.localStorage.setItem("cg-type", q); } catch { /* storage blocked */ }
    }
  } catch { /* no window (node) */ }
  if (!id) {
    try {
      const s = window.localStorage.getItem("cg-type");
      if (s && isType(s)) id = s;
      else if (s) window.localStorage.removeItem("cg-type");   // a stale or bad id
    } catch { /* storage blocked */ }
  }
  return id || DEFAULT_TYPE;
};

// ---- aliases -----------------------------------------------------------
const pct = (f) => Math.round(f.size * 1000) / 10;
// the ascent/descent overrides that give a face its `lh` (the overrides are
// scaled by size-adjust too, hence the division)
const lineOf = (f) => {
  const p = (v) => `${(v * 100).toFixed(1)}%`;
  const m = f.lh && METRICS[f.family];
  if (!m) return "";
  const k = f.lh / f.size / (m[0] + m[1]);
  return `ascent-override:${p(m[0] * k)};descent-override:${p(m[1] * k)};line-gap-override:0%;`;
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
  `cg ${f.family} ${pct(f)}${f.wght.join() === "400" ? "" : ` w${f.wght.join("-")}`}${f.lh ? ` lh${f.lh}` : ""}` +
  `${f.part === "digits" ? " digits" : cutTag(f.part)}`;
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
  const t = isType(id) ? TYPES[id] : TYPES[DEFAULT_TYPE];
  if (t.plain) return { ...t.plain };
  const out = {};
  for (const s of SLOTS) out[s] = [...usesOf(t, s).map(q), FALLBACK].join(", ");
  return out;
};
// the distinct faces (as used) an option needs
export const facesOf = (id) => {
  const t = isType(id) ? TYPES[id] : null;
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

// one alias rule: a face (as used) at one of its weights, from `src`, its
// unicode-range the source's (`given`: Google's subset, or all of Unicode)
// less what it leaves out, or only the digits
const aliasRule = (f, w, src, given) => {
  const range = f.part === "digits" ? keepRange(given, DIGITS) : f.part ? cutRange(given, f.part) : given;
  if (f.part === "digits" && !range) return null;
  return `@font-face{font-family:"${aliasOf(f)}";font-style:normal;font-weight:${weightSpan(f.wght, w)};` +
    `font-display:swap;src:${src};${range ? `unicode-range:${range};` : ""}size-adjust:${r4(f.size * 100)}%;${lineOf(f)}}`;
};
// a self-hosted file's URL, relative to the page (the dev server's root, or
// GitHub Pages' /CrownGuard/, where Vite copies public/)
const ownSrc = (file) => {
  const url = new URL(`fonts/${file}`, document.baseURI).href;
  return `url("${url}") format("${/\.woff2$/i.test(file) ? "woff2" : /\.otf$/i.test(file) ? "opentype" : "truetype"}")`;
};
const addStyle = (css) => {
  if (!css.length) return;
  const st = document.createElement("style");
  st.dataset.cgType = "faces";
  st.textContent = css.join("\n");
  document.head.appendChild(st);
};

// Register each face under its alias, with size-adjust and its unicode-range
// cut: a self-hosted face at once, a Google face from its fetched CSS.
// Resolves once every alias is loaded (or failed: the fallback stack takes
// over, so a missing file or no network leaves the next face in the stack).
// Safe to call for several options at once.
const registered = new Map();
export const loadFaces = (faces) => {
  if (typeof document === "undefined" || !faces.length) return Promise.resolve();
  const todo = faces.map((f) => ({ part: "", lacks: "", lh: 0, ...f })).filter((f) => !registered.has(aliasOf(f)));
  if (todo.length) {
    // self-hosted: the rules go in now, so the files start loading at once
    const mine = todo.filter((f) => f.files);
    addStyle(mine.flatMap((f) => f.wght.map((w) => aliasRule(f, w, ownSrc(f.files[w]), undefined))).filter(Boolean));
    const google = todo.filter((f) => !f.files);
    const fams = [...new Map(google.map((f) => [f.family, f])).values()];
    // one request per family (weights merged), so a bad name spoils nothing else
    const job = !google.length ? Promise.resolve() : Promise.all(fams.map((f) => {
      const ws = [...new Set(google.filter((g) => g.family === f.family).flatMap((g) => g.wght))].sort((a, b) => a - b);
      const qs = `family=${f.family.replace(/ /g, "+")}${ws.length > 1 || ws[0] !== 400 ? `:wght@${ws.join(";")}` : ""}`;
      return fetch(`${GOOGLE}?${qs}&display=swap`).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    })).then((sheets) => {
      const css = [];
      for (const f of google) {
        const text = sheets[fams.findIndex((g) => g.family === f.family)] || "";
        for (const m of text.matchAll(/@font-face\s*{([^}]*)}/g)) {
          const b = m[1];
          const fam = /font-family:\s*'([^']+)'/.exec(b)?.[1];
          const w = Number(/font-weight:\s*([\d ]+);/.exec(b)?.[1]?.trim().split(" ")[0]) || f.wght[0];
          if (fam !== f.family || !f.wght.includes(w)) continue;
          const src = /src:\s*([^;]+);/.exec(b)?.[1];
          const given = /unicode-range:\s*([^;]+);/.exec(b)?.[1];
          if (!src) continue;
          const rule = aliasRule(f, w, src, given);
          if (rule) css.push(rule);
        }
      }
      addStyle(css);
    });
    for (const f of todo) {
      const probe = f.part === "digits" ? "0123456789" : "AaZz";
      const wait = f.files ? Promise.resolve() : job;
      registered.set(aliasOf(f), wait.then(() => Promise.all(
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
  if (faces.length || TYPE.sheet) {
    // hold the first paint so the title never flashes in the wrong face: until
    // the faces are in, or 3 s after the page began loading (1 s at least)
    const hold = document.createElement("style");
    hold.textContent = "#root{visibility:hidden}";
    document.head.appendChild(hold);
    if (TYPE.sheet) {
      // a plain option's own stylesheet; loaded (or failed) when its faces are
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = TYPE.sheet;
      ready = new Promise((r) => { link.onload = r; link.onerror = r; })
        .then(() => Promise.all((TYPE.probes || []).map((p) => document.fonts.load(p).catch(() => null))))
        .then(() => { epoch++; });
      document.head.appendChild(link);
    } else {
      ready = loadFaces(faces).then(() => { epoch++; });
    }
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    Promise.race([ready, new Promise((r) => setTimeout(r, Math.max(1000, 3000 - now)))]).then(() => hold.remove());
  } else if (document.fonts?.ready) {
    ready = document.fonts.ready.then(() => {});
  }
}
// resolves when the chosen option's faces are in (not when the hold gives up)
export const fontsReady = () => ready;
