# catalog/archetypes

Seventeen data-only screen patterns, with 35 layouts. Each archetype file exports `meta`, `defaults` and
one compose probe per layout. `recipe.ts` defines alternatives, bounded repetitions and variants.

`defaultLines(meta, layout, cast, registry)` builds a finished default from catalog fallbacks and checks
it with `checkScreen`. `createRegistry().defaultLines(id, layout, cast)` is the host shortcut.

`runComposeProbes` checks model-written screens against their schemas, screen rules and required slots,
then optionally applies the clarity/focus/flow/content/structure rubric. Live recordings use
`pnpm llm:check --compose`; replay uses `--compose --replay`.

The 35 layout gates replay real required-model replies in `test/archetypes.test.ts`, including the text-quality rubric. Layout write hints preserve field/enum limits and improve coherent content without weakening the score.
