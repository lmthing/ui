# known

`failures.json` lists existing failures by exact `file` (relative to `packages/ui`) and full `test`
name (including suites, separated by ` > `). Each entry must have a `reason` and an `owner` task ID.
Add only failures reproduced on main. For missing pack recordings, use one entry per pack owned
by `ui-refresh-pack-<pack>`.

Listed tests still run and Vitest shows their actual results. A `KNOWN` failure does not block
the run. Unlisted failures, suite errors, and unhandled errors still block it. A listed pass prints
`KNOWN-FIXED: remove it from test/known/failures.json`. Remove the entry when fixing the test.
Set `UI_KNOWN_STRICT=1` to make listed passes fail the run as well. A pack replay restricted to
selected components and layouts still reports known failures, but cannot report the full test fixed.

The reporter source lives here. `scripts/build/known-failures.ts` links to it so the build folder
can retain the runner entry and its unit test without exceeding the file limit.
