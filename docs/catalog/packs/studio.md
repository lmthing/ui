# `studio` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Visual creation and photo curation: dense photo albums,
before/after wipe comparisons, filter preset strips, brand kits, slot templates, AI prompt desks and
export queues. Not freehand brushes or NLE timelines (core `Canvas`), not media libraries (`media`), not
visual moodboarding (`curation`).

## Purpose

Structured photo curation and non-pixel visual creation: dense camera-roll albums and contact sheets,
draggable before/after image restoration wipes, filter and LUT preset strips, `swatch`-token brand
identity kits, reusable slot templates for graphics or short clips, AI image/video generation desks, and
render/export job queues. Freehand pressure brushes, pixel healing masks, RAW tone curves, and multi-track
NLE video timelines remain strictly in core `Canvas`.

## Apps it serves

Photo gallery & restoration companion, social graphic & short-video template designer, brand-kit studio,
AI image/video generation desk, mobile render/export manager.

## What the core already covers

- Capturing photos or video clips: core `Camera[photo/video]`.
- Showcasing one image: `Photo`; 2–6 inline photos: `Gallery[carousel/wide/tall]`.
- Freehand drawing, masking, pixel retouching, and multi-track NLE scrubbing: core `Canvas`.
- Published ebook/podcast/video libraries: `media`; staggered visual moodboards: `curation` (`PinGrid`).
- Selecting retail product variants: `commerce` (`VariantPicker`); form inputs: `Field`.

`PhotoAlbum` stays for dense 24-shot camera rolls and contact sheets; `BeforeAfter` for interactive wipe
comparisons between original and processed images *(Core Watchlist candidate)*; `PresetPicker` for visual
filter/LUT thumbnail strips and intensity sliders; `BrandKit` for project logos, closed `swatch` palettes,
and font pairings; `Template` for aspect-tagged reusable slot filling; `PromptStudio` for AI media prompt
desks and generated variants; and `ExportQueue` for render progress and saved/shared exports.

## Components (7)

### `PhotoAlbum` · planned · content · phone
Dense photo grid or date-grouped contact sheet of up to 24 shots displaying crisp thumbnails, optional
short shot titles and capture dates, clip duration pills on videos, favorite heart toggles, and batch
selection checkboxes for sharing or deleting.
- Pick: browsing or curating a camera roll or photo album of many shots. Not 2–6 inline gallery photos
  (`Gallery`), not variable-aspect inspiration pins (curation `PinGrid`), not book/show libraries (media
  `Library`), not owned goods (inventory `Things`).
- Writes: `albumTitle` text(28), `shots` of `shotId` text(24), `photo`, `title` text(24) optional,
  `takenAt` date optional, `seconds` number 1–3600 optional, `favorite` boolean (default false), `selected`
  boolean (default false), 1–24; `style`. Selected shot count and date group headers are computed by code.
- Styles: `grid` (default, dense 3-column square thumbnails with favorite hearts), `dated` (date-grouped
  contact sheet rows with shot titles).
- Parts → actions: shots `root press` (inspect shot), shots `favorite toggle`, shots `root check`,
  `delete press`, `share press`. `meta.confirmParts: ["delete"]`; `meta.partTiers: { share: "service" }`.
- States: filled, empty, loading, success (album updated or exported).
- Real path: device photo roll (`ok` media permission) or local app album (`phone`), with OS share-sheet
  export (`service`).
- Density: `meta.dense: true`, weight 3; dense albums and contact sheets render up to 24 shots.

### `BeforeAfter` · planned · content · phone
Two versions of the same image (original vs edited or restored) overlaid with a draggable wipe divider
slider (`KitSlider`) and corner labels, plus a toggle switching between wipe overlay and side-by-side
comparison. *(Core Watchlist: keep in `studio` initially; candidate for Core promotion if `Canvas` misses
show recurring need across `home`, `health`, `beauty`, or `requests`.)*
- Pick: comparing an original image directly against an edited, upscaled, or restored version. Not separate
  photos (`Gallery`), not a single showcase photo (`Photo`), not pixel retouching (`Canvas`).
- Writes: `beforePhoto`, `afterPhoto`, `beforeLabel` text(16) (default "Before"), `afterLabel` text(16)
  (default "After"), `split` number 0–100 (default 50), `style`. Code clamps `split` between 0 and 100 and
  keeps keyboard/slider steps synchronized.
- Styles: `wipe` (default, overlaid frames with draggable wipe bar), `side_by_side` (paired frames side by
  side with labels).
- Parts → actions: `split set`, `view toggle`.
- States: filled, loading, error (comparison image unavailable).
- Real path: pairs a local source image and processed output cached on the device (`phone`).

### `PresetPicker` · planned · input · phone
Large live image preview above a horizontally scrollable strip (`KitStrip`) of 2–8 visual filter, LUT, or
backdrop preset thumbnails ("Vivid", "Film", "Matte", "Noir") with an optional intensity slider (`0–100`)
and Reset/Apply actions.
- Pick: previewing and choosing a visual filter, LUT, or style preset on an image. Not text-only filter
  chips (`Chips`), not product color variants (commerce `VariantPicker`), not pixel brush tools (`Canvas`).
- Writes: `previewPhoto`, `presets` of `presetId` text(20), `label` text(16), `thumb` photo, 2–8;
  `selected` index (default 0), `intensity` number 0–100 (default 80) optional, `style`. Code disables the
  intensity slider on the Original preset (`index 0`) and tracks unsaved changes.
- Styles: `strip` (default, preview image above horizontal preset strip and intensity slider), `grid`
  (compact 2×4 preset preview tiles).
- Parts → actions: presets `root select`, `intensity set`, `reset press`, `apply press`.
- States: filled, loading, success (preset applied).
- Real path: declarative filter/LUT selection stored in the local project (`phone`); live GPU preview
  renders through the host media view.

### `BrandKit` · planned · content · phone
Creative identity card showing brand name, optional logo thumbnail, 2–6 color chips strictly from the
closed `swatch` vocabulary with role labels (`Primary`, `Accent`, `Surface`), and up to 2 font-pairing
labels (`Display`, `Body`) with sample preview copy.
- Pick: storing or applying a project's brand logo, swatch colors, and font pairings. Not shoppable product
  colors (commerce `VariantPicker`), not arbitrary RGB hex pickers (`Canvas`), not user bios (`Profile`).
- Writes: `brandName` text(32), `logo` photo optional, `colors` of `role` text(16), `swatch` (`black`,
  `white`, `grey`, `navy`, `blue`, `green`, `olive`, `red`, `pink`, `purple`, `yellow`, `orange`, `brown`,
  `beige`), 2–6; `fonts` of `role` (`display`, `body`), `family` text(28), 1–2; `active` boolean (default
  true), `style`. Code maps `swatch` values to fixed surface/foreground tokens so contrast always stays
  readable.
- Styles: `card` (default, logo, labeled swatch chips, and typography preview), `compact` (inline color
  palette bar and active font pair).
- Parts → actions: `apply press`, colors `root copy`, `edit press`.
- States: filled, empty, loading, success (brand kit applied).
- Real path: brand colors, logo asset, and typography choices stored in a local studio project on the phone
  (`phone`).

### `Template` · planned · input · phone
Reusable graphic or short-video template preview displaying an aspect badge (`1:1`, `9:16`, `16:9`, `4:5`)
and 2–8 typed slots (`text`, `photo`, `video`, `swatch`) filled inline without an NLE timeline. Slot
completion counters show how many fields remain before export.
- Pick: filling named text, photo, clip, or swatch slots of a reusable design or video template. Not
  generic settings forms (`Field`), not multi-track timeline scrubbing (`Canvas`), not brand asset cards
  (`BrandKit`).
- Writes: `title` text(32), `aspect` (`1:1`, `9:16`, `16:9`, `4:5`), `previewPhoto`, `slots` of `slotId`
  text(20), `label` text(20), `kind` (`text`, `photo`, `video`, `swatch`), `value` text(80) optional,
  `swatch` (`black`, `white`, `grey`, `navy`, `blue`, `green`, `olive`, `red`, `pink`, `purple`, `yellow`,
  `orange`, `brown`, `beige`) optional, `filled` boolean (default false), 2–8; `goto` (export queue),
  `style`. Filled slot count is computed by code.
- Styles: `editor` (default, aspect preview above typed slot rows), `preview` (full aspect frame with
  quick slot jump chips).
- Parts → actions: slots `value type`, slots `pick press`, slots `swatch select`, `render press` (goes to
  `goto`). `meta.partTiers: { pick: "ok" }`.
- States: filled, empty, loading, success (template queued to render).
- Real path: template definitions stored locally (`phone`); choosing replacement photos or video clips from
  the camera roll requires media permission (`ok`).

### `PromptStudio` · planned · input · service
AI image or video generation workspace combining a prompt composer box, optional reference-image attachment
pill, style chips (`Cinematic`, `Analog`, `3D`, `Minimal`), aspect selector (`1:1`, `9:16`, `16:9`, `4:5`),
a Generate button, and 0–4 generated variant previews with Save to Album and Remix actions.
- Pick: generating AI image or short-video variations from a text prompt and optional reference image. Not
  conversational text AI chat (`Bubbles`), not browsing existing albums (`PhotoAlbum`), not filling static
  templates (`Template`).
- Writes: `prompt` text(280), `refPhoto` optional, `styles` text(16) each 2–6; `selectedStyle` text(16)
  optional, `aspect` (`1:1`, `9:16`, `16:9`, `4:5`), `mode` (`image`, `video`), `variants` of `variantId`
  text(24), `photo`, `saved` boolean (default false), 0–4; `generating` boolean (default false), `style`.
  Code disables Generate when `prompt` is empty and exposes Save/Remix on generated results only.
- Styles: `desk` (default, prompt composer, style/aspect selectors, Generate trigger, and variant grid),
  `results` (prominent variant grid with compact prompt header).
- Parts → actions: `prompt type`, `ref press`, `style select`, `aspect select`, `generate press`, variants
  `save toggle`, variants `remix press`. `meta.partTiers: { ref: "ok" }`.
- States: filled, empty (awaiting first prompt), loading (generating variants), success (saved to album),
  error (generation failed or prompt blocked).
- Real path: dispatches prompt and optional camera-roll reference (`ok`) to an AI media generation service
  (`service`) returning up to 4 candidate variants.

### `ExportQueue` · planned · data · phone
Active and finished render or export jobs showing a thumbnail, project title, format/resolution tag
(`"1080p · MP4"`, `"4K · PNG"`), active progress bar (`KitMeter`), confirmed Cancel control while queued or
rendering, Retry on failures, and Save/Share triggers when finished.
- Pick: monitoring image or video render progress and saving or sharing exported files. Not delivery maps
  (places `DeliveryTracker`), not audio playlists (media `Playlist`), not static document lists (`FileList`).
- Writes: `jobs` of `jobId` text(24), `title` text(32), `thumb` photo, `format` text(20), `status`
  (`queued`, `rendering`, `done`, `failed`), `progress` number 0–1, `sizeMb` number > 0 optional, 1–6;
  `style`. Active and completed job counts are computed by code; Cancel applies to queued/rendering jobs,
  Retry to failed jobs, and Save/Share to done jobs.
- Styles: `queue` (default, job rows with progress meters and export actions), `compact` (condensed status
  and progress bars).
- Parts → actions: jobs `cancel press`, jobs `retry press`, jobs `save press`, jobs `share press`.
  `meta.confirmParts: ["cancel"]`; `meta.partTiers: { share: "service" }`.
- States: filled, empty, loading, success (saved or exported), error (render failed).
- Real path: local device media encoding queue (`phone`), with OS share-sheet export (`service`) for
  sending finished files externally.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `studio_albums` | Browse dense photo albums and compare original vs edited shots | `studio_grid`, `studio_album`, `studio_compare` | `studio_grid`: Header, Search, Chips, PhotoAlbum · `studio_album`: Header[back], PhotoAlbum[dated], Note, Button · `studio_compare`: Header[back], BeforeAfter, Note, Button |
| `studio_design` | Apply filter presets, maintain brand kits, and fill templates | `studio_presets`, `studio_template`, `studio_brand` | `studio_presets`: Header[back], PresetPicker, Note, Button · `studio_template`: Header[back], Template, BrandKit[compact], Button · `studio_brand`: Header, BrandKit, Note, Button |
| `studio_generate` | Prompt AI image/video generation and review variant results | `studio_desk`, `studio_results` | `studio_desk`: Header, PromptStudio, Note · `studio_results`: Header[back], PromptStudio[results], Gallery, Button |
| `studio_exports` | Track render progress and save or share exported files | `studio_queue` | Header, ExportQueue, Note |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `studio_`-prefixed and
unique. Recipes use only core plus `studio`, stay at or below weight 7, and keep at most one dense
weight-3 component per screen.

## Worked example: Atelier Snap (photo curation & template studio)

A small product photographer curates 18 shoot selects in `studio_albums/studio_grid` (`PhotoAlbum`), marks
four favorites, and inspects a restoration pass on `studio_albums/studio_compare` (`BeforeAfter`). Next,
`studio_design/studio_presets` tries "Film" at `65%` intensity on `PresetPicker`, while
`studio_design/studio_brand` keeps the client's `navy`, `beige`, and `orange` `swatch` palette in `BrandKit`.
Filling a 9:16 reel cover in `studio_design/studio_template` (`Template`) queues a 1080p MP4 render in
`studio_exports/studio_queue` (`ExportQueue`), and `studio_generate/studio_desk` drafts two studio-lit
backdrop variations in `PromptStudio`. Signature: `check_burst` on finished export confirmation.

## Tiers

`BeforeAfter`, `PresetPicker`, `BrandKit`, `Template`, and `ExportQueue` work locally on the `phone`;
picking media from the device roll in `PhotoAlbum`, `Template`, and `PromptStudio` uses `ok` permission
(`!needs-ok`). Sharing finished files in `PhotoAlbum`/`ExportQueue` and generating AI variants in
`PromptStudio` require `service` (`!needs-service`).

## Build notes

- Order: `PhotoAlbum`, `BeforeAfter`, `PresetPicker`, `BrandKit`, `Template`, `ExportQueue`,
  `PromptStudio`.
- Reuse `KitGrid`, `KitStrip`, `KitSlider`, `KitMeter`, `KitChip`, `KitTextArea`, and `KitPhoto`; no new
  kit base or signature is needed.
- Color tokens in `BrandKit` and `Template` MUST stick strictly to the closed 14-color `swatch` enum
  (`black`, `white`, `grey`, `navy`, `blue`, `green`, `olive`, `red`, `pink`, `purple`, `yellow`, `orange`,
  `brown`, `beige`), never free hex codes.
- Watchlist: monitor cross-pack `Canvas` misses for `BeforeAfter` across `home`, `health`, `beauty`, and
  `requests` to evaluate promoting `BeforeAfter` to core in a future wave.

## Open questions

- **New actions?** None. Wipe split and intensity sliders use `set`; presets, styles, aspects, and swatches
  use `select`; favorites and views use `toggle`; media picks, renders, and confirmed cancellations use
  `press`.
- **Multi-track timeline editing or layer brushes?** Out of scope for declarative schemas; keep NLE
  scrubbers and pressure brushes in core `Canvas`.
