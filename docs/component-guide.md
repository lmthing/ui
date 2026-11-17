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
     component's shape. `empty` → `emptyLine(useEmptyThing())` in `KitText tone="muted"`. Other shared copy: `goalLine(of)` ("of 5"), `stepLine(at, count)` ("Step 2 of 3"), `totalLine(total, unit?)` ("Total 23 walks"), `trendWord(points)` ("rising"), `stepLabels` (counter buttons), `clockLine(seconds)` ("4:05"), `weekdayInitials` (Monday first), `timerLabels` (start, stop), `streakLine(count, days)` (its read lines), `photoLabels` (add, take, scan). Need other words? Report it; never write literal text in a view. A component whose meaning is in numbers sets `meta.read(props, state)` to return its reading (for example `["3 of 5"]`); it comes before the quoted texts in its read line.
   - No literal user-facing text anywhere. Text comes from props, the cast or `catalog/copy.ts`.
   - No raw numbers for layout. Use `space`, `size`, `radius`, `type` tokens through the bases.

## Kit bases (the only building blocks)

| Base | Use | Key props |
| --- | --- | --- |
| `KitCard` | A surface holding the component (also gives list a11y role) | `style` plain/inset/cards, `look` surface/tinted/outlined (inset only), `tone` neutral/good/warn/bad (for tinted), `clip` (round a photo at the top), `goto`+`label` (whole card is one link), `padded` (inset content), `part` |
| `KitDay` | One selectable calendar day: 44px round target (role button), number, accent ring when selected, a dot in the mark's tone; one item | `item`, `label`, `name`, `selected`, `mark` |
| `KitWeekGrid` | Calendar grid: weekday initials over rows of seven equal columns; `null` for blank slots; put `KitDay` in each day | `cells` |
| `KitWeekStrip` | This week as seven decorative done markers with initials; part `days` | `days` (7 booleans), `part` |
| `KitDayMark` | A decorative week-strip marker: filled accent when done, a rule ring otherwise | `done` |
| `KitScaleTrack` | Five equal 44px radio targets, parts `l1`..`l5`: stars/dots fill to `value`, mood shows five faces with the chosen one in accent | `style` mood/stars/dots, `value` 0..5, `labels` (five) |
| `KitBars` | Columns for amounts, scaled to the largest; the largest (or `highlight`) in accent; label under each; each point an item | `points` ({id,label,value}), `highlight` |
| `KitSpark` | A small trend line with a dot on the latest value, in a tone; decorative (write the value as text) | `points`, `tone` accent/good/warn/bad, `part` (default `line`) |
| `KitTime` | A time or short date in a fixed-width muted column with tabular digits (a `KitRow` leading item) | `value`, `part` (default `time`) |
| `KitRing` | Progress ring: `$line` track and `$accent` arc to value/of from twelve o'clock; children centred inside; drawing hidden from assistive tech; centres itself | `value`, `of`, `scale` md/lg, `part` (default `ring`), children |
| `KitTabBar` | Bottom navigation: 2 to 5 equal tabs under a top rule, icon over label, selected in accent; each tab an item (role tab, goes to its `goto`) | `tabs` ({id,icon,label,goto}), `at` |
| `KitMapTile` | A stylised map: soft streets and numbered accent pins 1..count at stable spots; decorative, part `map` | `count` (1..5), `part` |
| `KitViewfinder` | A dark rounded camera frame (photo grid or scan corners) with the hint over its bottom edge | `kind` photo/scan, `hint`, `part` (default `viewfinder`), `hintPart` (default `hint`) |
| `KitShutter` | A large round centred shutter button (role button) | `label`, `part` (default `shutter`) |
| `KitRouteStop` | One stop on a route with `KitRow` insets: start ring, dot, end pin on the first line, joined by a vertical connector; static item | `item`, `label`, `position` start/middle/end, children |
| `KitSwipeStack` | A stack: the first card fully on a surface (item root, role button, the swiped one), the next two peeking behind, hidden from reading | `cards` ({id,label,children}) |
| `KitBubble` | One chat message: `me` right on accent, `them` left on raised, wraps at 80% width; `grouped` sits closer; one item | `item`, `from`, `text`, `grouped` |
| `KitHours` | A day by the hour: hour rail and blocks placed and sized by start/end, tinted by tone; each block one item (`title`, `time`), link when `goto` | `blocks` ({id,start,end,title,tone,goto}) |
| `KitSlider` | A themed slider in a 44px touch area (role slider, its value); the part `set` acts on | `value`, `label`, `min`/`max` (default 0..10), `part` (default `field`) |
| `KitInput` | A one-line text box (role textbox, or searchbox for `kind="search"`), optional leading icon, hint as placeholder; the box is the part `type` acts on | `hint`, `value`, `kind` text/search, `icon`, `part` (default `field`), `label` |
| `KitStrip` | A sideways-scrolling strip; each child cell about 40% wide so the next peeks in; no scrollbar | children |
| `KitStepsTrack` | The drawn track of a step sequence (dots, bar, numbered); decorative, hidden from reading | `style`, `count`, `at`, `part` |
| `KitChip` | One selectable item: a `pill` (Chips) or a `segment` (Segmented); 44px touch area is the item root with the given role | `item` (`null` inside a track that is itself the control), `label`, `on`, `role` checkbox/radio/tab, `icon`, `look` pill/segment |
| `KitTrack` | The component root for chips: wrapping row (`pills`) or a tinted track of equal segments (`segments`, role tablist) | `look`, `part` (default root; `field` for a Field choice), `role` radiogroup (the track is the control), `label`, children |
| `KitTile` | One pressable item tile: icon in a soft round badge over a centred label, one address per item (quick actions) | `item`, `icon`, `label`, `goto` |
| `KitContent` | Text of a card with one root address (padded `KitCard`): optional leading icon or thumbnail centred on the first line, text lines with a small gap; stamps no address | `lead`, `lineRole`, `leadingAlign` line/row (`row` for a thumbnail), `inset` none/md, children |
| `KitBlock` | One static block (no item id, not a list item) for single-statement components; same geometry as `KitRow` | `label`, `goto`, `leading`, `trailing`, `lineRole`, `leadingAlign`, `inset` md/none, `tone` (draws a tinted panel; the theme has `goodSoft`/`warnSoft`/`badSoft`), children |
| `KitRow` | One tappable or static row inside a card; leading and trailing centre on the first line | `item`, `label`, `goto`, `leading`, `trailing`, `lineRole` (first line's text role), `leadingAlign` line/row (`row` for a photo thumbnail taller than a line), `inset` md/none (`none` for a cell inside `KitGrid`), children |
| `KitText` | All text | `role` display/title/heading/body/label/caption/number, `tone`, `align`, `lines`, `tabular` (equal-width digits), `numberScale` display/compact (number role at body size), `part` (`null`: not addressed, inside a decorative drawing) |
| `KitIcon` | An icon from the catalog set | `name`, `tone`, `scale` sm/md/lg, `part`, `decorative` (no address; chevrons only) |
| `KitPhoto` | A photo reference | `photo`, `shape` thumb/round (beside text), wide/square/tall (full width), avatar (large round, centred, for a profile), `part` |
| `KitGrid` | Equal-width columns with aligned tops (facts, stats, tiles) | `columns` 2/3, children = cells |
| `KitEmpty` | The empty state (icon badge and shared line) | `icon`, `part`, `title`/`sub` (standalone), `fill` (full-height, centred), `tone` accent/good (badge colour), `decorativeIcon` (no `icon` address) |
| `KitAction` | A button, or an icon-only button | `label`, `icon`, `kind`, `goto`, `a11y`, `full`, `part` |
| `KitCheck` | A tick box with a 44px target | `done`, `label`, `part` |
| `KitTrail` | Row end: chevron, check, switch, value, badge | `kind`, `value`, `on`, `part` |
| `KitSkeleton` | Loading rows shaped like filled `KitRow`s | `rows`, `lead` dot/box/none, `inset` md/none (rows), `shape` rows/pairs/headline/media (a wide photo and three lines)/ring (a ring outline and two centred bars; `ring` md/lg)/trend (label and value bars left, a chart band right)/bars (a title bar over `rows` columns, default 7, at chart height) |

If the view needs something no base does (a pressable button, a progress ring, a checkbox), the task
says which new base to add under `src/kit/base/` (or `helpers/`) and its exact props. Never draw it
inside the component file. A new base is themed only through tokens, roles and `useKitStyle()`.

## Tests: `<Id>.test.ts`

Copy `List.test.ts` and keep its four blocks: every example parses; invalid inputs are rejected
(over-long text, too many or too few items, unknown enum values, unknown keys, raw colours); the
fallback validates with an empty cast, a cast with matching things and a malformed cast, and uses
placeholders when empty; probes are well-formed (a `codeOwned` component, built by code and never by the model, has only `read` probes; otherwise ≥2 choose with a near miss, 1 write, read if
actions). Rendering is covered by `test/conformance.test.tsx` automatically.

## The model gate

`pnpm llm:check --component <Id>` must print `All required probes pass.` before the component is
done, and the recordings it writes under `test/recordings/<Id>/` are committed. `pnpm test` replays
them. Each probe is sampled 3 times and passes on a majority (2 of 3); a probe that passes 2 of 3 is
printed `unstable`. Run it once per change and never re-run for a luckier result. If a probe fails or
is unstable, improve this component's `purpose`, `pick`, `aliases` or limits (or the example) and run
again. Never weaken a probe, and never edit another component to make yours pass;
report the conflict instead. A `choose` probe whose expected component is not built yet is skipped.

## Done means

All of these pass from the repo root: `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm build:catalog`, `pnpm llm:check --component <Id>` (choose, write and read probes), and
`pnpm look --component <Id>` prints `No issues.` The reading test (`test/reading.test.tsx`) proves
the text a model reads matches the screen and that every offered action exists with the right role;
a part that exists only for some prop values declares it in `actions.when`. An item rule reads the item first, then the component's props; a key `part.action` limits one action (`"root.toggle": { style: "filter" }`); `$first: true` matches only the first item. A component that draws only its first item (a card stack) sets `items.visible: "first"`: the reader reads it and adds "+N more", and conformance expects only `r1` on screen.

Then the look must pass `docs/visual-rubric.md`: look at every PNG yourself, then get the
`ui-reviewer` subagent (`.factory/droids/ui-reviewer.md`) to review it with fresh eyes, fix, and
repeat until it answers `APPROVED` (at most 3 rounds). The orchestrating agent then looks at the final
screenshots once, approves and merges.
