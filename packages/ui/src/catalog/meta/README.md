# catalog/meta

The types every component, pack, archetype, surface and theme file satisfies.

Built in step U1. Read plan 4.2 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `meta.ts` `Meta`, `SurfaceMeta`, `PackMeta`, `ArchetypeMeta`, `PresetMeta`, `AccentMeta`, `Slot`
- `props.ts` `Props<S, M>`: the schema's output plus the `id` the validator stamps on each item of `M["items"]["key"]`

Rules:
- Types only, no runtime code except what `Props` needs (none).
- Copy `Meta` field by field from plan 4.2. `parts` defaults to `["root"]` plus item parts, `states` to `["filled"]`, `actions` to `press` on parts whose props include `goto`.
- `SurfaceMeta` has no `region`, `weight`, `group`, `items` or `actions`.
- Component ids are PascalCase and equal the file name.
