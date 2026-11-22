import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { mapListCopy, mapListPreview, mapListReading } from "../copy";
import { placesWordsFor } from "../lang";

// Core first: MapPins/default cannot browse six venues in linked map/list views or switch to list only.
export const meta = {
  id: "MapList",
  status: "ready",
  group: "content",
  purpose: "Browse nearby places on a map and in a linked list.",
  pick: "Browse six or more places with matching detailed rows and pins, or switch between a linked map and list-only view. Not a small map of up to five pins (MapPins) or rows without any map (List).",
  writeHints: [
    "Keep up to six places with one short note each and a goto link. Never write distances, pin positions, a total count, or view selection.",
    'Set style only when a starting layout is requested: "map" shows only pins, "list" only rows, and "split" both.',
    'Hiding the notes uses detail "brief", not compact density. Still write each note in meta. Leave density and surface null unless specifically requested.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A map service draws the map and places.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["meta"] } },
  items: { key: "places", parts: ["root", "pin", "name", "meta", "distance"] },
  parts: ["root", "map", "view", "more", "empty", "active_place"],
  states: ["filled", "empty", "loading"],
  select: { prop: "activePin", value: "position" },
  selections: { view: { prop: "view", choices: { prop: "viewChoices" }, runtime: true } },
  live: {
    // prettier-ignore
    derive: ({ view, style, detail, places, activePin }) => {
      const options = style !== undefined;
      const viewChoices = options ? ["split", "map", "list"] : ["map", "list"];
      const activeView = typeof view === "string" && viewChoices.includes(view) ? view : (style ?? "map");
      const rowsVisible = !options || activeView !== "map";
      const rows = Array.isArray(places) ? places as c.Values[] : undefined;
      return {
        activeView, ...(options && { view: activeView }), viewChoices, mapVisible: activeView !== "list", rowsVisible,
        activePlace: !rowsVisible ? rows?.[typeof activePin === "number" ? activePin - 1 : 0]?.name : undefined,
        ...((detail === "brief" || !rowsVisible) && rows
          ? { places: rows.map((place) => ({ ...place, meta: undefined })) }
          : {}),
      };
    },
  },
  actions: {
    parts: { view: ["select"] },
    items: { root: ["press"], pin: ["select"] },
    when: { pin: { mapVisible: true }, "root.press": { rowsVisible: true } },
  },
  deviceData: ["place_results"],
  previewDeviceData: ({ input, state }): c.DeviceData =>
    state === "empty" ? {} : mapListPreview((input as z.output<typeof props>).places),
  read: (input, state, lang, data): string[] =>
    state === "filled" ? mapListReading(input as Parameters<typeof mapListReading>[0], data, lang) : [],
} as const satisfies c.Meta;

const placeProps = z.strictObject({ name: c.text(28), meta: c.text(32), goto: c.screenId });
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  style: z.enum(["split", "map", "list"]).optional(),
  // The separately addressed pin selects locally, not through its row's goto.
  places: z
    .array(placeProps.overwrite((place) => ({ ...place, pin: {} })))
    .min(1)
    .max(6),
});

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
  { places: shops, style: "map" },
  { places: shops, style: "list" },
  { places: shops, style: "split" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("MapList");
// prettier-ignore
export const probes = [
  choose("Browse six dog-friendly spots as pins and matching rows. Tap a pin to highlight its row, and let me switch to list only."),
  choose("Show three simple labelled pins on a map: Home, Park gate and Pond. No list-only mode.", "MapPins"),
  write("Show a linked map and list of plant shops that can switch to list only: Riverside Nursery for outdoor plants (nursery), Greenhouse Shop for indoor plants (greenhouse), and Hilltop Market for pots (hilltop)."),
  {
    ...write("Show a map and matching rows for Riverside Nursery (nursery, outdoor plants), Greenhouse Shop (greenhouse, indoor plants) and Hilltop Market (hilltop, pots). Hide only the notes in the rows; keep the names, live distances and usual spacing."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Use the view selector to choose list only, without selecting a pin or opening a venue", { address: "m1/view", action: "select" }),
  read("Open Riverside Nursery", { address: "m1/r1", action: "press" }),
  read("Select the Riverside Nursery pin to highlight its row without opening the venue", { address: "m1/r1/pin", action: "select" }),
  {
    ...write("Show only the map to start, with a pin for Riverside Nursery (nursery, outdoor plants) and no visible rows."),
    expectProps: { style: "map" },
  },
  {
    ...write("Let me browse Riverside Nursery (nursery, outdoor plants) in a map browser, but start with only the list and hide the map."),
    expectProps: { style: "list" },
  },
  {
    ...write("Start with both the map and list visible for Riverside Nursery (nursery, outdoor plants), not just one or the other."),
    expectProps: { style: "split" },
  },
] satisfies c.Probe[];

type MapListProps = c.Props<typeof props, typeof meta>;
type PlaceRow = ReturnType<typeof mapListCopy<MapListProps["places"][number]>>["places"][number];
// prettier-ignore
function PlaceRows({ places, activePin, density, detail }: {
  places: PlaceRow[]; activePin: number; density: c.ThemeDensity; detail: "full" | "brief";
}) {
  return places.map(({ id, name, meta, distance, goto }, index) => (
    <kit.KitRow key={id} item={id} label={name} {...{ goto, density }} surface="plain" selected={index + 1 === activePin}
      trailing={distance
        ? <kit.KitText part="distance" role="number" numberScale="compact" tabular tone="muted" density={density}>{distance}</kit.KitText>
        : <kit.KitIcon name="chevron_right" decorative />}>
      <kit.KitText part="name" role="body" density={density}>{name}</kit.KitText>
      {detail === "full" && <kit.KitText part="meta" role="label" tone="muted" density={density}>{meta}</kit.KitText>}
    </kit.KitRow>
  ));
}

// prettier-ignore
export function MapList(input: MapListProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = state === "loading";
  const live = kit.useLiveControls(meta, input);
  const activePin = typeof live.activePin === "number" ? live.activePin : 1;
  const listOnly = live.activeView === "list";
  const { lang, words } = kit.useWords(placesWordsFor);
  const { places, more } = mapListCopy(input.places, kit.useDeviceData(), lang);
  const choices = input.style === undefined
    ? [[words.mapListMap, "map"], [words.mapListList, "list"]] as const
    : [[words.mapListSplit, "split"], [words.mapListMapOnly, "map"], [words.mapListListOnly, "list"]] as const;
  const pins = places.map(({ id, name, position }, index) => ({
    id, ...position, label: words.mapListPin(name), selected: index + 1 === activePin,
    target: { item: id, part: "pin" },
  }));
  return (
    <kit.KitCard part="root" style="inset" padded {...{ density, surface }}>
      {state === "empty" ? <kit.KitEmpty icon="pin" part="empty" decorativeIcon /> : <kit.KitContent density={density}>
        <kit.KitTrack part="view" look="segments" role="radiogroup" label={words.mapListView}>
          <kit.KitGrid density={density} columns={input.style === undefined ? 2 : 3}>
            {choices.map(([label, value]) => <kit.KitChip key={value} item={null} look="segment" role="radio"
              {...{ label, value }} on={live.activeView === value} disabled={loading || undefined} />)}
          </kit.KitGrid>
        </kit.KitTrack>
        <kit.KitContent density={density} group="response">
          {!listOnly && (loading ? <kit.KitCard part="map" style="plain">
            <kit.KitSkeleton shape="media" inset="none" content={[]} />
          </kit.KitCard> : <kit.KitMapTile pins={pins} part="map" />)}
          {typeof live.activePlace === "string" && <kit.KitLayoutText density={density}
            line={{ text: live.activePlace, part: "active_place", role: "meta", strong: true }} />}
          {live.rowsVisible !== false && <kit.KitContent density={density} group={listOnly ? "content" : "response"}>
            {loading ? <kit.KitSkeleton rows={places.length} lead="none" inset="md" density={density}
              items={places.map(({ name, meta, distance }) => ({ title: name, meta: detail === "full" ? meta : undefined, trail: distance ? "value" : "chevron" }))} /> : <>
              <PlaceRows {...{ places, activePin, detail, density }} />
              {more && <kit.KitRow part={null} label={more} density={density}>
                <kit.KitText part="more" role="label" tone="muted" density={density}>{more}</kit.KitText>
              </kit.KitRow>}
            </>}
          </kit.KitContent>}
        </kit.KitContent>
      </kit.KitContent>}
    </kit.KitCard>
  );
}
