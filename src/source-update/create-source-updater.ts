import { loadConfigSync } from 'graphql-config';
import { PluginConfig } from '../plugin-config';
import { Logger } from '../utils/logger';
import { extractTypeFromLiteral } from './extract-type-from-literal';
import { extractTypeFromSchema } from './extract-type-from-schema';
import { generateBottomContent } from './generate-bottom-content';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';

const isNonNullable = <I>(item: I | null): item is I => !!item;

const getLogError = (logger: Logger, filename?: string) => (error: unknown) => {
  if (error instanceof Error) {
    logger.error(`on file ${filename}:\n${error.stack ?? error.message}`);
  }
};

const noopSource = async (_filename: string, initialSource: string) =>
  initialSource;

export const createSourceUpdater = (
  directory: string,
  config: PluginConfig,
  logger: Logger
) => {
  const logErrorRoot = getLogError(logger);

  try {
    const { graphqlConfigPath } = config;

    const graphqlConfig = loadConfigSync({
      rootDir: directory,
      filepath: graphqlConfigPath,
      throwOnMissing: true,
      throwOnEmpty: true,
    });

    const schemaInfosPromise = graphqlConfig
      .getDefault()
      .getSchema('DocumentNode')
      .then(async (schemaDocument) => ({
        schemaDocument,
        staticGlobals: await extractTypeFromSchema(schemaDocument),
      }))
      .catch(logErrorRoot);

    return async (filename: string, initialSource: string) => {
      const logError = getLogError(logger, filename);

      try {
        const literalOccurenceList = parseLiteralOccurenceList(initialSource);

        const schemaInfos = await schemaInfosPromise;
        if (!schemaInfos) {
          return initialSource;
        }

        const { schemaDocument, staticGlobals } = schemaInfos;

        if (literalOccurenceList.length === 0) {
          return initialSource;
        }

        const documentInfosPromiseList = literalOccurenceList.map(
          async (literal) => {
            try {
              return await extractTypeFromLiteral(literal, schemaDocument);
            } catch (error) {
              logError(error);
              return null;
            }
          }
        );

        const documentInfosList = await Promise.all(
          documentInfosPromiseList
        ).then((list) => list.filter(isNonNullable));

        const bottomContent = generateBottomContent(
          documentInfosList,
          staticGlobals
        );

        const finalSource = initialSource + bottomContent;

        return finalSource;
      } catch (mainError) {
        logError(mainError);
        return initialSource;
      }
    };
  } catch (rootError) {
    logErrorRoot(rootError);
    return noopSource;
  }
};
