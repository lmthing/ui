import { expect, it } from "vitest";
import {
  archetypes,
  components,
  packOf,
  runComposeProbes,
  type ArchetypeMeta,
  type ArchetypeOverrides,
  type RegistryOptions,
} from "@lmthing/ui/catalog";
import { registryOf } from "./index";

const cast = { things: [], items: [] };
const recipe = {
  recipe: [
    { allow: ["Header"], required: true },
    { allow: ["ServiceMenu"], required: true },
    { allow: ["Button"], required: true },
  ],
  defaults: [
    { id: "header", c: "Header" },
    { id: "menu", c: "ServiceMenu" },
    { id: "button", c: "Button" },
  ],
  writeHints: ["Use the supplied content."],
};
const booking = { journal: { entries: recipe, summary: recipe } } satisfies ArchetypeOverrides;
const registry = (options: RegistryOptions = {}, ready = false) =>
  registryOf(components, options, packOf, () => ready, {}, { booking });

it("applies replacement and added layouts only for an active pack, leaving core metadata unchanged", () => {
  const core = archetypes.journal.meta;
  const active = registry({ packs: ["booking"], includeDrafts: true });
  const meta = active.archetypes.journal!.meta;
  expect(Object.keys(meta.layouts)).toEqual(["entries", "photos", "write", "summary"]);
  expect(meta.layouts.photos).toBe(core.layouts.photos);
  expect(meta.purpose).toBe(core.purpose);
  expect(meta.layouts.entries?.writeHints).toBe(recipe.writeHints);
  expect(active.defaultLines("journal", "entries", cast).components.map(({ c }) => c)).toEqual([
    "Header",
    "ServiceMenu",
    "Button",
  ]);
  expect(active.defaultLines("journal", "summary", cast).components).toEqual(
    active.defaultLines("journal", "entries", cast).components,
  );
  expect(registry({ packs: ["booking"] }, true).archetypes.journal!.meta).toEqual(meta);
  for (const inactive of [
    registry(),
    registry({ packs: ["booking"] }),
    registry({ packs: ["home"], includeDrafts: true }),
    registry({ includeDrafts: true }),
  ]) {
    expect(inactive.archetypes.journal!.meta).toBe(core);
    expect(inactive.defaultLines("journal", "entries", cast).components.map(({ c }) => c)).toEqual([
      "Header",
      "Card",
      "Button",
    ]);
    expect(() => inactive.defaultLines("journal", "summary", cast)).toThrow("Unknown layout journal/summary");
    expect(inactive.packComposeArchetypes).toEqual([]);
  }
});

it("composes only the pack's changed core layouts using effective recipes and defaults", async () => {
  const active = registry({ packs: ["booking"], includeDrafts: true });
  const prompts: string[] = [];
  const results = await runComposeProbes({
    archetypes: active.packComposeArchetypes,
    defs: Object.fromEntries(active.defs.map((def) => [def.meta.id, def])),
    cast,
    samples: 1,
    callModel: async (prompt) => {
      prompts.push(prompt);
      const layout = prompt.includes("journal/entries") ? "entries" : "summary";
      return JSON.stringify(active.defaultLines("journal", layout, cast));
    },
  });
  expect(results.map(({ archetype, layout, status }) => [archetype, layout, status])).toEqual([
    ["journal", "entries", "pass"],
    ["journal", "summary", "pass"],
  ]);
  expect(prompts).toHaveLength(2);
  for (const prompt of prompts) {
    expect(prompt).toContain('"allow":["ServiceMenu"]');
    expect(prompt).toContain("Layout rule: Use the supplied content.");
  }
});

it("does not inject core list/grouped defaults into a replacement recipe", () => {
  const source = {
    things: [{ type: "item", fields: ["name", "group"] }],
    items: [{ id: "one", type: "item", sample: true, name: "One", group: "First" }],
  };
  const active = registryOf(
    components,
    { packs: ["booking"], includeDrafts: true },
    packOf,
    undefined,
    {},
    { booking: { list: { grouped: recipe } } },
  );
  expect(
    registry()
      .defaultLines("list", "grouped", source)
      .components.map(({ c }) => c),
  ).toContain("Chips");
  expect(active.defaultLines("list", "grouped", source).components.map(({ c }) => c)).toEqual([
    "Header",
    "ServiceMenu",
    "Button",
  ]);
});

it.each([
  [{ booking: ["journal"] }, "duplicate archetype id journal"],
  [{ booking: ["visit", "visit"] }, "duplicate archetype id visit"],
  [{ booking: ["visit"], home: ["visit"] }, "duplicate archetype id visit"],
])("rejects duplicate registrations in %j", (ids, issue) => {
  const owned = Object.fromEntries(
    Object.entries(ids).map(([pack, names]) => [
      pack,
      names!.map((id): ArchetypeMeta => ({ id, job: "Visit", defaultLayout: "plain", layouts: {} })),
    ]),
  );
  expect(() =>
    registryOf({}, { packs: ["booking", "home"], includeDrafts: true }, {}, undefined, owned),
  ).toThrow(issue);
});

it("rejects two active packs claiming the same core layout", () => {
  expect(() =>
    registryOf(
      {},
      { packs: ["home", "booking"], includeDrafts: true },
      {},
      undefined,
      {},
      {
        booking,
        home: { journal: { entries: recipe } },
      },
    ),
  ).toThrow("duplicate layout override journal/entries");
});
