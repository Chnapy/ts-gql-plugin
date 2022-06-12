import path from 'node:path';
import ts from 'typescript';

export const getTSConfig = () => {
  const args = ts.sys.args.slice(1);

  const commandLine = ts.parseCommandLine(args, ts.sys.readFile);

  const tsconfigPath =
    commandLine.options.project ?? ts.findConfigFile('.', ts.sys.fileExists);
  if (!tsconfigPath) {
    throw new Error(`tsconfig not found`);
  }

  const basePath = path.dirname(tsconfigPath);

  const tsConfig = ts.parseJsonConfigFileContent(
    ts.readConfigFile(tsconfigPath, ts.sys.readFile).config,
    {
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      useCaseSensitiveFileNames: true,
      trace: console.log,
    },
    basePath,
    commandLine.options
  );

  return { tsConfig, basePath };
};
