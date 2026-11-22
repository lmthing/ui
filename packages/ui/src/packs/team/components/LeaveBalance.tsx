import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { leaveBalanceFigures, leaveBalanceReading } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Progress/bars tracks amounts against targets, not PTO accrual, usage, pending requests and available balances.
export const meta = {
  id: "LeaveBalance",
  status: "ready",
  group: "data",
  tier: "people",
  pick: "Employee PTO balances by leave type: accrued, used, pending and available leave. Not manager decisions (Approval), generic progress toward a target (Progress), or weekly shift hours (Timesheet).",
  purpose: "See how much paid time off is available across leave types.",
  region: "body",
  weight: 2,
  realPath: "accrued and pending PTO balances synced from a shared HR or workplace scheduling host.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["accrued", "used", "pending", "expires"] } },
  writeHints: [
    'When asked for only leave types and available balances, set detail to "brief"; still supply the accrued, used and pending inputs. Leave unrequested variant axes null.',
  ],
  parts: ["root", "title", "employee", "message", "request"],
  items: {
    key: "balances",
    parts: ["root", "type", "available", "accrued", "used", "pending", "expires"],
  },
  actions: { parts: { request: ["press"] }, items: { root: ["press"] } },
  states: ["filled", "empty", "loading"],
  read: (input, state, lang): string[] =>
    state === "filled" ? leaveBalanceReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    employee: text(24).optional(),
    unit: z.enum(["hours", "days"]).default("hours"),
    balances: z
      .array(
        z.strictObject({
          label: text(20),
          accrued: z.number().min(0),
          used: z.number().min(0),
          pending: z.number().min(0),
          cap: z.number().gt(0).optional(),
          expiresOn: isoDate.optional(),
          goto: screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
  })
  .overwrite((input) => ({
    ...input,
    balances: input.balances.map((row) => ({ ...row, root: row.goto })),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    balances: Array.from({ length: 1 }, (_, index) => ({
      label: castTitle(20, index),
      accrued: 0,
      used: 0,
      pending: 0,
    })),
  };
}

export const examples = [
  {
    employee: "Rae",
    balances: [
      {
        label: "Vacation",
        accrued: 80,
        used: 24,
        pending: 8,
        cap: 100,
        expiresOn: "2026-12-31",
        goto: "vacation",
      },
      { label: "Sick leave", accrued: 40, used: 8, pending: 0 },
    ],
  },
  {
    employee: "Sam",
    unit: "days",
    balances: [
      { label: "Vacation", accrued: 18, used: 6, pending: 2 },
      { label: "Personal time", accrued: 3, used: 1, pending: 0 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("LeaveBalance");
export const probes = [
  choose(
    "Show the paid time off I can still use, with hours accrued, taken and pending for vacation and sick leave.",
  ),
  choose("Show a horizontal progress bar for 3 of the 5 plants I wanted to water today.", "Progress"),
  write(
    "Show Rae's PTO in hours: Vacation accrued 80, used 24, pending 8, cap 100; Sick leave accrued 40, used 8, pending 0.",
  ),
  {
    ...write(
      "Show Sam's vacation PTO in days: 18 accrued, 6 used, 2 pending. Display only the leave type and available balance; hide the breakdown and meter.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Press Request time off to start a new request, without opening a balance row.", {
    address: "l1/request",
    action: "press",
  }),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;
type Balance = ViewProps["balances"][number];

// prettier-ignore
function BalanceBreakdown({ figures, density }: {
  figures: ReturnType<typeof leaveBalanceFigures>; density: ViewProps["density"];
}) {
  const { words: { leaveBalance: words } } = kit.useWords(teamWordsFor);
  const { lines, cap, expires } = figures;
  const metrics = [
    { id: "accrued", label: words.accrualLabel(cap), amount: lines.accrued },
    { id: "used", label: words.used, amount: lines.used },
    { id: "pending", label: words.pending, amount: lines.pending },
  ];
  return (
    <kit.KitContent density={density}>
      {metrics.map(({ id, label, amount }) => <kit.KitGrid key={id} fitLast density={density}>
        <kit.KitLayoutText line={{ text: label, role: "meta", tone: "muted" }} density={density} />
        <kit.KitLayoutText line={{ text: amount, part: id, role: "meta", tone: "muted", tabular: true }} align="end" density={density} />
      </kit.KitGrid>)}
      <kit.KitLayoutText line={{ text: expires, part: "expires", role: "meta", tone: "muted" }} density={density} />
    </kit.KitContent>
  );
}

// prettier-ignore
function BalanceRow({ row, unit, detail, density }: {
  row: Balance; unit: ViewProps["unit"]; detail: ViewProps["detail"]; density: ViewProps["density"];
}) {
  const { lang, words } = kit.useWords(teamWordsFor);
  const loading = kit.useComponentState() === "loading";
  const figures = leaveBalanceFigures(row, unit, lang);
  const full = detail === "full";
  return (
    <kit.KitRow item={row.id} part={loading ? null : "root"} label={row.label} inline
      goto={loading ? undefined : row.goto} inset="none" density={density}>
      <kit.KitContent density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitMetaLine title={{ text: row.label, part: "type", role: "body" }}
            meta={full ? { text: words.leaveBalance.remaining(figures.lines.accrued) } : undefined} density={density} />
          <kit.KitLayoutText line={{ text: figures.available, part: "available", role: "figure", tabular: true }} align="end" density={density} />
        </kit.KitGrid>
        {full && <>
          <kit.KitMeter label="" amount="" ratio={loading ? 0 : figures.ratio} addressed={false} slim />
          <BalanceBreakdown {...{ figures, density }} />
        </>}
      </kit.KitContent>
    </kit.KitRow>
  );
}

// prettier-ignore
export function LeaveBalance(input: ViewProps) {
  const { words: { leaveBalance: words } } = kit.useWords(teamWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const content = (
    <>
      <kit.KitHeader title={{ text: words.title, part: "title", role: "body" }} meta={{ text: input.employee, part: "employee" }} density={density} />
      <kit.KitRowGroup density={density} spacing="groups" separators={false}>
        {input.balances.map((row) => <BalanceRow key={row.id} row={row} unit={input.unit} {...{ detail, density }} />)}
      </kit.KitRowGroup>
      <kit.KitActionFooter density={density}>
        <kit.KitAction part="request" label={words.request} contentParts={{}} kind="secondary" />
      </kit.KitActionFooter>
    </>
  );
  return (
    <kit.KitCard part="root" style="inset" padded {...{ density, surface }}>
      <kit.KitState message={words.empty} icon="calendar_days" part="message" density={density} loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
