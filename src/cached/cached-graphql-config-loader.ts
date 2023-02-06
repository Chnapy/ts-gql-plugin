import {
  GraphQLConfig,
  GraphQLProjectConfig,
  loadConfigSync,
} from 'graphql-config';
import { tsGqlExtension } from '../source-update/extension';
import { checkFileLastUpdate, createCacheSystem } from '../utils/cache-system';
import { Logger } from '../utils/logger';

type CreateCachedGraphQLConfigLoaderOptions = {
  directory: string;
  graphqlConfigPath?: string;
  projectNameRegex: string | undefined;
  logger: Logger;
};

type CachedGraphQLConfigLoaderValue = {
  configFilePath: string;
  graphqlConfig: GraphQLConfig;
  graphqlProjects: GraphQLProjectConfig[];
};

export type CachedGraphQLConfigLoader = ReturnType<
  typeof createCachedGraphQLConfigLoader
>;

export const defaultProjectName = 'default';

export const createCachedGraphQLConfigLoader = ({
  directory,
  graphqlConfigPath,
  projectNameRegex,
  logger,
}: CreateCachedGraphQLConfigLoaderOptions) =>
  createCacheSystem<CachedGraphQLConfigLoaderValue, null, false>({
    async: false,
    // TODO debounce
    // debounceValue: 5000,
    getKeyFromInput: () => '',
    create: () => {
      const graphqlConfig = loadConfigSync({
        rootDir: directory,
        filepath: graphqlConfigPath,
        throwOnMissing: true,
        throwOnEmpty: true,
        extensions: [tsGqlExtension],
      });

      const graphqlProjectsMap = graphqlConfig.projects;

      if (!(defaultProjectName in graphqlProjectsMap) && !projectNameRegex) {
        throw new Error(
          'Multiple projects into GraphQL config. You must define projectNameRegex in config.'
        );
      }

      const graphqlProjects = Object.values(graphqlProjectsMap);

      logger.log(
        graphqlProjects.reduce(
          (txt, { name, schema }) => `${txt}\n\t- ${name}: '${schema}'`,
          `Project '${directory}' GraphQL config loaded from '${graphqlConfig.filepath}':`
        )
      );

      return {
        configFilePath: graphqlConfig.filepath,
        graphqlConfig,
        graphqlProjects,
      };
    },
    checkValidity: (currentItem) => {
      const { configFilePath } = currentItem.value;

      return checkFileLastUpdate(configFilePath, currentItem.dateTime);
    },
    sizeLimit: 40,
  });
