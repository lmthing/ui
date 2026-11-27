# Motion: explain what happened and where it went

Start with the relationship, not a curve. A change can acknowledge a press, maintain the identity of an object, show where the user is moving, or indicate real work. Motion is successful if its removal would cost orientation or feedback, or if a deliberately rare signature makes a meaningful moment memorable. The component's selected state, destination, progress, or outcome must still read without it.

## Physics tokens: what to move, and how quickly

M3 Expressive introduced two motion schemes in 2025: **Standard** for restrained utility and **Expressive** for more visible spatial bounce. Each has fast, default, and slow pairs. Spatial springs change position, shape, rotation or size; effects springs change color or opacity, so they must not overshoot. Start with fast for local control feedback (toggle thumb), default for part-screen movement (sheet, rail), and slow for a large spatial change. These are relative speeds, not fixed milliseconds.

| Compose motion token (`speed.property`) | Standard damping ratio / stiffness | Expressive damping ratio / stiffness |
| --------------------------------------- | ---------------------------------- | ------------------------------------ |
| `fast.spatial`                          | 0.9 / 1400                         | 0.6 / 800                            |
| `default.spatial`                       | 0.9 / 700                          | 0.8 / 380                            |
| `slow.spatial`                          | 0.9 / 300                          | 0.8 / 200                            |
| `fast.effects`                          | 1 / 3800                           | 1 / 3800                             |
| `default.effects`                       | 1 / 1600                           | 1 / 1600                             |
| `slow.effects`                          | 1 / 800                            | 1 / 800                              |

These are AndroidX Compose defaults for the `md.sys.motion.spring` concepts, not lmthing spring configs. Damping ratio 1 is critical damping (no natural overshoot from rest), not a raw damping coefficient. If a library uses mass `m`, stiffness `k` and damper coefficient `c`, convert using $c = 2\zeta\sqrt{km}$ for matching damping ratio $\zeta$ and matching physical units; do not paste `0.8` into a coefficient setting. Measure the result because integration, units, rest thresholds and overshoot clamping vary. At rest start with zero velocity; on reversal or release, retarget from the current position and appropriate velocity. Keep numeric sliders, windows, and opacity within valid bounds.

Native Compose exposes `MotionScheme`. On web, sample a spring into CSS `linear()`/WAAPI keyframes for a non-interruptible decorative playback or use a runtime spring for gestures and reversals. A precomputed replay alone cannot preserve arbitrary velocity on retarget. Prefer transform and opacity for travel and size where possible; a masked container or shape path may cost paint, so check on a representative device. Avoid per-frame app state updates for direct manipulation.

### For lmthing

The kit's `animate`, `KitMotion` and `KitPresence` already use catalog springs. Keep `motion` a closed theme choice, not per-view numbers or model instructions. Gap: distinguish spatial and effects intent by name and define how interrupted gestures (`Sheet`, `SwipeStack`, `Scale`) retain velocity and settle on native and web.

## Timed easing and duration

The M3 transition pages still describe the preceding easing/duration system; it is not the new default for component motion. Choose by path: an already-visible object moves with an in/out curve; entry decelerates into a stable position; a permanent exit accelerates away. A temporary exit that may quickly reverse should not imply spatial dismissal. `linear` is for genuinely constant-rate change (not ordinary placement).

| Family     | On-screen change                                | Enter                         | Exit                          |
| ---------- | ----------------------------------------------- | ----------------------------- | ----------------------------- |
| Standard   | 300 ms, `cubic-bezier(0.2, 0, 0, 1)`            | 250 ms, `(0, 0, 0, 1)`        | 200 ms, `(0.3, 0, 1, 1)`      |
| Emphasized | 500 ms, use the emphasized path where supported | 400 ms, `(0.05, 0.7, 0.1, 1)` | 200 ms, `(0.3, 0, 0.8, 0.15)` |

Linear is `(0, 0, 1, 1)`. The emphasized main easing is originally a two-segment path (Android MDC uses `M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1`); Compose's generated **cubic approximation** is `(0.2, 0, 0, 1)`. Do not call the approximation the original path. Standard is a supported fallback when the full emphasized curve is impractical. Legacy duration token steps in ms: **short** 50/100/150/200; **medium** 250/300/350/400; **long** 450/500/550/600; **extra-long** 700/800/900/1000. The values in the table are suggested pairings, not the runtime of every transition. Use the low end for small actions; above 600 belongs to exceptional ambient effects, not blocking taps.

### For lmthing

Use named kit timing roles for effects that genuinely need a timeline (cross-fades, small acknowledgement, stagger); do not transplant the full legacy scale just to set one timeout. Keep logical availability and focus independent of prolonged animation. Gap: record the intended relationship, a reference curve/duration or spring role, and a reduced counterpart for each shared recipe.

## Pick the transition by relationship

| Pattern                  | Use when                                                                                                                 | Choreography and failure cases                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Container transform**  | The same card, mail, thumbnail, search field or FAB truly becomes a detail or task surface.                              | Carry the container's bounds, shape and focal anchor; fade the source's inner elements while revealing the destination inside it. Reverse to that object if still measurable; otherwise use a simple fade. Avoid on every level of deep navigation, between unrelated records, or across unmatched imagery.          |
| **Shared axis**          | Two views are sequential or spatially related but aren't the same object: steps in setup, or peer pages in ordered tabs. | Fade plus a small translation on X/Y or scale on Z; reverse sign for reverse travel. RTL changes logical X. Preserve stable chrome. Native forward/back usually uses platform defaults today; do not force a custom shared axis over interactive system back. Use lateral animation only if there is truly an order. |
| **Fade through**         | Content is replaced without spatial continuity: top-level sections or a filter result set.                               | Fade the outgoing content before the incoming content takes prominence; a small incoming scale is optional in the earlier implementation. Do not slide unrelated destinations left/right. The M3 top-level recommendation is a quick fade; retain navigation and its active marker while content changes.            |
| **Fade**                 | A local object appears/disappears without a meaningful spatial origin: short status, tooltip, scrim.                     | Animate opacity only where appropriate and retain geometry. For an anchored sheet or menu, combine surface entry with an effects fade on the scrim/content, when movement is allowed. A fade alone should not imply a hierarchy change.                                                                              |
| **Skeleton replacement** | Content needs a placeholder and the final geometry is known.                                                             | Use stable edges, reserved image ratio and likely line lengths; reveal actual content without resetting scroll. Do not flash placeholders for instant loads or expose each skeleton fragment to access technology.                                                                                                   |

Google's earlier Android motion library names the first four patterns; newer M3 separates forward/back, lateral, top-level, enter/exit and skeleton guidance. The intent survives the changes in names. Android predictive back previews the existing destination and cancels back to the original state; an app should not publish navigation or undo changes before commit. On web support history/Escape where appropriate rather than requiring edge swipes.

### For lmthing

`Card`, `List`, `Gallery` and `Search` are container-identity candidates only when host identity and source bounds are trustworthy. `Steps` and `Segmented` are ordered/stateful only where the journey says so. `TabBar` should keep place while panels fade; `Sheet` and confirmations already own overlay/focus behavior. Gap: a transition relationship derived from the route/record and testable return fallback, not a Writer-selected animation.

## Choreograph and review a complete contract

1. **Enter:** acknowledge activation immediately. Let one element lead; place secondary fades behind it, not as competing entrances. Keep heading and controls usable while decorative work settles. For a sheet, start the scrim and surface together; give focus to the dialog after it is present and make the background inert throughout.
2. **Change:** anchor stable items and boundaries. Animate the moving thumb, selected indicator, or row you changed, not the full screen. Measured progress is monotonic unless the actual work restarts; indeterminate movement never passes as a percentage. Preserve input and the latest target if a second tap comes in early.
3. **Feedback:** show an immediate pressed state separate from a network outcome. Reveal saved/failed status only when true. Lead with a durable check, label, or value, and add a single celebratory effect only for a meaningful milestone.
4. **Exit:** stop hit testing and announcements on noninteractive exiting elements; restore focus to the opener or the nearest safe neighbor. Reversal or gesture cancel restores the original state without duplicate action. Never make dismissal wait for a decorative loop.
5. **Reduced:** replace travel, parallax, bounce, shape morph and stagger with an instant settle or subtle opacity change; keep the exact same controls and results. Use host preference and web `prefers-reduced-motion`. Do not make an undisclosed sound or haptic the only substitute.
6. **Review:** capture before, first feedback, travel, settle and return/cancel; check frames for anchor jumps, duplicate content and unreadable mixing. Then exercise quick repeat/reversal, slow host response, keyboard focus, hardware back and reduced motion. Native and web need separate runs, including CPU-constrained devices; a still cannot establish ordering or responsiveness.

### For lmthing

`kit/motion` already documents an 8-point arrival rise, 40 ms stagger capped at six, immediate agent end states, reduced-motion cross-fades, and no idle loops. `kit/signature` documents cue-owned one-shot effects. The gap is a reviewable enter/change/feedback/exit/reduced contract for each family, including state under interruption and evidence from frames plus live input. Keep motion choices in kit/theme; preserve part addresses and agree with the stage's hand-first rule.

Sources: [M3 motion physics](https://m3.material.io/styles/motion/overview/how-it-works) · [Compose motion theming article](https://m3.material.io/blog/m3-expressive-motion-theming) · [Standard springs](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt) · [Expressive springs](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt) · [Timed guidance](https://m3.material.io/styles/motion/easing-and-duration/applying-easing-and-duration) · [Compose easing values](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt) · [MDC motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) · [M3 transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns) and [application](https://m3.material.io/styles/motion/transitions/applying-transitions) · [Four patterns in Reply](https://m3.material.io/blog/android-material-motion) · [Predictive back](https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back).
