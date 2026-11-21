import type { Meta } from "../../meta";
import { isNestedTarget, nestedControls, nestedRemaining, type Affordance, type Values } from "../index";

export function nestedActions(
  meta: Meta,
  props: Values,
  instance: string,
  items: Affordance[],
  get: (part: string) => unknown,
  includeBlocked: boolean,
) {
  const controls = nestedControls(meta, props, get);
  const targets = new Set(controls.map(({ target }) => `${instance}/${target}`));
  const policy = meta.items?.nested;
  const remaining = nestedRemaining(meta, props, controls);
  const nested = controls.flatMap(
    ({ enabled, target, part, spec, item, togglePeers, step }): Affordance[] => {
      if (!enabled || (step && step.next === undefined)) return [];
      const value = item[spec.prop];
      const blocked =
        remaining !== undefined && togglePeers && remaining < togglePeers.length && value !== true;
      if (blocked && !includeBlocked) return [];
      const detail = spec.action === "toggle" ? (value ? ":on" : ":off") : valueDetail(value);
      return [
        {
          address: `${instance}/${target}`,
          part,
          action: spec.action,
          detail,
          ...(step?.next !== undefined ? { nestedStep: { key: step.key, next: step.next } } : {}),
          ...(blocked ? { blocked: "max_active" } : {}),
          ...(includeBlocked && togglePeers && togglePeers.length > 1
            ? { togglePeers: togglePeers.map((peer) => `${instance}/${peer}`) }
            : {}),
        },
      ];
    },
  );
  const reserved = policy?.activeParent || policy?.maxActive !== undefined;
  const ordinary = items.filter(
    ({ address }) =>
      !targets.has(address) && !(reserved && isNestedTarget(meta, address.slice(instance.length + 1))),
  );
  return [...ordinary, ...nested];
}

const valueDetail = (value: unknown) => (value === undefined ? "" : ` = ${JSON.stringify(value)}`);

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

export function addressedItems(meta: Meta, props: Values): Values[] {
  const key = meta.items?.key;
  return key && Array.isArray(props[key]) ? (props[key] as Values[]) : [];
}

/** Filter already addressed items without compacting the original address space. */
export function visibleItems<T extends Values = Values>(meta: Meta, props: Values): T[] {
  const rows = addressedItems(meta, props);
  const rule = meta.items?.visibleWhen;
  return (rule ? rows.filter((row) => matches(rule, row, props, meta.deviceDataFlags)) : rows) as T[];
}

export function projectVisibleItems(meta: Meta, props: Values): Values {
  const items = meta.items;
  return items?.visibleWhen ? { ...props, [items.key]: visibleItems(meta, props) } : props;
}
