import { GraphQLProjectConfig, loadConfig } from 'graphql-config';
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
  createCacheSystem<CachedGraphQLConfigLoaderValue, null>({
    // TODO debounce
    // debounceValue: 5000,
    getKeyFromInput: () => '',
    create: async () => {
      const graphqlConfig = await loadConfig({
        rootDir: directory,
        filepath: graphqlConfigPath,
        throwOnMissing: true,
        throwOnEmpty: true,
        extensions: [tsGqlExtension],
      });
      if (!graphqlConfig) {
        throw new Error('GraphQL config file not found.');
      }

      const graphqlProjectsMap = graphqlConfig.projects;

      if (!(defaultProjectName in graphqlProjectsMap) && !projectNameRegex) {
        throw new Error(
          'Multiple projects into GraphQL config. You must define projectNameRegex in config.'
        );
      }

      const graphqlProjects = Object.values(graphqlProjectsMap);

      logger.log(`GraphQL config loaded from ${graphqlConfig.filepath}`);

      graphqlProjects.forEach(({ name, schema }) =>
        logger.log(`GraphQL project "${name}" schema loaded from ${schema}`)
      );

      return { configFilePath: graphqlConfig.filepath, graphqlProjects };
    },
    checkValidity: async (currentItem) => {
      const { configFilePath } = await currentItem.value;

      return checkFileLastUpdate(configFilePath, currentItem.dateTime);
    },
    sizeLimit: 40,
  });
