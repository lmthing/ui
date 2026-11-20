import { expect, it } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds, type Definition } from "@lmthing/ui/catalog";
import { selectedIds } from "../../../../scripts/build";
import { renderInstance } from "../../../../test/render";

const ids = [
  "Agreement",
  "ClientCard",
  "ClientHistory",
  "Invoice",
  "Loyalty",
  "PaymentStatus",
  "Review",
] as const;
type Id = (typeof ids)[number];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const addresses = (id: Id, input: unknown) =>
  new Set(
    [...renderInstance(id, input, "filled", theme).matchAll(/data-testid="home\/c1\/([^"]+)"/g)].map(
      (match) => match[1]!,
    ),
  );

const content = {
  Agreement: [1, "detail", "brief", ["date"], "Signed · 2026-11-18"],
  ClientCard: [0, "detail", "brief", ["since", "next", "tags"], "Plant care · Friday 09:00"],
  ClientHistory: [0, "lead", "none", ["r1/kind", "r2/kind", "r3/kind"], undefined],
  Invoice: [0, "detail", "brief", ["note"], "Thank you for keeping things growing."],
  Loyalty: [0, "detail", "brief", ["name"], "Anna Patel"],
  PaymentStatus: [0, "detail", "brief", ["method"], "Bank transfer"],
  Review: [0, "detail", "brief", ["bars"], "5 stars 2"],
} as const;

for (const id of selectedIds(ids)) {
  const def: Definition = components[id];
  it(`${id} validates only its declared variant values and preserves the omitted default`, () => {
    const input = def.examples[0] as Record<string, unknown>;
    expect(def.meta.variants).toBeDefined();
    const parsed = def.props.parse(input);
    const explicit = Object.fromEntries(
      Object.entries(def.meta.variants!).map(([axis, values]) => [axis, values[0]]),
    );
    expect(addresses(id, { ...input, ...explicit })).toEqual(addresses(id, input));
    for (const [axis, values] of Object.entries(def.meta.variants!)) {
      expect(parsed[axis]).toBe(axis === "density" ? undefined : values[0]);
      expect(def.props.safeParse({ ...input, [axis]: "unsupported" }).success).toBe(false);
      for (const value of values) expect(def.props.safeParse({ ...input, [axis]: value }).success).toBe(true);
    }
  });
  it(`${id} hides secondary parts without changing item identity or offered actions`, () => {
    const [example, axis, value, hidden, hiddenText] = content[id];
    const input = def.examples[example] as Record<string, unknown>;
    const variant = { ...input, [axis]: value };
    const before = addresses(id, input);
    const after = addresses(id, variant);
    expect([...before].filter((part) => !after.has(part))).toEqual(expect.arrayContaining([...hidden]));
    expect([...after].filter((part) => !before.has(part))).toEqual([]);
    const stamped = (raw: unknown) => stampItemIds(def.meta, def.props.parse(raw));
    expect(affordancesOf(def.meta, stamped(variant), "c1")).toEqual(
      affordancesOf(def.meta, stamped(input), "c1"),
    );
    if (hiddenText) {
      expect(readComponent(def, input, "c1").join("\n")).toContain(hiddenText);
      expect(readComponent(def, variant, "c1").join("\n")).not.toContain(hiddenText);
    }
    expect(def.probes.find((probe) => probe.kind === "write" && probe.variant)).toMatchObject({
      variant: { axis, value },
    });
  });
}

if (selectedIds(ids).includes("ClientHistory")) {
  it("accepts row marks and tones without treating history kind as a variant", () => {
    const def = components.ClientHistory;
    const input = def.examples[0]!;
    const original = input.entries[0]!;
    for (const tone of def.meta.items.variants.tone) {
      const entry = { ...original, tone, mark: "highlight" as const };
      expect(def.props.parse({ entries: [entry] }).entries[0]).toMatchObject({
        kind: original.kind,
        tone,
        mark: "highlight",
      });
    }
    expect(def.props.safeParse({ entries: [{ ...original, tone: "visit" }] }).success).toBe(false);
  });
}

if (selectedIds(ids).includes("ClientCard")) {
  it("omits the portrait address and photo reference when media is hidden", () => {
    const def = components.ClientCard;
    const input = def.examples[0]!;
    const variant = { ...input, media: "none" } as const;
    expect(
      [...addresses("ClientCard", input)].filter((part) => !addresses("ClientCard", variant).has(part)),
    ).toEqual(["photo"]);
    expect(readComponent(def, variant, "c1").join("\n")).not.toContain("photo:people");
    expect(def.props.safeParse({ ...input, photo: undefined }).success).toBe(false);
    expect(def.props.safeParse({ ...variant, photo: undefined }).success).toBe(true);
  });
}

if (selectedIds(ids).includes("Review")) {
  it("keeps stable review and reply addresses when hiding the business response", () => {
    const def = components.Review;
    const input = def.examples[1]!;
    const variant = { ...input, detail: "brief" } as const;
    const after = addresses("Review", variant);
    expect([...addresses("Review", input)].filter((part) => !after.has(part))).toEqual(["r1/response"]);
    expect(after.has("r1/reply")).toBe(true);
    expect(readComponent(def, variant, "c1").join("\n")).not.toContain("Thank you, Ben.");
  });
}
