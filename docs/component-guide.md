# Component guide

How to build one component of `@lmthing/ui`. `src/components/List.tsx` and `List.test.ts` are the
reference: copy their shape exactly. The plan (`implementation-plan.md` 4.2, 4.4, 4.13, 5.4 to 5.6)
says what each component is; this guide says how its file is written.

## What one component is

Exactly two files, plus recordings:

| File | Holds |
| --- | --- |
| `src/components/<Id>.tsx` | `meta`, `props`, `fallback`, `examples`, `probes`, and the view `<Id>` |
| `src/components/<Id>.test.ts` | schema, fallback and probe-shape tests |
| `test/recordings/<Id>/<model>.json` | recorded model replies from `pnpm llm:check --component <Id>` |

Nothing else is registered by hand. Entries, the renderer map, conformance tests and the gallery pick
the file up from the folder. `<Id>` is the PascalCase id from the plan's table (4.4).

## The file, in order

1. **Imports.** Only `zod`, `../catalog` and `../kit`. Never `tamagui`, `react-native` or lucide
   directly: those live behind kit bases.
2. **`meta`**: a plain object, `as const satisfies Meta`.
   - `purpose` ≤ 16 words, about the person's need, not the widget.
   - `pick`: when to choose it, then "Not …" naming the nearest wrong component(s) by id.
   - `region`, `weight`, `tier`, `realPath` (one sentence) from the plan row.
   - `items` (only if it repeats): `{ key, parts }`. `parts`, `states`, `actions` list exactly what
     the view draws and what a person can do. `aliases`: 3 to 5 lowercase words a model might write.
3. **`props`**: `z.strictObject`. Every string is `text(n)`, every array has `.min()` and `.max()`,
   icons are `icon`, photos `photo`, links `screenId` (`goto`). Choices are `z.enum([...])` with a
   `.default()` when one is usual. Visual variants are one `style` enum. Never colours, sizes, fonts,
   pixel values or free-form strings for things that have a vocabulary.
4. **`fallback({ cast })`**: valid props from the cast only, through the helpers:
   `thingOf(cast)`, `itemsOf(cast, n)`, `titleOf(item, max, thing)`, `detailOf(item, max, thing)`,
   `clip(text, max)`; with nothing usable, `placeholderTitle(i)`, `placeholderDetail`,
   `placeholderLabel`, `placeholderValue`. Never domain words, never a field read by name.
5. **`examples`**: two or more, `satisfies z.input<typeof props>[]`. First Ledge (plant care), second
   Trot (dog walking). Real, specific content at realistic lengths. Together they use every `style`
   and every optional field at least once.
6. **`probes`**: `satisfies Probe[]`.
   - Two or more `choose`: one need this component must win; one near miss whose `expect` is the
     nearest wrong component named in `pick`. Needs are in the person's words and never contain any
     component id or alias.
   - One `write`: a brief in the person's words; `expect` is this id.
   - One `read` for every component with `actions` (runs later; must be well-formed now).
7. **The view** `export function <Id>(props: Props<typeof props, typeof meta>)`:
   - Built only from kit bases (below). One root base carries `part="root"`; every element that is
     a part carries `part="<name>"` from `meta.parts` / `meta.items.parts`; each item is wrapped by a
     base taking `item={row.id}`.
   - States: `const state = useComponentState()`. `loading` → `<KitSkeleton rows={n} />` in the
     component's shape. `empty` → `emptyLine(useEmptyThing())` in `KitText tone="muted"`.
   - No literal user-facing text anywhere. Text comes from props, the cast or `catalog/copy.ts`.
   - No raw numbers for layout. Use `space`, `size`, `radius`, `type` tokens through the bases.

## Kit bases (the only building blocks)

| Base | Use | Key props |
| --- | --- | --- |
| `KitCard` | A surface holding the component (also gives list a11y role) | `style` plain/inset/cards, `part` |
| `KitRow` | One tappable or static row inside a card | `item`, `label`, `goto`, `leading`, `trailing`, children |
| `KitText` | All text | `role` display/title/heading/body/label/caption/number, `tone`, `align`, `lines`, `part` |
| `KitIcon` | An icon from the catalog set | `name`, `tone`, `scale` sm/md/lg, `part` |
| `KitPhoto` | A photo reference | `photo`, `part` |
| `KitTrail` | Row end: chevron, check, toggle, value, badge | `kind`, `value`, `part` |
| `KitSkeleton` | Loading bars | `rows` |

If the view needs something no base does (a pressable button, a progress ring, a checkbox), the task
says which new base to add under `src/kit/base/` (or `helpers/`) and its exact props. Never draw it
inside the component file. A new base is themed only through tokens, roles and `useKitStyle()`.

## Tests: `<Id>.test.ts`

Copy `List.test.ts` and keep its four blocks: every example parses; invalid inputs are rejected
(over-long text, too many or too few items, unknown enum values, unknown keys, raw colours); the
fallback validates with an empty cast, a cast with matching things and a malformed cast, and uses
placeholders when empty; probes are well-formed (≥2 choose with a near miss, 1 write, read if
actions). Rendering is covered by `test/conformance.test.tsx` automatically.

## The model gate

`pnpm llm:check --component <Id>` must print `All required probes pass.` before the component is
done, and the recordings it writes under `test/recordings/<Id>/` are committed. `pnpm test` replays
them. If a probe fails, improve this component's `purpose`, `pick`, `aliases` or limits (or the
example) and run again. Never weaken a probe, and never edit another component to make yours pass;
report the conflict instead. A `choose` probe whose expected component is not built yet is skipped.

## Done means

All of these pass from the repo root: `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm build:catalog`, `pnpm llm:check --component <Id>`. Then `pnpm shoot --component <Id>` and
look at every PNG (one per preset and mode, every example and state): text never clipped or
overflowing, nothing touching an edge, rows aligned, contrast readable, empty and loading look
intentional in every preset. Fix and re-shoot until they do.
