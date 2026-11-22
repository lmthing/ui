import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { autopayLabel, rentCopy, rentGroups, rentReading } from "../copy";
import { propertyWordsFor } from "../lang";
import { ledgerRows } from "../ledger";
import { distinct, ref, seedDate, seedLabels } from "../seeds";
import * as rent from "./rent-roll-rows";
import { prompt } from "../../../entry/prompt-RentRoll.generated";
// Core first: Amount/total cannot reconcile rent charges and allocated receipts across units or periods.
// prettier-ignore
export const meta = {
  id: "RentRoll", status: "ready", group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Recording a receipt never moves money. The host scopes the tenant ledger to the signed-in resident; reminders and tenant payments need outside services.",
  variants: { figures: ["exact", "short"] },
  parts: ["root", "month", "assessed", "received", "outstanding", "arrears", "notice", "tenant", "autopay"],
  items: {
    key: "lines", visibleWhen: { visible: true },
    parts: [
      "root", "unit", "occupant", "due", "amount", "paid", "outstanding", "credit",
      "date", "method", "voided", "record", "remind", "void", "record_label", "remind_label", "void_label", "pay",
    ],
  },
  partTiers: { remind: "service", pay: "service" }, confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true, read: rentReading,
  actions: {
    items: { record: ["press"], remind: ["press"], void: ["press"], pay: ["press"] },
    when: {
      record: { kind: "charge", landlord: true }, remind: { kind: "charge", unpaid: true, landlord: true },
      void: { kind: "receipt", voided: false, landlord: true },
      pay: { kind: "charge", unpaid: true, landlord: false },
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
  style: z.enum(["ledger", "outstanding", "tenant"]).default("ledger"),
  tenantLetRef: ref.meta({ kind: "ref" }).optional(), autopay: z.boolean().optional(),
});
const validate = schema
  .refine(({ charges }) => distinct(charges, ({ chargeRef }) => chargeRef), { path: ["charges"] })
  .refine(validReceipts, { path: ["receipts"] })
  .refine(
    ({ style, tenantLetRef, charges, autopay }) =>
      style === "tenant"
        ? tenantLetRef !== undefined && charges.every((row) => row.letRef === tenantLetRef)
        : tenantLetRef === undefined && autopay === undefined,
    { path: ["tenantLetRef"] },
  );
function validReceipts({ charges, receipts }: z.output<typeof schema>) {
  const refs = new Set(charges.map(({ chargeRef }) => chargeRef));
  return (
    distinct(receipts, ({ receiptRef }) => receiptRef) &&
    receipts.every(({ chargeRef }) => refs.has(chargeRef))
  );
}
const withRows = (value: z.output<typeof schema>) => ({
  ...value,
  ...ledgerRows({ ...value, style: value.style === "tenant" ? "ledger" : value.style }, localToday()),
  landlord: value.style !== "tenant",
});
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
  cedar, { ...cedar, figures: "exact" },
  { ...cedar, style: "tenant", tenantLetRef: "lee_let", autopay: false, figures: "exact",
    charges: [{ ...cedar.charges[0], amount: 1100 }],
    receipts: [{ ...cedar.receipts[0], voided: false }] },
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
  { ...write("Show Asha the signed-in resident's own November 2026 rent ledger, with autopay on. Tenancy asha_let, Willow Flat (flat_a), charge nov_willow for 900 due 2026-11-01. Include her 600 transfer receipt willow_part dated 2026-11-05 toward that charge so she can pay the rest."),
    expectProps: { style: "tenant", tenantLetRef: "asha_let", autopay: true } },
] satisfies c.Probe[];

type RollProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
export function RentRoll(input: RollProps) {
  const { totals, lines } = input;
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useKit().density;
  const figures = kit.useVariant("figures", meta.variants.figures, input.figures);
  const { lang, words: { rentRoll: words } } = kit.useWords(propertyWordsFor);
  const tenant = input.style === "tenant", autopay = tenant ? autopayLabel(input.autopay, lang) : undefined;
  const copy = rentCopy(figures, lang), groups = rentGroups(lines), finish = { density, copy, words, loading, tenant };
  const content = <>
    {tenant ? <kit.KitRow part={null} inline inset="none" label={words.tenant} {...{ density }} trailing={
      autopay && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", autopay]]} /> :
        <kit.KitTrail part="autopay" kind="badge" value={autopay} tone={input.autopay ? "good" : "muted"} {...{ density }} />)
    }><kit.KitHeader title={{ text: words.tenant, part: "tenant" }}
      meta={{ text: copy.month(totals.month), part: "month" }} {...{ density }} /></kit.KitRow> :
      <kit.KitHeader title={{ text: copy.month(totals.month), part: "month" }} />}
    <kit.KitGrid {...{ density }}>{copy.summary(totals).map((field) =>
      <rent.Metric key={field.part} {...field} {...{ density }} focal={field.part === "outstanding"} />)}</kit.KitGrid>
    {!groups.length && !loading && <kit.KitEmpty part="notice" title={words.noCharges} decorativeIcon />}
    {groups.map(({ charge, receipts }) => <kit.KitContent key={charge.id} group="response" {...{ density }}>
      <rent.ChargeRow line={charge} {...finish} />
      {receipts.length > 0 && <kit.KitContent group="response" rhythm="flush" {...{ density }}>
        <rent.Datum part={null} role="caption" tone="muted" text={words.receipts} {...{ density }} />
        <kit.KitRowGroup separators={tenant} spacing="groups" {...{ density }}>
          {receipts.map((line) => <rent.ReceiptRow key={line.id} {...{ line }} {...finish} />)}
        </kit.KitRowGroup>
      </kit.KitContent>}
    </kit.KitContent>)}
  </>;
  return <kit.KitCard part="root" padded {...{ density }}>
    <kit.KitState part="notice" loading={content}
      message={state === "success" ? tenant ? words.paymentReceived : words.success : state === "error" ? words.error : undefined} {...{ density }}>{content}</kit.KitState>
  </kit.KitCard>;
}
