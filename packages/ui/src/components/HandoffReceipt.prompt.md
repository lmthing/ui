## Purpose

Know who received a shared record and whether the hand-off still needs attention.

## Pick

One record passed between roles, showing its subject, reference, sender, recipient and delivery outcome. Not a local action confirmation (Success), a conversation (Bubbles), or an audit of many changes (ActivityLog).

## Writer

- `waiting` means sent but not yet acknowledged; `received` means the recipient acknowledged it; `returned` means it was handed back. Never infer receipt from sending or say the receiving work is complete.
- Keep the same reference on both roles' views. Supply an offset ISO timestamp only when known and a goto only for the underlying record's screen.
- Use detail "brief" when asked to hide the summary, while keeping the given summary in the data.
