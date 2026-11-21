import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { rentCopy, rentGroups, rentReading } from "../copy";
import { propertyWordsFor } from "../lang";
import { ledgerRows } from "../ledger";
import { distinct, ref, seedDate, seedLabels } from "../seeds";
// Core first: Amount/total cannot reconcile rent charges and allocated receipts across units or periods.
// prettier-ignore
export const meta = {
  id: "RentRoll", status: "ready", group: "data",
  purpose: "Reconcile monthly rent charges and receipts across units, including part payments and arrears.",
  pick: "Reconcile rent charges and allocated or voided receipts by unit and period. Not one sum (Amount), one client's payment (PaymentStatus), an invoice (Invoice), or personal bills (Bills).",
  writeHints: [
    "Every receipt references a charge in this line; keep older charges when needed for arrears. Seed obligations and allocations only, not computed receipt totals, outstanding, arrears, credit or statuses.",
    'Give each charge and each receipt its own snake_case reference. Charges and receipts use positive numbers, not currency text. Use style "outstanding" only to filter unpaid units.',
    'If asked to shorten numbers, set figures to "short". Leave density null unless the person asks for tighter rows, even when figures is "short".',
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "A local rent ledger uses messaging for reminders, and recording a payment never moves money.",
  variants: { density: ["comfortable", "compact"], figures: ["exact", "short"] },
  parts: ["root", "month", "assessed", "received", "outstanding", "arrears", "notice"],
  items: {
    key: "lines", visibleWhen: { visible: true },
    parts: [
      "root", "unit", "occupant", "due", "amount", "paid", "outstanding", "credit",
      "date", "method", "voided", "record", "remind", "void", "record_label", "remind_label", "void_label",
    ],
  },
  partTiers: { remind: "service" }, confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true, read: rentReading,
  actions: {
    items: { record: ["press"], remind: ["press"], void: ["press"] },
    when: {
      record: { kind: "charge" }, remind: { kind: "charge", unpaid: true },
      void: { kind: "receipt", voided: false },
    },
  },
} as const satisfies c.Meta;
// prettier-ignore
const charge = z.strictObject({
  chargeRef: ref, letRef: ref, unitRef: ref, unit: c.text(32), occupant: c.text(24),
  due: c.isoDate, amount: z.number().positive(),
});
// prettier-ignore
const receipt = z.strictObject({
  receiptRef: ref, chargeRef: ref, date: c.isoDate, amount: z.number().positive(),
  method: z.enum(["cash", "transfer", "card"]), voided: z.boolean().default(false),
});
// prettier-ignore
const schema = z.strictObject({
  ...c.variantProps(meta.variants), month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
  charges: z.array(charge).min(1).max(24), receipts: z.array(receipt).min(0).max(48),
  style: z.enum(["ledger", "outstanding"]).default("ledger"),
});
const validate = schema
  .refine(({ charges }) => distinct(charges, ({ chargeRef }) => chargeRef), { path: ["charges"] })
  .refine(validReceipts, { path: ["receipts"] });
function validReceipts({ charges, receipts }: z.output<typeof schema>) {
  const refs = new Set(charges.map(({ chargeRef }) => chargeRef));
  return (
    distinct(receipts, ({ receiptRef }) => receiptRef) &&
    receipts.every(({ chargeRef }) => refs.has(chargeRef))
  );
}
const withRows = (value: z.output<typeof schema>) => ({ ...value, ...ledgerRows(value, localToday()) });
export const props = validate.overwrite(withRows) as typeof schema &
  z.ZodType<ReturnType<typeof withRows>, z.input<typeof schema>>;
function localToday(now = new Date()) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index ? 2 : 4, "0"))
    .join("-");
}
// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    month: seedDate.slice(0, 7),
    charges: seedLabels(input).map(({ ref, title, short }) => ({
      chargeRef: `${ref}_charge`, letRef: `${ref}_let`, unitRef: ref,
      unit: title, occupant: short, due: seedDate, amount: 1,
    })),
    receipts: [],
  };
}
// prettier-ignore
const cedar = {
  month: "2026-10", style: "outstanding", figures: "short",
  charges: [{ chargeRef: "oct_cedar", letRef: "lee_let", unitRef: "flat_b", unit: "Cedar Flat", occupant: "Lee", due: "2026-10-01", amount: 11000 }],
  receipts: [{ receiptRef: "oct_cedar_one", chargeRef: "oct_cedar", date: "2026-10-02", amount: 500, method: "cash", voided: true }],
} as const satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  {
    month: "2026-11",
    charges: [{ chargeRef: "nov_willow", letRef: "asha_let", unitRef: "flat_a", unit: "Willow Flat", occupant: "Asha", due: "2026-11-01", amount: 900 }],
    receipts: [{ receiptRef: "nov_willow_one", chargeRef: "nov_willow", date: "2026-11-05", amount: 600, method: "transfer" }],
  },
  cedar, { ...cedar, density: "compact", figures: "exact" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("RentRoll");
// prettier-ignore
export const probes = [
  choose("Reconcile this month's rent across my flats with separate dated charges, partial receipts and older arrears"),
  choose("Show one amount, 900 per month, with no ledger, payments or balance", "Amount"),
  write("For 2026-11, charge nov_willow: Willow Flat (flat_a), Asha (asha_let), due 2026-11-01, amount 900. Allocate transfer receipt nov_willow_one for 600 on 2026-11-05 to it."),
  {
    ...write("For 2026-10, show charge oct_cedar of 11000 due 2026-10-01 for Lee (lee_let) in Cedar Flat (flat_b). No receipts. Abbreviate large figures rather than showing all digits."),
    variant: { axis: "figures", value: "short" },
  },
  read("Void the recorded 600 transfer for Willow Flat", { address: "r1/r2/void", action: "press" }),
] satisfies c.Probe[];

type RollProps = c.Props<typeof props, typeof meta>;
type Line = RollProps["lines"][number];
// prettier-ignore
type Finish = { density: c.ThemeDensity; copy: ReturnType<typeof rentCopy>; words: ReturnType<typeof propertyWordsFor>["rentRoll"]; loading: boolean };
// prettier-ignore
function Datum({ part, role, text, density, strike, tone }: {
  part: string | null; role: "title" | "body" | "caption" | "number"; text: string; density: c.ThemeDensity;
  strike?: boolean; tone?: kit.TextTone;
}) {
  return kit.useComponentState() === "loading" ?
    <kit.KitSkeleton shape="figure" inset="none" content={[[role, text, "start", "compact"]]} {...{ density }} /> :
    <kit.KitText {...{ part, role, density }} tone={tone ?? "text"} strike={Boolean(strike)} numberScale="compact" tabular={role === "number"}>{text}</kit.KitText>;
}
// prettier-ignore
function Metric({ part, label, value, density, focal = false }: { part: string; label: string; value: string; density: c.ThemeDensity; focal?: boolean }) {
  return <kit.KitContent {...{ density }}>
    <Datum part={null} role="caption" tone="muted" text={label} {...{ density }} />
    <Datum {...{ part, density }} role="number" tone={focal ? "accent" : "text"} text={value} />
  </kit.KitContent>;
}
// prettier-ignore
function RentAction({ loading, kind, label, part, goto }: { loading: boolean; kind: kit.ActionKind; label: string; part: string; goto?: string }) {
  return loading ? <kit.KitSkeleton shape="control" {...{ kind, label }} /> : <kit.KitAction {...{ kind, label, part, goto }} />;
}
// prettier-ignore
function ChargeRow({ line, density, copy, words, loading }: Finish & { line: Extract<Line, { kind: "charge" }> }) {
  const { due, fields } = copy.charge(line);
  return <kit.KitRow item={line.id} part={loading ? null : "root"} inline label={line.unit} {...{ density }}>
    <kit.KitContent {...{ density }}>
      <Datum part="unit" role="body" text={line.unit} {...{ density }} />
      <Datum part="occupant" role="body" tone="muted" text={line.occupant} {...{ density }} />
      <Datum part="due" role="caption" tone="muted" text={due} {...{ density }} />
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitGrid columns={3} {...{ density }}>{fields.map((field) => <Metric key={field.part} {...field} {...{ density }} />)}</kit.KitGrid>
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitGrid fitLast {...{ density }}>
          <RentAction part="record" label={words.record} goto={line.record.goto} kind="secondary" {...{ loading }} />
          {line.unpaid && <RentAction part="remind" label={words.remind} kind="quiet" {...{ loading }} />}
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitContent>
  </kit.KitRow>;
}
// prettier-ignore
function ReceiptRow({ line, density, copy, words, loading }: Finish & { line: Extract<Line, { kind: "receipt" }> }) {
  const { date, method, value } = copy.receipt(line);
  return <kit.KitRow item={line.id} part={loading ? null : "root"} inline label={line.unit} {...{ density }}>
    <kit.KitGrid fitLast {...{ density }}>
      <kit.KitContent {...{ density }}>
        <Datum part="unit" role="body" text={line.unit} {...{ density }} />
        <Datum part="amount" role="number" strike={line.voided} text={value} {...{ density }} />
        <Datum part="date" role="caption" tone="muted" text={date} {...{ density }} />
        <Datum part="method" role="caption" tone="muted" text={method} {...{ density }} />
      </kit.KitContent>
      {line.voided && !loading ? <kit.KitTrail part="voided" kind="badge" tone="muted" value={words.voided} {...{ density }} /> :
        <RentAction part="void" label={line.voided ? words.voided : words.void} kind="danger" {...{ loading }} />}
    </kit.KitGrid>
  </kit.KitRow>;
}
// prettier-ignore
export function RentRoll(input: RollProps) {
  const { totals, lines } = input;
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const figures = kit.useVariant("figures", meta.variants.figures, input.figures);
  const { lang, words: { rentRoll: words } } = kit.useWords(propertyWordsFor);
  const copy = rentCopy(figures, lang), groups = rentGroups(lines), finish = { density, copy, words, loading };
  return <kit.KitCard part="root" padded {...{ density }}>
    {state === "empty" ? <kit.KitEmpty part="notice" decorativeIcon /> :
      state === "success" ? <kit.KitEmpty part="notice" title={words.success} icon="check" tone="good" decorativeIcon /> :
      state === "error" ? <kit.KitEmpty part="notice" title={words.error} icon="alert" decorativeIcon /> :
      <>
        <Datum part="month" role="title" text={copy.month(totals.month)} {...{ density }} />
        <kit.KitGrid {...{ density }}>{copy.summary(totals).map((field) =>
          <Metric key={field.part} {...field} {...{ density }} focal={field.part === "outstanding"} />)}</kit.KitGrid>
        {!groups.length && !loading && <kit.KitEmpty part="notice" title={words.noCharges} decorativeIcon />}
        {groups.map(({ charge, receipts }) => <kit.KitContent key={charge.id} group="response" {...{ density }}>
          <ChargeRow line={charge} {...finish} />
          {receipts.length > 0 && <kit.KitContent group="response" {...{ density }}>
            <Datum part={null} role="caption" tone="muted" text={words.receipts} {...{ density }} />
            {receipts.map((line) => <ReceiptRow key={line.id} {...{ line }} {...finish} />)}
          </kit.KitContent>}
        </kit.KitContent>)}
      </>}
  </kit.KitCard>;
}
