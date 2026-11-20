import { selectionAt, selectionError, selectionChanges } from "../../../catalog";
import type { ControlChange } from "../index";
import type { ControlContext } from "./types";
export function selectControl(ctx: ControlContext): ControlChange {
  const { step, def, input, target, put, bad, values } = ctx;
  if (step.action !== "select" || !def.meta.select) return { values };
  if (Object.hasOwn(def.meta.selections ?? {}, target)) return { values };
  const error = selectionError(def.meta, input, target, step.value);
  if (error) return bad(error);
  Object.entries(selectionChanges(def.meta, input, target, step.value)).forEach(([part, value]) =>
    put(part, value),
  );
  return { values, value: selectionAt(def.meta, input, target, step.value)!.value };
}
