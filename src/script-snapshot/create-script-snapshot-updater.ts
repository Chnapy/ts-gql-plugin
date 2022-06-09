import { parse } from 'graphql';
import fs from 'node:fs';
import path from 'node:path';
import type TSL from 'typescript/lib/tsserverlibrary';
import { extractTypeFromSchema } from './extract-type-from-schema';
import { extractTypeFromLiteral } from './extract-type-from-literal';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';
import { promisify } from 'node:util';
import { Config } from '../config';
import { Logger } from '../utils/logger';
import { generateBottomContent } from './generate-bottom-content';

const isNonNullable = <I>(item: I | null): item is I => !!item;

const getLogError = (logger: Logger, filename?: string) => (error: unknown) => {
  if (error instanceof Error) {
    logger.error(`on file ${filename}:\n${error.stack ?? error.message}`);
  }
};

const noopSnapshot = async (_filename: string, snapshot: TSL.IScriptSnapshot) =>
  snapshot;

export const createScriptSnapshotUpdater = (
  tsl: Pick<typeof TSL, 'ScriptSnapshot'>,
  directory: string,
  config: Config,
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

    return async (filename: string, snaphost: TSL.IScriptSnapshot) => {
      const logError = getLogError(logger, filename);

      try {
        const initialScriptText = snaphost.getText(0, snaphost.getLength());

        const literalOccurenceList =
          parseLiteralOccurenceList(initialScriptText);

        if (literalOccurenceList.length === 0) {
          return snaphost;
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

        const finalScriptText = initialScriptText + bottomContent;

        return tsl.ScriptSnapshot.fromString(finalScriptText);
      } catch (mainError) {
        logError(mainError);
        return snaphost;
      }
    };
  } catch (rootError) {
    logErrorRoot(rootError);
    return noopSnapshot;
  }
};
