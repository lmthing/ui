import {
  affordancesOf,
  nestedAt,
  planAct,
  type Affordance,
  type Definition,
  type Meta,
} from "@lmthing/ui/catalog";
import { renderedAddresses } from "./variant-parts";

type Props = Record<string, unknown>;
const screen = "home";
const component = "c1";

export function peekHiddenItems(ids: string[], addresses: string[]) {
  const visible = ids.filter((id) => addresses.includes(`${screen}/${component}/${id}/root`));
  const hidden = ids.filter((id) => !visible.includes(id));
  const issues: string[] = [];
  if (!visible.every((id, index) => id === ids[index]) || (!visible.length && ids.length))
    issues.push("Peek must retain the first items at their original addresses");
  for (const id of hidden)
    if (addresses.some((address) => address.startsWith(`${screen}/${component}/${id}/`)))
      issues.push(`Peek still renders parts of ${id}`);
  return { hidden, issues };
}

export function peekForExample(meta: Meta, props: Props, html: string) {
  if (meta.variants?.overflow?.includes("peek") && props.overflow === "peek" && meta.items) {
    const rows = props[meta.items.key] as { id: string }[];
    return peekHiddenItems(
      rows.map(({ id }) => id),
      renderedAddresses(html),
    );
  }
  return { hidden: [], issues: [] };
}

function setValue(meta: Meta, props: Props, { address, detail }: Affordance) {
  const nested = nestedAt(meta, props, address.slice(component.length + 1));
  const { min = -Infinity, max = Infinity, integer } = nested?.spec ?? {};
  const value = Number(detail.split(" = ")[1] ?? 0);
  const sample = Number.isFinite(value) ? value : 0;
  return integer
    ? Math.min(Math.floor(max), Math.max(Math.ceil(min), Math.round(sample)))
    : Math.min(max, Math.max(min, sample));
}

function actionValue(meta: Meta, props: Props, affordance: Affordance) {
  const { action } = affordance;
  switch (action) {
    case "set":
      return setValue(meta, props, affordance);
    case "type":
    case "move":
      return "1";
    case "select":
      return meta.select ? undefined : 0;
    case "seek":
      return 0;
    case "swipe":
      return "left";
  }
}

/** A hidden row keeps the same action target it had before the collection was collapsed. */
export function variantPeekIssues(
  def: Definition,
  input: Props,
  baseline: { input: Props; props: Props },
  hidden: string[],
  read: string[],
) {
  if (!hidden.length) return [];
  const issues: string[] = [];
  if (!read.some((line) => line.trim() === `and ${hidden.length} more`))
    issues.push(`Missing peek count: and ${hidden.length} more`);
  for (const id of hidden)
    if (read.some((line) => line.trimStart().match(/^\S+/)?.[0] === id))
      issues.push(`Peek read still shows hidden item: ${id}`);
  const { id } = def.meta;
  for (const action of affordancesOf(def.meta, baseline.props, component)) {
    if (!hidden.includes(action.address.split("/")[1]!)) continue;
    const address = `${screen}/${action.address}`;
    const step = {
      address,
      action: action.action,
      value: actionValue(def.meta, baseline.props, action),
    };
    const act = (props: Props) =>
      planAct({ id: screen, components: [{ ...props, c: id, id: component }] }, { [id]: def }, {}, [step]);
    const original = act(baseline.input);
    if (!original.ok) {
      issues.push(`Cannot exercise baseline action ${address} ${action.action}: ${original.code}`);
      continue;
    }
    const result = act(input);
    if (!result.ok) issues.push(`Peek cannot resolve ${address} ${action.action}: ${result.code}`);
    else if (
      JSON.stringify(result.links) !== JSON.stringify(original.links) ||
      JSON.stringify(result.changed) !== JSON.stringify(original.changed)
    )
      issues.push(`Peek changed the action target at ${address} ${action.action}`);
  }
  return issues;
}
