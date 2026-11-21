# `curation` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Visual discovery and moodboarding: staggered pin grids,
pin details, collaborative boards, flatlay collages and visual style quizzes. Not shoppable catalogs
(`commerce`), not owned items (`inventory`), not photo editing (`studio`).

## Purpose

Collecting visual inspiration, inspecting palettes and sources, organizing saved pins into moodboards,
composing multi-slot flatlay collages, and calibrating aesthetic preferences. The pack owns visual
discovery and non-destructive moodboarding, never pixel-level retouching, inventory tracking, or retail checkout.

## Apps it serves

Home-remodel inspiration boards, outfit & capsule-wardrobe lookbooks, wedding aesthetic planners, creative
reference moodboards, design discovery feeds.

## What the core already covers

- One featured inspiration photo with a caption: `Photo`; 2–6 uniform photos or carousels: `Gallery`.
- Finding and filtering boards or tags: `Search`, `Chips`, `FilterBar`.
- Board metadata or dimensions: `KeyValue`; short styling notes: `Note`, `Composer[entry]`; featured item: `Card`.
- Text lists or ranked inspiration picks: `List`; saved venue/product ratings: `Review`.

`PinGrid` handles variable-aspect staggered masonry with quick-save toggles; `PinDetail` pairs high-res pin
inspection with extracted `Swatch` chips, board filing, and external source links; `IdeaBoards` draws
3-photo collage collections with collaboration badges; `CollageLayout` arranges 2–4 cutouts into a flatlay;
`StyleQuiz` calibrates visual taste using paired images or color palettes. Separate filter bars or plain
photo viewers stay core.

## Components (5)

### `PinGrid` · planned · content · phone
Two-column staggered variable-aspect masonry grid of visual inspiration pins, each showing a tall, square,
or wide photograph, optional short title and source tag, and a quick save-to-board toggle. Tapping a pin opens
its detail view; toggling save bookmarks it immediately to the active or default board without leaving the feed.
- Pick: browsing variable-aspect visual inspiration with quick save-to-board toggles. Not uniform 2–6 photo
  grids (`Gallery`), own camera rolls (`studio/PhotoAlbum`), or shoppable SKUs (`commerce/ProductGrid`).
- Writes: `pins` of `pinId` text(24), `photo`, `aspect` (`tall`, `square`, `wide`), `title` text(32)
  optional, `source` text(24) optional, `saved` boolean (default false), `boardId` text(24) optional,
  `goto` optional, 2–24; `style`. Code maintains staggered column heights and resolves saved status against
  the board store.
- Styles: `masonry` (default, two-column variable-aspect cards with title and source), `compact` (tight
  visual-only masonry hiding titles and source labels).
- Parts → actions: pins `root press` (opens `goto`), pins `save toggle`.
- States: filled, empty (no matching or saved pins), loading, error (feed failed to load).
- Real path: local or cached visual pin records stored on the device with host-resolved aspect ratios;
  toggling save updates the local board store without modifying image assets.
- Density: `meta.dense: true`, weight 3; staggered visual discovery feeds require up to 24 variable-aspect
  tiles beyond the six-row limit.

### `PinDetail` · planned · content · phone
Full visual pin inspection view displaying the high-resolution image, up to five extracted color chips from
the closed `Swatch` enum, creator attribution, an inline save-to-board selector, and an external source visit
link. Choosing a board files the pin there; tapping a swatch filters or highlights matching palettes.
- Pick: inspecting one visual inspiration pin, its extracted palette swatches, and saving it to a board.
  Not social text posts (`social/Post`), fixed-price retail items (`commerce/Product`), or before/after photo
  edits (`studio/BeforeAfter`).
- Writes: `pinId` text(24), `photo`, `title` text(40), `note` text(120) optional, `creator` text(28) optional,
  `swatches` of closed `Swatch` enum (`black`, `white`, `grey`, `navy`, `blue`, `green`, `olive`, `red`,
  `pink`, `purple`, `yellow`, `orange`, `brown`, `beige`) 0–5, `boardId` text(24) optional, `boards` of
  `boardId` text(24) and `title` text(24) 1–6, `sourceLabel` text(28) optional, `sourceUrl` (validated HTTPS
  URL, text(200)) optional, `saved` boolean (default false), `style`. Saved status and selected board come
  from the host board store.
- Styles: `detail` (default, large pin image above swatches, creator line, and board picker), `card`
  (condensed view with inline save and source link).
- Parts → actions: `save toggle`, `board select`, swatches `root select`, `source press` (when `sourceUrl`
  is set). `meta.partTiers: { source: "service" }`.
- States: filled, loading, success (saved to board), error (source unreachable or save failed).
- Real path: pin metadata and bundled/device imagery stored locally; opening `sourceUrl` hands off to the
  device browser (`service` tier), while palette chips and board filing stay on the phone.

### `IdeaBoards` · planned · content · phone
Visual moodboard collections rendered as three-image collage cards (one primary tile alongside two stacked
thumbnails) showing board title, computed pin count, private or collaborative badge, and open or create
controls. Collaborative boards display up to four member avatars and an invite action; removing a board
confirms before deleting the collection.
- Pick: organizing saved visual pins into named moodboard collections. Not Kanban stage boards (`data/Board`),
  physical storage containers (`inventory/Storage`), or photo contact sheets (`studio/PhotoAlbum`).
- Writes: `boards` of `boardId` text(24), `title` text(28), `covers` of `photo` 0–3, `pinIds` of text(24)
  0–24, `visibility` (`private`, `collaborative`), `collaborators` of `name` text(24) and `photo` optional
  0–4, `goto` optional, 1–6; `createGoto` optional; `style`. Code computes exact pin counts from `pinIds`
  and renders empty placeholders for unfilled cover slots.
- Styles: `collage` (default, three-photo preview cards with collaborator avatars), `rows` (compact thumbnail
  rows with count and privacy pill).
- Parts → actions: boards `root press` (opens `goto`), boards `invite press` (collaborative boards only),
  boards `remove press`, `create press` (opens `createGoto`). `meta.confirmParts: ["remove"]`;
  `meta.partTiers: { invite: "people" }`.
- States: filled, empty (no boards created yet), loading, success (board created or removed), error (update
  failed).
- Real path: board collections and pin links stored locally on the device; inviting collaborators requires a
  shared app (`people` tier).

### `CollageLayout` · planned · input · phone
Interactive 2-to-4 slot flatlay or moodboard composer tile for pairing visual cutouts (such as outfit pieces,
room finishes, or table decor) over a closed `Swatch` backdrop. Tapping a slot chooses or swaps a cutout,
moving slots rearranges the layout, and clear resets a slot after confirmation.
- Pick: combining 2–4 visual cutouts into one cohesive look, palette, or room flatlay. Not browsing raw photos
  (`Gallery`), text/video templates (`studio/Template`), or freehand drawing (`Canvas`).
- Writes: `title` text(32) optional, `template` (`split_2`, `trio_3`, `grid_4`), `backdrop` closed `Swatch`
  enum (default `white`), `slots` of `slotId` text(16), `label` text(20), `photo` optional, 2–4 (matching
  `template` count), `pickerGoto` optional, `style`. Filled slot count and completion readiness are computed
  by code.
- Styles: `flatlay` (default, spaced visual cutouts on backdrop swatch), `framed` (border-separated grid
  cells).
- Parts → actions: slots `root press` (opens `pickerGoto`), slots `swap move` (target slot label), slots
  `clear press`, `backdrop select`, `save press`. `meta.confirmParts: ["clear"]`.
- States: empty (unfilled slots), filled, loading, success (collage saved to board), error (save failed).
- Real path: cutout references and backdrop choice stored locally as a board entry; picking cutouts uses
  saved pins or local device photos without GPU pixel compositing.

### `StyleQuiz` · planned · input · phone
Visual aesthetic calibration step showing paired mood photographs or curated `Swatch` color palettes so the
person selects the looks that resonate to tune discovery tags. Tracks step progress across choices without
grading answers right or wrong.
- Pick: calibrating personal visual taste via paired photos or color palettes. Not sentence choices
  (`Choice`), star ratings (`Scale`), or graded assessments (`learning/Quiz`).
- Writes: `prompt` text(48), `step` int 1–6, `totalSteps` int 1–6 (`step` ≤ `totalSteps`), `mode` (`pairs`,
  `palettes`), `options` of `id` text(24), `label` text(24), `tag` text(16), `photo` optional (required in
  `pairs`), `swatches` of closed `Swatch` enum 3–4 (required in `palettes`), `selected` boolean (default
  false), 2–4; `style`. Selected tag vector and remaining steps are computed by code.
- Styles: `visual` (default, large paired image or palette cards), `compact` (two-column aesthetic tiles).
- Parts → actions: options `root toggle`, `skip press`, `next press`.
- States: filled, empty, loading, success (taste profile calibrated).
- Real path: chosen aesthetic tags persist on the device to rank and filter `PinGrid` inspiration feeds.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `curation_inspire` | Browse visual inspiration and inspect pins | `curation_feed`, `curation_pin` | `curation_feed`: Header, Search, Chips, PinGrid · `curation_pin`: Header[back], PinDetail, SectionTitle, PinGrid[compact] |
| `curation_boards` | Organize moodboards and flatlay collages | `curation_all`, `curation_collage` | `curation_all`: Header, Search, IdeaBoards, Button · `curation_collage`: Header[back], CollageLayout, Note, Button |
| `curation_taste` | Calibrate visual aesthetic preferences | `curation_quiz` | `curation_quiz`: Header[back], Steps, StyleQuiz, Note, Button |

Defaults: `curation_inspire/curation_feed`, `curation_boards/curation_all`, `curation_taste/curation_quiz`.
Layout ids are `curation_`-prefixed and unique across the catalog. Recipes use only core plus `curation`, stay
within weight 12, and place at most one dense component (`PinGrid`) on a screen.

## Worked example: Swatchbook

A kitchen remodel and wardrobe moodboard app, separate from Ledge's plant care and Trot's dog walking.
First launch opens `curation_taste/curation_quiz` where the person picks warm terracotta and oak palettes in
`StyleQuiz` to seed discovery tags. `curation_inspire/curation_feed` renders a 12-tile `PinGrid` filtered by
`Chips`; tapping Save bookmarks a tile directly into "Kitchen Refresh". Selecting a tile opens
`curation_inspire/curation_pin` with `PinDetail` showing extracted `beige`, `brown`, and `olive` swatches
alongside related pins below. `curation_boards/curation_all` lists three `IdeaBoards` with live computed
pin counts, and `curation_collage` pairs cabinet, brass-pull, and tile cutouts in `CollageLayout`. Signature:
core `card_swipe` only if paired with a save/skip stack; default curation uses ordinary tap feedback.

## Tiers

All five components work on the phone with local pin records and device photos. `PinDetail.source` opens an
external URL (`service`, `!needs-service`), and `IdeaBoards.invite` shares collaborative boards (`people`,
`!needs-people`). Adding local photos uses Core `Field[photo]` (`ok`), never hidden inside `CollageLayout`.

## Build notes

- Order: `PinGrid`, `PinDetail`, `IdeaBoards`, `CollageLayout`, `StyleQuiz`; all remain planned.
- Build wave-6 base `KitMasonry` (2-column staggered variable-aspect layout) before `PinGrid`; all other
  drawings compose existing `KitCard`, `KitPhoto`, `KitGrid`, `KitChip`, `KitOption`, and `KitAvatarStack`.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Colors in `PinDetail`, `CollageLayout`, and `StyleQuiz` must validate against the closed `Swatch` enum.
- One host board store backs `PinGrid`, `PinDetail`, `IdeaBoards`, and `CollageLayout` so saving a pin on
  one screen immediately updates board counts and collage pickers elsewhere.
- `PinGrid` is weight 3 (`meta.dense: true`) with 2–24 items; non-dense lists cap at 6 with shared overflow
  copy. Destructive actions (`IdeaBoards.remove`, `CollageLayout.clear`) use shared `meta.confirmParts`.

## Open questions

- **New action names?** None. Filing, opening, skipping, and saving use `press`; quick-save and quiz picks
  use `toggle`; board and swatch picks use `select`; slot reordering uses `move`.
- **Shoppable pin links or AR room placement?** Default: out of scope for `curation`; pair optionally with
  `commerce` for retail SKUs or `Canvas` for 3D AR room remodeling.
- **Masonry signature?** Default: none proposed; rely on standard card feedback or a core moment if needed.
