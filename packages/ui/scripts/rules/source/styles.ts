import { relative } from "node:path";
import ts from "typescript";
import { styleExemptions, type Violation } from "../config";

const hexColour = /#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b/gi;
function numeric(node: ts.Node): boolean {
  if (ts.isNumericLiteral(node)) return true;
  return ts.isPrefixUnaryExpression(node) && numeric(node.operand);
}
function isNumericZIndex(node: ts.Node) {
  if (
    (ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) &&
    node.initializer &&
    node.name.getText().replace(/["']/g, "") === "zIndex"
  )
    return numeric(node.initializer);
  if (
    ts.isJsxAttribute(node) &&
    node.name.getText() === "zIndex" &&
    node.initializer &&
    ts.isJsxExpression(node.initializer) &&
    node.initializer.expression
  )
    return numeric(node.initializer.expression);
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    numeric(node.right)
  ) {
    if (ts.isPropertyAccessExpression(node.left)) return node.left.name.text === "zIndex";
    if (
      ts.isElementAccessExpression(node.left) &&
      node.left.argumentExpression &&
      ts.isStringLiteral(node.left.argumentExpression)
    )
      return node.left.argumentExpression.text === "zIndex";
  }
  return false;
}
export function checkStyles(root: string, file: string, node: ts.Node, line: number): Violation[] {
  const path = relative(root, file);
  if (styleExemptions.some((folder) => path.startsWith(folder + "/"))) return [];
  const violations: Violation[] = [];
  if (
    ts.isStringLiteralLike(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    for (const match of node.text.matchAll(hexColour))
      violations.push({ rule: "hex-colours", file, line, detail: `raw hex colour ${match[0]}` });
  }
  if (isNumericZIndex(node))
    violations.push({ rule: "numeric-zIndex", file, line, detail: "raw numeric zIndex" });
  return violations;
}
