import ts from 'typescript';

const expectedTags: ReadonlySet<string> = new Set(['gql', 'graphql']);

/**
 * Parse source file and extract every valid gql template literals from it.
 */
export const parseLiteralOccurenceList = (
  sourceFile: ts.SourceFile
): string[] => {
  const getText = (node: ts.Node) => node.getText(sourceFile);

  const extractTemplateLiterals = (
    node: ts.Node,
    parentIsAsExpression = false
  ): ts.TemplateLiteral[] => {
    const isAsExpression = ts.isAsExpression(node);

    const next = () =>
      node
        .getChildren(sourceFile)
        .flatMap((child) => extractTemplateLiterals(child, isAsExpression));

    if (!parentIsAsExpression && ts.isCallExpression(node)) {
      const tag = getText(node.expression);
      if (!expectedTags.has(tag)) {
        return next();
      }

      const templateLiteral = node.arguments.find(ts.isTemplateLiteral);
      if (!templateLiteral) {
        return next();
      }

      return [templateLiteral];
    }

    return next();
  };

  return extractTemplateLiterals(sourceFile).map((templateLiteral) =>
    getText(templateLiteral).slice(1, -1)
  );
};
