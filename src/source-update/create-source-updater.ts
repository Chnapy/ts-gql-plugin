import { PluginConfig } from '../plugin-config';
import { Logger } from '../utils/logger';
import { extractTypeFromLiteral } from './extract-type-from-literal';
import { generateBottomContent } from './generate-bottom-content';
import { loadGraphQLConfig } from './load-graphql-config';
import { parseLiteralOccurenceList } from './parse-literal-occurence-list';

const isNonNullable = <I>(item: I | null): item is I => !!item;

const noopSource = async (_filename: string, initialSource: string) =>
  initialSource;

export const createSourceUpdater = (
  directory: string,
  config: PluginConfig,
  logger: Logger
) => {
  try {
    const { getProjectFromLiteral } = loadGraphQLConfig(
      directory,
      logger,
      config
    );

    return async (filename: string, initialSource: string) => {
      logger.setFilename(filename);

      try {
        const literalOccurenceList = parseLiteralOccurenceList(initialSource);

        if (literalOccurenceList.length === 0) {
          return initialSource;
        }

        const staticGlobalsSet = new Set<string>();

        const documentInfosPromiseList = literalOccurenceList.map(
          async (literal) => {
            try {
              const project = await getProjectFromLiteral(literal);

              staticGlobalsSet.add(project.staticGlobals);

              return await extractTypeFromLiteral(
                literal,
                project.schemaDocument,
                project.extension.codegenConfig
              );
            } catch (error) {
              logger.error(error);
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
        logger.error(mainError);
        return initialSource;
      }
    };
  } catch (rootError) {
    logger.error(rootError);
    return noopSource;
  }
};
