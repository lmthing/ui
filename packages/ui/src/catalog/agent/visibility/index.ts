import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { StateName } from "../../types";
import { isNestedTarget, nestedControls, nestedRemaining, type Affordance, type Values } from "../index";
import { hasNestedCollectionControls, nestedCapacityBlocked, nestedChoiceSeed } from "../nested";

export function nestedActions(
  meta: Meta,
  props: Values,
  instance: string,
  items: Affordance[],
  get: (part: string) => unknown,
  includeBlocked: boolean,
  { schema, baselineInput }: { schema?: Definition["props"]; baselineInput?: unknown },
) {
  const controls = nestedControls(meta, props, get, schema, nestedChoiceSeed(meta, schema, baselineInput));
  const targets = new Set(controls.map(({ target }) => `${instance}/${target}`));
  const policy = meta.items?.nested;
  const remaining = nestedRemaining(meta, props, controls);
  const nested = controls.flatMap((control): Affordance[] => {
    const { enabled, target, part, spec, item, togglePeers, step, choices, policy: group } = control;
    if (!enabled || (step && step.next === undefined)) return [];
    const value = spec.action === "press" ? undefined : item[spec.prop];
    const blocked = nestedCapacityBlocked(control, remaining);
    if (blocked && !includeBlocked) return [];
    const detail = spec.action === "toggle" ? (value ? ":on" : ":off") : valueDetail(value);
    return [
      {
        address: `${instance}/${target}`,
        part,
        action: spec.action,
        detail,
        ...(step?.next !== undefined ? { nestedStep: { key: step.key, next: step.next } } : {}),
        ...(choices ? { nestedChoice: { options: choices, current: value } } : {}),
        ...(blocked ? { blocked: "max_active" } : {}),
        ...(includeBlocked && group?.replace.length
          ? { replaceToggles: group.replace.map((peer) => `${instance}/${peer}`) }
          : {}),
        ...(includeBlocked && togglePeers && (group || togglePeers.length > 1)
          ? { togglePeers: togglePeers.map((peer) => `${instance}/${peer}`) }
          : {}),
      },
    ];
  });
  const reserved =
    policy?.activeParent || policy?.maxActive !== undefined || hasNestedCollectionControls(meta);
  const ordinary = items.filter(
    ({ address }) =>
      !targets.has(address) && !(reserved && isNestedTarget(meta, address.slice(instance.length + 1))),
  );
  return [...ordinary, ...nested];
}

const valueDetail = (value: unknown) => (value === undefined ? "" : ` = ${JSON.stringify(value)}`);

export function actionAllowedIn(meta: Meta, state: StateName, pair: string, draw = false, feedback = false) {
  const errorOnly = meta.errorActions?.some((allowed) => allowed === pair);
  if (errorOnly) return state === "error";
  if (state === "filled") return true;
  if (state === "empty") return meta.emptyActions?.some((allowed) => allowed === pair);
  return (
    (state === "success" || feedback) && (draw || meta.successActions?.some((allowed) => allowed === pair))
  );
}

/** A rule reads from the item first, then from its component. */
export function matches(
  rule: Readonly<Record<string, string | boolean>> | undefined,
  holder: Values,
  outer: Values,
  flags?: Meta["deviceDataFlags"],
): boolean {
  return (
    !rule ||
    Object.entries(rule).every(
      ([key, value]) =>
        (!Object.hasOwn(flags ?? {}, key) && key in holder ? holder[key] : outer[key]) === value,
    )
  );
}

export function collectionAt(meta: Meta, name?: string) {
  return name === undefined
    ? meta.items
    : Object.hasOwn(meta.collections ?? {}, name)
      ? meta.collections![name]
      : undefined;
}

export function addressedItems(meta: Meta, props: Values, name?: string): Values[] {
  const key = collectionAt(meta, name)?.key;
  return key && Array.isArray(props[key]) ? (props[key] as Values[]) : [];
}

/** Filter already addressed items without compacting the original address space. */
export function visibleItems<T extends Values = Values>(meta: Meta, props: Values, name?: string): T[] {
  const rows = addressedItems(meta, props, name);
  const rule = collectionAt(meta, name)?.visibleWhen;
  return (rule ? rows.filter((row) => matches(rule, row, props, meta.deviceDataFlags)) : rows) as T[];
}

export function projectVisibleItems(meta: Meta, props: Values): Values {
  const items = meta.items;
  const own = items?.visibleWhen ? { ...props, [items.key]: visibleItems(meta, props) } : props;
  let projected = own;
  for (const [name, collection] of Object.entries(meta.collections ?? {}))
    if (collection.visibleWhen)
      projected = { ...projected, [collection.key]: visibleItems(meta, props, name) };
  return projected;
}
