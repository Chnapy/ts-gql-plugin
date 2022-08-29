import fs from 'node:fs';
import path from 'node:path';
import type TSL from 'typescript/lib/tsserverlibrary';
import { defaultPluginConfig, PluginConfig } from '../plugin-config';

export type Logger = ReturnType<typeof createLogger>;

export const createLogger = (
  logLevel: PluginConfig['logLevel'] = defaultPluginConfig.logLevel,
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
    verbose: (message: () => string) => {
      if (!verbose && !debug) {
        return;
      }

      log(message());
    },
    debug: (message: () => string) => {
      if (!debug) {
        return;
      }

      log(message());
    },
    debugTime: () => {
      if (!debug) {
        return () => void 0;
      }

      const startTime = Date.now();

      return (message: string) => {
        const duration = Date.now() - startTime; // ms
        log(`${message}: ${duration} ms`);
      };
    },
    debugToFile: (message: () => string) => {
      if (!debug) {
        return;
      }

      const time = new Date().toISOString();

      const dir = `ts-gql-plugin-logs/${time.slice(0, 10)}`;
      const logFileName = `${time}-${filename?.replaceAll('/', '\\')}.log`;

      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(process.cwd(), dir, logFileName);

      fs.writeFileSync(filePath, message());

      log(`Debug log written to ${filePath}`);
    },
    setFilename: (newFilename: string) => {
      filename = newFilename;
    },
  };
};
