# lmthing/ui

The component system used by lmthing, as one package, `@lmthing/ui`, with two entries:

- **`@lmthing/ui/catalog`**: the component system as data. Tokens, themes, 45 core component definitions, 17 archetypes, screen rules, the part address grammar, prompt entries, readers and migrations. The 18 domain packs and outside surfaces are pending. TypeScript and Zod only, no React.
- **`@lmthing/ui/kit`**: the Tamagui views for every catalog component, the screen layout, states, live controls and shared motion. Native device acceptance and runtime render detection are pending.

Each component is ONE file holding its data and its view. lmthing loads this repo as a git submodule at `packages/ui`. Core schemas and views, 35 archetype layouts, the browser runtime and the Vite gallery are built. See the [status of U0 to U8](docs/implementation-plan.md#13-implementation-steps) for unfinished gates.

## How to implement (for the agent that builds this)

1. Read [docs/implementation-plan.md](docs/implementation-plan.md) fully. Where this README and the plan disagree, the plan wins.
2. Build in step order U0 to U8 (plan section 13). Each step ends at its gate. Do not start a step before the previous gate passes.
3. Every folder below has a README with its exact files and rules. Create exactly those files. Do not add files that are not listed, and do not skip listed ones without a change to the plan first.
4. Work in small pull requests: one folder of concern plus wiring, under about 400 changed lines. Visible changes need a gallery entry and screenshots.

## Rules that apply to every file

- Strict TypeScript. At most 200 lines per file and 60 per function (lint). About 12 files per folder, except `src/components/` which is flat on purpose.
- One thing per file, named after its main export. Named exports only (default exports only in gallery route files). Plain functions and plain data: no classes, decorators, HOCs or DI.
- Other folders import a folder only through its `index.ts`. Each folder has a README of at most 20 lines.
- Component names are PascalCase everywhere: file, view function, `meta.id`, and the `c` value a model writes (`List.tsx`, `ServiceMenu`). Other files are kebab-case. Archetype, pack, section, screen and flow ids are lowercase.
- No raw values outside `src/catalog/tokens/` and `src/catalog/themes/`: no hex colours, pixel numbers or z-index.
- `src/catalog` imports only `zod`. `src/kit` imports `src/catalog` and peers. `src/components`, `src/packs` and `src/surfaces` import both. `node:*` only in `scripts/`. Nothing imports from `apps/`.
- A component never styles itself. Its look comes from the exported kit bases ([component guide](docs/component-guide.md), plan 5.4a).
- Every dependency gets a line in `docs/dependencies.md`.

## Exact structure

```text
docs/                          implementation-plan.md, dependencies.md, catalog/ (core and pack plans)
packages/ui/                   @lmthing/ui
  src/catalog/                 meta props types tokens themes(presets) archetypes rules address lookup(pending)
                               cast prompt agent registry migrations, copy.ts icons.ts signatures.ts; photos.ts/version.ts pending
  src/components/              one file per core component (45 built; DayTimeline merged, Sparkline retained), PascalCase
  src/packs/<pack>/            pack.ts example.jsonl components/ archetypes/   (18 planned; content pending)
  src/surfaces/                LockScreen.tsx Widget.tsx Message.tsx (pending)
  src/kit/                     provider tamagui base(helpers) part motion screen registry interact; archetypes/signature/report pending
  src/entry/                   generated, ignored: catalog.ts renderers.ts kit.ts
  scripts/ assets/fonts/ test/
packages/photos/               optional, step U8
apps/gallery/                  private Vite/React Native Web app: query-selected components, runtime and controls
.github/workflows/  .changeset/
```

Built tooling: pnpm, strict TypeScript, Prettier, Vitest, esbuild and TypeScript declarations. `./catalog` and `./kit` both export `source`; Node agents use the built catalog. ESLint, Changesets config and CI/release YAML are pending. Folder README requirements remain binding; stale implementation details defer to the plan.

Writers use strict structured output from `writerFormat(registry)` (2026-11-18 design). No component aliases, alias-conflict check or off-pack repair. Migration aliases stay.

Checks: `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build:catalog`. See plan 7.1 for package builds, probes and screenshots. Markdown is ignored by the root formatter; format edited documents explicitly.
