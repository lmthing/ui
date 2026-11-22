import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { parsePrompt } from "../build/entries";
import { splitSources } from "./split";

const roots: string[] = [];
const component = "src/packs/booking/components/Slots.tsx";
const markdown = component.replace(".tsx", ".prompt.md");
const en = "src/packs/booking/lang/en.ts";
const slotWords = "src/packs/booking/lang/en/Slots.ts";
const packWords = "src/packs/booking/lang/en/pack.ts";

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ui-split-"));
  roots.push(root);
  const get = (file: string) => readFile(join(root, file), "utf8");
  async function put(file: string, source: string) {
    const path = join(root, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, source);
  }
  await put(
    component,
    `
export const meta = {
  id: "Slots", purpose: "Show times.", pick: "Slot picker. Not a calendar.",
  writeHints: ['Keep "time" null.', "Preserve \u00a0."],
} as const;
export const view = ({ slotLabel }: { slotLabel: string }) => slotLabel;`,
  );
  await put(
    en,
    `
import type { Label } from "../../../catalog";
const suffix = "!";
export const en = {
  slotLabel: (name: Label) => name + suffix,
  generic: "Shared",
};
export type BookingWords = typeof en;`,
  );
  return { root, get, put };
}

it("splits legacy prompt text and dictionary values once", async () => {
  const { root, get } = await fixture();
  expect(await splitSources(root)).toBe(5);
  const prompt = await get(markdown);
  expect(parsePrompt(markdown, prompt)).toEqual({
    purpose: "Show times.",
    pick: "Slot picker. Not a calendar.",
    writeHints: ['Keep "time" null.', "Preserve \u00a0."],
  });
  expect(await get(component)).toContain('from "../../../entry/prompt-Slots.generated"');
  expect(await get(slotWords)).toContain('import type { Label } from "../../../../catalog"');
  expect(await get(slotWords)).toContain("name + suffix");
  expect(await get(packWords)).toContain('generic: "Shared"');
  expect(await get(en)).not.toContain("suffix");
  expect(await splitSources(root)).toBe(0);
  expect(await get(markdown)).toBe(prompt);
});

it("moves edits from a pre-split branch after it merges the split", async () => {
  const { root, get, put } = await fixture();
  await splitSources(root);
  await put(component, (await get(component)).replace("...prompt,", '...prompt, pick: "Changed pick.",'));
  await put(
    en,
    (await get(en)).replace(
      "...SlotsWords,",
      '...SlotsWords, slotLabel: "Changed label", slotsEmpty: "Empty",',
    ),
  );
  expect(await splitSources(root)).toBe(4);
  expect(parsePrompt(markdown, await get(markdown))).toMatchObject({
    purpose: "Show times.",
    pick: "Changed pick.",
    writeHints: ['Keep "time" null.', "Preserve \u00a0."],
  });
  expect((await get(component)).match(/\.\.\.prompt/g)).toHaveLength(1);
  expect((await get(en)).match(/\.\.\.SlotsWords/g)).toHaveLength(1);
  expect(await get(slotWords)).toContain('slotLabel: "Changed label"');
  expect(await get(slotWords)).toContain('slotsEmpty: "Empty"');
  expect(await get(packWords)).toContain('generic: "Shared"');
  expect(await splitSources(root)).toBe(0);
});

it("restores a spread using the fragment import that survived the merge", async () => {
  const { root, get, put } = await fixture();
  await splitSources(root);
  await put(en, (await get(en)).replace("...SlotsWords,", 'slotLabel: "Edited time",'));
  expect(await splitSources(root)).toBe(2);
  const aggregate = await get(en);
  expect(aggregate.match(/from "\.\/en\/Slots"/g)).toHaveLength(1);
  expect(aggregate).toContain("...SlotsWords,");
  expect(await get(slotWords)).toContain('slotLabel: "Edited time"');
  expect(await splitSources(root)).toBe(0);
});

it("replaces a changed helper and deduplicates overlapping type imports", async () => {
  const { root, get, put } = await fixture();
  await splitSources(root);
  await put(
    en,
    `
import type { Label, More } from "../../../catalog";
const suffix = "?";
${(await get(en)).replace("...SlotsWords,", "...SlotsWords, slotLabel: (name: Label, _other?: More) => name + suffix,")}
`,
  );
  expect(await splitSources(root)).toBe(2);
  const fragment = await get(slotWords);
  expect(fragment.match(/const suffix/g)).toHaveLength(1);
  expect(fragment).toContain('const suffix = "?"');
  expect(fragment.match(/import type \{ Label/g)).toHaveLength(1);
  expect(fragment).toContain('import type { Label, More } from "../../../../catalog"');
  expect(await splitSources(root)).toBe(0);
});

it.each([true, false])(
  "reassembles the old core dictionary with legacy options restored: %s",
  async (restored) => {
    const { root, get, put } = await fixture();
    await splitSources(root);
    const dictionary = "src/catalog/lang/en.ts";
    const oldOptions = "src/catalog/lang/core-options.ts";
    const fragment = "src/catalog/lang/en/Composer.ts";
    await put(fragment, 'export const words = { composer: "Default" };');
    await put(
      "src/catalog/lang/en/pack.ts",
      'export const words = { fieldRange: "Range", calendarRange: "Calendar", routeModes: "Modes", activeBar: "Bar" };',
    );
    await put(
      dictionary,
      'import { coreOptions } from "./core-options"; export const en = { ...coreOptions, tag: "en" };',
    );
    if (restored) await put(oldOptions, 'export const coreOptions = { composer: "Changed" };');
    await splitSources(root);
    expect(await get(dictionary)).not.toContain("coreOptions");
    expect(await get(dictionary)).toContain("...ComposerWords,");
    expect(await get(fragment)).toContain(restored ? '"Changed"' : '"Default"');
    await expect(get(oldOptions)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await splitSources(root)).toBe(0);
  },
);
