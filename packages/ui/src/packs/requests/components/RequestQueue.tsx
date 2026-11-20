import { z } from "zod";
import * as c from "../../../catalog";

const completed = (status: z.output<typeof requestStatus>) => status === "resolved" || status === "closed";

// Core first: List/trail badge cannot switch lifecycle views or order by urgency and deadline.
export const meta = {
  id: "RequestQueue",
  status: "draft",
  group: "data",
  purpose: "Find the next service request to work on by urgency and deadline.",
  pick: "An operator's active and completed service tickets, grouped by lifecycle status and ordered by urgency and deadline. Not a short tappable badge list (List), arbitrary stages (Board), or one rental repair (Request).",
  writeHints: [
    'Write 1–6 records across both views. Use group "none" for one ordered queue without headings. Never write display order, age, overdue or counts.',
    "Use date and HH:MM for opening; dueAt requires due. Omit both if there is no deadline.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The operator's request records live on the device; sharing changes needs a shared app.",
  variants: { density: ["comfortable", "compact"], group: ["sections", "none"] },
  variantParts: { "group.none": { hides: ["status_heading"] } },
  parts: ["root", "view", "count", "status_heading", "retry"],
  items: {
    key: "rows",
    parts: ["root", "number", "title", "place", "status", "urgency", "who", "age", "due"],
  },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    parts: { view: ["select"], retry: ["press"] },
    items: { root: ["press"] },
    when: { root: { inView: true }, retry: { state: "error" } },
  },
  emptyActions: ["view.select"],
  selections: { view: { prop: "view", choices: ["active", "completed"] } },
  read: (input): string[] => {
    const { rows, view } = input as z.output<typeof props>;
    return rows.flatMap(({ number, status, urgency, due, dueAt }) =>
      completed(status) === (view === "completed")
        ? [`${number}: ${status}, ${urgency}${due ? `, ${due}${dueAt ? ` ${dueAt}` : ""}` : ""}`]
        : [],
    );
  },
} as const satisfies c.Meta;

export const requestStatus = z.enum(["new", "queued", "working", "waiting", "resolved", "closed"]);
export const urgency = z.enum(["low", "normal", "urgent"]);
const row = z
  .strictObject({
    number: c.text(12),
    title: c.text(32),
    place: c.text(36).optional(),
    status: requestStatus,
    urgency,
    who: c.text(24).optional(),
    opened: c.isoDate,
    openedAt: c.clock,
    due: c.isoDate.optional(),
    dueAt: c.clock.optional(),
    goto: c.screenId,
  })
  .refine(({ due, dueAt }) => !dueAt || due !== undefined, { path: ["dueAt"] });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    rows: z.array(row).min(1).max(6),
    view: z.enum(["active", "completed"]).default("active"),
  })
  .overwrite((value) => ({
    ...value,
    rows: value.rows.map((row) => ({
      ...row,
      inView: completed(row.status) === (value.view === "completed"),
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    items = c.itemsOf(cast, 3);
  return {
    rows: (items.length ? items : [undefined]).map((item, index) => ({
      number: String(index + 1),
      title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(index, lang),
      place: (item && c.detailOf(item, 36, thing)) || undefined,
      status: "new",
      urgency: "normal",
      opened: "2026-11-20",
      openedAt: "00:00",
      goto: "details",
    })),
  };
}

// prettier-ignore
export const examples = [
  { rows: [
    { number: "LG-41", title: "Grow light keeps flickering", place: "Fern shelf", status: "working", urgency: "urgent", who: "Noor", opened: "2026-11-18", openedAt: "09:00", due: "2026-11-20", dueAt: "16:00", goto: "grow_light" },
    { number: "LG-42", title: "Leaking mister", status: "new", urgency: "normal", opened: "2026-11-19", openedAt: "10:00", goto: "mister" },
  ] },
  { group: "none", density: "compact", view: "completed", rows: [
    { number: "TR-06", title: "Loose kennel gate", status: "closed", urgency: "low", opened: "2026-11-17", openedAt: "13:30", goto: "kennel_gate" },
    { number: "TR-07", title: "Torn spare lead", status: "resolved", urgency: "urgent", opened: "2026-11-19", openedAt: "11:30", goto: "spare_lead" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestQueue");
export const probes = [
  choose(
    "Give the repair desk one inbox to switch between active and completed tickets, grouped by status and ordered by urgency and promised deadlines",
  ),
  choose(
    "Show my three saved repair shops as ordinary tappable rows, each with a short status badge",
    "List",
  ),
  {
    ...write(
      "Show repair ticket LG-42 Leaking mister, new and normal, opened 2026-11-19 at 10:00; open mister. Put all requests in one ordered queue without section headings.",
    ),
    variant: { axis: "group", value: "none" },
  },
  read("Open the urgent ticket about the flickering grow light", { address: "r1/r1", action: "press" }),
] satisfies c.Probe[];
