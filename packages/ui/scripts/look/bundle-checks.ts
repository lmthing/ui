import { build } from "esbuild";

export async function bundleChecks() {
  const result = await build({
    entryPoints: [new URL("./checks/index.ts", import.meta.url).pathname],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
  });
  return result.outputFiles[0]!.text;
}
