import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { assignmentDue, assignmentSubjectTone, assignmentToday } from "../copy";
import { learningWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Assignments.generated";

// Core first: Checklist/default cannot track coursework due dates, submission state and grades.
export const meta = {
  id: "Assignments",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Assignments are stored on the device.",
  variants: {
    lead: ["icon", "none"],
  },
  variantParts: { "lead.none": { hides: ["mark"] } },
  parts: ["root", "message"],
  items: { key: "items", parts: ["root", "mark", "title", "subject", "due", "status", "grade", "done"] },
  states: ["filled", "empty"],
  emptyActions: [],
  actions: { items: { done: ["check"], root: ["press"] }, when: { done: { submission: "open" } } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const words = learningWordsFor(lang).assignments;
    return (input as AssignmentsProps).items.map(({ id, due, status }) =>
      words.reading(
        id,
        assignmentDue(due, status, lang),
        status === "graded" ? words.graded : words.handedIn,
      ),
    );
  },
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
  .overwrite((value) => ({
    ...value,
    // An untouched to-do is the default unchecked state. Live changes are read from the check.
    ...(value.status === "done" ? { done: true } : {}),
    submission: value.status === "graded" ? "graded" : "open",
  }));

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z.array(assignment).min(1).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 4);
  const due = assignmentToday();
  return {
    items: (items.length ? items : [undefined]).map((item, index) => ({
      title: (item && c.titleOf(item, 28, thing)) ?? c.placeholderTitle(index, lang),
      subject: (item && c.detailOf(item, 20, thing)) ?? c.clip(c.wordsFor(lang).placeholderLabel, 20),
      due,
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
        due: "2026-11-17",
        status: "todo",
        goto: "worksheet",
      },
      {
        title: "Light and shade log",
        subject: "Botany",
        due: "2026-11-18",
        status: "graded",
        grade: "A",
        goto: "light_log",
      },
    ],
  },
  {
    items: [
      {
        title: "Route assessment",
        subject: "Dog walking",
        due: "2026-11-18",
        status: "done",
        goto: "route_assessment",
      },
      {
        title: "Lead safety notes",
        subject: "Handling",
        due: "2026-11-22",
        status: "todo",
        goto: "lead_notes",
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
  {
    ...write(
      "Show my Geometry homework: Angle worksheet, due November 25, 2026, still to do, opens worksheet. Keep the subject name and hand-in control, but don't show an icon beside the row.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("I finished the Fern care worksheet. Mark it as handed in using its checkbox, not its link.", {
    address: "a1/r1/done",
    action: "check",
  }),
] satisfies c.Probe[];

type AssignmentsProps = c.Props<typeof props, typeof meta>;

function AssignmentStatus(
  title: string,
  grade: string | undefined,
  density: c.ThemeDensity,
  control: Parameters<typeof kit.KitRow>[0]["leading"],
  statusTone: "good" | "muted",
  graded: boolean,
  words: ReturnType<typeof learningWordsFor>["assignments"],
) {
  return (
    <kit.KitRow
      part={null}
      label={title}
      inline
      lineRole="caption"
      density={density}
      leading={control}
      leadingWidth="avatar"
    >
      <kit.KitText role="caption" part={null} tone={statusTone} density={density}>
        <kit.KitText role="caption" part="status" tone={statusTone} density={density}>
          {graded ? words.graded : words.handedIn}
        </kit.KitText>
        {grade !== undefined && (
          <>
            {words.gradeSeparator}
            <kit.KitText role="label" part="grade" tone="good" density={density}>
              {grade}
            </kit.KitText>
          </>
        )}
      </kit.KitText>
    </kit.KitRow>
  );
}

type AssignmentRowProps = {
  row: AssignmentsProps["items"][number];
  density: c.ThemeDensity;
  lead: AssignmentsProps["lead"];
  first: boolean;
};
function AssignmentRow({ row, density, lead, first }: AssignmentRowProps) {
  const scope = kit.usePartContext();
  const {
    lang,
    words: { assignments: words },
  } = kit.useWords(learningWordsFor);
  const { id, title, subject, status, due, grade, goto } = row;
  const graded = status === "graded",
    today = assignmentToday();
  const done = kit.useControlValue(`${scope.screen}/${scope.component}/${id}/done`, status === "done");
  const overdue = !graded && !done && due < today;
  const mark =
    lead === "icon" ? (
      <kit.KitIcon name="book_open" tone={overdue ? "muted" : assignmentSubjectTone(subject)} part="mark" />
    ) : undefined;
  const control = graded ? (
    grade === undefined ? (
      <kit.KitTrail kind="check" part="done" tone="good" />
    ) : (
      <kit.KitIcon name="check" tone="good" decorative />
    )
  ) : (
    <kit.KitCheck part="done" done={done} label={words.handInLabel(title)} />
  );
  const statusTone = graded || done ? "good" : "muted";
  return (
    <kit.PartScope {...scope} item={id}>
      <kit.KitContent density={density} rhythm="flush" group={first ? "content" : "response"}>
        <kit.KitRow
          part="root"
          label={title}
          goto={goto}
          inline
          density={density}
          leading={mark}
          leadingWidth="avatar"
          trailing={<kit.KitIcon name="chevron_right" scale="sm" decorative />}
        >
          <kit.KitText role="body" part="title" density={density}>
            {title}
          </kit.KitText>
          <kit.KitText role="caption" part="subject" tone="muted" density={density}>
            {subject}
          </kit.KitText>
          <kit.KitText role="caption" part="due" tone={overdue ? "bad" : "muted"} density={density}>
            {assignmentDue(due, status, lang, today)}
          </kit.KitText>
        </kit.KitRow>
        {AssignmentStatus(title, grade, density, control, statusTone, graded, words)}
      </kit.KitContent>
    </kit.PartScope>
  );
}

export function Assignments(input: AssignmentsProps) {
  const density = kit.useKit().density;
  const surface = "card";
  const lead = kit.useVariant("lead", meta.variants.lead, input.lead);
  const state = kit.useComponentState();
  return (
    <kit.KitCard part="root" padded={state === "filled"} density={density} surface={surface}>
      {state === "empty" ? (
        <kit.KitEmpty part="message" icon="book_open" decorativeIcon />
      ) : (
        input.items.map((row, index) => (
          <AssignmentRow key={row.id} {...{ row, density, lead }} first={index === 0} />
        ))
      )}
    </kit.KitCard>
  );
}
