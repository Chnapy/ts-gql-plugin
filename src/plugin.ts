import { PluginInit } from 'tsc-ls';
import TSL from 'typescript/lib/tsserverlibrary';
import { createErrorCatcher } from './create-error-catcher';
import { createLanguageServiceWithDiagnostics } from './create-language-service-proxy';
import { PluginConfig } from './plugin-config';
import { createSourceUpdater } from './source-update/create-source-updater';
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
      errorCatcher
    );

    overrideTS(
      'createLanguageServiceSourceFile',
      (initialFn) =>
        (
          fileName,
          scriptSnapshot,
          scriptTarget,
          version,
          setNodeParents,
          scriptKind
        ) => {
          const sourceFile = initialFn(
            fileName,
            scriptSnapshot,
            scriptTarget,
            version,
            setNodeParents,
            scriptKind
          );

          if (isValidFilename(fileName)) {
            logger.verbose(() => `create - Filename ${fileName}`);
            const debugTime = logger.debugTime();

            resetFileDiagnostics(fileName);

            const updatedSource = waitPromiseSync(updateSource(sourceFile));

            if (sourceFile.text !== updatedSource) {
              scriptSnapshot = TSL.ScriptSnapshot.fromString(updatedSource);

              const updatedSourceFile = initialFn(
                fileName,
                scriptSnapshot,
                scriptTarget,
                version,
                setNodeParents,
                scriptKind
              );

              debugTime(`create - Filename updated ${fileName}`);
              logger.debugToFile(() => updatedSourceFile.text);

              return updatedSourceFile;
            }
          }

          return sourceFile;
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

            const sourceText = scriptSnapshot.getText(
              0,
              scriptSnapshot.getLength()
            );

            const clonedSourceFile = ts.createSourceFile(
              sourceFile.fileName,
              sourceText,
              sourceFile.languageVersion
            );

            const updatedSource = waitPromiseSync(
              updateSource(clonedSourceFile)
            );

            if (sourceFile.text !== updatedSource) {
              const updatedScriptSnapshot =
                TSL.ScriptSnapshot.fromString(updatedSource);

              const updatedSourceFile = initialFn(
                sourceFile,
                updatedScriptSnapshot,
                ...rest
              );

              debugTime(`update - Filename updated ${sourceFile.fileName}`);
              logger.debugToFile(() => updatedSourceFile.text);

              return updatedSourceFile;
            }
          }

          return initialFn(sourceFile, scriptSnapshot, ...rest);
        }
    );

    return languageServiceWithDiagnostics;
  },
});

export = init;
