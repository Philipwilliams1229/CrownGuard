// ============ TYPE ============
// Every font in the game, in one place. Nothing else names a font family:
//  - the DOM reads CSS variables set on :root here (--mark, --title,
//    --display, --menu, --numeric, --body, and --num-adjust), or the plain
//    family strings in FONTS (theme.js re-exports them as FONT, DISPLAY...);
//  - canvas code (the board's banners and text sprites, the campaign map's
//    label measure) can't read CSS variables, so it asks canvasFont().
//
// ROLES (a "slot" is a place in the game; each type option gives every slot
// a face):
//   mark   the CROWNGUARD wordmark on the title screen
//   title  screen and card titles (War Council, Field Guide, the victory and
//          defeat banners, FREE PLAY)
//   ui     headings, labels, the HUD's planks and buttons (--display)
//   menu   the menu buttons on the title screen, campaign map, War Council
//   num    anything with digits: gold, lives, prices, waves (--numeric)
//   body   tales, blurbs, long text (--body)
//   map    the campaign map's scroll labels and chapter ribbons (SVG)
//   board  text painted on the battle canvas (wave banners, notices, PAUSED)
//
// OPTIONS: "current" is today's exact look (the default until the owner
// picks); the others are whole identities, each at most three Google Fonts
// families. Pick one with ?type=<id> (remembered in localStorage "cg-type");
// ?type=current goes back. type-lab.html shows them side by side and
// scripts/type-shots.mjs shoots the real game in each.
//
// SIZE TUNING: layouts were built for today's faces, so a new face is never
// used at its raw size. Each Google face is registered again under an alias
// ("cg <family> <size>") whose @font-face carries `size-adjust`, so the
// scale travels with the face into every rule, inline style, SVG text and
// canvas that uses it, and nothing inherits the wrong correction. Aliases
// are never smeared into faux bold (font-synthesis: none on :root, and
// canvasFont only asks for bold where the face has it).

const GOOGLE = "https://fonts.googleapis.com/css2";
const FALLBACK = "Verdana, Geneva, sans-serif";

// a face from Google Fonts at a size factor; `wght` lists the weights to
// fetch. A face with one weight answers every weight (a "bold" rule gets
// the one there is: font-synthesis is off for the new options)
const face = (family, size = 1, wght = [400]) => ({ family, size, wght });

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
      ui: `"Silkscreen", ${FALLBACK}`,
      menu: FALLBACK,
      num: `"Press Start 2P", "Silkscreen", Verdana, monospace`,
      body: FALLBACK,
      map: FALLBACK,
      board: "monospace",
    },
    numAdjust: "0.58",
  },
  // All pixel, all of a piece: one pixel family, drawn on a 25px grid for
  // the big words and a 15px grid for everything else (digits included).
  keep: {
    name: "Arcade Keep",
    sketch: "All pixel, one family: chunky Jersey capitals for names, the same hand for reading and counting.",
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
  // Blackletter for the crown's name and the screens' titles (a blocky,
  // carved gothic that stays legible in capitals: the pixel blackletters,
  // Jacquard and Jacquarda Bastarda, lose their hairlines under ~40px); a
  // plain, narrow pixel hand for everything you read or count.
  letter: {
    name: "Black Letter",
    sketch: "Carved blackletter for the crown's name and every title; a plain, narrow pixel hand for the rest.",
    slots: {
      mark: face("Grenze Gotisch", 1.05, [800]),
      title: face("Grenze Gotisch", 1.05, [700]),
      ui: face("VT323", 1.13),
      menu: face("VT323", 1.25),
      num: face("VT323", 1.2),
      body: face("VT323", 1.2),
      map: face("VT323", 1.2),
      board: face("VT323", 1.3),
    },
  },
  // The storybook: carved Roman capitals for names, a calligrapher's serif
  // for tales and numbers (its hanging figures keep every digit apart).
  illuminated: {
    name: "Illuminated",
    sketch: "A storybook: carved Roman capitals for names and labels, a calligrapher's serif for tales and numbers.",
    slots: {
      mark: face("Cinzel Decorative", 0.85, [900]),
      title: face("Cinzel", 0.92, [700]),
      ui: face("Cinzel", 0.9, [700]),
      menu: face("Cinzel", 0.98, [700]),
      num: face("Alegreya", 1.2, [700]),
      body: face("Alegreya", 1.12, [400, 700]),
      map: face("Cinzel", 0.95, [700]),
      board: face("Cinzel", 0.82, [700]),
    },
  },
  // Today's words, cut to two faces: Silkscreen keeps every heading, label
  // and banner; one readable pixel face takes the digits and the long text.
  pair: {
    name: "Tidy Pair",
    sketch: "Two faces: today's Silkscreen for every word on a sign, one readable pixel hand for numbers and tales.",
    slots: {
      mark: face("Silkscreen", 0.84, [400, 700]),
      title: face("Silkscreen", 1, [400, 700]),
      ui: face("Silkscreen", 1, [400, 700]),
      menu: face("Silkscreen", 0.84, [400, 700]),
      num: face("Jersey 15", 1.2),
      body: face("Jersey 15", 1.2),
      map: face("Silkscreen", 0.8, [400, 700]),
      board: face("Silkscreen", 0.72, [400, 700]),
    },
  },
};

export const TYPE_IDS = Object.keys(TYPES);
export const DEFAULT_TYPE = "current";
export const SLOTS = ["mark", "title", "ui", "menu", "num", "body", "map", "board"];

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
export const aliasOf = (f) => `cg ${f.family} ${pct(f)}${f.wght.join() === "400" ? "" : ` w${f.wght.join("-")}`}`;
const stackOf = (f) => `"${aliasOf(f)}", ${FALLBACK}`;

// the family stack each slot of an option uses
export const stacksOf = (id) => {
  const t = TYPES[id] || TYPES[DEFAULT_TYPE];
  if (t.plain) return { ...t.plain };
  const out = {};
  for (const s of SLOTS) out[s] = stackOf(t.slots[s]);
  return out;
};
// the distinct faces an option needs
export const facesOf = (id) => {
  const t = TYPES[id];
  if (!t || t.plain) return [];
  const seen = new Map();
  for (const s of SLOTS) { const f = t.slots[s]; seen.set(aliasOf(f), f); }
  return [...seen.values()];
};

// Fetch the faces' Google CSS and re-register each block under its alias,
// with size-adjust. Resolves once every alias is loaded (or failed: the
// fallback stack takes over). Safe to call for several options at once.
const registered = new Map();
export const loadFaces = (faces) => {
  if (typeof document === "undefined" || !faces.length) return Promise.resolve();
  const todo = faces.filter((f) => !registered.has(aliasOf(f)));
  if (todo.length) {
    const fams = [...new Map(todo.map((f) => [f.family, f])).values()];
    // one request per family (weights merged), so a bad name spoils nothing else
    const job = Promise.all(fams.map((f) => {
      const ws = [...new Set(todo.filter((g) => g.family === f.family).flatMap((g) => g.wght))].sort((a, b) => a - b);
      const q = `family=${f.family.replace(/ /g, "+")}${ws.length > 1 || ws[0] !== 400 ? `:wght@${ws.join(";")}` : ""}`;
      return fetch(`${GOOGLE}?${q}&display=block`).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    })).then((sheets) => {
      const css = [];
      for (const f of todo) {
        const text = sheets[fams.findIndex((g) => g.family === f.family)] || "";
        for (const m of text.matchAll(/@font-face\s*{([^}]*)}/g)) {
          const b = m[1];
          const fam = /font-family:\s*'([^']+)'/.exec(b)?.[1];
          const w = /font-weight:\s*([\d ]+);/.exec(b)?.[1]?.trim();
          if (fam !== f.family || (w && !f.wght.includes(Number(w.split(" ")[0])))) continue;
          const src = /src:\s*([^;]+);/.exec(b)?.[1];
          const range = /unicode-range:\s*([^;]+);/.exec(b)?.[1];
          if (!src) continue;
          css.push(`@font-face{font-family:"${aliasOf(f)}";font-style:normal;font-weight:${w || f.wght[0]};` +
            `font-display:block;src:${src};${range ? `unicode-range:${range};` : ""}size-adjust:${pct(f)}%;}`);
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
      registered.set(aliasOf(f), job.then(() => Promise.all(
        f.wght.map((w) => document.fonts.load(`${w} 20px "${aliasOf(f)}"`, "AaZz09")),
      )).catch(() => null));
    }
  }
  return Promise.all(faces.map((f) => registered.get(aliasOf(f))));
};

// ---- the live option ---------------------------------------------------
export const TYPE_ID = typeof window === "undefined" ? DEFAULT_TYPE : pickType();
export const TYPE = TYPES[TYPE_ID];
// the family stack per slot, for JS styles, SVG and canvas
export const FONTS = stacksOf(TYPE_ID);
// font-size-adjust for the digits (today's Press Start 2P needs 0.58; the
// new options carry their size in the face itself)
export const NUM_ADJUST = TYPE.numAdjust || "none";

// Canvas text: `canvasFont("board", 22, true)` is today's "bold 22px monospace"
export const canvasFont = (slot, px, bold = false) => {
  if (TYPE.plain) return `${bold ? "bold " : ""}${px}px ${FONTS[slot]}`;
  const f = TYPE.slots[slot], w = bold ? f.wght[f.wght.length - 1] : f.wght[0];
  return `${w} ${px}px ${FONTS[slot]}`;
};

// bumped when the chosen faces arrive, so baked text sprites re-bake
let epoch = 0;
export const typeEpoch = () => epoch;

let ready = Promise.resolve();
if (typeof document !== "undefined") {
  // the DOM's variables, on :root (hud.css and every inline style read these)
  const root = document.documentElement.style;
  root.setProperty("--mark", FONTS.mark);
  root.setProperty("--title", FONTS.title);
  root.setProperty("--display", FONTS.ui);
  root.setProperty("--menu", FONTS.menu);
  root.setProperty("--numeric", FONTS.num);
  root.setProperty("--body", FONTS.body);
  root.setProperty("--map", FONTS.map);
  root.setProperty("--num-adjust", NUM_ADJUST);
  if (!TYPE.plain) root.setProperty("font-synthesis", "none");
  const faces = facesOf(TYPE_ID);
  if (faces.length) {
    // hold the first paint (not past 2.5 s) so the title never flashes in
    // the wrong face
    const hold = document.createElement("style");
    hold.textContent = "#root{visibility:hidden}";
    document.head.appendChild(hold);
    ready = Promise.race([loadFaces(faces), new Promise((r) => setTimeout(r, 2500))])
      .then(() => { epoch++; hold.remove(); });
  } else if (document.fonts?.ready) {
    ready = document.fonts.ready.then(() => {});
  }
}
// resolves when the chosen option's faces are in (canvas bakes can wait on it)
export const fontsReady = () => ready;
