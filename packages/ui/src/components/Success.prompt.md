## Purpose

Know an action worked, with its result and the saved item's details.

## Pick

A one-time outcome immediately after the person's own submission, booking or completed action. Not the appointment record (Appointment), a warning strip (Banner), a shared across-role transfer with sender/recipient acknowledgement (HandoffReceipt), or no content (Empty).

## Writer

- For a regular confirmation, write style:null and undo:null. Use style "toast" only for an explicitly requested small bottom message or undo. Never offer undo unless requested.
- When asked to keep a subtitle but show the title without it, write detail:"brief" and put the exact subtitle in sub. Leaving detail null would show sub. Otherwise use detail:null; if the person asks for details underneath the title, put that visible text in sub.
- For an explicitly waiting request use outcome "pending" with owner and next; do not say booked or approved. For an explicit confirmation with known subject and time use "confirmed" with subject and when. For completed work with a receipt use "done" with receipt and optional subject. Leave the other structured fields null, and use outcome null for a simple message or toast. Do not invent a person, time or reference.
