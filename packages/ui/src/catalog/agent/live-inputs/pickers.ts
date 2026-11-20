import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { ActStep, Values } from "../act";
import { parseControlProps } from "../live-props";
import type { ScreenLike } from "../read";
import { addressedItems } from "../visibility";

const targetOf = (item: unknown, part: string) => (part === "root" ? String(item) : `${item}/${part}`);
const selectionKey = (target: string) => `$selection/${target}`;
export const pickerKey = "$picker";

export function pickerAt(meta: Meta, props: Values, target: string) {
  const [item, part = "root", extra] = target.split("/");
  if (extra !== undefined || !Object.hasOwn(meta.items?.pickers ?? {}, part)) return;
  const row = addressedItems(meta, props).find(({ id }) => id === item);
  if (row) return { row, spec: meta.items!.pickers![part]! };
}

export function projectPickers(meta: Meta, props: Values, get: (target: string) => unknown) {
  const items = meta.items;
  if (!items?.pickers) return props;
  const rows = addressedItems(meta, props);
  return {
    ...props,
    [items.key]: rows.map((row) => {
      for (const [part, { prop }] of Object.entries(items.pickers!)) {
        const value = get(selectionKey(targetOf(row.id, part)));
        if (value !== undefined) row = { ...row, [prop]: value === null ? undefined : value };
      }
      return row;
    }),
  };
}

function clearInputs(
  meta: Meta,
  props: Values,
  part: string,
  id: string,
  put: (key: string, value: unknown) => void,
) {
  if (!Object.hasOwn(meta.clear ?? {}, part)) return;
  const clear = meta.clear![part]!;
  for (const text of clear.text) {
    if (!Object.hasOwn(meta.live?.text ?? {}, text)) continue;
    const address = text === "root" ? id : `${id}/${text}`;
    put(address, "");
    put(`${address}/$draft`, undefined);
    put(`${address}/$error`, undefined);
    put(`${id}/$type/${text}`, "");
  }
  for (const { id: item } of addressedItems(meta, props)) {
    for (const name of clear.pickers) {
      if (!Object.hasOwn(meta.items?.pickers ?? {}, name)) continue;
      const target = targetOf(item, name);
      put(`${id}/${selectionKey(target)}`, null);
      put(`${id}/${target}`, undefined);
    }
  }
}

function stagePickerInputs(meta: Meta, props: Values, step: ActStep, values: Values, screen: string) {
  const [id, ...parts] = step.address.split("/");
  const target = parts.join("/") || "root";
  const put = (key: string, value: unknown) => (values[`${screen}/${key}`] = value);
  const open = `${id}/${pickerKey}`;
  if (step.action === "press") {
    if (pickerAt(meta, props, target)) put(open, values[`${screen}/${open}`] === target ? undefined : target);
    else if (Object.hasOwn(meta.clear ?? {}, target)) {
      clearInputs(meta, props, target, id!, put);
      put(open, undefined);
    }
  } else if (step.action === "select" && pickerAt(meta, props, target)) {
    put(`${id}/${selectionKey(target)}`, step.value);
    if (values[`${screen}/${open}`] === target) put(open, undefined);
  }
}

export function stageInlineInputs(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  step: ActStep,
  values: Values,
) {
  if (step.action !== "press" && step.action !== "select") return;
  const id = step.address.split("/")[0]!;
  const { id: _id, c, state: _state, ...raw } = screen.components.find((entry) => entry.id === id)!;
  const def = defs[c]!;
  if (!def.meta.clear && !def.meta.items?.pickers) return;
  const props = parseControlProps(def, raw, (part) => values[`${screen.id}/${id}/${part}`]);
  stagePickerInputs(def.meta, props, step, values, screen.id);
}
