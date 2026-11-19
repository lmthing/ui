import type { Meta } from "../meta";
import { nestedControls } from "./selection";

export type Affordance = { address: string; part: string; action: string; detail: string };
type Props = Record<string, unknown>;

const firstBoolean = (value: Props) => Object.values(value).find((v) => typeof v === "boolean");

function detailOf(action: string, holder: Props): string {
  if ((action === "press" || action === "select") && typeof holder.goto === "string")
    return `→${holder.goto}`;
  if (action === "toggle" && ["on", "off"].includes(String(holder.value))) return `:${holder.value}`;
  if (action === "toggle" || action === "check") {
    const on = firstBoolean(holder);
    if (on !== undefined) return action === "check" ? `:${on ? "done" : "todo"}` : `:${on ? "on" : "off"}`;
    if (typeof holder.trail === "string") return "";
  }
  return "";
}

type When = Record<string, Record<string, string | boolean>> | undefined;

/** A rule matches when every key equals its value, read from the item first, then the component. */
function matches(rule: Record<string, string | boolean> | undefined, holder: Props, outer: Props): boolean {
  return (
    !rule ||
    Object.entries(rule).every(([key, value]) => (key in holder ? holder[key] : outer[key]) === value)
  );
}

/** A part exists when its `when` matches and, if named like an optional prop, that prop is set. */
function present(part: string, holder: Props, when: When, outer: Props): boolean {
  if (!matches(when?.[part], holder, outer)) return false;
  return !(part in holder) || holder[part] !== undefined;
}

function partsOf(
  spec: Record<string, readonly string[]> | undefined,
  holder: Props,
  base: string,
  when: When,
  outer: Props,
) {
  return Object.entries(spec ?? {}).flatMap(([part, actions]) =>
    present(part, holder, when, outer)
      ? actions
          .filter((action) => matches(when?.[`${part}.${action}`], holder, outer))
          .map((action) => {
            const target = (holder[part] as Props | undefined) ?? holder;
            const nested = typeof target === "object" && target !== holder ? target : holder;
            return {
              address: part === "root" ? base : `${base}/${part}`,
              part,
              action,
              detail: detailOf(action, nested),
            };
          })
      : [],
  );
}

/**
 * Every action a model may take on one component instance, with its address relative to the screen
 * (`l1/r1/trail`). The reader prints these and act checks verify each one exists on screen.
 */
export function affordancesOf(meta: Meta, props: Props, instance: string): Affordance[] {
  const when = meta.actions?.when as When;
  const own = partsOf(meta.actions?.parts as Record<string, readonly string[]>, props, instance, when, props);
  const key = meta.items?.key;
  const items = key && Array.isArray(props[key]) ? (props[key] as Props[]) : [];
  // `$first` in a rule is true only for the first item (the top card of a stack).
  const itemActions = items.flatMap((item, index) =>
    partsOf(
      meta.actions?.items as Record<string, readonly string[]>,
      item,
      `${instance}/${String(item.id)}`,
      when,
      { ...props, $first: index === 0 },
    ),
  );
  const controls = nestedControls(meta, props);
  const targets = new Set(controls.map((control) => `${instance}/${control.target}`));
  const nested = controls
    .filter((control) => control.enabled)
    .map(({ target, part, spec, item }) => ({
      address: `${instance}/${target}`,
      part,
      action: spec.action,
      detail:
        spec.action === "toggle"
          ? `:${item[spec.prop] ? "on" : "off"}`
          : item[spec.prop] === undefined
            ? ""
            : ` = ${JSON.stringify(item[spec.prop])}`,
    }));
  return [...own, ...itemActions.filter((control) => !targets.has(control.address)), ...nested];
}

/** Every action names its own address, so a model copies it and never assembles one: `[l1/r1/trail toggle:on]`. */
export function formatAffordance({ address, action, detail }: Affordance): string {
  return `[${address} ${action}${detail}]`;
}
