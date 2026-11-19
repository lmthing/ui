import { toJSONSchema } from "zod";

export type Node = {
  type?: string;
  enum?: unknown[];
  const?: unknown;
  anyOf?: Node[];
  oneOf?: Node[];
  properties?: Record<string, Node>;
  required?: string[];
  items?: Node;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  minItems?: number;
  default?: unknown;
  description?: string;
};

/** The component's Zod props as JSON Schema (input side, so defaulted fields are optional). */
export function schemaOf(props: unknown): Node | null {
  try {
    return toJSONSchema(props as never, { io: "input", unrepresentable: "any" }) as Node;
  } catch {
    return null;
  }
}

/** The non-null branch of an optional or nullable schema, or the schema itself. */
export function plain(node: Node): Node {
  const branches = node.anyOf ?? node.oneOf;
  if (!branches) return node;
  const rest = branches.filter((b) => b.type !== "null");
  return rest.length === 1 ? plain(rest[0]!) : node;
}

/** A starting value for a schema, so "add item" and "include field" always produce something valid-looking. */
export function blank(raw: Node): unknown {
  const node = plain(raw);
  if (node.default !== undefined) return node.default;
  if (node.const !== undefined) return node.const;
  if (node.enum) return node.enum[0];
  if (node.anyOf ?? node.oneOf) return blank((node.anyOf ?? node.oneOf)![0]!);
  switch (node.type) {
    case "string":
      return "Text";
    case "number":
    case "integer":
      return node.minimum ?? 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return Object.fromEntries((node.required ?? []).map((k) => [k, blank(node.properties?.[k] ?? {})]));
    default:
      return null;
  }
}
