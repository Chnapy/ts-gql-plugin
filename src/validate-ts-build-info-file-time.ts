import fs from 'node:fs';
import path from 'node:path';
import { CachedGraphQLConfigLoader } from './cached/cached-graphql-config-loader';
import { Logger } from './utils/logger';

/**
 * In projects with composite or incremental mode, tsBuildInfo file ignores graphql-related files.
 * If one of these files change, tsBuildInfo should be removed so that compilation can be triggered again.
 *
 * Check if there is any graphql-related files (.graphqlrc or schemas)
 * which was more recently updated than tsBuildInfo file.
 * On any occurence found, remove tsBuildInfo file.
 */
export const validateTsBuildInfoFileTime = (
  cachedGraphQLConfigLoader: CachedGraphQLConfigLoader,
  tsBuildInfoPath: string,
  logger: Logger
) => {
  if (!fs.existsSync(tsBuildInfoPath)) {
    return;
  }

  logger.verbose(() => 'Project tsBuildInfo validation');

  const gqlConfig = cachedGraphQLConfigLoader.getItemOrCreate(null);

  const gqlConfigPath = gqlConfig.configFilePath;

  const schemasPaths = gqlConfig.graphqlProjects.map((project) =>
    path.join(project.dirpath, project.schema as string)
  );

  const gqlRelatedPaths = [...new Set([gqlConfigPath, ...schemasPaths])];

  const tsBuildInfoPathLastModifiedTime = fs.statSync(tsBuildInfoPath).mtimeMs;

  const newestPath = gqlRelatedPaths.find((gqlPath) => {
    const { mtimeMs } = fs.statSync(gqlPath);

    return mtimeMs > tsBuildInfoPathLastModifiedTime;
  });

  if (newestPath) {
    logger.verbose(
      () =>
        `Project GraphQL part is out of date because its tsBuildInfo output '${tsBuildInfoPath}' is older than GraphQL-related input '${newestPath}'. TsBuildInfo output will be removed`
    );

    fs.rmSync(tsBuildInfoPath);
  } else {
    logger.verbose(
      () =>
        `Project GraphQL part is up to date because GraphQL-related inputs are older than output '${tsBuildInfoPath}'`
    );
  }
};
