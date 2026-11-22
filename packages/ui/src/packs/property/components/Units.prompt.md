## Purpose

See who occupies each rental unit and the agreed rent on a chosen date.

## Pick

A tenant directory of names and profile links is List, not Units. Choose Units only to calculate rental-unit occupancy or agreed rent on a date from tenancy or stay records. Not owned stock (Things), an advertised place (Listing), or one agreement (Lease).

## Writer

- Use snake_case references. Every let must reference a unit in this line. Active lets for one unit must not overlap; the end date is exclusive, and cancelled lets do not count.
- A stay requires an end date and per "night"; a tenancy uses "week" or "month". Supply askingRent and askingPer together, or omit both. Do not write occupancy or totals.
- Do not copy unrequested photos, addresses or links from the example. A requested thumbnail sets only media to "thumb". Usual, regular or default spacing and surface mean null for density and surface, never explicit defaults.
- For a Vacancies view (vacant and notice-given units), set style to "vacancies". Otherwise set style to "register". Always write every supplied unit and let, even in the Vacancies view: the view, not the Writer, filters their visibility.
- For a tenancy described as on notice, write the given notice date in noticeGivenOn. Its end must be later than notice. Do not use a scheduled end alone as notice.
