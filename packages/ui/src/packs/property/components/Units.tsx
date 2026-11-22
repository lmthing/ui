import { z } from "zod";
import * as c from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitGrid,
  KitInput,
  KitLayoutText,
  KitPhoto,
  KitRow,
  KitTrail,
  KitRowGroup,
  KitSkeleton,
  KitState,
  useAppCurrency,
  useComponentState,
  useLiveControls,
  useVariant,
  useWords,
  useKit,
} from "../../../kit";
import { exclusiveLets, unitDisplay, unitReading, unitSnapshot } from "../copy";
import { propertyWordsFor } from "../lang";
import { distinct, ref, seedDate, seedLabels } from "../seeds";
import { prompt } from "../../../entry/prompt-Units.generated";

// Core first: List/rows cannot derive occupancy and agreed rent from dated, mutually exclusive lets.
export const meta = {
  id: "Units",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Units and agreed tenancy or stay records live on the device, without a booking engine or lease editor.",
  variants: { media: ["none", "thumb"] },
  variantParts: { "media.thumb": { adds: ["photo"] } },
  parts: ["root", "date", "message", "vacancies"],
  items: {
    key: "units",
    visibleWhen: { visible: true },
    parts: ["root", "title", "address", "photo", "occupant", "occupancy", "rent"],
  },
  states: ["filled", "empty", "loading", "error"],
  actions: { parts: { date: ["set"] }, items: { root: ["press"] }, when: { root: { linked: true } } },
  set: { date: { type: "date", prop: "on" } },
  emptyActions: [],
  live: { derive: unitDisplay },
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled" ? unitReading(input as z.output<typeof props>, lang, currency) : [],
} as const satisfies c.Meta;

const per = z.enum(["night", "week", "month"]);
const unit = z
  .strictObject({
    unitRef: ref.meta({ kind: "ref" }),
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
    noticeGivenOn: c.isoDate.optional(),
    rent: z.number().nonnegative(),
    per,
    cancelled: z.boolean().default(false),
  })
  .refine(
    ({ kind, start, end, per }) =>
      (!end || start < end) && (kind === "stay" ? Boolean(end && per === "night") : per !== "night"),
    { path: ["end"], message: "Use a later end; stays also need nightly rent and a required end" },
  )
  .refine(
    ({ kind, end, noticeGivenOn }) => !noticeGivenOn || (kind === "tenancy" && !!end && noticeGivenOn < end),
    { path: ["noticeGivenOn"], message: "Notice needs a tenancy with a later end date" },
  );

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    units: z.array(unit).min(1).max(12),
    lets: z.array(letRecord).min(0).max(48),
    on: c.isoDate,
    style: z.enum(["register", "vacancies"]).optional(),
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
      photo: value.media === "thumb" ? unit.photo : undefined,
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

export const examples = [
  {
    units: [
      {
        unitRef: "flat_a",
        title: "Willow Flat",
        address: "14 Mill Lane",
        photo: "lib:home",
        goto: "property_unit_detail",
      },
      { unitRef: "flat_b", title: "Cedar Flat", askingRent: 1050, askingPer: "month" },
    ],
    lets: [
      {
        letRef: "asha_let",
        unitRef: "flat_a",
        occupant: "Asha",
        kind: "tenancy",
        start: "2026-10-01",
        rent: 900,
        per: "month",
      },
    ],
    on: "2026-11-18",
  },
  {
    units: [{ unitRef: "north_cabin", title: "North Cabin", address: "8 Pine Track", photo: "lib:home" }],
    lets: [
      {
        letRef: "lee_stay",
        unitRef: "north_cabin",
        occupant: "Lee",
        kind: "stay",
        start: "2026-11-19",
        end: "2026-11-21",
        rent: 85,
        per: "night",
      },
      {
        letRef: "ivy_stay",
        unitRef: "north_cabin",
        occupant: "Ivy",
        kind: "stay",
        start: "2026-11-21",
        end: "2026-11-23",
        rent: 80,
        per: "night",
        cancelled: true,
      },
    ],
    on: "2026-11-18",
    media: "thumb",
  },
  {
    style: "vacancies",
    on: "2026-11-18",
    units: [
      { unitRef: "flat_a", title: "Willow Flat" },
      { unitRef: "flat_b", title: "Cedar Flat" },
    ],
    lets: [
      {
        letRef: "asha_let",
        unitRef: "flat_a",
        occupant: "Asha",
        kind: "tenancy",
        start: "2026-10-01",
        end: "2026-12-01",
        noticeGivenOn: "2026-11-10",
        rent: 900,
        per: "month",
      },
    ],
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
  {
    ...write(
      "On 2026-11-18 show Willow Flat (flat_a) occupied under Asha’s monthly tenancy (asha_let) from 2026-10-01 for 900. Add vacant Cedar Flat (flat_b), asking 1050 per month.",
    ),
    expectProps: { style: "register" },
  },
  {
    ...write(
      "Show North Cabin (north_cabin) on 2026-11-18 with thumbnail photo lib:home; there are no agreed lets. Keep the usual row surface and spacing.",
    ),
    variant: { axis: "media", value: "thumb" },
    expectProps: { style: "register" },
  },
  read("Open Willow Flat’s details", { address: "u1/r1", action: "press" }),
  {
    ...write(
      "Use the Vacancies view on 2026-11-18. Include both Willow Flat (flat_a) and Cedar Flat (flat_b) in the underlying register for date changes. Store Asha's tenancy asha_let for Willow Flat, 900 monthly from 2026-10-01 to 2026-12-01. Asha already gave notice on 2026-11-10; retain that exact notice date on the tenancy. Cedar Flat has no lets.",
    ),
    expectProps: {
      style: "vacancies",
      units: [{ unitRef: "flat_a" }, { unitRef: "flat_b" }],
      lets: [{ letRef: "asha_let", noticeGivenOn: "2026-11-10" }],
    },
  },
] satisfies c.Probe[];

type UnitsProps = c.Props<typeof props, typeof meta>;
type Unit = UnitsProps["units"][number];
type VisibleUnits = Omit<UnitsProps, "units"> & { units: (Unit & { visible: boolean; notice: boolean })[] };
const statusTone = { occupied: "good", reserved: "warn", vacant: "muted" } as const;
function UnitOccupancy(
  title: string,
  { status, rent }: ReturnType<typeof unitSnapshot>,
  notice: boolean,
  density: c.ThemeDensity,
  words: ReturnType<typeof propertyWordsFor>["units"],
) {
  return (
    <KitContent rhythm="flush" {...{ density }}>
      <KitRow
        part={null}
        label={title}
        inline
        fitContent
        {...{ density }}
        trailing={
          <KitTrail
            kind="badge"
            part="occupancy"
            value={notice ? words.notice : words.status[status]}
            tone={notice ? "warn" : statusTone[status]}
            {...{ density }}
          />
        }
      >
        {null}
      </KitRow>
      <KitLayoutText
        line={{ part: "rent", text: rent, role: "figure", compact: true, tabular: true }}
        align="end"
        {...{ density }}
      />
    </KitContent>
  );
}

type UnitRowProps = {
  unit: Unit;
  snapshot: ReturnType<typeof unitSnapshot>;
  media: UnitsProps["media"];
  density: c.ThemeDensity;
  loading: boolean;
  notice: boolean;
  inline: boolean;
};
function UnitRow({ unit, snapshot, media, density, loading, notice, inline }: UnitRowProps) {
  const { words } = useWords(propertyWordsFor);
  const { occupant } = snapshot;
  const photo = media === "thumb" && unit.photo;
  const lines = [
    { part: "title", text: unit.title, role: "body", tone: unit.goto ? "accent" : "text" },
    { part: "address", text: unit.address, role: "meta", tone: "muted" },
    { part: "occupant", text: occupant, role: "meta", tone: "muted" },
  ] as const;
  return (
    <KitRow
      item={unit.id}
      label={loading ? "" : unit.title}
      goto={loading ? undefined : unit.goto}
      density={density}
      part={loading ? null : "root"}
      inset="none"
      leadingAlign="row"
      {...{ inline }}
      leading={
        photo ? (
          loading ? (
            <KitSkeleton shape="figure" inset="none" lead="box" density={density} />
          ) : (
            <KitPhoto photo={photo} label={unit.title} part="photo" />
          )
        ) : undefined
      }
    >
      <KitGrid fitLast {...{ density }}>
        <KitContent rhythm="flush" {...{ density }}>
          {lines.map(({ part, text, role, tone }) => (
            <KitLayoutText
              key={part}
              density={density}
              line={{ part, text, role, tone, strong: part === "title" }}
            />
          ))}
        </KitContent>
        {UnitOccupancy(unit.title, snapshot, notice, density, words.units)}
      </KitGrid>
    </KitRow>
  );
}

function UnitDateField(
  on: UnitsProps["on"],
  density: c.ThemeDensity,
  loading: boolean,
  words: ReturnType<typeof propertyWordsFor>["units"],
) {
  return (
    <KitContent {...{ density }}>
      <KitLayoutText line={{ role: "meta", text: words.date, tone: "muted" }} {...{ density }} />
      {loading ? (
        <KitSkeleton shape="control" kind="secondary" label={words.date} full />
      ) : (
        <KitInput
          part="date"
          kind="date"
          icon="calendar"
          action="set"
          label={words.date}
          hint={words.dateFormat}
          value={on}
          projected
        />
      )}
    </KitContent>
  );
}

export function Units(input: UnitsProps) {
  const { units, lets, on, style } = useLiveControls(meta, input) as VisibleUnits;
  const state = useComponentState();
  const loading = state === "loading";
  const { words, lang } = useWords(propertyWordsFor);
  const currency = useAppCurrency();
  const density = useKit().density;
  const media = useVariant("media", meta.variants.media, input.media);
  const rows = units
    .filter(({ visible }) => visible)
    .map((unit) => (
      <UnitRow
        key={unit.id}
        notice={unit.notice}
        snapshot={unitSnapshot(unit, lets, on, lang, currency)}
        inline={style === "vacancies"}
        {...{ unit, media, density, loading }}
      />
    ));
  const content = (
    <>
      {UnitDateField(on, density, loading, words.units)}
      {style === "vacancies" ? (
        <KitContent group="response" {...{ density }}>
          <KitLayoutText
            line={{ text: words.units.vacancies, part: "vacancies", strong: true }}
            {...{ density }}
          />
          <KitRowGroup spacing="groups" {...{ density }}>
            {rows}
          </KitRowGroup>
        </KitContent>
      ) : (
        <KitGrid arrange="rows" list={!loading} {...{ density }}>
          {rows}
        </KitGrid>
      )}
      {!rows.length && !loading && (
        <KitLayoutText
          line={{ text: words.units.noVacancies, part: "message", tone: "muted" }}
          {...{ density }}
        />
      )}
    </>
  );
  return (
    <KitCard part="root" padded {...{ density }}>
      <KitState
        part="message"
        icon={state === "error" ? "alert" : "home"}
        message={state === "error" ? words.units.error : undefined}
        loading={content}
        {...{ density }}
      >
        {content}
      </KitState>
    </KitCard>
  );
}
