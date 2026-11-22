import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { minutesHeader, minutesProjection, minutesReading, minutesRowCopy, type MinutesRow } from "../copy";
import { communityWordsFor } from "../lang";
import { dateTime, distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: Checklist/default tracks jobs, not approved decisions linked to motions and owned follow-up.
// prettier-ignore
export const meta = {
  id: "Minutes",
  status: "ready" as "ready" | "draft",
  group: "content",
  purpose: "Record agreed decisions and follow-up actions with owners and sign-off.",
  pick: "Official meeting minutes with agreed decisions, linked motions, owned follow-up and approval. Not a draft note (Composer), personal jobs (Checklist), long prose (Article) or a change audit (ActivityLog).",
  writeHints: [
    "Use unique snake_case decision and action ids. Each action decisionId must match a decision in this record. Only link closed, uncancelled votes; do not write their outcomes again.",
    'Set both approval fields together or neither; approvedAt is an offset ISO datetime. Use style "actions" only for follow-up with decision links, not the official record.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath:
    "A shared record links stored motions and members; chair approval locks decisions, but actions can still progress.",
    parts: ["root", "title", "date", "chair", "approval", "approve", "approve_label", "empty"],
  items: {
    key: "entries",
    parts: ["root", "title", "text", "motion", "decision", "owner", "due", "done", "chevron"],
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { approve: ["press"] },
    items: { root: ["press"], done: ["check"] },
    when: {
      approve: { approved: false, can_approve: true },
      root: { kind: "decision", linked: true },
      done: { kind: "action", can_check: true },
    },
  },
  signature: "check_burst",
  live: { derive: minutesProjection(), checks: { done: "done" } },
  read: minutesReading,
} as const satisfies c.Meta;

const decision = z.strictObject({ id: ref, title: c.text(32), text: c.text(200), voteId: ref.optional() });
// prettier-ignore
const followUp = z.strictObject({
  id: ref, decisionId: ref, text: c.text(36), ownerId: ref, due: c.isoDate.optional(), done: z.boolean(),
});

// prettier-ignore
const schema = z.strictObject({
  title: c.text(40), date: c.isoDate, chairId: ref,
  decisions: z.array(decision).min(1).max(8), actions: z.array(followUp).min(0).max(12),
  approvedAt: dateTime.optional(), approvedBy: ref.optional(),
  style: z.enum(["record", "actions"]).default("record"),
});

export const props = schema
  .refine(({ approvedAt, approvedBy }) => Boolean(approvedAt) === Boolean(approvedBy), {
    path: ["approvedBy"],
  })
  .refine(({ decisions }) => distinct(decisions, (row) => row.id), { path: ["decisions"] })
  .refine(
    ({ decisions, actions }) =>
      distinct(actions, (row) => row.id) &&
      actions.every((row) => decisions.some(({ id }) => row.decisionId === id)),
    { path: ["actions"] },
  )
  .overwrite((input) => ({
    ...input,
    approved: Boolean(input.approvedAt),
    entries: [
      ...input.decisions.map((row) => ({
        ...row,
        entryId: row.id,
        kind: "decision",
        linked: Boolean(row.voteId),
        visible: true,
        showText: input.style === "record",
      })),
      ...input.actions.map((row) => ({ ...row, entryId: row.id, kind: "action", visible: true })),
    ],
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    title: seedTitle(input, 40),
    date: seedDate,
    chairId: "item_1",
    decisions: [
      { id: "decision_1", title: seedTitle(input, 32), text: c.wordsFor(input.lang).placeholderDetail },
    ],
    actions: [],
  };
}

// prettier-ignore
export const examples: z.input<typeof props>[] = [
  {
    title: "November committee minutes", date: "2026-11-18", chairId: "ana",
    decisions: [
      { id: "shed_purchase", title: "Buy a shared tool shed", text: "Get quotes before ordering the shed.", voteId: "shed" },
    ],
    actions: [
      { id: "quotes", decisionId: "shed_purchase", text: "Obtain three quotes", ownerId: "ana", due: "2026-11-28", done: true },
      { id: "delivery", decisionId: "shed_purchase", text: "Arrange shed delivery", ownerId: "lee", done: false },
    ],
    approvedAt: "2026-11-19T10:00:00Z",
    approvedBy: "ana",
  },
  {
    title: "Trot committee minutes", date: "2026-10-08", chairId: "jo", style: "actions",
    decisions: [{ id: "route", title: "Adopt the winter route", text: "Start at the park gate in winter." }],
    actions: [
      { id: "confirm_dates", decisionId: "route", text: "Confirm walk dates", ownerId: "lee", done: false },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Minutes");
// prettier-ignore
export const probes = [
  choose("Keep our official agreed meeting decisions with links to motions, follow-up owners and due dates, and a chair's sign-off."),
  choose("Make a short checklist of private jobs I can tick off. No meeting decisions, owners or approvals.", "Checklist"),
  write("Record our November committee minutes for 18 November 2026. Ana chaired. We decided to buy a shared tool shed after the motion called shed, and agreed to obtain quotes before ordering. Ana owns the follow-up, Obtain three quotes, and hasn't finished it yet."),
  read("Open the motion linked to the decision to buy the shared tool shed.", {
    address: "m1/r1",
    action: "press",
  }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;

// prettier-ignore
function Entry({ row, density, loading }: { row: MinutesRow; density: Density; loading: boolean }) {
  const { lang } = kit.useWords(communityWordsFor), copy = minutesRowCopy(row, lang);
  const trailing = loading ? (row.kind === "action" || row.linked) && <kit.KitSkeleton shape="control" kind="quiet" />
    : row.kind === "action" ? <kit.KitCheck part="done" done={row.done}
      label={"status" in copy ? copy.status : copy.title} readonly={!row.can_check} />
    : row.linked ? <kit.KitTrail kind="chevron" part="chevron" /> : undefined;
  const fields: [string, string | false | undefined][] = "action" in copy ?
    [["text", copy.text], ["motion", copy.action]] : [["decision", copy.decision], ["owner", copy.owner], ["due", copy.due]];
  return <kit.KitRow item={row.id} part={loading ? null : "root"} label={loading ? "" : copy.title}
    goto={!loading && row.kind === "decision" ? row.goto : undefined} {...{ density, trailing }}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["body", copy.title], ...fields.map(([, text]): ["label", string | undefined] => ["label", text || undefined])]} />
      : <kit.KitContent density={density}>
        <kit.KitText part="title" role="body" emphasis="strong">{copy.title}</kit.KitText>
        {fields.map(([part, text]) => text && <kit.KitText key={part} part={part} role="label"
          tone={part === "motion" ? "accent" : part === "due" && row.kind === "action" && row.overdue ? "bad" : "muted"}>
          {text}</kit.KitText>)}
      </kit.KitContent>}
  </kit.KitRow>;
}

// prettier-ignore
export function Minutes(input: View) {
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useKit().density;
  const surface = "card";
  const { lang, words: { minutes: w } } = kit.useWords(communityWordsFor);
  const { entries, can_approve } = kit.useLiveControls(meta, input) as { entries: MinutesRow[]; can_approve: boolean };
  const header = minutesHeader(input, lang);
  const sections = ["decision", "action"] as const;
  return <kit.KitCard part="root" {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="file_text" decorativeIcon />
      : state === "error" || state === "success" ? <kit.KitRow label="" density={density}>
        <kit.KitText part={null} role="heading" tone={state === "success" ? "good" : "bad"}>
          {state === "success" ? w.saved : w.error}</kit.KitText></kit.KitRow>
      : <>
        <kit.KitRow label="" density={density}>{loading ? <kit.KitSkeleton shape="figure" inset="none"
          content={[["heading", input.title], ...Object.values(header).map((text): ["label", string] => ["label", text])]} />
          : <kit.KitContent density={density}>
            <kit.KitText part="title" role="heading" emphasis="strong">{input.title}</kit.KitText>
            {Object.entries(header).map(([part, text]) => <kit.KitText key={part} part={part} role="label"
              tone={part === "approval" && input.approvedAt ? "good" : "muted"}>{text}</kit.KitText>)}
          </kit.KitContent>}</kit.KitRow>
        {sections.map((kind) => {
          const rows = entries.filter((row) => row.kind === kind && row.visible);
          const title = kind === "decision" ? w.decisions : w.actions;
          return rows.length > 0 && <kit.KitContent key={kind} group="response" density={density}>
            <kit.KitContent inset="md" density={density}>{loading
              ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", title]]} />
              : <kit.KitText part={null} role="label" emphasis="strong">{title}</kit.KitText>}</kit.KitContent>
            {rows.map((row) => <Entry key={row.id} {...{ row, density, loading }} />)}
          </kit.KitContent>;
        })}
        {can_approve && <kit.KitRow label="" density={density}>{loading
          ? <kit.KitSkeleton shape="control" label={w.approve} />
          : <kit.KitAction part="approve" action="press" label={w.approve} />}</kit.KitRow>}
      </>}
  </kit.KitCard>;
}
