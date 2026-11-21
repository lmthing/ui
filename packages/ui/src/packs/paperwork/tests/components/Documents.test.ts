import { affordancesOf, components, createRegistry, packReady, stampItemIds } from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { meta, props, examples, fallback, probes } = components.Documents;
const entry = examples[0]!.docs[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const fallbackProps = fallback({ cast: { things: [], items: [] } });

describe("Documents contract", () => {
  it.each(examples)("parses a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { docs: [] },
    { docs: Array.from({ length: 7 }, () => entry) },
    { docs: [{ ...entry, title: "x".repeat(33) }] },
    { docs: [{ ...entry, kind: "unknown" }] },
    { docs: [{ ...entry, file: "https://example.test/file" }] },
    { docs: [{ ...entry, can_open: true }] },
    { docs: [entry], color: "#fff" },
  ])("rejects invalid writer props", (input) => expect(props.safeParse(input).success).toBe(false));
  it("respects pack readiness and keeps the core near miss", () => {
    expect(createRegistry({ packs: ["paperwork"] }).ids.includes("Documents")).toBe(packReady("paperwork"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read" }));
  });
  it("falls back without an openable document or identifying data", () => {
    expect(props.parse(fallbackProps).docs[0]).toMatchObject({
      title: "Item one",
      can_open: false,
      tags: [],
    });
  });
});

describe("Documents states and actions", () => {
  it("offers opening only for a file or link, and confirms removal independently", () => {
    const docs = [fallbackProps.docs[0]!, { ...entry, file: undefined }, { ...entry, goto: undefined }];
    const offers = affordancesOf(meta, stampItemIds(meta, props.parse({ docs })), "d1");
    expect(offers.map(({ address, action }) => [address, action])).toEqual([
      ["d1/r1/remove", "press"],
      ["d1/r2", "press"],
      ["d1/r2/remove", "press"],
      ["d1/r3", "press"],
      ["d1/r3/remove", "press"],
    ]);
    expect(meta.confirmParts).toEqual(["remove"]);
  });
  it("renders a file-only button and a separate remove button without exposing either secret", () => {
    const html = renderInstance("Documents", examples[1], "filled", theme);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="button"');
    expect(parts.get("home/c1/r1/remove")?.attributes).toContain('role="button"');
    const full = renderInstance("Documents", examples[0], "filled", theme);
    expect(full).toContain("••••");
    expect(full).not.toMatch(/DEMO-A|lib:greenhouse_permit/);
  });
  it.each(["empty", "error", "loading"] as const)("draws no item controls in %s", (state) => {
    const html = renderInstance("Documents", examples[0], state, theme);
    expect(html).not.toContain("home/c1/r1");
    expect(html).toContain(state === "loading" ? 'aria-busy="true"' : `home/c1/${state}`);
  });
  it("keeps stable item and action addresses in the brief view", () => {
    const html = renderInstance("Documents", { ...examples[0], detail: "brief" }, "filled", theme);
    const parts = addressedElements(html);
    for (const part of ["title", "owner", "kind", "expires", "file", "remove"]) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
    }
    for (const part of ["issuer", "number", "issued", "tags"]) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(false);
    }
  });
});
