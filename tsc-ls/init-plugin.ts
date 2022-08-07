import init from 'ts-gql-plugin';
import { ErrorCatcher, PluginConfig } from 'ts-gql-plugin/tools';
import ts from 'typescript/lib/tsserverlibrary';

type InitPluginParams = {
  basePath: string;
  pluginConfig: PluginConfig | null;
  languageService: ts.LanguageService;
  languageServiceHost: ts.LanguageServiceHost;
  diagnostics: ts.Diagnostic[];
};

export const initPlugin = ({
  basePath,
  pluginConfig,
  languageService,
  languageServiceHost,
  diagnostics,
}: InitPluginParams): ts.LanguageService => {
  if (!pluginConfig) {
    return languageService;
  }

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

    diagnostics.push({
      category: ts.DiagnosticCategory.Error,
      code: 0,
      file: sourceFile,
      start,
      length,
      messageText: err.message,
    });

    return null;
  };

  const project: ts.server.Project = {
    getCurrentDirectory: () => basePath,
    projectService: {
      logger: {
        info: () => void 0,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return init(
    {
      typescript: ts,
    },
    {
      errorCatcher,
    }
  ).create({
    config: pluginConfig,
    languageService,
    languageServiceHost,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serverHost: null as any,
    project,
  });
};
