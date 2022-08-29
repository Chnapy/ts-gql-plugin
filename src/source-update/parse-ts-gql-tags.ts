import ts from 'typescript';
import { parseWithRegex } from '../utils/parse-with-regex';

/**
 * Parse source file for @ts-gql tags, returning projects name list.
 */
export const parseTsGqlTags = (sourceFile: ts.SourceFile): string[] => {
  const tagRegex = /.*?@ts-gql\s(.+?)\s/g;

  return parseWithRegex(
    sourceFile.text,
    tagRegex,
    (foundArray) => foundArray?.[1]
  );
};
