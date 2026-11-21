import { affordancesOf, components, createRegistry, packReady, stampItemIds } from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const { meta, props, examples, fallback, probes } = components.TaxYear;
const input = examples[0]!;
const [entry] = input.requirements;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("TaxYear contract", () => {
  it.each(examples)("parses an example", (example) => expect(props.safeParse(example).success).toBe(true));
  it.each([
    { ...input, requirements: [] },
    { ...input, requirements: Array.from({ length: 9 }, () => entry) },
    { ...input, to: "2025-12-31" },
    { ...input, receipt_total: 100 },
    { ...input, requirements: [{ ...entry, needed: 0 }] },
    { ...input, requirements: [{ ...entry, needed: 13 }] },
    { ...input, requirements: [{ ...entry, matched: 2 }] },
  ])("rejects invalid Writer input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("keeps pack gating, neutral seeds and the Checklist near miss", () => {
    expect(createRegistry({ packs: ["paperwork"] }).ids.includes("TaxYear")).toBe(packReady("paperwork"));
    expect(props.parse(fallback({ cast: { things: [], items: [] } })).label).toBe("Item one");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
  });
});

describe("TaxYear states and actions", () => {
  it.each(["filled", "empty", "success", "loading"] as const)("gates the only action in %s", (state) => {
    const requirements = [entry, { ...entry, goto: undefined }];
    const values = props.parse({ ...input, requirements });
    const actions = affordancesOf(meta, stampItemIds(meta, values), "t1", {}, state);
    expect(actions.map(({ address }) => address)).toEqual(state === "loading" ? [] : ["t1/r1"]);
    const parts = addressedElements(renderInstance("TaxYear", { ...input, requirements }, state, theme));
    expect(parts.get("home/c1/r1/root")?.attributes.includes('role="link"') ?? false).toBe(
      state !== "loading",
    );
    expect(parts.get("home/c1/r2/root")?.attributes.includes('role="link"') ?? false).toBe(false);
  });
  it("draws a missing requirement and never prints opaque evidence references", () => {
    const { deviceData } = renderExample("TaxYear", input, "filled", theme);
    const html = renderInstance("TaxYear", input, "filled", theme, { deviceData });
    const parts = addressedElements(html);
    expect(parts.has("home/c1/r2/missing")).toBe(true);
    expect(parts.has("home/c1/receipt_total")).toBe(true);
    expect(html).not.toContain("lib:preview_evidence");
    expect(renderInstance("TaxYear", input, "filled", theme)).toContain("No linked evidence yet");
  });
  it("keeps evidence links and date range under brief detail", () => {
    const parts = addressedElements(
      renderInstance("TaxYear", { ...input, detail: "brief" }, "filled", theme),
    );
    for (const kept of ["from", "to", "r1/root", "r2/root"]) expect(parts.has(`home/c1/${kept}`)).toBe(true);
    for (const hidden of ["due", "receipt_total", "allocation_total"])
      expect(parts.has(`home/c1/${hidden}`)).toBe(false);
  });
});
