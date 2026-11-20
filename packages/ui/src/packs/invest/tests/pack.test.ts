import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  scoreComposition,
  writerFormat,
  type ArchetypeMeta,
} from "@lmthing/ui/catalog";

const ids = ["Dividends", "Holdings", "InvestmentActivity", "Performance", "Watchlist"] as const;
const cast = { things: [], items: [] };
const draft = createRegistry({ packs: ["invest"], includeDrafts: true });
const layouts = {
  portfolio: ["invest_positions", "invest_allocation", "invest_performance"],
  holding: ["invest_holding", "invest_income", "invest_activity"],
  watchlist: ["invest_watch"],
  goals: ["invest_goal", "invest_goals", "invest_contribution"],
};

describe("invest pack scaffold", () => {
  it("publishes only the selected pack and only opts into drafts", () => {
    const core = createRegistry();
    const live = createRegistry({ packs: ["invest"] });
    const ready = packReady("invest");
    expect(
      Object.entries(packOf)
        .filter(([, owner]) => owner === "invest")
        .map(([id]) => id)
        .sort(),
    ).toEqual(ids);
    expect(draft.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual(ids);
    if (!ready) expect(live.ids).toEqual(core.ids);
    expect(
      Object.keys(draft.archetypes)
        .filter((id) => !Object.hasOwn(core.archetypes, id))
        .sort(),
    ).toEqual(Object.keys(layouts).sort());
    const formats = [draft, live, core].map((registry) => JSON.stringify(writerFormat(registry)));
    for (const id of ids) {
      expect(formats[0]).toContain(`"const":"${id}"`);
      expect(formats[1]!.includes(`"const":"${id}"`)).toBe(ready);
      expect(formats[2]).not.toContain(`"const":"${id}"`);
    }
    expect(formats[0]).toContain('"const":"Amount"');
    expect(formats[0]).not.toContain('"const":"Transactions"');
  });

  it("validates every Nest line and keeps the exported example verbatim", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(packExamples.invest).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
    const lines = packExamples.invest
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
    for (const { c, id: _id, ...input } of lines)
      expect(draft.schema(c)?.safeParse(input).success, c).toBe(true);
    for (const id of ids) expect(lines.filter(({ c }) => c === id)).toHaveLength(1);
  });
});

describe("invest archetypes", () => {
  it("fills every layout from neutral fallbacks and has exactly one compose probe per layout", () => {
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const invest: readonly ArchetypeMeta[] = packArchetypes.invest;
    expect(invest.map(({ id }) => id).sort()).toEqual(Object.keys(layouts).sort());
    const addresses = invest.flatMap(({ id, defaultLayout, layouts: variants }) => {
      expect(Object.keys(variants)).toEqual(layouts[id as keyof typeof layouts]);
      expect(defaultLayout).toBe(Object.keys(variants)[0]);
      return Object.entries(variants).map(([layout, { recipe }]) => {
        const screen = draft.defaultLines(id, layout, cast);
        expect(checkScreen(screen, draft)).toEqual([]);
        expect(screen.components.map(({ c }) => c)).toEqual(recipe.map(({ allow }) => allow[0]));
        return `${id}/${layout}`;
      });
    });
    expect(packComposeProbes.invest.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
      addresses.sort(),
    );
    expect(draft.defaultLines("portfolio", "invest_positions", cast).components[1]).toMatchObject({
      c: "Amount",
      emphasis: "hero",
    });
    expect(draft.defaultLines("holding", "invest_holding", cast).components[1]).toMatchObject({
      c: "Holdings",
      detail: "brief",
    });
    expect(draft.defaultLines("watchlist", "invest_watch", cast).components[2]).toMatchObject({
      c: "Watchlist",
      detail: "full",
    });
  });

  it("scores a one-holding layout that filters to the requested asset id", () => {
    const layout = "invest_holding";
    const screen = draft.defaultLines("holding", layout, cast);
    const { positions, ...fund } = components.Holdings.examples[0]!;
    screen.components[1] = {
      ...screen.components[1]!,
      ...fund,
      assetId: "global_fund",
      positions: [positions[0]],
    };
    const { issues } = scoreComposition(
      JSON.stringify(screen),
      draft.packComposeArchetypes.find(({ id }) => id === "holding")!,
      layout,
      Object.fromEntries(draft.defs.map((def) => [def.meta.id, def])),
    );
    expect(issues).toEqual([]);
  });
});
