# catalog/lines

The first steps from model text to a screen, so the ui can test and load screens without the harness.

Read plan 4.14 first.

- `parse-line.ts` recovers one JSON value (R1).
- `repair-component.ts` validates exact scoped ids, migrates saved inputs, and repairs wire props (R2).
- `repair-fields.ts` repairs schema fields, including nested objects and arrays.
- `stamp-ids.ts` allocates component and primary item addresses. Named collections keep their identity-based addresses.
- `assemble-screen.ts` produces a wire screen and keeps item addresses and counters alongside its components.
- `codes.ts` lists all R1/R2 repair codes.

The pipeline is pure and leaves ordering, screen/app repairs and rewrite id carry-over to the host.
Keep the returned counters to allocate more addresses without reusing deleted ones. A host using
persistent addresses passes `screen.itemIds[component.id]` and parsed view props to `stampItemIds`.
