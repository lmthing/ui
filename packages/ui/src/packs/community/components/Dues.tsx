import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { duesMoney, duesProjection, duesReading, duesRowCopy, ledgerTotals, type DuesRow } from "../copy";
import { communityWordsFor } from "../lang";
import { distinct, ref, seedDate, seedTitle } from "../seeds";
import { prompt } from "../../../entry/prompt-Dues.generated";

// Core first: Amount/default shows a figure, not assessments reconciled against multiple receipts.
// prettier-ignore
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
    parts: ["root", "period", "assessed", "collected", "outstanding", "empty"],
  items: {
    key: "entries",
    visibleWhen: { visible: true },
    parts: [
      "root", "member", "amount", "due", "paid", "outstanding", "credit",
      "status", "date", "method", "voided", "record", "remind", "pay", "void",
      "record_label", "remind_label", "pay_label", "void_label",
    ],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { record: ["press"], remind: ["press"], pay: ["press"], void: ["press"] },
    when: {
      record: { kind: "assessment", style: "ledger", treasurer: true },
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
});
// prettier-ignore
const receipt = z.strictObject({
  id: ref, assessmentId: ref, amount: z.number().positive(), date: c.isoDate,
  method: z.enum(["cash", "transfer", "card"]), voided: z.boolean().default(false),
});
// prettier-ignore
const schema = z.strictObject({
  period: c.text(20),
  assessments: z.array(assessment).min(1).max(30), receipts: z.array(receipt).min(0).max(60),
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

// prettier-ignore
export const examples: z.input<typeof props>[] = [
  {
    period: "2026 subscriptions",
    assessments: [
      { id: "ana_2026", memberId: "ana", amount: 25, due: "2026-04-01" },
      { id: "lee_2026", memberId: "lee", amount: 25, due: "2026-04-01" },
    ],
    receipts: [
      { id: "receipt_1", assessmentId: "ana_2026", amount: 10, date: "2026-03-10", method: "cash" },
      { id: "receipt_2", assessmentId: "lee_2026", amount: 25, date: "2026-03-12",
        method: "transfer", voided: true },
    ],
  },
  {
    period: "Trot autumn dues", style: "member",
    assessments: [{ id: "jo_autumn", memberId: "jo", amount: 30, due: "2026-09-08" }],
    receipts: [{ id: "receipt_3", assessmentId: "jo_autumn", amount: 30, date: "2026-09-06", method: "card" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Dues");
// prettier-ignore
export const probes = [
  choose("Reconcile our club's annual subscriptions per member, with individual assessments, partial receipts and amounts still owed."),
  choose("Show one prominent money figure for the 25 membership fee, no members or receipts.", "Amount"),
  write("Show the treasurer's 2026 subscriptions: assessment ana_2026 for member ana, 25 due 2026-04-01, and cash receipt receipt_1 for ana_2026, 10 on 2026-03-10."),
  read("Void Ana's cash receipt without deleting it.", { address: "d1/r3/void", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
const totals = ["assessed", "collected", "outstanding"] as const;

// prettier-ignore
function LedgerRow({ row, density, ledger, loading }: {
  row: DuesRow; density: Density; ledger: boolean; loading: boolean;
}) {
  const { lang, words: { dues: w } } = kit.useWords(communityWordsFor);
  const { title, amount, fields, controls, badge } = duesRowCopy(row, ledger, lang);
  const assessment = row.kind === "assessment";
  const tone = assessment ? row.status === "paid" ? "good" : row.status === "overdue" ? "bad" : "warn" : "muted";
  return <kit.KitRow item={row.id} part={loading ? null : "root"} label={loading ? "" : title} density={density}>
    <kit.KitRow part={null} inline label="" density={density} lineRole="body"
      trailing={badge && <kit.KitTrail part={assessment ? "status" : "voided"} kind="badge" value={badge} tone={tone} />}>
      <kit.KitContent density={density}>{loading ? <kit.KitSkeleton shape="figure" inset="none"
        content={[["body", title], ["number", amount, "start", "compact"]]} /> : <>
        <kit.KitText part="member" role="body" emphasis="strong">{title}</kit.KitText>
        <kit.KitText part="amount" role="number" numberScale="compact" tabular>{amount}</kit.KitText></>}
      </kit.KitContent>
    </kit.KitRow>
    <kit.KitContent density={density}>
      {fields.map((line) => <kit.KitGrid key={line[0]![0]} density={density} arrange={line.length === 1 ? "rows" : "grid"}>
        {line.map(([part, text]) => loading ? <kit.KitSkeleton key={part} shape="figure" inset="none" content={[["label", text]]} />
          : <kit.KitText key={part} part={part} role="label" tone="muted">{text}</kit.KitText>)}
      </kit.KitGrid>)}
      {controls.some(Boolean) && <kit.KitGrid density={density}>
        {controls.map((part) => part && (loading ? <kit.KitSkeleton key={part} shape="control"
          label={w[part]} kind="secondary" /> :
          <kit.KitAction key={part} part={part} action="press" label={w[part]}
            kind={part === "void" ? "danger" : part === "pay" ? "primary" : "secondary"} />))}
      </kit.KitGrid>}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function Dues(input: View) {
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useKit().density;
  const surface = "card";
  const { lang, words: { dues: w } } = kit.useWords(communityWordsFor);
  const { entries, treasurer } = kit.useLiveControls(meta, input) as { entries: DuesRow[]; treasurer: boolean };
  const rows = entries.filter((entry) => entry.visible);
  const summary = ledgerTotals(rows);
  return <kit.KitCard part="root" {...{ density, surface }}>
    {state === "empty" || !rows.length ? <kit.KitEmpty icon="receipt" decorativeIcon part="empty" />
      : state === "success" || state === "error" ? <kit.KitRow label="" density={density}><kit.KitText part={null}
        role="heading" tone={state === "success" ? "good" : "bad"}>{state === "success" ? w.saved : w.error}</kit.KitText></kit.KitRow>
      : <>
        <kit.KitRow label={input.period} density={density}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["heading", input.period]]} />
            : <kit.KitText part="period" role="heading" emphasis="strong">{input.period}</kit.KitText>}
          <kit.KitGrid columns={3} density={density}>
            {totals.map((key) => loading ? <kit.KitSkeleton key={key} shape="figure" inset="none"
              content={[["label", w[key]], ["number", duesMoney(summary[key], lang), "start", "compact"]]} />
              : <kit.KitContent key={key} density={density}>
                <kit.KitText part={null} role="label" tone="muted">{w[key]}</kit.KitText>
                <kit.KitText part={key} role="number" numberScale="compact" tabular>{duesMoney(summary[key], lang)}</kit.KitText>
              </kit.KitContent>)}
          </kit.KitGrid>
        </kit.KitRow>
        {rows.map((row, index) => <kit.KitContent key={row.id}
          group={row.kind === "receipt" && rows[index - 1]?.kind === "assessment" ? "response" : "content"}>
          <LedgerRow row={row} density={density} ledger={input.style === "ledger" && treasurer} loading={loading} />
        </kit.KitContent>)}
      </>}
  </kit.KitCard>;
}
