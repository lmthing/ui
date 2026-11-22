import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { stationHeadline, stationRatesCopy, stationRatesReading } from "../copy";
import { placesWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-StationRates.generated";

// Core first: KeyValue with arrange="grid" can list station facts, but cannot show connector availability or claim station cashback.
// prettier-ignore
export const meta = {
  id: "StationRates", status: "ready", group: "data", region: "body", weight: 2, tier: "service",
  purpose: prompt.purpose,
  pick: prompt.pick,
  realPath: "A fuel and EV data service supplies station prices, stalls and cashback; the device supplies location with permission.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["root", "grade", "price", "connector", "power", "stalls", "offer_card"], adds: ["headline", "headline_label"] } },
  parts: ["root", "frame", "name", "brand", "distance", "updated", "headline", "headline_label", "offer", "offer_card", "claimed", "status", "claim", "directions"],
  items: { key: "rateRows", parts: ["root", "grade", "price", "connector", "power", "stalls"], visibleWhen: { detail: "full" } },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: { parts: { root: ["press"], claim: ["press"], directions: ["press"] },
    noGoto: { parts: ["claim", "directions"] },
    when: { root: { hasDetails: true }, claim: { canClaim: true }, directions: { hasStation: true } } },
  partTiers: { root: "phone", distance: "ok", claim: "service", directions: "service" },
  successActions: ["root.press", "directions.press"], readSuccess: true,
  read: (input, state, lang, _data, currency) => stationRatesReading(input as Parameters<typeof stationRatesReading>[0], state, currency, lang),
} as const satisfies c.Meta;

const grade = z.strictObject({
  label: c.text(16).meta({ read: false }),
  price: z.number().positive(),
  unit: c.text(6).meta({ read: false }).optional(),
});
const charger = z
  .strictObject({
    connector: c.text(12).meta({ read: false }),
    kw: z.number().positive(),
    available: z.int().nonnegative(),
    total: z.int().positive(),
  })
  .refine(({ available, total }) => available <= total, {
    path: ["available"],
    message: "Available stalls cannot exceed total stalls",
  });

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  name: c.text(32).meta({ read: false }), brand: c.text(20).meta({ read: false }).optional(), kind: z.enum(["fuel", "ev"]),
  distance: c.text(10).meta({ read: false }).optional(), updatedAt: c.text(12).meta({ read: false }).optional(),
  grades: z.array(grade).min(1).max(5).optional(),
  chargers: z.array(charger).min(0).max(4).optional(),
  offer: z.strictObject({ cashback: c.text(20).meta({ read: false }), claimed: z.boolean() }).optional(),
  goto: c.screenId.optional(),
}).refine(({ kind, grades, chargers }) => kind !== "fuel" || (!!grades && !chargers?.length), {
  message: "Fuel stations require grades and cannot have EV stalls",
}).overwrite((input) => ({
  ...input, hasDetails: Boolean(input.goto), canClaim: input.offer?.claimed === false,
  hasStation: Boolean(input.goto || input.distance || input.grades?.length || input.chargers?.length || input.offer),
  headline: stationHeadline(input),
  rateRows: [...(input.grades ?? []), ...(input.chargers ?? [])],
}));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item] = c.itemsOf(cast, 1);
  return {
    name: (item && c.titleOf(item, 32, c.thingOf(cast))) || c.placeholderTitle(0, lang),
    kind: "ev",
  };
}

// prettier-ignore
export const examples = [
  { name: "Alder Park Fuel", brand: "Greenway", kind: "fuel", distance: "1.2 mi", updatedAt: "10:42",
    grades: [{ label: "Regular", price: 3.49, unit: "gal" }, { label: "Premium", price: 3.99, unit: "gal" },
      { label: "Diesel", price: 3.79, unit: "gal" }],
    offer: { cashback: "15¢/gal", claimed: false }, goto: "alder_fuel" },
  { name: "Canal Green Charging", kind: "ev", distance: "2.4 mi", updatedAt: "10:35",
    grades: [{ label: "Charging", price: 0.42, unit: "kWh" }],
    chargers: [{ connector: "CCS", kw: 150, available: 3, total: 4 }, { connector: "NACS", kw: 250, available: 0, total: 2 }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("StationRates");
// prettier-ignore
export const probes = [
  choose("At one local fuel station, compare Regular and Premium prices per gallon and let me claim its cashback offer."),
  choose("Show one venue’s static amenities as labeled facts in a two-column grid: parking Yes, Wi-Fi Yes, seating Outdoors.", "KeyValue"),
  write("At Alder Park Fuel show Regular at 3.49 per gal and Premium at 3.99 per gal. Show an unclaimed 15¢/gal cashback offer."),
  { ...write("At Canal Green Charging there are 3 open of 4 CCS stalls at 150 kW and 0 open of 2 NACS stalls at 250 kW. Keep both connectors in the data but show only the total open stalls at a glance, not the individual rows."), variant: { axis: "detail", value: "brief" } },
  read("Claim the cashback offer at Alder Park Fuel.", { address: "s1/claim", action: "press" }),
  read("Get directions to Alder Park Fuel.", { address: "s1/directions", action: "press" }),
  read("Open the station details for Alder Park Fuel, not directions.", { address: "s1", action: "press" }),
] satisfies c.Probe[];

type GradeRow = z.output<typeof grade> & { id: string };
type ChargerRow = z.output<typeof charger> & { id: string };
type RateRow = GradeRow | ChargerRow;
type StationProps = z.output<typeof props> & { rateRows: RateRow[] };
type Board = ReturnType<typeof stationRatesCopy<GradeRow, ChargerRow>>;
type Density = c.ThemeDensity;

// prettier-ignore
function RateRows({ board, density }: { board: Board; density: Density }) {
  return <kit.KitRowGroup density={density}>
    {board.grades.map(({ id, label, value }) => <kit.KitRow key={id} item={id} label={label} inset="none" density={density}
      trailing={<kit.KitLayoutText align="end" line={{ text: value, part: "price", role: "figure", compact: true, tabular: true }} density={density} />}>
      <kit.KitMetaLine title={{ text: label, part: "grade" }} density={density} />
    </kit.KitRow>)}
    {board.chargers.map(({ id, connector, power, stalls, tone }) => <kit.KitRow key={id} item={id} label={connector} inset="none" density={density}
      trailing={<kit.KitLayoutText align="end" line={{ text: stalls, part: "stalls", role: "figure", compact: true, tone, tabular: true }} density={density} />}>
      <kit.KitMetaLine title={{ text: connector, part: "connector" }} meta={{ text: power, part: "power" }} density={density} />
    </kit.KitRow>)}
  </kit.KitRowGroup>;
}

// prettier-ignore
function StationOffer({ board, brief, density }: { board: Board; brief: boolean; density: Density }) {
  const loading = kit.useComponentState() === "loading";
  if (!board.offer) return null;
  const offer = brief ? <kit.KitTrail kind="badge" value={board.offer} part="offer" tone="text" density={density} /> :
    <kit.KitLayoutText line={{ text: board.offer, part: "offer", role: "body", strong: true }} density={density} />;
  const claim = board.claim && <kit.KitAction part={loading ? null : "claim"} action="press" label={board.claim} contentParts={{}} />;
  const claimed = <kit.KitLayoutText line={{ text: board.claimed, part: "claimed", role: "meta", tone: "good" }} density={density} />;
  const body = <kit.KitGrid fitLast density={density}>
    <kit.KitContent density={density} lead={brief ? offer : undefined} leadingAlign="row">
      {!brief && offer}{claimed}
    </kit.KitContent>
    {claim}
  </kit.KitGrid>;
  return brief ? body : <kit.KitCard part="offer_card" surface="outlined" padded density={density}>{body}</kit.KitCard>;
}

// prettier-ignore
export function StationRates(input: StationProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words: { stationRates: words } } = kit.useWords(placesWordsFor);
  const thing = kit.useEmptyThing();
  const grades = input.rateRows.filter((row): row is GradeRow => "price" in row);
  const chargers = input.rateRows.filter((row): row is ChargerRow => "connector" in row);
  const board = stationRatesCopy({ ...input, detail, grades, chargers }, state, kit.useAppCurrency(), lang);
  const retained = state === "filled" || state === "success", brief = detail === "brief", loading = state === "loading";
  const goto = retained ? input.goto : undefined;
  const badge = input.distance && <kit.KitTrail kind="badge" value={input.distance} part="distance" tone="text" density={density} />;
  const header = <kit.KitRow inline fitContent part="root" label={input.name} goto={goto} density={density} lineRole="title"
    trailing={goto || (loading && input.goto) ? <kit.KitContent density={density} lead={badge}>
      <kit.KitIcon name="chevron_right" scale="sm" tone="muted" decorative loading={loading} />
    </kit.KitContent> : badge}>
    <kit.KitHeader title={{ text: input.name, part: "name" }} meta={[
      { text: input.brand, part: "brand" }, { text: board.updated, part: "updated" },
    ]} density={density} />
  </kit.KitRow>;
  const body = <>
    {!board.hasRates && state !== "success" && <kit.KitLayoutText line={{ text: words.empty, part: "status", role: "meta", tone: "muted" }} density={density} />}
    {brief && board.headline ? <kit.KitFigure density={density}
      value={{ text: board.headline.value, part: "headline", compact: true, ...(board.headline.tone ? { tone: board.headline.tone } : {}) }}
      unit={{ text: board.headline.label, part: "headline_label" }} /> : <RateRows {...{ board, density }} />}
    <StationOffer {...{ board, brief, density }} />
    {board.directions && <kit.KitRow inline part={loading ? null : "directions"} role={loading ? "text" : "button"}
      label={words.directions} density={density}>
      <kit.KitLayoutText line={{ text: words.directions, role: "meta", tone: "accent" }} density={density} />
    </kit.KitRow>}
  </>;
  return <kit.KitCard part="frame" padded density={density} surface="card">
    {state !== "loading" && header}
    <kit.KitState part="status" icon="pin" density={density} retain={state === "success"}
      loading={<>{header}{body}</>} message={state === "success" ? words.success : state === "error" ? words.error : thing ? c.emptyLine(thing, lang) : words.empty}>
      {body}
    </kit.KitState>
  </kit.KitCard>;
}
