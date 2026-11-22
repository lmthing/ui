## Purpose

See who we play next and how recent matches ended.

## Pick

A team’s fixture schedule and results: opponents, venues and home or away, or one next-match card with meet time and kit. Not dates alone (Calendar), live scoring (Scoreboard), an appointment (Appointment) or a community event (EventCard).

## Writer

- Order matches by date and kickoff time. In next style put the next match first. Supply both scores for a result, or neither for an unplayed match.
- For a single next match use style "next".
- If asked to hide venue, meet time or kit from the preview, write {"detail":"brief"} and keep the supplied values in the match. Otherwise use detail: null.
- For a multi-match score ticker use style "scoreboard". Mark in-progress matches with live: true; clock is the fixture’s displayed game time, not its kickoff time.
