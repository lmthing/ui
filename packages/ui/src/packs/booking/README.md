# packs/booking

Pack `booking`: Booking time with someone: appointments, classes, slots.

Built in step U5 (drafts in U3), wave 1 of the catalog plan. Read `docs/catalog/packs/booking.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `ServiceMenu.tsx` `Slots.tsx` `Availability.tsx` `StaffPicker.tsx` `Appointment.tsx` `Waitlist.tsx` `ClassRoster.tsx` `SessionPack.tsx`
- `archetypes/`: `book.ts` `appointments.ts` `schedule.ts` `hours.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
