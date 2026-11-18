# catalog/format

Strict structured output for Writers. No provider I/O or component imports.

- `schema.ts`, `schema.test.ts`: Zod input conversion and strict object normalization.
- `writer-format.ts`, `writer-format.test.ts`: provider-ready `writerFormat(registry)` and `writerFormatFor(def)`.
- `writer-input.ts`, `writer-input.test.ts`: restore absent optional props before Zod validation.
- `index.ts`: folder exports.

Rules:
- Only scoped registry ids appear; code-owned components are excluded.
- Every object disallows extra properties and requires all keys. Optional inputs accept null.
- Consumers call `writerInput(def, props)` before the unchanged Zod validator.
- Refinements and computed output stay in code; formats retain expressible input constraints.
- Patterned strings keep their pattern; Azure rejects combined length bounds, so Zod checks those.
- Schema size uses JSON characters and the shared four-code-points-per-token estimate.
