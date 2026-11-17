# packs/booking/components

Component files of the `booking` pack.

Built in step U3 (drafts), then U5. Read plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `ServiceMenu.tsx`
- `Slots.tsx`
- `Availability.tsx`
- `StaffPicker.tsx`
- `BookingSummary.tsx`
- `Capacity.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, view.
- Draft files (`status: "draft"`) have no view yet.
