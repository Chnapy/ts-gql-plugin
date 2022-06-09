import type TSL from 'typescript/lib/tsserverlibrary';
import { Config } from '../config';

export type Logger = ReturnType<typeof createLogger>;

export const createLogger = (
  logLevel: Config['logLevel'] = 'default',
  logger: Pick<TSL.server.Logger, 'info'>
) => {
  const log = (message: string) => logger.info(`[ts-gql-plugin] ${message}`);

  const verbose = logLevel === 'verbose';
  const debug = logLevel === 'debug';

  return {
    log,
    error: (message: string) => {
      log(`Error ${message}`);
    },
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
  };
};
