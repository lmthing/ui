import { describe, expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packComposition,
  packExamples,
  packOf,
  packReady,
  packs,
  readComponent,
  scoreComposition,
  writerFormat,
  type ArchetypeMeta,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["ClientCard", "ClientHistory", "Invoice", "PaymentStatus", "Review", "Loyalty", "Agreement"];
const defs: Record<string, Definition> = components;
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["label", "detail"] }],
    items: [{ id: "one", type: "record", sample: true, label: "Alpha", detail: "Second field" }],
  },
  {
    things: [{ type: "record", fields: ["label", "detail"] }],
    items: Array.from({ length: 8 }, (_, index) => ({
      id: `record_${index}`,
      type: "record",
      sample: false,
      label: "x".repeat(80),
      detail: "y".repeat(700),
    })),
  },
  {
    things: [{ type: "record", fields: ["label", "detail"] }],
    items: [{ id: "one", type: "record", sample: true, label: 4, detail: false }],
  },
];

describe("customers contracts", () => {
  it("has exactly seven components with examples, fallbacks and core near misses", () => {
    expect(
      Object.entries(packOf)
        .filter(([, owner]) => owner === "customers")
        .map(([id]) => id)
        .sort(),
    ).toEqual([...ids].sort());
    for (const id of ids) {
      const def = defs[id]!;
      expect(def.meta).toMatchObject({ id, region: "body" });
      // A draft has no view yet; a built component exports one.
      if (def.meta.status === "draft") expect(def).not.toHaveProperty(id);
      expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
      expect(def.meta.realPath).not.toBe("");
      expect(def.examples.length).toBeGreaterThanOrEqual(2);
      for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
      for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
      const choose = def.probes.filter((probe) => probe.kind === "choose");
      expect(choose.length).toBeGreaterThanOrEqual(2);
      expect(choose.some((probe) => probe.expect === id)).toBe(true);
      const miss = choose.find((probe) => probe.expect !== id && !(probe.expect in packOf));
      expect(miss).toBeDefined();
      expect(def.meta.pick).toContain(miss!.expect);
      expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
      for (const probe of def.probes.filter((probe) => probe.kind === "read")) {
        const reading = readComponent(
          def,
          def.examples[probe.screen],
          probe.expect.address.split("/")[0]!,
        ).join("\n");
        expect(reading).toContain(`[${probe.expect.address} ${probe.expect.action}`);
      }
    }
  });
  it("uses shared neutral placeholders or declared cast fields, not guessed domain fields", () => {
    const empty = casts[0]!,
      full = casts[1]!,
      malformed = casts[3]!;
    for (const cast of [empty, malformed]) {
      expect(components.ClientCard.fallback({ cast }).name).toBe("Item one");
      expect(components.Invoice.fallback({ cast }).to).toBe("Item one");
      expect(components.Agreement.fallback({ cast }).terms).toBe("Details");
      expect(components.Loyalty.fallback({ cast }).reward).toBe("Details");
    }
    expect(components.ClientCard.fallback({ cast: full })).toMatchObject({
      name: "Alpha",
      next: "Second field",
    });
    expect(components.Agreement.fallback({ cast: full })).toMatchObject({
      title: "Alpha",
      terms: "Second field",
    });
    expect(components.Review.fallback({ cast: empty })).toMatchObject({ count: 0, bars: [0, 0, 0, 0, 0] });
    expect(components.ClientHistory.fallback({ cast: full }).entries[0]?.title).toBe("Alpha");
  });
});

describe("customers pack pipeline", () => {
  it("keeps the incomplete pack and its Writer choices out of default and live registries", () => {
    expect(packReady("customers")).toBe(false);
    const core = createRegistry(),
      live = createRegistry({ packs: ["customers"] });
    const draft = createRegistry({ packs: ["customers"], includeDrafts: true });
    expect(live.ids).toEqual(core.ids);
    expect(live.archetypes).toEqual(core.archetypes);
    expect(draft.ids.filter((id) => packOf[id as keyof typeof packOf] === "customers").sort()).toEqual(
      [...ids].sort(),
    );
    const draftFormat = JSON.stringify(writerFormat(draft)),
      liveFormat = JSON.stringify(writerFormat(live));
    for (const id of ids) {
      expect(draftFormat).toContain(`"const":"${id}"`);
      expect(liveFormat).not.toContain(`"const":"${id}"`);
    }
    expect(draft.ids).not.toContain("Waitlist");
    expect(packs.customers.probes).toContainEqual({
      kind: "choose",
      need: "Show all my clients as tappable rows with a photo and short last-visit detail for each",
      expect: "List",
    });
  });
  it("validates metadata, ownership and every worked-example line without repair", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const used = new Set<string>();
    for (const line of packExamples.customers.trim().split(/\r?\n/)) {
      const { id, c, ...input } = JSON.parse(line);
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(used.has(id)).toBe(false);
      used.add(id);
      expect(createRegistry({ packs: ["customers"], includeDrafts: true }).resolve(c)).toBe(c);
      expect(defs[c]!.props.safeParse(input).success).toBe(true);
    }
    const entries = packExamples.customers
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line).c);
    for (const id of ids) expect(entries).toContain(id);
  });
});

describe("customers archetype layouts", () => {
  it("completes and validates every layout from neutral fallbacks and matching cast", () => {
    const registry = createRegistry({ packs: ["customers"], includeDrafts: true });
    const metas: readonly ArchetypeMeta[] = packArchetypes.customers;
    expect(metas.map((meta) => meta.id).sort()).toEqual(["client", "clients", "invoice", "reputation"]);
    let layouts = 0;
    for (const meta of metas) {
      expect(meta).not.toHaveProperty("status");
      for (const [layout, recipe] of Object.entries(meta.layouts)) {
        layouts++;
        expect(recipe.defaults.map((line) => line.c)).toEqual(recipe.recipe.map((slot) => slot.allow[0]));
        for (const cast of casts) {
          for (const { id: _id, c, ...seed } of recipe.defaults)
            expect(
              defs[c]!.props.safeParse({ ...(defs[c]!.fallback({ cast }) as object), ...seed }).success,
            ).toBe(true);
          const screen = registry.defaultLines(meta.id, layout, cast);
          expect(checkScreen(screen, registry)).toEqual([]);
          expect(
            scoreComposition(JSON.stringify(screen), packComposition(meta), layout, defs).issues,
          ).toEqual([]);
        }
      }
    }
    expect(layouts).toBe(7);
  });
});
