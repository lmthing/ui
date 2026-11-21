# packs/home/components

Component files of the `home` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/home.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Chores.tsx`
- `Rewards.tsx`
- `CareSchedule.tsx`
- `Turns.tsx`
- `Agenda.tsx`
- `BabyLog.tsx`
- `Devices.tsx`
- `CameraFeed.tsx`
- `Routines.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
