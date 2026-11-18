# Pack build plan

How the planned packs become built, ready packs. The pack files say **what** each pack is; this file
says **how and in what order** they are built. Rules every pack follows: [README](README.md). Component
contract: [component guide](../../component-guide.md). Plan steps U5 and U7 of the
[implementation plan](../../implementation-plan.md) point here.

## How packs relate to the core

A pack screen is mostly core: across the pack archetypes, core ids appear about three times as often as
pack ids. Pack components fill only what the core cannot say ("core first"). Screens are flat, so a pack
component never contains a core component: it is drawn from the same kit bases, tokens and copy, and it
uses the same contract as a core component (meta, Zod props, fallback, examples, probes, view), the
same read/act runtime, the same probe gate and the same Writer format.

## Step 0: shared prerequisites (once, before wave 1)

| # | Work | Why |
| --- | --- | --- |
| P1 done | **Kit base survey.** Read every pack file, list each component's drawing needs, map them to existing bases, and write the backlog of new bases (for example a dice face, a wheel, a sign pad, a dense score grid, a Gantt bar row, a seating plan) with exact APIs and the waves that need them. The [base survey](bases.md) maps every pack component and lists the APIs and build order. | Component tasks stop when a base is missing (the core build showed this); bases are built ahead, to the visual rubric |
| P2 done | **Pack readiness gate.** A pack is ready and enters a registry, the pack index and `writerFormat` only when it has `pack.ts`, every component is `ready`, and `example.jsonl` validates; archetypes have no status; drafts still load with `includeDrafts` | Readiness is enforced at pack level, not component by component |
| P3 done | **Archetype checks.** Archetype ids unique across core and packs; layout ids unique within an archetype, addressed as `archetype/layout`; every layout exists; core archetypes use slots and per-layout defaults without `defaultLayout`; every recipe id exists in core or the same pack | Archetype and layout checks in `checkPacks` |
| P4 done | **`confirmParts` dispatch.** The runtime shows the standard confirm sheet for any part in `meta.confirmParts`, not only `Button.confirm`; a part with no `confirm` copy uses the shared neutral confirm label | Destructive pack parts (cancel, remove, decline) depend on it |
| P5 done | **Actions.** The vocabulary is `ActionName` plus `validateActionValue`, with runtime handlers; no pack needs a new action name, and `move` already exists | Read/act must cover every pack part |
| P6 | **End-to-end pipeline on one fixture pack.** `pack.ts`, generated entries, scoped `writerFormat`, pack choose/write/read probes with recordings under `pack/<id>`, compose probes for pack archetypes, `example.jsonl` validation, gallery overview grouped by pack with `?pack=<id>`, and `pnpm look` for pack components | Every wave reuses it; finding gaps once is cheaper than finding them in 27 packs |
| P7 | **Task generator.** A template per kind of task (pack scaffold, pack component, pack acceptance) and a script that writes them from a pack file, like the core component tasks | Keeps 27 packs consistent |

## Per-pack workflow

Each pack goes through four steps. Components inside one pack run in parallel.
A wave's base task budgets tests, `index.ts` doors and READMEs as files, and provides tokens and shared
copy for new drawing labels.

1. **Scaffold** (one Droid): `pack.ts` (pick line, components in `draft` with full meta and props, its
   archetypes as data without status), visible while components are built only with `includeDrafts`.
2. **Components** (one Droid per component, as for the core): schema, examples, fallback, probes, view
   from kit bases, tests, `pnpm look` with no issues, `ui-reviewer` approval, `pnpm rules`. A component
   needing a missing base stops and names it; the base is built first.
3. **Archetypes and worked example** (one Droid): archetype layouts and per-layout defaults, compose probes
   (majority 2/3 on every layout), `example.jsonl` that validates line by line and renders in three
   presets.
4. **Acceptance** (orchestrator): pack probes pass on the required model (choose among core plus the
   pack, including its nearest core and nearest other-pack near misses), every component ready, the pack
   enters live registries when `pack.ts` exists and `example.jsonl` validates, recordings refreshed,
   merged and pushed.

Core recordings do not go stale when a pack is built: core probes use the core registry. Each pack has its
own recordings. The Director's pack-pick probes (which packs for an app idea) are re-recorded once per
wave, because each wave changes the pack index.

## Waves

| Wave | Packs | Why this order |
| --- | --- | --- |
| 0 | Step 0 prerequisites | Every wave depends on them |
| 1 | booking, customers | Trot, the Phase 1 worked example |
| 2 | health, kitchen, home, money, play | The most-asked personal apps; `play` turns the most common `Canvas` miss (games) into a showcase |
| 3 | commerce, mind, trips, learning, requests, property | Next most-asked; `requests` and `property` complete the landlord combination |
| 4 | social, media, events, places, community | Need `people` and `service` tiers; groups build on social and events |
| 5 | inventory, data, team, sports, projects, paperwork, books, invest, hiring | Business back-office and niche; order inside the wave follows real `Canvas` misses and forced fits |

A wave starts when the previous wave's packs are ready. Within a wave, at most six Droids run at once;
bases for the wave are built first, then scaffolds, then components, then archetypes and acceptance.

## Gates

- **Core first:** before a pack component is built, its task names the nearest core component and option
  and says what they cannot show; if they can, the component is dropped and the pack's recipes use the
  core one. Each pack component has a choose probe whose near miss is that core component, and the
  pack's probes include a core need that must still pick the core component with the pack loaded.
- **Component:** the core gates (model probes 2/3 on every probe, `pnpm look` no issues, reviewer
  approval, `pnpm rules`, tests).
- **Pack:** `pack.ts` exists; every component ready; archetype compose probes 2/3 on every layout;
  `example.jsonl` validates and renders in three presets; pack-level choose probes for near misses
  against the core and named other packs.
- **Wave:** Director pack-pick probes over the wave's app ideas (the combinations table) pass; prompt
  budgets hold for core plus any three packs (estimated tokens under the gate in the prompt folder).

## Risks

| Risk | Mitigation |
| --- | --- |
| Near misses across packs (`Poll`/`Vote`, `Board`/`Tasks`, `Lease`/`Units`) | Each pick names the other; pack probes include cross-pack near misses; the combinations table decides which pack an app loads |
| Prompt size with three large packs | Estimated-token gate per wave; drop or merge a component before raising a budget |
| Kit base growth | Bases grouped by layer folders (≤12 files each, `pnpm rules`); new layers for pack families when needed |
| Recording size (8 MB today) | One recording file per pack; review growth at each wave |
| New interactions (roll, spin, sign, drag) | P5 covers existing action names and value validation; runtime handlers precede the components that need them |
