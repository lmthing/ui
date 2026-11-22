import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { buildBlock, buildEntry } from "../../../src/catalog/prompt";
import { components } from "../../../src/entry/catalog";

// Verified against the pre-split outputs of the Choose and Writer builders.
const baseline: Record<string, [choose: string, writer: string]> = JSON.parse(
  readFileSync(new URL("./prompt-output.json", import.meta.url), "utf8"),
);

it.each(Object.entries(baseline))("preserves the pre-split prompts for %s", (id, [choose, writer]) => {
  const def = components[id as keyof typeof components];
  expect(buildBlock({ defs: [def], packOf: {} }, "core")).toBe(choose);
  expect(buildEntry(def)).toBe(writer);
});
