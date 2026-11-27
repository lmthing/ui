import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { imageKinds } from "../../../src/catalog/images/runtime";

export function parseImageTemplate(file: string, markdown: string) {
  const match = /^# Prompt\n\n([\s\S]+?)\n\n# Reject if\n\n((?:- [^\n]+\n)+)$/.exec(
    `${markdown.trimEnd().replace(/\r\n/g, "\n")}\n`,
  );
  const prompt = match?.[1];
  if (!prompt || !/No text.*No real people.*No hands/.test(prompt))
    throw new Error(`${file}: expected Prompt with image rules and Reject if bullets`);
  return {
    prompt,
    rejectIf: match![2]!
      .trimEnd()
      .split("\n")
      .map((line) => line.slice(2)),
  };
}

export async function imageTemplateEntry(root: string) {
  const folder = join(root, "src/catalog/images/templates");
  const expected = imageKinds.map((kind) => `${kind}.md`);
  const files = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!files) return [];
  const actual = files.filter((file) => file.endsWith(".md") && file !== "README.md");
  if (
    actual.length !== expected.length ||
    actual.some((file) => !expected.includes(file as (typeof expected)[number]))
  )
    throw new Error(`${folder}: expected exactly one Markdown template per image kind`);
  const values = await Promise.all(
    expected.map(async (file, index) => [
      imageKinds[index],
      parseImageTemplate(file, await readFile(join(folder, file), "utf8")),
    ]),
  );
  return [
    "// prettier-ignore",
    `export const imageTemplates = ${JSON.stringify(Object.fromEntries(values))} as const;`,
  ];
}
