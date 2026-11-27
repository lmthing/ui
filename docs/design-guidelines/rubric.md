# Design review rubric

Use the [principles](principles.md), a [family page](components/README.md), and the [motion contract](motion.md). Review the `calm` preset at 390 logical units in light mode as the reproducible baseline, not as proof of dark mode, high text scale, native or keyboard parity. When comparing app identities, add paired captured examples where the task asks for them.

## Evidence

- For a component, run `pnpm look --component <Id> --widths 390 --preset calm --mode light`. Read `packages/ui/shots/<Id>/issues.json`, `390-light.png`, `390-light-marks.png`, and relevant variants if captured. List is a reference for common rails and roles, not a requirement for each component to have List's structure.
- Supply actual normal and reduced-motion contact sheets for the key path, with viewport/preset/mode and trigger labeled. Include source, intermediate with elapsed time, settled result and reverse/cancel when applicable. For a flow include each affected role, a waiting/error path and the return target. When an event deliberately has no animation, include consecutive frames or a measured no-movement statement; do not invent motion from a still.
- Name the fixture and note what was actually interactive or host-simulated. Don't use time slices from a storyboard as interaction evidence. Show a meaningful change and its keyboard/focus behavior in a trace or notes if it can't be read in the pixels. If evidence is missing, record the precise missing check and don't approve that part.

## Static

| ID                            | Pass when                                                                                                                                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 · Hierarchy and identity   | The current object and status read first; only one bold moment/primary CTA dominates. Two different businesses don't just recolor the same cards. Example facts, units and names fit the business.                                                                                     |
| S2 · Geometry                 | Gutters and repeated roles align, numeric columns share an end edge, groups have more separation than their contents, and loading keeps reserved geometry. Nothing overlaps or clips; meaningful labels reflow instead of ellipsizing. Last rail item and bottom action are reachable. |
| S3 · Typography and semantics | At most three sizes per ordinary component or repeated item, including actions. Hierarchy survives larger text. Meaning and state survive grayscale; contrast and target baselines in Principles P9 are met, or explicitly marked unverified.                                          |
| S4 · Surfaces and media       | Color, shape and depth signal role. Destructive treatment isn't the positive accent. Crops, fallback and icon labels preserve identity. Quiet surfaces do not compete with the focal object.                                                                                           |
| S5 · States and copy          | First-use, filtered empty, waiting, unsupported/denied, retry and accepted status differ where relevant. Use specific empty copy when required. A result names the same record, actual outcome and one safe next action.                                                               |
| S6 · Affordance and variants  | Clickable parts, disabled parts and inspect-only examples look different; gestures have alternatives. Match the same fixture across selected variants; differences are visible, values and material facts survive, and advertised actions match visible parts.                         |

## Motion

| ID                         | Pass when                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 · Entry                 | First usable frame is complete; any subsequent reveal has a purpose. No blank stagger, invisible controls or decorative loops at rest.                                                          |
| M2 · Continuity            | Source, midpoint and end show the same object/anchor with a meaningful direction or intentional cut. Neither type, persistent controls nor an unchanged row stutters or jumps.                  |
| M3 · Feedback              | Local acknowledgment is immediate. Pending differs from accepted, the earned cue runs once, and the lasting result reads without motion, sound or color.                                        |
| M4 · Interruption and exit | Repeat, reverse, cancel, Back and drag re-grab reach the correct state without stale commits. Exiting controls are inert and out of the focus/reading order; focus and scroll return logically. |
| M5 · Reduced motion        | No travel, zoom, count-up or stagger. Use a short fade or cut and leave the same readable status, geometry, targets and outcome.                                                                |

Report numbered findings in impact order, cite rule ID, frame/time and what to change. Mark shared-kit findings `(base)` and name the owning file if known. Report cross-repo observations separately from catalog defects. Reply `APPROVED` only if the required evidence is present and no finding remains.
