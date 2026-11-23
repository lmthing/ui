import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { actionDate, renewalDetails } from "../copy";
import { paperworkWordsFor } from "../lang";
import { seedDate, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-Renewals.generated";

// Core first: Calendar/week shows marked days, not distinct notice and end dates with a dated completion.
export const meta = {
  id: "Renewals",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Deadline and completion dates stay on device and local reminders need permission; the renewal itself happens outside the tracker.",
  variants: { detail: ["full", "brief"] },
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

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(renewal).min(1).max(6),
    style: z.enum(["due", "cards"]).default("due"),
  })
  .overwrite((value) => ({
    ...value,
    items: value.items
      .map((row) => (value.detail === "brief" ? { ...row, for: undefined } : row))
      .sort((a, b) => actionDate(a).localeCompare(actionDate(b))),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { items: seedRows(input, 32, 24).map(({ title }) => ({ title, due: seedDate })) };
}

export const examples = [
  {
    items: [
      { title: "Greenhouse permit", for: "Mina", noticeBy: "2027-03-10", due: "2027-04-10", goto: "permit" },
      { title: "Garden plot agreement", for: "Mina", due: "2027-04-30" },
    ],
  },
  {
    style: "cards",
    items: [
      {
        title: "Trot liability cover",
        for: "Alex",
        noticeBy: "2027-01-12",
        due: "2027-02-01",
        completedOn: "2027-01-09",
      },
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
      "Track the greenhouse permit renewal. Notice is 2027-03-10 and it ends 2027-04-10. Hide the owner and still show both dates.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Ask for a reminder for the greenhouse permit.", { address: "r1/r1/remind", action: "press" }),
] satisfies c.Probe[];

type RenewalsProps = c.Props<typeof props, typeof meta>;
type RenewalRow = RenewalsProps["items"][number];

function RenewalActions(
  title: string,
  loading: boolean,
  done: boolean,
  words: ReturnType<typeof paperworkWordsFor>["renewals"],
) {
  return (
    <>
      {!done &&
        (loading ? (
          <kit.KitSkeleton shape="control" kind="quiet" />
        ) : (
          <kit.KitAction kind="quiet" part="remind" icon="bell" a11y={words.remind(title)} />
        ))}
      {loading ? (
        <kit.KitSkeleton shape="control" kind="quiet" />
      ) : (
        <kit.KitAction kind="quiet" part="remove" icon="close" a11y={words.remove(title)} />
      )}
    </>
  );
}

function RenewalContent(
  row: RenewalRow,
  details: ReturnType<typeof renewalDetails>,
  density: c.ThemeDensity,
  loading: boolean,
) {
  return (
    <kit.KitRow
      part={loading ? null : "root"}
      inline
      surface="plain"
      goto={loading ? undefined : row.goto}
      label={loading ? "" : row.title}
      density={density}
      trailing={row.goto && <kit.KitIcon name="chevron_right" scale="sm" decorative loading={loading} />}
    >
      <kit.KitLayoutText line={{ part: "title", text: row.title }} {...{ density }} />
      <kit.KitLayoutText
        line={{ part: "for", text: row.for, role: "caption", tone: "muted" }}
        {...{ density }}
      />
      {details.map(({ part, line, tone }) => (
        <kit.KitLayoutText key={part} line={{ part, text: line, role: "caption", tone }} {...{ density }} />
      ))}
    </kit.KitRow>
  );
}

function RenewalItem({
  row,
  density,
  surface,
  now,
  success,
  status,
}: {
  row: RenewalRow;
  density: c.ThemeDensity;
  surface?: "card" | undefined;
  now: Date;
  success: boolean;
  status?: string | undefined;
}) {
  const {
    lang,
    words: { renewals: words },
  } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading";
  const done = success || complete(row);
  const details = renewalDetails({ ...row, complete: done }, now, lang);
  return (
    <kit.KitRow part={null} label="" inline={!surface} {...{ density, surface }}>
      <kit.KitContent {...{ density }}>
        {status && (
          <kit.KitText part="success" role="label" tone="good" density={density}>
            {status}
          </kit.KitText>
        )}
        <kit.KitRow
          item={row.id}
          part={null}
          label=""
          inline
          surface="plain"
          {...{ density }}
          leading={
            loading ? (
              <kit.KitSkeleton shape="control" kind="quiet" />
            ) : (
              <kit.KitCheck part="done" label={words.check(row.title)} done={done} />
            )
          }
          trailing={RenewalActions(row.title, loading, done, words)}
        >
          {RenewalContent(row, details, density, loading)}
        </kit.KitRow>
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function Renewals({ items, style }: RenewalsProps) {
  const surface = "card";
  const density = kit.useKit().density;
  const state = kit.useComponentState(),
    { words } = kit.useWords(paperworkWordsFor);
  const success = state === "success",
    cards = style === "cards",
    now = new Date();
  const allDone = state !== "loading" && (success || items.every(complete));
  return (
    <kit.KitCard
      style={cards ? "cards" : "inset"}
      padded={!cards && state !== "empty"}
      {...{ surface, density }}
    >
      {state === "empty" ? (
        <kit.KitEmpty part="empty" icon="calendar" decorativeIcon />
      ) : (
        <kit.KitGrid list arrange="rows" listRowGap="cards" density={density}>
          {items.map((row, index) => (
            <RenewalItem
              key={row.id}
              {...{ row, density, now, success }}
              surface={cards ? surface : undefined}
              status={index === 0 && allDone ? words.renewals.success : undefined}
            />
          ))}
        </kit.KitGrid>
      )}
    </kit.KitCard>
  );
}
