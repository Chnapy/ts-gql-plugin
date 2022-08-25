import ts from 'typescript';
import { gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';

/**
 * Parse source file and extract every valid gql template literals from it.
 */
export const parseLiteralOccurenceList = (
  sourceFile: ts.SourceFile
): string[] => {
  // start with regex test for performance considerations
  if (!/gql\(`([^`]+)`\)(?!\sas\s)/s.test(sourceFile.text)) {
    return [];
  }

  const sources = gqlPluckFromCodeStringSync(
    sourceFile.fileName,
    sourceFile.text,
    {
      skipIndent: true,
    }
  );

  return sources.map(({ body }) => body);
};
