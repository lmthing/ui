import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  wordsFor,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, styleAt } from "../../../../../test/render";

const def = components.Timesheet;
const { props, meta, examples, fallback, probes } = def;
const full = examples[0]!;
const row = full.rows[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const emptyCast: CastLike = { things: [], items: [] };
const view = (input: unknown, state: "filled" | "empty" = "filled") =>
  renderInstance("Timesheet", input, state, theme);

describe("Timesheet schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("accepts eight bounded rows, trims text and defaults to a full card", () => {
    const title = "x".repeat(20);
    const bound = { name: ` ${title} `, hours: [0, 0.25, 1, 12, 16, 23.5, 24], approved: true };
    const rows = Array.from({ length: 8 }, () => bound);
    expect(props.parse({ period: ` ${title} `, rows })).toMatchObject({
      period: title,
      detail: "full",
      rows: rows.map((item) => ({ ...item, name: title })),
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["rows"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
  it.each([
    {},
    { ...full, period: "" },
    { ...full, period: "x".repeat(21) },
    { ...full, rows: [] },
    { ...full, rows: Array.from({ length: 9 }, () => row) },
    { ...full, density: "small" },
    { ...full, surface: "flat" },
    { ...full, detail: "summary" },
    { ...full, color: "red" },
  ])("rejects invalid component input %j", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
  it.each([
    { name: " " },
    { name: "x".repeat(21) },
    { hours: [1, 2, 3, 4, 5, 6] },
    { hours: [1, 2, 3, 4, 5, 6, 7, 8] },
    { hours: [-0.1, 2, 3, 4, 5, 6, 7] },
    { hours: [24.1, 2, 3, 4, 5, 6, 7] },
    { hours: [NaN, 2, 3, 4, 5, 6, 7] },
    { hours: ["0", 2, 3, 4, 5, 6, 7] },
    { approved: undefined },
    { approved: "yes" },
    { total: 40 },
    { overtime: 2 },
    { id: "r1" },
  ])("rejects invalid or computed row input %j", (input) => {
    expect(props.safeParse({ ...full, rows: [{ ...row, ...input }] }).success).toBe(false);
  });
});

describe("Timesheet fallback and metadata", () => {
  it("uses bounded cast copy or neutral placeholders, without inventing time records", () => {
    const cast: CastLike = {
      things: [{ type: "person", fields: ["name", "detail"] }],
      items: Array.from({ length: 10 }, (_, index) => ({
        id: `person_${index}`,
        type: "person",
        sample: true,
        name: index ? "a".repeat(30) : "Cameron",
        detail: "16–22 Nov",
      })),
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "bad", type: "person", sample: true, name: 42 }],
    };
    for (const content of [emptyCast, cast, malformed])
      expect(props.safeParse(fallback({ cast: content })).success).toBe(true);
    const hours = [0, 0, 0, 0, 0, 0, 0];
    expect(fallback({ cast }).rows).toHaveLength(8);
    expect(fallback({ cast })).toMatchObject({ period: "16–22 Nov" });
    expect(fallback({ cast }).rows[0]).toEqual({ name: "Cameron", hours, approved: false });
    for (const content of [emptyCast, malformed]) {
      expect(fallback({ cast: content })).toEqual({
        period: wordsFor().placeholderDetail,
        rows: [{ name: placeholderTitle(0), hours, approved: false }],
      });
    }
  });
  it("keeps the people tier, core near miss, detail write and row approval probe", () => {
    expect(meta.tier).toBe("people");
    expect(meta.dense).toBe(true);
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Bars");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Timesheet" }),
        expect.objectContaining({ kind: "choose", expect: "Bars" }),
        expect.objectContaining({
          kind: "write",
          expect: "Timesheet",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "t1/r1/approve", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("Timesheet")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("Timesheet")).toBe(packReady("team"));
  });
});

describe("Timesheet parts, reading and variants", () => {
  it("shows each day, addressed totals and warning overtime, with a button only for the pending row", () => {
    const html = view(full);
    const parts = addressedElements(html);
    for (const part of ["root", "period", "matrix"]) expect(parts.has(`home/c1/${part}`)).toBe(true);
    for (const part of meta.items.parts) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(!["approved", "punches"].includes(part));
      expect(parts.has(`home/c1/r2/${part}`)).toBe(!["approve", "approve_label", "punches"].includes(part));
    }
    expect(html.match(/data-testid="home\/c1\/r1\/hours"/g)).toHaveLength(1);
    for (const day of wordsFor().weekdayShort) expect(html).toContain(`>${day}<`);
    expect(parts.get("home/c1/r1/total")?.text).toEqual(["43.5 h"]);
    expect(parts.get("home/c1/r1/overtime")?.text).toEqual(["3.5 h"]);
    expect(styleAt(html, "home/c1/r1/overtime")).toContain("var(--warn)");
    expect(parts.get("home/c1/r2/approved")?.attributes).not.toContain('role="button"');
    expect(html).toContain(">Approved<");
    expect(parts.get("home/c1/r1/approve")?.attributes).toContain('role="button"');
    const reading = readComponent(def, full, "t1").join("\n");
    expect(reading).toContain("Fri 7.5, Sat 4, Sun 0 · Total 43.5 h · Overtime 3.5 h · Status Approve");
    expect(reading).toContain("Total 15 h · Overtime — · Status Approved");
    expect(reading).toContain("[t1/r1/approve press");
    expect(reading).not.toContain("t1/r2/approve press");
  });
  it("keeps finish addresses; brief hides only daily hours and leaves their values intact", () => {
    const addresses = (input: unknown) => [...addressedElements(view(input)).keys()];
    const standard = addresses(full);
    expect(addresses({ ...full })).toEqual(standard);
    expect(addresses({ ...full })).toEqual(standard);
    const brief = { ...full, detail: "brief" } as const;
    expect(props.parse(brief).rows[0]?.hours).toEqual(row.hours);
    expect(addresses(brief)).toEqual(standard.filter((part) => !part.endsWith("/hours")));
    expect(view(brief)).not.toContain(">Mon<");
    const reading = readComponent(def, brief, "t1").join("\n");
    expect(reading).not.toContain("Mon 8");
    expect(reading).toContain("Total 43.5 h · Overtime 3.5 h");
    expect(reading).toContain("[t1/r1/approve press");
  });
});

it("lets an employee review their punches before submitting, without offering manager approval", () => {
  const input = examples[2]!;
  const html = view(input);
  expect(html).toContain("07:00–11:00");
  expect(html).toContain("Clock punches");
  const parts = addressedElements(html);
  expect(parts.has("home/c1/r1/approve")).toBe(false);
  expect(parts.has("home/c1/submit")).toBe(true);
  expect(view({ ...input, detail: "brief" })).not.toContain("07:00–11:00");
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...input, id: "t1", c: "Timesheet" }] },
    defs: components,
    onAction,
  });
  expect(controller.read()).toContain("Monday 07:00–11:00");
  expect(controller.press("t1/r1/approve").ok).toBe(false);
  expect(controller.press("t1/submit").ok).toBe(true);
  expect(onAction).toHaveBeenCalledWith({ address: "home/t1/submit", action: "press" });
  controller.dispose();
  const open = { ...input, rows: [{ ...input.rows[0]!, punches: [{ day: 0, from: "07:00" }] }] };
  expect(view(open)).toContain("Still open");
  expect(readComponent(def, open, "t1").join("\n")).not.toContain("[t1/submit");
  expect(props.safeParse({ ...input, rows: full.rows }).success).toBe(false);
});

describe("Timesheet states and approval dispatch", () => {
  it("uses shared empty copy and omits all stale item targets and readings", () => {
    const html = view(full, "empty");
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root", "home/c1/empty"]);
    expect(readComponent(def, full, "t1", "empty")).toEqual(["t1 Timesheet (empty)"]);
  });
  it.each(["filled", "empty"] as const)("dispatches only pending approvals in %s", (state) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...full, id: "t1", c: "Timesheet", state }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    const live = state === "filled";
    const stamped = stampItemIds(meta, props.parse(full));
    expect(affordancesOf(meta, stamped, "t1", {}, state).map(({ address }) => address)).toEqual(
      live ? ["t1/r1/approve"] : [],
    );
    expect(runtime.press("t1/r1/approve")).toMatchObject({ ok: live });
    for (const part of ["t1/r2/approve", "t1/r2/approved", "t1/r1/total", "t1/r3/approve"])
      expect(runtime.press(part)).toMatchObject({ ok: false });
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction.mock.calls.map(([action]) => action)).toEqual(
      live ? [{ address: "home/t1/r1/approve", action: "press" }] : [],
    );
    runtime.dispose();
  });
});
