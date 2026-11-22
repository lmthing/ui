import { basename, dirname, join } from "node:path";
import ts from "typescript";
import { applyEdits, objectNamed, parseSource, readOptional, removeProperty, type Edit } from "./source";

const legacyKeys = ["composer", "fieldRange", "calendarRange", "routeModes", "activeBar"];

export async function migrateCoreOptions(file: string, source: string) {
  if (basename(dirname(dirname(file))) !== "catalog") return { source };
  const ast = parseSource(file, source);
  const en = objectNamed(ast, "en");
  const declaration = ast.statements.find(
    (node): node is ts.ImportDeclaration =>
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "./core-options",
  );
  const bindings = declaration?.importClause?.namedBindings;
  const local =
    bindings && ts.isNamedImports(bindings)
      ? bindings.elements.find(({ name, propertyName }) => (propertyName ?? name).text === "coreOptions")
          ?.name.text
      : undefined;
  if (!en || !declaration || !local) return { source };
  const spread = en.properties.find(
    (prop) => ts.isSpreadAssignment(prop) && prop.expression.getText() === local,
  );
  if (!spread) return { source };

  const path = join(dirname(file), "core-options.ts");
  const legacy = await readOptional(path);
  const edits: Edit[] = [{ start: declaration.getFullStart(), end: declaration.getEnd(), text: "" }];
  if (legacy === undefined) {
    edits.push(removeProperty(source, spread));
    return { source: applyEdits(source, edits), recover: legacyKeys };
  }
  const options = objectNamed(parseSource(path, legacy), "coreOptions");
  if (!options) throw new Error(`${path}: expected a legacy coreOptions object`);
  edits.push({
    start: spread.getStart(),
    end: spread.getEnd(),
    text: options.properties.map((prop) => prop.getText()).join(",\n"),
  });
  return { source: applyEdits(source, edits), remove: path };
}
