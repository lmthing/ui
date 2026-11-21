import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Hours;
const { meta, props, examples, fallback, probes } = def;
const [nursery, dogField] = examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const root = "home/c1";
const draw = (input: unknown) => addressedElements(renderInstance("Hours", input, "filled", theme));

beforeEach(() => vi.setSystemTime(new Date(2026, 10, 16, 9, 0)));
afterEach(() => vi.useRealTimers());

describe("Hours contract and boundaries", () => {
  it.each(examples)("accepts real weekly hours", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );

  it("defaults to full detail, orders the week, trims notices and normalizes closed rows", () => {
    const days = [...nursery!.days].reverse().map((day, index) => ({ ...day, closed: index === 0 }));
    const notice = { date: "2028-02-29", text: "x".repeat(24) };
    const parsed = props.parse({ days, special: Array(3).fill({ ...notice, text: ` ${notice.text} ` }) });
    expect(parsed).toMatchObject({ detail: "full", special: Array(3).fill(notice) });
    expect(parsed.days).toEqual([
      ...nursery!.days.slice(0, 6),
      { day: "sun", closed: true, from: "00:00", to: "00:00" },
    ]);
    expectTypeOf<Props<typeof props, typeof meta>["days"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    { days: nursery!.days.slice(1) },
    { days: [...nursery!.days, nursery!.days[0]] },
    { days: Array(7).fill(nursery!.days[0]) },
    { days: [{ ...nursery!.days[0], day: "monday" }, ...nursery!.days.slice(1)] },
    { days: [{ ...nursery!.days[0], from: "24:00" }, ...nursery!.days.slice(1)] },
    { days: [{ ...nursery!.days[0], to: "09:00" }, ...nursery!.days.slice(1)] },
    { days: [{ ...nursery!.days[0], id: "r1" }, ...nursery!.days.slice(1)] },
    { special: Array(4).fill(nursery!.special[0]) },
    { special: [{ date: "2026-02-29", text: "Closed" }] },
    { special: [{ date: "2026-12-24", text: "x".repeat(25) }] },
    { special: [{ date: "2026-12-24", text: " " }] },
    { detail: "none" },
    { density: "tight" },
    { open_state: "open" },
    { color: "red" },
  ])("rejects invalid input %j", (invalid) => {
    expect(props.safeParse({ ...nursery, ...invalid }).success).toBe(false);
  });

  it("keeps core-first probes and gates live use on the pack", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true });
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["places"] }).ids.includes("Hours")).toBe(packReady("places"));
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "Hours" }),
      expect.objectContaining({ kind: "choose", expect: "Timeline" }),
      expect.objectContaining({ kind: "write", expect: "Hours" }),
      expect.objectContaining({
        kind: "write",
        expect: "Hours",
        variant: { axis: "detail", value: "brief" },
      }),
    ]);
  });
});

describe("Hours fallback", () => {
  it("preserves the neutral schedule without inferring hours from unrelated cast text", () => {
    const things = [{ type: "venue", fields: ["name", "note"] }];
    const venue = { id: "venue", type: "venue", sample: true, name: "Riverside", note: "North entrance" };
    const empty = fallback({ cast: { things: [], items: [] } });
    for (const cast of [
      { things, items: [venue] },
      { things, items: [{ ...venue, note: 7 }] },
    ]) {
      expect(fallback({ cast })).toEqual(empty);
    }
    expect(props.parse(empty).days.map(({ day }) => day)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]);
    expect(empty.days.every(({ from, to, closed }) => closed && from === "00:00" && to === "00:00")).toBe(
      true,
    );
    expect(empty.special).toEqual([]);
  });
});

describe("Hours filled state and parts", () => {
  it("addresses all seven rows and only their actual time or closed parts, marking today", () => {
    expect(meta.states).toEqual(["filled"]);
    const parts = draw(dogField);
    for (const part of meta.parts) expect(parts.has(`${root}/${part}`)).toBe(true);
    expect(parts.get(`${root}/r1/root`)?.attributes).toContain('aria-label="Monday · Today"');
    for (const [index, row] of dogField!.days.entries()) {
      const address = `${root}/r${index + 1}`;
      if (index > 0) expect(parts.get(`${address}/root`)?.attributes).not.toContain("Today");
      expect(parts.has(`${address}/day`)).toBe(true);
      expect(parts.has(`${address}/closed`)).toBe(row.closed);
      expect(parts.has(`${address}/from`)).toBe(!row.closed);
      expect(parts.has(`${address}/to`)).toBe(!row.closed);
    }
  });

  it("keeps compact addresses and hides only the notice group in brief or without notices", () => {
    const addresses = [...draw(nursery).keys()];
    const withoutNotices = addresses.filter((address) => address !== `${root}/special`);
    expect([...draw({ ...nursery, density: "compact" }).keys()]).toEqual(addresses);
    expect([...draw({ ...nursery, detail: "brief" }).keys()]).toEqual(withoutNotices);
    expect([...draw({ ...nursery, special: [] }).keys()]).toEqual(withoutNotices);
  });
});

describe("Hours read and act", () => {
  it("reads the same computed opening status, weekly hours and shown notices", () => {
    expect(draw(nursery).get(`${root}/open_state`)?.text).toEqual(["Open now · closes 18:00"]);
    for (const line of ["Open now · closes 18:00", "Monday: 09:00–18:00", '2026-12-24: "Closes at 14:00"']) {
      expect(readComponent(def, nursery, "h1").join("\n")).toContain(line);
    }
    expect(readComponent(def, { ...nursery, detail: "brief" }, "h1").join("\n")).not.toContain("Closes at");
    vi.setSystemTime(new Date(2026, 11, 24, 10));
    const onHoliday = { ...nursery, detail: "brief" };
    expect(draw(onHoliday).get(`${root}/open_state`)?.text).toEqual(["Special hours today"]);
    expect(readComponent(def, onHoliday, "h1").join("\n")).toContain('"Closes at 14:00"');
  });

  it("never offers any action on the status, schedule or notices", () => {
    expect(affordancesOf(meta, props.parse(nursery), "h1")).toEqual([]);
    const screen = { id: "home", components: [{ ...nursery, c: "Hours", id: "h1" }] };
    for (const part of ["root", "open_state", "r1", "r1/from", "special"]) {
      expect(planAct(screen, { Hours: def }, {}, [{ address: `h1/${part}`, action: "press" }])).toMatchObject(
        {
          ok: false,
          code: "not_actionable",
        },
      );
    }
  });
});
