# scripts

Node-only build, browser and model-check commands.
- `build/`: entries, themes, bundles and Vitest.
- `look/`: screenshots, browser checks and gallery configuration.
- `llm/`: model probes, recordings and composition casts.
- `rules/`: the code-rule check (`pnpm rules`), part of `pnpm check`.

`index.ts` preserves shared imports. Root CLI wrappers preserve external command paths.
