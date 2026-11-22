## Purpose

See which dates have something planned and open a day.

## Pick

Days of a week or month, with dates marked for planned activity or a check-in and check-out range. Not events with times in order (Timeline) or separate things to browse (List).

## Writer

- Write JSON null for an unrequested emphasis or day tone. Never write emphasis "normal" just to apply the default. Use "quiet" only for an explicitly subdued month heading. A dot without a requested status needs only the day.
- For check-in and check-out use range: true, a display month, and yearMonth "YYYY-MM"; use checkIn and checkOut as full ISO dates in that month for a preselected span, not selected. Use unavailable for blocked day numbers.
