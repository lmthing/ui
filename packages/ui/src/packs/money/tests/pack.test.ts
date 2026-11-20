import { selectedIds, selectedLayouts } from "../../../../scripts/build";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  buildPackIndex,
  checkArchetypes,
  checkPacks,
  checkScreen,
  packComposition,
  components,
  createRegistry,
  packArchetypes,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
  type Definition,
  type ArchetypeMeta,
} from "@lmthing/ui/catalog";
import { example, pack } from "..";

const ids = ["AccountCard", "Transactions", "Bills", "Split", "AmountPad", "PriceChart", "Loan", "Payoff"];
const definitions = components as Record<string, Definition>;
const neutral = { things: [], items: [] };

it("publishes all ready Money components only when Money is selected", () => {
  expect(packs.money).toEqual(pack);
  expect(packReady("money")).toBe(true);
  expect(
    buildPackIndex()
      .split("\n")
      .some((line) => line.startsWith("- money: ")),
  ).toBe(true);
  const core = createRegistry();
  const live = createRegistry({ packs: ["money"] });
  expect(live.ids.filter((id) => !core.resolve(id)).sort()).toEqual([...ids].sort());
  const coreFormat = JSON.stringify(writerFormat(core));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(packOf[id as keyof typeof packOf]).toBe("money");
    expect(coreFormat).not.toContain(`"const":"${id}"`);
    expect(liveFormat).toContain(`"const":"${id}"`);
    expect(definitions[id]?.meta.status).toBe("ready");
  }
  expect(liveFormat).not.toContain('"const":"Appointment"');
  expect(Object.hasOwn(live.archetypes, "wallet")).toBe(true);
  expect(pack.probes.filter((probe) => probe.kind === "pack")).toHaveLength(3);
  expect(pack.probes.some((probe) => probe.kind === "choose" && core.ids.includes(probe.expect))).toBe(true);
});

it("validates the pack, archetypes and every exact worked-example line", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const file = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(example).toBe(file);
  expect(packExamples.money).toBe(file);
  const registry = createRegistry({ packs: ["money"], includeDrafts: true });
  const lines = file
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
  for (const { c, id, ...input } of lines) {
    expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(registry.schema(registry.resolve(c)!)?.safeParse(input).success, c).toBe(true);
  }
  for (const id of selectedIds(ids)) expect(lines.some((line) => line.c === id)).toBe(true);
  const split = lines.find((line) => line.c === "Split");
  expect(split.people).toHaveLength(4);
  // Independent Kitty seeds leave two payers owed and two flatmates owing.
  expect(split.expenses.map((expense: { amount: number }) => expense.amount)).toEqual([80, 40]);
  const groceries = lines.find((line) => line.c === "Progress").bars[0];
  expect(groceries.value / groceries.of).toBe(0.8);
});

it("exports every planned archetype and layout without status", () => {
  const expected = {
    wallet: ["accounts", "goal"],
    budget: ["categories", "share"],
    entry: ["quick"],
    split: ["group"],
    invest: ["simple"],
    debt: ["money_loan", "money_payoff"],
  };
  expect(packArchetypes.money).toHaveLength(6);
  for (const meta of packArchetypes.money as readonly ArchetypeMeta[]) {
    expect(meta).not.toHaveProperty("status");
    expect(Object.keys(meta.layouts)).toEqual(expected[meta.id as keyof typeof expected]);
  }
});

const layouts = (packArchetypes.money as readonly ArchetypeMeta[]).flatMap((meta) =>
  Object.entries(meta.layouts).map(([layout, data]) => ({ meta, layout, data })),
);
it.each(
  layouts.filter(
    ({ meta, layout }) =>
      selectedLayouts([packComposition(meta)])?.includes(`${meta.id}/${layout}`) !== false,
  ),
)("completes $meta.id/$layout from neutral fallbacks using only core and money", ({ meta, layout, data }) => {
  const registry = createRegistry({ packs: ["money"], includeDrafts: true });
  for (const slot of data.recipe)
    for (const id of slot.allow)
      expect(
        packOf[id as keyof typeof packOf] === undefined || packOf[id as keyof typeof packOf] === "money",
      ).toBe(true);
  const screen = registry.defaultLines(meta.id, layout, neutral);
  expect(checkScreen(screen, registry)).toEqual([]);
  expect(screen.components.map((line) => line.c)).toEqual(data.defaults.map((line) => line.c));
  for (const line of screen.components) {
    const { id: _id, c, ...input } = line;
    expect(registry.schema(registry.resolve(c)!)?.safeParse(input).success).toBe(true);
  }
});
