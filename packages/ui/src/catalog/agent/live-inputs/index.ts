import type { Meta } from "../../meta";
import { projectRuntimeSets } from "../clocks";
import { selectDeviceData, type DeviceData } from "../device-data";
import type { Affordance, SendDraft, Values } from "../index";
import { linkedInput, projectLinkedEdits } from "../linked-edits";
import { addressedItems } from "../visibility";

export type LiveInput = { kind: "check" } | { kind: "text"; max: number };
type Get = (part: string) => unknown;

/** Undefined means an ordinary send; null means a declared send is not ready. */
export function sendDraft(
  meta: Meta,
  props: Values,
  part: string,
  instance: string,
): SendDraft | null | undefined {
  const sends = meta.live?.send;
  if (!sends || !Object.hasOwn(sends, part)) return undefined;
  const { field, audience: prop } = sends[part]!;
  const spec = meta.live?.text?.[field];
  const text = spec && props[spec.prop];
  if (typeof text !== "string" || !text.trim()) return null;
  const address = field === "root" ? instance : `${instance}/${field}`;
  if (prop === undefined) return { address, text };
  const audience = props[prop];
  return typeof audience === "string" && audience ? { address, text, audience } : null;
}

export function projectNamedSelections(
  meta: Meta,
  props: Values,
  get: Get,
  mode: "wire" | "runtime",
): Values {
  for (const { prop, runtime, clear } of Object.values(meta.selections ?? {})) {
    if (Boolean(runtime) !== (mode === "runtime")) continue;
    const selected = get(runtime ? `$selection/${prop}` : `$${prop}`);
    if (selected === undefined) continue;
    const value = selected === clear ? undefined : selected;
    if (value !== undefined && value !== props[prop]) props = { ...props, [prop]: value };
    else if (value === undefined && props[prop] !== undefined) props = { ...props, [prop]: undefined };
  }
  return props;
}

/** These keys are distinct from raw address values and rejected edit drafts. */
export const liveInputKey = (target: string, action: "type" | "check") => `$${action}/${target}`;

function applyText(meta: Meta, props: Values, get: Get) {
  for (const [part, { prop, max }] of Object.entries(meta.live?.text ?? {})) {
    const value = get(liveInputKey(part, "type"));
    if (typeof value === "string" && value.length <= max) props = { ...props, [prop]: value };
  }
  return props;
}

function applyChecks(meta: Meta, props: Values, get: Get) {
  if (!meta.items || !meta.live?.checks) return props;
  const rows = addressedItems(meta, props);
  if (!rows.length) return props;
  return {
    ...props,
    [meta.items.key]: rows.map((row) => {
      for (const [part, prop] of Object.entries(meta.live!.checks!)) {
        const target = part === "root" ? String(row.id) : `${String(row.id)}/${part}`;
        const value = get(liveInputKey(target, "check"));
        if (typeof value === "boolean" && typeof row[prop] === "boolean") row = { ...row, [prop]: value };
      }
      return row;
    }),
  };
}

/** Overlay local inputs and derive gates on addressed, parsed props. Keep the wire seed intact. */
export function projectLiveInputs(
  meta: Meta,
  props: Values,
  instance: string,
  get: Get,
  data?: DeviceData,
  validated = props,
): Values {
  const seeded = projectRuntimeSets(meta, props, get, validated);
  const selected = projectNamedSelections(meta, seeded, get, "runtime");
  const edited = applyChecks(meta, applyText(meta, selected, get), get);
  const projected = projectLinkedEdits(meta, edited, get, data);
  const derived = meta.live?.derive?.(projected, instance, selectDeviceData(meta, data));
  const live = derived ? { ...projected, ...derived } : projected;
  return live === seeded ? live : projectRuntimeSets(meta, live, get, validated);
}

/** Annotate declared inputs with their exact value/limits, not an item's first boolean. */
export function withLiveInput(meta: Meta, part: string, action: string, holder: Values, row: boolean) {
  if (action === "type" && row && Object.hasOwn(meta.items?.edits ?? {}, part)) {
    const spec = meta.items!.edits![part];
    if (spec?.action === "type") return { input: { kind: "text", max: spec.max } as const };
  }
  if (action === "type" && !row) {
    const text = meta.live?.text;
    const spec = linkedInput(meta, part) ?? (text && Object.hasOwn(text, part) ? text[part] : undefined);
    if (spec) return { input: { kind: "text", max: spec.max } as const };
  }
  if (row && action === "check" && Object.hasOwn(meta.live?.checks ?? {}, part)) {
    const done = holder[meta.live!.checks![part]!];
    if (typeof done === "boolean")
      return { input: { kind: "check" } as const, detail: `:${done ? "done" : "todo"}` };
  }
  return {};
}

export function storeLiveInput(next: Values, screen: string, found: Affordance, value: unknown) {
  if (!found.input) return;
  const [instance, ...parts] = found.address.split("/");
  const target = parts.join("/") || "root";
  const action = found.input.kind === "text" ? "type" : "check";
  next[`${screen}/${instance}/${liveInputKey(target, action)}`] = value;
}
