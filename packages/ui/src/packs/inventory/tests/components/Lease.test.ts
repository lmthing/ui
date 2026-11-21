import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  partTierAt,
  placeholderTitle,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, type AddressedElement } from "../../../../../test/render";

const def = components.Lease;
const { meta, props, fallback, examples, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const terms = {
  tenant: "Ana",
  place: "Patio flat",
  start: "2024-01-01",
  end: "2024-03-30",
  rent: 950,
  per: "month",
  due: 31,
  deposit: 0,
} as const;
const at = (part: string) => `home/l1/${part}`;
const render = (input: unknown) =>
  addressedElements(renderInstance("Lease", input, "filled", theme, { component: "l1", lang: "en-US" }));
const nestedText = (node?: AddressedElement): string[] =>
  node ? [...node.text, ...node.children.flatMap(nestedText)] : [];

function setDay(month: number, day: number) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2024, month - 1, day, 12));
}

afterEach(() => vi.useRealTimers());

describe("Lease schema", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("accepts exact limits and derives defaults without adding model-owned IDs", () => {
    const boundary = { ...terms, tenant: "t".repeat(24), place: "p".repeat(32), due: 1 };
    expect(props.parse(boundary)).toMatchObject({ ...boundary, detail: "full", surface: "card" });
    expect(props.parse({ ...terms, tenant: "  Ana  " }).tenant).toBe("Ana");
    expectTypeOf<Props<typeof props, typeof meta>["rent"]>().toEqualTypeOf<number>();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });

  it.each([
    {},
    { ...terms, tenant: " " },
    { ...terms, tenant: "t".repeat(25) },
    { ...terms, place: "p".repeat(33) },
    { ...terms, start: "2023-02-29" },
    { ...terms, end: "2023-12-31" },
    { ...terms, end: terms.start },
    { ...terms, due: 0 },
    { ...terms, due: 32 },
    { ...terms, due: 1.5 },
    { ...terms, rent: -1 },
    { ...terms, rent: Infinity },
    { ...terms, deposit: -1 },
    { ...terms, per: "year" },
    { ...terms, detail: "hidden" },
    { ...terms, nextDue: "2024-01-31" },
    { ...terms, currency: "USD" },
    { ...terms, color: "red" },
  ])("rejects invalid wire input: %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Lease fallback and metadata", () => {
  it("uses bounded cast text and falls back to neutral placeholders", () => {
    const thing = { type: "rental", fields: ["name", "person"] };
    const row = { id: "flat", type: "rental", sample: true, name: "Patio flat", person: "Ana" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [thing], items: [row] },
      { things: [thing], items: [{ ...row, name: 55, person: null }] },
      { things: [thing], items: [{ ...row, name: "p".repeat(80), person: "t".repeat(80) }] },
    ];
    const values = casts.map((cast) => fallback({ cast, lang: "en" }));
    for (const value of values) expect(props.safeParse(value).success).toBe(true);
    const neutral = { place: placeholderTitle(0), tenant: placeholderTitle(1) };
    expect(values[0]).toMatchObject(neutral);
    expect(values[1]).toMatchObject({ place: terms.place, tenant: terms.tenant });
    expect(values[2]).toMatchObject(neutral);
    expect(values[3]).toMatchObject({ place: "p".repeat(32), tenant: "t".repeat(24) });
  });

  it("keeps the phone tier, readiness gate, and core-first probes", () => {
    expect(meta.states).toEqual(["filled"]);
    expect(meta).toMatchObject({ tier: "phone", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(partTierAt(meta, {}, "root")).toBe("phone");
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Lease")).toBe(packReady("inventory"));
    expect(probes).toMatchObject([
      { kind: "choose", expect: "Lease" },
      { kind: "choose", expect: "KeyValue" },
      { kind: "write", expect: "Lease" },
      { kind: "write", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "l1", action: "press" } },
    ]);
  });
});

describe("Lease state and parts", () => {
  it("draws the complete agreement, an addressed meter and an actionable root", () => {
    setDay(2, 29);
    const parts = render(terms);
    expect([...parts.keys()].sort()).toEqual(meta.parts.map(at).sort());
    expect(parts.get(at("root"))?.attributes).toContain('role="button"');
    expect(parts.get(at("tenant"))?.text).toEqual(["Tenant: Ana"]);
    expect(parts.get(at("place"))?.text).toEqual(["Patio flat"]);
    expect(parts.get(at("start"))?.text).toEqual(["Starts Jan 1, 2024"]);
    expect(parts.get(at("end"))?.text).toEqual(["Ends Mar 30, 2024"]);
    expect(nestedText(parts.get(at("time_left")))).toEqual(["Time left", "30 days", "Renewal soon"]);
    expect(parts.get(at("rent"))?.text).toEqual(["Rent ", "\u00a0/\u00a0month"]);
    expect(parts.get(at("rent"))?.children[0]?.text).toEqual(["$950"]);
    expect(parts.get(at("next_due"))?.text).toEqual(["Next due Feb 29, 2024"]);
    expect(parts.get(at("deposit"))?.text).toEqual(["Deposit $0"]);
    expect(parts.get(at("renewal"))?.text).toEqual(["Renewal soon"]);
  });

  it("omits unsupplied deposits and only draws a renewal signal within the warning window or after expiry", () => {
    setDay(1, 1);
    const parts = render({ ...terms, deposit: undefined });
    expect(parts.has(at("deposit"))).toBe(false);
    expect(parts.has(at("renewal"))).toBe(false);
    vi.setSystemTime(new Date(2024, 2, 31, 12));
    const expired = render(terms);
    expect(expired.get(at("renewal"))?.text).toEqual(["Lease ended"]);
    expect(expired.get(at("next_due"))?.text).toEqual(["No further rent dates"]);
  });

  it("brief hides the start date and deposit without changing the stored terms or the other parts", () => {
    setDay(2, 29);
    const input = { ...terms, detail: "brief", surface: "plain", density: "compact" };
    expect(props.parse(input)).toMatchObject(terms);
    const hidden = meta.variantParts["detail.brief"].hides.map(at);
    expect([...render(input).keys()]).toEqual(
      [...render(terms).keys()].filter((part) => !hidden.includes(part)),
    );
  });
});

describe("Lease read and act", () => {
  it.each(["full", "brief"] as const)(
    "reads visible facts and opens the root directly with %s detail",
    (detail) => {
      setDay(2, 29);
      const onAction = vi.fn();
      const controller = createScreenController({
        screen: { id: "home", components: [{ ...terms, c: "Lease", id: "l1", detail }] },
        defs: { Lease: def },
        onAction,
      });
      const reading = controller.read();
      for (const line of ["Patio flat", "Tenant: Ana", "Time left: 30 days", "Renewal soon", "[l1 press]"])
        expect(reading).toContain(line);
      expect(reading.includes("Deposit $0")).toBe(detail === "full");
      expect(reading.includes("Starts")).toBe(detail === "full");
      expect(controller.press("l1/renewal").ok).toBe(false);
      expect(controller.press("l1/terms_icon").ok).toBe(false);
      expect(controller.press("l1").ok).toBe(true);
      expect(controller.confirmation).toBeUndefined();
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/l1", action: "press" });
    },
  );
});
