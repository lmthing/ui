# kit/interact

Human touches and agent actions share `createScreenController` (plan 5.9).

- `controller.ts` wires context, store, clocks, media, access and batch dispatch.
- `actions/` holds the action-name table and pure staged state/effect handlers.
- `runtime/` owns mounted state, projections, clocks and deferred host effects.
- `control-step.ts` and `controls/` validate and stage control values.
- `live-screen.ts` projects schema-owned props; drafts and cursors stay in the store.
- `store.ts` supplies host-shareable interaction state; `agent.ts` supplies read/act/log/reset.
- `media.ts` defines host media adapters; `use-control.ts` and `use-swipe.ts` connect views.
- `controller.test.ts` and `controls/controls.test.ts` preserve the original assertions.
- `index.ts` remains the door; existing direct-import paths remain supported.

Batches validate in order before committing; failed batches and dry runs run no effects.
Hosts own navigation, photo requests and media I/O. Preview and unmounted controls refuse actions.
