import fs from 'node:fs';
import ts from 'typescript/lib/tsserverlibrary';

export const createLanguageServiceHost = (
  { fileNames, options }: Pick<ts.ParsedCommandLine, 'fileNames' | 'options'>,
  basePath: string
): ts.LanguageServiceHost => ({
  getScriptFileNames: () => fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: (fileName) => {
    if (!fs.existsSync(fileName)) {
      return undefined;
    }

    const source = fs.readFileSync(fileName).toString();

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
});
