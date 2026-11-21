import { selectedIds, selectedLayouts } from "../../../../scripts/build";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  affordancesOf,
  readComponent,
  stampItemIds,
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
import { addressedElements, renderInstance } from "../../../../test/render";

const established = [
  "AccountCard",
  "Transactions",
  "Bills",
  "Split",
  "AmountPad",
  "PriceChart",
  "Loan",
  "Payoff",
];
const ids = [...established, "CardControls"];
const definitions = components as Record<string, Definition>;
const neutral = { things: [], items: [] };

it("publishes the selected Money pack only when every component is ready", () => {
  expect(packs.money).toEqual(pack);
  const ready = packReady("money");
  expect(ready).toBe(ids.every((id) => definitions[id]?.meta.status === "ready"));
  expect(
    buildPackIndex()
      .split("\n")
      .some((line) => line.startsWith("- money: ")),
  ).toBe(ready);
  const core = createRegistry();
  const live = createRegistry({ packs: ["money"] });
  expect(live.ids.filter((id) => !core.resolve(id)).sort()).toEqual(ready ? [...ids].sort() : []);
  const coreFormat = JSON.stringify(writerFormat(core));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(packOf[id as keyof typeof packOf]).toBe("money");
    expect(coreFormat).not.toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  expect(liveFormat).not.toContain('"const":"Appointment"');
  expect(Object.hasOwn(live.archetypes, "wallet")).toBe(ready);
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
  for (const id of selectedIds(established)) expect(lines.some((line) => line.c === id)).toBe(true);
  expect(lines.find((line) => line.c === "Loan")).toMatchObject({ detail: "full" });
  expect(lines.find((line) => line.c === "Loan")).not.toHaveProperty("style");
  const debt = (packArchetypes.money as readonly ArchetypeMeta[]).find(({ id }) => id === "debt");
  expect(debt?.layouts.money_loan?.recipe.find(({ allow }) => allow.includes("Loan"))).toEqual({
    allow: ["Loan"],
    required: true,
  });
  expect(
    registry.defaultLines("debt", "money_loan", neutral).components.find(({ c }) => c === "Loan"),
  ).toMatchObject({ detail: "full" });
  const split = lines.find((line) => line.c === "Split");
  expect(split.people).toHaveLength(4);
  // Independent Kitty seeds leave two payers owed and two flatmates owing.
  expect(split.expenses.map((expense: { amount: number }) => expense.amount)).toEqual([80, 40]);
  const groceries = lines.find((line) => line.c === "Progress").bars[0];
  expect(groceries.value / groceries.of).toBe(0.8);
  expect(groceries).toMatchObject({ tone: "bad" });
  expect(groceries).not.toHaveProperty("over");
  expect(lines.find((line) => line.c === "Amount")).toMatchObject({ emphasis: "hero" });
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

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const cases = [
  ["AccountCard", "detail", "full", "brief", "r2/last4", "4821"],
  ["AmountPad", "detail", "full", "brief", "note", "Add a note"],
  ["Bills", "detail", "full", "brief", "r1/repeat", "Monthly\u00a0·"],
  ["Loan", "detail", "brief", "full", "schedule", "Upcoming payments"],
  ["Payoff", "detail", "full", "brief", "line", "Projected balance"],
  ["PriceChart", "detail", "full", "brief", "change", "this period"],
  ["Split", "lead", "avatar", "none", "r1/photo", ""],
  ["Transactions", "lead", "icon", "none", "r1/icon", ""],
] as const;

it.each(cases)(
  "%s applies its default and declares the %s delta",
  (id, axis, defaultValue, value, part, copy) => {
    const def = components[id];
    const input = def.examples[0]!;
    const changed = { ...input, [axis]: value };
    expect(def.props.parse(input)).toMatchObject({ [axis]: defaultValue });
    expect(def.props.safeParse({ ...input, [axis]: "custom" }).success).toBe(false);
    const parsed = def.props.parse(changed);
    expect(parsed).toMatchObject({ [axis]: value });

    const name = part.split("/").at(-1)!;
    const adds = id === "Loan";
    expect(def.meta.variantParts).toMatchObject({
      [`${axis}.${value}`]: { [adds ? "adds" : "hides"]: [name] },
    });
    const addresses = (props: unknown) =>
      [...addressedElements(renderInstance(id, props, "filled", theme)).keys()].sort();
    const address = `home/c1/${part}`;
    const normal = addresses(input);
    const variant = addresses(changed);
    const [withPart, without] = adds ? [variant, normal] : [normal, variant];
    expect(withPart).toContain(address);
    expect(withPart.filter((current) => !current.endsWith(`/${name}`))).toEqual(without);
    if (copy) {
      const read = (props: unknown) => readComponent(def, props, "c1").join("\n");
      expect(read(adds ? changed : input)).toContain(copy);
      expect(read(adds ? input : changed)).not.toContain(copy);
    }
    const actions = (props: Record<string, unknown>) =>
      affordancesOf(def.meta, stampItemIds(def.meta, props), "c1");
    expect(actions(parsed)).toEqual(
      actions(def.props.parse(input)).filter((action) => id !== "AmountPad" || action.part !== "note"),
    );
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", variant: { axis, value } }));
  },
);
