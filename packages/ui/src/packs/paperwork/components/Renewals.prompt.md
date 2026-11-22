## Purpose

Act on obligations before their notice or expiry dates.

## Pick

Act on administrative renewals with separate notice and end dates, dated completion and local reminders. Not dates alone (Calendar), filing expiring documents (Documents), recurring payments (Bills), routine care (CareSchedule) or purchase warranties (Warranties).

## Writer

- Use actual dates in YYYY-MM-DD. noticeBy cannot be later than due. Omit completedOn unless a real completion date was supplied. Never write derived warnings or completion flags.
- Use style "cards" only for separate cards naming both dates; otherwise leave style null. Leave density and surface null unless requested.
- Exact defaults are density:null, surface:null, detail:null. A request for shorter rows sets only density:"compact"; never write detail:"full". Only a request to hide the owner sets detail:"brief"; keep both dates and leave unrequested axes null.
