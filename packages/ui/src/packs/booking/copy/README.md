# packs/booking/copy

Pure copy and formatting owned by booking pack components, one file per component.
Use `index.ts` as the folder's door.

- `Appointment.ts`: booking labels, optional details and reading.
- `ClassRoster.ts`: localized session date and attendance counts.
- `Availability.ts`: neutral working-week defaults, time-control labels and breaks.
- `ServiceMenu.ts`: booking cue.
- `SessionPack.ts`: session credit, expiry, and action copy.
- `Slots.ts`: availability labels, local end times, subtitles and hidden loading text.
- `StaffPicker.ts`: the no-preference provider label.
- `Waitlist.ts`: queue labels, compact counts and exact accessible counts.
- Tests live in `../tests/copy/<Id>.test.ts`.
- Shared dates, duration and money formatting stay in `catalog/copy`.

Put new words and grammar in `../lang/en.ts`; helpers here take the app `lang`.
