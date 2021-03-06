import TSL from 'typescript/lib/tsserverlibrary';
import { PluginConfig } from './plugin-config';
import { createSourceUpdater } from './source-update/create-source-updater';
import { createLogger } from './utils/logger';
import { objectOverride } from './utils/object-override';
import { waitPromiseSync } from './utils/wait-promise-sync';
import { isValidFilename, isValidSourceFile } from './utils/is-valid-file';
import { getSnapshotSource } from './utils/get-snapshot-source';

const init = (modules: { typescript: typeof TSL }) => {
  const ts = modules.typescript;

  const create = (info: ts.server.PluginCreateInfo) => {
    const { project, languageService } = info;
    const config = info.config as PluginConfig;

    const logger = createLogger(config.logLevel, project.projectService.logger);

    const directory = project.getCurrentDirectory();

    logger.log('Plugin started');

    logger.log(`Plugin config ${JSON.stringify(config)}`);

    const overrideTS = objectOverride(ts);

    const updateSource = createSourceUpdater(directory, config, logger);

    overrideTS(
      'createLanguageServiceSourceFile',
      (initialFn) =>
        (fileName, scriptSnapshot, ...rest) => {
          if (isValidFilename(fileName)) {
            logger.verbose(`create - Filename ${fileName}`);

            const initialSource = getSnapshotSource(scriptSnapshot);
            const updatedSource = waitPromiseSync(
              updateSource(fileName, initialSource)
            );

            if (initialSource !== updatedSource) {
              scriptSnapshot = TSL.ScriptSnapshot.fromString(updatedSource);

              logger.verbose(`script updated - Filename ${fileName}`);
              logger.debug(
                scriptSnapshot.getText(0, scriptSnapshot.getLength())
              );
            }
          }

          return initialFn(fileName, scriptSnapshot, ...rest);
        }
    );

    overrideTS(
      'updateLanguageServiceSourceFile',
      (initialFn) =>
        (sourceFile, scriptSnapshot, ...rest) => {
          if (isValidSourceFile(sourceFile)) {
            logger.verbose(`update - Filename ${sourceFile.fileName}`);

            const initialSource = getSnapshotSource(scriptSnapshot);
            const updatedSource = waitPromiseSync(
              updateSource(sourceFile.fileName, initialSource)
            );

            if (initialSource !== updatedSource) {
              scriptSnapshot = TSL.ScriptSnapshot.fromString(updatedSource);

              logger.verbose(
                `script updated - Filename ${sourceFile.fileName}`
              );
              logger.debug(
                scriptSnapshot.getText(0, scriptSnapshot.getLength())
              );
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
