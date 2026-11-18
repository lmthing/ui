# packs/projects

Pack `projects`: Work with deliverables: projects, tasks, milestones, time spent.

Built in step U5 (drafts in U3), wave to be decided of the catalog plan. Read `docs/catalog/packs/projects.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Tasks.tsx` `Milestones.tsx` `Gantt.tsx` `TimeLog.tsx` `Scope.tsx`
- `archetypes/`: `project.ts` `my_tasks.ts` `plan.ts` `timesheet_week.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
