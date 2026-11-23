import ts from "typescript";

const fixtureArrays = new Set([
  "examples",
  "probes",
  "deviceExamples",
  "deviceProbes",
  // Investment projectors use these arrays only to recognize their own preview records by identity.
  "exampleStatements",
]);
const modelMaps = new Set(["packArchetypes", "packArchetypeOverrides", "packComposeProbes", "packExamples"]);
const prose = new Set(["purpose", "pick", "realPath"]);
const printer = ts.createPrinter();

function bindingNames(name: ts.BindingName): ts.Identifier[] {
  return ts.isIdentifier(name)
    ? [name]
    : name.elements.flatMap((entry) => (ts.isBindingElement(entry) ? bindingNames(entry.name) : []));
}

function references(node: ts.Node, checker: ts.TypeChecker) {
  const names = new Set<ts.Symbol>();
  function visit(child: ts.Node, parent: ts.Node) {
    if (ts.isTypeNode(child)) return;
    if (
      ts.isIdentifier(child) &&
      child.pos >= 0 &&
      !(
        (ts.isPropertyAccessExpression(parent) ||
          ts.isPropertyAssignment(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isBindingElement(parent) ||
          ts.isVariableDeclaration(parent) ||
          ts.isParameter(parent)) &&
        parent.name === child
      ) &&
      !(ts.isBindingElement(parent) && parent.propertyName === child)
    ) {
      const symbol = ts.isShorthandPropertyAssignment(parent)
        ? checker.getShorthandAssignmentValueSymbol(parent)
        : checker.getSymbolAtLocation(child);
      if (symbol) names.add(symbol);
    }
    ts.forEachChild(child, (nested) => visit(nested, child));
  }
  visit(node, node);
  return names;
}

function editObject(expression: ts.Expression, pack: boolean): ts.Expression {
  const f = ts.factory;
  if (ts.isAsExpression(expression))
    return f.updateAsExpression(expression, editObject(expression.expression, pack), expression.type);
  if (ts.isSatisfiesExpression(expression))
    return f.updateSatisfiesExpression(expression, editObject(expression.expression, pack), expression.type);
  if (ts.isParenthesizedExpression(expression))
    return f.updateParenthesizedExpression(expression, editObject(expression.expression, pack));
  if (!ts.isObjectLiteralExpression(expression))
    throw new Error(`Expected an object literal: ${expression.getText()}`);
  return f.updateObjectLiteralExpression(
    expression,
    expression.properties.flatMap((entry) => {
      const name = entry.name?.getText().replace(/^["']|["']$/g, "");
      if (name === "writeHints" || name === "previewDeviceData") return [];
      if (name && (prose.has(name) || (pack && name === "example")))
        return [f.createPropertyAssignment(name, f.createStringLiteral(""))];
      if (pack && name === "probes")
        return [f.createPropertyAssignment(name, f.createArrayLiteralExpression())];
      return [entry];
    }),
  );
}

function rewriteVariable(node: ts.VariableStatement) {
  const f = ts.factory;
  const declarations = node.declarationList.declarations.flatMap((decl) => {
    if (!ts.isIdentifier(decl.name) || !decl.initializer) return [decl];
    const name = decl.name.text;
    if (modelMaps.has(name) || name === "example") return [];
    const value =
      fixtureArrays.has(name) || name === "deviceWriteHints"
        ? f.createArrayLiteralExpression()
        : ["meta", "pack", "deviceControls"].includes(name)
          ? editObject(decl.initializer, name === "pack")
          : decl.initializer;
    return [f.updateVariableDeclaration(decl, decl.name, decl.exclamationToken, decl.type, value)];
  });
  if (
    declarations.length === node.declarationList.declarations.length &&
    declarations.every((decl, index) => decl === node.declarationList.declarations[index])
  )
    return node;
  return declarations.length
    ? f.updateVariableStatement(
        node,
        node.modifiers,
        f.updateVariableDeclarationList(node.declarationList, declarations),
      )
    : undefined;
}

function privateBindings(statement: ts.Statement) {
  if (ts.isFunctionDeclaration(statement))
    return statement.name && !statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ? [statement.name]
      : [];
  if (
    !ts.isVariableStatement(statement) ||
    statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  )
    return [];
  return statement.declarationList.declarations.flatMap(({ name }) => bindingNames(name));
}

// Remove only private declarations reached by stripped fixture data and not by surviving code.
function fixtureOnly(ast: ts.SourceFile, after: readonly ts.Statement[]) {
  const before = ast.statements;
  // Bind only this file. Symbol identity distinguishes probe helpers from same-named local variables.
  const options = { noLib: true, noResolve: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (path) => (path === ast.fileName ? ast : undefined);
  const checker = ts.createProgram([ast.fileName], options, host).getTypeChecker();
  const bindings = new Map(
    before.flatMap((statement) =>
      privateBindings(statement).map((name) => [checker.getSymbolAtLocation(name), statement] as const),
    ),
  );
  function dependencies(seeds: Iterable<ts.Node>, include = new Set<ts.Statement>()) {
    for (const node of seeds)
      for (const name of references(node, checker)) {
        const declaration = bindings.get(name);
        if (!declaration || include.has(declaration)) continue;
        include.add(declaration);
        dependencies([declaration], include);
      }
    return include;
  }
  const candidates = dependencies(before.filter((statement, index) => statement !== after[index]));
  const live = dependencies(
    after.filter((statement, index) => !candidates.has(before[index]!) && !ts.isImportDeclaration(statement)),
  );
  return new Set([...candidates].filter((statement) => !live.has(statement)));
}

export function runtimeSource(path: string, source: string, dataOnly = false) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const view = dataOnly ? path.match(/(?:^|\/)([A-Z]\w*)\.tsx$/)?.[1] : undefined;
  const rewritten = ast.statements.map((statement) => {
    if (ts.isVariableStatement(statement)) return rewriteVariable(statement);
    if (view && ts.isFunctionDeclaration(statement) && statement.name?.text === view) return;
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier?.getText().slice(1, -1) === "./archetypes"
    )
      return;
    return statement;
  });
  // Keep statement positions aligned, and don't put deleted declarations back into the live set.
  const empty = ts.factory.createEmptyStatement();
  const dead = fixtureOnly(
    ast,
    rewritten.map((statement) => statement ?? empty),
  );
  const statements = rewritten.filter(
    (node, index): node is ts.Statement => !!node && !dead.has(ast.statements[index]!),
  );
  return printer.printFile(ts.factory.updateSourceFile(ast, statements));
}
