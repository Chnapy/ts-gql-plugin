import { parse } from 'graphql';
import fs from 'node:fs';
import path from 'node:path';
import type TSL from 'typescript/lib/tsserverlibrary';
import { extractTypeFromSchema } from './extract-type-from-schema';
import { extractTypeFromTTExpression } from './extract-type-from-ttexpression';
import {
  parseTTExpressionOccurenceList,
  TTExpressionOccurence,
} from './parse-ttexpression-occurence-list';
import {
  DraftScript,
  updateScriptWithTTOccurence,
} from './update-script-with-ttoccurrence';
import { promisify } from 'node:util';
import { Config } from '../config';
import { Logger } from '../utils/logger';

const getLogError = (logger: Logger, filename?: string) => (error: unknown) => {
  if (error instanceof Error) {
    logger.error(`on file ${filename}:\n${error.stack ?? error.message}`);
  }
};

const noopSnapshot = async (filename: string, snapshot: TSL.IScriptSnapshot) =>
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

        const ttExpressionOccurenceList =
          parseTTExpressionOccurenceList(initialScriptText);

        if (ttExpressionOccurenceList.length === 0) {
          return snaphost;
        }

        const isNonNullable = <I>(item: I | null): item is I => !!item;

        const schemaDocument = await schemaDocumentPromise;

        const occurencePromiseList = ttExpressionOccurenceList.map(
          async (occurence: TTExpressionOccurence) => {
            try {
              const types = await extractTypeFromTTExpression(
                occurence.content,
                schemaDocument
              );

              return {
                occurence,
                types,
              };
            } catch (error) {
              logError(error);
              return null;
            }
          }
        );

        const [staticGlobals, occurencesAndTypes] = await Promise.all([
          staticGlobalsPromise,
          Promise.all(occurencePromiseList).then((list) =>
            list.filter(isNonNullable)
          ),
        ]);

        const finalScript = occurencesAndTypes.reduce<DraftScript>(
          (draftScript, { occurence, types }) =>
            updateScriptWithTTOccurence(
              draftScript,
              occurence,
              types.variableType
            ),
          {
            text: initialScriptText,
            offset: 0,
          }
        );

        finalScript.text += `
            ${staticGlobals}
            
            ${occurencesAndTypes
              .map(({ types }) => types.staticType)
              .join('\n\n')}
          `;

        return tsl.ScriptSnapshot.fromString(finalScript.text);
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
