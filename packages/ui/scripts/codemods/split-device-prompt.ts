import { join } from "node:path";
import ts from "typescript";
import { parsePrompt, renderPrompt } from "../build/entries";
import {
  applyEdits,
  initializerNamed,
  objectNamed,
  parseSource,
  propertyName,
  readOptional,
  removeProperty,
  unwrapExpression,
  type Edit,
} from "./source";
import { promptImport } from "./split-prompts";

function bind(node: ts.Expression, field: string): Edit {
  return { start: node.getStart(), end: node.getEnd(), text: `prompt.${field}` };
}

function deviceWords(ast: ts.SourceFile) {
  const fields = objectNamed(ast, "deviceControls")?.properties.filter(ts.isPropertyAssignment) ?? [];
  const bound = new Set(
    fields.filter((node) => node.initializer.getText() === `prompt.${propertyName(node)}`).map(propertyName),
  );
  return fields.flatMap((node) => {
    const field = propertyName(node);
    return (field === "purpose" || field === "pick") && ts.isStringLiteralLike(node.initializer)
      ? [
          {
            field,
            value: node.initializer.text,
            edit: bound.has(field) ? removeProperty(ast.text, node) : bind(node.initializer, field),
          },
        ]
      : [];
  });
}

function rewrite(ast: ts.SourceFile, root: string, edits: Edit[]) {
  if (!edits.length) return [];
  const file = ast.fileName;
  return [[file, applyEdits(ast.text, [...edits, ...promptImport(ast, root, file, "Devices")])] as const];
}

/** Devices kept its prompt prose in the contract and fixtures rather than the component itself. */
export async function splitDevicePrompt(root: string) {
  const home = join(root, "src/packs/home");
  const contractFile = join(home, "device-contract.ts");
  const fixturesFile = join(home, "device-fixtures.ts");
  const promptFile = join(home, "components/Devices.prompt.md");
  const [contract, fixtures, markdown] = await Promise.all(
    [contractFile, fixturesFile, promptFile].map(readOptional),
  );
  if (contract === undefined || fixtures === undefined) return [];

  const controls = parseSource(contractFile, contract);
  const samples = parseSource(fixturesFile, fixtures);
  const words = deviceWords(controls);
  const hints = initializerNamed(samples, "deviceWriteHints");
  const array = unwrapExpression(hints);
  const inlineHints = array && ts.isArrayLiteralExpression(array) ? array.elements : undefined;
  if (!words.length && !inlineHints) return [];

  const text = markdown === undefined ? undefined : parsePrompt(promptFile, markdown);
  const purpose = words.find(({ field }) => field === "purpose")?.value ?? text?.purpose;
  const pick = words.find(({ field }) => field === "pick")?.value ?? text?.pick;
  if (purpose === undefined || pick === undefined)
    throw new Error(`${promptFile}: cannot split without purpose and pick`);
  const writeHints =
    inlineHints?.map((node) => {
      if (ts.isStringLiteralLike(node)) return node.text;
      throw new Error(`${fixturesFile}: expected literal Device Writer guidance`);
    }) ?? text?.writeHints;
  return [
    [
      promptFile,
      renderPrompt(promptFile, { purpose, pick, ...(writeHints === undefined ? {} : { writeHints }) }),
    ] as const,
    ...rewrite(
      controls,
      root,
      words.map(({ edit }) => edit),
    ),
    ...rewrite(samples, root, inlineHints ? [bind(hints!, "writeHints")] : []),
  ];
}
