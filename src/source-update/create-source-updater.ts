import { parse } from 'graphql';
import fs from 'node:fs';
import path from 'node:path';
import { extractTypeFromSchema } from './extract-type-from-schema';
import { extractTypeFromLiteral } from './extract-type-from-literal';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';
import { promisify } from 'node:util';
import { PluginConfig } from '../plugin-config';
import { Logger } from '../utils/logger';
import { generateBottomContent } from './generate-bottom-content';

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

  const readFile = promisify(fs.readFile);

  try {
    const { schema: schemaPath } = config;
    if (!schemaPath) {
      throw new Error('GraphQL schema path not defined in config');
    }

    const schemaDocumentPromise = readFile(
      path.resolve(directory, schemaPath),
      {
        encoding: 'utf8',
      }
    ).then(parse);

    const staticGlobalsPromise = schemaDocumentPromise.then(
      extractTypeFromSchema
    );

    return async (filename: string, initialSource: string) => {
      const logError = getLogError(logger, filename);

      try {
        const literalOccurenceList = parseLiteralOccurenceList(initialSource);

        if (literalOccurenceList.length === 0) {
          return initialSource;
        }

        const schemaDocument = await schemaDocumentPromise;

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

        const [staticGlobals, documentInfosList] = await Promise.all([
          staticGlobalsPromise,
          Promise.all(documentInfosPromiseList).then((list) =>
            list.filter(isNonNullable)
          ),
        ]);

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
