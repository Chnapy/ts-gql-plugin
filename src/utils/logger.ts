import type TSL from 'typescript/lib/tsserverlibrary';
import { PluginConfig } from '../plugin-config';

export type Logger = ReturnType<typeof createLogger>;

export const createLogger = (
  logLevel: PluginConfig['logLevel'] = 'default',
  logger: Pick<TSL.server.Logger, 'info'>
) => {
  let filename: string | undefined = undefined;

  const log = (message: string) => logger.info(`[ts-gql-plugin] ${message}`);

  const error = (err: unknown) => {
    if (err instanceof Error) {
      log(`Error on file ${filename}:\n${err.stack ?? err.message}`);
    }
    return null;
  };

  const verbose = logLevel === 'verbose';
  const debug = logLevel === 'debug';

  return {
    log,
    error,
    verbose: (message: string) => {
      if (!verbose && !debug) {
        return;
      }

      log(message);
    },
    debug: (message: string) => {
      if (!debug) {
        return;
      }

      log(message);
    },
    setFilename: (newFilename: string) => {
      filename = newFilename;
    },
  };
};
