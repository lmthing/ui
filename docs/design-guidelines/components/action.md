# Action, overlay and feedback

- **Anatomy:** `Button` and `Actions` name verbs and show one primary action. `Sheet` keeps the originating context, subject, close and action. `Success` keeps the reference and outcome plus one real next action. `SignInOptions` names the service and what stays available without it.
- **States:** Cover pressed, focused, unavailable, confirmed and actual pending, cancelled, rejected and accepted for host operations. Prevent duplicate submit while pending. Use review/undo for reversible changes and explicit confirmation for costly/destructive ones.
- **Variants:** Use declared `emphasis`, `arrange`, `detail`, `lead`, and semantic kinds, not a rainbow of emphasized buttons. Prefer inline result for a local toggle, a durable receipt for money or handoff, and a sheet only when focus must shift.
- **Motion:** Press feedback now, result cue after acknowledgement. Overlay follows the source/edge, its background is inert, Back cancels, focus returns. Reduced mode cuts or fades; the receipt never auto-vanishes if it carries the only record.
- **Do / don't:** “Request sent” and “Request approved” are distinct. Use danger or neutral for Decline, not the positive accent. Never show a confirmed outcome during a wait.
