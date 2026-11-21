import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { actionDate, renewalDetails } from "../copy";
import { paperworkWordsFor } from "../lang";
import { seedDate, seedRows } from "../seeds";

// Core first: Calendar/week shows marked days, not distinct notice and end dates with a dated completion.
export const meta = {
  id: "Renewals",
  status: "ready",
  group: "data",
  purpose: "Act on obligations before their notice or expiry dates.",
  pick: "Act on administrative renewals with separate notice and end dates, dated completion and local reminders. Not dates alone (Calendar), filing expiring documents (Documents), recurring payments (Bills), routine care (CareSchedule) or purchase warranties (Warranties).",
  writeHints: [
    "Use actual dates in YYYY-MM-DD. noticeBy cannot be later than due. Omit completedOn unless a real completion date was supplied. Never write derived warnings or completion flags.",
    'Use style "cards" only for separate cards naming both dates; otherwise leave style null. Leave density and surface null unless requested.',
    'Exact defaults are density:null, surface:null, detail:null. A request for shorter rows sets only density:"compact"; never write detail:"full". Only a request to hide the owner sets detail:"brief"; keep both dates and leave unrequested axes null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Deadline and completion dates stay on device and local reminders need permission; the renewal itself happens outside the tracker.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["for"] } },
  parts: ["root", "empty", "success"],
  items: {
    key: "items",
    parts: [
      "root",
      "title",
      "for",
      "due",
      "notice_by",
      "completed_on",
      "warning",
      "done",
      "remind",
      "remind_icon",
      "remove",
      "remove_icon",
    ],
  },
  states: ["filled", "empty", "loading", "success"],
  live: { checks: { done: "complete" } },
  partTiers: { remind: "ok" },
  confirmParts: ["remove"],
  successActions: ["root.press", "done.check", "remove.press"],
  readSuccess: true,
  actions: {
    items: { root: ["press"], done: ["check"], remind: ["press"], remove: ["press"] },
    noGoto: { items: ["remind", "remove"] },
    when: { root: { can_open: true }, remind: { complete: false } },
  },
  read: (input, state, lang): string[] => {
    const rows = (input as { items: z.output<typeof renewal>[] }).items;
    const words = paperworkWordsFor(lang).renewals,
      now = new Date();
    return [
      ...(state === "success" || rows.every((row) => complete(row)) ? [words.success] : []),
      ...rows.flatMap((row) =>
        renewalDetails({ ...row, complete: complete(row) }, now, lang).map(({ line }) => line),
      ),
    ];
  },
} as const satisfies c.Meta;

const renewal = z
  .strictObject({
    title: c.text(32),
    for: c.text(24).optional(),
    due: c.isoDate,
    noticeBy: c.isoDate.optional(),
    completedOn: c.isoDate.optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ due, noticeBy }) => !noticeBy || noticeBy <= due, {
    path: ["noticeBy"],
    message: "Notice date must be on or before the due date",
  })
  .overwrite((row) => ({ ...row, complete: Boolean(row.completedOn), can_open: Boolean(row.goto) }));

function complete(row: z.output<typeof renewal>) {
  return (row as typeof row & { complete?: boolean }).complete ?? Boolean(row.completedOn);
}

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z.array(renewal).min(1).max(6),
  style: z.enum(["due", "cards"]).default("due"),
}).overwrite((value) => ({
  ...value,
  items: value.items.map((row) => value.detail === "brief" ? { ...row, for: undefined } : row)
    .sort((a, b) => actionDate(a).localeCompare(actionDate(b))),
}));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { items: seedRows(input, 32, 24).map(({ title }) => ({ title, due: seedDate })) };
}

// prettier-ignore
export const examples = [
  {
    items: [
      { title: "Greenhouse permit", for: "Mina", noticeBy: "2027-03-10", due: "2027-04-10", goto: "permit" },
      { title: "Garden plot agreement", for: "Mina", due: "2027-04-30" },
    ],
  },
  {
    style: "cards",
    density: "compact",
    surface: "plain",
    items: [
      { title: "Trot liability cover", for: "Alex", noticeBy: "2027-01-12", due: "2027-02-01", completedOn: "2027-01-09" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Renewals");
export const probes = [
  choose(
    "My licence ends in April but I have to give notice in March. Keep both dates, let me mark when I renewed it, and remind me in time.",
  ),
  choose("Show a week grid with marked days. I just want to see which dates are busy.", "Calendar"),
  write(
    "Track Mina's greenhouse permit renewal. Decide by 2027-03-10, it ends on 2027-04-10, and she hasn't completed it.",
  ),
  {
    ...write(
      "Show the greenhouse permit renewal, notice on 2027-03-10 and end date 2027-04-10. Use shorter rows with less vertical spacing so more deadlines fit on screen.",
    ),
    variant: { axis: "density", value: "compact" },
  },
  {
    ...write(
      "Track the greenhouse permit renewal. Notice is 2027-03-10 and it ends 2027-04-10. Hide the owner and still show both dates.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Ask for a reminder for the greenhouse permit.", { address: "r1/r1/remind", action: "press" }),
] satisfies c.Probe[];

type RenewalsProps = c.Props<typeof props, typeof meta>;
type RenewalRow = RenewalsProps["items"][number];

// prettier-ignore
function RenewalItem({ row, density, surface, now, success }: {
  row: RenewalRow; density: c.ThemeDensity; surface: "card" | "plain" | undefined; now: Date; success: boolean;
}) {
  const { lang, words: { renewals: words } } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading", done = success || complete(row);
  const details = renewalDetails({ ...row, complete: done }, now, lang);
  return <kit.KitRow item={row.id} part={null} label="" {...{ density, surface }}
    leading={loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
      <kit.KitCheck part="done" label={words.check(row.title)} done={done} />}
    trailing={loading ? <>
      {!done && <kit.KitSkeleton shape="control" kind="quiet" />}
      <kit.KitSkeleton shape="control" kind="quiet" />
    </> : <>
      {!done && !success && <kit.KitAction kind="quiet" part="remind" icon="bell" a11y={words.remind(row.title)} />}
      <kit.KitAction kind="quiet" part="remove" icon="close" a11y={words.remove(row.title)} />
    </>}>
    <kit.KitRow part={loading ? null : "root"} inline surface="plain" goto={loading ? undefined : row.goto}
      label={loading ? "" : row.title} density={density}
      trailing={row.goto && !loading ? <kit.KitIcon name="chevron_right" scale="sm" tone="muted" decorative /> : undefined}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
        content={[["body", row.title], ["caption", row.for], ...details.map(({ line }): ["caption", string] => ["caption", line])]} /> : <>
        <kit.KitText part="title" density={density}>{row.title}</kit.KitText>
        {row.for && <kit.KitText part="for" role="caption" tone="muted">{row.for}</kit.KitText>}
        {details.map(({ part, line, tone }) => <kit.KitText key={part} {...{ part, tone }} role="caption">{line}</kit.KitText>)}
      </>}
    </kit.KitRow>
  </kit.KitRow>;
}

// prettier-ignore
export function Renewals({ items, style, surface, density: requested }: RenewalsProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const state = kit.useComponentState(), { words } = kit.useWords(paperworkWordsFor);
  const success = state === "success", cards = style === "cards", now = new Date();
  const loading = state === "loading";
  return <kit.KitCard style={cards ? "cards" : "inset"} {...{ surface, density }}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="calendar" decorativeIcon /> : <>
      {!loading && (success || items.every(complete)) && <kit.KitRow part={null} label="" surface="plain">
        <kit.KitText part="success" role="label" tone="good">{words.renewals.success}</kit.KitText>
      </kit.KitRow>}
      <kit.KitGrid list arrange="rows" listRowGap={cards ? "cards" : undefined} density={density}>
        {items.map((row) => <RenewalItem key={row.id} {...{ row, density, now, success }} surface={cards ? surface : undefined} />)}
      </kit.KitGrid>
    </>}
  </kit.KitCard>;
}
