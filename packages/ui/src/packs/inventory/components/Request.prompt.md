## Purpose

Review one rental repair and share its status and brief updates.

## Pick

One rental-repair summary with location, priority, status, assignee and short updates. Not a history-only view (Timeline), any queue, triage, conversation, work order or request workflow (requests pack), staff leave (Approval), or a general board (Board).

## Writer

- Use new, booked or fixed. Include up to four short updates, each with a time label. Never write a second request, thread, workflow or separate work order.
- Visibility is separate from whether the record has a photo. "Without the photo", "hide the photo" or "text only" must output "media":"none", even if you also output "photo":"local:1". Ordinary requests use "media":null.
- For a generated image, use `item` or `product` in `photo`. Use only to illustrate the requested item, never to document the request. Keep any supplied reference. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
