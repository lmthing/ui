# packs

One folder per domain pack. A pack groups related components and archetypes. The Director picks up to 3 per app.

Folders (exactly these, 27 packs): commerce booking customers data social media learning money places team health mind kitchen home trips events inventory sports play requests community projects paperwork hiring property invest books

What each pack holds and why: `docs/catalog/packs/README.md` (`content` is renamed `media`).

Each pack holds: `index.ts`, `pack.ts`, `example.jsonl`, `components/`, `archetypes/` (at least 2 data files), and `tests/`.

Rules:

- `pack.ts` is plain data (`satisfies PackMeta`): `id`, `name`, `purpose`, `pick` (names the nearest other pack), `example`, plus `probes`: 3+ `pack` probes (two positive, one near miss).
- `pack.ts` never lists or imports components. The entry generator scans `components/` and `archetypes/`.
- The root `index.ts` exports `pack`, components through their door, archetypes through their door, and `example` as the exact JSON Lines text. Keep it synchronized with `example.jsonl`.
- Generated entries import only this root door. A missing scaffolded pack door fails generation with its path.
- Pack component files follow `src/components/` exactly. File name equals PascalCase id, unique across core and packs.
- A core alias never shadows a pack component the app has. Pack READMEs list the catalog plan's files.
- Order: U3 drafts for all, U5 `booking` and `customers`, U7 the rest; prerequisites, waves and gates follow [the pack build plan](../../../../docs/catalog/packs/build-plan.md).
- A pack enters live prompts only when every component is `ready` and its example validates. Plan: 4.4.
