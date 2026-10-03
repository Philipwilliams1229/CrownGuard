# Zones IV and V — the design (owner's direction, 2026-10-03)

The owner chose "option C": a new faction for zone IV, then a finale in zone V
that mixes beaten armies under a returning villain. A story layer comes later
(sidebarred: the Lord Marshal, beaten at the Citadel, goes looking for help
from the goblins and their dragons).

Names below are working names (the owner: "good for now").

## Zone IV — The Rimewater (the Rime Clans)

A frigid ocean country: black sea, pack ice, floes, fjords and snow-bound
shores. More water than any chapter so far, so most boards are coastal or
split by meltwater, and the River Watch earns its keep.

### The three mechanics (the owner's asks)

1. **Landings** (owner: "surprise the player in the middle of the level, not
   on every, but on like half"). About half the boards have a beach the road
   passes. On some waves of those boards, never all, a longship sails in off
   the board's sea edge and beaches there; a raiding party jumps down and
   joins the road PART-WAY along it, ahead of defences that only cover the
   start. The engine already moves every foe by distance along one road, so
   a landing is a group that enters at `dist = landing point` instead of 0.
   - Telegraph: a horn and the sail on the horizon ~5 s before it beaches, so
     a player who is watching can react; a surprise, not a cheat.
   - The ship itself is a target while it sails: River Watch skiffs and
     towers in reach can hole it, and a holed ship lands fewer raiders.
2. **Blizzards** (weather). On the boards that have them, a squall rises
   every 60-90 s and lasts ~12-15 s: towers' reach drops ~20%, shots fly a
   little slower, fliers stay low. The wind rises first and the snow thickens
   (heavier `snow` ambient plus a white-out wash), so it reads before it
   bites.
3. **Tower freezers.** Rime Seers (and the boss) cast a frost shroud on the
   nearest hall in reach: an ice shell that holds its fire for a few seconds.
   Fire halls (Brazier Wheel, Dragon's Breath, burning shot) thaw themselves
   and their neighbours faster, so fire becomes the answer to frost.

### The roster (working)

| Foe | Role |
|---|---|
| Thrall | the raiding rank and file, axe and buckler; comes in floods |
| Huscarl | the heavy, mailed, big round shield, high health |
| Berserker | grows faster and harder-hitting as he is wounded |
| Wolf-rider | fast, rides a frost wolf |
| Rime Seer | the tower freezer (frost shroud) |
| Skald | war-chant: the warband near him marches faster |
| Frost Giant | the troll-weight bruiser; his stomp stuns soldiers |
| Ice Drake | a lesser flier off the ice cliffs |
| Longship crew | the landing party (thralls and huscarls) |
| Sea Serpent | elite, river and coast boards: swims submerged (only skiffs reach it), surfaces to maul soldiers or coil round a hall, dives on |
| Kraken | boss-tier, coast boards: body offshore, tentacles burst up along the shore to grab soldiers and smash halls; retreats after a time limit and costs lives |
| BOSS: the Rime Jarl | on a war-mammoth: tramples, freezes halls, calls landings |

## Zone V — The Ashen Reach (the Marshal's Pact)

A fire country: black rock, lava channels, ash fields, burnt forts (the
Ember Wastes free realm's ground is the starting point). The Lord Marshal
returns, beaten and exiled, with the Iron legion's remnant and the goblin
horde he bought, and their dragons.

- **Mixed roster:** Iron Marches (levy, crossbow, sergeant, cavalier, ram,
  magister, chaplain) and Greenwood (goblin, orc, troll, shaman, boar rider,
  hobgoblin warchief), plus new foes:
  - **Drakes** — lesser dragons as regular fliers that breathe on soldiers.
  - **Ash sappers** — goblins that run at a hall and set it burning (disabled
    for a while).
  - **Magma trolls** — fire-proof, burst into embers when they fall.
  - Fire-immune foes on purpose: zone V turns the burn builds around.
- **Bosses:** the Dragon returns mid-chapter; the final boss is the Lord
  Marshal on dragonback — the dragon in flight, then the Marshal unhorsed
  with his banner.
- Zone V's weather: ERUPTIONS (owner's pick) — telegraphed burning rocks
  on the road that hurt foes and set halls near them burning.

## Weather in every zone (owner, 2026-10-03)

One signature weather per zone, MORE PREVALENT THE FURTHER INTO AN AREA YOU
TRAVEL (none in a chapter's first third, rare and mild in the middle, often
and strong in the last third, strongest at the boss):
Greenwood MORNING FOG, Iron Marches THUNDERSTORMS (rain + lightning on the
road), Hollowfen GRAVE MIST, Rimewater BLIZZARD, Ashen Reach ERUPTIONS.

## Build plan

1. **Engine first** (no art, behind data flags no level uses yet): landings,
   blizzards, frost shroud; a test board; sims (`--endure`), a lab page.
2. **Art for zone IV:** the Rime Clans' rigs (split across rig artists by
   file), the snow/sea-ice ground and scenery, the longship, the blizzard
   wash, the frozen-hall shell, music (`rime-build/-fight/-boss`).
3. **Content:** the faction's wave script, 15 boards (three designers, five
   each), a new country on the continent map, the level list, balance sims.
4. **Zone V** the same way, reusing the Iron and Greenwood rigs.
