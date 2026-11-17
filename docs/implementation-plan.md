# lmthing/ui: technical implementation plan

This repository holds the component system as one package, `@lmthing/ui`, with two entry points: the **catalog** (`@lmthing/ui/catalog`: every token, theme, component, pack, archetype and rule, as data, with no React) and the **kit** (`@lmthing/ui/kit`: the Tamagui views that draw it). Each component is one file that holds its data and its view. lmthing loads this repo as a git submodule at `packages/ui`. Other projects can use it later as a git submodule or as a published package.

The product context lives in the lmthing build spec (`docs/spec.md` in the lmthing repo). This plan covers only what is built here, how it is built, and how it is consumed. Where the two disagree on something inside this repo, this plan wins.

## 1. Scope

| In this repo | Not in this repo |
| --- | --- |
| Design tokens, 12 presets, 12 accents, theme generation and contrast checks | THING's own studio interface (shell tokens, shell primitives) |
| The `Meta` types and prop helpers for components, packs, archetypes, surfaces and signatures | Prompts for model roles, the agent, model routing |
| All core and pack component definitions, archetypes, surfaces, signatures | The op/message protocol, `fold()`, the full app `Spec` type |
| Screen rules (regions, rhythm, weight, limits, neighbours, placeholders) and the first two validation steps, parse and component repairs, with item ids (4.14) | Screen, app and scope repairs (R3 to R6), and everything that needs an app: flows, waves, carry-over of ids on a rewrite |
| The part address grammar and component-level types | The stage, camera, gestures, hit testing |
| Prompt entry generation for the catalog (one compact line per component) | Voice, sessions, storage |
| Kit renderers, kit bases, screen layout, morphing, states, surfaces, signature motion | Navigation. Links are emitted as data through a callback |
| Render issue detection (`clipped_text`, `overflow`, `empty_section`, `low_contrast`) | Deciding what to do about an issue |
| Reading and acting for agents: a compact text form of every screen, a typed action vocabulary, one dispatcher for human and agent input | Exposing it to agents (a `window` hook, where acting is allowed). Hosts decide |
| A gallery app for development, review and screenshot tests | |

**Consumers.**

- The lmthing **agent** imports `@lmthing/ui/catalog` only, the built data-only entry with no React in it.
- The lmthing **app** imports `@lmthing/ui/catalog` and `@lmthing/ui/kit`.
- **Future projects** import either entry and supply their own host (theme choice, link handling, photo resolution, part registry).
- **Agents** (browser agents, test runners, lmthing's Critic and evals) read screens as compact text and act on them by address, through the host's hook (sections 4.12 and 5.9).

## 2. Principles

1. **Data first.** Every component is defined once as data. The prompt line, the Zod schema, the default content and the kit prop types all come from that one definition, so they cannot drift.
2. **No free values.** Nothing the catalog accepts carries a colour, size, spacing, layout or motion value. Look comes from tokens, presets and fixed tables.
3. **One file per component.** Each id has one file, named after it, holding its data (`meta`, `props`, `fallback`, `examples`) and its view. The view's prop types come from the file's own schema. A non-draft file without a view fails a test.
4. **Host owns the world.** The kit never navigates, fetches, stores or measures the stage. It reports through interfaces the host implements (links, photos, part registry, render issues).
5. **Peer dependencies, not bundled ones.** React, React Native, Tamagui, Reanimated and Lucide icons are peer dependencies of the kit entry, so the host picks the versions. The catalog entry depends on `zod` only.
6. **Small files, plain code.** At most 200 lines per file and 60 per function (lint). Named exports only (default exports only in the gallery's route files), plain functions and plain data, no classes. Other folders import a folder only through its `index.ts`.
7. **Agents read and act like people.** Every screen has a compact text form generated from the same data it is drawn from, and every part that people can touch has typed actions. An agent action runs exactly the code a human touch runs. Agents never need raw DOM or screenshots.
8. **Generic where it costs nothing.** Nothing here mentions THING, takes, trailers or sessions. Tiers and `realPath` are required on every component because any app generator needs to know what a part depends on. Signature metadata is optional.
9. **Developable alone.** Everything needed to build, test, review and run this repo is in it: a gallery host, fixtures, worked examples, the first steps from model text to screen (4.14), and a model-probe runner. The app and the harness depend on this repo and never the other way round.

## 3. Repository layout

One pnpm workspace with one published package (two entry points), one optional asset package and one private app.

```text
ui/
├─ package.json                 workspace root (private): shared scripts, dev tooling
├─ pnpm-workspace.yaml          packages/*, apps/*
├─ tsconfig.base.json           strict, ES2022, moduleResolution bundler
├─ eslint.config.js             size limits, import boundaries, no default exports
├─ .changeset/                  versioning and changelogs
├─ .github/workflows/
│  ├─ ci.yml                    every pull request
│  └─ release.yml               tagged releases (disabled until a registry is chosen)
├─ docs/
│  ├─ implementation-plan.md    this document
│  └─ dependencies.md           every dependency, why, what was considered
├─ packages/
│  ├─ ui/                       @lmthing/ui: entries `catalog` (zod only) and `kit` (React, Tamagui)
│  │  ├─ src/
│  │  │  ├─ catalog/            no React, imports only zod
│  │  │  │  ├─ meta/            meta.ts (Meta, PackMeta, ArchetypeMeta types), props.ts (Props helper)
│  │  │  │  ├─ props/           text.ts, icon.ts, photo.ts, screen-id.ts, tone.ts, index.ts
│  │  │  │  ├─ tokens/          space.ts, size.ts, radius.ts, type.ts, elevation.ts, motion.ts, roles.ts, component.ts
│  │  │  │  ├─ themes/          presets/ (12 files), accents.ts, theme-name.ts, kit-style.ts
│  │  │  │  ├─ archetypes/      one data file per core archetype (home.ts … chat.ts)
│  │  │  │  ├─ signatures.ts    signature ids and the component each lives on
│  │  │  │  ├─ rules/           regions.ts, rhythm.ts, weight.ts, limits.ts, neighbours.ts, placeholders.ts, check-screen.ts
│  │  │  │  ├─ address/         grammar.ts, parse.ts, format.ts, climb.ts
│  │  │  │  ├─ types/           component.ts, screen.ts, cast.ts, tier.ts, issue.ts, action.ts
│  │  │  │  ├─ lookup/          aliases.ts, nearest-icon.ts, nearest-tag.ts, clamp.ts, snap-enum.ts
│  │  │  │  ├─ lines/           parse-line.ts (R1), read-component.ts (R2), stamp-ids.ts, assemble-screen.ts, codes.ts
│  │  │  │  ├─ prompt/          entry.ts, block.ts, pack-index.ts
│  │  │  │  ├─ agent/           actions.ts (vocabulary), validate-value.ts, default-reader.ts,
│  │  │  │  │                   read-screen.ts, read-app.ts, format.ts, diff.ts
│  │  │  │  ├─ probes/          run.ts (runProbes), score.ts, confusion.ts, compose.ts, rubric.ts, index.ts (no I/O, model call injected)
│  │  │  │  ├─ registry/        create-registry.ts, scope.ts
│  │  │  │  ├─ icons.ts, photos.ts, version.ts
│  │  │  │  └─ migrations/      index.ts, one file per major version
│  │  │  ├─ components/         one file per core component: meta, props, fallback, examples and the view
│  │  │  │                      (Header.tsx … Canvas.tsx, named by the component's PascalCase id)
│  │  │  ├─ packs/              one folder per pack: pack.ts (data), components/ (one file each),
│  │  │  │                      archetypes/ (data), example.jsonl
│  │  │  ├─ surfaces/           LockScreen.tsx, Widget.tsx, Message.tsx (data and view in one file)
│  │  │  ├─ kit/                React infrastructure the views use
│  │  │  │  ├─ provider/        KitProvider.tsx, context.ts, useKit.ts, useKitStyle.ts
│  │  │  │  ├─ tamagui/         tokens.ts, fonts.ts, animations.ts, themes.generated.ts, theme-name.ts, index.ts
│  │  │  │  ├─ base/            KitText.tsx, KitRow.tsx, KitCard.tsx, KitIcon.tsx, KitPhoto.tsx, KitAction.tsx, style.ts (shifted, surfaceOf),
│  │  │  │  │                   helpers/ (KitTrail, KitSkeleton, KitBadge, KitDivider)
│  │  │  │  ├─ part/            part-context.ts, usePart.ts (what `part` and `item` props use)
│  │  │  │  ├─ archetypes/      default-lines.ts, one layout file per archetype
│  │  │  │  ├─ signature/       one hook per signature (useRingFill.ts …), useSignature.ts
│  │  │  │  ├─ screen/          Screen.tsx, PhoneScreen.tsx, regions.ts, rhythm.ts, Morph.tsx, Arrive.tsx
│  │  │  │  ├─ report/          clipped-text.ts, overflow.ts, empty-section.ts, low-contrast.ts, useReport.ts
│  │  │  │  ├─ registry/        types.ts (PartRegistry), noop.ts, memory.ts
│  │  │  │  └─ interact/        dispatcher.ts, action-registry.ts, interaction-store.ts, settle.ts,
│  │  │  │                      agent-access.ts, a11y.ts
│  │  │  └─ entry/              generated, never edited: catalog.ts (only each file's data exports),
│  │  │                         renderers.ts (id to view map), kit.ts
│  │  ├─ scripts/               check.ts, contrast.ts, build-prompt.ts, count-tokens.ts, build-entries.ts,
│  │  │                         build-themes.ts, bundle-check.ts, llm-check.ts, llm.config.ts
│  │  ├─ assets/fonts/          OFL font files
│  │  └─ test/                  shared fixtures (casts, screens), recordings/ (model replies for probes), conformance.test.tsx, setup.ts
│  └─ photos/                   @lmthing/photos (optional, later): tagged photo assets and licences
│     ├─ assets/                one folder per tag
│     ├─ manifest.ts            tag to files, with licence and source per file
│     └─ index.ts               resolvePhoto(tag) for hosts
└─ apps/
   └─ gallery/                  private Expo app (web first): every component, archetype, theme
      ├─ app/                   index.tsx, components/[id].tsx, packs/[id].tsx, archetypes/[id].tsx,
      │                         themes.tsx, render/[fixture].tsx, agent.tsx (read and act console)
      ├─ fixtures/              screens and casts used by screenshots
      ├─ agent-hook.ts          window.__lmthingUI: read, act, log, reset
      ├─ e2e/                   screenshots.spec.ts, agent.spec.ts, a11y.spec.ts (Playwright)
      └─ tamagui.config.ts      kit tokens and themes only
```

**Dependency direction.** `src/catalog` imports only `zod`. `src/components`, `src/packs` and `src/surfaces` import `src/catalog`, `src/kit` and peers. `src/kit` imports `src/catalog` and peers. `gallery` imports the package. `photos` stands alone. Nothing imports from `apps/`.

**Two entries from the same files.** A component file imports React and Tamagui for its view, so the harness, which runs in plain Node, cannot import it. `scripts/build-entries.ts` generates `entry/catalog.ts`, which re-exports only each file's data (`meta`, `props`, `fallback`, `examples`), and `entry/renderers.ts`, which maps each id to its view. The catalog entry is built with the React, React Native and Tamagui imports and everything under `src/kit` replaced by empty stubs, so the views are dropped. `scripts/bundle-check.ts` fails the build if the built catalog contains any of those names, or does not load and build a registry in plain Node. The built catalog entry is what the harness always imports.

## 4. The catalog entry (`@lmthing/ui/catalog`)

### 4.1 Types

Component-level types live here so the kit never depends on a host's protocol. Hosts re-export them.

```ts
// types/tier.ts
export type Tier = "phone" | "ok" | "people" | "service";
// phone = lives on the phone, ok = needs the person's OK, people = needs other people,
// service = needs an outside service

// types/component.ts
export type StateName = "filled" | "empty" | "loading" | "success" | "error";
export type ComponentId = string;            // narrowed by the registry's generated union
export type Component = { id: string; c: ComponentId; state?: StateName } & Record<string, unknown>;
export type PropsOf<Id extends ComponentId> = /* inferred from the component's Zod schema */;

// types/screen.ts: the minimum a screen needs to be checked or drawn
export type ScreenLike = {
  id: string; rev: number; archetype: string; layout: string;
  components: Component[];
};

// types/cast.ts: the minimum sample content a fallback needs
export type CastLike = {
  things: { type: string; fields: string[] }[];
  items: { id: string; type: string; sample: boolean; [field: string]: unknown }[];
};

// types/issue.ts
export type Issue = { code: string; address?: string; detail?: string };

// types/action.ts
export type ActionName =
  | "press" | "toggle" | "check" | "select" | "type" | "set"
  | "increment" | "decrement" | "swipe" | "start" | "stop";
export type ScreenAction = "back" | "tab" | "scroll";
export type ActionSpec = {
  parts?: Record<string, readonly ActionName[]>;   // component parts
  items?: Record<string, readonly ActionName[]>;   // item parts, for components with items
};
```

### 4.2 Component files and shared helpers

One file per component, `src/components/<Id>.tsx`, holds everything about it. Pack components follow the same shape, and so do surfaces, with a smaller `meta` (below).

| Export | What it is |
| --- | --- |
| `meta` | A plain object, `as const satisfies Meta` |
| `props` | The Zod schema. Every string has a limit and every array a maximum |
| `fallback` | `({ cast }) => props input`: spare content when the model's version cannot be used. Built only from the cast through `catalog/cast` helpers (fields in the order the thing declares them, never read by name), else the shared neutral placeholders. No domain words |
| `examples` | Two or more valid inputs, checked by `catalog:check` |
| `probes` | Small model tests for this component: `choose`, `write` and `read` (4.13) |
| A React component named by the id (`List`) | The view. Absent while `meta.status` is `"draft"` |

```ts
export type Meta = {
  id: string;                                 // PascalCase, equal to the file name and the view's name, unique across core and packs
  group: "structure" | "content" | "data" | "input" | "action" | "beyond" | "signature" | "escape";
  purpose: string;                            // 16 words or fewer
  pick: string;                               // when to choose it, and the nearest wrong choice
  region: "top" | "body" | "bottom";
  weight: 1 | 2 | 3;
  tier: Tier;
  realPath: string;                           // one sentence: how a real app would build this
  items?: { key: string; parts: readonly string[]; prefix?: string };  // prefix defaults to "r"
  parts?: readonly string[];                  // defaults to ["root"] plus the item parts
  states?: readonly StateName[];              // defaults to ["filled"]
  actions?: ActionSpec;                       // defaults to press on every part whose props include goto, else {}
  aliases: readonly string[];
  read?: (props: unknown, state: StateName) => string[];   // override of the generated reader
  signature?: SignatureId;
  status?: "draft" | "ready";                 // draft = no view yet. Default "ready"
};

export type Props<S extends z.ZodObject<any>, M extends Meta> =
  /* z.output<S>, with an `id` added to each item of M["items"]["key"] (stamped by the validator) */;
```

**Names.** A component's id is PascalCase (`List`, `ServiceMenu`, `KeyValue`), and the same name is its file (`List.tsx`), its view function and the `c` value the model writes (`{"c":"List"}`). Aliases stay lowercase. `lookupAlias` ignores case and separators, so `service_menu`, `servicemenu` and `Service-Menu` all resolve to `ServiceMenu`. Names that would shadow a browser global are avoided (`MapPins`, `ClientHistory`, `EventCard` instead of `Map`, `History`, `Event`).

Packs, archetypes and surfaces are plain objects the same way:

```ts
export const pack = {                          // packs/<id>/pack.ts
  id: "booking", name: "Booking",
  purpose: "...", pick: "...",                 // pick names the nearest other pack
  example: "./example.jsonl",                  // a worked example app as JSON Lines
} satisfies PackMeta;
// A pack's components are the files in packs/<id>/components/ and its archetypes (at least 2) the files in
// packs/<id>/archetypes/. The entry generator collects them, so pack.ts never imports a component file.

export const home = {                          // catalog/archetypes/home.ts
  id: "home", job: "What matters now",
  layouts: { focus: { recipe: [/* Slot[] */], defaults: [/* Component[] */] } },
  defaultLayout: "focus",
} satisfies ArchetypeMeta;
type Slot = { allow: ComponentId[]; required: boolean; min?: number; max?: number };
```

A surface (`src/surfaces/LockScreen.tsx`) is a file like a component, with a smaller `meta` because it is never placed on a screen:

```ts
export type SurfaceMeta = {
  id: "LockScreen" | "Widget" | "Message" | string;   // PascalCase, like component ids
  purpose: string;                                    // what outside-the-app moment it draws
  tier: Tier;
  realPath: string;
  parts?: readonly string[];                          // defaults to ["root"]
  aliases?: readonly string[];
  status?: "draft" | "ready";
};
```

A surface has no `region`, `weight`, `group`, `items` or `actions`, and does not count toward a screen's 3 to 9 components. Its file exports `meta`, `props`, `fallback`, `examples` and a view, as a component file does. The view takes the app's name and icon from the host. Rules and flow steps name a surface by id (`"surface":"LockScreen"`), and the model never writes one into a screen.

Nothing runs at import time. All checks live in `scripts/check.ts`, so importing the catalog stays cheap.

**Shared prop helpers** (`props/`): `text(max)` (a trimmed string with a limit), `icon`, `photo`, `screenId` and `tone`, each carrying metadata the prompt builder reads (limit, enum values). They implement this vocabulary, which is the same on every component:

| Prop | Values | Notes |
| --- | --- | --- |
| `tone` | `plain`, `accent`, `soft`, `good`, `warn`, `bad` | The only way to ask for colour |
| `style` | Two to four names per component | Each is a Tamagui variant of the same name in the kit |
| `kind` | Per component (`primary` on a button, `date` on a field) | What it is, where `style` is how it looks |
| `icon` | About 120 names, a curated subset of Lucide (`leaf`, `drop`) | Unknown names snap to the nearest, then to a neutral dot |
| `photo` | `lib:<tag>` from the bundled tagged library, or `local:<n>` | Never a URL |
| `goto` | A screen id, or `back` | The only way to link |

### 4.3 Tokens and themes

This repo owns the token values.

| File | Holds |
| --- | --- |
| `tokens/space.ts` | `xs` 4, `sm` 8, `md` 12, `lg` 16, `gutter` 20, `xl` 24, `2xl` 32, `3xl` 48. A 4 point grid |
| `tokens/size.ts` | `control.sm/md/lg` 36/44/52, `icon.sm/md/lg` 16/20/24, `avatar.sm/md/lg` 32/44/64. No touch target under 44 |
| `tokens/radius.ts` | `sm` 8, `md` 12, `lg` 16, `xl` 24, `pill` 999. A sharp preset shifts one step down, a round one up |
| `tokens/type.ts` | `display` 34/40 bold, `title` 26/32 bold, `heading` 19/24 semibold, `body` 16/22 regular, `label` 14/18 medium, `caption` 12/16 medium, `number` 40/44 bold tabular |
| `tokens/roles.ts` | Colour role names, set by the theme (components use roles only): `bg`, `surface`, `raised`, `line`, `text`, `muted`, `accent`, `accentSoft`, `onAccent`, `good`, `warn`, `bad` |
| `tokens/elevation.ts` | `flat`, `card`, `sheet`: three shadow levels |
| `tokens/motion.ts` | Durations `fast` 120, `base` 220, `slow` 420 ms. Springs `snappy` (stiffness 420, damping 34), `gentle` (180, 24), `bouncy` (300, 14; bouncy values are a proposal) |
| `tokens/component.ts` | Tokens that belong to one component, named by it (`Ring.stroke`, `Bars.barWidth`, `Slots.chipHeight`). The only home for a number a view needs that no shared scale covers |
| `themes/presets/*.ts` | One file per preset: mood, type family, shape (sharp, soft, round), density, surface treatment, role values for light and dark |
| `themes/accents.ts` | 12 accents, each with `accent`, `accentSoft`, `onAccent` for light and dark |
| `themes/theme-name.ts` | `themeName({ preset, accent, mode })` → `kit_<preset>_<mode>_<accent>` |
| `themes/kit-style.ts` | `KitStyle` and `kitStyleOf(preset)`: what a preset changes besides colour (corner shift, font pairing, density, surface treatment) as plain data |

A theme is preset plus accent plus mode. The model picks names and never a colour.

| Preset | Mood | Type | Shape | Surfaces |
| --- | --- | --- | --- | --- |
| `calm` | Quiet and airy | Humanist sans | Soft | Flat, lightly tinted |
| `minimal` | Precise, in the spirit of Linear | Grotesk | Soft | Hairlines, no tints |
| `warm` | Cosy, paper tones | Humanist sans | Round | Cream surfaces |
| `fresh` | Bright and clean | Grotesk | Soft | White cards, light shadow |
| `bold` | High contrast, big type | Grotesk | Sharp | Solid accent blocks |
| `playful` | Friendly and bouncy | Rounded sans | Round | Soft tints |
| `soft` | Gentle pastels | Rounded sans | Round | Pastel tints |
| `editorial` | Like a magazine | Serif headings | Sharp | Hairlines, generous margins |
| `paper` | A notebook in ink | Serif | Sharp | Off-white, ruled lines |
| `sport` | Energetic, numbers first | Grotesk, condensed numbers | Sharp | High contrast |
| `night` | Dark first, glowing accent | Grotesk | Soft | Raised dark surfaces |
| `mono` | Black and white, one accent | Grotesk | Soft | No tints |

Accents: `moss`, `forest`, `teal`, `sky`, `indigo`, `violet`, `rose`, `coral`, `amber`, `sand`, `slate`, `ink`, each defining `accent`, `accentSoft` and `onAccent` for light and dark.

Accent and preset colour values are designed in step U1. Each one must pass the contrast rules: text on background at least 7:1, muted text and text on accent at least 4.5:1, in all 288 combinations. A failing combination fails `catalog:check`.

**Shapes.** A theme is declared as plain data, and raw colour values are allowed here and in `tokens/` only.

```ts
// themes/presets/calm.ts
export const calm = {
  id: "calm",
  mood: "Quiet and airy",
  font: "humanist",                       // "humanist" | "grotesk" | "rounded" | "serif"
  numbers: "regular",                     // "regular" | "condensed" (sport)
  shape: "soft",                          // "sharp" | "soft" | "round"
  density: "regular",                     // "compact" | "regular" | "airy"
  surface: "flat-tinted",                 // how cards draw their background and edge
  roles: {
    light: { bg: "#f7f8f5", surface: "#ffffff", raised: "#ffffff", line: "#e3e7e1", text: "#1c2420", muted: "#5b665f",
             good: "#2f7d4f", warn: "#a86a12", bad: "#b3382c" /* accent roles come from the accent */ },
    dark:  { bg: "#121614", surface: "#1a201d", /* … */ },
  },
} as const satisfies PresetMeta;

// themes/accents.ts
export const moss = {
  id: "moss",
  light: { accent: "#4a7c3a", accentSoft: "#e4eedd", onAccent: "#ffffff" },
  dark:  { accent: "#8fc178", accentSoft: "#26331f", onAccent: "#10170c" },
} as const satisfies AccentMeta;
```

The 288 themes are generated: a theme's roles are the preset's roles for the mode, with `accent`, `accentSoft` and `onAccent` taken from the accent.

`KitStyle` is everything a preset changes that is not a colour, derived from the preset by a pure function and handed to `KitProvider`:

```ts
// themes/kit-style.ts
export type KitStyle = {
  radiusShift: -1 | 0 | 1;                          // steps along sm, md, lg, xl (sharp, soft, round)
  fonts: { text: FontName; heading: FontName; number: FontName };
  density: { gap: SpaceToken; rowPad: SpaceToken; cardPad: SpaceToken };
  surface: SurfaceTreatment;                        // "flat-tinted" | "hairline" | "cream" | "solid-accent" | …
};
export function kitStyleOf(preset: PresetMeta): KitStyle;
```

### 4.4 Components, packs and archetypes

- **Core:** the 40 components and 15 archetypes listed below, as built. One file each (a component file holds its view too). The planned core of 44 components and 17 archetypes (six new, two merges, new options on thirteen) is in [catalog/core.md](catalog/core.md), which wins where the two differ.
- **Packs:** the 18 packs in [catalog/packs/](catalog/packs/README.md), every component described there; the table under Domain packs below is the first proposal and is superseded. Each pack folder holds `pack.ts`, its component files, its archetype files, and a worked example app.
- **Ids** are unique across core and packs. A pack component's id never equals a core alias, unless the core alias is meant to resolve to it when the pack is active (see 4.6).

Component file template (one per component, under 200 lines like every file):

```tsx
// packages/ui/src/components/List.tsx
import { z } from "zod";
import { text, icon, photo, screenId, type Meta, type Props } from "../catalog";
import { KitCard, KitRow, KitIcon, KitText, KitTrail } from "../kit";

export const meta = {
  id: "List",
  group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "The person scans or chooses among their things. Not for facts about one thing (KeyValue) or things to tick off (Checklist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  items: { key: "rows", parts: ["root", "title", "meta", "icon", "trail"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], trail: ["toggle"] } },
  aliases: ["listview", "table", "rows", "items"],
} as const satisfies Meta;

export const props = z.object({
  style: z.enum(["plain", "inset", "cards"]).default("inset"),
  rows: z.array(z.object({
    title: text(28),
    meta: text(36).optional(),
    icon: icon.optional(),
    photo: photo.optional(),
    trail: z.enum(["none", "chevron", "check", "toggle", "value", "badge"]).default("chevron"),
    value: text(10).optional(),
    goto: screenId.optional(),
  })).min(1).max(6),
});

export const fallback = ({ cast }) => ({ style: "inset", rows: rowsFromCast(cast, 3) });

export const examples = [/* two or more, validated by catalog:check */];

export const probes = [/* choose, write and read probes (4.13) */];

export function List({ style, rows }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style={style} part="root">
      {rows.map((row) => (
        <KitRow key={row.id} item={row.id}>
          <KitIcon name={row.icon} part="icon" />
          <YStack flex={1}>
            <KitText role="body" part="title">{row.title}</KitText>
            {row.meta && <KitText role="caption" tone="muted" part="meta">{row.meta}</KitText>}
          </YStack>
          <KitTrail kind={row.trail} value={row.value} part="trail" />
        </KitRow>
      ))}
    </KitCard>
  );
}
```

#### The 40 core components

> The built 40. Planned changes (`Sheet`, `Composer`, `Progress`, `Choice`, `Amount`, `Player`, merges and new options) are in [catalog/core.md](catalog/core.md).

Every app can use these. All are tier "phone" (lives on your phone) unless noted. Domain packs add more, under Domain packs below.

| Group | Component | Use it for | The model writes | Styles or kinds |
| --- | --- | --- | --- | --- |
| Structure | `Header` | Title and at most one corner action | `title`, `sub`, `action` | `large`, `inline`, `back` |
| Structure | `SectionTitle` | A label above a group | `text`, `link` |  |
| Structure | `Steps` | Place in a short sequence | `count`, `at` | `dots`, `bar`, `numbered` |
| Structure | `TabBar` | Main navigation | Nothing. Code builds it from sections marked `nav` |  |
| Content | `Hero` | The one thing this screen says | `title`, `sub`, `photo`, `tone` | `statement`, `photo`, `number` |
| Content | `Card` | One thing with a little detail | `title`, `body`, `meta`, `icon` or `photo`, `goto`, `tone` | `plain`, `tinted`, `outlined`, `media` |
| Content | `List` | Several things of one kind | `rows` of title, meta, icon or photo, trail, goto | `plain`, `inset`, `cards` |
| Content | `KeyValue` | Facts about one thing | `pairs` of label and value, up to 6 | `rows`, `grid` |
| Content | `Note` | One short sentence | `text`, `tone` | `body`, `quote`, `hint` |
| Content | `Photo` | One picture | `photo`, `caption`, `ratio` | `square`, `wide`, `tall` |
| Content | `Gallery` | Several pictures | `photos`, up to 6 | `grid`, `strip` |
| Content | `Profile` | Who or what this is | `name`, `meta`, `photo` | `row`, `centered` |
| Content | `Banner` | Something to notice now | `text`, `icon`, `tone`, `goto` |  |
| Content | `Empty` | A screen before it has content | `title`, `sub`, `icon` |  |
| Data | `Stats` | Two to four numbers | `tiles` of label, value, unit, trend | `tiles`, `inline` |
| Data | `Ring` | Progress to one goal | `value`, `of`, `label`, `sub` | `md`, `lg` |
| Data | `Bars` | Amounts across days or categories | `points` (up to 7), `unit` |  |
| Data | `Sparkline` | A trend and its latest value | `label`, `value`, `points`, `tone` |  |
| Data | `Timeline` | Things in time order | `items` of time, title, meta, done | `day`, `history` |
| Data | `Calendar` | Days with something on them | `marked` days with tone, `selected` | `week`, `month` |
| Data | `Counter` | One number nudged up or down | `label`, `value`, `unit`, `step` |  |
| Data | `Timer` | Countdown or stopwatch | `label`, `seconds` | `down`, `up` |
| Input | `Field` | One piece of information | `label`, `kind`, `value`, `hint` | `text`, `number`, `date`, `time`, `choice`, `toggle`, `slider`, `photo` (photo needs your OK) |
| Input | `Chips` | Filter or pick among a few | `items` of label and on, up to 6 | `filter`, `choose` |
| Input | `Segmented` | Switch between 2 to 4 views | `options`, `at` |  |
| Input | `Checklist` | Things to tick off | `items` of text and done, up to 6 |  |
| Input | `Search` | Find among many | `hint` |  |
| Input | `Scale` | Log a level 1 to 5 | `label`, `value` | `mood`, `stars`, `dots` |
| Action | `Button` | Something the person does | `label`, `kind`, `icon`, `goto` | `primary`, `secondary`, `quiet`, `danger` |
| Action | `Actions` | Two to four shortcuts | `items` of icon, label, goto |  |
| Action | `Success` | Proof something worked | `title`, `sub`, `icon` |  |
| Beyond phone | `Camera` | Pointing the camera at something | `hint`, `kind` (`photo`, `scan`) | Needs your OK |
| Beyond phone | `MapPins` | Places on a map | `pins` of label, up to 5 | Needs an outside service |
| Beyond phone | `Bubbles` | A conversation | `messages` of from and text, up to 6 | Needs other people |
| Beyond phone | `People` | Who else is part of this | `members` of name and role, up to 6 | Needs other people |
| Signature | `SwipeStack` | A stack of cards to swipe | `cards` of title and photo |  |
| Signature | `DayTimeline` | A day's blocks by the hour | `blocks` of time and title |  |
| Signature | `Streak` | Days in a row | `days`, `count` |  |
| Signature | `Route` | A path between stops | `stops` of label | Needs an outside service |
| Escape | `Canvas` | An idea the library cannot express (a game, a drawing tool) | `caption` | Every use is logged as a miss |

The signature components' props are proposals to finalise in Phase 1. The Director avoids beyond-phone components in a first showcase unless the idea needs them.

**Signature moments.** Each app gets exactly one, chosen by the Director to fit what the core loop measures: progress gets `ring_fill` (on `Ring`), amounts `bars_grow` (`Bars`), tasks `check_burst` (`Checklist`), numbers `count_up` (`Stats`), dates `calendar_sweep` (`Calendar`), timing `timer_spin` (`Timer`), choices `card_swipe` (`SwipeStack`), a schedule `day_unfold` (`DayTimeline`), a habit `streak_flame` (`Streak`), a journey `route_draw` (`Route`). The trailer is built around it.

**Outside surfaces.** `LockScreen` (notification, needs your OK), `Widget` (home-screen tile, phone) and `Message` (a text being sent, needs an outside service). The model never places these on a screen. Rules and flow steps name them.

**Parts, states, tiers.** Every component lists its addressable parts, and item parts for components with items. Every component lists the states it draws from `filled`, `empty`, `loading`, `success`, `error`. States are drawn by the kit and chosen by flow steps, so a success moment costs no model call. The tier is one hand-written field with a `realPath` sentence, and the catalog build fails without both. A component enters the catalog only with a `realPath`, so the showcase never promises what step two cannot build.


#### Archetypes

A screen always starts as an archetype: a finished screen with slots. The worst outcome is the default, and the default already looks good.

| Archetype | Job | Layouts | Default recipe |
| --- | --- | --- | --- |
| `home` | What matters now | `focus`, `feed`, `board` | Header, Hero, List, Button |
| `dashboard` | How things are going | `rings`, `charts` | Header, Stats, Bars, List |
| `list` | All things of one kind | `plain`, `grouped`, `gallery` | Header, Chips, List, Button |
| `detail` | One thing, fully | `facts`, `media`, `progress` | Header, Photo, KeyValue, Button |
| `form` | Add or change a thing | `short`, `stepped` | Header, 3 to 5 Field, Button |
| `checklist` | Steps or tasks | `simple`, `progress` | Header, Ring, Checklist, Button |
| `calendar` | Things by date | `week`, `month` | Header, Calendar, Timeline |
| `tracker` | Logging again and again | `counter`, `scale`, `timer` | Header, Counter, Bars, Button |
| `journal` | Entries over time | `entries`, `photos` | Header, Card, Button |
| `profile` | Me, or one person | `me`, `person` | Header, Profile, Stats, List |
| `settings` | Choices about the app | `simple` | Header, List with toggles |
| `success` | Something is done | `plain`, `summary` | Success, KeyValue, Button |
| `onboarding` | The first ten seconds | `single`, `steps` | Hero, Note, Steps, Button |
| `capture` | Taking a photo or scanning | `photo`, `scan` | Header, Camera, Note, Button |
| `chat` | Talking with someone | `thread` | Header, Bubbles, Field |

A recipe names required slots and what may fill them, such as `home/focus: Header, Hero, List | Checklist | Timeline, [Stats], Button`. The validator fills a missing required slot from the default. Components outside the recipe are allowed when the screen rules pass.

**How the agent picks:** one headline fact is `Hero`; several things of one kind `List` (or `Gallery` when pictures matter); facts about one thing `KeyValue`; a few numbers `Stats`; progress `Ring`; amounts across days `Bars` (a trend `Sparkline`); when things happen `Calendar` or `Timeline`; things to tick off `Checklist`; something to enter `Field`, `Chips` or `Segmented`; the thing to do next `Button`, exactly one primary.

**Looks great by construction:** no free values; limits on every string and list; screen rules; real content from the cast with placeholders rejected; finished archetype defaults; checked themes; rhythm and motion by table; one hand-polished signature; a shadow render before reveal. Variety comes from the product of choices (archetypes and layouts, styles, 12 presets, 12 accents, 10 signatures, two takes, domain packs, the person's own content), not from freedom.


#### Domain packs

> Superseded: the revised and new packs, with every component, archetype and worked example, are in [catalog/packs/](catalog/packs/README.md). The table below is the first proposal, kept for history.

A general builder needs more than 40 components, but a cheap model chooses badly from 100 at once. So the core stays in every prompt, and each domain adds a pack of about 5 to 10 components and 2 to 4 archetypes. The Director picks up to 3 packs from a one-line-per-pack index and writes them in the brief. Every later call for that app (Writers, edits, Critic) sees the core plus those packs only. Packs follow every core rule: flat screens, the shared prop vocabulary, limits, parts, states, a tier and a `realPath` per component, and one renderer per id in the kit.

| Pack | For | Components (proposal, finalised in Phase 1) | Archetypes |
| --- | --- | --- | --- |
| `commerce` | Selling things: a bakery, a market stall, an online shop | `Product`, `ProductGrid`, `Price`, `VariantPicker`, `Quantity`, `Cart`, `OrderSummary`, `OrderStatus`, `Promo` | `shop`, `product`, `cart`, `checkout` |
| `booking` | Appointments and slots: dog walks, haircuts, classes | `ServiceMenu`, `Slots`, `Availability`, `StaffPicker`, `BookingSummary`, `Capacity` | `book`, `appointments`, `schedule` |
| `customers` | People a business serves | `ClientCard`, `ClientList`, `ClientHistory`, `Invoice`, `PaymentStatus`, `Review` | `clients`, `client`, `invoice` |
| `data` | Running things behind the scenes | `Table`, `Board`, `FilterBar`, `LineChart`, `Donut`, `Kpi`, `Heatmap`, `BulkActions` | `admin_list`, `report`, `board` |
| `social` | Communities and sharing | `Post`, `Feed`, `Comments`, `Reactions`, `Follow`, `Leaderboard`, `Poll`, `EventCard` | `feed`, `post`, `event` |
| `content` | Reading, listening, watching | `Article`, `RichText`, `Player`, `Playlist`, `Episode`, `ChapterList` | `article`, `player`, `library` |
| `learning` | Teaching and practising | `Lesson`, `Quiz`, `Flashcard`, `Path`, `Score` | `lesson`, `quiz`, `course` |
| `money` | Budgets, bills and splitting costs | `Balance`, `Transactions`, `Budget`, `Split`, `Bill` | `wallet`, `budget` |
| `places` | Where things are and where they go | `PlaceCard`, `Address`, `Hours`, `DeliveryTracker`, `MapList` | `places`, `place`, `tracking` |
| `team` | Staff, shifts and approvals | `Roster`, `Shift`, `Approval`, `TaskBoard`, `RoleBadge` | `team`, `rota`, `approvals` |

- **Choosing packs.** The pack index sits in the shared prefix, one line per pack with its purpose and a pick line ("Selling things for money. Not for booking time, which is `booking`"). The brief's `packs` field is validated like any enum: an unknown name snaps to the nearest, and more than 3 keeps the first 3. A personal app usually needs none.
- **Adding a pack later.** A request that needs a pack the app lacks ("let people pay a deposit") becomes `restructure`. The Director amend adds the pack to the brief as its own version, then Writers continue as usual. A pack is never removed while a screen uses one of its components.
- **Off-pack lines.** A Writer line for a pack component outside the app's packs is mapped through aliases to a core component if one fits (repair code `R2.off_pack`). If none fits, the line is dropped. These codes feed the weekly catalog review, as `Canvas` misses do. A core alias never shadows a pack component the app has: with `data`, `table` maps to `Table`, and without it `table` maps to `List`.
- **Tiers.** Many commerce, booking and customers components are "needs an outside service" (payments, sending to customers) or "needs other people" (a customer's view). First showcases still prefer the first two tiers unless the idea needs more, and "what's real?" says plainly what a business app needs.
- **Order of work.** Phase 1 builds the core plus `booking` and `customers`, so Trot is complete. The other packs follow in the order the bake-off's off-pack codes and `Canvas` misses ask for. Every pack ships with renderers, two examples per component and a worked example app in its domain.


### 4.5 Screen rules

Pure functions over `ScreenLike` and a registry. They report issues. They never repair.

Eight fixed layout rules, enforced by these files:

1. **Three regions.** Top (pinned header), body (one scrolling column), bottom (pinned primary action, then the tab bar). Each component declares its region. The validator sorts by region and keeps the model's order inside the body.
2. **One column, one 20 point gutter.** Components that hold items lay them out themselves: rows, a two-column grid or a sideways scroller.
3. **Rhythm from a table.** 8 after a section title, 16 between content, 24 before a new group or after a hero. No spacing prop.
4. **Weight budget.** Weight 1 (note, chips, button), 2 (list, card, stats) or 3 (hero, chart, calendar, signature). A screen holds 3 to 9 components, at most 12 weight and at most two weight-3 components.
5. **One primary action**, bottom region, in thumb reach. Extra primaries are demoted to secondary.
6. **Text limits per part.** Title 24 characters, subtitle 48, row title 28, row meta 36, button label 18, note 140. Limits live beside each part.
7. **Count limits.** 6 rows, 6 chips, 2 to 4 stat tiles, 7 bars, 5 tabs. A list that stands for more shows a quiet "and 12 more" line.
8. **Neighbour rules.** A hero is first in the body. A section title is followed by content. Two components of the same type are not adjacent, except cards and fields. A button is never first.

| File | Enforces |
| --- | --- |
| `rules/regions.ts` | `sortByRegion(components)`: rule 1 |
| `rules/rhythm.ts` | The gap table: rule 3 |
| `rules/weight.ts` | Rule 4 |
| `rules/limits.ts` | Rules 6 and 7, read from the schemas |
| `rules/neighbours.ts` | Rules 5 and 8 |
| `rules/placeholders.ts` | Rejected patterns ("Lorem", "Item 1", "John Doe", "Untitled", "Example") |
| `rules/check-screen.ts` | `checkScreen(screen, registry): Issue[]` runs all of the above with stable codes (`S.weight_over`, `S.two_primaries` …) |

### 4.6 Registry and pack scope

```ts
const registry = createRegistry({ packs: ["booking", "customers"], includeDrafts: false });
registry.get("Slots");            // ComponentDef or undefined
registry.resolve("table");        // "Table" with the data pack, else "List"; lookups ignore case and separators        // id after alias lookup, scoped to the active packs
registry.schema("List");          // Zod schema
registry.archetypes; registry.surfaces; registry.ids;
```

- A registry is a scoped view: the core plus the given packs. Hosts create one per app.
- **Alias resolution:** an exact id wins. A core alias never shadows a pack component the registry includes (with `data`, `table` resolves to `Table`; without it, `table` resolves to `List`). Two aliases resolving to different ids within one scope fail `catalog:check`.
- `includeDrafts` (default `false`) includes `status: "draft"` components. The lmthing bake-off sets it to `true`. Live use never does.

### 4.7 Lookups for repairs

Hosts repair model output. The catalog supplies the data and small pure helpers so every host repairs the same way:

- `lookupAlias(registry, name)`
- `nearestIcon(name)`: edit distance plus a synonym table, then the neutral `dot`
- `nearestPhotoTag(tag)`: same approach over `photos.ts`
- `clampText(value, max)`: cut at a word boundary
- `snapEnum(value, values)`

### 4.8 Addresses

The address grammar lives here because the kit stamps addresses on parts.

```text
screen "/" component [ "/" item ] [ "/" part ]

home                the screen
home/l1             the list
home/l1/r2          the second row ever added to it
home/l1/r2/title    that row's title
home/~after:l1      the gap below the list ("add a photo here")
```

`parseAddress(s): Address | null`, `formatAddress(a): string`, `climb(a): Address | null` (part → item → component → screen). Property tests check that formatting a parsed address returns the original string.

### 4.9 Prompt entries

```ts
buildEntry(def): string                         // one component, two lines, under 70 tokens per line
buildBlock(registry, scope: "core" | PackId): string
buildPackIndex(): string                        // one line per pack: id, purpose, pick
```

Example output:

```text
List [phone] Several things of the same kind, each one tappable. Not for facts about one thing (KeyValue).
  {"c":"List","style":"inset|plain|cards","rows":[{"title":<=28,"meta"?:<=36,"icon"?,"photo"?,"trail"?:"chevron|check|toggle|value|badge","goto"?}]}  1-6 rows
```

- The output is deterministic: fixed ordering by group then id, no timestamps, so prompt caching holds.
- Token counts (an o200k tokenizer, a dev dependency used only in `scripts/`) are measured and reported for every entry and block. They are not gates. Whether a block is too big is decided by the `choose` and `compose` accuracy in 4.13, so nothing is cut to meet a number.
- Snapshot tests store every block. A pull request shows exactly what changes in the model's view.

### 4.10 Checks

`pnpm catalog:check` fails unless:

1. Every component file has every required export and `meta` field. The purpose is 16 words or fewer, and the pick line names a nearest wrong choice.
2. Every string prop has a limit, and every array has a maximum.
3. Every component has at least two examples that pass its schema, use only real icons and photo tags, and pass the placeholder check.
4. Every fallback validates with an empty cast and with a full cast (fixtures in `test/`).
5. Every archetype layout's default lines pass `checkScreen`.
6. Every pack has a purpose, a pick line, at least two archetypes and a worked example whose lines all validate.
7. No alias conflicts within any core-plus-pack scope.
8. Every colour role exists in every theme and passes contrast (`scripts/contrast.ts`, all 288 themes).
9. Token counts for every entry and block are reported (4.9), and the probe gates in 4.13 hold.
10. Every action names a declared part, every input component has at least one action (declared or inferred from a `goto`), and the inferred actions match what the view wires up.
11. Every example, in every declared state, reads within the token budget in 4.12, and a custom `read` mentions every part that holds text.
12. Every `ready` component file exports a view. This is checked by the conformance test, and listed here for completeness.
13. `scripts/bundle-check.ts` passes: the built catalog entry contains no React, React Native or Tamagui and builds a registry in plain Node (section 3).
14. Every component file declares its `probes` as 4.13 requires, every archetype layout has at least one `compose` probe, every pack has at least three `pack` probes (two positive and a near miss), and every `expect` names a real id.

### 4.11 Versioning and migrations

- The `@lmthing/ui` package version is the catalog version stamped on every spec a host saves.
- **Patch:** wording, examples, a loosened limit.
- **Minor:** a new component, style, optional prop, icon, layout or pack. It needs a kit renderer, two examples and, in lmthing, a pairwise eval that does not regress.
- **Major:** a removal, rename, tightened limit or changed meaning. It needs a migration: a pure function over a minimal spec shape (`{ catalog, screens: Record<string, ScreenLike> }`), with fixture tests. Hosts run `migrate(spec)` on load.
- A deprecated component is marked `deprecated: true`. It leaves prompt blocks at once and stays drawable for two major versions.

### 4.12 Reading and acting: the catalog side

Agents read screens as compact text and act on them by address. Everything that can be computed from data lives here, so a screen can be read with no browser (the lmthing agent reads specs on the server this way).

**Action vocabulary.** Each component declares, in `actions` (or gets them inferred from its `goto` props), what each part and item part accepts:

| Action | Value | Used by |
| --- | --- | --- |
| `press` | None | `Button`, `Card`, list rows, `Actions` items, `Banner`, header action, tab bar tabs, anything with a `goto` |
| `toggle` | None (flips) or a boolean | `Field` (toggle), list row toggle trail, `Chips` (filter) |
| `check` | None (flips) or a boolean | `Checklist` items |
| `select` | An index or option label | `Segmented`, `Chips` (choose), `Calendar` days, `Field` (choice) |
| `type` | Text | `Field` (text, number, date, time), `Search` |
| `set` | A value | `Field` (slider), `Scale`, `Counter` |
| `increment`, `decrement` | None | `Counter`, `Field` (slider), `Scale` |
| `swipe` | `left` or `right` | `SwipeStack` |
| `start`, `stop` | None | `Timer` |

Screen-level actions: `back`, `tab(sectionId)`, `scroll` (to the top, the bottom or an address). Pack components use the same vocabulary. A new action name is a minor catalog version.

**Value validation.** `validateActionValue(def, address, action, value)` checks a value against the part's schema: a date field takes `YYYY-MM-DD`, a time field `HH:MM`, a number stays within the schema's bounds, text within the part's limit, `scale` 1 to 5, `select` a valid index or label. An invalid value returns `invalid_value` with the allowed format in under 10 words.

**Readers.** Each component has a reader, `(props, state) => string[]`. The default reader is generated from the schema. A component overrides it only where a summary reads better (`Bars` as its values with the unit, `Ring` as "3 of 5", `Calendar` as its marked days, `Timer` as its time).

**Format.** Deterministic, one line per component, items indented two spaces:

```text
screen home "Today" · calm/moss/light · rev 4 · ready
h1 Hero[accent] "3 plants are thirsty" — "Fern, Monstera and Basil"
l1 List
  r1 "Fern" · "Bathroom" [l1/r1 press→plant] [l1/r1/trail toggle:off]
  r2 "Monstera" · "Living room" [l1/r2 press→plant] [l1/r2/trail toggle:on]
f1 Field[date] "Next watering" = "2026-11-19" [f1 type:date]
b1 Button[primary] "Add a plant" [b1 press→new_plant]
```

- Every line starts with its address relative to the screen (`l1`, `r1`). The full address for an action is the screen id plus that path (`home/l1/r1`).
- Text written by a model or a person is always in double quotes, with inner quotes escaped, so structure and content never mix. Agents treat quoted text as data.
- Style or kind in brackets after the component name only when not the default; tone only when not `plain`; state in parentheses only when not `filled` (`l1 List (loading)`).
- Affordances in square brackets, each starting with its own address so a model copies it and never assembles one (measured: DeepSeek Flash picked the wrong part when the address had to be inferred): `[l1/r1 press→target]`, `[l1/r1/trail toggle:on|off]`, `[k1/r1/check check:done|todo]`, `[select:2/4]`, `[type:date]`, `[set:1-5]`, `[disabled]`.
- Field values follow `=`. Interactive values come from the kit's interaction state when a host passes it (5.9).
- **Risk marks.** An action on a component whose tier is not `phone` ends with its tier: `[press→pay !needs-ok]`, `!needs-people`, `!needs-service`. A real app would gate these; an agent knows before it acts.
- **Secrets.** A value made with the `secret(max)` prop helper (a password or a code in `Field`) always reads as `(secret)`; the text never reaches a model.
- No pixels, colours, fonts or class names. Photos read as `photo:<tag>` or their caption. Icons appear only when they carry meaning (an actions item with no label).
- Strings are never shortened. Clipped text is marked by the kit at runtime, not hidden.

**API.**

```ts
readScreen(screen: ScreenLike, registry, opts?: {
  depth?: "screen" | "component";      // default "screen"
  address?: string;                     // with depth "component"
  since?: ScreenLike;                   // print only what changed since this version
  values?: Record<string, unknown>;     // interaction state overlay, keyed by full address
  marks?: Record<string, string[]>;     // runtime marks per address (clipped, offscreen)
}): string;

readApp(app: { name: string; sections: SectionLike[]; screens: ScreenLike[] }): string;
// outline: one line per area, one line per screen title, no components
```

- **Deltas.** With `since`, a changed or new component is printed whole, a removed one as `- l2`, and an unchanged screen prints only its header line.
- **Budgets.** A typical screen (9 components with a 6-row list) reads in at most 300 tokens. An outline costs at most 15 tokens per screen. Both are checked in CI over every gallery fixture, with the tokenizer used for prompt budgets.

### 4.13 Model-facing tests

Everything a model reads or writes is tested with a real model, so entries, the prompt block, the reading format and the way components combine are tuned against real behaviour and not only validated against schemas. Each component, pack component and surface file declares `probes`, each archetype file declares `compose` probes, and each `pack.ts` declares `pack` probes:

```ts
export const probes = [
  { kind: "choose", need: "show my plants and let me tap one", expect: "List" },
  { kind: "choose", need: "the facts about one plant: room, water interval", expect: "KeyValue" },   // the nearest wrong choice
  { kind: "write",  brief: "three plants with their rooms, water due today", expect: "List" },
  { kind: "read",   screen: 0, task: "mark Fern as watered", expect: { address: "l1/r1/trail", action: "toggle" } },
];
```

| Probe | What the model gets | What is scored |
| --- | --- | --- |
| `choose` | The generated block (`buildBlock`) and a need written in the person's words | Whether it names the expected component. A confusion table shows which wrong component it picked, and so which `pick` line to reword |
| `write` | The component's entry and a brief | Whether the line it writes validates first time, which repairs it needed (alias, enum snap, clamp, missing field) and its output tokens |
| `compose` (archetype files) | The block for the scope, an archetype and layout, a brief and a cast, and the instruction to write the whole screen | Mechanical: the lines validate, `checkScreen` returns no issues, and the repair count. Content: the screen includes what the probe expects, avoids what it forbids, and has the expected primary action. Then a rubric (below) on the screen's compact read |
| `pack` (`pack.ts`) | `buildPackIndex()` and an idea in the person's words | Whether it names the expected packs (up to 3). One probe per pack is a near miss against the nearest pack named in its `pick` line |
| `read` | The `readScreen` text of an example (by index) and a task | Whether the `act` step it returns matches the expected address and action, validated with `validateActionValue`. This measures how clear and cheap the reading format is |

- **Composition probes.** A `compose` probe is `{ layout, brief, cast, expect: { include: ["Hero", "List"], exclude: ["Table"], primary: "Button" } }`. The mechanical score is the existing screen rules, so every `S.*` issue code from `checkScreen` is counted per archetype and per layout, which shows which rule models break most. The rubric is the same text-first pass the Critic uses (clarity, focus, flow, content, structure, 1 to 5), run by a model on the screen's compact `readScreen` text, with a gate of an average of at least 4.0 and none under 3.5. Visual craft needs screenshots and stays in the harness evals (`@lmthing/preview`).
- **Not tested here.** Composition across a whole app (which packs the Director picks for a real idea, the section and screen plan, flows, two-sided apps, big ideas) belongs to the harness bake-off and evals, because it needs the Director, the cast and the wave logic. The `pack` probes are the ui's share of that: they check that the pack index and `pick` lines are enough to choose from.
- **Gate at creation.** A component, pack component or surface is not done until `pnpm llm:check --component <Id>` passes live on every required model in `scripts/llm.config.ts` and its recordings are committed; `pnpm test` replays them. This applies from the first component, not from U3: the runner (choose and write) exists from U1. Views contain no literal user-facing text; empty and loading states use the shared `emptyLine` and `KitSkeleton`. How a file is written: `docs/component-guide.md`.
- **Declared per component.** `catalog:check` requires at least two `choose` probes (one of them a near miss that should pick the nearest wrong choice named in `pick`), one `write` probe, and a `read` probe for every component that has actions. Every `expect` must name a real id.
- **Pure logic in the catalog, calls injected.** `src/catalog/probes/` builds the prompts, scores replies and prints the confusion table. It takes a `callModel(prompt) => text` function and does no I/O. `scripts/llm-check.ts` supplies the models from `scripts/llm.config.ts` through the provider SDK (a dev dependency), and the harness bake-off supplies its own call and reuses the same probes and scoring.
- **Replay and live.** In CI the probes run in replay mode against recordings in `test/recordings/`, keyed by a hash of the model id, prompt and probe, so they are free and deterministic. Live mode (a key from the environment) refreshes the recordings, runs on every pull request that changes a component, pack, archetype or prompt entry, and runs nightly as well. Model names live in `scripts/llm.config.ts` only. The list defaults to a strong model and a lighter one, so a gap between them is visible, and any can be dropped. Cost is not a constraint here.
- **Gates (proposed, tuned in U3).** `choose` accuracy at least 90% overall and 70% for every component, `write` valid first time at least 90%, `read` at least 95%, `compose` with zero `checkScreen` issues after repair for at least 90% of probes and a rubric average of at least 4.0, `pack` accuracy at least 90%, and no probe set worse than the last accepted run. A failure prints the probe, the reply and, for `choose`, the component that won.
- **What a failure means.** Reword the `pick` line, add an alias, tighten a limit or shorten the entry, then re-run. If a stronger model passes where the small one fails, that is a data point for the bake-off, never a reason to cut the component.

### 4.14 Lines to screens: parse, component repairs, ids

So the ui can test models, check its worked examples and fill its gallery without the harness, the pure first steps of turning model text into a screen live here. The harness's validator calls them and adds everything that needs an app (stages R3 to R6, content checks against the cast, carry-over of ids on rewrite, ops).

```ts
parseLine(text): { line?: unknown; codes: string[] }                       // R1: strip fences, trailing commas, single quotes, close brackets, else drop
readComponent(line, registry, ctx: { cast }): { component?: Component; codes: string[] }   // R2: aliases, off-pack mapping, strip unknown fields, fill required from `fallback`, snap enums, icons and photo tags, clamp strings and arrays
stampIds(components): Component[]                                          // unique component ids, item ids `r1`, `r2` from counters
assembleScreen(lines, registry, ctx): { screen: ScreenLike; codes: string[] }   // parse, read, stamp, in order
```

- Repair codes are `R<stage>.<what>` (`R2.enum_snap List.trail`). Each repair is a pure function with a table of bad inputs as its test. `lines/codes.ts` is the one list of codes. Every bad line seen in a real run joins a table.
- `assembleScreen` is what `catalog:check` uses to validate each pack's `example.jsonl`, what the `compose` probes use to score a model's screen, and what the gallery uses to load JSON Lines fixtures.
- It stops at R2. It does not sort by region, demote primaries or drop extras (R3), and it does not know about apps, flows or waves. A host that wants those repairs adds them. The `compose` probes therefore count `checkScreen` issues before any R3 repair, which is stricter than the harness.

## 5. The kit entry (`@lmthing/ui/kit`)

### 5.1 Peer dependencies

`react`, `react-native`, `react-native-web` (for web hosts), `tamagui` and `@tamagui/core`, `react-native-reanimated`, `@tamagui/lucide-icons`, `react-native-svg`. Exact ranges are pinned at kickoff and recorded in `docs/dependencies.md`. The kit has no Expo dependency. Hosts load fonts and resolve photos.

### 5.2 Tamagui integration

The kit exports pieces. The host builds one Tamagui config from them, together with its own tokens and themes.

```ts
import { kitTokens, kitThemes, kitFonts, kitSprings, kitFontAssets } from "@lmthing/ui/kit/tamagui";

export default createTamagui({
  tokens: createTokens({ ...kitTokens, ...hostTokens }),   // host tokens must use their own prefix
  themes: { ...kitThemes, ...hostThemes },
  fonts: { ...kitFonts, ...hostFonts },
  animations: createAnimations(toDriverConfigs(kitSprings)),  // Reanimated driver on native, CSS on web
});
```

- `kitThemes` is generated by `scripts/build-themes.ts` from the catalog into `themes.generated.ts` (committed, checked for staleness in CI): 288 themes named `kit_<preset>_<mode>_<accent>`, colour roles only.
- **Fallback mode:** if 288 themes weigh down a host's web build, `build-themes --compact` emits 24 themes (preset by mode), and accents are applied as role overrides through `KitStyle`. Both modes expose the same API.
- `kitFontAssets` maps font family names to the bundled OFL files, for the host's font loader (`expo-font` in lmthing). Families: Inter (grotesk), Source Sans 3 (humanist), Nunito (rounded), Fraunces with Source Serif 4 (serif), Barlow Condensed (condensed numbers). These are proposals until the font question is settled. Swapping a family is one file.
- `kitSprings` exports the motion springs as plain configs, so hosts can drive their own worklets with the same values.

### 5.3 Provider and host interfaces

```tsx
<KitProvider
  theme={{ preset: "calm", accent: "moss", mode: "light" }}
  registry={catalogRegistry}          // from createRegistry, scoped to the app's packs
  parts={partRegistry}                // PartRegistry, default noop
  onLink={(goto, address) => {}}      // KitAction calls this. The kit never navigates
  resolvePhoto={(ref) => source}      // lib:<tag> and local:<n> to an image source
  reduceMotion={false}
  interactive={false}                 // false = presses are ignored (a stage), true = Try it style
  interaction={interactionStore}      // values people and agents change, keyed by address (5.9)
  agentMode={false}                   // true = no arrive, morph or signature animation, so acts settle at once
>
  <Screen screen={screenLike} onReport={(issues) => {}} />
</KitProvider>
```

```ts
// registry/types.ts
export type Rect = { x: number; y: number; width: number; height: number };
export interface PartRegistry {
  register(entry: { screen: string; rev: number; address: string; rect: Rect }): void;
  unregister(entry: { screen: string; rev: number; address: string }): void;
}
```

- `KitProvider` wraps its children in the Tamagui `Theme` for the app and provides `KitStyle` (corner shift, font pairing, density) from the preset.
- `registry/memory.ts` is an in-memory `PartRegistry` used by tests and the gallery. `registry/noop.ts` is the default.
- Rects are relative to the screen's content root (inside any scroll). The host adds scroll offset and its own projection.

### 5.4 Kit bases

Six bases carry every visual decision. Renderers compose them and never style from scratch.

| Base | Does | Variants and props |
| --- | --- | --- |
| `KitText` | All model text. Plain text only, never markup | `role` (type token), `tone` (`text`, `muted`, `accent`, `onAccent`, `good`, `warn`, `bad`), `maxLines`, `align` |
| `KitRow` | A horizontal item with leading, body and trailing slots | `density` from `KitStyle`, `pressable` |
| `KitCard` | A surface with radius, elevation and padding from the preset | `style` (`plain`, `tinted`, `outlined`, `media`, `inset`), `tone` |
| `KitIcon` | Curated Lucide icon by catalog name. Unknown names render the neutral dot | `name`, `size` (`sm`, `md`, `lg`), `tone` |
| `KitPhoto` | Image from `resolvePhoto`, with a tinted placeholder while loading | `ref`, `ratio` (`square`, `wide`, `tall`), `radius` |
| `KitAction` | Anything pressable. Calls `onLink` with its `goto` when `interactive` | `kind` (`primary`, `secondary`, `quiet`, `danger`), scales to 0.97 on press |

Private helpers: `KitTrail` (chevron, check, toggle, value, badge), `KitSkeleton` (loading state), `KitBadge`, `KitDivider`. No raw values anywhere: hex colours, pixel numbers and z-indexes appear only in token files.

A base is a Tamagui `styled` component. Fixed choices are variants, and anything that depends on the preset reads `KitStyle` through `useKitStyle()`:

```tsx
// kit/base/KitCard.tsx
const Frame = styled(YStack, {
  backgroundColor: "$surface",
  variants: {
    style: {
      plain:    {},
      tinted:   { backgroundColor: "$accentSoft" },
      outlined: { backgroundColor: "transparent", borderWidth: 1, borderColor: "$line" },
      media:    { padding: 0, overflow: "hidden" },
      inset:    { backgroundColor: "$raised" },
    },
    tone: { good: { backgroundColor: "$good" }, warn: { backgroundColor: "$warn" }, bad: { backgroundColor: "$bad" } },
  } as const,
});

export function KitCard({ style = "plain", tone, ...rest }: KitCardProps) {
  const ks = useKitStyle();
  return <Frame style={style} tone={tone} padding={ks.density.cardPad} borderRadius={shifted("$md", ks.radiusShift)} {...surfaceOf(ks.surface)} {...rest} />;
}
```

Every `$name` is a token or colour role. `shifted()` moves a radius token along its scale by the preset's `radiusShift`, and `surfaceOf()` returns the preset's surface treatment as token-based props.

### 5.4a Theming a single component

A view never styles itself. The look of one component is a choice among variants, and it changes in these places only:

| To change | Do this |
| --- | --- |
| Colour of a part | Use a role (`$accent`, `$muted`) or a `tone`. `tone` maps to a fixed table of role pairs, and the `low_contrast` render check covers each pair. A colour no role covers means a new role, added to every theme and contrast-checked. Never a per-component colour |
| Size or spacing | Use a shared token. A number only one component needs goes in `tokens/component.ts`, named by the component (`Ring.stroke`) |
| Look across every theme | Add or change a variant on the base (`style`, `kind`, `role`, `size`). It needs gallery screenshots in 3 presets, light and dark |
| Look that differs by preset | Add a field to `KitStyle` and fill it in `kitStyleOf` for each preset, then read it with `useKitStyle()`. A view never compares a preset's name, and lint rejects it. A new `KitStyle` field is a minor catalog version |
| A new look for one component only | A new value of that component's `style` prop, which is a Tamagui variant of the same name on the base. It goes in the catalog schema and the prompt entry, so the model can choose it |

Tamagui sub-themes are not used for components in the kit. They stay in THING's own studio interface, for the tier tints.

### 5.5 Views

A component's view is the plain React function at the bottom of its file (the template in 4.4).

- **Typed from the file.** `Props<typeof props, typeof meta>` is the schema's output plus the `id` the validator stamps on each item. A wrong prop, or a prop outside the schema, is a type error.
- **Parts by prop.** `part="title"` stamps an element with its address. `<KitRow item={row.id}>` puts the item id in context for the parts inside it, so the bases know the screen, component and item. A stamped element gets `testID` (the full address) and the part's accessibility props (5.9). On layout, it measures itself relative to the screen root (`measureLayout`), batched per frame, and calls `PartRegistry.register` with its address (`screen/component[/item]/part`). Unmount unregisters.
- **Pure.** Views read props, the state name, the theme and `KitStyle`. They hold no state, timers or fetches. Links are data passed to `KitAction`. Interactive values come from `value(part)`, which returns the interaction store's value or the prop, and every input goes through the dispatcher (5.9).
- **Every declared state drawn:** `filled` (default), `empty` (copy from the component's empty fallback), `loading` (`KitSkeleton` in the component's shape), `success` (the success treatment and, where the component has one, its signature end state), `error` (tone `bad` and a short line).
- **The map.** `entry/renderers.ts` maps each id to its view (the export named by the id in PascalCase). It is generated from the `components/`, `packs/` and `surfaces/` folders, so adding a file is enough. Draft files are skipped, and a `ready` file without a view fails the conformance test.

### 5.6 Screen

`PhoneScreen` is the one component a host mounts to show a screen from plain values: `{ screen, theme, packs, tabs, cast, onLink, onReport, interactive, reduceMotion, parts, resolvePhoto }`. It builds the registry (`createRegistry({ packs })`, memoised), wraps `KitProvider` and renders `Screen`. It knows nothing about specs or protocols, so both the app's stage and the harness's preview use it with the props the protocol's `screenView` selector returns.

`Screen` draws one `ScreenLike`.

1. Sort components by region (`sortByRegion`). Top is pinned, the body is one scrolling column with a 20 point gutter, and the bottom holds the primary action then the tab bar.
2. Apply the rhythm table between body components. There is no spacing prop.
3. Key every component by its id. Look up its renderer from the registry, resolving aliases. An unknown id renders nothing and reports `unknown_component`.
4. Motion follows the table below.
5. The tab bar is drawn from a host-supplied list of tabs (`tabs` prop). The model never writes it.

**Motion rules** (fixed):

| Moment | Motion | Token |
| --- | --- | --- |
| A component's line arrives | Fades in and rises 8 points, 40 ms stagger, capped at 6 items | `gentle` |
| Same id changes | Morphs in place, height springs, others stay still | `snappy` |
| Removed | Fades and collapses | `fast` |
| Press | Scales to 0.97 and back | `snappy` |
| Next screen in a flow | Slides forward. A sheet rises | `base`, `gentle` |
| Numbers on first reveal | Count up once | `slow` |
| Signature moment | Plays once at the reveal and on its flow step | Hand-tuned |
| Reduce motion on | Cross-fades only, camera flights become cuts, signatures show their end state | `fast` |

Only transform and opacity animate, plus the height of a morphing component. Nothing loops at rest. Interface springs are registered as Tamagui animations (Reanimated driver on native, CSS driver on web) and exported as plain configs for stage worklets, so both match.

Only transform and opacity animate, plus the height of a morphing component. Nothing loops at rest. Interface springs are registered as Tamagui animations and exported as plain configs (`kitSprings`, 5.2).

### 5.7 Archetypes, surfaces and signatures

- **Archetype defaults:** `defaultLines(archetype, layout, cast)` returns the finished default screen for an archetype, built from catalog defaults and fallbacks. Hosts show it while a screen is being written.
- **Surfaces:** `LockScreen`, `Widget` and `Message` draw outside-the-app moments from their catalog props, in the app's theme, with an app name and icon passed by the host.
- **Signatures:** one hook per signature (`ring_fill`, `bars_grow`, `check_burst`, `count_up`, `calendar_sweep`, `timer_spin`, `card_swipe`, `day_unfold`, `streak_flame`, `route_draw`). Each plays once when its component receives a `cue` prop from the host, and shows its end state otherwise. Each is hand-tuned in the gallery against the reference mock.

### 5.8 Render reports

`Screen` reports issues through `onReport(issues)` once layout settles: 150 ms after the last layout event, at most 300 ms after mount.

| Code | Detected by |
| --- | --- |
| `clipped_text` | `KitText` with `maxLines`: on native, `onTextLayout` returns more lines than allowed; on web, the measured height exceeds `maxLines × lineHeight` |
| `overflow` | A component wider than the column, or taller than its declared maximum height |
| `empty_section` | A `SectionTitle` with no visible content before the next title or the end |
| `low_contrast` | A tone and role pair resolving below the contrast rule in the current theme (a runtime guard; the build check should make it rare) |
| `unknown_component` | An id the registry cannot resolve |

Each issue carries the part address. Hosts decide what to do (lmthing feeds them to its R5 repair step).

### 5.9 Reading and acting: the kit side

One rule shapes everything here: an agent action runs exactly the code a human touch runs. Agents that know the API use `read` and `act`. Agents that do not (browser agents clicking through the accessibility tree) get a clean accessibility tree with stable ids.

**Addresses on elements.** Every part's element carries `testID` set to its full address (`home/l1/r1/title`). React Native Web renders it as `data-testid`, so Playwright and browser agents can target any part, and Maestro uses the same ids on phones. Addresses never contain generated or random parts.

**Accessibility tree.** Built in `interact/a11y.ts` and applied through the `part` and `item` props:

- Every interactive part has a role (`button`, `link` when it has a `goto`, `checkbox`, `switch`, `tab`, `adjustable`, `search`), a label from its visible text, and its state (`checked`, `selected`, `disabled`, current value).
- Headers are `header`, lists are `list` and `listitem`, photos are `img` labelled by caption or tag.
- Decorative elements (an icon beside a label, backgrounds, dividers) are hidden from the tree. Chart drawings (`Bars`, `Sparkline`, `Ring`) are hidden and replaced by a label holding their values, so no SVG path data reaches an agent.
- The element that carries the role receives the press, never a wrapper. Touch targets are at least 44 points.
- Adjustable controls (`Counter`, slider fields, `Scale`) declare the increment and decrement accessibility actions, handled by the dispatcher.

**Interaction state.** What people and agents change in an interactive screen (toggles, ticks, typed text, selections, counters, swipes, timers) lives in an interaction store keyed by full address. Renderers stay pure and read it through `value(part)`.

```ts
export type InteractionStore = {
  get(address: string): unknown;
  set(address: string, value: unknown): void;
  reset(screen?: string): void;
  snapshot(screen?: string): Record<string, unknown>;
  subscribe(listener: () => void): () => void;
};
export function createInteractionStore(initial?: Record<string, unknown>): InteractionStore;
```

The default store lives in memory. Hosts decide whether to keep it (lmthing never keeps a share link's state).

**Action registry and dispatcher.**

- When an interactive part mounts, it registers `{ screen, rev, address, actions, enabled }` in the action registry, next to its part registry entry. Unmount unregisters.
- `dispatch(address, action, value?)` looks the part up, validates the value with `validateActionValue`, then applies the effect: state changes go to the interaction store; `press` on a part with a `goto` calls `onLink(goto, address)`; `swipe`, `start` and `stop` update the store, and the renderer animates from it.
- Human input goes through the same call. `KitAction`, the kit's text input, switch, slider and swipe handlers call `dispatch` and never set state themselves. A lint rule forbids `onPress` and `onChange` props in `components/` and `packs/` except on kit bases.
- With `interactive={false}` (a stage), handlers are not attached and `dispatch` refuses with `not_interactive`.

**Agent access.**

```ts
const agent = createAgentAccess({ registry, store, dispatcher, current: () => screenLike, scrollTo });

agent.read(opts?: { depth?: "screen" | "component"; address?: string; sinceRev?: number }): string;
agent.act(step: ActStep | ActStep[]): Promise<ActResult>;
agent.log(): ActLogEntry[];
agent.reset(): void;

type ActStep = { address: string; action: ActionName | ScreenAction; value?: unknown; expectRev?: number };
type ActResult =
  | { ok: true; screen: string; rev: number; changed: string }   // compact read of what changed, or the new screen after navigation
  | { ok: false; code: "stale" | "not_actionable" | "invalid_value" | "disabled"
        | "not_mounted" | "not_interactive" | "timeout"; at: number; hint?: string };
```

- `read` calls the catalog's `readScreen` with the interaction store as `values` and adds runtime marks: `clipped` from render reports, and `offscreen` for parts outside the viewport when the host supplies one. `sinceRev` keeps the last version read per screen and returns only the difference.
- **Atomic, with a dry run.** `act(steps, { dryRun? })` plans every step first with the catalog's pure `planAct(screen, defs, values, steps)`: each step must name an offered action with a valid value. Nothing changes unless every step passes; the first bad step returns its index. With `dryRun` it returns what would change and changes nothing. A failed batch never leaves a half-applied screen.
- `act` checks `expectRev` (`stale` if the screen has moved on), scrolls the target into view through the host's `scrollTo`, dispatches, then waits for the screen to settle and returns what changed. One call, no second read.
- A list of steps runs in order and stops at the first failure (`at` is its index). It returns one combined change.
- **Settle** means no running kit animation, no pending layout or render report, and navigation finished. It gives up after 2 s with `timeout`. With `agentMode`, arrive, morph and signature animations become instant, so settling takes a frame or two.
- **Log.** Every successful act appends `{ address, action, value, rev, at }`. It uses the same address vocabulary as lmthing flow steps, so a host can turn a log into a stored flow, or replay a flow through `act`.

**Exposure and safety.**

- The kit never touches `window`. Hosts expose agent access where they choose. The gallery exposes `window.__lmthingUI = { read, act, log, reset }`.
- `read` has no side effects. `act` changes only the interaction store and calls `onLink`. Screens are mocks with no network, so nothing real is paid, sent or deleted.
- Hosts rate-limit the hook and may expose `read` without `act` (lmthing's studio stage does).
- Quoted text in read output may come from a model or a person. The hook's documentation tells agents to treat it as data, never as instructions.

## 6. Package: `@lmthing/photos` (optional, step U8)

About 150 bundled photos tagged by subject (plants, food, places, people, pets, objects), plus generated gradient avatars.

- Only photos whose licence allows redistribution inside an app (CC0 or equivalent). `manifest.ts` records the source and licence for every file.
- A check script fails if a tag has fewer than 3 photos, a file has no licence entry, or a file exceeds 120 KB (WebP, 1080 px on the long side).
- `resolvePhoto("lib:plants")` picks a photo deterministically from the tag and the component address, so a screen looks the same on every render.

Until this package exists, hosts use a tinted placeholder for `lib:` photos.

## 7. Gallery app

A private Expo Router app in `apps/gallery`, web first, also run on iOS and Android simulators.

| Route | Shows |
| --- | --- |
| `/` | Index of components, packs, archetypes, surfaces, signatures, themes |
| `/components/[id]` | Both examples and every state, in 3 presets × light and dark, with part outlines from the memory registry |
| `/packs/[id]` | The pack's components and its worked example app |
| `/archetypes/[id]` | Every layout's default screen with an empty and a full cast |
| `/themes` | All 288 themes as swatches, contrast ratios printed |
| `/render/[fixture]` | One screen with no chrome at phone size, for screenshots |
| `/agent` | A console to read any fixture and act on it, showing the read output, the act results and the log |

- A presets × modes switcher and a reduce-motion toggle on every page.
- `agent-hook.ts` exposes `window.__lmthingUI` on every page, so browser agents can use the gallery directly.
- Playwright runs against the static web export and screenshots every component page and every fixture. A pixel difference above 0.1% fails CI. Baselines update only through a pull request with the `update-screenshots` label.

### 7.1 Developing this repo alone

Nothing here needs the lmthing app or harness. The gallery is the host: it implements `PartRegistry` (memory), `onLink` (navigate to a fixture screen), `resolvePhoto` (a tinted placeholder) and the agent hook, with fixtures and casts of its own. The only outside service is a model provider, used by the probes, and replay mode needs none.

| Command | Does |
| --- | --- |
| `pnpm dev` | Runs the gallery (web) |
| `pnpm test` | Catalog (Vitest) and kit (Jest) tests |
| `pnpm catalog:check` | The 14 checks of 4.10 |
| `pnpm llm:check` | The model probes, live (`--replay` for recordings) |
| `pnpm build` | Both entries, and the catalog bundle check |

## 8. Testing

| Layer | Tool | Covers |
| --- | --- | --- |
| Catalog unit | Vitest | Schemas, examples, fallbacks, screen rules, alias scope, lookups, address property tests, migrations |
| Prompt snapshots | Vitest | Every block and the pack index |
| Contrast | Script | All 288 themes |
| Type tests | `expect-type` in Vitest | `Props<typeof props, typeof meta>` inference, the validator-stamped item ids, a prop outside the schema rejected |
| Look | `pnpm look --component <Id>` (Playwright on system Chrome) | Phone screens at 320/390/430 in every preset and mode. Automated checks: clipping, overflow, overlap, text and graphic contrast, faint loading, cramped text, awkward wraps, small text, touch targets, alignment, rhythm, console errors. At 390 it also writes a Set-of-Mark screenshot: every actionable part and item row stamped with its address, so reviewers and models name exact parts |
| Reading and acting | Vitest, every ready component and example | Visible text and read text match; every offered action exists at its address with a role that accepts it |
| Model probes | Vitest in replay mode, `scripts/llm-check.ts` live | `choose`, `write` and `read` probes for every component, `compose` probes for every archetype layout and `pack` probes for every pack, against a small model, with a confusion table and the gates in 4.13 |
| Catalog bundle | `scripts/bundle-check.ts` | The built catalog has no React, React Native or Tamagui and builds a registry in plain Node |
| Kit conformance | Jest with `jest-expo` and React Native Testing Library | For every `ready` component file: a view exists, both examples render in every declared state, every declared part and item part registers with the memory registry |
| Kit unit | Same | Bases, `Screen` ordering and rhythm, morph keys, report detection with fixtures that contain known faults |
| Readers | Vitest | Read output of every example in every state (snapshots), deltas, quoting and escaping, token budgets |
| Actions | Vitest | The vocabulary per component, value validation tables, `catalog:check` action rules |
| Kit interaction | Jest with React Native Testing Library | For every declared action of every `ready` component: `act` with example values changes the read output as declared, and a simulated human press or input produces the identical change and log |
| Agent end to end | Playwright on the gallery | Fixtures driven through `window.__lmthingUI.act` and through the accessibility tree (`getByRole`) reach the same read output. `stale`, `invalid_value` and `not_interactive` paths |
| Accessibility | Playwright with axe-core | No violations. Every interactive part has a role and a label. No chart path data in the accessibility tree |
| Visual | Playwright on the gallery web export | Screenshots, section 7 |
| Performance | Script on reference devices before each release | Mount time and frame rate, section 9 |

## 9. Budgets

Targets until measured on the reference phones (a mid-range Android and an iPhone about three years old).

| What | Budget |
| --- | --- |
| Mount a 9-component screen | Under 30 ms on the Android reference phone |
| Morph one component | 60 fps, under 5% dropped frames |
| Part registration after layout | Under 1 frame per screen, batched |
| Report after the last layout | 150 ms typical, 300 ms at most |
| Kit plus themes in a web build | Under 250 KB compressed (288 themes); compact mode if over |
| Catalog import in Node | Under 50 ms, no top-level work |
| Read a typical screen | Tracked, aiming at about 300 tokens and under 5 ms |
| Read an app outline | Tracked, aiming at about 15 tokens per screen |
| Act to settled result, agent mode, web | Under 100 ms, or 300 ms when it navigates |

## 10. Tooling

- **pnpm** workspace, Node LTS pinned in `.nvmrc` and `packageManager`.
- **TypeScript** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **ESLint** flat config:
  - `max-lines` and `max-lines-per-function` at the repo-wide limits
  - `import/no-default-export`, except in gallery route files
  - boundaries, enforced with `no-restricted-imports` and `eslint-plugin-boundaries`:
    - `src/catalog` imports nothing but `zod` and itself; `node:*` only in `scripts/`
    - `src/kit` imports `src/catalog` and its peer dependencies only
    - `src/components`, `src/packs` and `src/surfaces` import `src/catalog`, `src/kit` and peers
    - nothing imports from `apps/`
  - no hex colours or pixel numbers outside token files: a custom rule
  - no comparison with a preset or accent name in `src/components`, `src/packs`, `src/surfaces` or `src/kit`: look differs by preset only through `KitStyle`
- **Prettier** with defaults.
- **Build:** `tsup` builds two entries into `dist/`. The `kit` entry gets ESM, type declarations and a `source` condition pointing at `src/entry/kit.ts`, so hosts in the same workspace (lmthing) compile the TypeScript directly through TypeScript `customConditions` and Metro `unstable_conditionNames`. The `catalog` entry is always built, with the stubs described in section 3, and has no `source` condition, so the harness never loads component source. During development `pnpm build:catalog --watch` keeps it current. Published consumers get `dist/`.
- **Changesets** for versions and changelogs. There is one version for `@lmthing/ui`.

## 11. Continuous integration

`ci.yml` on every pull request, all steps required:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test` (catalog and kit)
5. `pnpm catalog:check` (including contrast, token budgets and the catalog bundle check)
6. `pnpm kit:themes --check`: the generated themes are up to date
7. `pnpm build`
8. Model probes: live on pull requests that change a component, pack, archetype or prompt entry, replay otherwise (needs a provider key in the repository secrets)
9. Gallery web export and Playwright screenshots (artifacts uploaded)
10. A size report for the kit and themes in a web build

`release.yml` publishes tagged versions with Changesets. It stays disabled until the registry question in section 14 is settled.

## 12. Using it from lmthing

- Submodule path `packages/ui` in the app repo, URL `https://github.com/lmthing/ui.git`. The workspace globs, the submodule workflow and what the app keeps (shell, stage, Try it, `tamagui.config.ts`, the agent hook) are in the app spec (Codebase layout, Agents reading and acting).
- The app implements the host interfaces in 5.3: the stage is the `PartRegistry`, Try it passes the `onLink` that navigates, and the photo resolver maps `local:n` from its own storage and `lib:` to `@lmthing/photos`.
- A minor or major catalog bump also needs lmthing's pairwise eval to pass before the pointer moves.

## 13. Implementation steps

Each step ends at its gate. The mapping to lmthing phases shows when lmthing needs each step.

| Step | Builds | Gate | lmthing needs it for |
| --- | --- | --- | --- |
| **U0. Bootstrap**, 0.5 week | Workspace, TypeScript, ESLint with boundaries and size rules, Prettier, Vitest, Jest, Changesets, `ci.yml`, the empty package with its two entries, entry generation and the catalog bundle check, the gallery skeleton | CI green. A test fixture proves lint rejects a React import under `src/catalog` and a 201-line file, and the bundle check fails on a fixture catalog that imports React | Phase 0 |
| **U1. Catalog foundations**, 1 week | `Meta` types and `Props`, prop helpers, types, tokens, draft presets and accents, theme names, `KitStyle` data, address grammar, screen rules, registry with alias scope, lookups, `lines/` (parse, component repairs, `assembleScreen`), the action vocabulary and value validation, the default reader, `readScreen` and `readApp`, `check.ts` and `contrast.ts`, the data half of the first six component files (`Header`, `Hero`, `List`, `Button`, `Ring`, `Checklist`, marked `draft` until U2 adds their views) and the `home` archetype | `catalog:check` green for what exists. Contrast results for all 288 themes listed (draft values may still fail). Address property tests pass. The six components read within budget, and their actions validate | Phase 0: the protocol and the Ledge fixture |
| **U2. Kit foundations**, 1 to 1.5 weeks | Tamagui tokens, fonts, springs, generated themes, `KitProvider`, `KitStyle`, the six bases and helpers, the `part` and `item` props and their context, parts and registries, `testID`s and accessibility props, the interaction store, action registry, dispatcher and agent access with settle and agent mode, the six views (added to the six component files, now `ready`), the generated renderer map, `Screen` with regions, rhythm, arrive and morph, `defaultLines` for `home`, gallery skeleton, conformance test, a 288-theme load test | The gallery shows the six components in 3 presets, light and dark, on web, iOS and Android. Conformance passes. The web size of kit plus themes is measured. In the gallery, every action on the six components works through `window.__lmthingUI.act` and through the accessibility tree with identical results, and axe-core reports no violations | Phase 0: the app replays the Ledge fixture |
| **U3. Prompt entries for everything**, 1 week | Draft definitions (`status: "draft"`) for every remaining core component and every pack component and archetype: purpose, pick, schema with limits, parts, states, actions, aliases, tier, `realPath`, fallback, two examples, and a reader override where needed. `buildEntry`, `buildBlock`, `buildPackIndex`, token counting, prompt snapshots, `probes` for every draft, the probe runner and a first live run on a small model | Token budgets hold. The probe gates in 4.13 hold or the failures are listed with a plan. Every draft passes `catalog:check` except the renderer rule. lmthing's bake-off builds real prompts from `createRegistry({ includeDrafts: true })` | Phase 0: the 100-idea bake-off |
| **U4. First 24 of the core**, 2 weeks (sequencing only: all 40 ship by the end of U6) | Final definitions and renderers for the first 24: `Header`, `SectionTitle`, `Steps`, `TabBar`, `Hero`, `Card`, `List`, `KeyValue`, `Note`, `Photo`, `Gallery`, `Profile`, `Banner`, `Empty`, `Field`, `Chips`, `Segmented`, `Checklist`, `Search`, `Button`, `Actions`, `Success`, `Stats`, `Ring`. Every state. The core archetypes whose recipes use only these | All 24 `ready`, conformance, interaction and screenshot tests pass, ten hand-written screens across very different apps validate with zero issues and look finished in every preset | Phase 1 |
| **U5. Booking and customers packs**, 1 week | Both packs complete: components, renderers, archetypes, worked examples (Trot) | Both packs `ready`, Trot's worked example renders without issues in 3 presets | Phase 1: Trot |
| **U6. Rest of the core**, 1.5 weeks | `Scale`, `Bars`, `Sparkline`, `Timeline`, `Calendar`, `Counter`, `Timer`, `Camera`, `MapPins`, `Bubbles`, `People`, `SwipeStack`, `DayTimeline`, `Streak`, `Route`, `Canvas`. The three surfaces. All ten signatures, hand-tuned. Render reports. Every core archetype | All 40 core `ready`, with every action passing the interaction and agent end-to-end tests. Signatures judged against the reference mock on a real phone. Report fixtures with known faults produce exactly the expected issues | Phase 1 end, Phase 2 (render reports, R5) |
| **U7. Remaining packs**, ongoing | `commerce`, `data`, `social`, `content`, `learning`, `money`, `places`, `team`, in the order lmthing's off-pack codes and `Canvas` misses ask for | Each pack `ready` with its worked example before it enters live prompts | Phases 3 and 4, then ongoing |
| **U8. Release readiness**, 1 week, when a second consumer appears | `dist` builds verified in a blank Expo app and a blank web app (both entries), `@lmthing/photos`, a README with the public API, licence, `release.yml` enabled, first tagged release | A blank project installs the package from the registry and renders a screen with no lmthing code | Another project |

U0 to U3 together take about 3.5 to 4 weeks for one developer and run alongside lmthing Phase 0. With one person building lmthing and this repo, those weeks add to lmthing's estimate.

## 14. Open questions, with the default to build

- [ ] **Licence?** Default: private and unlicensed until a second consumer is decided. Then choose between a permissive open-source licence and staying private.
- [ ] **Registry?** Default: none yet (submodule only). When needed, GitHub Packages under `@lmthing` if private, npm if open source.
- [ ] **Photo source?** Default: CC0 or equivalent only, recorded per file. No image model.
- [ ] **Accent and preset colour values?** Default: designed in U1 against the reference mock, each combination passing contrast.
- [ ] **Font families?** Default: the families in 5.2, all SIL Open Font License.
- [ ] **Gallery tool?** Default: a plain Expo Router app (fewer dependencies than Storybook, and the same renderer path as lmthing).
- [ ] **Compact themes from the start?** Default: no. 288 themes unless the U2 size measurement exceeds the budget.
- [ ] **Should tiers and `realPath` stay required for every consumer?** Default: yes. They are cheap and say what a part depends on.
- [ ] **Name of the agent hook?** Default: `window.__lmthingUI`, with `read`, `act`, `log` and `reset`.
- [ ] **Should share-link visitors' agents be able to act?** Default: yes, in Try it mode, with state never kept and notes going through the host's note path.
- [ ] **Agent mode on by default for agents?** Default: hosts turn it on whenever the hook is used, and off when a person touches the screen.
