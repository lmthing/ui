# packs/trips/components

Component files of the `trips` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/trips.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Itinerary.tsx`
- `Reservation.tsx`
- `PackingList.tsx`
- `Weather.tsx`
- `TravelDocs.tsx`
- `Converter.tsx`
- `Clocks.tsx`
- `FlightStatus.tsx`
- `BagTracker.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
