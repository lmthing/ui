import { z } from "zod";
import {
  appointmentDate,
  isoDate,
  moneyLine,
  numberLine,
  percentLine,
  type DeviceData,
} from "../../../catalog";
import { paperworkWordsFor } from "../lang";
import { attachment } from "../seeds";
import { receiptCurrency } from "./Receipts";

type Period = { from: string; to: string };
type Requirement = { label: string; source: "documents" | "receipts"; tag: string; needed: number };
type TaxPeriod<R extends Requirement> = Period & { requirements: readonly R[] };
const record = z.object({
  period: z.object({ from: isoDate, to: isoDate }),
  source: z.enum(["documents", "receipts"]),
  tags: z.array(z.string()),
  file: attachment,
  date: isoDate.optional(),
  reviewed: z.boolean().optional(),
  amount: z.number().min(0).optional(),
  allocation: z.number().min(0).max(100).optional(),
});

function matchingRecord(value: unknown, period: Period) {
  const parsed = record.safeParse(value);
  if (!parsed.success) return;
  const row = parsed.data;
  if (row.period.from !== period.from || row.period.to !== period.to) return;
  if (
    row.source === "receipts" &&
    (!row.reviewed || !row.date || row.date < period.from || row.date > period.to)
  )
    return;
  return row;
}

export function taxEvidence<R extends Requirement>(period: TaxPeriod<R>, data?: DeviceData, lang?: string) {
  const words = paperworkWordsFor(lang).taxYear;
  const number = (count: number) => numberLine(count, lang);
  const records = (data?.paperwork_evidence ?? []).flatMap((value) => {
    const row = matchingRecord(value, period);
    return row ? [row] : [];
  });
  const receipts = new Map<string, z.output<typeof record>>();
  const rows = period.requirements.map((requirement) => {
    const matchedFiles = new Set<string>();
    for (const row of records) {
      if (row.source !== requirement.source || !row.tags.includes(requirement.tag)) continue;
      matchedFiles.add(row.file);
      if (row.source === "receipts" && !receipts.has(row.file)) receipts.set(row.file, row);
    }
    const matched = matchedFiles.size;
    const missing = Math.max(0, requirement.needed - matched);
    return {
      requirement,
      matched,
      missing,
      metaLine: words.sourceTag(words.source[requirement.source], requirement.tag),
      matchedLine: words.matched(number(matched)),
      neededLine: words.needed(number(requirement.needed)),
      missingLine: missing ? words.missing(number(missing)) : "",
    };
  });
  const met = rows.filter(({ missing }) => missing === 0).length;
  const receiptRows = [...receipts.values()];
  const receiptTotal = receiptRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const allocationTotal = receiptRows.reduce(
    (sum, row) => sum + (row.amount ?? 0) * ((row.allocation ?? 0) / 100),
    0,
  );
  return {
    rows,
    complete: rows.length > 0 && met === rows.length,
    hasEvidence: rows.some(({ matched }) => matched > 0),
    progress: percentLine(met, rows.length, lang),
    ratio: rows.length ? met / rows.length : 0,
    receiptTotal,
    allocationTotal,
  };
}

export function taxYearLines(
  period: Period & { due?: string | undefined; detail?: "full" | "brief" | undefined },
  evidence: Pick<ReturnType<typeof taxEvidence>, "receiptTotal" | "allocationTotal">,
  data?: DeviceData,
  lang?: string,
) {
  const words = paperworkWordsFor(lang).taxYear;
  const lines: { part: string; line: string; label?: string; number?: string }[] = [
    { part: "from", line: words.from(appointmentDate(period.from, lang)) },
    { part: "to", line: words.to(appointmentDate(period.to, lang)) },
  ];
  if (period.detail === "brief") return lines;
  if (period.due) lines.push({ part: "due", line: words.due(appointmentDate(period.due, lang)) });
  const money = (value: number) => moneyLine(value, receiptCurrency(data), undefined, lang);
  const receipt = money(evidence.receiptTotal),
    assigned = money(evidence.allocationTotal);
  lines.push({
    part: "receipt_total",
    line: words.receiptTotal(receipt),
    label: words.receipts,
    number: receipt,
  });
  lines.push({
    part: "allocation_total",
    line: words.allocationTotal(assigned),
    label: words.assigned,
    number: assigned,
  });
  return lines;
}
