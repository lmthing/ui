# rules

Standalone audit of src, scripts, test and the gallery app routes.
Run `pnpm rules`; violations are grouped by rule with file and line.
Scan .ts, .tsx, .mts and README.md only, excluding *.generated.ts and test/recordings/.
Function limits count physical node lines, including comments and tests.
Hex literals in *.test.ts are allowed; other rules still apply to tests.
Only the explicitly named folder and token/theme exemptions apply otherwise.
The audit intentionally does not run as part of `pnpm check` yet.
