import type { Values } from "../index";

/** Keep first appearance order and every row's original address; unnamed rows stay separate. */
export function groupItemLines(items: Values[], field: string, render: (item: Values) => string): string[] {
  const groups = new Map<string, string[]>();
  const lines: string[][] = [];
  for (const item of items) {
    const label = item[field];
    if (typeof label !== "string" || !label.trim()) {
      lines.push([render(item)]);
      continue;
    }
    const group = groups.get(label);
    if (group) group.push(render(item));
    else {
      const parts = [`${JSON.stringify(label)}: ${render(item)}`];
      groups.set(label, parts);
      lines.push(parts);
    }
  }
  return lines.map((line) => line.join("; "));
}
