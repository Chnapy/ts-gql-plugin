import { GraphQLSchema } from 'graphql';
import { createCacheSystem } from '../utils/cache-system';
import {
  CachedSchemaLoaderInput,
  CreateCachedSchemaLoaderOptions,
  getCachedSchemaCheckValidity,
  getCreateProjectInfos,
  SchemaProjectInfos,
} from './cached-document-schema-loader';

type CachedSchemaLoaderValue = SchemaProjectInfos<GraphQLSchema> | null;

export type CachedGraphQLSchemaLoader = ReturnType<
  typeof createCachedGraphQLSchemaLoader
>;

export const createCachedGraphQLSchemaLoader = ({
  cachedGraphQLConfigLoader,
  errorCatcher,
}: CreateCachedSchemaLoaderOptions) =>
  createCacheSystem<CachedSchemaLoaderValue, CachedSchemaLoaderInput, true>({
    async: true,
    getKeyFromInput: (input) => input.projectName,
    create: async (input) => {
      const { project, schemaFilePath } = getCreateProjectInfos(
        cachedGraphQLConfigLoader,
        input
      );

      return project
        .getSchema('GraphQLSchema')
        .then(async (schemaDocument) => ({
          schemaFilePath,
          schemaDocument,
        }))
        .catch(errorCatcher);
    },
    checkValidity: getCachedSchemaCheckValidity(cachedGraphQLConfigLoader),
    sizeLimit: 40,
  });
