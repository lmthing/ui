import { z } from "zod";
import * as c from "../../../catalog";

// Core first: MapPins/default cannot browse six venues in linked map/list views or switch to list only.
export const meta = {
  id: "MapList",
  status: "draft",
  group: "content",
  purpose: "Browse nearby places on a map and in a linked list.",
  pick: "Browse six or more places with matching detailed rows and pins, or switch between a linked map and list-only view. Not a small map of up to five pins (MapPins) or rows without any map (List).",
  writeHints: [
    "Keep up to six places with one short note each and a goto link. Never write distances, pin positions, a total count, or view selection.",
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A map service draws the map and places.",
  variants: { density: ["comfortable", "compact"] },
  items: { key: "places", parts: ["root", "pin", "name", "meta", "distance"] },
  parts: ["root", "map", "view", "more"],
  states: ["filled", "empty", "loading"],
  select: { prop: "activePin", value: "position" },
  selections: { view: { prop: "view", choices: ["map", "list"], runtime: true } },
  live: { derive: ({ view }) => ({ mapVisible: view !== "list" }) },
  actions: {
    parts: { view: ["select"] },
    items: { root: ["press"], pin: ["select"] },
    when: { pin: { mapVisible: true } },
  },
  deviceData: ["place_results"],
  read: (input, _state, lang, data): string[] => {
    const { places } = input as z.output<typeof props>;
    const count = remainingPlaces(places, data);
    return count ? [c.wordsFor(lang).peekCount(c.numberLine(count, lang))] : [];
  },
} as const satisfies c.Meta;

const placeProps = z.strictObject({ name: c.text(28), meta: c.text(32), goto: c.screenId });
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  // The separately addressed pin selects locally, not through its row's goto.
  places: z
    .array(placeProps.overwrite((place) => ({ ...place, pin: {} })))
    .min(1)
    .max(6),
});

const placeResults = z.object({
  shown: z
    .array(z.object({ name: c.text(28), goto: c.screenId }))
    .min(1)
    .max(6),
  total: z.int().nonnegative(),
});

function remainingPlaces(places: z.output<typeof placeProps>[], data?: c.DeviceData): number {
  for (const entry of data?.place_results ?? []) {
    const result = placeResults.safeParse(entry);
    if (!result.success) continue;
    const { shown, total } = result.data;
    if (
      shown.length === places.length &&
      shown.every(({ name, goto }, index) => name === places[index]?.name && goto === places[index]?.goto)
    )
      return Math.max(0, total - shown.length);
  }
  return 0;
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const places = (items.length ? items : [undefined]).map((item, index) => ({
    name: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(index, lang),
    meta: (item && c.detailOf(item, 32, thing)) || c.wordsFor(lang).placeholderDetail,
    goto: c.screenId.safeParse(item?.id).data ?? "details",
  }));
  return { places };
}

const shops = [
  { name: "Riverside Nursery", meta: "Outdoor plants", goto: "nursery" },
  { name: "Greenhouse Shop", meta: "Indoor plants", goto: "greenhouse" },
  { name: "Hilltop Market", meta: "Pots and compost", goto: "hilltop" },
];
export const examples = [
  { places: shops },
  {
    density: "compact",
    places: [
      { name: "Juniper Café", meta: "Water bowl out front", goto: "juniper" },
      { name: "Alder Park", meta: "Off-lead meadow", goto: "alder" },
      { name: "Canal Green", meta: "Lead-only riverside path", goto: "canal" },
      { name: "Fern Common", meta: "Shaded benches", goto: "fern_common" },
      { name: "Linden Gardens", meta: "Dogs welcome", goto: "linden" },
      { name: "The Corner Café", meta: "Dogs welcome inside", goto: "corner" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("MapList");
export const probes = [
  choose(
    "Browse six dog-friendly spots as pins and matching rows. Tap a pin to highlight its row, and let me switch to list only.",
  ),
  choose("Show three simple labelled pins on a map: Home, Park gate and Pond. No list-only mode.", "MapPins"),
  write(
    "Show a linked map and list of plant shops that can switch to list only: Riverside Nursery for outdoor plants (nursery), Greenhouse Shop for indoor plants (greenhouse), and Hilltop Market for pots (hilltop).",
  ),
  read("Switch to the list-only view", { address: "m1/view", action: "select" }),
  read("Open Riverside Nursery", { address: "m1/r1", action: "press" }),
  read("Select the Riverside Nursery pin to highlight its row without opening the venue", {
    address: "m1/r1/pin",
    action: "select",
  }),
] satisfies c.Probe[];
