import { PluginInit } from 'tsc-ls';
import TSL from 'typescript/lib/tsserverlibrary';
import { createErrorCatcher } from './create-error-catcher';
import { createLanguageServiceWithDiagnostics } from './language-service/create-language-service-proxy';
import { createGetQuickInfoAtPosition } from './language-service/get-quick-info-at-position';
import { createGetCompletionsAtPosition } from './language-service/get-completions-at-position';
import { PluginConfig } from './plugin-config';
import { createSourceUpdater } from './source-update/create-source-updater';
import { isValidFilename, isValidSourceFile } from './utils/is-valid-file';
import { isVSCodeEnv } from './utils/is-vscode-env';
import { createLogger } from './utils/logger';
import { objectOverride } from './utils/object-override';
import { waitPromiseSync } from './utils/wait-promise-sync';
import { createCachedGraphQLConfigLoader } from './cached/cached-graphql-config-loader';
import { createCachedLiteralParser } from './cached/cached-literal-parser';
import { createCachedDocumentSchemaLoader } from './cached/cached-document-schema-loader';
import { createCachedGraphQLSchemaLoader } from './cached/cached-graphql-schema-loader';
import { createGetDefinitionAndBoundSpan } from './language-service/get-definition-and-bound-span';
import { validateTsBuildInfoFileTime } from './validate-ts-build-info-file-time';

export const init: PluginInit = ({ typescript: ts }) => ({
  create: (info) => {
    const { project, languageService, languageServiceHost } = info;
    const config = info.config as PluginConfig;

    const projectPath = project.getCurrentDirectory();

    const compilationSettings = languageServiceHost.getCompilationSettings();

    const vsCodeEnv = isVSCodeEnv();

    const logger = createLogger(config.logLevel, project.projectService.logger);

    logger.log(
      `Plugin started:\n` +
        `\t- project: '${projectPath}'\n` +
        `\t- environment: ${vsCodeEnv ? 'VS Code' : 'CLI'}\n` +
        `\t- plugin config: \n${JSON.stringify(config, undefined, 2)}`
    );

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
    const overrideLanguageService = objectOverride(
      languageServiceWithDiagnostics
    );

    const { graphqlConfigPath, projectNameRegex } = config;

    const cachedGraphQLConfigLoader = createCachedGraphQLConfigLoader({
      directory: projectPath,
      graphqlConfigPath,
      projectNameRegex,
      logger,
    });

    const cachedDocumentSchemaLoader = createCachedDocumentSchemaLoader({
      cachedGraphQLConfigLoader,
      errorCatcher,
    });

    const cachedGraphQLSchemaLoader = createCachedGraphQLSchemaLoader({
      cachedGraphQLConfigLoader,
      errorCatcher,
    });

    const cachedLiteralParser = createCachedLiteralParser({
      cachedDocumentSchemaLoader,
      projectNameRegex,
      errorCatcher,
    });

    const updateSource = createSourceUpdater(
      cachedDocumentSchemaLoader,
      cachedLiteralParser,
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

    overrideLanguageService('getQuickInfoAtPosition', (initialFn) => {
      const getQuickInfoAtPosition = createGetQuickInfoAtPosition(
        initialFn,
        languageServiceWithDiagnostics,
        cachedGraphQLSchemaLoader,
        config
      );

      return (...args) => waitPromiseSync(getQuickInfoAtPosition(...args));
    });

    overrideLanguageService('getCompletionsAtPosition', (initialFn) => {
      const getCompletionsAtPosition = createGetCompletionsAtPosition(
        initialFn,
        languageServiceWithDiagnostics,
        cachedGraphQLSchemaLoader,
        config
      );

      return (...args) => waitPromiseSync(getCompletionsAtPosition(...args));
    });

    overrideLanguageService('getDefinitionAndBoundSpan', (initialFn) => {
      const getDefinitionAndBoundSpan = createGetDefinitionAndBoundSpan(
        initialFn,
        languageServiceWithDiagnostics,
        cachedDocumentSchemaLoader,
        cachedGraphQLSchemaLoader,
        config
      );

      return (...args) => waitPromiseSync(getDefinitionAndBoundSpan(...args));
    });

    const tsBuildInfoPath = compilationSettings.tsBuildInfoFile;
    if (!vsCodeEnv && tsBuildInfoPath) {
      validateTsBuildInfoFileTime(
        cachedGraphQLConfigLoader,
        projectPath,
        tsBuildInfoPath,
        logger
      );
    }

    return languageServiceWithDiagnostics;
  },
});
