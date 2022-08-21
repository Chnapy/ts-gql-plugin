import { PluginInit } from 'tsc-ls';
import TSL from 'typescript/lib/tsserverlibrary';
import { createErrorCatcher } from './create-error-catcher';
import { createLanguageServiceWithDiagnostics } from './create-language-service-proxy';
import { PluginConfig } from './plugin-config';
import { createSourceUpdater } from './source-update/create-source-updater';
import { getSnapshotSource } from './utils/get-snapshot-source';
import { isValidFilename, isValidSourceFile } from './utils/is-valid-file';
import { isVSCodeEnv } from './utils/is-vscode-env';
import { createLogger } from './utils/logger';
import { objectOverride } from './utils/object-override';
import { waitPromiseSync } from './utils/wait-promise-sync';

const init: PluginInit = ({ typescript: ts }) => ({
  create: (info) => {
    const { project, languageService } = info;
    const config = info.config as PluginConfig;

    const vsCodeEnv = isVSCodeEnv();

    const logger = createLogger(config.logLevel, project.projectService.logger);

    const directory = project.getCurrentDirectory();

    logger.log('Plugin started');

    logger.log(`Running in ${vsCodeEnv ? 'VS Code' : 'CLI'} env`);

    logger.log(`Plugin config ${JSON.stringify(config)}`);

    const languageServiceWithDiagnostics =
      createLanguageServiceWithDiagnostics(languageService);

    const errorCatcher = createErrorCatcher(
      languageServiceWithDiagnostics.pluginsDiagnostics,
      logger
    );

    const resetFileDiagnostics = (fileName: string) => {
      languageServiceWithDiagnostics.pluginsDiagnostics.delete(fileName);
    };

    const overrideTS = objectOverride(ts);

    const updateSource = createSourceUpdater(
      directory,
      config,
      logger,
      errorCatcher,
      project.getCompilerOptions().target
    );

    overrideTS(
      'createLanguageServiceSourceFile',
      (initialFn) =>
        (fileName, scriptSnapshot, ...rest) => {
          if (isValidFilename(fileName)) {
            logger.verbose(() => `create - Filename ${fileName}`);
            const debugTime = logger.debugTime();

            resetFileDiagnostics(fileName);

            const initialSource = getSnapshotSource(scriptSnapshot);
            const updatedSource = waitPromiseSync(
              updateSource(fileName, initialSource)
            );

            if (initialSource !== updatedSource) {
              scriptSnapshot = TSL.ScriptSnapshot.fromString(updatedSource);

              debugTime(`create - Filename updated ${fileName}`);
              logger.debugToFile(() =>
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
            logger.verbose(() => `update - Filename ${sourceFile.fileName}`);
            const debugTime = logger.debugTime();

            resetFileDiagnostics(sourceFile.fileName);

            const initialSource = getSnapshotSource(scriptSnapshot);
            const updatedSource = waitPromiseSync(
              updateSource(sourceFile.fileName, initialSource)
            );

            if (initialSource !== updatedSource) {
              scriptSnapshot = TSL.ScriptSnapshot.fromString(updatedSource);

              debugTime(`update - Filename updated ${sourceFile.fileName}`);
              logger.debugToFile(() =>
                scriptSnapshot.getText(0, scriptSnapshot.getLength())
              );
            }
          }

          return initialFn(sourceFile, scriptSnapshot, ...rest);
        }
    );

    return languageServiceWithDiagnostics;
  },
});

export = init;
