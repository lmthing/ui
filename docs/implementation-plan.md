# lmthing/ui: technical implementation plan

This repository holds the component system: the **catalog** (every token, theme, component, pack, archetype and rule, written as data) and the **kit** (the Tamagui renderers that draw it). lmthing loads it as a git submodule at `packages/ui`. Other projects can use it later as a git submodule or as published packages.

The product context lives in the lmthing build spec (`docs/spec.md` in the lmthing repo). This plan covers only what is built here, how it is built, and how it is consumed. Where the two disagree on something inside this repo, this plan wins.

## 1. Scope

| In this repo | Not in this repo |
| --- | --- |
| Design tokens, 12 presets, 12 accents, theme generation and contrast checks | THING's own studio interface (shell tokens, shell primitives) |
| The `define*` API for components, packs, archetypes, surfaces and signatures | Prompts for model roles, the agent, model routing |
| All core and pack component definitions, archetypes, surfaces, signatures | The op/message protocol, `fold()`, the full app `Spec` type |
| Screen rules (regions, rhythm, weight, limits, neighbours, placeholders) | Repairs (the agent's validation ladder uses data exported here) |
| The part address grammar and component-level types | The stage, camera, gestures, hit testing |
| Prompt entry generation for the catalog (one compact line per component) | Voice, sessions, storage |
| Kit renderers, kit bases, screen layout, morphing, states, surfaces, signature motion | Navigation. Links are emitted as data through a callback |
| Render issue detection (`clipped_text`, `overflow`, `empty_section`, `low_contrast`) | Deciding what to do about an issue |
| Reading and acting for agents: a compact text form of every screen, a typed action vocabulary, one dispatcher for human and agent input | Exposing it to agents (a `window` hook, where acting is allowed). Hosts decide |
| A gallery app for development, review and screenshot tests | |

**Consumers.**

- The lmthing **agent** imports `@lmthing/catalog` only, with no React in its dependency tree.
- The lmthing **app** imports `@lmthing/catalog` and `@lmthing/kit`.
- **Future projects** import either package and supply their own host (theme choice, link handling, photo resolution, part registry).
- **Agents** (browser agents, test runners, lmthing's Critic and evals) read screens as compact text and act on them by address, through the host's hook (sections 4.12 and 5.9).

## 2. Principles

1. **Data first.** Every component is defined once as data. The prompt line, the Zod schema, the default content and the kit prop types all come from that one definition, so they cannot drift.
2. **No free values.** Nothing the catalog accepts carries a colour, size, spacing, layout or motion value. Look comes from tokens, presets and fixed tables.
3. **One renderer per id.** Each catalog id has exactly one kit renderer, in a file named after the id. A missing renderer fails a test. A renderer for an unknown id does not compile.
4. **Host owns the world.** The kit never navigates, fetches, stores or measures the stage. It reports through interfaces the host implements (links, photos, part registry, render issues).
5. **Peer dependencies, not bundled ones.** React, React Native, Tamagui, Reanimated and Lucide icons are peer dependencies, so the host picks the versions.
6. **Small files.** At most 200 lines per file and 60 per function, enforced by lint. Plain functions and plain data, named exports, no classes.
7. **Agents read and act like people.** Every screen has a compact text form generated from the same data it is drawn from, and every part that people can touch has typed actions. An agent action runs exactly the code a human touch runs. Agents never need raw DOM or screenshots.
8. **Generic where it costs nothing.** Nothing here mentions THING, takes, trailers or sessions. Tiers and `realPath` are required on every component because any app generator needs to know what a part depends on. Signature metadata is optional.

## 3. Repository layout

One pnpm workspace with two published packages, one optional asset package and one private app.

```text
ui/
├─ package.json                 workspace root (private): shared scripts, dev tooling
├─ pnpm-workspace.yaml          packages/*, apps/*
├─ tsconfig.base.json           strict, ES2022, moduleResolution bundler, customConditions ["source"]
├─ eslint.config.js             size limits, import boundaries, no default exports
├─ .changeset/                  versioning and changelogs
├─ .github/workflows/
│  ├─ ci.yml                    every pull request
│  └─ release.yml               tagged releases (disabled until a registry is chosen)
├─ docs/
│  ├─ implementation-plan.md    this document
│  ├─ decisions/                one numbered page per decision
│  └─ dependencies.md           every dependency, why, what was considered
├─ packages/
│  ├─ catalog/                  @lmthing/catalog: data, schemas, rules, prompt entries. Depends on zod only
│  │  ├─ src/
│  │  │  ├─ define/             component.ts, pack.ts, archetype.ts, surface.ts, signature.ts
│  │  │  ├─ props/              text.ts, icon.ts, photo.ts, screen-id.ts, tone.ts, index.ts
│  │  │  ├─ tokens/             space.ts, size.ts, radius.ts, type.ts, elevation.ts, motion.ts, roles.ts
│  │  │  ├─ themes/             presets/ (12 files), accents.ts, theme-name.ts, kit-style.ts
│  │  │  ├─ components/         one file per core component (header.ts … canvas.ts)
│  │  │  ├─ packs/              one folder per pack: pack.ts, components/, archetypes/, example.jsonl
│  │  │  ├─ archetypes/         one file per core archetype (home.ts … chat.ts)
│  │  │  ├─ surfaces/           lock-screen.ts, widget.ts, message.ts
│  │  │  ├─ signatures.ts       signature ids and the component each lives on
│  │  │  ├─ rules/              regions.ts, rhythm.ts, weight.ts, limits.ts, neighbours.ts, placeholders.ts, check-screen.ts
│  │  │  ├─ address/            grammar.ts, parse.ts, format.ts, climb.ts
│  │  │  ├─ types/              component.ts, screen.ts, cast.ts, tier.ts, issue.ts, action.ts
│  │  │  ├─ lookup/             aliases.ts, nearest-icon.ts, nearest-tag.ts, clamp.ts
│  │  │  ├─ prompt/             entry.ts, block.ts, pack-index.ts
│  │  │  ├─ agent/              actions.ts (vocabulary), validate-value.ts, default-reader.ts,
│  │  │  │                      read-screen.ts, read-app.ts, format.ts, diff.ts
│  │  │  ├─ registry/           create-registry.ts, scope.ts
│  │  │  ├─ icons.ts            the curated icon names
│  │  │  ├─ photos.ts           the photo library tags
│  │  │  ├─ migrations/         index.ts, one file per major version
│  │  │  ├─ version.ts
│  │  │  └─ index.ts
│  │  ├─ scripts/               check.ts, contrast.ts, build-prompt.ts, count-tokens.ts
│  │  └─ test/                  shared fixtures (casts, screens)
│  ├─ kit/                      @lmthing/kit: Tamagui renderers. Depends on @lmthing/catalog
│  │  ├─ src/
│  │  │  ├─ provider/           KitProvider.tsx, context.ts, useKit.ts
│  │  │  ├─ tamagui/            tokens.ts, fonts.ts, animations.ts, themes.generated.ts, theme-name.ts, index.ts
│  │  │  ├─ base/               KitText.tsx, KitRow.tsx, KitCard.tsx, KitIcon.tsx, KitPhoto.tsx, KitAction.tsx,
│  │  │  │                      helpers/ (KitTrail, KitSkeleton, KitBadge, KitDivider)
│  │  │  ├─ define/             defineRenderer.ts, parts.ts, renderers.ts (the id to renderer map)
│  │  │  ├─ components/         one renderer per core id, named by id (list.tsx)
│  │  │  ├─ packs/              one folder per pack, one renderer per pack id
│  │  │  ├─ archetypes/         default-lines.ts, one layout file per archetype
│  │  │  ├─ surfaces/           LockScreen.tsx, Widget.tsx, Message.tsx
│  │  │  ├─ signature/          one hook per signature (useRingFill.ts …), useSignature.ts
│  │  │  ├─ screen/             Screen.tsx, regions.ts, rhythm.ts, Morph.tsx, Arrive.tsx
│  │  │  ├─ report/             clipped-text.ts, overflow.ts, empty-section.ts, low-contrast.ts, useReport.ts
│  │  │  ├─ registry/           types.ts (PartRegistry), noop.ts, memory.ts
│  │  │  ├─ interact/           dispatcher.ts, action-registry.ts, interaction-store.ts, settle.ts,
│  │  │  │                      agent-access.ts, a11y.ts
│  │  │  └─ index.ts
│  │  ├─ scripts/               build-themes.ts
│  │  ├─ assets/fonts/          OFL font files
│  │  └─ test/                  conformance.test.tsx, setup.ts
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

**Dependency direction.** `catalog` → `kit` → `gallery`. `photos` stands alone. `catalog` imports only `zod`. `kit` imports `catalog` and its peer dependencies. Nothing imports from `apps/`.

## 4. Package: `@lmthing/catalog`

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

### 4.2 The `define*` API

```ts
export function defineComponent<P extends z.ZodObject<any>>(def: {
  id: string;                                 // snake_case, unique across core and packs
  group: "structure" | "content" | "data" | "input" | "action" | "beyond" | "signature" | "escape";
  purpose: string;                            // 16 words or fewer
  pick: string;                               // when to choose it, and the nearest wrong choice
  region: "top" | "body" | "bottom";
  weight: 1 | 2 | 3;
  tier: Tier;
  realPath: string;                           // one sentence: how a real app would build this
  props: P;                                   // every string has a limit, every array a maximum
  parts: readonly string[];                   // addressable parts of the component
  items?: { key: string; prefix: string; parts: readonly string[] };
  states: readonly StateName[];
  actions: ActionSpec;                        // {} when nothing can be touched
  read?: (props: z.output<P>, state: StateName) => string[];   // override of the generated reader
  aliases: readonly string[];
  fallback: (ctx: { cast: CastLike }) => z.input<P>;
  examples: readonly [z.input<P>, z.input<P>, ...z.input<P>[]];
  signature?: SignatureId;
  status?: "draft" | "ready";                 // draft = defined, no renderer yet. Default "ready"
}): ComponentDef<P>;

export function definePack(def: {
  id: string; name: string;
  purpose: string; pick: string;              // pick names the nearest other pack
  components: readonly ComponentDef[];
  archetypes: readonly ArchetypeDef[];        // at least 2
  example: string;                            // path to a worked example app as JSON Lines
}): PackDef;

export function defineArchetype(def: {
  id: string; job: string;
  layouts: Record<string, { recipe: Slot[]; defaults: Component[] }>;
  defaultLayout: string;
}): ArchetypeDef;
type Slot = { allow: ComponentId[]; required: boolean; min?: number; max?: number };

export function defineSurface(def: {
  id: "lock_screen" | "widget" | "message" | string;
  tier: Tier; realPath: string; props: z.ZodObject<any>; parts: readonly string[];
}): SurfaceDef;
```

`define*` functions are identity functions with types. All checks run in `scripts/check.ts`, never at import time, so importing the catalog stays cheap.

**Shared prop helpers** (`props/`): `text(max)` (trimmed string with a limit), `icon` (enum of curated names), `photo` (`lib:<tag>` or `local:<n>`, never a URL), `screenId` (slug or `back`), `tone` (`plain`, `accent`, `soft`, `good`, `warn`, `bad`). Each helper carries metadata the prompt builder reads (limit, enum values).

### 4.3 Tokens and themes

Token values are those in the lmthing spec (Component system, Tokens and Themes). This repo owns them.

| File | Holds |
| --- | --- |
| `tokens/space.ts` | `xs` 4, `sm` 8, `md` 12, `lg` 16, `gutter` 20, `xl` 24, `2xl` 32, `3xl` 48 |
| `tokens/size.ts` | `control.sm/md/lg` 36/44/52, `icon.sm/md/lg` 16/20/24, `avatar.sm/md/lg` 32/44/64 |
| `tokens/radius.ts` | `sm` 8, `md` 12, `lg` 16, `xl` 24, `pill` 999, plus the sharp and round shift rule |
| `tokens/type.ts` | `display`, `title`, `heading`, `body`, `label`, `caption`, `number` with size, line height, weight |
| `tokens/roles.ts` | Colour role names: `bg`, `surface`, `raised`, `line`, `text`, `muted`, `accent`, `accentSoft`, `onAccent`, `good`, `warn`, `bad` |
| `tokens/elevation.ts` | `flat`, `card`, `sheet` as shadow descriptions |
| `tokens/motion.ts` | Durations `fast` 120, `base` 220, `slow` 420 ms. Springs `snappy`, `gentle`, `bouncy` |
| `themes/presets/*.ts` | One file per preset: mood, type family, shape (sharp, soft, round), density, surface treatment, role values for light and dark |
| `themes/accents.ts` | 12 accents, each with `accent`, `accentSoft`, `onAccent` for light and dark |
| `themes/theme-name.ts` | `themeName({ preset, accent, mode })` → `kit_<preset>_<mode>_<accent>` |
| `themes/kit-style.ts` | What a preset changes besides colour (corner shift, font pairing, density) as plain data |

Accent and preset colour values are designed in step U1. Each one must pass the contrast rules: text on background at least 7:1, muted text and text on accent at least 4.5:1, in all 288 combinations. A failing combination fails `catalog:check`.

### 4.4 Components, packs and archetypes

- **Core:** the 40 components and 15 archetypes listed in the lmthing spec (The 40 core components, Archetypes). One file each.
- **Packs:** the ten packs listed in the lmthing spec (Domain packs). Each pack folder holds `pack.ts`, its component and archetype files, and a worked example app.
- **Ids** are unique across core and packs. A pack component's id never equals a core alias, unless the core alias is meant to resolve to it when the pack is active (see 4.6).

Component file template (one per component, under 120 lines):

```ts
// packages/catalog/src/components/list.ts
export const list = defineComponent({
  id: "list",
  group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "The person scans or chooses among their things. Not for facts about one thing (keyvalue) or things to tick off (checklist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  props: z.object({
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
  }),
  parts: ["root"],
  items: { key: "rows", prefix: "r", parts: ["root", "title", "meta", "icon", "trail"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], trail: ["toggle"] } },
  aliases: ["listview", "table", "rows", "items"],
  fallback: ({ cast }) => ({ style: "inset", rows: rowsFromCast(cast, 3) }),
  examples: [/* two or more, validated by catalog:check */],
});
```

### 4.5 Screen rules

Pure functions over `ScreenLike` and a registry. They report issues. They never repair.

| File | Rule |
| --- | --- |
| `rules/regions.ts` | `sortByRegion(components)`: top, body in model order, bottom |
| `rules/rhythm.ts` | The gap table: 8 after a section title, 16 between content, 24 before a new group or after a hero |
| `rules/weight.ts` | 3 to 9 components, total weight at most 12, at most two weight-3 components |
| `rules/limits.ts` | Count limits (6 rows, 6 chips, 2 to 4 stats tiles, 7 bars, 5 tabs) read from the schemas |
| `rules/neighbours.ts` | Hero first in the body, section title followed by content, no two adjacent of one type except cards and fields, a button never first, one primary action in the bottom region |
| `rules/placeholders.ts` | Rejected patterns ("Lorem", "Item 1", "John Doe", "Untitled", "Example") |
| `rules/check-screen.ts` | `checkScreen(screen, registry): Issue[]` runs all of the above with stable codes (`S.weight_over`, `S.two_primaries` …) |

### 4.6 Registry and pack scope

```ts
const registry = createRegistry({ packs: ["booking", "customers"], includeDrafts: false });
registry.get("slots");            // ComponentDef or undefined
registry.resolve("table");        // id after alias lookup, scoped to the active packs
registry.schema("list");          // Zod schema
registry.archetypes; registry.surfaces; registry.ids;
```

- A registry is a scoped view: the core plus the given packs. Hosts create one per app.
- **Alias resolution:** an exact id wins. A core alias never shadows a pack component the registry includes (with `data`, `table` is the table; without it, `table` resolves to `list`). Two aliases resolving to different ids within one scope fail `catalog:check`.
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
home/l1/r2/title        a part of an item
home/~after:l1          the gap below a component
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
list [phone] Several things of the same kind, each one tappable. Not for facts about one thing (keyvalue).
  {"c":"list","style":"inset|plain|cards","rows":[{"title":<=28,"meta"?:<=36,"icon"?,"photo"?,"trail"?:"chevron|check|toggle|value|badge","goto"?}]}  1-6 rows
```

- The output is deterministic: fixed ordering by group then id, no timestamps, so prompt caching holds.
- Token budgets (counted with an o200k tokenizer, a dev dependency used only in `scripts/`): core block under 3,500, each pack block under 1,200, the core with any 3 packs under 7,000.
- Snapshot tests store every block. A pull request shows exactly what changes in the model's view.

### 4.10 Checks

`pnpm catalog:check` fails unless:

1. Every component has every required field. The purpose is 16 words or fewer, and the pick line names a nearest wrong choice.
2. Every string prop has a limit, and every array has a maximum.
3. Every component has at least two examples that pass its schema, use only real icons and photo tags, and pass the placeholder check.
4. Every fallback validates with an empty cast and with a full cast (fixtures in `test/`).
5. Every archetype layout's default lines pass `checkScreen`.
6. Every pack has a purpose, a pick line, at least two archetypes and a worked example whose lines all validate.
7. No alias conflicts within any core-plus-pack scope.
8. Every colour role exists in every theme and passes contrast (`scripts/contrast.ts`, all 288 themes).
9. The token budgets in 4.9 hold.
10. Every action names a declared part, every part with a `goto` declares `press`, every input component declares at least one action, and a component with nothing to touch declares `actions: {}`.
11. Every example, in every declared state, reads within the token budget in 4.12, and a custom `read` mentions every part that holds text.
12. Every `ready` component has a kit renderer. This is checked from the kit side by the conformance test, and listed here for completeness.

### 4.11 Versioning and migrations

- The `@lmthing/catalog` package version is the catalog version stamped on every spec a host saves.
- **Patch:** wording, examples, a loosened limit.
- **Minor:** a new component, style, optional prop, icon, layout or pack. It needs a kit renderer, two examples and, in lmthing, a pairwise eval that does not regress.
- **Major:** a removal, rename, tightened limit or changed meaning. It needs a migration: a pure function over a minimal spec shape (`{ catalog, screens: Record<string, ScreenLike> }`), with fixture tests. Hosts run `migrate(spec)` on load.
- A deprecated component is marked `deprecated: true`. It leaves prompt blocks at once and stays drawable for two major versions.

### 4.12 Reading and acting: the catalog side

Agents read screens as compact text and act on them by address. Everything that can be computed from data lives here, so a screen can be read with no browser (the lmthing agent reads specs on the server this way).

**Action vocabulary.** Each component declares, in `actions`, what each part and item part accepts:

| Action | Value | Used by |
| --- | --- | --- |
| `press` | None | `button`, `card`, list rows, `actions` items, `banner`, header action, tab bar tabs, anything with a `goto` |
| `toggle` | None (flips) or a boolean | `field` (toggle), list row toggle trail, `chips` (filter) |
| `check` | None (flips) or a boolean | `checklist` items |
| `select` | An index or option label | `segmented`, `chips` (choose), `calendar` days, `field` (choice) |
| `type` | Text | `field` (text, number, date, time), `search` |
| `set` | A value | `field` (slider), `scale`, `counter` |
| `increment`, `decrement` | None | `counter`, `field` (slider), `scale` |
| `swipe` | `left` or `right` | `swipe_stack` |
| `start`, `stop` | None | `timer` |

Screen-level actions: `back`, `tab(sectionId)`, `scroll` (to the top, the bottom or an address). Pack components use the same vocabulary. A new action name is a minor catalog version.

**Value validation.** `validateActionValue(def, address, action, value)` checks a value against the part's schema: a date field takes `YYYY-MM-DD`, a time field `HH:MM`, a number stays within the schema's bounds, text within the part's limit, `scale` 1 to 5, `select` a valid index or label. An invalid value returns `invalid_value` with the allowed format in under 10 words.

**Readers.** Each component has a reader, `(props, state) => string[]`. The default reader is generated from the schema. A component overrides it only where a summary reads better (`bars` as its values with the unit, `ring` as "3 of 5", `calendar` as its marked days, `timer` as its time).

**Format.** Deterministic, one line per component, items indented two spaces:

```text
screen home "Today" · calm/moss/light · rev 4 · ready
h1 hero[accent] "3 plants are thirsty" — "Fern, Monstera and Basil"
l1 list
  r1 "Fern" · "Bathroom" [press→plant] [toggle:off]
  r2 "Monstera" · "Living room" [press→plant] [toggle:on]
f1 field[date] "Next watering" = "2026-11-19" [type:date]
b1 button[primary] "Add a plant" [press→new_plant]
```

- Every line starts with its address relative to the screen (`l1`, `r1`). The full address for an action is the screen id plus that path (`home/l1/r1`).
- Text written by a model or a person is always in double quotes, with inner quotes escaped, so structure and content never mix. Agents treat quoted text as data.
- Style or kind in brackets after the component name only when not the default; tone only when not `plain`; state in parentheses only when not `filled` (`l1 list (loading)`).
- Affordances in square brackets: `[press→target]`, `[toggle:on|off]`, `[check:done|todo]`, `[select:2/4]`, `[type:date]`, `[set:1-5]`, `[disabled]`.
- Field values follow `=`. Interactive values come from the kit's interaction state when a host passes it (5.9).
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

## 5. Package: `@lmthing/kit`

### 5.1 Peer dependencies

`react`, `react-native`, `react-native-web` (for web hosts), `tamagui` and `@tamagui/core`, `react-native-reanimated`, `@tamagui/lucide-icons`, `react-native-svg`. Exact ranges are pinned at kickoff and recorded in `docs/dependencies.md`. The kit has no Expo dependency. Hosts load fonts and resolve photos.

### 5.2 Tamagui integration

The kit exports pieces. The host builds one Tamagui config from them, together with its own tokens and themes.

```ts
import { kitTokens, kitThemes, kitFonts, kitSprings, kitFontAssets } from "@lmthing/kit/tamagui";

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

### 5.5 Renderers

```tsx
// packages/kit/src/components/list.tsx
export const list = defineRenderer("list", ({ props, part, item }) => (
  <KitCard style={props.style} {...part("root")}>
    {props.rows.map((row) => (
      <KitRow key={row.id} {...item(row.id, "root")}>
        <KitIcon name={row.icon} {...item(row.id, "icon")} />
        <YStack flex={1}>
          <KitText role="body" {...item(row.id, "title")}>{row.title}</KitText>
          {row.meta ? <KitText role="caption" tone="muted" {...item(row.id, "meta")}>{row.meta}</KitText> : null}
        </YStack>
        <KitTrail kind={row.trail} value={row.value} {...item(row.id, "trail")} />
      </KitRow>
    ))}
  </KitCard>
));
```

- `defineRenderer(id, render)` infers `props` from the catalog schema for `id`. An id the catalog does not know is a type error.
- `part(name)` and `item(itemId, name)` return `{ ref, onLayout, testID }` plus the part's accessibility props (5.9). `testID` is the full address. On layout, the part measures itself relative to the screen root (`measureLayout`), batched per frame, and calls `PartRegistry.register` with its address (`screen/component[/item]/part`). Unmount unregisters.
- Renderers are pure. They read props, the state name, the theme and `KitStyle`. They hold no state, timers or fetches. Links are data passed to `KitAction`. Interactive values come from `value(part)`, which returns the interaction store's value or the prop, and every input goes through the dispatcher (5.9).
- Every renderer draws every state its component declares: `filled` (default), `empty` (copy from the component's empty fallback), `loading` (`KitSkeleton` in the component's shape), `success` (the success treatment and, where the component has one, its signature end state), `error` (tone `bad` and a short line).
- `define/renderers.ts` is the map from id to renderer. It is generated from the folder listing by a script, so adding a file is enough.

### 5.6 Screen

`Screen` draws one `ScreenLike`.

1. Sort components by region (`sortByRegion`). Top is pinned, the body is one scrolling column with a 20 point gutter, and the bottom holds the primary action then the tab bar.
2. Apply the rhythm table between body components. There is no spacing prop.
3. Key every component by its id. Look up its renderer from the registry, resolving aliases. An unknown id renders nothing and reports `unknown_component`.
4. **Arrive:** a component seen for the first time fades in and rises 8 points with the `gentle` spring, 40 ms stagger, capped at 6 items.
5. **Morph:** when a known id's props change, the old render cross-fades to the new one while the height springs (`snappy`). Siblings stay still. Removal fades and collapses (`fast`).
6. Only transform, opacity and the height of a morphing component animate. Nothing loops at rest. With `reduceMotion`, every animation becomes a cross-fade and signatures show their end state.
7. The tab bar is drawn from a host-supplied list of tabs (`tabs` prop). The model never writes it.

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
| `empty_section` | A `section_title` with no visible content before the next title or the end |
| `low_contrast` | A tone and role pair resolving below the contrast rule in the current theme (a runtime guard; the build check should make it rare) |
| `unknown_component` | An id the registry cannot resolve |

Each issue carries the part address. Hosts decide what to do (lmthing feeds them to its R5 repair step).

### 5.9 Reading and acting: the kit side

One rule shapes everything here: an agent action runs exactly the code a human touch runs. Agents that know the API use `read` and `act`. Agents that do not (browser agents clicking through the accessibility tree) get a clean accessibility tree with stable ids.

**Addresses on elements.** Every part's element carries `testID` set to its full address (`home/l1/r1/title`). React Native Web renders it as `data-testid`, so Playwright and browser agents can target any part, and Maestro uses the same ids on phones. Addresses never contain generated or random parts.

**Accessibility tree.** Built in `interact/a11y.ts` and applied through `part()` and `item()`:

- Every interactive part has a role (`button`, `link` when it has a `goto`, `checkbox`, `switch`, `tab`, `adjustable`, `search`), a label from its visible text, and its state (`checked`, `selected`, `disabled`, current value).
- Headers are `header`, lists are `list` and `listitem`, photos are `img` labelled by caption or tag.
- Decorative elements (an icon beside a label, backgrounds, dividers) are hidden from the tree. Chart drawings (`bars`, `sparkline`, `ring`) are hidden and replaced by a label holding their values, so no SVG path data reaches an agent.
- The element that carries the role receives the press, never a wrapper. Touch targets are at least 44 points.
- Adjustable controls (`counter`, slider fields, `scale`) declare the increment and decrement accessibility actions, handled by the dispatcher.

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

## 8. Testing

| Layer | Tool | Covers |
| --- | --- | --- |
| Catalog unit | Vitest | Schemas, examples, fallbacks, screen rules, alias scope, lookups, address property tests, migrations |
| Prompt snapshots | Vitest | Every block and the pack index |
| Contrast | Script | All 288 themes |
| Type tests | `expect-type` in Vitest | `defineRenderer` inference, `PropsOf<Id>`, unknown ids rejected |
| Kit conformance | Jest with `jest-expo` and React Native Testing Library | For every `ready` component: a renderer exists, both examples render in every declared state, every declared part and item part registers with the memory registry |
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
| Read a typical screen | At most 300 tokens, under 5 ms |
| Read an app outline | At most 15 tokens per screen |
| Act to settled result, agent mode, web | Under 100 ms, or 300 ms when it navigates |

## 10. Tooling

- **pnpm** workspace, Node LTS pinned in `.nvmrc` and `packageManager`.
- **TypeScript** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **ESLint** flat config:
  - `max-lines` 200, `max-lines-per-function` 60
  - `import/no-default-export`, except in gallery route files
  - boundaries, enforced with `no-restricted-imports` and `eslint-plugin-boundaries`:
    - `catalog` imports nothing but `zod`; `node:*` only in `scripts/`
    - `kit` imports `catalog` and its peer dependencies only
    - nothing imports from `apps/`
  - no hex colours or pixel numbers outside token files: a custom rule
- **Prettier** with defaults.
- **Build:** `tsup` emits ESM and type declarations into `dist/` for both packages. Each `package.json` has `exports` with a `source` condition pointing at `src/index.ts`. Hosts in the same workspace (lmthing) resolve `source` through TypeScript `customConditions` and Metro `unstable_conditionNames`, so they compile the TypeScript directly with no build step. Published consumers get `dist/`.
- **Changesets** for versions and changelogs. `@lmthing/kit` declares `@lmthing/catalog` as a peer dependency with the same major version.

## 11. Continuous integration

`ci.yml` on every pull request, all steps required:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test` (catalog and kit)
5. `pnpm catalog:check` (including contrast and token budgets)
6. `pnpm kit:themes --check`: the generated themes are up to date
7. `pnpm build`
8. Gallery web export and Playwright screenshots (artifacts uploaded)
9. A size report for the kit and themes in a web build

`release.yml` publishes tagged versions with Changesets. It stays disabled until the registry question in section 14 is settled.

## 12. Using it from lmthing

### 12.1 Submodule

- Path: `packages/ui` in the lmthing repo, URL `https://github.com/lmthing/ui.git`.
- lmthing's `pnpm-workspace.yaml`:

  ```yaml
  packages:
    - packages/*
    - "!packages/ui"
    - packages/ui/packages/*
    - apps/*
  ```

  This includes `@lmthing/catalog` and `@lmthing/kit`, but not the submodule's workspace root or its gallery. The submodule's own `pnpm-workspace.yaml` and lockfile are used only when working inside it alone.
- Clone with `git clone --recurse-submodules`. Existing clones run `git submodule update --init`. lmthing's CI checks out submodules.

### 12.2 What moves out of lmthing

| Was in lmthing | Now |
| --- | --- |
| `packages/catalog` | `@lmthing/catalog` in this repo |
| `apps/lmthing/src/kit` | `@lmthing/kit` in this repo |
| Address grammar in `protocol/address.ts` | `@lmthing/catalog` (`address/`). `protocol` re-exports it |
| Component, state and part types in `protocol` | `@lmthing/catalog` (`types/`). `protocol` re-exports them and adds the full `Spec` |
| Kit theme build script | `@lmthing/kit` (`scripts/build-themes.ts`) |
| The kit's part of the app gallery | The gallery here. The app keeps a gallery for its own shell primitives |

The app keeps THING's interface (shell tokens and primitives), the stage (which implements `PartRegistry`), Try it mode (which passes an `onLink` that navigates), the photo resolver (`local:n` from its own storage, `lib:` from `@lmthing/photos`), `tamagui.config.ts` (which merges kit and shell pieces), and the agent hook: `read` and `act` in Try it mode, share links and eval render routes, `read` only on the studio stage. We suggest renaming the app's shell folder from `src/ui` to `src/studio`, so "ui" means one thing.

### 12.3 Workflow for a change

1. Branch in `packages/ui`, change, push, open a pull request in `lmthing/ui`. Its CI runs everything above.
2. Merge. In lmthing, `git submodule update --remote packages/ui`, commit the new pointer, open a pull request. lmthing's CI runs its evals against the new catalog.
3. A minor or major catalog version bump also needs lmthing's pairwise eval to pass before the pointer moves.

While both sides change together, a lmthing branch may point at an unmerged `lmthing/ui` branch commit. It must point at a merged commit before the lmthing pull request merges.

## 13. Implementation steps

Each step ends at its gate. The mapping to lmthing phases shows when lmthing needs each step.

| Step | Builds | Gate | lmthing needs it for |
| --- | --- | --- | --- |
| **U0. Bootstrap**, 0.5 week | Workspace, TypeScript, ESLint with boundaries and size rules, Prettier, Vitest, Jest, Changesets, `ci.yml`, `docs/decisions/0001-baseline.md`, empty packages and gallery | CI green. A test fixture proves lint rejects a React import in `catalog` and a 201-line file | Phase 0 |
| **U1. Catalog foundations**, 1 week | `define*` API, prop helpers, types, tokens, draft presets and accents, theme names, `KitStyle` data, address grammar, screen rules, registry with alias scope, lookups, the action vocabulary and value validation, the default reader, `readScreen` and `readApp`, `check.ts` and `contrast.ts`, the first six components (`header`, `hero`, `list`, `button`, `ring`, `checklist`) and the `home` archetype | `catalog:check` green for what exists. Contrast results for all 288 themes listed (draft values may still fail). Address property tests pass. The six components read within budget, and their actions validate | Phase 0: the protocol and the Ledge fixture |
| **U2. Kit foundations**, 1 to 1.5 weeks | Tamagui tokens, fonts, springs, generated themes, `KitProvider`, `KitStyle`, the six bases and helpers, `defineRenderer`, parts and registries, `testID`s and accessibility props, the interaction store, action registry, dispatcher and agent access with settle and agent mode, the six renderers, `Screen` with regions, rhythm, arrive and morph, `defaultLines` for `home`, gallery skeleton, conformance test, a 288-theme load test | The gallery shows the six components in 3 presets, light and dark, on web, iOS and Android. Conformance passes. The web size of kit plus themes is measured. In the gallery, every action on the six components works through `window.__lmthingUI.act` and through the accessibility tree with identical results, and axe-core reports no violations | Phase 0: the app replays the Ledge fixture |
| **U3. Prompt entries for everything**, 1 week | Draft definitions (`status: "draft"`) for every remaining core component and every pack component and archetype: purpose, pick, schema with limits, parts, states, actions, aliases, tier, `realPath`, fallback, two examples, and a reader override where needed. `buildEntry`, `buildBlock`, `buildPackIndex`, token counting, prompt snapshots | Token budgets hold. Every draft passes `catalog:check` except the renderer rule. lmthing's bake-off builds real prompts from `createRegistry({ includeDrafts: true })` | Phase 0: the 100-idea bake-off |
| **U4. Core 24**, 2 weeks | Final definitions and renderers for the core 24: `header`, `section_title`, `steps`, `tabbar`, `hero`, `card`, `list`, `keyvalue`, `note`, `photo`, `gallery`, `profile`, `banner`, `empty`, `field`, `chips`, `segmented`, `checklist`, `search`, `button`, `actions`, `success`, `stats`, `ring`. Every state. The core archetypes whose recipes use only these | All 24 `ready`, conformance, interaction and screenshot tests pass, ten hand-written screens across very different apps validate with zero issues and look finished in every preset | Phase 1 |
| **U5. Booking and customers packs**, 1 week | Both packs complete: components, renderers, archetypes, worked examples (Trot) | Both packs `ready`, Trot's worked example renders without issues in 3 presets | Phase 1: Trot |
| **U6. Rest of the core**, 1.5 weeks | `scale`, `bars`, `sparkline`, `timeline`, `calendar`, `counter`, `timer`, `camera`, `map`, `bubbles`, `people`, `swipe_stack`, `day_timeline`, `streak`, `route`, `canvas`. The three surfaces. All ten signatures, hand-tuned. Render reports. Every core archetype | All 40 core `ready`, with every action passing the interaction and agent end-to-end tests. Signatures judged against the reference mock on a real phone. Report fixtures with known faults produce exactly the expected issues | Phase 1 end, Phase 2 (render reports, R5) |
| **U7. Remaining packs**, ongoing | `commerce`, `data`, `social`, `content`, `learning`, `money`, `places`, `team`, in the order lmthing's off-pack codes and `canvas` misses ask for | Each pack `ready` with its worked example before it enters live prompts | Phases 3 and 4, then ongoing |
| **U8. Release readiness**, 1 week, when a second consumer appears | `dist` builds verified in a blank Expo app and a blank web app, `@lmthing/photos`, per-package README with the public API, licence, `release.yml` enabled, first tagged release | A blank project installs both packages from the registry and renders a screen with no lmthing code | Another project |

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
- [ ] **Rename lmthing's `src/ui` to `src/studio`?** Default: yes, decided in the lmthing repo.
