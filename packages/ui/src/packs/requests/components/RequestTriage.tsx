import { z } from "zod";
import * as c from "../../../catalog";
import { urgency } from "./RequestQueue";

const maxQueues = 6,
  maxDuplicates = 6;

// Core first: Field/choice cannot compare reported urgency with priority or link a duplicate.
export const meta = {
  id: "RequestTriage",
  status: "draft",
  group: "input",
  purpose: "Prioritise and route a report, or link it to an existing request.",
  pick: "Triage one incoming service report: compare reported urgency with impact, set effective priority and route it or link a duplicate. Not a simple form dropdown (Field) or manager permission (Approval).",
  writeHints: [
    "at and duplicateAt are zero-based indices. A chosen duplicate needs a reason and must not have the report's own number.",
    'For the decision only, set detail "brief" and density null. Keep the report number and title in the data. Only set density when spacing is requested.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A routing decision saved with the request on the operator's device.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["number", "title", "reported_urgency", "impact"] } },
  parts: ["root", "number", "title", "reported_urgency", "impact", "priority", "reason", "apply"],
  items: { key: "choices", parts: ["root", "label", "number", "title", "link"] },
  states: ["filled", "loading", "success", "error"],
  confirmParts: ["apply"],
  actions: {
    parts: { priority: ["select"], reason: ["type"], apply: ["press"] },
    items: { root: ["select", "press"], link: ["select"] },
    when: {
      "root.select": { kind: "queue" },
      "root.press": { kind: "duplicate" },
      link: { kind: "duplicate", canLink: true },
    },
  },
  // Stage either route in one local slot. Its presence also enables the apply part.
  select: { prop: "apply", value: "index" },
  selections: { priority: { prop: "priority", choices: urgency.options } },
  read: (input): string[] => {
    const { number, title, reportedUrgency, impact, priority, queues, duplicates, detail, apply } =
      input as z.output<typeof props> & { apply?: number };
    const decision =
      apply === undefined ? undefined : (queues[apply]?.label ?? duplicates[apply - queues.length]?.number);
    return [
      ...(detail === "full" ? [`${number} ${JSON.stringify(title)} · ${reportedUrgency} / ${impact}`] : []),
      priority,
      ...(decision ? [`Selected: ${decision}; apply to save`] : []),
      ...queues.map(({ label }, index) => `r${index + 1} ${JSON.stringify(label)}`),
      ...duplicates.map(
        ({ number, title }, index) =>
          `r${queues.length + index + 1} ${number} ${JSON.stringify(title)} (link index ${queues.length + index})`,
      ),
    ];
  },
} as const satisfies c.Meta;

const duplicate = z.strictObject({ number: c.text(12), title: c.text(32), goto: c.screenId });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    // The custom reader emits these only in full detail; validation is still bounded text.
    number: c.text(12).meta({ kind: undefined }),
    title: c.text(32).meta({ kind: undefined }),
    reportedUrgency: urgency,
    impact: z.enum(["one", "several", "site"]),
    priority: urgency.default("normal"),
    queues: z
      .array(z.strictObject({ label: c.text(20) }))
      .min(1)
      .max(maxQueues),
    at: z
      .int()
      .min(0)
      .max(maxQueues - 1)
      .optional(),
    duplicates: z.array(duplicate).min(0).max(maxDuplicates),
    duplicateAt: z
      .int()
      .min(0)
      .max(maxDuplicates - 1)
      .optional(),
    reason: c.text(120).optional(),
  })
  .refine(({ at, queues }) => at === undefined || at < queues.length, { path: ["at"] })
  .refine(
    ({ duplicateAt, duplicates, number, reason }) => {
      if (duplicateAt === undefined) return true;
      const match = duplicates[duplicateAt];
      return Boolean(match && match.number !== number && reason);
    },
    { path: ["duplicateAt"], message: "Choose a different existing request and give a reason" },
  )
  .overwrite((value) => ({
    ...value,
    reason: value.reason ?? "",
    apply: value.duplicateAt === undefined ? value.at : value.queues.length + value.duplicateAt,
    choices: [
      ...value.queues.map((queue) => ({ ...queue, kind: "queue" })),
      ...value.duplicates.map(({ goto, ...entry }) => ({
        ...entry,
        root: { goto },
        kind: "duplicate",
        canLink: entry.number !== value.number && Boolean(value.reason),
      })),
    ],
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    item = c.itemsOf(cast, 1)[0];
  return {
    number: c.placeholderValue,
    title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    reportedUrgency: "normal",
    impact: "one",
    at: 0,
    queues: [{ label: (item && c.detailOf(item, 20, thing)) || c.placeholderTitle(1, lang) }],
    duplicates: [],
  };
}

// prettier-ignore
export const examples = [
  { number: "LG-41", title: "Grow light keeps flickering", reportedUrgency: "urgent", impact: "one", priority: "normal", queues: [{ label: "Equipment" }, { label: "Plant care" }], at: 0, duplicates: [] },
  { number: "TR-08", title: "Loose gate by the dog run", reportedUrgency: "normal", impact: "site", priority: "urgent", queues: [{ label: "Facilities" }],
    duplicates: [{ number: "TR-07", title: "Latch on the dog run", goto: "dog_run" }], duplicateAt: 0, reason: "Both reports concern the same latch.", detail: "brief", density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestTriage");
export const probes = [
  choose(
    "Review a newly reported fault, set priority by its impact, send it to the right team, or link it to the ticket we already have",
  ),
  choose("On the report form add one category dropdown with Plant care, Gears and Other", "Field"),
  {
    ...write(
      "For LG-41 Grow light keeps flickering, reported urgent but affects one shelf, set normal priority and select Equipment from Equipment and Plant care. No duplicates. Show only the decision, not the original report.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read(
    "The queue is already selected. Save and confirm the triage decision now without changing the selection.",
    { address: "r1/apply", action: "press" },
  ),
] satisfies c.Probe[];
