# catalog/tokens

The fixed scales. The only place, with `themes/`, where raw numbers and colours may appear.

Built in step U1. Read plan 4.3 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `space.ts` 4 8 12 16 20 24 32 48
- `size.ts` control, icon, avatar
- `radius.ts` sm md lg xl pill
- `type.ts` seven roles with size, line height, weight
- `elevation.ts` flat card sheet
- `motion.ts` durations and springs
- `roles.ts` the 12 colour role names
- `component.ts`, `component.test.ts`: component tokens, fixed swatches and dot outline contrast

Rules:

- Copy the exact values from plan 4.3. Names are Tamagui token names.
- `component.ts` is the only home for a number one component needs that no shared scale covers.
- A lint rule rejects hex colours and pixel numbers outside `tokens/` and `themes/`.
