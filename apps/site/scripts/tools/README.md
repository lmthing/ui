# scripts/tools

Development helpers, not part of the build.

- `dev.ts`: the site on a free port (`PORT=5199 pnpm --filter @lmthing/site dev`), reading `build.ts --data` output.
- `look.ts`: a headless screenshot of any URL at a width, printing console errors.
- `check-lib.ts`, `check-local.ts`: shared helpers, and the WebLLM checks (`--webgpu`, `--webgpu-run`).
- `check-openrouter.ts`: tier 3 against a mocked openrouter.ai (paste, build, 429 fallback, sign-in return).
- `check.ts`: drives the site in headless Chromium and asserts the live parts work (create stream,
  playground, pack page, try-it replay and a mocked Chrome AI).
