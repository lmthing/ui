import { z } from "zod";

type Json = {
  type?: string;
  properties?: Record<string, Json>;
  required?: string[];
  items?: Json;
  enum?: unknown[];
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  pattern?: string;
  kind?: string;
};

function scalar(node: Json): string {
  // A photo is a library tag or a local photo number, never a file name or a URL.
  if (node.kind === "photo") return "photo lib:<tag>|local:<n>";
  if (node.kind === "media") return "media lib:<tag>|local:<n>";
  if (node.kind === "date") return "date YYYY-MM-DD";
  if (node.kind === "time") return "time HH:MM";
  if (node.enum) return node.enum.join("|");
  if (node.type === "string") return node.pattern ? "id snake_case" : `text≤${node.maxLength ?? "?"}`;
  if (node.type === "number" || node.type === "integer") {
    return node.minimum !== undefined || node.maximum !== undefined
      ? `${node.type === "integer" ? "int" : "num"} ${node.minimum ?? ""}..${node.maximum ?? ""}`
      : "number";
  }
  return node.type ?? "any";
}

function render(node: Json): string {
  if (node.type === "object" && node.properties) {
    const required = new Set(node.required ?? []);
    const fields = Object.entries(node.properties).map(([key, value]) => {
      const optional = !required.has(key) || value.default !== undefined;
      const fallback = value.default !== undefined ? `=${JSON.stringify(value.default)}` : "";
      return `${key}${optional ? "?" : ""}: ${render(value)}${fallback}`;
    });
    return `{ ${fields.join(", ")} }`;
  }
  if (node.type === "array" && node.items) {
    return `[${node.minItems ?? 0}..${node.maxItems ?? "?"} ${render(node.items)}]`;
  }
  return scalar(node);
}

/** A compact, token-cheap description of a props schema for prompts. */
export function signature(schema: z.ZodType): string {
  return render(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Json);
}
