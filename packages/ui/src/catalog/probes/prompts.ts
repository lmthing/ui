import type { Definition } from "./types";
import { readComponent } from "../agent";
import { buildBlock, buildEntry, variantVocabulary } from "../prompt";

export function choosePrompt(defs: readonly Definition[], need: string): string {
  return [
    "You choose the one UI component that best fits a need on a phone app screen.",
    "Components:",
    // Preserve the choice order used by recordings; standalone blocks sort by group then id.
    defs
      .map((def) => buildBlock({ defs: [def], packOf: {} }, "core"))
      .filter(Boolean)
      .join("\n"),
    "",
    `Need, in the person's words: "${need}"`,
    "Reply with only the component id, nothing else.",
  ].join("\n");
}

export function writePrompt(def: Definition, brief: string): string {
  const hasVariants = def.meta.variants || def.meta.items?.variants;
  return [
    "You write one UI component of a phone app as a single JSON line.",
    "Use only the listed props. Respect every limit (≤N is a maximum length, [a..b] an item count).",
    "Use null for an optional prop (name?) when you have nothing for it: never write an empty string.",
    ...(hasVariants ? [variantVocabulary] : []),
    buildEntry(def),
    "",
    ...(hasVariants
      ? [
          "Each variant is independent. Use JSON null for every unrequested component or row variant, even if a different variant was requested. Do not fill in defaults.",
        ]
      : []),
    `Brief: ${brief}`,
  ].join("\n");
}

/** The screen as the model reads it, then a task: reply with where to act and how. */
export function readPrompt(
  def: Definition,
  screen: number,
  instance: string,
  task: string,
  lang?: string,
): string {
  const lines = readComponent(def, def.examples[screen], instance, undefined, undefined, lang);
  return [
    "You operate a phone app for a person. You see the screen as text: one line per component,",
    "items indented. Text in quotes is content. Each action is in square brackets and starts with its",
    "address: [l1/r2/trail toggle:off] means address l1/r2/trail, action toggle. Copy the address",
    "exactly. The action is the word written in that bracket (type, select, increment, press, …),",
    "never a different action and never the → or : part.",
    "",
    "screen home",
    ...lines,
    "",
    `Task: ${task}`,
    'Reply with only JSON: {"address": "<address>", "action": "<action>"}',
  ].join("\n");
}
