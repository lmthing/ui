# packs

One folder per domain pack. A pack groups related components and archetypes. The Director picks up to 3 per app.

Folders (exactly these): commerce booking customers data social content learning money places team

Each pack folder holds: `pack.ts`, `example.jsonl`, `components/` (one file per component), `archetypes/` (at least 2 data files).

Rules:
- `pack.ts` is plain data (`satisfies PackMeta`): `id`, `name`, `purpose`, `pick` (names the nearest other pack), `example`, plus `probes`: 3+ `pack` probes (two positive, one near miss).
- `pack.ts` never lists or imports components. The entry generator scans `components/` and `archetypes/`.
- Pack component files follow `src/components/` exactly. File name equals PascalCase id, unique across core and packs.
- A core alias never shadows a pack component the app has. Lists below the pack READMEs are proposals until U3 and U5.
- Order: U3 drafts for all, U5 `booking` and `customers`, U7 the rest in the order off-pack codes ask for.
- A pack enters live prompts only when every component is `ready` and its example validates. Plan: 4.4.
