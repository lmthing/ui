# apps/gallery (private)

A web-first gallery using kit tokens and Tamagui.

- `/`: grouped component cards, one first-example preview each; filter by id or purpose.
- Expand cards independently, or use Expand all / Collapse all for the catalog.
- Group headings link to anchors such as `/#content`.
- `?c=List`: the full example/state × preset × mode grid for one component.
- `?c=List&preset=calm&mode=light`: filter that grid for screenshot tooling.
- `?c=List&w=390&mode=light`: phone-screen frames used by `pnpm look`.
- `?controls=form`: interactive control fixtures (also choice, chat, lists, etc.).
- `?runtime=1`: runtime composition fixture.
- `?motion=ring_fill`: one signature-motion preview.

The original `preview_*` test ids and `data-look-frame` markers remain stable.
Nothing imports from `apps/`; default exports are allowed only in route files.
Do not start the shared fixed-port gallery for review. Use `galleryConfig(0)`.
