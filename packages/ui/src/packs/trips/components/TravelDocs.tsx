import { z } from "zod";
import {
  isoDate,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  probesFor,
  secret,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: KeyValue/default cannot track multiple travellers' masked document numbers and expiry warnings.
export const meta = {
  id: "TravelDocs",
  status: "draft",
  group: "data",
  purpose: "Keep travel documents together and see whether they expire near the trip.",
  pick: "A travel document wallet with owners, masked numbers and expiry warnings. Not facts about one thing (KeyValue) or warranties for belongings (Warranties).",
  writeHints: [
    "Never copy or invent real document numbers. Use an empty number when a person has not entered it on the device. Warnings are computed from dates.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The details stay on the device and document numbers always read as (secret).",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "trip_ends"],
  items: { key: "docs", parts: ["root", "kind", "who", "number", "expires", "warning"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, state) =>
    state === "filled"
      ? (input as { docs: z.output<typeof doc>[] }).docs.map(
          ({ kind, who, expires }, index) => `r${index + 1} ${JSON.stringify(who)} ${kind} ${expires}`,
        )
      : [],
} as const satisfies Meta;

const doc = z.strictObject({
  kind: z.enum(["passport", "visa", "insurance", "licence", "health", "other"]),
  who: text(16),
  number: secret(16),
  expires: isoDate,
});
export const props = z.strictObject({
  ...variantProps(meta.variants),
  docs: z.array(doc).min(1).max(6),
  tripEnds: isoDate.optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  return {
    docs: (items.length ? items : [undefined]).map((item, index) => ({
      kind: "other",
      who: (item && titleOf(item, 16, thing)) ?? placeholderTitle(index, lang),
      number: placeholderValue,
      expires: "2026-11-20",
    })),
  };
}

export const examples = [
  {
    tripEnds: "2027-03-13",
    docs: [
      { kind: "passport", who: "Sam", number: "DEMO-A", expires: "2028-08-22" },
      { kind: "visa", who: "Jo", number: "DEMO-B", expires: "2027-03-10" },
    ],
  },
  {
    density: "compact",
    surface: "plain",
    docs: [{ kind: "insurance", who: "Alex", number: "", expires: "2027-06-06" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("TravelDocs");
export const probes = [
  choose(
    "Keep our passports and visas together with owners and masked numbers, and warn about expiry near our trip",
  ),
  choose("For one suitcase, show plain key and value pairs for its maker, colour and size", "KeyValue"),
  write(
    "Track Sam's passport expiring on 2028-08-22 and Jo's visa expiring on 2027-03-10; the trip ends on 2027-03-13. Leave both document numbers blank.",
  ),
  read("Open Jo's visa details", { address: "t1/r2", action: "press" }),
] satisfies Probe[];
