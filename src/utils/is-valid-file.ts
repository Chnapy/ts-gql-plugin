export const isValidFilename = (filename: string) => {
  const tsFilenameRegex = /^.+(?<!\.d)\.tsx?$/;

  return tsFilenameRegex.test(filename);
};

export const isValidSourceFile = (sourceFile: ts.SourceFile) =>
  !sourceFile.isDeclarationFile && isValidFilename(sourceFile.fileName);
