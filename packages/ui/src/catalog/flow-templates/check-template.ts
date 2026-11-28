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
  if (step.preview?.search) checkSearchPreview(template, step, report);
  checkSpecialPreview(template, step, report);
  for (const { label } of step.choices ?? []) checkSlots(template, label, report);
  const layout = step.layout;
  if (step.preview?.demoInputs && (!("components" in layout) || !layout.components.includes("Field")))
    report("Demo inputs require a Field in the layout");
  if (step.preview?.choiceButtons && (!step.next || !step.choices?.length))
    report("Choice buttons require a primary next step and explicit choices");
  if ("archetype" in layout) {
    if (!lookups.archetype(layout.archetype)) report(`Unknown archetype: ${layout.archetype}`);
  } else {
    for (const id of layout.components) {
      if (!lookups.component(id)) report(`Unknown component: ${id}`);
    }
    if (layout.components.includes("HandoffReceipt")) {
      if (!step.preview?.receipt) report("HandoffReceipt preview needs an explicit phase");
      for (const key of ["subject", "reference", "sender", "recipient"])
        if (template.recordShape[key] !== "string") report(`HandoffReceipt needs string record field ${key}`);
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

function checkSpecialPreview(template: FlowTemplate, step: Step, report: Report) {
  const preview = step.preview;
  const parts = "components" in step.layout ? step.layout.components : [];
  const thread = preview?.thread;
  if ((parts.includes("Bubbles") || parts.includes("Composer")) && !thread)
    report("Bubbles and Composer previews need a thread");
  if (parts.includes("Composer") && (!thread?.compose || step.choices || step.next === null))
    report("Composer preview needs one field and one forward destination");
  if (parts.includes("Choice") && !preview?.choice) report("Choice preview needs options");
  if (parts.includes("Steps") && (!preview?.progress || preview.progress.at > preview.progress.count))
    report("Steps preview needs a valid progress position");
  const keys = thread?.messages.map(({ field }) => field) ?? [];
  if (thread?.compose) keys.push(thread.compose);
  if (preview?.retry && (template.recordShape[preview.retry] !== "boolean" || !preview.messages?.error))
    report("Preview retry needs a boolean record field and error copy");
  if (preview?.choice) keys.push(preview.choice.field, ...preview.choice.options);
  const total = preview?.choice?.total;
  if (total) {
    keys.push(total.field);
    if (template.recordShape[total.unitPrice] !== "number") report("Preview unit price must be numeric");
  }
  if (parts.includes("Profile")) keys.push("display_name", "profile_context");
  for (const key of keys)
    if (template.recordShape[key] !== "string") report(`Preview needs string record field ${key}`);
}

function checkSearchPreview(template: FlowTemplate, step: Step, report: Report) {
  const search = step.preview!.search!;
  checkSlots(template, search.hint, report);
  unique(
    search.results.map(({ step: target }) => target),
    "search result destination",
    report,
  );
  for (const { title, category, detail, step: target } of search.results) {
    for (const key of [title, category, detail])
      if (template.recordShape[key] !== "string") report(`Search result needs string record field ${key}`);
    if (!step.choices?.some(({ step: destination }) => destination === target))
      report(`Undeclared search result destination: ${target}`);
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
