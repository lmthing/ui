import type { Meta } from "../../meta";
import { nestedControls, type Values } from "../index";
import { addressedItems } from "../visibility";

export function itemCounterReset(meta: Meta, props: Values): Values {
  const changes: Values = {};
  for (const { step } of nestedControls(meta, props)) {
    if (step) changes[step.key] = undefined;
  }
  addressedItems(meta, props).forEach((row, index) => {
    const id = String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);
    for (const spec of Object.values(meta.items?.adjust ?? {})) {
      if (!spec) continue;
      const key = `${id}/$adjust/${spec.prop}`;
      changes[key] = changes[`$wire/${key}`] = undefined;
    }
  });
  return changes;
}
