import { readFileSync } from "node:fs";
import { URL } from "node:url";
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
  writerFormat,
  type ArchetypeMeta,
  type Component,
  type Definition,
} from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";

const ids = ["Documents", "Renewals", "Receipts", "Signature", "TaxYear", "ScanBatch"] as const;
const core = createRegistry();
const draft = createRegistry({ packs: ["paperwork"], includeDrafts: true });
const definitions: Record<string, Definition> = components;
const cast = { things: [], items: [] };
const layouts = {
  vault: ["vault_all", "vault_record", "vault_capture", "vault_batch"],
  due_soon: ["paperwork_due", "paperwork_renewal"],
  sign: ["paperwork_sign", "paperwork_signed"],
  tax_prep: ["tax_evidence", "tax_receipts", "tax_tasks"],
};
const exampleLayouts = [
  ["vault", "vault_all"],
  ["due_soon", "paperwork_due"],
  ["tax_prep", "tax_receipts"],
  ["tax_prep", "tax_evidence"],
  ["tax_prep", "tax_tasks"],
  ["sign", "paperwork_sign"],
  ["sign", "paperwork_signed"],
  ["vault", "vault_record"],
  ["vault", "vault_capture"],
  ["due_soon", "paperwork_renewal"],
  ["vault", "vault_batch"],
] as const;

describe("paperwork scaffold", () => {
  it("opts in to only paperwork, without exposing it prematurely in the Writer format", () => {
    const live = createRegistry({ packs: ["paperwork"] });
    const ready = packReady("paperwork");
    if (!ready) expect(live.ids).toEqual(core.ids);
    expect(draft.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
    const [scopedFormat, liveFormat, coreFormat] = [draft, live, core].map((reg) =>
      JSON.stringify(writerFormat(reg)),
    );
    for (const id of ids) {
      expect(packOf[id]).toBe("paperwork");
      const constant = `"const":"${id}"`;
      expect(scopedFormat).toContain(constant);
      expect(liveFormat!.includes(constant)).toBe(ready);
      expect(coreFormat).not.toContain(constant);
    }
    expect(scopedFormat).toContain('"const":"Checklist"');
    expect(scopedFormat).not.toContain('"const":"TravelDocs"');
    expect(core.archetypes).not.toHaveProperty("vault");
    expect(Object.hasOwn(live.archetypes, "vault")).toBe(ready);
  });

  it("keeps two positive Director cases, an off-pack case and a core-first selection", () => {
    const packProbes = packs.paperwork.probes;
    expect(
      packProbes.filter((p) => p.kind === "pack" && p.expect.some((id) => id === "paperwork")),
    ).toHaveLength(2);
    expect(packProbes).toContainEqual(expect.objectContaining({ kind: "pack", expect: ["money"] }));
    expect(packProbes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Camera" }));
  });
});

describe("paperwork archetypes and worked example", () => {
  it("validates all neutral default screens and has a matching compose probe for each", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const metas: readonly ArchetypeMeta[] = packArchetypes.paperwork;
    expect(metas.map(({ id }) => id).sort()).toEqual(Object.keys(layouts).sort());
    for (const { id, defaultLayout, layouts: owned } of metas) {
      const expected = layouts[id as keyof typeof layouts];
      expect(Object.keys(owned)).toEqual(expected);
      expect(defaultLayout).toBe(expected[0]);
      for (const [name, { recipe }] of Object.entries(owned)) {
        const screen = draft.defaultLines(id, name, cast);
        expect(checkScreen(screen, draft), name).toEqual([]);
        expect(screen.components.map((line) => line.c)).toEqual(recipe.map((slot) => slot.allow[0]));
      }
    }
    const addresses = Object.entries(layouts).flatMap(([id, names]) => names.map((name) => `${id}/${name}`));
    expect(packComposeProbes.paperwork.map((p) => `${p.archetype}/${p.layout}`).sort()).toEqual(
      addresses.sort(),
    );
    expect(draft.defaultLines("vault", "vault_capture", cast).components[1]).toMatchObject({
      c: "Camera",
      kind: "scan",
    });
    expect(draft.defaultLines("due_soon", "paperwork_renewal", cast).components[1]).toMatchObject({
      c: "Renewals",
      style: "cards",
    });
  });

  it("validates every worked-example line and each screen assembled in header order", () => {
    const file = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
    expect(packExamples.paperwork).toBe(file);
    const lines: Component[] = file
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    const screens: Component[][] = [];
    expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
    for (const { c, id, ...input } of lines) {
      expect(definitions[draft.resolve(c) ?? ""]?.props.safeParse(input).success, `${c} ${id}`).toBe(true);
      if (c === "Header") screens.push([]);
      screens.at(-1)!.push({ c, id, ...input });
    }
    expect(screens).toHaveLength(exampleLayouts.length);
    for (const [index, [archetype, layout]] of exampleLayouts.entries()) {
      const components = screens[index]!;
      expect(checkScreen({ id: layout, components }, draft)).toEqual([]);
      expect(components.map(({ c }) => c)).toEqual(
        draft.defaultLines(archetype, layout, cast).components.map(({ c }) => c),
      );
    }
    // The harness selects check_burst for Trot; Calendar is a candidate but is not selected.
    expect(lines.filter(({ c }) => definitions[c]?.meta.signature === "check_burst")).toMatchObject([
      { c: "Checklist" },
    ]);
    expect(lines.find(({ c }) => c === "Receipts")?.items).toHaveLength(6);
    expect(ids.every((id) => lines.some(({ c }) => c === id))).toBe(true);
  });
});
