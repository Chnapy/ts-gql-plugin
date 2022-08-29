import { DocumentNode } from 'graphql';
import path from 'node:path';
import { ErrorCatcher } from '../create-error-catcher';
import { ExtensionConfig } from '../extension-config';
import { generateTypeFromSchema } from '../generators/generate-type-from-schema';
import { getProjectExtension } from '../source-update/extension';
import { checkFileLastUpdate, createCacheSystem } from '../utils/cache-system';
import { CachedGraphQLConfigLoader } from './cached-graphql-config-loader';

type CreateCachedSchemaLoaderOptions = {
  cachedGraphQLConfigLoader: CachedGraphQLConfigLoader;
  errorCatcher: ErrorCatcher;
};

type ProjectInfos = {
  schemaFilePath?: string;
  schemaDocument: DocumentNode;
  staticGlobals: string[];
  extension: ExtensionConfig;
};

type CachedSchemaLoaderValue = ProjectInfos | null;

type CachedSchemaLoaderInput = {
  projectName: string;
};

export type CachedSchemaLoader = ReturnType<typeof createCachedSchemaLoader>;

export const defaultProjectName = 'default';

export const createCachedSchemaLoader = ({
  cachedGraphQLConfigLoader,
  errorCatcher,
}: CreateCachedSchemaLoaderOptions) =>
  createCacheSystem<CachedSchemaLoaderValue, CachedSchemaLoaderInput>({
    // TODO debounce
    // debounceValue: 1000,
    getKeyFromInput: (input) => input.projectName,
    create: async ({ projectName }) => {
      const { graphqlProjects } =
        await cachedGraphQLConfigLoader.getItemOrCreate(null);

      const project = graphqlProjects.find(({ name }) => name === projectName);
      if (!project) {
        throw new Error(`Project not defined for name "${projectName}"`);
      }

      const extension = getProjectExtension(project);

      const schemaFilePath =
        typeof project.schema === 'string'
          ? path.join(project.dirpath, project.schema)
          : undefined;

      return project
        .getSchema('DocumentNode')
        .then(
          async (schemaDocument): Promise<ProjectInfos> => ({
            schemaFilePath,
            schemaDocument,
            staticGlobals: await generateTypeFromSchema(
              schemaDocument,
              projectName === defaultProjectName ? undefined : projectName,
              extension.codegenConfig
            ),
            extension,
          })
        )
        .catch(errorCatcher);
    },
    checkValidity: async (currentItem) => {
      const isGraphQLConfigValid =
        await cachedGraphQLConfigLoader.checkItemValidity(null);
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
    },
    sizeLimit: 40,
  });
