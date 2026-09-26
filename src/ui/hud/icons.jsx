// ============ HUD ICONS ============
// The battle HUD's little pictures, drawn as pixel grids so they sit on the
// same blocky grid as the sprites: every icon is a few rows of letters, one
// letter per art pixel, ringed in the game's ink. Runs of one colour merge
// into a single rect, so even the biggest is a couple of dozen nodes.

import { CASTLE_MARK, CASTLE_PAL } from "../castleMark.js";

const PAL = {
  k: "#241a26",                                   // ink
  c: "#fff3d2", C: "#e8dcc0", s: "#b8ab92",       // cream, bone, bone shade
  Y: "#f0d27a", y: "#d8b34a", o: "#b8902e", d: "#8a6a24",   // gold, light to dark
  R: "#e0574c", r: "#a8363c", p: "#f29a8a",       // heart red, its shade, its shine
  S: "#c9c2b2", t: "#a19a8a", T: "#7c7566",       // castle stone
  w: "#8a6440", W: "#5a3a22",                     // oak
  g: "#9ad06a", G: "#5e9a44",                     // leaf green
  b: "#8ab8e0", B: "#4e78b0",                     // steel blue
};

function Grid({ rows, size, title, style, pal = PAL }) {
  const h = rows.length, w = rows[0].length;
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < w;) {
      const ch = row[x];
      if (ch === ".") { x++; continue; }
      let x2 = x + 1;
      while (x2 < w && row[x2] === ch) x2++;
      rects.push(<rect key={`${x}.${y}`} x={x} y={y} width={x2 - x} height={1} fill={pal[ch] || PAL[ch]} />);
      x = x2;
    }
  });
  return (
    <svg width={Math.round((size * w) / h)} height={size} viewBox={`0 0 ${w} ${h}`}
      style={{ shapeRendering: "crispEdges", display: "block", flexShrink: 0, ...style }}
      aria-hidden={title ? undefined : "true"} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      {rects}
    </svg>
  );
}

const icon = (rows) => function Icon({ size = 16, title, style }) {
  return <Grid rows={rows} size={size} title={title} style={style} />;
};

export const CoinIcon = icon([
  "...kkkkkk...",
  "..kYYYYYYk..",
  ".kYccYYYYyk.",
  "kYcYYkkYYyok",
  "kYYYkYYkYyok",
  "kYYYkYYYYyok",
  "kYYYkYYYYyok",
  "kYYYkYYkYyok",
  "kyYYYkkYYyok",
  ".kyyyyyyyok.",
  "..kooooook..",
  "...kkkkkk...",
]);

export const HeartIcon = icon([
  ".kkk...kkk.",
  "kRRRk.kRRRk",
  "kRppRkRRRrk",
  "kRpRRRRRRrk",
  "kRRRRRRRRrk",
  ".kRRRRRRrk.",
  "..kRRRRrk..",
  "...kRRrk...",
  "....krk....",
  ".....k.....",
]);

// the game's castle mark (ui/castleMark.js): the same castle everywhere
export function CastleIcon({ size = 16, title, style }) {
  return <Grid rows={CASTLE_MARK} size={size} title={title} style={style} pal={CASTLE_PAL} />;
}

export const SkullIcon = icon([
  "..kkkkkk..",
  ".kccccCCk.",
  "kccccccCCk",
  "kckkcCkkCk",
  "kckkcCkkCk",
  "kcccckCCsk",
  ".kcccCCsk.",
  "..kckCksk.",
  "..kkkkkk..",
]);

export const SwordIcon = icon([
  "........kkk",
  ".......kcck",
  "......kcCk.",
  ".....kcCk..",
  "..k.kcCk...",
  "..kkcCk....",
  "...kCk.....",
  "..kwkkk....",
  ".kwk.......",
  "kWk........",
  "kk.........",
]);

export const BoltIcon = icon([
  "....kkkk",
  "...kYYk.",
  "..kYYk..",
  ".kYYkkkk",
  "kYYYYYYk",
  "kkkkYYk.",
  "..kYYk..",
  ".kYk....",
  "kkk.....",
]);

export const PlayIcon = icon([
  "kk......",
  "kck.....",
  "kcck....",
  "kccck...",
  "kcccck..",
  "kccccck.",
  "kcccccsk",
  "kcccccsk",
  "kccccsk.",
  "kcccsk..",
  "kccsk...",
  "kcsk....",
  "kck.....",
  "kk......",
]);

export const PauseIcon = icon([
  "kkkk..kkkk",
  "kcck..kcck",
  "kcck..kcck",
  "kcck..kcck",
  "kcck..kcck",
  "kcck..kcck",
  "kcck..kcck",
  "kcsk..kcsk",
  "kcsk..kcsk",
  "kkkk..kkkk",
]);

// one, two or three chevrons: the three gears of the game clock
const SPEED = {
  1: ["kk...", "kck..", "kcck.", "kccck", "kcsck", "kcsk.", "kck..", "kk..."],
  2: ["kk..kk...", "kck.kck..", "kcckkcck.", "kccckccck", "kcsckcsck", "kcskkcsk.", "kck.kck..", "kk..kk..."],
  4: ["kk..kk..kk...", "kck.kck.kck..", "kcckkcckkcck.", "kccckccckccck", "kcsckcsckcsck", "kcskkcskkcsk.", "kck.kck.kck..", "kk..kk..kk..."],
};
export function SpeedIcon({ speed = 1, size = 14 }) {
  return <Grid rows={SPEED[speed] || SPEED[1]} size={size} />;
}

export const HammerIcon = icon([
  "kkkkkkkkkk.",
  "kcSSSSSStkk",
  "kSSSSSSSttk",
  "kkkkwwkkkkk",
  "...kwWk....",
  "...kwWk....",
  "...kwWk....",
  "...kwWk....",
  "...kwWk....",
  "...kkkk....",
]);

export const LockIcon = icon([
  "..kkkk..",
  ".kSkkTk.",
  ".kk..kk.",
  "kkkkkkkk",
  "kYYYYYyk",
  "kYYkkYok",
  "kYYkkYok",
  "kyyyyook",
  "kkkkkkkk",
]);

export const CloseIcon = icon([
  "kk.....kk",
  "kck...kck",
  ".kck.kck.",
  "..kckck..",
  "...kck...",
  "..kckck..",
  ".kck.kck.",
  "kck...kck",
  "kk.....kk",
]);

export const ChevronUp = icon([
  "...kkk...",
  "..kccck..",
  ".kccccck.",
  "kccccccck",
  "kkkkkkkkk",
]);
export const ChevronDown = icon([
  "kkkkkkkkk",
  "kccccccck",
  ".kccccck.",
  "..kccck..",
  "...kkk...",
]);

export const FlagIcon = icon([
  "kk......",
  "kWkkkkk.",
  "kWkRRRRk",
  "kWkRRRrk",
  "kWkRRrk.",
  "kWkkkk..",
  "kWk.....",
  "kWk.....",
  "kWk.....",
  "kkk.....",
]);

export const ShieldIcon = icon([
  "kkkkkkkkk",
  "kbbbbbBBk",
  "kbcbbbbBk",
  "kbbbbbbBk",
  "kbbbbbbBk",
  ".kbbbbBk.",
  ".kbbbbBk.",
  "..kbbBk..",
  "...kBk...",
  "....k....",
]);

export const InfoIcon = icon([
  ".kkkkk.",
  "kbbcbbk",
  "kbbbbBk",
  "kbbcbBk",
  "kbbcbBk",
  "kbbcbBk",
  ".kkkkk.",
]);

// The campaign star: a clean five-point silhouette in ink, gold in three
// tones lit from the upper left, and a cream glint. Unearned, it is the same
// star as an empty slate socket.
const STAR = [
  "........k........",
  ".......kYk.......",
  "......kYYyk......",
  "......kYYyk......",
  ".....kYcYyyk.....",
  "kkkkkkYYYyyykkkkk",
  "kYYYYYYYYyyyyyyok",
  ".kYYYYYYYyyyyyok.",
  "..kyYYYYYyyyyok..",
  "...kyYYYyyyyok...",
  "...kyYYyyyyyok...",
  "..kyYyyyoyyyyok..",
  "..kyYyyok.kyyok..",
  ".kyYyok...kyyook.",
  ".kyok.......kook.",
  ".kkk.........kkk.",
];
const STAR_EMPTY = { Y: "#5a4d60", y: "#463a4c", o: "#342a3a", c: "#6a5c70" };
export function StarIcon({ size = 16, lit = true, style }) {
  return <Grid rows={STAR} size={size} pal={lit ? PAL : { ...PAL, ...STAR_EMPTY }} style={style} />;
}

// an arrow in flight, head up and to the right: the wall archers, a volley
const ARROW = [
  "......kkkkk.",
  "......kYYYk.",
  ".......kYYk.",
  "......kWkYk.",
  ".....kWk.kk.",
  "....kWk.....",
  "...kWk......",
  "kkkWk.......",
  "kcWk........",
  "kcck........",
  "kkk.........",
];
export const ArrowIcon = icon(ARROW);
// the ballista's bolt: the same flight, a steel head
export const BallistaIcon = icon(ARROW.map((r) => r.replace(/Y/g, "b")));
// a butt with its gold in the middle: a shot that seeks the heart
export const TargetIcon = icon([
  "...kkkkk...",
  ".kkRRRRRkk.",
  ".kRcccccRk.",
  "kRcRRRRRcRk",
  "kRcRcccRcRk",
  "kRcRcYcRcRk",
  "kRcRcccRcRk",
  "kRcRRRRRcRk",
  ".kRcccccRk.",
  ".kkRRRRRkk.",
  "...kkkkk...",
]);
