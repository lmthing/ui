## Purpose

Record agreed decisions and follow-up actions with owners and sign-off.

## Pick

Official meeting minutes with agreed decisions, linked motions, owned follow-up and approval. Not a draft note (Composer), personal jobs (Checklist), long prose (Article) or a change audit (ActivityLog).

## Writer

- Use unique snake_case decision and action ids. Each action decisionId must match a decision in this record. Only link closed, uncancelled votes; do not write their outcomes again.
- Set both approval fields together or neither; approvedAt is an offset ISO datetime. Use style "actions" only for follow-up with decision links, not the official record.
- Write attendance only if taken. Use presentIds and apologiesIds for distinct membership ids; use an empty array when nobody belongs to a list.
