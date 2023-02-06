import { DocumentNode } from 'graphql';
import path from 'node:path';
import { ErrorCatcher } from '../create-error-catcher';
import { ExtensionConfig } from '../extension-config';
import { generateTypeFromSchema } from '../generators/generate-type-from-schema';
import { getProjectExtension } from '../source-update/extension';
import {
  CacheItem,
  checkFileLastUpdate,
  createCacheSystem,
} from '../utils/cache-system';
import { CachedGraphQLConfigLoader } from './cached-graphql-config-loader';

export type CreateCachedSchemaLoaderOptions = {
  cachedGraphQLConfigLoader: CachedGraphQLConfigLoader;
  errorCatcher: ErrorCatcher;
};

export type SchemaProjectInfos<D> = {
  schemaFilePath?: string;
  schemaDocument: D;
};

type ProjectInfos = SchemaProjectInfos<DocumentNode> & {
  staticGlobals: string[];
  extension: ExtensionConfig;
};

type CachedDocumentSchemaLoaderValue = ProjectInfos | null;

export type CachedSchemaLoaderInput = {
  projectName: string;
};

export type CachedDocumentSchemaLoader = ReturnType<
  typeof createCachedDocumentSchemaLoader
>;

export const defaultProjectName = 'default';

export const getProjectNameIfNotDefault = (projectName: string) =>
  projectName === defaultProjectName ? undefined : projectName;

export const getCreateProjectInfos = (
  cachedGraphQLConfigLoader: CachedGraphQLConfigLoader,
  { projectName }: CachedSchemaLoaderInput
) => {
  const { graphqlProjects } = cachedGraphQLConfigLoader.getItemOrCreate(null);

  const project = graphqlProjects.find(({ name }) => name === projectName);
  if (!project) {
    throw new Error(`Project not defined for name "${projectName}"`);
  }

  const schemaFilePath =
    typeof project.schema === 'string'
      ? path.join(project.dirpath, project.schema)
      : undefined;

  return {
    project,
    schemaFilePath,
  };
};

export const getCachedSchemaCheckValidity =
  (cachedGraphQLConfigLoader: CachedGraphQLConfigLoader) =>
  async (
    currentItem: CacheItem<SchemaProjectInfos<unknown> | null, unknown, true>
  ) => {
    const isGraphQLConfigValid =
      cachedGraphQLConfigLoader.checkItemValidity(null);
    if (!isGraphQLConfigValid) {
      return false;
    }

    const project = await currentItem.value;
    if (!project) {
      return true;
    }

    if (!project.schemaFilePath) {
      return false;
    }

    return checkFileLastUpdate(project.schemaFilePath, currentItem.dateTime);
  };

export const createCachedDocumentSchemaLoader = ({
  cachedGraphQLConfigLoader,
  errorCatcher,
}: CreateCachedSchemaLoaderOptions) =>
  createCacheSystem<
    CachedDocumentSchemaLoaderValue,
    CachedSchemaLoaderInput,
    true
  >({
    async: true,
    // TODO debounce
    // debounceValue: 1000,
    getKeyFromInput: (input) => input.projectName,
    create: async (input) => {
      const { project, schemaFilePath } = getCreateProjectInfos(
        cachedGraphQLConfigLoader,
        input
      );

      const extension = getProjectExtension(project);

      return project
        .getSchema('DocumentNode')
        .then(
          async (schemaDocument): Promise<ProjectInfos> => ({
            schemaFilePath,
            schemaDocument,
            staticGlobals: await generateTypeFromSchema(
              schemaDocument,
              getProjectNameIfNotDefault(input.projectName),
              extension.codegenConfig
            ),
            extension,
          })
        )
        .catch(errorCatcher);
    },
    checkValidity: getCachedSchemaCheckValidity(cachedGraphQLConfigLoader),
  });
