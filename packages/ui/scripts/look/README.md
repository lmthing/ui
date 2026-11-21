# look

Browser rendering, screenshot checks and gallery configuration.
`checks/` is bundled into one browser IIFE at runtime.
Import shared Chrome and Vite configuration through `index.ts`.

`pnpm look --component List` renders calm light at 390px. It writes
`390-light.png`, `390-light-marks.png`, and `issues.json` to `packages/ui/shots/List/`.
It replaces the component's previous output and exits nonzero if it finds visual issues.

- `--preset` and `--mode` accept repeated flags or comma lists (e.g. `--preset calm,bold --mode dark`).
- `--widths` accepts a comma list (e.g. `--widths 320,390`). Each width/mode sheet has one column
  per selected preset in catalog order and stacks all examples and states. Marks are saved at 390px.
- `--all` restores the 320/390/430 × light/dark matrix across all presets and includes the
  shared-variants sheet when applicable. Explicit selectors override its matrix defaults.
