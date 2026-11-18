import type { Values } from "../../../catalog";
import type { ControlChange } from "../index";
import type { ControlContext } from "./types";
const labelOf = (item: Values | undefined) => item?.label ?? item?.title ?? item?.day;
export function selectControl(ctx: ControlContext): ControlChange {
  const { step, index, def, input, entry, put, bad, values } = ctx;
  if (step.action !== "select" || index < 0) return { values };
  const key = def.meta.items?.key;
  const item = key ? (input[key] as Values[])[index] : undefined;
  if (!item) return bad("No option at this address");
  const expected = entry.c === "Calendar" ? item.day : index;
  if (step.value !== expected && step.value !== index && step.value !== labelOf(item))
    return bad("Select the option at this address");
  if (entry.c === "Calendar") put("$selected", expected);
  else if (["Choice", "Segmented", "TabBar", "Sheet"].includes(entry.c)) {
    put("$at", index);
    if (entry.c === "Sheet") put("at", index);
  } else if (entry.c === "Chips")
    (input.items as Values[]).forEach((_row, at) => put(`r${at + 1}`, at === index));
  return { values, value: expected };
}
