## Purpose

Join or leave the queue for a full session and see your place.

## Pick

A full session's waiting queue: join, leave, view queue position, or review an offered spot. Not capacity or progress toward a target (Progress), or a confirmed booking (Appointment).

## Writer

- Leave detail null unless requested. For a joined queue with a known position, detail "brief" shows the position without the number ahead; retain ahead in the data.
- An explicitly offered spot is not a reservation. For a joined waitlist only, set both respondBy (the local deadline, e.g. "Thu at 5:00 PM") and goto (the spot review screen id). Omit both while still waiting, including when zero people are ahead.
