import ts from 'typescript/lib/tsserverlibrary';
import { createCachedGraphQLConfigLoader } from '../cached/cached-graphql-config-loader';
import {
  createCachedLiteralParser,
  CachedLiteralParserValue,
} from '../cached/cached-literal-parser';
import { createCachedSchemaLoader } from '../cached/cached-schema-loader';
import { ErrorCatcher } from '../create-error-catcher';
import { PluginConfig } from '../plugin-config';
import { Logger } from '../utils/logger';
import {
  generateBottomContent,
  DocumentInfosWithLiteral,
} from '../generators/generate-bottom-content';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';
import { parseTsGqlTags } from './parse-ts-gql-tags';

const isNonNullable = <I>(item: I | null): item is I => !!item;

const noopSource = async (sourceFile: ts.SourceFile) => sourceFile.text;

export const createSourceUpdater = (
  directory: string,
  config: PluginConfig,
  logger: Logger,
  errorCatcher: ErrorCatcher
): typeof noopSource => {
  try {
    const { graphqlConfigPath, projectNameRegex } = config;

    const cachedGraphQLConfigLoader = createCachedGraphQLConfigLoader({
      directory,
      graphqlConfigPath,
      projectNameRegex,
      logger,
    });

    const cachedSchemaLoader = createCachedSchemaLoader({
      cachedGraphQLConfigLoader,
      errorCatcher,
    });

    const cachedLiteralParser = createCachedLiteralParser({
      cachedSchemaLoader,
      projectNameRegex,
      errorCatcher,
    });

    return async (sourceFile: ts.SourceFile) => {
      const { fileName, text: initialSource } = sourceFile;

      logger.setFilename(fileName);

      try {
        const literalOccurenceList = parseLiteralOccurenceList(sourceFile);

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
            const schemaItem = await cachedSchemaLoader.getItemOrCreate({
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
  } catch (rootError) {
    errorCatcher(rootError);
    return noopSource;
  }
};
