import ts from 'typescript/lib/tsserverlibrary';
import {
  CachedLiteralParser,
  CachedLiteralParserValue,
} from '../cached/cached-literal-parser';
import { CachedDocumentSchemaLoader } from '../cached/cached-document-schema-loader';
import { ErrorCatcher } from '../create-error-catcher';
import {
  DocumentInfosWithLiteral,
  generateBottomContent,
} from '../generators/generate-bottom-content';
import { Logger } from '../utils/logger';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';
import { parseTsGqlTags } from './parse-ts-gql-tags';

const isNonNullable = <I>(item: I | null): item is I => !!item;

export const createSourceUpdater =
  (
    cachedDocumentSchemaLoader: CachedDocumentSchemaLoader,
    cachedLiteralParser: CachedLiteralParser,
    logger: Logger,
    errorCatcher: ErrorCatcher
  ) =>
  async (sourceFile: ts.SourceFile): Promise<string> => {
    const { fileName, text: initialSource } = sourceFile;

    logger.setFilename(fileName);

    try {
      const literalOccurenceList = parseLiteralOccurenceList(sourceFile).map(
        ({ body }) => body
      );

      const projectNamesFromTsGqlTags = parseTsGqlTags(sourceFile);

      if (
        literalOccurenceList.length + projectNamesFromTsGqlTags.length ===
        0
      ) {
        return initialSource;
      }

      const documentInfosPromiseList = literalOccurenceList.map(
        async (
          literal
        ): Promise<CachedLiteralParserValue<DocumentInfosWithLiteral> | null> => {
          const cachedValue = await cachedLiteralParser.getItemOrCreate({
            literal,
            sourceFile,
          });

          return (
            cachedValue && {
              ...cachedValue,
              documentInfos: {
                literal,
                ...cachedValue.documentInfos,
              },
            }
          );
        }
      );

      const documentInfosList = await Promise.all(
        documentInfosPromiseList
      ).then((list) => list.filter(isNonNullable));

      const globalsFromTsGqlTags = await Promise.all(
        projectNamesFromTsGqlTags.map(async (projectName) => {
          const schemaItem = await cachedDocumentSchemaLoader.getItemOrCreate({
            projectName,
          });

          return schemaItem?.staticGlobals;
        })
      ).then((list) => list.filter(isNonNullable));

      const staticGlobalsSet = new Set([
        ...documentInfosList.flatMap((infos) => infos.staticGlobals),
        ...globalsFromTsGqlTags.flat(),
      ]);

      if (staticGlobalsSet.size === 0) {
        return initialSource;
      }

      const bottomContent = generateBottomContent(
        documentInfosList.map((infos) => infos.documentInfos),
        [...staticGlobalsSet].join('\n')
      );

      const finalSource = initialSource + bottomContent;

      return finalSource;
    } catch (mainError) {
      errorCatcher(mainError, sourceFile);
      return initialSource;
    }
  };
