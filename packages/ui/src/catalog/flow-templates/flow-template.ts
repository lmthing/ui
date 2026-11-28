import { z } from "zod";
import { text } from "../props";

const id = z
  .string()
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/);
const sampleValue = z.union([text(240), z.number(), z.boolean()]);
const recordType = z.enum(["string", "number", "boolean"]);
const flowState = z.enum(["empty", "waiting", "error", "success"]);
export const flowTier = z.enum(["phone", "ok", "people", "service"]);
const stepRef = z
  .string()
  .max(121)
  .regex(/^[a-z][a-z0-9_]*\/[a-z][a-z0-9_]*$/);

const stepLayout = z.union([
  z.strictObject({ archetype: text(60) }),
  z.strictObject({ components: z.array(text(60)).min(1).max(12) }),
]);

const preview = z.strictObject({
  title: text(28),
  action: text(24).optional(),
  choiceButtons: z.literal(true).optional(),
  fields: z.array(id).min(1).max(6).optional(),
  demoInputs: z
    .array(z.strictObject({ kind: z.enum(["email", "password", "code"]), label: text(24) }))
    .min(1)
    .max(3)
    .optional(),
  messages: z.partialRecord(flowState, text(160)).optional(),
});

const step = z.strictObject({
  id,
  see: text(320),
  do: text(320).optional(),
  hands_off_to: z.strictObject({ role: id, step: id }).optional(),
  next: id.nullable().optional(),
  choices: z
    .array(z.strictObject({ label: text(24), step: id }))
    .min(1)
    .max(3)
    .optional(),
  layout: stepLayout,
  tier: flowTier.optional(),
  states: z
    .array(flowState)
    .min(1)
    .max(4)
    .refine((states) => new Set(states).size === states.length, "Repeated state"),
  optional: z.boolean().optional(),
  preview: preview.optional(),
});

const journey = z.strictObject({
  role: id,
  id,
  name: text(120),
  goal: text(240),
  steps: z.array(step).min(1).max(24),
});

export const flowBindingsSchema = z.strictObject({
  names: z.record(id, text(120)),
  record: z.record(id, sampleValue),
  omit: z.array(stepRef).max(24).optional(),
});

const example = flowBindingsSchema.extend({ id });

export const flowTemplateSchema = z.strictObject({
  id,
  title: text(40).optional(),
  purpose: text(160),
  pick: text(240),
  avoid: text(240),
  writeHints: z.array(text(320)).min(1).max(8).optional(),
  nameSlots: z.array(id).max(24),
  recordShape: z
    .record(id, recordType)
    .refine((shape) => Object.keys(shape).length > 0, "Record shape must not be empty"),
  journeys: z.array(journey).min(1).max(8),
  examples: z.array(example).min(2).max(12),
  probes: z.strictObject({
    pick: z
      .array(z.strictObject({ request: text(320), expect: id.nullable() }))
      .min(2)
      .max(12),
    fill: z
      .array(
        z.strictObject({
          request: text(320),
          expect: z
            .strictObject({ names: z.record(id, text(120)), record: z.record(id, sampleValue) })
            .optional(),
        }),
      )
      .min(1)
      .max(12),
  }),
});

export type FlowTemplate = z.infer<typeof flowTemplateSchema>;
export type FlowBindings = z.infer<typeof flowBindingsSchema>;
export type FlowState = z.infer<typeof flowState>;
