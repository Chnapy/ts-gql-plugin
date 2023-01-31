import ts from 'typescript';

type SourceWithIndex = {
  body: string;
  index?: number;
};

const expectedTags: ReadonlySet<string> = new Set(['gql', 'graphql']);

/**
 * Parse source file and extract every valid gql template literals from it.
 * Use TS api tree visitor, which works even on syntax broken code.
 */
const parseLiteralOccurenceListWithTS = (
  sourceFile: ts.SourceFile
): SourceWithIndex[] => {
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

  return extractTemplateLiterals(sourceFile).map(
    (templateLiteral): SourceWithIndex => ({
      body: getText(templateLiteral).slice(1, -1),
      index: templateLiteral.pos,
    })
  );
};

/**
 * Parse source file and extract every valid gql template literals from it.
 */
export const parseLiteralOccurenceList = (
  sourceFile: ts.SourceFile
): SourceWithIndex[] => {
  // start with regex test for performance considerations
  if (!/gql\(`([^`]+)`\)(?!\sas\s)/s.test(sourceFile.text)) {
    return [];
  }

  return parseLiteralOccurenceListWithTS(sourceFile);
};
