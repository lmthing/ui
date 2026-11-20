import { z } from "zod";
import * as c from "../../../catalog";
// prettier-ignore
import { KitCard, KitContent, KitEmpty, KitGrid, KitInput, KitPhoto, KitRow, KitSkeleton, KitText, KitTrail, useComponentState, useControlValue, usePartContext, useVariant, useWords } from "../../../kit";
import { exclusiveLets, unitDate, unitReading, unitSnapshot } from "../copy";
import { propertyWordsFor } from "../lang";
import { distinct, ref, seedDate, seedLabels } from "../seeds";

// Core first: List/rows cannot derive occupancy and agreed rent from dated, mutually exclusive lets.
export const meta = {
  id: "Units",
  status: "draft",
  group: "data",
  purpose: "See who occupies each rental unit and the agreed rent on a chosen date.",
  pick: "Only choose this to derive occupancy or agreed rent across rental units from dated lets. For a directory of tenant names linking to profiles, choose List, not Units. Not owned stock (Things), an advertised place (Listing), or one agreement (Lease).",
  writeHints: [
    "Use snake_case references. Every let must reference a unit in this line. Active lets for one unit must not overlap; the end date is exclusive, and cancelled lets do not count.",
    'A stay requires an end date and per "night"; a tenancy uses "week" or "month". Supply askingRent and askingPer together, or omit both. Do not write occupancy or totals.',
    'A requested thumbnail sets media to "thumb" only. Leave surface and density null unless asked separately for a card surface or tighter spacing.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Units and agreed tenancy or stay records live on the device, without a booking engine or lease editor.",
  variants: { density: ["comfortable", "compact"], surface: ["plain", "card"], media: ["none", "thumb"] },
  variantParts: { "media.thumb": { adds: ["photo"] } },
  parts: ["root", "date", "message"],
  items: { key: "units", parts: ["root", "title", "address", "photo", "occupant", "occupancy", "rent"] },
  states: ["filled", "empty", "loading", "error"],
  actions: { parts: { date: ["set"] }, items: { root: ["press"] }, when: { root: { linked: true } } },
  emptyActions: [],
  read: (input, state, lang): string[] =>
    state === "filled" ? unitReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const per = z.enum(["night", "week", "month"]);
const unit = z
  .strictObject({
    unitRef: ref,
    title: c.text(32),
    address: c.text(36).optional(),
    photo: c.photo.optional(),
    askingRent: z.number().nonnegative().optional(),
    askingPer: per.optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ askingRent, askingPer }) => (askingRent === undefined) === (askingPer === undefined), {
    path: ["askingPer"],
    message: "Provide asking rent and its period together",
  });
const letRecord = z
  .strictObject({
    letRef: ref,
    unitRef: ref,
    occupant: c.text(24),
    kind: z.enum(["tenancy", "stay"]),
    start: c.isoDate,
    end: c.isoDate.optional(),
    rent: z.number().nonnegative(),
    per,
    cancelled: z.boolean().default(false),
  })
  .refine(
    ({ kind, start, end, per }) =>
      (!end || start < end) && (kind === "stay" ? Boolean(end && per === "night") : per !== "night"),
    { path: ["end"], message: "Use a later end; stays also need nightly rent and a required end" },
  );

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    units: z.array(unit).min(1).max(12),
    lets: z.array(letRecord).min(0).max(48),
    on: c.isoDate,
  })
  .refine(({ units }) => distinct(units, (unit) => unit.unitRef), { path: ["units"] })
  .refine(
    ({ units, lets }) =>
      distinct(lets, (record) => record.letRef) &&
      lets.every((record) => units.some((unit) => unit.unitRef === record.unitRef)),
    { path: ["lets"] },
  )
  .refine(({ lets }) => exclusiveLets(lets), { path: ["lets"], message: "Non-cancelled lets cannot overlap" })
  .overwrite((value) => ({
    ...value,
    units: value.units.map((unit) => ({
      ...unit,
      linked: Boolean(unit.goto),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    units: seedLabels(input, 3).map(({ ref, title, detail }) => ({ unitRef: ref, title, address: detail })),
    lets: [],
    on: seedDate,
  };
}

// prettier-ignore
export const examples = [
  {
    units: [{ unitRef: "flat_a", title: "Willow Flat", address: "14 Mill Lane", photo: "lib:home", goto: "property_unit_detail" },
      { unitRef: "flat_b", title: "Cedar Flat", askingRent: 1050, askingPer: "month" }],
    lets: [{ letRef: "asha_let", unitRef: "flat_a", occupant: "Asha", kind: "tenancy", start: "2026-10-01", rent: 900, per: "month" }],
    on: "2026-11-18",
  },
  {
    units: [{ unitRef: "north_cabin", title: "North Cabin", photo: "lib:home" }],
    lets: [
      { letRef: "lee_stay", unitRef: "north_cabin", occupant: "Lee", kind: "stay", start: "2026-11-19", end: "2026-11-21", rent: 85, per: "night" },
      { letRef: "ivy_stay", unitRef: "north_cabin", occupant: "Ivy", kind: "stay", start: "2026-11-21", end: "2026-11-23", rent: 80, per: "night", cancelled: true },
    ],
    on: "2026-11-18", density: "compact", surface: "card", media: "thumb",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Units");
export const probes = [
  choose(
    "On any date, see which rental flats are occupied, reserved or vacant from the agreed lets and see each flat's current rent",
  ),
  choose(
    "Show a plain tenant directory of names linked to their profiles, with no occupancy or date calculations",
    "List",
  ),
  write(
    "On 2026-11-18 show Willow Flat (flat_a) occupied under Asha’s monthly tenancy (asha_let) from 2026-10-01 for 900. Add vacant Cedar Flat (flat_b), asking 1050 per month.",
  ),
  {
    ...write(
      "Show North Cabin (north_cabin) on 2026-11-18 with thumbnail photo lib:home; there are no agreed lets. Keep the usual row surface and spacing.",
    ),
    variant: { axis: "media", value: "thumb" },
  },
  read("Open Willow Flat’s details", { address: "u1/r1", action: "press" }),
] satisfies c.Probe[];

type UnitsProps = c.Props<typeof props, typeof meta>;
type Unit = UnitsProps["units"][number];
const statusTone = { occupied: "good", reserved: "warn", vacant: "muted" } as const;

// prettier-ignore
function UnitRow({ unit, snapshot, media, density }: {
  unit: Unit;
  snapshot: ReturnType<typeof unitSnapshot>;
  media: UnitsProps["media"];
  density: NonNullable<UnitsProps["density"]>;
}) {
  const { words } = useWords(propertyWordsFor);
  const { status, occupant, rent } = snapshot;
  return (
    <KitRow item={unit.id} label={unit.title} goto={unit.goto} density={density}
      inset="none" leadingAlign="row" lineRole="heading"
      leading={media === "thumb" && unit.photo ? <KitPhoto photo={unit.photo} label={unit.title} part="photo" /> : undefined}
      trailing={<KitTrail kind="badge" part="occupancy" value={words.units.status[status].label} tone={statusTone[status]} density={density} />}
    >
      <KitText role="heading" part="title" density={density}>{unit.title}</KitText>
      {unit.address && <KitText role="caption" tone="muted" part="address">{unit.address}</KitText>}
      {occupant && <KitText role="body" part="occupant">{occupant}</KitText>}
      {rent && <KitText role="number" numberScale="compact" tabular part="rent">{rent}</KitText>}
    </KitRow>
  );
}

// prettier-ignore
export function Units({ units, lets, on, ...input }: UnitsProps) {
  const state = useComponentState();
  const { screen, component } = usePartContext();
  const { words, lang } = useWords(propertyWordsFor);
  const date = unitDate(useControlValue<unknown>(`${screen}/${component}/date`, on), on);
  const density = useVariant("density", meta.variants.density, input.density);
  const surface = useVariant("surface", meta.variants.surface, input.surface);
  const media = useVariant("media", meta.variants.media, input.media);
  const items = units.map((unit) => ({ unit, snapshot: unitSnapshot(unit, lets, date, lang) }));
  return (
    <KitCard part="root" padded surface={surface} density={density}>
      {state === "empty" || state === "error" ? (
        <KitEmpty part="message" decorativeIcon icon={state === "error" ? "alert" : "home"}
          title={state === "error" ? words.units.error : words.units.empty} />
      ) : <>
        <KitContent density={density}>
          {state !== "loading" && <KitText part={null} role="label" tone="muted">{words.units.date}</KitText>}
          {state === "loading" ? <KitSkeleton shape="control" kind="secondary" label={words.units.date} full />
            : <KitInput part="date" kind="date" action="set" label={words.units.date} hint={words.units.date} value={date} projected />}
        </KitContent>
        {state === "loading" ? <KitSkeleton inset="none" rows={items.length} lead="none" density={density}
          items={items.map(({ unit, snapshot }) => ({
            title: unit.title, sub: unit.address, meta: snapshot.occupant, value: snapshot.rent,
            trail: "badge", ...(media === "thumb" && unit.photo ? { photo: unit.photo, lead: "box" } : {}),
          }))} />
          : <KitGrid arrange="rows" list density={density}>
            {items.map(({ unit, snapshot }) => <UnitRow key={unit.id} {...{ unit, snapshot, media, density }} />)}
          </KitGrid>}
      </>}
    </KitCard>
  );
}
