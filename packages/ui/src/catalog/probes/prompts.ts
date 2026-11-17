import type { Definition } from "./types";
import { signature } from "./signature";

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
