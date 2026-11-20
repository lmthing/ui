import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Agreement;
const seed = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Agreement schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims all bounded text without inventing optional signing details", () => {
    expect(props.parse({ ...seed, title: "  Consent  ", terms: "  Terms  " })).toEqual({
      title: "Consent",
      terms: "Terms",
      signed: false,
      detail: "full",
      surface: "card",
    });
    expect(props.parse({ ...seed, name: "  Ben Carter  " }).name).toBe("Ben Carter");
  });
  it.each([
    {},
    { ...seed, title: "" },
    { ...seed, terms: "   " },
    { ...seed, title: "a".repeat(33) },
    { ...seed, terms: "a".repeat(601) },
    { ...seed, name: "a".repeat(29) },
    { ...seed, name: "" },
    { ...seed, signed: "yes" },
    { ...seed, signed: undefined },
    { ...seed, date: "2026-02-30" },
    { ...seed, date: "tomorrow" },
    { ...seed, color: "#fff" },
    { ...seed, pixels: 44 },
    { ...seed, detail: "short" },
    { ...seed, density: "dense" },
    { ...seed, surface: "tinted" },
    { ...seed, id: "a1" },
  ])("rejects invalid content and presentation props", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts the exact text limits and preserves independently optional fields", () => {
    const input = { title: "a".repeat(32), terms: "a".repeat(600), name: "a".repeat(28), date: "2024-02-29" };
    for (const signed of [false, true]) {
      expect(props.safeParse({ ...input, signed }).success).toBe(true);
      expect(props.safeParse({ ...seed, signed }).success).toBe(true);
    }
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["signed"]>().toEqualTypeOf<boolean>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
});

describe("Agreement fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "client", fields: ["name", "note"] }],
      items: [{ id: "anna", type: "client", sample: true, name: "Anna", note: "Access terms" }],
    },
    { things: [], items: [{ id: "bad", type: "client", sample: false, name: 4 }] },
    {
      things: [{ type: "client", fields: ["name", "note"] }],
      items: [{ id: "long", type: "client", sample: true, name: "a".repeat(80), note: "b".repeat(800) }],
    },
    {
      things: [],
      items: [
        { id: "anna", type: "client", sample: true, title: "Anna" },
        { id: "other", type: "other", sample: true, title: "Other" },
      ],
    },
  ];
  it.each(casts)("validates empty, matching, malformed, long and mixed cast content", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses shared neutral placeholders or cast content, never fabricating a signature", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({
      title: "Item one",
      terms: "Details",
      signed: false,
    });
    expect(fallback({ cast: casts[1]! })).toEqual({
      title: "Anna",
      terms: "Access terms",
      signed: false,
    });
    for (const cast of casts) expect(fallback({ cast })).not.toHaveProperty("date");
  });
});

describe("Agreement contract and probes", () => {
  it("keeps readiness, parts, states, local tier and the core-first near miss", () => {
    expect(meta).toMatchObject({
      status: "ready",
      weight: 2,
      tier: "phone",
      parts: ["root", "title", "terms", "agree", "name", "date"],
      states: ["filled", "success"],
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Checklist");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Checklist")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Agreement" });
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "a1/agree", action: "check" },
      { address: "a1/name", action: "type" },
    ]);
    expect(createRegistry({ packs: ["customers"], includeDrafts: true }).resolve("a-g-r-e-e-m-e-n-t")).toBe(
      "Agreement",
    );
    expect(createRegistry().ids).not.toContain("Agreement");
  });
});

describe("Agreement states, parts and reading", () => {
  it.each([false, true])("draws only valid actions when signed is %s", (signed) => {
    const input = { ...examples[1]!, signed };
    const html = renderInstance("Agreement", input, "filled", theme);
    const actions = affordancesOf(meta, stampItemIds(meta, props.parse(input)), "a1");
    expect(actions.map(({ part, action }) => [part, action])).toEqual(
      signed
        ? []
        : [
            ["agree", "check"],
            ["name", "type"],
          ],
    );
    for (const part of meta.parts) expect(elementAt(html, `home/c1/${part}`)).toBeDefined();
    expect(elementAt(html, "home/c1/agree").attributes).toContain(`role="${signed ? "img" : "checkbox"}"`);
    expect(elementAt(html, "home/c1/name").attributes.includes('role="textbox"')).toBe(!signed);
    const reading = readComponent(components.Agreement, input, "a1").join("\n");
    for (const text of [input.title, input.terms, input.name!, "Full name", "Signed · 2026-11-18"])
      expect(reading).toContain(text);
    expect(reading).toContain(signed ? "Accepted" : "I agree");
    expect(reading.includes("[a1/agree check")).toBe(!signed);
  });
  it("keeps the optional name control present, omits absent dates and bounds maximum terms", () => {
    const html = renderInstance("Agreement", { ...seed, terms: "a".repeat(600) }, "filled", theme);
    expect(elementAt(html, "home/c1/name").attributes).toContain('role="textbox"');
    expect(html).not.toContain("home/c1/date");
    expect(elementAt(html, "home/c1/terms").children.length).toBeGreaterThan(0);
    expect(html).toContain("a".repeat(600));
  });
  it("renders success as read-only acceptance without fabricating a name or signing date", () => {
    for (const signed of [false, true]) {
      const html = renderInstance("Agreement", { ...seed, signed }, "success", theme);
      expect(html).toContain("Accepted");
      expect(elementAt(html, "home/c1/agree").attributes).toContain('role="img"');
      expect(html).not.toContain("home/c1/name");
      expect(html).not.toContain("Full name");
      expect(html).not.toContain("home/c1/date");
    }
  });
  it("omits missing signer details in a filled signed record and its reading", () => {
    const input = { ...seed, signed: true };
    expect(renderInstance("Agreement", input, "filled", theme)).not.toContain("home/c1/name");
    expect(readComponent(components.Agreement, input, "a1").join("\n")).not.toContain("Full name");
  });
});

describe("Agreement read/act", () => {
  it("dispatches both unsigned actions repeatedly and denies edits to signed records", () => {
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ ...seed, id: "a1", c: "Agreement" }] },
      defs: components,
      onAction,
    });
    for (const value of ["Ben", "Ben Carter"])
      expect(runtime.act({ address: "a1/name", action: "type", value })).toMatchObject({ ok: true });
    for (let index = 0; index < 2; index++) expect(runtime.press("a1/agree")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledTimes(4);
    expect(runtime.confirmation).toBeUndefined();
    runtime.dispose();
    const locked = createScreenController({
      screen: { id: "home", components: [{ ...examples[1]!, id: "a1", c: "Agreement" }] },
      defs: components,
      onAction,
    });
    expect(locked.press("a1/agree")).toMatchObject({ ok: false });
    expect(locked.act({ address: "a1/name", action: "type", value: "Other" })).toMatchObject({ ok: false });
    expect(onAction).toHaveBeenCalledTimes(4);
    locked.dispose();
  });
});
