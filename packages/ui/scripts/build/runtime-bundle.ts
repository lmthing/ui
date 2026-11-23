import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Metafile, Plugin } from "esbuild";
import { runtimeSource } from "./runtime-source";

const mixedSource =
  /\/src\/(?:components\/.*\.tsx|surfaces\/.*\.tsx|packs\/[^/]+\/(?:components\/.*\.tsx|(?:index|pack|device-contract|device-fixtures)\.ts)|entry\/packs\/.*\.ts)$/;
const modelSource = /\/src\/(?:catalog\/(?:prompt|probes)\/|entry\/prompt-)/;

export function assertRuntimeBundle(meta: Metafile) {
  for (const [output, { inputs }] of Object.entries(meta.outputs)) {
    for (const [input, { bytesInOutput }] of Object.entries(inputs)) {
      if (bytesInOutput && modelSource.test(`/${input}`))
        throw new Error(`Model data in ${output}: ${input}`);
    }
  }
}

export function runtimeBundle(root: string, dataOnly = false): Plugin {
  return {
    name: "runtime-catalog",
    setup(builder) {
      builder.onResolve({ filter: /\/catalog(?:\/index)?$/ }, (args) => {
        const path = resolve(args.resolveDir, args.path);
        if ([resolve(root, "src/catalog"), resolve(root, "src/catalog/index")].includes(path))
          return { path: resolve(root, "src/catalog/runtime/index.ts") };
      });
      builder.onLoad({ filter: mixedSource }, async ({ path }) => ({
        contents: runtimeSource(path, await readFile(path, "utf8"), dataOnly),
        loader: path.endsWith(".tsx") ? "tsx" : "ts",
      }));
      builder.onLoad({ filter: /\/entry\/icons\.generated\.ts$/ }, async ({ path }) => {
        const contents = (await readFile(path, "utf8")).replace(
          /import\s*\{([\s\w,]+)\}\s*from "@tamagui\/lucide-icons";/,
          (_, names: string) =>
            names
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)
              .map((name) => `import { ${name} } from "@tamagui/lucide-icons/icons/${name}";`)
              .join("\n"),
        );
        return { contents, loader: "ts" };
      });
    },
  };
}
