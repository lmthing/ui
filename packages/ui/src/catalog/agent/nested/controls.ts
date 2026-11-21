import { z } from "zod";
import type { Meta } from "../../meta";
import type { Values } from "../index";
import { activeParentId, idOf, rowsOf } from "../selection";
import { normalizeChoices, type ChoiceOption } from "../validate-value";
import { groupPolicies } from "./groups";
import { nestedStepAt } from "./nested-step";

type Nested = NonNullable<NonNullable<Meta["items"]>["nested"]>;
type Get = (part: string) => unknown;
type Part = Nested["parts"][string];

type ChoiceField = (prop: string) => z.ZodType | undefined;

export function nestedChoices(
  spec: Part,
  parent: Values,
  item: Values,
  field?: ChoiceField,
): ChoiceOption[] | undefined {
  if (spec.action !== "select") return;
  const source = spec.choices;
  const options = normalizeChoices(
    "prop" in source ? (source.from === "parent" ? parent : item)[source.prop] : source,
  );
  const valueSchema = field?.(spec.prop);
  if (!field) return options;
  return valueSchema ? options.filter(({ value }) => valueSchema.safeParse(value).data === value) : [];
}

function rowShape(schema: unknown): z.ZodObject | undefined {
  while (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault
  )
    schema = schema.unwrap();
  if (schema instanceof z.ZodArray && schema.element instanceof z.ZodObject) return schema.element;
}

function controlsForParent(
  nested: Nested,
  row: Values,
  id: string,
  active: boolean,
  field?: ChoiceField,
  wireChildren?: unknown[],
) {
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
      const choices = nestedChoices(
        spec,
        row,
        item,
        wireChildren && !wireChildren[at] ? () => undefined : field,
      );
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
  const grouped =
    nested.groups || parts.some(([, spec]) => spec.action === "toggle" && spec.group !== undefined);
  const policies = grouped ? groupPolicies(nested, row, controls) : undefined;
  return controls.map((control) => ({ ...control, policy: policies?.get(control.target) }));
}

/** Enumerate real sub-items and attach shared availability used by kit and the planner. */
export function nestedControls(
  meta: Meta,
  props: Values,
  get?: Get,
  schema?: z.ZodObject,
  baseline?: Values,
) {
  const nested = meta.items?.nested;
  if (!nested) return [];
  const activeParent = activeParentId(meta, props, get);
  const parent = rowShape(schema?.shape[meta.items!.key]);
  const child = rowShape(parent?.shape[nested.key]);
  const wireRows = baseline && rowsOf(meta, baseline);
  return rowsOf(meta, props).flatMap((row, index) => {
    const id = idOf(meta, row, index);
    const children = wireRows?.[index]?.[nested.key];
    return controlsForParent(
      nested,
      row,
      id,
      !nested.activeParent || id === activeParent,
      schema && ((prop) => child?.shape[prop]),
      wireRows && (Array.isArray(children) ? children : []),
    );
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
