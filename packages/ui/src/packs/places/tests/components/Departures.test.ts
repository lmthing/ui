import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  placeholderValue,
  planAct,
  readScreen,
  type DeviceData,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Departures;
const { props, meta, examples, fallback, probes } = def;
const board = examples[0]!;
const defs = { Departures: def };
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const root = "home/c1";
const deviceData = meta.previewDeviceData({ input: board, state: "filled" });
const draw = (input: unknown = board, state: StateName = "filled", data: DeviceData = deviceData) =>
  addressedElements(renderInstance("Departures", input, state, theme, { deviceData: data }));
const screen = (state: StateName = "filled", detail: "full" | "brief" = "full") => ({
  id: "home",
  components: [{ ...board, c: "Departures", id: "d1", state, detail }],
});

describe("Departures contract and boundaries", () => {
  it.each(examples)("accepts real departures", (input) => expect(props.safeParse(input).success).toBe(true));

  it("defaults its axes, trims text and accepts exact upper bounds", () => {
    const stop = "s".repeat(32);
    const row = { line: "l".repeat(6), to: "t".repeat(28) };
    const rows = Array.from({ length: 6 }, () => row);
    expect(props.parse({ stop: ` ${stop} `, rows })).toMatchObject({
      stop,
      rows,
      detail: "full",
    });
    expectTypeOf<Props<typeof props, typeof meta>["rows"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    { stop: "" },
    { stop: "a".repeat(33) },
    { rows: [] },
    { rows: Array(7).fill(board.rows[0]) },
    { rows: [{ ...board.rows[0], line: "a".repeat(7) }] },
    { rows: [{ ...board.rows[0], to: "a".repeat(29) }] },
    { rows: [{ ...board.rows[0], to: " " }] },
    { rows: [{ ...board.rows[0], id: "r1" }] },
    { rows: [{ ...board.rows[0], minutes: 2 }] },
    { rows: [{ ...board.rows[0], delay: 2 }] },
    { total: 8 },
    { more: 2 },
    { density: "tight" },
    { surface: "tinted" },
    { detail: "none" },
    { color: "red" },
  ])("rejects invalid input %j", (invalid) =>
    expect(props.safeParse({ ...board, ...invalid }).success).toBe(false),
  );

  it("keeps core-first probes, the service tier and pack readiness gating", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "service" });
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["places"] }).ids.includes("Departures")).toBe(packReady("places"));
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "Departures" }),
      expect.objectContaining({ kind: "choose", expect: "Timeline" }),
      expect.objectContaining({ kind: "write", expect: "Departures" }),
      expect.objectContaining({
        kind: "write",
        expect: "Departures",
        variant: { axis: "detail", value: "brief" },
      }),
      expect.objectContaining({ kind: "read", expect: { address: "d1/r2", action: "press" } }),
    ]);
  });
});

describe("Departures fallback", () => {
  it("uses only bounded cast titles and neutral placeholders, including for malformed casts", () => {
    const things = [{ type: "place", fields: ["name"] }];
    const item = { id: "stop", type: "place", sample: true, name: "Nursery Gate" };
    const destination = { ...item, id: "dest", name: "Greenhouse Lane" };
    const neutral = {
      stop: placeholderTitle(0),
      rows: [{ line: placeholderValue, to: placeholderTitle(1) }],
    };
    expect(fallback({ cast: { things: [], items: [] } })).toEqual(neutral);
    expect(fallback({ cast: { things, items: [{ ...item, name: 3 }] } })).toEqual(neutral);
    expect(props.parse(fallback({ cast: { things, items: [item, destination] } }))).toMatchObject({
      stop: "Nursery Gate",
      rows: [{ line: placeholderValue, to: "Greenhouse Lane" }],
    });
  });
});

describe("Departures states and parts", () => {
  it("draws line badges, destinations and live minutes, with delay only on the late row", () => {
    const parts = draw();
    for (const part of ["root", "stop", "more"]) expect(parts.has(`${root}/${part}`)).toBe(true);
    expect(parts.get(`${root}/stop`)?.text).toEqual(["Nursery Gate"]);
    expect(parts.get(`${root}/more`)?.text).toEqual(["and 2 more"]);
    expect(parts.has(`${root}/empty`)).toBe(false);
    for (const [index, row] of board.rows.entries()) {
      const address = `${root}/r${index + 1}`;
      expect(parts.get(`${address}/root`)?.attributes).toContain('role="button"');
      expect(parts.has(`${address}/line`)).toBe(true);
      expect(parts.get(`${address}/to`)?.text).toEqual([row.to]);
      expect(parts.has(`${address}/minutes`)).toBe(true);
      expect(parts.has(`${address}/delay`)).toBe(index === 1);
    }
    expect(parts.get(`${root}/r1/minutes`)?.text).toEqual(["2 min"]);
    expect(parts.get(`${root}/r2/delay`)?.text).toEqual(["4 min late"]);
  });

  it("keeps addresses for finish axes and hides only separate delay parts in brief detail", () => {
    const present = [...draw().keys()];
    expect([...draw({ ...board }).keys()]).toEqual(present);
    const brief = draw({ ...board, detail: "brief" });
    expect([...brief.keys()]).toEqual(present.filter((address) => !address.endsWith("/delay")));
    const time = brief.get(`${root}/r2/minutes`);
    expect(time?.text).toEqual(["8 min"]);
    expect(time?.children[0]?.text).toEqual([" · Late"]);
  });

  it("draws neutral times without inventing delays or totals when there is no device data", () => {
    const parts = draw(board, "filled", {});
    expect(parts.get(`${root}/r1/minutes`)?.text).toEqual([placeholderValue]);
    expect(parts.has(`${root}/r2/delay`)).toBe(false);
    expect(parts.has(`${root}/more`)).toBe(false);
  });

  it("renders an inert empty message or loading shape instead of any row targets", () => {
    const empty = draw(board, "empty");
    expect([...empty.keys()]).toEqual(["home/c1/root", "home/c1/stop", "home/c1/empty"]);
    expect(empty.get(`${root}/empty`)?.text).toEqual(["No departures to show"]);
    expect(renderInstance("Departures", board, "empty", theme, { thing: "bus" })).toContain(emptyLine("bus"));
    const loading = renderInstance("Departures", board, "loading", theme, { deviceData });
    const loadingParts = addressedElements(loading);
    expect([...loadingParts.keys()]).toEqual([
      `${root}/root`,
      ...board.rows.map((_, index) => `${root}/r${index + 1}/line`),
    ]);
    for (const [address, part] of loadingParts)
      if (address.endsWith("/line")) expect(part.attributes).toContain('aria-hidden="true"');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="button"');
  });
});

describe("Departures read and act", () => {
  it("reads the same service times, delays and overflow, including brief changes", () => {
    const full = readScreen(screen(), defs, {}, "en", deviceData);
    expect(full).toContain('"24A" to "Botanic Gardens": 8 min, 4 min late');
    expect(full).toContain("and 2 more");
    expect(full).toContain("[d1/r2 press !needs-service]");
    const brief = readScreen(screen("filled", "brief"), defs, {}, "en", deviceData);
    expect(brief).toContain('"24A" to "Botanic Gardens": 8 min · Late');
    expect(brief).not.toContain("4 min late");
  });

  it.each(["empty", "loading"] as const)(
    "keeps the %s metadata read free of hidden rows and counts even with a service snapshot",
    (state) => {
      expect(meta.read(props.parse(board), state, "en", deviceData)).toEqual([]);
    },
  );

  it("allows a filled row press without linking and rejects non-actions and inactive states", () => {
    const press = { address: "d1/r2", action: "press" } as const;
    expect(planAct(screen(), defs, {}, [press])).toMatchObject({ ok: true, links: [] });
    for (const state of ["loading", "empty"] as const) {
      expect(readScreen(screen(state), defs, {}, "en", deviceData)).not.toContain("press");
      expect(planAct(screen(state), defs, {}, [press])).toMatchObject({ ok: false, code: "not_actionable" });
    }
    for (const part of ["root", "stop", "more", "r2/line", "r2/to", "r2/minutes", "r2/delay"]) {
      expect(planAct(screen(), defs, {}, [{ ...press, address: `d1/${part}` }])).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
    }
  });
});
