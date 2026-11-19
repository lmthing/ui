import { addressedElements, type AddressedElement } from "../render";

type Row = Record<string, unknown> & { id: string };

const encoded = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[char]!,
  );

function rowText(node: AddressedElement, item: string): string[] {
  const address = node.attributes.match(/\bdata-testid="home\/c1\/([^/]+)\/[^"]+"/)?.[1];
  if (address && address !== item) return [];
  const label = node.attributes.match(/\b(?:aria-label|value)="([^"]+)"/)?.[1];
  return [
    ...node.text.map((text) => text.trim()),
    ...(label ? [label] : []),
    ...node.children.flatMap((child) => rowText(child, item)),
  ];
}

function textByItem(html: string) {
  const text = new Map<string, Set<string>>();
  for (const [address, node] of addressedElements(html)) {
    const id = address.match(/^home\/c1\/([^/]+)\/root$/)?.[1];
    if (id) text.set(id, new Set(rowText(node, id)));
  }
  return text;
}

/** A unique authored value still visible in the variant must belong to its original row. */
export function rowAddressIssues(rows: Row[], before: string, after: string) {
  if (rows.length < 2) return [];
  const oldText = textByItem(before);
  const newText = textByItem(after);
  const owners = new Map<string, Set<string>>();
  for (const { id, ...row } of rows)
    for (const value of Object.values(row)) {
      if (typeof value !== "string" || !value) continue;
      const text = encoded(value);
      const ids = owners.get(text) ?? new Set<string>();
      ids.add(id);
      owners.set(text, ids);
    }
  return [...owners].flatMap(([value, ids]) => {
    if (ids.size !== 1) return [];
    const [id] = ids;
    if (!oldText.get(id!)?.has(value) || newText.get(id!)?.has(value)) return [];
    const moved = [...newText].find(([other, text]) => text.has(value) && !oldText.get(other)?.has(value));
    return moved ? [`Item content moved from ${id} to ${moved[0]}`] : [];
  });
}
