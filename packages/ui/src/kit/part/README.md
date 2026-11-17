# kit/part

How `part="title"` and `<KitRow item={id}>` become addresses.

Built in step U2. Read plan 5.5 and 5.9 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `part-context.ts` context holding screen, component and item ids
- `usePart.ts` returns `{ ref, onLayout, testID }` plus accessibility props
- `index.ts`

Rules:
- `testID` is the full address (`home/l1/r1/title`). Web renders it as `data-testid`.
- On layout a part measures itself relative to the screen root, batched per frame, and registers with `PartRegistry`. Unmount unregisters.
- Addresses never contain generated or random parts.
