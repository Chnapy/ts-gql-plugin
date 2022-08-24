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

const isNonNullable = <I>(item: I | null): item is I => !!item;

const noopSource = async (_filename: string, initialSource: string) =>
  initialSource;

export const createSourceUpdater = (
  directory: string,
  config: PluginConfig,
  logger: Logger,
  errorCatcher: ErrorCatcher,
  scriptTarget: ts.ScriptTarget = ts.ScriptTarget.ESNext
) => {
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
      scriptTarget,
      errorCatcher,
    });

    return async (filename: string, initialSource: string) => {
      logger.setFilename(filename);

      const createSourceFile = () =>
        ts.createSourceFile(filename, initialSource, scriptTarget);

      try {
        const literalOccurenceList = parseLiteralOccurenceList(initialSource);

        if (literalOccurenceList.length === 0) {
          return initialSource;
        }

        const documentInfosPromiseList = literalOccurenceList.map(
          async (
            literal
          ): Promise<CachedLiteralParserValue<DocumentInfosWithLiteral> | null> => {
            const cachedValue = await cachedLiteralParser.getItemOrCreate({
              literal,
              filename,
              initialSource,
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

        if (documentInfosList.length === 0) {
          return initialSource;
        }

        const staticGlobalsSet = new Set(
          documentInfosList.map((infos) => infos.staticGlobals)
        );

        const bottomContent = generateBottomContent(
          documentInfosList.map((infos) => infos.documentInfos),
          [...staticGlobalsSet].join('\n')
        );

        const finalSource = initialSource + bottomContent;

        return finalSource;
      } catch (mainError) {
        errorCatcher(mainError, createSourceFile());
        return initialSource;
      }
    };
  } catch (rootError) {
    errorCatcher(rootError);
    return noopSource;
  }
};
