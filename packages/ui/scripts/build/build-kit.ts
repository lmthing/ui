import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { build } from "esbuild";
import ts from "typescript";

export async function buildKit() {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const entry = resolve(root, "src/entry/kit.ts");
  await build({
    entryPoints: [entry],
    outfile: resolve(root, "dist/kit.js"),
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    packages: "external",
  });
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    declaration: true,
    emitDeclarationOnly: true,
    rootDir: resolve(root, "src"),
    outDir: resolve(root, "dist/kit-types"),
  };
  const program = ts.createProgram([entry], options);
  const result = program.emit();
  const errors = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
  if (errors.length)
    throw new Error(
      errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"),
    );
  await writeFile(resolve(root, "dist/kit.d.ts"), 'export * from "./kit-types/entry/kit";\n');
  console.log("Built kit ESM and declarations with external peers.");
}

await buildKit();
