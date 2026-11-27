# Patterns and flows: one job, coherent states

Prefer a familiar path with a distinct moment over a novel path everywhere. The layout choices below come from M3's canonical examples; task examples and verification are applications to a 390-wide phone, not additional Material mandates.

## Pick the layout by how people navigate

| Pattern             | Compact (390)                                                                                                                               | Larger windows                                                                                                                                           | State to retain                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **List-detail**     | List of records and a separate full-width detail with Back. The displayed record is the one opened, not the first result reloaded.          | Two panes when both are comfortably readable; visually select the record in the list and use persistent detail.                                          | Open record identity, scroll/filter/query, per-record draft, and logical keyboard focus. If the record disappears, show its fate and give a recovery path. |
| **Feed**            | A vertical feed with one dominant card or some coherent pairs; let a rail show short previews with a full collection escape.                | More columns or a second pane, with focal groups instead of stretching everything.                                                                       | Scroll anchor/content identity when the number of columns changes. Loading, empty and errors are scoped to the affected area.                              |
| **Supporting pane** | One main task, with supplemental content in a sheet, inline section or separate view. Examples: video with Up next; document with comments. | Separate primary and supporting panes; Android's example allocates roughly 70/30, and current M3 shows a fixed 360 dp trailing option when space allows. | Main task's cursor/playhead and support item selection. Close support without leaving the task.                                                            |

Top-level destinations are peers (quick fade); chronological steps or family tabs can use a directional transition; committed opening of the same object may transform its container. Platform history or system back should undo the navigation, not accidentally redo the originating action.

### For lmthing

Start from archetypes in `src/catalog/archetypes` and map the same stable record across `List`, `FileList`, `Card`, `Gallery`, `Player` and `Sheet`; compare against the existing catalog purpose text. Gap: explicit detail return and state retention through adaptive layout, and a predictable escape from optional support content.

## Entry, discovery and permissions

Use quickstart when the main action is recognizable; teach beside the action and let the user try it. A short self-select flow works when a choice materially changes what is shown next. Explain unfamiliar value only as much as needed, don't mix a product tour and a questionnaire, and don't show onboarding again to a returning user who finished it. Ask for device permissions when the feature is used, explain what it unlocks, and treat denial as an ordinary state with another route where possible.

At 390 let one action lead. Example: `Add a plant` on the first empty collection, then optional `Take a photo` or type a name instead. Use a compact title and two reachable actions, not a carousel before the person can start. Opening the relevant picker may be expressive; do not replay entrance effects on every back navigation. Android permission UI is system-owned; web prompts have different timing and browser-specific grants. The app cannot claim approval before either reports it.

### For lmthing

`Hero`/`Steps`/`Choice`/`Button` can start an unfamiliar task; `Empty` and `Search` are better for immediate use. Preserve the spec's no-account start, optional host permissions and typed equivalent to voice. Gap: flow template fixtures from first empty state through skip/deny and the first useful outcome, not through a row of feature slides.

## Forms, recovery and feedback

- **Before:** Name the task and make prerequisites/units clear. Put related fields together, label optional/required unambiguously, and present one primary submit. If the task needs several screens, keep Back and the draft; show truthful progress only if meaningful.
- **During:** Give immediate pressed feedback, validate at an appropriate point, and put actionable errors by the source; prefer focus first invalid field after unsuccessful submit, with a summary if errors are spread out. Keep partial values. Indicate pending separately from committed and guard accidental repeat submissions without losing keyboard focus.
- **After:** Distinguish first-use empty (what to add), no matches (change query or filters), offline with cached data (what's still usable), and failed (retry or another route). Confirm routine success in context with the updated item; add a snackbar only if useful. Use Undo for a reversible action when the system can really restore it. For hard-to-reverse changes, ask with neutral consequence copy and a clear safe exit, then commit only after confirmation.
- **Handoffs:** Tell the person when work leaves the current context, whether they need permission, another person or a service, and whether they return with a draft, receipt or result. Never show a “sent” animation for an enqueue or mock-only action. A cross-device or outside-app handoff should carry meaningful context rather than copy the entire phone UI.

### For lmthing

Use `Field`, `Composer`, `Empty`, `Banner`, `Success`, `HandoffReceipt` and kit confirmations. Follow the component guide's distinction between cached-but-usable `filled`, no usable data `error`, and host acknowledgement for authoritative state. Gap: rehearse journey fixtures for waiting, failure after optimistic feedback, retry, duplicate press, return with draft, and every tier boundary. Inspect flow clips and end states as well as screenshots.

Sources: [M3 canonical layout examples](https://m3.material.io/foundations/adaptive-design/canonical-layouts) · [Android canonical implementations](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts) · [Android onboarding](https://developer.android.com/design/ui/mobile/guides/patterns/onboarding) and [permission requests](https://developer.android.com/training/permissions/requesting) · [Legacy Material empty states](https://m2.material.io/design/communication/empty-states.html) · [M3 field validation](https://m3.material.io/components/text-fields/guidelines) · [Dialogs](https://m3.material.io/components/dialogs/guidelines) · [Snackbars](https://m3.material.io/components/snackbar/guidelines).
