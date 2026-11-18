# packs/home

Pack `home`: Running a household: chores, family, pets, plants, cars, the house and its devices.

Built in step U7 (drafts in U3), wave 2 of the catalog plan. Read `docs/catalog/packs/home.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Chores.tsx` `Rewards.tsx` `CareSchedule.tsx` `Turns.tsx` `Agenda.tsx` `BabyLog.tsx` `Devices.tsx`
- `archetypes/`: `family.ts` `kids.ts` `care.ts` `baby.ts` `house.ts`

`Devices.tsx` includes focused thermostat controls, sensor ranges and saved scenes; `house.ts` holds all three device layouts. No separate climate, scene or sensor files.

Rules:

- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
