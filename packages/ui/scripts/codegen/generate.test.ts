import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { expect, it } from "vitest";
import { z } from "zod";
import * as catalog from "../../src/catalog";
import { generateComponent } from "./generate";
import { inFixture, put, workspace } from "./generate-fixture";

async function packDraft(root: string, scope: string, name: string, kebab: string) {
  const doc = `docs/catalog/packs/${scope}.md`;
  await put(root, doc, await readFile(join(workspace, doc), "utf8"));
  const pack = `src/packs/${scope}`;
  const files = {
    test: `${pack}/tests/${name}.test.ts`,
    copy: `${pack}/copy/${name}.ts`,
    lang: `${pack}/lang/${kebab}.ts`,
    view: `${pack}/components/${name}.tsx`,
  };
  expect(await generateComponent(root, scope, name)).toEqual({
    written: Object.values(files),
    skipped: [],
  });
  const load = (file: string) => readFile(join(root, "packages/ui", file), "utf8");
  const [test, copy, lang, view] = await Promise.all(Object.values(files).map(load));
  const module: { exports: unknown } = { exports: {} };
  const { code } = transformSync(view!, { loader: "tsx", format: "cjs" });
  runInNewContext(code, { module, require: (id: string) => (id === "zod" ? { z } : catalog) });
  const draft = module.exports as catalog.Definition;
  expect(draft.meta.status).toBe("draft");
  expect(draft.props.safeParse(draft.fallback({ cast: { things: [], items: [] } })).success).toBe(true);
  expect(copy).toContain(`export const ${name[0]!.toLowerCase()}${name.slice(1)}Label`);
  expect(test).toContain(`const { examples, fallback, probes, props } = ${name};`);
  return { ...draft, test: test!, lang: lang! };
}

it("generates a secret field with the handwritten bound and operator-read redaction", async () => {
  await inFixture(async (root) => {
    const draft = await packDraft(root, "medical", "InsuranceBenefits", "insurance-benefits");
    const input = draft.fallback({ cast: { things: [], items: [] } }) as Record<string, unknown>;
    const memberId = "DEMO".repeat(5);
    expect(draft.props.parse({ ...input, memberId })).toMatchObject({ memberId });
    expect(draft.props.safeParse({ ...input, memberId: `${memberId}x` }).success).toBe(false);
    const schema = z.toJSONSchema(draft.props, { io: "input", unrepresentable: "any" });
    expect(schema.properties?.memberId).toEqual({ type: "string", maxLength: 20, kind: "secret", max: 20 });
    const read = catalog.readComponent(draft, { ...input, memberId }, "c1").join("\n");
    expect(read).toContain("(secret)");
    expect(read).not.toContain(memberId);
    expect(draft.test).toContain('memberId: "x".repeat(21)');
  });
});

it("generates an optional zero-based index into the question options, not its score array", async () => {
  await inFixture(async (root) => {
    const draft = await packDraft(root, "medical", "ClinicalIntake", "clinical-intake");
    const input = draft.fallback({ cast: { things: [], items: [] } }) as Record<string, unknown>;
    const question = { prompt: "Question", options: ["A", "B"], scoreValues: [0, 1, 2, 3, 4] };
    const accepts = (question: unknown) => draft.props.safeParse({ ...input, questions: [question] }).success;
    expect(accepts(question)).toBe(true);
    expect(accepts({ ...question, selectedAt: 0 })).toBe(true);
    expect(accepts({ ...question, selectedAt: 4, options: ["A", "B", "C", "D", "E"] })).toBe(true);
    for (const selectedAt of [-1, 0.5, 2, 5, "1"]) expect(accepts({ ...question, selectedAt })).toBe(false);
    expect(draft.meta.actions?.items).toEqual({ present: ["check"], option: ["select"] });
    expect(draft.lang).toContain("option:");
  });
});

it("generates a named item action per array and stamps only its own rows", async () => {
  await inFixture(async (root) => {
    const draft = await packDraft(root, "medical", "CareSummary", "care-summary");
    const expected = {
      conditions: ["press"],
      allergies: ["press"],
      immunizations: ["press"],
      care_team: ["press"],
      call: ["press"],
    };
    expect(draft.meta.items?.parts).toEqual(["root", ...Object.keys(expected)]);
    expect(draft.meta.actions?.items).toEqual(expected);
    expect(draft.meta.partTiers).toEqual({ call: "service", export: "service" });
    const input = {
      conditions: [{ name: "Example condition", status: "active" }],
      allergies: [{ substance: "Example allergen", reaction: "Example reaction", severity: "mild" }],
      immunizations: [],
      careTeam: [{ name: "Example contact", role: "Example role" }],
    };
    const rowActions = (input: unknown) => {
      const parsed = draft.props.parse(input) as Record<string, unknown>;
      return catalog
        .affordancesOf(draft.meta, catalog.stampItemIds(draft.meta, parsed), "c1")
        .filter(({ address }) => address.startsWith("c1/r"))
        .map(({ address, action }) => {
          expect(catalog.parseAddress(`home/${address}`)).not.toBeNull();
          return [address, action];
        });
    };
    const addresses = [
      ["c1/r1/conditions", "press"],
      ["c1/r2/allergies", "press"],
      ["c1/r3/care_team", "press"],
    ];
    const withPhone = { ...input, careTeam: [{ ...input.careTeam[0], phone: "555-0105" }] };
    expect(rowActions(input)).toEqual(addresses);
    expect(rowActions({ ...withPhone, style: "allergies_first" })).toEqual([
      ...addresses,
      ["c1/r3/call", "press"],
    ]);
    expect(draft.props.safeParse({ ...input, [draft.meta.items!.key]: [] }).success).toBe(false);
    for (const part of Object.keys(expected)) expect(draft.lang).toContain(`${part}:`);
  });
});

it("keeps host overflow out of the bounded listings schema", async () => {
  await inFixture(async (root) => {
    const draft = await packDraft(root, "realestate", "PropertySearch", "property-search");
    const input = draft.fallback({ cast: { things: [], items: [] } }) as { listings: object[] };
    const withListings = (n: number) => ({
      ...input,
      listings: Array.from({ length: n }, (_, i) => ({ ...input.listings[0], listingRef: `home_${i}` })),
    });
    expect(draft.props.safeParse(withListings(0)).success).toBe(false);
    expect(draft.props.safeParse(withListings(6)).success).toBe(true);
    expect(draft.props.safeParse(withListings(7)).success).toBe(false);
    expect(draft.props.safeParse({ ...input, overflow: 7 }).success).toBe(false);
    expect(draft.test).toContain("length: 7");
    expect(draft.meta.items?.parts).toEqual(["root", "save"]);
    expect(draft.meta.partTiers).toEqual({ locate: "ok" });
    const read = catalog.readComponent(draft, withListings(2), "c1").join("\n");
    for (const address of ["r1 press", "r1/save toggle", "r2 select", "r3 press", "r4 select"])
      expect(read).toContain(`[c1/${address}`);
    expect(read).not.toContain("[c1/r2 press");
  });
});

it("generates independently bounded dates and slots with stable slot addresses", async () => {
  await inFixture(async (root) => {
    const draft = await packDraft(root, "realestate", "TourBooking", "tour-booking");
    const input = draft.fallback({ cast: { things: [], items: [] } }) as Record<string, unknown>;
    const time = (i: number) => ({ id: `slot_${i}`, label: "10:00 AM", taken: i === 1 });
    const day = (i: number, n: number) => ({
      date: `2026-12-0${i + 1}`,
      slots: Array.from({ length: n }, (_, index) => time(index)),
    });
    const accepts = (dates: unknown[]) => draft.props.safeParse({ ...input, dates }).success;
    expect(accepts([day(0, 1)])).toBe(true);
    expect(accepts(Array.from({ length: 5 }, (_, i) => day(i, 8)))).toBe(true);
    for (const dates of [[], [day(0, 0)], [day(0, 9)], Array.from({ length: 6 }, (_, i) => day(i, 1))])
      expect(accepts(dates)).toBe(false);
    expect(accepts([{ ...day(0, 1), slots: [{ ...time(0), extra: true }] }])).toBe(false);
    expect(draft.meta.actions?.items).toEqual({ root: ["select"] });
    expect(draft.meta.confirmParts).toEqual(["cancel"]);
    const dates = [day(0, 2), day(1, 1)];
    const read = (dateAt: number) =>
      catalog.readComponent(draft, { ...input, dates, dateAt }, "c1").join("\n");
    expect(read(0)).toContain("[c1/r1 select");
    expect(read(0)).not.toMatch(/\[c1\/r[23] select/);
    expect(read(1)).toContain("[c1/r3 select");
    expect(read(1)).not.toMatch(/\[c1\/r[12] select/);
  });
});
