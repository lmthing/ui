import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Metafile, Plugin } from "esbuild";
import { runtimeSource } from "./runtime-source";

const mixedSource =
  /\/src\/(?:components\/.*\.tsx|surfaces\/.*\.tsx|packs\/[^/]+\/(?:components\/.*\.tsx|(?:index|pack|device-contract|device-fixtures)\.ts)|entry\/packs\/.*\.ts)$/;
const modelSource =
  /\/src\/(?:catalog\/(?:(?:prompt|probes)\/|meta\/pack-index[.-]|format\/writer-)|entry\/prompt-)/;
const iconImport = /import\s*\{([\s\w,]+)\}\s*from\s+["']@tamagui\/lucide-icons["'];/g;

export function assertRuntimeBundle(meta: Metafile) {
  for (const [output, { inputs, imports }] of Object.entries(meta.outputs)) {
    if (imports.some(({ path }) => path === "@tamagui/lucide-icons"))
      throw new Error(`Lucide package barrel in ${output}`);
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
      builder.onResolve({ filter: /\/(?:catalog|rules)(?:\/index)?$/ }, (args) => {
        const path = resolve(args.resolveDir, args.path).replace(/\/index$/, "");
        for (const folder of ["src/catalog", "src/catalog/rules"]) {
          if (path === resolve(root, folder)) return { path: resolve(root, folder, "runtime/index.ts") };
        }
      });
      builder.onLoad({ filter: mixedSource }, async ({ path }) => ({
        contents: runtimeSource(path, await readFile(path, "utf8"), dataOnly),
        loader: path.endsWith(".tsx") ? "tsx" : "ts",
      }));
      builder.onLoad({ filter: /\/(?:kit\/.+\.tsx?|entry\/icons\.generated\.ts)$/ }, async ({ path }) => {
        const source = await readFile(path, "utf8");
        if (!source.includes("@tamagui/lucide-icons")) return;
        // Metro can follow every re-export in the Lucide barrel even for named imports.
        const contents = source.replace(iconImport, (_, names: string) =>
          names
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .map(
              (binding) =>
                `import { ${binding} } from "@tamagui/lucide-icons/icons/${binding.split(/\s/)[0]}";`,
            )
            .join("\n"),
        );
        return { contents, loader: path.endsWith(".tsx") ? "tsx" : "ts" };
      });
    },
  };
}
