import ts from "typescript";

function member(name: ts.Identifier, parent?: ts.Node) {
  if (parent && ts.isPropertyAccessExpression(parent) && parent.expression === name) return parent.name.text;
  if (parent && ts.isQualifiedName(parent) && parent.left === name) return parent.right.text;
  if (parent && ts.isElementAccessExpression(parent) && parent.expression === name) {
    const key = parent.argumentExpression;
    if (ts.isStringLiteralLike(key)) return key.text;
  }
}

export function namespaceUses(ast: ts.SourceFile) {
  const uses = new Map<string, string[] | undefined>();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const binding = statement.importClause?.namedBindings;
    if (binding && ts.isNamespaceImport(binding)) uses.set(binding.name.text, []);
  }
  if (!uses.size) return uses;
  function visit(node: ts.Node, parent?: ts.Node) {
    if (ts.isIdentifier(node) && !(parent && ts.isNamespaceImport(parent))) {
      const names = uses.get(node.text);
      if (names) {
        const key = member(node, parent);
        if (key === undefined)
          uses.set(node.text, undefined); // The whole namespace can escape.
        else if (!names.includes(key)) names.push(key);
      }
    }
    ts.forEachChild(node, (child) => visit(child, node));
  }
  visit(ast);
  return uses;
}

export function importNames(clause: ts.ImportClause | undefined, uses: ReturnType<typeof namespaceUses>) {
  if (clause?.isTypeOnly) return null;
  if (!clause) return;
  const { name, namedBindings } = clause;
  const defaults = name ? ["default"] : [];
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    const names = uses.get(namedBindings.name.text);
    return names && [...defaults, ...names];
  }
  const names = namedBindings?.elements
    .filter((item) => !item.isTypeOnly)
    .map(({ name, propertyName }) => (propertyName ?? name).text);
  return !name && namedBindings?.elements.length && !names?.length ? null : [...defaults, ...(names ?? [])];
}
