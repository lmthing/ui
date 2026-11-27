import { z } from "zod";
import { text } from "../props";

const id = z
  .string()
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/);
const sampleValue = z.union([text(240), z.number(), z.boolean()]);
const recordType = z.enum(["string", "number", "boolean"]);

const stepLayout = z.union([
  z.strictObject({ archetype: text(60) }),
  z.strictObject({ components: z.array(text(60)).min(1).max(12) }),
]);

const step = z.strictObject({
  id,
  see: text(320),
  do: text(320).optional(),
  hands_off_to: z.strictObject({ role: id, step: id }).optional(),
  layout: stepLayout,
  states: z
    .array(z.enum(["empty", "waiting", "error", "success"]))
    .min(1)
    .max(4)
    .refine((states) => new Set(states).size === states.length, "Repeated state"),
  optional: z.boolean().optional(),
});

const journey = z.strictObject({
  role: id,
  id,
  name: text(120),
  goal: text(240),
  steps: z.array(step).min(1).max(24),
});

const example = z.strictObject({
  id,
  names: z.record(id, text(120)),
  record: z.record(id, sampleValue),
});

export const flowTemplateSchema = z.strictObject({
  id,
  purpose: text(160),
  pick: text(240),
  avoid: text(240),
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
      .array(z.strictObject({ request: text(320) }))
      .min(1)
      .max(12),
  }),
});

export type FlowTemplate = z.infer<typeof flowTemplateSchema>;
