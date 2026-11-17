# kit/registry

The part registry interface the host implements.

Built in step U2. Read plan 5.3 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `types.ts` `PartRegistry`, `Rect`
- `noop.ts` default
- `memory.ts` in-memory, for tests and the gallery
- `index.ts`

Rules:
- Rects are relative to the screen's content root, inside any scroll. The host adds scroll offset and projection.
- Interface in plan 5.3. The kit only calls `register` and `unregister`.
