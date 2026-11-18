import type { Definition } from "../probes";
import { signature } from "../probes";

/** Preserve the entry used by recorded write probes, including component write hints. */
export function buildEntry(def: Definition): string {
  const { meta, props, examples } = def;
  return [
    `${meta.id}: ${meta.purpose}`,
    `props: ${signature(props)}`,
    ...(meta.writeHints ?? []).map((hint) => `Rule: ${hint}`),
    `example: ${JSON.stringify({ c: meta.id, ...(examples[0] as object) })}`,
  ].join("\n");
}
