# `rpg` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Tabletop RPG character sheets, modifiers, combat
HP/conditions, spell slots, tap-to-roll trait lists, encounter initiative and gear packs. Not casual board
games (`play`), not real-time video RPGs (`Canvas`).

## Purpose

Tabletop role-playing character sheets and encounter management around a table or shared session: ability
scores with computed modifiers and saving throws, active HP/temp-HP/AC/death saves and conditions, leveled
spell slots and class charges with rest recovery, tap-to-roll attack and skill macros, turn-by-turn combat
initiative, and equipment weight/attunement with multi-denomination coins. It supports pen-and-paper RPGs,
not 3D or gacha video RPGs (`Canvas`) or casual board-game round pads (`play`).

## Apps it serves

5e-style tabletop character companion, dungeon-master encounter and initiative tracker, one-shot party loot
and coin sheet, spellcaster slot and rest book.

## What the core already covers

- Character portrait and class/level line: `Profile`; static campaign or background details: `KeyValue`.
- Session notes and lore entries: `Composer[entry]`, `Article`, `Note`; party roster: `People`.
- Rules reference accordions: `List[expand]`; campaign session timeline: `Timeline[day]`; simple numbers: `Counter`.

`StatBlock` computes signed ability modifiers and saving throws and rolls ability checks; `CombatTrack` manages
HP, temporary HP, Armor Class, death save pips, and active conditions; `ResourceSlots` tracks discrete spell
slots and rest-recharged charges; `TraitList` pairs attacks, spells, and features with tap-to-roll dice
macros; `Initiative` runs encounter turn order with combatant HP and statuses; `GearPack` computes carried
weight, attunement caps, and CP/SP/GP/PP coins. Casual dice pools (`play/Dice`) remain optional neighbors.

## Components (6)

### `StatBlock` · planned · data · phone
Four to eight tabletop RPG ability tiles (`STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA`, etc.) showing each
ability's base score, computed signed modifier (`+3`, `-1`), and saving-throw proficiency toggle. Tapping an
ability tile rolls `1d20` plus the computed modifier (and proficiency bonus when proficient) using device
entropy and surfaces the latest roll result cleanly.
- Pick: displaying RPG ability scores, computed modifiers, saving throws, and tap-to-roll checks. Not
  general metrics (`Stats`), medical body vitals (`health/Vitals`), or plain facts (`KeyValue`).
- Writes: `proficiencyBonus` int 1–10 (default 2), `stats` of `code` text(4), `label` text(16), `score` int
  1–30, `saveProficient` boolean (default false), 4–8; `style`. Code computes modifiers (`floor((score - 10) / 2)`),
  saving throw bonuses, and runtime `d20` check totals, never written by the model.
- Styles: `grid` (default, 2-column or 3-column ability score tiles), `compact` (tight inline/stacked bar).
- Parts → actions: stats `root press` (rolls ability/save check), stats `save toggle`.
- States: filled, loading, success (latest check total and natural `d20` displayed).
- Real path: character ability scores saved on the device; tapping triggers unbiased device-entropy random
  rolls against computed modifiers.

### `CombatTrack` · planned · input · phone
Live character combat dashboard displaying Armor Class, Initiative modifier, Speed, a segmented HP bar with
current, maximum, and temporary HP alongside quick damage and heal controls, three-pip Death Save success and
failure markers, and tappable active condition chips (`Poisoned`, `Prone`, `Concentrating`). Code absorbs
damage into temporary HP before subtracting current HP and clamps values safely.
- Pick: managing one RPG character's combat HP, temp HP, AC, death saves, and conditions. Not medical vitals
  (`health/Vitals`), multi-player card life totals (`play/LifeCounter`), or full encounter order (`Initiative`).
- Writes: `maxHp` int 1–999, `currentHp` int 0–999 (`currentHp` ≤ `maxHp`), `tempHp` int 0–999 (default 0),
  `ac` int 1–40, `initiativeBonus` int -10–20, `speed` int 0–300, `unit` (`ft`, `m`), `deathSuccesses` int 0–3
  (default 0), `deathFailures` int 0–3 (default 0), `conditions` of `label` text(16), `active` boolean, 0–6,
  `style`. Bloodied/downed alerts and clamped HP math are computed by code.
- Styles: `panel` (default, HP bar, quick damage/heal, AC/Speed/Init tiles, death saves, and conditions),
  `compact` (condensed HP bar, AC badge, and active condition pills).
- Parts → actions: `damage press`, `heal press`, `hp set` (signed integer delta), `deathSuccess toggle`,
  `deathFail toggle`, conditions `root toggle`.
- States: filled, loading, success (stabilized or healed), error (character downed at 0 HP).
- Real path: combat state persisted on the device so HP changes, temporary HP, death saves, and condition
  toggles stay synchronized across views.

### `ResourceSlots` · planned · input · phone
Grouped spell levels (Level 1–5+) and class ability charges (such as Ki, Rage, Action Surge, or Bardic
Inspiration) rendered as tappable available vs expended slot pips, paired with confirmed Short Rest and Long
Rest recovery buttons. Taking a rest restores only pools tagged to recover on that rest cadence.
- Pick: tracking discrete RPG spell slots and rest-recharged class charges. Not bookable time slots
  (`booking/Slots`), linear target bars (`Progress`), or single counters (`Counter`).
- Writes: `pools` of `poolId` text(24), `label` text(24), `max` int 1–12, `used` int 0–12 (`used` ≤ `max`),
  `recharge` (`short`, `long`, `dawn`), 1–6; `style`. Remaining charges and rest-recharge rules are computed
  by code.
- Styles: `pips` (default, tappable slot circles per spell level or class pool), `rows` (compact labeled rows
  with remaining counts and spend/recover controls).
- Parts → actions: pools `root toggle` (spends or restores next pip), `shortRest press`, `longRest press`.
  `meta.confirmParts: ["shortRest", "longRest"]`.
- States: filled, empty (no spell or feature pools configured), loading, success (resources restored on rest).
- Real path: local resource records per character; confirmed Short Rest and Long Rest apply deterministic
  recharge logic on the device.

### `TraitList` · planned · action · phone
Categorized weapons, spells, and racial or class actions displaying category badge (`weapon`, `spell`,
`feature`), range/reach, hit bonus or save DC badge (`+6`, `DC 14`), damage or effect dice formula
(`1d8+3`), and brief trigger rule. Tapping an entry executes its dice macro locally using device entropy and
shows the rolled dice and total inline.
- Pick: listing RPG attacks, spells, and traits with tap-to-roll dice macros. Not navigation shortcut tiles
  (`Actions`), workout movements (`health/Exercise`), or raw dice trays (`play/Dice`).
- Writes: `entries` of `traitId` text(24), `name` text(32), `kind` (`weapon`, `spell`, `feature`), `range`
  text(16) optional, `attackBonus` int -10–25 optional, `saveDc` int 1–35 optional, `formula` text(24)
  optional (e.g. `1d8+3 slashing`), `usesNote` text(24) optional, 1–6; `style`. Rolled outcomes and damage
  totals are runtime state, never model-written props.
- Styles: `macros` (default, action cards with hit/DC badge and inline roll readout), `reference` (compact
  rules and modifier listing).
- Parts → actions: entries `root press` (rolls attack/damage macro), entries `inspect select` (toggles rule
  detail).
- States: filled, empty, loading, success (rolled dice breakdown displayed).
- Real path: deterministic dice-expression evaluator backed by device randomness; works completely offline
  with zero server dependencies.

### `Initiative` · planned · data · phone
Turn-ordered DM and party combat tracker displaying round counter, active turn highlight, descending
initiative order, combatant name, ally/enemy/neutral badge, HP status bar, and condition pills, with Next
Turn, Add Combatant, and Mark Defeated controls. Advancing past the last active combatant automatically
increments the round counter.
- Pick: running turn-by-turn RPG combat initiative with combatant HP and defeated states. Not casual
  board-game turn rings (`play/TurnOrder`), text checklists (`Checklist`), or team sports lineups
  (`sports/Lineup`).
- Writes: `encounterTitle` text(32), `round` int 1–99 (default 1), `turnIndex` int 0–19 (default 0),
  `combatants` of `combatantId` text(24), `name` text(24), `side` (`ally`, `enemy`, `neutral`), `initiative`
  int -5–40, `hpCurrent` int 0–999, `hpMax` int 1–999, `defeated` boolean (default false), `conditions`
  text(14) each 0–3, 2–20; `addGoto` optional; `style`. Initiative sorting and round rollovers are computed
  by code.
- Styles: `tracker` (default, full encounter order with HP meters and active turn bar), `compact` (condensed
  turn order for player view).
- Parts → actions: combatants `root select`, combatants `hp set`, combatants `defeat toggle`, `next press`,
  `add press` (opens `addGoto`), `reset press`. `meta.confirmParts: ["reset"]`.
- States: filled, empty (no combatants added yet), loading, success (round advanced or encounter ended).
- Real path: encounter state stored locally on the DM's or table device; sharing live initiative state across
  multiple players' devices requires a shared app (`people` optional screen tier).
- Density: `meta.dense: true`, weight 3; combat encounters regularly hold up to 20 combatants with HP and
  condition statuses.

### `GearPack` · planned · input · phone
Character equipment inventory grouped by `equipped`, `attuned`, and `stowed` items with quantity steppers,
unit weights, a computed encumbrance progress bar against carry capacity, and a multi-denomination fantasy
coin purse (`CP`, `SP`, `GP`, `PP`). Changing quantities or attunement recalculates total weight and slot limits
automatically.
- Pick: tracking RPG equipment, attunement slots, carry weight, and multi-denomination coins. Not household
  or shop stock (`inventory/Things`), trip packing (`trips/PackingList`), or bank accounts (`money/AccountCard`).
- Writes: `carryCapacity` number > 0, `maxAttuned` int 1–6 (default 3), `coins` of `cp` int 0–99999, `sp` int
  0–99999, `gp` int 0–99999, `pp` int 0–99999, `items` of `itemId` text(24), `name` text(28), `status`
  (`equipped`, `attuned`, `stowed`), `qty` int 1–999, `unitWeight` number ≥ 0, `unit` (`lb`, `kg`), 1–6;
  `style`. Total weight, encumbered threshold warning, and attuned count (`N / maxAttuned`) are computed by code.
- Styles: `pack` (default, coin summary, encumbrance meter, and gear rows), `coins` (focused CP/SP/GP/PP
  coin-purse editor).
- Parts → actions: items `qty increment`, items `qty decrement`, items `status select`, items `remove press`,
  `coins set`. `meta.confirmParts: ["remove"]`.
- States: filled, empty, loading, error (attunement cap reached or over carry limit).
- Real path: character gear and coin counts persisted locally on the device; code enforces attunement slot
  limits and total carry weight locally.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `rpg_character` | Manage character sheet, spells, and gear | `rpg_sheet`, `rpg_spells`, `rpg_gear` | `rpg_sheet`: Header, StatBlock, CombatTrack, Note · `rpg_spells`: Header[back], ResourceSlots, TraitList, Note · `rpg_gear`: Header, GearPack, Note, Button |
| `rpg_encounter` | Run combat turn order and live rolls | `rpg_combat`, `rpg_round` | `rpg_combat`: Header, Initiative, Note · `rpg_round`: Header[back], CombatTrack, TraitList, Actions |
| `rpg_campaign` | Track party members and session notes | `rpg_party`, `rpg_notes` | `rpg_party`: Header, People, KeyValue, GearPack[coins] · `rpg_notes`: Header, Search, List, Composer[entry] |

Defaults: `rpg_character/rpg_sheet`, `rpg_encounter/rpg_combat`, `rpg_campaign/rpg_party`. Layout ids are
`rpg_`-prefixed and unique across the catalog. Recipes use only core plus `rpg`, stay within weight 12, and
place at most one dense component (`Initiative`) on a screen.

## Worked example: Torchlight

A 5e-style tabletop character and DM encounter companion app, separate from Ledge and Trot. On
`rpg_character/rpg_sheet`, `StatBlock` shows six attributes (`STR 10`, `DEX 18`, `CON 14`, `INT 12`,
`WIS 16`, `CHA 10`) with computed modifiers (`+0`, `+4`, `+2`, `+1`, `+3`, `+0`) alongside `CombatTrack`
(`28/34` HP, AC `16`, `Concentrating`). Opening `rpg_spells` lets the player tap a Level 2 slot in
`ResourceSlots` and roll a `2d8` spell attack on `TraitList`. During combat, `rpg_encounter/rpg_combat` runs
seven combatants in `Initiative` (Round 3), while `rpg_campaign/rpg_party` tracks the party roster and coin
purse (`142 GP`, `35 SP`). Signature: core `check_burst` when ticking off campaign quests, or standard tactile
feedback across rolls.

## Tiers

All six components work locally on one phone around the table. Sharing live `Initiative` or party rosters
across players' phones requires a shared app (`people` screen tier), and adding external dice-roller bots is
not required. No payments, accounts, or online services are implied.

## Build notes

- Order: `StatBlock`, `CombatTrack`, `ResourceSlots`, `TraitList`, `GearPack`, `Initiative`; all remain planned.
- All drawings compose existing kit bases (`KitCard`, `KitGrid`, `KitTile`, `KitRow`, `KitMeter`, `KitCheck`,
  `KitInput`, `KitStepper`, `KitTrack`, `KitChip`, `KitTrail`, `KitText`, `KitAction`); no new wave-6 kit
  base is needed (`play/Dice` uses `KitDiceFace` when combined).
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Never write computed ability modifiers, roll totals, encumbrance weights, or sorted initiative indices.
- `Initiative` is weight 3 (`meta.dense: true`) with 2–20 combatants; `StatBlock` renders 4–8 compact stat
  tiles at weight 2; other lists cap at 6 visible rows with shared overflow copy.
- Destructive or irreversible actions (`ResourceSlots.shortRest`, `ResourceSlots.longRest`, `Initiative.reset`,
  `GearPack.remove`) confirm via `meta.confirmParts`.

## Open questions

- **New action names?** None. Check rolls, damage/heal, rests, turn advance, add, reset, and remove use
  `press`; proficiency, death saves, conditions, slots, and defeat use `toggle`; status/inspect use `select`;
  gear quantities use `increment`/`decrement`; HP/coins use `set`.
- **Non-d20 rulesets?** Default: `StatBlock` accepts 4–8 arbitrary 3–4 char codes and `TraitList` accepts
  standard `XdY+Z` formulas so non-5e systems work cleanly without custom code.
- **3D animated dice or VTT battlemaps?** Default: out of scope (`Canvas`); pair optionally with `play/Dice`
  for shared physical pip faces.
