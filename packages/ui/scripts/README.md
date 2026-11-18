# scripts

Node scripts. The only place `node:*` may be imported.

Built in step U0 (skeletons), filled from U1. Read plan 4.10 and 10 first.
Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `check.ts` `pnpm catalog:check`
- `compose-scale-cast.ts`, `compose-history-cast.ts` supply coherent rating and dated probe fixtures.
- `build-prompt.ts` writes prompt blocks
- `build-entries.ts`, `entries/` generate `src/entry/*`
- `build-themes.ts` writes `themes.generated.ts` (`pnpm kit:themes`, `--check`, `--compact`)
- `bundle-check.ts` catalog bundle has no React
- `llm-check.ts` runs the model probes against the models in `llm.config.ts` (live) or recordings (replay); `llm.config.ts` holds the model names, the only place in this package
- `azure.ts` sends optional strict formats; `recordings.ts` keys replies by model, prompt and format.
- `launch-chrome.ts`, `launch-chrome.test.ts` share look/browser-test discovery and launch options.

Rules:
- One job per script. Exposed as pnpm scripts: `catalog:check`, `kit:themes`, `build:entries`, `build:catalog`.
- `check.ts` runs the 13 checks of plan 4.10. It is the only place component files are validated.
- Scripts import `src/` through the package's own exports, never reach into other folders' files.
