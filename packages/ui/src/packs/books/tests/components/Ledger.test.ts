import { describe, expect, it } from "vitest";
import * as c from "@lmthing/ui/catalog";
import { addressedElements, renderExample } from "../../../../../test/render";

const { examples, fallback, meta, props, probes } = c.components.Ledger;
const first = examples[0]!;
const pair = examples[1]!;
const entry = first.entries[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Ledger contract", () => {
  it.each(examples)("parses each example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { entries: [] },
    { entries: [{ ...entry, gross: 180 }] },
    { entries: [{ ...entry, payee: "x".repeat(33) }] },
    { entries: [{ ...entry, direction: "sideways" }] },
    { entries: [{ ...entry, goto: "Bad screen" }] },
    { entries: [entry, entry] },
    { to: "2027-11-03" },
    { color: "#ffff00" },
    { group: "dates" },
  ])("rejects an invalid seed %o", (patch) => {
    expect(props.safeParse({ ...first, ...patch }).success).toBe(false);
  });

  it("enforces the upper row boundary", () => {
    const entries = Array.from({ length: 25 }, (_, index) => ({ ...entry, entryRef: `entry_${index}` }));
    expect(props.safeParse({ ...first, entries: entries.slice(1) }).success).toBe(true);
    expect(props.safeParse({ ...first, entries }).success).toBe(false);
  });

  it("keeps the Timeline near miss and grouped write probe", () => {
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timeline" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "group", value: "sections" } }),
    );
    expect(c.createRegistry({ packs: ["books"] }).ids.includes(meta.id)).toBe(c.packReady("books"));
  });
});

describe("Ledger fallback", () => {
  it.each([
    ["Fern", "Fern"],
    [42, "Item one"],
    [undefined, "Item one"],
  ])("uses cast copy or the neutral placeholder", (name, expected) => {
    const cast = {
      things: [{ type: "plant", fields: ["name"] }],
      items: name === undefined ? [] : [{ id: "fern", type: "plant", sample: true, name }],
    };
    expect(props.parse(fallback({ cast })).entries[0]?.payee).toBe(expected);
  });
});

describe("Ledger screen and reading", () => {
  it("offers source navigation only for linked rows and marks export as a service", () => {
    const { deviceData, html } = renderExample(meta.id, first, "filled", theme);
    const read = c.readComponent(c.components.Ledger, first, "c1", "filled", {}, undefined, deviceData);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="link"');
    expect(parts.get("home/c1/r2/root")?.attributes).not.toContain('role="link"');
    expect(read.join("\n")).toContain("[c1/r1 press→visit_receipt]");
    expect(read.join("\n")).not.toContain("[c1/r2 press");
    expect(read.join("\n")).toContain("[c1/export press !needs-service]");
  });

  it("keeps stamped addresses when grouping reorders rows", () => {
    const { html } = renderExample(meta.id, pair, "filled", theme);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/r3/payee")?.text).toContain("Park walks");
    expect(parts.has("home/c1/r1/account_heading")).toBe(true);
    expect(parts.has("home/c1/r2/account_heading")).toBe(true);
    expect(parts.has("home/c1/r3/account_heading")).toBe(false);
  });

  it.each(["empty", "loading", "error"] as const)("hides the seeds and controls in %s", (state) => {
    const { html } = renderExample(meta.id, first, state, theme);
    expect(html).not.toContain(entry.payee);
    expect(addressedElements(html).has("home/c1/export")).toBe(false);
    expect(c.readComponent(c.components.Ledger, first, "c1", state).join("\n")).not.toContain(" press");
  });
});
