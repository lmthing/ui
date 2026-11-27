import type { FlowBindings, FlowTemplate } from "./flow-template";
import type { FlowTemplateSource } from "./registry";

export type FlowTemplateLookups = {
  component: (id: string) => boolean;
  archetype: (id: string) => boolean;
};

type Report = (message: string) => void;
type Step = FlowTemplate["journeys"][number]["steps"][number];

function unique(ids: readonly string[], kind: string, report: Report) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) report(`Duplicate ${kind}: ${id}`);
    seen.add(id);
  }
}

function checkSlots(template: FlowTemplate, prose: string, report: Report) {
  for (const [reference, group, slot] of prose.matchAll(/\{(name|record)\.([^{}]*)\}/g)) {
    const valid =
      group === "name" ? template.nameSlots.includes(slot!) : Object.hasOwn(template.recordShape, slot!);
    if (!valid) report(`Undeclared slot: ${reference}`);
  }
}

function checkStep(
  template: FlowTemplate,
  role: string,
  step: Step,
  lookups: FlowTemplateLookups,
  report: Report,
) {
  checkSlots(template, step.see, report);
  if (step.do) checkSlots(template, step.do, report);
  for (const field of step.preview?.fields ?? [])
    if (!Object.hasOwn(template.recordShape, field)) report(`Unknown preview field: ${field}`);
  for (const [state, message] of Object.entries(step.preview?.messages ?? {})) {
    if (!step.states.includes(state as Step["states"][number])) report(`Undeclared state: ${state}`);
    checkSlots(template, message, report);
  }
  if (step.preview) {
    checkSlots(template, step.preview.title, report);
    if (step.preview.action) checkSlots(template, step.preview.action, report);
  }
  const layout = step.layout;
  if ("archetype" in layout) {
    if (!lookups.archetype(layout.archetype)) report(`Unknown archetype: ${layout.archetype}`);
  } else {
    for (const id of layout.components) {
      if (!lookups.component(id)) report(`Unknown component: ${id}`);
    }
  }
  const handoff = step.hands_off_to;
  if (!handoff) return;
  if (step.next !== undefined) report(`Hand-off and next cannot share a step: ${role}/${step.id}`);
  const target = template.journeys
    .find((journey) => journey.role === handoff.role)
    ?.steps.find(({ id }) => id === handoff.step);
  if (!target || target.optional || handoff.role === role) {
    report(`Invalid hand-off: ${role}/${step.id} -> ${handoff.role}/${handoff.step}`);
  }
}

export function checkBindings(template: FlowTemplateSource, { names, record }: FlowBindings, report: Report) {
  for (const slot of template.nameSlots) if (!Object.hasOwn(names, slot)) report(`Missing name slot ${slot}`);
  for (const slot of Object.keys(names))
    if (!template.nameSlots.includes(slot)) report(`Unknown name slot ${slot}`);
  for (const [field, kind] of Object.entries(template.recordShape))
    if (!Object.hasOwn(record, field) || typeof record[field] !== kind)
      report(`Record field ${field} must be ${kind}`);
  for (const field of Object.keys(record))
    if (!Object.hasOwn(template.recordShape, field)) report(`Unknown record field ${field}`);
}

function checkExamples(template: FlowTemplate, report: Report) {
  unique(
    template.examples.map(({ id }) => id),
    "example id",
    report,
  );
  for (const example of template.examples)
    checkBindings(template, example, (issue) => report(`${example.id}: ${issue}`));
}

function checkJourneySteps(
  template: FlowTemplate,
  journey: FlowTemplate["journeys"][number],
  lookups: FlowTemplateLookups,
  report: Report,
) {
  unique(
    journey.steps.map(({ id }) => id),
    `${journey.role} step id`,
    report,
  );
  checkSlots(template, journey.name, report);
  checkSlots(template, journey.goal, report);
  journey.steps.forEach((step, index) => {
    const advances = step.next ?? (step.next !== null && index < journey.steps.length - 1);
    if (advances && !step.do && !step.hands_off_to)
      report(`Missing action or hand-off: ${journey.role}/${step.id}`);
    const destinations = [...(step.next ? [step.next] : []), ...(step.choices ?? []).map(({ step }) => step)];
    unique(destinations, `${journey.role}/${step.id} destination`, report);
    for (const id of destinations)
      if (!journey.steps.some((target) => target.id === id && !target.optional))
        report(`Invalid destination: ${journey.role}/${step.id} -> ${id}`);
    checkStep(template, journey.role, step, lookups, report);
  });
}

export function checkTemplate(template: FlowTemplate, lookups: FlowTemplateLookups, report: Report) {
  unique(template.nameSlots, "name slot", report);
  unique(
    template.journeys.map(({ role }) => role),
    "role slot",
    report,
  );
  unique(
    template.journeys.map(({ id }) => id),
    "journey id",
    report,
  );
  for (const journey of template.journeys) checkJourneySteps(template, journey, lookups, report);
  checkExamples(template, report);
  const pick = template.probes.pick;
  if (
    !pick.some(({ expect }) => expect === template.id) ||
    !pick.some(({ expect }) => expect !== template.id)
  ) {
    report("Pick probes must include a match and a near miss");
  }
}
