# build

Catalog, kit, themes and test commands. `entries/` owns entry generation.
The scripts are CLI entry points; run their package commands from the workspace.

For Node tests (`pnpm test` and `pnpm test:changed`), set `UI_TEST_TIMEOUT` to override both test and
hook timeouts in milliseconds, or `UI_TEST_WORKERS` to cap parallel workers. For example:

```sh
UI_TEST_TIMEOUT=15000 UI_TEST_WORKERS=4 pnpm test:changed main
```

Use positive decimal integers (up to `2147483647` ms and `256` workers, respectively). Invalid values
warn once per variable and are ignored. Unset values keep the Vitest defaults. Browser tests do not
use either variable.
