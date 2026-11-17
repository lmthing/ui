# lmthing/ui

The component system used by lmthing, as one package, `@lmthing/ui`, with two entries:

- **`@lmthing/ui/catalog`**: the component system as data. Tokens, presets, accents, components, domain packs, archetypes, surfaces, screen rules, the part address grammar, prompt entries and readers. TypeScript and Zod only, no React.
- **`@lmthing/ui/kit`**: the Tamagui views for every catalog component, the screen layout, states, surfaces and signature motion.

Each component is ONE file holding its data and its view. lmthing loads this repo as a git submodule at `packages/ui`.

The first proof slice implements List with calm, bold and editorial presets and moss/sky accents.
Run `pnpm install`, `pnpm build:catalog`, `pnpm -r typecheck`, `pnpm -r test`, then `pnpm gallery`.
The gallery is a standalone Vite + React Native Web host. Full U0–U2 tooling comes later.

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
- A component never styles itself. Its look is a choice of variants on the six kit bases (plan 5.4a).
- Every dependency gets a line in `docs/dependencies.md`.

## Exact structure

```text
docs/                          implementation-plan.md, dependencies.md
packages/ui/                   @lmthing/ui
  src/catalog/                 meta props types tokens themes(presets) archetypes rules address lookup
                               prompt agent registry migrations, icons.ts photos.ts signatures.ts version.ts
  src/components/              one file per core component (40), PascalCase
  src/packs/<pack>/            pack.ts example.jsonl components/ archetypes/   (10 packs)
  src/surfaces/                LockScreen.tsx Widget.tsx Message.tsx
  src/kit/                     provider tamagui base(helpers) part archetypes signature screen report registry interact
  src/entry/                   generated: catalog.ts renderers.ts kit.ts
  scripts/ assets/fonts/ test/
packages/photos/               optional, step U8
apps/gallery/                  private Expo app: app/ fixtures/ e2e/ agent-hook.ts tamagui.config.ts
.github/workflows/  .changeset/
```

Root files to create in step U0: `package.json`, `pnpm-workspace.yaml` (`packages/*`, `apps/*`), `tsconfig.base.json`, `eslint.config.js`, `.nvmrc`, `.github/workflows/ci.yml`.
