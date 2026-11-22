import { expect, it } from "vitest";
import { components, planAct, readScreen, type StateName } from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const inactive = { ok: false, code: "not_actionable" };

it("renders venue options only when supplied and keeps the controls outside the link", () => {
  const { examples, props } = components.PlaceCard;
  const venue = examples[0]!;
  const options = { ...venue, badge: "Member deal", saved: false, unit: "mi" };
  const deviceData = { place_details: [{ name: venue.name, goto: venue.goto, distanceKm: 1.609344 }] };
  const draw = (input: unknown, state: StateName = "filled") =>
    addressedElements(renderInstance("PlaceCard", input, state, theme, { deviceData }));
  expect(draw(venue).get("home/c1/distance")?.text).toEqual(["1.609344 km away"]);
  const parts = draw(options);
  expect(parts.get("home/c1/distance")?.text).toEqual(["1 mi away"]);
  expect(parts.has("home/c1/badge")).toBe(true);
  expect(parts.get("home/c1/save")?.attributes).toContain('aria-label="Save"');
  expect(parts.get("home/c1/unit")?.attributes).toContain('role="radiogroup"');
  expect(
    parts
      .get("home/c1/root")
      ?.children.map(({ text }) => text)
      .flat(),
  ).not.toContain("Save");
  expect([...draw(options, "loading").keys()]).toEqual(["home/c1/root"]);
  for (const invalid of [{ badge: "x".repeat(15) }, { saved: "true" }, { unit: "yards" }])
    expect(props.safeParse({ ...venue, ...invalid }).success).toBe(false);
});

it("switches venue units and save state without following goto, and disables omitted controls", () => {
  const defs = { PlaceCard: components.PlaceCard };
  const venue = defs.PlaceCard.examples[0]!;
  const deviceData = { place_details: [{ name: venue.name, goto: venue.goto, distanceKm: 1.609344 }] };
  const screen = (opts = {}, state: StateName = "filled") => ({
    id: "home",
    components: [{ ...venue, c: "PlaceCard", id: "p1", state, ...opts }],
  });
  const save = { address: "p1/save", action: "toggle" } as const;
  const unit = { address: "p1/unit", action: "select", value: "km" } as const;
  const optedIn = screen({ saved: false, unit: "mi" });
  expect(readScreen(optedIn, defs, {}, "en", deviceData)).toContain("1 mi away");
  const first = planAct(optedIn, defs, {}, [save, unit]);
  expect(first).toMatchObject({ ok: true, links: [] });
  if (!first.ok) throw Error("Venue controls rejected");
  const reading = readScreen(optedIn, defs, first.values, "en", deviceData);
  expect(reading).toContain("p1/save toggle:on");
  expect(reading).toContain("1.609344 km away");
  const second = planAct(optedIn, defs, first.values, [save, { ...unit, value: "mi" }]);
  expect(second).toMatchObject({ ok: true, links: [] });
  if (!second.ok) throw Error("Venue controls rejected on repeat");
  expect(readScreen(optedIn, defs, second.values, "en", deviceData)).toContain("p1/save toggle:off");
  for (const action of [save, unit]) {
    expect(planAct(screen(), defs, second.values, [action])).toMatchObject(inactive);
    expect(planAct(screen({ saved: true, unit: "mi" }, "loading"), defs, {}, [action])).toMatchObject(
      inactive,
    );
  }
});

it("gates pins and row links against the current layout without renumbering them", () => {
  const defs = { MapList: components.MapList };
  const { examples, props } = defs.MapList;
  const places = examples[0]!.places;
  expect(props.safeParse({ places, style: "hybrid" }).success).toBe(false);
  const screen = (style: "map" | "list" | "split") => ({
    id: "home",
    components: [{ c: "MapList", id: "m1", style, places }],
  });
  const pin = { address: "m1/r2/pin", action: "select" } as const;
  const row = { address: "m1/r2", action: "press" } as const;
  const view = (value: string) => ({ address: "m1/view", action: "select", value }) as const;
  const start = screen("map");
  const mapped = readScreen(start, defs);
  expect(mapped).toContain("m1/r2/pin select");
  expect(mapped).not.toMatch(/Indoor plants|m1\/r2 press/);
  expect(planAct(start, defs, {}, [row])).toMatchObject(inactive);
  expect(planAct(screen("list"), defs, {}, [pin])).toMatchObject(inactive);
  const explored = planAct(start, defs, {}, [pin, view("list")]);
  expect(explored).toMatchObject({ ok: true, links: [], values: { "home/m1/$activePin": 2 } });
  if (!explored.ok) throw Error("Map view rejected");
  expect(readScreen(start, defs, explored.values)).toContain("Indoor plants");
  expect(planAct(start, defs, explored.values, [row])).toMatchObject({
    ok: true,
    links: [{ goto: "greenhouse" }],
  });
  expect(planAct(start, defs, explored.values, [view("split"), pin])).toMatchObject({ ok: true });
  for (const style of ["map", "list", "split"] as const) {
    const parts = addressedElements(renderInstance("MapList", { style, places }, "filled", theme));
    expect(parts.has("home/c1/map")).toBe(style !== "list");
    expect(parts.has("home/c1/r2/root")).toBe(style !== "map");
    expect(parts.has("home/c1/view")).toBe(true);
  }
});

it("renders and reads alerts and row-specific crowding without changing the row action", () => {
  const defs = { Departures: components.Departures };
  const { examples, props } = defs.Departures;
  const board = examples[2]!;
  const screen = (state: StateName, options = board) => ({
    id: "home",
    components: [{ ...options, c: "Departures", id: "d1", state }],
  });
  const draw = (state: StateName) => addressedElements(renderInstance("Departures", board, state, theme));
  const reading = readScreen(screen("filled"), defs);
  expect(reading).toContain('"8" to "Clifton": 0, Low crowding');
  expect(reading).toContain('Line 9 · Warning: "Use the stop across the street"');
  expect(draw("filled").has("home/c1/alerts")).toBe(true);
  expect(draw("filled").has("home/c1/r2/crowding")).toBe(true);
  expect(draw("empty").has("home/c1/alerts")).toBe(false);
  expect(readScreen(screen("loading"), defs)).not.toMatch(/crowding|across the street/);
  expect(planAct(screen("filled"), defs, {}, [{ address: "d1/r2", action: "press" }])).toMatchObject({
    ok: true,
  });
  const alert = board.alerts![0]!;
  for (const invalid of [
    { alerts: Array(4).fill(alert) },
    { alerts: [{ ...alert, severity: "urgent" }] },
    { alerts: [{ ...alert, line: "x".repeat(7) }] },
    { alerts: [{ ...alert, text: "x".repeat(61) }] },
    { rows: [{ line: "9", to: "Riverside", crowding: "busy" }] },
  ])
    expect(props.safeParse({ ...board, ...invalid }).success).toBe(false);
});
