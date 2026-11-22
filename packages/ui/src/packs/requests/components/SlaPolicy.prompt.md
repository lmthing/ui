## Purpose

Track contractual first-response and resolution deadlines for a request.

## Pick

Track the service-level policy and both first-response and resolution targets on one ticket, including missed targets. Not a generic countdown (Timer), an operational queue (RequestQueue), or static policy facts (KeyValue).

## Writer

- Use ISO date-times with seconds and a UTC offset (Z for UTC). Order the opening, response deadline and resolution deadline chronologically. Only set an event timestamp when that event has happened. Never write the computed statuses or countdown.
- When both targets should be visible, output detail null; the default is the full tracker. Only if the brief explicitly asks for a single badge/countdown row, set detail to "brief". Keep every timestamp. Set surface and density to null unless separately requested.
