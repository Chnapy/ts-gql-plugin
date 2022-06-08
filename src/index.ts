import type TS from 'typescript/lib/tsserverlibrary';
import { Config } from './config';
import { createScriptSnapshotUpdater } from './script-snapshot/create-script-snapshot-updater';
import { createLogger } from './utils/logger';
import { objectOverride } from './utils/object-override';
import { waitPromiseSync } from './utils/wait-promise-sync';

const tsFilenameRegex = /.+[^.d].tsx?$/;

const init = (modules: { typescript: typeof TS }) => {
  const ts = modules.typescript;

  const create = (info: ts.server.PluginCreateInfo) => {
    const { project, languageService } = info;
    const config = info.config as Config;

    const logger = createLogger(config, project.projectService.logger);

    const directory = project.getCurrentDirectory();

    logger.log('Plugin started');

    logger.log(`Plugin config ${JSON.stringify(config)}`);

    const overrideTS = objectOverride(ts);

    const updateScriptSnapshot = createScriptSnapshotUpdater(
      ts,
      directory,
      config,
      logger
    );

    overrideTS(
      'createLanguageServiceSourceFile',
      (initialFn) =>
        (fileName, scriptSnapshot, ...rest) => {
          if (tsFilenameRegex.test(fileName)) {
            logger.verbose(`create - Filename ${fileName}`);
            const previousSnapshot = scriptSnapshot;
            scriptSnapshot = waitPromiseSync(
              updateScriptSnapshot(fileName, scriptSnapshot)
            );
            if (previousSnapshot !== scriptSnapshot) {
              logger.verbose(`script updated - Filename ${fileName}`);
              // logger.verbose(
              //   scriptSnapshot.getText(0, scriptSnapshot.getLength())
              // );
            }
          }

          return initialFn(fileName, scriptSnapshot, ...rest);
        }
    );

    overrideTS(
      'updateLanguageServiceSourceFile',
      (initialFn) =>
        (sourceFile, scriptSnapshot, ...rest) => {
          if (tsFilenameRegex.test(sourceFile.fileName)) {
            logger.verbose(`update - Filename ${sourceFile.fileName}`);
            const previousSnapshot = scriptSnapshot;
            scriptSnapshot = waitPromiseSync(
              updateScriptSnapshot(sourceFile.fileName, scriptSnapshot)
            );
            if (previousSnapshot !== scriptSnapshot) {
              logger.verbose(
                `script updated - Filename ${sourceFile.fileName}`
              );
              // logger.verbose(
              //   scriptSnapshot.getText(0, scriptSnapshot.getLength())
              // );
            }
          }

          return initialFn(sourceFile, scriptSnapshot, ...rest);
        }
    );

    return languageService;
  };

  return { create };
};

export = init;
