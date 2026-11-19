# test

Shared fixtures, catalog conformance and recorded model replies. All tests use Vitest.

- `pnpm test`: all Node-only tests; excludes `*.browser.test.ts(x)`.
- `pnpm test:browser`: browser tests, one file at a time, on free Vite ports.
- `pnpm test:changed [base]`: Node tests related to changes since the merge base (default `main`).
- Component paths select ids; catalog-wide suites read `UI_TEST_COMPONENTS`, set by the runner.
- Shared code, scripts, fixtures and unclassified UI paths fall back to the full Node suite.
- Any test launching Chrome or Vite must be named `*.browser.test.ts(x)`; split mixed files.
- Pack galleries are discovered from `src/packs/*/pack.ts` in one browser suite.
- `pnpm typecheck` caches incremental state under `node_modules/.cache`.
- Component tasks: `pnpm test:changed`; run `pnpm test:browser <filter>` for browser changes.
- Merges: `pnpm format:check && pnpm typecheck && pnpm rules && pnpm test && pnpm test:browser && pnpm build:catalog`.
- Pure code has a `name.test.ts` beside it. Fixtures remain data.
- Fallbacks must validate with both empty and full casts.
- Components render through `renderInstance` from `render.tsx`, not new provider wrappers.
- `elementAt` and `styleAt` inspect rendered markup and shared CSS.
- `runtime.browser.test.ts` checks playback, sheets and confirmation in Chrome.
- Set `CHROME` when the binary is not `/usr/bin/google-chrome`.
