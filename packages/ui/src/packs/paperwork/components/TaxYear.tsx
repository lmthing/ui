import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { taxEvidence, taxYearLines } from "../copy";
import { paperworkWordsFor } from "../lang";
import { seedDate, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-TaxYear.generated";

// Core first: Checklist/default ticks jobs but cannot match required evidence against files and reviewed receipts.
export const meta = {
  id: "TaxYear",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  // prettier-ignore
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "The device matches linked documents and reviewed receipts with usable files to period requirements; tax rules, filing and advice stay outside the app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["due", "receipt_total", "allocation_total"] } },
  parts: ["root", "label", "from", "to", "due", "receipt_total", "allocation_total", "empty", "success"],
  items: { key: "requirements", parts: ["root", "label", "meta", "matched", "needed", "missing"] },
  deviceData: ["paperwork_evidence", "currency"],
  // prettier-ignore
  previewDeviceData: ({ input, state }): c.DeviceData => {
    const { from, to, requirements } = input as z.output<typeof props>;
    if (state === "empty") return {};
    return { paperwork_evidence: requirements.flatMap(({ source, tag, needed }, index) =>
      Array.from({ length: state === "success" ? needed : index + 1 }, (_, n) => ({
        period: { from, to }, source, tags: [tag], file: `lib:preview_evidence_${index}_${n}`,
        date: from, reviewed: true, amount: 24.5, allocation: 50,
      })),
    ) };
  },
  states: ["filled", "empty", "loading", "success"],
  emptyActions: ["root.press"],
  successActions: ["root.press"],
  readSuccess: true,
  actions: { items: { root: ["press"] }, when: { root: { can_open: true } } },
  // prettier-ignore
  read: (input, state, lang, data): string[] => {
    const period = input as z.output<typeof props>;
    const words = paperworkWordsFor(lang).taxYear, evidence = taxEvidence(period, data, lang);
    if (state === "empty") return [words.empty];
    return [
      ...taxYearLines(period, evidence, data, lang).map(({ line }) => line),
      words.progress, evidence.progress,
      ...(evidence.complete ? [words.success] : !evidence.hasEvidence ? [words.empty] : []),
      ...evidence.rows.flatMap((row) => [row.metaLine, words.rowReading(row.requirement.label, row.matchedLine, row.neededLine, row.missingLine)]),
    ];
  },
} as const satisfies c.Meta;

// prettier-ignore
const requirement = z.strictObject({
  label: c.text(32),
  source: z.enum(["documents", "receipts"]),
  tag: c.text(16),
  needed: z.int().min(1).max(12),
  goto: c.screenId.optional(),
}).overwrite((row) => ({ ...row, can_open: Boolean(row.goto) }));

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), label: c.text(24), from: c.isoDate, to: c.isoDate,
  due: c.isoDate.optional(), requirements: z.array(requirement).min(1).max(8),
}).refine(({ from, to }) => from <= to, { path: ["to"], message: "End date must be on or after start date" });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const rows = seedRows(input, 32, 16);
  return {
    label: c.clip(rows[0]!.title, 24),
    from: seedDate,
    to: seedDate,
    requirements: rows.map(({ title, detail }) => ({
      label: title,
      source: "documents",
      tag: detail,
      needed: 1,
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    label: "Ledge archive 2026",
    from: "2026-01-01", to: "2026-12-31", due: "2027-02-15",
    requirements: [
      { label: "Greenhouse permits", source: "documents", tag: "permits", needed: 1, goto: "permits" },
      { label: "Pot purchase proof", source: "receipts", tag: "pots", needed: 3, goto: "pots" },
    ],
  },
  {
    label: "Trot tax evidence",
    from: "2026-04-06", to: "2027-04-05",
    requirements: [
      { label: "Account statements", source: "documents", tag: "statements", needed: 12, goto: "vault" },
      { label: "Expense evidence", source: "receipts", tag: "expenses", needed: 6, goto: "tax_receipts" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TaxYear");
// prettier-ignore
export const probes = [
  choose("For my filing period, match the attached documents and reviewed receipts I've collected to each required category and tell me which evidence is missing."),
  choose("Give me independent tasks I can tick by hand: tidy the folder, call the accountant, and make a backup. No matches or files.", "Checklist"),
  write("Call this Ledge archive 2026, from 2026-01-01 to 2026-12-31. Require one Greenhouse permits document tagged permits and three Pot purchase proof receipts tagged pots."),
  {
    ...write("For Ledge archive 2026, from 2026-01-01 to 2026-12-31, require one document tagged permits. Hide the deadline and receipt totals; keep the date range and evidence categories."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the evidence for Pot purchase proof.", { address: "t1/r2", action: "press" }),
] satisfies c.Probe[];

type TaxYearProps = c.Props<typeof props, typeof meta>;
type EvidenceRow = ReturnType<typeof taxEvidence<TaxYearProps["requirements"][number]>>["rows"][number];
// prettier-ignore
function TaxCategory({ row, density, loading }: { row: EvidenceRow; density: c.ThemeDensity; loading: boolean }) {
  const { requirement, matchedLine, neededLine, missingLine } = row;
  return <kit.KitRow {...(!loading ? { item: requirement.id, goto: requirement.goto } : {})}
    part={loading ? null : "root"} label={loading ? "" : requirement.label} density={density}
    trailing={requirement.goto ? loading ? <kit.KitSkeleton shape="figure" lead="dot" inset="none" content={[]} />
      : <kit.KitContent lead={<kit.KitIcon name="chevron_right" tone="muted" decorative />} children={null} /> : undefined}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
      content={[["body", requirement.label], ["caption", row.metaLine], ["caption", neededLine],
        ["caption", missingLine]]} /> : <>
      <kit.KitText part="label" density={density}>{requirement.label}</kit.KitText>
      <kit.KitText part="meta" role="caption" tone="muted">{row.metaLine}</kit.KitText>
      <kit.KitContent density={density}>
        <kit.KitText part={null} role="caption" tone="muted">
          <kit.KitText part="matched" role="caption" tone="muted">{matchedLine}</kit.KitText>
          <kit.KitText part="needed" role="caption" tone="muted">{neededLine}</kit.KitText>
        </kit.KitText>
        {row.missing > 0 && <kit.KitText part="missing" role="caption" tone="warn">{missingLine}</kit.KitText>}
      </kit.KitContent>
    </>}
  </kit.KitRow>;
}
// prettier-ignore
function TaxSummary({ input, evidence, data, density, loading, lang }: {
  input: TaxYearProps; evidence: ReturnType<typeof taxEvidence>; data: c.DeviceData;
  density: c.ThemeDensity; loading: boolean; lang: string;
}) {
  const { taxYear: words } = paperworkWordsFor(lang);
  const lines = taxYearLines(input, evidence, data, lang);
  const heading = density === "compact" ? "title" : "heading";
  const dates = lines.filter(({ number }) => number === undefined), totals = lines.filter(({ number }) => number !== undefined);
  return <kit.KitRow part={null} label="" lineRole={heading} {...{ density }}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} emphasis="hero"
      content={[[heading, input.label], ...dates.map(({ line }): ["caption", string] => ["caption", line])]} /> : <>
      <kit.KitText part="label" role={heading} emphasis="hero" {...{ density }}>{input.label}</kit.KitText>
      {dates.map(({ part, line }) => <kit.KitText key={part} {...{ part }} role="caption" tone="muted">{line}</kit.KitText>)}
    </>}
    {totals.length > 0 && <kit.KitContent group="response" density={density}>
      <kit.KitGrid density={density}>{totals.map(({ part, label, number }) => loading ?
        <kit.KitSkeleton key={part} shape="figure" inset="none" density={density}
          content={[["caption", label], ["number", number, "start", "compact"]]} /> :
        <kit.KitContent key={part} density={density}>
          <kit.KitText part={null} role="caption" tone="muted">{label}</kit.KitText>
          <kit.KitText part={part} role="number" numberScale="compact" tabular>{number}</kit.KitText>
        </kit.KitContent>)}</kit.KitGrid>
    </kit.KitContent>}
    {!loading && evidence.complete && <kit.KitText part="success" role="label" tone="good">{words.success}</kit.KitText>}
  </kit.KitRow>;
}

// prettier-ignore
export function TaxYear(input: TaxYearProps) {
  const density = kit.useKit().density;
  const state = kit.useComponentState(), { lang, words: { taxYear: words } } = kit.useWords(paperworkWordsFor);
  const data = kit.useDeviceData(), evidence = taxEvidence(input, data, lang);
  const loading = state === "loading", complete = evidence.complete;
  return <kit.KitCard surface={"card"} density={density}>
    <TaxSummary {...{ input, evidence, data, density, loading, lang }} />
    {!loading && !evidence.hasEvidence && <kit.KitEmpty part="empty" icon="file_text" decorativeIcon title={words.empty} />}
    <kit.KitRow part={null} label="" {...{ density }}>
      {loading && <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.progress]]} />}
      <kit.KitMeter label={loading ? "" : words.progress} amount={loading ? "" : evidence.progress}
        ratio={loading ? 0 : evidence.ratio} tone={complete ? "good" : "accent"} slim addressed={false} />
    </kit.KitRow>
    <kit.KitGrid list arrange="rows" density={density}>
      {evidence.rows.map((row) => <TaxCategory key={row.requirement.id} {...{ row, density, loading }} />)}
    </kit.KitGrid>
  </kit.KitCard>;
}
