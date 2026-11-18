import ts from "typescript";
import { limits, type Violation } from "../config";
import { checkImport } from "./imports";
import { checkStyles } from "./styles";

function functionName(node: ts.FunctionLikeDeclaration, ast: ts.SourceFile) {
  if ("name" in node && node.name) return node.name.getText(ast);
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) return parent.name.getText(ast);
  return "(anonymous)";
}
export function checkSource(
  root: string,
  file: string,
  source: string,
  files: ReadonlySet<string>,
): Violation[] {
  if (!/\.(?:ts|tsx|mts)$/.test(file) || file.endsWith(".generated.ts")) return [];
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: Violation[] = [];
  const visit = (node: ts.Node) => {
    const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
    if (ts.isFunctionLike(node) && "body" in node && node.body) {
      const end = ast.getLineAndCharacterOfPosition(node.end - 1).line + 1;
      const count = end - line + 1;
      if (count > limits.function)
        violations.push({
          rule: "function-lines",
          file,
          line,
          detail: `${functionName(node, ast)}: ${count} lines > ${limits.function}`,
        });
    }
    violations.push(...checkImport(file, node, files, line), ...checkStyles(root, file, node, line));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return violations;
}
