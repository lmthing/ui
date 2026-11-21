import type { Meta } from "../../meta";
import type { Values } from "../index";
import { addressedItems } from "../visibility";

export function itemToggleDetail(meta: Meta, part: string, row: Values): string | undefined {
  const toggles = meta.items?.toggles;
  if (part === "root" || !toggles || !Object.hasOwn(toggles, part)) return undefined;
  return row[toggles[part]!] === true ? ":on" : ":off";
}

/** Overlay named toggle values on addressed rows before deriving live visibility and summaries. */
export function projectItemToggles(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const items = meta.items;
  if (!items?.toggles) return props;
  const toggles = Object.entries(items.toggles).filter(([part]) => part !== "root");
  if (!toggles.length) return props;
  const rows = addressedItems(meta, props);
  const projected = rows.map((row) => {
    if (typeof row.id !== "string") return row;
    const id = row.id;
    for (const [part, prop] of toggles) {
      const value = get(`${id}/${part}`);
      if (typeof value === "boolean" && value !== row[prop]) row = { ...row, [prop]: value };
    }
    return row;
  });
  return projected.some((row, index) => row !== rows[index]) ? { ...props, [items.key]: projected } : props;
}
