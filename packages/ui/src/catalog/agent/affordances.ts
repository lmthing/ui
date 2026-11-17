import type { Meta } from "../meta";

export type Affordance = { address: string; part: string; action: string; detail: string };
type Props = Record<string, unknown>;

const firstBoolean = (value: Props) => Object.values(value).find((v) => typeof v === "boolean");

function detailOf(action: string, holder: Props): string {
  if (action === "press" && typeof holder.goto === "string") return `→${holder.goto}`;
  if (action === "toggle" || action === "check") {
    const on = firstBoolean(holder);
    if (on !== undefined) return action === "check" ? `:${on ? "done" : "todo"}` : `:${on ? "on" : "off"}`;
    if (typeof holder.trail === "string") return "";
  }
  return "";
}

type When = Record<string, Record<string, string | boolean>> | undefined;

/** A part exists when its `when` matches and, if named like an optional prop, that prop is set. */
function present(part: string, holder: Props, when: When): boolean {
  const rule = when?.[part];
  if (rule && Object.entries(rule).some(([key, value]) => holder[key] !== value)) return false;
  return !(part in holder) || holder[part] !== undefined;
}

function partsOf(
  spec: Record<string, readonly string[]> | undefined,
  holder: Props,
  base: string,
  when: When,
) {
  return Object.entries(spec ?? {}).flatMap(([part, actions]) =>
    present(part, holder, when)
      ? actions.map((action) => {
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
  const own = partsOf(meta.actions?.parts as Record<string, readonly string[]>, props, instance, when);
  const key = meta.items?.key;
  const items = key && Array.isArray(props[key]) ? (props[key] as Props[]) : [];
  const itemActions = items.flatMap((item) =>
    partsOf(
      meta.actions?.items as Record<string, readonly string[]>,
      item,
      `${instance}/${String(item.id)}`,
      when,
    ),
  );
  return [...own, ...itemActions];
}

/** Every action names its own address, so a model copies it and never assembles one: `[l1/r1/trail toggle:on]`. */
export function formatAffordance({ address, action, detail }: Affordance): string {
  return `[${address} ${action}${detail}]`;
}
