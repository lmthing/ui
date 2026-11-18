# scripts

Node-only build, browser and model-check commands.
- `build/`: entries, themes, bundles and Vitest.
- `look/`: screenshots, browser checks and gallery configuration.
- `llm/`: model probes, recordings and composition casts.
- `rules/`: standalone code-rule audit, not part of `pnpm check` yet.

`index.ts` preserves shared imports. Root CLI wrappers preserve external command paths.
