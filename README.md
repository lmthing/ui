# lmthing/ui

The component system used by lmthing:

- **`@lmthing/catalog`**: the component system as data. Tokens, presets, accents, components, domain packs, archetypes, surfaces, screen rules, the part address grammar and prompt entries. TypeScript and Zod only, no React.
- **`@lmthing/kit`**: Tamagui renderers for every catalog component, the screen layout, states, surfaces and signature motion.

lmthing loads this repo as a git submodule at `packages/ui`. Other projects can use it the same way, or as published packages later.

Nothing is built yet. Start with the [technical implementation plan](docs/implementation-plan.md).
