# packs/learning/components

Component files of the `learning` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/learning.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Lesson.tsx`
- `Quiz.tsx`
- `Flashcard.tsx`
- `Path.tsx`
- `Result.tsx`
- `Achievements.tsx`
- `Timetable.tsx`
- `Assignments.tsx`
- `Gradebook.tsx`
- `WorkedSolution.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
