import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  planAct,
  readScreen,
  wordsFor,
  type DeviceData,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.MapList;
const { meta, props, examples, fallback, probes } = def;
const board = examples[0]!;
const place = board.places[0]!;
const defs = { MapList: def };
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const root = "home/c1";
const data = (input = board) => ({
  place_results: [
    { shown: input.places.map(({ name, goto }) => ({ name, goto, distanceKm: 1.2 })), total: 8 },
  ],
});
const draw = (input: unknown = board, state: StateName = "filled", deviceData: DeviceData = data()) =>
  addressedElements(renderInstance("MapList", input, state, theme, { deviceData }));
const screen = (state: StateName = "filled", detail: "full" | "brief" = "full") => ({
  id: "home",
  components: [{ ...board, c: "MapList", id: "m1", state, detail }],
});
const chooseView = (value: string) => ({ address: "m1/view", action: "select", value }) as const;
const select = { address: "m1/r2/pin", action: "select" } as const;
const press = { address: "m1/r2", action: "press" } as const;
const inactive = { ok: false, code: "not_actionable" };

describe("MapList contract and boundaries", () => {
  it.each(examples)("accepts sample results", (input) => expect(props.safeParse(input).success).toBe(true));
  it("accepts exact limits and injects ids only for rendering", () => {
    const name = "n".repeat(28);
    const bounded = { name: ` ${name} `, meta: "m".repeat(32), goto: "a".repeat(64) };
    expect(props.parse({ places: Array(6).fill(bounded) })).toMatchObject({
      surface: "card",
      detail: "full",
      places: Array(6).fill({ ...bounded, name, pin: {} }),
    });
    expectTypeOf<Props<typeof props, typeof meta>["places"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    { places: [] },
    { places: Array(7).fill(place) },
    { places: [{ ...place, name: " ".repeat(3) }] },
    { places: [{ ...place, name: "n".repeat(29) }] },
    { places: [{ ...place, meta: "m".repeat(33) }] },
    { places: [{ ...place, goto: "Bad ID" }] },
    { places: [{ ...place, id: "r1" }] },
    { places: [{ ...place, pin: {} }] },
    { places: [{ ...place, position: { x: 0, y: 0 } }] },
    { places: [{ ...place, distanceKm: 2 }] },
    { total: 8 },
    { view: "list" },
    { activePin: 2 },
    { density: "tight" },
    { surface: "tinted" },
    { detail: "none" },
    { color: "red" },
  ])("rejects invalid input %j", (invalid) =>
    expect(props.safeParse({ ...board, ...invalid }).success).toBe(false),
  );
  it("preserves the core near miss, variant write and read probes, tier and pack gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "service" });
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["places"] }).ids.includes("MapList")).toBe(packReady("places"));
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "MapList" }),
      expect.objectContaining({ kind: "choose", expect: "MapPins" }),
      expect.objectContaining({ kind: "write", expect: "MapList" }),
      expect.objectContaining({
        kind: "write",
        expect: "MapList",
        variant: { axis: "detail", value: "brief" },
      }),
      expect.objectContaining({ kind: "read", expect: { address: "m1/view", action: "select" } }),
      expect.objectContaining({ kind: "read", expect: { address: "m1/r1", action: "press" } }),
      expect.objectContaining({ kind: "read", expect: { address: "m1/r1/pin", action: "select" } }),
    ]);
  });
});

describe("MapList fallback", () => {
  it("uses neutral placeholders or bounded cast content", () => {
    const neutral = { name: placeholderTitle(0), meta: wordsFor().placeholderDetail, goto: "details" };
    const things = [{ type: "place", fields: ["name", "note"] }];
    const item = { id: "alder", type: "place", sample: true, name: "Alder Park", note: "Off lead" };
    expect(fallback({ cast: { things: [], items: [] } })).toEqual({ places: [neutral] });
    expect(
      props.safeParse(fallback({ cast: { things, items: [{ ...item, name: 5, id: "bad id" }] } })).success,
    ).toBe(true);
    expect(fallback({ cast: { things, items: [item] } }).places).toEqual([
      { name: item.name, meta: item.note, goto: item.id },
    ]);
  });
});

describe("MapList states and parts", () => {
  it("draws the map and selector and addresses each linked row and live distance", () => {
    const parts = draw();
    for (const part of ["root", "map", "view", "more"]) expect(parts.has(`${root}/${part}`)).toBe(true);
    expect(parts.get(`${root}/view`)?.attributes).toContain('role="radiogroup"');
    expect(parts.get(`${root}/more`)?.text).toEqual(["and 5 more"]);
    for (const [index, row] of board.places.entries()) {
      const key = `${root}/r${index + 1}`;
      expect(parts.get(`${key}/root`)?.attributes).toContain('role="link"');
      expect(parts.get(`${key}/name`)?.text).toEqual([row.name]);
      expect(parts.get(`${key}/meta`)?.text).toEqual([row.meta]);
      expect(parts.get(`${key}/distance`)?.text).toEqual(["1.2 km"]);
    }
  });

  it("preserves addresses when changing finish, hides notes only in brief detail and omits missing live data", () => {
    const addresses = [...draw().keys()];
    expect([...draw({ ...board, density: "compact", surface: "outlined" }).keys()]).toEqual(addresses);
    expect([...draw({ ...board, detail: "brief" }).keys()]).toEqual(
      addresses.filter((key) => !key.endsWith("/meta")),
    );
    const noService = [...draw(board, "filled", {}).keys()];
    expect(noService).toEqual(addresses.filter((key) => !/\/(distance|more)$/.test(key)));
  });

  it("draws a cast-based empty state or an inert map and row skeleton", () => {
    expect([...draw(board, "empty").keys()]).toEqual([`${root}/root`, `${root}/empty`]);
    expect(renderInstance("MapList", board, "empty", theme, { thing: "venue" })).toContain(
      emptyLine("venue"),
    );
    const loading = renderInstance("MapList", board, "loading", theme, { deviceData: data() });
    expect([...addressedElements(loading).keys()]).toEqual([`${root}/root`, `${root}/view`, `${root}/map`]);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toMatch(/role="(button|radio|link)"/);
  });
});

describe("MapList read and act", () => {
  it("reads visible notes, service distances and overflow; brief does not read hidden notes", () => {
    const full = readScreen(screen(), defs, {}, "en", data());
    expect(full).toContain('"Greenhouse Shop": 1.2 km');
    expect(full).toContain("and 5 more");
    expect(full).toContain('"Indoor plants"');
    expect(readScreen(screen("filled", "brief"), defs, {}, "en", data())).not.toContain('"Indoor plants"');
    expect(readScreen(screen(), defs)).not.toContain("and 5 more");
  });
  it("selects locally, keeps navigation separate, and restores pin actions after returning from list only", () => {
    const current = screen();
    const picked = planAct(current, defs, {}, [select]);
    expect(picked).toMatchObject({ ok: true, links: [], values: { "home/m1/$activePin": 2 } });
    if (!picked.ok) throw new Error("Pin selection failed");
    const list = planAct(current, defs, picked.values, [chooseView("list")]);
    if (!list.ok) throw new Error("List selection failed");
    expect(readScreen(current, defs, list.values)).not.toContain("/pin select");
    expect(planAct(current, defs, list.values, [select])).toMatchObject(inactive);
    expect(planAct(current, defs, list.values, [press])).toMatchObject({
      ok: true,
      links: [{ address: "home/m1/r2", goto: "greenhouse" }],
    });
    const map = planAct(current, defs, list.values, [chooseView("map")]);
    if (!map.ok) throw new Error("Map selection failed");
    expect(map.values["home/m1/$activePin"]).toBe(2);
    expect(readScreen(current, defs, map.values)).toContain("[m1/r2/pin select = 2 !needs-service]");
    expect(planAct(current, defs, {}, [chooseView("hybrid")]).ok).toBe(false);
  });
  it.each(["empty", "loading"] as const)("offers no actions while %s", (state) => {
    const current = screen(state);
    expect(readScreen(current, defs, {}, "en", data())).not.toMatch(/select|press|more| km/);
    for (const action of [press, select, chooseView("list")])
      expect(planAct(current, defs, {}, [action])).toMatchObject(inactive);
  });
  it("uses the same selection for pin taps and the live drawing", () => {
    const controller = createScreenController({ screen: screen(), defs });
    try {
      const live = () => controller.liveControls(meta, props.parse(board), "m1");
      expect(controller.press("home/m1/r2/pin")).toMatchObject({ ok: true });
      expect(live()).toMatchObject({ activePin: 2, mapVisible: true });
      expect(controller.act(chooseView("list"))).toMatchObject({ ok: true });
      expect(live()).toMatchObject({ activePin: 2, view: "list", mapVisible: false });
      expect(controller.press("home/m1/r1/pin")).toMatchObject(inactive);
      expect(controller.act(chooseView("map"))).toMatchObject({ ok: true });
      expect(controller.press("home/m1/r1/pin")).toMatchObject({ ok: true });
      expect(live()).toMatchObject({ activePin: 1, view: "map", mapVisible: true });
    } finally {
      controller.dispose();
    }
  });
});
