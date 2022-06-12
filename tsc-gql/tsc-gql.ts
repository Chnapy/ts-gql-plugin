#!/usr/bin/env ts-node

import ts from 'typescript';
import { createLanguageServiceHost } from './language-service-host';
import { getTSConfig } from './get-ts-config';

const { tsConfig, basePath } = getTSConfig();

const servicesHost = createLanguageServiceHost(tsConfig, basePath);

const ls = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

process.nextTick(() => {
  const program = ls.getProgram();
  const files = program!.getSourceFiles();

  const diagnostics = files.flatMap((sf) =>
    ls.getSemanticDiagnostics(sf.fileName)
  );

  process.stdout.write(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => '\n',
    })
  );

  const hasError = diagnostics.some(
    ({ category }) => category === ts.DiagnosticCategory.Error
  );

  process.exit(hasError ? 1 : 0);
});
