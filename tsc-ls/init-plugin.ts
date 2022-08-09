import init from 'ts-gql-plugin';
import { PluginConfig } from 'ts-gql-plugin/tools';
import ts from 'typescript/lib/tsserverlibrary';

type InitPluginParams = {
  basePath: string;
  pluginConfig: PluginConfig | null;
  languageService: ts.LanguageService;
  languageServiceHost: ts.LanguageServiceHost;
};

export const initPlugin = ({
  basePath,
  pluginConfig,
  languageService,
  languageServiceHost,
}: InitPluginParams): ts.LanguageService => {
  if (!pluginConfig) {
    return languageService;
  }

  const project: ts.server.Project = {
    getCurrentDirectory: () => basePath,
    getCompilerOptions: () => ({}),
    projectService: {
      logger: {
        info: console.log,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return init({
    typescript: ts,
  }).create({
    config: pluginConfig,
    languageService,
    languageServiceHost,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serverHost: null as any,
    project,
  });
};
