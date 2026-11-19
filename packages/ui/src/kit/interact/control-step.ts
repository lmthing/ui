import {
  selectionAt,
  nestedAt,
  adjustmentAt,
  clearItemSets,
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
  if (step.action !== "select" || step.value !== undefined) return step;
  const local = (step.address === entry.id ? "root" : step.address.replace(`${entry.id}/`, "")).replace(
    /\/root$/,
    "",
  );
  if (Object.hasOwn(def.meta.select?.choices ?? {}, local)) return step;
  const level = local.match(/(?:^|\/)l([1-5])$/);
  if (level) return { ...step, value: Number(level[1]) };
  const found = selectionAt(def.meta, input, local);
  return found ? { ...step, value: found.value } : step;
}

function clearSets(ctx: ControlContext) {
  const { step, def, input, entry, target, put, get } = ctx;
  if (step.action !== "press" || !def.meta.clearItems) return true;
  const changes = Object.entries(clearItemSets(def.meta, input, target));
  if (!changes.length) return true;
  changes.forEach(([part, value]) => put(part, value));
  const { id: _id, c: _c, state: _state, ...wire } = entry;
  return def.props.safeParse(projectControlInput(def, wire, get)).success;
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
  if (!clearSets(ctx)) return ctx.bad("Clear conflicts with component props");
  const adjustment = adjustmentAt(ctx.def.meta, input, target, step.action, ctx.get, now);
  const clocks = clockChanges(ctx.def.meta, input, ctx.get, target, step, now, adjustment);
  Object.entries(clocks).forEach(([part, value]) => ctx.put(part, value));
  if (adjustment?.atSet) return { values: next, value: ctx.get(target) };
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
