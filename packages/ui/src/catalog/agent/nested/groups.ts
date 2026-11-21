import type { Meta } from "../../meta";
import type { Values } from "../index";

type Nested = NonNullable<NonNullable<Meta["items"]>["nested"]>;
type Member = { item: Values; at: number; prop: string; targets: string[]; enabled: boolean };
type Policy = { remaining: number; blocked: boolean; replace: string[] };

function groupAssignments(nested: Nested) {
  const byProp = new Map<string, string>();
  for (const spec of Object.values(nested.parts)) {
    if (spec.action !== "toggle" || spec.group === undefined) continue;
    const existing = byProp.get(spec.prop);
    if (
      !Object.hasOwn(nested.groups ?? {}, spec.group) ||
      (existing !== undefined && existing !== spec.group)
    )
      throw new Error(`Invalid nested group for ${spec.prop}: each field needs one declared policy`);
    byProp.set(spec.prop, spec.group);
  }
  return byProp;
}

/** Count selected fields, not aliases, within each partition of this parent. */
export function groupPolicies(
  nested: Nested,
  parent: Values,
  controls: { item: Values; at: number; spec: Nested["parts"][string]; target: string; enabled: boolean }[],
) {
  const policies = new Map<string, Policy>();
  const byProp = groupAssignments(nested);
  for (const [name, group] of Object.entries(nested.groups ?? {})) {
    const partitions = new Map<unknown, Member[]>();
    for (const control of controls) {
      const { spec, at } = control;
      if (spec.action !== "toggle" || byProp.get(spec.prop) !== name) continue;
      const key = group.by === undefined ? undefined : control.item[group.by];
      const members = partitions.get(key) ?? [];
      const alias = members.find((member) => member.at === at && member.prop === spec.prop);
      if (alias) {
        alias.targets.push(control.target);
        alias.enabled ||= control.enabled;
      } else {
        members.push({
          item: control.item,
          at,
          prop: spec.prop,
          targets: [control.target],
          enabled: control.enabled,
        });
      }
      partitions.set(key, members);
    }
    const limit =
      group.mode === "single" ? 1 : typeof group.max === "number" ? group.max : parent[group.max.prop];
    for (const members of partitions.values()) applyPolicy(policies, members, limit, group.mode === "single");
  }
  return policies;
}

function applyPolicy(policies: Map<string, Policy>, members: Member[], limit: unknown, single: boolean) {
  const active = members.filter(({ item, prop }) => item[prop] === true);
  const remaining =
    typeof limit === "number" && Number.isSafeInteger(limit) ? Math.max(0, limit - active.length) : 0;
  const replace = active.flatMap(({ targets }) => targets);
  for (const member of members) {
    const on = active.includes(member);
    const blocked = !on && (single ? active.some(({ enabled }) => !enabled) : remaining === 0);
    for (const target of member.targets)
      policies.set(target, { remaining, blocked, replace: single && !on ? replace : [] });
  }
}
