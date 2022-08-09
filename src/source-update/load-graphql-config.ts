import { DocumentNode } from 'graphql';
import { loadConfigSync } from 'graphql-config';
import { ErrorCatcher } from '../create-error-catcher';
import { ExtensionConfig } from '../extension-config';
import { PluginConfig } from '../plugin-config';
import { Logger } from '../tools';
import { getProjectExtension, tsGqlExtension } from './extension';
import { extractTypeFromSchema } from './extract-type-from-schema';

type ProjectInfos = {
  schemaDocument: DocumentNode;
  staticGlobals: string;
  extension: ExtensionConfig;
};

const defaultProjectName = 'default';

export const loadGraphQLConfig = (
  directory: string,
  logger: Logger,
  errorCatcher: ErrorCatcher,
  {
    graphqlConfigPath,
    projectNameRegex,
  }: Pick<PluginConfig, 'graphqlConfigPath' | 'projectNameRegex'>
) => {
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

  logger.log(`GraphQL config loaded from ${graphqlConfig.filepath}`);

  graphqlProjects.forEach(({ name, schema }) =>
    logger.log(`GraphQL project "${name}" schema loaded from ${schema}`)
  );

  const schemaInfosPromiseMap = graphqlProjects.reduce<
    Record<string, Promise<ProjectInfos | null>>
  >((map, project) => {
    const extension = getProjectExtension(project);
    map[project.name] = project
      .getSchema('DocumentNode')
      .then(async (schemaDocument) => ({
        schemaDocument,
        staticGlobals: await extractTypeFromSchema(
          schemaDocument,
          extension.codegenConfig
        ),
        extension,
      }))
      .catch(errorCatcher);

    return map;
  }, {});

  const getProjectFromLiteral = async (literal: string) => {
    const projectName = projectNameRegex
      ? (new RegExp(projectNameRegex).exec(literal) ?? [])[0]
      : defaultProjectName;

    const project = await schemaInfosPromiseMap[projectName];
    if (!project) {
      throw new Error(`Project not defined for name "${projectName}"`);
    }

    return project;
  };

  return {
    getProjectFromLiteral,
  };
};
