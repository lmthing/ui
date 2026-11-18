import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Calendar;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const month = "June 2026";

describe("Calendar schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives selectable visible days", () => {
    expect(props.parse({ month: `  ${month}  `, marked: [{ day: 3 }] })).toEqual({
      month,
      style: "week",
      start: 1,
      days: 30,
      marked: Array.from({ length: 7 }, (_, index) => ({
        day: index + 1,
        tone: "neutral",
        mark: index === 2 ? "neutral" : undefined,
      })),
    });
  });
  it.each([
    {},
    { month },
    { month, marked: [], style: "day" },
    { month: "", marked: [] },
    { month: "   ", marked: [] },
    { month: "x".repeat(17), marked: [] },
    { month: 4, marked: [] },
    { month, marked: Array.from({ length: 13 }, (_, index) => ({ day: index + 1 })) },
    ...[0, 32, 1.5, "12", NaN, Infinity].map((day) => ({ month, marked: [{ day }] })),
    { month, marked: [{ day: 2, tone: "accent" }] },
    { month, marked: [{ day: 2, color: "green" }] },
    { month, marked: [{ day: 2, id: "r2" }] },
    { month, marked: [{ day: 2 }, { day: 2, tone: "good" }] },
    { month, marked: [{ day: 31 }], days: 30 },
    ...[0, 32, 1.5, "12"].map((selected) => ({ month, marked: [], selected })),
    { month, marked: [], selected: 29, days: 28 },
    ...[0, 8, 1.5, "1"].map((start) => ({ month, marked: [], start })),
    ...[27, 32, 28.5, "30"].map((days) => ({ month, marked: [], days })),
    { month, marked: [], color: "red" },
    { month, marked: [], pixels: 44 },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts maximum text, mark count, day bounds and all tones", () => {
    expect(
      props.safeParse({
        month: "x".repeat(16),
        style: "month",
        days: 31,
        start: 7,
        selected: 31,
        marked: Array.from({ length: 12 }, (_, index) => ({
          day: index === 11 ? 31 : index + 1,
          tone: (["neutral", "good", "warn", "bad"] as const)[index % 4],
        })),
      }).success,
    ).toBe(true);
  });
  it("adds ids only to view props, never wire input", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["marked"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["marked"][number]["day"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(props.safeParse({ month, marked: [{ day: 1, root: "r1" }] }).success).toBe(false);
  });
});

describe("Calendar days, reading and rendering", () => {
  it.each([1, 2, 3, 4, 5, 6, 7])("lays out every month length and last week for start %s", (start) => {
    for (const days of [28, 29, 30, 31]) {
      for (const style of ["week", "month"]) {
        const input = { month, marked: [], start, days, selected: days, style };
        const parsed = props.parse(input);
        const first = style === "month" ? 1 : Math.max(1, days - ((start + days - 2) % 7));
        expect(parsed.marked.map((day) => day.day)).toEqual(
          Array.from({ length: days - first + 1 }, (_, index) => first + index),
        );
        const stamped = stampItemIds(meta, parsed);
        expect(affordancesOf(meta, stamped, "c1")).toEqual(
          parsed.marked.map((_, index) => ({
            address: `c1/r${index + 1}`,
            part: "root",
            action: "select",
            detail: "",
          })),
        );
        const html = renderInstance("Calendar", input, "filled", theme);
        expect(html.match(/role="button"/g)).toHaveLength(parsed.marked.length);
        expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
        for (const [index, day] of parsed.marked.entries()) {
          const tag = html.match(new RegExp(`<[^>]*data-testid="home/c1/r${index + 1}/root"[^>]*>`))?.[0];
          expect(tag).toContain(`aria-label="${month} ${day.day}"`);
          expect(tag).toContain(`aria-pressed="${day.day === days}"`);
        }
      }
    }
  });
  it("uses selected, then the first supplied mark, then day one as the week anchor", () => {
    const input = { month, start: 7, marked: [{ day: 12, tone: "good" }, { day: 2 }] };
    expect(props.parse(input).marked.map((day) => day.day)).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(props.parse({ ...input, selected: 1 }).marked.map((day) => day.day)).toEqual([1]);
    expect(props.parse({ ...input, marked: [] }).marked.map((day) => day.day)).toEqual([1]);
    const html = renderInstance("Calendar", { ...input, selected: undefined }, "filled", theme);
    expect(html.match(/aria-pressed="true"/g) ?? []).toHaveLength(0);
  });
  it("includes all visible dates and their select addresses in the read", () => {
    const input = { month, style: "month", days: 31, marked: [{ day: 12, tone: "good" }] };
    const read = readComponent(components.Calendar, input, "c1").join("\n");
    for (let day = 1; day <= 31; day++) {
      expect(read).toContain(`r${day}: ${day}`);
      expect(read).toContain(`[c1/r${day} select]`);
    }
    expect(read).toContain("r12: 12 (good)");
    expect(read).toContain(`"${month}"`);
  });
});

describe("Calendar fallback and metadata", () => {
  it("validates empty, matching and malformed casts without inventing marks", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      { things: [], items: [{ id: "entry", type: "entry", sample: true, name: 4 }] },
    ];
    for (const cast of casts) {
      expect(fallback({ cast })).toEqual({ month: "This month", marked: [] });
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
  });
  it("has the required metadata and well-formed choose, write and read probes", () => {
    expect(meta).toMatchObject({ id: "Calendar", group: "data", region: "body", weight: 3, tier: "phone" });
    expect(meta.parts).toEqual(["root", "month"]);
    expect(meta.items).toEqual({ key: "marked", parts: ["root", "label"] });
    expect(meta.states).toEqual(["filled"]);
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Timeline");
    expect(meta.pick).toContain("List");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Timeline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Calendar" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Open the 12th",
      expect: { address: "c1/r12", action: "select" },
    });
  });
  it("builds a data-only registry with tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Calendar");
    expect(registry.schema("Calendar")).toBe(props);
    expect(registry.resolve("c-a-l-e-n-d-a-r")).toBe("Calendar");
    expect(registry.resolve("c-a-l-e-n-d-a-r")).toBe("Calendar");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
