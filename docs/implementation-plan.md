# lmthing/ui: technical implementation plan

This repository holds the component system as one package, `@lmthing/ui`, with two entry points: the **catalog** (`@lmthing/ui/catalog`: every token, theme, component, pack, archetype and rule, as data, with no React) and the **kit** (`@lmthing/ui/kit`: the Tamagui views that draw it). Each component is one file that holds its data and its view. lmthing loads this repo as a git submodule at `packages/ui`. Other projects can use it later as a git submodule or as a published package.

The product context lives in the lmthing build spec (`docs/spec.md` in the lmthing repo). This plan covers current code and the requirements still to build here. Where the two disagree on something inside this repo, this plan wins.

Built: 45 core components, 17 archetypes/35 layouts, browser controls and accepted browser motion/reduced-motion behaviour. **Pending:** full
themes, 27 planned packs, surfaces, repair/reader APIs, runtime detectors, native and release gates.
The scope table is the full requirement, not a claim that each row is complete.

## 1. Scope

| In this repo                                                                                                                                                   | Not in this repo                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Design tokens, 12 presets, 12 accents, theme generation and contrast checks                                                                                    | THING's own studio interface (shell tokens, shell primitives)                                                            |
| The `Meta` types and prop helpers for components, packs, archetypes, surfaces and signatures                                                                   | Prompts for model roles, the agent, model routing                                                                        |
| All core and pack component definitions, archetypes, surfaces, signatures                                                                                      | The op/message protocol, `fold()`, the full app `Spec` type                                                              |
| Screen rules (regions, rhythm, weight, limits, neighbours, placeholders) and the first two validation steps, parse and component repairs, with item ids (4.14) | Screen, app and scope repairs (R3 to R6), and everything that needs an app: flows, waves, carry-over of ids on a rewrite |
| The part address grammar and component-level types                                                                                                             | The stage, camera, gestures, hit testing                                                                                 |
| Catalog choice blocks, multiline write entries and strict writer schemas                                                                                       | Voice, sessions, storage                                                                                                 |
| Kit renderers, kit bases, screen layout, morphing, states, surfaces, signature motion                                                                          | Navigation. Links are emitted as data through a callback                                                                 |
| Render issue detection (`clipped_text`, `overflow`, `empty_section`, `low_contrast`)                                                                           | Deciding what to do about an issue                                                                                       |
| Reading and acting for agents: a compact text form of every screen, a typed action vocabulary, one dispatcher for human and agent input                        | Exposing it to agents (a `window` hook, where acting is allowed). Hosts decide                                           |
| A gallery app for development, review and screenshot tests                                                                                                     |                                                                                                                          |

**Consumers.**

- The lmthing **agent** imports `@lmthing/ui/catalog` only, the built data-only entry with no React in it.
- The lmthing **app** imports `@lmthing/ui/catalog` and `@lmthing/ui/kit`.
- **Future projects** import either entry and supply their own host (theme choice, link handling, photo resolution, part registry).
- **Agents** (browser agents, test runners, lmthing's Critic and evals) read screens as compact text and act on them by address, through the host's hook (sections 4.12 and 5.9).

## 2. Principles

1. **Data first.** Every component is defined once as data. The prompt line, the Zod schema, the default content and the kit prop types all come from that one definition, so they share one source.
2. **No free values.** Nothing the catalog accepts carries a colour, size, spacing, layout or motion value. Look comes from tokens, presets and fixed tables.
3. **One file per component.** Each id has one file, named after it, holding its data (`meta`, `props`, `fallback`, `examples`) and its view. The view's prop types come from the file's own schema. A non-draft file without a view fails a test.
4. **Host owns the world.** The kit never navigates or measures the stage. It keeps ephemeral interaction state and invokes host callbacks for links, photos and media. Hosts own persistence and outside effects; render issue detectors remain pending.
5. **Peer dependencies, not bundled ones.** React, React Native Web, Tamagui, Lucide icons and SVG are current kit peers. React Native and Reanimated peers are **pending** (5.1). The catalog entry depends on `zod` only.
6. **Small files, plain code.** At most 200 lines per code file and 60 per function. Lint enforcement is **pending**. Named exports only (default exports only in the gallery's route files), plain functions and plain data, no classes. Other folders import a folder only through its `index.ts`.
7. **Agents read and act like people.** Every screen has a compact text form generated from the same data it is drawn from, and every part that people can touch has typed actions. An agent action runs exactly the code a human touch runs. Agents never need raw DOM or screenshots.
8. **Generic where it costs nothing.** Nothing here mentions THING, takes, trailers or sessions. Tiers and `realPath` are required on every component because any app generator needs to know what a part depends on. Signature metadata is optional.
9. **Developable alone.** The gallery host, runtime fixtures and probe runner work without lmthing. Worked pack apps and the model-text repair pipeline (4.14) remain pending. The app and harness depend on this repo and never the other way round.

## 3. Repository layout

One pnpm workspace with one private package, one optional asset-package scaffold and one private web app.
The tree starts at the workspace root. API paths elsewhere are relative to `packages/ui`.

```text
package.json, pnpm-workspace.yaml, tsconfig.base.json, .nvmrc
docs/implementation-plan.md, component-guide.md, visual-rubric.md, dependencies.md, catalog/
packages/ui/
  src/catalog/
    meta/           Meta, Props, pack ids and pack metadata
    props/          text, icon, photo, media, screen-id, tier, date, secret, swatch
    cast/           ordered fields, items and neutral placeholders; copy.ts for shared words
    tokens/         space, size, radius, type, elevation, motion, roles, component
    themes/         calm/bold/editorial, accents, theme-name, kit-style, theme-roles
    archetypes/     17 core definitions, recipes, defaults and compose declarations
    rules/          regions, rhythm, weight, limits, neighbours, placeholders, core, check-screen, check-packs
    address/        grammar, parse, format, climb
    types/          component, cast, tier, action
    lines/          stamp-ids (item ids)
    prompt/         entry, block, pack-index, estimate-tokens
    agent/          affordances, read, act, live-props, validate-value
    probes/         run, score, prompts, signature, pack and compose runners, merge-pairs
    registry/       create-registry
    migrations/     aliases, day-timeline
    icons.ts, signatures.ts
  src/components/   45 PascalCase files, each with data and view; adjacent tests
  src/kit/
    provider/       KitProvider, context, useKit, useKitStyle, environment, useEnvironment
    tamagui/        tokens, fonts, animations, themes.generated, theme-name
    base/           exported bases and helpers (5.4)
    part/           part-context, usePart
    screen/         Screen, PhoneScreen
    registry/       types, noop, memory
    interact/       store, agent, controller, media, live-screen, control-step, use-control, use-swipe
    motion/         animate, KitMotion, KitPresence, use-motion
  src/entry/        generated, gitignored: catalog.ts, renderers.ts, kit.ts
  scripts/          builds, checks, probes, look and shoot; entries/ scanner and generator
  test/             render helper, conformance, reading, runtime, controls, motion, archetypes, probes, recordings/, known/
apps/gallery/       Vite + React Native Web; query-selected previews, runtime and controls
```

**Pending layout requirements.** `eslint.config.js`, Changesets config, `ci.yml` and `release.yml`;
catalog lookup helpers (`nearest-icon`, `nearest-tag`, `clamp`, `snap-enum`), `photos.ts`, `version.ts`,
R1/R2 `parse-line`, repair `read-component`, `assemble-screen` and `codes`, `readApp`/delta formatting;
pack `pack.ts`, components, archetypes and `example.jsonl`; surface files; bundled fonts and photos;
kit runtime report detectors, the complete mounted action registry and `settle`; gallery fixture,
pack/archetype/theme/agent pages and baseline/axe suites. The corresponding README-only folders are
requirements, not implemented APIs. Core motion and defaults live in `kit/motion` and catalog
archetypes, not the scaffold `kit/signature` and `kit/archetypes` folders.

**Dependency direction.** `src/catalog` imports only `zod` and itself. Components, packs and surfaces
import catalog, kit and peers. Kit imports catalog and peers. Gallery imports the package; photos
stands alone. Nothing imports from `apps/`.

**Two entries from the same files.** `scripts/build-entries.ts` calls the reusable scanner/generator
in `scripts/entries/`. It finds component data exports (`meta`, `props`, `fallback`, `examples`,
`probes`) and ready views, rejects missing exports and duplicate ids, and collects pack metadata,
archetypes and JSON Lines examples. Generated exports include `components`, `ComponentName`, `packOf`,
`packs`, `packArchetypes`, inlined `packExamples`, `createRegistry` and a no-argument `buildPackIndex`.
The generated kit wraps `PhoneScreen` with the definitions and renderer map.

Esbuild builds the catalog with React/Tamagui and kit imports stubbed so unused views disappear.
`scripts/bundle-check.ts` rejects forbidden imports in catalog source or the bundle, imports the
result in plain Node, parses every example and checks empty-cast fallbacks. TypeScript emits
declarations. Kit builds ESM with peers external. Both exports have a `source` condition; workspace
TypeScript and gallery use it. Node model callers use `dist/catalog.js`, never component source.

## 4. The catalog entry (`@lmthing/ui/catalog`)

### 4.1 Types

Component-level types live here so kit never depends on a host protocol. Hosts re-export them.

```ts
export type Tier = "phone" | "ok" | "people" | "service";
export type StateName = "filled" | "empty" | "loading" | "success" | "error";
export type ComponentId = string;
export type Component = { id: string; c: ComponentId; state?: StateName } & Record<string, unknown>;
export type ScreenLike = { id: string; title?: string; components: Component[] };
export type CastLike = {
  things: { type: string; fields: string[] }[];
  items: { id: string; type: string; sample: boolean; [field: string]: unknown }[];
};
export type Issue = { code: string; address: string; message: string };
export type ActionName =
  | "press"
  | "toggle"
  | "check"
  | "select"
  | "type"
  | "set"
  | "increment"
  | "decrement"
  | "swipe"
  | "start"
  | "stop"
  | "dismiss"
  | "play"
  | "pause"
  | "seek"
  | "flip"
  | "move"
  | "send"
  | "scan";
export type ScreenAction = "back" | "tab" | "scroll";
export type ActionSpec = {
  parts?: Record<string, readonly ActionName[]>;
  items?: Record<string, readonly ActionName[]>;
  when?: Record<string, Record<string, string | boolean>>;
};
```

`ScreenLike` comes from `catalog/agent`, and `Issue` from `catalog/rules`. `ComponentName` is the
generated id union; `ComponentId` itself remains `string`. `Props<typeof props, typeof meta>` infers
schema output and stamped item ids. `actions.when` gates a part or `part.action` by prop values.
Item rules read the item first, then component props; `$first: true` limits an action to the first item.

**Pending:** `PropsOf<Id>` and a revision-bearing screen contract with `rev`, `archetype` and `layout`.
Hosts can carry those fields, but the current kit and reader do not consume them.

### 4.2 Component files and shared helpers

One file per component, `src/components/<Id>.tsx`, holds its data and view. Pack components follow
the same shape. [The component guide](component-guide.md) and `List.tsx` / `List.test.ts` are binding.

Core and pack component folders (`src/components` and `src/packs/<pack>/components`) are exempt from
the 12-file folder limit. So are the pack per-component test folders, `src/packs/<pack>/tests` and
`src/packs/<pack>/tests/components`. These exemptions do not extend to other subfolders.

| Export     | What it is                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `meta`     | A plain object, `as const satisfies Meta`                                                                     |
| `props`    | A strict Zod object; strings have limits, arrays have maxima                                                  |
| `fallback` | `({ cast }) => props input`, built from ordered cast fields through shared helpers, else neutral placeholders |
| `examples` | At least two schema-valid inputs; domain content lives only in examples and probes                            |
| `probes`   | Choose/write/read model tests (4.13); code-owned components have read only                                    |
| `<Id>`     | The named React view; absent only for `status: "draft"`                                                       |

The 2026-11-18 writer design has no `meta.aliases`. The rest of the component contract is:

```ts
export type Meta = {
  id: string;
  group: "structure" | "content" | "data" | "input" | "action" | "beyond" | "signature" | "escape";
  purpose: string; // at most 16 words
  pick: string; // when to use it, naming the nearest wrong choice
  writeHints?: readonly string[];
  region: "top" | "body" | "bottom" | "overlay";
  weight: 0 | 1 | 2 | 3;
  weightByStyle?: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  signatureByStyle?: Readonly<Record<string, string>>;
  tier: Tier;
  partTiers?: Readonly<Record<string, Tier>>;
  realPath: string;
  dense?: true;
  confirmParts?: readonly string[];
  items?: { key: string; parts: readonly string[]; prefix?: string; visible?: "all" | "first"; variants?: ItemVariants };
  variants?: Variants; // shared axes (4.2a), default value first
  variantParts?: Readonly<Record<`${Axis}.${string}`, { adds?: readonly string[]; hides?: readonly string[] }>>;
  parts?: readonly string[];
  states?: readonly StateName[];
  actions?: ActionSpec;
  read?: (props: unknown, state: StateName) => string[];
  signature?: string;
  status?: "draft" | "ready";
  codeOwned?: boolean;
};
```

`overlay` is outside screen flow and weight. `weightByStyle` and `signatureByStyle` cover options such
as `Timeline[hours]`. `partTiers` marks dependencies of individual actions. `confirmParts` names
declared parts; `dense` identifies dense pack components. `items.visible: "first"` makes stacks read
only the visible item plus a count. `codeOwned` keeps `TabBar` drawable/readable but out of model choices.

**Names.** File, view, `meta.id` and wire `c` are the same PascalCase id. Resolve exact ids, then
case/separator-insensitive ids, then migration aliases through `legacyTarget` (4.6). Avoid browser
globals (`MapPins`, `ClientHistory`, `EventCard`). Packs and archetypes use lowercase ids.

`PackMeta` has `id`, `name`, `purpose`, `pick`, `example` and required `probes`. The generator collects
a pack's components and at least two archetypes, so `pack.ts` does not import component files.
Core archetypes export `meta` and compose `probes`. `CoreArchetypeMeta` has `id`, `purpose`,
`layouts: { slots, writeHints? }` and `defaults` by layout; each slot has `id`, `allow`, `min`, `max` and optional
`variant`. The separate pack `ArchetypeMeta` contract still uses `job`, `layouts: { recipe, defaults }`
and `defaultLayout`, with `allow`, `required`, `min` and `max` slots. Do not conflate these two APIs.

**Pending surfaces.** `SurfaceMeta` and `LockScreen`, `Widget`, `Message` files must carry `id`,
`purpose`, `tier`, `realPath`, optional `parts` and `status`, with `props`, `fallback`, `examples`,
probes and a view. No region, weight, group, items or actions; no component aliases. Surfaces never
occupy a screen slot or count toward its component limit. The host supplies app name and icon.

**Shared helpers** in `catalog/props` attach schema metadata used by prompts and readers:

| Helper or prop        | Values and behaviour                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `text(max)`           | Trimmed bounded text                                                                           |
| `icon`                | Curated Lucide enum; invalid names fail the schema                                             |
| `photo`, `media`      | `lib:<tag>` or positive `local:<n>`, bounded to 64 characters; never URLs or file paths        |
| `screenId` / `goto`   | A screen id, `back`, or `sheet`                                                                |
| `isoDate`, `clock`    | Real `YYYY-MM-DD` dates and `HH:MM` clocks                                                     |
| `tier`, `secret(max)` | Dependency vocabulary; secrets read as `(secret)`                                              |
| `swatch`              | 14 fixed product-colour names in `tokens/component.ts`; unknown names snap to the nearest name |
| `tone`, `mark`        | Shared item axes (4.2a): `neutral`, `good`, `warn`, `bad`; `none`, `highlight`, `muted`, `new` |
| `style`, `kind`       | Bounded per-component enums for structure no shared axis covers; bases map them to treatments  |
| `variantProps(axes)`  | Spreads the declared shared variant axes (4.2a) into the props object                          |

Product swatches represent product data, not free UI colour. `screenId` checks a bounded snake_case
string; special `back`/`sheet` targets are interpreted by the runtime, not a separate link enum.
Components still accept no raw colour,
size, font, spacing or motion values. Schemas and plain lookup tables are made at import; validation
runs in tests and build checks, not automatically on catalog import.

### 4.2a Shared variant axes

One closed vocabulary of variant axes is shared by every core and pack component (spec, technical
decisions). An axis value is a name the theme turns into tokens; it never carries a number, colour or
font. A component's own `style` keeps only structural choices that no axis covers (List `shelf`,
Gallery `carousel`, Scale `stars`).

| Kind       | Axis       | Values                                          | Meaning                                         |
| ---------- | ---------- | ----------------------------------------------- | ----------------------------------------------- |
| Finish     | `density`  | `comfortable`, `compact`                        | Row height, spacing and type step               |
| Finish     | `emphasis` | `quiet`, `normal`, `hero`                       | Prominence on the screen                        |
| Finish     | `surface`  | `plain`, `card`, `tinted`, `outlined`           | Container treatment                             |
| Finish     | `align`    | `start`, `center`                               | Alignment of the component's own content        |
| Finish     | `bleed`    | `inset`, `edge`                                 | Inside the gutter or edge to edge               |
| Finish     | `aspect`   | `auto`, `square`, `wide`, `tall`                | Media frame shape                               |
| Content    | `detail`   | `full`, `brief`                                 | Secondary text (subtitles, meta) shown or not   |
| Content    | `media`    | `none`, `icon`, `thumb`, `cover`                | Image treatment where images exist              |
| Content    | `figures`  | `exact`, `short`                                | `1,240` or `1.2k`, `3 h 05 min` or `3 h`        |
| Content    | `labels`   | `key`, `none`, `all`                            | Value labels on charts                          |
| Collection | `arrange`  | `rows`, `grid`, `strip`                         | Rows, a grid, or a horizontal strip             |
| Collection | `group`    | `none`, `sections`, `dates`                     | Item grouping with headers                      |
| Collection | `overflow` | `all`, `peek`, `page`                           | All items, the first few then "see all", pages  |
| Collection | `lead`     | `none`, `icon`, `avatar`, `thumb`, `number`, `check` | Leading accessory of each row              |
| Collection | `trail`    | `none`, `chevron`, `value`, `badge`, `toggle`, `check` | Trailing accessory of each row           |
| Item       | `tone`     | `neutral`, `good`, `warn`, `bad`                | Semantic status of one item, never a colour     |
| Item       | `mark`     | `none`, `highlight`, `muted`, `new`             | Prominence of one item                          |

The theme (4.3) adds two app-wide enums: `density` (`comfortable`, `compact`), the default for every
component without its own, and `motion` (`calm`, `lively`), for entrances and celebrations; the OS
reduce-motion setting still wins.

**Declaration.** `meta.variants` lists the component's axes, each with the subset of values that make
sense for it, its default first: `variants: { density: ["comfortable", "compact"], emphasis:
["normal", "hero"] }`. A local default need not be the first value in the shared vocabulary. Item
axes go in `meta.items.variants`; when both levels declare `trail`, `itemVariantProps` can inherit
the collection trail, and action gating uses the same effective value as the view. Most components
declare three to six axes; none declares one that changes nothing it draws. `density` absent from a line means the app's
density. A shared `variantProps(meta.variants)` helper in `catalog/props` spreads the axes into the
strict props object as ordinary flat props (`{"c":"List","density":"compact"}`), so a line, a
validator and a `patch` `set` handle them like any prop; there is no variant op.

**Parts.** Finish axes never change parts or addresses. Content and collection axes may show or hide
parts, declared in `meta.variantParts` (`{ "trail.toggle": { adds: ["toggle"] }, "detail.brief": {
hides: ["meta"] } }`), and never rename or renumber one: addresses come from data, not from a variant.
`overflow: "peek"` shows the first two items by default. The `more` toggle reveals the full list
without modifying the wire props. A hidden item keeps its address and actions; the reader shows
the same prefix and localized "and N more" count as the view. The conformance test renders every
declared value and checks these rules.

**Tokens.** `tokens/variants.ts` maps each finish value to token steps and roles per preset kind
(for example `emphasis.hero` lifts the type step and weight, `surface.card` uses `surface` plus
`elevation.card`), as plain data. Kit bases take axis values through `useVariant()` and the base
options; views pass the component's values to bases and never branch on numbers.

**Repairs and screen rules.** An undeclared axis or value is a component repair (4.14) back to the
default, never a failed line. Screen rules (4.5) cap `emphasis: "hero"` at one per screen, a
`media: "cover"` collection at one per screen, and `mark: "highlight"` at a third of a component's
items.

**Prompts and probes.** The write prompt states the axis vocabulary once (budget: at most 160 tokens);
each component's line lists only its axes and values. Writers set an axis only when the request
implies one. Shared write probes cover each axis on representative components ("fit more on the
walks list" → `density: "compact"`); each component adds one write probe for its most distinctive
non-finish axis.

**Look and gallery.** `look` draws the defaults in every preset and mode as before, plus each declared
non-default value once (calm, light, 390 wide) on a variants sheet. The gallery shows a variants panel
per component.

**Migration.** Bespoke values that an axis covers move to it through `catalog/migrations` before
strict validation of saved lines; enable each migration with its destination schema. Explicit
destination values win. Card `style: "plain"` was a filled surface and maps to `surface: "card"`;
`tinted` and `outlined` keep their finishes, and `style: "media"` becomes `media: "cover"` (or
`"thumb"` if an icon was authored instead of a photo). The
default `media: "thumb"` preserves the old inline thumbnail or icon treatment when no axis was
requested. List's per-row cards are structural: keep `style: "cards"` to distinguish them from a
single enclosing card and use `surface` for the finish. List `inset` becomes `surface: "card"` and
List `plain` becomes `surface: "plain"`. Ranked rows use `lead: "number"` and
`trail: "value"`, and historical rows without scores hide their trail. Other moves include Button
`md|lg` to `emphasis`, Player `compact` to `density`, Success `row|centered` to `align`, Photo
`square|wide|tall` to `aspect`, and per-component `tone` enums to the shared helper. Each adoption
task lists its own moves and refreshes its recordings against the new schema.

### 4.3 Tokens and themes

This repo owns the token values.

| File                   | Holds                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens/space.ts`      | `xs` 4, `sm` 8, `md` 12, `lg` 16, `gutter` 20, `xl` 24, `2xl` 32, `3xl` 48. A 4 point grid                                                                                                                        |
| `tokens/size.ts`       | `control.sm/md/lg` 36/44/52, `icon.sm/md/lg` 16/20/24, `avatar.sm/md/lg` 32/44/64. No touch target under 44                                                                                                       |
| `tokens/radius.ts`     | `sm` 8, `md` 12, `lg` 16, `xl` 24, `pill` 999. A sharp preset shifts one step down, a round one up                                                                                                                |
| `tokens/type.ts`       | `display` 34/40 bold, `title` 26/32 bold, `heading` 18/24 semibold, `body` 16/22 regular, `label` 14/20 medium, `caption` 13/18 regular, `number` 40/44 bold tabular                                              |
| `tokens/roles.ts`      | Colour role names, set by the theme (components use roles only): `bg`, `surface`, `raised`, `line`, `text`, `muted`, `accent`, `accentSoft`, `onAccent`, `good`, `warn`, `bad`, `goodSoft`, `warnSoft`, `badSoft` |
| `tokens/elevation.ts`  | `flat`, `card`, `sheet`: three shadow levels                                                                                                                                                                      |
| `tokens/motion.ts`     | Durations `fast` 120, `base` 220, `slow` 420 ms. Springs `snappy` (stiffness 420, damping 34), `gentle` (180, 24), `bouncy` (300, 14; fixed configs)                                                              |
| `tokens/component.ts`  | Tokens that belong to one component, named by it (`Ring.stroke`, `Bars.barWidth`, `Slots.chipHeight`). The only home for a number a view needs that no shared scale covers                                        |
| `themes/presets/*.ts`  | One file per preset: mood, type family, shape (sharp, soft, round), density, surface treatment, role values for light and dark                                                                                    |
| `themes/accents.ts`    | 2 built accents; 12 required (**pending**), each with `accent`, `accentSoft`, `onAccent` for light and dark                                                                                                       |
| `themes/theme-name.ts` | `themeName({ preset, accent, mode })` → `kit_<preset>_<mode>_<accent>`                                                                                                                                            |
| `themes/kit-style.ts`  | `KitStyle` and `kitStyleOf(preset)`: what a preset changes besides colour (corner shift, font pairing, density, surface treatment) as plain data                                                                  |

A theme is preset plus accent plus mode, plus the app-wide `density` and `motion` (4.2a). The model
picks names and never a colour. `tokens/variants.ts` maps the shared variant axes to tokens per preset.

**Pending full set:** 12 presets × 12 accents × 2 modes = 288 themes. The built set is `calm`, `bold`,
`editorial` × `moss`, `sky` × light/dark = 12. Theme tests derive counts from the built arrays;
they do not assert 288. The preset table and accent list below retain the full requirement.

| Preset      | Mood                             | Type                       | Shape | Surfaces                    |
| ----------- | -------------------------------- | -------------------------- | ----- | --------------------------- |
| `calm`      | Quiet and airy                   | Humanist sans              | Soft  | Flat, lightly tinted        |
| `minimal`   | Precise, in the spirit of Linear | Grotesk                    | Soft  | Hairlines, no tints         |
| `warm`      | Cosy, paper tones                | Humanist sans              | Round | Cream surfaces              |
| `fresh`     | Bright and clean                 | Grotesk                    | Soft  | White cards, light shadow   |
| `bold`      | High contrast, big type          | Grotesk                    | Sharp | Solid accent blocks         |
| `playful`   | Friendly and bouncy              | Rounded sans               | Round | Soft tints                  |
| `soft`      | Gentle pastels                   | Rounded sans               | Round | Pastel tints                |
| `editorial` | Like a magazine                  | Serif headings             | Sharp | Hairlines, generous margins |
| `paper`     | A notebook in ink                | Serif                      | Sharp | Off-white, ruled lines      |
| `sport`     | Energetic, numbers first         | Grotesk, condensed numbers | Sharp | High contrast               |
| `night`     | Dark first, glowing accent       | Grotesk                    | Soft  | Raised dark surfaces        |
| `mono`      | Black and white, one accent      | Grotesk                    | Soft  | No tints                    |

Accents: `moss`, `forest`, `teal`, `sky`, `indigo`, `violet`, `rose`, `coral`, `amber`, `sand`, `slate`, `ink`, each defining `accent`, `accentSoft` and `onAccent` for light and dark.

Accent and preset colour values are designed in step U1. Each one must pass the contrast rules: text on background at least 7:1, muted text and text on accent at least 4.5:1, in all 288 combinations. `scripts/contrast.ts` checks the built combinations separately; wiring it into the unified catalog
check and covering all 288 combinations are **pending**.

**Shapes.** Presets are plain data: id, mood, font, numbers, weight, shape, density, surface and
light/dark base roles. Current surfaces are `soft`, `solid`, `hairline`; `weight` is `regular` or
`strong`. Accents supply `accent`, `accentSoft` and `onAccent`. Generated themes merge those role sets.
Raw colours belong only in tokens and themes.

`KitStyle` is everything a preset changes that is not a colour, derived from the preset by a pure function and handed to `KitProvider`:

```ts
// themes/kit-style.ts
export type KitStyle = {
  radiusShift: -1 | 0 | 1; // steps along sm, md, lg, xl (sharp, soft, round)
  fonts: { text: FontName; heading: FontName; number: FontName };
  density: { gap: SpaceToken; rowPad: SpaceToken; cardPad: SpaceToken };
  surface: "soft" | "solid" | "hairline";
  strong: boolean; // bold preset increases text weight
};
export function kitStyleOf(preset: PresetMeta): KitStyle;
```

### 4.4 Components, packs and archetypes

- **Core:** 45 component schemas and views. **Archetypes:** 17 definitions with 35 layouts and validated
  cast-driven defaults. Lists, options and recipes are in [catalog/core.md](catalog/core.md); code wins
  over stale counts or proposals there.
- **Packs:** 27 planned packs, with their lists in [catalog/packs/](catalog/packs/README.md) and build
  waves in [the pack build plan](catalog/packs/build-plan.md). **Pending:** real pack metadata, components, archetypes and
  worked examples. Scanner/generator fixtures are infrastructure, not built pack content.
- **Ids:** unique across core and packs. A scoped strict writer cannot emit an off-pack id.
- **Merges:** `DayTimeline` is retired into `Timeline[hours]`. Migration keeps component ids, state,
  links, tones and time ordering. `Sparkline` remains separate. `day_unfold` targets `Timeline[hours]`.

Each component follows the guide, with `List.tsx` as the exact reference. No separate illustrative
template or duplicate component/archetype/pack list lives here.

**Parts, states and tiers.** Every file declares its drawn parts, item parts, states and offered
actions. Tier and `realPath` are required. The kit draws declared states without a model call.
Beyond-phone components say what needs consent, other people or an outside service.

**Archetypes.** A screen starts from a finished recipe. `registry.defaultLines(id, layout, cast)`
builds and schema-validates defaults, stamps component ids and runs `checkScreen`. Tests cover empty
and populated casts. Recipe slots allow alternatives, variants and bounded repeats. Missing-slot
repair in a host validator remains **pending**; defaults are already available while writing.

**Signature moments.** The ten ids and target components live in `catalog/signatures.ts`. Shared
hooks in `kit/motion` drive them from the chosen signature and cue. Browser motion/reduced-motion
acceptance is built in `test/motion.test.ts`; its ring-cue and end-state checks pass. The host/Director chooses one
that fits the loop; trailer orchestration stays outside this repo. Native device visual/performance QA remains **pending**. Remaining core option details are listed
in [catalog/core.md](catalog/core.md#remaining-core-work), not hidden by the built component count.

**Outside surfaces.** `LockScreen` (consent), `Widget` (phone), `Message` (service) remain **pending**.
Rules and flow steps name surfaces; Writers never place one on a screen.

**Domain scope.** The Director chooses up to three packs from a purpose/pick index. Later Writer,
edit and Critic calls receive core plus those packs only. Pack count/id validation and adding a pack
through a versioned brief belong to the harness; a pack cannot be removed while used. Strict
`writerFormat(registry)` replaces off-pack mapping: no `R2.off_pack`, no component alias fallback.
A request needing unavailable scope triggers restructuring. Review uses choice failures and
`Canvas` misses, not off-pack repair codes. Booking and customers lead for Trot, then the waves in
[the pack build plan](catalog/packs/build-plan.md). Every pack needs renderers, two examples per component and a worked app.

**Quality by construction.** Schemas bound content; screen rules bound composition; defaults provide
a valid fallback; theme tables set appearance. Full theme, motion, shadow-render and visual
acceptance gates remain requirements, not an implication that every gate is complete.

### 4.5 Screen rules

Pure functions over `ScreenLike` and `RegistryLike` (a definition map or `{ defs }`). They report
`{ code, address, message }` issues and never mutate or repair a screen.

1. **Regions.** Top, one scrolling body, bottom and overlay. `sortByRegion(components, registry)`
   keeps order within each region. Overlay components do not count toward screen weight or count.
2. **Column.** One token gutter (20 points). Components arrange their own rows, grids and strips.
3. **Rhythm.** `gapBetween(previousMeta, nextMeta)` gives 8 after a section title, 24 after a hero
   or before a different group, otherwise 16. `Screen` consumes it; no spacing prop.
4. **Weight.** Three to nine non-overlay components, total at most 12, at most two weight-3
   components. `weightByStyle` overrides metadata weight.
5. **Primary.** At most one primary Button. The checker reports extras; it does not demote them.
   Required primary actions and repair/demotion belong to recipes and host R3.
6. **Limits.** Schemas beside components define actual text, array and state limits. Shared guide
   limits (title 24, subtitle 48, row title 28, meta 36, button 18, note 140; rows/chips 6,
   stats 2–4, bars 7, tabs 5) are starting requirements, not a uniform exported validator.
7. **Counts.** Schemas check each array. A universal quiet “and N more” treatment for truncated
   lists remains **pending**; only components whose schema supports a count can render one.
8. **Neighbours.** Hero first in the body; a section title needs following content; repeated
   types cannot be adjacent except Card and Field; Button cannot be the first component.
9. **Variants.** At most one `emphasis: "hero"` and one `media: "cover"` collection per screen;
   `mark: "highlight"` on at most a third of a component's items (4.2a).

| File                            | Checks or data                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `rules/regions.ts`, `rhythm.ts` | Sorting and the gap table, used by layout                                                                                      |
| `rules/weight.ts`               | Component count, style-aware weight, heavy count                                                                               |
| `rules/limits.ts`               | Unique component ids, known components, schema-valid props and declared state; `limitAt` exposes schema limits                 |
| `rules/neighbours.ts`           | At most one primary and neighbour rules                                                                                        |
| `rules/placeholders.ts`         | Lorem, Item N, John Doe, Untitled and Example patterns                                                                         |
| `rules/core.ts`                 | Single Sheet/Choice/Player/Composer, sheet trigger/target, reply ordering, large Amount/headline conflict, danger confirmation |
| `rules/check-screen.ts`         | All issue checks, with stable `S.*` codes; `flowOpensSheet` can satisfy a sheet trigger                                        |

The checker resolves known ids and migration targets before validating. The strict writer design
removes ordinary component aliases here too. A clean `checkScreen` result is a data check, not
proof of runtime layout, contrast or visual quality.

### 4.6 Registry and pack scope

```ts
const registry = createRegistry({ packs: ["booking", "customers"], includeDrafts: false });
registry.get("List"); // ComponentDef or undefined
registry.resolve("list"); // "List": case/separator-insensitive id
registry.resolve("table"); // undefined unless a Table id is in this scope
registry.schema("List"); // Zod schema
registry.ids;
registry.defs;
registry.packOf;
registry.archetypes;
registry.defaultLines("home", "focus", cast);
```

A registry is core plus active packs, with drafts excluded by default. The bake-off includes drafts.
Real pack content is still pending, so selecting a scaffold pack adds no components. The registry
exposes all core archetypes and their defaults; unified pack archetype scope and surfaces are
**pending**.

**Writer design, 2026-11-18.** `writerFormat(registry)` in `@lmthing/ui/catalog` gives the strict JSON
Schema of one component line. `c` can only be a writable id from the scoped registry; each id gets
its own Zod prop schema. Code-owned components are not writable. Wrong/off-pack ids cannot be
written. Probes send the same format. This is the design being implemented in parallel, not an API
claimed to exist in this checkout.

There is no `meta.aliases`, alias lookup step, `R2.alias`, `R2.off_pack` or alias-conflict check.
`registry.resolve` tries exact id, case/separator-insensitive id, then migration aliases through
`legacyTarget`, restricted to the scope. Migration aliases for renamed/merged components stay.

### 4.7 Lookups for repairs

**Pending:** `nearestIcon(name)` (edit distance and synonyms, else neutral `dot`),
`nearestPhotoTag(tag)` over catalog photo tags, `clampText(value, max)` at a word boundary, and
`snapEnum(value, values)`. Strict output prevents wrong ids; these helpers serve legacy or other
untrusted input and property-level repairs, not component alias mapping.

Current schemas reject unknown icons and malformed photo references. `swatch` already snaps unknown
product-colour names. `clip` is a cast/copy helper, not the planned repair API. `legacyTarget` is
available for migrations; there is no `lookupAlias` requirement.

### 4.8 Addresses

```text
screen "/" component [ "/" item ] [ "/" part ]

home                screen
home/l1             component
home/l1/r2/title    row title
home/~after:l1      gap after component
```

`parseAddress`, `formatAddress` and `climb` are built. Round-trip tests cover the grammar. The kit
stamps full addresses; root elements include `/root`, while reader action addresses omit it.

**Pending persistent ids:** `stampItemIds` currently assigns positional `r1`, `r2`, … (or a declared
prefix) and overwrites supplied ids with positional ids. It does not allocate component ids or persist item counters.
“Second row ever added” semantics require the host/validator counter contract.

### 4.9 Prompt entries

```ts
buildEntry(def): string
buildBlock(registry, scope: "core" | PackId): string
buildPackIndex(): string // generated wrapper; lower-level helper takes packs
estimateTokens(text): number
writerFormat(registry) // strict line schema, the 2026-11-18 design (4.6)
```

`buildEntry` has at least three lines: id/purpose, compact prop signature, first example. Each
`writeHints` item adds a `Rule:` line. It does not include tier or pick and has no per-line
70-token cap. Choice blocks include purpose and pick, not schemas.

Ordinary blocks sort by group then id; the pack index sorts by id. Code-owned components are
excluded. Live choose prompts preserve definition order to keep existing recording keys. They use
the same choice prose, not the same sorted block.

The implemented gates use `ceil(codePoints / 4)`, not an o200k tokenizer:

- core choice block: strictly under 3,500 estimated tokens;
- each synthetic ten-entry pack: strictly under 1,200;
- core plus every triple of four synthetic packs: strictly under 7,000.

Tests snapshot the real core and pack-index fixtures, and assert recorded write-entry parity. Synthetic packs copy core prose;
they are not real-pack coverage. **Pending:** real pack blocks/snapshots, tokenizer measurements and
reports for every entry/block, and cache-order unification once recordings can be refreshed.

### 4.10 Checks

`scripts/check.ts` runs Vitest; `pnpm test` generates entries/themes first. `build:catalog` runs the
data-only bundle check. A unified `pnpm catalog:check` command is **pending**. Existing checks are
distributed, not all implemented by one script.

| Requirement                                                                   | Status                                                                                                                                                   |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required exports and Meta fields; purpose ≤16 words and a nearest-choice pick | Scanner checks exports/views; component tests check metadata. **Pending:** unified enforcement                                                           |
| Bounded strings and arrays                                                    | Component schemas/tests exist. **Pending:** generic recursive schema audit                                                                               |
| Two valid real-content examples, valid icons/tags, no placeholders            | Schema tests and screen placeholder checker exist. **Pending:** catalog photo-tag list and generic example placeholder/tag check                         |
| Valid fallback for empty, full and malformed casts                            | Adjacent component tests and bundle empty-cast check                                                                                                     |
| Every archetype default passes `checkScreen`                                  | Core 35-layout tests for empty/full casts; **pending** real pack defaults                                                                                |
| Each pack has purpose/pick, ≥2 archetypes and valid worked JSON Lines         | `checkPacks` checks present packs only; empty real pack catalog passes. **Pending:** real content and R1/R2 example path                                 |
| Strict writer scope, no component aliases or alias-conflict check             | 2026-11-18 design, 4.6; parallel implementation                                                                                                          |
| Theme roles and contrast for all 288 combinations                             | Roles/count tests cover built arrays; standalone contrast script. **Pending:** full set and contrast wiring                                              |
| Prompt estimates/snapshots and model gates                                    | Estimate gates, component replay, explicit pack and compose runners. **Pending:** full reports and unified gate wiring                                   |
| Declared/inferred actions match mounted parts and roles                       | Filled-example reading tests; `actions.when`, part tiers and confirmation-part pack checks. **Pending:** generic action checks across all runtime states |
| Readers cover every state, text and budgets                                   | Filled-example text/action agreement; **pending** all-state snapshots, custom-reader coverage and budgets                                                |
| Every ready definition has a view                                             | Scanner; conformance iterates existing renderer ids. **Pending:** independent ready-id coverage assertion                                                |
| Catalog builds/imports with no React/Tamagui                                  | `catalog:bundle-check`, examples and empty fallbacks in plain Node                                                                                       |
| Component, archetype and pack probes have valid shape/expectations            | Component tests, core compose declarations, `checkPacks` positive/near-miss checks; **pending** surface probes and unified assertion                     |

`checkPacks` also validates declared `confirmParts`/`partTiers` and known dense ids. Worked examples
currently use direct JSON parsing and scoped schema validation with no repairs. Lowercase component
alias checks and pairwise alias checks are removed by the strict writer design.

### 4.11 Versioning and migrations

Package version is currently private `0.0.0`. Hosts should stamp the catalog version on saved specs.

- **Patch:** wording, examples, loosened limits.
- **Minor:** new component, style, optional prop, icon, layout or pack; needs renderer, examples and
  lmthing's pairwise eval.
- **Major:** removal, rename, tightened limit or changed meaning; needs a fixture-tested pure
  migration over `{ catalog, screens: Record<string, ScreenLike> }`.

Moving a bespoke `style` or `tone` value to a shared variant axis (4.2a) is a migration of the same kind:
old lines and recordings map to the axis before validation.

`migrateLine`, `migrateScreen`, `migrateJSONL` and `legacyTarget` implement the retired `DayTimeline`
shape. Blocks become `Timeline[hours]` items with `time`/`end`. The runtime migrates before drawing.

**Pending:** the generic saved-spec `migrate(spec)` dispatcher, catalog-version export/stamping,
deprecation metadata, and keeping deprecated components drawable for two major versions while
excluding them from prompts. Future major-version files wait for an actual version boundary.

### 4.12 Reading and acting: the catalog side

Readers and pure action planning work without a browser. Quoted text is content, never instructions.

| Action                                                                       | Value                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `press`, `start`, `stop`, `dismiss`, `play`, `pause`, `flip`, `send`, `scan` | None                                                               |
| `toggle`, `check`                                                            | None to flip, or boolean                                           |
| `select`                                                                     | Finite number or non-empty label; runtime checks the target option |
| `type`                                                                       | Text                                                               |
| `set`                                                                        | Finite number or non-empty string                                  |
| `increment`, `decrement`                                                     | None                                                               |
| `swipe`                                                                      | `left` or `right`                                                  |
| `seek`                                                                       | Finite nonnegative seconds                                         |
| `move`                                                                       | String label                                                       |

`ScreenAction` declares `back`, `tab`, `scroll`, but complete screen-level dispatch is **pending**.
A new action name is a minor catalog change. Component schemas/metadata say which actions exist.

`validateActionValue(action, value)` checks generic value shape and returns `invalid_value` with a
short hint. The runtime adds schema-specific fields, dates/times, bounds and target-option checks.
A pure `validateActionValue(def, address, action, value)` contract is **pending**; do not describe the
generic helper as schema-specific.

`readComponent(def, input, instance, state?, values?)` schema-parses input, stamps item ids, overlays
live props, quotes text, and adds `meta.read` summaries. Non-filled states currently print only the
component header. `items.visible: "first"` reads the visible item and adds `+N more`.

```text
screen home "Today"
l1 List
  r1 "Fern" · "Bathroom" [l1/r1 press→plant] [l1/r1/trail toggle:off]
  r2 "Monstera" · "Living room" [l1/r2 press→plant]
b1 Button "Add a plant" [b1 press→new_plant]
```

Each action carries its relative address. Full addresses prepend the screen id. Non-default style,
kind and tone use brackets; neutral tone is omitted. Non-filled state uses parentheses. Model/person
text is JSON-quoted and escaped. Photo references read as tags; secrets read as `(secret)`. Actions
carry tier marks (`!needs-ok`, `!needs-people`, `!needs-service`), with `partTiers` overriding component
tier. Live values appear in affordances. There are no pixels, colours, fonts or class names, and
strings are not shortened. Current headers contain id/title, not theme, revision or readiness.

```ts
readScreen(screen: ScreenLike, defs: Record<string, Definition>, values?: Record<string, unknown>): string;
planAct(screen: ScreenLike, defs, values, steps): ActResult;
```

`readScreen` accepts a definition map, normalises full-address values to local addresses, and prints
unknown components. `planAct` validates offered actions and generic values before committing any
changes. It returns new values, links and compact changes, or the first failure index. Kit controllers
add live/runtime checks; callers do not treat the pure planner as a complete dispatcher.

**Pending reader API:** `readScreen(screen, registry, { depth, address, since, values, marks })`,
`readApp({ name, sections, screens })`, and deltas (new/changed components whole, removals as `- id`,
unchanged screen header only). Runtime clipping/offscreen marks and complete state summaries remain
requirements. CI must check a 9-component screen with a 6-row list at ≤300 tokens, app outline at
≤15 tokens/screen, and reader time under 5 ms. Those budget tests do not exist yet.

### 4.13 Model-facing tests

Component files declare choose/write/read probes; code-owned components have only read. At least two
choose probes include a positive and nearest-choice near miss, with one write and read when actionable.
A choose/write expectation absent from the offered catalog is skipped. Pack metadata requires at
least three probes (two positive and a near miss), valid pack ids and at most three selected packs.
Core archetypes declare a compose probe for every layout.

| Probe     | Implemented prompt and score                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `choose`  | Purpose/pick prose in definition order plus need; expected id, case-insensitive                                                         |
| `write`   | Multiline entry, rules/example and brief; exact `c`, schema-valid props first time, no repairs                                          |
| `read`    | Example read text and task; expected address/action, ignoring `home/` and trailing `/root`                                              |
| `pack`    | Sorted pack index and idea; up to three expected packs, shared majority runner                                                          |
| `compose` | Recipe, cast, allowed entries/default and screen rules; one screen object, direct schema/`checkScreen` and required-slot/variant checks |

Write probes use the same strict `writerFormat(registry)` as production Writers in the 2026-11-18
design. Current transport is being updated in parallel; prose is not the output constraint.

`runComposeProbes` runs every layout with three independent samples. A mechanical majority must pass.
With `rubric: true`, a model rates the first valid sample for clarity, focus, flow, content and
structure (1–5); all ratings must be ≥3.5 and average ≥4.0. `llm:check --compose` enables it and records
under `test/recordings/Archetypes/<model>.json`. All 35 current layout/rubric gates pass and
`test/archetypes.test.ts` replays them in `pnpm test`. Layout `writeHints` and shared
`scripts/compose-casts.ts` supply writing guidance and archetype/layout-specific content to live and
replay runs. `--compose --layout archetype/layout,...` filters named layouts. Rich
include/exclude/expected-primary checks, per-rule
counts, repair counts, output-token metrics and confusion tables remain **pending**. Composition
across a full app belongs to harness evals. Visual craft requires screenshots, not the text rubric.

**Live and replay.** `scripts/llm.config.ts` is the only model routing table: one required light model,
`deepseek-flash`, with three samples. Direct Azure REST uses environment credentials, not a provider
SDK. Transient transport failures retry at most four attempts with exponential backoff; these are
not extra sampled model answers. Recordings key a hash of model id and prompt, storing the prompt,
first reply and sample replies. Replay is deterministic.

| Command                           | Gate                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm llm:check --component <Id>` | Every required component probe passes by majority (2 of 3); 2/3 prints `unstable` |
| `pnpm llm:check`                  | Core component probes only, not real packs or composition                         |
| `pnpm llm:check --pack <id>`      | ≥90% of pack majority results; no real packs currently means skipped              |
| `pnpm llm:check --compose`        | Every required layout passes mechanical majority and rubric                       |
| `pnpm llm:check --merges`         | Recorded core-pair evidence for merge decisions                                   |
| Add `--replay`                    | Use recordings instead of live calls                                              |

Do not repeat unchanged probes for luck. Reword purpose/pick/write hints, improve schemas/examples,
then run once per change. Never weaken probes or edit another component to hide a conflict.

`pnpm test` replays required component/pack recordings. `test/known/<Id>.md` skips component replay and
marks its reading test `it.fails` until fixed. This is an explicit open-problem bypass, not a pass.
`pnpm test` also replays all 35 compose/rubric gates from real recordings;
`--compose --replay` can check them explicitly.

**Pending aggregate/regression gates:** choose ≥90% overall/≥70% per component, write ≥90% first-time,
read ≥95% including schema-valid values, compose ≥90% issue-free after repair, comparison with the
last accepted run, strong/light comparison, and CI live-on-change/nightly scheduling. Current
component acceptance is each probe's majority, not those aggregate thresholds.

### 4.14 Lines to screens: parse, component repairs, ids

**Pending pipeline.** The pure R1/R2 steps remain requirements for legacy/untrusted input and worked
examples. Strict output removes component alias/off-pack repairs, not property validation.

```ts
parseLine(text): { line?: unknown; codes: string[] };
readComponent(line, registry, ctx: { cast }): { component?: Component; codes: string[] };
stampIds(components): Component[];
assembleScreen(lines, registry, ctx): { screen: ScreenLike; codes: string[] };
```

R1 strips fences, trailing commas, single quotes and closes brackets, else drops input. R2 validates
exact/scoped ids, strips unknown fields, fills required values from fallback, snaps enums/icons/photo
tags, clamps text/arrays and applies migration aliases. It has no `R2.alias` or `R2.off_pack`.
The advertised repair `readComponent` is not the built text-reader export of the same name; public
naming needs reconciliation before implementation.

Only positional `stampItemIds` exists. Persistent component/item counters and `assembleScreen` are
not built. Repair codes live in one future `lines/codes.ts`, with fixture tables for real bad inputs.
Pack checks and compose probes currently parse JSON directly and require schema validity without
repair; gallery does not yet load a full JSON Lines fixture suite through this pipeline.

The pipeline stops at R2. Region sorting, primary demotion, extras, flows/waves, cast checks and
rewrite id carry-over stay in host R3–R6. Once built, `assembleScreen` serves worked examples,
composition and gallery fixtures; compose must still count issues before any R3 repair.

## 5. The kit entry (`@lmthing/ui/kit`)

### 5.1 Peer dependencies

Current pinned peers are `react`, `react-native-web`, `tamagui`, `@tamagui/core`,
`@tamagui/lucide-icons` and `react-native-svg`. Zod is the catalog dependency. Builds externalise kit
peers; the kit has no Expo dependency. Hosts load fonts and resolve photos/media.

**Pending native dependencies/acceptance:** `react-native` and `react-native-reanimated`, native
driver integration, and iOS/Android builds/device tests. Browser aliases and `NativeHost` interfaces
are not proof of native support. Dependency choices belong in `docs/dependencies.md`.

### 5.2 Tamagui integration

The public package exports only `./catalog` and `./kit`, not `./kit/tamagui`.

```ts
import { kitTokens, kitThemes, kitFonts, kitSprings, kitFontAssets } from "@lmthing/ui/kit";

const config = createTamagui({
  tokens: createTokens({ ...kitTokens, ...hostTokens }),
  themes: { ...kitThemes, ...hostThemes },
  fonts: { ...kitFonts, ...hostFonts },
});
```

Host tokens use their own prefix. `kitThemes` is committed generated data from
`scripts/build-themes.ts`, named `kit_<preset>_<mode>_<accent>`. The script writes current themes or
checks staleness with `--check`; it does not implement compact generation.

Font families are Inter, Source Sans 3, Nunito, Fraunces headings with Source Serif 4 text, and Barlow
Condensed numbers. Gallery loads them through Fontsource. `kitFontAssets` is empty. **Pending:**
bundled OFL font files for host native loaders such as `expo-font`.

`kitSprings` exports plain configs for host animation/stage worklets. Current kit motion uses the
RAF spring driver in `kit/motion`; it is not a configured Reanimated/CSS Tamagui animation driver.
**Pending:** native/Tamagui driver integration, all 288 themes and measured compact mode. If the
full web size exceeds the budget, `build-themes --compact` must emit 24 preset/mode themes with accent
role overrides and the same API.

### 5.3 Provider and host interfaces

`KitProvider` accepts `theme`, optional `parts`, `interactive`, `environment`, `nativeHost`,
`controller`, `onLink` and `resolvePhoto`, plus children. It supplies Tamagui Theme and catalog-derived
`KitStyle`. `interactive` defaults to false here. It does not take a catalog registry, cast, direct
interaction store or individual motion flags; `PhoneScreen` constructs that runtime.

```ts
export type Rect = { x: number; y: number; width: number; height: number };
export interface PartRegistry {
  register(entry: { screen: string; rev: number; address: string; rect: Rect }): void;
  unregister(entry: { screen: string; rev: number; address: string }): void;
}
export type Environment = {
  insets: { top: number; right: number; bottom: number; left: number };
  keyboardHeight: number;
  reduceMotion: boolean;
  agentMode: boolean;
  signature?: string;
  cue?: number;
};
```

Memory/noop part registries are built. `usePart` measures web rectangles relative to provider root
or uses native `measureLayout`. It coalesces layout callbacks per part per frame, not once per screen.
Web coordinates reflect current scroll/viewport position; hosts apply their projection.
Content-root/scroll-offset alignment and screen-wide registration batching remain **pending**.

`NativeHost` supplies a snapshot and subscription for insets, keyboard height and reduced motion,
plus optional `listenBack`, `focusModal` and `ensureVisible`. Browser environment uses safe-area CSS,
visual viewport and reduced-motion media queries. Focused inputs scroll into view; overlays contain
and restore focus and support Escape/back dismissal. Native host/device acceptance is still pending.

### 5.4 Kit bases

The complete public base API is exported from `src/kit/base/index.ts`. The
[component-guide table](component-guide.md#kit-bases-the-only-building-blocks) lists every base and
its key props, including exported helpers. There is no six-base limit.

| Group                     | Exported bases                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text, surfaces and layout | `KitText`, `KitCard`, `KitRow`, `KitBlock`, `KitContent`, `KitGrid`, `KitStrip`                                                                       |
| Icons, photos and people  | `KitIcon`, `KitPhoto`, `KitAvatarStack`, `KitBubble`                                                                                                  |
| Actions and inputs        | `KitAction`, `KitInput`, `KitTextArea`, `KitFieldControl`, `KitListItem`, `KitOption`, `KitChip`, `KitTrack`, `KitTile`, `KitSlider`, `KitScaleTrack` |
| Dates and navigation      | `KitDay`, `KitDayMark`, `KitWeekGrid`, `KitWeekStrip`, `KitTime`, `KitHours`, `KitTabBar`, `KitStepsTrack`                                            |
| Data and progress         | `KitBars`, `KitShare`, `KitRank`, `KitMeter`, `KitSpark`, `KitRing`                                                                                   |
| Camera, route and stacks  | `KitViewfinder`, `KitShutter`, `KitMapTile`, `KitRouteStop`, `KitSwipeStack`                                                                          |
| Sheets and media          | `KitSheet`, `KitMediaControls`, `KitTimes`, `KitPlayback`                                                                                             |
| Exported helpers          | `KitTrail`, `KitSkeleton`, `KitCheck`, `KitEmpty`                                                                                                     |

`KitOverlay` is internal screen infrastructure, not a public base. Proposed `KitBadge` and
`KitDivider` helpers remain **pending**; current badges/dividers use existing bases.

Key naming: `KitText.lines`, `KitIcon.scale`, `KitPhoto.photo/shape`, `KitRow.item/goto`,
`KitCard.style` plain/inset/cards with `look` surface/tinted/outlined. Component styles map to those
base choices; they need not be identically named Tamagui variants. For example, a tinted Card uses
`KitCard style="inset" look="tinted"`.

Bases use Tamagui styled frames, token props and fixed lookup tables. `shifted` moves a radius token;
`surfaceOf` applies soft/solid/hairline treatment. `KitStyle` sets density, font pairing, radius and
strong text. No raw colours, pixel values or z-index outside tokens/themes.

### 5.4a Theming a single component

| To change                 | Do this                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Colour                    | Use a role or tone and its fixed table. A new role must exist in every theme and pass contrast |
| Size or spacing           | Use a shared token; component-only numbers live in `tokens/component.ts`                       |
| Look across themes        | Change a base's fixed variants/props; review screenshots in built presets/light/dark           |
| Preset differences        | Extend `KitStyle`/`kitStyleOf`; never compare preset names in a view                           |
| A component-specific look | Add a bounded schema style and map it to existing or task-authorised base treatments           |

No component sub-themes; studio tier tints belong to the host. **Pending enforcement:** lint rejects
raw values, preset comparisons and view handlers, and runtime contrast guards cover role/tone pairs.
The current screenshot checker covers rendered contrast, not that complete runtime contract.

### 5.5 Views

Views are named React functions typed from their own schema through `Props<typeof props, typeof meta>`.
They compose bases; user-facing text comes from props, cast or shared copy helpers.
Built-in words come from per-language core and pack dictionaries, using the app's BCP-47 `lang` for copy and `Intl` formatting.

- `part` stamps an address and `testID`; `item` supplies item context. Bases supply roles, labels and
  control state. `usePart` measures on layout and unregisters on unmount.
- Component functions read props/state/theme only. Controllers own live state, timers and media;
  bases subscribe through `useControlValue` and call the same controller as agent access.
- Empty/loading treatments use shared `emptyLine` / `KitSkeleton`; other declared states are drawn
  from component metadata. Full success/error reader parity remains **pending** (4.12).
- The scanner generates renderer maps from core, packs and surfaces, skipping drafts and rejecting
  ready files without views.
- Every `Screen` part currently has rev 1. Revision propagation, mounted-action metadata with
  revision/enabled state, and independent conformance of every declared part remain **pending**.

### 5.6 Screen

Public `PhoneScreen` injects definitions/renderers through the generated kit entry. It accepts
`screen`, `theme`, `parts`, `onLink`, `onAction`, photo/media resolvers, `media`, `onReady`, `onChange`,
`onSend`, `requestPhoto`, `interaction`, `interactive`, `onReport`, `nativeHost`, `reduceMotion`,
`agentMode`, `signature` and `cue`. It creates the controller and agent access, subscribes to state,
and wraps provider/Screen. The current interaction default and automatic hook exposure need the
decisions in §14; do not treat them as settled host policy.

**Pending selector-facing inputs:** `packs`, `tabs` and `cast`, memoised scoped registry creation, and
a host-neutral `Screen screen={screenLike}` interface. Current `Screen` takes a controller and
renderer map. Tabs are a code-owned component supplied in screen data, not a separate tabs prop.

`Screen` sorts regions, pins top/bottom, scrolls body with the token gutter/rhythm table, and draws
sheets/confirmations in an overlay. It keys by component id. Controllers canonicalise ids/migrations
before rendering. Unknown definitions or renderers draw nothing; `onReport` receives data checker
issues, not a renderer-specific missing-view report.

| Moment                         | Current motion or requirement                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Arrival                        | Opacity and 8-point rise; 40 ms stagger capped at six                                        |
| Same id changes                | Measured height springs with `snappy`; state cue can restart reveal                          |
| Removal                        | `KitPresence` retains disabled exiting nodes for fast fade/collapse                          |
| Press                          | Token-based scale feedback                                                                   |
| Screen flow / sheet transition | **Pending:** forward screen slide and sheet rise                                             |
| Numeric reveal / signature     | Shared `useSignatureProgress`, `countText` and animated values, driven by host signature/cue |
| Reduced motion                 | Ordinary cross-fades; no displacement/height spring; signatures show end state               |
| Agent mode                     | Immediate end state; removed nodes are not retained                                          |

Browser motion and reduced-motion acceptance is done in `test/motion.test.ts` and the gallery
Motion page. Chrome checks a ring cue animating once to 3/5, immediate signature end states under
reduced motion and agent actions, and no page errors. These checks do not establish native device
QA or exhaustive signature/performance coverage.

Shared RAF interpolation uses catalog springs. It animates transform, opacity, signature values and
morph/removal height; component timers are live controls, not idle decorative loops. Ten signatures
have hooks in `kit/motion`, not individual scaffold `kit/signature` files. Native performance and
hand-polished visual acceptance remain **pending**.

### 5.7 Archetypes, surfaces and signatures

- Core `registry.defaultLines(archetype, layout, cast)` returns a validated cast-driven screen; it is
  catalog data, not a kit default renderer. Pack defaults are **pending**.
- Outside surfaces are **pending**; they must use the host app name/icon and theme.
- Signature metadata, shared hooks and browser motion/reduced-motion acceptance are built. The host
  passes signature/cue; reduce motion and agent mode show end state. `test/motion.test.ts` checks cue
  replay and end states in Chrome. Native device visual/performance QA remains **pending**.

### 5.8 Render reports

`Screen.onReport` currently emits `checkScreen(snapshot, defs)` after a 150 ms timer keyed to the
snapshot fingerprint. It reports data issues, not settled-layout measurements.

**Pending runtime detection:** debounce after the last layout with a 300 ms mount cap and addressed
issues below. Unknown renderer handling must report, not silently omit.

| Code                | Required detector                                                           |
| ------------------- | --------------------------------------------------------------------------- |
| `clipped_text`      | `KitText.lines`: native text layout or web height versus lines × lineHeight |
| `overflow`          | Width outside column or height beyond component maximum                     |
| `empty_section`     | No visible content after SectionTitle before next title/end                 |
| `low_contrast`      | Current tone/role below contrast threshold                                  |
| `unknown_component` | Registry/renderer lookup failed                                             |

Hosts decide what to do (lmthing R5). The look script already checks screenshots, but is not this
runtime report API.

### 5.9 Reading and acting: the kit side

Human touches and agent actions use one controller. Stable `testID` addresses become `data-testid`
on web; native test tools can use the same grammar.

**Accessibility.** Bases, not a separate `interact/a11y.ts`, supply roles, visible-text labels,
selected/checked/disabled values and keyboard controls. Decorative/chart drawings are hidden.
Adjustable controls provide accessible actions; touch targets use the 44-point minimum.
Filled-example tests check text/action-role agreement. **Pending:** axe, all-state/action coverage
and native assistive-technology acceptance.

```ts
export type InteractionStore = {
  get(address: string): unknown;
  set(address: string, value: unknown): void;
  setMany(values: Record<string, unknown>): void;
  reset(screen?: string): void;
  snapshot(screen?: string): Record<string, unknown>;
  subscribe(listener: () => void): () => void;
};
```

The store is in memory; hosts can supply/share it and persist `onChange` snapshots. Public
`PhoneScreen` creates one per screen id if none is supplied. Internal address keys carry drafts,
errors, timer and controller state as well as values.

**Controller.** `createScreenController` migrates/canonicalises inputs, projects live props and
tracks mounted parts. It checks disposal, non-interactive mode, hidden/covered controls and non-filled
states. Runtime dispatch validates fields/dates/times/options/limits, supports disabled controls,
sheet/confirmation blocking, replies, timers, swipes, local media and photo requests. Host callbacks
handle links, actions, sends and photo/media I/O. A standard confirmation exposes separate
`confirm/confirm` and `confirm/cancel` controls; it runs the original effect only after acceptance.

Batches plan each step in order with updated local state. Failed validation commits no values or
effects; `dryRun` reports changes only. External media/photo effects can complete later, so this is
validation atomicity, not a transaction over host I/O.

```ts
const agent = createAgentAccess({ defs, store, current, onLink, runtime });
agent.read(): string;
agent.act(stepOrSteps, { dryRun? }): ActReply; // synchronous
agent.log(): ActLogEntry[];
agent.reset(): void;
```

`ActStep` currently has `address`, string `action`, optional `value`. Success returns `ok`, `screen`,
`changed`, `dryRun`; failure returns `code`, `at`, optional `hint`. Successful non-dry-run agent acts
append timestamped steps to the agent log. Agent actions set agent mode; human actions turn it off
unless the host explicitly overrides it. Read has no mutations.

**Pending full action contract:** revision-bearing `ActStep` (`expectRev`) and results/logs, mounted
action entries `{ screen, rev, address, actions, enabled }`, stale checking, typed screen actions,
host scrolling/navigation completion, runtime marks and `sinceRev` deltas. `act` must eventually
return a settled Promise with `stale`, `not_actionable`, `invalid_value`, `disabled`, `not_mounted`,
`not_interactive`, `timeout` codes. Settle means no animations, layout/report work or navigation;
timeout 2 s, agent mode one or two frames. Current synchronous success is not a settled result.

**Exposure and safety.** Host-owned exposure remains the intended boundary; current automatic
`window.__lmthingUI` installation/cleanup is an open decision in §14. Hosts must be able to expose
read only, rate-limit acts, and keep share-link state ephemeral. Text in quotes is data. The kit
does not itself pay/send/delete real objects, but `onLink`, `onSend`, photo and media callbacks can
have host effects; hosts must gate those effects, not assume that every callback is inert.

## 6. Package: `@lmthing/photos` (optional, step U8)

**Pending.** Only README scaffolds exist. The requirement is about 150 tagged bundled photos plus
gradient avatars, with deterministic resolution by tag/address.

- Redistribution must be allowed (CC0 or equivalent); record source/licence per file in `manifest.ts`.
- Validate ≥3 photos per tag, licence on every file, size ≤120 KB (WebP, 1080 px long side).
- Export `resolvePhoto` for hosts; catalog photo tags must match the manifest.
- Until then, hosts provide tinted placeholders or their own resolver. Gallery uses local SVG
  sample artwork, not the optional licensed asset package.

## 7. Gallery app

The built gallery is a private Vite/React Native Web app, not Expo Router. It uses query parameters,
not file-based routes. It loads the same kit exports and Fontsource families.

| Current query              | Shows                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/` or `?c=<Id>`           | Ready component previews, filled examples plus non-filled states, built presets/modes and first accent |
| `?c=<Id>&w=320&mode=light` | Phone-screen columns used by look; widths 320/390/430                                                  |
| `?preset=<id>&mode=<mode>` | Filter the general preview grid                                                                        |
| `?runtime=1`               | Sheet, confirmation and local media runtime fixture                                                    |
| `?controls=<kind>`         | Live field, choice, list, navigation, number, reply, photo and swipe fixtures                          |
| `?motion=<signature>`      | Signature preview with cue replay; browser acceptance uses `ring_fill`                                 |

**Pending pages/hosts:** index of all packs/archetypes/surfaces/signatures/themes, pack worked-app
pages, every archetype/default with empty/full casts, all 288 theme swatches/ratios, JSON Lines
fixture render pages and read/act/log console. The original semantic pages (`components`, `packs`,
`archetypes`, `themes`, `render`, `agent`) remain requirements; Vite need not imitate Expo routes.
A preset/mode switcher and reduce-motion toggle on every page, and iOS/Android gallery hosts remain
pending. Current runtime/control pages receive agent access through `PhoneScreen`, not a gallery
`agent-hook.ts`.

`look` starts a private free-port gallery, writes fresh PNGs and `issues.json`, and checks layout,
contrast, targets, rhythm and console errors. At 390 it also writes addressed Set-of-Mark PNGs.
It does not compare stored pixel baselines. **Pending visual CI:** static build/fixture suite,
Playwright baseline comparison with >0.1% difference failing CI, baseline-update pull requests with
the `update-screenshots` label, axe and native acceptance.

### 7.1 Developing this repo alone

The gallery is a standalone host. It supplies memory parts, local photo/sample media resolution and
callbacks. Live probes need model credentials; replay needs none. During component work use `look`,
not the shared fixed-port gallery server.

| Runnable command from root                        | Does                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm gallery`                                    | Generate entries and start the Vite gallery (not used by parallel component tasks) |
| `pnpm test:changed main`                          | Run related Node tests with component and pack filters during task work            |
| `pnpm test`                                       | Generate entries/themes and run the full Node suite at merge                       |
| `pnpm test:browser`                               | Run the separate serial Chrome runtime suite                                       |
| `pnpm format:check`, `pnpm typecheck`             | Root formatting and workspace TypeScript                                           |
| `pnpm build:entries`                              | Scan/generate data and renderer doors                                              |
| `pnpm build:catalog`, `pnpm catalog:bundle-check` | Build and check the data-only Node entry                                           |
| `pnpm kit:themes --check`                         | Verify generated theme source                                                      |
| `pnpm llm:check`                                  | Core probes; component/pack/compose/merge and replay flags in 4.13                 |
| `pnpm look --component <Id>`, `pnpm shoot`        | Automated phone review or gallery capture                                          |
| `pnpm --filter @lmthing/ui build`                 | Both ESM entries and declarations                                                  |
| `pnpm --filter @lmthing/gallery build`            | Vite static build                                                                  |
| `pnpm check`                                      | format:check, typecheck, rules, test, build:catalog                                |

Root `dev`, `lint`, `catalog:check` and `build` scripts and catalog watch support are **pending**.
Package-level builds already work; root `build` is not an existing command.

## 8. Testing

Droids run `pnpm test:changed main` during task work. It passes changed paths to Vitest's import
graph, then limits cross-component cases and pack-wide suites to affected components and packs.
The runner reports the changed paths, selected scope, test count and duration. Shared test
configuration, the render fixture and the check runner trigger a full Node run. The merge runs
`pnpm test` once, with no component or pack filter. Browser tests run separately.

| Layer                                        | Built coverage and remaining requirement                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog unit (Vitest)                        | Schemas/examples/fallbacks, rules, addresses, migrations, core defaults, action planning and synthetic pack scanner/generator checks. **Pending:** repair lookup/R1/R2 tests and real pack/surface content                                                                                        |
| Prompt snapshots (Vitest)                    | Real core/fixture-index snapshots and write-entry parity checks. **Pending:** all real pack blocks and token measurement reports                                                                                                                                                                  |
| Contrast                                     | Standalone script for built themes. **Pending:** all 288 and check/CI wiring                                                                                                                                                                                                                      |
| Type inference                               | Strict TypeScript and typed schema outputs. **Pending:** dedicated `expect-type` assertions for `Props`/item ids and rejected extra props                                                                                                                                                         |
| Kit conformance (Vitest/static HTML)         | Existing renderer ids, every example/declared state × built presets/light/dark, first accent; exactly one root and expected item roots. Theme-role/count test derives built arrays. **Pending:** every declared part's memory-registry registration and independent ready-view/all-288 assertions |
| Reading/actions (Vitest/static HTML)         | Filled-example visible/read text agreement and offered action role/address agreement. **Pending:** every state, deltas, runtime marks, schema-valid read-probe values and reader budgets                                                                                                          |
| Kit unit/controller (Vitest)                 | Store/planner, live controls, modal/confirmation/media, motion interpolation and defaults. **Pending:** runtime detector faults, revisions and settlement                                                                                                                                         |
| Browser runtime (Vitest + Playwright Chrome) | Three runtime tests plus eight live-control tests: taps/keyboard/agent paths, fields/replies, timers, tabs, swipes and host photos. **Pending:** exhaustive action parity/logs, stale/settle/navigation and native gates                                                                          |
| Browser motion (Vitest + Playwright Chrome)  | **Done:** cue-triggered ring reveal and reduced-motion/agent end states, with a Motion gallery page. **Pending:** native device visual/performance QA and exhaustive signature coverage                                                                                                           |
| Probes                                       | Component/pack and all 35 compose/rubric gates replay in Vitest; explicit live/replay compose and merge runners. **Pending:** aggregate/confusion/repair/token/regression gates and CI live scheduling                                                                                            |
| Catalog bundle                               | Esbuild stubs, forbidden dependency checks, plain Node import/registry, examples/fallbacks                                                                                                                                                                                                        |
| Look/visual                                  | Fresh phone PNGs, automated clipping/overflow/overlap/contrast/loading/text/targets/alignment/rhythm checks, marks and human rubric. **Pending:** pixel-baseline gate, all-accent/full-theme review                                                                                               |
| Accessibility/native                         | Base roles and browser keyboard tests exist. **Pending:** axe-core no-violation suite, native RN testing/assistive-tech/device acceptance                                                                                                                                                         |
| Performance                                  | **Pending:** reference-device and fresh-process import/reader/size/settle measurements before release                                                                                                                                                                                             |

There is no Jest, `jest-expo` or React Native Testing Library setup. Vitest with static HTML is the
current kit test tool; native behavioural coverage remains a requirement, not a claim made by those
tests. `test/known/<Id>.md` bypasses replay and records expected reading failures (4.13).
A suite that passes with these files does not prove those components' acceptance. The UI suite has
2,372 tests, including composition replay and browser motion. Chrome suites use `CHROME` or
`/usr/bin/google-chrome`; set `CHROME` to an installed binary when that default is absent.

## 9. Budgets

Prompt estimate gates in 4.9 are enforced, using synthetic pack content. The requirements below are
**pending measurement/enforcement**, not reported benchmark results. Reference phones are a
mid-range Android and an iPhone about three years old.

| What                                  | Required budget                                                           |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Mount a 9-component screen            | Under 30 ms on reference Android                                          |
| Morph                                 | 60 fps; under 5% dropped frames                                           |
| Part registration                     | Under one frame/screen, batched                                           |
| Runtime report                        | 150 ms typical, 300 ms maximum after mount                                |
| Kit plus all themes in web build      | Under 250 KB compressed at 288 themes; compact mode if over               |
| Catalog import, fresh Node process    | Under 50 ms; no validation/top-level work beyond data/schema construction |
| Read 9 components plus 6-row list     | ≤300 tokens, under 5 ms                                                   |
| Read app outline                      | ≤15 tokens/screen                                                         |
| Act to settled result, agent mode/web | Under 100 ms, or 300 ms with navigation                                   |

Current raw catalog bundle bytes are printed by the bundle check. That is not a compressed kit size
measurement or an import-time gate. RAF animation support is not evidence of device frame budgets.

## 10. Tooling

- **pnpm:** workspace and `packageManager` pin; Node version in `.nvmrc`.
- **TypeScript:** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, ES2022/bundler,
  `customConditions: ["source"]`. UI typecheck checks an entry-generation stamp (input paths and
  mtimes, plus generated output state) before rebuilding entries. The stamp and TypeScript's
  incremental build info live in the UI package's ignored `node_modules/.cache/`.
- **Prettier:** root scripts; `.prettierignore` ignores Markdown, recordings and generated files.
  Format edited docs explicitly with `pnpm exec prettier --write --ignore-path /dev/null <files>`;
  root `format:check` alone does not check Markdown.
- **Vitest:** catalog, static kit tests, controller/motion tests and Chrome integration through
  `scripts/build/check.ts`. Task checks use related mode and set `UI_TEST_COMPONENTS` and
  `UI_TEST_PACKS`; the merge runs the unfiltered suite.
- **Build:** esbuild for catalog/kit ESM and TypeScript declarations (3). Both entry exports have
  `source` and built conditions; no `./kit/tamagui` subpath, tsup or catalog watch.
- **Pending ESLint:** flat config with 200-line/60-line limits, no default exports except gallery
  entry/route files, folder-door/import boundaries, no raw colours/pixels/z-index, no preset/accent
  comparisons in views, and no component handlers bypassing bases. Catalog only imports itself/Zod;
  kit imports catalog/peers; components/packs/surfaces import both; `node:*` only in scripts; no app
  imports from packages.
- **Pending Changesets:** configured versions/changelogs for one UI package version.

Rules remain binding without lint. Flat component folders are deliberately exempt only from the
rough 12-file folder target; generated entry files are not hand-edited. No new size/door/token
exceptions are adopted. The guide's direct `test/render.tsx` import and existing violations need
scope-specific cleanup, not a documentation waiver.

## 11. Continuous integration

**Pending.** `.github/workflows/` and `.changeset/` contain READMEs, not working YAML/config.

The required PR workflow remains:

1. `pnpm install --frozen-lockfile`.
2. `pnpm typecheck`.
3. `pnpm lint` (requires the pending root script/config).
4. `pnpm test`.
5. `pnpm catalog:check` (pending unified script, contrast, budgets and bundle wiring).
6. `pnpm kit:themes --check`.
7. `pnpm build` (pending root orchestration; package builds exist).
8. Live probes when component/pack/archetype/prompt content changes, replay otherwise; environment
   key from CI secrets. Nightly live probes, aggregate/regression reporting and compose wiring too.
9. Static gallery build and Playwright baseline screenshots with artifacts.
10. Compressed kit/theme size report and gates in §9.

`pnpm check` wires formatting, types, the code rules (`pnpm rules`), tests and catalog build. It does not run the
standalone contrast script, visual baseline/axe checks or size/performance gates. A tagged
Changesets release workflow stays pending/disabled until registry/licence decisions in §14.

## 12. Using it from lmthing

- Submodule path `packages/ui` in the app repo. Workspace/submodule workflow and shell/stage/agent
  exposure boundaries stay in the app spec.
- Node agents import the built `@lmthing/ui/catalog`; workspace phone/web hosts can compile `source`.
  Writers use `writerFormat(registry)` for their scoped strict output (4.6).
- Hosts implement part projection, link handling, photo/local media resolution, interaction
  persistence and native environment hooks (5.3–5.6). `lib:` photos can use the optional asset package
  once built. The host decides where agents act.
- A minor/major catalog bump requires lmthing's pairwise eval before a submodule pointer moves.
  This plan does not change another repo or its pointer.

## 13. Implementation steps

Each row has one status line. Existing implementations do not waive unfinished gates. Component and
pack lists live in [docs/catalog/](catalog/README.md); build waves, prerequisites and gates live in
[the pack build plan](catalog/packs/build-plan.md), not duplicated here.

| Step                                  | Status                                                                                                                                                                                                                                                                                              | Remaining gate and phase                                                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U0. Bootstrap**                     | **Partly done:** workspace, TS, Prettier, Vitest, generation, esbuild/bundle check and Vite skeleton exist; lint, Changesets and CI remain                                                                                                                                                          | Lint rejects forbidden imports/201-line fixture; bundle rejects a React fixture; CI green. Phase 0                                                                                                |
| **U1. Catalog foundations**           | **Partly done:** metadata, helpers, tokens, addresses, screen rules, core registry/defaults, readers and probes exist; full themes, repair lookups/R1/R2, version/deprecation and readApp/deltas/budgets remain                                                                                     | Unified catalog check, 288-theme contrast report, address properties, reader/action budgets. Phase 0                                                                                              |
| **U2. Kit foundations**               | **Partly done:** views/bases/provider/parts, browser controller, environment hooks, shared motion and browser motion/reduced-motion acceptance exist; native host/device acceptance, complete revisions/settle/registry coverage, full theme load, axe and size gates remain                        | Web/iOS/Android render and action parity; all declared parts, all themes and web size measured. Phase 0                                                                                           |
| **U3. Prompt entries for everything** | **Partly done:** core entries/probes/snapshots, estimated budgets, pack tooling and all 35 passing compose/rubric gates with test replay exist; real pack/surface drafts and aggregate/regression gates remain                                                                                      | All drafts have complete metadata/schema/actions/tiers/fallback/examples/probes, catalog check except draft views; real prompt budgets and required live gates. Phase 0 bake-off                  |
| **U4. First 24 of the core**          | **Partly done:** the first 24 schemas/views and associated core archetypes exist; ten validated full-screen fixtures and complete interaction/visual acceptance remain                                                                                                                              | All 24 ready and every state/action/screenshot accepted in each preset. Phase 1                                                                                                                   |
| **U5. Booking and customers**         | **Not started** as pack content; shared infrastructure is ready                                                                                                                                                                                                                                     | Execute [pack build plan](catalog/packs/build-plan.md) prerequisites and wave 1; both packs ready with metadata, components, views, archetypes and Trot worked examples in three presets. Phase 1 |
| **U6. Rest of the core**              | **Partly done:** all 45 core schemas/views, 17 archetypes, live controls, time migration and ten shared signature hooks and browser motion/reduced-motion acceptance exist; surfaces, measured render detectors, native device QA, remaining core option details and exhaustive action gates remain | All core ready with agent/action parity; three surfaces, exact known-fault reports and real-phone signature judgment. Phase 1 end / Phase 2                                                       |
| **U6a. Shared variants**             | **Not started**                                                                                                                                                                                                                                                                                     | 4.2a vocabulary, `variantProps`, `variantParts`, tokens, theme density/motion, repairs, screen rules, prompts, probes, look variants sheet and migrations; every core and wave 1–2 pack component adopted, recordings refreshed. Before wave 3 components |
| **U7. Remaining packs**               | **Not started** as pack content                                                                                                                                                                                                                                                                     | Execute waves 2–5 for the remaining 25 of 27 packs in [the pack build plan](catalog/packs/build-plan.md); each pack's live gates and worked app pass before live prompts. Phases 3/4 then ongoing |
| **U8. Release readiness**             | **Not started**                                                                                                                                                                                                                                                                                     | Blank Expo/web consumers of built entries, photos, public API docs/licence, registry workflow and first tag; no lmthing dependency. Second consumer                                               |

Original planning estimates remain provisional: U0 0.5 week, U1 1, U2 1–1.5, U3 1, U4 2, U5 1,
U6 1.5, U7 ongoing, U8 1 when a second consumer appears. U0–U3 sum to about 3.5–4 weeks alongside
lmthing Phase 0; one developer doing both adds that time. These are not current completion estimates.

## 14. Open questions, with the default to build

- [ ] **Licence:** stay private/unlicensed until a second consumer, or choose a permissive licence.
      Default: private for now.
- [ ] **Registry:** submodule only, or publish (GitHub Packages if private; npm if open).
      Default: none until a second consumer.
- [ ] **Photo source:** CC0/equivalent bundled assets with recorded licences, or host-only assets.
      Default: the optional licensed bundle; no image model.
- [ ] **Full preset/accent values:** finish the 12×12 design, or explicitly revise the target.
      Default: finish it and pass contrast. Only 3×2 is built; this is not approval to lower the count.
- [ ] **Compact themes:** 288 full themes, or 24 preset/mode themes with accent overrides.
      Default: full until the size measurement requires compact; neither full coverage nor compact exists.
- [ ] **Hook ownership:** current `PhoneScreen` installs `window.__lmthingUI` on mount and deletes its
      own hook on cleanup. Keep that convenience, or let only hosts expose access through `onReady`.
      Default: host-only, preserving read-only stages and host rate limits. Requires a code decision;
      the body does not declare the deviation acceptable.
- [ ] **PhoneScreen interaction policy:** keep current `interactive=true` default, or default false
      and require host opt-in. The current code now honours `interactive=false`; the audit's forced
      always-interactive behaviour is already fixed. Default: host opt-in for stage safety.
- [ ] **Native support:** validate an Expo/RN host with the peer/driver additions, or explicitly
      restrict the release to web. Default: native remains required; hooks alone do not close it.
- [ ] **Share-link visitors' agents:** allow ephemeral acts in Try it through host notes, or expose
      read only. Default: allow in Try it only, not the studio stage.
- [ ] **Agent-mode override:** current controller switches it on for agent actions and off for
      human actions unless the host overrides. Keep this, or require explicit host control every time.
      Default: host policy; choose together with hook/interaction ownership.
- [ ] **Repair reader export:** reconcile the planned R2 `readComponent` with the built text reader
      of that name, or use a distinct public repair name. Default: preserve the existing reader API;
      no implementation rename without a separate scoped task.

**Decisions reflected in code:** web Fontsource families in 5.2; Vite gallery and Vitest/static kit
tests; esbuild plus TypeScript declarations; required tiers/`realPath`; the hook name
`window.__lmthingUI` with read/act/log/reset. These do not settle hook ownership, native acceptance
or share-link permissions.

**Writer decision, 2026-11-18:** strict `writerFormat(registry)` for production and probes, no component
aliases/alias-conflict checks or `R2.alias`/`R2.off_pack`. Migration aliases remain. Parallel work
implements this design; this documentation task does not claim those code changes are already built.
