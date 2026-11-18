import { expect, it } from "vitest";
import { z } from "zod";
import * as catalog from "@lmthing/ui/catalog";
import type { Definition, PackId, PackMeta } from "..";
import { checkPacks } from "./index";

const pack: PackMeta = {
  id: "booking",
  name: "Booking",
  purpose: "Book time",
  pick: "Not commerce",
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

it("checks today's empty pack catalog and a complete fixture", () => {
  expect(checkPacks(catalog)).toEqual([]);
  expect(checkPacks(fixture())).toEqual([]);
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
  ["purpose/pick", changePack({ purpose: "" })],
  ["purpose/pick", changePack({ pick: "Book time" })],
  ["archetypes", (f) => (f.packArchetypes.booking = [])],
  ["example", example("")],
  ["example line", example('{"c":"Slots","title":"Valid"}\n{"c":"Unknown"}')],
  ["example line", example('{"c":"Slots","title":3}')],
  ["example line", example("broken")],
  ["probes", changePack({ probes: [yes!, no!] })],
  ["probes", changePack({ probes: [yes!, no!, no!] })],
  ["probes", changePack({ probes: [yes!, yes!, { kind: "pack", idea: "Track plants", expect: [] }] })],
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
