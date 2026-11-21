import {
  dateSpanItem,
  pickerAt,
  selectionAt,
  selectionError,
  selectionChanges,
  sessionEvent,
  stampItemIds,
} from "../../../catalog";
import type { ControlChange } from "../index";
import type { ControlContext } from "./types";
export function selectControl(ctx: ControlContext): ControlChange {
  const { step, def, input, target, put, bad, values } = ctx;
  // The planner resolves runtime flags against live rows, which may not exist in this input.
  if (step.action !== "select" || !def.meta.select || def.meta.select.runtime) return { values };
  if (
    (def.meta.dateSpan && dateSpanItem(def.meta, stampItemIds(def.meta, input), target)) ||
    Object.hasOwn(def.meta.selections ?? {}, target) ||
    (def.meta.items?.pickers && pickerAt(def.meta, stampItemIds(def.meta, input), target)) ||
    sessionEvent(def.meta, target, step.action) === "answer"
  )
    return { values };
  const error = selectionError(def.meta, input, target, step.value);
  if (error) return bad(error);
  Object.entries(selectionChanges(def.meta, input, target, step.value)).forEach(([part, value]) =>
    put(part, value),
  );
  return { values, value: selectionAt(def.meta, input, target, step.value)!.value };
}
