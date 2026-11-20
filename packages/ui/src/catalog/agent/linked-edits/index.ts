import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import { selectDeviceData, type DeviceData } from "../device-data";
import type { Affordance, ScreenLike, Values } from "../index";

const slot = "$linked";
type Get = (part: string) => unknown;
type Spec = NonNullable<Meta["linkedEdits"]>;
type State = Parameters<Spec["project"]>[1];

function linkedState(get: Get): State {
  return (get(slot) as State | undefined) ?? { swapped: false };
}

export function linkedInput(meta: Meta, part: string) {
  const inputs = meta.linkedEdits?.inputs;
  return inputs && Object.hasOwn(inputs, part) ? inputs[part] : undefined;
}

export function projectLinkedEdits(meta: Meta, props: Values, get: Get, data?: DeviceData): Values {
  const spec = meta.linkedEdits;
  if (!spec) return props;
  return { ...props, ...spec.project(props, linkedState(get), selectDeviceData(meta, data)) };
}

function swapSides(state: State, [first, second]: Spec["swap"]["sides"]): State {
  const { edit, swapped } = state;
  if (!edit) return { swapped: !swapped };
  const part = edit.part === first ? second : edit.part === second ? first : edit.part;
  return { swapped: !swapped, edit: { ...edit, part } };
}

/** Consume a validated action before the ordinary per-address writer can store a second value. */
export function stageLinkedEdit(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  found: Affordance,
  value: unknown,
): string | undefined {
  const [id, ...parts] = found.address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const meta = entry && defs[entry.c]?.meta;
  if (!meta?.linkedEdits) return;
  const part = parts.join("/") || "root";
  const base = `${screen.id}/${id}`;
  const key = `${base}/${slot}`;
  const state = linkedState((part) => next[`${base}/${part}`]);
  if (found.action === "type" && typeof value === "string" && linkedInput(meta, part))
    next[key] = { ...state, edit: { part, text: value } } satisfies State;
  else if (found.action === "press" && part === meta.linkedEdits.swap.part)
    next[key] = swapSides(state, meta.linkedEdits.swap.sides);
  else return;
  for (const input of Object.keys(meta.linkedEdits.inputs)) {
    const address = input === "root" ? base : `${base}/${input}`;
    for (const suffix of ["$draft", "$error"]) {
      const key = `${address}/${suffix}`;
      if (Object.hasOwn(next, key)) next[key] = undefined;
    }
  }
  return found.action === "type" ? ` = ${JSON.stringify(value)}` : "";
}
