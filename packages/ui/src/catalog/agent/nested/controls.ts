import type { Meta } from "../../meta";
import type { Values } from "../index";
import { activeParentId, idOf, rowsOf } from "../selection";
import { normalizeChoices, type ChoiceOption } from "../validate-value";
import { groupPolicies } from "./groups";
import { nestedStepAt } from "./nested-step";

type Nested = NonNullable<NonNullable<Meta["items"]>["nested"]>;
type Get = (part: string) => unknown;
type Part = Nested["parts"][string];

export function nestedChoices(spec: Part, parent: Values, item: Values): ChoiceOption[] | undefined {
  if (spec.action !== "select") return;
  const source = spec.choices;
  return normalizeChoices(
    "prop" in source ? (source.from === "parent" ? parent : item)[source.prop] : source,
  );
}

function controlsForParent(nested: Nested, row: Values, id: string, active: boolean) {
  const parts = Object.entries(nested.parts);
  const children = row[nested.key];
  if (!Array.isArray(children)) return [];
  const controls = (children as Values[]).flatMap((item, at) =>
    parts.map(([name, spec]) => {
      const part = `${name}_${at + 1}`;
      const when = spec.when;
      const matches =
        typeof when === "object"
          ? item[when.prop] === when.equals
          : !when || item[nested.parts[when]?.prop ?? when] === true;
      const choices = nestedChoices(spec, row, item);
      const peers =
        (nested.groups || nested.maxActive !== undefined) && spec.action === "toggle"
          ? parts.filter(([, peer]) => peer.action === "toggle" && peer.prop === spec.prop)
          : undefined;
      const togglePeers = peers?.map(([peer]) => `${id}/${peer}_${at + 1}`);
      const enabled = active && matches && (choices === undefined || choices.length > 0);
      const step = nestedStepAt(spec, item, id, at);
      return {
        target: `${id}/${part}`,
        part,
        spec,
        item,
        at,
        togglePeers,
        enabled,
        ...(step ? { step } : {}),
        ...(choices ? { choices } : {}),
      };
    }),
  );
  const policies = nested.groups && groupPolicies(nested, row, controls);
  return controls.map((control) => ({ ...control, policy: policies?.get(control.target) }));
}

/** Enumerate real sub-items and attach shared availability used by kit and the planner. */
export function nestedControls(meta: Meta, props: Values, get?: Get) {
  const nested = meta.items?.nested;
  if (!nested) return [];
  const activeParent = activeParentId(meta, props, get);
  return rowsOf(meta, props).flatMap((row, index) => {
    const id = idOf(meta, row, index);
    return controlsForParent(nested, row, id, !nested.activeParent || id === activeParent);
  });
}

export function nestedRemaining(meta: Meta, props: Values, controls = nestedControls(meta, props)) {
  const limit = meta.items?.nested?.maxActive;
  if (limit === undefined) return undefined;
  const on = controls.filter(({ spec, item }) => spec.action === "toggle" && item[spec.prop] === true);
  return Math.max(0, limit - on.length);
}

type Control = ReturnType<typeof nestedControls>[number];
export function nestedCapacityBlocked(control: Control, remaining: number | undefined) {
  const { policy, spec, item, togglePeers } = control;
  if (spec.action !== "toggle" || item[spec.prop] === true) return false;
  if (policy?.blocked) return true;
  return remaining !== undefined && remaining < (togglePeers?.length ?? 0) - (policy?.replace.length ?? 0);
}

export function nestedAt(meta: Meta, props: Values, target: string) {
  return nestedControls(meta, props).find((control) => control.target === target);
}
