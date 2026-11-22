import { z } from "zod";
import {
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  secret,
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
import { travelDocLines, travelDocsReading, travelDocsTripEnd } from "../copy";
import { tripsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-TravelDocs.generated";

// Core first: KeyValue/default cannot track multiple travellers' masked document numbers and expiry warnings.
export const meta = {
  id: "TravelDocs",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The details stay on the device and document numbers always read as (secret).",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["number"] } },
  parts: ["root", "trip_ends", "empty"],
  items: { key: "docs", parts: ["root", "kind", "who", "number", "expires", "warning", "trail"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang) =>
    state === "filled" ? travelDocsReading(input as Parameters<typeof travelDocsReading>[0], lang) : [],
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
      number: "",
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
    tripEnds: "2027-06-01",
    surface: "plain",
    docs: [
      { kind: "insurance", who: "Alex", number: "", expires: "2027-06-06" },
      { kind: "licence", who: "Riley", number: "DEMO-C", expires: "2028-01-16" },
    ],
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
  {
    ...write(
      "For our trip ending 2027-03-13, show Sam's passport expiring on 2028-08-22 and Jo's visa expiring on 2027-03-10. Keep owners, expiry dates and warnings visible, but hide the masked number lines. Leave the stored numbers blank.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Jo's visa details", { address: "t1/r2", action: "press" }),
] satisfies Probe[];

type TravelDocsProps = Props<typeof props, typeof meta>;
const icons = {
  passport: "book_open",
  visa: "file_text",
  insurance: "shield",
  licence: "credit_card",
  health: "heart_pulse",
  other: "file_text",
} as const;

// prettier-ignore
function DocumentRow({ doc, tripEnds, density, detail }: Pick<TravelDocsProps, "tripEnds" | "density" | "detail"> & {
  doc: TravelDocsProps["docs"][number];
}) {
  const { lang, words: { travelDocs: words } } = kit.useWords(tripsWordsFor);
  const { kind, number, expires, warning } = travelDocLines(doc, tripEnds, lang);
  return <kit.KitRow item={doc.id} role="button" label={words.open(kind, doc.who)} density={density}
    leading={<kit.KitIcon name={icons[doc.kind]} decorative />}
    trailing={<kit.KitTrail kind="chevron" part="trail" />}>
    <kit.KitMetaLine density={density} title={{ text: kind, part: "kind" }} meta={[
      { text: doc.who, part: "who", role: "body" },
      ...(detail === "full" ? [{ text: number, part: "number", role: "caption" } as const] : []),
      { text: expires, part: "expires", role: "caption", tone: "text" },
      ...(warning ? [{ text: warning.label, part: "warning", role: "caption", tone: warning.tone } as const] : []),
    ]} />
  </kit.KitRow>;
}

// prettier-ignore
export function TravelDocs(input: TravelDocsProps) {
  const { docs, tripEnds, surface, detail } = input;
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(tripsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const trip = travelDocsTripEnd(tripEnds, lang);
  return <kit.KitCard surface={surface} density={density} part="root" padded={state !== "empty"} inset="none">
    <kit.KitState icon="file_text" part="empty" message={words.travelDocs.empty} density={density}>
      {trip && <kit.KitContent inset="md" density={density}>
        <kit.KitText part="trip_ends" role="caption" tone="muted" density={density}>{trip}</kit.KitText>
      </kit.KitContent>}
      <kit.KitRowGroup density={density}>
        {docs.map((doc) => <DocumentRow key={doc.id} {...{ doc, tripEnds, detail, density }} />)}
      </kit.KitRowGroup>
    </kit.KitState>
  </kit.KitCard>;
}
