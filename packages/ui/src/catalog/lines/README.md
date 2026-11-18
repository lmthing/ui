# catalog/lines

The first steps from model text to a screen, so the ui can test and load screens without the harness.

Built in step U1. Read plan 4.14 first.

Files (exactly these):

- `parse-line.ts` R1: strip fences, trailing commas, single quotes, close brackets, else drop
- `read-component.ts` R2: aliases, off-pack mapping, strip unknown fields, fill required from `fallback`, snap enums, icons, photo tags, clamp
- `stamp-ids.ts` unique component ids, item ids `r1`, `r2` from counters
- `assemble-screen.ts` parse, read, stamp, in order
- `codes.ts` the one list of repair codes (`R1.*`, `R2.*`)
- `index.ts`

Rules:

- Pure. Every repair is `(line, ctx) => { line, codes }` with a table of bad inputs as its test.
- Stop at R2. No region sorting, no demoting primaries (R3), nothing that needs an app. The harness calls these and adds the rest.
- `catalog:check` uses `assembleScreen` to validate every pack's `example.jsonl`.
