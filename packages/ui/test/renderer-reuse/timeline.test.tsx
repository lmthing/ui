import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import {
  checkScreen,
  components,
  createRegistry,
  packExamples,
  writerFormat,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createScreenController, PhoneScreen } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const fixtures = [
  {
    pack: "home",
    archetype: "family",
    layout: "agenda",
    id: "a1",
    c: "Agenda",
    fields: ["c", "days", "goto", "group", "surface"],
    part: "r1/who",
    action: "[a1/add press→add_event]",
  },
  {
    pack: "trips",
    archetype: "trip",
    layout: "overview",
    id: "i1",
    c: "Itinerary",
    fields: ["c", "days", "density", "detail", "surface"],
    part: "r4/duration_1",
    action: "[i1/r4/stop_1 press→pass]",
  },
] as const;

it.each(fixtures)("replays $archetype/$layout with its saved $c line and flat Writer contract", (fixture) => {
  const { pack, archetype, layout, id, c, fields, part, action } = fixture;
  const registry = createRegistry({ packs: [pack], includeDrafts: true });
  const writer = writerFormat(registry).json_schema.schema.anyOf!;
  const schema = writer.find((branch) => branch.properties?.c?.const === c)!;
  expect(Object.keys(schema.properties!).sort()).toEqual(fields);
  expect(schema.additionalProperties).toBe(false);
  const day = schema.properties!.days!.items!;
  expect(day.additionalProperties).toBe(false);
  const nested = day.properties![c === "Agenda" ? "events" : "stops"]!;
  expect(nested.maxItems).toBe(6);
  expect(nested.items!.properties).not.toHaveProperty("c");
  expect(nested.items!.additionalProperties).toBe(false);

  const lines: ScreenLike["components"] = packExamples[pack]
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const saved = lines.find((line) => line.id === id && line.c === c)!;
  const screen = registry.defaultLines(archetype, layout, { things: [], items: [] });
  const replay = { ...screen, components: screen.components.map((line) => (line.id === id ? saved : line)) };
  expect(replay.components.find((line) => line.c === c)).toBe(saved);
  expect(checkScreen(replay, registry)).toEqual([]);
  const { id: _id, c: _c, ...input } = saved;
  const html = renderInstance(c, input, "filled", theme, { component: id });
  expect(addressedElements(html).has(`home/${id}/${part}`)).toBe(true);

  const controller = createScreenController({ screen: replay, defs: components });
  try {
    expect(controller.read()).toContain(action);
    expect(controller.snapshotScreen()).toEqual(replay);
  } finally {
    controller.dispose();
  }
});

const days = [
  { date: "2027-03-04", place: "Tokyo", stops: [{ title: "Check in", kind: "stay", goto: "inn" }] },
  {
    date: "2027-03-05",
    place: "Kyoto",
    stops: [
      ...Array.from({ length: 5 }, (_, index) => ({
        title: `Visit ${index + 1}`,
        kind: "stop",
        goto: "garden",
      })),
      { title: "Train", time: "14:00", kind: "travel", minutes: 130, goto: "train" },
    ],
  },
];
const screen = { id: "trip", components: [{ id: "i1", c: "Itinerary", days }] };

it("uses one addressed list item per stop and keeps time distinct from all-day and duration", () => {
  const full = renderInstance("Itinerary", { days }, "filled", theme);
  const parts = addressedElements(full);
  const at = (part: string) => parts.get(`home/c1/${part}`);
  expect(full.match(/role="listitem"/g)).toHaveLength(7);
  expect(at("r1/stop_1_time")?.text).toEqual(["Time TBD"]);
  expect(at("r2/stop_6_time")?.text).toEqual(["14:00"]);
  expect(at("r2/duration_6")?.text).toEqual(["2 h 10 min"]);
  expect(at("r2/stop_6")?.attributes).toContain('role="link"');
  expect(at("r2/stop_7")).toBeUndefined();
  const brief = addressedElements(renderInstance("Itinerary", { days, detail: "brief" }, "filled", theme));
  expect([...brief.keys()]).toEqual([...parts.keys()].filter((part) => !part.endsWith("/duration_6")));
});

it("starts the current day open in the phone and dispatches each fold and stop through the parent", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2027, 2, 5, 10));
  const onLink = vi.fn();
  const controller = createScreenController({ screen, defs: components, onLink });
  try {
    const html = renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
        <PhoneScreen {...{ screen, theme }} />
      </TamaguiProvider>,
    );
    const parts = addressedElements(html);
    expect(parts.get("trip/i1/r1/root")?.attributes).toContain('aria-expanded="false"');
    expect(parts.get("trip/i1/r2/root")?.attributes).toContain('aria-expanded="true"');
    expect(parts.has("trip/i1/r1/stop_1")).toBe(false);
    expect(parts.has("trip/i1/r2/stop_6")).toBe(true);
    expect(controller.press("trip/i1/r1/root")).toMatchObject({ ok: true });
    expect(controller.store.get("trip/i1/r1")).toBe(true);
    expect(controller.store.get("trip/i1/r2")).toBeUndefined();
    expect(controller.press("trip/i1/r1/root")).toMatchObject({ ok: true });
    expect(controller.store.get("trip/i1/r1")).toBe(false);
    expect(controller.press("trip/i1/r2/stop_6")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith("train", "trip/i1/r2/stop_6");
    expect(controller.press("trip/i1/r2/stop_7")).toMatchObject({ ok: false });
  } finally {
    controller.dispose();
    vi.useRealTimers();
  }
});
