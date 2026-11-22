import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { buildBlock, buildEntry } from "../../../src/catalog/prompt";
import { components } from "../../../src/entry/catalog";

// Prompt snapshots preserve split parity except for intentional catalog and Writer changes.
const baseline: Record<string, [choose: string, writer: string]> = JSON.parse(
  readFileSync(new URL("./prompt-output.json", import.meta.url), "utf8"),
);

it.each(Object.entries(baseline))("preserves the recorded prompts for %s", (id, [choose, writer]) => {
  const def = components[id as keyof typeof components];
  expect(buildBlock({ defs: [def], packOf: {} }, "core")).toBe(choose);
  expect(buildEntry(def)).toBe(writer);
});
