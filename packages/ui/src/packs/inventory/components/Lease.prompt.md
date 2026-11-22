## Purpose

See one rental agreement, when rent is next due and when to renew.

## Pick

One existing rental agreement with tenant, term, rent cadence, due day, deposit and calculated time left or renewal warning. Not static facts (KeyValue), terms to sign (Agreement), a bill (Bills), or a list of rental units (Units).

## Writer

- End must be after start. For monthly rent write the due day of the month (1–31); for weekly rent write the weekday (Monday 1, Sunday 7). Never write the computed next due date, progress or renewal status.
- Keep the start date and deposit in the record even when hidden. To hide them without any other presentation change, use {"detail":"brief"}. With no presentation request, use {"detail":null}.
- Write null for any unrequested variant.
