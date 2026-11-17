# apps/gallery (private)

An Expo Router app, web first, that shows every component, pack, archetype, surface and theme.

Built in step U0 (skeleton), U2. Read plan 7 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `app/` routes, `fixtures/`, `e2e/`, `agent-hook.ts`, `tamagui.config.ts`

Rules:
- Uses the package's kit entry only, with its own `tamagui.config.ts` (kit tokens and themes, nothing else).
- `agent-hook.ts` exposes `window.__lmthingUI`: `read`, `act`, `log`, `reset`, on every page.
- A presets by modes switcher and a reduce-motion toggle on every page.
- Default exports are allowed in route files only.
- Nothing imports from `apps/`.
