import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  duesCadences,
  duesGroups,
  duesMoney,
  duesProjection,
  duesReading,
  duesRowCopy,
  ledgerTotals,
  type DuesRow,
} from "../copy";
import { communityWordsFor } from "../lang";
import { distinct, ref, seedDate, seedTitle } from "../seeds";
import { prompt } from "../../../entry/prompt-Dues.generated";

// Core first: Amount/default shows a figure, not assessments reconciled against multiple receipts.
export const meta = {
  id: "Dues",
  status: "ready" as "ready" | "draft",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "The treasurer keeps a local ledger; messaging sends reminders and only a payment service's confirmed receipt changes the ledger.",
  parts: ["root", "period", "cadence", "assessed", "collected", "outstanding", "empty"],
  items: {
    key: "entries",
    visibleWhen: { visible: true },
    parts: [
      "root",
      "member",
      "amount",
      "due",
      "paid",
      "outstanding",
      "credit",
      "status",
      "household",
      "date",
      "method",
      "voided",
      "record",
      "remind",
      "pay",
      "void",
      "record_label",
      "remind_label",
      "pay_label",
      "void_label",
    ],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { record: ["press"], remind: ["press"], pay: ["press"], void: ["press"] },
    when: {
      record: { kind: "assessment", style: "ledger", treasurer: true, can_record: true },
      remind: { kind: "assessment", style: "ledger", treasurer: true, can_remind: true },
      pay: { kind: "assessment", style: "member", can_pay: true },
      void: { kind: "receipt", style: "ledger", treasurer: true, voided: false },
    },
  },
  partTiers: { remind: "service", pay: "service" },
  confirmParts: ["void"],
  live: { derive: duesProjection() },
  read: duesReading,
} as const satisfies c.Meta;

const assessment = z.strictObject({
  id: ref,
  memberId: ref,
  amount: z.number().nonnegative(),
  due: c.isoDate,
  waived: z.boolean().optional(),
  householdId: ref.optional(),
});
const receipt = z.strictObject({
  id: ref,
  assessmentId: ref,
  amount: z.number().positive(),
  date: c.isoDate,
  method: z.enum(["cash", "transfer", "card"]),
  voided: z.boolean().default(false),
});
const schema = z.strictObject({
  period: c.text(20),
  cadence: z.enum(duesCadences).optional(),
  assessments: z.array(assessment).min(1).max(30),
  receipts: z.array(receipt).min(0).max(60),
  style: z.enum(["ledger", "member"]).default("ledger"),
});
export const props = schema
  .refine(({ assessments }) => distinct(assessments, (row) => row.id), { path: ["assessments"] })
  .refine(
    ({ assessments, style }) =>
      style !== "member" || assessments.every((row) => row.memberId === assessments[0]?.memberId),
    { path: ["assessments"] },
  )
  .refine(
    ({ assessments, receipts }) =>
      distinct(receipts, (row) => row.id) &&
      receipts.every((row) => assessments.some(({ id }) => id === row.assessmentId)),
    { path: ["receipts"] },
  )
  .overwrite((input) => ({
    ...input,
    entries: [
      ...input.assessments.map((row) => ({ ...row, entryId: row.id, kind: "assessment" })),
      ...input.receipts.map((row) => ({ ...row, entryId: row.id, kind: "receipt" })),
    ],
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    period: seedTitle(input, 20),
    assessments: [{ id: "assessment_1", memberId: "item_1", amount: 0, due: seedDate }],
    receipts: [],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    period: "2026 subscriptions",
    assessments: [
      { id: "ana_2026", memberId: "ana", amount: 25, due: "2026-04-01" },
      { id: "lee_2026", memberId: "lee", amount: 25, due: "2026-04-01" },
    ],
    receipts: [
      { id: "receipt_1", assessmentId: "ana_2026", amount: 10, date: "2026-03-10", method: "cash" },
      {
        id: "receipt_2",
        assessmentId: "lee_2026",
        amount: 25,
        date: "2026-03-12",
        method: "transfer",
        voided: true,
      },
    ],
  },
  {
    period: "Trot autumn dues",
    style: "member",
    assessments: [{ id: "jo_autumn", memberId: "jo", amount: 30, due: "2026-09-08" }],
    receipts: [
      { id: "receipt_3", assessmentId: "jo_autumn", amount: 30, date: "2026-09-06", method: "card" },
    ],
  },
  {
    period: "Spring dues",
    cadence: "monthly",
    assessments: [
      { id: "lee_april", memberId: "lee", amount: 25, due: "2026-04-01", householdId: "river_lane" },
      {
        id: "jo_april",
        memberId: "jo",
        amount: 25,
        due: "2026-04-01",
        householdId: "river_lane",
        waived: true,
      },
      { id: "cal_april", memberId: "cal", amount: 25, due: "2026-04-01" },
    ],
    receipts: [
      { id: "receipt_4", assessmentId: "lee_april", amount: 10, date: "2026-03-10", method: "cash" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Dues");
export const probes = [
  choose(
    "Reconcile our club's annual subscriptions per member, with individual assessments, partial receipts and amounts still owed.",
  ),
  choose("Show one prominent money figure for the 25 membership fee, no members or receipts.", "Amount"),
  write(
    "Show the treasurer's 2026 subscriptions: assessment ana_2026 for member ana, 25 due 2026-04-01, and cash receipt receipt_1 for ana_2026, 10 on 2026-03-10.",
  ),
  {
    ...write(
      "Our dues recur every month. Set the ledger's cadence to monthly. For April, record assessment ana_april for member ana, 25 due 2026-04-01. No receipts.",
    ),
    expectProps: { cadence: "monthly" },
  },
  {
    ...write(
      "Record exactly one assessment, ana_april for member ana, normally 25 due 2026-04-01, but the treasurer explicitly waived it. No receipts.",
    ),
    expectProps: { assessments: [{ amount: 25, waived: true }] },
  },
  {
    ...write(
      "Record exactly two assessments, ana_april for member ana and lee_april for member lee, both 25 due 2026-04-01. They belong to the same household, river_lane. Group the assessments under that household. No receipts.",
    ),
    expectProps: { assessments: [{ householdId: "river_lane" }, { householdId: "river_lane" }] },
  },
  read("Void Ana's cash receipt without deleting it.", { address: "d1/r3/void", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
const totals = ["assessed", "collected", "outstanding"] as const;

function LedgerActions(
  controls: ReturnType<typeof duesRowCopy>["controls"],
  w: ReturnType<typeof communityWordsFor>["dues"],
  density: Density,
  loading: boolean,
) {
  return (
    <kit.KitActionFooter align="end" density={density}>
      {controls.map(
        (part) =>
          part && (
            <kit.KitAction
              key={part}
              part={loading ? null : part}
              action="press"
              label={w[part]}
              {...(part === "void"
                ? ({ kind: "quiet", icon: "close", contentParts: { label: "void_label" } } as const)
                : ({ kind: part === "pay" ? "primary" : "secondary" } as const))}
            />
          ),
      )}
    </kit.KitActionFooter>
  );
}

function LedgerRow({ row, density, ledger }: { row: DuesRow; density: Density; ledger: boolean }) {
  const {
    lang,
    words: { dues: w },
  } = kit.useWords(communityWordsFor);
  const { title, amount, fields, controls, badge } = duesRowCopy(row, ledger, lang);
  const assessment = row.kind === "assessment";
  const loading = kit.useComponentState() === "loading";
  const tone =
    !assessment || row.status === "waived"
      ? "muted"
      : row.status === "paid"
        ? "good"
        : row.status === "overdue"
          ? "bad"
          : "warn";
  return (
    <kit.KitRow
      item={row.id}
      part={loading ? null : "root"}
      label={loading ? "" : title}
      density={density}
      inset="none"
    >
      <kit.KitGrid density={density}>
        <kit.KitMetaLine
          density={density}
          title={{ text: title, part: "member", strong: true }}
          meta={fields.flat().map(([part, text]) => ({ part, text }))}
        />
        <kit.KitContent density={density}>
          <kit.KitLayoutText
            density={density}
            align="end"
            line={{ text: amount, part: "amount", role: "figure", compact: true, tabular: true }}
          />
          {badge && (
            <kit.KitLayoutText
              density={density}
              align="end"
              line={{ text: badge, part: assessment ? "status" : "voided", role: "meta", tone }}
            />
          )}
          {LedgerActions(controls, w, density, loading)}
        </kit.KitContent>
      </kit.KitGrid>
    </kit.KitRow>
  );
}

function LedgerSummary(
  summary: ReturnType<typeof ledgerTotals>,
  w: ReturnType<typeof communityWordsFor>["dues"],
  density: Density,
  lang: string,
) {
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitGrid columns={3} density={density}>
        {totals.map((key) => (
          <kit.KitFigure
            key={key}
            density={density}
            align="end"
            value={{ text: duesMoney(summary[key], lang), part: key, compact: true }}
            caption={
              <kit.KitLayoutText
                density={density}
                align="end"
                line={{ text: w[key], role: "meta", tone: "muted" }}
              />
            }
          />
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

function LedgerGroups(
  rows: DuesRow[],
  lang: string,
  density: Density,
  scope: ReturnType<typeof kit.usePartContext>,
  ledger: boolean,
) {
  return duesGroups(rows, lang).map(({ entries, heading }) => (
    <kit.KitContent key={entries[0]!.id} group="response" density={density}>
      {heading && (
        <kit.PartScope {...scope} item={entries[0]!.id}>
          <kit.KitLayoutText
            density={density}
            line={{ text: heading, part: "household", role: "meta", strong: true }}
          />
        </kit.PartScope>
      )}
      <kit.KitRowGroup density={density}>
        {entries.map((row) => (
          <LedgerRow key={row.id} row={row} density={density} ledger={ledger} />
        ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  ));
}

export function Dues(input: View) {
  const state = kit.useComponentState(),
    scope = kit.usePartContext();
  const density = kit.useKit().density;
  const surface = "card";
  const {
    lang,
    words: { dues: w },
  } = kit.useWords(communityWordsFor);
  const { entries, treasurer } = kit.useLiveControls(meta, input) as {
    entries: DuesRow[];
    treasurer: boolean;
  };
  const rows = entries.filter((entry) => entry.visible);
  const summary = ledgerTotals(rows);
  const content = (
    <>
      <kit.KitHeader
        density={density}
        title={{ text: input.period, part: "period" }}
        meta={{ text: input.cadence && w.cadence[input.cadence], part: "cadence" }}
      />
      {LedgerSummary(summary, w, density, lang)}
      {LedgerGroups(rows, lang, density, scope, input.style === "ledger" && treasurer)}
    </>
  );
  const resolved = state === "success" || state === "error";
  return (
    <kit.KitCard
      part="root"
      padded={!resolved && state !== "empty" && rows.length > 0}
      {...{ density, surface }}
    >
      {!rows.length && !resolved ? (
        <kit.KitEmpty icon="receipt" decorativeIcon part="empty" />
      ) : (
        <kit.KitState
          icon={state === "empty" ? "receipt" : undefined}
          density={density}
          part={state === "empty" ? "empty" : null}
          loading={content}
          message={state === "error" ? w.error : state === "success" ? w.saved : undefined}
        >
          {content}
        </kit.KitState>
      )}
    </kit.KitCard>
  );
}
