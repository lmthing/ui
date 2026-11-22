import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { format } from "prettier";
import { expect, it } from "vitest";
import { z } from "zod";
import * as catalog from "../../src/catalog";
import { generateEntries } from "../build/entries";
import { checkRules } from "../rules";
import { generateComponent } from "./generate";

const workspace = fileURLToPath(new URL("../../../../", import.meta.url));
const dist = join(workspace, "packages/ui/dist");

async function inFixture(check: (root: string) => Promise<void>) {
  await mkdir(dist, { recursive: true });
  const root = await mkdtemp(join(dist, "component-gen-"));
  try {
    await check(root);
  } finally {
    await rm(root, { recursive: true });
  }
}

async function put(root: string, file: string, source: string) {
  const path = join(root, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}

it("generates an unbuilt Wave 6 pack component and preserves subsequent edits", async () => {
  await inFixture(async (root) => {
    const doc = "docs/catalog/packs/weather.md";
    await put(root, doc, await readFile(join(workspace, doc), "utf8"));
    await put(root, ".prettierrc.json", '{"printWidth": 58}\n');
    const pack = "src/packs/weather";
    const first = await generateComponent(root, "weather", "AstroSun");
    expect(first.written).toEqual([
      `${pack}/tests/AstroSun.test.ts`,
      `${pack}/copy/AstroSun.ts`,
      `${pack}/lang/astro-sun.ts`,
      `${pack}/components/AstroSun.tsx`,
    ]);
    const ui = join(root, "packages/ui");
    const component = join(ui, `${pack}/components/AstroSun.tsx`);
    const original = await readFile(component, "utf8");
    expect(original).toContain('status: "draft"');
    expect(original).toBe(await format(original, { filepath: component, printWidth: 58 }));
    expect(await readFile(join(ui, pack, "index.ts"), "utf8")).toBe('export * from "./components";\n');
    const door = join(ui, pack, "components/index.ts");
    expect(await readFile(door, "utf8")).toBe('export * as AstroSun from "./AstroSun";\n');
    expect(await checkRules(ui)).toEqual([]);
    await generateEntries(ui);
    expect(await readFile(join(ui, "src/entry/packs/group-1/weather.ts"), "utf8")).toContain(
      'import { AstroSun } from "../../../packs/weather";',
    );
    expect(await readFile(join(ui, "src/entry/views/group-1.ts"), "utf8")).not.toContain("AstroSun");
    const edited = original.replace("TODO: describe the nearest wrong choice", "Show a time zone");
    await writeFile(component, edited);
    expect(await generateComponent(root, "weather", "AstroSun")).toEqual({
      written: [],
      skipped: [`${pack}/components/AstroSun.tsx`],
    });
    expect(await readFile(component, "utf8")).toBe(edited);
    expect(await readFile(door, "utf8")).toBe('export * as AstroSun from "./AstroSun";\n');
  });
});

it("keeps handwritten auxiliary files, and extends rather than replacing existing pack doors", async () => {
  await inFixture(async (root) => {
    const doc = "docs/catalog/packs/weather.md";
    await put(root, doc, await readFile(join(workspace, doc), "utf8"));
    const pack = "packages/ui/src/packs/weather";
    const oldDoor = 'export { pack } from "./pack";\n';
    const copy = "export const label = () => 'custom';\n";
    await put(root, `${pack}/copy/AstroSun.ts`, copy);
    await put(root, `${pack}/index.ts`, oldDoor);
    expect((await generateComponent(root, "weather", "AstroSun")).skipped).toEqual([
      "src/packs/weather/copy/AstroSun.ts",
    ]);
    expect(await readFile(join(root, pack, "copy/AstroSun.ts"), "utf8")).toBe(copy);
    expect(await readFile(join(root, pack, "index.ts"), "utf8")).toBe(
      `${oldDoor}export { AstroSun } from "./components";\n`,
    );
  });
});

it("does not create files for invalid identifiers or an unsupported declaration", async () => {
  await inFixture(async (root) => {
    const doc = "docs/catalog/packs/weather.md";
    const source = await readFile(join(workspace, doc), "utf8");
    await put(root, doc, source.replace("`lat` number -90–90", "`lat` text without a limit"));
    await expect(generateComponent(root, "weather", "../AstroSun")).rejects.toThrow("Usage");
    await expect(generateComponent(root, "../weather", "AstroSun")).rejects.toThrow("Usage");
    await expect(generateComponent(root, "weather", "NoSuchComponent")).rejects.toThrow("No catalog section");
    await expect(generateComponent(root, "weather", "AstroSun")).rejects.toThrow("Unsupported field `lat`");
    expect(await readdir(root)).toEqual(["docs"]);
  });
});

async function medicalDraft(root: string, name: string, kebab: string) {
  const doc = "docs/catalog/packs/medical.md";
  await put(root, doc, await readFile(join(workspace, doc), "utf8"));
  const pack = "src/packs/medical";
  const files = {
    test: `${pack}/tests/${name}.test.ts`,
    copy: `${pack}/copy/${name}.ts`,
    lang: `${pack}/lang/${kebab}.ts`,
    view: `${pack}/components/${name}.tsx`,
  };
  expect(await generateComponent(root, "medical", name)).toEqual({
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
    const draft = await medicalDraft(root, "InsuranceBenefits", "insurance-benefits");
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
    const draft = await medicalDraft(root, "ClinicalIntake", "clinical-intake");
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
    const draft = await medicalDraft(root, "CareSummary", "care-summary");
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
      expect(draft.props.safeParse({ ...(input as object), [draft.meta.items!.key]: [] }).success).toBe(
        false,
      );
      return catalog
        .affordancesOf(draft.meta, catalog.stampItemIds(draft.meta, parsed), "c1")
        .filter(({ address }) => address.startsWith("c1/r"))
        .map(({ address, action }) => {
          expect(catalog.parseAddress(`home/${address}`)).not.toBeNull();
          return [address, action];
        });
    };
    expect(rowActions(input)).toEqual([
      ["c1/r1/conditions", "press"],
      ["c1/r2/allergies", "press"],
      ["c1/r3/care_team", "press"],
      ["c1/r3/call", "press"],
    ]);
    expect(rowActions({ ...input, style: "allergies_first" })).toEqual(rowActions(input));
    for (const part of Object.keys(expected)) expect(draft.lang).toContain(`${part}:`);
  });
});
