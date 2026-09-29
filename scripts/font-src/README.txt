The original font files that scripts/font-recut.py recuts into public/fonts/
(the Tidy HUD options' word faces, src/ui/fonts.js). Kept unmodified, with
their licences, so the recuts can be rebuilt without a download: run
`python3 scripts/font-recut.py` (it checks each file's sha256 first). None of
this folder ships with the game.

PixelOperator8.ttf, PixelOperator8-Bold.ttf
  Pixel Operator 8, Regular and Bold, release 2018.10.04-1 (name ID 5),
  by Jayvee Enaguas (HarvettFox96). Licence: Creative Commons Zero 1.0
  (the fonts' name tables; the package's legal code: PixelOperator8-LICENSE.txt).
  The project: notabug.org/HarvettFox96/ttf-pixeloperator (also listed on
  dafont.com as "Pixel Operator").
  sha256 5cccb9ef6cf18977b6e5721d49a1a6e78dd6a6f1c4f69537470f7dc1dc829ffc  PixelOperator8.ttf
  sha256 b46a109cdac6c2f7acb4a57451dc3c8f7e2d391b871500270eadf139f0ac906e  PixelOperator8-Bold.ttf
  Recut as "Pixel Operator 8 Caps" (the tidy2 option).

PixeloidSans.ttf, PixeloidSans-Bold.ttf
  Pixeloid Sans, Regular and Bold, version 0.4 (name ID 5), by GGBotNet.
  Licence: SIL Open Font License 1.1 with the Reserved Font Name "Pixeloid"
  (PixeloidSans-OFL.txt: the package's OFL.txt, verbatim; the fonts' own
  name ID 13 leaves the reserved name out, so read the OFL.txt).
  The project: ggbot.net/fonts/ (downloads at ggbot.itch.io/pixeloid-font).
  sha256 9afa72c564fd027e826b23375847a25f17fc8e214dd52d10c9fcf3d173e252e9  PixeloidSans.ttf
  sha256 8e3b75b58f12e27ba63263471c6b5f18190198fc880999804bab5712deb92f6f  PixeloidSans-Bold.ttf
  Recut as "CG Pixel Sans" (the tidy3 option): a Modified Version may not
  carry the reserved name.

The copies here were fetched on 2026-09-29, when the build container could
not reach the projects' own download pages (itch.io, dafont); their name
tables give the releases above. A new release has another sha256: check its
licence (and its reserved names) again before recutting it.
