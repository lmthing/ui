import type { Meta } from "../meta";
import { nestedControls } from "./selection";
import { addressedItems } from "./visibility";
import type { Values } from "./act";

export function itemCounterReset(meta: Meta, props: Values): Values {
  const changes: Values = {};
  for (const { step } of nestedControls(meta, props)) {
    if (step) changes[step.key] = undefined;
  }
  addressedItems(meta, props).forEach((row, index) => {
    const id = String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);
    for (const [pair, spec] of Object.entries(meta.items?.adjust ?? {})) {
      if (!spec) continue;
      const part = pair.slice(0, pair.lastIndexOf("."));
      const key = `${id}/$adjust/${spec.prop}`;
      changes[key] = changes[`$wire/${key}`] = changes[part === "root" ? id : `${id}/${part}`] = undefined;
    }
  });
  return changes;
}
