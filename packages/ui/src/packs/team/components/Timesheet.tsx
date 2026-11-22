import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { timesheetReading, timesheetRow } from "../copy";
import { teamWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Timesheet.generated";

// Core first: Bars/columns charts quantities but cannot show hours by person and day or approve a row.
export const meta = {
  id: "Timesheet",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Clocked hours are collected in a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["hours"] } },
  parts: ["root", "period", "matrix", "empty"],
  items: {
    key: "rows",
    parts: ["root", "name", "hours", "total", "overtime", "approved", "approve", "approve_label"],
  },
  states: ["filled", "empty"],
  actions: { items: { approve: ["press"] }, when: { approve: { approved: false } } },
  read: timesheetReading,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  period: c.text(20),
  rows: z
    .array(
      z.strictObject({
        name: c.text(20),
        hours: z.array(z.number().min(0).max(24)).min(7).max(7),
        approved: z.boolean(),
      }),
    )
    .min(1)
    .max(8),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 8);
  const names = items.flatMap((item) => c.titleOf(item, 20, thing) ?? []);
  const period = items.flatMap((item) => c.detailOf(item, 20, thing) ?? [])[0];
  return {
    period: period ?? c.clip(c.wordsFor(lang).placeholderDetail, 20),
    rows: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      hours: [0, 0, 0, 0, 0, 0, 0],
      approved: false,
    })),
  };
}

export const examples = [
  {
    period: "16–22 Nov 2026",
    rows: [
      { name: "Anna", hours: [8, 8, 8, 8, 7.5, 4, 0], approved: false },
      { name: "Rae", hours: [5, 0, 5, 0, 5, 0, 0], approved: true },
    ],
  },
  {
    period: "23–29 Nov 2026",
    rows: [
      { name: "Sam", hours: [6, 4.5, 0, 6, 4, 3, 0], approved: false },
      { name: "Jules", hours: [8, 8, 8, 8, 8, 2, 0], approved: true },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Timesheet");
export const probes = [
  choose(
    "Review each worker's actual hours for each of seven days, with weekly totals and an approval button on each person's row.",
  ),
  choose(
    "Draw a simple bar chart of total hours by weekday, with no people, employee records or approval controls.",
    "Bars",
  ),
  write(
    "Review hours for 16–22 Nov 2026: Anna worked 8, 8, 8, 8, 7.5, 4, 0 hours Monday through Sunday, pending approval. Rae worked 5, 0, 5, 0, 5, 0, 0 and is approved.",
  ),
  {
    ...write(
      "Show just the weekly total, overtime and approval for Anna for 16–22 Nov 2026. Keep all seven daily hours on record but hide the daily breakdown. Her Monday-to-Sunday hours were 8, 8, 8, 8, 7.5, 4, 0, not yet approved. Leave spacing and the card treatment up to the app.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Approve Anna's hours for the week", { address: "t1/r1/approve", action: "press" }),
] satisfies c.Probe[];
type ViewProps = c.Props<typeof props, typeof meta>;
type SheetRow = ViewProps["rows"][number] & ReturnType<typeof timesheetRow>;
type MatrixProps = Pick<ViewProps, "rows"> & { brief: boolean; density: c.ThemeDensity };
function SheetMatrix({ rows, brief, density }: MatrixProps) {
  type TableRow = Parameters<typeof kit.KitTable>[0]["rows"][number];
  type CellText = Parameters<typeof kit.KitText>[0];
  const {
    words: { timesheet: wording },
    lang,
  } = kit.useWords(teamWordsFor);
  const context = kit.usePartContext();
  const people = rows.map((row) => ({ ...row, ...timesheetRow(row.hours, lang) }));
  const columns = SheetColumns(people, context);
  const text = (props: CellText) => <kit.KitText density={density} {...props} />;
  const label = (children: string) => text({ children, part: null, tone: "muted", role: "label" });
  const value = (children: string, part: string | null, tone: CellText["tone"] = "text") =>
    text({ children, part, tone, align: "center", role: "number", numberScale: "compact", tabular: true });
  const line = (id: string, title: string, draw: (row: SheetRow) => CellText["children"]): TableRow => ({
    id,
    label: title,
    heading: label(title),
    cells: people.map((row) => ({
      id: row.id,
      content: (
        <kit.PartContext.Provider value={{ ...context, item: row.id }}>{draw(row)}</kit.PartContext.Provider>
      ),
    })),
  });
  const weekdays = c.wordsFor(lang).weekdayShort;
  const days = brief
    ? []
    : weekdays.map((day, index) =>
        line(`day_${index}`, day, (row) =>
          text({
            children: row.days[index],
            part: index === 0 ? "hours" : null,
            align: "center",
            tabular: true,
            tone: row.hours[index] ? "text" : "muted",
          }),
        ),
      );
  const total = line("total", wording.total, (row) => value(row.total, "total"));
  const overtime = line("overtime", wording.overtime, (row) =>
    value(row.overtime ?? wording.noOvertime, "overtime", row.overtime ? "warn" : "muted"),
  );
  const approval = line("approval", wording.approval, (row) =>
    row.approved ? (
      <kit.KitTrail part="approved" kind="badge" tone="good" value={wording.approved} />
    ) : (
      <kit.KitAction part="approve" label={wording.approve} kind="secondary" full />
    ),
  );
  // Use the table directly: the days-down sheet has three separately labelled summary rows.
  // prettier-ignore
  return <kit.KitTable part="matrix" columns={columns} rows={[...days, total, overtime, approval]}
    separators={brief ? [] : ["day_6"]} corner={label(wording.hours)} fitColumns={people.length <= 2} />;
}

function SheetColumns(people: SheetRow[], context: ReturnType<typeof kit.usePartContext>) {
  return people.map((row) => ({
    id: row.id,
    label: row.name,
    header: (
      <kit.PartContext.Provider value={{ ...context, item: row.id }}>
        <kit.KitText part="root" align="center">
          <kit.KitText part="name">{row.name}</kit.KitText>
        </kit.KitText>
      </kit.PartContext.Provider>
    ),
  }));
}

export function Timesheet(input: ViewProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitCard padded {...{ density, surface }}>
      {state === "empty" ? (
        <kit.KitEmpty part="empty" icon="calendar_days" decorativeIcon />
      ) : (
        <kit.KitContent density={density}>
          <kit.KitCard part="period" style="inset" surface="plain" padded={input.rows.length > 2}>
            <kit.KitText role="heading" part={null} density="comfortable">
              {input.period}
            </kit.KitText>
          </kit.KitCard>
          <SheetMatrix rows={input.rows} brief={detail === "brief"} density={density} />
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
