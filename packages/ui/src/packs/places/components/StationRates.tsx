import { z } from "zod";
import * as c from "../../../catalog";

// Core first: KeyValue with arrange="grid" can list station facts, but cannot show connector availability or claim station cashback.
// prettier-ignore
export const meta = {
  id: "StationRates", status: "draft", group: "data", region: "body", weight: 2, tier: "service",
  purpose: "Compare local fuel prices or charging availability and claim station cashback.",
  pick: "Live fuel grade prices, EV connector stalls or per-unit cashback for one station. Not static station facts (KeyValue), venue cards (PlaceCard), retail products (ProductGrid) or active charging sessions (ChargePump).",
  realPath: "A fuel and EV data service supplies station prices, stalls and cashback; the device supplies location with permission.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["grade", "price", "connector", "power", "stalls"], adds: ["headline", "headline_label"] } },
  parts: ["root", "name", "brand", "distance", "updated", "headline", "headline_label", "offer", "status", "claim", "directions"],
  items: { key: "grades", parts: ["grade", "price"] },
  collections: { chargers: { key: "chargers", prefix: "e", parts: ["connector", "power", "stalls"] } },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: { parts: { root: ["press"], claim: ["press"], directions: ["press"] },
    when: { root: { hasDetails: true }, claim: { canClaim: true }, directions: { hasRates: true } } },
  partTiers: { root: "phone", distance: "ok", claim: "service", directions: "service" },
} as const satisfies c.Meta;

const grade = z.strictObject({
  label: c.text(16),
  price: z.number().positive(),
  unit: c.text(6).optional(),
});
const charger = z
  .strictObject({
    connector: c.text(12),
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
  name: c.text(32), brand: c.text(20).optional(), kind: z.enum(["fuel", "ev"]),
  distance: c.text(10).optional(), updatedAt: c.text(12).optional(),
  grades: z.array(grade).min(1).max(5).optional(),
  chargers: z.array(charger).min(0).max(4).optional(),
  offer: z.strictObject({ cashback: c.text(20), claimed: z.boolean() }).optional(),
  goto: c.screenId.optional(),
}).refine(({ kind, grades, chargers }) => kind !== "fuel" || (!!grades && !chargers?.length), {
  message: "Fuel stations require grades and cannot have EV stalls",
}).overwrite((input) => ({
  ...input, hasDetails: Boolean(input.goto), canClaim: input.offer?.claimed === false,
  hasRates: Boolean(input.grades?.length || input.chargers?.length),
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
  read("Open the station details for Alder Park Fuel, not directions.", { address: "s1/root", action: "press" }),
] satisfies c.Probe[];
