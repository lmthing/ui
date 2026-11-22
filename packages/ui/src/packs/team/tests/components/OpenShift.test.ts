import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.OpenShift;
const { props, meta, examples, fallback, probes } = def;
const full = examples[0]!;
const row = full.shifts[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const emptyCast = { things: [], items: [] } satisfies CastLike;

describe("OpenShift schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("defaults to full detail and accepts six bounded rows, overnight times and zero pay", () => {
    const shift = {
      ...row,
      date: "2024-02-29",
      from: "23:59",
      to: "00:00",
      role: ` ${"x".repeat(16)} `,
      pay: 0,
    };
    const parsed = props.parse({ shifts: Array.from({ length: 6 }, () => shift) });
    expect(parsed).toMatchObject({ detail: "full" });
    expect(parsed.shifts).toEqual(Array.from({ length: 6 }, () => ({ ...shift, role: "x".repeat(16) })));
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["shifts"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  it.each([
    {},
    { shifts: [] },
    { shifts: Array.from({ length: 7 }, () => row) },
    { ...full, detail: "hidden" },
    { ...full, density: "small" },
    { ...full, surface: "flat" },
    { ...full, color: "red" },
  ])("rejects invalid or unknown component input %j", (invalid) => {
    expect(props.safeParse(invalid).success).toBe(false);
  });
  it.each([
    { date: undefined },
    { from: undefined },
    { to: undefined },
    { date: "2026-02-30" },
    { from: "24:00" },
    { to: "07:60" },
    { to: "7:00" },
    { role: "x".repeat(17) },
    { role: " " },
    { pay: -1 },
    { pay: Infinity },
    { pay: "$64" },
    { currency: "USD" },
    { id: "r1" },
    { claim: true },
  ])("rejects invalid or unknown shift input %j", (invalid) => {
    expect(props.safeParse({ shifts: [{ ...row, ...invalid }] }).success).toBe(false);
  });
});

describe("OpenShift fallback and metadata", () => {
  it("validates bounded cast-derived roles and neutral placeholders", () => {
    const matching: CastLike = {
      things: [{ type: "work", fields: ["name"] }],
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `work_${i}`,
        type: "work",
        sample: true,
        name: i === 0 ? "Opening" : "x".repeat(40),
      })),
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "work", type: "work", sample: true, name: 4 }],
    };
    for (const cast of [emptyCast, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    const { shifts } = fallback({ cast: matching });
    expect(shifts).toHaveLength(6);
    expect(shifts[0]).toMatchObject({ role: "Opening" });
    expect(shifts[1]!.role.length).toBeLessThanOrEqual(16);
    for (const cast of [emptyCast, malformed])
      expect(fallback({ cast }).shifts.map(({ role }) => role)).toEqual([placeholderTitle(0)]);
  });
  it("keeps the people tier, core near miss, write axis and read target", () => {
    expect(meta.tier).toBe("people");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Checklist");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "OpenShift" }),
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({
          kind: "write",
          expect: "OpenShift",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "o1/r2/claim", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("OpenShift")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("OpenShift")).toBe(packReady("team"));
  });
});

describe("OpenShift parts and reading", () => {
  it("stamps distinct addressed rows, renders optional pay and reads the same choices", () => {
    const html = renderInstance("OpenShift", full, "filled", theme);
    const parts = addressedElements(html);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has("home/c1/message")).toBe(false);
    for (const part of meta.items.parts) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
      expect(parts.has(`home/c1/r2/${part}`)).toBe(part !== "pay");
    }
    for (const item of ["r1", "r2"]) {
      const { attributes } = elementAt(html, `home/c1/${item}/claim`);
      expect(attributes).toContain('role="button"');
      expect(attributes).not.toContain('aria-disabled="true"');
    }
    const reading = readComponent(def, full, "o1").join("\n");
    for (const text of ["r1 21 Nov 2026 07:00–11:00 · $64", "r2 22 Nov 2026 13:00–17:00"])
      expect(reading).toContain(text);
    expect(reading).toMatch(/r2 "Potting bench".*\[o1\/r2\/claim press/);
  });
  it("keeps every address for density and surface; brief hides pay but retains its value", () => {
    const addresses = (input: unknown) => [
      ...addressedElements(renderInstance("OpenShift", input, "filled", theme)).keys(),
    ];
    const standard = addresses(full);
    expect(addresses({ ...full })).toEqual(standard);
    expect(addresses({ ...full })).toEqual(standard);
    const brief = { ...full, detail: "brief" };
    expect(props.parse(brief).shifts[0]?.pay).toBe(64);
    expect(addresses(brief)).toEqual(standard.filter((part) => !part.endsWith("/pay")));
    const reading = readComponent(def, brief, "o1").join("\n");
    expect(reading).not.toContain("$64");
    expect(reading).toContain("[o1/r1/claim press");
  });
});

describe("OpenShift states and claim dispatch", () => {
  it.each([
    ["empty", "No open shifts"],
    ["success", "Claim requested"],
  ] as const)("draws %s feedback instead of stale shift targets", (state, message) => {
    const html = renderInstance("OpenShift", full, state, theme);
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root", "home/c1/message"]);
    expect(html).toContain(message);
    expect(readComponent(def, full, "o1", state)).toEqual([`o1 OpenShift (${state})`]);
  });
  it.each(["filled", "empty", "success"] as const)(
    "dispatches claims only in filled, tested at %s",
    (state) => {
      const onAction = vi.fn();
      const screen = { id: "home", components: [{ ...full, id: "o1", c: "OpenShift", state }] };
      const runtime = createScreenController({ screen, defs: components, onAction });
      const live = state === "filled";
      const paths = ["o1/r1/claim", "o1/r2/claim"];
      const stamped = stampItemIds(meta, props.parse(full));
      expect(affordancesOf(meta, stamped, "o1", {}, state).map(({ address }) => address)).toEqual(
        live ? paths : [],
      );
      for (const path of paths) expect(runtime.press(path)).toMatchObject({ ok: live });
      for (const path of ["o1/r1/role", "o1/r3/claim", "o1/message"])
        expect(runtime.press(path)).toMatchObject({ ok: false });
      expect(runtime.confirmation).toBeUndefined();
      expect(onAction.mock.calls.map(([action]) => action)).toEqual(
        live ? paths.map((path) => ({ address: `home/${path}`, action: "press" })) : [],
      );
      runtime.dispose();
    },
  );
});
