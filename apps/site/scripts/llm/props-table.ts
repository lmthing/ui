import { table } from "./md";

type Node = {
  type?: string;
  enum?: unknown[];
  const?: unknown;
  anyOf?: Node[];
  properties?: Record<string, Node>;
  required?: string[];
  items?: Node;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  minItems?: number;
  default?: unknown;
  kind?: string;
};

const plain = (node: Node): Node => {
  const rest = (node.anyOf ?? []).filter((b) => b.type !== "null");
  return node.anyOf && rest.length === 1 ? plain(rest[0]!) : node;
};

/** A short type: enum values, string with its limit, number range, or a list of what. */
export function typeOf(raw: Node): string {
  const node = plain(raw);
  if (node.enum) return node.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (node.const !== undefined) return JSON.stringify(node.const);
  if (node.type === "array")
    return `array of ${node.items ? typeOf(node.items) : "any"}${node.maxItems ? ` (${node.minItems ?? 0}-${node.maxItems})` : ""}`;
  if (node.type === "object" && node.properties) return `{ ${Object.keys(node.properties).join(", ")} }`;
  const limit = node.maxLength ? ` (max ${node.maxLength})` : "";
  const range =
    node.minimum !== undefined || node.maximum !== undefined
      ? ` (${node.minimum ?? ""}..${node.maximum ?? ""})`
      : "";
  return `${node.type ?? "any"}${limit}${range}${node.kind ? `, ${node.kind}` : ""}`;
}

const notes = (node: Node): string => {
  const parts = [node.default !== undefined ? `default ${JSON.stringify(node.default)}` : ""];
  if (node.anyOf?.some((b) => b.type === "null")) parts.push("may be null");
  return parts.filter(Boolean).join("; ");
};

/** A table of the component's props: name, type, whether it is required, and defaults. Nested objects are listed. */
export function propsTable(schema: Record<string, unknown>): string {
  const root = schema as Node;
  const rows = Object.entries(root.properties ?? {}).map(([name, node]) => [
    `\`${name}\``,
    typeOf(node),
    root.required?.includes(name) ? "yes" : "no",
    notes(node),
  ]);
  return table(["prop", "type", "required", "notes"], rows);
}
