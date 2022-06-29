import fs from 'node:fs';
import {
  createLogger,
  createSourceUpdater,
  isValidFilename,
  waitPromiseSync,
} from 'ts-gql-plugin/tools';
import ts from 'typescript';
import { getPluginConfig } from './get-plugin-config';

export const createLanguageServiceHost = (
  { fileNames, options }: Pick<ts.ParsedCommandLine, 'fileNames' | 'options'>,
  basePath: string
): ts.LanguageServiceHost => {
  const pluginConfig = getPluginConfig(options);

  const updateSource = createSourceUpdater(
    basePath,
    pluginConfig,
    createLogger(pluginConfig.logLevel, {
      info: console.log,
    })
  );

  const browsedFileNames = new Set<string>();

  return {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }

      const source = fs.readFileSync(fileName).toString();

      if (browsedFileNames.has(fileName)) {
        return ts.ScriptSnapshot.fromString(source);
      }

      browsedFileNames.add(fileName);

      if (isValidFilename(fileName)) {
        return ts.ScriptSnapshot.fromString(
          waitPromiseSync(updateSource(fileName, source))
        );
      }

      return ts.ScriptSnapshot.fromString(source);
    },
    getCurrentDirectory: () => basePath,
    getCompilationSettings: () => options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
};
