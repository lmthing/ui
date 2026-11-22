import { describe, expect, expectTypeOf, it, vi } from "vitest";
// prettier-ignore
import { affordancesOf, components, createRegistry, packReady, readComponent, stampItemIds, type CastLike, type Props, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, fallback, meta, probes, props } = components.Units;
const register = examples[0]!;
const thumbnail = examples[1]!;
const unit = register.units[0]!;
const letRecord = register.lets[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function draw(input: unknown, state: StateName = "filled") {
  return renderInstance("Units", input, state, theme, { component: "u1" });
}

describe("Units schema", () => {
  it.each(examples)("accepts the property examples", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("applies defaults, trims text and adds ids only for the view", () => {
    const parsed = props.parse({ ...register, units: [{ ...unit, title: " Willow Flat " }] });
    expectTypeOf<Props<typeof props, typeof meta>["units"][number]["id"]>().toEqualTypeOf<string>();
    expect(parsed).toMatchObject({
      media: "none",
      units: [{ title: "Willow Flat", linked: true }],
      lets: [{ cancelled: false }],
    });
  });
  it.each([
    { units: [] },
    { units: Array.from({ length: 13 }, (_, i) => ({ ...unit, unitRef: `unit_${i}` })), lets: [] },
    { units: [unit, unit] },
    ...[
      { id: "r1" },
      { linked: true },
      { title: "a".repeat(33) },
      { address: "a".repeat(37) },
      { unitRef: "bad-ref" },
      { askingRent: 0 },
      { askingPer: "day" },
      { askingRent: -1, askingPer: "month" },
      { photo: "https://example.org/photo.jpg" },
      { goto: "bad link" },
      { occupancy: "occupied" },
    ].map((edit) => ({ units: [{ ...unit, ...edit }] })),
    ...[
      { unitRef: "missing" },
      { kind: "stay", per: "night" },
      { kind: "stay", end: "2026-11-01" },
      { end: letRecord.start },
      { start: "2026-02-30" },
      { occupant: "x".repeat(25) },
      { per: "night" },
      { rent: -1 },
      { rent: Infinity },
    ].map((edit) => ({ lets: [{ ...letRecord, ...edit }] })),
    { lets: [letRecord, { ...letRecord, cancelled: true }] },
    { lets: [letRecord, { ...letRecord, letRef: "conflict" }] },
    { media: "cover" },
    { on: "2026-11-31" },
    { occupancy: "occupied" },
    { pixels: 4 },
  ])("rejects out-of-contract input", (edit) => {
    expect(props.safeParse({ ...register, ...edit }).success).toBe(false);
  });
});

describe("Units boundaries", () => {
  it("accepts 12 units and 48 distinct lets, but not 49", () => {
    const units = Array.from({ length: 12 }, (_, i) => ({
      unitRef: `unit_${i}`,
      title: "t".repeat(32),
      address: "a".repeat(36),
    }));
    const lets = Array.from({ length: 49 }, (_, i) => ({
      ...letRecord,
      unitRef: units[0]!.unitRef,
      letRef: `let_${i}`,
      occupant: "o".repeat(24),
      cancelled: true,
    }));
    expect(props.safeParse({ ...register, units, lets: lets.slice(1) }).success).toBe(true);
    expect(props.safeParse({ ...register, units, lets }).success).toBe(false);
  });
});

describe("Units fallback and metadata", () => {
  it("uses neutral placeholders for empty and malformed casts, and bounded cast copy otherwise", () => {
    const empty = { things: [], items: [] } satisfies CastLike;
    const cast = (display: unknown): CastLike => ({
      things: [{ type: "record", fields: ["display", "detail"] }],
      items: [
        {
          id: "one",
          type: "record",
          sample: true,
          display,
          detail: typeof display === "string" ? "a".repeat(72) : 9,
        },
      ],
    });
    for (const source of [empty, cast(12), cast("t".repeat(80))])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast: empty }).units[0]!.title).toBe("Item one");
    expect(fallback({ cast: cast(12) }).units[0]!.title).toBe("Item one");
    expect(fallback({ cast: cast("Unit from cast") }).units[0]!.title).toBe("Unit from cast");
  });
  it("retains the core-first miss, shared variants and on-device tier", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true, weight: 3 });
    expect(meta.realPath).toContain("on the device");
    expect(createRegistry({ packs: ["property"] }).ids.includes("Units")).toBe(packReady("property"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "choose", expect: "Units" }),
        expect.objectContaining({ kind: "write", variant: { axis: "media", value: "thumb" } }),
        expect.objectContaining({ kind: "read", expect: { address: "u1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Units states, parts and actions", () => {
  it("shows the addressed date field, links and occupancy readings, but hides unrequested photos", () => {
    const parts = addressedElements(draw(register));
    expect(parts.get("home/u1/date")?.attributes).toMatch(/aria-label="Occupancy date".*value="2026-11-18"/);
    expect(parts.get("home/u1/date")?.attributes).toContain('placeholder="YYYY-MM-DD"');
    expect(parts.get("home/u1/r1/root")?.attributes).toContain('role="link"');
    expect(parts.get("home/u1/r2/root")?.attributes).not.toContain('role="link"');
    expect(parts.get("home/u1/r1/occupant")?.text).toEqual(["Asha"]);
    expect(parts.get("home/u1/r1/rent")?.text).toEqual(["$900 / month"]);
    expect(parts.has("home/u1/r2/occupant")).toBe(false);
    expect(parts.has("home/u1/r1/photo")).toBe(false);
    expect(addressedElements(draw(thumbnail)).has("home/u1/r1/photo")).toBe(true);
    const read = readComponent(components.Units, register, "u1").join("\n");
    expect(read).toContain("Occupied · Asha · $900 / month");
    expect(read).toContain("Vacant · $1,050 / month");
    expect(read).toContain("Occupancy date: 18 Nov 2026 (2026-11-18)");
    expect(read).toContain("[u1/date set]");
    expect(read).not.toContain("photo:home");
    expect(read).not.toContain('"flat_a"');
  });
  it.each(["empty", "loading", "error"] as const)("shows no actionable or stale parts in %s", (state) => {
    const html = draw(register, state);
    if (state !== "loading") expect(html).not.toContain("Willow Flat");
    expect(html).not.toContain('data-testid="home/u1/date"');
    expect(html).not.toContain('data-testid="home/u1/r1/root"');
    if (state !== "loading") expect(addressedElements(html).has("home/u1/message")).toBe(true);
    else
      expect(addressedElements(html).get("home/u1/r1/occupancy")?.attributes).toContain('aria-hidden="true"');
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(register)), "u1", {}, state)).toEqual([]);
  });
  it("dispatches only linked row presses through the shared controller", () => {
    const onLink = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "u1", c: "Units", ...register }] },
      defs: components,
      onLink,
      requireMounted: false,
    });
    expect(controller.press("home/u1/r1/root").ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("property_unit_detail", "home/u1/r1");
    expect(controller.press("home/u1/r2/root").ok).toBe(false);
    expect(controller.press("home/u1/r1/occupancy").ok).toBe(false);
    controller.dispose();
  });
});
