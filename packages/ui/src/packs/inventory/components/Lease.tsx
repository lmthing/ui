import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { leaseCopy, leaseReading } from "../copy";
import { inventoryWordsFor } from "../lang";

// Core first: KeyValue/default cannot compute time left, next rent date or a renewal warning.
export const meta = {
  id: "Lease",
  status: "ready",
  group: "data",
  purpose: "See one rental agreement, when rent is next due and when to renew.",
  pick: "One existing rental agreement with tenant, term, rent cadence, due day, deposit and calculated time left or renewal warning. Not static facts (KeyValue), terms to sign (Agreement), a bill (Bills), or a list of rental units (Units).",
  writeHints: [
    "End must be after start. For monthly rent write the due day of the month (1–31); for weekly rent write the weekday (Monday 1, Sunday 7). Never write the computed next due date, progress or renewal status.",
    'Set detail to "brief" only when asked to hide the start date and deposit; keep both in the record. Leave unrequested variants null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Lease records and terms live on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["start", "deposit"] } },
  // prettier-ignore
  parts: ["root", "tenant", "place", "start", "end", "time_left", "rent", "next_due", "deposit", "renewal", "terms_icon"],
  states: ["filled"],
  actions: { parts: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? leaseReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    tenant: c.text(24),
    place: c.text(32),
    start: c.isoDate,
    end: c.isoDate,
    rent: z.number().nonnegative(),
    per: z.enum(["month", "week"]),
    due: z.int().min(1).max(31),
    deposit: z.number().nonnegative().optional(),
  })
  .refine(({ start, end }) => start < end, { path: ["end"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    place: (row && c.titleOf(row, 32, thing)) ?? c.placeholderTitle(0, lang),
    tenant: (row && c.detailOf(row, 24, thing)) ?? c.placeholderTitle(1, lang),
    start: "2026-01-01",
    end: "2026-01-02",
    rent: 0,
    per: "month",
    due: 1,
  };
}

export const examples = [
  {
    tenant: "Ana",
    place: "Patio flat",
    start: "2026-01-01",
    end: "2026-12-30",
    rent: 950,
    per: "month",
    due: 12,
    deposit: 950,
  },
  {
    tenant: "Sam",
    place: "Trail cottage",
    start: "2026-10-12",
    end: "2027-01-11",
    rent: 180,
    per: "week",
    due: 1,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Lease");
export const probes = [
  choose(
    "Show one existing tenant's rental agreement, term dates, time left, deposit held and when the next month's rent is due",
  ),
  choose(
    "Show static pairs labelled Meter serial and Floor for this record. No timeline, agreement, rent or calculations.",
    "KeyValue",
  ),
  write(
    "Ana rents Patio flat from 2026-01-01 until 2026-12-30, at 950 per month due on day 12, with a 950 deposit.",
  ),
  {
    ...write(
      "Ana rents Patio flat from 2026-01-01 to 2026-12-30 for 950 a month due on the 12th, with a 950 deposit. Keep the start date and deposit in the record, but hide both on the card.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Ana's rental agreement terms for Patio flat", { address: "l1", action: "press" }),
] satisfies c.Probe[];

// prettier-ignore
export function Lease(input: c.Props<typeof props, typeof meta>) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words: { lease: words } } = kit.useWords(inventoryWordsFor);
  const copy = leaseCopy({ ...input, detail }, lang);
  return (
    <kit.KitRow part="root" role="button" label={words.open(input.place)} {...{ density, surface }}>
      <kit.KitRow part={null} inline lineRole="heading" label={input.place} {...{ density }}
        trailing={<kit.KitTrail kind="chevron" part="terms_icon" />}>
        <kit.KitContent {...{ density }}>
          <kit.KitText part="place" role="heading" density="comfortable">{input.place}</kit.KitText>
          <kit.KitText part="tenant" role="label" tone="muted" {...{ density }}>{copy.tenant}</kit.KitText>
        </kit.KitContent>
      </kit.KitRow>
      <kit.KitContent group="response" {...{ density }}>
        {copy.start && <kit.KitText part="start" role="label" tone="muted" {...{ density }}>{copy.start}</kit.KitText>}
        <kit.KitText part="end" role="label" {...{ density }}>{copy.end}</kit.KitText>
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitRow part="time_left" inline label={words.timeLeft} {...{ density }}>
          <kit.KitGrid fitLast {...{ density }}>
            <kit.KitText part={null} role="label" tone="muted" {...{ density }}>{words.timeLeft}</kit.KitText>
            <kit.KitText part={null} role="number" numberScale="compact" tabular {...{ density }}>{copy.remaining}</kit.KitText>
          </kit.KitGrid>
          <kit.KitMeter label="" amount="" ratio={copy.ratio} slim tone={copy.renewalTone === "warn" ? "warn" : "accent"} addressed={false} />
          {copy.renewal && <kit.KitText part="renewal" role="label" tone={copy.renewalTone} {...{ density }}>{copy.renewal}</kit.KitText>}
        </kit.KitRow>
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitText part="rent" role="label" tone="muted" {...{ density }}>
          {copy.rent[0]}<kit.KitText part={null} role="number" numberScale="compact" tabular {...{ density }}>{copy.rent[1]}</kit.KitText>{copy.rent[2]}
        </kit.KitText>
        <kit.KitText part="next_due" role="label" {...{ density }}>{copy.nextDue}</kit.KitText>
        {copy.deposit && <kit.KitText part="deposit" role="label" tone="muted" {...{ density }}>{copy.deposit}</kit.KitText>}
      </kit.KitContent>
    </kit.KitRow>
  );
}
