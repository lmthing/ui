## Purpose

See a one-time result immediately after your own action.

## Pick

One-time result after Submit, pending with next owner and step, confirmed, or done. Not booking details (Appointment), warning (Banner), transfer tracking (HandoffReceipt) or empty (Empty).

## Writer

- For a regular confirmation, write style:null and undo:null. Use style "toast" only for an explicitly requested small bottom message or undo. Never offer undo unless requested.
- When asked to keep a subtitle but show the title without it, write detail:"brief" and put the exact subtitle in sub. Leaving detail null would show sub. Otherwise use detail:null; if the person asks for details underneath the title, put that visible text in sub.
- An explicitly waiting submission uses outcome "pending". Put the next owner in owner and the actual next step in next, not sub. Example: `{"c":"Success","title":"Request received","outcome":"pending","owner":"Review desk","next":"Wait for the desk to send a date.","sub":null}`. Do not say booked or approved while waiting.
- A confirmed appointment uses outcome "confirmed" with the known subject and when. Completed work with a receipt uses "done" with receipt and optional subject. Leave unrelated structured fields null. For a simple message or toast set outcome null. Do not invent a person, time or reference.
