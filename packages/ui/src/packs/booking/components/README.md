# packs/booking/components

Component files of the `booking` pack.

Built in step U3 (drafts), then U5. Read `docs/catalog/packs/booking.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `ServiceMenu.tsx`
- `Slots.tsx`
- `Availability.tsx`
- `StaffPicker.tsx`
- `Appointment.tsx`
- `Waitlist.tsx`
- `ClassRoster.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
