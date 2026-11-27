import { z } from "zod";
import { flowBindingsSchema, type FlowState } from "./flow-template";
import { checkBindings } from "./check-template";
import type { FlowTemplateSource } from "./registry";

type Role = FlowTemplateSource["journeys"][number];
type Step = Role["steps"][number];
type Transition = { label: string; target: string };

const filledJourney = z.strictObject({
  role: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().min(1),
  steps: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        see: z.string().min(1),
        do: z.string().min(1).optional(),
        hands_off_to: z.strictObject({ role: z.string().min(1), step: z.string().min(1) }).optional(),
      }),
    )
    .min(1),
});

const keyOf = (role: string, id: string) => `${role}/${id}`;
const flowSlots = /\{(name|record)\.([a-z][a-z0-9_]*)\}/g;

type Fill = (text: string) => string;
export type FlowFrame = {
  key: string;
  role: string;
  goal: string;
  see: string;
  do?: string;
  title: string;
  layout: Step["layout"];
  states: readonly FlowState[];
  messages: Partial<Record<FlowState, string>>;
  fields: readonly string[];
  back?: true;
  actionList?: true;
  receipt?: NonNullable<Step["preview"]>["receipt"];
  forward: readonly Transition[];
};

export function optionalFlowSteps(template: FlowTemplateSource) {
  return template.journeys.flatMap(({ role, steps }) =>
    steps.filter((step) => step.optional).map(({ id }) => keyOf(role, id)),
  );
}

function frameOf(role: Role, step: Step, fallback: Step | undefined, fill: Fill): FlowFrame {
  const forward = (step.choices ?? []).map(({ label, step }) => ({
    label: fill(label),
    target: keyOf(role.role, step),
  }));
  const handoff = step.hands_off_to;
  const next = step.next === undefined ? fallback?.id : step.next;
  if (handoff || next) {
    forward.unshift({
      label: fill(step.preview?.action ?? step.do ?? "Continue"),
      target: handoff ? keyOf(handoff.role, handoff.step) : keyOf(role.role, next!),
    });
  }
  const messages = Object.fromEntries(
    Object.entries(step.preview?.messages ?? {}).map(([state, text]) => [state, fill(text)]),
  );
  return {
    key: keyOf(role.role, step.id),
    role: role.role,
    goal: fill(role.goal),
    see: fill(step.see),
    ...(step.do ? { do: fill(step.do) } : {}),
    title: step.preview ? fill(step.preview.title) : step.id.replaceAll("_", " "),
    layout: step.layout,
    states: step.states,
    messages,
    fields: step.preview?.fields ?? [],
    ...(step.preview?.back ? { back: step.preview.back } : {}),
    ...(step.preview?.actionList ? { actionList: step.preview.actionList } : {}),
    ...(step.preview?.receipt ? { receipt: step.preview.receipt } : {}),
    forward,
  };
}

export function replayFlow(frames: readonly FlowFrame[]) {
  const lookup = new Map(frames.map((frame) => [frame.key, frame]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ends: string[] = [];
  function visit(key: string) {
    if (visiting.has(key)) throw new Error(`Flow cannot finish: cycle at ${key}`);
    if (visited.has(key)) return;
    const frame = lookup.get(key);
    if (!frame) throw new Error(`Missing flow step: ${key}`);
    visiting.add(key);
    if (!frame.forward.length) ends.push(key);
    for (const { target } of frame.forward) visit(target);
    visiting.delete(key);
    visited.add(key);
  }
  if (!frames[0]) throw new Error("Flow is empty");
  visit(frames[0].key);
  for (const { key } of frames) if (!visited.has(key)) throw new Error(`Unreachable flow step: ${key}`);
  return ends;
}

export function fillFlow(template: FlowTemplateSource, input: unknown) {
  const bindings = flowBindingsSchema.parse(input);
  const issues: string[] = [];
  checkBindings(template, bindings, (issue) => issues.push(issue));
  const omit = new Set(bindings.omit);
  const optional = new Set(optionalFlowSteps(template));
  for (const key of omit) if (!optional.has(key)) issues.push(`Cannot omit required or unknown step: ${key}`);
  if (issues.length) throw new Error(issues.join("; "));
  const fill: Fill = (text) =>
    text.replace(flowSlots, (slot, kind: string, key: string) => {
      const data = kind === "name" ? bindings.names : bindings.record;
      if (!Object.hasOwn(data, key)) throw new Error(`Unfilled slot ${slot}`);
      return String(data[key]);
    });
  const roles = template.journeys.map((role) => ({
    ...role,
    steps: role.steps.filter((step) => !omit.has(keyOf(role.role, step.id))),
  }));
  const journeys = roles.map(({ role, id, name, goal, steps }) =>
    filledJourney.parse({
      role,
      id,
      name: fill(name),
      goal: fill(goal),
      steps: steps.map((step) => ({
        id: step.id,
        see: fill(step.see),
        ...(step.do ? { do: fill(step.do) } : {}),
        ...(step.hands_off_to ? { hands_off_to: step.hands_off_to } : {}),
      })),
    }),
  );
  const frames = roles.flatMap((role) =>
    role.steps.map((step, i) => frameOf(role, step, role.steps[i + 1], fill)),
  );
  return { journeys, frames, record: bindings.record, ends: replayFlow(frames) };
}

export type FilledFlow = ReturnType<typeof fillFlow>;
