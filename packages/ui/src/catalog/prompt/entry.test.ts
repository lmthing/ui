import { expect, it } from "vitest";
import { createRegistry } from "@lmthing/ui/catalog";
import { choosePrompt, signature, writePrompt, type Definition } from "../probes";
import { buildEntry } from "./index";

const definitions: readonly Definition[] = createRegistry({ includeDrafts: true }).defs;
const defs = definitions.filter((def) => !def.meta.codeOwned);

it.each(defs)("preserves the recorded write entry for $meta.id", (def) => {
  const entry = [
    `${def.meta.id}: ${def.meta.purpose}`,
    `props: ${signature(def.props)}`,
    ...(def.meta.writeHints ?? []).map((hint) => `Rule: ${hint}`),
    `example: ${JSON.stringify({ c: def.meta.id, ...(def.examples[0] as object) })}`,
  ].join("\n");
  expect(buildEntry(def)).toBe(entry);
  if (def.meta.variants || def.meta.items?.variants) return;
  expect(writePrompt(def, "A brief")).toBe(
    [
      "You write one UI component of a phone app as a single JSON line.",
      "Use only the listed props. Respect every limit (≤N is a maximum length, [a..b] an item count).",
      "Use null for an optional prop (name?) when you have nothing for it: never write an empty string.",
      entry,
      "",
      "Brief: A brief",
    ].join("\n"),
  );
});

it("preserves the complete recorded core choose prompt", () => {
  expect(choosePrompt(defs, "A need")).toBe(
    [
      "You choose the one UI component that best fits a need on a phone app screen.",
      "Components:",
      defs.map(({ meta }) => `- ${meta.id}: ${meta.purpose} Pick: ${meta.pick}`).join("\n"),
      "",
      'Need, in the person\'s words: "A need"',
      "Reply with only the component id, nothing else.",
    ].join("\n"),
  );
});
