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

const unknownFileName = '';

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

    if (err instanceof AggregateError) {
      err.errors.forEach((gqlErr) =>
        errorCatcher(gqlErr, sourceFile, start, length)
      );
      return null;
    }

    if (vsCodeEnv) {
      logger.error(err);
    }

    const addNewDiagnosticError = (file: ts.SourceFile | undefined) => {
      const fileName = file?.fileName ?? unknownFileName;
      const gqlDiagnostics = pluginsDiagnostics.get(fileName) ?? [];

      pluginsDiagnostics.set(fileName, [
        ...gqlDiagnostics,
        {
          category: ts.DiagnosticCategory.Error,
          code: 0,
          file,
          start,
          length,
          messageText: err.message,
        },
      ]);
    };

    if (err instanceof GraphQLError) {
      const errorLocation = err.nodes?.[0]?.loc;
      const position = err.positions?.[0];

      const text = sourceFile?.text ?? err.source?.body;

      if (errorLocation) {
        start += errorLocation.start;
        length = errorLocation.end - errorLocation.start;
      } else if (position && text) {
        start += position;
        length = getCurrentWord(text, start).length;
      }
    }

    if (sourceFile) {
      addNewDiagnosticError(sourceFile);
    } else if (err instanceof GraphQLError) {
      const source = err.source;

      const fileName = source?.name ?? unknownFileName;
      const file = source && ts.createSourceFile(fileName, source.body, 99);

      addNewDiagnosticError(file);
    } else {
      addNewDiagnosticError(undefined);
    }

    return null;
  };

  return errorCatcher;
};
