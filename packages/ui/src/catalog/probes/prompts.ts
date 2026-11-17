import type { Definition } from "./types";
import { signature } from "./signature";
import { readComponent } from "../agent/read";

/** One line per component: what the model reads to choose. */
export function buildBlock(defs: readonly Definition[]): string {
  return defs.map(({ meta }) => `- ${meta.id}: ${meta.purpose} Pick: ${meta.pick}`).join("\n");
}

/** Everything the model needs to write one component line. */
export function buildEntry(def: Definition): string {
  const { meta, props, examples } = def;
  return [
    `${meta.id}: ${meta.purpose}`,
    `props: ${signature(props)}`,
    `example: ${JSON.stringify({ c: meta.id, ...(examples[0] as object) })}`,
  ].join("\n");
}

export function choosePrompt(defs: readonly Definition[], need: string): string {
  return [
    "You choose the one UI component that best fits a need on a phone app screen.",
    "Components:",
    buildBlock(defs),
    "",
    `Need, in the person's words: "${need}"`,
    "Reply with only the component id, nothing else.",
  ].join("\n");
}

export function writePrompt(def: Definition, brief: string): string {
  return [
    "You write one UI component of a phone app as a single JSON line.",
    "Use only the listed props. Respect every limit (≤N is a maximum length, [a..b] an item count).",
    buildEntry(def),
    "",
    `Brief: ${brief}`,
    `Reply with only the JSON line, starting with {"c":"${def.meta.id}".`,
  ].join("\n");
}

/** The screen as the model reads it, then a task: reply with where to act and how. */
export function readPrompt(def: Definition, screen: number, instance: string, task: string): string {
  const lines = readComponent(def, def.examples[screen], instance);
  return [
    "You operate a phone app for a person. You see the screen as text: one line per component,",
    "items indented. Text in quotes is content. Actions are in square brackets, with the part name",
    "first when it is not the item or component itself, e.g. [trail toggle:off] or [press→plant].",
    "An action's address is the path of ids on its line plus the part, e.g. l1/r2/trail or b1.",
    "",
    "screen home",
    ...lines,
    "",
    `Task: ${task}`,
    'Reply with only JSON: {"address": "<address>", "action": "<action>"}',
  ].join("\n");
}
