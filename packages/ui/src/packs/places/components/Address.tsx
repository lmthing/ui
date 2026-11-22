import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { addressReading } from "../copy";
import { placesWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Address.generated";

// Core first: KeyValue with arrange="grid" cannot pair an address with a map tile and copy, directions and call actions.
export const meta = {
  id: "Address",
  status: "ready",
  group: "content",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The address is stored with the place, and directions open the phone’s maps app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  parts: ["root", "lines", "map", "note", "copy", "directions", "call"],
  partTiers: { directions: "service", call: "service" },
  states: ["filled"],
  actions: {
    parts: { copy: ["press"], directions: ["press"], call: ["press"] },
    when: { call: { callable: true } },
  },
  read: (input, _state, lang): string[] => addressReading(input as z.output<typeof props>, lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    lines: z.array(c.text(40)).min(1).max(3),
    phone: c.text(20).optional(),
    note: c.text(80).optional(),
  })
  .overwrite((value) => ({
    ...value,
    callable: value.phone !== undefined,
    note: value.detail === "brief" ? undefined : value.note,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return { lines: [(item && c.detailOf(item, 40, thing)) || c.wordsFor(lang).placeholderDetail] };
}

const nurseryAddress = {
  lines: ["14 Greenhouse Lane", "Bristol BS1 4DJ"],
  phone: "0117 496 0124",
  note: "Use the side gate by the shed.",
};
const previewPin = { id: "r1", x: 0.5, y: 0.45, selected: true } as const;
export const examples = [
  nurseryAddress,
  { lines: ["Juniper Dog Park", "8 Linden Road", "Bristol BS8 2BE"] },
  { ...nurseryAddress, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Address");
export const probes = [
  choose(
    "Show the street address for one nursery with a little map and buttons to copy it or get directions",
  ),
  choose(
    "Show a venue's amenities as labeled facts: parking Yes, Wi-Fi Yes and seating Outdoors",
    "KeyValue",
  ),
  write("Show 14 Greenhouse Lane, Bristol BS1 4DJ. Phone 0117 496 0124. Note: use the side gate."),
  {
    ...write(
      "Show 14 Greenhouse Lane, Bristol BS1 4DJ. Keep the access note Use the side gate, but hide it on the screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Press the button that puts 14 Greenhouse Lane on my clipboard. Use the button's full address.", {
    address: "a1/copy",
    action: "press",
  }),
  read("Get directions to the nursery. Use the button's address exactly as shown on the screen read.", {
    address: "a1/directions",
    action: "press",
  }),
  read("Call the nursery", { address: "a1/call", action: "press" }),
] satisfies c.Probe[];

export function Address(input: c.Props<typeof props, typeof meta>) {
  const { lines, phone, note } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { words } = kit.useWords(placesWordsFor);
  const [street, ...rest] = lines;
  const callLabel = phone && words.addressCall(phone);
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitContent density={density}>
        <kit.KitText part="lines" role="title" density={density}>
          {street}
        </kit.KitText>
        {rest.map((line, index) => (
          <kit.KitText key={index} part={null} density={density}>
            {line}
          </kit.KitText>
        ))}
        {detail === "full" && note && (
          <kit.KitContent density={density} group="response">
            <kit.KitText part="note" tone="muted" density={density}>
              {note}
            </kit.KitText>
          </kit.KitContent>
        )}
      </kit.KitContent>
      <kit.KitContent density={density} group="response">
        <kit.KitGrid density={density}>
          <kit.KitMapTile part="map" pins={[{ ...previewPin, label: words.addressMapPreview }]} />
          <kit.KitGrid arrange="rows">
            <kit.KitAction
              full
              part="directions"
              action="press"
              kind="secondary"
              label={words.addressDirections}
            />
            <kit.KitAction full part="copy" action="press" kind="quiet" label={words.addressCopy} />
          </kit.KitGrid>
        </kit.KitGrid>
        {callLabel && (
          <kit.KitContent group="response" density={density}>
            <kit.KitRow inline part="call" role="button" label={callLabel} density={density}>
              <kit.KitText role="label" tone="accent" part={null} density={density}>
                {callLabel}
              </kit.KitText>
            </kit.KitRow>
          </kit.KitContent>
        )}
      </kit.KitContent>
    </kit.KitCard>
  );
}
