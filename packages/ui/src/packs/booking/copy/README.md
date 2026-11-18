# packs/booking/copy

Pure copy and formatting owned by booking pack components, one file per component.
Use `index.ts` as the folder's door.

- `Appointment.ts`: booking labels, optional details and reading.
- `Availability.ts`: neutral working-week defaults, time-control labels and breaks.
- `ServiceMenu.ts`: booking cue.
- `Slots.ts`: availability labels, local end times, subtitles and hidden loading text.
- `StaffPicker.ts`: the no-preference provider label.
- `Waitlist.ts`: queue labels, compact counts and exact accessible counts.
- Tests live in `../tests/copy/<Id>.test.ts`.
- Shared dates, duration and money formatting stay in `catalog/copy`.
