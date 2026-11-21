# packs/events/components

Component files of the `events` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/events.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `GuestList.tsx`
- `RSVP.tsx`
- `Seating.tsx`
- `Vendors.tsx`
- `Ticket.tsx`
- `Door.tsx`
- `Registry.tsx`
- `FindDate.tsx`
- `Sessions.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
