# catalog/meta

The types every component, pack, archetype, surface and theme file satisfies.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `meta.ts` `Meta`, `SurfaceMeta`, `PackMeta`, `ArchetypeMeta`, `PresetMeta`, `AccentMeta`, `Slot`
- `pack-ids.ts`, `pack-ids.test.ts`: the 27 pack ids and type checks
- `pack-index.ts`, `pack-index.test.ts`: ordered pack names, purposes and pick lines; `PackMeta` owns only id, example and probes.
- `props.ts` `Props<S, M>`: the schema's output plus the `id` the validator stamps on each item of `M["items"]["key"]`
- `clocks.ts`: `ClockMeta`, `ClockTrigger`, `ClockState`; `clocks?: readonly ClockMeta[]` lives on meta, items or items.nested. Each `{ id, kind: "up" | "down" | "until", from?, prop?, at?, max?, when?, start?, stop?, reset?, zero? }` owns a clock: from reads a local numeric prop (then component prop, absent means zero), prop receives live seconds; until reads a date plus optional at and ticks without controls. No start means automatic. Triggers `{ part, action, scope?: "component", value?: boolean, state? }` use declared actions, local item addresses or indexed `part_M` nested addresses; component scope can stop all rests. A boolean value gates side effects, not the toggle. Reset restores the seed and stops. Zero defaults to stop or sets `{ state }` on the component / `{ prop, value }` on the holder. Live numeric props must admit zero and any declared cap; ids and projected props must be unique per holder (conditional alternatives may share them).

Rules:
- Types and plain pack index data only; no runtime functions.
- Copy `Meta` field by field from plan 4.2. `parts` defaults to `["root"]` plus item parts, `states` to `["filled"]`, `actions` to `press` on parts whose props include `goto`.
- `SurfaceMeta` has no `region`, `weight`, `group`, `items` or `actions`.
- Component ids are PascalCase and equal the file name.
- Meta has no repair aliases; historical names live only in catalog/migrations.
- `select?: { prop, value, mode?, parts? }` declares selection: `value` is `"index"` (zero-based), `"position"` (one-based), or `{ field: string }`; `mode: "flags"` projects `prop` on each row, otherwise on the component; `parts` maps named non-row controls to fixed values.
- `items.nested?: { key, parts: { [part]: { action: "toggle" | "set", prop, min?, max?, integer?, when? } } }` declares sub-item controls at `rN/<part>_M` (M one-based). `prop` owns the nested value; numeric limits use shared validation; `when` names another declared part whose prop must be true. Values project into `props[items.key][N-1][items.nested.key][M-1][prop]`; toggles do not change other props. Nested declarations own their actions, replacing duplicate indexed item actions.
