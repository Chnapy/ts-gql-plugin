import { GraphQLError } from 'graphql';
import ts from 'typescript';
import { getCurrentWord } from './utils/get-current-word';
import { isVSCodeEnv } from './utils/is-vscode-env';
import { Logger } from './utils/logger';

export type ErrorCatcher = (
  err: unknown,
  sourceFile?: ts.SourceFile,
  start?: number,
  length?: number
) => null;

export const createErrorCatcher = (
  pluginsDiagnostics: Map<string, ts.Diagnostic[]>,
  logger: Logger
) => {
  const vsCodeEnv = isVSCodeEnv();

  const errorCatcher: ErrorCatcher = (
    err,
    sourceFile,
    start = 0,
    length = 0
  ) => {
    if (!(err instanceof Error)) {
      return null;
    }

    if (!sourceFile && !vsCodeEnv) {
      logger.error(err);

      throw new Error('Internal error - check previous logs.');
    }

    if (err instanceof AggregateError) {
      err.errors.forEach((gqlErr) =>
        errorCatcher(gqlErr, sourceFile, start, length)
      );
      return null;
    }

    if (vsCodeEnv) {
      logger.error(err);
    }

    if (sourceFile) {
      if (err instanceof GraphQLError) {
        const errorLocation = err.nodes?.[0]?.loc;
        const position = err.positions?.[0];

        if (errorLocation) {
          start += errorLocation.start;
          length = errorLocation.end - errorLocation.start;
        } else if (position) {
          start += position;
          length = getCurrentWord(sourceFile.text, start).length;
        }
      }

      const gqlDiagnostics = pluginsDiagnostics.get(sourceFile.fileName) ?? [];

      pluginsDiagnostics.set(sourceFile.fileName, [
        ...gqlDiagnostics,
        {
          category: ts.DiagnosticCategory.Error,
          code: 0,
          file: sourceFile,
          start,
          length,
          messageText: err.message,
        },
      ]);
    }

    return null;
  };

  return errorCatcher;
};
