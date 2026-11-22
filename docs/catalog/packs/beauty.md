# `beauty` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Personal skincare/haircare care: AM/PM regimens, PAO shelf
life, INCI ingredient checks, beauty profiles and formula lookbooks. Not shopping (`commerce`), not salon
booking (`booking`), not AR try-on (`Canvas`).

## Purpose

Personal beauty, skincare, and haircare care on one phone: ordered AM, PM, and skin-cycling routine steps
with active-ingredient conflict warnings, Period-After-Opening (PAO) cosmetic shelf-life expiry tracking,
INCI ingredient safety and skin-type checks, personal skin/hair/undertone profiles, and saved hair/nail/makeup
lookbooks with shade and formula notes. This is a conditional `P3` pack focused on personal regimen and
vanity management, not retail shopping carts, salon appointment booking, or real-time AR virtual try-on.

## Apps it serves

Skincare routine and skin-cycling tracker, cosmetic vanity PAO expiry log, INCI ingredient safety checker,
personal shade and hair-porosity passport, salon formula and nail lookbook.

## What the core already covers

- Retail shade variants, product scanning, and store carts: `commerce` (`VariantPicker`, `Product`, `Cart`).
- Salon bookings and stylist calendars: `booking`; store loyalty barcodes: `PassCard`; product ratings: `Review`.
- Routine streaks: `Streak`; progress selfies: `Photo`, `Gallery`; skincare diary notes: `Composer[entry]`, `Note`.
- Live AR makeup, hair-color try-on, and lighted vanity mirrors remain `Canvas`.

`Regimen` orders AM/PM/cycle layers and flags active-ingredient conflicts; `ShelfLife` computes expiry from
opened date and PAO month stamps; `IngredientCheck` breaks down INCI safety scores and irritants;
`BeautyProfile` stores skin type, undertone, shade swatch, and hair porosity; `Lookbook` pairs saved beauty
inspiration with copyable salon shade formulas.

## Components (5)

### `Regimen` · planned · input · phone
Ordered skincare or haircare routine split across `am`, `pm`, and `cycle` windows, showing step layer order
(`1. Cleanse`, `2. Treat`, `3. Moisturize`), product thumbnail and name, active-ingredient badge (`Retinoid`,
`AHA/BHA`, `Vitamin C`, `SPF`), completion checkbox, and an automatic warning banner when conflicting actives
appear in the same routine window.
- Pick: organizing ordered AM/PM or cycling beauty routine steps with active-ingredient conflict warnings.
  Not daily prescription pills (`health/Medication`), household chores (`home/Chores`), or plain task lists
  (`Checklist`).
- Writes: `window` (`am`, `pm`, `cycle`), `cycleDay` text(16) optional (`cycle` window only), `steps` of
  `stepId` text(24), `order` int 1–6, `category` text(16), `productName` text(28), `photo` optional,
  `activeTag` (`none`, `retinoid`, `aha_bha`, `vitamin_c`, `niacinamide`, `benzoyl`, `spf`), `done` boolean
  (default false), `goto` optional, 1–6; `style`. Conflict warnings (such as `retinoid` paired with `aha_bha`
  or `benzoyl`) and completion totals are computed by code.
- Styles: `steps` (default, numbered layer cards with active badges and conflict notice), `compact` (tight
  check rows for fast daily check-off).
- Parts → actions: `window select`, steps `done check`, steps `root press` (opens `goto`).
- States: filled, empty, loading, success (routine completed), error (active-ingredient conflict detected).
- Real path: routine steps stored locally on the device; conflict rules evaluate deterministic ingredient-tag
  pairs locally without medical diagnosis.

### `ShelfLife` · planned · data · phone
Vanity shelf tracker listing opened cosmetics and skincare bottles with product thumbnail, brand and name,
opened date, Period-After-Opening badge (`3M`, `6M`, `12M`, `18M`, `24M`, `36M`), computed expiration date
and freshness pill (`fresh`, `expiring_soon`, `expired`), and Finish or Discard actions. Code computes
expiration dates from `openedOn` plus `paoMonths` and sorts expired/expiring items first.
- Pick: tracking opened cosmetic products by Period-After-Opening (PAO) expiration dates. Not food pantry
  expiry (`kitchen/Pantry`), store purchase warranties (`inventory/Warranties`), or contracts (`paperwork/Renewals`).
- Writes: `items` of `itemId` text(24), `name` text(28), `brand` text(24), `photo` optional, `category`
  text(16), `openedOn` date, `paoMonths` (`3`, `6`, `12`, `18`, `24`, `36`), `status` (`active`, `finished`,
  `discarded`), `goto` optional, 1–6; `style`. Expiration date, months remaining, and warning tones are
  computed by code from `openedOn`, `paoMonths`, and the host clock.
- Styles: `shelf` (default, vanity product cards grouped by freshness status), `rows` (compact expiry rows).
- Parts → actions: items `root press` (opens `goto`), items `finish press`, items `discard press`.
  `meta.confirmParts: ["discard"]`.
- States: filled, empty (no opened products logged), loading, success (item finished or discarded).
- Real path: local vanity shelf records on the device using the host calendar for PAO arithmetic.

### `IngredientCheck` · planned · data · phone
Cosmetic INCI ingredient analyzer displaying product name, overall compatibility score (`0–100`), personalized
skin-match badge (`Suitable`, `Caution`, `Avoid`), up to four flagged irritant/comedogenic/fragrance tags,
and up to six notable INCI ingredients with role and concern level. Tapping an ingredient row expands its
plain-language function note; optional barcode scan triggers Core/device lookup (`ok`).
- Pick: analyzing a cosmetic formula's INCI ingredients for irritants, compatibility score, and skin-type
  match. Not food nutrition labels (`kitchen/NutritionFacts`), medical labs (`medical/LabPanel`), or user
  reviews (`Review`).
- Writes: `productName` text(32), `brand` text(24), `score` int 0–100, `match` (`suitable`, `caution`,
  `avoid`), `flags` of `label` text(20), `tone` (`good`, `warn`, `bad`), 0–4, `ingredients` of `inci`
  text(32), `role` text(24), `concern` (`low`, `moderate`, `high`), `note` text(100) optional, 1–6; `style`.
  Warning count and score color tone are computed by code.
- Styles: `report` (default, score meter, skin-match pill, flags, and expandable INCI rows), `compact`
  (summary score and flagged irritants only).
- Parts → actions: ingredients `root toggle` (expands ingredient note), `scan press` (barcode scan),
  `save press`. `meta.partTiers: { scan: "ok" }`.
- States: filled, empty (no formula checked yet), loading, error (formula or barcode unrecognized).
- Real path: ingredient lookup against an offline INCI reference table or scanned product barcode (`ok`
  camera permission); informational cosmetic guidance, never dermatological advice.

### `BeautyProfile` · planned · input · phone
Personal skin, undertone, and haircare passport recording skin type (`oily`, `dry`, `combination`, `normal`,
`sensitive`), up to four skin concerns, undertone (`cool`, `neutral`, `warm`, `olive`), shade swatch from
the closed `Swatch` enum, hair curl pattern (`straight`, `wavy`, `curly`, `coily`), porosity (`low`, `medium`,
`high`), and up to six avoided ingredient tags. Saving syncs sensitivity flags across `IngredientCheck`.
- Pick: recording personal skin type, undertone, hair texture, and sensitivities to tailor care checks. Not
  general user identities (`Profile`), body measurements (`health/Measurements`), or plain form fields (`Field`).
- Writes: `skinType` (`oily`, `dry`, `combination`, `normal`, `sensitive`), `concerns` of text(18) 0–4,
  `undertone` (`cool`, `neutral`, `warm`, `olive`), `shadeSwatch` closed `Swatch` enum, `hairPattern`
  (`straight`, `wavy`, `curly`, `coily`), `hairPorosity` (`low`, `medium`, `high`), `avoidTags` of text(20)
  0–6, `style`. Profile completeness is computed by code.
- Styles: `passport` (default, interactive trait selectors and shade swatch), `summary` (compact read-only
  profile card).
- Parts → actions: `skin select`, `concerns toggle`, `undertone select`, `swatch select`, `hair select`,
  `porosity select`, `save press`.
- States: filled, empty, loading, success (profile saved).
- Real path: personal attributes saved locally on the device and shared with `IngredientCheck` to highlight
  personal trigger ingredients without cloud accounts.

### `Lookbook` · planned · content · phone
Saved hair, nail, and makeup inspiration cards pairing look photographs, category badge (`makeup`, `hair`,
`nails`), occasion tag, exact salon or product formula notes (such as `"Balayage 7N + Gel 214"`), up to
three shade chips from the closed `Swatch` enum, and save or copy-formula actions.
- Pick: saving hair, nail, or makeup looks paired with exact shade names and formula notes. Not generic
  photo grids (`Gallery`), general inspiration moodboards (`curation/PinGrid`), or shop SKUs
  (`commerce/ProductGrid`).
- Writes: `looks` of `lookId` text(24), `title` text(28), `category` (`makeup`, `hair`, `nails`), `photo`,
  `occasion` text(20) optional, `formulaNote` text(120), `shades` of `name` text(24), `swatch` closed
  `Swatch` enum, 0–3, `saved` boolean (default true), `goto` optional, 1–6; `style`.
- Styles: `cards` (default, look photo cards with shade chips and formula notes), `grid` (two-column visual
  lookbook).
- Parts → actions: looks `root press` (opens `goto`), looks `save toggle`, looks `formula copy`.
- States: filled, empty, loading, success (formula copied to clipboard or look saved).
- Real path: local saved lookbook entries and device photos; copying a formula puts text on the clipboard for
  salon appointments.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `beauty_routine` | Follow daily routines and check ingredients | `beauty_today`, `beauty_ingredients` | `beauty_today`: Header, Segmented, Regimen, Streak · `beauty_ingredients`: Header[back], Search, IngredientCheck, Note |
| `vanity_shelf` | Track opened PAO shelf life and lookbooks | `beauty_shelf`, `beauty_looks` | `beauty_shelf`: Header, ShelfLife, Note, Button · `beauty_looks`: Header, Chips, Lookbook |
| `beauty_match` | Set personal skin, hair, and undertone profile | `beauty_profile` | `beauty_profile`: Header, BeautyProfile, Note, Button |

Defaults: `beauty_routine/beauty_today`, `vanity_shelf/beauty_shelf`, `beauty_match/beauty_profile`. Layout
ids are `beauty_`-prefixed and unique across the catalog. Recipes use only core plus `beauty` and stay
within weight 12.

## Worked example: DewShelf

A personal skincare regimen, vanity PAO tracker, and salon formula notebook, separate from Ledge and Trot.
On `beauty_match/beauty_profile`, `BeautyProfile` records `combination` skin, `warm` undertone, `beige`
swatch, and `fragrance` avoidance. On `beauty_routine/beauty_today`, `Regimen` orders four PM steps and
flags a conflict when both `aha_bha` exfoliant and `retinoid` serum are placed in the same night window,
while Core `Streak` marks five consecutive routine nights. Checking a new serum on
`beauty_routine/beauty_ingredients` runs `IngredientCheck` (score `84`, `Caution` due to essential oil). On
`vanity_shelf/beauty_shelf`, `ShelfLife` warns that an SPF opened 11 months ago with `12M` PAO expires next
month. Signature: core `streak_flame` on the routine streak.

## Tiers

All five components work locally on the `phone`. Only `IngredientCheck.scan` requires camera permission (`ok`,
`!needs-ok`). Retail shade shopping, salon reservations, and loyalty barcodes stay in optional combinations
with `commerce`, `booking`, and Core `PassCard`.

## Build notes

- **Priority: `P3 (conditional priority)`** — Defer implementation until real `Canvas` misses demonstrate
  recurring demand for personal skincare regimens, PAO expiry tracking, and INCI checks beyond Core
  (`PassCard`, `Gallery`, `Review`, `Canvas` AR) plus `commerce` (`VariantPicker[shade]`) and `booking`.
- Order (when built): `Regimen`, `ShelfLife`, `BeautyProfile`, `IngredientCheck`, `Lookbook`; all remain planned.
- All drawings compose existing kit bases (`KitCard`, `KitRow`, `KitPhoto`, `KitTrack`, `KitChip`, `KitCheck`,
  `KitMeter`, `KitOption`, `KitGrid`, `KitTrail`, `KitText`, `KitAction`); no new wave-6 kit base is needed.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Never write computed PAO expiry dates, ingredient conflict counts, or raw color hex codes (closed `Swatch`
  enum only).
- Every component is weight 2 and caps lists at 6 items with shared overflow copy; `ShelfLife.discard` confirms
  via `meta.confirmParts`.

## Open questions

- **New action names?** None. Opening, finishing, discarding, scanning, and saving use `press`; window and
  profile traits use `select`; steps use `check`; expansion, concerns, and look saves use `toggle`; copying
  salon notes uses `copy`.
- **Live AR makeup/hair try-on or skin-scanning ML?** Default: stays in `Canvas` / native camera SDKs, never
  modeled inside `beauty`.
- **Medical dermatology claims?** Default: informational cosmetic tracking only; clinical skin treatment
  belongs in `medical`.
