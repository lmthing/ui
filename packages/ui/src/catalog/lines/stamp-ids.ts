import type { Meta } from "../meta";

/**
 * Give each item of a component its stable id (`r1`, `r2`, … or the meta's prefix), as the
 * validator does. Views receive these ids; the model never writes them.
 */
export function stampItemIds<P extends Record<string, unknown>>(meta: Meta, props: P): P {
  const items = meta.items;
  if (!items) return props;
  const list = props[items.key];
  if (!Array.isArray(list)) return props;
  const prefix = items.prefix ?? "r";
  return {
    ...props,
    [items.key]: list.map((item: object, index) => ({ ...item, id: `${prefix}${index + 1}` })),
  };
}
