import {
  selectionAt,
  selectionOffer,
  itemEditSpec,
  pickerAt,
  stampItemIds,
  isAdjustOnlyItem,
  itemCounterReset,
  nestedAt,
  isCollectionItem,
  nestedPart,
  adjustmentAt,
  clearItemSets,
  controlValueKey,
  projectControlInput,
  type ActStep,
  type Definition,
  type ScreenLike,
  type Values,
} from "../../catalog";
import { valueKey } from "./live-screen";
import { clockChanges, selectControl, fieldControl, valueControl, type ControlContext } from "./controls";
type Entry = ScreenLike["components"][number];
export type ControlChange = {
  values: Values;
  value?: unknown;
  error?: string;
  disabled?: boolean;
  send?: { text: string; address: string };
  requestPhoto?: string;
};
/** Infer addressed row values, but require an explicit value for declared choice lists. */
export function selectedStep(step: ActStep, entry: Entry, input: Values, def: Definition): ActStep {
  if (step.action !== "select" || step.value !== undefined || def.meta.select?.runtime) return step;
  const local = (step.address === entry.id ? "root" : step.address.replace(`${entry.id}/`, "")).replace(
    /\/root$/,
    "",
  );
  if (selectionOffer(def.meta, local) || itemEditSpec(def.meta, local)?.action === "select") return step;
  if (
    (def.meta.collections && isCollectionItem(local.split("/")[0])) ||
    nestedPart(def.meta, local)?.action === "select"
  )
    return step;
  if (def.meta.items?.pickers && pickerAt(def.meta, stampItemIds(def.meta, input), local)) return step;
  const found = selectionAt(def.meta, input, local);
  if (found?.row && def.meta.items?.deviceData) return { ...step, value: found.value };
  const level = local.match(/(?:^|\/)l([1-5])$/);
  if (level) return { ...step, value: Number(level[1]) };
  return found ? { ...step, value: found.value } : step;
}

/** Stage the clear only from the dispatcher's confirmation-resume path. */
export function stageConfirmedClear(
  screen: string,
  entry: Entry,
  input: Values,
  def: Definition,
  step: ActStep,
  values: Values,
): Values | undefined {
  if (step.action !== "press" || (!def.meta.clearItems && !def.meta.items?.reset)) return values;
  const target = step.address.split("/").slice(1).join("/") || "root";
  const changes = Object.entries(clearItemSets(def.meta, input, target));
  const reset = def.meta.items?.reset === target ? Object.entries(itemCounterReset(def.meta, input)) : [];
  if (!changes.length && !reset.length) return values;
  const next = { ...values };
  for (const [part, value] of reset) next[valueKey(screen, entry.id, part)] = value;
  for (const [part, value] of changes) next[valueKey(screen, entry.id, controlValueKey(def, part))] = value;
  const { id: _id, c: _c, state: _state, ...wire } = entry;
  const get = (part: string) => next[valueKey(screen, entry.id, part)];
  if (def.props.safeParse(projectControlInput(def, wire, get)).success) return next;
}

export function controlStep(
  screen: ScreenLike,
  entry: Entry,
  input: Values,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  now: number,
  lang?: string,
): ControlChange {
  const next = { ...values };
  const parts = step.address.replace(`${screen.id}/`, "").split("/");
  const target = parts.slice(1).join("/") || "root";
  const edit = itemEditSpec(defs[entry.c]!.meta, target);
  if (edit?.action === "photo" && step.action === "press")
    return { values: next, requestPhoto: valueKey(screen.id, entry.id, target) };
  if (edit?.action === step.action)
    return { values: next, value: next[valueKey(screen.id, entry.id, target)] };
  const ctx: ControlContext = {
    screen,
    entry,
    input,
    def: defs[entry.c]!,
    values: next,
    step,
    now,
    lang,
    target,
    index: /^r[1-9][0-9]*$/.test(parts[1] ?? "") ? Number(parts[1]!.slice(1)) - 1 : -1,
    get: (part) => next[valueKey(screen.id, entry.id, part)],
    put: (part, value) => {
      next[valueKey(screen.id, entry.id, part)] = value;
    },
    bad: (error, disabled = false) => ({ values, error, disabled }),
  };
  const selection = selectControl(ctx);
  if (selection.error) return selection;
  const adjustment = adjustmentAt(ctx.def.meta, input, target, step.action, ctx.get, now);
  const planned = isAdjustOnlyItem(adjustment, step.action);
  const clockAdjustment = planned ? { ...adjustment, next: undefined } : adjustment;
  const clocks = clockChanges(ctx.def.meta, input, ctx.get, target, step, now, clockAdjustment);
  Object.entries(clocks).forEach(([part, value]) => ctx.put(part, value));
  if (planned || adjustment?.atSet) return { values: next, value: ctx.get(target) };
  if (adjustment?.next !== undefined) return { values: next, value: adjustment.next };
  if (nestedAt(ctx.def.meta, input, target)) return { values: next, value: ctx.get(target) };
  const result = entry.c === "Field" ? fieldControl(ctx) : valueControl(ctx);
  if (result.error || result.send || result.requestPhoto) return result;
  let changed = "value" in result ? result.value : selection.value;
  if (Object.keys(clocks).length && ["start", "stop"].includes(step.action))
    changed = step.action === "start" ? "running" : "stopped";
  if (entry.c === "List" && input.style === "expand" && step.action === "toggle") changed = ctx.get(target);
  if (entry.c === "SwipeStack" && step.action === "swipe") {
    ctx.put("$cursor", Number(ctx.get("$cursor") ?? 0) + 1);
    changed = step.value;
  }
  if (step.action === "dismiss" && entry.c !== "Sheet") ctx.put("$dismissed", true);
  if (entry.c === "Success" && step.action === "press" && target === "undo") ctx.put("$dismissed", true);
  if (ctx.def.meta.signature) ctx.put("$cue", Number(ctx.get("$cue") ?? 0) + 1);
  return { values: next, ...(changed === undefined ? {} : { value: changed }) };
}
