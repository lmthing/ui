# rules

Standalone audit of src, scripts, test and the gallery app routes.
Run `pnpm rules`; violations are grouped by rule with file and line.
Limits include tests, comments inside function nodes, generated files and recordings.
Only the explicitly named folders and token/theme paths are exempt.
The audit intentionally does not run as part of `pnpm check` yet.
