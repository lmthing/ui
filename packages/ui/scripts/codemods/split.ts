import { globSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { format, resolveConfig } from "prettier";
import { splitPrompt } from "./split-prompts";
import { splitWords } from "./split-words";

export async function splitSources(root: string) {
  const sources = globSync(["src/{components,surfaces}/*.tsx", "src/packs/*/components/*.tsx"], { cwd: root })
    .filter((file) => /^[A-Z][A-Za-z0-9]*\.tsx$/.test(basename(file)))
    .sort();
  const dictionaries = globSync("src/{catalog,packs/*}/lang/en.ts", { cwd: root }).sort();
  const prompts = sources.map(async (path) => {
    const file = join(root, path);
    return splitPrompt(root, file, await readFile(file, "utf8"));
  });
  const words = dictionaries.map(async (path) => {
    const file = join(root, path);
    const prefix = path.startsWith("src/catalog/")
      ? /^src\/(?:components|surfaces)\//
      : path.split("/lang/")[0] + "/";
    const components = sources.filter((source) =>
      typeof prefix === "string" ? source.startsWith(prefix) : prefix.test(source),
    );
    return splitWords(
      file,
      await readFile(file, "utf8"),
      components.map((source) => join(root, source)),
    );
  });
  const edits = (await Promise.all([...prompts, ...words])).flat();
  const options = await resolveConfig(join(root, "package.json"));
  const formatted = await Promise.all(
    edits.map(
      async ([file, source]) =>
        [file, file.endsWith(".md") ? source : await format(source, { ...options, filepath: file })] as const,
    ),
  );
  for (const [file, source] of formatted) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, source);
  }
  return formatted.length;
}
