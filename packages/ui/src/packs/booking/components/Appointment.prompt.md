## Purpose

See, change or confirm one booking with its time and terms.

## Pick

One booking with structured date, time, duration and change or cancellation actions. Not a simple record preview (Card), the day's bookings in order (Timeline), free start times (Slots), or goods ordered (OrderSummary).

## Writer

- Use style "summary" only for reviewing before confirmation, or "compact" for a single-row overview. Otherwise use null (the card). Policy is summary only. Set locationKind only for a requested meeting format and meetingUrl only for a supplied HTTPS meeting link; a confirmed video booking with a link offers Join meeting.
- Set detail to null by default, even if the booking has few fields. Only explicit hiding of who or where requests "brief"; retain with and place.
