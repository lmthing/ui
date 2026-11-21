import { readFileSync } from "node:fs";
import type { Reporter, TestState } from "vitest/node";

type Entry = { file: string; test: string; reason: string; owner: string };
type Result = Pick<Entry, "file" | "test"> & { state: TestState };

const manifest = "test/known/failures.json";
const key = ({ file, test }: Pick<Entry, "file" | "test">) => JSON.stringify([file, test]);

function isEntry(value: unknown): value is Entry {
  if (typeof value !== "object" || value === null) return false;
  const { file, test, reason, owner } = value as Record<string, unknown>;
  return (
    typeof file === "string" &&
    /^(?:scripts|src|test)\/(?:[\w.-]+\/)*[\w.-]+\.test\.tsx?$/.test(file) &&
    !file.split("/").some((segment) => segment === "." || segment === "..") &&
    typeof test === "string" &&
    Boolean(test.trim()) &&
    typeof reason === "string" &&
    Boolean(reason.trim()) &&
    typeof owner === "string" &&
    /^ui-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(owner)
  );
}

function readEntries(): Entry[] {
  const data: unknown = JSON.parse(readFileSync(new URL(`../../${manifest}`, import.meta.url), "utf8"));
  if (!Array.isArray(data) || !data.every(isEntry)) throw new Error(`Invalid entries in ${manifest}`);
  if (new Set(data.map(key)).size !== data.length) throw new Error(`Duplicate entries in ${manifest}`);
  return data;
}

export function evaluateKnownFailures(
  entries: readonly Entry[],
  results: readonly Result[],
  strict: boolean,
  log = console.log,
) {
  const byKey = new Map(entries.map((entry) => [key(entry), entry]));
  let known = 0;
  let blocking = false;
  const seen = new Set<string>();
  for (const result of results) {
    const id = key(result);
    const entry = byKey.get(id);
    if (!entry) {
      if (result.state === "failed") blocking = true;
      continue;
    }
    const label = `${entry.file} > ${entry.test}`;
    if (seen.has(id)) {
      blocking = true;
      log(`Ambiguous known failure: ${label}`);
      continue;
    }
    seen.add(id);
    if (result.state === "failed") {
      known++;
      log(`KNOWN: ${label} (${entry.owner}: ${entry.reason})`);
    } else if (result.state === "passed") {
      if (strict) blocking = true;
      log(`KNOWN-FIXED: remove it from ${manifest}: ${label} (${entry.owner})`);
    }
  }
  return { known, blocking };
}

export function knownFailureReporter(): Reporter {
  const entries = readEntries();
  const strict = process.env.UI_KNOWN_STRICT === "1";
  const initialExitCode = process.exitCode;
  return {
    onTestRunEnd(modules, unhandledErrors, reason) {
      const results = modules.flatMap((module) =>
        Array.from(module.children.allTests(), (test) => ({
          file: module.relativeModuleId,
          test: test.fullName,
          state: test.result().state,
        })),
      );
      const { known, blocking } = evaluateKnownFailures(entries, results, strict);
      if (blocking) process.exitCode ||= 1;
      // Vitest sets exit 1 before reporting. Only clear it for an otherwise complete run with
      // quarantined test failures. Keep suite/collection errors and runner failures fatal.
      if (
        known > 0 &&
        !blocking &&
        reason === "failed" &&
        !unhandledErrors.length &&
        !initialExitCode &&
        process.exitCode === 1 &&
        modules.every(
          (module) =>
            module.state() !== "pending" &&
            !module.errors().length &&
            Array.from(module.children.allSuites()).every((suite) => !suite.errors().length),
        )
      ) {
        process.exitCode = initialExitCode;
      }
    },
  };
}
