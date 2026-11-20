import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  placeholderTitle,
  readComponent,
  scoreComposition,
  writerFormat,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const scoped = createRegistry({ packs: ["inventory"], includeDrafts: true });
const defs: Record<string, Definition> = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def]));
const ids = ["Things", "Storage", "Loans", "Warranties", "Wishlist", "Listing", "Request", "Lease"] as const;
const recipes = {
  "things/grid": ["Header", "Search", "Chips", "Things", "Button"],
  "things/low": ["Header", "Segmented", "Things", "Button"],
  "things/add": ["Header", "Field", "Field", "Field", "Button"],
  "thing/detail": ["Header", "Gallery", "KeyValue", "Amount", "Warranties"],
  "storage/browse": ["Header", "Search", "Storage"],
  "storage/loans": ["Header", "Segmented", "Loans"],
  "storage/wants": ["Header", "Chips", "Wishlist", "Button"],
  "rentals/listings": ["Header", "Chips", "List"],
  "rentals/listing": ["Header", "Gallery", "Listing"],
  "rentals/lease": ["Header", "Lease", "Timeline"],
  "rentals/repairs": ["Header", "Segmented", "List", "Button"],
  "rentals/repair": ["Header", "Request", "Photo"],
};
const neutral: CastLike = { things: [], items: [] };
const cast: CastLike = {
  things: [{ type: "record", fields: ["first", "second"] }],
  items: [{ type: "record", id: "entry", sample: false, first: "Existing entry", second: "South corner" }],
};
const malformed: CastLike = {
  ...cast,
  items: [{ type: "record", id: "entry", sample: false, first: true, second: "  " }],
};

it("isolates inventory from core and the default Writer format until the pack is ready", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["inventory"] });
  const ready = packReady("inventory");
  expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
  if (!ready) expect(live.ids).toEqual(core.ids);
  const formats = [core, scoped, live].map((registry) => JSON.stringify(writerFormat(registry)));
  for (const id of ids)
    expect(formats.map((format) => format.includes(`"const":"${id}"`))).toEqual([false, true, ready]);
  for (const { id } of packArchetypes.inventory) {
    expect(core.archetypes).not.toHaveProperty(id);
    expect(scoped.archetypes).toHaveProperty(id);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("validates metadata and every worked-example line, including the one signature", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const example = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.inventory).toBe(example);
  const lines = example
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as { id: string; c: string } & Record<string, unknown>);
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining([...ids]));
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["count_up"]);
  for (const { id, c, ...props } of lines)
    expect(defs[c]?.props.safeParse(props).success, `${id}/${c}`).toBe(true);
});

it("fills every layout with neutral defaults and supplies exactly one compose probe per layout", () => {
  expect(packComposeProbes.inventory.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(recipes).sort(),
  );
  for (const [path, order] of Object.entries(recipes)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, neutral);
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    expect(
      scoreComposition(JSON.stringify(screen), scoped.archetypes[archetype]!.meta, layout, defs).issues,
      path,
    ).toEqual([]);
    if (path === "things/low") expect(screen.components[2]).toMatchObject({ filter: "low" });
  }
});

it.each(ids)("%s accepts its examples and cast fallbacks and declares core-first probes", (id) => {
  const def = defs[id]!;
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
  for (const source of [neutral, cast, malformed])
    expect(def.props.safeParse(def.fallback({ cast: source })).success).toBe(true);
  expect(JSON.stringify(def.fallback({ cast: neutral }))).toContain(placeholderTitle(0));
  expect(JSON.stringify(def.fallback({ cast }))).toContain("Existing entry");
  expect(def.props.safeParse({ ...(def.examples[0] as object), color: "#000000" }).success).toBe(false);
  for (const parts of [
    def.meta.parts,
    def.meta.items?.parts,
    def.meta.confirmParts,
    Object.keys(def.meta.partTiers ?? {}),
  ])
    for (const part of parts ?? []) expect(part).toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
  expect(def.probes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "choose", expect: id }),
      expect.objectContaining({ kind: "write", expect: id }),
      expect.objectContaining({ kind: "read" }),
    ]),
  );
  expect(
    def.probes.some(
      (probe) => probe.kind === "choose" && createRegistry().ids.some((core) => core === probe.expect),
    ),
  ).toBe(true);
});

it("preserves stock and storage addresses and tiered or confirmed actions", () => {
  const screen = (id: string, index = 0) =>
    readComponent(defs[id]!, defs[id]!.examples[index], "a").join("\n");
  expect(screen("Things", 1)).not.toContain("Spare lead");
  expect(screen("Things", 1)).toContain("[a/r2/qty increment");
  expect(screen("Storage")).toContain('r3 "Seed drawer"');
  expect(screen("Storage")).toContain("[a/r3 press→seeds");
  expect(defs.Loans!.meta).toMatchObject({ partTiers: { remind: "service" }, confirmParts: ["returned"] });
  expect(defs.Wishlist!.meta.confirmParts).toContain("got");
  expect(defs.Listing!.meta.partTiers?.contact).toBe("service");
  expect(defs.Request!.meta.tier).toBe("people");
});

it("rejects wrong enum values, limits, derived fields and raw photo URLs", () => {
  const cases = [
    ["Things", { items: Array(13).fill(components.Things.examples[0]!.items[0]) }],
    ["Things", { filter: "missing" }],
    ["Storage", { path: Array(5).fill("Spot") }],
    ["Loans", { loans: [{ ...components.Loans.examples[0]!.loans[0], overdue: true }] }],
    [
      "Warranties",
      { items: [{ ...components.Warranties.examples[0]!.items[0], receipt: "https://example.org/receipt" }] },
    ],
    ["Wishlist", { items: [{ name: "Wish", priority: 4 }] }],
    ["Listing", { beds: 21 }],
    ["Request", { updates: Array(5).fill({ time: "Now", text: "Update" }) }],
    ["Lease", { end: "2025-02-30" }],
    ["Lease", { due: 32 }],
  ] as const;
  for (const [id, override] of cases)
    expect(defs[id]!.props.safeParse({ ...(defs[id]!.examples[0] as object), ...override }).success, id).toBe(
      false,
    );
});
