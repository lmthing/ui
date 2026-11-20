import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Checklist/default cannot link a job to a request, time it or account for consumed parts.
export const meta = {
  id: "WorkOrder",
  status: "draft",
  group: "input",
  purpose: "Carry out a repair with required checks, time and parts used.",
  pick: "One assigned execution record tied to a service request, with required checks, time and consumed parts. Not simple jobs to tick (Checklist), attendance (TimeClock), or a booked visit (Appointment).",
  writeHints: [
    "Provide date/from/to together with from before to. A blocked order needs blockedBy and note. Summary is read-only and requires done.",
    "Write previously recorded minutes and individual numeric quantities and unit costs only, not costs summed across parts or elapsed clock time.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Work records and clock events live on the technician's device without changing stock or payments.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: [
    "root",
    "number",
    "request",
    "title",
    "who",
    "window",
    "status",
    "clock",
    "blocked",
    "note",
    "finish",
    "total",
  ],
  items: {
    key: "lines",
    parts: ["root", "text", "required", "check", "name", "qty", "cost"],
    set: { qty: { prop: "qty", min: Number.MIN_VALUE } },
  },
  states: ["filled", "loading", "success", "error"],
  clocks: [
    {
      id: "work",
      kind: "up",
      prop: "elapsed",
      runningProp: "running",
      when: { editable: true },
      start: { part: "clock", action: "start" },
      stop: { part: "clock", action: "stop" },
    },
  ],
  actions: {
    parts: { clock: ["start", "stop"], blocked: ["select"], note: ["type"], finish: ["press"] },
    items: { check: ["check"], qty: ["set"] },
    when: {
      check: { editable: true, kind: "task" },
      qty: { editable: true, kind: "part" },
      "clock.start": { canStart: true, running: false },
      "clock.stop": { editable: true, running: true },
      blocked: { editable: true },
      note: { editable: true },
      finish: { finishable: true, running: false },
    },
  },
  read: (input, _state, lang): string[] => {
    const { lines, date, from, to, status, blockedBy, minutes } = input as z.output<typeof props> & {
      lines: (({ kind: "task" } & z.output<typeof task>) | ({ kind: "part" } & z.output<typeof part>))[];
    };
    return [
      `${status}${blockedBy ? ` (${blockedBy})` : ""}`,
      ...(date ? [`${date} ${from}–${to}`] : []),
      c.durationLine(minutes, lang),
      ...lines.map((line, index) =>
        line.kind === "task"
          ? `r${index + 1} ${JSON.stringify(line.text)}${line.required ? " (required)" : ""}`
          : `r${index + 1} ${JSON.stringify(line.name)} ×${line.qty}`,
      ),
    ];
  },
} as const satisfies c.Meta;

const task = z.strictObject({ text: c.text(36), required: z.boolean(), done: z.boolean() });
const part = z.strictObject({
  name: c.text(32),
  qty: z.number().positive(),
  unitCost: z.number().min(0).optional(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    number: c.text(12),
    request: c.text(12),
    title: c.text(32),
    who: c.text(24).optional(),
    date: c.isoDate.optional(),
    from: c.clock.optional(),
    to: c.clock.optional(),
    status: z.enum(["ready", "working", "blocked", "done"]),
    blockedBy: z.enum(["information", "access", "parts", "other"]).optional(),
    note: c.text(120).optional(),
    tasks: z.array(task).min(1).max(6),
    parts: z.array(part).min(0).max(8),
    minutes: z.number().min(0),
    style: z.enum(["worksheet", "summary"]).default("worksheet"),
  })
  .refine(({ date, from, to }) => (!date && !from && !to) || Boolean(date && from && to && from < to), {
    path: ["to"],
    message: "Give a date and a later end time, or omit the window",
  })
  .refine(({ status, blockedBy, note }) => status !== "blocked" || Boolean(blockedBy && note), {
    path: ["blockedBy"],
  })
  .refine(({ style, status }) => style !== "summary" || status === "done", { path: ["style"] })
  .overwrite((value) => {
    const editable = value.style === "worksheet" && value.status !== "done";
    const canStart = editable && value.status !== "blocked" && !value.blockedBy;
    return {
      ...value,
      editable,
      canStart,
      running: false,
      note: value.note ?? "",
      finishable: canStart && value.tasks.every(({ required, done }) => !required || done),
      lines: [
        ...value.tasks.map(({ done, ...task }) => ({ done, ...task, kind: "task" })),
        ...value.parts.map((part) => ({ ...part, kind: "part" })),
      ],
    };
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    items = c.itemsOf(cast, 3);
  return {
    number: c.placeholderValue,
    request: c.placeholderValue,
    title: (items[0] && c.titleOf(items[0], 32, thing)) || c.placeholderTitle(0, lang),
    status: "ready",
    minutes: 0,
    parts: [],
    tasks: (items.length ? items : [undefined]).map((item, index) => ({
      text: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(index, lang),
      required: true,
      done: false,
    })),
  };
}

// prettier-ignore
export const examples = [
  { number: "WO-14", request: "LG-41", title: "Replace the grow light", who: "Ella", date: "2026-11-20", from: "13:00", to: "14:00",
    status: "blocked", blockedBy: "parts", note: "Waiting for a replacement light.", minutes: 20,
    tasks: [{ text: "Inspect the cable", required: true, done: true }, { text: "Test the grow light timer", required: true, done: false }],
    parts: [{ name: "LED grow light", qty: 1, unitCost: 19 }] },
  { number: "WO-22", request: "TR-06", title: "Adjust the kennel gate", status: "done", style: "summary", density: "compact", surface: "outlined",
    minutes: 35, tasks: [{ text: "Check the gate latches", required: true, done: true }], parts: [{ name: "Mounting screws", qty: 4 }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("WorkOrder");
export const probes = [
  choose(
    "Give the technician an assigned job tied to the reported fault, with required tests, a work clock and a log of materials used",
  ),
  choose("Give me three independent chores, each with a checkbox, without a work record", "Checklist"),
  write(
    "Job WO-14 for repair LG-41 is Replace the grow light, assigned to Ella, working with 20 minutes logged. Inspect the cable is required and done; Test the grow light timer is required and not done. One LED grow light at unit cost 19.",
  ),
  read("Tick off Test the grow light timer on this job", { address: "w1/r2/check", action: "check" }),
] satisfies c.Probe[];
