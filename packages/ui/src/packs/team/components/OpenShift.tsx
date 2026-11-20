import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { openShiftLines, openShiftReading } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Checklist/check marks a job done, not a claim to cover an unassigned shift.
export const meta = {
  id: "OpenShift",
  status: "ready",
  group: "action",
  purpose: "Pick up an unassigned shift and see when it runs and what it pays.",
  pick: "Claim one of several unassigned work shifts with a date, time range, role and optional pay. Not an assigned shift (Shift) or a list of jobs to tick off (Checklist).",
  writeHints: [
    'Keep pay as an optional numeric amount without a currency. Use detail "brief" only when asked to hide pay, and retain any supplied pay in the data. Leave density and surface null unless requested.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A manager approves claims for open shifts in a shared rota.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["pay"] } },
  parts: ["root", "message"],
  items: { key: "shifts", parts: ["root", "date", "from", "to", "role", "pay", "claim", "claim_label"] },
  states: ["filled", "empty", "success"],
  actions: { items: { claim: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? openShiftReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  shifts: z
    .array(
      z.strictObject({
        date: c.isoDate,
        from: c.clock,
        to: c.clock,
        role: c.text(16),
        pay: z.number().min(0).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const roles = c.itemsOf(cast, 6).flatMap((item) => c.titleOf(item, 16, thing) ?? []);
  return {
    shifts: (roles.length ? roles : [c.placeholderTitle(0, lang)]).map((role) => ({
      date: "2026-11-21",
      from: "09:00",
      to: "12:00",
      role,
    })),
  };
}

export const examples = [
  {
    shifts: [
      { date: "2026-11-21", from: "07:00", to: "11:00", role: "Plant care", pay: 64 },
      { date: "2026-11-22", from: "13:00", to: "17:00", role: "Potting bench" },
    ],
  },
  {
    shifts: [{ date: "2026-11-21", from: "08:00", to: "13:00", role: "Park walks", pay: 80 }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("OpenShift");
export const probes = [
  choose("Show the unassigned work shifts, their hours and pay, with a button to claim each shift."),
  choose(
    "Give me a list of separate jobs to tick as done, such as watering and washing the trays.",
    "Checklist",
  ),
  write(
    "Offer two unassigned shifts staff can claim: Potting bench on 2026-11-21 from 07:00 to 11:00 for 64, and Plant care on 2026-11-22 from 13:00 to 17:00.",
  ),
  {
    ...write(
      "Offer an unassigned Park walks shift on 2026-11-21 from 08:00 to 13:00. Save its pay of 80 in the data but hide the amount on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Claim the Potting bench shift", { address: "o1/r2/claim", action: "press" }),
] satisfies c.Probe[];

type OpenShiftProps = c.Props<typeof props, typeof meta>;
type ShiftRowProps = Pick<OpenShiftProps, "detail"> & {
  row: OpenShiftProps["shifts"][number];
  density: c.ThemeDensity;
};

function OpenShiftRow({ row, detail, density }: ShiftRowProps) {
  const { lang, words } = kit.useWords(teamWordsFor);
  const { date, from, to, pay, timeSeparator, detailSeparator } = openShiftLines(row, detail, lang);
  return (
    <kit.KitRow item={row.id} part="root" label={row.role} lineRole="heading" density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitContent density={density}>
          <kit.KitText part="role" role="heading" density={density}>
            {row.role}
          </kit.KitText>
          <kit.KitText part={null} role="label" tone="muted" lines={1} density={density}>
            <kit.KitText part="date" role="label" tone="muted" density={density}>
              {date}
            </kit.KitText>
            {pay !== undefined && (
              <>
                {detailSeparator}
                <kit.KitText
                  part="pay"
                  role="number"
                  numberScale="compact"
                  tone="muted"
                  tabular
                  density={density}
                >
                  {pay}
                </kit.KitText>
              </>
            )}
          </kit.KitText>
          <kit.KitText
            part={null}
            role="number"
            numberScale="compact"
            tone="muted"
            tabular
            lines={1}
            density={density}
          >
            <kit.KitText
              part="from"
              role="number"
              numberScale="compact"
              tone="muted"
              tabular
              density={density}
            >
              {from}
            </kit.KitText>
            {timeSeparator}
            <kit.KitText part="to" role="number" numberScale="compact" tone="muted" tabular density={density}>
              {to}
            </kit.KitText>
          </kit.KitText>
        </kit.KitContent>
        <kit.KitAction part="claim" kind="secondary" label={words.openShift.claim} />
      </kit.KitGrid>
    </kit.KitRow>
  );
}

export function OpenShift(input: OpenShiftProps) {
  const state = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const { words } = kit.useWords(teamWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitCard part="root" density={density} surface={surface}>
      {state === "empty" ? (
        <kit.KitEmpty
          icon="calendar"
          part="message"
          decorativeIcon
          {...(!thing ? { title: words.openShift.empty } : {})}
        />
      ) : state === "success" ? (
        <kit.KitEmpty
          icon="check"
          part="message"
          tone="good"
          title={words.openShift.success}
          decorativeIcon
        />
      ) : (
        <kit.KitGrid arrange="rows" list density={density}>
          {input.shifts.map((row) => (
            <OpenShiftRow key={row.id} {...{ row, detail, density }} />
          ))}
        </kit.KitGrid>
      )}
    </kit.KitCard>
  );
}
