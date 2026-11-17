# packs/health/components

Component files of the `health` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/health.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Workout.tsx`
- `Exercise.tsx`
- `Measurements.tsx`
- `Medication.tsx`
- `HabitGrid.tsx`
- `Vitals.tsx`
- `SymptomLog.tsx`
- `Cycle.tsx`
- `ActivityRings.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
