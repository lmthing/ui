# rules

Standalone audit of src, scripts, test and the gallery app routes.
Run `pnpm rules`; findings are grouped by rule with file and line.
Files over 400 lines and non-exempt folders over 12 files warn; only violations fail the command.
Scan .ts, .tsx, .mts and README.md only, excluding *.generated.ts and test/recordings/.
Function limits count physical node lines, including comments and tests.
Hex literals in *.test.ts are allowed; other rules still apply to tests.
Production source keeps literal locales and exported UI copy strings in `lang/`.
The copy heuristic scans literal strings in exported values and object fields, not function bodies.
Only the explicitly named folder and token/theme exemptions apply otherwise.
The audit also runs as part of `pnpm check`.
