import { build } from "esbuild";
import { emptyExpectations } from "./empty-expectations";

export async function bundleChecks() {
  const result = await build({
    entryPoints: [new URL("./checks/index.ts", import.meta.url).pathname],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    define: { LOOK_EMPTY_STATES: JSON.stringify(emptyExpectations()) },
  });
  return result.outputFiles[0]!.text;
}
