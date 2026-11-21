import { deepStrictEqual, match } from "node:assert/strict";
import { evaluateKnownFailures } from "./known-failures";

const { it } = process.env.VITEST ? await import("vitest") : await import("node:test");

const entry = {
  file: "test/probes.test.ts",
  test: "pack probes > books passes",
  reason: "Missing recording",
  owner: "ui-refresh-pack-books",
};
type Results = Parameters<typeof evaluateKnownFailures>[1];
function evaluate(results: Results, strict = false) {
  const messages: string[] = [];
  const outcome = evaluateKnownFailures([entry], results, strict, (message) => messages.push(message));
  return { outcome, messages };
}

it("reports a listed failure as KNOWN and does not block, even in strict mode", () => {
  const { outcome, messages } = evaluate([{ ...entry, state: "failed" }], true);
  deepStrictEqual(outcome, { known: 1, blocking: false });
  deepStrictEqual(messages, [
    "KNOWN: test/probes.test.ts > pack probes > books passes (ui-refresh-pack-books: Missing recording)",
  ]);
});

it("warns for a listed pass and blocks only in strict mode", () => {
  for (const strict of [false, true]) {
    const { outcome, messages } = evaluate([{ ...entry, state: "passed" }], strict);
    deepStrictEqual(outcome, { known: 0, blocking: strict });
    deepStrictEqual(messages.length, 1);
    match(messages[0]!, /^KNOWN-FIXED: remove it from test\/known\/failures\.json:/);
  }
});

it("blocks an unlisted failure, even next to a listed failure", () => {
  const { outcome, messages } = evaluate([
    { ...entry, state: "failed" },
    { ...entry, file: "test/reading.test.tsx", state: "failed" },
    { ...entry, test: `${entry.test} again`, state: "failed" },
  ]);
  deepStrictEqual(outcome, { known: 1, blocking: true });
  deepStrictEqual(messages.length, 1);
});

it("does not treat missing, pending or skipped tests as fixed", () => {
  for (const results of [[], [{ ...entry, state: "pending" }], [{ ...entry, state: "skipped" }]] as const) {
    deepStrictEqual(evaluate(results, true), { outcome: { known: 0, blocking: false }, messages: [] });
  }
});

it("blocks when the listed identity matches more than one test", () => {
  const { outcome, messages } = evaluate([
    { ...entry, state: "failed" },
    { ...entry, state: "failed" },
  ]);
  deepStrictEqual(outcome, { known: 1, blocking: true });
  match(messages[1]!, /^Ambiguous known failure:/);
});
