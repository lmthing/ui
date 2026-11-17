# Catalog plan: core and packs

What every component of `@lmthing/ui` should be, written before the code. `implementation-plan.md` says how
the system works; this folder says **which** components exist, what each one is for, and in what order they
are built. Where the two disagree on a component list, this folder is newer and wins; the plan's 4.4 tables
point here.

| File | Holds |
| --- | --- |
| [core.md](core.md) | The core: every component in every prompt. Changes from the first 40, all 44 entries, archetypes, build order |
| [packs/README.md](packs/README.md) | The pack index: all 18 packs, the one-line pick for each, common combinations, build waves |
| `packs/<pack>.md` | One pack in full: purpose, apps it serves, every component, archetypes, worked example, aliases, build notes |

## Where this came from

Four research passes on 2026-11-17: design-system inventories (Apple HIG, Material 3, Ant Mobile, Polaris,
Carbon, shadcn, Tamagui and others), the main screens of top apps in 16 store categories, vocabularies built
for models (A2UI, Adaptive Cards, Block Kit, json-render, OpenAI Apps SDK, no-code builders), and what people
ask AI app builders to make. Sources were thin: most frequencies are informed judgment, not counts. The one
sourced finding that shaped everything is that **overlap between choices hurts a model more than their
number**, so every entry here names its nearest neighbours and how to tell them apart, and a gap is closed
with an option on an existing component before a new id is added.

## What belongs where

- **Core** (in every prompt): needed by apps in at least three unrelated domains, or by three or more packs
  (a pack never depends on another pack), cannot be an option on an existing core component, and has a
  one-line `pick` that separates it from every neighbour.
- **Pack** (loaded when the Director picks it, up to 3 per app): needed by one family of apps, or needs
  domain words in its schema (sets and reps, beds and baths, RSVP).
- **Option** (a `style`, `kind` or prop on an existing component): looks different but answers the same
  need. Options cost the model nothing at choose time.
- **Canvas**: everything else, logged as a miss. Misses decide what is added next.

## How an entry reads

Every component in these files has the same block, matching the fields of `meta` and `props`
(`component-guide.md`):

```text
### `Id` · status · group · tier
Two or three sentences: what the person sees and does.
- Pick: when the model should choose it. Not <need> (`NearestId`).
- Writes: the props a model fills, with limits (text length, item counts).
- Styles: the `style` (or `kind`) values, default first.
- Parts → actions: addressable parts and what they accept.
- States: which of filled, empty, loading, success, error it draws.
- Real path: one sentence on what makes it work for real.
- Aliases: words a model might write that resolve to it.
```

- **Status:** `built` (exists and passes its gate), `changed` (built, gets new options), `new`, `merged`
  (folded into another id), `planned` (pack component not yet drafted).
- **Group:** structure, content, data, input, action, beyond, escape (core); packs use the same groups.
- **Tier:** `phone` (works on the device alone), `ok` (needs the person's permission: camera, notifications,
  location), `people` (needs other people using it), `service` (needs an outside service: maps, payments,
  sending). Reads mark non-phone actions `!needs-ok`, `!needs-people`, `!needs-service`.
- **Limits** are written `text(n)` for a string of at most n characters and `1–6` for an item count.

## New action names

Every action name below is new to the vocabulary in plan 4.12 (each is a minor catalog version):

| Action | Value | Used by |
| --- | --- | --- |
| `dismiss` | None | `Sheet`, `Success` toast |
| `play`, `pause` | None | `Player`, `MiniPlayer`, `Breathe`, `CookSteps` step timers |
| `seek` | Seconds | `Player` |
| `flip` | None | `Flashcard` |
| `move` | A column label | data `Board` |
| `send` | None | `Composer` (reply) |
| `scan` | None | events `Door` (returns a code; tier `ok`) |

Everything else uses the existing `press`, `toggle`, `check`, `select`, `type`, `set`, `increment`,
`decrement`, `swipe`, `start` and `stop`.
