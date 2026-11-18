import { dirname, extname, join, relative, resolve, basename } from "node:path";
import ts from "typescript";
import type { Violation } from "../config";

function specifier(node: ts.Node): string | undefined {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  )
    return node.moduleSpecifier.text;
  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal)
  )
    return node.argument.literal.text;
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments[0] &&
    ts.isStringLiteral(node.arguments[0])
  )
    return node.arguments[0].text;
  return undefined;
}
function targetFile(path: string, files: ReadonlySet<string>) {
  const candidates = [
    path,
    ...[".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"].map((extension) => path + extension),
    join(path, "index.ts"),
  ];
  if (extname(path))
    candidates.push(
      path.slice(0, -extname(path).length) + ".ts",
      path.slice(0, -extname(path).length) + ".tsx",
    );
  return candidates.find((file) => files.has(file));
}
export function checkImport(
  file: string,
  node: ts.Node,
  files: ReadonlySet<string>,
  line: number,
): Violation[] {
  const path = specifier(node);
  if (!path?.startsWith(".")) return [];
  const target = targetFile(resolve(dirname(file), path), files);
  if (!target || basename(target) === "index.ts") return [];
  const folder = dirname(target);
  if (!files.has(join(folder, "index.ts"))) return [];
  const fromTarget = relative(folder, dirname(file));
  if (!fromTarget || (!fromTarget.startsWith(".." + "/") && fromTarget !== "..")) return [];
  return [
    {
      rule: "folder-imports",
      file,
      line,
      detail: `${path} bypasses ${relative(dirname(file), join(folder, "index.ts"))}`,
    },
  ];
}
