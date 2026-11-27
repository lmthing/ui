import { checkTemplate, type FlowTemplateLookups } from "./check-template";
import { flowTemplateSchema, type FlowTemplate } from "./flow-template";

type ReadonlyTree<T> = T extends object ? { readonly [K in keyof T]: ReadonlyTree<T[K]> } : T;
export type FlowTemplateSource = ReadonlyTree<FlowTemplate>;
export type FlowTemplateRegistry = {
  readonly list: readonly FlowTemplateSource[];
  readonly get: (id: string) => FlowTemplateSource | undefined;
};

function freezeTree<T>(value: T): ReadonlyTree<T> {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value as ReadonlyTree<T>;
}

export function flowTemplateRegistryOf(
  definitions: readonly FlowTemplateSource[],
  lookups: FlowTemplateLookups,
): FlowTemplateRegistry {
  const parsed = definitions.map((definition) => flowTemplateSchema.parse(definition));
  const ids = new Set<string>();
  const issues: string[] = [];
  for (const template of parsed) {
    if (ids.has(template.id)) issues.push(`Duplicate template id: ${template.id}`);
    ids.add(template.id);
  }
  for (const template of parsed) {
    const report = (message: string) => issues.push(`${template.id}: ${message}`);
    checkTemplate(template, lookups, report);
    for (const { expect } of template.probes.pick) {
      if (expect !== null && !ids.has(expect)) report(`Unknown pick probe result: ${expect}`);
    }
  }
  if (issues.length > 0) throw new Error(issues.join("\n"));
  const list = freezeTree(parsed);
  const byId = new Map(list.map((template) => [template.id, template]));
  return Object.freeze({ list, get: (id: string) => byId.get(id) });
}
