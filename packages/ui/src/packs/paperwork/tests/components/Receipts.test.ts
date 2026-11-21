import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Receipts;
const { meta, props, examples, fallback, probes } = def;
const entry = examples[0]!.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Receipts contract", () => {
  it.each(examples)("parses an example", (example) => expect(props.safeParse(example).success).toBe(true));
  it.each([
    { items: [] },
    { items: Array.from({ length: 7 }, () => entry) },
    { items: [{ ...entry, payee: "x".repeat(33) }] },
    { items: [{ ...entry, allocation: 101 }] },
    { items: [{ ...entry, allocation: -1 }] },
    { items: [{ ...entry, amount: -1 }] },
    { items: [{ ...entry, allocated_amount: 12 }] },
    { items: [{ ...entry, file: "https://example.test/file" }] },
    { items: [entry], currency: "GBP" },
  ])("rejects invalid Writer input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("has a neutral fallback and keeps the Amount near miss", () => {
    const { items } = props.parse(fallback({ cast: { things: [], items: [] } }));
    expect(items[0]).toMatchObject({ payee: "Item one", amount: 0, reviewed: false });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Amount" }));
  });
});

describe("Receipts states and actions", () => {
  it("offers open only for attachments or links, review for each, and confirms removal", () => {
    const items = [entry, { ...entry, goto: undefined }, { ...entry, goto: undefined, file: undefined }];
    const offers = affordancesOf(meta, stampItemIds(meta, props.parse({ items })), "r1");
    expect(offers.filter(({ part }) => part === "root").map(({ address }) => address)).toEqual([
      "r1/r1",
      "r1/r2",
    ]);
    expect(offers.filter(({ action }) => action === "check")).toHaveLength(3);
    const ctl = createScreenController({
      screen: { id: "home", components: [{ c: "Receipts", id: "r1", items }] },
      defs: { Receipts: def },
    });
    try {
      expect(ctl.press("r1/r1/reviewed").ok).toBe(true);
      expect(ctl.read()).toContain("reviewed check:done");
      expect(ctl.press("r1/r1/remove").ok).toBe(true);
      expect(ctl.canPress("confirm/confirm")).toBe(true);
    } finally {
      ctl.dispose();
    }
  });
  it.each(["empty", "error", "loading"] as const)("mounts no item targets in %s", (state) => {
    const html = renderInstance("Receipts", examples[0], state, theme);
    expect(html).not.toContain("home/c1/r1/");
  });
  it("formats currency, hides optional detail only and does not leak its reference", () => {
    const input = { ...examples[0], detail: "brief" };
    const html = renderInstance("Receipts", input, "filled", theme, { deviceData: { currency: ["GBP"] } });
    const parts = addressedElements(html);
    expect(parts.get("home/c1/r1/amount")?.text.join("")).toContain("£24.50");
    expect(parts.get("home/c1/r1/allocated_amount")?.text.join("")).toContain("£12.25");
    expect(parts.has("home/c1/r1/category")).toBe(false);
    expect(parts.has("home/c1/r1/tags")).toBe(false);
    expect(html).not.toContain("lib:ledge_supplies");
    const reading = readComponent(def, input, "r1").join("\n");
    expect(reading).toContain("(private file)");
    expect(reading).not.toContain("lib:ledge_supplies");
  });
});
