import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  attendanceSchema,
  memberDirectoryKind,
  minutesHeader,
  minutesProjection,
  minutesReading,
  minutesRowCopy,
  type MinutesRow,
} from "../copy";
import { communityWordsFor } from "../lang";
import { dateTime, distinct, ref, seedDate, seedTitle } from "../seeds";
import { prompt } from "../../../entry/prompt-Minutes.generated";

// Core first: Checklist/default tracks jobs, not approved decisions linked to motions and owned follow-up.
export const meta = {
  id: "Minutes",
  status: "ready" as "ready" | "draft",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath:
    "A shared record links stored motions and members; chair approval locks decisions, but actions can still progress.",
  parts: [
    "root",
    "title",
    "date",
    "chair",
    "approval",
    "present",
    "apologies",
    "approve",
    "approve_label",
    "empty",
  ],
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
  deviceData: [memberDirectoryKind],
  previewDeviceData: ({ input }) =>
    input.attendance ? { [memberDirectoryKind]: attendanceExampleMembers } : {},
  read: minutesReading,
} as const satisfies c.Meta;

const decision = z.strictObject({ id: ref, title: c.text(32), text: c.text(200), voteId: ref.optional() });
const followUp = z.strictObject({
  id: ref,
  decisionId: ref,
  text: c.text(36),
  ownerId: ref,
  due: c.isoDate.optional(),
  done: z.boolean(),
});

const schema = z.strictObject({
  title: c.text(40),
  date: c.isoDate,
  chairId: ref,
  decisions: z.array(decision).min(1).max(8),
  actions: z.array(followUp).min(0).max(12),
  approvedAt: dateTime.optional(),
  approvedBy: ref.optional(),
  attendance: attendanceSchema.optional(),
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

export const examples: z.input<typeof props>[] = [
  {
    title: "November committee minutes",
    date: "2026-11-18",
    chairId: "ana",
    decisions: [
      {
        id: "shed_purchase",
        title: "Buy a shared tool shed",
        text: "Get quotes before ordering the shed.",
        voteId: "shed",
      },
    ],
    actions: [
      {
        id: "quotes",
        decisionId: "shed_purchase",
        text: "Obtain three quotes",
        ownerId: "ana",
        due: "2026-11-28",
        done: true,
      },
      {
        id: "delivery",
        decisionId: "shed_purchase",
        text: "Arrange shed delivery",
        ownerId: "lee",
        done: false,
      },
    ],
    approvedAt: "2026-11-19T10:00:00Z",
    approvedBy: "ana",
  },
  {
    title: "Trot committee minutes",
    date: "2026-10-08",
    chairId: "jo",
    style: "actions",
    attendance: { presentIds: ["lee"], apologiesIds: ["ana"] },
    decisions: [{ id: "route", title: "Adopt the winter route", text: "Start at the park gate in winter." }],
    actions: [
      { id: "confirm_dates", decisionId: "route", text: "Confirm walk dates", ownerId: "lee", done: false },
    ],
  },
] satisfies z.input<typeof props>[];

const attendanceExampleMembers = [
  { id: "ana", name: "Ana Reed" },
  { id: "lee", name: "Lee Ortiz" },
];

const { choose, write, read } = c.probesFor("Minutes");
export const probes = [
  choose(
    "Keep our official agreed meeting decisions with links to motions, follow-up owners and due dates, and a chair's sign-off.",
  ),
  choose(
    "Make a short checklist of private jobs I can tick off. No meeting decisions, owners or approvals.",
    "Checklist",
  ),
  write(
    "Record our November committee minutes for 18 November 2026. Ana chaired. We decided to buy a shared tool shed after the motion called shed, and agreed to obtain quotes before ordering. Ana owns the follow-up, Obtain three quotes, and hasn't finished it yet.",
  ),
  {
    ...write(
      "Record the 18 November 2026 committee minutes. Ana chaired; the committee agreed to buy a tool shed, no follow-up yet. Record attendance: member ana was present; member lee sent apologies. No other attendees.",
    ),
    expectProps: { attendance: { presentIds: ["ana"], apologiesIds: ["lee"] } },
  },
  read("Open the motion linked to the decision to buy the shared tool shed.", {
    address: "m1/r1",
    action: "press",
  }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;

function EntryTrailing(row: MinutesRow, copy: ReturnType<typeof minutesRowCopy>, loading: boolean) {
  return row.kind === "action" ? (
    loading ? (
      <kit.KitSkeleton shape="control" kind="quiet" />
    ) : (
      <kit.KitCheck
        part="done"
        done={row.done}
        label={"status" in copy ? copy.status : copy.title}
        readonly={!row.can_check}
      />
    )
  ) : (
    row.linked &&
      (loading ? (
        <kit.KitIcon name="chevron_right" decorative loading />
      ) : (
        <kit.KitTrail kind="chevron" part="chevron" />
      ))
  );
}

function Entry({ row, density }: { row: MinutesRow; density: Density }) {
  const { lang } = kit.useWords(communityWordsFor),
    copy = minutesRowCopy(row, lang);
  const loading = kit.useComponentState() === "loading";
  const trailing = EntryTrailing(row, copy, loading);
  const fields: [string, string | false | undefined][] =
    "action" in copy
      ? [
          ["text", copy.text],
          ["motion", copy.action],
        ]
      : [
          ["decision", copy.decision],
          ["owner", copy.owner],
          ["due", copy.due],
        ];
  return (
    <kit.KitRow
      item={row.id}
      part={loading ? null : "root"}
      label={loading ? "" : copy.title}
      inline
      fitContent
      goto={!loading && row.kind === "decision" ? row.goto : undefined}
      {...{ density, trailing }}
    >
      <kit.KitContent density={density} rhythm="flush">
        <kit.KitLayoutText
          density={density}
          line={{ text: copy.title, part: "title", role: "meta", strong: true }}
        />
        {fields.map(
          ([part, text]) =>
            text && (
              <kit.KitLayoutText
                key={part}
                density={density}
                line={{
                  text,
                  part,
                  role: "caption",
                  tone:
                    part === "motion"
                      ? "accent"
                      : part === "due" && row.kind === "action" && row.overdue
                        ? "bad"
                        : "muted",
                }}
              />
            ),
        )}
      </kit.KitContent>
    </kit.KitRow>
  );
}

function MinuteSections(
  entries: MinutesRow[],
  density: Density,
  w: ReturnType<typeof communityWordsFor>["minutes"],
) {
  return (["decision", "action"] as const).map((kind) => {
    const rows = entries.filter((row) => row.kind === kind && row.visible);
    const title = kind === "decision" ? w.decisions : w.actions;
    return (
      rows.length > 0 && (
        <kit.KitContent key={kind} group="response" density={density}>
          <kit.KitLayoutText
            density={density}
            line={{ text: title, role: "meta", tone: "muted", strong: true }}
          />
          <kit.KitRowGroup density={density} spacing="groups" separators={false}>
            {rows.map((row) => (
              <Entry key={row.id} {...{ row, density }} />
            ))}
          </kit.KitRowGroup>
        </kit.KitContent>
      )
    );
  });
}

export function Minutes(input: View) {
  const state = kit.useComponentState(),
    loading = state === "loading";
  const density = kit.useKit().density;
  const surface = "card";
  const {
    lang,
    words: { minutes: w },
  } = kit.useWords(communityWordsFor);
  const { entries, can_approve } = kit.useLiveControls(meta, input) as {
    entries: MinutesRow[];
    can_approve: boolean;
  };
  const { present, apologies, ...header } = minutesHeader(input, lang, kit.useDeviceData());
  const content = (
    <>
      <kit.KitHeader
        density={density}
        title={{ text: input.title, part: "title", role: "body", strong: true }}
        meta={Object.entries(header).map(([part, text]) => ({
          part,
          text,
          tone: part === "approval" && input.approvedAt ? "good" : "muted",
        }))}
      />
      {present && (
        <kit.KitContent group="response" rhythm="flush" density={density}>
          <kit.KitLayoutText
            density={density}
            line={{ text: present, part: "present", role: "meta", tone: "muted" }}
          />
          <kit.KitLayoutText
            density={density}
            line={{ text: apologies, part: "apologies", role: "meta", tone: "muted" }}
          />
        </kit.KitContent>
      )}
      {MinuteSections(entries, density, w)}
      {can_approve && (
        <kit.KitActionFooter density={density}>
          <kit.KitAction part={loading ? null : "approve"} action="press" label={w.approve} />
        </kit.KitActionFooter>
      )}
    </>
  );
  return (
    <kit.KitCard part="root" padded={state === "filled" || loading} {...{ density, surface }}>
      <kit.KitState
        part={state === "empty" ? "empty" : null}
        icon={state === "empty" ? "file_text" : undefined}
        message={state === "error" ? w.error : state === "success" ? w.saved : undefined}
        loading={content}
        density={density}
      >
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
