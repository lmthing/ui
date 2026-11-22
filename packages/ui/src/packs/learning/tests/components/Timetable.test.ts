import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  stampItemIds,
  type CastLike,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";
import { weekdays } from "../../copy";

const { Timetable } = components;
const { props, meta, examples, fallback, probes } = Timetable;
const first = examples[0]!;
const monday = first.days[0]!;
const period = monday.periods[0]!;
const inputWith = (patch: object) => ({ days: [{ ...monday, periods: [{ ...period, ...patch }] }] });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ id: "t1", c: "Timetable", ...first }] };

describe("Timetable contract", () => {
  it.each(examples)("parses a domain example", (input) => expect(props.safeParse(input).success).toBe(true));
  it.each([
    {},
    { days: [] },
    { days: [monday, monday] },
    { days: Array(8).fill(monday) },
    { days: [{ ...monday, day: "today" }] },
    { days: [{ ...monday, periods: [] }] },
    { days: [{ ...monday, periods: Array(9).fill(period) }] },
    { ...first, selected_day: "today" },
    { ...first, periods: [] },
    { ...first, color: "#000" },
    { ...first, detail: "none" },
    inputWith({ time: "24:00" }),
    inputWith({ time: "9:00" }),
    inputWith({ subject: " " }),
    inputWith({ subject: "x".repeat(25) }),
    inputWith({ room: "x".repeat(13) }),
    inputWith({ teacher: "x".repeat(25) }),
    inputWith({ tone: "red" }),
    inputWith({ current: true }),
    inputWith({ id: "r1" }),
  ])("rejects invalid or code-owned wire data", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts exact dense limits and applies variant defaults", () => {
    const row = { ...period, subject: "x".repeat(24), room: "x".repeat(12), teacher: "x".repeat(24) };
    const days = weekdays.map((day) => ({ day, periods: Array(8).fill(row) }));
    expect(props.parse({ days })).toMatchObject({ detail: "full" });
    expect(props.parse({ ...first, selected_day: "tue" }).selected_day).toBeUndefined();
  });
  it("keeps the pack gate, tier and core near miss", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "phone", dense: true });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Timetable" }),
        expect.objectContaining({ kind: "choose", expect: "Timeline" }),
        expect.objectContaining({
          kind: "write",
          expect: "Timetable",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "t1/day", action: "select" } }),
        expect.objectContaining({ kind: "read", expect: { address: "t1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Timetable fallback and states", () => {
  it("uses bounded cast fields or shared placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "record", fields: ["name", "summary"] }],
      items: [{ id: "one", type: "record", sample: true, name: "Record one", summary: "Detail" }],
    };
    const malformed: CastLike = {
      ...cast,
      items: [{ id: "bad", type: "record", sample: true, name: 9, summary: false }],
    };
    for (const value of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast: empty }).days[0]?.periods[0]?.subject).toBe(placeholderTitle(0));
    expect(fallback({ cast }).days[0]?.periods[0]).toMatchObject({
      subject: "Record one",
      teacher: "Detail",
    });
  });
  it("draws a shared empty state without any timetable controls", () => {
    const html = renderInstance("Timetable", first, "empty", theme);
    expect(html).toContain(emptyLine());
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root", "home/c1/title"]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(first)), "t1", {}, "empty")).toEqual([]);
    expect(readComponent(Timetable, first, "t1", "empty").join("\n")).not.toContain("Fern care");
  });
});

describe("Timetable parts and read/act", () => {
  const addresses = (axes = {}) =>
    addressedElements(renderInstance("Timetable", { ...first, ...axes }, "filled", theme));
  it("preserves all addresses across finish axes and hides only optional detail parts in brief", () => {
    const full = addresses();
    expect(full.get("home/c1/day")?.attributes).toContain('role="radiogroup"');
    expect(full.get("home/c1/r1/root")?.attributes).toContain('role="button"');
    expect(full.get("home/c1/r1/time")?.text).toContain("09:00");
    expect(full.get("home/c1/r1/subject")?.text).toContain("Fern care");
    expect(full.get("home/c1/r1/room")?.text).toContain("B12");
    expect(full.get("home/c1/r1/teacher")?.text).toContain("Ms Tanaka");
    expect(full.has("home/c1/r3/teacher")).toBe(false);
    expect(full.has("home/c1/r5/room")).toBe(false);
    expect([...addresses({}).keys()]).toEqual([...full.keys()]);
    expect([...addresses({ detail: "brief" }).keys()]).toEqual(
      [...full.keys()].filter((id) => !/\/(?:room|teacher)$/.test(id)),
    );
    const brief = readComponent(Timetable, { ...first, detail: "brief" }, "t1").join("\n");
    expect(brief).toContain("09:00 · Fern care");
    expect(brief).not.toContain("Ms Tanaka");
    expect(brief).not.toContain("B12");
  });
  it("puts the current or selected weekday first without renumbering period roots", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18, 11));
    try {
      const initial = addresses();
      expect(
        [...initial.keys()].filter((id) => /\/r\d+\/root$/.test(id)).map((id) => id.split("/")[2]),
      ).toEqual(["r4", "r5", "r1", "r2", "r3"]);
      expect(initial.get("home/c1/r4/root")?.attributes).toContain('aria-current="true"');
      const selected = addresses({ selected_day: "mon" });
      expect(selected.get("home/c1/r1/subject")?.text).toContain("Fern care");
      expect([...selected.keys()].indexOf("home/c1/r1/root")).toBeLessThan(
        [...selected.keys()].indexOf("home/c1/r4/root"),
      );
      const summary = readComponent(Timetable, first, "t1").join("\n");
      expect(summary).toContain("r4: 10:30 · Soil workshop · Glasshouse");
      vi.setSystemTime(new Date(2026, 10, 20, 11));
      expect(readComponent(Timetable, first, "t1").join("\n")).toBe(summary);
    } finally {
      vi.useRealTimers();
    }
  });
  it("offers only scheduled weekdays and accepts presses at the exact period address", () => {
    const run = (address: string, action: string, value?: string) =>
      planAct(screen, { Timetable }, {}, [{ address, action, value }]);
    expect(run("t1/day", "select", "tue")).toMatchObject({ ok: false });
    expect(run("t1/day", "select", "wed")).toMatchObject({
      ok: true,
      values: { "home/t1/$selected_day": "wed" },
    });
    expect(run("t1/r4", "press")).toMatchObject({ ok: true });
    expect(run("t1/r6", "press")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(run("t1/r4/time", "press")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(meta).not.toHaveProperty("confirmParts");
  });
});
