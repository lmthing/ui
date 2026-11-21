import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import type { Entries } from "./generate-entries";

// These leaf exports are for siblings only; keep the former doors' public surface.
const internal: Readonly<Record<string, readonly string[]>> = {
  "kit/base/helpers": ["SkeletonText"],
  "kit/base/layout": ["RowDecoration", "RowGroupLead", "RowStatusRule"],
  "kit/base/text": [
    "CardStyle",
    "CardStyleContext",
    "SurfaceTone",
    "TextFinish",
    "outlined",
    "shifted",
    "surfaceOf",
    "tintOf",
    "useTextStep",
    "variantSurfaceOf",
  ],
  "packs/books/copy/Payroll": ["calculatePayroll", "frozenPayroll", "payrollConfig", "payrollScale"],
  "packs/health/copy/Measurements": ["MeasurementRange"],
  "packs/health/copy/SymptomLog": ["SymptomSeed"],
  "packs/learning/copy/quiz-answers": ["QuizItem", "mappingOf", "rightOrder"],
  "packs/money/copy/projections": ["PayoffSource", "PayoffStrategy"],
  "packs/money/copy/repayment": ["LoanTerms", "RepaymentRow"],
  "packs/projects/copy/TimeLog-clock": ["offsetAt", "zoneFormat"],
  "packs/projects/copy/TimeLog": ["TimeEntry"],
  "packs/property/copy/Viewings": ["ViewingStatus"],
};

async function children(folder: string) {
  return readdir(folder, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
}

function bindings(node: ts.BindingName): string[] {
  if (ts.isIdentifier(node)) return [node.text];
  return node.elements.flatMap((element) => (ts.isBindingElement(element) ? bindings(element.name) : []));
}

function members(node: ts.Statement): string[] {
  if (ts.isExportDeclaration(node)) {
    const clause = node.exportClause;
    if (!clause) throw new Error(`Use named exports in ${node.getSourceFile().fileName}`);
    if (ts.isNamespaceExport(clause)) return [clause.name.text];
    return clause.elements.map(
      ({ name, isTypeOnly }) => `${node.isTypeOnly || isTypeOnly ? "type " : ""}${name.text}`,
    );
  }
  if (!ts.canHaveModifiers(node)) return [];
  const flags = ts.getModifiers(node);
  if (!flags?.some((flag) => flag.kind === ts.SyntaxKind.ExportKeyword)) return [];
  if (flags.some((flag) => flag.kind === ts.SyntaxKind.DefaultKeyword)) return [];
  if (ts.isVariableStatement(node))
    return node.declarationList.declarations.flatMap(({ name }) => bindings(name));
  if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) return [`type ${node.name.text}`];
  if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node))
    return node.name ? [node.name.text] : [];
  return [];
}

async function publicLine(root: string, folder: string, source: string) {
  const name = source.replace(/(?:\/index)?\.tsx?$/, "");
  const hidden = internal[`${folder}/${name}`];
  if (!hidden) return [`export * from "./${name}";`];
  const file = join(root, "src", folder, source);
  const ast = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
  const exports = [...new Set(ast.statements.flatMap(members))]
    .filter((name) => !hidden.includes(name.replace(/^type /, "")))
    .sort();
  return exports.length ? [`export { ${exports.join(", ")} } from "./${name}";`] : [];
}

async function namedDoor(root: string, folder: string) {
  const files = await children(join(root, "src", folder));
  if (!files) return;
  const sources = await Promise.all(
    files.map(async (file) => {
      const name = file.name;
      if (file.isFile() && /^[\w-]+\.tsx?$/.test(name) && name !== "index.ts") return [name];
      if (file.isDirectory() && `${folder}/${name}` !== "kit/base/map") {
        if (
          (await children(join(root, "src", folder, name)))?.some(
            (child) => child.isFile() && child.name === "index.ts",
          )
        )
          return [`${name}/index.ts`];
      }
      return [];
    }),
  );
  return (
    await Promise.all(
      sources
        .flat()
        .sort()
        .map((source) => publicLine(root, folder, source)),
    )
  ).flat();
}

export async function generateDoors(root: string, { defs, packs }: Entries) {
  const namedFolders = ["catalog/copy", "kit/base", ...packs.map(({ id }) => `packs/${id}/copy`)];
  const named = namedFolders.map(async (folder) => ({ folder, lines: await namedDoor(root, folder) }));
  const components = packs.map(async ({ id }) => {
    const folder = `packs/${id}/components`;
    if (!(await children(join(root, "src", folder)))) return { folder, lines: undefined };
    const lines = defs
      .filter(({ pack }) => pack === id)
      .map(({ name }) => `export * as ${name} from "./${name}";`);
    return { folder, lines };
  });
  const doors: Record<string, string[]> = {};
  for (const { folder, lines } of await Promise.all([...named, ...components])) {
    if (lines) doors[`${folder}/index.ts`] = lines.length ? lines : ["export {};"];
  }
  return doors;
}
