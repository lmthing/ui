import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import * as c from "@lmthing/ui/catalog";

const ids = ["Ledger", "Expenses", "ProfitLoss", "VatReturn", "Payroll"] as const;
const layouts = {
  books_home: ["books_overview", "books_ledger"],
  expenses: ["books_receipts", "books_receipt_edit"],
  period_report: ["books_statement", "books_pay_run"],
  tax: ["books_tax_reserve", "books_vat_period"],
};
const neutral = { things: [], items: [] };
const draft = c.createRegistry({ packs: ["books"], includeDrafts: true });

describe("books scaffold", () => {
  it("exposes generated definitions only through the opted-in registry until the pack is ready", () => {
    const core = c.createRegistry();
    const live = c.createRegistry({ packs: ["books"] });
    expect(
      Object.keys(c.packOf)
        .filter((id) => c.packOf[id as keyof typeof c.packOf] === "books")
        .sort(),
    ).toEqual([...ids].sort());
    expect(draft.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
    const ready = c.packReady("books");
    if (!ready) expect(live.ids).toEqual(core.ids);
    const [draftFormat, liveFormat, coreFormat] = [draft, live, core].map((registry) =>
      JSON.stringify(c.writerFormat(registry)),
    );
    for (const id of ids) {
      expect(draftFormat).toContain(`"const":"${id}"`);
      expect(liveFormat!.includes(`"const":"${id}"`)).toBe(ready);
      expect(coreFormat).not.toContain(`"const":"${id}"`);
    }
    expect(draftFormat).toContain('"const":"Header"');
    expect(draftFormat).not.toContain('"const":"Reservation"');
    expect(
      Object.keys(draft.archetypes)
        .filter((id) => !Object.hasOwn(core.archetypes, id))
        .sort(),
    ).toEqual(Object.keys(layouts).sort());
    if (!ready) expect(Object.keys(live.archetypes)).toEqual(Object.keys(core.archetypes));
  });

  it("validates each worked-example line, the ledger and reserve seeds, and the pack metadata", () => {
    const { components, packs, packOf, packExamples, packArchetypes } = c;
    expect(c.checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(packExamples.books).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
    const lines = packExamples.books
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
    for (const { id: _id, c, ...input } of lines)
      expect(draft.schema(c)?.safeParse(input).success, c).toBe(true);
    for (const id of ids) expect(lines.some(({ c }) => c === id)).toBe(true);
    const { id: _id, c: _c, ...input } = lines.find(({ id }) => id === "l1");
    const { entries } = components.Ledger.props.parse(input);
    expect(entries.filter(({ direction, transferRef }) => direction === "in" && !transferRef)).toHaveLength(
      6,
    );
    expect(
      entries.filter(({ direction, transferRef }) => direction === "in" && transferRef).map(({ net }) => net),
    ).toEqual([40, 20]);
    expect(lines.find(({ c }) => c === "Progress")).toMatchObject({ bars: [{ value: 60, of: 90 }] });
  });
});

describe("books layouts", () => {
  it("validates neutral defaults and pairs every layout with a compose probe", () => {
    const { components, packOf, packArchetypes, archetypes, packComposeProbes } = c;
    expect(c.checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const addresses = [];
    const books: readonly c.ArchetypeMeta[] = packArchetypes.books;
    for (const { id, layouts: declared, defaultLayout } of books) {
      expect(Object.keys(declared)).toEqual(layouts[id as keyof typeof layouts]);
      expect(defaultLayout).toBe(Object.keys(declared)[0]);
      for (const [layout, { recipe }] of Object.entries(declared)) {
        addresses.push(`${id}/${layout}`);
        const screen = draft.defaultLines(id, layout, neutral);
        expect(c.checkScreen(screen, draft), `${id}/${layout}`).toEqual([]);
        expect(screen.components.map(({ c }) => c)).toEqual(
          recipe.filter(({ required }) => required).map(({ allow }) => allow[0]),
        );
      }
    }
    expect(addresses.sort()).toEqual(
      Object.entries(layouts)
        .flatMap(([id, keys]) => keys.map((key) => `${id}/${key}`))
        .sort(),
    );
    expect(packComposeProbes.books.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
      addresses,
    );
    expect(draft.defaultLines("books_home", "books_overview", neutral).components[1]).toMatchObject({
      c: "Amount",
      emphasis: "hero",
    });
    expect(draft.defaultLines("expenses", "books_receipt_edit", neutral).components[1]).toMatchObject({
      c: "Expenses",
      style: "receipt",
    });
  });
});
