import ts from "typescript";
import type { Violation } from "./config";

function unwrap(node: ts.Expression): ts.Expression {
  return ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)
    ? unwrap(node.expression)
    : node;
}

function hasLiteralWords(expression: ts.Expression): boolean {
  const node = unwrap(expression);
  if (ts.isStringLiteralLike(node)) return /[a-z]/i.test(node.text);
  return (
    ts.isObjectLiteralExpression(node) &&
    node.properties.some(
      (property) => ts.isPropertyAssignment(property) && hasLiteralWords(property.initializer),
    )
  );
}

function literalLocale(node: ts.Node, ast: ts.SourceFile): boolean {
  if (ts.isStringLiteralLike(node) && /^en(?:-[a-z0-9]{2,8})*$/i.test(node.text)) return true;
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return false;
  if (
    !/^Intl\.|\.toLocale(?:LowerCase|UpperCase|String|DateString|TimeString)$/.test(
      node.expression.getText(ast),
    )
  )
    return false;
  const first = node.arguments?.[0];
  return Boolean(first && (ts.isStringLiteralLike(first) || ts.isArrayLiteralExpression(first)));
}

export function checkLanguage(file: string, source: string): Violation[] {
  if (!/\/src\/.*\.tsx?$/.test(file) || /(?:\/lang\/|\.test\.|\.generated\.)/.test(file)) return [];
  const copy = file.includes("/copy/");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const report = (node: ts.Node, rule: Violation["rule"], detail: string) =>
    violations.push({
      file,
      rule,
      line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
      detail,
    });
  const visit = (node: ts.Node) => {
    if (literalLocale(node, ast) && !literalLocaleCallArgument(node))
      report(
        node,
        "language-locale",
        "Use the app locale; literal Intl locales and English tags belong in lang/.",
      );
    if (
      copy &&
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of node.declarationList.declarations)
        if (
          declaration.name.getText(ast) !== "defaultCurrency" &&
          declaration.initializer &&
          hasLiteralWords(declaration.initializer)
        )
          report(
            declaration,
            "language-copy",
            "Move words to lang/: exported copy constants with literal strings in their value or object fields are treated as UI words.",
          );
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return violations;
}

function literalLocaleCallArgument(node: ts.Node): boolean {
  if (!ts.isStringLiteralLike(node)) return false;
  const parent = node.parent;
  return (
    (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
    parent.arguments?.[0] === node &&
    literalLocale(parent, parent.getSourceFile())
  );
}
