import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Checklist/default cannot track coursework due dates, submission state and grades.
export const meta = {
  id: "Assignments",
  status: "draft",
  group: "data",
  purpose: "Know which coursework is due, handed in or graded.",
  pick: "Homework and coursework with subjects, due dates, hand-in status and grades. Not simple tasks to tick off (Checklist) or the outcome of one practice session (Result).",
  writeHints: [
    "Write a real due date and goto for each assignment. Status is todo, done (handed in) or graded. Write a grade only for a graded item. Never write overdue or a relative due label.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Assignments are stored on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "title", "subject", "due", "status", "grade", "done"] },
  states: ["filled", "empty"],
  actions: { items: { done: ["check"], root: ["press"] }, when: { done: { checkable: true } } },
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).items.map(
      ({ due, status }, index) =>
        `r${index + 1}: ${c.appointmentDate(due, lang)}${status === "graded" ? ` · ${status}` : ""}`,
    ),
} as const satisfies c.Meta;

const assignment = z
  .strictObject({
    title: c.text(28),
    subject: c.text(20),
    due: c.isoDate,
    status: z.enum(["todo", "done", "graded"]),
    grade: c.text(6).optional(),
    goto: c.screenId,
  })
  .refine(({ grade, status }) => grade === undefined || status === "graded", { path: ["grade"] })
  .overwrite((value) => ({ ...value, done: value.status !== "todo", checkable: value.status !== "graded" }));

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z.array(assignment).min(1).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 4);
  return {
    items: (items.length ? items : [undefined]).map((item, index) => ({
      title: (item && c.titleOf(item, 28, thing)) ?? c.placeholderTitle(index, lang),
      subject: (item && c.detailOf(item, 20, thing)) ?? c.clip(c.wordsFor(lang).placeholderLabel, 20),
      due: "1970-01-01",
      status: "todo",
      goto: "back",
    })),
  };
}

export const examples = [
  {
    items: [
      {
        title: "Fern care worksheet",
        subject: "Plant care",
        due: "2026-11-25",
        status: "todo",
        goto: "worksheet",
      },
      {
        title: "Light and shade log",
        subject: "Plant care",
        due: "2026-11-18",
        status: "graded",
        grade: "A",
        goto: "light_log",
      },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    items: [
      {
        title: "Route assessment",
        subject: "Dog walking",
        due: "2026-11-22",
        status: "done",
        goto: "route_assessment",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Assignments");
export const probes = [
  choose("Track homework to hand in, with subjects, due dates and grades. Let me mark work as handed in."),
  choose(
    "Give me plain checkboxes for independent jobs like pack a bag and clear my desk, with no due dates or grades.",
    "Checklist",
  ),
  write(
    "Japanese homework: Water radical worksheet due 2026-11-25, still to do, links to worksheet; Readings practice due 2026-11-18, graded A, links to readings.",
  ),
  read("Tick the Fern care worksheet's checkbox to mark it as handed in, without opening it.", {
    address: "a1/r1/done",
    action: "check",
  }),
] satisfies c.Probe[];
