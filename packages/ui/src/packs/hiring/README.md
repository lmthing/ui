# packs/hiring

Pack `hiring`: Finding people or work: job posts, applicants, interviews, offers and your own applications.

Built in step U7 (drafts in U3), wave to be decided of the catalog plan. Read `docs/catalog/packs/hiring.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `JobPost.tsx` `ApplicantPipeline.tsx` `Candidate.tsx` `Interview.tsx` `Offer.tsx` `Applications.tsx` `JobFeed.tsx`
- `archetypes/`: `hiring_openings.ts` `hiring_pipeline.ts` `hiring_candidate.ts` `hiring_job_hunt.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
