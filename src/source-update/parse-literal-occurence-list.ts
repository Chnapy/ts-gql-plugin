import ts from 'typescript';
import { gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';
import { Source } from 'graphql';

type SourceWithIndex = Source & {
  locationOffset: Source['locationOffset'] & { index?: number };
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

  return gqlPluckFromCodeStringSync(sourceFile.fileName, sourceFile.text, {
    skipIndent: true,
  });
};
