/// <reference types="vite/client" />

import { expect, it } from "vitest";
import { z } from "zod";
import { archetypes, components, createRegistry } from "@lmthing/ui/catalog";
import { choosePrompt, composePrompt, signature, writePrompt, type Definition } from "../probes";
import { buildEntry, composeFlow, writerItemTone, writerVariants } from "./index";
import markdown from "./writer-variants.md?raw";

const definitions: readonly Definition[] = createRegistry({ includeDrafts: true }).defs;
const defs = definitions.filter((def) => !def.meta.codeOwned);

it.each(defs)("preserves the schema and write hints for $meta.id", (def) => {
  const entry = [
    `${def.meta.id}: ${def.meta.purpose}`,
    `props: ${signature(def.props)}`,
    ...(def.meta.writeHints ?? []).map((hint) => `Rule: ${hint}`),
  ].join("\n");
  expect(buildEntry(def).split("\nexample: ")[0]).toBe(entry);
});

it("preserves the Writer prompt for a component without axes", () => {
  const photo = components.Photo;
  const { variants: _axes, variantParts: _parts, ...meta } = photo.meta;
  const def = {
    ...photo,
    meta,
    props: z.strictObject({ photo: photo.props.shape.photo }),
    examples: [{ photo: "lib:plants" }],
  };
  const entry = buildEntry(def);
  expect(entry).toContain('example: {"c":"Photo","photo":"lib:plants"}');
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

it("neutralizes existing component and row axes without changing other example fields", () => {
  const list = components.List;
  const example = {
    overflow: "peek",
    rows: [{ title: "First", trail: "toggle", done: true }, { title: "Second" }],
  };
  const entry = buildEntry({ ...list, examples: [example] });
  expect(entry).toContain(
    `example: ${JSON.stringify({
      c: "List",
      overflow: null,
      rows: [{ title: "First", trail: null, done: true }, { title: "Second" }],
    })}`,
  );
  expect(example.rows[0]?.trail).toBe("toggle");
});

it("uses the Markdown variant guidance for both Writer paths without leaking it into unrelated prompts", () => {
  expect([writerVariants, writerItemTone, composeFlow]).toEqual(
    markdown.trimEnd().split(/\n\n## (?:Item tone|Composition)\n\n/),
  );
  const brief = "Keep all rows, but show only the first two";
  expect(writePrompt(components.List, brief)).toContain(`${writerVariants}\nBrief: ${brief}`);
  expect(writePrompt(components.Photo, brief)).toContain(writerVariants);
  const compose = composePrompt(archetypes.settings.meta, "simple", { things: [], items: [] }, components);
  expect(compose.split(writerVariants)).toHaveLength(2);
  expect(compose).toContain(composeFlow);
  expect(compose).toContain('effective trail of "toggle"');
});

it("adds the item-tone reminder only when the numbers Writer can author row tone", () => {
  const brief = "Abbreviate the values";
  expect(writePrompt(components.Progress, brief)).toContain(`${writerItemTone}\nBrief: ${brief}`);
  expect(writePrompt(components.Counter, brief)).not.toContain(writerItemTone);
  expect(writePrompt(components.List, brief)).not.toContain(writerItemTone);
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
