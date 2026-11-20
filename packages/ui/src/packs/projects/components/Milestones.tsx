import { z } from "zod";
import * as c from "../../../catalog";
import { seedFriday, seedLabels, unique } from "../seeds";

// Core first: Timeline/history cannot tie a dated delivery gate to required deliverable acceptance.
export const meta = {
  id: "Milestones",
  status: "draft",
  group: "data",
  purpose: "See dated delivery gates and the accepted deliverables each gate requires.",
  pick: "Dated delivery gates reached only after required deliverables are accepted. Not dates alone (Timeline), screen steps (Steps), or measured targets (Progress).",
  writeHints: [
    'Each gate requires 1–6 distinct deliverable refs supplied by the brief. Leave out status, reached date and missing counts; the app computes them from acceptance records. Use style "cards" when the requirements should be listed beneath each date.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Milestone requirements and deliverable acceptance records are stored on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "gates", parts: ["root", "title", "due", "requires", "reached", "missing"] },
  states: ["filled", "empty", "loading", "success"],
  actions: { items: { root: ["press"] } },
  successActions: ["root.press"],
  readSuccess: true,
} as const satisfies c.Meta;

const ref = c.text(32);
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: ref,
    gates: z
      .array(
        z.strictObject({
          title: c.text(32),
          due: c.isoDate,
          requires: z.array(ref).min(1).max(6).refine(unique),
          goto: c.screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
    style: z.enum(["rail", "cards"]).default("rail"),
  })
  .overwrite((value) => ({ ...value, gates: value.gates.map((gate) => ({ ...gate, root: gate.goto })) }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    projectRef: "project_1",
    gates: [{ title: seedLabels(input).title, due: seedFriday, requires: ["item_1"] }],
  };
}

export const examples = [
  {
    projectRef: "garden",
    gates: [{ title: "Plan ready", due: seedFriday, requires: ["light_plan"], goto: "garden_scope" }],
  },
  {
    projectRef: "route_guide",
    style: "cards",
    density: "compact",
    gates: [{ title: "Guide ready to print", due: "2026-11-27", requires: ["route_map", "crossing_photos"] }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Milestones");
export const probes = [
  choose("Show each dated delivery gate and the outputs I still have to accept before that gate is reached."),
  choose(
    "List the order of past events and their dates; none is a gate that depends on accepting work.",
    "Timeline",
  ),
  write(
    "In project garden, show a dated gate, Plan ready, due 2026-11-20, reached only after I accept light_plan. Link it to garden_scope.",
  ),
  read("Open the deliverables for Plan ready.", { address: "m1/r1", action: "press" }),
] satisfies c.Probe[];
