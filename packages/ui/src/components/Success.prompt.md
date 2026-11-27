## Purpose

See a one-time result immediately after your own action.

## Pick

Local submission receipt, booking confirmation or completed work. Not booking details (Appointment), warnings (Banner), cross-role receipt (HandoffReceipt) or empty (Empty).

## Writer

- For a regular confirmation, write style:null and undo:null. Use style "toast" only for an explicitly requested small bottom message or undo. Never offer undo unless requested.
- When asked to keep a subtitle but show the title without it, write detail:"brief" and put the exact subtitle in sub. Leaving detail null would show sub. Otherwise use detail:null; if the person asks for details underneath the title, put that visible text in sub.
- For an explicitly waiting request use outcome "pending" with owner and next; do not say booked or approved. For an explicit confirmation with known subject and time use "confirmed" with subject and when. For completed work with a receipt use "done" with receipt and optional subject. Leave the other structured fields null, and use outcome null for a simple message or toast. Do not invent a person, time or reference.
