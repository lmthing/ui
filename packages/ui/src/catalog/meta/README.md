# catalog/meta

The types every component, pack, archetype, surface and theme file satisfies.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `meta.ts` `Meta`, `SurfaceMeta`, `PackMeta`, `ArchetypeMeta`, `PresetMeta`, `AccentMeta`, `Slot`
- `pack-ids.ts`, `pack-ids.test.ts`: the 27 pack ids and type checks
- `pack-index.ts`, `pack-index.test.ts`: ordered pack names, purposes and pick lines; `PackMeta` owns only id, example and probes.
- `props.ts` `Props<S, M>`: the schema's output plus the `id` the validator stamps on each item of `M["items"]["key"]`

Rules:

- Types and plain pack index data only; no runtime functions.
- Copy `Meta` field by field from plan 4.2. `parts` defaults to `["root"]` plus item parts, `states` to `["filled"]`, `actions` to `press` on parts whose props include `goto`.
- `SurfaceMeta` has no `region`, `weight`, `group`, `items` or `actions`.
- Component ids are PascalCase and equal the file name.
- Meta has no repair aliases; historical names live only in catalog/migrations.
- `select?: { prop, value, mode?, parts? }` declares selection: `value` is `"index"` (zero-based), `"position"` (one-based), or `{ field: string }`; `mode: "flags"` projects `prop` on each row, otherwise on the component; `parts` maps named non-row controls to fixed values.
