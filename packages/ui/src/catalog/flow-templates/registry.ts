import { checkTemplate, type FlowTemplateLookups } from "./check-template";
import { flowTemplateSchema, type FlowTemplate } from "./flow-template";

export function flowTemplateRegistryOf(definitions: readonly FlowTemplate[], lookups: FlowTemplateLookups) {
  const list = definitions.map((definition) => flowTemplateSchema.parse(definition));
  const byId = new Map<string, FlowTemplate>();
  const issues: string[] = [];
  for (const template of list) {
    if (byId.has(template.id)) issues.push(`Duplicate template id: ${template.id}`);
    byId.set(template.id, template);
  }
  for (const template of list) {
    const report = (message: string) => issues.push(`${template.id}: ${message}`);
    checkTemplate(template, lookups, report);
    for (const { expect } of template.probes.pick) {
      if (expect !== null && !byId.has(expect)) report(`Unknown pick probe result: ${expect}`);
    }
  }
  if (issues.length > 0) throw new Error(issues.join("\n"));
  return {
    list: list as readonly FlowTemplate[],
    get: (id: string): FlowTemplate | undefined => byId.get(id),
  };
}
