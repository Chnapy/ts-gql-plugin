import { DocumentNode } from 'graphql';
import { GraphQLProjectConfig, loadConfigSync } from 'graphql-config';
import { PluginConfig } from '../plugin-config';
import { Logger } from '../utils/logger';
import { extractTypeFromLiteral } from './extract-type-from-literal';
import { extractTypeFromSchema } from './extract-type-from-schema';
import { generateBottomContent } from './generate-bottom-content';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';

const isNonNullable = <I>(item: I | null): item is I => !!item;

const getLogError = (logger: Logger, filename?: string) => (error: unknown) => {
  if (error instanceof Error) {
    logger.error(`on file ${filename}:\n${error.stack ?? error.message}`);
  }
  return null;
};

const noopSource = async (_filename: string, initialSource: string) =>
  initialSource;

export const createSourceUpdater = (
  directory: string,
  config: PluginConfig,
  logger: Logger
) => {
  const logErrorRoot = getLogError(logger);

  try {
    const { graphqlConfigPath, projectNameRegex } = config;

    const graphqlConfig = loadConfigSync({
      rootDir: directory,
      filepath: graphqlConfigPath,
      throwOnMissing: true,
      throwOnEmpty: true,
    });

    const graphqlProjectsMap = graphqlConfig.projects;

    const defaultProject = graphqlProjectsMap.default as
      | GraphQLProjectConfig
      | undefined;

    if (!defaultProject && !projectNameRegex) {
      throw new Error(
        'Multiple projects into GraphQL config. You must define projectNameRegex in config.'
      );
    }

    const graphqlProjects = Object.values(graphqlProjectsMap);

    logger.log(`GraphQL config loaded from ${graphqlConfig.filepath}`);

    graphqlProjects.forEach(({ name, schema }) =>
      logger.log(`GraphQL project "${name}" schema loaded from ${schema}`)
    );

    const schemaInfosPromiseMap = Object.entries(graphqlProjectsMap).reduce<
      Record<
        string,
        Promise<{
          schemaDocument: DocumentNode;
          staticGlobals: string;
        } | null>
      >
    >((map, [key, project]) => {
      map[key] = project
        .getSchema('DocumentNode')
        .then(async (schemaDocument) => ({
          schemaDocument,
          staticGlobals: await extractTypeFromSchema(schemaDocument),
        }))
        .catch(logErrorRoot);

      return map;
    }, {});

    return async (filename: string, initialSource: string) => {
      const logError = getLogError(logger, filename);

      try {
        const literalOccurenceList = parseLiteralOccurenceList(initialSource);

        if (literalOccurenceList.length === 0) {
          return initialSource;
        }

        const staticGlobalsSet = new Set<string>();

        const documentInfosPromiseList = literalOccurenceList.map(
          async (literal) => {
            try {
              const projectName = projectNameRegex
                ? (new RegExp(projectNameRegex).exec(literal) ?? [])[0]
                : 'default';

              const project = await schemaInfosPromiseMap[projectName];
              if (!project) {
                throw new Error(
                  `Project not defined for name "${projectName}"`
                );
              }

              staticGlobalsSet.add(project.staticGlobals);

              return await extractTypeFromLiteral(
                literal,
                project.schemaDocument
              );
            } catch (error) {
              logError(error);
              return null;
            }
          }
        );

        const documentInfosList = await Promise.all(
          documentInfosPromiseList
        ).then((list) => list.filter(isNonNullable));

        if (documentInfosList.length === 0) {
          return initialSource;
        }

        const bottomContent = generateBottomContent(
          documentInfosList,
          [...staticGlobalsSet].join('\n')
        );

        const finalSource = initialSource + bottomContent;

        return finalSource;
      } catch (mainError) {
        logError(mainError);
        return initialSource;
      }
    };
  } catch (rootError) {
    logErrorRoot(rootError);
    return noopSource;
  }
};
