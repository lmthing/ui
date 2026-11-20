import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
  packReady,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
const { props, meta, examples, fallback, probes } = components.Pantry;
const item = { name: "Item", qty: "2", place: "cupboard", goto: "details" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
beforeEach(() => void vi.useFakeTimers().setSystemTime(new Date(2026, 10, 19, 12)));
afterEach(() => vi.useRealTimers());
describe("Pantry contract and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 21 }, () => item) },
    { color: "#ff0000", items: [item] },
    ...[
      { name: "" },
      { name: "   " },
      { name: "a".repeat(25) },
      { qty: "" },
      { qty: "a".repeat(13) },
      { place: "shelf" },
      { goto: undefined },
      { goto: "Bad ID" },
      { goto: "a".repeat(65) },
      { useBy: "2026-02-29" },
      { useBy: "20 Nov 2026" },
      { id: "r1" },
      { tone: "warn" },
      { used: true },
      { pixels: 4 },
    ].map((fields) => ({ items: [{ ...item, ...fields }] })),
  ])("rejects missing, oversized, unknown and derived fields", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts the exact dense, text and date limits and trims authored strings", () => {
    const max = {
      ...item,
      name: "a".repeat(24),
      qty: "a".repeat(12),
      goto: "a".repeat(64),
      useBy: "9999-12-31",
    };
    expect(props.safeParse({ items: Array.from({ length: 20 }, () => max) }).success).toBe(true);
    expect(props.safeParse({ items: [{ ...item, useBy: "2024-02-29" }] }).success).toBe(true);
    expect(props.parse({ items: [{ ...item, name: " Item ", qty: " 2 " }] })).toEqual({
      detail: "full",
      items: [{ ...item, mark: "none", use_by: undefined, used: {} }],
    });
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });
});
describe("Pantry fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    },
    { things: [], items: [{ id: "bad", type: "record", sample: true, name: 4 }] },
    {
      things: [{ type: "record", fields: ["title", "detail"] }],
      items: [{ id: "long", type: "record", sample: false, title: "a".repeat(80), detail: "b".repeat(80) }],
    },
  ];
  it.each(casts)("validates empty, matching, malformed and overlong casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast titles and details or neutral placeholders", () => {
    expect(fallback({ cast: casts[0]! }).items).toEqual([
      { name: "Item one", qty: "0", place: "cupboard", goto: "details" },
    ]);
    expect(fallback({ cast: casts[1]! }).items[0]).toMatchObject({ name: "Fern", qty: "Bathroom" });
    expect(fallback({ cast: casts[2]! }).items[0]?.name).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).items[0]?.name).toHaveLength(24);
  });
  it("preserves the core-first near miss, bounded dense phone contract and pack gate", () => {
    expect([meta.status, meta.dense, meta.tier, meta.weight]).toEqual(["ready", true, "phone", 3]);
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta.confirmParts).toEqual(["used"]);
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("List");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Pantry" });
    expect(probes.find((probe) => probe.kind === "read")?.expect).toEqual({
      address: "p1/r1/used",
      action: "press",
    });
    expect(createRegistry({ packs: ["kitchen"] }).ids.includes("Pantry")).toBe(packReady("kitchen"));
    expect(createRegistry({ packs: ["kitchen"], includeDrafts: true }).ids).toContain("Pantry");
  });
});
describe("Pantry parts and read/act", () => {
  it.each(["cupboard", "fridge", "freezer"] as const)(
    "reads stored and derived dates with separate destructive actions in %s",
    (place) => {
      for (const useBy of [undefined, "2026-11-18", "2026-11-19", "2026-11-22", "2026-11-23"]) {
        const input = { items: [{ ...item, place, useBy }] };
        const html = renderInstance("Pantry", input, "filled", theme);
        for (const part of ["root", "name", "qty", "place", "used"])
          expect(html).toContain(`home/c1/r1/${part}`);
        expect(html.includes('data-testid="home/c1/r1/use_by"')).toBe(Boolean(useBy));
        expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="link"');
        expect(elementAt(html, "home/c1/r1/used").attributes).toContain('role="button"');
        expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "p1")).toEqual([
          { address: "p1/r1", part: "root", action: "press", detail: "→details" },
          { address: "p1/r1/used", part: "used", action: "press", detail: "" },
        ]);
        const reading = readComponent(components.Pantry, input, "p1").join("\n");
        for (const text of [item.name, item.qty, "Used up", useBy ?? "Not set"])
          expect(reading).toContain(text);
        const label = ["Use-by date", "Expired", "Use soon", "Use soon", "Use by"][
          [undefined, "2026-11-18", "2026-11-19", "2026-11-22", "2026-11-23"].indexOf(useBy)
        ]!;
        expect(reading).toContain(label);
        expect(html).toContain(label);
      }
    },
  );
  it("preserves all twenty validator-owned ids in dense record readings", () => {
    const items = Array.from({ length: 20 }, (_, index) => ({
      ...item,
      useBy: index % 2 ? "2026-11-18" : undefined,
    }));
    const reading = readComponent(components.Pantry, { items }, "p1").join("\n");
    const html = renderInstance("Pantry", { items }, "filled", theme);
    expect(html.indexOf('data-testid="home/c1/r2/root"')).toBeLessThan(
      html.indexOf('data-testid="home/c1/r1/root"'),
    );
    for (let index = 1; index <= 20; index++) expect(reading).toContain(`p1/r${index}/used`);
    expect(items[0]?.useBy).toBeUndefined();
  });
  it("reads the empty state without record content", () => {
    const html = renderInstance("Pantry", { items: [item] }, "empty", theme, "plant");
    expect(html).toContain("No plants yet");
    expect(html).not.toContain("home/c1/r1");
    expect(html).not.toContain('role="button"');
    expect(readComponent(components.Pantry, { items: [item] }, "p1", "empty")).toEqual(["p1 Pantry (empty)"]);
  });
});
describe("Pantry confirmation and navigation", () => {
  it("defers used-up removal, cancels safely, confirms once, and preserves the sorted target", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const runtime = createScreenController({
      screen: {
        id: "home",
        components: [{ id: "p1", c: "Pantry", items: [item, { ...item, useBy: "2026-11-18" }] }],
      },
      defs: components,
      onAction,
      onLink,
    });
    expect(runtime.press("p1/r2/used")).toMatchObject({ ok: true });
    expect(runtime.confirmation?.source).toBe("home/p1/r2/used");
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.press("p1/r1")).toMatchObject({ ok: false });
    runtime.press("confirm/cancel");
    expect(onAction).not.toHaveBeenCalled();
    runtime.press("p1/r2/used");
    runtime.press("confirm/confirm");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/p1/r2/used", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: false });
    runtime.press("p1/r1");
    expect(onLink).toHaveBeenCalledExactlyOnceWith("details", "home/p1/r1");
    expect(runtime.press("p1/r1/unknown")).toMatchObject({ ok: false });
    expect(runtime.act({ address: "p1/r1/used", action: "toggle" })).toMatchObject({ ok: false });
    runtime.dispose();
  });
  it("rejects navigation and removal in the empty state", () => {
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "p1", c: "Pantry", items: [item], state: "empty" }] },
      defs: components,
      onAction,
    });
    expect(runtime.press("p1/r1")).toMatchObject({ ok: false });
    expect(runtime.press("p1/r1/used")).toMatchObject({ ok: false });
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction).not.toHaveBeenCalled();
    runtime.dispose();
  });
});
