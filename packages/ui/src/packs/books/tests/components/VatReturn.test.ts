import * as c from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const def = c.components.VatReturn;
const { examples, fallback, props, probes, meta } = def;
const first = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("VatReturn contract", () => {
  it.each(examples)("parses a worked example %o", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { from: "2026-12-32" },
    { to: "2026-09-30" },
    { to: "2027-10-02" },
    { schemeRef: "x".repeat(33) },
    { schemeRef: "Domestic cash" },
    { style: "table" },
    { ledgerGoto: "not a screen" },
    { boxes: [] },
    { result: 29 },
    { color: "red" },
  ])("rejects invalid dates, calculated values and unsupported presentation %o", (patch) => {
    expect(props.safeParse({ ...first, ...patch }).success).toBe(false);
  });

  it("defaults to numbered boxes and supports the exact inclusive period limit", () => {
    expect(props.parse({ ...first, to: "2027-10-01" }).style).toBe("boxes");
  });

  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "care", type: "account", sample: true, name: "Plant care" }] },
    { things: [], items: [{ id: "broken", type: "account", sample: false, name: 17 }] },
  ])("uses neutral host identifiers in fallbacks, never inventing a scheme from cast", (cast) => {
    expect(props.parse(fallback({ cast })).schemeRef).toBe("item_1");
  });

  it("keeps the core near miss, local action and pack-level readiness gate", () => {
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "KeyValue" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: meta.id }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "v1/save", action: "press" } }),
    );
    expect(c.createRegistry({ packs: ["books"] }).ids.includes(meta.id)).toBe(c.packReady("books"));
  });
});

describe("VatReturn view and actions", () => {
  it.each(examples)("shows nine stable boxes and only linked source actions", (example) => {
    const { html, deviceData } = renderExample(meta.id, example, "filled", theme);
    const parts = addressedElements(html);
    for (let n = 1; n <= 9; n++) {
      expect(parts.get(`home/c1/r${n}/number`)?.text).toContain(String(n));
      expect(parts.has(`home/c1/r${n}/value`)).toBe(true);
    }
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="link"');
    expect(parts.get("home/c1/r2/root")?.attributes).not.toContain('role="link"');
    const reading = c.readComponent(def, example, "c1", "filled", {}, "en-GB", deviceData).join("\n");
    expect(reading).toContain(`[c1/r1 press→${example.ledgerGoto}]`);
    expect(reading).not.toContain("[c1/r2 press");
    expect(reading).toContain("[c1/save press]");
    expect(parts.has("home/c1/r1/sources")).toBe("style" in example);
    expect(reading.includes("Sources:")).toBe("style" in example);
  });

  it("does not offer actions or amounts for a detached host snapshot", () => {
    const html = renderInstance(meta.id, first, "filled", theme);
    expect(html).toContain("VAT return unavailable");
    expect(addressedElements(html).has("home/c1/save")).toBe(false);
    expect(c.readComponent(def, first, "c1").join("\n")).not.toContain("press");
  });

  it("rechecks the snapshot when planning save and drill-down after a host refresh", () => {
    const screen = { id: "home", components: [{ ...first, id: "c1", c: meta.id }] };
    const defs = { VatReturn: def };
    const plan = (address: string, data?: c.DeviceData) =>
      c.planAct(screen, defs, {}, [{ address, action: "press" }], null, "planner", data);
    const { deviceData } = renderExample(meta.id, first, "filled", theme);
    expect(plan("c1/save", deviceData)).toMatchObject({ ok: true, links: [] });
    expect(plan("c1/r1", deviceData)).toMatchObject({ ok: true, links: [{ goto: "care_ledger" }] });
    expect(plan("c1/r2", deviceData)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(plan("c1/save", {}).ok).toBe(false);
    const saved = renderExample(meta.id, first, "success", theme).deviceData;
    expect(plan("c1/save", saved)).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("keeps boxes without a ledger link and still offers local saving", () => {
    const example = { ...first, ledgerGoto: undefined };
    const { html, deviceData } = renderExample(meta.id, example, "filled", theme);
    expect(addressedElements(html).get("home/c1/r1/root")?.attributes).not.toContain('role="link"');
    expect(c.readComponent(def, example, "c1", "filled", {}, undefined, deviceData).join(" ")).not.toContain(
      "[c1/r1 press",
    );
    expect(addressedElements(html).has("home/c1/save")).toBe(true);
  });

  it.each(["empty", "loading", "error", "success"] as const)("handles %s without offering Save", (state) => {
    const { html, deviceData } = renderExample(meta.id, first, state, theme);
    expect(addressedElements(html).has("home/c1/save")).toBe(false);
    expect(c.readComponent(def, first, "c1", state, {}, undefined, deviceData).join("\n")).not.toContain(
      "[c1/save",
    );
    if (state === "success") expect(html).toContain("Snapshot saved");
  });
});
