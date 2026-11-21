import type { Definition } from "../probes";
import { signature } from "../probes";

function exampleForWriter(def: Definition): object {
  const example = { ...(def.examples[0] as Record<string, unknown>) };
  const { variants, items } = def.meta;
  for (const axis of Object.keys(variants ?? {})) if (Object.hasOwn(example, axis)) example[axis] = null;
  const rows = items && example[items.key];
  if (items?.variants && Array.isArray(rows)) {
    const axes = Object.keys(items.variants);
    example[items.key] = rows.map((row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, axes.includes(key) ? null : value])),
    );
  }
  return example;
}

/** The example illustrates wire shape, not a request for any shared variant. */
export function buildEntry(def: Definition): string {
  const { meta, props } = def;
  return [
    `${meta.id}: ${meta.purpose}`,
    `props: ${signature(props)}`,
    ...(meta.writeHints ?? []).map((hint) => `Rule: ${hint}`),
    `example: ${JSON.stringify({ c: meta.id, ...exampleForWriter(def) })}`,
  ].join("\n");
}
