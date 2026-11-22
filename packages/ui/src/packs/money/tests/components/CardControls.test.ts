import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  placeholderTitle,
  type CastLike,
} from "@lmthing/ui/catalog";

const def = components.CardControls;
const [card] = def.examples;

describe("CardControls schema", () => {
  it.each(def.examples)("accepts the example", (example) => {
    expect(def.props.safeParse(example).success).toBe(true);
  });
  it.each([
    { cardRef: "a".repeat(33) },
    { label: "a".repeat(25) },
    { last4: "11111" },
    { channels: { online: true, atm: false } },
    { spendCap: -1 },
    { maxCap: 0 },
    { maxCap: undefined },
    { spendCap: 251 },
    { cvv: "a".repeat(5) },
    { unlocked: true },
    { color: "#fff" },
  ])("rejects invalid values and unknown props", (patch) => {
    expect(def.props.safeParse({ ...card, ...patch }).success).toBe(false);
  });
});

describe("CardControls fallback", () => {
  const empty = { things: [], items: [] };
  const casts: CastLike[] = [
    empty,
    { things: [], items: [{ id: "card", type: "card", sample: true, name: 42 }] },
    { things: [], items: [{ id: "card", type: "card", sample: true, title: "a".repeat(90) }] },
  ];
  it.each(casts)("produces valid neutral props", (cast) =>
    expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true),
  );
  it("uses a neutral label with no card data", () => {
    expect(def.fallback({ cast: empty })).toMatchObject({ label: placeholderTitle(0), last4: "0000" });
  });
});

describe("CardControls action contract", () => {
  it("offers freeze and channel toggles and only offers controls for supplied full details", () => {
    const parts = (input: unknown) =>
      affordancesOf(def.meta, def.props.parse(input), "c1").map((a) => a.part);
    expect(parts(card)).toEqual(["freeze", "online", "atm", "international", "spendCap"]);
    expect(parts({ ...card, maskedNumber: "DEMO-MASK" })).toContain("reveal");
    expect(parts({ ...card, maskedNumber: "DEMO-MASK", detail: "brief" })).toEqual([
      "freeze",
      "online",
      "atm",
      "international",
    ]);
    expect(def.meta.confirmParts).toContain("freeze");
    expect(def.meta.partTiers.reveal).toBe("ok");
  });
  it("does not disclose authored secrets in the reader", () => {
    const read = readComponent(def, { ...card, maskedNumber: "DEMO-MASK", cvv: "DEMO" }, "c1").join("\n");
    expect(read).not.toContain("DEMO-MASK");
    expect(read).not.toContain("DEMO");
  });
  it("has a core near miss and publishes only with the complete pack", () => {
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(createRegistry({ packs: ["money"] }).ids.includes("CardControls")).toBe(packReady("money"));
  });
});
