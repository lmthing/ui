import { z } from "zod";
import * as c from "../../../catalog";

// Core first: KeyValue/grid cannot pair an address with a map tile and copy, directions and call actions.
export const meta = {
  id: "Address",
  status: "draft",
  group: "content",
  purpose: "Find a venue, copy its address, or call it.",
  pick: "One place’s postal address with a map tile and copy or directions; call if a phone is supplied. Not facts about a venue (KeyValue) or live delivery progress (DeliveryTracker).",
  writeHints: [
    'Hiding an access note only changes detail: use "detail":"brief","density":null. Keep the supplied note text verbatim. Use density null unless tighter spacing was requested separately.',
  ],
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
  read: (input): string[] => (input as z.output<typeof props>).lines.map((line) => JSON.stringify(line)),
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
  note: "Use the side gate for the potting shed.",
};
export const examples = [
  nurseryAddress,
  { lines: ["8 Linden Road", "Clifton", "Bristol BS8 2BE"], density: "compact" },
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
  read("Get directions to the nursery", { address: "a1/directions", action: "press" }),
  read("Call the nursery", { address: "a1/call", action: "press" }),
] satisfies c.Probe[];
