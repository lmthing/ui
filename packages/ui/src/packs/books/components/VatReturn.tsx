import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  previewVat,
  validVatSnapshot,
  vatBox,
  vatDisplay,
  vatPeriod,
  vatRead,
  vatRows,
  type VatBox,
} from "../copy";
import { booksWordsFor } from "../lang";
import { periodFields, ref, seedPeriod, validPeriod } from "../seeds";
import { prompt } from "../../../entry/prompt-VatReturn.generated";

// Core first: KeyValue/rows cannot map VAT boxes to reconciled evidence or save a reviewed period.
export const meta = {
  id: "VatReturn",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A versioned VAT rule computes the local preview; saving never files or pays a return.",
  parts: ["root", "from", "to", "save", "save_label", "result"],
  items: {
    key: "boxes",
    parts: ["root", "number", "label", "value", "sources", "exclusions"],
    deviceData: { rows: vatRows, schema: vatBox },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { save: ["press"] },
    items: { root: ["press"] },
    when: { "root.press": { linked: true }, "save.press": { validSnapshot: true } },
  },
  readSuccess: true,
  successActions: ["root.press"],
  read: vatRead,
  deviceData: ["books_vat_snapshots"],
  deviceDataFlags: { validSnapshot: validVatSnapshot },
  previewDeviceData: previewVat,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...periodFields,
    schemeRef: ref.meta({ kind: "ref" }),
    ledgerGoto: c.screenId.optional(),
    style: z.enum(["boxes", "reconcile"]).default("boxes"),
  })
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" });

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { ...seedPeriod, schemeRef: "item_1" };
}

export const examples = [
  { from: "2026-10-01", to: "2026-12-31", schemeRef: "domestic_cash", ledgerGoto: "care_ledger" },
  {
    from: "2026-07-01",
    to: "2026-09-30",
    schemeRef: "domestic_cash",
    ledgerGoto: "walk_ledger",
    style: "reconcile",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("VatReturn");
export const probes = [
  choose(
    "Preview the quarter's nine numbered VAT boxes, with output tax, recoverable input VAT and the difference due. Save the reviewed snapshot locally.",
  ),
  choose(
    "Show labelled facts about one purchase: its supplier, receipt number and purchase date. No tax period or calculations.",
    "KeyValue",
  ),
  write(
    "Preview the domestic_cash VAT scheme from October 1 through December 31, 2026. Link contributing lines to care_ledger. Use the numbered boxes, not the reconciliation view.",
  ),
  write(
    "Trace which sources and exclusions contribute to each domestic_cash VAT box, July 1 to September 30, 2026. Open contributing lines in walk_ledger.",
  ),
  read("Save a reviewed local VAT snapshot.", { address: "v1/save", action: "press" }),
  read("Open the contributing ledger lines for VAT on sales, box 1.", { address: "v1/r1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Display = NonNullable<ReturnType<typeof vatDisplay>>;
type Density = c.ThemeDensity;
type Row = VatBox & { id: string };

// prettier-ignore
function VatLine({ row, display, density }: { row: Row; display: Display; density: Density }) {
  const { rank, label, value, sources, exclusions } = display.box(row);
  return <kit.KitRow item={row.id} {...{ density, label }} goto={row.goto}
    leading={<kit.KitText part="number" role="label" tone="muted" tabular>{rank}</kit.KitText>}>
    <kit.KitContent density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitText part="label" role="body" tone={row.goto ? "accent" : "text"}>{label}</kit.KitText>
        <kit.KitText part="value" role="number" numberScale="compact" tabular>{value}</kit.KitText>
      </kit.KitGrid>
      {sources && <kit.KitText part="sources" role="label" tone="muted">{sources}</kit.KitText>}
      {exclusions && <kit.KitText part="exclusions" role="label" tone="muted">{exclusions}</kit.KitText>}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function VatLoading({ density, display, dates, boxes }: {
  density: Density; display: Display | undefined; dates: ReturnType<typeof vatPeriod>; boxes: Row[];
}) {
  const { lang, words: { vatReturn: w } } = kit.useWords(booksWordsFor);
  const fallbackMoney = c.moneyLine(0, c.defaultCurrency, undefined, lang);
  return <>
    <kit.KitContent density={density}>
      <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[[ "label", w.heading ]]} />
      <kit.KitGrid fitLast density={density}>
        <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[[ "label", dates.from ]]} />
        <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[[ "label", dates.to ]]} />
      </kit.KitGrid>
    </kit.KitContent>
    <kit.KitContent group="response" density={density}>
      <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
        content={[[ "label", display?.totalLabel ?? w.payable ], [ "number", display?.total ?? fallbackMoney ]]} />
    </kit.KitContent>
    {w.boxes.map((label, i) => {
      const box = boxes[i], rank = c.numberLine(i + 1, lang), line = box && display?.box(box);
      return <kit.KitRow key={label} part={null} {...{ density, label }}
        leading={<kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[[ "label", rank ]]} />}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
            content={[[ "body", label ], [ "label", line?.sources ], [ "label", line?.exclusions ]]} />
          <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
            content={[[ "number", line?.value ?? fallbackMoney, "end", "compact" ]]} />
        </kit.KitGrid>
      </kit.KitRow>;
    })}
    <kit.KitSkeleton shape="control" label={w.save} full density={density} />
  </>;
}

// prettier-ignore
export function VatReturn(input: View) {
  const density = kit.useKit().density;
  const surface = "card";
  const state = kit.useComponentState(), data = kit.useDeviceData();
  const { lang, words: { vatReturn: w } } = kit.useWords(booksWordsFor);
  const { boxes = [], validSnapshot } = kit.useLiveControls(meta, input) as { boxes?: Row[]; validSnapshot?: boolean };
  const display = vatDisplay(input, data, lang), dates = vatPeriod(input, lang);
  const saved = state === "success" || display?.saved;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "loading" ? <VatLoading {...{ density, display, dates, boxes }} /> :
      state === "empty" ? <kit.KitEmpty decorativeIcon /> :
      state === "error" || !display ? <kit.KitEmpty decorativeIcon icon="file_text" title={w.errorTitle} sub={w.errorDetail} /> : <>
        <kit.KitContent density={density}>
          <kit.KitText part={null} role="label" tone="muted">{w.heading}</kit.KitText>
          <kit.KitGrid fitLast density={density}>
            <kit.KitText part="from" role="label">{dates.from}</kit.KitText>
            <kit.KitText part="to" role="label">{dates.to}</kit.KitText>
          </kit.KitGrid>
        </kit.KitContent>
        <kit.KitContent group="response" density={density}>
          <kit.KitText part={null} role="label" tone="muted">{display.totalLabel}</kit.KitText>
          <kit.KitText part="result" role="number" tabular>{display.total}</kit.KitText>
        </kit.KitContent>
        <kit.KitGrid arrange="rows" list density={density}>
          {boxes.map((row) => <VatLine key={row.id} {...{ row, display, density }} />)}
        </kit.KitGrid>
        {saved ? <kit.KitContent density={density}>
          <kit.KitText part={null} role="body" tone="good">{w.saved}</kit.KitText>
          <kit.KitText part={null} role="label" tone="muted">{w.local}</kit.KitText>
        </kit.KitContent> : validSnapshot && <kit.KitAction part="save" label={w.save} full />}
      </>}
  </kit.KitCard>;
}
