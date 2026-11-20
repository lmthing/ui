import { z } from "zod";
import * as c from "../../../catalog";
import { seedFriday, seedLabels, unique } from "../seeds";

// Core first: KeyValue/default cannot record acceptance per deliverable or distinguish baseline exclusions.
export const meta = {
  id: "Scope",
  status: "draft",
  group: "input",
  purpose: "Agree what one project delivers, how to accept it, and what is excluded.",
  pick: "A project's versioned deliverables with testable acceptance conditions, accepted marks and exclusions. Not generic facts (KeyValue), terms signed once (Agreement), or an approval queue (Approval).",
  writeHints: [
    'Each deliverable needs a distinct supplied ref and a testable acceptance condition. Include acceptedAt only for a recorded acceptance; leave acceptance counts and overdue status to code. Use style "baseline" to show exclusions in a separate section.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Versioned scope and acceptance dates live on the device; client acceptance requires a shared host.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "revision", "accepted", "excluded"],
  items: {
    key: "deliverables",
    parts: ["root", "title", "acceptance", "due", "accepted_at", "accept", "remove"],
  },
  confirmParts: ["accept", "remove"],
  states: ["filled", "empty", "loading", "success"],
  actions: {
    items: { root: ["press"], accept: ["check"], remove: ["press"] },
    noGoto: { items: ["remove"] },
  },
  successActions: ["root.press", "accept.check", "remove.press"],
  readSuccess: true,
} as const satisfies c.Meta;

const ref = c.text(32);
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: ref,
    revision: z.int().min(1).max(99),
    deliverables: z
      .array(
        z.strictObject({
          deliverableRef: ref,
          title: c.text(32),
          acceptance: c.text(100),
          due: c.isoDate.optional(),
          acceptedAt: c.isoDate.optional(),
          goto: c.screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
    excluded: z.array(c.text(60)).min(0).max(6),
    style: z.enum(["deliverables", "baseline"]).default("deliverables"),
  })
  .refine(({ deliverables }) => unique(deliverables.map(({ deliverableRef }) => deliverableRef)), {
    path: ["deliverables"],
    message: "Deliverable refs must be distinct",
  })
  .overwrite((value) => ({
    ...value,
    deliverables: value.deliverables.map((row) => ({ ...row, accept: !!row.acceptedAt, root: row.goto })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedLabels(input);
  return {
    projectRef: "project_1",
    revision: 1,
    excluded: [],
    deliverables: [{ deliverableRef: "item_1", title, acceptance: detail }],
  };
}

// prettier-ignore
export const examples = [
  { projectRef: "garden", revision: 1, excluded: [],
    deliverables: [{ deliverableRef: "light_plan", title: "Balcony light map", acceptance: "Marks the hours of direct sun for each pot.", due: seedFriday, goto: "light_map" }] },
  { projectRef: "route_guide", revision: 2, style: "baseline", density: "compact", excluded: ["Printing and binding"],
    deliverables: [{ deliverableRef: "route_map", title: "Park route map", acceptance: "Labels every road crossing and pickup point.", acceptedAt: "2026-11-18" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Scope");
export const probes = [
  choose(
    "List what this project includes and excludes, and let me mark each output accepted against its own test.",
  ),
  choose(
    "Show plain label-and-value facts such as project owner and reference number, with no deliverables to accept.",
    "KeyValue",
  ),
  write(
    "For project route_guide baseline revision 2, list deliverable route_map, Park route map, accepted 2026-11-18. Test: Labels every road crossing and pickup point. Show Printing and binding in a separate exclusions section.",
  ),
  read("Mark the Balcony light map accepted.", { address: "s1/r1/accept", action: "check" }),
] satisfies c.Probe[];
