import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const suffix = ".prompt.md";
const layout =
  /^## Purpose\n\n([^\n]+)\n\n## Pick\n\n([^\n]+)\n\n## Avoid\n\n([^\n]+)\n\n## Writer\n\n((?:- [^\n]+\n)+)$/;

export function parseFlowPrompt(file: string, markdown: string) {
  const match = layout.exec(`${markdown.trimEnd().replace(/\r\n/g, "\n")}\n`);
  if (!match) throw new Error(`${file}: expected Purpose, Pick, Avoid and Writer bullets`);
  const [, purpose, pick, avoid, writer] = match;
  return {
    purpose: purpose!,
    pick: pick!,
    avoid: avoid!,
    writeHints: writer!
      .trimEnd()
      .split("\n")
      .map((line) => line.slice(2)),
  };
}

export async function flowPrompts(root: string) {
  const folder = join(root, "src/catalog/flow-templates/templates");
  const files = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return Object.fromEntries(
    await Promise.all(
      files
        .filter((file) => file.endsWith(suffix))
        .sort()
        .map(async (file) => {
          const text = await readFile(join(folder, file), "utf8");
          const prompt = parseFlowPrompt(file, text);
          return [
            `flow-${file.slice(0, -suffix.length)}.generated.ts`,
            [`export const prompt = ${JSON.stringify(prompt)};`],
          ];
        }),
    ),
  );
}
