# apps/gallery/app

Routes. No logic beyond choosing what to show.

Built in step U2 onward. Read plan 7 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `index.tsx` index of everything
- `components/[id].tsx` both examples and every state, in 3 presets x light and dark, with part outlines from the memory registry
- `packs/[id].tsx` a pack's components and its worked example
- `archetypes/[id].tsx` every layout's default screen with an empty and a full cast
- `themes.tsx` all 288 themes as swatches with contrast ratios
- `render/[fixture].tsx` one screen, no chrome, phone size, for screenshots
- `agent.tsx` a console to read a fixture and act on it

Rules:
- Default exports only here. A route file stays tiny: it picks data and renders kit components.
- `render/[fixture]` is what the gallery's own screenshot tests use. Keep it free of chrome and animation noise. Folded specs from the harness are rendered by `@lmthing/preview`, not here.
