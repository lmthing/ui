import { resolve } from "node:path";
import ts from "typescript";

const consumer = `
import { components, hostActionPolicy, atDeviceTime } from "@lmthing/ui/catalog-browser";
import { type PhoneScreenProps } from "@lmthing/ui/kit/runtime";
import { renderers as core } from "@lmthing/ui/renderers/core";
import { renderers as booking } from "@lmthing/ui/renderers/booking";

export const props: PhoneScreenProps = {
  defs: components,
  renderers: { ...core, ...booking },
  screen: { id: "home", components: [], [hostActionPolicy]: { allowsLink: () => false } },
  theme: { preset: "calm", accent: "moss", mode: "light" },
  deviceData: atDeviceTime({}, 0),
};
`;

export function checkEntryTypes(root: string) {
  const file = resolve(root, "dist/ui-entry-consumer.ts");
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    noEmit: true,
  };
  const host = ts.createCompilerHost(options);
  const read = host.getSourceFile.bind(host);
  const source = ts.createSourceFile(file, consumer, options.target!, true);
  host.getSourceFile = (name, ...args) => (name === file ? source : read(name, ...args));
  const program = ts.createProgram([file], options, host);
  const errors = program.getSemanticDiagnostics(source);
  if (errors.length)
    throw new Error(
      errors.map(({ messageText }) => ts.flattenDiagnosticMessageText(messageText, "\n")).join("\n"),
    );
}
