import { DocumentNode } from 'graphql';
import { loadConfigSync } from 'graphql-config';
import { PluginConfig } from '../plugin-config';
import { Logger } from '../tools';
import { extractTypeFromSchema } from './extract-type-from-schema';

const defaultProjectName = 'default';

export const loadGraphQLConfig = (
  directory: string,
  logger: Logger,
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
    Record<
      string,
      Promise<{
        schemaDocument: DocumentNode;
        staticGlobals: string;
      } | null>
    >
  >((map, project) => {
    map[project.name] = project
      .getSchema('DocumentNode')
      .then(async (schemaDocument) => ({
        schemaDocument,
        staticGlobals: await extractTypeFromSchema(schemaDocument),
      }))
      .catch(logger.error);

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
