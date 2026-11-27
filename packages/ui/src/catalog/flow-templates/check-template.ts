import type { FlowTemplate } from "./flow-template";

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
  const target = template.journeys
    .find((journey) => journey.role === handoff.role)
    ?.steps.find(({ id }) => id === handoff.step);
  if (!target || target.optional || handoff.role === role) {
    report(`Invalid hand-off: ${role}/${step.id} -> ${handoff.role}/${handoff.step}`);
  }
}

function checkExamples(template: FlowTemplate, report: Report) {
  unique(
    template.examples.map(({ id }) => id),
    "example id",
    report,
  );
  for (const { id, names, record } of template.examples) {
    for (const slot of template.nameSlots) {
      if (!Object.hasOwn(names, slot)) report(`${id}: Missing name slot ${slot}`);
    }
    for (const slot of Object.keys(names)) {
      if (!template.nameSlots.includes(slot)) report(`${id}: Unknown name slot ${slot}`);
    }
    for (const [field, kind] of Object.entries(template.recordShape)) {
      if (!Object.hasOwn(record, field) || typeof record[field] !== kind) {
        report(`${id}: Record field ${field} must be ${kind}`);
      }
    }
    for (const field of Object.keys(record)) {
      if (!Object.hasOwn(template.recordShape, field)) report(`${id}: Unknown record field ${field}`);
    }
  }
}

export function checkTemplate(template: FlowTemplate, lookups: FlowTemplateLookups, report: Report) {
  unique(template.nameSlots, "name slot", report);
  unique(
    template.journeys.map(({ role }) => role),
    "role slot",
    report,
  );
  for (const journey of template.journeys) {
    unique(
      journey.steps.map(({ id }) => id),
      `${journey.role} step id`,
      report,
    );
    checkSlots(template, journey.name, report);
    checkSlots(template, journey.goal, report);
    journey.steps.forEach((step, index) => {
      if (index < journey.steps.length - 1 && !step.do && !step.hands_off_to) {
        report(`Missing action or hand-off: ${journey.role}/${step.id}`);
      }
      checkStep(template, journey.role, step, lookups, report);
    });
  }
  checkExamples(template, report);
  const pick = template.probes.pick;
  if (
    !pick.some(({ expect }) => expect === template.id) ||
    !pick.some(({ expect }) => expect !== template.id)
  ) {
    report("Pick probes must include a match and a near miss");
  }
}
