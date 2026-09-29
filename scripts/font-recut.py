#!/usr/bin/env python3
"""Crownguard's pixel word faces, rebuilt from their sources.

    python3 scripts/font-recut.py            rebuild every face into public/fonts/
    python3 scripts/font-recut.py --check    rebuild into a temp folder and say
                                             whether public/fonts/ matches
    python3 scripts/font-recut.py --show WMN print those letters, as built

The Tidy HUD options in src/ui/fonts.js (tidy2, tidy3) swap Silkscreen for a
pixel face whose W reads (the owner, 2026-09-29: "I'm looking at the w
especially"). Silkscreen draws its lowercase as its capitals, and the game's
words are written for that (the board's notices and the campaign map's labels
are drawn as written), so each face here is a RECUT:
  - its lowercase letters draw its capitals (cmap only; the glyphs stay),
  - a Latin subset (ASCII, Latin-1, dashes, quotes, bullet, ellipsis),
  - its vertical metrics set to Silkscreen's own line box at the size the
    option draws it (`k`): ascent 1.03 / k, descent 0.25 / k, no line gap, in
    hhea, OS/2 typo (USE_TYPO_METRICS) and OS/2 win alike. Every engine reads
    them (Safari ignores @font-face ascent-override), so `line-height: normal`
    gives each line exactly the height and baseline Silkscreen gave it.
    Rounded UP to a whole font unit: browsers round a line's ascent and
    descent to whole pixels separately, and a hair under Silkscreen's value
    would round the other way where Silkscreen sits on a half pixel,
  - glyph patches drawn as pixel bitmaps (PATCHES) where a letter needs it,
  - renamed, so nothing presents it as the original font.
The output is deterministic (no timestamps): rebuilding changes no bytes.

LICENCES: read the RESERVED FONT NAME off the package's own OFL.txt (its first
line), never off the font's name table (name ID 13 leaves it out). A Modified
Version (and every recut is one) must not carry a Reserved Font Name: Pixeloid
Sans reserves "Pixeloid", so its recut is "CG Pixel Sans"; Dogica reserves
"Dogica" and "Dogica Pixel". Pixel Operator is CC0 and keeps its name. Each
recut ships with its licence file in public/fonts/, and the originals sit in
scripts/font-src/ with their licences and origins (README.txt there).

Needs fontTools and brotli (pip install fonttools brotli).
"""
import hashlib
import math
import os
import sys
import tempfile
import unicodedata

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "font-src")
OUT = os.path.join(ROOT, "public", "fonts")

# Silkscreen's line box (typo ascent and descent, in ems): what every recut
# stands in for, at the size its option draws it (src/ui/fonts.js SILK_BOX)
SILK_BOX = (1.03, 0.25)

# a glyph drawn as pixels: rows top to bottom, `base` = how many rows stand
# above the baseline, `adv` = the advance in font pixels (the ink starts at
# the first column, blank columns included)
W_OPEN = dict(adv=10, base=7, rows=[
    ".##....##.",
    ".##....##.",
    ".##.##.##.",
    ".##.##.##.",
    ".##.##.##.",
    ".##.##.##.",
    "..##..##..",
])

RECUTS = [
    dict(
        out="PixelOperator8Caps", family="Pixel Operator 8 Caps", k=0.75, rfn=[],
        credit="a recut of Pixel Operator 8 by Jayvee Enaguas (CC0 1.0)",
        src={"Regular": ("PixelOperator8.ttf", "5cccb9ef6cf18977b6e5721d49a1a6e78dd6a6f1c4f69537470f7dc1dc829ffc"),
             "Bold": ("PixelOperator8-Bold.ttf", "b46a109cdac6c2f7acb4a57451dc3c8f7e2d391b871500270eadf139f0ac906e")},
        # the bold W's middle stroke is one pixel against two outside, and at
        # 1x it fades to a grey column (TWIN read TUIN): three 2-pixel strokes,
        # a pixel wider
        patch={"Bold": {"W": W_OPEN}},
        px=100,   # font units to a font pixel (800 units, an 8-pixel em)
    ),
    dict(
        out="CGPixelSans", family="CG Pixel Sans", k=0.875, rfn=["Pixeloid"],
        credit="a Modified Version of Pixeloid Sans by GGBotNet (SIL OFL 1.1, Reserved Font Name \"Pixeloid\")",
        src={"Regular": ("PixeloidSans.ttf", "9afa72c564fd027e826b23375847a25f17fc8e214dd52d10c9fcf3d173e252e9"),
             "Bold": ("PixeloidSans-Bold.ttf", "8e3b75b58f12e27ba63263471c6b5f18190198fc880999804bab5712deb92f6f")},
        patch={},
        px=204,   # 1836 units, a 9-pixel em
    ),
]

UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) +
            [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2039, 0x203A])


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def trace(rows, px, base):
    """A pixel bitmap as TrueType contours (clockwise, y up), tracing the
    outline of the filled pixels; pixels that touch only at a corner make
    separate contours that meet at that point, as the original fonts' do."""
    h = len(rows)
    filled = {(x, h - 1 - y) for y, r in enumerate(rows) for x, c in enumerate(r) if c == "#"}
    # each filled pixel's sides that face an empty one, directed so the ink
    # lies on the right (clockwise outer contours in y-up space)
    edges = {}
    for (x, y) in filled:
        if (x, y + 1) not in filled: edges.setdefault((x, y + 1), []).append((x + 1, y + 1))   # top: west to east
        if (x + 1, y) not in filled: edges.setdefault((x + 1, y + 1), []).append((x + 1, y))   # right: north to south
        if (x, y - 1) not in filled: edges.setdefault((x + 1, y), []).append((x, y))           # bottom: east to west
        if (x - 1, y) not in filled: edges.setdefault((x, y), []).append((x, y + 1))           # left: south to north
    contours = []
    while any(edges.values()):
        start = next(p for p, outs in edges.items() if outs)
        loop, cur, prev = [start], start, None
        while True:
            outs = edges[cur]
            if len(outs) > 1 and prev is not None:
                # a corner two pixels share: turn right (keep hugging this pixel)
                dx, dy = cur[0] - prev[0], cur[1] - prev[1]
                right = (cur[0] + dy, cur[1] - dx)
                nxt = right if right in outs else outs[0]
            else:
                nxt = outs[0]
            outs.remove(nxt)
            prev, cur = cur, nxt
            if cur == start:
                break
            loop.append(cur)
        # drop the points in the middle of a straight run
        pts = [p for i, p in enumerate(loop)
               if not ((loop[i - 1][0] == p[0] == loop[(i + 1) % len(loop)][0]) or
                       (loop[i - 1][1] == p[1] == loop[(i + 1) % len(loop)][1]))]
        contours.append([(x * px, (y - (h - base)) * px) for x, y in pts])
    return contours


def patch_glyph(font, ch, spec, px):
    name = font.getBestCmap()[ord(ch)]
    pen = TTGlyphPen(None)
    for c in trace(spec["rows"], px, spec["base"]):
        pen.moveTo(c[0])
        for p in c[1:]:
            pen.lineTo(p)
        pen.closePath()
    g = pen.glyph()
    glyf = font["glyf"]
    glyf[name] = g
    g.recalcBounds(glyf)
    font["hmtx"][name] = (spec["adv"] * px, g.xMin if g.numberOfContours else 0)


def set_names(font, family, style, credit, rfn):
    ps = f"{family}-{style}".replace(" ", "")
    full = family if style == "Regular" else f"{family} {style}"
    name = font["name"]
    for rec in name.names:
        if rec.nameID == 1: rec.string = family
        elif rec.nameID == 3: rec.string = f"{ps}; Crownguard recut"
        elif rec.nameID == 4: rec.string = full
        elif rec.nameID == 6: rec.string = ps
        elif rec.nameID == 16: rec.string = family
        elif rec.nameID == 17: rec.string = style
    name.setName(f"{family}: {credit}; lowercase draws the capitals, a Latin subset, "
                 "Silkscreen's line box (Crownguard)", 10, 3, 1, 0x409)
    # nothing but the copyright, the credit and the licence lines may still
    # name the original
    for rec in name.names:
        if rec.nameID in (0, 10, 13, 14):
            continue
        s = rec.toUnicode()
        for r in rfn:
            if r.lower() in s.lower():
                raise SystemExit(f"name ID {rec.nameID} still carries the Reserved Font Name {r!r}: {s!r}")


def set_box(font, k):
    upm = font["head"].unitsPerEm
    asc = math.ceil(SILK_BOX[0] / k * upm - 1e-6)
    desc = math.ceil(SILK_BOX[1] / k * upm - 1e-6)
    hhea, os2 = font["hhea"], font["OS/2"]
    hhea.ascent, hhea.descent, hhea.lineGap = asc, -desc, 0
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = asc, -desc, 0
    os2.usWinAscent, os2.usWinDescent = asc, desc
    if os2.version < 4:
        os2.version = 4
    os2.fsSelection |= 1 << 7   # USE_TYPO_METRICS
    return asc, desc


def build(r, style, out_dir):
    file, want = r["src"][style]
    path = os.path.join(SRC, file)
    got = sha256(path)
    if got != want:
        raise SystemExit(f"{file}: sha256 {got}, expected {want} (a different release? see scripts/font-src/README.txt)")
    f = TTFont(path, recalcTimestamp=False)
    cmap = f.getBestCmap()
    # the lowercase draws the capitals (as Silkscreen's does)
    remap = {}
    for cp in cmap:
        ch = chr(cp)
        up = ch.upper()
        if unicodedata.category(ch) == "Ll" and len(up) == 1 and ord(up) in cmap:
            remap[cp] = cmap[ord(up)]
    for t in f["cmap"].tables:
        if t.isUnicode():
            for cp, g in remap.items():
                if cp in t.cmap:
                    t.cmap[cp] = g
    for ch, spec in r["patch"].get(style, {}).items():
        patch_glyph(f, ch, spec, r["px"])
    set_names(f, r["family"], style, r["credit"], r["rfn"])
    asc, desc = set_box(f, r["k"])
    for tag in ("SVG ", "FFTM", "DSIG"):
        if tag in f:
            del f[tag]
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.layout_features = ["*"]
    opts.glyph_names = False
    opts.recalc_timestamp = False
    opts.unicodes = [u for u in UNICODES if u in f.getBestCmap()]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=opts.unicodes)
    sub.subset(f)
    # nothing may stand outside the line box (Windows clips at the win metrics)
    glyf = f["glyf"]
    tops = [glyf[g].yMax for g in f.getGlyphOrder() if glyf[g].numberOfContours]
    bots = [glyf[g].yMin for g in f.getGlyphOrder() if glyf[g].numberOfContours]
    if max(tops) > asc or -min(bots) > desc:
        raise SystemExit(f"{r['out']} {style}: ink {min(bots)}..{max(tops)} outside the box -{desc}..{asc}")
    f.flavor = "woff2"
    name = r["out"] + ("" if style == "Regular" else f"-{style}") + ".woff2"
    dest = os.path.join(out_dir, name)
    f.save(dest)
    return dest, asc, desc


def show(path, chars, px):
    """The letters as built, one '#' a font pixel (pixel centres sampled)."""
    from fontTools.pens.pointInsidePen import PointInsidePen
    f = TTFont(path)
    gs, cm = f.getGlyphSet(), f.getBestCmap()
    cols = []
    for ch in chars:
        g = gs[cm[ord(ch)]]
        rows = []
        for yy in range(9, -3, -1):
            row = ""
            for xx in range(round(g.width / px)):
                pen = PointInsidePen(gs, ((xx + 0.5) * px, (yy + 0.5) * px))
                g.draw(pen)
                row += "#" if pen.getResult() else "."
            rows.append(row)
        cols.append(rows)
    keep = [i for i in range(len(cols[0])) if any("#" in c[i] for c in cols)]
    for i in keep:
        print("   " + "  ".join(c[i] for c in cols))


def main():
    args = sys.argv[1:]
    check = "--check" in args
    shown = args[args.index("--show") + 1] if "--show" in args else ""
    out_dir = tempfile.mkdtemp() if check else OUT
    same = True
    for r in RECUTS:
        for style in r["src"]:
            dest, asc, desc = build(r, style, out_dir)
            g = TTFont(dest)
            cm = g.getBestCmap()
            line = f"{os.path.basename(dest)}: {len(cm)} characters, {os.path.getsize(dest)} bytes, box +{asc}/-{desc} of {g['head'].unitsPerEm}"
            if check:
                live = os.path.join(OUT, os.path.basename(dest))
                ok = os.path.exists(live) and sha256(live) == sha256(dest)
                same &= ok
                line += "  matches public/fonts/" if ok else "  DIFFERS from public/fonts/"
            print(line)
            if shown:
                show(dest, shown, r["px"])
    if check and not same:
        sys.exit(1)


if __name__ == "__main__":
    main()
