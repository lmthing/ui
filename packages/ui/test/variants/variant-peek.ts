import { affordancesOf, planAct, type Definition } from "@lmthing/ui/catalog";

type Props = Record<string, unknown>;
const screen = "home";
const component = "c1";

export function peekHiddenItems(ids: string[], addresses: string[]) {
  const visible = ids.filter((id) => addresses.includes(`${screen}/${component}/${id}/root`));
  return {
    hidden: ids.filter((id) => !visible.includes(id)),
    issues:
      visible.every((id, index) => id === ids[index]) && (visible.length || !ids.length)
        ? []
        : ["Peek must retain the first items at their original addresses"],
  };
}

function actionValue(action: string, detail: string) {
  switch (action) {
    case "set": {
      const value = Number(detail.split(" = ")[1] ?? 0);
      return Number.isFinite(value) ? value : 0;
    }
    case "type":
    case "move":
      return "1";
    case "seek":
    case "select":
      return 0;
    case "swipe":
      return "left";
  }
}

/** A hidden row keeps the same action target it had before the collection was collapsed. */
export function variantPeekIssues(
  def: Definition,
  input: Props,
  baseline: Props,
  hidden: string[],
  read: string[],
) {
  if (!hidden.length) return [];
  const issues: string[] = [];
  if (!read.some((line) => new RegExp(`\\band ${hidden.length} more\\b`, "i").test(line)))
    issues.push(`Missing peek count: and ${hidden.length} more`);
  for (const id of hidden)
    if (read.some((line) => line.trimStart().match(/^\S+/)?.[0] === id))
      issues.push(`Peek read still shows hidden item: ${id}`);
  const { id } = def.meta;
  for (const action of affordancesOf(def.meta, baseline, component)) {
    if (!hidden.includes(action.address.split("/")[1]!)) continue;
    const address = `${screen}/${action.address}`;
    const result = planAct(
      { id: screen, components: [{ ...input, c: id, id: component }] },
      { [id]: def },
      {},
      [{ address, action: action.action, value: actionValue(action.action, action.detail) }],
    );
    if (!result.ok) issues.push(`Peek cannot resolve ${address} ${action.action}: ${result.code}`);
  }
  return issues;
}
