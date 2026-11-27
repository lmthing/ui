# App craft and motion research

Research for the design-guidelines synthesis, November 2026. These are observations and proposals, not changes to the component guide, token catalog, or Writer contract.

| Reference                                       | Use it to decide                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Motion choreography](motion-choreography.md)   | What moves, what stays anchored, how springs and gestures settle, and how motion can be interrupted.    |
| [Motion feedback](motion-feedback.md)           | How selection, waiting, progress, numbers, failures and earned success look.                            |
| [Motion accessibility](motion-accessibility.md) | How to pair sensory channels, honor reduced motion, and review sequences.                               |
| [Distinctive craft](distinctive-craft.md)       | How recognizable apps express their purpose through hierarchy, illustration, type, copy and signatures. |
| [Component variations](component-variations.md) | How the same List, Card and Progress look and behave in fintech, wellness, logistics and kids' apps.    |

## Real app flows

- [Booking](flows/booking.md), [checkout](flows/checkout.md), [approvals](flows/approvals.md), [tracking](flows/tracking.md)
- [Onboarding](flows/onboarding.md), [messaging](flows/messaging.md), [search and filter](flows/search-filter.md), [settings](flows/settings.md), [profile](flows/profile.md)

At 390 wide, 20-unit gutters leave 350 units. Start with a stable header and status, 8–16 within a group and 24–32 between groups, and one priority action inset above the keyboard and safe area. Use 44 pt iOS, 48 dp Android and 44 CSS px web kit baselines for touch targets. Let large text make sections taller, not hide prices, times or confirmation controls.

For each asynchronous flow, name who owns the current state (phone, service, or another person), who can act, what Back does and what happens on relaunch. A button's loading, a flow's waiting, and a server's completed are different concepts. Preserve record identity from draft to receipt. See [motion feedback](motion-feedback.md) for pending and final cues.

The examples use a 390-wide logical viewport: CSS pixels on web, points on iOS, and density-independent units on Android, not hardware pixels. Values from Apple, Material, AndroidX and third-party accounts are identified as such; other numbers are kit baselines or explicitly suggested prototype values. Use roles and closed options in code, not raw values from this research.

Start with the [catalog](../../catalog/README.md) to choose a component, the [component guide](../../component-guide.md) for parts, actions and variants, and the [visual rubric](../../visual-rubric.md) for still-frame review. Add sequence review for motion. The app/host owns authority, preferences and service outcomes; the kit owns how those outcomes look.
