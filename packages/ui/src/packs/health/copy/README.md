# packs/health/copy

Pure copy owned by health pack components, one file per component. Use `index.ts` as the door.

- `Cycle.ts`: period-log label and the prediction disclaimer.
- `Exercise.ts`: form, equipment, result and add-to-workout wording and reading.
- `ActivityRings.ts`: one labelled goal reading, preserving actual values and units.
- `CardioSession.ts`: endurance metrics, split comparisons and readings.
- `TrainingPlan.ts`: week and program completion, localized schedule readings and visibility.
- Tests live in `../tests/copy/<Id>.test.ts`.

Put new words and grammar in `../lang/en.ts`; helpers here take the app `lang`.
