# surfaces

Outside-the-app moments, drawn in front of the app in its own theme. Never placed on a screen by a model.

Files: `LockScreen.tsx` (notification, tier ok), `Widget.tsx` (home-screen tile, tier phone), `Message.tsx` (a text being sent, tier service), `index.ts`

Rules:
- Same file shape as a component (`meta`, `props`, `fallback`, `examples`, view) but `meta` is a `SurfaceMeta`: no `region`, `weight`, `group`, `items` or `actions`.
- Surfaces do not count toward a screen's 3 to 9 components.
- Rules and flow steps name a surface by id, for example `"surface":"LockScreen"`.
- The view receives the app's name and icon from the host. Never hard-code either.
- Plan: 4.2 (SurfaceMeta), 5.7. Built in U6.
