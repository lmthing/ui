import { expect, it } from "vitest";
import { z } from "zod";
import * as catalog from "@lmthing/ui/catalog";
import type { ArchetypeOverrides, Definition, PackId, PackMeta } from "..";
import { checkPacks } from "./index";

const pack: PackMeta = {
  id: "booking",
  example: "example.jsonl",
  probes: [
    { kind: "pack", idea: "Reserve a lesson", expect: ["booking"] },
    { kind: "pack", idea: "Reserve a haircut", expect: ["booking"] },
    { kind: "pack", idea: "Sell cakes", expect: ["commerce"] },
  ],
};
const component: Definition = {
  ...catalog.components.List,
  meta: { ...catalog.components.List.meta, id: "Slots", dense: true },
  props: z.strictObject({ title: z.string() }),
};
const fixture = () => ({
  components: { Slots: component },
  packOf: { Slots: "booking" as const },
  packs: { booking: pack },
  packArchetypes: {
    booking: [catalog.components.List, catalog.components.List].map((_, i) => ({
      id: `fixture${i}`,
      job: "Book",
      layouts: {},
      defaultLayout: "default",
    })),
  },
  packExamples: { booking: '{"c":"Slots","title":"Haircut"}' },
});
type Fixture = ReturnType<typeof fixture>;

it("checks today's pack catalog and a fixture with a competing pack", () => {
  expect(checkPacks(catalog)).toEqual([]);
  expect(checkPacks(fixture())).toEqual([]);
});
it.each([
  { expect: [], allow: [], issues: [] },
  { expect: ["social"], allow: [], issues: ["media: probes"] },
  { expect: [], allow: ["social"], issues: ["media: probes"] },
] as const)("checks the core exclusion with Director expect $expect and allow $allow", (miss) => {
  const pack: PackMeta = catalog.packs.media;
  const positives = pack.probes.filter((probe) => probe.kind === "pack" && probe.expect.includes("media"));
  const probes = [
    ...positives,
    { kind: "pack", idea: "Play one recording", expect: miss.expect, allow: miss.allow },
  ] as const;
  expect(checkPacks({ ...catalog, packs: { ...catalog.packs, media: { ...pack, probes } } })).toEqual(
    miss.issues,
  );
});
it("requires the named core component to exist", () => {
  const { Player: _player, ...components } = catalog.components;
  expect(checkPacks({ ...catalog, components })).toContain("media: purpose/pick");
});
it("accepts optional known additions without requiring every allowed pack", () => {
  const input = fixture();
  input.packs.booking = {
    ...pack,
    probes: pack.probes.map((probe) => ({ ...probe, allow: ["customers", "commerce", "team", "books"] })),
  };
  expect(checkPacks(input)).toEqual([]);
});
const changePack = (patch: Partial<PackMeta>) => (f: Fixture) => (f.packs.booking = { ...pack, ...patch });
const changeMeta = (patch: Partial<Definition["meta"]>) => (f: Fixture) =>
  (f.components.Slots = { ...component, meta: { ...component.meta, ...patch } });
const example = (text: string) => (f: Fixture) => (f.packExamples.booking = text);
it.each<[string, (f: Fixture) => unknown]>([
  ["pack metadata belongs", changePack({ id: "commerce" })],
  ["packOf names an undeclared pack", (f) => (f.packOf.Slots = "commerce" as "booking")],
  ["packOf does not name a matching component", changeMeta({ id: "Other" })],
  [
    "packOf does not name a matching component",
    (f) => delete (f.components as Partial<Fixture["components"]>).Slots,
  ],
  ["archetype belongs to an undeclared pack", (f) => delete (f.packs as Partial<Fixture["packs"]>).booking],
])("rejects ownership: %s", (issue, mutate) => {
  const input = fixture();
  mutate(input);
  expect(checkPacks(input).join("\n")).toContain(issue);
});
const [yes, , no] = pack.probes;
it.each<[string, (f: Fixture) => unknown]>([
  ["purpose/pick", changePack({ id: "unknown" as PackId })],
  ["archetypes", (f) => (f.packArchetypes.booking = [])],
  ["example", example("")],
  ["example line", example('{"c":"Slots","title":"Valid"}\n{"c":"Unknown"}')],
  ["example line", example('{"c":"Slots","title":3}')],
  ["example line", example("broken")],
  ["probes", changePack({ probes: [yes!, no!] })],
  ["probes", changePack({ probes: [yes!, no!, no!] })],
  ["probes", changePack({ probes: [yes!, yes!, { kind: "pack", idea: "Track plants", expect: [] }] })],
  [
    "probes",
    changePack({
      probes: [yes!, yes!, { kind: "pack", idea: "Track plants", expect: [], allow: ["commerce"] }],
    }),
  ],
  [
    "allow",
    changePack({
      probes: [
        ...pack.probes,
        { kind: "pack", idea: "Reserve", expect: ["booking"], allow: ["bakery" as PackId] },
      ],
    }),
  ],
  [
    "expect",
    changePack({ probes: [...pack.probes, { kind: "pack", idea: "Buy", expect: ["bakery" as PackId] }] }),
  ],
  [
    "expect",
    changePack({
      probes: [
        ...pack.probes,
        { kind: "pack", idea: "Many", expect: ["booking", "booking", "booking", "booking"] },
      ],
    }),
  ],
  ["parts", changeMeta({ confirmParts: ["missing"] })],
  ["parts", changeMeta({ partTiers: { missing: "service" } })],
  [
    "dense",
    (f) => {
      const { dense: _dense, ...meta } = component.meta;
      f.components.Slots = { ...component, meta };
    },
  ],
])("rejects %s", (issue, mutate) => {
  const input = fixture();
  mutate(input);
  expect(checkPacks(input).join("\n")).toContain(issue);
});

const layout = {
  recipe: [{ allow: ["Header", "Slots"], required: true }],
  defaults: [{ id: "slots", c: "Slots" }],
};
const overridesFixture = () => {
  const input = fixture();
  return { ...input, components: { ...input.components, Header: catalog.components.Header } };
};

it("checks an override of a core layout and a new layout under the same core archetype", () => {
  expect(
    checkPacks({
      ...overridesFixture(),
      packArchetypeOverrides: { booking: { journal: { entries: layout, month: layout } } },
    }),
  ).toEqual([]);
});

it("checks recipe alternatives and defaults against the owning pack", () => {
  const input = overridesFixture();
  const issues = checkPacks({
    ...input,
    components: { ...input.components, Cart: { ...component, meta: { ...component.meta, id: "Cart" } } },
    packOf: { ...input.packOf, Cart: "commerce" },
    packArchetypeOverrides: {
      booking: {
        journal: {
          month: {
            recipe: [...layout.recipe, { allow: ["Missing"], required: false }],
            defaults: [{ id: "cart", c: "Cart" }],
          },
        },
      },
    },
  });
  expect(issues).toContain("booking: journal/month: recipe names unknown component Missing");
  expect(issues).toContain("booking: journal/month: recipe names commerce component Cart");
});

it.each<[NonNullable<Parameters<typeof checkPacks>[0]["packArchetypeOverrides"]>, string]>([
  [{ booking: { fixture0: { entries: layout } } as ArchetypeOverrides }, "unknown core archetype"],
  [{ booking: { journal: {} } }, "no layout overrides"],
  [{ booking: { journal: { "bad/id": layout } } }, "invalid layout id"],
  [{ home: { journal: { entries: layout } } }, "layout overrides belong to an undeclared pack"],
  [
    { booking: { journal: { entries: layout } }, home: { journal: { entries: layout } } },
    "duplicate layout override (already in booking)",
  ],
])("rejects invalid overrides %j", (packArchetypeOverrides, issue) => {
  expect(checkPacks({ ...overridesFixture(), packArchetypeOverrides }).join("\n")).toContain(issue);
});
