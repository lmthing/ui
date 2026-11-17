# catalog/address

The part address grammar: `screen/component[/item][/part]`, and `screen/~after:component` for a gap.

Built in step U1. Read plan 4.8 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `grammar.ts` the types and patterns
- `parse.ts` `parseAddress(s): Address | null`
- `format.ts` `formatAddress(a): string`
- `climb.ts` `climb(a)`: part, item, component, screen
- `index.ts`

Rules:
- Property tests: formatting a parsed address returns the original string.
- Component and item ids in addresses are instance ids (`l1`, `r2`), never generated or random.
- Part names are catalog names.
